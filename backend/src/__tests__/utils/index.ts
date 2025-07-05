/**
 * Functional Test Utilities Index
 * Exports all test utilities for functional programming patterns
 */

// Core test setup
export * from './setup';

// Test data generators
export * from './generators';

// Functional assertions
export * from './assertions';

// Property-based testing (selective exports to avoid conflicts)
export { 
  PropertyTestConfig, 
  defaultConfig,
  PropertyTestResult,
  forAllWith,
  quickCheck,
  verboseCheck,
  generateInteger,
  generatePositiveInteger,
  generateFloat,
  generatePositiveFloat,
  generateArray,
  generateNonEmptyArray,
  oneOf,
  frequency,
  mapGen,
  filterGen,
  tupleGen,
  recordGen,
  generatePortfolioValue,
  generateHealthFactor,
  generateLeverageRatio,
  generateConcentration,
  generateCorrelation,
  generateWeights,
  generateConcentratedWeights,
  isMonotonic,
  isStrictlyMonotonic,
  sumEquals,
  allPositive,
  allNonNegative,
  inRange,
  isIdempotent,
  isCommutative,
  isAssociative,
  isLinear,
  isConvex,
  isConcave
} from './property-testing';

// Re-export fp-ts for convenience in tests
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

export { E, O, TE, T, A, pipe };

// Common test patterns
export const testPureFunction = <Args extends ReadonlyArray<any>, Result>(
  fn: (...args: Args) => Result,
  testCases: ReadonlyArray<{ input: Args; expected: Result; description: string }>
): void => {
  testCases.forEach(({ input, expected, description }) => {
    test(description, () => {
      const result = fn(...input);
      expect(result).toEqual(expected);
    });
  });
};

export const testProperty = <T>(
  description: string,
  generator: () => T,
  property: (value: T) => boolean,
  iterations: number = 100
): void => {
  test(description, () => {
    for (let i = 0; i < iterations; i++) {
      const value = generator();
      expect(property(value)).toBe(true);
    }
  });
};

export const testEither = <E, A>(
  description: string,
  either: E.Either<E, A>,
  expectation: 'right' | 'left',
  expectedValue?: E | A
): void => {
  test(description, () => {
    if (expectation === 'right') {
      expect(either).toBeRight();
      if (expectedValue !== undefined) {
        expect(either).toBeRightWith(expectedValue);
      }
    } else {
      expect(either).toBeLeft();
      if (expectedValue !== undefined) {
        expect(either).toBeLeftWith(expectedValue);
      }
    }
  });
};

export const testOption = <A>(
  description: string,
  option: O.Option<A>,
  expectation: 'some' | 'none',
  expectedValue?: A
): void => {
  test(description, () => {
    if (expectation === 'some') {
      expect(option).toBeSome();
      if (expectedValue !== undefined) {
        expect(option).toBeSomeWith(expectedValue);
      }
    } else {
      expect(option).toBeNone();
    }
  });
};

export const testTaskEither = <E, A>(
  description: string,
  taskEither: TE.TaskEither<E, A>,
  expectation: 'right' | 'left',
  expectedValue?: E | A
): void => {
  test(description, async () => {
    const result = await taskEither();
    if (expectation === 'right') {
      expect(result).toBeRight();
      if (expectedValue !== undefined) {
        expect(result).toBeRightWith(expectedValue);
      }
    } else {
      expect(result).toBeLeft();
      if (expectedValue !== undefined) {
        expect(result).toBeLeftWith(expectedValue);
      }
    }
  });
};