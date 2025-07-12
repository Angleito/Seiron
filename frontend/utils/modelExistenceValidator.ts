/**
 * Model Existence Validation Utility
 * 
 * This utility provides comprehensive validation for 3D model files with:
 * - Runtime model availability checking before loading
 * - HEAD request validation for model files
 * - Graceful degradation when models are unavailable
 * - Centralized model path configuration
 * - Automatic fallback chain generation
 */

import { logger } from '@lib/logger'

// Model file existence cache
interface ModelExistenceCache {
  [path: string]: {
    exists: boolean
    lastChecked: number
    fileSize?: number
    contentType?: string
  }
}

// Validation result interface
export interface ModelValidationResult {
  exists: boolean
  path: string
  fileSize?: number
  contentType?: string
  loadTime: number
  error?: string
}

// Model path configuration
export interface ModelPathConfig {
  id: string
  path: string
  fallbackPaths: string[]
  priority: number
  description: string
}

// Centralized model paths - matches actual files in the directory
export const AVAILABLE_MODEL_PATHS: Record<string, ModelPathConfig> = {
  'seiron-primary': {
    id: 'seiron-primary',
    path: '/models/seiron.glb',
    fallbackPaths: ['/models/seiron_optimized.glb', '/models/dragon_head_optimized.glb'],
    priority: 1,
    description: 'Primary full-body Seiron dragon model'
  },
  'seiron-optimized': {
    id: 'seiron-optimized', 
    path: '/models/seiron_optimized.glb',
    fallbackPaths: ['/models/dragon_head_optimized.glb'],
    priority: 2,
    description: 'Optimized Seiron dragon model for performance'
  },
  'seiron-animated': {
    id: 'seiron-animated',
    path: '/models/seiron_animated.gltf',
    fallbackPaths: ['/models/seiron_animated_optimized.gltf', '/models/seiron_optimized.glb'],
    priority: 3,
    description: 'Animated Seiron dragon with complex movements'
  },
  'seiron-animated-optimized': {
    id: 'seiron-animated-optimized',
    path: '/models/seiron_animated_optimized.gltf',
    fallbackPaths: ['/models/seiron_optimized.glb', '/models/dragon_head_optimized.glb'],
    priority: 4,
    description: 'Optimized animated Seiron dragon'
  },
  'seiron-lod-high': {
    id: 'seiron-lod-high',
    path: '/models/seiron_animated_lod_high.gltf',
    fallbackPaths: ['/models/seiron_animated.gltf', '/models/seiron_optimized.glb'],
    priority: 5,
    description: 'High LOD animated Seiron dragon'
  },
  'dragon-head': {
    id: 'dragon-head',
    path: '/models/dragon_head.glb',
    fallbackPaths: ['/models/dragon_head_optimized.glb'],
    priority: 6,
    description: 'Detailed dragon head model'
  },
  'dragon-head-optimized': {
    id: 'dragon-head-optimized',
    path: '/models/dragon_head_optimized.glb',
    fallbackPaths: [],
    priority: 7,
    description: 'Optimized dragon head for mobile devices'
  },
  'dragon-head-obj': {
    id: 'dragon-head-obj',
    path: '/models/dragon_head.obj',
    fallbackPaths: ['/models/dragon_head_optimized.glb'],
    priority: 8,
    description: 'Dragon head in OBJ format'
  }
}

export class ModelExistenceValidator {
  private static instance: ModelExistenceValidator
  private cache: ModelExistenceCache = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly REQUEST_TIMEOUT = 5000 // 5 seconds
  private readonly MAX_CONCURRENT_CHECKS = 3
  private currentChecks = 0

  static getInstance(): ModelExistenceValidator {
    if (!ModelExistenceValidator.instance) {
      ModelExistenceValidator.instance = new ModelExistenceValidator()
    }
    return ModelExistenceValidator.instance
  }

