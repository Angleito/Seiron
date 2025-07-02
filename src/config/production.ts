import { PerformanceConfig } from '../core/types';

/**
 * Production configuration optimized for >1000 ops/sec and >95% cache hit rate
 */
export const productionConfig: PerformanceConfig = {
  cache: {
    layers: {
      L1: {
        maxSize: 200 * 1024 * 1024, // 200MB
        ttl: 60000, // 1 minute
        evictionPolicy: 'lru'
      },
      L2: {
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB (Redis)
        ttl: 300000, // 5 minutes
        evictionPolicy: 'lfu'
      },
      L3: {
        maxSize: 10 * 1024 * 1024 * 1024, // 10GB (Disk)
        ttl: 3600000, // 1 hour
        evictionPolicy: 'fifo'
      }
    },
    compression: {
      enabled: true,
      threshold: 1024, // Compress if > 1KB
      algorithm: 'lz4'
    },
    persistence: {
      enabled: true,
      path: './cache',
      syncInterval: 30000 // 30 seconds
    },
    cleanupInterval: 300000, // 5 minutes
    monitoring: {
      trackHitRate: true,
      trackLatency: true,
      trackSize: true
    }
  },
  
  batchProcessing: {
    defaultBatchSize: 100,
    maxBatchDelay: 1000, // 1 second
    maxConcurrentBatches: 5,
    workers: 16,
    queues: {
      blockchain_tx: {
        priority: 'high',
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 30000 // 30 seconds
      },
      api_requests: {
        priority: 'normal',
        retryAttempts: 2,
        retryDelay: 500,
        timeout: 10000 // 10 seconds
      },
      analytics: {
        priority: 'low',
        retryAttempts: 1,
        retryDelay: 2000,
        timeout: 60000 // 1 minute
      }
    },
    batchSizes: {
      blockchain: 50, // Optimal for gas efficiency
      api: 100,
      analytics: 500
    },
    dynamicSizing: {
      enabled: true,
      minSize: 10,
      maxSize: 1000,
      adjustmentFactor: 1.5
    }
  },
  
  monitoring: {
    metricsInterval: 5000, // 5 seconds
    historySize: 10000,
    enableDetailedMetrics: true,
    endpoints: {
      performance: '/metrics/performance',
      health: '/health',
      ready: '/ready'
    },
    alerts: {
      cacheHitRate: {
        threshold: 0.95, // Alert if < 95%
        window: 300000 // 5 minute window
      },
      responseTime: {
        p95: 100, // Alert if p95 > 100ms
        p99: 500  // Alert if p99 > 500ms
      },
      errorRate: {
        threshold: 0.01, // Alert if > 1%
        window: 60000 // 1 minute window
      },
      batchProcessing: {
        queueDepth: 1000, // Alert if queue > 1000
        processingTime: 5000 // Alert if batch takes > 5s
      }
    },
    export: {
      format: 'prometheus',
      interval: 60000, // Export every minute
      retention: 604800000 // 7 days
    }
  },
  
  optimization: {
    preloading: {
      enabled: true,
      patterns: [
        {
          pattern: 'portfolio_*',
          ttl: 300000, // 5 minutes
          priority: 'high'
        },
        {
          pattern: 'lending_rates_*',
          ttl: 600000, // 10 minutes
          priority: 'medium'
        },
        {
          pattern: 'market_data_*',
          ttl: 30000, // 30 seconds
          priority: 'high'
        }
      ]
    },
    compression: {
      threshold: 1024, // Compress responses > 1KB
      level: 6 // zlib compression level (1-9)
    },
    connectionPooling: {
      minConnections: 10,
      maxConnections: 100,
      idleTimeout: 60000, // 1 minute
      connectionTimeout: 5000 // 5 seconds
    },
    circuitBreaker: {
      enabled: true,
      threshold: 5, // 5 failures
      timeout: 30000, // 30 second timeout
      resetTimeout: 60000 // 1 minute reset
    }
  },
  
  // Environment-specific overrides
  environment: {
    development: {
      cache: {
        layers: {
          L1: {
            maxSize: 50 * 1024 * 1024, // 50MB for dev
            ttl: 30000 // 30 seconds
          }
        }
      },
      monitoring: {
        metricsInterval: 10000 // 10 seconds for dev
      }
    },
    staging: {
      batchProcessing: {
        maxConcurrentBatches: 3,
        workers: 8
      }
    },
    production: {
      // Use defaults above
    }
  },
  
  // Feature flags
  features: {
    adaptiveCaching: true,
    predictivePreloading: true,
    dynamicBatching: true,
    smartRetries: true,
    distributedCache: false, // Enable for multi-instance
    realTimeAnalytics: true
  }
};