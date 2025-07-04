/**
 * @fileoverview Core orchestrator implementation
 * Handles intent analysis, agent selection, and task delegation using fp-ts patterns
 */

import { pipe } from '../types/index.js';
import { EitherM, Maybe, AsyncUtils } from '../types/utils.js';
import type { 
  Either, 
  Option,
  ReadonlyRecord 
} from '../types/index.js';
import type {
  UserIntent,
  UserIntentType,
  AnalyzedIntent,
  SelectedAgent,
  Task,
  TaskResult,
  Agent,
  AgentType,
  IntentAnalysisResult,
  AgentSelectionResult,
  TaskExecutionResult,
  OrchestratorConfig,
  OrchestratorState,
  Session,
  OrchestratorEvent
} from './types.js';
import { AgentRegistry, type AgentRegistryConfig } from './registry.js';
import { MessageRouter, type MessageRouterConfig } from './router.js';
import { SeiAgentKitAdapter, type SAKIntegrationConfig } from '../agents/adapters/SeiAgentKitAdapter.js';
import { HiveIntelligenceAdapter, type HiveIntelligenceConfig } from '../agents/adapters/HiveIntelligenceAdapter.js';
import { SeiMCPAdapter, type MCPServerConfig } from '../agents/adapters/SeiMCPAdapter.js';

/**
 * Extended orchestrator configuration with adapter configs
 */
export interface ExtendedOrchestratorConfig extends OrchestratorConfig {
  adapters: {
    seiAgentKit?: {
      enabled: boolean;
      config: SAKIntegrationConfig;
    };
    hiveIntelligence?: {
      enabled: boolean;
      config: HiveIntelligenceConfig;
    };
    seiMCP?: {
      enabled: boolean;
      config: MCPServerConfig;
    };
  };
}

/**
 * Core orchestrator implementation
 */
export class Orchestrator {
  private agentRegistry: AgentRegistry;
  private messageRouter: MessageRouter;
  private config: ExtendedOrchestratorConfig;
  private state: OrchestratorState;
  private eventHandlers: Map<string, Array<(event: OrchestratorEvent) => void>> = new Map();
  
  // Adapter instances
  private seiAgentKitAdapter?: SeiAgentKitAdapter;
  private hiveIntelligenceAdapter?: HiveIntelligenceAdapter;
  private seiMCPAdapter?: SeiMCPAdapter;
  private adapterCapabilities: Map<string, ReadonlyArray<string>> = new Map();

  constructor(
    config: ExtendedOrchestratorConfig,
    registryConfig: AgentRegistryConfig,
    routerConfig: MessageRouterConfig
  ) {
    this.config = config;
    this.agentRegistry = new AgentRegistry(registryConfig);
    this.messageRouter = new MessageRouter(routerConfig);
    this.state = {
      agents: {},
      tasks: {},
      sessions: {},
      messageQueue: []
    };
    
    // Initialize adapters if enabled
    this.initializeAdapters();
  }

  /**
   * Process user intent end-to-end
   */
  public processIntent = async (
    intent: UserIntent,
    sessionId: string
  ): Promise<Either<string, TaskResult>> =>
    pipe(
      await this.analyzeIntent(intent),
      EitherM.flatMap(async (analyzedIntent) =>
        pipe(
          await this.selectAgent(analyzedIntent),
          EitherM.flatMap(async (selectedAgent) =>
            pipe(
              this.createTask(analyzedIntent, selectedAgent),
              EitherM.flatMap(async (task) =>
                this.executeTask(task, selectedAgent.agent)
              )
            )
          )
        )
      )
    );

