/**
 * @fileoverview TypeScript interfaces for lending protocol interactions
 * Following functional programming principles with immutable data structures
 */

import type { 
  Either, 
  Result, 
  Timestamp,
  ReadonlyRecord
} from '../types';

/**
 * Asset configuration for lending markets
 */
export type LendingAsset = {
  readonly symbol: string;
  readonly address: string;
  readonly decimals: number;
  readonly aTokenAddress: string; // Yei Finance receipt token
  readonly stableDebtTokenAddress: string;
  readonly variableDebtTokenAddress: string;
  readonly interestRateStrategyAddress: string;
  readonly oracle: string;
};

/**
 * Reserve data for a lending market
 */
export type ReserveData = {
  readonly asset: LendingAsset;
  readonly liquidityRate: bigint; // Supply APY in ray units (27 decimals)
  readonly variableBorrowRate: bigint; // Borrow APY in ray units
  readonly stableBorrowRate: bigint;
  readonly utilizationRate: bigint; // Utilization rate in ray units
  readonly availableLiquidity: bigint; // Available to borrow
  readonly totalStableDebt: bigint;
  readonly totalVariableDebt: bigint;
  readonly totalSupply: bigint;
  readonly liquidityIndex: bigint;
  readonly variableBorrowIndex: bigint;
  readonly lastUpdateTimestamp: Timestamp;
};

/**
 * User account data across all positions
 */
export type UserAccountData = {
  readonly totalCollateralBase: bigint; // Total collateral in base currency
  readonly totalDebtBase: bigint; // Total debt in base currency
  readonly availableBorrowsBase: bigint; // Available to borrow in base currency
  readonly currentLiquidationThreshold: bigint; // Weighted average liquidation threshold
  readonly ltv: bigint; // Loan to value ratio
  readonly healthFactor: bigint; // Health factor (18 decimals)
};

/**
 * User position in a specific reserve
 */
export type UserReserveData = {
  readonly asset: LendingAsset;
  readonly currentATokenBalance: bigint; // Supplied amount
  readonly currentStableDebt: bigint;
  readonly currentVariableDebt: bigint;
  readonly principalStableDebt: bigint;
  readonly scaledVariableDebt: bigint;
  readonly stableBorrowRate: bigint;
  readonly liquidityRate: bigint;
  readonly usageAsCollateralEnabled: boolean;
};

/**
 * Transaction data for lending operations
 */
export type LendingTransaction = {
  readonly type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation';
  readonly asset: string;
  readonly amount: bigint;
  readonly user: string;
  readonly timestamp: Timestamp;
  readonly txHash: string;
  readonly gasUsed: bigint;
  readonly effectiveRate?: bigint; // For borrow/repay
};

/**
 * Interest rate mode for borrowing
 */
export type InterestRateMode = 'stable' | 'variable';

/**
 * Lending protocol configuration
 */
export type LendingProtocolConfig = {
  readonly name: string;
  readonly version: string;
  readonly chainId: number;
  readonly poolAddressProvider: string;
  readonly pool: string;
  readonly poolDataProvider: string;
  readonly priceOracle: string;
  readonly aaveOracle: string; // Yei uses Aave oracle interface
  readonly incentivesController?: string;
  readonly collector?: string;
};

/**
 * Supply parameters
 */
export type SupplyParams = {
  readonly asset: string;
  readonly amount: bigint;
  readonly onBehalfOf?: string;
  readonly referralCode?: number;
};

/**
 * Withdraw parameters
 */
export type WithdrawParams = {
  readonly asset: string;
  readonly amount: bigint | 'max'; // 'max' withdraws all
  readonly to?: string;
};

/**
 * Borrow parameters
 */
export type BorrowParams = {
  readonly asset: string;
  readonly amount: bigint;
  readonly interestRateMode: InterestRateMode;
  readonly referralCode?: number;
  readonly onBehalfOf?: string;
};

/**
 * Repay parameters
 */
export type RepayParams = {
  readonly asset: string;
  readonly amount: bigint | 'max'; // 'max' repays all debt
  readonly interestRateMode: InterestRateMode;
  readonly onBehalfOf?: string;
};

/**
 * Liquidation parameters
 */
export type LiquidationParams = {
  readonly collateralAsset: string;
  readonly debtAsset: string;
  readonly user: string;
  readonly debtToCover: bigint;
  readonly receiveAToken: boolean;
};

/**
 * Health factor calculation result
 */
export type HealthFactorData = {
  readonly healthFactor: bigint;
  readonly totalCollateralBase: bigint;
  readonly totalDebtBase: bigint;
  readonly currentLiquidationThreshold: bigint;
  readonly isHealthy: boolean; // healthFactor > 1e18
  readonly canBeLiquidated: boolean; // healthFactor < 1e18
};

/**
 * Protocol fee data
 */
export type ProtocolFees = {
  readonly liquidationFee: bigint; // Percentage in basis points
  readonly flashLoanFee: bigint; // Percentage in basis points
  readonly borrowFee?: bigint; // Optional platform fee
};

/**
 * Lending adapter interface
 */
export interface ILendingAdapter {
  // Read operations
  getUserAccountData(user: string): Promise<Result<UserAccountData>>;
  getUserReserveData(user: string, asset: string): Promise<Result<UserReserveData>>;
  getReserveData(asset: string): Promise<Result<ReserveData>>;
  getHealthFactor(user: string): Promise<Result<HealthFactorData>>;
  
  // Write operations
  supply(params: SupplyParams): Promise<Result<LendingTransaction>>;
  withdraw(params: WithdrawParams): Promise<Result<LendingTransaction>>;
  borrow(params: BorrowParams): Promise<Result<LendingTransaction>>;
  repay(params: RepayParams): Promise<Result<LendingTransaction>>;
  
  // Protocol info
  getProtocolConfig(): LendingProtocolConfig;
  getSupportedAssets(): Promise<Result<ReadonlyArray<LendingAsset>>>;
}

/**
 * Error types specific to lending operations
 */
export type LendingError = 
  | { readonly type: 'insufficient_collateral'; readonly message: string }
  | { readonly type: 'health_factor_too_low'; readonly message: string }
  | { readonly type: 'asset_not_supported'; readonly message: string }
  | { readonly type: 'insufficient_liquidity'; readonly message: string }
  | { readonly type: 'invalid_amount'; readonly message: string }
  | { readonly type: 'market_frozen'; readonly message: string }
  | { readonly type: 'borrowing_disabled'; readonly message: string }
  | { readonly type: 'contract_error'; readonly message: string; readonly code?: string }
  | { readonly type: 'network_error'; readonly message: string };

/**
 * Type guards
 */
export const isHealthy = (healthFactor: bigint): boolean => 
  healthFactor > BigInt('1000000000000000000'); // > 1e18

export const canBeLiquidated = (healthFactor: bigint): boolean =>
  healthFactor < BigInt('1000000000000000000'); // < 1e18

export const isMaxAmount = (amount: bigint | 'max'): amount is 'max' =>
  amount === 'max';

/**
 * Constants
 */
export const RAY = BigInt('1000000000000000000000000000'); // 1e27
export const WAD = BigInt('1000000000000000000'); // 1e18
export const PERCENTAGE_FACTOR = BigInt('10000'); // 100.00%