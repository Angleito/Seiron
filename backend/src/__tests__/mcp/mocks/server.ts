/**
 * Mock MCP Server Implementation
 * Provides a mock server for testing MCP client connections
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPTool, MCPResource } from '../../../config/mcp/types';

export interface MockServerOptions {
  name: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  latency?: number;
  errorRate?: number;
  authRequired?: boolean;
}

export class MockMCPServer {
  private server: Server;
  private options: Required<MockServerOptions>;
  private callCount: Map<string, number> = new Map();
  private transport: StdioServerTransport | null = null;

  constructor(options: MockServerOptions) {
    this.options = {
      name: options.name,
      tools: options.tools || [],
      resources: options.resources || [],
      latency: options.latency || 0,
      errorRate: options.errorRate || 0,
      authRequired: options.authRequired || false
    };

    this.server = new Server({
      name: `mock-${this.options.name}`,
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {
          list: true
        },
        resources: {
          list: true,
          subscribe: true
        }
      }
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Tool listing
    this.server.setRequestHandler('tools/list', async () => {
      await this.simulateLatency();
      return {
        tools: this.options.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters
        }))
      };
    });

    // Tool calling
    this.server.setRequestHandler('tools/call', async (request) => {
      await this.simulateLatency();
      
      const { name, arguments: args } = request.params;
      this.incrementCallCount(name);

      if (this.shouldFail()) {
        throw new Error(`Mock error for tool: ${name}`);
      }

      const tool = this.options.tools.find(t => t.name === name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Return mock data based on tool name
      return {
        content: this.generateMockResponse(name, args)
      };
    });

    // Resource listing
    this.server.setRequestHandler('resources/list', async () => {
      await this.simulateLatency();
      return {
        resources: this.options.resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType
        }))
      };
    });

    // Resource reading
    this.server.setRequestHandler('resources/read', async (request) => {
      await this.simulateLatency();
      
      const { uri } = request.params;
      
      if (this.shouldFail()) {
        throw new Error(`Mock error reading resource: ${uri}`);
      }

      const resource = this.options.resources.find(r => r.uri === uri);
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }

      return {
        contents: [{
          uri,
          mimeType: resource.mimeType || 'text/plain',
          text: `Mock content for ${uri}`
        }]
      };
    });
  }

  private async simulateLatency(): Promise<void> {
    if (this.options.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.latency));
    }
  }

  private shouldFail(): boolean {
    return Math.random() < this.options.errorRate;
  }

  private incrementCallCount(toolName: string): void {
    const current = this.callCount.get(toolName) || 0;
    this.callCount.set(toolName, current + 1);
  }

  private generateMockResponse(toolName: string, args: any): any {
    // Generate tool-specific mock responses
    switch (toolName) {
      case 'getMarketData':
        return {
          symbol: args.symbol || 'SEI',
          price: 1.23,
          volume24h: 1000000,
          change24h: 5.67,
          marketCap: 10000000,
          timestamp: Date.now()
        };

      case 'getWalletBalance':
        return {
          address: args.address,
          balances: [
            { denom: 'usei', amount: '1000000' },
            { denom: 'usdc', amount: '500000' }
          ],
          totalUSD: 1500.00
        };

      case 'analyzePortfolioComposition':
        return {
          totalValue: 10000,
          assets: [
            { symbol: 'SEI', value: 5000, percentage: 50 },
            { symbol: 'USDC', value: 5000, percentage: 50 }
          ],
          diversificationScore: 0.75
        };

      case 'getSentimentAnalysis':
        return {
          overall: 0.75,
          sources: {
            twitter: 0.8,
            reddit: 0.7,
            news: 0.75
          },
          trending: true
        };

      default:
        return {
          success: true,
          data: args,
          timestamp: Date.now()
        };
    }
  }

  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }
  }

  getCallCount(toolName: string): number {
    return this.callCount.get(toolName) || 0;
  }

  getTotalCalls(): number {
    return Array.from(this.callCount.values()).reduce((sum, count) => sum + count, 0);
  }

  resetCallCounts(): void {
    this.callCount.clear();
  }

  setErrorRate(rate: number): void {
    this.options.errorRate = Math.max(0, Math.min(1, rate));
  }

  setLatency(ms: number): void {
    this.options.latency = Math.max(0, ms);
  }
}

/**
 * Create predefined mock servers for testing
 */
export const createMockServers = () => ({
  hiveIntelligence: new MockMCPServer({
    name: 'hive-intelligence',
    tools: [
      {
        name: 'getMarketData',
        description: 'Get market data for a symbol',
        parameters: {
          type: 'object',
          properties: {
            symbol: { type: 'string' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'getSentimentAnalysis',
        description: 'Get sentiment analysis',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      }
    ]
  }),

  seiBlockchain: new MockMCPServer({
    name: 'sei-blockchain',
    tools: [
      {
        name: 'getWalletBalance',
        description: 'Get wallet balance',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string' }
          },
          required: ['address']
        }
      },
      {
        name: 'executeTokenSwap',
        description: 'Execute token swap',
        parameters: {
          type: 'object',
          properties: {
            fromToken: { type: 'string' },
            toToken: { type: 'string' },
            amount: { type: 'string' }
          },
          required: ['fromToken', 'toToken', 'amount']
        }
      }
    ]
  }),

  portfolioManager: new MockMCPServer({
    name: 'portfolio-manager',
    tools: [
      {
        name: 'analyzePortfolioComposition',
        description: 'Analyze portfolio composition',
        parameters: {
          type: 'object',
          properties: {
            portfolioId: { type: 'string' }
          },
          required: ['portfolioId']
        }
      },
      {
        name: 'calculateRiskMetrics',
        description: 'Calculate risk metrics',
        parameters: {
          type: 'object',
          properties: {
            portfolioId: { type: 'string' },
            timeframe: { type: 'string' }
          },
          required: ['portfolioId']
        }
      }
    ],
    resources: [
      {
        uri: 'portfolio://reports/daily',
        name: 'Daily Portfolio Report',
        description: 'Daily portfolio performance report',
        mimeType: 'application/json'
      }
    ]
  })
});