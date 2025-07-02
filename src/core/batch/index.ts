/**
 * High-Performance Batch Processing System - Export Module
 * Dynamic batch sizing with circuit breaker patterns and fault tolerance
 */

export { BatchProcessingEngine } from './BatchProcessingEngine';
export * from './types';

// Default configuration for DeFi batch processing
export const DEFAULT_BATCH_CONFIG = {
  maxConcurrentJobs: 10,
  defaultBatchSize: 100,
  maxBatchSize: 1000,
  workerPoolSize: 8,
  queueMaxSize: 10000,
  memoryThreshold: 512, // 512MB
  dynamicBatchSizing: {
    enabled: true,
    minSize: 10,
    maxSize: 500,
    targetProcessingTime: 1000, // 1 second
    adjustmentFactor: 0.2
  },
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    monitoringPeriod: 30000, // 30 seconds
    enabled: true
  },
  retryPolicy: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['timeout', 'network', 'temporary']
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000, // 30 seconds
    alertThresholds: {
      queueSize: 5000,
      errorRate: 5, // 5%
      memoryUsage: 400, // 400MB
      processingTime: 5000 // 5 seconds
    }
  }
};