/**
 * High-Performance Batch Processing System
 * Dynamic batch sizing, circuit breaker patterns, and intelligent queue management
 * 
 * Performance targets:
 * - Batch processing throughput >1000 operations/second
 * - Queue processing latency <10ms
 * - Memory usage optimization with GC pressure monitoring
 */

import { EventEmitter } from 'events';
import { 
  BatchJob, 
  BatchProcessor, 
  BatchOptions, 
  BatchJobStatus, 
  BatchResult, 
  BatchProgress, 
  BatchMetrics, 
  BatchSystemConfig, 
  RetryPolicy, 
  CircuitBreakerConfig, 
  CircuitBreakerState, 
  QueueStats, 
  WorkerPool, 
  BatchOperation, 
  MemoryManager 
} from './types';

export class BatchProcessingEngine extends EventEmitter {
  private jobQueue: Map<string, BatchJob<any, any>> = new Map();
  private processingJobs: Map<string, BatchJob<any, any>> = new Map();
  private completedJobs: Map<string, BatchJob<any, any>> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private circuitBreakerStats: Map<string, any> = new Map();
  private workerPool: WorkerPool;
  private config: BatchSystemConfig;
  private metrics: BatchMetrics;
  private memoryManager: MemoryManager;
  private operationLog: BatchOperation<any, any>[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private batchSizeHistory: Map<string, number[]> = new Map();
  private startTime = Date.now();

  constructor(config: BatchSystemConfig) {
    super();
    this.config = config;
    this.initializeWorkerPool();
    this.initializeMetrics();
    this.initializeMemoryManager();
    this.startMetricsCollection();
    this.startProcessingLoop();
  }

  private initializeWorkerPool(): void {
    this.workerPool = {
      activeWorkers: 0,
      maxWorkers: this.config.workerPoolSize,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      throughput: 0,
      queueSize: 0,
      activeWorkers: 0,
      memoryUsage: 0,
      errorRate: 0,
      averageBatchSize: 0,
      circuitBreakerStats: {}
    };
  }

  private initializeMemoryManager(): void {
    this.memoryManager = {
      currentUsage: 0,
      maxUsage: this.config.memoryThreshold,
      threshold: this.config.memoryThreshold * 0.8,
      gcTriggerThreshold: this.config.memoryThreshold * 0.9,
      isUnderPressure: false
    };
  }

  /**
   * Submit a batch job with intelligent queuing and priority handling
   */
  public async submitJob<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    options: BatchOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const priority = options.priority || 5;
    const batchSize = this.calculateOptimalBatchSize(processor.name, items.length, options.batchSize);

    const job: BatchJob<T, R> = {
      id: jobId,
      items,
      processor,
      options: { ...options, batchSize },
      priority,
      createdAt: Date.now(),
      status: BatchJobStatus.PENDING,
      retryCount: 0
    };

    // Check memory pressure before queuing
    if (this.memoryManager.isUnderPressure) {
      await this.handleMemoryPressure();
    }

    // Check queue capacity
    if (this.jobQueue.size > this.config.queueMaxSize) {
      throw new Error(`Queue capacity exceeded. Current size: ${this.jobQueue.size}`);
    }

    this.jobQueue.set(jobId, job);
    this.metrics.totalJobs++;
    this.metrics.queueSize = this.jobQueue.size;

    this.emit('job-queued', { jobId, itemCount: items.length, priority });
    this.logOperation({
      type: 'process',
      jobId,
      timestamp: Date.now(),
      success: true,
      metadata: { itemCount: items.length, processorName: processor.name }
    });

    return jobId;
  }

  /**
   * High-performance batch processing with dynamic sizing and circuit breaker
   */
  private async processJob<T, R>(job: BatchJob<T, R>): Promise<void> {
    const startTime = performance.now();
    job.status = BatchJobStatus.PROCESSING;
    job.startedAt = Date.now();
    this.processingJobs.set(job.id, job);

    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(job.processor.name)) {
        throw new Error(`Circuit breaker is open for processor: ${job.processor.name}`);
      }

      const batchSize = job.options.batchSize || this.config.defaultBatchSize;
      const batches = this.createBatches(job.items, batchSize);
      const results: BatchResult<R>[] = [];
      let processedItems = 0;

