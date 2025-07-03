/**
 * @fileoverview Disambiguation Engine
 * Handles ambiguous commands and provides clarification options
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

import { DefiIntent, FinancialEntity, EntityType } from '../nlp/types.js';
import {
  DisambiguationOptions,
  DisambiguationOption,
  CommandParameters,
  ExecutableCommand,
  ParsingContext,
  CommandProcessingError
} from './types.js';

/**
 * Disambiguation Context
 */
export interface DisambiguationContext {
  readonly originalInput: string;
  readonly detectedIntent: DefiIntent;
  readonly entities: ReadonlyArray<FinancialEntity>;
  readonly ambiguities: ReadonlyArray<AmbiguityType>;
  readonly userContext?: ParsingContext;
}

/**
 * Ambiguity Types
 */
export enum AmbiguityType {
  MISSING_PROTOCOL = 'missing_protocol',
  MISSING_TOKEN = 'missing_token',
  TOKEN_DIRECTION = 'token_direction', // For swaps: from or to?
  MULTIPLE_AMOUNTS = 'multiple_amounts',
  UNCLEAR_INTENT = 'unclear_intent',
  PROTOCOL_CHOICE = 'protocol_choice',
  PARAMETER_CONFLICT = 'parameter_conflict',
  RISK_CONFIRMATION = 'risk_confirmation'
}

/**
 * Disambiguation Strategy
 */
export interface DisambiguationStrategy {
  readonly type: AmbiguityType;
  readonly priority: number;
  readonly resolver: (context: DisambiguationContext) => Promise<DisambiguationOptions>;
}

/**
 * Disambiguation Engine
 */
export class DisambiguationEngine {
  private readonly strategies: Map<AmbiguityType, DisambiguationStrategy>;
  private readonly contextAnalyzer: ContextAnalyzer;
  private readonly optionGenerator: OptionGenerator;

  constructor() {
    this.strategies = this.initializeStrategies();
    this.contextAnalyzer = new ContextAnalyzer();
    this.optionGenerator = new OptionGenerator();
  }

  /**
   * Detect ambiguities in command
   */
  async detectAmbiguities(
    intent: DefiIntent,
    entities: ReadonlyArray<FinancialEntity>,
    originalInput: string,
    context?: ParsingContext
  ): Promise<ReadonlyArray<AmbiguityType>> {
    const ambiguities: AmbiguityType[] = [];

    // Check for missing protocol
    if (this.requiresProtocol(intent) && !this.hasProtocolEntity(entities)) {
      const availableProtocols = this.getAvailableProtocols(intent);
      if (availableProtocols.length > 1) {
        ambiguities.push(AmbiguityType.MISSING_PROTOCOL);
      }
    }

    // Check for token direction ambiguity (swaps)
    if (intent === DefiIntent.SWAP && this.hasTokenDirectionAmbiguity(entities)) {
      ambiguities.push(AmbiguityType.TOKEN_DIRECTION);
    }

    // Check for multiple amounts
    if (this.hasMultipleAmounts(entities)) {
      ambiguities.push(AmbiguityType.MULTIPLE_AMOUNTS);
    }

    // Check for unclear intent
    if (intent === DefiIntent.UNKNOWN) {
      ambiguities.push(AmbiguityType.UNCLEAR_INTENT);
    }

    // Check for protocol choice when multiple are viable
    if (this.hasProtocolChoice(intent, entities, context)) {
      ambiguities.push(AmbiguityType.PROTOCOL_CHOICE);
    }

    // Check for parameter conflicts
    if (this.hasParameterConflicts(entities)) {
      ambiguities.push(AmbiguityType.PARAMETER_CONFLICT);
    }

    // Check for high-risk operations needing confirmation
    if (this.needsRiskConfirmation(intent, entities)) {
      ambiguities.push(AmbiguityType.RISK_CONFIRMATION);
    }

    return ambiguities;
  }

  /**
   * Generate disambiguation options
   */
  async generateDisambiguationOptions(
    context: DisambiguationContext
  ): Promise<E.Either<CommandProcessingError, DisambiguationOptions>> {
    try {
      // Sort ambiguities by priority
      const sortedAmbiguities = context.ambiguities
        .map(type => ({ type, strategy: this.strategies.get(type) }))
        .filter(({ strategy }) => strategy !== undefined)
        .sort((a, b) => (b.strategy!.priority - a.strategy!.priority));

      if (sortedAmbiguities.length === 0) {
        return E.left(new CommandProcessingError(
          'No disambiguation strategies available',
          'NO_STRATEGIES'
        ));
      }

      // Use the highest priority ambiguity
      const primaryAmbiguity = sortedAmbiguities[0];
      const options = await primaryAmbiguity.strategy!.resolver(context);

      return E.right(options);

    } catch (error) {
      return E.left(new CommandProcessingError(
        'Failed to generate disambiguation options',
        'DISAMBIGUATION_ERROR',
        { originalError: error }
      ));
    }
  }

