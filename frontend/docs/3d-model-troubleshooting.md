# 3D Model Troubleshooting Guide

This guide provides comprehensive troubleshooting information for 3D model loading and rendering issues in web applications.

## Table of Contents
1. [Common Model Loading Errors](#common-model-loading-errors)
2. [WebGL Context Loss Recovery](#webgl-context-loss-recovery)
3. [Model Fallback Chain](#model-fallback-chain)
4. [Performance Optimization Guidelines](#performance-optimization-guidelines)
5. [Browser Compatibility Matrix](#browser-compatibility-matrix)

---

## Common Model Loading Errors

### 1. CORS (Cross-Origin Resource Sharing) Errors

**Error Message:**
```
Access to fetch at 'https://example.com/model.glb' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solutions:**
- Configure proper CORS headers on the server hosting the models
- Use a proxy server for development
- Host models on the same domain as your application
- Add appropriate CORS headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  ```

### 2. File Not Found (404) Errors

**Error Message:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Solutions:**
- Verify the file path is correct and case-sensitive
- Ensure the model file is included in your build output
- Check that relative paths are resolved correctly
- Verify file extensions match exactly (`.glb` vs `.GLB`)

### 3. Memory Allocation Errors

**Error Message:**
```
RangeError: Array buffer allocation failed
WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
```

**Solutions:**
- Implement texture compression (KTX2/Basis)
- Use LOD (Level of Detail) models
- Dispose of unused models and textures
- Implement progressive loading for large scenes
- Monitor memory usage:
  ```javascript
  if (performance.memory) {
    console.log('Used JS Heap:', performance.memory.usedJSHeapSize / 1048576, 'MB');
  }
  ```

### 4. Unsupported File Format Errors

**Error Message:**
```
THREE.GLTFLoader: Unsupported asset version
Error: Unknown format
```

**Solutions:**
- Ensure you're using compatible file formats (GLTF 2.0, GLB)
- Update your model loader libraries
- Convert models to supported formats using tools like:
  - Blender (free, open-source)
  - glTF-Pipeline
  - FBX2glTF converter

### 5. Texture Loading Errors

**Error Message:**
```
THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter
```

**Solutions:**
- Resize textures to power-of-two dimensions (512x512, 1024x1024, etc.)
- Set appropriate texture filtering:
  ```javascript
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  ```
- Use texture atlases to reduce draw calls

### 6. Shader Compilation Errors

**Error Message:**
```
THREE.WebGLProgram: shader error: 0 35715 false gl.getProgramInfoLog
```

**Solutions:**
- Check for WebGL support and version
- Simplify complex shaders
- Ensure shader compatibility with target WebGL version
- Provide fallback shaders for older devices

---

## WebGL Context Loss Recovery

WebGL contexts can be lost due to various reasons including GPU driver crashes, system resource pressure, or power management events.

### Detection and Recovery Implementation

```javascript
class WebGLContextManager {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.setupContextLossHandling();
  }

  setupContextLossHandling() {
    // Prevent default browser behavior
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.handleContextLost();
    }, false);

    // Restore context when possible
    this.canvas.addEventListener('webglcontextrestored', (event) => {
      this.handleContextRestored();
    }, false);
  }

  handleContextLost() {
    console.warn('WebGL context lost. Attempting recovery...');
    
    // Cancel any ongoing animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Set recovery flag
    this.isRecovering = true;
    
    // Notify user
    this.showRecoveryMessage();
  }

  handleContextRestored() {
    console.log('WebGL context restored');
    
    // Recreate all GPU resources
    this.recreateResources();
    
    // Resume rendering
    this.isRecovering = false;
    this.hideRecoveryMessage();
    this.resumeAnimation();
  }

  recreateResources() {
    // Dispose old resources
    this.renderer.dispose();
    
    // Recreate renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    
    // Reload textures, geometries, and materials
    this.reloadAssets();
  }

  // Force context restoration (for testing)
  forceContextRestore() {
    const loseContext = this.renderer.getContext().getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
      setTimeout(() => {
        loseContext.restoreContext();
      }, 1000);
    }
  }
}
```

### Best Practices for Context Loss Prevention

1. **Resource Management**
   - Dispose of unused textures, geometries, and materials
   - Implement resource pooling
   - Use texture atlases to reduce texture count

2. **Memory Monitoring**
   ```javascript
   class ResourceMonitor {
     constructor(renderer) {
       this.renderer = renderer;
     }
     
     getMemoryInfo() {
       const info = this.renderer.info;
       return {
         geometries: info.memory.geometries,
         textures: info.memory.textures,
         renderCalls: info.render.calls,
         triangles: info.render.triangles
       };
     }
     
     checkMemoryPressure() {
       const memory = this.getMemoryInfo();
       if (memory.textures > 100 || memory.geometries > 100) {
         console.warn('High resource usage detected');
         this.triggerCleanup();
       }
     }
   }
   ```

3. **Graceful Degradation**
   - Implement quality levels that can be reduced under pressure
   - Provide 2D fallbacks for critical content
   - Save application state regularly

---

## Model Fallback Chain

Implement a robust fallback system to ensure content is always displayed, even when optimal formats fail to load.

### Fallback Chain Implementation

```javascript
class ModelLoader {
  constructor() {
    this.loaders = {
      gltf: new THREE.GLTFLoader(),
      obj: new THREE.OBJLoader(),
      fbx: new THREE.FBXLoader()
    };
    
    this.fallbackChain = [
      { type: 'gltf', extensions: ['.glb', '.gltf'] },
      { type: 'obj', extensions: ['.obj'] },
      { type: 'fbx', extensions: ['.fbx'] },
      { type: 'primitive', extensions: [] }
    ];
  }
  
  async loadModel(basePath, options = {}) {
    for (const fallback of this.fallbackChain) {
      try {
        if (fallback.type === 'primitive') {
          return this.createPrimitiveFallback(options);
        }
        
        for (const ext of fallback.extensions) {
          const url = basePath + ext;
          const model = await this.tryLoadModel(url, fallback.type);
          if (model) return model;
        }
      } catch (error) {
        console.warn(`Failed to load ${fallback.type} model:`, error);
      }
    }
    
    throw new Error('All model loading attempts failed');
  }
  
  async tryLoadModel(url, type) {
    return new Promise((resolve, reject) => {
      const loader = this.loaders[type];
      
      loader.load(
        url,
        (result) => {
          const model = type === 'gltf' ? result.scene : result;
          resolve(model);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${type}: ${percent.toFixed(2)}%`);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
  
  createPrimitiveFallback(options) {
    const geometry = new THREE.BoxGeometry(
      options.width || 1,
      options.height || 1,
      options.depth || 1
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: options.color || 0x00ff00,
      wireframe: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    console.warn('Using primitive fallback mesh');
    return mesh;
  }
}
```

### Fallback Strategy Recommendations

1. **Primary Format**: GLTF 2.0 / GLB
   - Best compatibility and features
   - Supports PBR materials
   - Efficient binary format

2. **Secondary Format**: OBJ
   - Wide compatibility
   - Simple format
   - Good for basic geometry

3. **Tertiary Format**: FBX
   - Common in professional workflows
   - Supports animations
   - Larger file sizes

4. **Final Fallback**: Primitive Geometry
   - Always available
   - Indicates loading issues
   - Maintains scene structure

---

## Performance Optimization Guidelines

### 1. Model Optimization

**Geometry Optimization:**
```javascript
// Merge geometries to reduce draw calls
const geometries = [];
models.forEach(model => {
  model.traverse(child => {
    if (child.isMesh) {
      geometries.push(child.geometry);
    }
  });
});

const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
```

**LOD (Level of Detail) Implementation:**
```javascript
class LODManager {
  createLODModel(highRes, medRes, lowRes) {
    const lod = new THREE.LOD();
    
    lod.addLevel(highRes, 0);    // 0-50 units
    lod.addLevel(medRes, 50);    // 50-100 units
    lod.addLevel(lowRes, 100);   // 100+ units
    
    return lod;
  }
  
  autoGenerateLODs(model) {
    const lod = new THREE.LOD();
    
    // Original model
    lod.addLevel(model.clone(), 0);
    
    // Medium detail (50% vertices)
    const mediumLOD = this.simplifyModel(model, 0.5);
    lod.addLevel(mediumLOD, 50);
    
    // Low detail (25% vertices)
    const lowLOD = this.simplifyModel(model, 0.25);
    lod.addLevel(lowLOD, 100);
    
    return lod;
  }
}
```

### 2. Texture Optimization

**Compression and Format Selection:**
```javascript
const textureLoader = new THREE.TextureLoader();
const ktx2Loader = new THREE.KTX2Loader();

// Detect WebP support
const supportsWebP = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
};

// Load optimal texture format
async function loadOptimalTexture(basePath) {
  if (renderer.capabilities.isWebGL2) {
    // Try KTX2 for WebGL2
    try {
      return await ktx2Loader.loadAsync(`${basePath}.ktx2`);
    } catch (e) {}
  }
  
  if (supportsWebP()) {
    // Try WebP
    try {
      return await textureLoader.loadAsync(`${basePath}.webp`);
    } catch (e) {}
  }
  
  // Fallback to JPEG/PNG
  return await textureLoader.loadAsync(`${basePath}.jpg`);
}
```

### 3. Rendering Optimization

**Frustum Culling and Occlusion:**
```javascript
class RenderOptimizer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // Enable frustum culling
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
  }
  
  updateVisibility() {
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    
    this.scene.traverse(object => {
      if (object.isMesh) {
        object.visible = this.frustum.intersectsObject(object);
      }
    });
  }
  
  enableInstancing(geometry, count) {
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      count
    );
    
    // Set instance transforms
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.setPosition(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        Math.random() * 100 - 50
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    return instancedMesh;
  }
}
```

### 4. Memory Management

**Resource Disposal:**
```javascript
class ResourceManager {
  constructor() {
    this.resources = new Set();
  }
  
  track(resource) {
    this.resources.add(resource);
  }
  
  dispose(resource) {
    if (resource.dispose) {
      resource.dispose();
    }
    
    if (resource.isMesh) {
      resource.geometry.dispose();
      
      if (resource.material.isMaterial) {
        this.disposeMaterial(resource.material);
      } else {
        // Array of materials
        resource.material.forEach(mat => this.disposeMaterial(mat));
      }
    }
    
    this.resources.delete(resource);
  }
  
  disposeMaterial(material) {
    // Dispose textures
    Object.keys(material).forEach(key => {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    });
    
    material.dispose();
  }
  
  disposeAll() {
    this.resources.forEach(resource => this.dispose(resource));
    this.resources.clear();
  }
}
```

---

## Browser Compatibility Matrix

### WebGL Support by Browser

| Browser | WebGL 1.0 | WebGL 2.0 | Notes |
|---------|-----------|-----------|--------|
| **Chrome** | 9+ | 56+ | Excellent support, hardware acceleration |
| **Firefox** | 4+ | 51+ | Excellent support, good debugging tools |
| **Safari** | 8+ | 15+ | WebGL 2.0 support recent, may need flags |
| **Edge** | 12+ | 79+ | Chromium-based versions have full support |
| **iOS Safari** | 8+ | 15+ | Limited WebGL 2.0, memory constraints |
| **Chrome Android** | 25+ | 56+ | Good support, varies by device |
| **Samsung Internet** | 4+ | 7.2+ | Based on Chromium |

### Model Format Support

| Format | Chrome | Firefox | Safari | Edge | Mobile Support | Recommended |
|--------|--------|---------|--------|------|----------------|-------------|
| **GLTF 2.0** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Primary |
| **GLB** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Primary |
| **OBJ** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Fallback |
| **FBX** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ Not recommended |
| **COLLADA** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ Legacy only |
| **STL** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ 3D printing |

### Texture Format Support

| Format | Chrome | Firefox | Safari | Edge | Mobile | Notes |
|--------|--------|---------|--------|------|---------|-------|
| **PNG** | ✅ | ✅ | ✅ | ✅ | ✅ | Lossless, larger files |
| **JPEG** | ✅ | ✅ | ✅ | ✅ | ✅ | Lossy, no transparency |
| **WebP** | ✅ | ✅ | ✅ | ✅ | ✅ | Better compression |
| **KTX2** | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | GPU compressed |
| **DDS** | ❌ | ❌ | ❌ | ❌ | ❌ | Use KTX2 instead |
| **HDR** | ✅ | ✅ | ✅ | ✅ | ⚠️ | Environment maps |

### Feature Detection Code

```javascript
class CompatibilityChecker {
  static checkWebGLSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const gl2 = canvas.getContext('webgl2');
    
    return {
      webgl1: !!gl,
      webgl2: !!gl2,
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      maxVertexAttributes: gl ? gl.getParameter(gl.MAX_VERTEX_ATTRIBS) : 0,
      extensions: gl ? gl.getSupportedExtensions() : []
    };
  }
  
  static getOptimalSettings() {
    const support = this.checkWebGLSupport();
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    return {
      useWebGL2: support.webgl2 && !isMobile,
      maxTextureSize: Math.min(support.maxTextureSize, isMobile ? 2048 : 4096),
      enableShadows: !isMobile,
      antialias: !isMobile,
      pixelRatio: Math.min(window.devicePixelRatio, isMobile ? 2 : 3),
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    };
  }
  
  static detectFeatures() {
    const features = {
      webp: this.supportsWebP(),
      webgl2: !!document.createElement('canvas').getContext('webgl2'),
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined'
    };
    
    return features;
  }
  
  static supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
  }
}
```

### Mobile-Specific Considerations

1. **Memory Constraints**
   - iOS devices have strict memory limits
   - Implement aggressive texture compression
   - Use lower polygon counts
   - Dispose resources immediately when not needed

2. **Performance Guidelines**
   ```javascript
   const mobileSettings = {
     maxTextureSize: 2048,
     shadowMapSize: 512,
     antialias: false,
     pixelRatio: Math.min(window.devicePixelRatio, 2),
     targetFPS: 30
   };
   ```

3. **Touch Input Handling**
   - Implement proper touch controls
   - Consider gesture conflicts with browser navigation
   - Provide UI scaling for different screen sizes

## Debugging Tools and Techniques

### Performance Monitoring

```javascript
class PerformanceMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }
  
  update() {
    this.stats.update();
    
    const info = this.renderer.info;
    if (info.render.frame % 60 === 0) {
      console.log({
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures
      });
    }
  }
}
```

### Error Reporting

```javascript
window.addEventListener('error', (event) => {
  if (event.message.includes('WebGL')) {
    console.error('WebGL Error:', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error
    });
    
    // Send to error tracking service
    // reportError(event);
  }
});
```

---

## Additional Resources

- [WebGL Report](https://webglreport.com/) - Check WebGL capabilities
- [Can I Use WebGL](https://caniuse.com/webgl) - Browser support tables
- [Three.js Documentation](https://threejs.org/docs/) - Official Three.js docs
- [glTF Validator](https://github.khronos.org/glTF-Validator/) - Validate GLTF files
- [Spector.js](https://spector.babylonjs.com/) - WebGL debugging tool
