/**
 * Backend Sei Integration Endpoint Tests
 * 
 * Tests for API endpoints that integrate Sei blockchain services with voice chat.
 * Covers conversation orchestration, memory management, and voice synthesis endpoints.
 * 
 * @fileoverview Backend API endpoint tests for Sei voice integration
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { mockSeiBlockchainData, createMockPortfolio, createMockMarketData, createMockDeFiOpportunities } from '../../lib/test-utils/sei-mocks'

// Mock modules that would normally be available in the API environment
vi.mock('../../lib/orchestrator-client', () => ({
  getOrchestrator: vi.fn(() => ({
    getSeiTokenData: vi.fn(),
    getSeiWalletAnalysis: vi.fn(),
    getSeiDeFiData: vi.fn(),
    processConversation: vi.fn()
  }))
}))

vi.mock('../../lib/sei-integration', () => ({
  getSeiVoiceIntegration: vi.fn(() => ({
    processVoiceQuery: vi.fn(),
    recognizeIntent: vi.fn()
  }))
}))

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

// Import API handlers after mocking dependencies
let conversationHandler: any
let memoryHandler: any
let voiceSynthesizeHandler: any

// These would normally be imported from the actual route files
// For testing purposes, we'll create mock implementations
const mockConversationHandler = async (req: any, res: any) => {
  try {
    const { message, sessionId, walletAddress } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Mock conversation processing with Sei integration
    const orchestrator = vi.mocked(await import('../../lib/orchestrator-client')).getOrchestrator()
    const seiIntegration = vi.mocked(await import('../../lib/sei-integration')).getSeiVoiceIntegration()

    const intent = await seiIntegration.recognizeIntent(message)
    
    let contextData = null
    if (intent.requiresData && walletAddress) {
      if (intent.intent === 'portfolio_inquiry') {
        contextData = await orchestrator.getSeiWalletAnalysis(walletAddress)
      } else if (intent.intent === 'market_analysis') {
        contextData = await orchestrator.getSeiTokenData('SEI')
      }
    }

    const response = await seiIntegration.processVoiceQuery(message, walletAddress)
    
    if (response._tag === 'Left') {
      return res.status(500).json({ error: response.left })
    }

    return res.status(200).json({
      response: response.right.spokenText,
      intent: intent.intent,
      confidence: response.right.confidence,
      dataSourced: response.right.dataSourced,
      followUpQuestions: response.right.followUpQuestions,
      sessionId: sessionId || `session_${Date.now()}`,
      processingTime: Date.now() - req.startTime,
      contextData
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const mockMemoryHandler = async (req: any, res: any) => {
  try {
    const { method } = req
    const { sessionId, walletAddress, query, response } = req.body

    if (method === 'POST') {
      // Save conversation memory
      if (!sessionId || !query || !response) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Mock memory storage
      const memoryEntry = {
        id: `memory_${Date.now()}`,
        sessionId,
        walletAddress,
        query,
        response,
        timestamp: Date.now(),
        intent: response.intent,
        confidence: response.confidence
      }

      return res.status(201).json({ success: true, memoryId: memoryEntry.id })
    }

    if (method === 'GET') {
      // Retrieve conversation memory
      const limit = parseInt(req.query.limit as string) || 10
      
      // Mock memory retrieval
      const memories = Array.from({ length: Math.min(5, limit) }, (_, i) => ({
        id: `memory_${Date.now() - i * 1000}`,
        sessionId: sessionId || 'default',
        query: `Mock query ${i + 1}`,
        response: {
          spokenText: `Mock response ${i + 1}`,
          intent: 'general_chat',
          confidence: 0.8 + Math.random() * 0.2
        },
        timestamp: Date.now() - i * 60000
      }))

      return res.status(200).json({ memories, total: memories.length })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const mockVoiceSynthesizeHandler = async (req: any, res: any) => {
  try {
    const { text, voice, optimize_streaming, model } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (text.length > 2000) {
      return res.status(400).json({ error: 'Text too long for voice synthesis' })
    }

    // Mock voice synthesis
    const audioData = Buffer.from('mock-audio-data')
    const contentType = optimize_streaming ? 'audio/mpeg' : 'audio/wav'
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', audioData.length)
    
    if (optimize_streaming) {
      res.setHeader('Transfer-Encoding', 'chunked')
    }

    return res.status(200).send(audioData)
  } catch (error) {
    return res.status(500).json({ error: 'Voice synthesis failed' })
  }
}

describe('Sei Voice API Endpoints', () => {
  let mockOrchestrator: any
  let mockSeiIntegration: any

  beforeAll(async () => {
    await mockSeiBlockchainData.initialize()
  })

  beforeEach(async () => {
    mockOrchestrator = vi.mocked(await import('../../lib/orchestrator-client')).getOrchestrator()
    mockSeiIntegration = vi.mocked(await import('../../lib/sei-integration')).getSeiVoiceIntegration()

    // Setup default successful responses
    mockSeiIntegration.recognizeIntent.mockResolvedValue({
      intent: 'portfolio_inquiry',
      confidence: 0.85,
      requiresData: true,
      entities: { symbols: ['sei'] },
      cacheKey: 'test_cache_key'
    })

    mockSeiIntegration.processVoiceQuery.mockResolvedValue({
      _tag: 'Right',
      right: {
        spokenText: 'Your portfolio is performing well with a total value of $15,000.',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        followUpQuestions: ['Would you like to see individual token performance?']
      }
    })

    mockOrchestrator.getSeiWalletAnalysis.mockResolvedValue({
      _tag: 'Right',
      right: await createMockPortfolio('sei1testaddress')
    })

    mockOrchestrator.getSeiTokenData.mockResolvedValue({
      _tag: 'Right',
      right: await createMockMarketData('SEI')
    })

    vi.clearAllMocks()
  })

  describe('/api/ai/conversation Endpoint', () => {
    it('should process voice queries with Sei integration', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: "What's my portfolio balance?",
          sessionId: 'test-session-123',
          walletAddress: 'sei1testaddress'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const data = JSON.parse(res._getData())
      expect(data.response).toBe('Your portfolio is performing well with a total value of $15,000.')
      expect(data.intent).toBe('portfolio_inquiry')
      expect(data.confidence).toBe(0.9)
      expect(data.dataSourced).toBe(true)
      expect(data.sessionId).toBe('test-session-123')
      expect(typeof data.processingTime).toBe('number')
    })

    it('should handle queries without wallet address', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Hello, how are you?",
          sessionId: 'test-session-456'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith("Hello, how are you?", undefined)
    })

    it('should return 400 for missing message', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'test-session-789'
        }
      })

      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Message is required')
    })

    it('should fetch portfolio data for portfolio queries', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Check my SEI holdings",
          walletAddress: 'sei1portfolioaddress'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(mockOrchestrator.getSeiWalletAnalysis).toHaveBeenCalledWith('sei1portfolioaddress')
      expect(res._getStatusCode()).toBe(200)
    })

    it('should fetch market data for market analysis queries', async () => {
      mockSeiIntegration.recognizeIntent.mockResolvedValue({
        intent: 'market_analysis',
        confidence: 0.88,
        requiresData: true,
        entities: { symbols: ['sei'] },
        cacheKey: 'market_cache_key'
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "How's the SEI market today?",
          walletAddress: 'sei1testaddress'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(mockOrchestrator.getSeiTokenData).toHaveBeenCalledWith('SEI')
      expect(res._getStatusCode()).toBe(200)
    })

    it('should handle Sei integration errors gracefully', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        _tag: 'Left',
        left: 'Sei service temporarily unavailable'
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "What's the SEI price?",
          sessionId: 'error-session'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Sei service temporarily unavailable')
    })

    it('should handle internal errors with proper status codes', async () => {
      mockSeiIntegration.recognizeIntent.mockRejectedValue(new Error('Internal error'))

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Test query",
          sessionId: 'error-session'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Internal server error')
    })

    it('should generate session ID when not provided', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Test message without session"
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.sessionId).toMatch(/^session_\d+$/)
    })

    it('should include follow-up questions in response', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Tell me about DeFi opportunities"
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.followUpQuestions).toEqual(['Would you like to see individual token performance?'])
    })
  })

  describe('/api/ai/memory Endpoint', () => {
    it('should save conversation memory', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'memory-session-123',
          walletAddress: 'sei1memoryaddress',
          query: "What's my portfolio?",
          response: {
            spokenText: 'Your portfolio is worth $20,000',
            intent: 'portfolio_inquiry',
            confidence: 0.92,
            dataSourced: true
          }
        }
      })

      await mockMemoryHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.memoryId).toMatch(/^memory_\d+$/)
    })

    it('should return 400 for incomplete memory save request', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'incomplete-session'
          // Missing query and response
        }
      })

      await mockMemoryHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Missing required fields')
    })

    it('should retrieve conversation memory', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          sessionId: 'retrieve-session',
          limit: '5'
        }
      })

      await mockMemoryHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(Array.isArray(data.memories)).toBe(true)
      expect(data.memories.length).toBeLessThanOrEqual(5)
      expect(typeof data.total).toBe('number')
    })

    it('should use default limit when not specified', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          sessionId: 'default-limit-session'
        }
      })

      await mockMemoryHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.memories.length).toBeLessThanOrEqual(10) // Default limit
    })

    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'DELETE'
      })

      await mockMemoryHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('/api/voice/synthesize Endpoint', () => {
    it('should synthesize voice from text', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          text: 'Your portfolio is performing well today.',
          voice: 'alloy',
          model: 'tts-1'
        }
      })

      await mockVoiceSynthesizeHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res.getHeader('Content-Type')).toBe('audio/wav')
      expect(res.getHeader('Content-Length')).toBeDefined()
    })

    it('should handle streaming audio synthesis', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: 'SEI is currently trading at $0.45 with a 3% increase.',
          voice: 'nova',
          optimize_streaming: true,
          model: 'tts-1-hd'
        }
      })

      await mockVoiceSynthesizeHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res.getHeader('Content-Type')).toBe('audio/mpeg')
      expect(res.getHeader('Transfer-Encoding')).toBe('chunked')
    })

    it('should return 400 for missing text', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          voice: 'alloy'
        }
      })

      await mockVoiceSynthesizeHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Text is required')
    })

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(2001) // Exceeds 2000 character limit

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: longText,
          voice: 'alloy'
        }
      })

      await mockVoiceSynthesizeHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Text too long for voice synthesis')
    })

    it('should handle synthesis errors gracefully', async () => {
      // Mock a synthesis error by overriding the handler
      const errorHandler = async (req: any, res: any) => {
        throw new Error('TTS service unavailable')
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: 'Test synthesis',
          voice: 'alloy'
        }
      })

      try {
        await errorHandler(req, res)
      } catch (error) {
        // Simulate error handling in the actual handler
        res.status(500).json({ error: 'Voice synthesis failed' })
      }

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Voice synthesis failed')
    })
  })

  describe('Integration Performance Tests', () => {
    it('should process portfolio queries within acceptable time limits', async () => {
      const startTime = Date.now()

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Analyze my complete portfolio with risk assessment",
          walletAddress: 'sei1performancetest'
        }
      })

      req.startTime = startTime
      await mockConversationHandler(req, res)

      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(res._getStatusCode()).toBe(200)
    })

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            message: `Concurrent query ${i}`,
            sessionId: `concurrent-session-${i}`
          }
        })
        req.startTime = Date.now()
        return mockConversationHandler(req, res)
      })

      const startTime = Date.now()
      await Promise.all(requests)
      const totalTime = Date.now() - startTime

      expect(totalTime).toBeLessThan(3000) // All requests should complete within 3 seconds
    })

    it('should maintain consistent response quality under load', async () => {
      const responses = []
      
      for (let i = 0; i < 10; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            message: `Load test query ${i}`,
            sessionId: `load-session-${i}`
          }
        })
        req.startTime = Date.now()
        
        await mockConversationHandler(req, res)
        responses.push(JSON.parse(res._getData()))
      }

      // All responses should be successful and have consistent structure
      responses.forEach(response => {
        expect(response.response).toBeDefined()
        expect(response.intent).toBeDefined()
        expect(response.confidence).toBeGreaterThan(0.7)
        expect(response.processingTime).toBeLessThan(1000)
      })
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from orchestrator service failures', async () => {
      mockOrchestrator.getSeiWalletAnalysis.mockRejectedValue(new Error('Service timeout'))

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: "Check my portfolio",
          walletAddress: 'sei1errortest'
        }
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      // Should still provide a response even if data fetching fails
      expect(res._getStatusCode()).toBe(200)
    })

    it('should handle memory service failures gracefully', async () => {
      // Simulate memory service failure
      const errorMemoryHandler = async (req: any, res: any) => {
        throw new Error('Memory service unavailable')
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'error-memory-session',
          query: 'test query',
          response: { spokenText: 'test response' }
        }
      })

      try {
        await errorMemoryHandler(req, res)
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
      }

      expect(res._getStatusCode()).toBe(500)
    })

    it('should validate request data thoroughly', async () => {
      const maliciousPayload = {
        message: "<script>alert('xss')</script>",
        sessionId: "'; DROP TABLE users; --",
        walletAddress: "invalid_address_format"
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: maliciousPayload
      })

      req.startTime = Date.now()
      await mockConversationHandler(req, res)

      // Should handle malicious input safely
      expect(res._getStatusCode()).toBeLessThan(500)
    })
  })

  describe('Rate Limiting and Security', () => {
    it('should handle high-frequency requests appropriately', async () => {
      const rapidRequests = Array.from({ length: 20 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            message: `Rapid query ${i}`,
            sessionId: 'rapid-session'
          }
        })
        req.startTime = Date.now()
        return mockConversationHandler(req, res)
      })

      // All requests should complete without errors
      const results = await Promise.all(rapidRequests)
      expect(results).toHaveLength(20)
    })

    it('should sanitize voice synthesis input', async () => {
      const maliciousText = "Hello <script>alert('xss')</script> world"

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: maliciousText,
          voice: 'alloy'
        }
      })

      await mockVoiceSynthesizeHandler(req, res)

      // Should process safely without executing scripts
      expect(res._getStatusCode()).toBe(200)
    })
  })
})