import { Either, isLeft, fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as dotenv from 'dotenv';
import { AppConfig, Environment, ConfigError } from './types';
import { validateDevelopmentConfig, developmentDefaults } from './environments/development';
import { validateProductionConfig, productionDefaults } from './environments/production';
import { validateTestConfig, testDefaults } from './environments/test';

/**
 * Main configuration module with functional validation
 */

// Load environment variables
dotenv.config();

/**
 * Environment-specific configuration validators
 */
const configValidators = {
  development: validateDevelopmentConfig,
  test: validateTestConfig,
  staging: validateProductionConfig, // Use production config for staging
  production: validateProductionConfig
} as const;

/**
 * Environment-specific defaults
 */
const environmentDefaults = {
  development: developmentDefaults,
  test: testDefaults,
  staging: productionDefaults,
  production: productionDefaults
} as const;

/**
 * Get current environment
 */
const getCurrentEnvironment = (): Environment => {
  const env = process.env.NODE_ENV as Environment;
  return ['development', 'test', 'staging', 'production'].includes(env) ? env : 'development';
};

/**
 * Apply environment defaults before validation
 */
const applyEnvironmentDefaults = (environment: Environment): void => {
  const defaults = environmentDefaults[environment];
  
  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

/**
 * Format configuration errors for display
 */
const formatConfigErrors = (errors: readonly ConfigError[]): string => {
  const errorMessages = errors.map(error => 
    `- ${error.field}: ${error.message}${error.value !== undefined ? ` (got: ${JSON.stringify(error.value)})` : ''}`
  );
  
  return `Configuration validation failed:\n${errorMessages.join('\n')}`;
};

/**
 * Load and validate configuration for current environment
 */
const loadConfig = (): AppConfig => {
  const environment = getCurrentEnvironment();
  
  // Apply environment-specific defaults
  applyEnvironmentDefaults(environment);
  
  // Validate configuration
  const configResult = configValidators[environment]();
  
  return pipe(
    configResult,
    fold(
      (errors) => {
        const errorMessage = formatConfigErrors(errors);
        console.error(errorMessage);
        throw new Error(errorMessage);
      },
      (config) => config
    )
  );
};

/**
 * Validate configuration without throwing
 */
const validateConfig = (): Either<readonly ConfigError[], AppConfig> => {
  const environment = getCurrentEnvironment();
  applyEnvironmentDefaults(environment);
  return configValidators[environment]();
};

/**
 * Check if configuration is valid
 */
const isConfigValid = (): boolean => {
  const result = validateConfig();
  return !isLeft(result);
};

/**
 * Get configuration errors without throwing
 */
const getConfigErrors = (): readonly ConfigError[] | null => {
  const result = validateConfig();
  return isLeft(result) ? result.left : null;
};

/**
 * Singleton configuration instance
 */
let configInstance: AppConfig | null = null;

/**
 * Get the application configuration (singleton)
 */
export const getConfig = (): AppConfig => {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
};

/**
 * Reset configuration instance (useful for testing)
 */
export const resetConfig = (): void => {
  configInstance = null;
};

/**
 * Export validation utilities
 */
export {
  validateConfig,
  isConfigValid,
  getConfigErrors,
  getCurrentEnvironment,
  formatConfigErrors
};

/**
 * Export types
 */
export * from './types';

/**
 * Default export for convenience
 */
export default getConfig;
