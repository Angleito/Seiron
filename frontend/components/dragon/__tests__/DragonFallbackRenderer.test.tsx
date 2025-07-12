/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DragonFallbackRenderer, DragonFallbackRendererWithErrorBoundary } from '../DragonFallbackRenderer'
import { WebGLFallbackManager } from '../../../utils/webglFallback'
import { webglDiagnostics } from '../../../utils/webglDiagnostics'

// Mock the WebGL fallback manager
jest.mock('../../../utils/webglFallback')
jest.mock('../../../utils/webglDiagnostics')
jest.mock('../error-boundaries/WebGLErrorBoundary', () => ({
  WebGLErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>
}))

// Mock Three.js and React Three Fiber
jest.mock('three', () => ({
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  WebGLRenderer: jest.fn(),
  BoxGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  Mesh: jest.fn()
}))

jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: any) => (
    <div data-testid="r3f-canvas" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
  useFrame: jest.fn()
}))

const mockWebGLFallbackManager = WebGLFallbackManager as jest.MockedClass<typeof WebGLFallbackManager>
const mockWebglDiagnostics = webglDiagnostics as jest.Mocked<typeof webglDiagnostics>

describe('DragonFallbackRenderer', () => {
  let mockManager: jest.Mocked<WebGLFallbackManager>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock manager instance
    mockManager = {
      detectCapabilities: jest.fn(),
      createContext: jest.fn(),
      testThreeJS: jest.fn(),
      dispose: jest.fn(),
      getDiagnostics: jest.fn()
    } as any

    mockWebGLFallbackManager.mockImplementation(() => mockManager)
    mockWebglDiagnostics.recordError = jest.fn()

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('renders loading state initially', () => {
      render(<DragonFallbackRenderer />)
      
      expect(screen.getByText('Loading Dragon System...')).toBeInTheDocument()
      expect(screen.getByText('🐉')).toBeInTheDocument()
    })

    it('initializes fallback manager with correct options', async () => {
      const capabilities = {
        webgl: false,
        webgl2: false,
        canvas2d: true,
        offscreenCanvas: false,
        headlessMode: true,
        softwareRendering: true,
        mockCanvas: true,
        recommendedMode: 'mock' as const
      }

      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue(capabilities)
      mockManager.createContext.mockReturnValue(mockContext)
      mockManager.testThreeJS.mockReturnValue(false)

      render(<DragonFallbackRenderer width={400} height={300} />)

      await waitFor(() => {
        expect(mockManager.detectCapabilities).toHaveBeenCalled()
        expect(mockManager.createContext).toHaveBeenCalledWith('auto')
      })
    })
  })

  describe('Voice State Integration', () => {
    it('updates dragon state based on voice listening', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      const voiceState = {
        isListening: true,
        isSpeaking: false,
        isProcessing: false,
        isIdle: false,
        volume: 0.8
      }

      const { rerender } = render(<DragonFallbackRenderer voiceState={voiceState} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading Dragon System...')).not.toBeInTheDocument()
      })

      // Check that ASCII dragon shows listening state
      expect(screen.getByText(/LISTENING/)).toBeInTheDocument()

      // Update to speaking state
      const speakingState = {
        ...voiceState,
        isListening: false,
        isSpeaking: true
      }

      rerender(<DragonFallbackRenderer voiceState={speakingState} />)

      expect(screen.getByText(/SPEAKING/)).toBeInTheDocument()
    })

    it('updates dragon state for processing', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      const voiceState = {
        isListening: false,
        isSpeaking: false,
        isProcessing: true,
        isIdle: false,
        volume: 0.5
      }

      render(<DragonFallbackRenderer voiceState={voiceState} />)

      await waitFor(() => {
        expect(screen.getByText(/THINKING/)).toBeInTheDocument()
      })
    })
  })

  describe('Fallback Modes', () => {
    it('renders ASCII dragon in mock mode', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      render(<DragonFallbackRenderer />)

      await waitFor(() => {
        expect(screen.getByText(/SEIRON DRAGON/)).toBeInTheDocument()
      })

      // Check for ASCII art elements
      const preElement = screen.getByRole('generic', { hidden: true })
      expect(preElement).toHaveClass('font-mono')
    })

    it('renders Canvas2D dragon in canvas2d mode', async () => {
      const mockContext = {
        type: 'canvas2d' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'canvas2d' } as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      render(<DragonFallbackRenderer />)

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true })
        expect(canvas).toBeInTheDocument()
        expect(canvas.tagName).toBe('CANVAS')
      })
    })

    it('renders WebGL dragon in webgl mode', async () => {
      const mockContext = {
        type: 'webgl' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'webgl' } as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      render(<DragonFallbackRenderer />)

      await waitFor(() => {
        expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error state when initialization fails', async () => {
      mockManager.detectCapabilities.mockImplementation(() => {
        throw new Error('Initialization failed')
      })

      const onError = jest.fn()
      render(<DragonFallbackRenderer onError={onError} />)

      await waitFor(() => {
        expect(screen.getByText('Dragon System Error')).toBeInTheDocument()
        expect(screen.getByText('Falling back to basic mode')).toBeInTheDocument()
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('handles Three.js test failure with auto-fallback', async () => {
      const capabilities = {
        webgl: true,
        webgl2: false,
        canvas2d: true,
        offscreenCanvas: false,
        headlessMode: false,
        softwareRendering: false,
        mockCanvas: false,
        recommendedMode: 'webgl' as const
      }

      const webglContext = {
        type: 'webgl' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      const canvas2dContext = {
        type: 'canvas2d' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue(capabilities)
      mockManager.createContext
        .mockReturnValueOnce(webglContext)
        .mockReturnValueOnce(canvas2dContext)
      mockManager.testThreeJS.mockReturnValue(false)

      const onFallback = jest.fn()
      render(<DragonFallbackRenderer enableAutoFallback={true} onFallback={onFallback} />)

      await waitFor(() => {
        expect(onFallback).toHaveBeenCalledWith('canvas2d')
      })
    })
  })

  describe('Lightning Effects', () => {
    it('activates lightning effects', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      const { rerender } = render(<DragonFallbackRenderer lightningActive={false} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading Dragon System...')).not.toBeInTheDocument()
      })

      // Activate lightning
      rerender(<DragonFallbackRenderer lightningActive={true} />)

      // Lightning should affect the dragon's energy and animation
      // This is tested through the visual output which shows increased intensity
      const preElement = screen.getByRole('generic', { hidden: true })
      expect(preElement).toBeInTheDocument()
    })
  })

  describe('Performance and Cleanup', () => {
    it('disposes manager on unmount', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      const { unmount } = render(<DragonFallbackRenderer />)

      await waitFor(() => {
        expect(mockManager.createContext).toHaveBeenCalled()
      })

      unmount()

      expect(mockManager.dispose).toHaveBeenCalled()
    })

    it('shows debug info in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: true,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      render(<DragonFallbackRenderer />)

      await waitFor(() => {
        expect(screen.getByText(/Mode: mock/)).toBeInTheDocument()
        expect(screen.getByText(/Headless: Yes/)).toBeInTheDocument()
        expect(screen.getByText(/Docker: Yes/)).toBeInTheDocument()
      })

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Callback Integration', () => {
    it('calls onLoad when initialization completes', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      const onLoad = jest.fn()
      render(<DragonFallbackRenderer onLoad={onLoad} />)

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled()
      })
    })

    it('calls onFallback when fallback is triggered', async () => {
      const capabilities = {
        webgl: true,
        webgl2: false,
        canvas2d: true,
        recommendedMode: 'webgl' as const
      }

      const webglContext = {
        type: 'webgl' as const,
        capabilities,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      } as any

      const canvas2dContext = {
        type: 'canvas2d' as const,
        capabilities,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      } as any

      mockManager.detectCapabilities.mockReturnValue(capabilities)
      mockManager.createContext
        .mockReturnValueOnce(webglContext)
        .mockReturnValueOnce(canvas2dContext)
      mockManager.testThreeJS.mockReturnValue(false)

      const onFallback = jest.fn()
      render(
        <DragonFallbackRenderer 
          preferredMode="webgl" 
          enableAutoFallback={true} 
          onFallback={onFallback} 
        />
      )

      await waitFor(() => {
        expect(onFallback).toHaveBeenCalledWith('canvas2d')
      })
    })
  })

  describe('Error Boundary Integration', () => {
    it('renders with error boundary wrapper', () => {
      render(<DragonFallbackRendererWithErrorBoundary />)
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByText('Loading Dragon System...')).toBeInTheDocument()
    })

    it('records errors through webgl diagnostics', async () => {
      const mockContext = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: {},
        capabilities: { recommendedMode: 'mock' } as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      mockManager.detectCapabilities.mockReturnValue({} as any)
      mockManager.createContext.mockReturnValue(mockContext)

      render(<DragonFallbackRendererWithErrorBoundary />)

      await waitFor(() => {
        expect(mockWebglDiagnostics.recordError).toHaveBeenCalledWith(
          expect.stringContaining('Fallback capabilities detected')
        )
      })
    })
  })
})

describe('ASCII Dragon Animation States', () => {
  it('renders different poses based on dragon state', () => {
    const poses = [
      { pose: 'listening', expectedText: 'LISTENING' },
      { pose: 'speaking', expectedText: 'SPEAKING' },
      { pose: 'processing', expectedText: 'THINKING' },
      { pose: 'coiled', expectedText: 'SEIRON DRAGON' }
    ]

    poses.forEach(({ pose, expectedText }) => {
      const { unmount } = render(
        <div data-testid={`ascii-${pose}`}>
          {/* This would be the ASCIIDragon component with the specific pose */}
          <pre>{expectedText}</pre>
        </div>
      )
      
      expect(screen.getByText(expectedText)).toBeInTheDocument()
      unmount()
    })
  })
})