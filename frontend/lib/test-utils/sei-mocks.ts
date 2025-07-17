/**
 * Comprehensive Sei Blockchain Mocking Utilities
 * 
 * Provides realistic mock data for Sei blockchain services including:
 * - Hive Intelligence adapter responses
 * - Sei Agent Kit adapter responses  
 * - Portfolio data with realistic values
 * - Market data with time-series patterns
 * - DeFi opportunity data
 * 
 * @fileoverview Mock utilities for Sei blockchain testing
 */

import type {
  VoicePortfolioSummary,
  VoiceDeFiOpportunity,
  MarketContext
} from '../sei-integration'

/**
 * Market conditions for realistic data generation
 */
export type MarketCondition = 'bull' | 'bear' | 'sideways' | 'volatile'

/**
 * Portfolio risk levels
 */
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive' | 'speculative'

/**
 * Mock blockchain data manager
 */
class MockSeiBlockchainData {
  private marketCondition: MarketCondition = 'bull'
  private baseTimestamp: number = Date.now()
  private priceHistory: Map<string, number[]> = new Map()
  private volatilityIndex: number = 0.05 // 5% default volatility

  /**
   * Initialize mock data with realistic patterns
   */
  async initialize(): Promise<void> {
    this.generateHistoricalPrices()
    this.setMarketCondition(this.getRandomMarketCondition())
  }

  /**
   * Set current market condition
   */
  setMarketCondition(condition: MarketCondition): void {
    this.marketCondition = condition
    this.volatilityIndex = this.getVolatilityForCondition(condition)
  }

  /**
   * Get current market condition
   */
  getMarketCondition(): MarketCondition {
    return this.marketCondition
  }

  /**
   * Generate realistic price with market trends
   */
  generatePrice(symbol: string, basePrice: number): number {
    const history = this.priceHistory.get(symbol) || []
    const trendMultiplier = this.getTrendMultiplier()
    const volatility = (Math.random() - 0.5) * 2 * this.volatilityIndex
    
    const newPrice = basePrice * (1 + trendMultiplier + volatility)
    
    // Update history
    history.push(newPrice)
    if (history.length > 100) history.shift() // Keep last 100 prices
    this.priceHistory.set(symbol, history)
    
    return Math.max(newPrice, 0.001) // Prevent negative prices
  }

  /**
   * Generate time-series market data
   */
  generateTimeSeriesData(symbol: string, points: number = 24): Array<{timestamp: number, price: number, volume: number}> {
    const basePrice = this.getBasePriceForSymbol(symbol)
    const data = []
    
    for (let i = 0; i < points; i++) {
      const timestamp = this.baseTimestamp - (points - i) * 3600000 // Hourly data
      const price = this.generatePrice(symbol, basePrice)
      const volume = this.generateVolume(price)
      
      data.push({ timestamp, price, volume })
    }
    
    return data
  }

  /**
   * Calculate price change percentage
   */
  calculatePriceChange(symbol: string): number {
    const history = this.priceHistory.get(symbol) || []
    if (history.length < 2) return 0
    
    const current = history[history.length - 1]
    const previous = history[history.length - 2]
    
    return ((current - previous) / previous) * 100
  }

  private getRandomMarketCondition(): MarketCondition {
    const conditions: MarketCondition[] = ['bull', 'bear', 'sideways', 'volatile']
    return conditions[Math.floor(Math.random() * conditions.length)]
  }

  private getVolatilityForCondition(condition: MarketCondition): number {
    switch (condition) {
      case 'bull': return 0.03
      case 'bear': return 0.06
      case 'sideways': return 0.02
      case 'volatile': return 0.12
      default: return 0.05
    }
  }

