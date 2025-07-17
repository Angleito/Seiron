/**
 * Portfolio Mock Data Generator
 * 
 * Generates realistic portfolio data for Sei blockchain testing.
 * Includes token balances, transaction history, staking rewards,
 * and performance analytics.
 * 
 * @fileoverview Mock portfolio data for Sei blockchain
 */

const crypto = require('crypto')

class PortfolioMock {
  constructor() {
    this.portfolios = new Map()
    this.validators = this.generateValidators()
    this.stakingAPR = 0.12 // 12% APR
    this.initializeTokenPrices()
  }

  initializeTokenPrices() {
    this.tokenPrices = {
      'SEI': 0.45 + (Math.random() - 0.5) * 0.1,
      'ATOM': 12.5 + (Math.random() - 0.5) * 2,
      'OSMO': 0.85 + (Math.random() - 0.5) * 0.2,
      'JUNO': 3.2 + (Math.random() - 0.5) * 0.8,
      'USDC': 1.0 + (Math.random() - 0.5) * 0.001,
      'USDT': 1.0 + (Math.random() - 0.5) * 0.001
    }
  }

  hashAddress(address) {
    return crypto.createHash('md5').update(address).digest('hex')
  }

  getAddressSeed(address) {
    const hash = this.hashAddress(address)
    return parseInt(hash.substring(0, 8), 16)
  }

  generateSeededRandom(seed, min = 0, max = 1) {
    const x = Math.sin(seed) * 10000
    const random = x - Math.floor(x)
    return min + (max - min) * random
  }

  async getPortfolio(address, options = {}) {
    const { includeHistory = false, includeAnalysis = false } = options
    
    if (this.portfolios.has(address)) {
      const portfolio = this.portfolios.get(address)
      if (includeHistory) portfolio.history = await this.generatePortfolioHistory(address)
      if (includeAnalysis) portfolio.analysis = await this.generatePortfolioAnalysis(portfolio)
      return portfolio
    }

    const seed = this.getAddressSeed(address)
    const portfolio = this.generatePortfolio(address, seed)
    
    this.portfolios.set(address, portfolio)
    
    if (includeHistory) portfolio.history = await this.generatePortfolioHistory(address)
    if (includeAnalysis) portfolio.analysis = await this.generatePortfolioAnalysis(portfolio)
    
    return portfolio
  }

