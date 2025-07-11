/**
 * Dragon Model Configuration Integration Utilities
 * 
 * This file provides utility functions to integrate the new dragon model configuration
 * system with existing components and hooks.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { 
  DragonModelConfig,
  DeviceCapabilityDetector,
  DragonModelSelector,
  ModelPreloader,
  getRecommendedModel,
  getOptimalQualitySettings,
  createFallbackChain,
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Integration with existing VoiceAnimationState
// Note: VoiceAnimationState is imported from DragonRenderer to avoid conflicts
import { VoiceAnimationState } from '../components/dragon/DragonRenderer'

// Enhanced DragonRenderer props with model configuration
export interface EnhancedDragonRendererProps {
  // Existing props
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  voiceState?: VoiceAnimationState
  enableAnimations?: boolean
  className?: string
  dragonType?: 'glb' | '2d' | 'ascii'
  enableFallback?: boolean
  fallbackType?: '2d' | 'ascii'
  
  // New model configuration props
  preferredQuality?: 'low' | 'medium' | 'high' | 'ultra'
  useCase?: string
  modelId?: string
  enableSmartSelection?: boolean
  enablePerformanceOptimization?: boolean
  enablePreloading?: boolean
  preloadStrategy?: 'aggressive' | 'moderate' | 'conservative'
  
  // Performance monitoring
  enablePerformanceMonitor?: boolean
  performanceThreshold?: number
  onPerformanceChange?: (metrics: any) => void
  
  // Model lifecycle callbacks
  onModelSelected?: (model: DragonModelConfig) => void
  onModelLoaded?: (model: DragonModelConfig) => void
  onModelError?: (error: Error, model: DragonModelConfig) => void
  onFallbackTriggered?: (fromModel: DragonModelConfig, toModel: DragonModelConfig) => void
}

// Smart model selection based on props and device capabilities
export class SmartModelSelectorUtil {
  private static instance: SmartModelSelectorUtil
  private capabilityDetector: DeviceCapabilityDetector
  private modelSelector: DragonModelSelector
  private preloader: ModelPreloader
  private cache: Map<string, DragonModelConfig> = new Map()
  
  static getInstance(): SmartModelSelectorUtil {
    if (!SmartModelSelectorUtil.instance) {
      SmartModelSelectorUtil.instance = new SmartModelSelectorUtil()
    }
    return SmartModelSelectorUtil.instance
  }
  
  constructor() {
    this.capabilityDetector = DeviceCapabilityDetector.getInstance()
    this.modelSelector = DragonModelSelector.getInstance()
    this.preloader = ModelPreloader.getInstance()
  }
  
  async selectOptimalModel(props: EnhancedDragonRendererProps): Promise<DragonModelConfig> {
    const cacheKey = this.generateCacheKey(props)
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    let selectedModel: DragonModelConfig
    
    // If specific model ID is provided, use it
    if (props.modelId) {
      const specificModel = DRAGON_MODELS[props.modelId]
      if (specificModel) {
        selectedModel = specificModel
      } else {
        logger.warn(`Model ${props.modelId} not found, falling back to smart selection`)
        selectedModel = await this.performSmartSelection(props)
      }
    } else {
      selectedModel = await this.performSmartSelection(props)
    }
    
    // Cache the result
    this.cache.set(cacheKey, selectedModel)
    
    // Trigger callbacks
    if (props.onModelSelected) {
      props.onModelSelected(selectedModel)
    }
    
    return selectedModel
  }
  
  private async performSmartSelection(props: EnhancedDragonRendererProps): Promise<DragonModelConfig> {
    const capabilities = await this.capabilityDetector.detectCapabilities()
    
    // Determine quality preference
    let quality = props.preferredQuality || 'medium'
    
    // Adjust quality based on device capabilities
    if (capabilities.gpuTier === 'low' || capabilities.memoryMB < 1024) {
      quality = quality === 'ultra' ? 'high' : quality === 'high' ? 'medium' : 'low'
    }
    
    // Determine use case
    const useCase = props.useCase || this.inferUseCase(props)
    
    // Get recommended model
    const recommendedModel = await getRecommendedModel(quality, useCase)
    
    // Validate model compatibility with current props
    const validatedModel = this.validateModelCompatibility(recommendedModel, props, capabilities)
    
    return validatedModel
  }
  
  private inferUseCase(props: EnhancedDragonRendererProps): string {
    // Infer use case from props
    if (props.voiceState) {
      return 'voice-interface'
    }
    
    if (props.size === 'sm' || props.size === 'md') {
      return 'mobile-optimized'
    }
    
    if (props.size === 'xl' || props.size === 'gigantic') {
      return 'desktop-showcase'
    }
    
    return 'general'
  }
  
  private validateModelCompatibility(
    model: DragonModelConfig,
    props: EnhancedDragonRendererProps,
    capabilities: any
  ): DragonModelConfig {
    // Check if model supports required features
    if (props.voiceState && !model.features.hasVoiceIntegration) {
      logger.warn(`Model ${model.id} doesn't support voice integration, finding alternative`)
      return this.findAlternativeModel(model, { hasVoiceIntegration: true })
    }
    
    if (props.enableAnimations && !model.features.hasAnimations) {
      logger.warn(`Model ${model.id} doesn't support animations, finding alternative`)
      return this.findAlternativeModel(model, { hasAnimations: true })
    }
    
    // Check device compatibility
    const deviceType = capabilities.isDesktop ? 'desktop' : 
                      capabilities.isMobile ? 'mobile' : 'tablet'
    
    if (!model.compatibility[deviceType].supported) {
      logger.warn(`Model ${model.id} not supported on ${deviceType}, finding alternative`)
      const compatibleModels = this.modelSelector.getCompatibleModels(capabilities)
      const firstCompatible = compatibleModels[0]
      if (firstCompatible) {
        return firstCompatible
      }
      const asciiModel = DRAGON_MODELS['dragon-ascii']
      if (!asciiModel) {
        throw new Error('No compatible models found and ASCII fallback unavailable')
      }
      return asciiModel
    }
    
    return model
  }
  
  private findAlternativeModel(
    originalModel: DragonModelConfig,
    requiredFeatures: Record<string, boolean>
  ): DragonModelConfig {
    // Look for alternative models with required features
    const alternatives = originalModel.alternativeModels.map(id => DRAGON_MODELS[id])
    
    for (const alt of alternatives) {
      if (alt && this.hasRequiredFeatures(alt, requiredFeatures)) {
        return alt
      }
    }
    
    // If no alternatives found, use fallback chain
    const fallbackChain = createFallbackChain(originalModel.id)
    for (const fallback of fallbackChain) {
      if (this.hasRequiredFeatures(fallback, requiredFeatures)) {
        return fallback
      }
    }
    
    // Ultimate fallback
    const asciiModel = DRAGON_MODELS['dragon-ascii']
    if (!asciiModel) {
      throw new Error('No compatible models found and ASCII fallback unavailable')
    }
    return asciiModel
  }
  
  private hasRequiredFeatures(
    model: DragonModelConfig,
    requiredFeatures: Record<string, boolean>
  ): boolean {
    for (const [feature, required] of Object.entries(requiredFeatures)) {
      if (required && !model.features[feature as keyof typeof model.features]) {
        return false
      }
    }
    return true
  }
  
  private generateCacheKey(props: EnhancedDragonRendererProps): string {
    return JSON.stringify({
      size: props.size,
      dragonType: props.dragonType,
      preferredQuality: props.preferredQuality,
      useCase: props.useCase,
      modelId: props.modelId,
      hasVoiceState: !!props.voiceState,
      enableAnimations: props.enableAnimations
    })
  }
}

// Model preloading strategies
export class ModelPreloadingStrategyUtil {
  private static instance: ModelPreloadingStrategyUtil
  private preloader: ModelPreloader
  private activePreloads: Set<string> = new Set()
  
  static getInstance(): ModelPreloadingStrategyUtil {
    if (!ModelPreloadingStrategyUtil.instance) {
      ModelPreloadingStrategyUtil.instance = new ModelPreloadingStrategyUtil()
    }
    return ModelPreloadingStrategyUtil.instance
  }
  
  constructor() {
    this.preloader = ModelPreloader.getInstance()
  }
  
  async executePreloadingStrategy(
    model: DragonModelConfig,
    strategy: 'aggressive' | 'moderate' | 'conservative' = 'moderate'
  ): Promise<void> {
    const modelId = model.id
    
    if (this.activePreloads.has(modelId)) {
      return // Already preloading
    }
    
    this.activePreloads.add(modelId)
    
    try {
      switch (strategy) {
        case 'aggressive':
          await this.aggressivePreload(model)
          break
        case 'moderate':
          await this.moderatePreload(model)
          break
        case 'conservative':
          await this.conservativePreload(model)
          break
      }
    } finally {
      this.activePreloads.delete(modelId)
    }
  }
  
  private async aggressivePreload(model: DragonModelConfig): Promise<void> {
    // Preload the model and all its alternatives
    const alternativeModels = model.alternativeModels
      .map(id => DRAGON_MODELS[id])
      .filter((m): m is DragonModelConfig => m !== undefined)
    
    const fallbackModels = model.fallbackModels
      .map(id => DRAGON_MODELS[id])
      .filter((m): m is DragonModelConfig => m !== undefined)
    
    const modelsToPreload = [
      model,
      ...alternativeModels,
      ...fallbackModels
    ]
    
    const preloadPromises = modelsToPreload.map(m => this.preloader.preloadModel(m))
    await Promise.all(preloadPromises)
  }
  
  private async moderatePreload(model: DragonModelConfig): Promise<void> {
    // Preload the model and first fallback
    const modelsToPreload = [model]
    
    if (model.fallbackModels.length > 0) {
      const firstFallbackId = model.fallbackModels[0]
      if (firstFallbackId) {
        const firstFallback = DRAGON_MODELS[firstFallbackId]
        if (firstFallback) {
          modelsToPreload.push(firstFallback)
        }
      }
    }
    
    const preloadPromises = modelsToPreload.map(m => this.preloader.preloadModel(m))
    await Promise.all(preloadPromises)
  }
  
  private async conservativePreload(model: DragonModelConfig): Promise<void> {
    // Preload only the primary model
    await this.preloader.preloadModel(model)
  }
}

// Performance optimization utilities
export class ModelPerformanceOptimizerUtil {
  private static instance: ModelPerformanceOptimizerUtil
  private performanceData: Map<string, number[]> = new Map()
  private optimizationThreshold: number = 30 // FPS
  
  static getInstance(): ModelPerformanceOptimizerUtil {
    if (!ModelPerformanceOptimizerUtil.instance) {
      ModelPerformanceOptimizerUtil.instance = new ModelPerformanceOptimizerUtil()
    }
    return ModelPerformanceOptimizerUtil.instance
  }
  
  recordPerformance(modelId: string, fps: number): void {
    if (!this.performanceData.has(modelId)) {
      this.performanceData.set(modelId, [])
    }
    
    const data = this.performanceData.get(modelId)!
    data.push(fps)
    
    // Keep only last 10 measurements
    if (data.length > 10) {
      data.shift()
    }
  }
  
  getAveragePerformance(modelId: string): number {
    const data = this.performanceData.get(modelId)
    if (!data || data.length === 0) return 0
    
    return data.reduce((sum, fps) => sum + fps, 0) / data.length
  }
  
  shouldOptimize(modelId: string): boolean {
    const avgFPS = this.getAveragePerformance(modelId)
    return avgFPS > 0 && avgFPS < this.optimizationThreshold
  }
  
  async optimizeModel(
    model: DragonModelConfig,
    currentFPS: number
  ): Promise<{ model: DragonModelConfig; qualitySettings: any }> {
    const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
    
    // Get current quality settings
    let qualitySettings = getOptimalQualitySettings(model, capabilities)
    
    // If performance is poor, reduce quality
    if (currentFPS < this.optimizationThreshold) {
      qualitySettings = this.reduceQualitySettings(qualitySettings)
    }
    
    // If still poor, consider fallback model
    if (currentFPS < this.optimizationThreshold * 0.7) {
      const fallbackChain = createFallbackChain(model.id)
      const fallbackModel = fallbackChain[1] // Next in chain
      if (fallbackModel) {
        return {
          model: fallbackModel,
          qualitySettings: getOptimalQualitySettings(fallbackModel, capabilities)
        }
      }
    }
    
    return { model, qualitySettings }
  }
  
  private reduceQualitySettings(settings: any): any {
    return {
      ...settings,
      textureSize: Math.max(256, settings.textureSize / 2),
      shadowQuality: settings.shadowQuality === 'high' ? 'medium' :
                     settings.shadowQuality === 'medium' ? 'low' : 'none',
      antialiasingLevel: Math.max(0, settings.antialiasingLevel - 2),
      effectsLevel: settings.effectsLevel === 'full' ? 'basic' :
                    settings.effectsLevel === 'basic' ? 'minimal' : 'none'
    }
  }
}

// Integration hook for React components
export function useDragonModelConfiguration(props: EnhancedDragonRendererProps) {
  const [selectedModel, setSelectedModel] = React.useState<DragonModelConfig | null>(null)
  const [qualitySettings, setQualitySettings] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = React.useState<any>(null)
  
  const selector = useMemo(() => SmartModelSelectorUtil.getInstance(), [])
  const preloadingStrategy = useMemo(() => ModelPreloadingStrategyUtil.getInstance(), [])
  const optimizer = useMemo(() => ModelPerformanceOptimizerUtil.getInstance(), [])
  
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Select optimal model
        const model = await selector.selectOptimalModel(props)
        setSelectedModel(model)
        
        // Get quality settings
        const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
        const settings = getOptimalQualitySettings(model, capabilities)
        setQualitySettings(settings)
        
        // Execute preloading strategy
        if (props.enablePreloading) {
          await preloadingStrategy.executePreloadingStrategy(
            model, 
            props.preloadStrategy || 'moderate'
          )
        }
        
        // Trigger callback
        if (props.onModelLoaded) {
          props.onModelLoaded(model)
        }
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Model initialization failed')
        setError(error)
        logger.error('Dragon model configuration error:', error)
        
        if (props.onModelError && selectedModel) {
          props.onModelError(error, selectedModel)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeModel()
  }, [
    props.modelId,
    props.preferredQuality,
    props.useCase,
    props.size,
    props.dragonType,
    props.enablePreloading,
    props.preloadStrategy
  ])
  
  // Performance monitoring
  useEffect(() => {
    if (!selectedModel || !props.enablePerformanceOptimization) return
    
    const performanceInterval = setInterval(() => {
      // This would be implemented with actual performance measurement
      const currentFPS = 60 // Placeholder - implement actual FPS measurement
      
      optimizer.recordPerformance(selectedModel.id, currentFPS)
      
      if (optimizer.shouldOptimize(selectedModel.id)) {
        optimizer.optimizeModel(selectedModel, currentFPS).then(({ model, qualitySettings }) => {
          if (model.id !== selectedModel.id) {
            setSelectedModel(model)
            if (props.onFallbackTriggered) {
              props.onFallbackTriggered(selectedModel, model)
            }
          }
          setQualitySettings(qualitySettings)
        })
      }
      
      const metrics = {
        fps: currentFPS,
        averageFPS: optimizer.getAveragePerformance(selectedModel.id),
        shouldOptimize: optimizer.shouldOptimize(selectedModel.id)
      }
      
      setPerformanceMetrics(metrics)
      
      if (props.onPerformanceChange) {
        props.onPerformanceChange(metrics)
      }
    }, DRAGON_MODEL_CONSTANTS.PERFORMANCE_SAMPLE_RATE)
    
    return () => clearInterval(performanceInterval)
  }, [selectedModel, props.enablePerformanceOptimization])
  
  return {
    selectedModel,
    qualitySettings,
    isLoading,
    error,
    performanceMetrics,
    fallbackChain: selectedModel ? createFallbackChain(selectedModel.id) : []
  }
}

// Utility functions for backward compatibility
export function getLegacyModelPath(dragonType: string, size: string): string {
  // Convert legacy props to new model selection
  const useCase = size === 'sm' || size === 'md' ? 'mobile-optimized' : 'desktop-showcase'
  const quality = dragonType === 'glb' ? 'high' : 'medium'
  
  // This is a simplified synchronous version for backward compatibility
  // In practice, you should use the async getRecommendedModel function
  if (dragonType === 'glb') {
    const primaryModel = DRAGON_MODELS['seiron-primary']
    return primaryModel ? primaryModel.path : '/models/seiron.glb'
  } else if (dragonType === '2d') {
    return 'internal://2d-sprite'
  } else {
    return 'internal://ascii-dragon'
  }
}

export function getModelMetadata(modelPath: string): DragonModelConfig | null {
  // Find model by path
  for (const model of Object.values(DRAGON_MODELS)) {
    if (model.path === modelPath) {
      return model
    }
  }
  return null
}

export function isModelPreloaded(modelPath: string): boolean {
  const model = getModelMetadata(modelPath)
  if (!model) return false
  
  const preloader = ModelPreloader.getInstance()
  return preloader.isModelPreloaded(model.id)
}

// Export everything for easy use (classes already exported above)
// SmartModelSelector, ModelPreloadingStrategy, ModelPerformanceOptimizer are already exported as classes

// Export classes with corrected names to avoid conflicts
export const SmartModelSelector = SmartModelSelectorUtil
export const ModelPreloadingStrategy = ModelPreloadingStrategyUtil
export const ModelPerformanceOptimizer = ModelPerformanceOptimizerUtil

export default {
  SmartModelSelector: SmartModelSelectorUtil,
  ModelPreloadingStrategy: ModelPreloadingStrategyUtil,
  ModelPerformanceOptimizer: ModelPerformanceOptimizerUtil,
  useDragonModelConfiguration,
  getLegacyModelPath,
  getModelMetadata,
  isModelPreloaded
}