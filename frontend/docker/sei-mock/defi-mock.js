/**
 * DeFi Mock Data Generator
 * 
 * Generates realistic DeFi opportunity data including:
 * - Liquidity pools with dynamic APY
 * - Yield farming opportunities
 * - Staking rewards
 * - Risk assessments
 * 
 * @fileoverview Mock DeFi data for Sei blockchain
 */

const crypto = require('crypto')

class DeFiMock {
  constructor() {
    this.protocols = this.initializeProtocols()
    this.liquidityPools = this.generateLiquidityPools()
    this.farmingOpportunities = this.generateFarmingOpportunities()
    this.stakingOptions = this.generateStakingOptions()
    this.marketCondition = 'bull' // Will be updated by market mock
    this.lastUpdate = Date.now()
  }

  initializeProtocols() {
    return [
      {
        name: 'SeiSwap',
        type: 'dex',
        tvl: 25000000 + Math.random() * 15000000,
        volume24h: 5000000 + Math.random() * 3000000,
        fees24h: 15000 + Math.random() * 10000,
        users24h: 2500 + Math.floor(Math.random() * 1500),
        logo: 'seiswap.png',
        verified: true,
        auditScore: 9.2,
        riskLevel: 'low'
      },
      {
        name: 'Sei Vault',
        type: 'yield',
        tvl: 18000000 + Math.random() * 12000000,
        volume24h: 2000000 + Math.random() * 1500000,
        fees24h: 8000 + Math.random() * 5000,
        users24h: 1800 + Math.floor(Math.random() * 1200),
        logo: 'seivault.png',
        verified: true,
        auditScore: 8.8,
        riskLevel: 'low'
      },
      {
        name: 'Dragonswap',
        type: 'dex',
        tvl: 12000000 + Math.random() * 8000000,
        volume24h: 3500000 + Math.random() * 2000000,
        fees24h: 12000 + Math.random() * 7000,
        users24h: 1500 + Math.floor(Math.random() * 1000),
        logo: 'dragonswap.png',
        verified: true,
        auditScore: 8.5,
        riskLevel: 'medium'
      },
      {
        name: 'Sei Lending',
        type: 'lending',
        tvl: 22000000 + Math.random() * 10000000,
        volume24h: 1800000 + Math.random() * 1200000,
        fees24h: 6000 + Math.random() * 4000,
        users24h: 1200 + Math.floor(Math.random() * 800),
        logo: 'seilending.png',
        verified: true,
        auditScore: 9.0,
        riskLevel: 'low'
      },
      {
        name: 'Parallax Finance',
        type: 'leveraged',
        tvl: 8000000 + Math.random() * 5000000,
        volume24h: 2500000 + Math.random() * 1500000,
        fees24h: 18000 + Math.random() * 12000,
        users24h: 800 + Math.floor(Math.random() * 600),
        logo: 'parallax.png',
        verified: false,
        auditScore: 7.2,
        riskLevel: 'high'
      }
    ]
  }

  generateLiquidityPools() {
    const pairs = [
      { token0: 'SEI', token1: 'USDC', baseApy: 12, risk: 'low' },
      { token0: 'SEI', token1: 'ATOM', baseApy: 18, risk: 'medium' },
      { token0: 'SEI', token1: 'OSMO', baseApy: 22, risk: 'medium' },
      { token0: 'ATOM', token1: 'USDC', baseApy: 10, risk: 'low' },
      { token0: 'OSMO', token1: 'USDC', baseApy: 14, risk: 'low' },
      { token0: 'SEI', token1: 'ETH', baseApy: 28, risk: 'high' },
      { token0: 'JUNO', token1: 'SEI', baseApy: 35, risk: 'high' }
    ]

    return pairs.map((pair, index) => {
      const protocol = this.protocols[index % this.protocols.length]
      const tvl = 500000 + Math.random() * 3000000
      const apr = this.calculateDynamicAPR(pair.baseApy)
      
      return {
        id: `pool_${pair.token0}_${pair.token1}_${index}`,
        protocol: protocol.name,
        tokenPair: `${pair.token0}/${pair.token1}`,
        token0: pair.token0,
        token1: pair.token1,
        apr: apr,
        apy: this.aprToApy(apr),
        tvl: Math.round(tvl),
        volume24h: Math.round(tvl * (0.1 + Math.random() * 0.4)), // 10-50% of TVL
        fees24h: Math.round(tvl * 0.003 * (0.1 + Math.random() * 0.4)), // Based on volume
        liquidity: {
          token0: Math.round(tvl * 0.5 / this.getTokenPrice(pair.token0)),
          token1: Math.round(tvl * 0.5 / this.getTokenPrice(pair.token1))
        },
        riskLevel: pair.risk,
        impermanentLossRisk: pair.token0 !== 'USDC' && pair.token1 !== 'USDC' && pair.token0 !== 'USDT' && pair.token1 !== 'USDT',
        rewards: this.generateRewardTokens(protocol.name),
        isActive: true,
        minDeposit: 50,
        lockPeriod: 0,
        fees: {
          deposit: 0,
          withdrawal: 0.1,
          performance: protocol.name === 'Parallax Finance' ? 8.0 : 2.5
        }
      }
    })
  }

