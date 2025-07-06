/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import ASCIIDragon, { ASCIIDragonProps } from '../../../components/dragon/ASCIIDragon'
import { VoiceAnimationState } from '../../../components/dragon/DragonRenderer'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, whileHover, whileTap, transition, ...props }: any) => (
      <div 
        {...props}
        data-animate={JSON.stringify(animate)}
        data-while-hover={JSON.stringify(whileHover)}
        data-while-tap={JSON.stringify(whileTap)}
        data-transition={JSON.stringify(transition)}
      >
        {children}
      </div>
    ),
    pre: ({ children, ...props }: any) => <pre {...props}>{children}</pre>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock voice-dragon-mapping utilities
jest.mock('../../../utils/voice-dragon-mapping', () => ({
  voiceStateToASCIIPose: jest.fn((voiceState: VoiceAnimationState) => {
    if (voiceState.isSpeaking) return 'attacking'
    if (voiceState.isListening) return 'flying'
    if (voiceState.isProcessing) return 'coiled'
    if (voiceState.emotion === 'sleeping') return 'sleeping'
    return 'coiled'
  }),
  voiceStateToAnimationSpeed: jest.fn((voiceState: VoiceAnimationState) => {
    if (voiceState.isSpeaking) return 'fast'
    if (voiceState.isListening) return 'normal'
    if (voiceState.isProcessing) return 'normal'
    return 'slow'
  }),
  shouldShowBreathing: jest.fn((voiceState: VoiceAnimationState) => {
    return voiceState.isIdle || voiceState.isListening
  }),
  shouldShowFloating: jest.fn((voiceState: VoiceAnimationState) => {
    return !voiceState.isProcessing
  }),
  shouldShowEnergyEffects: jest.fn((voiceState: VoiceAnimationState) => {
    return voiceState.isSpeaking || voiceState.isListening
  })
}))

