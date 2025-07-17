/**
 * Market Mock Data Generator
 * 
 * Generates realistic market data with time-series patterns,
 * sentiment analysis, and network statistics for Sei blockchain testing.
 * 
 * @fileoverview Mock market data for Sei blockchain
 */

const crypto = require('crypto')

class MarketMock {
  constructor() {
    this.baseTimestamp = Date.now()
    this.marketCondition = this.getRandomMarketCondition()
    this.priceHistory = new Map()
    this.networkStats = this.initializeNetworkStats()
    this.initializeBasePrices()
    this.generateHistoricalData()
  }

  initializeBasePrices() {
    this.basePrices = {
      'SEI': 0.45,
      'ATOM': 12.5,
      'OSMO': 0.85,
      'JUNO': 3.2,
      'USDC': 1.0,
      'USDT': 1.0,
      'BTC': 43000,
      'ETH': 2600
    }

    this.currentPrices = { ...this.basePrices }
    this.volatility = this.getVolatilityForCondition(this.marketCondition)
  }

  initializeNetworkStats() {
    return {
      blockHeight: 15000000 + Math.floor(Math.random() * 100000),
      blockTime: 2.3 + Math.random() * 0.5, // 2.3-2.8 seconds
      activeValidators: 100 + Math.floor(Math.random() * 20),
      totalValidators: 120 + Math.floor(Math.random() * 30),
      bondedTokens: 450000000 + Math.random() * 50000000,
      totalSupply: 2000000000,
      communityPool: 25000000 + Math.random() * 5000000,
      inflation: 0.08 + Math.random() * 0.04, // 8-12%
      stakingRatio: 0.65 + Math.random() * 0.15 // 65-80%
    }
  }

  getRandomMarketCondition() {
    const conditions = ['bull', 'bear', 'sideways', 'volatile']
    return conditions[Math.floor(Math.random() * conditions.length)]
  }

  getVolatilityForCondition(condition) {
    switch (condition) {
      case 'bull': return 0.03
      case 'bear': return 0.06
      case 'sideways': return 0.02
      case 'volatile': return 0.12
      default: return 0.05
    }
  }

  getTrendMultiplier() {
    switch (this.marketCondition) {
      case 'bull': return 0.001 + Math.random() * 0.002
      case 'bear': return -0.003 - Math.random() * 0.002
      case 'sideways': return (Math.random() - 0.5) * 0.001
      case 'volatile': return (Math.random() - 0.5) * 0.006
      default: return 0
    }
  }

  generatePrice(symbol) {
    const basePrice = this.basePrices[symbol] || 1.0
    const history = this.priceHistory.get(symbol) || []
    const lastPrice = history.length > 0 ? history[history.length - 1].price : basePrice
    
    const trendMultiplier = this.getTrendMultiplier()
    const volatility = (Math.random() - 0.5) * 2 * this.volatility
    const newPrice = lastPrice * (1 + trendMultiplier + volatility)
    
    this.currentPrices[symbol] = Math.max(newPrice, basePrice * 0.1) // Prevent negative prices
    return this.currentPrices[symbol]
  }

  generateVolume(price, symbol) {
    const baseLiquidityMap = {
      'SEI': 5000000,
      'ATOM': 3000000,
      'OSMO': 2000000,
      'JUNO': 1000000,
      'USDC': 10000000,
      'USDT': 8000000,
      'BTC': 50000000,
      'ETH': 30000000
    }
    
    const baseLiquidity = baseLiquidityMap[symbol] || 1000000
    const volatilityMultiplier = 1 + Math.abs(this.volatility) * 10
    const randomMultiplier = 0.5 + Math.random() * 1.5
    
    return Math.floor(baseLiquidity * volatilityMultiplier * randomMultiplier)
  }

