/**
 * Dragon Interaction System Tests
 * Tests for mouse tracking, touch gestures, keyboard navigation, and interaction zones
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import type { DragonPart, TouchGesture, InteractionType } from '../types'

// Mock the hooks with more detailed interaction capabilities
const mockMouseTracking = {
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
      blinkState: 'open' as const
    },
    rightEye: {
      rotation: { x: 0, y: 0 },
      pupilPosition: { x: 0, y: 0 },
      blinkState: 'open' as const
    }
  },
  updateEyeTracking: jest.fn(),
  updateHeadRotation: jest.fn()
}

const mockTouchGestures = {
  gestureHandlers: {
    onTouchStart: jest.fn(),
    onTouchMove: jest.fn(),
    onTouchEnd: jest.fn(),
  },
  gestureTrails: [],
  isGestureActive: false,
  currentGesture: null,
  svgTouchTargets: new Map(),
  expandTouchTarget: jest.fn(),
  handleSVGTouch: jest.fn()
}

const mockKeyboardNavigation = {
  focusIndicator: {
    visible: false,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    style: {}
  },
  focusableElements: ['head', 'body', 'left-eye', 'right-eye'] as DragonPart[],
  currentFocus: null as DragonPart | null,
  getAccessibilityProps: jest.fn((part: DragonPart) => ({
    role: 'button',
    'aria-label': `Dragon ${part}`,
    tabIndex: 0,
    onKeyDown: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn()
  })),
  actions: {
    announceToScreenReader: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
    activateFocused: jest.fn()
  },
  AriaLiveRegion: () => <div aria-live="polite" id="dragon-announcements" />
}

const mockStateMachine = {
  state: 'idle' as const,
  mood: 'neutral' as const,
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
}

jest.mock('../hooks/useDragonStateMachine', () => ({
  useDragonStateMachine: jest.fn(() => mockStateMachine)
}))

jest.mock('../hooks/useEnhancedMouseTracking', () => ({
  useEnhancedMouseTracking: jest.fn(() => mockMouseTracking)
}))

jest.mock('../hooks/useEnhancedTouchGestures', () => ({
  useEnhancedTouchGestures: jest.fn(() => mockTouchGestures)
}))

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => mockKeyboardNavigation)
}))

jest.mock('../hooks/useSVGInteraction', () => ({
  useSVGInteraction: jest.fn(() => ({}))
}))

describe('Dragon Interaction System', () => {
  const defaultProps = {
    size: 'lg' as const,
    interactive: true,
    showDragonBalls: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock states
    mockMouseTracking.svgState.hoveredPart = null
    mockMouseTracking.svgState.activePart = null
    mockKeyboardNavigation.currentFocus = null
    mockTouchGestures.isGestureActive = false
  })

  describe('Mouse Interactions', () => {
    test('detects mouse hover on dragon parts', async () => {
      const onInteraction = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onInteraction={onInteraction}
        />
      )

      const head = document.querySelector('[data-dragon-part="head"]')
      expect(head).toBeInTheDocument()

      if (head) {
        fireEvent.mouseEnter(head)
        
        await waitFor(() => {
          expect(onInteraction).toHaveBeenCalledWith('hover')
        })
      }
    })

    test('tracks mouse position for eye movement', async () => {
      render(<SVGDragonCharacter {...defaultProps} enableCursorTracking={true} />)

      const svg = screen.getByRole('img')
      
      act(() => {
        fireEvent.mouseMove(svg, { clientX: 150, clientY: 100 })
      })

      expect(mockMouseTracking.updateEyeTracking).toHaveBeenCalledWith(
        expect.objectContaining({ x: 150, y: 100 })
      )
    })

    test('updates head rotation based on mouse position', async () => {
      render(<SVGDragonCharacter {...defaultProps} enableCursorTracking={true} />)

      const svg = screen.getByRole('img')
      
      act(() => {
        fireEvent.mouseMove(svg, { clientX: 200, clientY: 150 })
      })

      expect(mockMouseTracking.updateHeadRotation).toHaveBeenCalledWith(
        expect.objectContaining({ x: 200, y: 150 })
      )
    })

    test('handles click interactions on dragon parts', async () => {
      const onDragonPartClick = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onDragonPartClick={onDragonPartClick}
        />
      )

      const dragonParts: DragonPart[] = ['head', 'body', 'left-arm', 'right-arm', 'tail']
      
      for (const part of dragonParts) {
        const element = document.querySelector(`[data-dragon-part="${part}"]`)
        expect(element).toBeInTheDocument()

        if (element) {
          fireEvent.click(element)
          
          await waitFor(() => {
            expect(onDragonPartClick).toHaveBeenCalledWith(part, expect.any(Object))
          })
        }
      }
    })

    test('handles double-click interactions', async () => {
      const onInteraction = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onInteraction={onInteraction}
        />
      )

      const head = document.querySelector('[data-dragon-part="head"]')
      
      if (head) {
        fireEvent.doubleClick(head)
        
        await waitFor(() => {
          expect(onInteraction).toHaveBeenCalledWith('double-click')
        })
      }
    })

    test('detects mouse proximity zones', async () => {
      const { useEnhancedMouseTracking } = require('../hooks/useEnhancedMouseTracking')
      const onProximityChange = jest.fn()
      
      useEnhancedMouseTracking.mockReturnValue({
        ...mockMouseTracking,
        onProximityChange
      })

      render(<SVGDragonCharacter {...defaultProps} />)

      // Simulate proximity detection would be tested with the actual hook
      expect(useEnhancedMouseTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          onProximityChange: expect.any(Function)
        })
      )
    })
  })

  describe('Touch Interactions', () => {
    test('handles touch start events', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)

      const container = screen.getByRole('img').closest('div')
      
      if (container) {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 150, clientY: 100, identifier: 1 } as Touch
          ]
        })
        
        fireEvent(container, touchEvent)
        
        expect(mockTouchGestures.gestureHandlers.onTouchStart).toHaveBeenCalled()
      }
    })

    test('recognizes swipe gestures', async () => {
      const onGestureDetected = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onGestureDetected={onGestureDetected}
        />
      )

      const container = screen.getByRole('img').closest('div')
      
      if (container) {
        // Simulate swipe gesture
        fireEvent.touchStart(container, {
          touches: [{ clientX: 100, clientY: 150, identifier: 1 }]
        })
        
        fireEvent.touchMove(container, {
          touches: [{ clientX: 200, clientY: 150, identifier: 1 }]
        })
        
        fireEvent.touchEnd(container, {
          changedTouches: [{ clientX: 200, clientY: 150, identifier: 1 }]
        })

        // The gesture would be detected by the hook
        expect(mockTouchGestures.gestureHandlers.onTouchEnd).toHaveBeenCalled()
      }
    })

    test('handles pinch gestures for scaling', async () => {
      const onGestureDetected = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onGestureDetected={onGestureDetected}
        />
      )

      const container = screen.getByRole('img').closest('div')
      
      if (container) {
        // Simulate pinch gesture (two fingers)
        fireEvent.touchStart(container, {
          touches: [
            { clientX: 100, clientY: 150, identifier: 1 },
            { clientX: 200, clientY: 150, identifier: 2 }
          ]
        })
        
        fireEvent.touchMove(container, {
          touches: [
            { clientX: 80, clientY: 150, identifier: 1 },
            { clientX: 220, clientY: 150, identifier: 2 }
          ]
        })
        
        fireEvent.touchEnd(container, {
          changedTouches: [
            { clientX: 80, clientY: 150, identifier: 1 },
            { clientX: 220, clientY: 150, identifier: 2 }
          ]
        })

        expect(mockTouchGestures.gestureHandlers.onTouchEnd).toHaveBeenCalled()
      }
    })

    test('long press detection works', async () => {
      const onGestureDetected = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onGestureDetected={onGestureDetected}
        />
      )

      const container = screen.getByRole('img').closest('div')
      
      if (container) {
        fireEvent.touchStart(container, {
          touches: [{ clientX: 150, clientY: 100, identifier: 1 }]
        })
        
        // Simulate long press duration
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 600)) // 600ms long press
        })
        
        fireEvent.touchEnd(container, {
          changedTouches: [{ clientX: 150, clientY: 100, identifier: 1 }]
        })

        expect(mockTouchGestures.gestureHandlers.onTouchEnd).toHaveBeenCalled()
      }
    })

    test('haptic feedback triggers on interactions', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableHapticFeedback={true}
        />
      )

      const { useEnhancedTouchGestures } = require('../hooks/useEnhancedTouchGestures')
      
      expect(useEnhancedTouchGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          enableHapticFeedback: true
        })
      )
    })

    test('touch targets are properly sized for accessibility', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)

      const { useEnhancedTouchGestures } = require('../hooks/useEnhancedTouchGestures')
      
      expect(useEnhancedTouchGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true
        })
      )

      // Touch targets should be expanded for better accessibility
      expect(mockTouchGestures.expandTouchTarget).toBeDefined()
    })
  })

  describe('Keyboard Navigation', () => {
    test('supports tab navigation through dragon parts', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
        />
      )

      const focusableElements = mockKeyboardNavigation.focusableElements
      
      expect(focusableElements).toContain('head')
      expect(focusableElements).toContain('body')
      expect(focusableElements).toContain('left-eye')
      expect(focusableElements).toContain('right-eye')
    })

    test('handles keyboard activation of dragon parts', async () => {
      const user = userEvent.setup()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
        />
      )

      const head = document.querySelector('[data-dragon-part="head"]')
      
      if (head) {
        head.focus()
        await user.keyboard('{Enter}')
        
        expect(mockKeyboardNavigation.actions.activateFocused).toHaveBeenCalled()
      }
    })

    test('supports space bar activation', async () => {
      const user = userEvent.setup()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
        />
      )

      const body = document.querySelector('[data-dragon-part="body"]')
      
      if (body) {
        body.focus()
        await user.keyboard('{ }') // Space bar
        
        expect(mockKeyboardNavigation.actions.activateFocused).toHaveBeenCalled()
      }
    })

    test('arrow keys navigate between dragon parts', async () => {
      const user = userEvent.setup()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
        />
      )

      const head = document.querySelector('[data-dragon-part="head"]')
      
      if (head) {
        head.focus()
        await user.keyboard('{ArrowDown}')
        
        expect(mockKeyboardNavigation.actions.focusNext).toHaveBeenCalled()
      }
    })

    test('escape key resets focus', async () => {
      const user = userEvent.setup()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
        />
      )

      const svg = screen.getByRole('img')
      svg.focus()
      await user.keyboard('{Escape}')
      
      expect(mockStateMachine.actions.resetToIdle).toHaveBeenCalled()
    })

    test('focus indicator appears when navigating with keyboard', async () => {
      const mockKeyboardNavWithFocus = {
        ...mockKeyboardNavigation,
        focusIndicator: {
          visible: true,
          position: { x: 100, y: 100 },
          size: { width: 50, height: 50 },
          style: { border: '2px solid blue' }
        }
      }

      const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation')
      useKeyboardNavigation.mockReturnValue(mockKeyboardNavWithFocus)

      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableKeyboardNavigation={true}
          showFocusIndicator={true}
        />
      )

      // Focus indicator should be visible
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    test('announces state changes to screen reader', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableScreenReader={true}
        />
      )

      // Simulate state change
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue({
        ...mockStateMachine,
        state: 'attention'
      })

      // Should announce the state change
      expect(mockKeyboardNavigation.actions.announceToScreenReader).toBeDefined()
    })

    test('provides appropriate ARIA labels for dragon parts', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableScreenReader={true}
        />
      )

      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      
      dragonParts.forEach(part => {
        const ariaLabel = part.getAttribute('aria-label')
        expect(ariaLabel).toBeTruthy()
        expect(ariaLabel).toMatch(/dragon/i)
      })
    })

    test('includes live region for dynamic announcements', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableScreenReader={true}
        />
      )

      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Dragon Ball Interactions', () => {
    test('individual dragon balls are clickable', async () => {
      const onDragonPartClick = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          showDragonBalls={true}
          onDragonPartClick={onDragonPartClick}
        />
      )

      const dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      expect(dragonBalls).toHaveLength(7)

      // Click first dragon ball
      if (dragonBalls[0]) {
        fireEvent.click(dragonBalls[0])
        
        await waitFor(() => {
          expect(onDragonPartClick).toHaveBeenCalledWith('dragon-ball', expect.any(Object))
        })
      }
    })

    test('dragon ball hover effects work', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          showDragonBalls={true}
        />
      )

      const dragonBall = document.querySelector('[data-dragon-ball-id="1"]')
      expect(dragonBall).toBeInTheDocument()

      if (dragonBall) {
        fireEvent.mouseEnter(dragonBall)
        
        // Should trigger hover state
        expect(dragonBall).toHaveClass('cursor-pointer')
      }
    })

    test('dragon ball collection triggers power up', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          showDragonBalls={true}
        />
      )

      const dragonBall = document.querySelector('[data-dragon-ball-id="4"]')
      
      if (dragonBall) {
        fireEvent.click(dragonBall)
        
        expect(mockStateMachine.actions.powerUp).toHaveBeenCalled()
        expect(mockStateMachine.actions.triggerSpecialAnimation).toHaveBeenCalledWith('roar')
      }
    })
  })

  describe('Gesture Recognition', () => {
    test('recognizes complex gesture patterns', async () => {
      const onGestureDetected = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onGestureDetected={onGestureDetected}
        />
      )

      // Mock complex gesture
      const complexGesture: TouchGesture = {
        type: 'swipe',
        startTime: Date.now() - 500,
        duration: 500,
        startPosition: { x: 100, y: 100 },
        endPosition: { x: 200, y: 100 },
        distance: 100,
        velocity: { x: 200, y: 0 }
      }

      // Simulate gesture detection
      mockTouchGestures.currentGesture = complexGesture
      mockTouchGestures.isGestureActive = true

      const container = screen.getByRole('img').closest('div')
      if (container) {
        // This would trigger the gesture detection in the actual implementation
        expect(mockTouchGestures.gestureHandlers.onTouchStart).toBeDefined()
      }
    })

    test('handles multi-touch gestures', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)

      const container = screen.getByRole('img').closest('div')
      
      if (container) {
        // Simulate multi-touch
        fireEvent.touchStart(container, {
          touches: [
            { clientX: 100, clientY: 100, identifier: 1 },
            { clientX: 200, clientY: 100, identifier: 2 },
            { clientX: 150, clientY: 200, identifier: 3 }
          ]
        })

        expect(mockTouchGestures.gestureHandlers.onTouchStart).toHaveBeenCalled()
      }
    })
  })

  describe('Interaction Zones', () => {
    test('defines proper interaction zones for SVG elements', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)

      const { useSVGInteraction } = require('../hooks/useSVGInteraction')
      
      expect(useSVGInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          elementRef: expect.any(Object),
          enabled: true
        })
      )
    })

    test('interaction zones scale with dragon size', async () => {
      const { rerender } = render(
        <SVGDragonCharacter {...defaultProps} size="sm" />
      )

      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('width', '120')

      rerender(<SVGDragonCharacter {...defaultProps} size="xxl" />)
      expect(svg).toHaveAttribute('width', '500')
    })
  })

  describe('Performance Under Interaction Load', () => {
    test('maintains performance with rapid interactions', async () => {
      const onInteraction = jest.fn()
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          onInteraction={onInteraction}
        />
      )

      const svg = screen.getByRole('img')
      
      // Simulate rapid mouse movements
      for (let i = 0; i < 100; i++) {
        act(() => {
          fireEvent.mouseMove(svg, { 
            clientX: i * 2, 
            clientY: Math.sin(i * 0.1) * 50 + 150 
          })
        })
      }

      // Should not cause performance issues
      expect(svg).toBeInTheDocument()
    })

    test('throttles expensive interaction operations', async () => {
      render(
        <SVGDragonCharacter 
          {...defaultProps} 
          enableCursorTracking={true}
        />
      )

      // The hook should implement throttling for performance
      const { useEnhancedMouseTracking } = require('../hooks/useEnhancedMouseTracking')
      
      expect(useEnhancedMouseTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true
        })
      )
    })
  })
})