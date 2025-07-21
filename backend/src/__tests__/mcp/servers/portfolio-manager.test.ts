/**
 * Portfolio Manager MCP Server Integration Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MCPClientFactory, MCPConnectionManager } from '../../../lib/mcp/client';
import PortfolioManagerMCPConfig from '../../../config/mcp/portfolio-manager';
import { MockMCPServer } from '../mocks/server';
import { 
  generatePortfolioData,
  generateRiskMetrics 
} from '../mocks/generators';
import {
  assertValidToolResponse,
  assertValidPortfolioComposition,
  assertValidRiskMetrics,
  assertValidResourceResponse
} from '../mocks/assertions';

describe('Portfolio Manager MCP Server Integration', () => {
  let mockServer: MockMCPServer;
  let connectionManager: MCPConnectionManager;
  let factory: MCPClientFactory;

  beforeEach(() => {
    // Create mock server with portfolio tools and resources
    mockServer = new MockMCPServer({
      name: 'portfolio-manager',
      tools: PortfolioManagerMCPConfig.tools,
      resources: PortfolioManagerMCPConfig.resources || [],
      latency: 40,
      errorRate: 0
    });

    // Create connection manager
    connectionManager = new MCPConnectionManager({
      servers: [{
        name: 'portfolio-manager',
        type: 'websocket',
        url: 'ws://localhost:3003/mcp'
      }]
    });

    factory = connectionManager.getFactory();
  });

  afterEach(async () => {
    await connectionManager.shutdown();
    await mockServer.stop();
  });

  describe('Portfolio Composition Analysis', () => {
    it('should analyze portfolio composition', async () => {
      const result = await factory.callTool('portfolio-manager', 'analyzePortfolioComposition', {
        portfolioId: 'test-portfolio-123'
      });

      assertValidToolResponse(result);
      assertValidPortfolioComposition(result.content);
    });

    it('should calculate diversification score', async () => {
      const result = await factory.callTool('portfolio-manager', 'analyzePortfolioComposition', {
        portfolioId: 'test-portfolio-123',
        includeDiversificationScore: true
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('diversificationScore');
      expect(result.content.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.content.diversificationScore).toBeLessThanOrEqual(1);
    });

    it('should handle non-existent portfolio', async () => {
      mockServer.setErrorRate(1);

      await expect(
        factory.callTool('portfolio-manager', 'analyzePortfolioComposition', {
          portfolioId: 'non-existent'
        })
      ).rejects.toThrow();
    });
  });

  describe('Historical Performance', () => {
    it('should get historical performance', async () => {
      const result = await factory.callTool('portfolio-manager', 'getHistoricalPerformance', {
        portfolioId: 'test-portfolio-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('performance');
      expect(result.content).toHaveProperty('benchmarkComparison');
      expect(result.content).toHaveProperty('statistics');
    });

    it('should calculate performance metrics', async () => {
      const result = await factory.callTool('portfolio-manager', 'getHistoricalPerformance', {
        portfolioId: 'test-portfolio-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        includeMetrics: true
      });

      assertValidToolResponse(result);
      const stats = result.content.statistics;
      expect(stats).toHaveProperty('totalReturn');
      expect(stats).toHaveProperty('annualizedReturn');
      expect(stats).toHaveProperty('volatility');
      expect(stats).toHaveProperty('sharpeRatio');
    });

    it('should compare against benchmark', async () => {
      const result = await factory.callTool('portfolio-manager', 'getHistoricalPerformance', {
        portfolioId: 'test-portfolio-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        benchmark: 'SEI_INDEX'
      });

      assertValidToolResponse(result);
      expect(result.content.benchmarkComparison).toHaveProperty('alpha');
      expect(result.content.benchmarkComparison).toHaveProperty('beta');
      expect(result.content.benchmarkComparison).toHaveProperty('correlation');
    });
  });

  describe('Risk Metrics Calculation', () => {
    it('should calculate comprehensive risk metrics', async () => {
      const result = await factory.callTool('portfolio-manager', 'calculateRiskMetrics', {
        portfolioId: 'test-portfolio-123',
        timeframe: '1Y'
      });

      assertValidToolResponse(result);
      assertValidRiskMetrics(result.content);
    });

    it('should calculate VaR at different confidence levels', async () => {
      const result = await factory.callTool('portfolio-manager', 'calculateRiskMetrics', {
        portfolioId: 'test-portfolio-123',
        timeframe: '1Y',
        varConfidenceLevels: [0.95, 0.99]
      });

      assertValidToolResponse(result);
      expect(result.content.metrics).toHaveProperty('var95');
      expect(result.content.metrics).toHaveProperty('var99');
      expect(result.content.metrics.var99).toBeGreaterThan(result.content.metrics.var95);
    });

    it('should include stress test scenarios', async () => {
      const result = await factory.callTool('portfolio-manager', 'calculateRiskMetrics', {
        portfolioId: 'test-portfolio-123',
        timeframe: '1Y',
        includeStressTests: true
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('stressTests');
      expect(Array.isArray(result.content.stressTests)).toBe(true);
    });
  });

  describe('Liquidity Risk Assessment', () => {
    it('should assess liquidity risk', async () => {
      const result = await factory.callTool('portfolio-manager', 'assessLiquidityRisk', {
        portfolioId: 'test-portfolio-123'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('liquidityScore');
      expect(result.content).toHaveProperty('illiquidAssets');
      expect(result.content).toHaveProperty('liquidationTimeframe');
    });

    it('should identify illiquid positions', async () => {
      const result = await factory.callTool('portfolio-manager', 'assessLiquidityRisk', {
        portfolioId: 'test-portfolio-123',
        thresholdDays: 7
      });

      assertValidToolResponse(result);
      expect(result.content.illiquidAssets).toBeDefined();
      result.content.illiquidAssets.forEach((asset: any) => {
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('estimatedLiquidationTime');
        expect(asset.estimatedLiquidationTime).toBeGreaterThan(7);
      });
    });
  });

  describe('Rebalancing Suggestions', () => {
    it('should generate rebalancing suggestions', async () => {
      const result = await factory.callTool('portfolio-manager', 'generateRebalancingSuggestions', {
        portfolioId: 'test-portfolio-123',
        targetAllocation: {
          'SEI': 40,
          'ATOM': 30,
          'OSMO': 20,
          'USDC': 10
        }
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('suggestions');
      expect(Array.isArray(result.content.suggestions)).toBe(true);
      expect(result.content).toHaveProperty('estimatedCost');
      expect(result.content).toHaveProperty('expectedImprovement');
    });

    it('should respect constraints', async () => {
      const result = await factory.callTool('portfolio-manager', 'generateRebalancingSuggestions', {
        portfolioId: 'test-portfolio-123',
        targetAllocation: {
          'SEI': 50,
          'ATOM': 50
        },
        constraints: {
          maxTradeSize: 1000,
          minPositionSize: 100,
          avoidAssets: ['LUNA']
        }
      });

      assertValidToolResponse(result);
      result.content.suggestions.forEach((suggestion: any) => {
        expect(Math.abs(suggestion.amount)).toBeLessThanOrEqual(1000);
        expect(suggestion.asset).not.toBe('LUNA');
      });
    });
  });

  describe('Tax Optimization', () => {
    it('should optimize tax strategy', async () => {
      const result = await factory.callTool('portfolio-manager', 'optimizeTaxStrategy', {
        portfolioId: 'test-portfolio-123',
        taxYear: 2024,
        jurisdiction: 'US'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('strategy');
      expect(result.content).toHaveProperty('potentialSavings');
      expect(result.content).toHaveProperty('recommendations');
    });

    it('should identify tax loss harvesting opportunities', async () => {
      const result = await factory.callTool('portfolio-manager', 'optimizeTaxStrategy', {
        portfolioId: 'test-portfolio-123',
        taxYear: 2024,
        jurisdiction: 'US',
        strategies: ['tax-loss-harvesting']
      });

      assertValidToolResponse(result);
      expect(result.content.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'tax-loss-harvest'
        })
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      const result = await factory.callTool('portfolio-manager', 'trackPerformanceMetrics', {
        portfolioId: 'test-portfolio-123',
        metrics: ['roi', 'sharpe', 'sortino', 'calmar']
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('metrics');
      expect(result.content.metrics).toHaveProperty('roi');
      expect(result.content.metrics).toHaveProperty('sharpe');
      expect(result.content.metrics).toHaveProperty('sortino');
      expect(result.content.metrics).toHaveProperty('calmar');
    });

    it('should track against multiple benchmarks', async () => {
      const result = await factory.callTool('portfolio-manager', 'trackPerformanceMetrics', {
        portfolioId: 'test-portfolio-123',
        metrics: ['roi'],
        benchmarks: ['SEI_INDEX', 'CRYPTO_20']
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('benchmarkComparison');
      expect(result.content.benchmarkComparison).toHaveProperty('SEI_INDEX');
      expect(result.content.benchmarkComparison).toHaveProperty('CRYPTO_20');
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const result = await factory.callTool('portfolio-manager', 'generatePerformanceReport', {
        portfolioId: 'test-portfolio-123',
        period: 'monthly',
        format: 'detailed'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('summary');
      expect(result.content).toHaveProperty('detailedAnalysis');
      expect(result.content).toHaveProperty('charts');
      expect(result.content).toHaveProperty('recommendations');
    });

    it('should support different report formats', async () => {
      const summaryReport = await factory.callTool('portfolio-manager', 'generatePerformanceReport', {
        portfolioId: 'test-portfolio-123',
        period: 'quarterly',
        format: 'summary'
      });

      const detailedReport = await factory.callTool('portfolio-manager', 'generatePerformanceReport', {
        portfolioId: 'test-portfolio-123',
        period: 'quarterly',
        format: 'detailed'
      });

      assertValidToolResponse(summaryReport);
      assertValidToolResponse(detailedReport);
      
      // Detailed report should have more sections
      expect(Object.keys(detailedReport.content)).toHaveLength(
        expect.arrayContaining(Object.keys(summaryReport.content)).length
      );
    });
  });

  describe('Resource Access', () => {
    it('should read daily portfolio report', async () => {
      const result = await factory.readResource(
        'portfolio-manager',
        'portfolio://reports/daily'
      );

      assertValidResourceResponse(result);
      expect(result.contents[0].uri).toBe('portfolio://reports/daily');
      expect(result.contents[0].mimeType).toBe('application/json');
    });

    it('should handle missing resources', async () => {
      await expect(
        factory.readResource('portfolio-manager', 'portfolio://invalid')
      ).rejects.toThrow('Resource not found');
    });
  });

  describe('Real-time Updates', () => {
    it('should support portfolio value updates', async () => {
      // In real implementation, would test WebSocket events
      expect(PortfolioManagerMCPConfig.events).toContainEqual(
        expect.objectContaining({
          name: 'portfolio-value-update'
        })
      );
    });

    it('should support risk alert events', async () => {
      expect(PortfolioManagerMCPConfig.events).toContainEqual(
        expect.objectContaining({
          name: 'risk-alert'
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform complete portfolio analysis workflow', async () => {
      const portfolioId = 'test-portfolio-123';

      // 1. Analyze composition
      const composition = await factory.callTool(
        'portfolio-manager',
        'analyzePortfolioComposition',
        { portfolioId }
      );

      // 2. Calculate risk metrics
      const risk = await factory.callTool(
        'portfolio-manager',
        'calculateRiskMetrics',
        { portfolioId, timeframe: '1Y' }
      );

      // 3. Generate rebalancing suggestions
      const rebalancing = await factory.callTool(
        'portfolio-manager',
        'generateRebalancingSuggestions',
        {
          portfolioId,
          targetAllocation: {
            'SEI': 40,
            'ATOM': 30,
            'OSMO': 20,
            'USDC': 10
          }
        }
      );

      // 4. Generate report
      const report = await factory.callTool(
        'portfolio-manager',
        'generatePerformanceReport',
        { portfolioId, period: 'monthly', format: 'summary' }
      );

      assertValidToolResponse(composition);
      assertValidToolResponse(risk);
      assertValidToolResponse(rebalancing);
      assertValidToolResponse(report);
    });
  });
});