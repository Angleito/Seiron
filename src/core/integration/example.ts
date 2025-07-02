/**
 * Performance Integration Examples
 * Demonstrates how to integrate caching, batching, and monitoring
 */

import { createPerformanceIntegration } from './PerformanceIntegration';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';

async function main() {
  // Initialize performance integration
  const performance = createPerformanceIntegration({
    cache: {
      enabled: true,
      l1MaxSize: 50 * 1024 * 1024, // 50MB
      warmingEnabled: true
    },
    batch: {
      enabled: true,
      workerPoolSize: 4,
      defaultBatchSize: 50
    },
    monitoring: {
      enabled: true,
      alertsEnabled: true
    }
  });

  await performance.initialize();

  // Example 1: Cache API endpoints
  const getBalanceEndpoint = performance.wrapEndpointWithCache(
    'getBalance',
    async (address: string) => {
      // Simulate API call
      console.log(`Fetching balance for ${address}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        sei: '1000',
        usdc: '5000',
        atom: '100'
      };
    },
    {
      ttl: 60000, // Cache for 1 minute
      keyGenerator: (address) => `balance:${address}`
    }
  );

  // First call - cache miss
  console.time('First call');
  const balance1 = await getBalanceEndpoint('sei1abc...');
  console.timeEnd('First call');

  // Second call - cache hit (should be instant)
  console.time('Second call');
  const balance2 = await getBalanceEndpoint('sei1abc...');
  console.timeEnd('Second call');

  // Example 2: Batch blockchain transactions
  const blockchainProcessor = performance.createBatchProcessor(
    'blockchain_processor',
    async (transactions) => {
      console.log(`Processing batch of ${transactions.length} transactions`);
      
      // Simulate batch processing
      return transactions.map(tx => ({
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        status: 'success',
        gasUsed: 50000
      }));
    },
    {
      timeout: 30000,
      retryable: true
    }
  );

  // Submit transactions for batch processing
  const transactions = Array.from({ length: 100 }, (_, i) => ({
    from: `sei1sender${i}`,
    to: `sei1receiver${i}`,
    amount: 100,
    type: i % 2 === 0 ? 'transfer' : 'swap'
  }));

  const jobId = await performance.submitBatchJob(
    transactions,
    blockchainProcessor,
    {
      priority: 8,
      batchSize: 25,
      progressCallback: (progress) => {
        console.log(`Progress: ${progress.percentage.toFixed(2)}% (${progress.processedItems}/${progress.totalItems})`);
      }
    }
  );

  console.log(`Batch job submitted: ${jobId}`);

  // Example 3: DeFi operation caching with monitoring
  const getLendingRates = performance.wrapEndpointWithCache(
    'getLendingRates',
    async (protocol: string) => {
      const start = performance.now();
      
      // Simulate fetching rates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const rates = {
        sei: { supply: 5.2, borrow: 8.1 },
        usdc: { supply: 3.8, borrow: 6.2 },
        atom: { supply: 7.5, borrow: 10.3 }
      };

      // Record query performance
      performance.recordQueryPerformance(
        `SELECT rates FROM ${protocol}`,
        performance.now() - start
      );

      return rates;
    },
    {
      ttl: 300000, // 5 minutes
      keyGenerator: (protocol) => `lending:rates:${protocol}`,
      shouldCache: (protocol) => protocol !== 'test' // Don't cache test protocol
    }
  );

  // Example 4: Portfolio operations with batching
  const portfolioUpdater = performance.createBatchProcessor(
    'portfolio_updater',
    async (updates) => {
      // Group by operation type
      const grouped = updates.reduce((acc, update) => {
        const type = update.operation;
        if (!acc[type]) acc[type] = [];
        acc[type].push(update);
        return acc;
      }, {} as Record<string, any[]>);

      const results = [];
      
      // Process each group
      for (const [operation, items] of Object.entries(grouped)) {
        console.log(`Processing ${items.length} ${operation} operations`);
        
        if (operation === 'rebalance') {
          // Batch rebalancing operations
          results.push(...await batchRebalance(items));
        } else if (operation === 'compound') {
          // Batch compound operations
          results.push(...await batchCompound(items));
        }
      }

      return results;
    }
  );

  // Submit portfolio updates
  const portfolioUpdates = [
    { operation: 'rebalance', portfolio: 'sei1xyz...', target: { sei: 0.4, usdc: 0.6 } },
    { operation: 'compound', protocol: 'yei-finance', position: 'sei-usdc' },
    { operation: 'rebalance', portfolio: 'sei1abc...', target: { sei: 0.5, atom: 0.5 } }
  ];

  await performance.submitBatchJob(portfolioUpdates, portfolioUpdater, {
    priority: 5,
    batchSize: 10
  });

  // Example 5: Real-time monitoring
  performance.recordCustomMetric('portfolio.total_value', 50000, 'USD');
  performance.recordCustomMetric('defi.tvl', 1000000, 'USD');
  performance.recordCustomMetric('gas.average_price', 0.025, 'SEI');

  // Simulate API calls with monitoring
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const success = Math.random() > 0.1; // 90% success rate
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    performance.recordApiCall('/api/v1/positions', performance.now() - start, success);
  }

  // Get performance report
  setTimeout(async () => {
    const report = performance.generatePerformanceReport();
    console.log('\n=== Performance Report ===');
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
    console.log(`Uptime: ${(report.summary.uptime / 3600).toFixed(2)} hours`);
    
    console.log('\nBottlenecks:');
    report.bottlenecks.forEach(b => {
      console.log(`- ${b.component}: ${b.rootCause} (${b.impact})`);
      console.log(`  Recommendation: ${b.recommendation}`);
    });

    // Get current metrics
    const metrics = performance.getMetrics();
    console.log('\n=== Current Metrics ===');
    console.log('Cache:', {
      hitRate: metrics.cache?.overall.hitRate.toFixed(2) + '%',
      keys: metrics.cache?.overall.keyCount,
      memory: metrics.cache?.overall.memoryUsage.toFixed(2) + 'MB'
    });
    console.log('Batch:', {
      throughput: metrics.batch?.throughput.toFixed(2) + ' ops/sec',
      queueSize: metrics.batch?.queueSize,
      errorRate: metrics.batch?.errorRate.toFixed(2) + '%'
    });

    // Shutdown
    await performance.shutdown();
  }, 5000);
}

// Helper functions
async function batchRebalance(items: any[]): Promise<any[]> {
  // Simulate batch rebalancing
  return items.map(item => ({
    portfolio: item.portfolio,
    status: 'rebalanced',
    gasUsed: 100000
  }));
}

async function batchCompound(items: any[]): Promise<any[]> {
  // Simulate batch compounding
  return items.map(item => ({
    protocol: item.protocol,
    position: item.position,
    status: 'compounded',
    earned: Math.random() * 100
  }));
}

// Run example
main().catch(console.error);