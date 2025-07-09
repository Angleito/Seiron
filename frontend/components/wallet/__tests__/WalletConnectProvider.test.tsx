import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { WalletConnectProvider, useWalletConnect } from '../WalletConnectProvider'
import { walletConnectManager } from '../../../utils/walletConnectManager'

// Mock the WalletConnect manager
jest.mock('../../../utils/walletConnectManager', () => ({
  walletConnectManager: {
    initialize: jest.fn(),
    reset: jest.fn(),
    initialized: false,
  },
}))

// Mock logger
jest.mock('@lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockWalletConnectManager = walletConnectManager as jest.Mocked<typeof walletConnectManager>

// Test component that uses the WalletConnect hook
function TestComponent() {
  const { isInitialized, isInitializing, error } = useWalletConnect()
  
  return (
    <div>
      <div data-testid="initialized">{isInitialized ? 'true' : 'false'}</div>
      <div data-testid="initializing">{isInitializing ? 'true' : 'false'}</div>
      <div data-testid="error">{error?.message || 'no error'}</div>
    </div>
  )
}

describe('WalletConnectProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWalletConnectManager.initialize.mockResolvedValue()
  })

  it('should initialize WalletConnect on mount', async () => {
    render(
      <WalletConnectProvider>
        <TestComponent />
      </WalletConnectProvider>
    )

    expect(mockWalletConnectManager.initialize).toHaveBeenCalledTimes(1)
    
    await waitFor(() => {
      expect(screen.getByTestId('initialized')).toHaveTextContent('true')
    })
  })

  it('should show initializing state', async () => {
    // Make initialize method pending
    mockWalletConnectManager.initialize.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <WalletConnectProvider>
        <TestComponent />
      </WalletConnectProvider>
    )

    expect(screen.getByTestId('initializing')).toHaveTextContent('true')
    expect(screen.getByTestId('initialized')).toHaveTextContent('false')
  })

  it('should handle initialization errors', async () => {
    const errorMessage = 'Initialization failed'
    mockWalletConnectManager.initialize.mockRejectedValue(new Error(errorMessage))

    render(
      <WalletConnectProvider>
        <TestComponent />
      </WalletConnectProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage)
    })
    
    expect(screen.getByTestId('initialized')).toHaveTextContent('false')
    expect(screen.getByTestId('initializing')).toHaveTextContent('false')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useWalletConnect must be used within a WalletConnectProvider')

    console.error = originalError
  })

  it('should cleanup on unmount', () => {
    const { unmount } = render(
      <WalletConnectProvider>
        <TestComponent />
      </WalletConnectProvider>
    )

    unmount()

    // The cleanup happens in useEffect cleanup, which is internal
    // We can't directly test it, but we can ensure no errors occur
    expect(mockWalletConnectManager.initialize).toHaveBeenCalledTimes(1)
  })
})