import { lazy, Suspense } from 'react'

/**
 * Lazy-loaded performance monitoring hooks
 * These hooks are loaded on demand to reduce initial bundle size
 */

// Dynamic import for animation performance hook
export const useAnimationPerformanceLazy = () => {
  return import('./useAnimationPerformance').then(module => module.useAnimationPerformance)
}

// Dynamic import for general performance monitor hook
export const usePerformanceMonitorLazy = () => {
  return import('./usePerformanceMonitor').then(module => module.usePerformanceMonitor)
}

// Orbital performance hook removed - dragon animations no longer needed

/**
 * Performance hook factory
 */
export const createLazyPerformanceHook = <T extends (...args: any[]) => any>(
  importFn: () => Promise<T>
) => {
  let cachedHook: T | null = null
  
  const useLazyHook = (...args: Parameters<T>) => {
    if (!cachedHook) {
      throw importFn().then(hook => {
        cachedHook = hook
        return hook(...args)
      })
    }
    
    return cachedHook(...args)
  }
  
  return useLazyHook
}

/**
 * Performance monitoring manager
 */
export class LazyPerformanceManager {
  private static instance: LazyPerformanceManager
  private loadedHooks: Set<string> = new Set()
  private loadingHooks: Set<string> = new Set()
  private performanceData: Map<string, any> = new Map()
  
  static getInstance(): LazyPerformanceManager {
    if (!LazyPerformanceManager.instance) {
      LazyPerformanceManager.instance = new LazyPerformanceManager()
    }
    return LazyPerformanceManager.instance
  }
  
  async loadPerformanceHook(hookName: string): Promise<any> {
    if (this.loadedHooks.has(hookName)) {
      return Promise.resolve()
    }
    
    if (this.loadingHooks.has(hookName)) {
      // Wait for the hook to load
      return new Promise(resolve => {
        const checkLoaded = () => {
          if (this.loadedHooks.has(hookName)) {
            resolve(undefined)
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }
    
    this.loadingHooks.add(hookName)
    
    try {
      switch (hookName) {
        case 'useAnimationPerformance':
          await useAnimationPerformanceLazy()
          break
        case 'usePerformanceMonitor':
          await usePerformanceMonitorLazy()
          break
        // useOrbitalPerformance removed - no longer needed
        default:
          throw new Error(`Unknown performance hook: ${hookName}`)
      }
      
      this.loadedHooks.add(hookName)
      this.loadingHooks.delete(hookName)
    } catch (error) {
      this.loadingHooks.delete(hookName)
      throw error
    }
  }
  
  isLoaded(hookName: string): boolean {
    return this.loadedHooks.has(hookName)
  }
  
  isLoading(hookName: string): boolean {
    return this.loadingHooks.has(hookName)
  }
  
  getLoadingProgress(): { loaded: number; total: number; progress: number } {
    const total = 2 // useAnimationPerformance, usePerformanceMonitor
    const loaded = this.loadedHooks.size
    return {
      loaded,
      total,
      progress: Math.round((loaded / total) * 100)
    }
  }
  
  storePerformanceData(hookName: string, data: any): void {
    this.performanceData.set(hookName, data)
  }
  
  getPerformanceData(hookName: string): any {
    return this.performanceData.get(hookName)
  }
  
  getAllPerformanceData(): Map<string, any> {
    return new Map(this.performanceData)
  }
  
  clearPerformanceData(): void {
    this.performanceData.clear()
  }
}

/**
 * Preloader for performance monitoring hooks
 */
export const preloadPerformanceHooks = async () => {
  const manager = LazyPerformanceManager.getInstance()
  
  try {
    // Preload all performance hooks
    await Promise.all([
      manager.loadPerformanceHook('useAnimationPerformance'),
      manager.loadPerformanceHook('usePerformanceMonitor')
    ])
    
    // Mark as loaded
    if (typeof window !== 'undefined') {
      window.__PERFORMANCE_HOOKS_LOADED__ = true
    }
  } catch (error) {
    console.warn('Failed to preload performance hooks:', error)
  }
}

/**
 * Check if performance hooks are available
 */
export const arePerformanceHooksLoaded = () => {
  return typeof window !== 'undefined' && 
         window.__PERFORMANCE_HOOKS_LOADED__ === true
}

/**
 * Performance monitoring configuration
 */
export const PerformanceConfig = {
  // Animation performance settings
  animation: {
    enabled: true,
    sampleRate: 60, // FPS
    bufferSize: 1000,
    thresholds: {
      warning: 50, // FPS
      critical: 30, // FPS
    }
  },
  
  // General performance settings
  general: {
    enabled: true,
    metricsInterval: 1000, // ms
    historySize: 100,
  },
  
  // Orbital performance settings removed - no longer needed
} as const

/**
 * Utility to get performance monitoring status
 */
export const getPerformanceStatus = () => {
  const manager = LazyPerformanceManager.getInstance()
  const progress = manager.getLoadingProgress()
  
  return {
    ...progress,
    isFullyLoaded: progress.loaded === progress.total,
    config: PerformanceConfig,
    data: manager.getAllPerformanceData()
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __PERFORMANCE_HOOKS_LOADED__?: boolean
  }
}