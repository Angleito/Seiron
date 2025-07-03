/**
 * @fileoverview Intent Classification System
 * Sophisticated intent recognition for DeFi operations using pattern matching and ML techniques
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { 
  DefiIntent, 
  IntentClassification, 
  IntentPattern, 
  EntityType, 
  NLPConfig,
  IntentClassificationError,
  ConversationContext,
  FinancialEntity
} from './types.js';
import { EntityExtractor } from './EntityExtractor.js';
import { ContextAnalyzer } from './ContextAnalyzer.js';
import { IntentTemplates } from './IntentTemplates.js';

/**
 * Intent Classification Engine
 */
export class IntentClassifier {
  private readonly entityExtractor: EntityExtractor;
  private readonly contextAnalyzer: ContextAnalyzer;
  private readonly intentTemplates: IntentTemplates;
  private readonly config: NLPConfig;

  constructor(config: NLPConfig) {
    this.config = config;
    this.entityExtractor = new EntityExtractor(config);
    this.contextAnalyzer = new ContextAnalyzer(config);
    this.intentTemplates = new IntentTemplates();
  }

  /**
   * Classify user intent from natural language input
   */
  async classifyIntent(
    input: string,
    context?: ConversationContext
  ): Promise<E.Either<IntentClassificationError, IntentClassification>> {
    try {
      // Clean and normalize input
      const cleanInput = this.normalizeInput(input);
      
      // Extract entities first
      const entitiesResult = await this.entityExtractor.extractEntities(cleanInput);
      
      if (E.isLeft(entitiesResult)) {
        return E.left(new IntentClassificationError(
          'Failed to extract entities',
          { originalError: entitiesResult.left }
        ));
      }

      const entities = entitiesResult.right;

      // Analyze context
      const contextAnalysis = context 
        ? await this.contextAnalyzer.analyzeContext(context, entities)
        : O.none;

      // Multi-strategy classification
      const classifications = await Promise.all([
        this.classifyByPatterns(cleanInput, entities),
        this.classifyByKeywords(cleanInput, entities),
        this.classifyByContext(cleanInput, entities, contextAnalysis),
        this.classifyByStructure(cleanInput, entities)
      ]);

      // Combine and rank classifications
      const bestClassification = this.selectBestClassification(
        classifications.filter(E.isRight).map(c => c.right),
        context
      );

      if (O.isNone(bestClassification)) {
        return E.left(new IntentClassificationError(
          'Unable to classify intent with sufficient confidence',
          { input: cleanInput, entities, minConfidence: this.config.minConfidence }
        ));
      }

      return E.right(bestClassification.value);

    } catch (error) {
      return E.left(new IntentClassificationError(
        'Unexpected error during intent classification',
        { originalError: error }
      ));
    }
  }

