import { useState, useCallback, useRef, useEffect } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { logger } from '../../lib/logger'
import { voiceLogger, logTTS, logEnvironment, logPerformance } from '../../lib/voice-logger'

// Add webkitAudioContext to Window interface
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

export interface TTSError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'QUOTA_EXCEEDED'
  message: string
  statusCode?: number
  originalError?: unknown
}

export interface TTSState {
  isSpeaking: boolean
  isLoading: boolean
  error: TTSError | null
  cachedAudio: Map<string, ArrayBuffer>
}

export interface ElevenLabsConfig {
  apiKey: string
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
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

const CACHE_KEY_PREFIX = 'elevenlabs_tts_'
const CACHE_MAX_SIZE = 20
const CACHE_TTL = 3600000 // 1 hour

const openIndexedDB = (): TE.TaskEither<TTSError, IDBDatabase> => {
  logger.debug('💾 Opening IndexedDB for TTS cache')
  
  return TE.tryCatch(
    () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('ElevenLabsTTSCache', 1)
        
        request.onerror = () => {
          logger.error('💾 IndexedDB open error', { error: request.error })
          reject(request.error)
        }
        request.onsuccess = () => {
          logger.debug('💾 IndexedDB opened successfully')
          resolve(request.result)
        }
        
        request.onupgradeneeded = (event) => {
          logger.debug('💾 IndexedDB upgrade needed, creating audio store')
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('audio')) {
            db.createObjectStore('audio', { keyPath: 'id' })
            logger.debug('💾 Audio object store created')
          }
        }
      }),
    (error) => createTTSError('AUDIO_ERROR', `Failed to open IndexedDB: ${error}`, undefined, error)
  )
}

const getCachedAudio = (
  text: string
): TE.TaskEither<TTSError, O.Option<ArrayBuffer>> => {
  const cacheKey = CACHE_KEY_PREFIX + text
  logger.debug('💾 Checking cache for audio', { 
    textLength: text.length,
    cacheKey,
    textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
  })
  
  return pipe(
    openIndexedDB(),
    TE.chain((db) =>
      TE.tryCatch(
        () =>
          new Promise<O.Option<ArrayBuffer>>((resolve) => {
            const transaction = db.transaction(['audio'], 'readonly')
            const store = transaction.objectStore('audio')
            const request = store.get(cacheKey)
            
            request.onsuccess = () => {
              const result = request.result
              if (result && Date.now() - result.timestamp < CACHE_TTL) {
                logger.debug('💾 Cache hit for audio', { 
                  cacheKey,
                  bufferSize: result.buffer.byteLength,
                  age: Date.now() - result.timestamp
                })
                resolve(O.some(result.buffer))
              } else {
                logger.debug('💾 Cache miss for audio', { 
                  cacheKey,
                  hasResult: !!result,
                  expired: result ? Date.now() - result.timestamp >= CACHE_TTL : false
                })
                resolve(O.none)
              }
            }
            
            request.onerror = () => {
              logger.warn('💾 Cache read error', { cacheKey, error: request.error })
              resolve(O.none)
            }
          }),
        (error) => createTTSError('AUDIO_ERROR', `Failed to get cached audio: ${error}`, undefined, error)
      )
    )
  )
}

