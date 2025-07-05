import type { Either, ReadonlyRecord } from '../types/index.js';
import type { AgentMessage, AgentMessageType, Task, TaskResult, Agent } from './types.js';
import { SeiAgentKitAdapter } from '../agents/adapters/SeiAgentKitAdapter.js';
import { HiveIntelligenceAdapter } from '../agents/adapters/HiveIntelligenceAdapter.js';
import { SeiMCPAdapter } from '../agents/adapters/SeiMCPAdapter.js';
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
type MessageHandler = (message: AgentMessage) => Promise<Either<string, unknown>>;
interface RoutingRule {
    readonly messageType: AgentMessageType;
    readonly condition: (message: AgentMessage) => boolean;
    readonly handler: MessageHandler;
    readonly priority: number;
}
export declare class MessageRouter {
    private state;
    private config;
    private messageQueue;
    private processingMessages;
    private adapterProcessingQueue;
    constructor(config: MessageRouterConfig);
    routeMessage: (message: AgentMessage) => Promise<Either<string, unknown>>;
    routeMessages: (messages: ReadonlyArray<AgentMessage>) => Promise<ReadonlyArray<Either<string, unknown>>>;
    addRoutingRule: (rule: RoutingRule) => Either<string, void>;
    registerHandler: (messageType: AgentMessageType, handler: MessageHandler) => Either<string, void>;
    sendTaskRequest: (task: Task, agent: Agent) => Promise<Either<string, TaskResult>>;
    broadcastMessage: (message: Omit<AgentMessage, "id" | "receiverId">, agentIds: ReadonlyArray<string>) => Promise<ReadonlyArray<Either<string, unknown>>>;
    getPendingMessageCount: () => number;
    getQueueLength: () => number;
    registerAdapter: (id: string, type: "seiAgentKit" | "hiveIntelligence" | "seiMCP", instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter) => Either<string, void>;
    unregisterAdapter: (id: string) => Either<string, void>;
    routeAdapterOperation: (adapterType: "seiAgentKit" | "hiveIntelligence" | "seiMCP", operation: string, parameters: Record<string, any>, context?: Record<string, any>, priority?: number) => Promise<Either<string, unknown>>;
    routeAdapterOperationsParallel: (operations: Array<{
        adapterType: "seiAgentKit" | "hiveIntelligence" | "seiMCP";
        operation: string;
        parameters: Record<string, any>;
        context?: Record<string, any>;
        priority?: number;
    }>) => Promise<ReadonlyArray<Either<string, unknown>>>;
    processAdapterQueue: () => Promise<void>;
    getAdapterLoadInfo: () => ReadonlyRecord<string, {
        instanceCount: number;
        healthyCount: number;
        activeOperations: number;
        queueSize: number;
    }>;
    updateAdapterHealth: (id: string, isHealthy: boolean) => Either<string, void>;
    processQueue: () => Promise<void>;
    private processAdapterOperation;
    private executeAdapterOperation;
    private findBestAdapterForOperation;
    private incrementAdapterOperations;
    private decrementAdapterOperations;
    private updateAdapterLastUsed;
    private processMessage;
    private executeWithRetry;
    private findMessageHandler;
    private validateMessage;
    private createDefaultHandlers;
    private handleTaskRequest;
    private handleTaskResponse;
    private handleHealthCheck;
    private handleStatusUpdate;
    private handleErrorReport;
    private handleCapabilityUpdate;
    private isTaskResponse;
    private generateMessageId;
}
export {};
//# sourceMappingURL=router.d.ts.map