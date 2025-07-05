// Validation utility types

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
// Note: fp-ts imports are used for type definitions only

// Core validation types
export interface ValidationError {
  field: string
  code: string
  message: string
  value?: unknown
  context?: Record<string, unknown>
}

export interface ValidationResult<T> {
  isValid: boolean
  data?: T
  errors: ValidationError[]
  warnings: string[]
}

export interface ValidationRule<T> {
  name: string
  message: string
  validate: (value: T, context?: Record<string, unknown>) => boolean
  severity: 'error' | 'warning'
  dependencies?: string[]
}

export interface ValidationSchema<T> {
  fields: Record<keyof T, FieldValidation<T[keyof T]>>
  crossFieldRules?: CrossFieldValidation<T>[]
  metadata?: {
    version: string
    description: string
    strict: boolean
  }
}

export interface FieldValidation<T> {
  required?: boolean
  rules: ValidationRule<T>[]
  transform?: (value: T) => T
  defaultValue?: T
  dependencies?: string[]
}

export interface CrossFieldValidation<T> {
  fields: Array<keyof T>
  rule: (values: Pick<T, keyof T>) => boolean
  message: string
  severity: 'error' | 'warning'
}

// Validator function types
export type Validator<T> = (value: unknown) => E.Either<ValidationError[], T>
export type FieldValidator<T> = (value: T, context?: Record<string, unknown>) => ValidationError[]
export type SchemaValidator<T> = (data: unknown) => ValidationResult<T>
export type AsyncValidator<T> = (value: T) => Promise<ValidationError[]>

// Built-in validation types
export interface StringValidationOptions {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowEmpty?: boolean
  trim?: boolean
  format?: 'email' | 'url' | 'uuid' | 'phone' | 'alphanumeric' | 'custom'
  customFormat?: RegExp
  enum?: string[]
  startsWith?: string
  endsWith?: string
  contains?: string
  excludes?: string[]
}

export interface NumberValidationOptions {
  min?: number
  max?: number
  integer?: boolean
  positive?: boolean
  negative?: boolean
  multipleOf?: number
  precision?: number
  finite?: boolean
  safe?: boolean
}

export interface ArrayValidationOptions<T> {
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  itemValidator?: Validator<T>
  allowEmpty?: boolean
}

export interface ObjectValidationOptions<T> {
  schema?: ValidationSchema<T>
  allowAdditionalProperties?: boolean
  strict?: boolean
  stripUnknown?: boolean
}

export interface DateValidationOptions {
  min?: Date
  max?: Date
  format?: string
  timezone?: string
  allowPast?: boolean
  allowFuture?: boolean
}