  /**
   * Analyze user intent with enhanced adapter capabilities
   */
  public analyzeIntent = async (intent: UserIntent): Promise<IntentAnalysisResult> => {
    try {
      // Emit intent received event
      this.emitEvent({
        type: 'intent_received',
        intent,
        timestamp: Date.now()
      });

      // Enhanced intent analysis with adapter capabilities
      const analysis = pipe(
        this.validateIntent(intent),
        EitherM.flatMap(this.extractIntentActions),
        EitherM.flatMap(async (actions) => {
          // Enrich actions with adapter capabilities
          const enrichedActions = await this.enrichActionsWithAdapterCapabilities(actions, intent);
          return pipe(
            enrichedActions,
            EitherM.map(enriched => this.buildAnalyzedIntent(intent, enriched))
          );
        })
      );

      return analysis;
    } catch (error) {
      return EitherM.left({
        type: 'parse_error',
        message: error instanceof Error ? error.message : 'Unknown error during intent analysis',
        details: { originalIntent: intent }
      });
    }
  };

  /**
   * Select best agent for analyzed intent
   */
  public selectAgent = async (
    analyzedIntent: AnalyzedIntent
  ): Promise<AgentSelectionResult> => {
    const agentType = this.mapIntentToAgentType(analyzedIntent.intent.type);
    const primaryAction = analyzedIntent.requiredActions[0];

    if (!primaryAction) {
      return EitherM.left({
        type: 'capability_mismatch',
        message: 'No actions identified for intent',
        suggestedAlternatives: []
      });
    }

    const bestAgent = this.agentRegistry.findBestAgent(
      agentType,
      primaryAction,
      analyzedIntent.intent.parameters
    );

    return pipe(
      bestAgent,
      Maybe.fold(
        () => EitherM.left({
          type: 'no_available_agents',
          message: `No available agents of type ${agentType} for action ${primaryAction}`,
          suggestedAlternatives: this.getSuggestedAlternatives(agentType, primaryAction)
        }),
        (agent) => {
          const capabilities = this.agentRegistry.getAgent(agent.id)
            ._tag === 'Some' 
              ? this.agentRegistry.getAgent(agent.id).value.capabilities 
              : [];
          
          return EitherM.right({
            agent,
            matchScore: this.calculateMatchScore(agent, analyzedIntent),
            availableCapabilities: capabilities,
            estimatedExecutionTime: this.estimateExecutionTime(capabilities, primaryAction)
          });
        }
      )
    );
  };

