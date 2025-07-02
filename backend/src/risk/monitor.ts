/**
 * Risk Monitoring System
 * Functional monitoring with TaskEither for async operations
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { WalletAddress, PortfolioSnapshot } from '../types/portfolio';
import {
  RiskAssessmentResult,
  RiskCalculationContext,
  RiskCalculationError,
  MonitoringState,
  MonitorConfig,
  UserRiskProfile,
  PriceData,
  CorrelationData,
  RiskThresholds,
  RiskAlert
} from './types';
import {
  calculateRiskMetrics,
  calculateCompleteRiskScore,
  calculateConcentration,
  calculateVolatilityAnalysis,
  buildCorrelationMatrix
} from './calculations';

// ===================== Error Constructors =====================

const mkCalculationError = (
  type: RiskCalculationError['type'],
  message: string,
  context: string
): RiskCalculationError => ({
  type,
  message,
  context,
  timestamp: Date.now()
});

const mkDataError = (message: string, context: string): RiskCalculationError =>
  mkCalculationError('data', message, context);

const mkValidationError = (message: string, context: string): RiskCalculationError =>
  mkCalculationError('validation', message, context);

// ===================== Validation Functions =====================

const validatePortfolioSnapshot = (snapshot: PortfolioSnapshot): E.Either<RiskCalculationError, PortfolioSnapshot> =>
  snapshot.totalValueUSD >= 0 && snapshot.netWorth >= 0
    ? E.right(snapshot)
    : E.left(mkValidationError('Invalid portfolio values', 'validatePortfolioSnapshot'));

const validatePriceData = (priceData: ReadonlyMap<string, PriceData>): E.Either<RiskCalculationError, ReadonlyMap<string, PriceData>> =>
  priceData.size > 0
    ? E.right(priceData)
    : E.left(mkDataError('No price data available', 'validatePriceData'));

const validateRiskThresholds = (thresholds: RiskThresholds): E.Either<RiskCalculationError, RiskThresholds> =>
  thresholds.healthFactor.critical > 0 && thresholds.concentration.asset > 0
    ? E.right(thresholds)
    : E.left(mkValidationError('Invalid risk thresholds', 'validateRiskThresholds'));

// ===================== Context Building =====================

const buildCalculationContext = (
  snapshot: PortfolioSnapshot,
  thresholds: RiskThresholds,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData>
): E.Either<RiskCalculationError, RiskCalculationContext> =>
  pipe(
    E.Do,
    E.bind('snapshot', () => validatePortfolioSnapshot(snapshot)),
    E.bind('thresholds', () => validateRiskThresholds(thresholds)),
    E.bind('priceData', () => validatePriceData(priceData)),
    E.map(({ snapshot, thresholds, priceData }) => ({
      snapshot,
      thresholds,
      priceData,
      correlationData,
      timestamp: Date.now()
    }))
  );

// ===================== Risk Assessment Pipeline =====================

const performRiskCalculations = (
  context: RiskCalculationContext
): E.Either<RiskCalculationError, RiskAssessmentResult> => {
  try {
    const { snapshot, thresholds, priceData, correlationData } = context;
    
    // Core risk metrics
    const metrics = calculateRiskMetrics(snapshot, priceData, correlationData);
    const riskScore = calculateCompleteRiskScore(metrics, thresholds);
    
    // Detailed analysis
    const concentration = calculateConcentration(snapshot, priceData);
    const assets = concentration.assets.map(a => a.symbol);
    const correlationMatrix = buildCorrelationMatrix(assets, correlationData);
    const volatility = calculateVolatilityAnalysis(snapshot, concentration.assets, correlationMatrix);
    
    const result: RiskAssessmentResult = {
      walletAddress: snapshot.walletAddress,
      timestamp: new Date().toISOString(),
      riskScore,
      metrics,
      concentration,
      correlation: correlationMatrix,
      volatility,
      alerts: [] // Alerts will be generated separately
    };
    
    return E.right(result);
  } catch (error) {
    return E.left(mkCalculationError(
      'calculation',
      error instanceof Error ? error.message : 'Unknown calculation error',
      'performRiskCalculations'
    ));
  }
};

// ===================== Alert Generation =====================

const generateRiskAlerts = (
  assessment: RiskAssessmentResult,
  thresholds: RiskThresholds
): ReadonlyArray<RiskAlert> => {
  const alerts: RiskAlert[] = [];
  const { walletAddress, metrics, riskScore } = assessment;
  const timestamp = new Date().toISOString();

  // Health factor alerts
  if (metrics.healthFactor <= thresholds.healthFactor.critical) {
    alerts.push({
      id: `hf_critical_${Date.now()}`,
      walletAddress,
      category: 'liquidation',
      severity: 'critical',
      message: `Critical health factor: ${metrics.healthFactor.toFixed(3)}`,
      value: metrics.healthFactor,
      threshold: thresholds.healthFactor.critical,
      timestamp
    });
  } else if (metrics.healthFactor <= thresholds.healthFactor.high) {
    alerts.push({
      id: `hf_high_${Date.now()}`,
      walletAddress,
      category: 'liquidation',
      severity: 'warning',
      message: `Low health factor: ${metrics.healthFactor.toFixed(3)}`,
      value: metrics.healthFactor,
      threshold: thresholds.healthFactor.high,
      timestamp
    });
  }

  // Concentration alerts
  if (metrics.concentration > thresholds.concentration.asset) {
    alerts.push({
      id: `conc_${Date.now()}`,
      walletAddress,
      category: 'concentration',
      severity: 'warning',
      message: `High asset concentration: ${(metrics.concentration * 100).toFixed(1)}%`,
      value: metrics.concentration,
      threshold: thresholds.concentration.asset,
      timestamp
    });
  }

  // Volatility alerts
  if (metrics.volatility > thresholds.volatility.daily) {
    alerts.push({
      id: `vol_${Date.now()}`,
      walletAddress,
      category: 'volatility',
      severity: 'info',
      message: `High portfolio volatility: ${(metrics.volatility * 100).toFixed(1)}%`,
      value: metrics.volatility,
      threshold: thresholds.volatility.daily,
      timestamp
    });
  }

  return alerts;
};

// ===================== Monitoring State Management =====================

const createMonitoringState = (assessment?: RiskAssessmentResult): MonitoringState => ({
  isActive: true,
  lastAssessment: assessment,
  activeAlerts: new Map(),
  lastUpdateTime: Date.now()
});

const updateMonitoringState = (
  state: MonitoringState,
  assessment: RiskAssessmentResult
): MonitoringState => ({
  ...state,
  lastAssessment: assessment,
  activeAlerts: new Map(assessment.alerts.map(alert => [alert.id, alert])),
  lastUpdateTime: Date.now()
});

// ===================== Main Monitoring Functions =====================

export const assessRisk = (
  snapshot: PortfolioSnapshot,
  thresholds: RiskThresholds,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData> = []
): TE.TaskEither<RiskCalculationError, RiskAssessmentResult> =>
  TE.fromEither(
    pipe(
      buildCalculationContext(snapshot, thresholds, priceData, correlationData),
      E.chain(performRiskCalculations),
      E.map(assessment => ({
        ...assessment,
        alerts: generateRiskAlerts(assessment, thresholds)
      }))
    )
  );

export const assessRiskWithProfile = (
  snapshot: PortfolioSnapshot,
  profile: UserRiskProfile,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData> = []
): TE.TaskEither<RiskCalculationError, RiskAssessmentResult> => {
  const thresholds = mergeThresholds(getDefaultThresholds(profile.riskTolerance), profile.customThresholds);
  return assessRisk(snapshot, thresholds, priceData, correlationData);
};

// ===================== Monitoring Control =====================

export const startMonitoring = (
  walletAddress: WalletAddress,
  config: MonitorConfig
): TE.TaskEither<RiskCalculationError, MonitoringState> =>
  TE.right(createMonitoringState());

export const stopMonitoring = (
  walletAddress: WalletAddress
): TE.TaskEither<RiskCalculationError, void> =>
  TE.right(void 0);

export const updateMonitoring = (
  state: MonitoringState,
  assessment: RiskAssessmentResult
): TE.TaskEither<RiskCalculationError, MonitoringState> =>
  TE.right(updateMonitoringState(state, assessment));

// ===================== Batch Operations =====================

export const assessMultipleWallets = (
  wallets: ReadonlyArray<WalletAddress>,
  getSnapshot: (wallet: WalletAddress) => TE.TaskEither<Error, PortfolioSnapshot>,
  getProfile: (wallet: WalletAddress) => TE.TaskEither<Error, UserRiskProfile>,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData>
): TE.TaskEither<RiskCalculationError, ReadonlyArray<RiskAssessmentResult>> =>
  pipe(
    wallets,
    A.map(wallet =>
      pipe(
        TE.Do,
        TE.bind('snapshot', () => 
          pipe(
            getSnapshot(wallet),
            TE.mapLeft(error => mkDataError(error.message, `getSnapshot_${wallet}`))
          )
        ),
        TE.bind('profile', () =>
          pipe(
            getProfile(wallet),
            TE.mapLeft(error => mkDataError(error.message, `getProfile_${wallet}`))
          )
        ),
        TE.chain(({ snapshot, profile }) =>
          assessRiskWithProfile(snapshot, profile, priceData, correlationData)
        )
      )
    ),
    A.sequence(TE.ApplicativePar)
  );

// ===================== Utility Functions =====================

const getDefaultThresholds = (riskTolerance: UserRiskProfile['riskTolerance']): RiskThresholds => {
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

const mergeThresholds = (
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

// ===================== Query Functions =====================

export const getRiskAssessment = (
  walletAddress: WalletAddress,
  state: MonitoringState
): O.Option<RiskAssessmentResult> =>
  state.lastAssessment?.walletAddress === walletAddress
    ? O.some(state.lastAssessment)
    : O.none;

export const getActiveAlerts = (
  walletAddress: WalletAddress,
  state: MonitoringState
): ReadonlyArray<RiskAlert> =>
  Array.from(state.activeAlerts.values());

export const isHighRisk = (assessment: RiskAssessmentResult): boolean =>
  assessment.riskScore.level === 'high' || assessment.riskScore.level === 'critical';

export const requiresAttention = (assessment: RiskAssessmentResult): boolean =>
  assessment.alerts.some(alert => alert.severity === 'critical' || alert.severity === 'warning');