import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  performanceScore: number
}

interface UseOrbitalPerformanceOptions {
  targetFPS?: number
  sampleSize?: number
  onPerformanceChange?: (metrics: PerformanceMetrics) => void
}

export function useOrbitalPerformance({
  targetFPS = 60,
  sampleSize = 30,
  onPerformanceChange
}: UseOrbitalPerformanceOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    performanceScore: 100
  })
  
  const frameTimesRef = useRef<number[]>([])
  const lastTimeRef = useRef<number>(0)
  const droppedFramesRef = useRef<number>(0)
  const animationFrameRef = useRef<number>()
  
  const targetFrameTime = 1000 / targetFPS
  
  const calculateMetrics = useCallback(() => {
    const frameTimes = frameTimesRef.current
    if (frameTimes.length === 0) return
    
    // Calculate average frame time
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    const fps = 1000 / avgFrameTime
    
    // Calculate performance score (0-100)
    const performanceScore = Math.max(0, Math.min(100, 
      100 * (targetFPS / Math.max(targetFPS - fps, 1))
    ))
    
    const newMetrics: PerformanceMetrics = {
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      droppedFrames: droppedFramesRef.current,
      performanceScore: Math.round(performanceScore)
    }
    
    setMetrics(newMetrics)
    onPerformanceChange?.(newMetrics)
  }, [targetFPS, onPerformanceChange])
  
  const measureFrame = useCallback((timestamp: number) => {
    if (lastTimeRef.current !== 0) {
      const frameTime = timestamp - lastTimeRef.current
      
      // Track dropped frames
      if (frameTime > targetFrameTime * 1.5) {
        droppedFramesRef.current++
      }
      
      // Add to rolling buffer
      frameTimesRef.current.push(frameTime)
      if (frameTimesRef.current.length > sampleSize) {
        frameTimesRef.current.shift()
      }
      
      // Calculate metrics periodically
      if (frameTimesRef.current.length === sampleSize) {
        calculateMetrics()
        frameTimesRef.current = [] // Reset buffer
      }
    }
    
    lastTimeRef.current = timestamp
    animationFrameRef.current = requestAnimationFrame(measureFrame)
  }, [targetFrameTime, sampleSize, calculateMetrics])
  
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(measureFrame)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [measureFrame])
  
  const reset = useCallback(() => {
    frameTimesRef.current = []
    droppedFramesRef.current = 0
    lastTimeRef.current = 0
    setMetrics({
      fps: 60,
      frameTime: 16.67,
      droppedFrames: 0,
      performanceScore: 100
    })
  }, [])
  
  return {
    metrics,
    reset,
    isOptimal: metrics.performanceScore > 90,
    needsOptimization: metrics.performanceScore < 70
  }
}

// Hook for adaptive quality based on performance
export function useAdaptiveOrbitalQuality(metrics: PerformanceMetrics) {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  
  useEffect(() => {
    if (metrics.performanceScore > 90) {
      setQuality('high')
    } else if (metrics.performanceScore > 70) {
      setQuality('medium')
    } else {
      setQuality('low')
    }
  }, [metrics.performanceScore])
  
  return {
    quality,
    enableTrails: quality !== 'low',
    enableCollisions: quality === 'high',
    enableParticles: quality !== 'low',
    trailLength: quality === 'high' ? 20 : quality === 'medium' ? 10 : 0,
    updateRate: quality === 'high' ? 1 : quality === 'medium' ? 2 : 3
  }
}