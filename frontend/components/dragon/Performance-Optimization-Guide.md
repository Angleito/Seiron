# 🐉 Dragon Performance Optimization Guide

This comprehensive guide covers performance optimization strategies for the Seiron dragon animation system. Learn how to achieve smooth 60 FPS animations across all devices while maintaining visual quality and responsiveness.

## 📊 Performance Overview

The Seiron dragon system is designed with performance as a core principle, featuring:

- **Automatic Performance Monitoring** - Real-time FPS and memory tracking
- **Adaptive Quality System** - Dynamic quality adjustment based on device performance
- **Intelligent Fallback Chain** - 3D → ASCII → 2D fallback progression
- **Resource Management** - Efficient memory usage and cleanup
- **Mobile Optimization** - Touch-friendly animations with reduced complexity

### Performance Targets

| Device Category | Target FPS | Memory Limit | Quality Level |
|-----------------|------------|--------------|---------------|
| High-end Desktop | 60 FPS | 512 MB | High (3D + Particles) |
| Mid-range Desktop | 45 FPS | 256 MB | Medium (3D Basic) |
| High-end Mobile | 30 FPS | 128 MB | Medium (ASCII + Effects) |
| Low-end Mobile | 15 FPS | 64 MB | Low (2D Basic) |

## 🎯 Performance Monitoring

### Built-in Performance Metrics

The dragon system includes comprehensive performance monitoring:

```typescript
interface DragonPerformanceMetrics {
  renderTime: number        // Component render time (ms)
  initTime: number         // Initialization time (ms)  
  dragonType: DragonType   // Current active type
  fallbackUsed: boolean    // Whether fallback was triggered
  errorCount: number       // Number of errors encountered
  fps?: number             // Current frames per second
  memoryUsage?: number     // Memory usage in MB
  performanceScore?: number // Overall score (0-100)
}
```

### Performance Monitoring Setup

```tsx
import { DragonRenderer } from '@/components/dragon'
import { useState } from 'react'

function PerformanceOptimizedDragon() {
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'low'>('auto')
  const [metrics, setMetrics] = useState<DragonPerformanceMetrics>()

  const handlePerformanceMetrics = (newMetrics: DragonPerformanceMetrics) => {
    setMetrics(newMetrics)
    
    // Auto-adjust performance based on metrics
    if (newMetrics.performanceScore && newMetrics.performanceScore < 30) {
      setPerformanceMode('low')
    } else if (newMetrics.performanceScore && newMetrics.performanceScore > 80) {
      setPerformanceMode('high')
    }
    
    // Log performance for analytics
    console.log('Dragon Performance:', {
      fps: newMetrics.fps,
      renderTime: newMetrics.renderTime,
      memoryUsage: newMetrics.memoryUsage,
      performanceScore: newMetrics.performanceScore
    })
  }

  return (
    <DragonRenderer
      dragonType="3d"
      performanceMode={performanceMode}
      onPerformanceMetrics={handlePerformanceMetrics}
      onFallback={(from, to) => {
        console.log(`Performance fallback: ${from} → ${to}`)
        // Track fallback events for optimization insights
        analytics.track('dragon_performance_fallback', { from, to })
      }}
    />
  )
}
```

### Real-time Performance Dashboard

