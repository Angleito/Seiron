/**
 * Risk Management Types and Interfaces
 * Comprehensive types for risk monitoring and automated rebalancing
 */

import * as TE from 'fp-ts/TaskEither';
import { WalletAddress, PortfolioSnapshot, AsyncResult, LendingPosition, LiquidityPosition } from './portfolio';

// ===================== Risk Levels and Severity =====================

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type RiskCategory = 
  | 'liquidation' 
  | 'concentration' 
  | 'correlation' 
  | 'impermanent_loss' 
  | 'volatility' 
  | 'leverage' 
  | 'market_condition'
  | 'smart_contract'
  | 'bridge_risk';

// ===================== Risk Thresholds Configuration =====================

export interface RiskThresholds {
  healthFactor: {
    critical: number;    // e.g., 1.05
    high: number;        // e.g., 1.15
    medium: number;      // e.g., 1.30
    low: number;         // e.g., 1.50
  };
  concentrationRisk: {
    singleAsset: number;      // e.g., 0.40 (40%)
    singleProtocol: number;   // e.g., 0.60 (60%)
    singleStrategy: number;   // e.g., 0.70 (70%)
  };
  leverageRisk: {
    maxLeverage: number;      // e.g., 3.0 (3x)
    warningLeverage: number;  // e.g., 2.5 (2.5x)
  };
  impermanentLoss: {
    critical: number;    // e.g., 0.20 (20%)
    high: number;        // e.g., 0.15 (15%)
    medium: number;      // e.g., 0.10 (10%)
  };
  volatility: {
    dailyVaR: number;         // Value at Risk (95% confidence)
    maxDrawdown: number;      // Maximum acceptable drawdown
    correlationLimit: number; // Maximum correlation between assets
  };
  liquidityRisk: {
    minLiquidity: number;     // Minimum USD liquidity in pools
    maxSlippage: number;      // Maximum acceptable slippage
  };
}

export interface UserRiskProfile {
  walletAddress: WalletAddress;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  customThresholds?: Partial<RiskThresholds>;
  autoRebalance: boolean;
  emergencyProtection: boolean;
  alertPreferences: AlertPreferences;
  lastUpdated: string;
}

export interface AlertPreferences {
  email: boolean;
  websocket: boolean;
  telegram?: boolean;
  severity: AlertSeverity[];
  categories: RiskCategory[];
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
}

// ===================== Risk Assessment Types =====================

export interface RiskAssessment {
  walletAddress: WalletAddress;
  timestamp: string;
  overallRisk: RiskLevel;
  riskScore: number; // 0-100 scale
  healthScore: number; // 0-100 scale
  risks: RiskFactor[];
  liquidationRisk: LiquidationRisk;
  concentrationRisk: ConcentrationRisk;
  correlationRisk: CorrelationRisk;
  impermanentLossRisk: ImpermanentLossRisk;
  leverageRisk: LeverageRisk;
  volatilityRisk: VolatilityRisk;
  marketConditionRisk: MarketConditionRisk;
  recommendations: RiskRecommendation[];
  alerts: RiskAlert[];
}

export interface RiskFactor {
  category: RiskCategory;
  level: RiskLevel;
  score: number; // 0-100
  weight: number; // Importance weight in overall score
  description: string;
  impact: number; // Potential USD impact
  timeframe: string; // When this risk might materialize
  mitigationStrategies: string[];
}

export interface LiquidationRisk {
  healthFactor: number;
  timeToLiquidation?: number; // Hours until liquidation at current rate
  liquidationPrice: Record<string, number>; // Token -> liquidation price
  bufferAmount: number; // USD amount needed to maintain safe health factor
  criticalPositions: LendingPosition[];
  protectionStrategies: LiquidationProtectionStrategy[];
}

export interface ConcentrationRisk {
  assetConcentration: Record<string, number>; // Token symbol -> percentage
  protocolConcentration: Record<string, number>; // Protocol -> percentage
  strategyConcentration: Record<string, number>; // Strategy type -> percentage
  largestPosition: {
    type: 'asset' | 'protocol' | 'strategy';
    identifier: string;
    percentage: number;
    valueUSD: number;
  };
  diversificationScore: number; // 0-100
}

