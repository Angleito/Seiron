/**
 * @fileoverview Risk Profiler
 * Interprets risk preferences and assesses user risk profiles
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

import {
  RiskProfile,
  RiskLevel,
  RiskAssessment,
  RiskFactor,
  RiskFactorType,
  TimeHorizon,
  ExperienceLevel,
  RiskPreferences,
  RiskAnalysisError
} from './types.js';

/**
 * Risk Assessment Input
 */
export interface RiskAssessmentInput {
  readonly amount: number;
  readonly protocol: string;
  readonly operation: string;
  readonly leverage?: number;
  readonly timeframe?: string;
  readonly userProfile?: RiskProfile;
  readonly marketConditions?: any;
  readonly positionSize?: number;
  readonly portfolioValue?: number;
}

/**
 * Risk Profiler Configuration
 */
export interface RiskProfilerConfig {
  readonly conservativeThreshold: number;
  readonly moderateThreshold: number;
  readonly aggressiveThreshold: number;
  readonly enableDynamicScoring: boolean;
  readonly marketVolatilityWeight: number;
}

/**
 * Risk Profiler
 */
export class RiskProfiler {
  private readonly config: RiskProfilerConfig;
  private readonly protocolRiskMappings: Map<string, RiskLevel>;
  private readonly operationRiskMappings: Map<string, RiskLevel>;

  constructor(config: RiskProfilerConfig) {
    this.config = config;
    this.protocolRiskMappings = this.initializeProtocolRiskMappings();
    this.operationRiskMappings = this.initializeOperationRiskMappings();
  }

