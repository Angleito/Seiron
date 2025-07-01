/**
 * Configuration utilities index
 * 
 * This module provides a comprehensive configuration management system for the Sei data collection pipeline.
 * It includes type-safe loading, validation, caching, and hot-reloading capabilities.
 */

export {
  // Main configuration loader and factory
  ConfigLoader,
  ConfigFactory,
  EnvironmentConfigMerger,
  
  // Convenience functions
  loadConfig,
  loadComponentConfig,
  validateConfigs,
  enableHotReload,
  
  // Error classes
  ConfigValidationError
} from './loader';

export {
  // Runtime validator
  ConfigValidator
} from './validator';

// Re-export all types for convenience
export * from '../types';

/**
 * Configuration constants
 */
export const CONFIG_CONSTANTS = {
  // Default configuration directory
  DEFAULT_CONFIG_DIR: './config',
  
  // Supported environments
  ENVIRONMENTS: ['development', 'staging', 'production'] as const,
  
  // Configuration file names
  CONFIG_FILES: {
    SEI: 'sei',
    COLLECTORS: 'collectors',
    FEATURES: 'features',
    OPENAI: 'openai'
  } as const,
  
  // Default timeouts and intervals
  DEFAULTS: {
    TIMEOUT: 30000,
    RETRIES: 3,
    BATCH_SIZE: 100,
    UPDATE_INTERVAL: 60000,
    REFRESH_INTERVAL: 300000
  } as const,
  
  // Validation thresholds
  VALIDATION: {
    MIN_TRAINING_EXAMPLES: 100,
    MAX_BATCH_SIZE: 1000,
    MAX_BLOCK_RANGE: 10000,
    MIN_VALIDATION_SPLIT: 0.1,
    MAX_VALIDATION_SPLIT: 0.5
  } as const
} as const;

/**
 * Environment variable mappings
 */
export const ENV_MAPPINGS = {
  // General
  NODE_ENV: 'environment',
  APP_VERSION: 'version',
  CONFIG_DIR: 'configDir',
  
  // Sei Network
  SEI_NETWORK: 'sei.defaults.network',
  SEI_RPC_URL: 'sei.networks.mainnet.rpcUrl',
  SEI_TIMEOUT: 'sei.defaults.timeout',
  
  // Data Collection
  BATCH_SIZE: 'collectors.chain.batchSize',
  BLOCK_RANGE: 'collectors.chain.blockRange',
  UPDATE_INTERVAL: 'collectors.market.updateInterval',
  
  // OpenAI
  OPENAI_MODEL: 'openai.training.baseModel',
  OPENAI_MAX_TOKENS: 'openai.training.maxTokens',
  OPENAI_TEMPERATURE: 'openai.training.temperature',
  
  // Security
  API_KEY_ROTATION: 'openai.security.apiKeyRotation.enabled',
  ENCRYPTION_ENABLED: 'openai.security.dataEncryption.atRest'
} as const;

/**
 * Configuration helpers
 */
export class ConfigHelpers {
  /**
   * Get environment-specific configuration file name
   */
  static getEnvConfigFileName(baseFileName: string, environment?: string): string {
    const env = environment || process.env.NODE_ENV || 'development';
    return env === 'development' ? baseFileName : `${baseFileName}.${env}`;
  }

  /**
   * Merge configuration with environment variables
   */
  static mergeWithEnvVars(config: any): any {
    const merged = { ...config };
    
    Object.entries(ENV_MAPPINGS).forEach(([envVar, configPath]) => {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.setNestedValue(merged, configPath, this.parseEnvValue(envValue));
      }
    });
    
    return merged;
  }

  /**
   * Set nested object value using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private static parseEnvValue(value: string): any {
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
    
    // JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to string
      }
    }
    
    // String
    return value;
  }

  /**
   * Validate configuration against environment requirements
   */
  static validateEnvironmentRequirements(config: any, environment: string): void {
    switch (environment) {
      case 'production':
        // Production-specific validations
        if (!config.openai?.security?.dataEncryption?.atRest) {
          throw new Error('Data encryption at rest is required in production');
        }
        
        if (config.collectors?.monitoring?.logging?.level === 'debug') {
          console.warn('Debug logging is not recommended in production');
        }
        
        if (!config.openai?.costs?.budgetLimits) {
          throw new Error('Budget limits must be configured in production');
        }
        break;
        
      case 'staging':
        // Staging-specific validations
        if (config.sei?.defaults?.network === 'mainnet') {
          console.warn('Using mainnet in staging environment');
        }
        break;
        
      case 'development':
        // Development allows more flexible configuration
        break;
        
      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  /**
   * Get configuration summary for logging
   */
  static getConfigSummary(config: any): Record<string, any> {
    return {
      environment: config.environment,
      version: config.version,
      network: config.sei?.defaults?.network,
      collectors: {
        batchSize: config.collectors?.chain?.batchSize,
        updateInterval: config.collectors?.market?.updateInterval,
        protocolCount: config.collectors?.defi?.protocols?.length
      },
      features: {
        indicators: Object.keys(config.features?.price?.indicators || {}),
        engineeringEnabled: config.features?.features?.engineering?.lag_features?.enabled,
        validationMethod: config.features?.validation?.method
      },
      openai: {
        baseModel: config.openai?.training?.baseModel,
        fineTuningEnabled: config.openai?.fineTuning?.epochs > 0,
        modelCount: Object.keys(config.openai?.models || {}).length
      }
    };
  }
}

/**
 * Configuration watcher for hot reloading
 */
export class ConfigWatcher {
  private watchers: Map<string, any> = new Map();
  private callbacks: Map<string, Array<(config: any) => void>> = new Map();

  /**
   * Watch configuration file for changes
   */
  watch(fileName: string, callback: (config: any) => void): void {
    if (!this.callbacks.has(fileName)) {
      this.callbacks.set(fileName, []);
    }
    
    this.callbacks.get(fileName)!.push(callback);
    
    if (!this.watchers.has(fileName)) {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(CONFIG_CONSTANTS.DEFAULT_CONFIG_DIR, `${fileName}.json`);
      const watcher = fs.watchFile(filePath, (curr: any, prev: any) => {
        if (curr.mtime !== prev.mtime) {
          this.notifyCallbacks(fileName);
        }
      });
      
      this.watchers.set(fileName, watcher);
    }
  }

  /**
   * Stop watching a configuration file
   */
  unwatch(fileName: string): void {
    const watcher = this.watchers.get(fileName);
    if (watcher) {
      const fs = require('fs');
      fs.unwatchFile(watcher);
      this.watchers.delete(fileName);
    }
    
    this.callbacks.delete(fileName);
  }

  /**
   * Stop watching all files
   */
  unwatchAll(): void {
    this.watchers.forEach((watcher, fileName) => {
      this.unwatch(fileName);
    });
  }

  /**
   * Notify callbacks when configuration changes
   */
  private notifyCallbacks(fileName: string): void {
    const callbacks = this.callbacks.get(fileName);
    if (callbacks) {
      try {
        const config = ConfigLoader.getInstance().loadConfigByKey(fileName as any);
        callbacks.forEach(callback => callback(config));
      } catch (error) {
        console.error(`Error reloading configuration ${fileName}:`, error);
      }
    }
  }
}

// Export singleton watcher instance
export const configWatcher = new ConfigWatcher();