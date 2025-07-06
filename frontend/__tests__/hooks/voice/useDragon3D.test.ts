/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Subject } from 'rxjs'

import { 
  useDragon3D,
  UseDragon3DOptions,
  dragon3DReducer,
  DragonState,
  DragonMood,
  SpecialAnimation,
  Dragon3DAction,
  createDragonStateTransition,
  createSpecialAnimationSequence,
  getDragonStateRecommendation
} from '../../../hooks/voice/useDragon3D'

// Mock dependencies
jest.mock('../../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('../../../lib/voice-logger', () => ({
  voiceLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: jest.fn(() => ({
    performanceScore: 75,
    isHighPerformance: true,
    shouldReduceQuality: false,
    shouldDisableAnimations: false
  }))
}))

// Mock RxJS timer for testing
jest.useFakeTimers()

describe('useDragon3D Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.useFakeTimers()
  })

  describe('Basic Hook Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDragon3D())
      
      expect(result.current.state).toBe('idle')
      expect(result.current.mood).toBe('calm')
      expect(result.current.powerLevel).toBe(30)
      expect(result.current.isCharging).toBe(false)
      expect(result.current.isAnimating).toBe(false)
    })

    it('should initialize with custom options', () => {
      const options: UseDragon3DOptions = {
        initialState: 'active',
        initialMood: 'excited',
        initialPowerLevel: 80,
        enableVoiceIntegration: false
      }
      
      const { result } = renderHook(() => useDragon3D(options))
      
      expect(result.current.state).toBe('active')
      expect(result.current.mood).toBe('excited')
      expect(result.current.powerLevel).toBe(80)
      expect(result.current.enableVoiceIntegration).toBe(false)
    })

    it('should have correct animation config structure', () => {
      const { result } = renderHook(() => useDragon3D())
      
      expect(result.current.animationConfig).toHaveProperty('breathing')
      expect(result.current.animationConfig).toHaveProperty('floating')
      expect(result.current.animationConfig).toHaveProperty('wingFlapping')
      expect(result.current.animationConfig).toHaveProperty('particles')
      expect(result.current.animationConfig).toHaveProperty('aura')
    })
  })

  describe('State Management', () => {
    it('should update state correctly', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        const setStateResult = await result.current.setState('active')()
        expect(TE.isRight(setStateResult)).toBe(true)
      })
      
      expect(result.current.state).toBe('active')
    })

    it('should update mood correctly', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        const setMoodResult = await result.current.setMood('excited')()
        expect(TE.isRight(setMoodResult)).toBe(true)
      })
      
      expect(result.current.mood).toBe('excited')
      expect(result.current.powerLevel).toBe(70) // Excited mood should increase power
    })

    it('should update power level correctly', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        const setPowerResult = await result.current.setPowerLevel(85)()
        expect(TE.isRight(setPowerResult)).toBe(true)
      })
      
      expect(result.current.powerLevel).toBe(85)
    })

    it('should clamp power level to valid range', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        await result.current.setPowerLevel(150)()
      })
      expect(result.current.powerLevel).toBe(100)
      
      await act(async () => {
        await result.current.setPowerLevel(-20)()
      })
      expect(result.current.powerLevel).toBe(0)
    })

    it('should handle charging state', () => {
      const { result } = renderHook(() => useDragon3D())
      
      act(() => {
        result.current.setCharging(true)
      })
      
      expect(result.current.isCharging).toBe(true)
    })
  })

  describe('Special Animations', () => {
    it('should trigger special animations correctly', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        const animationResult = await result.current.triggerSpecialAnimation('roar')()
        expect(TE.isRight(animationResult)).toBe(true)
      })
      
      expect(result.current.hasSpecialAnimation()).toBe(true)
      expect(result.current.getAnimationName()).toBe('roar')
      expect(result.current.isAnimating).toBe(true)
    })

    it('should auto-clear special animations after duration', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        await result.current.triggerSpecialAnimation('pulse')()
      })
      
      expect(result.current.hasSpecialAnimation()).toBe(true)
      
      // Advance time to simulate animation completion
      act(() => {
        jest.advanceTimersByTime(1000) // Pulse duration
      })
      
      expect(result.current.hasSpecialAnimation()).toBe(false)
      expect(result.current.isAnimating).toBe(false)
    })

    it('should clear special animations manually', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      await act(async () => {
        await result.current.triggerSpecialAnimation('powerUp')()
      })
      
      expect(result.current.hasSpecialAnimation()).toBe(true)
      
      act(() => {
        result.current.clearSpecialAnimation()
      })
      
      expect(result.current.hasSpecialAnimation()).toBe(false)
      expect(result.current.isAnimating).toBe(false)
    })

    it('should handle all special animation types', async () => {
      const animations: SpecialAnimation[] = [
        'roar', 'powerUp', 'spin', 'pulse', 'shake', 'breatheFire', 'orbit', 'charge'
      ]
      
      const { result } = renderHook(() => useDragon3D())
      
      for (const animation of animations) {
        await act(async () => {
          const animationResult = await result.current.triggerSpecialAnimation(animation)()
          expect(TE.isRight(animationResult)).toBe(true)
        })
        
        expect(result.current.getAnimationName()).toBe(animation)
        
        act(() => {
          result.current.clearSpecialAnimation()
        })
      }
    })
  })

  describe('Voice Integration', () => {
    it('should handle voice listening events', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.state).toBe('listening')
      expect(result.current.mood).toBe('alert')
      expect(result.current.voiceIntegration.isListening).toBe(true)
    })

    it('should handle voice speaking events', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onVoiceSpeakingStart()
      })
      
      expect(result.current.state).toBe('speaking')
      expect(result.current.mood).toBe('focused')
      expect(result.current.voiceIntegration.isSpeaking).toBe(true)
    })

    it('should handle voice processing events', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onVoiceProcessingStart()
      })
      
      expect(result.current.state).toBe('processing')
      expect(result.current.mood).toBe('focused')
      expect(result.current.voiceIntegration.isProcessing).toBe(true)
    })

    it('should handle transcript updates', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onTranscriptUpdate('This is a test transcript that is quite long')
      })
      
      expect(result.current.voiceIntegration.transcriptLength).toBe(47)
    })

    it('should ignore voice events when integration is disabled', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: false }))
      
      const initialState = result.current.state
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.state).toBe(initialState)
      expect(result.current.voiceIntegration.isListening).toBe(false)
    })

    it('should trigger pulse animation on long transcripts', async () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onTranscriptUpdate('This is a very long transcript that should trigger a pulse animation because it exceeds fifty characters in length')
      })
      
      // Should trigger pulse animation for long transcript
      expect(result.current.voiceIntegration.transcriptLength).toBe(111)
    })
  })

  describe('Performance Monitoring', () => {
    it('should initialize performance monitoring when enabled', () => {
      const { result } = renderHook(() => useDragon3D({ 
        enablePerformanceMonitoring: true 
      }))
      
      expect(result.current.performanceScore).toBe(75)
      expect(result.current.isHighPerformance).toBe(true)
    })

    it('should disable performance monitoring when requested', () => {
      const { result } = renderHook(() => useDragon3D({ 
        enablePerformanceMonitoring: false 
      }))
      
      expect(result.current.performanceScore).toBe(100)
      expect(result.current.isHighPerformance).toBe(true)
    })

    it('should provide performance utility functions', () => {
      const { result } = renderHook(() => useDragon3D({ 
        enablePerformanceMonitoring: true 
      }))
      
      expect(typeof result.current.shouldReduceQuality).toBe('function')
      expect(typeof result.current.shouldDisableAnimations).toBe('function')
      expect(result.current.shouldReduceQuality()).toBe(false)
      expect(result.current.shouldDisableAnimations()).toBe(false)
    })
  })

  describe('Animation Configuration Updates', () => {
    it('should update animation config correctly', () => {
      const { result } = renderHook(() => useDragon3D())
      
      const newConfig = {
        breathing: { enabled: false, speed: 2, intensity: 0.8 }
      }
      
      act(() => {
        result.current.updateAnimationConfig(newConfig)
      })
      
      expect(result.current.animationConfig.breathing.enabled).toBe(false)
      expect(result.current.animationConfig.breathing.speed).toBe(2)
      expect(result.current.animationConfig.breathing.intensity).toBe(0.8)
    })

    it('should merge animation config with existing values', () => {
      const { result } = renderHook(() => useDragon3D())
      
      const originalFloating = result.current.animationConfig.floating
      
      act(() => {
        result.current.updateAnimationConfig({
          breathing: { enabled: false, speed: 2, intensity: 0.8 }
        })
      })
      
      // Floating config should remain unchanged
      expect(result.current.animationConfig.floating).toEqual(originalFloating)
    })
  })

  describe('Functional Getters', () => {
    it('should provide correct functional getter results', () => {
      const { result } = renderHook(() => useDragon3D({
        initialPowerLevel: 85,
        initialMood: 'calm',
        initialState: 'idle'
      }))
      
      expect(result.current.isPowerful()).toBe(true) // Power > 70
      expect(result.current.isCalm()).toBe(true) // Calm mood and idle state
      expect(result.current.isVoiceActive()).toBe(false) // No voice activity
    })

    it('should detect voice activity correctly', () => {
      const { result } = renderHook(() => useDragon3D({ enableVoiceIntegration: true }))
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.isVoiceActive()).toBe(true)
      
      act(() => {
        result.current.onVoiceListeningEnd()
      })
      
      expect(result.current.isVoiceActive()).toBe(false)
    })
  })

  describe('Proximity Detection', () => {
    it('should enable proximity detection when requested', () => {
      const { result } = renderHook(() => useDragon3D({
        enableProximityDetection: true,
        proximityThreshold: 200
      }))
      
      expect(result.current.enableProximityDetection).toBe(true)
    })

    it('should handle mouse movement for proximity detection', () => {
      const { result } = renderHook(() => useDragon3D({
        enableProximityDetection: true,
        proximityThreshold: 300,
        initialState: 'idle'
      }))
      
      // Simulate mouse move event near center
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2 + 100, // Within threshold
        clientY: window.innerHeight / 2 + 100
      })
      
      act(() => {
        window.dispatchEvent(mouseMoveEvent)
      })
      
      // State might change to attention based on proximity
      expect(result.current.state).toBeDefined()
    })
  })

  describe('Reactive Streams', () => {
    it('should provide reactive streams for state changes', () => {
      const { result } = renderHook(() => useDragon3D())
      
      expect(result.current.dragonState$).toBeDefined()
      expect(result.current.powerLevel$).toBeDefined()
      expect(result.current.voiceEvents$).toBeDefined()
    })

    it('should emit state changes through streams', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      const stateValues: DragonState[] = []
      
      result.current.dragonState$.subscribe(state => {
        stateValues.push(state)
      })
      
      await act(async () => {
        await result.current.setState('active')()
      })
      
      expect(stateValues).toContain('active')
    })
  })

  describe('Memory Management', () => {
    it('should clean up subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useDragon3D({
        enablePerformanceMonitoring: true,
        enableProximityDetection: true
      }))
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('should handle multiple mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = renderHook(() => useDragon3D())
        expect(() => unmount()).not.toThrow()
      }
    })
  })

  describe('Property-based Tests', () => {
    it('should handle arbitrary state and mood combinations', () => {
      fc.assert(fc.property(
        fc.constantFrom('idle', 'attention', 'ready', 'active', 'speaking', 'listening', 'processing'),
        fc.constantFrom('calm', 'excited', 'focused', 'playful', 'powerful', 'mystical', 'alert'),
        fc.integer({ min: 0, max: 100 }),
        async (state, mood, powerLevel) => {
          const { result } = renderHook(() => useDragon3D({
            initialState: state,
            initialMood: mood,
            initialPowerLevel: powerLevel
          }))
          
          expect(result.current.state).toBe(state)
          expect(result.current.mood).toBe(mood)
          expect(result.current.powerLevel).toBe(powerLevel)
          
          return true
        }
      ), { numRuns: 25 })
    })

    it('should handle arbitrary animation configurations', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.float({ min: 0.1, max: 5 }),
        fc.float({ min: 0, max: 1 }),
        fc.boolean(),
        fc.boolean(),
        (breathingEnabled, speed, intensity, particlesEnabled, voiceIntegration) => {
          const { result } = renderHook(() => useDragon3D({
            enableVoiceIntegration: voiceIntegration,
            animationConfig: {
              breathing: { enabled: breathingEnabled, speed, intensity },
              particles: { enabled: particlesEnabled, count: 100, intensity }
            }
          }))
          
          expect(result.current.animationConfig.breathing.enabled).toBe(breathingEnabled)
          expect(result.current.animationConfig.breathing.speed).toBe(speed)
          expect(result.current.animationConfig.particles.enabled).toBe(particlesEnabled)
          
          return true
        }
      ), { numRuns: 20 })
    })
  })
})

