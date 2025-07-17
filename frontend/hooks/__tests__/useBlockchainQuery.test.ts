import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import useBlockchainQuery from '../chat/useBlockchainQuery';
import { BlockchainQueryParams } from '../chat/useBlockchainQuery';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock logger
jest.mock('@lib/logger', () => ({
  logger: {
    safe: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('useBlockchainQuery', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useBlockchainQuery());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastQuery).toBeNull();
      expect(result.current.creditsUsed).toBe(0);
      expect(result.current.totalQueries).toBe(0);
      expect(result.current.lastQueryTime).toBeNull();
      expect(result.current.rateLimited).toBe(false);
      expect(result.current.hasHistory).toBe(false);
      expect(result.current.canQuery).toBe(true);
    });
  });

  describe('Successful Queries', () => {
    it('should handle successful blockchain query', async () => {
      const mockResponse = {
        success: true,
        data: {
          query: 'What is SEI network?',
          response: 'SEI is a Layer 1 blockchain optimized for trading',
          sources: ['https://sei.io'],
          creditsUsed: 25,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        const response = await result.current.query({
          query: 'What is SEI network?',
          userId: 'test-user',
          sessionId: 'test-session'
        });

        expect(response).toEqual(mockResponse.data);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockResponse.data);
        expect(result.current.error).toBeNull();
        expect(result.current.creditsUsed).toBe(25);
        expect(result.current.totalQueries).toBe(1);
        expect(result.current.hasHistory).toBe(true);
      });
    });

    it('should handle query with custom parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          query: 'What is DeFi?',
          response: 'DeFi is decentralized finance...',
          sources: ['https://defi.com'],
          creditsUsed: 30,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({
          query: 'What is DeFi?',
          userId: 'test-user',
          sessionId: 'test-session',
          temperature: 0.7,
          includeDataSources: true,
          maxTokens: 1000,
          contextAware: true
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/blockchain/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'What is DeFi?',
          userId: 'test-user',
          sessionId: 'test-session',
          temperature: 0.7,
          includeDataSources: true,
          maxTokens: 1000,
          contextAware: true
        }),
        signal: expect.any(AbortSignal)
      });
    });

    it('should call success callback on successful query', async () => {
      const mockResponse = {
        success: true,
        data: {
          query: 'Test query',
          response: 'Test response',
          sources: [],
          creditsUsed: 15,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      });

      const onSuccess = jest.fn();
      const { result } = renderHook(() => useBlockchainQuery({ onSuccess }));

      await act(async () => {
        await result.current.query({ query: 'Test query' });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse.data);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        const response = await result.current.query({
          query: '', // Empty query should fail validation
          userId: 'test-user'
        });

        expect(response).toBeNull();
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Query cannot be empty');
      expect(result.current.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Network error');
      expect(result.current.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' })
      });

      const onRateLimit = jest.fn();
      const { result } = renderHook(() => useBlockchainQuery({ onRateLimit }));

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.rateLimited).toBe(true);
      expect(result.current.rateLimited).toBe(true);
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Internal server error',
          details: 'Database connection failed'
        })
      });

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Database connection failed');
    });

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' }, // Wrong content type
        text: () => Promise.resolve('<html>Error page</html>')
      });

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Invalid response format from server');
      expect(result.current.error?.code).toBe('INVALID_RESPONSE');
    });

    it('should call error callback on failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const onError = jest.fn();
      const { result } = renderHook(() => useBlockchainQuery({ onError }));

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error'
      }));
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure when autoRetry is enabled', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            success: true,
            data: {
              query: 'Test query',
              response: 'Success after retry',
              sources: [],
              creditsUsed: 20,
              timestamp: '2024-01-01T00:00:00Z'
            }
          })
        });

      const { result } = renderHook(() => useBlockchainQuery({
        autoRetry: true,
        retryAttempts: 2,
        retryDelay: 100
      }));

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      // Fast forward timers to trigger retry
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.data?.response).toBe('Success after retry');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should not retry on rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' })
      });

      const { result } = renderHook(() => useBlockchainQuery({
        autoRetry: true,
        retryAttempts: 3
      }));

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.error?.rateLimited).toBe(true);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel previous request when new one is made', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      global.AbortController = jest.fn(() => mockAbortController);

      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => useBlockchainQuery());

      // Start first query
      act(() => {
        result.current.query({ query: 'First query' });
      });

      // Start second query immediately
      act(() => {
        result.current.query({ query: 'Second query' });
      });

      expect(abortSpy).toHaveBeenCalled();
    });

    it('should handle abort errors gracefully', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({
          query: 'Test query',
          userId: 'test-user'
        });
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Request was cancelled');
      expect(result.current.error?.code).toBe('CANCELLED');
    });
  });

  describe('History Management', () => {
    it('should track query history', async () => {
      const queries = [
        { query: 'What is SEI?', response: 'SEI is...', creditsUsed: 10 },
        { query: 'What is DeFi?', response: 'DeFi is...', creditsUsed: 15 },
        { query: 'How to stake?', response: 'Staking is...', creditsUsed: 12 }
      ];

      for (const queryData of queries) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            success: true,
            data: {
              ...queryData,
              sources: [],
              timestamp: '2024-01-01T00:00:00Z'
            }
          })
        });
      }

      const { result } = renderHook(() => useBlockchainQuery());

      for (const queryData of queries) {
        await act(async () => {
          await result.current.query({ query: queryData.query });
        });
      }

      const history = result.current.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].query).toBe('How to stake?'); // Most recent first
      expect(history[1].query).toBe('What is DeFi?');
      expect(history[2].query).toBe('What is SEI?');
    });

    it('should limit history size', async () => {
      // Mock 55 queries (more than MAX_HISTORY_SIZE of 50)
      const queries = Array(55).fill(null).map((_, i) => ({
        query: `Query ${i}`,
        response: `Response ${i}`,
        creditsUsed: 10
      }));

      for (const queryData of queries) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            success: true,
            data: {
              ...queryData,
              sources: [],
              timestamp: '2024-01-01T00:00:00Z'
            }
          })
        });
      }

      const { result } = renderHook(() => useBlockchainQuery());

      for (const queryData of queries) {
        await act(async () => {
          await result.current.query({ query: queryData.query });
        });
      }

      const history = result.current.getHistory();
      expect(history).toHaveLength(50); // Should be limited to 50
      expect(history[0].query).toBe('Query 54'); // Most recent
      expect(history[49].query).toBe('Query 5'); // Oldest kept
    });

    it('should clear history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: true,
          data: {
            query: 'Test query',
            response: 'Test response',
            sources: [],
            creditsUsed: 10,
            timestamp: '2024-01-01T00:00:00Z'
          }
        })
      });

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({ query: 'Test query' });
      });

      expect(result.current.hasHistory).toBe(true);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.hasHistory).toBe(false);
      expect(result.current.creditsUsed).toBe(0);
      expect(result.current.totalQueries).toBe(0);
    });
  });

  describe('Usage Statistics', () => {
    it('should calculate usage statistics correctly', async () => {
      const queries = [
        { success: true, creditsUsed: 10 },
        { success: true, creditsUsed: 15 },
        { success: false, creditsUsed: 0 },
        { success: true, creditsUsed: 20 }
      ];

      for (const queryData of queries) {
        if (queryData.success) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
              success: true,
              data: {
                query: 'Test query',
                response: 'Test response',
                sources: [],
                creditsUsed: queryData.creditsUsed,
                timestamp: '2024-01-01T00:00:00Z'
              }
            })
          });
        } else {
          mockFetch.mockRejectedValueOnce(new Error('Query failed'));
        }
      }

      const { result } = renderHook(() => useBlockchainQuery());

      for (let i = 0; i < queries.length; i++) {
        await act(async () => {
          await result.current.query({ query: `Test query ${i}` });
        });
      }

      const stats = result.current.getUsageStats();
      expect(stats.totalQueries).toBe(4);
      expect(stats.successfulQueries).toBe(3);
      expect(stats.failedQueries).toBe(1);
      expect(stats.totalCreditsUsed).toBe(45);
      expect(stats.averageCreditsPerQuery).toBe(11.25);
      expect(stats.successRate).toBe(0.75);
    });

    it('should handle empty history in statistics', () => {
      const { result } = renderHook(() => useBlockchainQuery());

      const stats = result.current.getUsageStats();
      expect(stats.totalQueries).toBe(0);
      expect(stats.successfulQueries).toBe(0);
      expect(stats.failedQueries).toBe(0);
      expect(stats.totalCreditsUsed).toBe(0);
      expect(stats.averageCreditsPerQuery).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Error Clearing', () => {
    it('should clear errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useBlockchainQuery());

      await act(async () => {
        await result.current.query({ query: 'Test query' });
      });

      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.rateLimited).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      global.AbortController = jest.fn(() => mockAbortController);

      const { unmount } = renderHook(() => useBlockchainQuery());

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });
});