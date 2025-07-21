/**
 * Frontend MCP (Model Context Protocol) Client Library
 * Provides edge-runtime compatible client infrastructure
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { logger } from '@/lib/logger';

/**
 * MCP Server Configuration for Frontend
 */
export interface MCPServerConfig {
  name: string;
  type: 'http' | 'websocket';
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * MCP Client Options
 */
export interface MCPClientOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  onConnectionChange?: (connected: boolean, serverName: string) => void;
}

/**
 * MCP Tool Call Result
 */
export interface MCPToolResult<T = any> {
  content: T;
  isError?: boolean;
  metadata?: Record<string, any>;
}

/**
 * MCP Resource Content
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Blob;
  metadata?: Record<string, any>;
}

/**
 * Edge-runtime compatible MCP Client
 */
export class EdgeMCPClient {
  private client: Client | null = null;
  private config: MCPServerConfig;
  private options: MCPClientOptions;
  private connected = false;
  private reconnectTimeout?: NodeJS.Timeout;

  constructor(config: MCPServerConfig, options: MCPClientOptions = {}) {
    this.config = config;
    this.options = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    let transport;

    switch (this.config.type) {
      case 'http':
        transport = new SSEClientTransport({
          url: this.config.url,
          apiKey: this.config.apiKey,
          headers: this.config.headers
        });
        break;

      case 'websocket':
        transport = new WebSocketClientTransport(this.config.url);
        break;

      default:
        throw new Error(`Unsupported transport type: ${this.config.type}`);
    }

    this.client = new Client({
      name: `${this.config.name}-frontend-client`,
      version: '1.0.0'
    }, {
      capabilities: {
        roots: {
          listChanged: true
        }
      }
    });

    try {
      await this.client.connect(transport);
      this.connected = true;
      this.options.onConnectionChange?.(true, this.config.name);
      logger.info(`Connected to MCP server: ${this.config.name}`);
    } catch (error) {
      this.connected = false;
      this.options.onConnectionChange?.(false, this.config.name);
      logger.error(`Failed to connect to MCP server ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.error(`Error disconnecting from ${this.config.name}:`, error);
      }
      this.client = null;
      this.connected = false;
      this.options.onConnectionChange?.(false, this.config.name);
    }
  }

  /**
   * Call a tool with retry logic
   */
  async callTool<T = any>(toolName: string, args: any = {}): Promise<MCPToolResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        if (!this.connected) {
          await this.connect();
        }

        const result = await this.client!.callTool({ 
          name: toolName, 
          arguments: args 
        });

        return {
          content: result.content as T,
          isError: result.isError,
          metadata: result as any
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Tool call attempt ${attempt + 1} failed:`, error);

        if (attempt < this.options.retryAttempts!) {
          await new Promise(resolve => 
            setTimeout(resolve, this.options.retryDelay! * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new Error(`Failed to call tool ${toolName}`);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPResourceContent> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const result = await this.client!.readResource({ uri });
      
      return {
        uri,
        mimeType: result.contents[0]?.mimeType,
        text: result.contents[0]?.text,
        blob: result.contents[0]?.blob ? 
          new Blob([result.contents[0].blob]) : undefined,
        metadata: result as any
      };
    } catch (error) {
      logger.error(`Failed to read resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>> {
    if (!this.connected) {
      await this.connect();
    }

    const result = await this.client!.listTools();
    return result.tools;
  }

  /**
   * List available resources
   */
  async listResources(): Promise<Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>> {
    if (!this.connected) {
      await this.connect();
    }

    const result = await this.client!.listResources();
    return result.resources;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server name
   */
  getServerName(): string {
    return this.config.name;
  }
}

/**
 * MCP Client Manager for Frontend
 * Manages multiple MCP client connections
 */
export class MCPClientManager {
  private clients: Map<string, EdgeMCPClient> = new Map();
  private connectionStates: Map<string, boolean> = new Map();

  /**
   * Add a new server configuration
   */
  addServer(config: MCPServerConfig, options?: MCPClientOptions): EdgeMCPClient {
    const client = new EdgeMCPClient(config, {
      ...options,
      onConnectionChange: (connected, serverName) => {
        this.connectionStates.set(serverName, connected);
        options?.onConnectionChange?.(connected, serverName);
      }
    });

    this.clients.set(config.name, client);
    return client;
  }

  /**
   * Get a client by server name
   */
  getClient(serverName: string): EdgeMCPClient | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Connect to all configured servers
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(client => 
      client.connect().catch(error => {
        logger.error(`Failed to connect to ${client.getServerName()}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(client => 
      client.disconnect()
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get connection states
   */
  getConnectionStates(): Map<string, boolean> {
    return new Map(this.connectionStates);
  }

  /**
   * Call a tool on any available server that has it
   */
  async callToolOnAnyServer<T = any>(
    toolName: string, 
    args: any = {}
  ): Promise<{ result: MCPToolResult<T>; serverName: string }> {
    const connectedClients = Array.from(this.clients.entries())
      .filter(([_, client]) => client.isConnected());

    if (connectedClients.length === 0) {
      throw new Error('No connected MCP servers available');
    }

    // Try each connected server
    for (const [serverName, client] of connectedClients) {
      try {
        const tools = await client.listTools();
        if (tools.some(t => t.name === toolName)) {
          const result = await client.callTool<T>(toolName, args);
          return { result, serverName };
        }
      } catch (error) {
        logger.warn(`Failed to call tool on ${serverName}:`, error);
      }
    }

    throw new Error(`Tool ${toolName} not found on any connected server`);
  }
}

/**
 * React Hook for MCP Client
 */
export function useMCPClient(
  config: MCPServerConfig,
  options?: MCPClientOptions
): {
  client: EdgeMCPClient;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  callTool: <T = any>(toolName: string, args?: any) => Promise<MCPToolResult<T>>;
} {
  if (typeof window === 'undefined') {
    // Server-side rendering - return dummy implementation
    return {
      client: null as any,
      connected: false,
      connect: async () => {},
      disconnect: async () => {},
      callTool: async () => ({ content: null as any })
    };
  }

  const [connected, setConnected] = React.useState(false);
  const clientRef = React.useRef<EdgeMCPClient | null>(null);

  React.useEffect(() => {
    const client = new EdgeMCPClient(config, {
      ...options,
      onConnectionChange: (isConnected) => {
        setConnected(isConnected);
        options?.onConnectionChange?.(isConnected, config.name);
      }
    });

    clientRef.current = client;

    // Auto-connect on mount
    client.connect().catch(error => {
      logger.error('Failed to connect MCP client:', error);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  const connect = React.useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect();
    }
  }, []);

  const disconnect = React.useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
    }
  }, []);

  const callTool = React.useCallback(async <T = any>(
    toolName: string, 
    args?: any
  ): Promise<MCPToolResult<T>> => {
    if (!clientRef.current) {
      throw new Error('MCP client not initialized');
    }
    return clientRef.current.callTool<T>(toolName, args);
  }, []);

  return {
    client: clientRef.current!,
    connected,
    connect,
    disconnect,
    callTool
  };
}

// Import React for the hook
import * as React from 'react';