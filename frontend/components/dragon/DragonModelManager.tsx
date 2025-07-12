'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { logger } from '@lib/logger'
import { VoiceAnimationState } from './DragonRenderer'
import { DragonGLTFLoader } from './DragonGLTFLoader'
import { DragonGLTFErrorBoundary } from './GLTFErrorBoundary'
import { errorRecoveryUtils } from '../../utils/errorRecovery'
import { ModelExistenceValidator, AVAILABLE_MODEL_PATHS } from '../../utils/modelExistenceValidator'
import { EnhancedModelLoader } from '../../utils/enhancedModelLoader'

// Types for model management
interface ModelConfig {
  id: string
  path: string
  displayName: string
  quality: 'low' | 'medium' | 'high' | 'ultra'
  fallbackPath?: string
  preloadPriority: 'high' | 'medium' | 'low'
  memoryUsageMB: number
  supportsAnimations: boolean
  supportsVoiceReactions: boolean
  deviceCompatibility: {
    mobile: boolean
    desktop: boolean
    webGL1: boolean
    webGL2: boolean
  }
}

interface ModelSwitchRequest {
  targetModelId: string
  reason: 'user' | 'fallback' | 'performance' | 'error'
  immediate?: boolean
}

interface DragonModelManagerProps {
  initialModelId: string
  voiceState?: VoiceAnimationState
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations?: boolean
  className?: string
  enablePreloading?: boolean
  enableAutoFallback?: boolean
  performanceThreshold?: number
  onModelSwitch?: (from: ModelConfig, to: ModelConfig) => void
  onLoadProgress?: (progress: number, modelId: string) => void
  onError?: (error: Error, modelId: string) => void
  onFallback?: (fromModelId: string, toModelId: string) => void
}

interface ModelManagerState {
  currentModelId: string
  loadingModelId: string | null
  loadedModels: Set<string>
  failedModels: Set<string>
  isTransitioning: boolean
  lastError: Error | null
  switchQueue: ModelSwitchRequest[]
  performanceMetrics: {
    fps: number
    memoryUsage: number
    loadTime: number
  }
}

