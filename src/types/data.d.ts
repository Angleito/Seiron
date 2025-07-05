export type Either<L, R> = {
    readonly _tag: 'Left';
    readonly left: L;
} | {
    readonly _tag: 'Right';
    readonly right: R;
};
export type Option<T> = {
    readonly _tag: 'None';
} | {
    readonly _tag: 'Some';
    readonly value: T;
};
export type Result<T, E = Error> = Either<E, T>;
export type Timestamp = number;
export type ISODateString = string;
export type TimeRange = {
    readonly start: Timestamp;
    readonly end: Timestamp;
};
export type DataPoint<T> = {
    readonly timestamp: Timestamp;
    readonly data: T;
    readonly metadata?: ReadonlyRecord<string, unknown>;
};
export type TimeSeries<T> = {
    readonly points: ReadonlyArray<DataPoint<T>>;
    readonly interval: number;
    readonly source: string;
};
export type OHLCV = {
    readonly timestamp: Timestamp;
    readonly open: number;
    readonly high: number;
    readonly low: number;
    readonly close: number;
    readonly volume: number;
};
export type PriceData = {
    readonly timestamp: Timestamp;
    readonly price: number;
    readonly bid?: number;
    readonly ask?: number;
    readonly spread?: number;
    readonly volume24h?: number;
};
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
export type TradingPair = {
    readonly base: string;
    readonly quote: string;
    readonly symbol: string;
    readonly exchange: string;
};
export type Transaction = {
    readonly hash: string;
    readonly blockNumber: number;
    readonly blockHash: string;
    readonly timestamp: Timestamp;
    readonly from: string;
    readonly to: string;
    readonly value: string;
    readonly gasUsed: string;
    readonly gasPrice: string;
    readonly status: 'success' | 'failed';
    readonly logs: ReadonlyArray<TransactionLog>;
};
export type TransactionLog = {
    readonly address: string;
    readonly topics: ReadonlyArray<string>;
    readonly data: string;
    readonly logIndex: number;
    readonly transactionHash: string;
    readonly blockNumber: number;
};
export type Block = {
    readonly number: number;
    readonly hash: string;
    readonly parentHash: string;
    readonly timestamp: Timestamp;
    readonly miner: string;
    readonly gasLimit: string;
    readonly gasUsed: string;
    readonly transactions: ReadonlyArray<Transaction>;
    readonly transactionCount: number;
};
export type LiquidityPool = {
    readonly address: string;
    readonly token0: TokenInfo;
    readonly token1: TokenInfo;
    readonly reserve0: string;
    readonly reserve1: string;
    readonly totalSupply: string;
    readonly fee: number;
    readonly timestamp: Timestamp;
};
export type TokenInfo = {
    readonly address: string;
    readonly symbol: string;
    readonly name: string;
    readonly decimals: number;
    readonly totalSupply?: string;
};
export type DexTrade = {
    readonly transactionHash: string;
    readonly blockNumber: number;
    readonly timestamp: Timestamp;
    readonly dex: string;
    readonly pair: TradingPair;
    readonly amountIn: string;
    readonly amountOut: string;
    readonly priceImpact: number;
    readonly trader: string;
};
export type YieldData = {
    readonly protocol: string;
    readonly pool: string;
    readonly token: TokenInfo;
    readonly apy: number;
    readonly tvl: string;
    readonly timestamp: Timestamp;
    readonly rewards: ReadonlyArray<{
        readonly token: TokenInfo;
        readonly rate: number;
    }>;
};
export type TechnicalIndicator = {
    readonly name: string;
    readonly value: number;
    readonly timestamp: Timestamp;
    readonly period?: number;
    readonly parameters: ReadonlyRecord<string, number>;
};
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
export type CollectionStatus = 'idle' | 'collecting' | 'processing' | 'completed' | 'error' | 'paused';
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
export type CollectionJobConfig = {
    readonly jobId: string;
    readonly name: string;
    readonly source: DataSourceConfig;
    readonly schedule: {
        readonly interval: number;
        readonly startTime?: Timestamp;
        readonly endTime?: Timestamp;
    };
    readonly dataTypes: ReadonlyArray<string>;
    readonly filters: ReadonlyRecord<string, unknown>;
    readonly outputFormat: 'json' | 'csv' | 'parquet';
    readonly batchSize: number;
};
export type RecordMetadata = {
    readonly id: string;
    readonly createdAt: Timestamp;
    readonly updatedAt: Timestamp;
    readonly version: number;
    readonly checksum: string;
};
export type StoredRecord<T> = {
    readonly metadata: RecordMetadata;
    readonly data: T;
};
export type QueryParams = {
    readonly timeRange?: TimeRange;
    readonly limit?: number;
    readonly offset?: number;
    readonly orderBy?: string;
    readonly orderDirection?: 'asc' | 'desc';
    readonly filters?: ReadonlyRecord<string, unknown>;
};
export type ReadonlyRecord<K extends string | number | symbol, V> = {
    readonly [P in K]: V;
};
export type NonEmptyArray<T> = readonly [T, ...T[]];
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
export declare const isLeft: <L, R>(either: Either<L, R>) => either is {
    readonly _tag: "Left";
    readonly left: L;
};
export declare const isRight: <L, R>(either: Either<L, R>) => either is {
    readonly _tag: "Right";
    readonly right: R;
};
export declare const isSome: <T>(option: Option<T>) => option is {
    readonly _tag: "Some";
    readonly value: T;
};
export declare const isNone: <T>(option: Option<T>) => option is {
    readonly _tag: "None";
};
//# sourceMappingURL=data.d.ts.map