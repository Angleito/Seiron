/**
 * @fileoverview Central Memory Manager for LangChain Sei Agent Kit
 * Coordinates all memory operations across different memory layers and types
 */

import { TaskEither } from 'fp-ts/TaskEither';
import { Either, left, right } from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

import type {
  IMemoryManager,
  MemoryEntry,
  MemoryQuery,
  MemorySearch,
  MemoryStats,
  MemoryConfig,
  MemoryOperationResult,
  MemoryLayer,
  MemoryPriority,
  AccessPattern,
  ConversationMemoryEntry,
  UserProfileMemoryEntry,
  OperationMemoryEntry,
  PortfolioContext
} from './types.js';

import { ConversationMemory } from './ConversationMemory.js';
import { UserProfileMemory } from './UserProfileMemory.js';
import { OperationMemory } from './OperationMemory.js';
import { MemoryEncryption } from '../security/MemoryEncryption.js';
import { MemoryPersistence } from '../storage/MemoryPersistence.js';
import { MemoryAnalytics } from '../analytics/MemoryAnalytics.js';
import { SmartCacheManager } from '../../core/cache/SmartCacheManager.js';

/**
 * Memory manager configuration
 */
export interface MemoryManagerConfig extends MemoryConfig {
  persistenceEnabled: boolean;
  analyticsEnabled: boolean;
  cacheEnabled: boolean;
  encryptionEnabled: boolean;
  retentionPolicies: RetentionPolicy[];
  cleanupStrategies: CleanupStrategy[];
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  layer: MemoryLayer;
  type: string;
  maxAge: number;
  maxSize: number;
  priority: MemoryPriority;
  conditions: RetentionCondition[];
}

/**
 * Retention conditions
 */
export interface RetentionCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

/**
 * Cleanup strategy configuration
 */
export interface CleanupStrategy {
  name: string;
  trigger: 'time' | 'size' | 'count' | 'memory';
  threshold: number;
  action: 'delete' | 'archive' | 'compress';
  priority: number;
}

/**
 * Memory layer manager
 */
interface LayerManager {
  layer: MemoryLayer;
  maxSize: number;
  currentSize: number;
  entries: Map<string, MemoryEntry>;
  accessQueue: string[];
  ttlMap: Map<string, number>;
}

/**
 * Central Memory Manager
 * 
 * Coordinates all memory operations across different memory types and layers:
 * - Conversation memory for session-based interactions
 * - User profile memory for persistent preferences
 * - Operation memory for DeFi transaction history
 * - Portfolio context for real-time state tracking
 */
