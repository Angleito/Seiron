import React, { useCallback, useEffect, useState } from 'react'
import { useSecureElevenLabsTTS } from '../../hooks/voice/useSecureElevenLabsTTS'
import { logger } from '../../lib/logger'

export interface VoiceFeatureDescriptorProps {
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
  enabled?: boolean
  autoDescribe?: boolean
  className?: string
}

interface FeatureDescription {
  id: string
  title: string
  description: string
  voiceDescription: string
  powerLevel?: string
}

export const VoiceFeatureDescriptor: React.FC<VoiceFeatureDescriptorProps> = ({
  voiceConfig,
  enabled = true,
  autoDescribe = false,
  className = ''
}) => {
  const [isDescribing, setIsDescribing] = useState(false)
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)
  const [descriptionQueue, setDescriptionQueue] = useState<string[]>([])

  const { speak, isSpeaking, stop } = useSecureElevenLabsTTS(voiceConfig)

  // Feature descriptions with DBZ theming
  const featureDescriptions: FeatureDescription[] = [
    {
      id: 'hero-section',
      title: 'Seiron Dragon Portal',
      description: 'Main portal to DeFi powers',
      voiceDescription: 'Welcome to Seiron, the legendary DeFi dragon portal! Here you can summon ultimate portfolio powers and master the art of Sei network investing. Your financial transformation begins with a single wish!',
      powerLevel: '32.2K'
    },
    {
      id: 'power-level-display',
      title: 'Power Level Scanner',
      description: 'Current Seiron power measurement',
      voiceDescription: 'The power level scanner shows Seiron\'s current energy at over 32 thousand! This represents the platform\'s DeFi capabilities and portfolio management strength.',
      powerLevel: '32.2K'
    },
    {
      id: 'summon-button',
      title: 'Dragon Summoning Ritual',
      description: 'Activate the portfolio dragon',
      voiceDescription: 'The dragon summoning button will unleash Seiron\'s full power! Click to begin an epic transformation sequence that will transport you to the chat dimension where your DeFi journey truly begins!',
      powerLevel: '∞'
    },
    {
      id: 'elite-warrior',
      title: 'Elite Warrior Training',
      description: 'Begin your DeFi journey',
      voiceDescription: 'Elite Warrior level - Power Level 9 thousand! This is where your DeFi training begins. Master the basic arts of portfolio management and learn fundamental Sei network strategies.',
      powerLevel: '9.0K'
    },
    {
      id: 'super-saiyan',
      title: 'Super Saiyan Transformation',
      description: 'Unlock devastating DeFi combinations',
      voiceDescription: 'Super Saiyan transformation - Power Level 15 thousand! Unleash devastating DeFi combinations and advanced portfolio fusion techniques. Your hair turns golden with financial wisdom!',
      powerLevel: '15.0K'
    },
    {
      id: 'fusion-master',
      title: 'Fusion Master Techniques',
      description: 'Advanced portfolio strategies',
      voiceDescription: 'Fusion Master level - Power Level 25 thousand! Access legendary power combinations and multi-protocol strategies. Combine different DeFi techniques for maximum impact!',
      powerLevel: '25.0K'
    },
    {
      id: 'legendary-saiyan',
      title: 'Legendary Saiyan Status',
      description: 'Ultimate portfolio warrior',
      voiceDescription: 'Legendary Saiyan status - Power Level 50 thousand! Achieve legendary status with maximum DeFi power and influence. You become the ultimate portfolio warrior of the Sei network!',
      powerLevel: '50.0K'
    },
    {
      id: 'navigation-links',
      title: 'Navigation Commands',
      description: 'Quick access to features',
      voiceDescription: 'Navigation links provide quick access to Master the Art, Legendary Powers, and Portfolio Warrior sections. Each link unlocks different aspects of Seiron\'s DeFi capabilities.',
      powerLevel: '∞'
    }
  ]

  // Speak a feature description
  const speakDescription = useCallback(async (description: string) => {
    if (!enabled || isSpeaking) return

    setIsDescribing(true)
    logger.debug('🗣️ Speaking feature description', { 
      descriptionLength: description.length,
      preview: description.substring(0, 50) + '...'
    })

    try {
      const result = await speak(description)()
      if (result._tag === 'Left') {
        logger.error('Feature description speech failed', result.left)
      }
    } catch (error) {
      logger.error('Feature description speech error', error)
    } finally {
      setIsDescribing(false)
    }
  }, [enabled, speak, isSpeaking])

  // Handle feature hover events
  const handleFeatureHover = useCallback((featureId: string) => {
    if (!enabled || !autoDescribe) return

    setHoveredFeature(featureId)
    
    const feature = featureDescriptions.find(f => f.id === featureId)
    if (feature) {
      // Debounce description to avoid rapid fire
      setTimeout(() => {
        if (hoveredFeature === featureId) {
          speakDescription(feature.voiceDescription)
        }
      }, 1000)
    }
  }, [enabled, autoDescribe, featureDescriptions, speakDescription, hoveredFeature])

  // Handle feature click events for immediate description
  const handleFeatureClick = useCallback((featureId: string) => {
    if (!enabled) return

    const feature = featureDescriptions.find(f => f.id === featureId)
    if (feature) {
      speakDescription(feature.voiceDescription)
    }
  }, [enabled, featureDescriptions, speakDescription])

  // Queue management for multiple descriptions
  const queueDescription = useCallback((description: string) => {
    setDescriptionQueue(prev => [...prev, description])
  }, [])

  // Process description queue
  useEffect(() => {
    if (descriptionQueue.length > 0 && !isSpeaking && !isDescribing) {
      const nextDescription = descriptionQueue[0]
      setDescriptionQueue(prev => prev.slice(1))
      speakDescription(nextDescription)
    }
  }, [descriptionQueue, isSpeaking, isDescribing, speakDescription])

  // Global event listeners for voice feature descriptions
  useEffect(() => {
    if (!enabled) return

    const handleFeatureDescriptionRequest = (event: CustomEvent) => {
      const { featureId, immediate } = event.detail || {}
      
      if (immediate) {
        handleFeatureClick(featureId)
      } else {
        handleFeatureHover(featureId)
      }
    }

    const handleDescribeAllFeatures = () => {
      const allDescriptions = featureDescriptions.map(f => f.voiceDescription)
      const combinedDescription = `Seiron feature overview: ${allDescriptions.join(' ')}`
      speakDescription(combinedDescription)
    }

    const handleStopDescription = () => {
      stop()
      setIsDescribing(false)
      setDescriptionQueue([])
    }

    // Add event listeners
    window.addEventListener('voiceDescribeFeature', handleFeatureDescriptionRequest as EventListener)
    window.addEventListener('voiceDescribeAll', handleDescribeAllFeatures)
    window.addEventListener('voiceStopDescription', handleStopDescription)

    return () => {
      window.removeEventListener('voiceDescribeFeature', handleFeatureDescriptionRequest as EventListener)
      window.removeEventListener('voiceDescribeAll', handleDescribeAllFeatures)
      window.removeEventListener('voiceStopDescription', handleStopDescription)
    }
  }, [enabled, featureDescriptions, handleFeatureClick, handleFeatureHover, speakDescription, stop])

  // Expose functions globally for integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__voiceFeatureDescriptor__ = {
        describe: handleFeatureClick,
        queue: queueDescription,
        stop: () => {
          stop()
          setIsDescribing(false)
          setDescriptionQueue([])
        },
        isActive: isDescribing || isSpeaking,
        getFeatures: () => featureDescriptions
      }
    }
  }, [handleFeatureClick, queueDescription, stop, isDescribing, isSpeaking, featureDescriptions])

  if (!enabled) {
    return null
  }

  return (
    <div className={`voice-feature-descriptor ${className}`}>
      {/* Voice Description Status Indicator */}
      {(isDescribing || isSpeaking) && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-purple-900/90 border border-purple-500/50 rounded-lg p-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-purple-300 text-sm font-medium">
              🗣️ Describing features...
            </span>
            <button
              onClick={() => {
                stop()
                setIsDescribing(false)
                setDescriptionQueue([])
              }}
              className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="Stop voice description"
            >
              ⏹️
            </button>
          </div>
        </div>
      )}

      {/* Description Queue Indicator */}
      {descriptionQueue.length > 0 && (
        <div className="fixed top-20 right-6 z-50">
          <div className="bg-orange-900/90 border border-orange-500/50 rounded-lg p-2">
            <span className="text-orange-300 text-xs">
              Queue: {descriptionQueue.length} descriptions
            </span>
          </div>
        </div>
      )}

      {/* Hover Instruction Tooltip */}
      {enabled && autoDescribe && (
        <div className="fixed bottom-6 left-6 z-40">
          <div className="bg-gray-900/90 border border-blue-500/30 rounded-lg p-3 max-w-xs">
            <div className="text-blue-400 text-sm font-medium mb-1">
              🎙️ Voice Features Active
            </div>
            <div className="text-gray-300 text-xs">
              Hover over elements for voice descriptions, or click for immediate explanation.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function to trigger feature descriptions from other components
export const triggerFeatureDescription = (featureId: string, immediate = false) => {
  const event = new CustomEvent('voiceDescribeFeature', {
    detail: { featureId, immediate }
  })
  window.dispatchEvent(event)
}

// Utility function to describe all features
export const describeAllFeatures = () => {
  const event = new CustomEvent('voiceDescribeAll')
  window.dispatchEvent(event)
}

// Utility function to stop voice descriptions
export const stopVoiceDescription = () => {
  const event = new CustomEvent('voiceStopDescription')
  window.dispatchEvent(event)
}

export default VoiceFeatureDescriptor