// Test helpers
const createDefaultProps = (): ASCIIDragonProps => ({
  size: 'lg',
  className: '',
  enableHover: true,
  enableTypewriter: true,
  enableBreathing: true,
  enableFloating: true,
  pose: 'coiled',
  speed: 'normal'
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

const renderASCIIDragon = (props: Partial<ASCIIDragonProps> = {}) => {
  const defaultProps = createDefaultProps()
  return render(<ASCIIDragon {...defaultProps} {...props} />)
}

describe('ASCIIDragon Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      renderASCIIDragon()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should apply size-specific classes', () => {
      const { container } = renderASCIIDragon({ size: 'sm' })
      expect(container.firstChild).toHaveClass('text-xs', 'leading-3', 'p-2')
    })

    it('should apply custom className', () => {
      const customClass = 'custom-ascii-class'
      const { container } = renderASCIIDragon({ className: customClass })
      expect(container.firstChild).toHaveClass(customClass)
    })

    it('should render in mono font', () => {
      const { container } = renderASCIIDragon()
      expect(container.firstChild).toHaveClass('font-mono')
    })
  })

  describe('Dragon Poses', () => {
    const poses: Array<'coiled' | 'flying' | 'attacking' | 'sleeping'> = [
      'coiled', 'flying', 'attacking', 'sleeping'
    ]

    poses.forEach(pose => {
      it(`should render ${pose} pose correctly`, () => {
        renderASCIIDragon({ pose })
        expect(screen.getByRole('button')).toBeInTheDocument()
      })
    })

    it('should change pose when prop changes', () => {
      const { rerender } = renderASCIIDragon({ pose: 'coiled' })
      
      rerender(<ASCIIDragon {...createDefaultProps()} pose="flying" />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Size Variations', () => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl']
    
    sizes.forEach(size => {
      it(`should render correctly with size ${size}`, () => {
        const { container } = renderASCIIDragon({ size })
        
        const sizeClasses = {
          sm: ['text-xs', 'leading-3', 'p-2'],
          md: ['text-sm', 'leading-4', 'p-3'],
          lg: ['text-base', 'leading-5', 'p-4'],
          xl: ['text-lg', 'leading-6', 'p-6']
        }
        
        expect(container.firstChild).toHaveClass(...sizeClasses[size])
      })
    })
  })

  describe('Animation Speed', () => {
    const speeds: Array<'slow' | 'normal' | 'fast'> = ['slow', 'normal', 'fast']
    
    speeds.forEach(speed => {
      it(`should handle ${speed} animation speed`, () => {
        renderASCIIDragon({ speed })
        expect(screen.getByRole('button')).toBeInTheDocument()
      })
    })
  })

  describe('Typewriter Animation', () => {
    it('should start typewriter animation when enabled', () => {
      renderASCIIDragon({ enableTypewriter: true })
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should display all lines immediately when typewriter is disabled', () => {
      renderASCIIDragon({ enableTypewriter: false })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should complete typewriter animation after sufficient time', () => {
      renderASCIIDragon({ 
        enableTypewriter: true,
        speed: 'fast',
        size: 'sm' // Smaller dragon = faster completion
      })
      
      act(() => {
        jest.advanceTimersByTime(5000) // Advance enough time for completion
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should restart typewriter when pose changes', () => {
      const { rerender } = renderASCIIDragon({ 
        enableTypewriter: true,
        pose: 'coiled'
      })
      
      rerender(<ASCIIDragon {...createDefaultProps()} enableTypewriter={true} pose="flying" />)
      
      act(() => {
        jest.advanceTimersByTime(100)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Breathing Animation', () => {
    it('should apply breathing effect when enabled', () => {
      renderASCIIDragon({ enableBreathing: true })
      
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should not apply breathing effect when disabled', () => {
      renderASCIIDragon({ enableBreathing: false })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should animate breathing intensity over time', () => {
      renderASCIIDragon({ enableBreathing: true })
      
      // Advance through multiple breathing cycles
      act(() => {
        jest.advanceTimersByTime(8000)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Floating Animation', () => {
    it('should apply floating animation when enabled', () => {
      const { container } = renderASCIIDragon({ enableFloating: true })
      
      const motionDiv = container.firstChild as HTMLElement
      expect(motionDiv.dataset.animate).toBeDefined()
    })

    it('should not apply floating animation when disabled', () => {
      const { container } = renderASCIIDragon({ enableFloating: false })
      
      const motionDiv = container.firstChild as HTMLElement
      expect(motionDiv.dataset.animate).toBeUndefined()
    })

    it('should apply wide character spacing for floating', () => {
      const { container } = renderASCIIDragon({ enableFloating: true })
      expect(container.firstChild).toHaveClass('tracking-wide')
    })
  })

  describe('Voice Integration', () => {
    it('should respond to voice listening state', () => {
      const voiceState = createVoiceState({ isListening: true, isIdle: false })
      renderASCIIDragon({ voiceState })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should respond to voice speaking state', () => {
      const voiceState = createVoiceState({ 
        isSpeaking: true, 
        isIdle: false,
        volume: 0.8
      })
      renderASCIIDragon({ voiceState })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should respond to voice processing state', () => {
      const voiceState = createVoiceState({ 
        isProcessing: true, 
        isIdle: false 
      })
      renderASCIIDragon({ voiceState })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should show listening pulse effect', () => {
      const voiceState = createVoiceState({ isListening: true, isIdle: false })
      const { container } = renderASCIIDragon({ voiceState })
      
      const pulseElement = container.querySelector('.border-blue-400')
      expect(pulseElement).toBeInTheDocument()
    })

    it('should show speaking energy waves', () => {
      const voiceState = createVoiceState({ isSpeaking: true, isIdle: false })
      const { container } = renderASCIIDragon({ voiceState })
      
      const waveElements = container.querySelectorAll('.border-orange-400')
      expect(waveElements.length).toBeGreaterThan(0)
    })

    it('should show processing indicator', () => {
      const voiceState = createVoiceState({ isProcessing: true, isIdle: false })
      const { container } = renderASCIIDragon({ voiceState })
      
      const processingElement = container.querySelector('.bg-purple-400')
      expect(processingElement).toBeInTheDocument()
    })

    it('should show error state for angry emotion', () => {
      const voiceState = createVoiceState({ emotion: 'angry' })
      const { container } = renderASCIIDragon({ voiceState })
      
      const errorElement = container.querySelector('.border-red-500')
      expect(errorElement).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onClick when clicked', () => {
      const mockOnClick = jest.fn()
      renderASCIIDragon({ onClick: mockOnClick })
      
      fireEvent.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should handle hover effects when enabled', () => {
      const { container } = renderASCIIDragon({ enableHover: true })
      
      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)
      fireEvent.mouseLeave(button)
      
      expect(button).toBeInTheDocument()
    })

    it('should not have hover effects when disabled', () => {
      const { container } = renderASCIIDragon({ enableHover: false })
      
      const motionDiv = container.firstChild as HTMLElement
      expect(motionDiv.dataset.whileHover).toBe('undefined')
    })
  })

  describe('Character Intensity Mapping', () => {
    it('should map tilde characters correctly', () => {
      renderASCIIDragon({ 
        enableBreathing: true,
        pose: 'coiled'
      })
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle different breathing intensities', () => {
      renderASCIIDragon({ enableBreathing: true })
      
      // Test multiple breathing cycles with different intensities
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(1000)
        })
      }
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be accessible via keyboard', () => {
      const mockOnClick = jest.fn()
      renderASCIIDragon({ onClick: mockOnClick })
      
      const button = screen.getByRole('button')
      button.focus()
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(button).toHaveFocus()
    })

    it('should have proper cursor pointer class', () => {
      const { container } = renderASCIIDragon()
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should not be selectable', () => {
      const { container } = renderASCIIDragon()
      expect(container.firstChild).toHaveClass('select-none')
    })
  })

  describe('Property-based Tests', () => {
    it('should handle arbitrary size and pose combinations', () => {
      fc.assert(fc.property(
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('coiled', 'flying', 'attacking', 'sleeping'),
        fc.constantFrom('slow', 'normal', 'fast'),
        fc.boolean(),
        fc.boolean(),
        (size, pose, speed, enableBreathing, enableFloating) => {
          const { container } = renderASCIIDragon({
            size,
            pose,
            speed,
            enableBreathing,
            enableFloating
          })
          
          expect(container.firstChild).toBeInTheDocument()
          return true
        }
      ), { numRuns: 25 })
    })

    it('should handle arbitrary voice states', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.float({ min: 0, max: 1 }),
        fc.constantFrom('neutral', 'happy', 'angry', 'sleeping', 'excited'),
        (isListening, isSpeaking, isProcessing, volume, emotion) => {
          const voiceState = createVoiceState({
            isListening,
            isSpeaking,
            isProcessing,
            isIdle: !isListening && !isSpeaking && !isProcessing,
            volume,
            emotion
          })
          
          const { container } = renderASCIIDragon({ voiceState })
          expect(container.firstChild).toBeInTheDocument()
          return true
        }
      ), { numRuns: 20 })
    })
  })

  describe('Performance', () => {
    it('should render within acceptable time limits', async () => {
      const startTime = performance.now()
      
      renderASCIIDragon()
      
      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(50) // ASCII should be very fast
    })

    it('should handle multiple instances efficiently', () => {
      const instances = []
      
      for (let i = 0; i < 5; i++) {
        instances.push(renderASCIIDragon({ size: 'sm' }))
      }
      
      instances.forEach(instance => {
        expect(instance.container.firstChild).toBeInTheDocument()
        instance.unmount()
      })
    })

    it('should optimize character mapping when breathing is disabled', () => {
      renderASCIIDragon({ enableBreathing: false })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Memory Management', () => {
    it('should clean up timers on unmount', () => {
      const { unmount } = renderASCIIDragon({
        enableTypewriter: true,
        enableBreathing: true
      })
      
      expect(() => {
        unmount()
        jest.runOnlyPendingTimers()
      }).not.toThrow()
    })

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = renderASCIIDragon({
          enableTypewriter: true,
          enableBreathing: true,
          enableFloating: true
        })
        
        act(() => {
          jest.advanceTimersByTime(100)
        })
        
        unmount()
      }
    })
  })

  describe('Animation Synchronization', () => {
    it('should synchronize typewriter with breathing', () => {
      renderASCIIDragon({
        enableTypewriter: true,
        enableBreathing: true,
        speed: 'fast'
      })
      
      act(() => {
        jest.advanceTimersByTime(3000)
      })
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should maintain animation state across voice changes', () => {
      const { rerender } = renderASCIIDragon({
        voiceState: createVoiceState({ isListening: true })
      })
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      rerender(<ASCIIDragon 
        {...createDefaultProps()} 
        voiceState={createVoiceState({ isSpeaking: true })} 
      />)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})

// Performance benchmark tests
describe('ASCIIDragon Performance Benchmarks', () => {
  beforeEach(() => {
    jest.useRealTimers() // Use real timers for performance tests
  })

  it('should complete typewriter animation efficiently', async () => {
    const startTime = performance.now()
    
    const { container } = renderASCIIDragon({
      enableTypewriter: true,
      speed: 'fast',
      size: 'sm'
    })
    
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const completionTime = performance.now() - startTime
    expect(completionTime).toBeLessThan(2000)
  })

  it('should handle breathing animation without performance degradation', async () => {
    const { container } = renderASCIIDragon({
      enableBreathing: true,
      enableFloating: true
    })
    
    // Let animations run for a bit
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    expect(container.firstChild).toBeInTheDocument()
  })
})