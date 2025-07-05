import type { Either, Option, ReadonlyRecord } from './data.js';
export type ArrayElement<A> = A extends ReadonlyArray<infer T> ? T : never;
export type ReturnType<T> = T extends (...args: ReadonlyArray<any>) => infer R ? R : never;
export type Parameters<T> = T extends (...args: infer P) => any ? P : never;
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type Flatten<T> = T extends ReadonlyArray<infer U> ? U extends ReadonlyArray<any> ? Flatten<U> : U : T;
export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
export type Exact<T, U> = T extends U ? (U extends T ? T : never) : never;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type TupleToUnion<T extends ReadonlyArray<any>> = T[number];
export type Path<T> = T extends ReadonlyRecord<string, any> ? {
    [K in keyof T]: K extends string ? T[K] extends ReadonlyRecord<string, any> ? K | `${K}.${Path<T[K]>}` : K : never;
}[keyof T] : never;
export type PathValue<T, P extends Path<T>> = P extends keyof T ? T[P] : P extends `${infer K}.${infer Rest}` ? K extends keyof T ? Rest extends Path<T[K]> ? PathValue<T[K], Rest> : never : never : never;
export declare const Maybe: {
    some: <T>(value: T) => Option<T>;
    none: <T>() => Option<T>;
    map: <T, U>(option: Option<T>, fn: (value: T) => U) => Option<U>;
    flatMap: <T, U>(option: Option<T>, fn: (value: T) => Option<U>) => Option<U>;
    filter: <T>(option: Option<T>, predicate: (value: T) => boolean) => Option<T>;
    getOrElse: <T>(option: Option<T>, defaultValue: T) => T;
    fold: <T, U>(option: Option<T>, onNone: () => U, onSome: (value: T) => U) => U;
};
export declare const EitherM: {
    left: <L, R>(value: L) => Either<L, R>;
    right: <L, R>(value: R) => Either<L, R>;
    map: <L, R, U>(either: Either<L, R>, fn: (value: R) => U) => Either<L, U>;
    mapLeft: <L, R, U>(either: Either<L, R>, fn: (value: L) => U) => Either<U, R>;
    flatMap: <L, R, U>(either: Either<L, R>, fn: (value: R) => Either<L, U>) => Either<L, U>;
    fold: <L, R, U>(either: Either<L, R>, onLeft: (left: L) => U, onRight: (right: R) => U) => U;
    swap: <L, R>(either: Either<L, R>) => Either<R, L>;
    fromNullable: <R>(value: R | null | undefined) => Either<null, R>;
    tryCatch: <R>(fn: () => R) => Either<Error, R>;
};
export type ValidationResult<T> = Either<ReadonlyArray<string>, T>;
export type Validator<T> = (value: unknown) => ValidationResult<T>;
export type ValidationError = {
    readonly field: string;
    readonly message: string;
    readonly code: string;
    readonly value?: unknown;
};
export type ValidationContext = {
    readonly path: ReadonlyArray<string>;
    readonly errors: ReadonlyArray<ValidationError>;
};
export type Schema<T> = {
    readonly validate: Validator<T>;
    readonly optional: () => Schema<T | undefined>;
    readonly nullable: () => Schema<T | null>;
    readonly default: (defaultValue: T) => Schema<T>;
    readonly transform: <U>(fn: (value: T) => U) => Schema<U>;
    readonly refine: (predicate: (value: T) => boolean, message: string) => Schema<T>;
};
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
export declare const compose: <T>(...fns: ReadonlyArray<(arg: T) => T>) => (value: T) => T;
export declare const pipe: <T>(value: T, ...fns: ReadonlyArray<(arg: T) => T>) => T;
export declare const curry: <A, B, C>(fn: (a: A, b: B) => C) => (a: A) => (b: B) => C;
export declare const partial: <Args extends ReadonlyArray<any>, Return>(fn: (...args: Args) => Return, ...partialArgs: any[]) => (...remainingArgs: any[]) => Return;
export declare const memoize: <Args extends ReadonlyArray<any>, Return>(fn: (...args: Args) => Return, keyFn?: (...args: Args) => string) => ((...args: Args) => Return);
export type AsyncOption<T> = Promise<Option<T>>;
export type AsyncEither<L, R> = Promise<Either<L, R>>;
export type AsyncResult<T, E = Error> = AsyncEither<E, T>;
export declare const AsyncUtils: {
    mapOption: <T, U>(asyncOption: AsyncOption<T>, fn: (value: T) => U | Promise<U>) => AsyncOption<U>;
    flatMapOption: <T, U>(asyncOption: AsyncOption<T>, fn: (value: T) => AsyncOption<U>) => AsyncOption<U>;
    mapEither: <L, R, U>(asyncEither: AsyncEither<L, R>, fn: (value: R) => U | Promise<U>) => AsyncEither<L, U>;
    flatMapEither: <L, R, U>(asyncEither: AsyncEither<L, R>, fn: (value: R) => AsyncEither<L, U>) => AsyncEither<L, U>;
    sequenceOptions: <T>(asyncOptions: ReadonlyArray<AsyncOption<T>>) => AsyncOption<ReadonlyArray<T>>;
    sequenceEithers: <L, R>(asyncEithers: ReadonlyArray<AsyncEither<L, R>>) => AsyncEither<L, ReadonlyArray<R>>;
    mapWithConcurrency: <T, U>(items: ReadonlyArray<T>, fn: (item: T) => Promise<U>, concurrency?: number) => Promise<ReadonlyArray<U>>;
};
export type EventMap = ReadonlyRecord<string, any>;
export type EventListener<T> = (event: T) => void | Promise<void>;
export interface TypedEventEmitter<Events extends EventMap> {
    readonly on: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
    readonly off: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
    readonly emit: <K extends keyof Events>(event: K, data: Events[K]) => Promise<void>;
    readonly once: <K extends keyof Events>(event: K, listener: EventListener<Events[K]>) => void;
    readonly removeAllListeners: <K extends keyof Events>(event?: K) => void;
    readonly listenerCount: <K extends keyof Events>(event: K) => number;
}
export interface Lens<S, A> {
    readonly get: (s: S) => A;
    readonly set: (a: A) => (s: S) => S;
    readonly modify: (f: (a: A) => A) => (s: S) => S;
}
export declare const lens: <S, A>(getter: (s: S) => A, setter: (a: A) => (s: S) => S) => Lens<S, A>;
export declare const composeLens: <S, A, B>(lens1: Lens<S, A>, lens2: Lens<A, B>) => Lens<S, B>;
export type ParseResult<T> = Either<string, readonly [T, string]>;
export type Parser<T> = (input: string) => ParseResult<T>;
export declare const Parsers: {
    char: (expected: string) => Parser<string>;
    string: (expected: string) => Parser<string>;
    map: <T, U>(parser: Parser<T>, fn: (value: T) => U) => Parser<U>;
    sequence: <T, U>(p1: Parser<T>, p2: Parser<U>) => Parser<readonly [T, U]>;
    alt: <T>(p1: Parser<T>, p2: Parser<T>) => Parser<T>;
    many: <T>(parser: Parser<T>) => Parser<ReadonlyArray<T>>;
};
export type Nat = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Add<A extends Nat, B extends Nat> = A extends 0 ? B : B extends 0 ? A : A extends 1 ? B extends 1 ? 2 : B extends 2 ? 3 : B extends 3 ? 4 : never : never;
export type Tuple<T, N extends Nat> = N extends 0 ? readonly [] : N extends 1 ? readonly [T] : N extends 2 ? readonly [T, T] : N extends 3 ? readonly [T, T, T] : never;
export type State<S, A> = (state: S) => readonly [A, S];
export declare const StateM: {
    of: <S, A>(value: A) => State<S, A>;
    map: <S, A, B>(state: State<S, A>, fn: (value: A) => B) => State<S, B>;
    flatMap: <S, A, B>(state: State<S, A>, fn: (value: A) => State<S, B>) => State<S, B>;
    get: <S>() => State<S, S>;
    put: <S>(newState: S) => State<S, void>;
    modify: <S>(fn: (state: S) => S) => State<S, void>;
    run: <S, A>(state: State<S, A>, initialState: S) => readonly [A, S];
    eval: <S, A>(state: State<S, A>, initialState: S) => A;
    exec: <S, A>(state: State<S, A>, initialState: S) => S;
};
export type Free<F, A> = {
    readonly _tag: 'Pure';
    readonly value: A;
} | {
    readonly _tag: 'Impure';
    readonly effect: F;
    readonly cont: (x: any) => Free<F, A>;
};
export declare const FreeM: {
    pure: <F, A>(value: A) => Free<F, A>;
    liftF: <F, A>(effect: F) => Free<F, A>;
    map: <F, A, B>(free: Free<F, A>, fn: (value: A) => B) => Free<F, B>;
    flatMap: <F, A, B>(free: Free<F, A>, fn: (value: A) => Free<F, B>) => Free<F, B>;
};
//# sourceMappingURL=utils.d.ts.map