/**
 * Enhanced Model Loader with Robust Fallback System
 * 
 * This module provides enhanced model loading capabilities with:
 * - Automatic model existence validation before loading
 * - Smart fallback chain execution
 * - Preloading strategies with error recovery
 * - Performance monitoring and optimization
 * - Graceful degradation to ASCII/2D fallbacks
 */

import { ModelExistenceValidator, AVAILABLE_MODEL_PATHS, type ModelPathConfig } from './modelExistenceValidator'
import { logger } from '@lib/logger'

// Loading states and results
export interface ModelLoadingState {
  isLoading: boolean
  currentPath: string | null
  fallbackDepth: number
  error: Error | null
  loadingProgress: number
  timeStarted: number | null
  timeCompleted: number | null
}

export interface ModelLoadingResult {
  success: boolean
  path: string | null
  fallbackUsed: boolean
  fallbackDepth: number
  loadTime: number
  error?: Error
  fileSize?: number
}

// Loading strategies
export type LoadingStrategy = 'immediate' | 'lazy' | 'progressive' | 'preload'

export interface LoadingConfig {
  strategy: LoadingStrategy
  maxFallbackDepth: number
  timeout: number
  retryAttempts: number
  retryDelay: number
  enablePreloading: boolean
  enableASCIIFallback: boolean
  enable2DFallback: boolean
  performanceThreshold: number
}

// Default loading configuration
const DEFAULT_LOADING_CONFIG: LoadingConfig = {
  strategy: 'progressive',
  maxFallbackDepth: 3,
  timeout: 15000, // 15 seconds
  retryAttempts: 2,
  retryDelay: 1000, // 1 second
  enablePreloading: true,
  enableASCIIFallback: true,
  enable2DFallback: true,
  performanceThreshold: 30 // FPS
}

// Model loading events
export interface ModelLoadingEvents {
  onLoadStart?: (path: string) => void
  onLoadProgress?: (progress: number, path: string) => void
  onLoadSuccess?: (result: ModelLoadingResult) => void
  onLoadError?: (error: Error, path: string) => void
  onFallbackTriggered?: (fromPath: string, toPath: string, depth: number) => void
  onFinalFallback?: (fallbackType: 'ascii' | '2d') => void
}

export class EnhancedModelLoader {
  private static instance: EnhancedModelLoader
  private validator: ModelExistenceValidator
  private loadingStates: Map<string, ModelLoadingState> = new Map()
  private preloadedModels: Set<string> = new Set()
  private fallbackChains: Map<string, string[]> = new Map()

  static getInstance(): EnhancedModelLoader {
    if (!EnhancedModelLoader.instance) {
      EnhancedModelLoader.instance = new EnhancedModelLoader()
    }
    return EnhancedModelLoader.instance
  }

  constructor() {
    this.validator = ModelExistenceValidator.getInstance()
  }

