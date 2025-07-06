'use client'

import React, { 
  Suspense, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  lazy
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '../ErrorBoundary'
import { logger } from '../../lib/logger'
import SimpleDragonSprite from '../SimpleDragonSprite'
import ASCIIDragon from './ASCIIDragon'

// Lazy load 3D component to reduce bundle size
const Dragon3D = lazy(() => import('./Dragon3D'))

// Dragon type enumeration
export type DragonType = '2d' | '3d' | 'ascii'

// Voice animation states that all dragons can interpret
export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume?: number // 0-1 scale for voice intensity
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}

// Unified dragon props interface
export interface DragonRendererProps {
  // Dragon type selection
  dragonType: DragonType
  
  // Common props that work across all dragon types
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
  
  // Voice integration
  voiceState?: VoiceAnimationState
  
  // Performance and fallback options
  enableFallback?: boolean
  fallbackType?: DragonType
  performanceMode?: 'auto' | 'high' | 'low'
  
  // Type-specific props (passed through to respective components)
  // 2D Sprite props
  spriteProps?: {
    // SimpleDragonSprite already has all needed props in common interface
  }
  
  // ASCII Dragon props
  asciiProps?: {
    enableTypewriter?: boolean
    enableBreathing?: boolean
    enableFloating?: boolean
    pose?: 'coiled' | 'flying' | 'attacking' | 'sleeping'
    speed?: 'slow' | 'normal' | 'fast'
  }
  
  // 3D Dragon props
  threeDProps?: {
    enableInteraction?: boolean
    animationSpeed?: number
    showParticles?: boolean
    autoRotate?: boolean
    quality?: 'low' | 'medium' | 'high'
  }
  
  // Error handling
  onError?: (error: Error, dragonType: DragonType) => void
  onFallback?: (fromType: DragonType, toType: DragonType) => void
  
  // Performance monitoring
  onPerformanceMetrics?: (metrics: DragonPerformanceMetrics) => void
}

// Performance metrics interface
export interface DragonPerformanceMetrics {
  renderTime: number
  initTime: number
  dragonType: DragonType
  fallbackUsed: boolean
  errorCount: number
}

// Loading states for different dragon types
interface DragonLoadingState {
  is2dLoaded: boolean
  is3dLoaded: boolean
  isAsciiLoaded: boolean
  is3dSupported: boolean
  currentlyLoading: DragonType | null
}

// Animation transition configurations
const transitionConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  duration: 0.5
}

// Voice state to dragon pose mapping
const voiceStateToPose = (voiceState: VoiceAnimationState) => {
  if (voiceState.isSpeaking) return 'attacking'
  if (voiceState.isListening) return 'flying'
  if (voiceState.isProcessing) return 'coiled'
  if (voiceState.emotion === 'sleeping') return 'sleeping'
  return 'coiled'
}

// Voice state to animation speed mapping
const voiceStateToSpeed = (voiceState: VoiceAnimationState) => {
  if (voiceState.isSpeaking) return 'fast'
  if (voiceState.isListening) return 'normal'
  if (voiceState.isProcessing) return 'normal'
  return 'slow'
}

// Voice state to 3D animation props mapping
const voiceStateTo3DProps = (voiceState: VoiceAnimationState) => ({
  animationSpeed: voiceState.isSpeaking ? 2 : voiceState.isListening ? 1.5 : 1,
  showParticles: voiceState.isSpeaking || voiceState.isListening,
  autoRotate: voiceState.isProcessing
})

// 3D Support Detection
const detect3DSupport = (): boolean => {
  if (typeof window === 'undefined') return false
  
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch (e) {
    return false
  }
}

