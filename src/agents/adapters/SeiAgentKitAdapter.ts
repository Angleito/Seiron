import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult, AgentPlugin } from '../base/BaseAgent';

/**
 * SeiAgentKitAdapter - Core Integration Bridge
 * 
 * This adapter bridges the Sei Agent Kit with the existing BaseAgent architecture,
 * providing seamless integration while maintaining fp-ts patterns and type safety.
 */

// ============================================================================
// SAK Bridge Types
// ============================================================================

/**
 * Sei Agent Kit Tool interface - represents a tool from SAK
 */
export interface SAKTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>) => Promise<any>;
  category: 'blockchain' | 'defi' | 'trading' | 'analysis' | 'utility';
  permission?: 'read' | 'write' | 'admin';
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
}

/**
 * SAK Operation Result - standardized result from SAK operations
 */
export interface SAKOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    gasUsed?: number;
    txHash?: string;
    blockNumber?: number;
    timestamp?: number;
  };
}

/**
 * SAK Context - execution context for SAK operations
 */
export interface SAKContext {
  userId?: string;
  walletAddress?: string;
  chainId?: number;
  network: 'mainnet' | 'testnet' | 'devnet';
  permissions: string[];
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * SAK Integration Config - configuration for SAK integration
 */
export interface SAKIntegrationConfig {
  sakEndpoint: string;
  apiKey?: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  defaultPermissions: string[];
  rateLimitConfig: {
    defaultMaxCalls: number;
    defaultWindowMs: number;
  };
  cacheConfig: {
    enabled: boolean;
    ttlMs: number;
    maxSize: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
}

// ============================================================================
// Bridge Pattern Interfaces
// ============================================================================

/**
 * Tool Registration Bridge - manages SAK tool registration
 */
export interface ToolRegistrationBridge {
  registerTool: (tool: SAKTool) => Either<AgentError, void>;
  unregisterTool: (toolName: string) => Either<AgentError, void>;
  getTool: (toolName: string) => Either<AgentError, SAKTool>;
  listTools: () => Either<AgentError, SAKTool[]>;
  getToolsByCategory: (category: string) => Either<AgentError, SAKTool[]>;
}

/**
 * Operation Bridge - executes SAK operations with fp-ts patterns
 */
export interface OperationBridge {
  execute: <T>(
    toolName: string,
    params: Record<string, any>,
    context: SAKContext
  ) => TaskEither<AgentError, SAKOperationResult<T>>;
  
  executeWithValidation: <T>(
    toolName: string,
    params: Record<string, any>,
    context: SAKContext
  ) => TaskEither<AgentError, SAKOperationResult<T>>;
  
