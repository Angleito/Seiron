/**
 * Animation Performance Utilities
 * Provides helper functions for optimizing animations
 */

// Request idle callback polyfill
export const requestIdleCallback = 
  (typeof window !== 'undefined' && window.requestIdleCallback) ||
  function (cb: IdleRequestCallback) {
    const start = Date.now()
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline)
    }, 1)
  }

export const cancelIdleCallback =
  (typeof window !== 'undefined' && window.cancelIdleCallback) ||
  function (id: number) {
    clearTimeout(id)
  }

// Debounce function optimized for animations
export function debounceRAF<T extends (...args: any[]) => void>(
  func: T,
  wait = 0
): T & { cancel: () => void } {
  let rafId: number | null = null
  let timeoutId: NodeJS.Timeout | null = null
  
  const debounced = (...args: Parameters<T>) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    
    if (wait > 0) {
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          func(...args)
          rafId = null
        })
      }, wait)
    } else {
      rafId = requestAnimationFrame(() => {
        func(...args)
        rafId = null
      })
    }
  }
  
  debounced.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  return debounced as T & { cancel: () => void }
}

// Throttle function using RAF
export function throttleRAF<T extends (...args: any[]) => void>(
  func: T
): T & { cancel: () => void } {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null
  
  const throttled = (...args: Parameters<T>) => {
    lastArgs = args
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
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
      cancelAnimationFrame(rafId)
      rafId = null
    }
    lastArgs = null
  }
  
  return throttled as T & { cancel: () => void }
}

// Check if element is in viewport
export function isInViewport(element: HTMLElement, margin = 0): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= -margin &&
    rect.left >= -margin &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + margin &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + margin
  )
}

// Batch DOM reads and writes
export class DOMBatcher {
  private reads: Array<() => void> = []
  private writes: Array<() => void> = []
  private rafId: number | null = null
  
  read(fn: () => void) {
    this.reads.push(fn)
    this.schedule()
  }
  
  write(fn: () => void) {
    this.writes.push(fn)
    this.schedule()
  }
  
  private schedule() {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flush()
      })
    }
  }
  
  private flush() {
    const reads = this.reads.slice()
    const writes = this.writes.slice()
    
    this.reads = []
    this.writes = []
    this.rafId = null
    
    // Execute all reads first
    reads.forEach(fn => fn())
    
    // Then execute all writes
    writes.forEach(fn => fn())
  }
  
  clear() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.reads = []
    this.writes = []
  }
}

// Create a global batcher instance
export const domBatcher = new DOMBatcher()

// Optimized element visibility observer
export class VisibilityObserver {
  private observer: IntersectionObserver
  private callbacks = new Map<Element, (isVisible: boolean) => void>()
  
  constructor(options?: IntersectionObserverInit) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const callback = this.callbacks.get(entry.target)
        if (callback) {
          callback(entry.isIntersecting)
        }
      })
    }, options)
  }
  
  observe(element: Element, callback: (isVisible: boolean) => void) {
    this.callbacks.set(element, callback)
    this.observer.observe(element)
  }
  
  unobserve(element: Element) {
    this.callbacks.delete(element)
    this.observer.unobserve(element)
  }
  
  disconnect() {
    this.callbacks.clear()
    this.observer.disconnect()
  }
}

// Animation frame scheduler
export class AnimationScheduler {
  private tasks = new Map<string, { fn: () => void; priority: number }>()
  private rafId: number | null = null
  private lastTime = 0
  private targetFPS = 60
  
  schedule(id: string, fn: () => void, priority = 0) {
    this.tasks.set(id, { fn, priority })
    this.start()
  }
  
  unschedule(id: string) {
    this.tasks.delete(id)
    if (this.tasks.size === 0) {
      this.stop()
    }
  }
  
  private start() {
    if (this.rafId === null) {
      this.lastTime = performance.now()
      this.rafId = requestAnimationFrame(this.tick)
    }
  }
  
  private stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
  
  private tick = (time: number) => {
    const deltaTime = time - this.lastTime
    const targetFrameTime = 1000 / this.targetFPS
    
    if (deltaTime >= targetFrameTime) {
      // Sort tasks by priority (higher priority first)
      const sortedTasks = Array.from(this.tasks.values()).sort((a, b) => b.priority - a.priority)
      
      // Execute tasks
      const startTime = performance.now()
      for (const task of sortedTasks) {
        task.fn()
        
        // Break if we're taking too long
        if (performance.now() - startTime > targetFrameTime * 0.8) {
          break
        }
      }
      
      this.lastTime = time
    }
    
    if (this.tasks.size > 0) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.rafId = null
    }
  }
  
  clear() {
    this.tasks.clear()
    this.stop()
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
  window.addEventListener('test' as any, null as any, options)
  window.removeEventListener('test', null as any, options)
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