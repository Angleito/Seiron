import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult } from '../base/BaseAgent';

/**
 * Comprehensive Lending Agent (~800 lines)
 * 
 * Features:
 * - Multiple lending strategies (conservative, balanced, aggressive, adaptive)
 * - Protocol comparison and optimization
 * - Risk management and yield calculations
 * - Detailed action handlers with error recovery
 * - Performance-optimized calculations
 * - State management for better decision-making
 */

export interface LendingStrategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  targetAPY: number;
  maxExposure: number;
  rebalanceThreshold: number;
  protocols: string[];
  conditions: StrategyCondition[];
}

export interface StrategyCondition {
  type: 'market_condition' | 'yield_threshold' | 'risk_metric' | 'time_based';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  weight: number;
}

export interface LendingPosition {
  id: string;
  protocol: string;
  asset: string;
  amount: number;
  apy: number;
  entryPrice: number;
  entryTime: Date;
  lastUpdate: Date;
  collateralRatio?: number;
  liquidationPrice?: number;
  unrealizedPnL: number;
  fees: number;
  strategyId: string;
}

export interface ProtocolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  riskScore: number;
  liquidityScore: number;
  securityScore: number;
  lastUpdate: Date;
  supportedAssets: string[];
  minimumDeposit: number;
  withdrawalFee: number;
  performanceHistory: PerformanceData[];
}

export interface PerformanceData {
  timestamp: Date;
  apy: number;
  tvl: number;
  utilizationRate: number;
  riskMetrics: RiskMetrics;
}

export interface RiskMetrics {
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  var95: number;
  expectedShortfall: number;
}

export interface LendingOpportunity {
  protocol: string;
  asset: string;
  apy: number;
  riskScore: number;
  liquidityScore: number;
  recommendedAmount: number;
  confidence: number;
  reasoning: string[];
  expectedReturns: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export interface RebalanceRecommendation {
  action: 'increase' | 'decrease' | 'maintain' | 'exit';
  currentPosition: LendingPosition;
  recommendedAmount: number;
  reasoning: string[];
  expectedImpact: {
    apyChange: number;
    riskChange: number;
    gasEstimate: number;
  };
  urgency: 'low' | 'medium' | 'high';
}

export interface LendingState {
  totalValue: number;
  totalDeposited: number;
  totalEarned: number;
  averageAPY: number;
  riskScore: number;
  positions: LendingPosition[];
  activeStrategies: string[];
  lastRebalance: Date;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  alerts: AlertItem[];
}

export interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  positionId?: string;
  dismissed: boolean;
}

export interface MarketConditions {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  liquidityLevel: 'high' | 'medium' | 'low';
  riskAppetite: 'high' | 'medium' | 'low';
  yieldEnvironment: 'high' | 'medium' | 'low';
}

/**
 * Comprehensive Lending Agent Implementation
 */
export class LendingAgent extends BaseAgent {
  private strategies: Map<string, LendingStrategy> = new Map();
  private protocols: Map<string, ProtocolData> = new Map();
  private lendingState: LendingState;
  private performanceCache: Map<string, PerformanceData[]> = new Map();
  private riskCalculationCache: Map<string, RiskMetrics> = new Map();
  private marketConditions: MarketConditions;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(config: AgentConfig) {
    super(config);
    this.lendingState = this.initializeLendingState();
    this.marketConditions = this.initializeMarketConditions();
    this.initializeStrategies();
    this.registerLendingActions();
  }