```tsx
function DragonPerformanceDashboard({ metrics }: { metrics?: DragonPerformanceMetrics }) {
  if (!metrics) return null

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'gray'
    if (score > 80) return 'green'
    if (score > 50) return 'yellow'
    return 'red'
  }

  return (
    <div className="performance-dashboard">
      <div className="metrics-grid">
        <div className="metric">
          <span className="label">FPS</span>
          <span className={`value ${metrics.fps && metrics.fps > 30 ? 'good' : 'poor'}`}>
            {metrics.fps?.toFixed(1) || 'N/A'}
          </span>
        </div>
        
        <div className="metric">
          <span className="label">Render Time</span>
          <span className={`value ${metrics.renderTime < 16 ? 'good' : 'poor'}`}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="metric">
          <span className="label">Memory</span>
          <span className="value">
            {metrics.memoryUsage?.toFixed(1) || 'N/A'} MB
          </span>
        </div>
        
        <div className="metric">
          <span className="label">Score</span>
          <span className={`value ${getPerformanceColor(metrics.performanceScore)}`}>
            {metrics.performanceScore?.toFixed(0) || 'N/A'}
          </span>
        </div>
        
        <div className="metric">
          <span className="label">Dragon Type</span>
          <span className="value">{metrics.dragonType.toUpperCase()}</span>
        </div>
        
        <div className="metric">
          <span className="label">Fallback Used</span>
          <span className={`value ${metrics.fallbackUsed ? 'warning' : 'good'}`}>
            {metrics.fallbackUsed ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  )
}
```

## ⚡ Optimization Strategies

### 1. Automatic Quality Adjustment

The dragon system automatically adjusts quality based on performance:

```typescript
// Performance-based quality adjustment
const getOptimalDragonConfig = (performanceScore: number): DragonConfig => {
  if (performanceScore > 80) {
    // High performance - enable all features
    return {
      dragonType: '3d',
      quality: 'high',
      enableParticles: true,
      enableComplexAnimations: true,
      particleCount: 500,
      animationSpeed: 1.0
    }
  } else if (performanceScore > 50) {
    // Medium performance - balanced features
    return {
      dragonType: '3d',
      quality: 'medium', 
      enableParticles: true,
      enableComplexAnimations: false,
      particleCount: 200,
      animationSpeed: 0.8
    }
  } else if (performanceScore > 20) {
    // Low performance - minimal 3D
    return {
      dragonType: 'ascii',
      enableBreathing: true,
      enableFloating: false,
      enableTypewriter: false,
      animationSpeed: 0.5
    }
  } else {
    // Very low performance - basic 2D
    return {
      dragonType: '2d',
      enableAnimations: false,
      staticMode: true
    }
  }
}
```

### 2. Device-Specific Optimization

```typescript
// Detect device capabilities
const getDeviceCapabilities = (): DeviceCapabilities => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  return {
    hasWebGL: !!gl,
    hasWebGL2: !!document.createElement('canvas').getContext('webgl2'),
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    hasHardwareAcceleration: !!gl?.getParameter(gl.RENDERER)?.includes('GPU'),
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) || 1024,
    memoryLimit: (navigator as any).deviceMemory || 4 // GB
  }
}

// Apply device-specific optimizations
function OptimizedDragonRenderer() {
  const [dragonConfig, setDragonConfig] = useState<DragonConfig>()
  
  useEffect(() => {
    const capabilities = getDeviceCapabilities()
    
    const config: DragonConfig = {
      // Default to ASCII on mobile devices
      dragonType: capabilities.isMobile ? 'ascii' : '3d',
      
      // Reduce quality on low-memory devices
      quality: capabilities.memoryLimit < 4 ? 'low' : 'medium',
      
      // Disable particles on devices without hardware acceleration
      enableParticles: capabilities.hasHardwareAcceleration,
      
      // Use WebGL2 features when available
      useAdvancedShaders: capabilities.hasWebGL2,
      
      // Adjust texture resolution based on device
      textureResolution: capabilities.maxTextureSize > 2048 ? 'high' : 'low'
    }
    
    setDragonConfig(config)
  }, [])

  if (!dragonConfig) return <div>Loading optimized dragon...</div>

  return (
    <DragonRenderer
      dragonType={dragonConfig.dragonType}
      performanceMode="auto"
      threeDProps={{
        quality: dragonConfig.quality,
        showParticles: dragonConfig.enableParticles,
        useAdvancedShaders: dragonConfig.useAdvancedShaders
      }}
      asciiProps={{
        enableBreathing: !dragonConfig.isMobile,
        enableFloating: !dragonConfig.isMobile,
        performanceMode: dragonConfig.quality
      }}
    />
  )
}
```

### 3. Memory Management

