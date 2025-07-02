/**
 * Production Configuration for Performance Integration
 * Optimized settings for >1000 ops/sec and >95% cache hit rate
 */

import { PerformanceIntegrationConfig } from '../PerformanceIntegration';
import { CacheConfig, EvictionPolicy } from '../../cache/types';
import { BatchSystemConfig } from '../../batch/types';
import { MonitoringConfig, AlertSeverity } from '../../monitoring/types';

/**
 * Production cache configuration
 * Optimized for high hit rates and low latency
 */
export const PRODUCTION_CACHE_CONFIG: Partial<CacheConfig> = {
  l1: {
    maxSize: 200 * 1024 * 1024, // 200MB for hot data
    maxEntries: 50000,
    ttl: 300000, // 5 minutes for L1
    evictionPolicy: EvictionPolicy.LRU
  },
  l2: {
    host: process.env.REDIS_HOST || 'redis-cluster.sei.network',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB for L2
    ttl: 3600000, // 1 hour for L2
    keyPrefix: 'sei:prod:'
  },
  l3: {
    directory: process.env.CACHE_DIR || '/var/cache/sei',
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB for L3
    ttl: 86400000, // 24 hours for L3
    compression: true
  },
  warming: {
    enabled: true,
    batchSize: 100,
    concurrency: 8,
    predictiveThreshold: 5 // Warm after 5 accesses
  },
  monitoring: {
    enabled: true,
    metricsInterval: 10000, // 10 seconds
    alertThresholds: {
      hitRate: 90, // Alert if hit rate < 90%
      memoryUsage: 180, // Alert if memory > 180MB
      latency: 50 // Alert if latency > 50ms
    }
  }
};

/**
 * Production batch processing configuration
 * Optimized for high throughput
 */
export const PRODUCTION_BATCH_CONFIG: Partial<BatchSystemConfig> = {
  workerPoolSize: parseInt(process.env.WORKER_POOL_SIZE || '16'),
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '32'),
  defaultBatchSize: 100,
  maxBatchSize: 1000,
  queueMaxSize: 50000,
  memoryThreshold: 1024 * 1024 * 1024, // 1GB threshold
  dynamicBatchSizing: {
    enabled: true,
    minSize: 25,
    maxSize: 500,
    targetProcessingTime: 50, // Target 50ms per batch
    adjustmentFactor: 0.15
  },
  retryPolicy: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'RATE_LIMIT',
      'INSUFFICIENT_FUNDS',
      'NONCE_TOO_LOW'
    ]
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 30000 // 30 seconds
  },
  monitoring: {
    enabled: true,
    metricsInterval: 5000,
    alertThresholds: {
      queueSize: 10000,
      errorRate: 5,
      memoryUsage: 800, // 800MB
      processingTime: 1000 // 1 second
    }
  }
};

/**
 * Production monitoring configuration
 * Comprehensive monitoring and alerting
 */
export const PRODUCTION_MONITORING_CONFIG: Partial<MonitoringConfig> = {
  enabled: true,
  collectInterval: 5000, // 5 seconds
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  bottleneckDetection: {
    enabled: true,
    analysisInterval: 30000, // 30 seconds
    thresholds: {
      cpuUsage: 75,
      memoryUsage: 80,
      responseTime: 500,
      errorRate: 2
    }
  },
  alerts: {
    enabled: true,
    notification: {
      email: process.env.ALERT_EMAIL === 'true',
      slack: process.env.ALERT_SLACK === 'true',
      webhook: process.env.ALERT_WEBHOOK === 'true'
    },
    rules: [
      // Critical alerts
      {
        id: 'system_down',
        name: 'System Down',
        metric: 'system.health',
        threshold: 0,
        condition: { operator: 'eq', aggregation: 'last' },
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        cooldownPeriod: 60000 // 1 minute
      },
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
      // Warning alerts
      {
        id: 'degraded_performance',
        name: 'Degraded Performance',
        metric: 'application.requests.p95ResponseTime',
        threshold: 1000,
        condition: {
          operator: 'gt',
          aggregation: 'avg',
          timeWindow: 600000, // 10 minutes
          samples: 20
        },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownPeriod: 1800000 // 30 minutes
      },
      {
        id: 'low_cache_efficiency',
        name: 'Low Cache Efficiency',
        metric: 'application.cache.hitRate',
        threshold: 85,
        condition: {
          operator: 'lt',
          aggregation: 'avg',
          timeWindow: 900000, // 15 minutes
          samples: 30
        },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownPeriod: 3600000 // 1 hour
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metric: 'system.memory.usage',
        threshold: 85,
        condition: {
          operator: 'gt',
          aggregation: 'avg',
          timeWindow: 300000,
          samples: 10
        },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownPeriod: 900000
      },
      // Info alerts
      {
        id: 'batch_queue_growing',
        name: 'Batch Queue Growing',
        metric: 'application.batch.queueSize',
        threshold: 5000,
        condition: {
          operator: 'gt',
          aggregation: 'last'
        },
        severity: AlertSeverity.INFO,
        enabled: true,
        cooldownPeriod: 1800000
      }
    ]
  }
};

