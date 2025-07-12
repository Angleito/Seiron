'use client'

/**
 * Enhanced Dragon Renderer with Comprehensive Model Validation
 * 
 * This component provides a robust dragon rendering system with:
 * - Automatic model existence validation before loading
 * - Smart fallback chain execution with real-time error recovery
 * - Performance-based model selection
 * - Comprehensive error handling with graceful degradation
 * - Real-time monitoring and debugging capabilities
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { logger } from '@lib/logger'
import { ModelExistenceValidator, AVAILABLE_MODEL_PATHS } from '../../utils/modelExistenceValidator'
import { EnhancedModelLoader, type LoadingConfig } from '../../utils/enhancedModelLoader'
import { DragonModelManager } from './DragonModelManager'
import { DragonFallbackRenderer } from './DragonFallbackRenderer'
import { DragonSprite2D } from './DragonSprite2D'

export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume: number
  emotion?: 'excited' | 'angry' | 'calm' | 'focused'
}

export interface EnhancedDragonRendererProps {
  // Core rendering props
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  voiceState?: VoiceAnimationState
  enableAnimations?: boolean
  className?: string
  
  // Model selection and validation
  preferredModelId?: string
  preferredQuality?: 'low' | 'medium' | 'high' | 'ultra'
  enableModelValidation?: boolean
  enableSmartFallback?: boolean
  maxFallbackDepth?: number
  
  // Performance and device adaptation
  enableDeviceOptimization?: boolean
  performanceThreshold?: number // FPS threshold for fallback
  memoryThreshold?: number // MB threshold for fallback
  
  // Loading configuration
  loadingStrategy?: LoadingConfig['strategy']
  enablePreloading?: boolean
  loadingTimeout?: number
  retryAttempts?: number
  
  // Fallback configuration
  enableASCIIFallback?: boolean
  enable2DFallback?: boolean
  emergencyFallbackOnly?: boolean
  
  // Error handling and monitoring
  enableErrorRecovery?: boolean
  enablePerformanceMonitoring?: boolean
  enableDebugMode?: boolean
  
  // Event handlers
  onModelLoadStart?: (modelId: string, path: string) => void
  onModelLoadSuccess?: (modelId: string, path: string, fallbackUsed: boolean) => void
  onModelLoadError?: (modelId: string, error: Error) => void
  onFallbackTriggered?: (fromModel: string, toModel: string, reason: string) => void
  onPerformanceWarning?: (metric: string, value: number, threshold: number) => void
  onValidationResult?: (result: { totalModels: number; validModels: number; healthScore: number }) => void
}

interface RendererState {
  currentModelId: string | null
  currentRenderMode: 'glb' | '2d' | 'ascii' | 'fallback'
  isLoading: boolean
  loadingProgress: number
  error: Error | null
  fallbackDepth: number
  validationStatus: 'pending' | 'success' | 'failed' | 'partial'
  performanceMetrics: {
    fps: number
    memoryUsage: number
    loadTime: number
  }
  availableModels: string[]
  debugInfo: {
    lastValidation: string | null
    fallbackChain: string[]
    loadAttempts: number
    errorHistory: string[]
  }
}

export const EnhancedDragonRendererWithValidation: React.FC<EnhancedDragonRendererProps> = ({
  size = 'md',
  voiceState,
  enableAnimations = true,
  className = '',
  preferredModelId = 'seiron-primary',
  preferredQuality = 'medium',
  enableModelValidation = true,
  enableSmartFallback = true,
  maxFallbackDepth = 3,
  enableDeviceOptimization = true,
  performanceThreshold = 30,
  memoryThreshold = 512,
  loadingStrategy = 'progressive',
  enablePreloading = true,
  loadingTimeout = 15000,
  retryAttempts = 2,
  enableASCIIFallback = true,
  enable2DFallback = true,
  emergencyFallbackOnly = false,
  enableErrorRecovery = true,
  enablePerformanceMonitoring = true,
  enableDebugMode = false,
  onModelLoadStart,
  onModelLoadSuccess,
  onModelLoadError,
  onFallbackTriggered,
  onPerformanceWarning,
  onValidationResult
}) => {
  const [state, setState] = useState<RendererState>({
    currentModelId: null,
    currentRenderMode: 'glb',
    isLoading: true,
    loadingProgress: 0,
    error: null,
    fallbackDepth: 0,
    validationStatus: 'pending',
    performanceMetrics: { fps: 60, memoryUsage: 0, loadTime: 0 },
    availableModels: [],
    debugInfo: {
      lastValidation: null,
      fallbackChain: [],
      loadAttempts: 0,
      errorHistory: []
    }
  })

  const validator = useMemo(() => ModelExistenceValidator.getInstance(), [])
  const loader = useMemo(() => EnhancedModelLoader.getInstance(), [])
  const performanceMonitorRef = useRef<{ fps: number; memoryUsage: number }>({ fps: 60, memoryUsage: 0 })
  const mountedRef = useRef(true)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  // Device capability detection
  const deviceCapabilities = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const canvas = document.createElement('canvas')
    const webgl2 = !!canvas.getContext('webgl2')
    const memoryMB = (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 : (isMobile ? 1024 : 4096)
    
    // Simple GPU tier detection
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    let gpuTier: 'low' | 'medium' | 'high' = 'medium'
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
      
      if (renderer.includes('GTX') || renderer.includes('RTX') || renderer.includes('Radeon RX')) {
        gpuTier = 'high'
      } else if (renderer.includes('Intel') || renderer.includes('Iris') || isMobile) {
        gpuTier = 'low'
      }
    }
    
    return { isMobile, supportsWebGL2: webgl2, memoryMB, gpuTier }
  }, [])

  // Initial validation and model selection
  useEffect(() => {
    if (!mountedRef.current) return

    const initializeRenderer = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, validationStatus: 'pending' }))

        // Run model validation if enabled
        if (enableModelValidation) {
          logger.info('Running model validation for enhanced dragon renderer')
          
          const availableModels = await validator.getAvailableModels()
          const validModelIds = availableModels.map(m => m.config.id)
          
          const validationResult = {
            totalModels: Object.keys(AVAILABLE_MODEL_PATHS).length,
            validModels: validModelIds.length,
            healthScore: Math.round((validModelIds.length / Object.keys(AVAILABLE_MODEL_PATHS).length) * 100)
          }

          if (onValidationResult) {
            onValidationResult(validationResult)
          }

          setState(prev => ({
            ...prev,
            availableModels: validModelIds,
            validationStatus: validModelIds.length > 0 ? 'success' : 'failed',
            debugInfo: {
              ...prev.debugInfo,
              lastValidation: new Date().toISOString()
            }
          }))

          logger.info('Model validation completed', validationResult)
        }

        // Select optimal model based on device capabilities and preferences
        let selectedModelId = preferredModelId

        if (enableDeviceOptimization && deviceCapabilities) {
          const optimalModelId = await loader.getOptimalModel(preferredQuality, deviceCapabilities)
          if (optimalModelId) {
            selectedModelId = optimalModelId
            logger.info(`Device optimization selected model: ${optimalModelId}`, { deviceCapabilities })
          }
        }

        // Attempt to load the selected model
        await loadModel(selectedModelId)

      } catch (error) {
        logger.error('Failed to initialize enhanced dragon renderer:', error)
        await handleLoadingError(error instanceof Error ? error : new Error('Initialization failed'))
      }
    }

    initializeRenderer()

    return () => {
      mountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [preferredModelId, preferredQuality, enableModelValidation, enableDeviceOptimization])

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring) return

    const monitorPerformance = () => {
      const now = performance.now()
      const fps = performanceMonitorRef.current.fps
      const memoryUsage = (performance as any).memory?.usedJSHeapSize 
        ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
        : 0

      setState(prev => ({
        ...prev,
        performanceMetrics: { ...prev.performanceMetrics, fps, memoryUsage }
      }))

      // Check performance thresholds
      if (fps < performanceThreshold && onPerformanceWarning) {
        onPerformanceWarning('fps', fps, performanceThreshold)
      }

      if (memoryUsage > memoryThreshold && onPerformanceWarning) {
        onPerformanceWarning('memory', memoryUsage, memoryThreshold)
      }

      // Trigger fallback if performance is severely degraded
      if (fps < performanceThreshold * 0.5 && enableSmartFallback && state.fallbackDepth < maxFallbackDepth) {
        logger.warn(`Performance degraded (${fps} FPS), triggering fallback`)
        triggerFallback('performance')
      }
    }

    const interval = setInterval(monitorPerformance, 1000)
    return () => clearInterval(interval)
  }, [enablePerformanceMonitoring, performanceThreshold, memoryThreshold, enableSmartFallback, state.fallbackDepth])

  const loadModel = useCallback(async (modelId: string) => {
    if (!mountedRef.current) return

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        loadingProgress: 0,
        error: null,
        debugInfo: {
          ...prev.debugInfo,
          loadAttempts: prev.debugInfo.loadAttempts + 1
        }
      }))

      if (onModelLoadStart) {
        const config = AVAILABLE_MODEL_PATHS[modelId]
        onModelLoadStart(modelId, config?.path || 'unknown')
      }

      const loadingConfig: Partial<LoadingConfig> = {
        strategy: loadingStrategy,
        timeout: loadingTimeout,
        retryAttempts,
        maxFallbackDepth,
        enablePreloading,
        enableASCIIFallback,
        enable2DFallback
      }

      const result = await loader.loadModel(modelId, loadingConfig, {
        onLoadProgress: (progress) => {
          setState(prev => ({ ...prev, loadingProgress: progress }))
        },
        onFallbackTriggered: (fromPath, toPath, depth) => {
          logger.info(`Fallback triggered: ${fromPath} → ${toPath} (depth: ${depth})`)
          setState(prev => ({ ...prev, fallbackDepth: depth }))
          
          if (onFallbackTriggered) {
            onFallbackTriggered(fromPath, toPath, 'model_loading_failed')
          }
        },
        onFinalFallback: (fallbackType) => {
          setState(prev => ({ 
            ...prev, 
            currentRenderMode: fallbackType === 'ascii' ? 'ascii' : '2d',
            fallbackDepth: 99
          }))
        }
      })

      if (result.success && mountedRef.current) {
        setState(prev => ({
          ...prev,
          currentModelId: modelId,
          currentRenderMode: result.fallbackDepth >= 98 ? (result.fallbackDepth === 99 ? 'ascii' : '2d') : 'glb',
          isLoading: false,
          loadingProgress: 100,
          error: null,
          fallbackDepth: result.fallbackDepth,
          performanceMetrics: {
            ...prev.performanceMetrics,
            loadTime: result.loadTime
          },
          debugInfo: {
            ...prev.debugInfo,
            fallbackChain: result.fallbackUsed ? [result.path || 'unknown'] : []
          }
        }))

        if (onModelLoadSuccess) {
          onModelLoadSuccess(modelId, result.path || 'unknown', result.fallbackUsed)
        }

        logger.info(`Model loaded successfully: ${modelId}`, {
          path: result.path,
          fallbackUsed: result.fallbackUsed,
          loadTime: result.loadTime
        })
      } else {
        throw result.error || new Error('Model loading failed')
      }

    } catch (error) {
      logger.error(`Model loading failed for ${modelId}:`, error)
      await handleLoadingError(error instanceof Error ? error : new Error('Loading failed'))
    }
  }, [loadingStrategy, loadingTimeout, retryAttempts, maxFallbackDepth, enablePreloading, enableASCIIFallback, enable2DFallback, onModelLoadStart, onModelLoadSuccess, onFallbackTriggered])

  const handleLoadingError = useCallback(async (error: Error) => {
    if (!mountedRef.current) return

    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
      debugInfo: {
        ...prev.debugInfo,
        errorHistory: [...prev.debugInfo.errorHistory.slice(-4), error.message]
      }
    }))

    if (onModelLoadError && state.currentModelId) {
      onModelLoadError(state.currentModelId, error)
    }

    // Trigger fallback if enabled
    if (enableSmartFallback && state.fallbackDepth < maxFallbackDepth) {
      await triggerFallback('error')
    } else if (emergencyFallbackOnly) {
      // Force emergency fallback
      setState(prev => ({
        ...prev,
        currentRenderMode: enableASCIIFallback ? 'ascii' : '2d',
        fallbackDepth: 99,
        isLoading: false
      }))
    }
  }, [enableSmartFallback, state.fallbackDepth, state.currentModelId, maxFallbackDepth, emergencyFallbackOnly, enableASCIIFallback, onModelLoadError])

  const triggerFallback = useCallback(async (reason: string) => {
    if (!mountedRef.current || state.fallbackDepth >= maxFallbackDepth) return

    logger.info(`Triggering fallback due to: ${reason}`)

    // Try next available model
    const currentIndex = state.availableModels.indexOf(state.currentModelId || preferredModelId)
    const nextModelId = state.availableModels[currentIndex + 1]

    if (nextModelId) {
      await loadModel(nextModelId)
    } else {
      // No more models available, use emergency fallback
      setState(prev => ({
        ...prev,
        currentRenderMode: enableASCIIFallback ? 'ascii' : '2d',
        fallbackDepth: 99,
        isLoading: false
      }))
    }
  }, [state.availableModels, state.currentModelId, state.fallbackDepth, maxFallbackDepth, preferredModelId, enableASCIIFallback, loadModel])

  const renderDragon = () => {
    const commonProps = {
      size,
      voiceState,
      enableAnimations,
      className: `dragon-renderer-${state.currentRenderMode} ${className}`
    }

    switch (state.currentRenderMode) {
      case 'glb':
        return (
          <DragonModelManager
            key={state.currentModelId}
            initialModelId={state.currentModelId || preferredModelId}
            {...commonProps}
            enablePreloading={enablePreloading}
            enableAutoFallback={enableSmartFallback}
            performanceThreshold={performanceThreshold}
            onError={(error) => handleLoadingError(error)}
            onFallback={(fromModel, toModel) => {
              if (onFallbackTriggered) {
                onFallbackTriggered(fromModel, toModel, 'component_fallback')
              }
            }}
          />
        )

      case '2d':
        return <DragonSprite2D {...commonProps} />

      case 'ascii':
        return (
          <div className="ascii-dragon-container font-mono text-center p-4">
            <div className="text-blue-400 text-sm mb-2">ASCII Dragon Mode</div>
            <pre className="text-green-400 text-xs">
{`    /\\   /\\
   (  . .)
    )   (
   (  v  )
  ^^  ^  ^^`}
            </pre>
            <div className="text-gray-400 text-xs mt-2">
              Voice State: {voiceState?.isListening ? 'Listening' : voiceState?.isSpeaking ? 'Speaking' : 'Idle'}
            </div>
          </div>
        )

      case 'fallback':
      default:
        return <DragonFallbackRenderer {...commonProps} />
    }
  }

  const renderLoadingOverlay = () => {
    if (!state.isLoading) return null

    return (
      <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
        <div className="bg-gray-900 rounded-lg p-6 border border-blue-500 max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-spin text-2xl">🐉</div>
            <div>
              <div className="text-blue-300 font-semibold">Loading Dragon Model</div>
              <div className="text-gray-400 text-sm">{state.currentModelId || 'Selecting model...'}</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.loadingProgress}%` }}
            />
          </div>
          
          <div className="text-center text-gray-400 text-xs">
            {state.loadingProgress}% • Attempt {state.debugInfo.loadAttempts}
            {state.fallbackDepth > 0 && ` • Fallback Level ${state.fallbackDepth}`}
          </div>
        </div>
      </div>
    )
  }

  const renderDebugInfo = () => {
    if (!enableDebugMode) return null

    return (
      <div className="absolute top-2 right-2 bg-black/90 text-white text-xs p-3 rounded max-w-xs z-20">
        <div className="font-semibold mb-2">🐉 Dragon Debug Info</div>
        <div className="space-y-1">
          <div>Model: {state.currentModelId || 'None'}</div>
          <div>Mode: {state.currentRenderMode}</div>
          <div>Validation: {state.validationStatus}</div>
          <div>Fallback Depth: {state.fallbackDepth}</div>
          <div>FPS: {state.performanceMetrics.fps}</div>
          <div>Memory: {state.performanceMetrics.memoryUsage}MB</div>
          <div>Available Models: {state.availableModels.length}</div>
          {state.error && (
            <div className="text-red-400 mt-2">
              Error: {state.error.message.substring(0, 50)}...
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {renderDragon()}
      {renderLoadingOverlay()}
      {renderDebugInfo()}
      
      {state.error && !state.isLoading && (
        <div className="absolute bottom-2 left-2 bg-red-900/90 text-red-300 text-xs p-2 rounded max-w-xs">
          <div className="font-semibold">Model Error</div>
          <div>{state.error.message}</div>
          {enableSmartFallback && state.fallbackDepth < maxFallbackDepth && (
            <button
              onClick={() => triggerFallback('manual')}
              className="mt-1 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
            >
              Retry Fallback
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedDragonRendererWithValidation