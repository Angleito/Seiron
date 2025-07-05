import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { fromEvent, merge, Subject } from 'rxjs'
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onerror: (event: SpeechRecognitionErrorEvent) => void
    onresult: (event: SpeechRecognitionEvent) => void
    onstart: () => void
    onend: () => void
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList
    resultIndex: number
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
    readonly isFinal: boolean
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition
    new (): SpeechRecognition
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
  error: SpeechError | null
}

// Removed duplicate interface declaration

const createSpeechError = (
  type: SpeechError['type'],
  message: string,
  originalError?: unknown
): SpeechError => ({
  type,
  message,
  originalError
})

const extractTranscript = (event: SpeechRecognitionEvent): {
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

export const useSpeechRecognition = () => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const stopSubject = useRef(new Subject<void>())

  const recognition = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognitionAPI) return null

    const instance = new SpeechRecognitionAPI()
    instance.continuous = true
    instance.interimResults = true
    instance.lang = 'en-US'
    
    return instance
  }, [])

  const startListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    return pipe(
      TE.fromNullable(createSpeechError(
        'NO_SUPPORT',
        'Speech recognition is not supported in this browser'
      ))(recognition),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            if (state.isListening) {
              throw new Error('Already listening')
            }
            
            recognition!.start()
            setState(prev => ({ ...prev, isListening: true, error: null }))
          },
          (error) => createSpeechError('UNKNOWN', 'Failed to start', error)
        )
      )
    )
  }, [recognition, state.isListening])

  const stopListening = useCallback((): TE.TaskEither<SpeechError, void> => {
    return pipe(
      TE.fromNullable(createSpeechError(
        'NO_SUPPORT',
        'Speech recognition is not supported'
      ))(recognition),
      TE.chain(() =>
        TE.tryCatch(
          async () => {
            if (!state.isListening) {
              throw new Error('Not currently listening')
            }
            
            recognition!.stop()
            stopSubject.current.next()
            setState(prev => ({ ...prev, isListening: false }))
          },
          (error) => createSpeechError('UNKNOWN', 'Failed to stop', error)
        )
      )
    )
  }, [recognition, state.isListening])

  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: ''
    }))
  }, [])

  useEffect(() => {
    if (!recognition) return

    recognitionRef.current = recognition

    const result$ = fromEvent<SpeechRecognitionEvent>(
      recognition as any,
      'result'
    ).pipe(
      takeUntil(stopSubject.current),
      map(extractTranscript),
      distinctUntilChanged(
        (a, b) => 
          a.transcript === b.transcript && 
          a.interimTranscript === b.interimTranscript
      )
    )

    const error$ = fromEvent<Event>(recognition as any, 'error').pipe(
      takeUntil(stopSubject.current),
      map((event: any) => {
        const errorEvent = event as SpeechRecognitionErrorEvent
        
        switch (errorEvent.error) {
          case 'not-allowed':
            return createSpeechError(
              'PERMISSION_DENIED',
              'Microphone permission denied'
            )
          case 'network':
            return createSpeechError(
              'NETWORK',
              'Network error occurred'
            )
          default:
            return createSpeechError(
              'UNKNOWN',
              `Speech recognition error: ${errorEvent.error}`
            )
        }
      })
    )

    const end$ = fromEvent(recognition as any, 'end').pipe(
      takeUntil(stopSubject.current),
      map(() => ({ isListening: false }))
    )

    const subscription = merge(
      result$.pipe(
        map(({ transcript, interimTranscript }) => ({
          transcript: state.transcript + transcript,
          interimTranscript
        }))
      ),
      error$.pipe(map(error => ({ error }))),
      end$
    ).subscribe(updates => {
      setState(prev => ({ ...prev, ...updates }))
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
    isSupported: recognition !== null
  }
}

export const createSpeechCommand = (
  pattern: RegExp,
  handler: (match: RegExpMatchArray) => void
) => (transcript: string) => {
  const match = transcript.match(pattern)
  if (match) {
    handler(match)
    return true
  }
  return false
}