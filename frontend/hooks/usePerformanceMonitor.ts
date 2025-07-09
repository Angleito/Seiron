import { useEffect, useRef, useState } from 'react'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  renderTime: number
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

export const usePerformanceMonitor = (config?: boolean | { componentName?: string; enabled?: boolean; sampleRate?: number; onPerformanceWarning?: (metrics: any) => void; warningThreshold?: { fps: number } }) => {
  const enabled = typeof config === 'boolean' ? config : config?.enabled !== false
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    renderTime: 0
  })
  
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const renderStartTime = useRef(0)
  const animationFrameId = useRef<number>()

  useEffect(() => {
    if (!enabled) return

    const measurePerformance = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime.current
      frameCount.current++

      if (frameCount.current % 60 === 0) {
        const fps = Math.round(1000 / (deltaTime / 60))
        const frameTime = deltaTime / 60
        const renderTime = currentTime - renderStartTime.current

        let memoryUsage
        if ('memory' in performance) {
          const memory = (performance as any).memory
          memoryUsage = {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        }

        setMetrics({
          fps,
          frameTime,
          renderTime,
          memoryUsage
        })

        frameCount.current = 0
        lastTime.current = currentTime
      }

      renderStartTime.current = currentTime
      animationFrameId.current = requestAnimationFrame(measurePerformance)
    }

    animationFrameId.current = requestAnimationFrame(measurePerformance)

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [enabled])

  const startRender = () => {
    renderStartTime.current = performance.now()
  }

  const endRender = () => {
    const renderTime = performance.now() - renderStartTime.current
    setMetrics(prev => ({ ...prev, renderTime }))
  }

  const startTimer = (name: string) => {
    // Timer functionality for compatibility
  }

  const endTimer = (name: string) => {
    // Timer functionality for compatibility
  }

  const logMetrics = () => {
    console.log('Performance metrics:', metrics)
  }

  const performanceScore = metrics.fps > 30 ? 'good' : 'poor'
  const recommendation = metrics.fps < 30 ? 'Consider reducing graphics quality' : 'Performance is good'
  const isHighPerformance = metrics.fps > 50
  const shouldReduceQuality = metrics.fps < 30
  const shouldDisableAnimations = metrics.fps < 20

  return {
    metrics,
    startRender,
    endRender,
    startTimer,
    endTimer,
    logMetrics,
    performanceScore,
    recommendation,
    isHighPerformance,
    shouldReduceQuality,
    shouldDisableAnimations
  }
}

// Re-export the PerformanceOverlay component for backward compatibility
export { PerformanceOverlay } from '../components/ui/PerformanceOverlay'