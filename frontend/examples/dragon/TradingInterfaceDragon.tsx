/**
 * Trading Interface Dragon Example
 * 
 * Demonstrates integration of the SVG dragon system with a DeFi trading interface,
 * showing how the dragon responds to trading events and portfolio performance.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { EnhancedDragonCharacter } from '@/components/dragon'
import type { DragonState, DragonMood } from '@/components/dragon/types'

interface Trade {
  id: string
  type: 'buy' | 'sell'
  asset: string
  amount: number
  price: number
  timestamp: Date
  success: boolean
}

interface Portfolio {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  positions: Array<{
    symbol: string
    amount: number
    value: number
    change: number
  }>
}

export function TradingInterfaceDragon() {
  // Trading state
  const [portfolio, setPortfolio] = useState<Portfolio>({
    totalValue: 10000,
    dailyChange: 0,
    dailyChangePercent: 0,
    positions: [
      { symbol: 'SEI', amount: 1000, value: 5000, change: 2.5 },
      { symbol: 'USDC', amount: 3000, value: 3000, change: 0 },
      { symbol: 'ATOM', amount: 200, value: 2000, change: -1.2 }
    ]
  })
  
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [isTrading, setIsTrading] = useState(false)
  const [tradingVolume, setTradingVolume] = useState(0)
  
  // Dragon state based on trading performance
  const [dragonState, setDragonState] = useState<DragonState>('idle')
  const [dragonMood, setDragonMood] = useState<DragonMood>('neutral')
  const [powerLevel, setPowerLevel] = useState(1000)

  // Calculate dragon state based on portfolio performance
  const calculateDragonMetrics = useCallback(() => {
    const { dailyChangePercent, totalValue } = portfolio
    
    // Determine state based on recent activity and performance
    let newState: DragonState = 'idle'
    let newMood: DragonMood = 'neutral'
    let newPowerLevel = 1000
    
    // State logic
    if (isTrading) {
      newState = 'active'
    } else if (dailyChangePercent > 10) {
      newState = 'powering-up'
    } else if (dailyChangePercent > 5) {
      newState = 'ready'
    } else if (dailyChangePercent < -10) {
      newState = 'sleeping'
    } else if (Math.abs(dailyChangePercent) < 1) {
      newState = 'arms-crossed'
    } else {
      newState = 'attention'
    }
    
    // Mood logic
    if (dailyChangePercent > 15) {
      newMood = 'excited'
    } else if (dailyChangePercent > 5) {
      newMood = 'happy'
    } else if (dailyChangePercent > 2) {
      newMood = 'confident'
    } else if (dailyChangePercent < -10) {
      newMood = 'aggressive'
    } else if (dailyChangePercent < -5) {
      newMood = 'focused'
    } else {
      newMood = 'neutral'
    }
    
    // Power level based on portfolio value and volume
    const basePower = Math.min(9000, Math.max(1000, totalValue / 10))
    const volumeBonus = Math.min(2000, tradingVolume * 10)
    const performanceBonus = Math.max(0, dailyChangePercent * 100)
    
    newPowerLevel = Math.floor(basePower + volumeBonus + performanceBonus)
    
    return { newState, newMood, newPowerLevel }
  }, [portfolio, isTrading, tradingVolume])

  // Update dragon when trading metrics change
  useEffect(() => {
    const { newState, newMood, newPowerLevel } = calculateDragonMetrics()
    
    setDragonState(newState)
    setDragonMood(newMood)
    setPowerLevel(newPowerLevel)
  }, [calculateDragonMetrics])

  // Simulate trading activity
  const executeTrade = useCallback((type: 'buy' | 'sell', asset: string, amount: number) => {
    setIsTrading(true)
    
    // Simulate trade execution
    setTimeout(() => {
      const success = Math.random() > 0.1 // 90% success rate
      const price = Math.random() * 100 + 50 // Random price
      
      const newTrade: Trade = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        asset,
        amount,
        price,
        timestamp: new Date(),
        success
      }
      
      setRecentTrades(prev => [newTrade, ...prev.slice(0, 4)])
      setTradingVolume(prev => prev + amount)
      
      if (success) {
        // Update portfolio based on trade
        setPortfolio(prev => {
          const priceChange = (Math.random() - 0.5) * 10 // Random change
          const newTotalValue = prev.totalValue + (type === 'buy' ? amount : -amount)
          const newDailyChange = prev.dailyChange + priceChange
          
          return {
            ...prev,
            totalValue: newTotalValue,
            dailyChange: newDailyChange,
            dailyChangePercent: (newDailyChange / prev.totalValue) * 100
          }
        })
      }
      
      setIsTrading(false)
    }, 1000 + Math.random() * 2000) // 1-3 second delay
  }, [])

  // Dragon interaction handlers
  const handleDragonInteraction = useCallback((type: string) => {
    if (type === 'click') {
      // Dragon click triggers a lucky boost
      setPortfolio(prev => ({
        ...prev,
        dailyChange: prev.dailyChange + 50,
        dailyChangePercent: prev.dailyChangePercent + 0.5
      }))
    } else if (type === 'double-click') {
      // Double click triggers mega boost
      setPortfolio(prev => ({
        ...prev,
        dailyChange: prev.dailyChange + 200,
        dailyChangePercent: prev.dailyChangePercent + 2
      }))
    }
  }, [])

  // Get performance color
  const getPerformanceColor = (change: number) => {
    if (change > 5) return 'text-green-400'
    if (change > 0) return 'text-green-300'
    if (change > -5) return 'text-red-300'
    return 'text-red-400'
  }

  // Get dragon quality based on performance
  const dragonQuality = useMemo(() => {
    if (portfolio.totalValue > 50000) return 'enhanced'
    if (portfolio.totalValue > 20000) return 'standard'
    return 'minimal'
  }, [portfolio.totalValue])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            DeFi Trading Dragon
          </h1>
          <p className="text-gray-300 text-lg">
            Your dragon companion responds to trading performance and portfolio changes
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Dragon Display */}
          <div className="xl:col-span-2">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-green-500/20">
              <div className="flex items-center justify-center min-h-[400px]">
                <EnhancedDragonCharacter
                  size="xl"
                  renderMode="svg"
                  svgQuality={dragonQuality}
                  enableSVGAnimations={true}
                  interactive={true}
                  showDragonBalls={portfolio.totalValue > 10000}
                  initialState={dragonState}
                  initialMood={dragonMood}
                  animationConfig={{
                    performanceMode: 'quality',
                    autoQualityAdjustment: true,
                    enableParticles: portfolio.dailyChangePercent > 5,
                    enableAura: portfolio.dailyChangePercent > 10,
                    particleCount: Math.max(5, Math.floor(portfolio.dailyChangePercent * 2))
                  }}
                  dragonBallConfig={{
                    count: Math.min(7, Math.max(3, Math.floor(portfolio.totalValue / 5000))),
                    orbitPattern: portfolio.dailyChangePercent > 10 ? 'chaotic' : 'elliptical',
                    orbitSpeed: Math.max(0.5, portfolio.dailyChangePercent / 10),
                    interactionEnabled: true
                  }}
                  onInteraction={handleDragonInteraction}
                />
              </div>
              
              {/* Dragon Status */}
              <div className="mt-6 text-center">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">State</div>
                    <div className="text-blue-400 font-semibold">{dragonState}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">Mood</div>
                    <div className="text-purple-400 font-semibold">{dragonMood}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">Power</div>
                    <div className={`font-semibold ${powerLevel > 9000 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {powerLevel > 9000 ? 'Over 9000!' : powerLevel}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm">
                  {isTrading && '🔄 '}
                  {dragonState === 'powering-up' && '⚡ Dragon is celebrating your gains!'}
                  {dragonState === 'sleeping' && '😴 Dragon is hibernating due to losses...'}
                  {dragonState === 'arms-crossed' && '😎 Dragon is confidently waiting for action.'}
                  {dragonState === 'active' && '🚀 Dragon is actively trading with you!'}
                  {dragonState === 'ready' && '✨ Dragon is ready for profitable trades!'}
                  {dragonState === 'attention' && '👁️ Dragon is watching the market closely.'}
                  {dragonState === 'idle' && '🧘 Dragon is in zen mode.'}
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Overview */}
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Portfolio</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Value</span>
                  <span className="text-white font-semibold text-lg">
                    ${portfolio.totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Daily Change</span>
                  <div className="text-right">
                    <div className={`font-semibold ${getPerformanceColor(portfolio.dailyChangePercent)}`}>
                      {portfolio.dailyChangePercent > 0 ? '+' : ''}{portfolio.dailyChangePercent.toFixed(2)}%
                    </div>
                    <div className={`text-sm ${getPerformanceColor(portfolio.dailyChange)}`}>
                      {portfolio.dailyChange > 0 ? '+' : ''}${portfolio.dailyChange.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trading Volume</span>
                  <span className="text-blue-400 font-semibold">
                    ${tradingVolume.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Positions</h3>
              <div className="space-y-3">
                {portfolio.positions.map((position, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                    <div>
                      <div className="text-white font-semibold">{position.symbol}</div>
                      <div className="text-gray-400 text-sm">{position.amount.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">${position.value.toLocaleString()}</div>
                      <div className={`text-sm ${getPerformanceColor(position.change)}`}>
                        {position.change > 0 ? '+' : ''}{position.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Actions */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Trade</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => executeTrade('buy', 'SEI', 100)}
                  disabled={isTrading}
                  className="p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  {isTrading ? '...' : 'Buy SEI'}
                </button>
                <button
                  onClick={() => executeTrade('sell', 'SEI', 100)}
                  disabled={isTrading}
                  className="p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  {isTrading ? '...' : 'Sell SEI'}
                </button>
                <button
                  onClick={() => executeTrade('buy', 'ATOM', 50)}
                  disabled={isTrading}
                  className="p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  {isTrading ? '...' : 'Buy ATOM'}
                </button>
                <button
                  onClick={() => executeTrade('sell', 'ATOM', 50)}
                  disabled={isTrading}
                  className="p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  {isTrading ? '...' : 'Sell ATOM'}
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-2">
                  Click the dragon for lucky boost! Double-click for mega boost!
                </p>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`p-3 rounded-lg border ${
                      trade.success
                        ? 'bg-green-900/20 border-green-500/30'
                        : 'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-semibold ${
                          trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.type.toUpperCase()} {trade.asset}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {trade.amount} @ ${trade.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${trade.success ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.success ? '✓ Success' : '✗ Failed'}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {trade.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentTrades.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    No trades yet. Start trading to see your dragon react!
                  </div>
                )}
              </div>
            </div>

            {/* Dragon Interaction Guide */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Dragon Behavior</h3>
              <div className="space-y-2 text-sm text-blue-300">
                <div><strong>Gains > 10%:</strong> Powering up with intense energy</div>
                <div><strong>Gains 5-10%:</strong> Ready and excited</div>
                <div><strong>Trading:</strong> Active and engaged</div>
                <div><strong>Sideways:</strong> Arms crossed, waiting</div>
                <div><strong>Losses > 10%:</strong> Sleeping until recovery</div>
                <div><strong>High volume:</strong> More dragon balls and effects</div>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Trading Tips</h3>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• Successful trades make your dragon happier</li>
                <li>• Higher portfolio value = higher power level</li>
                <li>• Click dragon during trades for luck boosts</li>
                <li>• Dragon balls appear with portfolio growth</li>
                <li>• Watch dragon mood for market sentiment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradingInterfaceDragon