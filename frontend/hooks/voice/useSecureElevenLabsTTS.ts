import { useState, useCallback, useRef, useEffect } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { logger } from '../../lib/logger'
import { voiceLogger, logTTS, logEnvironment, logPerformance } from '../../lib/voice-logger'
import { 
  defaultVoiceApiClient, 
  type VoiceApiConfig 
} from '../../lib/voice-api-client'
import type { TTSError, TTSState, VoiceSynthesisRequest } from '../../types/api/elevenlabs'

// Add webkitAudioContext to Window interface
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

export interface SecureElevenLabsConfig {
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
  apiConfig?: VoiceApiConfig
}

const createTTSError = (
  type: TTSError['type'],
  message: string,
  statusCode?: number,
  originalError?: unknown
): TTSError => {
  const error = {
    type,
    message,
    statusCode,
    originalError
  }
  
  logger.error('🔊 TTS Error Created', {
    type,
    message,
    statusCode,
    originalErrorType: originalError ? typeof originalError : 'none',
    originalErrorMessage: originalError instanceof Error ? originalError.message : originalError
  })
  
  return error
}

const decodeAudioBuffer = (
  arrayBuffer: ArrayBuffer
): TE.TaskEither<TTSError, AudioBuffer> => {
  logger.debug('🎵 Decoding audio buffer', { bufferSize: arrayBuffer.byteLength })
  
  return TE.tryCatch(
    async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      
      if (!AudioContextClass) {
        logger.error('🎵 AudioContext not available')
        throw new Error('AudioContext not supported')
      }
      
      const audioContext = new AudioContextClass()
      logger.debug('🎵 AudioContext created', { 
        state: audioContext.state,
        sampleRate: audioContext.sampleRate
      })
      
      if (audioContext.state === 'suspended') {
        logger.debug('🎵 AudioContext suspended, attempting to resume')
        await audioContext.resume()
        logger.debug('🎵 AudioContext resumed', { state: audioContext.state })
      }
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      logger.debug('🎵 Audio decoded successfully', {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length
      })
      
      return audioBuffer
    },
    (error) => createTTSError('AUDIO_ERROR', 'Failed to decode audio', undefined, error)
  )
}

const playAudioBuffer = (
  audioBuffer: AudioBuffer
): TE.TaskEither<TTSError, void> => {
  logger.debug('🎵 Playing audio buffer', {
    duration: audioBuffer.duration,
    channels: audioBuffer.numberOfChannels
  })
  
  return TE.tryCatch(
    async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      
      if (!AudioContextClass) {
        logger.error('🎵 AudioContext not available for playback')
        throw new Error('AudioContext not supported')
      }
      
      const audioContext = new AudioContextClass()
      logger.debug('🎵 AudioContext for playback', { 
        state: audioContext.state,
        sampleRate: audioContext.sampleRate
      })
      
      if (audioContext.state === 'suspended') {
        logger.debug('🎵 AudioContext suspended, resuming for playback')
        await audioContext.resume()
        logger.debug('🎵 AudioContext resumed for playback', { state: audioContext.state })
      }
      
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      
      logger.debug('🎵 Audio source connected, starting playback')
      
      return new Promise<void>((resolve, reject) => {
        source.onended = () => {
          logger.debug('🎵 Audio playback ended')
          resolve()
        }
        
        // AudioBufferSourceNode doesn't have onerror, so we handle errors via try-catch
        try {
          source.start(0)
          logger.debug('🎵 Audio playback started')
        } catch (error) {
          logger.error('🎵 Audio playback error', { error })
          reject(new Error('Audio playback failed'))
        }
      })
    },
    (error) => createTTSError('AUDIO_ERROR', 'Failed to play audio', undefined, error)
  )
}

