/**
 * Performance Integration Module Exports
 * Central entry point for high-performance system integration
 */

export {
  PerformanceIntegration,
  createPerformanceIntegration,
  PerformanceIntegrationConfig,
  DEFAULT_PERFORMANCE_CONFIG
} from './PerformanceIntegration';

export {
  PRODUCTION_CONFIG,
  PRODUCTION_CACHE_CONFIG,
  PRODUCTION_BATCH_CONFIG,
  PRODUCTION_MONITORING_CONFIG,
  getProductionConfig,
  CACHE_WARMING_PATTERNS,
  BATCH_PRIORITIES,
  PERFORMANCE_THRESHOLDS
} from './config/production';

// Re-export core module types for convenience
export type {
  CacheConfig,
  CacheTier,
  CacheStats,
  CacheHealth,
  EvictionPolicy
} from '../cache/types';

export type {
  BatchProcessor,
  BatchJob,
  BatchResult,
  BatchMetrics,
  BatchSystemConfig
} from '../batch/types';

export type {
  MonitoringConfig,
  PerformanceMetric,
  MetricSnapshot,
  PerformanceAlert,
  PerformanceReport,
  Bottleneck
} from '../monitoring/types';

/**
 * Quick start functions
 */

/**
 * Create a production-ready performance integration
 */
export function createProductionIntegration() {
  return createPerformanceIntegration(getProductionConfig());
}

/**
 * Create a development performance integration with reduced resources
 */
export function createDevelopmentIntegration() {
  return createPerformanceIntegration({
    cache: {
      enabled: true,
      l1MaxSize: 50 * 1024 * 1024, // 50MB
      l1MaxEntries: 1000,
      warmingEnabled: false
    },
    batch: {
      enabled: true,
      workerPoolSize: 2,
      defaultBatchSize: 10,
      maxBatchSize: 100,
      queueMaxSize: 1000
    },
    monitoring: {
      enabled: true,
      collectInterval: 10000,
      retentionPeriod: 60 * 60 * 1000, // 1 hour
      alertsEnabled: false
    }
  });
}

/**
 * Performance integration middleware for Express/Koa
 */
export function performanceMiddleware(integration: PerformanceIntegration) {
  return async (req: any, res: any, next: any) => {
    const start = performance.now();
    const originalSend = res.send;
    
    // Override send to record metrics
    res.send = function(data: any) {
      const duration = performance.now() - start;
      const success = res.statusCode < 400;
      
      // Record API call metrics
      integration.recordApiCall(req.path, duration, success);
      
      // Record custom metrics
      if (req.path.includes('/api/v1/portfolio')) {
        integration.recordCustomMetric('api.portfolio.requests', 1, 'count');
      } else if (req.path.includes('/api/v1/lending')) {
        integration.recordCustomMetric('api.lending.requests', 1, 'count');
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Utility functions for common patterns
 */

/**
 * Create a cached API endpoint wrapper
 */
export function createCachedEndpoint<T>(
  integration: PerformanceIntegration,
  endpoint: string,
  handler: (...args: any[]) => Promise<T>,
  ttl: number = 60000
): (...args: any[]) => Promise<T> {
  return integration.wrapEndpointWithCache(endpoint, handler, { ttl });
}

/**
 * Create a batched processor for blockchain operations
 */
export function createBlockchainBatcher(integration: PerformanceIntegration) {
  return integration.createBatchProcessor(
    'blockchain_operations',
    async (operations: any[]) => {
      // Group by operation type
      const grouped = operations.reduce((acc, op) => {
        const type = op.type || 'default';
        if (!acc[type]) acc[type] = [];
        acc[type].push(op);
        return acc;
      }, {} as Record<string, any[]>);

      const results = [];
      
      // Process each type
      for (const [type, ops] of Object.entries(grouped)) {
        if (type === 'transfer') {
          // Batch transfers
          const txHashes = await batchTransfers(ops);
          results.push(...txHashes);
        } else if (type === 'contract_call') {
          // Batch contract calls
          const responses = await batchContractCalls(ops);
          results.push(...responses);
        }
      }

      return results;
    },
    {
      timeout: 60000,
      retryable: true
    }
  );
}

// Helper functions (would be implemented with actual blockchain interaction)
async function batchTransfers(transfers: any[]): Promise<any[]> {
  // Implementation would batch transfers
  return transfers.map(t => ({ txHash: '0x...', status: 'success' }));
}

async function batchContractCalls(calls: any[]): Promise<any[]> {
  // Implementation would batch contract calls
  return calls.map(c => ({ result: 'success', data: {} }));
}