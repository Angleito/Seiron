'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SeironGLBDragonWithErrorBoundary } from './SeironGLBDragon'
import { DragonPerformanceMonitor } from './DragonPerformanceMonitor'
import { DragonMemoryManager } from '../../utils/dragonMemoryManager'
import { WebGLErrorBoundary, DragonWebGLErrorBoundary } from '../error-boundaries/WebGLErrorBoundary'
import { DragonFallbackRendererWithErrorBoundary } from './DragonFallbackRenderer'
import { webglFallbackManager, isHeadlessEnvironment } from '../../utils/webglFallback'
import { errorRecoveryUtils } from '../../utils/errorRecovery'
import { logger } from '@lib/logger'

export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume: number
  emotion?: 'excited' | 'angry' | 'calm' | 'focused'
}

export interface DragonRendererProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  voiceState?: VoiceAnimationState
  enableAnimations?: boolean
  className?: string
  dragonType?: 'glb' | '2d' | 'ascii' | 'fallback' | 'auto'
  enableFallback?: boolean
  fallbackType?: '2d' | 'ascii' | 'fallback'
  enableProgressiveLoading?: boolean
  modelPath?: string
  lowQualityModel?: string
  highQualityModel?: string
  enablePerformanceMonitor?: boolean
  performanceMonitorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onError?: (error: Error, type: string) => void
  onFallback?: (fromType: string, toType: string) => void
  onProgressiveLoadComplete?: () => void
  enableErrorRecovery?: boolean
  maxErrorRetries?: number
  enableWebGLFallback?: boolean
  preferredFallbackMode?: 'webgl2' | 'webgl' | 'software' | 'canvas2d' | 'mock' | 'auto'
  width?: number
  height?: number
}

// ASCII Dragon Component
const ASCIIDragon: React.FC<{
  size?: string
  voiceState?: VoiceAnimationState
  className?: string
}> = ({ voiceState, className = '' }) => {
  const dragonArt = voiceState?.isSpeaking ? `
    🔥🔥🔥🔥🔥🔥🔥
    🐉 ROAAAAR! 🐉
    🔥🔥🔥🔥🔥🔥🔥
  ` : voiceState?.isListening ? `
    👂 Listening... 👂
         🐉
    ~~~~~~~~~~~~~~~~
  ` : `
       🐉
    ~~~~~~~~
  `

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <pre className="text-yellow-400 font-mono text-center animate-pulse">
        {dragonArt}
      </pre>
    </div>
  )
}

// 2D Dragon Component
const Dragon2D: React.FC<{
  size?: string
  voiceState?: VoiceAnimationState
  className?: string
}> = ({ voiceState, className = '' }) => {
  const scale = voiceState?.isSpeaking ? 'scale-110' : 'scale-100'
  const color = voiceState?.isListening ? 'text-blue-400' : 'text-yellow-400'
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`transition-all duration-300 ${scale} ${color}`}>
        <div className="text-8xl animate-bounce">🐲</div>
        {voiceState?.isSpeaking && (
          <div className="text-center text-sm mt-2 animate-pulse">Speaking...</div>
        )}
        {voiceState?.isListening && (
          <div className="text-center text-sm mt-2 animate-pulse">Listening...</div>
        )}
      </div>
    </div>
  )
}

