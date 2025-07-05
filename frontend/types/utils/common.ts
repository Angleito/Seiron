// Common utility types

import * as O from 'fp-ts/Option'
// Note: fp-ts imports are used for type definitions

// Basic utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

export type NonEmptyArray<T> = [T, ...T[]]
export type EmptyObject = Record<string, never>
export type UnknownObject = Record<string, unknown>
export type StringRecord = Record<string, string>
export type NumberRecord = Record<string, number>
export type BooleanRecord = Record<string, boolean>

// Object manipulation types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type PickByType<T, U> = Pick<T, {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]>

export type OmitByType<T, U> = Omit<T, {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]>

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

export type Flatten<T> = T extends Array<infer U> ? U : T

export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

// Function types
export type Predicate<T> = (value: T) => boolean
export type AsyncPredicate<T> = (value: T) => Promise<boolean>
export type Mapper<T, U> = (value: T) => U
export type AsyncMapper<T, U> = (value: T) => Promise<U>
export type ArrayReducer<T, U> = (accumulator: U, current: T) => U
export type AsyncArrayReducer<T, U> = (accumulator: U, current: T) => Promise<U>
export type Comparator<T> = (a: T, b: T) => number
export type Equality<T> = (a: T, b: T) => boolean

export type Consumer<T> = (value: T) => void
export type AsyncConsumer<T> = (value: T) => Promise<void>
export type Supplier<T> = () => T
export type AsyncSupplier<T> = () => Promise<T>

export type BiFunction<T, U, R> = (a: T, b: U) => R
export type TriFunction<T, U, V, R> = (a: T, b: U, c: V) => R

// Event types
export interface EventEmitter<T = any> {
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void
  emit<K extends keyof T>(event: K, data: T[K]): void
  once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void
  removeAllListeners<K extends keyof T>(event?: K): void
}

export interface Disposable {
  dispose(): void
}

export interface DisposableGroup extends Disposable {
  add(disposable: Disposable): void
  remove(disposable: Disposable): void
  clear(): void
}

// Cache types
export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl?: number
  accessCount: number
  lastAccessed: number
}

export interface Cache<K, V> {
  get(key: K): O.Option<V>
  set(key: K, value: V, ttl?: number): void
  has(key: K): boolean
  delete(key: K): boolean
  clear(): void
  size(): number
  keys(): K[]
  values(): V[]
  entries(): Array<[K, V]>
}

export interface CacheConfig {
  maxSize?: number
  defaultTTL?: number
  cleanupInterval?: number
  strategy?: 'lru' | 'lfu' | 'fifo' | 'ttl'
}

// State management types
export interface StateManager<T> {
  getState(): T
  setState(state: T): void
  updateState(updater: (state: T) => T): void
  subscribe(listener: (state: T) => void): () => void
  reset(): void
}

export interface Action<T = any> {
  type: string
  payload?: T
  meta?: Record<string, any>
  error?: boolean
}

export type Reducer<S, A extends Action = Action> = (state: S, action: A) => S

export interface Store<S, A extends Action = Action> {
  getState(): S
  dispatch(action: A): void
  subscribe(listener: () => void): () => void
  replaceReducer(nextReducer: Reducer<S, A>): void
}

// Logger types
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: Record<string, any>
  error?: Error
  stack?: string
}

export interface Logger {
  trace(message: string, context?: Record<string, any>): void
  debug(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, error?: Error, context?: Record<string, any>): void
  fatal(message: string, error?: Error, context?: Record<string, any>): void
  log(level: LogLevel, message: string, context?: Record<string, any>): void
  child(context: Record<string, any>): Logger
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
}

export interface LoggerConfig {
  level: LogLevel
  format: 'json' | 'text' | 'structured'
  transports: LogTransport[]
  context?: Record<string, any>
}

export interface LogTransport {
  name: string
  level: LogLevel
  write(entry: LogEntry): void | Promise<void>
}

// Error handling types
export interface ErrorInfo {
  code: string
  message: string
  details?: Record<string, any>
  cause?: Error
  timestamp: number
  context?: Record<string, any>
}

export interface ErrorHandler<T = any> {
  handle(error: Error, context?: T): void | Promise<void>
  canHandle(error: Error): boolean
}

export interface RetryConfig {
  maxAttempts: number
  delay: number
  backoff: 'linear' | 'exponential' | 'custom'
  customBackoff?: (attempt: number) => number
  retryCondition?: (error: Error) => boolean
}

export interface CircuitBreakerConfig {
  threshold: number
  timeout: number
  monitor: boolean
  resetTimeout: number
  onOpen?: () => void
  onHalfOpen?: () => void
  onClose?: () => void
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

// Async utilities
export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: any) => void
  settled: boolean
}

export interface TimeoutConfig {
  timeout: number
  message?: string
  signal?: AbortSignal
}

export interface DebounceConfig {
  delay: number
  leading?: boolean
  trailing?: boolean
  maxWait?: number
}

export interface ThrottleConfig {
  delay: number
  leading?: boolean
  trailing?: boolean
}

// Validation utilities
export interface ValidationResult<T> {
  isValid: boolean
  value?: T
  errors: string[]
}

export type Validator<T> = (value: unknown) => ValidationResult<T>

// Type checking utilities
export interface TypeChecker {
  isString(value: unknown): value is string
  isNumber(value: unknown): value is number
  isBoolean(value: unknown): value is boolean
  isNull(value: unknown): value is null
  isUndefined(value: unknown): value is undefined
  isArray(value: unknown): value is unknown[]
  isObject(value: unknown): value is Record<string, unknown>
  isFunction(value: unknown): value is Function
  isDate(value: unknown): value is Date
  isRegExp(value: unknown): value is RegExp
  isError(value: unknown): value is Error
  isEmpty(value: unknown): boolean
  isNil(value: unknown): value is null | undefined
  isPrimitive(value: unknown): boolean
}