// Performance monitoring hook
const usePerformanceMonitor = (dragonType: DragonType) => {
  const startTime = useRef<number>(Date.now())
  const initTime = useRef<number>(0)
  const errorCount = useRef<number>(0)
  const fallbackUsed = useRef<boolean>(false)
  
  const recordInit = useCallback(() => {
    initTime.current = Date.now() - startTime.current
  }, [])
  
  const recordError = useCallback(() => {
    errorCount.current += 1
  }, [])
  
  const recordFallback = useCallback(() => {
    fallbackUsed.current = true
  }, [])
  
  const getMetrics = useCallback((): DragonPerformanceMetrics => ({
    renderTime: Date.now() - startTime.current,
    initTime: initTime.current,
    dragonType,
    fallbackUsed: fallbackUsed.current,
    errorCount: errorCount.current
  }), [dragonType])
  
  return {
    recordInit,
    recordError,
    recordFallback,
    getMetrics
  }
}

// Error boundary for 3D dragon with fallback
const Dragon3DErrorBoundary: React.FC<{
  children: React.ReactNode
  onError: (error: Error) => void
  fallbackComponent: React.ReactNode
}> = ({ children, onError, fallbackComponent }) => {
  return (
    <ErrorBoundary
      name="Dragon3D"
      onError={(error) => {
        logger.error('Dragon3D failed to render', { error: error.message })
        onError(error)
      }}
      fallback={fallbackComponent}
    >
      {children}
    </ErrorBoundary>
  )
}

