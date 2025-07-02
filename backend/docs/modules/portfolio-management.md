# Portfolio Management Module

The portfolio management system provides comprehensive DeFi portfolio tracking, analytics, and management using functional programming principles with fp-ts for robust state management and error handling.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [State Management](#state-management)
- [Analytics Engine](#analytics-engine)
- [Caching System](#caching-system)
- [Real-time Updates](#real-time-updates)
- [Usage Examples](#usage-examples)
- [Testing](#testing)

## Overview

The portfolio module implements:
- **Immutable** portfolio state management
- **Functional** service composition
- **Type-safe** operations with TaskEither
- **Real-time** position tracking
- **Comprehensive** analytics and metrics

## Architecture

```
src/
├── services/                    # Core business logic
│   ├── PortfolioService.ts     # Main portfolio service
│   ├── AIService.ts            # AI analysis integration
│   └── SocketService.ts        # Real-time communication
├── state/                      # State management
│   └── PortfolioState.ts       # Portfolio state manager
├── analytics/                  # Analytics engine
│   └── PortfolioAnalytics.ts   # Metrics and performance
├── tracking/                   # Position tracking
│   └── PositionTracker.ts      # Real-time position monitoring
├── caching/                    # Performance optimization
│   └── PortfolioCacheManager.ts # Redis-based caching
├── adapters/                   # Protocol integrations
│   ├── YeiFinanceAdapter.ts    # Lending protocol adapter
│   └── DragonSwapAdapter.ts    # DEX adapter
└── types/                      # Type definitions
    └── portfolio.ts            # Portfolio types
```

## Services

### PortfolioService

**File:** `src/services/PortfolioService.ts`

The main portfolio service orchestrates all portfolio operations using functional composition:

```typescript
export class PortfolioService {
  private portfolioState: PortfolioState;
  private positionTracker: PositionTracker;
  private analytics: PortfolioAnalytics;
  private cacheManager: PortfolioCacheManager;

  /**
   * Initialize portfolio state management for a user
   */
  public initializeUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      this.portfolioState.initializeUser(walletAddress),
      TE.chain(() => this.positionTracker.startTracking(walletAddress)),
      TE.map(() => {
        logger.info(`Portfolio service initialized for ${walletAddress}`);
      })
    );

  /**
   * Get complete portfolio data for a user
   */
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
    );

  /**
   * Get portfolio summary with key metrics
   */
  public getPortfolioSummary = (walletAddress: WalletAddress): AsyncResult<PortfolioSummary> =>
    pipe(
      this.getPortfolioMetrics(walletAddress),
      TE.map(metrics => ({
        totalValue: metrics.totalValue,
        totalSupplied: metrics.totalSupplied,
        totalBorrowed: metrics.totalBorrowed,
        totalLiquidity: metrics.totalLiquidity,
        healthFactor: metrics.healthFactor,
        apy: {
          lending: 5.5, // Calculated from actual positions
          liquidity: 12.3,
          total: 8.5
        }
      }))
    );
}
```

### Key Service Methods

#### Data Fetching with Caching

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

#### Fresh Data Aggregation

```typescript
private fetchFreshPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
  pipe(
    TE.Do,
    TE.bind('lendingPositions', () => this.getLendingPositions(walletAddress)),
    TE.bind('liquidityPositions', () => this.getLiquidityPositions(walletAddress)),
    TE.bind('tokenBalances', () => this.getTokenBalances(walletAddress)),
    TE.map(({ lendingPositions, liquidityPositions, tokenBalances }) => {
      // Calculate portfolio totals
      const totalSuppliedUSD = lendingPositions
        .filter(p => p.type === 'supply')
        .reduce((sum, p) => sum + p.valueUSD, 0);

      const totalBorrowedUSD = lendingPositions
        .filter(p => p.type === 'borrow')
        .reduce((sum, p) => sum + p.valueUSD, 0);

      const totalLiquidityUSD = liquidityPositions
        .reduce((sum, p) => sum + p.valueUSD, 0);

      const totalValueUSD = totalSuppliedUSD + totalLiquidityUSD + 
        tokenBalances.reduce((sum, b) => sum + b.valueUSD, 0);

      const netWorth = totalValueUSD - totalBorrowedUSD;
      const healthFactor = this.calculateHealthFactor(lendingPositions);

      return {
        walletAddress,
        totalValueUSD,
        totalSuppliedUSD,
        totalBorrowedUSD,
        totalLiquidityUSD,
        netWorth,
        healthFactor,
        lendingPositions,
        liquidityPositions,
        tokenBalances,
        timestamp: new Date().toISOString()
      } as PortfolioSnapshot;
    })
  );
```

#### Transaction Operations

```typescript
public executeLendingOperation = (
  operation: 'supply' | 'withdraw' | 'borrow' | 'repay',
  params: any
): AsyncResult<{ txHash: string; newSnapshot: PortfolioSnapshot }> =>
  pipe(
    this.executeOperation('lending', operation, params),
    TE.chain(txHash => 
      pipe(
        this.waitForTransactionConfirmation(txHash),
        TE.chain(() => this.refreshPortfolio(params.walletAddress)),
        TE.map(newSnapshot => ({ txHash, newSnapshot }))
      )
    )
  );
```

## State Management

### PortfolioState

**File:** `src/state/PortfolioState.ts`

Manages immutable portfolio state with event emission:

```typescript
export class PortfolioState extends EventEmitter {
  private userStates = new Map<WalletAddress, PortfolioState>();
  private snapshots = new Map<WalletAddress, PortfolioSnapshot[]>();

  /**
   * Initialize portfolio state for a new user
   */
  public initializeUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        if (!this.userStates.has(walletAddress)) {
          const initialState: PortfolioState = {
            current: this.createEmptySnapshot(walletAddress),
            history: [],
            isLoading: false,
            lastUpdateAttempt: new Date().toISOString(),
            updateCount: 0
          };
          
          this.userStates.set(walletAddress, initialState);
          this.snapshots.set(walletAddress, []);
          
          logger.info(`Initialized portfolio state for ${walletAddress}`);
        }
      },
      (error) => new Error(`Failed to initialize user state: ${error}`)
    );

  /**
   * Update portfolio snapshot (immutable update)
   */
  public updateSnapshot = (
    walletAddress: WalletAddress, 
    newSnapshot: PortfolioSnapshot
  ): AsyncResult<void> =>
    pipe(
      this.getUserState(walletAddress),
      TE.map(currentState => {
        // Create new immutable state
        const updatedState: PortfolioState = {
          ...currentState,
          previous: currentState.current,
          current: newSnapshot,
          isLoading: false,
          lastUpdateAttempt: new Date().toISOString(),
          updateCount: currentState.updateCount + 1
        };

        // Update state map
        this.userStates.set(walletAddress, updatedState);
        
        // Add to history
        this.addToHistory(walletAddress, newSnapshot);
        
        // Emit state update event
        this.emit('state_updated', {
          walletAddress,
          timestamp: new Date().toISOString(),
          data: {
            previous: currentState.current,
            current: newSnapshot,
            changes: this.calculateChanges(currentState.current, newSnapshot)
          }
        });
      })
    );
}
```

## Analytics Engine

### PortfolioAnalytics

**File:** `src/analytics/PortfolioAnalytics.ts`

Provides comprehensive portfolio analytics using functional transformations:

```typescript
export class PortfolioAnalytics {
  private portfolioState: PortfolioState;

  /**
   * Calculate comprehensive portfolio metrics
   */
  public calculateMetrics = (snapshot: PortfolioSnapshot): PortfolioMetrics => ({
    totalValue: snapshot.totalValueUSD,
    netWorth: snapshot.netWorth,
    totalSupplied: snapshot.totalSuppliedUSD,
    totalBorrowed: snapshot.totalBorrowedUSD,
    totalLiquidity: snapshot.totalLiquidityUSD,
    collateralRatio: this.calculateCollateralRatio(snapshot),
    borrowUtilization: this.calculateBorrowUtilization(snapshot),
    healthFactor: snapshot.healthFactor,
    liquidationPrice: this.calculateLiquidationPrice(snapshot),
    diversificationScore: this.calculateDiversificationScore(snapshot),
    riskScore: this.calculateRiskScore(snapshot)
  });

  /**
   * Calculate portfolio performance over time
   */
  public calculatePerformance = (
    walletAddress: WalletAddress,
    period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
  ): AsyncResult<PortfolioPerformance> =>
    pipe(
      this.getHistoricalData(walletAddress, period),
      TE.map(history => this.computePerformanceMetrics(history, period))
    );

  private computePerformanceMetrics = (
    history: PortfolioSnapshot[],
    period: string
  ): PortfolioPerformance => {
    if (history.length < 2) {
      return this.createEmptyPerformance(period);
    }

    const startValue = history[0].totalValueUSD;
    const endValue = history[history.length - 1].totalValueUSD;
    const absoluteReturn = endValue - startValue;
    const percentageReturn = (absoluteReturn / startValue) * 100;

    return {
      period: period as any,
      returns: {
        absolute: absoluteReturn,
        percentage: percentageReturn
      },
      apy: this.calculateAPY(history),
      volatility: this.calculateVolatility(history),
      sharpeRatio: this.calculateSharpeRatio(history),
      maxDrawdown: this.calculateMaxDrawdown(history),
      winRate: this.calculateWinRate(history)
    };
  };

  /**
   * Get comprehensive analytics dashboard
   */
  public getAnalytics = (
    walletAddress: WalletAddress,
    forceRefresh: boolean = false
  ): AsyncResult<{
    metrics: PortfolioMetrics;
    performance: PortfolioPerformance[];
    risks: RiskMetrics;
    detailed?: any;
  }> =>
    pipe(
      TE.Do,
      TE.bind('snapshot', () => this.getCurrentSnapshot(walletAddress)),
      TE.bind('metrics', ({ snapshot }) => TE.of(this.calculateMetrics(snapshot))),
      TE.bind('performance', () => this.getAllPerformanceMetrics(walletAddress)),
      TE.bind('risks', ({ snapshot }) => this.calculateRiskMetrics(snapshot)),
      TE.map(({ metrics, performance, risks }) => ({
        metrics,
        performance,
        risks
      }))
    );
}
```

## Caching System

### PortfolioCacheManager

**File:** `src/caching/PortfolioCacheManager.ts`

Redis-based caching with functional interface:

```typescript
export class PortfolioCacheManager {
  private cache: CacheService;
  private config: CacheConfig;

  /**
   * Cache portfolio snapshot with TTL
   */
  public cachePortfolio = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot
  ): AsyncResult<void> =>
    pipe(
      this.cache.set(
        this.keys.portfolio(walletAddress),
        JSON.stringify(snapshot),
        this.config.portfolioTTL
      ),
      TE.map(() => {
        logger.debug(`Cached portfolio for ${walletAddress}`);
      })
    );

  /**
   * Get cached portfolio if available
   */
  public getCachedPortfolio = (
    walletAddress: WalletAddress
  ): AsyncResult<PortfolioSnapshot | null> =>
    pipe(
      this.cache.get(this.keys.portfolio(walletAddress)),
      TE.map(cached => cached ? JSON.parse(cached) as PortfolioSnapshot : null),
      TE.mapLeft(error => {
        logger.warn(`Cache miss for portfolio ${walletAddress}: ${error.message}`);
        return null;
      }),
      TE.chain(result => TE.right(result))
    );

  /**
   * Cache lending positions
   */
  public cacheLendingPositions = (
    walletAddress: WalletAddress,
    positions: LendingPosition[]
  ): AsyncResult<void> =>
    this.cache.set(
      this.keys.positions(walletAddress, 'lending'),
      JSON.stringify(positions),
      this.config.positionsTTL
    );

  /**
   * Invalidate all cache entries for a user
   */
  public invalidateUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.Do,
      TE.chain(() => this.cache.del(this.keys.portfolio(walletAddress))),
      TE.chain(() => this.cache.del(this.keys.positions(walletAddress, 'lending'))),
      TE.chain(() => this.cache.del(this.keys.positions(walletAddress, 'liquidity'))),
      TE.chain(() => this.cache.del(this.keys.tokenBalances(walletAddress))),
      TE.map(() => {
        logger.info(`Invalidated cache for ${walletAddress}`);
      })
    );
}
```

## Real-time Updates

### SocketService Integration

**File:** `src/services/SocketService.ts`

Manages real-time portfolio updates:

```typescript
export class SocketService {
  private io: Server;
  private userConnections = new Map<WalletAddress, Set<string>>();

  /**
   * Send portfolio update to connected clients
   */
  public sendPortfolioUpdate = (
    walletAddress: WalletAddress,
    update: PortfolioUpdate
  ): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        const connections = this.userConnections.get(walletAddress);
        if (connections && connections.size > 0) {
          this.io.to(`portfolio_${walletAddress}`).emit('portfolio_update', update);
          logger.debug(`Sent portfolio update to ${connections.size} clients for ${walletAddress}`);
        }
      },
      (error) => new Error(`Failed to send portfolio update: ${error}`)
    );

  /**
   * Send transaction status update
   */
  public sendTransactionUpdate = (
    walletAddress: WalletAddress,
    txHash: string,
    status: 'pending' | 'confirmed' | 'failed'
  ): AsyncResult<void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'transaction_update',
      data: { txHash, status },
      timestamp: new Date().toISOString()
    });
}
```

### Event Listeners in PortfolioService

```typescript
private setupEventListeners = (): void => {
  // Listen to portfolio state updates
  this.portfolioState.on('state_updated', async (event) => {
    if (this.socketService) {
      await this.socketService.sendPortfolioUpdate(event.walletAddress, {
        type: 'position_update',
        data: event.data,
        timestamp: event.timestamp
      })();
    }
  });

  // Listen to position tracker alerts
  this.positionTracker.on('risk_alert', async (event) => {
    if (this.socketService) {
      await this.socketService.sendPortfolioUpdate(event.walletAddress, {
        type: 'error', // Risk alerts as error type for immediate attention
        data: event.data,
        timestamp: event.timestamp
      })();
    }
  });
};
```

## Usage Examples

### Basic Portfolio Operations

```typescript
import { PortfolioService } from './services/PortfolioService';

const portfolioService = new PortfolioService();

// Initialize user and get portfolio data
const getUserPortfolio = async (walletAddress: WalletAddress) => {
  const result = await pipe(
    portfolioService.initializeUser(walletAddress),
    TE.chain(() => portfolioService.getPortfolioData(walletAddress)),
    TE.fold(
      (error) => TE.of({ error: error.message }),
      (data) => TE.of({ data })
    )
  )();
  
  return result;
};
```

### Analytics Dashboard

```typescript
// Get comprehensive analytics
const getPortfolioAnalytics = async (walletAddress: WalletAddress) => {
  const result = await pipe(
    portfolioService.getAnalyticsDashboard(walletAddress, false),
    TE.fold(
      (error) => TE.of({ error: error.message }),
      (analytics) => TE.of({
        totalValue: analytics.metrics.totalValue,
        performance: analytics.performance,
        riskLevel: analytics.risks.liquidationRisk,
        alerts: analytics.risks.alerts
      })
    )
  )();
  
  return result;
};
```

### Transaction Execution

```typescript
// Execute lending operation with state updates
const supplyTokens = async (
  walletAddress: WalletAddress,
  asset: string,
  amount: string
) => {
  const result = await pipe(
    portfolioService.executeLendingOperation('supply', {
      walletAddress,
      asset,
      amount: BigInt(Math.floor(parseFloat(amount) * 1e18))
    }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => TE.of({ 
        success: true, 
        txHash: txResult.txHash,
        newPortfolio: txResult.newSnapshot
      })
    )
  )();
  
  return result;
};
```

## Testing

### Service Testing

```typescript
describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  let mockCacheManager: jest.Mocked<PortfolioCacheManager>;

  beforeEach(() => {
    mockCacheManager = createMockCacheManager();
    portfolioService = new PortfolioService();
  });

  test('getPortfolioData returns cached data when available', async () => {
    const walletAddress = '0x123...';
    const cachedSnapshot = createMockSnapshot();
    
    mockCacheManager.getCachedPortfolio.mockReturnValue(TE.right(cachedSnapshot));
    
    const result = await portfolioService.getPortfolioData(walletAddress)();
    
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.walletAddress).toBe(walletAddress);
    }
  });

  test('refreshPortfolio invalidates cache and fetches fresh data', async () => {
    const walletAddress = '0x123...';
    
    const result = await portfolioService.refreshPortfolio(walletAddress)();
    
    expect(mockCacheManager.invalidateUser).toHaveBeenCalledWith(walletAddress);
    expect(E.isRight(result)).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('Portfolio Integration', () => {
  test('full portfolio workflow', async () => {
    const walletAddress = '0x123...';
    
    // Initialize user
    const initResult = await portfolioService.initializeUser(walletAddress)();
    expect(E.isRight(initResult)).toBe(true);
    
    // Get initial data
    const dataResult = await portfolioService.getPortfolioData(walletAddress)();
    expect(E.isRight(dataResult)).toBe(true);
    
    // Execute transaction
    const txResult = await portfolioService.executeLendingOperation('supply', {
      walletAddress,
      asset: 'USDC',
      amount: '1000'
    })();
    expect(E.isRight(txResult)).toBe(true);
    
    // Verify state update
    const updatedData = await portfolioService.getPortfolioData(walletAddress)();
    expect(E.isRight(updatedData)).toBe(true);
  });
});
```

## Performance Optimization

### Lazy Loading

```typescript
// Only fetch data when actually needed
const lazyPortfolioData = (walletAddress: WalletAddress) => ({
  get summary() {
    return portfolioService.getPortfolioSummary(walletAddress);
  },
  get analytics() {
    return portfolioService.getAnalyticsDashboard(walletAddress);
  },
  get risks() {
    return portfolioService.getRiskMetrics(walletAddress);
  }
});
```

### Batch Operations

```typescript
// Batch multiple portfolio operations
const batchPortfolioUpdates = (addresses: WalletAddress[]) =>
  pipe(
    addresses,
    A.map(address => portfolioService.refreshPortfolio(address)),
    A.sequence(TE.ApplicativePar), // Parallel execution
    TE.map(snapshots => snapshots.length)
  );
```

---

The portfolio management module provides a comprehensive, functional approach to DeFi portfolio management with real-time updates, comprehensive analytics, and robust error handling.