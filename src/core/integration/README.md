# Performance Integration Guide

This guide explains how to integrate the high-performance core modules (caching, batch processing, and monitoring) into your production system to achieve >1000 operations/second with >95% cache hit rate.

## Quick Start

```typescript
import { createProductionIntegration } from './core/integration';

// Initialize performance integration
const performance = createProductionIntegration();
await performance.initialize();

// Use in your application
const cachedEndpoint = performance.wrapEndpointWithCache(
  'api/data',
  async () => fetchData(),
  { ttl: 60000 }
);
```

## Architecture Overview

The performance integration consists of three main components:

### 1. Smart Cache Manager
- **L1 Memory Cache**: Ultra-fast in-memory storage (< 1ms access)
- **L2 Redis Cache**: Distributed cache for shared state (< 10ms access)
- **L3 Disk Cache**: Large capacity persistent storage (< 50ms access)
- **Intelligent Warming**: Predictive cache warming based on access patterns
- **Stale-While-Revalidate**: Serve stale content while refreshing in background

### 2. Batch Processing Engine
- **Dynamic Batch Sizing**: Automatically adjusts batch size based on performance
- **Circuit Breaker**: Prevents cascading failures
- **Priority Queue**: Processes high-priority jobs first
- **Worker Pool**: Configurable concurrency for optimal throughput
- **Retry Logic**: Exponential backoff with jitter

### 3. Performance Monitor
- **Real-time Metrics**: CPU, memory, response times, error rates
- **Bottleneck Detection**: Identifies performance issues automatically
- **Alert System**: Configurable alerts for critical thresholds
- **Hot Path Analysis**: Tracks frequently accessed code paths
- **Performance Reports**: Comprehensive analysis with recommendations

## Integration Examples

### API Endpoint Caching

```typescript
// Wrap existing endpoints with caching
const getLendingRates = performance.wrapEndpointWithCache(
  'lending/rates',
  async (protocol: string) => {
    return await fetchLendingRates(protocol);
  },
  {
    ttl: 300000, // 5 minutes
    keyGenerator: (protocol) => `rates:${protocol}`,
    shouldCache: (protocol) => protocol !== 'test'
  }
);

// Use the cached endpoint
const rates = await getLendingRates('yei-finance');
```

### Batch Processing

```typescript
// Create a batch processor for blockchain transactions
const txProcessor = performance.createBatchProcessor(
  'blockchain_tx',
  async (transactions) => {
    // Process multiple transactions in one batch
    return await blockchain.sendBatch(transactions);
  },
  {
    timeout: 30000,
    retryable: true,
    validate: (tx) => tx.amount > 0
  }
);

// Submit jobs to the batch processor
const jobId = await performance.submitBatchJob(
  transactions,
  txProcessor,
  {
    priority: 8,
    batchSize: 50,
    progressCallback: (progress) => {
      console.log(`Progress: ${progress.percentage}%`);
    }
  }
);
```

### Performance Monitoring

```typescript
// Record custom metrics
performance.recordCustomMetric('portfolio.value', 100000, 'USD');
performance.recordCustomMetric('gas.spent', 0.5, 'SEI');

// Record API performance
const start = performance.now();
const result = await someOperation();
performance.recordApiCall('/api/operation', performance.now() - start, true);

// Get performance report
const report = performance.generatePerformanceReport();
console.log(report);
```

## Configuration

### Production Settings

```typescript
const config: PerformanceIntegrationConfig = {
  cache: {
    enabled: true,
    l1MaxSize: 200 * 1024 * 1024, // 200MB
    l1MaxEntries: 50000,
    l2Host: 'redis-cluster.network',
    l2Port: 6379,
    l3Directory: '/var/cache/app',
    warmingEnabled: true
  },
  batch: {
    enabled: true,
    workerPoolSize: 16,
    defaultBatchSize: 100,
    maxBatchSize: 1000,
    queueMaxSize: 50000
  },
  monitoring: {
    enabled: true,
    collectInterval: 5000,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    alertsEnabled: true
  }
};
```

### Environment Variables

```bash
# Cache settings
REDIS_HOST=redis-cluster.network
REDIS_PORT=6379
CACHE_DIR=/var/cache/app

# Batch processing
WORKER_POOL_SIZE=16
MAX_CONCURRENT_JOBS=32

# Monitoring
ALERT_EMAIL=true
ALERT_SLACK=true
ALERT_WEBHOOK=true

# Performance mode
HIGH_PERFORMANCE_MODE=true
```

## Best Practices

### 1. Cache Key Design
```typescript
// Good: Hierarchical, predictable keys
`portfolio:${userId}:summary`
`lending:rates:${protocol}:${asset}`
`market:data:${asset}:${timeframe}`

// Bad: Random, unpredictable keys
`data_${randomId}`
`cache_${timestamp}`
```

