/**
 * Functional Test Assertions
 * Type-safe assertions for fp-ts patterns and risk calculations
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  RiskMetrics,
  RiskScore,
  RiskLevel,
  ConcentrationAnalysis,
  CorrelationMatrix,
  VolatilityAnalysis,
  RiskAlert,
  AlertSeverity
} from '@/risk/types';

// ===================== Either Assertions =====================

export const assertRight = <E, A>(either: E.Either<E, A>): A => {
  if (E.isLeft(either)) {
    throw new Error(`Expected Right but got Left: ${JSON.stringify(either.left)}`);
  }
  return either.right;
};

export const assertLeft = <E, A>(either: E.Either<E, A>): E => {
  if (E.isRight(either)) {
    throw new Error(`Expected Left but got Right: ${JSON.stringify(either.right)}`);
  }
  return either.left;
};

export const expectRight = <E, A>(either: E.Either<E, A>): void => {
  expect(either).toBeRight();
};

export const expectRightWith = <E, A>(either: E.Either<E, A>, expected: A): void => {
  expect(either).toBeRightWith(expected);
};

export const expectLeft = <E, A>(either: E.Either<E, A>): void => {
  expect(either).toBeLeft();
};

export const expectLeftWith = <E, A>(either: E.Either<E, A>, expected: E): void => {
  expect(either).toBeLeftWith(expected);
};

// ===================== Option Assertions =====================

export const assertSome = <A>(option: O.Option<A>): A => {
  if (O.isNone(option)) {
    throw new Error('Expected Some but got None');
  }
  return option.value;
};

export const assertNone = <A>(option: O.Option<A>): void => {
  if (O.isSome(option)) {
    throw new Error(`Expected None but got Some: ${JSON.stringify(option.value)}`);
  }
};

export const expectSome = <A>(option: O.Option<A>): void => {
  expect(option).toBeSome();
};

export const expectSomeWith = <A>(option: O.Option<A>, expected: A): void => {
  expect(option).toBeSomeWith(expected);
};

export const expectNone = <A>(option: O.Option<A>): void => {
  expect(option).toBeNone();
};

// ===================== TaskEither Test Helpers =====================

export const expectTaskRight = async <E, A>(task: TE.TaskEither<E, A>): Promise<A> => {
  const result = await task();
  expectRight(result);
  return assertRight(result);
};

export const expectTaskLeft = async <E, A>(task: TE.TaskEither<E, A>): Promise<E> => {
  const result = await task();
  expectLeft(result);
  return assertLeft(result);
};

export const expectTaskRightWith = async <E, A>(
  task: TE.TaskEither<E, A>, 
  expected: A
): Promise<void> => {
  const result = await task();
  expectRightWith(result, expected);
};

export const expectTaskLeftWith = async <E, A>(
  task: TE.TaskEither<E, A>, 
  expected: E
): Promise<void> => {
  const result = await task();
  expectLeftWith(result, expected);
};

// ===================== Risk Calculation Assertions =====================

export const expectValidRiskMetrics = (metrics: RiskMetrics): void => {
  expect(metrics.healthFactor).toBeGreaterThan(0);
  expect(metrics.leverage).toBeGreaterThanOrEqual(1);
  expect(metrics.concentration).toBeGreaterThanOrEqual(0);
  expect(metrics.concentration).toBeLessThanOrEqual(1);
  expect(metrics.correlation).toBeGreaterThanOrEqual(-1);
  expect(metrics.correlation).toBeLessThanOrEqual(1);
  expect(metrics.volatility).toBeGreaterThanOrEqual(0);
};

export const expectValidRiskScore = (score: RiskScore): void => {
  expect(score.overall).toBeGreaterThanOrEqual(0);
  expect(score.overall).toBeLessThanOrEqual(100);
  expect(score.healthFactor).toBeGreaterThanOrEqual(0);
  expect(score.healthFactor).toBeLessThanOrEqual(100);
  expect(score.concentration).toBeGreaterThanOrEqual(0);
  expect(score.concentration).toBeLessThanOrEqual(100);
  expect(score.correlation).toBeGreaterThanOrEqual(0);
  expect(score.correlation).toBeLessThanOrEqual(100);
  expect(score.volatility).toBeGreaterThanOrEqual(0);
  expect(score.volatility).toBeLessThanOrEqual(100);
  expect(['low', 'medium', 'high', 'critical']).toContain(score.level); // TODO: REMOVE_MOCK - Hard-coded array literals
};

export const expectRiskLevel = (score: RiskScore, expectedLevel: RiskLevel): void => {
  expect(score.level).toBe(expectedLevel);
};

export const expectValidConcentrationAnalysis = (analysis: ConcentrationAnalysis): void => {
  expect(analysis.assets).toBeInstanceOf(Array);
  expect(analysis.protocols).toBeInstanceOf(Array);
  expect(analysis.maxAssetWeight).toBeGreaterThanOrEqual(0);
  expect(analysis.maxAssetWeight).toBeLessThanOrEqual(1);
  expect(analysis.maxProtocolWeight).toBeGreaterThanOrEqual(0);
  expect(analysis.maxProtocolWeight).toBeLessThanOrEqual(1);
  expect(analysis.herfindahlIndex).toBeGreaterThanOrEqual(0);
  expect(analysis.herfindahlIndex).toBeLessThanOrEqual(1);

  // Asset allocations should sum to approximately 1
  const totalAssetWeight = analysis.assets.reduce((sum, asset) => sum + asset.weight, 0);
  expect(totalAssetWeight).toBeCloseTo(1, 2);

  // Protocol allocations should sum to approximately 1
  const totalProtocolWeight = analysis.protocols.reduce((sum, protocol) => sum + protocol.weight, 0);
  expect(totalProtocolWeight).toBeCloseTo(1, 2);
};

export const expectValidCorrelationMatrix = (matrix: CorrelationMatrix): void => {
  expect(matrix.assets).toBeInstanceOf(Array);
  expect(matrix.matrix).toBeInstanceOf(Array);
  expect(matrix.averageCorrelation).toBeGreaterThanOrEqual(-1);
  expect(matrix.averageCorrelation).toBeLessThanOrEqual(1);
  expect(matrix.maxCorrelation).toBeGreaterThanOrEqual(-1);
  expect(matrix.maxCorrelation).toBeLessThanOrEqual(1);

  // Matrix should be square
  const n = matrix.assets.length;
  expect(matrix.matrix).toHaveLength(n);
  matrix.matrix.forEach(row => {
    expect(row).toHaveLength(n);
  });

  // Matrix diagonal should be 1.0 (asset correlates perfectly with itself)
  for (let i = 0; i < n; i++) {
    expect(matrix.matrix[i][i]).toBeCloseTo(1.0, 6);
  }

  // Matrix should be symmetric
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      expect(matrix.matrix[i][j]).toBeCloseTo(matrix.matrix[j][i], 6);
    }
  }
};

export const expectValidVolatilityAnalysis = (analysis: VolatilityAnalysis): void => {
  expect(analysis.portfolioVolatility).toBeGreaterThanOrEqual(0);
  expect(analysis.assetVolatilities).toBeInstanceOf(Map);
  expect(analysis.valueAtRisk95).toBeGreaterThanOrEqual(0);
  expect(analysis.expectedShortfall).toBeGreaterThanOrEqual(0);
  expect(analysis.expectedShortfall).toBeGreaterThanOrEqual(analysis.valueAtRisk95);
};

export const expectValidRiskAlert = (alert: RiskAlert): void => {
  expect(alert.id).toBeTruthy();
  expect(alert.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  expect(['liquidation', 'concentration', 'correlation', 'volatility']).toContain(alert.category); // TODO: REMOVE_MOCK - Hard-coded array literals
  expect(['info', 'warning', 'critical']).toContain(alert.severity); // TODO: REMOVE_MOCK - Hard-coded array literals
  expect(alert.message).toBeTruthy();
  expect(typeof alert.value).toBe('number');
  expect(typeof alert.threshold).toBe('number');
  expect(alert.timestamp).toBeTruthy();
};

export const expectAlertSeverity = (alert: RiskAlert, expectedSeverity: AlertSeverity): void => {
  expect(alert.severity).toBe(expectedSeverity);
};

// ===================== Numerical Assertions =====================

export const expectCloseToZero = (value: number, precision: number = 6): void => {
  expect(value).toBeCloseTo(0, precision);
};

export const expectBetween = (value: number, min: number, max: number): void => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

export const expectPositive = (value: number): void => {
  expect(value).toBeGreaterThan(0);
};

export const expectNonNegative = (value: number): void => {
  expect(value).toBeGreaterThanOrEqual(0);
};

export const expectProbability = (value: number): void => {
  expectBetween(value, 0, 1);
};

export const expectPercentage = (value: number): void => {
  expectBetween(value, 0, 100);
};

// ===================== Array Assertions =====================

export const expectNonEmptyArray = <T>(array: ReadonlyArray<T>): void => {
  expect(array.length).toBeGreaterThan(0);
};

export const expectSortedDescending = (array: ReadonlyArray<number>): void => {
  for (let i = 1; i < array.length; i++) {
    expect(array[i]).toBeLessThanOrEqual(array[i - 1]);
  }
};

export const expectSortedAscending = (array: ReadonlyArray<number>): void => {
  for (let i = 1; i < array.length; i++) {
    expect(array[i]).toBeGreaterThanOrEqual(array[i - 1]);
  }
};

export const expectArraySum = (array: ReadonlyArray<number>, expectedSum: number, precision: number = 6): void => {
  const actualSum = array.reduce((sum, value) => sum + value, 0);
  expect(actualSum).toBeCloseTo(expectedSum, precision);
};

// ===================== Pure Function Test Helpers =====================

export const expectPureFunction = <T extends ReadonlyArray<any>, R>(
  fn: (...args: T) => R,
  args: T,
  expectedOutput: R
): void => {
  // Test determinism - same input should produce same output
  const result1 = fn(...args);
  const result2 = fn(...args);
  
  expect(result1).toEqual(expectedOutput);
  expect(result2).toEqual(expectedOutput);
  expect(result1).toEqual(result2);
};

export const expectNoSideEffects = <T extends ReadonlyArray<any>, R>(
  fn: (...args: T) => R,
  args: T
): void => {
  // Create deep copies of arguments
  const originalArgs = JSON.parse(JSON.stringify(args));
  
  // Execute function
  fn(...args);
  
  // Verify arguments weren't mutated
  expect(args).toEqual(originalArgs);
};

// ===================== Property Testing Helpers =====================

export const forAll = <T>(
  generator: () => T,
  property: (value: T) => boolean,
  iterations: number = 100
): void => {
  for (let i = 0; i < iterations; i++) {
    const value = generator();
    const result = property(value);
    
    if (!result) {
      throw new Error(`Property failed for value: ${JSON.stringify(value)}`);
    }
  }
};

export const exists = <T>(
  generator: () => T,
  property: (value: T) => boolean,
  maxIterations: number = 1000
): void => {
  for (let i = 0; i < maxIterations; i++) {
    const value = generator();
    if (property(value)) {
      return; // Property satisfied
    }
  }
  
  throw new Error(`Property was never satisfied in ${maxIterations} iterations`);
};