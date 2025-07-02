import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

/**
 * Base Agent Framework for ElizaOS Integration
 * 
 * Provides foundational architecture for DeFi agents with:
 * - Lifecycle management
 * - Plugin architecture
 * - Communication protocols
 * - State management
 * - Error handling with fp-ts patterns
 */

export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  settings: Record<string, any>;
  elizaCharacterPath?: string;
}

export interface AgentState {
  status: 'idle' | 'active' | 'paused' | 'error' | 'terminated';
  lastUpdate: Date;
  metrics: AgentMetrics;
  context: Record<string, any>;
}

export interface AgentMetrics {
  actionsExecuted: number;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
  uptime: number;
}

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  handler: ActionHandler;
  validation?: ValidationRule[];
  rateLimit?: RateLimit;
}

export interface ActionHandler {
  (context: ActionContext): TaskEither<AgentError, ActionResult>;
}

export interface ActionContext {
  agentId: string;
  userId?: string;
  parameters: Record<string, any>;
  state: AgentState;
  metadata: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  message?: string;
  metrics?: Partial<AgentMetrics>;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  validator?: (value: any) => boolean;
  message?: string;
}

export interface RateLimit {
  maxRequests: number;
  windowMs: number;
}

export interface AgentPlugin {
  id: string;
  name: string;
  version: string;
  initialize: (agent: BaseAgent) => TaskEither<AgentError, void>;
  cleanup?: () => TaskEither<AgentError, void>;
}

export interface AgentError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  agentId: string;
}

export interface CommunicationProtocol {
  send: (message: AgentMessage) => TaskEither<AgentError, void>;
  receive: () => TaskEither<AgentError, AgentMessage[]>;
  subscribe: (topic: string, handler: MessageHandler) => void;
  unsubscribe: (topic: string) => void;
}

