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

export const usePerformanceMonitor = (enabled: boolean = true) => {
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

      // Update metrics every 60 frames (roughly once per second at 60fps)
      if (frameCount.current % 60 === 0) {
        const fps = Math.round(1000 / (deltaTime / 60))
        const frameTime = deltaTime / 60
        const renderTime = currentTime - renderStartTime.current

        // Get memory usage if available
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

  return {
    metrics,
    startRender,
    endRender
  }
}