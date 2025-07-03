/**
 * @fileoverview Context Analysis System
 * Analyzes conversation context to improve intent recognition and entity extraction
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { 
  ConversationContext,
  FinancialEntity,
  DefiIntent,
  PositionInfo,
  ConversationTurn,
  NLPConfig,
  NLPError
} from './types.js';

/**
 * Context Analysis Result
 */
export interface ContextAnalysis {
  readonly userProfile: UserProfile;
  readonly portfolioState: PortfolioState;
  readonly conversationState: ConversationState;
  readonly riskProfile: RiskProfile;
  readonly recommendations: ReadonlyArray<ContextualRecommendation>;
}

/**
 * User Profile Analysis
 */
export interface UserProfile {
  readonly experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  readonly preferredProtocols: ReadonlyArray<string>;
  readonly averageTransactionSize: number;
  readonly mostUsedIntents: ReadonlyArray<DefiIntent>;
  readonly tradingPatterns: ReadonlyArray<TradingPattern>;
}

/**
 * Portfolio State Analysis
 */
export interface PortfolioState {
  readonly totalValue: number;
  readonly positionDistribution: ReadonlyRecord<string, number>;
  readonly riskExposure: number;
  readonly liquidityRatio: number;
  readonly yieldGenerating: boolean;
  readonly healthFactors: ReadonlyArray<number>;
  readonly diversificationScore: number;
}

/**
 * Conversation State Analysis
 */
export interface ConversationState {
  readonly currentTopic: string;
  readonly intentSequence: ReadonlyArray<DefiIntent>;
  readonly pendingActions: ReadonlyArray<PendingAction>;
  readonly contextCarryover: ReadonlyRecord<string, any>;
  readonly conversationFlow: ConversationFlow;
}

/**
 * Risk Profile Analysis
 */
export interface RiskProfile {
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly riskCapacity: number;
  readonly currentRiskLevel: number;
  readonly riskFactors: ReadonlyArray<RiskFactor>;
  readonly suggestedActions: ReadonlyArray<string>;
}

/**
 * Trading Pattern
 */
export interface TradingPattern {
  readonly pattern: string;
  readonly frequency: number;
  readonly successRate: number;
  readonly averageSize: number;
}

/**
 * Pending Action
 */
export interface PendingAction {
  readonly intent: DefiIntent;
  readonly parameters: ReadonlyRecord<string, any>;
  readonly timestamp: number;
  readonly reason: string;
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly description: string;
  readonly impact: number;
}

/**
 * Contextual Recommendation
 */
export interface ContextualRecommendation {
  readonly type: 'optimization' | 'risk_reduction' | 'opportunity' | 'education';
  readonly priority: 'low' | 'medium' | 'high';
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly expectedBenefit: string;
}

/**
 * Conversation Flow
 */
export interface ConversationFlow {
  readonly stage: 'exploration' | 'decision' | 'execution' | 'confirmation';
  readonly completionPercentage: number;
  readonly nextExpectedIntent: DefiIntent | null;
  readonly requiredInformation: ReadonlyArray<string>;
}

/**
 * Context Analyzer
 */
export class ContextAnalyzer {
  private readonly config: NLPConfig;

  constructor(config: NLPConfig) {
    this.config = config;
  }

  /**
   * Analyze conversation context
   */
  async analyzeContext(
    context: ConversationContext,
    currentEntities: ReadonlyArray<FinancialEntity>
  ): Promise<O.Option<ContextAnalysis>> {
    try {
      const userProfile = this.analyzeUserProfile(context);
      const portfolioState = this.analyzePortfolioState(context);
      const conversationState = this.analyzeConversationState(context, currentEntities);
      const riskProfile = this.analyzeRiskProfile(context, portfolioState);
      const recommendations = this.generateRecommendations(
        userProfile,
        portfolioState,
        conversationState,
        riskProfile
      );

      return O.some({
        userProfile,
        portfolioState,
        conversationState,
        riskProfile,
        recommendations
      });

    } catch (error) {
      return O.none;
    }
  }

