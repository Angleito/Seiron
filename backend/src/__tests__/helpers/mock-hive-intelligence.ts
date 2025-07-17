import { Server } from 'http';
import express from 'express';
import { BlockchainQueryResponse } from '../../adapters/HiveIntelligenceAdapter';

export interface MockHiveIntelligenceService {
  mockQuery: (query: string, response: Partial<BlockchainQueryResponse>) => void;
  mockError: (query: string, error: Error) => void;
  mockMalformedResponse: (query: string) => void;
  reset: () => void;
  cleanup: () => void;
  getRequestHistory: () => any[];
}

export const createMockHiveIntelligenceService = (): MockHiveIntelligenceService => {
  const app = express();
  let server: Server;
  const mockResponses = new Map<string, any>();
  const requestHistory: any[] = [];

  app.use(express.json());

  // Mock the search endpoint
  app.post('/search', (req, res) => {
    const { query, temperature, include_data_sources, max_tokens } = req.body;
    
    // Log request for testing
    requestHistory.push({
      query,
      temperature,
      include_data_sources,
      max_tokens,
      timestamp: new Date().toISOString()
    });

    // Check for mocked responses
    const mockResponse = mockResponses.get(query);
    if (mockResponse) {
      if (mockResponse.error) {
        return res.status(500).json({
          error: mockResponse.error.message,
          code: 'MOCK_ERROR'
        });
      }
      
      if (mockResponse.malformed) {
        return res.status(200).json({
          // Malformed response missing required fields
          invalid: 'response',
          data: 'malformed'
        });
      }

      // Transform response to match Hive Intelligence API format
      const hiveResponse = {
        results: {
          answer: mockResponse.response,
          sources: mockResponse.sources || []
        },
        metadata: {
          credits_used: mockResponse.creditsUsed || 10
        }
      };

      return res.status(200).json(hiveResponse);
    }

    // Check for pattern matches (for property-based testing)
    for (const [pattern, response] of mockResponses.entries()) {
      if (query.includes(pattern) || pattern.includes(query)) {
        if (response.error) {
          return res.status(500).json({
            error: response.error.message,
            code: 'MOCK_ERROR'
          });
        }

        const hiveResponse = {
          results: {
            answer: response.response,
            sources: response.sources || []
          },
          metadata: {
            credits_used: response.creditsUsed || 10
          }
        };

        return res.status(200).json(hiveResponse);
      }
    }

    // Default response for unmatched queries
    const defaultResponse = {
      results: {
        answer: `Mock response for: ${query}`,
        sources: ['https://mock-source.com']
      },
      metadata: {
        credits_used: 15
      }
    };

    res.status(200).json(defaultResponse);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  // Start the mock server
  server = app.listen(3001, () => {
    console.log('Mock Hive Intelligence service started on port 3001');
  });

  return {
    mockQuery: (query: string, response: Partial<BlockchainQueryResponse>) => {
      mockResponses.set(query, response);
    },

    mockError: (query: string, error: Error) => {
      mockResponses.set(query, { error });
    },

    mockMalformedResponse: (query: string) => {
      mockResponses.set(query, { malformed: true });
    },

    reset: () => {
      mockResponses.clear();
      requestHistory.length = 0;
    },

    cleanup: () => {
      if (server) {
        server.close();
      }
    },

    getRequestHistory: () => {
      return [...requestHistory];
    }
  };
};