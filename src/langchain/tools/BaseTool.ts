/**
 * Base LangChain Tool for DeFi Operations
 * 
 * This module provides the foundation for all LangChain tools in the Sei DeFi ecosystem,
 * bridging natural language interactions with agent actions while maintaining fp-ts patterns.
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { AgentAction, ActionContext, ActionResult, AgentError } from '../../agents/base/BaseAgent';

/**
 * Base configuration for all DeFi tools
 */
export interface DeFiToolConfig {
  name: string;
  description: string;
  category: 'lending' | 'liquidity' | 'market' | 'cross-protocol';
  schema: z.ZodSchema<any>;
  examples: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  permissions?: string[];
}

/**
 * Context passed to tools from conversation
 */
export interface ToolContext {
  userId?: string;
  sessionId?: string;
  conversationHistory?: string[];
  agentState?: Record<string, any>;
  walletAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced tool result with DeFi-specific information
 */
export interface DeFiToolResult {
  success: boolean;
  data?: any;
  message: string;
  transactionHash?: string;
  gasUsed?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Error types specific to DeFi tools
 */
export type DeFiToolError = 
  | { type: 'VALIDATION_ERROR'; message: string; details?: any }
  | { type: 'EXECUTION_ERROR'; message: string; details?: any }
  | { type: 'RATE_LIMIT_ERROR'; message: string; details?: any }
  | { type: 'PERMISSION_ERROR'; message: string; details?: any }
  | { type: 'NETWORK_ERROR'; message: string; details?: any }
  | { type: 'INSUFFICIENT_BALANCE'; message: string; details?: any }
  | { type: 'SLIPPAGE_ERROR'; message: string; details?: any }
  | { type: 'LIQUIDATION_RISK'; message: string; details?: any };

/**
 * Base class for all DeFi LangChain tools
 */
export abstract class BaseDeFiTool extends Tool {
  protected config: DeFiToolConfig;
  protected context: ToolContext;

  constructor(config: DeFiToolConfig, context: ToolContext = {}) {
    super();
    this.config = config;
    this.context = context;
    this.name = config.name;
    this.description = this.buildDescription();
    this.schema = config.schema;
  }

  /**
   * Build enhanced description with examples
   */
  private buildDescription(): string {
    const examples = this.config.examples.length > 0 
      ? `\n\nExamples:\n${this.config.examples.map(ex => `- ${ex}`).join('\n')}`
      : '';
    
    return `${this.config.description}${examples}`;
  }

  /**
   * Main execution method - validates input and delegates to implementation
   */
  async _call(input: string): Promise<string> {
    try {
      // Parse input parameters
      const params = await this.parseInput(input);
      
      // Validate parameters
      const validationResult = this.validateParameters(params);
      if (!validationResult.success) {
        return this.formatError({
          type: 'VALIDATION_ERROR',
          message: validationResult.error || 'Invalid parameters',
          details: params
        });
      }

      // Check permissions
      const permissionResult = this.checkPermissions(params);
      if (!permissionResult.success) {
        return this.formatError({
          type: 'PERMISSION_ERROR',
          message: permissionResult.error || 'Insufficient permissions',
          details: params
        });
      }

      // Check rate limits
      const rateLimitResult = this.checkRateLimit();
      if (!rateLimitResult.success) {
        return this.formatError({
          type: 'RATE_LIMIT_ERROR',
          message: rateLimitResult.error || 'Rate limit exceeded',
          details: { windowMs: this.config.rateLimit?.windowMs }
        });
      }

      // Execute the tool
      const result = await this.execute(params);
      
      return this.formatResult(result);
    } catch (error) {
      return this.formatError({
        type: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }
  }

  /**
   * Parse natural language input into structured parameters
   */
  protected async parseInput(input: string): Promise<Record<string, any>> {
    try {
      // Try to parse as JSON first
      return JSON.parse(input);
    } catch {
      // Fall back to natural language parsing
      return this.parseNaturalLanguage(input);
    }
  }

  /**
   * Parse natural language into parameters
   * Override in subclasses for specific parsing logic
   */
  protected parseNaturalLanguage(input: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract common patterns
    const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|SEI|BTC)/i);
    if (amountMatch) {
      params.amount = amountMatch[1];
      params.asset = amountMatch[2].toUpperCase();
    }

    // Extract wallet address
    const walletMatch = input.match(/0x[a-fA-F0-9]{40}/);
    if (walletMatch) {
      params.walletAddress = walletMatch[0];
    }

    // Use context wallet if available
    if (!params.walletAddress && this.context.walletAddress) {
      params.walletAddress = this.context.walletAddress;
    }

    return params;
  }

