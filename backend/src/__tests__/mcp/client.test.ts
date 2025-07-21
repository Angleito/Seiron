/**
 * MCP Client Tests
 * Tests for MCP client factory, connection management, and tool execution
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHttpClientTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import {
  MCPClientFactory,
  MCPConnectionManager,
  initializeMCPConnectionManager,
  getMCPConnectionManager,
  createTypedMCPClient
} from '../../lib/mcp/client';
import { Logger } from '../../lib/utils/logger';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');
jest.mock('@modelcontextprotocol/sdk/client/streamable-http.js');
jest.mock('@modelcontextprotocol/sdk/client/websocket.js');
jest.mock('../../lib/utils/logger');

describe('MCP Client Library', () => {
  let mockClient: jest.Mocked<Client>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      callTool: jest.fn(),
      readResource: jest.fn()
    } as any;
    
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);
    
    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;
    
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
  });

  afterEach(() => {
    // Clear singleton instance
    (global as any).connectionManager = null;
  });

  describe('MCPClientFactory', () => {
    const config = {
      servers: [
        {
          name: 'test-stdio',
          type: 'stdio' as const,
          command: 'test-command',
          args: ['arg1', 'arg2']
        },
        {
          name: 'test-http',
          type: 'http' as const,
          url: 'http://localhost:3000',
          apiKey: 'test-key'
        },
        {
          name: 'test-ws',
          type: 'websocket' as const,
          url: 'ws://localhost:3001'
        }
      ],
      retryAttempts: 3,
      retryDelay: 100,
      timeout: 1000
    };

    describe('createClient', () => {
      it('should create stdio client with correct configuration', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({
          tools: [{ name: 'test-tool', description: 'Test tool' }]
        });
        mockClient.listResources.mockResolvedValue({
          resources: [{ uri: 'test://resource', name: 'Test resource' }]
        });

        const client = await factory.createClient('test-stdio');

        expect(StdioClientTransport).toHaveBeenCalledWith({
          command: 'test-command',
          args: ['arg1', 'arg2']
        });
        expect(mockClient.connect).toHaveBeenCalled();
        expect(client).toBe(mockClient);
      });

      it('should create http client with correct configuration', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        await factory.createClient('test-http');

        expect(StreamableHttpClientTransport).toHaveBeenCalledWith({
          url: 'http://localhost:3000',
          apiKey: 'test-key'
        });
        expect(mockClient.connect).toHaveBeenCalled();
      });

      it('should create websocket client with correct configuration', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        await factory.createClient('test-ws');

        expect(WebSocketClientTransport).toHaveBeenCalledWith('ws://localhost:3001');
        expect(mockClient.connect).toHaveBeenCalled();
      });

      it('should reuse existing client connection', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        const client1 = await factory.createClient('test-stdio');
        const client2 = await factory.createClient('test-stdio');

        expect(client1).toBe(client2);
        expect(mockClient.connect).toHaveBeenCalledTimes(1);
      });

      it('should throw error for unknown server', async () => {
        const factory = new MCPClientFactory(config);
        
        await expect(factory.createClient('unknown-server')).rejects.toThrow(
          'MCP server configuration not found: unknown-server'
        );
      });

      it('should throw error for missing required fields', async () => {
        const invalidConfig = {
          servers: [
            { name: 'invalid-stdio', type: 'stdio' as const },
            { name: 'invalid-http', type: 'http' as const },
            { name: 'invalid-ws', type: 'websocket' as const }
          ]
        };
        
        const factory = new MCPClientFactory(invalidConfig);
        
        await expect(factory.createClient('invalid-stdio')).rejects.toThrow(
          'Command required for stdio server: invalid-stdio'
        );
        
        await expect(factory.createClient('invalid-http')).rejects.toThrow(
          'URL required for HTTP server: invalid-http'
        );
        
        await expect(factory.createClient('invalid-ws')).rejects.toThrow(
          'URL required for WebSocket server: invalid-ws'
        );
      });

      it('should handle connection failure', async () => {
        const factory = new MCPClientFactory(config);
        const connectionError = new Error('Connection failed');
        
        mockClient.connect.mockRejectedValue(connectionError);

        await expect(factory.createClient('test-stdio')).rejects.toThrow(connectionError);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to connect to MCP server test-stdio:',
          connectionError
        );
      });
    });

    describe('callTool', () => {
      it('should call tool on specified server', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.callTool.mockResolvedValue({ content: 'test result' });

        const result = await factory.callTool('test-stdio', 'test-tool', { arg: 'value' });

        expect(mockClient.callTool).toHaveBeenCalledWith({
          name: 'test-tool',
          arguments: { arg: 'value' }
        });
        expect(result).toEqual({ content: 'test result' });
      });

      it('should handle tool call error', async () => {
        const factory = new MCPClientFactory(config);
        const toolError = new Error('Tool execution failed');
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.callTool.mockRejectedValue(toolError);

        await expect(factory.callTool('test-stdio', 'test-tool')).rejects.toThrow(toolError);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error calling tool test-tool on test-stdio:',
          toolError
        );
      });
    });

    describe('readResource', () => {
      it('should read resource from specified server', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.readResource.mockResolvedValue({ contents: 'test content' });

        const result = await factory.readResource('test-stdio', 'test://resource');

        expect(mockClient.readResource).toHaveBeenCalledWith({ uri: 'test://resource' });
        expect(result).toEqual({ contents: 'test content' });
      });

      it('should handle resource read error', async () => {
        const factory = new MCPClientFactory(config);
        const readError = new Error('Resource read failed');
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.readResource.mockRejectedValue(readError);

        await expect(factory.readResource('test-stdio', 'test://resource')).rejects.toThrow(readError);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error reading resource test://resource from test-stdio:',
          readError
        );
      });
    });

    describe('disconnectAll', () => {
      it('should disconnect all clients', async () => {
        const factory = new MCPClientFactory(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        // Create multiple clients
        await factory.createClient('test-stdio');
        await factory.createClient('test-http');

        await factory.disconnectAll();

        expect(mockClient.close).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from MCP server: test-stdio');
        expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from MCP server: test-http');
      });

      it('should handle disconnect errors gracefully', async () => {
        const factory = new MCPClientFactory(config);
        const disconnectError = new Error('Disconnect failed');
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.close.mockRejectedValue(disconnectError);

        await factory.createClient('test-stdio');
        await factory.disconnectAll();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error disconnecting from test-stdio:',
          disconnectError
        );
      });
    });
  });

  describe('MCPConnectionManager', () => {
    const config = {
      servers: [
        {
          name: 'test-server',
          type: 'stdio' as const,
          command: 'test-command'
        }
      ],
      retryAttempts: 2,
      retryDelay: 50
    };

    describe('initializeAll', () => {
      it('should initialize all configured servers', async () => {
        const manager = new MCPConnectionManager(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        await manager.initializeAll();

        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('Successfully connected to MCP server: test-server');
      });

      it('should handle partial failures', async () => {
        const multiConfig = {
          servers: [
            { name: 'success-server', type: 'stdio' as const, command: 'test' },
            { name: 'fail-server', type: 'stdio' as const, command: 'test' }
          ]
        };
        
        const manager = new MCPConnectionManager(multiConfig);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.connect
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Connection failed'));

        await manager.initializeAll();

        expect(mockLogger.warn).toHaveBeenCalledWith('Failed to initialize 1 servers');
      });
    });

    describe('initializeServer with retry', () => {
      it('should retry connection on failure', async () => {
        const manager = new MCPConnectionManager(config);
        
        mockClient.connect
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValueOnce(undefined);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });

        await manager.initializeServer('test-server');

        expect(mockClient.connect).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith('Retrying connection to test-server (1/2)');
      });

      it('should setup reconnect after max retries', async () => {
        jest.useFakeTimers();
        const manager = new MCPConnectionManager(config);
        
        mockClient.connect.mockRejectedValue(new Error('Connection failed'));

        await expect(manager.initializeServer('test-server')).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to connect to test-server after 2 attempts'
        );
        
        // Verify reconnect interval is set
        expect(jest.getTimerCount()).toBe(1);
        
        jest.clearAllTimers();
        jest.useRealTimers();
      });
    });

    describe('shutdown', () => {
      it('should clear intervals and disconnect all clients', async () => {
        jest.useFakeTimers();
        const manager = new MCPConnectionManager(config);
        
        mockClient.listTools.mockResolvedValue({ tools: [] });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.connect.mockRejectedValue(new Error('Connection failed'));

        // Initialize to setup reconnect interval
        await expect(manager.initializeServer('test-server')).rejects.toThrow();
        
        expect(jest.getTimerCount()).toBe(1);

        await manager.shutdown();

        expect(jest.getTimerCount()).toBe(0);
        expect(mockClient.close).toHaveBeenCalled();
        
        jest.useRealTimers();
      });
    });
  });

  describe('Global functions', () => {
    describe('initializeMCPConnectionManager', () => {
      it('should create singleton instance', () => {
        const config = { servers: [] };
        
        const manager1 = initializeMCPConnectionManager(config);
        const manager2 = initializeMCPConnectionManager(config);

        expect(manager1).toBe(manager2);
      });
    });

    describe('getMCPConnectionManager', () => {
      it('should return existing instance', () => {
        const config = { servers: [] };
        const manager = initializeMCPConnectionManager(config);
        
        expect(getMCPConnectionManager()).toBe(manager);
      });

      it('should throw if not initialized', () => {
        expect(() => getMCPConnectionManager()).toThrow(
          'MCP connection manager not initialized'
        );
      });
    });

    describe('createTypedMCPClient', () => {
      it('should create typed client with tool wrappers', async () => {
        const config = {
          servers: [{
            name: 'test-server',
            type: 'stdio' as const,
            command: 'test'
          }]
        };
        
        mockClient.listTools.mockResolvedValue({
          tools: [
            { name: 'getTool1', description: 'Tool 1' },
            { name: 'getTool2', description: 'Tool 2' }
          ]
        });
        mockClient.listResources.mockResolvedValue({ resources: [] });
        mockClient.callTool.mockResolvedValue({ content: 'tool result' });

        const { client, tools } = await createTypedMCPClient<{
          getTool1: (args: any) => Promise<any>;
          getTool2: (args: any) => Promise<any>;
        }>('test-server', config);

        expect(client).toBe(mockClient);
        expect(tools.getTool1).toBeDefined();
        expect(tools.getTool2).toBeDefined();

        // Test tool wrapper
        const result = await tools.getTool1({ arg: 'value' });
        
        expect(mockClient.callTool).toHaveBeenCalledWith({
          name: 'getTool1',
          arguments: { arg: 'value' }
        });
        expect(result).toEqual({ content: 'tool result' });
      });
    });
  });
});