import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from '../../lib/logger'

export interface VoiceHomepageConfig {
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
  autoFeatureDescriptions?: boolean
  enableShortcuts?: boolean
  enablePerformanceOptimization?: boolean
}

export interface VoiceHomepageState {
  isEnabled: boolean
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  currentFeature: string | null
  interactionCount: number
  lastCommand: string | null
  error: Error | null
}

export interface VoiceHomepageActions {
  enable: () => void
  disable: () => void
  toggle: () => void
  activateFeature: (feature: string) => void
  processCommand: (command: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

const initialState: VoiceHomepageState = {
  isEnabled: false,
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  currentFeature: null,
  interactionCount: 0,
  lastCommand: null,
  error: null
}

export const useVoiceHomepageIntegration = (config: VoiceHomepageConfig) => {
  const [state, setState] = useState<VoiceHomepageState>(initialState)
  const performanceMetrics = useRef({
    startTime: Date.now(),
    commandProcessingTimes: [] as number[],
    errorCount: 0,
    successfulInteractions: 0
  })

  // Validate configuration
  useEffect(() => {
    if (!config.voiceId) {
      logger.error('🎙️ Voice homepage integration requires voiceId in config')
      setState(prev => ({ 
        ...prev, 
        error: new Error('Voice configuration missing voiceId') 
      }))
    }
  }, [config.voiceId])

  // Enable voice features
  const enable = useCallback(() => {
    logger.debug('🎙️ Enabling voice homepage integration')
    setState(prev => ({ 
      ...prev, 
      isEnabled: true, 
      error: null 
    }))
    
    // Dispatch global event for other components
    const event = new CustomEvent('voiceHomepageEnabled', {
      detail: { timestamp: Date.now(), config }
    })
    window.dispatchEvent(event)
  }, [config])

  // Disable voice features
  const disable = useCallback(() => {
    logger.debug('🎙️ Disabling voice homepage integration')
    setState(prev => ({ 
      ...prev, 
      isEnabled: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentFeature: null 
    }))
    
    // Dispatch global event for cleanup
    const event = new CustomEvent('voiceHomepageDisabled', {
      detail: { timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }, [])

  // Toggle voice features
  const toggle = useCallback(() => {
    if (state.isEnabled) {
      disable()
    } else {
      enable()
    }
  }, [state.isEnabled, enable, disable])

  // Activate a specific feature
  const activateFeature = useCallback((feature: string) => {
    logger.debug('🎮 Activating voice feature', { feature })
    setState(prev => ({ 
      ...prev, 
      currentFeature: feature,
      interactionCount: prev.interactionCount + 1
    }))
    
    performanceMetrics.current.successfulInteractions++
    
    // Dispatch feature activation event
    const event = new CustomEvent('voiceFeatureActivated', {
      detail: { feature, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }, [])

  // Process voice commands
  const processCommand = useCallback(async (command: string) => {
    if (!state.isEnabled) {
      logger.warn('🎙️ Voice command ignored - integration disabled', { command })
      return
    }

    const startTime = Date.now()
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      lastCommand: command 
    }))

    try {
      logger.debug('🎙️ Processing voice command', { command })
      
      // Command processing logic would go here
      // This is a placeholder for the actual command processing
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const processingTime = Date.now() - startTime
      performanceMetrics.current.commandProcessingTimes.push(processingTime)
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        interactionCount: prev.interactionCount + 1
      }))
      
      logger.debug('🎙️ Voice command processed successfully', { 
        command, 
        processingTime 
      })
      
    } catch (error) {
      logger.error('🎙️ Voice command processing failed', { command, error })
      performanceMetrics.current.errorCount++
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error instanceof Error ? error : new Error(String(error))
      }))
    }
  }, [state.isEnabled])

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Reset to initial state
  const reset = useCallback(() => {
    logger.debug('🎙️ Resetting voice homepage integration')
    setState(initialState)
    performanceMetrics.current = {
      startTime: Date.now(),
      commandProcessingTimes: [],
      errorCount: 0,
      successfulInteractions: 0
    }
  }, [])

  // Listen for global voice events
  useEffect(() => {
    if (!state.isEnabled) return

    const handleVoiceStateChange = (event: CustomEvent) => {
      const { type } = event.detail || {}
      
      switch (type) {
        case 'listening_start':
          setState(prev => ({ ...prev, isListening: true }))
          break
        case 'listening_stop':
          setState(prev => ({ ...prev, isListening: false }))
          break
        case 'speaking_start':
          setState(prev => ({ ...prev, isSpeaking: true }))
          break
        case 'speaking_stop':
          setState(prev => ({ ...prev, isSpeaking: false }))
          break
        case 'voice_idle':
          setState(prev => ({ 
            ...prev, 
            isListening: false, 
            isSpeaking: false, 
            isProcessing: false 
          }))
          break
      }
    }

    const handleToggleRequest = () => {
      toggle()
    }

    window.addEventListener('voiceStateChange', handleVoiceStateChange as EventListener)
    window.addEventListener('toggleVoiceNavigation', handleToggleRequest)

    return () => {
      window.removeEventListener('voiceStateChange', handleVoiceStateChange as EventListener)
      window.removeEventListener('toggleVoiceNavigation', handleToggleRequest)
    }
  }, [state.isEnabled, toggle])

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    const metrics = performanceMetrics.current
    const avgProcessingTime = metrics.commandProcessingTimes.length > 0
      ? metrics.commandProcessingTimes.reduce((a, b) => a + b, 0) / metrics.commandProcessingTimes.length
      : 0

    return {
      sessionDuration: Date.now() - metrics.startTime,
      totalInteractions: state.interactionCount,
      successfulInteractions: metrics.successfulInteractions,
      errorCount: metrics.errorCount,
      averageProcessingTime: avgProcessingTime,
      successRate: state.interactionCount > 0 
        ? (metrics.successfulInteractions / state.interactionCount) * 100 
        : 0
    }
  }, [state.interactionCount])

  // Log performance metrics periodically (development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !state.isEnabled) return

    const metricsInterval = setInterval(() => {
      if (state.interactionCount > 0) {
        const metrics = getPerformanceMetrics()
        logger.debug('🎙️ Voice homepage performance metrics', metrics)
      }
    }, 30000) // Log every 30 seconds

    return () => clearInterval(metricsInterval)
  }, [state.isEnabled, state.interactionCount, getPerformanceMetrics])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isEnabled) {
        disable()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const actions: VoiceHomepageActions = {
    enable,
    disable,
    toggle,
    activateFeature,
    processCommand,
    clearError,
    reset
  }

  return {
    state,
    actions,
    config,
    getPerformanceMetrics,
    // Computed properties
    isActive: state.isEnabled && (state.isListening || state.isSpeaking || state.isProcessing),
    hasError: !!state.error,
    canProcessCommands: state.isEnabled && !state.isProcessing
  }
}

export default useVoiceHomepageIntegration

// Type exports for external use
export type {
  VoiceHomepageConfig,
  VoiceHomepageState,
  VoiceHomepageActions
}