  /**
   * Pattern-based classification
   */
  private async classifyByPatterns(
    input: string,
    entities: ReadonlyArray<FinancialEntity>
  ): Promise<E.Either<IntentClassificationError, IntentClassification>> {
    const patterns = this.intentTemplates.getAllPatterns();
    const matches: Array<{ intent: DefiIntent; confidence: number; subIntent?: string }> = [];

    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        const match = input.match(regex);
        if (match) {
          // Calculate confidence based on pattern match and entity alignment
          const confidence = this.calculatePatternConfidence(pattern, entities, match);
          
          if (confidence >= this.config.minConfidence) {
            matches.push({
              intent: pattern.intent,
              confidence,
              subIntent: this.extractSubIntent(pattern.intent, match)
            });
          }
        }
      }
    }

    if (matches.length === 0) {
      return E.left(new IntentClassificationError('No pattern matches found'));
    }

    // Get the best match
    const bestMatch = matches.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return E.right({
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      subIntent: bestMatch.subIntent,
      entities,
      context: { method: 'pattern-based' }
    });
  }

  /**
   * Keyword-based classification
   */
  private async classifyByKeywords(
    input: string,
    entities: ReadonlyArray<FinancialEntity>
  ): Promise<E.Either<IntentClassificationError, IntentClassification>> {
    const keywordMappings = this.getKeywordMappings();
    const words = input.toLowerCase().split(/\s+/);
    const scores: Map<DefiIntent, number> = new Map();

    // Score each intent based on keyword presence
    for (const [intent, keywords] of keywordMappings) {
      let score = 0;
      for (const keyword of keywords) {
        if (words.includes(keyword)) {
          score += 1;
        }
      }
      if (score > 0) {
        scores.set(intent, score / keywords.length);
      }
    }

    if (scores.size === 0) {
      return E.left(new IntentClassificationError('No keyword matches found'));
    }

    // Get the highest scoring intent
    const bestIntent = Array.from(scores.entries())
      .reduce((best, current) => current[1] > best[1] ? current : best);

    const confidence = Math.min(bestIntent[1] * 0.8, 0.9); // Cap at 0.9 for keyword-based

    return E.right({
      intent: bestIntent[0],
      confidence,
      entities,
      context: { method: 'keyword-based' }
    });
  }

  /**
   * Context-based classification
   */
  private async classifyByContext(
    input: string,
    entities: ReadonlyArray<FinancialEntity>,
    contextAnalysis: O.Option<any>
  ): Promise<E.Either<IntentClassificationError, IntentClassification>> {
    if (O.isNone(contextAnalysis)) {
      return E.left(new IntentClassificationError('No context available'));
    }

    const context = contextAnalysis.value;
    
    // Use context to infer intent
    const contextualClues = this.extractContextualClues(input, context);
    
    if (contextualClues.length === 0) {
      return E.left(new IntentClassificationError('No contextual clues found'));
    }

    // For now, use simple heuristics - can be enhanced with ML models
    const intentFromContext = this.inferIntentFromContext(contextualClues, entities);
    
    if (O.isNone(intentFromContext)) {
      return E.left(new IntentClassificationError('Unable to infer intent from context'));
    }

    return E.right({
      intent: intentFromContext.value.intent,
      confidence: intentFromContext.value.confidence,
      entities,
      context: { method: 'context-based', clues: contextualClues }
    });
  }

  /**
   * Structure-based classification
   */
  private async classifyByStructure(
    input: string,
    entities: ReadonlyArray<FinancialEntity>
  ): Promise<E.Either<IntentClassificationError, IntentClassification>> {
    // Analyze sentence structure and entity relationships
    const structure = this.analyzeStructure(input, entities);
    
    // Map structure patterns to intents
    const intentFromStructure = this.mapStructureToIntent(structure);
    
    if (O.isNone(intentFromStructure)) {
      return E.left(new IntentClassificationError('Unable to classify by structure'));
    }

    return E.right({
      intent: intentFromStructure.value.intent,
      confidence: intentFromStructure.value.confidence,
      entities,
      context: { method: 'structure-based', structure }
    });
  }

  /**
   * Select the best classification from multiple results
   */
  private selectBestClassification(
    classifications: ReadonlyArray<IntentClassification>,
    context?: ConversationContext
  ): O.Option<IntentClassification> {
    if (classifications.length === 0) {
      return O.none;
    }

    // Sort by confidence and apply context-based adjustments
    const scored = classifications.map(c => ({
      classification: c,
      score: this.calculateFinalScore(c, context)
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best.score >= this.config.minConfidence) {
      return O.some(best.classification);
    }

    return O.none;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(
    pattern: IntentPattern,
    entities: ReadonlyArray<FinancialEntity>,
    match: RegExpMatchArray
  ): number {
    let confidence = pattern.confidence;

    // Boost confidence if required entities are present
    const presentEntityTypes = new Set(entities.map(e => e.type));
    const requiredPresent = pattern.requiredEntities.filter(e => 
      presentEntityTypes.has(e)
    ).length;

    if (pattern.requiredEntities.length > 0) {
      confidence *= requiredPresent / pattern.requiredEntities.length;
    }

    // Boost for optional entities
    const optionalPresent = pattern.optionalEntities.filter(e => 
      presentEntityTypes.has(e)
    ).length;

    if (optionalPresent > 0) {
      confidence *= 1 + (optionalPresent * 0.1); // Small boost for optional entities
    }

    // Boost for full match vs partial match
    const fullMatch = match[0].trim().length / match.input!.length;
    confidence *= 0.8 + (fullMatch * 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract sub-intent from pattern match
   */
  private extractSubIntent(intent: DefiIntent, match: RegExpMatchArray): string | undefined {
    // Extract specific sub-intents based on the main intent
    switch (intent) {
      case DefiIntent.LEND:
        if (match[0].includes('optimize') || match[0].includes('best')) {
          return 'optimize';
        }
        break;
      case DefiIntent.SWAP:
        if (match[0].includes('minimal') || match[0].includes('low slippage')) {
          return 'low_slippage';
        }
        break;
      case DefiIntent.ARBITRAGE:
        if (match[0].includes('cross') || match[0].includes('between')) {
          return 'cross_protocol';
        }
        break;
    }
    return undefined;
  }

  /**
   * Get keyword mappings for each intent
   */
  private getKeywordMappings(): Map<DefiIntent, string[]> {
    return new Map([
      [DefiIntent.LEND, ['lend', 'deposit', 'supply', 'provide', 'stake']],
      [DefiIntent.BORROW, ['borrow', 'loan', 'take', 'leverage']],
      [DefiIntent.REPAY, ['repay', 'pay', 'return', 'close']],
      [DefiIntent.WITHDRAW, ['withdraw', 'remove', 'unstake', 'redeem']],
      [DefiIntent.SWAP, ['swap', 'trade', 'exchange', 'convert']],
      [DefiIntent.ADD_LIQUIDITY, ['add', 'provide', 'liquidity', 'pool']],
      [DefiIntent.REMOVE_LIQUIDITY, ['remove', 'withdraw', 'liquidity']],
      [DefiIntent.OPEN_POSITION, ['open', 'long', 'short', 'position']],
      [DefiIntent.CLOSE_POSITION, ['close', 'exit', 'position']],
      [DefiIntent.ARBITRAGE, ['arbitrage', 'profit', 'opportunity']],
      [DefiIntent.PORTFOLIO_STATUS, ['portfolio', 'status', 'balance', 'holdings']],
      [DefiIntent.RISK_ASSESSMENT, ['risk', 'health', 'safe', 'danger']],
      [DefiIntent.YIELD_OPTIMIZATION, ['optimize', 'yield', 'best', 'maximize']],
      [DefiIntent.SHOW_RATES, ['rates', 'apy', 'apr', 'yield']],
      [DefiIntent.SHOW_POSITIONS, ['positions', 'holdings', 'investments']],
      [DefiIntent.HELP, ['help', 'how', 'what', 'explain']]
    ]);
  }

  /**
   * Extract contextual clues
   */
  private extractContextualClues(input: string, context: any): string[] {
    const clues: string[] = [];
    
    // Add clues based on previous interactions
    if (context.recentActions) {
      clues.push(`recent_action:${context.recentActions[0]}`);
    }
    
    // Add clues based on current positions
    if (context.hasLendingPositions) {
      clues.push('has_lending_positions');
    }
    
    if (context.hasLiquidityPositions) {
      clues.push('has_liquidity_positions');
    }

    return clues;
  }

  /**
   * Infer intent from contextual clues
   */
  private inferIntentFromContext(
    clues: string[],
    entities: ReadonlyArray<FinancialEntity>
  ): O.Option<{ intent: DefiIntent; confidence: number }> {
    // Simple heuristic rules - can be enhanced with ML
    if (clues.includes('has_lending_positions') && entities.some(e => e.type === EntityType.AMOUNT)) {
      return O.some({ intent: DefiIntent.WITHDRAW, confidence: 0.7 });
    }

    if (clues.includes('recent_action:lend') && entities.some(e => e.type === EntityType.TOKEN)) {
      return O.some({ intent: DefiIntent.LEND, confidence: 0.8 });
    }

    return O.none;
  }

  /**
   * Analyze sentence structure
   */
  private analyzeStructure(input: string, entities: ReadonlyArray<FinancialEntity>): any {
    return {
      hasAmount: entities.some(e => e.type === EntityType.AMOUNT),
      hasToken: entities.some(e => e.type === EntityType.TOKEN),
      hasProtocol: entities.some(e => e.type === EntityType.PROTOCOL),
      hasQuestion: input.includes('?'),
      hasCommand: /^(show|get|display|check)/.test(input.toLowerCase()),
      entityCount: entities.length,
      wordCount: input.split(/\s+/).length
    };
  }

  /**
   * Map structure patterns to intents
   */
  private mapStructureToIntent(structure: any): O.Option<{ intent: DefiIntent; confidence: number }> {
    // Amount + Token usually indicates a transaction
    if (structure.hasAmount && structure.hasToken) {
      return O.some({ intent: DefiIntent.LEND, confidence: 0.6 });
    }

    // Questions about rates
    if (structure.hasQuestion && structure.hasToken) {
      return O.some({ intent: DefiIntent.SHOW_RATES, confidence: 0.7 });
    }

    // Commands typically request information
    if (structure.hasCommand) {
      return O.some({ intent: DefiIntent.SHOW_POSITIONS, confidence: 0.6 });
    }

    return O.none;
  }

  /**
   * Calculate final score with context adjustments
   */
  private calculateFinalScore(
    classification: IntentClassification,
    context?: ConversationContext
  ): number {
    let score = classification.confidence;

    // Adjust based on context
    if (context) {
      // Boost score if intent aligns with user's typical behavior
      if (this.isTypicalUserIntent(classification.intent, context)) {
        score *= 1.1;
      }

      // Adjust based on current portfolio state
      score *= this.getPortfolioStateAdjustment(classification.intent, context);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if intent is typical for user
   */
  private isTypicalUserIntent(intent: DefiIntent, context: ConversationContext): boolean {
    const recentIntents = context.conversationHistory
      .slice(-5)
      .map(turn => turn.intent);

    return recentIntents.includes(intent);
  }

  /**
   * Get portfolio state adjustment factor
   */
  private getPortfolioStateAdjustment(intent: DefiIntent, context: ConversationContext): number {
    // Boost lending intents if user has lending positions
    if (intent === DefiIntent.LEND && context.activePositions.some(p => p.type === 'lending')) {
      return 1.2;
    }

    // Boost withdrawal intents if user has large positions
    if (intent === DefiIntent.WITHDRAW && context.portfolioValue && context.portfolioValue > 10000) {
      return 1.1;
    }

    return 1.0;
  }

  /**
   * Normalize input text
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w\s$.-]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Get classification confidence level
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Validate classification result
   */
  validateClassification(classification: IntentClassification): boolean {
    return (
      classification.confidence >= this.config.minConfidence &&
      classification.entities.length <= this.config.maxEntities &&
      Object.values(DefiIntent).includes(classification.intent)
    );
  }
}