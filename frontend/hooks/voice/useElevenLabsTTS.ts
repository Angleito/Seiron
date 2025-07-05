import { useState, useCallback, useRef, useEffect } from 'react'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

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
): TTSError => ({
  type,
  message,
  statusCode,
  originalError
})

const CACHE_KEY_PREFIX = 'elevenlabs_tts_'
const CACHE_MAX_SIZE = 20
const CACHE_TTL = 3600000 // 1 hour

interface CachedAudio {
  buffer: ArrayBuffer
  timestamp: number
}

const openIndexedDB = (): TE.TaskEither<Error, IDBDatabase> =>
  TE.tryCatch(
    () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('ElevenLabsTTSCache', 1)
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('audio')) {
            db.createObjectStore('audio', { keyPath: 'id' })
          }
        }
      }),
    (error) => new Error(`Failed to open IndexedDB: ${error}`)
  )

const getCachedAudio = (
  text: string
): TE.TaskEither<Error, O.Option<ArrayBuffer>> =>
  pipe(
    openIndexedDB(),
    TE.chain((db) =>
      TE.tryCatch(
        () =>
          new Promise<O.Option<ArrayBuffer>>((resolve) => {
            const transaction = db.transaction(['audio'], 'readonly')
            const store = transaction.objectStore('audio')
            const request = store.get(CACHE_KEY_PREFIX + text)
            
            request.onsuccess = () => {
              const result = request.result
              if (result && Date.now() - result.timestamp < CACHE_TTL) {
                resolve(O.some(result.buffer))
              } else {
                resolve(O.none)
              }
            }
            
            request.onerror = () => resolve(O.none)
          }),
        (error) => new Error(`Failed to get cached audio: ${error}`)
      )
    )
  )

const setCachedAudio = (
  text: string,
  buffer: ArrayBuffer
): TE.TaskEither<Error, void> =>
  pipe(
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
          
          if (cacheKeys.length >= CACHE_MAX_SIZE) {
            const oldestKey = cacheKeys[0]
            store.delete(oldestKey)
          }
          
          store.put({
            id: CACHE_KEY_PREFIX + text,
            buffer,
            timestamp: Date.now()
          })
        },
        (error) => new Error(`Failed to cache audio: ${error}`)
      )
    )
  )

const decodeAudioBuffer = (
  arrayBuffer: ArrayBuffer
): TE.TaskEither<TTSError, AudioBuffer> =>
  TE.tryCatch(
    async () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      return await audioContext.decodeAudioData(arrayBuffer)
    },
    (error) => createTTSError('AUDIO_ERROR', 'Failed to decode audio', undefined, error)
  )

const playAudioBuffer = (
  audioBuffer: AudioBuffer
): TE.TaskEither<TTSError, void> =>
  TE.tryCatch(
    async () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      
      return new Promise<void>((resolve) => {
        source.onended = () => resolve()
        source.start(0)
      })
    },
    (error) => createTTSError('AUDIO_ERROR', 'Failed to play audio', undefined, error)
  )

export const useElevenLabsTTS = (config: ElevenLabsConfig) => {
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    cachedAudio: new Map()
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const synthesizeSpeech = useCallback(
    (text: string): TE.TaskEither<TTSError, ArrayBuffer> =>
      pipe(
        getCachedAudio(text),
        TE.chain((cached) =>
          pipe(
            cached,
            O.fold(
              () =>
                pipe(
                  TE.tryCatch(
                    async () => {
                      const response = await fetch(
                        `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
                        {
                          method: 'POST',
                          headers: {
                            'xi-api-key': config.apiKey,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            text,
                            model_id: config.modelId || 'eleven_monolingual_v1',
                            voice_settings: config.voiceSettings || {
                              stability: 0.5,
                              similarity_boost: 0.5
                            }
                          })
                        }
                      )

                      if (!response.ok) {
                        if (response.status === 429) {
                          throw createTTSError(
                            'QUOTA_EXCEEDED',
                            'API quota exceeded',
                            response.status
                          )
                        }
                        throw createTTSError(
                          'API_ERROR',
                          `API error: ${response.statusText}`,
                          response.status
                        )
                      }

                      return response.arrayBuffer()
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
                ),
              (buffer) => TE.right(buffer)
            )
          )
        )
      ),
    [config]
  )

  const speak = useCallback(
    (text: string): TE.TaskEither<TTSError, void> =>
      pipe(
        TE.Do,
        TE.tap(() => {
          setState(prev => ({ ...prev, isLoading: true, error: null }))
          return TE.right(undefined)
        }),
        TE.chain(() => synthesizeSpeech(text)),
        TE.chain(decodeAudioBuffer),
        TE.chain((audioBuffer) => {
          setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
          return playAudioBuffer(audioBuffer)
        }),
        TE.mapLeft((error) => {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            error
          }))
          return error
        }),
        TE.map(() => {
          setState(prev => ({ ...prev, isSpeaking: false }))
        })
      ),
    [synthesizeSpeech]
  )

  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
      setState(prev => ({ ...prev, isSpeaking: false }))
    }
  }, [])

  const preloadAudio = useCallback(
    (texts: string[]): TE.TaskEither<TTSError, void[]> =>
      TE.traverseArray((text: string) =>
        pipe(
          synthesizeSpeech(text),
          TE.map(() => undefined as void)
        )
      )(texts),
    [synthesizeSpeech]
  )

  useEffect(() => {
    return () => {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
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