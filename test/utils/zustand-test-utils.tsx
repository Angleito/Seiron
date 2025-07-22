import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { act } from '@testing-library/react'
import { StoreApi, UseBoundStore } from 'zustand'

// Type definitions for store testing
export type StoreTestUtils<T> = {
  getState: () => T
  setState: (partial: Partial<T>) => void
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
  destroy: () => void
}

/**
 * Create a test version of a Zustand store with additional utilities
 */
export function createTestStore<T>(
  createStore: () => UseBoundStore<StoreApi<T>>
): StoreTestUtils<T> & UseBoundStore<StoreApi<T>> {
  const store = createStore()
  
  return {
    ...store,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    destroy: store.destroy,
  }
}

/**
 * Reset a Zustand store to its initial state
 */
export function resetStore<T>(
  store: UseBoundStore<StoreApi<T>>,
  initialState: Partial<T>
) {
  act(() => {
    store.setState(initialState as T, true)
  })
}

/**
 * Wait for a store state change
 */
export function waitForStoreChange<T>(
  store: UseBoundStore<StoreApi<T>>,
  predicate: (state: T) => boolean,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Store state change timeout after ${timeout}ms`))
    }, timeout)

    const unsubscribe = store.subscribe((state) => {
      if (predicate(state)) {
        clearTimeout(timeoutId)
        unsubscribe()
        resolve(state)
      }
    })

    // Check initial state
    const initialState = store.getState()
    if (predicate(initialState)) {
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(initialState)
    }
  })
}

/**
 * Mock store for testing components that use stores
 */
export function createMockStore<T>(initialState: T): StoreTestUtils<T> {
  let state = { ...initialState }
  const listeners = new Set<(state: T, prevState: T) => void>()

  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      const prevState = { ...state }
      state = { ...state, ...partial }
      listeners.forEach(listener => listener(state, prevState))
    },
    subscribe: (listener: (state: T, prevState: T) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    destroy: () => {
      listeners.clear()
    }
  } as StoreTestUtils<T>
}

/**
 * Store test wrapper component
 */
interface StoreTestWrapperProps<T> {
  children: React.ReactNode
  stores?: Record<string, UseBoundStore<StoreApi<T>>>
  initialStates?: Record<string, Partial<T>>
}

export function StoreTestWrapper<T>({ 
  children, 
  stores = {}, 
  initialStates = {} 
}: StoreTestWrapperProps<T>) {
  React.useEffect(() => {
    // Set initial states for stores
    Object.entries(initialStates).forEach(([storeName, initialState]) => {
      const store = stores[storeName]
      if (store && initialState) {
        store.setState(initialState as T, true)
      }
    })
  }, [stores, initialStates])

  return <>{children}</>
}

/**
 * Custom render function with store wrapper
 */
export function renderWithStores<T>(
  ui: React.ReactElement,
  options: RenderOptions & {
    stores?: Record<string, UseBoundStore<StoreApi<T>>>
    initialStates?: Record<string, Partial<T>>
  } = {}
) {
  const { stores, initialStates, ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <StoreTestWrapper stores={stores} initialStates={initialStates}>
        {children}
      </StoreTestWrapper>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Utility to test store actions
 */
export function testStoreAction<T>(
  store: UseBoundStore<StoreApi<T>>,
  action: () => void | Promise<void>,
  expectedStateChange: (state: T) => boolean
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const unsubscribe = store.subscribe((state) => {
      if (expectedStateChange(state)) {
        unsubscribe()
        resolve(state)
      }
    })

    try {
      await act(async () => {
        await action()
      })
    } catch (error) {
      unsubscribe()
      reject(error)
    }

    // Check if state already changed
    const currentState = store.getState()
    if (expectedStateChange(currentState)) {
      unsubscribe()
      resolve(currentState)
    }
  })
}

/**
 * Utility to create store snapshot for testing
 */
export function createStoreSnapshot<T>(store: UseBoundStore<StoreApi<T>>): T {
  return JSON.parse(JSON.stringify(store.getState()))
}

/**
 * Compare two store states
 */
export function compareStoreStates<T>(state1: T, state2: T): boolean {
  return JSON.stringify(state1) === JSON.stringify(state2)
}

/**
 * Store performance testing utility
 */
export function measureStorePerformance<T>(
  store: UseBoundStore<StoreApi<T>>,
  action: () => void,
  iterations = 1000
): { averageTime: number; totalTime: number } {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    action()
    const end = performance.now()
    times.push(end - start)
  }
  
  const totalTime = times.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / iterations
  
  return { averageTime, totalTime }
}