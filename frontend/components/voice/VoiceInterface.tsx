import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSpeechRecognition } from '../../hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS, ElevenLabsConfig } from '../../hooks/voice/useElevenLabsTTS'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { logger } from '../../lib/logger'

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
    clearTranscript,
    isSupported: isSpeechSupported
  } = useSpeechRecognition()

  const {
    isSpeaking,
    isLoading: isTTSLoading,
    error: ttsError,
    speak,
    stop: stopSpeaking
  } = useElevenLabsTTS(elevenLabsConfig)

  // Update playing audio state
  useEffect(() => {
    setState(prev => ({ ...prev, isPlayingAudio: isSpeaking }))
  }, [isSpeaking])

  // Handle transcript changes
  useEffect(() => {
    const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '')
    setState(prev => ({ ...prev, currentTranscript: fullTranscript }))
    onTranscriptChange?.(fullTranscript)
  }, [transcript, interimTranscript, onTranscriptChange])

  // Handle errors
  useEffect(() => {
    const error = speechError || ttsError
    if (error) {
      const errorMessage = new Error(error.message)
      setState(prev => ({ ...prev, lastError: errorMessage }))
      onError?.(errorMessage)
    }
  }, [speechError, ttsError, onError])

  const toggleMicrophone = useCallback(async () => {
    if (isListening) {
      const result = await stopListening()()
      pipe(
        result,
        E.fold(
          (error) => {
            logger.error('Failed to stop listening:', error)
            onError?.(new Error(error.message))
          },
          () => {
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
            logger.error('Failed to start listening:', error)
            onError?.(new Error(error.message))
          },
          () => {
            setState(prev => ({ ...prev, isMicrophoneActive: true }))
          }
        )
      )
    }
  }, [isListening, startListening, stopListening, onError])

  const toggleSpeaker = useCallback(() => {
    setState(prev => ({ ...prev, isSpeakerEnabled: !prev.isSpeakerEnabled }))
  }, [])

  const playAudioResponse = useCallback(async (text: string) => {
    if (!state.isSpeakerEnabled) return

    const result = await speak(text)()
    pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to play audio:', error)
          onError?.(new Error(error.message))
        },
        () => {
          logger.debug('Audio playback completed')
        }
      )
    )
  }, [state.isSpeakerEnabled, speak, onError])

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

  const dragonEmojiClasses = useMemo(() => {
    const baseClasses = 'text-6xl transition-all duration-300'
    const activeClasses = state.isPlayingAudio
      ? 'animate-bounce scale-125'
      : 'scale-100'
    
    return `${baseClasses} ${activeClasses}`
  }, [state.isPlayingAudio])

  if (!isSpeechSupported) {
    return (
      <div className={`text-red-500 p-4 bg-red-900/20 rounded-lg ${className}`}>
        <p>Speech recognition is not supported in this browser.</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center space-y-6 p-6 ${className}`}>
      {/* Dragon Emoji Display */}
      <div className="relative">
        <span className={dragonEmojiClasses} role="img" aria-label="Dragon">
          {state.isPlayingAudio ? '🐉🔥' : '🐉'}
        </span>
        {state.isPlayingAudio && (
          <div className="absolute inset-0 animate-ping opacity-30">
            <span className="text-6xl" role="img" aria-label="Fire">🔥</span>
          </div>
        )}
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