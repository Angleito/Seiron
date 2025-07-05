"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiveIntelligenceAdapter = void 0;
const tslib_1 = require("tslib");
const Either_1 = require("fp-ts/Either");
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const function_1 = require("fp-ts/function");
const BaseAgent_1 = require("../base/BaseAgent");
class HiveIntelligenceAdapter extends BaseAgent_1.BaseAgent {
    hiveConfig;
    cache = new Map();
    rateLimiter;
    creditUsage = null;
    httpClient;
    constructor(config, hiveConfig) {
        super(config);
        this.hiveConfig = hiveConfig;
        this.rateLimiter = new RateLimiter(this.hiveConfig.rateLimitConfig.maxRequests, this.hiveConfig.rateLimitConfig.windowMs);
        this.httpClient = new HttpClient(this.hiveConfig);
        this.registerHiveActions();
    }
    search(query, metadata) {
        const hiveQuery = {
            type: 'search',
            query,
            parameters: {},
            metadata
        };
        return this.executeHiveQuery(hiveQuery);
    }
    getAnalytics(query, metadata) {
        const hiveQuery = {
            type: 'analytics',
            query,
            parameters: {},
            metadata
        };
        return this.executeHiveQuery(hiveQuery);
    }
    analyzePortfolio(walletAddress, additionalParams) {
        const hiveQuery = {
            type: 'portfolio',
            query: `Analyze portfolio for wallet ${walletAddress}`,
            parameters: {
                walletAddress,
                ...additionalParams
            },
            metadata: {
                walletAddress
            }
        };
        return this.executeHiveQuery(hiveQuery);
    }
    getMarketIntelligence(query, metadata) {
        const hiveQuery = {
            type: 'market',
            query,
            parameters: {},
            metadata
        };
        return this.executeHiveQuery(hiveQuery);
    }
    getCreditUsage() {
        return (0, function_1.pipe)(this.checkHiveRateLimit(), TE.fromEither, TE.chain(() => this.httpClient.get('/credits/usage')), TE.chain(response => {
            if (response.success && response.data) {
                this.creditUsage = response.data;
                return TE.right(response.data);
            }
            return TE.left(this.createError('CREDIT_USAGE_FAILED', 'Failed to get credit usage: Invalid response'));
        }));
    }
    installHivePlugin() {
        const plugin = {
            id: 'hive-intelligence',
            name: 'Hive Intelligence Integration',
            version: '1.0.0',
            initialize: (agent) => this.initializeHivePlugin(agent),
            cleanup: () => this.cleanupHivePlugin()
        };
        return this.installPlugin(plugin);
    }
    executeHiveQuery(query) {
        const cacheKey = this.generateCacheKey(query);
        return (0, function_1.pipe)(this.checkHiveRateLimit(), TE.fromEither, TE.chain(() => {
            if (this.hiveConfig.cacheConfig.enabled) {
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    return TE.right(cached);
                }
            }
            return this.performHiveQuery(query);
        }), TE.map(response => {
            if (this.hiveConfig.cacheConfig.enabled && response.success) {
                this.setInCache(cacheKey, response);
            }
            if (this.hiveConfig.creditConfig.trackUsage && response.metadata?.creditsUsed) {
                this.trackCreditUsage(query, response.metadata.creditsUsed);
            }
            return response;
        }));
    }
    performHiveQuery(query) {
        const endpoint = this.getQueryEndpoint(query.type);
        const requestBody = {
            query: query.query,
            parameters: query.parameters || {},
            metadata: query.metadata || {}
        };
        return this.httpClient.post(endpoint, requestBody);
    }
    registerHiveActions() {
        const actions = [
            {
                id: 'hive_search',
                name: 'Hive Intelligence Search',
                description: 'Perform natural language search queries for blockchain/Web3 data',
                handler: this.handleHiveSearch.bind(this),
                validation: [
                    { field: 'query', required: true, type: 'string' },
                    { field: 'metadata', required: false, type: 'object' }
                ]
            },
            {
                id: 'hive_analytics',
                name: 'Hive Intelligence Analytics',
                description: 'Get AI-powered analytics and insights',
                handler: this.handleHiveAnalytics.bind(this),
                validation: [
                    { field: 'query', required: true, type: 'string' },
                    { field: 'metadata', required: false, type: 'object' }
                ]
            },
            {
                id: 'hive_portfolio_analysis',
                name: 'Hive Portfolio Analysis',
                description: 'Analyze portfolio performance and recommendations',
                handler: this.handleHivePortfolioAnalysis.bind(this),
                validation: [
                    { field: 'walletAddress', required: true, type: 'string' },
                    { field: 'parameters', required: false, type: 'object' }
                ]
            },
            {
                id: 'hive_market_intelligence',
                name: 'Hive Market Intelligence',
                description: 'Get market intelligence and trading insights',
                handler: this.handleHiveMarketIntelligence.bind(this),
                validation: [
                    { field: 'query', required: true, type: 'string' },
                    { field: 'metadata', required: false, type: 'object' }
                ]
            },
            {
                id: 'hive_credit_usage',
                name: 'Hive Credit Usage',
                description: 'Get current credit usage and limits',
                handler: this.handleHiveCreditUsage.bind(this),
                validation: []
            }
        ];
        actions.forEach(action => {
            this.registerAction(action);
        });
    }
    handleHiveSearch(context) {
        const { query, metadata } = context.parameters;
        return (0, function_1.pipe)(this.search(query, metadata), TE.map(response => ({
            success: response.success,
            data: response.data,
            message: response.success
                ? `Search completed with ${response.data?.length || 0} results`
                : response.error?.message || 'Search failed'
        })));
    }
    handleHiveAnalytics(context) {
        const { query, metadata } = context.parameters;
        return (0, function_1.pipe)(this.getAnalytics(query, metadata), TE.map(response => ({
            success: response.success,
            data: response.data,
            message: response.success
                ? `Analytics completed with ${response.data?.insights.length || 0} insights`
                : response.error?.message || 'Analytics failed'
        })));
    }
    handleHivePortfolioAnalysis(context) {
        const { walletAddress, parameters } = context.parameters;
        return (0, function_1.pipe)(this.analyzePortfolio(walletAddress, parameters), TE.map(response => ({
            success: response.success,
            data: response.data,
            message: response.success
                ? `Portfolio analysis completed for ${walletAddress}`
                : response.error?.message || 'Portfolio analysis failed'
        })));
    }
    handleHiveMarketIntelligence(context) {
        const { query, metadata } = context.parameters;
        return (0, function_1.pipe)(this.getMarketIntelligence(query, metadata), TE.map(response => ({
            success: response.success,
            data: response.data,
            message: response.success
                ? `Market intelligence analysis completed`
                : response.error?.message || 'Market intelligence failed'
        })));
    }
    handleHiveCreditUsage(context) {
        return (0, function_1.pipe)(this.getCreditUsage(), TE.map(creditUsage => ({
            success: true,
            data: creditUsage,
            message: `Credit usage: ${creditUsage.usedCredits}/${creditUsage.totalCredits} (${creditUsage.remainingCredits} remaining)`
        })));
    }
    initializeHivePlugin(agent) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            await this.httpClient.initialize();
            if (this.hiveConfig.cacheConfig.enabled) {
                this.setupCache();
            }
            if (this.hiveConfig.creditConfig.trackUsage) {
                await this.getCreditUsage()();
            }
            this.emit('hive:plugin:initialized', { agentId: agent.getConfig().id });
        }, error => this.createError('HIVE_PLUGIN_INIT_FAILED', `Failed to initialize Hive plugin: ${error}`)));
    }
    cleanupHivePlugin() {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            this.cache.clear();
            await this.httpClient.cleanup();
            this.emit('hive:plugin:cleanup', { agentId: this.getConfig().id });
        }, error => this.createError('HIVE_PLUGIN_CLEANUP_FAILED', `Failed to cleanup Hive plugin: ${error}`)));
    }
    generateCacheKey(query) {
        return `hive:${query.type}:${Buffer.from(JSON.stringify(query)).toString('base64')}`;
    }
    getQueryEndpoint(type) {
        const endpoints = {
            search: '/search',
            analytics: '/analytics',
            portfolio: '/portfolio/analyze',
            market: '/market/intelligence',
            credit: '/credits/usage'
        };
        return endpoints[type] || '/search';
    }
    setupCache() {
        setInterval(() => {
            const now = Date.now();
            this.cache.forEach((entry, key) => {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                }
            });
        }, 60000);
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
        const ttl = ttlMs || this.hiveConfig.cacheConfig.ttlMs;
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl
        });
    }
    checkHiveRateLimit() {
        if (!this.rateLimiter.canExecute()) {
            return (0, Either_1.left)(this.createError('RATE_LIMIT_EXCEEDED', 'Hive Intelligence API rate limit exceeded'));
        }
        this.rateLimiter.recordExecution();
        return (0, Either_1.right)(undefined);
    }
    trackCreditUsage(query, creditsUsed) {
        if (!this.creditUsage)
            return;
        const creditQuery = {
            queryId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            creditsUsed,
            queryType: query.type,
            timestamp: new Date().toISOString()
        };
        this.creditUsage.usedCredits += creditsUsed;
        this.creditUsage.remainingCredits = Math.max(0, this.creditUsage.totalCredits - this.creditUsage.usedCredits);
        this.creditUsage.queryHistory.push(creditQuery);
        if (this.creditUsage.remainingCredits <= this.hiveConfig.creditConfig.alertThreshold) {
            this.emit('hive:credit:alert', {
                remainingCredits: this.creditUsage.remainingCredits,
                totalCredits: this.creditUsage.totalCredits,
                agentId: this.getConfig().id
            });
        }
    }
    initialize() {
        return this.initializeHivePlugin(this);
    }
    cleanup() {
        return this.cleanupHivePlugin();
    }
    getHiveConfig() {
        return this.hiveConfig;
    }
    getCurrentCreditUsage() {
        return this.creditUsage;
    }
}
exports.HiveIntelligenceAdapter = HiveIntelligenceAdapter;
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
class HttpClient {
    config;
    baseUrl;
    apiKey;
    headers;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'Seiron/1.0.0 HiveIntelligenceAdapter'
        };
    }
    async initialize() {
        try {
            await this.get('/health');
        }
        catch (error) {
            throw new Error(`Failed to connect to Hive Intelligence API: ${error}`);
        }
    }
    async cleanup() {
    }
    get(endpoint) {
        return TE.tryCatch(() => this.request('GET', endpoint), error => ({
            code: 'HTTP_CLIENT_ERROR',
            message: `HTTP GET failed: ${error}`,
            details: error,
            timestamp: new Date(),
            agentId: 'http-client'
        }));
    }
    post(endpoint, data) {
        return TE.tryCatch(() => this.request('POST', endpoint, data), error => ({
            code: 'HTTP_CLIENT_ERROR',
            message: `HTTP POST failed: ${error}`,
            details: error,
            timestamp: new Date(),
            agentId: 'http-client'
        }));
    }
    async request(method, endpoint, data) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.headers,
            body: data ? JSON.stringify(data) : undefined
        };
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        code: response.status.toString(),
                        message: result.message || 'API request failed',
                        details: result
                    }
                };
            }
            return {
                success: true,
                data: result.data,
                metadata: result.metadata || {
                    creditsUsed: result.creditsUsed || 0,
                    queryTime: result.queryTime || 0,
                    resultCount: result.resultCount || 0,
                    timestamp: Date.now(),
                    queryId: result.queryId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: `Network error: ${error}`,
                    details: error
                }
            };
        }
    }
}
//# sourceMappingURL=HiveIntelligenceAdapter.js.map