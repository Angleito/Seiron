/**
 * PortfolioState - In-memory portfolio state management
 * Manages user portfolio data with real-time updates and caching
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import {
  PortfolioSnapshot,
  PortfolioState as IPortfolioState,
  PortfolioChange,
  WalletAddress,
  LendingPosition,
  LiquidityPosition,
  TokenBalance,
  PortfolioMetrics,
  PortfolioPerformance,
  RiskMetrics,
  PositionDiff,
  AsyncResult,
  PortfolioStateEvent
} from '../types/portfolio';
import { cacheService, CacheService } from '../utils/cache';
import logger from '../utils/logger';

export interface PortfolioStateConfig {
  maxHistoryLength: number;
  updateInterval: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export class PortfolioState extends EventEmitter {
  private states: Map<WalletAddress, IPortfolioState> = new Map();
  private updateTimers: Map<WalletAddress, NodeJS.Timeout> = new Map();
  private readonly config: PortfolioStateConfig;

  constructor(
    private cache: CacheService = cacheService,
    config: Partial<PortfolioStateConfig> = {}
  ) {
    super();
    this.config = {
      maxHistoryLength: 100,
      updateInterval: 30000, // 30 seconds
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      ...config
    };
  }

  /**
   * Initialize portfolio state for a user
   */
  public initializeUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      this.loadStateFromCache(walletAddress),
      TE.map((cachedState) => {
        const initialState: IPortfolioState = cachedState || {
          current: this.createEmptySnapshot(walletAddress),
          history: [],
          isLoading: false,
          lastUpdateAttempt: new Date().toISOString(),
          updateCount: 0
        };

        this.states.set(walletAddress, initialState);
        this.startPeriodicUpdates(walletAddress);
        
        logger.info(`Portfolio state initialized for ${walletAddress}`);
      })
    );

  /**
   * Update portfolio snapshot for a user
   */
  public updateSnapshot = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot
  ): AsyncResult<PortfolioChange[]> =>
    pipe(
      TE.of(this.states.get(walletAddress)),
      TE.chain((currentState) => {
        if (!currentState) {
          return TE.left(new Error(`Portfolio state not initialized for ${walletAddress}`));
        }

        const changes = this.calculateChanges(currentState.current, snapshot);
        const updatedState = this.createUpdatedState(currentState, snapshot);
        
        this.states.set(walletAddress, updatedState);
        
        // Emit state update event
        this.emitStateUpdateEvent(walletAddress, currentState.current, snapshot, changes);
        
        // Cache the updated state
        return pipe(
          this.saveStateToCache(walletAddress, updatedState),
          TE.map(() => changes)
        );
      })
    );

  /**
   * Get current portfolio state for a user
   */
  public getCurrentState = (walletAddress: WalletAddress): O.Option<IPortfolioState> => {
    return O.fromNullable(this.states.get(walletAddress));
  };

  /**
   * Get current snapshot for a user
   */
  public getCurrentSnapshot = (walletAddress: WalletAddress): O.Option<PortfolioSnapshot> => {
    const state = this.states.get(walletAddress);
    return O.fromNullable(state?.current);
  };

  /**
   * Get portfolio history for a user
   */
  public getHistory = (
    walletAddress: WalletAddress,
    limit?: number
  ): O.Option<PortfolioSnapshot[]> => {
    const state = this.states.get(walletAddress);
    if (!state) return O.none;

    const history = limit ? state.history.slice(-limit) : state.history;
    return O.some(history);
  };

  /**
   * Set loading state for a user
   */
  public setLoading = (walletAddress: WalletAddress, loading: boolean): void => {
    const state = this.states.get(walletAddress);
    if (state) {
      state.isLoading = loading;
      state.lastUpdateAttempt = new Date().toISOString();
      this.states.set(walletAddress, state);
    }
  };

  /**
   * Set error state for a user
   */
  public setError = (walletAddress: WalletAddress, error: Error): void => {
    const state = this.states.get(walletAddress);
    if (state) {
      state.lastError = error;
      state.isLoading = false;
      this.states.set(walletAddress, state);
      
      // Emit error event
      this.emit('error', {
        type: 'error',
        walletAddress,
        timestamp: new Date().toISOString(),
        data: { error, context: 'portfolio_state' }
      } as PortfolioStateEvent);
    }
  };

  /**
   * Clear portfolio state for a user
   */
  public clearUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.tryCatch(
        async () => {
          // Stop periodic updates
          const timer = this.updateTimers.get(walletAddress);
          if (timer) {
            clearInterval(timer);
            this.updateTimers.delete(walletAddress);
          }

          // Remove from memory
          this.states.delete(walletAddress);

          // Clear cache
          const cacheKey = this.getCacheKey(walletAddress);
          await this.cache.del(cacheKey)();
          
          logger.info(`Portfolio state cleared for ${walletAddress}`);
        },
        (error) => new Error(`Failed to clear user state: ${error}`)
      )
    );

  /**
   * Get all active users
   */
  public getActiveUsers = (): WalletAddress[] => {
    return Array.from(this.states.keys());
  };

  /**
   * Get portfolio metrics for comparison
   */
  public compareSnapshots = (
    snapshot1: PortfolioSnapshot,
    snapshot2: PortfolioSnapshot
  ): PortfolioChange[] => {
    return this.calculateChanges(snapshot1, snapshot2);
  };

  /**
   * Cleanup resources
   */
  public cleanup = (): void => {
    // Clear all timers
    for (const timer of this.updateTimers.values()) {
      clearInterval(timer);
    }
    this.updateTimers.clear();
    
    // Clear states
    this.states.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('Portfolio state manager cleaned up');
  };

  // ===================== Private Methods =====================

  private createEmptySnapshot = (walletAddress: WalletAddress): PortfolioSnapshot => ({
    walletAddress,
    totalValueUSD: 0,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    totalLiquidityUSD: 0,
    netWorth: 0,
    healthFactor: Infinity,
    lendingPositions: [],
    liquidityPositions: [],
    tokenBalances: [],
    timestamp: new Date().toISOString()
  });

  private createUpdatedState = (
    currentState: IPortfolioState,
    newSnapshot: PortfolioSnapshot
  ): IPortfolioState => {
    const history = [...currentState.history];
    
    // Add current snapshot to history
    if (currentState.current.timestamp !== newSnapshot.timestamp) {
      history.push(currentState.current);
    }

    // Limit history length
    if (history.length > this.config.maxHistoryLength) {
      history.splice(0, history.length - this.config.maxHistoryLength);
    }

    return {
      current: newSnapshot,
      previous: currentState.current,
      history,
      isLoading: false,
      lastError: undefined,
      lastUpdateAttempt: new Date().toISOString(),
      updateCount: currentState.updateCount + 1
    };
  };

  private calculateChanges = (
    oldSnapshot: PortfolioSnapshot,
    newSnapshot: PortfolioSnapshot
  ): PortfolioChange[] => {
    const changes: PortfolioChange[] = [];

    // Check total value changes
    if (Math.abs(oldSnapshot.totalValueUSD - newSnapshot.totalValueUSD) > 0.01) {
      changes.push({
        walletAddress: newSnapshot.walletAddress,
        changeType: 'balance_changed',
        timestamp: new Date().toISOString(),
        oldValue: oldSnapshot.totalValueUSD,
        newValue: newSnapshot.totalValueUSD
      });
    }

    // Check lending position changes
    const lendingChanges = this.comparePositions(
      oldSnapshot.lendingPositions,
      newSnapshot.lendingPositions,
      'lending'
    );
    changes.push(...lendingChanges);

    // Check liquidity position changes
    const liquidityChanges = this.comparePositions(
      oldSnapshot.liquidityPositions,
      newSnapshot.liquidityPositions,
      'liquidity'
    );
    changes.push(...liquidityChanges);

    // Check token balance changes
    const balanceChanges = this.compareTokenBalances(
      oldSnapshot.tokenBalances,
      newSnapshot.tokenBalances
    );
    changes.push(...balanceChanges);

    return changes;
  };

  private comparePositions = (
    oldPositions: (LendingPosition | LiquidityPosition)[],
    newPositions: (LendingPosition | LiquidityPosition)[],
    type: 'lending' | 'liquidity'
  ): PortfolioChange[] => {
    const changes: PortfolioChange[] = [];
    const oldMap = new Map(oldPositions.map(p => [p.id, p]));
    const newMap = new Map(newPositions.map(p => [p.id, p]));

    // Check for removed positions
    for (const [id, position] of oldMap) {
      if (!newMap.has(id)) {
        changes.push({
          walletAddress: position.walletAddress,
          changeType: 'position_removed',
          timestamp: new Date().toISOString(),
          oldValue: position,
          newValue: null
        });
      }
    }

    // Check for added or updated positions
    for (const [id, position] of newMap) {
      const oldPosition = oldMap.get(id);
      
      if (!oldPosition) {
        changes.push({
          walletAddress: position.walletAddress,
          changeType: 'position_added',
          timestamp: new Date().toISOString(),
          oldValue: null,
          newValue: position
        });
      } else if (this.hasPositionChanged(oldPosition, position)) {
        changes.push({
          walletAddress: position.walletAddress,
          changeType: 'position_updated',
          timestamp: new Date().toISOString(),
          oldValue: oldPosition,
          newValue: position
        });
      }
    }

    return changes;
  };

  private compareTokenBalances = (
    oldBalances: TokenBalance[],
    newBalances: TokenBalance[]
  ): PortfolioChange[] => {
    const changes: PortfolioChange[] = [];
    const oldMap = new Map(oldBalances.map(b => [b.token, b]));
    const newMap = new Map(newBalances.map(b => [b.token, b]));

    for (const [token, newBalance] of newMap) {
      const oldBalance = oldMap.get(token);
      
      if (!oldBalance || oldBalance.balance !== newBalance.balance) {
        changes.push({
          walletAddress: newBalance.token, // Using token as identifier
          changeType: 'balance_changed',
          timestamp: new Date().toISOString(),
          oldValue: oldBalance,
          newValue: newBalance
        });
      }
    }

    return changes;
  };

  private hasPositionChanged = (
    oldPosition: LendingPosition | LiquidityPosition,
    newPosition: LendingPosition | LiquidityPosition
  ): boolean => {
    // Compare key fields that indicate position changes
    if ('amount' in oldPosition && 'amount' in newPosition) {
      // Lending position
      return oldPosition.amount !== newPosition.amount ||
             Math.abs(oldPosition.valueUSD - newPosition.valueUSD) > 0.01 ||
             Math.abs(oldPosition.apy - newPosition.apy) > 0.01;
    } else if ('liquidity' in oldPosition && 'liquidity' in newPosition) {
      // Liquidity position
      return oldPosition.liquidity !== newPosition.liquidity ||
             Math.abs(oldPosition.valueUSD - newPosition.valueUSD) > 0.01 ||
             Math.abs(oldPosition.totalApr - newPosition.totalApr) > 0.01;
    }
    
    return false;
  };

  private emitStateUpdateEvent = (
    walletAddress: WalletAddress,
    previous: PortfolioSnapshot,
    current: PortfolioSnapshot,
    changes: PortfolioChange[]
  ): void => {
    const event: PortfolioStateEvent = {
      type: 'state_updated',
      walletAddress,
      timestamp: new Date().toISOString(),
      data: { previous, current, changes: [] as PositionDiff[] } // Type conversion needed
    };

    this.emit('state_updated', event);
    
    // Emit individual position change events
    changes.forEach(change => {
      this.emit('position_changed', {
        type: 'position_changed',
        walletAddress,
        timestamp: new Date().toISOString(),
        data: change
      });
    });
  };

  private startPeriodicUpdates = (walletAddress: WalletAddress): void => {
    // Clear existing timer
    const existingTimer = this.updateTimers.get(walletAddress);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Start new timer
    const timer = setInterval(() => {
      this.emit('update_requested', walletAddress);
    }, this.config.updateInterval);

    this.updateTimers.set(walletAddress, timer);
  };

  private getCacheKey = (walletAddress: WalletAddress): string => {
    return CacheService.generateKey('portfolio_state', walletAddress);
  };

  private loadStateFromCache = (walletAddress: WalletAddress): AsyncResult<IPortfolioState | null> => {
    if (!this.config.cacheEnabled) {
      return TE.right(null);
    }

    const cacheKey = this.getCacheKey(walletAddress);
    return this.cache.get<IPortfolioState>(cacheKey);
  };

  private saveStateToCache = (
    walletAddress: WalletAddress,
    state: IPortfolioState
  ): AsyncResult<void> => {
    if (!this.config.cacheEnabled) {
      return TE.right(undefined);
    }

    const cacheKey = this.getCacheKey(walletAddress);
    return this.cache.set(cacheKey, state, this.config.cacheTTL);
  };
}