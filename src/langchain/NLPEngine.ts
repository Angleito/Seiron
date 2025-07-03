/**
 * @fileoverview Main NLP Engine
 * Comprehensive Natural Language Processing engine that orchestrates all components
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';

// Core Components
import { IntentClassifier } from './nlp/IntentClassifier.js';
import { EntityExtractor } from './nlp/EntityExtractor.js';
import { ContextAnalyzer } from './nlp/ContextAnalyzer.js';
import { CommandParser } from './processing/CommandParser.js';
import { ParameterValidator } from './processing/ParameterValidator.js';
import { DisambiguationEngine } from './processing/DisambiguationEngine.js';
import { ConversationFlowManager } from './conversation/ConversationFlowManager.js';
import { ContextPreservation } from './conversation/ContextPreservation.js';
import { ConfirmationHandler } from './conversation/ConfirmationHandler.js';
import { ProgressTrackerImpl } from './conversation/ProgressTracker.js';
import { AssetResolver } from './domain/AssetResolver.js';
import { AmountParser } from './domain/AmountParser.js';
import { RiskProfiler } from './domain/RiskProfiler.js';
import { StrategyMatcher } from './domain/StrategyMatcher.js';

// Types
import {
  DefiIntent,
  IntentClassification,
  ConversationContext,
  NLPConfig
} from './nlp/types.js';
import {
  ExecutableCommand,
  CommandProcessingResult,
  ParsingContext
} from './processing/types.js';
import {
  ConversationSession,
  ConversationState,
  FlowType
} from './conversation/types.js';

/**
 * NLP Engine Configuration
 */
export interface NLPEngineConfig {
  readonly nlp: NLPConfig;
  readonly assetResolver: {
    readonly minFuzzyScore: number;
    readonly maxSuggestions: number;
    readonly enableFuzzyMatching: boolean;
    readonly preferStablecoins: boolean;
    readonly preferPopular: boolean;
  };
  readonly amountParser: {
    readonly minAmount: number;
    readonly maxAmount: number;
    readonly defaultDecimals: number;
    readonly allowPercentages: boolean;
    readonly allowRelativeAmounts: boolean;
  };
  readonly riskProfiler: {
    readonly conservativeThreshold: number;
    readonly moderateThreshold: number;
    readonly aggressiveThreshold: number;
    readonly enableDynamicScoring: boolean;
    readonly marketVolatilityWeight: number;
  };
  readonly strategyMatcher: {
    readonly minMatchScore: number;
    readonly maxResults: number;
    readonly enableDynamicAdjustments: boolean;
    readonly preferPopularStrategies: boolean;
    readonly riskAdjustmentFactor: number;
  };
  readonly flowManager: {
    readonly defaultTimeout: number;
    readonly maxFlowDuration: number;
    readonly enableFlowPersistence: boolean;
    readonly autoAdvanceStages: boolean;
    readonly debugMode: boolean;
  };
  readonly contextPreservation: {
    readonly maxTurns: number;
    readonly maxAge: number;
    readonly preserveEntities: boolean;
    readonly preserveParameters: boolean;
    readonly preserveRiskAssessments: boolean;
    readonly compressionThreshold: number;
  };
  readonly confirmation: {
    readonly type: 'simple' | 'detailed' | 'risk_based';
    readonly timeout: number;
    readonly retryCount: number;
    readonly requireExplicitConsent: boolean;
    readonly riskThreshold: 'low' | 'medium' | 'high';
  };
}

/**
 * Processing Result
 */
export interface ProcessingResult {
  readonly intent: IntentClassification;
  readonly command?: ExecutableCommand;
  readonly needsDisambiguation: boolean;
  readonly disambiguationOptions?: any;
  readonly needsConfirmation: boolean;
  readonly confirmationRequest?: any;
  readonly suggestions: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly session: ConversationSession;
}

/**
 * Main NLP Engine
 */
export class NLPEngine {
  private readonly intentClassifier: IntentClassifier;
  private readonly entityExtractor: EntityExtractor;
  private readonly contextAnalyzer: ContextAnalyzer;
  private readonly commandParser: CommandParser;
  private readonly parameterValidator: ParameterValidator;
  private readonly disambiguationEngine: DisambiguationEngine;
  private readonly flowManager: ConversationFlowManager;
  private readonly contextPreservation: ContextPreservation;
  private readonly confirmationHandler: ConfirmationHandler;
  private readonly progressTracker: ProgressTrackerImpl;
  private readonly assetResolver: AssetResolver;
  private readonly amountParser: AmountParser;
  private readonly riskProfiler: RiskProfiler;
  private readonly strategyMatcher: StrategyMatcher;

