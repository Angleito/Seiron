/**
 * @fileoverview Yei Finance protocol constants and contract addresses
 * Network: Sei Mainnet Pacific-1
 */

import type { LendingProtocolConfig, LendingAsset } from './types';

/**
 * Yei Finance contract addresses on Sei Network
 * Note: These are placeholder addresses - replace with actual deployed addresses
 */
export const YEI_FINANCE_ADDRESSES = {
  // Core protocol contracts
  POOL_ADDRESS_PROVIDER: 'sei1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  POOL: 'sei1pool0000000000000000000000000000000000000',
  POOL_DATA_PROVIDER: 'sei1dataprovider00000000000000000000000000000',
  POOL_CONFIGURATOR: 'sei1configurator000000000000000000000000000000',
  
  // Oracle contracts
  PRICE_ORACLE: 'sei1oracle00000000000000000000000000000000000',
  AAVE_ORACLE: 'sei1aaveoracle0000000000000000000000000000000',
  
  // Incentives
  INCENTIVES_CONTROLLER: 'sei1incentives0000000000000000000000000000000',
  
  // Treasury
  COLLECTOR: 'sei1collector000000000000000000000000000000000',
  
  // UI helpers
  UI_POOL_DATA_PROVIDER: 'sei1uidataprovider000000000000000000000000000',
  WETH_GATEWAY: 'sei1wethgateway000000000000000000000000000000',
} as const;

/**
 * Supported assets on Yei Finance
 * Note: These are example configurations - replace with actual deployed token addresses
 */
export const YEI_SUPPORTED_ASSETS: ReadonlyArray<LendingAsset> = [
  {
    symbol: 'SEI',
    address: 'sei1native0000000000000000000000000000000000',
    decimals: 6,
    aTokenAddress: 'sei1asei000000000000000000000000000000000000',
    stableDebtTokenAddress: 'sei1ssei000000000000000000000000000000000000',
    variableDebtTokenAddress: 'sei1vsei000000000000000000000000000000000000',
    interestRateStrategyAddress: 'sei1irsei00000000000000000000000000000000000',
    oracle: 'sei1oraclesei0000000000000000000000000000000',
  },
  {
    symbol: 'USDC',
    address: 'sei1usdc000000000000000000000000000000000000',
    decimals: 6,
    aTokenAddress: 'sei1ausdc00000000000000000000000000000000000',
    stableDebtTokenAddress: 'sei1susdc00000000000000000000000000000000000',
    variableDebtTokenAddress: 'sei1vusdc00000000000000000000000000000000000',
    interestRateStrategyAddress: 'sei1irusdc0000000000000000000000000000000000',
    oracle: 'sei1oracleusdc000000000000000000000000000000',
  },
  {
    symbol: 'USDT',
    address: 'sei1usdt000000000000000000000000000000000000',
    decimals: 6,
    aTokenAddress: 'sei1ausdt00000000000000000000000000000000000',
    stableDebtTokenAddress: 'sei1susdt00000000000000000000000000000000000',
    variableDebtTokenAddress: 'sei1vusdt00000000000000000000000000000000000',
    interestRateStrategyAddress: 'sei1irusdt0000000000000000000000000000000000',
    oracle: 'sei1oracleusdt000000000000000000000000000000',
  },
  {
    symbol: 'WETH',
    address: 'sei1weth000000000000000000000000000000000000',
    decimals: 18,
    aTokenAddress: 'sei1aweth00000000000000000000000000000000000',
    stableDebtTokenAddress: 'sei1sweth00000000000000000000000000000000000',
    variableDebtTokenAddress: 'sei1vweth00000000000000000000000000000000000',
    interestRateStrategyAddress: 'sei1irweth0000000000000000000000000000000000',
    oracle: 'sei1oracleweth000000000000000000000000000000',
  },
  {
    symbol: 'WBTC',
    address: 'sei1wbtc000000000000000000000000000000000000',
    decimals: 8,
    aTokenAddress: 'sei1awbtc00000000000000000000000000000000000',
    stableDebtTokenAddress: 'sei1swbtc00000000000000000000000000000000000',
    variableDebtTokenAddress: 'sei1vwbtc00000000000000000000000000000000000',
    interestRateStrategyAddress: 'sei1irwbtc0000000000000000000000000000000000',
    oracle: 'sei1oraclewbtc000000000000000000000000000000',
  },
] as const;

