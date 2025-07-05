import { useEffect, useMemo, useRef, useReducer, useCallback } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { fromEvent, merge, Subject } from 'rxjs'
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators'

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
  switch (action.type) {
    case 'START_LISTENING':
      return {
        ...state,
        isListening: true,
        error: O.none
      }
    case 'STOP_LISTENING':
      return {
        ...state,
        isListening: false
      }
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        transcript: state.transcript + action.payload.transcript,
        interimTranscript: action.payload.interimTranscript
      }
    case 'SET_ERROR':
      return {
        ...state,
        isListening: false,
        error: O.some(action.payload)
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: O.none
      }
    case 'CLEAR_TRANSCRIPT':
      return {
        ...state,
        transcript: '',
        interimTranscript: ''
      }
    case 'SET_SUPPORT_STATUS':
      return {
        ...state,
        isSupported: action.payload
      }
    default:
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
): SpeechError => ({
  type,
  message,
  originalError
})

// Pure validation functions
const validateSpeechRecognition = (recognition: ISpeechRecognition | null): E.Either<SpeechError, ISpeechRecognition> =>
  recognition === null
    ? E.left(createSpeechError('NO_SUPPORT', 'Speech recognition is not supported in this browser'))
    : E.right(recognition)

const validateListeningState = (isListening: boolean, operation: 'start' | 'stop'): E.Either<SpeechError, boolean> => {
  if (operation === 'start' && isListening) {
    return E.left(createSpeechError('UNKNOWN', 'Already listening'))
  }
  if (operation === 'stop' && !isListening) {
    return E.left(createSpeechError('UNKNOWN', 'Not currently listening'))
  }
  return E.right(isListening)
}

// Pure transcript processing
const extractTranscript = (event: ISpeechRecognitionEvent): {
  transcript: string
  interimTranscript: string
} => {
  let transcript = ''
  let interimTranscript = ''

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result && result.length > 0) {
      if (result.isFinal) {
        transcript += result[0]?.transcript || ''
      } else {
        interimTranscript += result[0]?.transcript || ''
      }
    }
  }

  return { transcript, interimTranscript }
}

// Pure error mapping
const mapSpeechRecognitionError = (errorEvent: ISpeechRecognitionErrorEvent): SpeechError => {
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
const createResultStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) =>
  fromEvent<ISpeechRecognitionEvent>(recognition as any, 'result').pipe(
    takeUntil(stopSignal),
    map(extractTranscript),
    distinctUntilChanged(
      (a, b) => 
        a.transcript === b.transcript && 
        a.interimTranscript === b.interimTranscript
    )
  )

const createErrorStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) =>
  fromEvent<ISpeechRecognitionErrorEvent>(recognition as any, 'error').pipe(
    takeUntil(stopSignal),
    map((event) => mapSpeechRecognitionError(event))
  )

const createEndStream = (recognition: ISpeechRecognition, stopSignal: Subject<void>) =>
  fromEvent(recognition as any, 'end').pipe(
    takeUntil(stopSignal),
    map(() => 'END' as const)
  )

export const useSpeechRecognition = () => {
  const [state, dispatch] = useReducer(speechRecognitionReducer, initialSpeechState)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const stopSubject = useRef(new Subject<void>())

  // Pure recognition instance creation
  const recognition = useMemo(() => {
    if (typeof window === 'undefined') {
      dispatch({ type: 'SET_SUPPORT_STATUS', payload: false })
      return null
    }
    
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognitionAPI) {
      dispatch({ type: 'SET_SUPPORT_STATUS', payload: false })
      return null
    }

    const instance = new SpeechRecognitionAPI()
    const config = createSpeechRecognitionConfig()
    const configuredInstance = configureSpeechRecognition(config)(instance)
    
    dispatch({ type: 'SET_SUPPORT_STATUS', payload: true })
    return configuredInstance
  }, [])

  // Pure start listening function using TaskEither
  const startListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    return pipe(
      validateSpeechRecognition(recognition),
      TE.fromEither,
      TE.chain(() => TE.fromEither(validateListeningState(state.isListening, 'start'))),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            recognition!.start()
            dispatch({ type: 'START_LISTENING' })
          },
          (error) => createSpeechError('UNKNOWN', 'Failed to start', error)
        )
      )
    )
  }, [recognition, state.isListening])

  // Pure stop listening function using TaskEither
  const stopListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    return pipe(
      validateSpeechRecognition(recognition),
      TE.fromEither,
      TE.chain(() => TE.fromEither(validateListeningState(state.isListening, 'stop'))),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            recognition!.stop()
            stopSubject.current.next()
            dispatch({ type: 'STOP_LISTENING' })
          },
          (error) => createSpeechError('UNKNOWN', 'Failed to stop', error)
        )
      )
    )
  }, [recognition, state.isListening])

  const clearTranscript = useCallback(() => {
    dispatch({ type: 'CLEAR_TRANSCRIPT' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  useEffect(() => {
    if (!recognition) return

    recognitionRef.current = recognition

    // Pure reactive streams
    const result$ = createResultStream(recognition, stopSubject.current)
    const error$ = createErrorStream(recognition, stopSubject.current)
    const end$ = createEndStream(recognition, stopSubject.current)

    const subscription = merge(
      result$.pipe(
        map(({ transcript, interimTranscript }) => ({
          type: 'TRANSCRIPT' as const,
          payload: { transcript, interimTranscript }
        }))
      ),
      error$.pipe(map(error => ({ type: 'ERROR' as const, payload: error }))),
      end$.pipe(map(() => ({ type: 'END' as const })))
    ).subscribe(update => {
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
      subscription.unsubscribe()
    }
  }, [recognition, state.transcript])

  return {
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