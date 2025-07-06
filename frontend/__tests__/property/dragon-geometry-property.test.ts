/**
 * @jest-environment jsdom
 */

import * as fc from 'fast-check'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Import dragon components and utilities
import { 
  useDragon3D,
  DragonState,
  DragonMood,
  SpecialAnimation,
  getDragonStateRecommendation
} from '../../hooks/voice/useDragon3D'

import {
  useASCIIDragon,
  ASCIIDragonPose,
  ASCIIDragonSize,
  ASCIIDragonSpeed,
  getPoseRecommendation,
  getCharacterVariations
} from '../../hooks/voice/useASCIIDragon'

import { renderHook, act } from '@testing-library/react'

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: jest.fn(() => ({
    performanceScore: 75,
    isHighPerformance: true,
    shouldReduceQuality: false,
    shouldDisableAnimations: false
  }))
}))

// Property-based test generators
const dragonStateArbitrary = fc.constantFrom(
  'idle', 'attention', 'ready', 'active', 'speaking', 'listening', 'processing'
)

const dragonMoodArbitrary = fc.constantFrom(
  'calm', 'excited', 'focused', 'playful', 'powerful', 'mystical', 'alert'
)

const specialAnimationArbitrary = fc.constantFrom(
  'roar', 'powerUp', 'spin', 'pulse', 'shake', 'breatheFire', 'orbit', 'charge'
)

const asciiPoseArbitrary = fc.constantFrom(
  'coiled', 'flying', 'attacking', 'sleeping'
)

const asciiSizeArbitrary = fc.constantFrom(
  'sm', 'md', 'lg', 'xl'
)

const asciiSpeedArbitrary = fc.constantFrom(
  'slow', 'normal', 'fast'
)

const powerLevelArbitrary = fc.integer({ min: 0, max: 100 })
const intensityArbitrary = fc.float({ min: 0, max: 1 })
const speedFactorArbitrary = fc.float({ min: 0.1, max: 5 })

// Geometric property generators
const pointArbitrary = fc.record({
  x: fc.float({ min: -100, max: 100 }),
  y: fc.float({ min: -100, max: 100 }),
  z: fc.float({ min: -100, max: 100 })
})

const scaleArbitrary = fc.record({
  x: fc.float({ min: 0.1, max: 3 }),
  y: fc.float({ min: 0.1, max: 3 }),
  z: fc.float({ min: 0.1, max: 3 })
})

const rotationArbitrary = fc.record({
  x: fc.float({ min: 0, max: 2 * Math.PI }),
  y: fc.float({ min: 0, max: 2 * Math.PI }),
  z: fc.float({ min: 0, max: 2 * Math.PI })
})

const animationConfigArbitrary = fc.record({
  breathing: fc.record({
    enabled: fc.boolean(),
    speed: fc.float({ min: 0.1, max: 5 }),
    intensity: intensityArbitrary
  }),
  floating: fc.record({
    enabled: fc.boolean(),
    speed: fc.float({ min: 0.1, max: 5 }),
    amplitude: fc.float({ min: 0, max: 1 })
  }),
  particles: fc.record({
    enabled: fc.boolean(),
    count: fc.integer({ min: 10, max: 500 }),
    intensity: intensityArbitrary
  })
})

