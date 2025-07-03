/**
 * @fileoverview Enhanced LendingManager with multi-protocol support
 * Integrates YeiFinance and Takara Protocol using functional programming patterns
 */

import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { ethers } from 'ethers';

import type { Result } from '../types';
import type { 
  ILendingAdapter, 
  LendingAsset, 
  LendingTransaction, 
  SupplyParams, 
  WithdrawParams, 
  BorrowParams, 
  RepayParams,
  LendingError,
  InterestRateMode,
} from './types';

import { YeiFinanceAdapter } from './YeiFinanceAdapter';
import { TakaraProtocolWrapper } from '../protocols/sei/adapters/TakaraProtocolWrapper';

/**
 * Enhanced lending configuration
 */
export interface LendingConfig {
  wallet: any;
  protocol?: 'yei' | 'takara' | 'auto';
  autoCompound?: boolean;
  minHealthFactor?: number;
  maxSlippage?: number;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

/**
 * Enhanced lending parameters
 */
export interface LendingParams {
  asset: string;
  amount: bigint;
  protocol?: 'yei' | 'takara' | 'auto';
  duration?: string;
  interestRateMode?: InterestRateMode;
  onBehalfOf?: string;
  referralCode?: number;
}

/**
 * Enhanced lending rate information
 */
export interface LendingRate {
  protocol: 'yei' | 'takara';
  asset: string;
  supplyApy: number;
  borrowApy: number;
  utilizationRate: number;
  totalSupply: bigint;
  totalBorrows: bigint;
  availableLiquidity: bigint;
  lastUpdated: number;
  healthFactor?: bigint;
  collateralFactor?: bigint;
  liquidationThreshold?: bigint;
}

/**
 * Protocol comparison result
 */
export interface ProtocolComparison {
  bestSupplyProtocol: 'yei' | 'takara';
  bestBorrowProtocol: 'yei' | 'takara';
  bestSupplyRate: number;
  bestBorrowRate: number;
  rateAdvantage: number; // Percentage difference
  riskAssessment: 'low' | 'medium' | 'high';
  recommendation: string;
  rates: LendingRate[];
}

/**
 * Enhanced position information
 */
export interface LendingPosition {
  id: string;
  protocol: 'yei' | 'takara';
  asset: string;
  type: 'supply' | 'borrow';
  amount: bigint;
  currentBalance: bigint;
  earnedInterest: bigint;
  currentApy: number;
  healthFactor?: bigint;
  liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  lastUpdated: number;
  txHash: string;
}

/**
 * Enhanced LendingManager with multi-protocol support
 */
export class LendingManager {
  private config: LendingConfig;
  private yeiAdapter: ILendingAdapter;
  private takaraAdapter: ILendingAdapter;
  private adapters: Map<string, ILendingAdapter>;

  constructor(config: LendingConfig) {
    this.config = config;
    this.adapters = new Map();
    
    // Initialize adapters
    this.yeiAdapter = new YeiFinanceAdapter(config.provider, config.signer);
    this.takaraAdapter = new TakaraProtocolWrapper(config.provider, config.signer);
    
    this.adapters.set('yei', this.yeiAdapter);
    this.adapters.set('takara', this.takaraAdapter);
  }

  /**
   * Get current lending rates across all protocols
   */
  async getCurrentRates(asset: string): Promise<Result<ProtocolComparison>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const [yeiRates, takaraRates] = await Promise.all([
            this.getProtocolRates('yei', asset),
            this.getProtocolRates('takara', asset),
          ]);

          const yeiRate = E.isRight(yeiRates) ? yeiRates.right : null;
          const takaraRate = E.isRight(takaraRates) ? takaraRates.right : null;

          if (!yeiRate && !takaraRate) {
            throw new Error(`No rates available for asset ${asset}`);
          }

          // Determine best protocols
          const bestSupplyProtocol = this.determineBestSupplyProtocol(yeiRate, takaraRate);
          const bestBorrowProtocol = this.determineBestBorrowProtocol(yeiRate, takaraRate);

          const bestSupplyRate = bestSupplyProtocol === 'yei' 
            ? yeiRate?.supplyApy || 0 
            : takaraRate?.supplyApy || 0;
          const bestBorrowRate = bestBorrowProtocol === 'yei' 
            ? yeiRate?.borrowApy || 0 
            : takaraRate?.borrowApy || 0;

          // Calculate rate advantage
          const supplyRateAdvantage = yeiRate && takaraRate
            ? Math.abs(yeiRate.supplyApy - takaraRate.supplyApy)
            : 0;

          const borrowRateAdvantage = yeiRate && takaraRate
            ? Math.abs(yeiRate.borrowApy - takaraRate.borrowApy)
            : 0;

          const rateAdvantage = Math.max(supplyRateAdvantage, borrowRateAdvantage);

