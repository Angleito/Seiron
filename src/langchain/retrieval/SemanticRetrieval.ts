/**
 * @fileoverview Semantic Retrieval System for LangChain Sei Agent Kit
 * Provides vector-based semantic search and similarity matching for conversations
 */

import { TaskEither } from 'fp-ts/TaskEither';
import { Either, left, right } from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

import type {
  MemoryEntry,
  ConversationMemoryEntry,
  UserProfileMemoryEntry,
  OperationMemoryEntry,
  Message,
  MemorySearch,
  MemoryConfig
} from '../memory/types.js';

/**
 * Vector embedding configuration
 */
export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  chunkSize: number;
  overlap: number;
  batchSize: number;
  cacheEmbeddings: boolean;
  indexingEnabled: boolean;
  updateInterval: number;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  similarityThreshold: number;
  maxResults: number;
  rerankingEnabled: boolean;
  filterEnabled: boolean;
  boostRecent: boolean;
  boostFrequent: boolean;
  semanticExpansion: boolean;
}

/**
 * Vector embedding
 */
export interface VectorEmbedding {
  id: string;
  vector: number[];
  text: string;
  metadata: EmbeddingMetadata;
  timestamp: Date;
}

/**
 * Embedding metadata
 */
export interface EmbeddingMetadata {
  type: 'message' | 'summary' | 'operation' | 'profile';
  userId: string;
  sessionId?: string;
  messageId?: string;
  operationId?: string;
  importance: number;
  frequency: number;
  recency: number;
  context: string[];
}

/**
 * Search result with similarity score
 */
export interface SearchResult<T = MemoryEntry> {
  item: T;
  score: number;
  explanation: string;
  highlights: string[];
  metadata: SearchResultMetadata;
}

/**
 * Search result metadata
 */
export interface SearchResultMetadata {
  distance: number;
  relevanceScore: number;
  recencyBoost: number;
  frequencyBoost: number;
  contextMatch: number;
  rerankedScore?: number;
}

/**
 * Vector index
 */
export interface VectorIndex {
  id: string;
  name: string;
  dimensions: number;
  size: number;
  vectors: Map<string, VectorEmbedding>;
  metadata: IndexMetadata;
}

/**
 * Index metadata
 */
export interface IndexMetadata {
  created: Date;
  lastUpdated: Date;
  version: string;
  config: EmbeddingConfig;
  statistics: IndexStatistics;
}

/**
 * Index statistics
 */
export interface IndexStatistics {
  totalVectors: number;
  avgSimilarity: number;
  indexSize: number;
  queryCount: number;
  avgQueryTime: number;
  hitRate: number;
}

/**
 * Query expansion result
 */
export interface QueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: string[];
  relatedConcepts: string[];
  confidence: number;
}

/**
 * Semantic Retrieval System
 * 
 * Provides advanced semantic search capabilities:
 * - Vector embeddings for semantic similarity
 * - Multiple retrieval strategies
 * - Query expansion and reformulation
 * - Result reranking and filtering
 * - Context-aware search
 * - Performance optimization
 */
export class SemanticRetrieval extends EventEmitter {
  private config: { embedding: EmbeddingConfig; search: SearchConfig };
  private indexes: Map<string, VectorIndex> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private embeddingModel?: any; // Would be initialized with actual embedding model
  private reranker?: any; // Would be initialized with actual reranking model
  private queryExpander?: any; // Would be initialized with query expansion model
  private updateTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(
    embeddingConfig: EmbeddingConfig,
    searchConfig: SearchConfig
  ) {
    super();
    this.config = {
      embedding: embeddingConfig,
      search: searchConfig
    };
    this.initializeModels();
  }

  /**
   * Initialize embedding and search models
   */
  private initializeModels(): void {
    // Initialize embedding model (placeholder)
    if (this.config.embedding.model) {
      this.initializeEmbeddingModel();
    }

    // Initialize reranking model if enabled
    if (this.config.search.rerankingEnabled) {
      this.initializeReranker();
    }

    // Initialize query expansion if enabled
    if (this.config.search.semanticExpansion) {
      this.initializeQueryExpander();
    }
  }

