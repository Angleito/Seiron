/**
 * @fileoverview Core data type definitions for the data collection system
 * Follows functional programming principles with immutable data structures
 */

/**
 * Utility types for functional programming
 */

/** Either type for representing success/failure states */
export type Either<L, R> = 
  | { readonly _tag: 'Left'; readonly left: L }
  | { readonly _tag: 'Right'; readonly right: R };

/** Option type for representing optional values */
export type Option<T> = 
  | { readonly _tag: 'None' }
  | { readonly _tag: 'Some'; readonly value: T };

/** Result type for operations that can fail */
export type Result<T, E = Error> = Either<E, T>;

/**
 * Timestamp types for consistent time handling
 */

/** Unix timestamp in milliseconds */
export type Timestamp = number;

/** ISO 8601 date string */
export type ISODateString = string;

/** Time range with start and end timestamps */
export type TimeRange = {
  readonly start: Timestamp;
  readonly end: Timestamp;
};

/**
 * Base data collection types
 */

/** Generic data point with timestamp */
export type DataPoint<T> = {
  readonly timestamp: Timestamp;
  readonly data: T;
  readonly metadata?: ReadonlyRecord<string, unknown>;
};

/** Collection of data points */
export type TimeSeries<T> = {
  readonly points: ReadonlyArray<DataPoint<T>>;
  readonly interval: number; // milliseconds between points
  readonly source: string;
};

/**
 * Market data types
 */

/** OHLCV candlestick data */
export type OHLCV = {
  readonly timestamp: Timestamp;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
};

/** Price data with bid/ask spread */
export type PriceData = {
  readonly timestamp: Timestamp;
  readonly price: number;
  readonly bid?: number;
  readonly ask?: number;
  readonly spread?: number;
  readonly volume24h?: number;
};

/** Market depth data */
export type OrderBookLevel = {
  readonly price: number;
  readonly quantity: number;
};

export type OrderBook = {
  readonly timestamp: Timestamp;
  readonly bids: ReadonlyArray<OrderBookLevel>;
  readonly asks: ReadonlyArray<OrderBookLevel>;
  readonly spread: number;
  readonly midPrice: number;
};

/** Trading pair information */
export type TradingPair = {
  readonly base: string;
  readonly quote: string;
  readonly symbol: string; // e.g., "SEI/USDT"
  readonly exchange: string;
};

/**
 * Blockchain data types
 */

/** Generic blockchain transaction */
export type Transaction = {
  readonly hash: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly timestamp: Timestamp;
  readonly from: string;
  readonly to: string;
  readonly value: string; // BigInt as string
  readonly gasUsed: string; // BigInt as string
  readonly gasPrice: string; // BigInt as string
  readonly status: 'success' | 'failed';
  readonly logs: ReadonlyArray<TransactionLog>;
};

/** Transaction log/event */
export type TransactionLog = {
  readonly address: string;
  readonly topics: ReadonlyArray<string>;
  readonly data: string;
  readonly logIndex: number;
  readonly transactionHash: string;
  readonly blockNumber: number;
};

/** Blockchain block data */
export type Block = {
  readonly number: number;
  readonly hash: string;
  readonly parentHash: string;
  readonly timestamp: Timestamp;
  readonly miner: string;
  readonly gasLimit: string; // BigInt as string
  readonly gasUsed: string; // BigInt as string
  readonly transactions: ReadonlyArray<Transaction>;
  readonly transactionCount: number;
};

/**
 * DeFi protocol types
 */

/** Liquidity pool data */
export type LiquidityPool = {
  readonly address: string;
  readonly token0: TokenInfo;
  readonly token1: TokenInfo;
  readonly reserve0: string; // BigInt as string
  readonly reserve1: string; // BigInt as string
  readonly totalSupply: string; // BigInt as string
  readonly fee: number; // basis points
  readonly timestamp: Timestamp;
};

/** Token information */
export type TokenInfo = {
  readonly address: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly totalSupply?: string; // BigInt as string
};

/** DEX trade data */
export type DexTrade = {
  readonly transactionHash: string;
  readonly blockNumber: number;
  readonly timestamp: Timestamp;
  readonly dex: string;
  readonly pair: TradingPair;
  readonly amountIn: string; // BigInt as string
  readonly amountOut: string; // BigInt as string
  readonly priceImpact: number;
  readonly trader: string;
};

