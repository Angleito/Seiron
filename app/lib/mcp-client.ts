/**
 * Unified MCP Client Library
 * Centralized client for interacting with MCP servers
 */

import { 
  MCPServerConfig, 
  MCPToolRequest, 
  MCPToolResponse, 
  MCPServerHealth,
  MCPTools,
  MCPError,
  MCPErrorCode,
  MCPRequestContext,
  MCPResponseContext
} from './mcp-types';

/**
 * MCP Server Configuration from Environment Variables
 */
const MCP_SERVERS: Record<keyof MCPTools, MCPServerConfig> = {
  hive: {
    name: 'hive',
    url: process.env.MCP_HIVE_URL || 'https://hive-intelligence-mcp-production.up.railway.app',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  sei: {
    name: 'sei',
    url: process.env.MCP_SEI_URL || 'https://sei-blockchain-mcp-production.up.railway.app',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  portfolio: {
    name: 'portfolio',
    url: process.env.MCP_PORTFOLIO_URL || 'https://portfolio-manager-mcp-production.up.railway.app',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

/**
 * Call an MCP tool with retry logic and error handling
 */
export async function callMCPTool<
  S extends keyof MCPTools,
  T extends keyof MCPTools[S]
>(
  server: S,
  tool: T,
  args: MCPTools[S][T]['params']
): Promise<MCPToolResponse<MCPTools[S][T]['response']>> {
  const config = MCP_SERVERS[server];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retryAttempts!; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(`${config.url}/mcp/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, arguments: args }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new MCPError(
          MCPErrorCode.SERVER_ERROR,
          `MCP ${server} error: ${response.status} ${response.statusText}`,
          server,
          tool as string
        );
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.error) {
        throw new MCPError(
          MCPErrorCode.SERVER_ERROR,
          data.error,
          server,
          tool as string
        );
      }

      return {
        result: data.result || data.content || data,
        status: 'success',
      };

    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new MCPError(
          MCPErrorCode.TIMEOUT,
          `Request to ${server}/${tool} timed out`,
          server,
          tool as string
        );
      }

      console.warn(`MCP ${server}/${tool} attempt ${attempt + 1} failed:`, error);

      if (attempt < config.retryAttempts!) {
        await new Promise(resolve => 
          setTimeout(resolve, config.retryDelay! * (attempt + 1))
        );
      }
    }
  }

  throw lastError || new MCPError(
    MCPErrorCode.CONNECTION_FAILED,
    `Failed to call ${server}/${tool}`,
    server,
    tool as string
  );
}

/**
 * Health check for MCP servers
 */
export async function checkMCPServerHealth(
  server: keyof MCPTools
): Promise<MCPServerHealth> {
  const config = MCP_SERVERS[server];
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${config.url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      server,
      status: response.ok ? 'healthy' : 'unhealthy',
      lastChecked: new Date(),
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };

  } catch (error) {
    return {
      server,
      status: 'unhealthy',
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check health of all MCP servers
 */
export async function checkAllMCPServers(): Promise<MCPServerHealth[]> {
  const servers = Object.keys(MCP_SERVERS) as Array<keyof MCPTools>;
  const healthChecks = await Promise.allSettled(
    servers.map(server => checkMCPServerHealth(server))
  );

  return healthChecks.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        server: servers[index],
        status: 'unknown' as const,
        lastChecked: new Date(),
        error: result.reason?.message || 'Health check failed',
      };
    }
  });
}

/**
 * Extract cryptocurrency symbols from user message
 */
function extractSymbols(message: string): string[] {
  const commonSymbols = ['SEI', 'BTC', 'ETH', 'USDC', 'USDT', 'ATOM', 'OSMO', 'WBTC', 'WETH'];
  const symbols: string[] = [];
  
  for (const symbol of commonSymbols) {
    if (message.toUpperCase().includes(symbol)) {
      symbols.push(symbol);
    }
  }
  
  // Default to SEI if no symbols found
  return symbols.length > 0 ? symbols : ['SEI'];
}

/**
 * Handle MCP requests based on user message context
 */
export async function handleMCPRequests(
  context: MCPRequestContext
): Promise<MCPResponseContext> {
  const { message, walletAddress } = context;
  const lowerMessage = message.toLowerCase();
  const responseContext: MCPResponseContext = {
    context: '',
    data: {},
    tools: [],
  };

  try {
    // Market data requests
    if (lowerMessage.includes('price') || lowerMessage.includes('market') || lowerMessage.includes('chart')) {
      const symbols = extractSymbols(message);
      if (symbols.length > 0) {
        try {
          const marketData = await callMCPTool('hive', 'getMarketData', { symbols });
          responseContext.data.marketData = marketData.result;
          responseContext.context += `Market Data: ${JSON.stringify(marketData.result)}\n`;
          responseContext.tools.push('hive.getMarketData');
        } catch (error) {
          console.warn('Market data fetch failed:', error);
          responseContext.context += 'Note: Market data temporarily unavailable. ';
        }
      }
    }

    // Trending tokens
    if (lowerMessage.includes('trending') || lowerMessage.includes('hot') || lowerMessage.includes('popular')) {
      try {
        const trending = await callMCPTool('hive', 'getTrendingTokens', { limit: 10 });
        responseContext.data.trending = trending.result;
        responseContext.context += `Trending Tokens: ${JSON.stringify(trending.result)}\n`;
        responseContext.tools.push('hive.getTrendingTokens');
      } catch (error) {
        console.warn('Trending tokens fetch failed:', error);
      }
    }

    // Wallet balance requests
    if (walletAddress && (lowerMessage.includes('balance') || lowerMessage.includes('wallet') || lowerMessage.includes('holdings'))) {
      try {
        const balanceData = await callMCPTool('sei', 'getWalletBalance', { address: walletAddress });
        responseContext.data.balance = balanceData.result;
        responseContext.context += `Wallet Balance: ${JSON.stringify(balanceData.result)}\n`;
        responseContext.tools.push('sei.getWalletBalance');
      } catch (error) {
        console.warn('Wallet balance fetch failed:', error);
        responseContext.context += 'Note: Wallet data temporarily unavailable. ';
      }
    }

    // Portfolio analysis
    if (walletAddress && (lowerMessage.includes('portfolio') || lowerMessage.includes('composition') || lowerMessage.includes('allocation'))) {
      try {
        const portfolioData = await callMCPTool('portfolio', 'analyzePortfolioComposition', { walletAddress });
        responseContext.data.portfolio = portfolioData.result;
        responseContext.context += `Portfolio Analysis: ${JSON.stringify(portfolioData.result)}\n`;
        responseContext.tools.push('portfolio.analyzePortfolioComposition');
      } catch (error) {
        console.warn('Portfolio analysis failed:', error);
      }
    }

    // Transaction history
    if (walletAddress && (lowerMessage.includes('transaction') || lowerMessage.includes('history') || lowerMessage.includes('tx'))) {
      try {
        const txHistory = await callMCPTool('sei', 'getTransactionHistory', { 
          address: walletAddress, 
          limit: 5 
        });
        responseContext.data.transactions = txHistory.result;
        responseContext.context += `Recent Transactions: ${JSON.stringify(txHistory.result)}\n`;
        responseContext.tools.push('sei.getTransactionHistory');
      } catch (error) {
        console.warn('Transaction history fetch failed:', error);
      }
    }

    // Performance metrics
    if (walletAddress && (lowerMessage.includes('performance') || lowerMessage.includes('return') || lowerMessage.includes('profit'))) {
      try {
        const performance = await callMCPTool('portfolio', 'getHistoricalPerformance', { 
          walletAddress, 
          timeframe: '30d' 
        });
        responseContext.data.performance = performance.result;
        responseContext.context += `Performance Data: ${JSON.stringify(performance.result)}\n`;
        responseContext.tools.push('portfolio.getHistoricalPerformance');
      } catch (error) {
        console.warn('Performance data fetch failed:', error);
      }
    }

    // Risk metrics
    if (walletAddress && (lowerMessage.includes('risk') || lowerMessage.includes('volatility') || lowerMessage.includes('safety'))) {
      try {
        const riskData = await callMCPTool('portfolio', 'getRiskMetrics', { walletAddress });
        responseContext.data.risk = riskData.result;
        responseContext.context += `Risk Metrics: ${JSON.stringify(riskData.result)}\n`;
        responseContext.tools.push('portfolio.getRiskMetrics');
      } catch (error) {
        console.warn('Risk metrics fetch failed:', error);
      }
    }

    // Staking information
    if (walletAddress && (lowerMessage.includes('stak') || lowerMessage.includes('delegate') || lowerMessage.includes('validator'))) {
      try {
        const stakingData = await callMCPTool('sei', 'getStakingInfo', { address: walletAddress });
        responseContext.data.staking = stakingData.result;
        responseContext.context += `Staking Info: ${JSON.stringify(stakingData.result)}\n`;
        responseContext.tools.push('sei.getStakingInfo');
      } catch (error) {
        console.warn('Staking info fetch failed:', error);
      }
    }

  } catch (error) {
    console.error('MCP request handler error:', error);
    responseContext.context += 'Note: Some real-time data may be temporarily unavailable. ';
  }

  return responseContext;
}

/**
 * Batch call multiple MCP tools
 */
export async function batchCallMCPTools(
  requests: Array<{
    server: keyof MCPTools;
    tool: string;
    args: any;
  }>
): Promise<Array<{ request: typeof requests[0]; response?: any; error?: Error }>> {
  const results = await Promise.allSettled(
    requests.map(req => 
      callMCPTool(req.server, req.tool as any, req.args)
    )
  );

  return results.map((result, index) => ({
    request: requests[index],
    response: result.status === 'fulfilled' ? result.value : undefined,
    error: result.status === 'rejected' ? result.reason : undefined,
  }));
}

/**
 * Get available tools for a server
 */
export function getAvailableTools(server: keyof MCPTools): string[] {
  const tools: Record<keyof MCPTools, string[]> = {
    hive: ['getMarketData', 'getTrendingTokens', 'getTokenAnalysis'],
    sei: ['getWalletBalance', 'getTransactionHistory', 'getStakingInfo'],
    portfolio: ['analyzePortfolioComposition', 'getHistoricalPerformance', 'getRiskMetrics'],
  };

  return tools[server] || [];
}

/**
 * Export all MCP server URLs for reference
 */
export const getMCPServerURLs = () => ({
  hive: MCP_SERVERS.hive.url,
  sei: MCP_SERVERS.sei.url,
  portfolio: MCP_SERVERS.portfolio.url,
});