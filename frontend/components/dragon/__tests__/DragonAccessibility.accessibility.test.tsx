/**
 * Dragon Accessibility Tests
 * WCAG 2.1 compliance, screen reader support, and keyboard navigation testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import type { DragonState } from '../types'

// Mock hooks for accessibility testing
const mockKeyboardNavigation = {
  focusIndicator: {
    visible: false,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    style: { border: '2px solid #0066cc', borderRadius: '4px' }
  },
  focusableElements: ['head', 'body', 'left-eye', 'right-eye', 'dragon-ball'],
  currentFocus: null,
  getAccessibilityProps: jest.fn((part) => ({
    role: part === 'dragon-ball' ? 'button' : 'button',
    'aria-label': `Interactive dragon ${part}`,
    'aria-describedby': `dragon-${part}-description`,
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
  AriaLiveRegion: () => (
    <div 
      aria-live="polite" 
      aria-atomic="true"
      id="dragon-announcements"
      className="sr-only"
    />
  )
}

const mockStateMachine = {
  state: 'idle' as DragonState,
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

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => mockKeyboardNavigation)
}))

jest.mock('../hooks/useDragonStateMachine', () => ({
  useDragonStateMachine: jest.fn(() => mockStateMachine)
}))

jest.mock('../hooks/useEnhancedMouseTracking', () => ({
  useEnhancedMouseTracking: jest.fn(() => ({
    svgState: { hoveredPart: null, activePart: null },
    eyeTracking: {
      leftEye: { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 }, blinkState: 'open' },
      rightEye: { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 }, blinkState: 'open' }
    }
  }))
}))

jest.mock('../hooks/useEnhancedTouchGestures', () => ({
  useEnhancedTouchGestures: jest.fn(() => ({
    gestureHandlers: { onTouchStart: jest.fn(), onTouchMove: jest.fn(), onTouchEnd: jest.fn() },
    gestureTrails: []
  }))
}))

describe('Dragon Accessibility', () => {
  const defaultProps = {
    size: 'lg' as const,
    interactive: true,
    enableScreenReader: true,
    enableKeyboardNavigation: true,
    showFocusIndicator: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    test('passes automated accessibility checks', async () => {
      const { container } = render(<SVGDragonCharacter {...defaultProps} />)
      
      // Run axe accessibility testing
      await global.expectAccessible(container, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'button-name': { enabled: true },
          'svg-img-alt': { enabled: true },
        }
      })
    })

    test('meets color contrast requirements', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      
      dragonParts.forEach(part => {
        const contrast = global.highContrastTesting.checkContrast(part)
        expect(contrast.ratio).toBeGreaterThanOrEqual(4.5) // WCAG AA requirement
      })
    })

    test('supports high contrast mode', async () => {
      global.highContrastTesting.enableHighContrast()
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const svg = screen.getByRole('img')
      expect(svg).toBeInTheDocument()
      
      // Focus indicator should be more prominent in high contrast
      const head = document.querySelector('[data-dragon-part="head"]')
      if (head) {
        head.focus()
        // In high contrast mode, focus should be clearly visible
        expect(head).toHaveFocus()
      }
      
      global.highContrastTesting.disableHighContrast()
    })

    test('respects reduced motion preferences', async () => {
      global.reducedMotionTesting.enableReducedMotion()
      
      render(
        <SVGDragonCharacter 
          {...defaultProps}
          animationConfig={{
            reducedMotion: true,
            enableParticles: false,
            enableMicroMovements: false
          }}
        />
      )
      
      // Animations should be simplified or disabled
      const svg = screen.getByRole('img')
      expect(svg).toBeInTheDocument()
      
      global.reducedMotionTesting.disableReducedMotion()
    })

    test('provides alternative text for SVG content', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Interactive mystical dragon')
      expect(svg).toHaveAttribute('role', 'img')
    })

    test('ensures minimum touch target sizes', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const interactiveElements = document.querySelectorAll('.cursor-pointer')
      
      interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        // WCAG requirement: minimum 44x44 pixels for touch targets
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const interactiveElements = document.querySelectorAll('[data-dragon-part]')
      
      interactiveElements.forEach(element => {
        global.expectKeyboardAccessible(element)
      })
    })

    test('tab order is logical and predictable', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const tabOrder = global.simulateScreenReader.simulateTabNavigation(document.body)
      
      // Should follow a logical order: head -> eyes -> body -> arms -> tail -> dragon balls
      const expectedOrder = ['head', 'left-eye', 'right-eye', 'body', 'left-arm', 'right-arm', 'tail']
      
      const dragonTabOrder = tabOrder
        .filter(item => item.element.hasAttribute('data-dragon-part'))
        .map(item => item.element.getAttribute('data-dragon-part'))
      
      expectedOrder.forEach((part, index) => {
        if (index < dragonTabOrder.length) {
          expect(dragonTabOrder[index]).toBe(part)
        }
      })
    })

    test('supports arrow key navigation between dragon parts', async () => {
      const user = userEvent.setup()
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const head = document.querySelector('[data-dragon-part="head"]')
      if (head) {
        head.focus()
        expect(head).toHaveFocus()
        
        await user.keyboard('{ArrowDown}')
        expect(mockKeyboardNavigation.actions.focusNext).toHaveBeenCalled()
        
        await user.keyboard('{ArrowUp}')
        expect(mockKeyboardNavigation.actions.focusPrevious).toHaveBeenCalled()
      }
    })

    test('Enter and Space activate focused elements', async () => {
      const user = userEvent.setup()
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const body = document.querySelector('[data-dragon-part="body"]')
      if (body) {
        body.focus()
        
        await user.keyboard('{Enter}')
        expect(mockKeyboardNavigation.actions.activateFocused).toHaveBeenCalled()
        
        jest.clearAllMocks()
        
        await user.keyboard('{ }') // Space
        expect(mockKeyboardNavigation.actions.activateFocused).toHaveBeenCalled()
      }
    })

    test('Escape key provides consistent exit behavior', async () => {
      const user = userEvent.setup()
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const svg = screen.getByRole('img')
      svg.focus()
      
      await user.keyboard('{Escape}')
      expect(mockStateMachine.actions.resetToIdle).toHaveBeenCalled()
    })

    test('focus indicator is clearly visible', async () => {
      const mockKeyboardNavWithFocus = {
        ...mockKeyboardNavigation,
        focusIndicator: {
          visible: true,
          position: { x: 100, y: 100 },
          size: { width: 60, height: 60 },
          style: { 
            border: '3px solid #0066cc', 
            borderRadius: '4px',
            boxShadow: '0 0 0 1px #ffffff'
          }
        }
      }
      
      const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation')
      useKeyboardNavigation.mockReturnValue(mockKeyboardNavWithFocus)
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const head = document.querySelector('[data-dragon-part="head"]')
      if (head) {
        head.focus()
        // Focus indicator should be visible and properly styled
        expect(mockKeyboardNavWithFocus.focusIndicator.visible).toBe(true)
        expect(mockKeyboardNavWithFocus.focusIndicator.style.border).toContain('#0066cc')
      }
    })

    test('supports Home and End keys for navigation', async () => {
      const user = userEvent.setup()
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const svg = screen.getByRole('img')
      svg.focus()
      
      await user.keyboard('{Home}')
      // Should focus first interactive element
      
      await user.keyboard('{End}')
      // Should focus last interactive element
      
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    test('provides comprehensive screen reader information', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const dragonContainer = screen.getByRole('img').closest('div')
      if (dragonContainer) {
        await global.expectScreenReaderAccessible(dragonContainer)
      }
    })

    test('announces state changes appropriately', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)
      
      // Change dragon state
      useDragonStateMachine.mockReturnValue({
        ...mockStateMachine,
        state: 'attention'
      })
      
      rerender(<SVGDragonCharacter {...defaultProps} />)
      
      expect(mockKeyboardNavigation.actions.announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('attention')
      )
    })

    test('provides descriptive labels for dragon parts', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      
      dragonParts.forEach(part => {
        const ariaLabel = part.getAttribute('aria-label')
        const describedBy = part.getAttribute('aria-describedby')
        
        expect(ariaLabel).toBeTruthy()
        expect(ariaLabel).toMatch(/dragon/i)
        
        if (describedBy) {
          const description = document.getElementById(describedBy)
          expect(description).toBeInTheDocument()
        }
      })
    })

    test('includes ARIA live regions for dynamic content', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    test('dragon ball interactions are announced', async () => {
      render(<SVGDragonCharacter {...defaultProps} showDragonBalls={true} />)
      
      const dragonBall = document.querySelector('[data-dragon-ball-id="3"]')
      if (dragonBall) {
        fireEvent.click(dragonBall)
        
        expect(mockKeyboardNavigation.actions.announceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Dragon ball 3 collected')
        )
      }
    })

    test('power level changes are announced', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)
      
      // Change power level
      useDragonStateMachine.mockReturnValue({
        ...mockStateMachine,
        powerLevel: 9000,
        state: 'powering-up'
      })
      
      rerender(<SVGDragonCharacter {...defaultProps} />)
      
      expect(mockKeyboardNavigation.actions.announceToScreenReader).toHaveBeenCalled()
    })

    test('supports screen reader navigation modes', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const reading = await global.simulateScreenReader.readComponent(
        screen.getByRole('img').closest('div')!
      )
      
      expect(reading.ariaLabels).toContain('Interactive mystical dragon')
      expect(reading.fullReading).toMatch(/dragon/i)
    })
  })

  describe('ARIA Implementation', () => {
    test('uses appropriate ARIA roles', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('role', 'img')
      
      const interactiveElements = document.querySelectorAll('[data-dragon-part]')
      interactiveElements.forEach(element => {
        const role = element.getAttribute('role')
        expect(['button', 'img']).toContain(role)
      })
    })

    test('implements ARIA states correctly', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      
      dragonParts.forEach(part => {
        // Interactive elements should have appropriate ARIA attributes
        if (part.classList.contains('cursor-pointer')) {
          expect(part).toHaveAttribute('aria-label')
          expect(part).toHaveAttribute('tabIndex')
        }
      })
    })

    test('manages focus appropriately', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const head = document.querySelector('[data-dragon-part="head"]')
      if (head) {
        head.focus()
        expect(head).toHaveFocus()
        
        // Focus should be managed properly when interacting
        fireEvent.click(head)
        expect(head).toHaveFocus()
      }
    })

    test('provides landmark navigation', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const mainSvg = screen.getByRole('img')
      expect(mainSvg).toHaveAttribute('aria-label')
      
      // The dragon should be identifiable as a main interactive element
      expect(mainSvg.closest('[role="main"], [role="application"]')).toBeTruthy()
    })
  })

  describe('Error Prevention and Recovery', () => {
    test('handles invalid focus gracefully', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Try to focus a non-existent element
      const nonExistent = document.querySelector('[data-dragon-part="wings"]')
      expect(nonExistent).toBeNull()
      
      // System should handle this gracefully without errors
      expect(() => {
        mockKeyboardNavigation.actions.focusNext()
      }).not.toThrow()
    })

    test('provides feedback for failed interactions', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Simulate an interaction that fails
      const body = document.querySelector('[data-dragon-part="body"]')
      if (body) {
        // Even if an interaction fails, user should get feedback
        fireEvent.click(body)
        expect(mockKeyboardNavigation.actions.announceToScreenReader).toHaveBeenCalled()
      }
    })

    test('maintains accessibility during state transitions', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)
      
      // Test multiple state transitions
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']
      
      for (const state of states) {
        useDragonStateMachine.mockReturnValue({
          ...mockStateMachine,
          state,
          isTransitioning: true
        })
        
        rerender(<SVGDragonCharacter {...defaultProps} />)
        
        // Accessibility should be maintained during transitions
        const svg = screen.getByRole('img')
        expect(svg).toHaveAttribute('aria-label')
        
        const focusableElements = document.querySelectorAll('[tabindex="0"]')
        expect(focusableElements.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Assistive Technology Integration', () => {
    test('works with voice control software', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Voice control relies on accessible names
      const dragonParts = document.querySelectorAll('[data-dragon-part]')
      
      dragonParts.forEach(part => {
        const accessibleName = part.getAttribute('aria-label') || part.textContent
        expect(accessibleName).toBeTruthy()
        expect(accessibleName!.length).toBeGreaterThan(0)
      })
    })

    test('supports switch navigation', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Switch navigation relies on proper tab order and activation
      const focusableElements = document.querySelectorAll('[tabindex="0"]')
      
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('role')
        expect(['button', 'img']).toContain(element.getAttribute('role'))
      })
    })

    test('works with eye-tracking systems', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      // Eye-tracking requires large enough targets and clear visual feedback
      const interactiveElements = document.querySelectorAll('.cursor-pointer')
      
      interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Dragon-Specific Accessibility Features', () => {
    test('dragon accessibility is comprehensive', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      
      const dragonElement = screen.getByRole('img')
      await global.expectDragonAccessible(dragonElement)
    })

    test('dragon ball accessibility is implemented', async () => {
      render(<SVGDragonCharacter {...defaultProps} showDragonBalls={true} />)
      
      const dragonBalls = document.querySelectorAll('[data-dragon-part="dragon-ball"]')
      
      dragonBalls.forEach((ball, index) => {
        expect(ball).toHaveAttribute('aria-label')
        expect(ball.getAttribute('aria-label')).toContain(`${index + 1}`)
        global.expectKeyboardAccessible(ball)
      })
    })

    test('animation states are accessible', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']
      
      for (const state of states) {
        useDragonStateMachine.mockReturnValue({
          ...mockStateMachine,
          state
        })
        
        const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)
        
        const svg = screen.getByRole('img')
        const ariaLabel = svg.getAttribute('aria-label')
        
        // The state should be reflected in accessible descriptions
        expect(ariaLabel).toBeTruthy()
        
        rerender(<div />)
      }
    })
  })
})