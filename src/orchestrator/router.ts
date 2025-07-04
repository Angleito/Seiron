/**
 * @fileoverview Message router for orchestrator
 * Handles efficient message routing with functional composition and parallel execution
 */

import { pipe } from '../types/index.js';
import { EitherM, Maybe, AsyncUtils } from '../types/utils.js';
import type { 
  Either, 
  Option,
  ReadonlyRecord 
} from '../types/index.js';
import type {
  AgentMessage,
  AgentMessageType,
  TaskRequest,
  TaskResponse,
  Task,
  TaskResult,
  Agent,
  OrchestratorEvent
} from './types.js';
import { SeiAgentKitAdapter } from '../agents/adapters/SeiAgentKitAdapter.js';
import { HiveIntelligenceAdapter } from '../agents/adapters/HiveIntelligenceAdapter.js';
import { SeiMCPAdapter } from '../agents/adapters/SeiMCPAdapter.js';

/**
 * Message routing configuration
 */
export interface MessageRouterConfig {
  readonly maxConcurrentMessages: number;
  readonly messageTimeout: number;
  readonly retryAttempts: number;
  readonly backoffMultiplier: number;
  readonly enableParallelExecution: boolean;
  readonly adapterRouting: {
    enableAdapterMessages: boolean;
    adapterTimeout: number;
    maxConcurrentAdapterCalls: number;
    prioritizeAdaptersByType: boolean;
  };
}

/**
 * Message routing state
 */
interface MessageRouterState {
  readonly pendingMessages: ReadonlyRecord<string, PendingMessage>;
  readonly messageHandlers: ReadonlyRecord<AgentMessageType, MessageHandler>;
  readonly routingRules: ReadonlyArray<RoutingRule>;
  readonly adapterInstances: ReadonlyRecord<string, AdapterInstance>;
  readonly adapterMessageQueue: ReadonlyArray<AdapterMessage>;
}

/**
 * Adapter message types
 */
interface AdapterMessage {
  id: string;
  adapterType: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP';
  operation: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
  priority: number;
  timestamp: number;
  retryCount: number;
}

interface AdapterInstance {
  type: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP';
  instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter;
  isHealthy: boolean;
  lastUsed: number;
  activeOperations: number;
}

interface PendingMessage {
  readonly message: AgentMessage;
  readonly timestamp: number;
  readonly retryCount: number;
  readonly resolve: (result: Either<string, unknown>) => void;
  readonly reject: (error: Error) => void;
}

type MessageHandler = (message: AgentMessage) => Promise<Either<string, unknown>>;

interface RoutingRule {
  readonly messageType: AgentMessageType;
  readonly condition: (message: AgentMessage) => boolean;
  readonly handler: MessageHandler;
  readonly priority: number;
}

/**
 * Message router implementation
 */
export class MessageRouter {
  private state: MessageRouterState;
  private config: MessageRouterConfig;
  private messageQueue: AgentMessage[] = [];
  private processingMessages = new Set<string>();
  private adapterProcessingQueue = new Set<string>();

  constructor(config: MessageRouterConfig) {
    this.config = config;
    this.state = {
      pendingMessages: {},
      messageHandlers: this.createDefaultHandlers(),
      routingRules: [],
      adapterInstances: {},
      adapterMessageQueue: []
    };
  }

  /**
   * Route message to appropriate handler
   */
  public routeMessage = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Validate message
    const validationResult = this.validateMessage(message);
    if (validationResult._tag === 'Left') {
      return validationResult;
    }

    // Check if we're at concurrent message limit
    if (this.processingMessages.size >= this.config.maxConcurrentMessages) {
      this.messageQueue.push(message);
      return EitherM.left('Message queued - at concurrent limit');
    }

