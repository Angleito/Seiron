/**
 * Sei Voice Integration Tests
 * 
 * Comprehensive test suite for the Sei voice integration layer,
 * covering intent recognition, data fetching, caching, and response generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  SeiVoiceIntegration, 
  getSeiVoiceIntegration,
  processVoiceQuery,
  type VoiceIntent,
  type VoiceResponse 
} from '../sei-integration'

// Mock the orchestrator client
vi.mock('../orchestrator-client', () => ({
  getOrchestrator: vi.fn(() => ({
    getSeiTokenData: vi.fn(),
    getSeiWalletAnalysis: vi.fn(),
    getSeiDeFiData: vi.fn(),
    getSeiNetworkData: vi.fn(),
    getCryptoMarketData: vi.fn()
  }))
}))

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('SeiVoiceIntegration', () => {
  let integration: SeiVoiceIntegration

  beforeEach(() => {
    integration = new SeiVoiceIntegration()
    vi.clearAllMocks()
  })

  afterEach(() => {
    integration.clearCache()
  })

  describe('Intent Recognition', () => {
    it('should recognize portfolio inquiry intent', async () => {
      const queries = [
        "What's my portfolio balance?",
        "Show me my holdings",
        "How is my portfolio performing?",
        "Check my current positions"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('portfolio_inquiry')
        expect(intent.confidence).toBeGreaterThan(0.7)
        expect(intent.requiresData).toBe(true)
      }
    })

    it('should recognize price check intent with entities', async () => {
      const queries = [
        "What's the current SEI price?",
        "How much is Bitcoin worth?",
        "Check the price of ETH"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('price_check')
        expect(intent.confidence).toBeGreaterThan(0.7)
        expect(intent.requiresData).toBe(true)
      }
    })

    it('should recognize market analysis intent', async () => {
      const queries = [
        "What's the market outlook?",
        "Analyze the current trend",
        "Is the market bullish?",
        "Give me a technical analysis"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('market_analysis')
        expect(intent.confidence).toBeGreaterThan(0.7)
      }
    })

    it('should recognize investment advice intent', async () => {
      const queries = [
        "Should I buy SEI now?",
        "What do you recommend?",
        "Is this a good time to invest?",
        "Give me some investment advice"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('investment_advice')
        expect(intent.confidence).toBeGreaterThan(0.7)
      }
    })

    it('should recognize DeFi opportunities intent', async () => {
      const queries = [
        "Show me DeFi yields",
        "What are the best farming opportunities?",
        "Find me liquidity pools",
        "Where can I stake my tokens?"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('defi_opportunities')
        expect(intent.confidence).toBeGreaterThan(0.7)
      }
    })

    it('should recognize transaction guidance intent', async () => {
      const queries = [
        "How do I send SEI?",
        "What are the gas fees?",
        "How to swap tokens?",
        "Guide me through a transaction"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('transaction_guidance')
        expect(intent.confidence).toBeGreaterThan(0.7)
        expect(intent.requiresData).toBe(false)
      }
    })

    it('should recognize Sei ecosystem intent', async () => {
      const queries = [
        "Tell me about Sei blockchain",
        "What makes Sei fast?",
        "Explain Sei's parallelization",
        "What dApps are on Sei?"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('sei_ecosystem')
        expect(intent.confidence).toBeGreaterThan(0.7)
      }
    })

    it('should recognize risk assessment intent', async () => {
      const queries = [
        "What are the risks?",
        "Is this investment safe?",
        "Assess my portfolio risk",
        "What about impermanent loss?"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('risk_assessment')
        expect(intent.confidence).toBeGreaterThan(0.7)
      }
    })

    it('should default to general chat for unrecognized queries', async () => {
      const queries = [
        "Hello there",
        "How are you?",
        "What's the weather?",
        "Random text that doesn't match any pattern"
      ]

      for (const query of queries) {
        const intent = await integration.recognizeIntent(query)
        expect(intent.intent).toBe('general_chat')
        expect(intent.confidence).toBeLessThan(0.5)
        expect(intent.requiresData).toBe(false)
      }
    })

    it('should extract entities from price check queries', async () => {
      const intent = await integration.recognizeIntent("What's the current SEI and Bitcoin price?")
      expect(intent.entities.symbols).toContain('sei')
    })

    it('should generate cache keys for data-requiring intents', async () => {
      const intent = await integration.recognizeIntent("What's my portfolio?")
      expect(intent.cacheKey).toBeDefined()
      expect(intent.cacheKey).toContain('portfolio_inquiry')
    })
  })

  describe('Market Context', () => {
    it('should fetch and cache market context', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiTokenData = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      const result = await integration.getMarketContext()
      expect(result._tag).toBe('Right')
      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledWith('SEI')
    })

    it('should return cached market context on subsequent calls', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiTokenData = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      // First call
      await integration.getMarketContext()
      
      // Second call should use cache
      await integration.getMarketContext()
      
      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledTimes(1)
    })

    it('should handle market context fetch errors', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiTokenData = vi.fn().mockResolvedValue({
        _tag: 'Left',
        left: 'Network error'
      })

      const result = await integration.getMarketContext()
      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Network error')
    })
  })

  describe('Portfolio Summary', () => {
    const testAddress = 'sei1test123'

    it('should fetch portfolio summary for valid address', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiWalletAnalysis = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      const result = await integration.getPortfolioSummary(testAddress)
      expect(result._tag).toBe('Right')
      expect(mockOrchestrator.getSeiWalletAnalysis).toHaveBeenCalledWith(testAddress)
    })

    it('should cache portfolio summary', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiWalletAnalysis = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      // First call
      await integration.getPortfolioSummary(testAddress)
      
      // Second call should use cache
      await integration.getPortfolioSummary(testAddress)
      
      expect(mockOrchestrator.getSeiWalletAnalysis).toHaveBeenCalledTimes(1)
    })

    it('should handle portfolio fetch errors', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiWalletAnalysis = vi.fn().mockResolvedValue({
        _tag: 'Left',
        left: 'Invalid address'
      })

      const result = await integration.getPortfolioSummary(testAddress)
      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Invalid address')
    })
  })

  describe('DeFi Opportunities', () => {
    it('should fetch and cache DeFi opportunities', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiDeFiData = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      const result = await integration.getDeFiOpportunities()
      expect(result._tag).toBe('Right')
      expect(mockOrchestrator.getSeiDeFiData).toHaveBeenCalled()
    })

    it('should return cached opportunities on subsequent calls', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiDeFiData = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      // First call
      await integration.getDeFiOpportunities()
      
      // Second call should use cache
      await integration.getDeFiOpportunities()
      
      expect(mockOrchestrator.getSeiDeFiData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Voice Query Processing', () => {
    it('should process portfolio inquiry with wallet address', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiWalletAnalysis = vi.fn().mockResolvedValue({
        _tag: 'Right',
        right: {
          insights: [],
          recommendations: [],
          metadata: { queryId: 'test', creditsUsed: 1, timestamp: Date.now() }
        }
      })

      const result = await integration.processVoiceQuery(
        "What's my portfolio balance?", 
        'sei1test123'
      )
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toContain('portfolio')
        expect(result.right.confidence).toBeGreaterThan(0.8)
        expect(result.right.dataSourced).toBe(true)
      }
    })

    it('should process portfolio inquiry without wallet address', async () => {
      const result = await integration.processVoiceQuery("What's my portfolio balance?")
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toContain('wallet address')
        expect(result.right.actionable).toBe(true)
        expect(result.right.dataSourceed).toBe(false)
      }
    })

    it('should process general chat queries', async () => {
      const result = await integration.processVoiceQuery("Hello, how are you?")
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toContain('Seiron')
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.followUpQuestions!.length).toBeGreaterThan(0)
      }
    })

    it('should handle processing errors gracefully', async () => {
      const mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
      mockOrchestrator.getSeiTokenData = vi.fn().mockRejectedValue(new Error('Network failure'))

      const result = await integration.processVoiceQuery("What's the SEI price?")
      expect(result._tag).toBe('Left')
    })
  })

  describe('Cache Management', () => {
    it('should clear cache correctly', () => {
      integration.clearCache()
      const stats = integration.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })

    it('should provide cache statistics', async () => {
      // Add some data to cache
      await integration.getMarketContext()
      
      const stats = integration.getCacheStats()
      expect(typeof stats.size).toBe('number')
      expect(Array.isArray(stats.keys)).toBe(true)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getSeiVoiceIntegration()
      const instance2 = getSeiVoiceIntegration()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Helper Functions', () => {
    it('should process voice query via helper function', async () => {
      const result = await processVoiceQuery("Hello")
      expect(result._tag).toBe('Right')
    })
  })
})

describe('Voice Response Format Validation', () => {
  let integration: SeiVoiceIntegration

  beforeEach(() => {
    integration = new SeiVoiceIntegration()
  })

  afterEach(() => {
    integration.clearCache()
  })

  it('should return properly formatted voice responses', async () => {
    const result = await integration.processVoiceQuery("Hello")
    
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      const response = result.right
      
      // Validate required fields
      expect(typeof response.spokenText).toBe('string')
      expect(response.spokenText.length).toBeGreaterThan(0)
      expect(typeof response.confidence).toBe('number')
      expect(response.confidence).toBeGreaterThanOrEqual(0)
      expect(response.confidence).toBeLessThanOrEqual(1)
      expect(typeof response.dataSourced).toBe('boolean')
      
      // Validate optional fields
      if (response.followUpQuestions) {
        expect(Array.isArray(response.followUpQuestions)).toBe(true)
        response.followUpQuestions.forEach(question => {
          expect(typeof question).toBe('string')
        })
      }
      
      if (response.actionable !== undefined) {
        expect(typeof response.actionable).toBe('boolean')
      }
    }
  })

  it('should include follow-up questions when appropriate', async () => {
    const queries = [
      "What's my portfolio?",
      "Should I invest?",
      "Show me DeFi opportunities"
    ]

    for (const query of queries) {
      const result = await integration.processVoiceQuery(query)
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.followUpQuestions!.length).toBeGreaterThan(0)
      }
    }
  })

  it('should mark responses as actionable when appropriate', async () => {
    const result = await integration.processVoiceQuery("Should I buy SEI?")
    
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      expect(result.right.actionable).toBe(true)
    }
  })
})