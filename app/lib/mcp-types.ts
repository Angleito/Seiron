/**
 * MCP (Model Context Protocol) Type Definitions
 * Unified types for MCP client implementations
 */

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: 'hive' | 'sei' | 'portfolio';
  url: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * MCP Tool Call Request
 */
export interface MCPToolRequest {
  tool: string;
  arguments: Record<string, any>;
}

/**
 * MCP Tool Call Response
 */
export interface MCPToolResponse<T = any> {
  result?: T;
  content?: T;
  error?: string;
  status?: 'success' | 'error';
}

/**
 * MCP Server Health Status
 */
export interface MCPServerHealth {
  server: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Available MCP Tools by Server
 */
export interface MCPTools {
  hive: {
    getMarketData: {
      params: { symbols: string[] };
      response: {
        symbol: string;
        price: number;
        change24h: number;
        volume24h: number;
        marketCap: number;
      }[];
    };
    getTrendingTokens: {
      params: { limit?: number };
      response: {
        symbol: string;
        price: number;
        change24h: number;
        volume24h: number;
      }[];
    };
    getTokenAnalysis: {
      params: { symbol: string };
      response: {
        symbol: string;
        sentiment: 'bullish' | 'bearish' | 'neutral';
        analysis: string;
        technicalIndicators: Record<string, any>;
      };
    };
  };
  sei: {
    getWalletBalance: {
      params: { address: string };
      response: {
        address: string;
        balances: Array<{
          denom: string;
          amount: string;
        }>;
        totalValueUSD: number;
      };
    };
    getTransactionHistory: {
      params: { address: string; limit?: number };
      response: Array<{
        hash: string;
        type: string;
        amount: string;
        timestamp: string;
        status: 'success' | 'failed';
      }>;
    };
    getStakingInfo: {
      params: { address: string };
      response: {
        totalStaked: string;
        rewards: string;
        validators: Array<{
          address: string;
          amount: string;
          commission: number;
        }>;
      };
    };
  };
  portfolio: {
    analyzePortfolioComposition: {
      params: { walletAddress: string };
      response: {
        totalValue: number;
        assets: Array<{
          symbol: string;
          amount: number;
          value: number;
          percentage: number;
        }>;
        diversificationScore: number;
      };
    };
    getHistoricalPerformance: {
      params: { walletAddress: string; timeframe: '24h' | '7d' | '30d' | '90d' };
      response: {
        startValue: number;
        endValue: number;
        absoluteReturn: number;
        percentageReturn: number;
        chart: Array<{
          timestamp: string;
          value: number;
        }>;
      };
    };
    getRiskMetrics: {
      params: { walletAddress: string };
      response: {
        volatility: number;
        sharpeRatio: number;
        maxDrawdown: number;
        beta: number;
        riskScore: 'low' | 'medium' | 'high';
      };
    };
  };
}

/**
 * MCP Error Types
 */
export enum MCPErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  SERVER_ERROR = 'SERVER_ERROR',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
}

export class MCPError extends Error {
  code: MCPErrorCode;
  server?: string;
  tool?: string;

  constructor(code: MCPErrorCode, message: string, server?: string, tool?: string) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.server = server;
    this.tool = tool;
  }
}

/**
 * MCP Request Context for message handling
 */
export interface MCPRequestContext {
  message: string;
  walletAddress?: string;
  sessionId?: string;
}

/**
 * MCP Response Context for AI integration
 */
export interface MCPResponseContext {
  context: string;
  data: Record<string, any>;
  tools: string[];
}