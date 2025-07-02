import { ChatInterface, ChatMessage } from './chat/ChatInterface';
import { AIDecisionEngine } from './ai/AIDecisionEngine';
import { PortfolioManager } from './portfolio/PortfolioManager';
import { LendingManager } from './lending/LendingManager';
import { LiquidityManager } from './liquidity/LiquidityManager';
import { 
  createOrchestrator,
  Orchestrator,
  IntentUtils,
  AgentUtils,
  AGENT_TYPES,
  INTENT_TYPES,
  COMMON_ACTIONS,
  type UserIntent,
  type UserIntentType,
  type Agent,
  type AgentType,
  type OrchestratorEvent,
  type TaskResult
} from './orchestrator';
import { EitherM } from './types/utils';
import { pipe } from './types';
import { CustomMessageRouter } from './orchestrator/adapters/CustomMessageRouter';
import { AgentAdapter, createAgentAdapter } from './orchestrator/adapters/AgentAdapter';

export interface PortfolioManagerConfig {
  network: 'sei-mainnet' | 'sei-testnet';
  wallet: any; // Wallet interface
  aiModel: 'stable-yield' | 'balanced-defi' | 'yield-maximizer' | 'smart-liquidity';
  language?: string;
  riskTolerance?: number;
  autoExecute?: boolean;
}

export class AIPortfolioManager {
  private chat: ChatInterface;
  private ai: AIDecisionEngine;
  private portfolio: PortfolioManager;
  private lending: LendingManager;
  private liquidity: LiquidityManager;
  private config: PortfolioManagerConfig;
  private isActive: boolean = false;
  private orchestrator: Orchestrator;
  private sessionId: string;

  constructor(config: PortfolioManagerConfig) {
    this.config = config;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize AI engine
    this.ai = new AIDecisionEngine({
      model: config.aiModel,
      language: config.language || 'en',
      riskTolerance: config.riskTolerance || 0.5
    });

    // Initialize managers
    this.lending = new LendingManager({
      wallet: config.wallet,
      autoCompound: true
    });

    this.liquidity = new LiquidityManager({
      wallet: config.wallet,
      autoRebalance: true
    });

    this.portfolio = new PortfolioManager({
      wallets: [config.wallet],
      baseCurrency: 'USD',
      trackGas: true
    });

    // Initialize chat interface
    this.chat = new ChatInterface({
      language: config.language || 'en',
      aiModel: config.aiModel,
      contextWindow: 10,
      wallet: config.wallet
    });

    // Initialize orchestrator with custom configuration
    this.initializeOrchestrator();

    // Setup orchestrator event listeners
    this.setupOrchestratorEvents();

    // Register agents with orchestrator
    this.registerAgents();
  }

  /**
   * Start the chat interface
   */
  async startChat(): Promise<{
    send: (message: string) => Promise<string>;
    history: () => ChatMessage[];
    clear: () => void;
  }> {
    this.isActive = true;
    
    return {
      send: async (message: string) => {
        if (!this.isActive) {
          throw new Error('Portfolio manager is not active');
        }
        // Use orchestrator for intent-based messages
        return await this.processMessageWithOrchestrator(message);
      },
      history: () => this.chat.getConversationHistory(),
      clear: () => this.chat.clearHistory()
    };
  }

  /**
   * Start autonomous portfolio management
   */
  async start(params: {
    initialCapital: number;
    assets?: string[];
    rebalanceThreshold?: number;
    maxGasPrice?: number;
  }): Promise<void> {
    this.isActive = true;
    
    // Generate initial strategy
    const strategy = await this.ai.generateStrategy({
      capital: params.initialCapital,
      goals: ['yield', 'safety'],
      timeHorizon: '30d'
    });

    // Execute initial allocations through orchestrator
    await this.executeAIStrategy(strategy);

    // Start monitoring loop with orchestrator coordination
    this.startMonitoring(params.rebalanceThreshold || 0.05);
  }

  /**
   * Stop portfolio management
   */
  async stop(): Promise<void> {
    this.isActive = false;
  }

  /**
   * Get current portfolio status
   */
  async getStatus(): Promise<{
    portfolio: any;
    performance: any;
    activePositions: number;
  }> {
    const summary = await this.portfolio.getPortfolioSummary();
    const performance = await this.portfolio.calculatePerformance('24h');
    
    return {
      portfolio: summary,
      performance: performance,
      activePositions: 
        summary.lending.positions.length + 
        summary.liquidity.positions.length + 
        summary.staking.positions.length
    };
  }