  /**
   * Validate that a model file exists and is accessible
   */
  async validateModel(path: string): Promise<ModelValidationResult> {
    const startTime = Date.now()
    
    // Check cache first
    const cached = this.getCachedResult(path)
    if (cached) {
      return {
        ...cached,
        path,
        loadTime: Date.now() - startTime
      }
    }

    // Perform validation
    try {
      const result = await this.performValidation(path)
      
      // Cache result
      this.cache[path] = {
        exists: result.exists,
        lastChecked: Date.now(),
        fileSize: result.fileSize,
        contentType: result.contentType
      }
      
      return {
        ...result,
        path,
        loadTime: Date.now() - startTime
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      logger.error(`Model validation failed for ${path}:`, error)
      
      // Cache failure
      this.cache[path] = {
        exists: false,
        lastChecked: Date.now()
      }
      
      return {
        exists: false,
        path,
        loadTime: Date.now() - startTime,
        error: errorMessage
      }
    }
  }

  /**
   * Validate multiple models concurrently
   */
  async validateModels(paths: string[]): Promise<ModelValidationResult[]> {
    const results: ModelValidationResult[] = []
    
    // Process in batches to respect concurrency limits
    for (let i = 0; i < paths.length; i += this.MAX_CONCURRENT_CHECKS) {
      const batch = paths.slice(i, i + this.MAX_CONCURRENT_CHECKS)
      const batchResults = await Promise.allSettled(
        batch.map(path => this.validateModel(path))
      )
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          const path = batch[index]
          results.push({
            exists: false,
            path: path!,
            loadTime: 0,
            error: result.reason?.message || 'Validation failed'
          })
        }
      })
    }
    
    return results
  }

  /**
   * Find the first available model from a fallback chain
   */
  async findAvailableModel(modelConfig: ModelPathConfig): Promise<ModelValidationResult | null> {
    const pathsToCheck = [modelConfig.path, ...modelConfig.fallbackPaths]
    
    for (const path of pathsToCheck) {
      const result = await this.validateModel(path)
      if (result.exists) {
        logger.info(`Found available model: ${path}`, { 
          modelId: modelConfig.id,
          fallbackUsed: path !== modelConfig.path
        })
        return result
      }
    }
    
    logger.warn(`No available models found for ${modelConfig.id}`, { 
      checkedPaths: pathsToCheck 
    })
    return null
  }

  /**
   * Get all available models sorted by priority
   */
  async getAvailableModels(): Promise<Array<{ config: ModelPathConfig; validation: ModelValidationResult }>> {
    const configs = Object.values(AVAILABLE_MODEL_PATHS)
    const validationResults = await Promise.allSettled(
      configs.map(async config => ({
        config,
        validation: await this.findAvailableModel(config)
      }))
    )
    
    const availableModels = validationResults
      .filter((result): result is PromiseFulfilledResult<{ config: ModelPathConfig; validation: ModelValidationResult }> => 
        result.status === 'fulfilled' && result.value.validation !== null
      )
      .map(result => ({
        config: result.value.config,
        validation: result.value.validation!
      }))
      .sort((a, b) => a.config.priority - b.config.priority)
    
    logger.info(`Found ${availableModels.length} available models`, {
      models: availableModels.map(m => ({ id: m.config.id, path: m.validation.path }))
    })
    
    return availableModels
  }

  /**
   * Create a comprehensive fallback chain
   */
  async createFallbackChain(primaryModelId: string): Promise<string[]> {
    const primaryConfig = AVAILABLE_MODEL_PATHS[primaryModelId]
    if (!primaryConfig) {
      logger.warn(`Primary model ${primaryModelId} not found in configuration`)
      return this.getEmergencyFallbackChain()
    }

    const fallbackChain: string[] = []
    
    // Add primary model
    const primaryResult = await this.validateModel(primaryConfig.path)
    if (primaryResult.exists) {
      fallbackChain.push(primaryConfig.path)
    }
    
    // Add explicit fallbacks
    for (const fallbackPath of primaryConfig.fallbackPaths) {
      const result = await this.validateModel(fallbackPath)
      if (result.exists && !fallbackChain.includes(fallbackPath)) {
        fallbackChain.push(fallbackPath)
      }
    }
    
    // Add emergency fallbacks (optimized models)
    const emergencyFallbacks = [
      '/models/dragon_head_optimized.glb',
      '/models/seiron_optimized.glb'
    ].filter(path => !fallbackChain.includes(path))
    
    for (const emergencyPath of emergencyFallbacks) {
      const result = await this.validateModel(emergencyPath)
      if (result.exists) {
        fallbackChain.push(emergencyPath)
      }
    }
    
    if (fallbackChain.length === 0) {
      logger.error(`No available models found for fallback chain starting with ${primaryModelId}`)
      return this.getEmergencyFallbackChain()
    }
    
    logger.info(`Created fallback chain for ${primaryModelId}:`, { 
      chain: fallbackChain,
      length: fallbackChain.length
    })
    
    return fallbackChain
  }

  /**
   * Get emergency fallback chain (last resort)
   */
  private async getEmergencyFallbackChain(): Promise<string[]> {
    const emergencyModels = [
      '/models/dragon_head_optimized.glb',
      '/models/seiron_optimized.glb',
      '/models/dragon_head.glb',
      '/models/seiron.glb'
    ]
    
    const availableEmergencyModels: string[] = []
    
    for (const path of emergencyModels) {
      const result = await this.validateModel(path)
      if (result.exists) {
        availableEmergencyModels.push(path)
      }
    }
    
    return availableEmergencyModels
  }

  /**
   * Preload validation for a set of models
   */
  async preloadValidations(modelIds: string[]): Promise<void> {
    const paths: string[] = []
    
    modelIds.forEach(id => {
      const config = AVAILABLE_MODEL_PATHS[id]
      if (config) {
        paths.push(config.path, ...config.fallbackPaths)
      }
    })
    
    // Remove duplicates
    const uniquePaths = [...new Set(paths)]
    
    logger.info(`Preloading validations for ${uniquePaths.length} model paths`)
    await this.validateModels(uniquePaths)
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.cache = {}
    logger.info('Model validation cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; validModels: number; invalidModels: number } {
    const entries = Object.values(this.cache)
    return {
      totalEntries: entries.length,
      validModels: entries.filter(e => e.exists).length,
      invalidModels: entries.filter(e => !e.exists).length
    }
  }

  private getCachedResult(path: string): ModelValidationResult | null {
    const cached = this.cache[path]
    if (!cached) return null
    
    const isExpired = Date.now() - cached.lastChecked > this.CACHE_DURATION
    if (isExpired) {
      delete this.cache[path]
      return null
    }
    
    return {
      exists: cached.exists,
      path,
      fileSize: cached.fileSize,
      contentType: cached.contentType,
      loadTime: 0 // Cache hit
    }
  }

  private async performValidation(path: string): Promise<Omit<ModelValidationResult, 'path' | 'loadTime'>> {
    if (this.currentChecks >= this.MAX_CONCURRENT_CHECKS) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    this.currentChecks++
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT)
      
      const response = await fetch(path, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length')
        const contentType = response.headers.get('content-type')
        
        return {
          exists: true,
          fileSize: contentLength ? parseInt(contentLength, 10) : undefined,
          contentType: contentType || undefined
        }
      } else {
        return {
          exists: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          exists: false,
          error: 'Request timeout'
        }
      }
      
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    } finally {
      this.currentChecks--
    }
  }
}

// Utility functions for easy access
export const validateModel = (path: string) => 
  ModelExistenceValidator.getInstance().validateModel(path)

export const validateModels = (paths: string[]) => 
  ModelExistenceValidator.getInstance().validateModels(paths)

export const findAvailableModel = (modelConfig: ModelPathConfig) => 
  ModelExistenceValidator.getInstance().findAvailableModel(modelConfig)

export const getAvailableModels = () => 
  ModelExistenceValidator.getInstance().getAvailableModels()

export const createFallbackChain = (primaryModelId: string) => 
  ModelExistenceValidator.getInstance().createFallbackChain(primaryModelId)

export const preloadValidations = (modelIds: string[]) => 
  ModelExistenceValidator.getInstance().preloadValidations(modelIds)

// Default export for convenience
export default ModelExistenceValidator