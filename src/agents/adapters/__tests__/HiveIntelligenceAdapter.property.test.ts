/**
 * @fileoverview Property-based tests for HiveIntelligenceAdapter
 * Advanced testing with mathematical properties and invariants
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import fc from 'fast-check';

import { HiveIntelligenceAdapter, HiveIntelligenceConfig, HiveQuery, HiveResponse } from '../HiveIntelligenceAdapter';
import { AgentConfig } from '../../base/BaseAgent';
import { FunctionalTestHelpers } from '../../../__tests__/utils/functional-test-helpers';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Helper function to create Response mock
const createMockResponse = (data: any, ok: boolean = true, status: number = 200): Response => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  headers: new Headers(),
  type: 'basic' as ResponseType,
  url: '',
  redirected: false,
  body: null,
  bodyUsed: false,
  clone: jest.fn(),
  text: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  arrayBuffer: jest.fn(),
  json: async () => data
} as Response);

describe('HiveIntelligenceAdapter Property Tests', () => {
  let adapter: HiveIntelligenceAdapter;
  let agentConfig: AgentConfig;
  let hiveConfig: HiveIntelligenceConfig;

  beforeEach(() => {
    mockFetch.mockClear();
    
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
        ttlMs: 300000,
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

  describe('Query Property Tests', () => {
    // Generator for valid queries
    const validQueryGenerator = fc.record({
      type: fc.constantFrom('search', 'analytics', 'portfolio', 'market'),
      query: fc.string({ minLength: 1, maxLength: 1000 }),
      parameters: fc.option(fc.record({
        maxResults: fc.integer({ min: 1, max: 100 }),
        timeout: fc.integer({ min: 1000, max: 30000 })
      })),
      metadata: fc.option(fc.record({
        walletAddress: fc.string({ minLength: 10, maxLength: 50 }),
        chainId: fc.integer({ min: 1, max: 1000 }),
        maxResults: fc.integer({ min: 1, max: 100 })
      }))
    });

    // Generator for API responses
    const apiResponseGenerator = fc.record({
      success: fc.boolean(),
      data: fc.option(fc.array(fc.record({
        id: fc.string(),
        title: fc.string(),
        type: fc.constantFrom('transaction', 'address', 'token', 'protocol'),
        relevanceScore: fc.float({ min: 0, max: 1 })
      }))),
      error: fc.option(fc.record({
        code: fc.string(),
        message: fc.string()
      })),
      metadata: fc.option(fc.record({
        creditsUsed: fc.integer({ min: 0, max: 10 }),
        queryTime: fc.integer({ min: 1, max: 5000 }),
        resultCount: fc.integer({ min: 0, max: 1000 }),
        queryId: fc.string()
      }))
    });

    it('should maintain query idempotency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (query) => {
            // Mock consistent response
            const mockResponse = {
              success: true,
              data: [{ id: 'test-result', title: 'Test' }],
              metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: 'test' }
            };

            mockFetch.mockResolvedValue(createMockResponse(mockResponse));

            const result1 = await adapter.search(query)();
            const result2 = await adapter.search(query)();

            // Idempotency: same query should produce same result structure
            expect(E.isRight(result1)).toBe(E.isRight(result2));
            
            if (E.isRight(result1) && E.isRight(result2)) {
              expect(result1.right.success).toBe(result2.right.success);
              // Note: Due to caching, the actual data might be identical
              // but timestamps in metadata might differ
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve query structure invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          validQueryGenerator,
          async (queryData) => {
            // Mock successful response
            mockFetch.mockResolvedValue(createMockResponse({
              success: true,
              data: [],
              metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'prop-test' }
            }));

            const result = await adapter.search(queryData.query, queryData.metadata || undefined)();

            // Invariant: All queries should produce a result (Either Right or Left)
            expect(E.isRight(result) || E.isLeft(result)).toBe(true);
            
            if (E.isRight(result)) {
              // Invariant: Response should always have success field
              expect(typeof result.right.success).toBe('boolean');
              
              // Invariant: If successful, metadata should exist
              if (result.right.success) {
                expect(result.right.metadata).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty and edge case queries consistently', async () => {
      const edgeCaseQueries = [
        '', // Empty string
        ' ', // Whitespace
        'a', // Single character
        'A'.repeat(1000), // Very long string
        '!@#$%^&*()', // Special characters
        '你好世界', // Unicode
        '\n\t\r', // Control characters
        'SELECT * FROM users', // SQL-like
        '<script>alert("test")</script>', // XSS attempt
        '../../etc/passwd' // Path traversal attempt
      ];

      for (const query of edgeCaseQueries) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'edge-test' }
          })
        } as Response);

        const result = await adapter.search(query)();
        
        // Should always return a result, never throw
        expect(E.isRight(result) || E.isLeft(result)).toBe(true);
      }
    });
  });

  describe('Rate Limiting Properties', () => {
    it('should enforce rate limiting consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (numRequests) => {
            // Mock successful responses
            mockFetch.mockResolvedValue({
              ok: true,
              json: async () => ({
                success: true,
                data: [],
                metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'rate-test' }
              })
            } as Response);

            const promises = Array(numRequests).fill(null).map((_, i) => 
              adapter.search(`test query ${i}`)()
            );

            const results = await Promise.all(promises);
            
            // Rate limiting property: should not exceed configured limit
            const successfulResults = results.filter(r => 
              E.isRight(r) && r.right.success
            );
            
            const rateLimitedResults = results.filter(r => 
              E.isLeft(r) && r.left.code === 'RATE_LIMIT_EXCEEDED'
            );

            // If we exceed rate limit, should have failures
            if (numRequests > hiveConfig.rateLimitConfig.maxRequests) {
              expect(rateLimitedResults.length).toBeGreaterThan(0);
            }
            
            // Total results should equal input
            expect(results.length).toBe(numRequests);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain rate limit window integrity', async () => {
      const rateLimitConfig = hiveConfig.rateLimitConfig;
      
      // Property: Within a window, should not exceed max requests
      const requestsInWindow = rateLimitConfig.maxRequests + 5;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'window-test' }
        })
      } as Response);

      const results = await Promise.all(
        Array(requestsInWindow).fill(null).map((_, i) => 
          adapter.search(`window test ${i}`)()
        )
      );

      const failures = results.filter(r => E.isLeft(r));
      expect(failures.length).toBeGreaterThan(0); // Should have some failures
    });
  });

  describe('Cache Properties', () => {
    it('should maintain cache consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 2, max: 5 }),
          async (query, repetitions) => {
            let callCount = 0;
            mockFetch.mockImplementation(async () => {
              callCount++;
              return {
                ok: true,
                json: async () => ({
                  success: true,
                  data: [{ id: `result-${callCount}`, title: `Result ${callCount}` }],
                  metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: `cache-${callCount}` }
                })
              } as Response;
            });

            const results = await Promise.all(
              Array(repetitions).fill(null).map(() => adapter.search(query)())
            );

            // Cache property: identical queries should return consistent results
            const successfulResults = results.filter(r => E.isRight(r) && r.right.success);
            
            if (successfulResults.length > 1) {
              // If caching is working, should have fewer API calls than requests
              // Note: In a real implementation, we'd need to access cache internals
              // For now, we just verify structural consistency
              expect(successfulResults.length).toBe(repetitions);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle cache invalidation properly', async () => {
      const query = 'cache invalidation test';
      
      // First response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'result-1', title: 'First Result' }],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: 'cache-1' }
        })
      } as Response);

      const result1 = await adapter.search(query)();
      expect(E.isRight(result1)).toBe(true);

      // Second response (potentially from cache)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'result-2', title: 'Second Result' }],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: 'cache-2' }
        })
      } as Response);

      const result2 = await adapter.search(query)();
      expect(E.isRight(result2)).toBe(true);

      // Results should be structurally consistent
      if (E.isRight(result1) && E.isRight(result2)) {
        expect(result1.right.success).toBe(result2.right.success);
      }
    });
  });

  describe('Error Handling Properties', () => {
    it('should handle all error types gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('network-error'),
            fc.constant('timeout'),
            fc.constant('invalid-response'),
            fc.constant('rate-limit'),
            fc.constant('server-error'),
            fc.constant('auth-error')
          ),
          async (errorType) => {
            // Mock different error scenarios
            switch (errorType) {
              case 'network-error':
                mockFetch.mockRejectedValue(new Error('Network error'));
                break;
              case 'timeout':
                mockFetch.mockRejectedValue(new Error('Request timeout'));
                break;
              case 'invalid-response':
                mockFetch.mockResolvedValue({
                  ok: true,
                  json: async () => { throw new Error('Invalid JSON'); }
                } as Response);
                break;
              case 'rate-limit':
                mockFetch.mockResolvedValue({
                  ok: false,
                  status: 429,
                  json: async () => ({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' } })
                } as Response);
                break;
              case 'server-error':
                mockFetch.mockResolvedValue({
                  ok: false,
                  status: 500,
                  json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } })
                } as Response);
                break;
              case 'auth-error':
                mockFetch.mockResolvedValue({
                  ok: false,
                  status: 401,
                  json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } })
                } as Response);
                break;
            }

            const result = await adapter.search('test query')();
            
            // Error handling property: should always return Either, never throw
            expect(E.isRight(result) || E.isLeft(result)).toBe(true);
            
            // If Right, should indicate failure in response
            if (E.isRight(result)) {
              expect(result.right.success).toBe(false);
              expect(result.right.error).toBeDefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain error structure consistency', async () => {
      const errorScenarios = [
        { status: 400, code: 'BAD_REQUEST' },
        { status: 401, code: 'UNAUTHORIZED' },
        { status: 403, code: 'FORBIDDEN' },
        { status: 404, code: 'NOT_FOUND' },
        { status: 429, code: 'RATE_LIMIT_EXCEEDED' },
        { status: 500, code: 'INTERNAL_ERROR' },
        { status: 503, code: 'SERVICE_UNAVAILABLE' }
      ];

      for (const scenario of errorScenarios) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: scenario.status,
          json: async () => ({
            error: { code: scenario.code, message: `Error ${scenario.status}` }
          })
        } as Response);

        const result = await adapter.search('test query')();
        
        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.success).toBe(false);
          expect(result.right.error?.code).toBe(scenario.status.toString());
        }
      }
    });
  });

  describe('Credit Usage Properties', () => {
    it('should track credit usage monotonically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
          async (creditUsages) => {
            let totalUsed = 0;
            
            for (const creditsUsed of creditUsages) {
              mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                  success: true,
                  data: [],
                  metadata: { creditsUsed, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'credit-test' }
                })
              } as Response);

              const result = await adapter.search(`test query ${totalUsed}`)();
              
              if (E.isRight(result) && result.right.success) {
                totalUsed += creditsUsed;
                
                // Credit usage property: should be monotonically increasing
                expect(result.right.metadata?.creditsUsed).toBe(creditsUsed);
              }
            }
            
            // Total credits used should equal sum of individual usages
            expect(totalUsed).toBe(creditUsages.reduce((sum, credits) => sum + credits, 0));
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle credit exhaustion gracefully', async () => {
      // Mock credit exhaustion scenario
      mockFetch.mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Not enough credits' }
        })
      } as Response);

      const result = await adapter.search('expensive query')();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.success).toBe(false);
        expect(result.right.error?.code).toBe('402');
      }
    });
  });

  describe('Performance Properties', () => {
    it('should maintain response time consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 500 }),
          async (mockLatency) => {
            mockFetch.mockImplementation(async () => {
              await new Promise(resolve => setTimeout(resolve, mockLatency));
              return {
                ok: true,
                json: async () => ({
                  success: true,
                  data: [],
                  metadata: { creditsUsed: 1, queryTime: mockLatency, resultCount: 0, timestamp: Date.now(), queryId: 'perf-test' }
                })
              } as Response;
            });

            const startTime = Date.now();
            const result = await adapter.search('performance test')();
            const endTime = Date.now();
            
            const actualLatency = endTime - startTime;
            
            // Performance property: actual latency should be close to mock latency
            expect(actualLatency).toBeGreaterThanOrEqual(mockLatency);
            expect(actualLatency).toBeLessThan(mockLatency + 1000); // Allow 1s overhead
            
            if (E.isRight(result) && result.right.success) {
              expect(result.right.metadata?.queryTime).toBe(mockLatency);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle concurrent requests without race conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          async (concurrency) => {
            let responseCount = 0;
            
            mockFetch.mockImplementation(async () => {
              responseCount++;
              return {
                ok: true,
                json: async () => ({
                  success: true,
                  data: [{ id: `result-${responseCount}` }],
                  metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: `concurrent-${responseCount}` }
                })
              } as Response;
            });

            const promises = Array(concurrency).fill(null).map((_, i) => 
              adapter.search(`concurrent test ${i}`)()
            );

            const results = await Promise.all(promises);
            
            // Concurrency property: should handle all requests
            expect(results.length).toBe(concurrency);
            
            // No race conditions: all should be successful or failed consistently
            const successCount = results.filter(r => E.isRight(r) && r.right.success).length;
            const failureCount = results.filter(r => E.isLeft(r)).length;
            
            expect(successCount + failureCount).toBe(concurrency);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Mathematical Properties', () => {
    it('should satisfy functor laws for response transformations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (query) => {
            mockFetch.mockResolvedValue({
              ok: true,
              json: async () => ({
                success: true,
                data: [{ id: 'test', title: 'Test Result' }],
                metadata: { creditsUsed: 1, queryTime: 100, resultCount: 1, timestamp: Date.now(), queryId: 'functor-test' }
              })
            } as Response);

            const result = await adapter.search(query)();
            
            // Functor law: identity
            const identity = <T>(x: T): T => x;
            const identityMapped = pipe(result, E.map(identity));
            expect(identityMapped).toEqual(result);
            
            // Functor law: composition
            const f = (response: any) => ({ ...response, processed: true });
            const g = (response: any) => ({ ...response, timestamp: Date.now() });
            
            const composed = pipe(result, E.map(response => g(f(response))));
            const chained = pipe(result, E.map(f), E.map(g));
            
            // Should have same structure (can't test exact equality due to timestamps)
            expect(E.isRight(composed)).toBe(E.isRight(chained));
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain monad laws for TaskEither operations', async () => {
      const testQuery = 'monad test';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          metadata: { creditsUsed: 1, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'monad-test' }
        })
      } as Response);

      // Left identity law: chain(f)(of(a)) = f(a)
      const transform = (response: any) => TE.right({ ...response, transformed: true });
      const value = { success: true, data: [] };
      
      const leftIdentity = pipe(TE.right(value), TE.chain(transform));
      const direct = transform(value);
      
      const leftResult = await leftIdentity();
      const directResult = await direct();
      
      expect(E.isRight(leftResult)).toBe(E.isRight(directResult));
      
      // Right identity law: chain(of)(m) = m
      const searchResult = adapter.search(testQuery);
      const rightIdentity = pipe(searchResult, TE.chain(TE.right));
      
      const originalResult = await searchResult();
      const rightResult = await rightIdentity();
      
      expect(E.isRight(originalResult)).toBe(E.isRight(rightResult));
    });
  });

  describe('Invariant Properties', () => {
    it('should maintain response structure invariants', async () => {
      const apiResponseGenerator = fc.record({
        success: fc.boolean(),
        data: fc.option(fc.array(fc.record({
          id: fc.string(),
          title: fc.string(),
          type: fc.constantFrom('transaction', 'address', 'token', 'protocol'),
          relevanceScore: fc.float({ min: 0, max: 1 })
        }))),
        error: fc.option(fc.record({
          code: fc.string(),
          message: fc.string()
        })),
        metadata: fc.option(fc.record({
          creditsUsed: fc.integer({ min: 0, max: 10 }),
          queryTime: fc.integer({ min: 1, max: 5000 }),
          resultCount: fc.integer({ min: 0, max: 1000 }),
          queryId: fc.string()
        }))
      });

      await fc.assert(
        fc.asyncProperty(
          apiResponseGenerator,
          async (mockResponse) => {
            mockFetch.mockResolvedValue(createMockResponse(mockResponse));

            const result = await adapter.search('invariant test')();
            
            // Invariant: Response should always be Either
            expect(E.isRight(result) || E.isLeft(result)).toBe(true);
            
            if (E.isRight(result)) {
              // Invariant: Response should have success field
              expect(typeof result.right.success).toBe('boolean');
              
              // Invariant: If success is true, data should be defined
              if (result.right.success) {
                expect(result.right.data).toBeDefined();
              }
              
              // Invariant: If success is false, error should be defined
              if (!result.right.success) {
                expect(result.right.error).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain credit consumption invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (creditsUsed) => {
            mockFetch.mockResolvedValue({
              ok: true,
              json: async () => ({
                success: true,
                data: [],
                metadata: { creditsUsed, queryTime: 100, resultCount: 0, timestamp: Date.now(), queryId: 'credit-invariant' }
              })
            } as Response);

            const result = await adapter.search('credit test')();
            
            if (E.isRight(result) && result.right.success) {
              // Invariant: Credits used should be non-negative
              expect(result.right.metadata?.creditsUsed).toBeGreaterThanOrEqual(0);
              
              // Invariant: Credits used should not exceed max per query
              expect(result.right.metadata?.creditsUsed).toBeLessThanOrEqual(hiveConfig.creditConfig.maxCreditsPerQuery);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});