import * as THREE from 'three'

// CRITICAL FIX: State tracking for WebGL recovery coordination
interface DisposalState {
  isDisposing: boolean
  lastDisposalTime: number
  disposalCount: number
  activeDisposals: Set<string>
}

interface WebGLRecoveryHooks {
  onContextLoss?: () => void
  onContextRestore?: () => void
  onRecoveryStart?: () => void
  onRecoveryComplete?: () => void
}

export class DragonMemoryManager {
  private static instance: DragonMemoryManager
  private loadedModels: Map<string, THREE.Group> = new Map()
  private textureCache: Map<string, THREE.Texture> = new Map()
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map()
  
  // CRITICAL FIX: Add disposal state tracking for coordination
  private disposalState: DisposalState = {
    isDisposing: false,
    lastDisposalTime: 0,
    disposalCount: 0,
    activeDisposals: new Set()
  }
  
  // CRITICAL FIX: WebGL recovery coordination hooks
  private webglRecoveryHooks: WebGLRecoveryHooks = {}
  private isWebGLContextLost = false
  private isInRecovery = false

  private constructor() {}

  static getInstance(): DragonMemoryManager {
    if (!DragonMemoryManager.instance) {
      DragonMemoryManager.instance = new DragonMemoryManager()
    }
    return DragonMemoryManager.instance
  }
  
  // CRITICAL FIX: WebGL recovery coordination methods
  setWebGLRecoveryHooks(hooks: WebGLRecoveryHooks): void {
    this.webglRecoveryHooks = { ...this.webglRecoveryHooks, ...hooks }
    console.log('🔗 DragonMemoryManager: WebGL recovery hooks configured')
  }
  
  notifyWebGLContextLost(): void {
    console.log('🔴 DragonMemoryManager: WebGL context lost notification received')
    this.isWebGLContextLost = true
    
    // Pause any ongoing disposal operations
    if (this.disposalState.isDisposing) {
      console.warn('⚠️ DragonMemoryManager: Pausing disposal due to WebGL context loss')
    }
    
    // Call hook if registered
    if (this.webglRecoveryHooks.onContextLoss) {
      this.webglRecoveryHooks.onContextLoss()
    }
  }
  
  notifyWebGLContextRestored(): void {
    console.log('🟢 DragonMemoryManager: WebGL context restored notification received')
    this.isWebGLContextLost = false
    
    // Call hook if registered
    if (this.webglRecoveryHooks.onContextRestore) {
      this.webglRecoveryHooks.onContextRestore()
    }
  }
  
  notifyWebGLRecoveryStart(): void {
    console.log('🔄 DragonMemoryManager: WebGL recovery started')
    this.isInRecovery = true
    
    // Call hook if registered
    if (this.webglRecoveryHooks.onRecoveryStart) {
      this.webglRecoveryHooks.onRecoveryStart()
    }
  }
  
  notifyWebGLRecoveryComplete(): void {
    console.log('✅ DragonMemoryManager: WebGL recovery completed')
    this.isInRecovery = false
    
    // Call hook if registered
    if (this.webglRecoveryHooks.onRecoveryComplete) {
      this.webglRecoveryHooks.onRecoveryComplete()
    }
  }
  
  // CRITICAL FIX: Get disposal state for coordination
  getDisposalState(): DisposalState & { isWebGLContextLost: boolean; isInRecovery: boolean } {
    return {
      ...this.disposalState,
      isWebGLContextLost: this.isWebGLContextLost,
      isInRecovery: this.isInRecovery
    }
  }
  
  // CRITICAL FIX: Safe disposal check - prevents disposal during WebGL recovery
  private canSafelyDispose(resourceId: string): boolean {
    if (this.isWebGLContextLost && !this.isInRecovery) {
      console.warn(`⚠️ DragonMemoryManager: Deferring disposal of ${resourceId} - WebGL context lost`)
      return false
    }
    
    if (this.disposalState.activeDisposals.has(resourceId)) {
      console.warn(`⚠️ DragonMemoryManager: Resource ${resourceId} already being disposed`)
      return false
    }
    
    return true
  }

  // Cache and retrieve models
  cacheModel(path: string, model: THREE.Group): void {
    if (this.loadedModels.has(path)) {
      this.disposeModel(this.loadedModels.get(path)!)
    }
    this.loadedModels.set(path, model)
  }

  getCachedModel(path: string): THREE.Group | null {
    return this.loadedModels.get(path) || null
  }

  // Cache and retrieve textures
  cacheTexture(path: string, texture: THREE.Texture): void {
    if (this.textureCache.has(path)) {
      this.textureCache.get(path)!.dispose()
    }
    this.textureCache.set(path, texture)
  }

  getCachedTexture(path: string): THREE.Texture | null {
    return this.textureCache.get(path) || null
  }

  // Cache and retrieve geometries
  cacheGeometry(key: string, geometry: THREE.BufferGeometry): void {
    if (this.geometryCache.has(key)) {
      this.geometryCache.get(key)!.dispose()
    }
    this.geometryCache.set(key, geometry)
  }

  getCachedGeometry(key: string): THREE.BufferGeometry | null {
    return this.geometryCache.get(key) || null
  }

  // CRITICAL FIX: Enhanced model disposal with WebGL recovery coordination
  disposeModel(model: THREE.Group): void {
    const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      if (!model) {
        console.warn('DragonMemoryManager: Attempted to dispose null/undefined model')
        return
      }
      
      // CRITICAL FIX: Check if disposal is safe during WebGL operations
      if (!this.canSafelyDispose(modelId)) {
        console.warn('DragonMemoryManager: Deferring model disposal due to unsafe conditions')
        // Could implement a queue here for deferred disposals
        return
      }
      
      // Mark disposal as active
      this.disposalState.activeDisposals.add(modelId)
      this.disposalState.isDisposing = true
      this.disposalState.lastDisposalTime = Date.now()
      this.disposalState.disposalCount++

      model.traverse((child) => {
        try {
          if (child instanceof THREE.Mesh) {
            // Dispose of geometry with null checks
            if (child.geometry && typeof child.geometry.dispose === 'function') {
              child.geometry.dispose()
            }
            
            // Dispose of materials with null checks
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  if (material) {
                    this.disposeMaterial(material)
                  }
                })
              } else {
                this.disposeMaterial(child.material)
              }
            }
          }
          
          // Dispose of lights with error handling
          if (child instanceof THREE.Light) {
            try {
              if ('dispose' in child && typeof (child as any).dispose === 'function') {
                (child as any).dispose()
              }
            } catch (lightError) {
              console.warn('Error disposing light:', lightError)
            }
          }
          
          // Dispose of cameras with error handling
          if (child instanceof THREE.Camera) {
            try {
              // Cameras don't have dispose method, but clear references
              if (child.parent) {
                child.parent = null
              }
            } catch (cameraError) {
              console.warn('Error clearing camera references:', cameraError)
            }
          }
        } catch (childError) {
          console.warn('Error disposing child object:', childError)
        }
      })
      
      // Clear the model with error handling
      try {
        if (typeof model.clear === 'function') {
          model.clear()
        }
      } catch (clearError) {
        console.warn('Error clearing model:', clearError)
      }
      
      // Remove from parent if it has one with error handling
      try {
        if (model.parent && typeof model.parent.remove === 'function') {
          model.parent.remove(model)
        }
      } catch (parentError) {
        console.warn('Error removing model from parent:', parentError)
      }
    } catch (error) {
      console.error('Critical error in disposeModel:', error)
    } finally {
      // CRITICAL FIX: Always clean up disposal state
      this.disposalState.activeDisposals.delete(modelId)
      
      // Check if all disposals are complete
      if (this.disposalState.activeDisposals.size === 0) {
        this.disposalState.isDisposing = false
        console.log('🧹 DragonMemoryManager: All model disposals completed')
      }
    }
  }

  // CRITICAL FIX: Enhanced material disposal with comprehensive texture cleanup
  private disposeMaterial(material: THREE.Material): void {
    try {
      if (!material) {
        console.warn('DragonMemoryManager: Attempted to dispose null/undefined material')
        return
      }

      const materialAny = material as any
      
      // Dispose of all possible texture properties
      const textureProps = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 
        'bumpMap', 'displacementMap', 'aoMap', 'lightMap', 'alphaMap', 
        'envMap', 'gradientMap', 'specularMap', 'matcap', 'clearcoatMap', 
        'clearcoatNormalMap', 'clearcoatRoughnessMap', 'iridescenceMap', 
        'iridescenceThicknessMap', 'sheenColorMap', 'sheenRoughnessMap', 
        'transmissionMap', 'thicknessMap', 'anisotropyMap'
      ]
      
      textureProps.forEach(prop => {
        try {
          if (materialAny[prop] && typeof materialAny[prop].dispose === 'function') {
            materialAny[prop].dispose()
            materialAny[prop] = null
          }
        } catch (textureError) {
          console.warn(`Error disposing texture property ${prop}:`, textureError)
        }
      })
      
      // Dispose of the material itself with error handling
      try {
        if (typeof material.dispose === 'function') {
          material.dispose()
        }
      } catch (materialError) {
        console.warn('Error disposing material:', materialError)
      }
    } catch (error) {
      console.error('Critical error in disposeMaterial:', error)
    }
  }

  // Clean up unused models
  cleanupUnusedModels(activeModels: string[]): void {
    const modelsToRemove: string[] = []
    
    this.loadedModels.forEach((model, path) => {
      if (!activeModels.includes(path)) {
        this.disposeModel(model)
        modelsToRemove.push(path)
      }
    })
    
    modelsToRemove.forEach(path => {
      this.loadedModels.delete(path)
    })
  }

  // Clean up unused textures
  cleanupUnusedTextures(activeTextures: string[]): void {
    const texturesToRemove: string[] = []
    
    this.textureCache.forEach((texture, path) => {
      if (!activeTextures.includes(path)) {
        texture.dispose()
        texturesToRemove.push(path)
      }
    })
    
    texturesToRemove.forEach(path => {
      this.textureCache.delete(path)
    })
  }

  // Clean up unused geometries
  cleanupUnusedGeometries(activeGeometries: string[]): void {
    const geometriesToRemove: string[] = []
    
    this.geometryCache.forEach((geometry, key) => {
      if (!activeGeometries.includes(key)) {
        geometry.dispose()
        geometriesToRemove.push(key)
      }
    })
    
    geometriesToRemove.forEach(key => {
      this.geometryCache.delete(key)
    })
  }

  // CRITICAL FIX: Complete cleanup with WebGL recovery coordination and memory tracking
  dispose(): void {
    console.log('🧹 DragonMemoryManager disposing all resources')
    
    // CRITICAL FIX: Check if disposal is safe during WebGL operations
    if (this.isWebGLContextLost && !this.isInRecovery) {
      console.warn('⚠️ DragonMemoryManager: Deferring complete disposal - WebGL context lost')
      return
    }
    
    // CRITICAL FIX: Prevent concurrent disposal operations
    if (this.disposalState.isDisposing) {
      console.warn('⚠️ DragonMemoryManager: Disposal already in progress, skipping')
      return
    }
    
    this.disposalState.isDisposing = true
    const beforeStats = this.getMemoryStats()
    console.log('Before disposal:', beforeStats)
    
    try {
      // Dispose models with coordination
      const modelDisposalPromises = Array.from(this.loadedModels.entries()).map(([path, model]) => {
        return new Promise<void>((resolve) => {
          try {
            this.disposeModel(model)
            this.loadedModels.delete(path)
            resolve()
          } catch (error) {
            console.warn(`Error disposing model ${path}:`, error)
            resolve() // Continue with other disposals
          }
        })
      })
      
      // Wait for all model disposals with timeout
      Promise.allSettled(modelDisposalPromises).then(() => {
        console.log('🧹 All model disposals completed')
      }).catch(error => {
        console.warn('Some model disposals failed:', error)
      })
      
      // Dispose textures with error handling
      this.textureCache.forEach((texture, path) => {
        try {
          if (texture && typeof texture.dispose === 'function') {
            texture.dispose()
          }
        } catch (error) {
          console.warn(`Error disposing texture ${path}:`, error)
        }
      })
      
      // Dispose geometries with error handling
      this.geometryCache.forEach((geometry, key) => {
        try {
          if (geometry && typeof geometry.dispose === 'function') {
            geometry.dispose()
          }
        } catch (error) {
          console.warn(`Error disposing geometry ${key}:`, error)
        }
      })
      
      // Clear all caches
      this.loadedModels.clear()
      this.textureCache.clear()
      this.geometryCache.clear()
      
      // Reset disposal state
      this.disposalState = {
        isDisposing: false,
        lastDisposalTime: Date.now(),
        disposalCount: this.disposalState.disposalCount + 1,
        activeDisposals: new Set()
      }
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
      }
      
      console.log('🧹 DragonMemoryManager disposal complete')
      
    } catch (error) {
      console.error('Critical error in disposal:', error)
      // Ensure disposal state is reset even on error
      this.disposalState.isDisposing = false
    }
  }

  // CRITICAL FIX: Enhanced memory statistics with race condition protection
  private isCalculatingStats = false
  
  // CRITICAL FIX: Safe property access utility to prevent TypeError  
  private safePropertyAccess(obj: any, path: string, fallback: any, context: string = ''): any {
    try {
      if (obj === null || obj === undefined) {
        return fallback
      }
      
      const keys = path.split('.')
      let current = obj
      
      for (const key of keys) {
        if (current === null || current === undefined || !(key in current)) {
          return fallback
        }
        current = current[key]
      }
      
      return current
    } catch (error) {
      console.warn(`DragonMemoryManager: Safe property access failed for ${context}: ${path}`, error)
      return fallback
    }
  }

  // Get memory usage statistics with comprehensive error handling
  getMemoryStats(): {
    modelsCount: number
    texturesCount: number
    geometriesCount: number
    estimatedMemoryUsage: number
  } {
    // CRITICAL FIX: Prevent race conditions with disposal operations
    if (this.isCalculatingStats) {
      console.warn('DragonMemoryManager: getMemoryStats already in progress, skipping to prevent race condition')
      return {
        modelsCount: this.loadedModels.size,
        texturesCount: this.textureCache.size,
        geometriesCount: this.geometryCache.size,
        estimatedMemoryUsage: 0
      }
    }
    
    this.isCalculatingStats = true
    let estimatedMemoryUsage = 0
    
    try {
      // CRITICAL FIX: Comprehensive null checks and error handling for geometry cache
      this.geometryCache.forEach((geometry, key) => {
        try {
          // Multiple layers of null checking
          if (!geometry) {
            console.warn(`DragonMemoryManager: Null geometry found in cache for key: ${key}`)
            return
          }
          
          if (!geometry.attributes) {
            console.warn(`DragonMemoryManager: Geometry missing attributes for key: ${key}`)
            return
          }
          
          // Check if geometry is disposed
          if ('disposed' in geometry && geometry.disposed) {
            console.warn(`DragonMemoryManager: Found disposed geometry in cache for key: ${key}`)
            return
          }
          
          const position = geometry.attributes.position
          const normal = geometry.attributes.normal
          const uv = geometry.attributes.uv
          
          // CRITICAL FIX: Enhanced null checks with type validation for BufferAttribute
          if (position && 
              typeof position === 'object' && 
              'count' in position && 
              typeof position.count === 'number' && 
              position.count > 0) {
            estimatedMemoryUsage += position.count * 3 * 4 // 3 floats per position
          }
          
          if (normal && 
              typeof normal === 'object' && 
              'count' in normal && 
              typeof normal.count === 'number' && 
              normal.count > 0) {
            estimatedMemoryUsage += normal.count * 3 * 4 // 3 floats per normal
          }
          
          if (uv && 
              typeof uv === 'object' && 
              'count' in uv && 
              typeof uv.count === 'number' && 
              uv.count > 0) {
            estimatedMemoryUsage += uv.count * 2 * 4 // 2 floats per UV
          }
        } catch (geometryError) {
          console.warn(`DragonMemoryManager: Error processing geometry ${key}:`, geometryError)
        }
      })
      
      // CRITICAL FIX: Enhanced null checks for texture cache
      this.textureCache.forEach((texture, key) => {
        try {
          if (!texture) {
            console.warn(`DragonMemoryManager: Null texture found in cache for key: ${key}`)
            return
          }
          
          // Check if texture is disposed
          if ('disposed' in texture && texture.disposed) {
            console.warn(`DragonMemoryManager: Found disposed texture in cache for key: ${key}`)
            return
          }
          
          // CRITICAL FIX: Safe texture size calculation with comprehensive null checks
          const image = this.safePropertyAccess(texture, 'image', null, `texture ${key}`)
          const width = this.safePropertyAccess(image, 'width', 
            this.safePropertyAccess(image, 'naturalWidth', 256, `texture ${key} naturalWidth`), 
            `texture ${key} width`)
          const height = this.safePropertyAccess(image, 'height',
            this.safePropertyAccess(image, 'naturalHeight', 256, `texture ${key} naturalHeight`),
            `texture ${key} height`)
          
          // Validate dimensions are reasonable
          if (typeof width === 'number' && typeof height === 'number' && 
              width > 0 && height > 0 && width <= 8192 && height <= 8192) {
            estimatedMemoryUsage += width * height * 4 // RGBA
          } else {
            console.warn(`DragonMemoryManager: Invalid texture dimensions for key: ${key}`, { width, height })
            estimatedMemoryUsage += 256 * 256 * 4 // fallback size
          }
        } catch (textureError) {
          console.warn(`DragonMemoryManager: Error processing texture ${key}:`, textureError)
        }
      })
      
    } catch (error) {
      console.error('DragonMemoryManager: Critical error in getMemoryStats:', error)
      estimatedMemoryUsage = 0
    } finally {
      this.isCalculatingStats = false
    }
    
    const stats = {
      modelsCount: this.loadedModels.size,
      texturesCount: this.textureCache.size,
      geometriesCount: this.geometryCache.size,
      estimatedMemoryUsage
    }
    
    // Validate stats before returning
    if (typeof stats.estimatedMemoryUsage !== 'number' || 
        stats.estimatedMemoryUsage < 0 || 
        !isFinite(stats.estimatedMemoryUsage)) {
      console.warn('DragonMemoryManager: Invalid memory usage calculated, resetting to 0')
      stats.estimatedMemoryUsage = 0
    }
    
    return stats
  }
}