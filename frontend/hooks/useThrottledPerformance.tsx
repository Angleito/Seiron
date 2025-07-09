import { useState, useEffect, useCallback, useRef } from 'react'
import { useStormPerformance } from './useStormPerformance'

interface ThrottledPerformanceOptions {
  updateInterval?: number // How often to update state (ms)
  enableAutoQualityAdjustment?: boolean
}

// Throttled performance hook that only updates state at intervals
export function useThrottledPerformance(options: ThrottledPerformanceOptions = {}) {
  const {
    updateInterval = 5000, // Update every 5 seconds instead of every frame
    enableAutoQualityAdjustment = true
  } = options

  const basePerformance = useStormPerformance({
    enableAutoQualityAdjustment,
    performanceCheckInterval: updateInterval
  })

  const [throttledMetrics, setThrottledMetrics] = useState(basePerformance.metrics)
  const [throttledConfig, setThrottledConfig] = useState(basePerformance.config)
  const lastUpdateRef = useRef(Date.now())

  // Only update state at intervals to prevent re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastUpdateRef.current >= updateInterval) {
        setThrottledMetrics(basePerformance.metrics)
        setThrottledConfig(basePerformance.config)
        lastUpdateRef.current = now
      }
    }, 1000) // Check every second but only update at interval

    return () => clearInterval(interval)
  }, [basePerformance.metrics, basePerformance.config, updateInterval])

  return {
    ...basePerformance,
    metrics: throttledMetrics,
    config: throttledConfig
  }
}