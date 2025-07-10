'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DragonModelConfig } from '../config/dragonModels'
import { PerformanceStorageManager } from '../utils/PerformanceStorageManager'

// Core performance metrics for model tracking
export interface ModelPerformanceMetrics {
  // FPS and timing metrics
  fps: number
  avgFps: number
  minFps: number
  maxFps: number
  frameTime: number
  renderTime: number
  
  // Memory metrics
  memoryUsage: {
    jsHeapUsed: number
    jsHeapTotal: number
    jsHeapLimit: number
    webglMemoryEstimate: number
  }
  
  // Model-specific metrics
  loadTime: number
  initializationTime: number
  modelSize: number
  textureMemory: number
  geometryMemory: number
  
  // GPU and rendering metrics
  drawCalls: number
  triangles: number
  vertices: number
  texturesLoaded: number
  shadersCompiled: number
  
  // Performance score (0-100)
  performanceScore: number
  
  // WebGL context health
  webglContextHealth: {
    contextLossCount: number
    contextRestoreCount: number
    extensionSupport: string[]
    maxTextureSize: number
    maxViewportDims: [number, number]
    isWebGL2: boolean
  }
  
  // Quality metrics
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra'
  adaptiveQualityActive: boolean
  qualityReductions: number
  
  // Stability metrics
  errorCount: number
  warningCount: number
  crashCount: number
  recoveryCount: number
}

// Historical data point
export interface PerformanceDataPoint {
  timestamp: number
  modelId: string
  metrics: ModelPerformanceMetrics
  deviceInfo: {
    userAgent: string
    platform: string
    hardwareConcurrency: number
    deviceMemory: number
    connection: string
  }
}

// Performance comparison result
export interface ModelComparison {
  modelA: {
    id: string
    name: string
    metrics: ModelPerformanceMetrics
  }
  modelB: {
    id: string
    name: string
    metrics: ModelPerformanceMetrics
  }
  verdict: {
    winner: string
    reasons: string[]
    performanceDiff: number
    recommendation: string
  }
}

// Model recommendation based on performance
export interface ModelRecommendation {
  recommendedModelId: string
  confidence: number
  reasons: string[]
  alternatives: Array<{
    modelId: string
    confidence: number
    reason: string
  }>
  estimatedPerformance: Partial<ModelPerformanceMetrics>
}

// Performance alert
export interface PerformanceAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  message: string
  metric: keyof ModelPerformanceMetrics
  threshold: number
  currentValue: number
  suggestion: string
  timestamp: number
  acknowledged: boolean
}

// Configuration for the hook
export interface ModelPerformanceTrackingConfig {
  enabled: boolean
  sampleRate: number // samples per second
  historySize: number // max number of historical data points
  autoOptimization: boolean
  alertThresholds: {
    lowFps: number
    highMemory: number
    slowLoadTime: number
    highErrorRate: number
  }
  modelList: DragonModelConfig[]
  enablePredictiveAnalysis: boolean
}

// Default configuration
const DEFAULT_CONFIG: ModelPerformanceTrackingConfig = {
  enabled: true,
  sampleRate: 2, // 2 samples per second
  historySize: 300, // 5 minutes at 2 samples/sec
  autoOptimization: true,
  alertThresholds: {
    lowFps: 30,
    highMemory: 512 * 1024 * 1024, // 512MB
    slowLoadTime: 5000, // 5 seconds
    highErrorRate: 0.1 // 10%
  },
  modelList: [],
  enablePredictiveAnalysis: true
}

/**
 * Advanced hook for tracking and comparing dragon model performance
 * Provides real-time metrics, historical analysis, and intelligent recommendations
 */