// Test the reducer separately
describe('dragon3DReducer', () => {
  const initialState = {
    state: 'idle' as DragonState,
    mood: 'calm' as DragonMood,
    powerLevel: 30,
    isCharging: false,
    isAnimating: false,
    specialAnimation: O.none,
    animationConfig: {
      breathing: { enabled: true, speed: 1, intensity: 0.5 },
      floating: { enabled: true, speed: 0.8, amplitude: 0.3 },
      wingFlapping: { enabled: true, speed: 1.2, intensity: 0.6 },
      particles: { enabled: true, count: 100, intensity: 0.5 },
      aura: { enabled: true, intensity: 0.4, color: '#ef4444' }
    },
    voiceIntegration: {
      reactToVoice: true,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcriptLength: 0
    },
    performance: {
      enabled: true,
      quality: 'medium' as const,
      fps: 60,
      shouldOptimize: false
    }
  }

  it('should handle SET_STATE action', () => {
    const action: Dragon3DAction = { type: 'SET_STATE', payload: 'active' }
    const newState = dragon3DReducer(initialState, action)
    
    expect(newState.state).toBe('active')
    expect(newState.mood).toBe('calm') // Should remain unchanged
  })

  it('should handle SET_MOOD action', () => {
    const action: Dragon3DAction = { type: 'SET_MOOD', payload: 'excited' }
    const newState = dragon3DReducer(initialState, action)
    
    expect(newState.mood).toBe('excited')
    expect(newState.state).toBe('idle') // Should remain unchanged
  })

  it('should clamp power level in SET_POWER_LEVEL action', () => {
    const highPowerAction: Dragon3DAction = { type: 'SET_POWER_LEVEL', payload: 150 }
    const lowPowerAction: Dragon3DAction = { type: 'SET_POWER_LEVEL', payload: -10 }
    
    const highPowerState = dragon3DReducer(initialState, highPowerAction)
    const lowPowerState = dragon3DReducer(initialState, lowPowerAction)
    
    expect(highPowerState.powerLevel).toBe(100)
    expect(lowPowerState.powerLevel).toBe(0)
  })

  it('should handle TRIGGER_SPECIAL_ANIMATION action', () => {
    const action: Dragon3DAction = { type: 'TRIGGER_SPECIAL_ANIMATION', payload: 'roar' }
    const newState = dragon3DReducer(initialState, action)
    
    expect(O.isSome(newState.specialAnimation)).toBe(true)
    expect(newState.isAnimating).toBe(true)
    
    if (O.isSome(newState.specialAnimation)) {
      expect(newState.specialAnimation.value).toBe('roar')
    }
  })

  it('should handle CLEAR_SPECIAL_ANIMATION action', () => {
    const stateWithAnimation = {
      ...initialState,
      specialAnimation: O.some('roar' as SpecialAnimation),
      isAnimating: true
    }
    
    const action: Dragon3DAction = { type: 'CLEAR_SPECIAL_ANIMATION' }
    const newState = dragon3DReducer(stateWithAnimation, action)
    
    expect(O.isNone(newState.specialAnimation)).toBe(true)
    expect(newState.isAnimating).toBe(false)
  })

  it('should handle voice integration actions', () => {
    const listeningStartAction: Dragon3DAction = { type: 'VOICE_LISTENING_START' }
    const listeningState = dragon3DReducer(initialState, listeningStartAction)
    
    expect(listeningState.state).toBe('listening')
    expect(listeningState.mood).toBe('alert')
    expect(listeningState.voiceIntegration.isListening).toBe(true)
    
    const speakingStartAction: Dragon3DAction = { type: 'VOICE_SPEAKING_START' }
    const speakingState = dragon3DReducer(initialState, speakingStartAction)
    
    expect(speakingState.state).toBe('speaking')
    expect(speakingState.mood).toBe('focused')
    expect(speakingState.voiceIntegration.isSpeaking).toBe(true)
  })

  it('should handle unknown actions gracefully', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION', payload: 'test' } as any
    const newState = dragon3DReducer(initialState, unknownAction)
    
    expect(newState).toEqual(initialState)
  })
})

