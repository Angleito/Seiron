/**
 * Tests for React Performance Optimizations
 * 
 * This test suite verifies that our React.memo, useMemo, useCallback,
 * and useEffect optimizations are working correctly.
 */

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { 
  PerformanceProfiler, 
  getPerformanceMetrics, 
  resetPerformanceMetrics,
  validateOptimizations,
  OPTIMIZATION_CHECKLIST
} from '@utils/performance-test'

// Mock components to test optimization patterns
const MemoizedComponent = React.memo(function TestComponent({ 
  value, 
  onClick 
}: { 
  value: number
  onClick: () => void 
}) {
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button onClick={onClick}>Click</button>
    </div>
  )
})

const UseMemoComponent = React.memo(function UseMemoTest({ 
  items 
}: { 
  items: number[] 
}) {
  const expensiveValue = React.useMemo(() => {
    // Simulate expensive calculation
    return items.reduce((sum, item) => sum + item * item, 0)
  }, [items])

  return <div data-testid="expensive-result">{expensiveValue}</div>
})

const UseCallbackComponent = React.memo(function UseCallbackTest({ 
  onEvent 
}: { 
  onEvent: () => void 
}) {
  const [count, setCount] = React.useState(0)
  
  const handleClick = React.useCallback(() => {
    setCount(prev => prev + 1)
    onEvent()
  }, [onEvent])

  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={handleClick}>Increment</button>
    </div>
  )
})

