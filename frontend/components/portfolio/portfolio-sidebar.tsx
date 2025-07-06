'use client'

// Export the minimal version as default for cleaner UI
export { MinimalPortfolioSidebar as PortfolioSidebar } from './MinimalPortfolioSidebar'

// Keep the original complex version available as ComplexPortfolioSidebar
import { TrendingUp, TrendingDown, DollarSign, Coins, Activity, Zap, Search } from 'lucide-react'
import { cn } from '@lib/utils'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { getOrchestrator } from '@lib/orchestrator-client'
import { logger } from '@lib/logger'

interface Asset {
  symbol: string
  name: string
  balance: number
  value: number
  change24h: number
  powerLevel?: number
  seiProtocol?: string
}

interface SeiProtocolInfo {
  name: string
  tvl: number
  apy: number
  userPosition?: number
  riskLevel: 'low' | 'medium' | 'high'
  icon: string
}

interface RealTimeBalance {
  address: string
  balances: TokenBalance[]
  totalValueUSD: number
  lastUpdated: number
  powerLevel: number
}

interface TokenBalance {
  denom: string
  amount: string
  decimals: number
  symbol: string
  name: string
  valueUSD: number
  logoUri?: string
}

interface HiveAnalyticsData {
  insights: Array<{
    type: string
    title: string
    description: string
    confidence: number
  }>
  recommendations: Array<{
    type: string
    title: string
    priority: string
    expectedImpact: number
  }>
}

