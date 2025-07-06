'use client'

import { useMemo, useRef, useCallback, useEffect } from 'react'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

// Types and interfaces
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  renderTime: number
  animationFrames: number
  droppedFrames: number
  cpuUsage: number
  timestamp: number
}

export interface LODLevel {
  level: number
  name: string
  description: string
  particleCount: number
  textureQuality: number
  animationQuality: number
  shadowQuality: number
  postProcessing: boolean
  antiAliasing: boolean
  particles: {
    enabled: boolean
  }
}

export interface MemoryManager {
  textures: Map<string, { data: any; lastUsed: number; size: number }>
  geometries: Map<string, { data: any; lastUsed: number; size: number }>
  materials: Map<string, { data: any; lastUsed: number; size: number }>
  totalSize: number
  maxSize: number
  cleanupThreshold: number
}

export interface DragonPerformanceConfig {
  targetFPS: number
  adaptiveLOD: boolean
  memoryManagement: boolean
  performanceMonitoring: boolean
  autoOptimization: boolean
  debugMode: boolean
  maxMemoryMB: number
  cleanupInterval: number
  lodTransitionSpeed: number
}

export interface DragonPerformanceState {
  currentLOD: LODLevel
  metrics: PerformanceMetrics
  memoryManager: MemoryManager
  isOptimizing: boolean
  warningsIssued: number
  lastOptimization: number
}

// LOD Levels Configuration
export const LOD_LEVELS: LODLevel[] = [
  {
    level: 0,
    name: 'Ultra',
    description: 'Maximum quality with all effects enabled',
    particleCount: 500,
    textureQuality: 1.0,
    animationQuality: 1.0,
    shadowQuality: 1.0,
    postProcessing: true,
    antiAliasing: true,
    particles: { enabled: true }
  },
  {
    level: 1,
    name: 'High',
    description: 'High quality with most effects enabled',
    particleCount: 300,
    textureQuality: 0.9,
    animationQuality: 0.9,
    shadowQuality: 0.8,
    postProcessing: true,
    antiAliasing: true,
    particles: { enabled: true }
  },
  {
    level: 2,
    name: 'Medium',
    description: 'Balanced quality and performance',
    particleCount: 150,
    textureQuality: 0.75,
    animationQuality: 0.8,
    shadowQuality: 0.6,
    postProcessing: true,
    antiAliasing: false,
    particles: { enabled: true }
  },
  {
    level: 3,
    name: 'Low',
    description: 'Performance optimized with reduced effects',
    particleCount: 50,
    textureQuality: 0.5,
    animationQuality: 0.6,
    shadowQuality: 0.3,
    postProcessing: false,
    antiAliasing: false,
    particles: { enabled: false }
  },
  {
    level: 4,
    name: 'Potato',
    description: 'Minimum quality for very low-end devices',
    particleCount: 10,
    textureQuality: 0.25,
    animationQuality: 0.4,
    shadowQuality: 0.0,
    postProcessing: false,
    antiAliasing: false,
    particles: { enabled: false }
  }
]

// Default configuration
export const DEFAULT_PERFORMANCE_CONFIG: DragonPerformanceConfig = {
  targetFPS: 60,
  adaptiveLOD: true,
  memoryManagement: true,
  performanceMonitoring: true,
  autoOptimization: true,
  debugMode: false,
  maxMemoryMB: 256,
  cleanupInterval: 30000,
  lodTransitionSpeed: 1000
}

// Performance monitoring class
export class DragonPerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private frameBuffer: number[] = []
  private readonly bufferSize = 60 // Track last 60 frames
  private animationFrameId: number | null = null
  
  constructor(
    private onMetricsUpdate: (metrics: PerformanceMetrics) => void,
    private config: DragonPerformanceConfig
  ) {
    this.startMonitoring()
  }

  private startMonitoring() {
    const monitor = () => {
      const now = performance.now()
      const frameTime = now - this.lastTime
      this.lastTime = now
      
      // Add to frame buffer
      this.frameBuffer.push(frameTime)
      if (this.frameBuffer.length > this.bufferSize) {
        this.frameBuffer.shift()
      }
      
      // Calculate metrics every 60 frames
      if (this.frameCount % 60 === 0) {
        this.calculateAndReportMetrics()
      }
      
      this.frameCount++
      
      if (this.config.performanceMonitoring) {
        this.animationFrameId = requestAnimationFrame(monitor)
      }
    }
    
    this.animationFrameId = requestAnimationFrame(monitor)
  }

  private calculateAndReportMetrics() {
    const avgFrameTime = this.frameBuffer.reduce((a, b) => a + b, 0) / this.frameBuffer.length
    const fps = Math.round(1000 / avgFrameTime)
    const memoryUsage = this.getMemoryUsage()
    
    const metrics: PerformanceMetrics = {
      fps,
      frameTime: avgFrameTime,
      memoryUsage,
      renderTime: avgFrameTime * 0.7, // Estimate
      animationFrames: this.frameCount,
      droppedFrames: Math.max(0, this.frameBuffer.filter(ft => ft > 16.67).length),
      cpuUsage: this.estimateCPUUsage(avgFrameTime),
      timestamp: Date.now()
    }
    
    this.onMetricsUpdate(metrics)
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
    }
    return 0
  }

  private estimateCPUUsage(frameTime: number): number {
    // Simple heuristic: higher frame times suggest higher CPU usage
    const targetFrameTime = 1000 / this.config.targetFPS
    return Math.min(100, (frameTime / targetFrameTime) * 50)
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
}

