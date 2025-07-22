/**
 * Example usage of the MCP Client Library
 * This file demonstrates how to use the MCP client in different contexts
 */

import { 
  callMCPTool, 
  handleMCPRequests, 
  checkAllMCPServers,
  batchCallMCPTools,
  MCPError,
  MCPErrorCode
} from './index';

/**
 * Example 1: Direct tool call in an API route
 */
export async function getMarketDataExample() {
  try {
    const marketData = await callMCPTool('hive', 'getMarketData', {
      symbols: ['SEI', 'BTC', 'ETH']
    });
    
    console.log('Market data:', marketData.result);
    return marketData.result;
  } catch (error) {
    if (error instanceof MCPError) {
      console.error(`MCP Error [${error.code}]:`, error.message);
      // Handle specific error types
      if (error.code === MCPErrorCode.TIMEOUT) {
        // Retry or use cached data
      }
    }
    throw error;
  }
}

/**
 * Example 2: Using in a Next.js API route
 */
export async function apiRouteExample(
  message: string,
  walletAddress?: string
) {
  // Handle MCP requests based on user message
  const mcpContext = await handleMCPRequests({
    message,
    walletAddress,
    sessionId: `session_${Date.now()}`
  });

  // Use the context in your AI prompt
  const aiPrompt = `
    User message: ${message}
    ${mcpContext.context ? `\nCurrent data:\n${mcpContext.context}` : ''}
  `;

  return {
    aiPrompt,
    mcpData: mcpContext.data,
    toolsUsed: mcpContext.tools
  };
}

/**
 * Example 3: Batch operations
 */
export async function batchOperationsExample(walletAddress: string) {
  const requests = [
    {
      server: 'sei' as const,
      tool: 'getWalletBalance',
      args: { address: walletAddress }
    },
    {
      server: 'portfolio' as const,
      tool: 'analyzePortfolioComposition',
      args: { walletAddress }
    },
    {
      server: 'portfolio' as const,
      tool: 'getRiskMetrics',
      args: { walletAddress }
    }
  ];

  const results = await batchCallMCPTools(requests);

  // Process results
  const successfulResults = results.filter(r => !r.error);
  const failedResults = results.filter(r => r.error);

  console.log(`Successfully called ${successfulResults.length} tools`);
  console.log(`Failed calls: ${failedResults.length}`);

  return {
    balance: successfulResults[0]?.response,
    portfolio: successfulResults[1]?.response,
    risk: successfulResults[2]?.response
  };
}

/**
 * Example 4: Health monitoring
 */
export async function healthMonitoringExample() {
  const healthStatus = await checkAllMCPServers();
  
  const healthySe servers = healthStatus.filter(s => s.status === 'healthy');
  const unhealthyServers = healthStatus.filter(s => s.status !== 'healthy');

  if (unhealthyServers.length > 0) {
    console.warn('Unhealthy MCP servers:', unhealthyServers);
    // Implement fallback logic or alerts
  }

  return {
    healthy: healthyServers.length,
    unhealthy: unhealthyServers.length,
    details: healthStatus
  };
}

/**
 * Example 5: React component usage
 */
// See useMCP.ts for the React hook implementation
// Example component:
/*
import { useMCP } from '@/app/lib/mcp/useMCP';

export function MarketDataComponent() {
  const { callTool, loading, error } = useMCP();
  const [marketData, setMarketData] = useState(null);

  const fetchMarketData = async () => {
    try {
      const data = await callTool('hive', 'getMarketData', {
        symbols: ['SEI']
      });
      setMarketData(data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={fetchMarketData}>Get Market Data</button>
      {marketData && <pre>{JSON.stringify(marketData, null, 2)}</pre>}
    </div>
  );
}
*/