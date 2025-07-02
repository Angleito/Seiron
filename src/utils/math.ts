/**
 * @fileoverview Mathematical utilities for financial calculations
 * Provides functional programming utilities for risk management and portfolio analysis
 */

import type { Either, Result } from '../types/index.js';

/**
 * Statistical calculations
 */

/** Calculate mean of an array */
export const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/** Calculate variance of an array */
export const variance = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return mean(values.map(val => Math.pow(val - avg, 2)));
};

/** Calculate standard deviation */
export const standardDeviation = (values: readonly number[]): number => {
  return Math.sqrt(variance(values));
};

/** Calculate covariance between two arrays */
export const covariance = (x: readonly number[], y: readonly number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const xMean = mean(x);
  const yMean = mean(y);
  
  const sum = x.reduce((acc, xi, i) => {
    return acc + (xi - xMean) * (y[i] - yMean);
  }, 0);
  
  return sum / (x.length - 1);
};

/** Calculate correlation coefficient */
export const correlation = (x: readonly number[], y: readonly number[]): number => {
  const cov = covariance(x, y);
  const xStd = standardDeviation(x);
  const yStd = standardDeviation(y);
  
  if (xStd === 0 || yStd === 0) return 0;
  return cov / (xStd * yStd);
};

/**
 * Risk metrics calculations
 */

/** Calculate Sharpe ratio */
export const sharpeRatio = (
  returns: readonly number[],
  riskFreeRate: number = 0
): number => {
  const excessReturns = returns.map(r => r - riskFreeRate);
  const avgExcessReturn = mean(excessReturns);
  const stdDev = standardDeviation(excessReturns);
  
  if (stdDev === 0) return 0;
  return avgExcessReturn / stdDev;
};

/** Calculate maximum drawdown */
export const maxDrawdown = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  
  let peak = values[0];
  let maxDD = 0;
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }
  
  return maxDD;
};

/** Calculate Value at Risk (VaR) using historical method */
export const historicalVaR = (
  returns: readonly number[],
  confidenceLevel: number = 0.95
): number => {
  if (returns.length === 0) return 0;
  
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  
  return sortedReturns[index] || sortedReturns[0];
};

/** Calculate Conditional Value at Risk (CVaR) */
export const conditionalVaR = (
  returns: readonly number[],
  confidenceLevel: number = 0.95
): number => {
  const varThreshold = historicalVaR(returns, confidenceLevel);
  const tailReturns = returns.filter(r => r <= varThreshold);
  
  return tailReturns.length > 0 ? mean(tailReturns) : varThreshold;
};

/**
 * Kelly Criterion calculations
 */

/** Calculate Kelly fraction for a single bet */
export const kellyFraction = (
  winProbability: number,
  winAmount: number,
  lossAmount: number
): number => {
  if (lossAmount === 0) return 0;
  
  const b = winAmount / lossAmount; // Odds
  const p = winProbability;
  const q = 1 - p;
  
  // Kelly formula: (bp - q) / b
  const kelly = (b * p - q) / b;
  
  // Return 0 if negative (don't bet)
  return Math.max(0, kelly);
};

/** Calculate Kelly fraction for multiple outcomes */
export const multiKellyFraction = (
  probabilities: readonly number[],
  payoffs: readonly number[]
): number => {
  if (probabilities.length !== payoffs.length) return 0;
  
  // Expected value
  const expectedValue = probabilities.reduce((sum, p, i) => sum + p * payoffs[i], 0);
  
  // Expected value of squared payoffs
  const expectedSquared = probabilities.reduce((sum, p, i) => sum + p * payoffs[i] * payoffs[i], 0);
  
  // Variance
  const variance = expectedSquared - expectedValue * expectedValue;
  
  if (variance === 0) return 0;
  
  // Kelly fraction = expected value / variance
  return expectedValue / variance;
};

/**
 * Portfolio calculations
 */

/** Calculate portfolio variance */
export const portfolioVariance = (
  weights: readonly number[],
  covarianceMatrix: readonly (readonly number[])[]
): number => {
  const n = weights.length;
  let variance = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }
  
  return variance;
};

/** Calculate portfolio standard deviation */
export const portfolioStandardDeviation = (
  weights: readonly number[],
  covarianceMatrix: readonly (readonly number[])[]
): number => {
  return Math.sqrt(portfolioVariance(weights, covarianceMatrix));
};

/** Calculate beta of asset relative to market */
export const calculateBeta = (
  assetReturns: readonly number[],
  marketReturns: readonly number[]
): number => {
  const cov = covariance(assetReturns, marketReturns);
  const marketVar = variance(marketReturns);
  
  if (marketVar === 0) return 0;
  return cov / marketVar;
};

/**
 * Utility functions
 */

/** Clamp value between min and max */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** Round to specified decimal places */
export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/** Calculate percentage change */
export const percentageChange = (from: number, to: number): number => {
  if (from === 0) return 0;
  return (to - from) / from;
};

/** Calculate compound annual growth rate (CAGR) */
export const cagr = (
  initialValue: number,
  finalValue: number,
  years: number
): number => {
  if (initialValue <= 0 || years <= 0) return 0;
  return Math.pow(finalValue / initialValue, 1 / years) - 1;
};

/** Calculate moving average */
export const movingAverage = (
  values: readonly number[],
  window: number
): readonly number[] => {
  if (window <= 0 || values.length < window) return [];
  
  const result: number[] = [];
  
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1);
    result.push(mean(windowValues));
  }
  
  return result;
};

/** Calculate exponential moving average */
export const exponentialMovingAverage = (
  values: readonly number[],
  alpha: number
): readonly number[] => {
  if (values.length === 0 || alpha <= 0 || alpha > 1) return [];
  
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(ema);
  }
  
  return result;
};

/**
 * Matrix operations for portfolio calculations
 */

/** Create identity matrix */
export const identityMatrix = (size: number): readonly (readonly number[])[] => {
  const matrix: number[][] = [];
  
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      matrix[i][j] = i === j ? 1 : 0;
    }
  }
  
  return matrix;
};

/** Calculate covariance matrix from returns */
export const covarianceMatrix = (
  returnsMatrix: readonly (readonly number[])[]
): readonly (readonly number[])[] => {
  const n = returnsMatrix.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = covariance(returnsMatrix[i], returnsMatrix[j]);
    }
  }
  
  return matrix;
};

/** Normalize weights to sum to 1 */
export const normalizeWeights = (weights: readonly number[]): readonly number[] => {
  const sum = weights.reduce((acc, w) => acc + Math.abs(w), 0);
  
  if (sum === 0) {
    // Equal weights if all are zero
    const equalWeight = 1 / weights.length;
    return weights.map(() => equalWeight);
  }
  
  return weights.map(w => Math.abs(w) / sum);
};