  generatePortfolio(address, seed) {
    // Determine portfolio size based on address
    const sizeCategory = this.generateSeededRandom(seed + 1, 0, 1)
    let baseValue
    
    if (sizeCategory < 0.4) baseValue = 1000 + this.generateSeededRandom(seed + 2, 0, 9000) // Small: $1k-$10k
    else if (sizeCategory < 0.7) baseValue = 10000 + this.generateSeededRandom(seed + 3, 0, 40000) // Medium: $10k-$50k
    else if (sizeCategory < 0.9) baseValue = 50000 + this.generateSeededRandom(seed + 4, 0, 200000) // Large: $50k-$250k
    else baseValue = 250000 + this.generateSeededRandom(seed + 5, 0, 750000) // Whale: $250k-$1M

    // Generate token holdings
    const tokens = this.generateTokenHoldings(seed, baseValue)
    
    // Calculate totals
    const totalValue = tokens.reduce((sum, token) => sum + token.value, 0)
    const totalPnL = tokens.reduce((sum, token) => sum + token.unrealizedPnL, 0)
    const totalPnLPercentage = (totalPnL / totalValue) * 100

    // Generate staking positions
    const stakingPositions = this.generateStakingPositions(seed, totalValue * 0.3) // 30% staked on average

    return {
      address,
      totalValue: Math.round(totalValue * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      totalPnLPercentage: Math.round(totalPnLPercentage * 100) / 100,
      availableBalance: Math.round(totalValue * 0.1 * 100) / 100, // 10% liquid
      tokens,
      stakingPositions,
      riskScore: this.calculateRiskScore(tokens),
      diversificationScore: this.calculateDiversificationScore(tokens),
      lastUpdated: Date.now(),
      performance: this.generatePerformanceMetrics(seed),
      recommendations: this.generateRecommendations(tokens, stakingPositions)
    }
  }

  generateTokenHoldings(seed, totalValue) {
    const tokenConfigs = [
      { symbol: 'SEI', name: 'Sei Network', minAllocation: 0.2, maxAllocation: 0.7, basePrice: this.tokenPrices.SEI },
      { symbol: 'ATOM', name: 'Cosmos Hub', minAllocation: 0.05, maxAllocation: 0.3, basePrice: this.tokenPrices.ATOM },
      { symbol: 'OSMO', name: 'Osmosis', minAllocation: 0, maxAllocation: 0.25, basePrice: this.tokenPrices.OSMO },
      { symbol: 'JUNO', name: 'Juno Network', minAllocation: 0, maxAllocation: 0.2, basePrice: this.tokenPrices.JUNO },
      { symbol: 'USDC', name: 'USD Coin', minAllocation: 0.05, maxAllocation: 0.4, basePrice: this.tokenPrices.USDC },
      { symbol: 'USDT', name: 'Tether USD', minAllocation: 0, maxAllocation: 0.2, basePrice: this.tokenPrices.USDT }
    ]

    const tokens = []
    let remainingValue = totalValue
    
    // Generate SEI (mandatory)
    const seiAllocation = this.generateSeededRandom(seed + 10, 0.2, 0.7)
    const seiValue = totalValue * seiAllocation
    const seiToken = this.generateTokenPosition('SEI', 'Sei Network', seiValue, this.tokenPrices.SEI, seed + 100)
    tokens.push(seiToken)
    remainingValue -= seiValue

    // Generate other tokens
    const numTokens = Math.floor(this.generateSeededRandom(seed + 11, 2, 5)) // 2-4 additional tokens
    const otherConfigs = tokenConfigs.slice(1).sort(() => this.generateSeededRandom(seed + 12, 0, 1) - 0.5)
    
    for (let i = 0; i < numTokens && remainingValue > 100; i++) {
      const config = otherConfigs[i % otherConfigs.length]
      const maxValue = Math.min(remainingValue * 0.8, totalValue * config.maxAllocation)
      const minValue = Math.max(100, totalValue * config.minAllocation)
      
      if (maxValue > minValue) {
        const tokenValue = this.generateSeededRandom(seed + 20 + i, minValue, maxValue)
        const token = this.generateTokenPosition(config.symbol, config.name, tokenValue, config.basePrice, seed + 200 + i)
        tokens.push(token)
        remainingValue -= tokenValue
      }
    }

    return tokens
  }

  generateTokenPosition(symbol, name, value, currentPrice, seed) {
    const priceChange24h = this.generateSeededRandom(seed, -15, 15) // -15% to +15%
    const previousPrice = currentPrice / (1 + priceChange24h / 100)
    const quantity = value / currentPrice
    const purchasePrice = this.generateSeededRandom(seed + 1, previousPrice * 0.7, previousPrice * 1.3)
    const unrealizedPnL = (currentPrice - purchasePrice) * quantity

    return {
      symbol,
      name,
      quantity: Math.round(quantity * 1000000) / 1000000, // 6 decimal places
      currentPrice: Math.round(currentPrice * 10000) / 10000,
      purchasePrice: Math.round(purchasePrice * 10000) / 10000,
      value: Math.round(value * 100) / 100,
      priceChange24h: Math.round(priceChange24h * 100) / 100,
      unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
      allocation: 0 // Will be calculated later
    }
  }

  generateStakingPositions(seed, totalStaked) {
    if (totalStaked < 50) return []

    const positions = []
    const numPositions = Math.floor(this.generateSeededRandom(seed + 50, 1, 4)) // 1-3 validators
    const validators = this.validators.slice(0, numPositions)
    
    validators.forEach((validator, index) => {
      const allocation = this.generateSeededRandom(seed + 60 + index, 0.2, 0.8)
      const stakedAmount = (totalStaked * allocation) / numPositions
      const rewards = stakedAmount * (this.stakingAPR / 365) * 30 // 30 days of rewards
      
      positions.push({
        validator: validator.name,
        validatorAddress: validator.address,
        stakedAmount: Math.round(stakedAmount * 100) / 100,
        pendingRewards: Math.round(rewards * 100) / 100,
        apr: validator.apr,
        commission: validator.commission,
        unbondingPeriod: 21, // 21 days
        status: 'active'
      })
    })

    return positions
  }

  generateValidators() {
    const validatorNames = [
      'Sei Foundation', 'Dragon Stake', 'Cosmos Validator', 'Sei Guardians',
      'Staking Hub', 'Sei Network', 'Blockchain Node', 'Sei Validators',
      'Crypto Stake', 'Sei Protocol', 'Network Guard', 'Sei Staking'
    ]

    return validatorNames.map((name, index) => ({
      name,
      address: `seivaloper1${crypto.randomBytes(20).toString('hex')}`,
      apr: Math.round((0.08 + Math.random() * 0.08) * 10000) / 100, // 8-16% APR
      commission: Math.round((0.01 + Math.random() * 0.09) * 10000) / 100, // 1-10% commission
      votingPower: Math.round((1 + Math.random() * 10) * 100) / 100, // 1-11%
      uptime: Math.round((0.95 + Math.random() * 0.05) * 10000) / 100, // 95-100%
      active: true
    }))
  }

  calculateRiskScore(tokens) {
    const volatilityScore = tokens.reduce((sum, token) => {
      const volatility = Math.abs(token.priceChange24h)
      return sum + volatility * (token.allocation / 100)
    }, 0)
    
    return Math.min(Math.max(volatilityScore / 5, 0), 10) // Scale 0-10
  }

  calculateDiversificationScore(tokens) {
    const numTokens = tokens.length
    const maxConcentration = Math.max(...tokens.map(t => t.allocation))
    
    const tokenScore = Math.min(numTokens / 5, 1) * 5 // Max 5 points for token count
    const concentrationScore = (1 - maxConcentration / 100) * 5 // Max 5 points for low concentration
    
    return Math.round((tokenScore + concentrationScore) * 100) / 100
  }

  generatePerformanceMetrics(seed) {
    return {
      dayChange: this.generateSeededRandom(seed + 80, -8, 12),
      weekChange: this.generateSeededRandom(seed + 81, -15, 25),
      monthChange: this.generateSeededRandom(seed + 82, -25, 40),
      yearChange: this.generateSeededRandom(seed + 83, -50, 150),
      allTimeHigh: this.generateSeededRandom(seed + 84, 110, 300),
      allTimeLow: this.generateSeededRandom(seed + 85, 20, 90),
      sharpeRatio: this.generateSeededRandom(seed + 86, 0.5, 2.5),
      maxDrawdown: this.generateSeededRandom(seed + 87, 5, 35)
    }
  }

  generateRecommendations(tokens, stakingPositions) {
    const recommendations = []
    
    // Diversification recommendations
    if (tokens.length < 3) {
      recommendations.push({
        type: 'diversification',
        priority: 'high',
        title: 'Improve Diversification',
        description: 'Consider adding more tokens to reduce portfolio risk',
        action: 'Add 2-3 different tokens from other ecosystems'
      })
    }

    // Staking recommendations
    const totalStaked = stakingPositions.reduce((sum, pos) => sum + pos.stakedAmount, 0)
    const totalValue = tokens.reduce((sum, token) => sum + token.value, 0)
    const stakingRatio = totalStaked / totalValue

    if (stakingRatio < 0.2) {
      recommendations.push({
        type: 'staking',
        priority: 'medium',
        title: 'Increase Staking Rewards',
        description: 'You could earn more by staking a portion of your SEI tokens',
        action: 'Consider staking 20-30% of your portfolio'
      })
    }

    // Risk management
    const seiAllocation = tokens.find(t => t.symbol === 'SEI')?.allocation || 0
    if (seiAllocation > 70) {
      recommendations.push({
        type: 'risk',
        priority: 'high',
        title: 'Reduce Concentration Risk',
        description: 'High concentration in SEI increases portfolio volatility',
        action: 'Consider diversifying into other quality tokens'
      })
    }

    return recommendations
  }

  async getTokenBalance(address, symbol) {
    const portfolio = await this.getPortfolio(address)
    const token = portfolio.tokens.find(t => t.symbol === symbol)
    
    if (!token) {
      return {
        symbol,
        balance: 0,
        value: 0,
        currentPrice: this.tokenPrices[symbol] || 0
      }
    }

    return {
      symbol: token.symbol,
      balance: token.quantity,
      value: token.value,
      currentPrice: token.currentPrice,
      priceChange24h: token.priceChange24h,
      unrealizedPnL: token.unrealizedPnL
    }
  }

  async getTransactionHistory(address, options = {}) {
    const { limit = 50, offset = 0, type } = options
    const seed = this.getAddressSeed(address)
    
    const transactions = []
    const numTransactions = Math.min(limit, 100)
    
    for (let i = 0; i < numTransactions; i++) {
      const txSeed = seed + i + offset
      const transaction = this.generateTransaction(address, txSeed, i + offset)
      
      if (!type || transaction.type === type) {
        transactions.push(transaction)
      }
    }

    return {
      transactions: transactions.slice(0, limit),
      total: 500 + Math.floor(this.generateSeededRandom(seed, 0, 1000)),
      hasMore: offset + limit < 500
    }
  }

  generateTransaction(address, seed, index) {
    const types = ['transfer', 'swap', 'stake', 'unstake', 'claim_rewards', 'deposit', 'withdraw']
    const type = types[Math.floor(this.generateSeededRandom(seed, 0, types.length))]
    const timestamp = Date.now() - (index * 3600000) - Math.floor(this.generateSeededRandom(seed + 1, 0, 3600000))
    
    const baseTransaction = {
      hash: crypto.randomBytes(32).toString('hex'),
      type,
      timestamp,
      status: 'success',
      gasUsed: Math.floor(this.generateSeededRandom(seed + 2, 50000, 200000)),
      gasFee: this.generateSeededRandom(seed + 3, 0.01, 0.05)
    }

    switch (type) {
      case 'transfer':
        return {
          ...baseTransaction,
          from: address,
          to: `sei1${crypto.randomBytes(20).toString('hex')}`,
          amount: this.generateSeededRandom(seed + 4, 10, 1000),
          token: 'SEI'
        }
      
      case 'swap':
        const tokens = ['SEI', 'ATOM', 'OSMO', 'USDC']
        const fromToken = tokens[Math.floor(this.generateSeededRandom(seed + 5, 0, tokens.length))]
        let toToken = tokens[Math.floor(this.generateSeededRandom(seed + 6, 0, tokens.length))]
        while (toToken === fromToken) {
          toToken = tokens[Math.floor(this.generateSeededRandom(seed + 7, 0, tokens.length))]
        }
        
        return {
          ...baseTransaction,
          fromToken,
          toToken,
          fromAmount: this.generateSeededRandom(seed + 8, 50, 500),
          toAmount: this.generateSeededRandom(seed + 9, 40, 600),
          slippage: this.generateSeededRandom(seed + 10, 0.1, 2.0)
        }
      
      case 'stake':
        return {
          ...baseTransaction,
          validator: this.validators[Math.floor(this.generateSeededRandom(seed + 11, 0, this.validators.length))].name,
          amount: this.generateSeededRandom(seed + 12, 100, 2000),
          token: 'SEI'
        }
      
      default:
        return baseTransaction
    }
  }

  async getStakingRewards(address, timeframe = '30d') {
    const seed = this.getAddressSeed(address)
    const portfolio = await this.getPortfolio(address)
    
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 365
    const dailyRewards = []
    
    const totalStaked = portfolio.stakingPositions.reduce((sum, pos) => sum + pos.stakedAmount, 0)
    const dailyReward = totalStaked * (this.stakingAPR / 365)
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const variance = this.generateSeededRandom(seed + i, 0.8, 1.2)
      const reward = dailyReward * variance
      
      dailyRewards.push({
        date: date.toISOString().split('T')[0],
        amount: Math.round(reward * 100000) / 100000,
        validator: portfolio.stakingPositions[0]?.validator || 'Unknown'
      })
    }

    return {
      totalRewards: Math.round(dailyRewards.reduce((sum, r) => sum + r.amount, 0) * 100000) / 100000,
      dailyRewards,
      averageDaily: Math.round(dailyReward * 100000) / 100000,
      projectedAnnual: Math.round(totalStaked * this.stakingAPR * 100) / 100
    }
  }

