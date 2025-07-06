import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/forms/Button'
import { CryptoPrice } from '@/types/realtime'

export interface RealtimePriceDisplayProps {
  prices: Record<string, CryptoPrice>
  symbols: string[]
  onSubscriptionChange: (symbols: string[], subscribe: boolean) => void
  className?: string
}

export function RealtimePriceDisplay({
  prices,
  symbols,
  onSubscriptionChange,
  className = '',
}: RealtimePriceDisplayProps) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({})
  
  // Track price changes for animations
  useEffect(() => {
    Object.entries(prices).forEach(([symbol, price]) => {
      if (previousPrices[symbol] !== price.price) {
        setPreviousPrices(prev => ({ ...prev, [symbol]: price.price }))
      }
    })
  }, [prices, previousPrices])
  
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    }
    return `$${price.toFixed(price < 1 ? 6 : 2)}`
  }
  
  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : ''
    return `${prefix}${change.toFixed(2)}%`
  }
  
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }
  
  const getPriceAnimation = (symbol: string, currentPrice: number) => {
    const previousPrice = previousPrices[symbol]
    if (!previousPrice || previousPrice === currentPrice) return ''
    
    if (currentPrice > previousPrice) {
      return 'animate-pulse bg-green-100 dark:bg-green-900/20'
    } else {
      return 'animate-pulse bg-red-100 dark:bg-red-900/20'
    }
  }
  
  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
    return `$${marketCap.toLocaleString()}`
  }
  
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`
    return `$${volume.toLocaleString()}`
  }
  
  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
    return date.toLocaleTimeString()
  }
  
  const handleSymbolToggle = (symbol: string) => {
    const isSubscribed = symbols.includes(symbol)
    onSubscriptionChange([symbol], !isSubscribed)
  }
  
  const availableSymbols = ['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'SOL', 'ADA', 'DOT']
  const displaySymbols = symbols.length > 0 ? symbols : availableSymbols.slice(0, 3)
  
  return (
    <div className={`realtime-price-display bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 ${className}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-4 overflow-x-auto">
          <span className="text-sm font-medium text-green-700 dark:text-green-300 whitespace-nowrap">
            📈 Crypto Prices:
          </span>
          
          <div className="flex items-center space-x-3">
            {displaySymbols.map((symbol) => {
              const price = prices[symbol]
              return (
                <div
                  key={symbol}
                  className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all duration-300 ${
                    price ? getPriceAnimation(symbol, price.price) : ''
                  } ${expandedSymbol === symbol ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
                >
                  <button
                    onClick={() => setExpandedSymbol(expandedSymbol === symbol ? null : symbol)}
                    className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
                  >
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {symbol}
                    </span>
                    {price ? (
                      <>
                        <span className="text-xs font-medium">
                          {formatPrice(price.price)}
                        </span>
                        <span className={`text-xs ${getChangeColor(price.change_percentage_24h)}`}>
                          {formatChange(price.change_percentage_24h)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Loading...</span>
                    )}
                  </button>
                  
                  <Button
                    onClick={() => handleSymbolToggle(symbol)}
                    size="sm"
                    variant="ghost"
                    className="text-xs px-1 py-0 h-auto opacity-60 hover:opacity-100"
                    title={symbols.includes(symbol) ? 'Unsubscribe' : 'Subscribe'}
                  >
                    {symbols.includes(symbol) ? '✓' : '+'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            variant="ghost"
            className="text-xs px-2 py-1 h-auto"
            title="Toggle price details"
          >
            📊
          </Button>
          
          <Button
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            variant="ghost"
            className="text-xs px-2 py-1 h-auto"
          >
            {showDetails ? '▲' : '▼'}
          </Button>
        </div>
      </div>
      
      {/* Expanded Symbol Details */}
      {expandedSymbol && prices[expandedSymbol] && (
        <div className="px-3 pb-2 border-t border-green-200 dark:border-green-800">
          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {expandedSymbol} Details
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Market Cap:</span>
                <span className="ml-2 font-medium">
                  {formatMarketCap(prices[expandedSymbol].market_cap)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">24h Volume:</span>
                <span className="ml-2 font-medium">
                  {formatVolume(prices[expandedSymbol].volume_24h)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">24h Change:</span>
                <span className={`ml-2 font-medium ${getChangeColor(prices[expandedSymbol].change_percentage_24h)}`}>
                  {formatChange(prices[expandedSymbol].change_percentage_24h)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <span className="ml-2 font-medium">
                  {formatLastUpdated(prices[expandedSymbol].last_updated)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Details Panel */}
      {showDetails && (
        <div className="px-3 pb-3 border-t border-green-200 dark:border-green-800">
          <div className="mt-2">
            <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
              Available Cryptocurrencies
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {availableSymbols.map((symbol) => (
                <Button
                  key={symbol}
                  onClick={() => handleSymbolToggle(symbol)}
                  size="sm"
                  variant={symbols.includes(symbol) ? 'primary' : 'secondary'}
                  className="text-xs px-2 py-1 h-auto"
                >
                  {symbol} {symbols.includes(symbol) && '✓'}
                </Button>
              ))}
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Subscribed to {symbols.length} symbol{symbols.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-500">
                Updates every ~5 seconds
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}