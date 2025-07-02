/**
 * Cache Service Mocks
 * Functional mock implementations for caching with Either/Option patterns
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// ===================== Error Types =====================

export type CacheError = 
  | { type: 'ConnectionError'; message: string }
  | { type: 'SerializationError'; key: string; value: any }
  | { type: 'DeserializationError'; key: string; data: string }
  | { type: 'KeyNotFound'; key: string }
  | { type: 'InvalidTTL'; ttl: number }
  | { type: 'CacheFullError'; maxSize: number };

export const createConnectionError = (message: string): CacheError => ({
  type: 'ConnectionError',
  message
});

export const createSerializationError = (key: string, value: any): CacheError => ({
  type: 'SerializationError',
  key,
  value
});

export const createDeserializationError = (key: string, data: string): CacheError => ({
  type: 'DeserializationError',
  key,
  data
});

export const createKeyNotFoundError = (key: string): CacheError => ({
  type: 'KeyNotFound',
  key
});

export const createInvalidTTLError = (ttl: number): CacheError => ({
  type: 'InvalidTTL',
  ttl
});

export const createCacheFullError = (maxSize: number): CacheError => ({
  type: 'CacheFullError',
  maxSize
});

// ===================== Cache Entry Type =====================

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
  readonly createdAt: number;
}

const createCacheEntry = <T>(value: T, ttlMs: number): CacheEntry<T> => {
  const now = Date.now();
  return {
    value,
    expiresAt: now + ttlMs,
    createdAt: now
  };
};

const isExpired = <T>(entry: CacheEntry<T>): boolean => 
  Date.now() > entry.expiresAt;

// ===================== Mock Cache State =====================

interface MockCacheState {
  readonly storage: ReadonlyMap<string, CacheEntry<any>>;
  readonly maxSize: number;
  readonly defaultTTL: number;
  readonly shouldSimulateFailure: boolean;
  readonly failureRate: number;
  readonly latency: number;
}

let mockCacheState: MockCacheState = {
  storage: new Map(),
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
  shouldSimulateFailure: false,
  failureRate: 0,
  latency: 10
};

// ===================== State Management =====================

export const setCacheMaxSize = (maxSize: number): void => {
  mockCacheState = { ...mockCacheState, maxSize };
};

export const setCacheDefaultTTL = (ttlMs: number): void => {
  mockCacheState = { ...mockCacheState, defaultTTL: ttlMs };
};

export const setCacheLatency = (latencyMs: number): void => {
  mockCacheState = { ...mockCacheState, latency: latencyMs };
};

export const simulateCacheFailure = (enable: boolean, failureRate: number = 0.1): void => {
  mockCacheState = { 
    ...mockCacheState, 
    shouldSimulateFailure: enable, 
    failureRate: Math.max(0, Math.min(1, failureRate))
  };
};

export const resetMockCache = (): void => {
  mockCacheState = {
    storage: new Map(),
    maxSize: 1000,
    defaultTTL: 300000,
    shouldSimulateFailure: false,
    failureRate: 0,
    latency: 10
  };
};

export const getCacheSize = (): number => mockCacheState.storage.size;

export const getCacheKeys = (): ReadonlyArray<string> => Array.from(mockCacheState.storage.keys());

// ===================== Validation Functions =====================

const validateKey = (key: string): E.Either<CacheError, string> =>
  key && key.length > 0 
    ? E.right(key)
    : E.left(createKeyNotFoundError(key));

const validateTTL = (ttl: number): E.Either<CacheError, number> =>
  ttl > 0 
    ? E.right(ttl)
    : E.left(createInvalidTTLError(ttl));

const validateCacheCapacity = (): E.Either<CacheError, void> =>
  mockCacheState.storage.size < mockCacheState.maxSize
    ? E.right(undefined)
    : E.left(createCacheFullError(mockCacheState.maxSize));

// ===================== Serialization Functions =====================

const serialize = <T>(value: T): E.Either<CacheError, string> =>
  E.tryCatch(
    () => JSON.stringify(value),
    () => createSerializationError('unknown', value)
  );

const deserialize = <T>(data: string): E.Either<CacheError, T> =>
  E.tryCatch(
    () => JSON.parse(data) as T,
    () => createDeserializationError('unknown', data)
  );

// ===================== Network Simulation =====================

const simulateOperation = <T>(operation: () => T): TE.TaskEither<CacheError, T> =>
  TE.tryCatch(
    async () => {
      // Simulate latency
      await new Promise(resolve => setTimeout(resolve, mockCacheState.latency));
      
      // Simulate random failures
      if (mockCacheState.shouldSimulateFailure && Math.random() < mockCacheState.failureRate) {
        throw new Error('Cache operation failed');
      }
      
      return operation();
    },
    error => createConnectionError(error instanceof Error ? error.message : String(error))
  );

// ===================== Cache Operations =====================

export const mockCacheGet = <T>(key: string): TE.TaskEither<CacheError, O.Option<T>> =>
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const entry = mockCacheState.storage.get(validKey);
        
        if (!entry) {
          return O.none;
        }
        
        if (isExpired(entry)) {
          // Remove expired entry
          const newStorage = new Map(mockCacheState.storage);
          newStorage.delete(validKey);
          mockCacheState = { ...mockCacheState, storage: newStorage };
          return O.none;
        }
        
        return O.some(entry.value);
      })
    )
  );

export const mockCacheSet = <T>(
  key: string, 
  value: T, 
  ttlMs?: number
): TE.TaskEither<CacheError, void> =>
  pipe(
    E.Do,
    E.bind('validKey', () => validateKey(key)),
    E.bind('validTTL', () => validateTTL(ttlMs || mockCacheState.defaultTTL)),
    E.bind('capacity', () => validateCacheCapacity()),
    E.fold(
      error => TE.left(error),
      ({ validKey, validTTL }) => simulateOperation(() => {
        const entry = createCacheEntry(value, validTTL);
        const newStorage = new Map(mockCacheState.storage);
        newStorage.set(validKey, entry);
        mockCacheState = { ...mockCacheState, storage: newStorage };
      })
    )
  );

export const mockCacheDelete = (key: string): TE.TaskEither<CacheError, boolean> =>
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const existed = mockCacheState.storage.has(validKey);
        if (existed) {
          const newStorage = new Map(mockCacheState.storage);
          newStorage.delete(validKey);
          mockCacheState = { ...mockCacheState, storage: newStorage };
        }
        return existed;
      })
    )
  );

export const mockCacheExists = (key: string): TE.TaskEither<CacheError, boolean> =>
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const entry = mockCacheState.storage.get(validKey);
        return entry ? !isExpired(entry) : false;
      })
    )
  );

export const mockCacheGetMany = <T>(keys: ReadonlyArray<string>): TE.TaskEither<CacheError, ReadonlyMap<string, T>> =>
  pipe(
    keys,
    TE.traverseArray(key => 
      pipe(
        mockCacheGet<T>(key),
        TE.map(option => [key, option] as const)
      )
    ),
    TE.map(entries => 
      new Map(
        entries
          .filter(([, option]) => O.isSome(option))
          .map(([key, option]) => [key, (option as O.Some<T>).value])
      )
    )
  );

export const mockCacheSetMany = <T>(
  entries: ReadonlyArray<readonly [string, T]>, 
  ttlMs?: number
): TE.TaskEither<CacheError, void> =>
  pipe(
    entries,
    TE.traverseArray(([key, value]) => mockCacheSet(key, value, ttlMs)),
    TE.map(() => undefined)
  );

export const mockCacheDeleteMany = (keys: ReadonlyArray<string>): TE.TaskEither<CacheError, number> =>
  pipe(
    keys,
    TE.traverseArray(mockCacheDelete),
    TE.map(results => results.filter(Boolean).length)
  );

export const mockCacheClear = (): TE.TaskEither<CacheError, void> =>
  simulateOperation(() => {
    mockCacheState = { ...mockCacheState, storage: new Map() };
  });

export const mockCacheFlushExpired = (): TE.TaskEither<CacheError, number> =>
  simulateOperation(() => {
    const now = Date.now();
    const newStorage = new Map<string, CacheEntry<any>>();
    let expiredCount = 0;
    
    for (const [key, entry] of mockCacheState.storage.entries()) {
      if (entry.expiresAt > now) {
        newStorage.set(key, entry);
      } else {
        expiredCount++;
      }
    }
    
    mockCacheState = { ...mockCacheState, storage: newStorage };
    return expiredCount;
  });

// ===================== Cache Statistics =====================

export interface CacheStats {
  readonly size: number;
  readonly maxSize: number;
  readonly utilization: number;
  readonly expiredEntries: number;
}

export const mockCacheGetStats = (): TE.TaskEither<CacheError, CacheStats> =>
  simulateOperation(() => {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of mockCacheState.storage.values()) {
      if (entry.expiresAt <= now) {
        expiredCount++;
      }
    }
    
    return {
      size: mockCacheState.storage.size,
      maxSize: mockCacheState.maxSize,
      utilization: mockCacheState.storage.size / mockCacheState.maxSize,
      expiredEntries: expiredCount
    };
  });

// ===================== Functional Helpers =====================

export const mockCacheGetOrSet = <T>(
  key: string,
  factory: () => TE.TaskEither<CacheError, T>,
  ttlMs?: number
): TE.TaskEither<CacheError, T> =>
  pipe(
    mockCacheGet<T>(key),
    TE.chain(option =>
      O.isSome(option)
        ? TE.right(option.value)
        : pipe(
            factory(),
            TE.chainFirst(value => mockCacheSet(key, value, ttlMs))
          )
    )
  );

export const mockCacheUpdate = <T>(
  key: string,
  updater: (current: T) => T,
  ttlMs?: number
): TE.TaskEither<CacheError, O.Option<T>> =>
  pipe(
    mockCacheGet<T>(key),
    TE.chain(option =>
      O.isSome(option)
        ? pipe(
            updater(option.value),
            value => mockCacheSet(key, value, ttlMs),
            TE.map(() => O.some(value))
          )
        : TE.right(O.none)
    )
  );

// ===================== Export Mock Service =====================

export const mockCacheService = {
  get: mockCacheGet,
  set: mockCacheSet,
  delete: mockCacheDelete,
  exists: mockCacheExists,
  getMany: mockCacheGetMany,
  setMany: mockCacheSetMany,
  deleteMany: mockCacheDeleteMany,
  clear: mockCacheClear,
  flushExpired: mockCacheFlushExpired,
  getStats: mockCacheGetStats,
  getOrSet: mockCacheGetOrSet,
  update: mockCacheUpdate
};