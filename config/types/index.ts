// Configuration Types for Sei Data Collection System

export interface SeiNetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  cosmosRpcUrl: string;
  restUrl: string;
  explorerUrl: string;
  blockTime: number;
  gasPrice: string;
  currency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
  features: {
    evm: boolean;
    cosmwasm: boolean;
    ibc: boolean;
  };
  endpoints: {
    websocket: string;
    grpc: string;
  };
}

export interface SeiConfig {
  networks: {
    mainnet: SeiNetworkConfig;
    testnet: SeiNetworkConfig;
    devnet: SeiNetworkConfig;
  };
  defaults: {
    network: string;
    timeout: number;
    retries: number;
    backoff: string;
  };
  contracts: {
    [network: string]: {
      dexFactory: string;
      multicall: string;
      priceOracle: string;
    };
  };
}

export interface PriceFeed {
  name: string;
  priority: number;
  endpoint: string;
  timeout: number;
}

export interface Asset {
  symbol: string;
  coingeckoId: string;
  pythId: string;
  decimals: number;
}

export interface Protocol {
  name: string;
  type: string;
  factoryAddress?: string;
  contractAddress?: string;
  enabled: boolean;
  priority: number;
}

export interface CollectorsConfig {
  chain: {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    blockRange: number;
    startBlock: string;
    confirmations: number;
    eventFilters: string[];
    contractAddresses: {
      whitelist: string[];
      blacklist: string[];
    };
    gasTracking: {
      enabled: boolean;
      threshold: number;
    };
    mempool: {
      enabled: boolean;
      maxTxs: number;
    };
  };
  market: {
    updateInterval: number;
    priceFeeds: PriceFeed[];
    assets: Asset[];
    timeframes: string[];
    rateLimits: {
      [provider: string]: {
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerSecond?: number;
      };
    };
    caching: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
  };
  defi: {
    protocols: Protocol[];
    refreshInterval: number;
    liquidityThreshold: number;
    volumeThreshold: number;
    metrics: {
      tvl: boolean;
      volume24h: boolean;
      fees: boolean;
      apr: boolean;
      utilization: boolean;
    };
    pools: {
      minLiquidity: number;
      maxPools: number;
      trackInactive: boolean;
    };
  };
  analytics: {
    enabled: boolean;
    batchInterval: number;
    aggregationPeriods: string[];
    metrics: string[];
    storage: {
      type: string;
      retention: string;
      compression: boolean;
    };
  };
  monitoring: {
    healthCheck: {
      enabled: boolean;
      interval: number;
      endpoints: string[];
    };
    alerts: {
      enabled: boolean;
      thresholds: {
        blockDelay: number;
        rpcLatency: number;
        errorRate: number;
      };
    };
    logging: {
      level: string;
      format: string;
      outputs: string[];
    };
  };
}

export interface Indicator {
  enabled: boolean;
  [key: string]: any;
}

export interface FeaturesConfig {
  price: {
    indicators: {
      [name: string]: Indicator;
    };
    metrics: string[];
    timeframes: string[];
    normalization: {
      method: string;
      lookback: number;
      enabled: boolean;
    };
    outlierDetection: {
      method: string;
      threshold: number;
      enabled: boolean;
    };
  };
  volume: {
    metrics: string[];
    aggregations: string[];
    timeframes: string[];
    thresholds: {
      [key: string]: number;
    };
  };
  onchain: {
    metrics: string[];
    timeframes: string[];
    aggregations: {
      [metric: string]: string[];
    };
    ratios: string[];
  };
  defi: {
    metrics: string[];
    protocols: {
      [type: string]: string[];
    };
    timeframes: string[];
    correlations: {
      enabled: boolean;
      pairs: [string, string][];
    };
  };
  market: {
    microstructure: string[];
    sentiment: string[];
    crossAsset: {
      correlations: {
        enabled: boolean;
        assets: string[];
        timeframes: string[];
      };
      cointegration: {
        enabled: boolean;
        lookback: number;
      };
    };
  };
  portfolio: {
    riskMetrics: string[];
    allocation: {
      [key: string]: boolean;
    };
    rebalancing: {
      frequency: string;
      threshold: number;
      methods: string[];
    };
  };
  features: {
    engineering: {
      lag_features: {
        enabled: boolean;
        lags: number[];
      };
      rolling_features: {
        enabled: boolean;
        windows: number[];
        functions: string[];
      };
      interaction_features: {
        enabled: boolean;
        max_degree: number;
      };
      polynomial_features: {
        enabled: boolean;
        degree: number;
      };
    };
    selection: {
      method: string;
      k_best: number;
      variance_threshold: number;
      correlation_threshold: number;
    };
    scaling: {
      method: string;
      feature_range: [number, number];
      quantile_range: [number, number];
    };
  };
  validation: {
    splits: {
      train: number;
      validation: number;
      test: number;
    };
    method: string;
    n_splits: number;
    gap: number;
    embargo: string;
  };
  monitoring: {
    drift_detection: {
      enabled: boolean;
      method: string;
      threshold: number;
      window: number;
    };
    feature_importance: {
      enabled: boolean;
      method: string;
      n_repeats: number;
    };
    correlation_monitoring: {
      enabled: boolean;
      threshold: number;
      window: number;
    };
  };
}