// Memory manager implementation
export class DragonMemoryManager {
  private textures = new Map<string, { data: any; lastUsed: number; size: number }>()
  private geometries = new Map<string, { data: any; lastUsed: number; size: number }>()
  private materials = new Map<string, { data: any; lastUsed: number; size: number }>()
  private totalSize = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(
    private config: DragonPerformanceConfig,
    private onMemoryWarning: (usage: number, max: number) => void
  ) {
    this.startCleanupRoutine()
  }

  private startCleanupRoutine() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  public store(category: 'textures' | 'geometries' | 'materials', key: string, data: any, size: number) {
    const now = Date.now()
    const item = { data, lastUsed: now, size }
    
    const storage = this.getStorage(category)
    const oldItem = storage.get(key)
    
    if (oldItem) {
      this.totalSize -= oldItem.size
    }
    
    storage.set(key, item)
    this.totalSize += size
    
    // Check memory limit
    const maxSizeBytes = this.config.maxMemoryMB * 1024 * 1024
    if (this.totalSize > maxSizeBytes * 0.9) {
      this.onMemoryWarning(this.totalSize / (1024 * 1024), this.config.maxMemoryMB)
      this.forceCleanup()
    }
  }

  public retrieve(category: 'textures' | 'geometries' | 'materials', key: string): O.Option<any> {
    const storage = this.getStorage(category)
    const item = storage.get(key)
    
    if (item) {
      item.lastUsed = Date.now()
      return O.some(item.data)
    }
    
    return O.none
  }

  public remove(category: 'textures' | 'geometries' | 'materials', key: string): boolean {
    const storage = this.getStorage(category)
    const item = storage.get(key)
    
    if (item) {
      storage.delete(key)
      this.totalSize -= item.size
      return true
    }
    
    return false
  }

  private getStorage(category: 'textures' | 'geometries' | 'materials') {
    switch (category) {
      case 'textures': return this.textures
      case 'geometries': return this.geometries
      case 'materials': return this.materials
    }
  }

  private cleanup() {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    this.cleanupCategory(this.textures, now, maxAge)
    this.cleanupCategory(this.geometries, now, maxAge)
    this.cleanupCategory(this.materials, now, maxAge)
  }

  private forceCleanup() {
    const now = Date.now()
    const maxAge = 2 * 60 * 1000 // 2 minutes for force cleanup
    
    this.cleanupCategory(this.textures, now, maxAge)
    this.cleanupCategory(this.geometries, now, maxAge)
    this.cleanupCategory(this.materials, now, maxAge)
  }

  private cleanupCategory(storage: Map<string, any>, now: number, maxAge: number) {
    const toDelete: string[] = []
    
    storage.forEach((item, key) => {
      if (now - item.lastUsed > maxAge) {
        toDelete.push(key)
      }
    })
    
    toDelete.forEach(key => {
      const item = storage.get(key)
      if (item) {
        storage.delete(key)
        this.totalSize -= item.size
      }
    })
  }

  public getStats() {
    return {
      textures: this.textures.size,
      geometries: this.geometries.size,
      materials: this.materials.size,
      totalSize: this.totalSize,
      totalSizeMB: this.totalSize / (1024 * 1024)
    }
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.textures.clear()
    this.geometries.clear()
    this.materials.clear()
    this.totalSize = 0
  }
}

