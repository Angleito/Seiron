// Enhanced Error Boundary System
// Comprehensive error handling with GLTF loading, WebGL recovery, and performance monitoring

// Import React for components
import React from 'react'

// Core Error Boundaries
export { default as ReactError310Handler } from './ReactError310Handler'
export { default as CompositeErrorBoundary, withCompositeErrorBoundary } from './CompositeErrorBoundary'
export { default as SuspenseErrorBoundary, withSuspenseErrorBoundary } from './SuspenseErrorBoundary'
export { default as PerformanceErrorBoundary } from './PerformanceErrorBoundary'

// Import withCompositeErrorBoundary for local use
import { withCompositeErrorBoundary } from './CompositeErrorBoundary'

// Legacy and Alias Error Boundaries (for backward compatibility)
export { default as PageErrorBoundary } from './CompositeErrorBoundary'
export { default as VoiceErrorBoundary } from './CompositeErrorBoundary'
export { default as ChatErrorBoundary } from './CompositeErrorBoundary'
export { default as WebGLErrorBoundary } from './CompositeErrorBoundary'
export { default as SpeechRecognitionErrorBoundary } from './CompositeErrorBoundary'
export { default as TTSErrorBoundary } from './CompositeErrorBoundary'
export { default as ErrorBoundary } from './CompositeErrorBoundary'
export { default as RootErrorBoundary } from './CompositeErrorBoundary'

// Export the missing components referenced in errors
export { default as DragonWebGLErrorBoundary } from './CompositeErrorBoundary'
export { default as DragonWalletErrorBoundary } from './CompositeErrorBoundary'

// GLTF Error Boundary (removed - file doesn't exist)
// export { GLTFErrorBoundary, withGLTFErrorBoundary, DragonGLTFErrorBoundary } from '../dragon/GLTFErrorBoundary'


// Utility Types (need to be properly typed interfaces instead of trying to export from the component)
export interface ErrorSource {
  REACT_CORE: 'react_core'
  GLTF_LOADING: 'gltf_loading' 
  WEBGL_CONTEXT: 'webgl_context'
  SUSPENSE_BOUNDARY: 'suspense_boundary'
  PERFORMANCE_DEGRADATION: 'performance_degradation'
  MEMORY_EXHAUSTION: 'memory_exhaustion'
  NETWORK_FAILURE: 'network_failure'
  BROWSER_COMPATIBILITY: 'browser_compatibility'
  UNKNOWN: 'unknown'
}

export interface PerformanceContext {
  fps: number
  memoryUsage: number
  renderTime: number
  loadTime: number
  errorCount: number
  recoveryTime: number
  qualityLevel: string
  adaptiveQualityActive: boolean
}

export interface PerformanceThresholds {
  minFPS: number
  maxMemoryUsage: number
  maxRenderTime: number
  maxLoadTime: number
  maxErrorRate: number
}

export interface QualitySettings {
  resolution: number
  antialiasing: boolean
  shadows: boolean
  particles: boolean
  animations: boolean
  textures: 'low' | 'medium' | 'high'
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  renderTime: number
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

export interface PerformanceImpact {
  fpsImprovement: number
  memoryReduction: number
  renderTimeReduction: number
  qualityReduction: number
}

export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'minimal'

// Error Recovery Utilities
export { errorRecoveryUtils } from '../../utils/errorRecovery'

// Error handling utilities  
export const useErrorHandler = (onError?: (error: Error) => void) => {
  return React.useCallback((error: Error) => {
    console.error('Error caught by handler:', error)
    if (onError) onError(error)
  }, [onError])
}

// Monitoring dashboard placeholder
export const ErrorMonitoringDashboard = (props: {
  enabled?: boolean
  position?: string
  compact?: boolean
}) => React.createElement('div', null, props.enabled ? 'Error Monitoring Dashboard' : null)


// Create aliases and utility functions after imports
export const withErrorBoundary = withCompositeErrorBoundary
export const createMonitoredErrorBoundary = withCompositeErrorBoundary

// Convenience HOCs for common patterns
export function withAllErrorBoundaries<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enableGLTFRecovery?: boolean
    enableSuspenseRecovery?: boolean
    enablePerformanceMonitoring?: boolean
    enableWebGLRecovery?: boolean
    maxRetries?: number
    modelPath?: string
  }
) {
  const {
    enableGLTFRecovery = true,
    enableSuspenseRecovery = true,
    enablePerformanceMonitoring = true,
    enableWebGLRecovery = true,
    maxRetries = 3,
    modelPath
  } = options || {}
  
  return withCompositeErrorBoundary(Component, {
    enableGLTFRecovery,
    enableSuspenseRecovery,
    enablePerformanceMonitoring,
    enableWebGLRecovery,
    maxRetries,
    modelPath
  })
}

// Dragon-specific error boundary wrapper
export function withDragonErrorBoundaries<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    modelPath?: string
    maxRetries?: number
  }
) {
  const { modelPath, maxRetries = 2 } = options || {}
  
  return withCompositeErrorBoundary(Component, {
    enableGLTFRecovery: true,
    enableSuspenseRecovery: true,
    enablePerformanceMonitoring: true,
    enableWebGLRecovery: true,
    maxRetries,
    modelPath
  })
}

// Create a local alias for performance error boundary
const withPerformanceErrorBoundary = withCompositeErrorBoundary

// Performance-focused error boundary wrapper
export function withPerformanceErrorBoundaries<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enableAdaptiveQuality?: boolean
    performanceThresholds?: PerformanceThresholds
    maxRetries?: number
  }
) {
  const {
    enableAdaptiveQuality = true,
    performanceThresholds,
    maxRetries = 3
  } = options || {}
  
  return withPerformanceErrorBoundary(Component, {
    maxRetries,
    enablePerformanceMonitoring: true
  })
}


// WebGL-specific error boundary wrapper
export function withWebGLErrorBoundaries<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    webglContext?: HTMLCanvasElement
    maxRetries?: number
  }
) {
  const { webglContext, maxRetries = 2 } = options || {}
  
  return withCompositeErrorBoundary(Component, {
    enableWebGLRecovery: true,
    enablePerformanceMonitoring: true,
    maxRetries,
    webglContext
  })
}