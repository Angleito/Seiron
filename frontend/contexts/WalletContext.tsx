'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useDisconnect } from 'wagmi'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

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

// Analytics event types
export type AnalyticsEvent =
  | { type: 'wallet_connected'; address: string; chainId: number }
  | { type: 'wallet_disconnected'; address?: string }
  | { type: 'wallet_error'; error: string }
  | { type: 'chain_changed'; from?: number; to: number }
  | { type: 'account_changed'; from?: string; to: string }

// ============================================================================
// Constants
// ============================================================================

const WALLET_STATE_KEY = 'seiron_wallet_state'

// ============================================================================
// Analytics
// ============================================================================

const emitAnalyticsEvent = (event: AnalyticsEvent): void => {
  // In production, this would send to your analytics service
  console.log('[Analytics]', event)
  
  // Emit custom event for other parts of the app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallet-analytics', { detail: event }))
  }
}

// ============================================================================
// Local Storage
// ============================================================================

const saveWalletState = (state: WalletState): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WALLET_STATE_KEY, JSON.stringify(state))
    }
  } catch (error) {
    console.error('Failed to save wallet state:', error)
  }
}

const loadWalletState = (): O.Option<WalletState> => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(WALLET_STATE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate the loaded state
        if (parsed.type && ['Disconnected', 'Connecting', 'Connected', 'Error'].includes(parsed.type)) {
          return O.some(parsed as WalletState)
        }
      }
    }
  } catch (error) {
    console.error('Failed to load wallet state:', error)
  }
  return O.none
}

const clearWalletState = (): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WALLET_STATE_KEY)
    }
  } catch (error) {
    console.error('Failed to clear wallet state:', error)
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
              saveWalletState(newState)
              emitAnalyticsEvent({
                type: 'wallet_connected',
                address: action.address,
                chainId: action.chainId
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
              clearWalletState()
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
          const address = s.type === 'Connected' ? s.address : undefined
          clearWalletState()
          emitAnalyticsEvent({
            type: 'wallet_disconnected',
            address
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
              saveWalletState(newState)
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
              saveWalletState(newState)
              emitAnalyticsEvent({
                type: 'account_changed',
                from: s.address,
                to: action.address
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
  // Initialize state from localStorage or default
  const initialState = pipe(
    loadWalletState(),
    O.fold(
      () => ({ type: 'Disconnected' } as WalletState),
      (state) => state
    )
  )

  const [state, dispatch] = useReducer(walletReducer, initialState)

  // Privy hooks
  const { login, logout, ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  
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
      console.error('Failed to disconnect:', error)
      // Force disconnect even on error
      dispatch({ type: 'DISCONNECT' })
    }
  }, [logout, wagmiDisconnect])

  // Sync with Privy/Wagmi state
  useEffect(() => {
    if (!ready) return

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
  }, [ready, authenticated, isConnected, address, chainId, state])

  // Listen for account changes
  useEffect(() => {
    if (state.type === 'Connected' && address && address !== state.address) {
      dispatch({
        type: 'ACCOUNT_CHANGED',
        address
      })
    }
  }, [address, state])

  // Listen for chain changes
  useEffect(() => {
    if (state.type === 'Connected' && chainId && chainId !== state.chainId) {
      dispatch({
        type: 'CHAIN_CHANGED',
        chainId
      })
    }
  }, [chainId, state])

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