  /**
   * Create task from analyzed intent and selected agent
   */
  public createTask = (
    analyzedIntent: AnalyzedIntent,
    selectedAgent: SelectedAgent
  ): Either<string, Task> => {
    try {
      const task: Task = {
        id: this.generateTaskId(),
        intentId: `intent_${Date.now()}`,
        agentId: selectedAgent.agent.id,
        action: analyzedIntent.requiredActions[0],
        parameters: analyzedIntent.intent.parameters,
        status: 'pending',
        priority: this.mapIntentPriorityToTaskPriority(analyzedIntent.intent.priority),
        createdAt: Date.now(),
        dependencies: this.extractTaskDependencies(analyzedIntent)
      };

      // Update state
      this.state = {
        ...this.state,
        tasks: { ...this.state.tasks, [task.id]: task }
      };

      return EitherM.right(task);
    } catch (error) {
      return EitherM.left(
        `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  /**
   * Execute task with selected agent
   */
  public executeTask = async (
    task: Task,
    agent: Agent
  ): Promise<TaskExecutionResult> => {
    try {
      // Emit task started event
      this.emitEvent({
        type: 'task_started',
        task,
        agent,
        timestamp: Date.now()
      });

      // Update task status
      this.updateTaskStatus(task.id, 'running');

      // Send task to agent via message router
      const result = await this.messageRouter.sendTaskRequest(task, agent);

      return pipe(
        result,
        EitherM.fold(
          (error) =>  {
            this.updateTaskStatus(task.id, 'failed');
            return EitherM.left({
              type: 'agent_error',
              message: error,
              taskId: task.id,
              agentId: agent.id,
              recoverable: this.isRecoverableError(error)
            });
          },
          (taskResult) => {
            this.updateTaskStatus(task.id, taskResult.status);
            
            // Emit task completed event
            this.emitEvent({
              type: 'task_completed',
              task,
              result: taskResult,
              timestamp: Date.now()
            });

            return EitherM.right(taskResult);
          }
        )
      );
    } catch (error) {
      this.updateTaskStatus(task.id, 'failed');
      return EitherM.left({
        type: 'timeout',
        message: error instanceof Error ? error.message : 'Unknown execution error',
        taskId: task.id,
        agentId: agent.id,
        recoverable: false
      });
    }
  };

  /**
   * Process multiple intents in parallel
   */
  public processIntentsParallel = async (
    intents: ReadonlyArray<UserIntent>,
    sessionId: string
  ): Promise<ReadonlyArray<Either<string, TaskResult>>> => {
    return AsyncUtils.mapWithConcurrency(
      intents,
      (intent) => this.processIntent(intent, sessionId),
      this.config.maxConcurrentTasks
    );
  };

  /**
   * Register agent with orchestrator
   */
  public registerAgent = (agent: Agent): Either<string, void> =>
    this.agentRegistry.registerAgent(agent);

  /**
   * Get orchestrator state
   */
  public getState = (): OrchestratorState => this.state;

  /**
   * Add event listener
   */
  public addEventListener = (
    eventType: string,
    handler: (event: OrchestratorEvent) => void
  ): void => {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  };

  /**
   * Start orchestrator services
   */
  public start = (): void => {
    this.agentRegistry.startHealthMonitoring();
  };

  /**
   * Stop orchestrator services
   */
  public stop = (): void => {
    this.agentRegistry.stopHealthMonitoring();
    this.stopAdapters();
  };

  /**
   * Get available adapter capabilities
   */
  public getAdapterCapabilities = (): ReadonlyRecord<string, ReadonlyArray<string>> => {
    const capabilities: Record<string, ReadonlyArray<string>> = {};
    for (const [adapter, caps] of this.adapterCapabilities.entries()) {
      capabilities[adapter] = caps;
    }
    return capabilities;
  };

  /**
   * Execute adapter operation
   */
  public executeAdapterOperation = async (
    adapterName: string,
    operation: string,
    parameters: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, unknown>> => {
    try {
      switch (adapterName) {
        case 'seiAgentKit':
          return this.seiAgentKitAdapter 
            ? await this.executeSAKOperation(operation, parameters, context)
            : EitherM.left('SeiAgentKit adapter not available');
            
        case 'hiveIntelligence':
          return this.hiveIntelligenceAdapter
            ? await this.executeHiveOperation(operation, parameters, context)
            : EitherM.left('HiveIntelligence adapter not available');
            
        case 'seiMCP':
          return this.seiMCPAdapter
            ? await this.executeMCPOperation(operation, parameters, context)
            : EitherM.left('SeiMCP adapter not available');
            
        default:
          return EitherM.left(`Unknown adapter: ${adapterName}`);
      }
    } catch (error) {
      return EitherM.left(`Adapter operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Get adapter health status
   */
  public getAdapterHealth = (): ReadonlyRecord<string, 'healthy' | 'unhealthy' | 'disabled'> => {
    return {
      seiAgentKit: this.seiAgentKitAdapter ? 'healthy' : 'disabled',
      hiveIntelligence: this.hiveIntelligenceAdapter ? 'healthy' : 'disabled',
      seiMCP: this.seiMCPAdapter ? 'healthy' : 'disabled'
    };
  };

  // Private helper methods

  private validateIntent = (intent: UserIntent): Either<any, UserIntent> => {
    if (!intent.type || !intent.action) {
      return EitherM.left({
        type: 'validation_error',
        message: 'Intent must have type and action',
        details: { intent }
      });
    }
    return EitherM.right(intent);
  };

  private extractIntentActions = (intent: UserIntent): Either<any, ReadonlyArray<string>> => {
    // Map intent types to required actions
    const actionMap: ReadonlyRecord<UserIntentType, ReadonlyArray<string>> = {
      lending: ['supply', 'borrow', 'withdraw', 'repay'],
      liquidity: ['add_liquidity', 'remove_liquidity', 'swap'],
      portfolio: ['show_positions', 'rebalance', 'analyze'],
      trading: ['buy', 'sell', 'limit_order'],
      analysis: ['analyze_market', 'generate_report'],
      info: ['get_rates', 'get_positions', 'get_balance'],
      risk: ['assess_risk', 'set_limits', 'check_health']
    };

    const possibleActions = actionMap[intent.type] || [];
    const matchingActions = possibleActions.filter(action => 
      intent.action.toLowerCase().includes(action.toLowerCase()) ||
      action.toLowerCase().includes(intent.action.toLowerCase())
    );

    if (matchingActions.length === 0) {
      return EitherM.left({
        type: 'unsupported_intent',
        message: `Action '${intent.action}' not supported for intent type '${intent.type}'`,
        details: { supportedActions: possibleActions }
      });
    }

    return EitherM.right(matchingActions);
  };

  private buildAnalyzedIntent = (
    intent: UserIntent,
    actions: ReadonlyArray<string>
  ): AnalyzedIntent => ({
    intent,
    confidence: this.calculateIntentConfidence(intent, actions),
    requiredActions: actions,
    estimatedComplexity: this.estimateComplexity(actions),
    risks: this.identifyRisks(intent, actions)
  });

  private mapIntentToAgentType = (intentType: UserIntentType): AgentType => {
    const mapping: ReadonlyRecord<UserIntentType, AgentType> = {
      lending: 'lending_agent',
      liquidity: 'liquidity_agent',
      portfolio: 'portfolio_agent',
      trading: 'portfolio_agent',
      analysis: 'analysis_agent',
      info: 'portfolio_agent',
      risk: 'risk_agent'
    };
    return mapping[intentType];
  };

  private calculateMatchScore = (agent: Agent, analyzedIntent: AnalyzedIntent): number => {
    // Simple scoring based on capability match
    const matchingCapabilities = agent.capabilities.filter(cap =>
      analyzedIntent.requiredActions.includes(cap.action)
    );
    return matchingCapabilities.length / analyzedIntent.requiredActions.length;
  };

  private estimateExecutionTime = (
    capabilities: ReadonlyArray<any>,
    action: string
  ): number => {
    const capability = capabilities.find(cap => cap.action === action);
    return capability?.estimatedExecutionTime || 5000; // Default 5 seconds
  };

  private calculateIntentConfidence = (
    intent: UserIntent,
    actions: ReadonlyArray<string>
  ): number => {
    // Higher confidence for exact action matches
    const exactMatch = actions.some(action => 
      intent.action.toLowerCase() === action.toLowerCase()
    );
    return exactMatch ? 0.9 : 0.7;
  };

  private estimateComplexity = (actions: ReadonlyArray<string>): 'low' | 'medium' | 'high' => {
    if (actions.length === 1) return 'low';
    if (actions.length <= 3) return 'medium';
    return 'high';
  };

  private identifyRisks = (
    intent: UserIntent,
    actions: ReadonlyArray<string>
  ): ReadonlyArray<string> => {
    const risks: string[] = [];
    
    if (actions.includes('borrow')) {
      risks.push('liquidation_risk');
    }
    if (actions.includes('swap') || actions.includes('add_liquidity')) {
      risks.push('slippage_risk');
    }
    if (intent.parameters.amount && Number(intent.parameters.amount) > 10000) {
      risks.push('high_value_transaction');
    }
    
    return risks;
  };

  private getSuggestedAlternatives = (
    agentType: AgentType,
    action: string
  ): ReadonlyArray<string> => {
    // Return similar agents or actions
    const alternatives = this.agentRegistry.getAllAgents()
      .filter(agent => agent.type === agentType)
      .map(agent => agent.id);
    
    return alternatives.slice(0, 3); // Top 3 alternatives
  };

  private mapIntentPriorityToTaskPriority = (priority: string): number => {
    const mapping: ReadonlyRecord<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4
    };
    return mapping[priority] || 2;
  };

  private extractTaskDependencies = (analyzedIntent: AnalyzedIntent): ReadonlyArray<string> => {
    // For now, return empty dependencies
    // In a real implementation, this would analyze the intent for dependencies
    return [];
  };

  private updateTaskStatus = (taskId: string, status: any): void => {
    const task = this.state.tasks[taskId];
    if (task) {
      this.state = {
        ...this.state,
        tasks: {
          ...this.state.tasks,
          [taskId]: { ...task, status }
        }
      };
    }
  };

  private isRecoverableError = (error: string): boolean => {
    const recoverableErrors = ['timeout', 'network_error', 'temporary_unavailable'];
    return recoverableErrors.some(recoverable => 
      error.toLowerCase().includes(recoverable)
    );
  };

  private emitEvent = (event: OrchestratorEvent): void => {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  };

  private generateTaskId = (): string =>
    `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ============================================================================
  // Adapter Integration Methods
  // ============================================================================

  /**
   * Initialize enabled adapters
   */
  private initializeAdapters = (): void => {
    try {
      // Initialize SeiAgentKit adapter
      if (this.config.adapters.seiAgentKit?.enabled && this.config.adapters.seiAgentKit.config) {
        this.seiAgentKitAdapter = new SeiAgentKitAdapter(
          {
            id: 'sak-adapter',
            name: 'Sei Agent Kit Adapter',
            version: '1.0.0',
            description: 'Sei blockchain operations adapter',
            capabilities: ['blockchain', 'defi', 'trading'],
            settings: {}
          },
          this.config.adapters.seiAgentKit.config
        );
        this.adapterCapabilities.set('seiAgentKit', [
          'get_token_balance', 'transfer_token', 'approve_token',
          'takara_supply', 'takara_withdraw', 'takara_borrow', 'takara_repay',
          'symphony_swap', 'dragonswap_add_liquidity', 'silo_stake'
        ]);
      }

      // Initialize HiveIntelligence adapter
      if (this.config.adapters.hiveIntelligence?.enabled && this.config.adapters.hiveIntelligence.config) {
        this.hiveIntelligenceAdapter = new HiveIntelligenceAdapter(
          {
            id: 'hive-adapter',
            name: 'Hive Intelligence Adapter',
            version: '1.0.0',
            description: 'AI-powered blockchain analytics adapter',
            capabilities: ['analytics', 'search', 'insights'],
            settings: {}
          },
          this.config.adapters.hiveIntelligence.config
        );
        this.adapterCapabilities.set('hiveIntelligence', [
          'search', 'get_analytics', 'get_portfolio_analysis',
          'get_market_insights', 'get_credit_analysis'
        ]);
      }

      // Initialize SeiMCP adapter
      if (this.config.adapters.seiMCP?.enabled && this.config.adapters.seiMCP.config) {
        this.seiMCPAdapter = new SeiMCPAdapter(
          {
            id: 'mcp-adapter',
            name: 'Sei MCP Adapter',
            version: '1.0.0',
            description: 'MCP protocol real-time data adapter',
            capabilities: ['realtime', 'blockchain', 'contract'],
            settings: {}
          },
          this.config.adapters.seiMCP.config
        );
        this.adapterCapabilities.set('seiMCP', [
          'get_blockchain_state', 'query_contract', 'execute_contract',
          'get_wallet_balance', 'send_transaction', 'subscribe_events'
        ]);
      }

      this.emitEvent({
        type: 'adapters_initialized',
        timestamp: Date.now(),
        data: { adapters: Array.from(this.adapterCapabilities.keys()) }
      });
    } catch (error) {
      console.error('Failed to initialize adapters:', error);
      this.emitEvent({
        type: 'adapter_error',
        timestamp: Date.now(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  };

  /**
   * Stop all adapters
   */
  private stopAdapters = (): void => {
    try {
      // Stop adapters if they have cleanup methods
      this.seiAgentKitAdapter?.stop?.();
      this.hiveIntelligenceAdapter?.stop?.();
      this.seiMCPAdapter?.stop?.();

      this.emitEvent({
        type: 'adapters_stopped',
        timestamp: Date.now(),
        data: { adapters: Array.from(this.adapterCapabilities.keys()) }
      });
    } catch (error) {
      console.error('Error stopping adapters:', error);
    }
  };

  /**
   * Enrich actions with adapter capabilities
   */
  private enrichActionsWithAdapterCapabilities = async (
    actions: ReadonlyArray<string>,
    intent: UserIntent
  ): Promise<Either<any, ReadonlyArray<string>>> => {
    try {
      const enrichedActions = [...actions];

      // Add blockchain-specific actions from SeiAgentKit
      if (this.seiAgentKitAdapter && this.isBlockchainIntent(intent)) {
        enrichedActions.push(...this.getSAKRelevantActions(intent));
      }

      // Add analytics actions from HiveIntelligence
      if (this.hiveIntelligenceAdapter && this.isAnalyticsIntent(intent)) {
        enrichedActions.push(...this.getHiveRelevantActions(intent));
      }

      // Add real-time actions from SeiMCP
      if (this.seiMCPAdapter && this.isRealTimeIntent(intent)) {
        enrichedActions.push(...this.getMCPRelevantActions(intent));
      }

      return EitherM.right(enrichedActions);
    } catch (error) {
      return EitherM.left({
        type: 'action_enrichment_failed',
        message: `Failed to enrich actions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  /**
   * Execute SeiAgentKit operation
   */
  private executeSAKOperation = async (
    operation: string,
    parameters: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, unknown>> => {
    if (!this.seiAgentKitAdapter) {
      return EitherM.left('SeiAgentKit adapter not initialized');
    }

    try {
      const result = await this.seiAgentKitAdapter.executeSAKTool(
        operation,
        parameters,
        context as any
      )();
      
      return result._tag === 'Right' 
        ? EitherM.right(result.right)
        : EitherM.left(result.left.message);
    } catch (error) {
      return EitherM.left(`SAK operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Execute HiveIntelligence operation
   */
  private executeHiveOperation = async (
    operation: string,
    parameters: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, unknown>> => {
    if (!this.hiveIntelligenceAdapter) {
      return EitherM.left('HiveIntelligence adapter not initialized');
    }

    try {
      let result;
      switch (operation) {
        case 'search':
          result = await this.hiveIntelligenceAdapter.search(
            parameters.query as string,
            parameters.metadata as any
          )();
          break;
        case 'get_analytics':
          result = await this.hiveIntelligenceAdapter.getAnalytics(
            parameters.query as string,
            parameters.metadata as any
          )();
          break;
        default:
          return EitherM.left(`Unknown Hive operation: ${operation}`);
      }
      
      return result._tag === 'Right' 
        ? EitherM.right(result.right)
        : EitherM.left(result.left.message);
    } catch (error) {
      return EitherM.left(`Hive operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Execute SeiMCP operation
   */
  private executeMCPOperation = async (
    operation: string,
    parameters: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, unknown>> => {
    if (!this.seiMCPAdapter) {
      return EitherM.left('SeiMCP adapter not initialized');
    }

    try {
      let result;
      switch (operation) {
        case 'get_blockchain_state':
          result = await this.seiMCPAdapter.getBlockchainState()();
          break;
        case 'query_contract':
          result = await this.seiMCPAdapter.queryContract(
            parameters.contractAddress as string,
            parameters.query as any
          )();
          break;
        default:
          return EitherM.left(`Unknown MCP operation: ${operation}`);
      }
      
      return result._tag === 'Right' 
        ? EitherM.right(result.right)
        : EitherM.left(result.left.message);
    } catch (error) {
      return EitherM.left(`MCP operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Check if intent is blockchain-related
   */
  private isBlockchainIntent = (intent: UserIntent): boolean => {
    const blockchainKeywords = ['swap', 'supply', 'borrow', 'stake', 'token', 'balance', 'transfer'];
    return blockchainKeywords.some(keyword => 
      intent.action.toLowerCase().includes(keyword) ||
      intent.type === 'lending' ||
      intent.type === 'liquidity' ||
      intent.type === 'trading'
    );
  };

  /**
   * Check if intent is analytics-related
   */
  private isAnalyticsIntent = (intent: UserIntent): boolean => {
    const analyticsKeywords = ['analyze', 'insight', 'report', 'trend', 'performance'];
    return analyticsKeywords.some(keyword => 
      intent.action.toLowerCase().includes(keyword) ||
      intent.type === 'analysis'
    );
  };

  /**
   * Check if intent requires real-time data
   */
  private isRealTimeIntent = (intent: UserIntent): boolean => {
    const realTimeKeywords = ['current', 'latest', 'live', 'monitor', 'watch'];
    return realTimeKeywords.some(keyword => 
      intent.action.toLowerCase().includes(keyword) ||
      intent.type === 'info'
    );
  };

  /**
   * Get relevant SAK actions for intent
   */
  private getSAKRelevantActions = (intent: UserIntent): ReadonlyArray<string> => {
    const sakActions: string[] = [];
    
    if (intent.type === 'lending') {
      sakActions.push('takara_supply', 'takara_withdraw', 'takara_borrow', 'takara_repay');
    }
    if (intent.type === 'liquidity') {
      sakActions.push('dragonswap_add_liquidity', 'dragonswap_remove_liquidity');
    }
    if (intent.type === 'trading') {
      sakActions.push('symphony_swap', 'symphony_get_quote');
    }
    if (intent.action.includes('balance')) {
      sakActions.push('get_token_balance', 'get_native_balance');
    }
    if (intent.action.includes('transfer')) {
      sakActions.push('transfer_token', 'approve_token');
    }
    
    return sakActions;
  };

  /**
   * Get relevant Hive actions for intent
   */
  private getHiveRelevantActions = (intent: UserIntent): ReadonlyArray<string> => {
    const hiveActions: string[] = [];
    
    if (intent.type === 'analysis') {
      hiveActions.push('get_analytics', 'get_market_insights');
    }
    if (intent.type === 'portfolio') {
      hiveActions.push('get_portfolio_analysis', 'get_credit_analysis');
    }
    if (intent.action.includes('search')) {
      hiveActions.push('search');
    }
    
    return hiveActions;
  };

  /**
   * Get relevant MCP actions for intent
   */
  private getMCPRelevantActions = (intent: UserIntent): ReadonlyArray<string> => {
    const mcpActions: string[] = [];
    
    if (intent.type === 'info') {
      mcpActions.push('get_blockchain_state', 'get_wallet_balance');
    }
    if (intent.action.includes('contract')) {
      mcpActions.push('query_contract', 'execute_contract');
    }
    if (intent.action.includes('transaction')) {
      mcpActions.push('send_transaction');
    }
    
    return mcpActions;
  };
}

/**
 * Functional orchestrator API
 */

// Pure function for intent analysis
export const analyzeIntent = (intent: UserIntent): IntentAnalysisResult => {
  // Implementation would go here - this is a simplified version
  if (!intent.type || !intent.action) {
    return EitherM.left({
      type: 'validation_error',
      message: 'Intent must have type and action'
    });
  }

  return EitherM.right({
    intent,
    confidence: 0.8,
    requiredActions: [intent.action],
    estimatedComplexity: 'medium',
    risks: []
  });
};

// Pure function for agent selection scoring
export const scoreAgentMatch = (
  agent: Agent,
  intent: AnalyzedIntent
): number => {
  const matchingCapabilities = agent.capabilities.filter(cap =>
    intent.requiredActions.includes(cap.action)
  );
  return matchingCapabilities.length / intent.requiredActions.length;
};

// Compose orchestrator functions
export const orchestrate = pipe(
  analyzeIntent,
  // Would chain other functions here in a real implementation
);