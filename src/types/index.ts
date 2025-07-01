/**
 * @fileoverview Main type exports for the data collection system
 * Re-exports all types from individual modules for convenient importing
 */

// Core data types
export type {
  // Utility types
  Either,
  Option,
  Result,
  ReadonlyRecord,
  NonEmptyArray,
  DeepReadonly,
  
  // Time types
  Timestamp,
  ISODateString,
  TimeRange,
  
  // Base data types
  DataPoint,
  TimeSeries,
  
  // Market data types
  OHLCV,
  PriceData,
  OrderBook,
  OrderBookLevel,
  TradingPair,
  
  // Blockchain types
  Transaction,
  TransactionLog,
  Block,
  
  // DeFi types
  LiquidityPool,
  TokenInfo,
  DexTrade,
  YieldData,
  
  // Feature engineering types
  TechnicalIndicator,
  PriceMetrics,
  VolumeMetrics,
  
  // Collection state types
  CollectionStatus,
  CollectionState,
  
  // Configuration types
  DataSourceConfig,
  CollectionJobConfig,
  
  // Storage types
  RecordMetadata,
  StoredRecord,
  QueryParams,
  
  // Type guards
  isLeft,
  isRight,
  isSome,
  isNone
} from './data.js';

// Sei blockchain types
export type {
  // Cosmos SDK types
  Coin,
  CosmosMsg,
  TxResponse,
  ABCIMessageLog,
  StringEvent,
  EventAttribute,
  CosmosTransaction,
  SignerInfo,
  CosmosTransactionFee,
  
  // Sei transaction types
  SeiTransaction,
  
  // Sei DEX types
  SeiOrderType,
  PositionDirection,
  OrderStatus,
  SeiOrder,
  SeiMatch,
  SeiSettlement,
  SeiDexPair,
  
  // Validator types
  ValidatorStatus,
  SeiValidator,
  Delegation,
  UnbondingDelegation,
  
  // Governance types
  ProposalStatus,
  VoteOption,
  GovernanceProposal,
  Vote,
  
  // IBC types
  IBCChannelState,
  IBCChannel,
  IBCTransfer,
  
  // Sei module types
  SeiEpoch,
  SeiOraclePrice,
  SeiExchangeRate,
  
  // Network statistics
  SeiNetworkStats,
  SeiBlockMetrics,
  
  // Derived data types
  SeiDexVolumeData,
  ValidatorMetrics,
  NetworkHealth,
  
  // Query types
  SeiQueryFilters,
  SeiApiResponse,
  
  // Configuration types
  SeiNodeConfig,
  SeiDexMonitorConfig,
  
  // Error types
  SeiRpcError,
  SeiTxError,
  
  // Utility types
  SeiMsgTypes,
  SeiEventProcessingResult,
  
  // Type guards
  isSeiTransaction,
  isSeiOrder
} from './sei.js';

// Machine learning types
export type {
  // Base ML types
  FeatureValue,
  FeatureVector,
  FeatureName,
  FeatureMap,
  Label,
  MultiClassLabel,
  
  // Feature engineering types
  FeatureTransformType,
  FeatureTransform,
  FeatureImportance,
  FeatureStats,
  
  // Time series features
  TimeWindow,
  TechnicalFeatures,
  MicrostructureFeatures,
  VolatilityFeatures,
  
  // Cross-sectional features
  MarketRegimeFeatures,
  CrossAssetFeatures,
  FundamentalFeatures,
  
  // Feature pipeline types
  FeaturePipelineStep,
  FeaturePipeline,
  
  // Dataset types
  TrainingExample,
  TrainingDataset,
  TimeSeriesDataset,
  
  // OpenAI types
  OpenAITrainingExample,
  OpenAIDataset,
  OpenAICompletion,
  OpenAIEmbeddingDataset,
  
  // Model training types
  ModelType,
  HyperparameterConfig,
  TrainingConfig,
  ModelMetrics,
  ModelEvaluation,
  
  // Model deployment types
  ModelVersion,
  InferenceRequest,
  InferenceResponse,
  
  // ML pipeline types
  MLPipelineStage,
  MLPipelineStatus,
  MLPipelineRun,
  
  // Feature store types
  FeatureEntity,
  FeatureView,
  FeatureService,
  
  // Data quality types
  DataQualityCheck,
  DataQualityResult,
  DatasetValidationReport,
  
  // Monitoring types
  ModelMonitoring,
  
  // Export types
  ExportFormat,
  ModelExportConfig,
  
  // Utility types
  ExtractFeatureNames,
  TypedFeatureMap,
  MLResult,
  MLError,
  
  // Type guards
  isTrainingExample,
  isFeatureMap
} from './ml.js';

