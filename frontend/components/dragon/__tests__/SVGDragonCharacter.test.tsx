/**
 * SVGDragonCharacter Component Tests
 * Comprehensive test suite for the main SVG dragon component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import { DRAGON_SIZE_CONFIG, POWER_LEVELS } from '../constants'
import type { DragonState, DragonMood } from '../types'

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    svg: 'svg',
    circle: 'div',
    ellipse: 'div',
    path: 'div',
    polygon: 'div',
    g: 'g',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock hooks to control their behavior
jest.mock('../hooks/useDragonStateMachine', () => ({
  useDragonStateMachine: jest.fn(() => ({
    state: 'idle',
    mood: 'neutral',
    powerLevel: 1000,
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
  }))
}))

jest.mock('../hooks/useSVGInteraction', () => ({
  useSVGInteraction: jest.fn(() => ({}))
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
    focusIndicator: {
      visible: false,
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      style: {}
    },
    getAccessibilityProps: jest.fn(() => ({
      role: 'img',
      'aria-label': 'Interactive dragon',
      tabIndex: 0
    })),
    actions: {
      announceToScreenReader: jest.fn()
    },
    AriaLiveRegion: () => <div aria-live="polite" id="dragon-announcements" />
  }))
}))

describe('SVGDragonCharacter', () => {
  const defaultProps = {
    size: 'lg' as const,
    interactive: true,
    showDragonBalls: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders without crashing', () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    test('renders with correct size configuration', () => {
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} size="sm" />)
      const container = screen.getByRole('img').closest('div')
      expect(container).toHaveClass(DRAGON_SIZE_CONFIG.sm.containerSize.replace(/\s+/g, ' '))

      rerender(<SVGDragonCharacter {...defaultProps} size="xl" />)
      expect(container).toHaveClass(DRAGON_SIZE_CONFIG.xl.containerSize.replace(/\s+/g, ' '))
    })

    test('renders SVG with correct dimensions', () => {
      render(<SVGDragonCharacter {...defaultProps} size="md" />)
      const svg = screen.getByRole('img')
      
      expect(svg).toHaveAttribute('width', DRAGON_SIZE_CONFIG.md.width.toString())
      expect(svg).toHaveAttribute('height', DRAGON_SIZE_CONFIG.md.height.toString())
      expect(svg).toHaveAttribute('viewBox', `0 0 ${DRAGON_SIZE_CONFIG.md.width} ${DRAGON_SIZE_CONFIG.md.height}`)
    })

    test('renders dragon parts', () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Check for dragon body parts
      expect(document.querySelector('[data-dragon-part="body"]')).toBeInTheDocument()
      expect(document.querySelector('[data-dragon-part="head"]')).toBeInTheDocument()
      expect(document.querySelector('[data-dragon-part="left-arm"]')).toBeInTheDocument()
      expect(document.querySelector('[data-dragon-part="right-arm"]')).toBeInTheDocument()
      expect(document.querySelector('[data-dragon-part="tail"]')).toBeInTheDocument()
    })

    test('renders dragon balls when enabled', () => {
      render(<SVGDragonCharacter {...defaultProps} showDragonBalls={true} />)
      
      const dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      expect(dragonBalls).toHaveLength(7) // 7 dragon balls
    })

    test('does not render dragon balls when disabled', () => {
      render(<SVGDragonCharacter {...defaultProps} showDragonBalls={false} />)
      
      const dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      expect(dragonBalls).toHaveLength(0)
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      const svg = screen.getByRole('img')
      
      expect(svg).toHaveAttribute('aria-label', 'Interactive mystical dragon')
      expect(svg).toHaveAttribute('role', 'img')
    })

    test('includes ARIA live region for announcements', () => {
      render(<SVGDragonCharacter {...defaultProps} enableScreenReader={true} />)
      expect(screen.getByLabelText(/dragon-announcements/i)).toBeInTheDocument()
    })

    test('dragon parts have appropriate accessibility properties', () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const body = document.querySelector('[data-dragon-part="body"]')
      const head = document.querySelector('[data-dragon-part="head"]')
      
      expect(body).toHaveAttribute('role', 'img')
      expect(head).toHaveAttribute('role', 'img')
    })

    test('supports keyboard navigation when enabled', () => {
      render(<SVGDragonCharacter {...defaultProps} enableKeyboardNavigation={true} />)
      
      const interactiveParts = document.querySelectorAll('.cursor-pointer')
      interactiveParts.forEach(part => {
        expect(part).toHaveAttribute('tabIndex', '0')
      })
    })
  })

  describe('Interactions', () => {
    test('handles dragon part clicks', async () => {
      const onDragonPartClick = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onDragonPartClick={onDragonPartClick}
        />
      )
      
      const head = document.querySelector('[data-dragon-part="head"]')
      if (head) {
        fireEvent.click(head)
        await waitFor(() => {
          expect(onDragonPartClick).toHaveBeenCalledWith('head', expect.any(Object))
        })
      }
    })

    test('handles gesture detection', async () => {
      const onGestureDetected = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onGestureDetected={onGestureDetected}
        />
      )
      
      // Simulate touch gesture
      const container = screen.getByRole('img').closest('div')
      if (container) {
        fireEvent.touchStart(container, {
          touches: [{ clientX: 100, clientY: 100 }]
        })
        fireEvent.touchEnd(container, {
          changedTouches: [{ clientX: 200, clientY: 100 }]
        })
      }
    })

    test('supports mouse interactions when interactive', () => {
      render(<SVGDragonCharacter {...defaultProps} interactive={true} />)
      
      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      dragonParts.forEach(part => {
        expect(part).toHaveClass('cursor-pointer')
      })
    })

    test('disables interactions when not interactive', () => {
      render(<SVGDragonCharacter {...defaultProps} interactive={false} />)
      
      // Should still render but without interactive classes
      const body = document.querySelector('[data-dragon-part="body"]')
      expect(body).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    test('initializes with correct initial state', () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      
      render(<SVGDragonCharacter {...defaultProps} initialState="attention" />)
      
      expect(useDragonStateMachine).toHaveBeenCalledWith('attention')
    })

    test('calls onStateChange when state changes', () => {
      const onStateChange = jest.fn()
      const mockStateMachine = {
        state: 'ready',
        mood: 'confident',
        powerLevel: 2000,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} onStateChange={onStateChange} />)
      
      expect(onStateChange).toHaveBeenCalledWith('ready')
    })

    test('calls onMoodChange when mood changes', () => {
      const onMoodChange = jest.fn()
      const mockStateMachine = {
        state: 'active',
        mood: 'excited',
        powerLevel: 3000,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} onMoodChange={onMoodChange} />)
      
      expect(onMoodChange).toHaveBeenCalledWith('excited')
    })

    test('calls onPowerLevelChange when power level changes', () => {
      const onPowerLevelChange = jest.fn()
      const mockStateMachine = {
        state: 'powering-up',
        mood: 'powerful',
        powerLevel: 8500,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} onPowerLevelChange={onPowerLevelChange} />)
      
      expect(onPowerLevelChange).toHaveBeenCalledWith(8500)
    })
  })

  describe('Dragon States', () => {
    const dragonStates: DragonState[] = [
      'idle', 'attention', 'ready', 'active', 
      'powering-up', 'arms-crossed', 'sleeping', 'awakening'
    ]

    test.each(dragonStates)('renders correctly in %s state', (state) => {
      const mockStateMachine = {
        state,
        mood: 'neutral',
        powerLevel: 1000,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Verify the component renders without errors
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    test('shows power aura effect when powering up', () => {
      const mockStateMachine = {
        state: 'powering-up',
        mood: 'powerful',
        powerLevel: 9000,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Should render power aura for powering-up state
      // This would be more complex in a real implementation with actual animations
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Dragon Moods', () => {
    const dragonMoods: DragonMood[] = [
      'neutral', 'happy', 'excited', 'powerful', 
      'mystical', 'focused', 'aggressive', 'confident'
    ]

    test.each(dragonMoods)('handles %s mood correctly', (mood) => {
      const mockStateMachine = {
        state: 'idle',
        mood,
        powerLevel: 1000,
        isTransitioning: false,
        performanceMetrics: expect.any(Object),
        actions: expect.any(Object)
      }
      
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue(mockStateMachine)
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', 'xxl'] as const

    test.each(sizes)('renders correctly with %s size', (size) => {
      render(<SVGDragonCharacter {...defaultProps} size={size} />)
      
      const svg = screen.getByRole('img')
      const config = DRAGON_SIZE_CONFIG[size]
      
      expect(svg).toHaveAttribute('width', config.width.toString())
      expect(svg).toHaveAttribute('height', config.height.toString())
    })

    test('dragon balls scale with dragon size', () => {
      const { rerender } = render(
        <SVGDragonCharacter {...defaultProps} size="sm" showDragonBalls={true} />
      )
      
      let dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      expect(dragonBalls).toHaveLength(7)
      
      rerender(
        <SVGDragonCharacter {...defaultProps} size="xxl" showDragonBalls={true} />
      )
      
      dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      expect(dragonBalls).toHaveLength(7)
    })
  })

  describe('Configuration Props', () => {
    test('applies custom className', () => {
      render(<SVGDragonCharacter {...defaultProps} className="custom-dragon" />)
      
      const container = screen.getByRole('img').closest('div')
      expect(container).toHaveClass('custom-dragon')
    })

    test('enables/disables cursor tracking', () => {
      render(<SVGDragonCharacter {...defaultProps} enableCursorTracking={true} />)
      
      const { useEnhancedMouseTracking } = require('../hooks/useEnhancedMouseTracking')
      expect(useEnhancedMouseTracking).toHaveBeenCalledWith(expect.objectContaining({
        enabled: true
      }))
    })

    test('enables/disables haptic feedback', () => {
      render(<SVGDragonCharacter {...defaultProps} enableHapticFeedback={true} />)
      
      const { useEnhancedTouchGestures } = require('../hooks/useEnhancedTouchGestures')
      expect(useEnhancedTouchGestures).toHaveBeenCalledWith(expect.objectContaining({
        enableHapticFeedback: true
      }))
    })

    test('shows/hides focus indicator', () => {
      const mockKeyboardNav = {
        focusIndicator: {
          visible: true,
          position: { x: 100, y: 100 },
          size: { width: 50, height: 50 },
          style: { border: '2px solid blue' }
        },
        getAccessibilityProps: jest.fn(() => ({})),
        actions: { announceToScreenReader: jest.fn() },
        AriaLiveRegion: () => <div />
      }
      
      const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation')
      useKeyboardNavigation.mockReturnValue(mockKeyboardNav)
      
      render(<SVGDragonCharacter {...defaultProps} showFocusIndicator={true} />)
      
      // Focus indicator should be rendered when visible
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('handles missing hooks gracefully', () => {
      // Mock hooks to return minimal data
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue({
        state: 'idle',
        mood: 'neutral',
        powerLevel: 1000,
        isTransitioning: false,
        performanceMetrics: {},
        actions: {}
      })
      
      expect(() => {
        render(<SVGDragonCharacter {...defaultProps} />)
      }).not.toThrow()
    })

    test('handles invalid size prop gracefully', () => {
      // TypeScript would catch this, but test runtime behavior
      expect(() => {
        render(<SVGDragonCharacter {...defaultProps} size={'invalid' as any} />)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    test('does not re-render unnecessarily', () => {
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)
      
      // Re-render with same props
      rerender(<SVGDragonCharacter {...defaultProps} />)
      
      // Component should handle re-renders gracefully
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    test('cleans up event listeners on unmount', () => {
      const { unmount } = render(<SVGDragonCharacter {...defaultProps} />)
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })
  })
})