### 2. Batch Job Design
```typescript
// Good: Group similar operations
const processor = performance.createBatchProcessor(
  'transfers',
  async (transfers) => {
    // Group by token type for efficient processing
    const grouped = groupByToken(transfers);
    return await processGrouped(grouped);
  }
);

// Bad: Process individually
for (const transfer of transfers) {
  await processTransfer(transfer);
}
```

### 3. Monitoring Integration
```typescript
// Good: Record meaningful metrics
performance.recordCustomMetric('defi.tvl', tvl, 'USD');
performance.recordCustomMetric('users.active', activeUsers, 'count');
performance.recordQueryPerformance('complex_query', queryTime);

// Bad: Too many low-value metrics
performance.recordCustomMetric('loop_iteration', i);
```

## Performance Optimization Tips

### 1. Cache Warming
```typescript
// Warm cache on startup
await performance.warmCache([
  'portfolio:summary:*',
  'lending:rates:*',
  'market:data:SEI:*'
], 10); // Priority 10 (highest)
```

### 2. Batch Size Tuning
```typescript
// Monitor and adjust batch sizes
const metrics = performance.getMetrics();
if (metrics.batch.averageProcessingTime > 100) {
  // Reduce batch size
  config.batch.defaultBatchSize = 50;
}
```

### 3. Circuit Breaker Configuration
```typescript
// Configure circuit breaker for external services
const processor = performance.createBatchProcessor(
  'external_api',
  async (requests) => callExternalAPI(requests),
  {
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 30000
    }
  }
);
```

## Troubleshooting

### Low Cache Hit Rate
1. Check cache key generation logic
2. Verify TTL settings are appropriate
3. Enable cache warming for frequently accessed data
4. Monitor eviction rates

### High Response Times
1. Check batch sizes (may be too large)
2. Verify worker pool size is sufficient
3. Look for bottlenecks in monitoring dashboard
4. Consider increasing cache TTL

### Memory Issues
1. Reduce L1 cache size
2. Enable more aggressive eviction
3. Use L3 disk cache for large objects
4. Monitor memory usage trends

## Metrics to Monitor

- **Cache Hit Rate**: Target > 95%
- **Average Response Time**: Target < 50ms
- **Throughput**: Target > 1000 ops/sec
- **Error Rate**: Target < 1%
- **Queue Size**: Should remain stable
- **Memory Usage**: Should be < 80% of limit

## Advanced Features

### Predictive Cache Warming
```typescript
// Enable predictive warming based on access patterns
performance.enablePredictiveWarming({
  threshold: 5, // Warm after 5 accesses
  lookahead: 3600000 // Predict 1 hour ahead
});
```

### Dynamic Batch Sizing
```typescript
// Enable dynamic batch sizing
performance.configureDynamicBatching({
  minSize: 10,
  maxSize: 500,
  targetProcessingTime: 50, // 50ms per batch
  adjustmentFactor: 0.2
});
```

### Custom Alert Rules
```typescript
// Add custom alert rules
performance.addAlertRule({
  name: 'Portfolio Sync Delay',
  metric: 'portfolio.sync_delay',
  threshold: 5000, // 5 seconds
  severity: 'warning',
  action: async (alert) => {
    // Trigger resync
    await resyncPortfolio();
  }
});
```

## Integration with AI Portfolio Manager

```typescript
import { AIPortfolioManagerEnhanced } from '../AIPortfolioManagerEnhanced';

const manager = new AIPortfolioManagerEnhanced({
  network: 'sei-mainnet',
  wallet: wallet,
  aiModel: 'yield-maximizer',
  performance: {
    enableCache: true,
    enableBatching: true,
    enableMonitoring: true,
    cacheSize: 200 * 1024 * 1024,
    batchSize: 100
  }
});

// Start with performance optimization
await manager.start({
  initialCapital: 100000,
  batchTransactions: true,
  rebalanceThreshold: 0.05
});

// Get enhanced status with metrics
const status = await manager.getStatus();
console.log('Cache hit rate:', status.systemMetrics.cache.hitRate);
console.log('Throughput:', status.systemMetrics.batch.throughput);
```

## Monitoring Dashboard Integration

The performance integration can be connected to monitoring dashboards:

1. **Prometheus**: Export metrics in Prometheus format
2. **Grafana**: Pre-built dashboards for visualization
3. **DataDog**: Custom metrics and alerts
4. **New Relic**: APM integration

Example Grafana queries:
```
# Cache hit rate
rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])

# Batch processing throughput
rate(batch_items_processed_total[1m])

# API response time (p95)
histogram_quantile(0.95, rate(api_response_time_bucket[5m]))
```

## Conclusion

The performance integration module provides a comprehensive solution for achieving high throughput and low latency in production systems. By properly configuring and using the caching, batching, and monitoring components, you can achieve:

- >1000 operations per second
- >95% cache hit rate
- <50ms response time for cached data
- Automatic performance optimization
- Real-time bottleneck detection
- Proactive alerting

For additional support or advanced configurations, refer to the individual module documentation or contact the development team.