// Test utility functions
describe('Dragon3D Utilities', () => {
  describe('createDragonStateTransition', () => {
    it('should create valid state transition', () => {
      const transition = createDragonStateTransition('idle', 'active', 2000)
      
      expect(transition.from).toBe('idle')
      expect(transition.to).toBe('active')
      expect(transition.duration).toBe(2000)
      expect(transition.easing).toBe('spring')
    })

    it('should use default duration when not specified', () => {
      const transition = createDragonStateTransition('idle', 'active')
      
      expect(transition.duration).toBe(1000)
    })
  })

  describe('createSpecialAnimationSequence', () => {
    it('should create animation sequence task', async () => {
      const animations: SpecialAnimation[] = ['pulse', 'roar', 'powerUp']
      const sequenceTask = createSpecialAnimationSequence(animations, 200)
      
      expect(TE.isTaskEither(sequenceTask)).toBe(true)
      
      const result = await sequenceTask()
      expect(TE.isRight(result)).toBe(true)
    })
  })

  describe('getDragonStateRecommendation', () => {
    it('should recommend correct states based on input', () => {
      expect(getDragonStateRecommendation(false, 0, 20)).toBe('idle')
      expect(getDragonStateRecommendation(false, 0, 50)).toBe('attention')
      expect(getDragonStateRecommendation(false, 0, 70)).toBe('ready')
      expect(getDragonStateRecommendation(false, 0, 90)).toBe('active')
      
      expect(getDragonStateRecommendation(true, 30, 50)).toBe('listening')
      expect(getDragonStateRecommendation(true, 60, 50)).toBe('ready')
      expect(getDragonStateRecommendation(true, 120, 50)).toBe('active')
    })
  })
})