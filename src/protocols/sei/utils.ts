import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { 
  SymphonyError, 
  SymphonyResult, 
  TokenInfo, 
  SwapRoute, 
  SwapImpactAnalysis,
  RouteOptimizationParams,
  CrossProtocolRoute,
} from './types';
import { 
  SYMPHONY_TOKENS, 
  SYMPHONY_LIMITS, 
  RISK_PARAMETERS, 
  SLIPPAGE_LEVELS 
} from './constants';

/**
 * Utility functions for Symphony Protocol operations
 */

/**
 * Validate token address format
 */
export const validateTokenAddress = (address: string): SymphonyResult<string> => {
  if (!address || address.length !== 42 || !address.startsWith('0x')) {
    return E.left({ type: 'invalid_token', token: address, reason: 'Invalid address format' });
  }
  return E.right(address);
};

/**
 * Validate trade amount
 */
export const validateTradeAmount = (amount: string): SymphonyResult<string> => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return E.left({ type: 'validation_failed', errors: ['Amount must be greater than 0'] });
  }
  
  if (numAmount < parseFloat(SYMPHONY_LIMITS.MIN_TRADE_AMOUNT)) {
    return E.left({ type: 'validation_failed', errors: [`Amount must be at least ${SYMPHONY_LIMITS.MIN_TRADE_AMOUNT} USD`] });
  }
  
  if (numAmount > parseFloat(SYMPHONY_LIMITS.MAX_TRADE_AMOUNT)) {
    return E.left({ type: 'validation_failed', errors: [`Amount must be less than ${SYMPHONY_LIMITS.MAX_TRADE_AMOUNT} USD`] });
  }
  
  return E.right(amount);
};

/**
 * Validate slippage percentage
 */
export const validateSlippage = (slippage: number): SymphonyResult<number> => {
  if (slippage < 0 || slippage > 50) {
    return E.left({ type: 'validation_failed', errors: ['Slippage must be between 0 and 50%'] });
  }
  return E.right(slippage);
};

/**
 * Calculate minimum amount out based on slippage
 */
export const calculateMinimumAmountOut = (
  expectedAmount: string,
  slippagePercent: number
): string => {
  const expected = parseFloat(expectedAmount);
  const slippageMultiplier = (100 - slippagePercent) / 100;
  const minimum = expected * slippageMultiplier;
  return minimum.toString();
};

/**
 * Calculate maximum amount in based on slippage
 */
export const calculateMaximumAmountIn = (
  expectedAmount: string,
  slippagePercent: number
): string => {
  const expected = parseFloat(expectedAmount);
  const slippageMultiplier = (100 + slippagePercent) / 100;
  const maximum = expected * slippageMultiplier;
  return maximum.toString();
};

/**
 * Calculate price impact percentage
 */
export const calculatePriceImpact = (
  midPrice: string,
  executionPrice: string
): number => {
  const mid = parseFloat(midPrice);
  const execution = parseFloat(executionPrice);
  
  if (mid === 0) return 0;
  
  const impact = Math.abs((execution - mid) / mid) * 100;
  return impact;
};

/**
 * Assess risk level based on swap parameters
 */
export const assessRiskLevel = (
  priceImpact: number,
  slippage: number,
  liquidityDepth: string,
  routeHops: number
): 'low' | 'medium' | 'high' => {
  const lowRisk = RISK_PARAMETERS.LOW_RISK;
  const mediumRisk = RISK_PARAMETERS.MEDIUM_RISK;
  
  if (
    priceImpact <= lowRisk.maxPriceImpact &&
    slippage <= lowRisk.maxSlippage &&
    parseFloat(liquidityDepth) >= parseFloat(lowRisk.minLiquidity) &&
    routeHops <= lowRisk.maxHops
  ) {
    return 'low';
  }
  
  if (
    priceImpact <= mediumRisk.maxPriceImpact &&
    slippage <= mediumRisk.maxSlippage &&
    parseFloat(liquidityDepth) >= parseFloat(mediumRisk.minLiquidity) &&
    routeHops <= mediumRisk.maxHops
  ) {
    return 'medium';
  }
  
  return 'high';
};

/**
 * Generate swap recommendation based on risk analysis
 */
export const generateSwapRecommendation = (
  analysis: SwapImpactAnalysis
): 'proceed' | 'caution' | 'split_order' => {
  if (analysis.slippageRisk === 'low' && analysis.priceImpact < 1) {
    return 'proceed';
  }
  
  if (analysis.slippageRisk === 'medium' && analysis.priceImpact < 3) {
    return 'caution';
  }
  
  return 'split_order';
};

