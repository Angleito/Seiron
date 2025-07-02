/**
 * Risk Alert System
 * Functional alert management with Option types
 */

import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import * as M from 'fp-ts/Map';
import * as Ord from 'fp-ts/Ord';
import * as S from 'fp-ts/string';
import { WalletAddress } from '../types/portfolio';
import {
  RiskAlert,
  AlertConfig,
  AlertSeverity,
  RiskCategory,
  RiskAssessmentResult,
  RiskThresholds,
  AlertProcessingError,
  RiskCalculationError
} from './types';

// ===================== Alert State Management =====================

interface AlertState {
  readonly active: ReadonlyMap<string, RiskAlert>;
  readonly cooldowns: ReadonlyMap<string, number>;
  readonly history: ReadonlyArray<RiskAlert>;
  readonly lastProcessed: number;
}

const emptyAlertState: AlertState = {
  active: new Map(),
  cooldowns: new Map(),
  history: [],
  lastProcessed: 0
};

// ===================== Alert Generation =====================

const generateHealthFactorAlert = (
  walletAddress: WalletAddress,
  healthFactor: number,
  thresholds: RiskThresholds['healthFactor']
): O.Option<RiskAlert> => {
  const timestamp = new Date().toISOString();
  
  if (healthFactor <= thresholds.critical) {
    return O.some({
      id: `hf_critical_${walletAddress}_${Date.now()}`,
      walletAddress,
      category: 'liquidation',
      severity: 'critical',
      message: `Critical liquidation risk: Health factor ${healthFactor.toFixed(3)} below ${thresholds.critical}`,
      value: healthFactor,
      threshold: thresholds.critical,
      timestamp
    });
  }
  
  if (healthFactor <= thresholds.high) {
    return O.some({
      id: `hf_warning_${walletAddress}_${Date.now()}`,
      walletAddress,
      category: 'liquidation',
      severity: 'warning',
      message: `Low health factor: ${healthFactor.toFixed(3)} approaching liquidation threshold`,
      value: healthFactor,
      threshold: thresholds.high,
      timestamp
    });
  }
  
  return O.none;
};

const generateConcentrationAlert = (
  walletAddress: WalletAddress,
  concentration: number,
  threshold: number
): O.Option<RiskAlert> =>
  concentration > threshold
    ? O.some({
        id: `conc_${walletAddress}_${Date.now()}`,
        walletAddress,
        category: 'concentration',
        severity: 'warning',
        message: `High asset concentration: ${(concentration * 100).toFixed(1)}% in single asset`,
        value: concentration,
        threshold,
        timestamp: new Date().toISOString()
      })
    : O.none;

const generateCorrelationAlert = (
  walletAddress: WalletAddress,
  correlation: number,
  threshold: number = 0.8
): O.Option<RiskAlert> =>
  correlation > threshold
    ? O.some({
        id: `corr_${walletAddress}_${Date.now()}`,
        walletAddress,
        category: 'correlation',
        severity: 'info',
        message: `High asset correlation: ${(correlation * 100).toFixed(1)}% reduces diversification`,
        value: correlation,
        threshold,
        timestamp: new Date().toISOString()
      })
    : O.none;

const generateVolatilityAlert = (
  walletAddress: WalletAddress,
  volatility: number,
  threshold: number
): O.Option<RiskAlert> =>
  volatility > threshold
    ? O.some({
        id: `vol_${walletAddress}_${Date.now()}`,
        walletAddress,
        category: 'volatility',
        severity: 'info',
        message: `High portfolio volatility: ${(volatility * 100).toFixed(1)}% daily`,
        value: volatility,
        threshold,
        timestamp: new Date().toISOString()
      })
    : O.none;

// ===================== Alert Processing =====================

const processRiskAssessment = (
  assessment: RiskAssessmentResult,
  thresholds: RiskThresholds
): ReadonlyArray<O.Option<RiskAlert>> => [
  generateHealthFactorAlert(assessment.walletAddress, assessment.metrics.healthFactor, thresholds.healthFactor),
  generateConcentrationAlert(assessment.walletAddress, assessment.metrics.concentration, thresholds.concentration.asset),
  generateCorrelationAlert(assessment.walletAddress, assessment.metrics.correlation),
  generateVolatilityAlert(assessment.walletAddress, assessment.metrics.volatility, thresholds.volatility.daily)
];

const collectValidAlerts = (
  optionalAlerts: ReadonlyArray<O.Option<RiskAlert>>
): ReadonlyArray<RiskAlert> =>
  pipe(
    optionalAlerts,
    A.compact
  );

// ===================== Cooldown Management =====================

const isInCooldown = (
  alert: RiskAlert,
  cooldowns: ReadonlyMap<string, number>,
  cooldownMs: number
): boolean => {
  const alertKey = `${alert.category}_${alert.walletAddress}`;
  const lastTriggered = cooldowns.get(alertKey);
  const now = Date.now();
  
  return lastTriggered !== undefined && (now - lastTriggered) < cooldownMs;
};

