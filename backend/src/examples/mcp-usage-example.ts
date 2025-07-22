/**
 * MCP Usage Examples
 * 
 * This file demonstrates how to use the MCP HTTP client in various scenarios
 * with proper error handling and type safety.
 */

import { mcpTools, getMCPHttpClient } from '../utils/mcp-http-client';
import { createServiceLogger } from '../services/LoggingService';

const logger = createServiceLogger('MCPUsageExample');

/**
 * Example 1: Using typed tool callers
 */
export async function exampleTypedToolUsage() {
  logger.info('Example 1: Using typed tool callers');

  try {
    // Hive Intelligence - Market data
    const marketData = await mcpTools.hiveIntelligence.getMarketData({
      symbol: 'SEI-USD',
      timeframe: '1d'
    });
    logger.info('Market data received:', marketData);

    // Hive Intelligence - Sentiment analysis
    const sentiment = await mcpTools.hiveIntelligence.analyzeSentiment({
      text: 'SEI Network is showing strong fundamentals and growing adoption',
      context: 'cryptocurrency_analysis'
    });
    logger.info('Sentiment analysis:', sentiment);

    // SEI Blockchain - Wallet balance
    const balance = await mcpTools.seiBlockchain.getWalletBalance({
      address: 'sei1...' // Replace with actual address
    });
    logger.info('Wallet balance:', balance);

    // Portfolio Manager - Portfolio analysis
    const portfolioAnalysis = await mcpTools.portfolioManager.analyzePortfolio({
      walletAddress: 'sei1...' // Replace with actual address
    });
    logger.info('Portfolio analysis:', portfolioAnalysis);

  } catch (error) {
    logger.error('Typed tool usage failed:', error);
  }
}

/**
 * Example 2: Using the direct client with custom error handling
 */
export async function exampleDirectClientUsage() {
  logger.info('Example 2: Using direct client with error handling');

  const mcpClient = getMCPHttpClient();

  try {
    // Call a tool with custom parameters
    const result = await mcpClient.callTool('hiveIntelligence', 'customAnalysis', {
      timeRange: '7d',
      metrics: ['price', 'volume', 'sentiment'],
      assets: ['SEI', 'USDC']
    });
    
    logger.info('Custom analysis result:', result);

  } catch (error) {
    logger.error('Direct client usage failed:', error);
    
    // Handle different error types
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        logger.warn('MCP server endpoint not found - server may not be running');
      } else if (error.message.includes('401')) {
        logger.warn('Authentication failed - check API key configuration');
      } else if (error.message.includes('500')) {
        logger.warn('Server error - the MCP server encountered an internal error');
      }
    }
  }
}

/**
 * Example 3: Batch operations with error resilience
 */
export async function exampleBatchOperations() {
  logger.info('Example 3: Batch operations with error resilience');

  const mcpClient = getMCPHttpClient();
  const walletAddresses = ['sei1address1', 'sei1address2', 'sei1address3']; // Example addresses

  const results = await Promise.allSettled(
    walletAddresses.map(async (address) => {
      try {
        const [balance, transactions, portfolio] = await Promise.all([
          mcpTools.seiBlockchain.getWalletBalance({ address }),
          mcpTools.seiBlockchain.getTransactionHistory({ address, limit: 10 }),
          mcpTools.portfolioManager.analyzePortfolio({ walletAddress: address })
        ]);

        return {
          address,
          balance,
          transactions,
          portfolio,
          success: true
        };
      } catch (error) {
        logger.warn(`Failed to process wallet ${address}:`, error);
        return {
          address,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

  logger.info(`Batch operation completed: ${successful.length} successful, ${failed.length} failed`);

  return {
    successful: successful.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean),
    failed: failed.length
  };
}

/**
 * Example 4: Health monitoring and circuit breaker pattern
 */
export async function exampleHealthMonitoring() {
  logger.info('Example 4: Health monitoring');

  const mcpClient = getMCPHttpClient();

  try {
    // Check health of all servers
    const health = await mcpClient.healthCheckAll();
    
    logger.info('Server health status:', health);

    // Only proceed if critical servers are healthy
    const criticalServers = ['seiBlockchain', 'portfolioManager'] as const;
    const criticalHealthy = criticalServers.every(server => health[server]);

    if (!criticalHealthy) {
      throw new Error('Critical MCP servers are unhealthy - aborting operations');
    }

    // Proceed with operations only if servers are healthy
    const marketData = await mcpTools.hiveIntelligence.getMarketData({
      symbol: 'SEI-USD'
    });

    return { healthy: true, data: marketData };

  } catch (error) {
    logger.error('Health monitoring failed:', error);
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Example 5: Integration with business logic
 */
export async function examplePortfolioRebalancing(walletAddress: string) {
  logger.info('Example 5: Portfolio rebalancing workflow');

  try {
    // Step 1: Analyze current portfolio
    const currentPortfolio = await mcpTools.portfolioManager.analyzePortfolio({
      walletAddress
    });

    logger.info('Current portfolio analysis:', currentPortfolio);

    // Step 2: Calculate risk metrics
    const riskAssessment = await mcpTools.portfolioManager.calculateRisk({
      portfolio: currentPortfolio
    });

    logger.info('Risk assessment:', riskAssessment);

    // Step 3: Get market data for decision making
    const marketData = await mcpTools.hiveIntelligence.getMarketData({
      symbol: 'SEI-USD',
      timeframe: '1h'
    });

    // Step 4: Generate optimization recommendations
    const optimizationPlan = await mcpTools.portfolioManager.optimizeAllocation({
      portfolio: currentPortfolio,
      constraints: {
        maxRisk: 0.7,
        minDiversification: 0.5,
        marketConditions: marketData
      }
    });

    logger.info('Optimization plan generated:', optimizationPlan);

    return {
      currentPortfolio,
      riskAssessment,
      marketData,
      optimizationPlan,
      recommendedActions: optimizationPlan.actions || []
    };

  } catch (error) {
    logger.error('Portfolio rebalancing workflow failed:', error);
    throw error;
  }
}

// Example usage when this module is imported
export default {
  exampleTypedToolUsage,
  exampleDirectClientUsage,
  exampleBatchOperations,
  exampleHealthMonitoring,
  examplePortfolioRebalancing
};