/**
 * Find token info by address
 */
export const findTokenByAddress = (address: string): O.Option<TokenInfo> => {
  const tokens = Object.values(SYMPHONY_TOKENS);
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token ? O.some(token) : O.none;
};

/**
 * Find token info by symbol
 */
export const findTokenBySymbol = (symbol: string): O.Option<TokenInfo> => {
  const tokens = Object.values(SYMPHONY_TOKENS);
  const token = tokens.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
  return token ? O.some(token) : O.none;
};

/**
 * Format token amount for display
 */
export const formatTokenAmount = (
  amount: string,
  decimals: number,
  displayDecimals: number = 6
): string => {
  const amountBN = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const wholePart = amountBN / divisor;
  const fractionalPart = amountBN % divisor;
  
  if (fractionalPart === 0n) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmed = fractionalStr.slice(0, displayDecimals).replace(/0+$/, '');
  
  return trimmed ? `${wholePart}.${trimmed}` : wholePart.toString();
};

/**
 * Parse token amount from string
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number
): string => {
  const [wholePart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const amountBN = BigInt(wholePart + paddedFractional);
  return amountBN.toString();
};

/**
 * Calculate route efficiency score
 */
export const calculateRouteEfficiency = (route: SwapRoute): number => {
  const priceImpactScore = Math.max(0, (5 - route.priceImpact) / 5);
  const gasScore = Math.max(0, (1000000 - parseFloat(route.gasEstimate)) / 1000000);
  const feeScore = Math.max(0, (1000 - parseFloat(route.fees.totalFee)) / 1000);
  const hopScore = Math.max(0, (5 - route.routes.length) / 5);
  
  return (priceImpactScore * 0.4 + gasScore * 0.3 + feeScore * 0.2 + hopScore * 0.1);
};

/**
 * Rank routes by optimization parameters
 */
export const rankRoutes = (
  routes: SwapRoute[],
  params: RouteOptimizationParams
): SwapRoute[] => {
  const scoredRoutes = routes.map(route => ({
    route,
    score: calculateRouteScore(route, params),
  }));
  
  return scoredRoutes
    .sort((a, b) => b.score - a.score)
    .map(item => item.route);
};

/**
 * Calculate route score based on optimization parameters
 */
export const calculateRouteScore = (
  route: SwapRoute,
  params: RouteOptimizationParams
): number => {
  switch (params.optimizeFor) {
    case 'price':
      return calculatePriceScore(route);
    case 'gas':
      return calculateGasScore(route);
    case 'speed':
      return calculateSpeedScore(route);
    case 'risk':
      return calculateRiskScore(route, params.riskTolerance);
    default:
      return calculateBalancedScore(route);
  }
};

/**
 * Calculate price optimization score
 */
export const calculatePriceScore = (route: SwapRoute): number => {
  const outputAmount = parseFloat(route.outputAmount);
  const priceImpact = route.priceImpact;
  const fees = parseFloat(route.fees.totalFee);
  
  // Higher output amount is better, lower price impact is better, lower fees are better
  const outputScore = outputAmount / 1000000; // Normalize
  const impactScore = Math.max(0, (5 - priceImpact) / 5);
  const feeScore = Math.max(0, (1000 - fees) / 1000);
  
  return (outputScore * 0.5 + impactScore * 0.3 + feeScore * 0.2);
};

/**
 * Calculate gas optimization score
 */
export const calculateGasScore = (route: SwapRoute): number => {
  const gasEstimate = parseFloat(route.gasEstimate);
  const gasScore = Math.max(0, (1000000 - gasEstimate) / 1000000);
  const hopScore = Math.max(0, (5 - route.routes.length) / 5);
  
  return (gasScore * 0.7 + hopScore * 0.3);
};

/**
 * Calculate speed optimization score
 */
export const calculateSpeedScore = (route: SwapRoute): number => {
  const hopScore = Math.max(0, (5 - route.routes.length) / 5);
  const gasScore = Math.max(0, (1000000 - parseFloat(route.gasEstimate)) / 1000000);
  
  return (hopScore * 0.6 + gasScore * 0.4);
};

/**
 * Calculate risk optimization score
 */
export const calculateRiskScore = (
  route: SwapRoute,
  riskTolerance: 'low' | 'medium' | 'high'
): number => {
  const priceImpact = route.priceImpact;
  const hops = route.routes.length;
  
  const riskParams = RISK_PARAMETERS[riskTolerance.toUpperCase() as keyof typeof RISK_PARAMETERS];
  
  const impactScore = priceImpact <= riskParams.maxPriceImpact ? 1 : 0;
  const hopScore = hops <= riskParams.maxHops ? 1 : 0;
  
  return (impactScore * 0.6 + hopScore * 0.4);
};

