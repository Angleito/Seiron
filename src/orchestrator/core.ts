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

/**
 * Core orchestrator implementation
 */
export class Orchestrator {
  private agentRegistry: AgentRegistry;
  private messageRouter: MessageRouter;
  private config: OrchestratorConfig;
  private state: OrchestratorState;
  private eventHandlers: Map<string, Array<(event: OrchestratorEvent) => void>> = new Map();

  constructor(
    config: OrchestratorConfig,
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
   * Analyze user intent
   */
  public analyzeIntent = async (intent: UserIntent): Promise<IntentAnalysisResult> => {
    try {
      // Emit intent received event
      this.emitEvent({
        type: 'intent_received',
        intent,
        timestamp: Date.now()
      });

      const analysis = pipe(
        this.validateIntent(intent),
        EitherM.flatMap(this.extractIntentActions),
        EitherM.map(actions => this.buildAnalyzedIntent(intent, actions))
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