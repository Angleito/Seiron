/**
 * @fileoverview Lending module exports
 */

// Export types
export type {
  // Core types
  LendingAsset,
  ReserveData,
  UserAccountData,
  UserReserveData,
  LendingTransaction,
  InterestRateMode,
  LendingProtocolConfig,
  
  // Operation parameters
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  LiquidationParams,
  
  // Data types
  HealthFactorData,
  ProtocolFees,
  
  // Interface
  ILendingAdapter,
  
  // Error types
  LendingError,
} from './types';

// Export constants
export {
  // Addresses
  YEI_FINANCE_ADDRESSES,
  YEI_SUPPORTED_ASSETS,
  YEI_PROTOCOL_CONFIG,
  
  // Asset lookups
  ASSET_BY_SYMBOL,
  ASSET_BY_ADDRESS,
  
  // Protocol parameters
  PROTOCOL_PARAMETERS,
  ERROR_MESSAGES,
  
  // Math constants
  RAY,
  WAD,
  PERCENTAGE_FACTOR,
} from './constants';

// Export adapter
export {
  YeiFinanceAdapter,
  createYeiFinanceAdapter,
} from './YeiFinanceAdapter';

// Export type guards
export {
  isHealthy,
  canBeLiquidated,
  isMaxAmount,
} from './types';