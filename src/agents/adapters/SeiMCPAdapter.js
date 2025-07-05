"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeiMCPAdapter = void 0;
const tslib_1 = require("tslib");
const Either_1 = require("fp-ts/Either");
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const function_1 = require("fp-ts/function");
const BaseAgent_1 = require("../base/BaseAgent");
const WebSocket = tslib_1.__importStar(require("ws"));
const events_1 = require("events");
class MCPConnectionManager extends events_1.EventEmitter {
    ws = null;
    config;
    isConnected = false;
    reconnectAttempts = 0;
    heartbeatInterval = null;
    messageId = 0;
    pendingRequests = new Map();
    constructor(config) {
        super();
        this.config = config;
    }
    connect() {
        return new Promise((resolve, reject) => {
            const protocol = this.config.secure ? 'wss' : 'ws';
            const url = `${protocol}://${this.config.endpoint}:${this.config.port}`;
            this.ws = new WebSocket(url, {
                headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : undefined
            });
            const connectionTimeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, this.config.connectionTimeout);
            this.ws.on('open', () => {
                clearTimeout(connectionTimeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.emit('connected');
                resolve();
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data.toString());
            });
            this.ws.on('close', () => {
                this.isConnected = false;
                this.stopHeartbeat();
                this.emit('disconnected');
                this.attemptReconnection();
            });
            this.ws.on('error', (error) => {
                this.emit('error', error);
                if (!this.isConnected) {
                    clearTimeout(connectionTimeout);
                    reject(error);
                }
            });
        });
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
            this.stopHeartbeat();
        }
    }
    sendMessage(message) {
        if (!this.isConnected || !this.ws) {
            return Promise.reject(new Error('Not connected to MCP server'));
        }
        return new Promise((resolve, reject) => {
            const messageId = this.generateMessageId();
            const fullMessage = { ...message, id: messageId };
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(messageId);
                reject(new Error('Request timeout'));
            }, 30000);
            this.pendingRequests.set(messageId, { resolve, reject, timeout });
            this.ws.send(JSON.stringify(fullMessage));
        });
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            if (message.type === 'response' && this.pendingRequests.has(message.id)) {
                const pending = this.pendingRequests.get(message.id);
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error.message));
                }
                else {
                    pending.resolve(message.result);
                }
            }
            else if (message.type === 'event') {
                this.emit('event', message);
            }
            else if (message.type === 'notification') {
                this.emit('notification', message);
            }
        }
        catch (error) {
            this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.ws) {
                this.ws.ping();
            }
        }, this.config.heartbeatInterval);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    attemptReconnection() {
        if (this.reconnectAttempts < this.config.retryAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connect().catch(() => {
                });
            }, this.config.retryDelay * this.reconnectAttempts);
        }
        else {
            this.emit('reconnectFailed');
        }
    }
    generateMessageId() {
        return `mcp-${Date.now()}-${++this.messageId}`;
    }
    isConnectedToServer() {
        return this.isConnected;
    }
}
class DragonBallThemeManager {
    static POWER_LEVELS = {
        low: { min: 0, max: 1000, tier: 'Earthling' },
        medium: { min: 1000, max: 10000, tier: 'Elite Warrior' },
        high: { min: 10000, max: 100000, tier: 'Super Saiyan' },
        legendary: { min: 100000, max: 1000000, tier: 'Legendary Super Saiyan' },
        ultra: { min: 1000000, max: Infinity, tier: 'Ultra Instinct' }
    };
    static THEMED_RESPONSES = {
        balance: {
            low: "Your wallet's power level is over 9000! Well, maybe not quite, but you're building your strength!",
            medium: "Your portfolio is showing the strength of a true warrior! Keep training!",
            high: "Incredible! Your holdings rival that of a Super Saiyan! The markets bow before your power!",
            legendary: "LEGENDARY! Your portfolio has achieved Super Saiyan status! Even Vegeta would be impressed!",
            ultra: "ULTRA INSTINCT ACTIVATED! Your portfolio transcends mortal understanding!"
        },
        transaction: {
            success: "Transaction successful! Your ki energy has been successfully transferred across the blockchain!",
            pending: "Your transaction is gathering energy like a Spirit Bomb... Please wait for confirmation!",
            failed: "Transaction failed! It seems the blockchain's power level was too high. Try again with more gas!"
        },
        contract: {
            success: "Contract interaction complete! You've successfully channeled your energy into the smart contract!",
            failed: "Contract interaction failed! The contract's defense was too strong. Check your parameters!"
        }
    };
    static generateThemedResponse(operation, success, powerLevel, data) {
        const tier = this.getPowerLevelTier(powerLevel);
        switch (operation) {
            case 'balance':
                return this.THEMED_RESPONSES.balance[tier];
            case 'transaction':
                return success ? this.THEMED_RESPONSES.transaction.success : this.THEMED_RESPONSES.transaction.failed;
            case 'contract':
                return success ? this.THEMED_RESPONSES.contract.success : this.THEMED_RESPONSES.contract.failed;
            default:
                return success ?
                    `Operation successful! Your power level continues to grow!` :
                    `Operation failed! Train harder and try again!`;
        }
    }
    static getPowerLevelTier(powerLevel) {
        for (const [tier, range] of Object.entries(this.POWER_LEVELS)) {
            if (powerLevel >= range.min && powerLevel < range.max) {
                return tier;
            }
        }
        return 'legendary';
    }
    static calculatePowerLevel(portfolioValue) {
        return Math.floor(portfolioValue * 100);
    }
}
class SeiMCPAdapter extends BaseAgent_1.BaseAgent {
    mcpConfig;
    connectionManager;
    availableTools = new Map();
    dragonBallTheme;
    cache = new Map();
    constructor(config, mcpConfig) {
        super(config);
        this.mcpConfig = mcpConfig;
        this.connectionManager = new MCPConnectionManager(mcpConfig);
        this.dragonBallTheme = new DragonBallThemeManager();
        this.setupConnectionEventHandlers();
        this.registerMCPActions();
    }
    async connectToMCP() {
        await this.connectionManager.connect();
        await this.loadAvailableTools();
    }
    disconnectFromMCP() {
        this.connectionManager.disconnect();
    }
    getBlockchainState() {
        return this.executeMCPTool('get_blockchain_state', {});
    }
    getWalletBalance(address) {
        return this.executeMCPTool('get_wallet_balance', { address });
    }
    getTokenBalances(address, tokens) {
        return this.executeMCPTool('get_token_balances', { address, tokens });
    }
    sendTransaction(request) {
        return this.executeMCPTool('send_transaction', request);
    }
    getTransactionHistory(address, limit = 50) {
        return this.executeMCPTool('get_transaction_history', { address, limit });
    }
    getTransactionStatus(txHash) {
        return this.executeMCPTool('get_transaction_status', { txHash });
    }
    queryContract(query) {
        return this.executeMCPTool('query_contract', query);
    }
    executeContract(interaction) {
        return this.executeMCPTool('execute_contract', interaction);
    }
    getContractState(address) {
        return this.executeMCPTool('get_contract_state', { address });
    }
    getTokenMetadata(denom) {
        return this.executeMCPTool('get_token_metadata', { denom });
    }
    subscribeToEvents(eventTypes, filters) {
        return this.executeMCPTool('subscribe_events', { eventTypes, filters });
    }
    unsubscribeFromEvents(eventTypes) {
        return this.executeMCPTool('unsubscribe_events', { eventTypes });
    }
    executeMCPTool(toolName, params, context) {
        return (0, function_1.pipe)(this.validateToolExists(toolName), TE.fromEither, TE.chain(() => this.createMCPContext(context)), TE.chain(mcpContext => this.executeToolWithContext(toolName, params, mcpContext)));
    }
    validateToolExists(toolName) {
        const tool = this.availableTools.get(toolName);
        if (!tool) {
            return (0, Either_1.left)(this.createError('TOOL_NOT_FOUND', `MCP tool '${toolName}' not found`));
        }
        return (0, Either_1.right)(tool);
    }
    createMCPContext(contextOverride) {
        return TE.right({
            chainId: this.mcpConfig.network === 'mainnet' ? 'sei-1' : 'sei-devnet-1',
            network: this.mcpConfig.network,
            permissions: ['read', 'write'],
            sessionId: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            gasPreference: 'medium',
            dragonBallMode: true,
            powerLevel: 9000,
            ...contextOverride
        });
    }
    executeToolWithContext(toolName, params, context) {
        const cacheKey = this.getCacheKey(toolName, params);
        if (this.isReadOperation(toolName)) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return TE.right(cached);
            }
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const message = {
                id: '',
                type: 'request',
                method: toolName,
                params: { ...params, context },
                timestamp: Date.now()
            };
            const result = await this.connectionManager.sendMessage(message);
            if (this.isReadOperation(toolName)) {
                this.setInCache(cacheKey, result, 60000);
            }
            return result;
        }, error => this.createError('MCP_EXECUTION_FAILED', `Failed to execute MCP tool: ${error}`)), TE.map(result => this.addDragonBallTheming(toolName, result, context)));
    }
    addDragonBallTheming(toolName, result, context) {
        if (!context.dragonBallMode) {
            return result;
        }
        const mcpResult = result;
        if (mcpResult && typeof mcpResult === 'object' && mcpResult.metadata) {
            const powerLevel = context.powerLevel || 9000;
            const themedMessage = DragonBallThemeManager.generateThemedResponse(toolName, mcpResult.success !== false, powerLevel, mcpResult.data);
            mcpResult.metadata.dragonBallMessage = themedMessage;
        }
        return result;
    }
    setupConnectionEventHandlers() {
        this.connectionManager.on('connected', () => {
            this.emit('mcp:connected');
        });
        this.connectionManager.on('disconnected', () => {
            this.emit('mcp:disconnected');
        });
        this.connectionManager.on('error', (error) => {
            this.emit('mcp:error', error);
        });
        this.connectionManager.on('event', (event) => {
            this.emit('mcp:event', event);
        });
    }
    async loadAvailableTools() {
        try {
            const message = {
                id: '',
                type: 'request',
                method: 'list_tools',
                params: {},
                timestamp: Date.now()
            };
            const tools = await this.connectionManager.sendMessage(message);
            if (Array.isArray(tools)) {
                tools.forEach((tool) => {
                    this.availableTools.set(tool.name, tool);
                });
            }
        }
        catch (error) {
            throw new Error(`Failed to load MCP tools: ${error}`);
        }
    }
    registerMCPActions() {
        const actions = [
            {
                id: 'get_blockchain_state',
                name: 'Get Blockchain State',
                description: 'Get current blockchain state with Saiyan power readings',
                handler: this.handleGetBlockchainState.bind(this),
                validation: []
            },
            {
                id: 'get_wallet_balance',
                name: 'Get Wallet Balance',
                description: 'Check your wallet power level (balance)',
                handler: this.handleGetWalletBalance.bind(this),
                validation: [
                    { field: 'address', required: true, type: 'string' }
                ]
            },
            {
                id: 'send_transaction',
                name: 'Send Transaction',
                description: 'Channel your ki energy into a transaction',
                handler: this.handleSendTransaction.bind(this),
                validation: [
                    { field: 'from', required: true, type: 'string' },
                    { field: 'to', required: true, type: 'string' },
                    { field: 'amount', required: true, type: 'string' },
                    { field: 'denom', required: true, type: 'string' }
                ]
            },
            {
                id: 'query_contract',
                name: 'Query Smart Contract',
                description: 'Probe the smart contract with your scouter',
                handler: this.handleQueryContract.bind(this),
                validation: [
                    { field: 'contractAddress', required: true, type: 'string' },
                    { field: 'query', required: true, type: 'object' }
                ]
            },
            {
                id: 'execute_contract',
                name: 'Execute Smart Contract',
                description: 'Unleash your power on the smart contract',
                handler: this.handleExecuteContract.bind(this),
                validation: [
                    { field: 'contractAddress', required: true, type: 'string' },
                    { field: 'method', required: true, type: 'string' },
                    { field: 'args', required: true, type: 'object' },
                    { field: 'sender', required: true, type: 'string' }
                ]
            },
            {
                id: 'get_transaction_history',
                name: 'Get Transaction History',
                description: 'Review your battle history on the blockchain',
                handler: this.handleGetTransactionHistory.bind(this),
                validation: [
                    { field: 'address', required: true, type: 'string' },
                    { field: 'limit', required: false, type: 'number' }
                ]
            },
            {
                id: 'subscribe_events',
                name: 'Subscribe to Events',
                description: 'Tune your scouter to detect blockchain events',
                handler: this.handleSubscribeEvents.bind(this),
                validation: [
                    { field: 'eventTypes', required: true, type: 'array' },
                    { field: 'filters', required: false, type: 'object' }
                ]
            }
        ];
        actions.forEach(action => {
            this.registerAction(action);
        });
    }
    handleGetBlockchainState(context) {
        return (0, function_1.pipe)(this.getBlockchainState(), TE.map(state => ({
            success: true,
            data: state,
            message: `Blockchain state retrieved! Network power level: ${state.networkStatus.toUpperCase()}`
        })));
    }
    handleGetWalletBalance(context) {
        const { address } = context.parameters;
        return (0, function_1.pipe)(this.getWalletBalance(address), TE.map(balance => {
            const powerLevel = DragonBallThemeManager.calculatePowerLevel(balance.totalValueUSD);
            return {
                success: true,
                data: { ...balance, powerLevel },
                message: DragonBallThemeManager.generateThemedResponse('balance', true, powerLevel)
            };
        }));
    }
    handleSendTransaction(context) {
        const { from, to, amount, denom, memo, gasLimit, gasPrice } = context.parameters;
        const request = {
            from,
            to,
            amount,
            denom,
            memo,
            gasLimit,
            gasPrice
        };
        return (0, function_1.pipe)(this.sendTransaction(request), TE.map(response => ({
            success: response.code === 0,
            data: response,
            message: DragonBallThemeManager.generateThemedResponse('transaction', response.code === 0, 9000)
        })));
    }
    handleQueryContract(context) {
        const { contractAddress, query } = context.parameters;
        return (0, function_1.pipe)(this.queryContract({ contractAddress, query }), TE.map(result => ({
            success: true,
            data: result,
            message: `Smart contract queried successfully! Your scouter detected valuable information.`
        })));
    }
    handleExecuteContract(context) {
        const { contractAddress, method, args, sender, funds, gasLimit } = context.parameters;
        const interaction = {
            contractAddress,
            method,
            args,
            sender,
            funds,
            gasLimit
        };
        return (0, function_1.pipe)(this.executeContract(interaction), TE.map(response => ({
            success: response.code === 0,
            data: response,
            message: DragonBallThemeManager.generateThemedResponse('contract', response.code === 0, 9000)
        })));
    }
    handleGetTransactionHistory(context) {
        const { address, limit = 50 } = context.parameters;
        return (0, function_1.pipe)(this.getTransactionHistory(address, limit), TE.map(history => ({
            success: true,
            data: history,
            message: `Transaction history retrieved! ${history.length} battles discovered in the blockchain archives.`
        })));
    }
    handleSubscribeEvents(context) {
        const { eventTypes, filters } = context.parameters;
        return (0, function_1.pipe)(this.subscribeToEvents(eventTypes, filters), TE.map(() => ({
            success: true,
            data: { eventTypes, filters },
            message: `Scouter activated! Now monitoring ${eventTypes.length} event types for energy signatures.`
        })));
    }
    isReadOperation(toolName) {
        const readOperations = [
            'get_blockchain_state',
            'get_wallet_balance',
            'get_token_balances',
            'get_transaction_history',
            'get_transaction_status',
            'query_contract',
            'get_contract_state',
            'get_token_metadata'
        ];
        return readOperations.includes(toolName);
    }
    getCacheKey(toolName, params) {
        return `mcp:${toolName}:${JSON.stringify(params)}`;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry || Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setInCache(key, data, ttlMs) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        });
    }
    initialize() {
        return TE.tryCatch(async () => {
            await this.connectToMCP();
            this.emit('mcp:initialized');
        }, error => this.createError('MCP_INIT_FAILED', `Failed to initialize MCP adapter: ${error}`));
    }
    cleanup() {
        return TE.tryCatch(async () => {
            this.disconnectFromMCP();
            this.cache.clear();
            this.availableTools.clear();
            this.emit('mcp:cleanup');
        }, error => this.createError('MCP_CLEANUP_FAILED', `Failed to cleanup MCP adapter: ${error}`));
    }
    isConnected() {
        return this.connectionManager.isConnectedToServer();
    }
    getAvailableTools() {
        return Array.from(this.availableTools.values());
    }
    getMCPConfig() {
        return { ...this.mcpConfig };
    }
}
exports.SeiMCPAdapter = SeiMCPAdapter;
//# sourceMappingURL=SeiMCPAdapter.js.map