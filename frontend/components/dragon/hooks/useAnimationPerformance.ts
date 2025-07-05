'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PerformanceMetrics, PerformanceMode, PerformanceHookReturn } from '../types'
import { PERFORMANCE_THRESHOLDS } from '../constants'

export function useAnimationPerformance(
  autoOptimization: boolean = true,
  initialMode: PerformanceMode = 'balanced'
): PerformanceHookReturn {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(initialMode)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameDrops: 0,
    averageFrameTime: 16.67,
    memoryUsage: 0,
    gpuUtilization: 0,
    lastUpdated: Date.now()
  })
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [qualityLevel, setQualityLevel] = useState(100)

  // Performance monitoring refs
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const frameTimesRef = useRef<number[]>([])
  const monitoringRef = useRef<number | null>(null)
  const autoOptimizationRef = useRef(autoOptimization)

  // Calculate quality level based on performance
  const calculateQualityLevel = useCallback((currentMetrics: PerformanceMetrics): number => {
    const fpsRatio = Math.min(currentMetrics.fps / 60, 1)
    const memoryScore = Math.max(1 - currentMetrics.memoryUsage, 0.1)
    const frameDropScore = Math.max(1 - (currentMetrics.frameDrops / 100), 0.1)
    
    return Math.round((fpsRatio * 0.5 + memoryScore * 0.3 + frameDropScore * 0.2) * 100)
  }, [])

  // Auto-adjust performance mode based on metrics
  const autoAdjustPerformance = useCallback((currentMetrics: PerformanceMetrics) => {
    if (!autoOptimizationRef.current) return

    const quality = calculateQualityLevel(currentMetrics)
    
    if (quality < 40 && performanceMode !== 'performance') {
      setIsOptimizing(true)
      setPerformanceMode('performance')
      setTimeout(() => setIsOptimizing(false), 1000)
    } else if (quality > 80 && performanceMode === 'performance') {
      setPerformanceMode('balanced')
    } else if (quality > 95 && performanceMode === 'balanced') {
      setPerformanceMode('quality')
    } else if (quality < 60 && performanceMode === 'quality') {
      setPerformanceMode('balanced')
    }
  }, [performanceMode, calculateQualityLevel])

  // Frame rate monitoring
  const measureFrame = useCallback(() => {
    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current
    lastFrameTimeRef.current = now

    frameTimesRef.current.push(deltaTime)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    frameCountRef.current++

    // Update metrics every 60 frames (roughly 1 second)
    if (frameCountRef.current % 60 === 0) {
      const averageFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const fps = Math.round(1000 / averageFrameTime)
      const frameDrops = frameTimesRef.current.filter(time => time > 20).length // Frames over 20ms
      
      const newMetrics: PerformanceMetrics = {
        fps,
        frameDrops,
        averageFrameTime,
        memoryUsage: getMemoryUsage(),
        gpuUtilization: 0, // Would need WebGL context for real GPU monitoring
        lastUpdated: Date.now(),
        cpuUsage: 0, // Would need proper CPU monitoring
        networkLatency: 0 // Would need network monitoring
      }

      setMetrics(newMetrics)
      setQualityLevel(calculateQualityLevel(newMetrics))
      autoAdjustPerformance(newMetrics)
    }
  }, [calculateQualityLevel, autoAdjustPerformance])

  // Get memory usage (approximation)
  const getMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      return memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit
    }
    return 0
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (monitoringRef.current) return

    const monitor = () => {
      measureFrame()
      monitoringRef.current = requestAnimationFrame(monitor)
    }
    monitoringRef.current = requestAnimationFrame(monitor)
  }, [measureFrame])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      cancelAnimationFrame(monitoringRef.current)
      monitoringRef.current = null
    }
  }, [])

  // Actions
  const actions = useMemo(() => ({
    setPerformanceMode: (mode: PerformanceMode) => {
      setPerformanceMode(mode)
      autoOptimizationRef.current = false // Disable auto when manually set
    },

    enableAutoOptimization: () => {
      autoOptimizationRef.current = true
    },

    disableAutoOptimization: () => {
      autoOptimizationRef.current = false
    },

    resetMetrics: () => {
      frameCountRef.current = 0
      frameTimesRef.current = []
      setMetrics({
        fps: 60,
        frameDrops: 0,
        averageFrameTime: 16.67,
        memoryUsage: 0,
        gpuUtilization: 0,
        lastUpdated: Date.now(),
        cpuUsage: 0,
        networkLatency: 0
      })
      setQualityLevel(100)
    }
  }), [])

  // Initialize monitoring - using empty deps to prevent re-renders
  useEffect(() => {
    startMonitoring()
    return () => stopMonitoring()
  }, [])

  // Update auto-optimization ref
  useEffect(() => {
    autoOptimizationRef.current = autoOptimization
  }, [autoOptimization])

  // Handle visibility change to pause monitoring when not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMonitoring()
      } else {
        startMonitoring()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [startMonitoring, stopMonitoring])

  return useMemo(() => ({
    performanceMode,
    metrics,
    isOptimizing,
    qualityLevel,
    actions,
    // Additional compatibility properties for debugger
    isMonitoring: true,
    shouldReduceMotion: false,
    isLowPerformance: qualityLevel < 30,
    startMonitoring,
    stopMonitoring,
    forceQualityLevel: (level: number) => setQualityLevel(level)
  }), [performanceMode, metrics, isOptimizing, qualityLevel, actions, startMonitoring, stopMonitoring])
}

// Helper hook for reduced motion preference
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Performance monitoring utilities
// Export types
export type QualityLevel = number; // 0-100 quality level
export type PerformanceMode = 'quality' | 'balanced' | 'performance';

export const QUALITY_FEATURES = {
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25
} as const;

export const performanceUtils = {
  // Throttle function for performance
  throttle: <T extends (...args: any[]) => void>(func: T, limit: number): T => {
    let inThrottle: boolean
    return ((...args) => {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }) as T
  },

  // Debounce function for performance
  debounce: <T extends (...args: any[]) => void>(func: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout
    return ((...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }) as T
  },

  // Batch DOM operations
  batchUpdates: (operations: (() => void)[]): void => {
    requestAnimationFrame(() => {
      operations.forEach(op => op())
    })
  },

  // Schedule with priority
  scheduleWithPriority: (
    highPriority: () => void,
    lowPriority: () => void,
    condition: () => boolean
  ): void => {
    requestAnimationFrame(() => {
      if (condition()) {
        highPriority()
      } else {
        // Defer low priority to next frame
        requestAnimationFrame(lowPriority)
      }
    })
  }
}