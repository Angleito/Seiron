import type { Timestamp, ReadonlyRecord } from './data.js';
import type { SeiNodeConfig, SeiDexMonitorConfig } from './sei.js';
import type { FeaturePipeline, TrainingConfig, ModelType } from './ml.js';
export type Environment = 'development' | 'staging' | 'production' | 'test';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type BaseConfig = {
    readonly name: string;
    readonly description?: string;
    readonly enabled: boolean;
    readonly version: string;
    readonly created_at: Timestamp;
    readonly updated_at: Timestamp;
    readonly tags: ReadonlyArray<string>;
    readonly metadata: ReadonlyRecord<string, unknown>;
};
export type DatabaseType = 'postgresql' | 'mongodb' | 'timescaledb' | 'influxdb' | 'clickhouse' | 'cassandra' | 'redis' | 'sqlite';
export type DatabaseConfig = BaseConfig & {
    readonly type: DatabaseType;
    readonly connection: {
        readonly host: string;
        readonly port: number;
        readonly database: string;
        readonly username: string;
        readonly password: string;
        readonly ssl_enabled: boolean;
        readonly ssl_cert_path?: string;
        readonly connection_timeout_ms: number;
        readonly query_timeout_ms: number;
    };
    readonly pool: {
        readonly min_connections: number;
        readonly max_connections: number;
        readonly acquire_timeout_ms: number;
        readonly idle_timeout_ms: number;
        readonly reap_interval_ms: number;
    };
    readonly backup: {
        readonly enabled: boolean;
        readonly schedule: string;
        readonly retention_days: number;
        readonly storage_path: string;
        readonly compression_enabled: boolean;
    };
    readonly monitoring: {
        readonly slow_query_threshold_ms: number;
        readonly log_queries: boolean;
        readonly metrics_enabled: boolean;
    };
};
export type StorageConfig = BaseConfig & {
    readonly type: 'local' | 's3' | 'gcs' | 'azure' | 'ipfs';
    readonly path: string;
    readonly credentials?: {
        readonly access_key_id?: string;
        readonly secret_access_key?: string;
        readonly region?: string;
        readonly bucket?: string;
    };
    readonly compression: {
        readonly enabled: boolean;
        readonly algorithm: 'gzip' | 'lz4' | 'zstd' | 'brotli';
        readonly level: number;
    };
    readonly encryption: {
        readonly enabled: boolean;
        readonly algorithm?: 'aes-256-gcm' | 'chacha20-poly1305';
        readonly key?: string;
    };
    readonly partitioning: {
        readonly strategy: 'none' | 'time' | 'hash' | 'range';
        readonly partition_size: string;
        readonly retention_policy: {
            readonly enabled: boolean;
            readonly max_age_days: number;
            readonly max_size_gb: number;
        };
    };
};
export type HttpClientConfig = BaseConfig & {
    readonly base_url: string;
    readonly timeout_ms: number;
    readonly retry_policy: {
        readonly max_retries: number;
        readonly initial_delay_ms: number;
        readonly max_delay_ms: number;
        readonly backoff_multiplier: number;
        readonly retry_on_status_codes: ReadonlyArray<number>;
    };
    readonly rate_limiting: {
        readonly requests_per_second: number;
        readonly burst_capacity: number;
        readonly window_size_ms: number;
    };
    readonly authentication: {
        readonly type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
        readonly api_key?: string;
        readonly bearer_token?: string;
        readonly username?: string;
        readonly password?: string;
        readonly oauth2_config?: {
            readonly client_id: string;
            readonly client_secret: string;
            readonly token_url: string;
            readonly scope: ReadonlyArray<string>;
        };
    };
    readonly headers: ReadonlyRecord<string, string>;
    readonly proxy?: {
        readonly host: string;
        readonly port: number;
        readonly username?: string;
        readonly password?: string;
    };
};
export type WebSocketConfig = BaseConfig & {
    readonly url: string;
    readonly protocols: ReadonlyArray<string>;
    readonly headers: ReadonlyRecord<string, string>;
    readonly ping_interval_ms: number;
    readonly pong_timeout_ms: number;
    readonly reconnect: {
        readonly enabled: boolean;
        readonly max_attempts: number;
        readonly initial_delay_ms: number;
        readonly max_delay_ms: number;
        readonly backoff_multiplier: number;
    };
    readonly message_queue: {
        readonly max_size: number;
        readonly overflow_strategy: 'drop_oldest' | 'drop_newest' | 'error';
    };
    readonly compression_enabled: boolean;
};
export type BlockchainNetworkConfig = BaseConfig & {
    readonly chain_id: string;
    readonly network_name: string;
    readonly network_type: 'mainnet' | 'testnet' | 'devnet' | 'local';
    readonly consensus_mechanism: 'proof_of_work' | 'proof_of_stake' | 'proof_of_authority' | 'tendermint';
    readonly block_time_seconds: number;
    readonly finality_blocks: number;
    readonly native_currency: {
        readonly symbol: string;
        readonly decimals: number;
        readonly name: string;
    };
};
export type BlockchainNodeConfig = BaseConfig & {
    readonly network: BlockchainNetworkConfig;
    readonly endpoints: {
        readonly rpc: ReadonlyArray<string>;
        readonly rest: ReadonlyArray<string>;
        readonly websocket: ReadonlyArray<string>;
        readonly grpc?: ReadonlyArray<string>;
    };
    readonly load_balancing: {
        readonly strategy: 'round_robin' | 'weighted' | 'least_connections' | 'random';
        readonly health_check_interval_ms: number;
        readonly failure_threshold: number;
        readonly recovery_threshold: number;
    };
    readonly caching: {
        readonly enabled: boolean;
        readonly ttl_seconds: number;
        readonly max_size_mb: number;
        readonly cache_responses: ReadonlyArray<string>;
    };
};
export type BlockCollectorConfig = BaseConfig & {
    readonly node: BlockchainNodeConfig;
    readonly collection: {
        readonly start_block: number | 'latest' | 'earliest';
        readonly end_block?: number | 'latest';
        readonly batch_size: number;
        readonly concurrent_requests: number;
        readonly include_transactions: boolean;
        readonly include_logs: boolean;
        readonly include_traces: boolean;
    };
    readonly filtering: {
        readonly addresses: ReadonlyArray<string>;
        readonly topics: ReadonlyArray<string>;
        readonly contracts: ReadonlyArray<string>;
        readonly transaction_types: ReadonlyArray<string>;
    };
    readonly storage: StorageConfig;
    readonly processing_pipeline: ReadonlyArray<string>;
};
export type TransactionMonitorConfig = BaseConfig & {
    readonly node: BlockchainNodeConfig;
    readonly monitoring: {
        readonly real_time: boolean;
        readonly poll_interval_ms: number;
        readonly confirmation_blocks: number;
        readonly track_mempool: boolean;
    };
    readonly filters: {
        readonly addresses: ReadonlyArray<string>;
        readonly value_range?: {
            readonly min: string;
            readonly max: string;
        };
        readonly gas_price_range?: {
            readonly min: string;
            readonly max: string;
        };
        readonly contract_interactions: boolean;
    };
    readonly notifications: {
        readonly webhook_url?: string;
        readonly email_addresses: ReadonlyArray<string>;
        readonly slack_webhook?: string;
    };
};
export type ExchangeConfig = BaseConfig & {
    readonly exchange_id: string;
    readonly exchange_name: string;
    readonly type: 'cex' | 'dex' | 'hybrid';
    readonly api: HttpClientConfig;
    readonly websocket?: WebSocketConfig;
    readonly supported_features: {
        readonly spot_trading: boolean;
        readonly futures_trading: boolean;
        readonly options_trading: boolean;
        readonly margin_trading: boolean;
        readonly staking: boolean;
        readonly lending: boolean;
    };
    readonly trading_pairs: ReadonlyArray<{
        readonly symbol: string;
        readonly base: string;
        readonly quote: string;
        readonly active: boolean;
        readonly min_order_size: string;
        readonly tick_size: string;
        readonly fee_rate: number;
    }>;
};
export type MarketDataCollectorConfig = BaseConfig & {
    readonly exchange: ExchangeConfig;
    readonly data_types: ReadonlyArray<'ticker' | 'orderbook' | 'trades' | 'ohlcv' | 'funding_rate'>;
    readonly collection: {
        readonly real_time: boolean;
        readonly historical_backfill: boolean;
        readonly backfill_days: number;
        readonly update_interval_ms: number;
        readonly batch_size: number;
    };
    readonly trading_pairs: ReadonlyArray<string>;
    readonly orderbook: {
        readonly depth: number;
        readonly update_frequency_ms: number;
        readonly snapshot_interval_ms: number;
    };
    readonly ohlcv: {
        readonly intervals: ReadonlyArray<'1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'>;
        readonly limit: number;
    };
    readonly storage: StorageConfig;
};
export type DeFiProtocolConfig = BaseConfig & {
    readonly protocol_id: string;
    readonly protocol_name: string;
    readonly category: 'dex' | 'lending' | 'yield_farming' | 'derivatives' | 'insurance' | 'dao';
    readonly blockchain: BlockchainNetworkConfig;
    readonly contracts: ReadonlyArray<{
        readonly name: string;
        readonly address: string;
        readonly abi_path: string;
        readonly deployment_block: number;
        readonly verified: boolean;
    }>;
    readonly token_list: ReadonlyArray<{
        readonly symbol: string;
        readonly address: string;
        readonly decimals: number;
        readonly coingecko_id?: string;
    }>;
};
export type LiquidityPoolMonitorConfig = BaseConfig & {
    readonly protocol: DeFiProtocolConfig;
    readonly pools: ReadonlyArray<{
        readonly pool_id: string;
        readonly address: string;
        readonly token0: string;
        readonly token1: string;
        readonly fee_tier: number;
        readonly active: boolean;
    }>;
    readonly monitoring: {
        readonly price_updates: boolean;
        readonly liquidity_changes: boolean;
        readonly swap_events: boolean;
        readonly yield_calculations: boolean;
        readonly impermanent_loss_tracking: boolean;
    };
    readonly thresholds: {
        readonly min_tvl_usd: number;
        readonly max_price_impact_percent: number;
        readonly liquidity_change_percent: number;
    };
    readonly update_interval_ms: number;
};
export type FeatureExtractionConfig = BaseConfig & {
    readonly data_sources: ReadonlyArray<string>;
    readonly feature_sets: ReadonlyArray<{
        readonly name: string;
        readonly category: 'technical' | 'fundamental' | 'sentiment' | 'on_chain' | 'cross_asset';
        readonly features: ReadonlyArray<string>;
        readonly parameters: ReadonlyRecord<string, unknown>;
        readonly lookback_periods: ReadonlyArray<number>;
    }>;
    readonly time_windows: ReadonlyArray<{
        readonly name: string;
        readonly size_minutes: number;
        readonly overlap_percent: number;
    }>;
    readonly output_format: 'parquet' | 'csv' | 'json' | 'feather';
    readonly storage: StorageConfig;
    readonly scheduling: {
        readonly mode: 'real_time' | 'batch' | 'hybrid';
        readonly batch_interval_minutes: number;
        readonly real_time_delay_ms: number;
    };
};
export type FeaturePipelineConfig = BaseConfig & {
    readonly pipeline: FeaturePipeline;
    readonly execution: {
        readonly engine: 'pandas' | 'polars' | 'spark' | 'dask';
        readonly parallelism: number;
        readonly memory_limit_gb: number;
        readonly checkpoint_interval: number;
    };
    readonly validation: {
        readonly enabled: boolean;
        readonly schema_validation: boolean;
        readonly data_quality_checks: ReadonlyArray<string>;
        readonly drift_detection: boolean;
        readonly outlier_detection: boolean;
    };
    readonly monitoring: {
        readonly execution_metrics: boolean;
        readonly data_lineage: boolean;
        readonly feature_importance: boolean;
        readonly performance_tracking: boolean;
    };
};
export type MLExperimentConfig = BaseConfig & {
    readonly experiment_id: string;
    readonly objective: string;
    readonly dataset_config: {
        readonly dataset_ids: ReadonlyArray<string>;
        readonly split_strategy: 'time_series' | 'random' | 'stratified' | 'group';
        readonly train_ratio: number;
        readonly validation_ratio: number;
        readonly test_ratio: number;
        readonly cross_validation: {
            readonly enabled: boolean;
            readonly folds: number;
            readonly strategy: 'k_fold' | 'time_series' | 'group';
        };
    };
    readonly feature_selection: {
        readonly enabled: boolean;
        readonly method: 'correlation' | 'mutual_info' | 'recursive_elimination' | 'lasso' | 'random_forest';
        readonly max_features: number;
        readonly threshold: number;
    };
    readonly models: ReadonlyArray<{
        readonly model_type: ModelType;
        readonly hyperparameters: ReadonlyRecord<string, unknown>;
        readonly training_config: TrainingConfig;
    }>;
    readonly evaluation: {
        readonly metrics: ReadonlyArray<string>;
        readonly custom_metrics: ReadonlyArray<{
            readonly name: string;
            readonly function_path: string;
        }>;
        readonly threshold_metrics: ReadonlyRecord<string, number>;
    };
    readonly tracking: {
        readonly mlflow_enabled: boolean;
        readonly wandb_enabled: boolean;
        readonly tensorboard_enabled: boolean;
        readonly custom_logger?: string;
    };
};
export type ModelDeploymentConfig = BaseConfig & {
    readonly model_id: string;
    readonly deployment_target: 'local' | 'docker' | 'kubernetes' | 'lambda' | 'sagemaker' | 'vertex_ai';
    readonly compute_resources: {
        readonly cpu_cores: number;
        readonly memory_gb: number;
        readonly gpu_count?: number;
        readonly gpu_type?: string;
    };
    readonly scaling: {
        readonly auto_scaling: boolean;
        readonly min_instances: number;
        readonly max_instances: number;
        readonly target_cpu_percent: number;
        readonly scale_up_cooldown_seconds: number;
        readonly scale_down_cooldown_seconds: number;
    };
    readonly monitoring: {
        readonly prediction_logging: boolean;
        readonly performance_monitoring: boolean;
        readonly drift_detection: boolean;
        readonly alert_thresholds: ReadonlyRecord<string, number>;
    };
    readonly security: {
        readonly authentication_required: boolean;
        readonly rate_limiting: {
            readonly requests_per_minute: number;
            readonly burst_capacity: number;
        };
        readonly input_validation: boolean;
        readonly output_sanitization: boolean;
    };
};
export type HealthCheckConfig = BaseConfig & {
    readonly checks: ReadonlyArray<{
        readonly name: string;
        readonly type: 'http' | 'tcp' | 'database' | 'disk' | 'memory' | 'custom';
        readonly endpoint?: string;
        readonly query?: string;
        readonly threshold?: number;
        readonly timeout_ms: number;
        readonly interval_ms: number;
        readonly retries: number;
    }>;
    readonly reporting: {
        readonly prometheus_enabled: boolean;
        readonly influxdb_enabled: boolean;
        readonly custom_endpoint?: string;
    };
};
export type AlertConfig = BaseConfig & {
    readonly rules: ReadonlyArray<{
        readonly name: string;
        readonly condition: string;
        readonly severity: 'info' | 'warning' | 'error' | 'critical';
        readonly threshold: number;
        readonly duration_minutes: number;
        readonly cooldown_minutes: number;
    }>;
    readonly channels: ReadonlyArray<{
        readonly name: string;
        readonly type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';
        readonly config: ReadonlyRecord<string, unknown>;
        readonly severity_filter: ReadonlyArray<string>;
    }>;
    readonly escalation: {
        readonly enabled: boolean;
        readonly levels: ReadonlyArray<{
            readonly after_minutes: number;
            readonly channels: ReadonlyArray<string>;
        }>;
    };
};
export type SystemConfiguration = BaseConfig & {
    readonly environment: Environment;
    readonly debug_mode: boolean;
    readonly log_level: LogLevel;
    readonly databases: ReadonlyArray<DatabaseConfig>;
    readonly storage: ReadonlyArray<StorageConfig>;
    readonly http_clients: ReadonlyArray<HttpClientConfig>;
    readonly websockets: ReadonlyArray<WebSocketConfig>;
    readonly blockchain_networks: ReadonlyArray<BlockchainNetworkConfig>;
    readonly blockchain_nodes: ReadonlyArray<BlockchainNodeConfig>;
    readonly block_collectors: ReadonlyArray<BlockCollectorConfig>;
    readonly transaction_monitors: ReadonlyArray<TransactionMonitorConfig>;
    readonly exchanges: ReadonlyArray<ExchangeConfig>;
    readonly market_data_collectors: ReadonlyArray<MarketDataCollectorConfig>;
    readonly defi_protocols: ReadonlyArray<DeFiProtocolConfig>;
    readonly liquidity_pool_monitors: ReadonlyArray<LiquidityPoolMonitorConfig>;
    readonly feature_extractors: ReadonlyArray<FeatureExtractionConfig>;
    readonly feature_pipelines: ReadonlyArray<FeaturePipelineConfig>;
    readonly ml_experiments: ReadonlyArray<MLExperimentConfig>;
    readonly model_deployments: ReadonlyArray<ModelDeploymentConfig>;
    readonly health_checks: ReadonlyArray<HealthCheckConfig>;
    readonly alerts: ReadonlyArray<AlertConfig>;
    readonly sei_specific?: {
        readonly node_config: SeiNodeConfig;
        readonly dex_monitor_config: SeiDexMonitorConfig;
    };
};
export type ConfigValidationError = {
    readonly field_path: string;
    readonly error_code: string;
    readonly message: string;
    readonly suggested_value?: unknown;
};
export type ConfigValidationResult = {
    readonly success: boolean;
    readonly data?: SystemConfiguration;
    readonly errors?: ReadonlyArray<ConfigValidationError>;
};
export type ConfigSchema = {
    readonly schema_version: string;
    readonly required_fields: ReadonlyArray<string>;
    readonly field_types: ReadonlyRecord<string, string>;
    readonly validation_rules: ReadonlyArray<{
        readonly field: string;
        readonly rule: string;
        readonly parameters: ReadonlyRecord<string, unknown>;
    }>;
    readonly dependencies: ReadonlyArray<{
        readonly field: string;
        readonly depends_on: ReadonlyArray<string>;
        readonly condition: string;
    }>;
};
export type ConfigSource = 'file' | 'environment' | 'consul' | 'etcd' | 'kubernetes' | 'database' | 'remote_url';
export type ConfigProvider = {
    readonly source: ConfigSource;
    readonly priority: number;
    readonly watch_enabled: boolean;
    readonly refresh_interval_ms: number;
    readonly config: ReadonlyRecord<string, unknown>;
};
export type ConfigChangeEvent = {
    readonly event_id: string;
    readonly timestamp: Timestamp;
    readonly source: ConfigSource;
    readonly field_path: string;
    readonly old_value: unknown;
    readonly new_value: unknown;
    readonly change_type: 'created' | 'updated' | 'deleted';
    readonly metadata: ReadonlyRecord<string, unknown>;
};
export type FeatureFlags = ReadonlyRecord<string, {
    readonly enabled: boolean;
    readonly rollout_percentage: number;
    readonly conditions: ReadonlyArray<{
        readonly field: string;
        readonly operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'not_in';
        readonly value: unknown;
    }>;
    readonly metadata: ReadonlyRecord<string, unknown>;
}>;
export type CircuitBreakerConfig = {
    readonly failure_threshold: number;
    readonly recovery_timeout_ms: number;
    readonly request_volume_threshold: number;
    readonly error_threshold_percentage: number;
    readonly sleep_window_ms: number;
};
export type ResourceLimits = {
    readonly max_memory_mb: number;
    readonly max_cpu_percent: number;
    readonly max_disk_gb: number;
    readonly max_network_mbps: number;
    readonly max_open_files: number;
    readonly max_concurrent_operations: number;
};
export declare const createDefaultConfig: (environment: Environment) => Partial<SystemConfiguration>;
export declare const mergeConfigs: <T extends BaseConfig>(base: T, override: Partial<T>) => T;
export declare const isDatabaseConfig: (config: unknown) => config is DatabaseConfig;
export declare const isExchangeConfig: (config: unknown) => config is ExchangeConfig;
export declare const isMLExperimentConfig: (config: unknown) => config is MLExperimentConfig;
//# sourceMappingURL=config.d.ts.map