const setCachedAudio = (
  text: string,
  buffer: ArrayBuffer
): TE.TaskEither<TTSError, void> => {
  const cacheKey = CACHE_KEY_PREFIX + text
  logger.debug('💾 Caching audio', { 
    cacheKey,
    bufferSize: buffer.byteLength,
    textLength: text.length
  })
  
  return pipe(
    openIndexedDB(),
    TE.chain((db) =>
      TE.tryCatch(
        async () => {
          const transaction = db.transaction(['audio'], 'readwrite')
          const store = transaction.objectStore('audio')
          
          const allKeys = await new Promise<string[]>((resolve) => {
            const keysRequest = store.getAllKeys()
            keysRequest.onsuccess = () => 
              resolve(keysRequest.result as string[])
          })
          
          const cacheKeys = allKeys.filter(key => 
            key.startsWith(CACHE_KEY_PREFIX)
          )
          
          logger.debug('💾 Cache status', {
            currentSize: cacheKeys.length,
            maxSize: CACHE_MAX_SIZE,
            willEvict: cacheKeys.length >= CACHE_MAX_SIZE
          })
          
          if (cacheKeys.length >= CACHE_MAX_SIZE) {
            const oldestKey = cacheKeys[0]
            if (oldestKey) {
              logger.debug('💾 Evicting oldest cache entry', { oldestKey })
              store.delete(oldestKey as IDBValidKey)
            }
          }
          
          store.put({
            id: cacheKey,
            buffer,
            timestamp: Date.now()
          })
          
          logger.debug('💾 Audio cached successfully', { cacheKey })
        },
        (error) => createTTSError('AUDIO_ERROR', `Failed to cache audio: ${error}`, undefined, error)
      )
    )
  )
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

export const useElevenLabsTTS = (config: ElevenLabsConfig) => {
  logger.debug('🔊 Initializing ElevenLabs TTS', {
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey?.length || 0,
    voiceId: config.voiceId,
    modelId: config.modelId || 'eleven_monolingual_v1',
    voiceSettings: config.voiceSettings
  })
  
  // Enhanced voice logging
  logTTS.configValidation(config, { component: 'useElevenLabsTTS' })
  
  // Log environment variables (without exposing sensitive data)
  useEffect(() => {
    const envVars = {
      NEXT_PUBLIC_ELEVENLABS_API_KEY: typeof process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY !== 'undefined' ? 'SET' : 'NOT_SET',
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
      logger.debug('🔊 Synthesizing speech', {
        textLength: text.length,
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId: config.voiceId
      })
      
      // Validate API key
      if (!config.apiKey) {
        logger.error('🔊 No API key provided')
        return TE.left(createTTSError('API_ERROR', 'No API key provided'))
      }
      
      if (config.apiKey.length < 10) {
        logger.error('🔊 API key appears to be invalid', { keyLength: config.apiKey.length })
        return TE.left(createTTSError('API_ERROR', 'Invalid API key format'))
      }
      
      return pipe(
        getCachedAudio(text),
        TE.chain((cached) =>
          pipe(
            cached,
            O.fold(
              () => {
                logger.debug('🔊 No cache hit, making API request')
                return pipe(
                  TE.tryCatch(
                    async () => {
                      const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`
                      const requestBody = {
                        text,
                        model_id: config.modelId || 'eleven_monolingual_v1',
                        voice_settings: config.voiceSettings || {
                          stability: 0.5,
                          similarity_boost: 0.5
                        }
                      }
                      
                      logger.debug('🔊 Making ElevenLabs API request', {
                        url: apiUrl,
                        voiceId: config.voiceId,
                        modelId: requestBody.model_id,
                        voiceSettings: requestBody.voice_settings,
                        textLength: text.length
                      })
                      
                      const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                          'xi-api-key': config.apiKey,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                      })
                      
                      logger.debug('🔊 API response received', {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries())
                      })

                      if (!response.ok) {
                        const responseText = await response.text()
                        logger.error('🔊 API request failed', {
                          status: response.status,
                          statusText: response.statusText,
                          responseText: responseText.substring(0, 500)
                        })
                        
                        if (response.status === 429) {
                          throw createTTSError(
                            'QUOTA_EXCEEDED',
                            'API quota exceeded',
                            response.status
                          )
                        }
                        throw createTTSError(
                          'API_ERROR',
                          `API error: ${response.statusText} - ${responseText}`,
                          response.status
                        )
                      }

                      const audioBuffer = await response.arrayBuffer()
                      logger.debug('🔊 Audio buffer received', {
                        bufferSize: audioBuffer.byteLength
                      })
                      
                      return audioBuffer
                    },
                    (error): TTSError => {
                      if (error && typeof error === 'object' && 'type' in error) return error as TTSError
                      return createTTSError(
                        'NETWORK_ERROR',
                        'Network request failed',
                        undefined,
                        error
                      )
                    }
                  ),
                  TE.chainFirst((buffer) => setCachedAudio(text, buffer))
                )
              },
              (buffer) => {
                logger.debug('🔊 Using cached audio', { bufferSize: buffer.byteLength })
                return TE.right(buffer)
              }
            )
          )
        )
      )
    },
    [config]
  )

  const speak = useCallback(
    (text: string): TE.TaskEither<TTSError, void> => {
      logger.debug('🔊 Starting TTS speak operation', {
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
          logger.debug('🔊 Synthesizing speech for playback')
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
          logger.error('🔊 Speak operation failed', {
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
          logger.debug('🔊 Speak operation completed successfully')
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
      logger.debug('🔊 Preloading audio for texts', {
        textCount: texts.length,
        textPreviews: texts.map(t => t.substring(0, 30) + (t.length > 30 ? '...' : ''))
      })
      
      return TE.traverseArray((text: string) =>
        pipe(
          synthesizeSpeech(text),
          TE.map(() => {
            logger.debug('🔊 Preloaded audio for text', {
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

  useEffect(() => {
    return () => {
      logger.debug('🔊 Cleaning up TTS resources')
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
    preloadAudio
  }
}