import { Either } from 'fp-ts/Either';
export interface SymphonyConfig {
    readonly apiUrl: string;
    readonly contractAddress: string;
    readonly maxSlippagePercent: number;
    readonly gasLimitMultiplier: number;
    readonly timeout: number;
}
export interface TokenInfo {
    readonly address: string;
    readonly symbol: string;
    readonly name: string;
    readonly decimals: number;
    readonly logoURI?: string;
    readonly verified: boolean;
}
export interface SwapRoute {
    readonly id: string;
    readonly inputToken: TokenInfo;
    readonly outputToken: TokenInfo;
    readonly inputAmount: string;
    readonly outputAmount: string;
    readonly priceImpact: number;
    readonly executionPrice: string;
    readonly midPrice: string;
    readonly minimumAmountOut: string;
    readonly maximumAmountIn: string;
    readonly routes: RouteStep[];
    readonly gasEstimate: string;
    readonly fees: SwapFees;
}
export interface RouteStep {
    readonly protocol: string;
    readonly poolAddress: string;
    readonly tokenIn: TokenInfo;
    readonly tokenOut: TokenInfo;
    readonly amountIn: string;
    readonly amountOut: string;
    readonly fee: number;
    readonly sqrtPriceX96After?: string;
}
export interface SwapFees {
    readonly protocolFee: string;
    readonly gasFee: string;
    readonly liquidityProviderFee: string;
    readonly totalFee: string;
}
export interface SwapQuoteRequest {
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly amountIn: string;
    readonly slippagePercent: number;
    readonly recipient?: string;
    readonly deadline?: number;
}
export interface SwapExecuteRequest {
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly amountIn: string;
    readonly amountOutMinimum: string;
    readonly recipient: string;
    readonly deadline: number;
    readonly routeId: string;
    readonly slippagePercent: number;
}
export interface RouteRequest {
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly amountIn: string;
    readonly maxRoutes?: number;
    readonly excludeProtocols?: string[];
    readonly includeProtocols?: string[];
}
export interface GasEstimateRequest {
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly amountIn: string;
    readonly routeId: string;
    readonly recipient: string;
}
export interface SwapQuoteResponse {
    readonly route: SwapRoute;
    readonly timestamp: number;
    readonly validUntil: number;
    readonly slippageAdjustedAmountOut: string;
}
export interface SwapExecuteResponse {
    readonly txHash: string;
    readonly route: SwapRoute;
    readonly actualAmountIn: string;
    readonly actualAmountOut: string;
    readonly gasUsed: string;
    readonly effectiveGasPrice: string;
    readonly timestamp: number;
}
export interface RouteResponse {
    readonly routes: SwapRoute[];
    readonly bestRoute: SwapRoute;
    readonly timestamp: number;
}
export interface GasEstimateResponse {
    readonly gasLimit: string;
    readonly gasPrice: string;
    readonly estimatedCost: string;
    readonly confidence: number;
}
export interface SwapValidationResponse {
    readonly valid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly suggestions: string[];
}
export interface SwapAnalytics {
    readonly volume24h: string;
    readonly fees24h: string;
    readonly transactionCount24h: number;
    readonly uniqueUsers24h: number;
    readonly averageSlippage: number;
    readonly topPairs: Array<{
        readonly pair: string;
        readonly volume: string;
        readonly fees: string;
    }>;
}
export interface ProtocolStats {
    readonly totalValueLocked: string;
    readonly volume24h: string;
    readonly fees24h: string;
    readonly activeRoutes: number;
    readonly supportedTokens: number;
}
export type SymphonyError = {
    type: 'network_error';
    message: string;
    code?: number;
} | {
    type: 'invalid_token';
    token: string;
    reason: string;
} | {
    type: 'insufficient_liquidity';
    pair: string;
    requested: string;
    available: string;
} | {
    type: 'slippage_exceeded';
    expected: string;
    actual: string;
    limit: string;
} | {
    type: 'route_not_found';
    tokenIn: string;
    tokenOut: string;
    amount: string;
} | {
    type: 'quote_expired';
    quoteId: string;
    expiredAt: number;
} | {
    type: 'gas_estimation_failed';
    reason: string;
} | {
    type: 'validation_failed';
    errors: string[];
} | {
    type: 'execution_failed';
    txHash?: string;
    reason: string;
} | {
    type: 'timeout';
    operation: string;
    duration: number;
} | {
    type: 'rate_limit_exceeded';
    resetTime: number;
} | {
    type: 'protocol_unavailable';
    protocol: string;
    reason: string;
};
export type SymphonyResult<T> = Either<SymphonyError, T>;
export interface SymphonyProtocolConfig extends SymphonyConfig {
    readonly supportedTokens: TokenInfo[];
    readonly supportedProtocols: string[];
    readonly feeTiers: number[];
    readonly minTradeAmount: string;
    readonly maxTradeAmount: string;
}
export interface SwapImpactAnalysis {
    readonly priceImpact: number;
    readonly slippageRisk: 'low' | 'medium' | 'high';
    readonly liquidityDepth: string;
    readonly marketCapImpact: number;
    readonly recommendation: 'proceed' | 'caution' | 'split_order';
}
export interface OptimalRouteAnalysis {
    readonly optimalRoute: SwapRoute;
    readonly alternativeRoutes: SwapRoute[];
    readonly riskScore: number;
    readonly efficiencyScore: number;
    readonly costAnalysis: {
        readonly gasCost: string;
        readonly protocolFees: string;
        readonly priceImpact: string;
        readonly totalCost: string;
    };
}
export interface SwapMonitoring {
    readonly transactionId: string;
    readonly status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
    readonly confirmations: number;
    readonly expectedConfirmations: number;
    readonly estimatedTime: number;
    readonly actualTime?: number;
}
export interface SymphonyIntegrationConfig {
    readonly enableAnalytics: boolean;
    readonly enableRouteOptimization: boolean;
    readonly enableRiskAnalysis: boolean;
    readonly enableMonitoring: boolean;
    readonly cacheConfig: {
        readonly enableQuoteCache: boolean;
        readonly quoteCacheDuration: number;
        readonly enableRouteCache: boolean;
        readonly routeCacheDuration: number;
    };
}
export interface CrossProtocolRoute {
    readonly protocols: string[];
    readonly steps: RouteStep[];
    readonly totalGasEstimate: string;
    readonly totalFees: string;
    readonly executionRisk: number;
    readonly estimatedDuration: number;
}
export interface RouteOptimizationParams {
    readonly optimizeFor: 'price' | 'gas' | 'speed' | 'risk';
    readonly maxHops: number;
    readonly excludeProtocols?: string[];
    readonly prioritizeProtocols?: string[];
    readonly riskTolerance: 'low' | 'medium' | 'high';
}
//# sourceMappingURL=types.d.ts.map