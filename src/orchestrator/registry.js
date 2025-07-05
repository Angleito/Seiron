"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const index_js_1 = require("../types/index.js");
const utils_js_1 = require("../types/utils.js");
class AgentRegistry {
    state;
    config;
    healthCheckTimer;
    constructor(config) {
        this.config = config;
        this.state = {
            agents: {},
            healthChecks: {},
            capabilities: {},
            loadMetrics: {},
            adapters: {}
        };
    }
    registerAgent = (agent) => (0, index_js_1.pipe)(this.validateAgent(agent), utils_js_1.EitherM.map(() => {
        this.state = {
            ...this.state,
            agents: { ...this.state.agents, [agent.id]: agent },
            capabilities: {
                ...this.state.capabilities,
                [agent.id]: agent.capabilities
            },
            loadMetrics: {
                ...this.state.loadMetrics,
                [agent.id]: this.createInitialLoadMetrics(agent.id)
            }
        };
    }));
    unregisterAgent = (agentId) => this.getAgent(agentId)._tag === 'None'
        ? utils_js_1.EitherM.left(`Agent ${agentId} not found`)
        : utils_js_1.EitherM.right((() => {
            const { [agentId]: removed, ...remainingAgents } = this.state.agents;
            const { [agentId]: removedHealth, ...remainingHealth } = this.state.healthChecks;
            const { [agentId]: removedCaps, ...remainingCaps } = this.state.capabilities;
            const { [agentId]: removedMetrics, ...remainingMetrics } = this.state.loadMetrics;
            this.state = {
                agents: remainingAgents,
                healthChecks: remainingHealth,
                capabilities: remainingCaps,
                loadMetrics: remainingMetrics
            };
        })());
    getAgent = (agentId) => utils_js_1.Maybe.fromNullable(this.state.agents[agentId]);
    getAllAgents = () => Object.values(this.state.agents);
    getAgentsByType = (type) => this.getAllAgents().filter(agent => agent.type === type);
    getHealthyAgents = () => this.getAllAgents().filter(agent => this.isAgentHealthy(agent.id));
    getAgentsByCapability = (action) => this.getAllAgents().filter(agent => this.state.capabilities[agent.id]?.some(cap => cap.action === action) ?? false);
    findBestAgent = (type, action, parameters) => {
        const candidates = this.getHealthyAgents()
            .filter(agent => agent.type === type)
            .filter(agent => this.hasCapability(agent.id, action))
            .filter(agent => this.canHandleParameters(agent.id, action, parameters));
        if (candidates.length === 0) {
            return utils_js_1.Maybe.none();
        }
        const best = candidates.reduce((best, current) => this.compareAgentLoad(best.id, current.id) <= 0 ? best : current);
        return utils_js_1.Maybe.some(best);
    };
    updateAgentStatus = (agentId, status) => (0, index_js_1.pipe)(this.getAgent(agentId), utils_js_1.Maybe.fold(() => utils_js_1.EitherM.left(`Agent ${agentId} not found`), (agent) => utils_js_1.EitherM.right((() => {
        this.state = {
            ...this.state,
            agents: {
                ...this.state.agents,
                [agentId]: { ...agent, status }
            }
        };
    })())));
    startHealthMonitoring = () => {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        this.healthCheckTimer = setInterval(() => this.performHealthChecks(), this.config.healthCheckInterval);
    };
    stopHealthMonitoring = () => {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
    };
    getLoadMetrics = (agentId) => utils_js_1.Maybe.fromNullable(this.state.loadMetrics[agentId]);
    updateLoadMetrics = (agentId, update) => (0, index_js_1.pipe)(this.getLoadMetrics(agentId), utils_js_1.Maybe.fold(() => utils_js_1.EitherM.left(`Load metrics not found for agent ${agentId}`), (metrics) => utils_js_1.EitherM.right((() => {
        this.state = {
            ...this.state,
            loadMetrics: {
                ...this.state.loadMetrics,
                [agentId]: { ...metrics, ...update, lastUpdated: Date.now() }
            }
        };
    })())));
    registerAdapter = (id, type, instance, capabilities, priority = 1) => {
        try {
            if (this.state.adapters[id]) {
                return utils_js_1.EitherM.left(`Adapter ${id} already registered`);
            }
            const adaptersOfType = Object.values(this.state.adapters)
                .filter(adapter => adapter.type === type);
            if (adaptersOfType.length >= this.config.adapterConfig.maxAdaptersPerType) {
                return utils_js_1.EitherM.left(`Maximum number of ${type} adapters reached`);
            }
            const adapterInstance = {
                id,
                type,
                instance,
                capabilities,
                status: 'active',
                lastHealthCheck: Date.now(),
                priority
            };
            this.state = {
                ...this.state,
                adapters: { ...this.state.adapters, [id]: adapterInstance }
            };
            return utils_js_1.EitherM.right(undefined);
        }
        catch (error) {
            return utils_js_1.EitherM.left(`Failed to register adapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    unregisterAdapter = (id) => {
        if (!this.state.adapters[id]) {
            return utils_js_1.EitherM.left(`Adapter ${id} not found`);
        }
        const { [id]: removed, ...remainingAdapters } = this.state.adapters;
        this.state = {
            ...this.state,
            adapters: remainingAdapters
        };
        return utils_js_1.EitherM.right(undefined);
    };
    getAdapter = (id) => utils_js_1.Maybe.fromNullable(this.state.adapters[id]);
    getAllAdapters = () => Object.values(this.state.adapters);
    getAdaptersByType = (type) => this.getAllAdapters().filter(adapter => adapter.type === type);
    getHealthyAdapters = () => this.getAllAdapters().filter(adapter => adapter.status === 'active');
    getAdaptersByCapability = (capability) => this.getAllAdapters().filter(adapter => adapter.capabilities.includes(capability));
    findBestAdapter = (capability, preferredType) => {
        let candidates = this.getHealthyAdapters()
            .filter(adapter => adapter.capabilities.includes(capability));
        if (preferredType) {
            const preferredCandidates = candidates.filter(adapter => adapter.type === preferredType);
            if (preferredCandidates.length > 0) {
                candidates = preferredCandidates;
            }
        }
        if (candidates.length === 0) {
            return utils_js_1.Maybe.none();
        }
        if (this.config.adapterConfig.enableLoadBalancing) {
            candidates.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.lastHealthCheck - b.lastHealthCheck;
            });
        }
        return utils_js_1.Maybe.some(candidates[0]);
    };
    updateAdapterStatus = (id, status) => (0, index_js_1.pipe)(this.getAdapter(id), utils_js_1.Maybe.fold(() => utils_js_1.EitherM.left(`Adapter ${id} not found`), (adapter) => utils_js_1.EitherM.right((() => {
        this.state = {
            ...this.state,
            adapters: {
                ...this.state.adapters,
                [id]: { ...adapter, status, lastHealthCheck: Date.now() }
            }
        };
    })())));
    getAdapterLoadInfo = () => {
        const loadInfo = {};
        const adapterTypes = ['seiAgentKit', 'hiveIntelligence', 'seiMCP'];
        adapterTypes.forEach(type => {
            const adapters = this.getAdaptersByType(type);
            const healthy = adapters.filter(a => a.status === 'active');
            const allCapabilities = [...new Set(adapters.flatMap(a => a.capabilities))];
            loadInfo[type] = {
                adaptersCount: adapters.length,
                healthyCount: healthy.length,
                capabilities: allCapabilities
            };
        });
        return loadInfo;
    };
    performAdapterHealthChecks = async () => {
        const adapters = this.getAllAdapters();
        for (const adapter of adapters) {
            try {
                const isHealthy = await this.checkAdapterHealth(adapter);
                const newStatus = isHealthy ? 'active' : 'error';
                if (adapter.status !== newStatus) {
                    this.updateAdapterStatus(adapter.id, newStatus);
                }
            }
            catch (error) {
                console.error(`Health check failed for adapter ${adapter.id}:`, error);
                this.updateAdapterStatus(adapter.id, 'error');
            }
        }
    };
    validateAgent = (agent) => {
        if (!agent.id || agent.id.trim() === '') {
            return utils_js_1.EitherM.left('Agent ID is required');
        }
        if (this.state.agents[agent.id]) {
            return utils_js_1.EitherM.left(`Agent ${agent.id} already registered`);
        }
        if (agent.capabilities.length === 0) {
            return utils_js_1.EitherM.left('Agent must have at least one capability');
        }
        return utils_js_1.EitherM.right(agent);
    };
    createInitialLoadMetrics = (agentId) => ({
        agentId,
        activeTasks: 0,
        completedTasks: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastUpdated: Date.now()
    });
    isAgentHealthy = (agentId) => {
        const healthCheck = this.state.healthChecks[agentId];
        if (!healthCheck)
            return true;
        return healthCheck.status !== 'error' &&
            healthCheck.status !== 'offline' &&
            healthCheck.consecutiveFailures < this.config.maxConsecutiveFailures;
    };
    hasCapability = (agentId, action) => this.state.capabilities[agentId]?.some(cap => cap.action === action) ?? false;
    canHandleParameters = (agentId, action, parameters) => {
        const capability = this.state.capabilities[agentId]
            ?.find(cap => cap.action === action);
        if (!capability)
            return false;
        const requiredParams = capability.parameters.filter(p => p.required);
        return requiredParams.every(param => parameters[param.name] !== undefined && parameters[param.name] !== null);
    };
    compareAgentLoad = (agentId1, agentId2) => {
        const metrics1 = this.state.loadMetrics[agentId1];
        const metrics2 = this.state.loadMetrics[agentId2];
        if (!metrics1 || !metrics2)
            return 0;
        const loadDiff = metrics1.activeTasks - metrics2.activeTasks;
        if (loadDiff !== 0)
            return loadDiff;
        return metrics1.averageResponseTime - metrics2.averageResponseTime;
    };
    performHealthChecks = async () => {
        const agents = this.getAllAgents();
        for (const agent of agents) {
            try {
                const startTime = Date.now();
                const isHealthy = await this.checkAgentHealth(agent);
                const responseTime = Date.now() - startTime;
                const previousCheck = this.state.healthChecks[agent.id];
                const consecutiveFailures = isHealthy
                    ? 0
                    : (previousCheck?.consecutiveFailures ?? 0) + 1;
                this.state = {
                    ...this.state,
                    healthChecks: {
                        ...this.state.healthChecks,
                        [agent.id]: {
                            agentId: agent.id,
                            status: isHealthy ? 'idle' : 'error',
                            lastCheck: Date.now(),
                            responseTime,
                            consecutiveFailures
                        }
                    }
                };
                if (!isHealthy && consecutiveFailures >= this.config.maxConsecutiveFailures) {
                    this.updateAgentStatus(agent.id, 'offline');
                }
            }
            catch (error) {
                const previousCheck = this.state.healthChecks[agent.id];
                this.state = {
                    ...this.state,
                    healthChecks: {
                        ...this.state.healthChecks,
                        [agent.id]: {
                            agentId: agent.id,
                            status: 'error',
                            lastCheck: Date.now(),
                            responseTime: this.config.responseTimeoutMs,
                            consecutiveFailures: (previousCheck?.consecutiveFailures ?? 0) + 1
                        }
                    }
                };
            }
        }
        await this.performAdapterHealthChecks();
    };
    checkAgentHealth = async (agent) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(agent.status !== 'error' && agent.status !== 'offline');
            }, Math.random() * 100);
        });
    };
    checkAdapterHealth = async (adapter) => {
        try {
            switch (adapter.type) {
                case 'seiAgentKit':
                    const sakAdapter = adapter.instance;
                    return sakAdapter.getConfig() !== undefined;
                case 'hiveIntelligence':
                    const hiveAdapter = adapter.instance;
                    return hiveAdapter.getConfig() !== undefined;
                case 'seiMCP':
                    const mcpAdapter = adapter.instance;
                    return mcpAdapter.getConfig() !== undefined;
                default:
                    return false;
            }
        }
        catch (error) {
            console.error(`Health check failed for adapter ${adapter.id}:`, error);
            return false;
        }
    };
}
exports.AgentRegistry = AgentRegistry;
//# sourceMappingURL=registry.js.map