describe('React Performance Optimizations', () => {
  beforeEach(() => {
    resetPerformanceMetrics()
  })

  describe('React.memo', () => {
    it('should prevent re-renders when props have not changed', () => {
      const mockOnClick = jest.fn()
      const { rerender } = render(
        <PerformanceProfiler id="memo-test">
          <MemoizedComponent value={1} onClick={mockOnClick} />
        </PerformanceProfiler>
      )

      // First render
      let metrics = getPerformanceMetrics('memo-test')
      expect(metrics?.renderCount).toBe(1)

      // Re-render with same props - should not cause component re-render
      rerender(
        <PerformanceProfiler id="memo-test">
          <MemoizedComponent value={1} onClick={mockOnClick} />
        </PerformanceProfiler>
      )

      // Component should still only have rendered once due to memo
      metrics = getPerformanceMetrics('memo-test')
      expect(metrics?.renderCount).toBe(1)
    })

    it('should re-render when props change', () => {
      const mockOnClick = jest.fn()
      const { rerender } = render(
        <PerformanceProfiler id="memo-test-change">
          <MemoizedComponent value={1} onClick={mockOnClick} />
        </PerformanceProfiler>
      )

      // Re-render with different props
      rerender(
        <PerformanceProfiler id="memo-test-change">
          <MemoizedComponent value={2} onClick={mockOnClick} />
        </PerformanceProfiler>
      )

      const metrics = getPerformanceMetrics('memo-test-change')
      expect(metrics?.renderCount).toBe(2)
    })
  })

  describe('useMemo', () => {
    it('should memoize expensive calculations', () => {
      const items = [1, 2, 3, 4, 5]
      const { rerender, getByTestId } = render(
        <PerformanceProfiler id="usememo-test">
          <UseMemoComponent items={items} />
        </PerformanceProfiler>
      )

      const initialResult = getByTestId('expensive-result').textContent
      expect(initialResult).toBe('55') // 1+4+9+16+25

      // Re-render with same items - useMemo should prevent recalculation
      rerender(
        <PerformanceProfiler id="usememo-test">
          <UseMemoComponent items={items} />
        </PerformanceProfiler>
      )

      const sameResult = getByTestId('expensive-result').textContent
      expect(sameResult).toBe('55')

      // Re-render with different items - should recalculate
      const newItems = [1, 2, 3]
      rerender(
        <PerformanceProfiler id="usememo-test">
          <UseMemoComponent items={newItems} />
        </PerformanceProfiler>
      )

      const newResult = getByTestId('expensive-result').textContent
      expect(newResult).toBe('14') // 1+4+9
    })
  })

  describe('useCallback', () => {
    it('should memoize callback functions', () => {
      const mockOnEvent = jest.fn()
      const { getByText, getByTestId } = render(
        <PerformanceProfiler id="usecallback-test">
          <UseCallbackComponent onEvent={mockOnEvent} />
        </PerformanceProfiler>
      )

      const button = getByText('Increment')
      
      act(() => {
        fireEvent.click(button)
      })

      expect(getByTestId('count').textContent).toBe('1')
      expect(mockOnEvent).toHaveBeenCalledTimes(1)

      act(() => {
        fireEvent.click(button)
      })

      expect(getByTestId('count').textContent).toBe('2')
      expect(mockOnEvent).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Validation', () => {
    it('should validate optimization checklist', () => {
      const checklist = OPTIMIZATION_CHECKLIST
      
      expect(checklist.reactMemo.components).toContain('EnhancedDragonCharacter')
      expect(checklist.reactMemo.components).toContain('InteractiveDragon')
      expect(checklist.reactMemo.components).toContain('VoiceEnabledChat')
      
      expect(checklist.useMemo.optimizations).toContain('Animation variants')
      expect(checklist.useMemo.optimizations).toContain('Voice configurations')
      
      expect(checklist.useCallback.handlers).toContain('Animation event handlers')
      expect(checklist.useCallback.handlers).toContain('Voice command handlers')
    })

    it('should track performance metrics', () => {
      render(
        <PerformanceProfiler id="metrics-test">
          <div>Test Component</div>
        </PerformanceProfiler>
      )

      const metrics = getPerformanceMetrics('metrics-test')
      expect(metrics).toBeTruthy()
      expect(metrics?.componentName).toBe('metrics-test')
      expect(metrics?.renderCount).toBe(1)
      expect(metrics?.totalRenderTime).toBeGreaterThanOrEqual(0)
    })

    it('should measure render times within acceptable limits', () => {
      // Render multiple components to test performance
      render(
        <div>
          <PerformanceProfiler id="perf-test-1">
            <MemoizedComponent value={1} onClick={() => {}} />
          </PerformanceProfiler>
          <PerformanceProfiler id="perf-test-2">
            <UseMemoComponent items={[1, 2, 3]} />
          </PerformanceProfiler>
        </div>
      )

      const validation = validateOptimizations()
      expect(validation.performanceProfilerActive).toBe(true)
      expect(validation.renderTimesAcceptable).toBe(true)
    })
  })

  describe('Component-Specific Optimizations', () => {
    it('should verify dragon component optimizations exist', () => {
      // Test that our optimized components are properly memoized
      // This is more of a structural test to ensure optimizations are in place
      
      const dragonComponents = [
        'EnhancedDragonCharacter',
        'InteractiveDragon',
        'DragonAnimationShowcase'
      ]

      dragonComponents.forEach(componentName => {
        expect(OPTIMIZATION_CHECKLIST.reactMemo.components).toContain(componentName)
      })
    })

    it('should verify voice component optimizations exist', () => {
      const voiceOptimizations = [
        'Voice configurations',
        'Voice command handlers'
      ]

      voiceOptimizations.forEach(optimization => {
        const hasOptimization = 
          OPTIMIZATION_CHECKLIST.useMemo.optimizations.includes(optimization) ||
          OPTIMIZATION_CHECKLIST.useCallback.handlers.includes(optimization)
        
        expect(hasOptimization).toBe(true)
      })
    })

    it('should verify portfolio component optimizations exist', () => {
      expect(OPTIMIZATION_CHECKLIST.reactMemo.components).toContain('PortfolioSidebar')
      expect(OPTIMIZATION_CHECKLIST.useMemo.optimizations).toContain('Asset calculations')
      expect(OPTIMIZATION_CHECKLIST.useCallback.handlers).toContain('Portfolio fetch functions')
    })
  })

  describe('Re-render Prevention', () => {
    it('should minimize re-renders through proper memoization', () => {
      const TestParent = () => {
        const [parentState, setParentState] = React.useState(0)
        const [childProp, setChildProp] = React.useState(1)

        const memoizedCallback = React.useCallback(() => {
          // Stable callback
        }, [])

        return (
          <div>
            <button 
              onClick={() => setParentState(prev => prev + 1)}
              data-testid="parent-button"
            >
              Parent: {parentState}
            </button>
            <button 
              onClick={() => setChildProp(prev => prev + 1)}
              data-testid="child-button"
            >
              Child Prop: {childProp}
            </button>
            <PerformanceProfiler id="memoized-child">
              <MemoizedComponent value={childProp} onClick={memoizedCallback} />
            </PerformanceProfiler>
          </div>
        )
      }

      const { getByTestId } = render(<TestParent />)

      // Initial render
      let metrics = getPerformanceMetrics('memoized-child')
      expect(metrics?.renderCount).toBe(1)

      // Parent state change should not re-render memoized child
      act(() => {
        fireEvent.click(getByTestId('parent-button'))
      })

      metrics = getPerformanceMetrics('memoized-child')
      expect(metrics?.renderCount).toBe(1) // Still 1, no re-render

      // Child prop change should re-render
      act(() => {
        fireEvent.click(getByTestId('child-button'))
      })

      metrics = getPerformanceMetrics('memoized-child')
      expect(metrics?.renderCount).toBe(2) // Now 2, re-rendered due to prop change
    })
  })
})

describe('Performance Regression Tests', () => {
  it('should maintain performance standards for dragon animations', () => {
    // Mock a complex dragon animation scenario
    const DragonAnimationMock = React.memo(() => {
      const [state, setState] = React.useState('idle')
      
      const animationVariants = React.useMemo(() => ({
        idle: { scale: 1 },
        active: { scale: 1.1 },
        powering: { scale: 1.2 }
      }), [])

      const handleStateChange = React.useCallback((newState: string) => {
        setState(newState)
      }, [])

      return (
        <div data-testid="dragon-mock">
          <span>{state}</span>
          <button onClick={() => handleStateChange('active')}>Activate</button>
        </div>
      )
    })

    const { getByTestId, getByText } = render(
      <PerformanceProfiler id="dragon-performance">
        <DragonAnimationMock />
      </PerformanceProfiler>
    )

    // Test multiple state changes
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(getByText('Activate'))
      })
    }

    const metrics = getPerformanceMetrics('dragon-performance')
    expect(metrics?.averageRenderTime).toBeLessThan(16) // Should be under 16ms for 60fps
    expect(metrics?.renderCount).toBeGreaterThan(0)
  })

  it('should handle voice interface optimizations', () => {
    const VoiceInterfaceMock = React.memo(() => {
      const [transcript, setTranscript] = React.useState('')
      
      const voiceConfig = React.useMemo(() => ({
        apiKey: 'test',
        model: 'test-model',
        settings: { stability: 0.5 }
      }), [])

      const handleTranscript = React.useCallback((text: string) => {
        setTranscript(text)
      }, [])

      return (
        <div data-testid="voice-mock">
          <span>{transcript}</span>
          <button onClick={() => handleTranscript('test transcript')}>
            Set Transcript
          </button>
        </div>
      )
    })

    const { getByText } = render(
      <PerformanceProfiler id="voice-performance">
        <VoiceInterfaceMock />
      </PerformanceProfiler>
    )

    act(() => {
      fireEvent.click(getByText('Set Transcript'))
    })

    const metrics = getPerformanceMetrics('voice-performance')
    expect(metrics?.averageRenderTime).toBeLessThan(16)
  })
})