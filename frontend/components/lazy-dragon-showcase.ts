import { lazy } from 'react'

/**
 * Lazy-loaded dragon showcase components
 * These are the main showcase components that should be loaded on demand
 */

// Main dragon animation showcase
export const LazyDragonAnimationShowcase = lazy(() =>
  import('./DragonAnimationShowcase').then(module => ({
    default: module.DragonAnimationShowcase || module.default
  }))
)

// Enhanced dragon animation
export const LazyEnhancedDragonAnimation = lazy(() =>
  import('./EnhancedDragonAnimation').then(module => ({
    default: module.EnhancedDragonAnimation || module.default
  }))
)

// Dragon animation demo
export const LazyDragonAnimationDemo = lazy(() =>
  import('./DragonAnimationDemo').then(module => ({
    default: module.DragonAnimationDemo || module.default
  }))
)

// Dragon ball orbital components
export const LazyDragonBallOrbitalSystem = lazy(() =>
  import('./DragonBallOrbitalSystem').then(module => ({
    default: module.DragonBallOrbitalSystem || module.default
  }))
)

export const LazyOptimizedDragonBallOrbital = lazy(() =>
  import('./OptimizedDragonBallOrbital').then(module => ({
    default: module.OptimizedDragonBallOrbital || module.default
  }))
)

// Circling dragon balls
export const LazyCirclingDragonBalls = lazy(() =>
  import('./CirclingDragonBalls').then(module => ({
    default: module.CirclingDragonBalls || module.default
  }))
)

export const LazyOptimizedCirclingDragonBalls = lazy(() =>
  import('./OptimizedCirclingDragonBalls').then(module => ({
    default: module.OptimizedCirclingDragonBalls || module.default
  }))
)

// Performance debugger
export const LazyAnimationPerformanceDebugger = lazy(() =>
  import('./AnimationPerformanceDebugger').then(module => ({
    default: module.AnimationPerformanceDebugger || module.default
  }))
)

/**
 * Preloader for dragon showcase components
 */
export const preloadDragonShowcase = () => {
  // Preload the main showcase components
  import('./DragonAnimationShowcase')
  import('./EnhancedDragonAnimation')
}

/**
 * Utility to get dragon showcase loading progress
 */
export const getDragonShowcaseProgress = () => {
  const components = [
    'DragonAnimationShowcase',
    'EnhancedDragonAnimation', 
    'DragonAnimationDemo',
    'DragonBallOrbitalSystem',
    'CirclingDragonBalls'
  ]
  
  const loaded = components.filter(comp => 
    typeof window !== 'undefined' && 
    (window as any).__DRAGON_SHOWCASE_LOADED__?.[comp]
  ).length
  
  return {
    loaded,
    total: components.length,
    progress: Math.round((loaded / components.length) * 100)
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __DRAGON_SHOWCASE_LOADED__?: Record<string, boolean>
  }
}