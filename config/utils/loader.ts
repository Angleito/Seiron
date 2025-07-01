import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { 
  SeiConfig, 
  CollectorsConfig, 
  FeaturesConfig, 
  OpenAIConfig, 
  AppConfig,
  ConfigKey 
} from '../types';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load JSON schemas
const schemas = {
  sei: require('../schemas/sei.schema.json'),
  collectors: require('../schemas/collectors.schema.json'),
  features: require('../schemas/features.schema.json'),
  openai: require('../schemas/openai.schema.json')
};

// Compile validators
const validators = {
  sei: ajv.compile(schemas.sei),
  collectors: ajv.compile(schemas.collectors),
  features: ajv.compile(schemas.features),
  openai: ajv.compile(schemas.openai)
};

export class ConfigValidationError extends Error {
  constructor(
    public configName: string,
    public errors: any[]
  ) {
    super(`Validation failed for ${configName} configuration: ${JSON.stringify(errors, null, 2)}`);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private configCache: Map<string, any> = new Map();
  private watchMode: boolean = false;

  private constructor(private configDir: string) {}

  static getInstance(configDir: string = './config'): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader(configDir);
    }
    return ConfigLoader.instance;
  }

  /**
   * Load and validate a configuration file
   */
  private loadConfig<T>(fileName: string, validator: any): T {
    const cacheKey = fileName;
    
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey) as T;
    }

    try {
      const filePath = join(this.configDir, `${fileName}.json`);
      const rawData = readFileSync(filePath, 'utf-8');
      const config = JSON.parse(rawData);

      // Validate against schema
      const isValid = validator(config);
      if (!isValid) {
        throw new ConfigValidationError(fileName, validator.errors);
      }

      // Cache the validated config
      this.configCache.set(cacheKey, config);
      return config as T;
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw error;
      }
      throw new Error(`Failed to load ${fileName} configuration: ${error.message}`);
    }
  }

  /**
   * Load Sei network configuration
   */
  loadSeiConfig(): SeiConfig {
    return this.loadConfig<SeiConfig>('sei', validators.sei);
  }

  /**
   * Load data collectors configuration
   */
  loadCollectorsConfig(): CollectorsConfig {
    return this.loadConfig<CollectorsConfig>('collectors', validators.collectors);
  }

  /**
   * Load features configuration
   */
  loadFeaturesConfig(): FeaturesConfig {
    return this.loadConfig<FeaturesConfig>('features', validators.features);
  }

  /**
   * Load OpenAI configuration
   */
  loadOpenAIConfig(): OpenAIConfig {
    return this.loadConfig<OpenAIConfig>('openai', validators.openai);
  }

  /**
   * Load complete application configuration
   */
  loadAppConfig(): AppConfig {
    const environment = (process.env.NODE_ENV as any) || 'development';
    const version = process.env.APP_VERSION || '1.0.0';

    return {
      sei: this.loadSeiConfig(),
      collectors: this.loadCollectorsConfig(),
      features: this.loadFeaturesConfig(),
      openai: this.loadOpenAIConfig(),
      environment,
      version
    };
  }

  /**
   * Load configuration by key
   */
  loadConfigByKey<K extends ConfigKey>(key: K): AppConfig[K] {
    switch (key) {
      case 'sei':
        return this.loadSeiConfig() as AppConfig[K];
      case 'collectors':
        return this.loadCollectorsConfig() as AppConfig[K];
      case 'features':
        return this.loadFeaturesConfig() as AppConfig[K];
      case 'openai':
        return this.loadOpenAIConfig() as AppConfig[K];
      default:
        throw new Error(`Unknown configuration key: ${key}`);
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Reload a specific configuration
   */
  reloadConfig(configName: string): void {
    this.configCache.delete(configName);
  }

  /**
   * Enable/disable watch mode for hot reloading
   */
  setWatchMode(enabled: boolean): void {
    this.watchMode = enabled;
    if (enabled) {
      this.setupFileWatchers();
    }
  }

  /**
   * Setup file watchers for hot reloading
   */
  private setupFileWatchers(): void {
    const fs = require('fs');
    const configFiles = ['sei', 'collectors', 'features', 'openai'];

    configFiles.forEach(configName => {
      const filePath = join(this.configDir, `${configName}.json`);
      fs.watchFile(filePath, (curr: any, prev: any) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`Configuration file ${configName}.json changed, reloading...`);
          this.reloadConfig(configName);
        }
      });
    });
  }

  /**
   * Validate configuration without loading
   */
  validateConfig(configName: string, data: any): boolean {
    const validator = validators[configName as keyof typeof validators];
    if (!validator) {
      throw new Error(`No validator found for configuration: ${configName}`);
    }

    const isValid = validator(data);
    if (!isValid) {
      throw new ConfigValidationError(configName, validator.errors);
    }

    return true;
  }
}

