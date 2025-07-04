/**
 * Dragon Visual Regression Tests
 * Tests for visual consistency across states, responsive breakpoints, and browsers
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import type { DragonState, DragonMood } from '../types'
import { DRAGON_SIZE_CONFIG, RESPONSIVE_BREAKPOINTS } from '../constants'

// Mock hooks for controlled visual testing
const createMockStateMachine = (state: DragonState, mood: DragonMood = 'neutral', powerLevel: number = 1000) => ({
  state,
  mood,
  powerLevel,
  isTransitioning: false,
  performanceMetrics: {
    fps: 60,
    frameDrops: 0,
    averageFrameTime: 16.67,
    memoryUsage: 0.3,
    gpuUtilization: 0.2,
    lastUpdated: Date.now()
  },
  actions: {
    setState: jest.fn(),
    setMood: jest.fn(),
    powerUp: jest.fn(),
    powerDown: jest.fn(),
    triggerSpecialAnimation: jest.fn(),
    resetToIdle: jest.fn(),
  }
})

jest.mock('../hooks/useDragonStateMachine', () => ({
  useDragonStateMachine: jest.fn(() => createMockStateMachine('idle'))
}))

jest.mock('../hooks/useEnhancedMouseTracking', () => ({
  useEnhancedMouseTracking: jest.fn(() => ({
    svgState: {
      hoveredPart: null,
      activePart: null,
      focusedPart: null,
      cursorPosition: { x: 0, y: 0 },
      eyeRotation: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
      headRotation: { x: 0, y: 0 },
      isKeyboardNavigating: false,
      touchTargets: new Map(),
    },
    eyeTracking: {
      leftEye: {
        rotation: { x: 0, y: 0 },
        pupilPosition: { x: 0, y: 0 },
        blinkState: 'open'
      },
      rightEye: {
        rotation: { x: 0, y: 0 },
        pupilPosition: { x: 0, y: 0 },
        blinkState: 'open'
      }
    }
  }))
}))

jest.mock('../hooks/useEnhancedTouchGestures', () => ({
  useEnhancedTouchGestures: jest.fn(() => ({
    gestureHandlers: {
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
    gestureTrails: []
  }))
}))

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    focusIndicator: { visible: false, position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, style: {} },
    getAccessibilityProps: jest.fn(() => ({ role: 'img', 'aria-label': 'Dragon', tabIndex: 0 })),
    actions: { announceToScreenReader: jest.fn() },
    AriaLiveRegion: () => <div />
  }))
}))

describe('Dragon Visual Regression Tests', () => {
  const defaultProps = {
    size: 'lg' as const,
    interactive: true,
    showDragonBalls: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(async () => {
    // Allow animations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })

  describe('Dragon State Visuals', () => {
    const dragonStates: DragonState[] = [
      'idle', 'attention', 'ready', 'active', 
      'powering-up', 'arms-crossed', 'sleeping', 'awakening'
    ]

    test('all dragon states render consistently', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const results: Record<DragonState, any> = {} as any

      for (const state of dragonStates) {
        useDragonStateMachine.mockReturnValue(createMockStateMachine(state))
        
        const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        
        // Wait for render to complete
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        // Capture visual state
        const result = await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-state-${state}`,
          { maxDifference: 0.1 } // Very strict for state consistency
        )
        
        results[state] = result
        unmount()
      }

      // Verify all states captured successfully
      Object.entries(results).forEach(([state, result]) => {
        expect(result.passed || result.isNewBaseline).toBe(true)
      })
    })

    test('state transitions are visually smooth', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const transitionPairs: Array<[DragonState, DragonState]> = [
        ['idle', 'attention'],
        ['attention', 'ready'],
        ['ready', 'active'],
        ['active', 'powering-up'],
        ['powering-up', 'idle']
      ]

      for (const [fromState, toState] of transitionPairs) {
        // Start with first state
        useDragonStateMachine.mockReturnValue(createMockStateMachine(fromState))
        const { container, rerender } = render(<SVGDragonCharacter {...defaultProps} />)
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        // Capture initial state
        await global.expectVisualMatch(
          container.firstChild as Element,
          `transition-${fromState}-to-${toState}-start`,
          { maxDifference: 0.1 }
        )

        // Transition to second state
        useDragonStateMachine.mockReturnValue(createMockStateMachine(toState))
        rerender(<SVGDragonCharacter {...defaultProps} />)

        // Allow transition animation
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 300))
        })

        // Capture final state
        await global.expectVisualMatch(
          container.firstChild as Element,
          `transition-${fromState}-to-${toState}-end`,
          { maxDifference: 0.1 }
        )
      }
    })

    test('power-up visual effects render correctly', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const powerLevels = [1000, 3000, 5000, 8000, 9000]

      for (const powerLevel of powerLevels) {
        useDragonStateMachine.mockReturnValue(
          createMockStateMachine('powering-up', 'powerful', powerLevel)
        )
        
        const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        // Allow power-up animations to start
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 500))
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-power-level-${powerLevel}`,
          { maxDifference: 0.3 } // Slightly more tolerance for animated effects
        )
        
        unmount()
      }
    })
  })

  describe('Dragon Mood Visuals', () => {
    const dragonMoods: DragonMood[] = [
      'neutral', 'happy', 'excited', 'powerful', 
      'mystical', 'focused', 'aggressive', 'confident'
    ]

    test('mood variations are visually distinct', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')

      for (const mood of dragonMoods) {
        useDragonStateMachine.mockReturnValue(createMockStateMachine('idle', mood))
        
        const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-mood-${mood}`,
          { maxDifference: 0.2 }
        )
        
        unmount()
      }
    })

    test('mood and state combinations render correctly', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const combinations: Array<[DragonState, DragonMood]> = [
        ['attention', 'focused'],
        ['ready', 'confident'],
        ['active', 'excited'],
        ['powering-up', 'powerful'],
        ['awakening', 'mystical']
      ]

      for (const [state, mood] of combinations) {
        useDragonStateMachine.mockReturnValue(createMockStateMachine(state, mood))
        
        const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-${state}-${mood}`,
          { maxDifference: 0.2 }
        )
        
        unmount()
      }
    })
  })

  describe('Size Variations', () => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl' | 'xxl'> = ['sm', 'md', 'lg', 'xl', 'xxl']

    test('all sizes render proportionally', async () => {
      for (const size of sizes) {
        const { container, unmount } = render(
          <SVGDragonCharacter {...defaultProps} size={size} />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        const svg = screen.getByRole('img')
        const config = DRAGON_SIZE_CONFIG[size]
        
        expect(svg).toHaveAttribute('width', config.width.toString())
        expect(svg).toHaveAttribute('height', config.height.toString())

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-size-${size}`,
          { maxDifference: 0.1 }
        )
        
        unmount()
      }
    })

    test('dragon balls scale with dragon size', async () => {
      for (const size of sizes) {
        const { container, unmount } = render(
          <SVGDragonCharacter {...defaultProps} size={size} showDragonBalls={true} />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        const dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
        expect(dragonBalls).toHaveLength(7)

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-balls-size-${size}`,
          { maxDifference: 0.1 }
        )
        
        unmount()
      }
    })
  })

  describe('Responsive Design', () => {
    test('adapts to different viewport sizes', async () => {
      const viewports = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1920, height: 1080 },
        ultrawide: { width: 3440, height: 1440 }
      }

      const results = await global.expectResponsiveVisuals(
        <SVGDragonCharacter {...defaultProps} />,
        viewports,
        { maxDifference: 0.2 }
      )

      Object.entries(results).forEach(([viewport, result]) => {
        expect(result.passed || result.isNewBaseline).toBe(true)
      })
    })

    test('responsive breakpoints work correctly', async () => {
      for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
        // Simulate viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: breakpoint.minWidth + 50,
        })

        const { container, unmount } = render(
          <SVGDragonCharacter 
            {...defaultProps} 
            size={breakpoint.dragonSize}
            animationConfig={{
              particleCount: breakpoint.particleCount,
              performanceMode: breakpoint.animationQuality
            }}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-breakpoint-${breakpoint.name}`,
          { maxDifference: 0.2 }
        )
        
        unmount()
      }
    })
  })

  describe('Dragon Ball Visuals', () => {
    test('dragon ball configurations render consistently', async () => {
      const ballConfigs = [
        { count: 3, pattern: 'circular' },
        { count: 5, pattern: 'elliptical' },
        { count: 7, pattern: 'complex' },
        { count: 7, pattern: 'chaotic' }
      ]

      for (const config of ballConfigs) {
        const { container, unmount } = render(
          <SVGDragonCharacter 
            {...defaultProps} 
            showDragonBalls={true}
            dragonBallConfig={{
              count: config.count,
              orbitPattern: config.pattern as any,
              orbitSpeed: 1.0,
              orbitRadius: 150,
              individualAnimation: true,
              interactionEnabled: true
            }}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        // Allow orbital animations to stabilize
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000))
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-balls-${config.count}-${config.pattern}`,
          { maxDifference: 0.3 } // More tolerance for orbital animations
        )
        
        unmount()
      }
    })

    test('individual dragon ball designs are correct', async () => {
      const { container } = render(
        <SVGDragonCharacter {...defaultProps} showDragonBalls={true} />
      )
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      const dragonBalls = document.querySelectorAll('[data-dragon-ball-id]')
      
      // Test each dragon ball (1-7 stars)
      for (let i = 1; i <= 7; i++) {
        const ball = document.querySelector(`[data-dragon-ball-id="${i}"]`)
        expect(ball).toBeInTheDocument()
        
        if (ball) {
          await global.expectVisualMatch(
            ball as Element,
            `dragon-ball-${i}-star`,
            { maxDifference: 0.1 }
          )
        }
      }
    })
  })

  describe('Animation Quality Modes', () => {
    test('performance mode reduces visual complexity', async () => {
      const performanceModes = ['performance', 'balanced', 'quality'] as const

      for (const mode of performanceModes) {
        const { container, unmount } = render(
          <SVGDragonCharacter 
            {...defaultProps}
            animationConfig={{
              performanceMode: mode,
              enableParticles: mode === 'quality',
              enableAura: true,
              enableBreathing: mode !== 'performance',
              particleCount: mode === 'quality' ? 20 : mode === 'balanced' ? 12 : 6
            }}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        // Allow effects to render
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 500))
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-performance-${mode}`,
          { maxDifference: 0.2 }
        )
        
        unmount()
      }
    })

    test('reduced motion mode simplifies animations', async () => {
      // Enable reduced motion
      global.reducedMotionTesting.enableReducedMotion()

      const { container, unmount } = render(
        <SVGDragonCharacter 
          {...defaultProps}
          animationConfig={{
            reducedMotion: true,
            enableParticles: false,
            enableMicroMovements: false,
            transitionDuration: 0
          }}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-reduced-motion',
        { maxDifference: 0.1 }
      )
      
      unmount()
      global.reducedMotionTesting.disableReducedMotion()
    })
  })

  describe('Interaction State Visuals', () => {
    test('hover states are visually distinct', async () => {
      const { useEnhancedMouseTracking } = require('../hooks/useEnhancedMouseTracking')
      const dragonParts = ['head', 'body', 'left-arm', 'right-arm', 'tail']

      for (const part of dragonParts) {
        useEnhancedMouseTracking.mockReturnValue({
          svgState: {
            hoveredPart: part,
            activePart: null,
            focusedPart: null,
            cursorPosition: { x: 150, y: 150 },
            eyeRotation: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
            headRotation: { x: 0, y: 0 },
            isKeyboardNavigating: false,
            touchTargets: new Map(),
          },
          eyeTracking: {
            leftEye: { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 }, blinkState: 'open' },
            rightEye: { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 }, blinkState: 'open' }
          }
        })

        const { container, unmount } = render(
          <SVGDragonCharacter {...defaultProps} interactive={true} />
        )
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-hover-${part}`,
          { maxDifference: 0.2 }
        )
        
        unmount()
      }
    })

    test('focus indicators are visible and consistent', async () => {
      const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation')
      
      useKeyboardNavigation.mockReturnValue({
        focusIndicator: {
          visible: true,
          position: { x: 100, y: 100 },
          size: { width: 60, height: 60 },
          style: { 
            border: '3px solid #0066cc', 
            borderRadius: '4px',
            boxShadow: '0 0 0 1px #ffffff'
          }
        },
        getAccessibilityProps: jest.fn(() => ({ role: 'img', tabIndex: 0 })),
        actions: { announceToScreenReader: jest.fn() },
        AriaLiveRegion: () => <div />
      })

      const { container, unmount } = render(
        <SVGDragonCharacter {...defaultProps} showFocusIndicator={true} />
      )
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-focus-indicator',
        { maxDifference: 0.1 }
      )
      
      unmount()
    })
  })

  describe('Cross-Browser Compatibility', () => {
    test('SVG rendering is consistent across engines', async () => {
      // This test would ideally run with different browser engines
      // For now, we test different SVG rendering scenarios
      
      const { container } = render(<SVGDragonCharacter {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      // Test SVG viewBox handling
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('viewBox')
      expect(svg).toHaveAttribute('width')
      expect(svg).toHaveAttribute('height')

      // Test gradient definitions
      const gradients = container.querySelectorAll('defs radialGradient, defs linearGradient')
      expect(gradients.length).toBeGreaterThan(0)

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-cross-browser-baseline',
        { maxDifference: 0.05 } // Very strict for cross-browser consistency
      )
    })

    test('CSS animations fallback gracefully', async () => {
      // Simulate browser with limited animation support
      const originalRequestAnimationFrame = global.requestAnimationFrame
      global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        setTimeout(callback, 50) // Simulate slower frame rate
        return 1
      }) as any

      const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-animation-fallback',
        { maxDifference: 0.2 }
      )
      
      unmount()
      global.requestAnimationFrame = originalRequestAnimationFrame
    })
  })

  describe('Edge Cases', () => {
    test('renders correctly with minimal configuration', async () => {
      const { container, unmount } = render(
        <SVGDragonCharacter 
          size="sm"
          interactive={false}
          showDragonBalls={false}
          enableAdvancedInteractions={false}
          enableCursorEffects={false}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-minimal-config',
        { maxDifference: 0.1 }
      )
      
      unmount()
    })

    test('renders correctly with maximum configuration', async () => {
      const { container, unmount } = render(
        <SVGDragonCharacter 
          size="xxl"
          interactive={true}
          showDragonBalls={true}
          enableAdvancedInteractions={true}
          enableCursorEffects={true}
          enableHapticFeedback={true}
          enableKeyboardNavigation={true}
          enableScreenReader={true}
          showFocusIndicator={true}
          animationConfig={{
            enableParticles: true,
            enableAura: true,
            enableBreathing: true,
            enableMicroMovements: true,
            particleCount: 20,
            performanceMode: 'quality'
          }}
          dragonBallConfig={{
            count: 7,
            orbitPattern: 'complex',
            orbitSpeed: 2.0,
            individualAnimation: true,
            interactionEnabled: true
          }}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })

      // Allow complex animations to stabilize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1500))
      })

      await global.expectVisualMatch(
        container.firstChild as Element,
        'dragon-maximum-config',
        { maxDifference: 0.4 } // Higher tolerance for complex configurations
      )
      
      unmount()
    })

    test('handles extreme power levels visually', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const extremePowerLevels = [0, 9001, 50000] // Including edge cases

      for (const powerLevel of extremePowerLevels) {
        useDragonStateMachine.mockReturnValue(
          createMockStateMachine('powering-up', 'powerful', powerLevel)
        )
        
        const { container, unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        await global.expectVisualMatch(
          container.firstChild as Element,
          `dragon-extreme-power-${powerLevel}`,
          { maxDifference: 0.3 }
        )
        
        unmount()
      }
    })
  })
})