function PortfolioSidebarInternal() {
  const [realTimeBalance, setRealTimeBalance] = useState<RealTimeBalance | null>(null)
  const [hiveAnalytics, setHiveAnalytics] = useState<HiveAnalyticsData | null>(null)
  const [seiProtocols, setSeiProtocols] = useState<SeiProtocolInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Mock data - will be replaced with real-time data
  const totalValue = realTimeBalance?.totalValueUSD || 125430.50
  const totalChange = 5.23
  const powerLevel = realTimeBalance?.powerLevel || 9000
  
  const assets: Asset[] = useMemo(() => realTimeBalance ? 
    realTimeBalance.balances.map(balance => ({
      symbol: balance.symbol,
      name: balance.name,
      balance: parseFloat(balance.amount) / Math.pow(10, balance.decimals),
      value: balance.valueUSD,
      change24h: Math.random() * 10 - 5, // This would come from price feed
      powerLevel: Math.floor(balance.valueUSD * 100),
      seiProtocol: balance.symbol === 'SEI' ? 'native' : undefined
    })) : [
    { symbol: 'BTC', name: 'Bitcoin', balance: 1.25, value: 52500, change24h: 2.45, powerLevel: 5250000 },
    { symbol: 'ETH', name: 'Ethereum', balance: 15.8, value: 42000, change24h: -1.23, powerLevel: 4200000 },
    { symbol: 'SEI', name: 'Sei', balance: 50000, value: 15000, change24h: 8.92, powerLevel: 1500000, seiProtocol: 'native' },
    { symbol: 'USDC', name: 'USD Coin', balance: 15930.50, value: 15930.50, change24h: 0.01, powerLevel: 1593050 },
  ], [realTimeBalance])

  // Initialize real-time connections
  useEffect(() => {
    const orchestrator = getOrchestrator({
      apiEndpoint: import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:3001',
    })

    // Subscribe to real-time balance updates
    const unsubscribeBalance = orchestrator.on('mcp:balance_update', (event) => {
      if (event.data) {
        setRealTimeBalance(event.data as RealTimeBalance)
        setLastUpdate(new Date())
      }
    })

    // Subscribe to Hive Intelligence analytics
    const unsubscribeHive = orchestrator.on('hive:portfolio_analytics', (event) => {
      if (event.data) {
        setHiveAnalytics(event.data as HiveAnalyticsData)
      }
    })

    // Initialize Sei protocol information
    setSeiProtocols([
      { name: 'Takara Finance', tvl: 45000000, apy: 12.5, userPosition: 5000, riskLevel: 'medium', icon: '🏦' },
      { name: 'DragonSwap', tvl: 25000000, apy: 8.3, userPosition: 2500, riskLevel: 'low', icon: '🐲' },
      { name: 'Symphony', tvl: 35000000, apy: 15.2, userPosition: 7500, riskLevel: 'high', icon: '🎵' },
      { name: 'Silo Staking', tvl: 18000000, apy: 6.8, userPosition: 3200, riskLevel: 'low', icon: '🥞' },
    ])

    return () => {
      unsubscribeBalance()
      unsubscribeHive()
    }
  }, [])

  const fetchRealTimeData = useCallback(async () => {
    setIsLoading(true)
    try {
      // This would trigger MCP adapter to fetch real-time balance
      const response = await fetch('/api/mcp/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: 'sei1...' }) // Would use actual wallet address
      })
      const data = await response.json()
      if (data.success) {
        setRealTimeBalance(data.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      logger.error('Failed to fetch real-time data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const requestHiveAnalysis = useCallback(async () => {
    setIsLoading(true)
    try {
      // This would trigger Hive Intelligence adapter for portfolio analysis
      const response = await fetch('/api/hive/portfolio-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: 'sei1...',
          assets: assets.map(a => a.symbol)
        })
      })
      const data = await response.json()
      if (data.success) {
        setHiveAnalytics(data.data)
      }
    } catch (error) {
      logger.error('Failed to get Hive analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }, [assets])

  return (
    <div className="h-full bg-gradient-to-b from-sei-gray-50 to-sei-gray-100 p-3 overflow-y-auto">
      {/* Enhanced Portfolio Summary */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-dragon-red-700">Dragon's Treasure Vault</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRealTimeData}
              disabled={isLoading}
              className="p-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              title="Refresh real-time data"
            >
              <Activity className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={requestHiveAnalysis}
              disabled={isLoading}
              className="p-1 text-purple-600 hover:text-purple-700 disabled:opacity-50"
              title="Get AI analysis"
            >
              <Search className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-dragon border border-dragon-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-sei-gray-600">Total Power Level</span>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-dragon-red-400" />
              {realTimeBalance && (
                <span className="text-xs text-green-600">🟢 LIVE</span>
              )}
            </div>
          </div>
          <p className="text-xl font-bold text-dragon-red-700">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className={cn(
              'flex items-center',
              totalChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {totalChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span className="text-sm font-medium">
                {totalChange >= 0 ? '+' : ''}{totalChange}% (24h)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">
                {powerLevel.toLocaleString()} Saiyan Power
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Last updated: {typeof window !== 'undefined' ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </div>
        </div>
      </div>

      {/* Assets */}
      <div>
        <h3 className="text-sm font-semibold text-dragon-red-700 mb-2">Mystical Treasures</h3>
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.symbol} className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Coins className="h-4 w-4 text-gold-500 mr-1" />
                  <div>
                    <p className="text-sm font-medium text-dragon-red-700">{asset.symbol}</p>
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
              {/* Power Level and Protocol Info */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                {asset.powerLevel && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-400" />
                    <span className="text-xs text-orange-600 font-bold">
                      {asset.powerLevel.toLocaleString()}
                    </span>
                  </div>
                )}
                {asset.seiProtocol && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">
                      SEI Native
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sei Protocol Integrations */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-dragon-red-700 mb-2">Sei Protocol Powers</h3>
        <div className="space-y-2">
          {seiProtocols.map((protocol) => (
            <div key={protocol.name} className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{protocol.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-dragon-red-700">{protocol.name}</p>
                    <p className="text-xs text-sei-gray-500">
                      TVL: ${(protocol.tvl / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-green-600">{protocol.apy}% APY</p>
                  <div className={cn(
                    "text-xs px-1 py-0.5 rounded",
                    protocol.riskLevel === 'low' && "bg-green-100 text-green-700",
                    protocol.riskLevel === 'medium' && "bg-yellow-100 text-yellow-700",
                    protocol.riskLevel === 'high' && "bg-red-100 text-red-700"
                  )}>
                    {protocol.riskLevel.toUpperCase()}
                  </div>
                </div>
              </div>
              {protocol.userPosition && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sei-gray-500">Your Position:</span>
                  <span className="font-medium text-dragon-red-700">
                    ${protocol.userPosition.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hive Intelligence Insights */}
      {hiveAnalytics && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-dragon-red-700 mb-2 flex items-center gap-1">
            <Search className="h-3 w-3" />
            AI Battle Insights
          </h3>
          
          {/* Insights */}
          {hiveAnalytics.insights.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-medium text-gray-700 mb-1">Market Intelligence</h4>
              <div className="space-y-2">
                {hiveAnalytics.insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-700 uppercase">
                        {insight.type}
                      </span>
                      <span className="text-xs text-blue-600">
                        {insight.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 font-medium">{insight.title}</p>
                    <p className="text-xs text-blue-600 mt-1">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {hiveAnalytics.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Strategic Recommendations</h4>
              <div className="space-y-2">
                {hiveAnalytics.recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className={cn(
                    "rounded-lg p-2 border",
                    rec.priority === 'high' && "bg-red-50 border-red-200",
                    rec.priority === 'medium' && "bg-yellow-50 border-yellow-200",
                    rec.priority === 'low' && "bg-green-50 border-green-200"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-xs font-medium uppercase",
                        rec.priority === 'high' && "text-red-700",
                        rec.priority === 'medium' && "text-yellow-700",
                        rec.priority === 'low' && "text-green-700"
                      )}>
                        {rec.type} - {rec.priority}
                      </span>
                      <span className="text-xs text-gray-600">
                        +{rec.expectedImpact}% impact
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm font-medium",
                      rec.priority === 'high' && "text-red-800",
                      rec.priority === 'medium' && "text-yellow-800",
                      rec.priority === 'low' && "text-green-800"
                    )}>{rec.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dragon's Wisdom Stats */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-dragon-red-700 mb-2">Dragon's Wisdom</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Daily Manifestations</p>
            <p className="text-sm font-semibold text-dragon-red-700">$12,543</p>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Wishes Granted</p>
            <p className="text-sm font-semibold text-dragon-red-700">47</p>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Dragon's Precision</p>
            <p className="text-sm font-semibold text-dragon-red-700">
              {hiveAnalytics ? '85%' : '68%'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-dragon border border-dragon-red-100">
            <p className="text-xs text-sei-gray-500">Power Level Tier</p>
            <p className="text-sm font-semibold text-dragon-red-700">
              {powerLevel > 50000 ? 'Legendary' : powerLevel > 20000 ? 'Super Saiyan' : 'Elite Warrior'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export memoized component
export const PortfolioSidebar = React.memo(PortfolioSidebarInternal)