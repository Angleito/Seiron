import { lazy } from 'react'

/**
 * Lazy-loaded dragon animation components
 * These components are loaded on demand to reduce initial bundle size
 */

// Main dragon character component
export const LazyEnhancedDragonCharacter = lazy(() => 
  import('./EnhancedDragonCharacter').then(module => ({
    default: module.EnhancedDragonCharacter || module.default
  }))
)

// Interactive dragon component  
export const LazyInteractiveDragon = lazy(() =>
  import('./InteractiveDragon').then(module => ({
    default: module.InteractiveDragon || module.default
  }))
)

// Dragon showcase component
export const LazyDragonShowcase = lazy(() =>
  import('./DragonShowcase').then(module => ({
    default: module.DragonShowcase || module.default
  }))
)

// Dragon interaction controller
export const LazyDragonInteractionController = lazy(() =>
  import('./DragonInteractionController').then(module => ({
    default: module.DragonInteractionController || module.default
  }))
)

// Enhanced dragon interaction system
export const LazyEnhancedDragonInteractionSystem = lazy(() =>
  import('./EnhancedDragonInteractionSystem').then(module => ({
    default: module.EnhancedDragonInteractionSystem || module.default
  }))
)

/**
 * Preloader for dragon components
 */
export const preloadDragonComponents = () => {
  // Preload critical dragon components
  import('./EnhancedDragonCharacter')
  import('./InteractiveDragon')
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
  }
}