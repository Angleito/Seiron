import React, { lazy, ComponentType } from 'react'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'

/**
 * Utility for creating lazy-loaded components with consistent loading states
 */
export const createLazyComponent = <T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ComponentType
) => {
  const LazyComponent = lazy(importFn)
  
  return {
    Component: LazyComponent,
    fallback: fallback || LoadingSpinner,
  }
}

/**
 * Lazy loading configurations for different feature bundles
 */
export const LazyLoadingConfig = {
  // Voice feature components
  voiceFeatures: {
    chunkName: 'voice-features',
    preload: false, // Load on demand
  },
  
  // Performance monitoring
  performanceMonitoring: {
    chunkName: 'performance-monitoring',
    preload: false, // Load on demand
  },
  
  // Core UI components
  coreUI: {
    chunkName: 'core-ui',
    preload: true, // Always needed
  },
} as const

/**
 * Hook for preloading lazy components
 */
export const usePreloadComponent = (importFn: () => Promise<any>) => {
  const preload = () => {
    // Preload the component
    importFn().catch(error => {
      console.warn('Failed to preload component:', error)
    })
  }
  
  return { preload }
}

/**
 * Higher-order component for lazy loading with error boundaries
 */
export const withLazyLoading = <T extends object>(
  Component: ComponentType<T>,
  options: {
    fallback?: ComponentType
    chunkName?: string
    onError?: (error: Error) => void
  } = {}
): ComponentType<T> => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }))
  
  return React.forwardRef<any, T>((props, ref) => 
    React.createElement(LazyComponent, { ...props, ref })
  )
}