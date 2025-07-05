"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRouter = void 0;
const index_js_1 = require("../types/index.js");
const utils_js_1 = require("../types/utils.js");
const SeiAgentKitAdapter_js_1 = require("../agents/adapters/SeiAgentKitAdapter.js");
const HiveIntelligenceAdapter_js_1 = require("../agents/adapters/HiveIntelligenceAdapter.js");
const SeiMCPAdapter_js_1 = require("../agents/adapters/SeiMCPAdapter.js");
class MessageRouter {
    state;
    config;
    messageQueue = [];
    processingMessages = new Set();
    adapterProcessingQueue = new Set();
    constructor(config) {
        this.config = config;
        this.state = {
            pendingMessages: {},
            messageHandlers: this.createDefaultHandlers(),
            routingRules: [],
            adapterInstances: {},
            adapterMessageQueue: []
        };
    }
    routeMessage = async (message) => {
        const validationResult = this.validateMessage(message);
        if (validationResult._tag === 'Left') {
            return validationResult;
        }
        if (this.processingMessages.size >= this.config.maxConcurrentMessages) {
            this.messageQueue.push(message);
            return utils_js_1.EitherM.left('Message queued - at concurrent limit');
        }
        return this.processMessage(message);
    };
    routeMessages = async (messages) => {
        if (!this.config.enableParallelExecution) {
            const results = [];
            for (const message of messages) {
                results.push(await this.routeMessage(message));
            }
            return results;
        }
        return utils_js_1.AsyncUtils.mapWithConcurrency(messages, (message) => this.routeMessage(message), this.config.maxConcurrentMessages);
    };
    addRoutingRule = (rule) => {
        if (this.state.routingRules.some(r => r.messageType === rule.messageType && r.priority === rule.priority)) {
            return utils_js_1.EitherM.left('Routing rule with same type and priority already exists');
        }
        this.state = {
            ...this.state,
            routingRules: [
                ...this.state.routingRules,
                rule
            ].sort((a, b) => b.priority - a.priority)
        };
        return utils_js_1.EitherM.right(undefined);
    };
    registerHandler = (messageType, handler) => {
        this.state = {
            ...this.state,
            messageHandlers: {
                ...this.state.messageHandlers,
                [messageType]: handler
            }
        };
        return utils_js_1.EitherM.right(undefined);
    };
    sendTaskRequest = async (task, agent) => {
        const request = {
            id: this.generateMessageId(),
            type: 'task_request',
            senderId: 'orchestrator',
            receiverId: agent.id,
            payload: {
                task,
                context: {}
            },
            timestamp: Date.now()
        };
        const result = await this.routeMessage(request);
        return (0, index_js_1.pipe)(result, utils_js_1.EitherM.flatMap((response) => {
            if (this.isTaskResponse(response)) {
                return utils_js_1.EitherM.right(response.payload);
            }
            return utils_js_1.EitherM.left('Invalid task response format');
        }));
    };
    broadcastMessage = async (message, agentIds) => {
        const messages = agentIds.map(agentId => ({
            ...message,
            id: this.generateMessageId(),
            receiverId: agentId
        }));
        return this.routeMessages(messages);
    };
    getPendingMessageCount = () => Object.keys(this.state.pendingMessages).length;
    getQueueLength = () => this.messageQueue.length;
    registerAdapter = (id, type, instance) => {
        if (this.state.adapterInstances[id]) {
            return utils_js_1.EitherM.left(`Adapter ${id} already registered`);
        }
        const adapterInstance = {
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
        return utils_js_1.EitherM.right(undefined);
    };
    unregisterAdapter = (id) => {
        if (!this.state.adapterInstances[id]) {
            return utils_js_1.EitherM.left(`Adapter ${id} not found`);
        }
        const { [id]: removed, ...remainingAdapters } = this.state.adapterInstances;
        this.state = {
            ...this.state,
            adapterInstances: remainingAdapters
        };
        return utils_js_1.EitherM.right(undefined);
    };
    routeAdapterOperation = async (adapterType, operation, parameters, context, priority = 1) => {
        if (!this.config.adapterRouting.enableAdapterMessages) {
            return utils_js_1.EitherM.left('Adapter message routing is disabled');
        }
        if (this.adapterProcessingQueue.size >= this.config.adapterRouting.maxConcurrentAdapterCalls) {
            const adapterMessage = {
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
            return utils_js_1.EitherM.left('Adapter operation queued - at concurrent limit');
        }
        return this.processAdapterOperation(adapterType, operation, parameters, context, priority);
    };
    routeAdapterOperationsParallel = async (operations) => {
        if (!this.config.enableParallelExecution) {
            const results = [];
            for (const op of operations) {
                results.push(await this.routeAdapterOperation(op.adapterType, op.operation, op.parameters, op.context, op.priority || 1));
            }
            return results;
        }
        return utils_js_1.AsyncUtils.mapWithConcurrency(operations, (op) => this.routeAdapterOperation(op.adapterType, op.operation, op.parameters, op.context, op.priority || 1), this.config.adapterRouting.maxConcurrentAdapterCalls);
    };
    processAdapterQueue = async () => {
        while (this.state.adapterMessageQueue.length > 0 &&
            this.adapterProcessingQueue.size < this.config.adapterRouting.maxConcurrentAdapterCalls) {
            const sortedQueue = [...this.state.adapterMessageQueue].sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.timestamp - b.timestamp;
            });
            const nextMessage = sortedQueue[0];
            if (nextMessage) {
                this.state = {
                    ...this.state,
                    adapterMessageQueue: this.state.adapterMessageQueue.filter(msg => msg.id !== nextMessage.id)
                };
                this.processAdapterOperation(nextMessage.adapterType, nextMessage.operation, nextMessage.parameters, nextMessage.context, nextMessage.priority).catch(console.error);
            }
        }
    };
    getAdapterLoadInfo = () => {
        const loadInfo = {};
        const adapterTypes = ['seiAgentKit', 'hiveIntelligence', 'seiMCP'];
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
    updateAdapterHealth = (id, isHealthy) => {
        const adapter = this.state.adapterInstances[id];
        if (!adapter) {
            return utils_js_1.EitherM.left(`Adapter ${id} not found`);
        }
        this.state = {
            ...this.state,
            adapterInstances: {
                ...this.state.adapterInstances,
                [id]: { ...adapter, isHealthy }
            }
        };
        return utils_js_1.EitherM.right(undefined);
    };
    processQueue = async () => {
        while (this.messageQueue.length > 0 &&
            this.processingMessages.size < this.config.maxConcurrentMessages) {
            const message = this.messageQueue.shift();
            if (message) {
                this.processMessage(message).catch(console.error);
            }
        }
        await this.processAdapterQueue();
    };
    processAdapterOperation = async (adapterType, operation, parameters, context, priority = 1) => {
        const operationId = this.generateMessageId();
        this.adapterProcessingQueue.add(operationId);
        try {
            const adapter = this.findBestAdapterForOperation(adapterType);
            if (!adapter) {
                return utils_js_1.EitherM.left(`No healthy ${adapterType} adapter available`);
            }
            this.incrementAdapterOperations(adapter.id);
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve(utils_js_1.EitherM.left('Adapter operation timeout'));
                }, this.config.adapterRouting.adapterTimeout);
            });
            const operationPromise = this.executeAdapterOperation(adapter, operation, parameters, context);
            const result = await Promise.race([operationPromise, timeoutPromise]);
            this.updateAdapterLastUsed(adapter.id);
            return result;
        }
        finally {
            this.adapterProcessingQueue.delete(operationId);
        }
    };
    executeAdapterOperation = async (adapter, operation, parameters, context) => {
        try {
            let result;
            if (adapter.instance instanceof SeiAgentKitAdapter_js_1.SeiAgentKitAdapter) {
                result = await adapter.instance.executeSAKTool(operation, parameters, context)();
            }
            else if (adapter.instance instanceof HiveIntelligenceAdapter_js_1.HiveIntelligenceAdapter) {
                switch (operation) {
                    case 'search':
                        result = await adapter.instance.search(parameters.query, parameters.metadata)();
                        break;
                    case 'get_analytics':
                        result = await adapter.instance.getAnalytics(parameters.query, parameters.metadata)();
                        break;
                    default:
                        return utils_js_1.EitherM.left(`Unknown Hive operation: ${operation}`);
                }
            }
            else if (adapter.instance instanceof SeiMCPAdapter_js_1.SeiMCPAdapter) {
                switch (operation) {
                    case 'get_blockchain_state':
                        result = await adapter.instance.getBlockchainState()();
                        break;
                    case 'query_contract':
                        result = await adapter.instance.queryContract(parameters.contractAddress, parameters.query)();
                        break;
                    default:
                        return utils_js_1.EitherM.left(`Unknown MCP operation: ${operation}`);
                }
            }
            else {
                return utils_js_1.EitherM.left('Unknown adapter type');
            }
            return result._tag === 'Right'
                ? utils_js_1.EitherM.right(result.right)
                : utils_js_1.EitherM.left(result.left.message || 'Adapter operation failed');
        }
        catch (error) {
            return utils_js_1.EitherM.left(`Adapter operation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            this.decrementAdapterOperations(adapter.id);
        }
    };
    findBestAdapterForOperation = (adapterType) => {
        const candidates = Object.entries(this.state.adapterInstances)
            .filter(([_, adapter]) => adapter.type === adapterType && adapter.isHealthy)
            .map(([id, adapter]) => ({ id, ...adapter }));
        if (candidates.length === 0) {
            return null;
        }
        candidates.sort((a, b) => {
            if (a.activeOperations !== b.activeOperations) {
                return a.activeOperations - b.activeOperations;
            }
            return a.lastUsed - b.lastUsed;
        });
        return candidates[0];
    };
    incrementAdapterOperations = (adapterId) => {
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
    decrementAdapterOperations = (adapterId) => {
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
    updateAdapterLastUsed = (adapterId) => {
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
    processMessage = async (message) => {
        this.processingMessages.add(message.id);
        try {
            const handler = this.findMessageHandler(message);
            if (!handler) {
                return utils_js_1.EitherM.left(`No handler found for message type: ${message.type}`);
            }
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve(utils_js_1.EitherM.left('Message processing timeout'));
                }, this.config.messageTimeout);
            });
            const processingPromise = this.executeWithRetry(message, handler);
            const result = await Promise.race([processingPromise, timeoutPromise]);
            return result;
        }
        finally {
            this.processingMessages.delete(message.id);
            this.processQueue();
        }
    };
    executeWithRetry = async (message, handler) => {
        let lastError = '';
        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const result = await handler(message);
                if (result._tag === 'Right') {
                    return result;
                }
                lastError = result.left;
                if (attempt < this.config.retryAttempts) {
                    const backoffMs = Math.pow(this.config.backoffMultiplier, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
            }
        }
        return utils_js_1.EitherM.left(`Failed after ${this.config.retryAttempts + 1} attempts: ${lastError}`);
    };
    findMessageHandler = (message) => {
        for (const rule of this.state.routingRules) {
            if (rule.messageType === message.type && rule.condition(message)) {
                return rule.handler;
            }
        }
        return this.state.messageHandlers[message.type] || null;
    };
    validateMessage = (message) => {
        if (!message.id || message.id.trim() === '') {
            return utils_js_1.EitherM.left('Message ID is required');
        }
        if (!message.senderId || message.senderId.trim() === '') {
            return utils_js_1.EitherM.left('Sender ID is required');
        }
        if (!message.receiverId || message.receiverId.trim() === '') {
            return utils_js_1.EitherM.left('Receiver ID is required');
        }
        if (!message.type) {
            return utils_js_1.EitherM.left('Message type is required');
        }
        return utils_js_1.EitherM.right(message);
    };
    createDefaultHandlers = () => ({
        task_request: this.handleTaskRequest,
        task_response: this.handleTaskResponse,
        health_check: this.handleHealthCheck,
        status_update: this.handleStatusUpdate,
        error_report: this.handleErrorReport,
        capability_update: this.handleCapabilityUpdate
    });
    handleTaskRequest = async (message) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(utils_js_1.EitherM.right({
                    type: 'task_response',
                    payload: {
                        taskId: message.payload?.task?.id || 'unknown',
                        status: 'completed',
                        result: { success: true },
                        executionTime: Math.random() * 1000,
                        metadata: {}
                    }
                }));
            }, Math.random() * 500 + 100);
        });
    };
    handleTaskResponse = async (message) => {
        return utils_js_1.EitherM.right(message.payload);
    };
    handleHealthCheck = async (message) => {
        return utils_js_1.EitherM.right({
            agentId: message.senderId,
            status: 'healthy',
            timestamp: Date.now()
        });
    };
    handleStatusUpdate = async (message) => {
        return utils_js_1.EitherM.right(message.payload);
    };
    handleErrorReport = async (message) => {
        console.error('Agent error report:', message.payload);
        return utils_js_1.EitherM.right({ acknowledged: true });
    };
    handleCapabilityUpdate = async (message) => {
        return utils_js_1.EitherM.right(message.payload);
    };
    isTaskResponse = (obj) => {
        return typeof obj === 'object' &&
            obj !== null &&
            'type' in obj &&
            obj.type === 'task_response';
    };
    generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
exports.MessageRouter = MessageRouter;
//# sourceMappingURL=router.js.map