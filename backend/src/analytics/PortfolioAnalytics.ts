/**
 * Portfolio Analytics - Comprehensive portfolio performance and metrics calculation
 * Provides detailed analytics, performance tracking, and risk assessment
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
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
import { cacheService, CacheService } from '../utils/cache';
import logger from '../utils/logger';

export interface AnalyticsConfig {
  performancePeriods: ('1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all')[];
  riskFreeRate: number; // For Sharpe ratio calculation
  benchmarkReturns?: number[]; // For beta calculation
  enableDetailedMetrics: boolean;
  cacheTTL: number;
}

export interface DetailedMetrics {
  tokenAllocation: TokenAllocation[];
  platformAllocation: PlatformAllocation[];
  positionBreakdown: PositionBreakdown;
  yieldSources: YieldSource[];
  riskFactors: RiskFactor[];
}

export interface TokenAllocation {
  token: string;
  symbol: string;
  valueUSD: number;
  percentage: number;
  avgApy: number;
  riskScore: number;
}

export interface PlatformAllocation {
  platform: string;
  valueUSD: number;
  percentage: number;
  positionCount: number;
  avgApy: number;
  riskScore: number;
}

export interface PositionBreakdown {
  lending: {
    totalSupplied: number;
    totalBorrowed: number;
    netPosition: number;
    avgSupplyApy: number;
    avgBorrowApy: number;
    utilizationRate: number;
  };
  liquidity: {
    totalValue: number;
    totalFees: number;
    avgApr: number;
    inRangePositions: number;
    outOfRangePositions: number;
    impermanentLoss: number;
  };
}

export interface YieldSource {
  source: 'lending' | 'liquidity_fees' | 'rewards';
  valueUSD: number;
  apy: number;
  riskAdjustedReturn: number;
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  score: number;
  description: string;
}

export class PortfolioAnalytics {
  private readonly config: AnalyticsConfig;

  constructor(
    private portfolioState: PortfolioState,
    private cache: CacheService = cacheService,
    config: Partial<AnalyticsConfig> = {}
  ) {
    this.config = {
      performancePeriods: ['1d', '7d', '30d', '90d'], // TODO: REMOVE_MOCK - Hard-coded array literals
      riskFreeRate: 0.045, // 4.5% risk-free rate
      enableDetailedMetrics: true,
      cacheTTL: 300, // 5 minutes
      ...config
    };
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  public calculateMetrics = (snapshot: PortfolioSnapshot): PortfolioMetrics => {
    const totalValue = snapshot.totalValueUSD;
    const netWorth = snapshot.totalValueUSD - snapshot.totalBorrowedUSD;
    
    const collateralRatio = this.calculateCollateralRatio(snapshot);
    const borrowUtilization = this.calculateBorrowUtilization(snapshot);
    const diversificationScore = this.calculateDiversificationScore(snapshot);
    const riskScore = this.calculateRiskScore(snapshot);
    const liquidationPrice = this.calculateLiquidationPrice(snapshot);

    return {
      totalValue,
      netWorth,
      totalSupplied: snapshot.totalSuppliedUSD,
      totalBorrowed: snapshot.totalBorrowedUSD,
      totalLiquidity: snapshot.totalLiquidityUSD,
      collateralRatio,
      borrowUtilization,
      healthFactor: snapshot.healthFactor,
      liquidationPrice,
      diversificationScore,
      riskScore
    };
  };

  /**
   * Calculate portfolio performance for specified periods
   */
  public calculatePerformance = (
    walletAddress: WalletAddress,
    period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
  ): AsyncResult<PortfolioPerformance> =>
    pipe(
      this.getHistoricalData(walletAddress, period),
      TE.map(snapshots => {
        if (snapshots.length < 2) {
          return this.createEmptyPerformance(period);
        }

        const startSnapshot = snapshots[0];
        const endSnapshot = snapshots[snapshots.length - 1];
        
        const returns = this.calculateReturns(startSnapshot, endSnapshot);
        const apy = this.calculateAPY(snapshots);
        const volatility = this.calculateVolatility(snapshots);
        const sharpeRatio = this.calculateSharpeRatio(returns.percentage, volatility);
        const maxDrawdown = this.calculateMaxDrawdown(snapshots);
        const winRate = this.calculateWinRate(snapshots);

        return {
          period,
          returns,
          apy,
          volatility,
          sharpeRatio,
          maxDrawdown,
          winRate
        };
      })
    );

  /**
   * Calculate detailed portfolio metrics
   */
  public calculateDetailedMetrics = (snapshot: PortfolioSnapshot): DetailedMetrics => {
    const tokenAllocation = this.calculateTokenAllocation(snapshot);
    const platformAllocation = this.calculatePlatformAllocation(snapshot);
    const positionBreakdown = this.calculatePositionBreakdown(snapshot);
    const yieldSources = this.calculateYieldSources(snapshot);
    const riskFactors = this.calculateRiskFactors(snapshot);

    return {
      tokenAllocation,
      platformAllocation,
      positionBreakdown,
      yieldSources,
      riskFactors
    };
  };

  /**
   * Calculate risk metrics with detailed analysis
   */
  public calculateRiskMetrics = (snapshot: PortfolioSnapshot): RiskMetrics => {
    const healthFactor = snapshot.healthFactor;
    const liquidationRisk = this.assessLiquidationRisk(healthFactor);
    const concentrationRisk = this.calculateConcentrationRisk(snapshot);
    const correlationRisk = this.calculateCorrelationRisk(snapshot);
    const impermanentLossRisk = this.calculateImpermanentLossRisk(snapshot);
    
    // Generate risk alerts based on current metrics
    const alerts = this.generateRiskAlerts(snapshot, {
      healthFactor,
      liquidationRisk,
      concentrationRisk,
      correlationRisk,
      impermanentLossRisk
    });

    return {
      healthFactor,
      liquidationRisk,
      concentrationRisk,
      correlationRisk,
      impermanentLossRisk,
      alerts
    };
  };

  /**
   * Get cached analytics or calculate fresh
   */
  public getAnalytics = (
    walletAddress: WalletAddress,
    forceRefresh: boolean = false
  ): AsyncResult<{
    metrics: PortfolioMetrics;
    performance: PortfolioPerformance[];
    risks: RiskMetrics;
    detailed?: DetailedMetrics;
  }> => {
    const cacheKey = this.getAnalyticsCacheKey(walletAddress);
    
    if (!forceRefresh) {
      return pipe(
        this.cache.get<any>(cacheKey),
        TE.chain(cached => {
          if (cached) {
            return TE.right(cached);
          }
          return this.calculateFreshAnalytics(walletAddress);
        })
      );
    }

    return this.calculateFreshAnalytics(walletAddress);
  };

  // ===================== Private Methods =====================

  private calculateFreshAnalytics = (walletAddress: WalletAddress): AsyncResult<{
    metrics: PortfolioMetrics;
    performance: PortfolioPerformance[];
    risks: RiskMetrics;
    detailed?: DetailedMetrics;
  }> =>
    pipe(
      TE.of(this.portfolioState.getCurrentSnapshot(walletAddress)),
      TE.chain(snapshotOption => {
        if (snapshotOption._tag === 'None') {
          return TE.left(new Error(`No portfolio data for ${walletAddress}`));
        }

        const snapshot = snapshotOption.value;
        const metrics = this.calculateMetrics(snapshot);
        const risks = this.calculateRiskMetrics(snapshot);
        const detailed = this.config.enableDetailedMetrics 
          ? this.calculateDetailedMetrics(snapshot) 
          : undefined;

        // Calculate performance for all configured periods
        return pipe(
          TE.sequenceArray(
            this.config.performancePeriods.map(period =>
              this.calculatePerformance(walletAddress, period)
            )
          ),
          TE.map(performanceReadonly => {
            const performance = [...performanceReadonly];
            const analytics = { metrics, performance, risks, detailed };
            
            // Cache the results
            const cacheKey = this.getAnalyticsCacheKey(walletAddress);
            this.cache.set(cacheKey, analytics, this.config.cacheTTL)();
            
            return analytics;
          })
        );
      })
    );

  private getHistoricalData = (
    walletAddress: WalletAddress,
    period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
  ): AsyncResult<PortfolioSnapshot[]> =>
    pipe(
      TE.of(this.portfolioState.getHistory(walletAddress)),
      TE.map(historyOption => {
        if (historyOption._tag === 'None') {
          return [];
        }

        const history = historyOption.value;
        const now = new Date();
        let cutoffDate: Date;

        switch (period) {
          case '1h':
            cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '1d':
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '1y':
            cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            return history;
        }

        return history.filter(snapshot => 
          new Date(snapshot.timestamp) >= cutoffDate
        );
      })
    );

  private calculateCollateralRatio = (snapshot: PortfolioSnapshot): number => {
    if (snapshot.totalBorrowedUSD === 0) return Infinity;
    return snapshot.totalSuppliedUSD / snapshot.totalBorrowedUSD;
  };

  private calculateBorrowUtilization = (snapshot: PortfolioSnapshot): number => {
    if (snapshot.totalSuppliedUSD === 0) return 0;
    return snapshot.totalBorrowedUSD / snapshot.totalSuppliedUSD;
  };

  private calculateDiversificationScore = (snapshot: PortfolioSnapshot): number => {
    const tokenValues = new Map<string, number>();
    
    // Aggregate token values
    snapshot.lendingPositions.forEach(pos => {
      const current = tokenValues.get(pos.tokenSymbol) || 0;
      tokenValues.set(pos.tokenSymbol, current + pos.valueUSD);
    });

    snapshot.liquidityPositions.forEach(pos => {
      const current0 = tokenValues.get(pos.token0Symbol) || 0;
      const current1 = tokenValues.get(pos.token1Symbol) || 0;
      tokenValues.set(pos.token0Symbol, current0 + pos.valueUSD / 2);
      tokenValues.set(pos.token1Symbol, current1 + pos.valueUSD / 2);
    });

    snapshot.tokenBalances.forEach(balance => {
      const current = tokenValues.get(balance.symbol) || 0;
      tokenValues.set(balance.symbol, current + balance.valueUSD);
    });

    // Calculate Shannon diversity index
    if (snapshot.totalValueUSD === 0) return 0;

    let diversity = 0;
    for (const value of tokenValues.values()) {
      const proportion = value / snapshot.totalValueUSD;
      if (proportion > 0) {
        diversity -= proportion * Math.log(proportion);
      }
    }

    // Normalize to 0-100 scale
    const maxDiversity = Math.log(tokenValues.size || 1);
    return maxDiversity > 0 ? (diversity / maxDiversity) * 100 : 0;
  };

  private calculateRiskScore = (snapshot: PortfolioSnapshot): number => {
    let riskScore = 0;
    let factors = 0;

    // Health factor risk
    if (snapshot.healthFactor !== Infinity) {
      const healthRisk = Math.max(0, 100 - (snapshot.healthFactor - 1) * 50);
      riskScore += healthRisk;
      factors++;
    }

    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(snapshot);
    riskScore += concentrationRisk;
    factors++;

    // Leverage risk
    const leverageRisk = Math.min(100, this.calculateBorrowUtilization(snapshot) * 100);
    riskScore += leverageRisk;
    factors++;

    return factors > 0 ? riskScore / factors : 0;
  };

  private calculateLiquidationPrice = (snapshot: PortfolioSnapshot): number | undefined => {
    // Simplified liquidation price calculation
    // In practice, would need more complex analysis considering all collateral types
    const borrowedPositions = snapshot.lendingPositions.filter(p => p.type === 'borrow');
    const suppliedPositions = snapshot.lendingPositions.filter(p => p.type === 'supply');
    
    if (borrowedPositions.length === 0 || suppliedPositions.length === 0) {
      return undefined;
    }

    // This is a simplified calculation - real implementation would be more complex
    const totalBorrowed = snapshot.totalBorrowedUSD;
    const totalCollateral = snapshot.totalSuppliedUSD;
    const liquidationThreshold = 0.85; // Assume 85% threshold

    if (totalCollateral === 0) return undefined;
    
    const priceDropThreshold = 1 - (totalBorrowed / (totalCollateral * liquidationThreshold));
    return Math.max(0, priceDropThreshold);
  };

  private calculateReturns = (
    startSnapshot: PortfolioSnapshot,
    endSnapshot: PortfolioSnapshot
  ): { absolute: number; percentage: number } => {
    const absolute = endSnapshot.totalValueUSD - startSnapshot.totalValueUSD;
    const percentage = startSnapshot.totalValueUSD > 0 
      ? (absolute / startSnapshot.totalValueUSD) * 100 
      : 0;

    return { absolute, percentage };
  };

  private calculateAPY = (snapshots: PortfolioSnapshot[]): {
    lending: number;
    liquidity: number;
    fees: number;
    total: number;
  } => {
    if (snapshots.length === 0) {
      return { lending: 0, liquidity: 0, fees: 0, total: 0 };
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    
    // Weighted average APY calculation
    let totalLendingValue = 0;
    let totalLendingApy = 0;
    let totalLiquidityValue = 0;
    let totalLiquidityApy = 0;

    latestSnapshot.lendingPositions.forEach(pos => {
      if (pos.type === 'supply') {
        totalLendingValue += pos.valueUSD;
        totalLendingApy += pos.apy * pos.valueUSD;
      }
    });

    latestSnapshot.liquidityPositions.forEach(pos => {
      totalLiquidityValue += pos.valueUSD;
      totalLiquidityApy += pos.totalApr * pos.valueUSD;
    });

    const lending = totalLendingValue > 0 ? totalLendingApy / totalLendingValue : 0;
    const liquidity = totalLiquidityValue > 0 ? totalLiquidityApy / totalLiquidityValue : 0;
    const fees = liquidity * 0.3; // Assume 30% of liquidity APY comes from fees
    
    const totalValue = totalLendingValue + totalLiquidityValue;
    const total = totalValue > 0 
      ? (totalLendingApy + totalLiquidityApy) / totalValue 
      : 0;

    return { lending, liquidity, fees, total };
  };

  private calculateVolatility = (snapshots: PortfolioSnapshot[]): number => {
    if (snapshots.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = snapshots[i - 1].totalValueUSD;
      const currentValue = snapshots[i].totalValueUSD;
      
      if (prevValue > 0) {
        returns.push((currentValue - prevValue) / prevValue);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // Return as percentage
  };

  private calculateSharpeRatio = (returnPercentage: number, volatility: number): number => {
    if (volatility === 0) return 0;
    const excessReturn = returnPercentage - this.config.riskFreeRate;
    return excessReturn / volatility;
  };

  private calculateMaxDrawdown = (snapshots: PortfolioSnapshot[]): number => {
    if (snapshots.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = snapshots[0].totalValueUSD;

    for (const snapshot of snapshots) {
      if (snapshot.totalValueUSD > peak) {
        peak = snapshot.totalValueUSD;
      } else {
        const drawdown = (peak - snapshot.totalValueUSD) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown * 100; // Return as percentage
  };

  private calculateWinRate = (snapshots: PortfolioSnapshot[]): number => {
    if (snapshots.length < 2) return 0;

    let wins = 0;
    let total = 0;

    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].totalValueUSD > snapshots[i - 1].totalValueUSD) {
        wins++;
      }
      total++;
    }

    return total > 0 ? (wins / total) * 100 : 0;
  };

  private calculateTokenAllocation = (snapshot: PortfolioSnapshot): TokenAllocation[] => {
    const tokenMap = new Map<string, {
      valueUSD: number;
      apySum: number;
      apyCount: number;
    }>();

    // Process lending positions
    snapshot.lendingPositions.forEach(pos => {
      const existing = tokenMap.get(pos.tokenSymbol) || { valueUSD: 0, apySum: 0, apyCount: 0 };
      tokenMap.set(pos.tokenSymbol, {
        valueUSD: existing.valueUSD + pos.valueUSD,
        apySum: existing.apySum + pos.apy,
        apyCount: existing.apyCount + 1
      });
    });

    // Process liquidity positions (split value between tokens)
    snapshot.liquidityPositions.forEach(pos => {
      const value0 = pos.valueUSD / 2;
      const value1 = pos.valueUSD / 2;

      [
        { symbol: pos.token0Symbol, value: value0 },
        { symbol: pos.token1Symbol, value: value1 }
      ].forEach(({ symbol, value }) => {
        const existing = tokenMap.get(symbol) || { valueUSD: 0, apySum: 0, apyCount: 0 };
        tokenMap.set(symbol, {
          valueUSD: existing.valueUSD + value,
          apySum: existing.apySum + pos.totalApr,
          apyCount: existing.apyCount + 1
        });
      });
    });

    // Process token balances
    snapshot.tokenBalances.forEach(balance => {
      const existing = tokenMap.get(balance.symbol) || { valueUSD: 0, apySum: 0, apyCount: 0 };
      tokenMap.set(balance.symbol, {
        valueUSD: existing.valueUSD + balance.valueUSD,
        apySum: existing.apySum,
        apyCount: existing.apyCount
      });
    });

    const allocations: TokenAllocation[] = [];
    for (const [symbol, data] of tokenMap) {
      const percentage = snapshot.totalValueUSD > 0 
        ? (data.valueUSD / snapshot.totalValueUSD) * 100 
        : 0;
      const avgApy = data.apyCount > 0 ? data.apySum / data.apyCount : 0;
      const riskScore = this.calculateTokenRiskScore(symbol);

      allocations.push({
        token: symbol, // In practice, would need token address
        symbol,
        valueUSD: data.valueUSD,
        percentage,
        avgApy,
        riskScore
      });
    }

    return allocations.sort((a, b) => b.valueUSD - a.valueUSD);
  };

  private calculatePlatformAllocation = (snapshot: PortfolioSnapshot): PlatformAllocation[] => {
    const platformMap = new Map<string, {
      valueUSD: number;
      positionCount: number;
      apySum: number;
      apyCount: number;
    }>();

    // Process lending positions
    snapshot.lendingPositions.forEach(pos => {
      const existing = platformMap.get(pos.platform) || { 
        valueUSD: 0, positionCount: 0, apySum: 0, apyCount: 0 
      };
      platformMap.set(pos.platform, {
        valueUSD: existing.valueUSD + pos.valueUSD,
        positionCount: existing.positionCount + 1,
        apySum: existing.apySum + pos.apy,
        apyCount: existing.apyCount + 1
      });
    });

    // Process liquidity positions
    snapshot.liquidityPositions.forEach(pos => {
      const existing = platformMap.get(pos.platform) || { 
        valueUSD: 0, positionCount: 0, apySum: 0, apyCount: 0 
      };
      platformMap.set(pos.platform, {
        valueUSD: existing.valueUSD + pos.valueUSD,
        positionCount: existing.positionCount + 1,
        apySum: existing.apySum + pos.totalApr,
        apyCount: existing.apyCount + 1
      });
    });

    const allocations: PlatformAllocation[] = [];
    for (const [platform, data] of platformMap) {
      const percentage = snapshot.totalValueUSD > 0 
        ? (data.valueUSD / snapshot.totalValueUSD) * 100 
        : 0;
      const avgApy = data.apyCount > 0 ? data.apySum / data.apyCount : 0;
      const riskScore = this.calculatePlatformRiskScore(platform);

      allocations.push({
        platform,
        valueUSD: data.valueUSD,
        percentage,
        positionCount: data.positionCount,
        avgApy,
        riskScore
      });
    }

    return allocations.sort((a, b) => b.valueUSD - a.valueUSD);
  };

  private calculatePositionBreakdown = (snapshot: PortfolioSnapshot): PositionBreakdown => {
    const supplyPositions = snapshot.lendingPositions.filter(p => p.type === 'supply');
    const borrowPositions = snapshot.lendingPositions.filter(p => p.type === 'borrow');

    const totalSupplied = supplyPositions.reduce((sum, p) => sum + p.valueUSD, 0);
    const totalBorrowed = borrowPositions.reduce((sum, p) => sum + p.valueUSD, 0);
    const avgSupplyApy = supplyPositions.length > 0 
      ? supplyPositions.reduce((sum, p) => sum + p.apy, 0) / supplyPositions.length 
      : 0;
    const avgBorrowApy = borrowPositions.length > 0 
      ? borrowPositions.reduce((sum, p) => sum + p.apy, 0) / borrowPositions.length 
      : 0;

    const inRangePositions = snapshot.liquidityPositions.filter(p => p.isInRange).length;
    const outOfRangePositions = snapshot.liquidityPositions.length - inRangePositions;
    const totalFees = snapshot.liquidityPositions.reduce((sum, p) => sum + p.uncollectedFees.valueUSD, 0);
    const avgLiquidityApr = snapshot.liquidityPositions.length > 0
      ? snapshot.liquidityPositions.reduce((sum, p) => sum + p.totalApr, 0) / snapshot.liquidityPositions.length
      : 0;

    return {
      lending: {
        totalSupplied,
        totalBorrowed,
        netPosition: totalSupplied - totalBorrowed,
        avgSupplyApy,
        avgBorrowApy,
        utilizationRate: totalSupplied > 0 ? totalBorrowed / totalSupplied : 0
      },
      liquidity: {
        totalValue: snapshot.totalLiquidityUSD,
        totalFees,
        avgApr: avgLiquidityApr,
        inRangePositions,
        outOfRangePositions,
        impermanentLoss: 0 // Would need historical data to calculate
      }
    };
  };

  private calculateYieldSources = (snapshot: PortfolioSnapshot): YieldSource[] => {
    const sources: YieldSource[] = [];

    // Lending yield
    const lendingValue = snapshot.lendingPositions
      .filter(p => p.type === 'supply')
      .reduce((sum, p) => sum + p.valueUSD, 0);
    const lendingApy = snapshot.lendingPositions
      .filter(p => p.type === 'supply')
      .reduce((sum, p) => sum + p.apy * p.valueUSD, 0) / (lendingValue || 1);

    if (lendingValue > 0) {
      sources.push({
        source: 'lending',
        valueUSD: lendingValue,
        apy: lendingApy,
        riskAdjustedReturn: lendingApy * 0.9 // Assume 10% risk discount
      });
    }

    // Liquidity fees
    const liquidityValue = snapshot.totalLiquidityUSD;
    const liquidityApr = snapshot.liquidityPositions.length > 0
      ? snapshot.liquidityPositions.reduce((sum, p) => sum + p.feeApr * p.valueUSD, 0) / liquidityValue
      : 0;

    if (liquidityValue > 0) {
      sources.push({
        source: 'liquidity_fees',
        valueUSD: liquidityValue,
        apy: liquidityApr,
        riskAdjustedReturn: liquidityApr * 0.7 // Higher risk discount for IL
      });
    }

    return sources;
  };

  private calculateRiskFactors = (snapshot: PortfolioSnapshot): RiskFactor[] => {
    const factors: RiskFactor[] = [];

    // Health factor risk
    if (snapshot.healthFactor !== Infinity) {
      const impact = snapshot.healthFactor < 1.2 ? 'high' : 
                     snapshot.healthFactor < 1.5 ? 'medium' : 'low';
      factors.push({
        factor: 'Liquidation Risk',
        impact,
        score: Math.max(0, 100 - (snapshot.healthFactor - 1) * 50),
        description: `Health factor of ${snapshot.healthFactor.toFixed(2)}`
      });
    }

    // Concentration risk
    const concentrationScore = this.calculateConcentrationRisk(snapshot);
    factors.push({
      factor: 'Concentration Risk',
      impact: concentrationScore > 70 ? 'high' : concentrationScore > 40 ? 'medium' : 'low',
      score: concentrationScore,
      description: 'Portfolio concentration across platforms and assets'
    });

    // Impermanent loss risk
    if (snapshot.liquidityPositions.length > 0) {
      const ilRisk = this.calculateImpermanentLossRisk(snapshot);
      factors.push({
        factor: 'Impermanent Loss Risk',
        impact: ilRisk > 15 ? 'high' : ilRisk > 8 ? 'medium' : 'low',
        score: ilRisk,
        description: 'Risk of impermanent loss in liquidity positions'
      });
    }

    return factors.sort((a, b) => b.score - a.score);
  };

  private calculateConcentrationRisk = (snapshot: PortfolioSnapshot): number => {
    if (snapshot.totalValueUSD === 0) return 0;

    // Calculate platform concentration using HHI
    const platformValues = new Map<string, number>();
    
    snapshot.lendingPositions.forEach(pos => {
      const current = platformValues.get(pos.platform) || 0;
      platformValues.set(pos.platform, current + pos.valueUSD);
    });
    
    snapshot.liquidityPositions.forEach(pos => {
      const current = platformValues.get(pos.platform) || 0;
      platformValues.set(pos.platform, current + pos.valueUSD);
    });

    let hhi = 0;
    for (const value of platformValues.values()) {
      const share = value / snapshot.totalValueUSD;
      hhi += share * share;
    }

    return hhi * 100;
  };

  private calculateCorrelationRisk = (snapshot: PortfolioSnapshot): number => {
    // Simplified correlation risk - in practice would use actual correlation matrices
    const uniqueTokens = new Set<string>();
    
    snapshot.lendingPositions.forEach(pos => uniqueTokens.add(pos.tokenSymbol));
    snapshot.liquidityPositions.forEach(pos => {
      uniqueTokens.add(pos.token0Symbol);
      uniqueTokens.add(pos.token1Symbol);
    });
    
    const diversityScore = Math.min(uniqueTokens.size / 10, 1);
    return (1 - diversityScore) * 100;
  };

  private calculateImpermanentLossRisk = (snapshot: PortfolioSnapshot): number => {
    if (snapshot.liquidityPositions.length === 0) return 0;

    let totalRisk = 0;
    let totalValue = 0;

    snapshot.liquidityPositions.forEach(pos => {
      const range = pos.priceRange;
      const priceDeviation = Math.abs(range.current - (range.lower + range.upper) / 2);
      const rangeWidth = range.upper - range.lower;
      const risk = rangeWidth > 0 ? (priceDeviation / rangeWidth) * 100 : 0;
      
      totalRisk += risk * pos.valueUSD;
      totalValue += pos.valueUSD;
    });

    return totalValue > 0 ? totalRisk / totalValue : 0;
  };

  private assessLiquidationRisk = (healthFactor: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (healthFactor === Infinity) return 'low';
    if (healthFactor > 1.5) return 'low';
    if (healthFactor > 1.2) return 'medium';
    if (healthFactor > 1.1) return 'high';
    return 'critical';
  };

  private generateRiskAlerts = (
    snapshot: PortfolioSnapshot,
    risks: Omit<RiskMetrics, 'alerts'>
  ): any[] => {
    // This would be implemented similar to PositionTracker
    // For brevity, returning empty array
    return [];
  };

  private calculateTokenRiskScore = (symbol: string): number => {
    // Simplified risk scoring based on token type
    const riskMap: Record<string, number> = {
      'SEI': 30,
      'USDC': 10,
      'USDT': 15,
      'WETH': 25,
      'BTC': 20
    };
    return riskMap[symbol] || 50;
  };

  private calculatePlatformRiskScore = (platform: string): number => {
    // Simplified platform risk scoring
    const riskMap: Record<string, number> = {
      'YeiFinance': 25,
      'DragonSwap': 35,
      'Aave': 20,
      'Compound': 22
    };
    return riskMap[platform] || 40;
  };

  private createEmptyPerformance = (period: string): PortfolioPerformance => ({
    period: period as any,
    returns: { absolute: 0, percentage: 0 },
    apy: { lending: 0, liquidity: 0, fees: 0, total: 0 },
    volatility: 0,
    maxDrawdown: 0,
    winRate: 0
  });

  private getAnalyticsCacheKey = (walletAddress: WalletAddress): string => {
    return CacheService.generateKey('portfolio_analytics', walletAddress);
  };
}