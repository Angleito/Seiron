/**
 * Animation Performance Utilities
 * Pure functional helpers for optimizing animations with fp-ts patterns
 */

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as R from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'

// Types for better type safety
export interface PerformanceError {
  type: 'ANIMATION_ERROR' | 'DOM_ERROR' | 'PERFORMANCE_ERROR'
  message: string
  originalError?: unknown
}

export interface DOMContext {
  window: Window
  document: Document
}

export interface AnimationContext {
  animationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (id: number) => void
  performance: Performance
}

export interface ElementBounds {
  top: number
  left: number
  bottom: number
  right: number
  width: number
  height: number
}

// Pure function constructors
const createPerformanceError = (
  type: PerformanceError['type'],
  message: string,
  originalError?: unknown
): PerformanceError => ({
  type,
  message,
  originalError
})

// Pure polyfill functions
const createIdleCallback = (window: Window | undefined) => 
  window?.requestIdleCallback || 
  function (cb: IdleRequestCallback) {
    const start = Date.now()
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline)
    }, 1)
  }

const createCancelIdleCallback = (window: Window | undefined) =>
  window?.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id)
  }

// Pure requestIdleCallback using Reader pattern
export const requestIdleCallback: R.Reader<DOMContext, (cb: IdleRequestCallback) => number> =
  ({ window }) => createIdleCallback(window)

export const cancelIdleCallback: R.Reader<DOMContext, (id: number) => void> =
  ({ window }) => createCancelIdleCallback(window)