// Validation context types
export interface ValidationContext {
  path: string[]
  root: unknown
  parent?: unknown
  siblings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ValidationOptions {
  strict?: boolean
  stripUnknown?: boolean
  allowAdditionalProperties?: boolean
  abortEarly?: boolean
  context?: Record<string, unknown>
  transform?: boolean
  async?: boolean
}

// Form validation types
export interface FormValidationState<T> {
  data: Partial<T>
  errors: Record<keyof T, string[]>
  warnings: Record<keyof T, string[]>
  touched: Record<keyof T, boolean>
  dirty: Record<keyof T, boolean>
  isValid: boolean
  isValidating: boolean
  hasErrors: boolean
  hasWarnings: boolean
}

export interface FormFieldValidation<T> {
  value: T
  error?: string
  warning?: string
  touched: boolean
  dirty: boolean
  isValid: boolean
  isValidating: boolean
  validate: () => Promise<void>
  reset: () => void
  setValue: (value: T) => void
  setError: (error: string) => void
  clearError: () => void
}

export interface FormValidationConfig<T> {
  schema: ValidationSchema<T>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
  debounceDelay?: number
  abortEarly?: boolean
  stripUnknown?: boolean
  onValidate?: (result: ValidationResult<T>) => void
  onError?: (errors: ValidationError[]) => void
}

// Async validation types
export interface AsyncValidationConfig {
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
  debounce?: number
  onStart?: () => void
  onComplete?: (result: ValidationResult<any>) => void
  onError?: (error: Error) => void
}

export interface AsyncValidationResult<T> {
  isValidating: boolean
  result?: ValidationResult<T>
  error?: Error
  startTime?: number
  endTime?: number
}

// Validation rule presets
export interface ValidationPresets {
  string: {
    email: ValidationRule<string>
    url: ValidationRule<string>
    uuid: ValidationRule<string>
    phone: ValidationRule<string>
    alphanumeric: ValidationRule<string>
    noWhitespace: ValidationRule<string>
    minLength: (length: number) => ValidationRule<string>
    maxLength: (length: number) => ValidationRule<string>
    pattern: (regex: RegExp, message?: string) => ValidationRule<string>
  }
  number: {
    positive: ValidationRule<number>
    negative: ValidationRule<number>
    integer: ValidationRule<number>
    min: (value: number) => ValidationRule<number>
    max: (value: number) => ValidationRule<number>
    range: (min: number, max: number) => ValidationRule<number>
    multipleOf: (value: number) => ValidationRule<number>
  }
  array: {
    minItems: (count: number) => ValidationRule<unknown[]>
    maxItems: (count: number) => ValidationRule<unknown[]>
    uniqueItems: ValidationRule<unknown[]>
    notEmpty: ValidationRule<unknown[]>
  }
  date: {
    past: ValidationRule<Date>
    future: ValidationRule<Date>
    before: (date: Date) => ValidationRule<Date>
    after: (date: Date) => ValidationRule<Date>
    between: (start: Date, end: Date) => ValidationRule<Date>
  }
  common: {
    required: ValidationRule<unknown>
    notNull: ValidationRule<unknown>
    notUndefined: ValidationRule<unknown>
    oneOf: (values: unknown[]) => ValidationRule<unknown>
    noneOf: (values: unknown[]) => ValidationRule<unknown>
  }
}

// Validation transformer types
export interface ValidationTransformer<T, U> {
  name: string
  transform: (value: T) => E.Either<ValidationError, U>
  reverse?: (value: U) => E.Either<ValidationError, T>
}

export interface TransformationPipeline<T> {
  transformers: ValidationTransformer<any, any>[]
  apply: (value: unknown) => E.Either<ValidationError[], T>
  reverse: (value: T) => E.Either<ValidationError[], unknown>
}

// Validation utilities
export interface ValidationUtils {
  isEmail: (value: string) => boolean
  isUrl: (value: string) => boolean
  isUuid: (value: string) => boolean
  isPhone: (value: string) => boolean
  isAlphanumeric: (value: string) => boolean
  isNumeric: (value: string) => boolean
  isInteger: (value: number) => boolean
  isPositive: (value: number) => boolean
  isNegative: (value: number) => boolean
  isInRange: (value: number, min: number, max: number) => boolean
  isEmpty: (value: unknown) => boolean
  isNullOrUndefined: (value: unknown) => boolean
  isTruthy: (value: unknown) => boolean
  isFalsy: (value: unknown) => boolean
  isArray: (value: unknown) => value is unknown[]
  isObject: (value: unknown) => value is Record<string, unknown>
  isString: (value: unknown) => value is string
  isNumber: (value: unknown) => value is number
  isBoolean: (value: unknown) => value is boolean
  isDate: (value: unknown) => value is Date
  isFunction: (value: unknown) => value is Function
  deepEqual: (a: unknown, b: unknown) => boolean
  clone: <T>(value: T) => T
  get: (obj: Record<string, unknown>, path: string) => unknown
  set: (obj: Record<string, unknown>, path: string, value: unknown) => void
}

// Type guards and predicates
export type TypeGuard<T> = (value: unknown) => value is T
export type Predicate<T> = (value: T) => boolean

// Validation hook types
export interface UseValidationReturn<T> {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  validate: (data: unknown) => ValidationResult<T>
  validateField: (field: keyof T, value: unknown) => ValidationError[]
  reset: () => void
  setSchema: (schema: ValidationSchema<T>) => void
}

export interface UseFormValidationReturn<T> {
  state: FormValidationState<T>
  fields: Record<keyof T, FormFieldValidation<T[keyof T]>>
  validate: () => Promise<boolean>
  validateField: (field: keyof T) => Promise<void>
  reset: () => void
  setFieldValue: (field: keyof T, value: T[keyof T]) => void
  setFieldError: (field: keyof T, error: string) => void
  clearFieldError: (field: keyof T) => void
  touch: (field: keyof T) => void
  untouch: (field: keyof T) => void
  isDirty: (field?: keyof T) => boolean
  isTouched: (field?: keyof T) => boolean
  hasError: (field?: keyof T) => boolean
  getError: (field: keyof T) => string | undefined
}

export interface UseAsyncValidationReturn<T> {
  state: AsyncValidationResult<T>
  validate: (data: unknown) => Promise<ValidationResult<T>>
  cancel: () => void
  retry: () => Promise<ValidationResult<T>>
  clearCache: () => void
}

// Error handling types
export interface ValidationErrorFormatter {
  formatError: (error: ValidationError) => string
  formatErrors: (errors: ValidationError[]) => Record<string, string[]>
  formatFieldError: (field: string, errors: ValidationError[]) => string
}

export interface ValidationErrorHandler {
  onError: (errors: ValidationError[]) => void
  onFieldError: (field: string, errors: ValidationError[]) => void
  onWarning: (warnings: string[]) => void
  onSuccess: () => void
}

// Validation middleware types
export interface ValidationMiddleware<T> {
  name: string
  beforeValidation?: (data: unknown, context: ValidationContext) => unknown
  afterValidation?: (result: ValidationResult<T>, context: ValidationContext) => ValidationResult<T>
  onError?: (errors: ValidationError[], context: ValidationContext) => ValidationError[]
}

export interface ValidationMiddlewarePipeline<T> {
  middleware: ValidationMiddleware<T>[]
  execute: (data: unknown, validator: Validator<T>) => ValidationResult<T>
  add: (middleware: ValidationMiddleware<T>) => void
  remove: (name: string) => void
  clear: () => void
}

// Validation cache types
export interface ValidationCache {
  get: (key: string) => O.Option<ValidationResult<any>>
  set: (key: string, result: ValidationResult<any>, ttl?: number) => void
  delete: (key: string) => void
  clear: () => void
  size: () => number
}

export interface ValidationCacheConfig {
  enabled: boolean
  maxSize: number
  defaultTTL: number
  keyGenerator: (data: unknown, schema: ValidationSchema<any>) => string
}

// Validation performance types
export interface ValidationPerformance {
  validationTime: number
  ruleExecutions: number
  fieldValidations: number
  asyncValidations: number
  cacheHits: number
  cacheMisses: number
}

export interface ValidationBenchmark {
  name: string
  schema: ValidationSchema<any>
  data: unknown[]
  iterations: number
  results: {
    averageTime: number
    minTime: number
    maxTime: number
    totalTime: number
    successRate: number
    errorRate: number
  }
}

// Constants
export const VALIDATION_CODES = {
  REQUIRED: 'REQUIRED',
  TYPE_ERROR: 'TYPE_ERROR',
  MIN_LENGTH: 'MIN_LENGTH',
  MAX_LENGTH: 'MAX_LENGTH',
  PATTERN: 'PATTERN',
  MIN_VALUE: 'MIN_VALUE',
  MAX_VALUE: 'MAX_VALUE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_URL: 'INVALID_URL',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_DATE: 'INVALID_DATE',
  CUSTOM: 'CUSTOM'
} as const

export type ValidationCode = typeof VALIDATION_CODES[keyof typeof VALIDATION_CODES]