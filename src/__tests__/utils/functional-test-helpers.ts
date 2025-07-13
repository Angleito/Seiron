/**
 * @fileoverview Functional testing utilities with fp-ts patterns
 * Property testing patterns and monadic testing helpers for DeFi operations
 */

import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import fc from 'fast-check';
import { expect } from '@jest/globals';

/**
 * Type-safe property assertion helper
 */
export type PropertyAssertion<T> = (value: T) => boolean;

/**
 * Mathematical property definitions for DeFi operations
 */
export interface DeFiProperty<T> {
  readonly name: string;
  readonly description: string;
  readonly assertion: PropertyAssertion<T>;
  readonly examples?: T[];
  readonly counterExamples?: T[];
}

/**
 * Property test configuration
 */
export interface PropertyTestConfig {
  readonly numRuns?: number;
  readonly timeout?: number;
  readonly seed?: number;
  readonly verbose?: boolean;
}

/**
 * Default property test configuration
 */
export const defaultPropertyConfig: PropertyTestConfig = {
  numRuns: 1000,
  timeout: 5000,
  verbose: false
};

/**
 * Test result with detailed information
 */
export interface PropertyTestResult<T> {
  readonly success: boolean;
  readonly numTests: number;
  readonly counterExample?: T;
  readonly shrunkCounterExample?: T;
  readonly error?: Error;
  readonly seed?: number;
}

/**
 * Either assertion helpers
 */
export const EitherAssertions = {
  /**
   * Assert that Either is Right
   */
  expectRight: <L, R>(either: E.Either<L, R>): R => {
    if (E.isLeft(either)) {
      throw new Error(`Expected Right but got Left: ${JSON.stringify(either.left)}`);
    }
    return either.right;
  },

  /**
   * Assert that Either is Left
   */
  expectLeft: <L, R>(either: E.Either<L, R>): L => {
    if (E.isRight(either)) {
      throw new Error(`Expected Left but got Right: ${JSON.stringify(either.right)}`);
    }
    return either.left;
  },

  /**
   * Assert Either chain preserves type
   */
  expectChainPreservesType: <L, A, B>(
    either: E.Either<L, A>,
    transform: (a: A) => E.Either<L, B>
  ): E.Either<L, B> => {
    return pipe(either, E.chain(transform));
  },

  /**
   * Assert Either map preserves Right values
   */
  expectMapPreservesRight: <L, A, B>(
    either: E.Either<L, A>,
    transform: (a: A) => B
  ): void => {
    const mapped = pipe(either, E.map(transform));
    if (E.isRight(either)) {
      expect(E.isRight(mapped)).toBe(true);
    } else {
      expect(E.isLeft(mapped)).toBe(true);
    }
  },

  /**
   * Assert Either satisfies functor laws
   */
  expectFunctorLaws: <L, A, B, C>(
    either: E.Either<L, A>,
    f: (a: A) => B,
    g: (b: B) => C
  ): void => {
    // Identity law: map(id) = id
    const identity = <T>(x: T): T => x;
    expect(pipe(either, E.map(identity))).toEqual(either);

    // Composition law: map(compose(g, f)) = compose(map(g), map(f))
    const composed = pipe(either, E.map(flow(f, g)));
    const chained = pipe(either, E.map(f), E.map(g));
    expect(composed).toEqual(chained);
  },

  /**
   * Assert Either satisfies monad laws
   */
  expectMonadLaws: <L, A, B, C>(
    value: A,
    f: (a: A) => E.Either<L, B>,
    g: (b: B) => E.Either<L, C>
  ): void => {
    // Left identity: chain(f)(of(a)) = f(a)
    const leftIdentity = pipe(E.right<L, A>(value), E.chain(f));
    expect(leftIdentity).toEqual(f(value));

    // Right identity: chain(of)(m) = m
    const either = f(value);
    const rightIdentity = pipe(either, E.chain(E.right));
    expect(rightIdentity).toEqual(either);

    // Associativity: chain(g)(chain(f)(m)) = chain(x => chain(g)(f(x)))(m)
    const m = E.right<L, A>(value);
    const left = pipe(m, E.chain(f), E.chain(g));
    const right = pipe(m, E.chain(flow(f, E.chain(g))));
    expect(left).toEqual(right);
  }
};

