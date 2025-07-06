/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'

import {
  useASCIIDragon,
  UseASCIIDragonOptions,
  asciiDragonReducer,
  ASCIIDragonPose,
  ASCIIDragonSize,
  ASCIIDragonSpeed,
  ASCIIDragonAction,
  createPoseTransition,
  createTypewriterSequence,
  getPoseRecommendation,
  getCharacterVariations
} from '../../../hooks/voice/useASCIIDragon'

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
    performanceScore: 80,
    isHighPerformance: true,
    shouldReduceQuality: false,
    shouldDisableAnimations: false
  }))
}))

// Mock RxJS timer for testing
jest.useFakeTimers()

describe('useASCIIDragon Hook', () => {
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
      const { result } = renderHook(() => useASCIIDragon())
      
      expect(result.current.pose).toBe('coiled')
      expect(result.current.size).toBe('lg')
      expect(result.current.speed).toBe('normal')
      expect(result.current.animationState).toBe('idle')
      expect(result.current.typewriter.isActive).toBe(false)
      expect(result.current.typewriter.isComplete).toBe(false)
    })

    it('should initialize with custom options', () => {
      const options: UseASCIIDragonOptions = {
        initialPose: 'flying',
        initialSize: 'xl',
        initialSpeed: 'fast',
        enableAutoTypewriter: false,
        enableVoiceIntegration: false
      }
      
      const { result } = renderHook(() => useASCIIDragon(options))
      
      expect(result.current.pose).toBe('flying')
      expect(result.current.size).toBe('xl')
      expect(result.current.speed).toBe('fast')
      expect(result.current.enableAutoTypewriter).toBe(false)
      expect(result.current.enableVoiceIntegration).toBe(false)
    })

    it('should have correct dragon pattern for pose and size', () => {
      const { result } = renderHook(() => useASCIIDragon({
        initialPose: 'coiled',
        initialSize: 'md'
      }))
      
      expect(result.current.dragonPattern).toBeDefined()
      expect(Array.isArray(result.current.dragonPattern)).toBe(true)
      expect(result.current.dragonPattern.length).toBeGreaterThan(0)
    })
  })

  describe('Pose Management', () => {
    it('should update pose correctly', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      await act(async () => {
        const setPoseResult = await result.current.setPose('flying')()
        expect(TE.isRight(setPoseResult)).toBe(true)
      })
      
      expect(result.current.pose).toBe('flying')
    })

    it('should handle all pose types', async () => {
      const poses: ASCIIDragonPose[] = ['coiled', 'flying', 'attacking', 'sleeping']
      const { result } = renderHook(() => useASCIIDragon())
      
      for (const pose of poses) {
        await act(async () => {
          const setPoseResult = await result.current.setPose(pose)()
          expect(TE.isRight(setPoseResult)).toBe(true)
        })
        
        expect(result.current.pose).toBe(pose)
      }
    })

    it('should trigger typewriter when pose changes and auto-typewriter is enabled', async () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableAutoTypewriter: true
      }))
      
      await act(async () => {
        await result.current.setPose('flying')()
      })
      
      // Should trigger typewriter after a short delay
      act(() => {
        jest.advanceTimersByTime(150)
      })
      
      expect(result.current.typewriter.isActive).toBe(true)
    })
  })

  describe('Size Management', () => {
    it('should update size correctly', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      await act(async () => {
        const setSizeResult = await result.current.setSize('xl')()
        expect(TE.isRight(setSizeResult)).toBe(true)
      })
      
      expect(result.current.size).toBe('xl')
    })

    it('should handle all size types', async () => {
      const sizes: ASCIIDragonSize[] = ['sm', 'md', 'lg', 'xl']
      const { result } = renderHook(() => useASCIIDragon())
      
      for (const size of sizes) {
        await act(async () => {
          const setSizeResult = await result.current.setSize(size)()
          expect(TE.isRight(setSizeResult)).toBe(true)
        })
        
        expect(result.current.size).toBe(size)
      }
    })

    it('should restart typewriter when size changes during active typewriter', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      // Start typewriter
      act(() => {
        result.current.startTypewriter()
      })
      
      expect(result.current.typewriter.isActive).toBe(true)
      
      // Change size while typewriter is active
      await act(async () => {
        await result.current.setSize('sm')()
      })
      
      expect(result.current.size).toBe('sm')
      expect(result.current.typewriter.isActive).toBe(true)
    })
  })

  describe('Speed Management', () => {
    it('should update speed correctly', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      await act(async () => {
        const setSpeedResult = await result.current.setSpeed('fast')()
        expect(TE.isRight(setSpeedResult)).toBe(true)
      })
      
      expect(result.current.speed).toBe('fast')
    })

    it('should handle all speed types', async () => {
      const speeds: ASCIIDragonSpeed[] = ['slow', 'normal', 'fast']
      const { result } = renderHook(() => useASCIIDragon())
      
      for (const speed of speeds) {
        await act(async () => {
          const setSpeedResult = await result.current.setSpeed(speed)()
          expect(TE.isRight(setSpeedResult)).toBe(true)
        })
        
        expect(result.current.speed).toBe(speed)
      }
    })

    it('should update animation config when speed changes', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      const originalTypewriterSpeed = result.current.animationConfig.typewriter.speed
      
      await act(async () => {
        await result.current.setSpeed('fast')()
      })
      
      expect(result.current.animationConfig.typewriter.speed).toBeLessThan(originalTypewriterSpeed)
    })
  })

  describe('Typewriter Animation', () => {
    it('should start typewriter animation', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      act(() => {
        result.current.startTypewriter()
      })
      
      expect(result.current.typewriter.isActive).toBe(true)
      expect(result.current.animationState).toBe('typing')
    })

    it('should advance typewriter animation over time', () => {
      const { result } = renderHook(() => useASCIIDragon({
        initialSize: 'sm', // Smaller for faster completion
        initialSpeed: 'fast'
      }))
      
      act(() => {
        result.current.startTypewriter()
      })
      
      expect(result.current.typewriter.isActive).toBe(true)
      
      // Advance typewriter animation
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.displayedLines.length).toBeGreaterThan(0)
    })

    it('should complete typewriter animation', () => {
      const { result } = renderHook(() => useASCIIDragon({
        initialSize: 'sm',
        initialSpeed: 'fast'
      }))
      
      act(() => {
        result.current.startTypewriter()
      })
      
      // Advance enough time for completion
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      expect(result.current.typewriter.isComplete).toBe(true)
      expect(result.current.typewriter.isActive).toBe(false)
      expect(result.current.animationState).toBe('idle')
    })

    it('should reset typewriter animation', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      act(() => {
        result.current.startTypewriter()
      })
      
      act(() => {
        jest.advanceTimersByTime(500)
      })
      
      expect(result.current.typewriter.isActive).toBe(true)
      
      act(() => {
        result.current.resetTypewriter()
      })
      
      expect(result.current.typewriter.isActive).toBe(false)
      expect(result.current.typewriter.displayedLines).toEqual([])
      expect(result.current.typewriter.currentLineIndex).toBe(0)
      expect(result.current.typewriter.currentCharIndex).toBe(0)
    })

    it('should not start typewriter when disabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        animationConfig: {
          typewriter: { enabled: false, speed: 100, cursor: true }
        }
      }))
      
      act(() => {
        result.current.startTypewriter()
      })
      
      expect(result.current.typewriter.isActive).toBe(false)
    })
  })

  describe('Breathing Animation', () => {
    it('should animate breathing when enabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableBreathing: true
      }))
      
      const initialIntensity = result.current.breathing.intensity
      
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      // Breathing intensity should change over time
      expect(result.current.breathing.intensity).toBeDefined()
      expect(typeof result.current.breathing.intensity).toBe('number')
    })

    it('should not animate breathing when disabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableBreathing: false
      }))
      
      const initialIntensity = result.current.breathing.intensity
      
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      // Should remain at initial value
      expect(result.current.breathing.intensity).toBe(initialIntensity)
    })

    it('should provide character intensity mapping', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableBreathing: true
      }))
      
      // Start typewriter to have displayed lines
      act(() => {
        result.current.startTypewriter()
      })
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.displayedLines).toBeDefined()
      expect(Array.isArray(result.current.displayedLines)).toBe(true)
    })
  })

  describe('Floating Animation', () => {
    it('should animate floating when enabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableFloating: true
      }))
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      const offset = result.current.getFloatingOffset()
      expect(typeof offset.x).toBe('number')
      expect(typeof offset.y).toBe('number')
      expect(typeof offset.rotation).toBe('number')
    })

    it('should not animate floating when disabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableFloating: false
      }))
      
      const initialOffset = result.current.getFloatingOffset()
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      const finalOffset = result.current.getFloatingOffset()
      expect(finalOffset).toEqual(initialOffset)
    })
  })

  describe('Voice Integration', () => {
    it('should handle voice listening events', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.pose).toBe('coiled')
      expect(result.current.voiceIntegration.isListening).toBe(true)
    })

    it('should handle voice speaking events', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      act(() => {
        result.current.onVoiceSpeakingStart('Hello world')
      })
      
      expect(result.current.pose).toBe('flying')
      expect(result.current.voiceIntegration.isSpeaking).toBe(true)
      expect(result.current.voiceIntegration.currentMessage).toBe('Hello world')
    })

    it('should handle voice processing events', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      act(() => {
        result.current.onVoiceProcessingStart()
      })
      
      expect(result.current.pose).toBe('attacking')
      expect(result.current.voiceIntegration.isProcessing).toBe(true)
    })

    it('should update transcript length', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      act(() => {
        result.current.onTranscriptUpdate('This is a test transcript')
      })
      
      expect(result.current.voiceIntegration.transcriptLength).toBe(25)
    })

    it('should change pose based on transcript length', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      // Short transcript
      act(() => {
        result.current.onTranscriptUpdate('Short')
      })
      expect(result.current.pose).toBe('coiled')
      
      // Medium transcript
      act(() => {
        result.current.onTranscriptUpdate('This is a medium length transcript that should trigger flying pose')
      })
      expect(result.current.pose).toBe('flying')
      
      // Long transcript
      act(() => {
        result.current.onTranscriptUpdate('This is a very long transcript that exceeds one hundred characters and should trigger the attacking pose for maximum dramatic effect')
      })
      expect(result.current.pose).toBe('attacking')
    })

    it('should ignore voice events when integration is disabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: false
      }))
      
      const initialPose = result.current.pose
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.pose).toBe(initialPose)
      expect(result.current.voiceIntegration.isListening).toBe(false)
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should handle keyboard shortcuts when enabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableKeyboardShortcuts: true
      }))
      
      // Simulate key press
      const keyEvent = new KeyboardEvent('keydown', { key: '2' })
      
      act(() => {
        window.dispatchEvent(keyEvent)
      })
      
      expect(result.current.pose).toBe('flying') // '2' maps to flying
    })

    it('should use custom keyboard shortcuts', () => {
      const customShortcuts = {
        'a': 'attacking' as ASCIIDragonPose,
        's': 'sleeping' as ASCIIDragonPose
      }
      
      const { result } = renderHook(() => useASCIIDragon({
        enableKeyboardShortcuts: true,
        keyboardShortcuts: customShortcuts
      }))
      
      const keyEvent = new KeyboardEvent('keydown', { key: 'a' })
      
      act(() => {
        window.dispatchEvent(keyEvent)
      })
      
      expect(result.current.pose).toBe('attacking')
    })

    it('should not handle keyboard shortcuts when disabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableKeyboardShortcuts: false
      }))
      
      const initialPose = result.current.pose
      const keyEvent = new KeyboardEvent('keydown', { key: '2' })
      
      act(() => {
        window.dispatchEvent(keyEvent)
      })
      
      expect(result.current.pose).toBe(initialPose)
    })
  })

  describe('Animation Configuration', () => {
    it('should update animation config correctly', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      const newConfig = {
        breathing: { enabled: false, speed: 2000, intensity: 0.8, characterMapping: false }
      }
      
      act(() => {
        result.current.updateAnimationConfig(newConfig)
      })
      
      expect(result.current.animationConfig.breathing.enabled).toBe(false)
      expect(result.current.animationConfig.breathing.speed).toBe(2000)
      expect(result.current.animationConfig.breathing.intensity).toBe(0.8)
      expect(result.current.animationConfig.breathing.characterMapping).toBe(false)
    })

    it('should merge config with existing values', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      const originalFloating = result.current.animationConfig.floating
      
      act(() => {
        result.current.updateAnimationConfig({
          breathing: { enabled: false, speed: 2000, intensity: 0.8, characterMapping: false }
        })
      })
      
      // Floating config should remain unchanged
      expect(result.current.animationConfig.floating).toEqual(originalFloating)
    })
  })

  describe('Functional Getters', () => {
    it('should provide correct functional getter results', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      expect(result.current.getCurrentPose()).toBe('coiled')
      expect(result.current.getCurrentSize()).toBe('lg')
      expect(result.current.getCurrentSpeed()).toBe('normal')
      expect(result.current.getAnimationState()).toBe('idle')
      expect(result.current.isTypewriterActive()).toBe(false)
      expect(result.current.isTypewriterComplete()).toBe(false)
      expect(result.current.isTransitioning()).toBe(false)
      expect(result.current.isVoiceActive()).toBe(false)
      expect(result.current.isAnimating()).toBe(false)
      expect(result.current.isIdle()).toBe(true)
    })

    it('should detect voice activity correctly', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true
      }))
      
      act(() => {
        result.current.onVoiceListeningStart()
      })
      
      expect(result.current.isVoiceActive()).toBe(true)
      
      act(() => {
        result.current.onVoiceListeningEnd()
      })
      
      expect(result.current.isVoiceActive()).toBe(false)
    })

    it('should detect animation activity correctly', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      act(() => {
        result.current.startTypewriter()
      })
      
      expect(result.current.isAnimating()).toBe(true)
      expect(result.current.isIdle()).toBe(false)
    })
  })

  describe('Performance Monitoring', () => {
    it('should initialize performance monitoring when enabled', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enablePerformanceMonitoring: true
      }))
      
      expect(result.current.performanceScore).toBe(80)
      expect(result.current.isHighPerformance).toBe(true)
    })

    it('should provide performance utility functions', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enablePerformanceMonitoring: true
      }))
      
      expect(typeof result.current.shouldReduceQuality).toBe('function')
      expect(typeof result.current.shouldDisableAnimations).toBe('function')
      expect(result.current.shouldReduceQuality()).toBe(false)
      expect(result.current.shouldDisableAnimations()).toBe(false)
    })
  })

  describe('Reactive Streams', () => {
    it('should provide reactive streams for state changes', () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      expect(result.current.dragonPose$).toBeDefined()
      expect(result.current.animationState$).toBeDefined()
      expect(result.current.voiceEvents$).toBeDefined()
      expect(result.current.typewriterProgress$).toBeDefined()
    })

    it('should emit pose changes through streams', async () => {
      const { result } = renderHook(() => useASCIIDragon())
      
      const poseValues: ASCIIDragonPose[] = []
      
      result.current.dragonPose$.subscribe(pose => {
        poseValues.push(pose)
      })
      
      await act(async () => {
        await result.current.setPose('flying')()
      })
      
      expect(poseValues).toContain('flying')
    })
  })

  describe('Memory Management', () => {
    it('should clean up timers and subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useASCIIDragon({
        enableBreathing: true,
        enableFloating: true,
        enableKeyboardShortcuts: true
      }))
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('should handle multiple mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = renderHook(() => useASCIIDragon({
          enableBreathing: true,
          enableFloating: true
        }))
        
        act(() => {
          jest.advanceTimersByTime(100)
        })
        
        expect(() => unmount()).not.toThrow()
      }
    })
  })

  describe('Property-based Tests', () => {
    it('should handle arbitrary pose, size, and speed combinations', () => {
      fc.assert(fc.property(
        fc.constantFrom('coiled', 'flying', 'attacking', 'sleeping'),
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('slow', 'normal', 'fast'),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (pose, size, speed, enableBreathing, enableFloating, enableVoice) => {
          const { result } = renderHook(() => useASCIIDragon({
            initialPose: pose,
            initialSize: size,
            initialSpeed: speed,
            enableBreathing,
            enableFloating,
            enableVoiceIntegration: enableVoice
          }))
          
          expect(result.current.pose).toBe(pose)
          expect(result.current.size).toBe(size)
          expect(result.current.speed).toBe(speed)
          expect(result.current.enableBreathing).toBe(enableBreathing)
          expect(result.current.enableFloating).toBe(enableFloating)
          expect(result.current.enableVoiceIntegration).toBe(enableVoice)
          
          return true
        }
      ), { numRuns: 30 })
    })

    it('should handle arbitrary animation configurations', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.integer({ min: 10, max: 200 }),
        fc.boolean(),
        fc.integer({ min: 1000, max: 10000 }),
        fc.float({ min: 0, max: 1 }),
        (typewriterEnabled, typewriterSpeed, breathingEnabled, breathingSpeed, breathingIntensity) => {
          const { result } = renderHook(() => useASCIIDragon({
            animationConfig: {
              typewriter: { enabled: typewriterEnabled, speed: typewriterSpeed, cursor: true },
              breathing: { enabled: breathingEnabled, speed: breathingSpeed, intensity: breathingIntensity, characterMapping: true }
            }
          }))
          
          expect(result.current.animationConfig.typewriter.enabled).toBe(typewriterEnabled)
          expect(result.current.animationConfig.typewriter.speed).toBe(typewriterSpeed)
          expect(result.current.animationConfig.breathing.enabled).toBe(breathingEnabled)
          expect(result.current.animationConfig.breathing.speed).toBe(breathingSpeed)
          expect(result.current.animationConfig.breathing.intensity).toBe(breathingIntensity)
          
          return true
        }
      ), { numRuns: 25 })
    })
  })
})

