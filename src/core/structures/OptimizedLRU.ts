/**
 * High-Performance LRU Cache with O(1) Operations
 * Optimized for DeFi applications with custom size calculation and TTL support
 */

import { LRUCacheConfig, LRUNode, LRUMetrics } from './types';

export class OptimizedLRU<K, V> {
  private capacity: number;
  private size: number = 0;
  private map: Map<K, LRUNode<K, V>> = new Map();
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private config: LRUCacheConfig<K, V>;
  private metrics: LRUMetrics;
  private ttlTimer: NodeJS.Timeout | null = null;
  private totalSize: number = 0;

  constructor(config: LRUCacheConfig<K, V>) {
    this.config = config;
    this.capacity = config.maxSize;
    this.initializeMetrics();
    
    if (config.ttl) {
      this.startTTLCleanup();
    }
  }

  private initializeMetrics(): void {
    this.metrics = {
      size: 0,
      maxSize: this.capacity,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsage: 0,
      averageAccessCount: 0
    };
  }

  /**
   * Get value with O(1) complexity
   * Updates access time and moves to front
   */
  public get(key: K): V | null {
    const node = this.map.get(key);
    
    if (!node) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL expiration
    if (this.config.ttl && Date.now() - node.timestamp > this.config.ttl) {
      this.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access metrics
    node.accessCount++;
    node.timestamp = Date.now();
    this.metrics.hits++;
    this.updateHitRate();

    // Move to front (most recently used)
    this.moveToFront(node);
    
    return node.value;
  }

  /**
   * Set value with O(1) complexity
   * Handles eviction and size management
   */
  public set(key: K, value: V): void {
    const existingNode = this.map.get(key);
    const nodeSize = this.calculateNodeSize(key, value);
    
    if (existingNode) {
      // Update existing node
      const oldSize = existingNode.size;
      existingNode.value = value;
      existingNode.timestamp = Date.now();
      existingNode.accessCount++;
      existingNode.size = nodeSize;
      
      this.totalSize = this.totalSize - oldSize + nodeSize;
      this.moveToFront(existingNode);
    } else {
      // Create new node
      const newNode: LRUNode<K, V> = {
        key,
        value,
        prev: null,
        next: null,
        timestamp: Date.now(),
        accessCount: 1,
        size: nodeSize
      };

      // Check if we need to evict before adding
      while (this.size >= this.capacity || 
             (this.config.sizeCalculator && this.totalSize + nodeSize > this.getMaxMemory())) {
        this.evictLRU();
      }

      this.map.set(key, newNode);
      this.addToFront(newNode);
      this.size++;
      this.totalSize += nodeSize;
    }

    this.updateMetrics();
  }

  /**
   * Delete key with O(1) complexity
   */
  public delete(key: K): boolean {
    const node = this.map.get(key);
    
    if (!node) {
      return false;
    }

    this.map.delete(key);
    this.removeNode(node);
    this.size--;
    this.totalSize -= node.size;
    
    // Call eviction callback if provided
    if (this.config.onEviction) {
      this.config.onEviction(key, node.value);
    }

    this.updateMetrics();
    return true;
  }

  /**
   * Check if key exists without updating access time
   */
  public has(key: K): boolean {
    const node = this.map.get(key);
    
    if (!node) {
      return false;
    }

    // Check TTL expiration
    if (this.config.ttl && Date.now() - node.timestamp > this.config.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Peek at value without updating LRU order
   */
  public peek(key: K): V | null {
    const node = this.map.get(key);
    
    if (!node) {
      return null;
    }

    // Check TTL expiration
    if (this.config.ttl && Date.now() - node.timestamp > this.config.ttl) {
      this.delete(key);
      return null;
    }

    return node.value;
  }

  /**
   * Optimized batch operations
   */
  public setBatch(entries: Array<[K, V]>): void {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  public getBatch(keys: K[]): Array<[K, V | null]> {
    return keys.map(key => [key, this.get(key)]);
  }

  public deleteBatch(keys: K[]): number {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Advanced operations for analytics
   */
  public getHotKeys(limit: number = 10): Array<[K, number]> {
    const nodes = Array.from(this.map.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
    
    return nodes.map(node => [node.key, node.accessCount]);
  }

  public getColdKeys(limit: number = 10): Array<[K, number]> {
    const now = Date.now();
    const nodes = Array.from(this.map.values())
      .sort((a, b) => (now - a.timestamp) - (now - b.timestamp))
      .slice(0, limit);
    
    return nodes.map(node => [node.key, now - node.timestamp]);
  }

  public getKeysByAccessPattern(minAccess: number): K[] {
    return Array.from(this.map.values())
      .filter(node => node.accessCount >= minAccess)
      .map(node => node.key);
  }

  /**
   * Memory management and optimization
   */
  public prune(): number {
    let prunedCount = 0;
    const now = Date.now();
    
    if (this.config.ttl) {
      for (const [key, node] of this.map) {
        if (now - node.timestamp > this.config.ttl) {
          this.delete(key);
          prunedCount++;
        }
      }
    }
    
    return prunedCount;
  }

  public compact(): void {
    // Force garbage collection of removed nodes
    const entries = this.entries();
    this.clear();
    
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  /**
   * Resize cache capacity
   */
  public resize(newCapacity: number): void {
    this.capacity = newCapacity;
    this.config.maxSize = newCapacity;
    
    // Evict excess entries if new capacity is smaller
    while (this.size > this.capacity) {
      this.evictLRU();
    }
    
    this.updateMetrics();
  }

  // Private helper methods

  private moveToFront(node: LRUNode<K, V>): void {
    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) return;
    
    const lruNode = this.tail;
    this.map.delete(lruNode.key);
    this.removeNode(lruNode);
    this.size--;
    this.totalSize -= lruNode.size;
    this.metrics.evictions++;
    
    // Call eviction callback if provided
    if (this.config.onEviction) {
      this.config.onEviction(lruNode.key, lruNode.value);
    }
  }

  private calculateNodeSize(key: K, value: V): number {
    if (this.config.sizeCalculator) {
      return this.config.sizeCalculator(key, value);
    }
    
    // Rough estimation for basic types
    let size = 100; // Base overhead
    
    if (typeof key === 'string') {
      size += key.length * 2; // UTF-16
    } else if (typeof key === 'object') {
      size += JSON.stringify(key).length * 2;
    }
    
    if (typeof value === 'string') {
      size += value.length * 2;
    } else if (typeof value === 'object') {
      size += JSON.stringify(value).length * 2;
    }
    
    return size;
  }

  private getMaxMemory(): number {
    // Default to 50MB if no size calculator provided
    return 50 * 1024 * 1024;
  }

  private updateHitRate(): void {
    const totalAccess = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalAccess > 0 ? (this.metrics.hits / totalAccess) * 100 : 0;
  }

  private updateMetrics(): void {
    this.metrics.size = this.size;
    this.metrics.memoryUsage = this.totalSize;
    
    if (this.size > 0) {
      const totalAccessCount = Array.from(this.map.values())
        .reduce((sum, node) => sum + node.accessCount, 0);
      this.metrics.averageAccessCount = totalAccessCount / this.size;
    }
  }

  private startTTLCleanup(): void {
    if (!this.config.ttl) return;
    
    const cleanupInterval = Math.min(this.config.ttl / 4, 60000); // Max 1 minute
    
    this.ttlTimer = setInterval(() => {
      this.prune();
    }, cleanupInterval);
  }

  // Public API methods

  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.totalSize = 0;
    this.initializeMetrics();
  }

  public keys(): IterableIterator<K> {
    return this.map.keys();
  }

  public values(): IterableIterator<V> {
    return this.iterateValues();
  }

  private *iterateValues(): IterableIterator<V> {
    for (const node of this.map.values()) {
      yield node.value;
    }
  }

  public entries(): Array<[K, V]> {
    return Array.from(this.map.entries()).map(([key, node]) => [key, node.value]);
  }

  public forEach(callback: (value: V, key: K) => void): void {
    for (const [key, node] of this.map) {
      callback(node.value, key);
    }
  }

  public getSize(): number {
    return this.size;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getMemoryUsage(): number {
    return this.totalSize;
  }

  public getMetrics(): LRUMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  public isEmpty(): boolean {
    return this.size === 0;
  }

  public isFull(): boolean {
    return this.size >= this.capacity;
  }

  /**
   * Export cache state for persistence
   */
  public export(): any {
    return {
      config: this.config,
      entries: this.entries(),
      metrics: this.metrics
    };
  }

  /**
   * Import cache state from persistence
   */
  public static import<K, V>(data: any): OptimizedLRU<K, V> {
    const cache = new OptimizedLRU<K, V>(data.config);
    
    if (data.entries && Array.isArray(data.entries)) {
      for (const [key, value] of data.entries) {
        cache.set(key, value);
      }
    }
    
    return cache;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.ttlTimer) {
      clearInterval(this.ttlTimer);
      this.ttlTimer = null;
    }
    
    this.clear();
  }
}