/** Yield farming data */
export type YieldData = {
  readonly protocol: string;
  readonly pool: string;
  readonly token: TokenInfo;
  readonly apy: number;
  readonly tvl: string; // BigInt as string
  readonly timestamp: Timestamp;
  readonly rewards: ReadonlyArray<{
    readonly token: TokenInfo;
    readonly rate: number; // per second
  }>;
};

/**
 * Feature engineering types
 */

/** Technical indicator data */
export type TechnicalIndicator = {
  readonly name: string;
  readonly value: number;
  readonly timestamp: Timestamp;
  readonly period?: number;
  readonly parameters: ReadonlyRecord<string, number>;
};

/** Price movement metrics */
export type PriceMetrics = {
  readonly timestamp: Timestamp;
  readonly price: number;
  readonly volatility: number;
  readonly returns: number;
  readonly momentum: number;
  readonly rsi: number;
  readonly macd: {
    readonly line: number;
    readonly signal: number;
    readonly histogram: number;
  };
  readonly bollingerBands: {
    readonly upper: number;
    readonly middle: number;
    readonly lower: number;
  };
};

/** Volume analysis metrics */
export type VolumeMetrics = {
  readonly timestamp: Timestamp;
  readonly volume: number;
  readonly volumeMA: number;
  readonly volumeRatio: number;
  readonly volumeProfile: ReadonlyArray<{
    readonly priceLevel: number;
    readonly volume: number;
  }>;
};

/**
 * Data collection states
 */

/** Collection status */
export type CollectionStatus = 
  | 'idle'
  | 'collecting'
  | 'processing'
  | 'completed'
  | 'error'
  | 'paused';

/** Data collection state */
export type CollectionState<T> = {
  readonly status: CollectionStatus;
  readonly data: ReadonlyArray<T>;
  readonly error?: Error;
  readonly progress: {
    readonly current: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly metadata: {
    readonly startTime: Timestamp;
    readonly lastUpdate: Timestamp;
    readonly source: string;
    readonly version: string;
  };
};

/**
 * Configuration types
 */

/** Data source configuration */
export type DataSourceConfig = {
  readonly name: string;
  readonly type: 'blockchain' | 'exchange' | 'api' | 'websocket';
  readonly endpoint: string;
  readonly apiKey?: string;
  readonly rateLimit: {
    readonly requestsPerSecond: number;
    readonly maxConcurrent: number;
  };
  readonly retryPolicy: {
    readonly maxRetries: number;
    readonly backoffMs: number;
    readonly exponentialBackoff: boolean;
  };
};

/** Collection job configuration */
export type CollectionJobConfig = {
  readonly jobId: string;
  readonly name: string;
  readonly source: DataSourceConfig;
  readonly schedule: {
    readonly interval: number; // milliseconds
    readonly startTime?: Timestamp;
    readonly endTime?: Timestamp;
  };
  readonly dataTypes: ReadonlyArray<string>;
  readonly filters: ReadonlyRecord<string, unknown>;
  readonly outputFormat: 'json' | 'csv' | 'parquet';
  readonly batchSize: number;
};

/**
 * Storage and persistence types
 */

/** Database record metadata */
export type RecordMetadata = {
  readonly id: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
  readonly checksum: string;
};

/** Stored data record */
export type StoredRecord<T> = {
  readonly metadata: RecordMetadata;
  readonly data: T;
};

/** Query parameters for data retrieval */
export type QueryParams = {
  readonly timeRange?: TimeRange;
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly orderDirection?: 'asc' | 'desc';
  readonly filters?: ReadonlyRecord<string, unknown>;
};

/**
 * Utility type aliases
 */

/** Read-only record type */
export type ReadonlyRecord<K extends string | number | symbol, V> = {
  readonly [P in K]: V;
};

/** Non-empty array type */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/** Deep readonly type */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? DeepReadonly<T[P]> 
    : T[P];
};

/**
 * Type guards and utility functions
 */

/** Type guard for Either Left */
export const isLeft = <L, R>(either: Either<L, R>): either is { readonly _tag: 'Left'; readonly left: L } =>
  either._tag === 'Left';

/** Type guard for Either Right */
export const isRight = <L, R>(either: Either<L, R>): either is { readonly _tag: 'Right'; readonly right: R } =>
  either._tag === 'Right';

/** Type guard for Option Some */
export const isSome = <T>(option: Option<T>): option is { readonly _tag: 'Some'; readonly value: T } =>
  option._tag === 'Some';

/** Type guard for Option None */
export const isNone = <T>(option: Option<T>): option is { readonly _tag: 'None' } =>
  option._tag === 'None';