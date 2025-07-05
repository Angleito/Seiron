"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSymphonyIntegrationConfig = exports.defaultSymphonyConfig = exports.createSymphonyProtocolWrapper = exports.SymphonyProtocolWrapper = void 0;
const tslib_1 = require("tslib");
const function_1 = require("fp-ts/function");
const E = tslib_1.__importStar(require("fp-ts/Either"));
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const O = tslib_1.__importStar(require("fp-ts/Option"));
const viem_1 = require("viem");
const constants_1 = require("../constants");
const SYMPHONY_ROUTER_ABI = (0, viem_1.parseAbi)(constants_1.SYMPHONY_ABI_FRAGMENTS.ROUTER);
const SYMPHONY_QUOTER_ABI = (0, viem_1.parseAbi)(constants_1.SYMPHONY_ABI_FRAGMENTS.QUOTER);
class SymphonyProtocolWrapper {
    config;
    integrationConfig;
    publicClient;
    walletClient;
    quoteCache;
    routeCache;
    constructor(config, integrationConfig, publicClient, walletClient) {
        this.config = config;
        this.integrationConfig = integrationConfig;
        this.publicClient = publicClient;
        this.walletClient = walletClient;
        this.quoteCache = new Map();
        this.routeCache = new Map();
    }
    getQuote = (request) => {
        const cacheKey = this.generateCacheKey('quote', request);
        return (0, function_1.pipe)(this.getCachedQuote(cacheKey), TE.fromOption(() => ({ type: 'network_error', message: 'No cached quote' })), TE.orElse(() => this.fetchQuote(request)), TE.chain(quote => this.validateQuote(quote)), TE.map(quote => {
            if (this.integrationConfig.cacheConfig.enableQuoteCache) {
                this.cacheQuote(cacheKey, quote);
            }
            return quote;
        }));
    };
    executeSwap = (request) => (0, function_1.pipe)(this.validateSwapRequest(request), TE.fromEither, TE.chain(() => this.checkTokenAllowances(request)), TE.chain(() => this.estimateGasForSwap(request)), TE.chain(gasEstimate => this.performSwap(request, gasEstimate)), TE.chain(response => this.monitorSwapExecution(response)));
    getRoutes = (request) => {
        const cacheKey = this.generateCacheKey('routes', request);
        return (0, function_1.pipe)(this.getCachedRoutes(cacheKey), TE.fromOption(() => ({ type: 'network_error', message: 'No cached routes' })), TE.orElse(() => this.fetchRoutes(request)), TE.chain(routes => this.optimizeRoutes(routes, request)), TE.map(routes => {
            if (this.integrationConfig.cacheConfig.enableRouteCache) {
                this.cacheRoutes(cacheKey, routes);
            }
            return routes;
        }));
    };
    estimateGas = (request) => (0, function_1.pipe)(this.validateGasEstimateRequest(request), TE.fromEither, TE.chain(() => this.fetchGasEstimate(request)), TE.chain(estimate => this.validateGasEstimate(estimate)));
    validateSwap = (request) => (0, function_1.pipe)(this.validateSwapRequest(request), TE.fromEither, TE.chain(() => this.validateTokenLiquidity(request)), TE.chain(() => this.validateSlippageSettings(request)), TE.chain(() => this.validateGasSettings(request)), TE.map(() => ({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: []
    })));
    analyzeSwapImpact = (request) => (0, function_1.pipe)(this.getQuote(request), TE.chain(quote => this.calculatePriceImpact(quote)), TE.chain(impact => this.assessRisk(impact, request)), TE.map(analysis => this.generateRecommendations(analysis)));
    findOptimalRoute = (request, params) => (0, function_1.pipe)(this.getRoutes(request), TE.chain(routes => this.analyzeRoutes(routes, params)), TE.chain(analysis => this.scoreRoutes(analysis, params)), TE.map(analysis => this.selectOptimalRoute(analysis, params)));
    getCrossProtocolRoutes = (request) => (0, function_1.pipe)(this.fetchCrossProtocolRoutes(request), TE.chain(routes => this.validateCrossProtocolRoutes(routes)), TE.map(routes => this.rankCrossProtocolRoutes(routes)));
    getAnalytics = () => (0, function_1.pipe)(this.fetchAnalytics(), TE.chain(analytics => this.validateAnalytics(analytics)), TE.map(analytics => this.enrichAnalytics(analytics)));
    getProtocolStats = () => (0, function_1.pipe)(this.fetchProtocolStats(), TE.chain(stats => this.validateProtocolStats(stats)), TE.map(stats => this.enrichProtocolStats(stats)));
    monitorSwap = (txHash) => (0, function_1.pipe)(this.fetchTransactionStatus(txHash), TE.chain(status => this.trackConfirmations(status)), TE.map(monitoring => this.updateMonitoringStatus(monitoring)));
    generateCacheKey = (type, request) => {
        const requestStr = JSON.stringify(request);
        return `${type}_${Buffer.from(requestStr).toString('base64')}`;
    };
    getCachedQuote = (cacheKey) => {
        const cached = this.quoteCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < constants_1.CACHE_CONFIG.QUOTE_CACHE_DURATION) {
            return O.some(cached.quote);
        }
        return O.none;
    };
    getCachedRoutes = (cacheKey) => {
        const cached = this.routeCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < constants_1.CACHE_CONFIG.ROUTE_CACHE_DURATION) {
            return O.some(cached.routes);
        }
        return O.none;
    };
    cacheQuote = (cacheKey, quote) => {
        this.quoteCache.set(cacheKey, { quote, timestamp: Date.now() });
    };
    cacheRoutes = (cacheKey, routes) => {
        this.routeCache.set(cacheKey, { routes, timestamp: Date.now() });
    };
    fetchQuote = (request) => TE.tryCatch(async () => {
        const response = await fetch(`${constants_1.SYMPHONY_API.BASE_URL}${constants_1.SYMPHONY_API.ENDPOINTS.QUOTE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, (error) => ({ type: 'network_error', message: String(error) }));
    fetchRoutes = (request) => TE.tryCatch(async () => {
        const response = await fetch(`${constants_1.SYMPHONY_API.BASE_URL}${constants_1.SYMPHONY_API.ENDPOINTS.ROUTES}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, (error) => ({ type: 'network_error', message: String(error) }));
    fetchGasEstimate = (request) => TE.tryCatch(async () => {
        const response = await fetch(`${constants_1.SYMPHONY_API.BASE_URL}${constants_1.SYMPHONY_API.ENDPOINTS.GAS_ESTIMATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, (error) => ({ type: 'gas_estimation_failed', reason: String(error) }));
    fetchAnalytics = () => TE.tryCatch(async () => {
        const response = await fetch(`${constants_1.SYMPHONY_API.BASE_URL}${constants_1.SYMPHONY_API.ENDPOINTS.ANALYTICS}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, (error) => ({ type: 'network_error', message: String(error) }));
    fetchProtocolStats = () => TE.tryCatch(async () => {
        const response = await fetch(`${constants_1.SYMPHONY_API.BASE_URL}${constants_1.SYMPHONY_API.ENDPOINTS.PROTOCOLS}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, (error) => ({ type: 'network_error', message: String(error) }));
    fetchTransactionStatus = (txHash) => TE.tryCatch(async () => {
        const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
        return {
            transactionId: txHash,
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            confirmations: Number(receipt.blockNumber),
            expectedConfirmations: 1,
            estimatedTime: 0,
            actualTime: Date.now(),
        };
    }, (error) => ({ type: 'network_error', message: String(error) }));
    validateSwapRequest = (request) => {
        const errors = [];
        if (!request.tokenIn || !request.tokenOut) {
            errors.push('Token addresses are required');
        }
        if (!request.amountIn || request.amountIn === '0') {
            errors.push('Amount in must be greater than 0');
        }
        if (!request.recipient) {
            errors.push('Recipient address is required');
        }
        if (request.slippagePercent < 0 || request.slippagePercent > 50) {
            errors.push('Slippage must be between 0 and 50%');
        }
        if (errors.length > 0) {
            return E.left({ type: 'validation_failed', errors });
        }
        return E.right(request);
    };
    validateGasEstimateRequest = (request) => {
        const errors = [];
        if (!request.tokenIn || !request.tokenOut) {
            errors.push('Token addresses are required');
        }
        if (!request.amountIn || request.amountIn === '0') {
            errors.push('Amount in must be greater than 0');
        }
        if (!request.routeId) {
            errors.push('Route ID is required');
        }
        if (errors.length > 0) {
            return E.left({ type: 'validation_failed', errors });
        }
        return E.right(request);
    };
    validateQuote = (quote) => {
        if (quote.validUntil < Date.now()) {
            return TE.left({ type: 'quote_expired', quoteId: quote.route.id, expiredAt: quote.validUntil });
        }
        if (!quote.route.outputAmount || quote.route.outputAmount === '0') {
            return TE.left({ type: 'insufficient_liquidity', pair: `${quote.route.inputToken.symbol}/${quote.route.outputToken.symbol}`, requested: quote.route.inputAmount, available: '0' });
        }
        return TE.right(quote);
    };
    validateGasEstimate = (estimate) => {
        if (estimate.confidence < 0.5) {
            return TE.left({ type: 'gas_estimation_failed', reason: 'Low confidence gas estimate' });
        }
        return TE.right(estimate);
    };
    checkTokenAllowances = (request) => TE.tryCatch(async () => {
        return;
    }, (error) => ({ type: 'insufficient_allowance', token: request.tokenIn, required: BigInt(request.amountIn) }));
    estimateGasForSwap = (request) => this.estimateGas({
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amountIn: request.amountIn,
        routeId: request.routeId,
        recipient: request.recipient,
    });
    performSwap = (request, gasEstimate) => TE.tryCatch(async () => {
        const hash = await this.walletClient.writeContract({
            address: constants_1.SYMPHONY_ADDRESSES.ROUTER,
            abi: SYMPHONY_ROUTER_ABI,
            functionName: 'exactInputSingle',
            args: [
                request.tokenIn,
                request.tokenOut,
                BigInt(request.amountIn),
                BigInt(request.amountOutMinimum),
                request.recipient,
                request.deadline,
            ],
            gas: BigInt(gasEstimate.gasLimit),
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
            txHash: hash,
            route: {
                id: request.routeId,
                inputToken: constants_1.SYMPHONY_TOKENS.SEI,
                outputToken: constants_1.SYMPHONY_TOKENS.USDC,
                inputAmount: request.amountIn,
                outputAmount: request.amountOutMinimum,
                priceImpact: 0,
                executionPrice: '0',
                midPrice: '0',
                minimumAmountOut: request.amountOutMinimum,
                maximumAmountIn: request.amountIn,
                routes: [],
                gasEstimate: gasEstimate.gasLimit,
                fees: {
                    protocolFee: '0',
                    gasFee: gasEstimate.estimatedCost,
                    liquidityProviderFee: '0',
                    totalFee: gasEstimate.estimatedCost,
                },
            },
            actualAmountIn: request.amountIn,
            actualAmountOut: request.amountOutMinimum,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice.toString(),
            timestamp: Date.now(),
        };
    }, (error) => ({ type: 'execution_failed', reason: String(error) }));
    monitorSwapExecution = (response) => (0, function_1.pipe)(this.monitorSwap(response.txHash), TE.map(() => response));
    validateTokenLiquidity = (request) => TE.tryCatch(async () => {
        return;
    }, (error) => ({ type: 'insufficient_liquidity', pair: `${request.tokenIn}/${request.tokenOut}`, requested: request.amountIn, available: '0' }));
    validateSlippageSettings = (request) => {
        if (request.slippagePercent > constants_1.SLIPPAGE_LEVELS.VERY_HIGH) {
            return TE.left({ type: 'slippage_exceeded', expected: '0', actual: request.slippagePercent.toString(), limit: constants_1.SLIPPAGE_LEVELS.VERY_HIGH.toString() });
        }
        return TE.right(undefined);
    };
    validateGasSettings = (request) => TE.right(undefined);
    calculatePriceImpact = (quote) => TE.right({
        priceImpact: quote.route.priceImpact,
        slippageRisk: quote.route.priceImpact < 1 ? 'low' : quote.route.priceImpact < 3 ? 'medium' : 'high',
        liquidityDepth: '1000000',
        marketCapImpact: 0,
        recommendation: quote.route.priceImpact < 1 ? 'proceed' : quote.route.priceImpact < 3 ? 'caution' : 'split_order',
    });
    assessRisk = (impact, request) => TE.right(impact);
    generateRecommendations = (analysis) => analysis;
    optimizeRoutes = (routes, request) => TE.right(routes);
    analyzeRoutes = (routes, params) => TE.right({
        optimalRoute: routes.bestRoute,
        alternativeRoutes: routes.routes,
        riskScore: 0.5,
        efficiencyScore: 0.8,
        costAnalysis: {
            gasCost: routes.bestRoute.fees.gasFee,
            protocolFees: routes.bestRoute.fees.protocolFee,
            priceImpact: routes.bestRoute.priceImpact.toString(),
            totalCost: routes.bestRoute.fees.totalFee,
        },
    });
    scoreRoutes = (analysis, params) => TE.right(analysis);
    selectOptimalRoute = (analysis, params) => analysis;
    fetchCrossProtocolRoutes = (request) => TE.right([]);
    validateCrossProtocolRoutes = (routes) => TE.right(routes);
    rankCrossProtocolRoutes = (routes) => routes;
    validateAnalytics = (analytics) => TE.right(analytics);
    enrichAnalytics = (analytics) => analytics;
    validateProtocolStats = (stats) => TE.right(stats);
    enrichProtocolStats = (stats) => stats;
    trackConfirmations = (status) => TE.right(status);
    updateMonitoringStatus = (monitoring) => monitoring;
}
exports.SymphonyProtocolWrapper = SymphonyProtocolWrapper;
const createSymphonyProtocolWrapper = (config, integrationConfig, publicClient, walletClient) => {
    return new SymphonyProtocolWrapper(config, integrationConfig, publicClient, walletClient);
};
exports.createSymphonyProtocolWrapper = createSymphonyProtocolWrapper;
exports.defaultSymphonyConfig = {
    apiUrl: constants_1.SYMPHONY_API.BASE_URL,
    contractAddress: constants_1.SYMPHONY_ADDRESSES.ROUTER,
    maxSlippagePercent: constants_1.SLIPPAGE_LEVELS.MEDIUM,
    gasLimitMultiplier: 1.2,
    timeout: constants_1.SYMPHONY_API.TIMEOUT,
};
exports.defaultSymphonyIntegrationConfig = {
    enableAnalytics: true,
    enableRouteOptimization: true,
    enableRiskAnalysis: true,
    enableMonitoring: true,
    cacheConfig: {
        enableQuoteCache: true,
        quoteCacheDuration: constants_1.CACHE_CONFIG.QUOTE_CACHE_DURATION,
        enableRouteCache: true,
        routeCacheDuration: constants_1.CACHE_CONFIG.ROUTE_CACHE_DURATION,
    },
};
//# sourceMappingURL=SymphonyProtocolWrapper.js.map