  /**
   * Initialize lending state
   */
  private initializeLendingState(): LendingState {
    return {
      totalValue: 0,
      totalDeposited: 0,
      totalEarned: 0,
      averageAPY: 0,
      riskScore: 0,
      positions: [],
      activeStrategies: [],
      lastRebalance: new Date(),
      performance: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0
      },
      alerts: []
    };
  }

  /**
   * Initialize market conditions
   */
  private initializeMarketConditions(): MarketConditions {
    return {
      volatility: 0.5,
      trend: 'sideways',
      liquidityLevel: 'medium',
      riskAppetite: 'medium',
      yieldEnvironment: 'medium'
    };
  }

  /**
   * Initialize default lending strategies
   */
  private initializeStrategies(): void {
    const strategies: LendingStrategy[] = [
      {
        id: 'conservative',
        name: 'Conservative Lending',
        description: 'Low-risk, stable yield strategy focusing on established protocols',
        riskLevel: 'low',
        targetAPY: 8,
        maxExposure: 0.3,
        rebalanceThreshold: 0.05,
        protocols: ['compound', 'aave', 'maker'],
        conditions: [
          { type: 'risk_metric', operator: 'lt', value: 0.3, weight: 0.4 },
          { type: 'yield_threshold', operator: 'gte', value: 6, weight: 0.3 },
          { type: 'market_condition', operator: 'lt', value: 0.4, weight: 0.3 }
        ]
      },
      {
        id: 'balanced',
        name: 'Balanced Approach',
        description: 'Moderate risk with diversified protocol exposure',
        riskLevel: 'medium',
        targetAPY: 15,
        maxExposure: 0.5,
        rebalanceThreshold: 0.08,
        protocols: ['compound', 'aave', 'yearn', 'curve'],
        conditions: [
          { type: 'risk_metric', operator: 'lt', value: 0.6, weight: 0.3 },
          { type: 'yield_threshold', operator: 'gte', value: 10, weight: 0.4 },
          { type: 'market_condition', operator: 'lt', value: 0.7, weight: 0.3 }
        ]
      },
      {
        id: 'aggressive',
        name: 'High Yield Strategy',
        description: 'Maximum yield targeting with higher risk tolerance',
        riskLevel: 'high',
        targetAPY: 30,
        maxExposure: 0.8,
        rebalanceThreshold: 0.12,
        protocols: ['compound', 'aave', 'yearn', 'curve', 'convex', 'frax'],
        conditions: [
          { type: 'yield_threshold', operator: 'gte', value: 20, weight: 0.5 },
          { type: 'risk_metric', operator: 'lt', value: 0.8, weight: 0.2 },
          { type: 'market_condition', operator: 'gte', value: 0.3, weight: 0.3 }
        ]
      },
      {
        id: 'adaptive',
        name: 'Adaptive Strategy',
        description: 'Dynamic strategy that adjusts based on market conditions',
        riskLevel: 'medium',
        targetAPY: 20,
        maxExposure: 0.6,
        rebalanceThreshold: 0.06,
        protocols: ['compound', 'aave', 'yearn', 'curve', 'convex'],
        conditions: [
          { type: 'market_condition', operator: 'gte', value: 0.4, weight: 0.4 },
          { type: 'yield_threshold', operator: 'gte', value: 12, weight: 0.3 },
          { type: 'risk_metric', operator: 'lt', value: 0.7, weight: 0.3 }
        ]
      }
    ];

    strategies.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });
  }

  /**
   * Register lending-specific actions
   */
  private registerLendingActions(): void {
    const actions = [
      {
        id: 'analyze_opportunities',
        name: 'Analyze Lending Opportunities',
        description: 'Analyze current lending opportunities across protocols',
        handler: this.analyzeOpportunities.bind(this),
        validation: [
          { field: 'amount', required: false, type: 'number' as const },
          { field: 'strategy', required: false, type: 'string' as const }
        ]
      },
      {
        id: 'execute_lending',
        name: 'Execute Lending Strategy',
        description: 'Execute lending position based on analysis',
        handler: this.executeLending.bind(this),
        validation: [
          { field: 'protocol', required: true, type: 'string' as const },
          { field: 'asset', required: true, type: 'string' as const },
          { field: 'amount', required: true, type: 'number' as const },
          { field: 'strategy', required: false, type: 'string' as const }
        ]
      },
      {
        id: 'rebalance_positions',
        name: 'Rebalance Lending Positions',
        description: 'Analyze and rebalance existing lending positions',
        handler: this.rebalancePositions.bind(this),
        validation: [
          { field: 'forceRebalance', required: false, type: 'boolean' as const }
        ]
      },
      {
        id: 'withdraw_position',
        name: 'Withdraw Lending Position',
        description: 'Withdraw from lending position',
        handler: this.withdrawPosition.bind(this),
        validation: [
          { field: 'positionId', required: true, type: 'string' as const },
          { field: 'amount', required: false, type: 'number' as const }
        ]
      },
      {
        id: 'get_portfolio_status',
        name: 'Get Portfolio Status',
        description: 'Get comprehensive lending portfolio status',
        handler: this.getPortfolioStatus.bind(this),
        validation: []
      },
      {
        id: 'update_strategy',
        name: 'Update Strategy',
        description: 'Update lending strategy parameters',
        handler: this.updateStrategy.bind(this),
        validation: [
          { field: 'strategyId', required: true, type: 'string' as const },
          { field: 'updates', required: true, type: 'object' as const }
        ]
      }
    ];

    actions.forEach(action => {
      this.registerAction(action);
    });
  }

  /**
   * Analyze lending opportunities across protocols
   */
  private analyzeOpportunities(context: ActionContext): TaskEither<AgentError, ActionResult> {
    return pipe(
      this.updateProtocolData(),
      TE.chain(() => this.updateMarketConditions()),
      TE.chain(() => this.calculateOpportunities(context)),
      TE.map(opportunities => ({
        success: true,
        data: {
          opportunities,
          marketConditions: this.marketConditions,
          recommendations: this.generateRecommendations(opportunities, context)
        },
        message: `Found ${opportunities.length} lending opportunities`
      }))
    );
  }

  /**
   * Execute lending position
   */
  private executeLending(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { protocol, asset, amount, strategy } = context.parameters;

    return pipe(
      this.validateLendingParameters(protocol, asset, amount),
      TE.fromEither,
      TE.chain(() => this.executePosition(protocol, asset, amount, strategy)),
      TE.chain(position => this.updateLendingState(position)),
      TE.map(position => ({
        success: true,
        data: {
          position,
          newState: this.lendingState,
          projectedReturns: this.calculateProjectedReturns(position)
        },
        message: `Successfully executed lending position: ${amount} ${asset} on ${protocol}`
      }))
    );
  }

  /**
   * Rebalance existing lending positions
   */
  private rebalancePositions(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const forceRebalance = context.parameters.forceRebalance || false;

    return pipe(
      this.analyzePositionsForRebalancing(),
      TE.chain(recommendations => this.executeRebalancing(recommendations, forceRebalance)),
      TE.map(results => ({
        success: true,
        data: {
          rebalanceResults: results,
          newState: this.lendingState,
          gasUsed: results.reduce((sum, r) => sum + r.gasUsed, 0)
        },
        message: `Rebalanced ${results.length} positions`
      }))
    );
  }

  /**
   * Withdraw from lending position
   */
  private withdrawPosition(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { positionId, amount } = context.parameters;

    return pipe(
      this.validateWithdrawal(positionId, amount),
      TE.fromEither,
      TE.chain(() => this.executeWithdrawal(positionId, amount)),
      TE.chain(result => this.updateStateAfterWithdrawal(result)),
      TE.map(result => ({
        success: true,
        data: {
          withdrawalResult: result,
          newState: this.lendingState
        },
        message: `Successfully withdrew ${result.amount} from position ${positionId}`
      }))
    );
  }

  /**
   * Get comprehensive portfolio status
   */
  private getPortfolioStatus(context: ActionContext): TaskEither<AgentError, ActionResult> {
    return pipe(
      this.updatePortfolioMetrics(),
      TE.map(() => ({
        success: true,
        data: {
          state: this.lendingState,
          detailedPositions: this.getDetailedPositions(),
          riskAnalysis: this.calculatePortfolioRisk(),
          performanceAnalysis: this.calculatePerformanceMetrics(),
          alerts: this.checkAlerts()
        },
        message: 'Portfolio status retrieved successfully'
      }))
    );
  }

  /**
   * Update strategy parameters
   */
  private updateStrategy(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { strategyId, updates } = context.parameters;

    return pipe(
      this.validateStrategyUpdate(strategyId, updates),
      TE.fromEither,
      TE.chain(() => this.applyStrategyUpdate(strategyId, updates)),
      TE.map(updatedStrategy => ({
        success: true,
        data: {
          strategy: updatedStrategy,
          impact: this.calculateStrategyImpact(updatedStrategy)
        },
        message: `Strategy ${strategyId} updated successfully`
      }))
    );
  }

  /**
   * Update protocol data from various sources
   */
  private updateProtocolData(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Simulate protocol data updates
          // In real implementation, this would fetch from DeFi protocols APIs
          const protocols = ['compound', 'aave', 'yearn', 'curve', 'convex', 'frax'];
          
          for (const protocolId of protocols) {
            const data: ProtocolData = {
              id: protocolId,
              name: protocolId.charAt(0).toUpperCase() + protocolId.slice(1),
              tvl: Math.random() * 10000000000, // Random TVL
              apy: Math.random() * 50 + 5, // 5-55% APY
              riskScore: Math.random() * 0.8 + 0.1, // 0.1-0.9 risk score
              liquidityScore: Math.random() * 0.9 + 0.1,
              securityScore: Math.random() * 0.8 + 0.2,
              lastUpdate: new Date(),
              supportedAssets: ['USDC', 'USDT', 'DAI', 'ETH', 'WBTC'],
              minimumDeposit: 100,
              withdrawalFee: 0.001,
              performanceHistory: this.generatePerformanceHistory()
            };
            
            this.protocols.set(protocolId, data);
          }
        },
        error => this.createError('PROTOCOL_UPDATE_FAILED', `Failed to update protocol data: ${error}`)
      )
    );
  }

  /**
   * Update market conditions
   */
  private updateMarketConditions(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Simulate market condition analysis
          // In real implementation, this would analyze various market indicators
          this.marketConditions = {
            volatility: Math.random() * 0.8 + 0.1,
            trend: ['bullish', 'bearish', 'sideways'][Math.floor(Math.random() * 3)] as any,
            liquidityLevel: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
            riskAppetite: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
            yieldEnvironment: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
          };
        },
        error => this.createError('MARKET_UPDATE_FAILED', `Failed to update market conditions: ${error}`)
      )
    );
  }

  /**
   * Calculate lending opportunities
   */
  private calculateOpportunities(context: ActionContext): TaskEither<AgentError, LendingOpportunity[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const opportunities: LendingOpportunity[] = [];
          const amount = context.parameters.amount || 10000;
          const strategyId = context.parameters.strategy;
          
          for (const [protocolId, protocolData] of this.protocols) {
            for (const asset of protocolData.supportedAssets) {
              if (amount < protocolData.minimumDeposit) continue;

              const opportunity = this.calculateOpportunityScore(protocolData, asset, amount, strategyId);
              if (opportunity.confidence > 0.6) {
                opportunities.push(opportunity);
              }
            }
          }

          return opportunities.sort((a, b) => b.confidence - a.confidence);
        },
        error => this.createError('OPPORTUNITY_CALCULATION_FAILED', `Failed to calculate opportunities: ${error}`)
      )
    );
  }

  /**
   * Calculate opportunity score for protocol/asset combination
   */
  private calculateOpportunityScore(
    protocol: ProtocolData, 
    asset: string, 
    amount: number, 
    strategyId?: string
  ): LendingOpportunity {
    const strategy = strategyId ? this.strategies.get(strategyId) : this.strategies.get('balanced');
    
    // Calculate base score
    let score = 0;
    
    // APY weight (40%)
    const apyScore = Math.min(protocol.apy / 50, 1) * 0.4;
    score += apyScore;
    
    // Risk score (30%)
    const riskScore = (1 - protocol.riskScore) * 0.3;
    score += riskScore;
    
    // Liquidity score (20%)
    const liquidityScore = protocol.liquidityScore * 0.2;
    score += liquidityScore;
    
    // Security score (10%)
    const securityScore = protocol.securityScore * 0.1;
    score += securityScore;
    
    // Strategy alignment
    if (strategy) {
      const strategyAlignment = this.calculateStrategyAlignment(protocol, strategy);
      score *= strategyAlignment;
    }
    
    // Market condition adjustment
    score *= this.getMarketAdjustment();
    
    const confidence = Math.min(score, 1);
    
    return {
      protocol: protocol.id,
      asset,
      apy: protocol.apy,
      riskScore: protocol.riskScore,
      liquidityScore: protocol.liquidityScore,
      recommendedAmount: Math.min(amount, amount * (strategy?.maxExposure || 0.5)),
      confidence,
      reasoning: this.generateOpportunityReasoning(protocol, asset, confidence),
      expectedReturns: this.calculateExpectedReturns(amount, protocol.apy)
    };
  }

  /**
   * Calculate strategy alignment score
   */
  private calculateStrategyAlignment(protocol: ProtocolData, strategy: LendingStrategy): number {
    let alignment = 1;
    
    // Check if protocol is in strategy's allowed protocols
    if (!strategy.protocols.includes(protocol.id)) {
      alignment *= 0.5;
    }
    
    // Check risk alignment
    const riskAlignment = this.calculateRiskAlignment(protocol.riskScore, strategy.riskLevel);
    alignment *= riskAlignment;
    
    // Check APY alignment
    const apyAlignment = protocol.apy >= strategy.targetAPY ? 1 : protocol.apy / strategy.targetAPY;
    alignment *= apyAlignment;
    
    return alignment;
  }

  /**
   * Calculate risk alignment
   */
  private calculateRiskAlignment(protocolRisk: number, strategyRisk: string): number {
    const riskThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 1.0
    };
    
    const threshold = riskThresholds[strategyRisk as keyof typeof riskThresholds];
    return protocolRisk <= threshold ? 1 : threshold / protocolRisk;
  }

  /**
   * Get market condition adjustment factor
   */
  private getMarketAdjustment(): number {
    let adjustment = 1;
    
    // Volatility adjustment
    if (this.marketConditions.volatility > 0.7) {
      adjustment *= 0.8;
    } else if (this.marketConditions.volatility < 0.3) {
      adjustment *= 1.1;
    }
    
    // Trend adjustment
    if (this.marketConditions.trend === 'bullish') {
      adjustment *= 1.1;
    } else if (this.marketConditions.trend === 'bearish') {
      adjustment *= 0.9;
    }
    
    // Liquidity adjustment
    const liquidityMultipliers = { high: 1.1, medium: 1, low: 0.8 };
    adjustment *= liquidityMultipliers[this.marketConditions.liquidityLevel];
    
    return adjustment;
  }

  /**
   * Generate opportunity reasoning
   */
  private generateOpportunityReasoning(protocol: ProtocolData, asset: string, confidence: number): string[] {
    const reasoning: string[] = [];
    
    if (protocol.apy > 20) {
      reasoning.push(`High APY of ${protocol.apy.toFixed(2)}% offers attractive returns`);
    }
    
    if (protocol.riskScore < 0.3) {
      reasoning.push('Low risk score indicates stable protocol');
    } else if (protocol.riskScore > 0.7) {
      reasoning.push('High risk score requires careful consideration');
    }
    
    if (protocol.liquidityScore > 0.8) {
      reasoning.push('High liquidity ensures easy entry/exit');
    }
    
    if (protocol.securityScore > 0.8) {
      reasoning.push('Strong security score from audit history');
    }
    
    if (confidence > 0.8) {
      reasoning.push('High confidence recommendation based on current analysis');
    }
    
    return reasoning;
  }

  /**
   * Calculate expected returns
   */
  private calculateExpectedReturns(amount: number, apy: number): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  } {
    const dailyRate = apy / 365 / 100;
    const weeklyRate = apy / 52 / 100;
    const monthlyRate = apy / 12 / 100;
    const yearlyRate = apy / 100;
    
    return {
      daily: amount * dailyRate,
      weekly: amount * weeklyRate,
      monthly: amount * monthlyRate,
      yearly: amount * yearlyRate
    };
  }

  /**
   * Generate recommendations based on opportunities
   */
  private generateRecommendations(opportunities: LendingOpportunity[], context: ActionContext): string[] {
    const recommendations: string[] = [];
    
    if (opportunities.length === 0) {
      recommendations.push('No suitable lending opportunities found at current market conditions');
      return recommendations;
    }
    
    const topOpportunity = opportunities[0];
    recommendations.push(
      `Top recommendation: ${topOpportunity.asset} on ${topOpportunity.protocol} with ${topOpportunity.apy.toFixed(2)}% APY`
    );
    
    if (opportunities.length > 1) {
      recommendations.push('Consider diversifying across multiple protocols to reduce risk');
    }
    
    if (this.marketConditions.volatility > 0.6) {
      recommendations.push('High market volatility detected - consider conservative strategies');
    }
    
    return recommendations;
  }

  /**
   * Validate lending parameters
   */
  private validateLendingParameters(protocol: string, asset: string, amount: number): Either<AgentError, void> {
    const protocolData = this.protocols.get(protocol);
    
    if (!protocolData) {
      return left(this.createError('INVALID_PROTOCOL', `Protocol ${protocol} not supported`));
    }
    
    if (!protocolData.supportedAssets.includes(asset)) {
      return left(this.createError('UNSUPPORTED_ASSET', `Asset ${asset} not supported by ${protocol}`));
    }
    
    if (amount < protocolData.minimumDeposit) {
      return left(this.createError('INSUFFICIENT_AMOUNT', `Minimum deposit is ${protocolData.minimumDeposit}`));
    }
    
    return right(undefined);
  }

  /**
   * Execute lending position (placeholder for actual execution)
   */
  private executePosition(protocol: string, asset: string, amount: number, strategyId?: string): TaskEither<AgentError, LendingPosition> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Simulate position execution
          const position: LendingPosition = {
            id: `${protocol}_${asset}_${Date.now()}`,
            protocol,
            asset,
            amount,
            apy: this.protocols.get(protocol)!.apy,
            entryPrice: 1, // Simplified for stablecoins
            entryTime: new Date(),
            lastUpdate: new Date(),
            unrealizedPnL: 0,
            fees: amount * 0.001, // 0.1% fee
            strategyId: strategyId || 'balanced'
          };
          
          return position;
        },
        error => this.createError('POSITION_EXECUTION_FAILED', `Failed to execute position: ${error}`)
      )
    );
  }

  /**
   * Update lending state after position creation
   */
  private updateLendingState(position: LendingPosition): TaskEither<AgentError, LendingPosition> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.lendingState.positions.push(position);
          this.lendingState.totalDeposited += position.amount;
          this.lendingState.totalValue += position.amount;
          
          // Update active strategies
          if (!this.lendingState.activeStrategies.includes(position.strategyId)) {
            this.lendingState.activeStrategies.push(position.strategyId);
          }
          
          // Recalculate metrics
          this.recalculatePortfolioMetrics();
          
          return position;
        },
        error => this.createError('STATE_UPDATE_FAILED', `Failed to update lending state: ${error}`)
      )
    );
  }

  /**
   * Calculate projected returns for position
   */
  private calculateProjectedReturns(position: LendingPosition): any {
    return this.calculateExpectedReturns(position.amount, position.apy);
  }

  /**
   * Analyze positions for rebalancing opportunities
   */
  private analyzePositionsForRebalancing(): TaskEither<AgentError, RebalanceRecommendation[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const recommendations: RebalanceRecommendation[] = [];
          
          for (const position of this.lendingState.positions) {
            const currentProtocol = this.protocols.get(position.protocol);
            if (!currentProtocol) continue;
            
            const recommendation = this.analyzePositionForRebalancing(position, currentProtocol);
            if (recommendation) {
              recommendations.push(recommendation);
            }
          }
          
          return recommendations;
        },
        error => this.createError('REBALANCE_ANALYSIS_FAILED', `Failed to analyze rebalancing: ${error}`)
      )
    );
  }

  /**
   * Analyze individual position for rebalancing
   */
  private analyzePositionForRebalancing(position: LendingPosition, protocol: ProtocolData): RebalanceRecommendation | null {
    const strategy = this.strategies.get(position.strategyId);
    if (!strategy) return null;
    
    const currentAPY = protocol.apy;
    const apyDifference = Math.abs(currentAPY - position.apy) / position.apy;
    
    if (apyDifference < strategy.rebalanceThreshold) {
      return null;
    }
    
    const action = currentAPY > position.apy ? 'increase' : 'decrease';
    const urgency = apyDifference > 0.2 ? 'high' : apyDifference > 0.1 ? 'medium' : 'low';
    
    return {
      action,
      currentPosition: position,
      recommendedAmount: action === 'increase' ? position.amount * 1.2 : position.amount * 0.8,
      reasoning: [
        `APY changed from ${position.apy.toFixed(2)}% to ${currentAPY.toFixed(2)}%`,
        `Change exceeds rebalance threshold of ${(strategy.rebalanceThreshold * 100).toFixed(1)}%`
      ],
      expectedImpact: {
        apyChange: currentAPY - position.apy,
        riskChange: protocol.riskScore - 0.5, // Simplified
        gasEstimate: 50000 // Estimated gas cost
      },
      urgency
    };
  }

  /**
   * Execute rebalancing recommendations
   */
  private executeRebalancing(recommendations: RebalanceRecommendation[], force: boolean): TaskEither<AgentError, any[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const results: any[] = [];
          
          for (const rec of recommendations) {
            if (!force && rec.urgency === 'low') continue;
            
            // Simulate rebalancing execution
            const result = {
              positionId: rec.currentPosition.id,
              action: rec.action,
              oldAmount: rec.currentPosition.amount,
              newAmount: rec.recommendedAmount,
              gasUsed: rec.expectedImpact.gasEstimate,
              success: true
            };
            
            // Update position
            const position = this.lendingState.positions.find(p => p.id === rec.currentPosition.id);
            if (position) {
              position.amount = rec.recommendedAmount;
              position.lastUpdate = new Date();
            }
            
            results.push(result);
          }
          
          if (results.length > 0) {
            this.lendingState.lastRebalance = new Date();
            this.recalculatePortfolioMetrics();
          }
          
          return results;
        },
        error => this.createError('REBALANCING_FAILED', `Failed to execute rebalancing: ${error}`)
      )
    );
  }

  /**
   * Validate withdrawal parameters
   */
  private validateWithdrawal(positionId: string, amount?: number): Either<AgentError, void> {
    const position = this.lendingState.positions.find(p => p.id === positionId);
    
    if (!position) {
      return left(this.createError('POSITION_NOT_FOUND', `Position ${positionId} not found`));
    }
    
    if (amount && amount > position.amount) {
      return left(this.createError('INSUFFICIENT_BALANCE', 'Withdrawal amount exceeds position balance'));
    }
    
    return right(undefined);
  }

  /**
   * Execute withdrawal (placeholder)
   */
  private executeWithdrawal(positionId: string, amount?: number): TaskEither<AgentError, any> {
    return pipe(
      TE.tryCatch(
        async () => {
          const position = this.lendingState.positions.find(p => p.id === positionId)!;
          const withdrawalAmount = amount || position.amount;
          
          return {
            positionId,
            amount: withdrawalAmount,
            fees: withdrawalAmount * 0.001,
            success: true
          };
        },
        error => this.createError('WITHDRAWAL_FAILED', `Failed to execute withdrawal: ${error}`)
      )
    );
  }

  /**
   * Update state after withdrawal
   */
  private updateStateAfterWithdrawal(result: any): TaskEither<AgentError, any> {
    return pipe(
      TE.tryCatch(
        async () => {
          const positionIndex = this.lendingState.positions.findIndex(p => p.id === result.positionId);
          
          if (positionIndex >= 0) {
            const position = this.lendingState.positions[positionIndex];
            
            if (result.amount >= position.amount) {
              // Full withdrawal - remove position
              this.lendingState.positions.splice(positionIndex, 1);
            } else {
              // Partial withdrawal - update position
              position.amount -= result.amount;
              position.lastUpdate = new Date();
            }
            
            this.lendingState.totalValue -= result.amount;
            this.recalculatePortfolioMetrics();
          }
          
          return result;
        },
        error => this.createError('WITHDRAWAL_STATE_UPDATE_FAILED', `Failed to update state after withdrawal: ${error}`)
      )
    );
  }

  /**
   * Update portfolio metrics
   */
  private updatePortfolioMetrics(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.recalculatePortfolioMetrics();
        },
        error => this.createError('METRICS_UPDATE_FAILED', `Failed to update metrics: ${error}`)
      )
    );
  }

  /**
   * Recalculate portfolio metrics
   */
  private recalculatePortfolioMetrics(): void {
    if (this.lendingState.positions.length === 0) {
      this.lendingState.averageAPY = 0;
      this.lendingState.riskScore = 0;
      return;
    }
    
    // Calculate weighted average APY
    const totalValue = this.lendingState.positions.reduce((sum, pos) => sum + pos.amount, 0);
    const weightedAPY = this.lendingState.positions.reduce((sum, pos) => {
      return sum + (pos.apy * pos.amount / totalValue);
    }, 0);
    
    // Calculate portfolio risk score
    const portfolioRisk = this.lendingState.positions.reduce((sum, pos) => {
      const protocol = this.protocols.get(pos.protocol);
      const weight = pos.amount / totalValue;
      return sum + (protocol?.riskScore || 0.5) * weight;
    }, 0);
    
    this.lendingState.averageAPY = weightedAPY;
    this.lendingState.riskScore = portfolioRisk;
    this.lendingState.totalValue = totalValue;
  }

  /**
   * Get detailed positions with additional metrics
   */
  private getDetailedPositions(): any[] {
    return this.lendingState.positions.map(position => {
      const protocol = this.protocols.get(position.protocol);
      const daysHeld = Math.floor((Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60 * 24));
      const estimatedEarnings = position.amount * (position.apy / 100) * (daysHeld / 365);
      
      return {
        ...position,
        protocolData: protocol,
        daysHeld,
        estimatedEarnings,
        currentValue: position.amount + estimatedEarnings,
        performance: estimatedEarnings / position.amount
      };
    });
  }

  /**
   * Calculate portfolio risk metrics
   */
  private calculatePortfolioRisk(): RiskMetrics {
    // Simplified risk calculation
    // In production, this would use historical data and complex risk models
    
    const volatility = this.lendingState.riskScore * 0.3;
    const maxDrawdown = volatility * 2;
    const sharpeRatio = (this.lendingState.averageAPY - 5) / (volatility * 100); // Risk-free rate = 5%
    
    return {
      volatility,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2, // Simplified
      var95: this.lendingState.totalValue * 0.05, // 5% VaR
      expectedShortfall: this.lendingState.totalValue * 0.08
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): any {
    const totalEarnings = this.lendingState.totalEarned;
    const totalDeposited = this.lendingState.totalDeposited;
    
    return {
      totalReturn: totalEarnings,
      totalReturnPercent: totalDeposited > 0 ? (totalEarnings / totalDeposited) * 100 : 0,
      annualizedReturn: this.lendingState.averageAPY,
      averagePositionSize: this.lendingState.positions.length > 0 ? 
        this.lendingState.totalValue / this.lendingState.positions.length : 0,
      diversificationScore: this.calculateDiversificationScore()
    };
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(): number {
    if (this.lendingState.positions.length <= 1) return 0;
    
    const protocolCounts = new Map<string, number>();
    this.lendingState.positions.forEach(pos => {
      protocolCounts.set(pos.protocol, (protocolCounts.get(pos.protocol) || 0) + 1);
    });
    
    // Higher score for more even distribution across protocols
    const distribution = Array.from(protocolCounts.values());
    const evenness = 1 - (Math.max(...distribution) - Math.min(...distribution)) / Math.max(...distribution);
    
    return evenness * Math.min(protocolCounts.size / 5, 1); // Max score when 5+ protocols
  }

  /**
   * Check for alerts and warnings
   */
  private checkAlerts(): AlertItem[] {
    const alerts: AlertItem[] = [];
    
    // Check for high-risk positions
    this.lendingState.positions.forEach(position => {
      const protocol = this.protocols.get(position.protocol);
      if (protocol && protocol.riskScore > 0.8) {
        alerts.push({
          id: `risk_${position.id}`,
          severity: 'warning',
          message: `High risk detected for ${position.asset} position on ${position.protocol}`,
          timestamp: new Date(),
          positionId: position.id,
          dismissed: false
        });
      }
    });
    
    // Check for rebalancing opportunities
    if (Date.now() - this.lendingState.lastRebalance.getTime() > 7 * 24 * 60 * 60 * 1000) {
      alerts.push({
        id: 'rebalance_due',
        severity: 'info',
        message: 'Portfolio rebalancing recommended - last rebalance over 7 days ago',
        timestamp: new Date(),
        dismissed: false
      });
    }
    
    return alerts;
  }

  /**
   * Validate strategy update
   */
  private validateStrategyUpdate(strategyId: string, updates: any): Either<AgentError, void> {
    if (!this.strategies.has(strategyId)) {
      return left(this.createError('STRATEGY_NOT_FOUND', `Strategy ${strategyId} not found`));
    }
    
    // Add validation logic for strategy updates
    return right(undefined);
  }

  /**
   * Apply strategy update
   */
  private applyStrategyUpdate(strategyId: string, updates: any): TaskEither<AgentError, LendingStrategy> {
    return pipe(
      TE.tryCatch(
        async () => {
          const strategy = this.strategies.get(strategyId)!;
          const updatedStrategy = { ...strategy, ...updates };
          this.strategies.set(strategyId, updatedStrategy);
          return updatedStrategy;
        },
        error => this.createError('STRATEGY_UPDATE_FAILED', `Failed to update strategy: ${error}`)
      )
    );
  }

  /**
   * Calculate strategy impact
   */
  private calculateStrategyImpact(strategy: LendingStrategy): any {
    // Analyze how strategy changes affect current positions
    const affectedPositions = this.lendingState.positions.filter(p => p.strategyId === strategy.id);
    
    return {
      affectedPositions: affectedPositions.length,
      estimatedRebalanceNeeded: affectedPositions.length > 0,
      riskImpact: strategy.riskLevel,
      yieldImpact: strategy.targetAPY
    };
  }

  /**
   * Generate performance history (placeholder)
   */
  private generatePerformanceHistory(): PerformanceData[] {
    const history: PerformanceData[] = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      history.push({
        timestamp: date,
        apy: Math.random() * 50 + 5,
        tvl: Math.random() * 10000000000,
        utilizationRate: Math.random() * 0.9 + 0.1,
        riskMetrics: {
          volatility: Math.random() * 0.5,
          maxDrawdown: Math.random() * 0.2,
          sharpeRatio: Math.random() * 3,
          sortinoRatio: Math.random() * 4,
          var95: Math.random() * 1000,
          expectedShortfall: Math.random() * 1500
        }
      });
    }
    
    return history;
  }

  /**
   * Agent-specific initialization
   */
  protected initialize(): TaskEither<AgentError, void> {
    return pipe(
      this.updateProtocolData(),
      TE.chain(() => this.updateMarketConditions())
    );
  }

  /**
   * Agent-specific cleanup
   */
  protected cleanup(): TaskEither<AgentError, void> {
    return TE.right(undefined);
  }

  /**
   * Create agent-specific error
   */
  protected createError(code: string, message: string, details?: any): AgentError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      agentId: this.getConfig().id
    };
  }
}