  generateHistoricalData() {
    const symbols = Object.keys(this.basePrices)
    const hours = 168 // 7 days of hourly data
    
    symbols.forEach(symbol => {
      const history = []
      let currentPrice = this.basePrices[symbol]
      
      for (let i = hours; i >= 0; i--) {
        const timestamp = this.baseTimestamp - (i * 3600000) // Hourly intervals
        const volume = this.generateVolume(currentPrice, symbol)
        
        history.push({
          timestamp,
          price: currentPrice,
          volume,
          high: currentPrice * (1 + Math.random() * 0.02),
          low: currentPrice * (1 - Math.random() * 0.02),
          open: currentPrice * (0.99 + Math.random() * 0.02),
          close: currentPrice
        })
        
        // Update price for next iteration
        currentPrice = this.generatePrice(symbol)
      }
      
      this.priceHistory.set(symbol, history)
    })
  }

  async getPriceData(symbol, options = {}) {
    const { interval = '1h', limit = 24 } = options
    
    if (!this.basePrices[symbol]) {
      throw new Error(`Symbol ${symbol} not supported`)
    }

    const history = this.priceHistory.get(symbol) || []
    const data = history.slice(-limit)
    
    // Calculate 24h change
    const currentPrice = data[data.length - 1]?.price || this.basePrices[symbol]
    const price24hAgo = data.length >= 24 ? data[data.length - 24].price : currentPrice
    const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100

    return {
      symbol,
      currentPrice: Math.round(currentPrice * 10000) / 10000,
      change24h: Math.round(change24h * 100) / 100,
      volume24h: data.reduce((sum, d) => sum + d.volume, 0),
      high24h: Math.max(...data.map(d => d.high)),
      low24h: Math.min(...data.map(d => d.low)),
      marketCap: currentPrice * this.getCirculatingSupply(symbol),
      data: data.map(d => ({
        timestamp: d.timestamp,
        price: Math.round(d.price * 10000) / 10000,
        volume: d.volume,
        high: Math.round(d.high * 10000) / 10000,
        low: Math.round(d.low * 10000) / 10000
      }))
    }
  }

  getCirculatingSupply(symbol) {
    const supplies = {
      'SEI': 1800000000,
      'ATOM': 400000000,
      'OSMO': 700000000,
      'JUNO': 185000000,
      'USDC': 25000000000,
      'USDT': 90000000000,
      'BTC': 19500000,
      'ETH': 120000000
    }
    return supplies[symbol] || 1000000000
  }

  async getMarketOverview() {
    const topTokens = ['SEI', 'ATOM', 'OSMO', 'JUNO']
    const markets = []
    
    for (const symbol of topTokens) {
      const priceData = await this.getPriceData(symbol, { limit: 24 })
      markets.push({
        symbol,
        name: this.getTokenName(symbol),
        price: priceData.currentPrice,
        change24h: priceData.change24h,
        volume24h: priceData.volume24h,
        marketCap: priceData.marketCap,
        rank: markets.length + 1
      })
    }

    // Calculate total market cap
    const totalMarketCap = markets.reduce((sum, m) => sum + m.marketCap, 0)
    const totalVolume24h = markets.reduce((sum, m) => sum + m.volume24h, 0)
    
    return {
      totalMarketCap,
      totalVolume24h,
      marketCondition: this.marketCondition,
      dominance: {
        SEI: (markets.find(m => m.symbol === 'SEI')?.marketCap / totalMarketCap * 100) || 0
      },
      markets,
      fearGreedIndex: this.generateFearGreedIndex(),
      lastUpdated: Date.now()
    }
  }

  getTokenName(symbol) {
    const names = {
      'SEI': 'Sei Network',
      'ATOM': 'Cosmos Hub',
      'OSMO': 'Osmosis',
      'JUNO': 'Juno Network',
      'USDC': 'USD Coin',
      'USDT': 'Tether USD',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum'
    }
    return names[symbol] || symbol
  }

  generateFearGreedIndex() {
    const baseIndex = {
      bull: 65,
      bear: 25,
      sideways: 50,
      volatile: 40
    }[this.marketCondition] || 50
    
    return Math.max(0, Math.min(100, baseIndex + (Math.random() - 0.5) * 20))
  }

