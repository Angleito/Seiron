/**
 * Property-Based Testing Utilities
 * Generators and properties for mathematical functions and invariants
 */

import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

// ===================== Core Property Testing Types =====================

export type Generator<T> = () => T;
export type Property<T> = (value: T) => boolean;
export type Predicate<T> = (value: T) => boolean;

export interface PropertyTestConfig {
  readonly iterations: number;
  readonly maxShrinkAttempts: number;
  readonly seed?: number;
}

export const defaultConfig: PropertyTestConfig = {
  iterations: 100,
  maxShrinkAttempts: 10
};

// ===================== Basic Generators =====================

export const generateInteger = (min: number = -1000, max: number = 1000): Generator<number> =>
  () => Math.floor(Math.random() * (max - min + 1)) + min; // TODO: REMOVE_MOCK - Random value generation

export const generatePositiveInteger = (max: number = 1000): Generator<number> =>
  () => Math.floor(Math.random() * max) + 1; // TODO: REMOVE_MOCK - Random value generation

export const generateFloat = (min: number = -1000, max: number = 1000): Generator<number> =>
  () => Math.random() * (max - min) + min; // TODO: REMOVE_MOCK - Random value generation

export const generatePositiveFloat = (max: number = 1000): Generator<number> =>
  () => Math.random() * max; // TODO: REMOVE_MOCK - Random value generation

export const generateProbability = (): Generator<number> =>
  () => Math.random(); // TODO: REMOVE_MOCK - Random value generation

export const generatePercentage = (): Generator<number> =>
  () => Math.random() * 100; // TODO: REMOVE_MOCK - Random value generation

export const generateBoolean = (): Generator<boolean> =>
  () => Math.random() < 0.5; // TODO: REMOVE_MOCK - Random value generation

export const generateString = (length: number = 10): Generator<string> =>
  () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length)); // TODO: REMOVE_MOCK - Random value generation
    }
    return result;
  };

export const generateHexString = (length: number = 40): Generator<string> =>
  () => {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length)); // TODO: REMOVE_MOCK - Random value generation
    }
    return result;
  };

// ===================== Array Generators =====================

export const generateArray = <T>(
  generator: Generator<T>, 
  minLength: number = 0, 
  maxLength: number = 10
): Generator<ReadonlyArray<T>> =>
  () => {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength; // TODO: REMOVE_MOCK - Random value generation
    return pipe(
      A.makeBy(length, () => generator()),
      A.map(gen => gen)
    );
  };

export const generateNonEmptyArray = <T>(
  generator: Generator<T>, 
  maxLength: number = 10
): Generator<ReadonlyArray<T>> =>
  generateArray(generator, 1, maxLength);

export const generateSortedArray = (
  length: number = 10, 
  ascending: boolean = true
): Generator<ReadonlyArray<number>> =>
  () => {
    const arr = Array.from({ length }, () => Math.random() * 1000); // TODO: REMOVE_MOCK - Random value generation
    return ascending ? arr.sort((a, b) => a - b) : arr.sort((a, b) => b - a);
  };

// ===================== Combinators =====================

export const oneOf = <T>(...generators: ReadonlyArray<Generator<T>>): Generator<T> =>
  () => {
    const index = Math.floor(Math.random() * generators.length); // TODO: REMOVE_MOCK - Random value generation
    return generators[index]();
  };