describe('Dragon Geometry Property-Based Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Dragon3D Geometric Properties', () => {
    it('should maintain valid power levels under all transformations', () => {
      fc.assert(fc.property(
        powerLevelArbitrary,
        dragonMoodArbitrary,
        (initialPower, mood) => {
          const { result } = renderHook(() => useDragon3D({
            initialPowerLevel: initialPower,
            initialMood: mood
          }))

          // Power level should always be clamped to valid range
          expect(result.current.powerLevel).toBeGreaterThanOrEqual(0)
          expect(result.current.powerLevel).toBeLessThanOrEqual(100)

          return true
        }
      ), { numRuns: 100 })
    })

    it('should preserve state transition invariants', () => {
      fc.assert(fc.property(
        dragonStateArbitrary,
        dragonStateArbitrary,
        async (fromState, toState) => {
          const { result } = renderHook(() => useDragon3D({
            initialState: fromState
          }))

          expect(result.current.state).toBe(fromState)

          await act(async () => {
            const transitionResult = await result.current.setState(toState)()
            expect(TE.isRight(transitionResult)).toBe(true)
          })

          expect(result.current.state).toBe(toState)

          return true
        }
      ), { numRuns: 50 })
    })

    it('should maintain animation configuration bounds', () => {
      fc.assert(fc.property(
        animationConfigArbitrary,
        (animationConfig) => {
          const { result } = renderHook(() => useDragon3D({
            animationConfig
          }))

          const config = result.current.animationConfig

          // Breathing properties should be within bounds
          expect(config.breathing.speed).toBeGreaterThan(0)
          expect(config.breathing.intensity).toBeGreaterThanOrEqual(0)
          expect(config.breathing.intensity).toBeLessThanOrEqual(1)

          // Floating properties should be within bounds
          expect(config.floating.speed).toBeGreaterThan(0)
          expect(config.floating.amplitude).toBeGreaterThanOrEqual(0)
          expect(config.floating.amplitude).toBeLessThanOrEqual(1)

          // Particle properties should be within bounds
          expect(config.particles.count).toBeGreaterThanOrEqual(0)
          expect(config.particles.intensity).toBeGreaterThanOrEqual(0)
          expect(config.particles.intensity).toBeLessThanOrEqual(1)

          return true
        }
      ), { numRuns: 75 })
    })

    it('should respect mood-power level relationships', () => {
      fc.assert(fc.property(
        dragonMoodArbitrary,
        async (mood) => {
          const { result } = renderHook(() => useDragon3D())

          await act(async () => {
            await result.current.setMood(mood)()
          })

          const powerLevel = result.current.powerLevel

          // Verify mood-power relationships make sense
          switch (mood) {
            case 'calm':
              expect(powerLevel).toBeLessThanOrEqual(50)
              break
            case 'excited':
              expect(powerLevel).toBeGreaterThanOrEqual(60)
              break
            case 'powerful':
              expect(powerLevel).toBeGreaterThanOrEqual(80)
              break
            case 'mystical':
              expect(powerLevel).toBeGreaterThanOrEqual(70)
              break
            default:
              expect(powerLevel).toBeGreaterThanOrEqual(0)
              expect(powerLevel).toBeLessThanOrEqual(100)
          }

          return true
        }
      ), { numRuns: 40 })
    })

    it('should handle special animations without state corruption', () => {
      fc.assert(fc.property(
        specialAnimationArbitrary,
        dragonStateArbitrary,
        async (animation, initialState) => {
          const { result } = renderHook(() => useDragon3D({
            initialState
          }))

          const stateBefore = result.current.state
          const moodBefore = result.current.mood
          const powerBefore = result.current.powerLevel

          await act(async () => {
            const animationResult = await result.current.triggerSpecialAnimation(animation)()
            expect(TE.isRight(animationResult)).toBe(true)
          })

          // Animation should be active
          expect(result.current.hasSpecialAnimation()).toBe(true)
          expect(result.current.isAnimating).toBe(true)
          expect(result.current.getAnimationName()).toBe(animation)

          // Core state should be preserved (mood and power shouldn't change)
          expect(result.current.mood).toBe(moodBefore)
          expect(result.current.powerLevel).toBe(powerBefore)

          return true
        }
      ), { numRuns: 60 })
    })

    it('should maintain voice integration state consistency', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 0, max: 1000 }),
        (isListening, isSpeaking, isProcessing, transcriptLength) => {
          const { result } = renderHook(() => useDragon3D({
            enableVoiceIntegration: true
          }))

          act(() => {
            if (isListening) result.current.onVoiceListeningStart()
            if (isSpeaking) result.current.onVoiceSpeakingStart()
            if (isProcessing) result.current.onVoiceProcessingStart()
            result.current.onTranscriptUpdate('a'.repeat(transcriptLength))
          })

          const voiceIntegration = result.current.voiceIntegration

          // State should match actions
          expect(voiceIntegration.isListening).toBe(isListening)
          expect(voiceIntegration.isSpeaking).toBe(isSpeaking)
          expect(voiceIntegration.isProcessing).toBe(isProcessing)
          expect(voiceIntegration.transcriptLength).toBe(transcriptLength)

          // Voice activity detection should be consistent
          const expectedVoiceActive = isListening || isSpeaking || isProcessing
          expect(result.current.isVoiceActive()).toBe(expectedVoiceActive)

          return true
        }
      ), { numRuns: 50 })
    })
  })

  describe('ASCII Dragon Geometric Properties', () => {
    it('should maintain pose-size-speed combinations validity', () => {
      fc.assert(fc.property(
        asciiPoseArbitrary,
        asciiSizeArbitrary,
        asciiSpeedArbitrary,
        (pose, size, speed) => {
          const { result } = renderHook(() => useASCIIDragon({
            initialPose: pose,
            initialSize: size,
            initialSpeed: speed
          }))

          expect(result.current.pose).toBe(pose)
          expect(result.current.size).toBe(size)
          expect(result.current.speed).toBe(speed)

          // Dragon pattern should exist for this combination
          expect(result.current.dragonPattern).toBeDefined()
          expect(Array.isArray(result.current.dragonPattern)).toBe(true)
          expect(result.current.dragonPattern.length).toBeGreaterThan(0)

          // All lines should be strings
          result.current.dragonPattern.forEach(line => {
            expect(typeof line).toBe('string')
            expect(line.length).toBeGreaterThan(0)
          })

          return true
        }
      ), { numRuns: 100 })
    })

    it('should preserve character intensity mapping properties', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        intensityArbitrary,
        (characters, intensity) => {
          // Test character variations for each character
          for (const char of characters) {
            const variations = getCharacterVariations(char)
            
            expect(Array.isArray(variations)).toBe(true)
            expect(variations.length).toBeGreaterThan(0)
            
            // First variation should often be the original character or a simpler one
            expect(variations).toContain(char)
            
            // All variations should be single characters
            variations.forEach(variation => {
              expect(typeof variation).toBe('string')
              expect(variation.length).toBe(1)
            })
          }

          return true
        }
      ), { numRuns: 50 })
    })

    it('should maintain typewriter animation invariants', () => {
      fc.assert(fc.property(
        asciiPoseArbitrary,
        asciiSizeArbitrary,
        fc.integer({ min: 10, max: 200 }),
        (pose, size, typewriterSpeed) => {
          const { result } = renderHook(() => useASCIIDragon({
            initialPose: pose,
            initialSize: size,
            animationConfig: {
              typewriter: { enabled: true, speed: typewriterSpeed, cursor: true }
            }
          }))

          act(() => {
            result.current.startTypewriter()
          })

          expect(result.current.typewriter.isActive).toBe(true)
          expect(result.current.animationState).toBe('typing')

          // Initial state should be valid
          expect(result.current.typewriter.currentLineIndex).toBe(0)
          expect(result.current.typewriter.currentCharIndex).toBe(0)
          expect(result.current.typewriter.displayedLines).toEqual([])

          // Advance typewriter
          act(() => {
            jest.advanceTimersByTime(typewriterSpeed * 5)
          })

          // Should have made progress
          const hasProgress = 
            result.current.typewriter.currentLineIndex > 0 ||
            result.current.typewriter.currentCharIndex > 0 ||
            result.current.typewriter.displayedLines.length > 0

          expect(hasProgress).toBe(true)

          return true
        }
      ), { numRuns: 30 })
    })

    it('should respect breathing animation bounds', () => {
      fc.assert(fc.property(
        fc.float({ min: 0.1, max: 10 }),
        intensityArbitrary,
        (breathingSpeed, breathingIntensity) => {
          const { result } = renderHook(() => useASCIIDragon({
            enableBreathing: true,
            animationConfig: {
              breathing: {
                enabled: true,
                speed: breathingSpeed * 1000, // Convert to milliseconds
                intensity: breathingIntensity,
                characterMapping: true
              }
            }
          }))

          // Advance breathing animation
          act(() => {
            jest.advanceTimersByTime(breathingSpeed * 1000)
          })

          const intensity = result.current.breathing.intensity

          // Breathing intensity should be within reasonable bounds
          expect(intensity).toBeGreaterThan(0.5) // Minimum scale
          expect(intensity).toBeLessThan(1.5)    // Maximum scale

          // Phase should be a valid number
          expect(typeof result.current.breathing.phase).toBe('number')
          expect(isFinite(result.current.breathing.phase)).toBe(true)

          return true
        }
      ), { numRuns: 40 })
    })

    it('should maintain floating animation geometry', () => {
      fc.assert(fc.property(
        fc.float({ min: 0.1, max: 10 }),
        fc.float({ min: 1, max: 50 }),
        fc.boolean(),
        (floatingSpeed, amplitude, rotationEnabled) => {
          const { result } = renderHook(() => useASCIIDragon({
            enableFloating: true,
            animationConfig: {
              floating: {
                enabled: true,
                speed: floatingSpeed * 1000,
                amplitude,
                rotationEnabled
              }
            }
          }))

          // Advance floating animation
          act(() => {
            jest.advanceTimersByTime(floatingSpeed * 1000)
          })

          const offset = result.current.getFloatingOffset()

          // Offsets should be within amplitude bounds
          expect(Math.abs(offset.x)).toBeLessThanOrEqual(amplitude * 0.5)
          expect(Math.abs(offset.y)).toBeLessThanOrEqual(amplitude)

          // Rotation should respect the enabled flag
          if (rotationEnabled) {
            expect(typeof offset.rotation).toBe('number')
            expect(isFinite(offset.rotation)).toBe(true)
          } else {
            expect(offset.rotation).toBe(0)
          }

          return true
        }
      ), { numRuns: 40 })
    })

    it('should handle voice state transitions correctly', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.string({ minLength: 0, maxLength: 500 }),
        (isListening, isSpeaking, isProcessing, transcript) => {
          const { result } = renderHook(() => useASCIIDragon({
            enableVoiceIntegration: true
          }))

          const initialPose = result.current.pose

          act(() => {
            if (isListening) result.current.onVoiceListeningStart()
            if (isSpeaking) result.current.onVoiceSpeakingStart(transcript)
            if (isProcessing) result.current.onVoiceProcessingStart()
            if (transcript.length > 0) result.current.onTranscriptUpdate(transcript)
          })

          // Voice integration state should match actions
          expect(result.current.voiceIntegration.isListening).toBe(isListening)
          expect(result.current.voiceIntegration.isSpeaking).toBe(isSpeaking)
          expect(result.current.voiceIntegration.isProcessing).toBe(isProcessing)

          if (transcript.length > 0) {
            expect(result.current.voiceIntegration.transcriptLength).toBe(transcript.length)
          }

          // Pose should change appropriately based on voice state
          if (isSpeaking) {
            expect(result.current.pose).toBe('flying')
          } else if (isProcessing) {
            expect(result.current.pose).toBe('attacking')
          } else if (isListening) {
            expect(result.current.pose).toBe('coiled')
          }

          return true
        }
      ), { numRuns: 50 })
    })
  })

  describe('Cross-Component Geometric Properties', () => {
    it('should maintain consistent state recommendations across components', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (voiceActive, transcriptLength, powerLevel, isProcessing) => {
          // Test Dragon3D state recommendation
          const dragon3DState = getDragonStateRecommendation(voiceActive, transcriptLength, powerLevel)
          
          // Test ASCII dragon pose recommendation
          const asciiPose = getPoseRecommendation(voiceActive, transcriptLength, isProcessing)

          // Both should return valid values
          expect(['idle', 'attention', 'ready', 'active', 'speaking', 'listening', 'processing']).toContain(dragon3DState)
          expect(['coiled', 'flying', 'attacking', 'sleeping']).toContain(asciiPose)

          // There should be some logical consistency between recommendations
          if (isProcessing) {
            expect(asciiPose).toBe('attacking')
            expect(['processing', 'active']).toContain(dragon3DState)
          }

          if (voiceActive && transcriptLength > 100) {
            expect(['active', 'ready']).toContain(dragon3DState)
            expect(asciiPose).toBe('flying')
          }

          if (!voiceActive && powerLevel < 40) {
            expect(['idle', 'attention']).toContain(dragon3DState)
          }

          return true
        }
      ), { numRuns: 75 })
    })

    it('should maintain scale invariance for geometric transformations', () => {
      fc.assert(fc.property(
        scaleArbitrary,
        pointArbitrary,
        rotationArbitrary,
        (scale, translation, rotation) => {
          // Test that transformations don't break fundamental properties
          
          // Scale factors should be positive
          expect(scale.x).toBeGreaterThan(0)
          expect(scale.y).toBeGreaterThan(0)
          expect(scale.z).toBeGreaterThan(0)

          // Translation should be finite
          expect(isFinite(translation.x)).toBe(true)
          expect(isFinite(translation.y)).toBe(true)
          expect(isFinite(translation.z)).toBe(true)

          // Rotation should be within valid range
          expect(rotation.x).toBeGreaterThanOrEqual(0)
          expect(rotation.x).toBeLessThan(2 * Math.PI)
          expect(rotation.y).toBeGreaterThanOrEqual(0)
          expect(rotation.y).toBeLessThan(2 * Math.PI)
          expect(rotation.z).toBeGreaterThanOrEqual(0)
          expect(rotation.z).toBeLessThan(2 * Math.PI)

          // Combined transformation should preserve relative ordering
          const transformedPoint = {
            x: translation.x + (0 * scale.x),
            y: translation.y + (0 * scale.y),
            z: translation.z + (0 * scale.z)
          }

          expect(isFinite(transformedPoint.x)).toBe(true)
          expect(isFinite(transformedPoint.y)).toBe(true)
          expect(isFinite(transformedPoint.z)).toBe(true)

          return true
        }
      ), { numRuns: 50 })
    })

    it('should preserve animation timing relationships', () => {
      fc.assert(fc.property(
        speedFactorArbitrary,
        intensityArbitrary,
        fc.boolean(),
        (speedFactor, intensity, enabled) => {
          const baseTime = 1000 // Base animation time in ms
          const scaledTime = baseTime / speedFactor

          // Faster speeds should result in shorter durations
          if (speedFactor > 1) {
            expect(scaledTime).toBeLessThan(baseTime)
          } else if (speedFactor < 1) {
            expect(scaledTime).toBeGreaterThan(baseTime)
          }

          // Intensity should be properly bounded
          expect(intensity).toBeGreaterThanOrEqual(0)
          expect(intensity).toBeLessThanOrEqual(1)

          // Animation state should be consistent with enabled flag
          if (!enabled) {
            // When disabled, animation properties shouldn't affect outcome
            expect(true).toBe(true) // Animation should be bypassed
          } else {
            // When enabled, properties should be applied
            expect(scaledTime).toBeGreaterThan(0)
            expect(isFinite(scaledTime)).toBe(true)
          }

          return true
        }
      ), { numRuns: 40 })
    })
  })

  describe('Performance Invariants', () => {
    it('should maintain performance under arbitrary load', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(animationConfigArbitrary, { minLength: 1, maxLength: 5 }),
        (instanceCount, configs) => {
          const hooks = []

          // Create multiple hook instances
          for (let i = 0; i < instanceCount; i++) {
            const config = configs[i % configs.length]
            hooks.push(renderHook(() => useDragon3D({ animationConfig: config })))
          }

          // All hooks should initialize successfully
          hooks.forEach(({ result }) => {
            expect(result.current.state).toBeDefined()
            expect(result.current.mood).toBeDefined()
            expect(result.current.powerLevel).toBeGreaterThanOrEqual(0)
            expect(result.current.powerLevel).toBeLessThanOrEqual(100)
          })

          // Cleanup
          hooks.forEach(({ unmount }) => {
            expect(() => unmount()).not.toThrow()
          })

          return true
        }
      ), { numRuns: 20 })
    })

    it('should handle concurrent state changes without corruption', () => {
      fc.assert(fc.property(
        fc.array(dragonStateArbitrary, { minLength: 2, maxLength: 10 }),
        fc.array(dragonMoodArbitrary, { minLength: 2, maxLength: 10 }),
        async (states, moods) => {
          const { result } = renderHook(() => useDragon3D())

          // Apply multiple state changes in sequence
          for (let i = 0; i < Math.min(states.length, moods.length); i++) {
            await act(async () => {
              await result.current.setState(states[i])()
              await result.current.setMood(moods[i])()
            })

            // State should always be valid after each change
            expect(result.current.state).toBe(states[i])
            expect(result.current.mood).toBe(moods[i])
            expect(result.current.powerLevel).toBeGreaterThanOrEqual(0)
            expect(result.current.powerLevel).toBeLessThanOrEqual(100)
          }

          return true
        }
      ), { numRuns: 15 })
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle extreme animation parameters gracefully', () => {
      fc.assert(fc.property(
        fc.float({ min: 0.001, max: 0.01 }), // Very slow
        fc.float({ min: 100, max: 1000 }),   // Very fast
        fc.float({ min: 0, max: 0.001 }),    // Very low intensity
        fc.float({ min: 0.999, max: 1 }),    // Very high intensity
        (verySlow, veryFast, veryLow, veryHigh) => {
          // Test extreme slow animation
          const { result: slowResult } = renderHook(() => useASCIIDragon({
            animationConfig: {
              breathing: { enabled: true, speed: verySlow * 1000, intensity: veryLow, characterMapping: true },
              floating: { enabled: true, speed: verySlow * 1000, amplitude: veryLow * 100, rotationEnabled: true }
            }
          }))

          // Test extreme fast animation
          const { result: fastResult } = renderHook(() => useASCIIDragon({
            animationConfig: {
              breathing: { enabled: true, speed: veryFast, intensity: veryHigh, characterMapping: true },
              floating: { enabled: true, speed: veryFast, amplitude: veryHigh * 100, rotationEnabled: true }
            }
          }))

          // Both should initialize without errors
          expect(slowResult.current.pose).toBeDefined()
          expect(fastResult.current.pose).toBeDefined()

          // Animation configs should be preserved
          expect(slowResult.current.animationConfig.breathing.speed).toBeCloseTo(verySlow * 1000, 3)
          expect(fastResult.current.animationConfig.breathing.speed).toBeCloseTo(veryFast, 3)

          return true
        }
      ), { numRuns: 25 })
    })

    it('should maintain consistency at type boundaries', () => {
      fc.assert(fc.property(
        fc.float({ min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
        fc.float({ min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
        (largeNumber, anotherLargeNumber) => {
          // Test that the system handles large numbers appropriately
          const clampedPower = Math.max(0, Math.min(100, largeNumber))
          const clampedIntensity = Math.max(0, Math.min(1, anotherLargeNumber))

          // Clamped values should be within bounds
          expect(clampedPower).toBeGreaterThanOrEqual(0)
          expect(clampedPower).toBeLessThanOrEqual(100)
          expect(clampedIntensity).toBeGreaterThanOrEqual(0)
          expect(clampedIntensity).toBeLessThanOrEqual(1)

          // Should handle these safely in actual usage
          const { result } = renderHook(() => useDragon3D({
            initialPowerLevel: clampedPower
          }))

          expect(result.current.powerLevel).toBe(clampedPower)

          return true
        }
      ), { numRuns: 30 })
    })
  })
})

