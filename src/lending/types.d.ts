import type { Result, Timestamp } from '../types';
export type LendingAsset = {
    readonly symbol: string;
    readonly address: string;
    readonly decimals: number;
    readonly aTokenAddress: string;
    readonly stableDebtTokenAddress: string;
    readonly variableDebtTokenAddress: string;
    readonly interestRateStrategyAddress: string;
    readonly oracle: string;
};
export type ReserveData = {
    readonly asset: LendingAsset;
    readonly liquidityRate: bigint;
    readonly variableBorrowRate: bigint;
    readonly stableBorrowRate: bigint;
    readonly utilizationRate: bigint;
    readonly availableLiquidity: bigint;
    readonly totalStableDebt: bigint;
    readonly totalVariableDebt: bigint;
    readonly totalSupply: bigint;
    readonly liquidityIndex: bigint;
    readonly variableBorrowIndex: bigint;
    readonly lastUpdateTimestamp: Timestamp;
};
export type UserAccountData = {
    readonly totalCollateralBase: bigint;
    readonly totalDebtBase: bigint;
    readonly availableBorrowsBase: bigint;
    readonly currentLiquidationThreshold: bigint;
    readonly ltv: bigint;
    readonly healthFactor: bigint;
};
export type UserReserveData = {
    readonly asset: LendingAsset;
    readonly currentATokenBalance: bigint;
    readonly currentStableDebt: bigint;
    readonly currentVariableDebt: bigint;
    readonly principalStableDebt: bigint;
    readonly scaledVariableDebt: bigint;
    readonly stableBorrowRate: bigint;
    readonly liquidityRate: bigint;
    readonly usageAsCollateralEnabled: boolean;
};
export type LendingTransaction = {
    readonly type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation';
    readonly asset: string;
    readonly amount: bigint;
    readonly user: string;
    readonly timestamp: Timestamp;
    readonly txHash: string;
    readonly gasUsed: bigint;
    readonly effectiveRate?: bigint;
};
export type InterestRateMode = 'stable' | 'variable';
export type LendingProtocolConfig = {
    readonly name: string;
    readonly version: string;
    readonly chainId: number;
    readonly poolAddressProvider: string;
    readonly pool: string;
    readonly poolDataProvider: string;
    readonly priceOracle: string;
    readonly aaveOracle: string;
    readonly incentivesController?: string;
    readonly collector?: string;
};
export type SupplyParams = {
    readonly asset: string;
    readonly amount: bigint;
    readonly onBehalfOf?: string;
    readonly referralCode?: number;
};
export type WithdrawParams = {
    readonly asset: string;
    readonly amount: bigint | 'max';
    readonly to?: string;
};
export type BorrowParams = {
    readonly asset: string;
    readonly amount: bigint;
    readonly interestRateMode: InterestRateMode;
    readonly referralCode?: number;
    readonly onBehalfOf?: string;
};
export type RepayParams = {
    readonly asset: string;
    readonly amount: bigint | 'max';
    readonly interestRateMode: InterestRateMode;
    readonly onBehalfOf?: string;
};
export type LiquidationParams = {
    readonly collateralAsset: string;
    readonly debtAsset: string;
    readonly user: string;
    readonly debtToCover: bigint;
    readonly receiveAToken: boolean;
};
export type HealthFactorData = {
    readonly healthFactor: bigint;
    readonly totalCollateralBase: bigint;
    readonly totalDebtBase: bigint;
    readonly currentLiquidationThreshold: bigint;
    readonly isHealthy: boolean;
    readonly canBeLiquidated: boolean;
};
export type ProtocolFees = {
    readonly liquidationFee: bigint;
    readonly flashLoanFee: bigint;
    readonly borrowFee?: bigint;
};
export interface ILendingAdapter {
    getUserAccountData(user: string): Promise<Result<UserAccountData>>;
    getUserReserveData(user: string, asset: string): Promise<Result<UserReserveData>>;
    getReserveData(asset: string): Promise<Result<ReserveData>>;
    getHealthFactor(user: string): Promise<Result<HealthFactorData>>;
    supply(params: SupplyParams): Promise<Result<LendingTransaction>>;
    withdraw(params: WithdrawParams): Promise<Result<LendingTransaction>>;
    borrow(params: BorrowParams): Promise<Result<LendingTransaction>>;
    repay(params: RepayParams): Promise<Result<LendingTransaction>>;
    getProtocolConfig(): LendingProtocolConfig;
    getSupportedAssets(): Promise<Result<ReadonlyArray<LendingAsset>>>;
}
export type LendingError = {
    readonly type: 'insufficient_collateral';
    readonly message: string;
} | {
    readonly type: 'health_factor_too_low';
    readonly message: string;
} | {
    readonly type: 'asset_not_supported';
    readonly message: string;
} | {
    readonly type: 'insufficient_liquidity';
    readonly message: string;
} | {
    readonly type: 'invalid_amount';
    readonly message: string;
} | {
    readonly type: 'market_frozen';
    readonly message: string;
} | {
    readonly type: 'borrowing_disabled';
    readonly message: string;
} | {
    readonly type: 'contract_error';
    readonly message: string;
    readonly code?: string;
} | {
    readonly type: 'network_error';
    readonly message: string;
};
export declare const isHealthy: (healthFactor: bigint) => boolean;
export declare const canBeLiquidated: (healthFactor: bigint) => boolean;
export declare const isMaxAmount: (amount: bigint | "max") => amount is "max";
export declare const RAY: bigint;
export declare const WAD: bigint;
export declare const PERCENTAGE_FACTOR: bigint;
//# sourceMappingURL=types.d.ts.map