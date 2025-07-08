'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { usePerformanceMonitor, PerformanceOverlay } from '@/hooks/usePerformanceMonitor'

// Direct import dragon component for debugging - no lazy loading
import DragonHead3D from './DragonHead3DOptimized'

interface DragonLoaderProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  loadingTimeout?: number // Timeout in milliseconds (default: 10000)
  onLoadError?: (error: Error) => void
  forceQuality?: 'low' | 'medium' | 'high' | 'auto'
  showPerformanceOverlay?: boolean
}

// Loading states
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'timeout'

// Ultra-lightweight placeholder with loading states
function DragonPlaceholder({ 
  className, 
  state = 'loading',
  error 
}: { 
  className?: string
  state?: LoadingState
  error?: Error
}) {
  const getMessage = () => {
    switch (state) {
      case 'loading':
        return 'Awakening Dragon...'
      case 'timeout':
        return 'Taking longer than expected...'
      case 'error':
        return 'Failed to summon dragon'
      default:
        return ''
    }
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Animated gradient background */}
          <div className={`absolute inset-0 w-64 h-64 rounded-full animate-pulse
            ${state === 'error' ? 'bg-gradient-radial from-red-600/40 via-red-500/20 to-transparent' : 
              state === 'timeout' ? 'bg-gradient-radial from-yellow-600/30 via-yellow-500/20 to-transparent' :
              'bg-gradient-radial from-red-900/30 via-red-800/20 to-transparent'}`} 
          />
          
          {/* Loading spinner or error icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {state === 'error' ? (
              <div className="text-red-500/60 text-4xl">⚠️</div>
            ) : (
              <div className={`w-16 h-16 border-4 rounded-full animate-spin
                ${state === 'timeout' ? 'border-yellow-600/20 border-t-yellow-500/60' : 
                  'border-red-900/20 border-t-red-600/60'}`} 
              />
            )}
          </div>
          
          {/* Loading text */}
          <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium
            ${state === 'error' ? 'text-red-500/60' : 
              state === 'timeout' ? 'text-yellow-500/60' : 
              'text-red-400/60'}`}>
            {getMessage()}
          </div>
          
          {/* Error details */}
          {state === 'error' && error && (
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-xs text-red-400/40 whitespace-nowrap">
              {error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Error boundary for dragon loading failures
class DragonErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error) {
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  override render() {
    if (this.state.hasError) {
      return <DragonPlaceholder state="error" error={this.state.error} />
    }

    return this.props.children
  }
}

export function DragonLoader({
  loadingTimeout = 10000,
  onLoadError,
  showPerformanceOverlay = false,
  ...props
}: DragonLoaderProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    componentName: 'DragonLoader',
    enabled: true,
    onPerformanceWarning: (metrics) => {
      console.warn('DragonLoader performance warning:', metrics)
    }
  })
  
  // Use intersection observer to load dragon only when visible
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '100px' // Start loading slightly before element is visible
  })

  // Handle successful load
  const handleLoad = useCallback(() => {
    console.log('🐉 DragonLoader: handleLoad called - 3D model successfully loaded!')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setLoadingState('loaded')
    
    // End loading timer and log performance
    const loadTime = performanceMonitor.endTimer('dragon-loading')
    performanceMonitor.logMetrics()
    
    console.log(`🐉 Dragon loaded successfully in ${loadTime.toFixed(0)}ms`)
  }, [performanceMonitor])

  // Handle load error
  const handleError = useCallback((error: Error) => {
    console.error('🐉 DragonLoader: ERROR occurred during loading:', error)
    console.error('🐉 DragonLoader: Error stack:', error.stack)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setError(error)
    setLoadingState('error')
    if (onLoadError) {
      onLoadError(error)
    }
  }, [onLoadError])

  // Preload dragon model resources
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // Preload during idle time
      const idleCallbackId = window.requestIdleCallback(() => {
        // Add preload hints for 3D assets
        const preloadLink = document.createElement('link')
        preloadLink.rel = 'preload'
        preloadLink.as = 'fetch'
        preloadLink.href = '/models/dragon_head.obj' // Correct path to OBJ file
        preloadLink.crossOrigin = 'anonymous'
        document.head.appendChild(preloadLink)

        // Preload textures if any
        const texturePreload = document.createElement('link')
        texturePreload.rel = 'preload'
        texturePreload.as = 'image'
        texturePreload.href = '/textures/dragon-texture.jpg' // Adjust path as needed
        document.head.appendChild(texturePreload)
      })

      return () => {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId)
        }
      }
    }
    // Return undefined for browsers without requestIdleCallback
    return undefined
  }, [])

  // Delay loading to prioritize critical content
  useEffect(() => {
    if (inView && !shouldLoad && loadingState === 'idle') {
      console.log('🐉 DragonLoader: Starting loading sequence...')
      // Small delay to let critical content render first
      const timer = setTimeout(() => {
        console.log('🐉 DragonLoader: Setting shouldLoad=true, state=loading')
        setShouldLoad(true)
        setLoadingState('loading')
        // Start loading timer
        performanceMonitor.startTimer('dragon-loading')
      }, 100)
      return () => clearTimeout(timer)
    }
    // Return undefined when condition is not met
    return undefined
  }, [inView, shouldLoad, loadingState, performanceMonitor])

  // Set up loading timeout
  useEffect(() => {
    if (loadingState === 'loading') {
      timeoutRef.current = setTimeout(() => {
        setLoadingState('timeout')
        // Continue trying to load even after timeout
      }, loadingTimeout)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }
    // Return undefined when not loading
    return undefined
  }, [loadingState, loadingTimeout])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div ref={ref} className="absolute inset-0">
        {/* Show placeholder while loading or in error/timeout state */}
        {(loadingState !== 'loaded') && (
          <DragonPlaceholder 
            className={props.className} 
            state={loadingState}
            error={error || undefined}
          />
        )}
        
        {/* Load dragon component when ready - direct loading for debugging */}
        {shouldLoad && (
          <DragonErrorBoundary onError={handleError}>
            <div 
              className={`absolute inset-0 transition-opacity duration-1000 ${
                loadingState === 'loaded' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <DragonHead3D 
                {...props}
                onLoad={handleLoad}
              />
            </div>
          </DragonErrorBoundary>
        )}
      </div>
      
      {/* Performance overlay */}
      <PerformanceOverlay
        metrics={performanceMonitor.metrics}
        isVisible={showPerformanceOverlay && process.env.NODE_ENV === 'development'}
        position="top-right"
      />
    </>
  )
}

export default DragonLoader