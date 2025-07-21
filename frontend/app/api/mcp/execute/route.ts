import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Server configurations - Single environment for hackathon
const MCP_CONFIGS = {
  hive: {
    url: process.env.MCP_HIVE_URL!,
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY,
    tools: ['getMarketData', 'getSentimentAnalysis', 'getPricePredictions', 'getTradingSignals', 'getNewsAggregation', 'getOnChainMetrics', 'getPortfolioAnalysis']
  },
  sei: {
    url: process.env.MCP_SEI_URL!,
    apiKey: process.env.SEI_API_KEY,
    tools: ['getWalletBalance', 'getTransactionHistory', 'getDeFiPositions', 'swapTokens', 'transferTokens', 'getLiquidityPools', 'getStakingInfo', 'getValidatorInfo', 'getProposals', 'getTokenInfo']
  },
  portfolio: {
    url: process.env.MCP_PORTFOLIO_URL!,
    apiKey: process.env.PORTFOLIO_API_KEY,
    tools: ['analyzePortfolioComposition', 'getHistoricalPerformance', 'calculateRiskMetrics', 'assessLiquidityRisk', 'generateRebalancingSuggestions', 'optimizeTaxStrategy', 'trackPerformanceMetrics', 'generatePerformanceReport']
  }
};

// Cache for MCP clients (in production, consider using a more robust solution)
const clientCache = new Map<string, Client>();

async function getMCPClient(server: string): Promise<Client> {
  const cacheKey = server;
  
  // Check cache
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;
  
  // Get server config
  const config = MCP_CONFIGS[server as keyof typeof MCP_CONFIGS];
  if (!config) {
    throw new Error(`Unknown MCP server: ${server}`);
  }
  
  // Create transport
  const transport = new SSEClientTransport({
    url: config.url,
    apiKey: config.apiKey,
  });
  
  // Create client
  const client = new Client({
    name: `vercel-proxy-${server}`,
    version: '1.0.0',
  }, {
    capabilities: {}
  });
  
  // Connect
  await client.connect(transport);
  
  // Cache the client
  clientCache.set(cacheKey, client);
  
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server, tool, arguments: args } = body;
    
    // Validate input
    if (!server || !tool) {
      return NextResponse.json(
        { error: 'Missing required fields: server, tool' },
        { status: 400 }
      );
    }
    
    // Validate server
    const serverConfig = MCP_CONFIGS[server as keyof typeof MCP_CONFIGS];
    if (!serverConfig) {
      return NextResponse.json(
        { error: `Invalid server: ${server}` },
        { status: 400 }
      );
    }
    
    // Validate tool
    if (!serverConfig.tools.includes(tool)) {
      return NextResponse.json(
        { error: `Invalid tool for ${server}: ${tool}` },
        { status: 400 }
      );
    }
    
    // Get or create MCP client
    const client = await getMCPClient(server);
    
    // Execute tool
    const result = await client.callTool({
      name: tool,
      arguments: args || {}
    });
    
    // Extract text content from MCP response
    let responseText = '';
    if (result.content && Array.isArray(result.content)) {
      for (const content of result.content) {
        if (content.type === 'text') {
          responseText += content.text;
        }
      }
    }
    
    // Return the response
    return NextResponse.json({
      success: true,
      server,
      tool,
      result: responseText,
      raw: result, // Include raw response for debugging
    });
    
  } catch (error) {
    console.error('MCP Execute Error:', error);
    
    // Clean up failed client
    if (error instanceof Error && error.message.includes('server:')) {
      const server = error.message.split('server:')[1]?.trim();
      if (server) {
        clientCache.delete(server);
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'MCP execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const health: Record<string, any> = {
    status: 'ok',
    servers: {}
  };
  
  for (const [name, config] of Object.entries(MCP_CONFIGS)) {
    health.servers[name] = {
      configured: !!config.apiKey,
      url: config.url,
      tools: config.tools.length
    };
  }
  
  return NextResponse.json(health);
}