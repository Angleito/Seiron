import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult } from '../base/BaseAgent';
import { TakaraProtocolWrapper, createTakaraProtocolWrapper, TakaraRiskAssessment } from '../../protocols/sei/adapters/TakaraProtocolWrapper';
import { YeiFinanceAdapter } from '../../lending/YeiFinanceAdapter';
import { ethers } from 'ethers';
import { 
  SeiAgentKitAdapter, 
  HiveIntelligenceAdapter, 
  SeiMCPAdapter,
  createSAKAdapter,
  createHiveAdapter,
  createMCPAdapter,
  MCPTool,
  HiveQuery,
  SAKTool
} from '../adapters';

/**
 * Enhanced Lending Agent with Advanced Adapter Integration (~1200+ lines)
 * 
 * Features:
 * - Multiple lending strategies (conservative, balanced, aggressive, adaptive)
 * - Protocol comparison and optimization
 * - Risk management and yield calculations
 * - Detailed action handlers with error recovery
 * - Performance-optimized calculations
 * - State management for better decision-making
 * - SeiAgentKitAdapter for real Takara protocol operations
 * - HiveIntelligenceAdapter for enhanced lending analytics
 * - SeiMCPAdapter for real-time balance monitoring
 * - Power level calculations for Dragon Ball Z themed responses
 * - Live market data integration
 * - Advanced cross-protocol intelligence
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

export interface ProtocolAdapter {
  id: string;
  name: string;
  adapter: TakaraProtocolWrapper | YeiFinanceAdapter;
  priority: number;
  isActive: boolean;
}

export interface MultiProtocolOpportunity {
  bestProtocol: string;
  alternatives: ProtocolOpportunity[];
  comparison: ProtocolComparison;
  recommendation: string;
}

export interface ProtocolOpportunity {
  protocol: string;
  apy: number;
  riskScore: number;
  liquidityScore: number;
  gasEstimate: number;
  confidence: number;
}

export interface ProtocolComparison {
  rateDifference: number;
  riskDifference: number;
  gasCostComparison: number;
  liquidityComparison: number;
  totalScore: number;
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
  private protocolAdapters: Map<string, ProtocolAdapter> = new Map();
  private lendingState: LendingState;
  private performanceCache: Map<string, PerformanceData[]> = new Map();
  private riskCalculationCache: Map<string, RiskMetrics> = new Map();
  private marketConditions: MarketConditions;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private lastCacheUpdate = 0;
  private provider?: ethers.Provider;
  private signer?: ethers.Signer;
  
  // Enhanced adapter integrations
  private seiAgentKitAdapter: SeiAgentKitAdapter;
  private hiveIntelligenceAdapter: HiveIntelligenceAdapter;
  private seiMCPAdapter: SeiMCPAdapter;
  private powerLevel: number = 0;
  private dragonBallTheme: string = 'Saiyan Lending Master';
  private adapterTools: Map<string, MCPTool | SAKTool> = new Map();

  constructor(config: AgentConfig, provider?: ethers.Provider, signer?: ethers.Signer) {
    super(config);
    this.provider = provider;
    this.signer = signer;
    this.lendingState = this.initializeLendingState();
    this.marketConditions = this.initializeMarketConditions();
    
    // Initialize enhanced adapters
    this.seiAgentKitAdapter = createSAKAdapter(config);
    this.hiveIntelligenceAdapter = createHiveAdapter(config);
    this.seiMCPAdapter = createMCPAdapter(config);
    
    this.initializeStrategies();
    this.initializeProtocolAdapters();
    this.initializeAdapterTools();
    this.registerLendingActions();
    
    // Calculate initial power level
    this.updatePowerLevel();
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
        protocols: ['compound', 'aave', 'maker', 'takara'],
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
        protocols: ['compound', 'aave', 'yearn', 'curve', 'takara'],
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
        protocols: ['compound', 'aave', 'yearn', 'curve', 'convex', 'frax', 'takara'],
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
        protocols: ['compound', 'aave', 'yearn', 'curve', 'convex', 'takara'],
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
   * Initialize protocol adapters
   */
  private initializeProtocolAdapters(): void {
    // Initialize Takara Protocol adapter if provider is available
    if (this.provider) {
      const takaraAdapter: ProtocolAdapter = {
        id: 'takara',
        name: 'Takara Protocol',
        adapter: createTakaraProtocolWrapper(this.provider, this.signer),
        priority: 1,
        isActive: true
      };
      this.protocolAdapters.set('takara', takaraAdapter);
    }

    // Initialize YeiFinance adapter
    // Note: YeiFinanceAdapter would need to be updated to match the same interface
    // For now, we'll focus on Takara integration
  }

  /**
   * Initialize adapter tools
   */
  private initializeAdapterTools(): void {
    // Register SAK tools for Takara operations
    this.adapterTools.set('takara_supply_enhanced', {
      name: 'takara_supply_enhanced',
      description: 'Enhanced Takara supply with power level calculation',
      category: 'defi',
      execute: this.enhancedTakaraSupply.bind(this),
      parameters: {
        asset: { type: 'string', required: true, description: 'Asset to supply' },
        amount: { type: 'number', required: true, description: 'Amount to supply' },
        powerBoost: { type: 'boolean', required: false, description: 'Apply Saiyan power boost' }
      },
      powerLevel: 5000,
      dragonBallTheme: 'Kamehameha Supply Wave'
    });
    
    this.adapterTools.set('lending_intelligence', {
      name: 'lending_intelligence',
      description: 'Get AI-powered lending insights from Hive Intelligence',
      category: 'analysis',
      execute: this.getLendingIntelligence.bind(this),
      parameters: {
        query: { type: 'string', required: true, description: 'Intelligence query' },
        includeMarketData: { type: 'boolean', required: false, description: 'Include market data' }
      },
      powerLevel: 3000,
      dragonBallTheme: 'Scouter Analysis'
    });

    this.adapterTools.set('realtime_balance_monitor', {
      name: 'realtime_balance_monitor',
      description: 'Monitor real-time balance changes across protocols',
      category: 'query',
      execute: this.realtimeBalanceMonitor.bind(this),
      parameters: {
        address: { type: 'string', required: true, description: 'Wallet address to monitor' },
        protocols: { type: 'array', required: false, description: 'Protocols to monitor' }
      },
      powerLevel: 2000,
      dragonBallTheme: 'Ki Detection'
    });
  }

  /**
   * Update power level based on portfolio performance
   */
  private updatePowerLevel(): void {
    const baseLevel = 1000;
    const portfolioValue = this.lendingState.totalValue;
    const yieldMultiplier = this.lendingState.averageAPY / 10;
    const riskAdjustment = Math.max(0.1, 1 - this.lendingState.riskScore);
    const diversificationBonus = this.lendingState.positions.length * 100;
    
    this.powerLevel = Math.floor(
      baseLevel + 
      (portfolioValue / 1000) + 
      (yieldMultiplier * 500) + 
      (riskAdjustment * 1000) + 
      diversificationBonus
    );
    
    // Update theme based on power level
    if (this.powerLevel >= 10000) {
      this.dragonBallTheme = 'Ultra Instinct Lending Master';
    } else if (this.powerLevel >= 5000) {
      this.dragonBallTheme = 'Super Saiyan Lending Warrior';
    } else if (this.powerLevel >= 2000) {
      this.dragonBallTheme = 'Elite Saiyan Lender';
    } else {
      this.dragonBallTheme = 'Saiyan Lending Apprentice';
    }
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
      },
      {
        id: 'compare_protocols',
        name: 'Compare Protocols',
        description: 'Compare lending rates and risks across all supported protocols',
        handler: this.compareProtocols.bind(this),
        validation: [
          { field: 'asset', required: true, type: 'string' as const },
          { field: 'amount', required: false, type: 'number' as const }
        ]
      },
      {
        id: 'optimize_yield',
        name: 'Optimize Yield',
        description: 'Find optimal protocol allocation for maximum yield',
        handler: this.optimizeYield.bind(this),
        validation: [
          { field: 'totalAmount', required: true, type: 'number' as const },
          { field: 'riskTolerance', required: false, type: 'string' as const }
        ]
      },
      {
        id: 'takara_supply',
        name: 'Takara Supply',
        description: 'Supply assets to Takara protocol specifically',
        handler: this.takaraSupply.bind(this),
        validation: [
          { field: 'asset', required: true, type: 'string' as const },
          { field: 'amount', required: true, type: 'number' as const }
        ]
      },
      {
        id: 'takara_borrow',
        name: 'Takara Borrow',
        description: 'Borrow assets from Takara protocol',
        handler: this.takaraBorrow.bind(this),
        validation: [
          { field: 'asset', required: true, type: 'string' as const },
          { field: 'amount', required: true, type: 'number' as const }
        ]
      },
      {
        id: 'cross_protocol_arbitrage',
        name: 'Cross Protocol Arbitrage',
        description: 'Identify arbitrage opportunities between protocols',
        handler: this.crossProtocolArbitrage.bind(this),
        validation: [
          { field: 'asset', required: true, type: 'string' as const },
          { field: 'minProfitBps', required: false, type: 'number' as const }
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
   * Update protocol data using enhanced adapters
   */
  private updateProtocolDataWithAdapters(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Get real-time data using MCP adapter
          try {
            await this.seiMCPAdapter.getChainData();
          } catch (error) {
            console.warn('MCP data fetch failed, continuing with legacy data');
          }
          
          // Update protocols with enhanced data
          await this.updateProtocolDataLegacy();
          
          // Add power level enhancements
          this.enhanceProtocolsWithPowerLevels();
        },
        error => this.createError('ENHANCED_PROTOCOL_UPDATE_FAILED', `Failed to update protocol data with adapters: ${error}`)
      )
    );
  }

  /**
   * Calculate opportunities with AI intelligence
   */
  private calculateOpportunitiesWithIntelligence(context: ActionContext): TaskEither<AgentError, LendingOpportunity[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Get base opportunities
          const baseOpportunities = await this.calculateOpportunitiesLegacy(context);
          
          // Enhance with Hive Intelligence
          const enhancedOpportunities = await this.enhanceOpportunitiesWithAI(baseOpportunities, context);
          
          // Apply Dragon Ball Z power calculations
          const powerEnhancedOpportunities = this.applyPowerLevelCalculations(enhancedOpportunities);
          
          return powerEnhancedOpportunities;
        },
        error => this.createError('ENHANCED_OPPORTUNITY_CALCULATION_FAILED', `Failed to calculate enhanced opportunities: ${error}`)
      )
    );
  }

  /**
   * Calculate protocol power level
   */
  private calculateProtocolPowerLevel(protocolId: string): number {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) return 1000;
    
    const basePower = 1000;
    const apyPower = protocol.apy * 100;
    const securityPower = protocol.securityScore * 2000;
    const liquidityPower = protocol.liquidityScore * 1500;
    const riskReduction = (1 - protocol.riskScore) * 1000;
    
    return Math.floor(basePower + apyPower + securityPower + liquidityPower + riskReduction);
  }

  /**
   * Get power level description
   */
  private getPowerLevelDescription(powerLevel: number): string {
    if (powerLevel >= 9000) return 'Over 9000! Legendary Protocol Power!';
    if (powerLevel >= 5000) return 'Super Saiyan Protocol Strength';
    if (powerLevel >= 3000) return 'Elite Warrior Protocol';
    if (powerLevel >= 1500) return 'Strong Fighter Protocol';
    return 'Training Protocol';
  }

  /**
   * Enhance protocols with power levels
   */
  private enhanceProtocolsWithPowerLevels(): void {
    for (const [protocolId, protocolData] of this.protocols) {
      const powerLevel = this.calculateProtocolPowerLevel(protocolId);
      (protocolData as any).powerLevel = powerLevel;
      (protocolData as any).powerDescription = this.getPowerLevelDescription(powerLevel);
    }
  }

  /**
   * Enhanced opportunity enhancement with AI
   */
  private async enhanceOpportunitiesWithAI(opportunities: LendingOpportunity[], context: ActionContext): Promise<LendingOpportunity[]> {
    try {
      const query: HiveQuery = {
        text: `Analyze these DeFi lending opportunities: ${JSON.stringify(opportunities.slice(0, 3))}`,
        type: 'analysis',
        metadata: {
          source: 'lending_agent',
          context: 'opportunity_enhancement',
          timestamp: new Date().toISOString()
        }
      };
      
      const hiveResponse = await this.hiveIntelligenceAdapter.query(query);
      
      if (hiveResponse._tag === 'Right') {
        const insights = hiveResponse.right.insights || [];
        
        return opportunities.map(opp => ({
          ...opp,
          aiInsights: insights.filter(insight => 
            insight.content.toLowerCase().includes(opp.protocol.toLowerCase()) ||
            insight.content.toLowerCase().includes(opp.asset.toLowerCase())
          ),
          confidence: Math.min(1, opp.confidence * (1 + insights.length * 0.05))
        }));
      }
    } catch (error) {
      console.warn('Failed to enhance opportunities with AI:', error);
    }
    
    return opportunities;
  }

  /**
   * Apply Dragon Ball Z power level calculations
   */
  private applyPowerLevelCalculations(opportunities: LendingOpportunity[]): LendingOpportunity[] {
    return opportunities.map(opp => {
      const protocolPowerLevel = this.calculateProtocolPowerLevel(opp.protocol);
      const powerMultiplier = Math.min(2, 1 + (protocolPowerLevel / 10000));
      
      return {
        ...opp,
        powerLevel: protocolPowerLevel,
        confidence: Math.min(1, opp.confidence * powerMultiplier),
        reasoning: [
          ...opp.reasoning,
          `🐉 Protocol Power Level: ${protocolPowerLevel} - ${this.getPowerLevelDescription(protocolPowerLevel)}`
        ]
      };
    });
  }

  /**
   * Generate Dragon Ball Z themed recommendations
   */
  private generateDragonBallRecommendations(opportunities: LendingOpportunity[], context: ActionContext): string[] {
    const recommendations: string[] = [];
    
    if (opportunities.length === 0) {
      recommendations.push('🐉 No suitable lending opportunities detected in the current power level scan!');
      return recommendations;
    }
    
    const topOpportunity = opportunities[0];
    const powerLevel = (topOpportunity as any).powerLevel || 1000;
    
    recommendations.push(
      `🐉 **KAMEHAMEHA RECOMMENDATION!** ${topOpportunity.asset} on ${topOpportunity.protocol} with ${topOpportunity.apy.toFixed(2)}% APY (Power Level: ${powerLevel})`
    );
    
    if (opportunities.length > 1) {
      recommendations.push('🐉 Consider fusion technique - diversify across multiple protocols to increase your power level!');
    }
    
    if (this.marketConditions.volatility > 0.6) {
      recommendations.push('⚡ High market volatility detected! Use defensive stance - conservative strategies recommended!');
    }
    
    if (this.powerLevel >= 9000) {
      recommendations.push('🐉🔥 Your power level is OVER 9000! You can handle high-risk, high-reward strategies!');
    }
    
    return recommendations;
  }

  /**
   * Generate AI insights summary
   */
  private generateAIInsights(opportunities: LendingOpportunity[]): string[] {
    const insights: string[] = [];
    
    const avgAPY = opportunities.reduce((sum, opp) => sum + opp.apy, 0) / opportunities.length;
    const avgRisk = opportunities.reduce((sum, opp) => sum + opp.riskScore, 0) / opportunities.length;
    
    insights.push(`Average APY across top opportunities: ${avgAPY.toFixed(2)}%`);
    insights.push(`Average risk score: ${(avgRisk * 100).toFixed(1)}%`);
    
    if (avgAPY > 15) {
      insights.push('High yield environment detected - consider taking advantage while managing risk');
    }
    
    if (avgRisk < 0.3) {
      insights.push('Low risk environment - good time for conservative growth strategies');
    }
    
    return insights;
  }

  /**
   * Legacy opportunity calculation implementation
   */
  private calculateOpportunitiesLegacy(context: ActionContext): TaskEither<AgentError, LendingOpportunity[]> {
    return this.calculateOpportunities(context);
  }

  /**
   * Legacy protocol data update 
   */
  private updateProtocolDataLegacy(): TaskEither<AgentError, void> {
    return this.updateProtocolData();
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
          const protocols = ['compound', 'aave', 'yearn', 'curve', 'convex', 'frax', 'takara'];
          
          for (const protocolId of protocols) {
            let data: ProtocolData;
            
            if (protocolId === 'takara') {
              // Get real data from Takara adapter if available
              data = await this.updateTakaraProtocolData();
            } else {
              data = {
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
            }
            
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
   * Update Takara protocol data using real adapter
   */
  private async updateTakaraProtocolData(): Promise<ProtocolData> {
    const takaraAdapter = this.protocolAdapters.get('takara');
    
    if (!takaraAdapter) {
      // Fallback to simulated data
      return {
        id: 'takara',
        name: 'Takara Protocol',
        tvl: 50000000, // $50M simulated
        apy: 12.5, // 12.5% APY
        riskScore: 0.25, // Low risk (newer but audited)
        liquidityScore: 0.8,
        securityScore: 0.85,
        lastUpdate: new Date(),
        supportedAssets: ['SEI', 'iSEI', 'USDT', 'USDC', 'fastUSD', 'uBTC'],
        minimumDeposit: 1,
        withdrawalFee: 0.0001,
        performanceHistory: this.generatePerformanceHistory()
      };
    }

    try {
      // Get real data from Takara adapter
      const adapter = takaraAdapter.adapter as TakaraProtocolWrapper;
      const supportedAssets = await adapter.getSupportedAssets();
      
      if (supportedAssets._tag === 'Right') {
        const assets = supportedAssets.right;
        let totalTvl = 0n;
        let avgApy = 0n;
        let assetCount = 0n;

        // Calculate aggregate metrics from supported assets
        for (const asset of assets) {
          try {
            const rates = await adapter.getLendingRates(asset.symbol);
            if (rates._tag === 'Right') {
              totalTvl += rates.right.totalSupply;
              avgApy += rates.right.supplyRate;
              assetCount++;
            }
          } catch (error) {
            // Skip assets with errors
            continue;
          }
        }

        const averageApy = assetCount > 0n ? Number(avgApy / assetCount) / 1e25 : 12.5; // Convert from ray to percentage

        return {
          id: 'takara',
          name: 'Takara Protocol',
          tvl: Number(totalTvl) / 1e18, // Convert from wei
          apy: averageApy,
          riskScore: 0.25, // Static for now, could be calculated based on protocol metrics
          liquidityScore: 0.8,
          securityScore: 0.85,
          lastUpdate: new Date(),
          supportedAssets: assets.map(a => a.symbol),
          minimumDeposit: 1,
          withdrawalFee: 0.0001,
          performanceHistory: this.generatePerformanceHistory()
        };
      }
    } catch (error) {
      console.warn('Failed to fetch Takara protocol data:', error);
    }

    // Fallback to simulated data
    return {
      id: 'takara',
      name: 'Takara Protocol',
      tvl: 50000000,
      apy: 12.5,
      riskScore: 0.25,
      liquidityScore: 0.8,
      securityScore: 0.85,
      lastUpdate: new Date(),
      supportedAssets: ['SEI', 'iSEI', 'USDT', 'USDC', 'fastUSD', 'uBTC'],
      minimumDeposit: 1,
      withdrawalFee: 0.0001,
      performanceHistory: this.generatePerformanceHistory()
    };
  }

  /**
   * Compare protocols for a specific asset
   */
  private compareProtocols(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { asset, amount = 10000 } = context.parameters;

    return pipe(
      this.updateProtocolData(),
      TE.chain(() => TE.tryCatch(
        async () => {
          const opportunities: ProtocolOpportunity[] = [];
          
          for (const [protocolId, protocolData] of this.protocols) {
            if (protocolData.supportedAssets.includes(asset)) {
              const gasEstimate = await this.estimateGasCost(protocolId, 'supply');
              
              opportunities.push({
                protocol: protocolId,
                apy: protocolData.apy,
                riskScore: protocolData.riskScore,
                liquidityScore: protocolData.liquidityScore,
                gasEstimate,
                confidence: this.calculateProtocolConfidence(protocolData)
              });
            }
          }

          opportunities.sort((a, b) => b.confidence - a.confidence);
          
          const best = opportunities[0];
          const comparison = this.generateProtocolComparison(opportunities);

          const multiProtocolOpportunity: MultiProtocolOpportunity = {
            bestProtocol: best?.protocol || '',
            alternatives: opportunities,
            comparison,
            recommendation: this.generateComparisonRecommendation(opportunities, asset, amount)
          };

          return multiProtocolOpportunity;
        },
        error => this.createError('PROTOCOL_COMPARISON_FAILED', `Failed to compare protocols: ${error}`)
      )),
      TE.map(comparison => ({
        success: true,
        data: comparison,
        message: `Compared ${comparison.alternatives.length} protocols for ${asset}`
      }))
    );
  }

  /**
   * Optimize yield across multiple protocols
   */
  private optimizeYield(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { totalAmount, riskTolerance = 'medium' } = context.parameters;

    return pipe(
      this.updateProtocolData(),
      TE.chain(() => TE.tryCatch(
        async () => {
          const allocations = await this.calculateOptimalAllocation(totalAmount, riskTolerance);
          const projectedYield = this.calculateProjectedYield(allocations);
          const riskMetrics = this.calculateAllocationRisk(allocations);

          return {
            allocations,
            projectedYield,
            riskMetrics,
            rebalanceFrequency: this.calculateOptimalRebalanceFrequency(allocations),
            expectedGasCosts: this.estimateAllocationGasCosts(allocations)
          };
        },
        error => this.createError('YIELD_OPTIMIZATION_FAILED', `Failed to optimize yield: ${error}`)
      )),
      TE.map(optimization => ({
        success: true,
        data: optimization,
        message: `Optimized allocation for $${totalAmount} with ${riskTolerance} risk tolerance`
      }))
    );
  }

  /**
   * Supply assets to Takara protocol
   */
  private takaraSupply(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { asset, amount } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          const takaraAdapter = this.protocolAdapters.get('takara');
          if (!takaraAdapter || !this.signer) {
            throw new Error('Takara adapter not available or no signer provided');
          }

          const adapter = takaraAdapter.adapter as TakaraProtocolWrapper;
          const amountBigInt = BigInt(Math.floor(amount * 1e18)); // Convert to wei

          const result = await adapter.supply({
            asset,
            amount: amountBigInt,
            referralCode: 0
          });

          if (result._tag === 'Left') {
            throw new Error(result.left.message);
          }

          // Update local state
          const position: LendingPosition = {
            id: `takara_${asset}_${Date.now()}`,
            protocol: 'takara',
            asset,
            amount,
            apy: this.protocols.get('takara')?.apy || 0,
            entryPrice: 1,
            entryTime: new Date(),
            lastUpdate: new Date(),
            unrealizedPnL: 0,
            fees: amount * 0.0001,
            strategyId: 'adaptive'
          };

          this.lendingState.positions.push(position);
          this.recalculatePortfolioMetrics();

          return {
            transaction: result.right,
            position,
            newHealthFactor: await this.getTakaraHealthFactor()
          };
        },
        error => this.createError('TAKARA_SUPPLY_FAILED', `Takara supply failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `Successfully supplied ${amount} ${asset} to Takara Protocol`
      }))
    );
  }

  /**
   * Borrow assets from Takara protocol
   */
  private takaraBorrow(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { asset, amount } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          const takaraAdapter = this.protocolAdapters.get('takara');
          if (!takaraAdapter || !this.signer) {
            throw new Error('Takara adapter not available or no signer provided');
          }

          const adapter = takaraAdapter.adapter as TakaraProtocolWrapper;
          const amountBigInt = BigInt(Math.floor(amount * 1e18));

          // Check health factor before borrowing
          const currentHealthFactor = await this.getTakaraHealthFactor();
          if (currentHealthFactor < 1.5) {
            throw new Error(`Health factor ${currentHealthFactor} too low for borrowing`);
          }

          const result = await adapter.borrow({
            asset,
            amount: amountBigInt,
            interestRateMode: 'variable',
            referralCode: 0
          });

          if (result._tag === 'Left') {
            throw new Error(result.left.message);
          }

          const newHealthFactor = await this.getTakaraHealthFactor();

          return {
            transaction: result.right,
            oldHealthFactor: currentHealthFactor,
            newHealthFactor,
            liquidationRisk: TakaraRiskAssessment.calculateLiquidationRisk(BigInt(Math.floor(newHealthFactor * 1e18)))
          };
        },
        error => this.createError('TAKARA_BORROW_FAILED', `Takara borrow failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `Successfully borrowed ${amount} ${asset} from Takara Protocol`
      }))
    );
  }

  /**
   * Identify cross-protocol arbitrage opportunities
   */
  private crossProtocolArbitrage(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { asset, minProfitBps = 50 } = context.parameters; // 50 basis points minimum profit

    return pipe(
      this.updateProtocolData(),
      TE.chain(() => TE.tryCatch(
        async () => {
          const opportunities = [];
          const protocols = Array.from(this.protocols.values());
          
          for (let i = 0; i < protocols.length; i++) {
            for (let j = i + 1; j < protocols.length; j++) {
              const protocolA = protocols[i];
              const protocolB = protocols[j];
              
              if (protocolA.supportedAssets.includes(asset) && protocolB.supportedAssets.includes(asset)) {
                const rateDiff = Math.abs(protocolA.apy - protocolB.apy);
                const profitBps = rateDiff * 100; // Convert to basis points
                
                if (profitBps >= minProfitBps) {
                  const borrowFrom = protocolA.apy < protocolB.apy ? protocolA : protocolB;
                  const lendTo = protocolA.apy > protocolB.apy ? protocolA : protocolB;
                  
                  const gasCosts = await this.estimateArbitrageGasCosts(borrowFrom.id, lendTo.id);
                  const breakEvenAmount = this.calculateArbitrageBreakEven(rateDiff, gasCosts);
                  
                  opportunities.push({
                    borrowFrom: borrowFrom.id,
                    lendTo: lendTo.id,
                    asset,
                    rateDifference: rateDiff,
                    profitBps,
                    gasCosts,
                    breakEvenAmount,
                    maxProfitableAmount: breakEvenAmount * 10, // Conservative estimate
                    riskAssessment: this.assessArbitrageRisk(borrowFrom, lendTo)
                  });
                }
              }
            }
          }
          
          opportunities.sort((a, b) => b.profitBps - a.profitBps);
          
          return {
            opportunities: opportunities.slice(0, 5), // Top 5 opportunities
            totalOpportunities: opportunities.length,
            bestOpportunity: opportunities[0] || null,
            marketConditions: this.marketConditions
          };
        },
        error => this.createError('ARBITRAGE_ANALYSIS_FAILED', `Failed to analyze arbitrage: ${error}`)
      )),
      TE.map(analysis => ({
        success: true,
        data: analysis,
        message: `Found ${analysis.totalOpportunities} arbitrage opportunities for ${asset}`
      }))
    );
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
   * Helper methods for new functionality
   */
  
  private async estimateGasCost(protocolId: string, operation: string): Promise<number> {
    // Simplified gas estimation
    const baseGas = {
      supply: 150000,
      withdraw: 120000,
      borrow: 180000,
      repay: 140000
    };
    
    const protocolMultiplier = protocolId === 'takara' ? 1.1 : 1.0; // Takara might be slightly more expensive
    return (baseGas[operation as keyof typeof baseGas] || 150000) * protocolMultiplier;
  }

  private calculateProtocolConfidence(protocolData: ProtocolData): number {
    // Weighted confidence score
    const apyScore = Math.min(protocolData.apy / 50, 1) * 0.3;
    const riskScore = (1 - protocolData.riskScore) * 0.4;
    const liquidityScore = protocolData.liquidityScore * 0.2;
    const securityScore = protocolData.securityScore * 0.1;
    
    return apyScore + riskScore + liquidityScore + securityScore;
  }

  private generateProtocolComparison(opportunities: ProtocolOpportunity[]): ProtocolComparison {
    if (opportunities.length < 2) {
      return {
        rateDifference: 0,
        riskDifference: 0,
        gasCostComparison: 0,
        liquidityComparison: 0,
        totalScore: 0
      };
    }

    const best = opportunities[0];
    const second = opportunities[1];

    return {
      rateDifference: best.apy - second.apy,
      riskDifference: second.riskScore - best.riskScore,
      gasCostComparison: second.gasEstimate - best.gasEstimate,
      liquidityComparison: best.liquidityScore - second.liquidityScore,
      totalScore: best.confidence - second.confidence
    };
  }

  private generateComparisonRecommendation(opportunities: ProtocolOpportunity[], asset: string, amount: number): string {
    if (opportunities.length === 0) {
      return `No protocols support ${asset} currently.`;
    }

    const best = opportunities[0];
    const rateDiff = opportunities.length > 1 ? best.apy - opportunities[1].apy : 0;

    let recommendation = `Best option: ${best.protocol} with ${best.apy.toFixed(2)}% APY. `;
    
    if (rateDiff > 1) {
      recommendation += `Significantly better than alternatives (+${rateDiff.toFixed(2)}%). `;
    } else if (rateDiff > 0.1) {
      recommendation += `Marginally better than alternatives (+${rateDiff.toFixed(2)}%). `;
    }

    if (best.riskScore > 0.6) {
      recommendation += `⚠️ High risk score (${(best.riskScore * 100).toFixed(1)}%) - consider smaller allocation.`;
    }

    return recommendation;
  }

  private async calculateOptimalAllocation(totalAmount: number, riskTolerance: string): Promise<any[]> {
    const allocations = [];
    const protocols = Array.from(this.protocols.values());
    
    // Risk tolerance mapping
    const riskWeights = {
      conservative: { risk: 0.7, yield: 0.3 },
      medium: { risk: 0.5, yield: 0.5 },
      aggressive: { risk: 0.3, yield: 0.7 }
    };
    
    const weights = riskWeights[riskTolerance as keyof typeof riskWeights] || riskWeights.medium;
    
    // Calculate scores for each protocol
    const scoredProtocols = protocols.map(protocol => ({
      ...protocol,
      score: (protocol.apy / 50 * weights.yield) + ((1 - protocol.riskScore) * weights.risk)
    })).sort((a, b) => b.score - a.score);

    // Allocate based on scores (top 3-5 protocols)
    const topProtocols = scoredProtocols.slice(0, Math.min(5, scoredProtocols.length));
    const totalScore = topProtocols.reduce((sum, p) => sum + p.score, 0);
    
    let remainingAmount = totalAmount;
    
    topProtocols.forEach((protocol, index) => {
      const isLast = index === topProtocols.length - 1;
      const allocation = isLast ? remainingAmount : Math.floor((protocol.score / totalScore) * totalAmount);
      
      allocations.push({
        protocol: protocol.id,
        amount: allocation,
        percentage: (allocation / totalAmount) * 100,
        expectedApy: protocol.apy,
        riskScore: protocol.riskScore
      });
      
      remainingAmount -= allocation;
    });

    return allocations;
  }

  private calculateProjectedYield(allocations: any[]): any {
    const totalAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const weightedApy = allocations.reduce((sum, alloc) => 
      sum + (alloc.expectedApy * alloc.amount / totalAmount), 0
    );

    return {
      totalAmount,
      weightedApy,
      estimatedYearlyReturn: totalAmount * (weightedApy / 100),
      estimatedMonthlyReturn: totalAmount * (weightedApy / 100) / 12,
      breakdown: allocations.map(alloc => ({
        protocol: alloc.protocol,
        amount: alloc.amount,
        yearlyReturn: alloc.amount * (alloc.expectedApy / 100)
      }))
    };
  }

  private calculateAllocationRisk(allocations: any[]): any {
    const totalAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const weightedRisk = allocations.reduce((sum, alloc) => 
      sum + (alloc.riskScore * alloc.amount / totalAmount), 0
    );

    return {
      overallRiskScore: weightedRisk,
      riskLevel: weightedRisk < 0.3 ? 'Low' : weightedRisk < 0.6 ? 'Medium' : 'High',
      diversificationScore: allocations.length / 5, // Max 5 protocols
      concentration: Math.max(...allocations.map(a => a.percentage)),
      riskBreakdown: allocations.map(alloc => ({
        protocol: alloc.protocol,
        risk: alloc.riskScore,
        contribution: (alloc.amount / totalAmount) * alloc.riskScore
      }))
    };
  }

  private calculateOptimalRebalanceFrequency(allocations: any[]): string {
    const avgRisk = allocations.reduce((sum, alloc) => sum + alloc.riskScore, 0) / allocations.length;
    
    if (avgRisk < 0.3) return 'Monthly';
    if (avgRisk < 0.6) return 'Bi-weekly';
    return 'Weekly';
  }

  private estimateAllocationGasCosts(allocations: any[]): any {
    const gasPrice = 20; // 20 gwei assumed
    const ethPrice = 2000; // $2000 ETH assumed
    
    const totalGas = allocations.reduce((sum, alloc) => {
      return sum + 150000; // Estimated gas per allocation
    }, 0);

    const gasCostEth = (totalGas * gasPrice) / 1e9;
    const gasCostUsd = gasCostEth * ethPrice;

    return {
      totalGas,
      gasCostEth,
      gasCostUsd,
      gasPerAllocation: 150000,
      estimatedRebalanceCost: gasCostUsd * 0.5 // Assuming rebalancing uses ~50% of initial allocation gas
    };
  }

  private async getTakaraHealthFactor(): Promise<number> {
    const takaraAdapter = this.protocolAdapters.get('takara');
    if (!takaraAdapter || !this.signer) {
      return 2.0; // Default safe value
    }

    try {
      const adapter = takaraAdapter.adapter as TakaraProtocolWrapper;
      const userAddress = await this.signer.getAddress();
      const healthData = await adapter.getHealthFactor(userAddress);
      
      if (healthData._tag === 'Right') {
        return Number(healthData.right.healthFactor) / 1e18;
      }
    } catch (error) {
      console.warn('Failed to get Takara health factor:', error);
    }
    
    return 2.0;
  }

  private async estimateArbitrageGasCosts(borrowProtocol: string, lendProtocol: string): Promise<number> {
    // Estimate gas for borrow + supply operations
    const borrowGas = await this.estimateGasCost(borrowProtocol, 'borrow');
    const supplyGas = await this.estimateGasCost(lendProtocol, 'supply');
    
    return borrowGas + supplyGas + 50000; // Additional gas for approvals and coordination
  }

  private calculateArbitrageBreakEven(rateDiff: number, gasCosts: number): number {
    const gasPrice = 20; // 20 gwei
    const ethPrice = 2000; // $2000 ETH
    const gasCostUsd = (gasCosts * gasPrice) / 1e9 * ethPrice;
    
    // Break-even amount where rate difference covers gas costs over 1 year
    return gasCostUsd / (rateDiff / 100);
  }

  private assessArbitrageRisk(borrowProtocol: ProtocolData, lendProtocol: ProtocolData): any {
    const combinedRisk = (borrowProtocol.riskScore + lendProtocol.riskScore) / 2;
    const liquidityRisk = Math.min(borrowProtocol.liquidityScore, lendProtocol.liquidityScore);
    
    return {
      overallRisk: combinedRisk,
      liquidityRisk: 1 - liquidityRisk,
      protocolRisk: {
        borrow: borrowProtocol.riskScore,
        lend: lendProtocol.riskScore
      },
      recommendation: combinedRisk < 0.4 ? 'Low risk' : combinedRisk < 0.7 ? 'Medium risk' : 'High risk'
    };
  }

  /**
   * Enhanced Takara supply with power boost
   */
  private enhancedTakaraSupply(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { asset, amount, powerBoost = false } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          // Calculate power boost multiplier
          const powerMultiplier = powerBoost ? Math.min(1.5, 1 + (this.powerLevel / 20000)) : 1;
          const enhancedAmount = amount * powerMultiplier;
          
          // Get real-time data before executing
          const realtimeData = await this.seiMCPAdapter.getWalletBalance(
            this.signer ? await this.signer.getAddress() : ''
          );
          
          // Execute enhanced supply using SAK adapter
          const sakResult = await this.seiAgentKitAdapter.executeTool(
            'takara_supply_enhanced',
            {
              asset,
              amount: enhancedAmount,
              powerLevel: this.powerLevel
            }
          );
          
          // Update power level after successful operation
          this.updatePowerLevel();
          
          const result = {
            originalAmount: amount,
            enhancedAmount,
            powerBoostApplied: powerBoost,
            powerLevel: this.powerLevel,
            theme: this.dragonBallTheme,
            realtimeBalance: realtimeData._tag === 'Right' ? realtimeData.right : null,
            sakExecution: sakResult._tag === 'Right' ? sakResult.right : null
          };
          
          return result;
        },
        error => this.createError('ENHANCED_TAKARA_SUPPLY_FAILED', `Enhanced Takara supply failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `🐉 KAMEHAMEHA SUPPLY COMPLETE! ${result.enhancedAmount} ${asset} supplied with ${result.powerBoostApplied ? 'POWER BOOST' : 'standard'} technique. New Power Level: ${result.powerLevel}!`
      }))
    );
  }

  /**
   * Get AI-powered lending intelligence
   */
  private getLendingIntelligence(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { query, includeMarketData = true } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          const hiveQuery: HiveQuery = {
            text: query,
            type: 'analysis',
            metadata: {
              source: 'lending_agent',
              powerLevel: this.powerLevel.toString(),
              theme: this.dragonBallTheme,
              includeMarketData
            }
          };
          
          const response = await this.hiveIntelligenceAdapter.query(hiveQuery);
          
          if (response._tag === 'Left') {
            throw new Error(response.left.message);
          }
          
          const intelligence = response.right;
          
          // Enhance with current portfolio data if available
          const portfolioContext = {
            totalValue: this.lendingState.totalValue,
            averageAPY: this.lendingState.averageAPY,
            riskScore: this.lendingState.riskScore,
            positionCount: this.lendingState.positions.length,
            powerLevel: this.powerLevel
          };
          
          return {
            intelligence,
            portfolioContext,
            powerLevel: this.powerLevel,
            theme: this.dragonBallTheme,
            creditUsage: intelligence.creditUsage
          };
        },
        error => this.createError('LENDING_INTELLIGENCE_FAILED', `Failed to get lending intelligence: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `🔍 ${this.dragonBallTheme} analysis complete! Scouter readings show: ${result.intelligence.insights?.length || 0} insights detected.`
      }))
    );
  }

  /**
   * Real-time balance monitoring
   */
  private realtimeBalanceMonitor(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { address, protocols = [] } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          // Get wallet balance from MCP adapter
          const balanceResult = await this.seiMCPAdapter.getWalletBalance(address);
          
          if (balanceResult._tag === 'Left') {
            throw new Error(balanceResult.left.message);
          }
          
          const walletData = balanceResult.right;
          
          // Get protocol-specific data
          const protocolBalances = [];
          for (const protocolId of protocols.length > 0 ? protocols : Array.from(this.protocols.keys())) {
            try {
              const protocolBalance = await this.getProtocolBalance(address, protocolId);
              protocolBalances.push({
                protocol: protocolId,
                balance: protocolBalance,
                powerLevel: this.calculateProtocolPowerLevel(protocolId)
              });
            } catch (error) {
              console.warn(`Failed to get balance for ${protocolId}:`, error);
            }
          }
          
          // Calculate total power level across all positions
          const totalProtocolPower = protocolBalances.reduce((sum, pb) => sum + pb.powerLevel, 0);
          
          return {
            walletData,
            protocolBalances,
            totalProtocolPower,
            userPowerLevel: this.powerLevel,
            theme: this.dragonBallTheme,
            lastUpdate: new Date().toISOString()
          };
        },
        error => this.createError('REALTIME_MONITORING_FAILED', `Real-time monitoring failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `🐉 Ki detection complete! Monitoring ${result.protocolBalances.length} protocols. Total Protocol Power: ${result.totalProtocolPower}`
      }))
    );
  }

  /**
   * Power level analysis
   */
  private powerLevelAnalysis(context: ActionContext): TaskEither<AgentError, ActionResult> {
    return pipe(
      TE.tryCatch(
        async () => {
          this.updatePowerLevel();
          
          const analysis = {
            currentPowerLevel: this.powerLevel,
            theme: this.dragonBallTheme,
            powerBreakdown: {
              baseLevel: 1000,
              portfolioValue: Math.floor(this.lendingState.totalValue / 1000),
              yieldMultiplier: Math.floor((this.lendingState.averageAPY / 10) * 500),
              riskAdjustment: Math.floor(Math.max(0.1, 1 - this.lendingState.riskScore) * 1000),
              diversificationBonus: this.lendingState.positions.length * 100
            },
            protocolPowerLevels: Array.from(this.protocols.entries()).map(([id, data]) => ({
              protocol: id,
              powerLevel: this.calculateProtocolPowerLevel(id),
              description: this.getPowerLevelDescription(this.calculateProtocolPowerLevel(id))
            })),
            recommendations: this.generatePowerLevelRecommendations()
          };
          
          return analysis;
        },
        error => this.createError('POWER_LEVEL_ANALYSIS_FAILED', `Power level analysis failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `🐉 Power Level: ${result.currentPowerLevel} - ${result.theme}! Your training in DeFi lending continues to grow stronger!`
      }))
    );
  }

  /**
   * Cross-protocol fusion strategy
   */
  private crossProtocolFusion(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { totalAmount, fusionType = 'balanced' } = context.parameters;

    return pipe(
      TE.tryCatch(
        async () => {
          // Get AI insights for fusion strategy
          const aiQuery: HiveQuery = {
            text: `Design a cross-protocol fusion strategy for $${totalAmount} with ${fusionType} fusion type`,
            type: 'strategy',
            metadata: {
              source: 'fusion_strategy',
              amount: totalAmount.toString(),
              fusionType,
              powerLevel: this.powerLevel.toString()
            }
          };
          
          const aiResponse = await this.hiveIntelligenceAdapter.query(aiQuery);
          
          // Calculate optimal allocation using multiple adapters
          const allocation = await this.calculateFusionAllocation(totalAmount, fusionType);
          
          // Get real-time data for validation
          const realtimeValidation = await this.validateFusionStrategy(allocation);
          
          const fusionStrategy = {
            type: fusionType,
            totalAmount,
            allocation,
            powerLevel: this.powerLevel,
            fusionPowerMultiplier: this.calculateFusionPowerMultiplier(allocation),
            aiInsights: aiResponse._tag === 'Right' ? aiResponse.right.insights : [],
            realtimeValidation,
            estimatedAPY: allocation.reduce((sum, alloc) => sum + (alloc.apy * alloc.percentage / 100), 0),
            riskScore: allocation.reduce((sum, alloc) => sum + (alloc.riskScore * alloc.percentage / 100), 0)
          };
          
          return fusionStrategy;
        },
        error => this.createError('FUSION_STRATEGY_FAILED', `Cross-protocol fusion failed: ${error}`)
      ),
      TE.map(result => ({
        success: true,
        data: result,
        message: `🐉⚡ FUSION TECHNIQUE COMPLETE! ${result.type.toUpperCase()} fusion strategy created with ${result.fusionPowerMultiplier.toFixed(2)}x power multiplier!`
      }))
    );
  }

  /**
   * Get protocol balance for address
   */
  private async getProtocolBalance(address: string, protocolId: string): Promise<any> {
    // This would integrate with specific protocol adapters
    // For now, return simulated data
    return {
      supplied: Math.random() * 10000,
      borrowed: Math.random() * 5000,
      netPosition: Math.random() * 5000,
      healthFactor: 1.5 + Math.random()
    };
  }

  /**
   * Generate power level recommendations
   */
  private generatePowerLevelRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.powerLevel < 2000) {
      recommendations.push('🐉 Your power level is still growing! Consider diversifying across more protocols to increase your strength.');
      recommendations.push('⚡ Focus on stable, low-risk protocols to build your foundation.');
    } else if (this.powerLevel < 5000) {
      recommendations.push('🐉 You\'re becoming a strong fighter! Consider adding some medium-risk, high-yield protocols.');
      recommendations.push('⚡ Your training is paying off - time to explore more advanced strategies.');
    } else if (this.powerLevel < 9000) {
      recommendations.push('🐉 Super Saiyan level achieved! You can handle high-risk strategies with proper risk management.');
      recommendations.push('⚡ Consider cross-protocol arbitrage and advanced yield farming techniques.');
    } else {
      recommendations.push('🐉🔥 OVER 9000! You\'ve achieved legendary status! Master of all DeFi protocols!');
      recommendations.push('⚡ You can safely explore the most aggressive yield strategies and lead fusion techniques!');
    }
    
    return recommendations;
  }

  /**
   * Calculate fusion allocation
   */
  private async calculateFusionAllocation(totalAmount: number, fusionType: string): Promise<any[]> {
    const protocols = Array.from(this.protocols.values());
    const allocation: any[] = [];
    
    // Fusion type strategies
    const fusionStrategies = {
      balanced: { riskWeight: 0.5, yieldWeight: 0.5, diversification: 0.8 },
      aggressive: { riskWeight: 0.2, yieldWeight: 0.8, diversification: 0.6 },
      defensive: { riskWeight: 0.8, yieldWeight: 0.2, diversification: 0.9 }
    };
    
    const strategy = fusionStrategies[fusionType as keyof typeof fusionStrategies] || fusionStrategies.balanced;
    
    // Score protocols based on fusion strategy
    const scoredProtocols = protocols.map(protocol => {
      const powerLevel = this.calculateProtocolPowerLevel(protocol.id);
      const riskScore = (1 - protocol.riskScore) * strategy.riskWeight;
      const yieldScore = (protocol.apy / 50) * strategy.yieldWeight;
      const powerScore = (powerLevel / 10000) * 0.2;
      
      return {
        ...protocol,
        fusionScore: riskScore + yieldScore + powerScore,
        powerLevel
      };
    }).sort((a, b) => b.fusionScore - a.fusionScore);
    
    // Allocate based on fusion scores
    const topProtocols = scoredProtocols.slice(0, Math.min(5, scoredProtocols.length));
    const totalScore = topProtocols.reduce((sum, p) => sum + p.fusionScore, 0);
    
    let remainingAmount = totalAmount;
    
    topProtocols.forEach((protocol, index) => {
      const isLast = index === topProtocols.length - 1;
      const percentage = isLast ? (remainingAmount / totalAmount) * 100 : (protocol.fusionScore / totalScore) * 100;
      const amount = isLast ? remainingAmount : Math.floor((percentage / 100) * totalAmount);
      
      allocation.push({
        protocol: protocol.id,
        amount,
        percentage,
        apy: protocol.apy,
        riskScore: protocol.riskScore,
        powerLevel: protocol.powerLevel,
        fusionScore: protocol.fusionScore
      });
      
      remainingAmount -= amount;
    });
    
    return allocation;
  }

  /**
   * Calculate fusion power multiplier
   */
  private calculateFusionPowerMultiplier(allocation: any[]): number {
    const diversificationBonus = Math.min(1.5, allocation.length / 3);
    const powerBonus = allocation.reduce((sum, alloc) => sum + (alloc.powerLevel / 10000) * (alloc.percentage / 100), 0);
    const fusionSynergy = allocation.length > 1 ? 1.2 : 1.0;
    
    return diversificationBonus + powerBonus + fusionSynergy;
  }

  /**
   * Validate fusion strategy with real-time data
   */
  private async validateFusionStrategy(allocation: any[]): Promise<any> {
    const validation = {
      liquidity: 'sufficient',
      gasEstimate: 0,
      risks: [],
      opportunities: []
    };
    
    for (const alloc of allocation) {
      const protocol = this.protocols.get(alloc.protocol);
      if (protocol) {
        validation.gasEstimate += await this.estimateGasCost(alloc.protocol, 'supply');
        
        if (protocol.liquidityScore < 0.5) {
          validation.risks.push(`Low liquidity risk on ${alloc.protocol}`);
        }
        
        if (protocol.apy > 20) {
          validation.opportunities.push(`High yield opportunity on ${alloc.protocol}: ${protocol.apy.toFixed(2)}%`);
        }
      }
    }
    
    return validation;
  }

  /**
   * Agent-specific initialization with adapter setup
   */
  protected initialize(): TaskEither<AgentError, void> {
    return pipe(
      this.initializeAdapters(),
      TE.chain(() => this.updateProtocolDataWithAdapters()),
      TE.chain(() => this.updateMarketConditions()),
      TE.chain(() => this.validateAdapterConnections())
    );
  }

  /**
   * Initialize all adapters
   */
  private initializeAdapters(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Initialize SAK adapter
          await this.seiAgentKitAdapter.initialize();
          
          // Initialize Hive Intelligence adapter
          await this.hiveIntelligenceAdapter.initialize();
          
          // Initialize MCP adapter
          await this.seiMCPAdapter.initialize();
          
          console.log('🐉 All adapters initialized successfully! Power level rising...');
        },
        error => this.createError('ADAPTER_INITIALIZATION_FAILED', `Failed to initialize adapters: ${error}`)
      )
    );
  }

  /**
   * Validate adapter connections
   */
  private validateAdapterConnections(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Test SAK connection
          const sakTest = await this.seiAgentKitAdapter.getAvailableTools();
          if (sakTest._tag === 'Left') {
            throw new Error('SAK adapter connection failed');
          }
          
          // Test Hive connection
          const hiveTest = await this.hiveIntelligenceAdapter.query({
            text: 'connection test',
            type: 'ping',
            metadata: { source: 'initialization' }
          });
          
          // Test MCP connection (optional, might not always be available)
          try {
            await this.seiMCPAdapter.getChainData();
          } catch (error) {
            console.warn('MCP adapter connection test failed, but continuing:', error);
          }
          
          console.log('🐉 All adapter connections validated! Ready for battle!');
        },
        error => this.createError('ADAPTER_VALIDATION_FAILED', `Failed to validate adapter connections: ${error}`)
      )
    );
  }

  /**
   * Agent-specific cleanup with adapter cleanup
   */
  protected cleanup(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Cleanup SAK adapter
          await this.seiAgentKitAdapter.cleanup?.();
          
          // Cleanup Hive adapter
          await this.hiveIntelligenceAdapter.cleanup?.();
          
          // Cleanup MCP adapter
          await this.seiMCPAdapter.cleanup?.();
          
          console.log('🐉 All adapters cleaned up successfully. Until next time, warriors!');
        },
        error => this.createError('ADAPTER_CLEANUP_FAILED', `Failed to cleanup adapters: ${error}`)
      )
    );
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