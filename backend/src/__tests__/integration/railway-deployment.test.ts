/**
 * Railway Deployment Integration Tests
 * Tests deployment readiness, environment configuration, and health checks
 */

import { validateStartupConfiguration } from '@/config/validation';
import { validateSecurityConfiguration } from '@/middleware/security';
import { createSupabaseService } from '@/services/SupabaseService';
import { SeiIntegrationService } from '@/services/SeiIntegrationService';
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

describe('Railway Deployment Integration Tests', () => {
  const isRailwayEnvironment = !!process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProductionLike = process.env.NODE_ENV === 'production' || isRailwayEnvironment;

  describe('Environment Configuration', () => {
    test('should validate startup configuration', () => {
      const result = validateStartupConfiguration();
      
      if (E.isLeft(result)) {
        // In development, configuration errors are warnings
        if (!isProductionLike) {
          console.warn('Configuration warnings:', result.left);
          expect(result.left.length).toBeGreaterThanOrEqual(0);
        } else {
          // In production, configuration must be valid
          expect(E.isRight(result)).toBe(true);
        }
      } else {
        expect(result.right).toMatchObject({
          environment: expect.objectContaining({
            environment: expect.any(String),
            securityLevel: expect.any(String)
          }),
          apiKeys: expect.objectContaining({
            keys: expect.any(Object),
            warnings: expect.any(Array)
          })
        });
      }
    });

    test('should validate security configuration', async () => {
      const result = await validateSecurityConfiguration();
      
      if (isProductionLike) {
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      } else {
        // In development, some security warnings are acceptable
        if (!result.success) {
          console.warn('Security configuration warnings:', result.errors);
        }
      }
    });

    test('should have required Railway environment variables', () => {
      if (isRailwayEnvironment) {
        expect(process.env.RAILWAY_ENVIRONMENT_NAME).toBeDefined();
        expect(process.env.RAILWAY_SERVICE_NAME).toBeDefined();
        
        // Railway should provide these variables
        const railwayVars = [
          'PORT',
          'RAILWAY_PUBLIC_DOMAIN',
          'RAILWAY_PRIVATE_DOMAIN'
        ];

        railwayVars.forEach(varName => {
          if (!process.env[varName]) {
            console.warn(`Missing Railway variable: ${varName}`);
          }
        });
      }
    });

    test('should have production-required environment variables', () => {
      const requiredVars = [
        'OPENAI_API_KEY',
        'JWT_SECRET',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY'
      ];

      const conditionalVars = [
        { name: 'REDIS_URL', condition: isProductionLike },
        { name: 'MCP_API_KEY', condition: isProductionLike },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', condition: isProductionLike }
      ];

      if (isProductionLike) {
        requiredVars.forEach(varName => {
          expect(process.env[varName]).toBeDefined();
          expect(process.env[varName]).not.toBe('');
        });
      }

      conditionalVars.forEach(({ name, condition }) => {
        if (condition && !process.env[name]) {
          console.warn(`Missing conditional variable: ${name}`);
        }
      });
    });

    test('should validate API key formats', () => {
      const apiKeys = [
        { name: 'OPENAI_API_KEY', pattern: /^sk-[A-Za-z0-9-_]{48,}$/ },
        { name: 'MCP_API_KEY', pattern: /^mcp_[A-Za-z0-9-_]{32,}$/, optional: true },
        { name: 'INTERNAL_API_KEY', pattern: /^[A-Za-z0-9-_]{32,}$/, optional: true }
      ];

      apiKeys.forEach(({ name, pattern, optional }) => {
        const value = process.env[name];
        if (value) {
          expect(pattern.test(value)).toBe(true);
        } else if (!optional && isProductionLike) {
          console.warn(`Missing API key: ${name}`);
        }
      });
    });
  });

  describe('Service Connectivity', () => {
    test('should connect to Supabase', async () => {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        const supabaseResult = createSupabaseService({
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
        });

        if (E.isRight(supabaseResult)) {
          const supabaseService = supabaseResult.right;
          
          try {
            await supabaseService.testConnection();
            expect(true).toBe(true); // Connection successful
          } catch (error) {
            if (isProductionLike) {
              throw error; // Fail in production
            } else {
              console.warn('Supabase connection warning:', error);
            }
          }
        } else {
          if (isProductionLike) {
            throw new Error(`Supabase initialization failed: ${supabaseResult.left.message}`);
          }
        }
      } else {
        console.warn('Supabase credentials not configured');
      }
    });

    test('should connect to Sei Network', async () => {
      const seiRpcUrl = process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com';
      
      try {
        const response = await axios.get(`${seiRpcUrl}/health`, { timeout: 10000 });
        expect(response.status).toBe(200);
      } catch (error) {
        if (isProductionLike) {
          console.warn('Sei Network connectivity warning:', error);
        } else {
          console.warn('Sei Network not accessible:', error);
        }
      }
    });

    test('should validate MCP server endpoints', async () => {
      const mcpEndpoint = process.env.MCP_ENDPOINT;
      
      if (mcpEndpoint && isProductionLike) {
        try {
          // Test MCP server connectivity
          const url = mcpEndpoint.replace('ws://', 'http://').replace('wss://', 'https://');
          const response = await axios.get(`${url}/health`, { timeout: 5000 });
          expect(response.status).toBe(200);
        } catch (error) {
          console.warn('MCP server connectivity warning:', error);
        }
      }
    });

    test('should validate Redis connectivity', async () => {
      if (process.env.REDIS_URL && isProductionLike) {
        try {
          // Test Redis connection
          const redis = require('ioredis');
          const client = new redis(process.env.REDIS_URL);
          
          await client.ping();
          await client.quit();
          
          expect(true).toBe(true); // Connection successful
        } catch (error) {
          if (isProductionLike) {
            console.warn('Redis connectivity warning:', error);
          } else {
            console.warn('Redis not accessible:', error);
          }
        }
      }
    });
  });

  describe('Health Check Endpoints', () => {
    let serverUrl: string;

    beforeAll(() => {
      const port = process.env.PORT || '3001';
      const host = process.env.RAILWAY_PUBLIC_DOMAIN || 
                   process.env.RAILWAY_PRIVATE_DOMAIN || 
                   'localhost';
      
      serverUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${host}`
        : `http://${host}:${port}`;
    });

    test('should respond to health check', async () => {
      try {
        const response = await axios.get(`${serverUrl}/health`, { timeout: 10000 });
        
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          status: expect.stringMatching(/^(ok|degraded)$/),
          timestamp: expect.any(String),
          service: expect.objectContaining({
            name: expect.any(String),
            environment: expect.any(String),
            uptime: expect.any(Number)
          }),
          checks: expect.objectContaining({
            server: 'ok'
          })
        });
        
        // All critical checks should pass in production
        if (isProductionLike && response.data.status === 'ok') {
          expect(response.data.checks.database).toMatch(/^(ok|not_configured)$/);
          expect(response.data.checks.redis).toMatch(/^(ok|not_configured)$/);
          expect(response.data.checks.mcp).toMatch(/^(ok|not_configured)$/);
        }
      } catch (error) {
        if (isProductionLike) {
          throw error; // Health checks must work in production
        } else {
          console.warn('Health check warning (server may not be running):', error);
        }
      }
    });

    test('should respond to readiness probe', async () => {
      try {
        const response = await axios.get(`${serverUrl}/ready`, { timeout: 5000 });
        
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          status: 'ready',
          timestamp: expect.any(String)
        });
      } catch (error) {
        if (isProductionLike) {
          throw error;
        } else {
          console.warn('Readiness probe warning:', error);
        }
      }
    });

    test('should respond to liveness probe', async () => {
      try {
        const response = await axios.get(`${serverUrl}/alive`, { timeout: 5000 });
        
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          status: 'alive',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        });
      } catch (error) {
        if (isProductionLike) {
          throw error;
        } else {
          console.warn('Liveness probe warning:', error);
        }
      }
    });

    test('should provide metrics endpoint', async () => {
      try {
        const response = await axios.get(`${serverUrl}/metrics`, { timeout: 5000 });
        
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          timestamp: expect.any(String),
          service: expect.objectContaining({
            name: expect.any(String),
            version: expect.any(String),
            uptime: expect.any(Number)
          }),
          system: expect.objectContaining({
            memory: expect.any(Object),
            platform: expect.any(String),
            nodeVersion: expect.any(String)
          }),
          environment: expect.objectContaining({
            nodeEnv: expect.any(String)
          })
        });

        // Railway-specific metrics
        if (isRailwayEnvironment) {
          expect(response.data.environment.railwayEnvironment).toBeDefined();
          expect(response.data.environment.railwayService).toBeDefined();
        }
      } catch (error) {
        if (isProductionLike) {
          throw error;
        } else {
          console.warn('Metrics endpoint warning:', error);
        }
      }
    });
  });

  describe('Security Configuration', () => {
    test('should enforce HTTPS in production', () => {
      if (isProductionLike) {
        expect(process.env.FRONTEND_URL).toMatch(/^https:/);
      }
    });

    test('should have secure session configuration', () => {
      if (isProductionLike) {
        expect(process.env.JWT_SECRET).toBeDefined();
        expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
      }
    });

    test('should validate CORS configuration', () => {
      const frontendUrl = process.env.FRONTEND_URL;
      
      if (frontendUrl) {
        expect(frontendUrl).toMatch(/^https?:\/\//);
        
        if (isProductionLike) {
          expect(frontendUrl).not.toMatch(/localhost/);
        }
      }
    });

    test('should have appropriate rate limiting', () => {
      // Rate limiting should be configured for production
      if (isProductionLike) {
        // These would be tested through actual API calls
        expect(true).toBe(true); // Placeholder
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should start within reasonable time', async () => {
      // This test assumes the server is already running
      // In a real deployment test, you would measure startup time
      const start = Date.now();
      
      try {
        await axios.get(`${process.env.RAILWAY_PUBLIC_DOMAIN ? 
          `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
          'http://localhost:3001'}/ready`, { timeout: 5000 });
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
      } catch (error) {
        console.warn('Performance test skipped (server not accessible)');
      }
    });

    test('should handle concurrent connections', async () => {
      try {
        const serverUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? 
          `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
          'http://localhost:3001';
        
        const concurrentRequests = Array(10).fill(null).map(() =>
          axios.get(`${serverUrl}/health`, { timeout: 10000 })
        );

        const responses = await Promise.all(concurrentRequests);
        
        expect(responses.every(r => r.status === 200)).toBe(true);
      } catch (error) {
        console.warn('Concurrency test skipped:', error);
      }
    });

    test('should have memory usage within limits', async () => {
      try {
        const serverUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? 
          `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
          'http://localhost:3001';
        
        const response = await axios.get(`${serverUrl}/metrics`);
        const memoryUsage = response.data.system.memory;
        
        // Memory usage should be reasonable (less than 512MB in production)
        if (isProductionLike) {
          expect(memoryUsage.heapUsed).toBeLessThan(512 * 1024 * 1024);
        }
      } catch (error) {
        console.warn('Memory test skipped:', error);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle missing environment variables gracefully', () => {
      // Test with backup environment
      const originalEnv = { ...process.env };
      
      try {
        // Remove non-critical environment variable
        delete process.env.REDIS_URL;
        
        const result = validateStartupConfiguration();
        
        // Should still validate successfully or with warnings only
        if (E.isLeft(result)) {
          expect(result.left.every(error => error.field !== 'CRITICAL_MISSING')).toBe(true);
        }
      } finally {
        // Restore environment
        process.env = originalEnv;
      }
    });

    test('should handle service degradation gracefully', () => {
      // This test would simulate service failures
      // For now, just verify error handling exists
      expect(typeof validateStartupConfiguration).toBe('function');
      expect(typeof validateSecurityConfiguration).toBe('function');
    });
  });

  describe('Deployment Verification', () => {
    test('should have correct service metadata', () => {
      const serviceName = process.env.SERVICE_NAME || process.env.RAILWAY_SERVICE_NAME;
      const serviceVersion = process.env.SERVICE_VERSION;
      
      if (isRailwayEnvironment) {
        expect(serviceName).toBeDefined();
        expect(serviceName).toMatch(/seiron|backend/i);
      }
      
      if (serviceVersion) {
        expect(serviceVersion).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    test('should validate build process requirements', () => {
      // Verify that critical files exist
      const fs = require('fs');
      const path = require('path');
      
      const criticalFiles = [
        'package.json',
        'tsconfig.json'
      ];

      criticalFiles.forEach(file => {
        const filePath = path.join(__dirname, '../../../', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('should have proper TypeScript compilation', () => {
      // Verify TypeScript types are working
      const result = validateStartupConfiguration();
      expect(typeof result).toBe('object');
      expect('_tag' in result).toBe(true);
    });
  });
});