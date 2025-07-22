/**
 * MCP Client Library Exports
 * Central export point for all MCP functionality
 */

// Export all types
export * from '../mcp-types';

// Export all client functions
export {
  callMCPTool,
  checkMCPServerHealth,
  checkAllMCPServers,
  handleMCPRequests,
  batchCallMCPTools,
  getAvailableTools,
  getMCPServerURLs,
} from '../mcp-client';

// Re-export specific types for convenience
export type {
  MCPServerConfig,
  MCPToolRequest,
  MCPToolResponse,
  MCPServerHealth,
  MCPTools,
  MCPRequestContext,
  MCPResponseContext,
} from '../mcp-types';

// Export error types
export { MCPError, MCPErrorCode } from '../mcp-types';