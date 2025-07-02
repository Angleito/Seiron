/**
 * Performance Benchmarks and Examples
 * Demonstrates the performance improvements of the core modules
 */

import { 
  PerformanceSuite, 
  createOptimalPerformanceSuite,
  SmartCacheManager,
  BatchProcessingEngine,
  RingBuffer,
  BloomFilter,
  OptimizedLRU,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_BATCH_CONFIG
} from './index';

interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  operationsPerSecond: number;
  memoryUsage: number;
  details?: Record<string, any>;
}

export class PerformanceBenchmarks {
  private suite: PerformanceSuite;

  constructor() {
    this.suite = createOptimalPerformanceSuite('analytics');
  }

  /**
   * Run comprehensive benchmarks
   */
  public async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting Performance Benchmarks...\n');
    
    const results: BenchmarkResult[] = [];
    
    // Cache benchmarks
    results.push(await this.benchmarkCacheOperations());
    results.push(await this.benchmarkCacheHitRates());
    
    // Batch processing benchmarks
    results.push(await this.benchmarkBatchProcessing());
    results.push(await this.benchmarkConcurrentBatches());
    
    // Data structure benchmarks
    results.push(await this.benchmarkRingBuffer());
    results.push(await this.benchmarkBloomFilter());
    results.push(await this.benchmarkLRUCache());
    
    // Real-world scenario benchmarks
    results.push(await this.benchmarkDeFiPriceUpdates());
    results.push(await this.benchmarkTransactionProcessing());
    