  /**
   * Resolve disambiguation with user choice
   */
  async resolveDisambiguation(
    originalParameters: CommandParameters,
    selectedOptionId: string,
    disambiguationOptions: DisambiguationOptions
  ): Promise<E.Either<CommandProcessingError, CommandParameters>> {
    try {
      const selectedOption = disambiguationOptions.options.find(
        option => option.id === selectedOptionId
      );

      if (!selectedOption) {
        return E.left(new CommandProcessingError(
          'Invalid disambiguation option selected',
          'INVALID_OPTION',
          { selectedOptionId, availableOptions: disambiguationOptions.options.map(o => o.id) }
        ));
      }

      // Merge the selected parameters with original parameters
      const resolvedParameters: CommandParameters = {
        primary: {
          ...originalParameters.primary,
          ...selectedOption.parameters.primary
        },
        optional: {
          ...originalParameters.optional,
          ...selectedOption.parameters.optional
        },
        derived: {
          ...originalParameters.derived,
          ...selectedOption.parameters.derived
        }
      };

      return E.right(resolvedParameters);

    } catch (error) {
      return E.left(new CommandProcessingError(
        'Failed to resolve disambiguation',
        'RESOLUTION_ERROR',
        { originalError: error }
      ));
    }
  }

  /**
   * Check if command requires protocol specification
   */
  private requiresProtocol(intent: DefiIntent): boolean {
    const protocolRequiredIntents = [
      DefiIntent.LEND,
      DefiIntent.BORROW,
      DefiIntent.SWAP,
      DefiIntent.ADD_LIQUIDITY,
      DefiIntent.REMOVE_LIQUIDITY,
      DefiIntent.OPEN_POSITION,
      DefiIntent.CLOSE_POSITION
    ];

    return protocolRequiredIntents.includes(intent);
  }

  /**
   * Check if entities contain protocol
   */
  private hasProtocolEntity(entities: ReadonlyArray<FinancialEntity>): boolean {
    return entities.some(entity => entity.type === EntityType.PROTOCOL);
  }

  /**
   * Check for token direction ambiguity
   */
  private hasTokenDirectionAmbiguity(entities: ReadonlyArray<FinancialEntity>): boolean {
    const tokenEntities = entities.filter(entity => entity.type === EntityType.TOKEN);
    const amountEntities = entities.filter(entity => entity.type === EntityType.AMOUNT);
    
    // If there's one token and one amount, it's ambiguous for swaps
    return tokenEntities.length === 1 && amountEntities.length === 1;
  }

  /**
   * Check for multiple amounts
   */
  private hasMultipleAmounts(entities: ReadonlyArray<FinancialEntity>): boolean {
    const amountEntities = entities.filter(entity => entity.type === EntityType.AMOUNT);
    return amountEntities.length > 1;
  }

  /**
   * Check for protocol choice ambiguity
   */
  private hasProtocolChoice(
    intent: DefiIntent,
    entities: ReadonlyArray<FinancialEntity>,
    context?: ParsingContext
  ): boolean {
    if (this.hasProtocolEntity(entities)) {
      return false; // Already specified
    }

    const availableProtocols = this.getAvailableProtocols(intent);
    
    // If user has history with multiple protocols, it's ambiguous
    if (context?.positions && availableProtocols.length > 1) {
      const usedProtocols = new Set(context.positions.map((pos: any) => pos.protocol));
      return availableProtocols.filter(p => usedProtocols.has(p)).length > 1;
    }

    return availableProtocols.length > 2; // More than 2 choices is ambiguous
  }

  /**
   * Check for parameter conflicts
   */
  private hasParameterConflicts(entities: ReadonlyArray<FinancialEntity>): boolean {
    // Check for conflicting leverage values
    const leverageEntities = entities.filter(entity => entity.type === EntityType.LEVERAGE);
    if (leverageEntities.length > 1) {
      return true;
    }

    // Check for conflicting slippage values
    const slippageEntities = entities.filter(entity => entity.type === EntityType.SLIPPAGE);
    if (slippageEntities.length > 1) {
      return true;
    }

    return false;
  }

