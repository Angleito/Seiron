import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { logger } from '../../lib/logger'

export interface VoicePerformanceConfig {
  enablePreloading?: boolean
  enableCaching?: boolean
  enableLazyLoading?: boolean
  maxCacheSize?: number
  preloadCommonPhrases?: boolean
  enablePerformanceMonitoring?: boolean
}

export interface VoicePerformanceMetrics {
  loadTime: number
  responseTime: number
  cacheHitRate: number
  memoryUsage: number
  errorRate: number
  totalInteractions: number
}

export interface VoicePerformanceOptimizerProps {
  config: VoicePerformanceConfig
  onMetricsUpdate?: (metrics: VoicePerformanceMetrics) => void
  enabled?: boolean
  className?: string
}

export const VoicePerformanceOptimizer: React.FC<VoicePerformanceOptimizerProps> = ({
  config,
  onMetricsUpdate,
  enabled = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<VoicePerformanceMetrics>({
    loadTime: 0,
    responseTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    errorRate: 0,
    totalInteractions: 0
  })

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationStatus, setOptimizationStatus] = useState<string>('')

  // Performance monitoring intervals
  const [performanceData, setPerformanceData] = useState({
    startTime: Date.now(),
    interactions: [] as Array<{
      timestamp: number
      type: string
      duration: number
      success: boolean
    }>,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  })

  // Common phrases for preloading (DBZ themed)
  const commonPhrases = useMemo(() => [
    "Voice navigation activated! Say 'Help' for commands or 'Power up' to summon the dragon!",
    "Summoning the portfolio dragon! Prepare for legendary DeFi powers!",
    "Opening the chat dimension. Your financial journey begins now!",
    "Elite Warrior mode activated! Master the art of DeFi training!",
    "Super Saiyan transformation initiated! Unleashing devastating DeFi combinations!",
    "Fusion Master techniques unlocked! Advanced portfolio strategies activated!",
    "Legendary Saiyan status achieved! Ultimate portfolio warrior powers unlocked!",
    "Learning about Seiron's legendary powers and origins!",
    "Command not recognized. Try saying 'Help' to hear available voice commands, or 'Power up' to summon the dragon!"
  ], [])

  // Preload common phrases for better performance
  const preloadCommonPhrases = useCallback(async () => {
    if (!config.enablePreloading || !enabled) return

    setIsOptimizing(true)
    setOptimizationStatus('Preloading voice responses...')

    try {
      logger.debug('🚀 Starting voice phrase preloading', {
        phraseCount: commonPhrases.length,
        enableCaching: config.enableCaching
      })

      // Simulate preloading process
      for (const phrase of commonPhrases) {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Dispatch preload event for TTS system
        const event = new CustomEvent('voicePreloadPhrase', {
          detail: { phrase, useCache: config.enableCaching }
        })
        window.dispatchEvent(event)
      }

      setOptimizationStatus('Voice preloading complete')
      logger.debug('✅ Voice phrase preloading completed')
      
    } catch (error) {
      logger.error('❌ Voice phrase preloading failed', error)
      setOptimizationStatus('Voice preloading failed')
    } finally {
      setIsOptimizing(false)
      setTimeout(() => setOptimizationStatus(''), 3000)
    }
  }, [config.enablePreloading, config.enableCaching, enabled, commonPhrases])

  // Monitor performance metrics
  const updateMetrics = useCallback(() => {
    if (!config.enablePerformanceMonitoring || !enabled) return

    const now = Date.now()
    const sessionDuration = now - performanceData.startTime
    const totalRequests = performanceData.cacheHits + performanceData.cacheMisses
    
    const newMetrics: VoicePerformanceMetrics = {
      loadTime: sessionDuration,
      responseTime: performanceData.interactions.length > 0
        ? performanceData.interactions.reduce((sum, interaction) => sum + interaction.duration, 0) / performanceData.interactions.length
        : 0,
      cacheHitRate: totalRequests > 0 ? (performanceData.cacheHits / totalRequests) * 100 : 0,
      memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0,
      errorRate: performanceData.interactions.length > 0
        ? (performanceData.errors / performanceData.interactions.length) * 100
        : 0,
      totalInteractions: performanceData.interactions.length
    }

    setMetrics(newMetrics)
    onMetricsUpdate?.(newMetrics)

    logger.debug('📊 Voice performance metrics updated', newMetrics)
  }, [config.enablePerformanceMonitoring, enabled, performanceData, onMetricsUpdate])

  // Handle voice interaction events for performance tracking
  useEffect(() => {
    if (!enabled) return

    const handleVoiceInteraction = (event: CustomEvent) => {
      const { type, duration = 0, success = true } = event.detail || {}
      
      setPerformanceData(prev => ({
        ...prev,
        interactions: [...prev.interactions, {
          timestamp: Date.now(),
          type,
          duration,
          success
        }],
        errors: success ? prev.errors : prev.errors + 1
      }))
    }

    const handleCacheHit = () => {
      setPerformanceData(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + 1
      }))
    }

    const handleCacheMiss = () => {
      setPerformanceData(prev => ({
        ...prev,
        cacheMisses: prev.cacheMisses + 1
      }))
    }

    // Listen for performance events
    window.addEventListener('voiceInteractionComplete', handleVoiceInteraction as EventListener)
    window.addEventListener('voiceCacheHit', handleCacheHit)
    window.addEventListener('voiceCacheMiss', handleCacheMiss)

    return () => {
      window.removeEventListener('voiceInteractionComplete', handleVoiceInteraction as EventListener)
      window.removeEventListener('voiceCacheHit', handleCacheHit)
      window.removeEventListener('voiceCacheMiss', handleCacheMiss)
    }
  }, [enabled])

  // Initialize optimizations
  useEffect(() => {
    if (!enabled) return

    const initializeOptimizations = async () => {
      logger.debug('🚀 Initializing voice performance optimizations', config)

      // Preload common phrases
      if (config.preloadCommonPhrases) {
        await preloadCommonPhrases()
      }

      // Setup performance monitoring
      if (config.enablePerformanceMonitoring) {
        const metricsInterval = setInterval(updateMetrics, 5000) // Update every 5 seconds
        return () => clearInterval(metricsInterval)
      }
    }

    initializeOptimizations()
  }, [enabled, config, preloadCommonPhrases, updateMetrics])

  // Memory cleanup for cache management
  useEffect(() => {
    if (!config.enableCaching || !enabled) return

    const cleanupCache = () => {
      const event = new CustomEvent('voiceCleanupCache', {
        detail: { maxSize: config.maxCacheSize || 50 }
      })
      window.dispatchEvent(event)
      logger.debug('🧹 Voice cache cleanup triggered')
    }

    // Cleanup cache every 10 minutes
    const cleanupInterval = setInterval(cleanupCache, 10 * 60 * 1000)

    return () => clearInterval(cleanupInterval)
  }, [config.enableCaching, config.maxCacheSize, enabled])

  // Lazy loading optimization
  const optimizeLazyLoading = useCallback(() => {
    if (!config.enableLazyLoading || !enabled) return

    // Implement intersection observer for voice components
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement
          const voiceFeature = element.getAttribute('data-voice-feature')
          
          if (voiceFeature) {
            // Preload this specific feature's voice content
            const event = new CustomEvent('voicePreloadFeature', {
              detail: { feature: voiceFeature }
            })
            window.dispatchEvent(event)
            observer.unobserve(element)
          }
        }
      })
    }, { threshold: 0.1 })

    // Observe all voice-enabled elements
    const voiceElements = document.querySelectorAll('[data-voice-feature], [data-voice-id]')
    voiceElements.forEach(element => observer.observe(element))

    return () => observer.disconnect()
  }, [config.enableLazyLoading, enabled])

  // Setup lazy loading observer
  useEffect(() => {
    if (config.enableLazyLoading && enabled) {
      const cleanup = optimizeLazyLoading()
      return cleanup
    }
  }, [config.enableLazyLoading, enabled, optimizeLazyLoading])

  if (!enabled) {
    return null
  }

  return (
    <div className={`voice-performance-optimizer ${className}`}>
      {/* Performance Status Indicator */}
      {isOptimizing && (
        <div className="fixed top-6 left-6 z-50">
          <div className="bg-blue-900/90 border border-blue-500/50 rounded-lg p-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">
              {optimizationStatus}
            </span>
          </div>
        </div>
      )}

      {/* Performance Metrics Display (Development Only) */}
      {process.env.NODE_ENV === 'development' && config.enablePerformanceMonitoring && (
        <div className="fixed top-20 left-6 z-40">
          <div className="bg-gray-900/90 border border-green-500/30 rounded-lg p-3 text-xs space-y-1">
            <div className="text-green-400 font-semibold mb-2">🚀 Voice Performance</div>
            <div className="text-gray-300">
              <div>Response Time: {metrics.responseTime.toFixed(0)}ms</div>
              <div>Cache Hit Rate: {metrics.cacheHitRate.toFixed(1)}%</div>
              <div>Error Rate: {metrics.errorRate.toFixed(1)}%</div>
              <div>Total Interactions: {metrics.totalInteractions}</div>
              {metrics.memoryUsage > 0 && (
                <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimization Controls (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-32 left-6 z-40">
          <div className="bg-gray-900/90 border border-yellow-500/30 rounded-lg p-3 space-y-2">
            <div className="text-yellow-400 font-semibold text-xs mb-2">🔧 Voice Optimization</div>
            <button
              onClick={preloadCommonPhrases}
              disabled={isOptimizing}
              className="w-full text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              Preload Phrases
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('voiceCleanupCache')
                window.dispatchEvent(event)
              }}
              className="w-full text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
            >
              Clear Cache
            </button>
            <button
              onClick={updateMetrics}
              className="w-full text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
            >
              Update Metrics
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoicePerformanceOptimizer

// Utility functions for external performance optimization
export const optimizeVoicePerformance = (config: VoicePerformanceConfig) => {
  const event = new CustomEvent('optimizeVoicePerformance', {
    detail: config
  })
  window.dispatchEvent(event)
}

export const getVoicePerformanceMetrics = (): Promise<VoicePerformanceMetrics> => {
  return new Promise((resolve) => {
    const handleMetrics = (event: CustomEvent) => {
      resolve(event.detail)
      window.removeEventListener('voicePerformanceMetrics', handleMetrics as EventListener)
    }
    
    window.addEventListener('voicePerformanceMetrics', handleMetrics as EventListener)
    
    const event = new CustomEvent('requestVoicePerformanceMetrics')
    window.dispatchEvent(event)
  })
}