export interface ModelConfig {
  modelId: string;
  description: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

export interface PromptConfig {
  system: string;
  template: string;
  examples: Array<{
    input: string;
    output: string;
  }>;
}

export interface OpenAIConfig {
  training: {
    baseModel: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    trainingExamples: number;
    validationSplit: number;
    testSplit: number;
    randomSeed: number;
    dataAugmentation: {
      enabled: boolean;
      techniques: string[];
      augmentationRatio: number;
    };
  };
  fineTuning: {
    learningRate: number;
    learningRateSchedule: string;
    warmupSteps: number;
    batchSize: number;
    gradientAccumulationSteps: number;
    epochs: number;
    maxSteps: number | null;
    suffix: string;
    validationFrequency: number;
    saveStrategy: string;
    saveSteps: number;
    earlyStoppingPatience: number;
    weightDecay: number;
    adamEpsilon: number;
    gradientClipping: number;
  };
  models: {
    [name: string]: ModelConfig;
  };
  prompts: {
    [name: string]: PromptConfig;
  };
  dataPreparation: {
    tokenization: {
      model: string;
      encoding: string;
      maxSequenceLength: number;
      truncationStrategy: string;
    };
    formatting: {
      inputFormat: string;
      outputFormat: string;
      includeMetadata: boolean;
      timestampFormat: string;
    };
    validation: {
      schemaValidation: boolean;
      dataQualityChecks: boolean;
      duplicateDetection: boolean;
      outlierDetection: boolean;
    };
  };
  evaluation: {
    metrics: string[];
    benchmarks: {
      [model: string]: {
        [metric: string]: string;
      };
    };
    backtesting: {
      enabled: boolean;
      timeframe: string;
      frequency: string;
      metrics: string[];
    };
  };
  deployment: {
    environment: string;
    scalingConfig: {
      minInstances: number;
      maxInstances: number;
      targetUtilization: number;
    };
    monitoring: {
      enabled: boolean;
      logLevel: string;
      metricsCollection: boolean;
      alerting: {
        [metric: string]: string;
      };
    };
    rateLimiting: {
      requestsPerMinute: number;
      tokensPerMinute: number;
      requestsPerDay: number;
    };
  };
  security: {
    apiKeyRotation: {
      enabled: boolean;
      frequency: string;
    };
    dataEncryption: {
      atRest: boolean;
      inTransit: boolean;
      algorithm: string;
    };
    accessControl: {
      rbac: boolean;
      apiKeyRequired: boolean;
      ipWhitelist: string[];
    };
    auditLogging: {
      enabled: boolean;
      includeRequestBody: boolean;
      retention: string;
    };
  };
  costs: {
    budgetLimits: {
      training: number;
      inference: number;
      storage: number;
    };
    currency: string;
    alertThresholds: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    optimization: {
      caching: boolean;
      batchRequests: boolean;
      modelSelection: string;
    };
  };
}

export interface AppConfig {
  sei: SeiConfig;
  collectors: CollectorsConfig;
  features: FeaturesConfig;
  openai: OpenAIConfig;
  environment: 'development' | 'staging' | 'production';
  version: string;
}

// Utility types for configuration validation
export type ConfigKey = keyof AppConfig;
export type NetworkName = keyof SeiConfig['networks'];
export type ProtocolType = 'dex' | 'lending' | 'staking' | 'liquid-staking' | 'trading';
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '7d' | '30d';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';