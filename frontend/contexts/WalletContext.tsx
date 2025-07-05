'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useDisconnect } from 'wagmi'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { logger } from '@lib/logger'
import { secureLocalStorage } from '@lib/security/secureStorage'

// ============================================================================
// Types
// ============================================================================

// Wallet states as discriminated union
export type WalletState =
  | { type: 'Disconnected' }
  | { type: 'Connecting' }
  | { type: 'Connected'; address: string; chainId: number }
  | { type: 'Error'; error: string }

// Actions as discriminated union
export type WalletAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; address: string; chainId: number }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'DISCONNECT' }
  | { type: 'CHAIN_CHANGED'; chainId: number }
  | { type: 'ACCOUNT_CHANGED'; address: string }

// Context type
export interface WalletContextType {
  state: WalletState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  isConnecting: boolean
  isConnected: boolean
  address: O.Option<string>
  chainId: O.Option<number>
}

// Analytics event types (sanitized for logging)
export type AnalyticsEvent =
  | { type: 'wallet_connected'; chainId: number }
  | { type: 'wallet_disconnected' }
  | { type: 'wallet_error'; error: string }
  | { type: 'chain_changed'; from?: number; to: number }
  | { type: 'account_changed' } // Removed sensitive address data

// ============================================================================
// Constants
// ============================================================================

const WALLET_STATE_KEY = 'wallet_state'

// ============================================================================
// Analytics
// ============================================================================

const emitAnalyticsEvent = (event: AnalyticsEvent): void => {
  // Only log non-sensitive analytics data
  logger.debug('[Analytics]', event)
  
  // Emit custom event for other parts of the app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallet-analytics', { detail: event }))
  }
}

// ============================================================================
// Secure Local Storage
// ============================================================================

const saveWalletState = async (state: WalletState): Promise<void> => {
  try {
    if (typeof window !== 'undefined') {
      const result = await secureLocalStorage.setItem(WALLET_STATE_KEY, state)
      if (E.isLeft(result)) {
        logger.error('Failed to save wallet state:', result.left.message)
      }
    }
  } catch (error) {
    logger.error('Failed to save wallet state:', error)
  }
}

const loadWalletState = async (): Promise<O.Option<WalletState>> => {
  try {
    if (typeof window !== 'undefined') {
      const saved = await secureLocalStorage.getItem<WalletState>(WALLET_STATE_KEY)
      return pipe(
        saved,
        O.filter(state => 
          state.type && ['Disconnected', 'Connecting', 'Connected', 'Error'].includes(state.type)
        )
      )
    }
  } catch (error) {
    logger.error('Failed to load wallet state:', error)
  }
  return O.none
}

const clearWalletState = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined') {
      const result = await secureLocalStorage.removeItem(WALLET_STATE_KEY)
      if (E.isLeft(result)) {
        logger.error('Failed to clear wallet state:', result.left.message)
      }
    }
  } catch (error) {
    logger.error('Failed to clear wallet state:', error)
  }
}

// ============================================================================
// Reducer with Pattern Matching
// ============================================================================

