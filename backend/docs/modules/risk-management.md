# Risk Management Module

The risk management system provides comprehensive portfolio risk assessment using functional programming principles and fp-ts for robust error handling and composable calculations.

## Table of Contents

- [Overview](#overview)
- [Module Structure](#module-structure)
- [Core Types](#core-types)
- [Risk Calculations](#risk-calculations)
- [Monitoring System](#monitoring-system)
- [Alert System](#alert-system)
- [Rebalancing Engine](#rebalancing-engine)
- [Usage Examples](#usage-examples)
- [Testing](#testing)

## Overview

The risk module implements:
- **Pure functional** risk calculations
- **Immutable** data structures
- **Type-safe** risk metrics
- **Composable** risk assessment pipeline
- **Real-time** monitoring and alerts

## Module Structure

```
src/risk/
├── types.ts           # Core risk types and interfaces
├── calculations.ts    # Pure risk calculation functions
├── monitor.ts         # Risk monitoring service
├── alerts.ts          # Alert generation and management
├── rebalancer.ts      # Portfolio rebalancing logic
├── index.ts           # Module exports
└── __tests__/         # Comprehensive test suite
    ├── calculations.test.ts
    ├── calculations.property.test.ts
    └── types.test.ts
```

## Core Types

### Risk Levels and Categories

```typescript
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type RiskCategory = 'liquidation' | 'concentration' | 'correlation' | 'volatility';
```

### Risk Metrics Interface

```typescript
export interface RiskMetrics {
  readonly healthFactor: number;
  readonly leverage: number;
  readonly concentration: number;
  readonly correlation: number;
  readonly volatility: number;
}
```

### Risk Thresholds Configuration

```typescript
export interface RiskThresholds {
  readonly healthFactor: {
    readonly critical: number;    // < 1.1
    readonly high: number;        // < 1.3
    readonly medium: number;      // < 1.5
  };
  readonly concentration: {
    readonly asset: number;       // > 50%
    readonly protocol: number;    // > 70%
  };
  readonly leverage: {
    readonly max: number;         // > 3x
    readonly warning: number;     // > 2x
  };
  readonly volatility: {
    readonly daily: number;       // > 15%
    readonly weekly: number;      // > 25%
  };
}
```

## Risk Calculations

### Health Factor Calculation

Pure functional calculation of liquidation risk:

```typescript
export const calculateHealthFactor = (snapshot: PortfolioSnapshot): number =>
  snapshot.totalSuppliedUSD > 0 && snapshot.totalBorrowedUSD > 0
    ? snapshot.totalSuppliedUSD / snapshot.totalBorrowedUSD
    : Number.MAX_SAFE_INTEGER;

export const calculateLeverageRatio = (snapshot: PortfolioSnapshot): number =>
  snapshot.netWorth > 0
    ? snapshot.totalValueUSD / snapshot.netWorth
    : 1;
```

### Concentration Risk Analysis

Using fp-ts Array operations for functional data processing:

```typescript
export const calculateAssetAllocations = (
  snapshot: PortfolioSnapshot,
  priceData: ReadonlyMap<string, PriceData>
): ReadonlyArray<AssetAllocation> => {
  const totalValue = snapshot.totalValueUSD;
  if (totalValue === 0) return [];

  const allPositions = [...snapshot.lendingPositions, ...snapshot.liquidityPositions];
  const assetGroups = groupBySymbol(allPositions);

  return pipe(
    Array.from(assetGroups.entries()),
    A.map(([symbol, valueUSD]) => ({
      symbol,
      weight: valueUSD / totalValue,
      valueUSD,
      volatility: priceData.get(symbol)?.volatility || 0
    })),
    A.sortBy([Ord.contramap((allocation: AssetAllocation) => 
      allocation.weight * -1)(N.Ord)])
  );
};
```

### Herfindahl Index (Diversification)

Measures portfolio concentration using functional composition:

```typescript
export const calculateHerfindahlIndex = (
  allocations: ReadonlyArray<{ weight: number }>
): number =>
  pipe(
    allocations,
    A.map(allocation => allocation.weight * allocation.weight),
    A.reduce(0, N.MonoidSum.concat)
  );
```

### Correlation Matrix

Builds asset correlation matrix for risk assessment:

```typescript
export const buildCorrelationMatrix = (
  assets: ReadonlyArray<string>,
  correlationData: ReadonlyArray<CorrelationData>
): CorrelationMatrix => {
  const n = assets.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Fill diagonal with 1.0 (perfect self-correlation)
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
  }
  
  // Populate with correlation data
  correlationData.forEach(data => {
    const [asset1, asset2] = data.pair;
    const i = assets.indexOf(asset1);
    const j = assets.indexOf(asset2);
    
    if (i >= 0 && j >= 0) {
      matrix[i][j] = data.correlation;
      matrix[j][i] = data.correlation; // Symmetric matrix
    }
  });

  const correlations = matrix.flat().filter((corr, idx) => 
    Math.floor(idx / n) !== idx % n // Exclude diagonal
  );

  return {
    assets,
    matrix,
    averageCorrelation: correlations.length > 0 
      ? correlations.reduce((sum, corr) => sum + Math.abs(corr), 0) / correlations.length
      : 0,
    maxCorrelation: correlations.length > 0 
      ? Math.max(...correlations.map(Math.abs))
      : 0
  };
};
```

### Portfolio Volatility

Calculates portfolio-level volatility considering correlations:

```typescript
export const calculatePortfolioVolatility = (
  allocations: ReadonlyArray<AssetAllocation>,
  correlationMatrix: CorrelationMatrix
): number => {
  const weights = allocations.map(a => a.weight);
  const volatilities = allocations.map(a => a.volatility);
  
  if (weights.length === 0) return 0;
  
  let portfolioVariance = 0;
  
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      const correlation = correlationMatrix.matrix[i]?.[j] || 0;
      portfolioVariance += weights[i] * weights[j] * 
        volatilities[i] * volatilities[j] * correlation;
    }
  }
  
  return Math.sqrt(Math.max(0, portfolioVariance));
};
```

### Value at Risk (VaR)

Estimates potential portfolio losses:

```typescript
export const calculateValueAtRisk = (
  portfolioValue: number,
  volatility: number,
  confidenceLevel: number = 0.95
): number => {
  // Normal distribution z-score for confidence level
  const zScore = confidenceLevel === 0.95 ? 1.645 : 
                 confidenceLevel === 0.99 ? 2.326 : 1.645;
  
  return portfolioValue * volatility * zScore;
};
```

## Monitoring System

### Risk Monitor Service

**File:** `src/risk/monitor.ts`

```typescript
export class RiskMonitor {
  private monitoringStates = new Map<WalletAddress, MonitoringState>();
  private updateTimers = new Map<WalletAddress, NodeJS.Timer>();

  /**
   * Start monitoring a wallet's risk metrics
   */
  public startMonitoring = (
    walletAddress: WalletAddress,
    config: MonitorConfig
  ): TE.TaskEither<Error, void> =>
    pipe(
      this.initializeMonitoringState(walletAddress),
      TE.chain(() => this.scheduleRiskAssessment(walletAddress, config))
    );

  /**
   * Perform risk assessment for a wallet
   */
  private performRiskAssessment = (
    walletAddress: WalletAddress,
    context: RiskCalculationContext
  ): TE.TaskEither<RiskCalculationError, RiskAssessmentResult> =>
    pipe(
      TE.Do,
      TE.bind('metrics', () => this.calculateRiskMetrics(context)),
      TE.bind('concentration', () => this.analyzeConcentration(context)),
      TE.bind('correlation', () => this.analyzeCorrelation(context)),
      TE.bind('volatility', () => this.analyzeVolatility(context)),
      TE.map(({ metrics, concentration, correlation, volatility }) => ({
        walletAddress,
        timestamp: new Date().toISOString(),
        riskScore: this.calculateRiskScore(metrics, context.thresholds),
        metrics,
        concentration,
        correlation,
        volatility,
        alerts: this.generateAlerts(metrics, context.thresholds, walletAddress)
      }))
    );
}
```

## Alert System

### Alert Generation

**File:** `src/risk/alerts.ts`

```typescript
export const generateRiskAlerts = (
  assessment: RiskAssessmentResult,
  thresholds: RiskThresholds,
  config: AlertConfig
): ReadonlyArray<RiskAlert> => {
  if (!config.enabled) return [];

  const alerts: RiskAlert[] = [];

  // Health factor alerts
  if (assessment.metrics.healthFactor <= thresholds.healthFactor.critical) {
    alerts.push(createAlert('liquidation', 'critical', 
      `Critical liquidation risk! Health factor: ${assessment.metrics.healthFactor.toFixed(3)}`,
      assessment.walletAddress, assessment.metrics.healthFactor, 
      thresholds.healthFactor.critical));
  }

  // Concentration alerts
  if (assessment.concentration.maxAssetWeight > thresholds.concentration.asset) {
    alerts.push(createAlert('concentration', 'warning',
      `High asset concentration: ${(assessment.concentration.maxAssetWeight * 100).toFixed(1)}%`,
      assessment.walletAddress, assessment.concentration.maxAssetWeight,
      thresholds.concentration.asset));
  }

  return alerts;
};

const createAlert = (
  category: RiskCategory,
  severity: AlertSeverity,
  message: string,
  walletAddress: WalletAddress,
  value: number,
  threshold: number
): RiskAlert => ({
  id: generateId(),
  walletAddress,
  category,
  severity,
  message,
  value,
  threshold,
  timestamp: new Date().toISOString()
});
```

## Rebalancing Engine

### Rebalance Plan Generation

**File:** `src/risk/rebalancer.ts`

```typescript
export const generateRebalancePlan = (
  assessment: RiskAssessmentResult,
  targetAllocations: ReadonlyMap<string, number>,
  constraints: RebalanceConstraints
): TE.TaskEither<Error, RebalancePlan> =>
  pipe(
    validateRebalanceConstraints(constraints),
    TE.chain(() => calculateTargetWeights(assessment, targetAllocations)),
    TE.map(targets => ({
      id: generateId(),
      walletAddress: assessment.walletAddress,
      targets,
      totalTradeValue: targets.reduce((sum, t) => sum + Math.abs(t.deltaUSD), 0),
      estimatedCost: calculateRebalanceCost(targets, constraints),
      riskImprovement: estimateRiskImprovement(assessment, targets),
      timestamp: new Date().toISOString()
    }))
  );

const calculateTargetWeights = (
  assessment: RiskAssessmentResult,
  targetAllocations: ReadonlyMap<string, number>
): TE.TaskEither<Error, ReadonlyArray<RebalanceTarget>> =>
  pipe(
    assessment.concentration.assets,
    A.map(asset => {
      const targetWeight = targetAllocations.get(asset.symbol) || 0;
      const deltaWeight = targetWeight - asset.weight;
      const deltaUSD = deltaWeight * assessment.riskScore.overall; // Use total portfolio value
      
      return {
        symbol: asset.symbol,
        currentWeight: asset.weight,
        targetWeight,
        deltaUSD
      };
    }),
    A.filter(target => Math.abs(target.deltaUSD) >= constraints.minTradeSize),
    TE.right
  );
```

## Usage Examples

### Basic Risk Assessment

```typescript
import { calculateRiskMetrics, calculateCompleteRiskScore } from './risk';

// Calculate risk metrics for a portfolio
const assessPortfolioRisk = async (
  walletAddress: WalletAddress,
  snapshot: PortfolioSnapshot
): Promise<RiskAssessmentResult> => {
  const priceData = await getPriceData();
  const correlationData = await getCorrelationData();
  
  const metrics = calculateRiskMetrics(snapshot, priceData, correlationData);
  const riskScore = calculateCompleteRiskScore(metrics, defaultThresholds);
  
  return {
    walletAddress,
    timestamp: new Date().toISOString(),
    riskScore,
    metrics,
    // ... other fields
  };
};
```

### Monitoring Service Integration

```typescript
// Start risk monitoring for a user
const portfolioService = new PortfolioService();
const riskMonitor = new RiskMonitor();

const startUserMonitoring = (walletAddress: WalletAddress) =>
  pipe(
    portfolioService.initializeUser(walletAddress),
    TE.chain(() => riskMonitor.startMonitoring(walletAddress, {
      updateIntervalMs: 60000, // 1 minute
      riskThresholds: defaultThresholds,
      alertConfig: { enabled: true, cooldownMs: 300000 }, // 5 minutes
      rebalanceEnabled: true
    }))
  );
```

### Alert Handling

```typescript
// Handle risk alerts
riskMonitor.on('risk_alert', async (alert: RiskAlert) => {
  console.log(`Risk Alert: ${alert.severity} - ${alert.message}`);
  
  // Send notification
  await notificationService.sendAlert(alert);
  
  // Generate rebalance suggestion if critical
  if (alert.severity === 'critical') {
    const rebalancePlan = await generateRebalancePlan(
      alert.walletAddress,
      conservativeAllocations,
      defaultConstraints
    );
    
    await notificationService.sendRebalanceSuggestion(rebalancePlan);
  }
});
```

## Testing

### Unit Tests

**File:** `src/risk/__tests__/calculations.test.ts`

```typescript
describe('Risk Calculations', () => {
  test('calculateHealthFactor handles zero borrowing', () => {
    const snapshot: PortfolioSnapshot = {
      totalSuppliedUSD: 1000,
      totalBorrowedUSD: 0,
      // ... other fields
    };
    
    expect(calculateHealthFactor(snapshot)).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('calculateHerfindahlIndex measures concentration', () => {
    const allocations = [
      { weight: 0.5 },  // 50%
      { weight: 0.3 },  // 30%
      { weight: 0.2 }   // 20%
    ];
    
    const hhi = calculateHerfindahlIndex(allocations);
    expect(hhi).toBe(0.38); // 0.25 + 0.09 + 0.04
  });
});
```

### Property-Based Tests

**File:** `src/risk/__tests__/calculations.property.test.ts`

```typescript
import fc from 'fast-check';

describe('Risk Calculation Properties', () => {
  test('health factor is always non-negative', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1000000 }), // totalSupplied
      fc.float({ min: 0, max: 1000000 }), // totalBorrowed
      (supplied, borrowed) => {
        const snapshot = createMockSnapshot({ supplied, borrowed });
        const healthFactor = calculateHealthFactor(snapshot);
        return healthFactor >= 0;
      }
    ));
  });

  test('leverage ratio >= 1', () => {
    fc.assert(fc.property(
      fc.float({ min: 1, max: 1000000 }), // totalValue
      fc.float({ min: 1, max: 1000000 }), // netWorth
      (totalValue, netWorth) => {
        const snapshot = createMockSnapshot({ totalValue, netWorth });
        const leverage = calculateLeverageRatio(snapshot);
        return leverage >= 1;
      }
    ));
  });
});
```

## Performance Considerations

### Lazy Evaluation

Risk calculations use fp-ts lazy evaluation:

```typescript
const riskPipeline = pipe(
  snapshot,
  validateSnapshot,           // Only runs if needed
  calculateBasicMetrics,      // Deferred until evaluation
  calculateAdvancedMetrics,   // Chain continues only on success
  generateAlerts             // Final step
);
```

### Memoization

Cache expensive calculations:

```typescript
const memoizedCorrelationMatrix = useMemo(
  () => buildCorrelationMatrix(assets, correlationData),
  [assets, correlationData]
);
```

### Streaming Updates

Use reactive patterns for real-time monitoring:

```typescript
const riskStream$ = interval(60000).pipe(
  switchMap(() => calculateRiskMetrics(currentSnapshot)),
  distinctUntilChanged(compareRiskMetrics),
  share()
);
```

---

The risk management module provides a robust, functional approach to portfolio risk assessment with comprehensive monitoring, alerting, and rebalancing capabilities.