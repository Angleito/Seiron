'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Coins, Shield, Activity, ChevronRight } from 'lucide-react'
import { cn } from '@lib/utils'

interface Token {
  symbol: string
  name: string
  balance: number
  value: number
  change24h: number
  icon?: string
}

export function MinimalPortfolioSidebar() {
  const [activeSection, setActiveSection] = useState<'portfolio' | 'powers'>('portfolio')
  
  // Mock data
  const totalValue = 125430.50
  const change24h = 5.23
  const saiyanPower = 9000
  
  const tokens: Token[] = [
    { symbol: 'BTC', name: 'Bitcoin', balance: 1.25, value: 52500, change24h: 2.45, icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', balance: 15.8, value: 42000, change24h: -1.23, icon: 'Ξ' },
    { symbol: 'SEI', name: 'Sei', balance: 50000, value: 15000, change24h: 8.92, icon: '🌊' },
    { symbol: 'USDC', name: 'USD Coin', balance: 15930.50, value: 15930.50, change24h: 0.01, icon: '$' },
  ]

  const dragonPowers = [
    { name: 'Lending Power', value: '85%', icon: <Coins className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500' },
    { name: 'Liquidity Shield', value: '92%', icon: <Shield className="w-4 h-4" />, color: 'from-purple-500 to-pink-500' },
    { name: 'Trading Mastery', value: '78%', icon: <Activity className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
  ]

  return (
    <div className="h-full flex flex-col text-gray-300">
      {/* Portfolio Summary */}
      <div className="p-6 border-b border-gray-800">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Total Power Level</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-100">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              change24h >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change24h)}%
            </span>
          </div>
        </div>

        {/* Saiyan Power Level */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg border border-red-800/30">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-medium">Saiyan Power</span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            {saiyanPower.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveSection('portfolio')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeSection === 'portfolio'
              ? "text-red-400 border-b-2 border-red-400 bg-gray-800/30"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Treasures
        </button>
        <button
          onClick={() => setActiveSection('powers')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeSection === 'powers'
              ? "text-red-400 border-b-2 border-red-400 bg-gray-800/30"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Dragon Powers
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'portfolio' ? (
          <div className="p-4 space-y-2">
            {tokens.map((token) => (
              <div
                key={token.symbol}
                className="p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{token.icon}</span>
                    <div>
                      <p className="font-medium text-gray-200">{token.symbol}</p>
                      <p className="text-xs text-gray-500">{token.name}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {token.balance.toLocaleString()} {token.symbol}
                  </span>
                  <div className="text-right">
                    <p className="text-gray-200">${token.value.toLocaleString()}</p>
                    <p className={cn(
                      "text-xs",
                      token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {dragonPowers.map((power) => (
              <div key={power.name} className="p-4 rounded-lg bg-gray-800/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-r", power.color)}>
                      {power.icon}
                    </div>
                    <span className="font-medium text-gray-200">{power.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-300">{power.value}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full bg-gradient-to-r", power.color)}
                    style={{ width: power.value }}
                  />
                </div>
              </div>
            ))}

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <button className="w-full p-3 text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors">
                Lend Treasures
              </button>
              <button className="w-full p-3 text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors">
                Provide Liquidity
              </button>
              <button className="w-full p-3 text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors">
                Swap Tokens
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}