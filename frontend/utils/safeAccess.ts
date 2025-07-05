// Functional programming utilities for safe null/undefined handling
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

// Safe array access with Option types
export const safeArrayAccess = <T>(array: T[] | undefined, index: number): O.Option<T> => 
  O.fromNullable(array?.[index])

// Safe property access with Option types  
export const safePropAccess = <T, K extends keyof T>(obj: T | undefined, key: K): O.Option<T[K]> =>
  O.fromNullable(obj?.[key])

// Safe function execution with Option
export const safeExec = <T, R>(fn: ((arg: T) => R) | undefined, arg: T): O.Option<R> =>
  pipe(
    O.fromNullable(fn),
    O.map(f => f(arg))
  )

// Safe object method call
export const safeMethodCall = <T, K extends keyof T, R>(
  obj: T | undefined, 
  method: K, 
  ...args: T[K] extends (...args: any[]) => R ? Parameters<T[K]> : never
): O.Option<R> => {
  if (!obj || typeof obj[method] !== 'function') {
    return O.none
  }
  try {
    const result = (obj[method] as any)(...args)
    return O.some(result)
  } catch {
    return O.none
  }
}

// Safe touch event access
export const safeTouchAccess = (e: TouchEvent | React.TouchEvent, index: number = 0): O.Option<Touch> =>
  safeArrayAccess(e.touches as Touch[], index)

// Safe DOM element access with getBoundingClientRect
export const safeBoundingRect = (element: Element | null): O.Option<DOMRect> =>
  pipe(
    O.fromNullable(element),
    O.chain(el => O.tryCatch(() => el.getBoundingClientRect()))
  )

// Safe numeric operations
export const safeDivide = (a: number, b: number): O.Option<number> =>
  b === 0 ? O.none : O.some(a / b)

export const safeMin = (a: number | undefined, b: number | undefined): O.Option<number> =>
  pipe(
    O.fromNullable(a),
    O.chain(aVal => pipe(
      O.fromNullable(b),
      O.map(bVal => Math.min(aVal, bVal))
    ))
  )

export const safeMax = (a: number | undefined, b: number | undefined): O.Option<number> =>
  pipe(
    O.fromNullable(a),
    O.chain(aVal => pipe(
      O.fromNullable(b),
      O.map(bVal => Math.max(aVal, bVal))
    ))
  )

// Default value utilities
export const withDefault = <T>(defaultValue: T) => (option: O.Option<T>): T =>
  pipe(option, O.getOrElse(() => defaultValue))

// Chain operations safely
export const safeChain = <T, U>(f: (a: T) => O.Option<U>) => (option: O.Option<T>): O.Option<U> =>
  pipe(option, O.chain(f))