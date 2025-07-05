export type { Either, Option, Result, ReadonlyRecord, NonEmptyArray, DeepReadonly, Timestamp, ISODateString, TimeRange, DataPoint, TimeSeries, OHLCV, PriceData, OrderBook, OrderBookLevel, TradingPair, Transaction, TransactionLog, Block, LiquidityPool, TokenInfo, DexTrade, YieldData, TechnicalIndicator, PriceMetrics, VolumeMetrics, CollectionStatus, CollectionState, DataSourceConfig, CollectionJobConfig, RecordMetadata, StoredRecord, QueryParams, isLeft, isRight, isSome, isNone } from './data.js';
export type { Coin, CosmosMsg, TxResponse, ABCIMessageLog, StringEvent, EventAttribute, CosmosTransaction, SignerInfo, CosmosTransactionFee, SeiTransaction, SeiOrderType, PositionDirection, OrderStatus, SeiOrder, SeiMatch, SeiSettlement, SeiDexPair, ValidatorStatus, SeiValidator, Delegation, UnbondingDelegation, ProposalStatus, VoteOption, GovernanceProposal, Vote, IBCChannelState, IBCChannel, IBCTransfer, SeiEpoch, SeiOraclePrice, SeiExchangeRate, SeiNetworkStats, SeiBlockMetrics, SeiDexVolumeData, ValidatorMetrics, NetworkHealth, SeiQueryFilters, SeiApiResponse, SeiNodeConfig, SeiDexMonitorConfig, SeiRpcError, SeiTxError, SeiMsgTypes, SeiEventProcessingResult, isSeiTransaction, isSeiOrder } from './sei.js';
export type { FeatureValue, FeatureVector, FeatureName, FeatureMap, Label, MultiClassLabel, FeatureTransformType, FeatureTransform, FeatureImportance, FeatureStats, TimeWindow, TechnicalFeatures, MicrostructureFeatures, VolatilityFeatures, MarketRegimeFeatures, CrossAssetFeatures, FundamentalFeatures, FeaturePipelineStep, FeaturePipeline, TrainingExample, TrainingDataset, TimeSeriesDataset, OpenAITrainingExample, OpenAIDataset, OpenAICompletion, OpenAIEmbeddingDataset, ModelType, HyperparameterConfig, TrainingConfig, ModelMetrics, ModelEvaluation, ModelVersion, InferenceRequest, InferenceResponse, MLPipelineStage, MLPipelineStatus, MLPipelineRun, FeatureEntity, FeatureView, FeatureService, DataQualityCheck, DataQualityResult, DatasetValidationReport, ModelMonitoring, ExportFormat, ModelExportConfig, ExtractFeatureNames, TypedFeatureMap, MLResult, MLError, isTrainingExample, isFeatureMap } from './ml.js';
export type SystemConfig = {
    readonly environment: 'development' | 'staging' | 'production';
    readonly logging: {
        readonly level: 'debug' | 'info' | 'warn' | 'error';
        readonly format: 'json' | 'text';
        readonly output: ReadonlyArray<'console' | 'file' | 'remote'>;
    };
    readonly database: {
        readonly type: 'postgresql' | 'mongodb' | 'timescaledb' | 'influxdb';
        readonly connection_string: string;
        readonly pool_size: number;
        readonly timeout_ms: number;
    };
    readonly cache: {
        readonly type: 'redis' | 'memcached' | 'memory';
        readonly connection_string?: string;
        readonly ttl_seconds: number;
        readonly max_memory_mb?: number;
    };
    readonly queue: {
        readonly type: 'redis' | 'rabbitmq' | 'kafka' | 'memory';
        readonly connection_string?: string;
        readonly max_jobs: number;
        readonly retry_attempts: number;
    };
    readonly monitoring: {
        readonly enabled: boolean;
        readonly metrics_endpoint?: string;
        readonly health_check_interval_ms: number;
        readonly alert_webhook?: string;
    };
};
export type DataCollectionConfig = {
    readonly collectors: ReadonlyArray<any>;
    readonly storage: {
        readonly raw_data_path: string;
        readonly processed_data_path: string;
        readonly backup_path?: string;
        readonly compression_enabled: boolean;
        readonly retention_days: number;
    };
    readonly processing: {
        readonly batch_size: number;
        readonly parallel_workers: number;
        readonly memory_limit_mb: number;
        readonly processing_interval_ms: number;
    };
    readonly feature_engineering: {
        readonly pipeline_ids: ReadonlyArray<string>;
        readonly recompute_features: boolean;
        readonly feature_store_enabled: boolean;
    };
};
export type MLTrainingConfig = {
    readonly compute: {
        readonly device: 'cpu' | 'gpu' | 'tpu';
        readonly memory_limit_gb: number;
        readonly cpu_cores: number;
        readonly gpu_count?: number;
    };
    readonly training: {
        readonly max_concurrent_jobs: number;
        readonly checkpoint_interval_epochs: number;
        readonly early_stopping_patience: number;
        readonly model_artifact_path: string;
    };
    readonly hyperparameter_tuning: {
        readonly enabled: boolean;
        readonly search_strategy: 'grid' | 'random' | 'bayesian' | 'genetic';
        readonly max_trials: number;
        readonly objective_metric: string;
    };
    readonly model_registry: {
        readonly enabled: boolean;
        readonly registry_url?: string;
        readonly versioning_strategy: 'semantic' | 'timestamp' | 'hash';
    };
};
export type SystemEventType = 'data_collection_started' | 'data_collection_completed' | 'data_collection_failed' | 'feature_pipeline_started' | 'feature_pipeline_completed' | 'feature_pipeline_failed' | 'model_training_started' | 'model_training_completed' | 'model_training_failed' | 'model_deployed' | 'model_inference_request' | 'model_inference_response' | 'system_health_check' | 'alert_triggered' | 'configuration_updated';
export type SystemEvent = {
    readonly event_id: string;
    readonly event_type: SystemEventType;
    readonly timestamp: number;
    readonly source: string;
    readonly metadata: Record<string, unknown>;
    readonly payload?: unknown;
    readonly severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
};
export type EventStream = {
    readonly stream_id: string;
    readonly events: ReadonlyArray<SystemEvent>;
    readonly created_at: number;
    readonly last_updated: number;
};
export type APIRequest<T = unknown> = {
    readonly request_id: string;
    readonly timestamp: number;
    readonly endpoint: string;
    readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    readonly headers: Record<string, string>;
    readonly body?: T;
    readonly query_params?: Record<string, string>;
};
export type APIResponse<T = unknown> = {
    readonly request_id: string;
    readonly timestamp: number;
    readonly status_code: number;
    readonly headers: Record<string, string>;
    readonly body: T;
    readonly processing_time_ms: number;
};
export type APIErrorResponse = {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: Record<string, unknown>;
    };
    readonly timestamp: number;
    readonly request_id: string;
};
export type BatchJobConfig = {
    readonly job_id: string;
    readonly name: string;
    readonly job_type: 'data_collection' | 'feature_engineering' | 'model_training' | 'model_evaluation';
    readonly schedule: {
        readonly cron_expression?: string;
        readonly interval_ms?: number;
        readonly start_time?: number;
        readonly end_time?: number;
    };
    readonly resources: {
        readonly cpu_cores: number;
        readonly memory_gb: number;
        readonly gpu_count?: number;
        readonly disk_gb: number;
    };
    readonly dependencies: ReadonlyArray<string>;
    readonly retry_policy: {
        readonly max_retries: number;
        readonly backoff_multiplier: number;
        readonly max_backoff_ms: number;
    };
    readonly timeout_ms: number;
};
export type BatchJobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type BatchJobExecution = {
    readonly execution_id: string;
    readonly job_id: string;
    readonly status: BatchJobStatus;
    readonly start_time?: number;
    readonly end_time?: number;
    readonly duration_ms?: number;
    readonly exit_code?: number;
    readonly error_message?: string;
    readonly logs_path?: string;
    readonly metrics: {
        readonly cpu_usage_percent: number;
        readonly memory_usage_mb: number;
        readonly disk_usage_mb: number;
        readonly network_io_mb: number;
    };
    readonly output_artifacts: ReadonlyArray<{
        readonly name: string;
        readonly path: string;
        readonly size_bytes: number;
        readonly checksum: string;
    }>;
};
export interface Functor<F> {
    readonly map: <A, B>(fa: F, f: (a: A) => B) => F;
}
export interface Monad<M> extends Functor<M> {
    readonly of: <A>(a: A) => M;
    readonly chain: <A, B>(ma: M, f: (a: A) => M) => M;
}
export type Pipe = {
    <A>(value: A): A;
    <A, B>(value: A, fn1: (a: A) => B): B;
    <A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
    <A, B, C, D>(value: A, fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): D;
    <A, B, C, D, E>(value: A, fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D, fn4: (d: D) => E): E;
};
export type Compose = {
    <A>(fn1: (a: A) => A): (a: A) => A;
    <A, B>(fn2: (b: B) => A, fn1: (a: A) => B): (a: A) => A;
    <A, B, C>(fn3: (c: C) => A, fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => A;
    <A, B, C, D>(fn4: (d: D) => A, fn3: (c: C) => D, fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => A;
};
export interface ImmutableArray<T> {
    readonly length: number;
    readonly [index: number]: T;
    readonly append: (item: T) => ImmutableArray<T>;
    readonly prepend: (item: T) => ImmutableArray<T>;
    readonly remove: (index: number) => ImmutableArray<T>;
    readonly update: (index: number, item: T) => ImmutableArray<T>;
    readonly filter: (predicate: (item: T) => boolean) => ImmutableArray<T>;
    readonly map: <U>(fn: (item: T) => U) => ImmutableArray<U>;
    readonly reduce: <U>(fn: (acc: U, item: T) => U, initial: U) => U;
}
export interface ImmutableRecord<T extends Record<string, unknown>> {
    readonly get: <K extends keyof T>(key: K) => T[K];
    readonly set: <K extends keyof T>(key: K, value: T[K]) => ImmutableRecord<T>;
    readonly update: <K extends keyof T>(key: K, fn: (value: T[K]) => T[K]) => ImmutableRecord<T>;
    readonly remove: <K extends keyof T>(key: K) => ImmutableRecord<Omit<T, K>>;
    readonly merge: <U extends Record<string, unknown>>(other: U) => ImmutableRecord<T & U>;
    readonly keys: () => ReadonlyArray<keyof T>;
    readonly values: () => ReadonlyArray<T[keyof T]>;
    readonly entries: () => ReadonlyArray<readonly [keyof T, T[keyof T]]>;
}
export type KeysOfType<O, T> = {
    [K in keyof O]: O[K] extends T ? K : never;
}[keyof O];
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Brand<T, B> = T & {
    readonly __brand: B;
};
export type Nominal<T, N extends string> = T & {
    readonly [Symbol.species]: N;
};
export type { ArrayElement, ReturnType, Parameters, Awaited, Flatten, UnionToIntersection, Exact, NonNullable, TupleToUnion, Path, PathValue, ValidationResult, Validator, ValidationError, ValidationContext, Schema, AsyncOption, AsyncEither, AsyncResult, EventMap, EventListener, TypedEventEmitter, Lens, ParseResult, Parser, State, Free, ImmutableList, ImmutableMap } from './utils.js';
export type { Environment, LogLevel, BaseConfig, DatabaseType, DatabaseConfig, StorageConfig, HttpClientConfig, WebSocketConfig, BlockchainNetworkConfig, BlockchainNodeConfig, BlockCollectorConfig, TransactionMonitorConfig, ExchangeConfig, MarketDataCollectorConfig, DeFiProtocolConfig, LiquidityPoolMonitorConfig, FeatureExtractionConfig, FeaturePipelineConfig, MLExperimentConfig, ModelDeploymentConfig, HealthCheckConfig, AlertConfig, SystemConfiguration, ConfigValidationError, ConfigValidationResult, ConfigSchema, ConfigSource, ConfigProvider, ConfigChangeEvent, FeatureFlags, CircuitBreakerConfig, ResourceLimits } from './config.js';
export { Maybe, EitherM, AsyncUtils, compose, pipe, curry, partial, memoize, lens, composeLens, Parsers, StateM, FreeM } from './utils.js';
export { createDefaultConfig, mergeConfigs, isDatabaseConfig, isExchangeConfig, isMLExperimentConfig } from './config.js';
export declare const DEFAULT_SYSTEM_CONFIG: {
    readonly BATCH_SIZE: 1000;
    readonly TIMEOUT_MS: 30000;
    readonly RETRY_ATTEMPTS: 3;
    readonly CACHE_TTL_SECONDS: 3600;
    readonly FEATURE_PIPELINE_VERSION: "1.0.0";
    readonly MODEL_CHECKPOINT_INTERVAL: 100;
    readonly DATA_RETENTION_DAYS: 90;
};
export declare const COMMON_FEATURES: {
    readonly PRICE: "price";
    readonly VOLUME: "volume";
    readonly TIMESTAMP: "timestamp";
    readonly VOLATILITY: "volatility";
    readonly RSI: "rsi";
    readonly MACD: "macd";
    readonly BOLLINGER_BANDS: "bollinger_bands";
    readonly MOVING_AVERAGE: "moving_average";
};
export declare const EVALUATION_METRICS: {
    readonly ACCURACY: "accuracy";
    readonly PRECISION: "precision";
    readonly RECALL: "recall";
    readonly F1_SCORE: "f1_score";
    readonly AUC_ROC: "auc_roc";
    readonly RMSE: "rmse";
    readonly MAE: "mae";
    readonly SHARPE_RATIO: "sharpe_ratio";
};
//# sourceMappingURL=index.d.ts.map