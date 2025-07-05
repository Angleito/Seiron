import { ethers } from 'ethers';
import type { Result } from '../../../types';
import type { ILendingAdapter, LendingAsset, ReserveData, UserAccountData, UserReserveData, LendingTransaction, HealthFactorData, SupplyParams, WithdrawParams, BorrowParams, RepayParams, LendingError, LendingProtocolConfig } from '../../../lending/types';
export type TakaraAsset = LendingAsset & {
    readonly cTokenAddress: string;
    readonly exchangeRate: bigint;
    readonly totalSupply: bigint;
    readonly totalBorrows: bigint;
    readonly reserveFactor: bigint;
    readonly collateralFactor: bigint;
    readonly liquidationThreshold: bigint;
    readonly liquidationIncentive: bigint;
    readonly borrowCap: bigint;
    readonly supplyCap: bigint;
    readonly isActive: boolean;
    readonly isFrozen: boolean;
    readonly isPaused: boolean;
};
export type TakaraReserveData = ReserveData & {
    readonly asset: TakaraAsset;
    readonly supplyIndex: bigint;
    readonly borrowIndex: bigint;
    readonly accrualBlockNumber: bigint;
    readonly cash: bigint;
    readonly reserves: bigint;
    readonly totalBorrows: bigint;
    readonly totalSupply: bigint;
    readonly exchangeRate: bigint;
    readonly closeFactorMantissa: bigint;
    readonly liquidationIncentiveMantissa: bigint;
    readonly supplyRatePerBlock: bigint;
    readonly borrowRatePerBlock: bigint;
};
export type TakaraUserAccountData = UserAccountData & {
    readonly liquidity: bigint;
    readonly shortfall: bigint;
    readonly totalSupplyBalance: bigint;
    readonly totalBorrowBalance: bigint;
    readonly totalCollateralValueInUsd: bigint;
    readonly totalBorrowValueInUsd: bigint;
    readonly maxBorrowValue: bigint;
    readonly availableBorrowValue: bigint;
    readonly utilizationRate: bigint;
    readonly netApy: bigint;
};
export type TakaraUserReserveData = UserReserveData & {
    readonly asset: TakaraAsset;
    readonly cTokenBalance: bigint;
    readonly borrowBalance: bigint;
    readonly borrowBalanceStored: bigint;
    readonly exchangeRateStored: bigint;
    readonly supplyRatePerBlock: bigint;
    readonly borrowRatePerBlock: bigint;
    readonly totalCash: bigint;
    readonly totalBorrows: bigint;
    readonly totalReserves: bigint;
    readonly totalSupply: bigint;
    readonly isCollateral: boolean;
    readonly memberOfMarket: boolean;
};
export type TakaraLendingTransaction = LendingTransaction & {
    readonly cTokenAddress: string;
    readonly exchangeRate: bigint;
    readonly accrualBlockNumber: bigint;
    readonly supplyIndex?: bigint;
    readonly borrowIndex?: bigint;
    readonly accountLiquidity?: bigint;
    readonly accountShortfall?: bigint;
    readonly protocolFeePaid?: bigint;
    readonly liquidationIncentive?: bigint;
};
export type TakaraError = LendingError | {
    readonly type: 'market_not_listed';
    readonly message: string;
} | {
    readonly type: 'market_not_entered';
    readonly message: string;
} | {
    readonly type: 'insufficient_cash';
    readonly message: string;
} | {
    readonly type: 'borrow_cap_exceeded';
    readonly message: string;
} | {
    readonly type: 'supply_cap_exceeded';
    readonly message: string;
} | {
    readonly type: 'comptroller_rejection';
    readonly message: string;
    readonly code: number;
} | {
    readonly type: 'price_error';
    readonly message: string;
} | {
    readonly type: 'math_error';
    readonly message: string;
} | {
    readonly type: 'token_insufficient_allowance';
    readonly message: string;
} | {
    readonly type: 'token_transfer_failed';
    readonly message: string;
} | {
    readonly type: 'liquidation_invalid';
    readonly message: string;
} | {
    readonly type: 'liquidation_too_much';
    readonly message: string;
};
export declare const TAKARA_ADDRESSES: {
    readonly COMPTROLLER: "0x0000000000000000000000000000000000000000";
    readonly PRICE_ORACLE: "0x0000000000000000000000000000000000000000";
    readonly INTEREST_RATE_MODEL: "0x0000000000000000000000000000000000000000";
    readonly LIQUIDATION_INCENTIVE: "0x0000000000000000000000000000000000000000";
};
export declare const TAKARA_SUPPORTED_ASSETS: ReadonlyArray<TakaraAsset>;
export declare const TAKARA_PROTOCOL_CONFIG: LendingProtocolConfig;
export declare const TAKARA_ASSET_BY_SYMBOL: ReadonlyRecord<string, TakaraAsset>;
export declare const TAKARA_ASSET_BY_ADDRESS: ReadonlyRecord<string, TakaraAsset>;
export declare const TAKARA_RAY: bigint;
export declare const TAKARA_WAD: bigint;
export declare const TAKARA_BLOCKS_PER_YEAR: bigint;
export declare const TAKARA_MANTISSA: bigint;
export declare const TAKARA_ERROR_MESSAGES: {
    readonly MARKET_NOT_LISTED: "Market not listed";
    readonly MARKET_NOT_ENTERED: "Market not entered";
    readonly INSUFFICIENT_CASH: "Insufficient cash in market";
    readonly BORROW_CAP_EXCEEDED: "Borrow cap exceeded";
    readonly SUPPLY_CAP_EXCEEDED: "Supply cap exceeded";
    readonly COMPTROLLER_REJECTION: "Comptroller rejection";
    readonly PRICE_ERROR: "Price oracle error";
    readonly MATH_ERROR: "Math error in calculation";
    readonly TOKEN_INSUFFICIENT_ALLOWANCE: "Insufficient token allowance";
    readonly TOKEN_TRANSFER_FAILED: "Token transfer failed";
    readonly LIQUIDATION_INVALID: "Invalid liquidation";
    readonly LIQUIDATION_TOO_MUCH: "Liquidation amount too high";
};
export declare const TAKARA_COMPTROLLER_ABI: readonly ["function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)", "function enterMarkets(address[] calldata cTokens) returns (uint256[] memory)", "function exitMarket(address cToken) returns (uint256)", "function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)", "function getHypotheticalAccountLiquidity(address account, address cTokenModify, uint256 redeemTokens, uint256 borrowAmount) view returns (uint256, uint256, uint256)", "function liquidateCalculateSeizeTokens(address cTokenBorrowed, address cTokenCollateral, uint256 repayAmount) view returns (uint256, uint256)", "function liquidationIncentiveMantissa() view returns (uint256)", "function closeFactorMantissa() view returns (uint256)", "function oracle() view returns (address)", "function getAllMarkets() view returns (address[] memory)", "function borrowCaps(address) view returns (uint256)", "function supplyCaps(address) view returns (uint256)", "function borrowGuardianPaused(address) view returns (bool)", "function mintGuardianPaused(address) view returns (bool)"];
export declare const TAKARA_CTOKEN_ABI: readonly ["function mint(uint256 mintAmount) returns (uint256)", "function redeem(uint256 redeemTokens) returns (uint256)", "function redeemUnderlying(uint256 redeemAmount) returns (uint256)", "function borrow(uint256 borrowAmount) returns (uint256)", "function repayBorrow(uint256 repayAmount) returns (uint256)", "function repayBorrowBehalf(address borrower, uint256 repayAmount) returns (uint256)", "function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) returns (uint256)", "function balanceOf(address owner) view returns (uint256)", "function balanceOfUnderlying(address owner) returns (uint256)", "function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)", "function borrowRatePerBlock() view returns (uint256)", "function supplyRatePerBlock() view returns (uint256)", "function totalBorrowsCurrent() returns (uint256)", "function borrowBalanceCurrent(address account) returns (uint256)", "function borrowBalanceStored(address account) view returns (uint256)", "function exchangeRateCurrent() returns (uint256)", "function exchangeRateStored() view returns (uint256)", "function getCash() view returns (uint256)", "function totalReserves() view returns (uint256)", "function totalSupply() view returns (uint256)", "function totalBorrows() view returns (uint256)", "function accrualBlockNumber() view returns (uint256)", "function reserveFactorMantissa() view returns (uint256)", "function interestRateModel() view returns (address)", "function underlying() view returns (address)", "function symbol() view returns (string)", "function name() view returns (string)", "function decimals() view returns (uint8)"];
export declare const TAKARA_ORACLE_ABI: readonly ["function getUnderlyingPrice(address cToken) view returns (uint256)", "function price(string calldata symbol) view returns (uint256)"];
export declare class TakaraProtocolWrapper implements ILendingAdapter {
    private readonly provider;
    private readonly signer?;
    private readonly comptrollerContract;
    private readonly oracleContract;
    private readonly cTokenContracts;
    constructor(provider: ethers.Provider, signer?: ethers.Signer);
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
    getLendingRates(asset: string): Promise<Result<{
        supplyRate: bigint;
        borrowRate: bigint;
        utilizationRate: bigint;
        totalSupply: bigint;
        totalBorrows: bigint;
        availableLiquidity: bigint;
    }>>;
    enterMarkets(assets: string[]): Promise<Result<void>>;
    exitMarket(asset: string): Promise<Result<void>>;
    private getAssetInfo;
    private getCTokenContract;
    private ensureApproval;
    private isMarketEntered;
    private getDetailedAccountData;
    private getWeightedLiquidationThreshold;
    private getWeightedLTV;
    private getTotalSupply;
    private mapError;
    private extractComptrollerErrorCode;
    private createError;
}
export declare const createTakaraProtocolWrapper: (provider: ethers.Provider, signer?: ethers.Signer) => ILendingAdapter;
export declare const TakaraRiskAssessment: {
    calculateLiquidationRisk: (healthFactor: bigint) => "low" | "medium" | "high" | "critical";
    calculateOptimalBorrowAmount: (collateralValue: bigint, collateralFactor: bigint, currentBorrowValue: bigint, targetHealthFactor?: bigint) => bigint;
    calculatePositionHealthScore: (healthFactor: bigint, utilizationRate: bigint, diversificationScore: number) => number;
};
//# sourceMappingURL=TakaraProtocolWrapper.d.ts.map