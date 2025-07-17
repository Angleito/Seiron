import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HiveIntelligenceAdapter, createHiveIntelligenceAdapter, HiveIntelligenceConfig } from '../../adapters/HiveIntelligenceAdapter';
import * as E from 'fp-ts/Either';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('HiveIntelligenceAdapter', () => {
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
    adapter.destroy();
  });

  describe('Constructor', () => {
    it('should create adapter with correct configuration', () => {
      expect(adapter.name).toBe('HiveIntelligence');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.isInitialized).toBe(false);
    });

    it('should encrypt API key in memory', () => {
      // API key should be encrypted and not directly accessible
      expect(adapter).not.toHaveProperty('apiKey');
      expect(adapter).toHaveProperty('encryptedApiKey');
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
  });

  describe('initialize', () => {
    it('should initialize successfully with valid API key', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });

      const result = await adapter.initialize()();
      
      expect(E.isRight(result)).toBe(true);
      expect(adapter.isInitialized).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search', {
        query: 'What is Sei network?',
        temperature: 0.1,
        include_data_sources: false
      });
    });

    it('should fail to initialize with invalid API key', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await adapter.initialize()();
      
      expect(E.isLeft(result)).toBe(true);
      expect(adapter.isInitialized).toBe(false);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Failed to initialize HiveIntelligence adapter');
      }
    });
  });

  describe('queryBlockchainData', () => {
    beforeEach(async () => {
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
        expect(result.right).toEqual({
          query: 'What is Sei network?',
          response: 'Sei is a Layer 1 blockchain optimized for trading',
          sources: ['https://example.com/source1', 'https://example.com/source2'],
          creditsUsed: 25,
          timestamp: expect.any(String)
        });
      }
    });

    it('should handle rate limiting', async () => {
      // Make 21 requests to exceed rate limit (max 20 per minute)
      const promises = Array(21).fill(null).map(() => 
        adapter.queryBlockchainData({ query: 'test query' })()
      );

      const results = await Promise.all(promises);
      
      // Last request should be rate limited
      const lastResult = results[results.length - 1];
      expect(E.isLeft(lastResult)).toBe(true);
      if (E.isLeft(lastResult)) {
        expect(lastResult.left.message).toContain('Rate limit exceeded');
      }
    });

    it('should use cache for duplicate queries', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      const mockResponse = {
        data: {
          results: { answer: 'Cached response' },
          metadata: { credits_used: 10 }
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const query = { query: 'What is DeFi?' };
      
      // First call should hit the API
      const result1 = await adapter.queryBlockchainData(query)();
      expect(E.isRight(result1)).toBe(true);
      
      // Second call should use cache
      const result2 = await adapter.queryBlockchainData(query)();
      expect(E.isRight(result2)).toBe(true);
      
      // Should only have made one API call
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      
      // First call fails, second succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            results: { answer: 'Success after retry' },
            metadata: { credits_used: 15 }
          }
        });

      const result = await adapter.queryBlockchainData({
        query: 'retry test',
        retryAttempts: 2
      } as any)();

      expect(E.isRight(result)).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should sanitize errors to prevent API key leakage', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Request failed with Bearer test-api-key-123')
      );

      const result = await adapter.queryBlockchainData({
        query: 'test query'
      })();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).not.toContain('test-api-key-123');
        expect(result.left.message).toContain('Bearer [REDACTED]');
      }
    });
  });

  describe('getUsageInfo', () => {
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

  describe('Cache Management', () => {
    beforeEach(async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });
      await adapter.initialize()();
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
      
      // Should have made 2 API calls (not using cache)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should cleanup expired cache entries', async () => {
      // Create adapter with very short cache TTL
      const shortTTLAdapter = createHiveIntelligenceAdapter({
        ...config,
        cacheTTL: 0.1 // 100ms
      });

      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          results: { answer: 'Test response' },
          metadata: { credits_used: 5 }
        }
      });

      await shortTTLAdapter.initialize()();
      
      // Make a query
      await shortTTLAdapter.queryBlockchainData({ query: 'test' })();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Make same query - should hit API again
      await shortTTLAdapter.queryBlockchainData({ query: 'test' })();
      
      // Should have made 2 API calls
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      
      shortTTLAdapter.destroy();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });
      await adapter.initialize()();
    });

    it('should handle network errors gracefully', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.queryBlockchainData({
        query: 'test query',
        retryAttempts: 0
      } as any)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('API request failed');
      }
    });

    it('should handle malformed API responses', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          // Missing required fields
          invalid: 'response'
        }
      });

      const result = await adapter.queryBlockchainData({
        query: 'test query'
      })();

      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit events on successful operations', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { results: { answer: 'test' }, metadata: { credits_used: 1 } }
      });

      const initListener = jest.fn();
      const queryListener = jest.fn();
      const errorListener = jest.fn();

      adapter.on('initialized', initListener);
      adapter.on('query', queryListener);
      adapter.on('error', errorListener);

      await adapter.initialize()();
      expect(initListener).toHaveBeenCalled();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          results: { answer: 'Test response' },
          metadata: { credits_used: 10 }
        }
      });

      await adapter.queryBlockchainData({ query: 'test' })();
      expect(queryListener).toHaveBeenCalledWith({
        query: 'test',
        creditsUsed: 10,
        cached: false
      });

      expect(errorListener).not.toHaveBeenCalled();
    });

    it('should emit error events on failures', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Test error'));

      const errorListener = jest.fn();
      adapter.on('error', errorListener);

      await adapter.queryBlockchainData({
        query: 'test query',
        retryAttempts: 0
      } as any)();

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      adapter.destroy();
      
      expect(adapter.listenerCount('initialized')).toBe(0);
      expect(adapter.listenerCount('query')).toBe(0);
      expect(adapter.listenerCount('error')).toBe(0);
      
      consoleSpy.mockRestore();
    });
  });
});

describe('createHiveIntelligenceAdapter', () => {
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