/**
 * Risk Management System - Main Export Module
 * Clean functional exports for the risk management system
 */

// ===================== Types =====================
export type {
  // Core Types
  RiskLevel,
  AlertSeverity,
  RiskCategory,
  
  // Risk Metrics
  RiskMetrics,
  RiskThresholds,
  RiskScore,
  
  // Assessment Types
  RiskAssessmentResult,
  RiskCalculationContext,
  RiskCalculationError,
  
  // Asset & Portfolio Analysis
  AssetAllocation,
  ProtocolAllocation,
  ConcentrationAnalysis,
  CorrelationMatrix,
  VolatilityAnalysis,
  
  // Alert Types
  RiskAlert,
  AlertConfig,
  AlertProcessingError,
  
  // Rebalancing Types
  RebalanceTarget,
  RebalancePlan,
  RebalanceConstraints,
  
  // Configuration Types
  MonitorConfig,
  UserRiskProfile,
  MonitoringState,
  
  // Market Data Types
  PriceData,
  CorrelationData
} from './types';

// Type Guards
export {
  isValidRiskLevel,
  isValidAlertSeverity,
  isValidRiskCategory
} from './types';

// ===================== Calculations =====================
export {
  // Health & Leverage
  calculateHealthFactor,
  calculateLeverageRatio,
  
  // Risk Metrics
  calculateRiskMetrics,
  calculateCompleteRiskScore,
  mapToRiskLevel,
  
  // Concentration Analysis
  calculateAssetAllocations,
  calculateProtocolAllocations,
  calculateHerfindahlIndex,
  calculateConcentration,
  
  // Correlation Analysis
  buildCorrelationMatrix,
  
  // Volatility Analysis
  calculatePortfolioVolatility,
  calculateValueAtRisk,
  calculateVolatilityAnalysis
} from './calculations';

// ===================== Risk Monitoring =====================
export {
  // Core Assessment
  assessRisk,
  assessRiskWithProfile,
  
  // Monitoring Control
  startMonitoring,
  stopMonitoring,
  updateMonitoring,
  
  // Batch Operations
  assessMultipleWallets,
  
  // Query Functions
  getRiskAssessment,
  getActiveAlerts,
  isHighRisk,
  requiresAttention
} from './monitor';

// ===================== Rebalancing =====================
export {
  // Plan Generation
  generateRebalancePlan,
  generateEmergencyRebalance,
  
  // Evaluation
  evaluateRebalanceNeed,
  shouldExecuteRebalance,
  
  // Utilities
  getRebalanceRecommendation,
  calculateMinimumRebalanceAmount,
  prioritizeRebalanceTargets
} from './rebalancer';

// ===================== Alert System =====================
export {
  // Alert Processing
  processAlerts,
  
  // Alert Management
  getActiveAlerts as getAlertsFromState,
  getCriticalAlerts,
  acknowledgeAlertById,
  clearAlertsForWallet,
  
  // Alert Queries
  hasActiveCriticalAlerts,
  getAlertsByCategory,
  getRecentAlerts,
  getAlertStatistics,
  
  // Utilities
  createDefaultAlertConfig,
  isAlertResolved,
  cleanupResolvedAlerts
} from './alerts';

// ===================== Convenience Functions =====================

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { PortfolioSnapshot } from '../types/portfolio';
import { 
  RiskAssessmentResult, 
  UserRiskProfile, 
  PriceData, 
  CorrelationData, 
  AlertConfig,
  RebalanceConstraints,
  RiskThresholds
} from './types';
import { assessRiskWithProfile } from './monitor';
import { processAlerts, createDefaultAlertConfig } from './alerts';
import { generateRebalancePlan } from './rebalancer';

/**
 * Complete risk assessment with alerts
 * Combines risk assessment and alert processing in one operation
 */
export const assessRiskWithAlerts = (
  snapshot: PortfolioSnapshot,
  profile: UserRiskProfile,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData> = [],
  alertConfig: AlertConfig = createDefaultAlertConfig()
): TE.TaskEither<any, { assessment: RiskAssessmentResult; alerts: ReadonlyArray<any> }> =>
  pipe(
    assessRiskWithProfile(snapshot, profile, priceData, correlationData),
    TE.mapLeft(error => ({ alertId: 'assessment_error', error, retryCount: 0 })),
    TE.chain(assessment => {
      const thresholds = mergeWithDefaults(getDefaultThresholds(profile.riskTolerance), profile.customThresholds);
      const alertResult = processAlerts(assessment, thresholds, alertConfig);
      
      return pipe(
        alertResult,
        E.fold(
          error => TE.left(error),
          result => TE.right({
            assessment,
            alerts: result.alerts
          })
        )
      );
    })
  );