  async getSentimentData(symbol = 'SEI') {
    const priceData = await this.getPriceData(symbol, { limit: 7 * 24 }) // 7 days
    const sentiment = this.calculateSentiment(priceData.change24h)
    
    return {
      symbol,
      overall: sentiment,
      score: this.getSentimentScore(sentiment),
      factors: {
        priceAction: priceData.change24h > 5 ? 'Very Positive' : 
                    priceData.change24h > 0 ? 'Positive' : 
                    priceData.change24h > -5 ? 'Negative' : 'Very Negative',
        volume: priceData.volume24h > 5000000 ? 'High' : 'Normal',
        marketCondition: this.marketCondition,
        technicalIndicators: this.generateTechnicalSentiment(),
        socialMedia: this.generateSocialSentiment(),
        fundamentals: this.generateFundamentalSentiment()
      },
      newsEvents: this.generateNewsEvents(symbol),
      confidence: 0.7 + Math.random() * 0.25
    }
  }

  calculateSentiment(priceChange) {
    if (priceChange > 5) return 'Very Bullish'
    if (priceChange > 2) return 'Bullish'
    if (priceChange > -2) return 'Neutral'
    if (priceChange > -5) return 'Bearish'
    return 'Very Bearish'
  }

  getSentimentScore(sentiment) {
    const scores = {
      'Very Bullish': 90,
      'Bullish': 70,
      'Neutral': 50,
      'Bearish': 30,
      'Very Bearish': 10
    }
    return scores[sentiment] || 50
  }

  generateTechnicalSentiment() {
    const indicators = ['RSI', 'MACD', 'Bollinger Bands', 'Moving Averages']
    const signals = ['Buy', 'Sell', 'Neutral']
    
    return indicators.map(indicator => ({
      indicator,
      signal: signals[Math.floor(Math.random() * signals.length)],
      strength: Math.round((0.5 + Math.random() * 0.5) * 100) / 100
    }))
  }

  generateSocialSentiment() {
    return {
      twitter: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
      reddit: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
      telegram: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
      overall: Math.round((0.4 + Math.random() * 0.5) * 100) / 100
    }
  }

  generateFundamentalSentiment() {
    return {
      development: Math.round((0.6 + Math.random() * 0.4) * 100) / 100,
      partnerships: Math.round((0.5 + Math.random() * 0.5) * 100) / 100,
      adoption: Math.round((0.4 + Math.random() * 0.6) * 100) / 100,
      competition: Math.round((0.3 + Math.random() * 0.7) * 100) / 100
    }
  }

