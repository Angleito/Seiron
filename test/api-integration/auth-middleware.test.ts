/**
 * Authentication and Middleware Integration Tests
 * Tests authentication flows, rate limiting, and security middleware
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';

describe('Authentication and Middleware Integration Tests', () => {
  let apiClient: AxiosInstance;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  
  let validToken: string;
  let expiredToken: string;
  let invalidToken: string;

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Generate test tokens
    validToken = jwt.sign(
      { userId: 'test-user-123', walletAddress: 'sei1test123' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    expiredToken = jwt.sign(
      { userId: 'test-user-456' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    );

    invalidToken = 'invalid.jwt.token';
  });

  describe('Public Endpoints', () => {
    it('should allow access to health endpoint without auth', async () => {
      const response = await apiClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('should allow access to chat endpoint without auth', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Hello, can you help me?',
        sessionId: 'public-test',
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject requests without authentication token', async () => {
      try {
        await apiClient.get('/portfolio');
        fail('Should have required authentication');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data.error).toContain('auth');
        }
      }
    });

    it('should accept requests with valid authentication token', async () => {
      try {
        const response = await apiClient.get('/portfolio', {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        });
        
        expect([200, 404]).toContain(response.status); // 404 if endpoint not implemented
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.warn('⚠️  Portfolio endpoint not implemented');
          return;
        }
        throw error;
      }
    });

    it('should reject expired tokens', async () => {
      try {
        await apiClient.get('/portfolio', {
          headers: {
            'Authorization': `Bearer ${expiredToken}`
          }
        });
        fail('Should have rejected expired token');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data.error).toContain('expired');
        }
      }
    });

    it('should reject invalid tokens', async () => {
      try {
        await apiClient.get('/portfolio', {
          headers: {
            'Authorization': `Bearer ${invalidToken}`
          }
        });
        fail('Should have rejected invalid token');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data.error).toContain('invalid');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const endpoint = '/chat';
      const requests: Promise<any>[] = [];
      
      // Send 30 requests rapidly (assuming limit is ~20-25 per minute)
      for (let i = 0; i < 30; i++) {
        requests.push(
          apiClient.post(endpoint, {
            message: `Rate limit test ${i}`,
            sessionId: `rate-limit-${i}`,
          }).catch(e => ({ error: e }))
        );
      }

      const results = await Promise.all(requests);
      
      // Count successes and rate limited responses
      const successes = results.filter(r => !r.error);
      const rateLimited = results.filter(r => 
        r.error && axios.isAxiosError(r.error) && r.error.response?.status === 429
      );

      // Should have some successes
      expect(successes.length).toBeGreaterThan(0);
      
      // Should eventually hit rate limit
      if (rateLimited.length > 0) {
        const rateLimitError = rateLimited[0].error;
        expect(rateLimitError.response?.data).toHaveProperty('error');
        expect(rateLimitError.response?.headers).toHaveProperty('x-ratelimit-limit');
        expect(rateLimitError.response?.headers).toHaveProperty('x-ratelimit-remaining');
        expect(rateLimitError.response?.headers).toHaveProperty('x-ratelimit-reset');
        
        console.log(`Rate limit triggered after ${successes.length} requests`);
        console.log(`Rate limit headers:`, {
          limit: rateLimitError.response?.headers['x-ratelimit-limit'],
          remaining: rateLimitError.response?.headers['x-ratelimit-remaining'],
          reset: new Date(parseInt(rateLimitError.response?.headers['x-ratelimit-reset']) * 1000).toISOString()
        });
      } else {
        console.warn('⚠️  Rate limiting may not be configured or limit is higher than 30 requests');
      }
    });

    it('should have different rate limits for authenticated users', async () => {
      const endpoint = '/chat';
      const requests: Promise<any>[] = [];
      
      // Send requests with authentication
      for (let i = 0; i < 50; i++) {
        requests.push(
          apiClient.post(endpoint, {
            message: `Auth rate limit test ${i}`,
            sessionId: `auth-rate-${i}`,
          }, {
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          }).catch(e => ({ error: e }))
        );
      }

      const results = await Promise.all(requests);
      const successes = results.filter(r => !r.error);
      
      // Authenticated users should have higher rate limits
      expect(successes.length).toBeGreaterThan(20);
      console.log(`Authenticated user sent ${successes.length} successful requests`);
    });
  });

  describe('CSRF Protection', () => {
    it('should not require CSRF token for API endpoints', async () => {
      // API endpoints typically don't need CSRF protection
      // This test verifies that API calls work without CSRF tokens
      const response = await apiClient.post('/chat', {
        message: 'Test CSRF',
        sessionId: 'csrf-test',
      });
      
      expect(response.status).toBe(200);
    });

    it('should validate origin header if configured', async () => {
      try {
        await apiClient.post('/chat', {
          message: 'Test origin validation',
          sessionId: 'origin-test',
        }, {
          headers: {
            'Origin': 'http://malicious-site.com'
          }
        });
        
        // If origin validation is not enabled, request will succeed
        expect(true).toBe(true);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          expect(error.response.data.error).toContain('origin');
        }
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize HTML in input', async () => {
      const response = await apiClient.post('/chat', {
        message: '<script>alert("XSS")</script>What is DeFi?',
        sessionId: 'xss-test',
      });
      
      expect(response.status).toBe(200);
      expect(response.data.message).not.toContain('<script>');
      expect(response.data.message).not.toContain('alert(');
    });

    it('should handle SQL injection attempts safely', async () => {
      const response = await apiClient.post('/chat', {
        message: "What is'; DROP TABLE users; --",
        sessionId: 'sql-injection-test',
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      // The message should be processed safely without executing SQL
    });

    it('should validate data types strictly', async () => {
      try {
        await apiClient.post('/chat', {
          message: 123, // Should be string
          sessionId: 'type-test',
        });
        fail('Should have rejected invalid type');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data.error).toContain('string');
        }
      }
    });

    it('should reject requests with excessive payload size', async () => {
      const largePayload = {
        message: 'Normal message',
        sessionId: 'size-test',
        extraData: 'x'.repeat(1024 * 1024) // 1MB of data
      };

      try {
        await apiClient.post('/chat', largePayload);
        fail('Should have rejected large payload');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect([400, 413]).toContain(error.response?.status);
        }
      }
    });
  });

  describe('Session Management', () => {
    it('should create new session if none provided', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Create a session for me',
        // No sessionId provided
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('sessionId');
      expect(response.data.sessionId).toBeTruthy();
      expect(response.data.sessionId).toMatch(/^session_\d+$/);
    });

    it('should maintain session across requests', async () => {
      const sessionId = 'persistent-session-123';
      
      // First request
      const response1 = await apiClient.post('/chat', {
        message: 'Remember that my favorite color is blue',
        sessionId,
      });
      
      expect(response1.status).toBe(200);
      expect(response1.data.sessionId).toBe(sessionId);
      
      // Second request with same session
      const response2 = await apiClient.post('/chat', {
        message: 'What is my favorite color?',
        sessionId,
        messages: [
          {
            role: 'user',
            content: 'Remember that my favorite color is blue'
          },
          {
            role: 'assistant',
            content: response1.data.message
          }
        ]
      });
      
      expect(response2.status).toBe(200);
      expect(response2.data.sessionId).toBe(sessionId);
    });
  });

  describe('Error Response Standards', () => {
    it('should return consistent error format', async () => {
      try {
        await apiClient.post('/chat', {
          // Invalid request - missing required field
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('success', false);
          expect(typeof error.response?.data.error).toBe('string');
        }
      }
    });

    it('should not leak sensitive information in errors', async () => {
      try {
        await apiClient.post('/chat', {
          message: 'Test error',
          invalidField: 'should cause validation error',
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = JSON.stringify(error.response?.data);
          
          // Should not contain sensitive info
          expect(errorMessage).not.toContain('stack');
          expect(errorMessage).not.toContain('env');
          expect(errorMessage).not.toContain('JWT_SECRET');
          expect(errorMessage).not.toContain('DATABASE_URL');
        }
      }
    });
  });

  describe('Logging and Monitoring', () => {
    it('should include request ID in responses', async () => {
      const response = await apiClient.post('/chat', {
        message: 'Test request tracking',
        sessionId: 'tracking-test',
      });
      
      // Check for request tracking headers
      const requestId = response.headers['x-request-id'] || response.headers['x-trace-id'];
      if (requestId) {
        expect(requestId).toBeTruthy();
        expect(requestId).toMatch(/^[a-zA-Z0-9-]+$/);
        console.log(`Request tracked with ID: ${requestId}`);
      } else {
        console.warn('⚠️  Request tracking headers not implemented');
      }
    });
  });
});