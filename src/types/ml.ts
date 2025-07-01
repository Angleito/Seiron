/**
 * @fileoverview Machine learning dataset types optimized for OpenAI training
 * Includes feature engineering, dataset preparation, and model training types
 */

import type {
  Timestamp,
  TimeRange,
  ReadonlyRecord,
  Result
} from './data.js';

/**
 * Base ML types
 */

/** Numeric feature value */
export type FeatureValue = number;

/** Feature vector - array of numeric values */
export type FeatureVector = ReadonlyArray<FeatureValue>;

/** Feature name identifier */
export type FeatureName = string;

/** Named feature map */
export type FeatureMap = ReadonlyRecord<FeatureName, FeatureValue>;

/** Label for supervised learning */
export type Label = number | string | boolean;

/** Multi-class labels */
export type MultiClassLabel = ReadonlyArray<Label>;

/**
 * Feature engineering types
 */

/** Feature transformation type */
export type FeatureTransformType = 
  | 'normalize'
  | 'standardize'
  | 'log'
  | 'sqrt'
  | 'reciprocal'
  | 'box_cox'
  | 'yeo_johnson'
  | 'quantile_uniform'
  | 'quantile_normal'
  | 'power'
  | 'polynomial'
  | 'interaction'
  | 'binning'
  | 'one_hot'
  | 'target_encode'
  | 'frequency_encode';

/** Feature transformation configuration */
export type FeatureTransform = {
  readonly type: FeatureTransformType;
  readonly input_features: ReadonlyArray<FeatureName>;
  readonly output_feature: FeatureName;
  readonly parameters: ReadonlyRecord<string, unknown>;
  readonly fitted_parameters?: ReadonlyRecord<string, unknown>;
};

/** Feature importance score */
export type FeatureImportance = {
  readonly feature_name: FeatureName;
  readonly importance_score: number;
  readonly rank: number;
  readonly method: 'permutation' | 'shap' | 'mutual_info' | 'correlation' | 'chi2' | 'f_score';
};

/** Feature statistics */
export type FeatureStats = {
  readonly feature_name: FeatureName;
  readonly count: number;
  readonly mean: number;
  readonly std: number;
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q25: number;
  readonly q75: number;
  readonly skewness: number;
  readonly kurtosis: number;
  readonly missing_count: number;
  readonly unique_count: number;
  readonly outlier_count: number;
};

/**
 * Time series feature types
 */

/** Time-based feature window */
export type TimeWindow = {
  readonly size: number; // number of time steps
  readonly shift: number; // steps to shift (lag)
  readonly stride: number; // step size
};

/** Technical indicator features */
export type TechnicalFeatures = {
  readonly sma: ReadonlyRecord<number, FeatureValue>; // Simple Moving Average by period
  readonly ema: ReadonlyRecord<number, FeatureValue>; // Exponential Moving Average
  readonly rsi: ReadonlyRecord<number, FeatureValue>; // RSI by period
  readonly macd: {
    readonly line: FeatureValue;
    readonly signal: FeatureValue;
    readonly histogram: FeatureValue;
  };
  readonly bollinger_bands: {
    readonly upper: FeatureValue;
    readonly middle: FeatureValue;
    readonly lower: FeatureValue;
    readonly width: FeatureValue;
    readonly position: FeatureValue; // (price - lower) / (upper - lower)
  };
  readonly stochastic: {
    readonly k: FeatureValue;
    readonly d: FeatureValue;
  };
  readonly atr: ReadonlyRecord<number, FeatureValue>; // Average True Range
  readonly adx: FeatureValue; // Average Directional Index
  readonly cci: FeatureValue; // Commodity Channel Index
  readonly williams_r: FeatureValue;
  readonly momentum: ReadonlyRecord<number, FeatureValue>;
  readonly roc: ReadonlyRecord<number, FeatureValue>; // Rate of Change
};

/** Market microstructure features */
export type MicrostructureFeatures = {
  readonly bid_ask_spread: FeatureValue;
  readonly mid_price: FeatureValue;
  readonly weighted_mid_price: FeatureValue;
  readonly order_book_imbalance: FeatureValue;
  readonly effective_spread: FeatureValue;
  readonly realized_spread: FeatureValue;
  readonly price_impact: FeatureValue;
  readonly volume_weighted_price: FeatureValue;
  readonly arrival_rate: FeatureValue;
  readonly cancelation_rate: FeatureValue;
  readonly fill_rate: FeatureValue;
};

