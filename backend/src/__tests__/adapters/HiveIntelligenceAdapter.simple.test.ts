import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HiveIntelligenceAdapter, createHiveIntelligenceAdapter, HiveIntelligenceConfig } from '../../adapters/HiveIntelligenceAdapter';
import * as E from 'fp-ts/Either';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger module completely
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('HiveIntelligenceAdapter Simple Tests', () => {
  let adapter: HiveIntelligenceAdapter;
  let config: HiveIntelligenceConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key-123',
      baseUrl: 'https://api.test.com/v1',
      maxRequestsPerMinute: 20,
      cacheTTL: 300,
      retryAttempts: 2,
      retryDelay: 1000
    };

    // Mock axios.create
    const mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    adapter = createHiveIntelligenceAdapter(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    try {
      adapter.destroy();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Basic Functionality', () => {
    it('should create adapter with correct configuration', () => {
      expect(adapter.name).toBe('HiveIntelligence');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.isInitialized).toBe(false);
    });

    it('should setup axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com/v1',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Seiron-Chatbot/1.0'
        }
      });
    });

    it('should have encrypted API key property', () => {
      expect(adapter).toHaveProperty('encryptedApiKey');
      expect(adapter).not.toHaveProperty('apiKey');
    });
  });

  describe('Query Functionality', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });
      
      await adapter.initialize()();
    });

    it('should successfully query blockchain data', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      const mockResponse = {
        data: {
          results: {
            answer: 'Sei is a Layer 1 blockchain optimized for trading',
            sources: ['https://example.com/source1', 'https://example.com/source2']
          },
          metadata: {
            credits_used: 25
          }
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await adapter.queryBlockchainData({
        query: 'What is Sei network?',
        temperature: 0.3,
        includeDataSources: true,
        maxTokens: 500
      })();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.query).toBe('What is Sei network?');
        expect(result.right.response).toBe('Sei is a Layer 1 blockchain optimized for trading');
        expect(result.right.sources).toEqual(['https://example.com/source1', 'https://example.com/source2']);
        expect(result.right.creditsUsed).toBe(25);
        expect(result.right.timestamp).toBeDefined();
      }
    });

    it('should handle API errors gracefully', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await adapter.queryBlockchainData({
        query: 'Test query'
      })();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('API request failed');
      }
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limit
      const promises = Array(25).fill(null).map(() => 
        adapter.queryBlockchainData({ query: 'test query' })()
      );

      const results = await Promise.all(promises);
      
      // Some should be rate limited
      const rateLimited = results.some(result => 
        E.isLeft(result) && result.left.message.includes('Rate limit exceeded')
      );
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Cache Functionality', () => {
    beforeEach(async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });
      await adapter.initialize()();
    });

    it('should cache duplicate queries', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      const mockResponse = {
        data: {
          results: { answer: 'Cached response' },
          metadata: { credits_used: 10 }
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const query = { query: 'What is DeFi?' };
      
      // First call
      const result1 = await adapter.queryBlockchainData(query)();
      expect(E.isRight(result1)).toBe(true);
      
      // Second call should use cache
      const result2 = await adapter.queryBlockchainData(query)();
      expect(E.isRight(result2)).toBe(true);
      
      // Should only have made one API call
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on reset', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          results: { answer: 'Test response' },
          metadata: { credits_used: 5 }
        }
      });

      // Make a query to populate cache
      await adapter.queryBlockchainData({ query: 'test' })();
      
      // Reset should clear cache
      adapter.reset();
      
      // Next query should hit API again
      await adapter.queryBlockchainData({ query: 'test' })();
      
      // Should have made 2 API calls
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Usage Information', () => {
    it('should return usage information', async () => {
      const result = await adapter.getUsageInfo()();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual({
          creditsUsed: 0,
          dailyLimit: 10
        });
      }
    });
  });

  describe('Factory Function', () => {
    it('should create adapter with factory function', () => {
      const config: HiveIntelligenceConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://test.com'
      };

      const adapter = createHiveIntelligenceAdapter(config);
      
      expect(adapter).toBeInstanceOf(HiveIntelligenceAdapter);
      expect(adapter.name).toBe('HiveIntelligence');
      expect(adapter.version).toBe('1.0.0');
      
      adapter.destroy();
    });
  });
});