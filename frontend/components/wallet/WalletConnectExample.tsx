import React from 'react'
import { WalletConnectProvider, useWalletConnect } from './WalletConnectProvider'
import { WalletConnectButton } from './WalletConnectButton'

/**
 * Example component showing proper WalletConnect usage
 */
function WalletConnectStatus() {
  const { isInitialized, isInitializing, error } = useWalletConnect()

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
      <h3 className="text-lg font-semibold text-white mb-2">WalletConnect Status</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-gray-300">
            Initialized: {isInitialized ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isInitializing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-300">
            Initializing: {isInitializing ? 'Yes' : 'No'}
          </span>
        </div>
        {error && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-red-400">Error: {error.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function WalletConnectExample() {
  return (
    <WalletConnectProvider>
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            WalletConnect Integration Example
          </h2>
          <p className="text-gray-400 mb-6">
            This example shows how to use WalletConnect with proper initialization
            and error handling.
          </p>
        </div>

        <WalletConnectStatus />

        <div className="flex justify-center">
          <WalletConnectButton />
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>
            This implementation prevents duplicate WalletConnect Core initialization
            warnings in development mode and React.StrictMode.
          </p>
        </div>
      </div>
    </WalletConnectProvider>
  )
}