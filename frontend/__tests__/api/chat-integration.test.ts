/**
 * Chat API Integration Tests
 * Tests the new unified chat API with fallback routing
 */

import { apiClient } from '@/utils/apiClient'
import { processChat, processChatStream } from '@/services/chat.service'
import { ChatStreamService } from '@/components/chat/ChatStreamService'
import { apiErrorHandler } from '@/utils/apiErrorHandler'

// Mock fetch for testing
global.fetch = jest.fn()
global.EventSource = jest.fn()

describe('Chat API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiErrorHandler.reset()
  })

  describe('apiClient', () => {
    it('should prefer Next.js API routes for /api/ endpoints', async () => {
      const mockResponse = { message: 'Hello', agentType: 'assistant' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await apiClient.post('/api/chat', {
        message: 'Test',
        sessionId: 'test-session'
      })

      expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      }))
      expect(result).toEqual(mockResponse)
    })

    it('should fallback to /api/chat/orchestrate on failure', async () => {
      // First call fails
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      // Fallback succeeds
      const mockResponse = { message: 'Fallback response', agentType: 'assistant' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await apiClient.post('/api/chat', {
        message: 'Test',
        sessionId: 'test-session'
      })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/chat/orchestrate', expect.any(Object))
      expect(result).toEqual(mockResponse)
    })

    it('should handle streaming requests', async () => {
      const mockEventSource = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      const onMessage = jest.fn()
      const eventSource = await apiClient.stream('/api/chat?stream=true', {}, onMessage)

      expect(EventSource).toHaveBeenCalledWith('/api/chat?stream=true')
      expect(eventSource).toBe(mockEventSource)
    })
  })

  describe('chat.service', () => {
    it('should process chat messages with new endpoint', async () => {
      const mockResponse = {
        message: 'Test response',
        timestamp: new Date().toISOString(),
        agentType: 'assistant',
        metadata: { intent: 'general', action: 'chat' }
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await processChat('Hello', 'session-123', 'wallet-abc')

      expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          sessionId: 'session-123',
          walletAddress: 'wallet-abc',
          metadata: {
            timestamp: expect.any(String),
            source: 'web'
          }
        })
      }))
      expect(result).toEqual(mockResponse)
    })

    it('should handle streaming chat', async () => {
      const mockEventSource = {
        onmessage: null,
        onerror: null,
        close: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      const onMessage = jest.fn()
      const onError = jest.fn()
      
      const eventSource = await processChatStream(
        'Hello',
        'session-123',
        'wallet-abc',
        onMessage,
        onError
      )

      expect(EventSource).toHaveBeenCalledWith('/api/chat?stream=true')
      expect(eventSource).toBe(mockEventSource)
    })

    it('should provide detailed error messages', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('404'))

      await expect(processChat('Test', 'session-123')).rejects.toThrow(
        'Chat service is not available. Please try again later.'
      )
    })
  })

  describe('ChatStreamService', () => {
    it('should use new /api/chat endpoint', async () => {
      const mockResponse = {
        message: 'Response',
        agentType: 'assistant',
        timestamp: new Date().toISOString()
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      })

      const service = new ChatStreamService({
        apiEndpoint: '/api',
        wsEndpoint: 'ws://localhost',
        sessionId: 'test-session'
      })

      // Trigger internal send message
      await service.sendMessage('Test message')

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session'
        })
      }))

      service.destroy()
    })

    it('should support streaming messages', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"thinking","content":"Processing...","timestamp":"2024-01-01T00:00:00Z"}\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"response","content":"Hello!","timestamp":"2024-01-01T00:00:01Z"}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      })

      const service = new ChatStreamService({
        apiEndpoint: '/api',
        wsEndpoint: 'ws://localhost',
        sessionId: 'test-session'
      })

      const messages: any[] = []
      const stream = await service.sendStreamingMessage('Test', {})
      
      stream.subscribe(result => {
        if (result._tag === 'Right') {
          messages.push(result.right)
        }
      })

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(messages).toHaveLength(3) // thinking, response, complete
      expect(messages[0]).toEqual({ type: 'thinking', content: 'Processing...', timestamp: '2024-01-01T00:00:00Z' })
      expect(messages[1]).toEqual({ type: 'response', content: 'Hello!', timestamp: '2024-01-01T00:00:01Z' })
      expect(messages[2]).toEqual({ type: 'complete' })

      service.destroy()
    })
  })

  describe('Error Handling', () => {
    it('should track errors and provide statistics', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
        
        try {
          await apiClient.get('/api/chat/test')
        } catch (error) {
          // Expected
        }
      }

      const stats = apiErrorHandler.getErrorStats()
      expect(stats.totalErrors).toBe(5)
      expect(stats.errorsByEndpoint.get('GET:/api/chat/test')).toBe(5)
      expect(stats.mostFailedEndpoint).toBe('GET:/api/chat/test')
    })

    it('should determine retryable errors correctly', async () => {
      // Network error - retryable
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fetch failed'))
      
      try {
        await apiClient.get('/api/test')
      } catch (error: any) {
        expect(error.retryable).toBe(true)
      }

      // 404 error - not retryable
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' })
      })
      
      try {
        await apiClient.get('/api/test')
      } catch (error: any) {
        expect(error.retryable).toBe(false)
      }
    })

    it('should provide user-friendly error messages', () => {
      const networkError = { status: 0 } as any
      expect(apiErrorHandler.getUserMessage(networkError)).toContain('internet connection')

      const authError = { status: 401 } as any
      expect(apiErrorHandler.getUserMessage(authError)).toContain('session has expired')

      const serverError = { status: 500 } as any
      expect(apiErrorHandler.getUserMessage(serverError)).toContain('server encountered an error')
    })
  })
})

describe('Integration Scenarios', () => {
  it('should handle complete chat flow with MCP data', async () => {
    // Mock successful response with MCP data
    const mockResponse = {
      message: 'Based on current market data: SEI is trading at $0.50',
      timestamp: new Date().toISOString(),
      agentType: 'market_agent',
      metadata: {
        intent: 'market',
        action: 'query',
        confidence: 0.9,
        mcpData: {
          hive: {
            results: [{
              summary: 'SEI is trading at $0.50'
            }]
          }
        }
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const result = await processChat('What is the price of SEI?', 'session-123')
    
    expect(result.agentType).toBe('market_agent')
    expect(result.metadata?.mcpData).toBeDefined()
    expect(result.metadata?.mcpData.hive).toBeDefined()
  })

  it('should fallback gracefully when backend is unavailable', async () => {
    // First call to backend fails
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))
    
    // Fallback to Next.js API succeeds
    const fallbackResponse = {
      message: 'I can help you with market data, portfolio management, and blockchain transactions.',
      timestamp: new Date().toISOString(),
      agentType: 'assistant_agent',
      metadata: {
        intent: 'general',
        action: 'chat',
        confidence: 0.7
      }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => fallbackResponse
    })

    const result = await processChat('Hello', 'session-123')
    
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual(fallbackResponse)
  })
})