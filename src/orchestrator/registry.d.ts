import type { Either, Option, ReadonlyRecord } from '../types/index.js';
import type { Agent, AgentType, AgentStatus } from './types.js';
import { SeiAgentKitAdapter } from '../agents/adapters/SeiAgentKitAdapter.js';
import { HiveIntelligenceAdapter } from '../agents/adapters/HiveIntelligenceAdapter.js';
import { SeiMCPAdapter } from '../agents/adapters/SeiMCPAdapter.js';
interface AdapterInstance {
    readonly id: string;
    readonly type: 'seiAgentKit' | 'hiveIntelligence' | 'seiMCP';
    readonly instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter;
    readonly capabilities: ReadonlyArray<string>;
    readonly status: 'active' | 'inactive' | 'error';
    readonly lastHealthCheck: number;
    readonly priority: number;
}
interface LoadMetrics {
    readonly agentId: string;
    readonly activeTasks: number;
    readonly completedTasks: number;
    readonly averageResponseTime: number;
    readonly errorRate: number;
    readonly lastUpdated: number;
}
export interface AgentRegistryConfig {
    readonly healthCheckInterval: number;
    readonly maxConsecutiveFailures: number;
    readonly responseTimeoutMs: number;
    readonly loadBalancingWeights: ReadonlyRecord<string, number>;
    readonly adapterConfig: {
        enableLoadBalancing: boolean;
        maxAdaptersPerType: number;
        healthCheckTimeoutMs: number;
        failoverEnabled: boolean;
    };
}
export declare class AgentRegistry {
    private state;
    private config;
    private healthCheckTimer?;
    constructor(config: AgentRegistryConfig);
    registerAgent: (agent: Agent) => Either<string, void>;
    unregisterAgent: (agentId: string) => Either<string, void>;
    getAgent: (agentId: string) => Option<Agent>;
    getAllAgents: () => ReadonlyArray<Agent>;
    getAgentsByType: (type: AgentType) => ReadonlyArray<Agent>;
    getHealthyAgents: () => ReadonlyArray<Agent>;
    getAgentsByCapability: (action: string) => ReadonlyArray<Agent>;
    findBestAgent: (type: AgentType, action: string, parameters: ReadonlyRecord<string, unknown>) => Option<Agent>;
    updateAgentStatus: (agentId: string, status: AgentStatus) => Either<string, void>;
    startHealthMonitoring: () => void;
    stopHealthMonitoring: () => void;
    getLoadMetrics: (agentId: string) => Option<LoadMetrics>;
    updateLoadMetrics: (agentId: string, update: Partial<LoadMetrics>) => Either<string, void>;
    registerAdapter: (id: string, type: "seiAgentKit" | "hiveIntelligence" | "seiMCP", instance: SeiAgentKitAdapter | HiveIntelligenceAdapter | SeiMCPAdapter, capabilities: ReadonlyArray<string>, priority?: number) => Either<string, void>;
    unregisterAdapter: (id: string) => Either<string, void>;
    getAdapter: (id: string) => Option<AdapterInstance>;
    getAllAdapters: () => ReadonlyArray<AdapterInstance>;
    getAdaptersByType: (type: "seiAgentKit" | "hiveIntelligence" | "seiMCP") => ReadonlyArray<AdapterInstance>;
    getHealthyAdapters: () => ReadonlyArray<AdapterInstance>;
    getAdaptersByCapability: (capability: string) => ReadonlyArray<AdapterInstance>;
    findBestAdapter: (capability: string, preferredType?: "seiAgentKit" | "hiveIntelligence" | "seiMCP") => Option<AdapterInstance>;
    updateAdapterStatus: (id: string, status: "active" | "inactive" | "error") => Either<string, void>;
    getAdapterLoadInfo: () => ReadonlyRecord<string, {
        adaptersCount: number;
        healthyCount: number;
        capabilities: ReadonlyArray<string>;
    }>;
    performAdapterHealthChecks: () => Promise<void>;
    private validateAgent;
    private createInitialLoadMetrics;
    private isAgentHealthy;
    private hasCapability;
    private canHandleParameters;
    private compareAgentLoad;
    private performHealthChecks;
    private checkAgentHealth;
    private checkAdapterHealth;
}
export {};
//# sourceMappingURL=registry.d.ts.map