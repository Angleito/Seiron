/**
 * Comprehensive TypeScript types and interfaces for portfolio state management
 * Sei AI Portfolio Manager - Portfolio State Types
 */

import * as TE from 'fp-ts/TaskEither';

// ===================== Base Types =====================

export type WalletAddress = string;
export type TokenAddress = string;
export type TransactionHash = string;
export type PoolId = string;

// ===================== Position Types =====================

export interface BasePosition {
  id: string;
  walletAddress: WalletAddress;
  platform: string;
  createdAt: string;
  lastUpdated: string;
}

export interface LendingPosition extends BasePosition {
  type: 'supply' | 'borrow';
  token: TokenAddress;
  tokenSymbol: string;
  amount: string;
  amountFormatted: string;
  valueUSD: number;
  apy: number;
  collateralFactor?: number;
  liquidationThreshold?: number;
  healthContribution: number;
}

export interface LiquidityPosition extends BasePosition {
  poolId: PoolId;
  token0: TokenAddress;
  token1: TokenAddress;
  token0Symbol: string;
  token1Symbol: string;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  valueUSD: number;
  feeApr: number;
  totalApr: number;
  uncollectedFees: {
    token0: string;
    token1: string;
    valueUSD: number;
  };
  priceRange: {
    lower: number;
    upper: number;
    current: number;
  };
  isInRange: boolean;
}

export interface TokenBalance {
  token: TokenAddress;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  valueUSD: number;
  priceUSD: number;
  change24h?: number;
}

// ===================== Portfolio State =====================

export interface PortfolioSnapshot {
  walletAddress: WalletAddress;
  totalValueUSD: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  totalLiquidityUSD: number;
  netWorth: number;
  healthFactor: number;
  lendingPositions: LendingPosition[];
  liquidityPositions: LiquidityPosition[];
  tokenBalances: TokenBalance[];
  timestamp: string;
  blockNumber?: number;
}

export interface PortfolioState {
  current: PortfolioSnapshot;
  previous?: PortfolioSnapshot;
  history: PortfolioSnapshot[];
  isLoading: boolean;
  lastError?: Error;
  lastUpdateAttempt: string;
  updateCount: number;
}

export interface PortfolioChange {
  walletAddress: WalletAddress;
  changeType: 'position_added' | 'position_removed' | 'position_updated' | 'balance_changed';
  timestamp: string;
  oldValue?: any;
  newValue?: any;
  metadata?: {
    transactionHash?: TransactionHash;
    gasUsed?: string;
    gasPrice?: string;
  };
}

// ===================== Analytics and Metrics =====================

export interface PortfolioMetrics {
  totalValue: number;
  netWorth: number;
  totalSupplied: number;
  totalBorrowed: number;
  totalLiquidity: number;
  collateralRatio: number;
  borrowUtilization: number;
  healthFactor: number;
  liquidationPrice?: number;
  diversificationScore: number;
  riskScore: number;
}

export interface PortfolioPerformance {
  period: '1h' | '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  returns: {
    absolute: number;
    percentage: number;
  };
  apy: {
    lending: number;
    liquidity: number;
    fees: number;
    total: number;
  };
  volatility: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  winRate: number;
}

export interface RiskMetrics {
  healthFactor: number;
  liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
  concentrationRisk: number;
  correlationRisk: number;
  impermanentLossRisk: number;
  alerts: RiskAlert[];
}

export interface RiskAlert {
  id: string;
  type: 'health_factor' | 'liquidation' | 'concentration' | 'correlation' | 'impermanent_loss';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: any;
}

// ===================== Position Tracking =====================

export interface PositionDiff {
  type: 'added' | 'removed' | 'updated';
  positionId: string;
  positionType: 'lending' | 'liquidity' | 'token';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  impactUSD: number;
  timestamp: string;
}

export interface PositionTrackingConfig {
  updateInterval: number; // milliseconds
  maxHistoryLength: number;
  alertThresholds: {
    healthFactorWarning: number;
    healthFactorCritical: number;
    valueChangePercentage: number;
    impermanentLossThreshold: number;
  };
}

// ===================== Cache Configuration =====================

export interface CacheConfig {
  portfolioTTL: number;
  positionsTTL: number;
  pricesTTL: number;
  metricsTTL: number;
  keyPrefix: string;
}

export interface CacheKeys {
  portfolio: (walletAddress: WalletAddress) => string;
  positions: (walletAddress: WalletAddress, type: 'lending' | 'liquidity') => string;
  tokenBalances: (walletAddress: WalletAddress) => string;
  metrics: (walletAddress: WalletAddress) => string;
  performance: (walletAddress: WalletAddress, period: string) => string;
  risks: (walletAddress: WalletAddress) => string;
}

// ===================== Adapter Interfaces =====================

export interface ProtocolAdapter {
  name: string;
  version: string;
  isInitialized: boolean;
  initialize(): TE.TaskEither<Error, void>;
}

