/**
 * @fileoverview Takara Protocol wrapper implementation for Sei Network
 * Implements comprehensive lending and borrowing operations using fp-ts patterns
 * Built on Compound V2 fork with Sei-specific optimizations
 */

import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { ethers } from 'ethers';

import type {
  Result,
  DataError,
  NetworkError,
  ValidationError,
  CollectorContext,
} from '../../../types';

import type {
  ILendingAdapter,
  LendingAsset,
  ReserveData,
  UserAccountData,
  UserReserveData,
  LendingTransaction,
  HealthFactorData,
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  LendingError,
  LendingProtocolConfig,
  InterestRateMode,
} from '../../../lending/types';

/**
 * Takara-specific types extending base lending types
 */
export type TakaraAsset = LendingAsset & {
  readonly cTokenAddress: string; // Compound-style cToken address
  readonly exchangeRate: bigint; // Current exchange rate
  readonly totalSupply: bigint; // Total supply of cTokens
  readonly totalBorrows: bigint; // Total borrows in underlying
  readonly reserveFactor: bigint; // Reserve factor percentage
  readonly collateralFactor: bigint; // Collateral factor for borrowing
  readonly liquidationThreshold: bigint; // Liquidation threshold
  readonly liquidationIncentive: bigint; // Liquidation incentive
  readonly borrowCap: bigint; // Maximum borrowable amount
  readonly supplyCap: bigint; // Maximum suppliable amount
  readonly isActive: boolean; // Whether the market is active
  readonly isFrozen: boolean; // Whether the market is frozen
  readonly isPaused: boolean; // Whether the market is paused
};

export type TakaraReserveData = ReserveData & {
  readonly asset: TakaraAsset;
  readonly supplyIndex: bigint; // Supply index for interest calculation
  readonly borrowIndex: bigint; // Borrow index for interest calculation
  readonly accrualBlockNumber: bigint; // Last block number of interest accrual
  readonly cash: bigint; // Cash in the market
  readonly reserves: bigint; // Reserves amount
  readonly totalBorrows: bigint; // Total borrows with interest
  readonly totalSupply: bigint; // Total supply of cTokens
  readonly exchangeRate: bigint; // Exchange rate stored * 10^18
  readonly closeFactorMantissa: bigint; // Close factor for liquidations
  readonly liquidationIncentiveMantissa: bigint; // Liquidation incentive
  readonly supplyRatePerBlock: bigint; // Supply interest rate per block
  readonly borrowRatePerBlock: bigint; // Borrow interest rate per block
};

export type TakaraUserAccountData = UserAccountData & {
  readonly liquidity: bigint; // Account liquidity
  readonly shortfall: bigint; // Account shortfall
  readonly totalSupplyBalance: bigint; // Total supply balance in USD
  readonly totalBorrowBalance: bigint; // Total borrow balance in USD
  readonly totalCollateralValueInUsd: bigint; // Total collateral value in USD
  readonly totalBorrowValueInUsd: bigint; // Total borrow value in USD
  readonly maxBorrowValue: bigint; // Maximum borrow value
  readonly availableBorrowValue: bigint; // Available borrow value
  readonly utilizationRate: bigint; // Overall utilization rate
  readonly netApy: bigint; // Net APY across all positions
};

export type TakaraUserReserveData = UserReserveData & {
  readonly asset: TakaraAsset;
  readonly cTokenBalance: bigint; // Balance of cTokens
  readonly borrowBalance: bigint; // Current borrow balance
  readonly borrowBalanceStored: bigint; // Stored borrow balance
  readonly exchangeRateStored: bigint; // Stored exchange rate
  readonly supplyRatePerBlock: bigint; // Supply rate per block
  readonly borrowRatePerBlock: bigint; // Borrow rate per block
  readonly totalCash: bigint; // Total cash in the market
  readonly totalBorrows: bigint; // Total borrows in the market
  readonly totalReserves: bigint; // Total reserves
  readonly totalSupply: bigint; // Total supply of cTokens
  readonly isCollateral: boolean; // Whether used as collateral
  readonly memberOfMarket: boolean; // Whether member of market
};

export type TakaraLendingTransaction = LendingTransaction & {
  readonly cTokenAddress: string; // cToken contract address
  readonly exchangeRate: bigint; // Exchange rate at transaction time
  readonly accrualBlockNumber: bigint; // Block number of accrual
  readonly supplyIndex?: bigint; // Supply index for supply/withdraw
  readonly borrowIndex?: bigint; // Borrow index for borrow/repay
  readonly accountLiquidity?: bigint; // Account liquidity after tx
  readonly accountShortfall?: bigint; // Account shortfall after tx
  readonly protocolFeePaid?: bigint; // Protocol fee paid
  readonly liquidationIncentive?: bigint; // Liquidation incentive earned
};

