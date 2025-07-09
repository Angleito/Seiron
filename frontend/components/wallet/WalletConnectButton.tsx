'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Wallet, Power, LogOut, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { logger } from '@lib/logger'
import { 
  detectWalletType, 
  getCompatibilityErrorMessage,
  type WalletType
} from '@utils/walletCompatibility'
import { seiMainnet } from '@config/privy'
import { DragonWalletErrorBoundary } from '../error-boundaries/WalletErrorBoundary'
import { errorRecoveryUtils } from '@utils/errorRecovery'

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  // Get the first connected wallet
  const activeWallet = wallets.find(wallet => wallet.connectorType !== 'embedded') || wallets[0]
  const address = activeWallet?.address
  
  // Validate wallet compatibility with Sei Network
  const walletType = activeWallet ? detectWalletType(
    activeWallet.connectorType,
    activeWallet.walletClientType,
    activeWallet.meta?.name
  ) : null
  
  const compatibilityError = walletType ? getCompatibilityErrorMessage(walletType, seiMainnet.id) : null
  const error = compatibilityError ? new Error(compatibilityError) : null

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setLastError(null)
    
    try {
      if (!ready) {
        logger.warn('Privy not ready, cannot connect')
        return
      }
      
      await errorRecoveryUtils.wallet.attemptReconnection(async () => {
        login()
      }, {
        maxRetries: 2,
        onRetry: (attempt, error) => {
          logger.info(`Wallet connection retry ${attempt}:`, error.message)
        }
      })
    } catch (error) {
      const walletError = error as Error
      logger.error('Failed to connect wallet:', walletError)
      setLastError(walletError)
      errorRecoveryUtils.monitor.recordError(walletError, 'WalletConnect', false)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await logout()
      setIsDropdownOpen(false)
    } catch (error) {
      const walletError = error as Error
      logger.error('Failed to disconnect wallet:', walletError)
      errorRecoveryUtils.monitor.recordError(walletError, 'WalletDisconnect', false)
    }
  }

  if (!ready || !ready) {
    return (
      <button 
        disabled
        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg cursor-not-allowed"
      >
        <Wallet className="w-5 h-5" />
        <span>{!ready ? 'Initializing...' : 'Loading...'}</span>
      </button>
    )
  }

  if (error) {
    return (
      <button 
        disabled
        className="flex items-center space-x-2 px-4 py-2 bg-red-800 text-red-400 rounded-lg cursor-not-allowed"
        title={error.message}
      >
        <Wallet className="w-5 h-5" />
        <span>Connection Error</span>
      </button>
    )
  }

  if (!authenticated || !address) {
    return (
      <button
        onClick={handleConnect}
        className="group relative flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
      >
        <Power className="w-5 h-5" />
        <span className="font-semibold">Power Up Wallet</span>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-600 transition-all border border-red-500/20"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-medium">{formatAddress(address!)}</span>
        </div>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-red-500/20 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.2)] overflow-hidden z-50">
          <div className="p-4 border-b border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Connected with</div>
            <div className="text-white font-medium">
              {activeWallet?.walletClientType || 'Unknown Wallet'}
            </div>
            {user?.email && (
              <div className="text-sm text-gray-400 mt-1">{String(user.email)}</div>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
              <div className="text-white font-mono text-sm">{address}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Network</div>
              <div className="text-white">Sei Network</div>
            </div>
            
            {compatibilityError && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-yellow-400">Compatibility Warning</div>
                    <div className="text-xs text-yellow-300 mt-1">{compatibilityError}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced version with error boundary
export function WalletConnectButtonWithErrorBoundary() {
  return (
    <DragonWalletErrorBoundary>
      <WalletConnectButton />
    </DragonWalletErrorBoundary>
  )
}