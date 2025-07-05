"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCitrexProtocolWrapper = exports.CitrexProtocolWrapper = void 0;
const function_1 = require("fp-ts/function");
const TE = __importStar(require("fp-ts/TaskEither"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../../../utils/logger"));
const DEFAULT_CITREX_CONTRACTS = {
    perpetualTrading: 'sei1citrex1perpetual2trading3contract4address5here6for7main8network9',
    vault: 'sei1citrex1vault2contract3address4here5for6collateral7management8only9',
    priceOracle: 'sei1citrex1price2oracle3contract4address5here6for7price8feeds9only',
    liquidationEngine: 'sei1citrex1liquidation2engine3contract4address5here6for7risk8mgmt9',
    fundingRateCalculator: 'sei1citrex1funding2rate3calculator4contract5address6here7for8rates9',
    riskManager: 'sei1citrex1risk2manager3contract4address5here6for7position8limits9'
};
const CITREX_CONSTANTS = {
    MARKETS: {
        'SEI-USDC': {
            symbol: 'SEI-USDC',
            baseAsset: 'SEI',
            quoteAsset: 'USDC',
            maxLeverage: 20,
            minOrderSize: 1,
            tickSize: 0.0001,
            stepSize: 0.001
        },
        'BTC-USDC': {
            symbol: 'BTC-USDC',
            baseAsset: 'BTC',
            quoteAsset: 'USDC',
            maxLeverage: 50,
            minOrderSize: 0.001,
            tickSize: 0.01,
            stepSize: 0.0001
        },
        'ETH-USDC': {
            symbol: 'ETH-USDC',
            baseAsset: 'ETH',
            quoteAsset: 'USDC',
            maxLeverage: 25,
            minOrderSize: 0.01,
            tickSize: 0.01,
            stepSize: 0.001
        }
    },
    TRADING_FEES: {
        MAKER: 0.0002,
        TAKER: 0.0005
    },
    MARGIN_REQUIREMENTS: {
        INITIAL: 0.1,
        MAINTENANCE: 0.05
    },
    LIQUIDATION_BUFFER: 0.02,
    FUNDING_INTERVAL: 28800,
    MAX_POSITION_SIZE: 10000000,
    MIN_COLLATERAL: 10
};
class CitrexProtocolWrapper {
    constructor(publicClient, walletClient, protocolConfig) {
        this.publicClient = publicClient;
        this.walletClient = walletClient;
        this.protocolConfig = protocolConfig;
        this.name = 'Citrex';
        this.version = '1.0.0';
        this.isInitialized = false;
        this.initialize = () => TE.tryCatch(async () => {
            const chainId = await this.publicClient.getChainId();
            if (![1329, 713715, 328].includes(chainId)) {
                throw new types_1.CitrexProtocolError('Citrex protocol only supports Sei Network', 'INVALID_NETWORK', { chainId });
            }
            await this.verifyContractDeployments();
            await this.initializeMarketData();
            this.isInitialized = true;
            logger_1.default.info('Citrex protocol wrapper initialized successfully', {
                network: this.protocolConfig.network,
                contracts: this.config.contracts
            });
        }, (error) => new types_1.CitrexProtocolError(`Failed to initialize Citrex protocol: ${error}`, 'INITIALIZATION_FAILED', { error }));
        this.getPositions = (walletAddress) => (0, function_1.pipe)(TE.Do, TE.bind('positionIds', () => this.getUserPositionIds(walletAddress)), TE.bind('positions', ({ positionIds }) => TE.sequenceArray(positionIds.map(id => this.getPosition(id)))), TE.map(({ positions }) => positions));
        this.getPosition = (positionId) => TE.tryCatch(async () => {
            const positionData = await this.fetchPositionData(positionId);
            const marketData = await this.fetchMarketData(positionData.market);
            const pnl = await this.calculatePositionPnL(positionData, marketData.markPrice);
            const liquidationInfo = await this.calculateLiquidationInfo(positionData, marketData);
            return {
                id: positionId,
                walletAddress: positionData.walletAddress,
                platform: 'Citrex',
                type: 'perpetual',
                protocol: 'citrex',
                createdAt: positionData.createdAt,
                lastUpdated: new Date().toISOString(),
                market: positionData.market,
                marketSymbol: positionData.marketSymbol,
                side: positionData.side,
                size: positionData.size,
                sizeFormatted: this.formatNumber(Number(positionData.size), 6),
                notionalValue: positionData.notionalValue,
                entryPrice: positionData.entryPrice,
                markPrice: marketData.markPrice,
                liquidationPrice: liquidationInfo.liquidationPrice,
                collateral: positionData.collateral,
                collateralFormatted: this.formatNumber(Number(positionData.collateral), 2),
                collateralUSD: positionData.collateralUSD,
                leverage: positionData.leverage,
                margin: {
                    initial: positionData.margin.initial,
                    maintenance: positionData.margin.maintenance,
                    available: positionData.margin.available
                },
                pnl: {
                    unrealized: pnl.unrealized,
                    realized: pnl.realized,
                    total: pnl.total
                },
                funding: {
                    rate: marketData.fundingRate,
                    payment: pnl.fundingPayment,
                    nextPayment: marketData.nextFundingTime
                },
                risk: {
                    liquidationRisk: this.calculateLiquidationRisk(liquidationInfo.marginRatio),
                    marginRatio: liquidationInfo.marginRatio,
                    maxLeverage: CITREX_CONSTANTS.MARKETS[positionData.market]?.maxLeverage || 10
                },
                fees: {
                    trading: pnl.tradingFees,
                    funding: pnl.fundingPayment,
                    total: pnl.tradingFees + pnl.fundingPayment
                }
            };
        }, (error) => new types_1.CitrexProtocolError(`Failed to get position: ${error}`, 'GET_POSITION_FAILED', { positionId, error }));
        this.getTradingMetrics = (walletAddress) => (0, function_1.pipe)(TE.Do, TE.bind('positions', () => this.getPositions(walletAddress)), TE.bind('historicalData', () => this.fetchHistoricalTradingData(walletAddress)), TE.map(({ positions, historicalData }) => {
            const totalNotionalValue = positions.reduce((sum, pos) => sum + pos.notionalValue, 0);
            const totalCollateral = positions.reduce((sum, pos) => sum + pos.collateralUSD, 0);
            const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl.total, 0);
            const totalFees = positions.reduce((sum, pos) => sum + pos.fees.total, 0);
            return {
                totalPositions: positions.length,
                totalNotionalValue,
                totalCollateral,
                totalPnL,
                totalFundingPayments: positions.reduce((sum, pos) => sum + pos.funding.payment, 0),
                totalTradingFees: totalFees,
                winRate: historicalData.winRate,
                averageHoldingTime: historicalData.averageHoldingTime,
                maxDrawdown: historicalData.maxDrawdown,
                sharpeRatio: historicalData.sharpeRatio,
                liquidationCount: historicalData.liquidationCount
            };
        }));
        this.getMarketData = (market) => TE.tryCatch(async () => {
            const markets = market ? [market] : Object.keys(CITREX_CONSTANTS.MARKETS);
            const marketDataPromises = markets.map(m => this.fetchMarketData(m));
            const marketData = await Promise.all(marketDataPromises);
            return marketData.map(data => ({
                market: data.market,
                symbol: data.symbol,
                baseAsset: data.baseAsset,
                quoteAsset: data.quoteAsset,
                markPrice: data.markPrice,
                indexPrice: data.indexPrice,
                fundingRate: data.fundingRate,
                nextFundingTime: data.nextFundingTime,
                openInterest: data.openInterest,
                volume24h: data.volume24h,
                priceChange24h: data.priceChange24h,
                priceChangePercent24h: data.priceChangePercent24h,
                high24h: data.high24h,
                low24h: data.low24h,
                maxLeverage: data.maxLeverage,
                minOrderSize: data.minOrderSize,
                tickSize: data.tickSize,
                stepSize: data.stepSize,
                isActive: data.isActive,
                maintenanceMargin: data.maintenanceMargin,
                initialMargin: data.initialMargin
            }));
        }, (error) => new types_1.CitrexProtocolError(`Failed to get market data: ${error}`, 'MARKET_DATA_FAILED', { market, error }));
        this.getMarkPrice = (market) => (0, function_1.pipe)(TE.Do, TE.bind('marketData', () => this.getMarketData(market)), TE.map(({ marketData }) => marketData[0]?.markPrice || 0));
        this.getFundingRate = (market) => (0, function_1.pipe)(TE.Do, TE.bind('marketData', () => this.getMarketData(market)), TE.map(({ marketData }) => marketData[0]?.fundingRate || 0));
        this.openPosition = (params) => (0, function_1.pipe)(TE.Do, TE.bind('validation', () => this.validateOpenPositionParams(params)), TE.bind('marketData', () => this.getMarketData(params.market)), TE.bind('riskCheck', ({ marketData }) => this.performRiskCheck(params, marketData[0])), TE.bind('txHash', ({ marketData }) => TE.tryCatch(() => this.executeOpenPosition(params, marketData[0]), (error) => new types_1.CitrexProtocolError(`Failed to execute open position: ${error}`, 'OPEN_POSITION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.closePosition = (params) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getPosition(params.positionId)), TE.bind('marketData', ({ position }) => this.getMarketData(position.market)), TE.bind('txHash', ({ position, marketData }) => TE.tryCatch(() => this.executeClosePosition(params, position, marketData[0]), (error) => new types_1.CitrexProtocolError(`Failed to execute close position: ${error}`, 'CLOSE_POSITION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.adjustPosition = (params) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getPosition(params.positionId)), TE.bind('validation', ({ position }) => this.validateAdjustPositionParams(params, position)), TE.bind('txHash', ({ position }) => TE.tryCatch(() => this.executeAdjustPosition(params, position), (error) => new types_1.CitrexProtocolError(`Failed to execute adjust position: ${error}`, 'ADJUST_POSITION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.getLiquidationInfo = (positionId) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getPosition(positionId)), TE.bind('marketData', ({ position }) => this.getMarketData(position.market)), TE.map(({ position, marketData }) => {
            const liquidationInfo = this.calculateLiquidationInfo(position, marketData[0]);
            return {
                positionId,
                walletAddress: position.walletAddress,
                market: position.market,
                liquidationPrice: liquidationInfo.liquidationPrice,
                marginRatio: liquidationInfo.marginRatio,
                timeToLiquidation: liquidationInfo.timeToLiquidation,
                requiredMargin: liquidationInfo.requiredMargin,
                availableMargin: liquidationInfo.availableMargin,
                actions: liquidationInfo.actions
            };
        }));
        this.calculateLiquidationPrice = (params) => TE.right(params.side === 'long'
            ? params.entryPrice * (1 - 1 / params.leverage + params.maintenanceMargin)
            : params.entryPrice * (1 + 1 / params.leverage - params.maintenanceMargin));
        this.calculateUnrealizedPnL = (positionId, markPrice) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getPosition(positionId)), TE.bind('currentMarkPrice', ({ position }) => markPrice ? TE.right(markPrice) : this.getMarkPrice(position.market)), TE.map(({ position, currentMarkPrice }) => {
            const size = Number(position.size);
            const entryPrice = position.entryPrice;
            const priceDiff = position.side === 'long'
                ? currentMarkPrice - entryPrice
                : entryPrice - currentMarkPrice;
            return size * priceDiff;
        }));
        this.calculateFundingPayment = (positionId) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getPosition(positionId)), TE.bind('fundingRate', ({ position }) => this.getFundingRate(position.market)), TE.map(({ position, fundingRate }) => {
            const notionalValue = position.notionalValue;
            return notionalValue * fundingRate * (position.side === 'long' ? -1 : 1);
        }));
        this.cancelOrder = (orderId) => TE.tryCatch(async () => {
            logger_1.default.info('Canceling order', { orderId });
            return this.simulateTransaction('cancelOrder', { orderId });
        }, (error) => new types_1.CitrexProtocolError(`Failed to cancel order: ${error}`, 'CANCEL_ORDER_FAILED', { orderId, error }));
        this.cancelAllOrders = (walletAddress, market) => TE.tryCatch(async () => {
            logger_1.default.info('Canceling all orders', { walletAddress, market });
            return this.simulateTransaction('cancelAllOrders', { walletAddress, market });
        }, (error) => new types_1.CitrexProtocolError(`Failed to cancel all orders: ${error}`, 'CANCEL_ALL_ORDERS_FAILED', { walletAddress, market, error }));
        this.verifyContractDeployments = async () => {
            const contracts = Object.values(this.config.contracts);
            for (const contract of contracts) {
                if (!contract.startsWith('sei1')) {
                    throw new types_1.CitrexProtocolError(`Invalid contract address: ${contract}`, 'INVALID_CONTRACT', { contract });
                }
            }
        };
        this.initializeMarketData = async () => {
            logger_1.default.info('Initializing market data for Citrex protocol');
        };
        this.getUserPositionIds = (walletAddress) => TE.tryCatch(async () => {
            return ['citrex-pos-1', 'citrex-pos-2'];
        }, (error) => new types_1.CitrexProtocolError(`Failed to get user position IDs: ${error}`, 'GET_POSITION_IDS_FAILED', { walletAddress, error }));
        this.fetchPositionData = async (positionId) => {
            return {
                id: positionId,
                walletAddress: 'sei1example1wallet2address3here4for5testing6purposes7only8',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                market: 'SEI-USDC',
                marketSymbol: 'SEI-USDC',
                side: 'long',
                size: '1000',
                notionalValue: 500,
                entryPrice: 0.5,
                collateral: '100',
                collateralUSD: 100,
                leverage: 5,
                margin: {
                    initial: 20,
                    maintenance: 10,
                    available: 80
                }
            };
        };
        this.fetchMarketData = async (market) => {
            const marketConfig = CITREX_CONSTANTS.MARKETS[market];
            if (!marketConfig) {
                throw new types_1.CitrexProtocolError(`Unknown market: ${market}`, 'UNKNOWN_MARKET', { market });
            }
            return {
                market,
                symbol: marketConfig.symbol,
                baseAsset: marketConfig.baseAsset,
                quoteAsset: marketConfig.quoteAsset,
                markPrice: 0.52,
                indexPrice: 0.521,
                fundingRate: 0.0001,
                nextFundingTime: new Date(Date.now() + 3600000).toISOString(),
                openInterest: 1000000,
                volume24h: 5000000,
                priceChange24h: 0.02,
                priceChangePercent24h: 4.0,
                high24h: 0.53,
                low24h: 0.48,
                maxLeverage: marketConfig.maxLeverage,
                minOrderSize: marketConfig.minOrderSize,
                tickSize: marketConfig.tickSize,
                stepSize: marketConfig.stepSize,
                isActive: true,
                maintenanceMargin: CITREX_CONSTANTS.MARGIN_REQUIREMENTS.MAINTENANCE,
                initialMargin: CITREX_CONSTANTS.MARGIN_REQUIREMENTS.INITIAL
            };
        };
        this.fetchHistoricalTradingData = (walletAddress) => TE.right({
            winRate: 0.65,
            averageHoldingTime: 14400,
            maxDrawdown: 0.15,
            sharpeRatio: 1.2,
            liquidationCount: 0
        });
        this.calculatePositionPnL = async (positionData, markPrice) => {
            const size = Number(positionData.size);
            const entryPrice = positionData.entryPrice;
            const priceDiff = positionData.side === 'long'
                ? markPrice - entryPrice
                : entryPrice - markPrice;
            const unrealizedPnL = size * priceDiff;
            const tradingFees = positionData.notionalValue * CITREX_CONSTANTS.TRADING_FEES.TAKER;
            const fundingPayment = positionData.notionalValue * 0.0001;
            return {
                unrealized: unrealizedPnL,
                realized: 0,
                total: unrealizedPnL,
                tradingFees,
                fundingPayment
            };
        };
        this.calculateLiquidationInfo = (positionData, marketData) => {
            const maintenanceMargin = CITREX_CONSTANTS.MARGIN_REQUIREMENTS.MAINTENANCE;
            const liquidationPrice = positionData.side === 'long'
                ? positionData.entryPrice * (1 - 1 / positionData.leverage + maintenanceMargin)
                : positionData.entryPrice * (1 + 1 / positionData.leverage - maintenanceMargin);
            const currentPrice = marketData.markPrice;
            const marginRatio = positionData.margin.available / positionData.notionalValue;
            const timeToLiquidation = this.estimateTimeToLiquidation(positionData, marketData);
            return {
                liquidationPrice,
                marginRatio,
                timeToLiquidation,
                requiredMargin: positionData.notionalValue * maintenanceMargin,
                availableMargin: positionData.margin.available,
                actions: {
                    addMargin: Math.max(0, positionData.notionalValue * maintenanceMargin - positionData.margin.available),
                    reduceSize: Math.max(0, Number(positionData.size) * 0.5),
                    reduceLeverage: Math.max(2, positionData.leverage * 0.5)
                }
            };
        };
        this.estimateTimeToLiquidation = (positionData, marketData) => {
            const volatility = 0.02;
            const priceDistance = Math.abs(marketData.markPrice - positionData.entryPrice);
            const liquidationDistance = Math.abs(marketData.markPrice - this.calculateLiquidationInfo(positionData, marketData).liquidationPrice);
            return Math.max(3600, liquidationDistance / (volatility * marketData.markPrice) * 86400);
        };
        this.calculateLiquidationRisk = (marginRatio) => {
            if (marginRatio > 0.2)
                return 'low';
            if (marginRatio > 0.1)
                return 'medium';
            if (marginRatio > 0.05)
                return 'high';
            return 'critical';
        };
        this.validateOpenPositionParams = (params) => TE.tryCatch(async () => {
            if (!params.walletAddress || !params.market || !params.side || !params.size) {
                throw new types_1.CitrexProtocolError('Missing required position parameters', 'INVALID_PARAMS', { params });
            }
            const collateral = Number(params.collateral);
            if (collateral < CITREX_CONSTANTS.MIN_COLLATERAL) {
                throw new types_1.CitrexProtocolError('Collateral below minimum threshold', 'INSUFFICIENT_COLLATERAL', { collateral, minimum: CITREX_CONSTANTS.MIN_COLLATERAL });
            }
            const marketConfig = CITREX_CONSTANTS.MARKETS[params.market];
            if (!marketConfig) {
                throw new types_1.CitrexProtocolError(`Unknown market: ${params.market}`, 'UNKNOWN_MARKET', { market: params.market });
            }
            if (params.leverage > marketConfig.maxLeverage) {
                throw new types_1.CitrexProtocolError('Leverage exceeds maximum for market', 'LEVERAGE_TOO_HIGH', { leverage: params.leverage, maxLeverage: marketConfig.maxLeverage });
            }
        }, (error) => error);
        this.validateAdjustPositionParams = (params, position) => TE.tryCatch(async () => {
            if (!params.positionId || !params.action || !params.amount) {
                throw new types_1.CitrexProtocolError('Missing required adjustment parameters', 'INVALID_PARAMS', { params });
            }
            const amount = Number(params.amount);
            if (amount <= 0) {
                throw new types_1.CitrexProtocolError('Adjustment amount must be positive', 'INVALID_AMOUNT', { amount });
            }
        }, (error) => error);
        this.performRiskCheck = (params, marketData) => TE.tryCatch(async () => {
            const notionalValue = Number(params.size) * marketData.markPrice;
            if (notionalValue > this.config.maxPositionSize) {
                throw new types_1.CitrexProtocolError('Position size exceeds maximum allowed', 'POSITION_TOO_LARGE', { notionalValue, maxSize: this.config.maxPositionSize });
            }
            const requiredMargin = notionalValue / params.leverage;
            const availableCollateral = Number(params.collateral);
            if (availableCollateral < requiredMargin) {
                throw new types_1.CitrexProtocolError('Insufficient collateral for position', 'INSUFFICIENT_COLLATERAL', { required: requiredMargin, available: availableCollateral });
            }
        }, (error) => error);
        this.executeOpenPosition = async (params, marketData) => {
            logger_1.default.info('Executing open position transaction', {
                walletAddress: params.walletAddress,
                market: params.market,
                side: params.side,
                size: params.size,
                leverage: params.leverage,
                collateral: params.collateral
            });
            return this.simulateTransaction('openPosition', params);
        };
        this.executeClosePosition = async (params, position, marketData) => {
            logger_1.default.info('Executing close position transaction', {
                walletAddress: params.walletAddress,
                positionId: params.positionId,
                size: params.size,
                currentPnL: position.pnl.unrealized
            });
            return this.simulateTransaction('closePosition', params);
        };
        this.executeAdjustPosition = async (params, position) => {
            logger_1.default.info('Executing adjust position transaction', {
                walletAddress: params.walletAddress,
                positionId: params.positionId,
                action: params.action,
                amount: params.amount
            });
            return this.simulateTransaction('adjustPosition', params);
        };
        this.simulateTransaction = async (operation, params) => {
            await new Promise(resolve => setTimeout(resolve, 150));
            return `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
        };
        this.formatNumber = (value, decimals) => {
            return value.toFixed(decimals);
        };
        this.config = {
            contracts: protocolConfig.contractAddresses.citrex || DEFAULT_CITREX_CONTRACTS,
            defaultLeverage: 5,
            maxLeverage: 50,
            minMarginRatio: CITREX_CONSTANTS.MARGIN_REQUIREMENTS.MAINTENANCE,
            liquidationBuffer: CITREX_CONSTANTS.LIQUIDATION_BUFFER,
            fundingInterval: CITREX_CONSTANTS.FUNDING_INTERVAL,
            maxPositionSize: CITREX_CONSTANTS.MAX_POSITION_SIZE
        };
    }
}
exports.CitrexProtocolWrapper = CitrexProtocolWrapper;
const createCitrexProtocolWrapper = (publicClient, walletClient, config) => {
    return new CitrexProtocolWrapper(publicClient, walletClient, config);
};
exports.createCitrexProtocolWrapper = createCitrexProtocolWrapper;
//# sourceMappingURL=CitrexProtocolWrapper.js.map