// Pure debounce factory using Reader pattern
export const createDebouncedRAF = <T extends (...args: unknown[]) => void>(
  func: T,
  wait = 0
): R.Reader<AnimationContext, T & { cancel: () => void }> =>
  (animationContext) => {
    let rafId: number | null = null
    let timeoutId: NodeJS.Timeout | null = null
    
    const debounced = (...args: Parameters<T>) => {
      if (rafId !== null) {
        animationContext.cancelAnimationFrame(rafId)
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      
      if (wait > 0) {
        timeoutId = setTimeout(() => {
          rafId = animationContext.animationFrame(() => {
            func(...args)
            rafId = null
          })
        }, wait)
      } else {
        rafId = animationContext.animationFrame(() => {
          func(...args)
          rafId = null
        })
      }
    }
    
    debounced.cancel = () => {
      if (rafId !== null) {
        animationContext.cancelAnimationFrame(rafId)
        rafId = null
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
    
    return debounced as T & { cancel: () => void }
  }

// Convenience function for current environment
export const debounceRAF = <T extends (...args: unknown[]) => void>(
  func: T,
  wait = 0
): T & { cancel: () => void } => {
  if (typeof window === 'undefined') {
    return func as T & { cancel: () => void }
  }
  
  const animationContext: AnimationContext = {
    animationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    performance: window.performance
  }
  
  return createDebouncedRAF(func, wait)(animationContext)
}

// Pure throttle factory using Reader pattern
export const createThrottledRAF = <T extends (...args: unknown[]) => void>(
  func: T
): R.Reader<AnimationContext, T & { cancel: () => void }> =>
  (animationContext) => {
    let rafId: number | null = null
    let lastArgs: Parameters<T> | null = null
    
    const throttled = (...args: Parameters<T>) => {
      lastArgs = args
      
      if (rafId === null) {
        rafId = animationContext.animationFrame(() => {
          if (lastArgs) {
            func(...lastArgs)
          }
          rafId = null
          lastArgs = null
        })
      }
    }
    
    throttled.cancel = () => {
      if (rafId !== null) {
        animationContext.cancelAnimationFrame(rafId)
        rafId = null
      }
      lastArgs = null
    }
    
    return throttled as T & { cancel: () => void }
  }

// Convenience function for current environment
export const throttleRAF = <T extends (...args: unknown[]) => void>(
  func: T
): T & { cancel: () => void } => {
  if (typeof window === 'undefined') {
    return func as T & { cancel: () => void }
  }
  
  const animationContext: AnimationContext = {
    animationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    performance: window.performance
  }
  
  return createThrottledRAF(func)(animationContext)
}

// Pure element bounds extraction
const getElementBounds = (element: HTMLElement): ElementBounds => {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: rect.width,
    height: rect.height
  }
}

// Pure viewport dimensions extraction
const getViewportDimensions = (domContext: DOMContext) => ({
  width: domContext.window.innerWidth || domContext.document.documentElement.clientWidth,
  height: domContext.window.innerHeight || domContext.document.documentElement.clientHeight
})

// Pure viewport intersection check
const checkViewportIntersection = (bounds: ElementBounds, viewport: { width: number; height: number }, margin = 0): boolean =>
  bounds.top >= -margin &&
  bounds.left >= -margin &&
  bounds.bottom <= viewport.height + margin &&
  bounds.right <= viewport.width + margin

// Pure visibility check using Reader pattern
export const isElementInViewport = (element: HTMLElement, margin = 0): R.Reader<DOMContext, boolean> =>
  (domContext) => {
    const bounds = getElementBounds(element)
    const viewport = getViewportDimensions(domContext)
    return checkViewportIntersection(bounds, viewport, margin)
  }

// Convenience function for current environment
export const isInViewport = (element: HTMLElement, margin = 0): boolean => {
  if (typeof window === 'undefined') return false
  
  const domContext: DOMContext = { window, document }
  return isElementInViewport(element, margin)(domContext)
}

// Pure DOM batcher implementation
export interface DOMBatchState {
  reads: Array<() => void>
  writes: Array<() => void>
  rafId: number | null
}

const initialBatchState: DOMBatchState = {
  reads: [],
  writes: [],
  rafId: null
}

// Pure batch operations
const addRead = (fn: () => void) => (state: DOMBatchState): DOMBatchState => ({
  ...state,
  reads: [...state.reads, fn]
})

const addWrite = (fn: () => void) => (state: DOMBatchState): DOMBatchState => ({
  ...state,
  writes: [...state.writes, fn]
})

const setRafId = (rafId: number | null) => (state: DOMBatchState): DOMBatchState => ({
  ...state,
  rafId
})

const clearBatch = (state: DOMBatchState): DOMBatchState => ({
  ...state,
  reads: [],
  writes: [],
  rafId: null
})

// Pure batch execution
const executeBatch = (animationContext: AnimationContext) => (state: DOMBatchState): DOMBatchState => {
  const reads = state.reads.slice()
  const writes = state.writes.slice()
  
  // Execute all reads first
  reads.forEach(fn => fn())
  
  // Then execute all writes
  writes.forEach(fn => fn())
  
  return clearBatch(state)
}

// Functional DOM batcher
export const createDOMBatcher = (animationContext: AnimationContext) => {
  let state = initialBatchState
  
  const schedule = () => {
    if (state.rafId === null) {
      const rafId = animationContext.animationFrame(() => {
        state = executeBatch(animationContext)(state)
      })
      state = setRafId(rafId)(state)
    }
  }
  
  return {
    read: (fn: () => void) => {
      state = addRead(fn)(state)
      schedule()
    },
    
    write: (fn: () => void) => {
      state = addWrite(fn)(state)
      schedule()
    },
    
    clear: () => {
      if (state.rafId !== null) {
        animationContext.cancelAnimationFrame(state.rafId)
      }
      state = clearBatch(state)
    },
    
    getState: () => state
  }
}

// Legacy class-based API for compatibility
export class DOMBatcher {
  private batcher: ReturnType<typeof createDOMBatcher>
  
  constructor() {
    if (typeof window === 'undefined') {
      // Mock implementation for SSR
      this.batcher = {
        read: () => {},
        write: () => {},
        clear: () => {},
        getState: () => initialBatchState
      }
    } else {
      const animationContext: AnimationContext = {
        animationFrame: window.requestAnimationFrame.bind(window),
        cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
        performance: window.performance
      }
      this.batcher = createDOMBatcher(animationContext)
    }
  }
  
  read(fn: () => void) {
    this.batcher.read(fn)
  }
  
  write(fn: () => void) {
    this.batcher.write(fn)
  }
  
  clear() {
    this.batcher.clear()
  }
}

// Create a global batcher instance
export const domBatcher = new DOMBatcher()

// Pure visibility observer state
export interface VisibilityState {
  callbacks: Map<Element, (isVisible: boolean) => void>
  observer: IntersectionObserver | null
}

// Pure visibility observer creation
const createIntersectionObserver = (
  callbacks: Map<Element, (isVisible: boolean) => void>,
  options?: IntersectionObserverInit
): TE.TaskEither<PerformanceError, IntersectionObserver> =>
  TE.tryCatch(
    async () => {
      if (typeof window === 'undefined' || !window.IntersectionObserver) {
        throw new Error('IntersectionObserver not supported')
      }
      
      return new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const callback = callbacks.get(entry.target)
          if (callback) {
            callback(entry.isIntersecting)
          }
        })
      }, options)
    },
    (error) => createPerformanceError('DOM_ERROR', 'Failed to create IntersectionObserver', error)
  )