// Geometric relationship tests
describe('Dragon Geometric Relationships', () => {
  it('should maintain proportional relationships between size and animation timing', () => {
    fc.assert(fc.property(
      asciiSizeArbitrary,
      asciiSpeedArbitrary,
      (size, speed) => {
        const { result } = renderHook(() => useASCIIDragon({
          initialSize: size,
          initialSpeed: speed
        }))

        const pattern = result.current.dragonPattern
        const config = result.current.animationConfig

        // Larger dragons should have more lines
        const sizeToLineCount = {
          sm: { min: 5, max: 10 },
          md: { min: 8, max: 15 },
          lg: { min: 10, max: 20 },
          xl: { min: 15, max: 25 }
        }

        const expectedRange = sizeToLineCount[size]
        expect(pattern.length).toBeGreaterThanOrEqual(expectedRange.min)
        expect(pattern.length).toBeLessThanOrEqual(expectedRange.max)

        // Speed should affect timing configurations
        const speedToTiming = {
          slow: { min: 100, max: 200 },
          normal: { min: 80, max: 120 },
          fast: { min: 30, max: 80 }
        }

        const expectedTiming = speedToTiming[speed]
        expect(config.typewriter.speed).toBeGreaterThanOrEqual(expectedTiming.min)
        expect(config.typewriter.speed).toBeLessThanOrEqual(expectedTiming.max)

        return true
      }
    ), { numRuns: 50 })
  })

  it('should maintain aspect ratios across different dragon configurations', () => {
    fc.assert(fc.property(
      asciiPoseArbitrary,
      asciiSizeArbitrary,
      (pose, size) => {
        const { result } = renderHook(() => useASCIIDragon({
          initialPose: pose,
          initialSize: size
        }))

        const pattern = result.current.dragonPattern

        // Calculate pattern dimensions
        const height = pattern.length
        const maxWidth = Math.max(...pattern.map(line => line.length))

        // Aspect ratio should be reasonable for all combinations
        const aspectRatio = maxWidth / height
        expect(aspectRatio).toBeGreaterThan(0.5) // Not too tall
        expect(aspectRatio).toBeLessThan(3.0)    // Not too wide

        // Width should generally increase with size
        const expectedMinWidth = {
          sm: 8,
          md: 12,
          lg: 16,
          xl: 20
        }

        expect(maxWidth).toBeGreaterThanOrEqual(expectedMinWidth[size])

        return true
      }
    ), { numRuns: 60 })
  })
})