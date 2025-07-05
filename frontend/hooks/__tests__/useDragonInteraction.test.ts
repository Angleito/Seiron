import { renderHook } from '@testing-library/react'
import * as fc from 'fast-check'
import { 
  useDragonState, 
  useDragonOrientation, 
  useDragonAnimation 
} from '../useDragonInteraction'

// Mock the dragon interaction controller
const mockInteractionState = {
  state: 'idle' as const,
  intensity: 'low' as const,
  orientation: { x: 0, y: 0 },
  performanceMode: 'full' as const,
}

jest.mock('@components/dragon/DragonInteractionController', () => ({
  useDragonInteraction: () => mockInteractionState,
}))

// Property generators
const arbitraryDragonState = fc.constantFrom('idle', 'attention', 'ready', 'active')
const arbitraryIntensity = fc.constantFrom('low', 'medium', 'high', 'max')
const arbitraryPerformanceMode = fc.constantFrom('minimal', 'reduced', 'full')
const arbitraryOrientation = fc.record({
  x: fc.float({ min: -1, max: 1 }),
  y: fc.float({ min: -1, max: 1 }),
})

describe('Dragon Interaction Hooks', () => {
  beforeEach(() => {
    // Reset mock state
    Object.assign(mockInteractionState, {
      state: 'idle',
      intensity: 'low',
      orientation: { x: 0, y: 0 },
      performanceMode: 'full',
    })
  })

  describe('useDragonState Hook', () => {
    describe('Property-based tests', () => {
      it('should provide correct state flags for any dragon state', () => {
        fc.assert(
          fc.property(arbitraryDragonState, arbitraryIntensity, (state, intensity) => {
            mockInteractionState.state = state
            mockInteractionState.intensity = intensity

            const { result } = renderHook(() => useDragonState())

            expect(result.current.state).toBe(state)
            expect(result.current.intensity).toBe(intensity)
            expect(typeof result.current.isIdle).toBe('boolean')
            expect(typeof result.current.isAttentive).toBe('boolean')
            expect(typeof result.current.isReady).toBe('boolean')
            expect(typeof result.current.isActive).toBe('boolean')

            // Only one state flag should be true
            const activeFlags = [
              result.current.isIdle,
              result.current.isAttentive,
              result.current.isReady,
              result.current.isActive,
            ].filter(Boolean)
            expect(activeFlags).toHaveLength(1)
          })
        )
      })
    })

    describe('Unit tests', () => {
      it('should provide correct state flags for idle state', () => {
        mockInteractionState.state = 'idle'

        const { result } = renderHook(() => useDragonState())

        expect(result.current.isIdle).toBe(true)
        expect(result.current.isAttentive).toBe(false)
        expect(result.current.isReady).toBe(false)
        expect(result.current.isActive).toBe(false)
      })

      it('should provide correct state flags for attention state', () => {
        mockInteractionState.state = 'attention'

        const { result } = renderHook(() => useDragonState())

        expect(result.current.isIdle).toBe(false)
        expect(result.current.isAttentive).toBe(true)
        expect(result.current.isReady).toBe(false)
        expect(result.current.isActive).toBe(false)
      })

      it('should provide correct state flags for ready state', () => {
        mockInteractionState.state = 'ready'

        const { result } = renderHook(() => useDragonState())

        expect(result.current.isIdle).toBe(false)
        expect(result.current.isAttentive).toBe(false)
        expect(result.current.isReady).toBe(true)
        expect(result.current.isActive).toBe(false)
      })

      it('should provide correct state flags for active state', () => {
        mockInteractionState.state = 'active'

        const { result } = renderHook(() => useDragonState())

        expect(result.current.isIdle).toBe(false)
        expect(result.current.isAttentive).toBe(false)
        expect(result.current.isReady).toBe(false)
        expect(result.current.isActive).toBe(true)
      })

      it('should expose raw state and intensity', () => {
        mockInteractionState.state = 'ready'
        mockInteractionState.intensity = 'high'

        const { result } = renderHook(() => useDragonState())

        expect(result.current.state).toBe('ready')
        expect(result.current.intensity).toBe('high')
      })
    })
  })

  describe('useDragonOrientation Hook', () => {
    describe('Property-based tests', () => {
      it('should calculate correct transforms for any orientation', () => {
        fc.assert(
          fc.property(arbitraryOrientation, (orientation) => {
            mockInteractionState.orientation = orientation

            const { result } = renderHook(() => useDragonOrientation())

            expect(result.current.orientation).toEqual(orientation)
            expect(typeof result.current.angle).toBe('number')
            expect(typeof result.current.headTilt).toBe('number')
            expect(typeof result.current.bodyRotation).toBe('number')
            expect(typeof result.current.headTransform).toBe('string')
            expect(typeof result.current.eyeTransform).toBe('string')

            // Check value ranges
            expect(result.current.headTilt).toBeGreaterThanOrEqual(-20)
            expect(result.current.headTilt).toBeLessThanOrEqual(20)
            expect(result.current.bodyRotation).toBeGreaterThanOrEqual(-15)
            expect(result.current.bodyRotation).toBeLessThanOrEqual(15)
          })
        )
      })

      it('should generate valid CSS transforms for any orientation', () => {
        fc.assert(
          fc.property(arbitraryOrientation, (orientation) => {
            mockInteractionState.orientation = orientation

            const { result } = renderHook(() => useDragonOrientation())

            // CSS transforms should be valid strings
            expect(result.current.headTransform).toMatch(/^rotateX\(-?\d+(\.\d+)?deg\) rotateY\(-?\d+(\.\d+)?deg\)$/)
            expect(result.current.eyeTransform).toMatch(/^translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\)$/)
          })
        )
      })
    })

    describe('Unit tests', () => {
      it('should calculate correct values for center orientation', () => {
        mockInteractionState.orientation = { x: 0, y: 0 }

        const { result } = renderHook(() => useDragonOrientation())

        expect(result.current.angle).toBe(0)
        expect(result.current.headTilt).toBe(0)
        expect(result.current.bodyRotation).toBe(0)
        expect(result.current.headTransform).toBe('rotateX(0deg) rotateY(0deg)')
        expect(result.current.eyeTransform).toBe('translate(0px, 0px)')
      })

      it('should calculate correct values for right orientation', () => {
        mockInteractionState.orientation = { x: 1, y: 0 }

        const { result } = renderHook(() => useDragonOrientation())

        expect(result.current.angle).toBe(0)
        expect(result.current.headTilt).toBe(0)
        expect(result.current.bodyRotation).toBe(15)
        expect(result.current.headTransform).toBe('rotateX(0deg) rotateY(15deg)')
        expect(result.current.eyeTransform).toBe('translate(5px, 0px)')
      })

      it('should calculate correct values for up orientation', () => {
        mockInteractionState.orientation = { x: 0, y: 1 }

        const { result } = renderHook(() => useDragonOrientation())

        expect(result.current.angle).toBe(90)
        expect(result.current.headTilt).toBe(20)
        expect(result.current.bodyRotation).toBe(0)
        expect(result.current.headTransform).toBe('rotateX(-20deg) rotateY(0deg)')
        expect(result.current.eyeTransform).toBe('translate(0px, 5px)')
      })

      it('should calculate correct values for diagonal orientation', () => {
        mockInteractionState.orientation = { x: 0.5, y: 0.5 }

        const { result } = renderHook(() => useDragonOrientation())

        expect(result.current.angle).toBe(45)
        expect(result.current.headTilt).toBe(10)
        expect(result.current.bodyRotation).toBe(7.5)
        expect(result.current.headTransform).toBe('rotateX(-10deg) rotateY(7.5deg)')
        expect(result.current.eyeTransform).toBe('translate(2.5px, 2.5px)')
      })

      it('should handle negative orientations', () => {
        mockInteractionState.orientation = { x: -0.8, y: -0.6 }

        const { result } = renderHook(() => useDragonOrientation())

        expect(result.current.headTilt).toBe(-12)
        expect(result.current.bodyRotation).toBe(-12)
        expect(result.current.headTransform).toBe('rotateX(12deg) rotateY(-12deg)')
        expect(result.current.eyeTransform).toBe('translate(-4px, -3px)')
      })
    })
  })

  describe('useDragonAnimation Hook', () => {
    describe('Property-based tests', () => {
      it('should provide consistent animation parameters for any state combination', () => {
        fc.assert(
          fc.property(
            arbitraryDragonState,
            arbitraryIntensity,
            arbitraryPerformanceMode,
            (state, intensity, performanceMode) => {
              mockInteractionState.state = state
              mockInteractionState.intensity = intensity
              mockInteractionState.performanceMode = performanceMode

              const { result } = renderHook(() => useDragonAnimation())

              expect(['slow', 'normal', 'fast']).toContain(result.current.animationSpeed)
              expect(typeof result.current.particleCount).toBe('number')
              expect(result.current.particleCount).toBeGreaterThanOrEqual(0)
              expect(typeof result.current.glowIntensity).toBe('number')
              expect(result.current.glowIntensity).toBeGreaterThanOrEqual(0)
              expect(result.current.glowIntensity).toBeLessThanOrEqual(1)
              expect(typeof result.current.enableParticles).toBe('boolean')
              expect(typeof result.current.enableGlow).toBe('boolean')
              expect(typeof result.current.enableComplexAnimations).toBe('boolean')
            }
          )
        )
      })

      it('should respect performance mode constraints', () => {
        fc.assert(
          fc.property(
            arbitraryDragonState,
            arbitraryIntensity,
            arbitraryPerformanceMode,
            (state, intensity, performanceMode) => {
              mockInteractionState.state = state
              mockInteractionState.intensity = intensity
              mockInteractionState.performanceMode = performanceMode

              const { result } = renderHook(() => useDragonAnimation())

              if (performanceMode === 'minimal') {
                expect(result.current.enableParticles).toBe(false)
                expect(result.current.enableGlow).toBe(false)
                expect(result.current.enableComplexAnimations).toBe(false)
              } else if (performanceMode === 'reduced') {
                expect(result.current.enableGlow).toBe(false)
                expect(result.current.enableComplexAnimations).toBe(false)
              } else if (performanceMode === 'full') {
                expect(result.current.enableGlow).toBe(true)
                expect(result.current.enableComplexAnimations).toBe(true)
              }
            }
          )
        )
      })
    })

    describe('Unit tests', () => {
      it('should provide correct animation speed for different states', () => {
        const stateSpeedMap = {
          idle: 'slow',
          attention: 'slow',
          ready: 'normal',
          active: 'fast',
        } as const

        Object.entries(stateSpeedMap).forEach(([state, expectedSpeed]) => {
          mockInteractionState.state = state as any
          mockInteractionState.performanceMode = 'full'

          const { result } = renderHook(() => useDragonAnimation())
          expect(result.current.animationSpeed).toBe(expectedSpeed)
        })
      })

      it('should adjust animation speed for performance modes', () => {
        mockInteractionState.state = 'active'

        // Minimal mode forces slow
        mockInteractionState.performanceMode = 'minimal'
        let { result } = renderHook(() => useDragonAnimation())
        expect(result.current.animationSpeed).toBe('slow')

        // Reduced mode forces normal
        mockInteractionState.performanceMode = 'reduced'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.animationSpeed).toBe('normal')

        // Full mode allows state-based speed
        mockInteractionState.performanceMode = 'full'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.animationSpeed).toBe('fast')
      })

      it('should provide correct particle counts for different states', () => {
        const stateParticleMap = {
          idle: 3,
          attention: 5,
          ready: 8,
          active: 12,
        }

        Object.entries(stateParticleMap).forEach(([state, baseCount]) => {
          mockInteractionState.state = state as any
          mockInteractionState.performanceMode = 'full'

          const { result } = renderHook(() => useDragonAnimation())
          expect(result.current.particleCount).toBe(baseCount)
        })
      })

      it('should reduce particle counts for performance modes', () => {
        mockInteractionState.state = 'active'

        // Full mode - full particle count
        mockInteractionState.performanceMode = 'full'
        let { result } = renderHook(() => useDragonAnimation())
        expect(result.current.particleCount).toBe(12)

        // Reduced mode - 60% of particles
        mockInteractionState.performanceMode = 'reduced'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.particleCount).toBe(7) // floor(12 * 0.6)

        // Minimal mode - 30% of particles
        mockInteractionState.performanceMode = 'minimal'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.particleCount).toBe(3) // floor(12 * 0.3)
      })

      it('should provide correct glow intensity for different intensities', () => {
        const intensityGlowMap = {
          low: 0.3,
          medium: 0.5,
          high: 0.7,
          max: 1,
        }

        Object.entries(intensityGlowMap).forEach(([intensity, baseIntensity]) => {
          mockInteractionState.intensity = intensity as any
          mockInteractionState.performanceMode = 'full'

          const { result } = renderHook(() => useDragonAnimation())
          expect(result.current.glowIntensity).toBe(baseIntensity)
        })
      })

      it('should reduce glow intensity for minimal performance mode', () => {
        mockInteractionState.intensity = 'max'
        mockInteractionState.performanceMode = 'minimal'

        const { result } = renderHook(() => useDragonAnimation())
        expect(result.current.glowIntensity).toBe(0.5) // 1 * 0.5
      })

      it('should disable features based on performance mode', () => {
        // Full mode enables everything
        mockInteractionState.performanceMode = 'full'
        let { result } = renderHook(() => useDragonAnimation())
        expect(result.current.enableParticles).toBe(true)
        expect(result.current.enableGlow).toBe(true)
        expect(result.current.enableComplexAnimations).toBe(true)

        // Reduced mode disables glow and complex animations
        mockInteractionState.performanceMode = 'reduced'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.enableParticles).toBe(true)
        expect(result.current.enableGlow).toBe(false)
        expect(result.current.enableComplexAnimations).toBe(false)

        // Minimal mode disables everything
        mockInteractionState.performanceMode = 'minimal'
        result = renderHook(() => useDragonAnimation()).result
        expect(result.current.enableParticles).toBe(false)
        expect(result.current.enableGlow).toBe(false)
        expect(result.current.enableComplexAnimations).toBe(false)
      })
    })

    describe('Performance optimization tests', () => {
      it('should provide appropriate settings for low-end devices', () => {
        mockInteractionState.state = 'active'
        mockInteractionState.intensity = 'max'
        mockInteractionState.performanceMode = 'minimal'

        const { result } = renderHook(() => useDragonAnimation())

        expect(result.current.animationSpeed).toBe('slow')
        expect(result.current.particleCount).toBeLessThanOrEqual(4) // Minimal particles
        expect(result.current.glowIntensity).toBeLessThanOrEqual(0.5) // Reduced glow
        expect(result.current.enableParticles).toBe(false)
        expect(result.current.enableGlow).toBe(false)
        expect(result.current.enableComplexAnimations).toBe(false)
      })

      it('should scale appropriately for medium performance', () => {
        mockInteractionState.state = 'active'
        mockInteractionState.intensity = 'max'
        mockInteractionState.performanceMode = 'reduced'

        const { result } = renderHook(() => useDragonAnimation())

        expect(result.current.animationSpeed).toBe('normal')
        expect(result.current.particleCount).toBeGreaterThan(3) // Some particles
        expect(result.current.particleCount).toBeLessThan(12) // But not all
        expect(result.current.enableParticles).toBe(true)
        expect(result.current.enableGlow).toBe(false)
        expect(result.current.enableComplexAnimations).toBe(false)
      })
    })
  })

  describe('Integration tests', () => {
    it('should work together to provide consistent dragon behavior', () => {
      mockInteractionState.state = 'ready'
      mockInteractionState.intensity = 'high'
      mockInteractionState.orientation = { x: 0.5, y: -0.3 }
      mockInteractionState.performanceMode = 'full'

      const stateResult = renderHook(() => useDragonState()).result
      const orientationResult = renderHook(() => useDragonOrientation()).result
      const animationResult = renderHook(() => useDragonAnimation()).result

      // State should be consistent
      expect(stateResult.current.isReady).toBe(true)
      expect(stateResult.current.state).toBe('ready')

      // Orientation should be calculated correctly
      expect(orientationResult.current.orientation).toEqual({ x: 0.5, y: -0.3 })
      expect(orientationResult.current.bodyRotation).toBe(7.5)
      expect(orientationResult.current.headTilt).toBe(-6)

      // Animation should match state and intensity
      expect(animationResult.current.animationSpeed).toBe('normal')
      expect(animationResult.current.glowIntensity).toBe(0.7)
      expect(animationResult.current.particleCount).toBe(8)
    })

    it('should adapt together for performance constraints', () => {
      mockInteractionState.state = 'active'
      mockInteractionState.intensity = 'max'
      mockInteractionState.performanceMode = 'minimal'

      const stateResult = renderHook(() => useDragonState()).result
      const animationResult = renderHook(() => useDragonAnimation()).result

      // State should remain accurate
      expect(stateResult.current.isActive).toBe(true)

      // But animation should be constrained
      expect(animationResult.current.animationSpeed).toBe('slow')
      expect(animationResult.current.enableParticles).toBe(false)
      expect(animationResult.current.glowIntensity).toBe(0.5) // Reduced from max
    })
  })
})