  constructor(private readonly config: NLPEngineConfig) {
    // Initialize core NLP components
    this.intentClassifier = new IntentClassifier(config.nlp);
    this.entityExtractor = new EntityExtractor(config.nlp);
    this.contextAnalyzer = new ContextAnalyzer(config.nlp);

    // Initialize processing components
    this.commandParser = new CommandParser();
    this.parameterValidator = new ParameterValidator();
    this.disambiguationEngine = new DisambiguationEngine();

    // Initialize conversation components
    this.flowManager = new ConversationFlowManager(config.flowManager);
    this.contextPreservation = new ContextPreservation(config.contextPreservation);
    this.confirmationHandler = new ConfirmationHandler(config.confirmation);
    this.progressTracker = new ProgressTrackerImpl();

    // Initialize domain components
    this.assetResolver = new AssetResolver(config.assetResolver);
    this.amountParser = new AmountParser(config.amountParser);
    this.riskProfiler = new RiskProfiler(config.riskProfiler);
    this.strategyMatcher = new StrategyMatcher(config.strategyMatcher);
  }

  /**
   * Process natural language input
   */
  async processInput(
    input: string,
    session: ConversationSession,
    context?: ParsingContext
  ): Promise<E.Either<Error, ProcessingResult>> {
    try {
      // Step 1: Update context with new input
      const newTurn = {
        id: `turn_${Date.now()}`,
        sessionId: session.id,
        type: 'user' as const,
        content: input,
        timestamp: Date.now(),
        metadata: { processingTime: 0 }
      };

      const contextUpdateResult = await this.contextPreservation.updateContext(session, newTurn);
      if (E.isLeft(contextUpdateResult)) {
        return E.left(new Error(`Context update failed: ${contextUpdateResult.left.message}`));
      }

      const updatedContext = contextUpdateResult.right;

      // Step 2: Classify intent and extract entities
      const classificationResult = await this.intentClassifier.classifyIntent(
        input,
        this.convertToConversationContext(updatedContext)
      );

      if (E.isLeft(classificationResult)) {
        return E.left(new Error(`Intent classification failed: ${classificationResult.left.message}`));
      }

      const classification = classificationResult.right;

      // Step 3: Enhanced entity extraction with domain support
      const enhancedEntities = await this.enhanceEntities(classification.entities, context);

      const enhancedClassification: IntentClassification = {
        ...classification,
        entities: enhancedEntities
      };

      // Step 4: Parse command if intent is actionable
      let commandResult: CommandProcessingResult | null = null;
      let needsDisambiguation = false;
      let disambiguationOptions: any = undefined;

      if (this.isActionableIntent(classification.intent)) {
        const parseResult = await this.commandParser.parseCommand(
          enhancedClassification,
          input,
          context
        );

        if (E.isRight(parseResult)) {
          commandResult = parseResult.right;
          needsDisambiguation = commandResult.requiresDisambiguation;
          disambiguationOptions = commandResult.disambiguationOptions;
        }
      }

      // Step 5: Handle conversation flow
      const updatedSession = await this.handleConversationFlow(
        session,
        enhancedClassification,
        commandResult,
        input
      );

      // Step 6: Generate confirmation if needed
      let needsConfirmation = false;
      let confirmationRequest: any = undefined;

      if (commandResult?.command && commandResult.command.confirmationRequired) {
        const confirmationResult = await this.confirmationHandler.createConfirmationRequest(
          commandResult.command,
          updatedSession
        );

        if (E.isRight(confirmationResult)) {
          needsConfirmation = true;
          confirmationRequest = confirmationResult.right;
        }
      }

      // Step 7: Generate suggestions and warnings
      const suggestions = await this.generateSuggestions(
        enhancedClassification,
        commandResult,
        updatedSession
      );

      const warnings = await this.generateWarnings(
        enhancedClassification,
        commandResult,
        updatedSession
      );

      return E.right({
        intent: enhancedClassification,
        command: commandResult?.command,
        needsDisambiguation,
        disambiguationOptions,
        needsConfirmation,
        confirmationRequest,
        suggestions,
        warnings,
        session: updatedSession
      });

    } catch (error) {
      return E.left(new Error(`NLP processing failed: ${error}`));
    }
  }

