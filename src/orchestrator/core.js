"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestrate = exports.scoreAgentMatch = exports.analyzeIntent = exports.Orchestrator = void 0;
const index_js_1 = require("../types/index.js");
const utils_js_1 = require("../types/utils.js");
const registry_js_1 = require("./registry.js");
const router_js_1 = require("./router.js");
const SeiAgentKitAdapter_js_1 = require("../agents/adapters/SeiAgentKitAdapter.js");
const HiveIntelligenceAdapter_js_1 = require("../agents/adapters/HiveIntelligenceAdapter.js");
const SeiMCPAdapter_js_1 = require("../agents/adapters/SeiMCPAdapter.js");
class Orchestrator {
    agentRegistry;
    messageRouter;
    config;
    state;
    eventHandlers = new Map();
    seiAgentKitAdapter;
    hiveIntelligenceAdapter;
    seiMCPAdapter;
    adapterCapabilities = new Map();
    constructor(config, registryConfig, routerConfig) {
        this.config = config;
        this.agentRegistry = new registry_js_1.AgentRegistry(registryConfig);
        this.messageRouter = new router_js_1.MessageRouter(routerConfig);
        this.state = {
            agents: {},
            tasks: {},
            sessions: {},
            messageQueue: []
        };
        this.initializeAdapters();
    }
    processIntent = async (intent, sessionId) => (0, index_js_1.pipe)(await this.analyzeIntent(intent), utils_js_1.EitherM.flatMap(async (analyzedIntent) => (0, index_js_1.pipe)(await this.selectAgent(analyzedIntent), utils_js_1.EitherM.flatMap(async (selectedAgent) => (0, index_js_1.pipe)(this.createTask(analyzedIntent, selectedAgent), utils_js_1.EitherM.flatMap(async (task) => this.executeTask(task, selectedAgent.agent)))))));
    analyzeIntent = async (intent) => {
        try {
            this.emitEvent({
                type: 'intent_received',
                intent,
                timestamp: Date.now()
            });
            const analysis = (0, index_js_1.pipe)(this.validateIntent(intent), utils_js_1.EitherM.flatMap(this.extractIntentActions), utils_js_1.EitherM.flatMap(async (actions) => {
                const enrichedActions = await this.enrichActionsWithAdapterCapabilities(actions, intent);
                return (0, index_js_1.pipe)(enrichedActions, utils_js_1.EitherM.map(enriched => this.buildAnalyzedIntent(intent, enriched)));
            }));
            return analysis;
        }
        catch (error) {
            return utils_js_1.EitherM.left({
                type: 'parse_error',
                message: error instanceof Error ? error.message : 'Unknown error during intent analysis',
                details: { originalIntent: intent }
            });
        }
    };
    selectAgent = async (analyzedIntent) => {
        const agentType = this.mapIntentToAgentType(analyzedIntent.intent.type);
        const primaryAction = analyzedIntent.requiredActions[0];
        if (!primaryAction) {
            return utils_js_1.EitherM.left({
                type: 'capability_mismatch',
                message: 'No actions identified for intent',
                suggestedAlternatives: []
            });
        }
        const bestAgent = this.agentRegistry.findBestAgent(agentType, primaryAction, analyzedIntent.intent.parameters);
        return (0, index_js_1.pipe)(bestAgent, utils_js_1.Maybe.fold(() => utils_js_1.EitherM.left({
            type: 'no_available_agents',
            message: `No available agents of type ${agentType} for action ${primaryAction}`,
            suggestedAlternatives: this.getSuggestedAlternatives(agentType, primaryAction)
        }), (agent) => {
            const capabilities = this.agentRegistry.getAgent(agent.id)
                ._tag === 'Some'
                ? this.agentRegistry.getAgent(agent.id).value.capabilities
                : [];
            return utils_js_1.EitherM.right({
                agent,
                matchScore: this.calculateMatchScore(agent, analyzedIntent),
                availableCapabilities: capabilities,
                estimatedExecutionTime: this.estimateExecutionTime(capabilities, primaryAction)
            });
        }));
    };
    createTask = (analyzedIntent, selectedAgent) => {
        try {
            const task = {
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
            this.state = {
                ...this.state,
                tasks: { ...this.state.tasks, [task.id]: task }
            };
            return utils_js_1.EitherM.right(task);
        }
        catch (error) {
            return utils_js_1.EitherM.left(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    executeTask = async (task, agent) => {
        try {
            this.emitEvent({
                type: 'task_started',
                task,
                agent,
                timestamp: Date.now()
            });
            this.updateTaskStatus(task.id, 'running');
            const result = await this.messageRouter.sendTaskRequest(task, agent);
            return (0, index_js_1.pipe)(result, utils_js_1.EitherM.fold((error) => {
                this.updateTaskStatus(task.id, 'failed');
                return utils_js_1.EitherM.left({
                    type: 'agent_error',
                    message: error,
                    taskId: task.id,
                    agentId: agent.id,
                    recoverable: this.isRecoverableError(error)
                });
            }, (taskResult) => {
                this.updateTaskStatus(task.id, taskResult.status);
                this.emitEvent({
                    type: 'task_completed',
                    task,
                    result: taskResult,
                    timestamp: Date.now()
                });
                return utils_js_1.EitherM.right(taskResult);
            }));
        }
        catch (error) {
            this.updateTaskStatus(task.id, 'failed');
            return utils_js_1.EitherM.left({
                type: 'timeout',
                message: error instanceof Error ? error.message : 'Unknown execution error',
                taskId: task.id,
                agentId: agent.id,
                recoverable: false
            });
        }
    };
    processIntentsParallel = async (intents, sessionId) => {
        return utils_js_1.AsyncUtils.mapWithConcurrency(intents, (intent) => this.processIntent(intent, sessionId), this.config.maxConcurrentTasks);
    };
    registerAgent = (agent) => this.agentRegistry.registerAgent(agent);
    getState = () => this.state;
    addEventListener = (eventType, handler) => {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    };
    start = () => {
        this.agentRegistry.startHealthMonitoring();
    };
    stop = () => {
        this.agentRegistry.stopHealthMonitoring();
        this.stopAdapters();
    };
    getAdapterCapabilities = () => {
        const capabilities = {};
        for (const [adapter, caps] of this.adapterCapabilities.entries()) {
            capabilities[adapter] = caps;
        }
        return capabilities;
    };
    executeAdapterOperation = async (adapterName, operation, parameters, context) => {
        try {
            switch (adapterName) {
                case 'seiAgentKit':
                    return this.seiAgentKitAdapter
                        ? await this.executeSAKOperation(operation, parameters, context)
                        : utils_js_1.EitherM.left('SeiAgentKit adapter not available');
                case 'hiveIntelligence':
                    return this.hiveIntelligenceAdapter
                        ? await this.executeHiveOperation(operation, parameters, context)
                        : utils_js_1.EitherM.left('HiveIntelligence adapter not available');
                case 'seiMCP':
                    return this.seiMCPAdapter
                        ? await this.executeMCPOperation(operation, parameters, context)
                        : utils_js_1.EitherM.left('SeiMCP adapter not available');
                default:
                    return utils_js_1.EitherM.left(`Unknown adapter: ${adapterName}`);
            }
        }
        catch (error) {
            return utils_js_1.EitherM.left(`Adapter operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    getAdapterHealth = () => {
        return {
            seiAgentKit: this.seiAgentKitAdapter ? 'healthy' : 'disabled',
            hiveIntelligence: this.hiveIntelligenceAdapter ? 'healthy' : 'disabled',
            seiMCP: this.seiMCPAdapter ? 'healthy' : 'disabled'
        };
    };
    validateIntent = (intent) => {
        if (!intent.type || !intent.action) {
            return utils_js_1.EitherM.left({
                type: 'validation_error',
                message: 'Intent must have type and action',
                details: { intent }
            });
        }
        return utils_js_1.EitherM.right(intent);
    };
    extractIntentActions = (intent) => {
        const actionMap = {
            lending: ['supply', 'borrow', 'withdraw', 'repay'],
            liquidity: ['add_liquidity', 'remove_liquidity', 'swap'],
            portfolio: ['show_positions', 'rebalance', 'analyze'],
            trading: ['buy', 'sell', 'limit_order'],
            analysis: ['analyze_market', 'generate_report'],
            info: ['get_rates', 'get_positions', 'get_balance'],
            risk: ['assess_risk', 'set_limits', 'check_health']
        };
        const possibleActions = actionMap[intent.type] || [];
        const matchingActions = possibleActions.filter(action => intent.action.toLowerCase().includes(action.toLowerCase()) ||
            action.toLowerCase().includes(intent.action.toLowerCase()));
        if (matchingActions.length === 0) {
            return utils_js_1.EitherM.left({
                type: 'unsupported_intent',
                message: `Action '${intent.action}' not supported for intent type '${intent.type}'`,
                details: { supportedActions: possibleActions }
            });
        }
        return utils_js_1.EitherM.right(matchingActions);
    };
    buildAnalyzedIntent = (intent, actions) => ({
        intent,
        confidence: this.calculateIntentConfidence(intent, actions),
        requiredActions: actions,
        estimatedComplexity: this.estimateComplexity(actions),
        risks: this.identifyRisks(intent, actions)
    });
    mapIntentToAgentType = (intentType) => {
        const mapping = {
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
    calculateMatchScore = (agent, analyzedIntent) => {
        const matchingCapabilities = agent.capabilities.filter(cap => analyzedIntent.requiredActions.includes(cap.action));
        return matchingCapabilities.length / analyzedIntent.requiredActions.length;
    };
    estimateExecutionTime = (capabilities, action) => {
        const capability = capabilities.find(cap => cap.action === action);
        return capability?.estimatedExecutionTime || 5000;
    };
    calculateIntentConfidence = (intent, actions) => {
        const exactMatch = actions.some(action => intent.action.toLowerCase() === action.toLowerCase());
        return exactMatch ? 0.9 : 0.7;
    };
    estimateComplexity = (actions) => {
        if (actions.length === 1)
            return 'low';
        if (actions.length <= 3)
            return 'medium';
        return 'high';
    };
    identifyRisks = (intent, actions) => {
        const risks = [];
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
    getSuggestedAlternatives = (agentType, action) => {
        const alternatives = this.agentRegistry.getAllAgents()
            .filter(agent => agent.type === agentType)
            .map(agent => agent.id);
        return alternatives.slice(0, 3);
    };
    mapIntentPriorityToTaskPriority = (priority) => {
        const mapping = {
            low: 1,
            medium: 2,
            high: 3,
            urgent: 4
        };
        return mapping[priority] || 2;
    };
    extractTaskDependencies = (analyzedIntent) => {
        return [];
    };
    updateTaskStatus = (taskId, status) => {
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
    isRecoverableError = (error) => {
        const recoverableErrors = ['timeout', 'network_error', 'temporary_unavailable'];
        return recoverableErrors.some(recoverable => error.toLowerCase().includes(recoverable));
    };
    emitEvent = (event) => {
        const handlers = this.eventHandlers.get(event.type) || [];
        handlers.forEach(handler => {
            try {
                handler(event);
            }
            catch (error) {
                console.error('Event handler error:', error);
            }
        });
    };
    generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    initializeAdapters = () => {
        try {
            if (this.config.adapters.seiAgentKit?.enabled && this.config.adapters.seiAgentKit.config) {
                this.seiAgentKitAdapter = new SeiAgentKitAdapter_js_1.SeiAgentKitAdapter({
                    id: 'sak-adapter',
                    name: 'Sei Agent Kit Adapter',
                    version: '1.0.0',
                    description: 'Sei blockchain operations adapter',
                    capabilities: ['blockchain', 'defi', 'trading'],
                    settings: {}
                }, this.config.adapters.seiAgentKit.config);
                this.adapterCapabilities.set('seiAgentKit', [
                    'get_token_balance', 'transfer_token', 'approve_token',
                    'takara_supply', 'takara_withdraw', 'takara_borrow', 'takara_repay',
                    'symphony_swap', 'dragonswap_add_liquidity', 'silo_stake'
                ]);
            }
            if (this.config.adapters.hiveIntelligence?.enabled && this.config.adapters.hiveIntelligence.config) {
                this.hiveIntelligenceAdapter = new HiveIntelligenceAdapter_js_1.HiveIntelligenceAdapter({
                    id: 'hive-adapter',
                    name: 'Hive Intelligence Adapter',
                    version: '1.0.0',
                    description: 'AI-powered blockchain analytics adapter',
                    capabilities: ['analytics', 'search', 'insights'],
                    settings: {}
                }, this.config.adapters.hiveIntelligence.config);
                this.adapterCapabilities.set('hiveIntelligence', [
                    'search', 'get_analytics', 'get_portfolio_analysis',
                    'get_market_insights', 'get_credit_analysis'
                ]);
            }
            if (this.config.adapters.seiMCP?.enabled && this.config.adapters.seiMCP.config) {
                this.seiMCPAdapter = new SeiMCPAdapter_js_1.SeiMCPAdapter({
                    id: 'mcp-adapter',
                    name: 'Sei MCP Adapter',
                    version: '1.0.0',
                    description: 'MCP protocol real-time data adapter',
                    capabilities: ['realtime', 'blockchain', 'contract'],
                    settings: {}
                }, this.config.adapters.seiMCP.config);
                this.adapterCapabilities.set('seiMCP', [
                    'get_blockchain_state', 'query_contract', 'execute_contract',
                    'get_wallet_balance', 'send_transaction', 'subscribe_events'
                ]);
            }
            this.emitEvent({
                type: 'adapters_initialized',
                timestamp: Date.now(),
                data: { adapters: Array.from(this.adapterCapabilities.keys()) }
            });
        }
        catch (error) {
            console.error('Failed to initialize adapters:', error);
            this.emitEvent({
                type: 'adapter_error',
                timestamp: Date.now(),
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    };
    stopAdapters = () => {
        try {
            this.seiAgentKitAdapter?.stop?.();
            this.hiveIntelligenceAdapter?.stop?.();
            this.seiMCPAdapter?.stop?.();
            this.emitEvent({
                type: 'adapters_stopped',
                timestamp: Date.now(),
                data: { adapters: Array.from(this.adapterCapabilities.keys()) }
            });
        }
        catch (error) {
            console.error('Error stopping adapters:', error);
        }
    };
    enrichActionsWithAdapterCapabilities = async (actions, intent) => {
        try {
            const enrichedActions = [...actions];
            if (this.seiAgentKitAdapter && this.isBlockchainIntent(intent)) {
                enrichedActions.push(...this.getSAKRelevantActions(intent));
            }
            if (this.hiveIntelligenceAdapter && this.isAnalyticsIntent(intent)) {
                enrichedActions.push(...this.getHiveRelevantActions(intent));
            }
            if (this.seiMCPAdapter && this.isRealTimeIntent(intent)) {
                enrichedActions.push(...this.getMCPRelevantActions(intent));
            }
            return utils_js_1.EitherM.right(enrichedActions);
        }
        catch (error) {
            return utils_js_1.EitherM.left({
                type: 'action_enrichment_failed',
                message: `Failed to enrich actions: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    };
    executeSAKOperation = async (operation, parameters, context) => {
        if (!this.seiAgentKitAdapter) {
            return utils_js_1.EitherM.left('SeiAgentKit adapter not initialized');
        }
        try {
            const result = await this.seiAgentKitAdapter.executeSAKTool(operation, parameters, context)();
            return result._tag === 'Right'
                ? utils_js_1.EitherM.right(result.right)
                : utils_js_1.EitherM.left(result.left.message);
        }
        catch (error) {
            return utils_js_1.EitherM.left(`SAK operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    executeHiveOperation = async (operation, parameters, context) => {
        if (!this.hiveIntelligenceAdapter) {
            return utils_js_1.EitherM.left('HiveIntelligence adapter not initialized');
        }
        try {
            let result;
            switch (operation) {
                case 'search':
                    result = await this.hiveIntelligenceAdapter.search(parameters.query, parameters.metadata)();
                    break;
                case 'get_analytics':
                    result = await this.hiveIntelligenceAdapter.getAnalytics(parameters.query, parameters.metadata)();
                    break;
                default:
                    return utils_js_1.EitherM.left(`Unknown Hive operation: ${operation}`);
            }
            return result._tag === 'Right'
                ? utils_js_1.EitherM.right(result.right)
                : utils_js_1.EitherM.left(result.left.message);
        }
        catch (error) {
            return utils_js_1.EitherM.left(`Hive operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    executeMCPOperation = async (operation, parameters, context) => {
        if (!this.seiMCPAdapter) {
            return utils_js_1.EitherM.left('SeiMCP adapter not initialized');
        }
        try {
            let result;
            switch (operation) {
                case 'get_blockchain_state':
                    result = await this.seiMCPAdapter.getBlockchainState()();
                    break;
                case 'query_contract':
                    result = await this.seiMCPAdapter.queryContract(parameters.contractAddress, parameters.query)();
                    break;
                default:
                    return utils_js_1.EitherM.left(`Unknown MCP operation: ${operation}`);
            }
            return result._tag === 'Right'
                ? utils_js_1.EitherM.right(result.right)
                : utils_js_1.EitherM.left(result.left.message);
        }
        catch (error) {
            return utils_js_1.EitherM.left(`MCP operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    isBlockchainIntent = (intent) => {
        const blockchainKeywords = ['swap', 'supply', 'borrow', 'stake', 'token', 'balance', 'transfer'];
        return blockchainKeywords.some(keyword => intent.action.toLowerCase().includes(keyword) ||
            intent.type === 'lending' ||
            intent.type === 'liquidity' ||
            intent.type === 'trading');
    };
    isAnalyticsIntent = (intent) => {
        const analyticsKeywords = ['analyze', 'insight', 'report', 'trend', 'performance'];
        return analyticsKeywords.some(keyword => intent.action.toLowerCase().includes(keyword) ||
            intent.type === 'analysis');
    };
    isRealTimeIntent = (intent) => {
        const realTimeKeywords = ['current', 'latest', 'live', 'monitor', 'watch'];
        return realTimeKeywords.some(keyword => intent.action.toLowerCase().includes(keyword) ||
            intent.type === 'info');
    };
    getSAKRelevantActions = (intent) => {
        const sakActions = [];
        if (intent.type === 'lending') {
            sakActions.push('takara_supply', 'takara_withdraw', 'takara_borrow', 'takara_repay');
        }
        if (intent.type === 'liquidity') {
            sakActions.push('dragonswap_add_liquidity', 'dragonswap_remove_liquidity');
        }
        if (intent.type === 'trading') {
            sakActions.push('symphony_swap', 'symphony_get_quote');
        }
        if (intent.action.includes('balance')) {
            sakActions.push('get_token_balance', 'get_native_balance');
        }
        if (intent.action.includes('transfer')) {
            sakActions.push('transfer_token', 'approve_token');
        }
        return sakActions;
    };
    getHiveRelevantActions = (intent) => {
        const hiveActions = [];
        if (intent.type === 'analysis') {
            hiveActions.push('get_analytics', 'get_market_insights');
        }
        if (intent.type === 'portfolio') {
            hiveActions.push('get_portfolio_analysis', 'get_credit_analysis');
        }
        if (intent.action.includes('search')) {
            hiveActions.push('search');
        }
        return hiveActions;
    };
    getMCPRelevantActions = (intent) => {
        const mcpActions = [];
        if (intent.type === 'info') {
            mcpActions.push('get_blockchain_state', 'get_wallet_balance');
        }
        if (intent.action.includes('contract')) {
            mcpActions.push('query_contract', 'execute_contract');
        }
        if (intent.action.includes('transaction')) {
            mcpActions.push('send_transaction');
        }
        return mcpActions;
    };
}
exports.Orchestrator = Orchestrator;
const analyzeIntent = (intent) => {
    if (!intent.type || !intent.action) {
        return utils_js_1.EitherM.left({
            type: 'validation_error',
            message: 'Intent must have type and action'
        });
    }
    return utils_js_1.EitherM.right({
        intent,
        confidence: 0.8,
        requiredActions: [intent.action],
        estimatedComplexity: 'medium',
        risks: []
    });
};
exports.analyzeIntent = analyzeIntent;
const scoreAgentMatch = (agent, intent) => {
    const matchingCapabilities = agent.capabilities.filter(cap => intent.requiredActions.includes(cap.action));
    return matchingCapabilities.length / intent.requiredActions.length;
};
exports.scoreAgentMatch = scoreAgentMatch;
exports.orchestrate = (0, index_js_1.pipe)(exports.analyzeIntent);
//# sourceMappingURL=core.js.map