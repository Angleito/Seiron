import { Either } from 'fp-ts/Either';

// Core position types
export interface LiquidityPosition {
  readonly positionId: string;
  readonly token0: string;
  readonly token1: string;
  readonly liquidity: bigint;
  readonly tickLower: number;
  readonly tickUpper: number;
  readonly feeGrowthInside0LastX128: bigint;
  readonly feeGrowthInside1LastX128: bigint;
  readonly tokensOwed0: bigint;
  readonly tokensOwed1: bigint;
  readonly currentPrice: number;
  readonly inRange: boolean;
}

export interface PoolInfo {
  readonly token0: string;
  readonly token1: string;
  readonly fee: number;
  readonly tickSpacing: number;
  readonly sqrtPriceX96: bigint;
  readonly tick: number;
  readonly liquidity: bigint;
  readonly feeGrowthGlobal0X128: bigint;
  readonly feeGrowthGlobal1X128: bigint;
  readonly protocolFees: readonly [bigint, bigint];
}

export interface LiquidityParams {
  readonly token0: string;
  readonly token1: string;
  readonly fee: number;
  readonly tickLower: number;
  readonly tickUpper: number;
  readonly amount0Desired: bigint;
  readonly amount1Desired: bigint;
  readonly amount0Min: bigint;
  readonly amount1Min: bigint;
  readonly deadline: number;
}

export interface RemoveLiquidityParams {
  readonly positionId: string;
  readonly liquidity: bigint;
  readonly amount0Min: bigint;
  readonly amount1Min: bigint;
  readonly deadline: number;
}

export interface CollectFeesParams {
  readonly positionId: string;
  readonly amount0Max: bigint;
  readonly amount1Max: bigint;
}

// Price and tick utilities
export interface PriceRange {
  readonly priceLower: number;
  readonly priceUpper: number;
  readonly tickLower: number;
  readonly tickUpper: number;
}

export interface PositionValue {
  readonly token0Amount: bigint;
  readonly token1Amount: bigint;
  readonly uncollectedFees0: bigint;
  readonly uncollectedFees1: bigint;
  readonly totalValueUSD: number;
}

// Error types
export type LiquidityError = 
  | { type: 'insufficient_liquidity'; pool: string }
  | { type: 'invalid_range'; tickLower: number; tickUpper: number }
  | { type: 'slippage_exceeded'; expected: bigint; actual: bigint }
  | { type: 'position_not_found'; positionId: string }
  | { type: 'pool_not_exists'; token0: string; token1: string }
  | { type: 'insufficient_allowance'; token: string; required: bigint };

export type LiquidityResult<T> = Either<LiquidityError, T>;

// Response types
export interface AddLiquidityResponse {
  readonly positionId: string;
  readonly liquidity: bigint;
  readonly amount0: bigint;
  readonly amount1: bigint;
  readonly txHash: string;
}

export interface RemoveLiquidityResponse {
  readonly amount0: bigint;
  readonly amount1: bigint;
  readonly txHash: string;
}

export interface CollectFeesResponse {
  readonly amount0: bigint;
  readonly amount1: bigint;
  readonly txHash: string;
}