export type TakaraError = LendingError 
  | { readonly type: 'market_not_listed'; readonly message: string }
  | { readonly type: 'market_not_entered'; readonly message: string }
  | { readonly type: 'insufficient_cash'; readonly message: string }
  | { readonly type: 'borrow_cap_exceeded'; readonly message: string }
  | { readonly type: 'supply_cap_exceeded'; readonly message: string }
  | { readonly type: 'comptroller_rejection'; readonly message: string; readonly code: number }
  | { readonly type: 'price_error'; readonly message: string }
  | { readonly type: 'math_error'; readonly message: string }
  | { readonly type: 'token_insufficient_allowance'; readonly message: string }
  | { readonly type: 'token_transfer_failed'; readonly message: string }
  | { readonly type: 'liquidation_invalid'; readonly message: string }
  | { readonly type: 'liquidation_too_much'; readonly message: string };

/**
 * Takara Protocol constants
 */
export const TAKARA_ADDRESSES = {
  COMPTROLLER: '0x0000000000000000000000000000000000000000', // Placeholder - to be updated
  PRICE_ORACLE: '0x0000000000000000000000000000000000000000',
  INTEREST_RATE_MODEL: '0x0000000000000000000000000000000000000000',
  LIQUIDATION_INCENTIVE: '0x0000000000000000000000000000000000000000',
} as const;

