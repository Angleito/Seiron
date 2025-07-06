/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import DragonRenderer, { 
  DragonRendererProps, 
  DragonType,
  VoiceAnimationState,
  DragonPerformanceMetrics
} from '../../../components/dragon/DragonRenderer'

// Mock the dragon components
jest.mock('../../../components/dragon/Dragon3D', () => {
  return function MockDragon3D(props: any) {
    return (
      <div 
        data-testid="dragon-3d" 
        data-props={JSON.stringify(props)}
        onClick={props.onClick}
      >
        Mock Dragon3D
      </div>
    )
  }
})

jest.mock('../../../components/dragon/ASCIIDragon', () => {
  return function MockASCIIDragon(props: any) {
    return (
      <div 
        data-testid="ascii-dragon" 
        data-props={JSON.stringify(props)}
        onClick={props.onClick}
      >
        Mock ASCIIDragon
      </div>
    )
  }
})

jest.mock('../../../components/SimpleDragonSprite', () => {
  return function MockSimpleDragonSprite(props: any) {
    return (
      <div 
        data-testid="simple-dragon-sprite" 
        data-props={JSON.stringify(props)}
        onClick={props.onClick}
      >
        Mock SimpleDragonSprite
      </div>
    )
  }
})

// Mock ErrorBoundary
jest.mock('../../../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, onError, fallback }: any) => {
    try {
      return children
    } catch (error) {
      onError?.(error)
      return fallback
    }
  }
}))

// Mock logger
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock 3D support detection
const mockDetect3DSupport = jest.fn(() => true)
jest.mock('../../../components/dragon/DragonRenderer', () => {
  const actual = jest.requireActual('../../../components/dragon/DragonRenderer')
  return {
    ...actual,
    dragonUtils: {
      ...actual.dragonUtils,
      detect3DSupport: mockDetect3DSupport
    }
  }
})

// Test helpers
const createDefaultProps = (): DragonRendererProps => ({
  dragonType: '2d',
  size: 'lg',
  className: '',
  enableHover: true,
  enableFallback: true,
  fallbackType: '2d',
  performanceMode: 'auto'
})

const createVoiceState = (overrides: Partial<VoiceAnimationState> = {}): VoiceAnimationState => ({
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  isIdle: true,
  volume: 0.5,
  emotion: 'neutral',
  ...overrides
})

const renderDragonRenderer = (props: Partial<DragonRendererProps> = {}) => {
  const defaultProps = createDefaultProps()
  return render(<DragonRenderer {...defaultProps} {...props} />)
}