```typescript
// Memory-efficient dragon hooks
function useMemoryOptimizedDragon() {
  const [memoryUsage, setMemoryUsage] = useState(0)
  const cleanupRef = useRef<(() => void)[]>([])

  // Monitor memory usage
  useEffect(() => {
    const monitor = setInterval(() => {
      if ((performance as any).memory) {
        const usage = (performance as any).memory.usedJSHeapSize / 1024 / 1024
        setMemoryUsage(usage)
        
        // Trigger cleanup if memory usage is high
        if (usage > 200) { // 200MB threshold
          cleanupRef.current.forEach(cleanup => cleanup())
          cleanupRef.current = []
        }
      }
    }, 1000)

    return () => clearInterval(monitor)
  }, [])

  // Register cleanup functions
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup)
  }, [])

  // Force garbage collection (when available)
  const forceGarbageCollection = useCallback(() => {
    if ((window as any).gc) {
      (window as any).gc()
    }
  }, [])

  return { memoryUsage, registerCleanup, forceGarbageCollection }
}
```

### 4. Animation Frame Optimization

```typescript
// Optimized animation frame management
class DragonAnimationScheduler {
  private animationQueue: Map<string, () => void> = new Map()
  private rafId: number | null = null
  private lastFrameTime = 0
  private targetFPS = 60
  private frameInterval = 1000 / this.targetFPS

  schedule(id: string, callback: () => void) {
    this.animationQueue.set(id, callback)
    
    if (!this.rafId) {
      this.startLoop()
    }
  }

  unschedule(id: string) {
    this.animationQueue.delete(id)
    
    if (this.animationQueue.size === 0) {
      this.stopLoop()
    }
  }

  setTargetFPS(fps: number) {
    this.targetFPS = fps
    this.frameInterval = 1000 / fps
  }

  private startLoop() {
    const loop = (currentTime: number) => {
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        // Execute all scheduled animations
        this.animationQueue.forEach(callback => {
          try {
            callback()
          } catch (error) {
            console.error('Animation callback error:', error)
          }
        })
        
        this.lastFrameTime = currentTime
      }
      
      this.rafId = requestAnimationFrame(loop)
    }
    
    this.rafId = requestAnimationFrame(loop)
  }

  private stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}

// Use the scheduler in dragon hooks
const animationScheduler = new DragonAnimationScheduler()

function useOptimizedDragonAnimation(id: string, callback: () => void, fps = 60) {
  useEffect(() => {
    animationScheduler.setTargetFPS(fps)
    animationScheduler.schedule(id, callback)
    
    return () => {
      animationScheduler.unschedule(id)
    }
  }, [id, callback, fps])
}
```

## 🎮 3D Dragon Optimization

### WebGL Performance Optimization

```typescript
// Optimized 3D dragon configuration
const optimized3DConfig = {
  // Geometry optimization
  geometry: {
    reduceMeshComplexity: true,
    useLevelOfDetail: true, // LOD based on distance
    enableInstancing: true, // For particle systems
    enableFrustumCulling: true
  },
  
  // Material optimization
  materials: {
    useSharedMaterials: true,
    enableMaterialBatching: true,
    reduceShaderComplexity: true,
    enableTextureMipMapping: true
  },
  
  // Rendering optimization
  rendering: {
    enableOcclusion: true,
    useSmallerViewport: true, // On low-end devices
    reducePixelRatio: true, // For high-DPI devices
    enableAntialiasing: false // Disable on mobile
  },
  
  // Animation optimization
  animations: {
    reduceKeyframes: true,
    enableAnimationBlending: false, // On low-end devices
    useGPUAnimations: true,
    enableMorphTargets: false // Heavy feature
  }
}

// Optimized 3D dragon component
function Optimized3DDragon({ performanceMode }: { performanceMode: PerformanceMode }) {
  const [config, setConfig] = useState(optimized3DConfig)
  
  useEffect(() => {
    if (performanceMode === 'low') {
      setConfig(prev => ({
        ...prev,
        geometry: { ...prev.geometry, reduceMeshComplexity: true },
        materials: { ...prev.materials, reduceShaderComplexity: true },
        rendering: { ...prev.rendering, enableAntialiasing: false },
        animations: { ...prev.animations, enableAnimationBlending: false }
      }))
    }
  }, [performanceMode])

  return (
    <Canvas 
      gl={{ 
        antialias: config.rendering.enableAntialiasing,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      camera={{ 
        fov: 75, 
        near: 0.1, 
        far: 1000,
        position: [0, 0, 5] 
      }}
      performance={{ min: 0.5 }} // Adaptive performance
    >
      <Dragon3DMesh config={config} />
    </Canvas>
  )
}
```

