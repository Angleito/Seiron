/**
 * MCP (Model Context Protocol) Type Definitions
 * Common types used across MCP client and server implementations
 */

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
 * Prompt definition from an MCP server
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Tool call request
 */
export interface MCPToolCall {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * Tool call response
 */
export interface MCPToolResponse {
  content: any;
  isError?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Resource read request
 */
export interface MCPResourceRead {
  uri: string;
}

/**
 * Resource content response
 */
export interface MCPResourceContent {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: Uint8Array;
  }>;
}

/**
 * MCP Server capabilities
 */
export interface MCPServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

/**
 * MCP Client capabilities
 */
export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: boolean;
}

/**
 * MCP Error types
 */
export enum MCPErrorCode {
  ConnectionFailed = 'CONNECTION_FAILED',
  ToolNotFound = 'TOOL_NOT_FOUND',
  ResourceNotFound = 'RESOURCE_NOT_FOUND',
  InvalidArguments = 'INVALID_ARGUMENTS',
  ServerError = 'SERVER_ERROR',
  Timeout = 'TIMEOUT',
  PermissionDenied = 'PERMISSION_DENIED'
}

/**
 * MCP Error
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
 * MCP Connection State
 */
export interface MCPConnectionState {
  connected: boolean;
  serverName: string;
  serverVersion?: string;
  capabilities?: MCPServerCapabilities;
  lastError?: Error;
  reconnectAttempts?: number;
}

/**
 * MCP Request options
 */
export interface MCPRequestOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

/**
 * MCP Transport types
 */
export type MCPTransportType = 'stdio' | 'http' | 'websocket' | 'sse';

/**
 * MCP Transport configuration
 */
export interface MCPTransportConfig {
  type: MCPTransportType;
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For HTTP/WebSocket transports
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  // For all transports
  timeout?: number;
  keepAlive?: boolean;
}

/**
 * MCP Server metadata
 */
export interface MCPServerMetadata {
  name: string;
  version: string;
  description?: string;
  vendor?: string;
  homepage?: string;
  capabilities: MCPServerCapabilities;
}

/**
 * MCP Client metadata
 */
export interface MCPClientMetadata {
  name: string;
  version: string;
  capabilities: MCPClientCapabilities;
}

/**
 * MCP Message types for protocol communication
 */
export type MCPMessageType = 
  | 'initialize'
  | 'initialized'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'prompts/get'
  | 'completion/complete'
  | 'logging/setLevel'
  | 'ping'
  | 'error';

/**
 * Base MCP message structure
 */
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: MCPMessageType;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP notification (no id, no response expected)
 */
export interface MCPNotification extends Omit<MCPMessage, 'id' | 'result' | 'error'> {
  method: MCPMessageType;
  params?: any;
}

/**
 * MCP Logging levels
 */
export type MCPLogLevel = 'debug' | 'info' | 'warning' | 'error';

/**
 * MCP Log entry
 */
export interface MCPLogEntry {
  level: MCPLogLevel;
  logger?: string;
  message: string;
  timestamp: string;
  data?: any;
}