export const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  // Pattern matching on action type
  switch (action.type) {
    case 'CONNECT_START':
      return pipe(
        state,
        (s) => {
          // Only transition from Disconnected or Error states
          switch (s.type) {
            case 'Disconnected':
            case 'Error':
              return { type: 'Connecting' } as WalletState
            default:
              return s
          }
        }
      )

    case 'CONNECT_SUCCESS':
      return pipe(
        state,
        (s) => {
          // Only transition from Connecting state
          switch (s.type) {
            case 'Connecting':
              const newState: WalletState = {
                type: 'Connected',
                address: action.address,
                chainId: action.chainId
              }
              // Save state asynchronously without blocking
              saveWalletState(newState).catch(error => 
                logger.error('Failed to save wallet state after connect:', error)
              )
              emitAnalyticsEvent({
                type: 'wallet_connected',
                chainId: action.chainId // Only include non-sensitive data
              })
              return newState
            default:
              return s
          }
        }
      )

    case 'CONNECT_ERROR':
      return pipe(
        state,
        (s) => {
          // Only transition from Connecting state
          switch (s.type) {
            case 'Connecting':
              const newState: WalletState = {
                type: 'Error',
                error: action.error
              }
              // Clear state asynchronously without blocking
              clearWalletState().catch(error => 
                logger.error('Failed to clear wallet state after error:', error)
              )
              emitAnalyticsEvent({
                type: 'wallet_error',
                error: action.error
              })
              return newState
            default:
              return s
          }
        }
      )

    case 'DISCONNECT':
      return pipe(
        state,
        (s) => {
          // Clear state asynchronously without blocking
          clearWalletState().catch(error => 
            logger.error('Failed to clear wallet state after disconnect:', error)
          )
          emitAnalyticsEvent({
            type: 'wallet_disconnected'
          })
          return { type: 'Disconnected' } as WalletState
        }
      )

    case 'CHAIN_CHANGED':
      return pipe(
        state,
        (s) => {
          // Only update if connected
          switch (s.type) {
            case 'Connected':
              const newState: WalletState = {
                ...s,
                chainId: action.chainId
              }
              // Save state asynchronously without blocking
              saveWalletState(newState).catch(error => 
                logger.error('Failed to save wallet state after chain change:', error)
              )
              emitAnalyticsEvent({
                type: 'chain_changed',
                from: s.chainId,
                to: action.chainId
              })
              return newState
            default:
              return s
          }
        }
      )

    case 'ACCOUNT_CHANGED':
      return pipe(
        state,
        (s) => {
          // Only update if connected
          switch (s.type) {
            case 'Connected':
              const newState: WalletState = {
                ...s,
                address: action.address
              }
              // Save state asynchronously without blocking
              saveWalletState(newState).catch(error => 
                logger.error('Failed to save wallet state after account change:', error)
              )
              emitAnalyticsEvent({
                type: 'account_changed' // No sensitive address data
              })
              return newState
            default:
              return s
          }
        }
      )

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with default, then load from secure storage
  const [state, dispatch] = useReducer(walletReducer, { type: 'Disconnected' } as WalletState)
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Load initial state from secure storage
  useEffect(() => {
    const initializeState = async () => {
      try {
        const savedState = await loadWalletState()
        if (O.isSome(savedState)) {
          // Restore the saved state
          const restoredState = savedState.value
          if (restoredState.type === 'Connected') {
            dispatch({
              type: 'CONNECT_SUCCESS',
              address: restoredState.address,
              chainId: restoredState.chainId
            })
          } else if (restoredState.type === 'Error') {
            dispatch({
              type: 'CONNECT_ERROR',
              error: restoredState.error
            })
          }
        }
      } catch (error) {
        logger.error('Failed to initialize wallet state:', error)
      } finally {
        setIsInitialized(true)
      }
    }
    
    initializeState()
  }, [])

  // Privy hooks
  const { login, logout, ready, authenticated } = usePrivy()
  // const { wallets } = useWallets() // Available for future wallet selection features
  
  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()

  // Connect wallet
  const connect = useCallback(async () => {
    dispatch({ type: 'CONNECT_START' })
    
    try {
      await login()
    } catch (error) {
      dispatch({
        type: 'CONNECT_ERROR',
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      })
    }
  }, [login])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await logout()
      wagmiDisconnect()
      dispatch({ type: 'DISCONNECT' })
    } catch (error) {
      logger.error('Failed to disconnect:', error)
      // Force disconnect even on error
      dispatch({ type: 'DISCONNECT' })
    }
  }, [logout, wagmiDisconnect])

  // Sync with Privy/Wagmi state (only after initialization)
  useEffect(() => {
    if (!ready || !isInitialized) return

    if (authenticated && isConnected && address && chainId) {
      // Connected
      if (state.type !== 'Connected' || state.address !== address || state.chainId !== chainId) {
        dispatch({
          type: 'CONNECT_SUCCESS',
          address,
          chainId
        })
      }
    } else if (!authenticated || !isConnected) {
      // Disconnected
      if (state.type !== 'Disconnected') {
        dispatch({ type: 'DISCONNECT' })
      }
    }
  }, [ready, authenticated, isConnected, address, chainId, state, isInitialized])

  // Listen for account changes
  useEffect(() => {
    if (isInitialized && state.type === 'Connected' && address && address !== state.address) {
      dispatch({
        type: 'ACCOUNT_CHANGED',
        address
      })
    }
  }, [address, state, isInitialized])

  // Listen for chain changes
  useEffect(() => {
    if (isInitialized && state.type === 'Connected' && chainId && chainId !== state.chainId) {
      dispatch({
        type: 'CHAIN_CHANGED',
        chainId
      })
    }
  }, [chainId, state, isInitialized])

  // Memoized values
  const contextValue = useMemo<WalletContextType>(() => ({
    state,
    connect,
    disconnect,
    isConnecting: state.type === 'Connecting',
    isConnected: state.type === 'Connected',
    address: state.type === 'Connected' ? O.some(state.address) : O.none,
    chainId: state.type === 'Connected' ? O.some(state.chainId) : O.none
  }), [state, connect, disconnect])

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// ============================================================================
// Utility Functions
// ============================================================================

export const isConnected = (state: WalletState): state is Extract<WalletState, { type: 'Connected' }> =>
  state.type === 'Connected'

export const isError = (state: WalletState): state is Extract<WalletState, { type: 'Error' }> =>
  state.type === 'Error'

export const getAddress = (state: WalletState): O.Option<string> =>
  state.type === 'Connected' ? O.some(state.address) : O.none

export const getChainId = (state: WalletState): O.Option<number> =>
  state.type === 'Connected' ? O.some(state.chainId) : O.none

// ============================================================================
// Export additional types for testing
// ============================================================================

export type { AnalyticsEvent }