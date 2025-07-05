'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@lib/logger'

// Export types for compatibility
export type QualityLevel = number; // 0-100 quality level

export const QUALITY_FEATURES = {
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25
} as const;

type PerformanceMode = 'full' | 'reduced' | 'minimal'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  gpuMemory?: number
  cpuUsage?: number
  memoryUsage?: number
  networkLatency?: number
  lastUpdate: number
}

interface UseAnimationPerformanceOptions {
  targetFPS?: number
  measureInterval?: number
  autoAdjust?: boolean
}

export function useAnimationPerformance(options: UseAnimationPerformanceOptions = {}) {
  const {
    targetFPS = 60,
    measureInterval = 1000,
    autoAdjust = true
  } = options

  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('full')
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    lastUpdate: Date.now()
  })
  const [isLowPerformance, setIsLowPerformance] = useState(false)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const droppedFramesRef = useRef(0)
  const measurementIntervalRef = useRef<number>()

  // Measure FPS
  const measureFPS = useCallback(() => {
    frameCountRef.current++
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current

    if (deltaTime >= measureInterval) {
      const fps = (frameCountRef.current / deltaTime) * 1000
      const frameTime = deltaTime / frameCountRef.current
      
      // Only update if values have changed significantly
      setMetrics(prev => {
        const newFps = Math.round(fps)
        const newFrameTime = Math.round(frameTime * 100) / 100
        
        if (prev.fps === newFps && prev.frameTime === newFrameTime && prev.droppedFrames === droppedFramesRef.current) {
          return prev // No update needed
        }
        
        return {
          ...prev,
          fps: newFps,
          frameTime: newFrameTime,
          droppedFrames: droppedFramesRef.current
        }
      })

      // Auto-adjust performance mode with state change prevention
      if (autoAdjust) {
        setPerformanceMode(prev => {
          if (fps < targetFPS * 0.5 && prev !== 'minimal') {
            setIsLowPerformance(true)
            return 'minimal'
          } else if (fps < targetFPS * 0.8 && prev !== 'reduced') {
            setIsLowPerformance(true)
            return 'reduced'
          } else if (fps >= targetFPS * 0.8 && prev !== 'full') {
            setIsLowPerformance(false)
            return 'full'
          }
          return prev // No change needed
        })
      }

      // Reset counters
      frameCountRef.current = 0
      droppedFramesRef.current = 0
      lastTimeRef.current = currentTime
    }

    measurementIntervalRef.current = requestAnimationFrame(measureFPS)
  }, [measureInterval, targetFPS, autoAdjust])

  // Check for GPU memory (if available)
  const checkGPUMemory = useCallback(async () => {
    if ('gpu' in navigator && 'requestAdapter' in (navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter()
        if (adapter && 'limits' in adapter) {
          const gpuMemory = adapter.limits.maxBufferSize / (1024 * 1024 * 1024) // Convert to GB
          setMetrics(prev => ({ ...prev, gpuMemory }))
        }
      } catch (error) {
        logger.debug('GPU memory check not available')
      }
    }
  }, [])

  // Detect dropped frames
  useEffect(() => {
    let lastFrameTime = performance.now()
    let animationFrame: number

    const detectDroppedFrames = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastFrameTime
      
      // If frame time is significantly higher than target (16.67ms for 60fps)
      if (deltaTime > (1000 / targetFPS) * 1.5) {
        droppedFramesRef.current++
      }
      
      lastFrameTime = currentTime
      animationFrame = requestAnimationFrame(detectDroppedFrames)
    }

    animationFrame = requestAnimationFrame(detectDroppedFrames)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [targetFPS])

  // Start performance monitoring
  useEffect(() => {
    measurementIntervalRef.current = requestAnimationFrame(measureFPS)
    checkGPUMemory()

    return () => {
      if (measurementIntervalRef.current) {
        cancelAnimationFrame(measurementIntervalRef.current)
      }
    }
  }, [measureFPS, checkGPUMemory])

  // Device capabilities detection
  const getDeviceCapabilities = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        hardwareConcurrency: 4,
        deviceMemory: 4,
        connection: 'unknown',
        reducedMotion: false,
        colorGamut: 'srgb',
        hdr: false
      }
    }
    
    const capabilities = {
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      colorGamut: window.matchMedia('(color-gamut: p3)').matches ? 'p3' : 'srgb',
      hdr: window.matchMedia('(dynamic-range: high)').matches
    }

    // Determine initial performance mode based on capabilities
    if (capabilities.reducedMotion) {
      setPerformanceMode('minimal')
    } else if (capabilities.hardwareConcurrency < 4 || capabilities.deviceMemory < 4) {
      setPerformanceMode('reduced')
    } else {
      setPerformanceMode('full')
    }

    return capabilities
  }, [])

  // Initialize device capabilities check
  useEffect(() => {
    getDeviceCapabilities()
  }, [getDeviceCapabilities])

  // Manual performance mode control
  const setMode = useCallback((mode: PerformanceMode) => {
    setPerformanceMode(mode)
  }, [])

  // Performance hints for specific animations
  const shouldAnimate = useCallback((animationType: 'complex' | 'simple' | 'particle') => {
    switch (performanceMode) {
      case 'minimal':
        return animationType === 'simple'
      case 'reduced':
        return animationType !== 'particle'
      case 'full':
        return true
      default:
        return true
    }
  }, [performanceMode])

  // Get optimized animation duration
  const getAnimationDuration = useCallback((baseDuration: number) => {
    switch (performanceMode) {
      case 'minimal':
        return baseDuration * 0.5 // Faster animations
      case 'reduced':
        return baseDuration * 0.8
      case 'full':
        return baseDuration
      default:
        return baseDuration
    }
  }, [performanceMode])

  // Get particle count based on performance
  const getParticleCount = useCallback((baseCount: number) => {
    switch (performanceMode) {
      case 'minimal':
        return Math.floor(baseCount * 0.2)
      case 'reduced':
        return Math.floor(baseCount * 0.6)
      case 'full':
        return baseCount
      default:
        return baseCount
    }
  }, [performanceMode])

  return {
    performanceMode,
    metrics,
    isLowPerformance,
    setMode,
    shouldAnimate,
    getAnimationDuration,
    getParticleCount,
    deviceCapabilities: getDeviceCapabilities(),
    // Additional compatibility properties for debugger
    qualityLevel: 75, // Default quality level
    isMonitoring: true,
    shouldReduceMotion: false,
    startMonitoring: () => {},
    stopMonitoring: () => {},
    forceQualityLevel: (level: number) => {},
    resetMetrics: () => setMetrics({
      fps: 60,
      frameTime: 16.67,
      droppedFrames: 0,
      lastUpdate: Date.now(),
      cpuUsage: 0,
      networkLatency: 0
    })
  }
}

// Hook for throttling animations based on performance
export function useAnimationThrottle(callback: () => void, dependencies: any[] = []) {
  const { performanceMode, metrics } = useAnimationPerformance()
  const animationFrameRef = useRef<number>()
  const lastExecutionRef = useRef(0)

  useEffect(() => {
    const throttleDelay = performanceMode === 'minimal' ? 100 : 
                         performanceMode === 'reduced' ? 50 : 
                         16 // ~60fps

    const animate = () => {
      const now = performance.now()
      
      if (now - lastExecutionRef.current >= throttleDelay) {
        callback()
        lastExecutionRef.current = now
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Only start animation if FPS is acceptable
    if (metrics.fps > 30) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [callback, performanceMode, metrics.fps, ...dependencies])
}