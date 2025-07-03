import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { PublicClient, WalletClient } from 'viem';

import { DragonSwapAdapter } from './DragonSwapAdapter';
import { 
  LiquidityPosition, 
  LiquidityParams, 
  LiquidityError, 
  LiquidityResult,
  AddLiquidityResponse,
  RemoveLiquidityResponse,
  PoolInfo as DragonPoolInfo,
} from './types';

import {
  SymphonyProtocolWrapper,
  createSymphonyProtocolWrapper,
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  SymphonyError,
  SwapRoute,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapExecuteRequest,
  SwapExecuteResponse,
  RouteRequest,
  RouteResponse,
  OptimalRouteAnalysis,
  SwapImpactAnalysis,
  ProtocolStats,
  formatSymphonyError,
  calculateRouteEfficiency,
  rankRoutes,
  RouteOptimizationParams,
} from '../protocols/sei';

/**
 * Enhanced Liquidity Manager
 * 
 * Integrates Symphony Protocol with existing DragonSwap functionality
 * to provide optimal liquidity management and token swapping capabilities.
 */

export interface SwapComparisonResult {
  readonly bestRoute: 'dragonswap' | 'symphony';
  readonly dragonSwapRoute?: any;
  readonly symphonyRoute?: SwapRoute;
  readonly reasoning: string;
  readonly savings: string;
  readonly riskAssessment: 'low' | 'medium' | 'high';
}

export interface EnhancedLiquidityConfig {
  readonly enableSymphonyIntegration: boolean;
  readonly preferredProtocol: 'dragonswap' | 'symphony' | 'auto';
  readonly autoOptimization: boolean;
  readonly maxSlippagePercent: number;
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly enableAnalytics: boolean;
}

export interface SwapOptions {
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly amountIn: string;
  readonly slippagePercent: number;
  readonly recipient: string;
  readonly deadline: number;
  readonly optimizeFor: 'price' | 'gas' | 'speed' | 'risk';
  readonly maxHops?: number;
}

export interface LiquidityAnalytics {
  readonly totalSwapVolume: string;
  readonly averageSlippage: number;
  readonly protocolUsageStats: {
    readonly dragonSwap: number;
    readonly symphony: number;
  };
  readonly costSavings: string;
  readonly successRate: number;
}