  /**
   * Start a conversation flow
   */
  async startFlow(
    session: ConversationSession,
    flowType: FlowType,
    initialData?: any
  ): Promise<E.Either<Error, any>> {
    const result = await this.flowManager.startFlow(session, flowType, initialData);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Process flow input
   */
  async processFlowInput(
    flowId: string,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<Error, any>> {
    const result = await this.flowManager.processFlowInput(flowId, input, session);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Process confirmation response
   */
  async processConfirmation(
    requestId: string,
    response: string,
    session: ConversationSession
  ): Promise<E.Either<Error, any>> {
    const result = await this.confirmationHandler.processConfirmationResponse(
      requestId,
      response,
      session
    );
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Start operation tracking
   */
  async startOperation(command: ExecutableCommand): Promise<E.Either<Error, any>> {
    const result = await this.progressTracker.startOperation(command);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Resolve asset
   */
  async resolveAsset(input: string): Promise<E.Either<Error, any>> {
    const result = await this.assetResolver.resolveAsset(input);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Parse amount
   */
  async parseAmount(input: string, context?: any): Promise<E.Either<Error, any>> {
    const result = await this.amountParser.parseAmount(input, context);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Assess risk
   */
  async assessRisk(input: any): Promise<E.Either<Error, any>> {
    const result = await this.riskProfiler.assessRisk(input);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Find matching strategies
   */
  async findStrategies(criteria: any): Promise<E.Either<Error, any>> {
    const result = await this.strategyMatcher.findMatchingStrategies(criteria);
    return E.mapLeft((error: any) => new Error(error.message))(result);
  }

  /**
   * Enhance entities with domain knowledge
   */
  private async enhanceEntities(
    entities: ReadonlyArray<any>,
    context?: ParsingContext
  ): Promise<ReadonlyArray<any>> {
    const enhanced = [...entities];

    // Enhance token entities with asset resolution
    for (let i = 0; i < enhanced.length; i++) {
      const entity = enhanced[i];
      
      if (entity.type === 'token') {
        const assetResult = await this.assetResolver.resolveAsset(entity.value);
        if (E.isRight(assetResult)) {
          enhanced[i] = {
            ...entity,
            resolved: assetResult.right.resolved,
            confidence: Math.min(entity.confidence, assetResult.right.confidence)
          };
        }
      }

      if (entity.type === 'amount') {
        const amountResult = await this.amountParser.parseAmount(
          entity.value,
          this.createAmountParsingContext(context)
        );
        if (E.isRight(amountResult)) {
          enhanced[i] = {
            ...entity,
            parsed: amountResult.right,
            normalized: amountResult.right.normalized
          };
        }
      }
    }

    return enhanced;
  }

  /**
   * Handle conversation flow
   */
  private async handleConversationFlow(
    session: ConversationSession,
    classification: IntentClassification,
    commandResult: CommandProcessingResult | null,
    input: string
  ): Promise<ConversationSession> {
    // Check if we have an active flow
    if (session.activeFlow) {
      const flowResult = await this.flowManager.processFlowInput(
        session.activeFlow.id,
        input,
        session
      );

      if (E.isRight(flowResult)) {
        return {
          ...session,
          activeFlow: flowResult.right.flow,
          state: flowResult.right.completed ? ConversationState.COMPLETED : ConversationState.EXECUTING
        };
      }
    }

    // Start new flow if needed
    if (this.shouldStartFlow(classification, commandResult)) {
      const flowType = this.determineFlowType(classification);
      const flowResult = await this.flowManager.startFlow(
        session,
        flowType,
        { intent: classification.intent, command: commandResult?.command }
      );

      if (E.isRight(flowResult)) {
        return {
          ...session,
          activeFlow: flowResult.right,
          state: ConversationState.EXECUTING
        };
      }
    }

    return session;
  }

  /**
   * Generate suggestions
   */
  private async generateSuggestions(
    classification: IntentClassification,
    commandResult: CommandProcessingResult | null,
    session: ConversationSession
  ): Promise<ReadonlyArray<string>> {
    const suggestions: string[] = [];

    // Add command-specific suggestions
    if (commandResult?.suggestions) {
      suggestions.push(...commandResult.suggestions);
    }

    // Add intent-specific suggestions
    if (classification.intent === DefiIntent.UNKNOWN) {
      suggestions.push('Try commands like "lend 1000 USDC" or "check my portfolio"');
    }

    // Add strategy suggestions for yield optimization
    if (classification.intent === DefiIntent.YIELD_OPTIMIZATION) {
      const strategySuggestions = await this.strategyMatcher.getTrendingStrategies(3);
      strategySuggestions.forEach(strategy => {
        suggestions.push(`Consider ${strategy.name} strategy (${strategy.expectedApy}% APY)`);
      });
    }

    return suggestions;
  }

  /**
   * Generate warnings
   */
  private async generateWarnings(
    classification: IntentClassification,
    commandResult: CommandProcessingResult | null,
    session: ConversationSession
  ): Promise<ReadonlyArray<string>> {
    const warnings: string[] = [];

    // Add validation warnings
    if (commandResult?.validationErrors) {
      commandResult.validationErrors.forEach(error => {
        if (error.severity === 'warning') {
          warnings.push(error.message);
        }
      });
    }

    // Add risk warnings
    if (commandResult?.riskLevel === 'high') {
      warnings.push('This operation carries high risk - proceed with caution');
    }

    return warnings;
  }

  /**
   * Check if intent is actionable
   */
  private isActionableIntent(intent: DefiIntent): boolean {
    const actionableIntents = [
      DefiIntent.LEND,
      DefiIntent.BORROW,
      DefiIntent.REPAY,
      DefiIntent.WITHDRAW,
      DefiIntent.SWAP,
      DefiIntent.ADD_LIQUIDITY,
      DefiIntent.REMOVE_LIQUIDITY,
      DefiIntent.OPEN_POSITION,
      DefiIntent.CLOSE_POSITION,
      DefiIntent.ARBITRAGE
    ];

    return actionableIntents.includes(intent);
  }

  /**
   * Check if flow should be started
   */
  private shouldStartFlow(
    classification: IntentClassification,
    commandResult: CommandProcessingResult | null
  ): boolean {
    // Start flow for complex operations
    return commandResult?.requiresDisambiguation ||
           classification.intent === DefiIntent.YIELD_OPTIMIZATION ||
           classification.intent === DefiIntent.ARBITRAGE ||
           (commandResult?.command?.riskLevel === 'high');
  }

  /**
   * Determine appropriate flow type
   */
  private determineFlowType(classification: IntentClassification): FlowType {
    switch (classification.intent) {
      case DefiIntent.YIELD_OPTIMIZATION:
        return FlowType.YIELD_OPTIMIZATION;
      case DefiIntent.RISK_ASSESSMENT:
        return FlowType.RISK_ASSESSMENT;
      case DefiIntent.PORTFOLIO_STATUS:
        return FlowType.PORTFOLIO_REVIEW;
      default:
        return FlowType.COMMAND_EXECUTION;
    }
  }

  /**
   * Convert session context to conversation context
   */
  private convertToConversationContext(sessionContext: any): ConversationContext {
    return {
      userId: sessionContext.user?.id,
      walletAddress: sessionContext.user?.walletAddress,
      preferredProtocols: sessionContext.financial?.activeProtocols || [],
      riskTolerance: sessionContext.financial?.riskTolerance || 'medium',
      portfolioValue: sessionContext.financial?.portfolioValue,
      activePositions: sessionContext.financial?.positions || [],
      conversationHistory: sessionContext.history?.recentIntents?.map((intent: any, index: number) => ({
        id: `hist_${index}`,
        userMessage: '',
        assistantResponse: '',
        intent,
        timestamp: Date.now(),
        successful: true
      })) || []
    };
  }

  /**
   * Create amount parsing context
   */
  private createAmountParsingContext(context?: ParsingContext): any {
    return {
      userBalance: context?.balances?.['USDC'],
      portfolioValue: context?.positions?.reduce((sum: number, pos: any) => sum + pos.value, 0),
      currency: 'USDC'
    };
  }
}