export interface CorrelationRisk {
  assetCorrelations: Record<string, Record<string, number>>; // Token pairs correlation matrix
  highlyCorrelatedPairs: CorrelatedPair[];
  portfolioCorrelation: number; // Overall portfolio correlation
  diversificationBenefit: number; // How much correlation reduces portfolio risk
}

export interface CorrelatedPair {
  asset1: string;
  asset2: string;
  correlation: number;
  combinedWeight: number; // Combined portfolio weight
  riskContribution: number;
}

export interface ImpermanentLossRisk {
  totalImpermanentLoss: number; // Current total IL in USD
  positionIL: Record<string, number>; // Position ID -> IL amount
  projectedIL: Record<string, number>; // Position ID -> projected IL (24h)
  highRiskPositions: LiquidityPosition[];
  hedgingOpportunities: HedgingStrategy[];
}

export interface LeverageRisk {
  totalLeverage: number;
  positionLeverage: Record<string, number>; // Position ID -> leverage ratio
  leverageUtilization: number; // Current leverage / max safe leverage
  marginCallPrice: Record<string, number>; // Token -> margin call price
  delevaragingOptions: DeleveragingOption[];
}

export interface VolatilityRisk {
  portfolioVolatility: number; // Annualized volatility
  valueAtRisk: Record<string, number>; // Period -> VaR amount
  expectedShortfall: Record<string, number>; // Period -> ES amount
  maxDrawdown: number;
  volatilityContribution: Record<string, number>; // Asset -> vol contribution
}

export interface MarketConditionRisk {
  marketRegime: 'bull' | 'bear' | 'sideways' | 'volatile' | 'unknown';
  marketStress: number; // 0-100 stress indicator
  liquidityConditions: 'normal' | 'stressed' | 'crisis';
  correlationBreakdown: boolean; // Are correlations increasing unusually?
  riskOnOff: 'risk_on' | 'risk_off' | 'neutral';
  macroFactors: MacroFactor[];
}

export interface MacroFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  significance: number; // 0-1
}

// ===================== Risk Alerts =====================

export interface RiskAlert {
  id: string;
  walletAddress: WalletAddress;
  category: RiskCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  triggered: boolean;
  acknowledged: boolean;
  resolved: boolean;
  actionRequired: boolean;
  metadata: AlertMetadata;
  recommendations: string[];
  autoActions?: AutoAction[];
}

export interface AlertMetadata {
  positionIds?: string[];
  tokens?: string[];
  protocols?: string[];
  values?: Record<string, number>;
  thresholds?: Record<string, number>;
  timeframe?: string;
  confidence?: number;
}

export interface AutoAction {
  type: 'rebalance' | 'hedge' | 'deleverage' | 'emergency_exit' | 'stop_loss';
  enabled: boolean;
  executed: boolean;
  parameters: Record<string, any>;
  executedAt?: string;
  result?: ActionResult;
}

export interface ActionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  impactUSD?: number;
}

// ===================== Rebalancing Types =====================

export interface RebalancingStrategy {
  name: string;
  type: RebalancingType;
  parameters: RebalancingParameters;
  triggers: RebalancingTrigger[];
  constraints: RebalancingConstraints;
  enabled: boolean;
}

export type RebalancingType = 
  | 'threshold_based'    // Rebalance when allocations drift
  | 'time_based'        // Rebalance on schedule
  | 'volatility_based'  // Rebalance based on volatility
  | 'risk_parity'       // Equal risk contribution
  | 'momentum'          // Follow momentum
  | 'mean_reversion'    // Contrarian approach
  | 'dynamic_hedge'     // Dynamic hedging
  | 'emergency'         // Emergency rebalancing;

export interface RebalancingParameters {
  targetAllocations?: Record<string, number>; // Asset -> target weight
  rebalanceThreshold?: number; // Drift threshold to trigger rebalance
  minRebalanceAmount?: number; // Minimum USD amount to rebalance
  maxTradeSize?: number; // Maximum single trade size
  slippageTolerance?: number; // Maximum acceptable slippage
  gasLimit?: number; // Maximum gas to spend on rebalancing
  cooldownPeriod?: number; // Minutes between rebalances
  riskBudget?: number; // Maximum risk to take during rebalancing
}

