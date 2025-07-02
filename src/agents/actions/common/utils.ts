import { formatUnits as ethersFormatUnits, parseUnits as ethersParseUnits } from "ethers";

export function formatUnits(value: bigint | string, decimals: number = 18): string {
  return ethersFormatUnits(value, decimals);
}

export function parseUnits(value: string, decimals: number = 18): bigint {
  return ethersParseUnits(value, decimals);
}

export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // Calculate price before swap
  const priceBefore = Number(reserveOut) / Number(reserveIn);
  
  // Calculate price after swap
  const newReserveIn = Number(reserveIn) + Number(amountIn);
  const newReserveOut = Number(reserveOut) - Number(amountOut);
  const priceAfter = newReserveOut / newReserveIn;
  
  // Calculate impact
  const impact = Math.abs(priceAfter - priceBefore) / priceBefore * 100;
  
  return impact;
}

export function calculateSlippage(
  expectedAmount: bigint,
  actualAmount: bigint
): number {
  const expected = Number(expectedAmount);
  const actual = Number(actualAmount);
  
  return Math.abs(expected - actual) / expected * 100;
}

export function calculateAPY(apr: number, compoundingPeriodsPerYear: number = 365): number {
  return (Math.pow(1 + apr / compoundingPeriodsPerYear, compoundingPeriodsPerYear) - 1) * 100;
}

export function calculateHealthFactor(
  totalCollateralUSD: number,
  totalDebtUSD: number,
  liquidationThreshold: number
): number {
  if (totalDebtUSD === 0) return 999; // Max health factor
  
  return (totalCollateralUSD * liquidationThreshold) / totalDebtUSD;
}

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  displayDecimals: number = 4
): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  
  return num.toFixed(displayDecimals).replace(/\.?0+$/, "");
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateLiquidityValue(
  lpTokens: bigint,
  totalSupply: bigint,
  reserve0: bigint,
  reserve1: bigint
): { amount0: bigint; amount1: bigint } {
  const share = lpTokens * BigInt(1e18) / totalSupply;
  
  return {
    amount0: (reserve0 * share) / BigInt(1e18),
    amount1: (reserve1 * share) / BigInt(1e18)
  };
}

export function calculateImpermanentLoss(
  initialPrice: number,
  currentPrice: number
): number {
  const priceRatio = currentPrice / initialPrice;
  const impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
  
  return Math.abs(impermanentLoss) * 100;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function shortenAddress(address: string): string {
  if (!isValidAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function calculateGasPrice(
  baseFee: bigint,
  priorityFee: bigint = BigInt(2e9) // 2 gwei default
): bigint {
  return baseFee + priorityFee;
}

export function estimateTransactionTime(
  gasPrice: bigint,
  averageBlockTime: number = 13 // seconds
): number {
  // Higher gas price = faster inclusion
  const gwei = Number(gasPrice) / 1e9;
  
  if (gwei > 100) return averageBlockTime; // Next block
  if (gwei > 50) return averageBlockTime * 2; // 2 blocks
  if (gwei > 20) return averageBlockTime * 5; // 5 blocks
  
  return averageBlockTime * 10; // 10 blocks
}