// LOD selection functions
export const selectLODLevel = (
  metrics: PerformanceMetrics,
  targetFPS: number,
  currentLOD: LODLevel
): LODLevel => {
  const { fps, memoryUsage, cpuUsage } = metrics
  
  // Performance score based on multiple factors
  const fpsScore = Math.min(100, (fps / targetFPS) * 100)
  const memoryScore = Math.max(0, 100 - memoryUsage) // Lower memory usage = higher score
  const cpuScore = Math.max(0, 100 - cpuUsage)
  
  const overallScore = (fpsScore * 0.5) + (memoryScore * 0.3) + (cpuScore * 0.2)
  
  // Determine target LOD level based on performance
  let targetLevel: number
  
  if (overallScore >= 85) {
    targetLevel = 0 // Ultra
  } else if (overallScore >= 70) {
    targetLevel = 1 // High
  } else if (overallScore >= 55) {
    targetLevel = 2 // Medium
  } else if (overallScore >= 40) {
    targetLevel = 3 // Low
  } else {
    targetLevel = 4 // Potato
  }
  
  // Prevent rapid LOD switching (hysteresis)
  const currentLevel = currentLOD.level
  if (Math.abs(targetLevel - currentLevel) === 1) {
    // Only switch if performance difference is significant
    if (overallScore < 45 || overallScore > 85) {
      return LOD_LEVELS[targetLevel] || LOD_LEVELS[2]!
    }
    return currentLOD
  }
  
  return LOD_LEVELS[targetLevel] || LOD_LEVELS[2]!
}

// Animation frame optimization
export const createOptimizedAnimationLoop = (
  callback: (deltaTime: number) => void,
  targetFPS: number = 60
) => {
  let lastTime = performance.now()
  let animationId: number | null = null
  let fpsInterval = 1000 / targetFPS
  
  const loop = (currentTime: number) => {
    const deltaTime = currentTime - lastTime
    
    if (deltaTime >= fpsInterval) {
      callback(deltaTime)
      lastTime = currentTime - (deltaTime % fpsInterval)
    }
    
    animationId = requestAnimationFrame(loop)
  }
  
  const start = () => {
    lastTime = performance.now()
    animationId = requestAnimationFrame(loop)
  }
  
  const stop = () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }
  
  return { start, stop }
}

// Debounced resize handler
export const createDeboungedResizeHandler = (
  callback: (width: number, height: number) => void,
  delay: number = 250
) => {
  let timeoutId: NodeJS.Timeout | null = null
  
  const handler = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      callback(window.innerWidth, window.innerHeight)
    }, delay)
  }
  
  return handler
}

// Memoization utilities for expensive calculations
export const createMemoizedCalculation = <T, R>(
  fn: (input: T) => R,
  keyGenerator: (input: T) => string,
  maxCacheSize: number = 100
) => {
  const cache = new Map<string, { result: R; timestamp: number }>()
  
  return (input: T): R => {
    const key = keyGenerator(input)
    const cached = cache.get(key)
    
    if (cached) {
      cached.timestamp = Date.now()
      return cached.result
    }
    
    const result = fn(input)
    
    // Clean cache if it's getting too large
    if (cache.size >= maxCacheSize) {
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toDelete = entries.slice(0, Math.floor(maxCacheSize * 0.3))
      toDelete.forEach(([key]) => cache.delete(key))
    }
    
    cache.set(key, { result, timestamp: Date.now() })
    return result
  }
}

// Performance-aware prop comparison
export const createPerformancePropComparison = <T extends Record<string, any>>(
  heavyProps: Array<keyof T> = []
) => {
  return (prevProps: T, nextProps: T): boolean => {
    // Quick reference check first
    if (prevProps === nextProps) return true
    
    // Check if any keys are different
    const prevKeys = Object.keys(prevProps)
    const nextKeys = Object.keys(nextProps)
    
    if (prevKeys.length !== nextKeys.length) return false
    
    // Shallow comparison for light props
    for (const key of prevKeys) {
      if (!heavyProps.includes(key as keyof T)) {
        if (prevProps[key] !== nextProps[key]) return false
      }
    }
    
    // Deep comparison for heavy props (only if necessary)
    for (const key of heavyProps) {
      if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
        return false
      }
    }
    
    return true
  }
}

// Component optimization utilities
export const shouldComponentUpdate = (
  prevProps: any,
  nextProps: any,
  performanceMode: boolean = false
): boolean => {
  if (performanceMode) {
    // In performance mode, use shallow comparison only
    return Object.keys(nextProps).some(key => prevProps[key] !== nextProps[key])
  }
  
  // Standard deep comparison
  return JSON.stringify(prevProps) !== JSON.stringify(nextProps)
}

// Animation quality adjustment
export const adjustAnimationQuality = (
  baseConfig: any,
  lodLevel: LODLevel,
  performanceScore: number
): any => {
  const quality = lodLevel.animationQuality
  const performanceFactor = Math.max(0.3, performanceScore / 100)
  
  return {
    ...baseConfig,
    duration: baseConfig.duration / (quality * performanceFactor),
    stiffness: baseConfig.stiffness * quality,
    damping: baseConfig.damping / quality,
    mass: baseConfig.mass || 1,
    precision: Math.max(0.01, quality * 0.01)
  }
}

// Texture quality adjustment
export const adjustTextureQuality = (
  originalSize: number,
  lodLevel: LODLevel
): number => {
  return Math.max(32, Math.floor(originalSize * lodLevel.textureQuality))
}

// Particle count adjustment
export const adjustParticleCount = (
  baseCount: number,
  lodLevel: LODLevel,
  memoryPressure: number = 0
): number => {
  const memoryFactor = Math.max(0.1, 1 - memoryPressure)
  return Math.floor(baseCount * (lodLevel.particleCount / 500) * memoryFactor)
}

// Performance warning system
export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'cpu' | 'animation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  metrics: Partial<PerformanceMetrics>
}

export const createPerformanceWarning = (
  type: PerformanceWarning['type'],
  severity: PerformanceWarning['severity'],
  message: string,
  metrics: Partial<PerformanceMetrics>
): PerformanceWarning => ({
  type,
  severity,
  message,
  timestamp: Date.now(),
  metrics
})

export const analyzePerformanceMetrics = (
  metrics: PerformanceMetrics,
  targetFPS: number
): PerformanceWarning[] => {
  const warnings: PerformanceWarning[] = []
  
  // FPS warnings
  if (metrics.fps < targetFPS * 0.5) {
    warnings.push(createPerformanceWarning(
      'fps',
      'critical',
      `FPS severely below target: ${metrics.fps}/${targetFPS}`,
      { fps: metrics.fps }
    ))
  } else if (metrics.fps < targetFPS * 0.7) {
    warnings.push(createPerformanceWarning(
      'fps',
      'high',
      `FPS below target: ${metrics.fps}/${targetFPS}`,
      { fps: metrics.fps }
    ))
  }
  
  // Memory warnings
  if (metrics.memoryUsage > 200) {
    warnings.push(createPerformanceWarning(
      'memory',
      'critical',
      `Memory usage very high: ${metrics.memoryUsage.toFixed(1)}MB`,
      { memoryUsage: metrics.memoryUsage }
    ))
  } else if (metrics.memoryUsage > 150) {
    warnings.push(createPerformanceWarning(
      'memory',
      'high',
      `Memory usage high: ${metrics.memoryUsage.toFixed(1)}MB`,
      { memoryUsage: metrics.memoryUsage }
    ))
  }
  
  // CPU warnings
  if (metrics.cpuUsage > 80) {
    warnings.push(createPerformanceWarning(
      'cpu',
      'high',
      `CPU usage high: ${metrics.cpuUsage.toFixed(1)}%`,
      { cpuUsage: metrics.cpuUsage }
    ))
  }
  
  // Animation warnings
  if (metrics.droppedFrames > 10) {
    warnings.push(createPerformanceWarning(
      'animation',
      'medium',
      `Animation dropping frames: ${metrics.droppedFrames}`,
      { droppedFrames: metrics.droppedFrames }
    ))
  }
  
  return warnings
}

// Hook for using dragon performance optimization
export interface UseDragonPerformanceOptions {
  config?: Partial<DragonPerformanceConfig>
  onWarning?: (warning: PerformanceWarning) => void
  onLODChange?: (newLOD: LODLevel, oldLOD: LODLevel) => void
  onMemoryWarning?: (usage: number, max: number) => void
}