export interface AgentMessage {
  id: string;
  type: 'command' | 'query' | 'response' | 'event' | 'notification';
  from: string;
  to: string;
  payload: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MessageHandler {
  (message: AgentMessage): TaskEither<AgentError, void>;
}

/**
 * BaseAgent - Foundation class for all DeFi agents
 * 
 * Features:
 * - Plugin architecture for extensibility
 * - State management with persistence
 * - Action registration and execution
 * - Communication protocols
 * - Comprehensive error handling
 * - Metrics and monitoring
 */
export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  protected actions: Map<string, AgentAction> = new Map();
  protected plugins: Map<string, AgentPlugin> = new Map();
  protected rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  protected communicationProtocol?: CommunicationProtocol;
  protected startTime: Date = new Date();

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.state = this.initializeState();
    this.setupEventHandlers();
  }

  /**
   * Initialize agent state with default values
   */
  private initializeState(): AgentState {
    return {
      status: 'idle',
      lastUpdate: new Date(),
      metrics: {
        actionsExecuted: 0,
        successRate: 1.0,
        avgResponseTime: 0,
        errorCount: 0,
        uptime: 0
      },
      context: {}
    };
  }

  /**
   * Setup event handlers for agent lifecycle
   */
  private setupEventHandlers(): void {
    this.on('action:executed', this.updateMetrics.bind(this));
    this.on('error', this.handleError.bind(this));
    this.on('state:changed', this.persistState.bind(this));
  }

  /**
   * Start the agent - initialize plugins and set active state
   */
  public start(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.setState({ status: 'active' });
          await this.initializePlugins();
          this.emit('agent:started', { agentId: this.config.id });
        },
        (error) => this.createError('AGENT_START_FAILED', `Failed to start agent: ${error}`)
      )
    );
  }

  /**
   * Stop the agent - cleanup plugins and set idle state
   */
  public stop(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.setState({ status: 'idle' });
          await this.cleanupPlugins();
          this.emit('agent:stopped', { agentId: this.config.id });
        },
        (error) => this.createError('AGENT_STOP_FAILED', `Failed to stop agent: ${error}`)
      )
    );
  }

  /**
   * Pause the agent - maintain state but stop processing
   */
  public pause(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.setState({ status: 'paused' });
          this.emit('agent:paused', { agentId: this.config.id });
        },
        (error) => this.createError('AGENT_PAUSE_FAILED', `Failed to pause agent: ${error}`)
      )
    );
  }

  /**
   * Resume the agent from paused state
   */
  public resume(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.setState({ status: 'active' });
          this.emit('agent:resumed', { agentId: this.config.id });
        },
        (error) => this.createError('AGENT_RESUME_FAILED', `Failed to resume agent: ${error}`)
      )
    );
  }

  /**
   * Register an action with the agent
   */
  public registerAction(action: AgentAction): Either<AgentError, void> {
    try {
      if (this.actions.has(action.id)) {
        return left(this.createError('ACTION_EXISTS', `Action ${action.id} already registered`));
      }

      this.actions.set(action.id, action);
      this.emit('action:registered', { actionId: action.id, agentId: this.config.id });
      return right(undefined);
    } catch (error) {
      return left(this.createError('ACTION_REGISTRATION_FAILED', `Failed to register action: ${error}`));
    }
  }

  /**
   * Execute an action with validation and rate limiting
   */
  public executeAction(actionId: string, context: ActionContext): TaskEither<AgentError, ActionResult> {
    const action = this.actions.get(actionId);
    
    if (!action) {
      return TE.left(this.createError('ACTION_NOT_FOUND', `Action ${actionId} not found`));
    }

    return pipe(
      this.validateActionContext(action, context),
      TE.fromEither,
      TE.chain(() => this.checkRateLimit(action)),
      TE.chain(() => this.executeActionWithMetrics(action, context))
    );
  }

  /**
   * Install a plugin
   */
  public installPlugin(plugin: AgentPlugin): TaskEither<AgentError, void> {
    if (this.plugins.has(plugin.id)) {
      return TE.left(this.createError('PLUGIN_EXISTS', `Plugin ${plugin.id} already installed`));
    }

    return pipe(
      plugin.initialize(this),
      TE.map(() => {
        this.plugins.set(plugin.id, plugin);
        this.emit('plugin:installed', { pluginId: plugin.id, agentId: this.config.id });
      })
    );
  }

  /**
   * Uninstall a plugin
   */
  public uninstallPlugin(pluginId: string): TaskEither<AgentError, void> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      return TE.left(this.createError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`));
    }

    const cleanup = plugin.cleanup || (() => TE.right(undefined));
    
    return pipe(
      cleanup(),
      TE.map(() => {
        this.plugins.delete(pluginId);
        this.emit('plugin:uninstalled', { pluginId, agentId: this.config.id });
      })
    );
  }

  /**
   * Set communication protocol
   */
  public setCommunicationProtocol(protocol: CommunicationProtocol): void {
    this.communicationProtocol = protocol;
    this.emit('communication:protocol:set', { agentId: this.config.id });
  }

  /**
   * Send message through communication protocol
   */
  public sendMessage(message: AgentMessage): TaskEither<AgentError, void> {
    if (!this.communicationProtocol) {
      return TE.left(this.createError('NO_COMMUNICATION_PROTOCOL', 'No communication protocol set'));
    }

    return this.communicationProtocol.send(message);
  }

  /**
   * Get current agent state
   */
  public getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent configuration
   */
  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get agent metrics
   */
  public getMetrics(): AgentMetrics {
    const uptime = Date.now() - this.startTime.getTime();
    return {
      ...this.state.metrics,
      uptime
    };
  }

  /**
   * Abstract method for agent-specific initialization
   */
  protected abstract initialize(): TaskEither<AgentError, void>;

  /**
   * Abstract method for agent-specific cleanup
   */
  protected abstract cleanup(): TaskEither<AgentError, void>;

  /**
   * Update agent state
   */
  protected setState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: new Date()
    };
    this.emit('state:changed', { agentId: this.config.id, state: this.state });
  }

  /**
   * Create standardized error object
   */
  protected createError(code: string, message: string, details?: any): AgentError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      agentId: this.config.id
    };
  }

  /**
   * Validate action context
   */
  private validateActionContext(action: AgentAction, context: ActionContext): Either<AgentError, void> {
    if (!action.validation) {
      return right(undefined);
    }

    for (const rule of action.validation) {
      const value = context.parameters[rule.field];
      
      if (rule.required && (value === undefined || value === null)) {
        return left(this.createError('VALIDATION_FAILED', `Required field ${rule.field} is missing`));
      }

      if (value !== undefined && typeof value !== rule.type) {
        return left(this.createError('VALIDATION_FAILED', `Field ${rule.field} must be of type ${rule.type}`));
      }

      if (rule.validator && !rule.validator(value)) {
        return left(this.createError('VALIDATION_FAILED', rule.message || `Validation failed for ${rule.field}`));
      }
    }

    return right(undefined);
  }

  /**
   * Check rate limits for actions
   */
  private checkRateLimit(action: AgentAction): TaskEither<AgentError, void> {
    if (!action.rateLimit) {
      return TE.right(undefined);
    }

    const now = Date.now();
    const limit = this.rateLimits.get(action.id) || { count: 0, resetTime: now + action.rateLimit.windowMs };

    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + action.rateLimit.windowMs;
    }

    if (limit.count >= action.rateLimit.maxRequests) {
      return TE.left(this.createError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for action ${action.id}`));
    }

    limit.count++;
    this.rateLimits.set(action.id, limit);
    
    return TE.right(undefined);
  }

  /**
   * Execute action with metrics tracking
   */
  private executeActionWithMetrics(action: AgentAction, context: ActionContext): TaskEither<AgentError, ActionResult> {
    const startTime = Date.now();
    
    return pipe(
      action.handler(context),
      TE.map((result) => {
        const duration = Date.now() - startTime;
        this.emit('action:executed', { 
          actionId: action.id, 
          duration, 
          success: result.success,
          agentId: this.config.id 
        });
        return result;
      }),
      TE.mapLeft((error) => {
        const duration = Date.now() - startTime;
        this.emit('action:failed', { 
          actionId: action.id, 
          duration, 
          error,
          agentId: this.config.id 
        });
        return error;
      })
    );
  }

  /**
   * Initialize all plugins
   */
  private async initializePlugins(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      try {
        await plugin.initialize(this)();
      } catch (error) {
        this.emit('error', this.createError('PLUGIN_INIT_FAILED', `Failed to initialize plugin ${id}: ${error}`));
      }
    }
  }

  /**
   * Cleanup all plugins
   */
  private async cleanupPlugins(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup()();
        }
      } catch (error) {
        this.emit('error', this.createError('PLUGIN_CLEANUP_FAILED', `Failed to cleanup plugin ${id}: ${error}`));
      }
    }
  }

  /**
   * Update metrics based on action execution
   */
  private updateMetrics(event: any): void {
    const metrics = { ...this.state.metrics };
    
    metrics.actionsExecuted++;
    
    if (event.success) {
      const totalResponseTime = metrics.avgResponseTime * (metrics.actionsExecuted - 1) + event.duration;
      metrics.avgResponseTime = totalResponseTime / metrics.actionsExecuted;
    } else {
      metrics.errorCount++;
    }
    
    metrics.successRate = (metrics.actionsExecuted - metrics.errorCount) / metrics.actionsExecuted;
    
    this.setState({ metrics });
  }

  /**
   * Handle agent errors
   */
  private handleError(error: AgentError): void {
    console.error(`Agent ${this.config.id} error:`, error);
    
    if (error.code === 'CRITICAL_ERROR') {
      this.setState({ status: 'error' });
    }
  }

  /**
   * Persist agent state (placeholder for actual persistence implementation)
   */
  private persistState(): void {
    // Implementation would depend on chosen persistence layer
    // Could be file system, database, Redis, etc.
  }
}