/**
 * Environment-specific configuration merger
 */
export class EnvironmentConfigMerger {
  private static defaultConfig: Partial<AppConfig> = {
    environment: 'development',
    version: '1.0.0'
  };

  static mergeWithEnvironment(baseConfig: AppConfig): AppConfig {
    const envOverrides = this.getEnvironmentOverrides();
    return this.deepMerge(baseConfig, envOverrides);
  }

  private static getEnvironmentOverrides(): Partial<AppConfig> {
    const overrides: Partial<AppConfig> = {};

    // Environment-specific overrides
    if (process.env.NODE_ENV === 'production') {
      overrides.collectors = {
        ...overrides.collectors,
        monitoring: {
          ...overrides.collectors?.monitoring,
          logging: {
            level: 'error',
            format: 'json',
            outputs: ['file']
          }
        }
      };
    }

    // Network overrides
    if (process.env.SEI_NETWORK) {
      overrides.sei = {
        ...overrides.sei,
        defaults: {
          ...overrides.sei?.defaults,
          network: process.env.SEI_NETWORK
        }
      };
    }

    // OpenAI overrides
    if (process.env.OPENAI_MODEL) {
      overrides.openai = {
        ...overrides.openai,
        training: {
          ...overrides.openai?.training,
          baseModel: process.env.OPENAI_MODEL as any
        }
      };
    }

    return overrides;
  }

  private static deepMerge(target: any, source: any): any {
    if (source === null || typeof source !== 'object') {
      return source;
    }

    if (Array.isArray(source)) {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }
}

/**
 * Configuration factory with caching and validation
 */
export class ConfigFactory {
  private static instance: ConfigFactory;
  private loader: ConfigLoader;

  private constructor() {
    this.loader = ConfigLoader.getInstance();
  }

  static getInstance(): ConfigFactory {
    if (!ConfigFactory.instance) {
      ConfigFactory.instance = new ConfigFactory();
    }
    return ConfigFactory.instance;
  }

  /**
   * Create application configuration with environment merging
   */
  createAppConfig(): AppConfig {
    const baseConfig = this.loader.loadAppConfig();
    return EnvironmentConfigMerger.mergeWithEnvironment(baseConfig);
  }

  /**
   * Create configuration for specific component
   */
  createComponentConfig<K extends ConfigKey>(component: K): AppConfig[K] {
    return this.loader.loadConfigByKey(component);
  }

  /**
   * Enable hot reloading
   */
  enableHotReload(): void {
    this.loader.setWatchMode(true);
  }

  /**
   * Validate all configurations
   */
  validateAllConfigs(): boolean {
    try {
      this.loader.loadAppConfig();
      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }
}

// Export convenience functions
export const loadConfig = () => ConfigFactory.getInstance().createAppConfig();
export const loadComponentConfig = <K extends ConfigKey>(component: K) => 
  ConfigFactory.getInstance().createComponentConfig(component);
export const validateConfigs = () => ConfigFactory.getInstance().validateAllConfigs();
export const enableHotReload = () => ConfigFactory.getInstance().enableHotReload();

// Export default configuration loader
export default ConfigLoader;