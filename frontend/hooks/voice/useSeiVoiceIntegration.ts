/**
 * Sei Voice Integration Hook
 * 
 * React hook that provides seamless integration between voice chat
 * and Sei blockchain services for investment-focused conversations.
 * 
 * Features:
 * - Real-time investment intent detection
 * - Context-aware response enhancement
 * - Portfolio data integration
 * - Market data contextual awareness
 * - Voice-optimized response formatting
 * - Caching for low-latency interactions
 * 
 * @fileoverview Hook for Sei-enhanced voice conversations
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { 
  getSeiVoiceIntegration, 
  type VoiceResponse, 
  type VoiceIntent, 
  type IntentRecognition,
  type MarketContext,
  type VoicePortfolioSummary,
  type VoiceDeFiOpportunity
} from '../../lib/sei-integration'
import { logger } from '../../lib/logger'

/**
 * Integration state interface
 */
export interface SeiVoiceState {
  readonly isAnalyzing: boolean
  readonly lastIntent: VoiceIntent | null
  readonly confidence: number
  readonly hasMarketData: boolean
  readonly hasPortfolioData: boolean
  readonly lastUpdate: number | null
  readonly error: string | null
}

/**
 * Enhanced voice response with Sei context
 */
export interface EnhancedVoiceResponse extends VoiceResponse {
  readonly intent: VoiceIntent
  readonly marketContext?: MarketContext
  readonly portfolioContext?: VoicePortfolioSummary
  readonly defiOpportunities?: VoiceDeFiOpportunity[]
  readonly processingTime: number
}

/**
 * Hook configuration
 */
export interface SeiVoiceConfig {
  readonly enableRealTimeMarketData?: boolean
  readonly enablePortfolioTracking?: boolean
  readonly intentCacheTimeout?: number
  readonly marketDataRefreshInterval?: number
  readonly enableAnalytics?: boolean
  readonly walletAddress?: string
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<SeiVoiceConfig> = {
  enableRealTimeMarketData: true,
  enablePortfolioTracking: true,
  intentCacheTimeout: 30000, // 30 seconds
  marketDataRefreshInterval: 60000, // 1 minute
  enableAnalytics: true,
  walletAddress: ''
}

/**
 * Sei Voice Integration Hook
 * 
 * Enhances voice conversations with Sei blockchain investment intelligence
 */
export const useSeiVoiceIntegration = (config: SeiVoiceConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const integration = getSeiVoiceIntegration()
  
  // State management
  const [state, setState] = useState<SeiVoiceState>({
    isAnalyzing: false,
    lastIntent: null,
    confidence: 0,
    hasMarketData: false,
    hasPortfolioData: false,
    lastUpdate: null,
    error: null
  })
  
  // Context data cache
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null)
  const [portfolioContext, setPortfolioContext] = useState<VoicePortfolioSummary | null>(null)
  const [defiOpportunities, setDefiOpportunities] = useState<VoiceDeFiOpportunity[]>([])
  
  // Refs for intervals and caching
  const marketDataIntervalRef = useRef<NodeJS.Timeout>()
  const lastIntentRef = useRef<IntentRecognition | null>(null)
  const analyticsRef = useRef<Array<{ timestamp: number; intent: VoiceIntent; confidence: number }>>([])
  