// Collection utilities
export interface CollectionUtils {
  groupBy<T, K extends keyof any>(
    array: T[], 
    keyFn: (item: T) => K
  ): Record<K, T[]>
  
  uniq<T>(array: T[], equalityFn?: Equality<T>): T[]
  
  sortBy<T>(
    array: T[], 
    keyFn: (item: T) => any, 
    direction?: 'asc' | 'desc'
  ): T[]
  
  chunk<T>(array: T[], size: number): T[][]
  
  flatten<T>(array: (T | T[])[]): T[]
  
  difference<T>(array1: T[], array2: T[], equalityFn?: Equality<T>): T[]
  
  intersection<T>(array1: T[], array2: T[], equalityFn?: Equality<T>): T[]
  
  union<T>(array1: T[], array2: T[], equalityFn?: Equality<T>): T[]
}

// Object utilities
export interface ObjectUtils {
  clone<T>(obj: T): T
  deepClone<T>(obj: T): T
  merge<T>(target: T, ...sources: Partial<T>[]): T
  deepMerge<T>(target: T, ...sources: DeepPartial<T>[]): T
  pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
  omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>
  get<T>(obj: Record<string, any>, path: string): T | undefined
  set<T>(obj: Record<string, any>, path: string, value: T): void
  has(obj: Record<string, any>, path: string): boolean
  keys<T>(obj: T): Array<keyof T>
  values<T>(obj: T): Array<T[keyof T]>
  entries<T>(obj: T): Array<[keyof T, T[keyof T]]>
  fromEntries<K extends string | number | symbol, V>(
    entries: Array<[K, V]>
  ): Record<K, V>
}

// String utilities
export interface StringUtils {
  camelCase(str: string): string
  kebabCase(str: string): string
  snakeCase(str: string): string
  pascalCase(str: string): string
  capitalize(str: string): string
  uncapitalize(str: string): string
  truncate(str: string, length: number, suffix?: string): string
  slugify(str: string): string
  stripHtml(str: string): string
  escapeHtml(str: string): string
  unescapeHtml(str: string): string
  pad(str: string, length: number, char?: string): string
  padStart(str: string, length: number, char?: string): string
  padEnd(str: string, length: number, char?: string): string
}

// Number utilities
export interface NumberUtils {
  clamp(value: number, min: number, max: number): number
  round(value: number, precision?: number): number
  random(min?: number, max?: number): number
  randomInt(min: number, max: number): number
  inRange(value: number, start: number, end: number): boolean
  formatBytes(bytes: number, decimals?: number): string
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string
  parseNumber(str: string): O.Option<number>
}

// Date utilities
export interface DateUtils {
  now(): number
  isValid(date: unknown): date is Date
  format(date: Date, format: string): string
  parse(str: string, format?: string): O.Option<Date>
  add(date: Date, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'): Date
  subtract(date: Date, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'): Date
  diff(date1: Date, date2: Date, unit?: 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'): number
  startOf(date: Date, unit: 'd' | 'w' | 'M' | 'y'): Date
  endOf(date: Date, unit: 'd' | 'w' | 'M' | 'y'): Date
  isBefore(date1: Date, date2: Date): boolean
  isAfter(date1: Date, date2: Date): boolean
  isSame(date1: Date, date2: Date, unit?: 'd' | 'w' | 'M' | 'y'): boolean
  isBetween(date: Date, start: Date, end: Date): boolean
}

// Functional programming utilities
export interface FpUtils {
  pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T
  compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T
  curry<T, U, V>(fn: (a: T, b: U) => V): (a: T) => (b: U) => V
  partial<T extends any[], U>(fn: (...args: T) => U, ...partialArgs: Partial<T>): (...remainingArgs: any[]) => U
  memoize<T extends any[], U>(fn: (...args: T) => U, keyFn?: (...args: T) => string): (...args: T) => U
  debounce<T extends any[]>(fn: (...args: T) => void, delay: number): (...args: T) => void
  throttle<T extends any[]>(fn: (...args: T) => void, delay: number): (...args: T) => void
  once<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U
}

// Constants and defaults
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 30 * 1000, // 30 seconds
  strategy: 'lru'
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential'
}

export const DEFAULT_DEBOUNCE_CONFIG: DebounceConfig = {
  delay: 300,
  leading: false,
  trailing: true
}

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  delay: 300,
  leading: true,
  trailing: false
}

// Type-safe environment variables
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test'
  API_URL: string
  WS_URL?: string
  LOG_LEVEL: LogLevel
  CACHE_ENABLED: boolean
  DEBUG: boolean
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  cache: CacheConfig
  logger: LoggerConfig
  features: Record<string, boolean>
  performance: {
    enableMetrics: boolean
    sampleRate: number
  }
  security: {
    enableCSP: boolean
    allowedOrigins: string[]
  }
}

// Hook return types for common utilities
export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T) => void
  removeValue: () => void
  error: Error | null
}

export interface UseDebounceReturn<T> {
  debouncedValue: T
  cancel: () => void
  flush: () => void
}

export interface UseThrottleReturn<T> {
  throttledValue: T
  cancel: () => void
  flush: () => void
}

export interface UseAsyncReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (...args: any[]) => Promise<T>
  reset: () => void
}