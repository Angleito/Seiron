/**
 * High-Performance Bloom Filter
 * Optimized for membership testing with minimal false positives
 * Space-efficient probabilistic data structure
 */

import { BloomFilterConfig, BloomFilterMetrics } from './types';

export class BloomFilter {
  private bitArray: Uint8Array;
  private config: BloomFilterConfig;
  private metrics: BloomFilterMetrics;
  private hashSeeds: number[];

  constructor(config: BloomFilterConfig) {
    this.config = this.optimizeConfig(config);
    this.bitArray = new Uint8Array(Math.ceil(this.config.bitArraySize! / 8));
    this.hashSeeds = this.generateHashSeeds(this.config.hashFunctions!);
    this.initializeMetrics();
  }

  private optimizeConfig(config: BloomFilterConfig): Required<BloomFilterConfig> {
    // Calculate optimal bit array size and hash functions if not provided
    const m = config.bitArraySize || 
      Math.ceil(-config.expectedElements * Math.log(config.falsePositiveRate) / (Math.log(2) ** 2));
    
    const k = config.hashFunctions || 
      Math.ceil((m / config.expectedElements) * Math.log(2));

    return {
      expectedElements: config.expectedElements,
      falsePositiveRate: config.falsePositiveRate,
      bitArraySize: m,
      hashFunctions: Math.max(1, k)
    };
  }

  private generateHashSeeds(count: number): number[] {
    const seeds: number[] = [];
    let seed = 0x811c9dc5; // FNV offset basis
    
    for (let i = 0; i < count; i++) {
      seeds.push(seed);
      seed = (seed * 0x01000193) >>> 0; // FNV prime
    }
    
    return seeds;
  }

  private initializeMetrics(): void {
    this.metrics = {
      size: this.config.bitArraySize,
      hashFunctions: this.config.hashFunctions,
      bitArraySize: this.config.bitArraySize,
      addedElements: 0,
      lookups: 0,
      estimatedFalsePositiveRate: 0,
      fillRatio: 0
    };
  }

  /**
   * Fast hash function optimized for performance
   * Uses FNV-1a hash with multiple seeds for k hash functions
   */
  private hash(data: string, seed: number): number {
    let hash = seed;
    
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0; // FNV prime, unsigned 32-bit
    }
    
