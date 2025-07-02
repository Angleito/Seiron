/**
 * High-Performance Batch Processing System Types
 * Dynamic batch sizing with circuit breaker patterns and fault tolerance
 */

export interface BatchJob<T, R> {
  id: string;
  items: T[];
  processor: BatchProcessor<T, R>;
  options: BatchOptions;
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: BatchJobStatus;
  results?: BatchResult<R>[];
  error?: string;
  retryCount: number;
  estimatedDuration?: number;
}

export interface BatchProcessor<T, R> {
  name: string;
  process: (items: T[]) => Promise<R[]>;
  validate?: (item: T) => boolean;
  maxBatchSize: number;
  timeout: number;
  retryable: boolean;
}

export interface BatchOptions {
  batchSize?: number;
  maxConcurrency?: number;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  progressCallback?: (progress: BatchProgress) => void;
  priority?: number;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  enabled: boolean;
}

export enum BatchJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRYING = 'RETRYING'
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface BatchResult<R> {
  success: boolean;
  data?: R;
  error?: string;
  processingTime: number;
  retryCount: number;
}

export interface BatchProgress {
  jobId: string;
  totalItems: number;
  processedItems: number;
  completedBatches: number;
  totalBatches: number;
  percentage: number;
  estimatedTimeRemaining: number;
  currentBatchSize: number;
  averageProcessingTime: number;
  errors: number;
}

export interface BatchMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughput: number; // items per second
  queueSize: number;
  activeWorkers: number;
  memoryUsage: number;
  errorRate: number;
  averageBatchSize: number;
  circuitBreakerStats: {
    [processorName: string]: {
      state: CircuitBreakerState;
      failures: number;
      successes: number;
      lastFailureTime?: number;
    };
  };
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalMemoryUsage: number;
  averageWaitTime: number;
  priorityDistribution: Record<number, number>;
}

export interface WorkerPool {
  activeWorkers: number;
  maxWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
}

export interface BatchSystemConfig {
  maxConcurrentJobs: number;
  defaultBatchSize: number;
  maxBatchSize: number;
  workerPoolSize: number;
  queueMaxSize: number;
  memoryThreshold: number; // MB
  dynamicBatchSizing: {
    enabled: boolean;
    minSize: number;
    maxSize: number;
    targetProcessingTime: number; // ms
    adjustmentFactor: number;
  };
  circuitBreaker: CircuitBreakerConfig;
  retryPolicy: RetryPolicy;
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      queueSize: number;
      errorRate: number;
      memoryUsage: number;
      processingTime: number;
    };
  };
}

export interface BatchOperation<T, R> {
  type: 'process' | 'retry' | 'cancel' | 'priority_change';
  jobId: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MemoryManager {
  currentUsage: number;
  maxUsage: number;
  threshold: number;
  gcTriggerThreshold: number;
  isUnderPressure: boolean;
}