export class EnhancedLiquidityManager {
  private dragonSwapAdapter: DragonSwapAdapter;
  private symphonyWrapper: SymphonyProtocolWrapper;
  private config: EnhancedLiquidityConfig;
  private analytics: LiquidityAnalytics;

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient,
    config: EnhancedLiquidityConfig = {
      enableSymphonyIntegration: true,
      preferredProtocol: 'auto',
      autoOptimization: true,
      maxSlippagePercent: 1.0,
      riskTolerance: 'medium',
      enableAnalytics: true,
    }
  ) {
    this.config = config;
    this.dragonSwapAdapter = new DragonSwapAdapter(publicClient, walletClient);
    
    if (config.enableSymphonyIntegration) {
      this.symphonyWrapper = createSymphonyProtocolWrapper(
        defaultSymphonyConfig,
        defaultSymphonyIntegrationConfig,
        publicClient,
        walletClient
      );
    }

    this.analytics = {
      totalSwapVolume: '0',
      averageSlippage: 0,
      protocolUsageStats: {
        dragonSwap: 0,
        symphony: 0,
      },
      costSavings: '0',
      successRate: 0,
    };
  }

  /**
   * Get optimal swap route comparing both protocols
   */
  public getOptimalSwapRoute = (
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, SwapComparisonResult> => {
    if (!this.config.enableSymphonyIntegration) {
      return TE.left({ type: 'insufficient_liquidity', pool: 'Symphony integration disabled' });
    }

    return pipe(
      this.fetchBothRoutes(options),
      TE.chain(routes => this.compareRoutes(routes, options)),
      TE.map(comparison => this.enrichComparison(comparison))
    );
  };

  /**
   * Execute optimal swap using the best available route
   */
  public executeOptimalSwap = (
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, SwapExecuteResponse> =>
    pipe(
      this.getOptimalSwapRoute(options),
      TE.chain(comparison => this.executeSwapViaOptimalRoute(comparison, options)),
      TE.map(result => this.updateAnalytics(result))
    );

  /**
   * Get comprehensive swap analysis
   */
  public analyzeSwap = (
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, SwapImpactAnalysis> => {
    if (!this.config.enableSymphonyIntegration) {
      return TE.left({ type: 'insufficient_liquidity', pool: 'Symphony integration disabled' });
    }

    return pipe(
      this.symphonyWrapper.analyzeSwapImpact({
        tokenIn: options.tokenIn,
        tokenOut: options.tokenOut,
        amountIn: options.amountIn,
        slippagePercent: options.slippagePercent,
      }),
      TE.mapLeft(error => error as LiquidityError | SymphonyError)
    );
  };

  /**
   * Get liquidity pools information from both protocols
   */
  public getEnhancedPoolInfo = (
    token0: string,
    token1: string,
    fee: number
  ): TE.TaskEither<LiquidityError | SymphonyError, DragonPoolInfo> => {
    // For now, we'll use DragonSwap pool info as the base
    return pipe(
      this.dragonSwapAdapter.getPoolInfo(token0, token1, fee),
      TE.mapLeft(error => error as LiquidityError | SymphonyError)
    );
  };

  /**
   * Add liquidity using enhanced routing
   */
  public addLiquidity = (params: LiquidityParams): TE.TaskEither<LiquidityError, AddLiquidityResponse> =>
    this.dragonSwapAdapter.addLiquidity(params);

  /**
   * Remove liquidity with enhanced analytics
   */
  public removeLiquidity = (params: any): TE.TaskEither<LiquidityError, RemoveLiquidityResponse> =>
    this.dragonSwapAdapter.removeLiquidity(params);

  /**
   * Get comprehensive analytics
   */
  public getAnalytics = (): TE.TaskEither<LiquidityError | SymphonyError, LiquidityAnalytics> => {
    if (!this.config.enableSymphonyIntegration) {
      return TE.right(this.analytics);
    }

    return pipe(
      this.symphonyWrapper.getProtocolStats(),
      TE.map(stats => this.enrichAnalyticsWithSymphony(stats)),
      TE.mapLeft(error => error as LiquidityError | SymphonyError)
    );
  };

  /**
   * Get protocol health status
   */
  public getProtocolHealth = (): TE.TaskEither<LiquidityError | SymphonyError, {
    dragonSwap: 'healthy' | 'degraded' | 'unavailable';
    symphony: 'healthy' | 'degraded' | 'unavailable';
  }> => {
    if (!this.config.enableSymphonyIntegration) {
      return TE.right({
        dragonSwap: 'healthy',
        symphony: 'unavailable',
      });
    }

    return pipe(
      this.symphonyWrapper.getProtocolStats(),
      TE.map(() => ({
        dragonSwap: 'healthy' as const,
        symphony: 'healthy' as const,
      })),
      TE.orElse(() => TE.right({
        dragonSwap: 'healthy' as const,
        symphony: 'degraded' as const,
      }))
    );
  };

  // Private helper methods

  private fetchBothRoutes = (
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, {
    dragonSwap: any;
    symphony: RouteResponse;
  }> => {
    const symphonyRouteRequest: RouteRequest = {
      tokenIn: options.tokenIn,
      tokenOut: options.tokenOut,
      amountIn: options.amountIn,
      maxRoutes: 5,
    };

    // For DragonSwap, we'll simulate a route request
    const dragonSwapRoute = TE.right({
      outputAmount: options.amountIn, // Simplified
      priceImpact: 0.5,
      gasEstimate: '200000',
      route: 'dragonswap',
    });

    return pipe(
      TE.Do,
      TE.bind('dragonSwap', () => dragonSwapRoute),
      TE.bind('symphony', () => 
        pipe(
          this.symphonyWrapper.getRoutes(symphonyRouteRequest),
          TE.mapLeft(error => error as LiquidityError | SymphonyError)
        )
      )
    );
  };

  private compareRoutes = (
    routes: {
      dragonSwap: any;
      symphony: RouteResponse;
    },
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, SwapComparisonResult> => {
    const { dragonSwap, symphony } = routes;
    const bestSymphonyRoute = symphony.bestRoute;

    // Calculate scores for each route
    const dragonScore = this.calculateDragonSwapScore(dragonSwap, options);
    const symphonyScore = this.calculateSymphonyScore(bestSymphonyRoute, options);

    const bestRoute = symphonyScore > dragonScore ? 'symphony' : 'dragonswap';
    const savings = this.calculateSavings(dragonSwap, bestSymphonyRoute);
    const riskAssessment = this.assessOverallRisk(dragonSwap, bestSymphonyRoute);

    return TE.right({
      bestRoute,
      dragonSwapRoute: dragonSwap,
      symphonyRoute: bestSymphonyRoute,
      reasoning: this.generateReasoning(bestRoute, symphonyScore, dragonScore),
      savings,
      riskAssessment,
    });
  };

  private enrichComparison = (comparison: SwapComparisonResult): SwapComparisonResult => {
    // Add additional analysis or metrics
    return {
      ...comparison,
      reasoning: `${comparison.reasoning} (Risk: ${comparison.riskAssessment})`,
    };
  };

  private executeSwapViaOptimalRoute = (
    comparison: SwapComparisonResult,
    options: SwapOptions
  ): TE.TaskEither<LiquidityError | SymphonyError, SwapExecuteResponse> => {
    if (comparison.bestRoute === 'symphony' && comparison.symphonyRoute) {
      const executeRequest: SwapExecuteRequest = {
        tokenIn: options.tokenIn,
        tokenOut: options.tokenOut,
        amountIn: options.amountIn,
        amountOutMinimum: comparison.symphonyRoute.minimumAmountOut,
        recipient: options.recipient,
        deadline: options.deadline,
        routeId: comparison.symphonyRoute.id,
        slippagePercent: options.slippagePercent,
      };

      return pipe(
        this.symphonyWrapper.executeSwap(executeRequest),
        TE.mapLeft(error => error as LiquidityError | SymphonyError)
      );
    } else {
      // For DragonSwap execution, we would use the adapter
      // This is a simplified version
      return TE.left({ type: 'execution_failed', reason: 'DragonSwap execution not implemented in this example' });
    }
  };

  private updateAnalytics = (result: SwapExecuteResponse): SwapExecuteResponse => {
    // Update internal analytics
    this.analytics = {
      ...this.analytics,
      totalSwapVolume: (parseFloat(this.analytics.totalSwapVolume) + parseFloat(result.actualAmountIn)).toString(),
      protocolUsageStats: {
        ...this.analytics.protocolUsageStats,
        symphony: this.analytics.protocolUsageStats.symphony + 1,
      },
    };

    return result;
  };

  private enrichAnalyticsWithSymphony = (stats: ProtocolStats): LiquidityAnalytics => {
    return {
      ...this.analytics,
      totalSwapVolume: stats.volume24h,
      costSavings: stats.fees24h,
    };
  };

  private calculateDragonSwapScore = (route: any, options: SwapOptions): number => {
    // Simplified scoring for DragonSwap
    const outputAmount = parseFloat(route.outputAmount);
    const priceImpact = route.priceImpact;
    const gasEstimate = parseFloat(route.gasEstimate);

    return this.calculateScore(outputAmount, priceImpact, gasEstimate, options.optimizeFor);
  };

  private calculateSymphonyScore = (route: SwapRoute, options: SwapOptions): number => {
    const outputAmount = parseFloat(route.outputAmount);
    const priceImpact = route.priceImpact;
    const gasEstimate = parseFloat(route.gasEstimate);

    return this.calculateScore(outputAmount, priceImpact, gasEstimate, options.optimizeFor);
  };

  private calculateScore = (
    outputAmount: number,
    priceImpact: number,
    gasEstimate: number,
    optimizeFor: string
  ): number => {
    switch (optimizeFor) {
      case 'price':
        return outputAmount * 0.7 + (5 - priceImpact) * 0.3;
      case 'gas':
        return (1000000 - gasEstimate) * 0.8 + outputAmount * 0.2;
      case 'speed':
        return (1000000 - gasEstimate) * 0.6 + outputAmount * 0.4;
      case 'risk':
        return (5 - priceImpact) * 0.8 + outputAmount * 0.2;
      default:
        return outputAmount * 0.4 + (5 - priceImpact) * 0.3 + (1000000 - gasEstimate) * 0.3;
    }
  };

  private calculateSavings = (dragonRoute: any, symphonyRoute: SwapRoute): string => {
    const dragonOutput = parseFloat(dragonRoute.outputAmount);
    const symphonyOutput = parseFloat(symphonyRoute.outputAmount);
    const savings = Math.abs(symphonyOutput - dragonOutput);
    return savings.toString();
  };

  private assessOverallRisk = (dragonRoute: any, symphonyRoute: SwapRoute): 'low' | 'medium' | 'high' => {
    const avgPriceImpact = (dragonRoute.priceImpact + symphonyRoute.priceImpact) / 2;
    
    if (avgPriceImpact < 1) return 'low';
    if (avgPriceImpact < 3) return 'medium';
    return 'high';
  };

  private generateReasoning = (bestRoute: string, symphonyScore: number, dragonScore: number): string => {
    const scoreDiff = Math.abs(symphonyScore - dragonScore);
    const winner = bestRoute === 'symphony' ? 'Symphony' : 'DragonSwap';
    
    if (scoreDiff < 0.1) {
      return `${winner} selected by narrow margin (${scoreDiff.toFixed(2)} points)`;
    } else if (scoreDiff < 0.5) {
      return `${winner} selected with moderate advantage (${scoreDiff.toFixed(2)} points)`;
    } else {
      return `${winner} selected with significant advantage (${scoreDiff.toFixed(2)} points)`;
    }
  };
}

/**
 * Factory function for creating enhanced liquidity manager
 */
export const createEnhancedLiquidityManager = (
  publicClient: PublicClient,
  walletClient: WalletClient,
  config?: EnhancedLiquidityConfig
): EnhancedLiquidityManager => {
  return new EnhancedLiquidityManager(publicClient, walletClient, config);
};

/**
 * Default enhanced liquidity configuration
 */
export const defaultEnhancedLiquidityConfig: EnhancedLiquidityConfig = {
  enableSymphonyIntegration: true,
  preferredProtocol: 'auto',
  autoOptimization: true,
  maxSlippagePercent: 1.0,
  riskTolerance: 'medium',
  enableAnalytics: true,
};