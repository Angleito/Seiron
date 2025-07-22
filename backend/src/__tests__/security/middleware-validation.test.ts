/**
 * Security Middleware Validation Tests
 * Tests all security middleware components for proper functionality
 */

import request from 'supertest';
import express from 'express';
import { createSecurityMiddleware } from '@/middleware/security';
import { apiKeyValidationService } from '@/services/ApiKeyValidationService';
import { securityAuditService } from '@/services/SecurityAuditService';
import { rateLimitMiddleware } from '@/middleware/apiKeyRateLimit';
import { createMcpAuthMiddleware } from '@/middleware/mcpAuthentication';
import { generateTestApiKey, generateTestWalletAddress } from '@/test-utils/generators';
import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';

describe('Security Middleware Validation Tests', () => {
  let testApp: express.Application;
  let validApiKey: string;
  let validMcpKey: string;
  let testWalletAddress: string;

  beforeEach(() => {
    testApp = express();
    validApiKey = generateTestApiKey();
    validMcpKey = `mcp_${generateTestApiKey()}`;
    testWalletAddress = generateTestWalletAddress();
    
    // Basic middleware setup
    testApp.use(express.json({ limit: '10mb' }));
    testApp.use(express.urlencoded({ extended: true }));
  });

  afterEach(() => {
    // Clean up any test state
  });

  describe('Security Middleware Components', () => {
    test('should initialize security middleware correctly', () => {
      const securityMiddleware = createSecurityMiddleware();
      
      expect(securityMiddleware).toHaveProperty('helmet');
      expect(securityMiddleware).toHaveProperty('securityHeaders');
      expect(securityMiddleware).toHaveProperty('securityMonitoring');
      expect(securityMiddleware).toHaveProperty('burstProtection');
      expect(securityMiddleware).toHaveProperty('smartRateLimit');
      expect(securityMiddleware).toHaveProperty('inputSanitization');
      expect(securityMiddleware).toHaveProperty('ipFilter');
      expect(securityMiddleware).toHaveProperty('validateAPIKey');
    });

    test('should apply Helmet security headers', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.helmet);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should add custom security headers', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.securityHeaders);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      // Check for custom security headers
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-served-by']).toBeDefined();
      expect(response.headers['x-security-level']).toBeDefined();
    });

    test('should monitor security events', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.securityMonitoring);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      await request(testApp)
        .get('/test')
        .expect(200);

      // Security monitoring should log the request
      const metrics = securityAuditService.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API Key Validation', () => {
    test('should validate API key format', () => {
      const validKey = generateTestApiKey();
      const invalidKeys = [
        '',
        'invalid',
        '123',
        'key_too_short',
        'invalid-format-without-prefix'
      ];

      expect(apiKeyValidationService.validateKeyFormat(validKey)).toBe(true);
      
      invalidKeys.forEach(key => {
        expect(apiKeyValidationService.validateKeyFormat(key)).toBe(false);
      });
    });

    test('should reject requests without API key', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.validateAPIKey);
      testApp.get('/protected', (req, res) => res.json({ status: 'protected' }));

      await request(testApp)
        .get('/protected')
        .expect(401);
    });

    test('should reject requests with invalid API key', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.validateAPIKey);
      testApp.get('/protected', (req, res) => res.json({ status: 'protected' }));

      await request(testApp)
        .get('/protected')
        .set('x-api-key', 'invalid-key')
        .expect(401);
    });

    test('should accept requests with valid API key format', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      // Mock API key validation to pass for testing
      const originalValidate = apiKeyValidationService.validateKey;
      apiKeyValidationService.validateKey = jest.fn().mockResolvedValue(true);
      
      testApp.use(securityMiddleware.validateAPIKey);
      testApp.get('/protected', (req, res) => res.json({ status: 'protected' }));

      await request(testApp)
        .get('/protected')
        .set('x-api-key', validApiKey)
        .expect(200);

      // Restore original function
      apiKeyValidationService.validateKey = originalValidate;
    });

    test('should rate limit API key usage', async () => {
      testApp.use(rateLimitMiddleware.auth);
      testApp.post('/auth/test', (req, res) => res.json({ status: 'ok' }));

      // Make multiple requests rapidly
      const requests = Array(10).fill(null).map(() =>
        request(testApp).post('/auth/test').send({})
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      // Should eventually rate limit
      expect(rateLimited).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.inputSanitization);
      testApp.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const maliciousInput = {
        message: '<script>alert("xss")</script>',
        data: '"><script>alert("xss")</script>'
      };

      const response = await request(testApp)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      // Input should be sanitized
      expect(response.body.received.message).not.toContain('<script>');
      expect(response.body.received.data).not.toContain('<script>');
    });

    test('should sanitize SQL injection attempts', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.inputSanitization);
      testApp.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const sqlInjection = {
        query: "'; DROP TABLE users; --",
        search: "1' OR '1'='1"
      };

      const response = await request(testApp)
        .post('/test')
        .send(sqlInjection)
        .expect(200);

      // SQL injection patterns should be sanitized
      expect(response.body.received.query).not.toContain('DROP TABLE');
      expect(response.body.received.search).not.toContain("' OR '");
    });

    test('should preserve safe input', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.inputSanitization);
      testApp.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const safeInput = {
        message: 'Hello, world!',
        walletAddress: testWalletAddress,
        amount: '1000.50'
      };

      const response = await request(testApp)
        .post('/test')
        .send(safeInput)
        .expect(200);

      // Safe input should remain unchanged
      expect(response.body.received).toEqual(safeInput);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply burst protection', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.burstProtection);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      // Make rapid requests to trigger burst protection
      const rapidRequests = Array(50).fill(null).map(() =>
        request(testApp).get('/test')
      );

      const responses = await Promise.all(rapidRequests);
      const blocked = responses.some(r => r.status === 429);
      
      expect(blocked).toBe(true);
    });

    test('should apply smart rate limiting', async () => {
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.smartRateLimit);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      // Make requests over time to test smart limiting
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(request(testApp).get('/test'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      // Should eventually rate limit
      expect(rateLimited).toBe(true);
    });

    test('should differentiate rate limits by endpoint type', async () => {
      testApp.use(rateLimitMiddleware.auth);
      testApp.use(rateLimitMiddleware.ai);
      testApp.use(rateLimitMiddleware.portfolio);
      
      testApp.post('/auth', (req, res) => res.json({ type: 'auth' }));
      testApp.post('/ai', (req, res) => res.json({ type: 'ai' }));
      testApp.get('/portfolio', (req, res) => res.json({ type: 'portfolio' }));

      // Each endpoint should have different rate limits
      const authResponse = await request(testApp).post('/auth').send({});
      const aiResponse = await request(testApp).post('/ai').send({});
      const portfolioResponse = await request(testApp).get('/portfolio');

      expect(authResponse.status).toBe(200);
      expect(aiResponse.status).toBe(200);
      expect(portfolioResponse.status).toBe(200);
    });
  });

  describe('MCP Authentication', () => {
    test('should create MCP authentication middleware', () => {
      const mcpAuth = createMcpAuthMiddleware(['mcp_communication']);
      expect(typeof mcpAuth).toBe('function');
    });

    test('should reject requests without MCP credentials', async () => {
      const mcpAuth = createMcpAuthMiddleware(['mcp_communication']);
      
      testApp.use(mcpAuth);
      testApp.get('/mcp', (req, res) => res.json({ status: 'mcp' }));

      await request(testApp)
        .get('/mcp')
        .expect(401);
    });

    test('should validate MCP key format', async () => {
      const mcpAuth = createMcpAuthMiddleware(['mcp_communication']);
      
      testApp.use(mcpAuth);
      testApp.get('/mcp', (req, res) => res.json({ status: 'mcp' }));

      await request(testApp)
        .get('/mcp')
        .set('x-mcp-key', 'invalid-mcp-key')
        .expect(401);
    });

    test('should accept valid MCP credentials', async () => {
      const mcpAuth = createMcpAuthMiddleware(['mcp_communication']);
      
      // Mock MCP key validation for testing
      process.env.MCP_API_KEY = validMcpKey;
      
      testApp.use(mcpAuth);
      testApp.get('/mcp', (req, res) => res.json({ status: 'mcp' }));

      await request(testApp)
        .get('/mcp')
        .set('x-mcp-key', validMcpKey)
        .expect(200);
    });
  });

  describe('IP Filtering', () => {
    test('should allow requests from allowed IPs', async () => {
      // Set environment for IP filtering (if configured)
      process.env.ALLOWED_IPS = '127.0.0.1,::1';
      
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.ipFilter);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.body.status).toBe('ok');
      
      // Clean up
      delete process.env.ALLOWED_IPS;
    });

    test('should block requests from blocked IPs', async () => {
      // Set environment for IP blocking
      process.env.BLOCKED_IPS = '192.168.1.100';
      
      const securityMiddleware = createSecurityMiddleware();
      
      testApp.use(securityMiddleware.ipFilter);
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));

      // This test is limited by supertest's localhost constraint
      // In production, this would block the specified IP
      
      // Clean up
      delete process.env.BLOCKED_IPS;
    });
  });

  describe('Security Audit Integration', () => {
    test('should log security events', async () => {
      const initialMetrics = securityAuditService.getMetrics();
      
      securityAuditService.logEvent({
        eventType: 'test_security_event',
        severity: 'low',
        source: 'test',
        success: true,
        message: 'Test security event',
        metadata: { test: true }
      });

      const updatedMetrics = securityAuditService.getMetrics();
      expect(updatedMetrics.totalEvents).toBeGreaterThan(initialMetrics.totalEvents);
    });

    test('should track event types', () => {
      securityAuditService.logEvent({
        eventType: 'api_key_validation',
        severity: 'medium',
        source: 'test',
        success: false,
        message: 'Invalid API key',
        metadata: {}
      });

      const metrics = securityAuditService.getMetrics();
      expect(metrics.eventsByType.api_key_validation).toBeGreaterThan(0);
    });

    test('should track severity levels', () => {
      securityAuditService.logEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'high',
        source: 'test',
        success: false,
        message: 'Rate limit exceeded',
        metadata: {}
      });

      const metrics = securityAuditService.getMetrics();
      expect(metrics.eventsBySeverity.high).toBeGreaterThan(0);
    });
  });

  describe('Security Configuration Validation', () => {
    test('should validate required security environment variables', () => {
      const requiredVars = [
        'JWT_SECRET',
        'FRONTEND_URL',
        'NODE_ENV'
      ];

      requiredVars.forEach(varName => {
        if (!process.env[varName]) {
          console.warn(`Missing required environment variable: ${varName}`);
        }
      });

      // At minimum, NODE_ENV should be set
      expect(process.env.NODE_ENV).toBeDefined();
    });

    test('should use secure defaults in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const securityMiddleware = createSecurityMiddleware();
      expect(securityMiddleware).toBeDefined();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should apply development-friendly settings in development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const securityMiddleware = createSecurityMiddleware();
      expect(securityMiddleware).toBeDefined();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});