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
  httpStatus?: number
  networkErrorType?: 'timeout' | 'cors' | 'dns' | 'unknown'
  detectedMimeType?: string
  serverHeaders?: Record<string, string>
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

  /**
   * Create comprehensive diagnostic report for real-time debugging
   */
  async createDiagnosticReport(): Promise<{
    timestamp: string
    environment: {
      userAgent: string
      currentUrl: string
      isProduction: boolean
      baseUrl: string
    }
    modelValidation: {
      totalModels: number
      availableModels: number
      failedModels: number
      results: ModelValidationResult[]
    }
    networkAnalysis: {
      commonErrors: Array<{ error: string; count: number }>
      httpStatusCodes: Array<{ status: number; count: number }>
      networkErrorTypes: Array<{ type: string; count: number }>
    }
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      category: string
      issue: string
      solution: string
    }>
    debugInfo: {
      cacheStats: { totalEntries: number; validModels: number; invalidModels: number }
      testedPaths: string[]
      serverHeaders: Record<string, Record<string, string>>
    }
  }> {
    const startTime = Date.now()
    
    // Get all model paths to test
    const allPaths = Object.values(AVAILABLE_MODEL_PATHS).flatMap(config => 
      [config.path, ...config.fallbackPaths]
    )
    const uniquePaths = [...new Set(allPaths)]
    
    // Validate all models
    const validationResults = await this.validateModels(uniquePaths)
    
    // Analyze results
    const availableModels = validationResults.filter(r => r.exists)
    const failedModels = validationResults.filter(r => !r.exists)
    
    // Collect common errors
    const errorCounts = new Map<string, number>()
    const statusCounts = new Map<number, number>()
    const networkErrorCounts = new Map<string, number>()
    const serverHeaders: Record<string, Record<string, string>> = {}
    
    validationResults.forEach(result => {
      if (result.error) {
        errorCounts.set(result.error, (errorCounts.get(result.error) || 0) + 1)
      }
      if (result.httpStatus) {
        statusCounts.set(result.httpStatus, (statusCounts.get(result.httpStatus) || 0) + 1)
      }
      if (result.networkErrorType) {
        networkErrorCounts.set(result.networkErrorType, (networkErrorCounts.get(result.networkErrorType) || 0) + 1)
      }
      if (result.serverHeaders) {
        serverHeaders[result.path] = result.serverHeaders
      }
    })
    
    // Generate recommendations
    const recommendations = this.generateDiagnosticRecommendations(validationResults)
    
    // Environment detection
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('192.168')
    const baseUrl = `${window.location.protocol}//${window.location.host}`
    
    return {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        isProduction,
        baseUrl
      },
      modelValidation: {
        totalModels: validationResults.length,
        availableModels: availableModels.length,
        failedModels: failedModels.length,
        results: validationResults
      },
      networkAnalysis: {
        commonErrors: Array.from(errorCounts.entries())
          .map(([error, count]) => ({ error, count }))
          .sort((a, b) => b.count - a.count),
        httpStatusCodes: Array.from(statusCounts.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
        networkErrorTypes: Array.from(networkErrorCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
      },
      recommendations,
      debugInfo: {
        cacheStats: this.getCacheStats(),
        testedPaths: uniquePaths,
        serverHeaders
      }
    }
  }

  private generateDiagnosticRecommendations(results: ModelValidationResult[]): Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    issue: string
    solution: string
  }> {
    const recommendations = []
    const failedResults = results.filter(r => !r.exists)
    const totalResults = results.length
    
    // High priority: Most models failing
    if (failedResults.length > totalResults * 0.8) {
      recommendations.push({
        priority: 'high' as const,
        category: 'deployment',
        issue: `${failedResults.length}/${totalResults} models are failing to load`,
        solution: 'Check deployment configuration - models may not be deployed correctly or server is not serving static files from /models/ path'
      })
    }
    
    // Check for 404 errors specifically
    const not404Errors = failedResults.filter(r => r.httpStatus === 404)
    if (not404Errors.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        category: 'static-files',
        issue: `${not404Errors.length} models returning 404 Not Found`,
        solution: 'Verify models are copied to correct location during build. Check Vite/build configuration for static file handling.'
      })
    }
    
    // Check for CORS issues
    const corsErrors = failedResults.filter(r => r.networkErrorType === 'cors')
    if (corsErrors.length > 0) {
      recommendations.push({
        priority: 'medium' as const,
        category: 'cors',
        issue: `${corsErrors.length} models failing due to CORS issues`,
        solution: 'Configure server CORS headers for model files. Add proper Access-Control-Allow-Origin headers.'
      })
    }
    
    // Check for timeout issues
    const timeoutErrors = failedResults.filter(r => r.networkErrorType === 'timeout')
    if (timeoutErrors.length > 0) {
      recommendations.push({
        priority: 'medium' as const,
        category: 'performance',
        issue: `${timeoutErrors.length} models timing out during load`,
        solution: 'Consider optimizing model file sizes or increasing timeout values. Check server response times.'
      })
    }
    
    // Check for MIME type issues
    const incorrectMimeTypes = results.filter(r => 
      r.exists && r.contentType && !r.contentType.includes('model/') && 
      (r.path.endsWith('.gltf') || r.path.endsWith('.glb'))
    )
    if (incorrectMimeTypes.length > 0) {
      recommendations.push({
        priority: 'low' as const,
        category: 'mime-types',
        issue: `${incorrectMimeTypes.length} models served with incorrect MIME types`,
        solution: 'Configure server to serve .gltf files as model/gltf+json and .glb files as model/gltf-binary'
      })
    }
    
    // Success case
    if (failedResults.length === 0) {
      recommendations.push({
        priority: 'low' as const,
        category: 'success',
        issue: 'All models are loading successfully',
        solution: 'No action needed. Consider implementing preloading for better performance.'
      })
    }
    
    return recommendations
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
      
      // Try HEAD request first for efficiency
      let response = await fetch(path, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'model/gltf-binary, model/gltf+json, application/octet-stream, */*'
        }
      })
      
      clearTimeout(timeoutId)
      
      // Collect server headers for debugging
      const serverHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        serverHeaders[key] = value
      })
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length')
        const contentType = response.headers.get('content-type')
        
        // Detect MIME type based on file extension if server doesn't provide it
        const detectedMimeType = this.detectMimeType(path, contentType)
        
        return {
          exists: true,
          fileSize: contentLength ? parseInt(contentLength, 10) : undefined,
          contentType: contentType || undefined,
          detectedMimeType,
          httpStatus: response.status,
          serverHeaders
        }
      } else {
        // For 404 and other errors, try with GET to see if it's a HEAD-specific issue
        if (response.status === 404 || response.status === 405) {
          try {
            const getResponse = await fetch(path, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'model/gltf-binary, model/gltf+json, application/octet-stream, */*',
                'Range': 'bytes=0-1023' // Only fetch first 1KB for testing
              }
            })
            
            if (getResponse.ok) {
              return {
                exists: true,
                fileSize: parseInt(getResponse.headers.get('content-length') || '0', 10),
                contentType: getResponse.headers.get('content-type') || undefined,
                detectedMimeType: this.detectMimeType(path, getResponse.headers.get('content-type')),
                httpStatus: getResponse.status,
                serverHeaders,
                error: 'HEAD request failed but GET succeeded (server may not support HEAD)'
              }
            }
          } catch (getError) {
            // GET also failed, original error is more relevant
          }
        }
        
        return {
          exists: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          httpStatus: response.status,
          networkErrorType: this.categorizeNetworkError(response.status),
          serverHeaders
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          exists: false,
          error: 'Request timeout',
          networkErrorType: 'timeout'
        }
      }
      
      const networkErrorType = this.categorizeError(error)
      
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Network error',
        networkErrorType
      }
    } finally {
      this.currentChecks--
    }
  }

  private detectMimeType(path: string, serverMimeType?: string | null): string {
    if (serverMimeType) return serverMimeType
    
    if (path.endsWith('.gltf')) return 'model/gltf+json'
    if (path.endsWith('.glb')) return 'model/gltf-binary'
    if (path.endsWith('.bin')) return 'application/octet-stream'
    if (path.endsWith('.obj')) return 'model/obj'
    if (path.endsWith('.png')) return 'image/png'
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
    
    return 'application/octet-stream'
  }

  private categorizeNetworkError(httpStatus: number): 'timeout' | 'cors' | 'dns' | 'unknown' {
    if (httpStatus === 404) return 'dns' // Treating 404 as path resolution issue
    if (httpStatus === 403 || httpStatus === 401) return 'cors'
    if (httpStatus >= 500) return 'dns' // Server errors
    return 'unknown'
  }

  private categorizeError(error: unknown): 'timeout' | 'cors' | 'dns' | 'unknown' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('timeout') || message.includes('aborted')) return 'timeout'
      if (message.includes('cors') || message.includes('cross-origin')) return 'cors'
      if (message.includes('network') || message.includes('fetch')) return 'dns'
    }
    return 'unknown'
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

export const createDiagnosticReport = () => 
  ModelExistenceValidator.getInstance().createDiagnosticReport()

// Default export for convenience
export default ModelExistenceValidator