/**
 * Configuration types for the entire system
 */

/** Global system configuration */
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

/** Data collection system configuration */
export type DataCollectionConfig = {
  readonly collectors: ReadonlyArray<any>; // DataSourceConfig from data.ts
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

/** ML training system configuration */
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

/**
 * Event types for system monitoring and observability
 */

/** System event type */
export type SystemEventType = 
  | 'data_collection_started'
  | 'data_collection_completed'
  | 'data_collection_failed'
  | 'feature_pipeline_started'
  | 'feature_pipeline_completed'
  | 'feature_pipeline_failed'
  | 'model_training_started'
  | 'model_training_completed'
  | 'model_training_failed'
  | 'model_deployed'
  | 'model_inference_request'
  | 'model_inference_response'
  | 'system_health_check'
  | 'alert_triggered'
  | 'configuration_updated';

/** System event */
export type SystemEvent = {
  readonly event_id: string;
  readonly event_type: SystemEventType;
  readonly timestamp: number; // Timestamp
  readonly source: string;
  readonly metadata: Record<string, unknown>; // ReadonlyRecord
  readonly payload?: unknown;
  readonly severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
};

/** Event stream */
export type EventStream = {
  readonly stream_id: string;
  readonly events: ReadonlyArray<SystemEvent>;
  readonly created_at: number; // Timestamp
  readonly last_updated: number; // Timestamp
};

/**
 * API types for system integration
 */

/** API request base type */
export type APIRequest<T = unknown> = {
  readonly request_id: string;
  readonly timestamp: number; // Timestamp
  readonly endpoint: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly headers: Record<string, string>; // ReadonlyRecord
  readonly body?: T;
  readonly query_params?: Record<string, string>; // ReadonlyRecord
};

/** API response base type */
export type APIResponse<T = unknown> = {
  readonly request_id: string;
  readonly timestamp: number; // Timestamp
  readonly status_code: number;
  readonly headers: Record<string, string>; // ReadonlyRecord
  readonly body: T;
  readonly processing_time_ms: number;
};

/** API error response */
export type APIErrorResponse = {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>; // ReadonlyRecord
  };
  readonly timestamp: number; // Timestamp
  readonly request_id: string;
};

/**
 * Batch processing types
 */

/** Batch job configuration */
export type BatchJobConfig = {
  readonly job_id: string;
  readonly name: string;
  readonly job_type: 'data_collection' | 'feature_engineering' | 'model_training' | 'model_evaluation';
  readonly schedule: {
    readonly cron_expression?: string;
    readonly interval_ms?: number;
    readonly start_time?: number; // Timestamp
    readonly end_time?: number; // Timestamp
  };
  readonly resources: {
    readonly cpu_cores: number;
    readonly memory_gb: number;
    readonly gpu_count?: number;
    readonly disk_gb: number;
  };
  readonly dependencies: ReadonlyArray<string>; // job_ids this depends on
  readonly retry_policy: {
    readonly max_retries: number;
    readonly backoff_multiplier: number;
    readonly max_backoff_ms: number;
  };
  readonly timeout_ms: number;
};

/** Batch job status */
export type BatchJobStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

