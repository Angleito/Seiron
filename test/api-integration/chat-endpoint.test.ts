/**
 * Chat Endpoint Integration Tests
 * Tests the chat API with real OpenAI and Anthropic API calls
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

describe('Chat Endpoint Integration Tests', () => {
  let apiClient: AxiosInstance;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const sessionId = `test_${uuidv4()}`;
  
  // Check if we have required API keys
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!hasOpenAIKey && !hasAnthropicKey) {
      console.warn('⚠️  No API keys found - some tests will be skipped');
    }

    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds for AI responses
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response logging
    apiClient.interceptors.request.use(request => {
      console.log(`🚀 ${request.method?.toUpperCase()} ${request.url}`);
      if (request.data) {
        console.log('Request body:', JSON.stringify(request.data, null, 2));
      }
      return request;
    });

    apiClient.interceptors.response.use(
      response => {
        console.log(`✅ Response ${response.status} - ${response.config.url}`);
        return response;
      },
      error => {
        console.error(`❌ Error ${error.response?.status} - ${error.config?.url}`);
        if (error.response?.data) {
          console.error('Error details:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  });

  describe('Basic Chat Functionality', () => {
    it('should accept a valid chat message', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Hello, Seiron! What is the Sei Network?',
        sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('sessionId', sessionId);
      expect(response.data.message).toBeTruthy();
      expect(response.data.message.length).toBeGreaterThan(10);
    });

    it('should handle messages with context', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Tell me about DeFi opportunities',
        sessionId,
        messages: [
          {
            role: 'user',
            content: 'I am interested in yield farming'
          },
          {
            role: 'assistant',
            content: 'Yield farming can be a great way to earn passive income in DeFi.'
          }
        ]
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toContain('DeFi');
    });

    it('should support wallet address context', async () => {
      const walletAddress = 'sei1234567890abcdef';
      const response = await apiClient.post('/chat', {
        message: 'What is my portfolio balance?',
        sessionId,
        walletAddress,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      // Response should acknowledge the wallet context
      expect(response.data.message.toLowerCase()).toMatch(/portfolio|balance|wallet/);
    });
  });

  describe('Streaming Responses', () => {
    it('should support streaming chat responses', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Explain blockchain technology in detail',
        sessionId,
        stream: true,
      }, {
        responseType: 'stream',
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');

      // Collect streamed data
      const chunks: string[] = [];
      let isDone = false;

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          chunks.push(text);
          
          if (text.includes('[DONE]')) {
            isDone = true;
          }
        });

        response.data.on('end', () => {
          expect(chunks.length).toBeGreaterThan(0);
          expect(isDone).toBe(true);
          
          // Verify SSE format
          const allText = chunks.join('');
          expect(allText).toContain('data: ');
          
          resolve(true);
        });

        response.data.on('error', reject);
      });
    });
  });

  describe('MCP Integration', () => {
    it('should include MCP context in responses', async () => {
      const response = await apiClient.post('/chat', {
        message: 'What are the current gas fees on Sei?',
        sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('mcpData');
      expect(response.data).toHaveProperty('toolsUsed');
    });

    it('should handle portfolio-related queries with MCP', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Analyze my DeFi positions',
        sessionId,
        walletAddress: 'sei1test123',
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeTruthy();
      
      // Check if MCP tools were used
      if (response.data.toolsUsed && response.data.toolsUsed.length > 0) {
        expect(response.data.toolsUsed).toContain('portfolio-manager');
      }
    });
  });

  describe('Error Handling', () => {
    it('should validate required fields', async () => {
      try {
        await apiClient.post('/chat', {
          // Missing required 'message' field
          sessionId,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
        }
      }
    });

    it('should enforce message length limits', async () => {
      const longMessage = 'a'.repeat(4001); // Exceeds 4000 char limit
      
      try {
        await apiClient.post('/chat', {
          message: longMessage,
          sessionId,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data.error).toContain('max');
        }
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Send multiple requests rapidly
      const requests = Array(20).fill(null).map((_, i) => 
        apiClient.post('/chat', {
          message: `Test message ${i}`,
          sessionId: `rate_limit_test_${i}`,
        }).catch(e => e)
      );

      const results = await Promise.all(requests);
      
      // Some requests should succeed
      const successes = results.filter(r => !(r instanceof Error));
      expect(successes.length).toBeGreaterThan(0);

      // Check if any were rate limited
      const rateLimited = results.filter(r => 
        axios.isAxiosError(r) && r.response?.status === 429
      );
      
      if (rateLimited.length > 0) {
        console.log(`Rate limiting triggered after ${successes.length} requests`);
        expect(rateLimited[0].response?.data).toHaveProperty('error');
      }
    });
  });

  describe('Advanced Features', () => {
    it('should support custom temperature settings', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Write a creative story about DeFi dragons',
        sessionId,
        temperature: 1.5,
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeTruthy();
    });

    it('should support custom max tokens', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Give me a brief summary of Sei Network',
        sessionId,
        maxTokens: 100,
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeTruthy();
      expect(response.data.tokens).toBeLessThanOrEqual(100);
    });

    it('should maintain conversation context across messages', async () => {
      const contextSessionId = `context_test_${uuidv4()}`;
      
      // First message
      const response1 = await apiClient.post('/chat', {
        message: 'My name is TestUser and I love DeFi',
        sessionId: contextSessionId,
      });
      
      expect(response1.status).toBe(200);

      // Second message referencing context
      const response2 = await apiClient.post('/chat', {
        message: 'What is my name?',
        sessionId: contextSessionId,
        messages: [
          {
            role: 'user',
            content: 'My name is TestUser and I love DeFi'
          },
          {
            role: 'assistant',
            content: response1.data.message
          }
        ]
      });

      expect(response2.status).toBe(200);
      expect(response2.data.message).toContain('TestUser');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should respond within acceptable time for simple queries', async () => {
      const startTime = Date.now();
      
      await apiClient.post('/chat', {
        message: 'What is 2+2?',
        sessionId,
        maxTokens: 50,
      });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      console.log(`Simple query response time: ${responseTime}ms`);
    });

    it('should handle concurrent chat requests', async () => {
      const concurrentRequests = 5;
      const requests = Array(concurrentRequests).fill(null).map((_, i) => 
        apiClient.post('/chat', {
          message: `Concurrent test message ${i}`,
          sessionId: `concurrent_${i}`,
          maxTokens: 50,
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.message).toBeTruthy();
      });

      console.log(`${concurrentRequests} concurrent requests completed in: ${totalTime}ms`);
      console.log(`Average time per request: ${Math.round(totalTime / concurrentRequests)}ms`);
    });
  });

  describe('CORS and Security', () => {
    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await apiClient.options('/chat');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should include security headers in responses', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Test security headers',
        sessionId,
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});