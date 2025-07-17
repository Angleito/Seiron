/**
 * Comprehensive Sei Voice Integration Tests
 * 
 * Test suite for Sei MCP service integration with voice chat functionality.
 * Covers investment advisory features, blockchain mocking, and E2E voice flows.
 * 
 * @fileoverview E2E Voice Chat Testing for Sei Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { 
  SeiVoiceIntegration, 
  getSeiVoiceIntegration,
  processVoiceQuery,
  type VoiceIntent,
  type VoiceResponse,
  type IntentRecognition,
  type MarketContext,
  type VoicePortfolioSummary,
  type VoiceDeFiOpportunity
} from '../sei-integration'
import { mockSeiBlockchainData, createMockPortfolio, createMockMarketData, createMockDeFiOpportunities } from '../test-utils/sei-mocks'

// Performance monitoring
const performanceMetrics = {
  queryTimes: [] as number[],
  intentRecognitionTimes: [] as number[],
  dataFetchTimes: [] as number[]
}

// Mock orchestrator with realistic Sei data
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

describe('Sei Voice Integration - E2E Testing', () => {
  let integration: SeiVoiceIntegration
  let mockOrchestrator: any

  beforeAll(async () => {
    // Initialize mock blockchain data
    await mockSeiBlockchainData.initialize()
  })

  beforeEach(async () => {
    integration = new SeiVoiceIntegration()
    mockOrchestrator = vi.mocked(await import('../orchestrator-client')).getOrchestrator()
    
    // Setup realistic mock responses
    mockOrchestrator.getSeiTokenData.mockImplementation(async (symbol: string) => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
      return {
        _tag: 'Right',
        right: await createMockMarketData(symbol)
      }
    })

    mockOrchestrator.getSeiWalletAnalysis.mockImplementation(async (address: string) => {
      await new Promise(resolve => setTimeout(resolve, 150)) // Simulate network delay
      return {
        _tag: 'Right',
        right: await createMockPortfolio(address)
      }
    })

    mockOrchestrator.getSeiDeFiData.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate network delay
      return {
        _tag: 'Right',
        right: await createMockDeFiOpportunities()
      }
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    integration.clearCache()
  })

  afterAll(() => {
    // Log performance metrics
    console.log('Performance Metrics:', {
      avgQueryTime: performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / performanceMetrics.queryTimes.length,
      avgIntentTime: performanceMetrics.intentRecognitionTimes.reduce((a, b) => a + b, 0) / performanceMetrics.intentRecognitionTimes.length,
      avgDataFetchTime: performanceMetrics.dataFetchTimes.reduce((a, b) => a + b, 0) / performanceMetrics.dataFetchTimes.length
    })
  })

  describe('Investment Intent Detection - Voice Flows', () => {
    it('should detect investment advice intent from natural voice queries', async () => {
      const voiceQueries = [
        "Hey Seiron, what's my portfolio looking like today?",
        "Should I buy more SEI with the current market conditions?",
        "I'm thinking about investing in DeFi, what do you recommend?",
        "Is now a good time to enter the Sei ecosystem?",
        "What's your take on the current market sentiment?"
      ]

      for (const query of voiceQueries) {
        const startTime = Date.now()
        const intent = await integration.recognizeIntent(query)
        const endTime = Date.now()
        
        performanceMetrics.intentRecognitionTimes.push(endTime - startTime)

        expect(intent.intent).toMatch(/^(portfolio_inquiry|investment_advice|market_analysis|defi_opportunities)$/)
        expect(intent.confidence).toBeGreaterThan(0.7)
        expect(endTime - startTime).toBeLessThan(500) // Should be fast
      }
    })

    it('should extract investment entities from complex voice queries', async () => {
      const entityQueries = [
        { query: "What's the price of SEI and how does it compare to Bitcoin?", expectedEntities: ['sei', 'bitcoin'] },
        { query: "Should I swap my ETH for SEI tokens?", expectedEntities: ['eth', 'sei'] },
        { query: "Check the performance of my Cosmos and Sei holdings", expectedEntities: ['cosmos', 'sei'] }
      ]

      for (const { query, expectedEntities } of entityQueries) {
        const intent = await integration.recognizeIntent(query)
        
        expect(intent.entities).toBeDefined()
        expectedEntities.forEach(entity => {
          expect(intent.entities.symbols?.map(s => s.toLowerCase())).toContain(entity.toLowerCase())
        })
      }
    })

    it('should handle voice queries with investment context', async () => {
      const contextualQueries = [
        "I have $1000 to invest, what would you recommend on Sei?",
        "My portfolio is down 10%, should I DCA into SEI?",
        "I'm new to DeFi, can you explain liquidity farming on Sei?",
        "What are the risks of providing liquidity to SEI pools?"
      ]

      for (const query of contextualQueries) {
        const intent = await integration.recognizeIntent(query)
        
        expect(intent.confidence).toBeGreaterThan(0.6)
        expect(intent.requiresData).toBe(true)
        expect(['investment_advice', 'defi_opportunities', 'risk_assessment']).toContain(intent.intent)
      }
    })
  })

  describe('Portfolio Integration - Voice Responses', () => {
    const testWalletAddress = 'sei1testwalletaddress123456789abcdef'

    it('should provide voice-optimized portfolio summaries', async () => {
      const startTime = Date.now()
      const result = await integration.processVoiceQuery(
        "What's my portfolio performance?", 
        testWalletAddress
      )
      const endTime = Date.now()
      
      performanceMetrics.queryTimes.push(endTime - startTime)

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toContain('portfolio')
        expect(result.right.spokenText.length).toBeLessThan(500) // Voice-optimized length
        expect(result.right.confidence).toBeGreaterThan(0.8)
        expect(result.right.dataSourced).toBe(true)
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.followUpQuestions!.length).toBeGreaterThan(0)
      }

      expect(mockOrchestrator.getSeiWalletAnalysis).toHaveBeenCalledWith(testWalletAddress)
    })

    it('should handle portfolio queries with specific token mentions', async () => {
      const result = await integration.processVoiceQuery(
        "How are my SEI tokens performing?",
        testWalletAddress
      )

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText.toLowerCase()).toContain('sei')
        expect(result.right.actionable).toBe(true)
      }
    })

    it('should provide actionable portfolio advice', async () => {
      const result = await integration.processVoiceQuery(
        "My portfolio is down, what should I do?",
        testWalletAddress
      )

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.actionable).toBe(true)
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.spokenText).toMatch(/(recommend|suggest|consider|strategy)/i)
      }
    })

    it('should handle portfolio queries without wallet address gracefully', async () => {
      const result = await integration.processVoiceQuery("Show me my portfolio")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toContain('wallet address')
        expect(result.right.actionable).toBe(true)
        expect(result.right.dataSourced).toBe(false)
      }
    })
  })

  describe('Market Data Integration - Real-time Voice Responses', () => {
    it('should provide current market analysis in voice format', async () => {
      const result = await integration.processVoiceQuery("How's the SEI market today?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText.toLowerCase()).toContain('sei')
        expect(result.right.spokenText).toMatch(/(price|market|trading|bullish|bearish)/i)
        expect(result.right.dataSourced).toBe(true)
      }

      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledWith('SEI')
    })

    it('should handle multiple token price requests', async () => {
      const result = await integration.processVoiceQuery("What are the prices of SEI, Bitcoin, and Ethereum?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText.toLowerCase()).toContain('sei')
        expect(result.right.spokenText.toLowerCase()).toMatch(/(bitcoin|btc)/)
        expect(result.right.spokenText.toLowerCase()).toMatch(/(ethereum|eth)/)
      }
    })

    it('should provide market sentiment analysis', async () => {
      const result = await integration.processVoiceQuery("What's the market sentiment for SEI?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(sentiment|bullish|bearish|neutral|optimistic|pessimistic)/i)
        expect(result.right.confidence).toBeGreaterThan(0.7)
      }
    })
  })

  describe('DeFi Opportunity Voice Recommendations', () => {
    it('should provide DeFi opportunities with voice explanations', async () => {
      const result = await integration.processVoiceQuery("Show me DeFi opportunities on Sei")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText.toLowerCase()).toContain('defi')
        expect(result.right.spokenText).toMatch(/(yield|farming|staking|liquidity|pool)/i)
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.actionable).toBe(true)
      }

      expect(mockOrchestrator.getSeiDeFiData).toHaveBeenCalled()
    })

    it('should explain DeFi concepts in voice-friendly format', async () => {
      const result = await integration.processVoiceQuery("What is liquidity farming?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(liquidity|farming|pool|rewards|yield)/i)
        expect(result.right.spokenText.length).toBeLessThan(600) // Voice-optimized explanation
      }
    })

    it('should provide risk-aware DeFi recommendations', async () => {
      const result = await integration.processVoiceQuery("What are safe DeFi strategies for beginners?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(risk|safe|beginner|start|careful)/i)
        expect(result.right.followUpQuestions).toBeDefined()
        expect(['defi_opportunities', 'risk_assessment', 'investment_advice']).toContain(
          (await integration.recognizeIntent("What are safe DeFi strategies for beginners?")).intent
        )
      }
    })
  })

  describe('Risk Assessment - Voice Warnings', () => {
    it('should provide risk warnings in conversational voice', async () => {
      const riskQueries = [
        "Should I put all my money into SEI?",
        "Is it safe to farm with all my tokens?",
        "What about leveraged trading on Sei?"
      ]

      for (const query of riskQueries) {
        const result = await integration.processVoiceQuery(query)

        expect(result._tag).toBe('Right')
        if (result._tag === 'Right') {
          expect(result.right.spokenText).toMatch(/(risk|careful|caution|diversif|consider)/i)
          expect(result.right.actionable).toBe(true)
        }
      }
    })

    it('should assess portfolio risk with voice explanations', async () => {
      const result = await integration.processVoiceQuery(
        "Assess my portfolio risk",
        'sei1testwalletaddress123456789abcdef'
      )

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(risk|diversification|exposure|balance)/i)
        expect(result.right.dataSourced).toBe(true)
      }
    })

    it('should provide risk mitigation strategies', async () => {
      const result = await integration.processVoiceQuery("How can I reduce my investment risk?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(diversif|spread|dollar.*cost|dca|gradual)/i)
        expect(result.right.followUpQuestions).toBeDefined()
      }
    })
  })

  describe('Error Handling - Voice User Experience', () => {
    it('should handle blockchain service unavailability gracefully', async () => {
      mockOrchestrator.getSeiTokenData.mockResolvedValue({
        _tag: 'Left',
        left: 'Service temporarily unavailable'
      })

      const result = await integration.processVoiceQuery("What's the SEI price?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(sorry|unable|try.*again|temporary)/i)
        expect(result.right.actionable).toBe(true)
      }
    })

    it('should handle network errors with user-friendly voice messages', async () => {
      mockOrchestrator.getSeiWalletAnalysis.mockRejectedValue(new Error('Network timeout'))

      const result = await integration.processVoiceQuery(
        "Check my portfolio",
        'sei1testwalletaddress123456789abcdef'
      )

      expect(result._tag).toBe('Left')
      expect(result.left).toContain('Network timeout')
    })

    it('should handle invalid wallet addresses with helpful voice guidance', async () => {
      mockOrchestrator.getSeiWalletAnalysis.mockResolvedValue({
        _tag: 'Left',
        left: 'Invalid wallet address format'
      })

      const result = await integration.processVoiceQuery(
        "Show my portfolio",
        'invalid-address'
      )

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(address|format|valid|correct)/i)
        expect(result.right.actionable).toBe(true)
      }
    })
  })

  describe('Performance Testing - Voice Response Times', () => {
    it('should respond to simple queries within acceptable time limits', async () => {
      const queries = [
        "What's the SEI price?",
        "How's my portfolio?",
        "Show me DeFi yields"
      ]

      for (const query of queries) {
        const startTime = Date.now()
        await integration.processVoiceQuery(query)
        const endTime = Date.now()
        
        const responseTime = endTime - startTime
        performanceMetrics.queryTimes.push(responseTime)
        
        // Voice responses should be under 2 seconds for good UX
        expect(responseTime).toBeLessThan(2000)
      }
    })

    it('should handle concurrent voice queries efficiently', async () => {
      const queries = [
        "What's the SEI price?",
        "Check Bitcoin price",
        "Show Ethereum data",
        "What's the market trend?"
      ]

      const startTime = Date.now()
      const results = await Promise.all(
        queries.map(query => integration.processVoiceQuery(query))
      )
      const endTime = Date.now()

      results.forEach(result => {
        expect(result._tag).toBe('Right')
      })

      // Concurrent queries should complete reasonably fast
      expect(endTime - startTime).toBeLessThan(3000)
    })

    it('should maintain performance with complex blockchain data queries', async () => {
      const complexQuery = "Analyze my complete portfolio with risk assessment and DeFi recommendations"
      
      const startTime = Date.now()
      const result = await integration.processVoiceQuery(
        complexQuery,
        'sei1testwalletaddress123456789abcdef'
      )
      const endTime = Date.now()

      expect(result._tag).toBe('Right')
      expect(endTime - startTime).toBeLessThan(3000) // Complex queries under 3s
    })
  })

  describe('Voice Conversation Flow - Context Awareness', () => {
    it('should maintain context across related voice queries', async () => {
      // First query - establish context
      const firstResult = await integration.processVoiceQuery("What's my SEI balance?", 'sei1testwalletaddress123456789abcdef')
      expect(firstResult._tag).toBe('Right')

      // Follow-up query - should use context
      const followUpResult = await integration.processVoiceQuery("Should I buy more?")
      expect(followUpResult._tag).toBe('Right')
      
      if (followUpResult._tag === 'Right') {
        expect(followUpResult.right.spokenText.toLowerCase()).toContain('sei')
      }
    })

    it('should provide relevant follow-up questions for voice conversations', async () => {
      const result = await integration.processVoiceQuery("I want to start investing in DeFi")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.followUpQuestions!.length).toBeGreaterThan(0)
        
        // Follow-up questions should be DeFi-related
        const followUps = result.right.followUpQuestions!.join(' ').toLowerCase()
        expect(followUps).toMatch(/(yield|farm|stake|pool|protocol|risk)/i)
      }
    })

    it('should adapt recommendations based on user investment level', async () => {
      const beginnerQuery = "I'm new to crypto, where should I start?"
      const advancedQuery = "What are the best leveraged yield strategies?"

      const beginnerResult = await integration.processVoiceQuery(beginnerQuery)
      const advancedResult = await integration.processVoiceQuery(advancedQuery)

      expect(beginnerResult._tag).toBe('Right')
      expect(advancedResult._tag).toBe('Right')

      if (beginnerResult._tag === 'Right' && advancedResult._tag === 'Right') {
        // Beginner advice should be more cautious
        expect(beginnerResult.right.spokenText).toMatch(/(start.*small|careful|basic|simple)/i)
        
        // Advanced advice can be more complex
        expect(advancedResult.right.spokenText).toMatch(/(leverage|yield|strategy|advanced)/i)
      }
    })
  })

  describe('Voice Response Quality - Investment Advisory', () => {
    it('should provide accurate investment advice in conversational tone', async () => {
      const result = await integration.processVoiceQuery("Should I buy SEI now?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        // Should be conversational and helpful
        expect(result.right.spokenText).toMatch(/\b(I|you|your|consider|suggest|recommend)\b/i)
        expect(result.right.spokenText.length).toBeGreaterThan(50)
        expect(result.right.spokenText.length).toBeLessThan(400) // Voice-appropriate length
        expect(result.right.actionable).toBe(true)
      }
    })

    it('should include relevant disclaimers in voice advice', async () => {
      const result = await integration.processVoiceQuery("What should I invest in?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.spokenText).toMatch(/(not.*financial.*advice|own.*research|risk)/i)
      }
    })

    it('should provide balanced perspectives in investment discussions', async () => {
      const result = await integration.processVoiceQuery("Is DeFi profitable?")

      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        // Should mention both opportunities and risks
        expect(result.right.spokenText).toMatch(/(opportunity|potential|profit|gain)/i)
        expect(result.right.spokenText).toMatch(/(risk|loss|volatile|careful)/i)
      }
    })
  })

  describe('Cache Performance - Voice Query Optimization', () => {
    it('should cache frequently requested voice data', async () => {
      // First request
      await integration.processVoiceQuery("What's the SEI price?")
      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledTimes(1)

      // Second request should use cache
      await integration.processVoiceQuery("Tell me SEI's current price")
      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledTimes(1) // Should not increase
    })

    it('should invalidate cache appropriately for real-time data', async () => {
      // Mock time passage
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60 * 1000) // 5 minutes later
      
      await integration.processVoiceQuery("What's the SEI price?")
      await integration.processVoiceQuery("Check SEI price again")
      
      // Should fetch new data after cache expiry
      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledTimes(2)
      
      vi.restoreAllMocks()
    })

    it('should provide cache statistics for monitoring', () => {
      const stats = integration.getCacheStats()
      
      expect(typeof stats.size).toBe('number')
      expect(Array.isArray(stats.keys)).toBe(true)
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Voice Response Format Validation - Investment Advisory', () => {
  let integration: SeiVoiceIntegration

  beforeEach(() => {
    integration = new SeiVoiceIntegration()
  })

  afterEach(() => {
    integration.clearCache()
  })

  it('should format investment advice for optimal voice delivery', async () => {
    const result = await integration.processVoiceQuery("What's a good investment strategy?")
    
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      const response = result.right
      
      // Voice-optimized formatting
      expect(response.spokenText).not.toContain('\n') // No line breaks in speech
      expect(response.spokenText).not.toMatch(/^\s+|\s+$/) // No leading/trailing whitespace
      expect(response.spokenText.length).toBeLessThan(500) // Reasonable voice length
      expect(response.spokenText).toMatch(/^[A-Z]/) // Starts with capital
      expect(response.spokenText).toMatch(/[.!?]$/) // Ends with punctuation
      
      // Investment advisory requirements
      expect(response.confidence).toBeGreaterThan(0.5)
      expect(response.dataSourced).toBe(true)
      expect(response.actionable).toBe(true)
    }
  })

  it('should include appropriate follow-up questions for investment conversations', async () => {
    const investmentQueries = [
      "Should I diversify my crypto portfolio?",
      "What's the best way to enter DeFi?",
      "How much should I invest in SEI?"
    ]

    for (const query of investmentQueries) {
      const result = await integration.processVoiceQuery(query)
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.followUpQuestions).toBeDefined()
        expect(result.right.followUpQuestions!.length).toBeGreaterThan(0)
        expect(result.right.followUpQuestions!.length).toBeLessThan(5) // Not overwhelming
        
        // Follow-ups should be relevant to investment context
        const followUpText = result.right.followUpQuestions!.join(' ').toLowerCase()
        expect(followUpText).toMatch(/(invest|portfolio|risk|strategy|return|yield)/i)
      }
    }
  })

  it('should maintain consistent voice personality across responses', async () => {
    const queries = [
      "Hello, how are you?",
      "What's the market like?",
      "Should I invest in crypto?",
      "Thank you for the advice"
    ]

    const responses = []
    for (const query of queries) {
      const result = await integration.processVoiceQuery(query)
      if (result._tag === 'Right') {
        responses.push(result.right.spokenText)
      }
    }

    // Should maintain consistent helpful and professional tone
    responses.forEach(response => {
      expect(response).toMatch(/\b(I|you|your|help|assist|happy|glad)\b/i) // Conversational tone
      expect(response).not.toMatch(/\b(cannot|can't|won't|shouldn't)\b/i) // Avoid negative framing when possible
    })
  })

  it('should provide data-rich responses when blockchain data is available', async () => {
    const dataQueries = [
      "What's my portfolio performance?",
      "How's the SEI market?",
      "Show me DeFi opportunities"
    ]

    for (const query of dataQueries) {
      const result = await integration.processVoiceQuery(query, 'sei1testwalletaddress123456789abcdef')
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.dataSourced).toBe(true)
        expect(result.right.spokenText).toMatch(/\b(current|now|today|latest|real.*time)\b/i)
        // Should include specific data points
        expect(result.right.spokenText).toMatch(/\b(\d+\.?\d*|percent|%|\$|price|value|worth)\b/i)
      }
    }
  })
})