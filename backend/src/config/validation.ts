import { Either, left, right, chain, map } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { sequenceT } from 'fp-ts/Apply';
import * as E from 'fp-ts/Either';
import { ConfigError, ConfigResult, Environment } from './types';

/**
 * Validation utilities using fp-ts Either
 */

/**
 * Creates a configuration error
 */
const createError = (field: string, message: string, value?: unknown): ConfigError => ({
  field,
  message,
  value
});

/**
 * Validates that a value exists (not null/undefined)
 */
export const validateRequired = (field: string, value: unknown): Either<ConfigError, unknown> => {
  if (value === null || value === undefined || value === '') {
    return left(createError(field, `${field} is required`));
  }
  return right(value);
};

/**
 * Validates that a value is a string
 */
export const validateString = (field: string, value: unknown): Either<ConfigError, string> => {
  if (typeof value !== 'string') {
    return left(createError(field, `${field} must be a string`, value));
  }
  return right(value);
};

/**
 * Validates that a value is a number
 */
export const validateNumber = (field: string, value: unknown): Either<ConfigError, number> => {
  const num = Number(value);
  if (isNaN(num)) {
    return left(createError(field, `${field} must be a number`, value));
  }
  return right(num);
};

/**
 * Validates that a number is within a range
 */
export const validateRange = (field: string, min: number, max: number) => (
  value: number
): Either<ConfigError, number> => {
  if (value < min || value > max) {
    return left(createError(field, `${field} must be between ${min} and ${max}`, value));
  }
  return right(value);
};

/**
 * Validates that a string is a valid URL
 */
export const validateUrl = (field: string, value: string): Either<ConfigError, string> => {
  try {
    new URL(value);
    return right(value);
  } catch {
    return left(createError(field, `${field} must be a valid URL`, value));
  }
};

/**
 * Validates that a string is one of the allowed values
 */
export const validateEnum = <T extends string>(field: string, allowedValues: readonly T[]) => (
  value: string
): Either<ConfigError, T> => {
  if (allowedValues.includes(value as T)) {
    return right(value as T);
  }
  return left(createError(field, `${field} must be one of: ${allowedValues.join(', ')}`, value));
};

/**
 * Validates environment variable as string
 */
export const validateEnvString = (field: string): Either<ConfigError, string> => {
  return pipe(
    validateRequired(field, process.env[field]),
    chain((value) => validateString(field, value))
  );
};

/**
 * Validates environment variable as number
 */
export const validateEnvNumber = (field: string): Either<ConfigError, number> => {
  return pipe(
    validateRequired(field, process.env[field]),
    chain((value) => validateString(field, value)),
    chain((value) => validateNumber(field, value))
  );
};

/**
 * Validates environment variable with default value
 */
export const validateEnvWithDefault = <T>(field: string, defaultValue: T, validator: (value: string) => Either<ConfigError, T>): Either<ConfigError, T> => {
  const envValue = process.env[field];
  if (!envValue) {
    return right(defaultValue);
  }
  return validator(envValue);
};

/**
 * Validates environment variable as Environment enum
 */
export const validateEnvironment = (field: string): Either<ConfigError, Environment> => {
  const environments: readonly Environment[] = ['development', 'test', 'staging', 'production']; // TODO: REMOVE_MOCK - Hard-coded array literals
  return pipe(
    validateEnvWithDefault(field, 'development' as Environment, (value) => 
      validateEnum(field, environments)(value)
    )
  );
};

/**
 * Validates comma-separated string as array
 */
export const validateStringArray = (field: string, value: string): Either<ConfigError, readonly string[]> => {
  if (!value.trim()) {
    return right([]);
  }
  const array = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  return right(array);
};

/**
 * Combines multiple validation results into a single result
 */
export const combineValidations = <T>(
  validations: readonly Either<ConfigError | readonly ConfigError[], any>[]
): Either<readonly ConfigError[], readonly any[]> => {
  const errors: ConfigError[] = [];
  const values: any[] = [];
  
  for (const validation of validations) {
    if (E.isLeft(validation)) {
      // Handle both single error and array of errors
      if (Array.isArray(validation.left)) {
        errors.push(...(validation.left as ConfigError[]));
      } else {
        errors.push(validation.left as ConfigError);
      }
    } else {
      values.push(validation.right);
    }
  }
  
  if (errors.length > 0) {
    return left(errors);
  }
  
  return right(values);
};

/**
 * API Key Configuration
 */
export interface ApiKeyRequirement {
  envVar: string;
  name: string;
  required: boolean;
  validator?: (value: string) => Either<ConfigError, string>;
  minLength?: number;
  pattern?: RegExp;
}

/**
 * Validates API key format and strength
 */
export const validateApiKeyFormat = (field: string, value: string, minLength: number = 32): Either<ConfigError, string> => {
  if (value.length < minLength) {
    return left(createError(field, `${field} must be at least ${minLength} characters long`, value.length));
  }
  
  // Check for common weak patterns
  if (/^(test|dev|demo|sample)/i.test(value)) {
    return left(createError(field, `${field} appears to be a test/development key and should not be used in production`));
  }
  
  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(value.toLowerCase()).size;
  if (uniqueChars < 10) {
    return left(createError(field, `${field} appears to have insufficient entropy`));
  }
  
  return right(value);
};

/**
 * Validates that all required API keys are present and properly formatted
 */
export const validateRequiredKeys = (): Either<ConfigError[], {
  valid: boolean;
  warnings: string[];
  keys: Record<string, boolean>;
}> => {
  const keyRequirements: ApiKeyRequirement[] = [
    {
      envVar: 'OPENAI_API_KEY',
      name: 'OpenAI API',
      required: true,
      validator: (value) => validateApiKeyFormat('OPENAI_API_KEY', value, 40),
      pattern: /^sk-[a-zA-Z0-9]{48,}$/
    },
    {
      envVar: 'SUPABASE_URL',
      name: 'Supabase URL',
      required: true,
      validator: (value) => pipe(
        validateString('SUPABASE_URL', value),
        chain((v) => validateUrl('SUPABASE_URL', v))
      )
    },
    {
      envVar: 'SUPABASE_ANON_KEY',
      name: 'Supabase Anonymous Key',
      required: true,
      validator: (value) => validateApiKeyFormat('SUPABASE_ANON_KEY', value, 100),
      minLength: 100
    },
    {
      envVar: 'SUPABASE_SERVICE_ROLE_KEY',
      name: 'Supabase Service Role Key',
      required: process.env.NODE_ENV === 'production',
      validator: (value) => validateApiKeyFormat('SUPABASE_SERVICE_ROLE_KEY', value, 100),
      minLength: 100
    },
    {
      envVar: 'MCP_API_KEY',
      name: 'MCP Server API Key',
      required: false,
      validator: (value) => validateApiKeyFormat('MCP_API_KEY', value)
    },
    {
      envVar: 'HIVE_API_KEY',
      name: 'Hive Intelligence API Key',
      required: false,
      validator: (value) => validateApiKeyFormat('HIVE_API_KEY', value)
    },
    {
      envVar: 'INTERNAL_API_KEY',
      name: 'Internal Service API Key',
      required: process.env.NODE_ENV === 'production',
      validator: (value) => validateApiKeyFormat('INTERNAL_API_KEY', value)
    },
    {
      envVar: 'JWT_SECRET',
      name: 'JWT Secret',
      required: true,
      validator: (value) => validateApiKeyFormat('JWT_SECRET', value, 32)
    },
    {
      envVar: 'REDIS_URL',
      name: 'Redis Connection URL',
      required: process.env.NODE_ENV === 'production',
      validator: (value) => {
        try {
          const url = new URL(value);
          if (!['redis:', 'rediss:'].includes(url.protocol)) {
            return left(createError('REDIS_URL', 'REDIS_URL must use redis:// or rediss:// protocol'));
          }
          return right(value);
        } catch {
          return left(createError('REDIS_URL', 'REDIS_URL must be a valid Redis connection string'));
        }
      }
    }
  ];

  const errors: ConfigError[] = [];
  const warnings: string[] = [];
  const keyStatus: Record<string, boolean> = {};

  for (const requirement of keyRequirements) {
    const value = process.env[requirement.envVar];
    keyStatus[requirement.envVar] = !!value;

    if (!value) {
      if (requirement.required) {
        errors.push(createError(
          requirement.envVar,
          `Missing required environment variable: ${requirement.envVar} (${requirement.name})`
        ));
      } else {
        warnings.push(`Optional environment variable not configured: ${requirement.envVar} (${requirement.name})`);
      }
      continue;
    }

    // Validate format if validator is provided
    if (requirement.validator) {
      const validationResult = requirement.validator(value);
      if (E.isLeft(validationResult)) {
        errors.push(validationResult.left);
      }
    }

    // Validate pattern if provided
    if (requirement.pattern && !requirement.pattern.test(value)) {
      errors.push(createError(
        requirement.envVar,
        `${requirement.envVar} does not match expected format`
      ));
    }

    // Check minimum length
    if (requirement.minLength && value.length < requirement.minLength) {
      errors.push(createError(
        requirement.envVar,
        `${requirement.envVar} must be at least ${requirement.minLength} characters long`,
        value.length
      ));
    }
  }

  if (errors.length > 0) {
    return left(errors);
  }

  return right({
    valid: true,
    warnings,
    keys: keyStatus
  });
};

/**
 * Validates network endpoints
 */
export const validateNetworkEndpoints = (): Either<ConfigError[], void> => {
  const endpoints = [
    {
      envVar: 'SEI_RPC_URL',
      name: 'Sei RPC URL',
      defaultValue: 'https://sei-rpc.polkachu.com'
    },
    {
      envVar: 'SEI_EVM_RPC_URL',
      name: 'Sei EVM RPC URL',
      defaultValue: 'https://evm-rpc.sei-apis.com'
    },
    {
      envVar: 'FRONTEND_URL',
      name: 'Frontend URL',
      defaultValue: process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000'
    }
  ];

  const errors: ConfigError[] = [];

  for (const endpoint of endpoints) {
    const value = process.env[endpoint.envVar] || endpoint.defaultValue;
    
    if (!value) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(createError(endpoint.envVar, `${endpoint.name} is required in production`));
      }
      continue;
    }

    const urlValidation = validateUrl(endpoint.envVar, value);
    if (E.isLeft(urlValidation)) {
      errors.push(urlValidation.left);
    }
  }

  if (errors.length > 0) {
    return left(errors);
  }

  return right(void 0);
};

/**
 * Validates environment-specific configuration
 */
export const validateEnvironmentConfig = (): Either<ConfigError[], {
  environment: Environment;
  isProduction: boolean;
  securityLevel: 'development' | 'staging' | 'production';
}> => {
  const envValidation = validateEnvironment('NODE_ENV');
  
  if (E.isLeft(envValidation)) {
    return left([envValidation.left]);
  }

  const environment = envValidation.right;
  const isProduction = environment === 'production';
  
  let securityLevel: 'development' | 'staging' | 'production';
  switch (environment) {
    case 'production':
      securityLevel = 'production';
      break;
    case 'staging':
      securityLevel = 'staging';
      break;
    default:
      securityLevel = 'development';
  }

  return right({
    environment,
    isProduction,
    securityLevel
  });
};

/**
 * Comprehensive startup validation
 */
export const validateStartupConfiguration = (): Either<ConfigError[], {
  environment: {
    environment: Environment;
    isProduction: boolean;
    securityLevel: 'development' | 'staging' | 'production';
  };
  apiKeys: {
    valid: boolean;
    warnings: string[];
    keys: Record<string, boolean>;
  };
  networkEndpoints: boolean;
}> => {
  const validations = [
    validateEnvironmentConfig(),
    validateRequiredKeys(),
    validateNetworkEndpoints().map(() => true) as Either<ConfigError[], boolean>
  ] as const;

  const combined = combineValidations(validations);
  
  if (E.isLeft(combined)) {
    return left(combined.left as ConfigError[]);
  }

  const [environment, apiKeys, networkEndpoints] = combined.right;

  return right({
    environment,
    apiKeys,
    networkEndpoints
  });
};

/**
 * Validates a configuration object and returns Either result
 */
export const validateConfig = <T>(
  validationFn: () => Either<readonly ConfigError[], T>
): ConfigResult<T> => {
  try {
    return validationFn();
  } catch (error) {
    return left([createError('config', `Configuration validation failed: ${error}`)]);
  }
};