      // Process batches with controlled concurrency
      const maxConcurrency = Math.min(
        job.options.maxConcurrency || this.config.maxConcurrentJobs,
        this.workerPool.maxWorkers - this.workerPool.activeWorkers
      );

      for (let i = 0; i < batches.length; i += maxConcurrency) {
        const batchGroup = batches.slice(i, i + maxConcurrency);
        const batchPromises = batchGroup.map(async (batch, batchIndex) => {
          return this.processBatch(batch, job.processor, batchIndex + i);
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.status === 'fulfilled') {
            results.push(...result.value);
            this.recordCircuitBreakerSuccess(job.processor.name);
          } else {
            const errorResult: BatchResult<R> = {
              success: false,
              error: result.reason?.message || 'Unknown error',
              processingTime: 0,
              retryCount: job.retryCount
            };
            results.push(errorResult);
            this.recordCircuitBreakerFailure(job.processor.name);
          }
        }

        processedItems += batchGroup.reduce((sum, batch) => sum + batch.length, 0);
        
        // Update progress
        if (job.options.progressCallback) {
          const progress = this.calculateProgress(job, processedItems, results);
          job.options.progressCallback(progress);
        }

        // Dynamic batch size adjustment
        if (this.config.dynamicBatchSizing.enabled) {
          this.adjustBatchSize(job.processor.name, performance.now() - startTime);
        }

        // Memory management
        if (this.shouldTriggerGC()) {
          await this.performGarbageCollection();
        }
      }

      job.results = results;
      job.status = BatchJobStatus.COMPLETED;
      job.completedAt = Date.now();
      
      this.metrics.completedJobs++;
      this.completedJobs.set(job.id, job);
      
