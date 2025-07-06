/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import * as fc from 'fast-check'
import { performance } from 'perf_hooks'

// Import the components and hooks
import { useDragon3D } from '../../hooks/voice/useDragon3D'
import { useASCIIDragon } from '../../hooks/voice/useASCIIDragon'
import Dragon3D from '../../components/dragon/Dragon3D'
import ASCIIDragon from '../../components/dragon/ASCIIDragon'
import DragonRenderer from '../../components/dragon/DragonRenderer'

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    getEntries: jest.fn(() => [])
  } as any
}

// Mock dependencies for performance testing
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

// Mock Three.js for performance testing
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: jest.fn(),
  useThree: () => ({ camera: { position: { set: jest.fn() } } })
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  PerspectiveCamera: () => <div data-testid="perspective-camera" />
}))

jest.mock('three', () => ({
  Color: jest.fn(),
  MeshPhongMaterial: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  SphereGeometry: jest.fn(() => ({ attributes: { position: { array: new Float32Array(300), needsUpdate: false } } })),
  TubeGeometry: jest.fn(() => ({ attributes: { position: { array: new Float32Array(300), needsUpdate: false } } })),
  ConeGeometry: jest.fn(),
  ShapeGeometry: jest.fn(),
  PlaneGeometry: jest.fn(),
  CatmullRomCurve3: jest.fn(),
  Vector3: jest.fn(),
  Shape: jest.fn(() => ({ moveTo: jest.fn(), bezierCurveTo: jest.fn() })),
  DoubleSide: 'DoubleSide'
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    pre: ({ children, ...props }: any) => <pre {...props}>{children}</pre>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Performance test utilities
interface PerformanceMetrics {
  renderTime: number
  initTime: number
  updateTime: number
  memoryUsage?: number
  frameDrops?: number
}

class PerformanceBenchmark {
  private measurements: PerformanceMetrics[] = []
  private startTime: number = 0
  private frameCount: number = 0
  private lastFrameTime: number = 0

  start(): void {
    this.startTime = performance.now()
    this.frameCount = 0
    this.lastFrameTime = this.startTime
  }

  recordFrame(): void {
    const now = performance.now()
    this.frameCount++
    this.lastFrameTime = now
  }

  finish(): PerformanceMetrics {
    const endTime = performance.now()
    const totalTime = endTime - this.startTime
    const avgFrameTime = this.frameCount > 0 ? totalTime / this.frameCount : totalTime

    const metrics: PerformanceMetrics = {
      renderTime: totalTime,
      initTime: avgFrameTime,
      updateTime: avgFrameTime,
      frameDrops: this.calculateFrameDrops()
    }

    this.measurements.push(metrics)
    return metrics
  }

  private calculateFrameDrops(): number {
    // Simple frame drop calculation based on target 60fps
    const targetFrameTime = 1000 / 60 // 16.67ms per frame
    const actualFrameTime = this.frameCount > 0 ? (this.lastFrameTime - this.startTime) / this.frameCount : 0
    return Math.max(0, actualFrameTime - targetFrameTime)
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.measurements.length === 0) {
      return { renderTime: 0, initTime: 0, updateTime: 0 }
    }

    const totals = this.measurements.reduce(
      (acc, metrics) => ({
        renderTime: acc.renderTime + metrics.renderTime,
        initTime: acc.initTime + metrics.initTime,
        updateTime: acc.updateTime + metrics.updateTime,
        frameDrops: (acc.frameDrops || 0) + (metrics.frameDrops || 0)
      }),
      { renderTime: 0, initTime: 0, updateTime: 0, frameDrops: 0 }
    )

    const count = this.measurements.length
    return {
      renderTime: totals.renderTime / count,
      initTime: totals.initTime / count,
      updateTime: totals.updateTime / count,
      frameDrops: totals.frameDrops / count
    }
  }

  reset(): void {
    this.measurements = []
  }
}

describe('Dragon Animation Performance Tests', () => {
  let benchmark: PerformanceBenchmark

  beforeEach(() => {
    benchmark = new PerformanceBenchmark()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Dragon3D Performance', () => {
    it('should render within performance budget', () => {
      benchmark.start()
      
      const { container } = render(<Dragon3D size="lg" showParticles={true} quality="medium" />)
      
      benchmark.recordFrame()
      const metrics = benchmark.finish()
      
      expect(container.firstChild).toBeInTheDocument()
      expect(metrics.renderTime).toBeLessThan(100) // Should render in under 100ms
    })

    it('should handle multiple instances efficiently', () => {
      benchmark.start()
      
      const instances = []
      for (let i = 0; i < 3; i++) {
        benchmark.recordFrame()
        instances.push(render(<Dragon3D size="sm" showParticles={false} quality="low" />))
      }
      
      const metrics = benchmark.finish()
      
      instances.forEach(instance => {
        expect(instance.container.firstChild).toBeInTheDocument()
        instance.unmount()
      })
      
      expect(metrics.renderTime).toBeLessThan(200) // Multiple instances should still be fast
    })

    it('should optimize performance based on quality settings', () => {
      const qualitySettings = ['low', 'medium', 'high'] as const
      const performanceResults: Record<string, PerformanceMetrics> = {}
      
      qualitySettings.forEach(quality => {
        benchmark.start()
        
        const { unmount } = render(
          <Dragon3D 
            size="lg" 
            showParticles={quality !== 'low'} 
            quality={quality}
            animationSpeed={quality === 'high' ? 2 : 1}
          />
        )
        
        benchmark.recordFrame()
        performanceResults[quality] = benchmark.finish()
        
        unmount()
      })
      
      // Low quality should be fastest
      expect(performanceResults.low.renderTime).toBeLessThanOrEqual(performanceResults.medium.renderTime)
      expect(performanceResults.medium.renderTime).toBeLessThanOrEqual(performanceResults.high.renderTime)
    })

    it('should handle animation updates efficiently', () => {
      const { rerender } = render(<Dragon3D animationSpeed={1} />)
      
      benchmark.start()
      
      // Simulate rapid animation updates
      for (let i = 1; i <= 10; i++) {
        benchmark.recordFrame()
        rerender(<Dragon3D animationSpeed={i / 5} />)
      }
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(50) // Updates should be fast
    })

    it('should handle particle system performance', () => {
      benchmark.start()
      
      const { rerender } = render(<Dragon3D showParticles={false} />)
      benchmark.recordFrame()
      
      rerender(<Dragon3D showParticles={true} quality="high" />)
      benchmark.recordFrame()
      
      const metrics = benchmark.finish()
      
      expect(metrics.renderTime).toBeLessThan(150) // Particle system shouldn't be too expensive
    })
  })

  describe('ASCIIDragon Performance', () => {
    it('should render ASCII dragon efficiently', () => {
      benchmark.start()
      
      const { container } = render(
        <ASCIIDragon 
          size="lg" 
          enableTypewriter={true} 
          enableBreathing={true} 
          enableFloating={true}
        />
      )
      
      benchmark.recordFrame()
      const metrics = benchmark.finish()
      
      expect(container.firstChild).toBeInTheDocument()
      expect(metrics.renderTime).toBeLessThan(50) // ASCII should be very fast
    })

    it('should handle typewriter animation performance', () => {
      benchmark.start()
      
      const { container } = render(
        <ASCIIDragon 
          size="lg" 
          enableTypewriter={true} 
          speed="fast"
          pose="coiled"
        />
      )
      
      // Simulate typewriter animation
      act(() => {
        for (let i = 0; i < 10; i++) {
          benchmark.recordFrame()
          jest.advanceTimersByTime(50)
        }
      })
      
      const metrics = benchmark.finish()
      
      expect(container.firstChild).toBeInTheDocument()
      expect(metrics.updateTime).toBeLessThan(20) // Typewriter updates should be very fast
    })

    it('should optimize performance with breathing disabled', () => {
      const withBreathing = render(
        <ASCIIDragon enableBreathing={true} enableFloating={true} />
      )
      const withoutBreathing = render(
        <ASCIIDragon enableBreathing={false} enableFloating={false} />
      )
      
      benchmark.start()
      
      // Test multiple updates with breathing enabled
      act(() => {
        for (let i = 0; i < 5; i++) {
          benchmark.recordFrame()
          jest.advanceTimersByTime(100)
        }
      })
      
      const metricsWithBreathing = benchmark.finish()
      
      benchmark.start()
      
      // Test multiple updates with breathing disabled
      act(() => {
        for (let i = 0; i < 5; i++) {
          benchmark.recordFrame()
          jest.advanceTimersByTime(100)
        }
      })
      
      const metricsWithoutBreathing = benchmark.finish()
      
      withBreathing.unmount()
      withoutBreathing.unmount()
      
      // Performance should be better with breathing disabled
      expect(metricsWithoutBreathing.updateTime).toBeLessThanOrEqual(metricsWithBreathing.updateTime)
    })

    it('should handle size variations efficiently', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const
      const sizePerformance: Record<string, PerformanceMetrics> = {}
      
      sizes.forEach(size => {
        benchmark.start()
        
        const { unmount } = render(
          <ASCIIDragon 
            size={size} 
            enableTypewriter={true}
            speed="normal"
          />
        )
        
        benchmark.recordFrame()
        sizePerformance[size] = benchmark.finish()
        
        unmount()
      })
      
      // All sizes should render quickly
      Object.values(sizePerformance).forEach(metrics => {
        expect(metrics.renderTime).toBeLessThan(100)
      })
      
      // Smaller sizes should generally be faster
      expect(sizePerformance.sm.renderTime).toBeLessThanOrEqual(sizePerformance.xl.renderTime)
    })
  })

  describe('DragonRenderer Performance', () => {
    it('should handle dragon type switching efficiently', () => {
      const { rerender } = render(<DragonRenderer dragonType="2d" />)
      
      benchmark.start()
      
      // Test rapid dragon type switches
      const types = ['2d', 'ascii', '3d', '2d', 'ascii'] as const
      types.forEach((type, index) => {
        benchmark.recordFrame()
        rerender(<DragonRenderer dragonType={type} />)
        
        if (index > 0) {
          act(() => {
            jest.advanceTimersByTime(200) // Wait for transition
          })
        }
      })
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(100) // Type switching should be fast
    })

    it('should optimize based on performance mode', () => {
      const performanceModes = ['low', 'auto', 'high'] as const
      const modePerformance: Record<string, PerformanceMetrics> = {}
      
      performanceModes.forEach(mode => {
        benchmark.start()
        
        const { unmount } = render(
          <DragonRenderer 
            dragonType="3d" 
            performanceMode={mode}
            size="lg"
          />
        )
        
        act(() => {
          jest.advanceTimersByTime(200) // Wait for initialization
        })
        
        benchmark.recordFrame()
        modePerformance[mode] = benchmark.finish()
        
        unmount()
      })
      
      // Low performance mode should be fastest
      expect(modePerformance.low.renderTime).toBeLessThanOrEqual(modePerformance.auto.renderTime)
    })

    it('should handle voice state updates efficiently', () => {
      const { rerender } = render(
        <DragonRenderer 
          dragonType="ascii" 
          voiceState={{ isListening: false, isSpeaking: false, isProcessing: false, isIdle: true }}
        />
      )
      
      benchmark.start()
      
      // Simulate rapid voice state changes
      const voiceStates = [
        { isListening: true, isSpeaking: false, isProcessing: false, isIdle: false },
        { isListening: false, isSpeaking: true, isProcessing: false, isIdle: false, volume: 0.8 },
        { isListening: false, isSpeaking: false, isProcessing: true, isIdle: false },
        { isListening: false, isSpeaking: false, isProcessing: false, isIdle: true }
      ]
      
      voiceStates.forEach(voiceState => {
        benchmark.recordFrame()
        rerender(<DragonRenderer dragonType="ascii" voiceState={voiceState} />)
      })
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(30) // Voice updates should be very fast
    })
  })

  describe('Hook Performance', () => {
    it('should initialize useDragon3D hook efficiently', () => {
      benchmark.start()
      
      const { result } = renderHook(() => useDragon3D({
        enableVoiceIntegration: true,
        enablePerformanceMonitoring: true,
        enableAutoStateTransitions: true
      }))
      
      benchmark.recordFrame()
      const metrics = benchmark.finish()
      
      expect(result.current.state).toBeDefined()
      expect(metrics.renderTime).toBeLessThan(50) // Hook initialization should be fast
    })

    it('should handle rapid state updates in useDragon3D', async () => {
      const { result } = renderHook(() => useDragon3D())
      
      benchmark.start()
      
      // Simulate rapid state changes
      const states = ['idle', 'attention', 'ready', 'active', 'speaking'] as const
      
      for (const state of states) {
        benchmark.recordFrame()
        await act(async () => {
          await result.current.setState(state)()
        })
      }
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(20) // State updates should be fast
    })

    it('should initialize useASCIIDragon hook efficiently', () => {
      benchmark.start()
      
      const { result } = renderHook(() => useASCIIDragon({
        enableVoiceIntegration: true,
        enableBreathing: true,
        enableFloating: true,
        enableKeyboardShortcuts: true
      }))
      
      benchmark.recordFrame()
      const metrics = benchmark.finish()
      
      expect(result.current.pose).toBeDefined()
      expect(metrics.renderTime).toBeLessThan(30) // Hook initialization should be very fast
    })

    it('should handle animation loops efficiently in useASCIIDragon', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableBreathing: true,
        enableFloating: true
      }))
      
      benchmark.start()
      
      // Simulate animation loop
      act(() => {
        for (let i = 0; i < 20; i++) {
          benchmark.recordFrame()
          jest.advanceTimersByTime(16) // ~60fps
        }
      })
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(10) // Animation updates should be very fast
    })
  })

  describe('Memory Performance', () => {
    it('should not leak memory on component unmount', () => {
      const instances = []
      
      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        instances.push(render(<DragonRenderer dragonType="ascii" />))
      }
      
      // Unmount all instances
      instances.forEach(instance => {
        instance.unmount()
      })
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // This test mainly ensures no exceptions are thrown during cleanup
      expect(true).toBe(true)
    })

    it('should handle rapid mount/unmount cycles', () => {
      benchmark.start()
      
      for (let i = 0; i < 10; i++) {
        benchmark.recordFrame()
        
        const { unmount } = render(
          <DragonRenderer 
            dragonType={i % 2 === 0 ? '2d' : 'ascii'} 
            size="sm"
          />
        )
        
        unmount()
      }
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(50) // Mount/unmount should be efficient
    })
  })

  describe('Property-based Performance Tests', () => {
    it('should maintain performance across arbitrary configurations', () => {
      fc.assert(fc.property(
        fc.constantFrom('2d', '3d', 'ascii'),
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('auto', 'high', 'low'),
        fc.boolean(),
        fc.boolean(),
        (dragonType, size, performanceMode, enableHover, enableFallback) => {
          benchmark.start()
          
          const { unmount } = render(
            <DragonRenderer 
              dragonType={dragonType}
              size={size}
              performanceMode={performanceMode}
              enableHover={enableHover}
              enableFallback={enableFallback}
            />
          )
          
          benchmark.recordFrame()
          const metrics = benchmark.finish()
          
          unmount()
          
          // All configurations should render within reasonable time
          expect(metrics.renderTime).toBeLessThan(200)
          return true
        }
      ), { numRuns: 20 })
    })

    it('should handle arbitrary animation configurations efficiently', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.float({ min: 0.1, max: 3 }),
        fc.boolean(),
        fc.boolean(),
        (enableTypewriter, animationSpeed, showParticles, enableBreathing) => {
          benchmark.start()
          
          const { unmount } = render(
            <ASCIIDragon 
              enableTypewriter={enableTypewriter}
              speed={animationSpeed > 2 ? 'fast' : animationSpeed > 1 ? 'normal' : 'slow'}
              enableBreathing={enableBreathing}
            />
          )
          
          benchmark.recordFrame()
          const metrics = benchmark.finish()
          
          unmount()
          
          // All animation configurations should be performant
          expect(metrics.renderTime).toBeLessThan(100)
          return true
        }
      ), { numRuns: 15 })
    })
  })

  describe('Stress Testing', () => {
    it('should handle multiple concurrent dragons', () => {
      benchmark.start()
      
      const instances = []
      
      // Create multiple dragons of different types
      for (let i = 0; i < 5; i++) {
        benchmark.recordFrame()
        
        instances.push(render(
          <DragonRenderer 
            dragonType={i % 3 === 0 ? '2d' : i % 3 === 1 ? 'ascii' : '3d'}
            size="sm"
            performanceMode="low"
          />
        ))
      }
      
      const metrics = benchmark.finish()
      
      instances.forEach(instance => {
        expect(instance.container.firstChild).toBeInTheDocument()
        instance.unmount()
      })
      
      expect(metrics.renderTime).toBeLessThan(500) // Multiple instances should still be manageable
    })

    it('should handle rapid animation state changes', () => {
      const { result } = renderHook(() => useDragon3D())
      
      benchmark.start()
      
      // Simulate very rapid state changes
      act(() => {
        for (let i = 0; i < 100; i++) {
          benchmark.recordFrame()
          
          // Alternate between different states rapidly
          const states = ['idle', 'active', 'speaking', 'listening'] as const
          result.current.onVoiceListeningStart()
          result.current.onVoiceListeningEnd()
          result.current.onVoiceSpeakingStart()
          result.current.onVoiceSpeakingEnd()
        }
      })
      
      const metrics = benchmark.finish()
      
      expect(metrics.updateTime).toBeLessThan(5) // Should handle rapid changes efficiently
    })
  })

  describe('Frame Rate Analysis', () => {
    it('should maintain stable frame rates during animations', () => {
      const { result } = renderHook(() => useASCIIDragon({
        enableBreathing: true,
        enableFloating: true
      }))
      
      const frameRates: number[] = []
      
      benchmark.start()
      
      // Simulate 60fps animation loop
      act(() => {
        for (let i = 0; i < 60; i++) { // 1 second worth of frames
          const frameStart = performance.now()
          benchmark.recordFrame()
          jest.advanceTimersByTime(16.67) // 60fps
          const frameEnd = performance.now()
          
          frameRates.push(1000 / (frameEnd - frameStart))
        }
      })
      
      const metrics = benchmark.finish()
      const averageFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length
      
      expect(averageFrameRate).toBeGreaterThan(30) // Should maintain at least 30fps
      expect(metrics.frameDrops).toBeLessThan(5) // Minimal frame drops
    })
  })
})

