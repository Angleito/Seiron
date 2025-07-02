/**
 * Functional Test Setup Utilities
 * Configures fp-ts patterns and test environment
 */

import { jest } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';

// Extend Jest matchers for fp-ts types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRight(): R;
      toBeLeft(): R;
      toBeSome(): R;
      toBeNone(): R;
      toBeRightWith(expected: any): R;
      toBeLeftWith(expected: any): R;
      toBeSomeWith(expected: any): R;
    }
  }
}

// Custom matchers for fp-ts Either
expect.extend({
  toBeRight(received: E.Either<any, any>) {
    const pass = E.isRight(received);
    if (pass) {
      return {
        message: () => `expected Either to be Left but got Right(${JSON.stringify(received.right)})`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected Either to be Right but got Left(${JSON.stringify(received.left)})`,
        pass: false,
      };
    }
  },

  toBeLeft(received: E.Either<any, any>) {
    const pass = E.isLeft(received);
    if (pass) {
      return {
        message: () => `expected Either to be Right but got Left(${JSON.stringify(received.left)})`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected Either to be Left but got Right(${JSON.stringify(received.right)})`,
        pass: false,
      };
    }
  },

  toBeRightWith(received: E.Either<any, any>, expected: any) {
    const pass = E.isRight(received) && JSON.stringify(received.right) === JSON.stringify(expected);
    if (pass) {
      return {
        message: () => `expected Either not to be Right(${JSON.stringify(expected)})`,
        pass: true,
      };
    } else {
      const actualValue = E.isRight(received) ? received.right : received.left;
      return {
        message: () => `expected Either to be Right(${JSON.stringify(expected)}) but got ${JSON.stringify(actualValue)}`,
        pass: false,
      };
    }
  },

  toBeLeftWith(received: E.Either<any, any>, expected: any) {
    const pass = E.isLeft(received) && JSON.stringify(received.left) === JSON.stringify(expected);
    if (pass) {
      return {
        message: () => `expected Either not to be Left(${JSON.stringify(expected)})`,
        pass: true,
      };
    } else {
      const actualValue = E.isLeft(received) ? received.left : received.right;
      return {
        message: () => `expected Either to be Left(${JSON.stringify(expected)}) but got ${JSON.stringify(actualValue)}`,
        pass: false,
      };
    }
  },
});

// Custom matchers for fp-ts Option
expect.extend({
  toBeSome(received: O.Option<any>) {
    const pass = O.isSome(received);
    if (pass) {
      return {
        message: () => `expected Option to be None but got Some(${JSON.stringify(received.value)})`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected Option to be Some but got None`,
        pass: false,
      };
    }
  },

  toBeNone(received: O.Option<any>) {
    const pass = O.isNone(received);
    if (pass) {
      return {
        message: () => `expected Option to be Some but got None`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected Option to be None but got Some(${JSON.stringify(received.value)})`,
        pass: false,
      };
    }
  },

  toBeSomeWith(received: O.Option<any>, expected: any) {
    const pass = O.isSome(received) && JSON.stringify(received.value) === JSON.stringify(expected);
    if (pass) {
      return {
        message: () => `expected Option not to be Some(${JSON.stringify(expected)})`,
        pass: true,
      };
    } else {
      const actualValue = O.isSome(received) ? received.value : 'None';
      return {
        message: () => `expected Option to be Some(${JSON.stringify(expected)}) but got ${JSON.stringify(actualValue)}`,
        pass: false,
      };
    }
  },
});

// Test environment configuration
export const setupFunctionalTests = (): void => {
  // Set up fp-ts test environment
  process.env.NODE_ENV = 'test';
  process.env.FUNCTIONAL_TESTING = 'true';
};

// Helper to run TaskEither in tests
export const runTaskEither = async <E, A>(te: TE.TaskEither<E, A>): Promise<E.Either<E, A>> => {
  return te();
};

// Helper to run Task in tests
export const runTask = async <A>(task: T.Task<A>): Promise<A> => {
  return task();
};

// Initialize functional test setup
setupFunctionalTests();