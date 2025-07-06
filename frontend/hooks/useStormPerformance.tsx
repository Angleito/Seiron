import { useState, useEffect, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  isLowPerformance: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
  batteryLevel?: number
  connectionSpeed: 'slow' | 'fast' | 'unknown'
}

interface StormPerformanceConfig {
  particleCount: number
  animationQuality: 'low' | 'medium' | 'high'
  enableAdvancedEffects: boolean
  enableParallax: boolean
  cloudLayers: number
  maxLightningBolts: number
  fogDensity: number
}

interface UseStormPerformanceOptions {
  targetFPS?: number
  performanceCheckInterval?: number
  enableAutoQualityAdjustment?: boolean
  memoryThreshold?: number
}

export function useStormPerformance(options: UseStormPerformanceOptions = {}) {
  const {
    targetFPS = 45,
    performanceCheckInterval = 2000,
    enableAutoQualityAdjustment = true,
    memoryThreshold = 100 * 1024 * 1024 // 100MB
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    isLowPerformance: false,
    deviceType: 'desktop',
    connectionSpeed: 'unknown'
  })

  const [config, setConfig] = useState<StormPerformanceConfig>({
    particleCount: 6,
    animationQuality: 'high',
    enableAdvancedEffects: true,
    enableParallax: true,
    cloudLayers: 3,
    maxLightningBolts: 3,
    fogDensity: 0.3
  })

  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const fpsHistory = useRef<number[]>([])
  const rafId = useRef<number>()
  const performanceCheckId = useRef<number>()

  // Detect device type
  const detectDeviceType = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    const userAgent = navigator.userAgent
    const screenWidth = window.innerWidth
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return screenWidth < 768 ? 'mobile' : 'tablet'
    }
    return screenWidth < 1024 ? 'tablet' : 'desktop'
  }, [])

  // Detect connection speed
  const detectConnectionSpeed = useCallback((): 'slow' | 'fast' | 'unknown' => {
    const connection = (navigator as any).connection
    if (!connection) return 'unknown'

    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
    if (effectiveType === '3g') return 'slow'
    return 'fast'
  }, [])

  // Get battery level if available
  const getBatteryLevel = useCallback(async (): Promise<number | undefined> => {
    try {
      const battery = await (navigator as any).getBattery?.()
      return battery?.level
    } catch {
      return undefined
    }
  }, [])

  // Memory usage estimation
  const getMemoryUsage = useCallback((): number => {
    const performance = (window as any).performance
    if (performance?.memory) {
      return performance.memory.usedJSHeapSize || 0
    }
    return 0
  }, [])

  // FPS monitoring
  const measureFPS = useCallback(() => {
    const now = performance.now()
    const delta = now - lastTime.current
    
    if (delta >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / delta)
      fpsHistory.current.push(fps)
      
      // Keep only last 10 measurements
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift()
      }
      
      const avgFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
      
      setMetrics(prev => ({
        ...prev,
        fps: avgFPS,
        memoryUsage: getMemoryUsage(),
        isLowPerformance: avgFPS < targetFPS
      }))
      
      frameCount.current = 0
      lastTime.current = now
    }
    
    frameCount.current++
    rafId.current = requestAnimationFrame(measureFPS)
  }, [targetFPS, getMemoryUsage])

  // Auto-adjust quality based on performance
  const adjustQuality = useCallback(() => {
    if (!enableAutoQualityAdjustment) return

    const { fps, memoryUsage, deviceType, connectionSpeed, batteryLevel } = metrics
    
    let newConfig = { ...config }
    
    // Base adjustments for device type
    if (deviceType === 'mobile') {
      newConfig.particleCount = Math.min(newConfig.particleCount, 3)
      newConfig.cloudLayers = Math.min(newConfig.cloudLayers, 2)
      newConfig.maxLightningBolts = 1
      newConfig.fogDensity = Math.min(newConfig.fogDensity, 0.2)
    } else if (deviceType === 'tablet') {
      newConfig.particleCount = Math.min(newConfig.particleCount, 4)
      newConfig.cloudLayers = Math.min(newConfig.cloudLayers, 3)
      newConfig.maxLightningBolts = 2
    }

    // FPS-based adjustments
    if (fps < targetFPS * 0.8) {
      newConfig.animationQuality = 'low'
      newConfig.enableAdvancedEffects = false
      newConfig.enableParallax = false
      newConfig.particleCount = Math.max(1, Math.floor(newConfig.particleCount * 0.5))
      newConfig.cloudLayers = Math.max(1, Math.floor(newConfig.cloudLayers * 0.5))
      newConfig.fogDensity *= 0.5
    } else if (fps < targetFPS * 0.9) {
      newConfig.animationQuality = 'medium'
      newConfig.enableAdvancedEffects = false
      newConfig.particleCount = Math.max(2, Math.floor(newConfig.particleCount * 0.7))
      newConfig.fogDensity *= 0.7
    } else if (fps > targetFPS * 1.1 && config.animationQuality !== 'high') {
      // Gradually increase quality if performance is good
      newConfig.animationQuality = 'high'
      newConfig.enableAdvancedEffects = true
      newConfig.enableParallax = true
      if (deviceType === 'desktop') {
        newConfig.particleCount = Math.min(6, newConfig.particleCount + 1)
        newConfig.cloudLayers = Math.min(3, newConfig.cloudLayers + 1)
      }
    }

    // Memory-based adjustments
    if (memoryUsage > memoryThreshold) {
      newConfig.particleCount = Math.max(1, Math.floor(newConfig.particleCount * 0.6))
      newConfig.enableAdvancedEffects = false
      newConfig.fogDensity *= 0.6
    }

    // Battery-based adjustments
    if (batteryLevel && batteryLevel < 0.2) {
      newConfig.animationQuality = 'low'
      newConfig.enableAdvancedEffects = false
      newConfig.enableParallax = false
      newConfig.particleCount = Math.max(1, Math.floor(newConfig.particleCount * 0.5))
    }

    // Connection speed adjustments
    if (connectionSpeed === 'slow') {
      newConfig.animationQuality = 'low'
      newConfig.enableAdvancedEffects = false
    }

    setConfig(newConfig)
  }, [
    metrics, 
    config, 
    targetFPS, 
    memoryThreshold, 
    enableAutoQualityAdjustment
  ])

  // Performance monitoring setup
  useEffect(() => {
    const initializeMetrics = async () => {
      const deviceType = detectDeviceType()
      const connectionSpeed = detectConnectionSpeed()
      const batteryLevel = await getBatteryLevel()
      
      setMetrics(prev => ({
        ...prev,
        deviceType,
        connectionSpeed,
        batteryLevel
      }))
    }

    initializeMetrics()
    
    // Start FPS monitoring
    rafId.current = requestAnimationFrame(measureFPS)
    
    // Start performance checks
    performanceCheckId.current = window.setInterval(adjustQuality, performanceCheckInterval)
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
      if (performanceCheckId.current) {
        clearInterval(performanceCheckId.current)
      }
    }
  }, [measureFPS, adjustQuality, performanceCheckInterval, detectDeviceType, detectConnectionSpeed, getBatteryLevel])

  // Manual quality adjustment
  const setQuality = useCallback((quality: 'low' | 'medium' | 'high') => {
    const qualityConfigs = {
      low: {
        particleCount: 2,
        animationQuality: 'low' as const,
        enableAdvancedEffects: false,
        enableParallax: false,
        cloudLayers: 1,
        maxLightningBolts: 1,
        fogDensity: 0.1
      },
      medium: {
        particleCount: 4,
        animationQuality: 'medium' as const,
        enableAdvancedEffects: false,
        enableParallax: true,
        cloudLayers: 2,
        maxLightningBolts: 2,
        fogDensity: 0.2
      },
      high: {
        particleCount: 6,
        animationQuality: 'high' as const,
        enableAdvancedEffects: true,
        enableParallax: true,
        cloudLayers: 3,
        maxLightningBolts: 3,
        fogDensity: 0.3
      }
    }

    setConfig(qualityConfigs[quality])
  }, [])

  // Cleanup function for canvas and resources
  const cleanup = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    if (performanceCheckId.current) {
      clearInterval(performanceCheckId.current)
    }
  }, [])

  return {
    metrics,
    config,
    setQuality,
    cleanup,
    isLowPerformance: metrics.isLowPerformance,
    isMobile: metrics.deviceType === 'mobile',
    isTablet: metrics.deviceType === 'tablet',
    isDesktop: metrics.deviceType === 'desktop'
  }
}

// Helper hook for lazy loading components
export function useLazyStormEffects() {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const observerRef = useRef<IntersectionObserver>()
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!elementRef.current) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true)
          // Delay rendering to avoid blocking
          setTimeout(() => setShouldRender(true), 100)
        } else {
          setIsVisible(false)
          // Keep rendered for smooth transitions
          setTimeout(() => setShouldRender(false), 1000)
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(elementRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return {
    elementRef,
    isVisible,
    shouldRender
  }
}

// Performance monitor component for debugging
export function StormPerformanceMonitor() {
  const { metrics, config } = useStormPerformance()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div>FPS: {metrics.fps.toFixed(1)}</div>
      <div>Memory: {(metrics.memoryUsage / (1024 * 1024)).toFixed(1)}MB</div>
      <div>Device: {metrics.deviceType}</div>
      <div>Quality: {config.animationQuality}</div>
      <div>Particles: {config.particleCount}</div>
      <div>Clouds: {config.cloudLayers}</div>
      <div className={metrics.isLowPerformance ? 'text-red-400' : 'text-green-400'}>
        {metrics.isLowPerformance ? 'LOW PERF' : 'GOOD PERF'}
      </div>
    </div>
  )
}