export interface RebalancingTrigger {
  type: 'drift' | 'time' | 'risk' | 'volatility' | 'market_condition' | 'manual';
  threshold: number;
  enabled: boolean;
  lastTriggered?: string;
}

export interface RebalancingConstraints {
  minPositionSize: number; // USD
  maxPositionSize: number; // USD
  maxLeverage: number;
  allowedTokens: string[];
  bannedTokens: string[];
  allowedProtocols: string[];
  bannedProtocols: string[];
  maxSlippage: number;
  maxGasCost: number; // USD
}

export interface RebalancingPlan {
  id: string;
  walletAddress: WalletAddress;
  strategy: RebalancingStrategy;
  timestamp: string;
  reason: string;
  currentAllocations: Record<string, number>;
  targetAllocations: Record<string, number>;
  trades: RebalancingTrade[];
  estimatedCost: RebalancingCost;
  riskImpact: RiskImpact;
  approved: boolean;
  executed: boolean;
  executionResult?: RebalancingResult;
}

export interface RebalancingTrade {
  from: string; // Token or position to sell/reduce
  to: string;   // Token or position to buy/increase
  amount: string; // Amount to trade
  amountUSD: number;
  protocol: string; // Where to execute the trade
  estimatedSlippage: number;
  estimatedGas: number;
  priority: number; // Execution priority
}

export interface RebalancingCost {
  totalGasUSD: number;
  totalSlippageUSD: number;
  protocolFeesUSD: number;
  impactCostUSD: number;
  totalCostUSD: number;
  costPercentage: number; // Cost as % of portfolio
}

export interface RiskImpact {
  currentRisk: number;
  projectedRisk: number;
  riskReduction: number;
  healthFactorImpact: number;
  diversificationImpact: number;
  volatilityImpact: number;
}

export interface RebalancingResult {
  success: boolean;
  executedTrades: ExecutedTrade[];
  actualCost: RebalancingCost;
  actualRiskImpact: RiskImpact;
  errors: string[];
  partialExecution: boolean;
  completedAt: string;
}

export interface ExecutedTrade {
  trade: RebalancingTrade;
  transactionHash: string;
  actualAmount: string;
  actualSlippage: number;
  actualGas: number;
  success: boolean;
  error?: string;
}

// ===================== Protection Strategies =====================

export interface LiquidationProtectionStrategy {
  type: 'supply_more' | 'repay_debt' | 'swap_to_stable' | 'emergency_exit';
  priority: number;
  threshold: number; // Health factor threshold to activate
  parameters: Record<string, any>;
  enabled: boolean;
  autoExecute: boolean;
}

export interface HedgingStrategy {
  type: 'short_future' | 'buy_put' | 'sell_call' | 'pair_trade' | 'stable_rebalance';
  hedgeRatio: number; // 0-1, portion of position to hedge
  cost: number; // USD cost of hedge
  effectiveness: number; // 0-1, how well it hedges
  timeframe: number; // Days the hedge is effective
  implementation: HedgeImplementation;
}

export interface HedgeImplementation {
  protocol: string;
  parameters: Record<string, any>;
  estimatedCost: number;
  estimatedSlippage: number;
}

export interface DeleveragingOption {
  type: 'repay_debt' | 'withdraw_collateral' | 'swap_and_repay';
  amount: string;
  amountUSD: number;
  leverageReduction: number;
  healthFactorImprovement: number;
  cost: number;
  implementation: DeleverageImplementation;
}

export interface DeleverageImplementation {
  steps: DeleverageStep[];
  totalCost: number;
  timeEstimate: number; // Minutes
  riskLevel: RiskLevel;
}

export interface DeleverageStep {
  action: 'withdraw' | 'swap' | 'repay';
  token: string;
  amount: string;
  protocol: string;
  estimatedGas: number;
  dependencies: string[]; // Previous step IDs this depends on
}

// ===================== Risk Recommendations =====================

export interface RiskRecommendation {
  id: string;
  category: RiskCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: RecommendationImpact;
  implementation: RecommendationImplementation;
  alternatives: RiskRecommendation[];
  timeframe: string;
  confidence: number; // 0-1
}