  /**
   * Check if high-risk operation needs confirmation
   */
  private needsRiskConfirmation(
    intent: DefiIntent,
    entities: ReadonlyArray<FinancialEntity>
  ): boolean {
    // High leverage operations
    const leverageEntities = entities.filter(entity => entity.type === EntityType.LEVERAGE);
    if (leverageEntities.length > 0) {
      const leverage = parseFloat(leverageEntities[0].normalized);
      if (leverage > 5) {
        return true;
      }
    }

    // Large amounts
    const amountEntities = entities.filter(entity => entity.type === EntityType.AMOUNT);
    if (amountEntities.length > 0) {
      const amount = parseFloat(amountEntities[0].normalized);
      if (amount > 50000) {
        return true;
      }
    }

    // Inherently risky operations
    const highRiskIntents = [
      DefiIntent.OPEN_POSITION,
      DefiIntent.ARBITRAGE,
      DefiIntent.CROSS_PROTOCOL_ARBITRAGE
    ];

    return highRiskIntents.includes(intent);
  }

  /**
   * Get available protocols for intent
   */
  private getAvailableProtocols(intent: DefiIntent): string[] {
    const protocolMap: Record<string, string[]> = {
      [DefiIntent.LEND]: ['Silo', 'Takara'],
      [DefiIntent.BORROW]: ['Silo', 'Takara'],
      [DefiIntent.SWAP]: ['DragonSwap', 'Symphony'],
      [DefiIntent.ADD_LIQUIDITY]: ['DragonSwap', 'Symphony'],
      [DefiIntent.REMOVE_LIQUIDITY]: ['DragonSwap', 'Symphony'],
      [DefiIntent.OPEN_POSITION]: ['Citrex'],
      [DefiIntent.CLOSE_POSITION]: ['Citrex']
    };

    return protocolMap[intent] || [];
  }

  /**
   * Initialize disambiguation strategies
   */
  private initializeStrategies(): Map<AmbiguityType, DisambiguationStrategy> {
    const strategies = new Map<AmbiguityType, DisambiguationStrategy>();

    // Missing protocol strategy
    strategies.set(AmbiguityType.MISSING_PROTOCOL, {
      type: AmbiguityType.MISSING_PROTOCOL,
      priority: 8,
      resolver: async (context) => {
        const protocols = this.getAvailableProtocols(context.detectedIntent);
        const options = await this.optionGenerator.generateProtocolOptions(
          protocols,
          context
        );

        return {
          question: "Which protocol would you like to use?",
          options,
          defaultOption: options[0]?.id,
          timeout: 30000
        };
      }
    });

    // Token direction strategy
    strategies.set(AmbiguityType.TOKEN_DIRECTION, {
      type: AmbiguityType.TOKEN_DIRECTION,
      priority: 9,
      resolver: async (context) => {
        const tokenEntity = context.entities.find(e => e.type === EntityType.TOKEN);
        const amountEntity = context.entities.find(e => e.type === EntityType.AMOUNT);
        
        if (!tokenEntity || !amountEntity) {
          throw new Error('Missing token or amount for direction disambiguation');
        }

        const options = await this.optionGenerator.generateTokenDirectionOptions(
          tokenEntity.normalized,
          amountEntity.normalized,
          context
        );

        return {
          question: `Do you want to swap FROM ${tokenEntity.normalized} or TO ${tokenEntity.normalized}?`,
          options,
          defaultOption: options[0]?.id,
          timeout: 30000
        };
      }
    });

    // Multiple amounts strategy
    strategies.set(AmbiguityType.MULTIPLE_AMOUNTS, {
      type: AmbiguityType.MULTIPLE_AMOUNTS,
      priority: 7,
      resolver: async (context) => {
        const amountEntities = context.entities.filter(e => e.type === EntityType.AMOUNT);
        const options = await this.optionGenerator.generateAmountOptions(
          amountEntities,
          context
        );

        return {
          question: "Which amount do you want to use?",
          options,
          defaultOption: options[0]?.id,
          timeout: 30000
        };
      }
    });

    // Unclear intent strategy
    strategies.set(AmbiguityType.UNCLEAR_INTENT, {
      type: AmbiguityType.UNCLEAR_INTENT,
      priority: 10,
      resolver: async (context) => {
        const options = await this.optionGenerator.generateIntentOptions(context);

        return {
          question: "What would you like to do?",
          options,
          defaultOption: options[0]?.id,
          timeout: 45000
        };
      }
    });

    // Protocol choice strategy
    strategies.set(AmbiguityType.PROTOCOL_CHOICE, {
      type: AmbiguityType.PROTOCOL_CHOICE,
      priority: 6,
      resolver: async (context) => {
        const protocols = this.getAvailableProtocols(context.detectedIntent);
        const options = await this.optionGenerator.generateProtocolChoiceOptions(
          protocols,
          context
        );

        return {
          question: "Which protocol offers the best value for your needs?",
          options,
          defaultOption: options[0]?.id,
          timeout: 30000
        };
      }
    });

    // Risk confirmation strategy
    strategies.set(AmbiguityType.RISK_CONFIRMATION, {
      type: AmbiguityType.RISK_CONFIRMATION,
      priority: 5,
      resolver: async (context) => {
        const options = await this.optionGenerator.generateRiskConfirmationOptions(context);

        return {
          question: "This operation carries significant risk. Do you want to proceed?",
          options,
          defaultOption: options[1]?.id, // Default to "No" for safety
          timeout: 60000
        };
      }
    });

    return strategies;
  }

