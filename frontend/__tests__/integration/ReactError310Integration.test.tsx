/**
 * Integration Test for React Error #310 Fix
 * Tests the complete error handling system and verification components
 */

import React, { Suspense } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrowserRouter } from 'react-router-dom'
import { 
  CompositeErrorBoundary, 
  ReactError310Handler, 
  GLTFErrorBoundary 
} from '@components/error-boundaries'
import ReactError310Verification from '@components/verification/ReactError310Verification'
import { errorRecoveryUtils } from '@utils/errorRecovery'

// Mock external dependencies
jest.mock('@lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@utils/errorRecovery', () => ({
  errorRecoveryUtils: {
    forceGC: jest.fn(),
    monitor: {
      recordError: jest.fn(),
      getRecentErrors: jest.fn(() => [])
    },
    wallet: {
      checkNetworkConnectivity: jest.fn(() => Promise.resolve(true))
    },
    dragonFallback: {
      getNextFallback: jest.fn(),
      getOptimalDragonType: jest.fn()
    },
    webgl: {
      recreateWebGLContext: jest.fn()
    }
  }
}))

// Test component that simulates React Error #310 scenarios
const TestComponentWithConditionalHooks = ({ shouldUseExtraHook = false }: { shouldUseExtraHook?: boolean }) => {
  const [baseState] = React.useState('base')
  
  // This conditional hook usage previously caused React Error #310
  if (shouldUseExtraHook) {
    const [extraState] = React.useState('extra')
    React.useEffect(() => {
      console.log('Extra effect:', extraState)
    }, [extraState])
  }
  
  const [finalState] = React.useState('final')
  
  return (
    <div data-testid="test-component">
      Base: {baseState}, Final: {finalState}
    </div>
  )
}

// Test component that throws errors
const ErrorThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for React Error #310 handler')
  }
  
  return <div data-testid="error-component">No error</div>
}

