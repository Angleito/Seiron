'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  memoryUsage: number | null
  renderTime: number
  animationSmoothness: number // 0-1 score
  loadingTime: number
  componentName: string
  timestamp: number
}

interface PerformanceTimer {
  startTimer: (label: string) => void
  endTimer: (label: string) => number
}

interface UsePerformanceMonitorOptions {
  targetFPS?: number
  sampleRate?: number
  enabled?: boolean
  onPerformanceWarning?: (metrics: PerformanceMetrics) => void
  warningThreshold?: {
    fps?: number
    frameTime?: number
    droppedFrames?: number
    memoryUsage?: number
  }
  componentName?: string
}

interface UsePerformanceMonitorReturn extends PerformanceTimer {
  metrics: PerformanceMetrics
  isPerformanceGood: boolean
  performanceScore: number
  recommendation: string
  isHighPerformance: boolean
  shouldReduceQuality: boolean
  shouldDisableAnimations: boolean
  logMetrics: () => void
  startMonitoring: () => void
  stopMonitoring: () => void
  isMonitoring: boolean
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}): UsePerformanceMonitorReturn {
  const {
    targetFPS = 60,
    sampleRate = 1000, // ms between samples
    enabled = true,
    onPerformanceWarning,
    warningThreshold = {
      fps: 30,
      frameTime: 33, // ~30fps
      droppedFrames: 10,
      memoryUsage: 100 * 1024 * 1024 // 100MB
    },
    componentName = 'Component'
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    memoryUsage: null,
    renderTime: 0,
    animationSmoothness: 1,
    loadingTime: 0,
    componentName,
    timestamp: Date.now()
  })

  const [isPerformanceGood, setIsPerformanceGood] = useState(true)
  const [performanceScore, setPerformanceScore] = useState(100)

  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const droppedFramesRef = useRef(0)
  const frameTimes = useRef<number[]>([])
  const animationFrameRef = useRef<number>()
  const sampleIntervalRef = useRef<NodeJS.Timeout>()
  const timersRef = useRef<Map<string, number>>(new Map())
  const [isMonitoring, setIsMonitoring] = useState(enabled)

  // Start performance timer
  const startTimer = useCallback((label: string) => {
    timersRef.current.set(label, performance.now())
  }, [])

  // End performance timer and return duration
  const endTimer = useCallback((label: string): number => {
    const startTime = timersRef.current.get(label)
    if (startTime === undefined) {
      console.warn(`Timer '${label}' was not started`)
      return 0
    }
    
    const duration = performance.now() - startTime
    timersRef.current.delete(label)
    
    // Update metrics based on label
    if (label === 'render') {
      setMetrics(prev => ({ ...prev, renderTime: duration }))
    } else if (label === 'loading') {
      setMetrics(prev => ({ ...prev, loadingTime: duration }))
    }
    
    return duration
  }, [])

  // Calculate FPS and frame time
  const measureFrame = useCallback(() => {
    if (!isMonitoring) return

    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTimeRef.current
    
    frameCountRef.current++
    frameTimes.current.push(deltaTime)
    
    // Keep only last 60 frames for smoothness calculation
    if (frameTimes.current.length > 60) {
      frameTimes.current.shift()
    }
    
    // Detect dropped frames (frame took longer than 1.5x target)
    if (deltaTime > (1000 / targetFPS) * 1.5) {
      droppedFramesRef.current++
    }
    
    lastFrameTimeRef.current = currentTime
    
    // Continue measuring
    animationFrameRef.current = requestAnimationFrame(measureFrame)
  }, [isMonitoring, targetFPS])

  // Calculate performance metrics with batched state updates
  const calculateMetrics = useCallback(() => {
    const frameCount = frameCountRef.current
    const droppedFrames = droppedFramesRef.current
    
    // Calculate average FPS
    const fps = frameCount > 0 ? Math.min(frameCount, targetFPS) : targetFPS
    
    // Calculate average frame time
    const avgFrameTime = frameTimes.current.length > 0
      ? frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length
      : 16.67
    
    // Calculate animation smoothness (variance in frame times)
    const smoothness = calculateSmoothness(frameTimes.current)
    
    // Get memory usage if available
    const memoryUsage = getMemoryUsage()
    
    // Measure render time (approximate)
    const renderTime = performance.now() - lastFrameTimeRef.current
    
    const newMetrics: PerformanceMetrics = {
      fps,
      frameTime: avgFrameTime,
      droppedFrames,
      memoryUsage,
      renderTime,
      animationSmoothness: smoothness,
      loadingTime: metrics.loadingTime,
      componentName,
      timestamp: Date.now()
    }
    
    // Batch state updates to reduce re-renders
    const performanceGood = checkPerformance(newMetrics, warningThreshold)
    const score = calculatePerformanceScore(newMetrics, targetFPS)
    
    // Only update state if values have changed significantly
    setMetrics(prev => {
      if (Math.abs(prev.fps - newMetrics.fps) > 1 ||
          Math.abs(prev.frameTime - newMetrics.frameTime) > 2 ||
          prev.droppedFrames !== newMetrics.droppedFrames) {
        return newMetrics
      }
      return prev
    })
    
    setIsPerformanceGood(prev => prev !== performanceGood ? performanceGood : prev)
    setPerformanceScore(prev => Math.abs(prev - score) > 5 ? score : prev)
    
    // Trigger warning if needed
    if (!performanceGood && onPerformanceWarning) {
      onPerformanceWarning(newMetrics)
    }
    
    // Reset counters
    frameCountRef.current = 0
    droppedFramesRef.current = 0
  }, [targetFPS, warningThreshold, onPerformanceWarning, metrics.loadingTime, componentName])

  // Calculate animation smoothness (0-1, where 1 is perfectly smooth)
  const calculateSmoothness = (frameTimes: number[]): number => {
    if (frameTimes.length < 2) return 1
    
    const targetFrameTime = 1000 / targetFPS
    const variance = frameTimes.reduce((acc, time) => {
      const diff = Math.abs(time - targetFrameTime)
      return acc + (diff * diff)
    }, 0) / frameTimes.length
    
    // Convert variance to 0-1 score
    const maxVariance = targetFrameTime * targetFrameTime
    return Math.max(0, 1 - (variance / maxVariance))
  }

  // Get memory usage if Performance Memory API is available
  const getMemoryUsage = (): number | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize
    }
    return null
  }

  // Check if performance meets thresholds
  const checkPerformance = (
    metrics: PerformanceMetrics,
    thresholds: typeof warningThreshold
  ): boolean => {
    if (thresholds.fps && metrics.fps < thresholds.fps) return false
    if (thresholds.frameTime && metrics.frameTime > thresholds.frameTime) return false
    if (thresholds.droppedFrames && metrics.droppedFrames > thresholds.droppedFrames) return false
    if (thresholds.memoryUsage && metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) return false
    return true
  }

  // Calculate overall performance score (0-100)
  const calculatePerformanceScore = (metrics: PerformanceMetrics, targetFPS: number): number => {
    const fpsScore = Math.min(100, (metrics.fps / targetFPS) * 100)
    const smoothnessScore = metrics.animationSmoothness * 100
    const droppedFramesPenalty = Math.max(0, 100 - metrics.droppedFrames * 2)
    
    return Math.round((fpsScore + smoothnessScore + droppedFramesPenalty) / 3)
  }

  // Get performance recommendation based on current metrics
  const getPerformanceRecommendation = (): string => {
    if (performanceScore >= 90) return 'Excellent performance'
    if (performanceScore >= 70) return 'Good performance'
    if (performanceScore >= 50) return 'Fair performance - consider reducing animation complexity'
    if (performanceScore >= 30) return 'Poor performance - reduce animation quality'
    return 'Very poor performance - disable complex animations'
  }

  // Log metrics to console
  const logMetrics = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🐉 Performance Metrics: ${componentName}`)
      console.log(`⏱️  Render Time: ${metrics.renderTime.toFixed(2)}ms`)
      console.log(`🎮 FPS: ${metrics.fps}`)
      console.log(`📊 Frame Time: ${metrics.frameTime.toFixed(2)}ms`)
      console.log(`⏳ Loading Time: ${metrics.loadingTime.toFixed(2)}ms`)
      console.log(`📉 Dropped Frames: ${metrics.droppedFrames}`)
      console.log(`🎯 Smoothness: ${(metrics.animationSmoothness * 100).toFixed(1)}%`)
      console.log(`💯 Performance Score: ${performanceScore}`)
      
      if (metrics.memoryUsage) {
        const usedMB = (metrics.memoryUsage / 1048576).toFixed(2)
        console.log(`💾 Memory: ${usedMB}MB`)
      }
      
      console.log(`💡 ${getPerformanceRecommendation()}`)
      console.groupEnd()
    }
  }, [componentName, metrics, performanceScore])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Start/stop monitoring
  useEffect(() => {
    if (!isMonitoring) return

    // Start frame measurement
    animationFrameRef.current = requestAnimationFrame(measureFrame)
    
    // Set up periodic metric calculation
    sampleIntervalRef.current = setInterval(calculateMetrics, sampleRate)
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current)
      }
    }
  }, [isMonitoring, measureFrame, calculateMetrics, sampleRate])

  return {
    metrics,
    isPerformanceGood,
    performanceScore,
    recommendation: getPerformanceRecommendation(),
    // Utility functions
    isHighPerformance: performanceScore >= 70,
    shouldReduceQuality: performanceScore < 50,
    shouldDisableAnimations: performanceScore < 30,
    // Timer functions
    startTimer,
    endTimer,
    // Control functions
    logMetrics,
    startMonitoring,
    stopMonitoring,
    isMonitoring
  }
}

// Performance Overlay Component
interface PerformanceOverlayProps {
  metrics: PerformanceMetrics
  isVisible: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  metrics,
  isVisible,
  position = 'top-right',
}) => {
  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null
  }

  const positionStyles = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#00ff00'
    if (fps >= 30) return '#ffff00'
    return '#ff0000'
  }

  const getLoadingTimeColor = (time: number) => {
    if (time <= 1000) return '#00ff00'
    if (time <= 3000) return '#ffff00'
    return '#ff0000'
  }

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff',
        padding: '10px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        minWidth: '200px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingBottom: '5px' }}>
        🐉 {metrics.componentName}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span>FPS:</span>
        <span style={{ color: getFPSColor(metrics.fps), fontWeight: 'bold' }}>
          {metrics.fps}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span>Render:</span>
        <span>{metrics.renderTime.toFixed(2)}ms</span>
      </div>
      {metrics.loadingTime > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Load:</span>
          <span style={{ color: getLoadingTimeColor(metrics.loadingTime) }}>
            {metrics.loadingTime.toFixed(0)}ms
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span>Dropped:</span>
        <span style={{ color: metrics.droppedFrames > 10 ? '#ff0000' : '#ffffff' }}>
          {metrics.droppedFrames}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span>Smooth:</span>
        <span>{(metrics.animationSmoothness * 100).toFixed(0)}%</span>
      </div>
      {metrics.memoryUsage && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Memory:</span>
          <span>
            {(metrics.memoryUsage / 1048576).toFixed(1)}MB
          </span>
        </div>
      )}
    </div>
  )
}