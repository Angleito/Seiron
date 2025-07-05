import type { Either, ReadonlyRecord } from '../types/index.js';
import type { UserIntent, AnalyzedIntent, SelectedAgent, Task, TaskResult, Agent, IntentAnalysisResult, AgentSelectionResult, TaskExecutionResult, OrchestratorConfig, OrchestratorState, OrchestratorEvent } from './types.js';
import { type AgentRegistryConfig } from './registry.js';
import { type MessageRouterConfig } from './router.js';
import { type SAKIntegrationConfig } from '../agents/adapters/SeiAgentKitAdapter.js';
import { type HiveIntelligenceConfig } from '../agents/adapters/HiveIntelligenceAdapter.js';
import { type MCPServerConfig } from '../agents/adapters/SeiMCPAdapter.js';
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
export declare class Orchestrator {
    private agentRegistry;
    private messageRouter;
    private config;
    private state;
    private eventHandlers;
    private seiAgentKitAdapter?;
    private hiveIntelligenceAdapter?;
    private seiMCPAdapter?;
    private adapterCapabilities;
    constructor(config: ExtendedOrchestratorConfig, registryConfig: AgentRegistryConfig, routerConfig: MessageRouterConfig);
    processIntent: (intent: UserIntent, sessionId: string) => Promise<Either<string, TaskResult>>;
    analyzeIntent: (intent: UserIntent) => Promise<IntentAnalysisResult>;
    selectAgent: (analyzedIntent: AnalyzedIntent) => Promise<AgentSelectionResult>;
    createTask: (analyzedIntent: AnalyzedIntent, selectedAgent: SelectedAgent) => Either<string, Task>;
    executeTask: (task: Task, agent: Agent) => Promise<TaskExecutionResult>;
    processIntentsParallel: (intents: ReadonlyArray<UserIntent>, sessionId: string) => Promise<ReadonlyArray<Either<string, TaskResult>>>;
    registerAgent: (agent: Agent) => Either<string, void>;
    getState: () => OrchestratorState;
    addEventListener: (eventType: string, handler: (event: OrchestratorEvent) => void) => void;
    start: () => void;
    stop: () => void;
    getAdapterCapabilities: () => ReadonlyRecord<string, ReadonlyArray<string>>;
    executeAdapterOperation: (adapterName: string, operation: string, parameters: Record<string, unknown>, context?: Record<string, unknown>) => Promise<Either<string, unknown>>;
    getAdapterHealth: () => ReadonlyRecord<string, "healthy" | "unhealthy" | "disabled">;
    private validateIntent;
    private extractIntentActions;
    private buildAnalyzedIntent;
    private mapIntentToAgentType;
    private calculateMatchScore;
    private estimateExecutionTime;
    private calculateIntentConfidence;
    private estimateComplexity;
    private identifyRisks;
    private getSuggestedAlternatives;
    private mapIntentPriorityToTaskPriority;
    private extractTaskDependencies;
    private updateTaskStatus;
    private isRecoverableError;
    private emitEvent;
    private generateTaskId;
    private initializeAdapters;
    private stopAdapters;
    private enrichActionsWithAdapterCapabilities;
    private executeSAKOperation;
    private executeHiveOperation;
    private executeMCPOperation;
    private isBlockchainIntent;
    private isAnalyticsIntent;
    private isRealTimeIntent;
    private getSAKRelevantActions;
    private getHiveRelevantActions;
    private getMCPRelevantActions;
}
export declare const analyzeIntent: (intent: UserIntent) => IntentAnalysisResult;
export declare const scoreAgentMatch: (agent: Agent, intent: AnalyzedIntent) => number;
export declare const orchestrate: (intent: UserIntent) => IntentAnalysisResult;
//# sourceMappingURL=core.d.ts.map