/** Volatility features */
export type VolatilityFeatures = {
  readonly realized_volatility: ReadonlyRecord<number, FeatureValue>; // by window
  readonly garch_volatility: FeatureValue;
  readonly parkinson_volatility: FeatureValue;
  readonly garman_klass_volatility: FeatureValue;
  readonly rogers_satchell_volatility: FeatureValue;
  readonly yang_zhang_volatility: FeatureValue;
  readonly volatility_of_volatility: FeatureValue;
  readonly volatility_skew: FeatureValue;
  readonly volatility_smile: ReadonlyArray<{
    readonly strike: FeatureValue;
    readonly volatility: FeatureValue;
  }>;
};

/**
 * Cross-sectional features
 */

/** Market regime features */
export type MarketRegimeFeatures = {
  readonly trend_strength: FeatureValue;
  readonly market_phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  readonly volatility_regime: 'low' | 'medium' | 'high';
  readonly liquidity_regime: 'tight' | 'normal' | 'stressed';
  readonly correlation_regime: FeatureValue;
  readonly risk_on_off: FeatureValue; // risk-on vs risk-off sentiment
};

/** Cross-asset features */
export type CrossAssetFeatures = {
  readonly correlations: ReadonlyRecord<string, FeatureValue>; // correlations with other assets
  readonly beta: ReadonlyRecord<string, FeatureValue>; // beta relative to benchmarks
  readonly relative_strength: ReadonlyRecord<string, FeatureValue>;
  readonly pair_ratios: ReadonlyRecord<string, FeatureValue>; // price ratios
  readonly spread_features: ReadonlyRecord<string, FeatureValue>; // spread features
};

/** Fundamental features */
export type FundamentalFeatures = {
  readonly market_cap: FeatureValue;
  readonly volume_to_market_cap: FeatureValue;
  readonly circulating_supply: FeatureValue;
  readonly total_supply: FeatureValue;
  readonly max_supply?: FeatureValue;
  readonly inflation_rate?: FeatureValue;
  readonly staking_ratio?: FeatureValue;
  readonly active_addresses: FeatureValue;
  readonly transaction_count: FeatureValue;
  readonly network_value_to_transactions: FeatureValue;
  readonly mvrv_ratio?: FeatureValue; // Market Value to Realized Value
  readonly nvt_ratio: FeatureValue; // Network Value to Transactions
};

/**
 * Feature engineering pipeline types
 */

/** Feature pipeline step */
export type FeaturePipelineStep = {
  readonly step_id: string;
  readonly name: string;
  readonly transform: FeatureTransform;
  readonly dependencies: ReadonlyArray<string>; // step_ids this depends on
  readonly enabled: boolean;
  readonly validation_config?: {
    readonly check_null: boolean;
    readonly check_infinite: boolean;
    readonly check_range?: {
      readonly min: number;
      readonly max: number;
    };
  };
};

/** Feature engineering pipeline */
export type FeaturePipeline = {
  readonly pipeline_id: string;
  readonly name: string;
  readonly version: string;
  readonly steps: ReadonlyArray<FeaturePipelineStep>;
  readonly input_schema: ReadonlyRecord<string, 'number' | 'string' | 'boolean'>;
  readonly output_schema: ReadonlyRecord<string, 'number' | 'string' | 'boolean'>;
  readonly metadata: {
    readonly created_at: Timestamp;
    readonly created_by: string;
    readonly description: string;
    readonly tags: ReadonlyArray<string>;
  };
};

/**
 * Dataset types
 */

/** Training example for supervised learning */
export type TrainingExample = {
  readonly features: FeatureMap;
  readonly label: Label;
  readonly weight?: number;
  readonly metadata?: ReadonlyRecord<string, unknown>;
};

/** Training dataset */
export type TrainingDataset = {
  readonly dataset_id: string;
  readonly name: string;
  readonly version: string;
  readonly examples: ReadonlyArray<TrainingExample>;
  readonly feature_names: ReadonlyArray<FeatureName>;
  readonly label_name: string;
  readonly dataset_stats: {
    readonly total_examples: number;
    readonly feature_count: number;
    readonly missing_values_count: number;
    readonly class_distribution?: ReadonlyRecord<string, number>;
  };
  readonly splits: {
    readonly train_indices: ReadonlyArray<number>;
    readonly validation_indices: ReadonlyArray<number>;
    readonly test_indices: ReadonlyArray<number>;
  };
  readonly metadata: {
    readonly created_at: Timestamp;
    readonly data_source: string;
    readonly feature_pipeline_id: string;
    readonly time_range: TimeRange;
    readonly description: string;
  };
};

