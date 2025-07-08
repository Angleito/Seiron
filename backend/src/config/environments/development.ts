import { Either, map } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { AppConfig, ConfigResult } from '../types';
import { validateBaseConfig } from './base';

/**
 * Development environment configuration
 * Optimized for fast development and debugging
 */

/**
 * Development-specific configuration overrides
 */
const developmentOverrides = (config: AppConfig): AppConfig => ({
  ...config,
  server: {
    ...config.server,
    corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
  },
  logging: {
    ...config.logging,
    level: 'debug',
    format: 'simple',
    transports: ['console'],
    file: {
      ...config.logging.file,
      enabled: false
    }
  },
  database: {
    ...config.database,
    redis: {
      ...config.database.redis,
      db: 0 // Use default Redis DB for development
    },
    supabase: {
      ...config.database.supabase,
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  },
  blockchain: {
    ...config.blockchain,
    sei: {
      ...config.blockchain.sei,
      rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-testnet.com'
    },
    providers: {
      ...config.blockchain.providers,
      dragonSwap: {
        ...config.blockchain.providers.dragonSwap,
        timeout: 10000 // Longer timeout for development
      },
      yeiFinance: {
        ...config.blockchain.providers.yeiFinance,
        timeout: 10000
      }
    }
  },
  ai: {
    ...config.ai,
    openai: {
      ...config.ai.openai,
      temperature: 0.8, // More creative responses in development
      maxTokens: 1500
    }
  }
});

/**
 * Validates and returns development configuration
 */
export const validateDevelopmentConfig = (): ConfigResult<AppConfig> => {
  return pipe(
    validateBaseConfig(),
    map(developmentOverrides)
  );
};

/**
 * Development environment defaults
 */
export const developmentDefaults = {
  NODE_ENV: 'development',
  PORT: '3001',
  HOST: '0.0.0.0',
  CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  LOG_LEVEL: 'debug',
  LOG_FORMAT: 'simple',
  LOG_TRANSPORTS: 'console',
  LOG_FILE_ENABLED: 'false',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  SEI_RPC_URL: 'https://rpc.sei-testnet.com',
  SEI_CHAIN_ID: '713715',
  JWT_SECRET: 'dev-jwt-secret-change-in-production',
  DRAGONSWAP_TIMEOUT: '10000',
  YEIFINANCE_TIMEOUT: '10000',
  OPENAI_TEMPERATURE: '0.8',
  OPENAI_MAX_TOKENS: '1500',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX: '1000', // Higher rate limit for development
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  OPENAI_API_KEY: 'sk-dummy-key-for-development'
};