  generateFarmingOpportunities() {
    const farms = [
      { token: 'SEI', baseApy: 15, protocol: 'Sei Vault', risk: 'low' },
      { token: 'SEI-ATOM LP', baseApy: 25, protocol: 'SeiSwap', risk: 'medium' },
      { token: 'SEI-USDC LP', baseApy: 18, protocol: 'SeiSwap', risk: 'low' },
      { token: 'OSMO-USDC LP', baseApy: 20, protocol: 'Dragonswap', risk: 'medium' },
      { token: 'SEI-ETH LP', baseApy: 45, protocol: 'Parallax Finance', risk: 'high' }
    ]

    return farms.map((farm, index) => {
      const protocol = this.protocols.find(p => p.name === farm.protocol)
      const tvl = 200000 + Math.random() * 2000000
      const apr = this.calculateDynamicAPR(farm.baseApy)
      
      return {
        id: `farm_${index}`,
        protocol: farm.protocol,
        token: farm.token,
        type: farm.token.includes('LP') ? 'liquidity_farming' : 'single_asset',
        apr: apr,
        apy: this.aprToApy(apr),
        tvl: Math.round(tvl),
        totalStaked: Math.round(tvl / this.getTokenPrice(farm.token.split('-')[0])),
        rewardsPerBlock: Math.random() * 10,
        blockTime: 2.5,
        riskLevel: farm.risk,
        riskScore: this.calculateRiskScore(farm.risk, protocol),
        rewards: this.generateRewardTokens(farm.protocol),
        requirements: {
          minDeposit: farm.risk === 'high' ? 500 : 100,
          lockPeriod: farm.risk === 'high' ? 30 : 7,
          impermanentLossRisk: farm.token.includes('LP')
        },
        fees: {
          deposit: 0,
          withdrawal: farm.risk === 'high' ? 0.5 : 0.2,
          performance: protocol?.riskLevel === 'high' ? 8.0 : 3.0
        },
        isActive: true,
        multiplier: 1 + Math.random() * 2,
        vestingPeriod: farm.risk === 'high' ? 90 : 0
      }
    })
  }

  generateStakingOptions() {
    return [
      {
        id: 'sei_native_staking',
        protocol: 'Sei Network',
        token: 'SEI',
        type: 'native_staking',
        apr: 11 + Math.random() * 3, // 11-14%
        apy: this.aprToApy(11 + Math.random() * 3),
        totalStaked: 450000000 + Math.random() * 50000000,
        stakingRatio: 0.65 + Math.random() * 0.15, // 65-80%
        riskLevel: 'low',
        riskScore: 2,
        rewards: ['SEI'],
        requirements: {
          minDeposit: 1,
          lockPeriod: 0,
          unbondingPeriod: 21
        },
        fees: {
          deposit: 0,
          withdrawal: 0,
          commission: 5 + Math.random() * 10 // 5-15%
        },
        slashingRisk: {
          downtime: 0.01,
          doubleSign: 0.05
        },
        validators: 100 + Math.floor(Math.random() * 20)
      }
    ]
  }

  calculateDynamicAPR(baseApr) {
    // Adjust APR based on market conditions and time
    let multiplier = 1.0
    
    switch (this.marketCondition) {
      case 'bull':
        multiplier = 1.1 + Math.random() * 0.2 // 10-30% boost
        break
      case 'bear':
        multiplier = 0.7 + Math.random() * 0.2 // 30-50% reduction
        break
      case 'volatile':
        multiplier = 0.9 + Math.random() * 0.4 // ±20% variation
        break
      default:
        multiplier = 0.95 + Math.random() * 0.1 // ±5% variation
    }
    
    // Add time-based variation (simulate real-world fluctuations)
    const timeVariation = Math.sin(Date.now() / 86400000) * 0.1 // Daily cycle
    multiplier += timeVariation
    
    return Math.round(baseApr * multiplier * 100) / 100
  }

  aprToApy(apr) {
    // Convert APR to APY assuming daily compounding
    return Math.round(((1 + apr / 100 / 365) ** 365 - 1) * 100 * 100) / 100
  }