### Particle System Optimization

```typescript
// Performance-aware particle system
function OptimizedParticleSystem({ particleCount, performanceMode }: {
  particleCount: number
  performanceMode: PerformanceMode
}) {
  // Adjust particle count based on performance
  const getOptimalParticleCount = useCallback(() => {
    switch (performanceMode) {
      case 'high': return particleCount
      case 'auto': return Math.min(particleCount, 200)
      case 'low': return Math.min(particleCount, 50)
      default: return particleCount
    }
  }, [particleCount, performanceMode])

  const optimizedCount = getOptimalParticleCount()

  return (
    <group>
      {/* Fire particles */}
      <instancedMesh args={[undefined, undefined, optimizedCount]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="orange" transparent opacity={0.7} />
      </instancedMesh>
      
      {/* Energy particles (reduced on low performance) */}
      {performanceMode !== 'low' && (
        <instancedMesh args={[undefined, undefined, optimizedCount / 2]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color="blue" transparent opacity={0.5} />
        </instancedMesh>
      )}
    </group>
  )
}
```

## 🔤 ASCII Dragon Optimization

### Character Rendering Optimization

```typescript
// Optimized ASCII rendering
function OptimizedASCIIDragon({ performanceMode }: { performanceMode: PerformanceMode }) {
  const [renderConfig, setRenderConfig] = useState({
    enableBreathing: true,
    enableFloating: true,
    enableTypewriter: true,
    animationThrottle: 16, // 60 FPS
    characterOptimization: false
  })

  useEffect(() => {
    const config = {
      high: {
        enableBreathing: true,
        enableFloating: true,
        enableTypewriter: true,
        animationThrottle: 16, // 60 FPS
        characterOptimization: false
      },
      auto: {
        enableBreathing: true,
        enableFloating: true,
        enableTypewriter: true,
        animationThrottle: 33, // 30 FPS
        characterOptimization: true
      },
      low: {
        enableBreathing: false,
        enableFloating: false,
        enableTypewriter: false,
        animationThrottle: 100, // 10 FPS
        characterOptimization: true
      }
    }

    setRenderConfig(config[performanceMode] || config.auto)
  }, [performanceMode])

  return (
    <ASCIIDragon
      enableBreathing={renderConfig.enableBreathing}
      enableFloating={renderConfig.enableFloating}
      enableTypewriter={renderConfig.enableTypewriter}
      animationConfig={{
        performance: {
          enabled: true,
          throttleMs: renderConfig.animationThrottle,
          maxFPS: 1000 / renderConfig.animationThrottle
        }
      }}
    />
  )
}
```

### Text Animation Optimization

```typescript
// Optimized typewriter effect
function useOptimizedTypewriter(text: string[], speed: number, performanceMode: PerformanceMode) {
  const [displayedText, setDisplayedText] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  
  // Adjust speed based on performance
  const optimizedSpeed = useMemo(() => {
    switch (performanceMode) {
      case 'high': return speed
      case 'auto': return speed * 1.5 // Slightly faster
      case 'low': return speed * 3   // Much faster to reduce animation time
      default: return speed
    }
  }, [speed, performanceMode])

  useEffect(() => {
    if (performanceMode === 'low') {
      // Skip animation on low performance
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    let lineIndex = 0
    let charIndex = 0
    const result: string[] = []

    const interval = setInterval(() => {
      if (lineIndex >= text.length) {
        setIsComplete(true)
        clearInterval(interval)
        return
      }

      const currentLine = text[lineIndex]
      if (charIndex >= currentLine.length) {
        result[lineIndex] = currentLine
        lineIndex++
        charIndex = 0
      } else {
        result[lineIndex] = currentLine.slice(0, charIndex + 1)
        charIndex++
      }

      setDisplayedText([...result])
    }, optimizedSpeed)

    return () => clearInterval(interval)
  }, [text, optimizedSpeed, performanceMode])

  return { displayedText, isComplete }
}
```