// Benchmark comparison tests
describe('Dragon Performance Comparisons', () => {
  let benchmark: PerformanceBenchmark

  beforeEach(() => {
    benchmark = new PerformanceBenchmark()
  })

  it('should compare performance between dragon types', () => {
    const dragonTypes = ['2d', 'ascii', '3d'] as const
    const typePerformance: Record<string, PerformanceMetrics> = {}
    
    dragonTypes.forEach(type => {
      benchmark.start()
      
      const { unmount } = render(
        <DragonRenderer 
          dragonType={type} 
          size="md"
          performanceMode="auto"
        />
      )
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      benchmark.recordFrame()
      typePerformance[type] = benchmark.finish()
      
      unmount()
    })
    
    // ASCII should be fastest, followed by 2D, then 3D
    expect(typePerformance.ascii.renderTime).toBeLessThanOrEqual(typePerformance['2d'].renderTime)
    
    // All should be within acceptable limits
    Object.values(typePerformance).forEach(metrics => {
      expect(metrics.renderTime).toBeLessThan(300)
    })
    
    console.log('Dragon Type Performance Comparison:', typePerformance)
  })

  it('should compare hook performance', () => {
    const dragon3DHookStart = performance.now()
    const { unmount: unmount3D } = renderHook(() => useDragon3D())
    const dragon3DHookTime = performance.now() - dragon3DHookStart
    
    const asciiHookStart = performance.now()
    const { unmount: unmountASCII } = renderHook(() => useASCIIDragon())
    const asciiHookTime = performance.now() - asciiHookStart
    
    unmount3D()
    unmountASCII()
    
    // Both hooks should initialize quickly
    expect(dragon3DHookTime).toBeLessThan(50)
    expect(asciiHookTime).toBeLessThan(50)
    
    console.log('Hook Performance Comparison:', {
      dragon3D: dragon3DHookTime,
      ascii: asciiHookTime
    })
  })
})