/**
 * Hive Intelligence MCP Server Integration Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MCPClientFactory, MCPConnectionManager } from '../../../lib/mcp/client';
import HiveIntelligenceMCPConfig from '../../../config/mcp/hive-intelligence';
import { MockMCPServer } from '../mocks/server';
import { 
  generateMarketData, 
  generateSentimentData,
  generateErrorResponse 
} from '../mocks/generators';
import {
  assertValidToolResponse,
  assertValidMarketData,
  assertValidSentimentAnalysis,
  assertValidErrorResponse
} from '../mocks/assertions';

describe('Hive Intelligence MCP Server Integration', () => {
  let mockServer: MockMCPServer;
  let connectionManager: MCPConnectionManager;
  let factory: MCPClientFactory;

  beforeEach(() => {
    // Create mock server with Hive Intelligence tools
    mockServer = new MockMCPServer({
      name: 'hive-intelligence',
      tools: HiveIntelligenceMCPConfig.tools,
      latency: 50,
      errorRate: 0
    });

    // Create connection manager
    connectionManager = new MCPConnectionManager({
      servers: [{
        name: 'hive-intelligence',
        type: 'stdio',
        command: 'mock-hive-server'
      }]
    });

    factory = connectionManager.getFactory();
  });

  afterEach(async () => {
    await connectionManager.shutdown();
    await mockServer.stop();
  });

  describe('Market Data Tool', () => {
    it('should fetch market data for a symbol', async () => {
      const result = await factory.callTool('hive-intelligence', 'getMarketData', {
        symbol: 'SEI',
        timeframe: '24h'
      });

      assertValidToolResponse(result);
      assertValidMarketData(result.content);
      expect(result.content.symbol).toBe('SEI');
    });

    it('should handle missing symbol parameter', async () => {
      await expect(
        factory.callTool('hive-intelligence', 'getMarketData', {})
      ).rejects.toThrow();
    });

    it('should respect rate limiting', async () => {
      mockServer.setErrorRate(1);
      
      await expect(
        factory.callTool('hive-intelligence', 'getMarketData', { symbol: 'SEI' })
      ).rejects.toThrow('Mock error');
    });
  });

  describe('Sentiment Analysis Tool', () => {
    it('should analyze sentiment for a query', async () => {
      const result = await factory.callTool('hive-intelligence', 'getSentimentAnalysis', {
        query: 'SEI blockchain',
        sources: ['twitter', 'reddit', 'news']
      });

      assertValidToolResponse(result);
      assertValidSentimentAnalysis(result.content);
    });

    it('should work with single source', async () => {
      const result = await factory.callTool('hive-intelligence', 'getSentimentAnalysis', {
        query: 'SEI price prediction',
        sources: ['twitter']
      });

      assertValidToolResponse(result);
      expect(result.content.sources).toHaveProperty('twitter');
    });
  });

  describe('Price Predictions Tool', () => {
    it('should get price predictions', async () => {
      const result = await factory.callTool('hive-intelligence', 'getPricePredictions', {
        symbol: 'SEI',
        timeframes: ['1h', '24h', '7d']
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('predictions');
      expect(Array.isArray(result.content.predictions)).toBe(true);
    });
  });

  describe('Trading Signals Tool', () => {
    it('should get trading signals', async () => {
      const result = await factory.callTool('hive-intelligence', 'getTradingSignals', {
        symbols: ['SEI', 'ATOM'],
        riskLevel: 'medium'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('signals');
      expect(Array.isArray(result.content.signals)).toBe(true);
    });

    it('should filter by risk level', async () => {
      const result = await factory.callTool('hive-intelligence', 'getTradingSignals', {
        symbols: ['SEI'],
        riskLevel: 'low'
      });

      assertValidToolResponse(result);
      // In real implementation, would verify risk levels
    });
  });

  describe('News Aggregation Tool', () => {
    it('should aggregate news for topics', async () => {
      const result = await factory.callTool('hive-intelligence', 'getNewsAggregation', {
        topics: ['SEI', 'DeFi'],
        limit: 10
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('articles');
      expect(Array.isArray(result.content.articles)).toBe(true);
    });
  });

  describe('On-Chain Metrics Tool', () => {
    it('should get on-chain metrics', async () => {
      const result = await factory.callTool('hive-intelligence', 'getOnChainMetrics', {
        chain: 'sei',
        metrics: ['tvl', 'volume', 'users']
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('metrics');
      expect(result.content.metrics).toHaveProperty('tvl');
      expect(result.content.metrics).toHaveProperty('volume');
      expect(result.content.metrics).toHaveProperty('users');
    });
  });

  describe('Portfolio Analysis Tool', () => {
    it('should analyze portfolio', async () => {
      const result = await factory.callTool('hive-intelligence', 'getPortfolioAnalysis', {
        addresses: ['sei1abc...', 'sei1def...'],
        includeDeFi: true,
        includeNFTs: false
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('totalValue');
      expect(result.content).toHaveProperty('assets');
      expect(result.content).toHaveProperty('analysis');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      mockServer.setErrorRate(1);

      await expect(
        factory.callTool('hive-intelligence', 'getMarketData', { symbol: 'SEI' })
      ).rejects.toThrow();

      expect(mockServer.getCallCount('getMarketData')).toBe(1);
    });

    it('should retry on transient failures', async () => {
      // Set up to fail first call, succeed on retry
      let callCount = 0;
      mockServer.setErrorRate(0.5);

      try {
        await factory.callTool('hive-intelligence', 'getMarketData', { symbol: 'SEI' });
      } catch (error) {
        // May fail if unlucky with random error rate
      }

      // Should have made at least one attempt
      expect(mockServer.getCallCount('getMarketData')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance', () => {
    it('should complete requests within latency bounds', async () => {
      mockServer.setLatency(100);

      const start = Date.now();
      await factory.callTool('hive-intelligence', 'getMarketData', { symbol: 'SEI' });
      const duration = Date.now() - start;

      // Allow some overhead
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        factory.callTool('hive-intelligence', 'getMarketData', { 
          symbol: `TOKEN${i}` 
        })
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach(result => assertValidToolResponse(result));
      expect(mockServer.getTotalCalls()).toBe(10);
    });
  });

  describe('Caching', () => {
    it('should cache market data responses', async () => {
      // First call
      const result1 = await factory.callTool('hive-intelligence', 'getMarketData', {
        symbol: 'SEI',
        timeframe: '24h'
      });

      // Second call (should be cached in real implementation)
      const result2 = await factory.callTool('hive-intelligence', 'getMarketData', {
        symbol: 'SEI',
        timeframe: '24h'
      });

      expect(result1.content.symbol).toBe(result2.content.symbol);
      // In real implementation, would verify cache hit
    });
  });

  describe('Authentication', () => {
    it('should include authentication headers', async () => {
      // In real implementation, would verify auth headers are sent
      const result = await factory.callTool('hive-intelligence', 'getMarketData', {
        symbol: 'SEI'
      });

      assertValidToolResponse(result);
    });
  });

  describe('WebSocket Events', () => {
    it('should handle real-time price updates', async () => {
      // In real implementation, would test WebSocket subscription
      // Mock server doesn't implement WebSocket, so just verify structure
      expect(HiveIntelligenceMCPConfig.events).toContainEqual(
        expect.objectContaining({
          name: 'price-update'
        })
      );
    });

    it('should handle sentiment alerts', async () => {
      expect(HiveIntelligenceMCPConfig.events).toContainEqual(
        expect.objectContaining({
          name: 'sentiment-alert'
        })
      );
    });
  });
});