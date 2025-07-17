/**
 * Sei Blockchain Mock Server
 * 
 * Express server providing mock Sei blockchain APIs for testing.
 * Simulates realistic blockchain behavior with time-series data,
 * portfolio management, and DeFi opportunities.
 * 
 * @fileoverview Mock Sei blockchain API server
 */

const express = require('express')
const cors = require('cors')
const { createPortfolioMock } = require('./portfolio-mock')
const { createMarketMock } = require('./market-mock')
const { createDeFiMock } = require('./defi-mock')

const app = express()
const PORT = process.env.SEI_MOCK_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Initialize mock services
const portfolioMock = createPortfolioMock()
const marketMock = createMarketMock()
const defiMock = createDeFiMock()

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    services: {
      portfolio: 'active',
      market: 'active',
      defi: 'active'
    },
    version: '1.0.0'
  })
})

// Portfolio endpoints
app.get('/api/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params
    const { includeHistory, includeAnalysis } = req.query
    
    if (!address || !address.startsWith('sei1')) {
      return res.status(400).json({
        error: 'Invalid Sei address format',
        details: 'Address must start with sei1'
      })
    }

    const portfolio = await portfolioMock.getPortfolio(address, {
      includeHistory: includeHistory === 'true',
      includeAnalysis: includeAnalysis === 'true'
    })

    res.json({
      success: true,
      data: portfolio,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Portfolio error:', error)
    res.status(500).json({
      error: 'Failed to fetch portfolio',
      details: error.message
    })
  }
})

app.get('/api/portfolio/:address/balance/:token', async (req, res) => {
  try {
    const { address, token } = req.params
    
    const balance = await portfolioMock.getTokenBalance(address, token.toUpperCase())
    
    res.json({
      success: true,
      data: balance,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch token balance',
      details: error.message
    })
  }
})

app.get('/api/portfolio/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params
    const { limit = 50, offset = 0, type } = req.query
    
    const transactions = await portfolioMock.getTransactionHistory(address, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type
    })
    
    res.json({
      success: true,
      data: transactions,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message
    })
  }
})

// Market data endpoints
app.get('/api/market/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const { interval = '1h', limit = 24 } = req.query
    
    const priceData = await marketMock.getPriceData(symbol.toUpperCase(), {
      interval,
      limit: parseInt(limit)
    })
    
    res.json({
      success: true,
      data: priceData,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch price data',
      details: error.message
    })
  }
})

app.get('/api/market/overview', async (req, res) => {
  try {
    const overview = await marketMock.getMarketOverview()
    
    res.json({
      success: true,
      data: overview,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch market overview',
      details: error.message
    })
  }
})

app.get('/api/market/sentiment/:symbol?', async (req, res) => {
  try {
    const { symbol = 'SEI' } = req.params
    
    const sentiment = await marketMock.getSentimentData(symbol.toUpperCase())
    
    res.json({
      success: true,
      data: sentiment,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch sentiment data',
      details: error.message
    })
  }
})

// DeFi endpoints
app.get('/api/defi/opportunities', async (req, res) => {
  try {
    const { riskLevel, minApy, maxApy, protocol } = req.query
    
    const opportunities = await defiMock.getOpportunities({
      riskLevel,
      minApy: minApy ? parseFloat(minApy) : undefined,
      maxApy: maxApy ? parseFloat(maxApy) : undefined,
      protocol
    })
    
    res.json({
      success: true,
      data: opportunities,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch DeFi opportunities',
      details: error.message
    })
  }
})

app.get('/api/defi/pools', async (req, res) => {
  try {
    const { active = true, sortBy = 'tvl' } = req.query
    
    const pools = await defiMock.getLiquidityPools({
      activeOnly: active === 'true',
      sortBy
    })
    
    res.json({
      success: true,
      data: pools,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch liquidity pools',
      details: error.message
    })
  }
})

app.get('/api/defi/yields', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query
    
    const yields = await defiMock.getYieldData(timeframe)
    
    res.json({
      success: true,
      data: yields,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch yield data',
      details: error.message
    })
  }
})

// Staking endpoints
app.get('/api/staking/validators', async (req, res) => {
  try {
    const { active = true, sortBy = 'commission' } = req.query
    
    const validators = await portfolioMock.getValidators({
      activeOnly: active === 'true',
      sortBy
    })
    
    res.json({
      success: true,
      data: validators,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch validators',
      details: error.message
    })
  }
})

app.get('/api/staking/rewards/:address', async (req, res) => {
  try {
    const { address } = req.params
    const { timeframe = '30d' } = req.query
    
    const rewards = await portfolioMock.getStakingRewards(address, timeframe)
    
    res.json({
      success: true,
      data: rewards,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch staking rewards',
      details: error.message
    })
  }
})

// Network information endpoints
app.get('/api/network/status', async (req, res) => {
  try {
    const status = await marketMock.getNetworkStatus()
    
    res.json({
      success: true,
      data: status,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch network status',
      details: error.message
    })
  }
})

app.get('/api/network/stats', async (req, res) => {
  try {
    const stats = await marketMock.getNetworkStats()
    
    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch network stats',
      details: error.message
    })
  }
})

// Transaction simulation endpoints
app.post('/api/simulate/swap', async (req, res) => {
  try {
    const { fromToken, toToken, amount, slippage = 0.5 } = req.body
    
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['fromToken', 'toToken', 'amount']
      })
    }
    
    const simulation = await marketMock.simulateSwap({
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      amount: parseFloat(amount),
      slippage: parseFloat(slippage)
    })
    
    res.json({
      success: true,
      data: simulation,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to simulate swap',
      details: error.message
    })
  }
})

app.post('/api/simulate/stake', async (req, res) => {
  try {
    const { amount, validator, duration = 21 } = req.body
    
    if (!amount || !validator) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['amount', 'validator']
      })
    }
    
    const simulation = await portfolioMock.simulateStaking({
      amount: parseFloat(amount),
      validator,
      duration: parseInt(duration)
    })
    
    res.json({
      success: true,
      data: simulation,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to simulate staking',
      details: error.message
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'GET /api/portfolio/:address',
      'GET /api/market/price/:symbol',
      'GET /api/market/overview',
      'GET /api/defi/opportunities',
      'GET /api/staking/validators',
      'GET /api/network/status',
      'POST /api/simulate/swap',
      'POST /api/simulate/stake'
    ]
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sei Mock Server running on port ${PORT}`)
  console.log(`📊 Market condition: ${marketMock.getCurrentCondition()}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`📈 Market overview: http://localhost:${PORT}/api/market/overview`)
})

module.exports = app