/** Time series dataset */
export type TimeSeriesDataset = {
  readonly dataset_id: string;
  readonly name: string;
  readonly sequences: ReadonlyArray<{
    readonly sequence_id: string;
    readonly timestamps: ReadonlyArray<Timestamp>;
    readonly features: ReadonlyArray<FeatureMap>;
    readonly labels: ReadonlyArray<Label>;
  }>;
  readonly window_config: {
    readonly input_window_size: number;
    readonly output_window_size: number;
    readonly stride: number;
    readonly prediction_horizon: number;
  };
  readonly metadata: {
    readonly created_at: Timestamp;
    readonly sampling_frequency: string; // e.g., '1min', '5min', '1h'
    readonly total_sequences: number;
    readonly total_timesteps: number;
  };
};

/**
 * OpenAI-specific types
 */

/** OpenAI fine-tuning format */
export type OpenAITrainingExample = {
  readonly messages: ReadonlyArray<{
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
  }>;
};

/** OpenAI dataset for fine-tuning */
export type OpenAIDataset = {
  readonly dataset_id: string;
  readonly name: string;
  readonly examples: ReadonlyArray<OpenAITrainingExample>;
  readonly validation_examples?: ReadonlyArray<OpenAITrainingExample>;
  readonly metadata: {
    readonly created_at: Timestamp;
    readonly total_examples: number;
    readonly average_message_length: number;
    readonly task_type: 'classification' | 'regression' | 'generation' | 'completion';
    readonly domain: string;
  };
};

/** OpenAI completion format */
export type OpenAICompletion = {
  readonly prompt: string;
  readonly completion: string;
  readonly metadata?: ReadonlyRecord<string, unknown>;
};

/** OpenAI embedding dataset */
export type OpenAIEmbeddingDataset = {
  readonly dataset_id: string;
  readonly embeddings: ReadonlyArray<{
    readonly text: string;
    readonly embedding: ReadonlyArray<number>;
    readonly metadata?: ReadonlyRecord<string, unknown>;
  }>;
  readonly model_name: string;
  readonly embedding_dimension: number;
  readonly created_at: Timestamp;
};

/**
 * Model training types
 */

/** Model type */
export type ModelType = 
  | 'linear_regression'
  | 'logistic_regression'
  | 'random_forest'
  | 'gradient_boosting'
  | 'xgboost'
  | 'lightgbm'
  | 'neural_network'
  | 'transformer'
  | 'lstm'
  | 'gru'
  | 'cnn'
  | 'autoencoder'
  | 'vae'
  | 'gan';

/** Hyperparameter configuration */
export type HyperparameterConfig = ReadonlyRecord<string, 
  | number 
  | string 
  | boolean 
  | ReadonlyArray<number>
  | ReadonlyArray<string>
>;

/** Training configuration */
export type TrainingConfig = {
  readonly model_type: ModelType;
  readonly hyperparameters: HyperparameterConfig;
  readonly training_params: {
    readonly epochs: number;
    readonly batch_size: number;
    readonly learning_rate: number;
    readonly early_stopping: boolean;
    readonly patience: number;
    readonly validation_split: number;
    readonly shuffle: boolean;
    readonly random_seed: number;
  };
  readonly regularization: {
    readonly l1_weight: number;
    readonly l2_weight: number;
    readonly dropout_rate: number;
    readonly batch_norm: boolean;
  };
  readonly optimization: {
    readonly optimizer: 'adam' | 'sgd' | 'rmsprop' | 'adagrad';
    readonly momentum?: number;
    readonly beta1?: number;
    readonly beta2?: number;
    readonly epsilon?: number;
  };
};