// Loading spinner component
const DragonLoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  }
  
  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center`}>
      <motion.div
        className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// Main DragonRenderer component
const DragonRenderer: React.FC<DragonRendererProps> = ({
  dragonType,
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  voiceState,
  enableFallback = true,
  fallbackType = '2d',
  performanceMode = 'auto',
  spriteProps = {},
  asciiProps = {},
  threeDProps = {},
  onError,
  onFallback,
  onPerformanceMetrics
}) => {
  // State management
  const [loadingState, setLoadingState] = useState<DragonLoadingState>({
    is2dLoaded: true, // 2D is always immediately available
    is3dLoaded: false,
    isAsciiLoaded: true, // ASCII is always immediately available
    is3dSupported: detect3DSupport(),
    currentlyLoading: null
  })
  
  const [activeDragonType, setActiveDragonType] = useState<DragonType>(dragonType)
  const [hasEncounteredError, setHasEncounteredError] = useState<boolean>(false)
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor(activeDragonType)
  
  // Memoize voice-based props
  const voiceBasedProps = useMemo(() => {
    if (!voiceState) return {}
    
    return {
      ascii: {
        pose: voiceStateToPose(voiceState),
        speed: voiceStateToSpeed(voiceState),
        enableBreathing: voiceState.isIdle || voiceState.isListening
      },
      threeD: voiceStateTo3DProps(voiceState)
    }
  }, [voiceState])
  
  // Handle dragon type changes with transition
  useEffect(() => {
    if (dragonType !== activeDragonType) {
      setLoadingState(prev => ({ ...prev, currentlyLoading: dragonType }))
      
      const timer = setTimeout(() => {
        setActiveDragonType(dragonType)
        setLoadingState(prev => ({ ...prev, currentlyLoading: null }))
        performanceMonitor.recordInit()
      }, 150) // Short delay for smooth transition
      
      return () => clearTimeout(timer)
    }
    // No cleanup needed when types are the same
    return undefined
  }, [dragonType, activeDragonType]) // Remove performanceMonitor from dependencies
  
  // Error handling with fallback
  const handleDragonError = useCallback((error: Error, errorDragonType: DragonType) => {
    logger.error(`Dragon ${errorDragonType} encountered error`, { error: error.message })
    
    performanceMonitor.recordError()
    onError?.(error, errorDragonType)
    
    // Trigger fallback if enabled and different from current type
    if (enableFallback && fallbackType !== errorDragonType) {
      logger.info(`Falling back from ${errorDragonType} to ${fallbackType}`)
      
      performanceMonitor.recordFallback()
      onFallback?.(errorDragonType, fallbackType)
      
      setActiveDragonType(fallbackType)
      setHasEncounteredError(true)
    }
  }, [enableFallback, fallbackType, onError, onFallback]) // Remove performanceMonitor dependency
  
  // 3D loading handler
  const handle3DLoaded = useCallback(() => {
    setLoadingState(prev => ({ ...prev, is3dLoaded: true }))
    performanceMonitor.recordInit()
  }, []) // Remove performanceMonitor dependency since it's stable
  
  // Performance metrics reporting
  useEffect(() => {
    if (onPerformanceMetrics) {
      const metricsTimer = setInterval(() => {
        onPerformanceMetrics(performanceMonitor.getMetrics())
      }, 5000) // Report every 5 seconds
      
      return () => clearInterval(metricsTimer)
    }
    // No cleanup needed when callback is not provided
    return undefined
  }, [onPerformanceMetrics]) // Remove performanceMonitor from dependencies
  
  // Render the appropriate dragon component
  const renderDragon = () => {
    // Show loading spinner during transitions
    if (loadingState.currentlyLoading) {
      return <DragonLoadingSpinner size={size} />
    }
    
    switch (activeDragonType) {
      case '2d':
        return (
          <SimpleDragonSprite
            size={size}
            className={className}
            onClick={onClick}
            enableHover={enableHover}
            {...spriteProps}
          />
        )
      
      case 'ascii':
        return (
          <ASCIIDragon
            size={size}
            className={className}
            onClick={onClick}
            enableHover={enableHover}
            {...asciiProps}
            pose={voiceBasedProps.ascii.pose as 'coiled' | 'flying' | 'attacking' | 'sleeping'}
            speed={voiceBasedProps.ascii.speed as 'slow' | 'normal' | 'fast'}
            enableBreathing={voiceBasedProps.ascii.enableBreathing}
          />
        )
      
      case '3d':
        // Check 3D support before rendering
        if (!loadingState.is3dSupported) {
          logger.warn('3D rendering not supported, falling back to 2D')
          handleDragonError(new Error('3D rendering not supported'), '3d')
          return null
        }
        
        const fallbackComponent = (
          <SimpleDragonSprite
            size={size}
            className={className}
            onClick={onClick}
            enableHover={enableHover}
            {...spriteProps}
          />
        )
        
        return (
          <Dragon3DErrorBoundary
            onError={(error) => handleDragonError(error, '3d')}
            fallbackComponent={fallbackComponent}
          >
            <Suspense fallback={<DragonLoadingSpinner size={size} />}>
              <Dragon3D
                size={size}
                className={className}
                onClick={onClick}
                enableHover={enableHover}
                quality={performanceMode === 'low' ? 'low' : performanceMode === 'high' ? 'high' : 'medium'}
                {...threeDProps}
                {...voiceBasedProps.threeD}
              />
            </Suspense>
          </Dragon3DErrorBoundary>
        )
      
      default:
        logger.error('Unknown dragon type', { dragonType: activeDragonType })
        return (
          <SimpleDragonSprite
            size={size}
            className={className}
            onClick={onClick}
            enableHover={enableHover}
            {...spriteProps}
          />
        )
    }
  }
  
  return (
    <div className={`dragon-renderer ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`dragon-${activeDragonType}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={transitionConfig}
          className="dragon-container"
        >
          {renderDragon()}
        </motion.div>
      </AnimatePresence>
      
      {/* Debug information in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dragon-debug-info mt-2 text-xs text-gray-500">
          Type: {activeDragonType} | 3D Support: {loadingState.is3dSupported ? 'Yes' : 'No'} | 
          Error: {hasEncounteredError ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  )
}

// Export utility functions for external use
export const dragonUtils = {
  detect3DSupport,
  voiceStateToPose,
  voiceStateToSpeed,
  voiceStateTo3DProps
}

// Export hooks for advanced usage
export const useDragonRenderer = (props: DragonRendererProps) => {
  const performanceMonitor = usePerformanceMonitor(props.dragonType)
  
  return {
    ...performanceMonitor,
    is3DSupported: detect3DSupport()
  }
}

export default React.memo(DragonRenderer)