  /**
   * Analyze user profile
   */
  private analyzeUserProfile(context: ConversationContext): UserProfile {
    const history = context.conversationHistory;
    const positions = context.activePositions;

    // Determine experience level
    const experienceLevel = this.determineExperienceLevel(history, positions);

    // Extract preferred protocols
    const preferredProtocols = this.extractPreferredProtocols(history, positions);

    // Calculate average transaction size
    const averageTransactionSize = this.calculateAverageTransactionSize(history);

    // Identify most used intents
    const mostUsedIntents = this.getMostUsedIntents(history);

    // Analyze trading patterns
    const tradingPatterns = this.analyzeTradingPatterns(history);

    return {
      experienceLevel,
      preferredProtocols,
      averageTransactionSize,
      mostUsedIntents,
      tradingPatterns
    };
  }

  /**
   * Analyze portfolio state
   */
  private analyzePortfolioState(context: ConversationContext): PortfolioState {
    const positions = context.activePositions;
    const totalValue = context.portfolioValue || 0;

    // Calculate position distribution
    const positionDistribution = this.calculatePositionDistribution(positions);

    // Calculate risk exposure
    const riskExposure = this.calculateRiskExposure(positions);

    // Calculate liquidity ratio
    const liquidityRatio = this.calculateLiquidityRatio(positions);

    // Check if portfolio is yield generating
    const yieldGenerating = positions.some(p => p.apy && p.apy > 0);

    // Extract health factors
    const healthFactors = positions
      .filter(p => p.healthFactor)
      .map(p => p.healthFactor!);

    // Calculate diversification score
    const diversificationScore = this.calculateDiversificationScore(positions);

    return {
      totalValue,
      positionDistribution,
      riskExposure,
      liquidityRatio,
      yieldGenerating,
      healthFactors,
      diversificationScore
    };
  }

  /**
   * Analyze conversation state
   */
  private analyzeConversationState(
    context: ConversationContext,
    currentEntities: ReadonlyArray<FinancialEntity>
  ): ConversationState {
    const history = context.conversationHistory;

    // Determine current topic
    const currentTopic = this.determineCurrentTopic(history, currentEntities);

    // Extract intent sequence
    const intentSequence = history.slice(-5).map(turn => turn.intent);

    // Identify pending actions
    const pendingActions = this.identifyPendingActions(history);

    // Extract context carryover
    const contextCarryover = this.extractContextCarryover(history);

    // Analyze conversation flow
    const conversationFlow = this.analyzeConversationFlow(history, currentEntities);

    return {
      currentTopic,
      intentSequence,
      pendingActions,
      contextCarryover,
      conversationFlow
    };
  }

  /**
   * Analyze risk profile
   */
  private analyzeRiskProfile(
    context: ConversationContext,
    portfolioState: PortfolioState
  ): RiskProfile {
    const riskTolerance = context.riskTolerance;
    const riskCapacity = this.calculateRiskCapacity(context, portfolioState);
    const currentRiskLevel = portfolioState.riskExposure;
    const riskFactors = this.identifyRiskFactors(context, portfolioState);
    const suggestedActions = this.generateRiskSuggestions(
      riskTolerance,
      currentRiskLevel,
      riskFactors
    );

    return {
      riskTolerance,
      riskCapacity,
      currentRiskLevel,
      riskFactors,
      suggestedActions
    };
  }

