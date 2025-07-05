import { useEffect, useMemo, useRef, useReducer, useCallback } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { fromEvent, merge, Subject } from 'rxjs'
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators'
import { logger } from '../../lib/logger'
import { voiceLogger, logSpeech, logEnvironment, logPerformance } from '../../lib/voice-logger'

// Import types from the centralized speech types file
import type { 
  SpeechRecognition as ISpeechRecognition,
  SpeechRecognitionEvent as ISpeechRecognitionEvent,
  SpeechRecognitionErrorEvent as ISpeechRecognitionErrorEvent,
  SpeechRecognitionResult
} from '../../types/api/speech'

// Extend Window interface for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: {
      new (): ISpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): ISpeechRecognition
    }
  }
}

export interface SpeechError {
  type: 'NO_SUPPORT' | 'PERMISSION_DENIED' | 'NETWORK' | 'UNKNOWN'
  message: string
  originalError?: unknown
}

export interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: O.Option<SpeechError>
  isSupported: boolean
}

// Action types for the reducer
export type SpeechRecognitionAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; payload: { transcript: string; interimTranscript: string } }
  | { type: 'SET_ERROR'; payload: SpeechError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_TRANSCRIPT' }
  | { type: 'SET_SUPPORT_STATUS'; payload: boolean }

// Speech Recognition Reducer (exported for testing)
export const speechRecognitionReducer = (
  state: SpeechRecognitionState,
  action: SpeechRecognitionAction
): SpeechRecognitionState => {
  logger.debug('🎤 Speech Recognition Action', {
    type: action.type,
    payload: action.type === 'SET_TRANSCRIPT' ? {
      transcriptLength: action.payload?.transcript?.length || 0,
      interimTranscriptLength: action.payload?.interimTranscript?.length || 0
    } : action.type === 'SET_ERROR' ? {
      errorType: action.payload?.type,
      errorMessage: action.payload?.message
    } : action.type === 'SET_SUPPORT_STATUS' ? {
      isSupported: action.payload
    } : 'none'
  })
  
  switch (action.type) {
    case 'START_LISTENING':
      logger.debug('🎤 Starting to listen')
      return {
        ...state,
        isListening: true,
        error: O.none
      }
    case 'STOP_LISTENING':
      logger.debug('🎤 Stopping listening')
      return {
        ...state,
        isListening: false
      }
    case 'SET_TRANSCRIPT':
      logger.debug('🎤 Setting transcript', {
        newTranscript: action.payload.transcript,
        interimTranscript: action.payload.interimTranscript,
        currentTranscriptLength: state.transcript.length,
        totalTranscriptLength: state.transcript.length + action.payload.transcript.length
      })
      return {
        ...state,
        transcript: state.transcript + action.payload.transcript,
        interimTranscript: action.payload.interimTranscript
      }
    case 'SET_ERROR':
      logger.error('🎤 Setting error state', {
        errorType: action.payload.type,
        errorMessage: action.payload.message
      })
      return {
        ...state,
        isListening: false,
        error: O.some(action.payload)
      }
    case 'CLEAR_ERROR':
      logger.debug('🎤 Clearing error state')
      return {
        ...state,
        error: O.none
      }
    case 'CLEAR_TRANSCRIPT':
      logger.debug('🎤 Clearing transcript')
      return {
        ...state,
        transcript: '',
        interimTranscript: ''
      }
    case 'SET_SUPPORT_STATUS':
      logger.debug('🎤 Setting support status', { isSupported: action.payload })
      return {
        ...state,
        isSupported: action.payload
      }
    default:
      logger.warn('🎤 Unknown action type', { type: (action as any).type })
      return state
  }
}

// Initial state
const initialSpeechState: SpeechRecognitionState = {
  isListening: false,
  transcript: '',
  interimTranscript: '',
  error: O.none,
  isSupported: false
}

const createSpeechError = (
  type: SpeechError['type'],
  message: string,
  originalError?: unknown
): SpeechError => {
  const error = {
    type,
    message,
    originalError
  }
  
  logger.error('🎤 Speech Recognition Error Created', {
    type,
    message,
    originalErrorType: originalError ? typeof originalError : 'none',
    originalErrorMessage: originalError instanceof Error ? originalError.message : originalError
  })
  
  return error
}

// Pure validation functions
const validateSpeechRecognition = (recognition: ISpeechRecognition | null): E.Either<SpeechError, ISpeechRecognition> => {
  if (recognition === null) {
    logger.error('🎤 Speech recognition validation failed - not supported')
    return E.left(createSpeechError('NO_SUPPORT', 'Speech recognition is not supported in this browser'))
  }
  
  logger.debug('🎤 Speech recognition validation successful')
  return E.right(recognition)
}

const validateListeningState = (isListening: boolean, operation: 'start' | 'stop'): E.Either<SpeechError, boolean> => {
  logger.debug('🎤 Validating listening state', { isListening, operation })
  
  if (operation === 'start' && isListening) {
    logger.warn('🎤 Cannot start - already listening')
    return E.left(createSpeechError('UNKNOWN', 'Already listening'))
  }
  if (operation === 'stop' && !isListening) {
    logger.warn('🎤 Cannot stop - not currently listening')
    return E.left(createSpeechError('UNKNOWN', 'Not currently listening'))
  }
  
  logger.debug('🎤 Listening state validation successful')
  return E.right(isListening)
}

// Pure transcript processing
const extractTranscript = (event: ISpeechRecognitionEvent): {
  transcript: string
  interimTranscript: string
} => {
  let transcript = ''
  let interimTranscript = ''
  
  logger.debug('🎤 Extracting transcript from event', {
    resultIndex: event.resultIndex,
    resultsLength: event.results.length
  })

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result && result.length > 0) {
      const resultText = result[0]?.transcript || ''
      const confidence = result[0]?.confidence || 0
      
      if (result.isFinal) {
        transcript += resultText
        logger.debug('🎤 Final transcript segment', {
          text: resultText,
          confidence,
          index: i
        })
      } else {
        interimTranscript += resultText
        logger.debug('🎤 Interim transcript segment', {
          text: resultText,
          confidence,
          index: i
        })
      }
    }
  }
  
  logger.debug('🎤 Transcript extraction complete', {
    finalTranscript: transcript,
    interimTranscript: interimTranscript
  })

  return { transcript, interimTranscript }
}