const updateCooldowns = (
  alerts: ReadonlyArray<RiskAlert>,
  currentCooldowns: ReadonlyMap<string, number>
): ReadonlyMap<string, number> => {
  const now = Date.now();
  const newCooldowns = new Map(currentCooldowns);
  
  alerts.forEach(alert => {
    const alertKey = `${alert.category}_${alert.walletAddress}`;
    newCooldowns.set(alertKey, now);
  });
  
  return newCooldowns;
};

const filterCooldownAlerts = (
  alerts: ReadonlyArray<RiskAlert>,
  cooldowns: ReadonlyMap<string, number>,
  cooldownMs: number
): ReadonlyArray<RiskAlert> =>
  alerts.filter(alert => !isInCooldown(alert, cooldowns, cooldownMs));

// ===================== Alert Filtering and Prioritization =====================

const filterBySeverity = (
  alerts: ReadonlyArray<RiskAlert>,
  allowedSeverities: ReadonlySet<AlertSeverity>
): ReadonlyArray<RiskAlert> =>
  alerts.filter(alert => allowedSeverities.has(alert.severity));

const filterByCategory = (
  alerts: ReadonlyArray<RiskAlert>,
  allowedCategories: ReadonlySet<RiskCategory>
): ReadonlyArray<RiskAlert> =>
  alerts.filter(alert => allowedCategories.has(alert.category));

const severityOrder: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2
};

const prioritizeAlerts = (alerts: ReadonlyArray<RiskAlert>): ReadonlyArray<RiskAlert> =>
  pipe(
    alerts,
    A.sortBy([
      Ord.contramap((alert: RiskAlert) => severityOrder[alert.severity])(Ord.ordNumber),
      Ord.contramap((alert: RiskAlert) => alert.timestamp)(S.Ord)
    ])
  );

// ===================== Alert Deduplication =====================

const deduplicateAlerts = (
  newAlerts: ReadonlyArray<RiskAlert>,
  existingAlerts: ReadonlyMap<string, RiskAlert>
): ReadonlyArray<RiskAlert> => {
  const uniqueAlerts: RiskAlert[] = [];
  
  newAlerts.forEach(alert => {
    const isDuplicate = Array.from(existingAlerts.values()).some(existing =>
      existing.category === alert.category &&
      existing.walletAddress === alert.walletAddress &&
      existing.severity === alert.severity &&
      Math.abs(existing.value - alert.value) < 0.01 // Small tolerance for value changes
    );
    
    if (!isDuplicate) {
      uniqueAlerts.push(alert);
    }
  });
  
  return uniqueAlerts;
};

// ===================== Alert Lifecycle Management =====================

const addAlertsToState = (
  state: AlertState,
  newAlerts: ReadonlyArray<RiskAlert>
): AlertState => {
  const updatedActive = new Map(state.active);
  newAlerts.forEach(alert => {
    updatedActive.set(alert.id, alert);
  });
  
  return {
    ...state,
    active: updatedActive,
    history: [...state.history, ...newAlerts],
    lastProcessed: Date.now()
  };
};

const removeAlert = (
  state: AlertState,
  alertId: string
): AlertState => {
  const updatedActive = new Map(state.active);
  updatedActive.delete(alertId);
  
  return {
    ...state,
    active: updatedActive
  };
};

const acknowledgeAlert = (
  state: AlertState,
  alertId: string
): O.Option<AlertState> =>
  pipe(
    O.fromNullable(state.active.get(alertId)),
    O.map(() => removeAlert(state, alertId))
  );

// ===================== Main Alert Functions =====================

export const processAlerts = (
  assessment: RiskAssessmentResult,
  thresholds: RiskThresholds,
  config: AlertConfig,
  currentState: AlertState = emptyAlertState
): E.Either<AlertProcessingError, { alerts: ReadonlyArray<RiskAlert>, state: AlertState }> => {
  try {
    // Generate potential alerts
    const potentialAlerts = processRiskAssessment(assessment, thresholds);
    const validAlerts = collectValidAlerts(potentialAlerts);
    
    // Apply filtering
    const filteredAlerts = pipe(
      validAlerts,
      alerts => filterCooldownAlerts(alerts, currentState.cooldowns, config.cooldownMs),
      alerts => deduplicateAlerts(alerts, currentState.active),
      prioritizeAlerts
    );
    
    // Update state
    const updatedCooldowns = updateCooldowns(filteredAlerts, currentState.cooldowns);
    const newState = addAlertsToState(
      { ...currentState, cooldowns: updatedCooldowns },
      filteredAlerts
    );
    
    return E.right({
      alerts: filteredAlerts,
      state: newState
    });
  } catch (error) {
    const alertError: AlertProcessingError = {
      alertId: 'processing_error',
      error: {
        type: 'calculation',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        context: 'processAlerts',
        timestamp: Date.now()
      },
      retryCount: 0
    };
    
    return E.left(alertError);
  }
};