/**
 * TaskEither assertion helpers
 */
export const TaskEitherAssertions = {
  /**
   * Assert TaskEither resolves to Right
   */
  expectTaskRight: async <L, R>(taskEither: TE.TaskEither<L, R>): Promise<R> => {
    const result = await taskEither();
    return EitherAssertions.expectRight(result);
  },

  /**
   * Assert TaskEither resolves to Left
   */
  expectTaskLeft: async <L, R>(taskEither: TE.TaskEither<L, R>): Promise<L> => {
    const result = await taskEither();
    return EitherAssertions.expectLeft(result);
  },

  /**
   * Assert TaskEither chain preserves error types
   */
  expectTaskChainPreservesErrors: async <L, A, B>(
    taskEither: TE.TaskEither<L, A>,
    transform: (a: A) => TE.TaskEither<L, B>
  ): Promise<void> => {
    const chained = pipe(taskEither, TE.chain(transform));
    const result = await chained();
    
    if (E.isLeft(result)) {
      const originalResult = await taskEither();
      expect(E.isLeft(originalResult)).toBe(true);
    }
  },

  /**
   * Assert TaskEither timeout behavior
   */
  expectTaskTimeout: async <L, R>(
    taskEither: TE.TaskEither<L, R>,
    timeoutMs: number
  ): Promise<void> => {
    const start = Date.now();
    
    try {
      await Promise.race([
        taskEither(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);
    } catch (error) {
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(timeoutMs - 50); // Allow 50ms tolerance
    }
  }
};

/**
 * Option assertion helpers
 */
export const OptionAssertions = {
  /**
   * Assert Option is Some
   */
  expectSome: <A>(option: O.Option<A>): A => {
    if (O.isNone(option)) {
      throw new Error('Expected Some but got None');
    }
    return option.value;
  },

  /**
   * Assert Option is None
   */
  expectNone: <A>(option: O.Option<A>): void => {
    if (O.isSome(option)) {
      throw new Error(`Expected None but got Some: ${JSON.stringify(option.value)}`);
    }
  },

  /**
   * Assert Option functor laws
   */
  expectOptionFunctorLaws: <A, B, C>(
    option: O.Option<A>,
    f: (a: A) => B,
    g: (b: B) => C
  ): void => {
    // Identity law
    const identity = <T>(x: T): T => x;
    expect(pipe(option, O.map(identity))).toEqual(option);

    // Composition law
    const composed = pipe(option, O.map(flow(f, g)));
    const chained = pipe(option, O.map(f), O.map(g));
    expect(composed).toEqual(chained);
  }
};

/**
 * Mathematical property helpers for DeFi operations
 */
export const DeFiProperties = {
  /**
   * Value conservation property
   */
  valueConservation: <T extends { inputAmount: bigint; outputAmount: bigint; fees: bigint }>(
    operation: T
  ): boolean => {
    return operation.inputAmount >= operation.outputAmount + operation.fees;
  },

  /**
   * Monotonicity property
   */
  monotonicity: <T>(
    values: T[],
    compareFn: (a: T, b: T) => number
  ): boolean => {
    return values.every((value, index) => 
      index === 0 || compareFn(values[index - 1], value) <= 0
    );
  },

  /**
   * Commutativity property
   */
  commutativity: <A, B, C>(
    a: A,
    b: B,
    operation: (x: A, y: B) => C,
    equals: (x: C, y: C) => boolean
  ): boolean => {
    // Note: This is for operations where order doesn't matter
    try {
      const result1 = operation(a, b);
      const result2 = operation(b as any, a as any); // Type assertion needed for generic case
      return equals(result1, result2);
    } catch {
      return false; // If operation fails with reversed args, it's not commutative
    }
  },

  /**
   * Associativity property
   */
  associativity: <T>(
    a: T,
    b: T,
    c: T,
    operation: (x: T, y: T) => T,
    equals: (x: T, y: T) => boolean
  ): boolean => {
    const result1 = operation(operation(a, b), c);
    const result2 = operation(a, operation(b, c));
    return equals(result1, result2);
  },

  /**
   * Idempotency property
   */
  idempotency: <T>(
    value: T,
    operation: (x: T) => T,
    equals: (x: T, y: T) => boolean
  ): boolean => {
    const result1 = operation(value);
    const result2 = operation(result1);
    return equals(result1, result2);
  },

  /**
   * Interest rate monotonicity
   */
  interestRateMonotonicity: (
    positions: Array<{ principal: bigint; rate: bigint; time: number; result: bigint }>
  ): boolean => {
    return positions.every(position => {
      const expectedMin = position.principal;
      return position.result >= expectedMin;
    });
  },

  /**
   * Health factor consistency
   */
  healthFactorConsistency: (
    position: {
      collateralValue: bigint;
      debtValue: bigint;
      healthFactor: bigint;
      liquidationThreshold: bigint;
    }
  ): boolean => {
    if (position.debtValue === 0n) {
      return position.healthFactor >= BigInt(1e18); // Should be > 1 if no debt
    }
    
    const expectedHealthFactor = 
      (position.collateralValue * position.liquidationThreshold) / (position.debtValue * BigInt(1e18));
    
    const tolerance = BigInt(1e15); // 0.1% tolerance
    return position.healthFactor >= expectedHealthFactor - tolerance &&
           position.healthFactor <= expectedHealthFactor + tolerance;
  },

  /**
   * Slippage bounds
   */
  slippageBounds: (
    swap: {
      inputAmount: bigint;
      outputAmount: bigint;
      minimumAmountOut: bigint;
      expectedOutput: bigint;
      maxSlippage: number;
    }
  ): boolean => {
    const actualSlippage = Number(swap.expectedOutput - swap.outputAmount) / Number(swap.expectedOutput);
    return actualSlippage <= swap.maxSlippage && swap.outputAmount >= swap.minimumAmountOut;
  },

  /**
   * Price impact validation
   */
  priceImpactValidation: (
    trade: {
      inputAmount: bigint;
      priceImpact: number;
      liquidityBefore: bigint;
      liquidityAfter: bigint;
    }
  ): boolean => {
    // Price impact should correlate with trade size relative to liquidity
    const tradeRatio = Number(trade.inputAmount) / Number(trade.liquidityBefore);
    const expectedImpactDirection = tradeRatio > 0.01; // Significant trade
    
    if (expectedImpactDirection) {
      return trade.priceImpact > 0;
    }
    return trade.priceImpact >= 0; // Should never be negative
  },

  /**
   * Gas estimation reasonableness
   */
  gasEstimationReasonableness: (
    operation: {
      type: 'swap' | 'supply' | 'borrow' | 'repay' | 'liquidate';
      gasEstimate: bigint;
      complexity: number; // 1-10 scale
    }
  ): boolean => {
    const baseGas = {
      swap: 150000n,
      supply: 100000n,
      borrow: 120000n,
      repay: 80000n,
      liquidate: 200000n
    };
    
    const minGas = baseGas[operation.type];
    const maxGas = minGas * BigInt(operation.complexity) * 2n;
    
    return operation.gasEstimate >= minGas && operation.gasEstimate <= maxGas;
  }
};

/**
 * Property test runner with fp-ts integration
 */
export const runPropertyTest = async <T>(
  generator: fc.Arbitrary<T>,
  property: DeFiProperty<T>,
  config: PropertyTestConfig = defaultPropertyConfig
): Promise<PropertyTestResult<T>> => {
  try {
    const result = await fc.check(
      fc.property(generator, property.assertion),
      {
        numRuns: config.numRuns,
        timeout: config.timeout,
        seed: config.seed,
        verbose: config.verbose
      }
    );

    return {
      success: !result.failed,
      numTests: result.numRuns,
      counterExample: result.counterexample?.[0],
      shrunkCounterExample: result.counterexample?.[0],
      seed: result.seed
    };
  } catch (error) {
    return {
      success: false,
      numTests: 0,
      error: error as Error
    };
  }
};

/**
 * Batch property test runner
 */
export const runBatchPropertyTests = async <T>(
  generator: fc.Arbitrary<T>,
  properties: DeFiProperty<T>[],
  config: PropertyTestConfig = defaultPropertyConfig
): Promise<Record<string, PropertyTestResult<T>>> => {
  const results: Record<string, PropertyTestResult<T>> = {};
  
  for (const property of properties) {
    results[property.name] = await runPropertyTest(generator, property, config);
  }
  
  return results;
};

/**
 * Property test assertion helper
 */
export const assertProperty = async <T>(
  generator: fc.Arbitrary<T>,
  property: DeFiProperty<T>,
  config: PropertyTestConfig = defaultPropertyConfig
): Promise<void> => {
  const result = await runPropertyTest(generator, property, config);
  
  if (!result.success) {
    const message = [
      `Property '${property.name}' failed`,
      `Description: ${property.description}`,
      result.counterExample ? `Counter-example: ${JSON.stringify(result.counterExample)}` : '',
      result.error ? `Error: ${result.error.message}` : ''
    ].filter(Boolean).join('\n');
    
    throw new Error(message);
  }
};

/**
 * Mathematical invariant checker
 */
export const checkInvariant = <T>(
  data: T,
  invariants: Array<{
    name: string;
    check: (data: T) => boolean;
    description: string;
  }>
): void => {
  for (const invariant of invariants) {
    if (!invariant.check(data)) {
      throw new Error(
        `Invariant '${invariant.name}' violated\n` +
        `Description: ${invariant.description}\n` +
        `Data: ${JSON.stringify(data)}`
      );
    }
  }
};

/**
 * State transition property checker
 */
export const checkStateTransition = <S, A>(
  initialState: S,
  action: A,
  finalState: S,
  transitions: Array<{
    name: string;
    check: (initial: S, action: A, final: S) => boolean;
    description: string;
  }>
): void => {
  for (const transition of transitions) {
    if (!transition.check(initialState, action, finalState)) {
      throw new Error(
        `State transition '${transition.name}' violated\n` +
        `Description: ${transition.description}\n` +
        `Initial: ${JSON.stringify(initialState)}\n` +
        `Action: ${JSON.stringify(action)}\n` +
        `Final: ${JSON.stringify(finalState)}`
      );
    }
  }
};

/**
 * Performance property checker
 */
export const checkPerformanceProperties = async <T>(
  operation: () => Promise<T>,
  constraints: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    minThroughput?: number;
  }
): Promise<{
  result: T;
  executionTime: number;
  memoryUsed: number;
}> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const result = await operation();
  
  const executionTime = Date.now() - startTime;
  const memoryUsed = process.memoryUsage().heapUsed - startMemory;
  
  if (constraints.maxExecutionTime && executionTime > constraints.maxExecutionTime) {
    throw new Error(`Execution time ${executionTime}ms exceeds maximum ${constraints.maxExecutionTime}ms`);
  }
  
  if (constraints.maxMemoryUsage && memoryUsed > constraints.maxMemoryUsage) {
    throw new Error(`Memory usage ${memoryUsed} bytes exceeds maximum ${constraints.maxMemoryUsage} bytes`);
  }
  
  return {
    result,
    executionTime,
    memoryUsed
  };
};