  getTokenPrice(token) {
    const prices = {
      'SEI': 0.45,
      'ATOM': 12.5,
      'OSMO': 0.85,
      'JUNO': 3.2,
      'USDC': 1.0,
      'USDT': 1.0,
      'ETH': 2600,
      'BTC': 43000
    }
    return prices[token] || 1.0
  }

  generateRewardTokens(protocolName) {
    const rewardMaps = {
      'SeiSwap': ['SEI', 'SEISWAP'],
      'Sei Vault': ['SEI'],
      'Dragonswap': ['SEI', 'DRAGON'],
      'Sei Lending': ['SEI', 'LEND'],
      'Parallax Finance': ['SEI', 'PLX']
    }
    
    return rewardMaps[protocolName] || ['SEI']
  }

  calculateRiskScore(riskLevel, protocol) {
    let baseScore = {
      'low': 2,
      'medium': 5,
      'high': 8,
      'speculative': 9
    }[riskLevel] || 5
    
    // Adjust for protocol audit score
    if (protocol) {
      const auditAdjustment = (9 - protocol.auditScore) * 0.5
      baseScore += auditAdjustment
    }
    
    // Adjust for market conditions
    if (this.marketCondition === 'volatile') baseScore += 1
    if (this.marketCondition === 'bear') baseScore += 0.5
    
    return Math.min(Math.max(baseScore, 1), 10)
  }

  async getOpportunities(filters = {}) {
    const { riskLevel, minApy, maxApy, protocol } = filters
    
    let opportunities = [
      ...this.liquidityPools.map(pool => ({
        ...pool,
        category: 'liquidity_pool'
      })),
      ...this.farmingOpportunities.map(farm => ({
        ...farm,
        category: 'yield_farming'
      })),
      ...this.stakingOptions.map(stake => ({
        ...stake,
        category: 'staking'
      }))
    ]
    
    // Apply filters
    if (riskLevel) {
      opportunities = opportunities.filter(opp => opp.riskLevel === riskLevel)
    }
    
    if (minApy) {
      opportunities = opportunities.filter(opp => opp.apy >= minApy)
    }
    
    if (maxApy) {
      opportunities = opportunities.filter(opp => opp.apy <= maxApy)
    }
    
    if (protocol) {
      opportunities = opportunities.filter(opp => 
        opp.protocol.toLowerCase().includes(protocol.toLowerCase())
      )
    }
    
    // Sort by APY descending
    opportunities.sort((a, b) => b.apy - a.apy)
    
    // Add additional metadata
    opportunities = opportunities.map(opp => ({
      ...opp,
      isRecommended: this.isRecommended(opp),
      liquidityScore: this.calculateLiquidityScore(opp.tvl),
      safetyRating: this.calculateSafetyRating(opp),
      estimatedReturns: this.calculateEstimatedReturns(opp),
      marketCondition: this.marketCondition,
      lastUpdated: this.lastUpdate
    }))
    
    return opportunities
  }

  isRecommended(opportunity) {
    // Recommend based on risk-adjusted returns and market conditions
    if (opportunity.riskLevel === 'high' && this.marketCondition === 'bear') return false
    if (opportunity.apy < 5) return false
    if (opportunity.tvl < 100000) return false
    if (opportunity.riskScore > 8) return false
    
    return opportunity.apy > 8 && opportunity.riskScore < 6
  }

  calculateLiquidityScore(tvl) {
    if (tvl > 10000000) return 10
    if (tvl > 5000000) return 8
    if (tvl > 2000000) return 6
    if (tvl > 1000000) return 4
    if (tvl > 500000) return 2
    return 1
  }

  calculateSafetyRating(opportunity) {
    let rating = 5 // Base rating
    
    // Adjust for risk level
    if (opportunity.riskLevel === 'low') rating += 3
    else if (opportunity.riskLevel === 'medium') rating += 1
    else if (opportunity.riskLevel === 'high') rating -= 2
    else if (opportunity.riskLevel === 'speculative') rating -= 4
    
    // Adjust for protocol audit score
    const protocol = this.protocols.find(p => p.name === opportunity.protocol)
    if (protocol) {
      rating += (protocol.auditScore - 7) * 0.5
    }
    
    // Adjust for TVL (higher TVL = safer)
    if (opportunity.tvl > 5000000) rating += 1
    else if (opportunity.tvl < 500000) rating -= 1
    
    // Adjust for impermanent loss risk
    if (opportunity.impermanentLossRisk) rating -= 1
    
    return Math.min(Math.max(Math.round(rating * 10) / 10, 1), 10)
  }

