import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSpeechRecognition } from '../../hooks/voice/useSpeechRecognition'
import { useSecureElevenLabsTTS, SecureElevenLabsConfig as ElevenLabsConfig } from '../../hooks/voice/useSecureElevenLabsTTS'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import { logger } from '../../lib/logger'
import { voiceLogger, logVoiceInterface, logEnvironment } from '../../lib/voice-logger'
import { DragonBallLoadingStates } from '../chat/parts/DragonBallLoadingStates'
import { DragonRenderer, VoiceAnimationState } from '../dragon/DragonRenderer'
import { AnimeMessageBubble } from '../chat/AnimeMessageBubble'
import { LightningEffect } from '../effects/LightningEffect'

// Log environment variables at module load
const envStatus = {
  hasVoiceId: typeof import.meta.env.VITE_ELEVENLABS_VOICE_ID !== 'undefined',
  voiceIdValue: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'NOT_SET',
  voiceEnabled: import.meta.env.VITE_VOICE_ENABLED || 'NOT_SET',
  nodeEnv: import.meta.env.MODE || 'unknown'
}

logger.debug('🔊 VoiceInterface module loaded, checking environment', envStatus)
logEnvironment.check(envStatus, { component: 'VoiceInterface' })

export interface VoiceInterfaceProps {
  onTranscriptChange?: (transcript: string) => void
  onError?: (error: Error) => void
  elevenLabsConfig: ElevenLabsConfig
  autoReadResponses?: boolean
  className?: string
}

