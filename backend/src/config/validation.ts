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