/**
 * Calculate balanced score
 */
export const calculateBalancedScore = (route: SwapRoute): number => {
  const priceScore = calculatePriceScore(route);
  const gasScore = calculateGasScore(route);
  const speedScore = calculateSpeedScore(route);
  const riskScore = calculateRiskScore(route, 'medium');
  
  return (priceScore * 0.3 + gasScore * 0.25 + speedScore * 0.25 + riskScore * 0.2);
};

/**
 * Validate cross-protocol route
 */
export const validateCrossProtocolRoute = (route: CrossProtocolRoute): SymphonyResult<CrossProtocolRoute> => {
  if (route.protocols.length === 0) {
    return E.left({ type: 'validation_failed', errors: ['Route must have at least one protocol'] });
  }
  
  if (route.steps.length === 0) {
    return E.left({ type: 'validation_failed', errors: ['Route must have at least one step'] });
  }
  
  if (route.protocols.length !== route.steps.length) {
    return E.left({ type: 'validation_failed', errors: ['Protocol count must match step count'] });
  }
  
  return E.right(route);
};

/**
 * Estimate execution time for cross-protocol route
 */
export const estimateExecutionTime = (route: CrossProtocolRoute): number => {
  const baseTime = 30; // 30 seconds base
  const protocolTime = route.protocols.length * 15; // 15 seconds per protocol
  const gasTime = Math.min(parseFloat(route.totalGasEstimate) / 50000, 60); // Gas complexity factor
  
  return baseTime + protocolTime + gasTime;
};

/**
 * Calculate total route cost
 */
export const calculateTotalRouteCost = (route: SwapRoute): string => {
  const gasCost = parseFloat(route.fees.gasFee);
  const protocolFee = parseFloat(route.fees.protocolFee);
  const lpFee = parseFloat(route.fees.liquidityProviderFee);
  
  const totalCost = gasCost + protocolFee + lpFee;
  return totalCost.toString();
};

/**
 * Generate route summary
 */
export const generateRouteSummary = (route: SwapRoute): string => {
  const inputSymbol = route.inputToken.symbol;
  const outputSymbol = route.outputToken.symbol;
  const inputAmount = formatTokenAmount(route.inputAmount, route.inputToken.decimals);
  const outputAmount = formatTokenAmount(route.outputAmount, route.outputToken.decimals);
  const priceImpact = route.priceImpact.toFixed(2);
  const hops = route.routes.length;
  
  return `${inputAmount} ${inputSymbol} → ${outputAmount} ${outputSymbol} (${priceImpact}% impact, ${hops} hops)`;
};

/**
 * Error helper functions
 */
export const isSymphonyError = (error: any): error is SymphonyError => {
  return error && typeof error === 'object' && 'type' in error;
};

export const formatSymphonyError = (error: SymphonyError): string => {
  switch (error.type) {
    case 'network_error':
      return `Network error: ${error.message}`;
    case 'invalid_token':
      return `Invalid token ${error.token}: ${error.reason}`;
    case 'insufficient_liquidity':
      return `Insufficient liquidity for ${error.pair}. Requested: ${error.requested}, Available: ${error.available}`;
    case 'slippage_exceeded':
      return `Slippage exceeded. Expected: ${error.expected}, Actual: ${error.actual}, Limit: ${error.limit}`;
    case 'route_not_found':
      return `No route found for ${error.tokenIn} → ${error.tokenOut} (${error.amount})`;
    case 'quote_expired':
      return `Quote ${error.quoteId} expired at ${new Date(error.expiredAt).toISOString()}`;
    case 'gas_estimation_failed':
      return `Gas estimation failed: ${error.reason}`;
    case 'validation_failed':
      return `Validation failed: ${error.errors.join(', ')}`;
    case 'execution_failed':
      return `Execution failed: ${error.reason}${error.txHash ? ` (TX: ${error.txHash})` : ''}`;
    case 'timeout':
      return `Operation ${error.operation} timed out after ${error.duration}ms`;
    case 'rate_limit_exceeded':
      return `Rate limit exceeded. Reset time: ${new Date(error.resetTime).toISOString()}`;
    case 'protocol_unavailable':
      return `Protocol ${error.protocol} unavailable: ${error.reason}`;
    default:
      return 'Unknown Symphony error';
  }
};