import { useState, useCallback, useRef, useEffect } from 'react'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'

/**
 * Error type for TTS operations
 * @interface TTSError
 */
export interface TTSError {
  /** Type of error that occurred */
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'QUOTA_EXCEEDED'
  /** Human-readable error message */
  message: string
  /** HTTP status code (if applicable) */
  statusCode?: number
  /** Original error object for debugging */
  originalError?: unknown
}

/**
 * State of the TTS system
 * @interface TTSState
 */
export interface TTSState {
  /** Whether audio is currently playing */
  isSpeaking: boolean
  /** Whether TTS is loading/processing */
  isLoading: boolean
  /** Current error state, if any */
  error: TTSError | null
  /** Cache of synthesized audio data */
  cachedAudio: Map<string, ArrayBuffer>
}

/**
 * Configuration for ElevenLabs TTS service
 * @interface ElevenLabsConfig
 */
export interface ElevenLabsConfig {
  /** ElevenLabs API endpoint URL */
  apiUrl: string
  /** Voice model ID to use */
  modelId?: string
  /** Voice synthesis settings */
  voiceSettings?: {
    /** Voice stability (0-1) */
    stability?: number
    /** Similarity boost (0-1) */
    similarityBoost?: number
    /** Voice style intensity (0-1) */
    style?: number
    /** Whether to use speaker boost */
    useSpeakerBoost?: boolean
  }
}

export interface AudioContext {
  audioContext: AudioContext | null
  currentSource: AudioBufferSourceNode | null
}

export interface CacheContext {
  db: IDBDatabase | null
  keyPrefix: string
  maxSize: number
  ttl: number
}

// Pure function constructors
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

// Pure validation functions
const validateText = (text: string): E.Either<TTSError, string> =>
  text.trim().length === 0
    ? E.left(createTTSError('API_ERROR', 'Text cannot be empty'))
    : E.right(text.trim())

const validateConfig = (config: ElevenLabsConfig): E.Either<TTSError, ElevenLabsConfig> =>
  config.apiUrl.trim().length === 0
    ? E.left(createTTSError('API_ERROR', 'API URL is required'))
    : E.right(config)

const isCacheValid = (cachedAudio: CachedAudio): boolean =>
  Date.now() - cachedAudio.timestamp < CACHE_TTL

const createCacheKey = (text: string): string => CACHE_KEY_PREFIX + text

// Pure database operations
const openIndexedDB = (): TE.TaskEither<TTSError, IDBDatabase> =>
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
    (error) => createTTSError('AUDIO_ERROR', `Failed to open IndexedDB: ${error}`, undefined, error)
  )

const createCacheReader = (db: IDBDatabase) => (key: string): TE.TaskEither<TTSError, O.Option<CachedAudio>> =>
  TE.tryCatch(
    () =>
      new Promise<O.Option<CachedAudio>>((resolve) => {
        const transaction = db.transaction(['audio'], 'readonly')
        const store = transaction.objectStore('audio')
        const request = store.get(key)
        
        request.onsuccess = () => {
          const result = request.result
          if (result && isCacheValid(result)) {
            resolve(O.some(result))
          } else {
            resolve(O.none)
          }
        }
        
        request.onerror = () => resolve(O.none)
      }),
    (error) => createTTSError('AUDIO_ERROR', `Failed to read cache: ${error}`, undefined, error)
  )

const createCacheWriter = (db: IDBDatabase) => (key: string, buffer: ArrayBuffer): TE.TaskEither<TTSError, void> =>
  TE.tryCatch(
    async () => {
      const transaction = db.transaction(['audio'], 'readwrite')
      const store = transaction.objectStore('audio')
      
      const allKeys = await new Promise<string[]>((resolve) => {
        const keysRequest = store.getAllKeys()
        keysRequest.onsuccess = () => 
          resolve(keysRequest.result as string[])
      })
      
      const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_KEY_PREFIX))
      
      if (cacheKeys.length >= CACHE_MAX_SIZE) {
        const oldestKey = cacheKeys[0]
        store.delete(oldestKey)
      }
      
      store.put({
        id: key,
        buffer,
        timestamp: Date.now()
      })
    },
    (error) => createTTSError('AUDIO_ERROR', `Failed to write cache: ${error}`, undefined, error)
  )

// Pure cache operations using Reader pattern
const getCachedAudio = (text: string): TE.TaskEither<TTSError, O.Option<ArrayBuffer>> =>
  pipe(
    openIndexedDB(),
    TE.chain((db) =>
      pipe(
        createCacheReader(db)(createCacheKey(text)),
        TE.map(O.map(cached => cached.buffer))
      )
    )
  )

const setCachedAudio = (text: string, buffer: ArrayBuffer): TE.TaskEither<TTSError, void> =>
  pipe(
    openIndexedDB(),
    TE.chain((db) => createCacheWriter(db)(createCacheKey(text), buffer))
  )