  async getValidators(options = {}) {
    const { activeOnly = true, sortBy = 'commission' } = options
    
    let validators = this.validators
    
    if (activeOnly) {
      validators = validators.filter(v => v.active)
    }
    
    validators.sort((a, b) => {
      switch (sortBy) {
        case 'commission':
          return a.commission - b.commission
        case 'apr':
          return b.apr - a.apr
        case 'votingPower':
          return b.votingPower - a.votingPower
        case 'uptime':
          return b.uptime - a.uptime
        default:
          return 0
      }
    })

    return validators
  }

  async simulateStaking(params) {
    const { amount, validator, duration = 21 } = params
    
    const validatorInfo = this.validators.find(v => v.name === validator) || this.validators[0]
    const apr = validatorInfo.apr
    const commission = validatorInfo.commission
    
    const grossRewards = amount * (apr / 100) * (duration / 365)
    const netRewards = grossRewards * (1 - commission / 100)
    
    return {
      stakedAmount: amount,
      validator: validatorInfo.name,
      duration,
      estimatedRewards: Math.round(netRewards * 100) / 100,
      apr: apr,
      commission: commission,
      unbondingPeriod: 21,
      risks: [
        'Slashing risk if validator misbehaves',
        '21-day unbonding period',
        'Opportunity cost of locked tokens'
      ]
    }
  }

  async generatePortfolioHistory(address) {
    const seed = this.getAddressSeed(address)
    const days = 30
    const history = []
    
    const currentValue = (await this.getPortfolio(address)).totalValue
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const variance = this.generateSeededRandom(seed + i + 1000, 0.85, 1.15)
      const value = currentValue * variance
      
      history.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100
      })
    }

    return history
  }

  async generatePortfolioAnalysis(portfolio) {
    return {
      riskLevel: portfolio.riskScore < 3 ? 'Low' : portfolio.riskScore < 6 ? 'Medium' : 'High',
      diversification: portfolio.diversificationScore > 7 ? 'Excellent' : portfolio.diversificationScore > 5 ? 'Good' : 'Poor',
      stakingEfficiency: portfolio.stakingPositions.length > 0 ? 'Active' : 'Inactive',
      recommendations: portfolio.recommendations,
      strengths: [
        'Strong position in Sei ecosystem',
        'Active staking participation',
        'Balanced risk profile'
      ],
      weaknesses: [
        'Could improve diversification',
        'Consider DeFi opportunities',
        'Monitor risk exposure'
      ]
    }
  }
}

function createPortfolioMock() {
  return new PortfolioMock()
}

module.exports = { createPortfolioMock }