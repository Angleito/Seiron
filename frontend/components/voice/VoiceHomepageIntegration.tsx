import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import VoiceNavigationShortcuts from './VoiceNavigationShortcuts'
import VoiceFeatureDescriptor, { triggerFeatureDescription } from './VoiceFeatureDescriptor'
import VoicePerformanceOptimizer from './VoicePerformanceOptimizer'
import VoiceSectionNavigator from './VoiceSectionNavigator'
import VoiceInteractionFeedback from './VoiceInteractionFeedback'
import { logger } from '../../lib/logger'

export interface VoiceHomepageIntegrationProps {
  voiceConfig: {
    voiceId: string
    modelId?: string
    voiceSettings?: {
      stability?: number
      similarityBoost?: number
      style?: number
      useSpeakerBoost?: boolean
    }
  }
  onDragonSummon?: () => void
  onFeatureActivate?: (feature: string) => void
  onNavigationChange?: (destination: string) => void
  enabled?: boolean
  autoFeatureDescriptions?: boolean
  enablePerformanceOptimization?: boolean
  enableSectionNavigation?: boolean
  enableInteractionFeedback?: boolean
  feedbackMode?: 'minimal' | 'standard' | 'comprehensive'
  className?: string
}

export const VoiceHomepageIntegration: React.FC<VoiceHomepageIntegrationProps> = ({
  voiceConfig,
  onDragonSummon,
  onFeatureActivate,
  onNavigationChange,
  enabled = true,
  autoFeatureDescriptions = false,
  enablePerformanceOptimization = true,
  enableSectionNavigation = true,
  enableInteractionFeedback = true,
  feedbackMode = 'standard',
  className = ''
}) => {
  const navigate = useNavigate()
  const [isVoiceReady, setIsVoiceReady] = useState(false)
  const [voiceInteractionCount, setVoiceInteractionCount] = useState(0)
  const [deviceCompatibility, setDeviceCompatibility] = useState({
    speechRecognition: false,
    audioContext: false,
    microphone: false,
    isSecure: false,
    isMobile: false
  })

  // Enhanced voice config with DBZ-themed settings
  const enhancedVoiceConfig = useMemo(() => ({
    ...voiceConfig,
    voiceSettings: {
      stability: 0.8, // Stable, authoritative voice
      similarityBoost: 0.9, // Clear dragon voice
      style: 0.3, // Slightly dramatic for DBZ theme
      useSpeakerBoost: true,
      ...voiceConfig.voiceSettings
    }
  }), [voiceConfig])

  // Check device compatibility
  useEffect(() => {
    const checkCompatibility = async () => {
      const compatibility = {
        speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        audioContext: !!(window.AudioContext || window.webkitAudioContext),
        microphone: false,
        isSecure: window.location.protocol === 'https:' || 
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1',
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      }

      // Test microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        compatibility.microphone = true
        stream.getTracks().forEach(track => track.stop()) // Clean up
      } catch (error) {
        logger.warn('Microphone access not available', error)
        compatibility.microphone = false
      }

      setDeviceCompatibility(compatibility)
      
      // Only set voice ready if core features are supported
      if (compatibility.speechRecognition && compatibility.audioContext && compatibility.isSecure) {
        setIsVoiceReady(true)
        logger.debug('🎙️ Voice homepage integration initialized', {
          autoDescriptions: autoFeatureDescriptions,
          voiceId: voiceConfig.voiceId,
          compatibility
        })
      } else {
        logger.warn('🎙️ Voice features limited due to device compatibility', compatibility)
        setIsVoiceReady(false)
      }
    }

    if (enabled) {
      checkCompatibility()
    }
  }, [enabled, autoFeatureDescriptions, voiceConfig.voiceId])

  // Handle dragon summoning from voice commands
  const handleVoiceDragonSummon = useCallback(() => {
    logger.debug('🐉 Voice dragon summoning triggered')
    setVoiceInteractionCount(prev => prev + 1)
    onDragonSummon?.()
  }, [onDragonSummon])

  // Handle feature activation from voice
  const handleVoiceFeatureActivate = useCallback((feature: string) => {
    logger.debug('🎮 Voice feature activation', { feature })
    setVoiceInteractionCount(prev => prev + 1)
    onFeatureActivate?.(feature)
  }, [onFeatureActivate])

  // Handle navigation from voice
  const handleVoiceNavigation = useCallback((destination: string) => {
    logger.debug('🧭 Voice navigation triggered', { destination })
    setVoiceInteractionCount(prev => prev + 1)
    onNavigationChange?.(destination)
  }, [onNavigationChange])

  // Setup homepage element voice integration
  useEffect(() => {
    if (!enabled || !isVoiceReady) return

    // Add voice interaction handlers to homepage elements
    const setupElementVoiceHandlers = () => {
      // Hero section voice activation
      const heroSection = document.querySelector('[data-voice-id="hero-section"]') || 
                          document.querySelector('.dbz-title')?.parentElement
      if (heroSection) {
        heroSection.addEventListener('mouseenter', () => {
          if (autoFeatureDescriptions) {
            triggerFeatureDescription('hero-section')
          }
        })
        heroSection.addEventListener('click', () => {
          triggerFeatureDescription('hero-section', true)
        })
      }

      // Power level display
      const powerLevelDisplay = document.querySelector('[data-voice-id="power-level"]') || 
                               document.querySelector('.dbz-power-level')
      if (powerLevelDisplay) {
        powerLevelDisplay.addEventListener('mouseenter', () => {
          if (autoFeatureDescriptions) {
            triggerFeatureDescription('power-level-display')
          }
        })
        powerLevelDisplay.addEventListener('click', () => {
          triggerFeatureDescription('power-level-display', true)
        })
      }

      // Dragon summon button
      const summonButton = document.querySelector('[data-voice-id="summon-button"]') ||
                          document.querySelector('button:contains("READY TO POWER UP")')
      if (summonButton) {
        summonButton.addEventListener('mouseenter', () => {
          if (autoFeatureDescriptions) {
            triggerFeatureDescription('summon-button')
          }
        })
        summonButton.addEventListener('click', () => {
          triggerFeatureDescription('summon-button', true)
        })
      }

      // Feature cards
      const featureCards = document.querySelectorAll('.dbz-feature-card') ||
                          document.querySelectorAll('[data-voice-feature]')
      featureCards.forEach((card, index) => {
        const featureTypes = ['elite-warrior', 'super-saiyan', 'fusion-master', 'legendary-saiyan']
        const featureType = card.getAttribute('data-voice-feature') || featureTypes[index]
        
        if (featureType) {
          card.addEventListener('mouseenter', () => {
            if (autoFeatureDescriptions) {
              triggerFeatureDescription(featureType)
            }
          })
          card.addEventListener('click', () => {
            triggerFeatureDescription(featureType, true)
          })
        }
      })

      // Navigation links
      const navLinks = document.querySelectorAll('button[class*="hover:dbz-text"]')
      navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
          if (autoFeatureDescriptions) {
            triggerFeatureDescription('navigation-links')
          }
        })
        link.addEventListener('click', () => {
          triggerFeatureDescription('navigation-links', true)
        })
      })
    }

    // Setup handlers after DOM is ready
    const setupTimer = setTimeout(setupElementVoiceHandlers, 1000)

    return () => {
      clearTimeout(setupTimer)
    }
  }, [enabled, isVoiceReady, autoFeatureDescriptions])

  // Listen for voice events from other components
  useEffect(() => {
    if (!enabled) return

    const handleVoiceDragonSummonEvent = (event: CustomEvent) => {
      const { source } = event.detail || {}
      logger.debug('🐉 Voice dragon summon event received', { source })
      handleVoiceDragonSummon()
    }

    const handleVoiceStateChange = (event: CustomEvent) => {
      const { type, data } = event.detail || {}
      logger.debug('🎙️ Voice state change detected', { type, data })
      
      // Track voice interaction patterns
      if (type === 'listening_start' || type === 'speaking_start') {
        setVoiceInteractionCount(prev => prev + 1)
      }
    }

    // Add event listeners
    window.addEventListener('voiceDragonSummon', handleVoiceDragonSummonEvent as EventListener)
    window.addEventListener('voiceStateChange', handleVoiceStateChange as EventListener)

    return () => {
      window.removeEventListener('voiceDragonSummon', handleVoiceDragonSummonEvent as EventListener)
      window.removeEventListener('voiceStateChange', handleVoiceStateChange as EventListener)
    }
  }, [enabled, handleVoiceDragonSummon])

  // Voice interaction analytics
  useEffect(() => {
    if (voiceInteractionCount > 0) {
      logger.debug('🎙️ Voice interaction analytics', {
        totalInteractions: voiceInteractionCount,
        sessionDuration: Date.now() - (Date.now() - 60000) // Approximate
      })
    }
  }, [voiceInteractionCount])

  // Keyboard shortcuts for voice features
  useEffect(() => {
    if (!enabled) return

    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Only activate if not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'v':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            // Toggle voice navigation
            const toggleEvent = new CustomEvent('toggleVoiceNavigation')
            window.dispatchEvent(toggleEvent)
          }
          break
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            // Describe all features
            const describeEvent = new CustomEvent('voiceDescribeAll')
            window.dispatchEvent(describeEvent)
          }
          break
        case 'escape':
          // Stop all voice activities
          const stopEvent = new CustomEvent('voiceStopDescription')
          window.dispatchEvent(stopEvent)
          break
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [enabled])

  if (!enabled) {
    return null
  }

  // Show compatibility warning if voice features are limited
  if (!isVoiceReady) {
    return (
      <div className={`voice-homepage-integration ${className}`}>
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-yellow-900/90 border border-yellow-500/50 rounded-lg p-3 max-w-xs">
            <div className="text-yellow-400 font-semibold text-sm mb-2">
              🎙️ Voice Features Limited
            </div>
            <div className="text-yellow-300 text-xs space-y-1">
              {!deviceCompatibility.speechRecognition && (
                <div>• Speech recognition not supported</div>
              )}
              {!deviceCompatibility.audioContext && (
                <div>• Audio playback not supported</div>
              )}
              {!deviceCompatibility.isSecure && (
                <div>• Secure connection required (HTTPS)</div>
              )}
              {deviceCompatibility.isMobile && (
                <div>• Mobile experience may be limited</div>
              )}
            </div>
            <div className="text-yellow-500 text-xs mt-2">
              Try using Chrome, Edge, or Safari with HTTPS
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`voice-homepage-integration ${className}`}>
      {/* Voice Navigation Shortcuts */}
      <VoiceNavigationShortcuts
        voiceConfig={enhancedVoiceConfig}
        onFeatureActivate={handleVoiceFeatureActivate}
        onNavigationChange={handleVoiceNavigation}
        enabled={isVoiceReady}
        className="voice-navigation"
      />

      {/* Voice Feature Descriptor */}
      <VoiceFeatureDescriptor
        voiceConfig={enhancedVoiceConfig}
        enabled={isVoiceReady}
        autoDescribe={autoFeatureDescriptions}
        className="voice-descriptor"
      />

      {/* Voice Section Navigator */}
      {enableSectionNavigation && (
        <VoiceSectionNavigator
          voiceConfig={enhancedVoiceConfig}
          onSectionChange={onNavigationChange}
          enabled={isVoiceReady}
          className="voice-section-navigator"
        />
      )}

      {/* Voice Interaction Feedback */}
      {enableInteractionFeedback && (
        <VoiceInteractionFeedback
          voiceConfig={enhancedVoiceConfig}
          feedbackMode={feedbackMode}
          enabled={isVoiceReady}
          className="voice-interaction-feedback"
        />
      )}

      {/* Voice Performance Optimizer */}
      {enablePerformanceOptimization && (
        <VoicePerformanceOptimizer
          config={{
            enablePreloading: true,
            enableCaching: true,
            enableLazyLoading: true,
            maxCacheSize: 50,
            preloadCommonPhrases: true,
            enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
          }}
          enabled={isVoiceReady}
          className="voice-performance-optimizer"
        />
      )}

      {/* Device Compatibility Status (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-900/80 border border-blue-500/30 rounded-lg p-2 text-xs">
            <div className="text-blue-400 font-semibold mb-1">
              🎙️ Voice Status
            </div>
            <div className="text-gray-300 space-y-1">
              <div>Interactions: {voiceInteractionCount}</div>
              <div>Ready: {isVoiceReady ? '✅' : '❌'}</div>
              <div>Speech: {deviceCompatibility.speechRecognition ? '✅' : '❌'}</div>
              <div>Audio: {deviceCompatibility.audioContext ? '✅' : '❌'}</div>
              <div>Mic: {deviceCompatibility.microphone ? '✅' : '❌'}</div>
              <div>Secure: {deviceCompatibility.isSecure ? '✅' : '❌'}</div>
              {deviceCompatibility.isMobile && (
                <div className="text-yellow-400">📱 Mobile Device</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Status Indicator */}
      <div className="voice-status-indicator">
        {/* This will be used by child components to show voice status */}
      </div>
    </div>
  )
}

export default VoiceHomepageIntegration

// Utility functions for external use
export const enableVoiceHomepage = () => {
  const event = new CustomEvent('enableVoiceHomepage')
  window.dispatchEvent(event)
}

export const disableVoiceHomepage = () => {
  const event = new CustomEvent('disableVoiceHomepage')
  window.dispatchEvent(event)
}

export const triggerVoiceDragonSummon = () => {
  const event = new CustomEvent('voiceDragonSummon', {
    detail: { source: 'external', timestamp: Date.now() }
  })
  window.dispatchEvent(event)
}