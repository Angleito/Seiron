/**
 * @fileoverview Strategy Matcher
 * Matches user preferences to optimal DeFi strategies
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

import {
  StrategyInfo,
  StrategyCategory,
  StrategyMatchingCriteria,
  RiskLevel,
  OptimizationSuggestion,
  OptimizationType,
  DomainError
} from './types.js';

/**
 * Strategy Match Result
 */
export interface StrategyMatchResult {
  readonly strategy: StrategyInfo;
  readonly score: number;
  readonly reasons: ReadonlyArray<string>;
  readonly adjustments?: ReadonlyArray<StrategyAdjustment>;
}

/**
 * Strategy Adjustment
 */
export interface StrategyAdjustment {
  readonly type: 'amount' | 'duration' | 'protocol' | 'leverage';
  readonly current: any;
  readonly suggested: any;
  readonly reason: string;
  readonly impact: number;
}

/**
 * Strategy Database Entry
 */
interface StrategyDatabaseEntry extends StrategyInfo {
  readonly tags: ReadonlyArray<string>;
  readonly popularity: number;
  readonly successRate: number;
  readonly averageReturn: number;
  readonly requirements: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Strategy Matcher Configuration
 */
export interface StrategyMatcherConfig {
  readonly minMatchScore: number;
  readonly maxResults: number;
  readonly enableDynamicAdjustments: boolean;
  readonly preferPopularStrategies: boolean;
  readonly riskAdjustmentFactor: number;
}

/**
 * Strategy Matcher
 */
export class StrategyMatcher {
  private readonly config: StrategyMatcherConfig;
  private readonly strategyDatabase: Map<string, StrategyDatabaseEntry>;
  private readonly categoryIndex: Map<StrategyCategory, string[]>;

  constructor(config: StrategyMatcherConfig) {
    this.config = config;
    this.strategyDatabase = this.initializeStrategyDatabase();
    this.categoryIndex = this.buildCategoryIndex();
  }

  /**
   * Find matching strategies
   */
  async findMatchingStrategies(
    criteria: StrategyMatchingCriteria
  ): Promise<E.Either<DomainError, ReadonlyArray<StrategyMatchResult>>> {
    try {
      const matches: StrategyMatchResult[] = [];

      // Evaluate each strategy
      for (const strategy of this.strategyDatabase.values()) {
        const matchResult = await this.evaluateStrategy(strategy, criteria);
        
        if (O.isSome(matchResult) && matchResult.value.score >= this.config.minMatchScore) {
          matches.push(matchResult.value);
        }
      }

      // Sort by score and apply limits
      const sortedMatches = matches
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxResults);

      return E.right(sortedMatches);

    } catch (error) {
      return E.left(new DomainError(
        'Failed to find matching strategies',
        'STRATEGY_MATCHING_ERROR',
        { originalError: error, criteria }
      ));
    }
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<O.Option<StrategyInfo>> {
    const strategy = this.strategyDatabase.get(strategyId);
    return strategy ? O.some(strategy) : O.none;
  }

