/**
 * ModelCacheService - Centralized model loading and caching
 * 
 * This service prevents duplicate model loading requests and provides
 * intelligent caching to avoid ERR_ABORTED errors from concurrent requests.
 */

import { GLTFLoader } from 'three-stdlib'
import { OBJLoader } from 'three-stdlib'
import * as THREE from 'three'
import { logger } from '@lib/logger'

export type ModelFormat = 'glb' | 'gltf' | 'obj'
export type ModelLoadState = 'idle' | 'loading' | 'loaded' | 'error'

interface ModelCacheEntry {
  state: ModelLoadState
  model?: THREE.Object3D | THREE.Group
  error?: Error
  loadPromise?: Promise<THREE.Object3D | THREE.Group>
  loadStartTime?: number
  lastAccessTime: number
  accessCount: number
}

interface ModelLoadOptions {
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  priority?: 'low' | 'medium' | 'high'
}

export class ModelCacheService {
  private static instance: ModelCacheService
  private cache = new Map<string, ModelCacheEntry>()
  private loaders = {
    glb: new GLTFLoader(),
    gltf: new GLTFLoader(),
    obj: new OBJLoader()
  }
  private loadQueue: Array<{ url: string; options: ModelLoadOptions; resolve: Function; reject: Function }> = []
  private activeLoads = new Set<string>()
  private maxConcurrentLoads = 3
  private maxCacheSize = 20
  private defaultTimeout = 10000 // 10 seconds
  
  static getInstance(): ModelCacheService {
    if (!ModelCacheService.instance) {
      ModelCacheService.instance = new ModelCacheService()
    }
    return ModelCacheService.instance
  }

  /**
   * Load a model with caching and request deduplication
   */
  async loadModel(url: string, options: ModelLoadOptions = {}): Promise<THREE.Object3D | THREE.Group> {
    const normalizedUrl = this.normalizeUrl(url)
    const cacheEntry = this.cache.get(normalizedUrl)
    
    // Update access time and count
    if (cacheEntry) {
      cacheEntry.lastAccessTime = Date.now()
      cacheEntry.accessCount++
    }

    // Return cached model if available
    if (cacheEntry?.state === 'loaded' && cacheEntry.model) {
      logger.debug(`Model cache hit: ${normalizedUrl}`)
      return cacheEntry.model.clone()
    }

    // Return existing load promise if currently loading
    if (cacheEntry?.state === 'loading' && cacheEntry.loadPromise) {
      logger.debug(`Model load in progress: ${normalizedUrl}`)
      return cacheEntry.loadPromise.then(model => model.clone())
    }

    // Return cached error if previously failed
    if (cacheEntry?.state === 'error' && cacheEntry.error) {
      throw cacheEntry.error
    }

    // Start new load
    return this.startNewLoad(normalizedUrl, options)
  }

  /**
   * Preload a model without waiting for completion
   */
  preloadModel(url: string, options: ModelLoadOptions = {}): void {
    const normalizedUrl = this.normalizeUrl(url)
    const cacheEntry = this.cache.get(normalizedUrl)
    
    // Skip if already loaded or loading
    if (cacheEntry?.state === 'loaded' || cacheEntry?.state === 'loading') {
      return
    }

    // Start preload with low priority
    this.loadModel(normalizedUrl, { ...options, priority: 'low' }).catch(error => {
      logger.warn(`Model preload failed: ${normalizedUrl}`, error)
    })
  }

  /**
   * Get model load state
   */
  getModelState(url: string): ModelLoadState {
    const normalizedUrl = this.normalizeUrl(url)
    return this.cache.get(normalizedUrl)?.state || 'idle'
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(url: string): boolean {
    return this.getModelState(url) === 'loaded'
  }

  /**
   * Clear specific model from cache
   */
  clearModel(url: string): void {
    const normalizedUrl = this.normalizeUrl(url)
    const entry = this.cache.get(normalizedUrl)
    
    if (entry?.model) {
      // Dispose model resources
      this.disposeModel(entry.model)
    }
    
    this.cache.delete(normalizedUrl)
    logger.debug(`Model cleared from cache: ${normalizedUrl}`)
  }

  /**
   * Clear all models from cache
   */
  clearAllModels(): void {
    for (const [url, entry] of this.cache.entries()) {
      if (entry.model) {
        this.disposeModel(entry.model)
      }
    }
    this.cache.clear()
    this.activeLoads.clear()
    this.loadQueue.length = 0
    logger.debug('All models cleared from cache')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      loadedModels: 0,
      loadingModels: 0,
      errorModels: 0,
      activeLoads: this.activeLoads.size,
      queuedLoads: this.loadQueue.length,
      memoryUsage: 0
    }

    for (const entry of this.cache.values()) {
      switch (entry.state) {
        case 'loaded':
          stats.loadedModels++
          break
        case 'loading':
          stats.loadingModels++
          break
        case 'error':
          stats.errorModels++
          break
      }
      
      // Estimate memory usage (rough calculation)
      if (entry.model) {
        stats.memoryUsage += this.estimateModelSize(entry.model)
      }
    }

    return stats
  }