    return this.processMessage(message);
  };

  /**
   * Route multiple messages in parallel
   */
  public routeMessages = async (
    messages: ReadonlyArray<AgentMessage>
  ): Promise<ReadonlyArray<Either<string, unknown>>> => {
    if (!this.config.enableParallelExecution) {
      // Sequential processing
      const results: Either<string, unknown>[] = [];
      for (const message of messages) {
        results.push(await this.routeMessage(message));
      }
      return results;
    }

    // Parallel processing with concurrency limit
    return AsyncUtils.mapWithConcurrency(
      messages,
      (message) => this.routeMessage(message),
      this.config.maxConcurrentMessages
    );
  };

  /**
   * Add custom routing rule
   */
  public addRoutingRule = (rule: RoutingRule): Either<string, void> => {
    if (this.state.routingRules.some(r => 
      r.messageType === rule.messageType && r.priority === rule.priority)) {
      return EitherM.left('Routing rule with same type and priority already exists');
    }

    this.state = {
      ...this.state,
      routingRules: [
        ...this.state.routingRules,
        rule
      ].sort((a, b) => b.priority - a.priority) // Higher priority first
    };

    return EitherM.right(undefined);
  };

  /**
   * Register message handler
   */
  public registerHandler = (
    messageType: AgentMessageType,
    handler: MessageHandler
  ): Either<string, void> => {
    this.state = {
      ...this.state,
      messageHandlers: {
        ...this.state.messageHandlers,
        [messageType]: handler
      }
    };

    return EitherM.right(undefined);
  };

  /**
   * Send task request to agent
   */
  public sendTaskRequest = async (
    task: Task,
    agent: Agent
  ): Promise<Either<string, TaskResult>> => {
    const request: TaskRequest = {
      id: this.generateMessageId(),
      type: 'task_request',
      senderId: 'orchestrator',
      receiverId: agent.id,
      payload: {
        task,
        context: {
          // Add relevant context based on task requirements
        }
      },
      timestamp: Date.now()
    };

    const result = await this.routeMessage(request);
    
    return pipe(
      result,
      EitherM.flatMap((response) => {
        if (this.isTaskResponse(response)) {
          return EitherM.right(response.payload);
        }
        return EitherM.left('Invalid task response format');
      })
    );
  };

  /**
   * Broadcast message to multiple agents
   */
  public broadcastMessage = async (
    message: Omit<AgentMessage, 'id' | 'receiverId'>,
    agentIds: ReadonlyArray<string>
  ): Promise<ReadonlyArray<Either<string, unknown>>> => {
    const messages = agentIds.map(agentId => ({
      ...message,
      id: this.generateMessageId(),
      receiverId: agentId
    }));

    return this.routeMessages(messages);
  };

  /**
   * Get pending message count
   */
  public getPendingMessageCount = (): number => 
    Object.keys(this.state.pendingMessages).length;

  /**
   * Get queue length
   */
  public getQueueLength = (): number => 
    this.messageQueue.length;

  // ============================================================================
  // Adapter Message Routing Methods
  // ============================================================================

  /**
   * Register an adapter instance with the router
   */
  public registerAdapter = (
    id: string,
    type: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP',
    instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter
  ): Either<string, void> => {
    if (this.state.adapterInstances[id]) {
      return EitherM.left(`Adapter ${id} already registered`);
    }

    const adapterInstance: AdapterInstance = {
      type,
      instance,
      isHealthy: true,
      lastUsed: Date.now(),
      activeOperations: 0
    };

    this.state = {
      ...this.state,
      adapterInstances: { ...this.state.adapterInstances, [id]: adapterInstance }
    };

    return EitherM.right(undefined);
  };

  /**
   * Unregister an adapter instance
   */
  public unregisterAdapter = (id: string): Either<string, void> => {
    if (!this.state.adapterInstances[id]) {
      return EitherM.left(`Adapter ${id} not found`);
    }

    const { [id]: removed, ...remainingAdapters } = this.state.adapterInstances;
    this.state = {
      ...this.state,
      adapterInstances: remainingAdapters
    };

    return EitherM.right(undefined);
  };

  /**
   * Route adapter operation with load balancing
   */
  public routeAdapterOperation = async (
    adapterType: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP',
    operation: string,
    parameters: Record<string, any>,
    context?: Record<string, any>,
    priority: number = 1
  ): Promise<Either<string, unknown>> => {
    if (!this.config.adapterRouting.enableAdapterMessages) {
      return EitherM.left('Adapter message routing is disabled');
    }

    // Check if we're at concurrent adapter limit
    if (this.adapterProcessingQueue.size >= this.config.adapterRouting.maxConcurrentAdapterCalls) {
      const adapterMessage: AdapterMessage = {
        id: this.generateMessageId(),
        adapterType,
        operation,
        parameters,
        context,
        priority,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.state = {
        ...this.state,
        adapterMessageQueue: [...this.state.adapterMessageQueue, adapterMessage]
      };

      return EitherM.left('Adapter operation queued - at concurrent limit');
    }

    return this.processAdapterOperation(adapterType, operation, parameters, context, priority);
  };

  /**
   * Route multiple adapter operations in parallel
   */
  public routeAdapterOperationsParallel = async (
    operations: Array<{
      adapterType: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP';
      operation: string;
      parameters: Record<string, any>;
      context?: Record<string, any>;
      priority?: number;
    }>
  ): Promise<ReadonlyArray<Either<string, unknown>>> => {
    if (!this.config.enableParallelExecution) {
      // Sequential processing
      const results: Either<string, unknown>[] = [];
      for (const op of operations) {
        results.push(await this.routeAdapterOperation(
          op.adapterType,
          op.operation,
          op.parameters,
          op.context,
          op.priority || 1
        ));
      }
      return results;
    }

    // Parallel processing with concurrency limit
    return AsyncUtils.mapWithConcurrency(
      operations,
      (op) => this.routeAdapterOperation(
        op.adapterType,
        op.operation,
        op.parameters,
        op.context,
        op.priority || 1
      ),
      this.config.adapterRouting.maxConcurrentAdapterCalls
    );
  };

  /**
   * Process queued adapter operations
   */
  public processAdapterQueue = async (): Promise<void> => {
    while (this.state.adapterMessageQueue.length > 0 && 
           this.adapterProcessingQueue.size < this.config.adapterRouting.maxConcurrentAdapterCalls) {
      
      // Sort by priority and timestamp
      const sortedQueue = [...this.state.adapterMessageQueue].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Earlier timestamp first
      });

      const nextMessage = sortedQueue[0];
      if (nextMessage) {
        // Remove from queue
        this.state = {
          ...this.state,
          adapterMessageQueue: this.state.adapterMessageQueue.filter(msg => msg.id !== nextMessage.id)
        };

        // Process operation
        this.processAdapterOperation(
          nextMessage.adapterType,
          nextMessage.operation,
          nextMessage.parameters,
          nextMessage.context,
          nextMessage.priority
        ).catch(console.error);
      }
    }
  };

  /**
   * Get adapter load balancing information
   */
  public getAdapterLoadInfo = (): ReadonlyRecord<string, {
    instanceCount: number;
    healthyCount: number;
    activeOperations: number;
    queueSize: number;
  }> => {
    const loadInfo: Record<string, {
      instanceCount: number;
      healthyCount: number;
      activeOperations: number;
      queueSize: number;
    }> = {};

    const adapterTypes = ['seiAgentKit', 'hiveIntelligence', 'seiMCP'] as const;
    
    adapterTypes.forEach(type => {
      const instances = Object.values(this.state.adapterInstances).filter(a => a.type === type);
      const healthy = instances.filter(a => a.isHealthy);
      const totalActiveOps = instances.reduce((sum, a) => sum + a.activeOperations, 0);
      const queuedForType = this.state.adapterMessageQueue.filter(msg => msg.adapterType === type);
      
      loadInfo[type] = {
        instanceCount: instances.length,
        healthyCount: healthy.length,
        activeOperations: totalActiveOps,
        queueSize: queuedForType.length
      };
    });

    return loadInfo;
  };

  /**
   * Update adapter health status
   */
  public updateAdapterHealth = (id: string, isHealthy: boolean): Either<string, void> => {
    const adapter = this.state.adapterInstances[id];
    if (!adapter) {
      return EitherM.left(`Adapter ${id} not found`);
    }

    this.state = {
      ...this.state,
      adapterInstances: {
        ...this.state.adapterInstances,
        [id]: { ...adapter, isHealthy }
      }
    };

    return EitherM.right(undefined);
  };

  /**
   * Process queued messages
   */
  public processQueue = async (): Promise<void> => {
    while (this.messageQueue.length > 0 && 
           this.processingMessages.size < this.config.maxConcurrentMessages) {
      const message = this.messageQueue.shift();
      if (message) {
        this.processMessage(message).catch(console.error);
      }
    }

    // Also process adapter queue
    await this.processAdapterQueue();
  };

  // Private helper methods

  /**
   * Process adapter operation with load balancing
   */
  private processAdapterOperation = async (
    adapterType: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP',
    operation: string,
    parameters: Record<string, any>,
    context?: Record<string, any>,
    priority: number = 1
  ): Promise<Either<string, unknown>> => {
    const operationId = this.generateMessageId();
    this.adapterProcessingQueue.add(operationId);

    try {
      // Find best adapter instance for this operation
      const adapter = this.findBestAdapterForOperation(adapterType);
      if (!adapter) {
        return EitherM.left(`No healthy ${adapterType} adapter available`);
      }

      // Update active operation count
      this.incrementAdapterOperations(adapter.id);

      // Set up timeout
      const timeoutPromise = new Promise<Either<string, unknown>>((resolve) => {
        setTimeout(() => {
          resolve(EitherM.left('Adapter operation timeout'));
        }, this.config.adapterRouting.adapterTimeout);
      });

      // Execute operation with timeout
      const operationPromise = this.executeAdapterOperation(adapter, operation, parameters, context);
      
      const result = await Promise.race([operationPromise, timeoutPromise]);
      
      // Update last used timestamp
      this.updateAdapterLastUsed(adapter.id);
      
      return result;

    } finally {
      this.adapterProcessingQueue.delete(operationId);
      // Note: We'll decrement operation count in the finally of executeAdapterOperation
    }
  };

  /**
   * Execute operation on specific adapter
   */
  private executeAdapterOperation = async (
    adapter: { id: string; instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter },
    operation: string,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Either<string, unknown>> => {
    try {
      let result;

      if (adapter.instance instanceof SeiAgentKitAdapter) {
        result = await adapter.instance.executeSAKTool(operation, parameters, context)();
      } else if (adapter.instance instanceof HiveIntelligenceAdapter) {
        switch (operation) {
          case 'search':
            result = await adapter.instance.search(parameters.query, parameters.metadata)();
            break;
          case 'get_analytics':
            result = await adapter.instance.getAnalytics(parameters.query, parameters.metadata)();
            break;
          default:
            return EitherM.left(`Unknown Hive operation: ${operation}`);
        }
      } else if (adapter.instance instanceof SeiMCPAdapter) {
        switch (operation) {
          case 'get_blockchain_state':
            result = await adapter.instance.getBlockchainState()();
            break;
          case 'query_contract':
            result = await adapter.instance.queryContract(parameters.contractAddress, parameters.query)();
            break;
          default:
            return EitherM.left(`Unknown MCP operation: ${operation}`);
        }
      } else {
        return EitherM.left('Unknown adapter type');
      }

      return result._tag === 'Right' 
        ? EitherM.right(result.right)
        : EitherM.left(result.left.message || 'Adapter operation failed');

    } catch (error) {
      return EitherM.left(`Adapter operation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.decrementAdapterOperations(adapter.id);
    }
  };

  /**
   * Find best adapter for operation with load balancing
   */
  private findBestAdapterForOperation = (
    adapterType: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP'
  ): { id: string; instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter } | null => {
    const candidates = Object.entries(this.state.adapterInstances)
      .filter(([_, adapter]) => adapter.type === adapterType && adapter.isHealthy)
      .map(([id, adapter]) => ({ id, ...adapter }));

    if (candidates.length === 0) {
      return null;
    }

    // Load balancing: select adapter with fewest active operations and least recently used
    candidates.sort((a, b) => {
      if (a.activeOperations !== b.activeOperations) {
        return a.activeOperations - b.activeOperations; // Fewer operations first
      }
      return a.lastUsed - b.lastUsed; // Least recently used first
    });

    return candidates[0];
  };

  /**
   * Increment active operations for adapter
   */
  private incrementAdapterOperations = (adapterId: string): void => {
    const adapter = this.state.adapterInstances[adapterId];
    if (adapter) {
      this.state = {
        ...this.state,
        adapterInstances: {
          ...this.state.adapterInstances,
          [adapterId]: { ...adapter, activeOperations: adapter.activeOperations + 1 }
        }
      };
    }
  };

  /**
   * Decrement active operations for adapter
   */
  private decrementAdapterOperations = (adapterId: string): void => {
    const adapter = this.state.adapterInstances[adapterId];
    if (adapter) {
      this.state = {
        ...this.state,
        adapterInstances: {
          ...this.state.adapterInstances,
          [adapterId]: { 
            ...adapter, 
            activeOperations: Math.max(0, adapter.activeOperations - 1) 
          }
        }
      };
    }
  };

  /**
   * Update last used timestamp for adapter
   */
  private updateAdapterLastUsed = (adapterId: string): void => {
    const adapter = this.state.adapterInstances[adapterId];
    if (adapter) {
      this.state = {
        ...this.state,
        adapterInstances: {
          ...this.state.adapterInstances,
          [adapterId]: { ...adapter, lastUsed: Date.now() }
        }
      };
    }
  };

  private processMessage = async (
    message: AgentMessage
  ): Promise<Either<string, unknown>> => {
    this.processingMessages.add(message.id);

    try {
      // Find appropriate handler using routing rules
      const handler = this.findMessageHandler(message);
      if (!handler) {
        return EitherM.left(`No handler found for message type: ${message.type}`);
      }

      // Set up timeout
      const timeoutPromise = new Promise<Either<string, unknown>>((resolve) => {
        setTimeout(() => {
          resolve(EitherM.left('Message processing timeout'));
        }, this.config.messageTimeout);
      });

      // Process message with timeout
      const processingPromise = this.executeWithRetry(message, handler);
      
      const result = await Promise.race([processingPromise, timeoutPromise]);
      return result;

    } finally {
      this.processingMessages.delete(message.id);
      // Try to process next queued message
      this.processQueue();
    }
  };

  private executeWithRetry = async (
    message: AgentMessage,
    handler: MessageHandler
  ): Promise<Either<string, unknown>> => {
    let lastError: string = '';
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await handler(message);
        if (result._tag === 'Right') {
          return result;
        }
        lastError = result.left;
        
        // Wait before retry with exponential backoff
        if (attempt < this.config.retryAttempts) {
          const backoffMs = Math.pow(this.config.backoffMultiplier, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    
    return EitherM.left(`Failed after ${this.config.retryAttempts + 1} attempts: ${lastError}`);
  };

  private findMessageHandler = (message: AgentMessage): MessageHandler | null => {
    // Check custom routing rules first
    for (const rule of this.state.routingRules) {
      if (rule.messageType === message.type && rule.condition(message)) {
        return rule.handler;
      }
    }

    // Fall back to default handlers
    return this.state.messageHandlers[message.type] || null;
  };

  private validateMessage = (message: AgentMessage): Either<string, AgentMessage> => {
    if (!message.id || message.id.trim() === '') {
      return EitherM.left('Message ID is required');
    }
    if (!message.senderId || message.senderId.trim() === '') {
      return EitherM.left('Sender ID is required');
    }
    if (!message.receiverId || message.receiverId.trim() === '') {
      return EitherM.left('Receiver ID is required');
    }
    if (!message.type) {
      return EitherM.left('Message type is required');
    }
    return EitherM.right(message);
  };

  private createDefaultHandlers = (): ReadonlyRecord<AgentMessageType, MessageHandler> => ({
    task_request: this.handleTaskRequest,
    task_response: this.handleTaskResponse,
    health_check: this.handleHealthCheck,
    status_update: this.handleStatusUpdate,
    error_report: this.handleErrorReport,
    capability_update: this.handleCapabilityUpdate
  });

  private handleTaskRequest = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // In a real implementation, this would forward the request to the actual agent
    // For now, simulate agent processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(EitherM.right({
          type: 'task_response',
          payload: {
            taskId: (message.payload as any)?.task?.id || 'unknown',
            status: 'completed',
            result: { success: true },
            executionTime: Math.random() * 1000,
            metadata: {}
          }
        }));
      }, Math.random() * 500 + 100); // Simulate processing time
    });
  };

  private handleTaskResponse = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Process task response from agent
    return EitherM.right(message.payload);
  };

  private handleHealthCheck = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Respond to health check
    return EitherM.right({
      agentId: message.senderId,
      status: 'healthy',
      timestamp: Date.now()
    });
  };

  private handleStatusUpdate = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Process agent status update
    return EitherM.right(message.payload);
  };

  private handleErrorReport = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Process error report from agent
    console.error('Agent error report:', message.payload);
    return EitherM.right({ acknowledged: true });
  };

  private handleCapabilityUpdate = async (message: AgentMessage): Promise<Either<string, unknown>> => {
    // Process capability update from agent
    return EitherM.right(message.payload);
  };

  private isTaskResponse = (obj: unknown): obj is TaskResponse => {
    return typeof obj === 'object' && 
           obj !== null && 
           'type' in obj && 
           (obj as any).type === 'task_response';
  };

  private generateMessageId = (): string =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}