  /**
   * Generate contextual recommendations
   */
  private generateRecommendations(
    userProfile: UserProfile,
    portfolioState: PortfolioState,
    conversationState: ConversationState,
    riskProfile: RiskProfile
  ): ReadonlyArray<ContextualRecommendation> {
    const recommendations: ContextualRecommendation[] = [];

    // Yield optimization recommendations
    if (!portfolioState.yieldGenerating && portfolioState.totalValue > 1000) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'Yield Optimization Opportunity',
        description: 'You have idle funds that could be generating yield',
        action: 'Consider lending your assets to earn interest',
        expectedBenefit: 'Potential 5-15% APY on idle funds'
      });
    }

    // Risk reduction recommendations
    if (riskProfile.currentRiskLevel > riskProfile.riskCapacity) {
      recommendations.push({
        type: 'risk_reduction',
        priority: 'high',
        title: 'Risk Exposure Too High',
        description: 'Your current risk level exceeds your capacity',
        action: 'Consider reducing leverage or diversifying positions',
        expectedBenefit: 'Improved portfolio stability'
      });
    }

    // Diversification recommendations
    if (portfolioState.diversificationScore < 0.5) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Improve Diversification',
        description: 'Your portfolio is concentrated in few assets',
        action: 'Consider adding different asset classes or protocols',
        expectedBenefit: 'Reduced correlation risk'
      });
    }

    // Education recommendations for beginners
    if (userProfile.experienceLevel === 'beginner') {
      recommendations.push({
        type: 'education',
        priority: 'medium',
        title: 'Learn About DeFi Risks',
        description: 'Understanding risks is crucial for DeFi success',
        action: 'Start with small amounts and conservative strategies',
        expectedBenefit: 'Better risk management and decision making'
      });
    }

    return recommendations;
  }

  /**
   * Determine user experience level
   */
  private determineExperienceLevel(
    history: ReadonlyArray<ConversationTurn>,
    positions: ReadonlyArray<PositionInfo>
  ): 'beginner' | 'intermediate' | 'advanced' {
    const totalInteractions = history.length;
    const uniqueIntents = new Set(history.map(turn => turn.intent)).size;
    const complexPositions = positions.filter(p => p.type === 'trading' || p.value > 10000).length;

    if (totalInteractions > 100 && uniqueIntents > 8 && complexPositions > 3) {
      return 'advanced';
    } else if (totalInteractions > 20 && uniqueIntents > 4 && complexPositions > 1) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Extract preferred protocols
   */
  private extractPreferredProtocols(
    history: ReadonlyArray<ConversationTurn>,
    positions: ReadonlyArray<PositionInfo>
  ): ReadonlyArray<string> {
    const protocolCounts = new Map<string, number>();

    // Count from positions
    positions.forEach(position => {
      const count = protocolCounts.get(position.protocol) || 0;
      protocolCounts.set(position.protocol, count + 1);
    });

    // Count from conversation history (simplified)
    history.forEach(turn => {
      const protocols = ['dragonswap', 'symphony', 'citrex', 'silo'];
      protocols.forEach(protocol => {
        if (turn.userMessage.toLowerCase().includes(protocol)) {
          const count = protocolCounts.get(protocol) || 0;
          protocolCounts.set(protocol, count + 1);
        }
      });
    });

    // Return top 3 protocols
    return Array.from(protocolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([protocol]) => protocol);
  }

  /**
   * Calculate average transaction size
   */
  private calculateAverageTransactionSize(
    history: ReadonlyArray<ConversationTurn>
  ): number {
    const transactionTurns = history.filter(turn => 
      [DefiIntent.LEND, DefiIntent.BORROW, DefiIntent.SWAP].includes(turn.intent)
    );

    if (transactionTurns.length === 0) return 0;

    // This is a simplified calculation - in practice, you'd extract amounts from messages
    const totalValue = transactionTurns.length * 1000; // Placeholder
    return totalValue / transactionTurns.length;
  }

  /**
   * Get most used intents
   */
  private getMostUsedIntents(
    history: ReadonlyArray<ConversationTurn>
  ): ReadonlyArray<DefiIntent> {
    const intentCounts = new Map<DefiIntent, number>();

    history.forEach(turn => {
      const count = intentCounts.get(turn.intent) || 0;
      intentCounts.set(turn.intent, count + 1);
    });

    return Array.from(intentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent]) => intent);
  }

  /**
   * Analyze trading patterns
   */
  private analyzeTradingPatterns(
    history: ReadonlyArray<ConversationTurn>
  ): ReadonlyArray<TradingPattern> {
    // Simplified pattern analysis
    const patterns: TradingPattern[] = [];

    const tradingTurns = history.filter(turn => 
      [DefiIntent.SWAP, DefiIntent.OPEN_POSITION, DefiIntent.CLOSE_POSITION].includes(turn.intent)
    );

    if (tradingTurns.length > 5) {
      patterns.push({
        pattern: 'frequent_trader',
        frequency: tradingTurns.length / (history.length || 1),
        successRate: 0.8, // Placeholder
        averageSize: 1000 // Placeholder
      });
    }

    return patterns;
  }

  /**
   * Calculate position distribution
   */
  private calculatePositionDistribution(
    positions: ReadonlyArray<PositionInfo>
  ): ReadonlyRecord<string, number> {
    const distribution: Record<string, number> = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    if (totalValue === 0) return distribution;

    positions.forEach(position => {
      const percentage = position.value / totalValue;
      distribution[position.protocol] = (distribution[position.protocol] || 0) + percentage;
    });

    return distribution;
  }

  /**
   * Calculate risk exposure
   */
  private calculateRiskExposure(positions: ReadonlyArray<PositionInfo>): number {
    let riskScore = 0;
    let totalValue = 0;

    positions.forEach(position => {
      let positionRisk = 0;
      
      // Base risk by position type
      switch (position.type) {
        case 'lending':
          positionRisk = 0.2;
          break;
        case 'borrowing':
          positionRisk = 0.6;
          break;
        case 'liquidity':
          positionRisk = 0.4;
          break;
        case 'trading':
          positionRisk = 0.8;
          break;
      }

      // Adjust for health factor
      if (position.healthFactor && position.healthFactor < 1.5) {
        positionRisk *= 1.5;
      }

      riskScore += positionRisk * position.value;
      totalValue += position.value;
    });

    return totalValue > 0 ? riskScore / totalValue : 0;
  }

  /**
   * Calculate liquidity ratio
   */
  private calculateLiquidityRatio(positions: ReadonlyArray<PositionInfo>): number {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const liquidValue = positions
      .filter(pos => pos.type === 'lending' || pos.type === 'liquidity')
      .reduce((sum, pos) => sum + pos.value, 0);

    return totalValue > 0 ? liquidValue / totalValue : 0;
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(positions: ReadonlyArray<PositionInfo>): number {
    const tokenCount = new Set(positions.map(p => p.token)).size;
    const protocolCount = new Set(positions.map(p => p.protocol)).size;
    const typeCount = new Set(positions.map(p => p.type)).size;

    // Simple diversification score
    return Math.min((tokenCount + protocolCount + typeCount) / 10, 1);
  }

  /**
   * Determine current topic
   */
  private determineCurrentTopic(
    history: ReadonlyArray<ConversationTurn>,
    currentEntities: ReadonlyArray<FinancialEntity>
  ): string {
    const recentTurns = history.slice(-3);
    const recentIntents = recentTurns.map(turn => turn.intent);

    // Analyze intent patterns
    if (recentIntents.every(intent => 
      [DefiIntent.LEND, DefiIntent.BORROW, DefiIntent.REPAY].includes(intent)
    )) {
      return 'lending';
    }

    if (recentIntents.some(intent => intent === DefiIntent.SWAP)) {
      return 'trading';
    }

    if (recentIntents.some(intent => 
      [DefiIntent.ADD_LIQUIDITY, DefiIntent.REMOVE_LIQUIDITY].includes(intent)
    )) {
      return 'liquidity';
    }

    return 'general';
  }

  /**
   * Identify pending actions
   */
  private identifyPendingActions(
    history: ReadonlyArray<ConversationTurn>
  ): ReadonlyArray<PendingAction> {
    // Look for unsuccessful recent actions
    return history
      .slice(-10)
      .filter(turn => !turn.successful)
      .map(turn => ({
        intent: turn.intent,
        parameters: {}, // Would extract from message
        timestamp: turn.timestamp,
        reason: 'Previous attempt failed'
      }));
  }

  /**
   * Extract context carryover
   */
  private extractContextCarryover(
    history: ReadonlyArray<ConversationTurn>
  ): ReadonlyRecord<string, any> {
    const carryover: Record<string, any> = {};
    const recentTurns = history.slice(-5);

    // Extract mentioned tokens, amounts, protocols
    recentTurns.forEach(turn => {
      const message = turn.userMessage.toLowerCase();
      
      // Extract tokens
      const tokens = message.match(/\b(usdc|usdt|sei|eth|btc|atom)\b/g);
      if (tokens) {
        carryover.recentTokens = [...(carryover.recentTokens || []), ...tokens];
      }

      // Extract protocols
      const protocols = message.match(/\b(dragonswap|symphony|citrex|silo)\b/g);
      if (protocols) {
        carryover.recentProtocols = [...(carryover.recentProtocols || []), ...protocols];
      }
    });

    return carryover;
  }

  /**
   * Analyze conversation flow
   */
  private analyzeConversationFlow(
    history: ReadonlyArray<ConversationTurn>,
    currentEntities: ReadonlyArray<FinancialEntity>
  ): ConversationFlow {
    const recentTurns = history.slice(-5);
    const intentSequence = recentTurns.map(turn => turn.intent);

    // Determine stage
    let stage: ConversationFlow['stage'] = 'exploration';
    
    if (intentSequence.includes(DefiIntent.PORTFOLIO_STATUS)) {
      stage = 'exploration';
    } else if (currentEntities.length > 2) {
      stage = 'decision';
    } else if (intentSequence.some(intent => 
      [DefiIntent.LEND, DefiIntent.BORROW, DefiIntent.SWAP].includes(intent)
    )) {
      stage = 'execution';
    }

    // Calculate completion percentage
    const completionPercentage = Math.min(recentTurns.length / 5, 1);

    // Predict next expected intent
    const nextExpectedIntent = this.predictNextIntent(intentSequence);

    // Identify required information
    const requiredInformation = this.identifyRequiredInformation(currentEntities);

    return {
      stage,
      completionPercentage,
      nextExpectedIntent,
      requiredInformation
    };
  }

  /**
   * Predict next intent
   */
  private predictNextIntent(intentSequence: ReadonlyArray<DefiIntent>): DefiIntent | null {
    if (intentSequence.length === 0) return null;

    const lastIntent = intentSequence[intentSequence.length - 1];

    // Simple prediction rules
    switch (lastIntent) {
      case DefiIntent.PORTFOLIO_STATUS:
        return DefiIntent.YIELD_OPTIMIZATION;
      case DefiIntent.SHOW_RATES:
        return DefiIntent.LEND;
      case DefiIntent.LEND:
        return DefiIntent.PORTFOLIO_STATUS;
      default:
        return null;
    }
  }

  /**
   * Identify required information
   */
  private identifyRequiredInformation(
    currentEntities: ReadonlyArray<FinancialEntity>
  ): ReadonlyArray<string> {
    const required: string[] = [];
    const entityTypes = new Set(currentEntities.map(e => e.type));

    if (!entityTypes.has('amount')) {
      required.push('amount');
    }

    if (!entityTypes.has('token')) {
      required.push('token');
    }

    return required;
  }

  /**
   * Calculate risk capacity
   */
  private calculateRiskCapacity(
    context: ConversationContext,
    portfolioState: PortfolioState
  ): number {
    const baseCapacity = context.riskTolerance === 'high' ? 0.8 : 
                        context.riskTolerance === 'medium' ? 0.5 : 0.2;
    
    // Adjust based on portfolio size
    const sizeMultiplier = portfolioState.totalValue > 100000 ? 1.2 : 
                          portfolioState.totalValue > 10000 ? 1.0 : 0.8;

    return baseCapacity * sizeMultiplier;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    context: ConversationContext,
    portfolioState: PortfolioState
  ): ReadonlyArray<RiskFactor> {
    const factors: RiskFactor[] = [];

    // Low health factor
    if (portfolioState.healthFactors.some(hf => hf < 1.5)) {
      factors.push({
        type: 'health_factor',
        severity: 'high',
        description: 'Some positions have low health factors',
        impact: 0.8
      });
    }

    // High concentration
    if (portfolioState.diversificationScore < 0.3) {
      factors.push({
        type: 'concentration',
        severity: 'medium',
        description: 'Portfolio lacks diversification',
        impact: 0.6
      });
    }

    // High leverage
    if (portfolioState.riskExposure > 0.7) {
      factors.push({
        type: 'leverage',
        severity: 'high',
        description: 'High leverage exposure',
        impact: 0.9
      });
    }

    return factors;
  }

  /**
   * Generate risk suggestions
   */
  private generateRiskSuggestions(
    riskTolerance: string,
    currentRiskLevel: number,
    riskFactors: ReadonlyArray<RiskFactor>
  ): ReadonlyArray<string> {
    const suggestions: string[] = [];

    if (currentRiskLevel > 0.7) {
      suggestions.push('Consider reducing position sizes');
    }

    if (riskFactors.some(f => f.type === 'health_factor')) {
      suggestions.push('Add collateral to improve health factors');
    }

    if (riskFactors.some(f => f.type === 'concentration')) {
      suggestions.push('Diversify across more assets and protocols');
    }

    return suggestions;
  }
}