/**
 * Complete production configuration
 */
export const PRODUCTION_CONFIG: PerformanceIntegrationConfig = {
  cache: {
    enabled: true,
    l1MaxSize: PRODUCTION_CACHE_CONFIG.l1!.maxSize,
    l1MaxEntries: PRODUCTION_CACHE_CONFIG.l1!.maxEntries,
    l2Host: PRODUCTION_CACHE_CONFIG.l2!.host,
    l2Port: PRODUCTION_CACHE_CONFIG.l2!.port,
    l3Directory: PRODUCTION_CACHE_CONFIG.l3!.directory,
    warmingEnabled: PRODUCTION_CACHE_CONFIG.warming!.enabled
  },
  batch: {
    enabled: true,
    workerPoolSize: PRODUCTION_BATCH_CONFIG.workerPoolSize!,
    defaultBatchSize: PRODUCTION_BATCH_CONFIG.defaultBatchSize!,
    maxBatchSize: PRODUCTION_BATCH_CONFIG.maxBatchSize!,
    queueMaxSize: PRODUCTION_BATCH_CONFIG.queueMaxSize!
  },
  monitoring: {
    enabled: true,
    collectInterval: PRODUCTION_MONITORING_CONFIG.collectInterval!,
    retentionPeriod: PRODUCTION_MONITORING_CONFIG.retentionPeriod!,
    alertsEnabled: PRODUCTION_MONITORING_CONFIG.alerts!.enabled
  }
};

/**
 * Environment-specific overrides
 */
export function getProductionConfig(): PerformanceIntegrationConfig {
  const config = { ...PRODUCTION_CONFIG };

  // Apply environment-specific overrides
  if (process.env.NODE_ENV === 'staging') {
    config.cache.l1MaxSize = 100 * 1024 * 1024; // 100MB for staging
    config.batch.workerPoolSize = 8;
  }

  if (process.env.HIGH_PERFORMANCE_MODE === 'true') {
    config.cache.l1MaxSize = 500 * 1024 * 1024; // 500MB for high performance
    config.batch.workerPoolSize = 32;
    config.batch.defaultBatchSize = 200;
  }

  return config;
}

/**
 * Cache warming patterns for production
 */
export const CACHE_WARMING_PATTERNS = {
  // Warm lending rates every 5 minutes
  lendingRates: {
    pattern: 'lending:rates:*',
    interval: 300000,
    priority: 9
  },
  // Warm portfolio summaries every minute
  portfolioSummaries: {
    pattern: 'portfolio:summary:*',
    interval: 60000,
    priority: 10
  },
  // Warm market data every 30 seconds
  marketData: {
    pattern: 'market:data:*',
    interval: 30000,
    priority: 8
  },
  // Warm liquidity pools every 2 minutes
  liquidityPools: {
    pattern: 'liquidity:pools:*',
    interval: 120000,
    priority: 7
  }
};

/**
 * Batch processing priorities
 */
export const BATCH_PRIORITIES = {
  CRITICAL: 10, // System critical operations
  HIGH: 8,      // User-initiated transactions
  MEDIUM: 5,    // Rebalancing operations
  LOW: 3,       // Background tasks
  IDLE: 1       // Non-urgent operations
};

/**
 * Performance thresholds for production
 */
export const PERFORMANCE_THRESHOLDS = {
  // Target metrics
  targetOpsPerSecond: 1000,
  targetCacheHitRate: 95,
  targetResponseTime: 50,
  
  // Acceptable ranges
  minOpsPerSecond: 800,
  minCacheHitRate: 90,
  maxResponseTime: 100,
  
  // Critical thresholds
  criticalOpsPerSecond: 500,
  criticalCacheHitRate: 80,
  criticalResponseTime: 500
};