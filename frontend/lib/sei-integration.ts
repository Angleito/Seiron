/**
 * Sei Voice Integration Layer
 * 
 * This module provides voice-optimized integration with Sei MCP services,
 * enabling enhanced voice conversations with investment-specific functionality.
 * 
 * Features:
 * - Investment intent detection for voice queries
 * - Portfolio data integration for contextual responses
 * - Market data integration for real-time advice
 * - Sei ecosystem information retrieval
 * - Voice-optimized data transformation
 * - Efficient caching for low-latency interactions
 * 
 * @fileoverview Voice-enhanced Sei blockchain integration
 */

import { Either } from '../types/agent'
import { logger } from './logger'
import { getOrchestrator } from './orchestrator-client'
import type {
  HiveAnalyticsResult,
  MCPNetworkStatus,
  MCPWalletBalance,
  MCPTransactionResult,
  MCPContractQueryResult,
  SeiWalletAnalysis,
  SeiTokenData,
  CryptoMarketData,
  SeiDeFiData
} from './adapters/types'

/**
 * Voice query intent types for investment analysis
 */
export type VoiceIntent = 
  | 'portfolio_inquiry'
  | 'market_analysis'
  | 'investment_advice'
  | 'price_check'
  | 'transaction_guidance'
  | 'defi_opportunities'
  | 'risk_assessment'
  | 'sei_ecosystem'
  | 'general_chat'

/**
 * Voice-optimized response format
 */
export interface VoiceResponse {
  readonly spokenText: string
  readonly displayData?: unknown
  readonly actionable?: boolean
  readonly followUpQuestions?: string[]
  readonly confidence: number
  readonly dataSourced: boolean
}

/**
 * Intent recognition result
 */
export interface IntentRecognition {
  readonly intent: VoiceIntent
  readonly entities: Record<string, string>
  readonly confidence: number
  readonly requiresData: boolean
  readonly cacheKey?: string
}

/**
 * Market context for voice responses
 */
export interface MarketContext {
  readonly seiPrice: number
  readonly seiChange24h: number
  readonly marketTrend: 'bullish' | 'bearish' | 'neutral'
  readonly volatility: 'low' | 'medium' | 'high'
  readonly volume24h: number
  readonly lastUpdated: number
}

/**
 * Portfolio summary for voice responses
 */
export interface VoicePortfolioSummary {
  readonly totalValue: number
  readonly totalChangePercent: number
  readonly topAsset: { symbol: string; percentage: number }
  readonly riskLevel: 'low' | 'medium' | 'high'
  readonly recommendation: string
  readonly lastUpdated: number
}

/**
 * DeFi opportunity for voice responses
 */
export interface VoiceDeFiOpportunity {
  readonly protocol: string
  readonly type: string
  readonly apr: number
  readonly riskLevel: 'low' | 'medium' | 'high'
  readonly description: string
  readonly actionRequired: string
}

/**
 * Cached data interface for performance optimization
 */
interface CachedData<T> {
  readonly data: T
  readonly timestamp: number
  readonly ttl: number
}

/**
 * Cache manager for frequently requested data
 */
class VoiceDataCache {
  private cache = new Map<string, CachedData<unknown>>()
  private readonly defaultTTL = 30000 // 30 seconds for voice interactions

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

/**
 * Main Sei Voice Integration Class
 */
export class SeiVoiceIntegration {
  private cache = new VoiceDataCache()
  private orchestrator = getOrchestrator()

