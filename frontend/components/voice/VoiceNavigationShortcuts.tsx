import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecureElevenLabsTTS } from '../../hooks/voice/useSecureElevenLabsTTS'
import { useSpeechRecognitionLazy } from '../../hooks/voice/lazy'
import { logger } from '../../lib/logger'
import { DragonBallLoadingStates } from '../chat/parts/DragonBallLoadingStates'

export interface VoiceNavigationProps {
  onFeatureActivate?: (feature: string) => void
  onNavigationChange?: (destination: string) => void
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
  className?: string
  enabled?: boolean
}

interface VoiceShortcut {
  commands: string[]
  feature: string
  description: string
  action: () => void
  responseText: string
}

export const VoiceNavigationShortcuts: React.FC<VoiceNavigationProps> = ({
  onFeatureActivate,
  onNavigationChange,
  voiceConfig,
  className = '',
  enabled = true
}) => {
  const navigate = useNavigate()
  const [isListening, setIsListening] = useState(false)
  const [speechRecognition, setSpeechRecognition] = useState<any>(null)
  const [speechHookLoading, setSpeechHookLoading] = useState(true)
  const [lastCommand, setLastCommand] = useState<string>('')
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)

  // Load speech recognition hook
  useEffect(() => {
    const loadSpeechRecognition = async () => {
      try {
        const hook = await useSpeechRecognitionLazy()
        setSpeechRecognition(() => hook)
        setSpeechHookLoading(false)
      } catch (error) {
        logger.error('Failed to load speech recognition for voice navigation', error)
        setSpeechHookLoading(false)
      }
    }
    if (enabled) {
      loadSpeechRecognition()
    }
  }, [enabled])

  // Use speech recognition hook
  const speechRecognitionResult = speechRecognition ? speechRecognition() : {
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    startListening: () => Promise.resolve(),
    stopListening: () => Promise.resolve(),
    isSupported: false
  }

  const {
    transcript,
    error: speechError,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = speechRecognitionResult

  // TTS for voice feedback
  const { speak, isSpeaking } = useSecureElevenLabsTTS(voiceConfig)

  // Define voice shortcuts with DBZ theme
  const voiceShortcuts: VoiceShortcut[] = useMemo(() => [
    {
      commands: ['power up', 'summon dragon', 'ready to power up', 'dragon summoning'],
      feature: 'dragon_summon',
      description: 'Summon the dragon for chat',
      action: () => {
        onFeatureActivate?.('dragon_summon')
        // Trigger the dragon summoning animation from homepage
        const summonEvent = new CustomEvent('voiceDragonSummon', {
          detail: { source: 'voice', timestamp: Date.now() }
        })
        window.dispatchEvent(summonEvent)
      },
      responseText: 'Summoning the portfolio dragon! Prepare for legendary DeFi powers!'
    },
    {
      commands: ['start chat', 'enter chat', 'go to chat', 'begin conversation'],
      feature: 'chat_navigation',
      description: 'Navigate to chat interface',
      action: () => {
        onNavigationChange?.('chat')
        navigate('/chat')
      },
      responseText: 'Opening the chat dimension. Your financial journey begins now!'
    },
    {
      commands: ['elite warrior', 'start training', 'begin training'],
      feature: 'elite_tier',
      description: 'Activate Elite Warrior features',
      action: () => {
        onFeatureActivate?.('elite')
        navigate('/chat?mode=elite')
      },
      responseText: 'Elite Warrior mode activated! Master the art of DeFi training!'
    },
    {
      commands: ['super saiyan', 'transform now', 'super transformation'],
      feature: 'saiyan_tier',
      description: 'Transform to Super Saiyan level',
      action: () => {
        onFeatureActivate?.('saiyan')
        navigate('/chat?mode=saiyan')
      },
      responseText: 'Super Saiyan transformation initiated! Unleashing devastating DeFi combinations!'
    },
    {
      commands: ['fusion master', 'master fusion', 'fusion techniques'],
      feature: 'fusion_tier',
      description: 'Access Fusion Master capabilities',
      action: () => {
        onFeatureActivate?.('fusion')
        navigate('/chat?mode=fusion')
      },
      responseText: 'Fusion Master techniques unlocked! Advanced portfolio strategies activated!'
    },
    {
      commands: ['legendary saiyan', 'ascend to legend', 'legendary mode'],
      feature: 'legendary_tier',
      description: 'Unlock Legendary Saiyan powers',
      action: () => {
        onFeatureActivate?.('legendary')
        navigate('/chat?mode=legendary')
      },
      responseText: 'Legendary Saiyan status achieved! Ultimate portfolio warrior powers unlocked!'
    },
    {
      commands: ['about', 'show about', 'learn more'],
      feature: 'about_navigation',
      description: 'Navigate to about page',
      action: () => {
        onNavigationChange?.('about')
        navigate('/about')
      },
      responseText: 'Learning about Seiron\'s legendary powers and origins!'
    },
    {
      commands: ['help', 'voice commands', 'what can I say'],
      feature: 'voice_help',
      description: 'Show available voice commands',
      action: () => {
        setLastCommand('Voice commands available: Say "Power up" to summon dragon, "Start chat" to begin, or try tier commands like "Elite warrior" or "Super Saiyan"!')
      },
      responseText: 'Voice commands ready! Say "Power up" to summon the dragon, "Start chat" to begin your journey, or try power levels like "Elite warrior" or "Super Saiyan"!'
    }
  ], [navigate, onFeatureActivate, onNavigationChange])

  // Process voice commands
  const processVoiceCommand = useCallback(async (command: string) => {
    if (!command.trim() || isProcessingCommand) return

    setIsProcessingCommand(true)
    setLastCommand(command)

    logger.debug('🎙️ Processing voice navigation command', { command })

    // Find matching shortcut
    const matchingShortcut = voiceShortcuts.find(shortcut =>
      shortcut.commands.some(cmd => 
        command.toLowerCase().includes(cmd.toLowerCase())
      )
    )

    if (matchingShortcut) {
      logger.debug('🎙️ Voice command matched', { 
        feature: matchingShortcut.feature,
        matchedCommand: matchingShortcut.commands.find(cmd => 
          command.toLowerCase().includes(cmd.toLowerCase())
        )
      })

      // Execute the action
      matchingShortcut.action()

      // Provide voice feedback
      try {
        const result = await speak(matchingShortcut.responseText)()
        if (result._tag === 'Left') {
          logger.error('Voice feedback failed', result.left)
        }
      } catch (error) {
        logger.error('Voice feedback error', error)
      }
    } else {
      logger.debug('🎙️ No matching voice command found', { command })
      
      // Provide fallback response
      try {
        const fallbackResponse = "Command not recognized. Try saying 'Help' to hear available voice commands, or 'Power up' to summon the dragon!"
        const result = await speak(fallbackResponse)()
        if (result._tag === 'Left') {
          logger.error('Fallback voice feedback failed', result.left)
        }
      } catch (error) {
        logger.error('Fallback voice feedback error', error)
      }
    }

    setTimeout(() => setIsProcessingCommand(false), 1000)
  }, [voiceShortcuts, speak, isProcessingCommand])

  // Handle transcript changes
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      // Debounce processing to avoid processing partial commands
      const processingTimer = setTimeout(() => {
        processVoiceCommand(transcript)
      }, 1500) // Wait for user to finish speaking

      return () => clearTimeout(processingTimer)
    }
  }, [transcript, processVoiceCommand])

  // Toggle voice listening
  const toggleVoiceListening = useCallback(async () => {
    if (!enabled || speechHookLoading || !isSpeechSupported) return

    try {
      if (isListening) {
        await stopListening()()
        setIsListening(false)
        logger.debug('🎙️ Voice navigation listening stopped')
      } else {
        // Request microphone permission
        const permission = await navigator.mediaDevices.getUserMedia({ audio: true })
        permission.getTracks().forEach(track => track.stop())
        
        await startListening()()
        setIsListening(true)
        logger.debug('🎙️ Voice navigation listening started')
        
        // Provide voice feedback
        try {
          const welcomeMessage = "Voice navigation activated! Say 'Help' for commands or 'Power up' to summon the dragon!"
          const result = await speak(welcomeMessage)()
          if (result._tag === 'Left') {
            logger.error('Welcome voice feedback failed', result.left)
          }
        } catch (error) {
          logger.error('Welcome voice feedback error', error)
        }
      }
    } catch (error) {
      logger.error('Voice navigation toggle error', error)
    }
  }, [enabled, speechHookLoading, isSpeechSupported, isListening, startListening, stopListening, speak])

  // Auto-cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening()()
        setIsListening(false)
      }
    }
  }, [isListening, stopListening])

  if (!enabled || speechHookLoading) {
    return null
  }

  if (!isSpeechSupported) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="text-orange-400 text-sm">
          🎙️ Voice navigation requires a compatible browser
        </div>
      </div>
    )
  }

  return (
    <div className={`voice-navigation-shortcuts ${className}`}>
      {/* Voice Navigation Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleVoiceListening}
          className={`relative p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
            isListening 
              ? 'bg-blue-600 hover:bg-blue-700 animate-pulse shadow-lg shadow-blue-500/50'
              : 'bg-gray-800 hover:bg-gray-700 border border-orange-500/50'
          }`}
          aria-label={isListening ? 'Stop voice navigation' : 'Start voice navigation'}
          disabled={isProcessingCommand || isSpeaking}
        >
          <div className="relative">
            {isListening ? (
              <DragonBallLoadingStates.KiCharging size="md" color="blue" />
            ) : (
              <DragonBallLoadingStates.KiCharging size="md" color="orange" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl">🎙️</span>
            </div>
          </div>
          
          {/* Active Indicator */}
          {isListening && (
            <div className="absolute inset-0 rounded-full">
              <div className="w-full h-full rounded-full border-2 border-blue-400 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border border-blue-300 animate-pulse" />
            </div>
          )}
          
          {/* Processing Indicator */}
          {isProcessingCommand && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full animate-bounce">
              <div className="w-full h-full bg-purple-400 rounded-full animate-ping opacity-75" />
            </div>
          )}
          
          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-orange-500 rounded-full animate-pulse">
              <div className="w-full h-full bg-orange-400 rounded-full animate-ping opacity-75" />
            </div>
          )}
        </button>
        
        {/* Voice Status Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-900/90 border border-orange-500/30 rounded-lg text-xs whitespace-nowrap">
          {isListening ? (
            <span className="text-blue-400">🎙️ Listening for commands...</span>
          ) : isProcessingCommand ? (
            <span className="text-purple-400">⚡ Processing command...</span>
          ) : isSpeaking ? (
            <span className="text-orange-400">🗣️ Speaking response...</span>
          ) : (
            <span className="text-gray-400">🎙️ Voice Navigation</span>
          )}
        </div>
      </div>

      {/* Last Command Display */}
      {lastCommand && (
        <div className="fixed bottom-24 right-6 max-w-xs z-40">
          <div className="bg-gray-900/90 border border-orange-500/30 rounded-lg p-3 text-sm">
            <div className="text-orange-400 font-semibold mb-1">Voice Command:</div>
            <div className="text-gray-300">{lastCommand}</div>
          </div>
        </div>
      )}

      {/* Voice Commands Help Panel (Hidden by default, shown on help command) */}
      {lastCommand.includes('Voice commands available') && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-gray-900/95 border border-orange-500/50 rounded-lg p-6 max-w-md">
            <h3 className="text-orange-400 font-bold text-lg mb-4">🎙️ Voice Commands</h3>
            <div className="space-y-2 text-sm">
              {voiceShortcuts.slice(0, -1).map((shortcut, index) => (
                <div key={index} className="text-gray-300">
                  <span className="text-blue-400">"{shortcut.commands[0]}"</span> - {shortcut.description}
                </div>
              ))}
            </div>
            <button
              onClick={() => setLastCommand('')}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceNavigationShortcuts