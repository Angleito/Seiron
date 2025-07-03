/**
 * @fileoverview Main NLP Module Types
 * Consolidated type definitions for the NLP system
 */

// Re-export core types
export * from './nlp/types.js';
export * from './processing/types.js';
export * from './conversation/types.js';
export * from './domain/types.js';

// Re-export main engine types
export type { NLPEngineConfig, ProcessingResult } from './NLPEngine.js';

/**
 * NLP Processing Pipeline Interface
 */
export interface NLPProcessingPipeline {
  readonly name: string;
  readonly version: string;
  readonly stages: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly enabled: boolean;
    readonly config: any;
  }>;
  readonly metrics: {
    readonly totalProcessed: number;
    readonly averageProcessingTime: number;
    readonly successRate: number;
    readonly errorRate: number;
  };
}

/**
 * NLP System Health Status
 */
export interface NLPSystemHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly components: ReadonlyArray<{
    readonly name: string;
    readonly status: 'online' | 'offline' | 'degraded';
    readonly lastCheck: number;
    readonly message?: string;
  }>;
  readonly metrics: {
    readonly uptime: number;
    readonly memoryUsage: number;
    readonly processedRequests: number;
    readonly averageResponseTime: number;
  };
}

/**
 * NLP Configuration Validation Result
 */
export interface NLPConfigValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
    readonly severity: 'error' | 'warning';
  }>;
  readonly warnings: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
    readonly suggestion?: string;
  }>;
}

/**
 * NLP Performance Metrics
 */
export interface NLPPerformanceMetrics {
  readonly intentClassification: {
    readonly accuracy: number;
    readonly precision: number;
    readonly recall: number;
    readonly f1Score: number;
  };
  readonly entityExtraction: {
    readonly accuracy: number;
    readonly completeness: number;
    readonly averageConfidence: number;
  };
  readonly commandParsing: {
    readonly successRate: number;
    readonly averageParsingTime: number;
    readonly validationSuccessRate: number;
  };
  readonly conversationFlow: {
    readonly completionRate: number;
    readonly averageFlowDuration: number;
    readonly userSatisfactionScore: number;
  };
}

/**
 * NLP Error Categories
 */
export enum NLPErrorCategory {
  INTENT_CLASSIFICATION = 'intent_classification',
  ENTITY_EXTRACTION = 'entity_extraction',
  COMMAND_PARSING = 'command_parsing',
  VALIDATION = 'validation',
  CONVERSATION_FLOW = 'conversation_flow',
  RISK_ASSESSMENT = 'risk_assessment',
  SYSTEM = 'system'
}

/**
 * NLP Error Details
 */
export interface NLPErrorDetails {
  readonly category: NLPErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly context: any;
  readonly timestamp: number;
  readonly recoverable: boolean;
  readonly suggestions?: ReadonlyArray<string>;
}

/**
 * NLP Session Analytics
 */
export interface NLPSessionAnalytics {
  readonly sessionId: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly totalTurns: number;
  readonly successfulCommands: number;
  readonly failedCommands: number;
  readonly userSatisfaction?: number;
  readonly flowsCompleted: number;
  readonly averageResponseTime: number;
  readonly mostUsedIntents: ReadonlyArray<string>;
  readonly errorFrequency: Record<string, number>;
}

/**
 * NLP Learning Data
 */
export interface NLPLearningData {
  readonly input: string;
  readonly expectedIntent: string;
  readonly actualIntent: string;
  readonly confidence: number;
  readonly feedback: 'positive' | 'negative' | 'neutral';
  readonly timestamp: number;
  readonly context: any;
}

/**
 * NLP A/B Testing Configuration
 */
export interface NLPABTestConfig {
  readonly testName: string;
  readonly variants: ReadonlyArray<{
    readonly name: string;
    readonly weight: number;
    readonly config: any;
  }>;
  readonly metrics: ReadonlyArray<string>;
  readonly duration: number;
  readonly minimumSampleSize: number;
}

/**
 * NLP Batch Processing Result
 */
export interface NLPBatchProcessingResult {
  readonly totalProcessed: number;
  readonly successful: number;
  readonly failed: number;
  readonly results: ReadonlyArray<{
    readonly input: string;
    readonly result: any;
    readonly error?: string;
    readonly processingTime: number;
  }>;
  readonly averageProcessingTime: number;
  readonly errorSummary: Record<string, number>;
}

/**
 * NLP Cache Configuration
 */
export interface NLPCacheConfig {
  readonly enabled: boolean;
  readonly maxSize: number;
  readonly ttl: number;
  readonly strategy: 'lru' | 'fifo' | 'lfu';
  readonly compressionEnabled: boolean;
}

/**
 * NLP Monitoring Configuration
 */
export interface NLPMonitoringConfig {
  readonly enabled: boolean;
  readonly metricsInterval: number;
  readonly alertThresholds: {
    readonly errorRate: number;
    readonly responseTime: number;
    readonly memoryUsage: number;
  };
  readonly webhookUrl?: string;
}

/**
 * NLP Feature Flags
 */
export interface NLPFeatureFlags {
  readonly enableAdvancedIntentClassification: boolean;
  readonly enableMultiLanguageSupport: boolean;
  readonly enableLearningMode: boolean;
  readonly enableRealTimeAnalytics: boolean;
  readonly enableExperimentalFeatures: boolean;
  readonly enableVoiceSupport: boolean;
  readonly enableContextualMemory: boolean;
  readonly enablePersonalization: boolean;
}