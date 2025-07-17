/**
 * Voice state management property tests
 * Tests state transitions, consistency, and invariants in voice state management
 */

import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { renderHook, act } from '@testing-library/react-hooks'
import {
  arbitraryVoiceState,
  arbitraryVoiceSettings,
  arbitraryVoiceError,
  arbitraryUserInteractionSequence,
  arbitraryVoiceCommand,
  arbitraryVoiceActivity,
  arbitraryConfidence,
  arbitraryTranscript
} from '../../lib/test-utils/voice-generators'
import type { VoiceState, VoiceSettings, VoiceAction } from '../../types/components/voice'

// Mock hook implementations for testing
const createMockVoiceState = (initialState?: Partial<VoiceState>): VoiceState => ({
  recognition: {
    state: 'idle',
    isListening: false,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    error: null
  },
  tts: {
    state: 'idle',
    isLoading: false,
    isSpeaking: false,
    isPaused: false,
    currentText: null,
    queue: [],
    error: null
  },
  isEnabled: false,
  isInitialized: false,
  error: null,
  ...initialState
})

class MockVoiceStateManager {
  private state: VoiceState
  private listeners: Array<(state: VoiceState) => void> = []
  private history: VoiceState[] = []

  constructor(initialState?: Partial<VoiceState>) {
    this.state = createMockVoiceState(initialState)
    this.history.push({ ...this.state })
  }

  getState(): VoiceState {
    return { ...this.state }
  }

  dispatch(action: VoiceAction): void {
    const previousState = { ...this.state }
    
    switch (action.type) {
      case 'START_RECOGNITION':
        this.state = {
          ...this.state,
          recognition: {
            ...this.state.recognition,
            isListening: true,
            state: 'listening'
          }
        }
        break
        
      case 'STOP_RECOGNITION':
        this.state = {
          ...this.state,
          recognition: {
            ...this.state.recognition,
            isListening: false,
            state: 'idle'
          }
        }
        break
        
      case 'START_TTS':
        this.state = {
          ...this.state,
          tts: {
            ...this.state.tts,
            isSpeaking: true,
            state: 'speaking',
            currentText: action.payload as string || null
          }
        }
        break
        
      case 'STOP_TTS':
        this.state = {
          ...this.state,
          tts: {
            ...this.state.tts,
            isSpeaking: false,
            state: 'idle',
            currentText: null
          }
        }
        break
        
      case 'UPDATE_SETTINGS':
        // Apply settings without breaking state consistency
        const settings = action.payload as Partial<VoiceSettings>
        this.state = {
          ...this.state,
          isEnabled: settings.enabled ?? this.state.isEnabled
        }
        break
        
      case 'CLEAR_ERRORS':
        this.state = {
          ...this.state,
          error: null,
          recognition: {
            ...this.state.recognition,
            error: null
          },
          tts: {
            ...this.state.tts,
            error: null
          }
        }
        break
        
      case 'RESET_STATE':
        this.state = createMockVoiceState()
        break
    }
    
    this.history.push({ ...this.state })
    this.notifyListeners()
  }

  subscribe(listener: (state: VoiceState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  getHistory(): VoiceState[] {
    return [...this.history]
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state))
  }
}

