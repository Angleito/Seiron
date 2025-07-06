import { lazy } from 'react'

/**
 * Lazy-loaded dragon components
 * These components are loaded on demand to reduce initial bundle size
 */

// Core dragon components
export const LazyDragon3D = lazy(() =>
  import('./Dragon3D').then(module => ({
    default: module.default
  }))
)

export const LazyASCIIDragon = lazy(() =>
  import('./ASCIIDragon').then(module => ({
    default: module.default
  }))
)

export const LazyDragonRenderer = lazy(() =>
  import('./DragonRenderer').then(module => ({
    default: module.default
  }))
)

// Dragon example components  
export const LazyDragon3DExample = lazy(() =>
  import('./Dragon3DExample').then(module => ({
    default: module.default
  }))
)

export const LazyASCIIDragonExample = lazy(() =>
  import('./ASCIIDragonExample').then(module => ({
    default: module.default
  }))
)

export const LazyDragonRendererExample = lazy(() =>
  import('./DragonRendererExample').then(module => ({
    default: module.default
  }))
)

// Dragon integration guide
export const LazyDragon3DIntegrationGuide = lazy(() =>
  import('./Dragon3DIntegrationGuide').then(module => ({
    default: module.default
  }))
)

/**
 * Dragon capabilities checker
 */
export const checkDragonCapabilities = () => {
  if (typeof window === 'undefined') return {
    hasWebGL: false,
    hasCanvas: false,
    hasRequestAnimationFrame: false,
    isSupported: false
  }
  
  const canvas = document.createElement('canvas')
  const hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  const hasCanvas = !!canvas.getContext('2d')
  const hasRequestAnimationFrame = 'requestAnimationFrame' in window
  
  return {
    hasWebGL,
    hasCanvas,
    hasRequestAnimationFrame,
    isSupported: hasCanvas && hasRequestAnimationFrame
  }
}

/**
 * Preloader for dragon components
 */
export const preloadDragonComponents = () => {
  const capabilities = checkDragonCapabilities()
  
  if (capabilities.isSupported) {
    // Preload renderer first (most commonly used)
    import('./DragonRenderer')
    
    if (capabilities.hasWebGL) {
      // Preload 3D components if WebGL is supported
      import('./Dragon3D')
    }
    
    // Always preload ASCII (fallback option)
    import('./ASCIIDragon')
  }
}

/**
 * Dragon loading progress tracker
 */
export const getDragonLoadingProgress = () => {
  const components = [
    'DragonRenderer',
    'Dragon3D', 
    'ASCIIDragon'
  ]
  
  const loaded = components.filter(comp => 
    typeof window !== 'undefined' && 
    (window as any).__DRAGON_LOADED__?.[comp]
  ).length
  
  return {
    loaded,
    total: components.length,
    progress: Math.round((loaded / components.length) * 100)
  }
}

/**
 * Utility to check if dragon components are loaded
 */
export const isDragonComponentsLoaded = () => {
  return typeof window !== 'undefined' && 
         (window as any).__DRAGON_COMPONENTS_LOADED__ === true
}

/**
 * Mark dragon components as loaded
 */
export const markDragonComponentsLoaded = () => {
  if (typeof window !== 'undefined') {
    (window as any).__DRAGON_COMPONENTS_LOADED__ = true
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __DRAGON_COMPONENTS_LOADED__?: boolean
    __DRAGON_LOADED__?: Record<string, boolean>
  }
}