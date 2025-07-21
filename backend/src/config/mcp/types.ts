/**
 * Shared MCP (Model Context Protocol) Type Definitions
 * 
 * This module defines common types used across all MCP server
 * configurations and implementations.
 */

import { z } from 'zod'

/**
 * MCP protocol version
 */
export type MCPVersion = '1.0.0' | '1.1.0'

/**
 * MCP server capability types
 */
export type MCPCapability = 
  | 'wallet-operations'
  | 'transaction-queries'
  | 'defi-monitoring'
  | 'token-management'
  | 'liquidity-pools'
  | 'staking-operations'
  | 'governance'
  | 'smart-contracts'
  | 'nft-operations'
  | 'cross-chain'

/**
 * MCP authentication types
 */
export type MCPAuthType = 'none' | 'api-key' | 'oauth2' | 'jwt'

/**
 * MCP tool definition
 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: z.ZodSchema<any>
  outputSchema?: z.ZodSchema<any>
  handler: string
  category?: string
  tags?: string[]
  rateLimit?: {
    requests: number
    window: string
  }
}

/**
 * MCP endpoint configuration
 */
export interface MCPEndpoint {
  url: string
  type: 'rpc' | 'rest' | 'websocket' | 'graphql'
  network?: string
  priority?: number
}

/**
 * MCP authentication configuration
 */
export interface MCPAuth {
  type: MCPAuthType
  headerName?: string
  apiKey?: string
  clientId?: string
  clientSecret?: string
  tokenUrl?: string
  rateLimit?: {
    requests: number
    window: string
  }
}

/**
 * MCP error configuration
 */
export interface MCPErrorConfig {
  retryPolicy?: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
    maxDelay?: number
  }
  fallbackEndpoints?: boolean
  circuitBreaker?: {
    threshold: number
    timeout: number
    resetTimeout?: number
  }
}

/**
 * MCP cache configuration
 */
export interface MCPCacheConfig {
  enabled: boolean
  ttl: Record<string, number>
  maxSize?: number
  storage?: 'memory' | 'redis' | 'disk'
}

/**
 * Base MCP server configuration
 */
export interface MCPServerConfig {
  name: string
  version: string
  description: string
  metadata: {
    protocol: string
    capabilities: MCPCapability[]
    author?: string
    documentation?: string
  }
  endpoints: Record<string, any>
  auth: MCPAuth
  tools: MCPTool[]
  schemas?: Record<string, z.ZodSchema<any>>
  errorHandling?: MCPErrorConfig
  cache?: MCPCacheConfig
}

/**
 * MCP request context
 */
export interface MCPRequestContext {
  serverId: string
  toolName: string
  requestId: string
  timestamp: number
  auth?: {
    userId?: string
    apiKey?: string
    permissions?: string[]
  }
  metadata?: Record<string, any>
}

/**
 * MCP response format
 */
export interface MCPResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    serverId: string
    toolName: string
    requestId: string
    executionTime: number
    cacheHit?: boolean
  }
}

/**
 * MCP tool handler signature
 */
export type MCPToolHandler<TInput = any, TOutput = any> = (
  input: TInput,
  context: MCPRequestContext
) => Promise<MCPResponse<TOutput>>

/**
 * MCP server instance
 */
export interface MCPServerInstance {
  config: MCPServerConfig
  handlers: Map<string, MCPToolHandler>
  middleware?: Array<(ctx: MCPRequestContext, next: () => Promise<any>) => Promise<any>>
  start: () => Promise<void>
  stop: () => Promise<void>
  executeTask: (toolName: string, input: any, context?: Partial<MCPRequestContext>) => Promise<MCPResponse>
}