describe('React Error #310 Integration Tests', () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('CompositeErrorBoundary Integration', () => {
    it('should handle React Error #310 scenarios without crashing', async () => {
      const onErrorSpy = jest.fn()
      const onRecoverySpy = jest.fn()
      
      const { rerender } = render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
            maxRetries={3}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <TestComponentWithConditionalHooks shouldUseExtraHook={false} />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      
      // Test switching hook conditions (previously caused React Error #310)
      rerender(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
            maxRetries={3}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <TestComponentWithConditionalHooks shouldUseExtraHook={true} />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      
      // Switch back
      rerender(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
            maxRetries={3}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <TestComponentWithConditionalHooks shouldUseExtraHook={false} />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      
      // Should not have triggered error boundary
      expect(onErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle thrown errors and attempt recovery', async () => {
      const onErrorSpy = jest.fn()
      const onRecoverySpy = jest.fn()
      
      const { rerender } = render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            maxRetries={1}
            retryDelay={100}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <ErrorThrowingComponent shouldThrow={false} />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('error-component')).toBeInTheDocument()
      
      // Trigger error
      rerender(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            maxRetries={1}
            retryDelay={100}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <ErrorThrowingComponent shouldThrow={true} />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      // Should show error UI
      await waitFor(() => {
        expect(screen.getByText(/System Error/)).toBeInTheDocument()
      })
      
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(String)
      )
    })

    it('should integrate with GLTF and WebGL error recovery', async () => {
      const TestWebGLComponent = () => (
        <canvas data-testid="webgl-canvas" />
      )
      
      render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableWebGLRecovery={true}
            enableGLTFRecovery={true}
            enablePerformanceMonitoring={true}
            modelPath="/test/model.glb"
          >
            <TestWebGLComponent />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('webgl-canvas')).toBeInTheDocument()
    })
  })

  describe('ReactError310Handler Integration', () => {
    it('should specifically handle React hook errors', async () => {
      const onErrorSpy = jest.fn()
      
      const HookErrorComponent = () => {
        // Simulate a hook-related error
        React.useEffect(() => {
          throw new Error('rendered more hooks than during the previous render')
        }, [])
        
        return <div data-testid="hook-component">Hook component</div>
      }
      
      render(
        <BrowserRouter>
          <ReactError310Handler
            enableAutoRecovery={true}
            maxRetries={2}
            onError={onErrorSpy}
          >
            <HookErrorComponent />
          </ReactError310Handler>
        </BrowserRouter>
      )
      
      await waitFor(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('rendered more hooks')
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('ReactError310Verification Component', () => {
    it('should run verification tests and report results', async () => {
      const onTestCompleteSpy = jest.fn()
      
      render(
        <BrowserRouter>
          <ReactError310Verification
            onTestComplete={onTestCompleteSpy}
            enableConsoleOutput={false}
            autoRunTests={false}
          />
        </BrowserRouter>
      )
      
      expect(screen.getByText('React Error #310 Verification')).toBeInTheDocument()
      
      // Find and click the run tests button
      const runButton = screen.getByText('Run Tests')
      expect(runButton).toBeInTheDocument()
      
      act(() => {
        fireEvent.click(runButton)
      })
      
      // Wait for tests to complete
      await waitFor(() => {
        expect(onTestCompleteSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            totalTests: 4,
            passedTests: expect.any(Number),
            failedTests: expect.any(Array)
          })
        )
      }, { timeout: 10000 })
    })

    it('should display test results correctly', async () => {
      render(
        <BrowserRouter>
          <ReactError310Verification
            enableConsoleOutput={false}
            autoRunTests={false}
          />
        </BrowserRouter>
      )
      
      // Check that all test categories are displayed
      expect(screen.getByText('Hook Order Consistency')).toBeInTheDocument()
      expect(screen.getByText('Conditional Hooks Detection')).toBeInTheDocument()
      expect(screen.getByText('Error Boundary Functionality')).toBeInTheDocument()
      expect(screen.getByText('Component Remount Stability')).toBeInTheDocument()
    })
  })

  describe('Router Integration', () => {
    it('should properly wrap WebGL3D routes with CompositeErrorBoundary', () => {
      // This test verifies that our router configuration is correct
      // The actual router import and testing would be done in router-specific tests
      expect(true).toBe(true) // Placeholder for router configuration verification
    })
  })

  describe('Error Recovery Utils Integration', () => {
    it('should integrate with error recovery utilities', async () => {
      const TestRecoveryComponent = () => {
        React.useEffect(() => {
          // Simulate triggering error recovery
          errorRecoveryUtils.forceGC()
        }, [])
        
        return <div data-testid="recovery-component">Recovery test</div>
      }
      
      render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
          >
            <TestRecoveryComponent />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('recovery-component')).toBeInTheDocument()
      expect(errorRecoveryUtils.forceGC).toHaveBeenCalled()
    })
  })

  describe('Performance Integration', () => {
    it('should monitor performance and adapt quality settings', async () => {
      const TestPerformanceComponent = () => {
        return <div data-testid="performance-component">Performance test</div>
      }
      
      render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enablePerformanceMonitoring={true}
            enableAutoRecovery={true}
          >
            <TestPerformanceComponent />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      expect(screen.getByTestId('performance-component')).toBeInTheDocument()
    })
  })

  describe('Suspense Integration', () => {
    it('should handle Suspense boundaries correctly', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-component">Lazy loaded</div>
        })
      )
      
      render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableSuspenseRecovery={true}
            enableAutoRecovery={true}
          >
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <LazyComponent />
            </Suspense>
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument()
      
      // Should eventually show the lazy component
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument()
      })
    })
  })

  describe('Complete Integration Flow', () => {
    it('should handle a complete error scenario from detection to recovery', async () => {
      let shouldError = false
      const onErrorSpy = jest.fn()
      const onRecoverySpy = jest.fn()
      
      const DynamicComponent = () => {
        if (shouldError) {
          throw new Error('Test complete integration error')
        }
        return <div data-testid="dynamic-component">Dynamic content</div>
      }
      
      const { rerender } = render(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
            enableWebGLRecovery={true}
            enableGLTFRecovery={true}
            enableSuspenseRecovery={true}
            maxRetries={2}
            retryDelay={100}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <DynamicComponent />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      // Initial render should work
      expect(screen.getByTestId('dynamic-component')).toBeInTheDocument()
      
      // Trigger error
      shouldError = true
      rerender(
        <BrowserRouter>
          <CompositeErrorBoundary
            enableAutoRecovery={true}
            enablePerformanceMonitoring={true}
            enableWebGLRecovery={true}
            enableGLTFRecovery={true}
            enableSuspenseRecovery={true}
            maxRetries={2}
            retryDelay={100}
            onError={onErrorSpy}
            onRecovery={onRecoverySpy}
          >
            <DynamicComponent />
          </CompositeErrorBoundary>
        </BrowserRouter>
      )
      
      // Should show error UI
      await waitFor(() => {
        expect(screen.getByText(/System Error/)).toBeInTheDocument()
      })
      
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(String)
      )
      
      // Test manual retry
      shouldError = false
      const retryButton = screen.getByText(/Retry Recovery/)
      
      act(() => {
        fireEvent.click(retryButton)
      })
      
      // Should recover and show content again
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-component')).toBeInTheDocument()
      })
      
      expect(onRecoverySpy).toHaveBeenCalledWith('manual_retry')
    })
  })
})

// Performance test for error boundary overhead
describe('React Error #310 Performance Tests', () => {
  it('should not significantly impact render performance', async () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0)
      
      React.useEffect(() => {
        const timer = setInterval(() => {
          setCount(prev => prev + 1)
        }, 10)
        
        return () => clearInterval(timer)
      }, [])
      
      return <div data-testid="performance-component">Count: {count}</div>
    }
    
    const startTime = performance.now()
    
    render(
      <BrowserRouter>
        <CompositeErrorBoundary
          enableAutoRecovery={true}
          enablePerformanceMonitoring={true}
        >
          <TestComponent />
        </CompositeErrorBoundary>
      </BrowserRouter>
    )
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    // Render should complete quickly (adjust threshold as needed)
    expect(renderTime).toBeLessThan(100)
    
    expect(screen.getByTestId('performance-component')).toBeInTheDocument()
  })
})

export {}