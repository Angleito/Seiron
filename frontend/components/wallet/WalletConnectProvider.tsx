import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getWalletConnectManager } from '@/utils/walletConnectManager'

interface WalletConnectContextValue {
  isInitialized: boolean
  isInitializing: boolean
  error: Error | null
}

const WalletConnectContext = createContext<WalletConnectContextValue>({
  isInitialized: false,
  isInitializing: false,
  error: null,
})

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initializationRef = useRef(false)
  
  useEffect(() => {
    // Guard against multiple initializations
    if (initializationRef.current) {
      return
    }
    
    initializationRef.current = true
    let mounted = true
    
    const initializeWalletConnect = async () => {
      try {
        const manager = getWalletConnectManager()
        
        // Check if already initialized
        if (manager.isInitialized()) {
          if (mounted) {
            setIsInitialized(true)
            setIsInitializing(false)
          }
          return
        }
        
        // Initialize
        await manager.initialize()
        
        if (mounted) {
          setIsInitialized(true)
          setIsInitializing(false)
        }
      } catch (err) {
        console.error('[WalletConnect] Initialization error:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize WalletConnect'))
          setIsInitializing(false)
        }
      }
    }
    
    initializeWalletConnect()
    
    return () => {
      mounted = false
      // Cleanup console filters when provider unmounts
      const manager = getWalletConnectManager()
      if (manager && typeof manager.cleanup === 'function') {
        manager.cleanup()
      }
    }
  }, [])
  
  return (
    <WalletConnectContext.Provider value={{ isInitialized, isInitializing, error }}>
      {children}
    </WalletConnectContext.Provider>
  )
}

export function useWalletConnect() {
  const context = useContext(WalletConnectContext)
  if (!context) {
    throw new Error('useWalletConnect must be used within WalletConnectProvider')
  }
  return context
}