export interface RecommendationImpact {
  riskReduction: number; // Expected risk score reduction
  costUSD: number; // Implementation cost
  portfolioImpact: number; // Expected portfolio performance impact
  timeToImplement: number; // Minutes
  reversibility: number; // How easily can this be undone (0-1)
}

export interface RecommendationImplementation {
  type: 'manual' | 'semi_auto' | 'auto';
  steps: ImplementationStep[];
  requirements: string[]; // What's needed to implement
  risks: string[]; // Risks of implementing
}

export interface ImplementationStep {
  description: string;
  action: 'user_action' | 'transaction' | 'approval' | 'wait';
  parameters?: Record<string, any>;
  estimatedTime: number; // Minutes
}

// ===================== Market Monitoring =====================

export interface MarketCondition {
  timestamp: string;
  overall: MarketRegime;
  volatility: VolatilityCondition;
  liquidity: LiquidityCondition;
  correlation: CorrelationCondition;
  sentiment: SentimentCondition;
  technicals: TechnicalCondition;
  fundamentals: FundamentalCondition;
}

export interface MarketRegime {
  regime: 'bull' | 'bear' | 'sideways' | 'volatile';
  strength: number; // 0-1
  duration: number; // Days in current regime
  stability: number; // How stable the regime is
}

export interface VolatilityCondition {
  level: 'low' | 'normal' | 'elevated' | 'high' | 'extreme';
  percentile: number; // Historical percentile
  realized: number; // Recent realized volatility
  implied: number; // Implied volatility from options
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface LiquidityCondition {
  level: 'normal' | 'stressed' | 'crisis';
  bidAskSpreads: Record<string, number>; // Token -> spread
  marketDepth: Record<string, number>; // Token -> depth at 1% impact
  liquidityIndex: number; // 0-100
}

export interface CorrelationCondition {
  level: 'normal' | 'elevated' | 'crisis';
  averageCorrelation: number;
  correlationTrend: 'increasing' | 'decreasing' | 'stable';
  breakdownRisk: number; // Risk of correlation breakdown
}

export interface SentimentCondition {
  overall: 'bullish' | 'bearish' | 'neutral';
  fearGreedIndex: number; // 0-100
  socialSentiment: number; // -1 to 1
  newsFlow: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface TechnicalCondition {
  trend: 'uptrend' | 'downtrend' | 'sideways';
  momentum: number; // -1 to 1
  support: number; // Support level
  resistance: number; // Resistance level
  technicalStrength: number; // 0-100
}

export interface FundamentalCondition {
  valuation: 'undervalued' | 'fair' | 'overvalued';
  growth: number; // Expected growth rate
  macroEnvironment: 'supportive' | 'neutral' | 'headwinds';
  regulatoryRisk: number; // 0-1
}

// ===================== Analytics and Reporting =====================

export interface RiskReport {
  walletAddress: WalletAddress;
  reportDate: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  summary: RiskSummary;
  detailedAssessment: RiskAssessment;
  historicalRisk: HistoricalRiskData[];
  performanceAttribution: PerformanceAttribution;
  recommendations: RiskRecommendation[];
  appendices: ReportAppendix[];
}

export interface RiskSummary {
  overallRisk: RiskLevel;
  riskScore: number;
  riskChange: number; // Change from previous period
  keyRisks: RiskFactor[];
  keyChanges: string[];
  actionItems: ActionItem[];
}

export interface HistoricalRiskData {
  date: string;
  riskScore: number;
  healthFactor: number;
  leverageRatio: number;
  concentrationRisk: number;
  volatility: number;
  events: string[]; // Notable events on this date
}

export interface PerformanceAttribution {
  totalReturn: number;
  riskAdjustedReturn: number;
  returnBreakdown: Record<string, number>; // Source -> contribution
  riskContribution: Record<string, number>; // Source -> risk contribution
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export interface ActionItem {
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  deadline: string;
  category: RiskCategory;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface ReportAppendix {
  title: string;
  type: 'table' | 'chart' | 'text' | 'calculation';
  content: any;
  description: string;
}

// ===================== Configuration and Interfaces =====================

export interface RiskMonitorConfig {
  updateInterval: number; // Milliseconds between assessments
  alertCooldown: number; // Milliseconds between duplicate alerts
  riskThresholds: RiskThresholds;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  autoRebalanceEnabled: boolean;
  emergencyProtectionEnabled: boolean;
  maxConcurrentAssessments: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface RiskMonitorInterface {
  initialize(): AsyncResult<void>;
  startMonitoring(walletAddress: WalletAddress): AsyncResult<void>;
  stopMonitoring(walletAddress: WalletAddress): AsyncResult<void>;
  assessRisk(walletAddress: WalletAddress): AsyncResult<RiskAssessment>;
  updateRiskProfile(profile: UserRiskProfile): AsyncResult<void>;
  getRiskAssessment(walletAddress: WalletAddress): AsyncResult<RiskAssessment>;
  getActiveAlerts(walletAddress: WalletAddress): AsyncResult<RiskAlert[]>;
  acknowledgeAlert(alertId: string): AsyncResult<void>;
  generateRiskReport(walletAddress: WalletAddress, period: string): AsyncResult<RiskReport>;
}

export interface RebalancingEngineInterface {
  initialize(): AsyncResult<void>;
  createRebalancingPlan(walletAddress: WalletAddress, strategy: RebalancingStrategy): AsyncResult<RebalancingPlan>;
  executeRebalancing(planId: string): AsyncResult<RebalancingResult>;
  getRebalancingHistory(walletAddress: WalletAddress): AsyncResult<RebalancingResult[]>;
  evaluateStrategy(walletAddress: WalletAddress, strategy: RebalancingStrategy): AsyncResult<StrategyEvaluation>;
  getRecommendedStrategies(walletAddress: WalletAddress): AsyncResult<RebalancingStrategy[]>;
}

export interface StrategyEvaluation {
  strategy: RebalancingStrategy;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  maxDrawdown: number;
  implementationCost: number;
  complexity: number;
  suitability: number; // 0-1 based on user profile
  backtestResults?: BacktestResult;
}

export interface BacktestResult {
  period: string;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
  avgTradeReturn: number;
}

// ===================== Event Types =====================

export interface RiskEvent {
  type: 'risk_assessment' | 'alert_triggered' | 'rebalance_executed' | 'threshold_updated' | 'emergency_action';
  walletAddress: WalletAddress;
  timestamp: string;
  data: any;
}

export interface RiskAssessmentEvent extends RiskEvent {
  type: 'risk_assessment';
  data: {
    assessment: RiskAssessment;
    changes: RiskChange[];
  };
}

export interface AlertTriggeredEvent extends RiskEvent {
  type: 'alert_triggered';
  data: {
    alert: RiskAlert;
    assessment: RiskAssessment;
  };
}

export interface RebalanceExecutedEvent extends RiskEvent {
  type: 'rebalance_executed';
  data: {
    plan: RebalancingPlan;
    result: RebalancingResult;
  };
}

export interface RiskChange {
  category: RiskCategory;
  oldLevel: RiskLevel;
  newLevel: RiskLevel;
  oldScore: number;
  newScore: number;
  significance: number; // 0-1
}

// ===================== Utility Types =====================

export type RiskEventType = RiskAssessmentEvent | AlertTriggeredEvent | RebalanceExecutedEvent;

export interface RiskCalculationInput {
  snapshot: PortfolioSnapshot;
  marketData: MarketCondition;
  priceHistory: Record<string, number[]>; // Token -> price history
  userProfile: UserRiskProfile;
  thresholds: RiskThresholds;
}

export interface EmergencyProcedure {
  name: string;
  trigger: EmergencyTrigger;
  actions: EmergencyAction[];
  autoExecute: boolean;
  confirmationRequired: boolean;
}

export interface EmergencyTrigger {
  type: 'health_factor' | 'liquidation_imminent' | 'black_swan' | 'system_failure';
  threshold: number;
  confidence: number;
}

export interface EmergencyAction {
  type: 'close_positions' | 'add_collateral' | 'hedge_portfolio' | 'convert_to_stable' | 'notify_user';
  priority: number;
  parameters: Record<string, any>;
  maxCost: number; // Maximum cost to execute
  timeLimit: number; // Seconds to execute
}