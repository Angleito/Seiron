import type { Timestamp, TimeRange, ReadonlyRecord, Result } from './data.js';
export type FeatureValue = number;
export type FeatureVector = ReadonlyArray<FeatureValue>;
export type FeatureName = string;
export type FeatureMap = ReadonlyRecord<FeatureName, FeatureValue>;
export type Label = number | string | boolean;
export type MultiClassLabel = ReadonlyArray<Label>;
export type FeatureTransformType = 'normalize' | 'standardize' | 'log' | 'sqrt' | 'reciprocal' | 'box_cox' | 'yeo_johnson' | 'quantile_uniform' | 'quantile_normal' | 'power' | 'polynomial' | 'interaction' | 'binning' | 'one_hot' | 'target_encode' | 'frequency_encode';
export type FeatureTransform = {
    readonly type: FeatureTransformType;
    readonly input_features: ReadonlyArray<FeatureName>;
    readonly output_feature: FeatureName;
    readonly parameters: ReadonlyRecord<string, unknown>;
    readonly fitted_parameters?: ReadonlyRecord<string, unknown>;
};
export type FeatureImportance = {
    readonly feature_name: FeatureName;
    readonly importance_score: number;
    readonly rank: number;
    readonly method: 'permutation' | 'shap' | 'mutual_info' | 'correlation' | 'chi2' | 'f_score';
};
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
export type TimeWindow = {
    readonly size: number;
    readonly shift: number;
    readonly stride: number;
};
export type TechnicalFeatures = {
    readonly sma: ReadonlyRecord<number, FeatureValue>;
    readonly ema: ReadonlyRecord<number, FeatureValue>;
    readonly rsi: ReadonlyRecord<number, FeatureValue>;
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
        readonly position: FeatureValue;
    };
    readonly stochastic: {
        readonly k: FeatureValue;
        readonly d: FeatureValue;
    };
    readonly atr: ReadonlyRecord<number, FeatureValue>;
    readonly adx: FeatureValue;
    readonly cci: FeatureValue;
    readonly williams_r: FeatureValue;
    readonly momentum: ReadonlyRecord<number, FeatureValue>;
    readonly roc: ReadonlyRecord<number, FeatureValue>;
};
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
export type VolatilityFeatures = {
    readonly realized_volatility: ReadonlyRecord<number, FeatureValue>;
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
export type MarketRegimeFeatures = {
    readonly trend_strength: FeatureValue;
    readonly market_phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
    readonly volatility_regime: 'low' | 'medium' | 'high';
    readonly liquidity_regime: 'tight' | 'normal' | 'stressed';
    readonly correlation_regime: FeatureValue;
    readonly risk_on_off: FeatureValue;
};
export type CrossAssetFeatures = {
    readonly correlations: ReadonlyRecord<string, FeatureValue>;
    readonly beta: ReadonlyRecord<string, FeatureValue>;
    readonly relative_strength: ReadonlyRecord<string, FeatureValue>;
    readonly pair_ratios: ReadonlyRecord<string, FeatureValue>;
    readonly spread_features: ReadonlyRecord<string, FeatureValue>;
};
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
    readonly mvrv_ratio?: FeatureValue;
    readonly nvt_ratio: FeatureValue;
};
export type FeaturePipelineStep = {
    readonly step_id: string;
    readonly name: string;
    readonly transform: FeatureTransform;
    readonly dependencies: ReadonlyArray<string>;
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
export type TrainingExample = {
    readonly features: FeatureMap;
    readonly label: Label;
    readonly weight?: number;
    readonly metadata?: ReadonlyRecord<string, unknown>;
};
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
        readonly sampling_frequency: string;
        readonly total_sequences: number;
        readonly total_timesteps: number;
    };
};
export type OpenAITrainingExample = {
    readonly messages: ReadonlyArray<{
        readonly role: 'system' | 'user' | 'assistant';
        readonly content: string;
    }>;
};
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
export type OpenAICompletion = {
    readonly prompt: string;
    readonly completion: string;
    readonly metadata?: ReadonlyRecord<string, unknown>;
};
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
export type ModelType = 'linear_regression' | 'logistic_regression' | 'random_forest' | 'gradient_boosting' | 'xgboost' | 'lightgbm' | 'neural_network' | 'transformer' | 'lstm' | 'gru' | 'cnn' | 'autoencoder' | 'vae' | 'gan';
export type HyperparameterConfig = ReadonlyRecord<string, number | string | boolean | ReadonlyArray<number> | ReadonlyArray<string>>;
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
export type ModelMetrics = {
    readonly accuracy?: number;
    readonly precision?: number;
    readonly recall?: number;
    readonly f1_score?: number;
    readonly auc_roc?: number;
    readonly auc_pr?: number;
    readonly mae?: number;
    readonly mse?: number;
    readonly rmse?: number;
    readonly mape?: number;
    readonly r2_score?: number;
    readonly sharpe_ratio?: number;
    readonly max_drawdown?: number;
    readonly information_ratio?: number;
    readonly calmar_ratio?: number;
    readonly custom_metrics?: ReadonlyRecord<string, number>;
};
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
export type InferenceRequest = {
    readonly request_id: string;
    readonly model_id: string;
    readonly model_version?: string;
    readonly features: FeatureMap;
    readonly return_probabilities: boolean;
    readonly return_feature_importance: boolean;
    readonly timestamp: Timestamp;
};
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
export type MLPipelineStage = 'data_collection' | 'feature_engineering' | 'data_validation' | 'model_training' | 'model_evaluation' | 'model_deployment' | 'monitoring';
export type MLPipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
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
export type FeatureEntity = {
    readonly entity_id: string;
    readonly name: string;
    readonly description: string;
    readonly join_keys: ReadonlyArray<string>;
    readonly value_type: 'string' | 'int32' | 'int64' | 'double' | 'float' | 'bool' | 'bytes';
};
export type FeatureView = {
    readonly view_id: string;
    readonly name: string;
    readonly entities: ReadonlyArray<string>;
    readonly features: ReadonlyArray<{
        readonly name: string;
        readonly dtype: string;
        readonly description: string;
    }>;
    readonly ttl?: number;
    readonly batch_source?: string;
    readonly stream_source?: string;
    readonly tags?: ReadonlyRecord<string, string>;
};
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
export type DataQualityCheck = {
    readonly check_id: string;
    readonly name: string;
    readonly check_type: 'completeness' | 'uniqueness' | 'validity' | 'consistency' | 'accuracy' | 'freshness';
    readonly severity: 'error' | 'warning' | 'info';
    readonly threshold?: number;
    readonly query: string;
    readonly description: string;
};
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
export type ExportFormat = 'sklearn_pickle' | 'joblib' | 'onnx' | 'tensorflow_savedmodel' | 'pytorch_statedict' | 'lightgbm_txt' | 'xgboost_json' | 'openai_jsonl' | 'huggingface_transformers';
export type ModelExportConfig = {
    readonly export_format: ExportFormat;
    readonly include_preprocessing: boolean;
    readonly include_postprocessing: boolean;
    readonly compression: boolean;
    readonly metadata: ReadonlyRecord<string, unknown>;
    readonly target_platform?: 'cpu' | 'gpu' | 'tpu' | 'edge';
};
export type ExtractFeatureNames<T extends FeatureMap> = keyof T;
export type TypedFeatureMap<T extends ReadonlyRecord<string, number>> = T;
export type MLResult<T> = Result<T, MLError>;
export type MLError = {
    readonly type: 'feature_error';
    readonly message: string;
    readonly feature: string;
} | {
    readonly type: 'model_error';
    readonly message: string;
    readonly model_id?: string;
} | {
    readonly type: 'data_error';
    readonly message: string;
    readonly dataset_id?: string;
} | {
    readonly type: 'validation_error';
    readonly message: string;
    readonly check_id?: string;
} | {
    readonly type: 'pipeline_error';
    readonly message: string;
    readonly stage?: MLPipelineStage;
};
export declare const isTrainingExample: (obj: unknown) => obj is TrainingExample;
export declare const isFeatureMap: (obj: unknown) => obj is FeatureMap;
//# sourceMappingURL=ml.d.ts.map