  /**
   * Enhanced error handling
   */
  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Sei voice integration error in ${context}:`, error)
    setState(prev => ({ ...prev, error: errorMessage, isAnalyzing: false }))
  }, [])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])
  
  /**
   * Refresh market data in background
   */
  const refreshMarketData = useCallback(async () => {
    if (!mergedConfig.enableRealTimeMarketData) return
    
    try {
      const marketResult = await integration.getMarketContext()
      
      if (marketResult._tag === 'Right') {
        setMarketContext(marketResult.right)
        setState(prev => ({ 
          ...prev, 
          hasMarketData: true, 
          lastUpdate: Date.now() 
        }))
        logger.debug('Market context updated', marketResult.right)
      } else {
        logger.warn('Failed to update market context:', marketResult.left)
      }
    } catch (error) {
      logger.error('Error refreshing market data:', error)
    }
  }, [integration, mergedConfig.enableRealTimeMarketData])
  
  /**
   * Refresh portfolio data
   */
  const refreshPortfolioData = useCallback(async (walletAddress?: string) => {
    if (!mergedConfig.enablePortfolioTracking || !walletAddress) return
    
    try {
      const portfolioResult = await integration.getPortfolioSummary(walletAddress)
      
      if (portfolioResult._tag === 'Right') {
        setPortfolioContext(portfolioResult.right)
        setState(prev => ({ 
          ...prev, 
          hasPortfolioData: true, 
          lastUpdate: Date.now() 
        }))
        logger.debug('Portfolio context updated', portfolioResult.right)
      } else {
        logger.warn('Failed to update portfolio context:', portfolioResult.left)
      }
    } catch (error) {
      logger.error('Error refreshing portfolio data:', error)
    }
  }, [integration, mergedConfig.enablePortfolioTracking])
  
  /**
   * Get DeFi opportunities
   */
  const refreshDeFiOpportunities = useCallback(async () => {
    try {
      const defiResult = await integration.getDeFiOpportunities()
      
      if (defiResult._tag === 'Right') {
        setDefiOpportunities(defiResult.right)
        logger.debug('DeFi opportunities updated', { count: defiResult.right.length })
      } else {
        logger.warn('Failed to update DeFi opportunities:', defiResult.left)
      }
    } catch (error) {
      logger.error('Error refreshing DeFi opportunities:', error)
    }
  }, [integration])
  
  /**
   * Analyze voice query with Sei investment intelligence
   */
  const analyzeVoiceQuery = useCallback(async (query: string): Promise<IntentRecognition | null> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))
    
    try {
      const intent = await integration.recognizeIntent(query)
      
      lastIntentRef.current = intent
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastIntent: intent.intent,
        confidence: intent.confidence,
        lastUpdate: Date.now()
      }))
      
      // Track analytics
      if (mergedConfig.enableAnalytics) {
        analyticsRef.current.push({
          timestamp: Date.now(),
          intent: intent.intent,
          confidence: intent.confidence
        })
        
        // Keep only last 100 entries
        if (analyticsRef.current.length > 100) {
          analyticsRef.current = analyticsRef.current.slice(-100)
        }
      }
      
      logger.info('Voice query analyzed', { 
        intent: intent.intent, 
        confidence: intent.confidence,
        requiresData: intent.requiresData
      })
      
      return intent
    } catch (error) {
      handleError(error, 'analyzeVoiceQuery')
      return null
    }
  }, [integration, mergedConfig.enableAnalytics, handleError])
  
  /**
   * Process voice query with full Sei integration
   */
  const processVoiceQuery = useCallback(async (
    query: string,
    walletAddress?: string
  ): Promise<EnhancedVoiceResponse | null> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))
    
    const startTime = Date.now()
    
    try {
      // Use provided wallet address or config default
      const address = walletAddress || mergedConfig.walletAddress || undefined
      
      // Process with full integration
      const result = await integration.processVoiceQuery(query, address)
      
      if (result._tag === 'Left') {
        handleError(new Error(result.left), 'processVoiceQuery')
        return null
      }
      
      const response = result.right
      const processingTime = Date.now() - startTime
      
      // Analyze intent for metadata
      const intent = await integration.recognizeIntent(query)
      
      // Create enhanced response
      const enhancedResponse: EnhancedVoiceResponse = {
        ...response,
        intent: intent.intent,
        marketContext: marketContext || undefined,
        portfolioContext: portfolioContext || undefined,
        defiOpportunities: defiOpportunities.length > 0 ? defiOpportunities : undefined,
        processingTime
      }
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastIntent: intent.intent,
        confidence: intent.confidence,
        lastUpdate: Date.now()
      }))
      
      logger.info('Voice query processed', {
        intent: intent.intent,
        confidence: response.confidence,
        processingTime,
        hasMarketData: !!marketContext,
        hasPortfolioData: !!portfolioContext
      })
      
      return enhancedResponse
    } catch (error) {
      handleError(error, 'processVoiceQuery')
      return null
    }
  }, [
    integration, 
    mergedConfig.walletAddress, 
    marketContext, 
    portfolioContext, 
    defiOpportunities,
    handleError
  ])
  
  /**
   * Get current analytics data
   */
  const getAnalytics = useCallback(() => {
    const analytics = analyticsRef.current
    const now = Date.now()
    const last24h = analytics.filter(a => now - a.timestamp < 24 * 60 * 60 * 1000)
    
    const intentCounts = last24h.reduce((acc, item) => {
      acc[item.intent] = (acc[item.intent] || 0) + 1
      return acc
    }, {} as Record<VoiceIntent, number>)
    
    const avgConfidence = last24h.length > 0 
      ? last24h.reduce((sum, item) => sum + item.confidence, 0) / last24h.length 
      : 0
    
    return {
      totalQueries: analytics.length,
      last24hQueries: last24h.length,
      intentCounts,
      avgConfidence,
      mostCommonIntent: Object.entries(intentCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as VoiceIntent | undefined
    }
  }, [])
  
  /**
   * Initialize market data refresh
   */
  useEffect(() => {
    if (mergedConfig.enableRealTimeMarketData) {
      // Initial load
      refreshMarketData()
      
      // Set up interval
      marketDataIntervalRef.current = setInterval(
        refreshMarketData, 
        mergedConfig.marketDataRefreshInterval
      )
    }
    
    return () => {
      if (marketDataIntervalRef.current) {
        clearInterval(marketDataIntervalRef.current)
      }
    }
  }, [mergedConfig.enableRealTimeMarketData, mergedConfig.marketDataRefreshInterval, refreshMarketData])
  
  /**
   * Initialize portfolio data when wallet address changes
   */
  useEffect(() => {
    if (mergedConfig.walletAddress) {
      refreshPortfolioData(mergedConfig.walletAddress)
    }
  }, [mergedConfig.walletAddress, refreshPortfolioData])
  
  /**
   * Initialize DeFi opportunities
   */
  useEffect(() => {
    refreshDeFiOpportunities()
  }, [refreshDeFiOpportunities])
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (marketDataIntervalRef.current) {
        clearInterval(marketDataIntervalRef.current)
      }
    }
  }, [])
  
  return {
    // State
    ...state,
    
    // Context data
    marketContext,
    portfolioContext,
    defiOpportunities,
    
    // Actions
    analyzeVoiceQuery,
    processVoiceQuery,
    refreshMarketData,
    refreshPortfolioData,
    refreshDeFiOpportunities,
    clearError,
    
    // Analytics
    getAnalytics,
    
    // Utilities
    clearCache: () => integration.clearCache(),
    getCacheStats: () => integration.getCacheStats(),
    
    // Status
    hasData: !!marketContext || !!portfolioContext || defiOpportunities.length > 0,
    isReady: !state.isAnalyzing && !state.error
  }
}

export default useSeiVoiceIntegration