# Architecture Overview

The Sei AI Portfolio Manager backend is built on functional programming principles using fp-ts, providing a robust, composable, and type-safe architecture for DeFi portfolio management.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [System Architecture](#system-architecture)
- [Functional Layers](#functional-layers)
- [Data Flow](#data-flow)
- [Error Handling Strategy](#error-handling-strategy)
- [State Management](#state-management)
- [Performance Considerations](#performance-considerations)
- [Security Architecture](#security-architecture)

## Design Philosophy

### Functional Programming Principles

The architecture is built around core functional programming concepts:

1. **Pure Functions**: Core business logic is implemented as pure functions
2. **Immutability**: All data structures are immutable by default
3. **Composability**: Small, focused functions that compose to create complex behaviors
4. **Type Safety**: Comprehensive TypeScript types with fp-ts for enhanced safety
5. **Error Handling**: Explicit error handling using Either and TaskEither types

### Key Benefits

- **Predictable**: Pure functions with no side effects
- **Testable**: Easy to unit test and reason about
- **Maintainable**: Clear separation of concerns and composable design
- **Reliable**: Robust error handling and type safety
- **Scalable**: Modular architecture that grows with requirements

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend Apps  │  Mobile Apps  │  Third-party Integrations │
└─────────────────┬───────────────┬───────────────────────────┘
                  │               │
                  ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                             │
├─────────────────────────────────────────────────────────────┤
│  Rate Limiting  │  Authentication  │  Request Validation     │
│  CORS Setup     │  Error Handling  │  Response Formatting    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Portfolio       │ Risk Management │ AI & Analytics          │
│ Service         │ Service         │ Service                 │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Data Agg.     │ • Risk Calc.    │ • OpenAI Integration    │
│ • State Mgmt.   │ • Monitoring    │ • Analysis Generation   │
│ • Real-time     │ • Alerts        │ • Recommendations      │
└─────────────────┼─────────────────┼─────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Adapter Layer                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Blockchain      │ Protocol        │ External Services       │
│ Adapters        │ Adapters        │ Adapters                │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Sei Network   │ • YeiFinance    │ • Price Feeds           │
│ • Viem Client   │ • DragonSwap    │ • Market Data           │
│ • Web3 Calls    │ • Generic DEX   │ • Notifications         │
└─────────────────┼─────────────────┼─────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Caching         │ State Storage   │ Real-time Updates       │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Redis Cache   │ • In-Memory     │ • Socket.io             │
│ • TTL Management│ • Event Store   │ • Event Broadcasting    │
│ • Invalidation  │ • Snapshots     │ • Client Management     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Functional Layers

### 1. Pure Function Layer

Core business logic implemented as pure functions:

```typescript
// Pure risk calculations
export const calculateHealthFactor = (snapshot: PortfolioSnapshot): number =>
  snapshot.totalSuppliedUSD > 0 && snapshot.totalBorrowedUSD > 0
    ? snapshot.totalSuppliedUSD / snapshot.totalBorrowedUSD
    : Number.MAX_SAFE_INTEGER;

// Pure data transformations
export const calculateAssetAllocations = (
  snapshot: PortfolioSnapshot,
  priceData: ReadonlyMap<string, PriceData>
): ReadonlyArray<AssetAllocation> =>
  pipe(
    snapshot.lendingPositions,
    A.groupBy(p => p.tokenSymbol),
    A.map(calculateAllocation),
    A.sortBy([weightDescending])
  );
```

### 2. Effect Management Layer

Handles side effects using TaskEither:

```typescript
// Database operations
const getUserPositions = (walletAddress: WalletAddress): AsyncResult<Position[]> =>
  TE.tryCatch(
    () => database.findPositions(walletAddress),
    (error) => new Error(`Database error: ${error}`)
  );

// External API calls
const fetchPriceData = (symbols: string[]): AsyncResult<PriceData[]> =>
  TE.tryCatch(
    () => priceAPI.getPrices(symbols),
    (error) => new Error(`Price API error: ${error}`)
  );
```

### 3. Service Composition Layer

Combines pure functions and effects:

```typescript
export class PortfolioService {
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
    );

  private getOrUpdatePortfolioSnapshot = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      this.cacheManager.getCachedPortfolio(walletAddress),
      TE.chain(cached => 
        cached 
          ? TE.right(cached)
          : this.fetchFreshPortfolioData(walletAddress)
      ),
      TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot))
    );
}
```

### 4. API Interface Layer

Express routes with functional error handling:

```typescript
router.get('/data', async (req, res) => {
  const result = await pipe(
    validateWalletAddress(req.query.walletAddress),
    TE.fromEither,
    TE.chain(address => req.services.portfolio.getPortfolioData(address)),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (data) => TE.of({ success: true, data })
    )
  )();

  res.json(result);
});
```

## Data Flow

### Request Processing Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│ Middleware      │ ◄── Rate Limiting, CORS, Validation
│ Pipeline        │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Route Handler   │ ◄── Request Parsing, Parameter Extraction
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Service Layer   │ ◄── Business Logic, Function Composition
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Data Layer      │ ◄── Cache Check, External APIs, Database
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Response        │ ◄── Error Handling, Data Transformation
│ Formation       │
└─────────────────┘
```

### Real-time Update Flow

```
Portfolio Change
     │
     ▼
┌─────────────────┐
│ Event Detection │ ◄── Blockchain monitoring, Manual refresh
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ State Update    │ ◄── Immutable state transition
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Event Emission  │ ◄── Portfolio state change events
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Client          │ ◄── WebSocket broadcast to subscribed clients
│ Notification    │
└─────────────────┘
```

### Data Processing Pipeline

```typescript
// Functional data processing pipeline
const processPortfolioData = (walletAddress: WalletAddress) =>
  pipe(
    // 1. Fetch raw data
    TE.Do,
    TE.bind('lendingData', () => yeiAdapter.getUserPositions(walletAddress)),
    TE.bind('liquidityData', () => dragonAdapter.getPositions(walletAddress)),
    TE.bind('tokenData', () => fetchTokenBalances(walletAddress)),
    
    // 2. Transform and validate
    TE.map(({ lendingData, liquidityData, tokenData }) => ({
      lending: lendingData.filter(isValidPosition),
      liquidity: liquidityData.filter(isValidPosition),
      tokens: tokenData.filter(isValidBalance)
    })),
    
    // 3. Calculate aggregates
    TE.map(data => calculatePortfolioSnapshot(walletAddress, data)),
    
    // 4. Enrich with analytics
    TE.chain(snapshot => 
      pipe(
        calculateRiskMetrics(snapshot),
        TE.map(risk => ({ snapshot, risk }))
      )
    ),
    
    // 5. Cache results
    TE.chain(({ snapshot, risk }) =>
      pipe(
        cacheManager.cachePortfolio(walletAddress, snapshot),
        TE.map(() => ({ snapshot, risk }))
      )
    )
  );
```

## Error Handling Strategy

### Hierarchical Error Types

```typescript
// Base error interface
interface AppError {
  readonly type: string;
  readonly message: string;
  readonly context?: any;
  readonly timestamp: number;
}

// Specific error types
interface ValidationError extends AppError {
  readonly type: 'validation';
  readonly field: string;
  readonly value: any;
}

interface NetworkError extends AppError {
  readonly type: 'network';
  readonly url: string;
  readonly status?: number;
}

interface BusinessLogicError extends AppError {
  readonly type: 'business_logic';
  readonly operation: string;
}
```

### Error Handling Pipeline

```typescript
// Centralized error handling with context
const handleServiceError = (error: Error, context: string): AppError => {
  const baseError = {
    timestamp: Date.now(),
    context
  };

  if (error.name === 'ValidationError') {
    return { ...baseError, type: 'validation', message: error.message };
  }
  
  if (error.message.includes('network')) {
    return { ...baseError, type: 'network', message: error.message };
  }
  
  return { ...baseError, type: 'unknown', message: error.message };
};

// Route-level error handling
const withErrorHandling = <T>(
  operation: TE.TaskEither<Error, T>,
  context: string
) =>
  pipe(
    operation,
    TE.mapLeft(error => handleServiceError(error, context)),
    TE.fold(
      (appError) => TE.of({ success: false, error: appError }),
      (data) => TE.of({ success: true, data })
    )
  );
```

### Recovery Strategies

```typescript
// Automatic retry with exponential backoff
const withRetry = <T>(
  operation: TE.TaskEither<Error, T>,
  maxRetries: number = 3
): TE.TaskEither<Error, T> => {
  const retry = (attempt: number): TE.TaskEither<Error, T> =>
    pipe(
      operation,
      TE.orElse(error => {
        if (attempt < maxRetries && isRetryableError(error)) {
          return pipe(
            TE.of(undefined),
            TE.delay(Math.pow(2, attempt) * 1000), // Exponential backoff
            TE.chain(() => retry(attempt + 1))
          );
        }
        return TE.left(error);
      })
    );
  
  return retry(0);
};

// Fallback to cached data
const withCacheFallback = <T>(
  primary: TE.TaskEither<Error, T>,
  cacheKey: string
): TE.TaskEither<Error, T> =>
  pipe(
    primary,
    TE.orElse(() => cache.get(cacheKey))
  );
```

## State Management

### Immutable State Architecture

```typescript
// State is never mutated, always creating new objects
interface PortfolioState {
  readonly current: PortfolioSnapshot;
  readonly previous?: PortfolioSnapshot;
  readonly history: ReadonlyArray<PortfolioSnapshot>;
  readonly isLoading: boolean;
  readonly lastError?: Error;
  readonly updateCount: number;
}

// State transitions
const updateState = (
  currentState: PortfolioState,
  newSnapshot: PortfolioSnapshot
): PortfolioState => ({
  ...currentState,
  previous: currentState.current,
  current: newSnapshot,
  history: [...currentState.history, newSnapshot].slice(-100), // Keep last 100
  isLoading: false,
  updateCount: currentState.updateCount + 1
});
```

### Event-Driven Updates

```typescript
// Event emitter for state changes
export class PortfolioStateManager extends EventEmitter {
  private states = new Map<WalletAddress, PortfolioState>();

  public updateSnapshot = (
    walletAddress: WalletAddress,
    newSnapshot: PortfolioSnapshot
  ): TE.TaskEither<Error, void> =>
    pipe(
      this.getCurrentState(walletAddress),
      TE.map(currentState => {
        const newState = updateState(currentState, newSnapshot);
        this.states.set(walletAddress, newState);
        
        // Emit change event
        this.emit('state_updated', {
          walletAddress,
          previous: currentState.current,
          current: newSnapshot,
          changes: this.calculateDiff(currentState.current, newSnapshot)
        });
        
        return newState;
      }),
      TE.map(() => undefined)
    );
}
```

## Performance Considerations

### Caching Strategy

```typescript
// Multi-level caching with TTL
const cacheHierarchy = {
  L1: { // In-memory cache
    ttl: 30_000,     // 30 seconds
    maxSize: 1000
  },
  L2: { // Redis cache  
    ttl: 300_000,    // 5 minutes
    maxSize: 10_000
  },
  L3: { // Persistent storage
    ttl: 3_600_000,  // 1 hour
    maxSize: 100_000
  }
};

const getCachedData = <T>(key: string): TE.TaskEither<Error, T | null> =>
  pipe(
    // Try L1 cache first
    inMemoryCache.get(key),
    TE.chain(l1Data => 
      l1Data 
        ? TE.right(l1Data)
        : pipe(
            // Fallback to L2 cache
            redisCache.get(key),
            TE.chain(l2Data =>
              l2Data
                ? pipe(
                    inMemoryCache.set(key, l2Data, cacheHierarchy.L1.ttl),
                    TE.map(() => l2Data)
                  )
                : TE.right(null)
            )
          )
    )
  );
```

### Lazy Evaluation

```typescript
// Defer expensive calculations until needed
const portfolioAnalytics = (snapshot: PortfolioSnapshot) => ({
  get basicMetrics() {
    return calculateBasicMetrics(snapshot);
  },
  get riskAnalysis() {
    return calculateRiskAnalysis(snapshot);
  },
  get performanceMetrics() {
    return calculatePerformanceMetrics(snapshot);
  },
  get fullAnalysis() {
    return {
      basic: this.basicMetrics,
      risk: this.riskAnalysis,
      performance: this.performanceMetrics
    };
  }
});
```

### Parallel Processing

```typescript
// Process independent operations in parallel
const fetchAllPortfolioData = (walletAddress: WalletAddress) =>
  pipe(
    [
      yeiAdapter.getUserPositions(walletAddress),
      dragonAdapter.getPositions(walletAddress),
      fetchTokenBalances(walletAddress),
      fetchPriceData(walletAddress)
    ],
    A.sequence(TE.ApplicativePar), // Parallel execution
    TE.map(([lending, liquidity, tokens, prices]) => ({
      lending,
      liquidity,
      tokens,
      prices
    }))
  );
```

## Security Architecture

### Input Validation

```typescript
// Functional validation with Either
const validateWalletAddress = (address: unknown): E.Either<ValidationError, WalletAddress> =>
  pipe(
    address,
    validateString,
    E.chain(validateEthereumAddress),
    E.mapLeft(error => ({
      type: 'validation',
      field: 'walletAddress',
      message: error.message,
      value: address
    }))
  );

// Route-level validation
router.get('/data', [
  query('walletAddress').custom(address => 
    pipe(
      validateWalletAddress(address),
      E.fold(
        error => { throw new Error(error.message); },
        () => true
      )
    )
  )
], async (req, res) => {
  // Handler logic
});
```

### Rate Limiting

```typescript
// Functional rate limiting
const createRateLimiter = (config: RateLimitConfig) => {
  const windows = new Map<string, { count: number; resetTime: number }>();
  
  return (identifier: string): E.Either<RateLimitError, void> => {
    const now = Date.now();
    const window = windows.get(identifier) || { count: 0, resetTime: now + config.windowMs };
    
    if (now > window.resetTime) {
      // Reset window
      windows.set(identifier, { count: 1, resetTime: now + config.windowMs });
      return E.right(undefined);
    }
    
    if (window.count >= config.max) {
      return E.left({
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        retryAfter: window.resetTime - now
      });
    }
    
    windows.set(identifier, { ...window, count: window.count + 1 });
    return E.right(undefined);
  };
};
```

### Data Sanitization

```typescript
// Functional data cleaning
const sanitizeInput = <T>(input: T): T =>
  pipe(
    input,
    removeNullBytes,
    trimWhitespace,
    escapeHtml,
    validateCharacterSet
  );

// Type-safe sanitization
const sanitizePortfolioRequest = (
  request: unknown
): E.Either<ValidationError, PortfolioRequest> =>
  pipe(
    request,
    validateObject,
    E.map(sanitizeInput),
    E.chain(validatePortfolioRequestSchema)
  );
```

---

This architecture provides a solid foundation for building reliable, maintainable, and scalable DeFi applications using functional programming principles with fp-ts.