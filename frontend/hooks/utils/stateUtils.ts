// Functional State Management Utilities
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

// Generic state validation
export type StateValidator<T> = (state: T) => E.Either<string, T>

// Generic state selector
export type StateSelector<TState, TResult> = (state: TState) => TResult

// Generic state updater that ensures immutability
export const createImmutableUpdater = <T>(
  updateFn: (state: T) => T
) => (state: T): T => {
  try {
    const newState = updateFn({ ...state })
    return Object.freeze(newState)
  } catch (error) {
    // Return original state if update fails
    return state
  }
}

// Safe state getter with Option
export const safeGet = <T, K extends keyof T>(
  state: T,
  key: K
): O.Option<T[K]> => {
  return state[key] !== undefined ? O.some(state[key]) : O.none
}

// State composition utilities
export const composeState = <T extends Record<string, any>>(
  ...partialStates: Partial<T>[]
): T => {
  return Object.freeze(
    partialStates.reduce((acc, partial) => ({ ...acc, ...partial }), {} as T)
  )
}

// Async state updater with error handling
export const createAsyncStateUpdater = <TState, TInput, TError>(
  asyncFn: (input: TInput, currentState: TState) => TE.TaskEither<TError, Partial<TState>>
) => {
  return (input: TInput, currentState: TState) =>
    pipe(
      asyncFn(input, currentState),
      TE.map(partialState => ({ ...currentState, ...partialState })),
      TE.mapLeft(error => ({ error, state: currentState }))
    )
}

// State lens for deep property access
export const createLens = <TState, TProperty>(
  getter: (state: TState) => TProperty,
  setter: (property: TProperty, state: TState) => TState
) => ({
  get: getter,
  set: setter,
  modify: (modifier: (prop: TProperty) => TProperty) => (state: TState) =>
    setter(modifier(getter(state)), state)
})

// Performance-optimized state comparison
export const shallowEqual = <T extends Record<string, any>>(
  a: T,
  b: T
): boolean => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) {
    return false
  }
  
  for (const key of keysA) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  
  return true
}

// Deep equality check with structural comparison
export const deepEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true
  
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b
  }
  
  if (typeof a !== typeof b) return false
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a as any)
    const keysB = Object.keys(b as any)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (!deepEqual((a as any)[key], (b as any)[key])) {
        return false
      }
    }
    
    return true
  }
  
  return false
}

// State cache with automatic cleanup
export class StateCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private ttl: number
  
  constructor(ttlMs: number = 5000) {
    this.ttl = ttlMs
  }
  
  get(key: string): O.Option<T> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return O.none
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return O.none
    }
    
    return O.some(entry.value)
  }
  
  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() })
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// State machine helpers
export type StateTransition<TState, TAction> = {
  from: TState
  to: TState
  guard?: (state: TState, action: TAction) => boolean
  effect?: (state: TState, action: TAction) => void
}

export const createStateMachine = <TState, TAction>(
  initialState: TState,
  transitions: StateTransition<TState, TAction>[]
) => {
  return (currentState: TState, action: TAction): TState => {
    const validTransition = transitions.find(
      transition =>
        transition.from === currentState &&
        (transition.guard ? transition.guard(currentState, action) : true)
    )
    
    if (validTransition) {
      validTransition.effect?.(currentState, action)
      return validTransition.to
    }
    
    return currentState
  }
}

// Reducer composition utility
export const combineReducers = <TState extends Record<string, any>, TAction>(
  reducers: {
    [K in keyof TState]: (state: TState[K], action: TAction) => TState[K]
  }
) => {
  return (state: TState, action: TAction): TState => {
    let hasChanged = false
    const nextState = {} as TState
    
    for (const key in reducers) {
      const reducer = reducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    
    return hasChanged ? nextState : state
  }
}

// Effect manager for side effects
export class EffectManager {
  private effects = new Set<() => void>()
  
  add(effect: () => void): void {
    this.effects.add(effect)
  }
  
  remove(effect: () => void): void {
    this.effects.delete(effect)
  }
  
  executeAll(): void {
    this.effects.forEach(effect => {
      try {
        effect()
      } catch (error) {
        console.error('Effect execution failed:', error)
      }
    })
  }
  
  clear(): void {
    this.effects.clear()
  }
}

// Type-safe action creator factory
export const createActionCreator = <TPayload = void>() => <TType extends string>(
  type: TType
) => {
  return (payload: TPayload) => ({
    type,
    payload
  } as const)
}

// Middleware system for reducers
export type ReducerMiddleware<TState, TAction> = (
  store: { getState: () => TState; dispatch: (action: TAction) => void }
) => (next: (action: TAction) => TState) => (action: TAction) => TState

export const applyMiddleware = <TState, TAction>(
  reducer: (state: TState, action: TAction) => TState,
  middleware: ReducerMiddleware<TState, TAction>[]
) => {
  return (state: TState, action: TAction): TState => {
    let currentState = state
    
    const store = {
      getState: () => currentState,
      dispatch: (action: TAction) => {
        currentState = reducer(currentState, action)
      }
    }
    
    const chain = middleware.map(mw => mw(store))
    const composedMiddleware = chain.reduce(
      (a, b) => next => a(b(next)),
      (next: (action: TAction) => TState) => next
    )
    
    return composedMiddleware((action: TAction) => reducer(state, action))(action)
  }
}