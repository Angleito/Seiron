import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSpeechRecognition } from '../../hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS, ElevenLabsConfig } from '../../hooks/voice/useElevenLabsTTS'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import { logger } from '../../lib/logger'
import { voiceLogger, logVoiceInterface, logEnvironment } from '../../lib/voice-logger'

// Log environment variables at module load
const envStatus = {
  hasElevenLabsKey: typeof process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY !== 'undefined',
  elevenLabsKeyLength: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY?.length || 0,
  hasVoiceId: typeof process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID !== 'undefined',
  voiceIdValue: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'NOT_SET',
  voiceEnabled: process.env.NEXT_PUBLIC_VOICE_ENABLED || 'NOT_SET',
  nodeEnv: process.env.NODE_ENV || 'unknown'
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
    configApiKeyLength: elevenLabsConfig.apiKey?.length || 0,
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
  } = useElevenLabsTTS(elevenLabsConfig)
  
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
      <div className={`text-red-500 p-4 bg-red-900/20 rounded-lg ${className}`}>
        <p>Speech recognition is not supported in this browser.</p>
        <p className="text-sm mt-2">Please try using Chrome, Edge, or Safari for voice features.</p>
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
  
  return (
    <div className={`flex flex-col items-center space-y-6 p-6 ${className}`}>
      {/* Voice Status Indicator */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        
        {/* Voice state indicator overlay */}
        <div className="absolute -top-2 -right-2 flex space-x-1">
          {isListening && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Listening" />
          )}
          {state.isPlayingAudio && (
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" title="Speaking" />
          )}
          {isTTSLoading && (
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin" title="Processing" />
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-4">
        {/* Microphone Button */}
        <button
          onClick={toggleMicrophone}
          className={microphoneButtonClasses}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          disabled={isTTSLoading}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
          {isListening && (
            <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
          )}
        </button>

        {/* Speaker Button */}
        <button
          onClick={toggleSpeaker}
          className={speakerButtonClasses}
          aria-label={state.isSpeakerEnabled ? 'Disable auto-speak' : 'Enable auto-speak'}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          </svg>
          {state.isSpeakerEnabled && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-orange-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-col items-center space-y-2 text-sm">
        {isListening && (
          <div className="flex items-center space-x-2 text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span>Listening...</span>
          </div>
        )}
        {isTTSLoading && (
          <div className="flex items-center space-x-2 text-orange-400">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span>Preparing audio...</span>
          </div>
        )}
        {state.isPlayingAudio && (
          <div className="flex items-center space-x-2 text-orange-400">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span>Playing audio...</span>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {state.currentTranscript && (
        <div className="w-full max-w-md p-4 bg-gray-800/50 rounded-lg border border-orange-500/30">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-orange-400">Transcript:</span> {state.currentTranscript}
          </p>
        </div>
      )}

      {/* Error Display */}
      {state.lastError && (
        <div className="w-full max-w-md p-4 bg-red-900/20 rounded-lg border border-red-500/30">
          <p className="text-sm text-red-400">
            <span className="font-semibold">Error:</span> {state.lastError.message}
          </p>
        </div>
      )}
    </div>
  )
}

export default VoiceInterface

// Export utility function for external audio playback
export const useVoiceInterfaceAudio = (elevenLabsConfig: ElevenLabsConfig) => {
  const { speak, stop, isSpeaking } = useElevenLabsTTS(elevenLabsConfig)
  
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