  /**
   * Load a model with comprehensive fallback support
   */
  async loadModel(
    modelId: string,
    config: Partial<LoadingConfig> = {},
    events: ModelLoadingEvents = {}
  ): Promise<ModelLoadingResult> {
    const fullConfig = { ...DEFAULT_LOADING_CONFIG, ...config }
    const modelConfig = AVAILABLE_MODEL_PATHS[modelId]
    
    if (!modelConfig) {
      const error = new Error(`Model configuration not found: ${modelId}`)
      logger.error('Model loading failed:', error)
      return this.handleFinalFallback(fullConfig, events, error)
    }

    // Initialize loading state
    const loadingState: ModelLoadingState = {
      isLoading: true,
      currentPath: null,
      fallbackDepth: 0,
      error: null,
      loadingProgress: 0,
      timeStarted: Date.now(),
      timeCompleted: null
    }
    
    this.loadingStates.set(modelId, loadingState)

    try {
      // Get or create fallback chain
      let fallbackChain = this.fallbackChains.get(modelId)
      if (!fallbackChain) {
        fallbackChain = await this.validator.createFallbackChain(modelId)
        this.fallbackChains.set(modelId, fallbackChain)
      }

      if (fallbackChain.length === 0) {
        throw new Error(`No available models found for ${modelId}`)
      }

      logger.info(`Starting model loading for ${modelId}`, {
        strategy: fullConfig.strategy,
        fallbackChainLength: fallbackChain.length
      })

      // Attempt to load models in fallback order
      for (let i = 0; i < Math.min(fallbackChain.length, fullConfig.maxFallbackDepth + 1); i++) {
        const modelPath = fallbackChain[i]!
        const isLastAttempt = i === Math.min(fallbackChain.length - 1, fullConfig.maxFallbackDepth)
        
        loadingState.currentPath = modelPath
        loadingState.fallbackDepth = i
        loadingState.loadingProgress = 0

        if (events.onLoadStart) {
          events.onLoadStart(modelPath)
        }

        if (i > 0 && events.onFallbackTriggered) {
          events.onFallbackTriggered(fallbackChain[i - 1]!, modelPath, i)
        }

        try {
          const result = await this.attemptModelLoad(
            modelPath,
            fullConfig,
            events,
            loadingState,
            isLastAttempt
          )

          if (result.success) {
            loadingState.isLoading = false
            loadingState.timeCompleted = Date.now()
            loadingState.error = null
            
            this.loadingStates.set(modelId, loadingState)
            
            const finalResult: ModelLoadingResult = {
              ...result,
              fallbackUsed: i > 0,
              fallbackDepth: i
            }

            if (events.onLoadSuccess) {
              events.onLoadSuccess(finalResult)
            }

            logger.info(`Model loaded successfully: ${modelPath}`, {
              modelId,
              fallbackUsed: i > 0,
              fallbackDepth: i,
              loadTime: result.loadTime
            })

            return finalResult
          }
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Unknown loading error')
          loadingState.error = errorObj
          
          logger.warn(`Model loading attempt failed: ${modelPath}`, {
            modelId,
            fallbackDepth: i,
            error: errorObj.message
          })

          if (events.onLoadError) {
            events.onLoadError(errorObj, modelPath)
          }

          // Continue to next fallback unless this was the last attempt
          if (!isLastAttempt) {
            continue
          }
          
          // If this was the last model loading attempt, proceed to final fallback
          throw errorObj
        }
      }

      // If we reach here, all model loading attempts failed
      throw new Error('All model loading attempts exhausted')

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Model loading failed')
      loadingState.isLoading = false
      loadingState.error = errorObj
      loadingState.timeCompleted = Date.now()
      
      this.loadingStates.set(modelId, loadingState)
      
      logger.error(`Model loading failed for ${modelId}:`, errorObj)
      return this.handleFinalFallback(fullConfig, events, errorObj)
    }
  }

  /**
   * Preload models for faster access
   */
  async preloadModels(
    modelIds: string[],
    config: Partial<LoadingConfig> = {}
  ): Promise<Map<string, ModelLoadingResult>> {
    const fullConfig = { ...DEFAULT_LOADING_CONFIG, ...config }
    const results = new Map<string, ModelLoadingResult>()

    if (!fullConfig.enablePreloading) {
      logger.info('Preloading disabled, skipping')
      return results
    }

    logger.info(`Preloading ${modelIds.length} models`)

    // Preload validations first
    await this.validator.preloadValidations(modelIds)

    // Load models concurrently with limited parallelism
    const PRELOAD_CONCURRENCY = 2
    for (let i = 0; i < modelIds.length; i += PRELOAD_CONCURRENCY) {
      const batch = modelIds.slice(i, i + PRELOAD_CONCURRENCY)
      const batchPromises = batch.map(async modelId => {
        try {
          const result = await this.loadModel(modelId, {
            ...fullConfig,
            strategy: 'preload'
          })
          results.set(modelId, result)
          
          if (result.success && result.path) {
            this.preloadedModels.add(result.path)
          }
        } catch (error) {
          logger.warn(`Preload failed for ${modelId}:`, error)
          results.set(modelId, {
            success: false,
            path: null,
            fallbackUsed: false,
            fallbackDepth: 0,
            loadTime: 0,
            error: error instanceof Error ? error : new Error('Preload failed')
          })
        }
      })

      await Promise.allSettled(batchPromises)
    }

    logger.info(`Preloading completed: ${results.size} models processed`)
    return results
  }

  /**
   * Get optimal model for current device/conditions
   */
  async getOptimalModel(
    preferredQuality: 'low' | 'medium' | 'high' | 'ultra' = 'medium',
    deviceCapabilities?: {
      isMobile: boolean
      supportsWebGL2: boolean
      memoryMB: number
      gpuTier: 'low' | 'medium' | 'high'
    }
  ): Promise<string | null> {
    const availableModels = await this.validator.getAvailableModels()
    
    if (availableModels.length === 0) {
      logger.warn('No available models found for optimal selection')
      return null
    }

    // Filter by device capabilities if provided
    let candidateModels = availableModels
    
    if (deviceCapabilities) {
      candidateModels = availableModels.filter(({ config }) => {
        // Basic filtering logic based on model characteristics
        if (deviceCapabilities.isMobile && config.path.includes('lod_high')) {
          return false // Skip high-LOD models on mobile
        }
        
        if (deviceCapabilities.gpuTier === 'low' && config.path.includes('animated')) {
          return false // Skip animated models on low-end GPUs
        }
        
        return true
      })
    }

    // Sort by preference (prioritize models matching preferred quality)
    const sortedModels = candidateModels.sort((a, b) => {
      // Prefer optimized models for lower quality preferences
      if (preferredQuality === 'low' || preferredQuality === 'medium') {
        if (a.config.path.includes('optimized') && !b.config.path.includes('optimized')) {
          return -1
        }
        if (!a.config.path.includes('optimized') && b.config.path.includes('optimized')) {
          return 1
        }
      }
      
      // Use priority as tiebreaker
      return a.config.priority - b.config.priority
    })

    const optimalModel = sortedModels[0]
    if (optimalModel) {
      logger.info(`Selected optimal model: ${optimalModel.config.id}`, {
        path: optimalModel.config.path,
        preferredQuality,
        deviceCapabilities
      })
      return optimalModel.config.id
    }

    return null
  }

  /**
   * Check if a model is preloaded
   */
  isModelPreloaded(modelId: string): boolean {
    const config = AVAILABLE_MODEL_PATHS[modelId]
    return config ? this.preloadedModels.has(config.path) : false
  }

  /**
   * Get loading state for a model
   */
  getLoadingState(modelId: string): ModelLoadingState | null {
    return this.loadingStates.get(modelId) || null
  }

