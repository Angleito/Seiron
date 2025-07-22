/**
 * Environment Variable Validation Tests
 * Ensures all required environment variables are properly configured
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Environment Variable Validation', () => {
  let envVars: Record<string, string | undefined>;

  beforeAll(() => {
    // Load environment variables
    dotenv.config();
    envVars = process.env;
  });

  describe('Required API Keys', () => {
    it('should have OpenAI API key configured', () => {
      const key = envVars.OPENAI_API_KEY;
      
      if (!key) {
        console.warn('⚠️  OPENAI_API_KEY not configured - OpenAI features will not work');
        return;
      }
      
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(20);
      expect(key).toMatch(/^sk-/); // OpenAI keys start with sk-
    });

    it('should have Anthropic API key configured', () => {
      const key = envVars.ANTHROPIC_API_KEY;
      
      if (!key) {
        console.warn('⚠️  ANTHROPIC_API_KEY not configured - Anthropic features will not work');
        return;
      }
      
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(20);
    });

    it('should have Supabase configuration', () => {
      const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !anonKey) {
        console.warn('⚠️  Supabase not configured - database features will not work');
        return;
      }
      
      expect(url).toBeTruthy();
      expect(url).toMatch(/^https:\/\/.*\.supabase\.co$/);
      expect(anonKey).toBeTruthy();
      expect(anonKey.length).toBeGreaterThan(30);
    });
  });

  describe('MCP Server Configuration', () => {
    it('should have MCP server URLs configured', () => {
      const mcpServers = {
        'MCP_SEI_URL': envVars.MCP_SEI_URL || 'http://localhost:3001',
        'MCP_PORTFOLIO_URL': envVars.MCP_PORTFOLIO_URL || 'http://localhost:3002',
        'MCP_HIVE_URL': envVars.MCP_HIVE_URL || 'http://localhost:3003',
      };

      Object.entries(mcpServers).forEach(([envName, url]) => {
        expect(url).toBeTruthy();
        expect(url).toMatch(/^https?:\/\/.+/);
        console.log(`${envName}: ${url}`);
      });
    });

    it('should have valid MCP server URLs', () => {
      const urls = [
        envVars.MCP_SEI_URL,
        envVars.MCP_PORTFOLIO_URL,
        envVars.MCP_HIVE_URL,
      ].filter(Boolean);

      urls.forEach(url => {
        if (url) {
          const urlObj = new URL(url);
          expect(['http:', 'https:']).toContain(urlObj.protocol);
          expect(urlObj.hostname).toBeTruthy();
          expect(parseInt(urlObj.port) || 80).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Security Configuration', () => {
    it('should have JWT secret configured', () => {
      const secret = envVars.JWT_SECRET;
      
      if (!secret) {
        console.warn('⚠️  JWT_SECRET not configured - authentication will not work properly');
        return;
      }
      
      expect(secret).toBeTruthy();
      expect(secret.length).toBeGreaterThanOrEqual(32); // Should be at least 32 chars
      expect(secret).not.toBe('your-secret-key'); // Not a default value
      expect(secret).not.toContain('example');
      expect(secret).not.toContain('test');
    });

    it('should have secure session configuration', () => {
      const sessionSecret = envVars.SESSION_SECRET;
      
      if (sessionSecret) {
        expect(sessionSecret.length).toBeGreaterThanOrEqual(32);
        expect(sessionSecret).not.toBe(envVars.JWT_SECRET); // Should be different
      }
    });

    it('should have CORS origin configured for production', () => {
      const nodeEnv = envVars.NODE_ENV;
      const corsOrigin = envVars.CORS_ORIGIN;
      
      if (nodeEnv === 'production') {
        expect(corsOrigin).toBeTruthy();
        expect(corsOrigin).not.toBe('*'); // Should not allow all origins in production
        expect(corsOrigin).toMatch(/^https:\/\/.+/); // Should be HTTPS in production
      }
    });
  });

  describe('Database Configuration', () => {
    it('should have database URL configured', () => {
      const dbUrl = envVars.DATABASE_URL;
      
      if (!dbUrl) {
        console.warn('⚠️  DATABASE_URL not configured - using in-memory storage');
        return;
      }
      
      expect(dbUrl).toBeTruthy();
      
      // Should be a valid connection string
      if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        const urlObj = new URL(dbUrl);
        expect(urlObj.hostname).toBeTruthy();
        expect(urlObj.pathname.length).toBeGreaterThan(1); // Has database name
      }
    });

    it('should have Redis configuration if caching is enabled', () => {
      const redisUrl = envVars.REDIS_URL;
      const cacheEnabled = envVars.CACHE_ENABLED;
      
      if (cacheEnabled === 'true' && !redisUrl) {
        console.warn('⚠️  Caching enabled but REDIS_URL not configured');
      }
      
      if (redisUrl) {
        expect(redisUrl).toMatch(/^redis(s)?:\/\/.+/);
      }
    });
  });

  describe('API Configuration', () => {
    it('should have proper API URLs configured', () => {
      const apiUrl = envVars.NEXT_PUBLIC_API_URL || envVars.API_URL;
      
      if (apiUrl) {
        expect(apiUrl).toMatch(/^https?:\/\/.+/);
        
        if (envVars.NODE_ENV === 'production') {
          expect(apiUrl).toMatch(/^https:\/\/.+/); // Should use HTTPS in production
        }
      }
    });

    it('should have rate limiting configuration', () => {
      const rateLimit = envVars.RATE_LIMIT_MAX;
      const rateLimitWindow = envVars.RATE_LIMIT_WINDOW;
      
      if (rateLimit) {
        expect(parseInt(rateLimit)).toBeGreaterThan(0);
        expect(parseInt(rateLimit)).toBeLessThan(10000); // Reasonable limit
      }
      
      if (rateLimitWindow) {
        expect(parseInt(rateLimitWindow)).toBeGreaterThan(0);
      }
    });
  });

  describe('External Service Configuration', () => {
    it('should have blockchain RPC endpoints', () => {
      const rpcUrl = envVars.SEI_RPC_URL;
      
      if (!rpcUrl) {
        console.warn('⚠️  SEI_RPC_URL not configured - using default public RPC');
        return;
      }
      
      expect(rpcUrl).toMatch(/^https?:\/\/.+/);
      expect(rpcUrl).toContain('sei');
    });

    it('should have wallet configuration', () => {
      const walletConnectId = envVars.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      
      if (walletConnectId) {
        expect(walletConnectId).toBeTruthy();
        expect(walletConnectId.length).toBe(32); // WalletConnect project IDs are 32 chars
      } else {
        console.warn('⚠️  WalletConnect not configured - wallet features limited');
      }
    });
  });

  describe('Development vs Production', () => {
    it('should have appropriate settings for environment', () => {
      const nodeEnv = envVars.NODE_ENV;
      
      expect(['development', 'test', 'production']).toContain(nodeEnv);
      
      if (nodeEnv === 'production') {
        // Production-specific checks
        expect(envVars.DEBUG).not.toBe('true');
        expect(envVars.LOG_LEVEL).not.toBe('debug');
        
        // Should have monitoring configured
        if (!envVars.SENTRY_DSN && !envVars.MONITORING_ENABLED) {
          console.warn('⚠️  No error monitoring configured for production');
        }
      }
      
      if (nodeEnv === 'development') {
        // Development-specific checks
        console.log('Running in development mode');
      }
    });
  });

  describe('Environment File Validation', () => {
    it('should have .env.example file for reference', () => {
      const envExamplePath = join(process.cwd(), '.env.example');
      
      if (existsSync(envExamplePath)) {
        const content = readFileSync(envExamplePath, 'utf-8');
        const lines = content.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('#')
        );
        
        // Should have all important variables documented
        const requiredVars = [
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'DATABASE_URL',
          'JWT_SECRET',
        ];
        
        requiredVars.forEach(varName => {
          const hasVar = lines.some(line => line.startsWith(`${varName}=`));
          expect(hasVar).toBe(true);
        });
      } else {
        console.warn('⚠️  No .env.example file found - consider adding one for documentation');
      }
    });
  });

  describe('Feature Flags', () => {
    it('should have feature flags properly configured', () => {
      const featureFlags = {
        'FEATURE_VOICE_CHAT': envVars.FEATURE_VOICE_CHAT,
        'FEATURE_PORTFOLIO_TRACKING': envVars.FEATURE_PORTFOLIO_TRACKING,
        'FEATURE_AI_AGENTS': envVars.FEATURE_AI_AGENTS,
      };

      Object.entries(featureFlags).forEach(([flag, value]) => {
        if (value !== undefined) {
          expect(['true', 'false', '1', '0']).toContain(value);
          console.log(`${flag}: ${value === 'true' || value === '1' ? 'enabled' : 'disabled'}`);
        }
      });
    });
  });

  describe('Performance Configuration', () => {
    it('should have performance-related settings', () => {
      const settings = {
        'MAX_CONCURRENT_REQUESTS': envVars.MAX_CONCURRENT_REQUESTS,
        'TIMEOUT_MS': envVars.TIMEOUT_MS,
        'CACHE_TTL': envVars.CACHE_TTL,
      };

      Object.entries(settings).forEach(([setting, value]) => {
        if (value) {
          const num = parseInt(value);
          expect(num).toBeGreaterThan(0);
          expect(num).not.toBeNaN();
          console.log(`${setting}: ${value}`);
        }
      });
    });
  });

  describe('Summary', () => {
    it('should report environment configuration status', () => {
      const criticalVars = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'DATABASE_URL',
        'JWT_SECRET',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ];

      const status = criticalVars.map(varName => ({
        name: varName,
        configured: !!envVars[varName],
      }));

      console.log('\n=== Environment Configuration Summary ===');
      status.forEach(({ name, configured }) => {
        console.log(`${configured ? '✅' : '❌'} ${name}: ${configured ? 'Configured' : 'Missing'}`);
      });

      const configuredCount = status.filter(s => s.configured).length;
      const totalCount = status.length;
      const percentage = Math.round((configuredCount / totalCount) * 100);

      console.log(`\nConfiguration: ${configuredCount}/${totalCount} (${percentage}%)`);
      
      if (percentage < 100) {
        console.warn('\n⚠️  Some critical environment variables are missing.');
        console.warn('Please check .env.example and configure all required variables.');
      } else {
        console.log('\n✅ All critical environment variables are configured!');
      }
    });
  });
});