  generateNewsEvents(symbol) {
    const eventTypes = ['partnership', 'upgrade', 'listing', 'development', 'market']
    const events = []
    
    for (let i = 0; i < 3; i++) {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      events.push({
        type,
        title: this.generateNewsTitle(symbol, type),
        timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 3600000), // Last 7 days
        impact: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
        sentiment: ['Positive', 'Neutral', 'Negative'][Math.floor(Math.random() * 3)]
      })
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp)
  }

  generateNewsTitle(symbol, type) {
    const templates = {
      partnership: [`${symbol} announces strategic partnership with major DeFi protocol`, `New collaboration enhances ${symbol} ecosystem`],
      upgrade: [`${symbol} network upgrade improves performance by 40%`, `Major ${symbol} protocol enhancement goes live`],
      listing: [`${symbol} token listed on major exchange`, `New trading pairs available for ${symbol}`],
      development: [`${symbol} development team releases quarterly update`, `Developer activity increases on ${symbol} network`],
      market: [`${symbol} shows strong market performance`, `Institutional interest in ${symbol} grows`]
    }
    
    const options = templates[type] || [`${symbol} news update`]
    return options[Math.floor(Math.random() * options.length)]
  }

  async getNetworkStatus() {
    // Simulate network health
    const blockHeight = this.networkStats.blockHeight + Math.floor((Date.now() - this.baseTimestamp) / (this.networkStats.blockTime * 1000))
    
    return {
      status: 'healthy',
      blockHeight,
      blockTime: this.networkStats.blockTime,
      lastBlockTime: Date.now() - (this.networkStats.blockTime * 1000),
      peers: 150 + Math.floor(Math.random() * 50),
      syncStatus: 'synced',
      chainId: 'pacific-1',
      nodeVersion: '0.3.5',
      consensusVersion: '0.34.21',
      uptime: 0.995 + Math.random() * 0.005
    }
  }

  async getNetworkStats() {
    const currentTime = Date.now()
    const dayInMs = 24 * 60 * 60 * 1000
    
    return {
      ...this.networkStats,
      blockHeight: this.networkStats.blockHeight + Math.floor((currentTime - this.baseTimestamp) / (this.networkStats.blockTime * 1000)),
      transactions24h: 150000 + Math.floor(Math.random() * 50000),
      uniqueAddresses24h: 25000 + Math.floor(Math.random() * 10000),
      averageGasPrice: 0.02 + Math.random() * 0.03,
      networkHashrate: Math.random() * 100, // Simplified metric
      decentralizationIndex: 0.85 + Math.random() * 0.1,
      stakingYield: this.networkStats.inflation * (1 - this.networkStats.stakingRatio) + 0.08,
      unbondingPeriod: 21, // days
      slashingParameters: {
        downtimeJail: 0.01,
        doubleSignSlash: 0.05,
        downtimeSlash: 0.0001
      }
    }
  }

  async simulateSwap(params) {
    const { fromToken, toToken, amount, slippage = 0.5 } = params
    
    const fromPrice = this.currentPrices[fromToken] || 1
    const toPrice = this.currentPrices[toToken] || 1
    
    // Calculate base exchange rate
    const baseRate = fromPrice / toPrice
    const baseToAmount = amount * baseRate
    
    // Apply slippage and fees
    const actualSlippage = Math.random() * slippage
    const tradingFee = 0.003 // 0.3%
    const protocolFee = 0.0005 // 0.05%
    
    const totalFees = tradingFee + protocolFee
    const slippageImpact = actualSlippage / 100
    
    const finalToAmount = baseToAmount * (1 - totalFees) * (1 - slippageImpact)
    const priceImpact = (actualSlippage + totalFees * 100)
    
    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: Math.round(finalToAmount * 1000000) / 1000000,
      exchangeRate: Math.round(baseRate * 1000000) / 1000000,
      priceImpact: Math.round(priceImpact * 100) / 100,
      slippage: Math.round(actualSlippage * 100) / 100,
      fees: {
        trading: Math.round(amount * tradingFee * 1000000) / 1000000,
        protocol: Math.round(amount * protocolFee * 1000000) / 1000000,
        total: Math.round(amount * totalFees * 1000000) / 1000000
      },
      route: [`${fromToken}/USDC`, `USDC/${toToken}`],
      estimatedGas: 0.02 + Math.random() * 0.03,
      minimumReceived: Math.round(finalToAmount * 0.995 * 1000000) / 1000000
    }
  }

  getCurrentCondition() {
    return this.marketCondition
  }

  // Update market condition periodically
  updateMarketCondition() {
    // 10% chance to change condition every hour
    if (Math.random() < 0.1) {
      this.marketCondition = this.getRandomMarketCondition()
      this.volatility = this.getVolatilityForCondition(this.marketCondition)
      console.log(`Market condition changed to: ${this.marketCondition}`)
    }
  }
}

function createMarketMock() {
  const mock = new MarketMock()
  
  // Update prices every 10 seconds
  setInterval(() => {
    Object.keys(mock.basePrices).forEach(symbol => {
      mock.generatePrice(symbol)
    })
  }, 10000)
  
  // Update market condition every hour
  setInterval(() => {
    mock.updateMarketCondition()
  }, 3600000)
  
  return mock
}

module.exports = { createMarketMock }