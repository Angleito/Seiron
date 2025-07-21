/**
 * Frontend MCP (Model Context Protocol) Library
 * Main export file for frontend MCP client functionality
 */

// Export client classes and hooks
export {
  EdgeMCPClient,
  MCPClientManager,
  useMCPClient
} from './client';

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Export configuration types
export type {
  MCPServerConfig,
  MCPClientOptions,
  MCPToolResult,
  MCPResourceContent
} from './client';

// Export server configurations
export * from './servers';