    this.printBenchmarkResults(results);
    return results;
  }

  /**
   * Cache operations benchmark
   */
  private async benchmarkCacheOperations(): Promise<BenchmarkResult> {
    const cache = new SmartCacheManager(DEFAULT_CACHE_CONFIG);
    const operations = 100000;
    const startMemory = process.memoryUsage().heapUsed;
    
    console.log('📊 Benchmarking Cache Operations...');
    const startTime = performance.now();
    
    // Warm up cache with test data
    for (let i = 0; i < operations / 10; i++) {
      await cache.set(`warmup:${i}`, { data: `value_${i}`, timestamp: Date.now() });
    }
    
    // Benchmark mixed operations (70% reads, 30% writes)
    for (let i = 0; i < operations; i++) {
      if (Math.random() < 0.7) {
        // Read operation
        await cache.get(`warmup:${Math.floor(Math.random() * (operations / 10))}`);
      } else {
        // Write operation
        await cache.set(`test:${i}`, { 
          price: Math.random() * 1000,
          volume: Math.random() * 10000,
          timestamp: Date.now()
        });
      }
    }
    
    const duration = performance.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const metrics = cache.getMetrics();
    
    await cache.destroy();
    
    return {
      name: 'Cache Operations (Mixed)',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: (endMemory - startMemory) / (1024 * 1024), // MB
      details: {
        hitRate: metrics.overall.hitRate,
        keyCount: metrics.overall.keyCount,
        averageLatency: metrics.overall.averageLatency
      }
    };
  }

  /**
   * Cache hit rate optimization benchmark
   */
  private async benchmarkCacheHitRates(): Promise<BenchmarkResult> {
    const cache = new SmartCacheManager({
      ...DEFAULT_CACHE_CONFIG,
      warming: { ...DEFAULT_CACHE_CONFIG.warming, enabled: true }
    });
    
    console.log('🎯 Benchmarking Cache Hit Rate Optimization...');
    
    // Simulate realistic access patterns
    const keys = Array.from({ length: 1000 }, (_, i) => `token:${i}`);
    const hotKeys = keys.slice(0, 100); // 10% hot keys
    const operations = 50000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < operations; i++) {
      const isHotKey = Math.random() < 0.8; // 80% access to hot keys
      const key = isHotKey 
        ? hotKeys[Math.floor(Math.random() * hotKeys.length)]
        : keys[Math.floor(Math.random() * keys.length)];
      
      let value = await cache.get(key);
      if (!value) {
        // Cache miss - fetch and store
        value = {
          symbol: key.split(':')[1],
          price: Math.random() * 1000,
          volume: Math.random() * 10000,
          lastUpdate: Date.now()
        };
        await cache.set(key, value);
      }
    }
    
    const duration = performance.now() - startTime;
    const metrics = cache.getMetrics();
    
    await cache.destroy();
    
    return {
      name: 'Cache Hit Rate Optimization',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: metrics.overall.memoryUsage,
      details: {
        hitRate: metrics.overall.hitRate,
        l1HitRate: metrics.l1.hitRate,
        l2HitRate: metrics.l2.hitRate,
        predictiveWarming: true
      }
    };
  }

  /**
   * Batch processing benchmark
   */
  private async benchmarkBatchProcessing(): Promise<BenchmarkResult> {
    const batchEngine = new BatchProcessingEngine(DEFAULT_BATCH_CONFIG);
    
    console.log('⚡ Benchmarking Batch Processing...');
    
    const operations = 10000;
    const batchSize = 100;
    const batches = Math.ceil(operations / batchSize);
    
    // Create test processor
    const processor = {
      name: 'price_calculation',
      process: async (items: any[]) => {
        // Simulate computation-heavy operation
        return items.map(item => ({
          ...item,
          calculated: Math.sqrt(item.value * item.multiplier),
          processed: true
        }));
      },
      maxBatchSize: batchSize,
      timeout: 5000,
      retryable: true
    };
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Submit batches
    const jobPromises = [];
    for (let i = 0; i < batches; i++) {
      const items = Array.from({ length: batchSize }, (_, j) => ({
        id: i * batchSize + j,
        value: Math.random() * 100,
        multiplier: Math.random() * 10
      }));
      
      jobPromises.push(batchEngine.submitJob(items, processor));
    }
    
    // Wait for all jobs to complete
    await Promise.all(jobPromises);
    
    const duration = performance.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const metrics = batchEngine.getMetrics();
    
    await batchEngine.shutdown();
    
    return {
      name: 'Batch Processing',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: (endMemory - startMemory) / (1024 * 1024),
      details: {
        throughput: metrics.throughput,
        completedJobs: metrics.completedJobs,
        averageProcessingTime: metrics.averageProcessingTime,
        errorRate: metrics.errorRate
      }
    };
  }

  /**
   * Concurrent batch processing benchmark
   */
  private async benchmarkConcurrentBatches(): Promise<BenchmarkResult> {
    const batchEngine = new BatchProcessingEngine({
      ...DEFAULT_BATCH_CONFIG,
      maxConcurrentJobs: 20,
      workerPoolSize: 16
    });
    
    console.log('🔄 Benchmarking Concurrent Batch Processing...');
    
    const operations = 50000;
    const concurrentBatches = 50;
    const itemsPerBatch = operations / concurrentBatches;
    
    const processor = {
      name: 'concurrent_processor',
      process: async (items: any[]) => {
        // Simulate I/O intensive operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return items.map(item => ({ ...item, processed: Date.now() }));
      },
      maxBatchSize: itemsPerBatch,
      timeout: 10000,
      retryable: true
    };
    
    const startTime = performance.now();
    
    // Submit concurrent batches
    const jobPromises = Array.from({ length: concurrentBatches }, (_, i) => {
      const items = Array.from({ length: itemsPerBatch }, (_, j) => ({
        batchId: i,
        itemId: j,
        data: Math.random()
      }));
      
      return batchEngine.submitJob(items, processor, { priority: Math.floor(Math.random() * 10) });
    });
    
    await Promise.all(jobPromises);
    
    const duration = performance.now() - startTime;
    const metrics = batchEngine.getMetrics();
    
    await batchEngine.shutdown();
    
    return {
      name: 'Concurrent Batch Processing',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: metrics.memoryUsage,
      details: {
        concurrentBatches,
        throughput: metrics.throughput,
        queueProcessingLatency: duration / concurrentBatches
      }
    };
  }

  /**
   * Ring buffer benchmark for time-series data
   */
  private async benchmarkRingBuffer(): Promise<BenchmarkResult> {
    const capacity = 10000;
    const buffer = new RingBuffer({
      capacity,
      overwriteOnFull: true,
      trackMetrics: true
    });
    
    console.log('🔄 Benchmarking Ring Buffer Operations...');
    
    const operations = 100000;
    const startTime = performance.now();
    
    // Simulate high-frequency price updates
    for (let i = 0; i < operations; i++) {
      buffer.push({
        timestamp: Date.now(),
        value: Math.random() * 1000,
        volume: Math.random() * 10000
      });
      
      if (i % 1000 === 0) {
        // Periodic reads (moving averages, analytics)
        buffer.getLatest(100);
        buffer.movingAverage(50, (item: any) => item.value);
      }
    }
    
    const duration = performance.now() - startTime;
    const metrics = buffer.getMetrics();
    
    return {
      name: 'Ring Buffer (Time-Series)',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: buffer.getSize() * 100 / (1024 * 1024), // Rough estimate
      details: {
        capacity,
        utilization: buffer.getUtilization(),
        overflows: metrics.overflows
      }
    };
  }

  /**
   * Bloom filter benchmark for membership testing
   */
  private async benchmarkBloomFilter(): Promise<BenchmarkResult> {
    const filter = new BloomFilter({
      expectedElements: 1000000,
      falsePositiveRate: 0.01
    });
    
    console.log('🌸 Benchmarking Bloom Filter Operations...');
    
    const operations = 500000;
    const addOperations = operations * 0.3; // 30% adds
    const checkOperations = operations * 0.7; // 70% checks
    
    const startTime = performance.now();
    
    // Add elements
    const addedElements = [];
    for (let i = 0; i < addOperations; i++) {
      const element = `tx:${i}:${Math.random().toString(36)}`;
      filter.add(element);
      addedElements.push(element);
    }
    
    // Check membership (mix of existing and non-existing)
    let hits = 0;
    for (let i = 0; i < checkOperations; i++) {
      const isExisting = Math.random() < 0.5;
      const element = isExisting
        ? addedElements[Math.floor(Math.random() * addedElements.length)]
        : `nonexistent:${i}`;
      
      if (filter.contains(element)) {
        hits++;
      }
    }
    
    const duration = performance.now() - startTime;
    const metrics = filter.getMetrics();
    
    return {
      name: 'Bloom Filter (Membership)',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: filter.getMemoryUsage() / (1024 * 1024),
      details: {
        fillRatio: metrics.fillRatio,
        estimatedFalsePositiveRate: metrics.estimatedFalsePositiveRate,
        hits,
        expectedHits: addOperations * 0.5 + checkOperations * 0.5 * 0.01 // Rough estimate
      }
    };
  }

  /**
   * LRU cache benchmark
   */
  private async benchmarkLRUCache(): Promise<BenchmarkResult> {
    const cache = new OptimizedLRU({
      maxSize: 10000,
      ttl: 300000, // 5 minutes
      sizeCalculator: (key, value) => JSON.stringify({ key, value }).length
    });
    
    console.log('💾 Benchmarking LRU Cache Operations...');
    
    const operations = 100000;
    const keySpace = 50000; // Larger than cache size to test eviction
    
    const startTime = performance.now();
    
    for (let i = 0; i < operations; i++) {
      const operation = Math.random();
      const key = `key:${Math.floor(Math.random() * keySpace)}`;
      
      if (operation < 0.7) {
        // 70% reads
        cache.get(key);
      } else if (operation < 0.95) {
        // 25% writes
        cache.set(key, {
          data: `value_${i}`,
          timestamp: Date.now(),
          metadata: { operation: i }
        });
      } else {
        // 5% deletes
        cache.delete(key);
      }
    }
    
    const duration = performance.now() - startTime;
    const metrics = cache.getMetrics();
    
    cache.destroy();
    
    return {
      name: 'LRU Cache Operations',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: metrics.memoryUsage / (1024 * 1024),
      details: {
        hitRate: metrics.hitRate,
        evictions: metrics.evictions,
        size: metrics.size,
        averageAccessCount: metrics.averageAccessCount
      }
    };
  }

  /**
   * Real-world DeFi price updates benchmark
   */
  private async benchmarkDeFiPriceUpdates(): Promise<BenchmarkResult> {
    console.log('💰 Benchmarking DeFi Price Updates Scenario...');
    
    const priceBuffer = new RingBuffer({ capacity: 50000, overwriteOnFull: true, trackMetrics: true });
    const priceCache = new OptimizedLRU({ maxSize: 1000, ttl: 60000 });
    const seenPairs = new BloomFilter({ expectedElements: 10000, falsePositiveRate: 0.01 });
    
    const operations = 100000;
    const tokenPairs = ['ETH/USDC', 'BTC/USDT', 'SEI/USDC', 'ATOM/ETH', 'SOL/USDC'];
    
    const startTime = performance.now();
    
    for (let i = 0; i < operations; i++) {
      const pair = tokenPairs[Math.floor(Math.random() * tokenPairs.length)];
      const price = Math.random() * 10000;
      const volume = Math.random() * 1000000;
      const timestamp = Date.now();
      
      // Check if we've seen this pair before (Bloom filter)
      if (!seenPairs.contains(pair)) {
        seenPairs.add(pair);
      }
      
      // Store in price buffer for analytics
      priceBuffer.push({ pair, price, volume, timestamp });
      
      // Cache latest price for fast access
      priceCache.set(pair, { price, volume, timestamp });
      
      // Simulate price queries (90% of time we query existing pairs)
      if (Math.random() < 0.9) {
        const queryPair = tokenPairs[Math.floor(Math.random() * tokenPairs.length)];
        priceCache.get(queryPair);
        
        // Get price history for analytics
        if (i % 100 === 0) {
          priceBuffer.filter((item: any) => item.pair === queryPair);
        }
      }
    }
    
    const duration = performance.now() - startTime;
    
    return {
      name: 'DeFi Price Updates (Real-world)',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: (priceBuffer.getSize() * 100 + priceCache.getMemoryUsage() + seenPairs.getMemoryUsage()) / (1024 * 1024),
      details: {
        priceBufferUtilization: priceBuffer.getUtilization(),
        cacheHitRate: priceCache.getMetrics().hitRate,
        uniquePairsDetected: seenPairs.getMetrics().addedElements,
        avgPriceQueryLatency: duration / (operations * 0.9)
      }
    };
  }

  /**
   * Transaction processing benchmark
   */
  private async benchmarkTransactionProcessing(): Promise<BenchmarkResult> {
    console.log('🔗 Benchmarking Transaction Processing Scenario...');
    
    const batchEngine = new BatchProcessingEngine({
      ...DEFAULT_BATCH_CONFIG,
      maxConcurrentJobs: 10,
      defaultBatchSize: 50
    });
    
    const txFilter = new BloomFilter({ expectedElements: 100000, falsePositiveRate: 0.001 });
    
    const operations = 25000;
    const batchSize = 50;
    const batches = Math.ceil(operations / batchSize);
    
    // Transaction processor
    const txProcessor = {
      name: 'transaction_validator',
      process: async (transactions: any[]) => {
        return transactions.map(tx => {
          // Simulate validation logic
          const isValid = Math.random() > 0.05; // 95% valid transactions
          const gasUsed = Math.floor(Math.random() * 100000);
          
          return {
            ...tx,
            valid: isValid,
            gasUsed,
            processedAt: Date.now()
          };
        });
      },
      maxBatchSize: batchSize,
      timeout: 5000,
      retryable: true
    };
    
    const startTime = performance.now();
    
    // Submit transaction batches
    const jobPromises = [];
    for (let i = 0; i < batches; i++) {
      const transactions = Array.from({ length: batchSize }, (_, j) => {
        const tx = {
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          from: `0x${Math.random().toString(16).substr(2, 40)}`,
          to: `0x${Math.random().toString(16).substr(2, 40)}`,
          value: Math.floor(Math.random() * 1000000),
          gasPrice: Math.floor(Math.random() * 100),
          nonce: i * batchSize + j
        };
        
        // Check for duplicate transactions
        if (!txFilter.contains(tx.hash)) {
          txFilter.add(tx.hash);
        }
        
        return tx;
      });
      
      jobPromises.push(batchEngine.submitJob(transactions, txProcessor));
    }
    
    await Promise.all(jobPromises);
    
    const duration = performance.now() - startTime;
    const batchMetrics = batchEngine.getMetrics();
    
    await batchEngine.shutdown();
    
    return {
      name: 'Transaction Processing (DeFi)',
      operations,
      duration,
      operationsPerSecond: operations / (duration / 1000),
      memoryUsage: batchMetrics.memoryUsage,
      details: {
        batchThroughput: batchMetrics.throughput,
        duplicateDetection: txFilter.getMetrics().addedElements < operations,
        averageBatchTime: batchMetrics.averageProcessingTime,
        successRate: (1 - batchMetrics.errorRate / 100) * 100
      }
    };
  }

  /**
   * Print formatted benchmark results
   */
  private printBenchmarkResults(results: BenchmarkResult[]): void {
    console.log('\n🏆 Performance Benchmark Results\n');
    console.log('='.repeat(80));
    
    results.forEach(result => {
      console.log(`\n📊 ${result.name}`);
      console.log('-'.repeat(50));
      console.log(`Operations:        ${result.operations.toLocaleString()}`);
      console.log(`Duration:          ${result.duration.toFixed(2)}ms`);
      console.log(`Ops/second:        ${Math.round(result.operationsPerSecond).toLocaleString()}`);
      console.log(`Memory Usage:      ${result.memoryUsage.toFixed(2)}MB`);
      
      if (result.details) {
        console.log(`Details:`);
        Object.entries(result.details).forEach(([key, value]) => {
          const formattedValue = typeof value === 'number' ? 
            (value % 1 === 0 ? value.toLocaleString() : value.toFixed(2)) : 
            value;
          console.log(`  ${key}: ${formattedValue}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Summary statistics
    const totalOps = results.reduce((sum, r) => sum + r.operations, 0);
    const avgOpsPerSec = results.reduce((sum, r) => sum + r.operationsPerSecond, 0) / results.length;
    const totalMemory = results.reduce((sum, r) => sum + r.memoryUsage, 0);
    
    console.log(`\n📈 Summary:`);
    console.log(`Total Operations:   ${totalOps.toLocaleString()}`);
    console.log(`Avg Ops/second:     ${Math.round(avgOpsPerSec).toLocaleString()}`);
    console.log(`Total Memory:       ${totalMemory.toFixed(2)}MB`);
    console.log(`Benchmarks:         ${results.length}`);
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.suite.shutdown();
  }
}

// Export for running benchmarks
export const runBenchmarks = async (): Promise<BenchmarkResult[]> => {
  const benchmarks = new PerformanceBenchmarks();
  
  try {
    const results = await benchmarks.runAllBenchmarks();
    return results;
  } finally {
    await benchmarks.cleanup();
  }
};