export class MemoryManager extends EventEmitter implements IMemoryManager {
  private config: MemoryManagerConfig;
  private layers: Map<MemoryLayer, LayerManager> = new Map();
  private conversationMemory: ConversationMemory;
  private userProfileMemory: UserProfileMemory;
  private operationMemory: OperationMemory;
  private encryption?: MemoryEncryption;
  private persistence?: MemoryPersistence;
  private analytics?: MemoryAnalytics;
  private cache?: SmartCacheManager;
  private cleanupInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: MemoryManagerConfig) {
    super();
    this.config = config;
    this.initializeLayers();
    this.initializeMemoryTypes();
    this.initializeServices();
  }

  /**
   * Initialize memory layers
   */
  private initializeLayers(): void {
    const layerConfigs: Array<{ layer: MemoryLayer; maxSize: number }> = [
      { layer: 'short_term', maxSize: this.config.maxMemoryMB * 0.3 },
      { layer: 'long_term', maxSize: this.config.maxMemoryMB * 0.4 },
      { layer: 'contextual', maxSize: this.config.maxMemoryMB * 0.2 },
      { layer: 'semantic', maxSize: this.config.maxMemoryMB * 0.1 }
    ];

    layerConfigs.forEach(({ layer, maxSize }) => {
      this.layers.set(layer, {
        layer,
        maxSize,
        currentSize: 0,
        entries: new Map(),
        accessQueue: [],
        ttlMap: new Map()
      });
    });
  }

  /**
   * Initialize memory type managers
   */
  private initializeMemoryTypes(): void {
    this.conversationMemory = new ConversationMemory(this.config);
    this.userProfileMemory = new UserProfileMemory(this.config);
    this.operationMemory = new OperationMemory(this.config);
  }

  /**
   * Initialize supporting services
   */
  private initializeServices(): void {
    if (this.config.encryptionEnabled) {
      this.encryption = new MemoryEncryption(this.config.encryptionKey);
    }

    if (this.config.persistenceEnabled) {
      this.persistence = new MemoryPersistence(this.config);
    }

    if (this.config.analyticsEnabled) {
      this.analytics = new MemoryAnalytics(this.config);
    }

    if (this.config.cacheEnabled) {
      this.cache = new SmartCacheManager({
        maxSize: this.config.maxMemoryMB * 0.1,
        ttl: this.config.defaultTTL,
        algorithm: 'lru'
      });
    }
  }

  /**
   * Initialize the memory manager
   */
  public initialize(): TaskEither<Error, void> {
    if (this.initialized) {
      return TE.left(new Error('Memory manager already initialized'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          // Initialize all memory type managers
          await this.conversationMemory.initialize()();
          await this.userProfileMemory.initialize()();
          await this.operationMemory.initialize()();

          // Initialize services
          if (this.persistence) {
            await this.persistence.initialize()();
          }
          if (this.analytics) {
            await this.analytics.initialize()();
          }
          if (this.cache) {
            await this.cache.initialize();
          }

          // Start cleanup interval
          this.startCleanupInterval();

          // Load persisted data
          await this.loadPersistedData();

          this.initialized = true;
          this.emit('initialized');
        },
        (error) => new Error(`Failed to initialize memory manager: ${error}`)
      )
    );
  }

  /**
   * Shutdown the memory manager
   */
  public shutdown(): TaskEither<Error, void> {
    if (!this.initialized) {
      return TE.left(new Error('Memory manager not initialized'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          // Stop cleanup interval
          if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
          }

          // Persist data before shutdown
          await this.persistData();

          // Shutdown all memory type managers
          await this.conversationMemory.shutdown()();
          await this.userProfileMemory.shutdown()();
          await this.operationMemory.shutdown()();

          // Shutdown services
          if (this.persistence) {
            await this.persistence.shutdown()();
          }
          if (this.analytics) {
            await this.analytics.shutdown()();
          }
          if (this.cache) {
            await this.cache.shutdown();
          }

          // Clear all layers
          this.layers.forEach(layer => {
            layer.entries.clear();
            layer.accessQueue.length = 0;
            layer.ttlMap.clear();
          });

          this.initialized = false;
          this.emit('shutdown');
        },
        (error) => new Error(`Failed to shutdown memory manager: ${error}`)
      )
    );
  }

  /**
   * Store a memory entry
   */
  public store<T extends MemoryEntry>(entry: T): TaskEither<Error, MemoryOperationResult<T>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Validate entry
          this.validateEntry(entry);

          // Encrypt if enabled
          const processedEntry = await this.processEntryForStorage(entry);

          // Determine target layer
          const targetLayer = this.determineTargetLayer(processedEntry);

          // Store in appropriate memory type manager
          const result = await this.storeInMemoryType(processedEntry);

          // Store in layer
          await this.storeInLayer(targetLayer, processedEntry);

          // Update cache
          if (this.cache) {
            await this.cache.set(entry.id, processedEntry);
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('store', Date.now() - startTime, true);
          }

          this.emit('entry:stored', { entryId: entry.id, layer: targetLayer });

          return {
            success: true,
            data: processedEntry,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: this.calculateEntrySize(processedEntry),
              entriesAffected: 1
            }
          };
        },
        (error) => new Error(`Failed to store memory entry: ${error}`)
      )
    );
  }

  /**
   * Retrieve a memory entry
   */
  public retrieve<T extends MemoryEntry>(id: string): TaskEither<Error, MemoryOperationResult<T>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Check cache first
          if (this.cache) {
            const cached = await this.cache.get(id);
            if (cached) {
              this.updateAccessPattern(id, cached);
              return {
                success: true,
                data: cached as T,
                metrics: {
                  executionTime: Date.now() - startTime,
                  memoryUsed: 0,
                  entriesAffected: 1
                }
              };
            }
          }

          // Search in layers
          const entry = await this.findInLayers<T>(id);
          if (!entry) {
            throw new Error(`Memory entry not found: ${id}`);
          }

          // Decrypt if needed
          const processedEntry = await this.processEntryForRetrieval(entry);

          // Update access pattern
          this.updateAccessPattern(id, processedEntry);

          // Update cache
          if (this.cache) {
            await this.cache.set(id, processedEntry);
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackAccess(id, processedEntry.userId);
            this.analytics.trackOperation('retrieve', Date.now() - startTime, true);
          }

          this.emit('entry:retrieved', { entryId: id });

          return {
            success: true,
            data: processedEntry,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: 0,
              entriesAffected: 1
            }
          };
        },
        (error) => new Error(`Failed to retrieve memory entry: ${error}`)
      )
    );
  }

  /**
   * Update a memory entry
   */
  public update<T extends MemoryEntry>(id: string, updates: Partial<T>): TaskEither<Error, MemoryOperationResult<T>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Retrieve existing entry
          const existing = await this.findInLayers<T>(id);
          if (!existing) {
            throw new Error(`Memory entry not found: ${id}`);
          }

          // Apply updates
          const updated = {
            ...existing,
            ...updates,
            lastAccessed: new Date()
          } as T;

          // Validate updated entry
          this.validateEntry(updated);

          // Process for storage
          const processedEntry = await this.processEntryForStorage(updated);

          // Update in appropriate layer
          const layer = this.layers.get(existing.layer);
          if (layer) {
            layer.entries.set(id, processedEntry);
          }

          // Update in memory type manager
          await this.updateInMemoryType(processedEntry);

          // Update cache
          if (this.cache) {
            await this.cache.set(id, processedEntry);
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('update', Date.now() - startTime, true);
          }

          this.emit('entry:updated', { entryId: id });

          return {
            success: true,
            data: processedEntry,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: this.calculateEntrySize(processedEntry),
              entriesAffected: 1
            }
          };
        },
        (error) => new Error(`Failed to update memory entry: ${error}`)
      )
    );
  }

  /**
   * Delete a memory entry
   */
  public delete(id: string): TaskEither<Error, MemoryOperationResult<void>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Find entry in layers
          const entry = await this.findInLayers(id);
          if (!entry) {
            throw new Error(`Memory entry not found: ${id}`);
          }

          // Remove from layer
          const layer = this.layers.get(entry.layer);
          if (layer) {
            layer.entries.delete(id);
            layer.accessQueue = layer.accessQueue.filter(queueId => queueId !== id);
            layer.ttlMap.delete(id);
            layer.currentSize -= this.calculateEntrySize(entry);
          }

          // Remove from memory type manager
          await this.deleteFromMemoryType(entry);

          // Remove from cache
          if (this.cache) {
            await this.cache.delete(id);
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('delete', Date.now() - startTime, true);
          }

          this.emit('entry:deleted', { entryId: id });

          return {
            success: true,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: -this.calculateEntrySize(entry),
              entriesAffected: 1
            }
          };
        },
        (error) => new Error(`Failed to delete memory entry: ${error}`)
      )
    );
  }

  /**
   * Query memory entries
   */
  public query<T extends MemoryEntry>(query: MemoryQuery): TaskEither<Error, MemoryOperationResult<T[]>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          const results: T[] = [];
          const targetLayers = query.layer ? [query.layer] : Array.from(this.layers.keys());

          // Search in specified layers
          for (const layerType of targetLayers) {
            const layer = this.layers.get(layerType);
            if (!layer) continue;

            for (const [id, entry] of layer.entries) {
              if (this.matchesQuery(entry, query)) {
                const processedEntry = await this.processEntryForRetrieval(entry);
                results.push(processedEntry as T);
              }
            }
          }

          // Apply sorting and pagination
          const sortedResults = this.sortResults(results, query.sortBy, query.sortOrder);
          const paginatedResults = this.paginateResults(sortedResults, query.limit, query.offset);

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('query', Date.now() - startTime, true);
          }

          return {
            success: true,
            data: paginatedResults,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: 0,
              entriesAffected: paginatedResults.length
            }
          };
        },
        (error) => new Error(`Failed to query memory entries: ${error}`)
      )
    );
  }

  /**
   * Search memory entries using semantic search
   */
  public search<T extends MemoryEntry>(search: MemorySearch): TaskEither<Error, MemoryOperationResult<T[]>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Delegate to appropriate memory type manager based on search type
          let results: T[] = [];

          if (search.type === 'conversation' || !search.type) {
            const conversationResults = await this.conversationMemory.search(search);
            results = results.concat(conversationResults as T[]);
          }

          if (search.type === 'user_profile' || !search.type) {
            const profileResults = await this.userProfileMemory.search(search);
            results = results.concat(profileResults as T[]);
          }

          if (search.type === 'operation' || !search.type) {
            const operationResults = await this.operationMemory.search(search);
            results = results.concat(operationResults as T[]);
          }

          // Apply limit
          if (search.limit) {
            results = results.slice(0, search.limit);
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('search', Date.now() - startTime, true);
          }

          return {
            success: true,
            data: results,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: 0,
              entriesAffected: results.length
            }
          };
        },
        (error) => new Error(`Failed to search memory entries: ${error}`)
      )
    );
  }

  /**
   * Cleanup expired entries
   */
  public cleanup(): TaskEither<Error, MemoryOperationResult<void>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          let deletedCount = 0;

          // Cleanup each layer
          for (const [layerType, layer] of this.layers) {
            const now = Date.now();
            const toDelete: string[] = [];

            // Check TTL entries
            for (const [id, ttl] of layer.ttlMap) {
              if (now > ttl) {
                toDelete.push(id);
              }
            }

            // Apply retention policies
            const retentionDeletes = await this.applyRetentionPolicies(layerType, layer);
            toDelete.push(...retentionDeletes);

            // Delete entries
            for (const id of toDelete) {
              const entry = layer.entries.get(id);
              if (entry) {
                layer.entries.delete(id);
                layer.accessQueue = layer.accessQueue.filter(queueId => queueId !== id);
                layer.ttlMap.delete(id);
                layer.currentSize -= this.calculateEntrySize(entry);
                deletedCount++;
              }
            }
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('cleanup', Date.now() - startTime, true);
          }

          this.emit('cleanup:completed', { deletedCount });

          return {
            success: true,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: 0,
              entriesAffected: deletedCount
            }
          };
        },
        (error) => new Error(`Failed to cleanup memory: ${error}`)
      )
    );
  }

  /**
   * Optimize memory usage
   */
  public optimize(): TaskEither<Error, MemoryOperationResult<void>> {
    const startTime = Date.now();

    return pipe(
      TE.tryCatch(
        async () => {
          // Optimize each layer
          for (const [layerType, layer] of this.layers) {
            await this.optimizeLayer(layer);
          }

          // Optimize cache
          if (this.cache) {
            await this.cache.optimize();
          }

          // Track analytics
          if (this.analytics) {
            this.analytics.trackOperation('optimize', Date.now() - startTime, true);
          }

          this.emit('optimize:completed');

          return {
            success: true,
            metrics: {
              executionTime: Date.now() - startTime,
              memoryUsed: 0,
              entriesAffected: 0
            }
          };
        },
        (error) => new Error(`Failed to optimize memory: ${error}`)
      )
    );
  }

  /**
   * Get memory statistics
   */
  public getStats(): TaskEither<Error, MemoryOperationResult<MemoryStats>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const stats: MemoryStats = {
            totalEntries: 0,
            entriesByType: {},
            entriesByLayer: {},
            memoryUsage: 0,
            avgAccessTime: 0,
            hitRate: 0,
            oldestEntry: new Date(),
            newestEntry: new Date(0)
          };

          // Collect stats from all layers
          for (const [layerType, layer] of this.layers) {
            stats.totalEntries += layer.entries.size;
            stats.entriesByLayer[layerType] = layer.entries.size;
            stats.memoryUsage += layer.currentSize;

            // Analyze entries
            for (const [id, entry] of layer.entries) {
              const type = entry.type || 'unknown';
              stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;

              if (entry.timestamp < stats.oldestEntry) {
                stats.oldestEntry = entry.timestamp;
              }
              if (entry.timestamp > stats.newestEntry) {
                stats.newestEntry = entry.timestamp;
              }
            }
          }

          // Get cache stats
          if (this.cache) {
            const cacheStats = await this.cache.getStats();
            stats.hitRate = cacheStats.hitRate;
            stats.avgAccessTime = cacheStats.avgAccessTime;
          }

          return {
            success: true,
            data: stats
          };
        },
        (error) => new Error(`Failed to get memory stats: ${error}`)
      )
    );
  }

  /**
   * Get conversation memory for a session
   */
  public getConversationMemory(sessionId: string): TaskEither<Error, ConversationMemoryEntry | null> {
    return this.conversationMemory.getBySessionId(sessionId);
  }

  /**
   * Get user profile memory
   */
  public getUserProfileMemory(userId: string): TaskEither<Error, UserProfileMemoryEntry | null> {
    return this.userProfileMemory.getByUserId(userId);
  }

  /**
   * Get operation memory
   */
  public getOperationMemory(operationId: string): TaskEither<Error, OperationMemoryEntry | null> {
    return this.operationMemory.getByOperationId(operationId);
  }

  /**
   * Update portfolio context
   */
  public updatePortfolioContext(userId: string, context: PortfolioContext): TaskEither<Error, void> {
    return this.userProfileMemory.updatePortfolioContext(userId, context);
  }

  // Private helper methods

  private validateEntry(entry: MemoryEntry): void {
    if (!entry.id || !entry.userId) {
      throw new Error('Memory entry must have id and userId');
    }
    if (!entry.timestamp) {
      throw new Error('Memory entry must have timestamp');
    }
    if (!entry.layer) {
      throw new Error('Memory entry must specify layer');
    }
  }

  private determineTargetLayer(entry: MemoryEntry): MemoryLayer {
    // Use entry's specified layer or determine based on type and priority
    if (entry.layer) {
      return entry.layer;
    }

    // Default layer determination logic
    if (entry.priority === 'critical') {
      return 'long_term';
    } else if (entry.type === 'conversation') {
      return 'short_term';
    } else if (entry.type === 'user_profile') {
      return 'long_term';
    } else if (entry.type === 'operation') {
      return 'contextual';
    }

    return 'short_term';
  }

  private async processEntryForStorage<T extends MemoryEntry>(entry: T): Promise<T> {
    let processed = { ...entry };

    // Encrypt sensitive data if encryption is enabled
    if (this.encryption) {
      processed = await this.encryptSensitiveFields(processed);
    }

    // Update access metadata
    processed.lastAccessed = new Date();
    processed.accessCount = (processed.accessCount || 0) + 1;

    return processed;
  }

  private async processEntryForRetrieval<T extends MemoryEntry>(entry: T): Promise<T> {
    let processed = { ...entry };

    // Decrypt sensitive data if encryption is enabled
    if (this.encryption) {
      processed = await this.decryptSensitiveFields(processed);
    }

    return processed;
  }

  private async encryptSensitiveFields<T extends MemoryEntry>(entry: T): Promise<T> {
    // Implementation would encrypt sensitive fields based on entry type
    // For now, return as-is
    return entry;
  }

  private async decryptSensitiveFields<T extends MemoryEntry>(entry: T): Promise<T> {
    // Implementation would decrypt sensitive fields based on entry type
    // For now, return as-is
    return entry;
  }

  private async storeInMemoryType<T extends MemoryEntry>(entry: T): Promise<void> {
    switch (entry.type) {
      case 'conversation':
        await this.conversationMemory.store(entry as ConversationMemoryEntry);
        break;
      case 'user_profile':
        await this.userProfileMemory.store(entry as UserProfileMemoryEntry);
        break;
      case 'operation':
        await this.operationMemory.store(entry as OperationMemoryEntry);
        break;
      default:
        // Store in generic layer
        break;
    }
  }

  private async updateInMemoryType<T extends MemoryEntry>(entry: T): Promise<void> {
    switch (entry.type) {
      case 'conversation':
        await this.conversationMemory.update(entry.id, entry as ConversationMemoryEntry);
        break;
      case 'user_profile':
        await this.userProfileMemory.update(entry.id, entry as UserProfileMemoryEntry);
        break;
      case 'operation':
        await this.operationMemory.update(entry.id, entry as OperationMemoryEntry);
        break;
      default:
        // Update in generic layer
        break;
    }
  }

  private async deleteFromMemoryType<T extends MemoryEntry>(entry: T): Promise<void> {
    switch (entry.type) {
      case 'conversation':
        await this.conversationMemory.delete(entry.id);
        break;
      case 'user_profile':
        await this.userProfileMemory.delete(entry.id);
        break;
      case 'operation':
        await this.operationMemory.delete(entry.id);
        break;
      default:
        // Delete from generic layer
        break;
    }
  }

  private async storeInLayer<T extends MemoryEntry>(layerType: MemoryLayer, entry: T): Promise<void> {
    const layer = this.layers.get(layerType);
    if (!layer) {
      throw new Error(`Layer ${layerType} not found`);
    }

    const entrySize = this.calculateEntrySize(entry);

    // Check if layer has space
    if (layer.currentSize + entrySize > layer.maxSize) {
      await this.makeSpaceInLayer(layer, entrySize);
    }

    // Store entry
    layer.entries.set(entry.id, entry);
    layer.currentSize += entrySize;
    layer.accessQueue.push(entry.id);

    // Set TTL if specified
    if (entry.ttl) {
      layer.ttlMap.set(entry.id, Date.now() + entry.ttl);
    }
  }

  private async findInLayers<T extends MemoryEntry>(id: string): Promise<T | null> {
    for (const [layerType, layer] of this.layers) {
      const entry = layer.entries.get(id);
      if (entry) {
        return entry as T;
      }
    }
    return null;
  }

  private calculateEntrySize(entry: MemoryEntry): number {
    // Simple size calculation based on JSON stringification
    return JSON.stringify(entry).length;
  }

  private async makeSpaceInLayer(layer: LayerManager, requiredSpace: number): Promise<void> {
    let freedSpace = 0;
    const toDelete: string[] = [];

    // Use LRU eviction
    while (freedSpace < requiredSpace && layer.accessQueue.length > 0) {
      const oldestId = layer.accessQueue.shift();
      if (oldestId) {
        const entry = layer.entries.get(oldestId);
        if (entry) {
          freedSpace += this.calculateEntrySize(entry);
          toDelete.push(oldestId);
        }
      }
    }

    // Delete entries
    for (const id of toDelete) {
      layer.entries.delete(id);
      layer.ttlMap.delete(id);
    }

    layer.currentSize -= freedSpace;
  }

  private updateAccessPattern(id: string, entry: MemoryEntry): void {
    // Update access metadata
    entry.lastAccessed = new Date();
    entry.accessCount = (entry.accessCount || 0) + 1;

    // Update pattern based on access frequency
    if (entry.accessCount > 10) {
      entry.pattern = 'frequent';
    } else if (Date.now() - entry.lastAccessed.getTime() < 3600000) { // 1 hour
      entry.pattern = 'recent';
    } else if (entry.accessCount < 3) {
      entry.pattern = 'rare';
    }

    // Update access queue
    const layer = this.layers.get(entry.layer);
    if (layer) {
      layer.accessQueue = layer.accessQueue.filter(queueId => queueId !== id);
      layer.accessQueue.push(id);
    }
  }

  private matchesQuery(entry: MemoryEntry, query: MemoryQuery): boolean {
    // Basic query matching logic
    if (query.userId && entry.userId !== query.userId) {
      return false;
    }
    if (query.sessionId && entry.sessionId !== query.sessionId) {
      return false;
    }
    if (query.type && entry.type !== query.type) {
      return false;
    }
    if (query.timeRange) {
      if (entry.timestamp < query.timeRange.start || entry.timestamp > query.timeRange.end) {
        return false;
      }
    }
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if ((entry as any)[key] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  private sortResults<T extends MemoryEntry>(results: T[], sortBy?: string, sortOrder?: 'asc' | 'desc'): T[] {
    if (!sortBy) {
      return results;
    }

    return results.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];
      
      if (aValue < bValue) {
        return sortOrder === 'desc' ? 1 : -1;
      }
      if (aValue > bValue) {
        return sortOrder === 'desc' ? -1 : 1;
      }
      return 0;
    });
  }

  private paginateResults<T extends MemoryEntry>(results: T[], limit?: number, offset?: number): T[] {
    if (!limit) {
      return results;
    }

    const start = offset || 0;
    return results.slice(start, start + limit);
  }

  private async applyRetentionPolicies(layerType: MemoryLayer, layer: LayerManager): Promise<string[]> {
    const toDelete: string[] = [];
    const now = Date.now();

    const relevantPolicies = this.config.retentionPolicies.filter(policy => 
      policy.layer === layerType
    );

    for (const policy of relevantPolicies) {
      for (const [id, entry] of layer.entries) {
        // Check age policy
        if (policy.maxAge && now - entry.timestamp.getTime() > policy.maxAge) {
          toDelete.push(id);
          continue;
        }

        // Check conditions
        if (policy.conditions.length > 0) {
          const matchesConditions = policy.conditions.every(condition => {
            const value = (entry as any)[condition.field];
            switch (condition.operator) {
              case 'eq': return value === condition.value;
              case 'gt': return value > condition.value;
              case 'lt': return value < condition.value;
              case 'gte': return value >= condition.value;
              case 'lte': return value <= condition.value;
              case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
              case 'contains': return String(value).includes(String(condition.value));
              default: return false;
            }
          });

          if (matchesConditions) {
            toDelete.push(id);
          }
        }
      }
    }

    return toDelete;
  }

  private async optimizeLayer(layer: LayerManager): Promise<void> {
    // Optimize access queue
    const uniqueIds = Array.from(new Set(layer.accessQueue));
    layer.accessQueue = uniqueIds;

    // Remove orphaned TTL entries
    for (const [id, ttl] of layer.ttlMap) {
      if (!layer.entries.has(id)) {
        layer.ttlMap.delete(id);
      }
    }

    // Recalculate current size
    let actualSize = 0;
    for (const [id, entry] of layer.entries) {
      actualSize += this.calculateEntrySize(entry);
    }
    layer.currentSize = actualSize;
  }

  private startCleanupInterval(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(async () => {
        try {
          await this.cleanup()();
        } catch (error) {
          this.emit('error', error);
        }
      }, this.config.cleanupInterval);
    }
  }

  private async loadPersistedData(): Promise<void> {
    if (!this.persistence) {
      return;
    }

    try {
      // Load conversation memory
      await this.conversationMemory.loadFromPersistence();
      
      // Load user profile memory
      await this.userProfileMemory.loadFromPersistence();
      
      // Load operation memory
      await this.operationMemory.loadFromPersistence();
      
      this.emit('data:loaded');
    } catch (error) {
      this.emit('error', new Error(`Failed to load persisted data: ${error}`));
    }
  }

  private async persistData(): Promise<void> {
    if (!this.persistence) {
      return;
    }

    try {
      // Persist conversation memory
      await this.conversationMemory.saveToPersistence();
      
      // Persist user profile memory
      await this.userProfileMemory.saveToPersistence();
      
      // Persist operation memory
      await this.operationMemory.saveToPersistence();
      
      this.emit('data:persisted');
    } catch (error) {
      this.emit('error', new Error(`Failed to persist data: ${error}`));
    }
  }
}

export default MemoryManager;