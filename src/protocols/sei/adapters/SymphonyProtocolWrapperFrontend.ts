import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { PublicClient, parseAbi, encodeFunctionData, type Address } from 'viem';

import {
  SymphonyConfig,
  SymphonyError,
  SymphonyResult,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapExecuteRequest,
  SwapExecuteResponse,
  RouteRequest,
  RouteResponse,
  GasEstimateRequest,
  GasEstimateResponse,
  SwapValidationResponse,
  SwapAnalytics,
  ProtocolStats,
  SwapImpactAnalysis,
  OptimalRouteAnalysis,
  SwapMonitoring,
  TokenInfo,
  SwapRoute,
  SymphonyIntegrationConfig,
  CrossProtocolRoute,
  RouteOptimizationParams,
} from '../types';

import {
  SYMPHONY_ADDRESSES,
  SYMPHONY_API,
  SUPPORTED_PROTOCOLS,
  SYMPHONY_FEE_TIERS,
  SLIPPAGE_LEVELS,
  SYMPHONY_GAS_LIMITS,
  ROUTE_OPTIMIZATION,
  SYMPHONY_TOKENS,
  SYMPHONY_LIMITS,
  SYMPHONY_ERROR_MESSAGES,
  RISK_PARAMETERS,
  CACHE_CONFIG,
  SYMPHONY_ABI_FRAGMENTS,
} from '../constants';

// Symphony Router ABI
const SYMPHONY_ROUTER_ABI = parseAbi(SYMPHONY_ABI_FRAGMENTS.ROUTER);
const SYMPHONY_QUOTER_ABI = parseAbi(SYMPHONY_ABI_FRAGMENTS.QUOTER);

export interface PreparedTransaction {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  gasLimit?: bigint;
}

