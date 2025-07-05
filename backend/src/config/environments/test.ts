import { Either, map } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { AppConfig, ConfigResult } from '../types';
import { validateBaseConfig } from './base';

/**
 * Test environment configuration
 * Optimized for testing with isolated resources
 */

/**
 * Test-specific configuration overrides
 */
const testOverrides = (config: AppConfig): AppConfig => ({
  ...config,
  server: {
    ...config.server,
    port: 0, // Use random available port for tests
    corsOrigins: ['http://localhost:3000']
  },
  logging: {
    ...config.logging,
    level: 'error', // Minimal logging during tests
    format: 'simple',
    transports: [],
    file: {
      ...config.logging.file,
      enabled: false
    }
  },
  database: {
    ...config.database,
    redis: {
      ...config.database.redis,
      db: 15, // Use separate Redis DB for tests
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 50
    }
  },
  blockchain: {
    ...config.blockchain,
    sei: {
      ...config.blockchain.sei,
      rpcUrl: 'http://localhost:8545', // Mock RPC for tests // TODO: REMOVE_MOCK - Mock-related keywords
      chainId: 31337 // Hardhat chain ID
    },
    providers: {
      ...config.blockchain.providers,
      dragonSwap: {
        ...config.blockchain.providers.dragonSwap,
        apiUrl: 'http://localhost:3001/mock/dragonswap', // TODO: REMOVE_MOCK - Mock-related keywords
        timeout: 1000
      },
      yeiFinance: {
        ...config.blockchain.providers.yeiFinance,
        apiUrl: 'http://localhost:3001/mock/yeifinance', // TODO: REMOVE_MOCK - Mock-related keywords
        timeout: 1000
      }
    }
  },
  ai: {
    ...config.ai,
    openai: {
      ...config.ai.openai,
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
      temperature: 0.0, // Deterministic responses for tests
      maxTokens: 100
    }
  },
  security: {
    ...config.security,
    jwt: {
      ...config.security.jwt,
      secret: 'test-jwt-secret-key-for-testing-only',
      expiresIn: '1h'
    }
  }
});

/**
 * Validates and returns test configuration
 */
export const validateTestConfig = (): ConfigResult<AppConfig> => {
  return pipe(
    validateBaseConfig(),
    map(testOverrides)
  );
};

/**
 * Test environment defaults
 */
export const testDefaults = {
  NODE_ENV: 'test',
  PORT: '0',
  HOST: '127.0.0.1',
  CORS_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'error',
  LOG_FORMAT: 'simple',
  LOG_TRANSPORTS: '',
  LOG_FILE_ENABLED: 'false',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '15',
  REDIS_MAX_RETRIES: '1',
  REDIS_RETRY_DELAY: '50',
  SEI_RPC_URL: 'http://localhost:8545',
  SEI_CHAIN_ID: '31337',
  SEI_BLOCK_TIME: '100',
  DRAGONSWAP_API_URL: 'http://localhost:3001/mock/dragonswap', // TODO: REMOVE_MOCK - Mock-related keywords
  DRAGONSWAP_TIMEOUT: '1000',
  YEIFINANCE_API_URL: 'http://localhost:3001/mock/yeifinance', // TODO: REMOVE_MOCK - Mock-related keywords
  YEIFINANCE_TIMEOUT: '1000',
  OPENAI_API_KEY: 'test-api-key',
  OPENAI_MODEL: 'gpt-3.5-turbo',
  OPENAI_TEMPERATURE: '0.0',
  OPENAI_MAX_TOKENS: '100',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  JWT_EXPIRES_IN: '1h',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX: '1000'
};