export const useDragonPerformance = (options: UseDragonPerformanceOptions = {}) => {
  const config = useMemo(() => ({
    ...DEFAULT_PERFORMANCE_CONFIG,
    ...options.config
  }), [options.config])

  const performanceStateRef = useRef<DragonPerformanceState>({
    currentLOD: LOD_LEVELS[2]!, // Start with medium
    metrics: {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      renderTime: 12,
      animationFrames: 0,
      droppedFrames: 0,
      cpuUsage: 0,
      timestamp: Date.now()
    },
    memoryManager: {
      textures: new Map(),
      geometries: new Map(),
      materials: new Map(),
      totalSize: 0,
      maxSize: config.maxMemoryMB * 1024 * 1024,
      cleanupThreshold: 0.8
    },
    isOptimizing: false,
    warningsIssued: 0,
    lastOptimization: 0
  })
  const memoryManagerRef = useRef<DragonMemoryManager | null>(null)
  const performanceMonitorRef = useRef<DragonPerformanceMonitor | null>(null)

  // Initialize managers
  useEffect(() => {
    if (config.memoryManagement && !memoryManagerRef.current) {
      memoryManagerRef.current = new DragonMemoryManager(
        config,
        (usage, max) => {
          options.onMemoryWarning?.(usage, max)
        }
      )
    }

    if (config.performanceMonitoring && !performanceMonitorRef.current) {
      performanceMonitorRef.current = new DragonPerformanceMonitor(
        (metrics) => {
          if (performanceStateRef.current) {
            performanceStateRef.current.metrics = metrics
            
            // Analyze for warnings
            const warnings = analyzePerformanceMetrics(metrics, config.targetFPS)
            warnings.forEach(warning => {
              options.onWarning?.(warning)
              if (performanceStateRef.current) {
                performanceStateRef.current.warningsIssued++
              }
            })
          }
          
          // Auto LOD adjustment
          if (config.adaptiveLOD && performanceStateRef.current) {
            const newLOD = selectLODLevel(
              metrics,
              config.targetFPS,
              performanceStateRef.current.currentLOD
            )
            
            if (newLOD.level !== performanceStateRef.current.currentLOD.level) {
              const oldLOD = performanceStateRef.current.currentLOD
              performanceStateRef.current.currentLOD = newLOD
              options.onLODChange?.(newLOD, oldLOD)
            }
          }
        },
        config
      )
    }

    return () => {
      memoryManagerRef.current?.destroy()
      performanceMonitorRef.current?.stop()
    }
  }, [config, options])

  const setLODLevel = useCallback((level: number) => {
    if (!performanceStateRef.current) return
    const newLOD = LOD_LEVELS[Math.max(0, Math.min(4, level))]!
    const oldLOD = performanceStateRef.current.currentLOD
    performanceStateRef.current.currentLOD = newLOD
    options.onLODChange?.(newLOD, oldLOD)
  }, [options])

  const optimizeForPerformance = useCallback(() => {
    if (!performanceStateRef.current) return
    const now = Date.now()
    if (now - performanceStateRef.current.lastOptimization < 1000) return
    
    performanceStateRef.current.isOptimizing = true
    performanceStateRef.current.lastOptimization = now
    
    // Force memory cleanup
    memoryManagerRef.current?.getStats()
    
    // Lower LOD if performance is poor
    const metrics = performanceStateRef.current.metrics
    if (metrics.fps < config.targetFPS * 0.8) {
      const currentLevel = performanceStateRef.current.currentLOD.level
      if (currentLevel < LOD_LEVELS.length - 1) {
        setLODLevel(currentLevel + 1)
      }
    }
    
    setTimeout(() => {
      if (performanceStateRef.current) {
        performanceStateRef.current.isOptimizing = false
      }
    }, 500)
  }, [config.targetFPS, setLODLevel])

  return {
    // Current state
    currentLOD: performanceStateRef.current?.currentLOD ?? LOD_LEVELS[2],
    metrics: performanceStateRef.current?.metrics || {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      renderTime: 12,
      animationFrames: 0,
      droppedFrames: 0,
      cpuUsage: 0,
      timestamp: Date.now()
    },
    isOptimizing: performanceStateRef.current?.isOptimizing || false,
    
    // Controls
    setLODLevel,
    optimizeForPerformance,
    
    // Memory management
    storeInMemory: (category: 'textures' | 'geometries' | 'materials', key: string, data: any, size: number) =>
      memoryManagerRef.current?.store(category, key, data, size),
    retrieveFromMemory: (category: 'textures' | 'geometries' | 'materials', key: string) =>
      memoryManagerRef.current?.retrieve(category, key) || O.none,
    
    // Utilities
    shouldReduceQuality: (performanceStateRef.current?.metrics.fps || 60) < config.targetFPS * 0.8,
    shouldDisableAnimations: (performanceStateRef.current?.metrics.fps || 60) < config.targetFPS * 0.6,
    memoryStats: memoryManagerRef.current?.getStats() || { textures: 0, geometries: 0, materials: 0, totalSizeMB: 0 },
    
    // Configuration
    config
  }
}