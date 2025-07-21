/**
 * MCP (Model Context Protocol) Library
 * Main export file for MCP client functionality
 */

// Export client classes
export {
  MCPClientFactory,
  MCPConnectionManager,
  initializeMCPConnectionManager,
  getMCPConnectionManager,
  createTypedMCPClient
} from './client';

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Export configuration types
export type {
  MCPServerConfig,
  MCPClientConfig,
  MCPClientOptions
} from './client';