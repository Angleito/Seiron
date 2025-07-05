// Voice state action creators using functional patterns
import * as O from 'fp-ts/Option'
import { SpeechError, SpeechRecognitionAction } from '../voice/useSpeechRecognition'
import { createActionCreator } from '../utils/stateUtils'

// Action creators with proper typing
export const voiceActions = {
  startListening: (): SpeechRecognitionAction => ({
    type: 'START_LISTENING'
  }),
  
  stopListening: (): SpeechRecognitionAction => ({
    type: 'STOP_LISTENING'
  }),
  
  setTranscript: (transcript: string, interimTranscript: string): SpeechRecognitionAction => ({
    type: 'SET_TRANSCRIPT',
    payload: { transcript, interimTranscript }
  }),
  
  setError: (error: SpeechError): SpeechRecognitionAction => ({
    type: 'SET_ERROR',
    payload: error
  }),
  
  clearError: (): SpeechRecognitionAction => ({
    type: 'CLEAR_ERROR'
  }),
  
  clearTranscript: (): SpeechRecognitionAction => ({
    type: 'CLEAR_TRANSCRIPT'
  }),
  
  setSupportStatus: (isSupported: boolean): SpeechRecognitionAction => ({
    type: 'SET_SUPPORT_STATUS',
    payload: isSupported
  })
}

// Action composition helpers
export const createTranscriptAction = (
  finalTranscript: string,
  interimTranscript?: string
) => voiceActions.setTranscript(finalTranscript, interimTranscript || '')

export const createErrorAction = (
  errorType: SpeechError['type'],
  message: string,
  originalError?: unknown
): SpeechRecognitionAction => {
  return voiceActions.setError({
    type: errorType,
    message,
    originalError
  })
}

// Functional command patterns
export const voiceCommandActions = {
  // Pattern-based action creators
  createCommandAction: (pattern: RegExp, handler: (match: RegExpMatchArray) => SpeechRecognitionAction) => 
    (transcript: string): O.Option<SpeechRecognitionAction> => {
      const match = transcript.match(pattern)
      return match ? O.some(handler(match)) : O.none
    },
    
  // Common voice commands
  clearCommand: /^(clear|reset|start over)$/i,
  stopCommand: /^(stop|pause|halt)$/i,
  startCommand: /^(start|begin|go)$/i
}

// Thunk-style action creators for async operations
export type VoiceThunkAction = (
  dispatch: (action: SpeechRecognitionAction) => void,
  getState: () => any
) => Promise<void>

export const voiceThunks = {
  initializeVoiceRecognition: (): VoiceThunkAction => 
    async (dispatch, getState) => {
      try {
        // Check browser support
        if (typeof window === 'undefined') {
          dispatch(voiceActions.setSupportStatus(false))
          return
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        
        if (!SpeechRecognition) {
          dispatch(voiceActions.setSupportStatus(false))
          dispatch(createErrorAction(
            'NO_SUPPORT',
            'Speech recognition is not supported in this browser'
          ))
          return
        }
        
        dispatch(voiceActions.setSupportStatus(true))
      } catch (error) {
        dispatch(createErrorAction(
          'UNKNOWN',
          'Failed to initialize voice recognition',
          error
        ))
      }
    },
    
  processVoiceInput: (transcript: string): VoiceThunkAction =>
    async (dispatch, getState) => {
      try {
        // Process and clean transcript
        const cleanedTranscript = transcript.trim().toLowerCase()
        
        if (!cleanedTranscript) {
          return
        }
        
        // Check for voice commands
        if (voiceCommandActions.clearCommand.test(cleanedTranscript)) {
          dispatch(voiceActions.clearTranscript())
          return
        }
        
        if (voiceCommandActions.stopCommand.test(cleanedTranscript)) {
          dispatch(voiceActions.stopListening())
          return
        }
        
        // Update transcript
        dispatch(voiceActions.setTranscript(cleanedTranscript, ''))
      } catch (error) {
        dispatch(createErrorAction(
          'UNKNOWN',
          'Failed to process voice input',
          error
        ))
      }
    }
}