import { Either, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import {
  AppConfig,
  ServerConfig,
  DatabaseConfig,
  BlockchainConfig,
  AIConfig,
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
        validateEnvNumber('PORT'),
        validateRange('PORT', 1000, 65535)
      )
    ),
    validateEnvWithDefault('HOST', '0.0.0.0', (value) => right(value)),
    validateEnvironment('NODE_ENV'),
    validateEnvWithDefault('CORS_ORIGINS', 'http://localhost:3000', (value) => 
      validateStringArray('CORS_ORIGINS', value)
    ),
    validateEnvWithDefault('RATE_LIMIT_WINDOW_MS', 900000, (value) => 
      validateEnvNumber('RATE_LIMIT_WINDOW_MS')
    ),
    validateEnvWithDefault('RATE_LIMIT_MAX', 100, (value) => 
      validateEnvNumber('RATE_LIMIT_MAX')
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
    validateEnvWithDefault('REDIS_PORT', 6379, (value) => validateEnvNumber('REDIS_PORT')),
    validateEnvWithDefault('REDIS_PASSWORD', undefined, (value) => right(value)),
    validateEnvWithDefault('REDIS_DB', 0, (value) => validateEnvNumber('REDIS_DB')),
    validateEnvWithDefault('REDIS_MAX_RETRIES', 3, (value) => validateEnvNumber('REDIS_MAX_RETRIES')),
    validateEnvWithDefault('REDIS_RETRY_DELAY', 100, (value) => validateEnvNumber('REDIS_RETRY_DELAY'))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [host, port, password, db, maxRetriesPerRequest, retryDelayOnFailover] = result.right;
      return right({
        redis: {
          host,
          port,
          password,
          db,
          maxRetriesPerRequest,
          retryDelayOnFailover
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
    validateEnvWithDefault('SEI_CHAIN_ID', 713715, (value) => validateEnvNumber('SEI_CHAIN_ID')),
    validateEnvWithDefault('SEI_BLOCK_TIME', 400, (value) => validateEnvNumber('SEI_BLOCK_TIME')),
    validateEnvWithDefault('DRAGONSWAP_API_URL', 'https://api.dragonswap.app', (value) => 
      validateUrl('DRAGONSWAP_API_URL', value)
    ),
    validateEnvWithDefault('DRAGONSWAP_TIMEOUT', 5000, (value) => validateEnvNumber('DRAGONSWAP_TIMEOUT')),
    validateEnvWithDefault('YEIFINANCE_API_URL', 'https://api.yei.finance', (value) => 
      validateUrl('YEIFINANCE_API_URL', value)
    ),
    validateEnvWithDefault('YEIFINANCE_TIMEOUT', 5000, (value) => validateEnvNumber('YEIFINANCE_TIMEOUT'))
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
    validateEnvWithDefault('OPENAI_MAX_TOKENS', 1000, (value) => validateEnvNumber('OPENAI_MAX_TOKENS')),
    validateEnvWithDefault('OPENAI_TEMPERATURE', 0.7, (value) => validateEnvNumber('OPENAI_TEMPERATURE'))
  ];

  return pipe(
    combineValidations(validations),
    (result) => {
      if (result._tag === 'Left') {
        return result;
      }
      const [apiKey, model, maxTokens, temperature] = result.right;
      return right({
        openai: {
          apiKey,
          model,
          maxTokens,
          temperature
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
    validateEnvWithDefault('ENCRYPTION_KEY_LENGTH', 32, (value) => validateEnvNumber('ENCRYPTION_KEY_LENGTH'))
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
    validateEnvWithDefault('LOG_TRANSPORTS', 'console,file', (value) => 
      validateStringArray('LOG_TRANSPORTS', value)
    ),
    validateEnvWithDefault('LOG_FILE_ENABLED', true, (value) => right(value === 'true')),
    validateEnvWithDefault('LOG_FILE_NAME', 'app.log', (value) => right(value)),
    validateEnvWithDefault('LOG_FILE_MAX_SIZE', '10m', (value) => right(value)),
    validateEnvWithDefault('LOG_FILE_MAX_FILES', 5, (value) => validateEnvNumber('LOG_FILE_MAX_FILES'))
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
      validateSecurityConfig(),
      validateLoggingConfig()
    ];

    return pipe(
      combineValidations(validations),
      (result) => {
        if (result._tag === 'Left') {
          return result;
        }
        const [server, database, blockchain, ai, security, logging] = result.right;
        return right({
          server,
          database,
          blockchain,
          ai,
          security,
          logging
        });
      }
    );
  });
};
