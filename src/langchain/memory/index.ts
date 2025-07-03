/**
 * @fileoverview LangChain Memory System for Sei Agent Kit
 * Export all memory-related components and types
 */

// Core memory types
export * from './types.js';

// Memory managers
export { MemoryManager } from './MemoryManager.js';
export { ConversationMemory } from './ConversationMemory.js';
export { UserProfileMemory } from './UserProfileMemory.js';
export { OperationMemory } from './OperationMemory.js';

// Context managers
export { SessionManager } from '../context/SessionManager.js';

// Security and privacy
export { MemoryEncryption } from '../security/MemoryEncryption.js';

// Retrieval and learning
export { SemanticRetrieval } from '../retrieval/SemanticRetrieval.js';

// Default configurations
export const defaultMemoryConfig = {
  maxEntries: 10000,
  maxMemoryMB: 512,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  encryptionKey: '', // Should be provided by user
  backupEnabled: true,
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
  compressionEnabled: true,
  indexingEnabled: true
};

export const defaultConversationConfig = {
  ...defaultMemoryConfig,
  maxMessagesPerSession: 1000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  summarizationEnabled: true,
  summarizationThreshold: 100,
  entityExtractionEnabled: true,
  sentimentAnalysisEnabled: true,
  intentClassificationEnabled: true
};

export const defaultUserProfileConfig = {
  ...defaultMemoryConfig,
  behaviorAnalysisEnabled: true,
  riskAnalysisEnabled: true,
  performanceTrackingEnabled: true,
  recommendationEngineEnabled: true,
  anomalyDetectionEnabled: true,
  learningEnabled: true,
  portfolioSyncEnabled: true,
  alertsEnabled: true
};

export const defaultOperationConfig = {
  ...defaultMemoryConfig,
  maxOperationsPerUser: 5000,
  performanceAnalysisEnabled: true,
  failureAnalysisEnabled: true,
  gasOptimizationEnabled: true,
  patternRecognitionEnabled: true,
  predictionEnabled: true,
  realTimeAnalysisEnabled: true,
  alertThresholds: {
    gasSpikeFactor: 2.0,
    failureRateThreshold: 0.1,
    responseTimeThreshold: 30000,
    slippageThreshold: 0.05,
    profitLossThreshold: -0.1
  }
};

export const defaultSessionConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxConcurrentSessions: 5,
  contextPreservationEnabled: true,
  crossSessionLearningEnabled: true,
  automaticResumption: true,
  sessionMerging: true
};

export const defaultEmbeddingConfig = {
  model: 'text-embedding-ada-002',
  dimensions: 1536,
  chunkSize: 1000,
  overlap: 200,
  batchSize: 100,
  cacheEmbeddings: true,
  indexingEnabled: true,
  updateInterval: 5 * 60 * 1000 // 5 minutes
};

export const defaultSearchConfig = {
  similarityThreshold: 0.7,
  maxResults: 20,
  rerankingEnabled: true,
  filterEnabled: true,
  boostRecent: true,
  boostFrequent: true,
  semanticExpansion: true
};

export const defaultEncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
  iterations: 100000,
  keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
  compressionEnabled: true,
  backupEncryption: true
};

/**
 * Memory system factory function
 */
export function createMemorySystem(config?: {
  memory?: Partial<typeof defaultMemoryConfig>;
  conversation?: Partial<typeof defaultConversationConfig>;
  userProfile?: Partial<typeof defaultUserProfileConfig>;
  operation?: Partial<typeof defaultOperationConfig>;
  session?: Partial<typeof defaultSessionConfig>;
  embedding?: Partial<typeof defaultEmbeddingConfig>;
  search?: Partial<typeof defaultSearchConfig>;
  encryption?: Partial<typeof defaultEncryptionConfig>;
}) {
  const memoryConfig = { ...defaultMemoryConfig, ...config?.memory };
  const conversationConfig = { ...defaultConversationConfig, ...config?.conversation };
  const userProfileConfig = { ...defaultUserProfileConfig, ...config?.userProfile };
  const operationConfig = { ...defaultOperationConfig, ...config?.operation };
  const sessionConfig = { ...defaultSessionConfig, ...config?.session };
  const embeddingConfig = { ...defaultEmbeddingConfig, ...config?.embedding };
  const searchConfig = { ...defaultSearchConfig, ...config?.search };
  const encryptionConfig = { ...defaultEncryptionConfig, ...config?.encryption };

  // Create memory manager
  const memoryManager = new MemoryManager({
    ...memoryConfig,
    persistenceEnabled: true,
    analyticsEnabled: true,
    cacheEnabled: true,
    encryptionEnabled: !!encryptionConfig.keyLength,
    retentionPolicies: [
      {
        layer: 'short_term',
        type: 'conversation',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxSize: 1000,
        priority: 'medium',
        conditions: []
      },
      {
        layer: 'long_term',
        type: 'user_profile',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        maxSize: 10000,
        priority: 'high',
        conditions: []
      },
      {
        layer: 'contextual',
        type: 'operation',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxSize: 5000,
        priority: 'high',
        conditions: []
      }
    ],
    cleanupStrategies: [
      {
        name: 'time_based',
        trigger: 'time',
        threshold: 24 * 60 * 60 * 1000, // 24 hours
        action: 'delete',
        priority: 1
      },
      {
        name: 'size_based',
        trigger: 'size',
        threshold: memoryConfig.maxMemoryMB * 0.9, // 90% of max memory
        action: 'compress',
        priority: 2
      }
    ]
  });

  // Create session manager
  const sessionManager = new SessionManager(sessionConfig, memoryManager);

  // Create semantic retrieval
  const semanticRetrieval = new SemanticRetrieval(embeddingConfig, searchConfig);

  // Create encryption if enabled
  let encryption: MemoryEncryption | undefined;
  if (encryptionConfig.keyLength && memoryConfig.encryptionKey) {
    encryption = new MemoryEncryption(memoryConfig.encryptionKey, encryptionConfig);
  }

  return {
    memoryManager,
    sessionManager,
    semanticRetrieval,
    encryption,
    config: {
      memory: memoryConfig,
      conversation: conversationConfig,
      userProfile: userProfileConfig,
      operation: operationConfig,
      session: sessionConfig,
      embedding: embeddingConfig,
      search: searchConfig,
      encryption: encryptionConfig
    },
    // Convenience methods
    async initialize() {
      await memoryManager.initialize()();
      await sessionManager.initialize();
      await semanticRetrieval.initialize();
    },
    async shutdown() {
      await memoryManager.shutdown()();
      await sessionManager.shutdown();
      await semanticRetrieval.shutdown();
      if (encryption) {
        encryption.shutdown();
      }
    }
  };
}

export type MemorySystem = ReturnType<typeof createMemorySystem>;