  /**
   * Execute AI-generated strategy
   */
  private async executeAIStrategy(aiStrategy: any): Promise<void> {
    try {
      // Validate strategy before execution
      if (!this.validateStrategy(aiStrategy)) {
        throw new Error('Invalid strategy format');
      }

      // Execute through orchestrator with fallback
      await this.executeStrategyWithFallback(aiStrategy);
    } catch (error) {
      console.error('AI strategy execution failed:', error);
      // Emit error event for monitoring
      this.emit('strategy:failed', { strategy: aiStrategy, error });
    }
  }

  /**
   * Validate strategy structure
   */
  private validateStrategy(strategy: any): boolean {
    return strategy && 
           Array.isArray(strategy.actions) && 
           strategy.actions.length > 0 &&
           strategy.actions.every((action: any) => 
             action.type && action.params
           );
  }

  /**
   * Execute strategy with fallback mechanisms
   */
  private async executeStrategyWithFallback(strategy: any): Promise<void> {
    try {
      // Primary execution through orchestrator
      await this.executeStrategy(strategy);
    } catch (error) {
      console.warn('Primary execution failed, attempting fallback:', error);
      
      // Fallback: Execute actions sequentially with error recovery
      for (const action of strategy.actions) {
        try {
          await this.executeSingleActionWithRetry(action);
        } catch (actionError) {
          console.error(`Failed to execute action ${action.type}:`, actionError);
          // Continue with other actions instead of failing entirely
        }
      }
    }
  }

  /**
   * Execute single action with retry logic
   */
  private async executeSingleActionWithRetry(action: any, maxRetries = 3): Promise<void> {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const intent = this.actionToIntent(action);
        const result = await this.orchestrator.processIntent(intent, this.sessionId);
        
        if (result._tag === 'Right') {
          return; // Success
        }
        
        lastError = result.left;
      } catch (error) {
        lastError = error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError || new Error('Action execution failed after retries');
  }

  /**
   * Convert action to intent
   */
  private actionToIntent(action: any): UserIntent {
    const { intentType, intentAction } = this.mapActionToIntent(action);
    
    return IntentUtils.createIntent(
      intentType,
      intentAction,
      {
        ...action.params,
        protocol: action.protocol,
        autoExecute: this.config.autoExecute
      },
      {
        sessionId: this.sessionId,
        walletAddress: this.config.wallet.address,
        preferences: {
          riskTolerance: this.mapRiskTolerance(this.config.riskTolerance || 0.5),
          preferredProtocols: action.protocol ? [action.protocol] : [],
          slippageTolerance: 0.01,
          gasPreference: 'medium',
          autoApproval: this.config.autoExecute
        }
      }
    );
  }

  /**
   * Map action to intent type and action
   */
  private mapActionToIntent(action: any): { intentType: UserIntentType; intentAction: string } {
    switch (action.type) {
      case 'lend':
      case 'borrow':
      case 'repay':
      case 'withdraw':
        return { intentType: INTENT_TYPES.LENDING, intentAction: action.type };
      case 'provide_liquidity':
        return { intentType: INTENT_TYPES.LIQUIDITY, intentAction: COMMON_ACTIONS.ADD_LIQUIDITY };
      case 'remove_liquidity':
        return { intentType: INTENT_TYPES.LIQUIDITY, intentAction: COMMON_ACTIONS.REMOVE_LIQUIDITY };
      case 'swap':
        return { intentType: INTENT_TYPES.LIQUIDITY, intentAction: COMMON_ACTIONS.SWAP };
      case 'rebalance':
        return { intentType: INTENT_TYPES.PORTFOLIO, intentAction: COMMON_ACTIONS.REBALANCE };
      default:
        return { intentType: INTENT_TYPES.PORTFOLIO, intentAction: action.type };
    }
  }

