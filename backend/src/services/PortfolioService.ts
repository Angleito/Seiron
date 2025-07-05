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

  constructor(socketService?: SocketService, confirmationService?: ConfirmationService) {
    this.portfolioState = new PortfolioState();
    this.positionTracker = new PositionTracker(this.portfolioState);
    this.analytics = new PortfolioAnalytics(this.portfolioState);
    this.cacheManager = portfolioCacheManager;
    this.socketService = socketService;
    this.confirmationService = confirmationService;

    this.setupEventListeners();
  }

  /**
   * Initialize adapters with wallet client
   */
  public initializeAdapters(walletClient: any): void {
    this.yeiAdapter = createYeiFinanceAdapter(this.publicClient, walletClient);
    this.dragonSwapAdapter = createDragonSwapAdapter(this.publicClient, walletClient);
  }

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
   * Get complete portfolio data for a user (with state management)
   */
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
    );

  /**
   * Get current portfolio snapshot
   */
  public getPortfolioSnapshot = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => snapshot)
    );

  /**
   * Get portfolio summary with key metrics (legacy support)
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
          lending: 5.5, // Would get from actual calculations
          liquidity: 12.3,
          total: 8.5
        }
      }))
    );

  /**
   * Get comprehensive portfolio metrics
   */
  public getPortfolioMetrics = (walletAddress: WalletAddress): AsyncResult<PortfolioMetrics> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.analytics.calculateMetrics(snapshot))
    );

  /**
   * Get portfolio performance analysis
   */
  public getPortfolioPerformance = (
    walletAddress: WalletAddress,
    period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '7d'
  ): AsyncResult<PortfolioPerformance> =>
    this.analytics.calculatePerformance(walletAddress, period);

  /**
   * Get portfolio risk metrics
   */
  public getRiskMetrics = (walletAddress: WalletAddress): AsyncResult<RiskMetrics> =>
    pipe(
      this.getOrUpdatePortfolioSnapshot(walletAddress),
      TE.map(snapshot => this.positionTracker.calculateRiskMetrics(snapshot))
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
    this.analytics.getAnalytics(walletAddress, forceRefresh);

  /**
   * Force refresh portfolio data
   */
  public refreshPortfolio = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      this.cacheManager.invalidateUser(walletAddress),
      TE.chain(() => this.fetchFreshPortfolioData(walletAddress)),
      TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot)),
      TE.chain(() => this.sendRealTimeUpdate(walletAddress, 'portfolio_refreshed')),
      TE.map(snapshot => snapshot)
    );

  /**
   * Get position tracking data
   */
  public getPositionTracking = (walletAddress: WalletAddress) => ({
    trackedPositions: this.positionTracker.getTrackedPositions(walletAddress),
    activeAlerts: this.positionTracker.getActiveAlerts(walletAddress)
  });

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
      this.positionTracker.stopTracking(walletAddress),
      TE.chain(() => this.portfolioState.clearUser(walletAddress)),
      TE.chain(() => this.cacheManager.invalidateUser(walletAddress)),
      TE.map(() => {
        logger.info(`Cleaned up portfolio service for ${walletAddress}`);
      })
    );

  /**
   * Cleanup all resources
   */
  public cleanup = (): void => {
    this.positionTracker.cleanup();
    this.portfolioState.cleanup();
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
      this.cacheManager.getCachedPortfolio(walletAddress),
      TE.chain(cached => {
        if (cached) {
          return TE.right(cached);
        }
        return this.fetchFreshPortfolioData(walletAddress);
      }),
      TE.chain(snapshot => this.updatePortfolioState(walletAddress, snapshot))
    );

  private fetchFreshPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioSnapshot> =>
    pipe(
      TE.Do,
      TE.bind('lendingPositions', () => this.getLendingPositions(walletAddress)),
      TE.bind('liquidityPositions', () => this.getLiquidityPositions(walletAddress)),
      TE.bind('tokenBalances', () => this.getTokenBalances(walletAddress)),
      TE.map(({ lendingPositions, liquidityPositions, tokenBalances }) => {
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

        // Cache the fresh data
        this.cacheManager.cachePortfolio(walletAddress, snapshot)();

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
      this.cacheManager.getCachedLendingPositions(walletAddress),
      TE.chain(cached => {
        if (cached) {
          return TE.right(cached);
        }
        return this.yeiAdapter
          ? this.yeiAdapter.getUserPositions(walletAddress)
          : TE.right([]);
      }),
      TE.chain(positions => 
        pipe(
          this.cacheManager.cacheLendingPositions(walletAddress, positions),
          TE.map(() => positions)
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
    if (type === 'lending' && this.yeiAdapter) {
      return (this.yeiAdapter as any)[operation](params);
    } else if (type === 'liquidity' && this.dragonSwapAdapter) {
      return (this.dragonSwapAdapter as any)[operation](params);
    }
    return TE.left(new Error(`${type} adapter not initialized`));
  };

  private waitForTransactionConfirmation = (txHash: string): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        // Mock transaction confirmation - would actually wait for blockchain confirmation // TODO: REMOVE_MOCK - Mock-related keywords
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger.info(`Transaction confirmed: ${txHash}`);
      },
      (error) => new Error(`Transaction confirmation failed: ${error}`)
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