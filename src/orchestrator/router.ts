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

/**
 * Message routing configuration
 */
export interface MessageRouterConfig {
  readonly maxConcurrentMessages: number;
  readonly messageTimeout: number;
  readonly retryAttempts: number;
  readonly backoffMultiplier: number;
  readonly enableParallelExecution: boolean;
}

/**
 * Message routing state
 */
interface MessageRouterState {
  readonly pendingMessages: ReadonlyRecord<string, PendingMessage>;
  readonly messageHandlers: ReadonlyRecord<AgentMessageType, MessageHandler>;
  readonly routingRules: ReadonlyArray<RoutingRule>;
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

  constructor(config: MessageRouterConfig) {
    this.config = config;
    this.state = {
      pendingMessages: {},
      messageHandlers: this.createDefaultHandlers(),
      routingRules: []
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
  };

  // Private helper methods

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