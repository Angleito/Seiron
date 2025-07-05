import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import { EventEmitter } from 'events';
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
export declare abstract class BaseAgent extends EventEmitter {
    protected config: AgentConfig;
    protected state: AgentState;
    protected actions: Map<string, AgentAction>;
    protected plugins: Map<string, AgentPlugin>;
    protected rateLimits: Map<string, {
        count: number;
        resetTime: number;
    }>;
    protected communicationProtocol?: CommunicationProtocol;
    protected startTime: Date;
    constructor(config: AgentConfig);
    private initializeState;
    private setupEventHandlers;
    start(): TaskEither<AgentError, void>;
    stop(): TaskEither<AgentError, void>;
    pause(): TaskEither<AgentError, void>;
    resume(): TaskEither<AgentError, void>;
    registerAction(action: AgentAction): Either<AgentError, void>;
    executeAction(actionId: string, context: ActionContext): TaskEither<AgentError, ActionResult>;
    installPlugin(plugin: AgentPlugin): TaskEither<AgentError, void>;
    uninstallPlugin(pluginId: string): TaskEither<AgentError, void>;
    setCommunicationProtocol(protocol: CommunicationProtocol): void;
    sendMessage(message: AgentMessage): TaskEither<AgentError, void>;
    getState(): AgentState;
    getConfig(): AgentConfig;
    getMetrics(): AgentMetrics;
    protected abstract initialize(): TaskEither<AgentError, void>;
    protected abstract cleanup(): TaskEither<AgentError, void>;
    protected setState(updates: Partial<AgentState>): void;
    protected createError(code: string, message: string, details?: any): AgentError;
    private validateActionContext;
    private checkRateLimit;
    private executeActionWithMetrics;
    private initializePlugins;
    private cleanupPlugins;
    private updateMetrics;
    private handleError;
    private persistState;
}
//# sourceMappingURL=BaseAgent.d.ts.map