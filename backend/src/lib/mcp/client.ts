/**
 * MCP (Model Context Protocol) Client Library
 * Provides client infrastructure for connecting to MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { Logger } from '../utils/logger';

const logger = new Logger('MCPClient');

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'http' | 'websocket';
  command?: string;
  args?: string[];
  url?: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}

/**
 * MCP Client Configuration
 */
export interface MCPClientConfig {
  servers: MCPServerConfig[];
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * MCP Client Factory
 * Creates and manages MCP client connections
 */
export class MCPClientFactory {
  private clients: Map<string, Client> = new Map();
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Create a client for a specific server
   */
  async createClient(serverName: string): Promise<Client> {
    const existing = this.clients.get(serverName);
    if (existing) {
      return existing;
    }

    const serverConfig = this.config.servers.find(s => s.name === serverName);
    if (!serverConfig) {
      throw new Error(`MCP server configuration not found: ${serverName}`);
    }

    const client = await this.createClientForServer(serverConfig);
    this.clients.set(serverName, client);
    return client;
  }

  /**
   * Create client based on server configuration
   */
  private async createClientForServer(config: MCPServerConfig): Promise<Client> {
    let transport;

    switch (config.type) {
      case 'stdio':
        if (!config.command) {
          throw new Error(`Command required for stdio server: ${config.name}`);
        }
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || []
        });
        break;

      case 'http':
        if (!config.url) {
          throw new Error(`URL required for HTTP server: ${config.name}`);
        }
        transport = new SSEClientTransport({
          url: config.url,
          apiKey: config.apiKey
        });
        break;

      case 'websocket':
        if (!config.url) {
          throw new Error(`URL required for WebSocket server: ${config.name}`);
        }
        transport = new WebSocketClientTransport(config.url);
        break;

      default:
        throw new Error(`Unknown server type: ${config.type}`);
    }

    const client = new Client({
      name: `${config.name}-client`,
      version: '1.0.0'
    }, {
      capabilities: {
        roots: {
          listChanged: true
        }
      }
    });

    logger.info(`Connecting to MCP server: ${config.name}`);
    
    try {
      await client.connect(transport);
      logger.info(`Successfully connected to MCP server: ${config.name}`);
      
      // List available tools
      const tools = await client.listTools();
      logger.info(`Available tools from ${config.name}:`, tools.tools.map(t => t.name));
      
      // List available resources
      const resources = await client.listResources();
      logger.info(`Available resources from ${config.name}:`, resources.resources.map(r => r.uri));
      
      return client;
    } catch (error) {
      logger.error(`Failed to connect to MCP server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get all connected clients
   */
  getClients(): Map<string, Client> {
    return this.clients;
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        await client.close();
        logger.info(`Disconnected from MCP server: ${name}`);
      } catch (error) {
        logger.error(`Error disconnecting from ${name}:`, error);
      }
    }
    this.clients.clear();
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
    const client = await this.createClient(serverName);
    
    try {
      const result = await client.callTool({ name: toolName, arguments: args });
      return result;
    } catch (error) {
      logger.error(`Error calling tool ${toolName} on ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Read a resource from a specific server
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    const client = await this.createClient(serverName);
    
    try {
      const result = await client.readResource({ uri });
      return result;
    } catch (error) {
      logger.error(`Error reading resource ${uri} from ${serverName}:`, error);
      throw error;
    }
  }
}

/**
 * MCP Connection Manager
 * Manages multiple MCP client connections with retry logic
 */
export class MCPConnectionManager {
  private factory: MCPClientFactory;
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: MCPClientConfig) {
    this.factory = new MCPClientFactory(config);
  }

  /**
   * Initialize all configured servers
   */
  async initializeAll(): Promise<void> {
    const servers = this.factory['config'].servers;
    const results = await Promise.allSettled(
      servers.map(server => this.initializeServer(server.name))
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn(`Failed to initialize ${failures.length} servers`);
    }
  }

  /**
   * Initialize a specific server with retry logic
   */
  async initializeServer(serverName: string, retryCount = 0): Promise<void> {
    const maxRetries = this.factory['config'].retryAttempts || 3;
    const retryDelay = this.factory['config'].retryDelay || 1000;

    try {
      await this.factory.createClient(serverName);
      
      // Clear any existing reconnect interval
      const interval = this.reconnectIntervals.get(serverName);
      if (interval) {
        clearInterval(interval);
        this.reconnectIntervals.delete(serverName);
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        logger.warn(`Retrying connection to ${serverName} (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return this.initializeServer(serverName, retryCount + 1);
      } else {
        logger.error(`Failed to connect to ${serverName} after ${maxRetries} attempts`);
        
        // Set up reconnect interval
        this.setupReconnect(serverName);
        throw error;
      }
    }
  }

  /**
   * Set up automatic reconnection for a server
   */
  private setupReconnect(serverName: string): void {
    const reconnectDelay = 30000; // 30 seconds
    
    const interval = setInterval(async () => {
      logger.info(`Attempting to reconnect to ${serverName}`);
      try {
        await this.initializeServer(serverName, 0);
      } catch (error) {
        logger.error(`Reconnection to ${serverName} failed`);
      }
    }, reconnectDelay);

    this.reconnectIntervals.set(serverName, interval);
  }

  /**
   * Get the client factory
   */
  getFactory(): MCPClientFactory {
    return this.factory;
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    // Clear all reconnect intervals
    for (const interval of this.reconnectIntervals.values()) {
      clearInterval(interval);
    }
    this.reconnectIntervals.clear();

    // Disconnect all clients
    await this.factory.disconnectAll();
  }
}

/**
 * Singleton instance for global access
 */
let connectionManager: MCPConnectionManager | null = null;

/**
 * Initialize the global MCP connection manager
 */
export function initializeMCPConnectionManager(config: MCPClientConfig): MCPConnectionManager {
  if (!connectionManager) {
    connectionManager = new MCPConnectionManager(config);
  }
  return connectionManager;
}

/**
 * Get the global MCP connection manager
 */
export function getMCPConnectionManager(): MCPConnectionManager {
  if (!connectionManager) {
    throw new Error('MCP connection manager not initialized');
  }
  return connectionManager;
}

/**
 * Utility function to create a typed MCP client
 */
export async function createTypedMCPClient<T extends Record<string, any>>(
  serverName: string,
  config: MCPClientConfig
): Promise<{
  client: Client;
  tools: T;
}> {
  const manager = initializeMCPConnectionManager(config);
  const factory = manager.getFactory();
  const client = await factory.createClient(serverName);
  
  // Create typed tool wrappers
  const tools = {} as T;
  const toolList = await client.listTools();
  
  for (const tool of toolList.tools) {
    (tools as any)[tool.name] = async (args: any) => {
      return factory.callTool(serverName, tool.name, args);
    };
  }
  
  return { client, tools };
}