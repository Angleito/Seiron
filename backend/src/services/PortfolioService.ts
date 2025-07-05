import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { createPublicClient, http } from 'viem';
// Mock Sei chain configuration - would use actual chain config // TODO: REMOVE_MOCK - Mock-related keywords
const sei = {
  id: 1329,
  name: 'Sei Network',
  network: 'sei',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: { default: { http: ['https://evm-rpc.sei-apis.com'] }, public: { http: ['https://evm-rpc.sei-apis.com'] } }
};
import { 
  PortfolioSnapshot,
  PortfolioMetrics,
  PortfolioPerformance,
  RiskMetrics,
  WalletAddress,
  LendingPosition,
  LiquidityPosition,
  TokenBalance,
  AsyncResult
} from '../types/portfolio';
import { PortfolioState } from '../state/PortfolioState';
import { PositionTracker } from '../tracking/PositionTracker';
import { PortfolioAnalytics } from '../analytics/PortfolioAnalytics';
import { portfolioCacheManager, PortfolioCacheManager } from '../caching/PortfolioCacheManager';
import { createYeiFinanceAdapter, YeiFinanceAdapter } from '../adapters/YeiFinanceAdapter';
import { createDragonSwapAdapter, DragonSwapAdapter } from '../adapters/DragonSwapAdapter';
import { SocketService } from './SocketService';
import { ConfirmationService } from './ConfirmationService';
import logger from '../utils/logger';
import { createServiceLogger } from './LoggingService';

// Legacy interfaces for backward compatibility
export interface PortfolioData {
  walletAddress: string;
  totalValueUSD: number;
  lendingPositions: LendingPosition[];
  liquidityPositions: LiquidityPosition[];
  tokenBalances: TokenBalance[];
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalSupplied: number;
  totalBorrowed: number;
  totalLiquidity: number;
  healthFactor: number;
  apy: {
    lending: number;
    liquidity: number;
    total: number;
  };
}

export class PortfolioService {
  private publicClient = createPublicClient({
    chain: sei,
    transport: http()
  });

  private yeiAdapter?: YeiFinanceAdapter;
  private dragonSwapAdapter?: DragonSwapAdapter;
  private portfolioState: PortfolioState;
  private positionTracker: PositionTracker;
  private analytics: PortfolioAnalytics;
  private cacheManager: PortfolioCacheManager;
  private socketService?: SocketService;
  private confirmationService?: ConfirmationService;
  private serviceLogger = createServiceLogger('PortfolioService');

  constructor(socketService?: SocketService, confirmationService?: ConfirmationService) {
    this.serviceLogger.info('Initializing PortfolioService', {
      hasSocketService: !!socketService,
      hasConfirmationService: !!confirmationService
    });
    
    this.portfolioState = new PortfolioState();
    this.positionTracker = new PositionTracker(this.portfolioState);
    this.analytics = new PortfolioAnalytics(this.portfolioState);
    this.cacheManager = portfolioCacheManager;
    this.socketService = socketService;
    this.confirmationService = confirmationService;

    this.setupEventListeners();
    this.serviceLogger.info('PortfolioService initialization completed');
  }

  /**
   * Initialize adapters with wallet client
   */
  public initializeAdapters(walletClient: any): void {
    this.serviceLogger.info('Initializing portfolio adapters');
    this.serviceLogger.startTimer('initializeAdapters');
    
    try {
      this.yeiAdapter = createYeiFinanceAdapter(this.publicClient, walletClient);
      this.dragonSwapAdapter = createDragonSwapAdapter(this.publicClient, walletClient);
      
      this.serviceLogger.endTimer('initializeAdapters');
      this.serviceLogger.info('Portfolio adapters initialized successfully', {
        hasYeiAdapter: !!this.yeiAdapter,
        hasDragonSwapAdapter: !!this.dragonSwapAdapter
      });
    } catch (error) {
      this.serviceLogger.error('Failed to initialize portfolio adapters', {}, error as Error);
      throw error;
    }
  }

