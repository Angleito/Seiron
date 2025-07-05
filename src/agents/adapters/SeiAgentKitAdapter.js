"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeSAKConfig = exports.DEFAULT_SAK_CONFIGS = exports.createSeiAgentKitAdapter = exports.SeiAgentKitAdapter = void 0;
const tslib_1 = require("tslib");
const Either_1 = require("fp-ts/Either");
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const function_1 = require("fp-ts/function");
const viem_1 = require("viem");
const cosmjs_1 = require("@sei-js/cosmjs");
const evm_1 = require("@sei-js/evm");
const BaseAgent_1 = require("../base/BaseAgent");
class SeiAgentKitAdapter extends BaseAgent_1.BaseAgent {
    sakConfig;
    toolRegistry = new Map();
    operationBridge;
    contextBridge;
    errorBridge;
    toolRegistrationBridge;
    cache = new Map();
    rateLimiters = new Map();
    publicClient;
    walletClient;
    cosmWasmClient;
    signingCosmWasmClient;
    takaraAdapter;
    symphonyAdapter;
    dragonswapAdapter;
    siloAdapter;
    constructor(config, sakConfig) {
        super(config);
        this.sakConfig = sakConfig;
        this.operationBridge = new OperationBridgeImpl(this);
        this.contextBridge = new ContextBridgeImpl(this);
        this.errorBridge = new ErrorBridgeImpl(this);
        this.toolRegistrationBridge = new ToolRegistrationBridgeImpl(this);
        this.registerSAKActions();
    }
    registerSAKTool(tool) {
        return this.toolRegistrationBridge.registerTool(tool);
    }
    executeSAKTool(toolName, params, context) {
        return (0, function_1.pipe)(this.createSAKContext(context), TE.fromEither, TE.chain(sakContext => this.operationBridge.execute(toolName, params, sakContext)));
    }
    executeSAKBatch(operations, context) {
        return (0, function_1.pipe)(this.createSAKContext(context), TE.fromEither, TE.chain(sakContext => this.operationBridge.executeBatch(operations, sakContext)));
    }
    getSAKTools() {
        return this.toolRegistrationBridge.listTools();
    }
    getSAKToolsByCategory(category) {
        return this.toolRegistrationBridge.getToolsByCategory(category);
    }
    installSAKPlugin() {
        const plugin = {
            id: 'sak-integration',
            name: 'Sei Agent Kit Integration',
            version: '1.0.0',
            initialize: (agent) => this.initializeSAKPlugin(agent),
            cleanup: () => this.cleanupSAKPlugin()
        };
        return this.installPlugin(plugin);
    }
    registerSAKActions() {
        const actions = [
            {
                id: 'execute_sak_tool',
                name: 'Execute SAK Tool',
                description: 'Execute a Sei Agent Kit tool with parameters',
                handler: this.handleExecuteSAKTool.bind(this),
                validation: [
                    { field: 'toolName', required: true, type: 'string' },
                    { field: 'params', required: true, type: 'object' },
                    { field: 'context', required: false, type: 'object' }
                ]
            },
            {
                id: 'execute_sak_batch',
                name: 'Execute SAK Batch Operations',
                description: 'Execute multiple SAK operations in batch',
                handler: this.handleExecuteSAKBatch.bind(this),
                validation: [
                    { field: 'operations', required: true, type: 'array' },
                    { field: 'context', required: false, type: 'object' }
                ]
            },
            {
                id: 'list_sak_tools',
                name: 'List Available SAK Tools',
                description: 'Get list of available Sei Agent Kit tools',
                handler: this.handleListSAKTools.bind(this),
                validation: [
                    { field: 'category', required: false, type: 'string' }
                ]
            },
            {
                id: 'get_sak_tool_info',
                name: 'Get SAK Tool Information',
                description: 'Get detailed information about a specific SAK tool',
                handler: this.handleGetSAKToolInfo.bind(this),
                validation: [
                    { field: 'toolName', required: true, type: 'string' }
                ]
            }
        ];
        actions.forEach(action => {
            this.registerAction(action);
        });
    }
    handleExecuteSAKTool(context) {
        const { toolName, params, context: sakContextOverride } = context.parameters;
        return (0, function_1.pipe)(this.createSAKContext(sakContextOverride), TE.fromEither, TE.chain(sakContext => this.operationBridge.execute(toolName, params, sakContext)), TE.chain(sakResult => (0, function_1.pipe)(this.contextBridge.mapSAKResultToActionResult(sakResult), TE.fromEither)));
    }
    handleExecuteSAKBatch(context) {
        const { operations, context: sakContextOverride } = context.parameters;
        return (0, function_1.pipe)(this.createSAKContext(sakContextOverride), TE.fromEither, TE.chain(sakContext => this.operationBridge.executeBatch(operations, sakContext)), TE.map(results => ({
            success: true,
            data: { results, totalOperations: operations.length },
            message: `Executed ${results.length} SAK operations`
        })));
    }
    handleListSAKTools(context) {
        const { category } = context.parameters;
        return (0, function_1.pipe)(category
            ? this.toolRegistrationBridge.getToolsByCategory(category)
            : this.toolRegistrationBridge.listTools(), TE.fromEither, TE.map(tools => ({
            success: true,
            data: { tools, count: tools.length },
            message: `Found ${tools.length} SAK tools${category ? ` in category ${category}` : ''}`
        })));
    }
    handleGetSAKToolInfo(context) {
        const { toolName } = context.parameters;
        return (0, function_1.pipe)(this.toolRegistrationBridge.getTool(toolName), TE.fromEither, TE.map(tool => ({
            success: true,
            data: { tool },
            message: `Retrieved information for SAK tool: ${toolName}`
        })));
    }
    createSAKContext(contextOverride) {
        try {
            const baseContext = {
                network: this.sakConfig.network,
                permissions: this.sakConfig.defaultPermissions,
                sessionId: `sak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                metadata: {}
            };
            const mergedContext = { ...baseContext, ...contextOverride };
            return (0, function_1.pipe)(this.contextBridge.validateContext(mergedContext), TE.fromEither, TE.map(() => mergedContext));
        }
        catch (error) {
            return (0, Either_1.left)(this.createError('CONTEXT_CREATION_FAILED', `Failed to create SAK context: ${error}`));
        }
    }
    initializeSAKPlugin(agent) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            await this.initializeSAKConnection();
            await this.loadDefaultSAKTools();
            this.setupRateLimiters();
            if (this.sakConfig.cacheConfig.enabled) {
                this.setupCache();
            }
            this.emit('sak:plugin:initialized', { agentId: agent.getConfig().id });
        }, error => this.createError('SAK_PLUGIN_INIT_FAILED', `Failed to initialize SAK plugin: ${error}`)));
    }
    cleanupSAKPlugin() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.cache.clear();
            this.rateLimiters.clear();
            this.toolRegistry.clear();
            this.emit('sak:plugin:cleanup', { agentId: this.getConfig().id });
        }, error => this.createError('SAK_PLUGIN_CLEANUP_FAILED', `Failed to cleanup SAK plugin: ${error}`)));
    }
    async initializeSAKConnection() {
        try {
            this.publicClient = (0, viem_1.createPublicClient)({
                transport: (0, viem_1.http)(this.sakConfig.seiEvmRpcUrl),
            });
            if (this.sakConfig.walletPrivateKey) {
                this.walletClient = (0, viem_1.createWalletClient)({
                    transport: (0, viem_1.http)(this.sakConfig.seiEvmRpcUrl),
                });
            }
            this.cosmWasmClient = await (0, cosmjs_1.getCosmWasmClient)(this.sakConfig.seiRpcUrl);
            if (this.sakConfig.walletMnemonic || this.sakConfig.walletPrivateKey) {
                this.signingCosmWasmClient = await (0, cosmjs_1.getSigningCosmWasmClient)(this.sakConfig.seiRpcUrl, this.sakConfig.walletMnemonic || '');
            }
            await this.initializeProtocolAdapters();
            this.emit('sak:connection:initialized', {
                network: this.sakConfig.network,
                chainId: this.sakConfig.chainId,
                protocols: Object.keys(this.sakConfig.protocolConfigs).filter(key => this.sakConfig.protocolConfigs[key].enabled)
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize SAK connection: ${error}`);
        }
    }
    async loadDefaultSAKTools() {
        const tools = await this.generateSAKTools();
        tools.forEach(tool => {
            this.toolRegistry.set(tool.name, tool);
        });
        this.emit('sak:tools:loaded', {
            count: tools.length,
            categories: [...new Set(tools.map(t => t.category))]
        });
    }
    setupRateLimiters() {
        this.toolRegistry.forEach((tool, toolName) => {
            const rateLimit = tool.rateLimit || {
                maxCalls: this.sakConfig.rateLimitConfig.defaultMaxCalls,
                windowMs: this.sakConfig.rateLimitConfig.defaultWindowMs
            };
            this.rateLimiters.set(toolName, new RateLimiter(rateLimit.maxCalls, rateLimit.windowMs));
        });
    }
    setupCache() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                }
            }
        }, 60000);
    }
    async initializeProtocolAdapters() {
        const ethersProvider = this.publicClient ? (0, evm_1.getEthersProvider)(this.publicClient) : undefined;
        const signer = this.walletClient ? undefined : undefined;
        if (this.sakConfig.protocolConfigs.takara.enabled && ethersProvider) {
            const { TakaraProtocolWrapper } = await Promise.resolve().then(() => tslib_1.__importStar(require('../../protocols/sei/adapters/TakaraProtocolWrapper')));
            this.takaraAdapter = new TakaraProtocolWrapper(ethersProvider, signer);
        }
        if (this.sakConfig.protocolConfigs.symphony.enabled && this.publicClient && this.walletClient) {
            const { SymphonyProtocolWrapper } = await Promise.resolve().then(() => tslib_1.__importStar(require('../../protocols/sei/adapters/SymphonyProtocolWrapper')));
        }
        if (this.sakConfig.protocolConfigs.dragonswap.enabled) {
        }
        if (this.sakConfig.protocolConfigs.silo.enabled) {
        }
    }
    async generateSAKTools() {
        const tools = [];
        tools.push(...this.generateTokenTools());
        if (this.sakConfig.protocolConfigs.takara.enabled && this.takaraAdapter) {
            tools.push(...await this.generateTakaraTools());
        }
        if (this.sakConfig.protocolConfigs.symphony.enabled && this.symphonyAdapter) {
            tools.push(...this.generateSymphonyTools());
        }
        if (this.sakConfig.protocolConfigs.dragonswap.enabled) {
            tools.push(...this.generateDragonSwapTools());
        }
        if (this.sakConfig.protocolConfigs.silo.enabled) {
            tools.push(...this.generateSiloTools());
        }
        return tools;
    }
    generateTokenTools() {
        return [
            {
                name: 'get_token_balance',
                description: 'Get token balance for a specific address and token',
                parameters: {
                    address: 'string',
                    tokenAddress: 'string',
                    tokenType: 'string'
                },
                execute: async (params) => this.executeGetTokenBalance(params),
                category: 'blockchain',
                permission: 'read',
                rateLimit: { maxCalls: 100, windowMs: 60000 }
            },
            {
                name: 'get_native_balance',
                description: 'Get native SEI balance for an address',
                parameters: {
                    address: 'string'
                },
                execute: async (params) => this.executeGetNativeBalance(params),
                category: 'blockchain',
                permission: 'read',
                rateLimit: { maxCalls: 100, windowMs: 60000 }
            },
            {
                name: 'transfer_token',
                description: 'Transfer tokens to another address',
                parameters: {
                    to: 'string',
                    amount: 'string',
                    tokenAddress: 'string',
                    tokenType: 'string'
                },
                execute: async (params) => this.executeTransferToken(params),
                category: 'blockchain',
                permission: 'write',
                rateLimit: { maxCalls: 10, windowMs: 60000 }
            },
            {
                name: 'approve_token',
                description: 'Approve token spending for a contract',
                parameters: {
                    tokenAddress: 'string',
                    spenderAddress: 'string',
                    amount: 'string'
                },
                execute: async (params) => this.executeApproveToken(params),
                category: 'blockchain',
                permission: 'write',
                rateLimit: { maxCalls: 20, windowMs: 60000 }
            }
        ];
    }
    async generateTakaraTools() {
        return [
            {
                name: 'takara_supply',
                description: 'Supply assets to Takara lending protocol',
                parameters: {
                    asset: 'string',
                    amount: 'string',
                    onBehalfOf: 'string'
                },
                execute: async (params) => this.executeTakaraSupply(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'takara_withdraw',
                description: 'Withdraw assets from Takara lending protocol',
                parameters: {
                    asset: 'string',
                    amount: 'string'
                },
                execute: async (params) => this.executeTakaraWithdraw(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'takara_borrow',
                description: 'Borrow assets from Takara lending protocol',
                parameters: {
                    asset: 'string',
                    amount: 'string',
                    onBehalfOf: 'string'
                },
                execute: async (params) => this.executeTakaraBorrow(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'takara_repay',
                description: 'Repay borrowed assets to Takara lending protocol',
                parameters: {
                    asset: 'string',
                    amount: 'string',
                    onBehalfOf: 'string'
                },
                execute: async (params) => this.executeTakaraRepay(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'takara_get_user_data',
                description: 'Get user account data from Takara protocol',
                parameters: {
                    userAddress: 'string'
                },
                execute: async (params) => this.executeTakaraGetUserData(params),
                category: 'defi',
                permission: 'read',
                rateLimit: { maxCalls: 50, windowMs: 60000 }
            },
            {
                name: 'takara_get_reserve_data',
                description: 'Get reserve data for an asset from Takara protocol',
                parameters: {
                    asset: 'string'
                },
                execute: async (params) => this.executeTakaraGetReserveData(params),
                category: 'defi',
                permission: 'read',
                rateLimit: { maxCalls: 50, windowMs: 60000 }
            },
            {
                name: 'takara_get_health_factor',
                description: 'Get health factor for a user in Takara protocol',
                parameters: {
                    userAddress: 'string'
                },
                execute: async (params) => this.executeTakaraGetHealthFactor(params),
                category: 'defi',
                permission: 'read',
                rateLimit: { maxCalls: 50, windowMs: 60000 }
            }
        ];
    }
    generateSymphonyTools() {
        return [
            {
                name: 'symphony_swap',
                description: 'Execute token swap on Symphony protocol',
                parameters: {
                    tokenIn: 'string',
                    tokenOut: 'string',
                    amountIn: 'string',
                    amountOutMin: 'string',
                    slippage: 'number'
                },
                execute: async (params) => this.executeSymphonySwap(params),
                category: 'trading',
                permission: 'write',
                rateLimit: { maxCalls: 10, windowMs: 60000 }
            },
            {
                name: 'symphony_get_quote',
                description: 'Get swap quote from Symphony protocol',
                parameters: {
                    tokenIn: 'string',
                    tokenOut: 'string',
                    amountIn: 'string'
                },
                execute: async (params) => this.executeSymphonyGetQuote(params),
                category: 'trading',
                permission: 'read',
                rateLimit: { maxCalls: 100, windowMs: 60000 }
            },
            {
                name: 'symphony_get_routes',
                description: 'Get optimal routes for token swap',
                parameters: {
                    tokenIn: 'string',
                    tokenOut: 'string',
                    amountIn: 'string'
                },
                execute: async (params) => this.executeSymphonyGetRoutes(params),
                category: 'trading',
                permission: 'read',
                rateLimit: { maxCalls: 100, windowMs: 60000 }
            }
        ];
    }
    generateDragonSwapTools() {
        return [
            {
                name: 'dragonswap_add_liquidity',
                description: 'Add liquidity to DragonSwap pool',
                parameters: {
                    tokenA: 'string',
                    tokenB: 'string',
                    amountA: 'string',
                    amountB: 'string',
                    amountAMin: 'string',
                    amountBMin: 'string'
                },
                execute: async (params) => this.executeDragonSwapAddLiquidity(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'dragonswap_remove_liquidity',
                description: 'Remove liquidity from DragonSwap pool',
                parameters: {
                    tokenA: 'string',
                    tokenB: 'string',
                    liquidity: 'string',
                    amountAMin: 'string',
                    amountBMin: 'string'
                },
                execute: async (params) => this.executeDragonSwapRemoveLiquidity(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'dragonswap_get_pool_info',
                description: 'Get information about a DragonSwap pool',
                parameters: {
                    tokenA: 'string',
                    tokenB: 'string'
                },
                execute: async (params) => this.executeDragonSwapGetPoolInfo(params),
                category: 'defi',
                permission: 'read',
                rateLimit: { maxCalls: 50, windowMs: 60000 }
            }
        ];
    }
    generateSiloTools() {
        return [
            {
                name: 'silo_stake',
                description: 'Stake tokens in Silo protocol',
                parameters: {
                    amount: 'string',
                    validator: 'string'
                },
                execute: async (params) => this.executeSiloStake(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'silo_unstake',
                description: 'Unstake tokens from Silo protocol',
                parameters: {
                    amount: 'string',
                    validator: 'string'
                },
                execute: async (params) => this.executeSiloUnstake(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 5, windowMs: 60000 }
            },
            {
                name: 'silo_claim_rewards',
                description: 'Claim staking rewards from Silo protocol',
                parameters: {
                    validator: 'string'
                },
                execute: async (params) => this.executeSiloClaimRewards(params),
                category: 'defi',
                permission: 'write',
                rateLimit: { maxCalls: 10, windowMs: 60000 }
            },
            {
                name: 'silo_get_staking_info',
                description: 'Get staking information for a user',
                parameters: {
                    userAddress: 'string',
                    validator: 'string'
                },
                execute: async (params) => this.executeSiloGetStakingInfo(params),
                category: 'defi',
                permission: 'read',
                rateLimit: { maxCalls: 50, windowMs: 60000 }
            }
        ];
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
        const ttl = ttlMs || this.sakConfig.cacheConfig.ttlMs;
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl
        });
    }
    async executeGetTokenBalance(params) {
        const { address, tokenAddress, tokenType } = params;
        try {
            if (tokenType === 'native') {
                return this.executeGetNativeBalance({ address });
            }
            else if (tokenType === 'erc20' && this.publicClient) {
                const balance = await this.publicClient.readContract({
                    address: tokenAddress,
                    abi: (0, viem_1.parseAbi)(['function balanceOf(address) view returns (uint256)']),
                    functionName: 'balanceOf',
                    args: [address]
                });
                return { balance: balance.toString(), tokenAddress, address };
            }
            else if (tokenType === 'cw20' && this.cosmWasmClient) {
                const result = await this.cosmWasmClient.queryContractSmart(tokenAddress, {
                    balance: { address }
                });
                return { balance: result.balance, tokenAddress, address };
            }
            throw new Error(`Unsupported token type: ${tokenType}`);
        }
        catch (error) {
            throw new Error(`Failed to get token balance: ${error}`);
        }
    }
    async executeGetNativeBalance(params) {
        const { address } = params;
        try {
            if (this.publicClient) {
                const balance = await this.publicClient.getBalance({
                    address: address
                });
                return { balance: balance.toString(), address, token: 'SEI' };
            }
            else if (this.cosmWasmClient) {
                const balance = await this.cosmWasmClient.getBalance(address, 'usei');
                return { balance: balance.amount, address, token: 'SEI' };
            }
            throw new Error('No client available for native balance query');
        }
        catch (error) {
            throw new Error(`Failed to get native balance: ${error}`);
        }
    }
    async executeTransferToken(params) {
        const { to, amount, tokenAddress, tokenType } = params;
        if (!this.walletClient && !this.signingCosmWasmClient) {
            throw new Error('No signing client available for transfers');
        }
        try {
            if (tokenType === 'erc20' && this.walletClient) {
                const hash = await this.walletClient.writeContract({
                    address: tokenAddress,
                    abi: (0, viem_1.parseAbi)(['function transfer(address to, uint256 amount) returns (bool)']),
                    functionName: 'transfer',
                    args: [to, BigInt(amount)]
                });
                return { txHash: hash, success: true, amount, to, tokenAddress };
            }
            else if (tokenType === 'cw20' && this.signingCosmWasmClient) {
                const result = await this.signingCosmWasmClient.execute(await this.signingCosmWasmClient.senderAddress, tokenAddress, {
                    transfer: {
                        recipient: to,
                        amount: amount
                    }
                }, 'auto');
                return { txHash: result.transactionHash, success: true, amount, to, tokenAddress };
            }
            throw new Error(`Unsupported token type for transfer: ${tokenType}`);
        }
        catch (error) {
            throw new Error(`Failed to transfer token: ${error}`);
        }
    }
    async executeApproveToken(params) {
        const { tokenAddress, spenderAddress, amount } = params;
        if (!this.walletClient) {
            throw new Error('No EVM wallet client available for token approval');
        }
        try {
            const hash = await this.walletClient.writeContract({
                address: tokenAddress,
                abi: (0, viem_1.parseAbi)(['function approve(address spender, uint256 amount) returns (bool)']),
                functionName: 'approve',
                args: [spenderAddress, BigInt(amount)]
            });
            return { txHash: hash, success: true, amount, spenderAddress, tokenAddress };
        }
        catch (error) {
            throw new Error(`Failed to approve token: ${error}`);
        }
    }
    async executeTakaraSupply(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const result = await this.takaraAdapter.supply({
            asset: params.asset,
            amount: BigInt(params.amount),
            onBehalfOf: params.onBehalfOf
        });
        if (result._tag === 'Left') {
            throw new Error(`Takara supply failed: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraWithdraw(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const amount = params.amount === 'max' ? 'max' : BigInt(params.amount);
        const result = await this.takaraAdapter.withdraw({
            asset: params.asset,
            amount,
            to: params.to
        });
        if (result._tag === 'Left') {
            throw new Error(`Takara withdraw failed: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraBorrow(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const result = await this.takaraAdapter.borrow({
            asset: params.asset,
            amount: BigInt(params.amount),
            interestRateMode: 'variable',
            onBehalfOf: params.onBehalfOf
        });
        if (result._tag === 'Left') {
            throw new Error(`Takara borrow failed: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraRepay(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const amount = params.amount === 'max' ? 'max' : BigInt(params.amount);
        const result = await this.takaraAdapter.repay({
            asset: params.asset,
            amount,
            interestRateMode: 'variable',
            onBehalfOf: params.onBehalfOf
        });
        if (result._tag === 'Left') {
            throw new Error(`Takara repay failed: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraGetUserData(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const result = await this.takaraAdapter.getUserAccountData(params.userAddress);
        if (result._tag === 'Left') {
            throw new Error(`Failed to get Takara user data: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraGetReserveData(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const result = await this.takaraAdapter.getReserveData(params.asset);
        if (result._tag === 'Left') {
            throw new Error(`Failed to get Takara reserve data: ${result.left.message}`);
        }
        return result.right;
    }
    async executeTakaraGetHealthFactor(params) {
        if (!this.takaraAdapter) {
            throw new Error('Takara adapter not initialized');
        }
        const result = await this.takaraAdapter.getHealthFactor(params.userAddress);
        if (result._tag === 'Left') {
            throw new Error(`Failed to get Takara health factor: ${result.left.message}`);
        }
        return result.right;
    }
    async executeSymphonySwap(params) {
        if (!this.symphonyAdapter) {
            throw new Error('Symphony adapter not initialized');
        }
        throw new Error('Symphony swap implementation not yet available');
    }
    async executeSymphonyGetQuote(params) {
        if (!this.symphonyAdapter) {
            throw new Error('Symphony adapter not initialized');
        }
        throw new Error('Symphony quote implementation not yet available');
    }
    async executeSymphonyGetRoutes(params) {
        if (!this.symphonyAdapter) {
            throw new Error('Symphony adapter not initialized');
        }
        throw new Error('Symphony routes implementation not yet available');
    }
    async executeDragonSwapAddLiquidity(params) {
        throw new Error('DragonSwap add liquidity implementation not yet available');
    }
    async executeDragonSwapRemoveLiquidity(params) {
        throw new Error('DragonSwap remove liquidity implementation not yet available');
    }
    async executeDragonSwapGetPoolInfo(params) {
        throw new Error('DragonSwap pool info implementation not yet available');
    }
    async executeSiloStake(params) {
        throw new Error('Silo stake implementation not yet available');
    }
    async executeSiloUnstake(params) {
        throw new Error('Silo unstake implementation not yet available');
    }
    async executeSiloClaimRewards(params) {
        throw new Error('Silo claim rewards implementation not yet available');
    }
    async executeSiloGetStakingInfo(params) {
        throw new Error('Silo staking info implementation not yet available');
    }
    checkRateLimit(toolName) {
        const limiter = this.rateLimiters.get(toolName);
        if (!limiter) {
            return (0, Either_1.right)(undefined);
        }
        if (!limiter.canExecute()) {
            return (0, Either_1.left)(this.createError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for tool: ${toolName}`));
        }
        limiter.recordExecution();
        return (0, Either_1.right)(undefined);
    }
    initialize() {
        return this.initializeSAKPlugin(this);
    }
    cleanup() {
        return this.cleanupSAKPlugin();
    }
    getToolRegistry() {
        return this.toolRegistry;
    }
    getSAKConfig() {
        return this.sakConfig;
    }
    getRateLimiters() {
        return this.rateLimiters;
    }
    getCacheInstance() {
        return this.cache;
    }
    getOperationBridge() {
        return this.operationBridge;
    }
    getContextBridge() {
        return this.contextBridge;
    }
    getErrorBridge() {
        return this.errorBridge;
    }
}
exports.SeiAgentKitAdapter = SeiAgentKitAdapter;
class RateLimiter {
    maxCalls;
    windowMs;
    calls = [];
    constructor(maxCalls, windowMs) {
        this.maxCalls = maxCalls;
        this.windowMs = windowMs;
    }
    canExecute() {
        this.cleanupOldCalls();
        return this.calls.length < this.maxCalls;
    }
    recordExecution() {
        this.calls.push(Date.now());
    }
    cleanupOldCalls() {
        const now = Date.now();
        const cutoff = now - this.windowMs;
        this.calls = this.calls.filter(time => time > cutoff);
    }
}
class ToolRegistrationBridgeImpl {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    registerTool(tool) {
        try {
            if (this.adapter.getToolRegistry().has(tool.name)) {
                return (0, Either_1.left)(this.adapter.createError('TOOL_ALREADY_EXISTS', `Tool ${tool.name} already registered`));
            }
            this.adapter.getToolRegistry().set(tool.name, tool);
            return (0, Either_1.right)(undefined);
        }
        catch (error) {
            return (0, Either_1.left)(this.adapter.createError('TOOL_REGISTRATION_FAILED', `Failed to register tool: ${error}`));
        }
    }
    unregisterTool(toolName) {
        try {
            if (!this.adapter.getToolRegistry().has(toolName)) {
                return (0, Either_1.left)(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
            }
            this.adapter.getToolRegistry().delete(toolName);
            return (0, Either_1.right)(undefined);
        }
        catch (error) {
            return (0, Either_1.left)(this.adapter.createError('TOOL_UNREGISTRATION_FAILED', `Failed to unregister tool: ${error}`));
        }
    }
    getTool(toolName) {
        const tool = this.adapter.getToolRegistry().get(toolName);
        if (!tool) {
            return (0, Either_1.left)(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
        }
        return (0, Either_1.right)(tool);
    }
    listTools() {
        return (0, Either_1.right)(Array.from(this.adapter.getToolRegistry().values()));
    }
    getToolsByCategory(category) {
        const tools = Array.from(this.adapter.getToolRegistry().values())
            .filter(tool => tool.category === category);
        return (0, Either_1.right)(tools);
    }
}
class OperationBridgeImpl {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    execute(toolName, params, context) {
        return (0, function_1.pipe)(this.adapter.getToolRegistry().get(toolName)
            ? (0, Either_1.right)(this.adapter.getToolRegistry().get(toolName))
            : (0, Either_1.left)(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`)), TE.fromEither, TE.chain(tool => this.executeTool(tool, params, context)));
    }
    executeWithValidation(toolName, params, context) {
        return (0, function_1.pipe)(this.validateParameters(toolName, params), TE.fromEither, TE.chain(() => this.execute(toolName, params, context)));
    }
    executeBatch(operations, context) {
        return (0, function_1.pipe)(operations.map(op => this.execute(op.toolName, op.params, context)), TE.sequenceArray);
    }
    executeTool(tool, params, context) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const rateLimitCheck = this.adapter.checkRateLimit(tool.name);
            if (rateLimitCheck._tag === 'Left') {
                throw rateLimitCheck.left;
            }
            const result = await tool.execute(params);
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: Date.now(),
                    toolName: tool.name,
                    contextId: context.sessionId
                }
            };
        }, error => this.adapter.getErrorBridge().mapSAKError(error)));
    }
    validateParameters(toolName, params) {
        const tool = this.adapter.getToolRegistry().get(toolName);
        if (!tool) {
            return (0, Either_1.left)(this.adapter.createError('TOOL_NOT_FOUND', `Tool ${toolName} not found`));
        }
        for (const [key, type] of Object.entries(tool.parameters)) {
            if (params[key] === undefined) {
                return (0, Either_1.left)(this.adapter.createError('MISSING_PARAMETER', `Required parameter ${key} is missing`));
            }
            if (typeof params[key] !== type) {
                return (0, Either_1.left)(this.adapter.createError('INVALID_PARAMETER_TYPE', `Parameter ${key} must be of type ${type}`));
            }
        }
        return (0, Either_1.right)(undefined);
    }
}
class ContextBridgeImpl {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    mapActionContextToSAK(actionContext) {
        try {
            const sakContext = {
                userId: actionContext.userId,
                network: this.adapter.getSAKConfig().network,
                permissions: this.adapter.getSAKConfig().defaultPermissions,
                sessionId: `action-${actionContext.agentId}-${Date.now()}`,
                metadata: {
                    ...actionContext.metadata,
                    agentId: actionContext.agentId,
                    parameters: actionContext.parameters
                }
            };
            return (0, Either_1.right)(sakContext);
        }
        catch (error) {
            return (0, Either_1.left)(this.adapter.createError('CONTEXT_MAPPING_FAILED', `Failed to map action context to SAK: ${error}`));
        }
    }
    mapSAKResultToActionResult(sakResult) {
        try {
            const actionResult = {
                success: sakResult.success,
                data: sakResult.data,
                message: sakResult.success ? 'SAK operation completed successfully' : sakResult.error?.message || 'SAK operation failed'
            };
            return (0, Either_1.right)(actionResult);
        }
        catch (error) {
            return (0, Either_1.left)(this.adapter.createError('RESULT_MAPPING_FAILED', `Failed to map SAK result to action result: ${error}`));
        }
    }
    enrichContext(context, enrichments) {
        return {
            ...context,
            metadata: {
                ...context.metadata,
                ...enrichments
            }
        };
    }
    validateContext(context) {
        if (!context.network) {
            return (0, Either_1.left)(this.adapter.createError('INVALID_CONTEXT', 'Network is required in SAK context'));
        }
        if (!context.permissions || context.permissions.length === 0) {
            return (0, Either_1.left)(this.adapter.createError('INVALID_CONTEXT', 'Permissions are required in SAK context'));
        }
        return (0, Either_1.right)(undefined);
    }
}
class ErrorBridgeImpl {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    mapSAKError(error) {
        return {
            code: error.code || 'SAK_ERROR',
            message: error.message || 'Unknown SAK error',
            details: error.details || error,
            timestamp: new Date(),
            agentId: this.adapter.getConfig().id
        };
    }
    mapAgentError(error) {
        return {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: error.timestamp
        };
    }
    isRecoverableError(error) {
        const recoverableErrors = [
            'NETWORK_ERROR',
            'TIMEOUT_ERROR',
            'RATE_LIMIT_EXCEEDED',
            'TEMPORARY_UNAVAILABLE'
        ];
        return recoverableErrors.includes(error.code);
    }
    createRetryStrategy(error) {
        if (!this.isRecoverableError(error)) {
            return (0, Either_1.left)(this.adapter.createError('NON_RECOVERABLE_ERROR', 'Error is not recoverable'));
        }
        const strategy = {
            maxRetries: this.adapter.getSAKConfig().retryConfig.maxRetries,
            backoffMs: this.adapter.getSAKConfig().retryConfig.backoffMs,
            exponentialBackoff: true,
            retryCondition: (err, attempt) => attempt < this.adapter.getSAKConfig().retryConfig.maxRetries
        };
        return (0, Either_1.right)(strategy);
    }
}
const createSeiAgentKitAdapter = (agentConfig, sakConfig) => {
    return new SeiAgentKitAdapter(agentConfig, sakConfig);
};
exports.createSeiAgentKitAdapter = createSeiAgentKitAdapter;
exports.DEFAULT_SAK_CONFIGS = {
    mainnet: {
        seiRpcUrl: 'https://rpc.sei.io',
        seiEvmRpcUrl: 'https://evm-rpc.sei.io',
        chainId: 'pacific-1',
        network: 'mainnet',
        defaultPermissions: ['read', 'write'],
        protocolConfigs: {
            takara: {
                enabled: true,
                contractAddresses: {
                    comptroller: '0x0000000000000000000000000000000000000000',
                    priceOracle: '0x0000000000000000000000000000000000000000'
                }
            },
            symphony: {
                enabled: true,
                contractAddresses: {
                    router: '0x0000000000000000000000000000000000000000',
                    quoter: '0x0000000000000000000000000000000000000000'
                }
            },
            dragonswap: {
                enabled: true,
                contractAddresses: {
                    factory: '0x0000000000000000000000000000000000000000',
                    router: '0x0000000000000000000000000000000000000000'
                }
            },
            silo: {
                enabled: true,
                contractAddresses: {
                    staking: '0x0000000000000000000000000000000000000000'
                }
            }
        },
        rateLimitConfig: {
            defaultMaxCalls: 100,
            defaultWindowMs: 60000
        },
        cacheConfig: {
            enabled: true,
            ttlMs: 30000,
            maxSize: 1000
        },
        retryConfig: {
            maxRetries: 3,
            backoffMs: 1000
        }
    },
    testnet: {
        seiRpcUrl: 'https://rpc-testnet.sei.io',
        seiEvmRpcUrl: 'https://evm-rpc-testnet.sei.io',
        chainId: 'atlantic-2',
        network: 'testnet',
        defaultPermissions: ['read', 'write'],
        protocolConfigs: {
            takara: {
                enabled: true,
                contractAddresses: {
                    comptroller: '0x0000000000000000000000000000000000000000',
                    priceOracle: '0x0000000000000000000000000000000000000000'
                }
            },
            symphony: {
                enabled: true,
                contractAddresses: {
                    router: '0x0000000000000000000000000000000000000000',
                    quoter: '0x0000000000000000000000000000000000000000'
                }
            },
            dragonswap: {
                enabled: true,
                contractAddresses: {
                    factory: '0x0000000000000000000000000000000000000000',
                    router: '0x0000000000000000000000000000000000000000'
                }
            },
            silo: {
                enabled: true,
                contractAddresses: {
                    staking: '0x0000000000000000000000000000000000000000'
                }
            }
        },
        rateLimitConfig: {
            defaultMaxCalls: 50,
            defaultWindowMs: 60000
        },
        cacheConfig: {
            enabled: true,
            ttlMs: 15000,
            maxSize: 500
        },
        retryConfig: {
            maxRetries: 2,
            backoffMs: 500
        }
    }
};
const mergeSAKConfig = (baseConfig, userConfig) => {
    return {
        ...baseConfig,
        ...userConfig,
        protocolConfigs: {
            ...baseConfig.protocolConfigs,
            ...userConfig.protocolConfigs
        },
        rateLimitConfig: {
            ...baseConfig.rateLimitConfig,
            ...userConfig.rateLimitConfig
        },
        cacheConfig: {
            ...baseConfig.cacheConfig,
            ...userConfig.cacheConfig
        },
        retryConfig: {
            ...baseConfig.retryConfig,
            ...userConfig.retryConfig
        }
    };
};
exports.mergeSAKConfig = mergeSAKConfig;
//# sourceMappingURL=SeiAgentKitAdapter.js.map