## 📱 Mobile Optimization

### Touch-Optimized Interactions

```typescript
// Mobile-optimized dragon interactions
function MobileDragonRenderer() {
  const [isMobile, setIsMobile] = useState(false)
  const [touchOptimizations, setTouchOptimizations] = useState({
    enableHover: true,
    enableComplexGestures: true,
    enableHaptics: true
  })

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
      
      if (mobile) {
        setTouchOptimizations({
          enableHover: false, // No hover on mobile
          enableComplexGestures: false, // Simplified interactions
          enableHaptics: 'vibrate' in navigator // Enable if supported
        })
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <DragonRenderer
      dragonType={isMobile ? 'ascii' : '3d'} // Prefer ASCII on mobile
      size={isMobile ? 'md' : 'lg'} // Smaller size on mobile
      enableHover={touchOptimizations.enableHover}
      performanceMode={isMobile ? 'low' : 'auto'}
      asciiProps={{
        enableFloating: !isMobile, // Disable floating on mobile
        enableBreathing: true,
        speed: isMobile ? 'fast' : 'normal'
      }}
      threeDProps={{
        enableInteraction: touchOptimizations.enableComplexGestures,
        quality: isMobile ? 'low' : 'medium',
        showParticles: !isMobile
      }}
    />
  )
}
```

### Viewport and Responsive Optimization

```typescript
// Responsive dragon sizing
function ResponsiveDragonRenderer() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [dragonSize, setDragonSize] = useState<DragonSize>('lg')

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      
      if (width < 640) {
        setScreenSize('mobile')
        setDragonSize('sm')
      } else if (width < 1024) {
        setScreenSize('tablet')  
        setDragonSize('md')
      } else {
        setScreenSize('desktop')
        setDragonSize('lg')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  // Optimize dragon type based on screen size
  const getDragonType = (): DragonType => {
    switch (screenSize) {
      case 'mobile': return 'ascii'  // ASCII for mobile
      case 'tablet': return 'ascii'  // ASCII for tablet
      case 'desktop': return '3d'    // 3D for desktop
      default: return 'ascii'
    }
  }

  return (
    <DragonRenderer
      dragonType={getDragonType()}
      size={dragonSize}
      performanceMode={screenSize === 'mobile' ? 'low' : 'auto'}
    />
  )
}
```

## 🚀 Advanced Optimization Techniques

### Web Workers for Heavy Computations

```typescript
// Dragon calculation worker
// dragon-worker.ts
self.onmessage = function(e) {
  const { type, data } = e.data
  
  switch (type) {
    case 'calculateParticles':
      const particles = calculateParticlePositions(data.count, data.time)
      self.postMessage({ type: 'particlesCalculated', particles })
      break
      
    case 'processVoiceState':
      const mappedState = processVoiceStateMapping(data.voiceState, data.dragonType)
      self.postMessage({ type: 'voiceStateProcessed', mappedState })
      break
  }
}

// Main thread usage
function useWorkerOptimizedDragon() {
  const workerRef = useRef<Worker>()
  const [particlePositions, setParticlePositions] = useState<Float32Array>()

  useEffect(() => {
    workerRef.current = new Worker('/dragon-worker.js')
    
    workerRef.current.onmessage = (e) => {
      const { type, particles, mappedState } = e.data
      
      if (type === 'particlesCalculated') {
        setParticlePositions(particles)
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const calculateParticles = useCallback((count: number, time: number) => {
    workerRef.current?.postMessage({ 
      type: 'calculateParticles', 
      data: { count, time } 
    })
  }, [])

  return { particlePositions, calculateParticles }
}
```