      this.emit('job-completed', { 
        jobId: job.id, 
        duration: job.completedAt - job.startedAt!,
        itemCount: job.items.length,
        successCount: results.filter(r => r.success).length
      });

    } catch (error) {
      await this.handleJobError(job, error);
    } finally {
      this.processingJobs.delete(job.id);
      this.workerPool.activeWorkers--;
      
      const duration = performance.now() - startTime;
      this.updateProcessingMetrics(duration);
      
      this.logOperation({
        type: 'process',
        jobId: job.id,
        timestamp: Date.now(),
        duration,
        success: job.status === BatchJobStatus.COMPLETED,
        error: job.error
      });
    }
  }

  /**
   * Process individual batch with timeout and retry logic
   */
  private async processBatch<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    batchIndex: number
  ): Promise<BatchResult<R>[]> {
    const startTime = performance.now();
    this.workerPool.activeWorkers++;

    try {
      // Validate items if validator is provided
      const validItems = processor.validate 
        ? items.filter(item => processor.validate!(item))
        : items;

      if (validItems.length !== items.length) {
        this.emit('validation-failures', {
          processorName: processor.name,
          batchIndex,
          invalidCount: items.length - validItems.length
        });
      }

      // Process with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Batch processing timeout')), processor.timeout);
      });

      const processingPromise = processor.process(validItems);
      const results = await Promise.race([processingPromise, timeoutPromise]);

      // Convert results to BatchResult format
      return results.map((result, index) => ({
        success: true,
        data: result,
        processingTime: performance.now() - startTime,
        retryCount: 0
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return items.map(() => ({
        success: false,
        error: errorMessage,
        processingTime: performance.now() - startTime,
        retryCount: 0
      }));
    }
  }

  /**
   * Intelligent retry mechanism with exponential backoff
   */
  private async handleJobError<T, R>(job: BatchJob<T, R>, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    job.error = errorMessage;

    if (this.shouldRetryJob(job, error)) {
      job.retryCount++;
      job.status = BatchJobStatus.RETRYING;
      
      const delay = this.calculateRetryDelay(job.retryCount, job.options.retryPolicy);
      
      this.emit('job-retrying', { 
        jobId: job.id, 
        retryCount: job.retryCount, 
        delay, 
        error: errorMessage 
      });

      setTimeout(() => {
        job.status = BatchJobStatus.QUEUED;
        this.jobQueue.set(job.id, job);
      }, delay);

    } else {
      job.status = BatchJobStatus.FAILED;
      this.metrics.failedJobs++;
      
      this.emit('job-failed', { 
        jobId: job.id, 
        error: errorMessage, 
        retryCount: job.retryCount 
      });
    }
  }

  /**
   * Dynamic batch size calculation based on performance history
   */
  private calculateOptimalBatchSize(
    processorName: string, 
    totalItems: number, 
    suggestedSize?: number
  ): number {
    if (!this.config.dynamicBatchSizing.enabled || suggestedSize) {
      return Math.min(
        suggestedSize || this.config.defaultBatchSize,
        this.config.maxBatchSize,
        totalItems
      );
    }

    const history = this.batchSizeHistory.get(processorName) || [];
    if (history.length === 0) {
      return Math.min(this.config.defaultBatchSize, totalItems);
    }

    // Calculate optimal batch size based on recent performance
    const recentSizes = history.slice(-10);
    const averageSize = recentSizes.reduce((sum, size) => sum + size, 0) / recentSizes.length;
    
    // Adjust based on memory pressure
    const memoryFactor = this.memoryManager.isUnderPressure ? 0.7 : 1.0;
    const optimalSize = Math.floor(averageSize * memoryFactor);

    return Math.max(
      this.config.dynamicBatchSizing.minSize,
      Math.min(optimalSize, this.config.dynamicBatchSizing.maxSize, totalItems)
    );
  }

  /**
   * Circuit breaker implementation for fault tolerance
   */
  private isCircuitBreakerOpen(processorName: string): boolean {
    const state = this.circuitBreakers.get(processorName) || CircuitBreakerState.CLOSED;
    const stats = this.circuitBreakerStats.get(processorName);
    
    if (state === CircuitBreakerState.OPEN) {
      // Check if timeout period has passed
      if (stats?.lastFailureTime && 
          Date.now() - stats.lastFailureTime > this.config.circuitBreaker.timeout) {
        this.circuitBreakers.set(processorName, CircuitBreakerState.HALF_OPEN);
        return false;
      }
      return true;
    }
    
    return false;
  }

  private recordCircuitBreakerSuccess(processorName: string): void {
    const stats = this.circuitBreakerStats.get(processorName) || { failures: 0, successes: 0 };
    stats.successes++;
    
    const state = this.circuitBreakers.get(processorName) || CircuitBreakerState.CLOSED;
    if (state === CircuitBreakerState.HALF_OPEN && 
        stats.successes >= this.config.circuitBreaker.successThreshold) {
      this.circuitBreakers.set(processorName, CircuitBreakerState.CLOSED);
      stats.failures = 0;
    }
    
    this.circuitBreakerStats.set(processorName, stats);
  }

  private recordCircuitBreakerFailure(processorName: string): void {
    const stats = this.circuitBreakerStats.get(processorName) || { failures: 0, successes: 0 };
    stats.failures++;
    stats.lastFailureTime = Date.now();
    
    if (stats.failures >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreakers.set(processorName, CircuitBreakerState.OPEN);
      this.emit('circuit-breaker-opened', { processorName, failures: stats.failures });
    }
    
    this.circuitBreakerStats.set(processorName, stats);
  }

  /**
   * Memory management and garbage collection
   */
  private async handleMemoryPressure(): Promise<void> {
    // Reduce batch sizes temporarily
    const memoryFactor = 0.5;
    for (const [processorName, history] of this.batchSizeHistory) {
      const reducedSizes = history.map(size => Math.floor(size * memoryFactor));
      this.batchSizeHistory.set(processorName, reducedSizes);
    }

    // Clean up completed jobs
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
    for (const [jobId, job] of this.completedJobs) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.completedJobs.delete(jobId);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.emit('memory-pressure-handled');
  }

  private shouldTriggerGC(): boolean {
    return this.memoryManager.currentUsage > this.memoryManager.gcTriggerThreshold;
  }

  private async performGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      this.emit('garbage-collection-triggered');
    }
  }

  /**
   * Processing loop with priority queue management
   */
  private async startProcessingLoop(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const processNext = async () => {
      if (this.workerPool.activeWorkers >= this.workerPool.maxWorkers) {
        setTimeout(processNext, 10); // Short delay when at capacity
        return;
      }

      const nextJob = this.getNextJobFromQueue();
      if (!nextJob) {
        setTimeout(processNext, 50); // Longer delay when queue is empty
        return;
      }

      this.processJob(nextJob).finally(() => {
        setImmediate(processNext); // Process next job immediately
      });
    };

    // Start multiple processing loops for concurrency
    const concurrentLoops = Math.min(this.workerPool.maxWorkers, 4);
    for (let i = 0; i < concurrentLoops; i++) {
      setTimeout(processNext, i * 10); // Stagger start times
    }
  }

  private getNextJobFromQueue(): BatchJob<any, any> | null {
    if (this.jobQueue.size === 0) return null;

    // Sort by priority and creation time
    const jobs = Array.from(this.jobQueue.values())
      .filter(job => job.status === BatchJobStatus.PENDING || job.status === BatchJobStatus.QUEUED)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.createdAt - b.createdAt; // Earlier jobs first
      });

    if (jobs.length === 0) return null;

    const nextJob = jobs[0];
    this.jobQueue.delete(nextJob.id);
    this.metrics.queueSize = this.jobQueue.size;
    
    return nextJob;
  }

  // Helper methods

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateProgress<T, R>(
    job: BatchJob<T, R>, 
    processedItems: number, 
    results: BatchResult<R>[]
  ): BatchProgress {
    const totalItems = job.items.length;
    const percentage = (processedItems / totalItems) * 100;
    const currentTime = Date.now();
    const elapsedTime = currentTime - job.startedAt!;
    const averageTimePerItem = elapsedTime / processedItems;
    const remainingItems = totalItems - processedItems;
    const estimatedTimeRemaining = remainingItems * averageTimePerItem;

    return {
      jobId: job.id,
      totalItems,
      processedItems,
      completedBatches: Math.floor(processedItems / (job.options.batchSize || this.config.defaultBatchSize)),
      totalBatches: Math.ceil(totalItems / (job.options.batchSize || this.config.defaultBatchSize)),
      percentage,
      estimatedTimeRemaining,
      currentBatchSize: job.options.batchSize || this.config.defaultBatchSize,
      averageProcessingTime: averageTimePerItem,
      errors: results.filter(r => !r.success).length
    };
  }

  private shouldRetryJob<T, R>(job: BatchJob<T, R>, error: any): boolean {
    const retryPolicy = job.options.retryPolicy || this.config.retryPolicy;
    
    if (job.retryCount >= retryPolicy.maxAttempts) {
      return false;
    }

    if (!job.processor.retryable) {
      return false;
    }

    // Check if error is retryable
    if (retryPolicy.retryableErrors && retryPolicy.retryableErrors.length > 0) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return retryPolicy.retryableErrors.some(pattern => errorMessage.includes(pattern));
    }

    return true;
  }

  private calculateRetryDelay(retryCount: number, retryPolicy?: RetryPolicy): number {
    const policy = retryPolicy || this.config.retryPolicy;
    let delay = policy.baseDelay * Math.pow(policy.backoffMultiplier, retryCount - 1);
    
    delay = Math.min(delay, policy.maxDelay);
    
    if (policy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
    }
    
    return Math.floor(delay);
  }

  private adjustBatchSize(processorName: string, processingTime: number): void {
    const targetTime = this.config.dynamicBatchSizing.targetProcessingTime;
    const adjustmentFactor = this.config.dynamicBatchSizing.adjustmentFactor;
    
    const history = this.batchSizeHistory.get(processorName) || [];
    const lastSize = history[history.length - 1] || this.config.defaultBatchSize;
    
    let newSize = lastSize;
    if (processingTime > targetTime * 1.5) {
      // Too slow, reduce batch size
      newSize = Math.floor(lastSize * (1 - adjustmentFactor));
    } else if (processingTime < targetTime * 0.5) {
      // Too fast, increase batch size
      newSize = Math.floor(lastSize * (1 + adjustmentFactor));
    }
    
    newSize = Math.max(this.config.dynamicBatchSizing.minSize, 
                       Math.min(newSize, this.config.dynamicBatchSizing.maxSize));
    
    history.push(newSize);
    if (history.length > 20) {
      history.shift(); // Keep only recent history
    }
    
    this.batchSizeHistory.set(processorName, history);
  }

  private updateProcessingMetrics(duration: number): void {
    const totalProcessed = this.metrics.completedJobs + this.metrics.failedJobs;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (totalProcessed - 1) + duration) / totalProcessed;
    
    this.metrics.errorRate = (this.metrics.failedJobs / Math.max(totalProcessed, 1)) * 100;
    this.metrics.activeWorkers = this.workerPool.activeWorkers;
    this.metrics.memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024); // MB
    
    // Update memory manager
    this.memoryManager.currentUsage = this.metrics.memoryUsage;
    this.memoryManager.isUnderPressure = this.memoryManager.currentUsage > this.memoryManager.threshold;
  }

  private startMetricsCollection(): void {
    if (!this.config.monitoring.enabled) return;

    this.metricsInterval = setInterval(() => {
      this.updateThroughputMetrics();
      this.emit('metrics-updated', this.getMetrics());
      
      // Check alert thresholds
      this.checkAlertThresholds();
    }, this.config.monitoring.metricsInterval);
  }

  private updateThroughputMetrics(): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const recentOps = this.operationLog.filter(op => now - op.timestamp < timeWindow);
    
    this.metrics.throughput = recentOps.length / (timeWindow / 1000); // ops per second
  }

  private checkAlertThresholds(): void {
    const thresholds = this.config.monitoring.alertThresholds;
    
    if (this.metrics.queueSize > thresholds.queueSize) {
      this.emit('alert', { type: 'queue-size', value: this.metrics.queueSize, threshold: thresholds.queueSize });
    }
    
    if (this.metrics.errorRate > thresholds.errorRate) {
      this.emit('alert', { type: 'error-rate', value: this.metrics.errorRate, threshold: thresholds.errorRate });
    }
    
    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      this.emit('alert', { type: 'memory-usage', value: this.metrics.memoryUsage, threshold: thresholds.memoryUsage });
    }
    
    if (this.metrics.averageProcessingTime > thresholds.processingTime) {
      this.emit('alert', { type: 'processing-time', value: this.metrics.averageProcessingTime, threshold: thresholds.processingTime });
    }
  }

  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logOperation<T, R>(operation: BatchOperation<T, R>): void {
    this.operationLog.push(operation);
    
    // Keep only recent operations
    if (this.operationLog.length > 10000) {
      this.operationLog = this.operationLog.slice(-5000);
    }
  }

  // Public API methods

  public getJobStatus(jobId: string): BatchJobStatus | null {
    const job = this.jobQueue.get(jobId) || 
                this.processingJobs.get(jobId) || 
                this.completedJobs.get(jobId);
    return job?.status || null;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (job && job.status === BatchJobStatus.PENDING) {
      job.status = BatchJobStatus.CANCELLED;
      this.jobQueue.delete(jobId);
      this.emit('job-cancelled', { jobId });
      return true;
    }
    return false;
  }

  public getMetrics(): BatchMetrics {
    // Update circuit breaker stats
    this.metrics.circuitBreakerStats = {};
    for (const [processorName, stats] of this.circuitBreakerStats) {
      this.metrics.circuitBreakerStats[processorName] = {
        state: this.circuitBreakers.get(processorName) || CircuitBreakerState.CLOSED,
        ...stats
      };
    }
    
    return { ...this.metrics };
  }

  public getQueueStats(): QueueStats {
    const jobs = Array.from(this.jobQueue.values());
    const priorityDistribution: Record<number, number> = {};
    
    jobs.forEach(job => {
      priorityDistribution[job.priority] = (priorityDistribution[job.priority] || 0) + 1;
    });

    const completedJobs = Array.from(this.completedJobs.values());
    const averageWaitTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.startedAt! - job.createdAt), 0) / completedJobs.length
      : 0;

    return {
      pending: jobs.filter(j => j.status === BatchJobStatus.PENDING).length,
      processing: this.processingJobs.size,
      completed: this.completedJobs.size,
      failed: jobs.filter(j => j.status === BatchJobStatus.FAILED).length,
      totalMemoryUsage: this.metrics.memoryUsage,
      averageWaitTime,
      priorityDistribution
    };
  }

  public async shutdown(): Promise<void> {
    this.isProcessing = false;
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Wait for active jobs to complete or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.processingJobs.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('shutdown', { 
      pendingJobs: this.jobQueue.size, 
      processingJobs: this.processingJobs.size 
    });
    
    this.removeAllListeners();
  }
}