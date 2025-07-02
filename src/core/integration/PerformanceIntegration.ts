/**
 * High-Performance Module Integration
 * Wires caching, batch processing, and monitoring into the production system
 * 
 * Performance targets:
 * - >1000 operations/second
 * - >95% cache hit rate
 * - <50ms response time for cached data
 */

import { SmartCacheManager } from '../cache/SmartCacheManager';
import { BatchProcessingEngine } from '../batch/BatchProcessingEngine';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { 
  CacheConfig, 
  CacheTier, 
  EvictionPolicy 
} from '../cache/types';
import { 
  BatchSystemConfig, 
  BatchProcessor,
  CircuitBreakerState 
} from '../batch/types';
import { 
  MonitoringConfig,
  AlertSeverity,
  AlertType
} from '../monitoring/types';

/**
 * Performance integration configuration
 */
export interface PerformanceIntegrationConfig {
  cache: {
    enabled: boolean;
    l1MaxSize: number;
    l1MaxEntries: number;
    l2Host?: string;
    l2Port?: number;
    l3Directory: string;
    warmingEnabled: boolean;
  };
  batch: {
    enabled: boolean;
    workerPoolSize: number;
    defaultBatchSize: number;
    maxBatchSize: number;
    queueMaxSize: number;
  };
  monitoring: {
    enabled: boolean;
    collectInterval: number;
    retentionPeriod: number;
    alertsEnabled: boolean;
  };
}

/**
 * Default production configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceIntegrationConfig = {
  cache: {
    enabled: true,
    l1MaxSize: 100 * 1024 * 1024, // 100MB
    l1MaxEntries: 10000,
    l2Host: 'localhost',
    l2Port: 6379,
    l3Directory: '/tmp/sei-cache',
    warmingEnabled: true
  },
  batch: {
    enabled: true,
    workerPoolSize: 8,
    defaultBatchSize: 100,
    maxBatchSize: 1000,
    queueMaxSize: 10000
  },
  monitoring: {
    enabled: true,
    collectInterval: 5000, // 5 seconds
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    alertsEnabled: true
  }
};

/**
 * Performance Integration Manager
 * Central coordinator for all performance modules
 */
export class PerformanceIntegration {
  private cache: SmartCacheManager;
  private batchProcessor: BatchProcessingEngine;
  private monitor: PerformanceMonitor;
  private config: PerformanceIntegrationConfig;
  private isInitialized = false;

  constructor(config: Partial<PerformanceIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Initialize all performance modules
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Performance modules already initialized');
    }

    // Initialize cache
    if (this.config.cache.enabled) {
      const cacheConfig: CacheConfig = {
        l1: {
          maxSize: this.config.cache.l1MaxSize,
          maxEntries: this.config.cache.l1MaxEntries,
          ttl: 3600000, // 1 hour
          evictionPolicy: EvictionPolicy.LRU
        },
        l2: {
          host: this.config.cache.l2Host || 'localhost',
          port: this.config.cache.l2Port || 6379,
          maxSize: 500 * 1024 * 1024, // 500MB
          ttl: 86400000, // 24 hours
          keyPrefix: 'sei:'
        },
        l3: {
          directory: this.config.cache.l3Directory,
          maxSize: 1024 * 1024 * 1024, // 1GB
          ttl: 604800000, // 7 days
          compression: true
        },
        warming: {
          enabled: this.config.cache.warmingEnabled,
          batchSize: 50,
          concurrency: 4,
          predictiveThreshold: 3
        },
        monitoring: {
          enabled: this.config.monitoring.enabled,
          metricsInterval: this.config.monitoring.collectInterval,
          alertThresholds: {
            hitRate: 80, // Alert if hit rate < 80%
            memoryUsage: 90, // Alert if memory > 90MB
            latency: 100 // Alert if latency > 100ms
          }
        }
      };

      this.cache = new SmartCacheManager(cacheConfig);
      this.setupCacheEventHandlers();
    }