export interface LendingAdapter extends ProtocolAdapter {
  getUserPositions(walletAddress: WalletAddress): TE.TaskEither<Error, LendingPosition[]>;
  supply(params: SupplyParams): TE.TaskEither<Error, TransactionHash>;
  withdraw(params: WithdrawParams): TE.TaskEither<Error, TransactionHash>;
  borrow(params: BorrowParams): TE.TaskEither<Error, TransactionHash>;
  repay(params: RepayParams): TE.TaskEither<Error, TransactionHash>;
  getHealthFactor(walletAddress: WalletAddress): TE.TaskEither<Error, number>;
}

export interface LiquidityAdapter extends ProtocolAdapter {
  getPositions(walletAddress: WalletAddress): TE.TaskEither<Error, LiquidityPosition[]>;
  addLiquidity(params: AddLiquidityParams): TE.TaskEither<Error, TransactionHash>;
  removeLiquidity(params: RemoveLiquidityParams): TE.TaskEither<Error, TransactionHash>;
  collectFees(params: CollectFeesParams): TE.TaskEither<Error, TransactionHash>;
  getPoolInfo(poolId: PoolId): TE.TaskEither<Error, PoolInfo>;
}

// ===================== Operation Parameters =====================

export interface SupplyParams {
  walletAddress: WalletAddress;
  token: TokenAddress;
  amount: string;
  useAsCollateral?: boolean;
}

export interface WithdrawParams {
  walletAddress: WalletAddress;
  token: TokenAddress;
  amount: string;
}

export interface BorrowParams {
  walletAddress: WalletAddress;
  token: TokenAddress;
  amount: string;
}

export interface RepayParams {
  walletAddress: WalletAddress;
  token: TokenAddress;
  amount: string;
}

export interface AddLiquidityParams {
  walletAddress: WalletAddress;
  token0: TokenAddress;
  token1: TokenAddress;
  amount0: string;
  amount1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
}

export interface RemoveLiquidityParams {
  walletAddress: WalletAddress;
  positionId: string;
  liquidity: string;
  amount0Min: string;
  amount1Min: string;
}

export interface CollectFeesParams {
  walletAddress: WalletAddress;
  positionId: string;
}

export interface PoolInfo {
  poolId: PoolId;
  token0: TokenAddress;
  token1: TokenAddress;
  fee: number;
  liquidity: string;
  tick: number;
  price: number;
  apr: number;
  volume24h: number;
  tvl: number;
}

// ===================== Event Types =====================

export interface PortfolioEvent {
  type: 'state_updated' | 'position_changed' | 'risk_alert' | 'transaction_complete' | 'error';
  walletAddress: WalletAddress;
  timestamp: string;
  data: any;
}

export interface StateUpdateEvent extends PortfolioEvent {
  type: 'state_updated';
  data: {
    previous: PortfolioSnapshot;
    current: PortfolioSnapshot;
    changes: PositionDiff[];
  };
}

export interface PositionChangeEvent extends PortfolioEvent {
  type: 'position_changed';
  data: {
    positionType: 'lending' | 'liquidity' | 'token';
    changeType: 'added' | 'removed' | 'updated';
    position: LendingPosition | LiquidityPosition | TokenBalance;
    impactUSD: number;
  };
}

export interface RiskAlertEvent extends PortfolioEvent {
  type: 'risk_alert';
  data: RiskAlert;
}

export interface TransactionCompleteEvent extends PortfolioEvent {
  type: 'transaction_complete';
  data: {
    hash: TransactionHash;
    status: 'success' | 'failed';
    operation: string;
    gasUsed?: string;
    gasPrice?: string;
  };
}

export interface ErrorEvent extends PortfolioEvent {
  type: 'error';
  data: {
    error: Error;
    context: string;
    retry?: boolean;
  };
}

// ===================== Export/Import Types =====================

export interface PortfolioExport {
  version: string;
  exportDate: string;
  walletAddress: WalletAddress;
  data: {
    snapshot: PortfolioSnapshot;
    history: PortfolioSnapshot[];
    metrics: PortfolioMetrics;
    performance: PortfolioPerformance[];
    risks: RiskMetrics;
  };
  metadata: {
    exportedBy: string;
    networkId: number;
    blockNumber: number;
  };
}

export interface ImportResult {
  success: boolean;
  importedSnapshots: number;
  errors: string[];
  warnings: string[];
}

// ===================== Utility Types =====================

export type PortfolioStateEvent = StateUpdateEvent | PositionChangeEvent | RiskAlertEvent | TransactionCompleteEvent | ErrorEvent;

export type PositionType = LendingPosition | LiquidityPosition;

export type AsyncResult<T> = TE.TaskEither<Error, T>;

export interface PaginationParams {
  offset: number;
  limit: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  platform?: string;
  tokenSymbol?: string;
  minValueUSD?: number;
  maxValueUSD?: number;
  positionType?: 'lending' | 'liquidity';
}