  /**
   * Execute a strategy using the orchestrator for multi-agent coordination
   */
  private async executeStrategy(strategy: any): Promise<void> {
    // Convert strategy actions to user intents for orchestrator processing
    const intents: UserIntent[] = strategy.actions.map((action: any) => {
      let intentType: UserIntentType;
      let intentAction: string;

      // Map action types to intent types and actions
      switch (action.type) {
        case 'lend':
        case 'borrow':
        case 'repay':
        case 'withdraw':
          intentType = INTENT_TYPES.LENDING;
          intentAction = action.type;
          break;
        case 'provide_liquidity':
          intentType = INTENT_TYPES.LIQUIDITY;
          intentAction = COMMON_ACTIONS.ADD_LIQUIDITY;
          break;
        case 'remove_liquidity':
          intentType = INTENT_TYPES.LIQUIDITY;
          intentAction = COMMON_ACTIONS.REMOVE_LIQUIDITY;
          break;
        case 'swap':
          intentType = INTENT_TYPES.LIQUIDITY;
          intentAction = COMMON_ACTIONS.SWAP;
          break;
        case 'rebalance':
          intentType = INTENT_TYPES.PORTFOLIO;
          intentAction = COMMON_ACTIONS.REBALANCE;
          break;
        default:
          intentType = INTENT_TYPES.PORTFOLIO;
          intentAction = action.type;
      }

      return IntentUtils.createIntent(
        intentType,
        intentAction,
        {
          ...action.params,
          protocol: action.protocol,
          autoExecute: this.config.autoExecute
        },
        {
          sessionId: this.sessionId,
          walletAddress: this.config.wallet.address,
          preferences: {
            riskTolerance: this.mapRiskTolerance(this.config.riskTolerance || 0.5),
            preferredProtocols: action.protocol ? [action.protocol] : [],
            slippageTolerance: 0.01, // 1%
            gasPreference: 'medium',
            autoApproval: this.config.autoExecute
          }
        }
      );
    });

    // Process intents through orchestrator
    const results = await this.orchestrator.processIntentsParallel(intents, this.sessionId);

    // Handle results
    results.forEach((result, index) => {
      pipe(
        result,
        EitherM.fold(
          (error) => {
            console.error(`Failed to execute action ${strategy.actions[index].type}:`, error);
            this.emit('action:failed', {
              action: strategy.actions[index],
              error: error
            });
          },
          (taskResult) => {
            console.log(`Successfully executed action ${strategy.actions[index].type}`);
            this.emit('action:completed', {
              action: strategy.actions[index],
              result: taskResult
            });
          }
        )
      );
    });
  }

