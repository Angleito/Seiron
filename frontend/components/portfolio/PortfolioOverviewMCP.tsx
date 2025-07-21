'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, PieChart, DollarSign, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMCPClient, PortfolioManagerConfig, SeiBlockchainConfig } from '@/lib/mcp'
import { logger } from '@/lib/logger'

interface PortfolioAsset {
  symbol: string
  name: string
  balance: number
  value: number
  price: number
  change24h: number
  allocation: number
}

interface PortfolioMetrics {
  totalValue: number
  totalChange24h: number
  totalChangePercent: number
  bestPerformer: PortfolioAsset | null
  worstPerformer: PortfolioAsset | null
}

interface RiskMetrics {
  portfolioVolatility: number
  sharpeRatio: number
  maxDrawdown: number
  riskScore: number // 1-100
  diversificationScore: number // 1-100
}

export interface PortfolioOverviewMCPProps {
  walletAddress: string
  showRiskMetrics?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

/**
 * Portfolio Overview component using MCP (Model Context Protocol)
 * Fetches portfolio data from both Portfolio Manager and SEI Blockchain MCP servers
 */
export function PortfolioOverviewMCP({
  walletAddress,
  showRiskMetrics = true,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  className
}: PortfolioOverviewMCPProps) {
  const [assets, setAssets] = useState<PortfolioAsset[]>([])
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Initialize MCP clients
  const portfolioClient = useMCPClient(PortfolioManagerConfig)
  const seiClient = useMCPClient(SeiBlockchainConfig)

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    if (!portfolioClient.connected || !seiClient.connected) {
      setError('MCP servers not connected')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch wallet balance from SEI blockchain
      const balanceResult = await seiClient.callTool('getWalletBalance', {
        address: walletAddress,
        includeStaking: true,
        includeDeFi: true
      })

      // Fetch portfolio composition analysis
      const compositionResult = await portfolioClient.callTool('analyzePortfolioComposition', {
        walletAddress,
        includeDeFi: true,
        includeNFTs: false
      })

      // Fetch risk metrics if enabled
      let riskData = null
      if (showRiskMetrics) {
        const riskResult = await portfolioClient.callTool('calculateRiskMetrics', {
          walletAddress,
          timeframe: '30d',
          includeStressTest: true
        })
        riskData = riskResult.content
      }

      // Process and combine data
      if (balanceResult.content && compositionResult.content) {
        const walletData = balanceResult.content
        const compositionData = compositionResult.content

        // Transform data to portfolio assets
        const portfolioAssets: PortfolioAsset[] = []
        let totalValue = 0

        // Process native SEI balance
        if (walletData.nativeBalance) {
          const seiAsset: PortfolioAsset = {
            symbol: 'SEI',
            name: 'Sei',
            balance: parseFloat(walletData.nativeBalance.amount) / 1e6,
            price: walletData.nativeBalance.price || 0.5,
            value: (parseFloat(walletData.nativeBalance.amount) / 1e6) * (walletData.nativeBalance.price || 0.5),
            change24h: walletData.nativeBalance.change24h || 0,
            allocation: 0 // Will calculate after
          }
          portfolioAssets.push(seiAsset)
          totalValue += seiAsset.value
        }

        // Process token balances
        walletData.tokenBalances?.forEach((token: any) => {
          const asset: PortfolioAsset = {
            symbol: token.symbol,
            name: token.name,
            balance: parseFloat(token.balance) / Math.pow(10, token.decimals),
            price: token.price || 0,
            value: (parseFloat(token.balance) / Math.pow(10, token.decimals)) * (token.price || 0),
            change24h: token.change24h || 0,
            allocation: 0
          }
          portfolioAssets.push(asset)
          totalValue += asset.value
        })

        // Process DeFi positions
        walletData.defiPositions?.forEach((position: any) => {
          const asset: PortfolioAsset = {
            symbol: position.protocol,
            name: `${position.protocol} Position`,
            balance: 1,
            price: position.valueUSD || 0,
            value: position.valueUSD || 0,
            change24h: position.apy || 0,
            allocation: 0
          }
          portfolioAssets.push(asset)
          totalValue += asset.value
        })

        // Calculate allocations
        portfolioAssets.forEach(asset => {
          asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0
        })

        // Sort by value
        portfolioAssets.sort((a, b) => b.value - a.value)

        // Calculate metrics
        const totalChange24h = portfolioAssets.reduce((sum, asset) => 
          sum + (asset.value * asset.change24h / 100), 0
        )
        const totalChangePercent = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0

        const bestPerformer = portfolioAssets.reduce((best, asset) => 
          !best || asset.change24h > best.change24h ? asset : best, null as PortfolioAsset | null
        )
        
        const worstPerformer = portfolioAssets.reduce((worst, asset) => 
          !worst || asset.change24h < worst.change24h ? asset : worst, null as PortfolioAsset | null
        )

        setAssets(portfolioAssets)
        setMetrics({
          totalValue,
          totalChange24h,
          totalChangePercent,
          bestPerformer,
          worstPerformer
        })

        // Set risk metrics if available
        if (riskData) {
          setRiskMetrics({
            portfolioVolatility: riskData.volatility || 0,
            sharpeRatio: riskData.sharpeRatio || 0,
            maxDrawdown: riskData.maxDrawdown || 0,
            riskScore: riskData.riskScore || 50,
            diversificationScore: compositionData.diversificationScore || 50
          })
        }

        setLastUpdate(new Date())
      }
    } catch (error) {
      logger.error('Failed to fetch portfolio data via MCP:', error)
      setError(error.message || 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up auto-refresh
  useEffect(() => {
    if (portfolioClient.connected && seiClient.connected && walletAddress) {
      fetchPortfolioData()

      if (autoRefresh) {
        const interval = setInterval(fetchPortfolioData, refreshInterval)
        return () => clearInterval(interval)
      }
    }
  }, [portfolioClient.connected, seiClient.connected, walletAddress, autoRefresh])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const formatted = value.toFixed(2)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-md border border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Portfolio Overview (MCP)
            {portfolioClient.connected && seiClient.connected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Live
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                Offline
              </span>
            )}
          </h3>
          {metrics && (
            <div className="text-right">
              <p className="text-xl font-bold">{formatCurrency(metrics.totalValue)}</p>
              <p className={cn(
                "text-sm",
                metrics.totalChangePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatPercent(metrics.totalChangePercent)} ({formatCurrency(Math.abs(metrics.totalChange24h))})
              </p>
            </div>
          )}
        </div>
        {lastUpdate && (
          <p className="text-xs text-gray-500 mt-1">
            Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {!portfolioClient.connected || !seiClient.connected ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Connecting to MCP servers...</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading portfolio data...</p>
          </div>
        ) : assets.length > 0 ? (
          <div className="space-y-4">
            {/* Performance Summary */}
            {metrics && (metrics.bestPerformer || metrics.worstPerformer) && (
              <div className="grid grid-cols-2 gap-3">
                {metrics.bestPerformer && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Best Performer
                    </div>
                    <p className="font-semibold">{metrics.bestPerformer.symbol}</p>
                    <p className="text-sm text-green-600">{formatPercent(metrics.bestPerformer.change24h)}</p>
                  </div>
                )}
                {metrics.worstPerformer && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                      <TrendingDown className="h-4 w-4" />
                      Worst Performer
                    </div>
                    <p className="font-semibold">{metrics.worstPerformer.symbol}</p>
                    <p className="text-sm text-red-600">{formatPercent(metrics.worstPerformer.change24h)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Risk Metrics */}
            {showRiskMetrics && riskMetrics && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Risk Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Risk Score:</span>
                    <span className={cn("ml-2 font-medium", getRiskColor(riskMetrics.riskScore))}>
                      {riskMetrics.riskScore}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Diversification:</span>
                    <span className={cn("ml-2 font-medium", getRiskColor(riskMetrics.diversificationScore))}>
                      {riskMetrics.diversificationScore}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Volatility:</span>
                    <span className="ml-2 font-medium">{riskMetrics.portfolioVolatility.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Sharpe Ratio:</span>
                    <span className="ml-2 font-medium">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Max Drawdown:</span>
                    <span className="ml-2 font-medium text-red-600">-{riskMetrics.maxDrawdown.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Asset List */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Holdings</h4>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div key={asset.symbol} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-xs text-gray-500">{asset.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(asset.value)}</p>
                        <p className={cn(
                          "text-xs",
                          asset.change24h >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatPercent(asset.change24h)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{asset.balance.toFixed(4)} @ {formatCurrency(asset.price)}</span>
                      <span>{asset.allocation.toFixed(1)}% of portfolio</span>
                    </div>
                    {/* Allocation bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${asset.allocation}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dragon Ball Z Power Level */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-600">🐲</span>
                  <span className="text-sm font-medium text-orange-700">Portfolio Power Level</span>
                </div>
                <span className="text-lg font-bold text-orange-800">
                  {Math.floor(metrics?.totalValue || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {metrics && metrics.totalValue > 10000 
                  ? "Your portfolio power is incredible! Over 10,000!" 
                  : "Keep accumulating to increase your power level!"}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No portfolio data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Make sure your wallet address is correct
            </p>
          </div>
        )}
      </div>
    </div>
  )
}