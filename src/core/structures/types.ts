/**
 * High-Performance Data Structures Types
 * Optimized implementations for DeFi operations
 */

export interface RingBufferConfig {
  capacity: number;
  overwriteOnFull: boolean;
  trackMetrics: boolean;
}

export interface RingBufferMetrics {
  size: number;
  capacity: number;
  overflows: number;
  reads: number;
  writes: number;
  utilizationRate: number;
}

export interface BTreeConfig {
  order: number; // Maximum number of children per node
  allowDuplicates: boolean;
  cacheNodes: boolean;
  maxCacheSize?: number;
}

export interface BTreeNode<K, V> {
  keys: K[];
  values: V[];
  children?: BTreeNode<K, V>[];
  isLeaf: boolean;
  parent?: BTreeNode<K, V>;
  dirty?: boolean;
  lastAccessed?: number;
}

export interface BTreeMetrics {
  height: number;
  nodeCount: number;
  keyCount: number;
  searchOps: number;
  insertOps: number;
  deleteOps: number;
  cacheHits: number;
  cacheMisses: number;
  averageSearchDepth: number;
}

export interface BloomFilterConfig {
  expectedElements: number;
  falsePositiveRate: number;
  hashFunctions?: number;
  bitArraySize?: number;
}

export interface BloomFilterMetrics {
  size: number;
  hashFunctions: number;
  bitArraySize: number;
  addedElements: number;
  lookups: number;
  estimatedFalsePositiveRate: number;
  fillRatio: number;
}

export interface LRUCacheConfig<K, V> {
  maxSize: number;
  ttl?: number;
  onEviction?: (key: K, value: V) => void;
  sizeCalculator?: (key: K, value: V) => number;
  trackAccess?: boolean;
}

export interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
  timestamp: number;
  accessCount: number;
  size: number;
}

export interface LRUMetrics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  averageAccessCount: number;
}

export interface TimeSeries<T> {
  timestamp: number;
  value: T;
  metadata?: Record<string, any>;
}

export interface TimeSeriesConfig {
  maxPoints: number;
  timeWindow: number; // in milliseconds
  aggregationInterval?: number;
  compression?: boolean;
}

export interface SkipListConfig {
  maxLevel: number;
  probability: number;
}

export interface SkipListNode<K, V> {
  key: K;
  value: V;
  forward: Array<SkipListNode<K, V> | null>;
  level: number;
}

export interface SkipListMetrics {
  size: number;
  maxLevel: number;
  currentMaxLevel: number;
  searchOps: number;
  insertOps: number;
  deleteOps: number;
  averageSearchHops: number;
}

export interface PricePoint {
  price: number;
  timestamp: number;
  volume: number;
  source: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
  timestamp: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: number;
  spread: number;
  midPrice: number;
}