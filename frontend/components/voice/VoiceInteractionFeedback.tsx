import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useSecureElevenLabsTTS } from '../../hooks/voice/useSecureElevenLabsTTS'
import { logger } from '../../lib/logger'
import { DragonBallLoadingStates } from '../chat/parts/DragonBallLoadingStates'

export interface VoiceInteractionFeedbackProps {
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
  feedbackMode?: 'minimal' | 'standard' | 'comprehensive'
  enableHoverFeedback?: boolean
  enableClickFeedback?: boolean
  enableStateChangeFeedback?: boolean
  className?: string
  enabled?: boolean
}

interface InteractionFeedback {
  id: string
  trigger: string
  condition?: (element: Element, event: Event) => boolean
  message: string
  priority: number
  cooldown?: number
}

export const VoiceInteractionFeedback: React.FC<VoiceInteractionFeedbackProps> = ({
  voiceConfig,
  feedbackMode = 'standard',
  enableHoverFeedback = true,
  enableClickFeedback = true,
  enableStateChangeFeedback = true,
  className = '',
  enabled = true
}) => {
  const [feedbackQueue, setFeedbackQueue] = useState<Array<{
    id: string
    message: string
    timestamp: number
    priority: number
  }>>([])
  const [cooldowns, setCooldowns] = useState<Map<string, number>>(new Map())
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState<string>('')

  const { speak, isSpeaking, stop } = useSecureElevenLabsTTS(voiceConfig)

  // Define interaction feedback messages with DBZ theming
  const interactionFeedbacks: InteractionFeedback[] = useMemo(() => [
    // Hover feedback
    {
      id: 'hero-hover',
      trigger: 'hover',
      message: 'The legendary Seiron portal! Your gateway to ultimate DeFi mastery awaits!',
      priority: 3,
      cooldown: 10000
    },
    {
      id: 'power-level-hover',
      trigger: 'hover',
      message: 'Scouter reading: Power level over 30 thousand! Seiron\'s energy is off the charts!',
      priority: 3,
      cooldown: 8000
    },
    {
      id: 'summon-button-hover',
      trigger: 'hover',
      message: 'Dragon summoning altar detected! Prepare to unleash legendary powers!',
      priority: 4,
      cooldown: 5000
    },
    {
      id: 'elite-warrior-hover',
      trigger: 'hover',
      message: 'Elite Warrior training grounds! Perfect for beginners seeking DeFi mastery!',
      priority: 2,
      cooldown: 12000
    },
    {
      id: 'super-saiyan-hover',
      trigger: 'hover',
      message: 'Super Saiyan transformation chamber! Devastating portfolio techniques await!',
      priority: 2,
      cooldown: 12000
    },
    {
      id: 'fusion-master-hover',
      trigger: 'hover',
      message: 'Fusion Master dojo! Advanced strategies for elite portfolio warriors!',
      priority: 2,
      cooldown: 12000
    },
    {
      id: 'legendary-saiyan-hover',
      trigger: 'hover',
      message: 'Legendary Saiyan temple! Ultimate power awaits the worthy!',
      priority: 2,
      cooldown: 12000
    },

    // Click feedback
    {
      id: 'summon-button-click',
      trigger: 'click',
      message: 'Dragon summoning ritual initiated! Brace yourself for an epic transformation!',
      priority: 5,
      cooldown: 0
    },
    {
      id: 'feature-card-click',
      trigger: 'click',
      message: 'Training program selected! Prepare to ascend to new power levels!',
      priority: 4,
      cooldown: 2000
    },
    {
      id: 'navigation-click',
      trigger: 'click',
      message: 'Navigation engaged! Exploring new dimensions of Seiron\'s power!',
      priority: 3,
      cooldown: 5000
    },
    {
      id: 'about-click',
      trigger: 'click',
      message: 'Accessing sacred scrolls! Learning the origins of legendary power!',
      priority: 3,
      cooldown: 0
    },

    // State change feedback
    {
      id: 'summoning-start',
      trigger: 'state-change',
      message: 'The dragon awakens! Reality itself bends to Seiron\'s will!',
      priority: 5,
      cooldown: 0
    },
    {
      id: 'power-level-increase',
      trigger: 'state-change',
      message: 'Power level rising! Seiron\'s energy continues to surge!',
      priority: 4,
      cooldown: 15000
    },
    {
      id: 'page-load',
      trigger: 'state-change',
      message: 'Welcome to Seiron! Your legendary DeFi journey begins now!',
      priority: 2,
      cooldown: 0
    }
  ], [])

  // Filter feedback based on mode
  const activeFeedbacks = useMemo(() => {
    switch (feedbackMode) {
      case 'minimal':
        return interactionFeedbacks.filter(f => f.priority >= 4)
      case 'comprehensive':
        return interactionFeedbacks
      case 'standard':
      default:
        return interactionFeedbacks.filter(f => f.priority >= 3)
    }
  }, [interactionFeedbacks, feedbackMode])

  // Check if feedback is on cooldown
  const isOnCooldown = useCallback((feedbackId: string, cooldownTime: number): boolean => {
    if (cooldownTime === 0) return false
    
    const lastTriggered = cooldowns.get(feedbackId)
    if (!lastTriggered) return false
    
    return Date.now() - lastTriggered < cooldownTime
  }, [cooldowns])

  // Add feedback to queue
  const queueFeedback = useCallback((feedback: InteractionFeedback) => {
    if (!enabled || isOnCooldown(feedback.id, feedback.cooldown || 0)) {
      return
    }

    logger.debug('🎙️ Queueing interaction feedback', {
      feedbackId: feedback.id,
      trigger: feedback.trigger,
      priority: feedback.priority
    })

    setFeedbackQueue(prev => {
      // Remove existing feedback with same ID
      const filtered = prev.filter(f => f.id !== feedback.id)
      
      // Add new feedback
      const newFeedback = {
        id: feedback.id,
        message: feedback.message,
        timestamp: Date.now(),
        priority: feedback.priority
      }
      
      // Sort by priority (higher first) and timestamp
      return [...filtered, newFeedback].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.timestamp - b.timestamp
      })
    })

    // Update cooldown
    if (feedback.cooldown && feedback.cooldown > 0) {
      setCooldowns(prev => new Map(prev.set(feedback.id, Date.now())))
    }
  }, [enabled, isOnCooldown])

  // Process feedback queue
  useEffect(() => {
    if (feedbackQueue.length === 0 || isSpeaking || isProcessingFeedback) {
      return
    }

    const processFeedback = async () => {
      const nextFeedback = feedbackQueue[0]
      setIsProcessingFeedback(true)
      setCurrentFeedback(nextFeedback.message)

      try {
        logger.debug('🗣️ Speaking interaction feedback', {
          feedbackId: nextFeedback.id,
          messageLength: nextFeedback.message.length
        })

        const result = await speak(nextFeedback.message)()
        if (result._tag === 'Left') {
          logger.error('Interaction feedback speech failed', result.left)
        }

        // Remove processed feedback from queue
        setFeedbackQueue(prev => prev.slice(1))
        
      } catch (error) {
        logger.error('Interaction feedback error', error)
      } finally {
        setIsProcessingFeedback(false)
        setCurrentFeedback('')
      }
    }

    processFeedback()
  }, [feedbackQueue, isSpeaking, isProcessingFeedback, speak])

  // Setup interaction listeners
  useEffect(() => {
    if (!enabled) return

    // Hover feedback handlers
    const handleHover = (event: MouseEvent) => {
      if (!enableHoverFeedback) return

      const target = event.target as Element
      const voiceId = target.getAttribute('data-voice-id')
      const voiceFeature = target.getAttribute('data-voice-feature')
      
      let feedbackId: string | null = null
      
      if (voiceId) {
        feedbackId = `${voiceId}-hover`
      } else if (voiceFeature) {
        feedbackId = `${voiceFeature}-hover`
      } else if (target.classList.contains('dbz-title')) {
        feedbackId = 'hero-hover'
      } else if (target.classList.contains('dbz-button-primary')) {
        feedbackId = 'summon-button-hover'
      }

      if (feedbackId) {
        const feedback = activeFeedbacks.find(f => f.id === feedbackId)
        if (feedback) {
          queueFeedback(feedback)
        }
      }
    }

    // Click feedback handlers
    const handleClick = (event: MouseEvent) => {
      if (!enableClickFeedback) return

      const target = event.target as Element
      const voiceId = target.getAttribute('data-voice-id')
      const voiceFeature = target.getAttribute('data-voice-feature')
      
      let feedbackId: string | null = null
      
      if (voiceId === 'summon-button') {
        feedbackId = 'summon-button-click'
      } else if (voiceFeature) {
        feedbackId = 'feature-card-click'
      } else if (target.textContent?.includes('ABOUT')) {
        feedbackId = 'about-click'
      } else if (target.classList.contains('hover:dbz-text-saiyan') || 
                target.classList.contains('hover:dbz-text-energy')) {
        feedbackId = 'navigation-click'
      }

      if (feedbackId) {
        const feedback = activeFeedbacks.find(f => f.id === feedbackId)
        if (feedback) {
          queueFeedback(feedback)
        }
      }
    }

    // Add event listeners
    document.addEventListener('mouseover', handleHover)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mouseover', handleHover)
      document.removeEventListener('click', handleClick)
    }
  }, [enabled, enableHoverFeedback, enableClickFeedback, activeFeedbacks, queueFeedback])

  // Listen for state change events
  useEffect(() => {
    if (!enabled || !enableStateChangeFeedback) return

    const handleStateChange = (event: CustomEvent) => {
      const { type, phase } = event.detail || {}
      
      let feedbackId: string | null = null
      
      switch (type) {
        case 'summoning-started':
          feedbackId = 'summoning-start'
          break
        case 'power-level-changed':
          feedbackId = 'power-level-increase'
          break
        case 'page-loaded':
          feedbackId = 'page-load'
          break
      }

      if (feedbackId) {
        const feedback = activeFeedbacks.find(f => f.id === feedbackId)
        if (feedback) {
          queueFeedback(feedback)
        }
      }
    }

    // Listen for custom events
    window.addEventListener('voiceStateChange', handleStateChange as EventListener)
    window.addEventListener('summoningPhaseChange', handleStateChange as EventListener)
    window.addEventListener('powerLevelChange', handleStateChange as EventListener)

    return () => {
      window.removeEventListener('voiceStateChange', handleStateChange as EventListener)
      window.removeEventListener('summoningPhaseChange', handleStateChange as EventListener)
      window.removeEventListener('powerLevelChange', handleStateChange as EventListener)
    }
  }, [enabled, enableStateChangeFeedback, activeFeedbacks, queueFeedback])

  // Cleanup cooldowns periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setCooldowns(prev => {
        const newCooldowns = new Map()
        prev.forEach((timestamp, id) => {
          const feedback = activeFeedbacks.find(f => f.id === id)
          const cooldownTime = feedback?.cooldown || 0
          if (now - timestamp < cooldownTime) {
            newCooldowns.set(id, timestamp)
          }
        })
        return newCooldowns
      })
    }, 30000) // Cleanup every 30 seconds

    return () => clearInterval(cleanupInterval)
  }, [activeFeedbacks])

  if (!enabled) {
    return null
  }

  return (
    <div className={`voice-interaction-feedback ${className}`}>
      {/* Feedback Queue Status */}
      {feedbackQueue.length > 0 && (
        <div className="fixed top-32 right-6 z-40">
          <div className="bg-purple-900/90 border border-purple-500/50 rounded-lg p-2">
            <div className="text-purple-300 text-xs">
              🎙️ Feedback Queue: {feedbackQueue.length}
            </div>
            {currentFeedback && (
              <div className="text-purple-400 text-xs mt-1 max-w-xs truncate">
                Speaking: {currentFeedback.substring(0, 30)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Feedback Indicator */}
      {(isSpeaking || isProcessingFeedback) && (
        <div className="fixed bottom-48 right-6 z-40">
          <div className="bg-orange-900/90 border border-orange-500/50 rounded-lg p-3 flex items-center space-x-2">
            <DragonBallLoadingStates.KiCharging size="sm" color="orange" />
            <span className="text-orange-300 text-sm">
              🗣️ Providing feedback...
            </span>
            <button
              onClick={() => {
                stop()
                setFeedbackQueue([])
                setIsProcessingFeedback(false)
                setCurrentFeedback('')
              }}
              className="ml-2 text-orange-400 hover:text-orange-300 transition-colors text-xs"
              aria-label="Stop feedback"
            >
              ⏹️
            </button>
          </div>
        </div>
      )}

      {/* Feedback Controls (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-48 left-6 z-40">
          <div className="bg-gray-900/90 border border-gray-500/30 rounded-lg p-3 space-y-2">
            <div className="text-gray-400 font-semibold text-xs mb-2">🎙️ Feedback Controls</div>
            <button
              onClick={() => setFeedbackQueue([])}
              className="w-full text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
            >
              Clear Queue ({feedbackQueue.length})
            </button>
            <button
              onClick={() => setCooldowns(new Map())}
              className="w-full text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded transition-colors"
            >
              Reset Cooldowns
            </button>
            <div className="text-xs text-gray-500">
              Mode: {feedbackMode} | Active: {activeFeedbacks.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInteractionFeedback

// Utility functions for external feedback control
export const triggerInteractionFeedback = (type: string, data?: any) => {
  const event = new CustomEvent('voiceStateChange', {
    detail: { type, ...data }
  })
  window.dispatchEvent(event)
}

export const clearFeedbackQueue = () => {
  const event = new CustomEvent('clearVoiceFeedbackQueue')
  window.dispatchEvent(event)
}