// Test the reducer separately
describe('asciiDragonReducer', () => {
  const initialState = {
    pose: 'coiled' as ASCIIDragonPose,
    size: 'lg' as ASCIIDragonSize,
    speed: 'normal' as ASCIIDragonSpeed,
    state: 'idle' as const,
    animationConfig: {
      typewriter: { enabled: true, speed: 100, cursor: true },
      breathing: { enabled: true, speed: 4000, intensity: 0.15, characterMapping: true },
      floating: { enabled: true, speed: 8000, amplitude: 10, rotationEnabled: true },
      transitions: { enabled: true, duration: 1000, easing: 'ease-in-out' },
      performance: { enabled: true, throttleMs: 16, maxFPS: 60 }
    },
    typewriter: {
      displayedLines: [],
      currentLineIndex: 0,
      currentCharIndex: 0,
      isComplete: false,
      isActive: false
    },
    breathing: { intensity: 1, phase: 0, lastUpdate: 0 },
    floating: { offsetY: 0, offsetX: 0, rotation: 0, lastUpdate: 0 },
    transitions: {
      isTransitioning: false,
      fromPose: O.none,
      toPose: O.none,
      progress: 0,
      startTime: 0
    },
    voiceIntegration: {
      reactToVoice: true,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcriptLength: 0,
      currentMessage: ''
    },
    performance: {
      fps: 60,
      shouldOptimize: false,
      animationFrameId: null,
      lastFrameTime: 0
    },
    keyboard: {
      enableShortcuts: true,
      shortcuts: { '1': 'coiled', '2': 'flying', '3': 'attacking', '4': 'sleeping' }
    }
  }

  it('should handle SET_POSE action', () => {
    const action: ASCIIDragonAction = { type: 'SET_POSE', payload: 'flying' }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState.pose).toBe('flying')
    expect(newState.state).toBe('transitioning')
    expect(newState.transitions.isTransitioning).toBe(true)
  })

  it('should not change state if pose is the same', () => {
    const action: ASCIIDragonAction = { type: 'SET_POSE', payload: 'coiled' }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState).toEqual(initialState)
  })

  it('should handle SET_SIZE action', () => {
    const action: ASCIIDragonAction = { type: 'SET_SIZE', payload: 'xl' }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState.size).toBe('xl')
  })

  it('should handle SET_SPEED action', () => {
    const action: ASCIIDragonAction = { type: 'SET_SPEED', payload: 'fast' }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState.speed).toBe('fast')
  })

  it('should handle TYPEWRITER_START action', () => {
    const action: ASCIIDragonAction = {
      type: 'TYPEWRITER_START',
      payload: { lines: ['line1', 'line2'], speed: 50 }
    }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState.state).toBe('typing')
    expect(newState.typewriter.isActive).toBe(true)
    expect(newState.typewriter.isComplete).toBe(false)
    expect(newState.typewriter.displayedLines).toEqual([])
    expect(newState.typewriter.currentLineIndex).toBe(0)
    expect(newState.typewriter.currentCharIndex).toBe(0)
  })

  it('should handle TYPEWRITER_COMPLETE action', () => {
    const stateWithActiveTypewriter = {
      ...initialState,
      state: 'typing' as const,
      typewriter: { ...initialState.typewriter, isActive: true }
    }
    
    const action: ASCIIDragonAction = { type: 'TYPEWRITER_COMPLETE' }
    const newState = asciiDragonReducer(stateWithActiveTypewriter, action)
    
    expect(newState.state).toBe('idle')
    expect(newState.typewriter.isActive).toBe(false)
    expect(newState.typewriter.isComplete).toBe(true)
  })

  it('should handle voice integration actions', () => {
    const listeningAction: ASCIIDragonAction = { type: 'VOICE_LISTENING_START' }
    const listeningState = asciiDragonReducer(initialState, listeningAction)
    
    expect(listeningState.pose).toBe('coiled')
    expect(listeningState.voiceIntegration.isListening).toBe(true)
    
    const speakingAction: ASCIIDragonAction = {
      type: 'VOICE_SPEAKING_START',
      payload: { message: 'Hello' }
    }
    const speakingState = asciiDragonReducer(initialState, speakingAction)
    
    expect(speakingState.pose).toBe('flying')
    expect(speakingState.voiceIntegration.isSpeaking).toBe(true)
    expect(speakingState.voiceIntegration.currentMessage).toBe('Hello')
  })

  it('should handle KEYBOARD_SHORTCUT action', () => {
    const action: ASCIIDragonAction = {
      type: 'KEYBOARD_SHORTCUT',
      payload: { pose: 'attacking' }
    }
    const newState = asciiDragonReducer(initialState, action)
    
    expect(newState.pose).toBe('attacking')
  })

  it('should handle unknown actions gracefully', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION', payload: 'test' } as any
    const newState = asciiDragonReducer(initialState, unknownAction)
    
    expect(newState).toEqual(initialState)
  })
})