  calculateEstimatedReturns(opportunity) {
    const timeframes = [30, 90, 365] // days
    const apy = opportunity.apy / 100
    
    return timeframes.map(days => {
      const dailyRate = Math.pow(1 + apy, 1/365) - 1
      const totalReturn = Math.pow(1 + dailyRate, days) - 1
      
      return {
        timeframe: days,
        estimatedReturn: Math.round(totalReturn * 100 * 100) / 100,
        estimatedValue: Math.round(1000 * (1 + totalReturn) * 100) / 100 // Based on $1000 investment
      }
    })
  }

  async getLiquidityPools(options = {}) {
    const { activeOnly = true, sortBy = 'tvl' } = options
    
    let pools = [...this.liquidityPools]
    
    if (activeOnly) {
      pools = pools.filter(pool => pool.isActive)
    }
    
    pools.sort((a, b) => {
      switch (sortBy) {
        case 'apy':
          return b.apy - a.apy
        case 'tvl':
          return b.tvl - a.tvl
        case 'volume':
          return b.volume24h - a.volume24h
        case 'risk':
          return a.riskScore - b.riskScore
        default:
          return b.tvl - a.tvl
      }
    })
    
    return pools.map(pool => ({
      ...pool,
      utilization: Math.round((pool.volume24h / pool.tvl) * 100 * 100) / 100,
      priceImpact: this.calculatePriceImpact(pool),
      tradingFees: pool.fees24h
    }))
  }

  calculatePriceImpact(pool) {
    // Simplified price impact calculation
    const liquidity = pool.tvl
    const baseImpact = 1000000 / liquidity // Impact for $1000 trade
    
    return {
      small: Math.round(baseImpact * 0.1 * 10000) / 10000, // $100 trade
      medium: Math.round(baseImpact * 1 * 10000) / 10000,  // $1000 trade
      large: Math.round(baseImpact * 10 * 10000) / 10000   // $10000 trade
    }
  }

  async getYieldData(timeframe = '7d') {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 365
    const yieldHistory = []
    
    // Generate historical yield data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const dayVariation = Math.sin((Date.now() - i * 86400000) / 86400000) * 2
      
      yieldHistory.push({
        date: date.toISOString().split('T')[0],
        averageApy: Math.round((15 + dayVariation + Math.random() * 5) * 100) / 100,
        totalTvl: Math.round((80000000 + Math.random() * 20000000) * 100) / 100,
        activeOpportunities: 15 + Math.floor(Math.random() * 10),
        topPerformer: {
          protocol: this.protocols[Math.floor(Math.random() * this.protocols.length)].name,
          apy: Math.round((25 + Math.random() * 15) * 100) / 100
        }
      })
    }
    
    return {
      timeframe,
      data: yieldHistory,
      summary: {
        averageApy: yieldHistory.reduce((sum, d) => sum + d.averageApy, 0) / yieldHistory.length,
        maxApy: Math.max(...yieldHistory.map(d => d.averageApy)),
        minApy: Math.min(...yieldHistory.map(d => d.averageApy)),
        totalTvl: yieldHistory[yieldHistory.length - 1].totalTvl,
        trending: 'up' // Simplified trend
      }
    }
  }

  updateMarketCondition(condition) {
    this.marketCondition = condition
    this.lastUpdate = Date.now()
    
    // Recalculate APRs based on new market condition
    this.liquidityPools.forEach(pool => {
      pool.apr = this.calculateDynamicAPR(pool.apr / 1.1) // Reverse previous adjustment
      pool.apy = this.aprToApy(pool.apr)
    })
    
    this.farmingOpportunities.forEach(farm => {
      farm.apr = this.calculateDynamicAPR(farm.apr / 1.1)
      farm.apy = this.aprToApy(farm.apr)
    })
  }
}

function createDeFiMock() {
  const mock = new DeFiMock()
  
  // Update yields every 5 minutes
  setInterval(() => {
    // Small random adjustments to simulate real-time changes
    mock.liquidityPools.forEach(pool => {
      const variation = (Math.random() - 0.5) * 0.5 // ±0.25% change
      pool.apr = Math.max(1, pool.apr + variation)
      pool.apy = mock.aprToApy(pool.apr)
    })
    
    mock.farmingOpportunities.forEach(farm => {
      const variation = (Math.random() - 0.5) * 0.8 // ±0.4% change
      farm.apr = Math.max(1, farm.apr + variation)
      farm.apy = mock.aprToApy(farm.apr)
    })
    
    mock.lastUpdate = Date.now()
  }, 300000) // 5 minutes
  
  return mock
}

module.exports = { createDeFiMock }