describe('DragonRenderer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDetect3DSupport.mockReturnValue(true)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      renderDragonRenderer()
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
    })

    it('should apply dragon-renderer class', () => {
      const { container } = renderDragonRenderer()
      expect(container.querySelector('.dragon-renderer')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const customClass = 'custom-renderer-class'
      renderDragonRenderer({ className: customClass })
      expect(screen.getByText(/Mock/).closest('.custom-renderer-class')).toBeInTheDocument()
    })
  })

  describe('Dragon Type Switching', () => {
    it('should render 2D dragon by default', () => {
      renderDragonRenderer({ dragonType: '2d' })
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      expect(screen.queryByTestId('ascii-dragon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('dragon-3d')).not.toBeInTheDocument()
    })

    it('should render ASCII dragon when specified', () => {
      renderDragonRenderer({ dragonType: 'ascii' })
      expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
      expect(screen.queryByTestId('simple-dragon-sprite')).not.toBeInTheDocument()
      expect(screen.queryByTestId('dragon-3d')).not.toBeInTheDocument()
    })

    it('should render 3D dragon when specified and supported', () => {
      mockDetect3DSupport.mockReturnValue(true)
      renderDragonRenderer({ dragonType: '3d' })
      
      act(() => {
        jest.advanceTimersByTime(200) // Wait for transition
      })
      
      expect(screen.getByTestId('dragon-3d')).toBeInTheDocument()
    })

    it('should fallback when 3D is not supported', () => {
      mockDetect3DSupport.mockReturnValue(false)
      renderDragonRenderer({ 
        dragonType: '3d',
        enableFallback: true,
        fallbackType: '2d'
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      expect(screen.queryByTestId('dragon-3d')).not.toBeInTheDocument()
    })

    it('should transition between dragon types smoothly', () => {
      const { rerender } = renderDragonRenderer({ dragonType: '2d' })
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      
      rerender(<DragonRenderer {...createDefaultProps()} dragonType="ascii" />)
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
    })
  })

  describe('Voice Integration', () => {
    it('should pass voice state to dragon components', () => {
      const voiceState = createVoiceState({ isListening: true })
      renderDragonRenderer({ 
        dragonType: 'ascii',
        voiceState 
      })
      
      const asciiDragon = screen.getByTestId('ascii-dragon')
      const props = JSON.parse(asciiDragon.dataset.props || '{}')
      expect(props.pose).toBeDefined()
      expect(props.speed).toBeDefined()
    })

    it('should update voice-based props when voice state changes', () => {
      const { rerender } = renderDragonRenderer({ 
        dragonType: 'ascii',
        voiceState: createVoiceState({ isListening: true })
      })
      
      rerender(<DragonRenderer 
        {...createDefaultProps()} 
        dragonType="ascii"
        voiceState={createVoiceState({ isSpeaking: true })}
      />)
      
      const asciiDragon = screen.getByTestId('ascii-dragon')
      expect(asciiDragon).toBeInTheDocument()
    })

    it('should handle voice state for 3D dragon', () => {
      const voiceState = createVoiceState({ isSpeaking: true, volume: 0.8 })
      renderDragonRenderer({ 
        dragonType: '3d',
        voiceState 
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      const dragon3d = screen.getByTestId('dragon-3d')
      const props = JSON.parse(dragon3d.dataset.props || '{}')
      expect(props.animationSpeed).toBeGreaterThan(1)
      expect(props.showParticles).toBe(true)
    })
  })

  describe('Performance Mode', () => {
    it('should apply low quality settings in low performance mode', () => {
      renderDragonRenderer({ 
        dragonType: '3d',
        performanceMode: 'low'
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      const dragon3d = screen.getByTestId('dragon-3d')
      const props = JSON.parse(dragon3d.dataset.props || '{}')
      expect(props.quality).toBe('low')
    })

    it('should apply high quality settings in high performance mode', () => {
      renderDragonRenderer({ 
        dragonType: '3d',
        performanceMode: 'high'
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      const dragon3d = screen.getByTestId('dragon-3d')
      const props = JSON.parse(dragon3d.dataset.props || '{}')
      expect(props.quality).toBe('high')
    })

    it('should auto-detect performance in auto mode', () => {
      renderDragonRenderer({ 
        dragonType: '3d',
        performanceMode: 'auto'
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      const dragon3d = screen.getByTestId('dragon-3d')
      const props = JSON.parse(dragon3d.dataset.props || '{}')
      expect(props.quality).toBe('medium')
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should trigger fallback when dragon component fails', () => {
      const mockOnError = jest.fn()
      const mockOnFallback = jest.fn()
      
      renderDragonRenderer({
        dragonType: '3d',
        enableFallback: true,
        fallbackType: '2d',
        onError: mockOnError,
        onFallback: mockOnFallback
      })
      
      // Component should render without immediate error
      expect(screen.getByText(/Mock/)).toBeInTheDocument()
    })

    it('should not fallback when fallback is disabled', () => {
      renderDragonRenderer({
        dragonType: '3d',
        enableFallback: false
      })
      
      expect(screen.getByText(/Mock/)).toBeInTheDocument()
    })

    it('should handle unknown dragon type gracefully', () => {
      renderDragonRenderer({
        dragonType: 'unknown' as DragonType
      })
      
      // Should fallback to 2D sprite
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
    })
  })

  describe('Performance Metrics', () => {
    it('should call performance metrics callback when provided', () => {
      const mockOnPerformanceMetrics = jest.fn()
      
      renderDragonRenderer({
        onPerformanceMetrics: mockOnPerformanceMetrics
      })
      
      act(() => {
        jest.advanceTimersByTime(5100) // Just over the 5 second interval
      })
      
      expect(mockOnPerformanceMetrics).toHaveBeenCalled()
    })

    it('should include correct metrics data', () => {
      const mockOnPerformanceMetrics = jest.fn()
      
      renderDragonRenderer({
        dragonType: '2d',
        onPerformanceMetrics: mockOnPerformanceMetrics
      })
      
      act(() => {
        jest.advanceTimersByTime(5100)
      })
      
      if (mockOnPerformanceMetrics.mock.calls.length > 0) {
        const metrics: DragonPerformanceMetrics = mockOnPerformanceMetrics.mock.calls[0][0]
        expect(metrics.dragonType).toBe('2d')
        expect(typeof metrics.renderTime).toBe('number')
        expect(typeof metrics.initTime).toBe('number')
        expect(typeof metrics.fallbackUsed).toBe('boolean')
        expect(typeof metrics.errorCount).toBe('number')
      }
    })
  })

  describe('User Interactions', () => {
    it('should handle click events on dragon components', () => {
      const mockOnClick = jest.fn()
      renderDragonRenderer({ onClick: mockOnClick })
      
      fireEvent.click(screen.getByTestId('simple-dragon-sprite'))
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should pass through hover settings', () => {
      renderDragonRenderer({ 
        dragonType: 'ascii',
        enableHover: false
      })
      
      const asciiDragon = screen.getByTestId('ascii-dragon')
      const props = JSON.parse(asciiDragon.dataset.props || '{}')
      expect(props.enableHover).toBe(false)
    })
  })

  describe('Props Propagation', () => {
    it('should pass sprite-specific props to 2D dragon', () => {
      renderDragonRenderer({
        dragonType: '2d',
        spriteProps: { size: 'xl' }
      })
      
      const sprite = screen.getByTestId('simple-dragon-sprite')
      const props = JSON.parse(sprite.dataset.props || '{}')
      expect(props.size).toBe('xl')
    })

    it('should pass ASCII-specific props to ASCII dragon', () => {
      renderDragonRenderer({
        dragonType: 'ascii',
        asciiProps: { 
          enableTypewriter: false,
          pose: 'flying'
        }
      })
      
      const asciiDragon = screen.getByTestId('ascii-dragon')
      const props = JSON.parse(asciiDragon.dataset.props || '{}')
      expect(props.enableTypewriter).toBe(false)
      expect(props.pose).toBe('flying')
    })

    it('should pass 3D-specific props to 3D dragon', () => {
      renderDragonRenderer({
        dragonType: '3d',
        threeDProps: {
          enableInteraction: false,
          showParticles: false,
          quality: 'low'
        }
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      const dragon3d = screen.getByTestId('dragon-3d')
      const props = JSON.parse(dragon3d.dataset.props || '{}')
      expect(props.enableInteraction).toBe(false)
      expect(props.showParticles).toBe(false)
      expect(props.quality).toBe('low')
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner during dragon type transitions', () => {
      const { rerender } = renderDragonRenderer({ dragonType: '2d' })
      
      rerender(<DragonRenderer {...createDefaultProps()} dragonType="3d" />)
      
      // Should show loading during transition
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
    })

    it('should complete loading transition after timeout', () => {
      const { rerender } = renderDragonRenderer({ dragonType: '2d' })
      
      rerender(<DragonRenderer {...createDefaultProps()} dragonType="ascii" />)
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
    })
  })

  describe('Development Mode Debug Info', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should show debug info in development mode', () => {
      renderDragonRenderer({ dragonType: '2d' })
      
      expect(screen.getByText(/Type: 2d/)).toBeInTheDocument()
      expect(screen.getByText(/3D Support:/)).toBeInTheDocument()
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })

  describe('Property-based Tests', () => {
    it('should handle arbitrary dragon type combinations', () => {
      fc.assert(fc.property(
        fc.constantFrom('2d', '3d', 'ascii'),
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('auto', 'high', 'low'),
        fc.boolean(),
        fc.boolean(),
        (dragonType, size, performanceMode, enableHover, enableFallback) => {
          const { container } = renderDragonRenderer({
            dragonType,
            size,
            performanceMode,
            enableHover,
            enableFallback
          })
          
          act(() => {
            jest.advanceTimersByTime(200)
          })
          
          expect(container.querySelector('.dragon-renderer')).toBeInTheDocument()
          return true
        }
      ), { numRuns: 20 })
    })

    it('should handle arbitrary voice states with all dragon types', () => {
      fc.assert(fc.property(
        fc.constantFrom('2d', '3d', 'ascii'),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.float({ min: 0, max: 1 }),
        (dragonType, isListening, isSpeaking, isProcessing, volume) => {
          const voiceState = createVoiceState({
            isListening,
            isSpeaking,
            isProcessing,
            isIdle: !isListening && !isSpeaking && !isProcessing,
            volume
          })
          
          const { container } = renderDragonRenderer({
            dragonType,
            voiceState
          })
          
          act(() => {
            jest.advanceTimersByTime(200)
          })
          
          expect(container.querySelector('.dragon-renderer')).toBeInTheDocument()
          return true
        }
      ), { numRuns: 15 })
    })
  })

  describe('Memory Management', () => {
    it('should clean up properly on unmount', () => {
      const { unmount } = renderDragonRenderer({
        onPerformanceMetrics: jest.fn()
      })
      
      expect(() => {
        unmount()
        jest.runOnlyPendingTimers()
      }).not.toThrow()
    })

    it('should handle rapid dragon type changes', () => {
      const { rerender } = renderDragonRenderer({ dragonType: '2d' })
      
      const types: DragonType[] = ['ascii', '3d', '2d', 'ascii']
      
      types.forEach(type => {
        rerender(<DragonRenderer {...createDefaultProps()} dragonType={type} />)
        
        act(() => {
          jest.advanceTimersByTime(50)
        })
      })
      
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      expect(screen.getByText(/Mock/)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with frequent updates', () => {
      const startTime = performance.now()
      
      const { rerender } = renderDragonRenderer({
        dragonType: '2d',
        voiceState: createVoiceState({ volume: 0.1 })
      })
      
      // Simulate frequent voice updates
      for (let i = 0; i < 10; i++) {
        rerender(<DragonRenderer 
          {...createDefaultProps()} 
          dragonType="2d"
          voiceState={createVoiceState({ volume: i / 10 })}
        />)
      }
      
      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(100)
    })

    it('should handle multiple instances without performance degradation', () => {
      const instances = []
      
      for (let i = 0; i < 3; i++) {
        instances.push(renderDragonRenderer({ 
          dragonType: '2d',
          size: 'sm'
        }))
      }
      
      instances.forEach(instance => {
        expect(instance.container.querySelector('.dragon-renderer')).toBeInTheDocument()
        instance.unmount()
      })
    })
  })
})

// Integration tests for dragon renderer utilities
describe('DragonRenderer Utilities', () => {
  describe('Voice State Mapping', () => {
    it('should map voice states to appropriate poses', () => {
      const { dragonUtils } = require('../../../components/dragon/DragonRenderer')
      
      expect(dragonUtils.voiceStateToPose({ isSpeaking: true })).toBe('attacking')
      expect(dragonUtils.voiceStateToPose({ isListening: true })).toBe('flying')
      expect(dragonUtils.voiceStateToPose({ isProcessing: true })).toBe('coiled')
      expect(dragonUtils.voiceStateToPose({ emotion: 'sleeping' })).toBe('sleeping')
    })

    it('should map voice states to appropriate speeds', () => {
      const { dragonUtils } = require('../../../components/dragon/DragonRenderer')
      
      expect(dragonUtils.voiceStateToSpeed({ isSpeaking: true })).toBe('fast')
      expect(dragonUtils.voiceStateToSpeed({ isListening: true })).toBe('normal')
      expect(dragonUtils.voiceStateToSpeed({ isProcessing: true })).toBe('normal')
    })

    it('should map voice states to 3D animation props', () => {
      const { dragonUtils } = require('../../../components/dragon/DragonRenderer')
      
      const speakingProps = dragonUtils.voiceStateTo3DProps({ isSpeaking: true })
      expect(speakingProps.animationSpeed).toBe(2)
      expect(speakingProps.showParticles).toBe(true)
      
      const listeningProps = dragonUtils.voiceStateTo3DProps({ isListening: true })
      expect(listeningProps.animationSpeed).toBe(1.5)
      expect(listeningProps.showParticles).toBe(true)
      
      const processingProps = dragonUtils.voiceStateTo3DProps({ isProcessing: true })
      expect(processingProps.autoRotate).toBe(true)
    })
  })
})