/**
 * Concurrency property checker
 */
export const checkConcurrencyProperties = async <T>(
  operation: () => Promise<T>,
  concurrencyLevel: number,
  iterations: number = 10
): Promise<{
  results: T[];
  averageTime: number;
  maxTime: number;
  minTime: number;
  errors: Error[];
}> => {
  const results: T[] = [];
  const times: number[] = [];
  const errors: Error[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const promises = Array(concurrencyLevel).fill(null).map(async () => {
      const start = Date.now();
      try {
        const result = await operation();
        const time = Date.now() - start;
        results.push(result);
        times.push(time);
        return result;
      } catch (error) {
        errors.push(error as Error);
        throw error;
      }
    });
    
    await Promise.allSettled(promises);
  }
  
  return {
    results,
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    maxTime: Math.max(...times),
    minTime: Math.min(...times),
    errors
  };
};

/**
 * Export all testing utilities
 */
export const FunctionalTestHelpers = {
  EitherAssertions,
  TaskEitherAssertions,
  OptionAssertions,
  DeFiProperties,
  runPropertyTest,
  runBatchPropertyTests,
  assertProperty,
  checkInvariant,
  checkStateTransition,
  checkPerformanceProperties,
  checkConcurrencyProperties
};

export default FunctionalTestHelpers;