/** Batch job execution */
export type BatchJobExecution = {
  readonly execution_id: string;
  readonly job_id: string;
  readonly status: BatchJobStatus;
  readonly start_time?: number; // Timestamp
  readonly end_time?: number; // Timestamp
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

/**
 * Functional programming utilities
 */

/** Functor interface for mapping over container types */
export interface Functor<F> {
  readonly map: <A, B>(fa: F, f: (a: A) => B) => F;
}

/** Monad interface for chaining operations */
export interface Monad<M> extends Functor<M> {
  readonly of: <A>(a: A) => M;
  readonly chain: <A, B>(ma: M, f: (a: A) => M) => M;
}

/** Pipe function for functional composition */
export type Pipe = {
  <A>(value: A): A;
  <A, B>(value: A, fn1: (a: A) => B): B;
  <A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
  <A, B, C, D>(value: A, fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): D;
  <A, B, C, D, E>(value: A, fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D, fn4: (d: D) => E): E;
  // ... more overloads as needed
};

/** Compose function for functional composition */
export type Compose = {
  <A>(fn1: (a: A) => A): (a: A) => A;
  <A, B>(fn2: (b: B) => A, fn1: (a: A) => B): (a: A) => A;
  <A, B, C>(fn3: (c: C) => A, fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => A;
  <A, B, C, D>(fn4: (d: D) => A, fn3: (c: C) => D, fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => A;
  // ... more overloads as needed
};

/**
 * Immutable data structure helpers
 */

/** Immutable array operations */
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

/** Immutable record operations */
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

/**
 * Type-level programming utilities
 */

/** Extract keys with values of type T */
export type KeysOfType<O, T> = {
  [K in keyof O]: O[K] extends T ? K : never;
}[keyof O];

/** Make specified keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specified keys required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Branded type for type safety */
export type Brand<T, B> = T & { readonly __brand: B };

/** Nominal type for strong typing */
export type Nominal<T, N extends string> = T & { readonly [Symbol.species]: N };

// Utility types and functional programming helpers
export type {
  // Advanced type utilities
  ArrayElement,
  ReturnType,
  Parameters,
  Awaited,
  Flatten,
  UnionToIntersection,
  Exact,
  NonNullable,
  TupleToUnion,
  Path,
  PathValue,
  
  // Functional data structures
  ValidationResult,
  Validator,
  ValidationError,
  ValidationContext,
  Schema,
  AsyncOption,
  AsyncEither,
  AsyncResult,
  EventMap,
  EventListener,
  TypedEventEmitter,
  Lens,
  ParseResult,
  Parser,
  State,
  Free,
  
  // Immutable data structures
  ImmutableList,
  ImmutableMap
} from './utils.js';

// Configuration types
export type {
  // Base configuration types
  Environment,
  LogLevel,
  BaseConfig,
  
  // Database and storage
  DatabaseType,
  DatabaseConfig,
  StorageConfig,
  
  // Network and API
  HttpClientConfig,
  WebSocketConfig,
  
  // Blockchain configurations
  BlockchainNetworkConfig,
  BlockchainNodeConfig,
  BlockCollectorConfig,
  TransactionMonitorConfig,
  
  // Exchange configurations
  ExchangeConfig,
  MarketDataCollectorConfig,
  
  // DeFi configurations
  DeFiProtocolConfig,
  LiquidityPoolMonitorConfig,
  
  // Feature engineering configurations
  FeatureExtractionConfig,
  FeaturePipelineConfig,
  
  // ML configurations
  MLExperimentConfig,
  ModelDeploymentConfig,
  
  // System monitoring
  HealthCheckConfig,
  AlertConfig,
  
  // Complete system configuration
  SystemConfiguration,
  
  // Configuration validation
  ConfigValidationError,
  ConfigValidationResult,
  ConfigSchema,
  
  // Configuration management
  ConfigSource,
  ConfigProvider,
  ConfigChangeEvent,
  
  // Runtime configuration
  FeatureFlags,
  CircuitBreakerConfig,
  ResourceLimits
} from './config.js';

// Re-export utility functions
export { 
  Maybe, 
  EitherM, 
  AsyncUtils, 
  compose, 
  pipe, 
  curry, 
  partial, 
  memoize,
  lens,
  composeLens,
  Parsers,
  StateM,
  FreeM
} from './utils.js';

export { 
  createDefaultConfig,
  mergeConfigs,
  isDatabaseConfig,
  isExchangeConfig,
  isMLExperimentConfig
} from './config.js';

/**
 * Global constants and defaults
 */

/** Default system configuration values */
export const DEFAULT_SYSTEM_CONFIG = {
  BATCH_SIZE: 1000,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  CACHE_TTL_SECONDS: 3600,
  FEATURE_PIPELINE_VERSION: '1.0.0',
  MODEL_CHECKPOINT_INTERVAL: 100,
  DATA_RETENTION_DAYS: 90
} as const;

/** Common feature names used across the system */
export const COMMON_FEATURES = {
  PRICE: 'price',
  VOLUME: 'volume',
  TIMESTAMP: 'timestamp',
  VOLATILITY: 'volatility',
  RSI: 'rsi',
  MACD: 'macd',
  BOLLINGER_BANDS: 'bollinger_bands',
  MOVING_AVERAGE: 'moving_average'
} as const;

/** Model evaluation metrics */
export const EVALUATION_METRICS = {
  ACCURACY: 'accuracy',
  PRECISION: 'precision',
  RECALL: 'recall',
  F1_SCORE: 'f1_score',
  AUC_ROC: 'auc_roc',
  RMSE: 'rmse',
  MAE: 'mae',
  SHARPE_RATIO: 'sharpe_ratio'
} as const;