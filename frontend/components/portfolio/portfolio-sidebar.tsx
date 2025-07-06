'use client'

import { TrendingUp, TrendingDown, DollarSign, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Asset {
  symbol: string
  name: string
  balance: number
  value: number
  change24h: number
}

export function PortfolioSidebar() {
  // Mock data - replace with actual data from your backend
  const totalValue = 125430.50
  const totalChange = 5.23
  const assets: Asset[] = [
    { symbol: 'BTC', name: 'Bitcoin', balance: 1.25, value: 52500, change24h: 2.45 },
    { symbol: 'ETH', name: 'Ethereum', balance: 15.8, value: 42000, change24h: -1.23 },
    { symbol: 'SEI', name: 'Sei', balance: 50000, value: 15000, change24h: 8.92 },
    { symbol: 'USDC', name: 'USD Coin', balance: 15930.50, value: 15930.50, change24h: 0.01 },
  ]

  return (
    <div className="h-full bg-gradient-to-b from-sei-gray-50 to-sei-gray-100 p-6 overflow-y-auto">
      {/* Portfolio Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-dragon-red-700 mb-4">Dragon&apos;s Treasure Vault</h2>
        <div className="bg-white rounded-lg p-4 shadow-dragon border border-dragon-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-sei-gray-600">Total Power Level</span>
            <DollarSign className="h-4 w-4 text-dragon-red-400" />
          </div>
          <p className="text-2xl font-bold text-dragon-red-700">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={cn(
            'flex items-center mt-2',
            totalChange >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {totalChange >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm font-medium">
              {totalChange >= 0 ? '+' : ''}{totalChange}% (24h)
            </span>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div>
        <h3 className="text-lg font-semibold text-dragon-red-700 mb-4">Mystical Treasures</h3>
        <div className="space-y-3">
          {assets.map((asset) => (
            <div key={asset.symbol} className="bg-white rounded-lg p-4 shadow-dragon border border-dragon-red-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Coins className="h-5 w-5 text-gold-500 mr-2" />
                  <div>
                    <p className="font-medium text-dragon-red-700">{asset.symbol}</p>
                    <p className="text-xs text-sei-gray-500">{asset.name}</p>
                  </div>
                </div>
                <div className={cn(
                  'text-xs font-medium',
                  asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-sei-gray-500">Balance</p>
                  <p className="text-sm font-medium text-dragon-red-700">
                    {asset.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-sei-gray-500">Value</p>
                  <p className="text-sm font-medium text-dragon-red-700">
                    ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-dragon-red-700 mb-4">Dragon&apos;s Wisdom</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Daily Manifestations</p>
            <p className="text-sm font-semibold text-dragon-red-700">$12,543</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Wishes Granted</p>
            <p className="text-sm font-semibold text-dragon-red-700">47</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Dragon&apos;s Precision</p>
            <p className="text-sm font-semibold text-dragon-red-700">68%</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Dragon Bond</p>
            <p className="text-sm font-semibold text-dragon-red-700">30d</p>
          </div>
        </div>
      </div>
    </div>
  )
}