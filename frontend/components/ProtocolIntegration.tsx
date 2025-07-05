'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  Zap, 
  Target,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrchestrator } from '@/lib/orchestrator-client'
import { logger } from '@/lib/logger'

interface ProtocolInfo {
  id: string
  name: string
  type: 'lending' | 'dex' | 'staking' | 'yield' | 'derivatives'
  icon: string
  tvl: number
  apy: number
  userPosition?: number
  userRewards?: number
  riskLevel: 'low' | 'medium' | 'high'
  status: 'active' | 'paused' | 'maintenance'
  description: string
  features: string[]
  contractAddress?: string
  website?: string
}

interface ProtocolAction {
  id: string
  protocolId: string
  name: string
  description: string
  type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'stake' | 'unstake' | 'claim' | 'swap'
  enabled: boolean
  requiresApproval?: boolean
  minAmount?: number
  maxAmount?: number
  gasEstimate?: number
  dragonBallTheme?: string
}

interface ProtocolMetrics {
  totalValueLocked: number
  totalUsers: number
  dailyVolume: number
  protocolRevenue: number
  topProtocols: ProtocolInfo[]
}

export interface ProtocolIntegrationProps {
  walletAddress?: string
  showMetrics?: boolean
  showActions?: boolean
  selectedProtocols?: string[]
  className?: string
}

const DEFAULT_PROTOCOLS: ProtocolInfo[] = [
  {
    id: 'takara',
    name: 'Takara Finance',
    type: 'lending',
    icon: '🏦',
    tvl: 45000000,
    apy: 12.5,
    userPosition: 5000,
    userRewards: 250,
    riskLevel: 'medium',
    status: 'active',
    description: 'Advanced lending and borrowing protocol on Sei',
    features: ['Variable APY', 'Flash Loans', 'Collateral Management'],
    contractAddress: '0x1234...abcd',
    website: 'https://takara.finance'
  },
  {
    id: 'dragonswap',
    name: 'DragonSwap',
    type: 'dex',
    icon: '🐲',
    tvl: 25000000,
    apy: 8.3,
    userPosition: 2500,
    userRewards: 125,
    riskLevel: 'low',
    status: 'active',
    description: 'The premier DEX for the Sei ecosystem',
    features: ['AMM', 'Liquidity Mining', 'Concentrated Liquidity'],
    contractAddress: '0x5678...efgh',
    website: 'https://dragonswap.app'
  },
  {
    id: 'symphony',
    name: 'Symphony',
    type: 'derivatives',
    icon: '🎵',
    tvl: 35000000,
    apy: 15.2,
    userPosition: 7500,
    userRewards: 450,
    riskLevel: 'high',
    status: 'active',
    description: 'Advanced derivatives and perpetual trading',
    features: ['Perpetuals', 'Options', 'Yield Strategies'],
    contractAddress: '0x9abc...ijkl',
    website: 'https://symphony.exchange'
  },
  {
    id: 'silo',
    name: 'Silo Staking',
    type: 'staking',
    icon: '🥞',
    tvl: 18000000,
    apy: 6.8,
    userPosition: 3200,
    userRewards: 180,
    riskLevel: 'low',
    status: 'active',
    description: 'Secure staking for SEI validators',
    features: ['Validator Staking', 'Auto Compound', 'Slashing Protection'],
    contractAddress: '0xdef0...mnop',
    website: 'https://silo.sei'
  }
]

