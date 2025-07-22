/**
 * React Hook for MCP Integration
 * Provides easy access to MCP functionality in React components
 */

import { useState, useCallback, useEffect } from 'react';
import {
  callMCPTool,
  checkMCPServerHealth,
  checkAllMCPServers,
  handleMCPRequests,
  MCPServerHealth,
  MCPTools,
  MCPError,
  MCPRequestContext,
  MCPResponseContext,
} from './index';

interface UseMCPOptions {
  autoHealthCheck?: boolean;
  healthCheckInterval?: number;
}

interface UseMCPReturn {
  // Tool calling
  callTool: <S extends keyof MCPTools, T extends keyof MCPTools[S]>(
    server: S,
    tool: T,
    args: MCPTools[S][T]['params']
  ) => Promise<MCPTools[S][T]['response']>;
  
  // Health monitoring
  serverHealth: MCPServerHealth[];
  checkHealth: (server?: keyof MCPTools) => Promise<void>;
  
  // Request handling
  handleRequest: (context: MCPRequestContext) => Promise<MCPResponseContext>;
  
  // State
  loading: boolean;
  error: MCPError | null;
  lastCallDuration?: number;
}

export function useMCP(options: UseMCPOptions = {}): UseMCPReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MCPError | null>(null);
  const [serverHealth, setServerHealth] = useState<MCPServerHealth[]>([]);
  const [lastCallDuration, setLastCallDuration] = useState<number>();

  const {
    autoHealthCheck = true,
    healthCheckInterval = 60000, // 1 minute
  } = options;

  // Call MCP tool with loading state and error handling
  const callTool = useCallback(async <
    S extends keyof MCPTools,
    T extends keyof MCPTools[S]
  >(
    server: S,
    tool: T,
    args: MCPTools[S][T]['params']
  ): Promise<MCPTools[S][T]['response']> => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const response = await callMCPTool(server, tool, args);
      setLastCallDuration(Date.now() - startTime);
      return response.result!;
    } catch (err) {
      const mcpError = err instanceof MCPError ? err : new MCPError(
        'CONNECTION_FAILED' as any,
        err instanceof Error ? err.message : 'Unknown error'
      );
      setError(mcpError);
      throw mcpError;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check server health
  const checkHealth = useCallback(async (server?: keyof MCPTools) => {
    try {
      if (server) {
        const health = await checkMCPServerHealth(server);
        setServerHealth(prev => {
          const updated = prev.filter(h => h.server !== server);
          return [...updated, health];
        });
      } else {
        const allHealth = await checkAllMCPServers();
        setServerHealth(allHealth);
      }
    } catch (err) {
      console.error('Health check failed:', err);
    }
  }, []);

  // Handle MCP requests
  const handleRequest = useCallback(async (
    context: MCPRequestContext
  ): Promise<MCPResponseContext> => {
    setLoading(true);
    setError(null);

    try {
      const response = await handleMCPRequests(context);
      return response;
    } catch (err) {
      const mcpError = err instanceof MCPError ? err : new MCPError(
        'CONNECTION_FAILED' as any,
        err instanceof Error ? err.message : 'Unknown error'
      );
      setError(mcpError);
      throw mcpError;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto health check
  useEffect(() => {
    if (autoHealthCheck) {
      checkHealth();
      const interval = setInterval(() => checkHealth(), healthCheckInterval);
      return () => clearInterval(interval);
    }
  }, [autoHealthCheck, healthCheckInterval, checkHealth]);

  return {
    callTool,
    serverHealth,
    checkHealth,
    handleRequest,
    loading,
    error,
    lastCallDuration,
  };
}

/**
 * Hook for specific MCP server
 */
export function useMCPServer<S extends keyof MCPTools>(
  server: S,
  options?: UseMCPOptions
) {
  const mcp = useMCP(options);

  const callServerTool = useCallback(async <T extends keyof MCPTools[S]>(
    tool: T,
    args: MCPTools[S][T]['params']
  ): Promise<MCPTools[S][T]['response']> => {
    return mcp.callTool(server, tool, args);
  }, [mcp, server]);

  const serverHealthStatus = mcp.serverHealth.find(h => h.server === server);

  return {
    call: callServerTool,
    health: serverHealthStatus,
    checkHealth: () => mcp.checkHealth(server),
    loading: mcp.loading,
    error: mcp.error,
  };
}