  /**
   * Start monitoring loop
   */
  private async startMonitoring(rebalanceThreshold: number): Promise<void> {
    const checkInterval = 60 * 60 * 1000; // 1 hour
    
    const monitor = async () => {
      if (!this.isActive) return;
      
      try {
        // Check if rebalancing is needed
        const portfolio = await this.portfolio.getPortfolioSummary();
        const strategy = await this.ai.generateStrategy({
          capital: portfolio.totalValue,
          goals: ['yield', 'safety'],
          timeHorizon: '30d'
        });
        
        // Calculate deviation from target allocations
        const deviation = this.calculateDeviation(portfolio, strategy);
        
        if (deviation > rebalanceThreshold) {
          await this.rebalance(strategy);
        }
        
        // Auto-compound lending positions
        for (const position of portfolio.lending.positions) {
          if (position.earned > 10) { // Compound if earned > $10
            await this.lending.compound(position.protocol);
          }
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
      
      // Schedule next check
      if (this.isActive) {
        setTimeout(monitor, checkInterval);
      }
    };
    
    // Start monitoring
    setTimeout(monitor, checkInterval);
  }

  /**
   * Calculate deviation from target allocations
   */
  private calculateDeviation(portfolio: any, strategy: any): number {
    // Simplified deviation calculation
    return 0.03; // Placeholder
  }

  /**
   * Rebalance portfolio
   */
  private async rebalance(strategy: any): Promise<void> {
    // Implement rebalancing logic
    await this.executeStrategy(strategy);
  }

  /**
   * Initialize orchestrator with custom message router
   */
  private initializeOrchestrator(): void {
    // Create custom message router
    const customRouter = new CustomMessageRouter(
      {
        maxConcurrentMessages: 20,
        messageTimeout: 15000,
        retryAttempts: 2,
        enableParallelExecution: true
      },
      {
        lendingManager: this.lending,
        liquidityManager: this.liquidity,
        portfolioManager: this.portfolio
      }
    );

    // Create orchestrator with custom components
    this.orchestrator = new Orchestrator(
      {
        maxConcurrentTasks: 5,
        taskTimeout: 60000,
        agentHealthCheckInterval: 30000,
        messageRetryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffMs: 10000,
          retryableErrors: ['timeout', 'network_error', 'temporary_unavailable']
        },
        loadBalancing: 'capability_based'
      },
      {
        healthCheckInterval: 30000,
        maxConsecutiveFailures: 3,
        responseTimeoutMs: 10000,
        loadBalancingWeights: {}
      },
      customRouter as any // Type casting for compatibility
    );
  }

  /**
   * Setup orchestrator event listeners
   */
  private setupOrchestratorEvents(): void {
    // Listen for task completions
    this.orchestrator.addEventListener('task_completed', (event: OrchestratorEvent) => {
      if (event.type === 'task_completed') {
        const { task, result } = event as any;
        console.log(`Task ${task.id} completed with status: ${result.status}`);
      }
    });

    // Listen for errors
    this.orchestrator.addEventListener('error_occurred', (event: OrchestratorEvent) => {
      if (event.type === 'error_occurred') {
        const { error, context } = event as any;
        console.error(`Orchestrator error: ${error.message}`, context);
      }
    });

    // Listen for agent status changes
    this.orchestrator.addEventListener('agent_status_changed', (event: OrchestratorEvent) => {
      if (event.type === 'agent_status_changed') {
        const { agentId, oldStatus, newStatus } = event as any;
        console.log(`Agent ${agentId} status changed from ${oldStatus} to ${newStatus}`);
      }
    });
  }

  /**
   * Register agents with the orchestrator
   */
  private registerAgents(): void {
    // Register lending agent
    const lendingAgent = this.createLendingAgent();
    this.orchestrator.registerAgent(lendingAgent);

    // Register liquidity agent
    const liquidityAgent = this.createLiquidityAgent();
    this.orchestrator.registerAgent(liquidityAgent);

    // Register portfolio agent
    const portfolioAgent = this.createPortfolioAgent();
    this.orchestrator.registerAgent(portfolioAgent);

    // Start orchestrator services
    this.orchestrator.start();
  }

  /**
   * Create lending agent configuration
   */
  private createLendingAgent(): Agent {
    return AgentUtils.createAgent(
      'lending_agent_001',
      AGENT_TYPES.LENDING,
      'Lending Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.SUPPLY,
          'Supply assets to lending protocol',
          [
            { name: 'asset', type: 'string', required: true, description: 'Asset to supply' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to supply' },
            { name: 'protocol', type: 'string', required: false, description: 'Lending protocol' }
          ],
          ['wallet_access'],
          5000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.BORROW,
          'Borrow assets from lending protocol',
          [
            { name: 'asset', type: 'string', required: true, description: 'Asset to borrow' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to borrow' },
            { name: 'protocol', type: 'string', required: false, description: 'Lending protocol' }
          ],
          ['wallet_access'],
          5000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.WITHDRAW,
          'Withdraw supplied assets',
          [
            { name: 'asset', type: 'string', required: true, description: 'Asset to withdraw' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to withdraw' },
            { name: 'protocol', type: 'string', required: false, description: 'Lending protocol' }
          ],
          ['wallet_access'],
          5000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.REPAY,
          'Repay borrowed assets',
          [
            { name: 'asset', type: 'string', required: true, description: 'Asset to repay' },
            { name: 'amount', type: 'number', required: true, description: 'Amount to repay' },
            { name: 'protocol', type: 'string', required: false, description: 'Lending protocol' }
          ],
          ['wallet_access'],
          5000
        )
      ],
      {
        manager: this.lending,
        supportedProtocols: ['yei-finance', 'koi-finance']
      }
    );
  }

  /**
   * Create liquidity agent configuration
   */
  private createLiquidityAgent(): Agent {
    return AgentUtils.createAgent(
      'liquidity_agent_001',
      AGENT_TYPES.LIQUIDITY,
      'Liquidity Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.ADD_LIQUIDITY,
          'Add liquidity to pool',
          [
            { name: 'tokenA', type: 'string', required: true, description: 'First token' },
            { name: 'tokenB', type: 'string', required: true, description: 'Second token' },
            { name: 'amountA', type: 'number', required: true, description: 'Amount of first token' },
            { name: 'amountB', type: 'number', required: true, description: 'Amount of second token' }
          ],
          ['wallet_access'],
          8000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.REMOVE_LIQUIDITY,
          'Remove liquidity from pool',
          [
            { name: 'poolId', type: 'string', required: true, description: 'Pool identifier' },
            { name: 'lpAmount', type: 'number', required: true, description: 'LP token amount' }
          ],
          ['wallet_access'],
          5000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.SWAP,
          'Swap tokens',
          [
            { name: 'tokenIn', type: 'string', required: true, description: 'Input token' },
            { name: 'tokenOut', type: 'string', required: true, description: 'Output token' },
            { name: 'amountIn', type: 'number', required: true, description: 'Input amount' }
          ],
          ['wallet_access'],
          3000
        )
      ],
      {
        manager: this.liquidity,
        supportedProtocols: ['dragonswap', 'seipex']
      }
    );
  }