// Pure error mapping
const mapSpeechRecognitionError = (errorEvent: ISpeechRecognitionErrorEvent): SpeechError => {
  logger.error('🎤 Mapping speech recognition error', {
    error: errorEvent.error,
    message: errorEvent.message
  })
  
  switch (errorEvent.error) {
    case 'not-allowed':
      return createSpeechError('PERMISSION_DENIED', 'Microphone permission denied')
    case 'network':
      return createSpeechError('NETWORK', 'Network error occurred')
    default:
      return createSpeechError('UNKNOWN', `Speech recognition error: ${errorEvent.error}`)
  }
}

// Pure configuration functions
const createSpeechRecognitionConfig = (overrides: Partial<{
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
}> = {}) => ({
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  maxAlternatives: 1,
  ...overrides
})

const configureSpeechRecognition = (config: ReturnType<typeof createSpeechRecognitionConfig>) => 
  (recognition: ISpeechRecognition): ISpeechRecognition => {
    recognition.continuous = config.continuous
    recognition.interimResults = config.interimResults
    recognition.lang = config.lang
    if ('maxAlternatives' in recognition) {
      (recognition as ISpeechRecognition & { maxAlternatives?: number }).maxAlternatives = config.maxAlternatives
    }
    return recognition
  }

// Pure stream creation functions
const createResultStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) => {
  logger.debug('🎤 Creating result stream')
  return fromEvent<ISpeechRecognitionEvent>(recognition as any, 'result').pipe(
    takeUntil(stopSignal),
    map((event) => {
      logger.debug('🎤 Raw result event received', {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length
      })
      return extractTranscript(event)
    }),
    distinctUntilChanged(
      (a, b) => {
        const same = a.transcript === b.transcript && a.interimTranscript === b.interimTranscript
        if (!same) {
          logger.debug('🎤 Transcript changed', { previous: a, current: b })
        }
        return same
      }
    )
  )
}

const createErrorStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) => {
  logger.debug('🎤 Creating error stream')
  return fromEvent<ISpeechRecognitionErrorEvent>(recognition as any, 'error').pipe(
    takeUntil(stopSignal),
    map((event) => {
      logger.error('🎤 Raw error event received', {
        error: event.error,
        message: event.message
      })
      return mapSpeechRecognitionError(event)
    })
  )
}

const createEndStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) => {
  logger.debug('🎤 Creating end stream')
  return fromEvent(recognition as any, 'end').pipe(
    takeUntil(stopSignal),
    map(() => {
      logger.debug('🎤 Raw end event received')
      return 'END' as const
    })
  )
}