/**
 * Complete risk management pipeline
 * Performs assessment, generates alerts, and creates rebalance plan if needed
 */
export const completeRiskAnalysis = (
  snapshot: PortfolioSnapshot,
  profile: UserRiskProfile,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData> = [],
  rebalanceConstraints?: RebalanceConstraints
): TE.TaskEither<any, {
  assessment: RiskAssessmentResult;
  alerts: ReadonlyArray<any>;
  rebalancePlan?: any;
  recommendation: string;
}> =>
  pipe(
    assessRiskWithAlerts(snapshot, profile, priceData, correlationData),
    TE.map(({ assessment, alerts }) => {
      // Generate rebalance plan if needed
      const needsRebalancing = assessment.riskScore.level === 'high' || assessment.riskScore.level === 'critical';
      
      let rebalancePlan;
      if (needsRebalancing && rebalanceConstraints) {
        const config = {
          strategy: 'risk_parity' as const,
          constraints: rebalanceConstraints
        };
        const planResult = generateRebalancePlan(snapshot, assessment, config);
        rebalancePlan = E.isRight(planResult) ? planResult.right : undefined;
      }
      
      // Generate recommendation
      const recommendation = generateRecommendation(assessment, alerts, rebalancePlan);
      
      return {
        assessment,
        alerts,
        rebalancePlan,
        recommendation
      };
    })
  );

// ===================== Helper Functions =====================

const getDefaultThresholds = (riskTolerance: UserRiskProfile['riskTolerance']) => {
  const thresholdSets = {
    conservative: {
      healthFactor: { critical: 1.20, high: 1.35, medium: 1.50 },
      concentration: { asset: 0.25, protocol: 0.40 },
      leverage: { max: 2.0, warning: 1.5 },
      volatility: { daily: 0.02, weekly: 0.05 }
    },
    moderate: {
      healthFactor: { critical: 1.10, high: 1.25, medium: 1.40 },
      concentration: { asset: 0.35, protocol: 0.50 },
      leverage: { max: 3.0, warning: 2.0 },
      volatility: { daily: 0.03, weekly: 0.07 }
    },
    aggressive: {
      healthFactor: { critical: 1.05, high: 1.15, medium: 1.30 },
      concentration: { asset: 0.50, protocol: 0.70 },
      leverage: { max: 5.0, warning: 3.0 },
      volatility: { daily: 0.05, weekly: 0.10 }
    }
  };

  return thresholdSets[riskTolerance];
};

const mergeWithDefaults = (
  defaultThresholds: RiskThresholds,
  customThresholds?: Partial<RiskThresholds>
): RiskThresholds => ({
  ...defaultThresholds,
  ...customThresholds,
  healthFactor: { ...defaultThresholds.healthFactor, ...customThresholds?.healthFactor },
  concentration: { ...defaultThresholds.concentration, ...customThresholds?.concentration },
  leverage: { ...defaultThresholds.leverage, ...customThresholds?.leverage },
  volatility: { ...defaultThresholds.volatility, ...customThresholds?.volatility }
});

const generateRecommendation = (
  assessment: RiskAssessmentResult,
  alerts: ReadonlyArray<any>,
  rebalancePlan?: any
): string => {
  if (assessment.riskScore.level === 'critical') {
    return 'URGENT: Critical risk detected. Consider immediate action to reduce exposure.';
  }
  
  if (assessment.riskScore.level === 'high') {
    return rebalancePlan
      ? 'High risk detected. Rebalancing recommended to improve portfolio safety.'
      : 'High risk detected. Consider reducing exposure or adding defensive positions.';
  }
  
  if (alerts.length > 0) {
    return 'Portfolio shows some risk factors. Monitor closely and consider minor adjustments.';
  }
  
  return 'Portfolio risk levels are within acceptable ranges. Continue monitoring.';
};

// ===================== Constants =====================

export const DEFAULT_RISK_THRESHOLDS = {
  CONSERVATIVE: getDefaultThresholds('conservative'),
  MODERATE: getDefaultThresholds('moderate'),
  AGGRESSIVE: getDefaultThresholds('aggressive')
};

export const RISK_CATEGORIES = {
  LIQUIDATION: 'liquidation' as const,
  CONCENTRATION: 'concentration' as const,
  CORRELATION: 'correlation' as const,
  VOLATILITY: 'volatility' as const
};

export const ALERT_SEVERITIES = {
  INFO: 'info' as const,
  WARNING: 'warning' as const,
  CRITICAL: 'critical' as const
};

export const RISK_LEVELS = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const
};