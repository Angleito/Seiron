import { Either, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import {
  AppConfig,
  ServerConfig,
  DatabaseConfig,
  BlockchainConfig,
  AIConfig,
  MCPConfig,
  SecurityConfig,
  LoggingConfig,
  ConfigResult
} from '../types';
import {
  validateEnvString,
  validateEnvNumber,
  validateEnvWithDefault,
  validateEnvironment,
  validateStringArray,
  validateUrl,
  validateRange,
  validateNumber,
  combineValidations,
  validateConfig
} from '../validation';

/**
 * Base configuration that applies to all environments
 */

/**
 * Validates server configuration
 */
const validateServerConfig = (): Either<readonly import('../types').ConfigError[], ServerConfig> => {
  const validations = [
    validateEnvWithDefault('PORT', 3000, (value) => 
      pipe(
        validateNumber('PORT', value),
        (result) => result._tag === 'Left' ? result : validateRange('PORT', 1000, 65535)(result.right)
      )
    ),
    validateEnvWithDefault('HOST', '0.0.0.0', (value) => right(value)),
    validateEnvironment('NODE_ENV'),
    validateEnvWithDefault('CORS_ORIGINS', [] as readonly string[], (value) => 
      validateStringArray('CORS_ORIGINS', value)
    ),
    validateEnvWithDefault('RATE_LIMIT_WINDOW_MS', 900000, (value) => 
      validateNumber('RATE_LIMIT_WINDOW_MS', value)
    ),
    validateEnvWithDefault('RATE_LIMIT_MAX', 100, (value) => 
      validateNumber('RATE_LIMIT_MAX', value)
    )
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [port, host, nodeEnv, corsOrigins, windowMs, max] = result.right;
      return right({
        port,
        host,
        nodeEnv,
        corsOrigins,
        rateLimit: { windowMs, max }
      });
    }
  );
};

/**
 * Validates database configuration
 */
