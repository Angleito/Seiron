/**
 * MCP HTTP Client for Railway-deployed servers
 * 
 * Provides HTTP/REST communication with MCP servers deployed on Railway
 * instead of WebSocket connections for better compatibility
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getConfig } from '../config';
import logger from './logger';
import { MCPServerEndpoint } from '../config/types';

const mcpLogger = logger.child({ service: 'MCPHttpClient' });

/**
 * MCP HTTP request/response types
 */
export interface MCPHttpRequest {
  method: string;
  params?: Record<string, any>;
  id?: string | number;
  jsonrpc?: string;
}

export interface MCPHttpResponse<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
  jsonrpc?: string;
}

/**
 * MCP Server types
 */
export type MCPServerType = 'hiveIntelligence' | 'seiBlockchain' | 'portfolioManager';

/**
 * Create axios instance with retry logic
 */
function createAxiosInstance(config: MCPServerEndpoint): AxiosInstance {
  const instance = axios.create({
    baseURL: config.url,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
    }
  });

  // Add request interceptor for logging
  instance.interceptors.request.use(
    (request) => {
      mcpLogger.debug(`MCP Request to ${request.baseURL}${request.url}`, {
        method: request.method,
        data: request.data
      });
      return request;
    },
    (error) => {
      mcpLogger.error('MCP Request Error', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      mcpLogger.debug(`MCP Response from ${response.config.baseURL}${response.config.url}`, {
        status: response.status,
        data: response.data
      });
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };
      
      if (!originalRequest) {
        return Promise.reject(error);
      }

      originalRequest._retry = originalRequest._retry || 0;

      // Retry logic
      if (
        error.response?.status && 
        [502, 503, 504].includes(error.response.status) && 
        originalRequest._retry < config.retryAttempts
      ) {
        originalRequest._retry++;
        
        const delay = config.retryDelay * Math.pow(2, originalRequest._retry - 1);
        mcpLogger.warn(`Retrying MCP request (attempt ${originalRequest._retry}/${config.retryAttempts}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return instance.request(originalRequest);
      }

      mcpLogger.error('MCP Response Error', {
        url: originalRequest.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * MCP HTTP Client class
 */
export class MCPHttpClient {
  private clients: Map<MCPServerType, AxiosInstance> = new Map();
  private config = getConfig();

  constructor() {
    if (!this.config.mcp.enabled) {
      mcpLogger.warn('MCP is disabled in configuration');
      return;
    }

    this.initializeClients();
  }

  /**
   * Initialize HTTP clients for each MCP server
   */
  private initializeClients(): void {
    const servers = this.config.mcp.servers;

    // Initialize Hive Intelligence client
    if (servers.hiveIntelligence.url) {
      this.clients.set('hiveIntelligence', createAxiosInstance(servers.hiveIntelligence));
      mcpLogger.info(`Initialized MCP HTTP client for Hive Intelligence: ${servers.hiveIntelligence.url}`);
    }

    // Initialize SEI Blockchain client
    if (servers.seiBlockchain.url) {
      this.clients.set('seiBlockchain', createAxiosInstance(servers.seiBlockchain));
      mcpLogger.info(`Initialized MCP HTTP client for SEI Blockchain: ${servers.seiBlockchain.url}`);
    }

    // Initialize Portfolio Manager client
    if (servers.portfolioManager.url) {
      this.clients.set('portfolioManager', createAxiosInstance(servers.portfolioManager));
      mcpLogger.info(`Initialized MCP HTTP client for Portfolio Manager: ${servers.portfolioManager.url}`);
    }
  }

  /**
   * Call a tool on a specific MCP server
   */
  async callTool<T = any>(
    server: MCPServerType, 
    toolName: string, 
    params: Record<string, any> = {}
  ): Promise<T> {
    const client = this.clients.get(server);
    
    if (!client) {
      throw new Error(`MCP server ${server} is not initialized or configured`);
    }

    const request: MCPHttpRequest = {
      method: `tools.${toolName}`,
      params,
      id: Date.now(),
      jsonrpc: '2.0'
    };

    try {
      const response = await client.post<MCPHttpResponse<T>>('/rpc', request);
      
      if (response.data.error) {
        throw new Error(`MCP tool error: ${response.data.error.message}`);
      }

      return response.data.result as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        mcpLogger.error(`Failed to call tool ${toolName} on ${server}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        // Provide more specific error messages
        if (error.response?.status === 404) {
          throw new Error(`MCP server ${server} endpoint not found. Is the server running?`);
        } else if (error.response?.status === 401) {
          throw new Error(`Authentication failed for MCP server ${server}. Check API key.`);
        } else if (error.response?.status === 500) {
          throw new Error(`Internal server error on MCP server ${server}: ${error.response?.data?.message || error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Health check for a specific MCP server
   */
  async healthCheck(server: MCPServerType): Promise<boolean> {
    const client = this.clients.get(server);
    
    if (!client) {
      return false;
    }

    try {
      const response = await client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      mcpLogger.warn(`Health check failed for ${server}`, error);
      return false;
    }
  }

  /**
   * Health check all MCP servers
   */
  async healthCheckAll(): Promise<Record<MCPServerType, boolean>> {
    const results: Record<MCPServerType, boolean> = {
      hiveIntelligence: false,
      seiBlockchain: false,
      portfolioManager: false
    };

    await Promise.all(
      (Object.keys(results) as MCPServerType[]).map(async (server) => {
        results[server] = await this.healthCheck(server);
      })
    );

    return results;
  }

  /**
   * Get server info
   */
  async getServerInfo(server: MCPServerType): Promise<any> {
    const client = this.clients.get(server);
    
    if (!client) {
      throw new Error(`MCP server ${server} is not initialized or configured`);
    }

    try {
      const response = await client.get('/info');
      return response.data;
    } catch (error) {
      mcpLogger.error(`Failed to get server info for ${server}`, error);
      throw error;
    }
  }

  /**
   * List available tools on a server
   */
  async listTools(server: MCPServerType): Promise<string[]> {
    const client = this.clients.get(server);
    
    if (!client) {
      throw new Error(`MCP server ${server} is not initialized or configured`);
    }

    const request: MCPHttpRequest = {
      method: 'tools.list',
      id: Date.now(),
      jsonrpc: '2.0'
    };

    try {
      const response = await client.post<MCPHttpResponse<{ tools: Array<{ name: string }> }>>('/rpc', request);
      
      if (response.data.error) {
        throw new Error(`Failed to list tools: ${response.data.error.message}`);
      }

      return response.data.result?.tools.map(t => t.name) || [];
    } catch (error) {
      mcpLogger.error(`Failed to list tools for ${server}`, error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
let mcpHttpClient: MCPHttpClient | null = null;

/**
 * Get or create MCP HTTP client instance
 */
export function getMCPHttpClient(): MCPHttpClient {
  if (!mcpHttpClient) {
    mcpHttpClient = new MCPHttpClient();
  }
  return mcpHttpClient;
}

/**
 * Typed tool callers for each MCP server
 */
export const mcpTools = {
  hiveIntelligence: {
    async getMarketData(params: { symbol: string; timeframe?: string }) {
      return getMCPHttpClient().callTool('hiveIntelligence', 'getMarketData', params);
    },
    async analyzeSentiment(params: { text: string; context?: string }) {
      return getMCPHttpClient().callTool('hiveIntelligence', 'analyzeSentiment', params);
    },
    async predictPrice(params: { symbol: string; horizon: string }) {
      return getMCPHttpClient().callTool('hiveIntelligence', 'predictPrice', params);
    }
  },
  
  seiBlockchain: {
    async getWalletBalance(params: { address: string }) {
      return getMCPHttpClient().callTool('seiBlockchain', 'getWalletBalance', params);
    },
    async getTransactionHistory(params: { address: string; limit?: number }) {
      return getMCPHttpClient().callTool('seiBlockchain', 'getTransactionHistory', params);
    },
    async executeTrade(params: { from: string; to: string; amount: string; token: string }) {
      return getMCPHttpClient().callTool('seiBlockchain', 'executeTrade', params);
    }
  },
  
  portfolioManager: {
    async analyzePortfolio(params: { walletAddress: string }) {
      return getMCPHttpClient().callTool('portfolioManager', 'analyzePortfolio', params);
    },
    async calculateRisk(params: { portfolio: any }) {
      return getMCPHttpClient().callTool('portfolioManager', 'calculateRisk', params);
    },
    async optimizeAllocation(params: { portfolio: any; constraints?: any }) {
      return getMCPHttpClient().callTool('portfolioManager', 'optimizeAllocation', params);
    }
  }
};