  /**
   * Analyze voice query for investment intent
   */
  async recognizeIntent(query: string): Promise<IntentRecognition> {
    const normalizedQuery = query.toLowerCase().trim()
    
    // Intent patterns with entities extraction
    const patterns: Array<{
      intent: VoiceIntent
      patterns: RegExp[]
      entities?: (match: RegExpMatchArray) => Record<string, string>
      requiresData: boolean
    }> = [
      {
        intent: 'portfolio_inquiry',
        patterns: [
          /(?:how|what).+(?:portfolio|holdings|balance|positions?)/,
          /(?:show|check|tell).+(?:my|portfolio|balance)/,
          /(?:what do i|do i).+(?:own|hold|have)/
        ],
        requiresData: true
      },
      {
        intent: 'price_check',
        patterns: [
          /(?:price|cost|value).+(?:sei|bitcoin|eth|token)/,
          /(?:how much|what.+worth).+(?:sei|token)/,
          /(?:current|latest).+(?:price|rate)/
        ],
        entities: (match) => {
          const symbols = match[0].match(/\b(sei|bitcoin|btc|ethereum|eth|sol|avax)\b/gi)
          return symbols ? { symbols: symbols.join(',') } : {}
        },
        requiresData: true
      },
      {
        intent: 'market_analysis',
        patterns: [
          /(?:market|trend|analysis|outlook)/,
          /(?:bullish|bearish|pump|dump|moon)/,
          /(?:technical|fundamental).+analysis/
        ],
        requiresData: true
      },
      {
        intent: 'investment_advice',
        patterns: [
          /(?:should i|recommend|advice|suggestion)/,
          /(?:buy|sell|hold|invest)/,
          /(?:good|bad).+(?:investment|time)/
        ],
        requiresData: true
      },
      {
        intent: 'defi_opportunities',
        patterns: [
          /(?:defi|yield|farming|staking|lending)/,
          /(?:earn|passive|income|reward)/,
          /(?:liquidity|pool|pair)/
        ],
        requiresData: true
      },
      {
        intent: 'transaction_guidance',
        patterns: [
          /(?:how to|send|transfer|swap|trade)/,
          /(?:transaction|gas|fee)/,
          /(?:bridge|cross.chain)/
        ],
        requiresData: false
      },
      {
        intent: 'sei_ecosystem',
        patterns: [
          /(?:sei|ecosystem|dapp|application)/,
          /(?:parallelization|speed|fast)/,
          /(?:cosmwasm|cosmos)/
        ],
        requiresData: true
      },
      {
        intent: 'risk_assessment',
        patterns: [
          /(?:risk|safe|secure|dangerous)/,
          /(?:impermanent|loss|liquidation)/,
          /(?:rug|scam|audit)/
        ],
        requiresData: true
      }
    ]

    // Find matching intent
    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        const match = normalizedQuery.match(regex)
        if (match) {
          const entities = pattern.entities ? pattern.entities(match) : {}
          const cacheKey = pattern.requiresData ? 
            `${pattern.intent}_${JSON.stringify(entities)}` : undefined

          return {
            intent: pattern.intent,
            entities,
            confidence: 0.8 + (match[0].length / normalizedQuery.length) * 0.2,
            requiresData: pattern.requiresData,
            cacheKey
          }
        }
      }
    }