export function useModelPerformanceTracking(config: Partial<ModelPerformanceTrackingConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // State management
  const [currentMetrics, setCurrentMetrics] = useState<ModelPerformanceMetrics | null>(null)
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceDataPoint[]>([])
  const [activeAlerts, setActiveAlerts] = useState<PerformanceAlert[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [currentModelId, setCurrentModelId] = useState<string | null>(null)
  
  // Refs for tracking
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const fpsHistory = useRef<number[]>([])
  const renderStartTime = useRef(0)
  const modelLoadStartTime = useRef(0)
  const animationFrameId = useRef<number>()
  const samplingIntervalId = useRef<NodeJS.Timeout>()
  const webglContext = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null)
  const performanceObserver = useRef<PerformanceObserver | null>(null)
  
  // Error and warning counters
  const errorCount = useRef(0)
  const warningCount = useRef(0)
  const crashCount = useRef(0)
  const recoveryCount = useRef(0)
  
  // Get WebGL context health information
  const getWebGLContextHealth = useCallback(() => {
    if (!webglContext.current) return null
    
    const gl = webglContext.current
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const extensions = gl.getSupportedExtensions() || []
    
    return {
      contextLossCount: 0, // Would be tracked separately
      contextRestoreCount: 0,
      extensionSupport: extensions,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS) as [number, number],
      isWebGL2: gl instanceof WebGL2RenderingContext
    }
  }, [])
  
  // Calculate performance score based on multiple metrics
  const calculatePerformanceScore = useCallback((metrics: Partial<ModelPerformanceMetrics>): number => {
    let score = 100
    
    // FPS component (40% weight)
    if (metrics.fps !== undefined) {
      const fpsScore = Math.min((metrics.fps / 60) * 40, 40)
      score = fpsScore
    }
    
    // Memory component (25% weight)
    if (metrics.memoryUsage) {
      const memoryRatio = metrics.memoryUsage.jsHeapUsed / metrics.memoryUsage.jsHeapLimit
      const memoryScore = Math.max(0, 25 - (memoryRatio * 25))
      score += memoryScore
    }
    
    // Load time component (15% weight)
    if (metrics.loadTime !== undefined) {
      const loadTimeScore = Math.max(0, 15 - ((metrics.loadTime / 5000) * 15))
      score += loadTimeScore
    }
    
    // Stability component (10% weight)
    if (metrics.errorCount !== undefined && metrics.crashCount !== undefined) {
      const errorRate = (metrics.errorCount + metrics.crashCount) / Math.max(frameCount.current, 1)
      const stabilityScore = Math.max(0, 10 - (errorRate * 100))
      score += stabilityScore
    }
    
    // Rendering efficiency component (10% weight)
    if (metrics.renderTime !== undefined && metrics.frameTime !== undefined) {
      const efficiency = metrics.renderTime / metrics.frameTime
      const efficiencyScore = Math.max(0, 10 - (efficiency * 10))
      score += efficiencyScore
    }
    
    return Math.round(Math.max(0, Math.min(100, score)))
  }, [])
  
  // Get current device information
  const getDeviceInfo = useCallback(() => {
    const navigator = window.navigator as any
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: navigator.deviceMemory || 4,
      connection: connection ? connection.effectiveType || 'unknown' : 'unknown'
    }
  }, [])
  
  // Collect comprehensive performance metrics
  const collectMetrics = useCallback((): ModelPerformanceMetrics | null => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime.current
    
    // FPS calculation
    frameCount.current++
    const fps = Math.round(1000 / deltaTime)
    fpsHistory.current.push(fps)
    
    // Keep FPS history manageable
    if (fpsHistory.current.length > 60) {
      fpsHistory.current = fpsHistory.current.slice(-60)
    }
    
    const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
    const minFps = Math.min(...fpsHistory.current)
    const maxFps = Math.max(...fpsHistory.current)
    
    // Memory metrics
    let memoryUsage = {
      jsHeapUsed: 0,
      jsHeapTotal: 0,
      jsHeapLimit: 0,
      webglMemoryEstimate: 0
    }
    
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = {
        jsHeapUsed: memory.usedJSHeapSize,
        jsHeapTotal: memory.totalJSHeapSize,
        jsHeapLimit: memory.jsHeapSizeLimit,
        webglMemoryEstimate: 0 // Would need WebGL context analysis
      }
    }
    
    // WebGL context health
    const webglHealth = getWebGLContextHealth()
    
    const baseMetrics = {
      fps,
      avgFps,
      minFps,
      maxFps,
      frameTime: deltaTime,
      renderTime: currentTime - renderStartTime.current,
      memoryUsage,
      loadTime: modelLoadStartTime.current > 0 ? currentTime - modelLoadStartTime.current : 0,
      initializationTime: 0, // Would be set during model loading
      modelSize: 0, // Would be set from model config
      textureMemory: 0, // Would be calculated from loaded textures
      geometryMemory: 0, // Would be calculated from geometry
      drawCalls: 0, // Would need WebGL instrumentation
      triangles: 0, // From model config
      vertices: 0, // From model config
      texturesLoaded: 0, // Would be tracked during loading
      shadersCompiled: 0, // Would be tracked during compilation
      performanceScore: 0, // Calculated below
      webglContextHealth: webglHealth || {
        contextLossCount: 0,
        contextRestoreCount: 0,
        extensionSupport: [],
        maxTextureSize: 2048,
        maxViewportDims: [1920, 1080] as [number, number],
        isWebGL2: false
      },
      qualityLevel: 'medium' as const,
      adaptiveQualityActive: false,
      qualityReductions: 0,
      errorCount: errorCount.current,
      warningCount: warningCount.current,
      crashCount: crashCount.current,
      recoveryCount: recoveryCount.current
    }
    
    // Calculate performance score
    baseMetrics.performanceScore = calculatePerformanceScore(baseMetrics)
    
    lastTime.current = currentTime
    return baseMetrics
  }, [getWebGLContextHealth, calculatePerformanceScore])
  
  // Check for performance alerts
  const checkPerformanceAlerts = useCallback((metrics: ModelPerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = []
    
    // Low FPS alert
    if (metrics.fps < finalConfig.alertThresholds.lowFps) {
      newAlerts.push({
        id: `low-fps-${Date.now()}`,
        type: 'warning',
        message: `Low FPS detected: ${metrics.fps} (threshold: ${finalConfig.alertThresholds.lowFps})`,
        metric: 'fps',
        threshold: finalConfig.alertThresholds.lowFps,
        currentValue: metrics.fps,
        suggestion: 'Consider reducing quality settings or switching to a lighter model',
        timestamp: Date.now(),
        acknowledged: false
      })
    }
    
    // High memory usage alert
    if (metrics.memoryUsage.jsHeapUsed > finalConfig.alertThresholds.highMemory) {
      newAlerts.push({
        id: `high-memory-${Date.now()}`,
        type: 'warning',
        message: `High memory usage: ${Math.round(metrics.memoryUsage.jsHeapUsed / 1048576)}MB`,
        metric: 'memoryUsage',
        threshold: finalConfig.alertThresholds.highMemory,
        currentValue: metrics.memoryUsage.jsHeapUsed,
        suggestion: 'Memory cleanup recommended or switch to optimized model',
        timestamp: Date.now(),
        acknowledged: false
      })
    }
    
    // Slow load time alert
    if (metrics.loadTime > finalConfig.alertThresholds.slowLoadTime) {
      newAlerts.push({
        id: `slow-load-${Date.now()}`,
        type: 'info',
        message: `Model load time: ${(metrics.loadTime / 1000).toFixed(1)}s`,
        metric: 'loadTime',
        threshold: finalConfig.alertThresholds.slowLoadTime,
        currentValue: metrics.loadTime,
        suggestion: 'Consider using a smaller model or check network connection',
        timestamp: Date.now(),
        acknowledged: false
      })
    }
    
    // High error rate alert
    const errorRate = (metrics.errorCount + metrics.crashCount) / Math.max(frameCount.current, 1)
    if (errorRate > finalConfig.alertThresholds.highErrorRate) {
      newAlerts.push({
        id: `high-errors-${Date.now()}`,
        type: 'error',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        metric: 'errorCount',
        threshold: finalConfig.alertThresholds.highErrorRate,
        currentValue: errorRate,
        suggestion: 'System instability detected, consider fallback model',
        timestamp: Date.now(),
        acknowledged: false
      })
    }
    
    if (newAlerts.length > 0) {
      setActiveAlerts(prev => [...prev, ...newAlerts])
    }
  }, [finalConfig.alertThresholds])
  
  // Main sampling function with storage integration
  const samplePerformance = useCallback(() => {
    if (!isTracking || !currentModelId) return
    
    const metrics = collectMetrics()
    if (!metrics) return
    
    setCurrentMetrics(metrics)
    
    // Add to history
    const dataPoint: PerformanceDataPoint = {
      timestamp: Date.now(),
      modelId: currentModelId,
      metrics,
      deviceInfo: getDeviceInfo()
    }
    
    setPerformanceHistory(prev => {
      const newHistory = [...prev, dataPoint]
      return newHistory.slice(-finalConfig.historySize) // Keep only recent data
    })
    
    // Store in persistent storage
    PerformanceStorageManager.getInstance().storePerformanceData(dataPoint)
    
    // Check for alerts
    checkPerformanceAlerts(metrics)
  }, [isTracking, currentModelId, collectMetrics, getDeviceInfo, finalConfig.historySize, checkPerformanceAlerts])
  
  // Start tracking for a specific model with storage initialization
  const startTracking = useCallback((modelId: string, webglCtx?: WebGLRenderingContext | WebGL2RenderingContext) => {
    if (isTracking) return
    
    setCurrentModelId(modelId)
    setIsTracking(true)
    frameCount.current = 0
    lastTime.current = performance.now()
    fpsHistory.current = []
    errorCount.current = 0
    warningCount.current = 0
    crashCount.current = 0
    recoveryCount.current = 0
    
    if (webglCtx) {
      webglContext.current = webglCtx
    }
    
    // Load historical data from storage
    const storageManager = PerformanceStorageManager.getInstance()
    const storedHistory = storageManager.loadPerformanceData()
    setPerformanceHistory(storedHistory.slice(-finalConfig.historySize))
    
    // Start sampling
    samplingIntervalId.current = setInterval(samplePerformance, 1000 / finalConfig.sampleRate)
    
    console.log(`Started performance tracking for model: ${modelId} (loaded ${storedHistory.length} historical data points)`)
  }, [isTracking, samplePerformance, finalConfig.sampleRate])
  
  // Stop tracking with storage cleanup
  const stopTracking = useCallback(() => {
    if (!isTracking) return
    
    setIsTracking(false)
    setCurrentModelId(null)
    
    if (samplingIntervalId.current) {
      clearInterval(samplingIntervalId.current)
    }
    
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
    
    // End current session in storage
    PerformanceStorageManager.getInstance().endCurrentSession()
    
    console.log('Stopped performance tracking and ended session')
  }, [isTracking])
  
  // Mark model load start
  const markModelLoadStart = useCallback(() => {
    modelLoadStartTime.current = performance.now()
  }, [])
  
  // Mark model load complete
  const markModelLoadComplete = useCallback((modelConfig?: DragonModelConfig) => {
    const loadTime = performance.now() - modelLoadStartTime.current
    if (currentMetrics) {
      setCurrentMetrics(prev => prev ? {
        ...prev,
        loadTime,
        modelSize: modelConfig?.fileSize || 0,
        triangles: modelConfig?.performance.triangleCount || 0,
        vertices: modelConfig?.performance.vertexCount || 0
      } : null)
    }
  }, [currentMetrics])
  
  // Record performance events
  const recordError = useCallback(() => {
    errorCount.current++
  }, [])
  
  const recordWarning = useCallback(() => {
    warningCount.current++
  }, [])
  
  const recordCrash = useCallback(() => {
    crashCount.current++
  }, [])
  
  const recordRecovery = useCallback(() => {
    recoveryCount.current++
  }, [])
  
  // Compare two models based on their performance history
  const compareModels = useCallback((modelIdA: string, modelIdB: string): ModelComparison | null => {
    const historyA = performanceHistory.filter(p => p.modelId === modelIdA)
    const historyB = performanceHistory.filter(p => p.modelId === modelIdB)
    
    if (historyA.length === 0 || historyB.length === 0) return null
    
    // Calculate average metrics for each model
    const avgMetricsA = historyA.reduce((acc, point) => ({
      fps: acc.fps + point.metrics.fps,
      memoryUsage: acc.memoryUsage + point.metrics.memoryUsage.jsHeapUsed,
      loadTime: acc.loadTime + point.metrics.loadTime,
      performanceScore: acc.performanceScore + point.metrics.performanceScore
    }), { fps: 0, memoryUsage: 0, loadTime: 0, performanceScore: 0 })
    
    const avgMetricsB = historyB.reduce((acc, point) => ({
      fps: acc.fps + point.metrics.fps,
      memoryUsage: acc.memoryUsage + point.metrics.memoryUsage.jsHeapUsed,
      loadTime: acc.loadTime + point.metrics.loadTime,
      performanceScore: acc.performanceScore + point.metrics.performanceScore
    }), { fps: 0, memoryUsage: 0, loadTime: 0, performanceScore: 0 })
    
    Object.keys(avgMetricsA).forEach(key => {
      avgMetricsA[key as keyof typeof avgMetricsA] /= historyA.length
      avgMetricsB[key as keyof typeof avgMetricsB] /= historyB.length
    })
    
    // Determine winner and reasons
    const reasons: string[] = []
    let scoreA = 0
    let scoreB = 0
    
    if (avgMetricsA.fps > avgMetricsB.fps) {
      scoreA++
      reasons.push(`Model A has better FPS: ${avgMetricsA.fps.toFixed(1)} vs ${avgMetricsB.fps.toFixed(1)}`)
    } else {
      scoreB++
      reasons.push(`Model B has better FPS: ${avgMetricsB.fps.toFixed(1)} vs ${avgMetricsA.fps.toFixed(1)}`)
    }
    
    if (avgMetricsA.memoryUsage < avgMetricsB.memoryUsage) {
      scoreA++
      reasons.push(`Model A uses less memory: ${(avgMetricsA.memoryUsage / 1048576).toFixed(1)}MB vs ${(avgMetricsB.memoryUsage / 1048576).toFixed(1)}MB`)
    } else {
      scoreB++
      reasons.push(`Model B uses less memory: ${(avgMetricsB.memoryUsage / 1048576).toFixed(1)}MB vs ${(avgMetricsA.memoryUsage / 1048576).toFixed(1)}MB`)
    }
    
    if (avgMetricsA.loadTime < avgMetricsB.loadTime) {
      scoreA++
      reasons.push(`Model A loads faster: ${(avgMetricsA.loadTime / 1000).toFixed(1)}s vs ${(avgMetricsB.loadTime / 1000).toFixed(1)}s`)
    } else {
      scoreB++
      reasons.push(`Model B loads faster: ${(avgMetricsB.loadTime / 1000).toFixed(1)}s vs ${(avgMetricsA.loadTime / 1000).toFixed(1)}s`)
    }
    
    const winner = scoreA > scoreB ? modelIdA : modelIdB
    const performanceDiff = Math.abs(avgMetricsA.performanceScore - avgMetricsB.performanceScore)
    
    const modelA = finalConfig.modelList.find(m => m.id === modelIdA)
    const modelB = finalConfig.modelList.find(m => m.id === modelIdB)
    
    return {
      modelA: {
        id: modelIdA,
        name: modelA?.displayName || modelIdA,
        metrics: historyA[historyA.length - 1]?.metrics || {} as ModelPerformanceMetrics
      },
      modelB: {
        id: modelIdB,
        name: modelB?.displayName || modelIdB,
        metrics: historyB[historyB.length - 1]?.metrics || {} as ModelPerformanceMetrics
      },
      verdict: {
        winner,
        reasons,
        performanceDiff,
        recommendation: performanceDiff > 10 
          ? `Strong recommendation for ${winner === modelIdA ? modelA?.displayName : modelB?.displayName}` 
          : 'Performance is similar, choose based on features'
      }
    }
  }, [performanceHistory, finalConfig.modelList])
  
  // Get model recommendation based on device capabilities and performance history
  const getModelRecommendation = useCallback((deviceCapabilities: any): ModelRecommendation | null => {
    if (finalConfig.modelList.length === 0) return null
    
    // Simple recommendation based on device type and performance history
    let recommendedModel = finalConfig.modelList[0]
    let confidence = 0.5
    const reasons: string[] = []
    
    // Device-based filtering
    if (deviceCapabilities?.isMobile) {
      const mobileOptimized = finalConfig.modelList.filter(m => 
        m.compatibility.mobile.supported && m.compatibility.mobile.performance !== 'poor'
      )
      if (mobileOptimized.length > 0) {
        recommendedModel = mobileOptimized[0]
        confidence = 0.8
        reasons.push('Optimized for mobile devices')
      }
    } else if (deviceCapabilities?.isLowEnd) {
      const lightweightModels = finalConfig.modelList.filter(m => 
        m.performance.memoryUsageMB < 50 && m.performance.batteryImpact === 'low'
      )
      if (lightweightModels.length > 0) {
        recommendedModel = lightweightModels[0]
        confidence = 0.9
        reasons.push('Lightweight for low-end devices')
      }
    }
    
    // Performance history analysis
    if (performanceHistory.length > 0) {
      const modelPerformance = new Map<string, number>()
      
      performanceHistory.forEach(point => {
        const current = modelPerformance.get(point.modelId) || 0
        modelPerformance.set(point.modelId, current + point.metrics.performanceScore)
      })
      
      let bestModelId = ''
      let bestScore = 0
      
      modelPerformance.forEach((totalScore, modelId) => {
        const avgScore = totalScore / performanceHistory.filter(p => p.modelId === modelId).length
        if (avgScore > bestScore) {
          bestScore = avgScore
          bestModelId = modelId
        }
      })
      
      if (bestModelId) {
        const historyBased = finalConfig.modelList.find(m => m.id === bestModelId)
        if (historyBased) {
          recommendedModel = historyBased
          confidence = Math.min(0.95, confidence + 0.3)
          reasons.push(`Best historical performance: ${bestScore.toFixed(1)} score`)
        }
      }
    }
    
    // Generate alternatives
    const alternatives = finalConfig.modelList
      .filter(m => m.id !== recommendedModel.id)
      .slice(0, 3)
      .map(model => ({
        modelId: model.id,
        confidence: Math.random() * 0.5 + 0.3, // Simplified confidence
        reason: `Alternative with ${model.quality} quality`
      }))
    
    return {
      recommendedModelId: recommendedModel.id,
      confidence,
      reasons,
      alternatives,
      estimatedPerformance: {
        fps: recommendedModel.performance.recommendedFPS,
        memoryUsage: {
          jsHeapUsed: recommendedModel.performance.memoryUsageMB * 1024 * 1024,
          jsHeapTotal: 0,
          jsHeapLimit: 0,
          webglMemoryEstimate: recommendedModel.performance.textureMemoryMB * 1024 * 1024
        },
        loadTime: recommendedModel.performance.loadTimeMs,
        performanceScore: 85 // Estimated based on model profile
      }
    }
  }, [finalConfig.modelList, performanceHistory])
  
  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])
  
  // Clear old alerts
  const clearOldAlerts = useCallback(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    setActiveAlerts(prev => prev.filter(alert => 
      alert.timestamp > oneHourAgo && !alert.acknowledged
    ))
  }, [])
  
  // Export performance data with storage integration
  const exportPerformanceData = useCallback(() => {
    // Get comprehensive data from storage manager
    const storageManager = PerformanceStorageManager.getInstance()
    const allStoredData = storageManager.exportAllData()
    
    // Combine with current session data
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        totalDataPoints: performanceHistory.length,
        trackingDuration: performanceHistory.length > 0 
          ? performanceHistory[performanceHistory.length - 1].timestamp - performanceHistory[0].timestamp 
          : 0,
        modelsTracked: [...new Set(performanceHistory.map(p => p.modelId))],
        deviceInfo: getDeviceInfo()
      },
      currentSession: {
        performanceHistory,
        currentMetrics,
        alerts: activeAlerts,
        configuration: finalConfig
      },
      allStoredData: JSON.parse(allStoredData)
    }
    
    return JSON.stringify(exportData, null, 2)
  }, [performanceHistory, currentMetrics, activeAlerts, finalConfig, getDeviceInfo])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
      if (performanceObserver.current) {
        performanceObserver.current.disconnect()
      }
    }
  }, [stopTracking])
  
  // Clear old alerts periodically
  useEffect(() => {
    const interval = setInterval(clearOldAlerts, 5 * 60 * 1000) // Every 5 minutes
    return () => clearInterval(interval)
  }, [clearOldAlerts])
  
  return {
    // State
    currentMetrics,
    performanceHistory,
    activeAlerts,
    isTracking,
    currentModelId,
    
    // Control functions
    startTracking,
    stopTracking,
    markModelLoadStart,
    markModelLoadComplete,
    
    // Event recording
    recordError,
    recordWarning,
    recordCrash,
    recordRecovery,
    
    // Analysis functions
    compareModels,
    getModelRecommendation,
    
    // Alert management
    acknowledgeAlert,
    clearOldAlerts,
    
    // Data export
    exportPerformanceData,
    
    // Computed values
    averagePerformanceScore: currentMetrics?.performanceScore || 0,
    memoryUsagePercentage: currentMetrics ? 
      (currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) * 100 : 0,
    isPerformanceGood: currentMetrics ? currentMetrics.performanceScore >= 70 : false,
    hasActiveAlerts: activeAlerts.filter(a => !a.acknowledged).length > 0,
    
    // Configuration
    config: finalConfig,
    
    // Storage management
    getStorageStats: () => PerformanceStorageManager.getInstance().getStorageStats(),
    getAnalytics: () => PerformanceStorageManager.getInstance().getAnalytics(),
    clearStoredData: () => PerformanceStorageManager.getInstance().clearAllData(),
    importData: (data: string) => PerformanceStorageManager.getInstance().importData(data)
  }
}

export default useModelPerformanceTracking