          // Risk assessment
          const riskAssessment = this.assessProtocolRisk(yeiRate, takaraRate);

          // Generate recommendation
          const recommendation = this.generateRecommendation(
            bestSupplyProtocol,
            bestBorrowProtocol,
            rateAdvantage,
            riskAssessment
          );

          const rates = [yeiRate, takaraRate].filter(Boolean) as LendingRate[];

          return {
            bestSupplyProtocol,
            bestBorrowProtocol,
            bestSupplyRate,
            bestBorrowRate,
            rateAdvantage,
            riskAssessment,
            recommendation,
            rates,
          };
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Get all available lending rates
   */
  async getAllRates(asset?: string): Promise<Result<LendingRate[]>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const protocols = ['yei', 'takara'] as const;
          const results: LendingRate[] = [];

          if (asset) {
            // Get rates for specific asset
            for (const protocol of protocols) {
              const rates = await this.getProtocolRates(protocol, asset);
              if (E.isRight(rates)) {
                results.push(rates.right);
              }
            }
          } else {
            // Get rates for all supported assets
            const allAssets = await this.getAllSupportedAssets();
            if (E.isRight(allAssets)) {
              for (const assetInfo of allAssets.right) {
                for (const protocol of protocols) {
                  const rates = await this.getProtocolRates(protocol, assetInfo.symbol);
                  if (E.isRight(rates)) {
                    results.push(rates.right);
                  }
                }
              }
            }
          }

          return results;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Supply assets to lending protocol
   */
  async supply(params: LendingParams): Promise<Result<LendingTransaction>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const protocol = await this.selectOptimalProtocol(params.asset, 'supply', params.protocol);
          const adapter = this.adapters.get(protocol);
          
          if (!adapter) {
            throw new Error(`Protocol ${protocol} not supported`);
          }

          const supplyParams: SupplyParams = {
            asset: params.asset,
            amount: params.amount,
            onBehalfOf: params.onBehalfOf,
            referralCode: params.referralCode,
          };

          const result = await adapter.supply(supplyParams);
          
          if (E.isLeft(result)) {
            throw new Error(result.left.message);
          }

          return result.right;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Withdraw assets from lending protocol
   */
  async withdraw(params: LendingParams): Promise<Result<LendingTransaction>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const protocol = params.protocol || 'auto';
          const adapter = protocol === 'auto' 
            ? await this.detectProtocolFromPosition(params.asset)
            : this.adapters.get(protocol);
          
          if (!adapter) {
            throw new Error(`Protocol ${protocol} not supported`);
          }

          const withdrawParams: WithdrawParams = {
            asset: params.asset,
            amount: params.amount,
          };

          const result = await adapter.withdraw(withdrawParams);
          
          if (E.isLeft(result)) {
            throw new Error(result.left.message);
          }

          return result.right;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Borrow assets from lending protocol
   */
  async borrow(params: LendingParams): Promise<Result<LendingTransaction>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const protocol = await this.selectOptimalProtocol(params.asset, 'borrow', params.protocol);
          const adapter = this.adapters.get(protocol);
          
          if (!adapter) {
            throw new Error(`Protocol ${protocol} not supported`);
          }

          const borrowParams: BorrowParams = {
            asset: params.asset,
            amount: params.amount,
            interestRateMode: params.interestRateMode || 'variable',
            onBehalfOf: params.onBehalfOf,
            referralCode: params.referralCode,
          };

          const result = await adapter.borrow(borrowParams);
          
          if (E.isLeft(result)) {
            throw new Error(result.left.message);
          }

          return result.right;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Repay borrowed assets
   */
  async repay(params: LendingParams): Promise<Result<LendingTransaction>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const protocol = params.protocol || 'auto';
          const adapter = protocol === 'auto' 
            ? await this.detectProtocolFromPosition(params.asset)
            : this.adapters.get(protocol);
          
          if (!adapter) {
            throw new Error(`Protocol ${protocol} not supported`);
          }

          const repayParams: RepayParams = {
            asset: params.asset,
            amount: params.amount,
            interestRateMode: params.interestRateMode || 'variable',
            onBehalfOf: params.onBehalfOf,
          };

          const result = await adapter.repay(repayParams);
          
          if (E.isLeft(result)) {
            throw new Error(result.left.message);
          }

          return result.right;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Get user's lending positions across all protocols
   */
  async getUserPositions(user: string): Promise<Result<LendingPosition[]>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const positions: LendingPosition[] = [];

