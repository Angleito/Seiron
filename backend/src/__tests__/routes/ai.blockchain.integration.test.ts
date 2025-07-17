import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/test-app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database';
import { createMockHiveIntelligenceService } from '../helpers/mock-hive-intelligence';
import { cacheService } from '../../utils/cache';

describe('Blockchain Query API Integration Tests', () => {
  let app: Express;
  let mockHiveService: ReturnType<typeof createMockHiveIntelligenceService>;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    mockHiveService = createMockHiveIntelligenceService();
    app = createTestApp();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    mockHiveService.cleanup();
  });

  beforeEach(async () => {
    testUserId = `test-user-${Date.now()}`;
    testSessionId = `test-session-${Date.now()}`;
    mockHiveService.reset();
    
    // Setup environment for tests
    process.env.HIVE_INTELLIGENCE_API_KEY = 'test-api-key-123';
    process.env.HIVE_INTELLIGENCE_BASE_URL = 'http://localhost:3001';
    process.env.HIVE_INTELLIGENCE_RATE_LIMIT = '20';
    process.env.HIVE_INTELLIGENCE_CACHE_TTL = '300';
  });

  afterEach(async () => {
    await cacheService.flushAll()();
  });

  describe('POST /api/ai/blockchain/query', () => {
    it('should successfully process blockchain query', async () => {
      const query = 'What is the current price of SEI token?';
      const expectedResponse = {
        query,
        response: 'SEI token is currently trading at $0.45 with a 24h volume of $12.5M',
        sources: ['https://coingecko.com/sei', 'https://coinmarketcap.com/sei'],
        creditsUsed: 25,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId,
          temperature: 0.3,
          includeDataSources: true,
          maxTokens: 500
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...expectedResponse,
          contextAware: false,
          enhancedWithMemory: false
        }
      });
    });

    it('should handle context-aware queries with existing memory', async () => {
      // First, set up some portfolio context in memory
      const portfolioData = {
        totalValue: 10000,
        tokens: [
          { symbol: 'SEI', amount: 1000, value: 450 },
          { symbol: 'USDC', amount: 5000, value: 5000 }
        ]
      };

      await request(app)
        .post('/api/ai/memory/save')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          key: 'portfolio_data',
          value: portfolioData,
          category: 'context'
        })
        .expect(200);

      const query = 'How is my SEI position performing?';
      const expectedResponse = {
        query: expect.stringContaining(query),
        response: 'Based on your portfolio, your SEI position of 1000 tokens is performing well...',
        sources: ['https://sei.io/performance'],
        creditsUsed: 30,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(expect.stringContaining(query), expectedResponse);

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId,
          contextAware: true,
          includeDataSources: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contextAware).toBe(true);
      expect(response.body.data.enhancedWithMemory).toBe(true);
    });

    it('should save query to memory when user session is provided', async () => {
      const query = 'What is staking on Sei Network?';
      const expectedResponse = {
        query,
        response: 'Staking on Sei Network allows you to earn rewards by delegating your SEI tokens...',
        sources: ['https://sei.io/staking'],
        creditsUsed: 20,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      // Check that query was saved to memory
      const memoryResponse = await request(app)
        .get('/api/ai/memory/search')
        .query({
          userId: testUserId,
          sessionId: testSessionId,
          query: 'staking'
        })
        .expect(200);

      expect(memoryResponse.body.memories).toHaveLength(1);
      expect(memoryResponse.body.memories[0].value.query).toBe(query);
      expect(memoryResponse.body.memories[0].value.blockchainQuery).toBe(true);
    });

    it('should handle rate limiting properly', async () => {
      const query = 'What is DeFi?';
      const expectedResponse = {
        query,
        response: 'DeFi stands for Decentralized Finance...',
        sources: [],
        creditsUsed: 10,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      // Make multiple requests to trigger rate limiting
      const promises = Array(35).fill(null).map(() =>
        request(app)
          .post('/api/ai/blockchain/query')
          .send({ query, userId: testUserId, sessionId: testSessionId })
      );

      const responses = await Promise.all(promises);
      
      // Some should succeed, some should be rate limited
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(successful.length).toBeGreaterThan(0);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper error message
      rateLimited.forEach(response => {
        expect(response.body.message).toContain('Too many blockchain query requests');
      });
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query: '', // Invalid empty query
          temperature: 1.5, // Invalid temperature > 1
          maxTokens: -1 // Invalid negative tokens
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(3);
    });

    it('should handle Hive Intelligence API errors gracefully', async () => {
      const query = 'What is blockchain?';
      
      // Mock API error
      mockHiveService.mockError(query, new Error('API service unavailable'));

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Blockchain query failed');
      expect(response.body.details).toContain('API service unavailable');
    });

    it('should handle adapter initialization failures', async () => {
      // Remove API key to cause initialization failure
      delete process.env.HIVE_INTELLIGENCE_API_KEY;

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query: 'What is SEI?',
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Blockchain query failed');
    });

    it('should handle malformed Hive Intelligence responses', async () => {
      const query = 'What is DeFi?';
      
      // Mock malformed response
      mockHiveService.mockMalformedResponse(query);

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Blockchain query failed');
    });

    it('should handle concurrent queries efficiently', async () => {
      const queries = [
        'What is SEI network?',
        'How to stake SEI?',
        'What is DragonSwap?',
        'How to provide liquidity?',
        'What are the risks of DeFi?'
      ];

      // Mock all queries
      queries.forEach(query => {
        mockHiveService.mockQuery(query, {
          query,
          response: `Response for: ${query}`,
          sources: [],
          creditsUsed: 15,
          timestamp: new Date().toISOString()
        });
      });

      const promises = queries.map(query =>
        request(app)
          .post('/api/ai/blockchain/query')
          .send({
            query,
            userId: testUserId,
            sessionId: testSessionId
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Each should have unique response
      const responseTexts = responses.map(r => r.body.data.response);
      expect(new Set(responseTexts).size).toBe(queries.length);
    });

    it('should handle special characters in queries', async () => {
      const query = 'What is the price of $SEI token? How about 50% APY?';
      const expectedResponse = {
        query,
        response: 'SEI token price information with special characters handled properly',
        sources: [],
        creditsUsed: 12,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBe(query);
    });

    it('should handle very long queries', async () => {
      const query = 'A'.repeat(1000) + ' What is blockchain?';
      const expectedResponse = {
        query,
        response: 'Response to very long query',
        sources: [],
        creditsUsed: 50,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Query Context Enhancement', () => {
    it('should enhance query with portfolio context', async () => {
      const portfolioData = {
        totalValue: 25000,
        tokens: [
          { symbol: 'SEI', amount: 5000, value: 2250 },
          { symbol: 'ATOM', amount: 100, value: 1200 }
        ]
      };

      // Set up portfolio context
      await request(app)
        .post('/api/ai/memory/save')
        .send({
          userId: testUserId,
          sessionId: testSessionId,
          key: 'portfolio_data',
          value: portfolioData,
          category: 'context'
        })
        .expect(200);

      const query = 'Should I buy more SEI?';
      
      // Mock enhanced query (should include portfolio context)
      mockHiveService.mockQuery(
        expect.stringContaining('Context: User has portfolio data including totalValue'),
        {
          query: expect.stringContaining(query),
          response: 'Based on your current SEI holdings of 5000 tokens...',
          sources: [],
          creditsUsed: 35,
          timestamp: expect.any(String)
        }
      );

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId,
          contextAware: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enhancedWithMemory).toBe(true);
    });

    it('should enhance query with recent blockchain queries', async () => {
      // Create some blockchain query history
      const previousQueries = [
        'What is staking?',
        'How to stake SEI?',
        'What are staking rewards?'
      ];

      for (const prevQuery of previousQueries) {
        await request(app)
          .post('/api/ai/memory/save')
          .send({
            userId: testUserId,
            sessionId: testSessionId,
            key: `blockchain_query_${Date.now()}`,
            value: {
              query: prevQuery,
              blockchainQuery: true,
              timestamp: new Date().toISOString()
            },
            category: 'interaction'
          })
          .expect(200);
      }

      const query = 'What are the risks of staking?';
      
      // Mock enhanced query with recent context
      mockHiveService.mockQuery(
        expect.stringContaining('Recent queries:'),
        {
          query: expect.stringContaining(query),
          response: 'Based on your recent staking questions, the risks include...',
          sources: [],
          creditsUsed: 40,
          timestamp: expect.any(String)
        }
      );

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId,
          contextAware: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enhancedWithMemory).toBe(true);
    });
  });

  describe('Memory Integration', () => {
    it('should save successful queries to memory', async () => {
      const query = 'What is yield farming?';
      const expectedResponse = {
        query,
        response: 'Yield farming is a DeFi strategy...',
        sources: ['https://defi.com/yield-farming'],
        creditsUsed: 22,
        timestamp: expect.any(String)
      };

      mockHiveService.mockQuery(query, expectedResponse);

      await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      // Verify memory was saved
      const memoryResponse = await request(app)
        .get('/api/ai/memory/load')
        .query({
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      const blockchainMemories = memoryResponse.body.memories.filter(
        (m: any) => m.value.blockchainQuery
      );

      expect(blockchainMemories).toHaveLength(1);
      expect(blockchainMemories[0].value.query).toBe(query);
      expect(blockchainMemories[0].value.response).toBe(expectedResponse.response);
      expect(blockchainMemories[0].value.creditsUsed).toBe(expectedResponse.creditsUsed);
    });

    it('should not save failed queries to memory', async () => {
      const query = 'What is DeFi?';
      
      mockHiveService.mockError(query, new Error('Service unavailable'));

      await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(500);

      // Verify no memory was saved
      const memoryResponse = await request(app)
        .get('/api/ai/memory/load')
        .query({
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      const blockchainMemories = memoryResponse.body.memories.filter(
        (m: any) => m.value.blockchainQuery
      );

      expect(blockchainMemories).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle adapter cleanup on errors', async () => {
      const query = 'What is blockchain?';
      
      // Mock error that should trigger cleanup
      mockHiveService.mockError(query, new Error('Adapter error'));

      const response = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      
      // Subsequent requests should still work (adapter should be recreated)
      mockHiveService.mockQuery(query, {
        query,
        response: 'Blockchain is a distributed ledger...',
        sources: [],
        creditsUsed: 15,
        timestamp: new Date().toISOString()
      });

      const retryResponse = await request(app)
        .post('/api/ai/blockchain/query')
        .send({
          query,
          userId: testUserId,
          sessionId: testSessionId
        })
        .expect(200);

      expect(retryResponse.body.success).toBe(true);
    });
  });
});