  private getTrendMultiplier(): number {
    switch (this.marketCondition) {
      case 'bull': return 0.001 + Math.random() * 0.002
      case 'bear': return -0.003 - Math.random() * 0.002
      case 'sideways': return (Math.random() - 0.5) * 0.001
      case 'volatile': return (Math.random() - 0.5) * 0.006
      default: return 0
    }
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'SEI': 0.45,
      'BTC': 43000,
      'ETH': 2600,
      'ATOM': 12.5,
      'OSMO': 0.85,
      'JUNO': 3.2
    }
    return basePrices[symbol.toUpperCase()] || 1.0
  }

  private generateVolume(price: number): number {
    const baseVolume = 1000000 + Math.random() * 5000000
    const priceVolatilityFactor = 1 + (Math.random() - 0.5) * 0.3
    return Math.floor(baseVolume * priceVolatilityFactor)
  }

  private generateHistoricalPrices(): void {
    const symbols = ['SEI', 'BTC', 'ETH', 'ATOM', 'OSMO', 'JUNO']
    
    symbols.forEach(symbol => {
      const basePrice = this.getBasePriceForSymbol(symbol)
      const history = []
      
      // Generate 30 days of historical data
      for (let i = 30; i >= 0; i--) {
        const price = basePrice * (0.9 + Math.random() * 0.2) // ±10% variation
        history.push(price)
      }
      
      this.priceHistory.set(symbol, history)
    })
  }
}

// Singleton instance
export const mockSeiBlockchainData = new MockSeiBlockchainData()

/**
 * Create mock portfolio data with realistic values
 */
export async function createMockPortfolio(walletAddress: string): Promise<VoicePortfolioSummary> {
  const addressHash = hashString(walletAddress)
  const riskLevel = getRiskLevelFromHash(addressHash)
  const portfolioSize = getPortfolioSizeFromHash(addressHash)
  
  const tokens = generatePortfolioTokens(riskLevel, portfolioSize)
  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0)
  const totalPnL = tokens.reduce((sum, token) => sum + token.unrealizedPnL, 0)
  const totalPnLPercentage = (totalPnL / totalValue) * 100

  return {
    walletAddress,
    totalValue,
    totalPnL,
    totalPnLPercentage,
    tokens,
    riskScore: calculateRiskScore(tokens),
    diversificationScore: calculateDiversificationScore(tokens),
    lastUpdated: Date.now(),
    recommendations: generatePortfolioRecommendations(tokens, riskLevel),
    summary: generatePortfolioSummary(totalValue, totalPnLPercentage, tokens.length)
  }
}

/**
 * Create mock market data with realistic patterns
 */
export async function createMockMarketData(symbol: string = 'SEI'): Promise<MarketContext> {
  const marketCondition = mockSeiBlockchainData.getMarketCondition()
  const timeSeriesData = mockSeiBlockchainData.generateTimeSeriesData(symbol, 24)
  const currentPrice = timeSeriesData[timeSeriesData.length - 1].price
  const priceChange24h = mockSeiBlockchainData.calculatePriceChange(symbol)
  
  const sentiment = generateMarketSentiment(marketCondition, priceChange24h)
  const volatility = getVolatilityLabel(Math.abs(priceChange24h))
  
  return {
    symbol: symbol.toUpperCase(),
    seiPrice: symbol.toUpperCase() === 'SEI' ? currentPrice : mockSeiBlockchainData.generatePrice('SEI', 0.45),
    seiChange24h: symbol.toUpperCase() === 'SEI' ? priceChange24h : mockSeiBlockchainData.calculatePriceChange('SEI'),
    marketTrend: sentiment,
    volatility,
    tradingVolume24h: timeSeriesData[timeSeriesData.length - 1].volume,
    marketCap: currentPrice * (50000000 + Math.random() * 100000000), // Random supply
    supportLevel: currentPrice * (0.85 + Math.random() * 0.1),
    resistanceLevel: currentPrice * (1.05 + Math.random() * 0.1),
    rsiValue: 30 + Math.random() * 40, // RSI between 30-70
    fearGreedIndex: generateFearGreedIndex(marketCondition),
    lastUpdated: Date.now(),
    technicalIndicators: generateTechnicalIndicators(timeSeriesData),
    newsEvents: generateRelevantNews(symbol, marketCondition)
  }
}

/**
 * Create mock DeFi opportunities with realistic yields
 */
