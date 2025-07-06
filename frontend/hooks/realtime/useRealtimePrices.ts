import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import { 
  CryptoPrice, 
  PriceUpdate, 
  UseRealtimePricesResult, 
  RealtimePayload,
  PriceEventHandler 
} from '@/types/realtime'

export interface UseRealtimePricesOptions {
  symbols?: string[]
  enableHistory?: boolean
  historyLimit?: number
  onPriceUpdate?: PriceEventHandler
  onPriceAlert?: (symbol: string, price: CryptoPrice, threshold: number) => void
  priceAlerts?: Record<string, { above?: number; below?: number }>
}

export function useRealtimePrices(options: UseRealtimePricesOptions = {}): UseRealtimePricesResult {
  const { 
    symbols = ['BTC', 'ETH', 'SEI'],
    enableHistory = false,
    historyLimit = 100,
    onPriceUpdate,
    onPriceAlert,
    priceAlerts = {}
  } = options
  
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set(symbols))
  
  const priceHistoryRef = useRef<Record<string, PriceUpdate[]>>({})
  const lastPricesRef = useRef<Record<string, CryptoPrice>>({})
  const channelName = 'crypto_prices'
  
  // Initialize realtime connection
  const realtime = useSupabaseRealtime({
    channelName,
    onConnect: () => {
      logger.info('Prices realtime connected')
    },
    onDisconnect: () => {
      logger.warn('Prices realtime disconnected')
    },
    onError: (error) => {
      logger.error('Prices realtime error', { error })
      setError(error)
    },
  })
  
  // Load initial prices
  const loadInitialPrices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (subscribedSymbols.size === 0) {
        setLoading(false)
        return
      }
      
      const symbolsArray = Array.from(subscribedSymbols)
      logger.info('Loading initial prices', { symbols: symbolsArray })
      
      const { data, error: fetchError } = await supabase
        .from('crypto_prices')
        .select('*')
        .in('symbol', symbolsArray)
        .order('last_updated', { ascending: false })
      
      if (fetchError) {
        throw fetchError
      }
      
      const pricesMap: Record<string, CryptoPrice> = {}
      
      // Get the latest price for each symbol
      if (data) {
        const seenSymbols = new Set<string>()
        
        for (const price of data) {
          if (!seenSymbols.has(price.symbol)) {
            pricesMap[price.symbol] = price as CryptoPrice
            seenSymbols.add(price.symbol)
          }
        }
      }
      
      setPrices(pricesMap)
      lastPricesRef.current = { ...pricesMap }
      
      logger.info('Initial prices loaded', { 
        symbols: Object.keys(pricesMap),
        count: Object.keys(pricesMap).length
      })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load prices')
      logger.error('Error loading initial prices', { error })
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [subscribedSymbols])
  
  // Handle price updates
  const handlePriceUpdate = useCallback((payload: RealtimePayload<CryptoPrice>) => {
    const updatedPrice = payload.new
    const symbol = updatedPrice.symbol
    
    // Check if we're subscribed to this symbol
    if (!subscribedSymbols.has(symbol)) {
      return
    }
    
    logger.debug('Price update received', { 
      symbol, 
      price: updatedPrice.price,
      change: updatedPrice.change_24h 
    })
    
    // Update prices state
    setPrices(prev => ({
      ...prev,
      [symbol]: updatedPrice
    }))
    
    // Update price history if enabled
    if (enableHistory) {
      const priceUpdate: PriceUpdate = {
        ...updatedPrice,
        timestamp: new Date().toISOString(),
        source: 'realtime'
      }
      
      priceHistoryRef.current[symbol] = [
        ...(priceHistoryRef.current[symbol] || []),
        priceUpdate
      ].slice(-historyLimit)
    }
    
    // Check price alerts
    const alerts = priceAlerts[symbol]
    if (alerts) {
      const currentPrice = updatedPrice.price
      const lastPrice = lastPricesRef.current[symbol]?.price
      
      if (alerts.above && currentPrice > alerts.above && (!lastPrice || lastPrice <= alerts.above)) {
        onPriceAlert?.(symbol, updatedPrice, alerts.above)
        logger.info('Price alert triggered (above)', { 
          symbol, 
          price: currentPrice, 
          threshold: alerts.above 
        })
      }
      
      if (alerts.below && currentPrice < alerts.below && (!lastPrice || lastPrice >= alerts.below)) {
        onPriceAlert?.(symbol, updatedPrice, alerts.below)
        logger.info('Price alert triggered (below)', { 
          symbol, 
          price: currentPrice, 
          threshold: alerts.below 
        })
      }
    }
    
    // Update last prices reference
    lastPricesRef.current[symbol] = updatedPrice
    
    // Call event handler
    onPriceUpdate?.(payload)
  }, [subscribedSymbols, enableHistory, historyLimit, priceAlerts, onPriceAlert, onPriceUpdate])
  
  // Subscribe to symbols
  const subscribe = useCallback((newSymbols: string[]) => {
    const symbolsToAdd = newSymbols.filter(symbol => !subscribedSymbols.has(symbol))
    
    if (symbolsToAdd.length === 0) {
      logger.debug('No new symbols to subscribe to')
      return
    }
    
    logger.info('Subscribing to new symbols', { symbols: symbolsToAdd })
    
    setSubscribedSymbols(prev => {
      const newSet = new Set(prev)
      symbolsToAdd.forEach(symbol => newSet.add(symbol))
      return newSet
    })
    
    // Load initial prices for new symbols
    const loadNewPrices = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('crypto_prices')
          .select('*')
          .in('symbol', symbolsToAdd)
          .order('last_updated', { ascending: false })
        
        if (fetchError) {
          throw fetchError
        }
        
        if (data) {
          const newPrices: Record<string, CryptoPrice> = {}
          const seenSymbols = new Set<string>()
          
          for (const price of data) {
            if (!seenSymbols.has(price.symbol)) {
              newPrices[price.symbol] = price as CryptoPrice
              seenSymbols.add(price.symbol)
            }
          }
          
          setPrices(prev => ({ ...prev, ...newPrices }))
          lastPricesRef.current = { ...lastPricesRef.current, ...newPrices }
          
          logger.info('New symbol prices loaded', { 
            symbols: Object.keys(newPrices) 
          })
        }
      } catch (err) {
        logger.error('Error loading new symbol prices', { symbols: symbolsToAdd, error: err })
      }
    }
    
    loadNewPrices()
  }, [subscribedSymbols])
  
  // Unsubscribe from symbols
  const unsubscribe = useCallback((symbolsToRemove: string[]) => {
    const symbolsToRemoveSet = new Set(symbolsToRemove)
    
    logger.info('Unsubscribing from symbols', { symbols: symbolsToRemove })
    
    setSubscribedSymbols(prev => {
      const newSet = new Set<string>()
      prev.forEach(symbol => {
        if (!symbolsToRemoveSet.has(symbol)) {
          newSet.add(symbol)
        }
      })
      return newSet
    })
    
    // Remove from prices state
    setPrices(prev => {
      const newPrices = { ...prev }
      symbolsToRemove.forEach(symbol => {
        delete newPrices[symbol]
      })
      return newPrices
    })
    
    // Remove from price history
    if (enableHistory) {
      symbolsToRemove.forEach(symbol => {
        delete priceHistoryRef.current[symbol]
      })
    }
    
    // Remove from last prices reference
    symbolsToRemove.forEach(symbol => {
      delete lastPricesRef.current[symbol]
    })
  }, [enableHistory])
  
  // Get price for specific symbol
  const getPrice = useCallback((symbol: string): CryptoPrice | null => {
    return prices[symbol] || null
  }, [prices])
  
  // Get price history for symbol
  const getPriceHistory = useCallback((symbol: string): PriceUpdate[] => {
    return priceHistoryRef.current[symbol] || []
  }, [])
  
  // Setup realtime subscriptions
  useEffect(() => {
    if (!realtime.isConnected) {
      return
    }
    
    // Subscribe to price updates
    realtime.subscribe({
      table: 'crypto_prices',
      schema: 'public',
      onInsert: handlePriceUpdate,
      onUpdate: handlePriceUpdate,
    })
    
    return () => {
      realtime.unsubscribe({
        table: 'crypto_prices',
        schema: 'public',
      })
    }
  }, [realtime.isConnected, handlePriceUpdate])
  
  // Load initial prices
  useEffect(() => {
    loadInitialPrices()
  }, [loadInitialPrices])
  
  // Update subscribed symbols when symbols prop changes
  useEffect(() => {
    const newSymbolsSet = new Set(symbols)
    const currentSymbols = Array.from(subscribedSymbols)
    
    // Find symbols to add and remove
    const symbolsToAdd = symbols.filter(symbol => !subscribedSymbols.has(symbol))
    const symbolsToRemove = currentSymbols.filter(symbol => !newSymbolsSet.has(symbol))
    
    if (symbolsToAdd.length > 0) {
      subscribe(symbolsToAdd)
    }
    
    if (symbolsToRemove.length > 0) {
      unsubscribe(symbolsToRemove)
    }
  }, [symbols, subscribedSymbols, subscribe, unsubscribe])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      priceHistoryRef.current = {}
      lastPricesRef.current = {}
    }
  }, [])
  
  return {
    prices,
    loading,
    error,
    subscribe,
    unsubscribe,
    getPrice,
    // Include price history in development mode
    ...(process.env.NODE_ENV === 'development' && {
      getPriceHistory,
      subscribedSymbols: Array.from(subscribedSymbols),
    }),
  }
}