'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
// Note: Logger import will be resolved by build system
const logger = {
  debug: (message: string, ...args: unknown[]) => console.debug(message, ...args),
  error: (message: string, ...args: unknown[]) => console.error(message, ...args)
}
import * as O from 'fp-ts/Option'
// import { pipe } from 'fp-ts/function' // Currently unused

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
  gpuMemory: O.Option<number>
  cpuUsage: O.Option<number>
  memoryUsage: O.Option<number>
  networkLatency: O.Option<number>
  lastUpdate: number
}

interface AnimationPerformanceState {
  performanceMode: PerformanceMode
  metrics: PerformanceMetrics
  isLowPerformance: boolean
  isMonitoring: boolean
  qualityLevel: number
  shouldReduceMotion: boolean
  deviceCapabilities: O.Option<DeviceCapabilities>
}

interface DeviceCapabilities {
  hardwareConcurrency: number
  deviceMemory: number
  connection: string
  reducedMotion: boolean
  colorGamut: string
  hdr: boolean
}

// Action types for the reducer
export type AnimationPerformanceAction =
  | { type: 'SET_PERFORMANCE_MODE'; payload: PerformanceMode }
  | { type: 'UPDATE_METRICS'; payload: Partial<PerformanceMetrics> }
  | { type: 'SET_LOW_PERFORMANCE'; payload: boolean }
  | { type: 'SET_MONITORING'; payload: boolean }
  | { type: 'SET_QUALITY_LEVEL'; payload: number }
  | { type: 'SET_REDUCED_MOTION'; payload: boolean }
  | { type: 'SET_DEVICE_CAPABILITIES'; payload: DeviceCapabilities }
  | { type: 'UPDATE_FPS'; payload: number }
  | { type: 'UPDATE_FRAME_TIME'; payload: number }
  | { type: 'INCREMENT_DROPPED_FRAMES'; payload: number }
  | { type: 'RESET_METRICS' }

interface UseAnimationPerformanceOptions {
  targetFPS?: number
  measureInterval?: number
  autoAdjust?: boolean
}

// Animation Performance Reducer
const animationPerformanceReducer = (
  state: AnimationPerformanceState,
  action: AnimationPerformanceAction
): AnimationPerformanceState => {
  switch (action.type) {
    case 'SET_PERFORMANCE_MODE':
      return {
        ...state,
        performanceMode: action.payload
      }
    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload,
          lastUpdate: Date.now()
        }
      }
    case 'SET_LOW_PERFORMANCE':
      return {
        ...state,
        isLowPerformance: action.payload
      }
    case 'SET_MONITORING':
      return {
        ...state,
        isMonitoring: action.payload
      }
    case 'SET_QUALITY_LEVEL':
      return {
        ...state,
        qualityLevel: Math.max(0, Math.min(100, action.payload))
      }
    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        shouldReduceMotion: action.payload
      }
    case 'SET_DEVICE_CAPABILITIES':
      return {
        ...state,
        deviceCapabilities: O.some(action.payload)
      }
    case 'UPDATE_FPS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          fps: action.payload,
          lastUpdate: Date.now()
        }
      }
    case 'UPDATE_FRAME_TIME':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          frameTime: action.payload,
          lastUpdate: Date.now()
        }
      }
    case 'INCREMENT_DROPPED_FRAMES':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          droppedFrames: state.metrics.droppedFrames + action.payload,
          lastUpdate: Date.now()
        }
      }
    case 'RESET_METRICS':
      return {
        ...state,
        metrics: {
          ...initialMetrics,
          lastUpdate: Date.now()
        }
      }
    default:
      return state
  }
}

// Initial state
const initialMetrics: PerformanceMetrics = {
  fps: 60,
  frameTime: 16.67,
  droppedFrames: 0,
  gpuMemory: O.none,
  cpuUsage: O.none,
  memoryUsage: O.none,
  networkLatency: O.none,
  lastUpdate: Date.now()
}

const initialAnimationState: AnimationPerformanceState = {
  performanceMode: 'full',
  metrics: initialMetrics,
  isLowPerformance: false,
  isMonitoring: true,
  qualityLevel: 75,
  shouldReduceMotion: false,
  deviceCapabilities: O.none
}