  /**
   * Validate parameters against schema
   */
  protected validateParameters(params: Record<string, any>): { success: boolean; error?: string } {
    try {
      this.config.schema.parse(params);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` 
        };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  /**
   * Check permissions for the operation
   */
  protected checkPermissions(params: Record<string, any>): { success: boolean; error?: string } {
    if (!this.config.permissions || this.config.permissions.length === 0) {
      return { success: true };
    }

    // Check if user has required permissions
    // This would integrate with your permission system
    return { success: true };
  }

  /**
   * Check rate limits
   */
  protected checkRateLimit(): { success: boolean; error?: string } {
    if (!this.config.rateLimit) {
      return { success: true };
    }

    // Implement rate limiting logic
    // This would integrate with your rate limiting system
    return { success: true };
  }

  /**
   * Format successful result for user
   */
  protected formatResult(result: DeFiToolResult): string {
    const parts: string[] = [];
    
    if (result.success) {
      parts.push(`✅ ${result.message}`);
    } else {
      parts.push(`❌ ${result.message}`);
    }

    if (result.transactionHash) {
      parts.push(`🔗 Transaction: ${result.transactionHash}`);
    }

    if (result.gasUsed) {
      parts.push(`⛽ Gas Used: ${result.gasUsed}`);
    }

    if (result.data) {
      parts.push(`📊 Data: ${JSON.stringify(result.data, null, 2)}`);
    }

    return parts.join('\n');
  }

  /**
   * Format error for user
   */
  protected formatError(error: DeFiToolError): string {
    const emoji = this.getErrorEmoji(error.type);
    return `${emoji} ${error.message}`;
  }

  /**
   * Get emoji for error type
   */
  private getErrorEmoji(type: DeFiToolError['type']): string {
    switch (type) {
      case 'VALIDATION_ERROR': return '⚠️';
      case 'EXECUTION_ERROR': return '❌';
      case 'RATE_LIMIT_ERROR': return '⏰';
      case 'PERMISSION_ERROR': return '🔒';
      case 'NETWORK_ERROR': return '🌐';
      case 'INSUFFICIENT_BALANCE': return '💰';
      case 'SLIPPAGE_ERROR': return '📈';
      case 'LIQUIDATION_RISK': return '🚨';
      default: return '❓';
    }
  }

  /**
   * Abstract method for tool execution
   * Must be implemented by subclasses
   */
  protected abstract execute(params: Record<string, any>): Promise<DeFiToolResult>;

  /**
   * Get tool configuration
   */
  public getConfig(): DeFiToolConfig {
    return { ...this.config };
  }

  /**
   * Get current context
   */
  public getContext(): ToolContext {
    return { ...this.context };
  }

  /**
   * Update context
   */
  public updateContext(updates: Partial<ToolContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Helper method to create TaskEither from async operation
   */
  protected taskEither<T>(fn: () => Promise<T>): TaskEither<DeFiToolError, T> {
    return TE.tryCatch(
      fn,
      (error): DeFiToolError => ({
        type: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      })
    );
  }
}

/**
 * Factory function to create DeFi tools
 */
export function createDeFiTool<T extends BaseDeFiTool>(
  ToolClass: new (config: DeFiToolConfig, context?: ToolContext) => T,
  config: DeFiToolConfig,
  context?: ToolContext
): T {
  return new ToolClass(config, context);
}

/**
 * Helper function to create tool schema
 */
export function createToolSchema<T extends Record<string, any>>(
  schema: z.ZodSchema<T>
): z.ZodSchema<T> {
  return schema;
}

/**
 * Common schemas for DeFi operations
 */
export const CommonSchemas = {
  // Basic asset operation
  AssetOperation: z.object({
    asset: z.string().describe('Asset symbol (e.g., USDC, ETH, SEI)'),
    amount: z.string().describe('Amount to operate on'),
    walletAddress: z.string().optional().describe('Wallet address (optional if set in context)')
  }),

  // Lending operation
  LendingOperation: z.object({
    asset: z.string().describe('Asset to lend/borrow'),
    amount: z.string().describe('Amount to lend/borrow'),
    walletAddress: z.string().optional(),
    interestRateMode: z.enum(['stable', 'variable']).optional().describe('Interest rate mode')
  }),

  // Swap operation
  SwapOperation: z.object({
    tokenIn: z.string().describe('Token to swap from'),
    tokenOut: z.string().describe('Token to swap to'),
    amountIn: z.string().describe('Amount to swap'),
    slippageTolerance: z.number().optional().describe('Slippage tolerance (0-100)'),
    walletAddress: z.string().optional()
  }),

  // Liquidity operation
  LiquidityOperation: z.object({
    token0: z.string().describe('First token in pair'),
    token1: z.string().describe('Second token in pair'),
    amount0: z.string().describe('Amount of first token'),
    amount1: z.string().describe('Amount of second token'),
    fee: z.number().optional().describe('Fee tier (500, 3000, 10000)'),
    walletAddress: z.string().optional()
  })
};