  /**
   * Get strategies by category
   */
  async getStrategiesByCategory(category: StrategyCategory): Promise<ReadonlyArray<StrategyInfo>> {
    const strategyIds = this.categoryIndex.get(category) || [];
    return strategyIds
      .map(id => this.strategyDatabase.get(id))
      .filter((strategy): strategy is StrategyDatabaseEntry => strategy !== undefined)
      .sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(
    currentStrategies: ReadonlyArray<StrategyInfo>,
    criteria: StrategyMatchingCriteria
  ): Promise<ReadonlyArray<OptimizationSuggestion>> {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze current strategies
    const currentPerformance = this.analyzeCurrentStrategies(currentStrategies);

    // Yield increase suggestions
    const yieldSuggestions = await this.generateYieldOptimizationSuggestions(
      currentStrategies,
      criteria
    );
    suggestions.push(...yieldSuggestions);

    // Risk reduction suggestions
    const riskSuggestions = this.generateRiskReductionSuggestions(
      currentStrategies,
      criteria
    );
    suggestions.push(...riskSuggestions);

    // Diversification suggestions
    const diversificationSuggestions = this.generateDiversificationSuggestions(
      currentStrategies,
      criteria
    );
    suggestions.push(...diversificationSuggestions);

    // Gas optimization suggestions
    const gasSuggestions = this.generateGasOptimizationSuggestions(currentStrategies);
    suggestions.push(...gasSuggestions);

    // Sort by estimated impact
    return suggestions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  /**
   * Recommend strategy adjustments
   */
  async recommendStrategyAdjustments(
    strategy: StrategyInfo,
    criteria: StrategyMatchingCriteria
  ): Promise<ReadonlyArray<StrategyAdjustment>> {
    const adjustments: StrategyAdjustment[] = [];

    // Amount adjustments
    if (criteria.amount < strategy.minAmount) {
      adjustments.push({
        type: 'amount',
        current: criteria.amount,
        suggested: strategy.minAmount,
        reason: 'Minimum amount requirement not met',
        impact: 0.8
      });
    } else if (strategy.maxAmount && criteria.amount > strategy.maxAmount) {
      adjustments.push({
        type: 'amount',
        current: criteria.amount,
        suggested: strategy.maxAmount,
        reason: 'Amount exceeds strategy maximum',
        impact: 0.6
      });
    }

    // Risk adjustments
    if (this.getRiskLevelValue(strategy.riskLevel) > this.getRiskLevelValue(criteria.riskTolerance)) {
      const suggestedRisk = this.findAlternativeRiskLevel(strategy, criteria.riskTolerance);
      if (suggestedRisk) {
        adjustments.push({
          type: 'protocol',
          current: strategy.riskLevel,
          suggested: suggestedRisk,
          reason: 'Strategy risk exceeds tolerance',
          impact: 0.9
        });
      }
    }

    // Duration adjustments
    if (criteria.duration && strategy.duration && criteria.duration < strategy.duration) {
      adjustments.push({
        type: 'duration',
        current: criteria.duration,
        suggested: strategy.duration,
        reason: 'Strategy requires longer commitment',
        impact: 0.4
      });
    }

    return adjustments.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get trending strategies
   */
  async getTrendingStrategies(limit: number = 5): Promise<ReadonlyArray<StrategyInfo>> {
    return Array.from(this.strategyDatabase.values())
      .sort((a, b) => {
        // Sort by combination of popularity and recent success rate
        const aScore = a.popularity * 0.6 + a.successRate * 0.4;
        const bScore = b.popularity * 0.6 + b.successRate * 0.4;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Evaluate strategy match
   */
  private async evaluateStrategy(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): Promise<O.Option<StrategyMatchResult>> {
    let score = 0;
    const reasons: string[] = [];

    // Amount compatibility
    const amountScore = this.evaluateAmountCompatibility(strategy, criteria);
    score += amountScore * 0.25;
    if (amountScore > 0.8) {
      reasons.push('Amount fits strategy requirements');
    }

    // Risk compatibility
    const riskScore = this.evaluateRiskCompatibility(strategy, criteria);
    score += riskScore * 0.3;
    if (riskScore > 0.8) {
      reasons.push('Risk level matches your tolerance');
    }

    // Protocol preference
    const protocolScore = this.evaluateProtocolPreference(strategy, criteria);
    score += protocolScore * 0.2;
    if (protocolScore > 0.8) {
      reasons.push('Uses your preferred protocols');
    }

    // APY requirement
    const apyScore = this.evaluateAPYRequirement(strategy, criteria);
    score += apyScore * 0.15;
    if (apyScore > 0.8) {
      reasons.push('Expected APY meets your requirements');
    }

    // Leverage compatibility
    const leverageScore = this.evaluateLeverageCompatibility(strategy, criteria);
    score += leverageScore * 0.1;

    // Apply popularity boost if enabled
    if (this.config.preferPopularStrategies) {
      score *= (1 + strategy.popularity * 0.1);
    }

    // Generate adjustments if needed
    const adjustments = await this.recommendStrategyAdjustments(strategy, criteria);

    if (score >= this.config.minMatchScore) {
      return O.some({
        strategy,
        score,
        reasons,
        adjustments: adjustments.length > 0 ? adjustments : undefined
      });
    }

    return O.none;
  }

  /**
   * Evaluate amount compatibility
   */
  private evaluateAmountCompatibility(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): number {
    if (criteria.amount < strategy.minAmount) return 0;
    if (strategy.maxAmount && criteria.amount > strategy.maxAmount) return 0.5;
    
    // Optimal range scoring
    const optimalMin = strategy.minAmount * 2;
    const optimalMax = strategy.maxAmount ? strategy.maxAmount * 0.8 : strategy.minAmount * 10;
    
    if (criteria.amount >= optimalMin && criteria.amount <= optimalMax) {
      return 1.0;
    }
    
    return 0.8;
  }

  /**
   * Evaluate risk compatibility
   */
  private evaluateRiskCompatibility(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): number {
    const strategyRiskValue = this.getRiskLevelValue(strategy.riskLevel);
    const criteriaRiskValue = this.getRiskLevelValue(criteria.riskTolerance);
    
    if (strategyRiskValue > criteriaRiskValue) {
      return 0; // Strategy too risky
    }
    
    // Perfect match
    if (strategyRiskValue === criteriaRiskValue) {
      return 1.0;
    }
    
    // Strategy is less risky than tolerance (good but not perfect)
    return 0.8;
  }

  /**
   * Evaluate protocol preference
   */
  private evaluateProtocolPreference(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): number {
    const strategyProtocols = new Set(strategy.protocols);
    const preferredProtocols = new Set(criteria.preferredProtocols);
    const excludedProtocols = new Set(criteria.excludedProtocols);
    
    // Check for excluded protocols
    for (const protocol of strategyProtocols) {
      if (excludedProtocols.has(protocol)) {
        return 0;
      }
    }
    
    // Check for preferred protocols
    if (preferredProtocols.size === 0) {
      return 0.7; // Neutral if no preferences
    }
    
    const intersection = new Set([...strategyProtocols].filter(p => preferredProtocols.has(p)));
    const score = intersection.size / preferredProtocols.size;
    
    return Math.min(score, 1.0);
  }

  /**
   * Evaluate APY requirement
   */
  private evaluateAPYRequirement(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): number {
    if (!criteria.minApy) return 0.8; // Neutral if no requirement
    
    if (strategy.expectedApy >= criteria.minApy) {
      // Bonus for exceeding requirements
      const bonus = Math.min((strategy.expectedApy - criteria.minApy) / criteria.minApy, 0.5);
      return Math.min(1.0 + bonus, 1.0);
    }
    
    // Penalty for not meeting requirements
    const deficit = (criteria.minApy - strategy.expectedApy) / criteria.minApy;
    return Math.max(0, 1.0 - deficit);
  }

  /**
   * Evaluate leverage compatibility
   */
  private evaluateLeverageCompatibility(
    strategy: StrategyDatabaseEntry,
    criteria: StrategyMatchingCriteria
  ): number {
    const usesLeverage = strategy.category === StrategyCategory.LEVERAGED_FARMING ||
                        strategy.name.toLowerCase().includes('leverage');
    
    if (usesLeverage && !criteria.allowLeverage) {
      return 0;
    }
    
    return 1.0;
  }

  /**
   * Generate yield optimization suggestions
   */
  private async generateYieldOptimizationSuggestions(
    currentStrategies: ReadonlyArray<StrategyInfo>,
    criteria: StrategyMatchingCriteria
  ): Promise<ReadonlyArray<OptimizationSuggestion>> {
    const suggestions: OptimizationSuggestion[] = [];

    // Find higher yield alternatives
    const higherYieldStrategies = Array.from(this.strategyDatabase.values())
      .filter(strategy => {
        const currentMaxApy = Math.max(...currentStrategies.map(s => s.expectedApy));
        return strategy.expectedApy > currentMaxApy * 1.2; // At least 20% higher
      })
      .sort((a, b) => b.expectedApy - a.expectedApy)
      .slice(0, 3);

    for (const strategy of higherYieldStrategies) {
      const currentMaxApy = Math.max(...currentStrategies.map(s => s.expectedApy));
      const improvement = ((strategy.expectedApy - currentMaxApy) / currentMaxApy) * 100;

      suggestions.push({
        type: OptimizationType.YIELD_INCREASE,
        title: `Switch to ${strategy.name}`,
        description: `Higher yield strategy with ${strategy.expectedApy.toFixed(1)}% APY`,
        potentialBenefit: `+${improvement.toFixed(1)}% yield increase`,
        estimatedImpact: improvement,
        difficulty: this.getStrategyDifficulty(strategy),
        requirements: strategy.requirements,
        steps: [
          'Exit current positions',
          `Allocate funds to ${strategy.name}`,
          'Monitor performance and adjust as needed'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Generate risk reduction suggestions
   */
  private generateRiskReductionSuggestions(
    currentStrategies: ReadonlyArray<StrategyInfo>,
    criteria: StrategyMatchingCriteria
  ): ReadonlyArray<OptimizationSuggestion> {
    const suggestions: OptimizationSuggestion[] = [];

    // Check if current strategies are too risky
    const highRiskStrategies = currentStrategies.filter(s => 
      this.getRiskLevelValue(s.riskLevel) > this.getRiskLevelValue(criteria.riskTolerance)
    );

    if (highRiskStrategies.length > 0) {
      suggestions.push({
        type: OptimizationType.RISK_REDUCTION,
        title: 'Reduce Position Risk',
        description: 'Some positions exceed your risk tolerance',
        potentialBenefit: 'Improved portfolio stability',
        estimatedImpact: 15,
        difficulty: 'easy',
        requirements: ['Review current positions'],
        steps: [
          'Identify high-risk positions',
          'Reduce position sizes or exit entirely',
          'Reallocate to lower-risk strategies'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Generate diversification suggestions
   */
  private generateDiversificationSuggestions(
    currentStrategies: ReadonlyArray<StrategyInfo>,
    criteria: StrategyMatchingCriteria
  ): ReadonlyArray<OptimizationSuggestion> {
    const suggestions: OptimizationSuggestion[] = [];

    // Check protocol concentration
    const protocolCounts = new Map<string, number>();
    currentStrategies.forEach(strategy => {
      strategy.protocols.forEach(protocol => {
        protocolCounts.set(protocol, (protocolCounts.get(protocol) || 0) + 1);
      });
    });

    const maxProtocolCount = Math.max(...protocolCounts.values());
    const totalStrategies = currentStrategies.length;

    if (maxProtocolCount / totalStrategies > 0.6) { // More than 60% in one protocol
      suggestions.push({
        type: OptimizationType.DIVERSIFICATION,
        title: 'Diversify Protocol Exposure',
        description: 'High concentration in single protocol detected',
        potentialBenefit: 'Reduced protocol risk',
        estimatedImpact: 20,
        difficulty: 'medium',
        requirements: ['Identify alternative protocols'],
        steps: [
          'Review current protocol allocation',
          'Research alternative protocols',
          'Gradually migrate some positions'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Generate gas optimization suggestions
   */
  private generateGasOptimizationSuggestions(
    currentStrategies: ReadonlyArray<StrategyInfo>
  ): ReadonlyArray<OptimizationSuggestion> {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for gas-intensive strategies
    const gasIntensiveStrategies = currentStrategies.filter(strategy =>
      strategy.steps.some(step => step.estimatedGas > 500000)
    );

    if (gasIntensiveStrategies.length > 0) {
      suggestions.push({
        type: OptimizationType.GAS_OPTIMIZATION,
        title: 'Optimize Gas Usage',
        description: 'Some strategies have high gas costs',
        potentialBenefit: 'Reduced transaction fees',
        estimatedImpact: 10,
        difficulty: 'easy',
        requirements: ['Review transaction timing'],
        steps: [
          'Batch transactions when possible',
          'Time transactions for lower gas periods',
          'Consider gas-efficient alternatives'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Analyze current strategies
   */
  private analyzeCurrentStrategies(strategies: ReadonlyArray<StrategyInfo>): {
    averageApy: number;
    averageRisk: number;
    protocolDiversity: number;
    categoryDiversity: number;
  } {
    if (strategies.length === 0) {
      return { averageApy: 0, averageRisk: 0, protocolDiversity: 0, categoryDiversity: 0 };
    }

    const averageApy = strategies.reduce((sum, s) => sum + s.expectedApy, 0) / strategies.length;
    
    const averageRisk = strategies.reduce((sum, s) => 
      sum + this.getRiskLevelValue(s.riskLevel), 0
    ) / strategies.length;

    const uniqueProtocols = new Set(strategies.flatMap(s => s.protocols)).size;
    const protocolDiversity = uniqueProtocols / strategies.length;

    const uniqueCategories = new Set(strategies.map(s => s.category)).size;
    const categoryDiversity = uniqueCategories / strategies.length;

    return {
      averageApy,
      averageRisk,
      protocolDiversity,
      categoryDiversity
    };
  }

  /**
   * Get risk level numeric value
   */
  private getRiskLevelValue(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW: return 1;
      case RiskLevel.LOW: return 2;
      case RiskLevel.MEDIUM: return 3;
      case RiskLevel.HIGH: return 4;
      case RiskLevel.VERY_HIGH: return 5;
      default: return 3;
    }
  }

  /**
   * Find alternative risk level
   */
  private findAlternativeRiskLevel(
    strategy: StrategyInfo,
    targetRisk: RiskLevel
  ): RiskLevel | null {
    // Find similar strategies with lower risk
    const alternatives = Array.from(this.strategyDatabase.values())
      .filter(s => 
        s.category === strategy.category &&
        this.getRiskLevelValue(s.riskLevel) <= this.getRiskLevelValue(targetRisk)
      );

    if (alternatives.length > 0) {
      return alternatives[0].riskLevel;
    }

    return null;
  }

  /**
   * Get strategy difficulty
   */
  private getStrategyDifficulty(strategy: StrategyDatabaseEntry): 'easy' | 'medium' | 'hard' {
    if (strategy.steps.length <= 2) return 'easy';
    if (strategy.steps.length <= 4) return 'medium';
    return 'hard';
  }

  /**
   * Build category index
   */
  private buildCategoryIndex(): Map<StrategyCategory, string[]> {
    const index = new Map<StrategyCategory, string[]>();

    for (const [id, strategy] of this.strategyDatabase) {
      if (!index.has(strategy.category)) {
        index.set(strategy.category, []);
      }
      index.get(strategy.category)!.push(id);
    }

    return index;
  }

  /**
   * Initialize strategy database
   */
  private initializeStrategyDatabase(): Map<string, StrategyDatabaseEntry> {
    const database = new Map<string, StrategyDatabaseEntry>();

    const strategies: StrategyDatabaseEntry[] = [
      {
        id: 'usdc-lending-silo',
        name: 'USDC Lending on Silo',
        description: 'Conservative lending strategy for stable returns',
        category: StrategyCategory.LENDING,
        riskLevel: RiskLevel.LOW,
        expectedApy: 5.2,
        minAmount: 100,
        maxAmount: 1000000,
        protocols: ['silo'],
        steps: [
          {
            id: 'supply-usdc',
            description: 'Supply USDC to Silo lending pool',
            protocol: 'silo',
            action: 'supply',
            estimatedGas: 150000,
            required: true
          }
        ],
        advantages: ['Low risk', 'Stable returns', 'High liquidity'],
        disadvantages: ['Lower APY than risky strategies'],
        tags: ['stable', 'conservative', 'lending'],
        popularity: 85,
        successRate: 0.95,
        averageReturn: 5.2,
        requirements: ['USDC balance'],
        warnings: []
      },
      {
        id: 'sei-usdc-lp-dragonswap',
        name: 'SEI/USDC LP on DragonSwap',
        description: 'Provide liquidity to SEI/USDC pair for trading fees',
        category: StrategyCategory.YIELD_FARMING,
        riskLevel: RiskLevel.MEDIUM,
        expectedApy: 12.5,
        minAmount: 500,
        maxAmount: 500000,
        protocols: ['dragonswap'],
        steps: [
          {
            id: 'approve-tokens',
            description: 'Approve SEI and USDC for trading',
            protocol: 'dragonswap',
            action: 'approve',
            estimatedGas: 100000,
            required: true
          },
          {
            id: 'add-liquidity',
            description: 'Add liquidity to SEI/USDC pool',
            protocol: 'dragonswap',
            action: 'addLiquidity',
            estimatedGas: 200000,
            required: true
          }
        ],
        advantages: ['Good APY', 'Trading fee income', 'Popular pair'],
        disadvantages: ['Impermanent loss risk', 'Price volatility'],
        tags: ['liquidity', 'trading-fees', 'medium-risk'],
        popularity: 75,
        successRate: 0.85,
        averageReturn: 12.5,
        requirements: ['SEI and USDC balance', 'Impermanent loss understanding'],
        warnings: ['Subject to impermanent loss']
      },
      {
        id: 'leveraged-sei-farming',
        name: 'Leveraged SEI Yield Farming',
        description: 'Use leverage to amplify SEI farming returns',
        category: StrategyCategory.LEVERAGED_FARMING,
        riskLevel: RiskLevel.HIGH,
        expectedApy: 25.8,
        minAmount: 1000,
        maxAmount: 100000,
        duration: 2592000, // 30 days
        protocols: ['takara', 'dragonswap'],
        steps: [
          {
            id: 'supply-collateral',
            description: 'Supply SEI as collateral',
            protocol: 'takara',
            action: 'supply',
            estimatedGas: 180000,
            required: true
          },
          {
            id: 'borrow-usdc',
            description: 'Borrow USDC against SEI collateral',
            protocol: 'takara',
            action: 'borrow',
            estimatedGas: 220000,
            required: true
          },
          {
            id: 'farm-with-borrowed',
            description: 'Use borrowed USDC for yield farming',
            protocol: 'dragonswap',
            action: 'farm',
            estimatedGas: 250000,
            required: true
          }
        ],
        advantages: ['High potential returns', 'Leverage amplification'],
        disadvantages: ['High risk', 'Liquidation risk', 'Complex management'],
        tags: ['leverage', 'high-risk', 'advanced'],
        popularity: 45,
        successRate: 0.65,
        averageReturn: 25.8,
        requirements: ['SEI collateral', 'Risk management skills', 'Active monitoring'],
        warnings: ['High liquidation risk', 'Requires active management']
      },
      {
        id: 'arbitrage-cross-dex',
        name: 'Cross-DEX Arbitrage',
        description: 'Profit from price differences across DEXes',
        category: StrategyCategory.ARBITRAGE,
        riskLevel: RiskLevel.HIGH,
        expectedApy: 35.0,
        minAmount: 5000,
        protocols: ['dragonswap', 'symphony'],
        steps: [
          {
            id: 'scan-opportunities',
            description: 'Scan for arbitrage opportunities',
            protocol: 'scanner',
            action: 'scan',
            estimatedGas: 0,
            required: true
          },
          {
            id: 'execute-arbitrage',
            description: 'Execute arbitrage trades',
            protocol: 'multiple',
            action: 'arbitrage',
            estimatedGas: 400000,
            required: true
          }
        ],
        advantages: ['High returns', 'Market neutral', 'Fast execution'],
        disadvantages: ['Technical complexity', 'MEV competition', 'Gas sensitivity'],
        tags: ['arbitrage', 'advanced', 'technical'],
        popularity: 25,
        successRate: 0.70,
        averageReturn: 35.0,
        requirements: ['Technical knowledge', 'Fast execution capability', 'MEV protection'],
        warnings: ['Requires technical expertise', 'Competition from MEV bots']
      },
      {
        id: 'stable-yield-diversified',
        name: 'Diversified Stable Yield',
        description: 'Spread stablecoins across multiple protocols',
        category: StrategyCategory.YIELD_FARMING,
        riskLevel: RiskLevel.LOW,
        expectedApy: 7.8,
        minAmount: 1000,
        protocols: ['silo', 'takara'],
        steps: [
          {
            id: 'split-allocation',
            description: 'Split funds between protocols',
            protocol: 'multiple',
            action: 'allocate',
            estimatedGas: 300000,
            required: true
          },
          {
            id: 'monitor-rates',
            description: 'Monitor and rebalance rates',
            protocol: 'multiple',
            action: 'rebalance',
            estimatedGas: 200000,
            required: false
          }
        ],
        advantages: ['Risk diversification', 'Stable returns', 'Protocol risk mitigation'],
        disadvantages: ['Higher gas costs', 'Management overhead'],
        tags: ['diversified', 'stable', 'conservative'],
        popularity: 60,
        successRate: 0.92,
        averageReturn: 7.8,
        requirements: ['Multiple stablecoins', 'Rebalancing strategy'],
        warnings: []
      }
    ];

    strategies.forEach(strategy => {
      database.set(strategy.id, strategy);
    });

    return database;
  }
}