export function useAnimationPerformance(options: UseAnimationPerformanceOptions = {}) {
  const {
    targetFPS = 60,
    measureInterval = 1000,
    autoAdjust = true
  } = options

  const [state, dispatch] = useReducer(animationPerformanceReducer, initialAnimationState)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const droppedFramesRef = useRef(0)
  const measurementIntervalRef = useRef<number>()
  const droppedFrameDetectionRef = useRef<number>()
  const performanceObserverRef = useRef<PerformanceObserver>()
  const cleanupFunctionsRef = useRef<(() => void)[]>([])

  // Measure FPS
  const measureFPS = useCallback(() => {
    frameCountRef.current++
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current

    if (deltaTime >= measureInterval) {
      const fps = (frameCountRef.current / deltaTime) * 1000
      const frameTime = deltaTime / frameCountRef.current
      
      // Only update if values have changed significantly
      const newFps = Math.round(fps)
      const newFrameTime = Math.round(frameTime * 100) / 100
      
      if (state.metrics.fps !== newFps || state.metrics.frameTime !== newFrameTime || state.metrics.droppedFrames !== droppedFramesRef.current) {
        dispatch({ type: 'UPDATE_METRICS', payload: {
          fps: newFps,
          frameTime: newFrameTime,
          droppedFrames: droppedFramesRef.current
        }})
      }

      // Auto-adjust performance mode
      if (autoAdjust) {
        if (fps < targetFPS * 0.5 && state.performanceMode !== 'minimal') {
          dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'minimal' })
          dispatch({ type: 'SET_LOW_PERFORMANCE', payload: true })
        } else if (fps < targetFPS * 0.8 && state.performanceMode !== 'reduced') {
          dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'reduced' })
          dispatch({ type: 'SET_LOW_PERFORMANCE', payload: true })
        } else if (fps >= targetFPS * 0.8 && state.performanceMode !== 'full') {
          dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'full' })
          dispatch({ type: 'SET_LOW_PERFORMANCE', payload: false })
        }
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
          dispatch({ type: 'UPDATE_METRICS', payload: { gpuMemory: O.some(gpuMemory) }})
        }
      } catch (error) {
        logger.debug('GPU memory check not available')
      }
    }
  }, [])

  // Detect dropped frames
  useEffect(() => {
    let lastFrameTime = performance.now()

    const detectDroppedFrames = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastFrameTime
      
      // If frame time is significantly higher than target (16.67ms for 60fps)
      if (deltaTime > (1000 / targetFPS) * 1.5) {
        droppedFramesRef.current++
      }
      
      lastFrameTime = currentTime
      droppedFrameDetectionRef.current = requestAnimationFrame(detectDroppedFrames)
    }

    droppedFrameDetectionRef.current = requestAnimationFrame(detectDroppedFrames)

    return () => {
      if (droppedFrameDetectionRef.current) {
        cancelAnimationFrame(droppedFrameDetectionRef.current)
        droppedFrameDetectionRef.current = undefined
      }
    }
  }, [targetFPS])

  // Start performance monitoring
  useEffect(() => {
    measurementIntervalRef.current = requestAnimationFrame(measureFPS)
    checkGPUMemory()

    // Set up performance observer for additional metrics
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          // Process performance entries if needed
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              // Handle custom performance measures
            }
          })
        })
        
        observer.observe({ entryTypes: ['measure', 'navigation'] })
        performanceObserverRef.current = observer
        
        cleanupFunctionsRef.current.push(() => {
          observer.disconnect()
        })
      } catch (error) {
        // Performance observer not supported, continue without it
      }
    }

    return () => {
      // Cancel animation frames
      if (measurementIntervalRef.current) {
        cancelAnimationFrame(measurementIntervalRef.current)
        measurementIntervalRef.current = undefined
      }
      if (droppedFrameDetectionRef.current) {
        cancelAnimationFrame(droppedFrameDetectionRef.current)
        droppedFrameDetectionRef.current = undefined
      }
      
      // Disconnect performance observer
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect()
        performanceObserverRef.current = undefined
      }
      
      // Execute cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => cleanup())
      cleanupFunctionsRef.current = []
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
    dispatch({ type: 'SET_DEVICE_CAPABILITIES', payload: capabilities })
    dispatch({ type: 'SET_REDUCED_MOTION', payload: capabilities.reducedMotion })
    
    if (capabilities.reducedMotion) {
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'minimal' })
    } else if (capabilities.hardwareConcurrency < 4 || capabilities.deviceMemory < 4) {
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'reduced' })
    } else {
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: 'full' })
    }

    return capabilities
  }, [])

  // Initialize device capabilities check
  useEffect(() => {
    getDeviceCapabilities()
  }, [getDeviceCapabilities])

  // Manual performance mode control
  const setMode = useCallback((mode: PerformanceMode) => {
    dispatch({ type: 'SET_PERFORMANCE_MODE', payload: mode })
  }, [])

  // Performance hints for specific animations
  const shouldAnimate = useCallback((animationType: 'complex' | 'simple' | 'particle') => {
    switch (state.performanceMode) {
      case 'minimal':
        return animationType === 'simple'
      case 'reduced':
        return animationType !== 'particle'
      case 'full':
        return true
      default:
        return true
    }
  }, [state.performanceMode])

  // Get optimized animation duration
  const getAnimationDuration = useCallback((baseDuration: number) => {
    switch (state.performanceMode) {
      case 'minimal':
        return baseDuration * 0.5 // Faster animations
      case 'reduced':
        return baseDuration * 0.8
      case 'full':
        return baseDuration
      default:
        return baseDuration
    }
  }, [state.performanceMode])

  // Get particle count based on performance
  const getParticleCount = useCallback((baseCount: number) => {
    switch (state.performanceMode) {
      case 'minimal':
        return Math.floor(baseCount * 0.2)
      case 'reduced':
        return Math.floor(baseCount * 0.6)
      case 'full':
        return baseCount
      default:
        return baseCount
    }
  }, [state.performanceMode])

  const resetMetrics = useCallback(() => {
    // Reset frame counting
    frameCountRef.current = 0
    droppedFramesRef.current = 0
    lastTimeRef.current = performance.now()
    
    dispatch({ type: 'RESET_METRICS' })
  }, [])

  const startMonitoring = useCallback(() => {
    dispatch({ type: 'SET_MONITORING', payload: true })
  }, [])

  const stopMonitoring = useCallback(() => {
    dispatch({ type: 'SET_MONITORING', payload: false })
  }, [])

  const forceQualityLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_QUALITY_LEVEL', payload: level })
  }, [])

  return {
    performanceMode: state.performanceMode,
    metrics: state.metrics,
    isLowPerformance: state.isLowPerformance,
    setMode,
    shouldAnimate,
    getAnimationDuration,
    getParticleCount,
    deviceCapabilities: O.getOrElse(() => getDeviceCapabilities())(state.deviceCapabilities),
    // Additional properties
    qualityLevel: state.qualityLevel,
    isMonitoring: state.isMonitoring,
    shouldReduceMotion: state.shouldReduceMotion,
    startMonitoring,
    stopMonitoring,
    forceQualityLevel,
    resetMetrics,
    // Functional getters using fp-ts Option
    getGPUMemory: () => state.metrics.gpuMemory,
    getCPUUsage: () => state.metrics.cpuUsage,
    getMemoryUsage: () => state.metrics.memoryUsage,
    getNetworkLatency: () => state.metrics.networkLatency,
    hasGPUInfo: () => O.isSome(state.metrics.gpuMemory),
    getDeviceCapabilities: () => state.deviceCapabilities
  }
}

// Hook for throttling animations based on performance
export function useAnimationThrottle(callback: () => void, dependencies: unknown[] = []) {
  const { performanceMode, metrics } = useAnimationPerformance()
  const animationFrameRef = useRef<number>()
  const lastExecutionRef = useRef(0)
  const isActiveRef = useRef(false)

  useEffect(() => {
    const throttleDelay = performanceMode === 'minimal' ? 100 : 
                         performanceMode === 'reduced' ? 50 : 
                         16 // ~60fps

    const animate = () => {
      if (!isActiveRef.current) return
      
      const now = performance.now()
      
      if (now - lastExecutionRef.current >= throttleDelay) {
        callback()
        lastExecutionRef.current = now
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Only start animation if FPS is acceptable
    if (metrics.fps > 30) {
      isActiveRef.current = true
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      isActiveRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
    }
  }, [callback, performanceMode, metrics.fps, ...dependencies])
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
    }
  }, [])
}