  /**
   * Create portfolio agent configuration
   */
  private createPortfolioAgent(): Agent {
    return AgentUtils.createAgent(
      'portfolio_agent_001',
      AGENT_TYPES.PORTFOLIO,
      'Portfolio Agent',
      [
        AgentUtils.createCapability(
          COMMON_ACTIONS.SHOW_POSITIONS,
          'Show all portfolio positions',
          [],
          ['read_access'],
          2000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.REBALANCE,
          'Rebalance portfolio allocations',
          [
            { name: 'targetAllocations', type: 'object', required: true, description: 'Target allocation percentages' }
          ],
          ['wallet_access'],
          10000
        ),
        AgentUtils.createCapability(
          COMMON_ACTIONS.ANALYZE,
          'Analyze portfolio performance',
          [
            { name: 'timeframe', type: 'string', required: false, description: 'Analysis timeframe' }
          ],
          ['read_access'],
          3000
        )
      ],
      {
        manager: this.portfolio,
        aiEngine: this.ai
      }
    );
  }

  /**
   * Process a message through the orchestrator
   */
  async processMessageWithOrchestrator(message: string): Promise<string> {
    // Parse message to intent
    const parsedIntent = this.parseMessageToIntent(message);
    
    if (!parsedIntent) {
      // Fallback to regular chat processing
      return await this.chat.processMessage(message);
    }

    // Process intent through orchestrator
    const result = await this.orchestrator.processIntent(parsedIntent, this.sessionId);

    return pipe(
      result,
      EitherM.fold(
        (error) => `Failed to process request: ${error}`,
        (taskResult) => this.formatTaskResultForUser(taskResult)
      )
    );
  }

  /**
   * Parse user message to intent
   */
  private parseMessageToIntent(message: string): UserIntent | null {
    const lowerMessage = message.toLowerCase();

    // Simple intent parsing - in production, use NLP
    if (lowerMessage.includes('lend') || lowerMessage.includes('supply')) {
      return IntentUtils.createIntent(
        INTENT_TYPES.LENDING,
        COMMON_ACTIONS.SUPPLY,
        this.extractParametersFromMessage(message),
        { sessionId: this.sessionId }
      );
    }

    if (lowerMessage.includes('add liquidity') || lowerMessage.includes('provide liquidity')) {
      return IntentUtils.createIntent(
        INTENT_TYPES.LIQUIDITY,
        COMMON_ACTIONS.ADD_LIQUIDITY,
        this.extractParametersFromMessage(message),
        { sessionId: this.sessionId }
      );
    }

    if (lowerMessage.includes('show') && lowerMessage.includes('position')) {
      return IntentUtils.createIntent(
        INTENT_TYPES.PORTFOLIO,
        COMMON_ACTIONS.SHOW_POSITIONS,
        {},
        { sessionId: this.sessionId }
      );
    }

    return null;
  }

  /**
   * Extract parameters from message (simplified)
   */
  private extractParametersFromMessage(message: string): Record<string, unknown> {
    // This is a simplified implementation
    // In production, use proper NLP/regex parsing
    const params: Record<string, unknown> = {};

    // Extract numbers
    const numbers = message.match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length > 0) {
      params.amount = parseFloat(numbers[0]);
    }

    // Extract token names (simplified)
    const tokens = message.match(/\b(SEI|USDC|USDT|WETH|WBTC)\b/gi);
    if (tokens && tokens.length > 0) {
      params.asset = tokens[0].toUpperCase();
      if (tokens.length > 1) {
        params.tokenA = tokens[0].toUpperCase();
        params.tokenB = tokens[1].toUpperCase();
      }
    }

    return params;
  }

  /**
   * Format task result for user display
   */
  private formatTaskResultForUser(result: TaskResult): string {
    if (result.status === 'completed') {
      return `✅ Action completed successfully!\n${JSON.stringify(result.result, null, 2)}`;
    } else if (result.status === 'failed') {
      return `❌ Action failed: ${result.error?.message || 'Unknown error'}`;
    } else {
      return `⏳ Action status: ${result.status}`;
    }
  }

  /**
   * Map risk tolerance number to enum
   */
  private mapRiskTolerance(tolerance: number): 'conservative' | 'moderate' | 'aggressive' {
    if (tolerance < 0.33) return 'conservative';
    if (tolerance < 0.67) return 'moderate';
    return 'aggressive';
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.orchestrator.stop();
    this.isActive = false;
  }

  /**
   * Event emitter methods (simplified)
   */
  private eventHandlers: Map<string, Array<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}