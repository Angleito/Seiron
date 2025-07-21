/**
 * Voice Chat Investment Advisory MCP Flow E2E Tests
 * Tests voice chat integration with MCP servers for investment advice
 */

import { test, expect, Page } from '@playwright/test';
import { MockMCPServer, createMockServers } from '../../backend/src/__tests__/mcp/mocks/server';

// Test configuration
const TEST_TIMEOUT = 45000;
const VOICE_TEST_TIMEOUT = 60000;

// Helper to simulate voice input
async function simulateVoiceInput(page: Page, transcript: string) {
  await page.evaluate((text) => {
    // Trigger mock speech recognition
    (window as any).mockSpeechRecognition?.simulateTranscript(text);
  }, transcript);
}

// Helper to wait for AI response
async function waitForAIResponse(page: Page) {
  await page.waitForSelector('[data-testid="ai-response-complete"]', {
    timeout: 10000
  });
}

test.describe('Voice Chat Investment Advisory MCP Flow', () => {
  let mockServers: ReturnType<typeof createMockServers>;
  
  test.beforeAll(async () => {
    // Start mock MCP servers
    mockServers = createMockServers();
    
    // Configure servers for voice chat scenarios
    mockServers.hiveIntelligence.setLatency(200); // Simulate realistic latency
    mockServers.seiBlockchain.setLatency(150);
    mockServers.portfolioManager.setLatency(100);
    
    await Promise.all([
      mockServers.hiveIntelligence.start(),
      mockServers.seiBlockchain.start(),
      mockServers.portfolioManager.start()
    ]);
  });

  test.afterAll(async () => {
    await Promise.all([
      mockServers.hiveIntelligence.stop(),
      mockServers.seiBlockchain.stop(),
      mockServers.portfolioManager.stop()
    ]);
  });

  test.beforeEach(async ({ page }) => {
    // Reset mock servers
    Object.values(mockServers).forEach(server => {
      server.resetCallCounts();
      server.setErrorRate(0);
    });
    
    // Navigate to chat page
    await page.goto('/chat');
    
    // Wait for voice chat to initialize
    await page.waitForSelector('[data-testid="voice-chat-ready"]', {
      timeout: TEST_TIMEOUT
    });
    
    // Grant microphone permission (mocked)
    await page.evaluate(() => {
      (window as any).mockMicrophonePermission = 'granted';
    });
  });

  test('should provide portfolio analysis via voice command', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Start voice recording
    await page.click('[data-testid="voice-button"]');
    await page.waitForSelector('[data-testid="voice-status-listening"]');

    // Simulate voice input
    await simulateVoiceInput(page, "What's my portfolio looking like today?");

    // Stop recording
    await page.click('[data-testid="voice-button"]');
    await page.waitForSelector('[data-testid="voice-status-processing"]');

    // Wait for AI response
    await waitForAIResponse(page);

    // Verify response contains portfolio data
    const response = await page.textContent('[data-testid="ai-response-text"]');
    expect(response).toContain('portfolio');
    expect(response).toMatch(/\$[\d,]+/); // Contains dollar amounts

    // Verify visual portfolio summary is displayed
    const portfolioCard = await page.$('[data-testid="voice-portfolio-summary"]');
    expect(portfolioCard).toBeTruthy();

    // Verify MCP calls were made
    expect(mockServers.portfolioManager.getCallCount('analyzePortfolioComposition')).toBe(1);
    expect(mockServers.portfolioManager.getCallCount('getHistoricalPerformance')).toBe(1);

    // Verify voice response is being spoken
    await page.waitForSelector('[data-testid="voice-status-speaking"]');
  });

  test('should provide real-time market analysis', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Activate voice
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "What's the current SEI price and market sentiment?");
    await page.click('[data-testid="voice-button"]');

    // Wait for response
    await waitForAIResponse(page);

    // Verify market data in response
    const response = await page.textContent('[data-testid="ai-response-text"]');
    expect(response).toContain('SEI');
    expect(response).toMatch(/\$\d+\.\d+/); // Price format
    expect(response?.toLowerCase()).toMatch(/sentiment|bullish|bearish|neutral/);

    // Verify price widget is shown
    const priceWidget = await page.$('[data-testid="sei-price-widget"]');
    expect(priceWidget).toBeTruthy();

    // Verify sentiment indicator
    const sentimentIndicator = await page.$('[data-testid="sentiment-indicator"]');
    const sentimentClass = await sentimentIndicator?.getAttribute('class');
    expect(sentimentClass).toMatch(/sentiment-(bullish|bearish|neutral)/);

    // Verify MCP calls
    expect(mockServers.hiveIntelligence.getCallCount('getMarketData')).toBe(1);
    expect(mockServers.hiveIntelligence.getCallCount('getSentimentAnalysis')).toBe(1);
  });

  test('should suggest DeFi opportunities based on voice query', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Voice query for DeFi opportunities
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Show me the best DeFi opportunities on Sei");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Verify DeFi opportunities are displayed
    const defiCards = await page.$$('[data-testid^="defi-opportunity-"]');
    expect(defiCards.length).toBeGreaterThan(0);

    // Verify each opportunity has required info
    for (const card of defiCards) {
      const protocol = await card.$('[data-testid="defi-protocol"]');
      const apy = await card.$('[data-testid="defi-apy"]');
      const tvl = await card.$('[data-testid="defi-tvl"]');
      
      expect(await protocol?.textContent()).toBeTruthy();
      expect(await apy?.textContent()).toMatch(/\d+\.?\d*%/);
      expect(await tvl?.textContent()).toMatch(/\$[\d,]+/);
    }

    // Verify MCP calls
    expect(mockServers.seiBlockchain.getCallCount('getLiquidityPools')).toBeGreaterThan(0);
    expect(mockServers.seiBlockchain.getCallCount('getDeFiPositions')).toBeGreaterThan(0);
  });

  test('should execute token swap via voice command', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Voice command for swap
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Swap 100 SEI to USDC");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Should show swap preview
    await page.waitForSelector('[data-testid="swap-preview-modal"]');

    // Verify swap details
    const fromAmount = await page.textContent('[data-testid="swap-from-amount"]');
    const toAmount = await page.textContent('[data-testid="swap-to-amount"]');
    const rate = await page.textContent('[data-testid="swap-rate"]');

    expect(fromAmount).toContain('100');
    expect(fromAmount).toContain('SEI');
    expect(toAmount).toContain('USDC');
    expect(rate).toMatch(/1 SEI = \d+\.?\d* USDC/);

    // User confirms via voice
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Yes, confirm the swap");
    await page.click('[data-testid="voice-button"]');

    // Wait for transaction
    await page.waitForSelector('[data-testid="transaction-success"]', {
      timeout: 15000
    });

    // Verify MCP calls
    expect(mockServers.seiBlockchain.getCallCount('executeTokenSwap')).toBe(1);
  });

  test('should provide risk analysis with voice interaction', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Ask about portfolio risk
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Analyze the risk in my portfolio");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Verify risk metrics are displayed
    const riskDashboard = await page.$('[data-testid="voice-risk-dashboard"]');
    expect(riskDashboard).toBeTruthy();

    // Check specific metrics
    const riskScore = await page.textContent('[data-testid="voice-risk-score"]');
    const volatility = await page.textContent('[data-testid="voice-volatility"]');
    const recommendations = await page.$$('[data-testid^="risk-recommendation-"]');

    expect(riskScore).toMatch(/\d+\/10/);
    expect(volatility).toMatch(/\d+\.?\d*%/);
    expect(recommendations.length).toBeGreaterThan(0);

    // Follow-up question
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "How can I reduce my risk?");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Should show rebalancing suggestions
    const rebalancingSuggestions = await page.$$('[data-testid^="rebalance-suggestion-"]');
    expect(rebalancingSuggestions.length).toBeGreaterThan(0);

    // Verify MCP calls
    expect(mockServers.portfolioManager.getCallCount('calculateRiskMetrics')).toBeGreaterThan(0);
    expect(mockServers.portfolioManager.getCallCount('generateRebalancingSuggestions')).toBe(1);
  });

  test('should handle conversation context across multiple queries', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // First query about SEI
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Tell me about SEI token");
    await page.click('[data-testid="voice-button"]');
    await waitForAIResponse(page);

    // Second query with context
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Should I buy more of it?");
    await page.click('[data-testid="voice-button"]');
    await waitForAIResponse(page);

    // Response should understand "it" refers to SEI
    const response = await page.textContent('[data-testid="ai-response-text"]');
    expect(response).toContain('SEI');

    // Should show personalized recommendation
    const recommendation = await page.$('[data-testid="investment-recommendation"]');
    expect(recommendation).toBeTruthy();

    // Third query building on context
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "What about compared to ATOM?");
    await page.click('[data-testid="voice-button"]');
    await waitForAIResponse(page);

    // Should show comparison
    const comparison = await page.$('[data-testid="token-comparison"]');
    expect(comparison).toBeTruthy();

    // Verify conversation memory is maintained
    const conversationHistory = await page.$$('[data-testid^="conversation-turn-"]');
    expect(conversationHistory.length).toBe(6); // 3 user + 3 AI messages
  });

  test('should handle MCP errors gracefully in voice context', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Set portfolio manager to fail
    mockServers.portfolioManager.setErrorRate(1);

    // Try to get portfolio analysis
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Show me my portfolio");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Should provide graceful error response
    const response = await page.textContent('[data-testid="ai-response-text"]');
    expect(response).toContain('having trouble accessing');
    expect(response).not.toContain('Mock error');

    // Should offer alternative
    expect(response).toMatch(/try again|moment|alternative/i);

    // Reset error and retry via voice
    mockServers.portfolioManager.setErrorRate(0);

    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Try again please");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Should succeed this time
    const retryResponse = await page.textContent('[data-testid="ai-response-text"]');
    expect(retryResponse).toContain('portfolio');
    expect(retryResponse).not.toContain('trouble');
  });

  test('should support voice commands for quick actions', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Test various voice commands
    const commands = [
      { input: "Show my balance", expectedElement: '[data-testid="balance-display"]' },
      { input: "What are gas fees right now?", expectedElement: '[data-testid="gas-fee-info"]' },
      { input: "Show me trending tokens", expectedElement: '[data-testid="trending-tokens"]' },
      { input: "Check my staking rewards", expectedElement: '[data-testid="staking-rewards"]' }
    ];

    for (const command of commands) {
      await page.click('[data-testid="voice-button"]');
      await simulateVoiceInput(page, command.input);
      await page.click('[data-testid="voice-button"]');
      
      await waitForAIResponse(page);
      
      const element = await page.$(command.expectedElement);
      expect(element).toBeTruthy();
      
      // Small delay between commands
      await page.waitForTimeout(1000);
    }

    // Verify appropriate MCP calls were made
    expect(mockServers.seiBlockchain.getCallCount('getWalletBalance')).toBeGreaterThan(0);
    expect(mockServers.seiBlockchain.getCallCount('getStakingInfo')).toBeGreaterThan(0);
    expect(mockServers.hiveIntelligence.getCallCount('getMarketData')).toBeGreaterThan(0);
  });

  test('should maintain voice chat performance with multiple MCP calls', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Complex query requiring multiple MCP calls
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, 
      "Give me a complete analysis of my portfolio with market context and recommendations"
    );
    await page.click('[data-testid="voice-button"]');

    const startTime = Date.now();
    await waitForAIResponse(page);
    const responseTime = Date.now() - startTime;

    // Should respond within reasonable time despite multiple MCP calls
    expect(responseTime).toBeLessThan(5000);

    // Verify comprehensive response
    const sections = [
      '[data-testid="portfolio-summary-section"]',
      '[data-testid="market-context-section"]',
      '[data-testid="risk-analysis-section"]',
      '[data-testid="recommendations-section"]'
    ];

    for (const section of sections) {
      const element = await page.$(section);
      expect(element).toBeTruthy();
    }

    // Verify parallel MCP calls were made efficiently
    const totalCalls = 
      mockServers.portfolioManager.getTotalCalls() +
      mockServers.hiveIntelligence.getTotalCalls() +
      mockServers.seiBlockchain.getTotalCalls();
    
    expect(totalCalls).toBeGreaterThan(5); // Multiple calls
    expect(totalCalls).toBeLessThan(15); // But not excessive
  });

  test('should handle voice interruption and context switching', async ({ page }) => {
    test.setTimeout(VOICE_TEST_TIMEOUT);

    // Start asking about portfolio
    await page.click('[data-testid="voice-button"]');
    await simulateVoiceInput(page, "Tell me about my portf-");
    
    // Interrupt and ask different question
    await page.click('[data-testid="voice-button"]'); // Stop
    await page.click('[data-testid="voice-button"]'); // Start again
    await simulateVoiceInput(page, "Actually, what's the SEI price?");
    await page.click('[data-testid="voice-button"]');

    await waitForAIResponse(page);

    // Should respond to the second query
    const response = await page.textContent('[data-testid="ai-response-text"]');
    expect(response).toContain('SEI');
    expect(response).toMatch(/\$\d+\.\d+/);
    expect(response).not.toContain('portfolio');

    // Original portfolio call should have been cancelled
    expect(mockServers.portfolioManager.getCallCount('analyzePortfolioComposition')).toBe(0);
    expect(mockServers.hiveIntelligence.getCallCount('getMarketData')).toBe(1);
  });
});