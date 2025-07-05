/**
 * Risk Management Core Types
 * Focused, minimal types for functional risk calculations
 */

import { WalletAddress, PortfolioSnapshot } from '../types/portfolio';

// ===================== Core Risk Types =====================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type RiskCategory = 'liquidation' | 'concentration' | 'correlation' | 'volatility';

// ===================== Risk Calculation Inputs =====================

export interface RiskMetrics {
  readonly healthFactor: number;
  readonly leverage: number;
  readonly concentration: number;
  readonly correlation: number;
  readonly volatility: number;
}

export interface RiskThresholds {
  readonly healthFactor: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
  };
  readonly concentration: {
    readonly asset: number;
    readonly protocol: number;
  };
  readonly leverage: {
    readonly max: number;
    readonly warning: number;
  };
  readonly volatility: {
    readonly daily: number;
    readonly weekly: number;
  };
}

export interface AssetAllocation {
  readonly symbol: string;
  readonly weight: number;
  readonly valueUSD: number;
  readonly volatility: number;
}

export interface ProtocolAllocation {
  readonly protocol: string;
  readonly weight: number;
  readonly valueUSD: number;
  readonly riskScore: number;
}

// ===================== Risk Assessment Results =====================

export interface RiskScore {
  readonly overall: number;
  readonly healthFactor: number;
  readonly concentration: number;
  readonly correlation: number;
  readonly volatility: number;
  readonly level: RiskLevel;
}

export interface ConcentrationAnalysis {
  readonly assets: ReadonlyArray<AssetAllocation>;
  readonly protocols: ReadonlyArray<ProtocolAllocation>;
  readonly maxAssetWeight: number;
  readonly maxProtocolWeight: number;
  readonly herfindahlIndex: number;
}

export interface CorrelationMatrix {
  readonly assets: ReadonlyArray<string>;
  readonly matrix: ReadonlyArray<ReadonlyArray<number>>;
  readonly averageCorrelation: number;
  readonly maxCorrelation: number;
}

export interface VolatilityAnalysis {
  readonly portfolioVolatility: number;
  readonly assetVolatilities: ReadonlyMap<string, number>;
  readonly valueAtRisk95: number;
  readonly expectedShortfall: number;
}

// ===================== Alert Types =====================

export interface RiskAlert {
  readonly id: string;
  readonly walletAddress: WalletAddress;
  readonly category: RiskCategory;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: string;
}

export interface AlertConfig {
  readonly enabled: boolean;
  readonly thresholds: RiskThresholds;
  readonly cooldownMs: number;
}

// ===================== Rebalancing Types =====================

export interface RebalanceTarget {
  readonly symbol: string;
  readonly currentWeight: number;
  readonly targetWeight: number;
  readonly deltaUSD: number;
}

export interface RebalancePlan {
  readonly id: string;
  readonly walletAddress: WalletAddress;
  readonly targets: ReadonlyArray<RebalanceTarget>;
  readonly totalTradeValue: number;
  readonly estimatedCost: number;
  readonly riskImprovement: number;
  readonly timestamp: string;
}

export interface RebalanceConstraints {
  readonly minTradeSize: number;
  readonly maxSlippage: number;
  readonly maxGasCost: number;
  readonly allowedTokens: ReadonlySet<string>;
}

// ===================== Market Data Types =====================

export interface PriceData {
  readonly symbol: string;
  readonly price: number;
  readonly change24h: number;
  readonly volatility: number;
  readonly timestamp: number;
}

export interface CorrelationData {
  readonly pair: readonly [string, string];
  readonly correlation: number;
  readonly period: number;
  readonly confidence: number;
}

// ===================== Monitoring Configuration =====================

export interface MonitorConfig {
  readonly updateIntervalMs: number;
  readonly riskThresholds: RiskThresholds;
  readonly alertConfig: AlertConfig;
  readonly rebalanceEnabled: boolean;
}

export interface UserRiskProfile {
  readonly walletAddress: WalletAddress;
  readonly riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  readonly autoRebalance: boolean;
  readonly customThresholds?: Partial<RiskThresholds>;
}

// ===================== Calculation Context =====================

export interface RiskCalculationContext {
  readonly snapshot: PortfolioSnapshot;
  readonly thresholds: RiskThresholds;
  readonly priceData: ReadonlyMap<string, PriceData>;
  readonly correlationData: ReadonlyArray<CorrelationData>;
  readonly timestamp: number;
}

// ===================== Result Types =====================

export interface RiskAssessmentResult {
  readonly walletAddress: WalletAddress;
  readonly timestamp: string;
  readonly riskScore: RiskScore;
  readonly metrics: RiskMetrics;
  readonly concentration: ConcentrationAnalysis;
  readonly correlation: CorrelationMatrix;
  readonly volatility: VolatilityAnalysis;
  readonly alerts: ReadonlyArray<RiskAlert>;
}

export interface MonitoringState {
  readonly isActive: boolean;
  readonly lastAssessment?: RiskAssessmentResult;
  readonly activeAlerts: ReadonlyMap<string, RiskAlert>;
  readonly lastUpdateTime: number;
}

// ===================== Error Types =====================

export interface RiskCalculationError {
  readonly type: 'calculation' | 'data' | 'validation' | 'threshold';
  readonly message: string;
  readonly context: string;
  readonly timestamp: number;
}

export interface AlertProcessingError {
  readonly alertId: string;
  readonly error: RiskCalculationError;
  readonly retryCount: number;
}

// ===================== Type Guards =====================

export const isValidRiskLevel = (level: string): level is RiskLevel =>
  ['low', 'medium', 'high', 'critical'].includes(level); // TODO: REMOVE_MOCK - Hard-coded array literals

export const isValidAlertSeverity = (severity: string): severity is AlertSeverity =>
  ['info', 'warning', 'critical'].includes(severity); // TODO: REMOVE_MOCK - Hard-coded array literals

export const isValidRiskCategory = (category: string): category is RiskCategory =>
  ['liquidation', 'concentration', 'correlation', 'volatility'].includes(category); // TODO: REMOVE_MOCK - Hard-coded array literals