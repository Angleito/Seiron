/**
 * Sei Voice Integration Hook Tests
 * 
 * Comprehensive testing for the useSeiVoiceIntegration React hook.
 * Covers real-time voice interactions, state management, and blockchain integration.
 * 
 * @fileoverview React hook testing for Sei voice integration
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSeiVoiceIntegration, type SeiVoiceConfig } from '../voice/useSeiVoiceIntegration'
import { mockSeiBlockchainData, createMockPortfolio, createMockMarketData, createMockDeFiOpportunities } from '../../lib/test-utils/sei-mocks'

// Mock the integration module
vi.mock('../../lib/sei-integration', () => ({
  getSeiVoiceIntegration: vi.fn(() => ({
    recognizeIntent: vi.fn(),
    processVoiceQuery: vi.fn(),
    getMarketContext: vi.fn(),
    getPortfolioSummary: vi.fn(),
    getDeFiOpportunities: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(() => ({ size: 0, keys: [] }))
  }))
}))

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('useSeiVoiceIntegration Hook', () => {
  let mockIntegration: any

  beforeAll(async () => {
    await mockSeiBlockchainData.initialize()
  })

  beforeEach(async () => {
    mockIntegration = vi.mocked(await import('../../lib/sei-integration')).getSeiVoiceIntegration()
    
    // Setup default mock responses
    mockIntegration.getMarketContext.mockResolvedValue({
      _tag: 'Right',
      right: await createMockMarketData('SEI')
    })

    mockIntegration.getPortfolioSummary.mockResolvedValue({
      _tag: 'Right',
      right: await createMockPortfolio('sei1testaddress')
    })

    mockIntegration.getDeFiOpportunities.mockResolvedValue({
      _tag: 'Right',
      right: await createMockDeFiOpportunities()
    })

    mockIntegration.recognizeIntent.mockResolvedValue({
      intent: 'portfolio_inquiry',
      confidence: 0.85,
      requiresData: true,
      entities: { symbols: ['sei'] },
      cacheKey: 'portfolio_inquiry_test'
    })

    mockIntegration.processVoiceQuery.mockResolvedValue({
      _tag: 'Right',
      right: {
        spokenText: 'Your portfolio is performing well with a total value of $15,000.',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        followUpQuestions: ['Would you like to see your individual token performance?']
      }
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Hook Initialization', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      expect(result.current.isAnalyzing).toBe(false)
      expect(result.current.lastIntent).toBeNull()
      expect(result.current.confidence).toBe(0)
      expect(result.current.hasMarketData).toBe(false)
      expect(result.current.hasPortfolioData).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isReady).toBe(true)
    })

    it('should initialize with custom configuration', () => {
      const config: SeiVoiceConfig = {
        enableRealTimeMarketData: false,
        enablePortfolioTracking: false,
        walletAddress: 'sei1customaddress'
      }

      const { result } = renderHook(() => useSeiVoiceIntegration(config))

      expect(result.current).toBeDefined()
      expect(typeof result.current.analyzeVoiceQuery).toBe('function')
      expect(typeof result.current.processVoiceQuery).toBe('function')
    })

    it('should automatically load market data when enabled', async () => {
      renderHook(() => useSeiVoiceIntegration({ enableRealTimeMarketData: true }))

      await waitFor(() => {
        expect(mockIntegration.getMarketContext).toHaveBeenCalled()
      })
    })

    it('should automatically load portfolio data when wallet address provided', async () => {
      const testAddress = 'sei1testaddress123'
      
      renderHook(() => useSeiVoiceIntegration({ 
        enablePortfolioTracking: true,
        walletAddress: testAddress 
      }))

      await waitFor(() => {
        expect(mockIntegration.getPortfolioSummary).toHaveBeenCalledWith(testAddress)
      })
    })
  })

  describe('Voice Query Analysis', () => {
    it('should analyze voice queries and update state', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const intent = await result.current.analyzeVoiceQuery("What's my portfolio balance?")
        expect(intent).toBeDefined()
      })

      expect(result.current.lastIntent).toBe('portfolio_inquiry')
      expect(result.current.confidence).toBe(0.85)
      expect(result.current.isAnalyzing).toBe(false)
      expect(mockIntegration.recognizeIntent).toHaveBeenCalledWith("What's my portfolio balance?")
    })

    it('should handle analysis errors gracefully', async () => {
      mockIntegration.recognizeIntent.mockRejectedValue(new Error('Analysis failed'))
      
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const intent = await result.current.analyzeVoiceQuery("What's my portfolio?")
        expect(intent).toBeNull()
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isAnalyzing).toBe(false)
    })

    it('should track analytics when enabled', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ enableAnalytics: true }))

      await act(async () => {
        await result.current.analyzeVoiceQuery("Check SEI price")
        await result.current.analyzeVoiceQuery("Show my portfolio")
      })

      const analytics = result.current.getAnalytics()
      expect(analytics.totalQueries).toBeGreaterThan(0)
      expect(analytics.avgConfidence).toBeGreaterThan(0)
    })
  })

  describe('Voice Query Processing', () => {
    it('should process voice queries with blockchain data integration', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      let response: any
      await act(async () => {
        response = await result.current.processVoiceQuery("What's my portfolio performance?", 'sei1testaddress')
      })

      expect(response).toBeDefined()
      expect(response.spokenText).toContain('portfolio')
      expect(response.confidence).toBeGreaterThan(0.8)
      expect(response.dataSourced).toBe(true)
      expect(response.processingTime).toBeGreaterThan(0)
      expect(mockIntegration.processVoiceQuery).toHaveBeenCalledWith("What's my portfolio performance?", 'sei1testaddress')
    })

    it('should handle voice queries without wallet address', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const response = await result.current.processVoiceQuery("Show me my portfolio")
        expect(response).toBeDefined()
      })

      expect(mockIntegration.processVoiceQuery).toHaveBeenCalledWith("Show me my portfolio", undefined)
    })

    it('should use configured wallet address when not provided', async () => {
      const testAddress = 'sei1configuredaddress'
      const { result } = renderHook(() => useSeiVoiceIntegration({ walletAddress: testAddress }))

      await act(async () => {
        await result.current.processVoiceQuery("Check my balance")
      })

      expect(mockIntegration.processVoiceQuery).toHaveBeenCalledWith("Check my balance", testAddress)
    })

    it('should include context data in enhanced responses', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ 
        enableRealTimeMarketData: true,
        enablePortfolioTracking: true,
        walletAddress: 'sei1testaddress'
      }))

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.hasMarketData).toBe(true)
      })

      let response: any
      await act(async () => {
        response = await result.current.processVoiceQuery("How's my investment doing?")
      })

      expect(response.marketContext).toBeDefined()
      expect(response.intent).toBeDefined()
      expect(response.processingTime).toBeGreaterThan(0)
    })

    it('should handle processing errors and update error state', async () => {
      mockIntegration.processVoiceQuery.mockResolvedValue({
        _tag: 'Left',
        left: 'Service unavailable'
      })

      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const response = await result.current.processVoiceQuery("What's the SEI price?")
        expect(response).toBeNull()
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Real-time Data Management', () => {
    it('should refresh market data at configured intervals', async () => {
      vi.useFakeTimers()
      
      renderHook(() => useSeiVoiceIntegration({ 
        enableRealTimeMarketData: true,
        marketDataRefreshInterval: 5000 // 5 seconds for testing
      }))

      // Initial call
      await waitFor(() => {
        expect(mockIntegration.getMarketContext).toHaveBeenCalledTimes(1)
      })

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(mockIntegration.getMarketContext).toHaveBeenCalledTimes(2)
      })

      vi.useRealTimers()
    })

    it('should update market data state when successful', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ enableRealTimeMarketData: true }))

      await waitFor(() => {
        expect(result.current.hasMarketData).toBe(true)
        expect(result.current.marketContext).toBeDefined()
        expect(result.current.lastUpdate).toBeGreaterThan(0)
      })
    })

    it('should handle market data fetch failures gracefully', async () => {
      mockIntegration.getMarketContext.mockResolvedValue({
        _tag: 'Left',
        left: 'Market data unavailable'
      })

      const { result } = renderHook(() => useSeiVoiceIntegration({ enableRealTimeMarketData: true }))

      await waitFor(() => {
        expect(result.current.hasMarketData).toBe(false)
        expect(result.current.marketContext).toBeNull()
      })
    })

    it('should refresh portfolio data when wallet address changes', async () => {
      const { result, rerender } = renderHook(
        ({ walletAddress }) => useSeiVoiceIntegration({ 
          enablePortfolioTracking: true,
          walletAddress 
        }),
        { initialProps: { walletAddress: 'sei1address1' } }
      )

      await waitFor(() => {
        expect(mockIntegration.getPortfolioSummary).toHaveBeenCalledWith('sei1address1')
      })

      // Change wallet address
      rerender({ walletAddress: 'sei1address2' })

      await waitFor(() => {
        expect(mockIntegration.getPortfolioSummary).toHaveBeenCalledWith('sei1address2')
      })
    })

    it('should load DeFi opportunities on initialization', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await waitFor(() => {
        expect(mockIntegration.getDeFiOpportunities).toHaveBeenCalled()
        expect(result.current.defiOpportunities).toBeDefined()
      })
    })
  })

  describe('Error Handling', () => {
    it('should clear errors when clearError is called', async () => {
      mockIntegration.recognizeIntent.mockRejectedValue(new Error('Test error'))
      
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        await result.current.analyzeVoiceQuery("test query")
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle network timeouts appropriately', async () => {
      mockIntegration.processVoiceQuery.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const response = await result.current.processVoiceQuery("test query")
        expect(response).toBeNull()
      })

      expect(result.current.error).toContain('Network timeout')
    })

    it('should maintain state consistency during errors', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      // Successful operation first
      await act(async () => {
        await result.current.analyzeVoiceQuery("successful query")
      })

      const successfulState = { ...result.current }

      // Failed operation
      mockIntegration.recognizeIntent.mockRejectedValue(new Error('Failed'))
      
      await act(async () => {
        await result.current.analyzeVoiceQuery("failed query")
      })

      // Should preserve previous successful state except for error
      expect(result.current.lastIntent).toBe(successfulState.lastIntent)
      expect(result.current.confidence).toBe(successfulState.confidence)
      expect(result.current.error).toBeTruthy()
      expect(result.current.isAnalyzing).toBe(false)
    })
  })

  describe('Performance and Caching', () => {
    it('should provide cache management functions', () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      expect(typeof result.current.clearCache).toBe('function')
      expect(typeof result.current.getCacheStats).toBe('function')

      act(() => {
        result.current.clearCache()
        const stats = result.current.getCacheStats()
        expect(stats).toBeDefined()
      })

      expect(mockIntegration.clearCache).toHaveBeenCalled()
      expect(mockIntegration.getCacheStats).toHaveBeenCalled()
    })

    it('should track processing times for performance monitoring', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      const startTime = Date.now()
      await act(async () => {
        const response = await result.current.processVoiceQuery("test query")
        expect(response?.processingTime).toBeGreaterThan(0)
        expect(response?.processingTime).toBeLessThan(Date.now() - startTime + 100) // Allow some margin
      })
    })

    it('should limit analytics data to prevent memory leaks', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ enableAnalytics: true }))

      // Simulate many queries
      for (let i = 0; i < 150; i++) {
        await act(async () => {
          await result.current.analyzeVoiceQuery(`query ${i}`)
        })
      }

      const analytics = result.current.getAnalytics()
      expect(analytics.totalQueries).toBeLessThanOrEqual(100) // Should cap at 100
    })
  })

  describe('Status and State Management', () => {
    it('should properly track data availability', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ 
        enableRealTimeMarketData: true,
        enablePortfolioTracking: true,
        walletAddress: 'sei1testaddress'
      }))

      expect(result.current.hasData).toBe(false)

      await waitFor(() => {
        expect(result.current.hasMarketData).toBe(true)
        expect(result.current.hasPortfolioData).toBe(true)
        expect(result.current.hasData).toBe(true)
      })
    })

    it('should properly track ready state', () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      expect(result.current.isReady).toBe(true)

      act(() => {
        // Simulate error state
        result.current.analyzeVoiceQuery("will trigger error").catch(() => {})
      })

      // Should still be ready if not analyzing
      expect(result.current.isReady).toBe(true)
    })

    it('should provide comprehensive analytics data', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration({ enableAnalytics: true }))

      // Add some varied queries
      await act(async () => {
        await result.current.analyzeVoiceQuery("portfolio query")
      })

      mockIntegration.recognizeIntent.mockResolvedValue({
        intent: 'market_analysis',
        confidence: 0.75,
        requiresData: true,
        entities: { symbols: ['sei'] },
        cacheKey: 'market_test'
      })

      await act(async () => {
        await result.current.analyzeVoiceQuery("market query")
      })

      const analytics = result.current.getAnalytics()
      expect(analytics.totalQueries).toBeGreaterThan(0)
      expect(analytics.intentCounts).toBeDefined()
      expect(analytics.avgConfidence).toBeGreaterThan(0)
      expect(analytics.mostCommonIntent).toBeDefined()
    })
  })

  describe('Component Lifecycle', () => {
    it('should cleanup intervals on unmount', () => {
      vi.useFakeTimers()
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { unmount } = renderHook(() => useSeiVoiceIntegration({ 
        enableRealTimeMarketData: true,
        marketDataRefreshInterval: 1000
      }))

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('should not crash when called after unmount', async () => {
      const { result, unmount } = renderHook(() => useSeiVoiceIntegration())

      unmount()

      // These should not throw errors
      expect(() => {
        result.current.clearCache()
        result.current.getCacheStats()
      }).not.toThrow()
    })

    it('should handle rapid successive calls gracefully', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          act(async () => {
            await result.current.analyzeVoiceQuery(`rapid query ${i}`)
          })
        )
      }

      await Promise.all(promises)

      // Should handle all requests without errors
      expect(result.current.error).toBeNull()
      expect(mockIntegration.recognizeIntent).toHaveBeenCalledTimes(5)
    })
  })

  describe('Integration with Voice Features', () => {
    it('should format responses appropriately for voice output', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const response = await result.current.processVoiceQuery("What's my portfolio worth?")
        
        if (response) {
          expect(response.spokenText).toBeDefined()
          expect(typeof response.spokenText).toBe('string')
          expect(response.spokenText.length).toBeGreaterThan(0)
          expect(response.spokenText.length).toBeLessThan(500) // Voice-appropriate length
        }
      })
    })

    it('should provide relevant follow-up questions for voice conversations', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      await act(async () => {
        const response = await result.current.processVoiceQuery("Tell me about DeFi opportunities")
        
        if (response) {
          expect(response.followUpQuestions).toBeDefined()
          expect(Array.isArray(response.followUpQuestions)).toBe(true)
          if (response.followUpQuestions && response.followUpQuestions.length > 0) {
            response.followUpQuestions.forEach(question => {
              expect(typeof question).toBe('string')
              expect(question.length).toBeGreaterThan(0)
            })
          }
        }
      })
    })

    it('should maintain conversation context across queries', async () => {
      const { result } = renderHook(() => useSeiVoiceIntegration())

      // First query establishes context
      await act(async () => {
        await result.current.analyzeVoiceQuery("What's my SEI balance?")
      })

      expect(result.current.lastIntent).toBe('portfolio_inquiry')

      // Follow-up query can reference the context
      await act(async () => {
        await result.current.analyzeVoiceQuery("Should I buy more?")
      })

      // Hook should maintain state for context-aware responses
      expect(result.current.lastUpdate).toBeGreaterThan(0)
    })
  })
})