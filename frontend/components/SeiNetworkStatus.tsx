'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Zap, Users, DollarSign } from 'lucide-react'
import { cn } from '@lib/utils'
import { getOrchestrator } from '@lib/orchestrator-client'
import { logger } from '@lib/logger'

interface NetworkStatus {
  blockNumber: number
  blockHash: string
  timestamp: number
  gasPrice: string
  networkStatus: 'healthy' | 'congested' | 'offline'
  validators: ValidatorInfo[]
  totalSupply: string
  inflation: number
  tps: number // transactions per second
  avgBlockTime: number // in seconds
}

interface ValidatorInfo {
  address: string
  moniker: string
  votingPower: number
  commission: number
  status: 'active' | 'inactive' | 'jailed'
}

interface NetworkMetrics {
  dailyTransactions: number
  totalAddresses: number
  marketCap: number
  volume24h: number
}

export interface SeiNetworkStatusProps {
  showDetailed?: boolean
  refreshInterval?: number
  className?: string
}

export function SeiNetworkStatus({ 
  showDetailed = false, 
  refreshInterval = 10000,
  className 
}: SeiNetworkStatusProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [powerLevel, setPowerLevel] = useState<number>(9000)

  useEffect(() => {
    const orchestrator = getOrchestrator({
      apiEndpoint: import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:8000',
    })

    // Subscribe to real-time network status updates
    const unsubscribeStatus = orchestrator.on('mcp:network_status', (event) => {
      if (event.data) {
        setNetworkStatus(event.data as NetworkStatus)
        setIsConnected(true)
        setLastUpdate(new Date())
        
        // Calculate network power level based on various metrics
        const status = event.data as NetworkStatus
        const newPowerLevel = Math.floor(
          status.blockNumber * 0.1 + 
          status.validators.length * 100 + 
          status.tps * 500
        )
        setPowerLevel(newPowerLevel)
      }
    })

    const unsubscribeMetrics = orchestrator.on('mcp:network_metrics', (event) => {
      if (event.data) {
        setNetworkMetrics(event.data as NetworkMetrics)
      }
    })

    // Initial data fetch
    const fetchNetworkStatus = async () => {
      try {
        const response = await fetch('/api/mcp/network-status')
        const data = await response.json()
        if (data.success) {
          setNetworkStatus(data.data)
          setIsConnected(true)
          setLastUpdate(new Date())
        }
      } catch (error) {
        logger.error('Failed to fetch network status:', error)
        setIsConnected(false)
      }
    }

    fetchNetworkStatus()

    // Set up periodic refresh
    const interval = setInterval(fetchNetworkStatus, refreshInterval)

    return () => {
      unsubscribeStatus()
      unsubscribeMetrics()
      clearInterval(interval)
    }
  }, [refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-gray-900'
      case 'congested':
        return 'text-yellow-600 bg-gray-900'
      case 'offline':
        return 'text-red-600 bg-gray-900'
      default:
        return 'text-gray-600 bg-gray-900'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Activity className="h-4 w-4 text-gray-400" />
      case 'congested':
        return <Activity className="h-4 w-4 text-gray-400 animate-pulse" />
      case 'offline':
        return <Activity className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatGasPrice = (gasPrice: string) => {
    const price = parseFloat(gasPrice)
    return price < 0.001 ? '< 0.001' : price.toFixed(3)
  }

  if (!networkStatus) {
    return (
      <div className={cn("bg-gray-900 rounded-lg p-4 shadow-md border border-gray-700", className)}>
        <div className="flex items-center justify-center">
          <Activity className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Connecting to Sei Network...</span>
        </div>
      </div>
    )
  }

  if (!showDetailed) {
    // Compact view
    return (
      <div className={cn(
        "flex items-center gap-3 bg-gray-900 rounded-lg px-3 py-2 shadow-sm border border-gray-700",
        className
      )}>
        {getStatusIcon(networkStatus.networkStatus)}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            Block {formatNumber(networkStatus.blockNumber)}
          </span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium",
            getStatusColor(networkStatus.networkStatus)
          )}>
            {networkStatus.networkStatus.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Zap className="h-3 w-3 text-red-500" />
          <span>{powerLevel.toLocaleString()}</span>
        </div>
      </div>
    )
  }

  // Detailed view
  return (
    <div className={cn("bg-gray-900 rounded-lg shadow-md border border-gray-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            🌐 Sei Network Status
            {isConnected && <span className="text-xs text-gray-400">🟢 LIVE</span>}
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm px-3 py-1 rounded-full font-medium",
              getStatusColor(networkStatus.networkStatus)
            )}>
              {networkStatus.networkStatus.toUpperCase()}
            </span>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-red-500" />
              <span className="text-sm font-bold text-red-600">
                {powerLevel.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Network Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">Block Height</span>
            </div>
            <p className="text-lg font-bold text-gray-200">
              {formatNumber(networkStatus.blockNumber)}
            </p>
            <p className="text-xs text-gray-400">
              {networkStatus.avgBlockTime}s avg time
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">TPS</span>
            </div>
            <p className="text-lg font-bold text-gray-200">
              {networkStatus.tps}
            </p>
            <p className="text-xs text-gray-400">transactions/sec</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">Gas Price</span>
            </div>
            <p className="text-lg font-bold text-gray-200">
              {formatGasPrice(networkStatus.gasPrice)}
            </p>
            <p className="text-xs text-gray-400">GWEI</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">Validators</span>
            </div>
            <p className="text-lg font-bold text-gray-200">
              {networkStatus.validators.length}
            </p>
            <p className="text-xs text-gray-400">
              {networkStatus.validators.filter(v => v.status === 'active').length} active
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        {networkMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">Daily Txns</span>
              </div>
              <p className="text-lg font-bold text-gray-200">
                {formatNumber(networkMetrics.dailyTransactions)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">Addresses</span>
              </div>
              <p className="text-lg font-bold text-gray-200">
                {formatNumber(networkMetrics.totalAddresses)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">Market Cap</span>
              </div>
              <p className="text-lg font-bold text-gray-200">
                ${formatNumber(networkMetrics.marketCap)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">24h Volume</span>
              </div>
              <p className="text-lg font-bold text-gray-200">
                ${formatNumber(networkMetrics.volume24h)}
              </p>
            </div>
          </div>
        )}

        {/* Dragon Ball Z Themed Status */}
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-gray-200">Network Power Level Analysis</span>
          </div>
          <p className="text-sm text-gray-300 mb-2">
            {powerLevel > 100000 
              ? "🔥 INCREDIBLE! The Sei Network's power level has reached legendary status!" 
              : powerLevel > 50000 
              ? "💪 The network is showing Super Saiyan-level performance!" 
              : "⚡ The network is gathering energy and building strength!"}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Network Status: {networkStatus.networkStatus === 'healthy' ? 'Battle Ready' : 'Training Mode'}
            </span>
            <span className="text-red-600 font-bold">
              Power Level: {powerLevel.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top Validators */}
        {networkStatus.validators.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Top Validators</h4>
            <div className="space-y-2">
              {networkStatus.validators
                .filter(v => v.status === 'active')
                .sort((a, b) => b.votingPower - a.votingPower)
                .slice(0, 3)
                .map((validator, index) => (
                  <div key={validator.address} className="flex items-center justify-between bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-300">
                        #{index + 1} {validator.moniker}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {validator.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-200">
                        {formatNumber(validator.votingPower)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {validator.commission}% commission
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}