export interface TransactionPreparation {
  transaction: PreparedTransaction;
  metadata: {
    type: 'swap' | 'approve' | 'add_liquidity' | 'remove_liquidity';
    protocol: 'Symphony';
    tokenIn?: TokenInfo;
    tokenOut?: TokenInfo;
    amountIn?: string;
    amountOut?: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Symphony Protocol Wrapper for Frontend
 * 
 * This version prepares transactions for frontend wallet signing rather than
 * executing them directly with private keys.
 */
export class SymphonyProtocolWrapperFrontend {
  private config: SymphonyConfig;
  private integrationConfig: SymphonyIntegrationConfig;
  private publicClient: PublicClient;
  private quoteCache: Map<string, { quote: SwapQuoteResponse; timestamp: number }>;
  private routeCache: Map<string, { routes: RouteResponse; timestamp: number }>;

  constructor(
    config: SymphonyConfig,
    integrationConfig: SymphonyIntegrationConfig,
    publicClient: PublicClient
  ) {
    this.config = config;
    this.integrationConfig = integrationConfig;
    this.publicClient = publicClient;
    this.quoteCache = new Map();
    this.routeCache = new Map();
  }

  /**
   * Get a quote for a token swap
   */
  public getQuote = (request: SwapQuoteRequest): TE.TaskEither<SymphonyError, SwapQuoteResponse> => {
    const cacheKey = this.generateCacheKey('quote', request);
    
    return pipe(
      this.getCachedQuote(cacheKey),
      TE.fromOption(() => ({ type: 'network_error', message: 'No cached quote' }) as SymphonyError),
      TE.orElse(() => this.fetchQuote(request)),
      TE.chain(quote => this.validateQuote(quote)),
      TE.map(quote => {
        if (this.integrationConfig.cacheConfig.enableQuoteCache) {
          this.cacheQuote(cacheKey, quote);
        }
        return quote;
      })
    );
  };

  /**
   * Prepare a swap transaction for frontend signing
   */
  public prepareSwapTransaction = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, TransactionPreparation> =>
    pipe(
      this.validateSwapRequest(request),
      TE.fromEither,
      TE.chain(() => this.estimateGasForSwap(request)),
      TE.map(gasEstimate => this.buildSwapTransaction(request, gasEstimate))
    );

  /**
   * Check token allowances
   */
  public checkAllowance = (tokenAddress: Address, spenderAddress: Address, ownerAddress: Address): TE.TaskEither<SymphonyError, bigint> =>
    TE.tryCatch(
      async () => {
        const allowance = await this.publicClient.readContract({
          address: tokenAddress,
          abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
          functionName: 'allowance',
          args: [ownerAddress, spenderAddress],
        });
        return allowance as bigint;
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  /**
   * Prepare approval transaction
   */
  public prepareApprovalTransaction = (
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): TransactionPreparation => {
    const data = encodeFunctionData({
      abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
      functionName: 'approve',
      args: [spenderAddress, amount],
    });

    return {
      transaction: {
        to: tokenAddress,
        data,
        gasLimit: BigInt(100000), // Standard approval gas limit
      },
      metadata: {
        type: 'approve',
        protocol: 'Symphony',
        description: `Approve Symphony to spend tokens`,
        riskLevel: 'low',
      },
    };
  };

  /**
   * Get optimal routes for a swap
   */
  public getRoutes = (request: RouteRequest): TE.TaskEither<SymphonyError, RouteResponse> => {
    const cacheKey = this.generateCacheKey('routes', request);
    
    return pipe(
      this.getCachedRoutes(cacheKey),
      TE.fromOption(() => ({ type: 'network_error', message: 'No cached routes' }) as SymphonyError),
      TE.orElse(() => this.fetchRoutes(request)),
      TE.chain(routes => this.optimizeRoutes(routes, request)),
      TE.map(routes => {
        if (this.integrationConfig.cacheConfig.enableRouteCache) {
          this.cacheRoutes(cacheKey, routes);
        }
        return routes;
      })
    );
  };

  /**
   * Estimate gas for a swap
   */
  public estimateGas = (request: GasEstimateRequest): TE.TaskEither<SymphonyError, GasEstimateResponse> =>
    pipe(
      this.validateGasEstimateRequest(request),
      TE.fromEither,
      TE.chain(() => this.fetchGasEstimate(request)),
      TE.chain(estimate => this.validateGasEstimate(estimate))
    );

  /**
   * Validate swap parameters
   */
  public validateSwap = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, SwapValidationResponse> =>
    pipe(
      this.validateSwapRequest(request),
      TE.fromEither,
      TE.chain(() => this.validateTokenLiquidity(request)),
      TE.chain(() => this.validateSlippageSettings(request)),
      TE.chain(() => this.validateGasSettings(request)),
      TE.map((): SwapValidationResponse => ({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }))
    );

  /**
   * Analyze swap impact
   */
  public analyzeSwapImpact = (request: SwapQuoteRequest): TE.TaskEither<SymphonyError, SwapImpactAnalysis> =>
    pipe(
      this.getQuote(request),
      TE.chain(quote => this.calculatePriceImpact(quote)),
      TE.chain(impact => this.assessRisk(impact, request)),
      TE.map(analysis => this.generateRecommendations(analysis))
    );

  /**
   * Find optimal route with analysis
   */
  public findOptimalRoute = (
    request: RouteRequest,
    params: RouteOptimizationParams
  ): TE.TaskEither<SymphonyError, OptimalRouteAnalysis> =>
    pipe(
      this.getRoutes(request),
      TE.chain(routes => this.analyzeRoutes(routes, params)),
      TE.chain(analysis => this.scoreRoutes(analysis, params)),
      TE.map(analysis => this.selectOptimalRoute(analysis, params))
    );

  /**
   * Get cross-protocol routes
   */
  public getCrossProtocolRoutes = (request: RouteRequest): TE.TaskEither<SymphonyError, CrossProtocolRoute[]> =>
    pipe(
      this.fetchCrossProtocolRoutes(request),
      TE.chain(routes => this.validateCrossProtocolRoutes(routes)),
      TE.map(routes => this.rankCrossProtocolRoutes(routes))
    );

  /**
   * Get Symphony analytics
   */
  public getAnalytics = (): TE.TaskEither<SymphonyError, SwapAnalytics> =>
    pipe(
      this.fetchAnalytics(),
      TE.chain(analytics => this.validateAnalytics(analytics)),
      TE.map(analytics => this.enrichAnalytics(analytics))
    );

  /**
   * Get protocol statistics
   */
  public getProtocolStats = (): TE.TaskEither<SymphonyError, ProtocolStats> =>
    pipe(
      this.fetchProtocolStats(),
      TE.chain(stats => this.validateProtocolStats(stats)),
      TE.map(stats => this.enrichProtocolStats(stats))
    );

  /**
   * Monitor swap execution
   */
  public monitorSwap = (txHash: string): TE.TaskEither<SymphonyError, SwapMonitoring> =>
    pipe(
      this.fetchTransactionStatus(txHash),
      TE.chain(status => this.trackConfirmations(status)),
      TE.map(monitoring => this.updateMonitoringStatus(monitoring))
    );

  // Private helper methods

  private generateCacheKey = (type: string, request: any): string => {
    const requestStr = JSON.stringify(request);
    return `${type}_${Buffer.from(requestStr).toString('base64')}`;
  };

  private getCachedQuote = (cacheKey: string): O.Option<SwapQuoteResponse> => {
    const cached = this.quoteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.QUOTE_CACHE_DURATION) {
      return O.some(cached.quote);
    }
    return O.none;
  };

  private getCachedRoutes = (cacheKey: string): O.Option<RouteResponse> => {
    const cached = this.routeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.ROUTE_CACHE_DURATION) {
      return O.some(cached.routes);
    }
    return O.none;
  };

  private cacheQuote = (cacheKey: string, quote: SwapQuoteResponse): void => {
    this.quoteCache.set(cacheKey, { quote, timestamp: Date.now() });
  };

  private cacheRoutes = (cacheKey: string, routes: RouteResponse): void => {
    this.routeCache.set(cacheKey, { routes, timestamp: Date.now() });
  };

  private fetchQuote = (request: SwapQuoteRequest): TE.TaskEither<SymphonyError, SwapQuoteResponse> =>
    TE.tryCatch(
      async () => {
        const response = await fetch(`${SYMPHONY_API.BASE_URL}${SYMPHONY_API.ENDPOINTS.QUOTE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  private fetchRoutes = (request: RouteRequest): TE.TaskEither<SymphonyError, RouteResponse> =>
    TE.tryCatch(
      async () => {
        const response = await fetch(`${SYMPHONY_API.BASE_URL}${SYMPHONY_API.ENDPOINTS.ROUTES}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  private fetchGasEstimate = (request: GasEstimateRequest): TE.TaskEither<SymphonyError, GasEstimateResponse> =>
    TE.tryCatch(
      async () => {
        const response = await fetch(`${SYMPHONY_API.BASE_URL}${SYMPHONY_API.ENDPOINTS.GAS_ESTIMATE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      (error) => ({ type: 'gas_estimation_failed', reason: String(error) }) as SymphonyError
    );

  private fetchAnalytics = (): TE.TaskEither<SymphonyError, SwapAnalytics> =>
    TE.tryCatch(
      async () => {
        const response = await fetch(`${SYMPHONY_API.BASE_URL}${SYMPHONY_API.ENDPOINTS.ANALYTICS}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  private fetchProtocolStats = (): TE.TaskEither<SymphonyError, ProtocolStats> =>
    TE.tryCatch(
      async () => {
        const response = await fetch(`${SYMPHONY_API.BASE_URL}${SYMPHONY_API.ENDPOINTS.PROTOCOLS}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  private fetchTransactionStatus = (txHash: string): TE.TaskEither<SymphonyError, SwapMonitoring> =>
    TE.tryCatch(
      async () => {
        const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        
        return {
          transactionId: txHash,
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          confirmations: Number(receipt.blockNumber),
          expectedConfirmations: 1,
          estimatedTime: 0,
          actualTime: Date.now(),
        };
      },
      (error) => ({ type: 'network_error', message: String(error) }) as SymphonyError
    );

  private validateSwapRequest = (request: SwapExecuteRequest): SymphonyResult<SwapExecuteRequest> => {
    const errors: string[] = [];

    if (!request.tokenIn || !request.tokenOut) {
      errors.push('Token addresses are required');
    }

    if (!request.amountIn || request.amountIn === '0') {
      errors.push('Amount in must be greater than 0');
    }

    if (!request.recipient) {
      errors.push('Recipient address is required');
    }

    if (request.slippagePercent < 0 || request.slippagePercent > 50) {
      errors.push('Slippage must be between 0 and 50%');
    }

    if (errors.length > 0) {
      return E.left({ type: 'validation_failed', errors });
    }

    return E.right(request);
  };

  private validateGasEstimateRequest = (request: GasEstimateRequest): SymphonyResult<GasEstimateRequest> => {
    const errors: string[] = [];

    if (!request.tokenIn || !request.tokenOut) {
      errors.push('Token addresses are required');
    }

    if (!request.amountIn || request.amountIn === '0') {
      errors.push('Amount in must be greater than 0');
    }

    if (!request.routeId) {
      errors.push('Route ID is required');
    }

    if (errors.length > 0) {
      return E.left({ type: 'validation_failed', errors });
    }

    return E.right(request);
  };

  private validateQuote = (quote: SwapQuoteResponse): TE.TaskEither<SymphonyError, SwapQuoteResponse> => {
    if (quote.validUntil < Date.now()) {
      return TE.left({ type: 'quote_expired', quoteId: quote.route.id, expiredAt: quote.validUntil });
    }

    if (!quote.route.outputAmount || quote.route.outputAmount === '0') {
      return TE.left({ type: 'insufficient_liquidity', pair: `${quote.route.inputToken.symbol}/${quote.route.outputToken.symbol}`, requested: quote.route.inputAmount, available: '0' });
    }

    return TE.right(quote);
  };

  private validateGasEstimate = (estimate: GasEstimateResponse): TE.TaskEither<SymphonyError, GasEstimateResponse> => {
    if (estimate.confidence < 0.5) {
      return TE.left({ type: 'gas_estimation_failed', reason: 'Low confidence gas estimate' });
    }

    return TE.right(estimate);
  };

  private estimateGasForSwap = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, GasEstimateResponse> =>
    this.estimateGas({
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      routeId: request.routeId,
      recipient: request.recipient,
    });

  private buildSwapTransaction = (request: SwapExecuteRequest, gasEstimate: GasEstimateResponse): TransactionPreparation => {
    const data = encodeFunctionData({
      abi: SYMPHONY_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        request.tokenIn as Address,
        request.tokenOut as Address,
        BigInt(request.amountIn),
        BigInt(request.amountOutMinimum),
        request.recipient as Address,
        request.deadline,
      ],
    });

    const riskLevel = this.calculateRiskLevel(request);

    return {
      transaction: {
        to: SYMPHONY_ADDRESSES.ROUTER,
        data,
        value: request.tokenIn === SYMPHONY_TOKENS.SEI.address ? BigInt(request.amountIn) : undefined,
        gasLimit: BigInt(gasEstimate.gasLimit),
      },
      metadata: {
        type: 'swap',
        protocol: 'Symphony',
        tokenIn: SYMPHONY_TOKENS.SEI, // This would be resolved from token address
        tokenOut: SYMPHONY_TOKENS.USDC, // This would be resolved from token address
        amountIn: request.amountIn,
        amountOut: request.amountOutMinimum,
        description: `Swap ${request.amountIn} tokens for at least ${request.amountOutMinimum} tokens`,
        riskLevel,
      },
    };
  };

  private calculateRiskLevel = (request: SwapExecuteRequest): 'low' | 'medium' | 'high' => {
    // Simple risk calculation based on slippage
    if (request.slippagePercent > SLIPPAGE_LEVELS.HIGH) {
      return 'high';
    } else if (request.slippagePercent > SLIPPAGE_LEVELS.MEDIUM) {
      return 'medium';
    }
    return 'low';
  };

  private validateTokenLiquidity = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, void> =>
    TE.tryCatch(
      async () => {
        // Validate that sufficient liquidity exists for the swap
        // This would involve checking pool reserves
        return;
      },
      (error) => ({ type: 'insufficient_liquidity', pair: `${request.tokenIn}/${request.tokenOut}`, requested: request.amountIn, available: '0' }) as SymphonyError
    );

  private validateSlippageSettings = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, void> => {
    if (request.slippagePercent > SLIPPAGE_LEVELS.VERY_HIGH) {
      return TE.left({ type: 'slippage_exceeded', expected: '0', actual: request.slippagePercent.toString(), limit: SLIPPAGE_LEVELS.VERY_HIGH.toString() });
    }
    return TE.right(undefined);
  };

  private validateGasSettings = (request: SwapExecuteRequest): TE.TaskEither<SymphonyError, void> =>
    TE.right(undefined);

  private calculatePriceImpact = (quote: SwapQuoteResponse): TE.TaskEither<SymphonyError, SwapImpactAnalysis> =>
    TE.right({
      priceImpact: quote.route.priceImpact,
      slippageRisk: quote.route.priceImpact < 1 ? 'low' : quote.route.priceImpact < 3 ? 'medium' : 'high',
      liquidityDepth: '1000000', // Would be calculated from pool data
      marketCapImpact: 0,
      recommendation: quote.route.priceImpact < 1 ? 'proceed' : quote.route.priceImpact < 3 ? 'caution' : 'split_order',
    });

  private assessRisk = (impact: SwapImpactAnalysis, request: SwapQuoteRequest): TE.TaskEither<SymphonyError, SwapImpactAnalysis> =>
    TE.right(impact);

  private generateRecommendations = (analysis: SwapImpactAnalysis): SwapImpactAnalysis =>
    analysis;

  private optimizeRoutes = (routes: RouteResponse, request: RouteRequest): TE.TaskEither<SymphonyError, RouteResponse> =>
    TE.right(routes);

  private analyzeRoutes = (routes: RouteResponse, params: RouteOptimizationParams): TE.TaskEither<SymphonyError, OptimalRouteAnalysis> =>
    TE.right({
      optimalRoute: routes.bestRoute,
      alternativeRoutes: routes.routes,
      riskScore: 0.5,
      efficiencyScore: 0.8,
      costAnalysis: {
        gasCost: routes.bestRoute.fees.gasFee,
        protocolFees: routes.bestRoute.fees.protocolFee,
        priceImpact: routes.bestRoute.priceImpact.toString(),
        totalCost: routes.bestRoute.fees.totalFee,
      },
    });

  private scoreRoutes = (analysis: OptimalRouteAnalysis, params: RouteOptimizationParams): TE.TaskEither<SymphonyError, OptimalRouteAnalysis> =>
    TE.right(analysis);

  private selectOptimalRoute = (analysis: OptimalRouteAnalysis, params: RouteOptimizationParams): OptimalRouteAnalysis =>
    analysis;

  private fetchCrossProtocolRoutes = (request: RouteRequest): TE.TaskEither<SymphonyError, CrossProtocolRoute[]> =>
    TE.right([]);

  private validateCrossProtocolRoutes = (routes: CrossProtocolRoute[]): TE.TaskEither<SymphonyError, CrossProtocolRoute[]> =>
    TE.right(routes);

  private rankCrossProtocolRoutes = (routes: CrossProtocolRoute[]): CrossProtocolRoute[] =>
    routes;

  private validateAnalytics = (analytics: SwapAnalytics): TE.TaskEither<SymphonyError, SwapAnalytics> =>
    TE.right(analytics);

  private enrichAnalytics = (analytics: SwapAnalytics): SwapAnalytics =>
    analytics;

  private validateProtocolStats = (stats: ProtocolStats): TE.TaskEither<SymphonyError, ProtocolStats> =>
    TE.right(stats);

  private enrichProtocolStats = (stats: ProtocolStats): ProtocolStats =>
    stats;

  private trackConfirmations = (status: SwapMonitoring): TE.TaskEither<SymphonyError, SwapMonitoring> =>
    TE.right(status);

  private updateMonitoringStatus = (monitoring: SwapMonitoring): SwapMonitoring =>
    monitoring;
}

/**
 * Factory function for creating SymphonyProtocolWrapperFrontend instance
 */
export const createSymphonyProtocolWrapperFrontend = (
  config: SymphonyConfig,
  integrationConfig: SymphonyIntegrationConfig,
  publicClient: PublicClient
): SymphonyProtocolWrapperFrontend => {
  return new SymphonyProtocolWrapperFrontend(config, integrationConfig, publicClient);
};

/**
 * Default Symphony configuration
 */
export const defaultSymphonyConfig: SymphonyConfig = {
  apiUrl: SYMPHONY_API.BASE_URL,
  contractAddress: SYMPHONY_ADDRESSES.ROUTER,
  maxSlippagePercent: SLIPPAGE_LEVELS.MEDIUM,
  gasLimitMultiplier: 1.2,
  timeout: SYMPHONY_API.TIMEOUT,
};

/**
 * Default integration configuration
 */
export const defaultSymphonyIntegrationConfig: SymphonyIntegrationConfig = {
  enableAnalytics: true,
  enableRouteOptimization: true,
  enableRiskAnalysis: true,
  enableMonitoring: true,
  cacheConfig: {
    enableQuoteCache: true,
    quoteCacheDuration: CACHE_CONFIG.QUOTE_CACHE_DURATION,
    enableRouteCache: true,
    routeCacheDuration: CACHE_CONFIG.ROUTE_CACHE_DURATION,
  },
};