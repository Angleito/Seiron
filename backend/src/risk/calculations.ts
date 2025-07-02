/**
 * Risk Calculation Functions
 * Pure functional calculations for risk metrics
 */

import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';
import * as Ord from 'fp-ts/Ord';
import { PortfolioSnapshot, LendingPosition, LiquidityPosition } from '../types/portfolio';
import {
  RiskMetrics,
  RiskScore,
  RiskLevel,
  ConcentrationAnalysis,
  CorrelationMatrix,
  VolatilityAnalysis,
  AssetAllocation,
  ProtocolAllocation,
  PriceData,
  CorrelationData,
  RiskThresholds
} from './types';

// ===================== Health Factor Calculations =====================

export const calculateHealthFactor = (snapshot: PortfolioSnapshot): number =>
  snapshot.totalSuppliedUSD > 0 && snapshot.totalBorrowedUSD > 0
    ? snapshot.totalSuppliedUSD / snapshot.totalBorrowedUSD
    : Number.MAX_SAFE_INTEGER;

export const calculateLeverageRatio = (snapshot: PortfolioSnapshot): number =>
  snapshot.netWorth > 0
    ? snapshot.totalValueUSD / snapshot.netWorth
    : 1;

// ===================== Concentration Risk Calculations =====================

const groupBySymbol = (positions: ReadonlyArray<LendingPosition | LiquidityPosition>): ReadonlyMap<string, number> => {
  const groups = new Map<string, number>();
  
  positions.forEach(position => {
    if ('tokenSymbol' in position) {
      // Lending position
      const current = groups.get(position.tokenSymbol) || 0;
      groups.set(position.tokenSymbol, current + position.valueUSD);
    } else {
      // Liquidity position
      const current0 = groups.get(position.token0Symbol) || 0;
      const current1 = groups.get(position.token1Symbol) || 0;
      groups.set(position.token0Symbol, current0 + position.valueUSD / 2);
      groups.set(position.token1Symbol, current1 + position.valueUSD / 2);
    }
  });
  
  return groups;
};

const groupByProtocol = (positions: ReadonlyArray<LendingPosition | LiquidityPosition>): ReadonlyMap<string, number> => {
  const groups = new Map<string, number>();
  
  positions.forEach(position => {
    const current = groups.get(position.platform) || 0;
    groups.set(position.platform, current + position.valueUSD);
  });
  
  return groups;
};

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
    A.sortBy([Ord.contramap((allocation: AssetAllocation) => allocation.weight * -1)(N.Ord)])
  );
};

export const calculateProtocolAllocations = (
  snapshot: PortfolioSnapshot
): ReadonlyArray<ProtocolAllocation> => {
  const totalValue = snapshot.totalValueUSD;
  if (totalValue === 0) return [];

  const allPositions = [...snapshot.lendingPositions, ...snapshot.liquidityPositions];
  const protocolGroups = groupByProtocol(allPositions);

  return pipe(
    Array.from(protocolGroups.entries()),
    A.map(([protocol, valueUSD]) => ({
      protocol,
      weight: valueUSD / totalValue,
      valueUSD,
      riskScore: calculateProtocolRiskScore(protocol) // Simple heuristic
    })),
    A.sortBy([Ord.contramap((allocation: ProtocolAllocation) => allocation.weight * -1)(N.Ord)])
  );
};

const calculateProtocolRiskScore = (protocol: string): number => {
  // Simple risk scoring based on protocol maturity
  const riskScores: Record<string, number> = {
    'uniswap': 0.2,
    'aave': 0.1,
    'compound': 0.15,
    'curve': 0.25,
    'sushiswap': 0.3,
    'default': 0.4
  };
  
  return riskScores[protocol.toLowerCase()] || riskScores.default;
};

export const calculateHerfindahlIndex = (allocations: ReadonlyArray<{ weight: number }>): number =>
  pipe(
    allocations,
    A.map(allocation => allocation.weight * allocation.weight),
    A.reduce(0, N.MonoidSum.concat)
  );

export const calculateConcentration = (
  snapshot: PortfolioSnapshot,
  priceData: ReadonlyMap<string, PriceData>
): ConcentrationAnalysis => {
  const assets = calculateAssetAllocations(snapshot, priceData);
  const protocols = calculateProtocolAllocations(snapshot);

  return {
    assets,
    protocols,
    maxAssetWeight: pipe(
      assets,
      A.map(a => a.weight),
      A.reduce(0, Math.max)
    ),
    maxProtocolWeight: pipe(
      protocols,
      A.map(p => p.weight),
      A.reduce(0, Math.max)
    ),
    herfindahlIndex: calculateHerfindahlIndex(assets)
  };
};

