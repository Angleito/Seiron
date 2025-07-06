'use client'

import { useState } from 'react'
import { Wallet, Power, ChevronDown, Copy, LogOut } from 'lucide-react'
import { cn } from '@lib/utils'

export function MinimalWalletConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Mock wallet address
  const walletAddress = '0x1234...5678'
  const fullAddress = '0x1234567890abcdef1234567890abcdef12345678'

  const handleConnect = () => {
    // Simulate wallet connection
    setIsConnected(true)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setShowDropdown(false)
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress)
    // Could add a toast notification here
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 
                 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium 
                 text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Power className="w-4 h-4" />
        <span>Power Up Wallet</span>
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 
                 rounded-lg transition-colors duration-200 text-sm"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <Wallet className="w-4 h-4 text-gray-400" />
        <span className="text-gray-300 font-medium">{walletAddress}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform duration-200",
          showDropdown && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl 
                        border border-gray-700 overflow-hidden z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
              <p className="text-sm text-gray-300 font-mono">{fullAddress.slice(0, 20)}...</p>
            </div>
            
            <div className="p-1">
              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 
                         hover:bg-gray-700 rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 
                         hover:bg-gray-700 rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}