### Memoization and Caching

```typescript
// Memoized dragon components
const MemoizedASCIIDragon = React.memo(ASCIIDragon, (prevProps, nextProps) => {
  // Custom comparison for performance-critical props
  return (
    prevProps.pose === nextProps.pose &&
    prevProps.size === nextProps.size &&
    prevProps.speed === nextProps.speed &&
    JSON.stringify(prevProps.voiceState) === JSON.stringify(nextProps.voiceState)
  )
})

// Cached calculations
const calculationCache = new Map<string, any>()

function useCachedCalculation<T>(key: string, calculation: () => T, deps: any[]): T {
  return useMemo(() => {
    const cacheKey = `${key}-${JSON.stringify(deps)}`
    
    if (calculationCache.has(cacheKey)) {
      return calculationCache.get(cacheKey)
    }
    
    const result = calculation()
    calculationCache.set(cacheKey, result)
    
    // Limit cache size
    if (calculationCache.size > 100) {
      const firstKey = calculationCache.keys().next().value
      calculationCache.delete(firstKey)
    }
    
    return result
  }, deps)
}
```

### Preloading and Asset Optimization

```typescript
// Asset preloading system
class DragonAssetPreloader {
  private preloadedAssets = new Map<string, any>()
  private preloadPromises = new Map<string, Promise<any>>()

  async preloadTextures(textureUrls: string[]): Promise<void> {
    const promises = textureUrls.map(url => this.preloadTexture(url))
    await Promise.all(promises)
  }

  private async preloadTexture(url: string): Promise<THREE.Texture> {
    if (this.preloadedAssets.has(url)) {
      return this.preloadedAssets.get(url)
    }

    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url)
    }

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        url,
        (texture) => {
          this.preloadedAssets.set(url, texture)
          resolve(texture)
        },
        undefined,
        reject
      )
    })

    this.preloadPromises.set(url, promise)
    return promise
  }

  getPreloadedTexture(url: string): THREE.Texture | null {
    return this.preloadedAssets.get(url) || null
  }
}

// Usage in dragon components
const assetPreloader = new DragonAssetPreloader()

function PreloadedDragon3D() {
  const [texturesLoaded, setTexturesLoaded] = useState(false)

  useEffect(() => {
    const textureUrls = [
      '/textures/dragon-body.png',
      '/textures/dragon-wings.png',
      '/textures/dragon-particles.png'
    ]

    assetPreloader.preloadTextures(textureUrls).then(() => {
      setTexturesLoaded(true)
    })
  }, [])

  if (!texturesLoaded) {
    return <div>Loading dragon assets...</div>
  }

  return <Dragon3D preloadedAssets={assetPreloader} />
}
```

## 🔧 Development Tools

### Performance Profiler

```typescript
// Dragon performance profiler
class DragonPerformanceProfiler {
  private measurements: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()

  startMeasure(name: string): void {
    this.startTimes.set(name, performance.now())
  }

  endMeasure(name: string): number {
    const startTime = this.startTimes.get(name)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    
    this.measurements.get(name)!.push(duration)
    this.startTimes.delete(name)
    
    return duration
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || []
    if (measurements.length === 0) return null

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const max = Math.max(...measurements)
    const min = Math.min(...measurements)
    
    return { avg, max, min, count: measurements.length }
  }

  getAllStats() {
    const stats: Record<string, any> = {}
    
    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name)
    }
    
    return stats
  }

  reset(): void {
    this.measurements.clear()
    this.startTimes.clear()
  }
}

// Usage in dragon hooks
const profiler = new DragonPerformanceProfiler()

function useProfiledDragon() {
  useEffect(() => {
    profiler.startMeasure('dragon-render')
    
    return () => {
      profiler.endMeasure('dragon-render')
      
      // Log stats periodically
      if (Math.random() < 0.1) { // 10% sampling
        console.log('Dragon Performance Stats:', profiler.getAllStats())
      }
    }
  })
}
```

