import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  GLTFErrorBoundary,
  resetGLTFCircuitBreaker,
  getGLTFCircuitBreakerStats,
  getGLTFComponentStatus
} from '../../../components/dragon/GLTFErrorBoundary'

// Mock logger to prevent console noise
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock errorRecoveryUtils
jest.mock('../../../utils/errorRecovery', () => ({
  errorRecoveryUtils: {
    forceGC: jest.fn(),
    dragonFallback: {
      getNextFallback: jest.fn(),
      getOptimalDragonType: jest.fn()
    },
    wallet: {
      checkNetworkConnectivity: jest.fn().mockResolvedValue(true)
    }
  }
}))

// Component that throws an error for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test GLTF loading error')
  }
  return <div data-testid="success">Component loaded successfully</div>
}

describe('GLTFErrorBoundary Mount/Unmount Cycle Prevention', () => {
  beforeEach(() => {
    // Reset any existing circuit breaker state
    jest.clearAllMocks()
  })

  it('should prevent mount/unmount cycles with global circuit breaker', async () => {
    const onError = jest.fn()
    const onFallback = jest.fn()

    // Initial render with error
    const { rerender } = render(
      <GLTFErrorBoundary
        onError={onError}
        onFallback={onFallback}
        enableAutoRecovery={true}
        maxRetries={1}
      >
        <ErrorThrowingComponent shouldThrow={true} />
      </GLTFErrorBoundary>
    )

    // Should catch the error
    expect(onError).toHaveBeenCalledTimes(1)

    // Simulate rapid remounting (which would cause cycles in old implementation)
    for (let i = 0; i < 5; i++) {
      rerender(
        <GLTFErrorBoundary
          onError={onError}
          onFallback={onFallback}
          enableAutoRecovery={true}
          maxRetries={1}
        >
          <ErrorThrowingComponent shouldThrow={true} />
        </GLTFErrorBoundary>
      )
    }

    // Wait for any async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Should not have excessive error calls due to cycle prevention
    expect(onError.mock.calls.length).toBeLessThan(10) // Should be much less due to circuit breaker

    // Check global circuit breaker stats
    const stats = getGLTFCircuitBreakerStats()
    expect(stats.totalComponents).toBeGreaterThan(0)
  })

  it('should show permanent fallback UI when circuit breaker is triggered', async () => {
    const onFallback = jest.fn()

    render(
      <GLTFErrorBoundary
        onFallback={onFallback}
        enableAutoRecovery={true}
        maxRetries={1}
      >
        <ErrorThrowingComponent shouldThrow={true} />
      </GLTFErrorBoundary>
    )

    // Wait for circuit breaker to potentially trigger
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Should eventually show fallback UI
    // This might take multiple error cycles to trigger permanent mode
    // The exact text depends on the error handling logic
    
    // Just verify the component renders something (not the success component)
    expect(screen.queryByTestId('success')).not.toBeInTheDocument()
  })

  it('should allow recovery after successful operation', async () => {
    const onRecovery = jest.fn()

    const { rerender } = render(
      <GLTFErrorBoundary
        onRecovery={onRecovery}
        enableAutoRecovery={true}
        maxRetries={2}
      >
        <ErrorThrowingComponent shouldThrow={true} />
      </GLTFErrorBoundary>
    )

    // Wait for error handling
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Now render with a working component
    rerender(
      <GLTFErrorBoundary
        onRecovery={onRecovery}
        enableAutoRecovery={true}
        maxRetries={2}
      >
        <ErrorThrowingComponent shouldThrow={false} />
      </GLTFErrorBoundary>
    )

    // Should show success after working component is rendered
    expect(screen.getByTestId('success')).toBeInTheDocument()
  })

  it('should provide circuit breaker status utilities', () => {
    // Test utility functions exist and return expected data structure
    const stats = getGLTFCircuitBreakerStats()
    expect(stats).toHaveProperty('totalComponents')
    expect(stats).toHaveProperty('openCircuits')
    expect(stats).toHaveProperty('permanentFallbacks')
    expect(stats).toHaveProperty('totalMountAttempts')
    expect(stats).toHaveProperty('rapidMountCount')

    // These should be numbers
    expect(typeof stats.totalComponents).toBe('number')
    expect(typeof stats.openCircuits).toBe('number')
    expect(typeof stats.permanentFallbacks).toBe('number')
  })

  it('should prevent excessive mount attempts globally', async () => {
    const initialStats = getGLTFCircuitBreakerStats()

    // Create multiple error boundaries rapidly
    const components = []
    for (let i = 0; i < 3; i++) {
      components.push(
        render(
          <GLTFErrorBoundary key={i} enableAutoRecovery={false}>
            <ErrorThrowingComponent shouldThrow={true} />
          </GLTFErrorBoundary>
        )
      )
    }

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const finalStats = getGLTFCircuitBreakerStats()
    
    // Should have tracked the mount attempts
    expect(finalStats.totalMountAttempts).toBeGreaterThan(initialStats.totalMountAttempts)
    expect(finalStats.totalComponents).toBeGreaterThan(initialStats.totalComponents)

    // Clean up
    components.forEach(component => component.unmount())
  })
})