  /**
   * Initialize the semantic retrieval system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Semantic retrieval already initialized');
    }

    // Create default indexes
    await this.createIndex('conversations', 'Conversation messages and summaries');
    await this.createIndex('profiles', 'User profiles and preferences');
    await this.createIndex('operations', 'DeFi operations and results');

    // Start periodic index updates if enabled
    if (this.config.embedding.indexingEnabled) {
      this.startIndexUpdates();
    }

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the semantic retrieval system
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Semantic retrieval not initialized');
    }

    // Stop index updates
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Clear indexes and cache
    this.indexes.clear();
    this.embeddingCache.clear();

    this.initialized = false;
    this.emit('shutdown');
  }

  /**
   * Create a new vector index
   */
  public async createIndex(name: string, description: string): Promise<VectorIndex> {
    const index: VectorIndex = {
      id: `index_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      dimensions: this.config.embedding.dimensions,
      size: 0,
      vectors: new Map(),
      metadata: {
        created: new Date(),
        lastUpdated: new Date(),
        version: '1.0.0',
        config: this.config.embedding,
        statistics: {
          totalVectors: 0,
          avgSimilarity: 0,
          indexSize: 0,
          queryCount: 0,
          avgQueryTime: 0,
          hitRate: 0
        }
      }
    };

    this.indexes.set(name, index);
    this.emit('index:created', { name, description });

    return index;
  }

  /**
   * Add memory entry to vector index
   */
  public async addToIndex<T extends MemoryEntry>(
    indexName: string,
    entry: T
  ): TaskEither<Error, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const index = this.indexes.get(indexName);
          if (!index) {
            throw new Error(`Index not found: ${indexName}`);
          }

          // Extract text content for embedding
          const textContent = this.extractTextContent(entry);
          
          // Generate embedding
          const embedding = await this.generateEmbedding(textContent);
          
          // Create vector embedding
          const vectorEmbedding: VectorEmbedding = {
            id: entry.id,
            vector: embedding,
            text: textContent,
            metadata: this.createEmbeddingMetadata(entry),
            timestamp: new Date()
          };

          // Add to index
          index.vectors.set(entry.id, vectorEmbedding);
          index.size++;
          index.metadata.lastUpdated = new Date();
          index.metadata.statistics.totalVectors = index.vectors.size;
          index.metadata.statistics.indexSize = this.calculateIndexSize(index);

          this.emit('vector:added', { indexName, entryId: entry.id });
        },
        (error) => new Error(`Failed to add to index: ${error}`)
      )
    );
  }

  /**
   * Update vector in index
   */
  public async updateIndex<T extends MemoryEntry>(
    indexName: string,
    entry: T
  ): TaskEither<Error, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const index = this.indexes.get(indexName);
          if (!index) {
            throw new Error(`Index not found: ${indexName}`);
          }

          // Remove existing vector if present
          if (index.vectors.has(entry.id)) {
            index.vectors.delete(entry.id);
            index.size--;
          }

          // Add updated vector
          await this.addToIndex(indexName, entry)();
        },
        (error) => new Error(`Failed to update index: ${error}`)
      )
    );
  }

  /**
   * Remove vector from index
   */
  public async removeFromIndex(
    indexName: string,
    entryId: string
  ): TaskEither<Error, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const index = this.indexes.get(indexName);
          if (!index) {
            throw new Error(`Index not found: ${indexName}`);
          }

          if (index.vectors.has(entryId)) {
            index.vectors.delete(entryId);
            index.size--;
            index.metadata.lastUpdated = new Date();
            index.metadata.statistics.totalVectors = index.vectors.size;
            
            this.emit('vector:removed', { indexName, entryId });
          }
        },
        (error) => new Error(`Failed to remove from index: ${error}`)
      )
    );
  }

  /**
   * Perform semantic search across indexes
   */
  public async search<T extends MemoryEntry>(
    query: string,
    indexNames: string[] = [],
    userId?: string,
    options?: Partial<SearchConfig>
  ): TaskEither<Error, SearchResult<T>[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const startTime = Date.now();
          const searchConfig = { ...this.config.search, ...options };

          // Expand query if enabled
          let expandedQuery = query;
          if (searchConfig.semanticExpansion && this.queryExpander) {
            const expansion = await this.expandQuery(query);
            expandedQuery = [query, ...expansion.expandedTerms].join(' ');
          }

          // Generate query embedding
          const queryEmbedding = await this.generateEmbedding(expandedQuery);

          // Search across specified indexes
          const targetIndexes = indexNames.length > 0 
            ? indexNames.filter(name => this.indexes.has(name))
            : Array.from(this.indexes.keys());

          const allResults: SearchResult<T>[] = [];

          for (const indexName of targetIndexes) {
            const index = this.indexes.get(indexName)!;
            const results = await this.searchIndex<T>(
              index,
              queryEmbedding,
              query,
              userId,
              searchConfig
            );
            allResults.push(...results);
          }

          // Sort by relevance score
          allResults.sort((a, b) => b.score - a.score);

          // Apply global limit
          const limitedResults = allResults.slice(0, searchConfig.maxResults);

          // Rerank if enabled
          const finalResults = searchConfig.rerankingEnabled && this.reranker
            ? await this.rerankResults(query, limitedResults)
            : limitedResults;

          // Update search statistics
          this.updateSearchStats(targetIndexes, Date.now() - startTime, finalResults.length > 0);

          this.emit('search:completed', { 
            query, 
            indexNames: targetIndexes, 
            resultsCount: finalResults.length,
            executionTime: Date.now() - startTime
          });

          return finalResults;
        },
        (error) => new Error(`Semantic search failed: ${error}`)
      )
    );
  }

  /**
   * Find similar entries to a given entry
   */
  public async findSimilar<T extends MemoryEntry>(
    entry: T,
    indexName: string,
    limit: number = 10,
    threshold: number = 0.7
  ): TaskEither<Error, SearchResult<T>[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const index = this.indexes.get(indexName);
          if (!index) {
            throw new Error(`Index not found: ${indexName}`);
          }

          // Get embedding for the entry
          const targetVector = index.vectors.get(entry.id);
          if (!targetVector) {
            throw new Error(`Entry not found in index: ${entry.id}`);
          }

          const results: SearchResult<T>[] = [];

          // Calculate similarity with all other vectors
          for (const [id, vector] of index.vectors) {
            if (id === entry.id) continue; // Skip self

            const similarity = this.calculateCosineSimilarity(
              targetVector.vector,
              vector.vector
            );

            if (similarity >= threshold) {
              results.push({
                item: { id, type: vector.metadata.type } as T, // Simplified for type safety
                score: similarity,
                explanation: `Similar to your query with ${(similarity * 100).toFixed(1)}% confidence`,
                highlights: this.extractHighlights(vector.text, entry.id),
                metadata: {
                  distance: 1 - similarity,
                  relevanceScore: similarity,
                  recencyBoost: 0,
                  frequencyBoost: 0,
                  contextMatch: 0
                }
              });
            }
          }

          // Sort by similarity and limit
          results.sort((a, b) => b.score - a.score);
          return results.slice(0, limit);
        },
        (error) => new Error(`Failed to find similar entries: ${error}`)
      )
    );
  }

  /**
   * Get index statistics
   */
  public getIndexStats(indexName: string): Either<Error, IndexStatistics> {
    try {
      const index = this.indexes.get(indexName);
      if (!index) {
        return left(new Error(`Index not found: ${indexName}`));
      }

      return right(index.metadata.statistics);
    } catch (error) {
      return left(new Error(`Failed to get index stats: ${error}`));
    }
  }

  /**
   * Rebuild index with new configuration
   */
  public async rebuildIndex(
    indexName: string,
    entries: MemoryEntry[]
  ): TaskEither<Error, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const index = this.indexes.get(indexName);
          if (!index) {
            throw new Error(`Index not found: ${indexName}`);
          }

          // Clear existing vectors
          index.vectors.clear();
          index.size = 0;

          // Add all entries
          for (const entry of entries) {
            await this.addToIndex(indexName, entry)();
          }

          index.metadata.lastUpdated = new Date();
          this.emit('index:rebuilt', { indexName, entryCount: entries.length });
        },
        (error) => new Error(`Failed to rebuild index: ${error}`)
      )
    );
  }

  // Private helper methods

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.createCacheKey(text);
    if (this.config.embedding.cacheEmbeddings && this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate embedding using model
    let embedding: number[];
    if (this.embeddingModel) {
      embedding = await this.embeddingModel.embed(text);
    } else {
      // Fallback to simple hash-based embedding (for development)
      embedding = this.generateSimpleEmbedding(text);
    }

    // Cache if enabled
    if (this.config.embedding.cacheEmbeddings) {
      this.embeddingCache.set(cacheKey, embedding);
    }

    return embedding;
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple embedding based on text characteristics (placeholder)
    const embedding = new Array(this.config.embedding.dimensions).fill(0);
    
    // Use character codes and word patterns to create a basic embedding
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length && i < embedding.length; i++) {
      const word = words[i];
      embedding[i] = (word.charCodeAt(0) || 0) / 255.0;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private extractTextContent(entry: MemoryEntry): string {
    let content = '';

    switch (entry.type) {
      case 'conversation':
        const convEntry = entry as ConversationMemoryEntry;
        content = convEntry.messages.map(m => m.content).join(' ');
        if (convEntry.conversationSummary) {
          content += ' ' + convEntry.conversationSummary;
        }
        break;
      
      case 'user_profile':
        const profileEntry = entry as UserProfileMemoryEntry;
        content = JSON.stringify({
          risk: profileEntry.riskTolerance.level,
          protocols: profileEntry.preferredProtocols.map(p => p.name),
          strategies: profileEntry.tradingStrategies.map(s => s.name)
        });
        break;
      
      case 'operation':
        const opEntry = entry as OperationMemoryEntry;
        content = `${opEntry.operationType} ${opEntry.protocol} ${JSON.stringify(opEntry.parameters)}`;
        break;
      
      default:
        content = JSON.stringify(entry);
    }

    return content;
  }

  private createEmbeddingMetadata(entry: MemoryEntry): EmbeddingMetadata {
    return {
      type: this.getEmbeddingType(entry),
      userId: entry.userId,
      sessionId: entry.sessionId,
      messageId: entry.type === 'conversation' ? entry.id : undefined,
      operationId: entry.type === 'operation' ? (entry as OperationMemoryEntry).operationId : undefined,
      importance: this.calculateImportance(entry),
      frequency: entry.accessCount || 0,
      recency: this.calculateRecency(entry.timestamp),
      context: this.extractContextTags(entry)
    };
  }

  private getEmbeddingType(entry: MemoryEntry): 'message' | 'summary' | 'operation' | 'profile' {
    switch (entry.type) {
      case 'conversation': return 'message';
      case 'user_profile': return 'profile';
      case 'operation': return 'operation';
      default: return 'message';
    }
  }

  private calculateImportance(entry: MemoryEntry): number {
    let importance = 0.5; // Base importance

    // Boost by priority
    switch (entry.priority) {
      case 'critical': importance += 0.4; break;
      case 'high': importance += 0.3; break;
      case 'medium': importance += 0.1; break;
      default: break;
    }

    // Boost by access pattern
    switch (entry.pattern) {
      case 'frequent': importance += 0.2; break;
      case 'recent': importance += 0.1; break;
      default: break;
    }

    return Math.min(importance, 1.0);
  }

  private calculateRecency(timestamp: Date): number {
    const now = Date.now();
    const age = now - timestamp.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    return Math.max(0, 1 - age / maxAge);
  }

  private extractContextTags(entry: MemoryEntry): string[] {
    const tags: string[] = [];
    
    if (entry.type) tags.push(entry.type);
    if (entry.layer) tags.push(entry.layer);
    if (entry.priority) tags.push(entry.priority);
    
    return tags;
  }

  private async searchIndex<T extends MemoryEntry>(
    index: VectorIndex,
    queryEmbedding: number[],
    originalQuery: string,
    userId?: string,
    config: SearchConfig
  ): Promise<SearchResult<T>[]> {
    const results: SearchResult<T>[] = [];

    for (const [id, vector] of index.vectors) {
      // Filter by user if specified
      if (userId && vector.metadata.userId !== userId) {
        continue;
      }

      // Calculate similarity
      const similarity = this.calculateCosineSimilarity(queryEmbedding, vector.vector);
      
      if (similarity >= config.similarityThreshold) {
        let score = similarity;

        // Apply boosts
        if (config.boostRecent) {
          score += vector.metadata.recency * 0.1;
        }
        if (config.boostFrequent) {
          score += Math.min(vector.metadata.frequency / 100, 0.1);
        }

        // Calculate context match
        const contextMatch = this.calculateContextMatch(originalQuery, vector.text);

        results.push({
          item: { id, type: vector.metadata.type } as T,
          score,
          explanation: this.generateExplanation(similarity, vector.metadata),
          highlights: this.extractHighlights(vector.text, originalQuery),
          metadata: {
            distance: 1 - similarity,
            relevanceScore: similarity,
            recencyBoost: config.boostRecent ? vector.metadata.recency * 0.1 : 0,
            frequencyBoost: config.boostFrequent ? Math.min(vector.metadata.frequency / 100, 0.1) : 0,
            contextMatch
          }
        });
      }
    }

    return results;
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private calculateContextMatch(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    const querySet = new Set(queryWords);
    const textSet = new Set(textWords);

    let matches = 0;
    for (const word of querySet) {
      if (textSet.has(word)) {
        matches++;
      }
    }

    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  private generateExplanation(similarity: number, metadata: EmbeddingMetadata): string {
    const confidence = (similarity * 100).toFixed(1);
    const type = metadata.type;
    const recency = metadata.recency > 0.8 ? 'recent' : metadata.recency > 0.5 ? 'somewhat recent' : 'older';
    
    return `Found ${type} with ${confidence}% similarity (${recency})`;
  }

  private extractHighlights(text: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/);
    const highlights: string[] = [];

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      let hasMatch = false;
      
      for (const word of queryWords) {
        if (sentenceLower.includes(word)) {
          hasMatch = true;
          break;
        }
      }
      
      if (hasMatch && sentence.trim().length > 0) {
        highlights.push(sentence.trim());
      }
    }

    return highlights.slice(0, 3); // Return top 3 highlights
  }

  private async expandQuery(query: string): Promise<QueryExpansion> {
    if (this.queryExpander) {
      return await this.queryExpander.expand(query);
    }

    // Simple expansion fallback
    return {
      originalQuery: query,
      expandedTerms: [],
      synonyms: [],
      relatedConcepts: [],
      confidence: 0.5
    };
  }

  private async rerankResults<T extends MemoryEntry>(
    query: string,
    results: SearchResult<T>[]
  ): Promise<SearchResult<T>[]> {
    if (!this.reranker) {
      return results;
    }

    // Apply reranking logic
    for (const result of results) {
      const rerankedScore = await this.reranker.score(query, result.item);
      result.metadata.rerankedScore = rerankedScore;
      result.score = (result.score + rerankedScore) / 2;
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private createCacheKey(text: string): string {
    // Create a hash-based cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private calculateIndexSize(index: VectorIndex): number {
    return index.vectors.size * this.config.embedding.dimensions * 4; // 4 bytes per float
  }

  private updateSearchStats(indexNames: string[], executionTime: number, hasResults: boolean): void {
    for (const indexName of indexNames) {
      const index = this.indexes.get(indexName);
      if (index) {
        const stats = index.metadata.statistics;
        stats.queryCount++;
        stats.avgQueryTime = (stats.avgQueryTime * (stats.queryCount - 1) + executionTime) / stats.queryCount;
        if (hasResults) {
          stats.hitRate = (stats.hitRate * (stats.queryCount - 1) + 1) / stats.queryCount;
        } else {
          stats.hitRate = (stats.hitRate * (stats.queryCount - 1)) / stats.queryCount;
        }
      }
    }
  }

  private startIndexUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.optimizeIndexes();
    }, this.config.embedding.updateInterval);
  }

  private optimizeIndexes(): void {
    // Placeholder for index optimization logic
    // Could include vector compression, pruning, etc.
    this.emit('indexes:optimized');
  }

  private initializeEmbeddingModel(): void {
    // Placeholder for embedding model initialization
  }

  private initializeReranker(): void {
    // Placeholder for reranker initialization
  }

  private initializeQueryExpander(): void {
    // Placeholder for query expander initialization
  }
}

export default SemanticRetrieval;