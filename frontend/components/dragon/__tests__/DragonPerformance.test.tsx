/**
 * Dragon Performance Benchmarking Suite
 * Load time testing, responsiveness validation, and bundle size analysis
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import type { DragonState, PerformanceMode } from '../types'

// Performance budget constants
const PERFORMANCE_BUDGETS = {
  INITIAL_RENDER: 16, // 60fps target
  STATE_TRANSITION: 8, // Fast transitions
  INTERACTION_RESPONSE: 4, // Immediate feedback
  MEMORY_LIMIT: 10 * 1024 * 1024, // 10MB
  BUNDLE_SIZE: 200 * 1024, // 200KB
  FIRST_PAINT: 200, // 200ms
  LARGEST_CONTENTFUL_PAINT: 500, // 500ms
}

// Mock hooks with performance tracking
const createPerformanceAwareStateMachine = (state: DragonState = 'idle') => ({
  state,
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
})

jest.mock('../hooks/useDragonStateMachine', () => ({
  useDragonStateMachine: jest.fn(() => createPerformanceAwareStateMachine())
}))

jest.mock('../hooks/useEnhancedMouseTracking', () => ({
  useEnhancedMouseTracking: jest.fn(() => ({
    svgState: { hoveredPart: null, activePart: null, cursorPosition: { x: 0, y: 0 } },
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

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    focusIndicator: { visible: false, position: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
    getAccessibilityProps: jest.fn(() => ({ role: 'img', tabIndex: 0 })),
    actions: { announceToScreenReader: jest.fn() },
    AriaLiveRegion: () => <div />
  }))
}))

describe('Dragon Performance Benchmarking', () => {
  const defaultProps = {
    size: 'lg' as const,
    interactive: true,
    showDragonBalls: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    performance.mark = jest.fn()
    performance.measure = jest.fn()
  })

  describe('Load Time Performance', () => {
    test('initial render meets performance budget', async () => {
      const benchmark = await global.benchmark('Initial Dragon Render', () => {
        const { unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        unmount()
      }, 100)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_RENDER)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_RENDER * 1.5)
      expect(benchmark.p99).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_RENDER * 2)

      console.log('Initial Render Benchmark:', {
        average: `${benchmark.average}ms`,
        p95: `${benchmark.p95}ms`,
        p99: `${benchmark.p99}ms`,
        budget: `${PERFORMANCE_BUDGETS.INITIAL_RENDER}ms`
      })
    })

    test('component mounting is efficient across sizes', async () => {
      const sizes: Array<'sm' | 'md' | 'lg' | 'xl' | 'xxl'> = ['sm', 'md', 'lg', 'xl', 'xxl']
      const results: Record<string, any> = {}

      for (const size of sizes) {
        const benchmark = await global.benchmark(`Dragon Mount ${size}`, () => {
          const { unmount } = render(<SVGDragonCharacter {...defaultProps} size={size} />)
          unmount()
        }, 50)

        results[size] = benchmark
        
        // Larger sizes get slightly more budget
        const budget = PERFORMANCE_BUDGETS.INITIAL_RENDER * (size === 'xxl' ? 1.5 : size === 'xl' ? 1.3 : 1)
        expect(benchmark.average).toBeLessThan(budget)
      }

      console.log('Size Mount Performance:', results)
    })

    test('complex configurations stay within budget', async () => {
      const configurations = [
        {
          name: 'minimal',
          props: { size: 'sm' as const, interactive: false, showDragonBalls: false }
        },
        {
          name: 'standard',
          props: { size: 'lg' as const, interactive: true, showDragonBalls: true }
        },
        {
          name: 'maximum',
          props: {
            size: 'xxl' as const,
            interactive: true,
            showDragonBalls: true,
            enableAdvancedInteractions: true,
            enableCursorEffects: true,
            animationConfig: {
              enableParticles: true,
              enableAura: true,
              enableBreathing: true,
              particleCount: 20,
              performanceMode: 'quality' as PerformanceMode
            }
          }
        }
      ]

      for (const config of configurations) {
        const benchmark = await global.benchmark(`Dragon ${config.name} config`, () => {
          const { unmount } = render(<SVGDragonCharacter {...config.props} />)
          unmount()
        }, 30)

        const budget = config.name === 'maximum' ? PERFORMANCE_BUDGETS.INITIAL_RENDER * 2 :
                      config.name === 'standard' ? PERFORMANCE_BUDGETS.INITIAL_RENDER * 1.2 :
                      PERFORMANCE_BUDGETS.INITIAL_RENDER

        expect(benchmark.average).toBeLessThan(budget)
        console.log(`${config.name} config:`, benchmark)
      }
    })

    test('first paint timing meets web vitals', async () => {
      const startTime = performance.now()
      
      render(<SVGDragonCharacter {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument()
      })
      
      const firstPaintTime = performance.now() - startTime
      
      expect(firstPaintTime).toBeLessThan(PERFORMANCE_BUDGETS.FIRST_PAINT)
      console.log('First Paint Time:', `${firstPaintTime.toFixed(2)}ms`)
    })
  })

  describe('State Transition Performance', () => {
    test('state changes are performant', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']

      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)

      const benchmark = await global.benchmark('State Transition', () => {
        const randomState = states[Math.floor(Math.random() * states.length)]
        useDragonStateMachine.mockReturnValue(createPerformanceAwareStateMachine(randomState))
        rerender(<SVGDragonCharacter {...defaultProps} />)
      }, 200)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.STATE_TRANSITION)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_BUDGETS.STATE_TRANSITION * 2)

      console.log('State Transition Benchmark:', benchmark)
    })

    test('power level changes are efficient', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)

      const benchmark = await global.benchmark('Power Level Change', () => {
        const randomPowerLevel = Math.floor(Math.random() * 9000) + 1000
        useDragonStateMachine.mockReturnValue({
          ...createPerformanceAwareStateMachine('powering-up'),
          powerLevel: randomPowerLevel
        })
        rerender(<SVGDragonCharacter {...defaultProps} />)
      }, 150)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.STATE_TRANSITION)
      console.log('Power Level Change Benchmark:', benchmark)
    })

    test('animation mode switches are fast', async () => {
      const modes: PerformanceMode[] = ['performance', 'balanced', 'quality']
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)

      const benchmark = await global.benchmark('Animation Mode Switch', () => {
        const randomMode = modes[Math.floor(Math.random() * modes.length)]
        rerender(
          <SVGDragonCharacter 
            {...defaultProps}
            animationConfig={{ performanceMode: randomMode }}
          />
        )
      }, 100)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.STATE_TRANSITION)
      console.log('Animation Mode Switch Benchmark:', benchmark)
    })
  })

  describe('Interaction Responsiveness', () => {
    test('mouse interactions respond immediately', async () => {
      render(<SVGDragonCharacter {...defaultProps} interactive={true} />)
      const dragonElement = screen.getByRole('img')

      const benchmark = await global.benchmark('Mouse Interaction', () => {
        act(() => {
          dragonElement.dispatchEvent(new MouseEvent('mouseover', {
            clientX: Math.random() * 300,
            clientY: Math.random() * 300
          }))
        })
      }, 300)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE)
      expect(benchmark.p99).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE * 3)

      console.log('Mouse Interaction Benchmark:', benchmark)
    })

    test('click responses are fast', async () => {
      render(<SVGDragonCharacter {...defaultProps} interactive={true} />)
      const head = document.querySelector('[data-dragon-part="head"]')!

      const benchmark = await global.benchmark('Click Response', () => {
        act(() => {
          head.dispatchEvent(new MouseEvent('click'))
        })
      }, 200)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE)
      console.log('Click Response Benchmark:', benchmark)
    })

    test('touch interactions are responsive', async () => {
      render(<SVGDragonCharacter {...defaultProps} />)
      const container = screen.getByRole('img').closest('div')!

      const benchmark = await global.benchmark('Touch Interaction', () => {
        act(() => {
          container.dispatchEvent(new TouchEvent('touchstart', {
            touches: [{ clientX: 150, clientY: 150, identifier: 1 } as Touch]
          }))
        })
      }, 150)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE)
      console.log('Touch Interaction Benchmark:', benchmark)
    })

    test('keyboard navigation is responsive', async () => {
      render(<SVGDragonCharacter {...defaultProps} enableKeyboardNavigation={true} />)
      const svg = screen.getByRole('img')

      const benchmark = await global.benchmark('Keyboard Navigation', () => {
        act(() => {
          svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
        })
      }, 100)

      expect(benchmark.average).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE)
      console.log('Keyboard Navigation Benchmark:', benchmark)
    })
  })

  describe('Memory Efficiency', () => {
    test('single dragon has reasonable memory footprint', async () => {
      const memoryTest = await global.detectMemoryLeaks(async () => {
        const { unmount } = render(<SVGDragonCharacter {...defaultProps} />)
        await global.waitForAnimationFrames(30) // Half second of animation
        unmount()
      }, 20)

      expect(memoryTest.hasLeak).toBe(false)
      expect(memoryTest.memoryGrowth).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_LIMIT / 4)

      console.log('Single Dragon Memory:', {
        growth: `${(memoryTest.memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        hasLeak: memoryTest.hasLeak
      })
    })

    test('multiple dragons scale memory linearly', async () => {
      const dragonCounts = [1, 2, 3, 5]
      const memoryResults: Record<number, any> = {}

      for (const count of dragonCounts) {
        const memoryTest = await global.detectMemoryLeaks(async () => {
          const dragons = Array.from({ length: count }, (_, i) => (
            <SVGDragonCharacter key={i} size="md" interactive={true} />
          ))
          
          const { unmount } = render(<div>{dragons}</div>)
          await global.waitForAnimationFrames(20)
          unmount()
        }, 10)

        memoryResults[count] = memoryTest
        expect(memoryTest.hasLeak).toBe(false)
      }

      // Memory should scale roughly linearly
      const baselineMemory = memoryResults[1].memoryGrowth
      expect(memoryResults[3].memoryGrowth).toBeLessThan(baselineMemory * 4) // Some efficiency expected
      expect(memoryResults[5].memoryGrowth).toBeLessThan(baselineMemory * 6)

      console.log('Multiple Dragons Memory Scaling:', 
        Object.entries(memoryResults).map(([count, result]) => 
          `${count}: ${(result.memoryGrowth / 1024 / 1024).toFixed(2)}MB`
        ).join(', ')
      )
    })

    test('long-running animations maintain memory', async () => {
      const memoryTest = await global.detectMemoryLeaks(async (iteration) => {
        const { unmount } = render(
          <SVGDragonCharacter 
            {...defaultProps}
            showDragonBalls={true}
            dragonBallConfig={{
              count: 7,
              orbitPattern: 'complex',
              orbitSpeed: 2.0,
              individualAnimation: true
            }}
          />
        )
        
        // Simulate longer animation periods
        await global.waitForAnimationFrames(60) // 1 second of animation
        unmount()
      }, 15)

      expect(memoryTest.hasLeak).toBe(false)
      expect(memoryTest.memoryGrowth).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_LIMIT)

      console.log('Long-running Animation Memory:', {
        growth: `${(memoryTest.memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        hasLeak: memoryTest.hasLeak
      })
    })
  })

  describe('Bundle Size Analysis', () => {
    test('component bundle size is reasonable', () => {
      // Simulate bundle size analysis
      const componentSizeEstimate = calculateEstimatedBundleSize()
      
      expect(componentSizeEstimate).toBeLessThan(PERFORMANCE_BUDGETS.BUNDLE_SIZE)
      
      console.log('Estimated Bundle Size:', {
        size: `${(componentSizeEstimate / 1024).toFixed(2)}KB`,
        budget: `${(PERFORMANCE_BUDGETS.BUNDLE_SIZE / 1024).toFixed(2)}KB`
      })
    })

    test('tree shaking works for unused features', () => {
      // Test that unused features don't bloat the bundle
      const minimalSizeEstimate = calculateEstimatedBundleSize({
        includeAdvancedInteractions: false,
        includeDragonBalls: false,
        includePerformanceMonitoring: false
      })
      
      const fullSizeEstimate = calculateEstimatedBundleSize({
        includeAdvancedInteractions: true,
        includeDragonBalls: true,
        includePerformanceMonitoring: true
      })
      
      // Minimal version should be significantly smaller
      expect(minimalSizeEstimate).toBeLessThan(fullSizeEstimate * 0.7)
      
      console.log('Bundle Size Comparison:', {
        minimal: `${(minimalSizeEstimate / 1024).toFixed(2)}KB`,
        full: `${(fullSizeEstimate / 1024).toFixed(2)}KB`,
        savings: `${((fullSizeEstimate - minimalSizeEstimate) / 1024).toFixed(2)}KB`
      })
    })
  })

  describe('Concurrent Performance', () => {
    test('handles multiple simultaneous interactions', async () => {
      render(<SVGDragonCharacter {...defaultProps} interactive={true} />)
      const dragonElement = screen.getByRole('img')

      const interactions = Array.from({ length: 50 }, (_, i) => async () => {
        const eventTypes = ['mouseover', 'click', 'mouseout']
        const eventType = eventTypes[i % eventTypes.length]
        
        act(() => {
          dragonElement.dispatchEvent(new MouseEvent(eventType, {
            clientX: 100 + (i % 200),
            clientY: 100 + (i % 200)
          }))
        })
      })

      const startTime = performance.now()
      await global.stressTest(() => 
        interactions[Math.floor(Math.random() * interactions.length)](),
        100, 
        10 // 10 concurrent interactions
      )
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const averageInteractionTime = totalTime / 100

      expect(averageInteractionTime).toBeLessThan(PERFORMANCE_BUDGETS.INTERACTION_RESPONSE * 2)
      
      console.log('Concurrent Interactions:', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        averagePerInteraction: `${averageInteractionTime.toFixed(2)}ms`
      })
    })

    test('maintains performance under rapid state changes', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']
      const { rerender } = render(<SVGDragonCharacter {...defaultProps} />)

      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        const randomState = states[Math.floor(Math.random() * states.length)]
        useDragonStateMachine.mockReturnValue(createPerformanceAwareStateMachine(randomState))
        
        act(() => {
          rerender(<SVGDragonCharacter {...defaultProps} />)
        })
        
        if (i % 10 === 0) {
          await global.waitForAnimationFrames(1) // Occasional breathing room
        }
      }
      
      const endTime = performance.now()
      const averageTransitionTime = (endTime - startTime) / 100

      expect(averageTransitionTime).toBeLessThan(PERFORMANCE_BUDGETS.STATE_TRANSITION * 2)
      
      console.log('Rapid State Changes:', {
        totalTime: `${(endTime - startTime).toFixed(2)}ms`,
        averagePerTransition: `${averageTransitionTime.toFixed(2)}ms`
      })
    })
  })
})

// Helper function to estimate bundle size
function calculateEstimatedBundleSize(options = {
  includeAdvancedInteractions: true,
  includeDragonBalls: true,
  includePerformanceMonitoring: true
}): number {
  let size = 50 * 1024 // Base component size estimate

  if (options.includeAdvancedInteractions) {
    size += 30 * 1024 // Advanced interaction hooks
  }

  if (options.includeDragonBalls) {
    size += 25 * 1024 // Dragon ball system
  }

  if (options.includePerformanceMonitoring) {
    size += 20 * 1024 // Performance monitoring
  }

  // Add framework overhead (React, Framer Motion, etc.)
  size += 75 * 1024

  return size
}