// Dragon renderer with fallback system and progressive loading
export const DragonRenderer: React.FC<DragonRendererProps> = ({
  size = 'md',
  voiceState,
  enableAnimations = true,
  className = '',
  dragonType = 'auto',
  enableFallback = true,
  fallbackType = 'fallback',
  enableProgressiveLoading = false,
  modelPath,
  lowQualityModel = '/models/seiron.glb',
  highQualityModel = '/models/seiron.glb', // Using the primary working model
  enablePerformanceMonitor = false,
  performanceMonitorPosition = 'top-left',
  onError,
  onFallback,
  onProgressiveLoadComplete,
  enableErrorRecovery = true,
  maxErrorRetries = 3,
  enableWebGLFallback = true,
  preferredFallbackMode = 'auto',
  width = 400,
  height = 300
}) => {
  const [currentType, setCurrentType] = useState(dragonType)
  const [hasError, setHasError] = useState(false)
  const [isLoadingHighQuality, setIsLoadingHighQuality] = useState(false)
  const [useHighQuality, setUseHighQuality] = useState(!enableProgressiveLoading)
  const [modelAvailability, setModelAvailability] = useState<Record<string, boolean>>({})
  const [isRecovering, setIsRecovering] = useState(false)
  const [fallbackHistory, setFallbackHistory] = useState<Array<{ from: string; to: string; reason: string }>>([])
  const errorCountRef = useRef(0)
  const mountedRef = useRef(true)
  const lastErrorTimeRef = useRef(0)
  const memoryManager = useRef(DragonMemoryManager.getInstance())
  const fallbackSystem = useRef(errorRecoveryUtils.dragonFallback)
  const errorMonitor = useRef(errorRecoveryUtils.monitor)

  // Check model availability on mount
  useEffect(() => {
    mountedRef.current = true
    
    // Reset fallback system
    fallbackSystem.current.reset()
    
    // Auto-detect optimal dragon type based on environment and capabilities
    const determineOptimalType = () => {
      // Check if in headless/Docker environment
      if (isHeadlessEnvironment()) {
        logger.info('Headless environment detected, using fallback renderer')
        return 'fallback'
      }
      
      // Check WebGL capabilities if using auto mode
      if (dragonType === 'auto') {
        const capabilities = webglFallbackManager.detectCapabilities()
        
        if (capabilities.webgl2 || capabilities.webgl) {
          return 'glb'
        } else if (capabilities.canvas2d) {
          return 'fallback'
        } else {
          return 'ascii'
        }
      }
      
      // Check if we should use optimal dragon type based on capabilities
      if (enableErrorRecovery) {
        const optimalType = fallbackSystem.current.getOptimalDragonType()
        
        if (optimalType !== dragonType) {
          logger.info(`Using optimal dragon type: ${optimalType} instead of ${dragonType}`)
          return optimalType
        }
      }
      
      return dragonType
    }
    
    const optimalType = determineOptimalType()
    if (optimalType !== currentType) {
      setCurrentType(optimalType)
    }
    
    // Check availability of all models
    const checkModels = async () => {
      const modelsToCheck = [
        lowQualityModel, 
        highQualityModel, 
        '/models/seiron_animated_lod_high.gltf',
        '/models/seiron.glb'
      ]
      const availability: Record<string, boolean> = {}
      
      for (const model of modelsToCheck) {
        try {
          const response = await fetch(model, { method: 'HEAD' })
          availability[model] = response.ok
          
          // Additional check for file size to detect corrupted files
          if (response.ok) {
            const contentLength = response.headers.get('content-length')
            if (contentLength && parseInt(contentLength) < 1000) {
              availability[model] = false
              logger.warn(`Model ${model} appears to be corrupted (size: ${contentLength} bytes)`)
            }
          }
        } catch (error) {
          availability[model] = false
          logger.warn(`Model availability check failed for ${model}:`, error)
        }
      }
      
      if (mountedRef.current) {
        setModelAvailability(availability)
        logger.info('Model availability check:', availability)
      }
    }
    
    checkModels()
    
    return () => {
      mountedRef.current = false
      
      // Clean up memory when component unmounts
      if (memoryManager.current) {
        const activeModels = enableProgressiveLoading 
          ? [lowQualityModel, highQualityModel]
          : [highQualityModel]
        
        // Clean up unused models periodically
        memoryManager.current.cleanupUnusedModels(activeModels)
      }
    }
  }, [enableProgressiveLoading, lowQualityModel, highQualityModel, dragonType, enableErrorRecovery])

  // Progressive loading effect
  useEffect(() => {
    if (enableProgressiveLoading && currentType === 'glb' && !useHighQuality && !isLoadingHighQuality) {
      setIsLoadingHighQuality(true)
      
      // Simulate loading delay and then enable high quality
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setUseHighQuality(true)
          setIsLoadingHighQuality(false)
          if (onProgressiveLoadComplete) {
            onProgressiveLoadComplete()
          }
        }
      }, 1000) // Give 1 second for low quality to render first
      
      return () => clearTimeout(timer)
    }
    
    // Return cleanup function for other cases
    return () => {}
  }, [enableProgressiveLoading, currentType, useHighQuality, isLoadingHighQuality, onProgressiveLoadComplete])

  const handleError = useCallback(async (error: Error) => {
    if (!mountedRef.current) return
    
    // Debounce rapid errors
    const now = Date.now()
    if (now - lastErrorTimeRef.current < 1000) {
      logger.debug(`Dragon ${currentType} error debounced`)
      return
    }
    lastErrorTimeRef.current = now
    
    const errorMessage = errorRecoveryUtils.getErrorMessage(error)
    logger.error(`Dragon ${currentType} error:`, errorMessage)
    errorCountRef.current++
    
    // Record error for monitoring
    errorMonitor.current.recordError(error, `DragonRenderer:${currentType}`, false)
    
    if (onError) {
      onError(error, currentType)
    }
    
    // Check if this is a model-related error and should trigger immediate fallback
    if (errorRecoveryUtils.isModelError(error)) {
      logger.warn(`Model error detected for ${currentType}, triggering immediate fallback`)
      setHasError(true)
      // Skip recovery attempts for model errors
      return
    }

    // Try error recovery first if enabled
    if (enableErrorRecovery && errorCountRef.current <= maxErrorRetries) {
      if (errorRecoveryUtils.isRecoverable(error)) {
        setIsRecovering(true)
        
        try {
          // Attempt recovery based on error type
          if (currentType === 'glb') {
            // Try to force garbage collection
            errorRecoveryUtils.forceGC()
            
            // Wait a bit before retrying
            await errorRecoveryUtils.delay(1000)
            
            // Reset error state for retry
            if (mountedRef.current) {
              setHasError(false)
              setIsRecovering(false)
              errorMonitor.current.recordError(error, `DragonRenderer:${currentType}`, true)
              return
            }
          }
        } catch (recoveryError) {
          logger.error('Error recovery failed:', recoveryError)
        }
        
        setIsRecovering(false)
      }
    }
    
    setHasError(true)

    // Fallback logic with enhanced tracking
    if (enableFallback && errorCountRef.current <= maxErrorRetries) {
      let nextType: '2d' | 'ascii' | 'fallback' | null = null
      let fallbackReason = error.message
      
      if (currentType === 'glb') {
        nextType = fallbackType === 'fallback' ? 'fallback' : fallbackType || '2d'
        fallbackReason = 'WebGL/3D rendering failed'
      } else if (currentType === 'fallback') {
        nextType = 'ascii'
        fallbackReason = 'Fallback renderer failed'
      } else if (currentType === '2d') {
        nextType = 'ascii'
        fallbackReason = '2D rendering failed'
      }
      
      if (nextType) {
        logger.info(`Falling back from ${currentType} to ${nextType}`, { reason: fallbackReason })
        
        // Record fallback
        fallbackSystem.current.recordFallbackReason(currentType, nextType, fallbackReason)
        
        const newFallbackEntry = {
          from: currentType,
          to: nextType,
          reason: fallbackReason
        }
        
        setFallbackHistory(prev => [...prev, newFallbackEntry])
        
        if (onFallback) {
          onFallback(currentType, nextType)
        }
        
        // Delay to prevent rapid fallback loops
        setTimeout(() => {
          if (mountedRef.current) {
            setCurrentType(nextType as '2d' | 'ascii' | 'fallback')
            setHasError(false)
            errorCountRef.current = 0 // Reset error count for new type
          }
        }, 500)
      }
    }
  }, [currentType, enableFallback, fallbackType, onError, onFallback, enableErrorRecovery, maxErrorRetries])

  // Reset error state when type changes
  useEffect(() => {
    setHasError(false)
    setIsRecovering(false)
    errorCountRef.current = 0
  }, [currentType])
  
  // Listen for WebGL fallback events
  useEffect(() => {
    const handleWebGLFallback = () => {
      if (currentType === 'glb') {
        logger.info('WebGL fallback requested by error boundary')
        const nextType = fallbackType || '2d'
        
        fallbackSystem.current.recordFallbackReason(currentType, nextType, 'WebGL context lost')
        
        setFallbackHistory(prev => [...prev, {
          from: currentType,
          to: nextType,
          reason: 'WebGL context lost'
        }])
        
        if (onFallback) {
          onFallback(currentType, nextType)
        }
        
        setCurrentType(nextType)
      }
    }
    
    window.addEventListener('webgl-fallback-requested', handleWebGLFallback)
    
    return () => {
      window.removeEventListener('webgl-fallback-requested', handleWebGLFallback)
    }
  }, [currentType, fallbackType, onFallback])

  // Render based on current type
  const renderDragon = () => {
    if (isRecovering) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-yellow-400 text-center">
            <div className="animate-spin text-4xl mb-2">⚡</div>
            <div>Dragon is recovering...</div>
            <div className="text-sm text-gray-500 mt-1">Restoring power</div>
          </div>
        </div>
      )
    }
    
    if (hasError && !enableFallback) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <div>Dragon failed to load</div>
            {fallbackHistory.length > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                Fallback attempts: {fallbackHistory.length}
              </div>
            )}
          </div>
        </div>
      )
    }

    switch (currentType) {
      case 'ascii':
        return (
          <ASCIIDragon
            size={size}
            voiceState={voiceState}
            className="w-full h-full"
          />
        )
      
      case '2d':
        return (
          <Dragon2D
            size={size}
            voiceState={voiceState}
            className="w-full h-full"
          />
        )
      
      case 'fallback':
        return (
          <DragonFallbackRendererWithErrorBoundary
            voiceState={voiceState}
            className="w-full h-full"
            width={width}
            height={height}
            enableEyeTracking={enableAnimations}
            lightningActive={voiceState?.isSpeaking && voiceState?.volume > 0.7}
            enableAutoFallback={enableWebGLFallback}
            preferredMode={preferredFallbackMode}
            onError={(error) => handleError(error)}
            onFallback={(mode) => {
              logger.info(`WebGL fallback renderer switched to ${mode}`)
              if (onFallback) {
                onFallback('fallback', mode)
              }
            }}
          />
        )
      
      case 'glb':
      default:
        // LOD selection based on size and availability
        const getLODModel = () => {
          if (enableProgressiveLoading) {
            const targetModel = useHighQuality ? highQualityModel : lowQualityModel
            // Check if target model is available, fallback if not
            if (modelAvailability[targetModel] === false) {
              const fallback = targetModel === highQualityModel ? lowQualityModel : highQualityModel
              if (modelAvailability[fallback] !== false) {
                logger.info(`Using fallback model ${fallback} due to unavailable ${targetModel}`)
                return fallback
              }
            }
            return targetModel
          }
          
          // LOD based on size with availability checking and safe fallbacks
          // Prioritize models that are confirmed to work in production
          const safeModels = [
            '/models/seiron.glb' // Primary working model - use this for everything
          ]
          
          switch (size) {
            case 'sm':
            case 'md':
              // For all sizes, use the primary working model
              return '/models/seiron.glb'
            case 'lg':
              // Use the primary working model
              return '/models/seiron.glb'
            case 'xl':
            case 'gigantic':
            default:
              // Use the primary working model
              return '/models/seiron.glb'
          }
        }
        
        const modelPath = getLODModel()
        
        return (
          <DragonWebGLErrorBoundary>
            <SeironGLBDragonWithErrorBoundary
              voiceState={voiceState}
              size={size}
              enableAnimations={enableAnimations}
              className="w-full h-full"
              modelPath={modelPath}
              isProgressiveLoading={enableProgressiveLoading}
              isLoadingHighQuality={isLoadingHighQuality}
              onError={handleError}
            />
          </DragonWebGLErrorBoundary>
        )
    }
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div key={currentType}>
        {renderDragon()}
      </div>
      
      {/* Performance Monitor */}
      <DragonPerformanceMonitor
        enabled={enablePerformanceMonitor}
        position={performanceMonitorPosition}
      />
      
      {/* Error Recovery Status */}
      {process.env.NODE_ENV === 'development' && fallbackHistory.length > 0 && (
        <div className="absolute bottom-0 left-0 p-2 bg-black/50 text-xs text-white rounded-tr">
          <div className="font-semibold mb-1">Dragon Fallback History:</div>
          {fallbackHistory.map((entry, index) => (
            <div key={index} className="text-gray-300">
              {entry.from} → {entry.to}: {entry.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Enhanced DragonRenderer with error recovery
export const EnhancedDragonRenderer = (props: DragonRendererProps) => (
  <DragonWebGLErrorBoundary>
    <DragonRenderer {...props} />
  </DragonWebGLErrorBoundary>
)

export default DragonRenderer