// Test utility functions
describe('ASCIIDragon Utilities', () => {
  describe('createPoseTransition', () => {
    it('should create valid pose transition', () => {
      const transition = createPoseTransition('coiled', 'flying', 2000)
      
      expect(transition.fromPose).toBe('coiled')
      expect(transition.toPose).toBe('flying')
      expect(transition.duration).toBe(2000)
      expect(transition.easing).toBe('ease-in-out')
    })

    it('should use default duration when not specified', () => {
      const transition = createPoseTransition('coiled', 'flying')
      
      expect(transition.duration).toBe(1000)
    })
  })

  describe('createTypewriterSequence', () => {
    it('should create typewriter sequence task', async () => {
      const poses: ASCIIDragonPose[] = ['coiled', 'flying', 'attacking']
      const sequenceTask = createTypewriterSequence(poses, 'lg', 'normal', 500)
      
      expect(TE.isTaskEither(sequenceTask)).toBe(true)
      
      const result = await sequenceTask()
      expect(TE.isRight(result)).toBe(true)
    })
  })

  describe('getPoseRecommendation', () => {
    it('should recommend correct poses based on input', () => {
      expect(getPoseRecommendation(false, 0, false)).toBe('sleeping')
      expect(getPoseRecommendation(false, 0, true)).toBe('attacking')
      expect(getPoseRecommendation(true, 30, false)).toBe('coiled')
      expect(getPoseRecommendation(true, 60, false)).toBe('coiled')
      expect(getPoseRecommendation(true, 120, false)).toBe('flying')
    })
  })

  describe('getCharacterVariations', () => {
    it('should return character variations for known characters', () => {
      expect(getCharacterVariations('~')).toEqual(['·', '~', '≈', '∼'])
      expect(getCharacterVariations('|')).toEqual(['¦', '|', '‖', '║'])
      expect(getCharacterVariations('o')).toEqual(['·', 'o', 'O', '●'])
    })

    it('should return single character array for unknown characters', () => {
      expect(getCharacterVariations('x')).toEqual(['x'])
      expect(getCharacterVariations('!')).toEqual(['!'])
    })
  })
})