export const getActiveAlerts = (
  state: AlertState,
  walletAddress?: WalletAddress
): ReadonlyArray<RiskAlert> => {
  const allAlerts = Array.from(state.active.values());
  
  return walletAddress
    ? allAlerts.filter(alert => alert.walletAddress === walletAddress)
    : allAlerts;
};

export const getCriticalAlerts = (state: AlertState): ReadonlyArray<RiskAlert> =>
  pipe(
    getActiveAlerts(state),
    A.filter(alert => alert.severity === 'critical')
  );

export const acknowledgeAlertById = (
  state: AlertState,
  alertId: string
): O.Option<AlertState> =>
  acknowledgeAlert(state, alertId);

export const clearAlertsForWallet = (
  state: AlertState,
  walletAddress: WalletAddress
): AlertState => {
  const updatedActive = new Map();
  
  state.active.forEach((alert, id) => {
    if (alert.walletAddress !== walletAddress) {
      updatedActive.set(id, alert);
    }
  });
  
  return {
    ...state,
    active: updatedActive
  };
};

// ===================== Alert Query Functions =====================

export const hasActiveCriticalAlerts = (
  state: AlertState,
  walletAddress: WalletAddress
): boolean =>
  pipe(
    getActiveAlerts(state, walletAddress),
    A.some(alert => alert.severity === 'critical')
  );

export const getAlertsByCategory = (
  state: AlertState,
  category: RiskCategory,
  walletAddress?: WalletAddress
): ReadonlyArray<RiskAlert> =>
  pipe(
    getActiveAlerts(state, walletAddress),
    A.filter(alert => alert.category === category)
  );

export const getRecentAlerts = (
  state: AlertState,
  hoursBack: number = 24,
  walletAddress?: WalletAddress
): ReadonlyArray<RiskAlert> => {
  const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
  
  return pipe(
    state.history,
    A.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime &&
      (walletAddress ? alert.walletAddress === walletAddress : true)
    ),
    A.reverse // Most recent first
  );
};

// ===================== Alert Statistics =====================

export const getAlertStatistics = (
  state: AlertState,
  walletAddress?: WalletAddress
): {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<RiskCategory, number>;
  averagePerDay: number;
} => {
  const alerts = getActiveAlerts(state, walletAddress);
  const recentAlerts = getRecentAlerts(state, 24 * 7, walletAddress); // Last week
  
  const bySeverity = alerts.reduce((acc, alert) => ({
    ...acc,
    [alert.severity]: (acc[alert.severity] || 0) + 1
  }), {} as Record<AlertSeverity, number>);
  
  const byCategory = alerts.reduce((acc, alert) => ({
    ...acc,
    [alert.category]: (acc[alert.category] || 0) + 1
  }), {} as Record<RiskCategory, number>);
  
  return {
    total: alerts.length,
    bySeverity,
    byCategory,
    averagePerDay: recentAlerts.length / 7
  };
};

// ===================== Utility Functions =====================

export const createDefaultAlertConfig = (enabled: boolean = true): AlertConfig => ({
  enabled,
  thresholds: {
    healthFactor: { critical: 1.10, high: 1.25, medium: 1.40 },
    concentration: { asset: 0.40, protocol: 0.60 },
    leverage: { max: 3.0, warning: 2.0 },
    volatility: { daily: 0.03, weekly: 0.07 }
  },
  cooldownMs: 30 * 60 * 1000 // 30 minutes
});

export const isAlertResolved = (
  alert: RiskAlert,
  currentAssessment: RiskAssessmentResult
): boolean => {
  switch (alert.category) {
    case 'liquidation':
      return currentAssessment.metrics.healthFactor > alert.threshold * 1.1; // 10% buffer
    case 'concentration':
      return currentAssessment.metrics.concentration < alert.threshold * 0.9; // 10% buffer
    case 'correlation':
      return currentAssessment.metrics.correlation < alert.threshold * 0.9;
    case 'volatility':
      return currentAssessment.metrics.volatility < alert.threshold * 0.9;
    default:
      return false;
  }
};

export const cleanupResolvedAlerts = (
  state: AlertState,
  currentAssessment: RiskAssessmentResult
): AlertState => {
  const resolvedAlertIds = Array.from(state.active.entries())
    .filter(([_, alert]) => 
      alert.walletAddress === currentAssessment.walletAddress &&
      isAlertResolved(alert, currentAssessment)
    )
    .map(([id]) => id);
  
  const updatedActive = new Map(state.active);
  resolvedAlertIds.forEach(id => updatedActive.delete(id));
  
  return {
    ...state,
    active: updatedActive
  };
};