          for (const [protocolName, adapter] of this.adapters) {
            const accountData = await adapter.getUserAccountData(user);
            if (E.isRight(accountData)) {
              const supportedAssets = await adapter.getSupportedAssets();
              if (E.isRight(supportedAssets)) {
                for (const asset of supportedAssets.right) {
                  const userReserveData = await adapter.getUserReserveData(user, asset.symbol);
                  if (E.isRight(userReserveData)) {
                    const reserveData = userReserveData.right;
                    
                    // Add supply position if exists
                    if (reserveData.currentATokenBalance > 0n) {
                      positions.push({
                        id: `${protocolName}-${asset.symbol}-supply`,
                        protocol: protocolName as 'yei' | 'takara',
                        asset: asset.symbol,
                        type: 'supply',
                        amount: reserveData.currentATokenBalance,
                        currentBalance: reserveData.currentATokenBalance,
                        earnedInterest: 0n, // Would need historical data
                        currentApy: Number(reserveData.liquidityRate) / 1e25, // Convert from ray to percentage
                        healthFactor: accountData.right.healthFactor,
                        liquidationRisk: this.calculateLiquidationRisk(accountData.right.healthFactor),
                        createdAt: Date.now(),
                        lastUpdated: Date.now(),
                        txHash: '',
                      });
                    }

                    // Add borrow position if exists
                    if (reserveData.currentVariableDebt > 0n) {
                      positions.push({
                        id: `${protocolName}-${asset.symbol}-borrow`,
                        protocol: protocolName as 'yei' | 'takara',
                        asset: asset.symbol,
                        type: 'borrow',
                        amount: reserveData.currentVariableDebt,
                        currentBalance: reserveData.currentVariableDebt,
                        earnedInterest: 0n,
                        currentApy: Number(reserveData.liquidityRate) / 1e25,
                        healthFactor: accountData.right.healthFactor,
                        liquidationRisk: this.calculateLiquidationRisk(accountData.right.healthFactor),
                        createdAt: Date.now(),
                        lastUpdated: Date.now(),
                        txHash: '',
                      });
                    }
                  }
                }
              }
            }
          }

          return positions;
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  /**
   * Get account health across all protocols
   */
  async getAccountHealth(user: string): Promise<Result<{
    totalCollateralValue: bigint;
    totalDebtValue: bigint;
    availableBorrowValue: bigint;
    healthFactor: bigint;
    liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
    protocolBreakdown: Array<{
      protocol: string;
      collateralValue: bigint;
      debtValue: bigint;
      healthFactor: bigint;
    }>;
  }>> {
    return pipe(
      TE.tryCatch(
        async () => {
          let totalCollateralValue = 0n;
          let totalDebtValue = 0n;
          let totalAvailableBorrowValue = 0n;
          const protocolBreakdown: Array<{
            protocol: string;
            collateralValue: bigint;
            debtValue: bigint;
            healthFactor: bigint;
          }> = [];

          for (const [protocolName, adapter] of this.adapters) {
            const accountData = await adapter.getUserAccountData(user);
            if (E.isRight(accountData)) {
              const data = accountData.right;
              totalCollateralValue += data.totalCollateralBase;
              totalDebtValue += data.totalDebtBase;
              totalAvailableBorrowValue += data.availableBorrowsBase;

              protocolBreakdown.push({
                protocol: protocolName,
                collateralValue: data.totalCollateralBase,
                debtValue: data.totalDebtBase,
                healthFactor: data.healthFactor,
              });
            }
          }

          const overallHealthFactor = totalDebtValue > 0n 
            ? (totalCollateralValue * BigInt(1e18)) / totalDebtValue
            : BigInt(1e18);

          const liquidationRisk = this.calculateLiquidationRisk(overallHealthFactor);

          return {
            totalCollateralValue,
            totalDebtValue,
            availableBorrowValue: totalAvailableBorrowValue,
            healthFactor: overallHealthFactor,
            liquidationRisk,
            protocolBreakdown,
          };
        },
        (error) => ({ type: 'contract_error', message: error.message } as LendingError)
      )
    )();
  }

  // Private helper methods

  /**
   * Get protocol-specific rates
   */
  private async getProtocolRates(
    protocol: 'yei' | 'takara',
    asset: string
  ): Promise<Result<LendingRate>> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      return E.left({ type: 'contract_error', message: `Protocol ${protocol} not supported` });
    }

    const reserveData = await adapter.getReserveData(asset);
    if (E.isLeft(reserveData)) {
      return E.left(reserveData.left);
    }