const validateDatabaseConfig = (): Either<readonly import('../types').ConfigError[], DatabaseConfig> => {
  const validations = [
    validateEnvWithDefault('REDIS_HOST', 'localhost', (value) => right(value)),
    validateEnvWithDefault('REDIS_PORT', 6379, (value) => validateNumber('REDIS_PORT', value)),
    validateEnvWithDefault('REDIS_PASSWORD', undefined, (value) => right(value)),
    validateEnvWithDefault('REDIS_DB', 0, (value) => validateNumber('REDIS_DB', value)),
    validateEnvWithDefault('REDIS_MAX_RETRIES', 3, (value) => validateNumber('REDIS_MAX_RETRIES', value)),
    validateEnvWithDefault('REDIS_RETRY_DELAY', 100, (value) => validateNumber('REDIS_RETRY_DELAY', value)),
    validateEnvString('SUPABASE_URL'),
    validateEnvString('SUPABASE_ANON_KEY'),
    validateEnvWithDefault('SUPABASE_SERVICE_ROLE_KEY', undefined, (value) => right(value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [host, port, password, db, maxRetriesPerRequest, retryDelayOnFailover, supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey] = result.right;
      return right({
        redis: {
          host,
          port,
          password,
          db,
          maxRetriesPerRequest,
          retryDelayOnFailover
        },
        supabase: {
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
          serviceRoleKey: supabaseServiceRoleKey
        }
      });
    }
  );
};

/**
 * Validates blockchain configuration
 */
const validateBlockchainConfig = (): Either<readonly import('../types').ConfigError[], BlockchainConfig> => {
  const validations = [
    validateEnvWithDefault('SEI_RPC_URL', 'https://rpc.sei-testnet.com', (value) => 
      validateUrl('SEI_RPC_URL', value)
    ),
    validateEnvWithDefault('SEI_CHAIN_ID', 713715, (value) => validateNumber('SEI_CHAIN_ID', value)),
    validateEnvWithDefault('SEI_BLOCK_TIME', 400, (value) => validateNumber('SEI_BLOCK_TIME', value)),
    validateEnvWithDefault('DRAGONSWAP_API_URL', 'https://api.dragonswap.app', (value) => 
      validateUrl('DRAGONSWAP_API_URL', value)
    ),
    validateEnvWithDefault('DRAGONSWAP_TIMEOUT', 5000, (value) => validateNumber('DRAGONSWAP_TIMEOUT', value)),
    validateEnvWithDefault('YEIFINANCE_API_URL', 'https://api.yei.finance', (value) => 
      validateUrl('YEIFINANCE_API_URL', value)
    ),
    validateEnvWithDefault('YEIFINANCE_TIMEOUT', 5000, (value) => validateNumber('YEIFINANCE_TIMEOUT', value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [rpcUrl, chainId, blockTime, dragonSwapUrl, dragonSwapTimeout, yeiFinanceUrl, yeiFinanceTimeout] = result.right;
      return right({
        sei: {
          rpcUrl,
          chainId,
          blockTime
        },
        providers: {
          dragonSwap: {
            apiUrl: dragonSwapUrl,
            timeout: dragonSwapTimeout
          },
          yeiFinance: {
            apiUrl: yeiFinanceUrl,
            timeout: yeiFinanceTimeout
          }
        }
      });
    }
  );
};

/**
 * Validates AI configuration
 */
const validateAIConfig = (): Either<readonly import('../types').ConfigError[], AIConfig> => {
  const validations = [
    validateEnvString('OPENAI_API_KEY'),
    validateEnvWithDefault('OPENAI_MODEL', 'gpt-4', (value) => right(value)),
    validateEnvWithDefault('OPENAI_MAX_TOKENS', 1000, (value) => validateNumber('OPENAI_MAX_TOKENS', value)),
    validateEnvWithDefault('OPENAI_TEMPERATURE', 0.7, (value) => validateNumber('OPENAI_TEMPERATURE', value)),
    validateEnvString('HIVE_INTELLIGENCE_API_KEY'),
    validateEnvWithDefault('HIVE_INTELLIGENCE_BASE_URL', 'https://api.hiveintelligence.xyz/v1', (value) => 
      validateUrl('HIVE_INTELLIGENCE_BASE_URL', value)
    ),
    validateEnvWithDefault('HIVE_INTELLIGENCE_RATE_LIMIT', 20, (value) => validateNumber('HIVE_INTELLIGENCE_RATE_LIMIT', value)),
    validateEnvWithDefault('HIVE_INTELLIGENCE_CACHE_TTL', 300, (value) => validateNumber('HIVE_INTELLIGENCE_CACHE_TTL', value)),
    validateEnvWithDefault('HIVE_INTELLIGENCE_RETRY_ATTEMPTS', 2, (value) => validateNumber('HIVE_INTELLIGENCE_RETRY_ATTEMPTS', value)),
    validateEnvWithDefault('HIVE_INTELLIGENCE_RETRY_DELAY', 1000, (value) => validateNumber('HIVE_INTELLIGENCE_RETRY_DELAY', value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [openaiApiKey, openaiModel, openaiMaxTokens, openaiTemperature, hiveApiKey, hiveBaseUrl, hiveRateLimit, hiveCacheTTL, hiveRetryAttempts, hiveRetryDelay] = result.right;
      return right({
        openai: {
          apiKey: openaiApiKey,
          model: openaiModel,
          maxTokens: openaiMaxTokens,
          temperature: openaiTemperature
        },
        hiveIntelligence: {
          apiKey: hiveApiKey,
          baseUrl: hiveBaseUrl,
          maxRequestsPerMinute: hiveRateLimit,
          cacheTTL: hiveCacheTTL,
          retryAttempts: hiveRetryAttempts,
          retryDelay: hiveRetryDelay
        }
      });
    }
  );
};

/**
 * Validates MCP configuration
 */
const validateMCPConfig = (): Either<readonly import('../types').ConfigError[], MCPConfig> => {
  const validations = [
    validateEnvWithDefault('MCP_ENABLED', true, (value) => right(value === 'true')),
    // Hive Intelligence MCP
    validateEnvWithDefault('MCP_HIVE_URL', 'https://seiron-hive-intelligence.up.railway.app', (value) => 
      validateUrl('MCP_HIVE_URL', value)
    ),
    validateEnvWithDefault('MCP_HIVE_API_KEY', '', (value) => right(value)),
    validateEnvWithDefault('MCP_HIVE_TIMEOUT', 30000, (value) => validateNumber('MCP_HIVE_TIMEOUT', value)),
    validateEnvWithDefault('MCP_HIVE_RETRY_ATTEMPTS', 3, (value) => validateNumber('MCP_HIVE_RETRY_ATTEMPTS', value)),
    validateEnvWithDefault('MCP_HIVE_RETRY_DELAY', 1000, (value) => validateNumber('MCP_HIVE_RETRY_DELAY', value)),
    // SEI Blockchain MCP
    validateEnvWithDefault('MCP_SEI_URL', 'https://seiron-sei-blockchain.up.railway.app', (value) => 
      validateUrl('MCP_SEI_URL', value)
    ),
    validateEnvWithDefault('MCP_SEI_API_KEY', '', (value) => right(value)),
    validateEnvWithDefault('MCP_SEI_TIMEOUT', 30000, (value) => validateNumber('MCP_SEI_TIMEOUT', value)),
    validateEnvWithDefault('MCP_SEI_RETRY_ATTEMPTS', 3, (value) => validateNumber('MCP_SEI_RETRY_ATTEMPTS', value)),
    validateEnvWithDefault('MCP_SEI_RETRY_DELAY', 1000, (value) => validateNumber('MCP_SEI_RETRY_DELAY', value)),
    // Portfolio Manager MCP
    validateEnvWithDefault('MCP_PORTFOLIO_URL', 'https://seiron-portfolio-manager.up.railway.app', (value) => 
      validateUrl('MCP_PORTFOLIO_URL', value)
    ),
    validateEnvWithDefault('MCP_PORTFOLIO_API_KEY', '', (value) => right(value)),
    validateEnvWithDefault('MCP_PORTFOLIO_TIMEOUT', 30000, (value) => validateNumber('MCP_PORTFOLIO_TIMEOUT', value)),
    validateEnvWithDefault('MCP_PORTFOLIO_RETRY_ATTEMPTS', 3, (value) => validateNumber('MCP_PORTFOLIO_RETRY_ATTEMPTS', value)),
    validateEnvWithDefault('MCP_PORTFOLIO_RETRY_DELAY', 1000, (value) => validateNumber('MCP_PORTFOLIO_RETRY_DELAY', value)),
    // HTTP configuration
    validateEnvWithDefault('MCP_DEFAULT_TIMEOUT', 30000, (value) => validateNumber('MCP_DEFAULT_TIMEOUT', value)),
    validateEnvWithDefault('MCP_DEFAULT_RETRY_ATTEMPTS', 3, (value) => validateNumber('MCP_DEFAULT_RETRY_ATTEMPTS', value)),
    validateEnvWithDefault('MCP_DEFAULT_RETRY_DELAY', 1000, (value) => validateNumber('MCP_DEFAULT_RETRY_DELAY', value)),
    validateEnvWithDefault('MCP_POOL_MAX_CONNECTIONS', 10, (value) => validateNumber('MCP_POOL_MAX_CONNECTIONS', value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [
        enabled,
        hiveUrl, hiveApiKey, hiveTimeout, hiveRetryAttempts, hiveRetryDelay,
        seiUrl, seiApiKey, seiTimeout, seiRetryAttempts, seiRetryDelay,
        portfolioUrl, portfolioApiKey, portfolioTimeout, portfolioRetryAttempts, portfolioRetryDelay,
        defaultTimeout, maxRetries, retryDelay, maxSockets
      ] = result.right;
      
      return right({
        enabled,
        servers: {
          hiveIntelligence: {
            url: hiveUrl,
            apiKey: hiveApiKey || undefined,
            timeout: hiveTimeout,
            retryAttempts: hiveRetryAttempts,
            retryDelay: hiveRetryDelay
          },
          seiBlockchain: {
            url: seiUrl,
            apiKey: seiApiKey || undefined,
            timeout: seiTimeout,
            retryAttempts: seiRetryAttempts,
            retryDelay: seiRetryDelay
          },
          portfolioManager: {
            url: portfolioUrl,
            apiKey: portfolioApiKey || undefined,
            timeout: portfolioTimeout,
            retryAttempts: portfolioRetryAttempts,
            retryDelay: portfolioRetryDelay
          }
        },
        http: {
          defaultTimeout,
          maxRetries,
          retryDelay,
          keepAlive: true,
          maxSockets
        }
      });
    }
  );
};

/**
 * Validates security configuration
 */
const validateSecurityConfig = (): Either<readonly import('../types').ConfigError[], SecurityConfig> => {
  const validations = [
    validateEnvString('JWT_SECRET'),
    validateEnvWithDefault('JWT_EXPIRES_IN', '24h', (value) => right(value)),
    validateEnvWithDefault('ENCRYPTION_ALGORITHM', 'aes-256-gcm', (value) => right(value)),
    validateEnvWithDefault('ENCRYPTION_KEY_LENGTH', 32, (value) => validateNumber('ENCRYPTION_KEY_LENGTH', value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [secret, expiresIn, algorithm, keyLength] = result.right;
      return right({
        jwt: {
          secret,
          expiresIn
        },
        encryption: {
          algorithm,
          keyLength
        }
      });
    }
  );
};

/**
 * Validates logging configuration
 */
const validateLoggingConfig = (): Either<readonly import('../types').ConfigError[], LoggingConfig> => {
  const validations = [
    validateEnvWithDefault('LOG_LEVEL', 'info', (value) => right(value)),
    validateEnvWithDefault('LOG_FORMAT', 'json', (value) => right(value)),
    validateEnvWithDefault('LOG_TRANSPORTS', [] as readonly string[], (value) => 
      validateStringArray('LOG_TRANSPORTS', value)
    ),
    validateEnvWithDefault('LOG_FILE_ENABLED', true, (value) => right(value === 'true')),
    validateEnvWithDefault('LOG_FILE_NAME', 'app.log', (value) => right(value)),
    validateEnvWithDefault('LOG_FILE_MAX_SIZE', '10m', (value) => right(value)),
    validateEnvWithDefault('LOG_FILE_MAX_FILES', 5, (value) => validateNumber('LOG_FILE_MAX_FILES', value))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [level, format, transports, enabled, filename, maxSize, maxFiles] = result.right;
      return right({
        level,
        format,
        transports,
        file: {
          enabled,
          filename,
          maxSize,
          maxFiles
        }
      });
    }
  );
};

/**
 * Validates the complete base configuration
 */
export const validateBaseConfig = (): ConfigResult<AppConfig> => {
  return validateConfig(() => {
    const validations = [
      validateServerConfig(),
      validateDatabaseConfig(),
      validateBlockchainConfig(),
      validateAIConfig(),
      validateMCPConfig(),
      validateSecurityConfig(),
      validateLoggingConfig()
    ];

    return pipe(
      combineValidations(validations),
      (result) => {
        if (result._tag === 'Left') {
          return result;
        }
        const [server, database, blockchain, ai, mcp, security, logging] = result.right;
        return right({
          server,
          database,
          blockchain,
          ai,
          mcp,
          security,
          logging
        });
      }
    );
  });
};