export function ProtocolIntegration({
  walletAddress,
  showMetrics = true,
  showActions = true,
  selectedProtocols = [],
  className
}: ProtocolIntegrationProps) {
  const [protocols, setProtocols] = useState<ProtocolInfo[]>(DEFAULT_PROTOCOLS)
  const [protocolMetrics, setProtocolMetrics] = useState<ProtocolMetrics | null>(null)
  const [availableActions, setAvailableActions] = useState<ProtocolAction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)

  useEffect(() => {
    const orchestrator = getOrchestrator({
      apiEndpoint: import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:3001',
    })

    // Subscribe to protocol updates
    const unsubscribeProtocols = orchestrator.on('sak:protocol_update', (event) => {
      if (event.data) {
        const updatedProtocol = event.data as ProtocolInfo
        setProtocols(prev => prev.map(p => 
          p.id === updatedProtocol.id ? { ...p, ...updatedProtocol } : p
        ))
        setLastUpdate(new Date())
      }
    })

    const unsubscribeMetrics = orchestrator.on('sak:protocol_metrics', (event) => {
      if (event.data) {
        setProtocolMetrics(event.data as ProtocolMetrics)
      }
    })

    // Initialize available actions
    const actions: ProtocolAction[] = [
      {
        id: 'takara_supply',
        protocolId: 'takara',
        name: 'Supply Assets',
        description: 'Channel your ki energy into the lending pool',
        type: 'supply',
        enabled: true,
        requiresApproval: true,
        minAmount: 1,
        gasEstimate: 150000,
        dragonBallTheme: 'Lending your power to the Takara vault increases the overall energy!'
      },
      {
        id: 'takara_borrow',
        protocolId: 'takara',
        name: 'Borrow Assets',
        description: 'Draw power from the lending reserves',
        type: 'borrow',
        enabled: true,
        gasEstimate: 200000,
        dragonBallTheme: 'Borrowing mystical energy requires maintaining your power balance!'
      },
      {
        id: 'dragonswap_swap',
        protocolId: 'dragonswap',
        name: 'Dragon Swap',
        description: 'Transform your tokens with dragon magic',
        type: 'swap',
        enabled: true,
        gasEstimate: 120000,
        dragonBallTheme: 'The Dragon of Swaps grants your token transformation wish!'
      },
      {
        id: 'symphony_trade',
        protocolId: 'symphony',
        name: 'Open Position',
        description: 'Enter the symphony of advanced trading',
        type: 'supply',
        enabled: true,
        gasEstimate: 180000,
        dragonBallTheme: 'Your trading symphony resonates across the markets!'
      },
      {
        id: 'silo_stake',
        protocolId: 'silo',
        name: 'Stake SEI',
        description: 'Commit your SEI to validator power',
        type: 'stake',
        enabled: true,
        gasEstimate: 100000,
        dragonBallTheme: 'Staking your SEI multiplies your network contribution power!'
      }
    ]
    setAvailableActions(actions)

    return () => {
      unsubscribeProtocols()
      unsubscribeMetrics()
    }
  }, [])

  const fetchProtocolData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sak/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      const data = await response.json()
      if (data.success) {
        setProtocols(data.data.protocols || DEFAULT_PROTOCOLS)
        setProtocolMetrics(data.data.metrics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      logger.error('Failed to fetch protocol data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeProtocolAction = async (action: ProtocolAction, params: Record<string, any> = {}) => {
    if (!walletAddress) {
      alert('Please connect your wallet first!')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/sak/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.id,
          params: {
            ...params,
            walletAddress
          }
        })
      })
      const data = await response.json()
      if (data.success) {
        // Show success notification
        alert(`Success! ${action.dragonBallTheme || 'Action completed successfully!'}`)
        // Refresh protocol data
        await fetchProtocolData()
      } else {
        alert(`Failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      logger.error('Failed to execute action:', error)
      alert('Transaction failed. The mystical energies are unstable.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lending': return <DollarSign className="h-4 w-4" />
      case 'dex': return <RefreshCw className="h-4 w-4" />
      case 'staking': return <Shield className="h-4 w-4" />
      case 'yield': return <TrendingUp className="h-4 w-4" />
      case 'derivatives': return <Target className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`
    }
    return `$${num.toFixed(2)}`
  }

  const filteredProtocols = selectedProtocols.length > 0 
    ? protocols.filter(p => selectedProtocols.includes(p.id))
    : protocols

  return (
    <div className={cn("bg-white rounded-lg shadow-md border border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            ⚡ Sei Protocol Integration
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              Dragon Powered
            </span>
          </h3>
          <button
            onClick={fetchProtocolData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Protocol Metrics */}
      {showMetrics && protocolMetrics && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ecosystem Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Total TVL</span>
              </div>
              <p className="text-lg font-bold text-blue-800">
                {formatNumber(protocolMetrics.totalValueLocked)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">Users</span>
              </div>
              <p className="text-lg font-bold text-green-800">
                {protocolMetrics.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Daily Volume</span>
              </div>
              <p className="text-lg font-bold text-purple-800">
                {formatNumber(protocolMetrics.dailyVolume)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Revenue</span>
              </div>
              <p className="text-lg font-bold text-orange-800">
                {formatNumber(protocolMetrics.protocolRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Protocol List */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Available Protocols</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProtocols.map((protocol) => (
            <motion.div
              key={protocol.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedProtocol(
                selectedProtocol === protocol.id ? null : protocol.id
              )}
            >
              {/* Protocol Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{protocol.icon}</span>
                  <div>
                    <h5 className="font-medium text-gray-800">{protocol.name}</h5>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(protocol.type)}
                      <span className="text-xs text-gray-600 capitalize">{protocol.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{protocol.apy}% APY</p>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded font-medium",
                    getRiskColor(protocol.riskLevel)
                  )}>
                    {protocol.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Protocol Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500">TVL</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatNumber(protocol.tvl)}
                  </p>
                </div>
                {protocol.userPosition && (
                  <div>
                    <p className="text-xs text-gray-500">Your Position</p>
                    <p className="text-sm font-medium text-gray-800">
                      {formatNumber(protocol.userPosition)}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-3">{protocol.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mb-3">
                {protocol.features.map((feature, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Status and Links */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    protocol.status === 'active' ? 'bg-green-500' :
                    protocol.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                  <span className="text-xs text-gray-600 capitalize">{protocol.status}</span>
                </div>
                {protocol.website && (
                  <a
                    href={protocol.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Expanded Actions */}
              {selectedProtocol === protocol.id && showActions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-gray-200 mt-3 pt-3"
                >
                  <h6 className="text-xs font-medium text-gray-700 mb-2">Available Actions</h6>
                  <div className="space-y-2">
                    {availableActions
                      .filter(action => action.protocolId === protocol.id)
                      .map((action) => (
                        <button
                          key={action.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            executeProtocolAction(action)
                          }}
                          disabled={!action.enabled || isLoading}
                          className={cn(
                            "w-full text-left p-2 rounded border text-xs transition-colors",
                            action.enabled
                              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              : "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{action.name}</p>
                              <p className="opacity-75">{action.description}</p>
                              {action.dragonBallTheme && (
                                <p className="text-orange-600 italic mt-1">
                                  🐲 {action.dragonBallTheme}
                                </p>
                              )}
                            </div>
                            {action.gasEstimate && (
                              <span className="text-xs text-gray-500">
                                ~{action.gasEstimate.toLocaleString()} gas
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dragon Ball Z Footer */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-600">🐉</span>
          <span className="text-sm font-medium text-red-700">Dragon Protocol Mastery</span>
        </div>
        <p className="text-xs text-red-600">
          {walletAddress 
            ? `Your connection to the Sei protocols channels incredible power! ${filteredProtocols.length} dragons await your command!`
            : "Connect your wallet to unleash the full power of the Sei protocol dragons!"}
        </p>
      </div>
    </div>
  )
}