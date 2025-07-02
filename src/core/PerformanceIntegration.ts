import { SmartCache } from './cache/SmartCache';
import { BatchProcessor } from './batch/BatchProcessor';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { PerformanceConfig } from './types';

/**
 * Central performance integration module
 */
export class PerformanceIntegration {
  private cache: SmartCache;
  private monitor: PerformanceMonitor;
  private processors: Map<string, BatchProcessor> = new Map();
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
    
    // Initialize components
    this.cache = new SmartCache(config.cache);
    this.monitor = new PerformanceMonitor(config.monitoring);
    
    // Set up cache monitoring
    this.setupCacheMonitoring();
  }

  /**
   * Wrap an endpoint with caching
   */
  wrapEndpointWithCache<T>(
    endpoint: string,
    handler: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): () => Promise<T> {
    return async () => {
      const cacheKey = `endpoint:${endpoint}`;
      
      // Try cache first
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        this.monitor.recordCacheHit(endpoint);
        return cached;
      }
      
      // Cache miss - execute handler
      this.monitor.recordCacheMiss(endpoint);
      const result = await handler();
      
      // Store in cache
      await this.cache.set(cacheKey, result, options.ttl, options.tags);
      
      return result;
    };
  }

  /**
   * Create a batch processor
   */
  createBatchProcessor<T, R>(
    name: string,
    handler: (items: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      timeout?: number;
      retryable?: boolean;
    } = {}
  ): BatchProcessor {
    const processor = new BatchProcessor({
      name,
      handler,
      batchSize: options.batchSize || this.config.batchProcessing.defaultBatchSize,
      maxDelay: options.timeout || this.config.batchProcessing.maxBatchDelay,
      monitoring: {
        onBatchStart: (size) => this.monitor.recordBatchStart(name, size),
        onBatchComplete: (size, duration) => this.monitor.recordBatchComplete(name, size, duration),
        onBatchError: (error) => this.monitor.recordBatchError(name, error)
      }
    });
    
    processor.start();
    this.processors.set(name, processor);
    
    return processor;
  }

  /**
   * Record API call metrics
   */
  recordApiCall(endpoint: string, responseTime: number, success: boolean): void {
    this.monitor.recordApiCall(endpoint, responseTime, success);
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(name: string, value: number, unit: string): void {
    this.monitor.recordCustomMetric(name, value, unit);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      size: this.cache.getSize(),
      hitRate: this.monitor.getCacheHitRate(),
      stats: this.cache.getStats()
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): any {
    return this.monitor.getMetrics();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.monitor.startCollecting();
    
    // Set up periodic cache cleanup
    setInterval(() => {
      this.cache.cleanup();
    }, this.config.cache.cleanupInterval || 300000); // 5 minutes default
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.monitor.stopCollecting();
    
    // Stop all batch processors
    for (const processor of this.processors.values()) {
      processor.stop();
    }
  }

  /**
   * Set up cache monitoring
   */
  private setupCacheMonitoring(): void {
    // Monitor cache operations
    const originalGet = this.cache.get.bind(this.cache);
    this.cache.get = async (key: string) => {
      const startTime = Date.now();
      const result = await originalGet(key);
      
      this.monitor.recordCacheOperation('get', Date.now() - startTime);
      return result;
    };
    
    const originalSet = this.cache.set.bind(this.cache);
    this.cache.set = async (key: string, value: any, ttl?: number, tags?: string[]) => {
      const startTime = Date.now();
      await originalSet(key, value, ttl, tags);
      
      this.monitor.recordCacheOperation('set', Date.now() - startTime);
    };
  }

  /**
   * Warm cache with predictive data
   */
  async warmCache(patterns: Array<{ key: string; loader: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`Warming cache with ${patterns.length} patterns...`);
    
    const warmingPromises = patterns.map(async ({ key, loader, ttl }) => {
      try {
        const data = await loader();
        await this.cache.set(key, data, ttl);
        console.log(`Warmed cache key: ${key}`);
      } catch (error) {
        console.error(`Failed to warm cache key ${key}:`, error);
      }
    });
    
    await Promise.all(warmingPromises);
    console.log('Cache warming complete');
  }

  /**
   * Get batch processor by name
   */
  getBatchProcessor(name: string): BatchProcessor | undefined {
    return this.processors.get(name);
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    console.log('All caches cleared');
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const metrics = this.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Import cache configuration
   */
  updateCacheConfig(newConfig: Partial<typeof this.config.cache>): void {
    Object.assign(this.config.cache, newConfig);
    
    // Reinitialize cache with new config
    this.cache = new SmartCache(this.config.cache);
    this.setupCacheMonitoring();
  }
}