// Functional visibility observer
export const createVisibilityObserver = (options?: IntersectionObserverInit) => {
  const callbacks = new Map<Element, (isVisible: boolean) => void>()
  let observer: IntersectionObserver | null = null
  
  const initialize = (): TE.TaskEither<PerformanceError, void> =>
    pipe(
      createIntersectionObserver(callbacks, options),
      TE.map(obs => {
        observer = obs
      })
    )
  
  return {
    initialize,
    
    observe: (element: Element, callback: (isVisible: boolean) => void): TE.TaskEither<PerformanceError, void> =>
      TE.tryCatch(
        async () => {
          if (!observer) {
            await initialize()()
          }
          callbacks.set(element, callback)
          observer!.observe(element)
        },
        (error) => createPerformanceError('DOM_ERROR', 'Failed to observe element', error)
      ),
    
    unobserve: (element: Element): TE.TaskEither<PerformanceError, void> =>
      TE.tryCatch(
        async () => {
          callbacks.delete(element)
          observer?.unobserve(element)
        },
        (error) => createPerformanceError('DOM_ERROR', 'Failed to unobserve element', error)
      ),
    
    disconnect: (): TE.TaskEither<PerformanceError, void> =>
      TE.tryCatch(
        async () => {
          callbacks.clear()
          observer?.disconnect()
          observer = null
        },
        (error) => createPerformanceError('DOM_ERROR', 'Failed to disconnect observer', error)
      )
  }
}

// Legacy class-based API for compatibility
export class VisibilityObserver {
  private functionalObserver: ReturnType<typeof createVisibilityObserver>
  
  constructor(options?: IntersectionObserverInit) {
    this.functionalObserver = createVisibilityObserver(options)
    // Initialize immediately
    this.functionalObserver.initialize()()
  }
  
  observe(element: Element, callback: (isVisible: boolean) => void) {
    this.functionalObserver.observe(element, callback)()
  }
  
  unobserve(element: Element) {
    this.functionalObserver.unobserve(element)()
  }
  
  disconnect() {
    this.functionalObserver.disconnect()()
  }
}

// Pure animation scheduler state
export interface SchedulerTask {
  fn: () => void
  priority: number
}

export interface SchedulerState {
  tasks: Map<string, SchedulerTask>
  rafId: number | null
  lastTime: number
  targetFPS: number
}

const initialSchedulerState: SchedulerState = {
  tasks: new Map(),
  rafId: null,
  lastTime: 0,
  targetFPS: 60
}

// Pure scheduler operations
const addTask = (id: string, task: SchedulerTask) => (state: SchedulerState): SchedulerState => ({
  ...state,
  tasks: new Map(state.tasks).set(id, task)
})

const removeTask = (id: string) => (state: SchedulerState): SchedulerState => {
  const newTasks = new Map(state.tasks)
  newTasks.delete(id)
  return { ...state, tasks: newTasks }
}

const setRafIdScheduler = (rafId: number | null) => (state: SchedulerState): SchedulerState => ({
  ...state,
  rafId
})

const updateLastTime = (lastTime: number) => (state: SchedulerState): SchedulerState => ({
  ...state,
  lastTime
})

// Pure task execution
const executeTasks = (state: SchedulerState, currentTime: number): boolean => {
  const deltaTime = currentTime - state.lastTime
  const targetFrameTime = 1000 / state.targetFPS
  
  if (deltaTime >= targetFrameTime) {
    // Sort tasks by priority (higher priority first)
    const sortedTasks = Array.from(state.tasks.values()).sort((a, b) => b.priority - a.priority)
    
    // Execute tasks
    const startTime = performance.now()
    for (const task of sortedTasks) {
      task.fn()
      
      // Break if we're taking too long
      if (performance.now() - startTime > targetFrameTime * 0.8) {
        break
      }
    }
    
    return true // Time updated
  }
  
  return false // Time not updated
}

