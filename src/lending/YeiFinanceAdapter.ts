/**
 * @fileoverview Yei Finance lending adapter implementation
 * Implements Aave V3 interface for Sei Network
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
} from '../types';

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
} from './types';

import {
  YEI_FINANCE_ADDRESSES,
  YEI_SUPPORTED_ASSETS,
  ASSET_BY_SYMBOL,
  ASSET_BY_ADDRESS,
  YEI_PROTOCOL_CONFIG,
  PROTOCOL_PARAMETERS,
  ERROR_MESSAGES,
  POOL_ABI_FRAGMENTS,
  DATA_PROVIDER_ABI_FRAGMENTS,
  RAY,
  WAD,
  isMaxAmount,
} from './constants';

/**
 * Yei Finance adapter for lending operations
 */
export class YeiFinanceAdapter implements ILendingAdapter {
  private readonly provider: ethers.Provider;
  private readonly signer?: ethers.Signer;
  private readonly poolContract: ethers.Contract;
  private readonly dataProviderContract: ethers.Contract;
  
  constructor(
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize contracts
    this.poolContract = new ethers.Contract(
      YEI_FINANCE_ADDRESSES.POOL,
      POOL_ABI_FRAGMENTS,
      signer || provider
    );
    
    this.dataProviderContract = new ethers.Contract(
      YEI_FINANCE_ADDRESSES.POOL_DATA_PROVIDER,
      DATA_PROVIDER_ABI_FRAGMENTS,
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
          const data = await this.poolContract.getUserAccountData(user);
          
          return {
            totalCollateralBase: BigInt(data.totalCollateralBase.toString()),
            totalDebtBase: BigInt(data.totalDebtBase.toString()),
            availableBorrowsBase: BigInt(data.availableBorrowsBase.toString()),
            currentLiquidationThreshold: BigInt(data.currentLiquidationThreshold.toString()),
            ltv: BigInt(data.ltv.toString()),
            healthFactor: BigInt(data.healthFactor.toString()),
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

          const data = await this.dataProviderContract.getUserReserveData(
            assetInfo.address,
            user
          );

          return {
            asset: assetInfo,
            currentATokenBalance: BigInt(data.currentATokenBalance.toString()),
            currentStableDebt: BigInt(data.currentStableDebt.toString()),
            currentVariableDebt: BigInt(data.currentVariableDebt.toString()),
            principalStableDebt: BigInt(data.principalStableDebt.toString()),
            scaledVariableDebt: BigInt(data.scaledVariableDebt.toString()),
            stableBorrowRate: BigInt(data.stableBorrowRate.toString()),
            liquidityRate: BigInt(data.liquidityRate.toString()),
            usageAsCollateralEnabled: data.usageAsCollateralEnabled,
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

          const data = await this.dataProviderContract.getReserveData(
            assetInfo.address
          );

          // Calculate derived fields
          const totalDebt = BigInt(data.totalStableDebt.toString()) + 
                           BigInt(data.totalVariableDebt.toString());
          const totalSupply = BigInt(data.totalAToken.toString());
          const utilizationRate = totalSupply > 0n
            ? (totalDebt * RAY) / totalSupply
            : 0n;

          return {
            asset: assetInfo,
            liquidityRate: BigInt(data.liquidityRate.toString()),
            variableBorrowRate: BigInt(data.variableBorrowRate.toString()),
            stableBorrowRate: BigInt(data.stableBorrowRate.toString()),
            utilizationRate,
            availableLiquidity: totalSupply - totalDebt,
            totalStableDebt: BigInt(data.totalStableDebt.toString()),
            totalVariableDebt: BigInt(data.totalVariableDebt.toString()),
            totalSupply,
            liquidityIndex: BigInt(data.liquidityIndex.toString()),
            variableBorrowIndex: BigInt(data.variableBorrowIndex.toString()),
            lastUpdateTimestamp: Number(data.lastUpdateTimestamp) * 1000,
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
      E.map((accountData) => ({
        healthFactor: accountData.healthFactor,
        totalCollateralBase: accountData.totalCollateralBase,
        totalDebtBase: accountData.totalDebtBase,
        currentLiquidationThreshold: accountData.currentLiquidationThreshold,
        isHealthy: accountData.healthFactor > WAD,
        canBeLiquidated: accountData.healthFactor < WAD,
      }))
    );
  }

  /**
   * Supply assets to the lending pool
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

          // Approve spending if needed
          await this.ensureApproval(assetInfo.address, params.amount);

          // Execute supply transaction
          const tx = await this.poolContract.supply(
            assetInfo.address,
            params.amount.toString(),
            params.onBehalfOf || await this.signer.getAddress(),
            params.referralCode || 0
          );

          const receipt = await tx.wait();

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
   * Withdraw assets from the lending pool
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

          const signerAddress = await this.signer!.getAddress();
          let amountToWithdraw: bigint;

          if (isMaxAmount(params.amount)) {
            // Get user's aToken balance for max withdrawal
            const userReserve = await this.getUserReserveData(signerAddress, params.asset);
            if (E.isLeft(userReserve)) {
              throw new Error('Failed to get user reserve data');
            }
            amountToWithdraw = userReserve.right.currentATokenBalance;
          } else {
            amountToWithdraw = params.amount;
          }

          // Execute withdraw transaction
          const tx = await this.poolContract.withdraw(
            assetInfo.address,
            amountToWithdraw.toString(),
            params.to || signerAddress
          );

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

          const signerAddress = await this.signer!.getAddress();
          const borrower = params.onBehalfOf || signerAddress;

          // Check health factor before borrowing
          const healthFactorBefore = await this.getHealthFactor(borrower);
          if (E.isLeft(healthFactorBefore)) {
            throw new Error('Failed to check health factor');
          }
          
          if (!healthFactorBefore.right.isHealthy) {
            throw new Error(ERROR_MESSAGES.HEALTH_FACTOR_TOO_LOW);
          }

          // Execute borrow transaction
          const interestRateMode = params.interestRateMode === 'stable' ? 1 : 2;
          const tx = await this.poolContract.borrow(
            assetInfo.address,
            params.amount.toString(),
            interestRateMode,
            params.referralCode || 0,
            borrower
          );

          const receipt = await tx.wait();

          return {
            type: 'borrow' as const,
            asset: params.asset,
            amount: params.amount,
            user: borrower,
            timestamp: Date.now(),
            txHash: receipt.transactionHash,
            gasUsed: BigInt(receipt.gasUsed.toString()),
            effectiveRate: params.interestRateMode === 'stable'
              ? await this.getStableBorrowRate(assetInfo.address, borrower)
              : await this.getVariableBorrowRate(assetInfo.address),
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

          const signerAddress = await this.signer!.getAddress();
          const borrower = params.onBehalfOf || signerAddress;
          let amountToRepay: bigint;

          if (isMaxAmount(params.amount)) {
            // Get user's debt for max repayment
            const userReserve = await this.getUserReserveData(borrower, params.asset);
            if (E.isLeft(userReserve)) {
              throw new Error('Failed to get user reserve data');
            }
            
            amountToRepay = params.interestRateMode === 'stable'
              ? userReserve.right.currentStableDebt
              : userReserve.right.currentVariableDebt;
              
            // Add small buffer for interest accrual
            amountToRepay = (amountToRepay * 10001n) / 10000n;
          } else {
            amountToRepay = params.amount;
          }

          // Approve spending if needed
          await this.ensureApproval(assetInfo.address, amountToRepay);

          // Execute repay transaction
          const interestRateMode = params.interestRateMode === 'stable' ? 1 : 2;
          const tx = await this.poolContract.repay(
            assetInfo.address,
            amountToRepay.toString(),
            interestRateMode,
            borrower
          );

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
    return YEI_PROTOCOL_CONFIG;
  }

  /**
   * Get list of supported assets
   */
  async getSupportedAssets(): Promise<Result<ReadonlyArray<LendingAsset>>> {
    return E.right(YEI_SUPPORTED_ASSETS);
  }

  /**
   * Helper: Get asset info by symbol or address
   */
  private getAssetInfo(assetIdentifier: string): LendingAsset | undefined {
    return ASSET_BY_SYMBOL[assetIdentifier] || 
           ASSET_BY_ADDRESS[assetIdentifier.toLowerCase()];
  }

  /**
   * Helper: Ensure token approval for spending
   */
  private async ensureApproval(
    tokenAddress: string,
    amount: bigint
  ): Promise<void> {
    if (!this.signer) return;

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      this.signer
    );

    const tx = await tokenContract.approve(
      YEI_FINANCE_ADDRESSES.POOL,
      amount.toString()
    );
    await tx.wait();
  }

  /**
   * Helper: Get current variable borrow rate
   */
  private async getVariableBorrowRate(asset: string): Promise<bigint> {
    const reserveData = await this.getReserveData(asset);
    return E.isRight(reserveData) ? reserveData.right.variableBorrowRate : 0n;
  }

  /**
   * Helper: Get user's stable borrow rate
   */
  private async getStableBorrowRate(
    asset: string,
    user: string
  ): Promise<bigint> {
    const userReserveData = await this.getUserReserveData(user, asset);
    return E.isRight(userReserveData) ? userReserveData.right.stableBorrowRate : 0n;
  }

  /**
   * Helper: Map errors to lending error types
   */
  private mapError(error: any, context: string): LendingError {
    const message = error?.message || context;
    
    if (message.includes('health factor')) {
      return this.createError('health_factor_too_low', message);
    }
    if (message.includes('collateral')) {
      return this.createError('insufficient_collateral', message);
    }
    if (message.includes('liquidity')) {
      return this.createError('insufficient_liquidity', message);
    }
    if (message.includes('frozen')) {
      return this.createError('market_frozen', message);
    }
    if (message.includes('not supported')) {
      return this.createError('asset_not_supported', message);
    }
    if (error?.code === 'NETWORK_ERROR') {
      return this.createError('network_error', message);
    }
    
    return this.createError('contract_error', message, error?.code);
  }

  /**
   * Helper: Create typed error
   */
  private createError(
    type: LendingError['type'],
    message: string,
    code?: string
  ): LendingError {
    return { type, message, ...(code && { code }) } as LendingError;
  }
}

/**
 * Factory function to create Yei Finance adapter
 */
export const createYeiFinanceAdapter = (
  provider: ethers.Provider,
  signer?: ethers.Signer
): ILendingAdapter => {
  return new YeiFinanceAdapter(provider, signer);
};