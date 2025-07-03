/**
 * Sei Protocol Integration for Portfolio Management
 * Integrates Silo and Citrex protocols with existing portfolio system
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { PublicClient, WalletClient } from 'viem';
import {
  SeiProtocolIntegration,
  SeiProtocolConfig,
  SeiProtocolPosition,
  SiloStakingPosition,
  CitrexPerpetualPosition,
  SeiProtocolAdapter
} from './types';
import {
  WalletAddress,
  PortfolioSnapshot,
  AsyncResult,
  BasePosition
} from '../../types/portfolio';
import { createSeiProtocolIntegration } from './adapters';
import logger from '../../utils/logger';

/**
 * Enhanced portfolio service with Sei protocol integration
 */
export class SeiProtocolIntegration {
  private protocols: SeiProtocolIntegration;
  private isInitialized = false;

  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private config: SeiProtocolConfig
  ) {
    this.protocols = createSeiProtocolIntegration(publicClient, walletClient, config);
  }

  /**
   * Initialize all Sei protocol adapters
   */
  public initialize = (): AsyncResult<void> =>
    pipe(
      TE.Do,
      TE.bind('siloInit', () => this.protocols.silo.initialize()),
      TE.bind('citrexInit', () => this.protocols.citrex.initialize()),
      TE.map(() => {
        this.isInitialized = true;
        logger.info('Sei protocol integration initialized successfully');
      })
    );

  /**
   * Get all Sei protocol positions for a wallet
   */
  public getAllPositions = (walletAddress: WalletAddress): AsyncResult<SeiProtocolPosition[]> =>
    pipe(
      TE.Do,
      TE.bind('siloPositions', () => this.protocols.silo.getStakingPositions(walletAddress)),
      TE.bind('citrexPositions', () => this.protocols.citrex.getPositions(walletAddress)),
      TE.map(({ siloPositions, citrexPositions }) => [
        ...siloPositions,
        ...citrexPositions
      ])
    );

  /**
   * Get Silo staking positions
   */
  public getSiloPositions = (walletAddress: WalletAddress): AsyncResult<SiloStakingPosition[]> =>
    this.protocols.silo.getStakingPositions(walletAddress);

  /**
   * Get Citrex perpetual positions
   */
  public getCitrexPositions = (walletAddress: WalletAddress): AsyncResult<CitrexPerpetualPosition[]> =>
    this.protocols.citrex.getPositions(walletAddress);

  /**
   * Get total portfolio value including Sei protocols
   */
  public getProtocolPortfolioValue = (walletAddress: WalletAddress): AsyncResult<{
    totalValueUSD: number;
    siloValueUSD: number;
    citrexValueUSD: number;
    breakdown: {
      stakingValue: number;
      perpetualValue: number;
      collateralValue: number;
      unrealizedPnL: number;
    };
  }> =>
    pipe(
      TE.Do,
      TE.bind('siloPositions', () => this.protocols.silo.getStakingPositions(walletAddress)),
      TE.bind('citrexPositions', () => this.protocols.citrex.getPositions(walletAddress)),
      TE.map(({ siloPositions, citrexPositions }) => {
        const siloValueUSD = siloPositions.reduce((sum, pos) => sum + pos.valueUSD, 0);
        const citrexValueUSD = citrexPositions.reduce((sum, pos) => sum + pos.collateralUSD, 0);
        const citrexUnrealizedPnL = citrexPositions.reduce((sum, pos) => sum + pos.pnl.unrealized, 0);

        return {
          totalValueUSD: siloValueUSD + citrexValueUSD + citrexUnrealizedPnL,
          siloValueUSD,
          citrexValueUSD,
          breakdown: {
            stakingValue: siloValueUSD,
            perpetualValue: citrexPositions.reduce((sum, pos) => sum + pos.notionalValue, 0),
            collateralValue: citrexValueUSD,
            unrealizedPnL: citrexUnrealizedPnL
          }
        };
      })
    );

  /**
   * Get comprehensive portfolio metrics including Sei protocols
   */
  public getProtocolMetrics = (walletAddress: WalletAddress): AsyncResult<{
    stakingMetrics: {
      totalStaked: number;
      totalRewards: number;
      averageAPY: number;
      riskScore: number;
    };
    tradingMetrics: {
      totalPositions: number;
      totalNotionalValue: number;
      totalPnL: number;
      averageLeverage: number;
      liquidationRisk: number;
    };
    combinedMetrics: {
      totalValue: number;
      diversificationScore: number;
      overallRisk: number;
      performanceScore: number;
    };
  }> =>
    pipe(
      TE.Do,
      TE.bind('siloMetrics', () => this.protocols.silo.getStakingMetrics(walletAddress)),
      TE.bind('citrexMetrics', () => this.protocols.citrex.getTradingMetrics(walletAddress)),
      TE.bind('siloPositions', () => this.protocols.silo.getStakingPositions(walletAddress)),
      TE.bind('citrexPositions', () => this.protocols.citrex.getPositions(walletAddress)),
      TE.map(({ siloMetrics, citrexMetrics, siloPositions, citrexPositions }) => {
        // Calculate staking metrics
        const averageAPY = siloPositions.length > 0 
          ? siloPositions.reduce((sum, pos) => sum + pos.apy, 0) / siloPositions.length
          : 0;
        
        const stakingRiskScore = this.calculateStakingRisk(siloPositions);

        // Calculate trading metrics
        const averageLeverage = citrexPositions.length > 0
          ? citrexPositions.reduce((sum, pos) => sum + pos.leverage, 0) / citrexPositions.length
          : 0;
        
        const liquidationRisk = this.calculateLiquidationRisk(citrexPositions);

        // Calculate combined metrics
        const totalValue = siloMetrics.totalStakedUSD + citrexMetrics.totalCollateral + citrexMetrics.totalPnL;
        const diversificationScore = this.calculateDiversificationScore(siloPositions, citrexPositions);
        const overallRisk = this.calculateOverallRisk(stakingRiskScore, liquidationRisk);
        const performanceScore = this.calculatePerformanceScore(siloMetrics, citrexMetrics);

        return {
          stakingMetrics: {
            totalStaked: siloMetrics.totalStakedUSD,
            totalRewards: siloMetrics.totalRewardsUSD,
            averageAPY,
            riskScore: stakingRiskScore
          },
          tradingMetrics: {
            totalPositions: citrexMetrics.totalPositions,
            totalNotionalValue: citrexMetrics.totalNotionalValue,
            totalPnL: citrexMetrics.totalPnL,
            averageLeverage,
            liquidationRisk
          },
          combinedMetrics: {
            totalValue,
            diversificationScore,
            overallRisk,
            performanceScore
          }
        };
      })
    );

  /**
   * Enhanced portfolio snapshot with Sei protocols
   */
  public getEnhancedPortfolioSnapshot = (
    walletAddress: WalletAddress,
    baseSnapshot: PortfolioSnapshot
  ): AsyncResult<PortfolioSnapshot & {
    seiProtocols: {
      siloPositions: SiloStakingPosition[];
      citrexPositions: CitrexPerpetualPosition[];
      totalValue: number;
      protocolMetrics: any;
    };
  }> =>
    pipe(
      TE.Do,
      TE.bind('siloPositions', () => this.protocols.silo.getStakingPositions(walletAddress)),
      TE.bind('citrexPositions', () => this.protocols.citrex.getPositions(walletAddress)),
      TE.bind('protocolValue', () => this.getProtocolPortfolioValue(walletAddress)),
      TE.bind('protocolMetrics', () => this.getProtocolMetrics(walletAddress)),
      TE.map(({ siloPositions, citrexPositions, protocolValue, protocolMetrics }) => ({
        ...baseSnapshot,
        totalValueUSD: baseSnapshot.totalValueUSD + protocolValue.totalValueUSD,
        netWorth: baseSnapshot.netWorth + protocolValue.totalValueUSD,
        seiProtocols: {
          siloPositions,
          citrexPositions,
          totalValue: protocolValue.totalValueUSD,
          protocolMetrics
        }
      }))
    );

  /**
   * Get protocol health status
   */
  public getProtocolHealth = (): AsyncResult<{
    overall: 'healthy' | 'warning' | 'critical';
    protocols: {
      silo: {
        status: 'healthy' | 'warning' | 'critical';
        responseTime: number;
        successRate: number;
        issues: string[];
      };
      citrex: {
        status: 'healthy' | 'warning' | 'critical';
        responseTime: number;
        successRate: number;
        issues: string[];
      };
    };
    lastChecked: string;
  }> =>
    TE.tryCatch(
      async () => {
        const siloHealth = this.protocols.health.find(h => h.protocol === 'silo');
        const citrexHealth = this.protocols.health.find(h => h.protocol === 'citrex');

        const siloStatus = this.getHealthStatus(siloHealth);
        const citrexStatus = this.getHealthStatus(citrexHealth);

        const overallStatus = this.getOverallHealthStatus(siloStatus, citrexStatus);

        return {
          overall: overallStatus,
          protocols: {
            silo: {
              status: siloStatus,
              responseTime: siloHealth?.metrics.responseTime || 0,
              successRate: siloHealth?.metrics.successRate || 0,
              issues: siloHealth?.issues || []
            },
            citrex: {
              status: citrexStatus,
              responseTime: citrexHealth?.metrics.responseTime || 0,
              successRate: citrexHealth?.metrics.successRate || 0,
              issues: citrexHealth?.issues || []
            }
          },
          lastChecked: new Date().toISOString()
        };
      },
      (error) => new Error(`Failed to get protocol health: ${error}`)
    );

  /**
   * Execute protocol operations with unified error handling
   */
  public executeProtocolOperation = <T>(
    operation: () => AsyncResult<T>,
    operationName: string
  ): AsyncResult<T> =>
    pipe(
      TE.Do,
      TE.bind('result', () => operation()),
      TE.tapEither((result) => {
        logger.info(`Protocol operation completed: ${operationName}`, {
          success: true,
          timestamp: new Date().toISOString()
        });
        return TE.right(result);
      }),
      TE.mapLeft((error) => {
        logger.error(`Protocol operation failed: ${operationName}`, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return error;
      }),
      TE.map(({ result }) => result)
    );

  // ===================== Private Helper Methods =====================

  private calculateStakingRisk = (positions: SiloStakingPosition[]): number => {
    if (positions.length === 0) return 0;

    const totalValue = positions.reduce((sum, pos) => sum + pos.valueUSD, 0);
    const penaltyRisk = positions.reduce((sum, pos) => {
      const penalty = pos.stakingPeriod.isLocked ? pos.penalties.earlyUnstakePenalty : 0;
      return sum + (pos.valueUSD * penalty);
    }, 0);

    const slashingRisk = positions.reduce((sum, pos) => {
      return sum + (pos.valueUSD * pos.penalties.slashingRisk);
    }, 0);

    return ((penaltyRisk + slashingRisk) / totalValue) * 100;
  };

  private calculateLiquidationRisk = (positions: CitrexPerpetualPosition[]): number => {
    if (positions.length === 0) return 0;

    const criticalPositions = positions.filter(pos => pos.risk.liquidationRisk === 'critical').length;
    const highRiskPositions = positions.filter(pos => pos.risk.liquidationRisk === 'high').length;
    const mediumRiskPositions = positions.filter(pos => pos.risk.liquidationRisk === 'medium').length;

    const totalPositions = positions.length;
    const riskScore = (criticalPositions * 4 + highRiskPositions * 3 + mediumRiskPositions * 2) / totalPositions;

    return riskScore * 25; // Scale to 0-100
  };

  private calculateDiversificationScore = (
    siloPositions: SiloStakingPosition[],
    citrexPositions: CitrexPerpetualPosition[]
  ): number => {
    const uniqueStakingTokens = new Set(siloPositions.map(pos => pos.stakedToken)).size;
    const uniqueMarkets = new Set(citrexPositions.map(pos => pos.market)).size;
    
    const hasStaking = siloPositions.length > 0 ? 1 : 0;
    const hasTrading = citrexPositions.length > 0 ? 1 : 0;

    const diversificationComponents = [
      uniqueStakingTokens * 10,
      uniqueMarkets * 15,
      (hasStaking + hasTrading) * 20
    ];

    return Math.min(100, diversificationComponents.reduce((sum, score) => sum + score, 0));
  };

  private calculateOverallRisk = (stakingRisk: number, liquidationRisk: number): number => {
    // Weighted average of risks
    const stakingWeight = 0.3;
    const liquidationWeight = 0.7;
    
    return (stakingRisk * stakingWeight + liquidationRisk * liquidationWeight);
  };

  private calculatePerformanceScore = (siloMetrics: any, citrexMetrics: any): number => {
    const stakingPerformance = siloMetrics.totalRewardsUSD / Math.max(siloMetrics.totalStakedUSD, 1);
    const tradingPerformance = citrexMetrics.totalPnL / Math.max(citrexMetrics.totalCollateral, 1);
    
    const normalizedStaking = Math.max(0, Math.min(100, stakingPerformance * 100));
    const normalizedTrading = Math.max(0, Math.min(100, (tradingPerformance + 1) * 50));

    return (normalizedStaking + normalizedTrading) / 2;
  };

  private getHealthStatus = (health: any): 'healthy' | 'warning' | 'critical' => {
    if (!health) return 'critical';
    
    const { successRate, responseTime, issues } = health.metrics;
    
    if (successRate < 0.9 || responseTime > 1000 || issues.length > 3) {
      return 'critical';
    }
    
    if (successRate < 0.95 || responseTime > 500 || issues.length > 1) {
      return 'warning';
    }
    
    return 'healthy';
  };

  private getOverallHealthStatus = (
    siloStatus: 'healthy' | 'warning' | 'critical',
    citrexStatus: 'healthy' | 'warning' | 'critical'
  ): 'healthy' | 'warning' | 'critical' => {
    if (siloStatus === 'critical' || citrexStatus === 'critical') {
      return 'critical';
    }
    
    if (siloStatus === 'warning' || citrexStatus === 'warning') {
      return 'warning';
    }
    
    return 'healthy';
  };

  // ===================== Getter Methods =====================

  public get silo() {
    return this.protocols.silo;
  }

  public get citrex() {
    return this.protocols.citrex;
  }

  public get initialized() {
    return this.isInitialized;
  }

  public get config() {
    return this.config;
  }
}

/**
 * Factory function to create Sei protocol integration
 */
export const createSeiProtocolIntegration = (
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: SeiProtocolConfig
): SeiProtocolIntegration => {
  return new SeiProtocolIntegration(publicClient, walletClient, config);
};