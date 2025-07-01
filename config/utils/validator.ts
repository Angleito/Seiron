import { SeiConfig, CollectorsConfig, FeaturesConfig, OpenAIConfig, NetworkName } from '../types';

/**
 * Runtime validation utilities for configuration objects
 */
export class ConfigValidator {
  
  /**
   * Validate Sei network configuration
   */
  static validateSeiConfig(config: SeiConfig): void {
    // Validate network names
    const requiredNetworks: NetworkName[] = ['mainnet', 'testnet', 'devnet'];
    const configNetworks = Object.keys(config.networks) as NetworkName[];
    
    for (const network of requiredNetworks) {
      if (!configNetworks.includes(network)) {
        throw new Error(`Missing required network configuration: ${network}`);
      }
    }

    // Validate default network exists
    if (!configNetworks.includes(config.defaults.network as NetworkName)) {
      throw new Error(`Default network '${config.defaults.network}' not found in networks configuration`);
    }

    // Validate chain IDs are unique
    const chainIds = configNetworks.map(network => config.networks[network].chainId);
    const uniqueChainIds = new Set(chainIds);
    if (chainIds.length !== uniqueChainIds.size) {
      throw new Error('Duplicate chain IDs found in network configurations');
    }

    // Validate URLs
    configNetworks.forEach(network => {
      const networkConfig = config.networks[network];
      this.validateUrl(networkConfig.rpcUrl, `${network} RPC URL`);
      this.validateUrl(networkConfig.cosmosRpcUrl, `${network} Cosmos RPC URL`);
      this.validateUrl(networkConfig.restUrl, `${network} REST URL`);
      this.validateUrl(networkConfig.explorerUrl, `${network} Explorer URL`);
    });

    // Validate contract addresses
    Object.entries(config.contracts).forEach(([network, contracts]) => {
      if (!configNetworks.includes(network as NetworkName)) {
        throw new Error(`Contract configuration found for unknown network: ${network}`);
      }
      
      Object.entries(contracts).forEach(([contractName, address]) => {
        if (!this.isValidSeiAddress(address)) {
          throw new Error(`Invalid contract address for ${network}.${contractName}: ${address}`);
        }
      });
    });
  }

  /**
   * Validate collectors configuration
   */
  static validateCollectorsConfig(config: CollectorsConfig): void {
    // Validate batch sizes and ranges
    if (config.chain.batchSize <= 0 || config.chain.batchSize > 1000) {
      throw new Error('Chain batch size must be between 1 and 1000');
    }

    if (config.chain.blockRange <= 0 || config.chain.blockRange > 10000) {
      throw new Error('Block range must be between 1 and 10000');
    }

    // Validate price feeds
    if (config.market.priceFeeds.length === 0) {
      throw new Error('At least one price feed must be configured');
    }

    // Validate price feed priorities are unique
    const priorities = config.market.priceFeeds.map(feed => feed.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      throw new Error('Duplicate priorities found in price feeds');
    }

    // Validate assets
    if (config.market.assets.length === 0) {
      throw new Error('At least one asset must be configured');
    }

    const assetSymbols = config.market.assets.map(asset => asset.symbol);
    const uniqueSymbols = new Set(assetSymbols);
    if (assetSymbols.length !== uniqueSymbols.size) {
      throw new Error('Duplicate asset symbols found');
    }

    // Validate protocols
    config.defi.protocols.forEach(protocol => {
      if (protocol.priority <= 0) {
        throw new Error(`Protocol ${protocol.name} must have priority > 0`);
      }
      
      if (protocol.enabled && !protocol.factoryAddress && !protocol.contractAddress) {
        throw new Error(`Enabled protocol ${protocol.name} must have either factoryAddress or contractAddress`);
      }
    });

    // Validate thresholds
    if (config.defi.liquidityThreshold < 0) {
      throw new Error('Liquidity threshold must be >= 0');
    }

    if (config.defi.volumeThreshold < 0) {
      throw new Error('Volume threshold must be >= 0');
    }

    // Validate intervals
    if (config.market.updateInterval < 1000) {
      throw new Error('Market update interval must be at least 1000ms');
    }

    if (config.defi.refreshInterval < 30000) {
      throw new Error('DeFi refresh interval must be at least 30000ms');
    }
  }