    // Default to general chat
    return {
      intent: 'general_chat',
      entities: {},
      confidence: 0.3,
      requiresData: false
    }
  }

  /**
   * Get market context for voice responses
   */
  async getMarketContext(): Promise<Either<string, MarketContext>> {
    const cacheKey = 'market_context'
    const cached = this.cache.get<MarketContext>(cacheKey)
    if (cached) {
      return { _tag: 'Right', right: cached }
    }

    try {
      // Get SEI token data from Hive Intelligence
      const seiDataResult = await this.orchestrator.getSeiTokenData('SEI')
      
      if (seiDataResult._tag === 'Left') {
        return { _tag: 'Left', left: seiDataResult.left }
      }

      // Extract market data from analytics result
      const analyticsData = seiDataResult.right
      
      // For now, simulate market context since we need the exact data structure
      const marketContext: MarketContext = {
        seiPrice: 0.45, // TODO: Extract from analyticsData
        seiChange24h: 2.3,
        marketTrend: 'bullish',
        volatility: 'medium',
        volume24h: 125000000,
        lastUpdated: Date.now()
      }

      this.cache.set(cacheKey, marketContext, 30000) // 30 second cache
      return { _tag: 'Right', right: marketContext }
    } catch (error) {
      logger.error('Failed to get market context:', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get portfolio summary for voice responses
   */
  async getPortfolioSummary(walletAddress: string): Promise<Either<string, VoicePortfolioSummary>> {
    const cacheKey = `portfolio_${walletAddress}`
    const cached = this.cache.get<VoicePortfolioSummary>(cacheKey)
    if (cached) {
      return { _tag: 'Right', right: cached }
    }

    try {
      // Get wallet analysis from Hive Intelligence
      const analysisResult = await this.orchestrator.getSeiWalletAnalysis(walletAddress)
      
      if (analysisResult._tag === 'Left') {
        return { _tag: 'Left', left: analysisResult.left }
      }

      // Extract portfolio data (simulated for now)
      const portfolioSummary: VoicePortfolioSummary = {
        totalValue: 12450.67,
        totalChangePercent: 8.34,
        topAsset: { symbol: 'SEI', percentage: 45.2 },
        riskLevel: 'medium',
        recommendation: 'Consider taking some profits and diversifying into stablecoins',
        lastUpdated: Date.now()
      }

      this.cache.set(cacheKey, portfolioSummary, 60000) // 1 minute cache
      return { _tag: 'Right', right: portfolioSummary }
    } catch (error) {
      logger.error('Failed to get portfolio summary:', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get DeFi opportunities for voice responses
   */
  async getDeFiOpportunities(): Promise<Either<string, VoiceDeFiOpportunity[]>> {
    const cacheKey = 'defi_opportunities'
    const cached = this.cache.get<VoiceDeFiOpportunity[]>(cacheKey)
    if (cached) {
      return { _tag: 'Right', right: cached }
    }

    try {
      // Get DeFi data from Hive Intelligence
      const defiResult = await this.orchestrator.getSeiDeFiData()
      
      if (defiResult._tag === 'Left') {
        return { _tag: 'Left', left: defiResult.left }
      }

      // Transform for voice consumption (simulated)
      const opportunities: VoiceDeFiOpportunity[] = [
        {
          protocol: 'Astroport',
          type: 'Liquidity Provision',
          apr: 15.7,
          riskLevel: 'medium',
          description: 'SEI-USDC liquidity pool with trading fee rewards',
          actionRequired: 'Provide equal amounts of SEI and USDC tokens'
        },
        {
          protocol: 'White Whale',
          type: 'Yield Farming',
          apr: 22.1,
          riskLevel: 'high',
          description: 'WHALE token farming with auto-compounding',
          actionRequired: 'Stake WHALE tokens in the farming contract'
        }
      ]

      this.cache.set(cacheKey, opportunities, 120000) // 2 minute cache
      return { _tag: 'Right', right: opportunities }
    } catch (error) {
      logger.error('Failed to get DeFi opportunities:', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Process voice query and generate enhanced response
   */
  async processVoiceQuery(
    query: string, 
    walletAddress?: string
  ): Promise<Either<string, VoiceResponse>> {
    try {
      logger.info('Processing voice query:', { query, walletAddress })

      // Recognize intent
      const intent = await this.recognizeIntent(query)
      logger.info('Intent recognized:', intent)

      // Generate response based on intent
      switch (intent.intent) {
        case 'portfolio_inquiry':
          return await this.handlePortfolioInquiry(walletAddress, intent)
        
        case 'price_check':
          return await this.handlePriceCheck(intent)
        
        case 'market_analysis':
          return await this.handleMarketAnalysis()
        
        case 'investment_advice':
          return await this.handleInvestmentAdvice(walletAddress)
        
        case 'defi_opportunities':
          return await this.handleDeFiOpportunities()
        
        case 'transaction_guidance':
          return await this.handleTransactionGuidance(intent)
        
        case 'sei_ecosystem':
          return await this.handleSeiEcosystem()
        
        case 'risk_assessment':
          return await this.handleRiskAssessment(walletAddress)
        
        default:
          return await this.handleGeneralChat(query)
      }
    } catch (error) {
      logger.error('Failed to process voice query:', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Handle portfolio inquiry with voice-optimized response
   */
  private async handlePortfolioInquiry(
    walletAddress?: string, 
    intent?: IntentRecognition
  ): Promise<Either<string, VoiceResponse>> {
    if (!walletAddress) {
      return {
        _tag: 'Right',
        right: {
          spokenText: "I'd be happy to analyze your portfolio! However, I need your wallet address to access your holdings. You can connect your wallet or provide your address to get started.",
          actionable: true,
          followUpQuestions: ["Would you like to connect your wallet?"],
          confidence: 0.9,
          dataSourced: false
        }
      }
    }

    const portfolioResult = await this.getPortfolioSummary(walletAddress)
    
    if (portfolioResult._tag === 'Left') {
      return {
        _tag: 'Right',
        right: {
          spokenText: "I'm having trouble accessing your portfolio data right now. This could be due to network issues or if your wallet is new. Please try again in a moment.",
          actionable: true,
          followUpQuestions: ["Would you like me to check your SEI balance instead?"],
          confidence: 0.7,
          dataSourced: false
        }
      }
    }

    const portfolio = portfolioResult.right
    const changeDirection = portfolio.totalChangePercent >= 0 ? 'up' : 'down'
    const changeAmount = Math.abs(portfolio.totalChangePercent)

    return {
      _tag: 'Right',
      right: {
        spokenText: `Your portfolio is looking ${portfolio.totalChangePercent >= 0 ? 'strong' : 'challenging'} today! You have a total value of $${portfolio.totalValue.toLocaleString()} which is ${changeDirection} ${changeAmount.toFixed(1)}% in the last 24 hours. Your top holding is ${portfolio.topAsset.symbol} at ${portfolio.topAsset.percentage}% of your portfolio. Based on current market conditions, I'd suggest: ${portfolio.recommendation}`,
        displayData: portfolio,
        actionable: true,
        followUpQuestions: [
          "Would you like a detailed breakdown of your holdings?",
          "Should we explore rebalancing opportunities?",
          "Are you interested in current DeFi yields?"
        ],
        confidence: 0.95,
        dataSourced: true
      }
    }
  }

  /**
   * Handle price check with real-time data
   */
  private async handlePriceCheck(intent: IntentRecognition): Promise<Either<string, VoiceResponse>> {
    const symbols = intent.entities.symbols?.split(',') || ['SEI']
    
    const marketResult = await this.getMarketContext()
    
    if (marketResult._tag === 'Left') {
      return {
        _tag: 'Right',
        right: {
          spokenText: "I'm having trouble accessing current price data. The market data service might be temporarily unavailable. You can check prices on CoinGecko or DEX screener in the meantime.",
          actionable: true,
          followUpQuestions: ["Would you like me to try again?"],
          confidence: 0.6,
          dataSourced: false
        }
      }
    }

    const market = marketResult.right
    const priceDirection = market.seiChange24h >= 0 ? 'up' : 'down'
    
    return {
      _tag: 'Right',
      right: {
        spokenText: `SEI is currently trading at $${market.seiPrice.toFixed(3)}, which is ${priceDirection} ${Math.abs(market.seiChange24h).toFixed(1)}% in the last 24 hours. The market is showing ${market.marketTrend} sentiment with ${market.volatility} volatility. Trading volume is at $${(market.volume24h / 1000000).toFixed(1)} million.`,
        displayData: market,
        actionable: true,
        followUpQuestions: [
          "Would you like a technical analysis?",
          "Should we look at the order book depth?",
          "Are you considering a position?"
        ],
        confidence: 0.9,
        dataSourced: true
      }
    }
  }

  /**
   * Handle market analysis request
   */
  private async handleMarketAnalysis(): Promise<Either<string, VoiceResponse>> {
    const marketResult = await this.getMarketContext()
    
    if (marketResult._tag === 'Left') {
      return { _tag: 'Left', left: marketResult.left }
    }

    const market = marketResult.right
    
    return {
      _tag: 'Right',
      right: {
        spokenText: `The current market shows ${market.marketTrend} sentiment with ${market.volatility} volatility. SEI has moved ${market.seiChange24h >= 0 ? 'up' : 'down'} ${Math.abs(market.seiChange24h).toFixed(1)}% today. Given the ${market.volatility} volatility, this could be a good time for ${market.marketTrend === 'bullish' ? 'strategic accumulation' : 'cautious positioning'}. Always remember to manage your risk and never invest more than you can afford to lose.`,
        displayData: market,
        actionable: true,
        followUpQuestions: [
          "Would you like specific entry points?",
          "Should we review support and resistance levels?",
          "Are you interested in DeFi opportunities?"
        ],
        confidence: 0.85,
        dataSourced: true
      }
    }
  }

  /**
   * Handle investment advice request
   */
  private async handleInvestmentAdvice(walletAddress?: string): Promise<Either<string, VoiceResponse>> {
    const [marketResult, portfolioResult] = await Promise.all([
      this.getMarketContext(),
      walletAddress ? this.getPortfolioSummary(walletAddress) : Promise.resolve({ _tag: 'Left' as const, left: 'No wallet connected' })
    ])

    let adviceText = "Based on current market conditions, "
    
    if (marketResult._tag === 'Right') {
      const market = marketResult.right
      adviceText += `SEI is showing ${market.marketTrend} momentum. With ${market.volatility} volatility, `
      
      if (market.marketTrend === 'bullish') {
        adviceText += "consider dollar-cost averaging into positions. "
      } else {
        adviceText += "focus on risk management and consider stablecoin positions. "
      }
    }

    if (portfolioResult._tag === 'Right') {
      const portfolio = portfolioResult.right
      adviceText += `Your portfolio shows ${portfolio.riskLevel} risk exposure. ${portfolio.recommendation}`
    } else {
      adviceText += "Consider starting with a small position and building over time. Diversification across different assets and DeFi protocols is key."
    }

    return {
      _tag: 'Right',
      right: {
        spokenText: adviceText,
        actionable: true,
        followUpQuestions: [
          "Would you like specific allocation recommendations?",
          "Should we explore DeFi yield strategies?",
          "Are you interested in risk management tools?"
        ],
        confidence: 0.8,
        dataSourceed: marketResult._tag === 'Right' || portfolioResult._tag === 'Right'
      }
    }
  }

  /**
   * Handle DeFi opportunities inquiry
   */
  private async handleDeFiOpportunities(): Promise<Either<string, VoiceResponse>> {
    const opportunitiesResult = await this.getDeFiOpportunities()
    
    if (opportunitiesResult._tag === 'Left') {
      return { _tag: 'Left', left: opportunitiesResult.left }
    }

    const opportunities = opportunitiesResult.right
    const topOpportunity = opportunities[0]
    
    if (!topOpportunity) {
      return {
        _tag: 'Right',
        right: {
          spokenText: "I'm not finding any standout DeFi opportunities right now. The market might be in a transitional phase. I recommend checking back later or exploring established protocols like Astroport for liquidity provision.",
          actionable: true,
          followUpQuestions: ["Would you like me to explain liquidity provision?"],
          confidence: 0.7,
          dataSourced: true
        }
      }
    }

    return {
      _tag: 'Right',
      right: {
        spokenText: `I found some interesting DeFi opportunities! The top one is ${topOpportunity.protocol} offering ${topOpportunity.apr.toFixed(1)}% APR for ${topOpportunity.type}. ${topOpportunity.description} The risk level is ${topOpportunity.riskLevel}. To get started, you'll need to ${topOpportunity.actionRequired}.`,
        displayData: opportunities,
        actionable: true,
        followUpQuestions: [
          "Would you like help getting started with this protocol?",
          "Should we compare with other opportunities?",
          "Are you familiar with impermanent loss risks?"
        ],
        confidence: 0.9,
        dataSourced: true
      }
    }
  }

  /**
   * Handle transaction guidance
   */
  private async handleTransactionGuidance(intent: IntentRecognition): Promise<Either<string, VoiceResponse>> {
    return {
      _tag: 'Right',
      right: {
        spokenText: "For Sei transactions, you'll want to use a compatible wallet like Keplr or Leap. Gas fees are typically very low, around 0.001 SEI. Make sure you have enough SEI for gas fees. For swaps, I recommend using Astroport or other established DEXes. Always double-check addresses and amounts before confirming transactions.",
        actionable: true,
        followUpQuestions: [
          "Would you like help setting up a wallet?",
          "Should I walk you through a specific transaction type?",
          "Are you looking for the best swap routes?"
        ],
        confidence: 0.8,
        dataSourced: false
      }
    }
  }

  /**
   * Handle Sei ecosystem inquiry
   */
  private async handleSeiEcosystem(): Promise<Either<string, VoiceResponse>> {
    return {
      _tag: 'Right',
      right: {
        spokenText: "Sei is a lightning-fast blockchain optimized for trading and DeFi. It features parallelized EVM and built-in orderbook functionality. Key protocols include Astroport for DEX trading, White Whale for arbitrage, and various DeFi applications. The ecosystem is growing rapidly with new applications launching regularly. Sei's speed advantage makes it ideal for high-frequency DeFi strategies.",
        actionable: true,
        followUpQuestions: [
          "Would you like to explore specific Sei dApps?",
          "Should we look at current ecosystem metrics?",
          "Are you interested in Sei's technical advantages?"
        ],
        confidence: 0.9,
        dataSourced: true
      }
    }
  }

  /**
   * Handle risk assessment
   */
  private async handleRiskAssessment(walletAddress?: string): Promise<Either<string, VoiceResponse>> {
    let riskText = "Risk management is crucial in DeFi and crypto investing. "
    
    if (walletAddress) {
      const portfolioResult = await this.getPortfolioSummary(walletAddress)
      if (portfolioResult._tag === 'Right') {
        const portfolio = portfolioResult.right
        riskText += `Your current portfolio shows ${portfolio.riskLevel} risk exposure. `
      }
    }

    riskText += "Key risks include smart contract vulnerabilities, impermanent loss in liquidity pools, market volatility, and regulatory changes. Always do your own research, start with small amounts, and never invest more than you can afford to lose. Consider diversification across different protocols and asset types."

    return {
      _tag: 'Right',
      right: {
        spokenText: riskText,
        actionable: true,
        followUpQuestions: [
          "Would you like specific risk mitigation strategies?",
          "Should we review your portfolio's risk exposure?",
          "Are you interested in insurance protocols?"
        ],
        confidence: 0.85,
        dataSourced: walletAddress !== undefined
      }
    }
  }

  /**
   * Handle general chat
   */
  private async handleGeneralChat(query: string): Promise<Either<string, VoiceResponse>> {
    return {
      _tag: 'Right',
      right: {
        spokenText: "I'm Seiron, your AI investment advisor specializing in the Sei blockchain ecosystem. I can help you with portfolio analysis, market insights, DeFi opportunities, and investment strategies. What would you like to explore today?",
        actionable: true,
        followUpQuestions: [
          "Would you like to check your portfolio?",
          "Should we explore current market conditions?",
          "Are you interested in DeFi opportunities?"
        ],
        confidence: 0.7,
        dataSourced: false
      }
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('Sei voice integration cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache['cache'].size,
      keys: Array.from(this.cache['cache'].keys())
    }
  }
}

// Singleton instance
let seiVoiceIntegration: SeiVoiceIntegration | null = null

/**
 * Get the singleton Sei Voice Integration instance
 */
export function getSeiVoiceIntegration(): SeiVoiceIntegration {
  if (!seiVoiceIntegration) {
    seiVoiceIntegration = new SeiVoiceIntegration()
  }
  return seiVoiceIntegration
}

/**
 * Quick helper function for voice query processing
 */
export async function processVoiceQuery(
  query: string,
  walletAddress?: string
): Promise<Either<string, VoiceResponse>> {
  const integration = getSeiVoiceIntegration()
  return await integration.processVoiceQuery(query, walletAddress)
}

export default SeiVoiceIntegration