export interface VoiceInterfaceState {
  isMicrophoneActive: boolean
  isSpeakerEnabled: boolean
  isPlayingAudio: boolean
  currentTranscript: string
  lastError: Error | null
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTranscriptChange,
  onError,
  elevenLabsConfig,
  autoReadResponses = false,
  className = ''
}) => {
  logger.debug('🔊 VoiceInterface component initializing', {
    hasOnTranscriptChange: !!onTranscriptChange,
    hasOnError: !!onError,
    autoReadResponses,
    configVoiceId: elevenLabsConfig.voiceId,
    configModelId: elevenLabsConfig.modelId,
    hasVoiceSettings: !!elevenLabsConfig.voiceSettings
  })
  
  // Enhanced voice logging
  logVoiceInterface.init(elevenLabsConfig, { 
    component: 'VoiceInterface',
    autoReadResponses 
  })
  const [state, setState] = useState<VoiceInterfaceState>({
    isMicrophoneActive: false,
    isSpeakerEnabled: autoReadResponses,
    isPlayingAudio: false,
    currentTranscript: '',
    lastError: null
  })

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = useSpeechRecognition()
  
  logger.debug('🔊 Speech recognition hook initialized', {
    isListening,
    transcriptLength: transcript.length,
    interimTranscriptLength: interimTranscript.length,
    hasSpeechError: !!speechError,
    isSpeechSupported
  })

  const {
    isSpeaking,
    isLoading: isTTSLoading,
    error: ttsError,
    speak
  } = useSecureElevenLabsTTS(elevenLabsConfig)
  
  logger.debug('🔊 ElevenLabs TTS hook initialized', {
    isSpeaking,
    isTTSLoading,
    hasTTSError: !!ttsError,
    ttsErrorType: ttsError?.type,
    ttsErrorMessage: ttsError?.message
  })

  // Update playing audio state
  useEffect(() => {
    logger.debug('🔊 Audio playing state changed', {
      isSpeaking,
      previousState: state.isPlayingAudio
    })
    setState(prev => ({ ...prev, isPlayingAudio: isSpeaking }))
  }, [isSpeaking, state.isPlayingAudio])

  // Handle transcript changes
  useEffect(() => {
    const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '')
    logger.debug('🔊 Transcript changed', {
      transcriptLength: transcript.length,
      interimTranscriptLength: interimTranscript.length,
      fullTranscriptLength: fullTranscript.length,
      hasOnTranscriptChange: !!onTranscriptChange,
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      interimTranscript: interimTranscript.substring(0, 50) + (interimTranscript.length > 50 ? '...' : '')
    })
    setState(prev => ({ ...prev, currentTranscript: fullTranscript }))
    onTranscriptChange?.(fullTranscript)
  }, [transcript, interimTranscript, onTranscriptChange])

  // Handle errors
  useEffect(() => {
    const error = speechError || ttsError
    logger.debug('🔊 Error state check', {
      hasSpeechError: !!speechError,
      hasTTSError: !!ttsError,
      speechErrorType: speechError ? (speechError as any).type : null,
      ttsErrorType: ttsError?.type,
      speechErrorMessage: speechError ? (speechError as any).message : null,
      ttsErrorMessage: ttsError?.message
    })
    
    if (error) {
      const errorMessage = pipe(
        O.fromNullable(error),
        O.map(e => new Error(typeof e === 'string' ? e : (e as any).message || 'Unknown error')),
        O.getOrElse(() => new Error('Unknown error'))
      )
      
      logger.error('🔊 Voice interface error occurred', {
        errorSource: speechError ? 'speech' : 'tts',
        errorType: (error as any).type,
        errorMessage: errorMessage.message,
        originalError: error
      })
      
      setState(prev => ({ ...prev, lastError: errorMessage }))
      onError?.(errorMessage)
    }
  }, [speechError, ttsError, onError])

  const toggleMicrophone = useCallback(async () => {
    logger.debug('🔊 Toggling microphone', {
      currentlyListening: isListening,
      operation: isListening ? 'stop' : 'start'
    })
    
    if (isListening) {
      const result = await stopListening()()
      pipe(
        result,
        E.fold(
          (error) => {
            logger.error('🔊 Failed to stop listening', {
              errorType: error.type,
              errorMessage: error.message
            })
            onError?.(new Error(error.message))
          },
          () => {
            logger.debug('🔊 Successfully stopped listening')
            setState(prev => ({ ...prev, isMicrophoneActive: false }))
          }
        )
      )
    } else {
      const result = await startListening()()
      pipe(
        result,
        E.fold(
          (error) => {
            logger.error('🔊 Failed to start listening', {
              errorType: error.type,
              errorMessage: error.message
            })
            onError?.(new Error(error.message))
          },
          () => {
            logger.debug('🔊 Successfully started listening')
            setState(prev => ({ ...prev, isMicrophoneActive: true }))
          }
        )
      )
    }
  }, [isListening, startListening, stopListening, onError])

  const toggleSpeaker = useCallback(() => {
    const newState = !state.isSpeakerEnabled
    logger.debug('🔊 Toggling speaker', {
      previousState: state.isSpeakerEnabled,
      newState
    })
    setState(prev => ({ ...prev, isSpeakerEnabled: newState }))
  }, [state.isSpeakerEnabled])

  // Expose playAudioResponse for external use
  const playAudioResponse = useCallback(async (text: string) => {
    logger.debug('🔊 Play audio response requested', {
      textLength: text.length,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      speakerEnabled: state.isSpeakerEnabled
    })
    
    if (!state.isSpeakerEnabled) {
      logger.debug('🔊 Speaker disabled, skipping audio playback')
      return
    }

    const result = await speak(text)()
    pipe(
      result,
      E.fold(
        (error) => {
          logger.error('🔊 Failed to play audio response', {
            errorType: error.type,
            errorMessage: error.message,
            textLength: text.length
          })
          onError?.(new Error(error.message))
        },
        () => {
          logger.debug('🔊 Audio response playback completed successfully')
        }
      )
    )
  }, [state.isSpeakerEnabled, speak, onError])

  // Store playAudioResponse in a ref for external access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      logger.debug('🔊 Exposing playAudioResponse to global window object')
      ;(window as any).__voiceInterfacePlayAudio__ = playAudioResponse
    }
  }, [playAudioResponse])


  const microphoneButtonClasses = useMemo(() => {
    const baseClasses = 'relative p-4 rounded-full transition-all duration-300 transform hover:scale-110'
    const activeClasses = isListening
      ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-lg shadow-red-500/50'
      : 'bg-gray-700 hover:bg-gray-600'
    
    return `${baseClasses} ${activeClasses}`
  }, [isListening])

  const speakerButtonClasses = useMemo(() => {
    const baseClasses = 'relative p-4 rounded-full transition-all duration-300 transform hover:scale-110'
    const activeClasses = state.isSpeakerEnabled
      ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/50'
      : 'bg-gray-700 hover:bg-gray-600'
    
    return `${baseClasses} ${activeClasses}`
  }, [state.isSpeakerEnabled])


  // Voice event handling system
  useEffect(() => {
    const dispatchVoiceEvent = (type: string, data?: any) => {
      const event = new CustomEvent('voiceStateChange', {
        detail: { type, data, timestamp: Date.now() }
      }) as CustomEvent
      window.dispatchEvent(event)
      
      logger.debug('🎙️ Voice event dispatched', { type, data })
    }
    
    // Dispatch events for voice state changes
    if (isListening && !state.isPlayingAudio && !isTTSLoading) {
      dispatchVoiceEvent('listening_start', { 
        transcriptLength: state.currentTranscript.length
      })
    } else if (!isListening && state.isPlayingAudio) {
      dispatchVoiceEvent('speaking_start')
    } else if (isTTSLoading) {
      dispatchVoiceEvent('processing_start')
    } else if (!isListening && !state.isPlayingAudio && !isTTSLoading) {
      dispatchVoiceEvent('voice_idle')
    }
    
    // Voice state logging
    logger.debug('🔊 Voice state change detected', {
      isListening,
      isSpeaking: state.isPlayingAudio,
      isProcessing: isTTSLoading,
      transcriptLength: state.currentTranscript.length
    })
  }, [isListening, state.isPlayingAudio, isTTSLoading, state.currentTranscript.length])

  // Voice event cleanup and listener management
  useEffect(() => {
    const voiceEventHandlers = new Map<string, EventListener>()
    
    // Register global voice event listeners for external integrations
    const registerVoiceEventListener = (eventType: string, handler: EventListener) => {
      voiceEventHandlers.set(eventType, handler)
      window.addEventListener(eventType, handler)
    }
    
    // Example external integration listeners
    registerVoiceEventListener('voiceCommand', (event: Event) => {
      const customEvent = event as CustomEvent
      const { command, confidence } = customEvent.detail || {}
      logger.debug('🎙️ Voice command received', { command, confidence })
      
      // Handle voice commands if needed
      if (confidence > 0.8) {
        // High confidence voice command processing
        onTranscriptChange?.(command)
      }
    })
    
    registerVoiceEventListener('voiceEmotionDetected', (event: Event) => {
      const customEvent = event as CustomEvent
      const { emotion, intensity } = customEvent.detail || {}
      logger.debug('🎙️ Voice emotion detected', { emotion, intensity })
      
      // This could be integrated with more advanced emotion detection APIs
    })
    
    // Cleanup function
    return () => {
      voiceEventHandlers.forEach((handler, eventType) => {
        window.removeEventListener(eventType, handler)
      })
      voiceEventHandlers.clear()
      
      // Dispatch cleanup event
      const cleanupEvent = new CustomEvent('voiceCleanup', {
        detail: { componentId: 'VoiceInterface', timestamp: Date.now() }
      }) as CustomEvent
      window.dispatchEvent(cleanupEvent)
      
      logger.debug('🧹 Voice event handlers cleaned up')
    }
  }, [onTranscriptChange])

  // Basic transcript analysis
  useEffect(() => {
    if (state.currentTranscript.length > 0) {
      const dispatchTranscriptEvent = (type: string, analysis: any) => {
        const event = new CustomEvent('voiceTranscriptAnalysis', {
          detail: { 
            type, 
            transcript: state.currentTranscript,
            analysis,
            timestamp: Date.now() 
          }
        }) as CustomEvent
        window.dispatchEvent(event)
      }
      
      // Basic transcript analysis
      const analysisTimer = setTimeout(() => {
        const wordCount = state.currentTranscript.trim().split(' ').length
        const hasExclamation = state.currentTranscript.includes('!')
        const hasQuestion = state.currentTranscript.includes('?')
        
        const analysis = {
          hasExclamation,
          hasQuestion,
          wordCount,
          length: state.currentTranscript.length,
          complexity: wordCount > 10 ? 'high' : wordCount > 5 ? 'medium' : 'low'
        }
        
        dispatchTranscriptEvent('transcript_analyzed', analysis)
        
        logger.debug('🔍 Transcript analysis completed', analysis)
      }, 500) // Debounce analysis
      
      return () => clearTimeout(analysisTimer)
    }
    return undefined
  }, [state.currentTranscript])

  if (!isSpeechSupported) {
    logger.warn('🔊 Speech recognition not supported, rendering fallback UI')
    return (
      <div className={`${className}`}>
        <DragonBallLoadingStates.ErrorRecovery 
          message="Scouter technology not compatible with this dimension!"
          className="w-full max-w-md mx-auto"
        />
        <div className="text-center mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg max-w-md mx-auto">
          <p className="text-red-400 font-semibold">🐉 Sei-ron Dragon Notice:</p>
          <p className="text-sm text-red-300 mt-2">
            Your browser cannot commune with Sei-ron's mystical voice powers.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Please use Chrome, Edge, or Safari to unlock the portfolio dragon's wisdom.
          </p>
        </div>
      </div>
    )
  }

  logger.debug('🔊 Rendering VoiceInterface component', {
    isListening,
    isSpeaking,
    isTTSLoading,
    speakerEnabled: state.isSpeakerEnabled,
    hasTranscript: !!state.currentTranscript,
    hasError: !!state.lastError
  })
  
  // Create voice animation state for dragon integration
  const voiceAnimationState: VoiceAnimationState = useMemo(() => ({
    isListening,
    isSpeaking: state.isPlayingAudio,
    isProcessing: isTTSLoading,
    isIdle: !isListening && !state.isPlayingAudio && !isTTSLoading,
    volume: state.currentTranscript.length / 100,
    emotion: state.currentTranscript.includes('!') ? 'excited' : 
             state.currentTranscript.includes('?') ? 'focused' : 'calm'
  }), [isListening, state.isPlayingAudio, isTTSLoading, state.currentTranscript])

  return (
    <div className={`flex flex-col items-center space-y-6 p-6 ${className} relative overflow-hidden`}>
      {/* Thunder and Lightning Effects */}
      <LightningEffect
        frequency={isListening ? "high" : isTTSLoading ? "medium" : "low"}
        intensity={state.isPlayingAudio ? "intense" : isListening ? "normal" : "subtle"}
        enabled={isListening || state.isPlayingAudio || isTTSLoading}
        className="absolute inset-0 z-0"
      />
      
      {/* Dragon Voice Status Visualization */}
      <div className="relative z-10">
        {/* Main Dragon Display */}
        <div className="relative bg-gray-900/30 border border-orange-800/50 rounded-full p-6 transition-all duration-300">
          <DragonRenderer
            size="lg"
            voiceState={voiceAnimationState}
            className="animate-pulse"
          />
          
          {/* Energy Aura Effect */}
          <div className="absolute inset-0 rounded-full animate-ping opacity-30">
            <div className={`w-full h-full rounded-full ${
              isListening ? 'bg-blue-500' :
              state.isPlayingAudio ? 'bg-orange-500' :
              isTTSLoading ? 'bg-purple-500' : 'bg-gray-500'
            }`} />
          </div>
        </div>
        
        {/* Scouter HUD Overlay */}
        <div className="absolute -top-4 -right-4 bg-gray-900/80 border border-orange-600/50 rounded-lg p-2 min-w-[120px]">
          <DragonBallLoadingStates.PowerLevelScanner 
            currentLevel={state.currentTranscript.length * 50}
            maxLevel={9000}
          />
        </div>
      </div>

      {/* DBZ-Themed Control Buttons */}
      <div className="flex space-x-6 relative z-10">
        {/* Ki-Powered Microphone Button */}
        <button
          onClick={toggleMicrophone}
          className="relative p-6 bg-gray-900/50 border border-orange-800/50 rounded-full transition-all duration-300 transform hover:scale-110 disabled:opacity-50"
          aria-label={isListening ? 'Stop channeling your ki' : 'Channel your ki'}
          disabled={isTTSLoading}
        >
          <div className="relative">
            <DragonBallLoadingStates.KiCharging
              size="lg"
              color={isListening ? "blue" : "orange"}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
          </div>
          
          {/* Energy Ring Effect */}
          {isListening && (
            <div className="absolute inset-0 rounded-full">
              <div className="w-full h-full rounded-full border-2 border-blue-400 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border border-blue-300 animate-pulse" />
            </div>
          )}
          
          {/* Button Label */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold">
            <span className={isListening ? 'text-blue-400' : 'text-orange-400'}>
              {isListening ? 'Listening' : 'Voice'}
            </span>
          </div>
        </button>

        {/* Dragon Ball Speaker Toggle */}
        <button
          onClick={toggleSpeaker}
          className="relative p-6 bg-gray-900/50 border border-orange-800/50 rounded-full transition-all duration-300 transform hover:scale-110"
          aria-label={state.isSpeakerEnabled ? 'Mute dragon voice' : 'Enable dragon voice'}
        >
          <div className="relative">
            {state.isSpeakerEnabled ? (
              <div className="flex items-center justify-center">
                <DragonBallLoadingStates.DragonBallCollector />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center opacity-50">
                <span className="text-2xl">🔇</span>
              </div>
            )}
          </div>
          
          {/* Active Indicator */}
          {state.isSpeakerEnabled && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full animate-pulse">
              <div className="w-full h-full bg-orange-400 rounded-full animate-ping opacity-75" />
            </div>
          )}
          
          {/* Button Label */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold">
            <span className={state.isSpeakerEnabled ? 'text-orange-400' : 'text-gray-500'}>
              {state.isSpeakerEnabled ? 'Dragon Voice' : 'Muted'}
            </span>
          </div>
        </button>
      </div>

      {/* DBZ Voice Status Indicators */}
      <div className="w-full max-w-md space-y-3 relative z-10">
        {isListening && (
          <DragonBallLoadingStates.Voice 
            operation="listening"
            className="animate-slideInFromLeft"
          />
        )}
        {isTTSLoading && (
          <DragonBallLoadingStates.Voice 
            operation="processing"
            className="animate-slideInFromLeft"
          />
        )}
        {state.isPlayingAudio && (
          <DragonBallLoadingStates.Voice 
            operation="speaking"
            className="animate-slideInFromLeft"
          />
        )}
        {!isListening && !isTTSLoading && !state.isPlayingAudio && (
          <div className="text-center text-gray-500 py-4">
            <span className="text-sm">🐉 Sei-ron awaits your financial wishes</span>
            <div className="text-xs text-gray-600 mt-1">
              Voice your DeFi dreams to the portfolio dragon
            </div>
          </div>
        )}
      </div>

      {/* Dragon Ball Z Themed Transcript Display */}
      {state.currentTranscript && (
        <div className="w-full max-w-md relative z-10">
          <AnimeMessageBubble
            message={{
              id: `voice-transcript-${Date.now()}`,
              role: 'user',
              content: state.currentTranscript,
              powerLevel: Math.min(state.currentTranscript.length * 50, 9000),
              emotion: state.currentTranscript.includes('!') ? 'excited' : 
                       state.currentTranscript.includes('?') ? 'serious' : 'neutral'
            }}
            enableAnimations={true}
            showPowerLevel={true}
            showTimestamp={false}
            className="animate-fadeIn"
          />
          
          {/* Real-time transcript analysis */}
          <div className="mt-2 text-center">
            <DragonBallLoadingStates.PowerLevelScanner 
              currentLevel={state.currentTranscript.length * 50}
              maxLevel={9000}
            />
            <div className="text-xs text-gray-400 mt-1">
              Wish Power: {state.currentTranscript.length} words • Sei Analysis Ready
            </div>
          </div>
        </div>
      )}

      {/* DBZ-Themed Error Display */}
      {state.lastError && (
        <div className="w-full max-w-md relative z-10">
          <DragonBallLoadingStates.ErrorRecovery 
            message={`Scouter malfunction detected: ${state.lastError.message}`}
            className="animate-shake"
          />
          <div className="text-center text-xs text-red-400 mt-2">
            💊 Restoring Sei connection with Dragon Ball magic...
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInterface

// Export utility function for external audio playback
export const useVoiceInterfaceAudio = (elevenLabsConfig: ElevenLabsConfig) => {
  const { speak, stop, isSpeaking } = useSecureElevenLabsTTS(elevenLabsConfig)
  
  return {
    playResponse: async (text: string) => {
      const result = await speak(text)()
      return pipe(
        result,
        E.fold(
          (error) => Promise.reject(new Error(error.message)),
          () => Promise.resolve()
        )
      )
    },
    stopAudio: stop,
    isPlaying: isSpeaking
  }
}