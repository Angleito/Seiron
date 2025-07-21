import { EventEmitter } from 'events';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import WebSocket from 'ws';
import logger from '../utils/logger';
import { portfolioManagerConfig, portfolioTools, portfolioEvents } from '../config/mcp/portfolio-manager';
import type {
  IPortfolioMCPService,
  PortfolioHolding,
  PortfolioAnalytics,
  RiskProfile,
  PerformanceData,
  RebalancingStrategy,
  RebalancingPlan,
  TaxPosition,
  TaxStrategy,
  PortfolioMCPRequest,
  PortfolioMCPResponse
} from '../types/portfolio-mcp';
import { PortfolioService } from './PortfolioService';
import { PortfolioAnalyticsService } from './PortfolioAnalyticsService';
import { RealTimeDataService } from './RealTimeDataService';

/**
 * Portfolio MCP Integration Service
 * 
 * Bridges the MCP protocol with existing portfolio tracking systems,
 * providing real-time portfolio management capabilities.
 */
export class PortfolioMCPIntegration extends EventEmitter implements IPortfolioMCPService {
  private ws?: WebSocket;
  private isConnected: boolean = false;
  private requestQueue: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(
    private portfolioService: PortfolioService,
    private analyticsService: PortfolioAnalyticsService,
    private realtimeService: RealTimeDataService
  ) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Initialize MCP connection
   */
  public async initialize(): Promise<void> {
    try {
      await this.connectToMCPServer();
      await this.registerTools();
      await this.subscribeToEvents();
      logger.info('Portfolio MCP Integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Portfolio MCP Integration:', error);
      throw error;
    }
  }

  /**
   * Portfolio Analysis Methods
   */
  public getPortfolioSnapshot(walletAddress: string): TE.TaskEither<Error, PortfolioHolding[]> {
    return pipe(
      this.sendMCPRequest('analyzePortfolioComposition', { walletAddress }),
      TE.chain(response => {
        if (!response.success) {
          return TE.left(new Error(response.error?.message || 'Failed to get portfolio snapshot'));
        }
        return TE.right(response.data.positions);
      })
    );
  }

  public analyzePortfolio(walletAddress: string): TE.TaskEither<Error, PortfolioAnalytics> {
    return pipe(
      TE.Do,
      TE.bind('composition', () => this.sendMCPRequest('analyzePortfolioComposition', { 
        walletAddress,
        includeDeFi: true 
      })),
      TE.bind('performance', () => this.sendMCPRequest('getHistoricalPerformance', {
        walletAddress,
        timeframe: '1m'
      })),
      TE.map(({ composition, performance }) => {
        // Transform MCP responses to PortfolioAnalytics format
        return {
          summary: {
            totalValue: composition.data.totalValue,
            totalAssets: composition.data.positions.length,
            totalChains: composition.data.chains.length,
            lastUpdated: new Date()
          },
          composition: composition.data.composition,
          concentration: composition.data.concentrationRisk,
          diversification: {
            score: composition.data.diversificationScore,
            recommendations: composition.data.suggestions
          }
        };
      })
    );
  }

  /**
   * Risk Assessment Methods
   */
  public assessRisk(walletAddress: string): TE.TaskEither<Error, RiskProfile> {
    return pipe(
      TE.Do,
      TE.bind('riskMetrics', () => this.sendMCPRequest('calculateRiskMetrics', {
        walletAddress,
        riskModel: 'var'
      })),
      TE.bind('liquidityRisk', () => this.sendMCPRequest('assessLiquidityRisk', {
        walletAddress
      })),
      TE.map(({ riskMetrics, liquidityRisk }) => {
        // Combine risk assessments into RiskProfile
        return {
          overallScore: this.calculateOverallRiskScore(riskMetrics.data, liquidityRisk.data),
          categories: {
            market: riskMetrics.data.beta * 50,
            liquidity: (100 - liquidityRisk.data.liquidityScore),
            concentration: riskMetrics.data.concentrationRisk || 0,
            smart_contract: 20, // Default, would need protocol analysis
            regulatory: 10 // Default, would need jurisdiction analysis
          },
          factors: this.extractRiskFactors(riskMetrics.data, liquidityRisk.data),
          recommendations: liquidityRisk.data.recommendations || []
        };
      })
    );
  }

  public calculateVaR(walletAddress: string, confidence: number = 0.95): TE.TaskEither<Error, number> {
    return pipe(
      this.sendMCPRequest('calculateRiskMetrics', {
        walletAddress,
        riskModel: 'var',
        confidenceLevel: confidence
      }),
      TE.map(response => response.data.valueAtRisk)
    );
  }

  /**
   * Performance Tracking Methods
   */
  public getPerformance(walletAddress: string, period: string = '1m'): TE.TaskEither<Error, PerformanceData> {
    return pipe(
      TE.Do,
      TE.bind('metrics', () => this.sendMCPRequest('trackPerformanceMetrics', {
        walletAddress,
        metrics: ['returns', 'sharpe', 'volatility', 'drawdown'],
        benchmark: 'sei-index'
      })),
      TE.bind('historical', () => this.sendMCPRequest('getHistoricalPerformance', {
        walletAddress,
        timeframe: period
      })),
      TE.map(({ metrics, historical }) => this.formatPerformanceData(metrics.data, historical.data))
    );
  }

  public compareToIndex(walletAddress: string, index: string): TE.TaskEither<Error, any> {
    return this.sendMCPRequest('trackPerformanceMetrics', {
      walletAddress,
      metrics: ['returns', 'alpha', 'beta', 'correlation'],
      benchmark: index
    });
  }

  /**
   * Rebalancing Methods
   */
  public proposeRebalancing(
    walletAddress: string, 
    strategy: RebalancingStrategy
  ): TE.TaskEither<Error, RebalancingPlan> {
    return pipe(
      this.sendMCPRequest('generateRebalancingSuggestions', {
        walletAddress,
        targetAllocation: strategy.targetAllocation.reduce((acc, target) => ({
          ...acc,
          [target.category]: target.target
        }), {}),
        constraints: strategy.constraints,
        optimizationGoal: 'sharpe'
      }),
      TE.map(response => this.createRebalancingPlan(response.data, strategy))
    );
  }

  public executeRebalancing(planId: string): TE.TaskEither<Error, void> {
    // This would integrate with transaction execution services
    return TE.right(undefined);
  }

  /**
   * Tax Optimization Methods
   */
  public analyzeTaxPositions(walletAddress: string): TE.TaskEither<Error, TaxPosition[]> {
    return pipe(
      this.portfolioService.getPortfolioPositions(walletAddress),
      TE.chain(positions => {
        // Analyze tax implications for each position
        return TE.right(positions.map(pos => this.createTaxPosition(pos)));
      })
    );
  }

  public proposeTaxStrategy(walletAddress: string, goals: any): TE.TaskEither<Error, TaxStrategy> {
    return pipe(
      this.sendMCPRequest('optimizeTaxStrategy', {
        walletAddress,
        taxJurisdiction: goals.jurisdiction || 'US',
        taxBracket: goals.taxBracket || 0.25,
        holdingPeriod: goals.preferLongTerm ? { minimum: 365 } : {}
      }),
      TE.map(response => this.formatTaxStrategy(response.data))
    );
  }

  /**
   * Private Methods
   */
  private async connectToMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = portfolioManagerConfig.secure ? 'wss' : 'ws';
      const url = `${protocol}://${portfolioManagerConfig.endpoint}:${portfolioManagerConfig.port}`;

      this.ws = new WebSocket(url, {
        headers: portfolioManagerConfig.apiKey ? {
          'Authorization': `Bearer ${portfolioManagerConfig.apiKey}`
        } : undefined
      });

