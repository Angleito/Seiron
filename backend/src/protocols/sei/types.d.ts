import { WalletAddress, TokenAddress, TransactionHash, BasePosition, AsyncResult, ProtocolAdapter } from '../../types/portfolio';
export type SeiProtocolType = 'silo' | 'citrex';
export interface SeiProtocolConfig {
    network: 'mainnet' | 'testnet' | 'devnet';
    rpcUrl: string;
    contractAddresses: {
        silo?: SiloContracts;
        citrex?: CitrexContracts;
    };
    defaultSlippage: number;
    gasLimits: {
        stake: number;
        unstake: number;
        claimRewards: number;
        openPosition: number;
        closePosition: number;
        adjustPosition: number;
    };
}
export interface SiloContracts {
    stakingContract: string;
    rewardDistributor: string;
    timelock: string;
    governance: string;
}
export interface SiloStakingPosition extends BasePosition {
    type: 'staking';
    protocol: 'silo';
    stakedToken: TokenAddress;
    stakedTokenSymbol: string;
    stakedAmount: string;
    stakedAmountFormatted: string;
    valueUSD: number;
    rewardToken: TokenAddress;
    rewardTokenSymbol: string;
    pendingRewards: string;
    pendingRewardsFormatted: string;
    pendingRewardsUSD: number;
    stakingPeriod: {
        startTime: string;
        endTime?: string;
        lockupPeriod: number;
        isLocked: boolean;
    };
    apr: number;
    apy: number;
    rewardRate: string;
    multiplier: number;
    penalties: {
        earlyUnstakePenalty: number;
        slashingRisk: number;
    };
}
export interface SiloRewardInfo {
    token: TokenAddress;
    symbol: string;
    amount: string;
    amountFormatted: string;
    valueUSD: number;
    claimableAt: string;
    vested: boolean;
    vestingPeriod?: number;
}
export interface SiloStakingMetrics {
    totalStaked: string;
    totalStakedUSD: number;
    totalRewards: string;
    totalRewardsUSD: number;
    averageStakingPeriod: number;
    totalValueLocked: number;
    participationRate: number;
    slashingEvents: number;
}
export interface SiloStakeParams {
    walletAddress: WalletAddress;
    token: TokenAddress;
    amount: string;
    stakingPeriod?: number;
    useMaxAmount?: boolean;
    acceptSlashingRisk?: boolean;
}
export interface SiloUnstakeParams {
    walletAddress: WalletAddress;
    positionId: string;
    amount: string;
    acceptPenalty?: boolean;
    emergencyUnstake?: boolean;
}
export interface SiloClaimRewardsParams {
    walletAddress: WalletAddress;
    positionId?: string;
    rewardTokens?: TokenAddress[];
    vestRewards?: boolean;
}
export interface SiloStakingPoolInfo {
    token: TokenAddress;
    symbol: string;
    totalStaked: string;
    totalStakedUSD: number;
    rewardRate: string;
    apr: number;
    apy: number;
    lockupPeriods: number[];
    multipliers: Record<string, number>;
    penalties: {
        earlyUnstake: number;
        slashing: number;
    };
    isActive: boolean;
    capacity: string;
    remainingCapacity: string;
}
export interface CitrexContracts {
    perpetualTrading: string;
    vault: string;
    priceOracle: string;
    liquidationEngine: string;
    fundingRateCalculator: string;
    riskManager: string;
}
export interface CitrexPerpetualPosition extends BasePosition {
    type: 'perpetual';
    protocol: 'citrex';
    market: string;
    marketSymbol: string;
    side: 'long' | 'short';
    size: string;
    sizeFormatted: string;
    notionalValue: number;
    entryPrice: number;
    markPrice: number;
    liquidationPrice: number;
    collateral: string;
    collateralFormatted: string;
    collateralUSD: number;
    leverage: number;
    margin: {
        initial: number;
        maintenance: number;
        available: number;
    };
    pnl: {
        unrealized: number;
        realized: number;
        total: number;
    };
    funding: {
        rate: number;
        payment: number;
        nextPayment: string;
    };
    risk: {
        liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
        marginRatio: number;
        maxLeverage: number;
    };
    fees: {
        trading: number;
        funding: number;
        total: number;
    };
}
export interface CitrexMarketData {
    market: string;
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    markPrice: number;
    indexPrice: number;
    fundingRate: number;
    nextFundingTime: string;
    openInterest: number;
    volume24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    high24h: number;
    low24h: number;
    maxLeverage: number;
    minOrderSize: number;
    tickSize: number;
    stepSize: number;
    isActive: boolean;
    maintenanceMargin: number;
    initialMargin: number;
}
export interface CitrexOpenPositionParams {
    walletAddress: WalletAddress;
    market: string;
    side: 'long' | 'short';
    size: string;
    orderType: 'market' | 'limit' | 'stop_market' | 'stop_limit';
    price?: number;
    stopPrice?: number;
    leverage: number;
    collateral: string;
    reduceOnly?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    postOnly?: boolean;
}
export interface CitrexClosePositionParams {
    walletAddress: WalletAddress;
    positionId: string;
    size?: string;
    orderType: 'market' | 'limit';
    price?: number;
    reduceOnly: boolean;
}
export interface CitrexAdjustPositionParams {
    walletAddress: WalletAddress;
    positionId: string;
    action: 'increase_size' | 'decrease_size' | 'add_margin' | 'remove_margin' | 'change_leverage';
    amount: string;
    newLeverage?: number;
}
export interface CitrexLiquidationInfo {
    positionId: string;
    walletAddress: WalletAddress;
    market: string;
    liquidationPrice: number;
    marginRatio: number;
    timeToLiquidation: number;
    requiredMargin: number;
    availableMargin: number;
    actions: {
        addMargin: number;
        reduceSize: number;
        reduceLeverage: number;
    };
}
export interface CitrexTradingMetrics {
    totalPositions: number;
    totalNotionalValue: number;
    totalCollateral: number;
    totalPnL: number;
    totalFundingPayments: number;
    totalTradingFees: number;
    winRate: number;
    averageHoldingTime: number;
    maxDrawdown: number;
    sharpeRatio: number;
    liquidationCount: number;
}
export interface SiloProtocolAdapter extends ProtocolAdapter {
    name: 'Silo';
    getStakingPositions(walletAddress: WalletAddress): AsyncResult<SiloStakingPosition[]>;
    getStakingPoolInfo(token: TokenAddress): AsyncResult<SiloStakingPoolInfo>;
    getStakingMetrics(walletAddress: WalletAddress): AsyncResult<SiloStakingMetrics>;
    stake(params: SiloStakeParams): AsyncResult<TransactionHash>;
    unstake(params: SiloUnstakeParams): AsyncResult<TransactionHash>;
    claimRewards(params: SiloClaimRewardsParams): AsyncResult<TransactionHash>;
    calculateRewards(walletAddress: WalletAddress, positionId?: string): AsyncResult<SiloRewardInfo[]>;
    estimateStakingReturns(params: SiloStakeParams): AsyncResult<{
        dailyRewards: number;
        monthlyRewards: number;
        annualRewards: number;
        apy: number;
    }>;
    calculateUnstakePenalty(positionId: string, amount: string): AsyncResult<{
        penalty: number;
        penaltyAmount: string;
        netAmount: string;
    }>;
}
export interface CitrexProtocolAdapter extends ProtocolAdapter {
    name: 'Citrex';
    getPositions(walletAddress: WalletAddress): AsyncResult<CitrexPerpetualPosition[]>;
    getPosition(positionId: string): AsyncResult<CitrexPerpetualPosition>;
    getTradingMetrics(walletAddress: WalletAddress): AsyncResult<CitrexTradingMetrics>;
    getMarketData(market?: string): AsyncResult<CitrexMarketData[]>;
    getMarkPrice(market: string): AsyncResult<number>;
    getFundingRate(market: string): AsyncResult<number>;
    openPosition(params: CitrexOpenPositionParams): AsyncResult<TransactionHash>;
    closePosition(params: CitrexClosePositionParams): AsyncResult<TransactionHash>;
    adjustPosition(params: CitrexAdjustPositionParams): AsyncResult<TransactionHash>;
    getLiquidationInfo(positionId: string): AsyncResult<CitrexLiquidationInfo>;
    calculateLiquidationPrice(params: {
        side: 'long' | 'short';
        entryPrice: number;
        leverage: number;
        maintenanceMargin: number;
    }): AsyncResult<number>;
    calculateUnrealizedPnL(positionId: string, markPrice?: number): AsyncResult<number>;
    calculateFundingPayment(positionId: string): AsyncResult<number>;
    cancelOrder(orderId: string): AsyncResult<TransactionHash>;
    cancelAllOrders(walletAddress: WalletAddress, market?: string): AsyncResult<TransactionHash>;
}
export declare class SiloProtocolError extends Error {
    code: string;
    details?: any;
    constructor(message: string, code: string, details?: any);
}
export declare class CitrexProtocolError extends Error {
    code: string;
    details?: any;
    constructor(message: string, code: string, details?: any);
}
export interface SiloStakingEvent {
    type: 'stake' | 'unstake' | 'rewards_claimed' | 'slashing' | 'penalty_applied';
    walletAddress: WalletAddress;
    positionId: string;
    amount: string;
    timestamp: string;
    transactionHash: TransactionHash;
    metadata?: any;
}
export interface CitrexTradingEvent {
    type: 'position_opened' | 'position_closed' | 'position_adjusted' | 'liquidation' | 'funding_payment';
    walletAddress: WalletAddress;
    positionId: string;
    market: string;
    amount: string;
    price: number;
    timestamp: string;
    transactionHash: TransactionHash;
    metadata?: any;
}
export interface SiloConfig {
    contracts: SiloContracts;
    defaultStakingPeriod: number;
    maxStakingPeriod: number;
    penaltyGracePeriod: number;
    slashingThreshold: number;
    rewardDistributionInterval: number;
}
export interface CitrexConfig {
    contracts: CitrexContracts;
    defaultLeverage: number;
    maxLeverage: number;
    minMarginRatio: number;
    liquidationBuffer: number;
    fundingInterval: number;
    maxPositionSize: number;
}
export type SiloOperationType = 'stake' | 'unstake' | 'claim_rewards';
export type CitrexOperationType = 'open_position' | 'close_position' | 'adjust_position' | 'liquidate';
export interface ProtocolOperationResult {
    success: boolean;
    transactionHash?: TransactionHash;
    error?: string;
    gasUsed?: string;
    effectiveGasPrice?: string;
    timestamp: string;
}
export interface ProtocolHealth {
    protocol: SeiProtocolType;
    isOperational: boolean;
    lastUpdate: string;
    metrics: {
        responseTime: number;
        successRate: number;
        errorRate: number;
    };
    issues: string[];
}
export interface SeiProtocolIntegration {
    silo: SiloProtocolAdapter;
    citrex: CitrexProtocolAdapter;
    config: SeiProtocolConfig;
    health: ProtocolHealth[];
}
export interface ProtocolPositionUnion {
    silo: SiloStakingPosition;
    citrex: CitrexPerpetualPosition;
}
export type SeiProtocolPosition = SiloStakingPosition | CitrexPerpetualPosition;
export type SeiProtocolEvent = SiloStakingEvent | CitrexTradingEvent;
export type SeiProtocolAdapter = SiloProtocolAdapter | CitrexProtocolAdapter;
