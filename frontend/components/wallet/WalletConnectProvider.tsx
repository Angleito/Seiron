import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { walletConnectManager } from '../../utils/walletConnectManager'
import { walletErrorHandler } from '../../utils/walletErrorHandler'
import { logger } from '@lib/logger'

interface WalletConnectContextType {
  isInitialized: boolean
  isInitializing: boolean
  error: Error | null
  initialize: () => Promise<void>
}

const WalletConnectContext = createContext<WalletConnectContextType | null>(null)

interface WalletConnectProviderProps {
  children: ReactNode
}

/**
 * WalletConnect Provider Component
 * 
 * Provides WalletConnect initialization state and methods to child components.
 * Handles proper cleanup and prevents duplicate initialization.
 */
export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const initialize = async () => {
    if (isInitializing || isInitialized) {
      return
    }

    try {
      setIsInitializing(true)
      setError(null)
      
      await walletConnectManager.initialize()
      
      setIsInitialized(true)
      logger.debug('WalletConnect Provider initialization complete')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('WalletConnect initialization failed')
      const walletError = walletErrorHandler.handleError(error, {
        operation: 'walletconnect-initialization',
        component: 'WalletConnectProvider'
      })
      setError(error)
      logger.error('WalletConnect Provider initialization failed:', walletError)
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    // Initialize on mount
    initialize()

    // Cleanup on unmount
    return () => {
      logger.debug('WalletConnect Provider cleanup')
      setIsInitialized(false)
      setIsInitializing(false)
      setError(null)
    }
  }, [])

  const contextValue: WalletConnectContextType = {
    isInitialized,
    isInitializing,
    error,
    initialize,
  }

  return (
    <WalletConnectContext.Provider value={contextValue}>
      {children}
    </WalletConnectContext.Provider>
  )
}

/**
 * Hook to access WalletConnect context
 */
export function useWalletConnect(): WalletConnectContextType {
  const context = useContext(WalletConnectContext)
  if (!context) {
    throw new Error('useWalletConnect must be used within a WalletConnectProvider')
  }
  return context
}

/**
 * Higher-order component to wrap components that need WalletConnect
 */
export function withWalletConnect<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <WalletConnectProvider>
        <Component {...props} />
      </WalletConnectProvider>
    )
  }
}