  /**
   * Clear preloaded models cache
   */
  clearPreloadedModels(): void {
    this.preloadedModels.clear()
    this.fallbackChains.clear()
    logger.info('Preloaded models cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    preloadedModels: number
    fallbackChains: number
    activeLoadings: number
  } {
    return {
      preloadedModels: this.preloadedModels.size,
      fallbackChains: this.fallbackChains.size,
      activeLoadings: Array.from(this.loadingStates.values()).filter(s => s.isLoading).length
    }
  }

  private async attemptModelLoad(
    modelPath: string,
    config: LoadingConfig,
    events: ModelLoadingEvents,
    loadingState: ModelLoadingState,
    isLastAttempt: boolean
  ): Promise<ModelLoadingResult> {
    const startTime = Date.now()
    let retryCount = 0

    while (retryCount <= config.retryAttempts) {
      try {
        // Validate model existence first
        const validation = await this.validator.validateModel(modelPath)
        
        if (!validation.exists) {
          throw new Error(validation.error || 'Model file not found')
        }

        // Simulate model loading progress
        loadingState.loadingProgress = 10
        if (events.onLoadProgress) {
          events.onLoadProgress(10, modelPath)
        }

        // For the actual implementation, this would involve Three.js/R3F loading
        // For now, we'll simulate the loading process
        const loadingPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Model loading timeout'))
          }, config.timeout)

          // Simulate loading progress
          const progressInterval = setInterval(() => {
            if (loadingState.loadingProgress < 90) {
              loadingState.loadingProgress += 20
              if (events.onLoadProgress) {
                events.onLoadProgress(loadingState.loadingProgress, modelPath)
              }
            }
          }, 200)

          // Simulate loading completion
          setTimeout(() => {
            clearTimeout(timeout)
            clearInterval(progressInterval)
            loadingState.loadingProgress = 100
            if (events.onLoadProgress) {
              events.onLoadProgress(100, modelPath)
            }
            resolve()
          }, 500) // Simulate 500ms loading time
        })

        await loadingPromise

        const loadTime = Date.now() - startTime
        
        return {
          success: true,
          path: modelPath,
          fallbackUsed: false, // Will be set by caller
          fallbackDepth: 0, // Will be set by caller
          loadTime,
          fileSize: validation.fileSize
        }

      } catch (error) {
        retryCount++
        const errorObj = error instanceof Error ? error : new Error('Loading attempt failed')
        
        logger.warn(`Model loading attempt ${retryCount} failed for ${modelPath}:`, errorObj)
        
        if (retryCount <= config.retryAttempts && !isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay))
          continue
        }
        
        throw errorObj
      }
    }

    throw new Error('All retry attempts exhausted')
  }

  private async handleFinalFallback(
    config: LoadingConfig,
    events: ModelLoadingEvents,
    error: Error
  ): Promise<ModelLoadingResult> {
    logger.warn('Handling final fallback due to model loading failure:', error)

    // Try ASCII fallback first
    if (config.enableASCIIFallback) {
      if (events.onFinalFallback) {
        events.onFinalFallback('ascii')
      }
      
      logger.info('Falling back to ASCII dragon')
      return {
        success: true,
        path: 'internal://ascii-dragon',
        fallbackUsed: true,
        fallbackDepth: 99, // Special value to indicate final fallback
        loadTime: 0,
        error
      }
    }

    // Try 2D sprite fallback
    if (config.enable2DFallback) {
      if (events.onFinalFallback) {
        events.onFinalFallback('2d')
      }
      
      logger.info('Falling back to 2D sprite dragon')
      return {
        success: true,
        path: 'internal://2d-sprite',
        fallbackUsed: true,
        fallbackDepth: 98, // Special value to indicate final fallback
        loadTime: 0,
        error
      }
    }

    // Complete failure
    logger.error('All fallback options exhausted')
    return {
      success: false,
      path: null,
      fallbackUsed: true,
      fallbackDepth: -1,
      loadTime: 0,
      error
    }
  }
}

// Utility functions for easy access
export const loadModel = (
  modelId: string,
  config?: Partial<LoadingConfig>,
  events?: ModelLoadingEvents
) => EnhancedModelLoader.getInstance().loadModel(modelId, config, events)

export const preloadModels = (
  modelIds: string[],
  config?: Partial<LoadingConfig>
) => EnhancedModelLoader.getInstance().preloadModels(modelIds, config)

export const getOptimalModel = (
  preferredQuality?: 'low' | 'medium' | 'high' | 'ultra',
  deviceCapabilities?: {
    isMobile: boolean
    supportsWebGL2: boolean
    memoryMB: number
    gpuTier: 'low' | 'medium' | 'high'
  }
) => EnhancedModelLoader.getInstance().getOptimalModel(preferredQuality, deviceCapabilities)

// Default export
export default EnhancedModelLoader