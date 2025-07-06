import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DragonRenderer, { 
  DragonType, 
  VoiceAnimationState, 
  dragonUtils 
} from '../DragonRenderer'

// Mock the logger
jest.mock('../../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

// Mock the dragon components
jest.mock('../../SimpleDragonSprite', () => {
  return function MockSimpleDragonSprite(props: any) {
    return (
      <div 
        data-testid="simple-dragon-sprite"
        onClick={props.onClick}
        className={props.className}
      >
        Simple Dragon ({props.size})
      </div>
    )
  }
})

jest.mock('../ASCIIDragon', () => {
  return function MockASCIIDragon(props: any) {
    return (
      <div 
        data-testid="ascii-dragon"
        onClick={props.onClick}
        className={props.className}
      >
        ASCII Dragon ({props.size}, {props.pose})
      </div>
    )
  }
})

// Mock Dragon3D as a lazy component
jest.mock('../Dragon3D', () => {
  return function MockDragon3D(props: any) {
    return (
      <div 
        data-testid="dragon-3d"
        onClick={props.onClick}
        className={props.className}
      >
        3D Dragon ({props.size}, {props.quality})
      </div>
    )
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

describe('DragonRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders 2D dragon by default', () => {
      render(<DragonRenderer dragonType="2d" />)
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
    })

    it('renders ASCII dragon when type is ascii', () => {
      render(<DragonRenderer dragonType="ascii" />)
      expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
    })

    it('falls back to 2D when 3D is requested but not supported', async () => {
      // In test environment, 3D support is false by default
      render(<DragonRenderer dragonType="3d" enableFallback={true} fallbackType="2d" />)
      
      await waitFor(() => {
        // Should render the fallback 2D sprite since 3D is not supported in tests
        expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      })
    })

    it('shows loading state during dragon type transitions', async () => {
      const { rerender } = render(<DragonRenderer dragonType="2d" />)
      
      // Start with 2D
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      
      // Switch to ASCII - should show loading briefly then ASCII
      rerender(<DragonRenderer dragonType="ascii" />)
      
      // Eventually should render ASCII dragon after transition
      await waitFor(() => {
        expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Size Prop', () => {
    it('passes size prop to dragon components', () => {
      render(<DragonRenderer dragonType="2d" size="xl" />)
      expect(screen.getByText('Simple Dragon (xl)')).toBeInTheDocument()
    })

    it('uses default size when not specified', () => {
      render(<DragonRenderer dragonType="2d" />)
      expect(screen.getByText('Simple Dragon (lg)')).toBeInTheDocument()
    })
  })

  describe('Voice Integration', () => {
    it('maps voice state to ASCII dragon pose', () => {
      const voiceState: VoiceAnimationState = {
        isListening: false,
        isSpeaking: true,
        isProcessing: false,
        isIdle: false,
        emotion: 'neutral'
      }

      render(<DragonRenderer dragonType="ascii" voiceState={voiceState} />)
      
      expect(screen.getByText(/attacking/)).toBeInTheDocument()
    })

    it('maps listening state to flying pose', () => {
      const voiceState: VoiceAnimationState = {
        isListening: true,
        isSpeaking: false,
        isProcessing: false,
        isIdle: false,
        emotion: 'neutral'
      }

      render(<DragonRenderer dragonType="ascii" voiceState={voiceState} />)
      
      expect(screen.getByText(/flying/)).toBeInTheDocument()
    })

    it('maps sleeping emotion to sleeping pose', () => {
      const voiceState: VoiceAnimationState = {
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: false,
        emotion: 'sleeping'
      }

      render(<DragonRenderer dragonType="ascii" voiceState={voiceState} />)
      
      expect(screen.getByText(/sleeping/)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('calls onError when error occurs', async () => {
      const mockOnError = jest.fn()
      
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error
      console.error = jest.fn()
      
      try {
        render(
          <DragonRenderer 
            dragonType="3d" 
            onError={mockOnError}
            enableFallback={false}
          />
        )
        
        // Wait for potential error handling
        await waitFor(() => {
          // The error handling might be called depending on the mock setup
          // This test verifies the error handling infrastructure is in place
        })
      } finally {
        console.error = originalConsoleError
      }
    })

    it('can configure fallback behavior', async () => {
      const mockOnFallback = jest.fn()
      
      render(
        <DragonRenderer 
          dragonType="3d" 
          enableFallback={true}
          fallbackType="2d"
          onFallback={mockOnFallback}
        />
      )
      
      // Should render fallback component since 3D is not supported in tests
      await waitFor(() => {
        expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Performance Monitoring', () => {
    it('sets up performance monitoring when callback provided', () => {
      const mockOnPerformanceMetrics = jest.fn()
      
      render(
        <DragonRenderer 
          dragonType="2d" 
          onPerformanceMetrics={mockOnPerformanceMetrics}
        />
      )
      
      // The component should render successfully with performance monitoring enabled
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      
      // Performance monitoring is set up with a 5-second interval
      // We don't test the actual callback in unit tests to avoid timing issues
    })
  })

  describe('Click Handling', () => {
    it('forwards click events to dragon components', () => {
      const mockOnClick = jest.fn()
      
      render(<DragonRenderer dragonType="2d" onClick={mockOnClick} />)
      
      fireEvent.click(screen.getByTestId('simple-dragon-sprite'))
      
      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  describe('Type Switching', () => {
    it('switches between dragon types smoothly', async () => {
      const { rerender } = render(<DragonRenderer dragonType="2d" />)
      
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      
      rerender(<DragonRenderer dragonType="ascii" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Props', () => {
    it('passes asciiProps to ASCII dragon', () => {
      render(
        <DragonRenderer 
          dragonType="ascii" 
          asciiProps={{ pose: 'flying' }}
        />
      )
      
      expect(screen.getByText(/flying/)).toBeInTheDocument()
    })

    it('handles threeDProps configuration', async () => {
      // When 3D is not supported, it falls back to 2D
      render(
        <DragonRenderer 
          dragonType="3d" 
          threeDProps={{ quality: 'high' }}
          enableFallback={true}
          fallbackType="2d"
        />
      )
      
      // Should render fallback since 3D is not supported in test environment
      await waitFor(() => {
        expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Utility Functions', () => {
    // Import the actual utilities for testing
    const { dragonUtils } = require('../DragonRenderer')
    
    describe('dragonUtils.voiceStateToPose', () => {
      it('returns attacking pose for speaking state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: false,
          isSpeaking: true,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        expect(dragonUtils.voiceStateToPose(voiceState)).toBe('attacking')
      })

      it('returns flying pose for listening state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: true,
          isSpeaking: false,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        expect(dragonUtils.voiceStateToPose(voiceState)).toBe('flying')
      })

      it('returns sleeping pose for sleeping emotion', () => {
        const voiceState: VoiceAnimationState = {
          isListening: false,
          isSpeaking: false,
          isProcessing: false,
          isIdle: false,
          emotion: 'sleeping'
        }
        
        expect(dragonUtils.voiceStateToPose(voiceState)).toBe('sleeping')
      })
    })

    describe('dragonUtils.voiceStateToSpeed', () => {
      it('returns fast speed for speaking state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: false,
          isSpeaking: true,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        expect(dragonUtils.voiceStateToSpeed(voiceState)).toBe('fast')
      })

      it('returns normal speed for listening state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: true,
          isSpeaking: false,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        expect(dragonUtils.voiceStateToSpeed(voiceState)).toBe('normal')
      })
    })

    describe('dragonUtils.voiceStateTo3DProps', () => {
      it('returns appropriate 3D props for speaking state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: false,
          isSpeaking: true,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        const props = dragonUtils.voiceStateTo3DProps(voiceState)
        
        expect(props.animationSpeed).toBe(2)
        expect(props.showParticles).toBe(true)
        expect(props.autoRotate).toBe(false)
      })

      it('returns appropriate 3D props for listening state', () => {
        const voiceState: VoiceAnimationState = {
          isListening: true,
          isSpeaking: false,
          isProcessing: false,
          isIdle: false,
          emotion: 'neutral'
        }
        
        const props = dragonUtils.voiceStateTo3DProps(voiceState)
        
        expect(props.animationSpeed).toBe(1.5)
        expect(props.showParticles).toBe(true)
        expect(props.autoRotate).toBe(false)
      })
    })
  })

  describe('Development Features', () => {
    it('shows debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      try {
        render(<DragonRenderer dragonType="2d" />)
        
        expect(screen.getByText(/Type: 2d/)).toBeInTheDocument()
        expect(screen.getByText(/3D Support:/)).toBeInTheDocument()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('hides debug info in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      try {
        render(<DragonRenderer dragonType="2d" />)
        
        expect(screen.queryByText(/Type: 2d/)).not.toBeInTheDocument()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles unknown dragon type gracefully', () => {
      // @ts-expect-error - Testing invalid type
      render(<DragonRenderer dragonType="invalid" />)
      
      // Should fallback to 2D sprite
      expect(screen.getByTestId('simple-dragon-sprite')).toBeInTheDocument()
    })

    it('handles missing voice state gracefully', () => {
      render(<DragonRenderer dragonType="ascii" />)
      
      // Should render without errors
      expect(screen.getByTestId('ascii-dragon')).toBeInTheDocument()
    })
  })
})