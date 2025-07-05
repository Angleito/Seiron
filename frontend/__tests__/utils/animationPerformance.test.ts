import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as fc from 'fast-check'
import {
  createDebouncedRAF,
  createThrottledRAF,
  isElementInViewport,
  createDOMBatcher,
  createAnimationScheduler,
  createVisibilityObserver,
  DOMContext,
  AnimationContext,
  ElementBounds
} from '../../utils/animationPerformance'

// Mock DOM environment for testing
const createMockDOMContext = (): DOMContext => ({
  window: {
    innerWidth: 1024,
    innerHeight: 768,
    requestIdleCallback: jest.fn(),
    cancelIdleCallback: jest.fn()
  } as any,
  document: {
    documentElement: {
      clientWidth: 1024,
      clientHeight: 768
    }
  } as any
})

const createMockAnimationContext = (): AnimationContext => {
  let rafId = 0
  const rafCallbacks = new Map<number, FrameRequestCallback>()
  
  return {
    animationFrame: jest.fn((callback: FrameRequestCallback) => {
      const id = ++rafId
      rafCallbacks.set(id, callback)
      // Simulate async execution
      setTimeout(() => {
        if (rafCallbacks.has(id)) {
          callback(performance.now())
          rafCallbacks.delete(id)
        }
      }, 16)
      return id
    }),
    cancelAnimationFrame: jest.fn((id: number) => {
      rafCallbacks.delete(id)
    }),
    performance: {
      now: jest.fn(() => Date.now())
    } as any
  }
}

const createMockElement = (bounds: Partial<ElementBounds>): HTMLElement => ({
  getBoundingClientRect: () => ({
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    width: 100,
    height: 100,
    ...bounds
  })
} as any)

describe('Debounced RAF - Pure Functions', () => {
  let mockAnimationContext: AnimationContext
  let mockFunction: jest.Mock

  beforeEach(() => {
    mockAnimationContext = createMockAnimationContext()
    mockFunction = jest.fn()
  })

  test('debounced function is created without side effects', () => {
    const debouncedFn = createDebouncedRAF(mockFunction, 100)(mockAnimationContext)
    
    expect(typeof debouncedFn).toBe('function')
    expect(typeof debouncedFn.cancel).toBe('function')
    expect(mockFunction).not.toHaveBeenCalled()
    expect(mockAnimationContext.animationFrame).not.toHaveBeenCalled()
  })

  test('debounced function calls original function after delay', async () => {
    const debouncedFn = createDebouncedRAF(mockFunction, 0)(mockAnimationContext)
    
    debouncedFn('test', 123)
    
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
    
    // Wait for RAF to execute
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(mockFunction).toHaveBeenCalledWith('test', 123)
  })

  test('multiple rapid calls only execute once', async () => {
    const debouncedFn = createDebouncedRAF(mockFunction, 0)(mockAnimationContext)
    
    debouncedFn('call1')
    debouncedFn('call2')
    debouncedFn('call3')
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(mockFunction).toHaveBeenCalledTimes(1)
    expect(mockFunction).toHaveBeenCalledWith('call3')
  })

  test('cancel prevents execution', async () => {
    const debouncedFn = createDebouncedRAF(mockFunction, 0)(mockAnimationContext)
    
    debouncedFn('test')
    debouncedFn.cancel()
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(mockFunction).not.toHaveBeenCalled()
  })
})

describe('Throttled RAF - Pure Functions', () => {
  let mockAnimationContext: AnimationContext
  let mockFunction: jest.Mock

  beforeEach(() => {
    mockAnimationContext = createMockAnimationContext()
    mockFunction = jest.fn()
  })

  test('throttled function is created without side effects', () => {
    const throttledFn = createThrottledRAF(mockFunction)(mockAnimationContext)
    
    expect(typeof throttledFn).toBe('function')
    expect(typeof throttledFn.cancel).toBe('function')
    expect(mockFunction).not.toHaveBeenCalled()
    expect(mockAnimationContext.animationFrame).not.toHaveBeenCalled()
  })

  test('throttled function executes on next animation frame', async () => {
    const throttledFn = createThrottledRAF(mockFunction)(mockAnimationContext)
    
    throttledFn('test', 123)
    
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(mockFunction).toHaveBeenCalledWith('test', 123)
  })

  test('multiple calls within same frame use latest arguments', async () => {
    const throttledFn = createThrottledRAF(mockFunction)(mockAnimationContext)
    
    throttledFn('call1')
    throttledFn('call2')
    throttledFn('call3')
    
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(mockFunction).toHaveBeenCalledTimes(1)
    expect(mockFunction).toHaveBeenCalledWith('call3')
  })
})

