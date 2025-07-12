import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { walletConnectManager } from '../../utils/walletConnectManager'
import { walletErrorHandler } from '../../utils/walletErrorHandler'
import { logger } from '@lib/logger'
import { envConfig } from '../../utils/envValidation'

// Global singleton state for WalletConnect to prevent interference between instances
interface WalletConnectGlobalState {
  isInitialized: boolean
  isInitializing: boolean
  initializationTimestamp: number | null
  initializationMethod: 'wagmi' | 'custom' | null
  instanceCount: number
  lastCleanupTimestamp: number | null
}

const getGlobalWalletConnectState = (): WalletConnectGlobalState => {
  if (typeof window === 'undefined') {
    return {
      isInitialized: false,
      isInitializing: false,
      initializationTimestamp: null,
      initializationMethod: null,
      instanceCount: 0,
      lastCleanupTimestamp: null
    }
  }

  if (!(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__) {
    (window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__ = {
      isInitialized: false,
      isInitializing: false,
      initializationTimestamp: null,
      initializationMethod: null,
      instanceCount: 0,
      lastCleanupTimestamp: null
    }
  }

  return (window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__
}

const updateGlobalWalletConnectState = (updates: Partial<WalletConnectGlobalState>) => {
  if (typeof window !== 'undefined') {
    const currentState = getGlobalWalletConnectState()
    ;(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__ = {
      ...currentState,
      ...updates
    }
  }
}

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
 * Uses a robust singleton pattern to prevent interference between instances and Wagmi.
 * 
 * IMPORTANT: This provider will automatically detect if WalletConnect is being
 * handled by Wagmi and skip custom initialization. The singleton state persists
 * across component mount/unmount cycles to prevent double initialization.
 */
export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const initialize = async () => {
    const globalState = getGlobalWalletConnectState()
    
    // ROBUST SINGLETON: Check global state first
    if (globalState.isInitializing || globalState.isInitialized) {
      logger.debug('WalletConnect already initialized globally', {
        method: globalState.initializationMethod,
        timestamp: globalState.initializationTimestamp,
        instanceCount: globalState.instanceCount
      })
      setIsInitialized(globalState.isInitialized)
      setIsInitializing(globalState.isInitializing)
      return
    }

    // WAGMI DETECTION: Check if Wagmi is handling WalletConnect
    const isWagmiHandlingWalletConnect = envConfig.isValid.walletConnect
    
    // EXISTING INSTANCE DETECTION: Check for any existing WalletConnect instances
    const hasWagmiWalletConnect = typeof window !== 'undefined' && 
      (window as any).__WAGMI_WALLETCONNECT_INITIALIZED__ === true
    
    const hasLegacyWalletConnect = typeof window !== 'undefined' && (
      (window as any).__WALLET_CONNECT_INITIALIZED__ === true ||
      (window as any).__WALLETCONNECT_INITIALIZED__ === true ||
      (window as any).WalletConnectCore !== undefined
    )
    
    // SKIP CUSTOM INITIALIZATION: If Wagmi or other instance is handling it
    if (isWagmiHandlingWalletConnect || hasWagmiWalletConnect || hasLegacyWalletConnect) {
      logger.debug('WalletConnect handled by Wagmi, marking as initialized', {
        wagmiConfigured: isWagmiHandlingWalletConnect,
        wagmiInstance: hasWagmiWalletConnect,
        legacyInstance: hasLegacyWalletConnect,
        globalState
      })
      
      // UPDATE GLOBAL STATE: Mark as initialized by Wagmi
      updateGlobalWalletConnectState({
        isInitialized: true,
        isInitializing: false,
        initializationTimestamp: Date.now(),
        initializationMethod: 'wagmi'
      })
      
      setIsInitialized(true)
      setIsInitializing(false)
      return
    }

    // CUSTOM INITIALIZATION: Only if no other instance exists
    try {
      logger.debug('Starting custom WalletConnect initialization')
      
      // UPDATE GLOBAL STATE: Mark as initializing
      updateGlobalWalletConnectState({
        isInitializing: true,
        initializationMethod: 'custom'
      })
      
      setIsInitializing(true)
      setError(null)
      
      await walletConnectManager.initialize()
      
      // UPDATE GLOBAL STATE: Mark as initialized
      updateGlobalWalletConnectState({
        isInitialized: true,
        isInitializing: false,
        initializationTimestamp: Date.now()
      })
      
      setIsInitialized(true)
      logger.debug('Custom WalletConnect initialization complete')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('WalletConnect initialization failed')
      const walletError = walletErrorHandler.handleError(error, {
        operation: 'walletconnect-initialization',
        component: 'WalletConnectProvider'
      })
      
      // UPDATE GLOBAL STATE: Reset on error
      updateGlobalWalletConnectState({
        isInitialized: false,
        isInitializing: false,
        initializationTimestamp: null,
        initializationMethod: null
      })
      
      setError(error)
      logger.error('WalletConnect Provider initialization failed:', walletError)
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    // INCREMENT INSTANCE COUNT
    const globalState = getGlobalWalletConnectState()
    updateGlobalWalletConnectState({
      instanceCount: globalState.instanceCount + 1
    })
    
    // Initialize on mount
    initialize()

    // SAFE CLEANUP: Only decrement instance count, never clear Wagmi flags
    return () => {
      const currentState = getGlobalWalletConnectState()
      const newInstanceCount = Math.max(0, currentState.instanceCount - 1)
      
      logger.debug('WalletConnect Provider cleanup', {
        remainingInstances: newInstanceCount,
        initializationMethod: currentState.initializationMethod
      })
      
      updateGlobalWalletConnectState({
        instanceCount: newInstanceCount,
        lastCleanupTimestamp: Date.now()
      })
      
      // CRITICAL: Never clear global state if initialized by Wagmi
      // This prevents interference with Wagmi's WalletConnect handling
      
      // Only clear local component state
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