    const data = reserveData.right;
    return E.right({
      protocol,
      asset,
      supplyApy: Number(data.liquidityRate) / 1e25, // Convert from ray to percentage
      borrowApy: Number(data.variableBorrowRate) / 1e25,
      utilizationRate: Number(data.utilizationRate) / 1e25,
      totalSupply: data.totalSupply,
      totalBorrows: data.totalVariableDebt,
      availableLiquidity: data.availableLiquidity,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Determine best protocol for supply
   */
  private determineBestSupplyProtocol(
    yeiRate: LendingRate | null,
    takaraRate: LendingRate | null
  ): 'yei' | 'takara' {
    if (!yeiRate) return 'takara';
    if (!takaraRate) return 'yei';
    return yeiRate.supplyApy > takaraRate.supplyApy ? 'yei' : 'takara';
  }

  /**
   * Determine best protocol for borrow
   */
  private determineBestBorrowProtocol(
    yeiRate: LendingRate | null,
    takaraRate: LendingRate | null
  ): 'yei' | 'takara' {
    if (!yeiRate) return 'takara';
    if (!takaraRate) return 'yei';
    return yeiRate.borrowApy < takaraRate.borrowApy ? 'yei' : 'takara';
  }

  /**
   * Assess protocol risk
   */
  private assessProtocolRisk(
    yeiRate: LendingRate | null,
    takaraRate: LendingRate | null
  ): 'low' | 'medium' | 'high' {
    // Simple risk assessment based on utilization rates
    const yeiUtilization = yeiRate?.utilizationRate || 0;
    const takaraUtilization = takaraRate?.utilizationRate || 0;
    const maxUtilization = Math.max(yeiUtilization, takaraUtilization);

    if (maxUtilization > 0.9) return 'high';
    if (maxUtilization > 0.7) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(
    bestSupplyProtocol: 'yei' | 'takara',
    bestBorrowProtocol: 'yei' | 'takara',
    rateAdvantage: number,
    riskAssessment: 'low' | 'medium' | 'high'
  ): string {
    if (rateAdvantage < 0.5) {
      return 'Rate differences are minimal. Consider other factors like gas costs and protocol reputation.';
    }

    if (riskAssessment === 'high') {
      return 'High utilization detected. Consider more conservative protocols or lower amounts.';
    }

    return `For supply: ${bestSupplyProtocol} offers better rates. For borrow: ${bestBorrowProtocol} offers better rates. Rate advantage: ${rateAdvantage.toFixed(2)}%`;
  }

  /**
   * Select optimal protocol
   */
  private async selectOptimalProtocol(
    asset: string,
    operation: 'supply' | 'borrow',
    preferredProtocol?: 'yei' | 'takara' | 'auto'
  ): Promise<'yei' | 'takara'> {
    if (preferredProtocol && preferredProtocol !== 'auto') {
      return preferredProtocol;
    }

    const comparison = await this.getCurrentRates(asset);
    if (E.isRight(comparison)) {
      return operation === 'supply' 
        ? comparison.right.bestSupplyProtocol 
        : comparison.right.bestBorrowProtocol;
    }

    // Default to YEI if comparison fails
    return 'yei';
  }

  /**
   * Detect protocol from existing position
   */
  private async detectProtocolFromPosition(asset: string): Promise<ILendingAdapter> {
    // This would need more sophisticated logic to detect which protocol
    // has the user's position. For now, default to YEI.
    return this.yeiAdapter;
  }

  /**
   * Get all supported assets across protocols
   */
  private async getAllSupportedAssets(): Promise<Result<LendingAsset[]>> {
    const allAssets: LendingAsset[] = [];
    
    for (const adapter of this.adapters.values()) {
      const assets = await adapter.getSupportedAssets();
      if (E.isRight(assets)) {
        allAssets.push(...assets.right);
      }
    }

    // Remove duplicates based on symbol
    const uniqueAssets = allAssets.filter(
      (asset, index, self) => 
        index === self.findIndex(a => a.symbol === asset.symbol)
    );

    return E.right(uniqueAssets);
  }

  /**
   * Calculate liquidation risk
   */
  private calculateLiquidationRisk(healthFactor: bigint): 'low' | 'medium' | 'high' | 'critical' {
    const hf = Number(healthFactor) / 1e18;
    
    if (hf < 1.0) return 'critical';
    if (hf < 1.1) return 'high';
    if (hf < 1.3) return 'medium';
    return 'low';
  }

  // Legacy methods for backwards compatibility
  async lend(params: LendingParams): Promise<{
    txHash: string;
    positionId: string;
    apy: number;
  }> {
    const result = await this.supply(params);
    if (E.isRight(result)) {
      return {
        txHash: result.right.txHash,
        positionId: `${params.protocol || 'auto'}-${params.asset}-supply`,
        apy: 0, // Would need rate lookup
      };
    }
    throw new Error(result.left.message);
  }

  async withdraw(positionId: string, amount?: number): Promise<{
    txHash: string;
    withdrawn: number;
    earned: number;
  }> {
    // Legacy method - would need position tracking
    return {
      txHash: '0x...',
      withdrawn: amount || 0,
      earned: 0,
    };
  }

  async compound(positionId: string): Promise<{
    txHash: string;
    compounded: number;
  }> {
    // Legacy method - would need implementation
    return {
      txHash: '0x...',
      compounded: 0,
    };
  }
}