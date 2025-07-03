/**
 * Citrex Protocol Wrapper for Sei Network
 * Handles perpetual trading operations with comprehensive risk management
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { PublicClient, WalletClient } from 'viem';
import {
  CitrexProtocolAdapter,
  CitrexPerpetualPosition,
  CitrexMarketData,
  CitrexTradingMetrics,
  CitrexOpenPositionParams,
  CitrexClosePositionParams,
  CitrexAdjustPositionParams,
  CitrexLiquidationInfo,
  CitrexConfig,
  CitrexProtocolError,
  SeiProtocolConfig
} from '../types';
import {
  WalletAddress,
  TokenAddress,
  TransactionHash,
  AsyncResult
} from '../../../types/portfolio';
import logger from '../../../utils/logger';

// Default Citrex contract addresses on Sei Network
const DEFAULT_CITREX_CONTRACTS = {
  perpetualTrading: 'sei1citrex1perpetual2trading3contract4address5here6for7main8network9',
  vault: 'sei1citrex1vault2contract3address4here5for6collateral7management8only9',
  priceOracle: 'sei1citrex1price2oracle3contract4address5here6for7price8feeds9only',
  liquidationEngine: 'sei1citrex1liquidation2engine3contract4address5here6for7risk8mgmt9',
  fundingRateCalculator: 'sei1citrex1funding2rate3calculator4contract5address6here7for8rates9',
  riskManager: 'sei1citrex1risk2manager3contract4address5here6for7position8limits9'
};

// Citrex protocol constants
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
    MAKER: 0.0002,  // 0.02% maker fee
    TAKER: 0.0005   // 0.05% taker fee
  },
  MARGIN_REQUIREMENTS: {
    INITIAL: 0.1,     // 10% initial margin
    MAINTENANCE: 0.05 // 5% maintenance margin
  },
  LIQUIDATION_BUFFER: 0.02, // 2% buffer before liquidation
  FUNDING_INTERVAL: 28800,  // 8 hours in seconds
  MAX_POSITION_SIZE: 10000000, // $10M max position size
  MIN_COLLATERAL: 10 // $10 minimum collateral
};

export class CitrexProtocolWrapper implements CitrexProtocolAdapter {
  public readonly name = 'Citrex';
  public readonly version = '1.0.0';
  public isInitialized = false;

  private config: CitrexConfig;

  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private protocolConfig: SeiProtocolConfig
  ) {
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

  /**
   * Initialize the Citrex protocol adapter
   */
  public initialize = (): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        // Verify network compatibility
        const chainId = await this.publicClient.getChainId();
        if (![1329, 713715, 328].includes(chainId)) {
          throw new CitrexProtocolError(
            'Citrex protocol only supports Sei Network',
            'INVALID_NETWORK',
            { chainId }
          );
        }

        // Verify contract deployments
        await this.verifyContractDeployments();

        // Initialize market data
        await this.initializeMarketData();

        this.isInitialized = true;
        logger.info('Citrex protocol wrapper initialized successfully', {
          network: this.protocolConfig.network,
          contracts: this.config.contracts
        });
      },
      (error) => new CitrexProtocolError(
        `Failed to initialize Citrex protocol: ${error}`,
        'INITIALIZATION_FAILED',
        { error }
      )
    );

  /**
   * Get user perpetual positions
   */
  public getPositions = (walletAddress: WalletAddress): AsyncResult<CitrexPerpetualPosition[]> =>
    pipe(
      TE.Do,
      TE.bind('positionIds', () => this.getUserPositionIds(walletAddress)),
      TE.bind('positions', ({ positionIds }) =>
        TE.sequenceArray(positionIds.map(id => this.getPosition(id)))
      ),
      TE.map(({ positions }) => positions)
    );

  /**
   * Get specific position by ID
   */
  public getPosition = (positionId: string): AsyncResult<CitrexPerpetualPosition> =>
    TE.tryCatch(
      async () => {
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
      },
      (error) => new CitrexProtocolError(
        `Failed to get position: ${error}`,
        'GET_POSITION_FAILED',
        { positionId, error }
      )
    );

  /**
   * Get trading metrics for a wallet
   */
  public getTradingMetrics = (walletAddress: WalletAddress): AsyncResult<CitrexTradingMetrics> =>
    pipe(
      TE.Do,
      TE.bind('positions', () => this.getPositions(walletAddress)),
      TE.bind('historicalData', () => this.fetchHistoricalTradingData(walletAddress)),
      TE.map(({ positions, historicalData }) => {
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
      })
    );

  /**
   * Get market data for all or specific markets
   */
  public getMarketData = (market?: string): AsyncResult<CitrexMarketData[]> =>
    TE.tryCatch(
      async () => {
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
      },
      (error) => new CitrexProtocolError(
        `Failed to get market data: ${error}`,
        'MARKET_DATA_FAILED',
        { market, error }
      )
    );

  /**
   * Get mark price for a specific market
   */
  public getMarkPrice = (market: string): AsyncResult<number> =>
    pipe(
      TE.Do,
      TE.bind('marketData', () => this.getMarketData(market)),
      TE.map(({ marketData }) => marketData[0]?.markPrice || 0)
    );

  /**
   * Get funding rate for a specific market
   */
  public getFundingRate = (market: string): AsyncResult<number> =>
    pipe(
      TE.Do,
      TE.bind('marketData', () => this.getMarketData(market)),
      TE.map(({ marketData }) => marketData[0]?.fundingRate || 0)
    );

  /**
   * Open a new perpetual position
   */
  public openPosition = (params: CitrexOpenPositionParams): AsyncResult<TransactionHash> =>
    pipe(
      TE.Do,
      TE.bind('validation', () => this.validateOpenPositionParams(params)),
      TE.bind('marketData', () => this.getMarketData(params.market)),
      TE.bind('riskCheck', ({ marketData }) => this.performRiskCheck(params, marketData[0])),
      TE.bind('txHash', ({ marketData }) => this.executeOpenPosition(params, marketData[0])),
      TE.map(({ txHash }) => txHash)
    );

  /**
   * Close an existing position
   */
  public closePosition = (params: CitrexClosePositionParams): AsyncResult<TransactionHash> =>
    pipe(
      TE.Do,
      TE.bind('position', () => this.getPosition(params.positionId)),
      TE.bind('marketData', ({ position }) => this.getMarketData(position.market)),
      TE.bind('txHash', ({ position, marketData }) => this.executeClosePosition(params, position, marketData[0])),
      TE.map(({ txHash }) => txHash)
    );

  /**
   * Adjust an existing position
   */
  public adjustPosition = (params: CitrexAdjustPositionParams): AsyncResult<TransactionHash> =>
    pipe(
      TE.Do,
      TE.bind('position', () => this.getPosition(params.positionId)),
      TE.bind('validation', ({ position }) => this.validateAdjustPositionParams(params, position)),
      TE.bind('txHash', ({ position }) => this.executeAdjustPosition(params, position)),
      TE.map(({ txHash }) => txHash)
    );

  /**
   * Get liquidation information for a position
   */
  public getLiquidationInfo = (positionId: string): AsyncResult<CitrexLiquidationInfo> =>
    pipe(
      TE.Do,
      TE.bind('position', () => this.getPosition(positionId)),
      TE.bind('marketData', ({ position }) => this.getMarketData(position.market)),
      TE.map(({ position, marketData }) => {
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
      })
    );

  /**
   * Calculate liquidation price for a position
   */
  public calculateLiquidationPrice = (params: {
    side: 'long' | 'short';
    entryPrice: number;
    leverage: number;
    maintenanceMargin: number;
  }): AsyncResult<number> =>
    TE.right(
      params.side === 'long'
        ? params.entryPrice * (1 - 1 / params.leverage + params.maintenanceMargin)
        : params.entryPrice * (1 + 1 / params.leverage - params.maintenanceMargin)
    );

  /**
   * Calculate unrealized PnL for a position
   */
  public calculateUnrealizedPnL = (positionId: string, markPrice?: number): AsyncResult<number> =>
    pipe(
      TE.Do,
      TE.bind('position', () => this.getPosition(positionId)),
      TE.bind('currentMarkPrice', ({ position }) => 
        markPrice ? TE.right(markPrice) : this.getMarkPrice(position.market)
      ),
      TE.map(({ position, currentMarkPrice }) => {
        const size = Number(position.size);
        const entryPrice = position.entryPrice;
        const priceDiff = position.side === 'long' 
          ? currentMarkPrice - entryPrice 
          : entryPrice - currentMarkPrice;
        
        return size * priceDiff;
      })
    );

  /**
   * Calculate funding payment for a position
   */
  public calculateFundingPayment = (positionId: string): AsyncResult<number> =>
    pipe(
      TE.Do,
      TE.bind('position', () => this.getPosition(positionId)),
      TE.bind('fundingRate', ({ position }) => this.getFundingRate(position.market)),
      TE.map(({ position, fundingRate }) => {
        const notionalValue = position.notionalValue;
        return notionalValue * fundingRate * (position.side === 'long' ? -1 : 1);
      })
    );

  /**
   * Cancel an order
   */
  public cancelOrder = (orderId: string): AsyncResult<TransactionHash> =>
    TE.tryCatch(
      async () => {
        logger.info('Canceling order', { orderId });
        return this.simulateTransaction('cancelOrder', { orderId });
      },
      (error) => new CitrexProtocolError(
        `Failed to cancel order: ${error}`,
        'CANCEL_ORDER_FAILED',
        { orderId, error }
      )
    );

  /**
   * Cancel all orders for a wallet
   */
  public cancelAllOrders = (walletAddress: WalletAddress, market?: string): AsyncResult<TransactionHash> =>
    TE.tryCatch(
      async () => {
        logger.info('Canceling all orders', { walletAddress, market });
        return this.simulateTransaction('cancelAllOrders', { walletAddress, market });
      },
      (error) => new CitrexProtocolError(
        `Failed to cancel all orders: ${error}`,
        'CANCEL_ALL_ORDERS_FAILED',
        { walletAddress, market, error }
      )
    );

  // ===================== Private Helper Methods =====================

  private verifyContractDeployments = async (): Promise<void> => {
    const contracts = Object.values(this.config.contracts);
    for (const contract of contracts) {
      if (!contract.startsWith('sei1')) {
        throw new CitrexProtocolError(
          `Invalid contract address: ${contract}`,
          'INVALID_CONTRACT',
          { contract }
        );
      }
    }
  };

  private initializeMarketData = async (): Promise<void> => {
    // Mock initialization of market data
    logger.info('Initializing market data for Citrex protocol');
  };

  private getUserPositionIds = (walletAddress: WalletAddress): AsyncResult<string[]> =>
    TE.tryCatch(
      async () => {
        // Mock implementation - would query perpetual trading contract
        return ['citrex-pos-1', 'citrex-pos-2'];
      },
      (error) => new CitrexProtocolError(
        `Failed to get user position IDs: ${error}`,
        'GET_POSITION_IDS_FAILED',
        { walletAddress, error }
      )
    );

  private fetchPositionData = async (positionId: string): Promise<any> => {
    // Mock position data - would fetch from perpetual trading contract
    return {
      id: positionId,
      walletAddress: 'sei1example1wallet2address3here4for5testing6purposes7only8',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      market: 'SEI-USDC',
      marketSymbol: 'SEI-USDC',
      side: 'long',
      size: '1000', // 1000 SEI
      notionalValue: 500, // $500 notional
      entryPrice: 0.5, // $0.50 entry price
      collateral: '100', // 100 USDC collateral
      collateralUSD: 100,
      leverage: 5,
      margin: {
        initial: 20, // $20 initial margin
        maintenance: 10, // $10 maintenance margin
        available: 80 // $80 available margin
      }
    };
  };

  private fetchMarketData = async (market: string): Promise<any> => {
    // Mock market data - would fetch from price oracle and market contracts
    const marketConfig = CITREX_CONSTANTS.MARKETS[market];
    if (!marketConfig) {
      throw new CitrexProtocolError(
        `Unknown market: ${market}`,
        'UNKNOWN_MARKET',
        { market }
      );
    }

    return {
      market,
      symbol: marketConfig.symbol,
      baseAsset: marketConfig.baseAsset,
      quoteAsset: marketConfig.quoteAsset,
      markPrice: 0.52, // Current mark price
      indexPrice: 0.521, // Index price
      fundingRate: 0.0001, // 0.01% funding rate
      nextFundingTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      openInterest: 1000000, // $1M open interest
      volume24h: 5000000, // $5M 24h volume
      priceChange24h: 0.02, // $0.02 price change
      priceChangePercent24h: 4.0, // 4% price change
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

  private fetchHistoricalTradingData = (walletAddress: WalletAddress): AsyncResult<any> =>
    TE.right({
      winRate: 0.65, // 65% win rate
      averageHoldingTime: 14400, // 4 hours average
      maxDrawdown: 0.15, // 15% max drawdown
      sharpeRatio: 1.2,
      liquidationCount: 0
    });

  private calculatePositionPnL = async (positionData: any, markPrice: number): Promise<any> => {
    const size = Number(positionData.size);
    const entryPrice = positionData.entryPrice;
    const priceDiff = positionData.side === 'long' 
      ? markPrice - entryPrice 
      : entryPrice - markPrice;
    
    const unrealizedPnL = size * priceDiff;
    const tradingFees = positionData.notionalValue * CITREX_CONSTANTS.TRADING_FEES.TAKER;
    const fundingPayment = positionData.notionalValue * 0.0001; // Mock funding payment

    return {
      unrealized: unrealizedPnL,
      realized: 0, // Would track from closed positions
      total: unrealizedPnL,
      tradingFees,
      fundingPayment
    };
  };

  private calculateLiquidationInfo = (positionData: any, marketData: any): any => {
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

  private estimateTimeToLiquidation = (positionData: any, marketData: any): number => {
    // Mock calculation - would use volatility and price movement to estimate
    const volatility = 0.02; // 2% daily volatility
    const priceDistance = Math.abs(marketData.markPrice - positionData.entryPrice);
    const liquidationDistance = Math.abs(marketData.markPrice - this.calculateLiquidationInfo(positionData, marketData).liquidationPrice);
    
    // Estimate in seconds
    return Math.max(3600, liquidationDistance / (volatility * marketData.markPrice) * 86400);
  };

  private calculateLiquidationRisk = (marginRatio: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (marginRatio > 0.2) return 'low';
    if (marginRatio > 0.1) return 'medium';
    if (marginRatio > 0.05) return 'high';
    return 'critical';
  };

  private validateOpenPositionParams = (params: CitrexOpenPositionParams): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        if (!params.walletAddress || !params.market || !params.side || !params.size) {
          throw new CitrexProtocolError(
            'Missing required position parameters',
            'INVALID_PARAMS',
            { params }
          );
        }

        const collateral = Number(params.collateral);
        if (collateral < CITREX_CONSTANTS.MIN_COLLATERAL) {
          throw new CitrexProtocolError(
            'Collateral below minimum threshold',
            'INSUFFICIENT_COLLATERAL',
            { collateral, minimum: CITREX_CONSTANTS.MIN_COLLATERAL }
          );
        }

        const marketConfig = CITREX_CONSTANTS.MARKETS[params.market];
        if (!marketConfig) {
          throw new CitrexProtocolError(
            `Unknown market: ${params.market}`,
            'UNKNOWN_MARKET',
            { market: params.market }
          );
        }

        if (params.leverage > marketConfig.maxLeverage) {
          throw new CitrexProtocolError(
            'Leverage exceeds maximum for market',
            'LEVERAGE_TOO_HIGH',
            { leverage: params.leverage, maxLeverage: marketConfig.maxLeverage }
          );
        }
      },
      (error) => error as CitrexProtocolError
    );

  private validateAdjustPositionParams = (params: CitrexAdjustPositionParams, position: CitrexPerpetualPosition): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        if (!params.positionId || !params.action || !params.amount) {
          throw new CitrexProtocolError(
            'Missing required adjustment parameters',
            'INVALID_PARAMS',
            { params }
          );
        }

        const amount = Number(params.amount);
        if (amount <= 0) {
          throw new CitrexProtocolError(
            'Adjustment amount must be positive',
            'INVALID_AMOUNT',
            { amount }
          );
        }
      },
      (error) => error as CitrexProtocolError
    );

  private performRiskCheck = (params: CitrexOpenPositionParams, marketData: CitrexMarketData): AsyncResult<void> =>
    TE.tryCatch(
      async () => {
        const notionalValue = Number(params.size) * marketData.markPrice;
        
        if (notionalValue > this.config.maxPositionSize) {
          throw new CitrexProtocolError(
            'Position size exceeds maximum allowed',
            'POSITION_TOO_LARGE',
            { notionalValue, maxSize: this.config.maxPositionSize }
          );
        }

        const requiredMargin = notionalValue / params.leverage;
        const availableCollateral = Number(params.collateral);
        
        if (availableCollateral < requiredMargin) {
          throw new CitrexProtocolError(
            'Insufficient collateral for position',
            'INSUFFICIENT_COLLATERAL',
            { required: requiredMargin, available: availableCollateral }
          );
        }
      },
      (error) => error as CitrexProtocolError
    );

  private executeOpenPosition = async (params: CitrexOpenPositionParams, marketData: CitrexMarketData): Promise<TransactionHash> => {
    logger.info('Executing open position transaction', {
      walletAddress: params.walletAddress,
      market: params.market,
      side: params.side,
      size: params.size,
      leverage: params.leverage,
      collateral: params.collateral
    });

    return this.simulateTransaction('openPosition', params);
  };

  private executeClosePosition = async (
    params: CitrexClosePositionParams,
    position: CitrexPerpetualPosition,
    marketData: CitrexMarketData
  ): Promise<TransactionHash> => {
    logger.info('Executing close position transaction', {
      walletAddress: params.walletAddress,
      positionId: params.positionId,
      size: params.size,
      currentPnL: position.pnl.unrealized
    });

    return this.simulateTransaction('closePosition', params);
  };

  private executeAdjustPosition = async (
    params: CitrexAdjustPositionParams,
    position: CitrexPerpetualPosition
  ): Promise<TransactionHash> => {
    logger.info('Executing adjust position transaction', {
      walletAddress: params.walletAddress,
      positionId: params.positionId,
      action: params.action,
      amount: params.amount
    });

    return this.simulateTransaction('adjustPosition', params);
  };

  private simulateTransaction = async (operation: string, params: any): Promise<TransactionHash> => {
    // Mock transaction simulation
    await new Promise(resolve => setTimeout(resolve, 150));
    return `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
  };

  private formatNumber = (value: number, decimals: number): string => {
    return value.toFixed(decimals);
  };
}

/**
 * Factory function to create Citrex protocol wrapper
 */
export const createCitrexProtocolWrapper = (
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: SeiProtocolConfig
): CitrexProtocolWrapper => {
  return new CitrexProtocolWrapper(publicClient, walletClient, config);
};