export async function createMockDeFiOpportunities(): Promise<VoiceDeFiOpportunity[]> {
  const marketCondition = mockSeiBlockchainData.getMarketCondition()
  const baseYieldMultiplier = getYieldMultiplierForMarket(marketCondition)
  
  const opportunities: VoiceDeFiOpportunity[] = [
    {
      protocol: 'SeiSwap',
      type: 'liquidity_pool',
      tokenPair: 'SEI/USDC',
      apy: (8 + Math.random() * 15) * baseYieldMultiplier,
      tvl: 2500000 + Math.random() * 5000000,
      riskLevel: 'moderate',
      description: 'Provide liquidity to the main SEI trading pair with consistent rewards',
      requirements: {
        minDeposit: 100,
        lockPeriod: 0,
        impermanentLossRisk: true
      },
      rewards: ['SEI', 'SEISWAP'],
      fees: {
        deposit: 0,
        withdrawal: 0.1,
        performance: 2.5
      }
    },
    {
      protocol: 'Sei Vault',
      type: 'yield_farming',
      tokenPair: 'SEI',
      apy: (12 + Math.random() * 8) * baseYieldMultiplier,
      tvl: 1200000 + Math.random() * 2000000,
      riskLevel: 'conservative',
      description: 'Single-asset SEI staking with auto-compounding rewards',
      requirements: {
        minDeposit: 50,
        lockPeriod: 7, // 7 days
        impermanentLossRisk: false
      },
      rewards: ['SEI'],
      fees: {
        deposit: 0,
        withdrawal: 0.2,
        performance: 3.0
      }
    },
    {
      protocol: 'Dragonswap',
      type: 'liquidity_pool',
      tokenPair: 'SEI/ATOM',
      apy: (15 + Math.random() * 20) * baseYieldMultiplier,
      tvl: 800000 + Math.random() * 1500000,
      riskLevel: 'aggressive',
      description: 'High-yield cross-chain liquidity with ATOM integration',
      requirements: {
        minDeposit: 200,
        lockPeriod: 14, // 2 weeks
        impermanentLossRisk: true
      },
      rewards: ['SEI', 'ATOM', 'DRAGON'],
      fees: {
        deposit: 0.1,
        withdrawal: 0.3,
        performance: 5.0
      }
    },
    {
      protocol: 'Sei Lending',
      type: 'lending',
      tokenPair: 'USDC',
      apy: (6 + Math.random() * 4) * baseYieldMultiplier,
      tvl: 3500000 + Math.random() * 2000000,
      riskLevel: 'conservative',
      description: 'Lend USDC with stable returns and low risk',
      requirements: {
        minDeposit: 25,
        lockPeriod: 0,
        impermanentLossRisk: false
      },
      rewards: ['USDC', 'SEI'],
      fees: {
        deposit: 0,
        withdrawal: 0,
        performance: 1.5
      }
    },
    {
      protocol: 'Parallax Finance',
      type: 'leveraged_farming',
      tokenPair: 'SEI/ETH',
      apy: (25 + Math.random() * 35) * baseYieldMultiplier,
      tvl: 500000 + Math.random() * 800000,
      riskLevel: 'speculative',
      description: 'Leveraged yield farming with up to 3x multiplier',
      requirements: {
        minDeposit: 500,
        lockPeriod: 30, // 1 month
        impermanentLossRisk: true
      },
      rewards: ['SEI', 'ETH', 'PLX'],
      fees: {
        deposit: 0.2,
        withdrawal: 0.5,
        performance: 8.0
      }
    }
  ]

  // Add dynamic risk scores based on market conditions
  return opportunities.map(opp => ({
    ...opp,
    riskScore: calculateDeFiRiskScore(opp, marketCondition),
    isRecommended: isOpportunityRecommended(opp, marketCondition),
    estimatedReturns: calculateEstimatedReturns(opp),
    liquidityScore: calculateLiquidityScore(opp.tvl),
    safetyRating: calculateSafetyRating(opp)
  }))
}

/**
 * Generate mock Hive Intelligence adapter response
 */