export const useSecureElevenLabsTTS = (config: SecureElevenLabsConfig) => {
  logger.debug('🔊 Initializing Secure ElevenLabs TTS', {
    voiceId: config.voiceId,
    modelId: config.modelId || 'eleven_monolingual_v1',
    voiceSettings: config.voiceSettings,
    hasApiConfig: !!config.apiConfig
  })
  
  // Enhanced voice logging
  logTTS.configValidation(config, { component: 'useSecureElevenLabsTTS' })
  
  // Log environment variables (without exposing sensitive data)
  useEffect(() => {
    const envVars = {
      NEXT_PUBLIC_ELEVENLABS_VOICE_ID: typeof process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID !== 'undefined' ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_VOICE_ENABLED: process.env.NEXT_PUBLIC_VOICE_ENABLED || 'NOT_SET'
    }
    
    logger.debug('🔊 Environment variables status', envVars)
  }, [])
  
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    cachedAudio: new Map()
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  
  // Log state changes
  useEffect(() => {
    logger.debug('🔊 TTS state changed', {
      isSpeaking: state.isSpeaking,
      isLoading: state.isLoading,
      hasError: !!state.error,
      errorType: state.error?.type,
      cachedAudioCount: state.cachedAudio.size
    })
  }, [state])

  const synthesizeSpeech = useCallback(
    (text: string): TE.TaskEither<TTSError, ArrayBuffer> => {
      logger.debug('🔊 Synthesizing speech via secure API', {
        textLength: text.length,
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId: config.voiceId
      })
      
      // Prepare request for secure API
      const request: VoiceSynthesisRequest = {
        text,
        voiceId: config.voiceId,
        modelId: config.modelId || 'eleven_monolingual_v1',
        voiceSettings: config.voiceSettings ? {
          stability: config.voiceSettings.stability,
          similarity_boost: config.voiceSettings.similarityBoost,
          style: config.voiceSettings.style,
          use_speaker_boost: config.voiceSettings.useSpeakerBoost
        } : undefined
      }
      
      return defaultVoiceApiClient.synthesizeSpeech(request)
    },
    [config]
  )

  const speak = useCallback(
    (text: string): TE.TaskEither<TTSError, void> => {
      logger.debug('🔊 Starting secure TTS speak operation', {
        textLength: text.length,
        textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      })
      
      return pipe(
        TE.Do,
        TE.tap(() => {
          logger.debug('🔊 Setting loading state')
          setState(prev => ({ ...prev, isLoading: true, error: null }))
          return TE.right(undefined)
        }),
        TE.chain(() => {
          logger.debug('🔊 Synthesizing speech via secure API')
          return synthesizeSpeech(text)
        }),
        TE.chain((buffer) => {
          logger.debug('🔊 Decoding audio buffer for playback')
          return decodeAudioBuffer(buffer)
        }),
        TE.chain((audioBuffer) => {
          logger.debug('🔊 Starting audio playback')
          setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
          return playAudioBuffer(audioBuffer)
        }),
        TE.mapLeft((error) => {
          logger.error('🔊 Secure speak operation failed', {
            errorType: error.type,
            errorMessage: error.message,
            statusCode: error.statusCode
          })
          setState(prev => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            error
          }))
          return error
        }),
        TE.map(() => {
          logger.debug('🔊 Secure speak operation completed successfully')
          setState(prev => ({ ...prev, isSpeaking: false }))
        })
      )
    },
    [synthesizeSpeech]
  )

  const stop = useCallback(() => {
    logger.debug('🔊 Stopping TTS playback')
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
      setState(prev => ({ ...prev, isSpeaking: false }))
      logger.debug('🔊 TTS playback stopped')
    } else {
      logger.debug('🔊 No active audio source to stop')
    }
  }, [])

  const preloadAudio = useCallback(
    (texts: readonly string[]): TE.TaskEither<TTSError, readonly void[]> => {
      logger.debug('🔊 Preloading audio for texts via secure API', {
        textCount: texts.length,
        textPreviews: texts.map(t => t.substring(0, 30) + (t.length > 30 ? '...' : ''))
      })
      
      return TE.traverseArray((text: string) =>
        pipe(
          synthesizeSpeech(text),
          TE.map(() => {
            logger.debug('🔊 Preloaded audio for text via secure API', {
              textLength: text.length,
              textPreview: text.substring(0, 30) + (text.length > 30 ? '...' : '')
            })
            return undefined as void
          })
        )
      )(texts)
    },
    [synthesizeSpeech]
  )

  const clearCache = useCallback(() => {
    logger.debug('🔊 Clearing voice synthesis cache')
    defaultVoiceApiClient.clearCache()
    setState(prev => ({ ...prev, cachedAudio: new Map() }))
  }, [])

  const getCacheStats = useCallback(() => {
    return defaultVoiceApiClient.getCacheStats()
  }, [])

  useEffect(() => {
    return () => {
      logger.debug('🔊 Cleaning up secure TTS resources')
      if (currentSourceRef.current) {
        currentSourceRef.current.stop()
        logger.debug('🔊 Stopped current audio source')
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        logger.debug('🔊 Closed audio context')
      }
    }
  }, [])

  return {
    ...state,
    speak,
    stop,
    preloadAudio,
    clearCache,
    getCacheStats
  }
}