      const timeout = setTimeout(() => {
        reject(new Error('MCP connection timeout'));
      }, portfolioManagerConfig.connectionTimeout);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        logger.info('Connected to Portfolio MCP server');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMCPMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        logger.warn('Disconnected from Portfolio MCP server');
        this.emit('disconnected');
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error('Portfolio MCP WebSocket error:', error);
        if (!this.isConnected) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  private async registerTools(): Promise<void> {
    // Register available portfolio tools with MCP server
    const registration = {
      type: 'register',
      tools: portfolioTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters
      }))
    };

    await this.sendMessage(registration);
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to portfolio events
    const subscription = {
      type: 'subscribe',
      events: Object.keys(portfolioEvents)
    };

    await this.sendMessage(subscription);
  }

  private sendMCPRequest(method: string, params: any): TE.TaskEither<Error, PortfolioMCPResponse> {
    return TE.tryCatch(
      async () => {
        const requestId = `${Date.now()}-${Math.random()}`;
        const request: PortfolioMCPRequest = {
          method,
          params,
          context: {
            walletAddress: params.walletAddress,
            timestamp: Date.now(),
            requestId
          }
        };

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.requestQueue.delete(requestId);
            reject(new Error('MCP request timeout'));
          }, 30000);

          this.requestQueue.set(requestId, { resolve, reject, timeout });
          
          this.sendMessage({
            id: requestId,
            type: 'request',
            method,
            params: request
          });
        });
      },
      error => new Error(`MCP request failed: ${error}`)
    );
  }

  private sendMessage(message: any): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to MCP server');
    }
    this.ws.send(JSON.stringify(message));
  }

  private handleMCPMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'response':
          this.handleResponse(message);
          break;
        case 'event':
          this.handleEvent(message);
          break;
        case 'error':
          logger.error('MCP error:', message);
          break;
      }
    } catch (error) {
      logger.error('Failed to parse MCP message:', error);
    }
  }

  private handleResponse(message: any): void {
    const pending = this.requestQueue.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.requestQueue.delete(message.id);
      
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleEvent(message: any): void {
    // Emit portfolio events
    this.emit(message.event, message.data);
    
    // Handle specific events
    switch (message.event) {
      case portfolioEvents.PORTFOLIO_UPDATE:
        this.realtimeService.broadcastPortfolioUpdate(message.data);
        break;
      case portfolioEvents.RISK_ALERT:
        this.handleRiskAlert(message.data);
        break;
      case portfolioEvents.REBALANCE_NEEDED:
        this.handleRebalanceAlert(message.data);
        break;
    }
  }

  private setupEventHandlers(): void {
    // Forward portfolio events to connected clients
    this.on(portfolioEvents.PORTFOLIO_UPDATE, (data) => {
      this.realtimeService.broadcastToUser(data.walletAddress, {
        type: 'portfolio:update',
        data
      });
    });

    this.on(portfolioEvents.RISK_ALERT, (data) => {
      this.realtimeService.broadcastToUser(data.walletAddress, {
        type: 'risk:alert',
        data
      });
    });
  }

  private attemptReconnect(): void {
    setTimeout(() => {
      logger.info('Attempting to reconnect to Portfolio MCP server...');
      this.connectToMCPServer().catch(error => {
        logger.error('Reconnection failed:', error);
      });
    }, portfolioManagerConfig.retryDelay);
  }

  // Utility methods
  private calculateOverallRiskScore(riskMetrics: any, liquidityRisk: any): number {
    // Weighted average of different risk factors
    const marketRisk = Math.min(riskMetrics.beta * 30, 100);
    const liquidityScore = 100 - liquidityRisk.liquidityScore;
    const concentrationRisk = riskMetrics.concentrationRisk || 0;
    
    return Math.round((marketRisk * 0.4 + liquidityScore * 0.3 + concentrationRisk * 0.3));
  }

  private extractRiskFactors(riskMetrics: any, liquidityRisk: any): any[] {
    const factors = [];
    
    if (riskMetrics.beta > 1.5) {
      factors.push({
        name: 'High Market Beta',
        category: 'market',
        severity: 'high',
        impact: riskMetrics.beta,
        description: 'Portfolio is highly sensitive to market movements'
      });
    }
    
    if (liquidityRisk.liquidityScore < 50) {
      factors.push({
        name: 'Low Liquidity',
        category: 'liquidity',
        severity: 'medium',
        impact: 100 - liquidityRisk.liquidityScore,
        description: 'Some positions may be difficult to exit quickly'
      });
    }
    
    return factors;
  }

  private formatPerformanceData(metrics: any, historical: any): PerformanceData {
    return {
      portfolio: {
        current: metrics.currentValue,
        initial: historical.initialValue,
        highWaterMark: historical.highWaterMark,
        lowWaterMark: historical.lowWaterMark
      },
      returns: {
        absolute: metrics.absoluteReturns,
        percentage: metrics.percentageReturns,
        annualized: metrics.annualizedReturns
      },
      metrics: {
        sharpeRatio: metrics.sharpeRatio,
        sortinoRatio: metrics.sortinoRatio || 0,
        maxDrawdown: metrics.maxDrawdown,
        volatility: metrics.volatility,
        beta: metrics.beta,
        alpha: metrics.alpha,
        calmarRatio: metrics.calmarRatio || 0
      },
      benchmark: metrics.benchmarkComparison
    };
  }

  private createRebalancingPlan(suggestions: any, strategy: RebalancingStrategy): RebalancingPlan {
    return {
      id: `plan-${Date.now()}`,
      strategy: strategy.name,
      created: new Date(),
      status: 'proposed',
      trades: suggestions.suggestedTrades,
      impact: {
        beforeAllocation: suggestions.currentAllocation,
        afterAllocation: suggestions.targetAllocation,
        riskChange: suggestions.expectedImprovement.riskChange,
        expectedReturn: suggestions.expectedImprovement.returnChange,
        totalCost: suggestions.estimatedCosts.total
      }
    };
  }

  private createTaxPosition(position: any): TaxPosition {
    // Simplified tax position creation
    return {
      asset: position,
      lots: [],
      realizedGains: 0,
      unrealizedGains: position.unrealizedPnL || 0,
      shortTermGains: 0,
      longTermGains: 0
    };
  }

  private formatTaxStrategy(data: any): TaxStrategy {
    return {
      type: 'harvest-loss',
      positions: [],
      potentialSavings: data.estimatedSavings,
      actions: data.harvestingOpportunities.map((opp: any) => ({
        type: 'sell',
        position: opp.position,
        lots: opp.lots,
        reason: opp.reason,
        taxImpact: opp.taxImpact,
        timing: 'immediate'
      })),
      constraints: {
        washSaleRule: true
      }
    };
  }

  private handleRiskAlert(alert: any): void {
    logger.warn('Risk alert received:', alert);
    // Additional risk alert handling logic
  }

  private handleRebalanceAlert(alert: any): void {
    logger.info('Rebalance alert received:', alert);
    // Additional rebalance alert handling logic
  }
}

export default PortfolioMCPIntegration;