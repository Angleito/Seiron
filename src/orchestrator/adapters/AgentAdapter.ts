/**
 * Agent Adapter for Orchestrator Integration
 * 
 * Bridges the gap between the orchestrator's agent protocol and
 * the existing agent implementations (LendingAgent, LiquidityAgent, etc.)
 */

import { pipe } from '../../types';
import { EitherM, AsyncUtils } from '../../types/utils';
import type { Either, TaskEither } from '../../types';
import type {
  Agent,
  AgentMessage,
  TaskRequest,
  TaskResponse,
  TaskResult,
  TaskStatus,
  AgentMessageType
} from '../types';
import { BaseAgent } from '../../agents/base/BaseAgent';
import { LendingAgent } from '../../agents/lending/LendingAgent';
import { CLPAgent } from '../../agents/liquidity/CLPAgent';
import { MarketAgent } from '../../agents/market/MarketAgent';

/**
 * Adapter to connect BaseAgent implementations to the orchestrator
 */
export class AgentAdapter {
  private agent: BaseAgent;
  private orchestratorAgent: Agent;
  private messageHandlers: Map<AgentMessageType, (message: AgentMessage) => Promise<Either<string, any>>>;

  constructor(agent: BaseAgent, orchestratorAgent: Agent) {
    this.agent = agent;
    this.orchestratorAgent = orchestratorAgent;
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  /**
   * Setup message handlers for different message types
   */
  private setupMessageHandlers(): void {
    // Handle task requests
    this.messageHandlers.set('task_request', async (message: AgentMessage) => {
      const taskRequest = message as TaskRequest;
      return await this.handleTaskRequest(taskRequest);
    });

    // Handle health checks
    this.messageHandlers.set('health_check', async (message: AgentMessage) => {
      return await this.handleHealthCheck(message);
    });

    // Handle status updates
    this.messageHandlers.set('status_update', async (message: AgentMessage) => {
      return await this.handleStatusUpdate(message);
    });
  }

  /**
   * Process incoming messages from the orchestrator
   */
  public async processMessage(message: AgentMessage): Promise<Either<string, AgentMessage>> {
    const handler = this.messageHandlers.get(message.type);
    
    if (!handler) {
      return EitherM.left(`Unsupported message type: ${message.type}`);
    }

    const result = await handler(message);
    
    return pipe(
      result,
      EitherM.map((responsePayload) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.getResponseType(message.type),
        senderId: this.orchestratorAgent.id,
        receiverId: message.senderId,
        payload: responsePayload,
        timestamp: Date.now(),
        correlationId: message.id
      } as AgentMessage))
    );
  }

  /**
   * Handle task request from orchestrator
   */
  private async handleTaskRequest(request: TaskRequest): Promise<Either<string, TaskResult>> {
    const { task, context } = request.payload;

    try {
      // Map orchestrator task to agent action
      const actionContext = {
        agentId: this.agent.getConfig().id,
        userId: context.walletAddress,
        parameters: task.parameters,
        state: this.agent.getState(),
        metadata: {
          taskId: task.id,
          intentId: task.intentId,
          priority: task.priority
        }
      };

      // Execute action on the agent
      const actionResult = await this.agent.executeAction(task.action, actionContext)();

      if (actionResult._tag === 'Left') {
        return EitherM.left(actionResult.left.message);
      }

      const result = actionResult.right;

      // Convert action result to task result
      const taskResult: TaskResult = {
        taskId: task.id,
        status: result.success ? 'completed' : 'failed',
        result: result.data,
        error: result.success ? undefined : {
          code: 'ACTION_FAILED',
          message: result.message || 'Action execution failed',
          recoverable: true
        },
        executionTime: Date.now() - task.createdAt,
        metadata: {
          agentId: this.agent.getConfig().id,
          actionMetrics: result.metrics
        }
      };

      return EitherM.right(taskResult);
    } catch (error) {
      return EitherM.left(`Task execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle health check request
   */
  private async handleHealthCheck(message: AgentMessage): Promise<Either<string, any>> {
    const state = this.agent.getState();
    const metrics = this.agent.getMetrics();

    return EitherM.right({
      agentId: this.orchestratorAgent.id,
      status: state.status,
      metrics: metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Handle status update request
   */
  private async handleStatusUpdate(message: AgentMessage): Promise<Either<string, any>> {
    // Update orchestrator agent status based on BaseAgent state
    const state = this.agent.getState();
    
    return EitherM.right({
      agentId: this.orchestratorAgent.id,
      status: this.mapAgentStatus(state.status),
      lastUpdate: state.lastUpdate,
      context: state.context
    });
  }

  /**
   * Get response type for a given message type
   */
  private getResponseType(messageType: AgentMessageType): AgentMessageType {
    const responseMap: Record<AgentMessageType, AgentMessageType> = {
      'task_request': 'task_response',
      'health_check': 'status_update',
      'status_update': 'status_update',
      'error_report': 'status_update',
      'capability_update': 'status_update'
    };
    return responseMap[messageType] || 'status_update';
  }

  /**
   * Map BaseAgent status to orchestrator agent status
   */
  private mapAgentStatus(baseStatus: string): string {
    const statusMap: Record<string, string> = {
      'active': 'idle',
      'paused': 'maintenance',
      'error': 'error',
      'terminated': 'offline',
      'idle': 'idle'
    };
    return statusMap[baseStatus] || 'idle';
  }

  /**
   * Start the agent adapter
   */
  public async start(): Promise<Either<string, void>> {
    const startResult = await this.agent.start()();
    
    if (startResult._tag === 'Left') {
      return EitherM.left(startResult.left.message);
    }

    return EitherM.right(undefined);
  }

  /**
   * Stop the agent adapter
   */
  public async stop(): Promise<Either<string, void>> {
    const stopResult = await this.agent.stop()();
    
    if (stopResult._tag === 'Left') {
      return EitherM.left(stopResult.left.message);
    }

    return EitherM.right(undefined);
  }

  /**
   * Get the orchestrator agent configuration
   */
  public getOrchestratorAgent(): Agent {
    return this.orchestratorAgent;
  }

  /**
   * Get the base agent instance
   */
  public getBaseAgent(): BaseAgent {
    return this.agent;
  }
}

/**
 * Factory function to create agent adapters for different agent types
 */
export function createAgentAdapter(
  agentType: 'lending' | 'liquidity' | 'market',
  orchestratorAgent: Agent,
  config: any
): AgentAdapter {
  let baseAgent: BaseAgent;

  switch (agentType) {
    case 'lending':
      baseAgent = new LendingAgent({
        ...config,
        id: orchestratorAgent.id,
        name: orchestratorAgent.name,
        version: orchestratorAgent.version,
        description: `Lending agent for ${config.protocol || 'multiple protocols'}`,
        capabilities: orchestratorAgent.capabilities.map(cap => cap.action)
      });
      break;

    case 'liquidity':
      baseAgent = new CLPAgent({
        ...config,
        id: orchestratorAgent.id,
        name: orchestratorAgent.name,
        version: orchestratorAgent.version,
        description: `Liquidity agent for ${config.protocol || 'multiple protocols'}`,
        capabilities: orchestratorAgent.capabilities.map(cap => cap.action)
      });
      break;

    case 'market':
      baseAgent = new MarketAgent({
        ...config,
        id: orchestratorAgent.id,
        name: orchestratorAgent.name,
        version: orchestratorAgent.version,
        description: `Market analysis agent`,
        capabilities: orchestratorAgent.capabilities.map(cap => cap.action)
      });
      break;

    default:
      throw new Error(`Unsupported agent type: ${agentType}`);
  }

  return new AgentAdapter(baseAgent, orchestratorAgent);
}