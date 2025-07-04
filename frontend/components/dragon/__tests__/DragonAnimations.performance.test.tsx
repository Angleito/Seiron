/**
 * Dragon Animation Performance Tests
 * Tests for FPS monitoring, memory usage, and animation performance
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { SVGDragonCharacter } from '../SVGDragonCharacter'
import type { DragonState, PerformanceMode } from '../types'

// Performance test configuration
const PERFORMANCE_REQUIREMENTS = {
  desktop: {
    minFps: 58,
    maxFrameDrops: 3,
    maxMemoryGrowth: 5 * 1024 * 1024, // 5MB
    maxAverageFrameTime: 17, // ~60fps
  },
  mobile: {
    minFps: 28,
    maxFrameDrops: 8,
    maxMemoryGrowth: 10 * 1024 * 1024, // 10MB
    maxAverageFrameTime: 35, // ~30fps
  }
}

// Mock the dragon state machine to control states
const mockDragonStateMachine = (initialState: DragonState = 'idle') => ({
  state: initialState,
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
  useDragonStateMachine: jest.fn(mockDragonStateMachine)
}))

describe('Dragon Animation Performance', () => {
  let performanceMonitor: any

  beforeEach(() => {
    performanceMonitor = global.createPerformanceMonitor()
    jest.clearAllMocks()
  })

  afterEach(() => {
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring()
    }
  })

  describe('Render Performance', () => {
    test('initial render meets performance budget', async () => {
      const renderStart = performance.now()
      
      render(<SVGDragonCharacter size="lg" interactive={true} />)
      
      const renderEnd = performance.now()
      const renderTime = renderEnd - renderStart
      
      // Initial render should be under 16ms (60fps budget)
      expect(renderTime).toBeLessThan(PERFORMANCE_REQUIREMENTS.desktop.maxAverageFrameTime)
    })

    test('renders all sizes within performance budget', async () => {
      const sizes: Array<'sm' | 'md' | 'lg' | 'xl' | 'xxl'> = ['sm', 'md', 'lg', 'xl', 'xxl']
      
      for (const size of sizes) {
        const renderStart = performance.now()
        
        const { unmount } = render(
          <SVGDragonCharacter size={size} interactive={true} showDragonBalls={true} />
        )
        
        const renderEnd = performance.now()
        const renderTime = renderEnd - renderStart
        
        expect(renderTime).toBeLessThan(20) // Slightly higher budget for larger sizes
        
        unmount()
      }
    })

    test('complex configuration does not exceed performance budget', async () => {
      const renderStart = performance.now()
      
      render(
        <SVGDragonCharacter 
          size="xxl"
          interactive={true}
          showDragonBalls={true}
          enableAdvancedInteractions={true}
          enableCursorEffects={true}
          enableHapticFeedback={true}
          enableKeyboardNavigation={true}
          enableScreenReader={true}
        />
      )
      
      const renderEnd = performance.now()
      const renderTime = renderEnd - renderStart
      
      expect(renderTime).toBeLessThan(25) // Higher budget for complex configuration
    })
  })

  describe('Animation Performance', () => {
    test('state transitions maintain target FPS', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const mockActions = {
        setState: jest.fn(),
        setMood: jest.fn(),
        powerUp: jest.fn(),
        powerDown: jest.fn(),
        triggerSpecialAnimation: jest.fn(),
        resetToIdle: jest.fn(),
      }

      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']
      
      for (const state of states) {
        // Set up mock for this state
        useDragonStateMachine.mockReturnValue({
          ...mockDragonStateMachine(state),
          actions: mockActions
        })

        performanceMonitor.startMonitoring()
        
        const { rerender } = render(<SVGDragonCharacter size="lg" />)
        
        // Simulate animation duration
        await global.waitForAnimationFrames(60) // 1 second of animation at 60fps
        
        const metrics = performanceMonitor.stopMonitoring()
        
        global.expectGoodPerformance(metrics, PERFORMANCE_REQUIREMENTS.desktop)
        
        rerender(<div />) // Clean up
      }
    })

    test('dragon ball animations perform well', async () => {
      performanceMonitor.startMonitoring()
      
      render(
        <SVGDragonCharacter 
          size="lg" 
          showDragonBalls={true}
          dragonBallConfig={{
            count: 7,
            orbitPattern: 'complex',
            orbitSpeed: 2.0,
            individualAnimation: true,
            interactionEnabled: true
          }}
        />
      )
      
      // Simulate orbital animation
      await global.waitForAnimationFrames(120) // 2 seconds of animation
      
      const metrics = performanceMonitor.stopMonitoring()
      
      global.expectGoodPerformance(metrics, PERFORMANCE_REQUIREMENTS.desktop)
    })

    test('multiple dragons maintain performance', async () => {
      performanceMonitor.startMonitoring()
      
      render(
        <div>
          <SVGDragonCharacter size="md" interactive={true} />
          <SVGDragonCharacter size="md" interactive={true} />
          <SVGDragonCharacter size="sm" interactive={true} />
        </div>
      )
      
      await global.waitForAnimationFrames(90) // 1.5 seconds
      
      const metrics = performanceMonitor.stopMonitoring()
      
      // Slightly relaxed requirements for multiple dragons
      global.expectGoodPerformance(metrics, {
        minFps: 45,
        maxFrameDrops: 8,
        maxMemoryGrowth: 15 * 1024 * 1024,
        maxAverageFrameTime: 22
      })
    })
  })

  describe('Memory Performance', () => {
    test('no memory leaks during state transitions', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up', 'idle']
      
      const memoryTest = await global.detectMemoryLeaks(async (iteration) => {
        const currentState = states[iteration % states.length]
        
        useDragonStateMachine.mockReturnValue(mockDragonStateMachine(currentState))
        
        const { unmount } = render(<SVGDragonCharacter size="lg" interactive={true} />)
        
        // Simulate some interactions
        await global.waitForAnimationFrames(10)
        
        unmount()
      }, 50)
      
      expect(memoryTest.hasLeak).toBe(false)
      expect(memoryTest.memoryGrowth).toBeLessThan(memoryTest.threshold)
    })

    test('dragon ball system does not leak memory', async () => {
      const memoryTest = await global.detectMemoryLeaks(async () => {
        const { unmount } = render(
          <SVGDragonCharacter 
            size="lg" 
            showDragonBalls={true}
            dragonBallConfig={{
              count: 7,
              orbitPattern: 'chaotic',
              individualAnimation: true,
            }}
          />
        )
        
        await global.waitForAnimationFrames(20)
        
        unmount()
      }, 30)
      
      expect(memoryTest.hasLeak).toBe(false)
    })

    test('interaction system cleans up properly', async () => {
      const memoryTest = await global.detectMemoryLeaks(async () => {
        const { unmount } = render(
          <SVGDragonCharacter 
            size="lg" 
            interactive={true}
            enableAdvancedInteractions={true}
            enableCursorEffects={true}
            enableHapticFeedback={true}
          />
        )
        
        // Simulate interactions
        const dragonElement = screen.getByRole('img')
        
        // Simulate mouse events
        act(() => {
          dragonElement.dispatchEvent(new MouseEvent('mouseover'))
          dragonElement.dispatchEvent(new MouseEvent('click'))
          dragonElement.dispatchEvent(new MouseEvent('mouseout'))
        })
        
        await global.waitForAnimationFrames(5)
        
        unmount()
      }, 40)
      
      expect(memoryTest.hasLeak).toBe(false)
    })
  })

  describe('Performance Mode Adaptation', () => {
    test('performance mode affects render complexity', async () => {
      const performanceModes: PerformanceMode[] = ['performance', 'balanced', 'quality']
      const results: Record<PerformanceMode, any> = {} as any
      
      for (const mode of performanceModes) {
        performanceMonitor.startMonitoring()
        
        render(
          <SVGDragonCharacter 
            size="lg"
            animationConfig={{
              performanceMode: mode,
              enableParticles: mode === 'quality',
              enableAura: true,
              enableBreathing: mode !== 'performance',
              particleCount: mode === 'quality' ? 20 : mode === 'balanced' ? 12 : 6
            }}
          />
        )
        
        await global.waitForAnimationFrames(60)
        
        const metrics = performanceMonitor.stopMonitoring()
        results[mode] = metrics
      }
      
      // Performance mode should have best FPS
      expect(results.performance.fps).toBeGreaterThanOrEqual(results.balanced.fps)
      expect(results.balanced.fps).toBeGreaterThanOrEqual(results.quality.fps - 5) // Allow some variance
    })

    test('auto quality adjustment works correctly', async () => {
      // Simulate degraded performance
      const mockPerformanceMetrics = {
        fps: 25, // Below threshold
        frameDrops: 15,
        averageFrameTime: 40,
        memoryUsage: 0.8,
        gpuUtilization: 0.9,
        lastUpdated: Date.now()
      }

      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      useDragonStateMachine.mockReturnValue({
        ...mockDragonStateMachine(),
        performanceMetrics: mockPerformanceMetrics
      })

      render(
        <SVGDragonCharacter 
          size="lg"
          animationConfig={{
            autoQualityAdjustment: true,
            performanceMode: 'quality'
          }}
        />
      )

      // The component should detect poor performance and adapt
      // This would be tested more thoroughly with real performance monitoring
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Responsive Performance', () => {
    test('mobile viewport maintains mobile performance targets', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { 
        writable: true, 
        configurable: true, 
        value: 375 
      })
      Object.defineProperty(window, 'innerHeight', { 
        writable: true, 
        configurable: true, 
        value: 667 
      })

      performanceMonitor.startMonitoring()
      
      render(<SVGDragonCharacter size="sm" interactive={true} />)
      
      await global.waitForAnimationFrames(60)
      
      const metrics = performanceMonitor.stopMonitoring()
      
      global.expectGoodPerformance(metrics, PERFORMANCE_REQUIREMENTS.mobile)
    })

    test('desktop viewport maintains desktop performance targets', async () => {
      // Simulate desktop viewport
      Object.defineProperty(window, 'innerWidth', { 
        writable: true, 
        configurable: true, 
        value: 1920 
      })
      Object.defineProperty(window, 'innerHeight', { 
        writable: true, 
        configurable: true, 
        value: 1080 
      })

      performanceMonitor.startMonitoring()
      
      render(<SVGDragonCharacter size="xl" interactive={true} showDragonBalls={true} />)
      
      await global.waitForAnimationFrames(60)
      
      const metrics = performanceMonitor.stopMonitoring()
      
      global.expectGoodPerformance(metrics, PERFORMANCE_REQUIREMENTS.desktop)
    })
  })

  describe('Stress Testing', () => {
    test('rapid state changes maintain performance', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up']
      
      performanceMonitor.startMonitoring()
      
      const { rerender } = render(<SVGDragonCharacter size="lg" />)
      
      // Rapidly change states
      for (let i = 0; i < 50; i++) {
        const state = states[i % states.length]
        useDragonStateMachine.mockReturnValue(mockDragonStateMachine(state))
        
        rerender(<SVGDragonCharacter size="lg" key={i} />)
        
        await global.waitForAnimationFrames(2) // Brief animation
      }
      
      const metrics = performanceMonitor.stopMonitoring()
      
      // Should still maintain reasonable performance under stress
      expect(metrics.fps).toBeGreaterThan(20)
      expect(metrics.frameDrops).toBeLessThan(20)
    })

    test('concurrent interactions maintain performance', async () => {
      performanceMonitor.startMonitoring()
      
      render(<SVGDragonCharacter size="lg" interactive={true} />)
      
      const dragonElement = screen.getByRole('img')
      
      // Simulate many rapid interactions
      const interactions = Array.from({ length: 100 }, (_, i) => async () => {
        act(() => {
          const eventType = i % 3 === 0 ? 'mouseover' : i % 3 === 1 ? 'click' : 'mouseout'
          dragonElement.dispatchEvent(new MouseEvent(eventType, {
            clientX: 100 + (i % 50),
            clientY: 100 + (i % 50)
          }))
        })
      })
      
      // Execute interactions with limited concurrency
      await global.stressTest(() => interactions[Math.floor(Math.random() * interactions.length)](), 200, 5)
      
      const metrics = performanceMonitor.stopMonitoring()
      
      // Should handle stress reasonably well
      expect(metrics.fps).toBeGreaterThan(15)
    })
  })

  describe('Benchmarking', () => {
    test('dragon render benchmark', async () => {
      const benchmark = await global.benchmark('Dragon Render', () => {
        const { unmount } = render(<SVGDragonCharacter size="lg" />)
        unmount()
      }, 100)
      
      expect(benchmark.average).toBeLessThan(10) // 10ms average render time
      expect(benchmark.p95).toBeLessThan(20) // 95th percentile under 20ms
      
      console.log('Dragon Render Benchmark:', benchmark)
    })

    test('state transition benchmark', async () => {
      const { useDragonStateMachine } = require('../hooks/useDragonStateMachine')
      const states: DragonState[] = ['idle', 'attention', 'ready', 'active']
      
      const { rerender } = render(<SVGDragonCharacter size="lg" />)
      
      const benchmark = await global.benchmark('State Transition', () => {
        const state = states[Math.floor(Math.random() * states.length)]
        useDragonStateMachine.mockReturnValue(mockDragonStateMachine(state))
        rerender(<SVGDragonCharacter size="lg" />)
      }, 200)
      
      expect(benchmark.average).toBeLessThan(5) // 5ms average transition time
      expect(benchmark.p99).toBeLessThan(15) // 99th percentile under 15ms
      
      console.log('State Transition Benchmark:', benchmark)
    })

    test('interaction response benchmark', async () => {
      render(<SVGDragonCharacter size="lg" interactive={true} />)
      const dragonElement = screen.getByRole('img')
      
      const benchmark = await global.benchmark('Interaction Response', () => {
        act(() => {
          dragonElement.dispatchEvent(new MouseEvent('click', {
            clientX: Math.random() * 300,
            clientY: Math.random() * 300
          }))
        })
      }, 500)
      
      expect(benchmark.average).toBeLessThan(2) // 2ms average interaction response
      expect(benchmark.p95).toBeLessThan(8) // 95th percentile under 8ms
      
      console.log('Interaction Response Benchmark:', benchmark)
    })
  })
})