/**
 * Vercel API Route MCP Client
 * Uses Vercel API routes as a proxy to MCP servers
 */

export interface MCPToolResult {
  success: boolean;
  server: string;
  tool: string;
  result?: string;
  raw?: any;
  error?: string;
  message?: string;
}

export class VercelMCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || '';
  }

  /**
   * Execute an MCP tool via Vercel API route
   */
  async executeTool(
    server: 'hive' | 'sei' | 'portfolio',
    tool: string,
    args: Record<string, any> = {}
  ): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server,
          tool,
          arguments: args,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('MCP execution error:', error);
      return {
        success: false,
        server,
        tool,
        error: 'Failed to execute MCP tool',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get market data from Hive Intelligence
   */
  async getMarketData(symbols: string[], options?: {
    timeframe?: string;
    includeMetrics?: boolean;
  }): Promise<string> {
    const result = await this.executeTool('hive', 'getMarketData', {
      symbols,
      ...options,
    });
    
    return result.result || 'Failed to fetch market data';
  }

  /**
   * Get sentiment analysis from Hive Intelligence
   */
  async getSentimentAnalysis(symbols: string[], options?: {
    sources?: string[];
    timeRange?: string;
  }): Promise<string> {
    const result = await this.executeTool('hive', 'getSentimentAnalysis', {
      symbols,
      ...options,
    });
    
    return result.result || 'Failed to fetch sentiment analysis';
  }

  /**
   * Get price predictions from Hive Intelligence
   */
  async getPricePredictions(symbol: string, timeframes: string[]): Promise<string> {
    const result = await this.executeTool('hive', 'getPricePredictions', {
      symbol,
      timeframes,
      includeConfidence: true,
    });
    
    return result.result || 'Failed to fetch price predictions';
  }

  /**
   * Get wallet balance from SEI blockchain
   */
  async getWalletBalance(address: string, denom?: string): Promise<string> {
    const result = await this.executeTool('sei', 'getWalletBalance', {
      address,
      denom,
    });
    
    return result.result || 'Failed to fetch wallet balance';
  }

  /**
   * Get DeFi positions from SEI blockchain
   */
  async getDeFiPositions(address: string): Promise<string> {
    const result = await this.executeTool('sei', 'getDeFiPositions', {
      address,
    });
    
    return result.result || 'Failed to fetch DeFi positions';
  }

  /**
   * Analyze portfolio composition
   */
  async analyzePortfolio(walletAddress: string, options?: {
    includeStakedAssets?: boolean;
    includeDeFiPositions?: boolean;
  }): Promise<string> {
    const result = await this.executeTool('portfolio', 'analyzePortfolioComposition', {
      walletAddress,
      ...options,
    });
    
    return result.result || 'Failed to analyze portfolio';
  }

  /**
   * Calculate risk metrics for portfolio
   */
  async calculateRiskMetrics(walletAddress: string): Promise<string> {
    const result = await this.executeTool('portfolio', 'calculateRiskMetrics', {
      walletAddress,
    });
    
    return result.result || 'Failed to calculate risk metrics';
  }

  /**
   * Check health of MCP servers
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/execute`, {
        method: 'GET',
      });
      
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Singleton instance
let clientInstance: VercelMCPClient | null = null;

/**
 * Get the singleton MCP client instance
 */
export function getMCPClient(): VercelMCPClient {
  if (!clientInstance) {
    clientInstance = new VercelMCPClient();
  }
  return clientInstance;
}