describe('Element Viewport Detection - Pure Functions', () => {
  test('element in viewport returns true', () => {
    const domContext = createMockDOMContext()
    const element = createMockElement({
      top: 100,
      left: 100,
      bottom: 200,
      right: 200
    })
    
    const isVisible = isElementInViewport(element, 0)(domContext)
    expect(isVisible).toBe(true)
  })

  test('element outside viewport returns false', () => {
    const domContext = createMockDOMContext()
    const element = createMockElement({
      top: 1000,
      left: 1000,
      bottom: 1100,
      right: 1100
    })
    
    const isVisible = isElementInViewport(element, 0)(domContext)
    expect(isVisible).toBe(false)
  })

  test('margin expands viewport detection area', () => {
    const domContext = createMockDOMContext()
    const element = createMockElement({
      top: -50,
      left: -50,
      bottom: 0,
      right: 0
    })
    
    const isVisibleNoMargin = isElementInViewport(element, 0)(domContext)
    const isVisibleWithMargin = isElementInViewport(element, 100)(domContext)
    
    expect(isVisibleNoMargin).toBe(false)
    expect(isVisibleWithMargin).toBe(true)
  })

  test('viewport detection is pure function', () => {
    const domContext = createMockDOMContext()
    const element = createMockElement({
      top: 100,
      left: 100,
      bottom: 200,
      right: 200
    })
    
    const result1 = isElementInViewport(element, 0)(domContext)
    const result2 = isElementInViewport(element, 0)(domContext)
    
    expect(result1).toBe(result2)
    expect(result1).toBe(true)
  })
})

describe('DOM Batcher - Pure State Management', () => {
  let mockAnimationContext: AnimationContext

  beforeEach(() => {
    mockAnimationContext = createMockAnimationContext()
  })

  test('batcher is created without side effects', () => {
    const batcher = createDOMBatcher(mockAnimationContext)
    
    expect(typeof batcher.read).toBe('function')
    expect(typeof batcher.write).toBe('function')
    expect(typeof batcher.clear).toBe('function')
    expect(typeof batcher.getState).toBe('function')
    
    const state = batcher.getState()
    expect(state.reads).toEqual([])
    expect(state.writes).toEqual([])
    expect(state.rafId).toBe(null)
  })

  test('read operations are batched', () => {
    const batcher = createDOMBatcher(mockAnimationContext)
    const readFn1 = jest.fn()
    const readFn2 = jest.fn()
    
    batcher.read(readFn1)
    batcher.read(readFn2)
    
    const state = batcher.getState()
    expect(state.reads).toHaveLength(2)
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
  })

  test('write operations are batched', () => {
    const batcher = createDOMBatcher(mockAnimationContext)
    const writeFn1 = jest.fn()
    const writeFn2 = jest.fn()
    
    batcher.write(writeFn1)
    batcher.write(writeFn2)
    
    const state = batcher.getState()
    expect(state.writes).toHaveLength(2)
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
  })

  test('clear resets state', () => {
    const batcher = createDOMBatcher(mockAnimationContext)
    
    batcher.read(jest.fn())
    batcher.write(jest.fn())
    
    let state = batcher.getState()
    expect(state.reads).toHaveLength(1)
    expect(state.writes).toHaveLength(1)
    
    batcher.clear()
    
    state = batcher.getState()
    expect(state.reads).toEqual([])
    expect(state.writes).toEqual([])
    expect(state.rafId).toBe(null)
  })
})

describe('Animation Scheduler - Pure State Management', () => {
  let mockAnimationContext: AnimationContext

  beforeEach(() => {
    mockAnimationContext = createMockAnimationContext()
  })

  test('scheduler is created without side effects', () => {
    const scheduler = createAnimationScheduler(mockAnimationContext)
    
    expect(typeof scheduler.schedule).toBe('function')
    expect(typeof scheduler.unschedule).toBe('function')
    expect(typeof scheduler.clear).toBe('function')
    expect(typeof scheduler.getState).toBe('function')
    
    const state = scheduler.getState()
    expect(state.tasks.size).toBe(0)
    expect(state.rafId).toBe(null)
  })

  test('tasks are scheduled correctly', () => {
    const scheduler = createAnimationScheduler(mockAnimationContext)
    const taskFn = jest.fn()
    
    scheduler.schedule('task1', taskFn, 1)
    
    const state = scheduler.getState()
    expect(state.tasks.size).toBe(1)
    expect(state.tasks.has('task1')).toBe(true)
    expect(mockAnimationContext.animationFrame).toHaveBeenCalledTimes(1)
  })

  test('tasks can be unscheduled', () => {
    const scheduler = createAnimationScheduler(mockAnimationContext)
    const taskFn = jest.fn()
    
    scheduler.schedule('task1', taskFn, 1)
    scheduler.unschedule('task1')
    
    const state = scheduler.getState()
    expect(state.tasks.size).toBe(0)
  })

  test('higher priority tasks are processed first', async () => {
    const scheduler = createAnimationScheduler(mockAnimationContext)
    const executionOrder: string[] = []
    
    scheduler.schedule('low', () => executionOrder.push('low'), 1)
    scheduler.schedule('high', () => executionOrder.push('high'), 10)
    scheduler.schedule('medium', () => executionOrder.push('medium'), 5)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Tasks should be ordered by priority, but may execute multiple times
    expect(executionOrder.length).toBeGreaterThan(0)
    // Check that high priority task executed first
    expect(executionOrder[0]).toBe('high')
  })

  test('clear removes all tasks', () => {
    const scheduler = createAnimationScheduler(mockAnimationContext)
    
    scheduler.schedule('task1', jest.fn(), 1)
    scheduler.schedule('task2', jest.fn(), 2)
    
    let state = scheduler.getState()
    expect(state.tasks.size).toBe(2)
    
    scheduler.clear()
    
    state = scheduler.getState()
    expect(state.tasks.size).toBe(0)
    expect(state.rafId).toBe(null)
  })
})

