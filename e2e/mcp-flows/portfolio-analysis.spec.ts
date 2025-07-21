/**
 * Portfolio Analysis MCP Flow E2E Tests
 * Tests complete data flow from MCP server to UI for portfolio analysis
 */

import { test, expect } from '@playwright/test';
import { MockMCPServer, createMockServers } from '../../backend/src/__tests__/mcp/mocks/server';
import { generatePortfolioData, generateMarketData } from '../../backend/src/__tests__/mcp/mocks/generators';

// Test configuration
const TEST_TIMEOUT = 30000;
const MOCK_PORTFOLIO_ID = 'e2e-test-portfolio';
const MOCK_WALLET_ADDRESS = 'sei1e2etestaddress...';

test.describe('Portfolio Analysis MCP Flow', () => {
  let mockServers: ReturnType<typeof createMockServers>;
  
  test.beforeAll(async () => {
    // Start mock MCP servers
    mockServers = createMockServers();
    await Promise.all([
      mockServers.hiveIntelligence.start(),
      mockServers.seiBlockchain.start(),
      mockServers.portfolioManager.start()
    ]);
  });

  test.afterAll(async () => {
    // Stop mock servers
    await Promise.all([
      mockServers.hiveIntelligence.stop(),
      mockServers.seiBlockchain.stop(),
      mockServers.portfolioManager.stop()
    ]);
  });

  test.beforeEach(async ({ page }) => {
    // Reset mock server state
    mockServers.portfolioManager.resetCallCounts();
    mockServers.hiveIntelligence.resetCallCounts();
    mockServers.seiBlockchain.resetCallCounts();
    
    // Navigate to portfolio page
    await page.goto('/portfolio');
    
    // Wait for MCP connections to establish
    await page.waitForSelector('[data-testid="mcp-connection-status"]', { 
      state: 'visible',
      timeout: 10000 
    });
  });

  test('should display portfolio composition from MCP data', async ({ page }) => {
    // Wait for portfolio data to load
    await page.waitForSelector('[data-testid="portfolio-composition"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify portfolio value is displayed
    const totalValue = await page.textContent('[data-testid="portfolio-total-value"]');
    expect(totalValue).toMatch(/\$[\d,]+\.?\d*/);

    // Verify assets are displayed
    const assetRows = await page.$$('[data-testid^="asset-row-"]');
    expect(assetRows.length).toBeGreaterThan(0);

    // Verify each asset has required data
    for (const row of assetRows) {
      const symbol = await row.$('[data-testid="asset-symbol"]');
      const value = await row.$('[data-testid="asset-value"]');
      const percentage = await row.$('[data-testid="asset-percentage"]');
      
      expect(await symbol?.textContent()).toBeTruthy();
      expect(await value?.textContent()).toMatch(/\$[\d,]+\.?\d*/);
      expect(await percentage?.textContent()).toMatch(/\d+\.?\d*%/);
    }

    // Verify MCP calls were made
    expect(mockServers.portfolioManager.getCallCount('analyzePortfolioComposition')).toBeGreaterThan(0);
  });

  test('should update portfolio data in real-time', async ({ page }) => {
    // Get initial portfolio value
    const initialValue = await page.textContent('[data-testid="portfolio-total-value"]');
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return (window as any).mcpWebSocketConnected === true;
    }, { timeout: 10000 });

    // Trigger portfolio update via mock server
    // In real test, this would be done through WebSocket event
    await page.evaluate(() => {
      (window as any).mcpTriggerPortfolioUpdate?.();
    });

    // Wait for value to update
    await page.waitForFunction((oldValue) => {
      const newValue = document.querySelector('[data-testid="portfolio-total-value"]')?.textContent;
      return newValue !== oldValue;
    }, initialValue, { timeout: 5000 });

    // Verify new value is different
    const updatedValue = await page.textContent('[data-testid="portfolio-total-value"]');
    expect(updatedValue).not.toBe(initialValue);
  });

  test('should fetch and display risk metrics', async ({ page }) => {
    // Click on risk analysis tab
    await page.click('[data-testid="tab-risk-analysis"]');

    // Wait for risk metrics to load
    await page.waitForSelector('[data-testid="risk-metrics"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify risk score is displayed
    const riskScore = await page.textContent('[data-testid="risk-score"]');
    expect(riskScore).toMatch(/\d+/);
    expect(parseInt(riskScore!)).toBeGreaterThanOrEqual(1);
    expect(parseInt(riskScore!)).toBeLessThanOrEqual(10);

    // Verify specific metrics
    const volatility = await page.textContent('[data-testid="metric-volatility"]');
    const sharpeRatio = await page.textContent('[data-testid="metric-sharpe-ratio"]');
    const maxDrawdown = await page.textContent('[data-testid="metric-max-drawdown"]');

    expect(volatility).toMatch(/\d+\.?\d*%/);
    expect(sharpeRatio).toMatch(/-?\d+\.?\d*/);
    expect(maxDrawdown).toMatch(/\d+\.?\d*%/);

    // Verify MCP call was made
    expect(mockServers.portfolioManager.getCallCount('calculateRiskMetrics')).toBeGreaterThan(0);
  });

  test('should integrate market data with portfolio analysis', async ({ page }) => {
    // Wait for market data integration
    await page.waitForSelector('[data-testid="market-context"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify market data is displayed for portfolio assets
    const assetCards = await page.$$('[data-testid^="asset-market-data-"]');
    
    for (const card of assetCards) {
      const price = await card.$('[data-testid="current-price"]');
      const change = await card.$('[data-testid="24h-change"]');
      
      expect(await price?.textContent()).toMatch(/\$[\d,]+\.?\d*/);
      expect(await change?.textContent()).toMatch(/-?\d+\.?\d*%/);
    }

    // Verify both MCP servers were called
    expect(mockServers.portfolioManager.getCallCount('analyzePortfolioComposition')).toBeGreaterThan(0);
    expect(mockServers.hiveIntelligence.getCallCount('getMarketData')).toBeGreaterThan(0);
  });

  test('should handle MCP server errors gracefully', async ({ page }) => {
    // Set portfolio manager to fail
    mockServers.portfolioManager.setErrorRate(1);

    // Refresh page to trigger error
    await page.reload();

    // Wait for error state
    await page.waitForSelector('[data-testid="portfolio-error-state"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify error message is user-friendly
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).not.toContain('Mock error');
    expect(errorMessage).toContain('unable to load');

    // Verify retry button is present
    const retryButton = await page.$('[data-testid="retry-button"]');
    expect(retryButton).toBeTruthy();

    // Reset error rate and retry
    mockServers.portfolioManager.setErrorRate(0);
    await page.click('[data-testid="retry-button"]');

    // Should recover and show data
    await page.waitForSelector('[data-testid="portfolio-composition"]', {
      timeout: TEST_TIMEOUT
    });
  });

  test('should perform rebalancing workflow', async ({ page }) => {
    // Navigate to rebalancing section
    await page.click('[data-testid="rebalance-portfolio-button"]');

    // Wait for rebalancing modal
    await page.waitForSelector('[data-testid="rebalancing-modal"]', {
      timeout: TEST_TIMEOUT
    });

    // Set target allocations
    await page.fill('[data-testid="allocation-SEI"]', '40');
    await page.fill('[data-testid="allocation-ATOM"]', '30');
    await page.fill('[data-testid="allocation-OSMO"]', '20');
    await page.fill('[data-testid="allocation-USDC"]', '10');

    // Generate suggestions
    await page.click('[data-testid="generate-suggestions-button"]');

    // Wait for suggestions
    await page.waitForSelector('[data-testid="rebalancing-suggestions"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify suggestions are displayed
    const suggestions = await page.$$('[data-testid^="suggestion-"]');
    expect(suggestions.length).toBeGreaterThan(0);

    // Verify cost estimate
    const estimatedCost = await page.textContent('[data-testid="estimated-cost"]');
    expect(estimatedCost).toMatch(/\$[\d,]+\.?\d*/);

    // Verify MCP call was made
    expect(mockServers.portfolioManager.getCallCount('generateRebalancingSuggestions')).toBe(1);
  });

  test('should stream performance report generation', async ({ page }) => {
    // Click generate report button
    await page.click('[data-testid="generate-report-button"]');

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="report-generation-progress"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify progress updates
    let previousProgress = 0;
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(500);
      
      const progressText = await page.textContent('[data-testid="progress-percentage"]');
      const currentProgress = parseInt(progressText!.replace('%', ''));
      
      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
      previousProgress = currentProgress;
      
      if (currentProgress === 100) break;
    }

    // Wait for report to complete
    await page.waitForSelector('[data-testid="performance-report"]', {
      timeout: TEST_TIMEOUT
    });

    // Verify report sections
    const sections = [
      'report-summary',
      'report-performance-metrics',
      'report-risk-analysis',
      'report-recommendations'
    ];

    for (const section of sections) {
      const element = await page.$(`[data-testid="${section}"]`);
      expect(element).toBeTruthy();
    }

    // Verify MCP call was made
    expect(mockServers.portfolioManager.getCallCount('generatePerformanceReport')).toBe(1);
  });

  test('should handle concurrent MCP requests efficiently', async ({ page }) => {
    // Trigger multiple data fetches simultaneously
    await Promise.all([
      page.click('[data-testid="refresh-portfolio"]'),
      page.click('[data-testid="refresh-market-data"]'),
      page.click('[data-testid="refresh-risk-metrics"]')
    ]);

    // Wait for all sections to update
    await Promise.all([
      page.waitForSelector('[data-testid="portfolio-last-updated"]', { timeout: TEST_TIMEOUT }),
      page.waitForSelector('[data-testid="market-last-updated"]', { timeout: TEST_TIMEOUT }),
      page.waitForSelector('[data-testid="risk-last-updated"]', { timeout: TEST_TIMEOUT })
    ]);

    // Verify all MCP servers were called
    expect(mockServers.portfolioManager.getTotalCalls()).toBeGreaterThan(0);
    expect(mockServers.hiveIntelligence.getTotalCalls()).toBeGreaterThan(0);
    expect(mockServers.seiBlockchain.getTotalCalls()).toBeGreaterThan(0);

    // Verify no duplicate requests (efficient batching)
    const portfolioCompCalls = mockServers.portfolioManager.getCallCount('analyzePortfolioComposition');
    expect(portfolioCompCalls).toBe(1); // Should batch/dedupe
  });

  test('should persist MCP connection across navigation', async ({ page }) => {
    // Verify initial connection
    const initialStatus = await page.textContent('[data-testid="mcp-connection-status"]');
    expect(initialStatus).toContain('Connected');

    // Navigate to different page
    await page.click('[data-testid="nav-trading"]');
    await page.waitForURL('**/trading');

    // Navigate back to portfolio
    await page.click('[data-testid="nav-portfolio"]');
    await page.waitForURL('**/portfolio');

    // Verify connection maintained
    const finalStatus = await page.textContent('[data-testid="mcp-connection-status"]');
    expect(finalStatus).toContain('Connected');

    // Verify data loads without reconnection delay
    await page.waitForSelector('[data-testid="portfolio-composition"]', {
      timeout: 5000 // Should be fast since connection persisted
    });
  });

  test('should handle network interruption and recovery', async ({ page, context }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="portfolio-composition"]', {
      timeout: TEST_TIMEOUT
    });

    // Simulate network offline
    await context.setOffline(true);

    // Trigger a refresh that will fail
    await page.click('[data-testid="refresh-portfolio"]');

    // Should show connection error
    await page.waitForSelector('[data-testid="connection-error-banner"]', {
      timeout: TEST_TIMEOUT
    });

    // Restore network
    await context.setOffline(false);

    // Should auto-recover
    await page.waitForSelector('[data-testid="connection-restored-banner"]', {
      timeout: TEST_TIMEOUT
    });

    // Data should reload
    await page.waitForSelector('[data-testid="portfolio-composition"]', {
      timeout: TEST_TIMEOUT
    });
  });
});