    // Initialize batch processor
    if (this.config.batch.enabled) {
      const batchConfig: BatchSystemConfig = {
        workerPoolSize: this.config.batch.workerPoolSize,
        maxConcurrentJobs: this.config.batch.workerPoolSize,
        defaultBatchSize: this.config.batch.defaultBatchSize,
        maxBatchSize: this.config.batch.maxBatchSize,
        queueMaxSize: this.config.batch.queueMaxSize,
        memoryThreshold: 500 * 1024 * 1024, // 500MB
        dynamicBatchSizing: {
          enabled: true,
          minSize: 10,
          maxSize: this.config.batch.maxBatchSize,
          targetProcessingTime: 100, // 100ms per batch
          adjustmentFactor: 0.2
        },
        retryPolicy: {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitter: true,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'RATE_LIMIT']
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 60000
        },
        monitoring: {
          enabled: this.config.monitoring.enabled,
          metricsInterval: this.config.monitoring.collectInterval,
          alertThresholds: {
            queueSize: 5000,
            errorRate: 10,
            memoryUsage: 400,
            processingTime: 5000
          }
        }
      };

      this.batchProcessor = new BatchProcessingEngine(batchConfig);
      this.setupBatchEventHandlers();
    }

    // Initialize performance monitor
    if (this.config.monitoring.enabled) {
      const monitoringConfig: MonitoringConfig = {
        enabled: true,
        collectInterval: this.config.monitoring.collectInterval,
        retentionPeriod: this.config.monitoring.retentionPeriod,
        bottleneckDetection: {
          enabled: true,
          analysisInterval: 60000, // 1 minute
          thresholds: {
            cpuUsage: 80,
            memoryUsage: 85,
            responseTime: 1000,
            errorRate: 5
          }
        },
        alerts: {
          enabled: this.config.monitoring.alertsEnabled,
          notification: {
            email: false,
            slack: false,
            webhook: true
          },
          rules: [
            {
              id: 'high_error_rate',
              name: 'High Error Rate',
              metric: 'application.requests.errorRate',
              threshold: 5,
              condition: {
                operator: 'gt',
                aggregation: 'avg',
                timeWindow: 300000, // 5 minutes
                samples: 10
              },
              severity: AlertSeverity.CRITICAL,
              enabled: true,
              cooldownPeriod: 600000 // 10 minutes
            },
            {
              id: 'slow_response',
              name: 'Slow Response Time',
              metric: 'application.requests.averageResponseTime',
              threshold: 1000,
              condition: {
                operator: 'gt',
                aggregation: 'avg',
                timeWindow: 300000,
                samples: 10
              },
              severity: AlertSeverity.WARNING,
              enabled: true,
              cooldownPeriod: 300000
            },
            {
              id: 'low_cache_hit',
              name: 'Low Cache Hit Rate',
              metric: 'application.cache.hitRate',
              threshold: 80,
              condition: {
                operator: 'lt',
                aggregation: 'avg',
                timeWindow: 600000,
                samples: 20
              },
              severity: AlertSeverity.WARNING,
              enabled: true,
              cooldownPeriod: 1800000
            }
          ]
        }
      };

      this.monitor = new PerformanceMonitor(monitoringConfig);
      this.setupMonitoringEventHandlers();
    }

    this.isInitialized = true;
  }

  /**
   * API Endpoint Integration - Wrap endpoints with caching
   */
  wrapEndpointWithCache<T>(
    endpoint: string,
    handler: (...args: any[]) => Promise<T>,
    options: {
      ttl?: number;
      keyGenerator?: (...args: any[]) => string;
      shouldCache?: (...args: any[]) => boolean;
    } = {}
  ): (...args: any[]) => Promise<T> {
    if (!this.config.cache.enabled || !this.cache) {
      return handler;
    }

    return async (...args: any[]): Promise<T> => {
      const startTime = performance.now();
      
      try {
        // Generate cache key
        const cacheKey = options.keyGenerator 
          ? options.keyGenerator(...args)
          : `api:${endpoint}:${JSON.stringify(args)}`;

        // Check if should cache
        if (options.shouldCache && !options.shouldCache(...args)) {
          return await handler(...args);
        }

        // Try cache first
        const cached = await this.cache.get<T>(cacheKey);
        if (cached !== null) {
          this.monitor?.recordMetric('api.cache.hits', 1, 'count');
          this.monitor?.recordRequest(endpoint, performance.now() - startTime, true);
          return cached;
        }

        // Cache miss - execute handler
        this.monitor?.recordMetric('api.cache.misses', 1, 'count');
        const result = await handler(...args);

        // Store in cache
        await this.cache.set(cacheKey, result, options.ttl || 300000); // 5 min default

        this.monitor?.recordRequest(endpoint, performance.now() - startTime, true);
        return result;

      } catch (error) {
        this.monitor?.recordRequest(endpoint, performance.now() - startTime, false);
        throw error;
      }
    };
  }

  /**
   * Batch Processing Integration - Create batch processors
   */
  createBatchProcessor<T, R>(
    name: string,
    processFunction: (items: T[]) => Promise<R[]>,
    options: {
      timeout?: number;
      retryable?: boolean;
      validate?: (item: T) => boolean;
    } = {}
  ): BatchProcessor<T, R> {
    if (!this.config.batch.enabled || !this.batchProcessor) {
      throw new Error('Batch processing not enabled');
    }

    return {
      name,
      process: processFunction,
      timeout: options.timeout || 30000,
      retryable: options.retryable !== false,
      validate: options.validate
    };
  }

  /**
   * Submit batch job
   */
  async submitBatchJob<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    options?: {
      priority?: number;
      batchSize?: number;
      maxConcurrency?: number;
      progressCallback?: (progress: any) => void;
    }
  ): Promise<string> {
    if (!this.config.batch.enabled || !this.batchProcessor) {
      throw new Error('Batch processing not enabled');
    }

    return await this.batchProcessor.submitJob(items, processor, options);
  }

  /**
   * Performance Monitoring Integration
   */
  recordApiCall(endpoint: string, responseTime: number, success: boolean): void {
    if (!this.config.monitoring.enabled || !this.monitor) {
      return;
    }

    this.monitor.recordRequest(endpoint, responseTime, success);
  }

  recordCustomMetric(name: string, value: number, unit: string = ''): void {
    if (!this.config.monitoring.enabled || !this.monitor) {
      return;
    }

    this.monitor.recordMetric(name, value, unit);
  }

  recordQueryPerformance(query: string, executionTime: number): void {
    if (!this.config.monitoring.enabled || !this.monitor) {
      return;
    }

    this.monitor.recordQueryPerformance(query, executionTime);
  }

  /**
   * Blockchain Operation Batching
   */
  createBlockchainBatchProcessor(): BatchProcessor<any, any> {
    return this.createBatchProcessor(
      'blockchain_transactions',
      async (transactions) => {
        // Group transactions by type for optimal batching
        const grouped = this.groupTransactionsByType(transactions);
        const results = [];

        for (const [type, txs] of Object.entries(grouped)) {
          const batchResult = await this.processBatchedTransactions(type, txs);
          results.push(...batchResult);
        }

        return results;
      },
      {
        timeout: 60000,
        retryable: true,
        validate: (tx) => tx.from && tx.to && tx.amount > 0
      }
    );
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    cache: any;
    batch: any;
    monitoring: any;
  } {
    return {
      cache: this.cache?.getMetrics() || null,
      batch: this.batchProcessor?.getMetrics() || null,
      monitoring: this.monitor?.getSnapshots(10) || null
    };
  }

  /**
   * Get performance report
   */
  generatePerformanceReport(period?: { start: number; end: number }): any {
    if (!this.monitor) {
      throw new Error('Monitoring not enabled');
    }

    return this.monitor.generateReport(period);
  }

  /**
   * Shutdown all performance modules
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = [];

    if (this.cache) {
      shutdownPromises.push(this.cache.destroy());
    }

    if (this.batchProcessor) {
      shutdownPromises.push(this.batchProcessor.shutdown());
    }

    if (this.monitor) {
      shutdownPromises.push(this.monitor.shutdown());
    }

    await Promise.all(shutdownPromises);
    this.isInitialized = false;
  }

  // Private helper methods

  private setupCacheEventHandlers(): void {
    this.cache.on('error', (error) => {
      console.error('Cache error:', error);
      this.monitor?.recordMetric('cache.errors', 1, 'count');
    });

    this.cache.on('stale-while-revalidate', (key) => {
      console.log('Serving stale content for:', key);
      this.monitor?.recordMetric('cache.stale_serves', 1, 'count');
    });

    this.cache.on('cache-warmed', (key) => {
      this.monitor?.recordMetric('cache.warmed_keys', 1, 'count');
    });

    this.cache.on('entry-evicted', (data) => {
      this.monitor?.recordMetric('cache.evictions', 1, 'count', {
        tier: data.tier,
        size: String(data.size)
      });
    });

    this.cache.on('critical-health', (health) => {
      console.error('Cache critical health:', health);
      // Could trigger alerts or auto-scaling here
    });
  }

  private setupBatchEventHandlers(): void {
    this.batchProcessor.on('job-queued', (data) => {
      this.monitor?.recordMetric('batch.jobs_queued', 1, 'count');
    });

    this.batchProcessor.on('job-completed', (data) => {
      this.monitor?.recordMetric('batch.jobs_completed', 1, 'count');
      this.monitor?.recordMetric('batch.processing_time', data.duration, 'ms');
    });

    this.batchProcessor.on('job-failed', (data) => {
      console.error('Batch job failed:', data);
      this.monitor?.recordMetric('batch.jobs_failed', 1, 'count');
    });

    this.batchProcessor.on('circuit-breaker-opened', (data) => {
      console.warn('Circuit breaker opened:', data);
      this.monitor?.recordMetric('batch.circuit_breaker_opens', 1, 'count');
    });

    this.batchProcessor.on('memory-pressure-handled', () => {
      this.monitor?.recordMetric('batch.memory_pressure_events', 1, 'count');
    });

    this.batchProcessor.on('alert', (alert) => {
      console.warn('Batch processing alert:', alert);
    });
  }

  private setupMonitoringEventHandlers(): void {
    this.monitor.on('alert-triggered', (alert) => {
      console.warn('Performance alert:', alert);
      // Could send to external monitoring service
      this.sendAlertNotification(alert);
    });

    this.monitor.on('bottlenecks-detected', (bottlenecks) => {
      console.warn('Performance bottlenecks detected:', bottlenecks);
      // Could trigger auto-scaling or optimization
      this.handleBottlenecks(bottlenecks);
    });

    this.monitor.on('metrics-collected', (snapshot) => {
      // Could send to time-series database
      if (snapshot.system.memory.usage > 90) {
        console.warn('High memory usage detected:', snapshot.system.memory.usage);
      }
    });
  }

  private groupTransactionsByType(transactions: any[]): Record<string, any[]> {
    return transactions.reduce((acc, tx) => {
      const type = tx.type || 'default';
      if (!acc[type]) acc[type] = [];
      acc[type].push(tx);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private async processBatchedTransactions(type: string, transactions: any[]): Promise<any[]> {
    // Placeholder for actual blockchain batch processing
    console.log(`Processing ${transactions.length} ${type} transactions in batch`);
    return transactions.map(tx => ({ ...tx, status: 'processed' }));
  }

  private sendAlertNotification(alert: any): void {
    // Placeholder for alert notification
    // Could integrate with Slack, PagerDuty, etc.
    console.log('Alert notification:', alert);
  }

  private handleBottlenecks(bottlenecks: any[]): void {
    // Placeholder for bottleneck handling
    // Could trigger auto-scaling, cache warming, etc.
    for (const bottleneck of bottlenecks) {
      if (bottleneck.id === 'response_time' && bottleneck.severity > 80) {
        // Could increase cache TTL or warm cache for hot paths
        console.log('Handling response time bottleneck');
      }
    }
  }
}

/**
 * Factory function for creating performance integration
 */
export function createPerformanceIntegration(
  config?: Partial<PerformanceIntegrationConfig>
): PerformanceIntegration {
  return new PerformanceIntegration(config);
}