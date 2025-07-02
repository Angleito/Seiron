import { Q96, MIN_TICK, MAX_TICK } from './constants';

/**
 * Convert price to tick
 */
export const priceToTick = (price: number): number => {
  return Math.floor(Math.log(price) / Math.log(1.0001));
};

/**
 * Convert tick to price
 */
export const tickToPrice = (tick: number): number => {
  return Math.pow(1.0001, tick);
};

/**
 * Get tick at sqrt price
 */
export const getTickAtSqrtRatio = (sqrtPriceX96: bigint): number => {
  const price = Number(sqrtPriceX96 * sqrtPriceX96) / Number(Q96 * Q96);
  return priceToTick(price);
};

/**
 * Get sqrt price at tick
 */
export const getSqrtRatioAtTick = (tick: number): bigint => {
  const price = tickToPrice(tick);
  const sqrtPrice = Math.sqrt(price);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
};

/**
 * Calculate token amounts for given liquidity and price range
 */
export const getAmountsForLiquidity = (
  liquidity: bigint,
  sqrtPriceX96: bigint,
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint
): { amount0: bigint; amount1: bigint } => {
  const sqrtRatioA = sqrtPriceAX96 < sqrtPriceBX96 ? sqrtPriceAX96 : sqrtPriceBX96;
  const sqrtRatioB = sqrtPriceAX96 > sqrtPriceBX96 ? sqrtPriceAX96 : sqrtPriceBX96;

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtPriceX96 <= sqrtRatioA) {
    // Current price below range - all token0
    amount0 = liquidity * Q96 / sqrtRatioA - liquidity * Q96 / sqrtRatioB;
  } else if (sqrtPriceX96 < sqrtRatioB) {
    // Current price in range
    amount0 = liquidity * Q96 / sqrtPriceX96 - liquidity * Q96 / sqrtRatioB;
    amount1 = liquidity * (sqrtPriceX96 - sqrtRatioA) / Q96;
  } else {
    // Current price above range - all token1
    amount1 = liquidity * (sqrtRatioB - sqrtRatioA) / Q96;
  }

  return { amount0, amount1 };
};

/**
 * Calculate liquidity for given token amounts and price range
 */
export const getLiquidityForAmounts = (
  sqrtPriceX96: bigint,
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint => {
  const sqrtRatioA = sqrtPriceAX96 < sqrtPriceBX96 ? sqrtPriceAX96 : sqrtPriceBX96;
  const sqrtRatioB = sqrtPriceAX96 > sqrtPriceBX96 ? sqrtPriceAX96 : sqrtPriceBX96;

  if (sqrtPriceX96 <= sqrtRatioA) {
    return amount0 * sqrtRatioA * sqrtRatioB / Q96 / (sqrtRatioB - sqrtRatioA);
  } else if (sqrtPriceX96 < sqrtRatioB) {
    const liquidity0 = amount0 * sqrtPriceX96 * sqrtRatioB / Q96 / (sqrtRatioB - sqrtPriceX96);
    const liquidity1 = amount1 * Q96 / (sqrtPriceX96 - sqrtRatioA);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    return amount1 * Q96 / (sqrtRatioB - sqrtRatioA);
  }
};

/**
 * Validate tick range
 */
export const validateTickRange = (tickLower: number, tickUpper: number, tickSpacing: number): boolean => {
  if (tickLower >= tickUpper) return false;
  if (tickLower < MIN_TICK || tickUpper > MAX_TICK) return false;
  if (tickLower % tickSpacing !== 0 || tickUpper % tickSpacing !== 0) return false;
  return true;
};

/**
 * Get nearest valid tick
 */
export const getNearestTick = (tick: number, tickSpacing: number): number => {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return Math.max(MIN_TICK, Math.min(MAX_TICK, rounded));
};

/**
 * Calculate position value in USD
 */
export const calculatePositionValueUSD = (
  token0Amount: bigint,
  token1Amount: bigint,
  token0PriceUSD: number,
  token1PriceUSD: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): number => {
  const value0 = Number(token0Amount) / Math.pow(10, token0Decimals) * token0PriceUSD;
  const value1 = Number(token1Amount) / Math.pow(10, token1Decimals) * token1PriceUSD;
  return value0 + value1;
};

/**
 * Calculate impermanent loss
 */
export const calculateImpermanentLoss = (
  initialPrice: number,
  currentPrice: number
): number => {
  const priceRatio = currentPrice / initialPrice;
  const hodlValue = 0.5 + 0.5 * priceRatio;
  const lpValue = Math.sqrt(priceRatio);
  return (lpValue - hodlValue) / hodlValue;
};

/**
 * Estimate gas for liquidity operations
 */
export const estimateGas = (operation: 'add' | 'remove' | 'collect'): number => {
  switch (operation) {
    case 'add': return 300000;
    case 'remove': return 250000;
    case 'collect': return 150000;
    default: return 200000;
  }
};

/**
 * Format position for display
 */
export const formatPosition = (
  position: any,
  token0Symbol: string,
  token1Symbol: string
): string => {
  const { liquidity, tickLower, tickUpper } = position;
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);
  
  return `${token0Symbol}/${token1Symbol} Range: ${priceLower.toFixed(4)} - ${priceUpper.toFixed(4)}`;
};