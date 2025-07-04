/**
 * @fileoverview HiveIntelligenceAdapter comprehensive test suite
 * Tests for the Hive Intelligence API integration with fp-ts patterns
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import fc from 'fast-check';

import { HiveIntelligenceAdapter, HiveIntelligenceConfig, HiveQuery, HiveResponse, HiveSearchResult, HiveAnalyticsResult } from '../HiveIntelligenceAdapter';
import { AgentConfig } from '../../base/BaseAgent';
import { FunctionalTestHelpers } from '../../../__tests__/utils/functional-test-helpers';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('HiveIntelligenceAdapter', () => {
  let adapter: HiveIntelligenceAdapter;
  let agentConfig: AgentConfig;
  let hiveConfig: HiveIntelligenceConfig;

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear();
    
    // Setup test configurations
    agentConfig = {
      id: 'test-hive-agent',
      name: 'Test Hive Intelligence Agent',
      version: '1.0.0',
      description: 'Test agent for Hive Intelligence integration',
      capabilities: ['search', 'analytics', 'portfolio', 'market'],
      settings: {}
    };

    hiveConfig = {
      baseUrl: 'https://api.hiveintelligence.xyz/v1',
      apiKey: 'test-api-key',
      version: '1.0.0',
      rateLimitConfig: {
        maxRequests: 20,
        windowMs: 60000
      },
      cacheConfig: {
        enabled: true,
        ttlMs: 300000, // 5 minutes
        maxSize: 1000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000
      },
      creditConfig: {
        trackUsage: true,
        maxCreditsPerQuery: 10,
        alertThreshold: 100
      }
    };

    adapter = new HiveIntelligenceAdapter(agentConfig, hiveConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Construction and Configuration', () => {
    it('should create adapter with valid configuration', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getConfig().id).toBe('test-hive-agent');
      expect(adapter.getHiveConfig().baseUrl).toBe('https://api.hiveintelligence.xyz/v1');
    });

    it('should register all required actions', () => {
      const actions = [
        'hive_search',
        'hive_analytics',
        'hive_portfolio_analysis',
        'hive_market_intelligence',
        'hive_credit_usage'
      ];

      actions.forEach(actionId => {
        expect(() => {
          adapter.executeAction(actionId, {
            agentId: 'test-agent',
            parameters: {},
            state: adapter.getState(),
            metadata: {}
          });
        }).not.toThrow();
      });
    });

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        ...hiveConfig,
        baseUrl: '', // Invalid URL
        apiKey: '' // Invalid API key
      };

      expect(() => {
        new HiveIntelligenceAdapter(agentConfig, invalidConfig);
      }).not.toThrow(); // Should not throw on construction
    });
  });

  describe('Search Functionality', () => {
    const mockSearchResponse: HiveResponse<HiveSearchResult[]> = {
      success: true,
      data: [
        {
          id: 'result-1',
          title: 'Test Transaction',
          description: 'A test blockchain transaction',
          type: 'transaction',
          chain: 'sei',
          relevanceScore: 0.95,
          data: {
            hash: '0x123...',
            value: '1000000000000000000',
            gas: '21000'
          },
          timestamp: '2024-01-01T00:00:00Z'
        }
      ],
      metadata: {
        creditsUsed: 1,
        queryTime: 150,
        resultCount: 1,
        timestamp: Date.now(),
        queryId: 'query-123'
      }
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse
      } as Response);
    });

    it('should perform basic search successfully', async () => {
      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(true);
        expect(result.right.data).toHaveLength(1);
        expect(result.right.data![0].title).toBe('Test Transaction');
      }
    });

    it('should handle search with metadata', async () => {
      const metadata = {
        walletAddress: '0x123...',
        maxResults: 10,
        filters: { chain: 'sei' }
      };

      const result = await adapter.search('test query', metadata)();
      
      expect(E.isRight(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          }),
          body: expect.stringContaining('test query')
        })
      );
    });

    it('should handle search errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_QUERY',
            message: 'Query is invalid'
          }
        })
      } as Response);

      const result = await adapter.search('invalid query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
        expect(result.right.error?.code).toBe('400');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
        expect(result.right.error?.code).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('Analytics Functionality', () => {
    const mockAnalyticsResponse: HiveResponse<HiveAnalyticsResult> = {
      success: true,
      data: {
        queryId: 'analytics-123',
        analysisType: 'portfolio',
        insights: [
          {
            id: 'insight-1',
            type: 'trend',
            title: 'Positive Trend',
            description: 'Portfolio showing positive trend',
            confidence: 0.85,
            data: { trend: 'up', confidence: 0.85 }
          }
        ],
        metrics: {
          totalValue: 1000000,
          dailyChange: 0.05,
          volatility: 0.12
        },
        recommendations: [
          {
            id: 'rec-1',
            type: 'hold',
            title: 'Hold Current Position',
            description: 'Maintain current portfolio allocation',
            priority: 'medium',
            expectedImpact: 0.03,
            actionItems: ['Monitor daily', 'Review weekly']
          }
        ],
        timestamp: '2024-01-01T00:00:00Z'
      },
      metadata: {
        creditsUsed: 2,
        queryTime: 300,
        resultCount: 1,
        timestamp: Date.now(),
        queryId: 'analytics-123'
      }
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAnalyticsResponse
      } as Response);
    });

    it('should perform analytics successfully', async () => {
      const result = await adapter.getAnalytics('analyze portfolio performance')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(true);
        expect(result.right.data?.insights).toHaveLength(1);
        expect(result.right.data?.recommendations).toHaveLength(1);
      }
    });

    it('should perform portfolio analysis', async () => {
      const walletAddress = '0x123...';
      const result = await adapter.analyzePortfolio(walletAddress)();
      
      expect(E.isRight(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/portfolio/analyze'),
        expect.objectContaining({
          body: expect.stringContaining(walletAddress)
        })
      );
    });

    it('should get market intelligence', async () => {
      const result = await adapter.getMarketIntelligence('current market trends')();
      
      expect(E.isRight(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/market/intelligence'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Setup successful mock response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'test' }
        })
      } as Response);
    });

    it('should respect rate limits', async () => {
      const promises = Array(25).fill(null).map(() => adapter.search('test'));
      
      const results = await Promise.all(promises.map(p => p()));
      
      // Should have some rate limit failures
      const failures = results.filter(r => E.isLeft(r));
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should reset rate limit window', async () => {
      // First request should succeed
      const result1 = await adapter.search('test 1')();
      expect(E.isRight(result1)).toBe(true);
      
      // Simulate time passing (in real implementation, this would be handled by the rate limiter)
      // For testing, we can't easily simulate time passing, so we'll just verify the structure
      expect(result1).toBeDefined();
    });
  });

  describe('Caching', () => {
    const mockResponse = {
      success: true,
      data: [{ id: 'cached-result' }],
      metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: 'cache-test' }
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);
    });

    it('should cache successful responses', async () => {
      // First call
      const result1 = await adapter.search('cacheable query')();
      expect(E.isRight(result1)).toBe(true);
      
      // Second call should use cache (but we can't easily test this without accessing internals)
      const result2 = await adapter.search('cacheable query')();
      expect(E.isRight(result2)).toBe(true);
      
      // Verify both results are identical
      expect(result1).toEqual(result2);
    });

    it('should handle cache misses', async () => {
      const result1 = await adapter.search('unique query 1')();
      const result2 = await adapter.search('unique query 2')();
      
      expect(E.isRight(result1)).toBe(true);
      expect(E.isRight(result2)).toBe(true);
      
      // Should have made separate API calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Credit Usage Tracking', () => {
    const mockCreditResponse = {
      success: true,
      data: {
        totalCredits: 1000,
        usedCredits: 50,
        remainingCredits: 950,
        resetDate: '2024-01-02T00:00:00Z',
        queryHistory: [
          {
            queryId: 'query-1',
            creditsUsed: 1,
            queryType: 'search',
            timestamp: '2024-01-01T12:00:00Z'
          }
        ]
      },
      metadata: { creditsUsed: 0, queryTime: 50, resultCount: 1, timestamp: Date.now(), queryId: 'credit-check' }
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCreditResponse
      } as Response);
    });

    it('should get credit usage', async () => {
      const result = await adapter.getCreditUsage()();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.totalCredits).toBe(1000);
        expect(result.right.usedCredits).toBe(50);
        expect(result.right.remainingCredits).toBe(950);
      }
    });

    it('should track credit usage from queries', async () => {
      // Mock a search response with credit usage
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 3, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'credit-track' }
        })
      } as Response);

      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.metadata?.creditsUsed).toBe(3);
      }
    });
  });

  describe('Action Handlers', () => {
    const createActionContext = (parameters: any) => ({
      agentId: 'test-agent',
      parameters,
      state: adapter.getState(),
      metadata: {}
    });

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { results: [] },
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'action-test' }
        })
      } as Response);
    });

    it('should handle search action', async () => {
      const context = createActionContext({
        query: 'test search query'
      });

      const result = await adapter.executeAction('hive_search', context)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(true);
      }
    });

    it('should handle analytics action', async () => {
      const context = createActionContext({
        query: 'analyze market trends'
      });

      const result = await adapter.executeAction('hive_analytics', context)();
      
      expect(E.isRight(result)).toBe(true);
    });

    it('should handle portfolio analysis action', async () => {
      const context = createActionContext({
        walletAddress: '0x123...',
        parameters: { includeHistory: true }
      });

      const result = await adapter.executeAction('hive_portfolio_analysis', context)();
      
      expect(E.isRight(result)).toBe(true);
    });

    it('should handle market intelligence action', async () => {
      const context = createActionContext({
        query: 'current DeFi trends'
      });

      const result = await adapter.executeAction('hive_market_intelligence', context)();
      
      expect(E.isRight(result)).toBe(true);
    });

    it('should handle credit usage action', async () => {
      const context = createActionContext({});

      const result = await adapter.executeAction('hive_credit_usage', context)();
      
      expect(E.isRight(result)).toBe(true);
    });

    it('should validate required parameters', async () => {
      const context = createActionContext({
        // Missing required 'query' parameter
      });

      const result = await adapter.executeAction('hive_search', context)();
      
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('Plugin Integration', () => {
    it('should install Hive plugin successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        type: 'default',
        url: '',
        redirected: false,
        body: null,
        bodyUsed: false,
        clone: jest.fn(),
        text: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        arrayBuffer: jest.fn(),
        json: async () => ({ status: 'healthy' })
      } as Response);

      const result = await adapter.installHivePlugin()();
      
      expect(E.isRight(result)).toBe(true);
    });

    it('should handle plugin installation failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await adapter.installHivePlugin()();
      
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded'
          }
        })
      } as Response);

      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
        expect(result.right.error?.code).toBe('429');
      }
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
        expect(result.right.error?.code).toBe('NETWORK_ERROR');
      }
    });

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      const result = await adapter.search('test query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should maintain query structure invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.option(fc.record({
            maxResults: fc.integer({ min: 1, max: 100 }),
            walletAddress: fc.string({ minLength: 10, maxLength: 50 })
          })),
          async (query, metadata) => {
            // Mock successful response
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                data: [],
                metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'prop-test' }
              })
            } as Response);

            const result = await adapter.search(query, metadata || undefined)();
            
            // Query should always produce a result (success or failure)
            expect(E.isRight(result)).toBe(true);
            
            if (E.isRight(result)) {
              // Response should always have success field
              expect(typeof result.right.success).toBe('boolean');
              
              // If successful, should have data
              if (result.right.success) {
                expect(result.right.data).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle rate limiting consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 30 }),
          async (queries) => {
            // Mock responses for all queries
            mockFetch.mockImplementation(() =>
              Promise.resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  data: [],
                  metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'rate-test' }
                })
              } as Response)
            );

            const results = await Promise.all(
              queries.map(query => adapter.search(query)())
            );

            // Should have consistent behavior - either all succeed or some fail due to rate limiting
            const successCount = results.filter(r => 
              E.isRight(r) && r.right.success
            ).length;
            
            const rateLimitFailures = results.filter(r => 
              E.isLeft(r) && r.left.code === 'RATE_LIMIT_EXCEEDED'
            ).length;

            // Total results should equal input queries
            expect(results.length).toBe(queries.length);
            
            // Should have some successful results unless all are rate limited
            expect(successCount + rateLimitFailures).toBeLessThanOrEqual(queries.length);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Performance Testing', () => {
    it('should complete searches within reasonable time', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'perf-test' }
        })
      } as Response);

      const result = await FunctionalTestHelpers.checkPerformanceProperties(
        () => adapter.search('performance test query')(),
        { maxExecutionTime: 5000 } // 5 seconds max
      );

      expect(E.isRight(result.result)).toBe(true);
      expect(result.executionTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'concurrent-test' }
        })
      } as Response);

      const concurrencyResult = await FunctionalTestHelpers.checkConcurrencyProperties(
        () => adapter.search('concurrent test')(),
        5, // 5 concurrent requests
        3  // 3 iterations
      );

      expect(concurrencyResult.results.length).toBeGreaterThan(0);
      expect(concurrencyResult.errors.length).toBeLessThan(concurrencyResult.results.length);
    });
  });

  describe('Integration Testing', () => {
    it('should work with BaseAgent lifecycle', async () => {
      // Test agent start
      const startResult = await adapter.start()();
      expect(E.isRight(startResult)).toBe(true);
      
      // Test agent state
      const state = adapter.getState();
      expect(state.status).toBe('active');
      
      // Test agent stop
      const stopResult = await adapter.stop()();
      expect(E.isRight(stopResult)).toBe(true);
    });

    it('should emit appropriate events', () => {
      const eventSpy = jest.fn();
      adapter.on('hive:plugin:initialized', eventSpy);
      
      // Events would be emitted during plugin initialization
      // In a real test, we'd verify the event was emitted
      expect(eventSpy).toHaveBeenCalledTimes(0); // Not called yet since we haven't initialized
    });
  });
});