/** Model metrics */
export type ModelMetrics = {
  readonly accuracy?: number;
  readonly precision?: number;
  readonly recall?: number;
  readonly f1_score?: number;
  readonly auc_roc?: number;
  readonly auc_pr?: number;
  readonly mae?: number; // Mean Absolute Error
  readonly mse?: number; // Mean Squared Error
  readonly rmse?: number; // Root Mean Squared Error
  readonly mape?: number; // Mean Absolute Percentage Error
  readonly r2_score?: number;
  readonly sharpe_ratio?: number;
  readonly max_drawdown?: number;
  readonly information_ratio?: number;
  readonly calmar_ratio?: number;
  readonly custom_metrics?: ReadonlyRecord<string, number>;
};

/** Model evaluation result */
export type ModelEvaluation = {
  readonly model_id: string;
  readonly dataset_id: string;
  readonly metrics: ModelMetrics;
  readonly confusion_matrix?: ReadonlyArray<ReadonlyArray<number>>;
  readonly feature_importance?: ReadonlyArray<FeatureImportance>;
  readonly predictions: ReadonlyArray<{
    readonly actual: Label;
    readonly predicted: Label;
    readonly probability?: number;
    readonly confidence?: number;
  }>;
  readonly cross_validation_scores?: ReadonlyArray<ModelMetrics>;
  readonly evaluation_timestamp: Timestamp;
};

/**
 * Model deployment types
 */

/** Model version */
export type ModelVersion = {
  readonly version_id: string;
  readonly model_id: string;
  readonly version_number: string;
  readonly created_at: Timestamp;
  readonly training_config: TrainingConfig;
  readonly training_dataset_id: string;
  readonly evaluation: ModelEvaluation;
  readonly model_artifact_path: string;
  readonly feature_pipeline_id: string;
  readonly status: 'training' | 'completed' | 'failed' | 'deployed' | 'archived';
};

/** Model inference request */
export type InferenceRequest = {
  readonly request_id: string;
  readonly model_id: string;
  readonly model_version?: string;
  readonly features: FeatureMap;
  readonly return_probabilities: boolean;
  readonly return_feature_importance: boolean;
  readonly timestamp: Timestamp;
};

/** Model inference response */
export type InferenceResponse = {
  readonly request_id: string;
  readonly prediction: Label;
  readonly probability?: number;
  readonly confidence?: number;
  readonly feature_importance?: ReadonlyArray<FeatureImportance>;
  readonly model_version: string;
  readonly processing_time_ms: number;
  readonly timestamp: Timestamp;
};

/**
 * ML pipeline types
 */

/** ML pipeline stage */
export type MLPipelineStage = 
  | 'data_collection'
  | 'feature_engineering'
  | 'data_validation'
  | 'model_training'
  | 'model_evaluation'
  | 'model_deployment'
  | 'monitoring';

/** ML pipeline status */
export type MLPipelineStatus = 
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/** ML pipeline run */
export type MLPipelineRun = {
  readonly run_id: string;
  readonly pipeline_id: string;
  readonly status: MLPipelineStatus;
  readonly current_stage: MLPipelineStage;
  readonly start_time: Timestamp;
  readonly end_time?: Timestamp;
  readonly duration_ms?: number;
  readonly stages: ReadonlyRecord<MLPipelineStage, {
    readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    readonly start_time?: Timestamp;
    readonly end_time?: Timestamp;
    readonly error_message?: string;
    readonly artifacts?: ReadonlyArray<string>;
  }>;
  readonly parameters: ReadonlyRecord<string, unknown>;
  readonly artifacts: ReadonlyArray<{
    readonly name: string;
    readonly type: 'dataset' | 'model' | 'feature_pipeline' | 'evaluation' | 'report';
    readonly path: string;
    readonly metadata?: ReadonlyRecord<string, unknown>;
  }>;
};

/**
 * Feature store types
 */

/** Feature store entity */
export type FeatureEntity = {
  readonly entity_id: string;
  readonly name: string;
  readonly description: string;
  readonly join_keys: ReadonlyArray<string>;
  readonly value_type: 'string' | 'int32' | 'int64' | 'double' | 'float' | 'bool' | 'bytes';
};

/** Feature view */
export type FeatureView = {
  readonly view_id: string;
  readonly name: string;
  readonly entities: ReadonlyArray<string>; // entity names
  readonly features: ReadonlyArray<{
    readonly name: string;
    readonly dtype: string;
    readonly description: string;
  }>;
  readonly ttl?: number; // time to live in seconds
  readonly batch_source?: string;
  readonly stream_source?: string;
  readonly tags?: ReadonlyRecord<string, string>;
};