describe('Visibility Observer - TaskEither Integration', () => {
  let mockIntersectionObserver: jest.Mock
  let mockObserverInstance: any

  beforeEach(() => {
    mockObserverInstance = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }
    
    mockIntersectionObserver = jest.fn(() => mockObserverInstance)
    
    // Mock IntersectionObserver in global scope
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: mockIntersectionObserver
    })
  })

  afterEach(() => {
    delete (window as any).IntersectionObserver
  })

  test('observer is created with proper error handling', async () => {
    const observer = createVisibilityObserver()
    const result = await observer.initialize()()
    
    expect(result._tag).toBe('Right')
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1)
  })

  test('observe method works with TaskEither', async () => {
    const observer = createVisibilityObserver()
    await observer.initialize()()
    
    const element = document.createElement('div')
    const callback = jest.fn()
    
    const result = await observer.observe(element, callback)()
    
    expect(result._tag).toBe('Right')
    expect(mockObserverInstance.observe).toHaveBeenCalledWith(element)
  })

  test('unobserve method works with TaskEither', async () => {
    const observer = createVisibilityObserver()
    await observer.initialize()()
    
    const element = document.createElement('div')
    const callback = jest.fn()
    
    await observer.observe(element, callback)()
    const result = await observer.unobserve(element)()
    
    expect(result._tag).toBe('Right')
    expect(mockObserverInstance.unobserve).toHaveBeenCalledWith(element)
  })

  test('disconnect method works with TaskEither', async () => {
    const observer = createVisibilityObserver()
    await observer.initialize()()
    
    const result = await observer.disconnect()()
    
    expect(result._tag).toBe('Right')
    expect(mockObserverInstance.disconnect).toHaveBeenCalledTimes(1)
  })

  test('handles missing IntersectionObserver gracefully', async () => {
    delete (window as any).IntersectionObserver
    
    const observer = createVisibilityObserver()
    const result = await observer.initialize()()
    
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left.type).toBe('DOM_ERROR')
      expect(result.left.message).toContain('IntersectionObserver')
    }
  })
})

// Property-based tests for pure functions
describe('Property-Based Tests - Animation Performance', () => {
  test('viewport detection with random bounds', () => {
    const domContextArb = fc.record({
      window: fc.record({
        innerWidth: fc.integer({ min: 100, max: 2000 }),
        innerHeight: fc.integer({ min: 100, max: 2000 })
      }),
      document: fc.record({
        documentElement: fc.record({
          clientWidth: fc.integer({ min: 100, max: 2000 }),
          clientHeight: fc.integer({ min: 100, max: 2000 })
        })
      })
    })
    
    const boundsArb = fc.record({
      top: fc.integer({ min: -1000, max: 1000 }),
      left: fc.integer({ min: -1000, max: 1000 }),
      bottom: fc.integer({ min: -1000, max: 2000 }),
      right: fc.integer({ min: -1000, max: 2000 })
    })
    
    fc.assert(fc.property(domContextArb, boundsArb, fc.integer({ min: 0, max: 100 }), 
      (domContext, bounds, margin) => {
        const element = createMockElement(bounds)
        const result = isElementInViewport(element, margin)(domContext as any)
        expect(typeof result).toBe('boolean')
      }
    ))
  })

  test('animation context operations are stable', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1000 }), (delay) => {
      const animationContext = createMockAnimationContext()
      const testFn = jest.fn()
      
      const debouncedFn = createDebouncedRAF(testFn, delay)(animationContext)
      const throttledFn = createThrottledRAF(testFn)(animationContext)
      
      expect(typeof debouncedFn).toBe('function')
      expect(typeof throttledFn).toBe('function')
      expect(typeof debouncedFn.cancel).toBe('function')
      expect(typeof throttledFn.cancel).toBe('function')
    }))
  })

  test('batcher state transitions are pure', () => {
    fc.assert(fc.property(
      fc.array(fc.func(fc.anything()), { maxLength: 10 }),
      fc.array(fc.func(fc.anything()), { maxLength: 10 }),
      (readFns, writeFns) => {
        const animationContext = createMockAnimationContext()
        const batcher = createDOMBatcher(animationContext)
        
        const initialState = batcher.getState()
        
        readFns.forEach(fn => batcher.read(fn))
        writeFns.forEach(fn => batcher.write(fn))
        
        const afterState = batcher.getState()
        
        expect(afterState.reads.length).toBe(readFns.length)
        expect(afterState.writes.length).toBe(writeFns.length)
        
        batcher.clear()
        
        const clearedState = batcher.getState()
        expect(clearedState.reads).toEqual(initialState.reads)
        expect(clearedState.writes).toEqual(initialState.writes)
      }
    ))
  })
})