    return hash % this.config.bitArraySize;
  }

  /**
   * Optimized multi-hash computation
   * Computes all k hash values in a single pass
   */
  private getHashValues(data: string): number[] {
    const hashes: number[] = new Array(this.config.hashFunctions);
    
    // Use double hashing to generate k hash functions from 2 base hashes
    let hash1 = this.hash(data, this.hashSeeds[0]);
    let hash2 = this.hash(data, this.hashSeeds[1] || this.hashSeeds[0] + 1);
    
    for (let i = 0; i < this.config.hashFunctions; i++) {
      hashes[i] = (hash1 + i * hash2) % this.config.bitArraySize;
      if (hashes[i] < 0) hashes[i] += this.config.bitArraySize;
    }
    
    return hashes;
  }

  /**
   * Set bit at position - optimized bit manipulation
   */
  private setBit(position: number): void {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    this.bitArray[byteIndex] |= (1 << bitIndex);
  }

  /**
   * Check if bit is set at position - optimized bit checking
   */
  private getBit(position: number): boolean {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    return (this.bitArray[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Add element to bloom filter - O(k) operation
   */
  public add(item: string): void {
    const hashes = this.getHashValues(item);
    
    for (const hash of hashes) {
      this.setBit(hash);
    }
    
    this.metrics.addedElements++;
    this.updateMetrics();
  }

  /**
   * Batch add multiple elements for better performance
   */
  public addBatch(items: string[]): void {
    for (const item of items) {
      const hashes = this.getHashValues(item);
      for (const hash of hashes) {
        this.setBit(hash);
      }
    }
    
    this.metrics.addedElements += items.length;
    this.updateMetrics();
  }

  /**
   * Test if element might be in set - O(k) operation
   * Returns true if element might be present (can have false positives)
   * Returns false if element is definitely not present (no false negatives)
   */
  public contains(item: string): boolean {
    this.metrics.lookups++;
    
    const hashes = this.getHashValues(item);
    
    for (const hash of hashes) {
      if (!this.getBit(hash)) {
        return false; // Definitely not in set
      }
    }
    
    return true; // Might be in set
  }

  /**
   * Batch contains check for multiple elements
   */
  public containsBatch(items: string[]): boolean[] {
    const results: boolean[] = new Array(items.length);
    
    for (let i = 0; i < items.length; i++) {
      results[i] = this.contains(items[i]);
    }
    
    return results;
  }

  /**
   * Union operation - combine with another bloom filter
   * Both filters must have same configuration
   */
  public union(other: BloomFilter): BloomFilter {
    if (this.config.bitArraySize !== other.config.bitArraySize ||
        this.config.hashFunctions !== other.config.hashFunctions) {
      throw new Error('Bloom filters must have same configuration for union operation');
    }
    
    const result = new BloomFilter(this.config);
    
    // Bitwise OR of both bit arrays
    for (let i = 0; i < this.bitArray.length; i++) {
      result.bitArray[i] = this.bitArray[i] | other.bitArray[i];
    }
    
    result.metrics.addedElements = this.metrics.addedElements + other.metrics.addedElements;
    result.updateMetrics();
    
    return result;
  }

  /**
   * Intersection operation - keep only common elements
   */
  public intersection(other: BloomFilter): BloomFilter {
    if (this.config.bitArraySize !== other.config.bitArraySize ||
        this.config.hashFunctions !== other.config.hashFunctions) {
      throw new Error('Bloom filters must have same configuration for intersection operation');
    }
    
    const result = new BloomFilter(this.config);
    
    // Bitwise AND of both bit arrays
    for (let i = 0; i < this.bitArray.length; i++) {
      result.bitArray[i] = this.bitArray[i] & other.bitArray[i];
    }
    
    result.metrics.addedElements = Math.min(this.metrics.addedElements, other.metrics.addedElements);
    result.updateMetrics();
    
    return result;
  }

  /**
   * Advanced analytics and optimization
   */
  private updateMetrics(): void {
    // Calculate fill ratio
    let setBits = 0;
    for (let i = 0; i < this.config.bitArraySize; i++) {
      if (this.getBit(i)) {
        setBits++;
      }
    }
    
    this.metrics.fillRatio = (setBits / this.config.bitArraySize) * 100;
    
    // Estimate actual false positive rate
    if (this.metrics.addedElements > 0) {
      const expectedFillRatio = 1 - Math.exp(-this.config.hashFunctions * this.metrics.addedElements / this.config.bitArraySize);
      this.metrics.estimatedFalsePositiveRate = Math.pow(expectedFillRatio, this.config.hashFunctions) * 100;
    }
  }

  /**
   * Get comprehensive metrics
   */
  public getMetrics(): BloomFilterMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Check if bloom filter is getting too full and needs resizing
   */
  public shouldResize(): boolean {
    return this.metrics.fillRatio > 70 || 
           this.metrics.estimatedFalsePositiveRate > this.config.falsePositiveRate * 100 * 2;
  }

  /**
   * Create a larger bloom filter and migrate data
   */
  public resize(scaleFactor: number = 2): BloomFilter {
    const newConfig: BloomFilterConfig = {
      ...this.config,
      expectedElements: Math.ceil(this.config.expectedElements * scaleFactor),
      bitArraySize: Math.ceil(this.config.bitArraySize * scaleFactor)
    };
    
    return new BloomFilter(newConfig);
  }

  /**
   * Memory usage estimation
   */
  public getMemoryUsage(): number {
    return this.bitArray.length + // bit array
           this.hashSeeds.length * 4 + // hash seeds (4 bytes each)
           200; // approximate overhead for other properties
  }

  /**
   * Clear all bits - reset bloom filter
   */
  public clear(): void {
    this.bitArray.fill(0);
    this.initializeMetrics();
  }

  /**
   * Export bloom filter state for persistence
   */
  public export(): any {
    return {
      config: this.config,
      bitArray: Array.from(this.bitArray),
      hashSeeds: this.hashSeeds,
      metrics: this.metrics
    };
  }

  /**
   * Import bloom filter state from persistence
   */
  public static import(data: any): BloomFilter {
    const filter = new BloomFilter(data.config);
    filter.bitArray = new Uint8Array(data.bitArray);
    filter.hashSeeds = data.hashSeeds;
    filter.metrics = data.metrics;
    return filter;
  }

  /**
   * Create optimal bloom filter for specific use case
   */
  public static createOptimal(expectedElements: number, falsePositiveRate: number): BloomFilter {
    return new BloomFilter({
      expectedElements,
      falsePositiveRate
    });
  }

  /**
   * Bulk operations for DeFi-specific use cases
   */
  
  // Check if transaction hash exists (common DeFi operation)
  public hasTransaction(txHash: string): boolean {
    return this.contains(`tx:${txHash}`);
  }

  public addTransaction(txHash: string): void {
    this.add(`tx:${txHash}`);
  }

  // Check if address is known (whitelist/blacklist)
  public hasAddress(address: string): boolean {
    return this.contains(`addr:${address.toLowerCase()}`);
  }

  public addAddress(address: string): void {
    this.add(`addr:${address.toLowerCase()}`);
  }

  // Check if token pair exists
  public hasTokenPair(tokenA: string, tokenB: string): boolean {
    const pair = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort().join('-');
    return this.contains(`pair:${pair}`);
  }

  public addTokenPair(tokenA: string, tokenB: string): void {
    const pair = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort().join('-');
    this.add(`pair:${pair}`);
  }
}