/** Feature service */
export type FeatureService = {
  readonly service_id: string;
  readonly name: string;
  readonly features: ReadonlyArray<{
    readonly feature_view: string;
    readonly feature_name: string;
  }>;
  readonly description: string;
  readonly tags?: ReadonlyRecord<string, string>;
};

/**
 * Data quality and validation types
 */

/** Data quality check */
export type DataQualityCheck = {
  readonly check_id: string;
  readonly name: string;
  readonly check_type: 'completeness' | 'uniqueness' | 'validity' | 'consistency' | 'accuracy' | 'freshness';
  readonly severity: 'error' | 'warning' | 'info';
  readonly threshold?: number;
  readonly query: string;
  readonly description: string;
};

/** Data quality result */
export type DataQualityResult = {
  readonly check_id: string;
  readonly dataset_id: string;
  readonly passed: boolean;
  readonly score: number;
  readonly threshold: number;
  readonly message: string;
  readonly timestamp: Timestamp;
  readonly details?: ReadonlyRecord<string, unknown>;
};

/** Dataset validation report */
export type DatasetValidationReport = {
  readonly dataset_id: string;
  readonly validation_timestamp: Timestamp;
  readonly overall_score: number;
  readonly passed_checks: number;
  readonly total_checks: number;
  readonly check_results: ReadonlyArray<DataQualityResult>;
  readonly feature_drift?: ReadonlyArray<{
    readonly feature_name: string;
    readonly drift_score: number;
    readonly threshold: number;
    readonly drift_detected: boolean;
  }>;
  readonly recommendations: ReadonlyArray<string>;
};

/**
 * Monitoring and alerting types
 */

/** Model performance monitoring */
export type ModelMonitoring = {
  readonly model_id: string;
  readonly monitoring_window: TimeRange;
  readonly prediction_count: number;
  readonly average_confidence: number;
  readonly performance_metrics: ModelMetrics;
  readonly drift_detection: {
    readonly feature_drift_score: number;
    readonly concept_drift_score: number;
    readonly drift_detected: boolean;
  };
  readonly alerts: ReadonlyArray<{
    readonly alert_type: 'performance_degradation' | 'data_drift' | 'prediction_anomaly';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly message: string;
    readonly timestamp: Timestamp;
  }>;
};

/**
 * Export types for different ML frameworks
 */

/** Export format */
export type ExportFormat = 
  | 'sklearn_pickle'
  | 'joblib'
  | 'onnx'
  | 'tensorflow_savedmodel'
  | 'pytorch_statedict'
  | 'lightgbm_txt'
  | 'xgboost_json'
  | 'openai_jsonl'
  | 'huggingface_transformers';

/** Model export configuration */
export type ModelExportConfig = {
  readonly export_format: ExportFormat;
  readonly include_preprocessing: boolean;
  readonly include_postprocessing: boolean;
  readonly compression: boolean;
  readonly metadata: ReadonlyRecord<string, unknown>;
  readonly target_platform?: 'cpu' | 'gpu' | 'tpu' | 'edge';
};

/**
 * Type utilities and helpers
 */

/** Extract feature names from feature map */
export type ExtractFeatureNames<T extends FeatureMap> = keyof T;

/** Create strongly typed feature map */
export type TypedFeatureMap<T extends ReadonlyRecord<string, number>> = T;

/** ML result with error handling */
export type MLResult<T> = Result<T, MLError>;

/** ML error types */
export type MLError = 
  | { readonly type: 'feature_error'; readonly message: string; readonly feature: string }
  | { readonly type: 'model_error'; readonly message: string; readonly model_id?: string }
  | { readonly type: 'data_error'; readonly message: string; readonly dataset_id?: string }
  | { readonly type: 'validation_error'; readonly message: string; readonly check_id?: string }
  | { readonly type: 'pipeline_error'; readonly message: string; readonly stage?: MLPipelineStage };

/**
 * Type guards for ML types
 */

/** Type guard for training example */
export const isTrainingExample = (obj: unknown): obj is TrainingExample =>
  typeof obj === 'object' &&
  obj !== null &&
  'features' in obj &&
  'label' in obj;

/** Type guard for feature map */
export const isFeatureMap = (obj: unknown): obj is FeatureMap =>
  typeof obj === 'object' &&
  obj !== null &&
  Object.values(obj).every(v => typeof v === 'number');