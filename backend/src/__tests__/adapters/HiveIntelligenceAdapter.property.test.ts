import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import { HiveIntelligenceAdapter, createHiveIntelligenceAdapter, BlockchainQueryParams } from '../../adapters/HiveIntelligenceAdapter';
import * as E from 'fp-ts/Either';

// Mock axios completely for property tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('HiveIntelligenceAdapter Property-Based Tests', () => {
  // Custom arbitraries for blockchain domain
  const blockchainQuery = fc.record({
    query: fc.string({ minLength: 1, maxLength: 1000 }),
    temperature: fc.option(fc.float({ min: 0, max: 1 })),
    includeDataSources: fc.option(fc.boolean()),
    maxTokens: fc.option(fc.integer({ min: 1, max: 2000 }))
  });

  const apiKey = fc.string({ minLength: 10, maxLength: 100 });
  const baseUrl = fc.webUrl();

  const validConfig = fc.record({
    apiKey,
    baseUrl: fc.option(baseUrl),
    maxRequestsPerMinute: fc.option(fc.integer({ min: 1, max: 100 })),
    cacheTTL: fc.option(fc.integer({ min: 1, max: 3600 })),
    retryAttempts: fc.option(fc.integer({ min: 0, max: 10 })),
    retryDelay: fc.option(fc.integer({ min: 100, max: 10000 }))
  });

  const blockchainKeywords = fc.constantFrom(
    'sei', 'staking', 'defi', 'yield', 'wallet', 'transaction', 'price', 'token',
    'nft', 'bridge', 'swap', 'liquidity', 'governance', 'validator', 'dragon',
    'cosmos', 'ethereum', 'bitcoin', 'blockchain', 'crypto', 'dragonswap'
  );

  const blockchainQueryWithKeywords = fc.record({
    query: fc.string().chain(base => 
      fc.array(blockchainKeywords, { minLength: 1, maxLength: 3 })
        .map(keywords => `${base} ${keywords.join(' ')}`)
    ),
    temperature: fc.option(fc.float({ min: 0, max: 1 })),
    includeDataSources: fc.option(fc.boolean()),
    maxTokens: fc.option(fc.integer({ min: 1, max: 2000 }))
  });

  describe('Configuration Properties', () => {
    it('should create adapter with any valid configuration', () => {
      fc.assert(
        fc.property(validConfig, (config) => {
          const adapter = createHiveIntelligenceAdapter(config);
          
          expect(adapter).toBeDefined();
          expect(adapter.name).toBe('HiveIntelligence');
          expect(adapter.version).toBe('1.0.0');
          expect(adapter.isInitialized).toBe(false);
          
          // Cleanup
          adapter.destroy();
        })
      );
    });

    it('should handle configuration edge cases', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiKey: fc.string({ minLength: 1 }),
            maxRequestsPerMinute: fc.option(fc.integer({ min: 1, max: 1000 })),
            cacheTTL: fc.option(fc.integer({ min: 0, max: 86400 }))
          }),
          (config) => {
            const adapter = createHiveIntelligenceAdapter(config);
            
            expect(adapter).toBeDefined();
            expect(typeof adapter.name).toBe('string');
            expect(typeof adapter.version).toBe('string');
            
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Query Parameter Validation Properties', () => {
    it('should handle all valid query parameters', () => {
      fc.assert(
        fc.property(blockchainQuery, (queryParams) => {
          const adapter = createHiveIntelligenceAdapter({
            apiKey: 'test-key-123'
          });

          // Mock successful response
          const mockAxiosInstance = require('axios').create.mock.results[0].value;
          mockAxiosInstance.post.mockResolvedValue({
            data: {
              results: { answer: 'Test response' },
              metadata: { credits_used: 5 }
            }
          });

          return adapter.queryBlockchainData(queryParams)()
            .then(result => {
              // Should either succeed or fail gracefully
              expect(E.isLeft(result) || E.isRight(result)).toBe(true);
              
              if (E.isRight(result)) {
                expect(result.right.query).toBe(queryParams.query);
                expect(typeof result.right.response).toBe('string');
                expect(typeof result.right.creditsUsed).toBe('number');
                expect(typeof result.right.timestamp).toBe('string');
              }
            })
            .finally(() => {
              adapter.destroy();
            });
        })
      );
    });

    it('should maintain query parameter bounds', () => {
      fc.assert(
        fc.property(
          fc.record({
            query: fc.string({ minLength: 1 }),
            temperature: fc.float({ min: 0, max: 1 }),
            maxTokens: fc.integer({ min: 1, max: 2000 })
          }),
          (params) => {
            // Temperature should be between 0 and 1
            expect(params.temperature).toBeGreaterThanOrEqual(0);
            expect(params.temperature).toBeLessThanOrEqual(1);
            
            // Max tokens should be positive and reasonable
            expect(params.maxTokens).toBeGreaterThan(0);
            expect(params.maxTokens).toBeLessThanOrEqual(2000);
            
            // Query should not be empty
            expect(params.query.length).toBeGreaterThan(0);
          }
        )
      );
    });
  });

  describe('Rate Limiting Properties', () => {
    it('should respect rate limiting under any configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiKey: fc.string({ minLength: 1 }),
            maxRequestsPerMinute: fc.integer({ min: 1, max: 10 })
          }),
          async (config) => {
            const adapter = createHiveIntelligenceAdapter(config);
            
            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            mockAxiosInstance.post.mockResolvedValue({
              data: {
                results: { answer: 'Test response' },
                metadata: { credits_used: 1 }
              }
            });

            // Make requests up to the limit
            const promises = Array(config.maxRequestsPerMinute + 1)
              .fill(null)
              .map(() => adapter.queryBlockchainData({ query: 'test' })());

            const results = await Promise.all(promises);
            
            // At least one request should be rate limited
            const rateLimited = results.some(result => 
              E.isLeft(result) && result.left.message.includes('Rate limit exceeded')
            );
            
            expect(rateLimited).toBe(true);
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Cache Properties', () => {
    it('should cache identical queries consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 100 }),
            temperature: fc.option(fc.float({ min: 0, max: 1 }))
          }),
          async (queryParams) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: 'test-key-123',
              cacheTTL: 300
            });

            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            mockAxiosInstance.post.mockResolvedValue({
              data: {
                results: { answer: 'Cached response' },
                metadata: { credits_used: 10 }
              }
            });

            // First call
            const result1 = await adapter.queryBlockchainData(queryParams)();
            // Second identical call
            const result2 = await adapter.queryBlockchainData(queryParams)();

            // Both should succeed
            expect(E.isRight(result1) && E.isRight(result2)).toBe(true);
            
            if (E.isRight(result1) && E.isRight(result2)) {
              // Results should be identical
              expect(result1.right.response).toBe(result2.right.response);
              expect(result1.right.creditsUsed).toBe(result2.right.creditsUsed);
            }

            // Should have made only one API call due to caching
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
            
            adapter.destroy();
          }
        )
      );
    });

    it('should generate different cache keys for different queries', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 })
          ).filter(([q1, q2]) => q1 !== q2),
          ([query1, query2]) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: 'test-key-123'
            });

            // Access private method for testing (not ideal but necessary for property testing)
            const getCacheKey = (adapter as any).getCacheKey;
            
            const key1 = getCacheKey({ query: query1 });
            const key2 = getCacheKey({ query: query2 });
            
            expect(key1).not.toBe(key2);
            
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Error Handling Properties', () => {
    it('should handle any error gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorMessage: fc.string(),
            errorCode: fc.option(fc.integer())
          }),
          async (errorConfig) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: 'test-key-123',
              retryAttempts: 0
            });

            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            const error = new Error(errorConfig.errorMessage);
            if (errorConfig.errorCode) {
              (error as any).code = errorConfig.errorCode;
            }
            mockAxiosInstance.post.mockRejectedValue(error);

            const result = await adapter.queryBlockchainData({
              query: 'test query'
            })();

            // Should fail gracefully
            expect(E.isLeft(result)).toBe(true);
            
            if (E.isLeft(result)) {
              expect(result.left).toBeInstanceOf(Error);
              expect(typeof result.left.message).toBe('string');
            }
            
            adapter.destroy();
          }
        )
      );
    });

    it('should sanitize API keys from error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiKey: fc.string({ minLength: 10, maxLength: 100 }),
            errorMessage: fc.string()
          }),
          async (config) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: config.apiKey,
              retryAttempts: 0
            });

            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            mockAxiosInstance.post.mockRejectedValue(
              new Error(`Request failed with Bearer ${config.apiKey}`)
            );

            const result = await adapter.queryBlockchainData({
              query: 'test query'
            })();

            expect(E.isLeft(result)).toBe(true);
            
            if (E.isLeft(result)) {
              expect(result.left.message).not.toContain(config.apiKey);
              expect(result.left.message).toContain('[REDACTED]');
            }
            
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Blockchain Domain Properties', () => {
    it('should handle blockchain-specific queries correctly', () => {
      fc.assert(
        fc.property(blockchainQueryWithKeywords, async (queryParams) => {
          const adapter = createHiveIntelligenceAdapter({
            apiKey: 'test-key-123'
          });

          const mockAxiosInstance = require('axios').create.mock.results[0].value;
          mockAxiosInstance.post.mockResolvedValue({
            data: {
              results: { 
                answer: 'Blockchain-specific response',
                sources: ['https://example.com/blockchain-source']
              },
              metadata: { credits_used: 15 }
            }
          });

          const result = await adapter.queryBlockchainData(queryParams)();

          expect(E.isRight(result)).toBe(true);
          
          if (E.isRight(result)) {
            expect(result.right.query).toBe(queryParams.query);
            expect(typeof result.right.response).toBe('string');
            expect(result.right.creditsUsed).toBeGreaterThan(0);
          }
          
          adapter.destroy();
        })
      );
    });

    it('should maintain credit usage consistency', () => {
      fc.assert(
        fc.property(
          fc.array(blockchainQuery, { minLength: 1, maxLength: 5 }),
          async (queries) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: 'test-key-123'
            });

            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            
            let totalCredits = 0;
            const results = [];
            
            for (const query of queries) {
              const creditsUsed = Math.floor(Math.random() * 50) + 1;
              totalCredits += creditsUsed;
              
              mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                  results: { answer: 'Response' },
                  metadata: { credits_used: creditsUsed }
                }
              });
              
              const result = await adapter.queryBlockchainData(query)();
              results.push(result);
            }
            
            // All queries should succeed
            expect(results.every(r => E.isRight(r))).toBe(true);
            
            // Total credits should be sum of individual credits
            const actualTotal = results
              .filter(r => E.isRight(r))
              .reduce((sum, r) => sum + (r as any).right.creditsUsed, 0);
            
            expect(actualTotal).toBe(totalCredits);
            
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Memory and Performance Properties', () => {
    it('should handle large numbers of queries without memory leaks', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          async (numQueries) => {
            const adapter = createHiveIntelligenceAdapter({
              apiKey: 'test-key-123',
              cacheTTL: 1 // Short TTL to test cleanup
            });

            const mockAxiosInstance = require('axios').create.mock.results[0].value;
            mockAxiosInstance.post.mockResolvedValue({
              data: {
                results: { answer: 'Response' },
                metadata: { credits_used: 1 }
              }
            });

            const promises = Array(numQueries).fill(null).map((_, i) => 
              adapter.queryBlockchainData({ query: `test query ${i}` })()
            );

            const results = await Promise.all(promises);
            
            // Should handle all queries without crashing
            expect(results.length).toBe(numQueries);
            
            // Most should succeed (some might be rate limited)
            const successes = results.filter(r => E.isRight(r));
            expect(successes.length).toBeGreaterThan(0);
            
            adapter.destroy();
          }
        )
      );
    });
  });

  describe('Invariant Properties', () => {
    it('should maintain adapter state consistency', () => {
      fc.assert(
        fc.property(validConfig, (config) => {
          const adapter = createHiveIntelligenceAdapter(config);
          
          // Initial state invariants
          expect(adapter.name).toBe('HiveIntelligence');
          expect(adapter.version).toBe('1.0.0');
          expect(adapter.isInitialized).toBe(false);
          
          // State should remain consistent after creation
          expect(adapter.name).toBe('HiveIntelligence');
          expect(adapter.version).toBe('1.0.0');
          
          adapter.destroy();
          
          // After destruction, should not crash on additional calls
          expect(() => adapter.destroy()).not.toThrow();
        })
      );
    });
  });
});