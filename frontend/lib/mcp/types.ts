/**
 * Frontend MCP (Model Context Protocol) Type Definitions
 * Shared types for MCP client implementations in the frontend
 */

// Re-export common types from backend (if shared package exists)
// For now, we'll duplicate the essential types for frontend use

/**
 * Tool definition from an MCP server
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Resource definition from an MCP server
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Tool call response
 */
export interface MCPToolResponse<T = any> {
  content: T;
  isError?: boolean;
  metadata?: Record<string, any>;
}

/**
 * MCP Error types for frontend
 */
export enum MCPErrorCode {
  ConnectionFailed = 'CONNECTION_FAILED',
  ToolNotFound = 'TOOL_NOT_FOUND',
  ResourceNotFound = 'RESOURCE_NOT_FOUND',
  InvalidArguments = 'INVALID_ARGUMENTS',
  ServerError = 'SERVER_ERROR',
  Timeout = 'TIMEOUT',
  NetworkError = 'NETWORK_ERROR',
  AuthenticationError = 'AUTHENTICATION_ERROR'
}

/**
 * MCP Error for frontend
 */
export class MCPError extends Error {
  code: MCPErrorCode;
  details?: any;

  constructor(code: MCPErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
  }
}

/**
 * MCP Connection State for UI
 */
export interface MCPConnectionState {
  connected: boolean;
  serverName: string;
  lastError?: Error;
  reconnecting?: boolean;
  lastConnected?: Date;
}

/**
 * MCP Server Status for UI display
 */
export interface MCPServerStatus {
  name: string;
  connected: boolean;
  toolCount?: number;
  resourceCount?: number;
  lastPing?: Date;
  error?: string;
}

/**
 * Tool execution result for UI
 */
export interface MCPToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: MCPError;
  duration?: number;
  serverName?: string;
}

/**
 * Resource content for UI display
 */
export interface MCPResourceData {
  uri: string;
  name: string;
  mimeType?: string;
  content?: string;
  size?: number;
  lastModified?: Date;
}

/**
 * MCP UI Configuration
 */
export interface MCPUIConfig {
  showConnectionStatus?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  showToolExecutionTime?: boolean;
  enableDebugMode?: boolean;
}

/**
 * MCP Hook State
 */
export interface MCPHookState {
  loading: boolean;
  error?: Error;
  connected: boolean;
  servers: MCPServerStatus[];
  executingTool?: string;
}

/**
 * Tool parameter for UI forms
 */
export interface MCPToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

/**
 * Tool definition for UI
 */
export interface MCPToolUI extends MCPTool {
  category?: string;
  icon?: string;
  parameters?: MCPToolParameter[];
  examples?: Array<{
    name: string;
    params: Record<string, any>;
  }>;
}

/**
 * Batch tool execution request
 */
export interface MCPBatchToolRequest {
  tools: Array<{
    name: string;
    arguments?: Record<string, any>;
    serverName?: string;
  }>;
  parallel?: boolean;
  stopOnError?: boolean;
}

/**
 * Batch tool execution result
 */
export interface MCPBatchToolResult {
  results: Array<{
    toolName: string;
    result?: MCPToolResponse;
    error?: MCPError;
    duration?: number;
  }>;
  totalDuration: number;
  succeeded: number;
  failed: number;
}