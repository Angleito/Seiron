/**
 * Mock Services Index
 * Exports all functional mock implementations
 */

export * from './blockchain';
export * from './cache';

// Re-export fp-ts types for convenience
export * as E from 'fp-ts/Either';
export * as O from 'fp-ts/Option';
export * as TE from 'fp-ts/TaskEither';
export { pipe } from 'fp-ts/function';

// Common mock patterns
export const createMockSuccess = <T>(value: T): E.Either<never, T> => E.right(value);
export const createMockFailure = <E>(error: E): E.Either<E, never> => E.left(error);
export const createMockTaskSuccess = <T>(value: T): TE.TaskEither<never, T> => TE.right(value);
export const createMockTaskFailure = <E>(error: E): TE.TaskEither<E, never> => TE.left(error);

// Delay utilities for testing async operations
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createDelayedMock = <T>(value: T, delayMs: number): TE.TaskEither<never, T> =>
  TE.tryCatch(
    async () => {
      await delay(delayMs);
      return value;
    },
    () => new Error('Unexpected error') as never // This should never happen
  );