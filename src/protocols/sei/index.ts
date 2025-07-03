/**
 * Symphony Protocol Integration for Sei Network
 * 
 * This module provides comprehensive integration with the Symphony protocol,
 * a token swapping aggregator on the Sei Network. It offers type-safe,
 * functional programming patterns using fp-ts for robust error handling.
 * 
 * @module protocols/sei
 */

// Core types and interfaces
export type {
  SymphonyConfig,
  SymphonyError,
  SymphonyResult,
  SymphonyProtocolConfig,
  SymphonyIntegrationConfig,
  TokenInfo,
  SwapRoute,
  RouteStep,
  SwapFees,
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
  CrossProtocolRoute,
  RouteOptimizationParams,
} from './types';

// Main wrapper class and factory
export {
  SymphonyProtocolWrapper,
  createSymphonyProtocolWrapper,
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
} from './adapters/SymphonyProtocolWrapper';

// Constants and configuration
export {
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
  POPULAR_PAIRS,
  RISK_PARAMETERS,
  CACHE_CONFIG,
  SYMPHONY_ABI_FRAGMENTS,
  SYMPHONY_FEATURES,
} from './constants';

// Utility functions
export {
  validateTokenAddress,
  validateTradeAmount,
  validateSlippage,
  calculateMinimumAmountOut,
  calculateMaximumAmountIn,
  calculatePriceImpact,
  assessRiskLevel,
  generateSwapRecommendation,
  findTokenByAddress,
  findTokenBySymbol,
  formatTokenAmount,
  parseTokenAmount,
  calculateRouteEfficiency,
  rankRoutes,
  calculateRouteScore,
  calculatePriceScore,
  calculateGasScore,
  calculateSpeedScore,
  calculateRiskScore,
  calculateBalancedScore,
  validateCrossProtocolRoute,
  estimateExecutionTime,
  calculateTotalRouteCost,
  generateRouteSummary,
  isSymphonyError,
  formatSymphonyError,
} from './utils';

/**
 * Symphony Protocol Integration Guide
 * 
 * ## Basic Usage
 * 
 * ```typescript
 * import { createSymphonyProtocolWrapper, defaultSymphonyConfig } from './protocols/sei';
 * 
 * const wrapper = createSymphonyProtocolWrapper(
 *   defaultSymphonyConfig,
 *   defaultSymphonyIntegrationConfig,
 *   publicClient,
 *   walletClient
 * );
 * 
 * // Get a quote
 * const quoteResult = await wrapper.getQuote({
 *   tokenIn: 'SEI_ADDRESS',
 *   tokenOut: 'USDC_ADDRESS',
 *   amountIn: '1000000000000000000', // 1 SEI
 *   slippagePercent: 1.0
 * })();
 * 
 * // Execute swap
 * if (E.isRight(quoteResult)) {
 *   const executeResult = await wrapper.executeSwap({
 *     tokenIn: 'SEI_ADDRESS',
 *     tokenOut: 'USDC_ADDRESS',
 *     amountIn: '1000000000000000000',
 *     amountOutMinimum: quoteResult.right.slippageAdjustedAmountOut,
 *     recipient: 'RECIPIENT_ADDRESS',
 *     deadline: Math.floor(Date.now() / 1000) + 300,
 *     routeId: quoteResult.right.route.id,
 *     slippagePercent: 1.0
 *   })();
 * }
 * ```
 * 
 * ## Advanced Features
 * 
 * ```typescript
 * // Route optimization
 * const routeAnalysis = await wrapper.findOptimalRoute(
 *   {
 *     tokenIn: 'SEI_ADDRESS',
 *     tokenOut: 'USDC_ADDRESS',
 *     amountIn: '1000000000000000000'
 *   },
 *   {
 *     optimizeFor: 'price',
 *     maxHops: 3,
 *     riskTolerance: 'medium'
 *   }
 * )();
 * 
 * // Impact analysis
 * const impactAnalysis = await wrapper.analyzeSwapImpact({
 *   tokenIn: 'SEI_ADDRESS',
 *   tokenOut: 'USDC_ADDRESS',
 *   amountIn: '1000000000000000000',
 *   slippagePercent: 1.0
 * })();
 * 
 * // Cross-protocol routes
 * const crossProtocolRoutes = await wrapper.getCrossProtocolRoutes({
 *   tokenIn: 'SEI_ADDRESS',
 *   tokenOut: 'USDC_ADDRESS',
 *   amountIn: '1000000000000000000'
 * })();
 * ```
 * 
 * ## Error Handling
 * 
 * All operations return `TaskEither<SymphonyError, T>` for robust error handling:
 * 
 * ```typescript
 * import { pipe } from 'fp-ts/function';
 * import * as E from 'fp-ts/Either';
 * import * as TE from 'fp-ts/TaskEither';
 * 
 * const handleSwap = pipe(
 *   wrapper.getQuote(quoteRequest),
 *   TE.chain(quote => wrapper.executeSwap(executeRequest)),
 *   TE.fold(
 *     error => TE.of(console.error('Swap failed:', formatSymphonyError(error))),
 *     result => TE.of(console.log('Swap successful:', result.txHash))
 *   )
 * );
 * ```
 * 
 * ## Integration with Existing System
 * 
 * The Symphony wrapper is designed to integrate seamlessly with the existing
 * DragonSwapAdapter and LiquidityManager:
 * 
 * ```typescript
 * // In your LiquidityManager
 * import { SymphonyProtocolWrapper } from './protocols/sei';
 * 
 * class EnhancedLiquidityManager {
 *   constructor(
 *     private dragonSwapAdapter: DragonSwapAdapter,
 *     private symphonyWrapper: SymphonyProtocolWrapper
 *   ) {}
 * 
 *   async getOptimalSwapRoute(tokenA: string, tokenB: string, amount: string) {
 *     // Compare routes from both DragonSwap and Symphony
 *     const [dragonRoutes, symphonyRoutes] = await Promise.all([
 *       this.dragonSwapAdapter.getQuote(...),
 *       this.symphonyWrapper.getRoutes(...)()
 *     ]);
 * 
 *     // Select the best route based on your criteria
 *     return this.selectBestRoute(dragonRoutes, symphonyRoutes);
 *   }
 * }
 * ```
 */

/**
 * Re-export commonly used fp-ts utilities for convenience
 */
export { pipe } from 'fp-ts/function';
export * as E from 'fp-ts/Either';
export * as TE from 'fp-ts/TaskEither';
export * as O from 'fp-ts/Option';