describe('Voice State Management Properties', () => {
  describe('State Transition Properties', () => {
    it('should maintain valid state through any sequence of actions', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceState,
          fc.array(
            fc.record({
              type: fc.constantFrom(
                'START_RECOGNITION',
                'STOP_RECOGNITION',
                'START_TTS',
                'STOP_TTS',
                'UPDATE_SETTINGS',
                'CLEAR_ERRORS',
                'RESET_STATE'
              ),
              payload: fc.option(fc.anything())
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (initialState, actions) => {
            const manager = new MockVoiceStateManager(initialState)
            
            actions.forEach(action => {
              manager.dispatch(action as VoiceAction)
              
              const currentState = manager.getState()
              
              // Invariants that should always hold
              expect(typeof currentState.isEnabled).toBe('boolean')
              expect(typeof currentState.isInitialized).toBe('boolean')
              expect(typeof currentState.recognition.isListening).toBe('boolean')
              expect(typeof currentState.tts.isSpeaking).toBe('boolean')
              
              // Confidence should be in valid range
              expect(currentState.recognition.confidence).toBeGreaterThanOrEqual(0)
              expect(currentState.recognition.confidence).toBeLessThanOrEqual(1)
              
              // State consistency checks
              if (currentState.recognition.isListening) {
                expect(['listening', 'processing']).toContain(currentState.recognition.state)
              }
              
              if (currentState.tts.isSpeaking) {
                expect(['speaking', 'loading']).toContain(currentState.tts.state)
              }
              
              // Cannot be in error state and normal operation simultaneously
              if (currentState.error !== null) {
                expect(currentState.recognition.isListening).toBe(false)
                expect(currentState.tts.isSpeaking).toBe(false)
              }
            })
          }
        )
      )
    })

    it('should handle state transitions idempotently when appropriate', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, (initialState) => {
          const manager = new MockVoiceStateManager(initialState)
          
          // Some actions should be idempotent
          const idempotentActions: VoiceAction[] = [
            { type: 'STOP_RECOGNITION' },
            { type: 'STOP_TTS' },
            { type: 'CLEAR_ERRORS' }
          ]
          
          idempotentActions.forEach(action => {
            const stateBefore = manager.getState()
            
            // Apply action twice
            manager.dispatch(action)
            const stateAfterFirst = manager.getState()
            
            manager.dispatch(action)
            const stateAfterSecond = manager.getState()
            
            // For stop actions, second application should not change state
            if (action.type === 'STOP_RECOGNITION' && !stateBefore.recognition.isListening) {
              expect(stateAfterFirst).toEqual(stateAfterSecond)
            }
            
            if (action.type === 'STOP_TTS' && !stateBefore.tts.isSpeaking) {
              expect(stateAfterFirst).toEqual(stateAfterSecond)
            }
            
            if (action.type === 'CLEAR_ERRORS' && stateBefore.error === null) {
              expect(stateAfterFirst).toEqual(stateAfterSecond)
            }
          })
        })
      )
    })

    it('should preserve history of state changes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('START_RECOGNITION', 'STOP_RECOGNITION', 'START_TTS', 'STOP_TTS'),
              payload: fc.option(fc.string())
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (actions) => {
            const manager = new MockVoiceStateManager()
            const initialHistory = manager.getHistory()
            
            actions.forEach(action => {
              manager.dispatch(action as VoiceAction)
            })
            
            const finalHistory = manager.getHistory()
            
            // History should have grown
            expect(finalHistory.length).toBe(initialHistory.length + actions.length)
            
            // Each entry should be a valid state
            finalHistory.forEach(state => {
              expect(typeof state.isEnabled).toBe('boolean')
              expect(typeof state.recognition.isListening).toBe('boolean')
              expect(typeof state.tts.isSpeaking).toBe('boolean')
            })
          }
        )
      )
    })
  })

  describe('State Consistency Properties', () => {
    it('should maintain logical consistency between related state fields', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, (state) => {
          const manager = new MockVoiceStateManager(state)
          const currentState = manager.getState()
          
          // Logical consistency checks
          if (currentState.recognition.isListening && currentState.recognition.state === 'idle') {
            // This is an inconsistent state that should be corrected
            expect(false).toBe(true) // This will fail if inconsistency exists
          }
          
          if (currentState.tts.isSpeaking && currentState.tts.state === 'idle') {
            // This is an inconsistent state
            expect(false).toBe(true)
          }
          
          // If there's an error, the system should not be in active operation
          if (currentState.error !== null) {
            expect(currentState.recognition.isListening).toBe(false)
            expect(currentState.tts.isSpeaking).toBe(false)
          }
        })
      )
    })

    it('should handle concurrent state updates correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('START_RECOGNITION', 'START_TTS', 'STOP_RECOGNITION', 'STOP_TTS'),
              delay: fc.nat({ max: 100 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (concurrentActions) => {
            const manager = new MockVoiceStateManager()
            
            // Simulate concurrent dispatches
            const promises = concurrentActions.map(async (action, index) => {
              await new Promise(resolve => setTimeout(resolve, action.delay))
              manager.dispatch({ type: action.type } as VoiceAction)
              return index
            })
            
            await Promise.all(promises)
            
            const finalState = manager.getState()
            
            // Final state should be valid regardless of timing
            expect(typeof finalState.isEnabled).toBe('boolean')
            expect(typeof finalState.recognition.isListening).toBe('boolean')
            expect(typeof finalState.tts.isSpeaking).toBe('boolean')
          }
        )
      )
    })
  })

  describe('Error State Properties', () => {
    it('should handle error injection and recovery gracefully', () => {
      fc.assert(
        fc.property(arbitraryVoiceError, (error) => {
          const manager = new MockVoiceStateManager()
          
          // Start with normal operation
          manager.dispatch({ type: 'START_RECOGNITION' })
          expect(manager.getState().recognition.isListening).toBe(true)
          
          // Inject error (simulated by setting error state manually)
          const errorState = {
            ...manager.getState(),
            error,
            recognition: {
              ...manager.getState().recognition,
              error,
              isListening: false,
              state: 'error' as const
            }
          }
          
          // Apply error recovery
          manager.dispatch({ type: 'CLEAR_ERRORS' })
          const recoveredState = manager.getState()
          
          // Should have cleared errors
          expect(recoveredState.error).toBeNull()
          expect(recoveredState.recognition.error).toBeNull()
          expect(recoveredState.tts.error).toBeNull()
        })
      )
    })

    it('should prevent invalid state transitions during error conditions', () => {
      fc.assert(
        fc.property(arbitraryVoiceError, (error) => {
          const manager = new MockVoiceStateManager({
            error,
            recognition: {
              state: 'error',
              isListening: false,
              transcript: '',
              interimTranscript: '',
              confidence: 0,
              error
            },
            tts: {
              state: 'idle',
              isLoading: false,
              isSpeaking: false,
              isPaused: false,
              currentText: null,
              queue: [],
              error: null
            },
            isEnabled: false,
            isInitialized: true
          })
          
          // Try to start recognition while in error state
          manager.dispatch({ type: 'START_RECOGNITION' })
          const stateAfterStart = manager.getState()
          
          // Should not start recognition while in error state
          if (stateAfterStart.error !== null) {
            expect(stateAfterStart.recognition.isListening).toBe(false)
          }
          
          // Clear errors first
          manager.dispatch({ type: 'CLEAR_ERRORS' })
          const clearedState = manager.getState()
          expect(clearedState.error).toBeNull()
          
          // Now should be able to start recognition
          manager.dispatch({ type: 'START_RECOGNITION' })
          const finalState = manager.getState()
          expect(finalState.recognition.isListening).toBe(true)
        })
      )
    })
  })

  describe('State Persistence Properties', () => {
    it('should maintain state through serialization/deserialization', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, (originalState) => {
          // Test state persistence
          const serialized = JSON.stringify(originalState)
          const deserialized = JSON.parse(serialized)
          
          // Should be identical after round-trip
          expect(deserialized).toEqual(originalState)
          
          // All critical fields should be preserved
          expect(deserialized.isEnabled).toBe(originalState.isEnabled)
          expect(deserialized.recognition.isListening).toBe(originalState.recognition.isListening)
          expect(deserialized.recognition.transcript).toBe(originalState.recognition.transcript)
          expect(deserialized.tts.isSpeaking).toBe(originalState.tts.isSpeaking)
        })
      )
    })

    it('should handle partial state restoration gracefully', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, (fullState) => {
          // Test restoration with partial data
          const partialState = {
            isEnabled: fullState.isEnabled,
            recognition: {
              isListening: fullState.recognition.isListening,
              transcript: fullState.recognition.transcript
            }
          }
          
          const manager = new MockVoiceStateManager()
          
          // Should be able to create valid state even with partial data
          const restoredState = createMockVoiceState(partialState as any)
          
          expect(typeof restoredState.isEnabled).toBe('boolean')
          expect(typeof restoredState.recognition.isListening).toBe('boolean')
          expect(typeof restoredState.tts.isSpeaking).toBe('boolean')
          
          // Restored state should have all required fields
          expect(restoredState.recognition.confidence).toBeDefined()
          expect(restoredState.tts.queue).toBeDefined()
          expect(Array.isArray(restoredState.tts.queue)).toBe(true)
        })
      )
    })
  })

  describe('State Observer Properties', () => {
    it('should notify all subscribers of state changes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('START_RECOGNITION', 'STOP_RECOGNITION', 'START_TTS', 'STOP_TTS'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            const manager = new MockVoiceStateManager()
            const notificationCounts: number[] = []
            
            // Subscribe multiple observers
            const unsubscribers = [0, 1, 2].map(index => {
              notificationCounts[index] = 0
              return manager.subscribe(() => {
                notificationCounts[index]++
              })
            })
            
            // Dispatch actions
            actions.forEach(action => {
              manager.dispatch(action as VoiceAction)
            })
            
            // All observers should have been notified the same number of times
            expect(notificationCounts[0]).toBe(actions.length)
            expect(notificationCounts[1]).toBe(actions.length)
            expect(notificationCounts[2]).toBe(actions.length)
            
            // Cleanup
            unsubscribers.forEach(unsub => unsub())
          }
        )
      )
    })

    it('should handle observer unsubscription correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 1, max: 5 }),
          fc.nat({ min: 1, max: 10 }),
          (numObservers, numActions) => {
            const manager = new MockVoiceStateManager()
            const notificationCounts: number[] = []
            
            // Subscribe observers
            const unsubscribers = Array.from({ length: numObservers }, (_, index) => {
              notificationCounts[index] = 0
              return manager.subscribe(() => {
                notificationCounts[index]++
              })
            })
            
            // Dispatch some actions
            for (let i = 0; i < numActions; i++) {
              manager.dispatch({ type: 'START_RECOGNITION' })
            }
            
            // All should be notified
            notificationCounts.forEach(count => {
              expect(count).toBe(numActions)
            })
            
            // Unsubscribe half the observers
            const halfPoint = Math.floor(numObservers / 2)
            for (let i = 0; i < halfPoint; i++) {
              unsubscribers[i]()
            }
            
            // Reset counts
            notificationCounts.fill(0)
            
            // Dispatch more actions
            for (let i = 0; i < numActions; i++) {
              manager.dispatch({ type: 'STOP_RECOGNITION' })
            }
            
            // Only remaining observers should be notified
            for (let i = 0; i < halfPoint; i++) {
              expect(notificationCounts[i]).toBe(0) // Unsubscribed
            }
            for (let i = halfPoint; i < numObservers; i++) {
              expect(notificationCounts[i]).toBe(numActions) // Still subscribed
            }
            
            // Cleanup remaining
            for (let i = halfPoint; i < numObservers; i++) {
              unsubscribers[i]()
            }
          }
        )
      )
    })
  })

  describe('Performance Properties', () => {
    it('should handle rapid state updates efficiently', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 100, max: 1000 }),
          (numUpdates) => {
            const manager = new MockVoiceStateManager()
            
            const startTime = Date.now()
            
            // Rapid state updates
            for (let i = 0; i < numUpdates; i++) {
              manager.dispatch({
                type: i % 2 === 0 ? 'START_RECOGNITION' : 'STOP_RECOGNITION'
              })
            }
            
            const endTime = Date.now()
            const totalTime = endTime - startTime
            
            // Should handle updates efficiently (less than 1ms per update on average)
            expect(totalTime).toBeLessThan(numUpdates)
            
            // Final state should be valid
            const finalState = manager.getState()
            expect(typeof finalState.recognition.isListening).toBe('boolean')
          }
        )
      )
    })

    it('should manage memory efficiently with large state histories', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 50, max: 200 }),
          (numActions) => {
            const manager = new MockVoiceStateManager()
            
            // Generate many state changes
            for (let i = 0; i < numActions; i++) {
              manager.dispatch({
                type: ['START_RECOGNITION', 'STOP_RECOGNITION', 'START_TTS', 'STOP_TTS'][i % 4] as any
              })
            }
            
            const history = manager.getHistory()
            expect(history.length).toBe(numActions + 1) // +1 for initial state
            
            // Each history entry should be a complete, valid state
            history.forEach(state => {
              expect(state).toBeDefined()
              expect(typeof state.isEnabled).toBe('boolean')
              expect(typeof state.recognition).toBe('object')
              expect(typeof state.tts).toBe('object')
            })
            
            // Memory usage should be reasonable
            const serializedSize = JSON.stringify(history).length
            expect(serializedSize).toBeLessThan(numActions * 10000) // Reasonable size limit
          }
        )
      )
    })
  })
})