  /**
   * Initialize portfolio state management for a user
   */
  public initializeUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Initializing user portfolio state', { walletAddress, method: 'initializeUser' });
        this.serviceLogger.startTimer('initializeUser');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.portfolioState.initializeUser(walletAddress),
        'initializeUser.portfolioState',
        { walletAddress }
      )),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.positionTracker.startTracking(walletAddress),
        'initializeUser.positionTracker',
        { walletAddress }
      )),
      TE.map(() => {
        this.serviceLogger.endTimer('initializeUser', { walletAddress });
        this.serviceLogger.info('Portfolio service initialized for user', { walletAddress });
      })
    );

  /**
   * Get complete portfolio data for a user (with state management)
   */
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Fetching portfolio data', { walletAddress, method: 'getPortfolioData' });
        this.serviceLogger.startTimer('getPortfolioData');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.getOrUpdatePortfolioSnapshot(walletAddress),
        'getPortfolioData',
        { walletAddress }
      )),
      TE.map(snapshot => {
        const data = this.convertSnapshotToLegacyData(snapshot);
        this.serviceLogger.endTimer('getPortfolioData', { 
          walletAddress,
          totalValueUSD: data.totalValueUSD,
          positionsCount: data.lendingPositions.length + data.liquidityPositions.length
        });
        return data;
      })
    );

  /**
   * Get current portfolio snapshot
   */
  public getPortfolioSnapshot = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting portfolio snapshot', { walletAddress, method: 'getPortfolioSnapshot' });
        this.serviceLogger.startTimer('getPortfolioSnapshot');
      })),
      TE.chain(() => this.getOrUpdatePortfolioSnapshot(walletAddress)),
      TE.map(snapshot => {
        this.serviceLogger.endTimer('getPortfolioSnapshot', { 
          walletAddress,
          totalValueUSD: snapshot.totalValueUSD
        });
        return snapshot;
      })
    );

  /**
   * Get portfolio summary with key metrics (legacy support)
   */
  public getPortfolioSummary = (walletAddress: WalletAddress): AsyncResult<PortfolioSummary> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting portfolio summary', { walletAddress, method: 'getPortfolioSummary' });
        this.serviceLogger.startTimer('getPortfolioSummary');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.getPortfolioMetrics(walletAddress),
        'getPortfolioSummary',
        { walletAddress }
      )),
      TE.map(metrics => {
        const summary = {
          totalValue: metrics.totalValue,
          totalSupplied: metrics.totalSupplied,
          totalBorrowed: metrics.totalBorrowed,
          totalLiquidity: metrics.totalLiquidity,
          healthFactor: metrics.healthFactor,
          apy: {
            lending: 5.5, // Would get from actual calculations
            liquidity: 12.3,
            total: 8.5
          }
        };
        
        this.serviceLogger.endTimer('getPortfolioSummary', { 
          walletAddress,
          totalValue: summary.totalValue,
          healthFactor: summary.healthFactor
        });
        
        return summary;
      })
    );

  /**
   * Get comprehensive portfolio metrics
   */
  public getPortfolioMetrics = (walletAddress: WalletAddress): AsyncResult<PortfolioMetrics> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Calculating portfolio metrics', { walletAddress, method: 'getPortfolioMetrics' });
        this.serviceLogger.startTimer('getPortfolioMetrics');
      })),
      TE.chain(() => this.getOrUpdatePortfolioSnapshot(walletAddress)),
      TE.map(snapshot => {
        const metrics = this.analytics.calculateMetrics(snapshot);
        this.serviceLogger.endTimer('getPortfolioMetrics', { 
          walletAddress,
          totalValue: metrics.totalValue,
          riskScore: metrics.riskScore
        });
        this.serviceLogger.info('Portfolio metrics calculated', {
          walletAddress,
          totalValue: metrics.totalValue,
          totalSupplied: metrics.totalSupplied,
          totalBorrowed: metrics.totalBorrowed
        });
        return metrics;
      })
    );

  /**
   * Get portfolio performance analysis
   */
  public getPortfolioPerformance = (
    walletAddress: WalletAddress,
    period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '7d'
  ): AsyncResult<PortfolioPerformance> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting portfolio performance', { 
          walletAddress, 
          period,
          method: 'getPortfolioPerformance'
        });
        this.serviceLogger.startTimer('getPortfolioPerformance');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.analytics.calculatePerformance(walletAddress, period),
        'getPortfolioPerformance',
        { walletAddress, period }
      )),
      TE.map(performance => {
        this.serviceLogger.endTimer('getPortfolioPerformance', { 
          walletAddress,
          period,
          totalReturn: performance.returns.absolute,
          winRate: performance.winRate
        });
        return performance;
      })
    );

  /**
   * Get portfolio risk metrics
   */
  public getRiskMetrics = (walletAddress: WalletAddress): AsyncResult<RiskMetrics> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Calculating risk metrics', { walletAddress, method: 'getRiskMetrics' });
        this.serviceLogger.startTimer('getRiskMetrics');
      })),
      TE.chain(() => this.getOrUpdatePortfolioSnapshot(walletAddress)),
      TE.map(snapshot => {
        const riskMetrics = this.positionTracker.calculateRiskMetrics(snapshot);
        this.serviceLogger.endTimer('getRiskMetrics', { 
          walletAddress,
          healthFactor: riskMetrics.healthFactor
        });
        this.serviceLogger.info('Risk metrics calculated', {
          walletAddress,
          liquidationRisk: riskMetrics.liquidationRisk
        });
        return riskMetrics;
      })
    );

  /**
   * Get analytics dashboard data
   */
  public getAnalyticsDashboard = (
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
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Getting analytics dashboard', { 
          walletAddress, 
          forceRefresh,
          method: 'getAnalyticsDashboard'
        });
        this.serviceLogger.startTimer('getAnalyticsDashboard');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.analytics.getAnalytics(walletAddress, forceRefresh),
        'getAnalyticsDashboard',
        { walletAddress, forceRefresh }
      )),
      TE.map(dashboard => {
        this.serviceLogger.endTimer('getAnalyticsDashboard', { 
          walletAddress,
          performancePeriodsCount: dashboard.performance.length,
          totalValue: dashboard.metrics.totalValue
        });
        return dashboard;
      })
    );

  /**
   * Force refresh portfolio data
   */
  public refreshPortfolio = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Force refreshing portfolio', { walletAddress, method: 'refreshPortfolio' });
        this.serviceLogger.startTimer('refreshPortfolio');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.cacheManager.invalidateUser(walletAddress),
        'refreshPortfolio.invalidateCache',
        { walletAddress }
      )),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.fetchFreshPortfolioData(walletAddress),
        'refreshPortfolio.fetchFreshData',
        { walletAddress }
      )),
      TE.chain(snapshot => this.serviceLogger.logTaskEither(
        this.updatePortfolioState(walletAddress, snapshot),
        'refreshPortfolio.updateState',
        { walletAddress, totalValueUSD: snapshot.totalValueUSD }
      )),
      TE.chain(snapshot => this.serviceLogger.logTaskEither(
        this.sendRealTimeUpdate(walletAddress, 'portfolio_refreshed'),
        'refreshPortfolio.sendUpdate',
        { walletAddress }
      )),
      TE.map(snapshot => {
        this.serviceLogger.endTimer('refreshPortfolio', { 
          walletAddress,
          totalValueUSD: snapshot.totalValueUSD,
          netWorth: snapshot.netWorth
        });
        this.serviceLogger.info('Portfolio refresh completed', { 
          walletAddress,
          totalValueUSD: snapshot.totalValueUSD
        });
        return snapshot;
      })
    );

  /**
   * Get position tracking data
   */
  public getPositionTracking = (walletAddress: WalletAddress) => {
    this.serviceLogger.info('Getting position tracking data', { walletAddress, method: 'getPositionTracking' });
    this.serviceLogger.startTimer('getPositionTracking');
    
    try {
      const result = {
        trackedPositions: this.positionTracker.getTrackedPositions(walletAddress),
        activeAlerts: this.positionTracker.getActiveAlerts(walletAddress)
      };
      
      this.serviceLogger.endTimer('getPositionTracking', { 
        walletAddress,
        trackedPositionsCount: result.trackedPositions.length,
        activeAlertsCount: result.activeAlerts.length
      });
      
      this.serviceLogger.info('Position tracking data retrieved', {
        walletAddress,
        trackedPositions: result.trackedPositions.length,
        activeAlerts: result.activeAlerts.length
      });
      
      return result;
    } catch (error) {
      this.serviceLogger.error('Failed to get position tracking data', { walletAddress }, error as Error);
      throw error;
    }
  };

  /**
   * Create pending lending operation that requires confirmation
   */
  public createPendingLendingOperation = (
    operation: 'supply' | 'withdraw' | 'borrow' | 'repay',
    params: any
  ): AsyncResult<{ transactionId: string }> => {
    if (!this.confirmationService) {
      return TE.left(new Error('Confirmation service not initialized'));
    }

    return pipe(
      this.confirmationService.createPendingTransaction(
        params.walletAddress,
        'lending',
        operation,
        params
      ),
      TE.map(pendingTransaction => ({ transactionId: pendingTransaction.id }))
    );
  };

  /**
   * Execute lending operation with state updates (after confirmation)
   */
  public executeLendingOperation = (
    operation: 'supply' | 'withdraw' | 'borrow' | 'repay',
    params: any,
    transactionId?: string
  ): AsyncResult<{ txHash: string; newSnapshot: PortfolioSnapshot }> => {
    // If transactionId provided, verify it's confirmed
    if (transactionId && this.confirmationService) {
      return pipe(
        this.confirmationService.isTransactionConfirmed(transactionId),
        TE.chain(isConfirmed => {
          if (!isConfirmed) {
            return TE.left(new Error('Transaction not confirmed'));
          }
          return this.executeConfirmedLendingOperation(operation, params);
        })
      );
    }

    // Direct execution (for backward compatibility or when confirmation not required)
    return this.executeConfirmedLendingOperation(operation, params);
  };

  private executeConfirmedLendingOperation = (
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

  /**
   * Create pending liquidity operation that requires confirmation
   */
  public createPendingLiquidityOperation = (
    operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees',
    params: any
  ): AsyncResult<{ transactionId: string }> => {
    if (!this.confirmationService) {
      return TE.left(new Error('Confirmation service not initialized'));
    }

    return pipe(
      this.confirmationService.createPendingTransaction(
        params.walletAddress,
        'liquidity',
        operation,
        params
      ),
      TE.map(pendingTransaction => ({ transactionId: pendingTransaction.id }))
    );
  };

  /**
   * Execute liquidity operation with state updates (after confirmation)
   */
  public executeLiquidityOperation = (
    operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees',
    params: any,
    transactionId?: string
  ): AsyncResult<{ txHash: string; newSnapshot: PortfolioSnapshot }> => {
    // If transactionId provided, verify it's confirmed
    if (transactionId && this.confirmationService) {
      return pipe(
        this.confirmationService.isTransactionConfirmed(transactionId),
        TE.chain(isConfirmed => {
          if (!isConfirmed) {
            return TE.left(new Error('Transaction not confirmed'));
          }
          return this.executeConfirmedLiquidityOperation(operation, params);
        })
      );
    }

    // Direct execution (for backward compatibility or when confirmation not required)
    return this.executeConfirmedLiquidityOperation(operation, params);
  };

  private executeConfirmedLiquidityOperation = (
    operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees',
    params: any
  ): AsyncResult<{ txHash: string; newSnapshot: PortfolioSnapshot }> =>
    pipe(
      this.executeOperation('liquidity', operation, params),
      TE.chain(txHash => 
        pipe(
          this.waitForTransactionConfirmation(txHash),
          TE.chain(() => this.refreshPortfolio(params.walletAddress)),
          TE.map(newSnapshot => ({ txHash, newSnapshot }))
        )
      )
    );

  /**
   * Cleanup user state
   */
  public cleanupUser = (walletAddress: WalletAddress): AsyncResult<void> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Cleaning up user portfolio state', { walletAddress });
        this.serviceLogger.startTimer('cleanupUser');
      })),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.positionTracker.stopTracking(walletAddress),
        'cleanupUser.stopTracking',
        { walletAddress }
      )),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.portfolioState.clearUser(walletAddress),
        'cleanupUser.clearState',
        { walletAddress }
      )),
      TE.chain(() => this.serviceLogger.logTaskEither(
        this.cacheManager.invalidateUser(walletAddress),
        'cleanupUser.invalidateCache',
        { walletAddress }
      )),
      TE.map(() => {
        this.serviceLogger.endTimer('cleanupUser', { walletAddress });
        this.serviceLogger.info('Portfolio service cleanup completed', { walletAddress });
      })
    );

  /**
   * Cleanup all resources
   */
  public cleanup = (): void => {
    this.serviceLogger.info('Cleaning up all portfolio service resources');
    this.serviceLogger.startTimer('cleanup');
    
    try {
      this.positionTracker.cleanup();
      this.portfolioState.cleanup();
      
      this.serviceLogger.endTimer('cleanup');
      this.serviceLogger.info('Portfolio service cleanup completed');
    } catch (error) {
      this.serviceLogger.error('Error during portfolio service cleanup', {}, error as Error);
    }
  };

  // ===================== Private Methods =====================

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

    // Listen to portfolio state update requests
    this.portfolioState.on('update_requested', async (walletAddress: WalletAddress) => {
      try {
        await this.refreshPortfolio(walletAddress)();
      } catch (error) {
        logger.error(`Failed to auto-refresh portfolio for ${walletAddress}:`, error);
      }
    });
  };

  private getOrUpdatePortfolioSnapshot = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.debug('Checking cached portfolio data', { walletAddress });
      })),
      TE.chain(() => this.cacheManager.getCachedPortfolio(walletAddress)),
      TE.chain(cached => {
        if (cached) {
          this.serviceLogger.debug('Using cached portfolio data', { 
            walletAddress,
            cacheAge: Date.now() - new Date(cached.timestamp).getTime()
          });
          return TE.right(cached);
        }
        this.serviceLogger.debug('Cache miss, fetching fresh portfolio data', { walletAddress });
        return this.fetchFreshPortfolioData(walletAddress);
      }),
      TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot))
    );

  private fetchFreshPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Fetching fresh portfolio data', { walletAddress });
        this.serviceLogger.startTimer('fetchFreshPortfolioData');
      })),
      TE.bind('lendingPositions', () => {
        this.serviceLogger.debug('Fetching lending positions', { walletAddress });
        return this.getLendingPositions(walletAddress);
      }),
      TE.bind('liquidityPositions', () => {
        this.serviceLogger.debug('Fetching liquidity positions', { walletAddress });
        return this.getLiquidityPositions(walletAddress);
      }),
      TE.bind('tokenBalances', () => {
        this.serviceLogger.debug('Fetching token balances', { walletAddress });
        return this.getTokenBalances(walletAddress);
      }),
      TE.map(({ lendingPositions, liquidityPositions, tokenBalances }) => {
        this.serviceLogger.debug('Calculating portfolio metrics', {
          walletAddress,
          lendingPositionsCount: lendingPositions.length,
          liquidityPositionsCount: liquidityPositions.length,
          tokenBalancesCount: tokenBalances.length
        });

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

        const snapshot: PortfolioSnapshot = {
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
        };

        this.serviceLogger.info('Portfolio calculations completed', {
          walletAddress,
          totalValueUSD,
          totalSuppliedUSD,
          totalBorrowedUSD,
          totalLiquidityUSD,
          netWorth,
          healthFactor
        });

        // Cache the fresh data
        this.cacheManager.cachePortfolio(walletAddress, snapshot)();
        this.serviceLogger.debug('Portfolio data cached', { walletAddress });

        this.serviceLogger.endTimer('fetchFreshPortfolioData', { 
          walletAddress,
          totalValueUSD
        });

        return snapshot;
      })
    );

  private updatePortfolioState = (
    walletAddress: WalletAddress,
    snapshot: PortfolioSnapshot
  ): AsyncResult<PortfolioSnapshot> =>
    pipe(
      this.portfolioState.updateSnapshot(walletAddress, snapshot),
      TE.map(() => snapshot)
    );

  private getLendingPositions = (walletAddress: WalletAddress): AsyncResult<LendingPosition[]> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.debug('Fetching lending positions', { walletAddress });
      })),
      TE.chain(() => this.cacheManager.getCachedLendingPositions(walletAddress)),
      TE.chain(cached => {
        if (cached) {
          this.serviceLogger.debug('Using cached lending positions', { 
            walletAddress,
            positionsCount: cached.length
          });
          return TE.right(cached);
        }
        
        if (!this.yeiAdapter) {
          this.serviceLogger.warn('YEI adapter not initialized', { walletAddress });
          return TE.right([]);
        }
        
        this.serviceLogger.debug('Fetching fresh lending positions from YEI', { walletAddress });
        return this.yeiAdapter.getUserPositions(walletAddress);
      }),
      TE.chain(positions => 
        pipe(
          this.cacheManager.cacheLendingPositions(walletAddress, positions),
          TE.map(() => {
            this.serviceLogger.debug('Lending positions cached', { 
              walletAddress,
              positionsCount: positions.length
            });
            return positions;
          })
        )
      )
    );

  private getLiquidityPositions = (walletAddress: WalletAddress): AsyncResult<LiquidityPosition[]> =>
    pipe(
      this.cacheManager.getCachedLiquidityPositions(walletAddress),
      TE.chain(cached => {
        if (cached) {
          return TE.right(cached);
        }
        return this.dragonSwapAdapter
          ? this.dragonSwapAdapter.getPositions(walletAddress)
          : TE.right([]);
      }),
      TE.chain(positions => 
        pipe(
          this.cacheManager.cacheLiquidityPositions(walletAddress, positions),
          TE.map(() => positions)
        )
      )
    );

  private getTokenBalances = (walletAddress: WalletAddress): AsyncResult<TokenBalance[]> =>
    pipe(
      this.cacheManager.getCachedTokenBalances(walletAddress),
      TE.chain(cached => {
        if (cached) {
          return TE.right(cached);
        }
        return this.fetchTokenBalances(walletAddress);
      }),
      TE.chain(balances => 
        pipe(
          this.cacheManager.cacheTokenBalances(walletAddress, balances),
          TE.map(() => balances)
        )
      )
    );

  private fetchTokenBalances = (walletAddress: WalletAddress): AsyncResult<TokenBalance[]> =>
    TE.tryCatch(
      async () => {
        const seiBalance = await this.publicClient.getBalance({
          address: walletAddress as `0x${string}`
        });

        return [
          {
            token: '0x0000000000000000000000000000000000000000',
            symbol: 'SEI',
            name: 'Sei',
            decimals: 18,
            balance: seiBalance,
            balanceFormatted: (Number(seiBalance) / 1e18).toFixed(4),
            valueUSD: Number(seiBalance) / 1e18 * 0.5, // Mock price // TODO: REMOVE_MOCK - Mock-related keywords
            priceUSD: 0.5
          }
        ];
      },
      (error) => new Error(`Failed to get token balances: ${error}`)
    );

  private calculateHealthFactor = (positions: LendingPosition[]): number => {
    const supplies = positions.filter(p => p.type === 'supply');
    const borrows = positions.filter(p => p.type === 'borrow');

    if (borrows.length === 0) return Infinity;

    const totalCollateralUSD = supplies.reduce((sum, p) => sum + p.healthContribution, 0);
    const totalBorrowedUSD = borrows.reduce((sum, p) => sum + p.valueUSD, 0);

    return totalBorrowedUSD > 0 ? totalCollateralUSD / totalBorrowedUSD : Infinity;
  };

  private executeOperation = (
    type: 'lending' | 'liquidity',
    operation: string,
    params: any
  ): AsyncResult<string> => {
    this.serviceLogger.info('Executing operation', {
      type,
      operation,
      walletAddress: params.walletAddress,
      amount: params.amount
    });
    this.serviceLogger.startTimer(`executeOperation_${type}_${operation}`);
    
    let result: AsyncResult<string>;
    
    if (type === 'lending' && this.yeiAdapter) {
      this.serviceLogger.debug('Using YEI adapter for lending operation', { operation });
      result = (this.yeiAdapter as any)[operation](params);
    } else if (type === 'liquidity' && this.dragonSwapAdapter) {
      this.serviceLogger.debug('Using DragonSwap adapter for liquidity operation', { operation });
      result = (this.dragonSwapAdapter as any)[operation](params);
    } else {
      const error = new Error(`${type} adapter not initialized`);
      this.serviceLogger.error('Adapter not available', { type, operation }, error);
      return TE.left(error);
    }
    
    return pipe(
      result,
      TE.map(txHash => {
        this.serviceLogger.endTimer(`executeOperation_${type}_${operation}`, {
          txHash,
          type,
          operation
        });
        this.serviceLogger.info('Operation executed successfully', {
          type,
          operation,
          txHash
        });
        return txHash;
      }),
      TE.mapLeft(error => {
        this.serviceLogger.error(`Operation failed: ${type}.${operation}`, { type, operation }, error);
        return error;
      })
    );
  };

  private waitForTransactionConfirmation = (txHash: string): AsyncResult<void> =>
    pipe(
      TE.Do,
      TE.tap(() => TE.fromIO(() => {
        this.serviceLogger.info('Waiting for transaction confirmation', { txHash });
        this.serviceLogger.startTimer('waitForTransactionConfirmation');
      })),
      TE.chain(() => TE.tryCatch(
        async () => {
          // Mock transaction confirmation - would actually wait for blockchain confirmation
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          this.serviceLogger.endTimer('waitForTransactionConfirmation', { txHash });
          this.serviceLogger.info('Transaction confirmed', { txHash });
        },
        (error) => {
          this.serviceLogger.error('Transaction confirmation failed', { txHash }, error as Error);
          return new Error(`Transaction confirmation failed: ${error}`);
        }
      ))
    );

  private sendRealTimeUpdate = (
    walletAddress: WalletAddress,
    updateType: string
  ): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.of(this.portfolioState.getCurrentSnapshot(walletAddress)),
      TE.chain(snapshotOption => {
        if (snapshotOption._tag === 'None') {
          return TE.left(new Error('No snapshot available'));
        }

        const snapshot = snapshotOption.value;

        if (this.socketService) {
          this.socketService.sendPortfolioUpdate(walletAddress, {
            type: 'position_update',
            data: { updateType, snapshot },
            timestamp: new Date().toISOString()
          })();
        }

        return TE.right(snapshot);
      })
    );

  private convertSnapshotToLegacyData = (snapshot: PortfolioSnapshot): PortfolioData => ({
    walletAddress: snapshot.walletAddress,
    totalValueUSD: snapshot.totalValueUSD,
    lendingPositions: snapshot.lendingPositions,
    liquidityPositions: snapshot.liquidityPositions,
    tokenBalances: snapshot.tokenBalances,
    lastUpdated: snapshot.timestamp
  });
}