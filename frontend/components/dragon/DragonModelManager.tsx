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
  checksum?: string // Optional checksum for validation
  version?: string // Version tracking
}

interface ModelManifest {
  version: string
  lastUpdated: string
  models: {
    [modelId: string]: {
      id: string
      path: string
      displayName: string
      version: string
      checksum: string
      fileSize: number
      quality: string
      lastValidated: string
      fallbackChain: string[]
      cachingHeaders?: {
        etag?: string
        lastModified?: string
        cacheControl?: string
      }
    }
  }
}

interface ProgressiveLoadingOptions {
  startQuality: 'low' | 'medium' | 'high' | 'ultra'
  targetQuality: 'low' | 'medium' | 'high' | 'ultra'
  onQualityChange?: (quality: string) => void
}

interface CachingHeaders {
  etag?: string
  lastModified?: string
  cacheControl?: string
  expires?: string
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

// Enhanced model configurations using validated paths - Updated to match actual files
// Files available in /public/models:
// - seiron_animated.gltf (1.8MB)
// - seiron_animated_optimized.gltf (916KB)
// - seiron_animated_lod_high.gltf (998KB)
// - seiron.glb (1.8MB)
// - seiron_optimized.glb (166KB)
// - dragon_head.glb (706KB)
// - dragon_head_optimized.glb (108KB)
const DEFAULT_MODELS: Record<string, ModelConfig> = {
  'seiron-animated': {
    id: 'seiron-animated',
    path: '/models/seiron_animated.gltf',
    displayName: 'Seiron Dragon (Animated)',
    quality: 'ultra',
    fallbackPath: '/models/seiron_animated_optimized.gltf',
    preloadPriority: 'high',
    memoryUsageMB: 180, // Based on actual file size
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: false, // Too large for mobile
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
    fallbackPath: '/models/seiron_animated_lod_high.gltf',
    preloadPriority: 'high',
    memoryUsageMB: 92, // Based on actual file size
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'seiron-lod-high': {
    id: 'seiron-lod-high',
    path: '/models/seiron_animated_lod_high.gltf',
    displayName: 'Seiron Dragon (High LOD)',
    quality: 'high',
    fallbackPath: '/models/seiron_optimized.glb',
    preloadPriority: 'medium',
    memoryUsageMB: 100, // Based on actual file size
    supportsAnimations: true,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: true,
      desktop: true,
      webGL1: true,
      webGL2: true
    }
  },
  'seiron-primary': {
    id: 'seiron-primary',
    path: '/models/seiron.glb',
    displayName: 'Seiron Dragon (Primary)',
    quality: 'high',
    fallbackPath: '/models/seiron_optimized.glb',
    preloadPriority: 'medium',
    memoryUsageMB: 180, // Based on actual file size
    supportsAnimations: false,
    supportsVoiceReactions: true,
    deviceCompatibility: {
      mobile: false, // Too large for mobile
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
    preloadPriority: 'high',
    memoryUsageMB: 16, // Based on actual file size
    supportsAnimations: false,
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
    preloadPriority: 'low',
    memoryUsageMB: 70, // Based on actual file size
    supportsAnimations: false,
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
    fallbackPath: '/models/seiron_optimized.glb',
    preloadPriority: 'high',
    memoryUsageMB: 10, // Based on actual file size
    supportsAnimations: false,
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
  private modelManifest: ModelManifest = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    models: {}
  }
  private checksumCache: Map<string, string> = new Map()
  private progressiveLoadingQueue: Map<string, ProgressiveLoadingOptions> = new Map()
  private cachingHeadersCache: Map<string, CachingHeaders> = new Map()
  
  static getInstance(): ModelPreloader {
    if (!ModelPreloader.instance) {
      ModelPreloader.instance = new ModelPreloader()
    }
    return ModelPreloader.instance
  }

  constructor() {
    this.validator = ModelExistenceValidator.getInstance()
    this.enhancedLoader = EnhancedModelLoader.getInstance()
    
    // Load existing manifest if available
    this.loadManifest()
    
    // Perform startup validation with automatic fallback chain validation
    if (typeof window !== 'undefined') {
      this.performStartupValidation().catch(error => {
        logger.error('Startup validation failed:', error)
      })
    }
  }
  
  /**
   * Public method to validate a model path
   */
  async validateModelPath(path: string) {
    return this.validator.validateModel(path)
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
          
          // Use fallback path
          logger.info(`Using fallback model: ${model.fallbackPath}`, { modelId: model.id })
          
          // Validate fallback checksum
          await this.validateChecksum(model.fallbackPath)
          
          // Validate caching headers
          await this.validateCachingHeaders(model.fallbackPath)
          
          // Preload fallback
          useGLTF.preload(model.fallbackPath)
        } else {
          throw new Error(`Model does not exist: ${model.path}`)
        }
      } else {
        // Validate checksum
        const checksumValid = await this.validateChecksum(model.path, model.checksum)
        if (!checksumValid && model.checksum) {
          logger.warn(`Checksum validation failed for ${model.path}, continuing anyway`)
        }
        
        // Validate caching headers
        const cachingHeaders = await this.validateCachingHeaders(model.path)
        logger.info(`Caching headers for ${model.path}:`, cachingHeaders)
        
        // Preload primary model
        useGLTF.preload(model.path)
        
        // Also preload fallback if available
        if (model.fallbackPath) {
          const fallbackValidation = await this.validator.validateModel(model.fallbackPath)
          if (fallbackValidation.exists) {
            await this.validateChecksum(model.fallbackPath)
            await this.validateCachingHeaders(model.fallbackPath)
            useGLTF.preload(model.fallbackPath)
          }
        }
      }
      
      // Update manifest after successful preload
      this.updateManifest(model)
    } catch (error) {
      throw new Error(`Enhanced preload failed for ${model.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async preloadWithFallbacks(modelId: string): Promise<void> {
    const model = DEFAULT_MODELS[modelId]
    if (!model) {
      throw new Error(`Model configuration not found: ${modelId}`)
    }

    // Validate and get fallback chain
    const fallbackChain = await this.validateFallbackChain(modelId)
    
    logger.info(`Preloading model with validated fallback chain: ${modelId}`, {
      chainLength: fallbackChain.length,
      chain: fallbackChain
    })

    // Preload all models in the validated chain
    for (const modelPath of fallbackChain) {
      try {
        // Validate checksum for each model in chain
        await this.validateChecksum(modelPath)
        
        // Validate caching headers
        await this.validateCachingHeaders(modelPath)
        
        // Preload the model
        useGLTF.preload(modelPath)
        
        logger.info(`Successfully preloaded: ${modelPath}`)
      } catch (error) {
        logger.warn(`Failed to preload model in chain: ${modelPath}`, error)
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
    this.checksumCache.clear()
    this.cachingHeadersCache.clear()
    this.progressiveLoadingQueue.clear()
  }
  
  /**
   * Calculate checksum for a model file
   */
  private async calculateChecksum(path: string): Promise<string> {
    try {
      const response = await fetch(path)
      const buffer = await response.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return hashHex
    } catch (error) {
      logger.error(`Failed to calculate checksum for ${path}:`, error)
      throw error
    }
  }
  
  /**
   * Validate model checksum
   */
  private async validateChecksum(path: string, expectedChecksum?: string): Promise<boolean> {
    try {
      const actualChecksum = await this.calculateChecksum(path)
      this.checksumCache.set(path, actualChecksum)
      
      if (expectedChecksum && actualChecksum !== expectedChecksum) {
        logger.warn(`Checksum mismatch for ${path}. Expected: ${expectedChecksum}, Actual: ${actualChecksum}`)
        return false
      }
      
      logger.info(`Checksum validated for ${path}: ${actualChecksum}`)
      return true
    } catch (error) {
      logger.error(`Checksum validation failed for ${path}:`, error)
      return false
    }
  }
  
  /**
   * Fetch and validate caching headers
   */
  private async validateCachingHeaders(path: string): Promise<CachingHeaders> {
    try {
      const response = await fetch(path, { method: 'HEAD' })
      const headers: CachingHeaders = {
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        cacheControl: response.headers.get('cache-control') || undefined,
        expires: response.headers.get('expires') || undefined
      }
      
      this.cachingHeadersCache.set(path, headers)
      
      // Validate cache control directives
      if (headers.cacheControl) {
        const directives = headers.cacheControl.toLowerCase()
        if (directives.includes('no-cache') || directives.includes('no-store')) {
          logger.warn(`Model ${path} has restrictive cache headers: ${headers.cacheControl}`)
        }
      }
      
      return headers
    } catch (error) {
      logger.error(`Failed to fetch caching headers for ${path}:`, error)
      return {}
    }
  }
  
  /**
   * Progressive loading with quality levels
   */
  async preloadProgressive(
    modelId: string,
    options: ProgressiveLoadingOptions
  ): Promise<void> {
    const qualityOrder = ['low', 'medium', 'high', 'ultra']
    const startIndex = qualityOrder.indexOf(options.startQuality)
    const targetIndex = qualityOrder.indexOf(options.targetQuality)
    
    if (startIndex === -1 || targetIndex === -1 || startIndex > targetIndex) {
      throw new Error('Invalid quality progression')
    }
    
    // Store progressive loading options
    this.progressiveLoadingQueue.set(modelId, options)
    
    // Load models progressively from start to target quality
    for (let i = startIndex; i <= targetIndex; i++) {
      const quality = qualityOrder[i]
      if (!quality) continue // Type guard for TypeScript
      const model = Object.values(DEFAULT_MODELS).find(m => m.id === modelId && m.quality === quality)
      
      if (model) {
        try {
          await this.preloadModel(model)
          
          if (options.onQualityChange) {
            options.onQualityChange(quality)
          }
          
          logger.info(`Progressive load: ${modelId} at ${quality} quality`)
        } catch (error) {
          logger.error(`Failed to load ${modelId} at ${quality} quality:`, error)
          // Continue with next quality level
        }
      }
    }
    
    this.progressiveLoadingQueue.delete(modelId)
  }
  
  /**
   * Update model manifest with latest information
   */
  private updateManifest(model: ModelConfig): void {
    const checksum = this.checksumCache.get(model.path) || 'unknown'
    const cachingHeaders = this.cachingHeadersCache.get(model.path)
    
    this.modelManifest.models[model.id] = {
      id: model.id,
      path: model.path,
      displayName: model.displayName,
      version: model.version || '1.0.0',
      checksum,
      fileSize: model.memoryUsageMB * 1024 * 1024, // Convert to bytes
      quality: model.quality,
      lastValidated: new Date().toISOString(),
      fallbackChain: model.fallbackPath ? [model.path, model.fallbackPath] : [model.path],
      cachingHeaders
    }
    
    this.modelManifest.lastUpdated = new Date().toISOString()
    this.saveManifest()
  }
  
  /**
   * Save manifest to localStorage
   */
  private saveManifest(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('modelManifest', JSON.stringify(this.modelManifest))
        logger.info('Model manifest saved')
      } catch (error) {
        logger.error('Failed to save model manifest:', error)
      }
    }
  }
  
  /**
   * Load manifest from localStorage
   */
  private loadManifest(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('modelManifest')
        if (saved) {
          this.modelManifest = JSON.parse(saved)
          logger.info('Model manifest loaded')
        }
      } catch (error) {
        logger.error('Failed to load model manifest:', error)
      }
    }
  }
  
  /**
   * Get current manifest
   */
  getManifest(): ModelManifest {
    return { ...this.modelManifest }
  }
  
  /**
   * Export manifest to file
   */
  exportManifest(): string {
    return JSON.stringify(this.modelManifest, null, 2)
  }
  
  /**
   * Validate fallback chain for a model
   */
  async validateFallbackChain(modelId: string): Promise<string[]> {
    const validChain: string[] = []
    const model = DEFAULT_MODELS[modelId]
    
    if (!model) {
      throw new Error(`Model not found: ${modelId}`)
    }
    
    // Check primary model
    const primaryValidation = await this.validator.validateModel(model.path)
    if (primaryValidation.exists) {
      validChain.push(model.path)
    }
    
    // Check fallback
    if (model.fallbackPath) {
      const fallbackValidation = await this.validator.validateModel(model.fallbackPath)
      if (fallbackValidation.exists) {
        validChain.push(model.fallbackPath)
      }
      
      // Check if fallback has its own fallback (recursive)
      const fallbackModel = Object.values(DEFAULT_MODELS).find(m => m.path === model.fallbackPath)
      if (fallbackModel?.fallbackPath) {
        const recursiveFallback = await this.validator.validateModel(fallbackModel.fallbackPath)
        if (recursiveFallback.exists) {
          validChain.push(fallbackModel.fallbackPath)
        }
      }
    }
    
    return validChain
  }
  
  /**
   * Get preload statistics
   */
  getPreloadStats(): {
    totalModels: number
    preloadedModels: number
    manifestVersion: string
    lastUpdated: string
    checksumsCached: number
    cachingHeadersCached: number
  } {
    return {
      totalModels: Object.keys(this.modelManifest.models).length,
      preloadedModels: this.preloadedModels.size,
      manifestVersion: this.modelManifest.version,
      lastUpdated: this.modelManifest.lastUpdated,
      checksumsCached: this.checksumCache.size,
      cachingHeadersCached: this.cachingHeadersCache.size
    }
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

  /**
   * Perform startup validation and log comprehensive report
   */
  async performStartupValidation(): Promise<void> {
    logger.info('🐉 DragonModelManager: Starting model validation...')
    
    const startTime = Date.now()
    const validationResults = await this.validateAllModels()
    const validModels = Array.from(validationResults.entries()).filter(([_, exists]) => exists)
    const invalidModels = Array.from(validationResults.entries()).filter(([_, exists]) => !exists)
    
    logger.info('📊 Model validation complete', {
      duration: Date.now() - startTime,
      totalModels: validationResults.size,
      validModels: validModels.length,
      invalidModels: invalidModels.length
    })
    
    // Log valid models with their configurations
    if (validModels.length > 0) {
      logger.info('✅ Available models:', validModels.map(([modelId]) => {
        const model = DEFAULT_MODELS[modelId]
        return model ? {
          id: modelId,
          displayName: model.displayName,
          quality: model.quality,
          memoryMB: model.memoryUsageMB,
          animations: model.supportsAnimations
        } : { id: modelId }
      }))
    }
    
    // Warn about invalid models
    if (invalidModels.length > 0) {
      logger.warn('❌ Unavailable models:', invalidModels.map(([modelId]) => {
        const model = DEFAULT_MODELS[modelId]
        return {
          id: modelId,
          path: model?.path || 'unknown'
        }
      }))
    }
    
    // Create fallback chains for all models
    logger.info('🔗 Validating fallback chains...')
    for (const modelId of validModels.map(([id]) => id)) {
      try {
        const chain = await this.validator.createFallbackChain(modelId)
        logger.debug(`Fallback chain for ${modelId}:`, chain)
      } catch (error) {
        logger.error(`Failed to create fallback chain for ${modelId}:`, error)
      }
    }
  }
}

// Hook for managing model state
const useModelManager = (initialModelId: string, options: {
  enablePreloading?: boolean
  enableAutoFallback?: boolean
  performanceThreshold?: number
  onFallback?: (fromModelId: string, toModelId: string) => void
  onError?: (error: Error, modelId: string) => void
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
  
  const handleFallback = useCallback(async (fromModelId: string, reason: string) => {
    const fromModel = DEFAULT_MODELS[fromModelId]
    if (!fromModel) return
    
    logger.warn(`Initiating fallback from ${fromModelId}`, { reason })
    
    // Enhanced fallback strategy with validation
    const fallbackCandidates: string[] = []
    
    // 1. Try designated fallback first
    if (fromModel.fallbackPath) {
      const fallbackByPath = Object.values(DEFAULT_MODELS)
        .find(model => model.path === fromModel.fallbackPath)
      if (fallbackByPath && checkModelCompatibility(fallbackByPath)) {
        fallbackCandidates.push(fallbackByPath.id)
      }
    }
    
    // 2. Try lower quality models in order
    const qualityOrder = ['ultra', 'high', 'medium', 'low']
    const currentQualityIndex = qualityOrder.indexOf(fromModel.quality)
    
    for (let i = currentQualityIndex + 1; i < qualityOrder.length; i++) {
      const targetQuality = qualityOrder[i] as 'low' | 'medium' | 'high' | 'ultra'
      const fallbackModels = Object.values(DEFAULT_MODELS)
        .filter(model => 
          model.quality === targetQuality && 
          checkModelCompatibility(model) &&
          !state.failedModels.has(model.id)
        )
        .sort((a, b) => a.memoryUsageMB - b.memoryUsageMB) // Prefer smaller models
      
      fallbackCandidates.push(...fallbackModels.map(m => m.id))
    }
    
    // 3. Add emergency fallbacks if not already included
    const emergencyFallbacks = ['seiron-optimized', 'dragon-head-optimized']
      .filter(id => 
        id !== fromModelId && 
        !fallbackCandidates.includes(id) &&
        !state.failedModels.has(id)
      )
    fallbackCandidates.push(...emergencyFallbacks)
    
    // 4. Test each candidate with validation
    for (const candidateId of fallbackCandidates) {
      const candidate = DEFAULT_MODELS[candidateId]
      if (!candidate) continue
      
      try {
        // Quick validation check
        const validation = await preloader.validateModelPath(candidate.path)
        if (validation.exists) {
          logger.info(`Fallback successful: ${fromModelId} → ${candidateId}`, { 
            reason, 
            loadTime: validation.loadTime,
            fileSize: validation.fileSize 
          })
          
          if (options.onFallback) {
            options.onFallback(fromModelId, candidateId)
          }
          
          switchModel({ targetModelId: candidateId, reason: 'fallback', immediate: true })
          return
        } else {
          logger.warn(`Fallback candidate ${candidateId} validation failed:`, validation.error)
          // Mark as failed to avoid retrying
          setState(prevState => ({
            ...prevState,
            failedModels: new Set([...prevState.failedModels, candidateId])
          }))
        }
      } catch (error) {
        logger.error(`Error validating fallback candidate ${candidateId}:`, error)
        setState(prevState => ({
          ...prevState,
          failedModels: new Set([...prevState.failedModels, candidateId])
        }))
      }
    }
    
    // 5. If all fallbacks failed, trigger external fallback (ASCII/2D dragons)
    logger.error(`All model fallbacks failed for ${fromModelId}`, { 
      testedCandidates: fallbackCandidates,
      failedModels: Array.from(state.failedModels)
    })
    
    if (options.onError) {
      options.onError(new Error(`No suitable fallback model found for ${fromModelId}`), fromModelId)
    }
  }, [switchModel, preloader, state.failedModels, options.onFallback, options.onError, setState])
  
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
    performanceThreshold,
    onFallback,
    onError
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
  
  // Enhanced error handling with immediate 404 detection and fallback
  const handleError = useCallback(async (error: Error) => {
    logger.error(`Model error for ${state.currentModelId}:`, error)
    
    // Detect specific error types for faster fallback decisions
    const errorMessage = error.message.toLowerCase()
    const is404Error = errorMessage.includes('404') || errorMessage.includes('not found')
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network')
    const isCorsError = errorMessage.includes('cors') || errorMessage.includes('cross-origin')
    
    // Log error categorization for debugging
    logger.warn(`Error categorization for ${state.currentModelId}:`, {
      is404Error,
      isNetworkError, 
      isCorsError,
      errorMessage
    })
    
    if (onError) {
      onError(error, state.currentModelId)
    }
    
    if (enableAutoFallback) {
      // For 404 errors, trigger immediate fallback without delay
      if (is404Error) {
        logger.info(`404 detected for ${state.currentModelId}, triggering immediate fallback`)
        await handleFallback(state.currentModelId, `404 Not Found: ${error.message}`)
      } 
      // For network/CORS errors, do a quick validation check before fallback
      else if (isNetworkError || isCorsError) {
        logger.info(`Network/CORS error detected for ${state.currentModelId}, validating model availability`)
        
        try {
          if (currentModel) {
            const validation = await preloader.validateModelPath(currentModel.path)
            if (!validation.exists) {
              logger.warn(`Model validation failed after network error: ${validation.error}`)
              await handleFallback(state.currentModelId, `Network error + validation failed: ${error.message}`)
            } else {
              logger.info(`Model exists but had temporary network issue, retrying...`)
              // Could implement retry logic here if needed
            }
          }
        } catch (validationError) {
          logger.error(`Validation failed for ${state.currentModelId}:`, validationError)
          await handleFallback(state.currentModelId, `Validation error: ${error.message}`)
        }
      }
      // For other errors, use standard fallback
      else {
        await handleFallback(state.currentModelId, error.message)
      }
      
      if (onFallback) {
        onFallback(state.currentModelId, 'fallback-initiated')
      }
    }
  }, [state.currentModelId, currentModel, onError, enableAutoFallback, handleFallback, onFallback, preloader])
  
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
export { DEFAULT_MODELS, ModelPreloader, type ModelConfig, type ModelSwitchRequest, type ModelManifest, type CachingHeaders, type ProgressiveLoadingOptions }

export default DragonModelManager