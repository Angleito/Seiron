import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useDisconnect } from 'wagmi'
import * as O from 'fp-ts/Option'
import { WalletProvider, useWallet, walletReducer, isConnected, isError, getAddress, getChainId } from '../WalletContext'
import type { WalletState, WalletAction, AnalyticsEvent } from '../WalletContext'

// Mock Privy and Wagmi
jest.mock('@privy-io/react-auth')
jest.mock('wagmi')

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
}
global.localStorage = localStorageMock

// Mock console for analytics
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = jest.fn()
})
afterEach(() => {
  console.log = originalConsoleLog
})

describe('WalletContext', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Default mock implementations
    ;(usePrivy as jest.Mock).mockReturnValue({
      login: jest.fn(),
      logout: jest.fn(),
      ready: true,
      authenticated: false
    })
    
    ;(useWallets as jest.Mock).mockReturnValue({
      wallets: []
    })
    
    ;(useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false,
      chainId: undefined
    })
    
    ;(useDisconnect as jest.Mock).mockReturnValue({
      disconnect: jest.fn()
    })
  })

  describe('walletReducer', () => {
    it('should handle CONNECT_START from Disconnected state', () => {
      const state: WalletState = { type: 'Disconnected' }
      const action: WalletAction = { type: 'CONNECT_START' }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({ type: 'Connecting' })
    })

    it('should handle CONNECT_START from Error state', () => {
      const state: WalletState = { type: 'Error', error: 'Some error' }
      const action: WalletAction = { type: 'CONNECT_START' }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({ type: 'Connecting' })
    })

    it('should not handle CONNECT_START from Connected state', () => {
      const state: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const action: WalletAction = { type: 'CONNECT_START' }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual(state)
    })

    it('should handle CONNECT_SUCCESS from Connecting state', () => {
      const state: WalletState = { type: 'Connecting' }
      const action: WalletAction = { 
        type: 'CONNECT_SUCCESS', 
        address: '0x123',
        chainId: 1329 
      }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({
        type: 'Connected',
        address: '0x123',
        chainId: 1329
      })
    })

    it('should handle CONNECT_ERROR from Connecting state', () => {
      const state: WalletState = { type: 'Connecting' }
      const action: WalletAction = { 
        type: 'CONNECT_ERROR', 
        error: 'Connection failed' 
      }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({
        type: 'Error',
        error: 'Connection failed'
      })
    })

    it('should handle DISCONNECT from any state', () => {
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const action: WalletAction = { type: 'DISCONNECT' }
      const newState = walletReducer(connectedState, action)
      
      expect(newState).toEqual({ type: 'Disconnected' })
    })

    it('should handle CHAIN_CHANGED when Connected', () => {
      const state: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const action: WalletAction = { type: 'CHAIN_CHANGED', chainId: 56 }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({
        type: 'Connected',
        address: '0x123',
        chainId: 56
      })
    })

    it('should handle ACCOUNT_CHANGED when Connected', () => {
      const state: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const action: WalletAction = { type: 'ACCOUNT_CHANGED', address: '0x456' }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual({
        type: 'Connected',
        address: '0x456',
        chainId: 1
      })
    })

    it('should not handle CHAIN_CHANGED when Disconnected', () => {
      const state: WalletState = { type: 'Disconnected' }
      const action: WalletAction = { type: 'CHAIN_CHANGED', chainId: 56 }
      const newState = walletReducer(state, action)
      
      expect(newState).toEqual(state)
    })
  })

  describe('useWallet hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WalletProvider>{children}</WalletProvider>
    )

    it('should provide initial disconnected state', () => {
      const { result } = renderHook(() => useWallet(), { wrapper })
      
      expect(result.current.state).toEqual({ type: 'Disconnected' })
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.isConnected).toBe(false)
      expect(O.isNone(result.current.address)).toBe(true)
      expect(O.isNone(result.current.chainId)).toBe(true)
    })

    it('should handle connect flow', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: mockLogin,
        logout: jest.fn(),
        ready: true,
        authenticated: false
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      await act(async () => {
        await result.current.connect()
      })
      
      expect(mockLogin).toHaveBeenCalled()
      expect(result.current.state.type).toBe('Connecting')
    })

    it('should handle disconnect flow', async () => {
      const mockLogout = jest.fn().mockResolvedValue(undefined)
      const mockWagmiDisconnect = jest.fn()
      
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: mockLogout,
        ready: true,
        authenticated: true
      })
      
      ;(useDisconnect as jest.Mock).mockReturnValue({
        disconnect: mockWagmiDisconnect
      })
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x123',
        isConnected: true,
        chainId: 1329
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      // Wait for connected state
      await waitFor(() => {
        expect(result.current.state.type).toBe('Connected')
      })
      
      await act(async () => {
        await result.current.disconnect()
      })
      
      expect(mockLogout).toHaveBeenCalled()
      expect(mockWagmiDisconnect).toHaveBeenCalled()
    })

    it('should sync with Privy/Wagmi state', async () => {
      const { result, rerender } = renderHook(() => useWallet(), { wrapper })
      
      // Initially disconnected
      expect(result.current.state.type).toBe('Disconnected')
      
      // Mock connected state
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        ready: true,
        authenticated: true
      })
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x123',
        isConnected: true,
        chainId: 1329
      })
      
      rerender()
      
      await waitFor(() => {
        expect(result.current.state).toEqual({
          type: 'Connected',
          address: '0x123',
          chainId: 1329
        })
      })
    })

    it('should persist state to localStorage', async () => {
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        ready: true,
        authenticated: true
      })
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x123',
        isConnected: true,
        chainId: 1329
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.state.type).toBe('Connected')
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'seiron_wallet_state',
        JSON.stringify({
          type: 'Connected',
          address: '0x123',
          chainId: 1329
        })
      )
    })

    it('should load state from localStorage', () => {
      const savedState: WalletState = {
        type: 'Connected',
        address: '0x789',
        chainId: 56
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))
      
      const { result } = renderHook(() => useWallet(), { wrapper })
      
      expect(result.current.state).toEqual(savedState)
    })

    it('should emit analytics events', async () => {
      const mockDispatchEvent = jest.fn()
      global.dispatchEvent = mockDispatchEvent
      
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        ready: true,
        authenticated: true
      })
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x123',
        isConnected: true,
        chainId: 1329
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.state.type).toBe('Connected')
      })
      
      // Check console log for analytics
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics]',
        expect.objectContaining({
          type: 'wallet_connected',
          address: '0x123',
          chainId: 1329
        })
      )
      
      // Check custom event
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wallet-analytics',
          detail: expect.objectContaining({
            type: 'wallet_connected'
          })
        })
      )
    })
  })

  describe('Utility functions', () => {
    it('isConnected should correctly identify connected state', () => {
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const disconnectedState: WalletState = { type: 'Disconnected' }
      
      expect(isConnected(connectedState)).toBe(true)
      expect(isConnected(disconnectedState)).toBe(false)
    })

    it('isError should correctly identify error state', () => {
      const errorState: WalletState = { type: 'Error', error: 'Failed' }
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      
      expect(isError(errorState)).toBe(true)
      expect(isError(connectedState)).toBe(false)
    })

    it('getAddress should return Option of address', () => {
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const disconnectedState: WalletState = { type: 'Disconnected' }
      
      expect(O.isSome(getAddress(connectedState))).toBe(true)
      expect(O.isNone(getAddress(disconnectedState))).toBe(true)
      
      if (O.isSome(getAddress(connectedState))) {
        expect(getAddress(connectedState).value).toBe('0x123')
      }
    })

    it('getChainId should return Option of chainId', () => {
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1329 }
      const disconnectedState: WalletState = { type: 'Disconnected' }
      
      expect(O.isSome(getChainId(connectedState))).toBe(true)
      expect(O.isNone(getChainId(disconnectedState))).toBe(true)
      
      if (O.isSome(getChainId(connectedState))) {
        expect(getChainId(connectedState).value).toBe(1329)
      }
    })
  })

  describe('Error handling', () => {
    it('should handle connect error', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Connection failed'))
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: mockLogin,
        logout: jest.fn(),
        ready: true,
        authenticated: false
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      await act(async () => {
        await result.current.connect()
      })
      
      await waitFor(() => {
        expect(result.current.state).toEqual({
          type: 'Error',
          error: 'Connection failed'
        })
      })
    })

    it('should handle disconnect error gracefully', async () => {
      const mockLogout = jest.fn().mockRejectedValue(new Error('Logout failed'))
      const mockWagmiDisconnect = jest.fn()
      
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: mockLogout,
        ready: true,
        authenticated: true
      })
      
      ;(useDisconnect as jest.Mock).mockReturnValue({
        disconnect: mockWagmiDisconnect
      })

      const { result } = renderHook(() => useWallet(), { wrapper })
      
      await act(async () => {
        await result.current.disconnect()
      })
      
      // Should still disconnect even on error
      expect(result.current.state).toEqual({ type: 'Disconnected' })
    })
  })

  describe('State transitions', () => {
    it('should only allow valid state transitions', () => {
      // Test invalid transition: Connected -> Connecting
      const connectedState: WalletState = { type: 'Connected', address: '0x123', chainId: 1 }
      const connectAction: WalletAction = { type: 'CONNECT_START' }
      const result = walletReducer(connectedState, connectAction)
      
      // State should remain unchanged
      expect(result).toEqual(connectedState)
    })

    it('should handle rapid state changes', async () => {
      const { result, rerender } = renderHook(() => useWallet(), { wrapper })
      
      // Simulate rapid authentication changes
      ;(usePrivy as jest.Mock).mockReturnValue({
        login: jest.fn(),
        logout: jest.fn(),
        ready: true,
        authenticated: true
      })
      
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x123',
        isConnected: true,
        chainId: 1329
      })
      
      rerender()
      
      // Change address rapidly
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x456',
        isConnected: true,
        chainId: 1329
      })
      
      rerender()
      
      // Change chain rapidly
      ;(useAccount as jest.Mock).mockReturnValue({
        address: '0x456',
        isConnected: true,
        chainId: 56
      })
      
      rerender()
      
      await waitFor(() => {
        expect(result.current.state).toEqual({
          type: 'Connected',
          address: '0x456',
          chainId: 56
        })
      })
    })
  })
})

describe('WalletContext without provider', () => {
  it('should throw error when useWallet is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      renderHook(() => useWallet())
    }).toThrow('useWallet must be used within a WalletProvider')
    
    console.error = originalError
  })
})