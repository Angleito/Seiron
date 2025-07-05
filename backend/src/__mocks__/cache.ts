/**
 * Cache Service Mocks // TODO: REMOVE_MOCK - Mock-related keywords
 * Functional mock implementations for caching with Either/Option patterns // TODO: REMOVE_MOCK - Mock-related keywords
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

// ===================== Mock Cache State ===================== // TODO: REMOVE_MOCK - Mock-related keywords

interface MockCacheState { // TODO: REMOVE_MOCK - Mock-related keywords
  readonly storage: ReadonlyMap<string, CacheEntry<any>>;
  readonly maxSize: number;
  readonly defaultTTL: number;
  readonly shouldSimulateFailure: boolean;
  readonly failureRate: number;
  readonly latency: number;
}

let mockCacheState: MockCacheState = { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  storage: new Map(),
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
  shouldSimulateFailure: false,
  failureRate: 0,
  latency: 10
};

// ===================== State Management =====================

export const setCacheMaxSize = (maxSize: number): void => {
  mockCacheState = { ...mockCacheState, maxSize }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const setCacheDefaultTTL = (ttlMs: number): void => {
  mockCacheState = { ...mockCacheState, defaultTTL: ttlMs }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const setCacheLatency = (latencyMs: number): void => {
  mockCacheState = { ...mockCacheState, latency: latencyMs }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const simulateCacheFailure = (enable: boolean, failureRate: number = 0.1): void => {
  mockCacheState = {  // TODO: REMOVE_MOCK - Mock-related keywords
    ...mockCacheState,  // TODO: REMOVE_MOCK - Mock-related keywords
    shouldSimulateFailure: enable, 
    failureRate: Math.max(0, Math.min(1, failureRate))
  };
};

export const resetMockCache = (): void => { // TODO: REMOVE_MOCK - Mock-related keywords
  mockCacheState = { // TODO: REMOVE_MOCK - Mock-related keywords
    storage: new Map(),
    maxSize: 1000,
    defaultTTL: 300000,
    shouldSimulateFailure: false,
    failureRate: 0,
    latency: 10
  };
};

export const getCacheSize = (): number => mockCacheState.storage.size; // TODO: REMOVE_MOCK - Mock-related keywords

export const getCacheKeys = (): ReadonlyArray<string> => Array.from(mockCacheState.storage.keys()); // TODO: REMOVE_MOCK - Mock-related keywords

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
  mockCacheState.storage.size < mockCacheState.maxSize // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    ? E.right(undefined)
    : E.left(createCacheFullError(mockCacheState.maxSize)); // TODO: REMOVE_MOCK - Mock-related keywords

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
      await new Promise(resolve => setTimeout(resolve, mockCacheState.latency)); // TODO: REMOVE_MOCK - Mock-related keywords
      
      // Simulate random failures
      if (mockCacheState.shouldSimulateFailure && Math.random() < mockCacheState.failureRate) { // TODO: REMOVE_MOCK - Random value generation // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
        throw new Error('Cache operation failed');
      }
      
      return operation();
    },
    error => createConnectionError(error instanceof Error ? error.message : String(error))
  );

// ===================== Cache Operations =====================

export const mockCacheGet = <T>(key: string): TE.TaskEither<CacheError, O.Option<T>> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const entry = mockCacheState.storage.get(validKey); // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (!entry) {
          return O.none;
        }
        
        if (isExpired(entry)) {
          // Remove expired entry
          const newStorage = new Map(mockCacheState.storage); // TODO: REMOVE_MOCK - Mock-related keywords
          newStorage.delete(validKey);
          mockCacheState = { ...mockCacheState, storage: newStorage }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
          return O.none;
        }
        
        return O.some(entry.value);
      })
    )
  );

export const mockCacheSet = <T>( // TODO: REMOVE_MOCK - Mock-related keywords
  key: string, 
  value: T, 
  ttlMs?: number
): TE.TaskEither<CacheError, void> =>
  pipe(
    E.Do,
    E.bind('validKey', () => validateKey(key)),
    E.bind('validTTL', () => validateTTL(ttlMs || mockCacheState.defaultTTL)), // TODO: REMOVE_MOCK - Mock-related keywords
    E.bind('capacity', () => validateCacheCapacity()),
    E.fold(
      error => TE.left(error),
      ({ validKey, validTTL }) => simulateOperation(() => {
        const entry = createCacheEntry(value, validTTL);
        const newStorage = new Map(mockCacheState.storage); // TODO: REMOVE_MOCK - Mock-related keywords
        newStorage.set(validKey, entry);
        mockCacheState = { ...mockCacheState, storage: newStorage }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      })
    )
  );

export const mockCacheDelete = (key: string): TE.TaskEither<CacheError, boolean> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const existed = mockCacheState.storage.has(validKey); // TODO: REMOVE_MOCK - Mock-related keywords
        if (existed) {
          const newStorage = new Map(mockCacheState.storage); // TODO: REMOVE_MOCK - Mock-related keywords
          newStorage.delete(validKey);
          mockCacheState = { ...mockCacheState, storage: newStorage }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
        }
        return existed;
      })
    )
  );

export const mockCacheExists = (key: string): TE.TaskEither<CacheError, boolean> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateKey(key),
    E.fold(
      error => TE.left(error),
      validKey => simulateOperation(() => {
        const entry = mockCacheState.storage.get(validKey); // TODO: REMOVE_MOCK - Mock-related keywords
        return entry ? !isExpired(entry) : false;
      })
    )
  );

export const mockCacheGetMany = <T>(keys: ReadonlyArray<string>): TE.TaskEither<CacheError, ReadonlyMap<string, T>> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    keys,
    TE.traverseArray(key => 
      pipe(
        mockCacheGet<T>(key), // TODO: REMOVE_MOCK - Mock-related keywords
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

export const mockCacheSetMany = <T>( // TODO: REMOVE_MOCK - Mock-related keywords
  entries: ReadonlyArray<readonly [string, T]>, 
  ttlMs?: number
): TE.TaskEither<CacheError, void> =>
  pipe(
    entries,
    TE.traverseArray(([key, value]) => mockCacheSet(key, value, ttlMs)), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.map(() => undefined)
  );

export const mockCacheDeleteMany = (keys: ReadonlyArray<string>): TE.TaskEither<CacheError, number> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    keys,
    TE.traverseArray(mockCacheDelete), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.map(results => results.filter(Boolean).length)
  );

export const mockCacheClear = (): TE.TaskEither<CacheError, void> => // TODO: REMOVE_MOCK - Mock-related keywords
  simulateOperation(() => {
    mockCacheState = { ...mockCacheState, storage: new Map() }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  });

export const mockCacheFlushExpired = (): TE.TaskEither<CacheError, number> => // TODO: REMOVE_MOCK - Mock-related keywords
  simulateOperation(() => {
    const now = Date.now();
    const newStorage = new Map<string, CacheEntry<any>>();
    let expiredCount = 0;
    
    for (const [key, entry] of mockCacheState.storage.entries()) { // TODO: REMOVE_MOCK - Mock-related keywords
      if (entry.expiresAt > now) {
        newStorage.set(key, entry);
      } else {
        expiredCount++;
      }
    }
    
    mockCacheState = { ...mockCacheState, storage: newStorage }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    return expiredCount;
  });

// ===================== Cache Statistics =====================

export interface CacheStats {
  readonly size: number;
  readonly maxSize: number;
  readonly utilization: number;
  readonly expiredEntries: number;
}

export const mockCacheGetStats = (): TE.TaskEither<CacheError, CacheStats> => // TODO: REMOVE_MOCK - Mock-related keywords
  simulateOperation(() => {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of mockCacheState.storage.values()) { // TODO: REMOVE_MOCK - Mock-related keywords
      if (entry.expiresAt <= now) {
        expiredCount++;
      }
    }
    
    return {
      size: mockCacheState.storage.size, // TODO: REMOVE_MOCK - Mock-related keywords
      maxSize: mockCacheState.maxSize, // TODO: REMOVE_MOCK - Mock-related keywords
      utilization: mockCacheState.storage.size / mockCacheState.maxSize, // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expiredEntries: expiredCount
    };
  });

// ===================== Functional Helpers =====================

export const mockCacheGetOrSet = <T>( // TODO: REMOVE_MOCK - Mock-related keywords
  key: string,
  factory: () => TE.TaskEither<CacheError, T>,
  ttlMs?: number
): TE.TaskEither<CacheError, T> =>
  pipe(
    mockCacheGet<T>(key), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.chain(option =>
      O.isSome(option)
        ? TE.right(option.value)
        : pipe(
            factory(),
            TE.chainFirst(value => mockCacheSet(key, value, ttlMs)) // TODO: REMOVE_MOCK - Mock-related keywords
          )
    )
  );

export const mockCacheUpdate = <T>( // TODO: REMOVE_MOCK - Mock-related keywords
  key: string,
  updater: (current: T) => T,
  ttlMs?: number
): TE.TaskEither<CacheError, O.Option<T>> =>
  pipe(
    mockCacheGet<T>(key), // TODO: REMOVE_MOCK - Mock-related keywords
    TE.chain(option =>
      O.isSome(option)
        ? pipe(
            updater(option.value),
            value => mockCacheSet(key, value, ttlMs), // TODO: REMOVE_MOCK - Mock-related keywords
            TE.map(() => O.some(value))
          )
        : TE.right(O.none)
    )
  );

// ===================== Export Mock Service ===================== // TODO: REMOVE_MOCK - Mock-related keywords

export const mockCacheService = { // TODO: REMOVE_MOCK - Mock-related keywords
  get: mockCacheGet, // TODO: REMOVE_MOCK - Mock-related keywords
  set: mockCacheSet, // TODO: REMOVE_MOCK - Mock-related keywords
  delete: mockCacheDelete, // TODO: REMOVE_MOCK - Mock-related keywords
  exists: mockCacheExists, // TODO: REMOVE_MOCK - Mock-related keywords
  getMany: mockCacheGetMany, // TODO: REMOVE_MOCK - Mock-related keywords
  setMany: mockCacheSetMany, // TODO: REMOVE_MOCK - Mock-related keywords
  deleteMany: mockCacheDeleteMany, // TODO: REMOVE_MOCK - Mock-related keywords
  clear: mockCacheClear, // TODO: REMOVE_MOCK - Mock-related keywords
  flushExpired: mockCacheFlushExpired, // TODO: REMOVE_MOCK - Mock-related keywords
  getStats: mockCacheGetStats, // TODO: REMOVE_MOCK - Mock-related keywords
  getOrSet: mockCacheGetOrSet, // TODO: REMOVE_MOCK - Mock-related keywords
  update: mockCacheUpdate // TODO: REMOVE_MOCK - Mock-related keywords
};