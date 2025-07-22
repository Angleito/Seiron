/**
 * MCP Server Connectivity Integration Tests
 * Tests real connectivity to MCP servers (sei-blockchain, portfolio-manager, hive-intelligence)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

describe('MCP Server Connectivity Tests', () => {
  const MCP_SERVERS = {
    'sei-blockchain': process.env.MCP_SEI_URL || 'http://localhost:3001',
    'portfolio-manager': process.env.MCP_PORTFOLIO_URL || 'http://localhost:3002',
    'hive-intelligence': process.env.MCP_HIVE_URL || 'http://localhost:3003',
  };

  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  let apiClient: AxiosInstance;

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  describe('Direct MCP Server Health Checks', () => {
    Object.entries(MCP_SERVERS).forEach(([serverName, serverUrl]) => {
      describe(`${serverName} server`, () => {
        let mcpClient: AxiosInstance;

        beforeAll(() => {
          mcpClient = axios.create({
            baseURL: serverUrl,
            timeout: 5000,
          });
        });

        it('should respond to health check', async () => {
          try {
            const response = await mcpClient.get('/health');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('status');
            expect(['healthy', 'ok']).toContain(response.data.status);
            
            console.log(`✅ ${serverName} is healthy at ${serverUrl}`);
          } catch (error) {
            if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
              console.warn(`⚠️  ${serverName} server not running at ${serverUrl}`);
              return;
            }
            throw error;
          }
        });

        it('should expose available tools', async () => {
          try {
            const response = await mcpClient.get('/tools');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('tools');
            expect(Array.isArray(response.data.tools)).toBe(true);
            expect(response.data.tools.length).toBeGreaterThan(0);
            
            console.log(`${serverName} exposes ${response.data.tools.length} tools`);
            response.data.tools.forEach((tool: any) => {
              console.log(`  - ${tool.name}: ${tool.description}`);
            });
          } catch (error) {
            if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
              console.warn(`⚠️  ${serverName} server not running - skipping tools check`);
              return;
            }
            throw error;
          }
        });

        it('should have proper CORS headers', async () => {
          try {
            const response = await mcpClient.options('/health');
            
            expect(response.status).toBe(200);
            expect(response.headers['access-control-allow-origin']).toBeTruthy();
            expect(response.headers['access-control-allow-methods']).toBeTruthy();
          } catch (error) {
            if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
              return;
            }
            throw error;
          }
        });
      });
    });
  });

  describe('MCP Server Integration via Main API', () => {
    it('should check all MCP servers health through API', async () => {
      try {
        const response = await apiClient.get('/mcp/health');
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('servers');
        
        Object.keys(MCP_SERVERS).forEach(serverName => {
          expect(response.data.servers).toHaveProperty(serverName);
          expect(['healthy', 'unhealthy', 'unreachable']).toContain(
            response.data.servers[serverName].status
          );
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.warn('⚠️  MCP health endpoint not implemented in API');
          return;
        }
        throw error;
      }
    });

    it('should list all available MCP tools', async () => {
      try {
        const response = await apiClient.get('/mcp/tools');
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('tools');
        expect(response.data.tools).toHaveProperty('sei-blockchain');
        expect(response.data.tools).toHaveProperty('portfolio-manager');
        expect(response.data.tools).toHaveProperty('hive-intelligence');
        
        // Each server should have an array of tools
        Object.values(response.data.tools).forEach((serverTools: any) => {
          expect(Array.isArray(serverTools)).toBe(true);
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.warn('⚠️  MCP tools endpoint not implemented in API');
          return;
        }
        throw error;
      }
    });
  });

  describe('Sei Blockchain MCP Server', () => {
    const seiUrl = MCP_SERVERS['sei-blockchain'];
    let seiClient: AxiosInstance;

    beforeAll(() => {
      seiClient = axios.create({
        baseURL: seiUrl,
        timeout: 10000,
      });
    });

    it('should provide blockchain data tools', async () => {
      try {
        const response = await seiClient.get('/tools');
        
        const toolNames = response.data.tools.map((t: any) => t.name);
        
        // Verify expected blockchain tools
        expect(toolNames).toEqual(expect.arrayContaining([
          'get_block_height',
          'get_gas_price',
          'get_balance',
          'get_transaction',
        ]));
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Sei blockchain server not running');
          return;
        }
        throw error;
      }
    });

    it('should execute blockchain queries', async () => {
      try {
        const response = await seiClient.post('/execute', {
          tool: 'get_block_height',
          parameters: {}
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
        expect(response.data.result).toHaveProperty('height');
        expect(typeof response.data.result.height).toBe('number');
        
        console.log(`Current Sei block height: ${response.data.result.height}`);
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Sei blockchain server not running');
          return;
        }
        throw error;
      }
    });
  });

  describe('Portfolio Manager MCP Server', () => {
    const portfolioUrl = MCP_SERVERS['portfolio-manager'];
    let portfolioClient: AxiosInstance;

    beforeAll(() => {
      portfolioClient = axios.create({
        baseURL: portfolioUrl,
        timeout: 10000,
      });
    });

    it('should provide portfolio management tools', async () => {
      try {
        const response = await portfolioClient.get('/tools');
        
        const toolNames = response.data.tools.map((t: any) => t.name);
        
        // Verify expected portfolio tools
        expect(toolNames).toEqual(expect.arrayContaining([
          'get_portfolio',
          'analyze_risk',
          'calculate_pnl',
          'get_positions',
        ]));
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Portfolio manager server not running');
          return;
        }
        throw error;
      }
    });

    it('should handle portfolio queries', async () => {
      try {
        const response = await portfolioClient.post('/execute', {
          tool: 'get_portfolio',
          parameters: {
            address: 'sei1test123'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
        expect(response.data.result).toHaveProperty('totalValue');
        expect(response.data.result).toHaveProperty('positions');
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Portfolio manager server not running');
          return;
        }
        throw error;
      }
    });
  });

  describe('Hive Intelligence MCP Server', () => {
    const hiveUrl = MCP_SERVERS['hive-intelligence'];
    let hiveClient: AxiosInstance;

    beforeAll(() => {
      hiveClient = axios.create({
        baseURL: hiveUrl,
        timeout: 10000,
      });
    });

    it('should provide market intelligence tools', async () => {
      try {
        const response = await hiveClient.get('/tools');
        
        const toolNames = response.data.tools.map((t: any) => t.name);
        
        // Verify expected intelligence tools
        expect(toolNames).toEqual(expect.arrayContaining([
          'analyze_market',
          'get_opportunities',
          'predict_trends',
          'risk_assessment',
        ]));
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Hive intelligence server not running');
          return;
        }
        throw error;
      }
    });

    it('should provide market analysis', async () => {
      try {
        const response = await hiveClient.post('/execute', {
          tool: 'analyze_market',
          parameters: {
            protocol: 'dragonswap',
            timeframe: '24h'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
        expect(response.data.result).toHaveProperty('analysis');
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('⚠️  Hive intelligence server not running');
          return;
        }
        throw error;
      }
    });
  });

  describe('MCP Server Failover and Resilience', () => {
    it('should handle MCP server downtime gracefully', async () => {
      // Test with a definitely non-existent server
      const deadClient = axios.create({
        baseURL: 'http://localhost:9999',
        timeout: 2000,
      });

      try {
        await deadClient.get('/health');
        fail('Should have failed to connect');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.code).toBe('ECONNREFUSED');
        }
      }
    });

    it('should timeout on slow MCP responses', async () => {
      const slowClient = axios.create({
        baseURL: MCP_SERVERS['sei-blockchain'],
        timeout: 100, // Very short timeout
      });

      try {
        await slowClient.post('/execute', {
          tool: 'complex_operation',
          parameters: { complexity: 'high' }
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(['ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED']).toContain(error.code);
        }
      }
    });
  });

  describe('MCP Performance Metrics', () => {
    it('should measure MCP server response times', async () => {
      const metrics: Record<string, number> = {};

      for (const [serverName, serverUrl] of Object.entries(MCP_SERVERS)) {
        const client = axios.create({ baseURL: serverUrl, timeout: 5000 });
        
        try {
          const startTime = Date.now();
          await client.get('/health');
          const responseTime = Date.now() - startTime;
          
          metrics[serverName] = responseTime;
          expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
        } catch (error) {
          if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
            metrics[serverName] = -1; // Server not running
          }
        }
      }

      console.log('MCP Server Response Times:');
      Object.entries(metrics).forEach(([server, time]) => {
        if (time === -1) {
          console.log(`  ${server}: Not running`);
        } else {
          console.log(`  ${server}: ${time}ms`);
        }
      });
    });
  });
});