export function createMockHiveResponse(query: string) {
  return {
    _tag: 'Right' as const,
    right: {
      insights: [
        {
          type: 'market_analysis',
          confidence: 0.85 + Math.random() * 0.1,
          summary: generateInsightSummary(query),
          data: {
            sentiment: mockSeiBlockchainData.getMarketCondition(),
            technicalSignals: generateTechnicalSignals(),
            newsImpact: generateNewsImpact()
          }
        }
      ],
      recommendations: generateHiveRecommendations(query),
      metadata: {
        queryId: `hive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        creditsUsed: 1 + Math.floor(Math.random() * 3),
        timestamp: Date.now(),
        processingTime: 150 + Math.random() * 300
      }
    }
  }
}

/**
 * Generate mock Sei Agent Kit adapter response
 */
export function createMockSeiAgentResponse(operation: string) {
  return {
    _tag: 'Right' as const,
    right: {
      insights: [
        {
          type: 'blockchain_operation',
          confidence: 0.9 + Math.random() * 0.05,
          summary: generateOperationSummary(operation),
          data: {
            networkStatus: 'healthy',
            gasEstimate: generateGasEstimate(),
            transactionFlow: generateTransactionFlow(operation)
          }
        }
      ],
      recommendations: generateAgentRecommendations(operation),
      metadata: {
        queryId: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        creditsUsed: 1,
        timestamp: Date.now(),
        processingTime: 100 + Math.random() * 200
      }
    }
  }
}

// Helper functions for realistic data generation

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function getRiskLevelFromHash(hash: number): RiskLevel {
  const levels: RiskLevel[] = ['conservative', 'moderate', 'aggressive', 'speculative']
  return levels[hash % levels.length]
}

function getPortfolioSizeFromHash(hash: number): number {
  const sizes = [1000, 5000, 15000, 50000, 150000, 500000]
  return sizes[hash % sizes.length]
}

function generatePortfolioTokens(riskLevel: RiskLevel, totalValue: number) {
  const tokens = []
  const tokenConfigs = getTokenConfigsForRiskLevel(riskLevel)
  
  tokenConfigs.forEach(config => {
    const value = totalValue * config.allocation
    const currentPrice = mockSeiBlockchainData.generatePrice(config.symbol, config.basePrice)
    const quantity = value / currentPrice
    const priceChange = mockSeiBlockchainData.calculatePriceChange(config.symbol)
    const unrealizedPnL = value * (priceChange / 100)
    
    tokens.push({
      symbol: config.symbol,
      name: config.name,
      quantity,
      currentPrice,
      value,
      priceChange24h: priceChange,
      unrealizedPnL,
      allocation: config.allocation * 100
    })
  })
  
  return tokens
}

function getTokenConfigsForRiskLevel(riskLevel: RiskLevel) {
  const configs = {
    conservative: [
      { symbol: 'SEI', name: 'Sei Network', basePrice: 0.45, allocation: 0.4 },
      { symbol: 'ATOM', name: 'Cosmos Hub', basePrice: 12.5, allocation: 0.3 },
      { symbol: 'USDC', name: 'USD Coin', basePrice: 1.0, allocation: 0.3 }
    ],
    moderate: [
      { symbol: 'SEI', name: 'Sei Network', basePrice: 0.45, allocation: 0.5 },
      { symbol: 'ATOM', name: 'Cosmos Hub', basePrice: 12.5, allocation: 0.2 },
      { symbol: 'OSMO', name: 'Osmosis', basePrice: 0.85, allocation: 0.2 },
      { symbol: 'USDC', name: 'USD Coin', basePrice: 1.0, allocation: 0.1 }
    ],
    aggressive: [
      { symbol: 'SEI', name: 'Sei Network', basePrice: 0.45, allocation: 0.6 },
      { symbol: 'JUNO', name: 'Juno Network', basePrice: 3.2, allocation: 0.25 },
      { symbol: 'OSMO', name: 'Osmosis', basePrice: 0.85, allocation: 0.15 }
    ],
    speculative: [
      { symbol: 'SEI', name: 'Sei Network', basePrice: 0.45, allocation: 0.7 },
      { symbol: 'JUNO', name: 'Juno Network', basePrice: 3.2, allocation: 0.3 }
    ]
  }
  
  return configs[riskLevel]
}

function calculateRiskScore(tokens: any[]): number {
  const volatilitySum = tokens.reduce((sum, token) => {
    return sum + Math.abs(token.priceChange24h)
  }, 0)
  
  const avgVolatility = volatilitySum / tokens.length
  return Math.min(Math.max(avgVolatility / 10, 0), 10) // Scale 0-10
}

function calculateDiversificationScore(tokens: any[]): number {
  const numTokens = tokens.length
  const maxConcentration = Math.max(...tokens.map(t => t.allocation))
  
  // Higher score for more tokens and lower concentration
  const tokenScore = Math.min(numTokens / 5, 1) * 5
  const concentrationScore = (1 - maxConcentration / 100) * 5
  
  return tokenScore + concentrationScore
}

function generatePortfolioRecommendations(tokens: any[], riskLevel: RiskLevel): string[] {
  const recommendations = []
  const marketCondition = mockSeiBlockchainData.getMarketCondition()
  
  if (marketCondition === 'bull') {
    recommendations.push("Consider taking some profits in your best performers")
    if (riskLevel === 'conservative') {
      recommendations.push("You might increase exposure to growth tokens gradually")
    }
  } else if (marketCondition === 'bear') {
    recommendations.push("This could be a good time to accumulate quality tokens")
    recommendations.push("Consider dollar-cost averaging into your positions")
  }
  
  const diversificationScore = calculateDiversificationScore(tokens)
  if (diversificationScore < 5) {
    recommendations.push("Consider diversifying into more tokens to reduce risk")
  }
  
  return recommendations
}

function generatePortfolioSummary(totalValue: number, pnlPercentage: number, tokenCount: number): string {
  const valueStr = `$${totalValue.toLocaleString()}`
  const pnlStr = pnlPercentage >= 0 ? `+${pnlPercentage.toFixed(1)}%` : `${pnlPercentage.toFixed(1)}%`
  
  return `Your portfolio is worth ${valueStr} across ${tokenCount} tokens, with a ${pnlStr} unrealized P&L. ${
    pnlPercentage >= 5 ? 'Great performance!' : 
    pnlPercentage <= -10 ? 'Consider your risk management strategy.' :
    'Your portfolio is performing steadily.'
  }`
}

function generateMarketSentiment(condition: MarketCondition, priceChange: number): 'bullish' | 'bearish' | 'neutral' {
  if (condition === 'bull' && priceChange > 2) return 'bullish'
  if (condition === 'bear' && priceChange < -2) return 'bearish'
  if (Math.abs(priceChange) < 1) return 'neutral'
  return priceChange > 0 ? 'bullish' : 'bearish'
}

function getVolatilityLabel(volatility: number): 'low' | 'medium' | 'high' {
  if (volatility < 2) return 'low'
  if (volatility < 5) return 'medium'
  return 'high'
}

function generateFearGreedIndex(condition: MarketCondition): number {
  const base = {
    bull: 65,
    bear: 25,
    sideways: 50,
    volatile: 40
  }[condition]
  
  return base + (Math.random() - 0.5) * 20
}

function generateTechnicalIndicators(timeSeriesData: any[]) {
  const prices = timeSeriesData.map(d => d.price)
  const currentPrice = prices[prices.length - 1]
  
  return {
    sma20: prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length),
    sma50: prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length),
    rsi: 30 + Math.random() * 40,
    macd: (Math.random() - 0.5) * currentPrice * 0.01,
    bollinger: {
      upper: currentPrice * 1.02,
      lower: currentPrice * 0.98
    }
  }
}

function generateRelevantNews(symbol: string, condition: MarketCondition) {
  const newsTemplates = {
    bull: [
      `${symbol} adoption increases by major institutions`,
      `New partnerships announced for ${symbol} ecosystem`,
      `Technical upgrade improves ${symbol} performance`
    ],
    bear: [
      `Market correction affects ${symbol} price temporarily`,
      `Regulatory concerns impact broader crypto market`,
      `Institutional selling pressure on ${symbol}`
    ],
    sideways: [
      `${symbol} maintains stable trading range`,
      `Market consolidation continues for ${symbol}`,
      `Gradual development progress for ${symbol}`
    ],
    volatile: [
      `${symbol} experiences high trading volumes`,
      `Market uncertainty drives ${symbol} volatility`,
      `Mixed signals from ${symbol} technical analysis`
    ]
  }
  
  return newsTemplates[condition] || []
}

function getYieldMultiplierForMarket(condition: MarketCondition): number {
  return {
    bull: 1.2,
    bear: 0.8,
    sideways: 1.0,
    volatile: 1.1
  }[condition]
}

function calculateDeFiRiskScore(opportunity: any, condition: MarketCondition): number {
  let baseRisk = {
    conservative: 2,
    moderate: 4,
    aggressive: 7,
    speculative: 9
  }[opportunity.riskLevel]
  
  // Adjust for market conditions
  if (condition === 'volatile') baseRisk += 1
  if (condition === 'bear') baseRisk += 0.5
  
  return Math.min(baseRisk, 10)
}

function isOpportunityRecommended(opportunity: any, condition: MarketCondition): boolean {
  if (condition === 'bear' && opportunity.riskLevel === 'speculative') return false
  if (condition === 'volatile' && opportunity.riskLevel === 'aggressive') return false
  return opportunity.apy > 5 && opportunity.tvl > 500000
}

function calculateEstimatedReturns(opportunity: any) {
  const timeframes = [30, 90, 365] // days
  return timeframes.map(days => ({
    timeframe: days,
    estimatedReturn: (opportunity.apy / 365) * days,
    estimatedValue: 1000 * (1 + (opportunity.apy / 365) * days / 100)
  }))
}

function calculateLiquidityScore(tvl: number): number {
  if (tvl > 5000000) return 9
  if (tvl > 2000000) return 7
  if (tvl > 1000000) return 5
  if (tvl > 500000) return 3
  return 1
}

function calculateSafetyRating(opportunity: any): number {
  let rating = 5 // Base rating
  
  if (opportunity.type === 'lending') rating += 2
  if (opportunity.riskLevel === 'conservative') rating += 2
  if (opportunity.riskLevel === 'speculative') rating -= 3
  if (opportunity.requirements.impermanentLossRisk) rating -= 1
  if (opportunity.fees.performance > 5) rating -= 1
  
  return Math.max(1, Math.min(10, rating))
}

function generateInsightSummary(query: string): string {
  const insights = [
    "Current market indicators suggest cautious optimism",
    "Technical analysis shows potential for upward movement",
    "Market sentiment remains mixed with positive underlying trends",
    "Short-term volatility expected but long-term outlook positive"
  ]
  
  return insights[Math.floor(Math.random() * insights.length)]
}

function generateTechnicalSignals() {
  return {
    trend: ['uptrend', 'downtrend', 'sideways'][Math.floor(Math.random() * 3)],
    momentum: ['strong', 'weak', 'neutral'][Math.floor(Math.random() * 3)],
    volume: ['high', 'low', 'average'][Math.floor(Math.random() * 3)]
  }
}

function generateNewsImpact() {
  return {
    sentiment: Math.random() * 2 - 1, // -1 to 1
    relevance: Math.random(),
    recency: Math.random()
  }
}

function generateHiveRecommendations(query: string): string[] {
  return [
    "Monitor key support and resistance levels",
    "Consider risk management strategies",
    "Watch for volume confirmation on price moves",
    "Stay updated on relevant news and developments"
  ]
}

function generateOperationSummary(operation: string): string {
  const summaries = {
    swap: "Token swap operation ready with optimal routing",
    stake: "Staking operation configured with competitive rewards",
    unstake: "Unstaking process initiated with withdrawal timeline",
    transfer: "Transfer operation prepared with gas optimization"
  }
  
  return summaries[operation as keyof typeof summaries] || "Operation prepared and ready for execution"
}

function generateGasEstimate() {
  return {
    slow: Math.floor(0.001 + Math.random() * 0.002),
    standard: Math.floor(0.002 + Math.random() * 0.003),
    fast: Math.floor(0.004 + Math.random() * 0.005)
  }
}

function generateTransactionFlow(operation: string) {
  const flows = {
    swap: ['Approve token', 'Execute swap', 'Confirm transaction'],
    stake: ['Delegate tokens', 'Confirm staking', 'Begin earning rewards'],
    unstake: ['Initiate unstaking', 'Wait unbonding period', 'Claim tokens'],
    transfer: ['Prepare transaction', 'Sign and broadcast', 'Confirm delivery']
  }
  
  return flows[operation as keyof typeof flows] || ['Prepare', 'Execute', 'Confirm']
}

function generateAgentRecommendations(operation: string): string[] {
  return [
    "Double-check transaction details before signing",
    "Ensure sufficient balance for gas fees",
    "Monitor transaction status after submission",
    "Consider optimal timing for your operation"
  ]
}