export const TAKARA_SUPPORTED_ASSETS: ReadonlyArray<TakaraAsset> = [
  {
    symbol: 'SEI',
    address: '0x0000000000000000000000000000000000000000', // Native SEI
    decimals: 18,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n, // 1e18
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 200000000000000000n, // 20%
    collateralFactor: 750000000000000000n, // 75%
    liquidationThreshold: 850000000000000000n, // 85%
    liquidationIncentive: 1100000000000000000n, // 110%
    borrowCap: 0n, // 0 means no cap
    supplyCap: 0n, // 0 means no cap
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
  {
    symbol: 'iSEI',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n,
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 200000000000000000n,
    collateralFactor: 700000000000000000n, // 70%
    liquidationThreshold: 800000000000000000n, // 80%
    liquidationIncentive: 1100000000000000000n,
    borrowCap: 0n,
    supplyCap: 0n,
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
  {
    symbol: 'USDT',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 6,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n,
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 100000000000000000n, // 10%
    collateralFactor: 800000000000000000n, // 80%
    liquidationThreshold: 900000000000000000n, // 90%
    liquidationIncentive: 1050000000000000000n, // 105%
    borrowCap: 0n,
    supplyCap: 0n,
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
  {
    symbol: 'USDC',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 6,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n,
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 100000000000000000n,
    collateralFactor: 800000000000000000n,
    liquidationThreshold: 900000000000000000n,
    liquidationIncentive: 1050000000000000000n,
    borrowCap: 0n,
    supplyCap: 0n,
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
  {
    symbol: 'fastUSD',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n,
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 100000000000000000n,
    collateralFactor: 750000000000000000n, // 75%
    liquidationThreshold: 850000000000000000n, // 85%
    liquidationIncentive: 1080000000000000000n, // 108%
    borrowCap: 0n,
    supplyCap: 0n,
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
  {
    symbol: 'uBTC',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 8,
    aTokenAddress: '0x0000000000000000000000000000000000000000',
    stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
    oracle: '0x0000000000000000000000000000000000000000',
    cTokenAddress: '0x0000000000000000000000000000000000000000',
    exchangeRate: 1000000000000000000n,
    totalSupply: 0n,
    totalBorrows: 0n,
    reserveFactor: 200000000000000000n, // 20%
    collateralFactor: 700000000000000000n, // 70%
    liquidationThreshold: 800000000000000000n, // 80%
    liquidationIncentive: 1130000000000000000n, // 113%
    borrowCap: 0n,
    supplyCap: 0n,
    isActive: true,
    isFrozen: false,
    isPaused: false,
  },
] as const;

export const TAKARA_PROTOCOL_CONFIG: LendingProtocolConfig = {
  name: 'Takara Protocol',
  version: '1.0.0',
  chainId: 1329, // Sei Pacific-1 mainnet
  poolAddressProvider: TAKARA_ADDRESSES.COMPTROLLER,
  pool: TAKARA_ADDRESSES.COMPTROLLER,
  poolDataProvider: TAKARA_ADDRESSES.COMPTROLLER,
  priceOracle: TAKARA_ADDRESSES.PRICE_ORACLE,
  aaveOracle: TAKARA_ADDRESSES.PRICE_ORACLE,
  incentivesController: undefined,
  collector: undefined,
} as const;

// Asset lookup maps
export const TAKARA_ASSET_BY_SYMBOL: ReadonlyRecord<string, TakaraAsset> = 
  TAKARA_SUPPORTED_ASSETS.reduce((acc, asset) => ({
    ...acc,
    [asset.symbol]: asset,
  }), {} as Record<string, TakaraAsset>);

export const TAKARA_ASSET_BY_ADDRESS: ReadonlyRecord<string, TakaraAsset> = 
  TAKARA_SUPPORTED_ASSETS.reduce((acc, asset) => ({
    ...acc,
    [asset.address.toLowerCase()]: asset,
    [asset.cTokenAddress.toLowerCase()]: asset,
  }), {} as Record<string, TakaraAsset>);

// Constants for calculations
export const TAKARA_RAY = BigInt('1000000000000000000000000000'); // 1e27
export const TAKARA_WAD = BigInt('1000000000000000000'); // 1e18
export const TAKARA_BLOCKS_PER_YEAR = BigInt('10512000'); // Approximate blocks per year on Sei
export const TAKARA_MANTISSA = BigInt('1000000000000000000'); // 1e18

// Error messages
export const TAKARA_ERROR_MESSAGES = {
  MARKET_NOT_LISTED: 'Market not listed',
  MARKET_NOT_ENTERED: 'Market not entered',
  INSUFFICIENT_CASH: 'Insufficient cash in market',
  BORROW_CAP_EXCEEDED: 'Borrow cap exceeded',
  SUPPLY_CAP_EXCEEDED: 'Supply cap exceeded',
  COMPTROLLER_REJECTION: 'Comptroller rejection',
  PRICE_ERROR: 'Price oracle error',
  MATH_ERROR: 'Math error in calculation',
  TOKEN_INSUFFICIENT_ALLOWANCE: 'Insufficient token allowance',
  TOKEN_TRANSFER_FAILED: 'Token transfer failed',
  LIQUIDATION_INVALID: 'Invalid liquidation',
  LIQUIDATION_TOO_MUCH: 'Liquidation amount too high',
} as const;

// ABI fragments for core contracts
export const TAKARA_COMPTROLLER_ABI = [
  'function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)',
  'function enterMarkets(address[] calldata cTokens) returns (uint256[] memory)',
  'function exitMarket(address cToken) returns (uint256)',
  'function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)',
  'function getHypotheticalAccountLiquidity(address account, address cTokenModify, uint256 redeemTokens, uint256 borrowAmount) view returns (uint256, uint256, uint256)',
  'function liquidateCalculateSeizeTokens(address cTokenBorrowed, address cTokenCollateral, uint256 repayAmount) view returns (uint256, uint256)',
  'function liquidationIncentiveMantissa() view returns (uint256)',
  'function closeFactorMantissa() view returns (uint256)',
  'function oracle() view returns (address)',
  'function getAllMarkets() view returns (address[] memory)',
  'function borrowCaps(address) view returns (uint256)',
  'function supplyCaps(address) view returns (uint256)',
  'function borrowGuardianPaused(address) view returns (bool)',
  'function mintGuardianPaused(address) view returns (bool)',
] as const;

export const TAKARA_CTOKEN_ABI = [
  'function mint(uint256 mintAmount) returns (uint256)',
  'function redeem(uint256 redeemTokens) returns (uint256)',
  'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
  'function borrow(uint256 borrowAmount) returns (uint256)',
  'function repayBorrow(uint256 repayAmount) returns (uint256)',
  'function repayBorrowBehalf(address borrower, uint256 repayAmount) returns (uint256)',
  'function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function balanceOfUnderlying(address owner) returns (uint256)',
  'function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function totalBorrowsCurrent() returns (uint256)',
  'function borrowBalanceCurrent(address account) returns (uint256)',
  'function borrowBalanceStored(address account) view returns (uint256)',
  'function exchangeRateCurrent() returns (uint256)',
  'function exchangeRateStored() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function accrualBlockNumber() view returns (uint256)',
  'function reserveFactorMantissa() view returns (uint256)',
  'function interestRateModel() view returns (address)',
  'function underlying() view returns (address)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
] as const;

export const TAKARA_ORACLE_ABI = [
  'function getUnderlyingPrice(address cToken) view returns (uint256)',
  'function price(string calldata symbol) view returns (uint256)',
] as const;

/**
 * Takara Protocol wrapper for lending operations
 * Implements Compound V2 interface optimized for Sei Network
 */
export class TakaraProtocolWrapper implements ILendingAdapter {
  private readonly provider: ethers.Provider;
  private readonly signer?: ethers.Signer;
  private readonly comptrollerContract: ethers.Contract;
  private readonly oracleContract: ethers.Contract;
  private readonly cTokenContracts: Map<string, ethers.Contract>;
  
  constructor(
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;
    this.cTokenContracts = new Map();
    
    // Initialize core contracts
    this.comptrollerContract = new ethers.Contract(
      TAKARA_ADDRESSES.COMPTROLLER,
      TAKARA_COMPTROLLER_ABI,
      signer || provider
    );
    
    this.oracleContract = new ethers.Contract(
      TAKARA_ADDRESSES.PRICE_ORACLE,
      TAKARA_ORACLE_ABI,
      provider
    );
  }

  /**
   * Get user account data across all positions
   */
  async getUserAccountData(user: string): Promise<Result<UserAccountData>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const [error, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(user);
          
          if (error !== 0n) {
            throw new Error(`Comptroller error: ${error}`);
          }

          // Get detailed account data
          const accountData = await this.getDetailedAccountData(user);
          
          return {
            totalCollateralBase: accountData.totalCollateralValueInUsd,
            totalDebtBase: accountData.totalBorrowValueInUsd,
            availableBorrowsBase: liquidity,
            currentLiquidationThreshold: await this.getWeightedLiquidationThreshold(user),
            ltv: await this.getWeightedLTV(user),
            healthFactor: shortfall > 0n ? TAKARA_WAD : (liquidity + accountData.totalBorrowValueInUsd) / accountData.totalBorrowValueInUsd,
          };
        },
        (error) => this.mapError(error, 'Failed to get user account data')
      )
    )();
  }

  /**
   * Get user position data for a specific reserve
   */
  async getUserReserveData(
    user: string,
    asset: string
  ): Promise<Result<UserReserveData>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(asset);
          if (!assetInfo) {
            throw new Error(`Asset ${asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          const [error, cTokenBalance, borrowBalance, exchangeRate] = 
            await cTokenContract.getAccountSnapshot(user);

          if (error !== 0n) {
            throw new Error(`CToken error: ${error}`);
          }

          const [supplyRatePerBlock, borrowRatePerBlock] = await Promise.all([
            cTokenContract.supplyRatePerBlock(),
            cTokenContract.borrowRatePerBlock(),
          ]);

          // Calculate derived values
          const underlyingBalance = (cTokenBalance * exchangeRate) / TAKARA_MANTISSA;
          const supplyRate = supplyRatePerBlock * TAKARA_BLOCKS_PER_YEAR;
          const borrowRate = borrowRatePerBlock * TAKARA_BLOCKS_PER_YEAR;

          return {
            asset: assetInfo,
            currentATokenBalance: underlyingBalance,
            currentStableDebt: 0n, // Takara doesn't have stable debt
            currentVariableDebt: borrowBalance,
            principalStableDebt: 0n,
            scaledVariableDebt: borrowBalance,
            stableBorrowRate: 0n,
            liquidityRate: supplyRate,
            usageAsCollateralEnabled: await this.isMarketEntered(user, assetInfo.cTokenAddress),
          };
        },
        (error) => this.mapError(error, 'Failed to get user reserve data')
      )
    )();
  }

  /**
   * Get reserve data for an asset
   */
  async getReserveData(asset: string): Promise<Result<ReserveData>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(asset);
          if (!assetInfo) {
            throw new Error(`Asset ${asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          
          const [
            supplyRatePerBlock,
            borrowRatePerBlock,
            totalSupply,
            totalBorrows,
            totalReserves,
            cash,
            exchangeRate,
          ] = await Promise.all([
            cTokenContract.supplyRatePerBlock(),
            cTokenContract.borrowRatePerBlock(),
            cTokenContract.totalSupply(),
            cTokenContract.totalBorrows(),
            cTokenContract.totalReserves(),
            cTokenContract.getCash(),
            cTokenContract.exchangeRateStored(),
          ]);

          // Calculate derived values
          const totalSupplyUnderlying = (totalSupply * exchangeRate) / TAKARA_MANTISSA;
          const availableLiquidity = cash;
          const utilizationRate = totalSupplyUnderlying > 0n
            ? (totalBorrows * TAKARA_RAY) / totalSupplyUnderlying
            : 0n;

          // Convert rates to annual
          const liquidityRate = supplyRatePerBlock * TAKARA_BLOCKS_PER_YEAR;
          const variableBorrowRate = borrowRatePerBlock * TAKARA_BLOCKS_PER_YEAR;

          return {
            asset: assetInfo,
            liquidityRate,
            variableBorrowRate,
            stableBorrowRate: 0n, // Takara doesn't support stable rates
            utilizationRate,
            availableLiquidity,
            totalStableDebt: 0n,
            totalVariableDebt: totalBorrows,
            totalSupply: totalSupplyUnderlying,
            liquidityIndex: TAKARA_RAY, // Simplified for Takara
            variableBorrowIndex: TAKARA_RAY,
            lastUpdateTimestamp: Date.now(),
          };
        },
        (error) => this.mapError(error, 'Failed to get reserve data')
      )
    )();
  }

  /**
   * Get user health factor
   */
  async getHealthFactor(user: string): Promise<Result<HealthFactorData>> {
    return pipe(
      await this.getUserAccountData(user),
      E.map((accountData) => {
        const isHealthy = accountData.healthFactor > TAKARA_WAD;
        return {
          healthFactor: accountData.healthFactor,
          totalCollateralBase: accountData.totalCollateralBase,
          totalDebtBase: accountData.totalDebtBase,
          currentLiquidationThreshold: accountData.currentLiquidationThreshold,
          isHealthy,
          canBeLiquidated: !isHealthy,
        };
      })
    );
  }

  /**
   * Supply (mint) assets to the lending pool
   */
  async supply(params: SupplyParams): Promise<Result<LendingTransaction>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(params.asset);
          if (!assetInfo) {
            throw new Error(`Asset ${params.asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          
          // Check if market is active
          if (!assetInfo.isActive || assetInfo.isFrozen || assetInfo.isPaused) {
            throw new Error('Market is not active');
          }

          // Check supply cap
          if (assetInfo.supplyCap > 0n) {
            const currentSupply = await this.getTotalSupply(assetInfo.cTokenAddress);
            if (currentSupply + params.amount > assetInfo.supplyCap) {
              throw new Error(TAKARA_ERROR_MESSAGES.SUPPLY_CAP_EXCEEDED);
            }
          }

          // Approve underlying token spending if needed
          if (assetInfo.symbol !== 'SEI') {
            await this.ensureApproval(assetInfo.address, assetInfo.cTokenAddress, params.amount);
          }

          // Execute mint transaction
          const tx = await cTokenContract.mint(params.amount.toString());
          const receipt = await tx.wait();

          // Get updated account data
          const accountData = await this.getUserAccountData(await this.signer.getAddress());
          
          return {
            type: 'supply' as const,
            asset: params.asset,
            amount: params.amount,
            user: params.onBehalfOf || await this.signer.getAddress(),
            timestamp: Date.now(),
            txHash: receipt.transactionHash,
            gasUsed: BigInt(receipt.gasUsed.toString()),
          };
        },
        (error) => this.mapError(error, 'Supply transaction failed')
      )
    )();
  }

  /**
   * Withdraw (redeem) assets from the lending pool
   */
  async withdraw(params: WithdrawParams): Promise<Result<LendingTransaction>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(params.asset);
          if (!assetInfo) {
            throw new Error(`Asset ${params.asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          const signerAddress = await this.signer!.getAddress();
          
          let amountToWithdraw: bigint;
          let isRedeemTokens = false;

          if (params.amount === 'max') {
            // Get user's cToken balance for max withdrawal
            const cTokenBalance = await cTokenContract.balanceOf(signerAddress);
            amountToWithdraw = cTokenBalance;
            isRedeemTokens = true;
          } else {
            amountToWithdraw = params.amount;
          }

          // Check account liquidity before withdrawal
          const [, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(signerAddress);
          if (shortfall > 0n) {
            throw new Error('Account has shortfall, cannot withdraw');
          }

          // Execute redeem transaction
          const tx = isRedeemTokens
            ? await cTokenContract.redeem(amountToWithdraw.toString())
            : await cTokenContract.redeemUnderlying(amountToWithdraw.toString());
          
          const receipt = await tx.wait();

          return {
            type: 'withdraw' as const,
            asset: params.asset,
            amount: amountToWithdraw,
            user: signerAddress,
            timestamp: Date.now(),
            txHash: receipt.transactionHash,
            gasUsed: BigInt(receipt.gasUsed.toString()),
          };
        },
        (error) => this.mapError(error, 'Withdraw transaction failed')
      )
    )();
  }

  /**
   * Borrow assets from the lending pool
   */
  async borrow(params: BorrowParams): Promise<Result<LendingTransaction>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(params.asset);
          if (!assetInfo) {
            throw new Error(`Asset ${params.asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          const signerAddress = await this.signer!.getAddress();
          const borrower = params.onBehalfOf || signerAddress;

          // Check market status
          if (!assetInfo.isActive || assetInfo.isFrozen || assetInfo.isPaused) {
            throw new Error('Market is not active for borrowing');
          }

          // Check borrow cap
          if (assetInfo.borrowCap > 0n) {
            const currentBorrows = await cTokenContract.totalBorrows();
            if (currentBorrows + params.amount > assetInfo.borrowCap) {
              throw new Error(TAKARA_ERROR_MESSAGES.BORROW_CAP_EXCEEDED);
            }
          }

          // Check account liquidity
          const [, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(borrower);
          if (shortfall > 0n) {
            throw new Error('Account has shortfall, cannot borrow');
          }

          // Check if sufficient liquidity for hypothetical borrow
          const [, hypotheticalLiquidity, hypotheticalShortfall] = 
            await this.comptrollerContract.getHypotheticalAccountLiquidity(
              borrower,
              assetInfo.cTokenAddress,
              0,
              params.amount
            );

          if (hypotheticalShortfall > 0n) {
            throw new Error('Insufficient collateral for borrow amount');
          }

          // Execute borrow transaction
          const tx = await cTokenContract.borrow(params.amount.toString());
          const receipt = await tx.wait();

          // Get effective borrow rate
          const borrowRate = await cTokenContract.borrowRatePerBlock();
          const effectiveRate = borrowRate * TAKARA_BLOCKS_PER_YEAR;

          return {
            type: 'borrow' as const,
            asset: params.asset,
            amount: params.amount,
            user: borrower,
            timestamp: Date.now(),
            txHash: receipt.transactionHash,
            gasUsed: BigInt(receipt.gasUsed.toString()),
            effectiveRate,
          };
        },
        (error) => this.mapError(error, 'Borrow transaction failed')
      )
    )();
  }

  /**
   * Repay borrowed assets
   */
  async repay(params: RepayParams): Promise<Result<LendingTransaction>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(params.asset);
          if (!assetInfo) {
            throw new Error(`Asset ${params.asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          const signerAddress = await this.signer!.getAddress();
          const borrower = params.onBehalfOf || signerAddress;
          
          let amountToRepay: bigint;

          if (params.amount === 'max') {
            // Get user's current borrow balance
            const borrowBalance = await cTokenContract.borrowBalanceCurrent(borrower);
            // Add small buffer for interest accrual
            amountToRepay = (borrowBalance * 10001n) / 10000n;
          } else {
            amountToRepay = params.amount;
          }

          // Approve underlying token spending if needed
          if (assetInfo.symbol !== 'SEI') {
            await this.ensureApproval(assetInfo.address, assetInfo.cTokenAddress, amountToRepay);
          }

          // Execute repay transaction
          const tx = params.onBehalfOf
            ? await cTokenContract.repayBorrowBehalf(borrower, amountToRepay.toString())
            : await cTokenContract.repayBorrow(amountToRepay.toString());
          
          const receipt = await tx.wait();

          return {
            type: 'repay' as const,
            asset: params.asset,
            amount: amountToRepay,
            user: borrower,
            timestamp: Date.now(),
            txHash: receipt.transactionHash,
            gasUsed: BigInt(receipt.gasUsed.toString()),
          };
        },
        (error) => this.mapError(error, 'Repay transaction failed')
      )
    )();
  }

  /**
   * Get protocol configuration
   */
  getProtocolConfig(): LendingProtocolConfig {
    return TAKARA_PROTOCOL_CONFIG;
  }

  /**
   * Get list of supported assets
   */
  async getSupportedAssets(): Promise<Result<ReadonlyArray<LendingAsset>>> {
    return E.right(TAKARA_SUPPORTED_ASSETS);
  }

  /**
   * Get current lending rates for an asset
   */
  async getLendingRates(asset: string): Promise<Result<{
    supplyRate: bigint;
    borrowRate: bigint;
    utilizationRate: bigint;
    totalSupply: bigint;
    totalBorrows: bigint;
    availableLiquidity: bigint;
  }>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(asset);
          if (!assetInfo) {
            throw new Error(`Asset ${asset} not supported`);
          }

          const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
          
          const [
            supplyRatePerBlock,
            borrowRatePerBlock,
            totalSupply,
            totalBorrows,
            cash,
            exchangeRate,
          ] = await Promise.all([
            cTokenContract.supplyRatePerBlock(),
            cTokenContract.borrowRatePerBlock(),
            cTokenContract.totalSupply(),
            cTokenContract.totalBorrows(),
            cTokenContract.getCash(),
            cTokenContract.exchangeRateStored(),
          ]);

          const totalSupplyUnderlying = (totalSupply * exchangeRate) / TAKARA_MANTISSA;
          const utilizationRate = totalSupplyUnderlying > 0n
            ? (totalBorrows * TAKARA_RAY) / totalSupplyUnderlying
            : 0n;

          return {
            supplyRate: supplyRatePerBlock * TAKARA_BLOCKS_PER_YEAR,
            borrowRate: borrowRatePerBlock * TAKARA_BLOCKS_PER_YEAR,
            utilizationRate,
            totalSupply: totalSupplyUnderlying,
            totalBorrows,
            availableLiquidity: cash,
          };
        },
        (error) => this.mapError(error, 'Failed to get lending rates')
      )
    )();
  }

  /**
   * Enter markets to use assets as collateral
   */
  async enterMarkets(assets: string[]): Promise<Result<void>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const cTokenAddresses = assets.map(asset => {
            const assetInfo = this.getAssetInfo(asset);
            if (!assetInfo) {
              throw new Error(`Asset ${asset} not supported`);
            }
            return assetInfo.cTokenAddress;
          });

          const tx = await this.comptrollerContract.enterMarkets(cTokenAddresses);
          await tx.wait();
        },
        (error) => this.mapError(error, 'Failed to enter markets')
      )
    )();
  }

  /**
   * Exit a market to stop using asset as collateral
   */
  async exitMarket(asset: string): Promise<Result<void>> {
    if (!this.signer) {
      return E.left(this.createError('contract_error', 'Signer required for write operations'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const assetInfo = this.getAssetInfo(asset);
          if (!assetInfo) {
            throw new Error(`Asset ${asset} not supported`);
          }

          const tx = await this.comptrollerContract.exitMarket(assetInfo.cTokenAddress);
          await tx.wait();
        },
        (error) => this.mapError(error, 'Failed to exit market')
      )
    )();
  }

  // Helper methods

  /**
   * Get asset info by symbol or address
   */
  private getAssetInfo(assetIdentifier: string): TakaraAsset | undefined {
    return TAKARA_ASSET_BY_SYMBOL[assetIdentifier] || 
           TAKARA_ASSET_BY_ADDRESS[assetIdentifier.toLowerCase()];
  }

  /**
   * Get cToken contract instance
   */
  private async getCTokenContract(cTokenAddress: string): Promise<ethers.Contract> {
    if (!this.cTokenContracts.has(cTokenAddress)) {
      const contract = new ethers.Contract(
        cTokenAddress,
        TAKARA_CTOKEN_ABI,
        this.signer || this.provider
      );
      this.cTokenContracts.set(cTokenAddress, contract);
    }
    return this.cTokenContracts.get(cTokenAddress)!;
  }

  /**
   * Ensure token approval for spending
   */
  private async ensureApproval(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    if (!this.signer) return;

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      this.signer
    );

    const tx = await tokenContract.approve(spenderAddress, amount.toString());
    await tx.wait();
  }

  /**
   * Check if user has entered a market
   */
  private async isMarketEntered(user: string, cTokenAddress: string): Promise<boolean> {
    try {
      const markets = await this.comptrollerContract.getAssetsIn(user);
      return markets.includes(cTokenAddress);
    } catch {
      return false;
    }
  }

  /**
   * Get detailed account data
   */
  private async getDetailedAccountData(user: string): Promise<TakaraUserAccountData> {
    let totalSupplyBalance = 0n;
    let totalBorrowBalance = 0n;
    let totalCollateralValueInUsd = 0n;
    let totalBorrowValueInUsd = 0n;

    for (const asset of TAKARA_SUPPORTED_ASSETS) {
      const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
      const [, cTokenBalance, borrowBalance, exchangeRate] = 
        await cTokenContract.getAccountSnapshot(user);

      const underlyingBalance = (cTokenBalance * exchangeRate) / TAKARA_MANTISSA;
      const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);

      // Calculate USD values
      const supplyValueUsd = (underlyingBalance * underlyingPrice) / TAKARA_MANTISSA;
      const borrowValueUsd = (borrowBalance * underlyingPrice) / TAKARA_MANTISSA;

      totalSupplyBalance += supplyValueUsd;
      totalBorrowBalance += borrowValueUsd;

      // Only count as collateral if market is entered
      if (await this.isMarketEntered(user, asset.cTokenAddress)) {
        totalCollateralValueInUsd += (supplyValueUsd * asset.collateralFactor) / TAKARA_MANTISSA;
      }
      
      totalBorrowValueInUsd += borrowValueUsd;
    }

    const liquidity = totalCollateralValueInUsd > totalBorrowValueInUsd 
      ? totalCollateralValueInUsd - totalBorrowValueInUsd 
      : 0n;
    const shortfall = totalBorrowValueInUsd > totalCollateralValueInUsd 
      ? totalBorrowValueInUsd - totalCollateralValueInUsd 
      : 0n;

    return {
      totalCollateralBase: totalCollateralValueInUsd,
      totalDebtBase: totalBorrowValueInUsd,
      availableBorrowsBase: liquidity,
      currentLiquidationThreshold: 0n, // Will be calculated separately
      ltv: 0n, // Will be calculated separately
      healthFactor: shortfall > 0n ? 0n : TAKARA_WAD,
      liquidity,
      shortfall,
      totalSupplyBalance,
      totalBorrowBalance,
      totalCollateralValueInUsd,
      totalBorrowValueInUsd,
      maxBorrowValue: totalCollateralValueInUsd,
      availableBorrowValue: liquidity,
      utilizationRate: totalSupplyBalance > 0n ? (totalBorrowBalance * TAKARA_RAY) / totalSupplyBalance : 0n,
      netApy: 0n, // Would need more complex calculation
    };
  }

  /**
   * Get weighted liquidation threshold
   */
  private async getWeightedLiquidationThreshold(user: string): Promise<bigint> {
    let totalCollateralValue = 0n;
    let weightedThreshold = 0n;

    for (const asset of TAKARA_SUPPORTED_ASSETS) {
      if (await this.isMarketEntered(user, asset.cTokenAddress)) {
        const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
        const [, cTokenBalance, , exchangeRate] = await cTokenContract.getAccountSnapshot(user);
        
        const underlyingBalance = (cTokenBalance * exchangeRate) / TAKARA_MANTISSA;
        const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);
        const collateralValue = (underlyingBalance * underlyingPrice) / TAKARA_MANTISSA;

        totalCollateralValue += collateralValue;
        weightedThreshold += (collateralValue * asset.liquidationThreshold) / TAKARA_MANTISSA;
      }
    }

    return totalCollateralValue > 0n ? (weightedThreshold * TAKARA_MANTISSA) / totalCollateralValue : 0n;
  }

  /**
   * Get weighted LTV
   */
  private async getWeightedLTV(user: string): Promise<bigint> {
    let totalCollateralValue = 0n;
    let weightedLTV = 0n;

    for (const asset of TAKARA_SUPPORTED_ASSETS) {
      if (await this.isMarketEntered(user, asset.cTokenAddress)) {
        const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
        const [, cTokenBalance, , exchangeRate] = await cTokenContract.getAccountSnapshot(user);
        
        const underlyingBalance = (cTokenBalance * exchangeRate) / TAKARA_MANTISSA;
        const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);
        const collateralValue = (underlyingBalance * underlyingPrice) / TAKARA_MANTISSA;

        totalCollateralValue += collateralValue;
        weightedLTV += (collateralValue * asset.collateralFactor) / TAKARA_MANTISSA;
      }
    }

    return totalCollateralValue > 0n ? (weightedLTV * TAKARA_MANTISSA) / totalCollateralValue : 0n;
  }

  /**
   * Get total supply for a market
   */
  private async getTotalSupply(cTokenAddress: string): Promise<bigint> {
    const cTokenContract = await this.getCTokenContract(cTokenAddress);
    const [totalSupply, exchangeRate] = await Promise.all([
      cTokenContract.totalSupply(),
      cTokenContract.exchangeRateStored(),
    ]);
    return (totalSupply * exchangeRate) / TAKARA_MANTISSA;
  }

  /**
   * Map errors to Takara error types
   */
  private mapError(error: any, context: string): TakaraError {
    const message = error?.message || context;
    
    // Comptroller error codes
    if (message.includes('Comptroller')) {
      const code = this.extractComptrollerErrorCode(message);
      return this.createError('comptroller_rejection', message, code);
    }
    
    // Market-specific errors
    if (message.includes('market not listed')) {
      return this.createError('market_not_listed', message);
    }
    if (message.includes('market not entered')) {
      return this.createError('market_not_entered', message);
    }
    if (message.includes('insufficient cash')) {
      return this.createError('insufficient_cash', message);
    }
    if (message.includes('borrow cap') || message.includes('BORROW_CAP_EXCEEDED')) {
      return this.createError('borrow_cap_exceeded', message);
    }
    if (message.includes('supply cap') || message.includes('SUPPLY_CAP_EXCEEDED')) {
      return this.createError('supply_cap_exceeded', message);
    }
    
    // Token errors
    if (message.includes('insufficient allowance')) {
      return this.createError('token_insufficient_allowance', message);
    }
    if (message.includes('transfer failed')) {
      return this.createError('token_transfer_failed', message);
    }
    
    // Liquidation errors
    if (message.includes('liquidation') && message.includes('invalid')) {
      return this.createError('liquidation_invalid', message);
    }
    if (message.includes('liquidation') && message.includes('too much')) {
      return this.createError('liquidation_too_much', message);
    }
    
    // Price and math errors
    if (message.includes('price') || message.includes('oracle')) {
      return this.createError('price_error', message);
    }
    if (message.includes('math') || message.includes('overflow') || message.includes('underflow')) {
      return this.createError('math_error', message);
    }
    
    // Network errors
    if (error?.code === 'NETWORK_ERROR') {
      return this.createError('network_error', message);
    }
    
    // Health factor errors
    if (message.includes('health factor') || message.includes('shortfall')) {
      return this.createError('health_factor_too_low', message);
    }
    
    // Collateral errors
    if (message.includes('collateral') || message.includes('insufficient')) {
      return this.createError('insufficient_collateral', message);
    }
    
    // Liquidity errors
    if (message.includes('liquidity')) {
      return this.createError('insufficient_liquidity', message);
    }
    
    // Default to contract error
    return this.createError('contract_error', message, error?.code);
  }

  /**
   * Extract Comptroller error code from message
   */
  private extractComptrollerErrorCode(message: string): number {
    const match = message.match(/error[:\s]*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Create typed error
   */
  private createError(
    type: TakaraError['type'],
    message: string,
    code?: string | number
  ): TakaraError {
    const baseError = { type, message };
    if (code !== undefined) {
      return { ...baseError, code: typeof code === 'string' ? code : code } as TakaraError;
    }
    return baseError as TakaraError;
  }
}

/**
 * Factory function to create Takara Protocol adapter
 */
export const createTakaraProtocolWrapper = (
  provider: ethers.Provider,
  signer?: ethers.Signer
): ILendingAdapter => {
  return new TakaraProtocolWrapper(provider, signer);
};

/**
 * Risk assessment utilities for Takara Protocol
 */
export const TakaraRiskAssessment = {
  /**
   * Calculate liquidation risk
   */
  calculateLiquidationRisk: (healthFactor: bigint): 'low' | 'medium' | 'high' | 'critical' => {
    if (healthFactor < TAKARA_WAD) return 'critical';
    if (healthFactor < (TAKARA_WAD * 11n) / 10n) return 'high'; // < 1.1
    if (healthFactor < (TAKARA_WAD * 13n) / 10n) return 'medium'; // < 1.3
    return 'low';
  },

  /**
   * Calculate optimal borrow amount
   */
  calculateOptimalBorrowAmount: (
    collateralValue: bigint,
    collateralFactor: bigint,
    currentBorrowValue: bigint,
    targetHealthFactor: bigint = (TAKARA_WAD * 15n) / 10n // 1.5
  ): bigint => {
    const maxBorrowValue = (collateralValue * collateralFactor) / TAKARA_MANTISSA;
    const safeMaxBorrowValue = (maxBorrowValue * TAKARA_MANTISSA) / targetHealthFactor;
    const availableBorrowValue = safeMaxBorrowValue > currentBorrowValue
      ? safeMaxBorrowValue - currentBorrowValue
      : 0n;
    return availableBorrowValue;
  },

  /**
   * Calculate position health score
   */
  calculatePositionHealthScore: (
    healthFactor: bigint,
    utilizationRate: bigint,
    diversificationScore: number // 0-1
  ): number => {
    const healthScore = Number(healthFactor) / Number(TAKARA_WAD);
    const utilizationScore = 1 - (Number(utilizationRate) / Number(TAKARA_RAY));
    
    const weightedScore = (healthScore * 0.5) + (utilizationScore * 0.3) + (diversificationScore * 0.2);
    return Math.max(0, Math.min(1, weightedScore));
  },
};