  /**
   * Validate features configuration
   */
  static validateFeaturesConfig(config: FeaturesConfig): void {
    // Validate train/validation/test splits sum to 1
    const { train, validation, test } = config.validation.splits;
    const sum = train + validation + test;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Validation splits must sum to 1.0, got ${sum}`);
    }

    // Validate indicator periods
    Object.entries(config.price.indicators).forEach(([name, indicator]) => {
      if (indicator.enabled) {
        if (name === 'rsi' && (indicator.period < 2 || indicator.period > 100)) {
          throw new Error('RSI period must be between 2 and 100');
        }
        
        if (name === 'bollingerBands' && (indicator.period < 2 || indicator.stdDev <= 0)) {
          throw new Error('Bollinger Bands period must be >= 2 and stdDev > 0');
        }
        
        if (name === 'macd') {
          if (indicator.fast >= indicator.slow) {
            throw new Error('MACD fast period must be less than slow period');
          }
          if (indicator.signal < 1) {
            throw new Error('MACD signal period must be >= 1');
          }
        }
      }
    });

    // Validate feature engineering parameters
    const { lag_features, rolling_features } = config.features.engineering;
    
    if (lag_features.enabled && lag_features.lags.some((lag: number) => lag <= 0)) {
      throw new Error('All lag feature periods must be > 0');
    }

    if (rolling_features.enabled && rolling_features.windows.some((window: number) => window < 2)) {
      throw new Error('All rolling window sizes must be >= 2');
    }

    // Validate feature selection parameters
    const { selection } = config.features;
    if (selection.k_best <= 0) {
      throw new Error('k_best must be > 0');
    }

    if (selection.variance_threshold < 0) {
      throw new Error('Variance threshold must be >= 0');
    }

    if (selection.correlation_threshold < 0 || selection.correlation_threshold > 1) {
      throw new Error('Correlation threshold must be between 0 and 1');
    }

    // Validate normalization parameters
    if (config.price.normalization.enabled && config.price.normalization.lookback <= 0) {
      throw new Error('Normalization lookback must be > 0');
    }
  }

  /**
   * Validate OpenAI configuration
   */
  static validateOpenAIConfig(config: OpenAIConfig): void {
    // Validate training parameters
    const { training } = config;
    if (training.trainingExamples < 100) {
      throw new Error('Training examples must be at least 100');
    }

    if (training.validationSplit < 0.1 || training.validationSplit > 0.5) {
      throw new Error('Validation split must be between 0.1 and 0.5');
    }

    if (training.testSplit < 0.05 || training.testSplit > 0.3) {
      throw new Error('Test split must be between 0.05 and 0.3');
    }

    if (training.validationSplit + training.testSplit >= 0.8) {
      throw new Error('Validation + test splits must be < 0.8 to leave room for training');
    }

    // Validate fine-tuning parameters
    const { fineTuning } = config;
    if (fineTuning.learningRate < 0.0001 || fineTuning.learningRate > 0.1) {
      throw new Error('Learning rate must be between 0.0001 and 0.1');
    }

    if (fineTuning.batchSize < 1 || fineTuning.batchSize > 256) {
      throw new Error('Batch size must be between 1 and 256');
    }

    if (fineTuning.epochs < 1 || fineTuning.epochs > 50) {
      throw new Error('Epochs must be between 1 and 50');
    }

    // Validate model configurations
    Object.entries(config.models).forEach(([name, modelConfig]) => {
      if (modelConfig.maxTokens < 1 || modelConfig.maxTokens > 8192) {
        throw new Error(`Model ${name} maxTokens must be between 1 and 8192`);
      }

      if (modelConfig.temperature < 0 || modelConfig.temperature > 2) {
        throw new Error(`Model ${name} temperature must be between 0 and 2`);
      }

      if (!modelConfig.modelId.match(/^ft:gpt-[34](-turbo)?:[a-zA-Z0-9-_]+$/)) {
        throw new Error(`Model ${name} has invalid modelId format`);
      }
    });

    // Validate prompt configurations
    Object.entries(config.prompts).forEach(([name, promptConfig]) => {
      if (promptConfig.system.length < 10) {
        throw new Error(`Prompt ${name} system message too short`);
      }

      if (promptConfig.template.length < 10) {
        throw new Error(`Prompt ${name} template too short`);
      }

      // Validate examples if provided
      if (promptConfig.examples) {
        promptConfig.examples.forEach((example, idx) => {
          if (!example.input || !example.output) {
            throw new Error(`Prompt ${name} example ${idx} missing input or output`);
          }
        });
      }
    });

    // Validate cost limits
    const { costs } = config;
    if (costs.budgetLimits.training < 0 || costs.budgetLimits.inference < 0 || costs.budgetLimits.storage < 0) {
      throw new Error('All budget limits must be >= 0');
    }

    // Validate rate limiting
    const { rateLimiting } = config.deployment;
    if (rateLimiting.requestsPerMinute < 1 || rateLimiting.tokensPerMinute < 1) {
      throw new Error('Rate limits must be >= 1');
    }
  }

  /**
   * Validate URL format
   */
  private static validateUrl(url: string, name: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL for ${name}: ${url}`);
    }
  }

  /**
   * Validate Sei address format
   */
  private static isValidSeiAddress(address: string): boolean {
    return /^sei[0-9a-z]{58}$/.test(address);
  }

  /**
   * Validate Ethereum address format
   */
  private static isValidEthAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Validate all configurations
   */
  static validateAll(configs: {
    sei: SeiConfig;
    collectors: CollectorsConfig;
    features: FeaturesConfig;
    openai: OpenAIConfig;
  }): void {
    this.validateSeiConfig(configs.sei);
    this.validateCollectorsConfig(configs.collectors);
    this.validateFeaturesConfig(configs.features);
    this.validateOpenAIConfig(configs.openai);
  }
}

export default ConfigValidator;