// Functional animation scheduler
export const createAnimationScheduler = (animationContext: AnimationContext) => {
  let state = initialSchedulerState
  
  const tick = (time: number) => {
    const shouldUpdateTime = executeTasks(state, time)
    
    if (shouldUpdateTime) {
      state = updateLastTime(time)(state)
    }
    
    if (state.tasks.size > 0) {
      const rafId = animationContext.animationFrame(tick)
      state = setRafIdScheduler(rafId)(state)
    } else {
      state = setRafIdScheduler(null)(state)
    }
  }
  
  const start = () => {
    if (state.rafId === null) {
      state = updateLastTime(animationContext.performance.now())(state)
      const rafId = animationContext.animationFrame(tick)
      state = setRafIdScheduler(rafId)(state)
    }
  }
  
  const stop = () => {
    if (state.rafId !== null) {
      animationContext.cancelAnimationFrame(state.rafId)
      state = setRafIdScheduler(null)(state)
    }
  }
  
  return {
    schedule: (id: string, fn: () => void, priority = 0) => {
      state = addTask(id, { fn, priority })(state)
      start()
    },
    
    unschedule: (id: string) => {
      state = removeTask(id)(state)
      if (state.tasks.size === 0) {
        stop()
      }
    },
    
    clear: () => {
      state = { ...state, tasks: new Map() }
      stop()
    },
    
    getState: () => state
  }
}

// Legacy class-based API for compatibility
export class AnimationScheduler {
  private functionalScheduler: ReturnType<typeof createAnimationScheduler>
  
  constructor() {
    if (typeof window === 'undefined') {
      // Mock implementation for SSR
      this.functionalScheduler = {
        schedule: () => {},
        unschedule: () => {},
        clear: () => {},
        getState: () => initialSchedulerState
      }
    } else {
      const animationContext: AnimationContext = {
        animationFrame: window.requestAnimationFrame.bind(window),
        cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
        performance: window.performance
      }
      this.functionalScheduler = createAnimationScheduler(animationContext)
    }
  }
  
  schedule(id: string, fn: () => void, priority = 0) {
    this.functionalScheduler.schedule(id, fn, priority)
  }
  
  unschedule(id: string) {
    this.functionalScheduler.unschedule(id)
  }
  
  clear() {
    this.functionalScheduler.clear()
  }
}

// Create a global scheduler instance
export const animationScheduler = new AnimationScheduler()

// Detect passive event support
let passiveSupported = false
try {
  const options = {
    get passive() {
      passiveSupported = true
      return false
    }
  }
  if (typeof window !== 'undefined') {
    const testHandler = () => {}
    window.addEventListener('test', testHandler, options as AddEventListenerOptions)
    window.removeEventListener('test', testHandler, options as AddEventListenerOptions)
  }
} catch (e) {}

export const passiveEventOptions = passiveSupported ? { passive: true } : false

// Performance-safe event listener
export function addPerformantListener<K extends keyof WindowEventMap>(
  element: Window | Document | HTMLElement,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): () => void {
  const finalOptions = type === 'scroll' || type === 'touchmove' 
    ? { ...((typeof options === 'object' ? options : {}) || {}), ...(passiveEventOptions as AddEventListenerOptions) }
    : options
  
  element.addEventListener(type as string, listener as EventListener, finalOptions)
  
  return () => {
    element.removeEventListener(type as string, listener as EventListener, finalOptions)
  }
}

// Memory-efficient object pool
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }
  
  release(obj: T) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }
  
  clear() {
    this.pool = []
  }
  
  get size() {
    return this.pool.length
  }
}

// Check if device is low-end
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  
  // Check WebGL support
  if (!gl) return true
  
  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency || 4
  if (cores <= 2) return true
  
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory
  if (memory && memory < 4) return true
  
  // Check connection speed (if available)
  const connection = (navigator as any).connection
  if (connection && connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
    return true
  }
  
  return false
}

// Measure render performance
export function measureRenderPerformance(callback: () => void): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const start = performance.now()
      callback()
      requestAnimationFrame(() => {
        const end = performance.now()
        resolve(end - start)
      })
    })
  })
}