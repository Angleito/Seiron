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

  // Dispose of a specific model
  disposeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Dispose of geometry
        if (child.geometry) {
          child.geometry.dispose()
        }
        
        // Dispose of materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => this.disposeMaterial(material))
          } else {
            this.disposeMaterial(child.material)
          }
        }
      }
    })
    model.clear()
  }

  // Dispose of a material and its textures
  private disposeMaterial(material: THREE.Material): void {
    const materialAny = material as any
    
    // Dispose of common texture properties
    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'aoMap']
    textureProps.forEach(prop => {
      if (materialAny[prop]) {
        materialAny[prop].dispose()
      }
    })
    
    material.dispose()
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

  // Complete cleanup
  dispose(): void {
    this.loadedModels.forEach(model => this.disposeModel(model))
    this.textureCache.forEach(texture => texture.dispose())
    this.geometryCache.forEach(geometry => geometry.dispose())
    
    this.loadedModels.clear()
    this.textureCache.clear()
    this.geometryCache.clear()
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
      const position = geometry.attributes.position
      const normal = geometry.attributes.normal
      const uv = geometry.attributes.uv
      
      if (position) estimatedMemoryUsage += position.count * 3 * 4 // 3 floats per position
      if (normal) estimatedMemoryUsage += normal.count * 3 * 4 // 3 floats per normal
      if (uv) estimatedMemoryUsage += uv.count * 2 * 4 // 2 floats per UV
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