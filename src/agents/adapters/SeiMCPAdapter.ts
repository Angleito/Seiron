import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult, AgentPlugin } from '../base/BaseAgent';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * SeiMCPAdapter - MCP Protocol Integration for Sei Network
 * 
 * This adapter implements the Model Context Protocol (MCP) for real-time blockchain
 * state management and smart contract interactions on the Sei Network.
 * Features Dragon Ball Z themed responses with Saiyan power level analogies.
 */

// ============================================================================
// MCP Protocol Types
// ============================================================================

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  endpoint: string;
  port: number;
  secure: boolean;
  apiKey?: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  connectionTimeout: number;
  heartbeatInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * MCP Message Types
 */
export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'event';
  method: string;
  params?: any;
  result?: any;
  error?: MCPError;
  timestamp: number;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, MCPParameterSchema>;
  returns: MCPParameterSchema;
  category: 'blockchain' | 'defi' | 'wallet' | 'contract' | 'query';
  dragonBallTheme?: string; // Dragon Ball Z themed description
  powerLevel?: number; // Complexity/gas cost indicator
  requirements?: string[];
  examples?: MCPToolExample[];
}

export interface MCPParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  format?: string;
  pattern?: string;
  enum?: any[];
  properties?: Record<string, MCPParameterSchema>;
  items?: MCPParameterSchema;
}

export interface MCPToolExample {
  name: string;
  description: string;
  params: Record<string, any>;
  expectedResult: any;
  dragonBallAnalogy?: string;
}

/**
 * Blockchain State Types
 */
export interface BlockchainState {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  gasPrice: string;
  networkStatus: 'healthy' | 'congested' | 'offline';
  validators: ValidatorInfo[];
  totalSupply: string;
  inflation: number;
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  votingPower: number;
  commission: number;
  status: 'active' | 'inactive' | 'jailed';
}

/**
 * Wallet and Balance Types
 */
export interface WalletBalance {
  address: string;
  balances: TokenBalance[];
  totalValueUSD: number;
  lastUpdated: number;
}

export interface TokenBalance {
  denom: string;
  amount: string;
  decimals: number;
  symbol: string;
  name: string;
  valueUSD: number;
  logoUri?: string;
}

/**
 * Transaction Types
 */
export interface TransactionRequest {
  from: string;
  to: string;
  amount: string;
  denom: string;
  memo?: string;
  gasLimit?: number;
  gasPrice?: string;
  timeoutHeight?: number;
}

export interface TransactionResponse {
  txHash: string;
  height: number;
  code: number;
  rawLog: string;
  gasUsed: number;
  gasWanted: number;
  timestamp: number;
  events: TransactionEvent[];
}

export interface TransactionEvent {
  type: string;
  attributes: { key: string; value: string }[];
}

/**
 * Smart Contract Types
 */
export interface ContractInteraction {
  contractAddress: string;
  method: string;
  args: Record<string, any>;
  sender: string;
  funds?: { denom: string; amount: string }[];
  gasLimit?: number;
}

export interface ContractQuery {
  contractAddress: string;
  query: Record<string, any>;
}

export interface ContractState {
  address: string;
  codeId: number;
  admin?: string;
  label: string;
  creator: string;
  ibcPortId?: string;
}

// ============================================================================
// MCP Context and Result Types
// ============================================================================

export interface MCPContext {
  userId?: string;
  walletAddress?: string;
  chainId: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  permissions: string[];
  sessionId: string;
  blockNumber?: number;
  gasPreference: 'low' | 'medium' | 'high';
  dragonBallMode?: boolean; // Enable Dragon Ball Z themed responses
  powerLevel?: number; // User's current "power level" based on portfolio value
  metadata?: Record<string, any>;
}

export interface MCPResult<T = any> {
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
    executionTime?: number;
    dragonBallMessage?: string; // Themed response message
  };
}

// ============================================================================
// MCP Connection Manager
// ============================================================================

class MCPConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: MCPServerConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageId: number = 0;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to MCP server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = this.config.secure ? 'wss' : 'ws';
      const url = `${protocol}://${this.config.endpoint}:${this.config.port}`;
      
      this.ws = new WebSocket(url, {
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : undefined
      });

      const connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected');
        this.attemptReconnection();
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        if (!this.isConnected) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Disconnect from MCP server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.stopHeartbeat();
    }
  }

  /**
   * Send message to MCP server
   */
  public sendMessage(message: MCPMessage): Promise<any> {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('Not connected to MCP server'));
    }

    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const fullMessage = { ...message, id: messageId };

      // Set up timeout for response
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      this.ws!.send(JSON.stringify(fullMessage));
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message: MCPMessage = JSON.parse(data);
      
      if (message.type === 'response' && this.pendingRequests.has(message.id)) {
        const pending = this.pendingRequests.get(message.id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      } else if (message.type === 'event') {
        this.emit('event', message);
      } else if (message.type === 'notification') {
        this.emit('notification', message);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts < this.config.retryAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(() => {
          // Retry will be handled by the next attemptReconnection call
        });
      }, this.config.retryDelay * this.reconnectAttempts);
    } else {
      this.emit('reconnectFailed');
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `mcp-${Date.now()}-${++this.messageId}`;
  }

  /**
   * Check if connected
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

// ============================================================================
// Dragon Ball Z Themed Response Generator
// ============================================================================

class DragonBallThemeManager {
  private static readonly POWER_LEVELS = {
    low: { min: 0, max: 1000, tier: 'Earthling' },
    medium: { min: 1000, max: 10000, tier: 'Elite Warrior' },
    high: { min: 10000, max: 100000, tier: 'Super Saiyan' },
    legendary: { min: 100000, max: 1000000, tier: 'Legendary Super Saiyan' },
    ultra: { min: 1000000, max: Infinity, tier: 'Ultra Instinct' }
  };

  private static readonly THEMED_RESPONSES = {
    balance: {
      low: "Your wallet's power level is over 9000! Well, maybe not quite, but you're building your strength!",
      medium: "Your portfolio is showing the strength of a true warrior! Keep training!",
      high: "Incredible! Your holdings rival that of a Super Saiyan! The markets bow before your power!",
      legendary: "LEGENDARY! Your portfolio has achieved Super Saiyan status! Even Vegeta would be impressed!",
      ultra: "ULTRA INSTINCT ACTIVATED! Your portfolio transcends mortal understanding!"
    },
    transaction: {
      success: "Transaction successful! Your ki energy has been successfully transferred across the blockchain!",
      pending: "Your transaction is gathering energy like a Spirit Bomb... Please wait for confirmation!",
      failed: "Transaction failed! It seems the blockchain's power level was too high. Try again with more gas!"
    },
    contract: {
      success: "Contract interaction complete! You've successfully channeled your energy into the smart contract!",
      failed: "Contract interaction failed! The contract's defense was too strong. Check your parameters!"
    }
  };

  public static generateThemedResponse(operation: string, success: boolean, powerLevel: number, data?: any): string {
    const tier = this.getPowerLevelTier(powerLevel);
    
    switch (operation) {
      case 'balance':
        return this.THEMED_RESPONSES.balance[tier as keyof typeof this.THEMED_RESPONSES.balance];
      case 'transaction':
        return success ? this.THEMED_RESPONSES.transaction.success : this.THEMED_RESPONSES.transaction.failed;
      case 'contract':
        return success ? this.THEMED_RESPONSES.contract.success : this.THEMED_RESPONSES.contract.failed;
      default:
        return success ? 
          `Operation successful! Your power level continues to grow!` : 
          `Operation failed! Train harder and try again!`;
    }
  }

  private static getPowerLevelTier(powerLevel: number): string {
    for (const [tier, range] of Object.entries(this.POWER_LEVELS)) {
      if (powerLevel >= range.min && powerLevel < range.max) {
        return tier;
      }
    }
    return 'legendary';
  }

  public static calculatePowerLevel(portfolioValue: number): number {
    // Convert portfolio value to "power level" (simplified)
    return Math.floor(portfolioValue * 100);
  }
}

// ============================================================================
// Core SeiMCPAdapter Implementation
// ============================================================================

export class SeiMCPAdapter extends BaseAgent {
  private readonly mcpConfig: MCPServerConfig;
  private readonly connectionManager: MCPConnectionManager;
  private readonly availableTools: Map<string, MCPTool> = new Map();
  private readonly dragonBallTheme: DragonBallThemeManager;
  private readonly cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(config: AgentConfig, mcpConfig: MCPServerConfig) {
    super(config);
    this.mcpConfig = mcpConfig;
    this.connectionManager = new MCPConnectionManager(mcpConfig);
    this.dragonBallTheme = new DragonBallThemeManager();
    
    this.setupConnectionEventHandlers();
    this.registerMCPActions();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Connect to MCP server and initialize tools
   */
  public async connectToMCP(): Promise<void> {
    await this.connectionManager.connect();
    await this.loadAvailableTools();
  }

  /**
   * Disconnect from MCP server
   */
  public disconnectFromMCP(): void {
    this.connectionManager.disconnect();
  }

  /**
   * Get real-time blockchain state
   */
  public getBlockchainState(): TaskEither<AgentError, BlockchainState> {
    return this.executeMCPTool<BlockchainState>('get_blockchain_state', {});
  }

  /**
   * Get wallet balance with real-time updates
   */
  public getWalletBalance(address: string): TaskEither<AgentError, WalletBalance> {
    return this.executeMCPTool<WalletBalance>('get_wallet_balance', { address });
  }

  /**
   * Get token balances for multiple tokens
   */
  public getTokenBalances(address: string, tokens: string[]): TaskEither<AgentError, TokenBalance[]> {
    return this.executeMCPTool<TokenBalance[]>('get_token_balances', { address, tokens });
  }

  /**
   * Send transaction with real-time monitoring
   */
  public sendTransaction(request: TransactionRequest): TaskEither<AgentError, TransactionResponse> {
    return this.executeMCPTool<TransactionResponse>('send_transaction', request);
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(address: string, limit: number = 50): TaskEither<AgentError, TransactionResponse[]> {
    return this.executeMCPTool<TransactionResponse[]>('get_transaction_history', { address, limit });
  }

  /**
   * Get transaction status
   */
  public getTransactionStatus(txHash: string): TaskEither<AgentError, TransactionResponse> {
    return this.executeMCPTool<TransactionResponse>('get_transaction_status', { txHash });
  }

  /**
   * Query smart contract state
   */
  public queryContract(query: ContractQuery): TaskEither<AgentError, any> {
    return this.executeMCPTool<any>('query_contract', query);
  }

  /**
   * Execute smart contract method
   */
  public executeContract(interaction: ContractInteraction): TaskEither<AgentError, TransactionResponse> {
    return this.executeMCPTool<TransactionResponse>('execute_contract', interaction);
  }

  /**
   * Get contract state information
   */
  public getContractState(address: string): TaskEither<AgentError, ContractState> {
    return this.executeMCPTool<ContractState>('get_contract_state', { address });
  }

  /**
   * Get token metadata
   */
  public getTokenMetadata(denom: string): TaskEither<AgentError, any> {
    return this.executeMCPTool<any>('get_token_metadata', { denom });
  }

  /**
   * Subscribe to real-time events
   */
  public subscribeToEvents(eventTypes: string[], filters?: Record<string, any>): TaskEither<AgentError, void> {
    return this.executeMCPTool<void>('subscribe_events', { eventTypes, filters });
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribeFromEvents(eventTypes: string[]): TaskEither<AgentError, void> {
    return this.executeMCPTool<void>('unsubscribe_events', { eventTypes });
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Execute MCP tool with validation and error handling
   */
  private executeMCPTool<T>(toolName: string, params: Record<string, any>, context?: Partial<MCPContext>): TaskEither<AgentError, T> {
    return pipe(
      this.validateToolExists(toolName),
      TE.fromEither,
      TE.chain(() => this.createMCPContext(context)),
      TE.chain(mcpContext => this.executeToolWithContext<T>(toolName, params, mcpContext))
    );
  }

  /**
   * Validate that tool exists
   */
  private validateToolExists(toolName: string): Either<AgentError, MCPTool> {
    const tool = this.availableTools.get(toolName);
    if (!tool) {
      return left(this.createError('TOOL_NOT_FOUND', `MCP tool '${toolName}' not found`));
    }
    return right(tool);
  }

  /**
   * Create MCP context
   */
  private createMCPContext(contextOverride?: Partial<MCPContext>): TaskEither<AgentError, MCPContext> {
    return TE.right({
      chainId: this.mcpConfig.network === 'mainnet' ? 'sei-1' : 'sei-devnet-1',
      network: this.mcpConfig.network,
      permissions: ['read', 'write'],
      sessionId: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gasPreference: 'medium',
      dragonBallMode: true,
      powerLevel: 9000, // Default power level
      ...contextOverride
    });
  }

  /**
   * Execute tool with context
   */
  private executeToolWithContext<T>(toolName: string, params: Record<string, any>, context: MCPContext): TaskEither<AgentError, T> {
    const cacheKey = this.getCacheKey(toolName, params);
    
    // Check cache first for read operations
    if (this.isReadOperation(toolName)) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return TE.right(cached);
      }
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const message: MCPMessage = {
            id: '',
            type: 'request',
            method: toolName,
            params: { ...params, context },
            timestamp: Date.now()
          };

          const result = await this.connectionManager.sendMessage(message);
          
          // Cache result if it's a read operation
          if (this.isReadOperation(toolName)) {
            this.setInCache(cacheKey, result, 60000); // 1 minute cache
          }

          return result;
        },
        error => this.createError('MCP_EXECUTION_FAILED', `Failed to execute MCP tool: ${error}`)
      ),
      TE.map(result => this.addDragonBallTheming(toolName, result, context))
    );
  }

  /**
   * Add Dragon Ball Z theming to results
   */
  private addDragonBallTheming<T>(toolName: string, result: T, context: MCPContext): T {
    if (!context.dragonBallMode) {
      return result;
    }

    const mcpResult = result as any;
    if (mcpResult && typeof mcpResult === 'object' && mcpResult.metadata) {
      const powerLevel = context.powerLevel || 9000;
      const themedMessage = DragonBallThemeManager.generateThemedResponse(
        toolName,
        mcpResult.success !== false,
        powerLevel,
        mcpResult.data
      );
      
      mcpResult.metadata.dragonBallMessage = themedMessage;
    }

    return result;
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionEventHandlers(): void {
    this.connectionManager.on('connected', () => {
      this.emit('mcp:connected');
    });

    this.connectionManager.on('disconnected', () => {
      this.emit('mcp:disconnected');
    });

    this.connectionManager.on('error', (error) => {
      this.emit('mcp:error', error);
    });

    this.connectionManager.on('event', (event) => {
      this.emit('mcp:event', event);
    });
  }

  /**
   * Load available tools from MCP server
   */
  private async loadAvailableTools(): Promise<void> {
    try {
      const message: MCPMessage = {
        id: '',
        type: 'request',
        method: 'list_tools',
        params: {},
        timestamp: Date.now()
      };

      const tools = await this.connectionManager.sendMessage(message);
      
      if (Array.isArray(tools)) {
        tools.forEach((tool: MCPTool) => {
          this.availableTools.set(tool.name, tool);
        });
      }
    } catch (error) {
      throw new Error(`Failed to load MCP tools: ${error}`);
    }
  }

  /**
   * Register MCP-specific actions
   */
  private registerMCPActions(): void {
    const actions = [
      {
        id: 'get_blockchain_state',
        name: 'Get Blockchain State',
        description: 'Get current blockchain state with Saiyan power readings',
        handler: this.handleGetBlockchainState.bind(this),
        validation: []
      },
      {
        id: 'get_wallet_balance',
        name: 'Get Wallet Balance',
        description: 'Check your wallet power level (balance)',
        handler: this.handleGetWalletBalance.bind(this),
        validation: [
          { field: 'address', required: true, type: 'string' as const }
        ]
      },
      {
        id: 'send_transaction',
        name: 'Send Transaction',
        description: 'Channel your ki energy into a transaction',
        handler: this.handleSendTransaction.bind(this),
        validation: [
          { field: 'from', required: true, type: 'string' as const },
          { field: 'to', required: true, type: 'string' as const },
          { field: 'amount', required: true, type: 'string' as const },
          { field: 'denom', required: true, type: 'string' as const }
        ]
      },
      {
        id: 'query_contract',
        name: 'Query Smart Contract',
        description: 'Probe the smart contract with your scouter',
        handler: this.handleQueryContract.bind(this),
        validation: [
          { field: 'contractAddress', required: true, type: 'string' as const },
          { field: 'query', required: true, type: 'object' as const }
        ]
      },
      {
        id: 'execute_contract',
        name: 'Execute Smart Contract',
        description: 'Unleash your power on the smart contract',
        handler: this.handleExecuteContract.bind(this),
        validation: [
          { field: 'contractAddress', required: true, type: 'string' as const },
          { field: 'method', required: true, type: 'string' as const },
          { field: 'args', required: true, type: 'object' as const },
          { field: 'sender', required: true, type: 'string' as const }
        ]
      },
      {
        id: 'get_transaction_history',
        name: 'Get Transaction History',
        description: 'Review your battle history on the blockchain',
        handler: this.handleGetTransactionHistory.bind(this),
        validation: [
          { field: 'address', required: true, type: 'string' as const },
          { field: 'limit', required: false, type: 'number' as const }
        ]
      },
      {
        id: 'subscribe_events',
        name: 'Subscribe to Events',
        description: 'Tune your scouter to detect blockchain events',
        handler: this.handleSubscribeEvents.bind(this),
        validation: [
          { field: 'eventTypes', required: true, type: 'array' as const },
          { field: 'filters', required: false, type: 'object' as const }
        ]
      }
    ];

    actions.forEach(action => {
      this.registerAction(action);
    });
  }

  /**
   * Action handlers
   */
  private handleGetBlockchainState(context: ActionContext): TaskEither<AgentError, ActionResult> {
    return pipe(
      this.getBlockchainState(),
      TE.map(state => ({
        success: true,
        data: state,
        message: `Blockchain state retrieved! Network power level: ${state.networkStatus.toUpperCase()}`
      }))
    );
  }

  private handleGetWalletBalance(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { address } = context.parameters;
    
    return pipe(
      this.getWalletBalance(address),
      TE.map(balance => {
        const powerLevel = DragonBallThemeManager.calculatePowerLevel(balance.totalValueUSD);
        return {
          success: true,
          data: { ...balance, powerLevel },
          message: DragonBallThemeManager.generateThemedResponse('balance', true, powerLevel)
        };
      })
    );
  }

  private handleSendTransaction(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { from, to, amount, denom, memo, gasLimit, gasPrice } = context.parameters;
    
    const request: TransactionRequest = {
      from,
      to,
      amount,
      denom,
      memo,
      gasLimit,
      gasPrice
    };

    return pipe(
      this.sendTransaction(request),
      TE.map(response => ({
        success: response.code === 0,
        data: response,
        message: DragonBallThemeManager.generateThemedResponse('transaction', response.code === 0, 9000)
      }))
    );
  }

  private handleQueryContract(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { contractAddress, query } = context.parameters;
    
    return pipe(
      this.queryContract({ contractAddress, query }),
      TE.map(result => ({
        success: true,
        data: result,
        message: `Smart contract queried successfully! Your scouter detected valuable information.`
      }))
    );
  }

  private handleExecuteContract(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { contractAddress, method, args, sender, funds, gasLimit } = context.parameters;
    
    const interaction: ContractInteraction = {
      contractAddress,
      method,
      args,
      sender,
      funds,
      gasLimit
    };

    return pipe(
      this.executeContract(interaction),
      TE.map(response => ({
        success: response.code === 0,
        data: response,
        message: DragonBallThemeManager.generateThemedResponse('contract', response.code === 0, 9000)
      }))
    );
  }

  private handleGetTransactionHistory(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { address, limit = 50 } = context.parameters;
    
    return pipe(
      this.getTransactionHistory(address, limit),
      TE.map(history => ({
        success: true,
        data: history,
        message: `Transaction history retrieved! ${history.length} battles discovered in the blockchain archives.`
      }))
    );
  }

  private handleSubscribeEvents(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { eventTypes, filters } = context.parameters;
    
    return pipe(
      this.subscribeToEvents(eventTypes, filters),
      TE.map(() => ({
        success: true,
        data: { eventTypes, filters },
        message: `Scouter activated! Now monitoring ${eventTypes.length} event types for energy signatures.`
      }))
    );
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if operation is read-only
   */
  private isReadOperation(toolName: string): boolean {
    const readOperations = [
      'get_blockchain_state',
      'get_wallet_balance',
      'get_token_balances',
      'get_transaction_history',
      'get_transaction_status',
      'query_contract',
      'get_contract_state',
      'get_token_metadata'
    ];
    return readOperations.includes(toolName);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(toolName: string, params: Record<string, any>): string {
    return `mcp:${toolName}:${JSON.stringify(params)}`;
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
  private setInCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  // ============================================================================
  // BaseAgent Implementation
  // ============================================================================

  protected initialize(): TaskEither<AgentError, void> {
    return TE.tryCatch(
      async () => {
        await this.connectToMCP();
        this.emit('mcp:initialized');
      },
      error => this.createError('MCP_INIT_FAILED', `Failed to initialize MCP adapter: ${error}`)
    );
  }

  protected cleanup(): TaskEither<AgentError, void> {
    return TE.tryCatch(
      async () => {
        this.disconnectFromMCP();
        this.cache.clear();
        this.availableTools.clear();
        this.emit('mcp:cleanup');
      },
      error => this.createError('MCP_CLEANUP_FAILED', `Failed to cleanup MCP adapter: ${error}`)
    );
  }

  /**
   * Get MCP connection status
   */
  public isConnected(): boolean {
    return this.connectionManager.isConnectedToServer();
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): MCPTool[] {
    return Array.from(this.availableTools.values());
  }

  /**
   * Get MCP configuration
   */
  public getMCPConfig(): MCPServerConfig {
    return { ...this.mcpConfig };
  }
}

// ============================================================================
// Export Types and Classes
// ============================================================================

// Types and interfaces are exported via the type declarations above
// Classes are exported via their class declarations