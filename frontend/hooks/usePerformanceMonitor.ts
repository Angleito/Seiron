'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  memoryUsage: number | null
  renderTime: number
  animationSmoothness: number // 0-1 score
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
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
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
    }
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    memoryUsage: null,
    renderTime: 0,
    animationSmoothness: 1
  })

  const [isPerformanceGood, setIsPerformanceGood] = useState(true)
  const [performanceScore, setPerformanceScore] = useState(100)

  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const droppedFramesRef = useRef(0)
  const frameTimes = useRef<number[]>([])
  const animationFrameRef = useRef<number>()
  const sampleIntervalRef = useRef<NodeJS.Timeout>()

  // Calculate FPS and frame time
  const measureFrame = useCallback(() => {
    if (!enabled) return

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
  }, [enabled, targetFPS])

  // Calculate performance metrics
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
      animationSmoothness: smoothness
    }
    
    setMetrics(newMetrics)
    
    // Check performance thresholds
    const performanceGood = checkPerformance(newMetrics, warningThreshold)
    setIsPerformanceGood(performanceGood)
    
    // Calculate overall performance score
    const score = calculatePerformanceScore(newMetrics, targetFPS)
    setPerformanceScore(score)
    
    // Trigger warning if needed
    if (!performanceGood && onPerformanceWarning) {
      onPerformanceWarning(newMetrics)
    }
    
    // Reset counters
    frameCountRef.current = 0
    droppedFramesRef.current = 0
  }, [targetFPS, warningThreshold, onPerformanceWarning])

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

  // Start/stop monitoring
  useEffect(() => {
    if (!enabled) return

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
  }, [enabled, measureFrame, calculateMetrics, sampleRate])

  return {
    metrics,
    isPerformanceGood,
    performanceScore,
    recommendation: getPerformanceRecommendation(),
    // Utility functions
    isHighPerformance: performanceScore >= 70,
    shouldReduceQuality: performanceScore < 50,
    shouldDisableAnimations: performanceScore < 30
  }
}