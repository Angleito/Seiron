/**
 * @fileoverview Utility types and functional programming helpers
 * Contains advanced type utilities, combinators, and functional programming constructs
 */

import type { Either, Option, ReadonlyRecord } from './data.js';

/**
 * Advanced type utilities
 */

/** Get the type of array elements */
export type ArrayElement<A> = A extends ReadonlyArray<infer T> ? T : never;

/** Get the return type of a function */
export type ReturnType<T> = T extends (...args: ReadonlyArray<any>) => infer R ? R : never;

/** Get the parameters of a function */
export type Parameters<T> = T extends (...args: infer P) => any ? P : never;

/** Extract the value type from a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Flatten nested arrays */
export type Flatten<T> = T extends ReadonlyArray<infer U> 
  ? U extends ReadonlyArray<any> 
    ? Flatten<U> 
    : U 
  : T;

/** Union to intersection type */
export type UnionToIntersection<U> = 
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** Exact type matching */
export type Exact<T, U> = T extends U ? (U extends T ? T : never) : never;

/** Non-nullable type */
export type NonNullable<T> = T extends null | undefined ? never : T;

/** Tuple to union type */
export type TupleToUnion<T extends ReadonlyArray<any>> = T[number];

/** Object path type */
export type Path<T> = T extends ReadonlyRecord<string, any>
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends ReadonlyRecord<string, any>
          ? K | `${K}.${Path<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

/** Get type at path */
export type PathValue<T, P extends Path<T>> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : never;

/**
 * Functional data structures
 */

/** Maybe/Option monad implementation */
export const Maybe = {
  some: <T>(value: T): Option<T> => ({ _tag: 'Some', value }),
  none: <T>(): Option<T> => ({ _tag: 'None' }),
  
  map: <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> =>
    option._tag === 'Some' ? Maybe.some(fn(option.value)) : Maybe.none(),
  
  flatMap: <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
    option._tag === 'Some' ? fn(option.value) : Maybe.none(),
  
  filter: <T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> =>
    option._tag === 'Some' && predicate(option.value) ? option : Maybe.none(),
  
  getOrElse: <T>(option: Option<T>, defaultValue: T): T =>
    option._tag === 'Some' ? option.value : defaultValue,
  
  fold: <T, U>(option: Option<T>, onNone: () => U, onSome: (value: T) => U): U =>
    option._tag === 'Some' ? onSome(option.value) : onNone()
};

/** Either monad implementation */
export const EitherM = {
  left: <L, R>(value: L): Either<L, R> => ({ _tag: 'Left', left: value }),
  right: <L, R>(value: R): Either<L, R> => ({ _tag: 'Right', right: value }),
  
  map: <L, R, U>(either: Either<L, R>, fn: (value: R) => U): Either<L, U> =>
    either._tag === 'Right' ? EitherM.right(fn(either.right)) : either,
  
  mapLeft: <L, R, U>(either: Either<L, R>, fn: (value: L) => U): Either<U, R> =>
    either._tag === 'Left' ? EitherM.left(fn(either.left)) : either,
  
  flatMap: <L, R, U>(either: Either<L, R>, fn: (value: R) => Either<L, U>): Either<L, U> =>
    either._tag === 'Right' ? fn(either.right) : either,
  
  fold: <L, R, U>(either: Either<L, R>, onLeft: (left: L) => U, onRight: (right: R) => U): U =>
    either._tag === 'Left' ? onLeft(either.left) : onRight(either.right),
  
  swap: <L, R>(either: Either<L, R>): Either<R, L> =>
    either._tag === 'Left' ? EitherM.right(either.left) : EitherM.left(either.right),
  
  fromNullable: <R>(value: R | null | undefined): Either<null, R> =>
    value != null ? EitherM.right(value) : EitherM.left(null),
  
  tryCatch: <R>(fn: () => R): Either<Error, R> => {
    try {
      return EitherM.right(fn());
    } catch (error) {
      return EitherM.left(error instanceof Error ? error : new Error(String(error)));
    }
  }
};

/**
 * Validation types and utilities
 */

/** Validation result */
export type ValidationResult<T> = Either<ReadonlyArray<string>, T>;

/** Validator function type */
export type Validator<T> = (value: unknown) => ValidationResult<T>;

/** Validation error */
export type ValidationError = {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value?: unknown;
};

/** Validation context */
export type ValidationContext = {
  readonly path: ReadonlyArray<string>;
  readonly errors: ReadonlyArray<ValidationError>;
};

/** Schema validation type */
export type Schema<T> = {
  readonly validate: Validator<T>;
  readonly optional: () => Schema<T | undefined>;
  readonly nullable: () => Schema<T | null>;
  readonly default: (defaultValue: T) => Schema<T>;
  readonly transform: <U>(fn: (value: T) => U) => Schema<U>;
  readonly refine: (predicate: (value: T) => boolean, message: string) => Schema<T>;
};

/**
 * Immutable data structure implementations
 */

/** Immutable List implementation */
export interface ImmutableList<T> {
  readonly length: number;
  readonly isEmpty: boolean;
  readonly head: Option<T>;
  readonly tail: Option<ImmutableList<T>>;
  
  readonly cons: (item: T) => ImmutableList<T>;
  readonly append: (item: T) => ImmutableList<T>;
  readonly prepend: (item: T) => ImmutableList<T>;
  readonly concat: (other: ImmutableList<T>) => ImmutableList<T>;
  readonly reverse: () => ImmutableList<T>;
  
  readonly get: (index: number) => Option<T>;
  readonly set: (index: number, item: T) => ImmutableList<T>;
  readonly insert: (index: number, item: T) => ImmutableList<T>;
  readonly remove: (index: number) => ImmutableList<T>;
  
  readonly map: <U>(fn: (item: T) => U) => ImmutableList<U>;
  readonly filter: (predicate: (item: T) => boolean) => ImmutableList<T>;
  readonly reduce: <U>(fn: (acc: U, item: T) => U, initial: U) => U;
  readonly fold: <U>(fn: (acc: U, item: T) => U, initial: U) => U;
  readonly foldRight: <U>(fn: (item: T, acc: U) => U, initial: U) => U;
  
  readonly find: (predicate: (item: T) => boolean) => Option<T>;
  readonly findIndex: (predicate: (item: T) => boolean) => Option<number>;
  readonly exists: (predicate: (item: T) => boolean) => boolean;
  readonly forall: (predicate: (item: T) => boolean) => boolean;
  
  readonly take: (count: number) => ImmutableList<T>;
  readonly drop: (count: number) => ImmutableList<T>;
  readonly takeWhile: (predicate: (item: T) => boolean) => ImmutableList<T>;
  readonly dropWhile: (predicate: (item: T) => boolean) => ImmutableList<T>;
  
  readonly toArray: () => ReadonlyArray<T>;
  readonly toString: () => string;
}

/** Immutable Map implementation */
export interface ImmutableMap<K, V> {
  readonly size: number;
  readonly isEmpty: boolean;
  
  readonly get: (key: K) => Option<V>;
  readonly set: (key: K, value: V) => ImmutableMap<K, V>;
  readonly remove: (key: K) => ImmutableMap<K, V>;
  readonly clear: () => ImmutableMap<K, V>;
  
  readonly has: (key: K) => boolean;
  readonly keys: () => ImmutableList<K>;
  readonly values: () => ImmutableList<V>;
  readonly entries: () => ImmutableList<readonly [K, V]>;
  
  readonly map: <U>(fn: (value: V, key: K) => U) => ImmutableMap<K, U>;
  readonly filter: (predicate: (value: V, key: K) => boolean) => ImmutableMap<K, V>;
  readonly reduce: <U>(fn: (acc: U, value: V, key: K) => U, initial: U) => U;
  
  readonly merge: (other: ImmutableMap<K, V>) => ImmutableMap<K, V>;
  readonly mergeWith: (other: ImmutableMap<K, V>, fn: (v1: V, v2: V) => V) => ImmutableMap<K, V>;
  
  readonly toObject: () => ReadonlyRecord<string, V>;
  readonly toString: () => string;
}

/**
 * Functional composition utilities
 */

/** Compose functions from right to left */
export const compose = <T>(...fns: ReadonlyArray<(arg: T) => T>) =>
  (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value);

/** Pipe functions from left to right */
export const pipe = <T>(value: T, ...fns: ReadonlyArray<(arg: T) => T>): T =>
  fns.reduce((acc, fn) => fn(acc), value);

/** Curry a function */
export const curry = <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) => (b: B): C => fn(a, b);

/** Partial application */
export const partial = <Args extends ReadonlyArray<any>, Return>(
  fn: (...args: Args) => Return,
  ...partialArgs: any[]
) => (...remainingArgs: any[]): Return =>
  fn(...(partialArgs.concat(remainingArgs) as unknown as Args));

/** Memoization utility */
export const memoize = <Args extends ReadonlyArray<any>, Return>(
  fn: (...args: Args) => Return,
  keyFn?: (...args: Args) => string
): ((...args: Args) => Return) => {
  const cache = new Map<string, Return>();
  const getKey = keyFn || ((...args) => JSON.stringify(args));
  
  return (...args: Args): Return => {
    const key = getKey(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Async utilities for functional programming
 */

/** Async Option type */
export type AsyncOption<T> = Promise<Option<T>>;

/** Async Either type */
export type AsyncEither<L, R> = Promise<Either<L, R>>;

/** Async Result type */
export type AsyncResult<T, E = Error> = AsyncEither<E, T>;

/** Async utilities */
export const AsyncUtils = {
  /** Map over async option */
  mapOption: async <T, U>(
    asyncOption: AsyncOption<T>,
    fn: (value: T) => U | Promise<U>
  ): AsyncOption<U> => {
    const option = await asyncOption;
    return option._tag === 'Some' 
      ? Maybe.some(await fn(option.value))
      : Maybe.none();
  },

  /** FlatMap over async option */
  flatMapOption: async <T, U>(
    asyncOption: AsyncOption<T>,
    fn: (value: T) => AsyncOption<U>
  ): AsyncOption<U> => {
    const option = await asyncOption;
    return option._tag === 'Some' ? fn(option.value) : Maybe.none();
  },

  /** Map over async either */
  mapEither: async <L, R, U>(
    asyncEither: AsyncEither<L, R>,
    fn: (value: R) => U | Promise<U>
  ): AsyncEither<L, U> => {
    const either = await asyncEither;
    return either._tag === 'Right' 
      ? EitherM.right(await fn(either.right))
      : either;
  },

  /** FlatMap over async either */
  flatMapEither: async <L, R, U>(
    asyncEither: AsyncEither<L, R>,
    fn: (value: R) => AsyncEither<L, U>
  ): AsyncEither<L, U> => {
    const either = await asyncEither;
    return either._tag === 'Right' ? fn(either.right) : either;
  },

  /** Sequence array of async options */
  sequenceOptions: async <T>(
    asyncOptions: ReadonlyArray<AsyncOption<T>>
  ): AsyncOption<ReadonlyArray<T>> => {
    const options = await Promise.all(asyncOptions);
    const values: T[] = [];
    
    for (const option of options) {
      if (option._tag === 'None') {
        return Maybe.none();
      }
      values.push(option.value);
    }
    
    return Maybe.some(values);
  },

  /** Sequence array of async eithers */
  sequenceEithers: async <L, R>(
    asyncEithers: ReadonlyArray<AsyncEither<L, R>>
  ): AsyncEither<L, ReadonlyArray<R>> => {
    const eithers = await Promise.all(asyncEithers);
    const values: R[] = [];
    
    for (const either of eithers) {
      if (either._tag === 'Left') {
        return either;
      }
      values.push(either.right);
    }
    
    return EitherM.right(values);
  },

  /** Parallel processing with concurrency limit */
  mapWithConcurrency: async <T, U>(
    items: ReadonlyArray<T>,
    fn: (item: T) => Promise<U>,
    concurrency = 10
  ): Promise<ReadonlyArray<U>> => {
    const results: U[] = [];
    const inProgress: Promise<void>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const promise = fn(items[i]).then(result => {
        results[i] = result;
      });
      
      inProgress.push(promise);
      
      if (inProgress.length >= concurrency) {
        await Promise.race(inProgress);
        inProgress.splice(inProgress.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(inProgress);
    return results;
  }
};

/**
 * Type-safe event emitter
 */

/** Event map type */
export type EventMap = ReadonlyRecord<string, any>;

/** Event listener type */
export type EventListener<T> = (event: T) => void | Promise<void>;

/** Type-safe event emitter */
export interface TypedEventEmitter<Events extends EventMap> {
  readonly on: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
  readonly off: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
  readonly emit: <K extends keyof Events>(event: K, data: Events[K]) => Promise<void>;
  readonly once: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
  readonly removeAllListeners: <K extends keyof Events>(event?: K) => void;
  readonly listenerCount: <K extends keyof Events>(event: K) => number;
}

/**
 * Lens for immutable updates
 */

/** Lens type for functional updates */
export interface Lens<S, A> {
  readonly get: (s: S) => A;
  readonly set: (a: A) => (s: S) => S;
  readonly modify: (f: (a: A) => A) => (s: S) => S;
}

/** Create lens */
export const lens = <S, A>(
  getter: (s: S) => A,
  setter: (a: A) => (s: S) => S
): Lens<S, A> => ({
  get: getter,
  set: setter,
  modify: (f: (a: A) => A) => (s: S) => setter(f(getter(s)))(s)
});

/** Compose lenses */
export const composeLens = <S, A, B>(
  lens1: Lens<S, A>,
  lens2: Lens<A, B>
): Lens<S, B> => ({
  get: (s: S) => lens2.get(lens1.get(s)),
  set: (b: B) => (s: S) => lens1.modify(lens2.set(b))(s),
  modify: (f: (b: B) => B) => (s: S) => lens1.modify(lens2.modify(f))(s)
});

/**
 * Parser combinator types
 */

/** Parser result */
export type ParseResult<T> = Either<string, readonly [T, string]>;

/** Parser type */
export type Parser<T> = (input: string) => ParseResult<T>;

/** Parser combinators */
export const Parsers = {
  /** Parse a single character */
  char: (expected: string): Parser<string> => (input: string) =>
    input.length > 0 && input[0] === expected
      ? EitherM.right([expected, input.slice(1)])
      : EitherM.left(`Expected '${expected}', got '${input[0] || 'EOF'}'`),

  /** Parse a string */
  string: (expected: string): Parser<string> => (input: string) =>
    input.startsWith(expected)
      ? EitherM.right([expected, input.slice(expected.length)])
      : EitherM.left(`Expected '${expected}', got '${input.slice(0, expected.length)}'`),

  /** Map parser result */
  map: <T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> => (input: string) =>
    EitherM.flatMap(parser(input), ([value, rest]) => 
      EitherM.right([fn(value), rest])),

  /** Sequence two parsers */
  sequence: <T, U>(p1: Parser<T>, p2: Parser<U>): Parser<readonly [T, U]> => (input: string) =>
    EitherM.flatMap(p1(input), ([v1, rest1]) =>
      EitherM.flatMap(p2(rest1), ([v2, rest2]) =>
        EitherM.right([[v1, v2], rest2]))),

  /** Alternative parsers */
  alt: <T>(p1: Parser<T>, p2: Parser<T>): Parser<T> => (input: string) => {
    const result1 = p1(input);
    return result1._tag === 'Right' ? result1 : p2(input);
  },

  /** Many (zero or more) */
  many: <T>(parser: Parser<T>): Parser<ReadonlyArray<T>> => (input: string) => {
    const results: T[] = [];
    let current = input;
    
    while (true) {
      const result = parser(current);
      if (result._tag === 'Left') {
        break;
      }
      results.push(result.right[0]);
      current = result.right[1];
    }
    
    return EitherM.right([results, current]);
  }
};

/**
 * Type-level arithmetic
 */

/** Natural numbers at type level */
export type Nat = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Add two natural numbers */
export type Add<A extends Nat, B extends Nat> = 
  A extends 0 ? B :
  B extends 0 ? A :
  A extends 1 ? B extends 1 ? 2 : B extends 2 ? 3 : B extends 3 ? 4 : never :
  never; // Simplified for demo

/** Fixed-length tuple */
export type Tuple<T, N extends Nat> = 
  N extends 0 ? readonly [] :
  N extends 1 ? readonly [T] :
  N extends 2 ? readonly [T, T] :
  N extends 3 ? readonly [T, T, T] :
  never; // Simplified for demo

/**
 * State monad for stateful computations
 */

/** State monad type */
export type State<S, A> = (state: S) => readonly [A, S];

/** State monad utilities */
export const StateM = {
  /** Create state computation that returns a value */
  of: <S, A>(value: A): State<S, A> => (state: S) => [value, state],

  /** Map over state computation */
  map: <S, A, B>(state: State<S, A>, fn: (value: A) => B): State<S, B> =>
    (s: S) => {
      const [value, newState] = state(s);
      return [fn(value), newState];
    },

  /** FlatMap state computations */
  flatMap: <S, A, B>(state: State<S, A>, fn: (value: A) => State<S, B>): State<S, B> =>
    (s: S) => {
      const [value, newState] = state(s);
      return fn(value)(newState);
    },

  /** Get current state */
  get: <S>(): State<S, S> => (state: S) => [state, state],

  /** Set new state */
  put: <S>(newState: S): State<S, void> => () => [undefined, newState],

  /** Modify state */
  modify: <S>(fn: (state: S) => S): State<S, void> =>
    StateM.flatMap(StateM.get<S>(), (state: S) => StateM.put(fn(state))),

  /** Run state computation */
  run: <S, A>(state: State<S, A>, initialState: S): readonly [A, S] =>
    state(initialState),

  /** Extract value from state computation */
  eval: <S, A>(state: State<S, A>, initialState: S): A =>
    state(initialState)[0],

  /** Extract final state from computation */
  exec: <S, A>(state: State<S, A>, initialState: S): S =>
    state(initialState)[1]
};

/**
 * Free monad for composable effects
 */

/** Free monad type */
export type Free<F, A> = 
  | { readonly _tag: 'Pure'; readonly value: A }
  | { readonly _tag: 'Impure'; readonly effect: F; readonly cont: (x: any) => Free<F, A> };

/** Free monad utilities */
export const FreeM = {
  /** Pure value */
  pure: <F, A>(value: A): Free<F, A> => ({ _tag: 'Pure', value }),

  /** Lift effect */
  liftF: <F, A>(effect: F): Free<F, A> => ({ 
    _tag: 'Impure', 
    effect, 
    cont: (x: A) => FreeM.pure(x) 
  }),

  /** Map over free monad */
  map: <F, A, B>(free: Free<F, A>, fn: (value: A) => B): Free<F, B> =>
    free._tag === 'Pure' 
      ? FreeM.pure(fn(free.value))
      : { _tag: 'Impure', effect: free.effect, cont: (x: any) => FreeM.map(free.cont(x), fn) },

  /** FlatMap free monad */
  flatMap: <F, A, B>(free: Free<F, A>, fn: (value: A) => Free<F, B>): Free<F, B> =>
    free._tag === 'Pure'
      ? fn(free.value)
      : { _tag: 'Impure', effect: free.effect, cont: (x: any) => FreeM.flatMap(free.cont(x), fn) }
};

// All types are already declared above and exported via the top-level declarations