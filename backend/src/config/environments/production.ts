import { Either, map } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { AppConfig, ConfigResult } from '../types';
import { validateBaseConfig } from './base';

/**
 * Production environment configuration
 * Optimized for security, performance, and stability
 */

/**
 * Production-specific configuration overrides
 */
const productionOverrides = (config: AppConfig): AppConfig => ({
  ...config,
  server: {
    ...config.server,
    corsOrigins: process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || []
  },
  logging: {
    ...config.logging,
    level: 'warn',
    format: 'json',
    transports: ['console', 'file'],
    file: {
      ...config.logging.file,
      enabled: true,
      filename: 'logs/production.log',
      maxSize: '50m',
      maxFiles: 10
    }
  },
  database: {
    ...config.database,
    redis: {
      ...config.database.redis,
      maxRetriesPerRequest: 5,
      retryDelayOnFailover: 500
    }
  },
  blockchain: {
    ...config.blockchain,
    sei: {
      ...config.blockchain.sei,
      rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-network.com'
    },
    providers: {
      ...config.blockchain.providers,
      dragonSwap: {
        ...config.blockchain.providers.dragonSwap,
        timeout: 5000 // Strict timeout for production
      },
      yeiFinance: {
        ...config.blockchain.providers.yeiFinance,
        timeout: 5000
      }
    }
  },
  ai: {
    ...config.ai,
    openai: {
      ...config.ai.openai,
      temperature: 0.5, // More conservative responses in production
      maxTokens: 800
    }
  }
});

/**
 * Validates and returns production configuration
 */
export const validateProductionConfig = (): ConfigResult<AppConfig> => {
  return pipe(
    validateBaseConfig(),
    map(productionOverrides)
  );
};

/**
 * Production environment requirements
 */
export const productionRequiredEnvVars = [
  'OPENAI_API_KEY',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'SEI_RPC_URL',
  'REDIS_HOST',
  'REDIS_PASSWORD'
] as const;

/**
 * Production environment defaults (minimal for security)
 */
export const productionDefaults = {
  NODE_ENV: 'production',
  PORT: '3000',
  HOST: '0.0.0.0',
  LOG_LEVEL: 'warn',
  LOG_FORMAT: 'json',
  LOG_TRANSPORTS: 'console,file',
  LOG_FILE_ENABLED: 'true',
  LOG_FILE_NAME: 'logs/production.log',
  LOG_FILE_MAX_SIZE: '50m',
  LOG_FILE_MAX_FILES: '10',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  REDIS_MAX_RETRIES: '5',
  REDIS_RETRY_DELAY: '500',
  SEI_CHAIN_ID: '1328',
  SEI_BLOCK_TIME: '400',
  DRAGONSWAP_TIMEOUT: '5000',
  YEIFINANCE_TIMEOUT: '5000',
  OPENAI_MODEL: 'gpt-4',
  OPENAI_TEMPERATURE: '0.5',
  OPENAI_MAX_TOKENS: '800',
  JWT_EXPIRES_IN: '24h',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: '32',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX: '100'
};
