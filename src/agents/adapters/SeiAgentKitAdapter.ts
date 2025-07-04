import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { PublicClient, WalletClient, createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { cosmosjs, getCosmWasmClient, getSigningCosmWasmClient } from '@sei-js/cosmjs';
import { evmUtils, getEthersProvider, getSeiEvmWalletProvider } from '@sei-js/evm';
import { seiprotocol } from '@sei-js/proto';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult, AgentPlugin } from '../base/BaseAgent';
import type { TakaraProtocolWrapper } from '../../protocols/sei/adapters/TakaraProtocolWrapper';
import type { SymphonyProtocolWrapper } from '../../protocols/sei/adapters/SymphonyProtocolWrapper';

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
  seiRpcUrl: string;
  seiEvmRpcUrl: string;
  chainId: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  defaultPermissions: string[];
  walletPrivateKey?: string;
  walletMnemonic?: string;
  apiKeys?: {
    takara?: string;
    symphony?: string;
    dragonswap?: string;
    silo?: string;
  };
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
  protocolConfigs: {
    takara: {
      enabled: boolean;
      contractAddresses: Record<string, string>;
    };
    symphony: {
      enabled: boolean;
      contractAddresses: Record<string, string>;
    };
    dragonswap: {
      enabled: boolean;
      contractAddresses: Record<string, string>;
    };
    silo: {
      enabled: boolean;
      contractAddresses: Record<string, string>;
    };
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
  
  // Sei SDK instances
  private publicClient?: PublicClient;
  private walletClient?: WalletClient;
  private cosmWasmClient?: any;
  private signingCosmWasmClient?: any;
  
  // Protocol adapters
  private takaraAdapter?: TakaraProtocolWrapper;
  private symphonyAdapter?: SymphonyProtocolWrapper;
  private dragonswapAdapter?: any;
  private siloAdapter?: any;

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
    try {
      // Initialize Viem clients for EVM interactions
      this.publicClient = createPublicClient({
        transport: http(this.sakConfig.seiEvmRpcUrl),
      });
      
      if (this.sakConfig.walletPrivateKey) {
        this.walletClient = createWalletClient({
          transport: http(this.sakConfig.seiEvmRpcUrl),
        });
      }
      
      // Initialize CosmWasm clients for Cosmos interactions
      this.cosmWasmClient = await getCosmWasmClient(this.sakConfig.seiRpcUrl);
      
      if (this.sakConfig.walletMnemonic || this.sakConfig.walletPrivateKey) {
        this.signingCosmWasmClient = await getSigningCosmWasmClient(
          this.sakConfig.seiRpcUrl,
          this.sakConfig.walletMnemonic || ''
        );
      }
      
      // Initialize protocol adapters
      await this.initializeProtocolAdapters();
      
      this.emit('sak:connection:initialized', {
        network: this.sakConfig.network,
        chainId: this.sakConfig.chainId,
        protocols: Object.keys(this.sakConfig.protocolConfigs).filter(
          key => this.sakConfig.protocolConfigs[key as keyof typeof this.sakConfig.protocolConfigs].enabled
        )
      });
    } catch (error) {
      throw new Error(`Failed to initialize SAK connection: ${error}`);
    }
  }

  /**
   * Load default SAK tools
   */
  private async loadDefaultSAKTools(): Promise<void> {
    const tools = await this.generateSAKTools();
    
    tools.forEach(tool => {
      this.toolRegistry.set(tool.name, tool);
    });
    
    this.emit('sak:tools:loaded', {
      count: tools.length,
      categories: [...new Set(tools.map(t => t.category))]
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
   * Initialize protocol adapters
   */
  private async initializeProtocolAdapters(): Promise<void> {
    const ethersProvider = this.publicClient ? getEthersProvider(this.publicClient) : undefined;
    const signer = this.walletClient ? undefined : undefined; // TODO: Convert WalletClient to ethers Signer
    
    // Initialize Takara Protocol Adapter
    if (this.sakConfig.protocolConfigs.takara.enabled && ethersProvider) {
      const { TakaraProtocolWrapper } = await import('../../protocols/sei/adapters/TakaraProtocolWrapper');
      this.takaraAdapter = new TakaraProtocolWrapper(ethersProvider, signer);
    }
    
    // Initialize Symphony Protocol Adapter
    if (this.sakConfig.protocolConfigs.symphony.enabled && this.publicClient && this.walletClient) {
      const { SymphonyProtocolWrapper } = await import('../../protocols/sei/adapters/SymphonyProtocolWrapper');
      // Note: This would need proper config and integration setup
      // this.symphonyAdapter = new SymphonyProtocolWrapper(config, integrationConfig, this.publicClient, this.walletClient);
    }
    
    // Initialize DragonSwap Adapter (placeholder)
    if (this.sakConfig.protocolConfigs.dragonswap.enabled) {
      // this.dragonswapAdapter = new DragonSwapAdapter();
    }
    
    // Initialize Silo Adapter (placeholder)
    if (this.sakConfig.protocolConfigs.silo.enabled) {
      // this.siloAdapter = new SiloAdapter();
    }
  }

  /**
   * Generate comprehensive SAK tools
   */
  private async generateSAKTools(): Promise<SAKTool[]> {
    const tools: SAKTool[] = [];
    
    // Token operations
    tools.push(...this.generateTokenTools());
    
    // Takara protocol tools
    if (this.sakConfig.protocolConfigs.takara.enabled && this.takaraAdapter) {
      tools.push(...await this.generateTakaraTools());
    }
    
    // Symphony protocol tools
    if (this.sakConfig.protocolConfigs.symphony.enabled && this.symphonyAdapter) {
      tools.push(...this.generateSymphonyTools());
    }
    
    // DragonSwap tools
    if (this.sakConfig.protocolConfigs.dragonswap.enabled) {
      tools.push(...this.generateDragonSwapTools());
    }
    
    // Silo staking tools
    if (this.sakConfig.protocolConfigs.silo.enabled) {
      tools.push(...this.generateSiloTools());
    }
    
    return tools;
  }

  /**
   * Generate token operation tools
   */
  private generateTokenTools(): SAKTool[] {
    return [
      {
        name: 'get_token_balance',
        description: 'Get token balance for a specific address and token',
        parameters: {
          address: 'string',
          tokenAddress: 'string',
          tokenType: 'string' // 'erc20', 'cw20', 'native'
        },
        execute: async (params) => this.executeGetTokenBalance(params),
        category: 'blockchain',
        permission: 'read',
        rateLimit: { maxCalls: 100, windowMs: 60000 }
      },
      {
        name: 'get_native_balance',
        description: 'Get native SEI balance for an address',
        parameters: {
          address: 'string'
        },
        execute: async (params) => this.executeGetNativeBalance(params),
        category: 'blockchain',
        permission: 'read',
        rateLimit: { maxCalls: 100, windowMs: 60000 }
      },
      {
        name: 'transfer_token',
        description: 'Transfer tokens to another address',
        parameters: {
          to: 'string',
          amount: 'string',
          tokenAddress: 'string',
          tokenType: 'string'
        },
        execute: async (params) => this.executeTransferToken(params),
        category: 'blockchain',
        permission: 'write',
        rateLimit: { maxCalls: 10, windowMs: 60000 }
      },
      {
        name: 'approve_token',
        description: 'Approve token spending for a contract',
        parameters: {
          tokenAddress: 'string',
          spenderAddress: 'string',
          amount: 'string'
        },
        execute: async (params) => this.executeApproveToken(params),
        category: 'blockchain',
        permission: 'write',
        rateLimit: { maxCalls: 20, windowMs: 60000 }
      }
    ];
  }

  /**
   * Generate Takara protocol tools
   */
  private async generateTakaraTools(): Promise<SAKTool[]> {
    return [
      {
        name: 'takara_supply',
        description: 'Supply assets to Takara lending protocol',
        parameters: {
          asset: 'string',
          amount: 'string',
          onBehalfOf: 'string'
        },
        execute: async (params) => this.executeTakaraSupply(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'takara_withdraw',
        description: 'Withdraw assets from Takara lending protocol',
        parameters: {
          asset: 'string',
          amount: 'string' // Can be 'max' for full withdrawal
        },
        execute: async (params) => this.executeTakaraWithdraw(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'takara_borrow',
        description: 'Borrow assets from Takara lending protocol',
        parameters: {
          asset: 'string',
          amount: 'string',
          onBehalfOf: 'string'
        },
        execute: async (params) => this.executeTakaraBorrow(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'takara_repay',
        description: 'Repay borrowed assets to Takara lending protocol',
        parameters: {
          asset: 'string',
          amount: 'string', // Can be 'max' for full repayment
          onBehalfOf: 'string'
        },
        execute: async (params) => this.executeTakaraRepay(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'takara_get_user_data',
        description: 'Get user account data from Takara protocol',
        parameters: {
          userAddress: 'string'
        },
        execute: async (params) => this.executeTakaraGetUserData(params),
        category: 'defi',
        permission: 'read',
        rateLimit: { maxCalls: 50, windowMs: 60000 }
      },
      {
        name: 'takara_get_reserve_data',
        description: 'Get reserve data for an asset from Takara protocol',
        parameters: {
          asset: 'string'
        },
        execute: async (params) => this.executeTakaraGetReserveData(params),
        category: 'defi',
        permission: 'read',
        rateLimit: { maxCalls: 50, windowMs: 60000 }
      },
      {
        name: 'takara_get_health_factor',
        description: 'Get health factor for a user in Takara protocol',
        parameters: {
          userAddress: 'string'
        },
        execute: async (params) => this.executeTakaraGetHealthFactor(params),
        category: 'defi',
        permission: 'read',
        rateLimit: { maxCalls: 50, windowMs: 60000 }
      }
    ];
  }

  /**
   * Generate Symphony protocol tools
   */
  private generateSymphonyTools(): SAKTool[] {
    return [
      {
        name: 'symphony_swap',
        description: 'Execute token swap on Symphony protocol',
        parameters: {
          tokenIn: 'string',
          tokenOut: 'string',
          amountIn: 'string',
          amountOutMin: 'string',
          slippage: 'number'
        },
        execute: async (params) => this.executeSymphonySwap(params),
        category: 'trading',
        permission: 'write',
        rateLimit: { maxCalls: 10, windowMs: 60000 }
      },
      {
        name: 'symphony_get_quote',
        description: 'Get swap quote from Symphony protocol',
        parameters: {
          tokenIn: 'string',
          tokenOut: 'string',
          amountIn: 'string'
        },
        execute: async (params) => this.executeSymphonyGetQuote(params),
        category: 'trading',
        permission: 'read',
        rateLimit: { maxCalls: 100, windowMs: 60000 }
      },
      {
        name: 'symphony_get_routes',
        description: 'Get optimal routes for token swap',
        parameters: {
          tokenIn: 'string',
          tokenOut: 'string',
          amountIn: 'string'
        },
        execute: async (params) => this.executeSymphonyGetRoutes(params),
        category: 'trading',
        permission: 'read',
        rateLimit: { maxCalls: 100, windowMs: 60000 }
      }
    ];
  }

  /**
   * Generate DragonSwap tools
   */
  private generateDragonSwapTools(): SAKTool[] {
    return [
      {
        name: 'dragonswap_add_liquidity',
        description: 'Add liquidity to DragonSwap pool',
        parameters: {
          tokenA: 'string',
          tokenB: 'string',
          amountA: 'string',
          amountB: 'string',
          amountAMin: 'string',
          amountBMin: 'string'
        },
        execute: async (params) => this.executeDragonSwapAddLiquidity(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'dragonswap_remove_liquidity',
        description: 'Remove liquidity from DragonSwap pool',
        parameters: {
          tokenA: 'string',
          tokenB: 'string',
          liquidity: 'string',
          amountAMin: 'string',
          amountBMin: 'string'
        },
        execute: async (params) => this.executeDragonSwapRemoveLiquidity(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'dragonswap_get_pool_info',
        description: 'Get information about a DragonSwap pool',
        parameters: {
          tokenA: 'string',
          tokenB: 'string'
        },
        execute: async (params) => this.executeDragonSwapGetPoolInfo(params),
        category: 'defi',
        permission: 'read',
        rateLimit: { maxCalls: 50, windowMs: 60000 }
      }
    ];
  }

  /**
   * Generate Silo staking tools
   */
  private generateSiloTools(): SAKTool[] {
    return [
      {
        name: 'silo_stake',
        description: 'Stake tokens in Silo protocol',
        parameters: {
          amount: 'string',
          validator: 'string'
        },
        execute: async (params) => this.executeSiloStake(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'silo_unstake',
        description: 'Unstake tokens from Silo protocol',
        parameters: {
          amount: 'string',
          validator: 'string'
        },
        execute: async (params) => this.executeSiloUnstake(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 5, windowMs: 60000 }
      },
      {
        name: 'silo_claim_rewards',
        description: 'Claim staking rewards from Silo protocol',
        parameters: {
          validator: 'string'
        },
        execute: async (params) => this.executeSiloClaimRewards(params),
        category: 'defi',
        permission: 'write',
        rateLimit: { maxCalls: 10, windowMs: 60000 }
      },
      {
        name: 'silo_get_staking_info',
        description: 'Get staking information for a user',
        parameters: {
          userAddress: 'string',
          validator: 'string'
        },
        execute: async (params) => this.executeSiloGetStakingInfo(params),
        category: 'defi',
        permission: 'read',
        rateLimit: { maxCalls: 50, windowMs: 60000 }
      }
    ];
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

  // ============================================================================
  // SAK Tool Implementation Methods
  // ============================================================================

  /**
   * Token operation implementations
   */
  private async executeGetTokenBalance(params: any): Promise<any> {
    const { address, tokenAddress, tokenType } = params;
    
    try {
      if (tokenType === 'native') {
        return this.executeGetNativeBalance({ address });
      } else if (tokenType === 'erc20' && this.publicClient) {
        const balance = await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        });
        return { balance: balance.toString(), tokenAddress, address };
      } else if (tokenType === 'cw20' && this.cosmWasmClient) {
        const result = await this.cosmWasmClient.queryContractSmart(tokenAddress, {
          balance: { address }
        });
        return { balance: result.balance, tokenAddress, address };
      }
      
      throw new Error(`Unsupported token type: ${tokenType}`);
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`);
    }
  }

  private async executeGetNativeBalance(params: any): Promise<any> {
    const { address } = params;
    
    try {
      if (this.publicClient) {
        const balance = await this.publicClient.getBalance({
          address: address as `0x${string}`
        });
        return { balance: balance.toString(), address, token: 'SEI' };
      } else if (this.cosmWasmClient) {
        const balance = await this.cosmWasmClient.getBalance(address, 'usei');
        return { balance: balance.amount, address, token: 'SEI' };
      }
      
      throw new Error('No client available for native balance query');
    } catch (error) {
      throw new Error(`Failed to get native balance: ${error}`);
    }
  }

  private async executeTransferToken(params: any): Promise<any> {
    const { to, amount, tokenAddress, tokenType } = params;
    
    if (!this.walletClient && !this.signingCosmWasmClient) {
      throw new Error('No signing client available for transfers');
    }
    
    try {
      if (tokenType === 'erc20' && this.walletClient) {
        const hash = await this.walletClient.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
          functionName: 'transfer',
          args: [to as `0x${string}`, BigInt(amount)]
        });
        return { txHash: hash, success: true, amount, to, tokenAddress };
      } else if (tokenType === 'cw20' && this.signingCosmWasmClient) {
        const result = await this.signingCosmWasmClient.execute(
          await this.signingCosmWasmClient.senderAddress,
          tokenAddress,
          {
            transfer: {
              recipient: to,
              amount: amount
            }
          },
          'auto'
        );
        return { txHash: result.transactionHash, success: true, amount, to, tokenAddress };
      }
      
      throw new Error(`Unsupported token type for transfer: ${tokenType}`);
    } catch (error) {
      throw new Error(`Failed to transfer token: ${error}`);
    }
  }

  private async executeApproveToken(params: any): Promise<any> {
    const { tokenAddress, spenderAddress, amount } = params;
    
    if (!this.walletClient) {
      throw new Error('No EVM wallet client available for token approval');
    }
    
    try {
      const hash = await this.walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, BigInt(amount)]
      });
      
      return { txHash: hash, success: true, amount, spenderAddress, tokenAddress };
    } catch (error) {
      throw new Error(`Failed to approve token: ${error}`);
    }
  }

  /**
   * Takara protocol implementations
   */
  private async executeTakaraSupply(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const result = await this.takaraAdapter.supply({
      asset: params.asset,
      amount: BigInt(params.amount),
      onBehalfOf: params.onBehalfOf
    });
    
    if (result._tag === 'Left') {
      throw new Error(`Takara supply failed: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraWithdraw(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const amount = params.amount === 'max' ? 'max' as const : BigInt(params.amount);
    const result = await this.takaraAdapter.withdraw({
      asset: params.asset,
      amount,
      to: params.to
    });
    
    if (result._tag === 'Left') {
      throw new Error(`Takara withdraw failed: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraBorrow(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const result = await this.takaraAdapter.borrow({
      asset: params.asset,
      amount: BigInt(params.amount),
      interestRateMode: 'variable' as const,
      onBehalfOf: params.onBehalfOf
    });
    
    if (result._tag === 'Left') {
      throw new Error(`Takara borrow failed: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraRepay(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const amount = params.amount === 'max' ? 'max' as const : BigInt(params.amount);
    const result = await this.takaraAdapter.repay({
      asset: params.asset,
      amount,
      interestRateMode: 'variable' as const,
      onBehalfOf: params.onBehalfOf
    });
    
    if (result._tag === 'Left') {
      throw new Error(`Takara repay failed: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraGetUserData(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const result = await this.takaraAdapter.getUserAccountData(params.userAddress);
    
    if (result._tag === 'Left') {
      throw new Error(`Failed to get Takara user data: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraGetReserveData(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const result = await this.takaraAdapter.getReserveData(params.asset);
    
    if (result._tag === 'Left') {
      throw new Error(`Failed to get Takara reserve data: ${result.left.message}`);
    }
    
    return result.right;
  }

  private async executeTakaraGetHealthFactor(params: any): Promise<any> {
    if (!this.takaraAdapter) {
      throw new Error('Takara adapter not initialized');
    }
    
    const result = await this.takaraAdapter.getHealthFactor(params.userAddress);
    
    if (result._tag === 'Left') {
      throw new Error(`Failed to get Takara health factor: ${result.left.message}`);
    }
    
    return result.right;
  }

  /**
   * Symphony protocol implementations
   */
  private async executeSymphonySwap(params: any): Promise<any> {
    if (!this.symphonyAdapter) {
      throw new Error('Symphony adapter not initialized');
    }
    
    // Note: This is a placeholder implementation
    // The actual Symphony adapter would need to be properly configured
    throw new Error('Symphony swap implementation not yet available');
  }

  private async executeSymphonyGetQuote(params: any): Promise<any> {
    if (!this.symphonyAdapter) {
      throw new Error('Symphony adapter not initialized');
    }
    
    // Note: This is a placeholder implementation
    throw new Error('Symphony quote implementation not yet available');
  }

  private async executeSymphonyGetRoutes(params: any): Promise<any> {
    if (!this.symphonyAdapter) {
      throw new Error('Symphony adapter not initialized');
    }
    
    // Note: This is a placeholder implementation
    throw new Error('Symphony routes implementation not yet available');
  }

  /**
   * DragonSwap implementations (placeholders)
   */
  private async executeDragonSwapAddLiquidity(params: any): Promise<any> {
    // Placeholder for DragonSwap liquidity addition
    throw new Error('DragonSwap add liquidity implementation not yet available');
  }

  private async executeDragonSwapRemoveLiquidity(params: any): Promise<any> {
    // Placeholder for DragonSwap liquidity removal
    throw new Error('DragonSwap remove liquidity implementation not yet available');
  }

  private async executeDragonSwapGetPoolInfo(params: any): Promise<any> {
    // Placeholder for DragonSwap pool info
    throw new Error('DragonSwap pool info implementation not yet available');
  }

  /**
   * Silo staking implementations (placeholders)
   */
  private async executeSiloStake(params: any): Promise<any> {
    // Placeholder for Silo staking
    throw new Error('Silo stake implementation not yet available');
  }

  private async executeSiloUnstake(params: any): Promise<any> {
    // Placeholder for Silo unstaking
    throw new Error('Silo unstake implementation not yet available');
  }

  private async executeSiloClaimRewards(params: any): Promise<any> {
    // Placeholder for Silo reward claiming
    throw new Error('Silo claim rewards implementation not yet available');
  }

  private async executeSiloGetStakingInfo(params: any): Promise<any> {
    // Placeholder for Silo staking info
    throw new Error('Silo staking info implementation not yet available');
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

// ============================================================================
// Factory Functions and Utilities
// ============================================================================

/**
 * Factory function to create a properly configured SeiAgentKitAdapter
 */
export const createSeiAgentKitAdapter = (
  agentConfig: AgentConfig,
  sakConfig: SAKIntegrationConfig
): SeiAgentKitAdapter => {
  return new SeiAgentKitAdapter(agentConfig, sakConfig);
};

/**
 * Default SAK configuration for different networks
 */
export const DEFAULT_SAK_CONFIGS: Record<string, Partial<SAKIntegrationConfig>> = {
  mainnet: {
    seiRpcUrl: 'https://rpc.sei.io',
    seiEvmRpcUrl: 'https://evm-rpc.sei.io',
    chainId: 'pacific-1',
    network: 'mainnet',
    defaultPermissions: ['read', 'write'],
    protocolConfigs: {
      takara: {
        enabled: true,
        contractAddresses: {
          comptroller: '0x0000000000000000000000000000000000000000', // Replace with actual
          priceOracle: '0x0000000000000000000000000000000000000000'
        }
      },
      symphony: {
        enabled: true,
        contractAddresses: {
          router: '0x0000000000000000000000000000000000000000',
          quoter: '0x0000000000000000000000000000000000000000'
        }
      },
      dragonswap: {
        enabled: true,
        contractAddresses: {
          factory: '0x0000000000000000000000000000000000000000',
          router: '0x0000000000000000000000000000000000000000'
        }
      },
      silo: {
        enabled: true,
        contractAddresses: {
          staking: '0x0000000000000000000000000000000000000000'
        }
      }
    },
    rateLimitConfig: {
      defaultMaxCalls: 100,
      defaultWindowMs: 60000
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 30000,
      maxSize: 1000
    },
    retryConfig: {
      maxRetries: 3,
      backoffMs: 1000
    }
  },
  testnet: {
    seiRpcUrl: 'https://rpc-testnet.sei.io',
    seiEvmRpcUrl: 'https://evm-rpc-testnet.sei.io',
    chainId: 'atlantic-2',
    network: 'testnet',
    defaultPermissions: ['read', 'write'],
    protocolConfigs: {
      takara: {
        enabled: true,
        contractAddresses: {
          comptroller: '0x0000000000000000000000000000000000000000',
          priceOracle: '0x0000000000000000000000000000000000000000'
        }
      },
      symphony: {
        enabled: true,
        contractAddresses: {
          router: '0x0000000000000000000000000000000000000000',
          quoter: '0x0000000000000000000000000000000000000000'
        }
      },
      dragonswap: {
        enabled: true,
        contractAddresses: {
          factory: '0x0000000000000000000000000000000000000000',
          router: '0x0000000000000000000000000000000000000000'
        }
      },
      silo: {
        enabled: true,
        contractAddresses: {
          staking: '0x0000000000000000000000000000000000000000'
        }
      }
    },
    rateLimitConfig: {
      defaultMaxCalls: 50,
      defaultWindowMs: 60000
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 15000,
      maxSize: 500
    },
    retryConfig: {
      maxRetries: 2,
      backoffMs: 500
    }
  }
};

/**
 * Utility function to merge configurations
 */
export const mergeSAKConfig = (
  baseConfig: Partial<SAKIntegrationConfig>,
  userConfig: Partial<SAKIntegrationConfig>
): SAKIntegrationConfig => {
  return {
    ...baseConfig,
    ...userConfig,
    protocolConfigs: {
      ...baseConfig.protocolConfigs,
      ...userConfig.protocolConfigs
    },
    rateLimitConfig: {
      ...baseConfig.rateLimitConfig,
      ...userConfig.rateLimitConfig
    },
    cacheConfig: {
      ...baseConfig.cacheConfig,
      ...userConfig.cacheConfig
    },
    retryConfig: {
      ...baseConfig.retryConfig,
      ...userConfig.retryConfig
    }
  } as SAKIntegrationConfig;
};

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