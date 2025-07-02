/**
 * High-Performance Ring Buffer for Time-Series Data
 * Optimized for DeFi price feeds and transaction processing
 * O(1) operations with minimal memory allocation
 */

import { RingBufferConfig, RingBufferMetrics, TimeSeries } from './types';

export class RingBuffer<T> {
  private buffer: Array<T | null>;
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private config: RingBufferConfig;
  private metrics: RingBufferMetrics;

  constructor(config: RingBufferConfig) {
    this.config = config;
    this.buffer = new Array(config.capacity).fill(null);
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics = {
      size: 0,
      capacity: this.config.capacity,
      overflows: 0,
      reads: 0,
      writes: 0,
      utilizationRate: 0
    };
  }

  /**
   * Add element to ring buffer - O(1) operation
   * Optimized for high-frequency data ingestion
   */
  public push(item: T): boolean {
    if (this.config.trackMetrics) {
      this.metrics.writes++;
    }

    if (this.count === this.config.capacity) {
      if (this.config.overwriteOnFull) {
        // Overwrite oldest element
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.config.capacity;
        this.head = (this.head + 1) % this.config.capacity;
        
        if (this.config.trackMetrics) {
          this.metrics.overflows++;
        }
        return true;
      } else {
        // Buffer is full, cannot add
        return false;
      }
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.config.capacity;
    this.count++;

    if (this.config.trackMetrics) {
      this.metrics.size = this.count;
      this.metrics.utilizationRate = (this.count / this.config.capacity) * 100;
    }

    return true;
  }

  /**
   * Remove and return oldest element - O(1) operation
   */
  public pop(): T | null {
    if (this.config.trackMetrics) {
      this.metrics.reads++;
    }

    if (this.count === 0) {
      return null;
    }

    const item = this.buffer[this.head] as T;
    this.buffer[this.head] = null; // Help GC
    this.head = (this.head + 1) % this.config.capacity;
    this.count--;

    if (this.config.trackMetrics) {
      this.metrics.size = this.count;
      this.metrics.utilizationRate = (this.count / this.config.capacity) * 100;
    }

    return item;
  }

  /**
   * Peek at element without removing - O(1) operation
   */
  public peek(offset: number = 0): T | null {
    if (offset >= this.count || offset < 0) {
      return null;
    }

    const index = (this.head + offset) % this.config.capacity;
    return this.buffer[index] as T;
  }

  /**
   * Get latest N elements efficiently
   */
  public getLatest(n: number): T[] {
    if (n <= 0 || this.count === 0) {
      return [];
    }

    const itemsToGet = Math.min(n, this.count);
    const result: T[] = new Array(itemsToGet);
    
    // Start from the most recent item (tail - 1) and work backwards
    for (let i = 0; i < itemsToGet; i++) {
      const bufferIndex = (this.tail - 1 - i + this.config.capacity) % this.config.capacity;
      result[i] = this.buffer[bufferIndex] as T;
    }

    return result;
  }

  /**
   * Bulk operations for better performance
   */
  public pushBatch(items: T[]): number {
    let addedCount = 0;
    
    for (const item of items) {
      if (this.push(item)) {
        addedCount++;
      } else if (!this.config.overwriteOnFull) {
        break; // Stop if buffer is full and overwrite is disabled
      }
    }
    
    return addedCount;
  }

  public popBatch(count: number): T[] {
    const result: T[] = [];
    const itemsToGet = Math.min(count, this.count);
    
    for (let i = 0; i < itemsToGet; i++) {
      const item = this.pop();
      if (item !== null) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Time-based operations for time-series data
   */
  public getByTimeRange(startTime: number, endTime: number): TimeSeries<T>[] {
    const result: TimeSeries<T>[] = [];
    
    for (let i = 0; i < this.count; i++) {
      const item = this.peek(i);
      if (item && this.isTimeSeries(item)) {
        const tsItem = item as TimeSeries<T>;
        if (tsItem.timestamp >= startTime && tsItem.timestamp <= endTime) {
          result.push(tsItem);
        }
      }
    }
    
    return result;
  }

  private isTimeSeries(item: any): item is TimeSeries<any> {
    return item && typeof item === 'object' && typeof item.timestamp === 'number';
  }

  /**
   * Advanced aggregation functions for analytics
   */
  public aggregate<R>(
    aggregator: (items: T[]) => R,
    windowSize: number = this.count
  ): R | null {
    if (this.count === 0) return null;
    
    const items = this.toArray().slice(-windowSize);
    return aggregator(items);
  }

  public movingAverage(windowSize: number, valueExtractor?: (item: T) => number): number[] {
    if (this.count < windowSize) return [];
    
    const extractor = valueExtractor || ((item: any) => 
      typeof item === 'number' ? item : item.value || 0
    );
    
    const averages: number[] = [];
    
    for (let i = windowSize - 1; i < this.count; i++) {
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        const item = this.peek(j);
        if (item !== null) {
          sum += extractor(item);
        }
      }
      averages.push(sum / windowSize);
    }
    
    return averages;
  }

  /**
   * Memory-efficient iteration
   */
  public forEach(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.count; i++) {
      const item = this.peek(i);
      if (item !== null) {
        callback(item, i);
      }
    }
  }

  public map<R>(mapper: (item: T, index: number) => R): R[] {
    const result: R[] = new Array(this.count);
    
    for (let i = 0; i < this.count; i++) {
      const item = this.peek(i);
      if (item !== null) {
        result[i] = mapper(item, i);
      }
    }
    
    return result;
  }

  public filter(predicate: (item: T, index: number) => boolean): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this.count; i++) {
      const item = this.peek(i);
      if (item !== null && predicate(item, i)) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Convert to array (for compatibility)
   */
  public toArray(): T[] {
    const result: T[] = new Array(this.count);
    
    for (let i = 0; i < this.count; i++) {
      const item = this.peek(i);
      if (item !== null) {
        result[i] = item;
      }
    }
    
    return result;
  }

  /**
   * Statistics and metrics
   */
  public getMetrics(): RingBufferMetrics {
    return { ...this.metrics };
  }

  public getSize(): number {
    return this.count;
  }

  public getCapacity(): number {
    return this.config.capacity;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  public isFull(): boolean {
    return this.count === this.config.capacity;
  }

  public getUtilization(): number {
    return (this.count / this.config.capacity) * 100;
  }

  /**
   * Clear buffer and reset metrics
   */
  public clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.initializeMetrics();
  }

  /**
   * Resize buffer capacity (expensive operation)
   */
  public resize(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Capacity must be positive');
    }

    const currentData = this.toArray();
    this.buffer = new Array(newCapacity).fill(null);
    this.config.capacity = newCapacity;
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    
    // Re-add data up to new capacity
    const itemsToAdd = Math.min(currentData.length, newCapacity);
    for (let i = 0; i < itemsToAdd; i++) {
      this.push(currentData[i]);
    }
    
    this.metrics.capacity = newCapacity;
  }

  /**
   * Memory optimization - compact buffer
   */
  public compact(): void {
    if (this.count === 0) return;
    
    const data = this.toArray();
    this.clear();
    
    for (const item of data) {
      this.push(item);
    }
  }

  /**
   * Serialize/deserialize for persistence
   */
  public toJSON(): any {
    return {
      config: this.config,
      data: this.toArray(),
      metrics: this.metrics
    };
  }

  public static fromJSON<T>(json: any): RingBuffer<T> {
    const buffer = new RingBuffer<T>(json.config);
    
    if (json.data && Array.isArray(json.data)) {
      for (const item of json.data) {
        buffer.push(item);
      }
    }
    
    return buffer;
  }
}