  /**
   * Generate smart suggestions based on context
   */
  async generateSmartSuggestions(
    context: DisambiguationContext
  ): Promise<ReadonlyArray<string>> {
    const suggestions: string[] = [];

    // Suggest based on user history
    if (context.userContext?.positions) {
      const mostUsedProtocol = this.getMostUsedProtocol(context.userContext.positions);
      if (mostUsedProtocol && this.getAvailableProtocols(context.detectedIntent).includes(mostUsedProtocol)) {
        suggestions.push(`You frequently use ${mostUsedProtocol}`);
      }
    }

    // Suggest based on market conditions
    if (context.detectedIntent === DefiIntent.LEND) {
      suggestions.push("Silo currently offers the highest USDC lending rates");
    }

    if (context.detectedIntent === DefiIntent.SWAP) {
      suggestions.push("Symphony typically has better rates for large swaps");
    }

    // Suggest risk management
    const hasHighRisk = context.ambiguities.includes(AmbiguityType.RISK_CONFIRMATION);
    if (hasHighRisk) {
      suggestions.push("Consider starting with a smaller amount to test the strategy");
    }

    return suggestions;
  }

  /**
   * Get most used protocol from user positions
   */
  private getMostUsedProtocol(positions: any[]): string | null {
    const protocolCounts = new Map<string, number>();
    
    positions.forEach(position => {
      const count = protocolCounts.get(position.protocol) || 0;
      protocolCounts.set(position.protocol, count + 1);
    });

    if (protocolCounts.size === 0) return null;

    return Array.from(protocolCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }
}

/**
 * Context Analyzer for disambiguation
 */
class ContextAnalyzer {
  analyzeUserPreferences(context?: ParsingContext): {
    preferredProtocols: string[];
    riskTolerance: 'low' | 'medium' | 'high';
    typicalAmounts: number[];
  } {
    const analysis = {
      preferredProtocols: [] as string[],
      riskTolerance: 'medium' as const,
      typicalAmounts: [] as number[]
    };

    if (!context?.positions) return analysis;

    // Analyze preferred protocols
    const protocolCounts = new Map<string, number>();
    context.positions.forEach((pos: any) => {
      const count = protocolCounts.get(pos.protocol) || 0;
      protocolCounts.set(pos.protocol, count + 1);
    });

    analysis.preferredProtocols = Array.from(protocolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([protocol]) => protocol);

    // Analyze risk tolerance
    const hasHighRiskPositions = context.positions.some((pos: any) => 
      pos.type === 'trading' || (pos.healthFactor && pos.healthFactor < 2)
    );
    
    if (hasHighRiskPositions) {
      analysis.riskTolerance = 'high';
    } else if (context.positions.every((pos: any) => pos.type === 'lending')) {
      analysis.riskTolerance = 'low';
    }

    // Analyze typical amounts
    analysis.typicalAmounts = context.positions
      .map((pos: any) => pos.value)
      .sort((a, b) => b - a)
      .slice(0, 5);

    return analysis;
  }
}

/**
 * Option Generator for disambiguation
 */
class OptionGenerator {
  async generateProtocolOptions(
    protocols: string[],
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    return protocols.map((protocol, index) => ({
      id: `protocol_${protocol.toLowerCase()}`,
      label: protocol,
      description: this.getProtocolDescription(protocol, context.detectedIntent),
      parameters: {
        primary: { protocol: protocol.toLowerCase() }
      },
      confidence: this.calculateProtocolConfidence(protocol, context)
    }));
  }

  async generateTokenDirectionOptions(
    token: string,
    amount: string,
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    return [
      {
        id: 'from_token',
        label: `Swap FROM ${token}`,
        description: `Sell ${amount} ${token} for another token`,
        parameters: {
          primary: { fromToken: token, amount }
        },
        confidence: 0.8
      },
      {
        id: 'to_token',
        label: `Swap TO ${token}`,
        description: `Buy ${token} with another token`,
        parameters: {
          primary: { toToken: token }
        },
        confidence: 0.8
      }
    ];
  }

