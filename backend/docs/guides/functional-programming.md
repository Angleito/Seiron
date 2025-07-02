# Functional Programming Guide

This guide covers the functional programming patterns and fp-ts usage throughout the Sei AI Portfolio Manager backend.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [fp-ts Patterns Used](#fp-ts-patterns-used)
- [Error Handling](#error-handling)
- [Async Operations](#async-operations)
- [Data Validation](#data-validation)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Overview

The backend leverages functional programming principles using fp-ts to create:
- **Composable** functions that can be easily combined
- **Predictable** error handling with `Either` and `TaskEither` 
- **Immutable** data structures and operations
- **Type-safe** transformations and validations

## Core Concepts

### Either<E, A>
Represents values with two possibilities: a `Left` (error) or `Right` (success).

```typescript
import * as E from 'fp-ts/Either';

// Basic Either usage
const divide = (a: number, b: number): E.Either<string, number> =>
  b === 0 ? E.left('Division by zero') : E.right(a / b);

// Usage
const result = divide(10, 2); // E.right(5)
const error = divide(10, 0);  // E.left('Division by zero')
```

### TaskEither<E, A>
Represents asynchronous computations that may fail.

```typescript
import * as TE from 'fp-ts/TaskEither';

// Basic TaskEither usage
const fetchUserData = (id: string): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => api.getUser(id),
    (error) => new Error(`Failed to fetch user: ${error}`)
  );
```

### Pipe
Enables left-to-right function composition.

```typescript
import { pipe } from 'fp-ts/function';

const result = pipe(
  input,
  transform1,
  transform2,
  transform3
);
```

## fp-ts Patterns Used

### Configuration Validation

**File:** `src/config/index.ts`

```typescript
import { Either, fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const loadConfig = (): AppConfig => {
  const configResult = validateConfig();
  
  return pipe(
    configResult,
    fold(
      (errors) => {
        const errorMessage = formatConfigErrors(errors);
        throw new Error(errorMessage);
      },
      (config) => config
    )
  );
};
```

### Risk Calculations

**File:** `src/risk/calculations.ts`

```typescript
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

export const calculateHerfindahlIndex = (
  allocations: ReadonlyArray<{ weight: number }>
): number =>
  pipe(
    allocations,
    A.map(allocation => allocation.weight * allocation.weight),
    A.reduce(0, N.MonoidSum.concat)
  );

export const calculateAssetAllocations = (
  snapshot: PortfolioSnapshot,
  priceData: ReadonlyMap<string, PriceData>
): ReadonlyArray<AssetAllocation> => {
  // ... logic ...
  return pipe(
    Array.from(assetGroups.entries()),
    A.map(([symbol, valueUSD]) => ({
      symbol,
      weight: valueUSD / totalValue,
      valueUSD,
      volatility: priceData.get(symbol)?.volatility || 0
    })),
    A.sortBy([Ord.contramap((allocation: AssetAllocation) => 
      allocation.weight * -1)(N.Ord)])
  );
};
```

### Service Layer

**File:** `src/services/PortfolioService.ts`

```typescript
export class PortfolioService {
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
    );

  public refreshPortfolio = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      this.cacheManager.invalidateUser(walletAddress),
      TE.chain(() => this.fetchFreshPortfolioData(walletAddress)),
      TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot)),
      TE.chain(() => this.sendRealTimeUpdate(walletAddress, 'portfolio_refreshed')),
      TE.map(snapshot => snapshot)
    );
}
```

## Error Handling

### Consistent Error Types

All async operations return `TaskEither<Error, T>`:

```typescript
type AsyncResult<T> = TE.TaskEither<Error, T>;

// Service methods
public getPortfolioData = (address: WalletAddress): AsyncResult<PortfolioData>
public refreshPortfolio = (address: WalletAddress): AsyncResult<PortfolioSnapshot>
```

### Error Transformation

Convert exceptions to functional errors:

```typescript
const fetchTokenBalances = (walletAddress: WalletAddress): AsyncResult<TokenBalance[]> =>
  TE.tryCatch(
    async () => {
      const balance = await this.publicClient.getBalance({
        address: walletAddress as `0x${string}`
      });
      return [/* token balance data */];
    },
    (error) => new Error(`Failed to get token balances: ${error}`)
  );
```

### Error Handling in Routes

**File:** `src/routes/portfolio.ts`

```typescript
const result = await pipe(
  req.services.portfolio.getPortfolioData(walletAddress),
  TE.fold(
    (error) => TE.of({ success: false, error: error.message }),
    (portfolioData) => TE.of({ success: true, data: portfolioData })
  )
)();

res.json(result);
```

## Async Operations

### Sequential Operations

```typescript
private fetchFreshPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
  pipe(
    TE.Do,
    TE.bind('lendingPositions', () => this.getLendingPositions(walletAddress)),
    TE.bind('liquidityPositions', () => this.getLiquidityPositions(walletAddress)),
    TE.bind('tokenBalances', () => this.getTokenBalances(walletAddress)),
    TE.map(({ lendingPositions, liquidityPositions, tokenBalances }) => {
      // Create snapshot from data
      return snapshot;
    })
  );
```

### Chaining Operations

```typescript
private getOrUpdatePortfolioSnapshot = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
  pipe(
    this.cacheManager.getCachedPortfolio(walletAddress),
    TE.chain(cached => {
      if (cached) {
        return TE.right(cached);
      }
      return this.fetchFreshPortfolioData(walletAddress);
    }),
    TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot))
  );
```

## Data Validation

### Type Guards

**File:** `src/risk/types.ts`

```typescript
export const isValidRiskLevel = (level: string): level is RiskLevel =>
  ['low', 'medium', 'high', 'critical'].includes(level);

export const isValidAlertSeverity = (severity: string): severity is AlertSeverity =>
  ['info', 'warning', 'critical'].includes(severity);
```

### Configuration Validation

**File:** `src/config/validation.ts`

Uses Either for validation results:

```typescript
export const validateConfig = (): Either<ConfigError[], AppConfig> => {
  const errors: ConfigError[] = [];
  
  // Validation logic...
  
  return errors.length > 0 ? E.left(errors) : E.right(config);
};
```

## Common Patterns

### 1. Option for Nullable Values

```typescript
import * as O from 'fp-ts/Option';

const findUser = (id: string): O.Option<User> => {
  const user = users.find(u => u.id === id);
  return user ? O.some(user) : O.none;
};
```

### 2. Array Operations

```typescript
import * as A from 'fp-ts/Array';

const processPositions = (positions: Position[]): Position[] =>
  pipe(
    positions,
    A.filter(p => p.valueUSD > 0),
    A.map(calculateRisk),
    A.sortBy([Ord.contramap((p: Position) => p.risk)(N.Ord)])
  );
```

### 3. Map Operations

```typescript
import * as M from 'fp-ts/Map';

const aggregateBySymbol = (positions: Position[]): Map<string, number> =>
  positions.reduce((acc, pos) => 
    M.insertAt(S.Eq)(pos.symbol, pos.valueUSD, acc), 
    new Map()
  );
```

## Best Practices

### 1. Always Use Pipe

```typescript
// ✅ Good - readable left-to-right flow
const result = pipe(
  input,
  validate,
  transform,
  save
);

// ❌ Avoid - nested function calls
const result = save(transform(validate(input)));
```

### 2. Consistent Error Handling

```typescript
// ✅ Good - consistent TaskEither return type
public getUser = (id: string): AsyncResult<User> =>
  TE.tryCatch(
    () => database.findUser(id),
    (error) => new Error(`User lookup failed: ${error}`)
  );

// ❌ Avoid - throwing exceptions
public getUser = async (id: string): Promise<User> => {
  const user = await database.findUser(id);
  if (!user) throw new Error('User not found');
  return user;
};
```

### 3. Immutable Data Structures

```typescript
// ✅ Good - immutable updates
const updateSnapshot = (snapshot: PortfolioSnapshot, newData: Partial<PortfolioSnapshot>): PortfolioSnapshot => ({
  ...snapshot,
  ...newData,
  timestamp: new Date().toISOString()
});

// ❌ Avoid - mutations
const updateSnapshot = (snapshot: PortfolioSnapshot, newData: any): void => {
  snapshot.totalValueUSD = newData.totalValueUSD;
  snapshot.timestamp = new Date().toISOString(); // mutation!
};
```

### 4. Type-Safe Transformations

```typescript
// ✅ Good - explicit types and transformations
const calculateMetrics = (snapshot: PortfolioSnapshot): PortfolioMetrics => ({
  totalValue: snapshot.totalValueUSD,
  netWorth: snapshot.netWorth,
  healthFactor: snapshot.healthFactor,
  // ... other fields
});

// ❌ Avoid - any types and unsafe operations
const calculateMetrics = (snapshot: any): any => {
  return {
    totalValue: snapshot.totalValueUSD || 0,
    // ... might miss fields or have wrong types
  };
};
```

### 5. Composable Services

```typescript
// ✅ Good - services return TaskEither for composition
public analyzePortfolio = (walletAddress: WalletAddress): AsyncResult<Analysis> =>
  pipe(
    this.getPortfolioSnapshot(walletAddress),
    TE.map(snapshot => this.analytics.calculateMetrics(snapshot)),
    TE.chain(metrics => this.riskService.assessRisk(metrics)),
    TE.map(risk => ({ metrics, risk }))
  );
```

## Performance Considerations

### 1. Lazy Evaluation

fp-ts operations are lazy by default, allowing for efficient chaining:

```typescript
const pipeline = pipe(
  largeArray,
  A.filter(expensiveFilter),    // Only runs if needed
  A.map(expensiveTransform),    // Only runs on filtered items
  A.take(10)                    // Early termination
);
```

### 2. Memoization

Use fp-ts utilities for caching expensive computations:

```typescript
import { constVoid } from 'fp-ts/function';

const memoizedCalculation = useMemo(
  () => pipe(
    portfolioData,
    calculateRisk,
    calculateMetrics
  ),
  [portfolioData]
);
```

---

This functional programming approach ensures:
- **Predictable** error handling
- **Composable** business logic
- **Type-safe** transformations
- **Testable** pure functions
- **Maintainable** code structure