export const frequency = <T>(...weightedGenerators: ReadonlyArray<[number, Generator<T>]>): Generator<T> =>
  () => {
    const totalWeight = weightedGenerators.reduce((sum, [weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight; // TODO: REMOVE_MOCK - Random value generation
    
    for (const [weight, generator] of weightedGenerators) {
      random -= weight;
      if (random <= 0) {
        return generator();
      }
    }
    
    // Fallback to last generator
    return weightedGenerators[weightedGenerators.length - 1][1]();
  };

export const mapGen = <A, B>(generator: Generator<A>, mapper: (value: A) => B): Generator<B> =>
  () => mapper(generator());

export const filterGen = <T>(generator: Generator<T>, predicate: Predicate<T>): Generator<T> =>
  () => {
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (attempts < maxAttempts) {
      const value = generator();
      if (predicate(value)) {
        return value;
      }
      attempts++;
    }
    
    throw new Error(`Failed to generate valid value after ${maxAttempts} attempts`);
  };

export const tupleGen = <T extends ReadonlyArray<any>>(
  ...generators: { [K in keyof T]: Generator<T[K]> }
): Generator<T> =>
  () => generators.map(gen => gen()) as unknown as T;

export const recordGen = <T extends Record<string, any>>(
  generators: { [K in keyof T]: Generator<T[K]> }
): Generator<T> =>
  () => {
    const result = {} as T;
    for (const key in generators) {
      result[key] = generators[key]();
    }
    return result;
  };

// ===================== Domain-Specific Generators =====================

export const generatePortfolioValue = (): Generator<number> =>
  frequency(
    [70, generatePositiveFloat(1000000)], // Normal portfolios
    [20, generatePositiveFloat(10000000)], // Large portfolios
    [9, generatePositiveFloat(100)], // Small portfolios
    [1, () => 0] // Empty portfolios
  );

export const generateHealthFactor = (): Generator<number> =>
  frequency(
    [60, generateFloat(1.5, 10)], // Healthy portfolios
    [25, generateFloat(1.1, 1.5)], // Moderate risk
    [10, generateFloat(1.0, 1.1)], // High risk
    [5, () => Number.MAX_SAFE_INTEGER] // No borrowing
  );

export const generateLeverageRatio = (): Generator<number> =>
  frequency(
    [70, generateFloat(1.0, 3.0)], // Normal leverage
    [20, generateFloat(3.0, 5.0)], // High leverage
    [10, generateFloat(5.0, 10.0)] // Very high leverage
  );

export const generateConcentration = (): Generator<number> =>
  frequency(
    [60, generateFloat(0.1, 0.4)], // Well diversified
    [25, generateFloat(0.4, 0.7)], // Moderately concentrated
    [15, generateFloat(0.7, 1.0)] // Highly concentrated
  );

export const generateCorrelation = (): Generator<number> =>
  frequency(
    [40, generateFloat(-0.3, 0.3)], // Low correlation
    [30, generateFloat(0.3, 0.7)], // Moderate correlation
    [20, generateFloat(0.7, 1.0)], // High correlation
    [10, generateFloat(-1.0, -0.3)] // Negative correlation
  );

export const generateVolatility = (): Generator<number> =>
  frequency(
    [50, generateFloat(0.05, 0.2)], // Low volatility
    [30, generateFloat(0.2, 0.5)], // Moderate volatility
    [20, generateFloat(0.5, 1.0)] // High volatility
  );

export const generateRiskMetrics = (): Generator<{
  healthFactor: number;
  leverage: number;
  concentration: number;
  correlation: number;
  volatility: number;
}> =>
  recordGen({
    healthFactor: generateHealthFactor(),
    leverage: generateLeverageRatio(),
    concentration: generateConcentration(),
    correlation: generateCorrelation(),
    volatility: generateVolatility()
  });

// ===================== Weight Generators =====================

export const generateWeights = (count: number): Generator<ReadonlyArray<number>> =>
  () => {
    const rawWeights = Array.from({ length: count }, () => Math.random()); // TODO: REMOVE_MOCK - Random value generation
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    return rawWeights.map(w => w / sum);
  };

export const generateConcentratedWeights = (count: number): Generator<ReadonlyArray<number>> =>
  () => {
    const weights = new Array(count).fill(0);
    const dominantIndex = Math.floor(Math.random() * count); // TODO: REMOVE_MOCK - Random value generation
    weights[dominantIndex] = 0.7 + Math.random() * 0.3; // 70-100% // TODO: REMOVE_MOCK - Random value generation
    
    const remaining = 1 - weights[dominantIndex];
    for (let i = 0; i < count; i++) {
      if (i !== dominantIndex) {
        weights[i] = (Math.random() * remaining) / (count - 1); // TODO: REMOVE_MOCK - Random value generation
      }
    }
    
    // Normalize to ensure sum is exactly 1
    const actualSum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / actualSum);
  };

// ===================== Property Testing Engine =====================

export class PropertyTestResult {
  constructor(
    public readonly success: boolean,
    public readonly iterations: number,
    public readonly counterexample?: any,
    public readonly shrunkCounterexample?: any,
    public readonly error?: Error
  ) {}

  static success(iterations: number): PropertyTestResult {
    return new PropertyTestResult(true, iterations);
  }

  static failure(
    iterations: number, 
    counterexample: any, 
    shrunkCounterexample?: any, 
    error?: Error
  ): PropertyTestResult {
    return new PropertyTestResult(false, iterations, counterexample, shrunkCounterexample, error);
  }
}

export const forAllWith = <T>(
  generator: Generator<T>,
  property: Property<T>,
  config: PropertyTestConfig = defaultConfig
): PropertyTestResult => {
  let counterexample: T | undefined;
  
  for (let i = 0; i < config.iterations; i++) {
    const value = generator();
    
    try {
      if (!property(value)) {
        counterexample = value;
        break;
      }
    } catch (error) {
      return PropertyTestResult.failure(
        i + 1, 
        value, 
        undefined, 
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  if (counterexample !== undefined) {
    // Try to shrink the counterexample
    const shrunk = shrink(counterexample, property, config.maxShrinkAttempts);
    return PropertyTestResult.failure(config.iterations, counterexample, shrunk);
  }
  
  return PropertyTestResult.success(config.iterations);
};

// ===================== Shrinking =====================

const shrink = <T>(
  counterexample: T, 
  property: Property<T>, 
  maxAttempts: number
): T => {
  // Simple shrinking implementation for numbers
  if (typeof counterexample === 'number') {
    return shrinkNumber(counterexample, property as Property<number>, maxAttempts) as T;
  }
  
  // Simple shrinking for arrays
  if (Array.isArray(counterexample)) {
    return shrinkArray(counterexample as any[], property as Property<any[]>, maxAttempts) as unknown as T;
  }
  
  // No shrinking for other types
  return counterexample;
};

const shrinkNumber = (
  value: number, 
  property: Property<number>, 
  maxAttempts: number
): number => {
  let current = value;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const candidates = [
      0,
      Math.floor(current / 2),
      current - 1,
      current + 1
    ].filter(candidate => candidate !== current);
    
    let foundSmaller = false;
    for (const candidate of candidates) {
      try {
        if (!property(candidate)) {
          current = candidate;
          foundSmaller = true;
          break;
        }
      } catch {
        // If property throws, candidate is not a valid counterexample
      }
    }
    
    if (!foundSmaller) {
      break;
    }
    
    attempts++;
  }
  
  return current;
};

const shrinkArray = <T>(
  value: T[], 
  property: Property<T[]>, 
  maxAttempts: number
): T[] => {
  let current = value;
  let attempts = 0;
  
  while (attempts < maxAttempts && current.length > 0) {
    // Try removing elements
    let foundSmaller = false;
    
    for (let i = 0; i < current.length; i++) {
      const candidate = current.filter((_, index) => index !== i);
      
      try {
        if (!property(candidate)) {
          current = candidate;
          foundSmaller = true;
          break;
        }
      } catch {
        // If property throws, candidate is not a valid counterexample
      }
    }
    
    if (!foundSmaller) {
      break;
    }
    
    attempts++;
  }
  
  return current;
};

// ===================== Common Properties =====================

export const isMonotonic = (values: ReadonlyArray<number>): boolean => {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      return false;
    }
  }
  return true;
};

export const isStrictlyMonotonic = (values: ReadonlyArray<number>): boolean => {
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) {
      return false;
    }
  }
  return true;
};

