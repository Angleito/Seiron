'use client'

import React from 'react'
import { useWallet } from './WalletContext'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

/**
 * Example component demonstrating WalletContext usage
 */
export function WalletExample() {
  const { state, connect, disconnect, isConnecting, isConnected, address, chainId } = useWallet()

  // Pattern match on wallet state
  const renderWalletState = () => {
    switch (state.type) {
      case 'Disconnected':
        return (
          <div className="text-gray-500">
            <p>Wallet disconnected</p>
            <button 
              onClick={connect}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          </div>
        )
        
      case 'Connecting':
        return (
          <div className="text-yellow-500">
            <p>Connecting wallet...</p>
            <div className="mt-2 animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          </div>
        )
        
      case 'Connected':
        return (
          <div className="text-green-500">
            <p>Wallet connected!</p>
            <p className="mt-1 text-sm">Address: {state.address}</p>
            <p className="text-sm">Chain ID: {state.chainId}</p>
            <button 
              onClick={disconnect}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect
            </button>
          </div>
        )
        
      case 'Error':
        return (
          <div className="text-red-500">
            <p>Error: {state.error}</p>
            <button 
              onClick={connect}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        )
    }
  }

  // Example of using fp-ts Option for address
  const formattedAddress = pipe(
    address,
    O.map(addr => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
    O.getOrElse(() => 'Not connected')
  )

  // Example of using fp-ts Option for chainId
  const chainName = pipe(
    chainId,
    O.map(id => {
      switch (id) {
        case 1329: return 'Sei Network'
        case 1: return 'Ethereum Mainnet'
        case 56: return 'BSC'
        default: return `Chain ${id}`
      }
    }),
    O.getOrElse(() => 'No chain')
  )

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Wallet Context Example</h2>
      
      {/* State-based rendering */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Current State:</h3>
        {renderWalletState()}
      </div>
      
      {/* Quick status indicators */}
      <div className="border-t pt-4 space-y-2">
        <h3 className="font-semibold mb-2">Status Indicators:</h3>
        <p>Is Connecting: <span className={isConnecting ? 'text-yellow-500' : 'text-gray-500'}>{String(isConnecting)}</span></p>
        <p>Is Connected: <span className={isConnected ? 'text-green-500' : 'text-gray-500'}>{String(isConnected)}</span></p>
      </div>
      
      {/* Option-based values */}
      <div className="border-t pt-4 space-y-2">
        <h3 className="font-semibold mb-2">Wallet Info:</h3>
        <p>Address: <span className="font-mono text-sm">{formattedAddress}</span></p>
        <p>Network: <span className="text-sm">{chainName}</span></p>
      </div>
    </div>
  )
}

/**
 * Example of using WalletContext in a custom hook
 */
export function useWalletInfo() {
  const { state, address, chainId } = useWallet()
  
  return {
    isReady: state.type === 'Connected',
    shortAddress: pipe(
      address,
      O.map(addr => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
      O.toNullable
    ),
    networkName: pipe(
      chainId,
      O.map(id => {
        const networks: Record<number, string> = {
          1329: 'Sei Network',
          1: 'Ethereum',
          56: 'BSC',
          137: 'Polygon',
          42161: 'Arbitrum'
        }
        return networks[id] || `Unknown (${id})`
      }),
      O.toNullable
    )
  }
}

/**
 * Example guard component that only renders children when wallet is connected
 */
export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { state, connect } = useWallet()
  
  if (state.type !== 'Connected') {
    return (
      <div className="p-8 text-center">
        <p className="mb-4 text-gray-600">Please connect your wallet to continue</p>
        <button 
          onClick={connect}
          disabled={state.type === 'Connecting'}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {state.type === 'Connecting' ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {state.type === 'Error' && (
          <p className="mt-4 text-red-500 text-sm">{state.error}</p>
        )}
      </div>
    )
  }
  
  return <>{children}</>
}