// ===================== Correlation Calculations =====================

export const buildCorrelationMatrix = (
  assets: ReadonlyArray<string>,
  correlationData: ReadonlyArray<CorrelationData>
): CorrelationMatrix => {
  const n = assets.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Fill diagonal with 1.0 (asset correlates perfectly with itself)
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
  }
  
  // Fill matrix with correlation data
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

// ===================== Volatility Calculations =====================

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
      portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
    }
  }
  
  return Math.sqrt(Math.max(0, portfolioVariance));
};

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

export const calculateVolatilityAnalysis = (
  snapshot: PortfolioSnapshot,
  allocations: ReadonlyArray<AssetAllocation>,
  correlationMatrix: CorrelationMatrix
): VolatilityAnalysis => {
  const portfolioVolatility = calculatePortfolioVolatility(allocations, correlationMatrix);
  const valueAtRisk95 = calculateValueAtRisk(snapshot.totalValueUSD, portfolioVolatility);
  
  return {
    portfolioVolatility,
    assetVolatilities: new Map(allocations.map(a => [a.symbol, a.volatility])),
    valueAtRisk95,
    expectedShortfall: valueAtRisk95 * 1.3 // Approximation: ES ≈ 1.3 * VaR for normal distribution
  };
};

// ===================== Risk Level Mapping =====================

export const mapToRiskLevel = (score: number, thresholds: RiskThresholds['healthFactor']): RiskLevel => {
  if (score <= thresholds.critical) return 'critical';
  if (score <= thresholds.high) return 'high';
  if (score <= thresholds.medium) return 'medium';
  return 'low';
};

export const calculateRiskScore = (
  healthFactor: number,
  leverage: number,
  concentration: number,
  correlation: number,
  volatility: number
): number => {
  // Normalize each metric to 0-100 scale with weights
  const healthScore = Math.max(0, Math.min(100, (2.0 - healthFactor) * 50)); // Higher HF = lower risk
  const leverageScore = Math.min(100, leverage * 20); // Linear scaling
  const concentrationScore = Math.min(100, concentration * 200); // Concentration risk
  const correlationScore = Math.min(100, correlation * 100); // Correlation risk
  const volatilityScore = Math.min(100, volatility * 500); // Volatility risk

  // Weighted average
  return (
    healthScore * 0.3 +
    leverageScore * 0.25 +
    concentrationScore * 0.2 +
    correlationScore * 0.15 +
    volatilityScore * 0.1
  );
};

// ===================== Main Risk Metrics Calculation =====================

export const calculateRiskMetrics = (
  snapshot: PortfolioSnapshot,
  priceData: ReadonlyMap<string, PriceData>,
  correlationData: ReadonlyArray<CorrelationData>
): RiskMetrics => {
  const healthFactor = calculateHealthFactor(snapshot);
  const leverage = calculateLeverageRatio(snapshot);
  const concentrationAnalysis = calculateConcentration(snapshot, priceData);
  
  const assets = concentrationAnalysis.assets.map(a => a.symbol);
  const correlationMatrix = buildCorrelationMatrix(assets, correlationData);
  const volatilityAnalysis = calculateVolatilityAnalysis(snapshot, concentrationAnalysis.assets, correlationMatrix);

  return {
    healthFactor,
    leverage,
    concentration: concentrationAnalysis.maxAssetWeight,
    correlation: correlationMatrix.averageCorrelation,
    volatility: volatilityAnalysis.portfolioVolatility
  };
};

export const calculateCompleteRiskScore = (
  metrics: RiskMetrics,
  thresholds: RiskThresholds
): RiskScore => {
  const overall = calculateRiskScore(
    metrics.healthFactor,
    metrics.leverage,
    metrics.concentration,
    metrics.correlation,
    metrics.volatility
  );

  return {
    overall,
    healthFactor: Math.max(0, Math.min(100, (2.0 - metrics.healthFactor) * 50)),
    concentration: Math.min(100, metrics.concentration * 200),
    correlation: Math.min(100, metrics.correlation * 100),
    volatility: Math.min(100, metrics.volatility * 500),
    level: mapToRiskLevel(metrics.healthFactor, thresholds.healthFactor)
  };
};