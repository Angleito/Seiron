/**
 * High-Performance Data Structures - Export Module
 * Optimized implementations for DeFi operations
 */

export { RingBuffer } from './RingBuffer';
export { BloomFilter } from './BloomFilter';
export { OptimizedLRU } from './OptimizedLRU';
export * from './types';

// Factory functions for common DeFi use cases
export const createPriceBuffer = (capacity: number = 1000) => {
  return new RingBuffer({
    capacity,
    overwriteOnFull: true,
    trackMetrics: true
  });
};

export const createTransactionFilter = (expectedTxCount: number = 100000) => {
  return new BloomFilter({
    expectedElements: expectedTxCount,
    falsePositiveRate: 0.01 // 1% false positive rate
  });
};

export const createTokenCache = <V>(maxSize: number = 1000) => {
  return new OptimizedLRU<string, V>({
    maxSize,
    ttl: 300000, // 5 minutes
    sizeCalculator: (key, value) => {
      return JSON.stringify({ key, value }).length * 2; // Rough UTF-16 size
    }
  });
};

// Configuration presets for different performance profiles
export const PERFORMANCE_CONFIGS = {
  HIGH_FREQUENCY_TRADING: {
    ringBuffer: {
      capacity: 10000,
      overwriteOnFull: true,
      trackMetrics: true
    },
    bloomFilter: {
      expectedElements: 1000000,
      falsePositiveRate: 0.001
    },
    lruCache: {
      maxSize: 50000,
      ttl: 60000 // 1 minute
    }
  },
  
  ANALYTICS: {
    ringBuffer: {
      capacity: 100000,
      overwriteOnFull: false,
      trackMetrics: true
    },
    bloomFilter: {
      expectedElements: 10000000,
      falsePositiveRate: 0.01
    },
    lruCache: {
      maxSize: 10000,
      ttl: 3600000 // 1 hour
    }
  },
  
  MEMORY_CONSTRAINED: {
    ringBuffer: {
      capacity: 1000,
      overwriteOnFull: true,
      trackMetrics: false
    },
    bloomFilter: {
      expectedElements: 10000,
      falsePositiveRate: 0.05
    },
    lruCache: {
      maxSize: 500,
      ttl: 300000 // 5 minutes
    }
  }
};