export const useSpeechRecognition = () => {
  logger.debug('🎤 Initializing speech recognition hook')
  
  // Enhanced voice logging
  logSpeech.init(true, { component: 'useSpeechRecognition' })
  
  const [state, dispatch] = useReducer(speechRecognitionReducer, initialSpeechState)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const stopSubject = useRef(new Subject<void>())
  
  // Log state changes
  useEffect(() => {
    logger.debug('🎤 Speech recognition state changed', {
      isListening: state.isListening,
      transcriptLength: state.transcript.length,
      interimTranscriptLength: state.interimTranscript.length,
      hasError: O.isSome(state.error),
      isSupported: state.isSupported
    })
  }, [state])

  // Pure recognition instance creation
  const recognition = useMemo(() => {
    logger.debug('🎤 Creating speech recognition instance')
    
    if (typeof window === 'undefined') {
      logger.warn('🎤 Window undefined - likely server-side rendering')
      dispatch({ type: 'SET_SUPPORT_STATUS', payload: false })
      return null
    }
    
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    logger.debug('🎤 Speech Recognition API availability', {
      SpeechRecognition: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      hasAPI: !!SpeechRecognitionAPI
    })
    
    if (!SpeechRecognitionAPI) {
      logger.error('🎤 Speech Recognition API not available')
      dispatch({ type: 'SET_SUPPORT_STATUS', payload: false })
      return null
    }

    const instance = new SpeechRecognitionAPI()
    const config = createSpeechRecognitionConfig()
    const configuredInstance = configureSpeechRecognition(config)(instance)
    
    logger.debug('🎤 Speech recognition instance created', {
      continuous: configuredInstance.continuous,
      interimResults: configuredInstance.interimResults,
      lang: configuredInstance.lang
    })
    
    dispatch({ type: 'SET_SUPPORT_STATUS', payload: true })
    return configuredInstance
  }, [])

  // Pure start listening function using TaskEither
  const startListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    logger.debug('🎤 Starting listening operation')
    
    return pipe(
      validateSpeechRecognition(recognition),
      TE.fromEither,
      TE.chain(() => TE.fromEither(validateListeningState(state.isListening, 'start'))),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            logger.debug('🎤 Requesting microphone permission and starting recognition')
            recognition!.start()
            dispatch({ type: 'START_LISTENING' })
            logger.debug('🎤 Speech recognition started successfully')
          },
          (error) => {
            logger.error('🎤 Failed to start speech recognition', {
              error: error instanceof Error ? error.message : String(error)
            })
            return createSpeechError('UNKNOWN', 'Failed to start', error)
          }
        )
      )
    )
  }, [recognition, state.isListening])

  // Pure stop listening function using TaskEither
  const stopListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    logger.debug('🎤 Stopping listening operation')
    
    return pipe(
      validateSpeechRecognition(recognition),
      TE.fromEither,
      TE.chain(() => TE.fromEither(validateListeningState(state.isListening, 'stop'))),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            logger.debug('🎤 Stopping speech recognition')
            recognition!.stop()
            stopSubject.current.next()
            dispatch({ type: 'STOP_LISTENING' })
            logger.debug('🎤 Speech recognition stopped successfully')
          },
          (error) => {
            logger.error('🎤 Failed to stop speech recognition', {
              error: error instanceof Error ? error.message : String(error)
            })
            return createSpeechError('UNKNOWN', 'Failed to stop', error)
          }
        )
      )
    )
  }, [recognition, state.isListening])

  const clearTranscript = useCallback(() => {
    logger.debug('🎤 Clearing transcript')
    dispatch({ type: 'CLEAR_TRANSCRIPT' })
  }, [])

  const clearError = useCallback(() => {
    logger.debug('🎤 Clearing error')
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  useEffect(() => {
    if (!recognition) {
      logger.debug('🎤 No recognition instance available for effect setup')
      return
    }

    logger.debug('🎤 Setting up speech recognition event streams')
    recognitionRef.current = recognition

    // Pure reactive streams
    const result$ = createResultStream(recognition, stopSubject.current)
    const error$ = createErrorStream(recognition, stopSubject.current)
    const end$ = createEndStream(recognition, stopSubject.current)

    const subscription = merge(
      result$.pipe(
        map(({ transcript, interimTranscript }) => {
          logger.debug('🎤 Result stream event', { transcript, interimTranscript })
          return {
            type: 'TRANSCRIPT' as const,
            payload: { transcript, interimTranscript }
          }
        })
      ),
      error$.pipe(map(error => {
        logger.error('🎤 Error stream event', { error })
        return { type: 'ERROR' as const, payload: error }
      })),
      end$.pipe(map(() => {
        logger.debug('🎤 End stream event')
        return { type: 'END' as const }
      }))
    ).subscribe(update => {
      logger.debug('🎤 Processing stream update', { type: update.type })
      switch (update.type) {
        case 'TRANSCRIPT':
          dispatch({ type: 'SET_TRANSCRIPT', payload: update.payload })
          break
        case 'ERROR':
          dispatch({ type: 'SET_ERROR', payload: update.payload })
          break
        case 'END':
          dispatch({ type: 'STOP_LISTENING' })
          break
      }
    })

    return () => {
      logger.debug('🎤 Cleaning up speech recognition streams')
      subscription.unsubscribe()
    }
  }, [recognition, state.transcript])

  const hookReturn = {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    clearError,
    isSupported: state.isSupported,
    // Functional getters using fp-ts Option
    getError: () => state.error,
    hasError: () => O.isSome(state.error),
    getErrorMessage: () => pipe(
      state.error,
      O.map(error => error.message),
      O.getOrElse(() => '')
    ),
    // Additional functional utilities
    getTranscriptWords: () => transcriptUtils.extractKeywords(state.transcript),
    getWordCount: () => transcriptUtils.calculateWordCount(state.transcript),
    getNormalizedTranscript: () => transcriptUtils.normalize(state.transcript),
    hasTranscript: () => state.transcript.length > 0
  }
  
  logger.debug('🎤 Speech recognition hook returning state', {
    isListening: hookReturn.isListening,
    isSupported: hookReturn.isSupported,
    hasTranscript: hookReturn.hasTranscript(),
    hasError: hookReturn.hasError()
  })
  
  return hookReturn
}

// Pure command creation and processing
export const createSpeechCommand = (
  pattern: RegExp,
  handler: (match: RegExpMatchArray) => void
) => (transcript: string): boolean => {
  const match = transcript.match(pattern)
  if (match) {
    handler(match)
    return true
  }
  return false
}

// Pure command matching using Option
export const matchSpeechCommand = (pattern: RegExp) => (transcript: string): O.Option<RegExpMatchArray> => {
  const match = transcript.match(pattern)
  return match ? O.some(match) : O.none
}

// Pure confidence scoring
export const calculateConfidence = (results: SpeechRecognitionResult[]): number => {
  if (results.length === 0) return 0
  
  const totalConfidence = results.reduce((sum, result) => {
    if (result.length > 0) {
      return sum + (result[0]?.confidence || 0)
    }
    return sum
  }, 0)
  
  return totalConfidence / results.length
}

// Pure transcript processing utilities
export const transcriptUtils = {
  normalize: (transcript: string): string => transcript.trim().toLowerCase(),
  
  extractKeywords: (transcript: string): string[] => 
    transcript.split(/\s+/).filter(word => word.length > 2),
  
  calculateWordCount: (transcript: string): number => 
    transcript.split(/\s+/).filter(word => word.length > 0).length,
  
  extractNumbers: (transcript: string): number[] => {
    const matches = transcript.match(/\d+/g)
    return matches ? matches.map(Number) : []
  },
  
  removeFiller: (transcript: string): string => 
    transcript.replace(/\b(um|uh|like|you know)\b/gi, '').replace(/\s+/g, ' ').trim(),
  
  capitalizeFirst: (transcript: string): string => 
    transcript.charAt(0).toUpperCase() + transcript.slice(1)
}

// Pure command pattern builders
export const commandPatterns = {
  simpleCommand: (command: string) => new RegExp(`\\b${command}\\b`, 'i'),
  
  withParameter: (command: string, paramType: 'number' | 'word' | 'any' = 'any') => {
    const patterns = {
      number: '(\\d+)',
      word: '(\\w+)',
      any: '(.+)'
    }
    return new RegExp(`\\b${command}\\s+${patterns[paramType]}`, 'i')
  },
  
  optional: (command: string, optionalPart: string) => 
    new RegExp(`\\b${command}(?:\\s+${optionalPart})?\\b`, 'i'),
  
  alternatives: (...commands: string[]) => 
    new RegExp(`\\b(${commands.join('|')})\\b`, 'i')
}