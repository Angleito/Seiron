'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Wallet, Power, LogOut } from 'lucide-react'
import { useState } from 'react'
import { logger } from '@/lib/logger'

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Get the first connected wallet
  const activeWallet = wallets.find(wallet => wallet.connectorType !== 'embedded') || wallets[0]
  const address = activeWallet?.address

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = async () => {
    try {
      await login()
    } catch (error) {
      logger.error('Failed to connect wallet:', error)
    }
  }

  const handleDisconnect = async () => {
    try {
      await logout()
      setIsDropdownOpen(false)
    } catch (error) {
      logger.error('Failed to disconnect wallet:', error)
    }
  }

  if (!ready) {
    return (
      <button 
        disabled
        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg cursor-not-allowed"
      >
        <Wallet className="w-5 h-5" />
        <span>Loading...</span>
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
              <div className="text-sm text-gray-400 mt-1">{user.email}</div>
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