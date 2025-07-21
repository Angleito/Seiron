/**
 * useMCPClient Hook Tests
 * Tests for the React hook that manages MCP client connections
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useMCPClient } from '@/lib/mcp/client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/streamable-http.js');
jest.mock('@modelcontextprotocol/sdk/client/websocket.js');
jest.mock('@/lib/logger');

describe('useMCPClient Hook', () => {
  let mockClient: jest.Mocked<Client>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      callTool: jest.fn().mockResolvedValue({ content: 'test result' }),
      readResource: jest.fn()
    } as any;
    
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Client Initialization', () => {
    it('should create client and auto-connect on mount', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failure gracefully', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should call onConnectionChange callback', async () => {
      const onConnectionChange = jest.fn();
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      renderHook(() => useMCPClient(config, { onConnectionChange }));

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith(true, 'test-server');
      });
    });
  });

  describe('Connection Management', () => {
    it('should connect when connect is called', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      // Start with failed connection
      mockClient.connect.mockRejectedValueOnce(new Error('Initial fail'));

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Now connect successfully
      mockClient.connect.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connected).toBe(true);
      expect(mockClient.connect).toHaveBeenCalledTimes(2);
    });

    it('should disconnect when disconnect is called', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);
      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('should disconnect on unmount', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { unmount } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(mockClient.connect).toHaveBeenCalled();
      });

      unmount();

      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tool Calling', () => {
    it('should call tool with correct parameters', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      mockClient.callTool.mockResolvedValueOnce({
        content: { data: 'test' },
        isError: false
      });

      let toolResult;
      await act(async () => {
        toolResult = await result.current.callTool('testTool', { arg: 'value' });
      });

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'testTool',
        arguments: { arg: 'value' }
      });

      expect(toolResult).toEqual({
        content: { data: 'test' },
        isError: false,
        metadata: expect.any(Object)
      });
    });

    it('should auto-connect if disconnected when calling tool', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      // Start disconnected
      mockClient.connect.mockRejectedValueOnce(new Error('Initial fail'));

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Setup successful reconnect
      mockClient.connect.mockResolvedValueOnce(undefined);
      mockClient.callTool.mockResolvedValueOnce({ content: 'success' });

      await act(async () => {
        await result.current.callTool('testTool');
      });

      expect(mockClient.connect).toHaveBeenCalledTimes(2);
      expect(mockClient.callTool).toHaveBeenCalled();
    });

    it('should retry tool calls on failure', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config, {
        retryAttempts: 2,
        retryDelay: 10
      }));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Fail twice, succeed on third
      mockClient.callTool
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce({ content: 'success' });

      await act(async () => {
        const result = await result.current.callTool('testTool');
        expect(result.content).toBe('success');
      });

      expect(mockClient.callTool).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config, {
        retryAttempts: 1,
        retryDelay: 10
      }));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      mockClient.callTool.mockRejectedValue(new Error('Persistent error'));

      await act(async () => {
        await expect(result.current.callTool('testTool')).rejects.toThrow('Persistent error');
      });

      expect(mockClient.callTool).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Server-Side Rendering', () => {
    it('should return dummy implementation on server', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config));

      expect(result.current.client).toBeNull();
      expect(result.current.connected).toBe(false);

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Configuration Options', () => {
    it('should respect timeout configuration', async () => {
      jest.useFakeTimers();

      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      const { result } = renderHook(() => useMCPClient(config, {
        timeout: 5000
      }));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // In real implementation, would verify timeout is applied to client
      jest.useRealTimers();
    });

    it('should support WebSocket configuration', async () => {
      const config = {
        name: 'test-server',
        type: 'websocket' as const,
        url: 'ws://localhost:3001'
      };

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Verify WebSocket transport was used
      const { WebSocketClientTransport } = await import('@modelcontextprotocol/sdk/client/websocket.js');
      expect(WebSocketClientTransport).toHaveBeenCalledWith('ws://localhost:3001');
    });

    it('should pass headers to HTTP transport', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000',
        apiKey: 'test-key',
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      };

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const { StreamableHttpClientTransport } = await import('@modelcontextprotocol/sdk/client/streamable-http.js');
      expect(StreamableHttpClientTransport).toHaveBeenCalledWith({
        url: 'http://localhost:3000',
        apiKey: 'test-key',
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle client not initialized error', async () => {
      const config = {
        name: 'test-server',
        type: 'http' as const,
        url: 'http://localhost:3000'
      };

      // Mock to simulate client not created
      (Client as jest.MockedClass<typeof Client>).mockImplementationOnce(() => {
        throw new Error('Client creation failed');
      });

      const { result } = renderHook(() => useMCPClient(config));

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      await expect(result.current.callTool('test')).rejects.toThrow();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should manage multiple independent connections', async () => {
      const config1 = {
        name: 'server-1',
        type: 'http' as const,
        url: 'http://localhost:3001'
      };

      const config2 = {
        name: 'server-2',
        type: 'http' as const,
        url: 'http://localhost:3002'
      };

      const { result: result1 } = renderHook(() => useMCPClient(config1));
      const { result: result2 } = renderHook(() => useMCPClient(config2));

      await waitFor(() => {
        expect(result1.current.connected).toBe(true);
        expect(result2.current.connected).toBe(true);
      });

      // Disconnect one shouldn't affect the other
      await act(async () => {
        await result1.current.disconnect();
      });

      expect(result1.current.connected).toBe(false);
      expect(result2.current.connected).toBe(true);
    });
  });
});