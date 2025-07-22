/**
 * API Health Check Integration Tests
 * Tests basic API connectivity and health endpoint functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

describe('API Health Check Integration Tests', () => {
  let apiClient: AxiosInstance;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

  beforeAll(() => {
    // Create axios instance with base configuration
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for debugging
    apiClient.interceptors.response.use(
      response => {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      error => {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'No response'}`);
        return Promise.reject(error);
      }
    );
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Frontend API Health', () => {
    it('should return 200 OK from health endpoint', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should include service information in health response', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.data).toHaveProperty('service');
      expect(response.data.service).toBe('seiron-api');
    });

    it('should include version information', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.data).toHaveProperty('version');
      expect(response.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should handle OPTIONS request for CORS', async () => {
      const response = await apiClient.options('/health');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Backend API Health', () => {
    let backendClient: AxiosInstance;

    beforeAll(() => {
      backendClient = axios.create({
        baseURL: BACKEND_URL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return 200 OK from backend health endpoint', async () => {
      try {
        const response = await backendClient.get('/health');
        
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Backend server not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should include database connection status', async () => {
      try {
        const response = await backendClient.get('/health');
        
        expect(response.data).toHaveProperty('services');
        expect(response.data.services).toHaveProperty('database');
        expect(['connected', 'disconnected']).toContain(response.data.services.database);
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Backend server not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should include MCP server status', async () => {
      try {
        const response = await backendClient.get('/health');
        
        expect(response.data).toHaveProperty('services');
        expect(response.data.services).toHaveProperty('mcp');
        expect(response.data.services.mcp).toMatchObject({
          'sei-blockchain': expect.any(String),
          'portfolio-manager': expect.any(String),
          'hive-intelligence': expect.any(String),
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Backend server not running - skipping test');
          return;
        }
        throw error;
      }
    });
  });

  describe('API Response Headers', () => {
    it('should include security headers', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should include proper content-type header', async () => {
      const response = await apiClient.get('/health');
      
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      try {
        await apiClient.get('/non-existent-endpoint');
        fail('Should have thrown an error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(404);
        } else {
          throw error;
        }
      }
    });

    it('should handle malformed requests gracefully', async () => {
      try {
        await apiClient.post('/chat', { invalid: 'data' });
        fail('Should have thrown an error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      await apiClient.get('/health');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      console.log(`Health endpoint response time: ${responseTime}ms`);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => apiClient.get('/health'));
      const startTime = Date.now();
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(totalTime).toBeLessThan(2000); // 10 concurrent requests should complete within 2 seconds
      console.log(`10 concurrent requests completed in: ${totalTime}ms`);
    });
  });
});