// Pure audio processing functions
const createAudioContext = (): TE.TaskEither<TTSError, AudioContext> =>
  TE.tryCatch(
    () => new (window.AudioContext || window.webkitAudioContext)(),
    (error) => createTTSError('AUDIO_ERROR', 'Failed to create audio context', undefined, error)
  )

const decodeAudioBuffer = (arrayBuffer: ArrayBuffer): R.Reader<AudioContext, TE.TaskEither<TTSError, AudioBuffer>> =>
  (audioContext) => TE.tryCatch(
    () => audioContext.decodeAudioData(arrayBuffer),
    (error) => createTTSError('AUDIO_ERROR', 'Failed to decode audio', undefined, error)
  )

const playAudioBuffer = (audioBuffer: AudioBuffer): R.Reader<AudioContext, TE.TaskEither<TTSError, void>> =>
  (audioContext) => TE.tryCatch(
    () => {
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

// Pure synthesis function
const synthesizeAudioData = (config: ElevenLabsConfig) => (text: string): TE.TaskEither<TTSError, ArrayBuffer> =>
  TE.tryCatch(
    async () => {
      const response = await fetch(
        `${config.apiUrl}/api/voice/synthesize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            modelId: config.modelId || 'eleven_monolingual_v1',
            voiceSettings: config.voiceSettings || {
              stability: 0.5,
              similarityBoost: 0.75,
              style: 0.5,
              useSpeakerBoost: true
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
  )

/**
 * Hook for ElevenLabs Text-to-Speech functionality with caching and error handling.
 * 
 * This hook provides a functional programming approach to TTS using fp-ts patterns:
 * - Pure functions for validation and transformation
 * - TaskEither for async operations with error handling
 * - IndexedDB caching for performance optimization
 * - Automatic cleanup of audio resources
 * 
 * Features:
 * - Text synthesis with high-quality voice models
 * - Automatic caching with TTL and size limits
 * - Error handling for network, API, and audio issues
 * - Memory management and resource cleanup
 * - Support for preloading audio content
 * 
 * @param config - ElevenLabs configuration including API URL and voice settings
 * @returns TTS hook interface with state and control functions
 * 
 * @example
 * ```tsx
 * const tts = useElevenLabsTTS({
 *   apiUrl: 'https://api.elevenlabs.io',
 *   modelId: 'eleven_monolingual_v1',
 *   voiceSettings: {
 *     stability: 0.5,
 *     similarityBoost: 0.75
 *   }
 * })
 * 
 * // Speak text
 * const handleSpeak = async () => {
 *   const speakTask = tts.speak('Hello, dragon!')
 *   const result = await speakTask()()
 *   
 *   if (E.isLeft(result)) {
 *     console.error('TTS failed:', result.left.message)
 *   }
 * }
 * 
 * // Preload content
 * const preloadContent = async () => {
 *   const texts = ['Welcome', 'Loading', 'Complete']
 *   const preloadTask = tts.preloadAudio(texts)
 *   await preloadTask()()
 * }
 * 
 * // Check state
 * if (tts.isSpeaking) {
 *   // Show speaking indicator
 * }
 * 
 * if (tts.error) {
 *   // Handle error
 * }
 * ```
 */
export const useElevenLabsTTS = (config: ElevenLabsConfig) => {
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    cachedAudio: new Map()
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Pure synthesis with caching
  const synthesizeSpeech = useCallback(
    (text: string): TE.TaskEither<TTSError, ArrayBuffer> =>
      pipe(
        validateText(text),
        TE.fromEither,
        TE.chain(() => getCachedAudio(text)),
        TE.chain((cached) =>
          pipe(
            cached,
            O.fold(
              () =>
                pipe(
                  synthesizeAudioData(config)(text),
                  TE.chainFirst((buffer) => setCachedAudio(text, buffer))
                ),
              (buffer) => TE.right(buffer)
            )
          )
        )
      ),
    [config]
  )

  // Pure speak function with proper error handling
  const speak = useCallback(
    (text: string): TE.TaskEither<TTSError, void> =>
      pipe(
        TE.Do,
        TE.tap(() => {
          setState(prev => ({ ...prev, isLoading: true, error: null }))
          return TE.right(undefined)
        }),
        TE.chain(() => synthesizeSpeech(text)),
        TE.chain((arrayBuffer) =>
          pipe(
            createAudioContext(),
            TE.chain((audioContext) =>
              pipe(
                decodeAudioBuffer(arrayBuffer)(audioContext),
                TE.chain((audioBuffer) => {
                  setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
                  return playAudioBuffer(audioBuffer)(audioContext)
                })
              )
            )
          )
        ),
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

  // Pure preload function
  const preloadAudio = useCallback(
    (texts: readonly string[]): TE.TaskEither<TTSError, readonly void[]> =>
      pipe(
        texts,
        TE.traverseArray((text: string) =>
          pipe(
            synthesizeSpeech(text),
            TE.map(() => undefined as void)
          )
        )
      ),
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