  executeBatch: <T>(
    operations: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context: SAKContext
  ) => TaskEither<AgentError, Array<SAKOperationResult<T>>>;
}

/**
 * Context Bridge - manages context mapping between systems
 */
export interface ContextBridge {
  mapActionContextToSAK: (actionContext: ActionContext) => Either<AgentError, SAKContext>;
  mapSAKResultToActionResult: <T>(sakResult: SAKOperationResult<T>) => Either<AgentError, ActionResult>;
  enrichContext: (context: SAKContext, enrichments: Record<string, any>) => SAKContext;
  validateContext: (context: SAKContext) => Either<AgentError, void>;
}

/**
 * Error Bridge - handles error mapping between systems
 */
export interface ErrorBridge {
  mapSAKError: (error: any) => AgentError;
  mapAgentError: (error: AgentError) => any;
  isRecoverableError: (error: any) => boolean;
  createRetryStrategy: (error: any) => Either<AgentError, RetryStrategy>;
}

/**
 * Retry Strategy for error recovery
 */
export interface RetryStrategy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
  retryCondition: (error: any, attempt: number) => boolean;
}

// ============================================================================
// Core SeiAgentKitAdapter Implementation
// ============================================================================

/**
 * SeiAgentKitAdapter - Main adapter class
 * 
 * This class extends BaseAgent to provide SAK integration while maintaining
 * all existing patterns and functionality.
 */
export class SeiAgentKitAdapter extends BaseAgent {
  private readonly sakConfig: SAKIntegrationConfig;
  private readonly toolRegistry: Map<string, SAKTool> = new Map();
  private readonly operationBridge: OperationBridge;
  private readonly contextBridge: ContextBridge;
  private readonly errorBridge: ErrorBridge;
  private readonly toolRegistrationBridge: ToolRegistrationBridge;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(config: AgentConfig, sakConfig: SAKIntegrationConfig) {
    super(config);
    this.sakConfig = sakConfig;
    
    // Initialize bridges
    this.operationBridge = new OperationBridgeImpl(this);
    this.contextBridge = new ContextBridgeImpl(this);
    this.errorBridge = new ErrorBridgeImpl(this);
    this.toolRegistrationBridge = new ToolRegistrationBridgeImpl(this);
    
    // Register SAK-specific actions
    this.registerSAKActions();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Register a SAK tool with the adapter
   */
  public registerSAKTool(tool: SAKTool): Either<AgentError, void> {
    return this.toolRegistrationBridge.registerTool(tool);
  }

  /**
   * Execute a SAK tool operation
   */
  public executeSAKTool<T>(
    toolName: string,
    params: Record<string, any>,
    context?: Partial<SAKContext>
  ): TaskEither<AgentError, SAKOperationResult<T>> {
    return pipe(
      this.createSAKContext(context),
      TE.fromEither,
      TE.chain(sakContext => 
        this.operationBridge.execute<T>(toolName, params, sakContext)
      )
    );
  }

  /**
   * Execute multiple SAK operations in batch
   */
  public executeSAKBatch<T>(
    operations: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context?: Partial<SAKContext>
  ): TaskEither<AgentError, Array<SAKOperationResult<T>>> {
    return pipe(
      this.createSAKContext(context),
      TE.fromEither,
      TE.chain(sakContext => 
        this.operationBridge.executeBatch<T>(operations, sakContext)
      )
    );
  }

  /**
   * Get available SAK tools
   */
  public getSAKTools(): Either<AgentError, SAKTool[]> {
    return this.toolRegistrationBridge.listTools();
  }

  /**
   * Get SAK tools by category
   */
  public getSAKToolsByCategory(category: string): Either<AgentError, SAKTool[]> {
    return this.toolRegistrationBridge.getToolsByCategory(category);
  }

  /**
   * Install SAK integration as a plugin
   */
  public installSAKPlugin(): TaskEither<AgentError, void> {
    const plugin: AgentPlugin = {
      id: 'sak-integration',
      name: 'Sei Agent Kit Integration',
      version: '1.0.0',
      initialize: (agent: BaseAgent) => this.initializeSAKPlugin(agent),
      cleanup: () => this.cleanupSAKPlugin()
    };

    return this.installPlugin(plugin);
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Register SAK-specific actions with the BaseAgent
   */
  private registerSAKActions(): void {
    const actions = [
      {
        id: 'execute_sak_tool',
        name: 'Execute SAK Tool',
        description: 'Execute a Sei Agent Kit tool with parameters',
        handler: this.handleExecuteSAKTool.bind(this),
        validation: [
          { field: 'toolName', required: true, type: 'string' as const },
          { field: 'params', required: true, type: 'object' as const },
          { field: 'context', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'execute_sak_batch',
        name: 'Execute SAK Batch Operations',
        description: 'Execute multiple SAK operations in batch',
        handler: this.handleExecuteSAKBatch.bind(this),
        validation: [
          { field: 'operations', required: true, type: 'array' as const },
          { field: 'context', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'list_sak_tools',
        name: 'List Available SAK Tools',
        description: 'Get list of available Sei Agent Kit tools',
        handler: this.handleListSAKTools.bind(this),
        validation: [
          { field: 'category', required: false, type: 'string' as const }
        ]
      },
      {
        id: 'get_sak_tool_info',
        name: 'Get SAK Tool Information',
        description: 'Get detailed information about a specific SAK tool',
        handler: this.handleGetSAKToolInfo.bind(this),
        validation: [
          { field: 'toolName', required: true, type: 'string' as const }
        ]
      }
    ];

    actions.forEach(action => {
      this.registerAction(action);
    });
  }

  /**
   * Handle execute SAK tool action
   */
  private handleExecuteSAKTool(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { toolName, params, context: sakContextOverride } = context.parameters;

    return pipe(
      this.createSAKContext(sakContextOverride),
      TE.fromEither,
      TE.chain(sakContext => 
        this.operationBridge.execute(toolName, params, sakContext)
      ),
      TE.chain(sakResult => 
        pipe(
          this.contextBridge.mapSAKResultToActionResult(sakResult),
          TE.fromEither
        )
      )
    );
  }

  /**
   * Handle execute SAK batch action
   */
  private handleExecuteSAKBatch(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { operations, context: sakContextOverride } = context.parameters;

    return pipe(
      this.createSAKContext(sakContextOverride),
      TE.fromEither,
      TE.chain(sakContext => 
        this.operationBridge.executeBatch(operations, sakContext)
      ),
      TE.map(results => ({
        success: true,
        data: { results, totalOperations: operations.length },
        message: `Executed ${results.length} SAK operations`
      }))
    );
  }

  /**
   * Handle list SAK tools action
   */
  private handleListSAKTools(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { category } = context.parameters;

    return pipe(
      category 
        ? this.toolRegistrationBridge.getToolsByCategory(category)
        : this.toolRegistrationBridge.listTools(),
      TE.fromEither,
      TE.map(tools => ({
        success: true,
        data: { tools, count: tools.length },
        message: `Found ${tools.length} SAK tools${category ? ` in category ${category}` : ''}`
      }))
    );
  }

  /**
   * Handle get SAK tool info action
   */
  private handleGetSAKToolInfo(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { toolName } = context.parameters;

    return pipe(
      this.toolRegistrationBridge.getTool(toolName),
      TE.fromEither,
      TE.map(tool => ({
        success: true,
        data: { tool },
        message: `Retrieved information for SAK tool: ${toolName}`
      }))
    );
  }

  /**
   * Create SAK context from action context and overrides
   */
  private createSAKContext(contextOverride?: Partial<SAKContext>): Either<AgentError, SAKContext> {
    try {
      const baseContext: SAKContext = {
        network: this.sakConfig.network,
        permissions: this.sakConfig.defaultPermissions,
        sessionId: `sak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {}
      };

      const mergedContext = { ...baseContext, ...contextOverride };
      
      return pipe(
        this.contextBridge.validateContext(mergedContext),
        TE.fromEither,
        TE.map(() => mergedContext)
      );
    } catch (error) {
      return left(this.createError('CONTEXT_CREATION_FAILED', `Failed to create SAK context: ${error}`));
    }
  }

  /**
   * Initialize SAK plugin
   */
  private initializeSAKPlugin(agent: BaseAgent): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Initialize SAK connection
          await this.initializeSAKConnection();
          
          // Load default tools
          await this.loadDefaultSAKTools();
          
          // Setup rate limiters
          this.setupRateLimiters();
          
          // Setup cache if enabled
          if (this.sakConfig.cacheConfig.enabled) {
            this.setupCache();
          }
          
          this.emit('sak:plugin:initialized', { agentId: agent.getConfig().id });
        },
        error => this.createError('SAK_PLUGIN_INIT_FAILED', `Failed to initialize SAK plugin: ${error}`)
      )
    );
  }

  /**
   * Cleanup SAK plugin
   */
  private cleanupSAKPlugin(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Clear cache
          this.cache.clear();
          
          // Clear rate limiters
          this.rateLimiters.clear();
          
          // Clear tool registry
          this.toolRegistry.clear();
          
          this.emit('sak:plugin:cleanup', { agentId: this.getConfig().id });
        },
        error => this.createError('SAK_PLUGIN_CLEANUP_FAILED', `Failed to cleanup SAK plugin: ${error}`)
      )
    );
  }

  /**
   * Initialize SAK connection
   */
  private async initializeSAKConnection(): Promise<void> {
    // Placeholder for actual SAK connection initialization
    // This would typically:
    // 1. Establish connection to SAK endpoint
    // 2. Authenticate with API key
    // 3. Verify network connectivity
    // 4. Load available tools from SAK
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
  }

  /**
   * Load default SAK tools
   */
  private async loadDefaultSAKTools(): Promise<void> {
    // Placeholder for loading default tools
    // This would typically fetch available tools from SAK and register them
    
    const defaultTools: SAKTool[] = [
      // These would be loaded from actual SAK
      {
        name: 'get_balance',
        description: 'Get wallet balance for specified token',
        parameters: { address: 'string', token: 'string' },
        execute: async (params) => ({ balance: '1000', token: params.token }),
        category: 'blockchain'
      },
      {
        name: 'send_transaction',
        description: 'Send transaction on Sei network',
        parameters: { to: 'string', amount: 'string', token: 'string' },
        execute: async (params) => ({ txHash: '0x123...', success: true }),
        category: 'blockchain',
        permission: 'write'
      }
    ];
    
    defaultTools.forEach(tool => {
      this.toolRegistry.set(tool.name, tool);
    });
  }

  /**
   * Setup rate limiters
   */
  private setupRateLimiters(): void {
    this.toolRegistry.forEach((tool, toolName) => {
      const rateLimit = tool.rateLimit || {
        maxCalls: this.sakConfig.rateLimitConfig.defaultMaxCalls,
        windowMs: this.sakConfig.rateLimitConfig.defaultWindowMs
      };
      
      this.rateLimiters.set(toolName, new RateLimiter(rateLimit.maxCalls, rateLimit.windowMs));
    });
  }

  /**
   * Setup cache
   */
  private setupCache(): void {
    // Setup cache cleanup interval
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Set in cache
   */
  private setInCache<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.sakConfig.cacheConfig.ttlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(toolName: string): Either<AgentError, void> {
    const limiter = this.rateLimiters.get(toolName);
    if (!limiter) {
      return right(undefined);
    }
    
    if (!limiter.canExecute()) {
      return left(this.createError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for tool: ${toolName}`));
    }
    
    limiter.recordExecution();
    return right(undefined);
  }

  // ============================================================================
  // BaseAgent Implementation
  // ============================================================================

  protected initialize(): TaskEither<AgentError, void> {
    return this.initializeSAKPlugin(this);
  }

  protected cleanup(): TaskEither<AgentError, void> {
    return this.cleanupSAKPlugin();
  }

  // ============================================================================
  // Internal Access Methods (for bridge implementations)
  // ============================================================================

  public getToolRegistry(): Map<string, SAKTool> {
    return this.toolRegistry;
  }

  public getSAKConfig(): SAKIntegrationConfig {
    return this.sakConfig;
  }

  public getRateLimiters(): Map<string, RateLimiter> {
    return this.rateLimiters;
  }

  public getCacheInstance(): Map<string, CacheEntry> {
    return this.cache;
  }

  public getOperationBridge(): OperationBridge {
    return this.operationBridge;
  }

  public getContextBridge(): ContextBridge {
    return this.contextBridge;
  }

  public getErrorBridge(): ErrorBridge {
    return this.errorBridge;
  }
}

// ============================================================================
// Supporting Types and Classes
// ============================================================================

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class RateLimiter {
  private calls: number[] = [];
  
  constructor(
    private maxCalls: number,
    private windowMs: number
  ) {}
  
  canExecute(): boolean {
    this.cleanupOldCalls();
    return this.calls.length < this.maxCalls;
  }
  
  recordExecution(): void {
    this.calls.push(Date.now());
  }
  
  private cleanupOldCalls(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.calls = this.calls.filter(time => time > cutoff);
  }
}

// ============================================================================
// Bridge Implementation Classes
// ============================================================================

class ToolRegistrationBridgeImpl implements ToolRegistrationBridge {
  constructor(private adapter: SeiAgentKitAdapter) {}

  registerTool(tool: SAKTool): Either<AgentError, void> {
    try {
      if (this.adapter.getToolRegistry().has(tool.name)) {
        return left(this.adapter.createError('TOOL_ALREADY_EXISTS', `Tool ${tool.name} already registered`));
      }
      
      this.adapter.getToolRegistry().set(tool.name, tool);
      return right(undefined);
    } catch (error) {
      return left(this.adapter.createError('TOOL_REGISTRATION_FAILED', `Failed to register tool: ${error}`));
    }
  }

  unregisterTool(toolName: string): Either<AgentError, void> {
    try {
      if (!this.adapter.getToolRegistry().has(toolName)) {
        return left(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
      }
      
      this.adapter.getToolRegistry().delete(toolName);
      return right(undefined);
    } catch (error) {
      return left(this.adapter.createError('TOOL_UNREGISTRATION_FAILED', `Failed to unregister tool: ${error}`));
    }
  }

  getTool(toolName: string): Either<AgentError, SAKTool> {
    const tool = this.adapter.getToolRegistry().get(toolName);
    if (!tool) {
      return left(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
    }
    return right(tool);
  }

  listTools(): Either<AgentError, SAKTool[]> {
    return right(Array.from(this.adapter.getToolRegistry().values()));
  }

  getToolsByCategory(category: string): Either<AgentError, SAKTool[]> {
    const tools = Array.from(this.adapter.getToolRegistry().values())
      .filter(tool => tool.category === category);
    return right(tools);
  }
}

class OperationBridgeImpl implements OperationBridge {
  constructor(private adapter: SeiAgentKitAdapter) {}

  execute<T>(
    toolName: string,
    params: Record<string, any>,
    context: SAKContext
  ): TaskEither<AgentError, SAKOperationResult<T>> {
    return pipe(
      this.adapter.getToolRegistry().get(toolName) 
        ? right(this.adapter.getToolRegistry().get(toolName)!)
        : left(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`)),
      TE.fromEither,
      TE.chain(tool => this.executeTool<T>(tool, params, context))
    );
  }

  executeWithValidation<T>(
    toolName: string,
    params: Record<string, any>,
    context: SAKContext
  ): TaskEither<AgentError, SAKOperationResult<T>> {
    return pipe(
      this.validateParameters(toolName, params),
      TE.fromEither,
      TE.chain(() => this.execute<T>(toolName, params, context))
    );
  }

  executeBatch<T>(
    operations: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context: SAKContext
  ): TaskEither<AgentError, Array<SAKOperationResult<T>>> {
    return pipe(
      operations.map(op => this.execute<T>(op.toolName, op.params, context)),
      TE.sequenceArray
    );
  }

  private executeTool<T>(
    tool: SAKTool,
    params: Record<string, any>,
    context: SAKContext
  ): TaskEither<AgentError, SAKOperationResult<T>> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Check rate limit
          const rateLimitCheck = this.adapter.checkRateLimit(tool.name);
          if (rateLimitCheck._tag === 'Left') {
            throw rateLimitCheck.left;
          }
          
          // Execute tool
          const result = await tool.execute(params);
          
          return {
            success: true,
            data: result,
            metadata: {
              timestamp: Date.now(),
              toolName: tool.name,
              contextId: context.sessionId
            }
          } as SAKOperationResult<T>;
        },
        error => this.adapter.getErrorBridge().mapSAKError(error)
      )
    );
  }

  private validateParameters(toolName: string, params: Record<string, any>): Either<AgentError, void> {
    const tool = this.adapter.getToolRegistry().get(toolName);
    if (!tool) {
      return left(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
    }
    
    // Basic parameter validation
    for (const [key, type] of Object.entries(tool.parameters)) {
      if (params[key] === undefined) {
        return left(this.adapter.createError('MISSING_PARAMETER', `Required parameter ${key} is missing`));
      }
      
      if (typeof params[key] !== type) {
        return left(this.adapter.createError('INVALID_PARAMETER_TYPE', `Parameter ${key} must be of type ${type}`));
      }
    }
    
    return right(undefined);
  }
}

class ContextBridgeImpl implements ContextBridge {
  constructor(private adapter: SeiAgentKitAdapter) {}

  mapActionContextToSAK(actionContext: ActionContext): Either<AgentError, SAKContext> {
    try {
      const sakContext: SAKContext = {
        userId: actionContext.userId,
        network: this.adapter.getSAKConfig().network,
        permissions: this.adapter.getSAKConfig().defaultPermissions,
        sessionId: `action-${actionContext.agentId}-${Date.now()}`,
        metadata: {
          ...actionContext.metadata,
          agentId: actionContext.agentId,
          parameters: actionContext.parameters
        }
      };
      
      return right(sakContext);
    } catch (error) {
      return left(this.adapter.createError('CONTEXT_MAPPING_FAILED', `Failed to map action context to SAK: ${error}`));
    }
  }

  mapSAKResultToActionResult<T>(sakResult: SAKOperationResult<T>): Either<AgentError, ActionResult> {
    try {
      const actionResult: ActionResult = {
        success: sakResult.success,
        data: sakResult.data,
        message: sakResult.success ? 'SAK operation completed successfully' : sakResult.error?.message || 'SAK operation failed'
      };
      
      return right(actionResult);
    } catch (error) {
      return left(this.adapter.createError('RESULT_MAPPING_FAILED', `Failed to map SAK result to action result: ${error}`));
    }
  }

  enrichContext(context: SAKContext, enrichments: Record<string, any>): SAKContext {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        ...enrichments
      }
    };
  }

  validateContext(context: SAKContext): Either<AgentError, void> {
    if (!context.network) {
      return left(this.adapter.createError('INVALID_CONTEXT', 'Network is required in SAK context'));
    }
    
    if (!context.permissions || context.permissions.length === 0) {
      return left(this.adapter.createError('INVALID_CONTEXT', 'Permissions are required in SAK context'));
    }
    
    return right(undefined);
  }
}

class ErrorBridgeImpl implements ErrorBridge {
  constructor(private adapter: SeiAgentKitAdapter) {}

  mapSAKError(error: any): AgentError {
    return {
      code: error.code || 'SAK_ERROR',
      message: error.message || 'Unknown SAK error',
      details: error.details || error,
      timestamp: new Date(),
      agentId: this.adapter.getConfig().id
    };
  }

  mapAgentError(error: AgentError): any {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    };
  }

  isRecoverableError(error: any): boolean {
    const recoverableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE'
    ];
    
    return recoverableErrors.includes(error.code);
  }

  createRetryStrategy(error: any): Either<AgentError, RetryStrategy> {
    if (!this.isRecoverableError(error)) {
      return left(this.adapter.createError('NON_RECOVERABLE_ERROR', 'Error is not recoverable'));
    }
    
    const strategy: RetryStrategy = {
      maxRetries: this.adapter.getSAKConfig().retryConfig.maxRetries,
      backoffMs: this.adapter.getSAKConfig().retryConfig.backoffMs,
      exponentialBackoff: true,
      retryCondition: (err, attempt) => attempt < this.adapter.getSAKConfig().retryConfig.maxRetries
    };
    
    return right(strategy);
  }
}

export {
  SAKTool,
  SAKOperationResult,
  SAKContext,
  SAKIntegrationConfig,
  ToolRegistrationBridge,
  OperationBridge,
  ContextBridge,
  ErrorBridge,
  RetryStrategy
};