  private async startNewLoad(url: string, options: ModelLoadOptions): Promise<THREE.Object3D | THREE.Group> {
    // Create cache entry
    const cacheEntry: ModelCacheEntry = {
      state: 'loading',
      lastAccessTime: Date.now(),
      accessCount: 1,
      loadStartTime: Date.now()
    }
    this.cache.set(url, cacheEntry)

    // Check if we need to queue this load
    if (this.activeLoads.size >= this.maxConcurrentLoads) {
      return new Promise((resolve, reject) => {
        this.loadQueue.push({ url, options, resolve, reject })
      })
    }

    // Start immediate load
    const loadPromise = this.performLoad(url, options)
    cacheEntry.loadPromise = loadPromise

    try {
      const model = await loadPromise
      cacheEntry.state = 'loaded'
      cacheEntry.model = model
      delete cacheEntry.loadPromise
      
      logger.debug(`Model loaded successfully: ${url}`)
      
      // Process queue
      this.processLoadQueue()
      
      // Check cache size and evict if necessary
      this.evictCacheIfNeeded()
      
      return model.clone()
    } catch (error) {
      cacheEntry.state = 'error'
      cacheEntry.error = error as Error
      delete cacheEntry.loadPromise
      
      logger.error(`Model load failed: ${url}`, error)
      
      // Process queue
      this.processLoadQueue()
      
      throw error
    }
  }

  private async performLoad(url: string, options: ModelLoadOptions): Promise<THREE.Object3D | THREE.Group> {
    this.activeLoads.add(url)
    
    try {
      const format = this.getModelFormat(url)
      const loader = this.loaders[format]
      const timeout = options.timeout || this.defaultTimeout
      
      if (!loader) {
        throw new Error(`Unsupported model format: ${format}`)
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Model load timeout: ${url}`)), timeout)
      })

      // Create load promise
      const loadPromise = new Promise<THREE.Object3D | THREE.Group>((resolve, reject) => {
        if (format === 'glb' || format === 'gltf') {
          (loader as GLTFLoader).load(
            url,
            (gltf) => resolve(gltf.scene),
            (progress) => {
              logger.debug(`Loading progress for ${url}:`, progress)
            },
            (error) => reject(error)
          )
        } else if (format === 'obj') {
          (loader as OBJLoader).load(
            url,
            (obj) => resolve(obj),
            (progress) => {
              logger.debug(`Loading progress for ${url}:`, progress)
            },
            (error) => reject(error)
          )
        }
      })

      // Race between load and timeout
      return await Promise.race([loadPromise, timeoutPromise])
    } finally {
      this.activeLoads.delete(url)
    }
  }

  private processLoadQueue(): void {
    while (this.loadQueue.length > 0 && this.activeLoads.size < this.maxConcurrentLoads) {
      const queuedLoad = this.loadQueue.shift()
      if (queuedLoad) {
        const { url, options, resolve, reject } = queuedLoad
        this.performLoad(url, options)
          .then(model => {
            const cacheEntry = this.cache.get(url)
            if (cacheEntry) {
              cacheEntry.state = 'loaded'
              cacheEntry.model = model
            }
            resolve(model.clone())
          })
          .catch(error => {
            const cacheEntry = this.cache.get(url)
            if (cacheEntry) {
              cacheEntry.state = 'error'
              cacheEntry.error = error
            }
            reject(error)
          })
      }
    }
  }

  private evictCacheIfNeeded(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return
    }

    // Sort by last access time (LRU)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessTime - b.lastAccessTime)

    // Remove oldest entries
    const entriesToRemove = entries.slice(0, Math.ceil(this.cache.size * 0.2))
    
    for (const [url, entry] of entriesToRemove) {
      if (entry.model) {
        this.disposeModel(entry.model)
      }
      this.cache.delete(url)
    }

    logger.debug(`Evicted ${entriesToRemove.length} models from cache`)
  }

  private normalizeUrl(url: string): string {
    // Remove query parameters and fragments
    return url.split('?')[0].split('#')[0]
  }

  private getModelFormat(url: string): ModelFormat {
    const extension = url.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'glb':
        return 'glb'
      case 'gltf':
        return 'gltf'
      case 'obj':
        return 'obj'
      default:
        throw new Error(`Unknown model format: ${extension}`)
    }
  }

  private disposeModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
    })
  }

  private estimateModelSize(model: THREE.Object3D): number {
    let size = 0
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          // Rough estimate based on vertex count
          const positions = child.geometry.attributes.position
          if (positions) {
            size += positions.count * positions.itemSize * 4 // 4 bytes per float
          }
        }
      }
    })
    
    return size
  }
}

// React hook for using the model cache service
export function useModelCache() {
  const service = ModelCacheService.getInstance()
  
  return {
    loadModel: service.loadModel.bind(service),
    preloadModel: service.preloadModel.bind(service),
    getModelState: service.getModelState.bind(service),
    isModelLoaded: service.isModelLoaded.bind(service),
    clearModel: service.clearModel.bind(service),
    clearAllModels: service.clearAllModels.bind(service),
    getCacheStats: service.getCacheStats.bind(service)
  }
}

export default ModelCacheService