  /**
   * Assess risk for a given operation
   */
  async assessRisk(input: RiskAssessmentInput): Promise<E.Either<RiskAnalysisError, RiskAssessment>> {
    try {
      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(input);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(riskFactors, input);

      // Determine overall risk level
      const overallRisk = this.determineRiskLevel(riskScore);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskFactors, input);

      // Generate warnings
      const warnings = this.generateWarnings(riskFactors, input);

      return E.right({
        overall: overallRisk,
        factors: riskFactors,
        score: riskScore,
        recommendations,
        warnings
      });

    } catch (error) {
      return E.left(new RiskAnalysisError(
        'Failed to assess risk',
        { originalError: error, input }
      ));
    }
  }

  /**
   * Interpret risk tolerance from natural language
   */
  async interpretRiskTolerance(input: string): Promise<E.Either<RiskAnalysisError, RiskLevel>> {
    try {
      const normalizedInput = input.toLowerCase().trim();

      // Direct risk level keywords
      const directMappings: Record<string, RiskLevel> = {
        'very low': RiskLevel.VERY_LOW,
        'very conservative': RiskLevel.VERY_LOW,
        'extremely conservative': RiskLevel.VERY_LOW,
        'low': RiskLevel.LOW,
        'conservative': RiskLevel.LOW,
        'safe': RiskLevel.LOW,
        'medium': RiskLevel.MEDIUM,
        'moderate': RiskLevel.MEDIUM,
        'balanced': RiskLevel.MEDIUM,
        'high': RiskLevel.HIGH,
        'aggressive': RiskLevel.HIGH,
        'risky': RiskLevel.HIGH,
        'very high': RiskLevel.VERY_HIGH,
        'very aggressive': RiskLevel.VERY_HIGH,
        'extremely aggressive': RiskLevel.VERY_HIGH
      };

      // Check for direct matches
      for (const [keyword, riskLevel] of Object.entries(directMappings)) {
        if (normalizedInput.includes(keyword)) {
          return E.right(riskLevel);
        }
      }

      // Contextual interpretation
      const contextualRisk = this.interpretContextualRisk(normalizedInput);
      if (O.isSome(contextualRisk)) {
        return E.right(contextualRisk.value);
      }

      return E.left(new RiskAnalysisError(
        `Could not interpret risk tolerance: ${input}`,
        { input: normalizedInput }
      ));

    } catch (error) {
      return E.left(new RiskAnalysisError(
        'Error interpreting risk tolerance',
        { originalError: error, input }
      ));
    }
  }

  /**
   * Create risk profile from user responses
   */
  async createRiskProfile(responses: {
    riskTolerance?: string;
    experience?: string;
    timeHorizon?: string;
    portfolioSize?: number;
    lossComfort?: string;
    leverageComfort?: string;
  }): Promise<E.Either<RiskAnalysisError, RiskProfile>> {
    try {
      // Interpret risk tolerance
      const toleranceResult = responses.riskTolerance 
        ? await this.interpretRiskTolerance(responses.riskTolerance)
        : E.right(RiskLevel.MEDIUM);

      if (E.isLeft(toleranceResult)) {
        return E.left(toleranceResult.left);
      }

      // Interpret experience level
      const experience = this.interpretExperience(responses.experience || '');

      // Interpret time horizon
      const timeHorizon = this.interpretTimeHorizon(responses.timeHorizon || '');

      // Calculate risk capacity
      const capacity = this.calculateRiskCapacity(responses.portfolioSize || 0, experience);

      // Create risk preferences
      const preferences = this.createRiskPreferences(responses);

      return E.right({
        tolerance: toleranceResult.right,
        capacity,
        timeHorizon,
        experience,
        preferences
      });

    } catch (error) {
      return E.left(new RiskAnalysisError(
        'Failed to create risk profile',
        { originalError: error, responses }
      ));
    }
  }

  /**
   * Validate risk compatibility
   */
  async validateRiskCompatibility(
    operation: RiskAssessmentInput,
    userProfile: RiskProfile
  ): Promise<{
    compatible: boolean;
    warnings: ReadonlyArray<string>;
    suggestions: ReadonlyArray<string>;
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Assess operation risk
    const riskAssessment = await this.assessRisk({ ...operation, userProfile });
    
    if (E.isLeft(riskAssessment)) {
      warnings.push('Could not assess operation risk');
      return { compatible: false, warnings, suggestions };
    }

    const assessment = riskAssessment.right;

    // Check risk tolerance compatibility
    const toleranceCompatible = this.isRiskToleranceCompatible(
      assessment.overall,
      userProfile.tolerance
    );

    if (!toleranceCompatible) {
      warnings.push(
        `Operation risk (${assessment.overall}) exceeds your risk tolerance (${userProfile.tolerance})`
      );
      suggestions.push('Consider reducing the amount or using a less risky strategy');
    }

    // Check capacity compatibility
    const capacityCompatible = this.isRiskCapacityCompatible(
      operation.amount,
      operation.portfolioValue || 0,
      userProfile.capacity
    );

    if (!capacityCompatible) {
      warnings.push('Operation size exceeds your risk capacity');
      suggestions.push('Reduce the amount to stay within your risk limits');
    }

    // Check experience level compatibility
    const experienceCompatible = this.isExperienceCompatible(
      operation.operation,
      userProfile.experience
    );

    if (!experienceCompatible) {
      warnings.push('This operation may be too complex for your experience level');
      suggestions.push('Consider starting with simpler operations or seeking guidance');
    }

    const compatible = toleranceCompatible && capacityCompatible && experienceCompatible;

    return { compatible, warnings, suggestions };
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(input: RiskAssessmentInput): Promise<ReadonlyArray<RiskFactor>> {
    const factors: RiskFactor[] = [];

    // Protocol risk
    const protocolRisk = this.protocolRiskMappings.get(input.protocol.toLowerCase()) || RiskLevel.MEDIUM;
    factors.push({
      type: RiskFactorType.SMART_CONTRACT,
      level: protocolRisk,
      impact: this.getRiskImpact(protocolRisk),
      description: `${input.protocol} protocol smart contract risk`,
      mitigation: protocolRisk === RiskLevel.HIGH ? 'Use well-audited protocols' : undefined
    });

    // Operation risk
    const operationRisk = this.operationRiskMappings.get(input.operation.toLowerCase()) || RiskLevel.MEDIUM;
    factors.push({
      type: RiskFactorType.OPERATIONAL,
      level: operationRisk,
      impact: this.getRiskImpact(operationRisk),
      description: `${input.operation} operation complexity risk`
    });

    // Leverage risk
    if (input.leverage && input.leverage > 1) {
      const leverageRisk = this.assessLeverageRisk(input.leverage);
      factors.push({
        type: RiskFactorType.MARKET,
        level: leverageRisk,
        impact: this.getRiskImpact(leverageRisk),
        description: `${input.leverage}x leverage increases liquidation risk`,
        mitigation: 'Monitor position closely and maintain sufficient collateral'
      });
    }

    // Amount risk (relative to portfolio)
    if (input.portfolioValue && input.amount > 0) {
      const exposure = input.amount / input.portfolioValue;
      if (exposure > 0.5) {
        factors.push({
          type: RiskFactorType.MARKET,
          level: RiskLevel.HIGH,
          impact: 0.8,
          description: 'High portfolio concentration risk',
          mitigation: 'Diversify across multiple positions and assets'
        });
      } else if (exposure > 0.2) {
        factors.push({
          type: RiskFactorType.MARKET,
          level: RiskLevel.MEDIUM,
          impact: 0.4,
          description: 'Moderate portfolio concentration'
        });
      }
    }

    // Liquidity risk
    const liquidityRisk = this.assessLiquidityRisk(input.protocol, input.amount);
    if (liquidityRisk !== RiskLevel.LOW) {
      factors.push({
        type: RiskFactorType.LIQUIDITY,
        level: liquidityRisk,
        impact: this.getRiskImpact(liquidityRisk),
        description: 'Potential liquidity constraints',
        mitigation: 'Consider splitting into smaller transactions'
      });
    }

    return factors;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(factors: ReadonlyArray<RiskFactor>, input: RiskAssessmentInput): number {
    if (factors.length === 0) return 0;

    // Weighted average of risk factors
    const totalWeight = factors.reduce((sum, factor) => sum + factor.impact, 0);
    const weightedScore = factors.reduce((sum, factor) => {
      const levelScore = this.getRiskLevelScore(factor.level);
      return sum + (levelScore * factor.impact);
    }, 0);

    let baseScore = weightedScore / totalWeight;

    // Adjust for specific conditions
    if (input.leverage && input.leverage > 3) {
      baseScore *= 1.2; // Increase score for high leverage
    }

    if (input.userProfile?.experience === ExperienceLevel.BEGINNER) {
      baseScore *= 1.1; // Increase score for beginners
    }

    return Math.min(baseScore, 1.0);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score <= 0.2) return RiskLevel.VERY_LOW;
    if (score <= 0.4) return RiskLevel.LOW;
    if (score <= 0.6) return RiskLevel.MEDIUM;
    if (score <= 0.8) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Generate risk recommendations
   */
  private generateRecommendations(
    factors: ReadonlyArray<RiskFactor>,
    input: RiskAssessmentInput
  ): ReadonlyArray<string> {
    const recommendations: string[] = [];

    // General recommendations based on overall risk
    const overallRisk = this.determineRiskLevel(this.calculateRiskScore(factors, input));

    if (overallRisk === RiskLevel.HIGH || overallRisk === RiskLevel.VERY_HIGH) {
      recommendations.push('Consider reducing the operation size');
      recommendations.push('Monitor the position closely after execution');
    }

    // Specific recommendations from risk factors
    factors.forEach(factor => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }
    });

    // User experience based recommendations
    if (input.userProfile?.experience === ExperienceLevel.BEGINNER) {
      recommendations.push('Start with smaller amounts to gain experience');
      recommendations.push('Study the protocol documentation before proceeding');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate risk warnings
   */
  private generateWarnings(
    factors: ReadonlyArray<RiskFactor>,
    input: RiskAssessmentInput
  ): ReadonlyArray<string> {
    const warnings: string[] = [];

    // High risk factors generate warnings
    factors.forEach(factor => {
      if (factor.level === RiskLevel.HIGH || factor.level === RiskLevel.VERY_HIGH) {
        warnings.push(factor.description);
      }
    });

    // Specific condition warnings
    if (input.leverage && input.leverage > 5) {
      warnings.push('Extremely high leverage - liquidation risk is severe');
    }

    if (input.amount > 100000) {
      warnings.push('Large amount - consider market impact and slippage');
    }

    return warnings;
  }

  /**
   * Interpret contextual risk from natural language
   */
  private interpretContextualRisk(input: string): O.Option<RiskLevel> {
    // Context-based risk interpretation
    const contextPatterns: Array<{ pattern: RegExp; risk: RiskLevel }> = [
      { pattern: /can't afford to lose|no risk|100% safe/, risk: RiskLevel.VERY_LOW },
      { pattern: /little risk|minimal risk|very safe/, risk: RiskLevel.LOW },
      { pattern: /some risk|moderate|balanced/, risk: RiskLevel.MEDIUM },
      { pattern: /willing to risk|higher returns|growth/, risk: RiskLevel.HIGH },
      { pattern: /maximum returns|all in|yolo/, risk: RiskLevel.VERY_HIGH }
    ];

    for (const { pattern, risk } of contextPatterns) {
      if (pattern.test(input)) {
        return O.some(risk);
      }
    }

    return O.none;
  }

  /**
   * Interpret experience level
   */
  private interpretExperience(input: string): ExperienceLevel {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('expert') || inputLower.includes('professional')) {
      return ExperienceLevel.EXPERT;
    }
    if (inputLower.includes('advanced') || inputLower.includes('experienced')) {
      return ExperienceLevel.ADVANCED;
    }
    if (inputLower.includes('intermediate') || inputLower.includes('some experience')) {
      return ExperienceLevel.INTERMEDIATE;
    }
    
    return ExperienceLevel.BEGINNER; // Default to beginner for safety
  }

  /**
   * Interpret time horizon
   */
  private interpretTimeHorizon(input: string): TimeHorizon {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('long') || inputLower.includes('year') || inputLower.includes('hold')) {
      return TimeHorizon.LONG_TERM;
    }
    if (inputLower.includes('medium') || inputLower.includes('month')) {
      return TimeHorizon.MEDIUM_TERM;
    }
    
    return TimeHorizon.SHORT_TERM; // Default to short-term
  }

  /**
   * Calculate risk capacity
   */
  private calculateRiskCapacity(portfolioSize: number, experience: ExperienceLevel): number {
    let baseCapacity = 0.3; // 30% base capacity

    // Adjust for portfolio size
    if (portfolioSize > 1000000) baseCapacity *= 1.2;
    else if (portfolioSize > 100000) baseCapacity *= 1.1;
    else if (portfolioSize < 10000) baseCapacity *= 0.8;

    // Adjust for experience
    switch (experience) {
      case ExperienceLevel.EXPERT:
        baseCapacity *= 1.3;
        break;
      case ExperienceLevel.ADVANCED:
        baseCapacity *= 1.2;
        break;
      case ExperienceLevel.INTERMEDIATE:
        baseCapacity *= 1.0;
        break;
      case ExperienceLevel.BEGINNER:
        baseCapacity *= 0.7;
        break;
    }

    return Math.min(baseCapacity, 0.5); // Cap at 50%
  }

  /**
   * Create risk preferences
   */
  private createRiskPreferences(responses: any): RiskPreferences {
    return {
      maxSinglePosition: 0.2, // 20% max single position
      maxProtocolExposure: 0.3, // 30% max protocol exposure
      allowLeverage: !responses.leverageComfort?.includes('no'),
      maxLeverage: responses.leverageComfort?.includes('high') ? 10 : 3,
      allowExperimental: responses.experimentation?.includes('yes'),
      preferAudited: !responses.auditPreference?.includes('no')
    };
  }

  /**
   * Check risk tolerance compatibility
   */
  private isRiskToleranceCompatible(operationRisk: RiskLevel, userTolerance: RiskLevel): boolean {
    const riskLevels = [RiskLevel.VERY_LOW, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.VERY_HIGH];
    const operationIndex = riskLevels.indexOf(operationRisk);
    const toleranceIndex = riskLevels.indexOf(userTolerance);
    
    return operationIndex <= toleranceIndex;
  }

  /**
   * Check risk capacity compatibility
   */
  private isRiskCapacityCompatible(amount: number, portfolioValue: number, capacity: number): boolean {
    if (portfolioValue === 0) return true;
    const exposure = amount / portfolioValue;
    return exposure <= capacity;
  }

  /**
   * Check experience compatibility
   */
  private isExperienceCompatible(operation: string, experience: ExperienceLevel): boolean {
    const complexOperations = ['arbitrage', 'leveraged_farming', 'options', 'perpetuals'];
    
    if (complexOperations.includes(operation.toLowerCase())) {
      return experience === ExperienceLevel.ADVANCED || experience === ExperienceLevel.EXPERT;
    }
    
    return true;
  }

  /**
   * Assess leverage risk
   */
  private assessLeverageRisk(leverage: number): RiskLevel {
    if (leverage <= 2) return RiskLevel.LOW;
    if (leverage <= 5) return RiskLevel.MEDIUM;
    if (leverage <= 10) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Assess liquidity risk
   */
  private assessLiquidityRisk(protocol: string, amount: number): RiskLevel {
    // Simplified liquidity assessment
    const highLiquidityProtocols = ['dragonswap', 'symphony'];
    
    if (highLiquidityProtocols.includes(protocol.toLowerCase())) {
      return amount > 1000000 ? RiskLevel.MEDIUM : RiskLevel.LOW;
    }
    
    return amount > 100000 ? RiskLevel.HIGH : RiskLevel.MEDIUM;
  }

  /**
   * Get risk impact value
   */
  private getRiskImpact(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW: return 0.1;
      case RiskLevel.LOW: return 0.3;
      case RiskLevel.MEDIUM: return 0.5;
      case RiskLevel.HIGH: return 0.7;
      case RiskLevel.VERY_HIGH: return 0.9;
      default: return 0.5;
    }
  }

  /**
   * Get risk level numeric score
   */
  private getRiskLevelScore(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW: return 0.1;
      case RiskLevel.LOW: return 0.3;
      case RiskLevel.MEDIUM: return 0.5;
      case RiskLevel.HIGH: return 0.7;
      case RiskLevel.VERY_HIGH: return 0.9;
      default: return 0.5;
    }
  }

  /**
   * Initialize protocol risk mappings
   */
  private initializeProtocolRiskMappings(): Map<string, RiskLevel> {
    return new Map([
      ['dragonswap', RiskLevel.LOW],
      ['symphony', RiskLevel.LOW],
      ['silo', RiskLevel.LOW],
      ['takara', RiskLevel.MEDIUM],
      ['citrex', RiskLevel.MEDIUM],
      ['experimental', RiskLevel.HIGH]
    ]);
  }

  /**
   * Initialize operation risk mappings
   */
  private initializeOperationRiskMappings(): Map<string, RiskLevel> {
    return new Map([
      ['lend', RiskLevel.LOW],
      ['supply', RiskLevel.LOW],
      ['withdraw', RiskLevel.LOW],
      ['swap', RiskLevel.LOW],
      ['borrow', RiskLevel.MEDIUM],
      ['add_liquidity', RiskLevel.MEDIUM],
      ['leveraged_farming', RiskLevel.HIGH],
      ['arbitrage', RiskLevel.HIGH],
      ['perpetuals', RiskLevel.HIGH],
      ['options', RiskLevel.VERY_HIGH]
    ]);
  }
}