/**
 * Asset mapping for quick lookups
 */
export const ASSET_BY_SYMBOL = YEI_SUPPORTED_ASSETS.reduce(
  (acc, asset) => ({ ...acc, [asset.symbol]: asset }),
  {} as Record<string, LendingAsset>
);

export const ASSET_BY_ADDRESS = YEI_SUPPORTED_ASSETS.reduce(
  (acc, asset) => ({ ...acc, [asset.address.toLowerCase()]: asset }),
  {} as Record<string, LendingAsset>
);

/**
 * Protocol configuration
 */
export const YEI_PROTOCOL_CONFIG: LendingProtocolConfig = {
  name: 'Yei Finance',
  version: '3.0.0', // Aave V3 fork
  chainId: 1329, // Sei mainnet chain ID
  poolAddressProvider: YEI_FINANCE_ADDRESSES.POOL_ADDRESS_PROVIDER,
  pool: YEI_FINANCE_ADDRESSES.POOL,
  poolDataProvider: YEI_FINANCE_ADDRESSES.POOL_DATA_PROVIDER,
  priceOracle: YEI_FINANCE_ADDRESSES.PRICE_ORACLE,
  aaveOracle: YEI_FINANCE_ADDRESSES.AAVE_ORACLE,
  incentivesController: YEI_FINANCE_ADDRESSES.INCENTIVES_CONTROLLER,
  collector: YEI_FINANCE_ADDRESSES.COLLECTOR,
};

/**
 * Protocol parameters
 */
export const PROTOCOL_PARAMETERS = {
  // Liquidation parameters
  LIQUIDATION_CLOSE_FACTOR_PERCENT: BigInt(5000), // 50%
  LIQUIDATION_PROTOCOL_FEE_PERCENT: BigInt(1000), // 10%
  
  // Health factor thresholds
  HEALTH_FACTOR_LIQUIDATION_THRESHOLD: BigInt('1000000000000000000'), // 1e18
  
  // Fee parameters
  FLASHLOAN_PREMIUM_TOTAL: BigInt(9), // 0.09%
  FLASHLOAN_PREMIUM_TO_PROTOCOL: BigInt(0), // 0%
  
  // Interest rate parameters
  OPTIMAL_UTILIZATION_RATE: BigInt('800000000000000000000000000'), // 80% in ray
  BASE_VARIABLE_BORROW_RATE: BigInt('0'), // 0%
  VARIABLE_RATE_SLOPE1: BigInt('40000000000000000000000000'), // 4% in ray
  VARIABLE_RATE_SLOPE2: BigInt('600000000000000000000000000'), // 60% in ray
  STABLE_RATE_SLOPE1: BigInt('5000000000000000000000000'), // 0.5% in ray
  STABLE_RATE_SLOPE2: BigInt('600000000000000000000000000'), // 60% in ray
  
  // Misc parameters
  MAX_NUMBER_RESERVES: 128,
  REVISION: 1,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INSUFFICIENT_COLLATERAL: 'Insufficient collateral to borrow requested amount',
  HEALTH_FACTOR_TOO_LOW: 'Health factor would be below liquidation threshold',
  ASSET_NOT_SUPPORTED: 'Asset is not supported by the protocol',
  INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity in the reserve',
  INVALID_AMOUNT: 'Invalid amount specified',
  MARKET_FROZEN: 'Market is currently frozen',
  BORROWING_DISABLED: 'Borrowing is disabled for this asset',
  NO_DEBT_TO_REPAY: 'User has no debt to repay',
  INVALID_INTEREST_RATE_MODE: 'Invalid interest rate mode selected',
} as const;

/**
 * ABI fragments for key functions (simplified)
 * In production, use full ABIs from deployed contracts
 */
export const POOL_ABI_FRAGMENTS = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
] as const;

export const DATA_PROVIDER_ABI_FRAGMENTS = [
  'function getReserveData(address asset) view returns (tuple(uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp))',
  'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
  'function getReservesList() view returns (address[])',
] as const;