### Performance Testing

```typescript
// Performance test utilities
export class DragonPerformanceTester {
  static async runPerformanceTest(
    component: React.ReactElement,
    duration: number = 5000
  ): Promise<PerformanceTestResult> {
    const results: PerformanceTestResult = {
      avgFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      memoryUsage: [],
      renderTimes: [],
      fallbackCount: 0
    }

    const startTime = performance.now()
    let frameCount = 0
    let lastTime = startTime

    const measureFrame = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime
        results.minFPS = Math.min(results.minFPS, fps)
        results.maxFPS = Math.max(results.maxFPS, fps)
        frameCount++
      }
      
      lastTime = currentTime
      
      // Measure memory usage
      if ((performance as any).memory) {
        const memory = (performance as any).memory.usedJSHeapSize / 1024 / 1024
        results.memoryUsage.push(memory)
      }
      
      if (currentTime - startTime < duration) {
        requestAnimationFrame(measureFrame)
      } else {
        results.avgFPS = frameCount / (duration / 1000)
        console.log('Performance Test Results:', results)
      }
    }

    requestAnimationFrame(measureFrame)
    
    return new Promise(resolve => {
      setTimeout(() => resolve(results), duration)
    })
  }
}

interface PerformanceTestResult {
  avgFPS: number
  minFPS: number
  maxFPS: number
  memoryUsage: number[]
  renderTimes: number[]
  fallbackCount: number
}
```

## 📋 Performance Checklist

### Pre-deployment Checklist

- [ ] **Performance Monitoring Enabled**
  - [ ] FPS tracking implemented
  - [ ] Memory usage monitoring active
  - [ ] Performance metrics logged

- [ ] **Device Optimization**
  - [ ] Mobile-specific configurations tested
  - [ ] Low-end device fallbacks verified
  - [ ] WebGL capability detection working

- [ ] **Animation Optimization**
  - [ ] Animation frame throttling implemented
  - [ ] Unnecessary animations disabled on low performance
  - [ ] Smooth fallback transitions tested

- [ ] **Memory Management**
  - [ ] Cleanup functions implemented
  - [ ] Memory leaks checked and fixed
  - [ ] Asset preloading optimized

- [ ] **Testing**
  - [ ] Performance tests run on target devices
  - [ ] Fallback scenarios tested
  - [ ] Error handling verified

### Performance Monitoring Dashboard

```tsx
function DragonPerformanceMonitor() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [metrics, setMetrics] = useState<DragonPerformanceMetrics[]>([])

  useEffect(() => {
    if (!isEnabled) return

    const interval = setInterval(() => {
      // Collect metrics from all active dragons
      const currentMetrics = DragonPerformanceCollector.getMetrics()
      setMetrics(prev => [...prev.slice(-50), ...currentMetrics]) // Keep last 50 measurements
    }, 1000)

    return () => clearInterval(interval)
  }, [isEnabled])

  return (
    <div className="performance-monitor">
      <button onClick={() => setIsEnabled(!isEnabled)}>
        {isEnabled ? 'Disable' : 'Enable'} Performance Monitor
      </button>
      
      {isEnabled && (
        <div className="metrics-display">
          <PerformanceChart data={metrics} />
          <PerformanceTable data={metrics.slice(-10)} />
        </div>
      )}
    </div>
  )
}
```

## 🎯 Conclusion

The Seiron dragon system's performance optimization is built on:

1. **Automatic Adaptation** - Intelligent performance monitoring and quality adjustment
2. **Device Awareness** - Optimizations tailored to device capabilities
3. **Graceful Degradation** - Fallback systems ensure functionality across all devices
4. **Resource Management** - Efficient memory usage and cleanup
5. **Developer Tools** - Comprehensive profiling and monitoring tools

By following these optimization strategies, the dragon system maintains smooth performance while delivering engaging visual experiences across all devices and performance levels.

**Remember: A well-optimized dragon is a powerful dragon!** 🐉⚡