import * as THREE from 'three'

export class DragonMemoryManager {
  private static instance: DragonMemoryManager
  private loadedModels: Map<string, THREE.Group> = new Map()
  private textureCache: Map<string, THREE.Texture> = new Map()
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map()

  private constructor() {}

  static getInstance(): DragonMemoryManager {
    if (!DragonMemoryManager.instance) {
      DragonMemoryManager.instance = new DragonMemoryManager()
    }
    return DragonMemoryManager.instance
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

  // CRITICAL FIX: Enhanced model disposal with comprehensive resource cleanup
  disposeModel(model: THREE.Group): void {
    try {
      if (!model) {
        console.warn('DragonMemoryManager: Attempted to dispose null/undefined model')
        return
      }

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

  // CRITICAL FIX: Complete cleanup with memory tracking
  dispose(): void {
    console.log('🧹 DragonMemoryManager disposing all resources')
    
    const beforeStats = this.getMemoryStats()
    console.log('Before disposal:', beforeStats)
    
    // Dispose models
    this.loadedModels.forEach(model => this.disposeModel(model))
    
    // Dispose textures
    this.textureCache.forEach(texture => {
      texture.dispose()
    })
    
    // Dispose geometries
    this.geometryCache.forEach(geometry => {
      geometry.dispose()
    })
    
    // Clear all caches
    this.loadedModels.clear()
    this.textureCache.clear()
    this.geometryCache.clear()
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && window.gc) {
      window.gc()
    }
    
    console.log('🧹 DragonMemoryManager disposal complete')
  }

  // Get memory usage statistics
  getMemoryStats(): {
    modelsCount: number
    texturesCount: number
    geometriesCount: number
    estimatedMemoryUsage: number
  } {
    let estimatedMemoryUsage = 0
    
    // Estimate memory usage (very rough approximation)
    this.geometryCache.forEach(geometry => {
      // CRITICAL FIX: Add comprehensive null checks for geometry attributes
      if (!geometry || !geometry.attributes) {
        return
      }
      
      const position = geometry.attributes.position
      const normal = geometry.attributes.normal
      const uv = geometry.attributes.uv
      
      // CRITICAL FIX: Add null checks and validate count property exists
      if (position && typeof position.count === 'number') {
        estimatedMemoryUsage += position.count * 3 * 4 // 3 floats per position
      }
      if (normal && typeof normal.count === 'number') {
        estimatedMemoryUsage += normal.count * 3 * 4 // 3 floats per normal
      }
      if (uv && typeof uv.count === 'number') {
        estimatedMemoryUsage += uv.count * 2 * 4 // 2 floats per UV
      }
    })
    
    this.textureCache.forEach(texture => {
      // Rough estimate: width * height * 4 bytes per pixel (RGBA)
      estimatedMemoryUsage += (texture.image?.width || 256) * (texture.image?.height || 256) * 4
    })
    
    return {
      modelsCount: this.loadedModels.size,
      texturesCount: this.textureCache.size,
      geometriesCount: this.geometryCache.size,
      estimatedMemoryUsage
    }
  }
}