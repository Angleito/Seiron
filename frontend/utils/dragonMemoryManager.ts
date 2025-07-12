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
  
  // CRITICAL FIX: Global error boundary for any unexpected property access
  private safePropertyAccess<T>(obj: any, propertyPath: string, fallback: T, context?: string): T {
    try {
      if (!obj || typeof obj !== 'object') {
        console.warn(`DragonMemoryManager: Invalid object for property access '${propertyPath}' in ${context || 'unknown context'}`);
        return fallback;
      }
      
      const keys = propertyPath.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          console.warn(`DragonMemoryManager: Null/undefined encountered at '${key}' in path '${propertyPath}' in ${context || 'unknown context'}`);
          return fallback;
        }
        
        if (!(key in current)) {
          console.warn(`DragonMemoryManager: Property '${key}' not found in path '${propertyPath}' in ${context || 'unknown context'}`);
          return fallback;
        }
        
        current = current[key];
      }
      
      return current as T;
    } catch (error) {
      console.warn(`DragonMemoryManager: Error accessing property '${propertyPath}' in ${context || 'unknown context'}:`, error);
      return fallback;
    }
  }
  
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
  
  // Queue for deferred disposal when WebGL context is unsafe
  private deferredDisposalQueue: Array<{
    type: 'model' | 'texture' | 'geometry'
    resource: any
    priority: number
    timestamp: number
  }> = []
  
  // Queue for batch disposal optimization
  private batchDisposalQueue: Array<{
    type: 'model' | 'texture' | 'geometry'
    resource: any
    priority: number
    timestamp: number
  }> = []
  
  private batchDisposalTimer: NodeJS.Timeout | null = null

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

  // Enhanced model disposal with optimized batch coordination
  disposeModel(model: THREE.Group, priority: number = 0.5): void {
    const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      if (!model) {
        console.warn('DragonMemoryManager: Attempted to dispose null/undefined model')
        return
      }
      
      // Check if disposal is safe during WebGL operations
      if (!this.canSafelyDispose(modelId)) {
        console.warn('DragonMemoryManager: Deferring model disposal due to unsafe conditions')
        // Queue for later disposal instead of skipping
        this.queueDeferredDisposal('model', model, priority)
        return
      }
      
      // Optimized batch disposal for better performance
      if (priority < 0.8) {
        this.queueBatchDisposal('model', model, priority)
        return
      }
      
      // Immediate disposal for high priority items
      this.performModelDisposal(model, modelId)
      
    } catch (error) {
      console.error('Critical error in disposeModel:', error)
    }
  }
  
  /**
   * Queue disposal for later when conditions are unsafe
   */
  private queueDeferredDisposal(type: 'model' | 'texture' | 'geometry', resource: any, priority: number): void {
    if (!this.deferredDisposalQueue) {
      this.deferredDisposalQueue = []
    }
    
    this.deferredDisposalQueue.push({
      type,
      resource,
      priority,
      timestamp: Date.now()
    })
    
    // Limit queue size to prevent memory leaks
    if (this.deferredDisposalQueue.length > 50) {
      console.warn('DragonMemoryManager: Deferred disposal queue is full, forcing oldest disposal')
      const oldest = this.deferredDisposalQueue.shift()
      if (oldest) {
        this.forceDisposal(oldest.type, oldest.resource)
      }
    }
  }
  
  /**
   * Queue disposal for batch processing
   */
  private queueBatchDisposal(type: 'model' | 'texture' | 'geometry', resource: any, priority: number): void {
    if (!this.batchDisposalQueue) {
      this.batchDisposalQueue = []
    }
    
    this.batchDisposalQueue.push({
      type,
      resource,
      priority,
      timestamp: Date.now()
    })
    
    // Start batch timer if not already running
    if (!this.batchDisposalTimer) {
      this.batchDisposalTimer = setTimeout(() => {
        this.processBatchDisposals()
      }, 100) // Small delay to batch multiple operations
    }
  }
  
  /**
   * Process batch disposals for optimal performance
   */
  private processBatchDisposals(): void {
    if (!this.batchDisposalQueue || this.batchDisposalQueue.length === 0) {
      this.batchDisposalTimer = null
      return
    }
    
    const batchStart = performance.now()
    console.log(`[DragonMemoryManager] Processing batch disposal of ${this.batchDisposalQueue.length} items`)
    
    // Sort by priority (higher first)
    this.batchDisposalQueue.sort((a, b) => b.priority - a.priority)
    
    const itemsToProcess = [...this.batchDisposalQueue]
    this.batchDisposalQueue = []
    this.batchDisposalTimer = null
    
    let processedCount = 0
    let errorCount = 0
    
    for (const item of itemsToProcess) {
      try {
        this.forceDisposal(item.type, item.resource)
        processedCount++
      } catch (error) {
        errorCount++
        console.warn(`DragonMemoryManager: Batch disposal error for ${item.type}:`, error)
      }
    }
    
    const batchTime = performance.now() - batchStart
    const efficiency = processedCount / (processedCount + errorCount)
    
    console.log(`[DragonMemoryManager] Batch disposal completed: ${processedCount} items in ${batchTime.toFixed(2)}ms (efficiency: ${(efficiency * 100).toFixed(1)}%)`)
  }
  
  /**
   * Force disposal regardless of safety checks (for cleanup)
   */
  private forceDisposal(type: 'model' | 'texture' | 'geometry', resource: any): void {
    try {
      switch (type) {
        case 'model':
          const modelId = `force_${Date.now()}`
          this.performModelDisposal(resource, modelId)
          break
        case 'texture':
          if (resource && typeof resource.dispose === 'function') {
            resource.dispose()
          }
          break
        case 'geometry':
          if (resource && typeof resource.dispose === 'function') {
            resource.dispose()
          }
          break
      }
    } catch (error) {
      console.warn(`DragonMemoryManager: Error in force disposal of ${type}:`, error)
    }
  }
  
  /**
   * Perform actual model disposal with tracking
   */
  private performModelDisposal(model: THREE.Group, modelId: string): void {
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
          const textureProperty = materialAny[prop];
          // CRITICAL FIX: Enhanced null checking for texture properties
          if (textureProperty && 
              typeof textureProperty === 'object' && 
              textureProperty !== null &&
              'dispose' in textureProperty &&
              typeof textureProperty.dispose === 'function') {
            textureProperty.dispose()
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

  // Clean up unused models with priority-based disposal
  cleanupUnusedModels(activeModels: string[], priority: number = 0.3): void {
    const modelsToRemove: string[] = []
    
    this.loadedModels.forEach((model, path) => {
      if (!activeModels.includes(path)) {
        this.disposeModel(model, priority) // Use priority-based disposal
        modelsToRemove.push(path)
      }
    })
    
    modelsToRemove.forEach(path => {
      this.loadedModels.delete(path)
    })
    
    if (modelsToRemove.length > 0) {
      console.log(`[DragonMemoryManager] Queued cleanup of ${modelsToRemove.length} unused models`)
    }
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
  
  // CRITICAL FIX: SafeBufferAttributeInspector utility for bulletproof attribute access
  private safeGetAttributeMemory(attribute: any, name: string): number {
    try {
      // Multiple layers of validation
      if (!attribute) {
        console.warn(`DragonMemoryManager: Null attribute: ${name}`);
        return 0;
      }
      
      // Check if attribute has required properties
      if (typeof attribute !== 'object') {
        console.warn(`DragonMemoryManager: Invalid attribute type for ${name}:`, typeof attribute);
        return 0;
      }
      
      // Safe count access using the global property accessor
      const count = this.safePropertyAccess(attribute, 'count', 0, `attribute ${name}`);
      if (typeof count !== 'number' || count <= 0 || !isFinite(count) || count > 1000000) {
        console.warn(`DragonMemoryManager: Invalid count for ${name}:`, count);
        return 0;
      }
      
      // Safe array access using the global property accessor
      const arrayObj = this.safePropertyAccess(attribute, 'array', null, `attribute ${name}`);
      if (arrayObj && typeof arrayObj === 'object') {
        const arrayLength = this.safePropertyAccess(arrayObj, 'length', 0, `attribute ${name} array`);
        if (typeof arrayLength === 'number' && arrayLength >= 0 && isFinite(arrayLength) && arrayLength <= 10000000) {
          // Calculate based on common attribute patterns
          if (name === 'position' || name === 'normal') {
            return count * 3 * 4; // 3 floats per vertex
          } else if (name === 'uv') {
            return count * 2 * 4; // 2 floats per UV
          } else {
            // Default calculation for other attributes
            return Math.min(arrayLength * 4, count * 4 * 4); // Conservative estimate
          }
        } else {
          console.warn(`DragonMemoryManager: Invalid array length for ${name}:`, arrayLength);
        }
      }
      
      // Fallback calculation based on count only
      if (name === 'position' || name === 'normal') {
        return count * 3 * 4; // 3 floats per vertex
      } else if (name === 'uv') {
        return count * 2 * 4; // 2 floats per UV
      } else {
        return count * 4; // Default single float per element
      }
    } catch (error) {
      console.warn(`DragonMemoryManager: Error calculating memory for ${name}:`, error);
      return 0;
    }
  }
  
  // CRITICAL FIX: SafeGeometryInspector for comprehensive geometry validation
  private safeInspectGeometry(geometry: any, key: string): number {
    try {
      // Null and type validation
      if (!geometry) {
        console.warn(`DragonMemoryManager: Null geometry for key: ${key}`);
        return 0;
      }
      
      if (typeof geometry !== 'object') {
        console.warn(`DragonMemoryManager: Invalid geometry type for key: ${key}`);
        return 0;
      }
      
      // Check if geometry is disposed using safe property access
      const disposed = this.safePropertyAccess(geometry, 'disposed', false, `geometry ${key}`);
      if (disposed) {
        console.warn(`DragonMemoryManager: Found disposed geometry for key: ${key}`);
        return 0;
      }
      
      // Safe attributes access using safe property accessor
      const attributes = this.safePropertyAccess(geometry, 'attributes', null, `geometry ${key}`);
      if (!attributes || typeof attributes !== 'object') {
        console.warn(`DragonMemoryManager: Geometry missing or invalid attributes for key: ${key}`);
        return 0;
      }
      
      let totalMemory = 0;
      
      // Safe processing of common attributes
      const attributeNames = ['position', 'normal', 'uv', 'color', 'index'];
      for (const attrName of attributeNames) {
        const attribute = this.safePropertyAccess(attributes, attrName, null, `geometry ${key} attributes`);
        if (attribute) {
          const attrMemory = this.safeGetAttributeMemory(attribute, attrName);
          totalMemory += attrMemory;
        }
      }
      
      // Process any additional attributes safely
      try {
        const allKeys = Object.keys(attributes);
        for (const attrKey of allKeys) {
          if (!attributeNames.includes(attrKey)) {
            try {
              const attribute = this.safePropertyAccess(attributes, attrKey, null, `geometry ${key} attributes`);
              if (attribute) {
                const attrMemory = this.safeGetAttributeMemory(attribute, attrKey);
                totalMemory += attrMemory;
              }
            } catch (error) {
              console.warn(`DragonMemoryManager: Error processing attribute ${attrKey} for geometry ${key}:`, error);
            }
          }
        }
      } catch (keysError) {
        console.warn(`DragonMemoryManager: Error getting attribute keys for geometry ${key}:`, keysError);
      }
      
      return totalMemory;
    } catch (error) {
      console.warn(`DragonMemoryManager: Error inspecting geometry ${key}:`, error);
      return 0;
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
      // CRITICAL FIX: Use SafeGeometryInspector for bulletproof geometry processing
      this.geometryCache.forEach((geometry, key) => {
        try {
          const geometryMemory = this.safeInspectGeometry(geometry, key);
          estimatedMemoryUsage += geometryMemory;
        } catch (geometryError) {
          console.warn(`DragonMemoryManager: Critical error processing geometry ${key}:`, geometryError);
          // Continue processing other geometries
        }
      });
      
      // CRITICAL FIX: Enhanced null checks for texture cache
      this.textureCache.forEach((texture, key) => {
        try {
          if (!texture) {
            console.warn(`DragonMemoryManager: Null texture found in cache for key: ${key}`)
            return
          }
          
          // Check if texture is disposed using safe property access
          const disposed = this.safePropertyAccess(texture, 'disposed', false, `texture ${key}`);
          if (disposed) {
            console.warn(`DragonMemoryManager: Found disposed texture in cache for key: ${key}`)
            return
          }
          
          // CRITICAL FIX: Enhanced safe texture size calculation using safe property accessor
          let width = 256;
          let height = 256;
          
          try {
            // Safe image property access using safe property accessor
            const image = this.safePropertyAccess(texture, 'image', null, `texture ${key}`);
            if (image && typeof image === 'object') {
              // Safe width access with fallback to naturalWidth
              const imageWidth = this.safePropertyAccess(image, 'width', 0, `texture ${key} image`);
              const naturalWidth = this.safePropertyAccess(image, 'naturalWidth', 0, `texture ${key} image`);
              
              if (typeof imageWidth === 'number' && imageWidth > 0 && imageWidth <= 8192) {
                width = imageWidth;
              } else if (typeof naturalWidth === 'number' && naturalWidth > 0 && naturalWidth <= 8192) {
                width = naturalWidth;
              }
              
              // Safe height access with fallback to naturalHeight
              const imageHeight = this.safePropertyAccess(image, 'height', 0, `texture ${key} image`);
              const naturalHeight = this.safePropertyAccess(image, 'naturalHeight', 0, `texture ${key} image`);
              
              if (typeof imageHeight === 'number' && imageHeight > 0 && imageHeight <= 8192) {
                height = imageHeight;
              } else if (typeof naturalHeight === 'number' && naturalHeight > 0 && naturalHeight <= 8192) {
                height = naturalHeight;
              }
            }
          } catch (imageError) {
            console.warn(`DragonMemoryManager: Error accessing texture image properties for key: ${key}`, imageError);
            // Use fallback dimensions
          }
          
          // Final validation of dimensions
          if (typeof width === 'number' && typeof height === 'number' && 
              width > 0 && height > 0 && width <= 8192 && height <= 8192 &&
              isFinite(width) && isFinite(height)) {
            estimatedMemoryUsage += width * height * 4 // RGBA
          } else {
            console.warn(`DragonMemoryManager: Using fallback texture dimensions for key: ${key}`, { width, height })
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
    
    // CRITICAL FIX: Enhanced stats validation with comprehensive checks
    if (typeof stats.estimatedMemoryUsage !== 'number' || 
        stats.estimatedMemoryUsage < 0 || 
        !isFinite(stats.estimatedMemoryUsage) ||
        isNaN(stats.estimatedMemoryUsage) ||
        stats.estimatedMemoryUsage > 10737418240) { // 10GB sanity check
      console.warn('DragonMemoryManager: Invalid memory usage calculated, resetting to 0', {
        value: stats.estimatedMemoryUsage,
        type: typeof stats.estimatedMemoryUsage
      })
      stats.estimatedMemoryUsage = 0
    }
    
    // Additional validation for other stats properties
    if (typeof stats.modelsCount !== 'number' || stats.modelsCount < 0 || !isFinite(stats.modelsCount)) {
      console.warn('DragonMemoryManager: Invalid models count, resetting to 0')
      stats.modelsCount = 0
    }
    
    if (typeof stats.texturesCount !== 'number' || stats.texturesCount < 0 || !isFinite(stats.texturesCount)) {
      console.warn('DragonMemoryManager: Invalid textures count, resetting to 0')
      stats.texturesCount = 0
    }
    
    if (typeof stats.geometriesCount !== 'number' || stats.geometriesCount < 0 || !isFinite(stats.geometriesCount)) {
      console.warn('DragonMemoryManager: Invalid geometries count, resetting to 0')
      stats.geometriesCount = 0
    }
    
    return stats
  }
  
  /**
   * Process deferred disposals when WebGL context is restored
   */
  processDeferredDisposals(): void {
    if (this.deferredDisposalQueue.length === 0) return
    
    console.log(`[DragonMemoryManager] Processing ${this.deferredDisposalQueue.length} deferred disposals`)
    
    const itemsToProcess = [...this.deferredDisposalQueue]
    this.deferredDisposalQueue = []
    
    // Sort by priority and age (older items first for fairness)
    itemsToProcess.sort((a, b) => {
      const priorityDiff = b.priority - a.priority
      if (Math.abs(priorityDiff) > 0.1) return priorityDiff
      return a.timestamp - b.timestamp // Older first if similar priority
    })
    
    let processedCount = 0
    
    for (const item of itemsToProcess) {
      try {
        // Check if item is still valid (not already disposed)
        if (item.resource && !this.isResourceDisposed(item.resource)) {
          this.forceDisposal(item.type, item.resource)
          processedCount++
        }
      } catch (error) {
        console.warn(`DragonMemoryManager: Error processing deferred disposal:`, error)
      }
    }
    
    console.log(`[DragonMemoryManager] Processed ${processedCount} deferred disposals`)
  }
  
  /**
   * Check if a resource has already been disposed
   */
  private isResourceDisposed(resource: any): boolean {
    try {
      return resource && 
             typeof resource === 'object' && 
             'disposed' in resource && 
             resource.disposed === true
    } catch {
      return false
    }
  }
  
  /**
   * Get batch disposal queue statistics
   */
  getBatchDisposalStats(): {
    deferredCount: number
    batchCount: number
    isProcessing: boolean
  } {
    return {
      deferredCount: this.deferredDisposalQueue.length,
      batchCount: this.batchDisposalQueue.length,
      isProcessing: this.batchDisposalTimer !== null
    }
  }
  
  /**
   * Force immediate processing of all queued disposals
   */
  flushDisposalQueues(): void {
    console.log('[DragonMemoryManager] Flushing all disposal queues')
    
    // Process batch queue first
    if (this.batchDisposalTimer) {
      clearTimeout(this.batchDisposalTimer)
      this.batchDisposalTimer = null
    }
    this.processBatchDisposals()
    
    // Process deferred queue
    this.processDeferredDisposals()
  }
}