export const sumEquals = (values: ReadonlyArray<number>, target: number, tolerance: number = 1e-10): boolean => {
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - target) <= tolerance;
};

export const allPositive = (values: ReadonlyArray<number>): boolean =>
  values.every(v => v > 0);

export const allNonNegative = (values: ReadonlyArray<number>): boolean =>
  values.every(v => v >= 0);

export const inRange = (value: number, min: number, max: number): boolean =>
  value >= min && value <= max;

export const isIdempotent = <T>(fn: (x: T) => T, value: T): boolean => {
  const result1 = fn(value);
  const result2 = fn(result1);
  return JSON.stringify(result1) === JSON.stringify(result2);
};

export const isCommutative = <T>(fn: (a: T, b: T) => T, a: T, b: T): boolean => {
  const result1 = fn(a, b);
  const result2 = fn(b, a);
  return JSON.stringify(result1) === JSON.stringify(result2);
};

export const isAssociative = <T>(fn: (a: T, b: T) => T, a: T, b: T, c: T): boolean => {
  const result1 = fn(fn(a, b), c);
  const result2 = fn(a, fn(b, c));
  return JSON.stringify(result1) === JSON.stringify(result2);
};

// ===================== Mathematical Properties =====================

export const isLinear = (
  fn: (x: number) => number, 
  x1: number, 
  x2: number, 
  alpha: number
): boolean => {
  const tolerance = 1e-10;
  const left = fn(alpha * x1 + (1 - alpha) * x2);
  const right = alpha * fn(x1) + (1 - alpha) * fn(x2);
  return Math.abs(left - right) <= tolerance;
};

export const isConvex = (
  fn: (x: number) => number, 
  x1: number, 
  x2: number, 
  alpha: number
): boolean => {
  if (alpha < 0 || alpha > 1) return true; // Only test valid alpha
  
  const left = fn(alpha * x1 + (1 - alpha) * x2);
  const right = alpha * fn(x1) + (1 - alpha) * fn(x2);
  return left <= right + 1e-10; // Small tolerance for floating point
};

export const isConcave = (
  fn: (x: number) => number, 
  x1: number, 
  x2: number, 
  alpha: number
): boolean => {
  if (alpha < 0 || alpha > 1) return true; // Only test valid alpha
  
  const left = fn(alpha * x1 + (1 - alpha) * x2);
  const right = alpha * fn(x1) + (1 - alpha) * fn(x2);
  return left >= right - 1e-10; // Small tolerance for floating point
};

// ===================== Export Convenience Functions =====================

export const quickCheck = <T>(
  generator: Generator<T>,
  property: Property<T>,
  iterations: number = 100
): boolean => {
  const result = forAllWith(generator, property, { ...defaultConfig, iterations });
  if (!result.success) {
    console.error('Property failed:', result);
  }
  return result.success;
};

export const verboseCheck = <T>(
  generator: Generator<T>,
  property: Property<T>,
  iterations: number = 100
): PropertyTestResult => {
  return forAllWith(generator, property, { ...defaultConfig, iterations });
};