// Enhanced model configurations using validated paths
const DEFAULT_MODELS: Record<string, ModelConfig> = {
  'seiron-primary': {
    id: 'seiron-primary',
    path: '/models/seiron.glb',
    displayName: 'Seiron Dragon (Primary)',
    quality: 'high',
    fallbackPath: '/models/seiron_optimized.glb',
    preloadPriority: 'high',
    memoryUsageMB: 64,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'seiron-optimized': {
    id: 'seiron-optimized',
    path: '/models/seiron_optimized.glb',
    displayName: 'Seiron Dragon (Optimized)',
    quality: 'medium',
    fallbackPath: '/models/dragon_head_optimized.glb',
    preloadPriority: 'medium',
    memoryUsageMB: 32,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'seiron-animated': {
    id: 'seiron-animated',
    path: '/models/seiron_animated.gltf',
    displayName: 'Seiron Dragon (Animated)',
    quality: 'ultra',
    fallbackPath: '/models/seiron_animated_optimized.gltf',
    preloadPriority: 'low',
    memoryUsageMB: 128,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: false,
      desktop: true,
      webGL1: false,
      webGL2: true
    }
  },
  'seiron-animated-optimized': {
    id: 'seiron-animated-optimized',
    path: '/models/seiron_animated_optimized.gltf',
    displayName: 'Seiron Dragon (Animated Optimized)',
    quality: 'high',
    fallbackPath: '/models/seiron_optimized.glb',
    preloadPriority: 'medium',
    memoryUsageMB: 64,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'dragon-head': {
    id: 'dragon-head',
    path: '/models/dragon_head.glb',
    displayName: 'Dragon Head (Detailed)',
    quality: 'high',
    fallbackPath: '/models/dragon_head_optimized.glb',
    preloadPriority: 'medium',
    memoryUsageMB: 48,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'dragon-head-optimized': {
    id: 'dragon-head-optimized',
    path: '/models/dragon_head_optimized.glb',
    displayName: 'Dragon Head (Optimized)',
    quality: 'medium',
    preloadPriority: 'high',
    memoryUsageMB: 24,
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  }
}

// Model compatibility checker
const checkModelCompatibility = (model: ModelConfig): boolean => {
  if (typeof window === 'undefined') return false
  
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  const hasWebGL2 = !!canvas.getContext('webgl2')
  
  if (isMobile && !model.deviceCompatibility.mobile) {
    return false
  }
  
  if (!gl) {
    return false
  }
  
  if (!hasWebGL2 && !model.deviceCompatibility.webGL1) {
    return false
  }
  
  return true
}

// Enhanced model preloader with validation
class ModelPreloader {
  private static instance: ModelPreloader
  private preloadedModels: Set<string> = new Set()
  private preloadPromises: Map<string, Promise<void>> = new Map()
  private validator: ModelExistenceValidator
  private enhancedLoader: EnhancedModelLoader
  
  static getInstance(): ModelPreloader {
    if (!ModelPreloader.instance) {
      ModelPreloader.instance = new ModelPreloader()
    }
    return ModelPreloader.instance
  }

  constructor() {
    this.validator = ModelExistenceValidator.getInstance()
    this.enhancedLoader = EnhancedModelLoader.getInstance()
  }
  
  async preloadModel(model: ModelConfig): Promise<void> {
    if (this.preloadedModels.has(model.id)) {
      return
    }
    
    if (this.preloadPromises.has(model.id)) {
      return this.preloadPromises.get(model.id)
    }
    
    const preloadPromise = this.executePreload(model)
    this.preloadPromises.set(model.id, preloadPromise)
    
    try {
      await preloadPromise
      this.preloadedModels.add(model.id)
      logger.info(`Preloaded model: ${model.displayName}`, { modelId: model.id })
    } catch (error) {
      logger.error(`Failed to preload model: ${model.displayName}`, error)
      throw error
    } finally {
      this.preloadPromises.delete(model.id)
    }
  }
  
  private async executePreload(model: ModelConfig): Promise<void> {
    try {
      // Validate model existence first
      const validation = await this.validator.validateModel(model.path)
      
      if (!validation.exists) {
        // Try fallback path if primary fails
        if (model.fallbackPath) {
          const fallbackValidation = await this.validator.validateModel(model.fallbackPath)
          if (!fallbackValidation.exists) {
            throw new Error(`Neither primary (${model.path}) nor fallback (${model.fallbackPath}) models exist`)
          }
          
          logger.info(`Preloading fallback model: ${model.fallbackPath}`, { modelId: model.id })
          useGLTF.preload(model.fallbackPath)
        } else {
          throw new Error(`Model does not exist: ${model.path}`)
        }
      } else {
        // Preload primary model
        useGLTF.preload(model.path)
        
        // Also preload fallback if available
        if (model.fallbackPath) {
          const fallbackValidation = await this.validator.validateModel(model.fallbackPath)
          if (fallbackValidation.exists) {
            useGLTF.preload(model.fallbackPath)
          }
        }
      }
    } catch (error) {
      throw new Error(`Preload failed for ${model.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async preloadWithFallbacks(modelId: string): Promise<void> {
    const model = DEFAULT_MODELS[modelId]
    if (!model) {
      throw new Error(`Model configuration not found: ${modelId}`)
    }

    // Get comprehensive fallback chain
    const fallbackChain = await this.validator.createFallbackChain(modelId)
    
    logger.info(`Preloading model with fallback chain: ${modelId}`, {
      chainLength: fallbackChain.length,
      chain: fallbackChain
    })

    // Preload all models in the chain
    for (const modelPath of fallbackChain) {
      try {
        useGLTF.preload(modelPath)
      } catch (error) {
        logger.warn(`Failed to preload fallback model: ${modelPath}`, error)
      }
    }

    this.preloadedModels.add(modelId)
  }
  
  isPreloaded(modelId: string): boolean {
    return this.preloadedModels.has(modelId)
  }
  
  clearPreloaded(modelId: string): void {
    this.preloadedModels.delete(modelId)
  }
  
  clearAll(): void {
    this.preloadedModels.clear()
    this.preloadPromises.clear()
  }

  async validateAllModels(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const [modelId, model] of Object.entries(DEFAULT_MODELS)) {
      try {
        const validation = await this.validator.validateModel(model.path)
        results.set(modelId, validation.exists)
        
        if (!validation.exists) {
          logger.warn(`Model validation failed: ${modelId}`, {
            path: model.path,
            error: validation.error
          })
        }
      } catch (error) {
        results.set(modelId, false)
        logger.error(`Model validation error: ${modelId}`, error)
      }
    }
    
    return results
  }
}

// Hook for managing model state
const useModelManager = (initialModelId: string, options: {
  enablePreloading?: boolean
  enableAutoFallback?: boolean
  performanceThreshold?: number
}) => {
  const [state, setState] = useState<ModelManagerState>({
    currentModelId: initialModelId,
    loadingModelId: null,
    loadedModels: new Set(),
    failedModels: new Set(),
    isTransitioning: false,
    lastError: null,
    switchQueue: [],
    performanceMetrics: {
      fps: 60,
      memoryUsage: 0,
      loadTime: 0
    }
  })
  
  const preloader = useMemo(() => ModelPreloader.getInstance(), [])
  const mountedRef = useRef(true)
  
  // Preload models based on priority
  useEffect(() => {
    if (!options.enablePreloading) return
    
    const preloadModels = async () => {
      const sortedModels = Object.values(DEFAULT_MODELS)
        .filter(model => checkModelCompatibility(model))
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.preloadPriority] - priorityOrder[a.preloadPriority]
        })
      
      for (const model of sortedModels) {
        if (!mountedRef.current) break
        
        try {
          await preloader.preloadModel(model)
        } catch (error) {
          logger.warn(`Failed to preload model ${model.id}:`, error)
        }
      }
    }
    
    preloadModels()
  }, [options.enablePreloading, preloader])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  const switchModel = useCallback(async (request: ModelSwitchRequest) => {
    if (!mountedRef.current) return
    
    const targetModel = DEFAULT_MODELS[request.targetModelId]
    if (!targetModel) {
      logger.error(`Model ${request.targetModelId} not found`)
      return
    }
    
    if (!checkModelCompatibility(targetModel)) {
      logger.warn(`Model ${request.targetModelId} not compatible with current device`)
      return
    }
    
    setState(prevState => ({
      ...prevState,
      isTransitioning: true,
      loadingModelId: request.targetModelId,
      switchQueue: request.immediate 
        ? [request]
        : [...prevState.switchQueue, request]
    }))
    
    try {
      // Preload target model if not already loaded
      if (!preloader.isPreloaded(request.targetModelId)) {
        await preloader.preloadModel(targetModel)
      }
      
      if (mountedRef.current) {
        setState(prevState => ({
          ...prevState,
          currentModelId: request.targetModelId,
          loadingModelId: null,
          isTransitioning: false,
          loadedModels: new Set([...prevState.loadedModels, request.targetModelId]),
          switchQueue: prevState.switchQueue.filter(req => req.targetModelId !== request.targetModelId)
        }))
      }
    } catch (error) {
      logger.error(`Failed to switch to model ${request.targetModelId}:`, error)
      
      if (mountedRef.current) {
        setState(prevState => ({
          ...prevState,
          loadingModelId: null,
          isTransitioning: false,
          failedModels: new Set([...prevState.failedModels, request.targetModelId]),
          lastError: error instanceof Error ? error : new Error('Model switch failed')
        }))
      }
    }
  }, [preloader])
  
  const handleFallback = useCallback((fromModelId: string, reason: string) => {
    const fromModel = DEFAULT_MODELS[fromModelId]
    if (!fromModel) return
    
    // Find suitable fallback
    let fallbackModelId: string | null = null
    
    // Try designated fallback first
    if (fromModel.fallbackPath) {
      const fallbackByPath = Object.values(DEFAULT_MODELS)
        .find(model => model.path === fromModel.fallbackPath)
      if (fallbackByPath && checkModelCompatibility(fallbackByPath)) {
        fallbackModelId = fallbackByPath.id
      }
    }
    
    // Try lower quality model
    if (!fallbackModelId) {
      const qualityOrder = ['ultra', 'high', 'medium', 'low']
      const currentQualityIndex = qualityOrder.indexOf(fromModel.quality)
      
      for (let i = currentQualityIndex + 1; i < qualityOrder.length; i++) {
        const targetQuality = qualityOrder[i] as 'low' | 'medium' | 'high' | 'ultra'
        const fallbackModel = Object.values(DEFAULT_MODELS)
          .find(model => model.quality === targetQuality && checkModelCompatibility(model))
        
        if (fallbackModel) {
          fallbackModelId = fallbackModel.id
          break
        }
      }
    }
    
    // Ultimate fallback to primary model
    if (!fallbackModelId && fromModelId !== 'seiron-primary') {
      fallbackModelId = 'seiron-primary'
    }
    
    if (fallbackModelId) {
      logger.info(`Falling back from ${fromModelId} to ${fallbackModelId}`, { reason })
      switchModel({ targetModelId: fallbackModelId, reason: 'fallback', immediate: true })
    }
  }, [switchModel])
  
  return {
    state,
    switchModel,
    handleFallback,
    preloader
  }
}

// Main DragonModelManager component
export const DragonModelManager: React.FC<DragonModelManagerProps> = ({
  initialModelId,
  voiceState,
  size = 'md',
  enableAnimations = true,
  className,
  enablePreloading = true,
  enableAutoFallback = true,
  performanceThreshold = 30,
  onModelSwitch,
  onLoadProgress,
  onError,
  onFallback
}) => {
  const {
    state,
    switchModel,
    handleFallback,
    preloader
  } = useModelManager(initialModelId, {
    enablePreloading,
    enableAutoFallback,
    performanceThreshold
  })
  
  const currentModel = DEFAULT_MODELS[state.currentModelId]
  const loadingModel = state.loadingModelId ? DEFAULT_MODELS[state.loadingModelId] : null
  
  // Handle model switch events
  useEffect(() => {
    if (onModelSwitch && currentModel) {
      const previousModelId = Object.keys(DEFAULT_MODELS).find(id => id !== state.currentModelId)
      const previousModel = previousModelId ? DEFAULT_MODELS[previousModelId] : null
      
      if (previousModel && previousModel.id !== currentModel.id) {
        onModelSwitch(previousModel, currentModel)
      }
    }
  }, [state.currentModelId, onModelSwitch, currentModel])
  
  // Handle errors with automatic fallback
  const handleError = useCallback((error: Error) => {
    logger.error(`Model error for ${state.currentModelId}:`, error)
    
    if (onError) {
      onError(error, state.currentModelId)
    }
    
    if (enableAutoFallback) {
      handleFallback(state.currentModelId, error.message)
      
      if (onFallback) {
        onFallback(state.currentModelId, 'fallback-pending')
      }
    }
  }, [state.currentModelId, onError, enableAutoFallback, handleFallback, onFallback])
  
  // Handle fallback requests
  const handleFallbackRequest = useCallback(() => {
    handleFallback(state.currentModelId, 'user-requested')
    
    if (onFallback) {
      onFallback(state.currentModelId, 'fallback-pending')
    }
  }, [state.currentModelId, handleFallback, onFallback])
  
  // Transition overlay
  const renderTransitionOverlay = () => {
    if (!state.isTransitioning || !loadingModel) return null
    
    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
        <div className="bg-gray-900 rounded-lg p-6 border border-blue-500">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-2xl">🐉</div>
            <div>
              <div className="text-blue-300 font-semibold">
                Switching to {loadingModel.displayName}
              </div>
              <div className="text-gray-400 text-sm">
                Quality: {loadingModel.quality} | Memory: {loadingModel.memoryUsageMB}MB
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!currentModel) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-400 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div>Model not found: {state.currentModelId}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      <DragonGLTFErrorBoundary
        modelPath={currentModel.path}
        onFallback={handleFallbackRequest}
      >
        <DragonGLTFLoader
          modelPath={currentModel.path}
          voiceState={voiceState}
          size={size}
          enableAnimations={enableAnimations && currentModel.supportsAnimations}
          enablePreloading={enablePreloading}
          onError={handleError}
          onProgress={(progress) => {
            if (onLoadProgress) {
              onLoadProgress(progress, state.currentModelId)
            }
          }}
        />
      </DragonGLTFErrorBoundary>
      
      {renderTransitionOverlay()}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/75 text-white text-xs p-2 rounded max-w-xs">
          <div className="font-semibold mb-1">Model Manager Debug</div>
          <div>Current: {currentModel.displayName}</div>
          <div>Quality: {currentModel.quality}</div>
          <div>Memory: {currentModel.memoryUsageMB}MB</div>
          <div>Animations: {currentModel.supportsAnimations ? 'Yes' : 'No'}</div>
          <div>Voice: {currentModel.supportsVoiceReactions ? 'Yes' : 'No'}</div>
          <div>Preloaded: {preloader.isPreloaded(currentModel.id) ? 'Yes' : 'No'}</div>
          {state.isTransitioning && (
            <div className="text-yellow-400 mt-1">Transitioning...</div>
          )}
          {state.lastError && (
            <div className="text-red-400 mt-1">Error: {state.lastError.message}</div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for external model management
export const useDragonModelManager = (initialModelId: string) => {
  const modelManagerRef = useRef<{
    switchModel: (request: ModelSwitchRequest) => void
    getCurrentModel: () => ModelConfig | null
    getAvailableModels: () => ModelConfig[]
    isModelLoaded: (modelId: string) => boolean
  }>()
  
  const switchModel = useCallback((modelId: string, reason: ModelSwitchRequest['reason'] = 'user') => {
    if (modelManagerRef.current) {
      modelManagerRef.current.switchModel({ targetModelId: modelId, reason })
    }
  }, [])
  
  const getCurrentModel = useCallback(() => {
    return modelManagerRef.current?.getCurrentModel() || null
  }, [])
  
  const getAvailableModels = useCallback(() => {
    return Object.values(DEFAULT_MODELS).filter(checkModelCompatibility)
  }, [])
  
  const isModelLoaded = useCallback((modelId: string) => {
    return modelManagerRef.current?.isModelLoaded(modelId) || false
  }, [])
  
  return {
    switchModel,
    getCurrentModel,
    getAvailableModels,
    isModelLoaded
  }
}

// Export model configurations for external use
export { DEFAULT_MODELS, type ModelConfig, type ModelSwitchRequest }

export default DragonModelManager