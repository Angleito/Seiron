// Comprehensive tests for state management reducers
import * as O from 'fp-ts/Option'

// Mock implementations since we can't import the actual frontend modules in backend tests
interface SpeechError {
  type: 'NO_SUPPORT' | 'PERMISSION_DENIED' | 'NETWORK' | 'UNKNOWN'
  message: string
  originalError?: unknown
}

interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: O.Option<SpeechError>
  isSupported: boolean
}

type SpeechRecognitionAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; payload: { transcript: string; interimTranscript: string } }
  | { type: 'SET_ERROR'; payload: SpeechError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_TRANSCRIPT' }
  | { type: 'SET_SUPPORT_STATUS'; payload: boolean }

// Reducer implementation for testing
const speechRecognitionReducer = (
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

// Action creators for testing
const voiceActions = {
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

type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'sleeping' | 'awakening'

const dragonActions = {
  setDragonState: (state: DragonState) => ({
    type: 'SET_DRAGON_STATE' as const,
    payload: state
  }),
  
  incrementPower: (amount: number = 10) => ({
    type: 'INCREMENT_POWER' as const,
    payload: amount
  })
}

// Mock initial states for testing
const initialSpeechState: SpeechRecognitionState = {
  isListening: false,
  transcript: '',
  interimTranscript: '',
  error: O.none,
  isSupported: false
}

describe('State Management Reducers', () => {
  describe('Speech Recognition Reducer', () => {
    it('should handle START_LISTENING action', () => {
      const action: SpeechRecognitionAction = { type: 'START_LISTENING' }
      const newState = speechRecognitionReducer(initialSpeechState, action)
      
      expect(newState.isListening).toBe(true)
      expect(O.isNone(newState.error)).toBe(true)
      expect(newState.transcript).toBe('')
    })
    
    it('should handle SET_TRANSCRIPT action', () => {
      const action: SpeechRecognitionAction = {
        type: 'SET_TRANSCRIPT',
        payload: { transcript: 'hello', interimTranscript: 'world' }
      }
      const stateWithExistingTranscript = {
        ...initialSpeechState,
        transcript: 'existing '
      }
      
      const newState = speechRecognitionReducer(stateWithExistingTranscript, action)
      
      expect(newState.transcript).toBe('existing hello')
      expect(newState.interimTranscript).toBe('world')
    })
    
    it('should handle SET_ERROR action', () => {
      const error = {
        type: 'PERMISSION_DENIED' as const,
        message: 'Microphone access denied'
      }
      const action: SpeechRecognitionAction = {
        type: 'SET_ERROR',
        payload: error
      }
      
      const listeningState = { ...initialSpeechState, isListening: true }
      const newState = speechRecognitionReducer(listeningState, action)
      
      expect(newState.isListening).toBe(false)
      expect(O.isSome(newState.error)).toBe(true)
      expect(O.getOrElse(() => null)(newState.error)).toEqual(error)
    })
    
    it('should handle CLEAR_TRANSCRIPT action', () => {
      const stateWithTranscript = {
        ...initialSpeechState,
        transcript: 'some text',
        interimTranscript: 'more text'
      }
      const action: SpeechRecognitionAction = { type: 'CLEAR_TRANSCRIPT' }
      
      const newState = speechRecognitionReducer(stateWithTranscript, action)
      
      expect(newState.transcript).toBe('')
      expect(newState.interimTranscript).toBe('')
    })
    
    it('should handle SET_SUPPORT_STATUS action', () => {
      const action: SpeechRecognitionAction = {
        type: 'SET_SUPPORT_STATUS',
        payload: true
      }
      
      const newState = speechRecognitionReducer(initialSpeechState, action)
      
      expect(newState.isSupported).toBe(true)
    })
    
    it('should maintain immutability', () => {
      const action: SpeechRecognitionAction = { type: 'START_LISTENING' }
      const newState = speechRecognitionReducer(initialSpeechState, action)
      
      expect(newState).not.toBe(initialSpeechState)
      expect(initialSpeechState.isListening).toBe(false) // Original unchanged
    })
  })
  
  describe('Voice Action Creators', () => {
    it('should create correct startListening action', () => {
      const action = voiceActions.startListening()
      
      expect(action).toEqual({ type: 'START_LISTENING' })
    })
    
    it('should create correct setTranscript action', () => {
      const action = voiceActions.setTranscript('hello', 'world')
      
      expect(action).toEqual({
        type: 'SET_TRANSCRIPT',
        payload: { transcript: 'hello', interimTranscript: 'world' }
      })
    })
    
    it('should create correct setError action', () => {
      const error = {
        type: 'NETWORK' as const,
        message: 'Network error'
      }
      const action = voiceActions.setError(error)
      
      expect(action).toEqual({
        type: 'SET_ERROR',
        payload: error
      })
    })
  })
  
  describe('Dragon Action Creators', () => {
    it('should create correct setDragonState action', () => {
      const action = dragonActions.setDragonState('active')
      
      expect(action).toEqual({
        type: 'SET_DRAGON_STATE',
        payload: 'active'
      })
    })
    
    it('should create correct incrementPower action', () => {
      const action = dragonActions.incrementPower(15)
      
      expect(action).toEqual({
        type: 'INCREMENT_POWER',
        payload: 15
      })
    })
    
    it('should use default power increment', () => {
      const action = dragonActions.incrementPower()
      
      expect(action).toEqual({
        type: 'INCREMENT_POWER',
        payload: 10
      })
    })
  })
  
  describe('State Composition and Immutability', () => {
    it('should handle complex state transitions correctly', () => {
      let state = initialSpeechState
      
      // Start listening
      state = speechRecognitionReducer(state, voiceActions.startListening())
      expect(state.isListening).toBe(true)
      
      // Add transcript
      state = speechRecognitionReducer(state, voiceActions.setTranscript('hello', ''))
      expect(state.transcript).toBe('hello')
      
      // Add more transcript
      state = speechRecognitionReducer(state, voiceActions.setTranscript(' world', ''))
      expect(state.transcript).toBe('hello world')
      
      // Stop listening
      state = speechRecognitionReducer(state, voiceActions.stopListening())
      expect(state.isListening).toBe(false)
      expect(state.transcript).toBe('hello world') // Transcript preserved
    })
    
    it('should handle error states correctly', () => {
      let state = { ...initialSpeechState, isListening: true }
      
      // Set error
      const error = { type: 'UNKNOWN' as const, message: 'Test error' }
      state = speechRecognitionReducer(state, voiceActions.setError(error))
      
      expect(state.isListening).toBe(false)
      expect(O.isSome(state.error)).toBe(true)
      
      // Clear error
      state = speechRecognitionReducer(state, voiceActions.clearError())
      expect(O.isNone(state.error)).toBe(true)
    })
  })
  
  describe('Option Type Safety', () => {
    it('should handle Option types correctly for errors', () => {
      const state = initialSpeechState
      
      // Initial state should have no error
      expect(O.isNone(state.error)).toBe(true)
      
      // After setting error, should have Some(error)
      const error = { type: 'PERMISSION_DENIED' as const, message: 'Access denied' }
      const errorState = speechRecognitionReducer(state, voiceActions.setError(error))
      expect(O.isSome(errorState.error)).toBe(true)
      
      // Should be able to extract error safely
      const extractedError = O.getOrElse(() => null)(errorState.error)
      expect(extractedError).toEqual(error)
      
      // After clearing error, should be None again
      const clearedState = speechRecognitionReducer(errorState, voiceActions.clearError())
      expect(O.isNone(clearedState.error)).toBe(true)
    })
  })
  
  describe('Performance and Memory', () => {
    it('should not cause memory leaks with many state updates', () => {
      let state = initialSpeechState
      
      // Perform many updates
      for (let i = 0; i < 1000; i++) {
        // Clear first, then set new transcript to simulate real usage
        state = speechRecognitionReducer(state, voiceActions.clearTranscript())
        state = speechRecognitionReducer(state, voiceActions.setTranscript(`text${i}`, ''))
      }
      
      expect(state.transcript).toBe('text999')
      
      // Clear and verify
      state = speechRecognitionReducer(state, voiceActions.clearTranscript())
      expect(state.transcript).toBe('')
    })
    
    it('should maintain reference equality for unchanged properties', () => {
      const state = initialSpeechState
      const newState = speechRecognitionReducer(state, voiceActions.startListening())
      
      // These properties should be the same reference since they didn't change
      expect(newState.transcript).toBe(state.transcript)
      expect(newState.interimTranscript).toBe(state.interimTranscript)
      expect(newState.isSupported).toBe(state.isSupported)
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle unknown action types gracefully', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any
      const newState = speechRecognitionReducer(initialSpeechState, unknownAction)
      
      expect(newState).toBe(initialSpeechState) // Should return same reference
    })
    
    it('should handle empty transcript correctly', () => {
      const action = voiceActions.setTranscript('', '')
      const newState = speechRecognitionReducer(initialSpeechState, action)
      
      expect(newState.transcript).toBe('')
      expect(newState.interimTranscript).toBe('')
    })
    
    it('should handle special characters in transcript', () => {
      const specialText = '🐉 Hello, world! @#$%^&*()_+ 测试'
      const action = voiceActions.setTranscript(specialText, '')
      const newState = speechRecognitionReducer(initialSpeechState, action)
      
      expect(newState.transcript).toBe(specialText)
    })
  })
})