  async generateAmountOptions(
    amountEntities: ReadonlyArray<FinancialEntity>,
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    return amountEntities.map((entity, index) => ({
      id: `amount_${index}`,
      label: entity.value,
      description: `Use ${entity.normalized} as the amount`,
      parameters: {
        primary: { amount: entity.normalized }
      },
      confidence: entity.confidence
    }));
  }

  async generateIntentOptions(
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    const commonIntents = [
      { intent: DefiIntent.LEND, label: 'Lend/Supply tokens', description: 'Earn yield by lending your tokens' },
      { intent: DefiIntent.BORROW, label: 'Borrow tokens', description: 'Borrow tokens against your collateral' },
      { intent: DefiIntent.SWAP, label: 'Swap tokens', description: 'Exchange one token for another' },
      { intent: DefiIntent.PORTFOLIO_STATUS, label: 'Check portfolio', description: 'View your current positions and balances' },
      { intent: DefiIntent.SHOW_RATES, label: 'Check rates', description: 'View current lending and borrowing rates' }
    ];

    return commonIntents.map((item, index) => ({
      id: `intent_${item.intent}`,
      label: item.label,
      description: item.description,
      parameters: {},
      confidence: 0.9
    }));
  }

  async generateProtocolChoiceOptions(
    protocols: string[],
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    const protocolInfo = await this.getProtocolComparisonInfo(protocols, context.detectedIntent);
    
    return protocols.map(protocol => ({
      id: `choice_${protocol.toLowerCase()}`,
      label: protocol,
      description: protocolInfo[protocol] || `Use ${protocol} protocol`,
      parameters: {
        primary: { protocol: protocol.toLowerCase() }
      },
      confidence: 0.85
    }));
  }

  async generateRiskConfirmationOptions(
    context: DisambiguationContext
  ): Promise<DisambiguationOption[]> {
    return [
      {
        id: 'proceed_with_risk',
        label: 'Yes, proceed',
        description: 'I understand the risks and want to proceed',
        parameters: {},
        confidence: 0.9
      },
      {
        id: 'cancel_risky_operation',
        label: 'No, cancel',
        description: 'Cancel this operation for safety',
        parameters: {},
        confidence: 0.9
      },
      {
        id: 'reduce_risk',
        label: 'Reduce risk',
        description: 'Modify the operation to reduce risk',
        parameters: {},
        confidence: 0.8
      }
    ];
  }

  private getProtocolDescription(protocol: string, intent: DefiIntent): string {
    const descriptions: Record<string, Record<string, string>> = {
      'Silo': {
        [DefiIntent.LEND]: 'Conservative lending with isolated markets',
        [DefiIntent.BORROW]: 'Secure borrowing with risk isolation'
      },
      'Takara': {
        [DefiIntent.LEND]: 'Competitive rates with auto-compounding',
        [DefiIntent.BORROW]: 'Flexible borrowing options'
      },
      'DragonSwap': {
        [DefiIntent.SWAP]: 'Popular DEX with good liquidity',
        [DefiIntent.ADD_LIQUIDITY]: 'Earn fees providing liquidity'
      },
      'Symphony': {
        [DefiIntent.SWAP]: 'Advanced DEX with concentrated liquidity',
        [DefiIntent.ADD_LIQUIDITY]: 'Higher capital efficiency'
      },
      'Citrex': {
        [DefiIntent.OPEN_POSITION]: 'Perpetual trading with leverage'
      }
    };

    return descriptions[protocol]?.[intent] || `Use ${protocol} protocol`;
  }

  private calculateProtocolConfidence(
    protocol: string,
    context: DisambiguationContext
  ): number {
    let confidence = 0.8; // Base confidence

    // Boost if user has used this protocol before
    if (context.userContext?.positions) {
      const hasUsedProtocol = context.userContext.positions.some(
        (pos: any) => pos.protocol.toLowerCase() === protocol.toLowerCase()
      );
      if (hasUsedProtocol) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  private async getProtocolComparisonInfo(
    protocols: string[],
    intent: DefiIntent
  ): Promise<Record<string, string>> {
    // Mock comparison info - would use real data
    const info: Record<string, string> = {};

    if (intent === DefiIntent.LEND) {
      info['Silo'] = 'Highest safety, competitive rates';
      info['Takara'] = 'Best auto-compounding features';
    }

    if (intent === DefiIntent.SWAP) {
      info['DragonSwap'] = 'Lowest fees for small trades';
      info['Symphony'] = 'Best rates for large trades';
    }

    return info;
  }
}