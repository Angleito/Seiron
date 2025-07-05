"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const tslib_1 = require("tslib");
const Either_1 = require("fp-ts/Either");
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const function_1 = require("fp-ts/function");
const events_1 = require("events");
class BaseAgent extends events_1.EventEmitter {
    config;
    state;
    actions = new Map();
    plugins = new Map();
    rateLimits = new Map();
    communicationProtocol;
    startTime = new Date();
    constructor(config) {
        super();
        this.config = config;
        this.state = this.initializeState();
        this.setupEventHandlers();
    }
    initializeState() {
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
    setupEventHandlers() {
        this.on('action:executed', this.updateMetrics.bind(this));
        this.on('error', this.handleError.bind(this));
        this.on('state:changed', this.persistState.bind(this));
    }
    start() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.setState({ status: 'active' });
            await this.initializePlugins();
            this.emit('agent:started', { agentId: this.config.id });
        }, (error) => this.createError('AGENT_START_FAILED', `Failed to start agent: ${error}`)));
    }
    stop() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.setState({ status: 'idle' });
            await this.cleanupPlugins();
            this.emit('agent:stopped', { agentId: this.config.id });
        }, (error) => this.createError('AGENT_STOP_FAILED', `Failed to stop agent: ${error}`)));
    }
    pause() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.setState({ status: 'paused' });
            this.emit('agent:paused', { agentId: this.config.id });
        }, (error) => this.createError('AGENT_PAUSE_FAILED', `Failed to pause agent: ${error}`)));
    }
    resume() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.setState({ status: 'active' });
            this.emit('agent:resumed', { agentId: this.config.id });
        }, (error) => this.createError('AGENT_RESUME_FAILED', `Failed to resume agent: ${error}`)));
    }
    registerAction(action) {
        try {
            if (this.actions.has(action.id)) {
                return (0, Either_1.left)(this.createError('ACTION_EXISTS', `Action ${action.id} already registered`));
            }
            this.actions.set(action.id, action);
            this.emit('action:registered', { actionId: action.id, agentId: this.config.id });
            return (0, Either_1.right)(undefined);
        }
        catch (error) {
            return (0, Either_1.left)(this.createError('ACTION_REGISTRATION_FAILED', `Failed to register action: ${error}`));
        }
    }
    executeAction(actionId, context) {
        const action = this.actions.get(actionId);
        if (!action) {
            return TE.left(this.createError('ACTION_NOT_FOUND', `Action ${actionId} not found`));
        }
        return (0, function_1.pipe)(this.validateActionContext(action, context), TE.fromEither, TE.chain(() => this.checkRateLimit(action)), TE.chain(() => this.executeActionWithMetrics(action, context)));
    }
    installPlugin(plugin) {
        if (this.plugins.has(plugin.id)) {
            return TE.left(this.createError('PLUGIN_EXISTS', `Plugin ${plugin.id} already installed`));
        }
        return (0, function_1.pipe)(plugin.initialize(this), TE.map(() => {
            this.plugins.set(plugin.id, plugin);
            this.emit('plugin:installed', { pluginId: plugin.id, agentId: this.config.id });
        }));
    }
    uninstallPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            return TE.left(this.createError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`));
        }
        const cleanup = plugin.cleanup || (() => TE.right(undefined));
        return (0, function_1.pipe)(cleanup(), TE.map(() => {
            this.plugins.delete(pluginId);
            this.emit('plugin:uninstalled', { pluginId, agentId: this.config.id });
        }));
    }
    setCommunicationProtocol(protocol) {
        this.communicationProtocol = protocol;
        this.emit('communication:protocol:set', { agentId: this.config.id });
    }
    sendMessage(message) {
        if (!this.communicationProtocol) {
            return TE.left(this.createError('NO_COMMUNICATION_PROTOCOL', 'No communication protocol set'));
        }
        return this.communicationProtocol.send(message);
    }
    getState() {
        return { ...this.state };
    }
    getConfig() {
        return { ...this.config };
    }
    getMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        return {
            ...this.state.metrics,
            uptime
        };
    }
    setState(updates) {
        this.state = {
            ...this.state,
            ...updates,
            lastUpdate: new Date()
        };
        this.emit('state:changed', { agentId: this.config.id, state: this.state });
    }
    createError(code, message, details) {
        return {
            code,
            message,
            details,
            timestamp: new Date(),
            agentId: this.config.id
        };
    }
    validateActionContext(action, context) {
        if (!action.validation) {
            return (0, Either_1.right)(undefined);
        }
        for (const rule of action.validation) {
            const value = context.parameters[rule.field];
            if (rule.required && (value === undefined || value === null)) {
                return (0, Either_1.left)(this.createError('VALIDATION_FAILED', `Required field ${rule.field} is missing`));
            }
            if (value !== undefined && typeof value !== rule.type) {
                return (0, Either_1.left)(this.createError('VALIDATION_FAILED', `Field ${rule.field} must be of type ${rule.type}`));
            }
            if (rule.validator && !rule.validator(value)) {
                return (0, Either_1.left)(this.createError('VALIDATION_FAILED', rule.message || `Validation failed for ${rule.field}`));
            }
        }
        return (0, Either_1.right)(undefined);
    }
    checkRateLimit(action) {
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
    executeActionWithMetrics(action, context) {
        const startTime = Date.now();
        return (0, function_1.pipe)(action.handler(context), TE.map((result) => {
            const duration = Date.now() - startTime;
            this.emit('action:executed', {
                actionId: action.id,
                duration,
                success: result.success,
                agentId: this.config.id
            });
            return result;
        }), TE.mapLeft((error) => {
            const duration = Date.now() - startTime;
            this.emit('action:failed', {
                actionId: action.id,
                duration,
                error,
                agentId: this.config.id
            });
            return error;
        }));
    }
    async initializePlugins() {
        for (const [id, plugin] of this.plugins) {
            try {
                await plugin.initialize(this)();
            }
            catch (error) {
                this.emit('error', this.createError('PLUGIN_INIT_FAILED', `Failed to initialize plugin ${id}: ${error}`));
            }
        }
    }
    async cleanupPlugins() {
        for (const [id, plugin] of this.plugins) {
            try {
                if (plugin.cleanup) {
                    await plugin.cleanup()();
                }
            }
            catch (error) {
                this.emit('error', this.createError('PLUGIN_CLEANUP_FAILED', `Failed to cleanup plugin ${id}: ${error}`));
            }
        }
    }
    updateMetrics(event) {
        const metrics = { ...this.state.metrics };
        metrics.actionsExecuted++;
        if (event.success) {
            const totalResponseTime = metrics.avgResponseTime * (metrics.actionsExecuted - 1) + event.duration;
            metrics.avgResponseTime = totalResponseTime / metrics.actionsExecuted;
        }
        else {
            metrics.errorCount++;
        }
        metrics.successRate = (metrics.actionsExecuted - metrics.errorCount) / metrics.actionsExecuted;
        this.setState({ metrics });
    }
    handleError(error) {
        console.error(`Agent ${this.config.id} error:`, error);
        if (error.code === 'CRITICAL_ERROR') {
            this.setState({ status: 'error' });
        }
    }
    persistState() {
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=BaseAgent.js.map