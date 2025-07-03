/**
 * @fileoverview Context Preservation System
 * Maintains context across conversation turns and manages memory efficiently
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

import { DefiIntent, FinancialEntity } from '../nlp/types.js';
import {
  ConversationSession,
  ConversationTurn,
  ConversationSessionContext,
  ContextCarryover,
  PendingAction,
  UnresolvedItem,
  ContextPreservationConfig,
  ContextError
} from './types.js';

/**
 * Context Preservation Manager
 */
export class ContextPreservation {
  private readonly config: ContextPreservationConfig;
  private readonly contextCache: Map<string, ConversationSessionContext>;
  private readonly compressionEngine: ContextCompressionEngine;
  private readonly relevanceScorer: RelevanceScorer;

  constructor(config: ContextPreservationConfig) {
    this.config = config;
    this.contextCache = new Map();
    this.compressionEngine = new ContextCompressionEngine(config);
    this.relevanceScorer = new RelevanceScorer();
  }

  /**
   * Update context with new conversation turn
   */
  async updateContext(
    session: ConversationSession,
    newTurn: ConversationTurn
  ): Promise<E.Either<ContextError, ConversationSessionContext>> {
    try {
      const currentContext = session.context;
      
      // Extract information from the new turn
      const extractedInfo = await this.extractTurnInformation(newTurn);
      
      // Update context components
      const updatedContext: ConversationSessionContext = {
        user: currentContext.user,
        financial: await this.updateFinancialContext(currentContext.financial, extractedInfo),
        preferences: await this.updatePreferences(currentContext.preferences, extractedInfo),
        history: await this.updateHistory(currentContext.history, newTurn, extractedInfo),
        carryover: await this.updateCarryover(currentContext.carryover, extractedInfo)
      };

      // Apply context compression if needed
      const finalContext = await this.applyContextCompression(updatedContext, session);

      // Cache the updated context
      this.contextCache.set(session.id, finalContext);

      return E.right(finalContext);

    } catch (error) {
      return E.left(new ContextError(
        'Failed to update context',
        { originalError: error, sessionId: session.id, turnId: newTurn.id }
      ));
    }
  }

  /**
   * Retrieve relevant context for processing
   */
  async getRelevantContext(
    session: ConversationSession,
    currentInput: string,
    intent?: DefiIntent
  ): Promise<E.Either<ContextError, RelevantContext>> {
    try {
      const fullContext = this.contextCache.get(session.id) || session.context;
      
      // Score relevance of context elements
      const relevanceScores = await this.relevanceScorer.scoreContext(
        fullContext,
        currentInput,
        intent
      );

      // Extract most relevant elements
      const relevantContext: RelevantContext = {
        recentTurns: this.getRecentTurns(session.turns, 5),
        relevantEntities: this.getRelevantEntities(fullContext.carryover, relevanceScores),
        activeParameters: this.getActiveParameters(fullContext.carryover),
        userPreferences: fullContext.preferences,
        financialSnapshot: this.getFinancialSnapshot(fullContext.financial),
        pendingActions: this.getActivePendingActions(fullContext.carryover.pendingActions)
      };

      return E.right(relevantContext);

    } catch (error) {
      return E.left(new ContextError(
        'Failed to retrieve relevant context',
        { originalError: error, sessionId: session.id }
      ));
    }
  }

  /**
   * Preserve context across sessions
   */
  async preserveContext(
    sessionId: string,
    context: ConversationSessionContext
  ): Promise<E.Either<ContextError, boolean>> {
    try {
      // Compress context for long-term storage
      const compressedContext = await this.compressionEngine.compressForStorage(context);
      
      // Store in cache with timestamp
      this.contextCache.set(sessionId, {
        ...compressedContext,
        history: {
          ...compressedContext.history,
          lastInteraction: Date.now()
        }
      });

      // In a real implementation, this would also persist to database
      return E.right(true);

    } catch (error) {
      return E.left(new ContextError(
        'Failed to preserve context',
        { originalError: error, sessionId }
      ));
    }
  }

  /**
   * Restore context from previous session
   */
  async restoreContext(sessionId: string): Promise<O.Option<ConversationSessionContext>> {
    try {
      const cachedContext = this.contextCache.get(sessionId);
      
      if (!cachedContext) {
        return O.none;
      }

      // Check if context is still valid (not too old)
      const timeSinceLastInteraction = Date.now() - cachedContext.history.lastInteraction;
      if (timeSinceLastInteraction > this.config.maxAge) {
        this.contextCache.delete(sessionId);
        return O.none;
      }

      // Decompress context if needed
      const restoredContext = await this.compressionEngine.decompressContext(cachedContext);
      
      return O.some(restoredContext);

    } catch (error) {
      return O.none;
    }
  }

  /**
   * Clean up old contexts
   */
  async cleanupOldContexts(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [sessionId, context] of this.contextCache.entries()) {
      const age = now - context.history.lastInteraction;
      
      if (age > this.config.maxAge) {
        this.contextCache.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Extract information from conversation turn
   */
  private async extractTurnInformation(turn: ConversationTurn): Promise<ExtractedTurnInfo> {
    return {
      intent: turn.intent,
      entities: turn.entities || [],
      parameters: this.extractParametersFromTurn(turn),
      mentions: this.extractMentions(turn.content),
      errors: turn.metadata.errors || [],
      success: !turn.metadata.errors || turn.metadata.errors.length === 0
    };
  }

  /**
   * Update financial context
   */
  private async updateFinancialContext(
    current: any,
    extracted: ExtractedTurnInfo
  ): Promise<any> {
    // Update based on new information
    const updated = { ...current };

    // Update mentioned tokens
    if (extracted.mentions.tokens.length > 0) {
      // In a real implementation, this would fetch updated balances
      // For now, we'll just note the tokens of interest
    }

    // Update protocols mentioned
    if (extracted.mentions.protocols.length > 0) {
      updated.activeProtocols = Array.from(new Set([
        ...updated.activeProtocols,
        ...extracted.mentions.protocols
      ]));
    }

    return updated;
  }

  /**
   * Update user preferences
   */
  private async updatePreferences(
    current: any,
    extracted: ExtractedTurnInfo
  ): Promise<any> {
    const updated = { ...current };

    // Learn from user behavior
    if (extracted.parameters.protocol) {
      updated.defaultProtocol = extracted.parameters.protocol;
    }

    if (extracted.parameters.slippage) {
      updated.preferredSlippage = parseFloat(extracted.parameters.slippage);
    }

    return updated;
  }

  /**
   * Update conversation history
   */
  private async updateHistory(
    current: any,
    turn: ConversationTurn,
    extracted: ExtractedTurnInfo
  ): Promise<any> {
    const updated = { ...current };

    // Add to recent intents
    if (extracted.intent) {
      updated.recentIntents = [
        extracted.intent,
        ...updated.recentIntents.slice(0, 9) // Keep last 10
      ];
    }

    // Track successful/failed commands
    if (turn.command) {
      if (extracted.success) {
        updated.successfulCommands = [
          turn.command.id,
          ...updated.successfulCommands.slice(0, 19) // Keep last 20
        ];
      } else {
        updated.failedCommands = [
          turn.command.id,
          ...updated.failedCommands.slice(0, 19) // Keep last 20
        ];
      }
    }

    updated.lastInteraction = turn.timestamp;

    return updated;
  }

  /**
   * Update context carryover
   */
  private async updateCarryover(
    current: ContextCarryover,
    extracted: ExtractedTurnInfo
  ): Promise<ContextCarryover> {
    const updated: ContextCarryover = {
      mentionedTokens: this.updateMentionedItems(
        current.mentionedTokens,
        extracted.mentions.tokens
      ),
      mentionedProtocols: this.updateMentionedItems(
        current.mentionedProtocols,
        extracted.mentions.protocols
      ),
      mentionedAmounts: this.updateMentionedItems(
        current.mentionedAmounts,
        extracted.mentions.amounts
      ),
      pendingActions: await this.updatePendingActions(
        current.pendingActions,
        extracted
      ),
      unresolved: await this.updateUnresolvedItems(
        current.unresolved,
        extracted
      )
    };

    return updated;
  }

  /**
   * Update mentioned items with recency weighting
   */
  private updateMentionedItems(
    current: ReadonlyArray<string>,
    newItems: ReadonlyArray<string>
  ): ReadonlyArray<string> {
    const updated = [...newItems];
    
    // Add existing items that aren't duplicates
    for (const item of current) {
      if (!newItems.includes(item)) {
        updated.push(item);
      }
    }

    // Keep only most recent items
    return updated.slice(0, 10);
  }

  /**
   * Update pending actions
   */
  private async updatePendingActions(
    current: ReadonlyArray<PendingAction>,
    extracted: ExtractedTurnInfo
  ): Promise<ReadonlyArray<PendingAction>> {
    const updated = [...current];

    // Remove expired actions
    const now = Date.now();
    const nonExpired = updated.filter(action => 
      !action.expiresAt || action.expiresAt > now
    );

    // Add new pending action if needed
    if (extracted.intent && !extracted.success) {
      const newAction: PendingAction = {
        id: `pending_${Date.now()}`,
        intent: extracted.intent,
        parameters: extracted.parameters,
        reason: 'Parameters incomplete or validation failed',
        priority: 'medium',
        timestamp: now,
        expiresAt: now + (30 * 60 * 1000) // 30 minutes
      };
      
      nonExpired.push(newAction);
    }

    return nonExpired;
  }

  /**
   * Update unresolved items
   */
  private async updateUnresolvedItems(
    current: ReadonlyArray<UnresolvedItem>,
    extracted: ExtractedTurnInfo
  ): Promise<ReadonlyArray<UnresolvedItem>> {
    const updated = [...current];

    // Add unresolved items based on errors
    if (extracted.errors.length > 0) {
      extracted.errors.forEach(error => {
        const unresolvedItem: UnresolvedItem = {
          id: `unresolved_${Date.now()}_${Math.random()}`,
          type: 'clarification',
          description: error,
          context: extracted.parameters,
          timestamp: Date.now()
        };
        
        updated.push(unresolvedItem);
      });
    }

    // Keep only recent unresolved items
    return updated.slice(-5);
  }

  /**
   * Apply context compression
   */
  private async applyContextCompression(
    context: ConversationSessionContext,
    session: ConversationSession
  ): Promise<ConversationSessionContext> {
    // Check if compression is needed
    if (session.turns.length < this.config.compressionThreshold) {
      return context;
    }

    return this.compressionEngine.compressContext(context);
  }

  /**
   * Extract parameters from turn
   */
  private extractParametersFromTurn(turn: ConversationTurn): Record<string, any> {
    const parameters: Record<string, any> = {};

    if (turn.command) {
      Object.assign(parameters, turn.command.parameters.primary);
    }

    if (turn.entities) {
      turn.entities.forEach((entity: any) => {
        switch (entity.type) {
          case 'amount':
            parameters.amount = entity.normalized;
            break;
          case 'token':
            parameters.token = entity.normalized;
            break;
          case 'protocol':
            parameters.protocol = entity.normalized;
            break;
        }
      });
    }

    return parameters;
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): {
    tokens: string[];
    protocols: string[];
    amounts: string[];
  } {
    const mentions = {
      tokens: [] as string[],
      protocols: [] as string[],
      amounts: [] as string[]
    };

    // Extract token mentions
    const tokenMatches = content.match(/\b(USDC|USDT|SEI|ETH|BTC|ATOM|OSMO)\b/gi);
    if (tokenMatches) {
      mentions.tokens = Array.from(new Set(tokenMatches.map(t => t.toUpperCase())));
    }

    // Extract protocol mentions
    const protocolMatches = content.match(/\b(dragonswap|symphony|citrex|silo|takara)\b/gi);
    if (protocolMatches) {
      mentions.protocols = Array.from(new Set(protocolMatches.map(p => p.toLowerCase())));
    }

    // Extract amount mentions
    const amountMatches = content.match(/\b\d+(?:\.\d+)?\b/g);
    if (amountMatches) {
      mentions.amounts = Array.from(new Set(amountMatches));
    }

    return mentions;
  }

  /**
   * Get recent turns
   */
  private getRecentTurns(
    turns: ReadonlyArray<ConversationTurn>,
    count: number
  ): ReadonlyArray<ConversationTurn> {
    return turns.slice(-count);
  }

  /**
   * Get relevant entities based on scores
   */
  private getRelevantEntities(
    carryover: ContextCarryover,
    scores: RelevanceScores
  ): ReadonlyArray<string> {
    const relevant: string[] = [];

    // Add high-scoring tokens
    carryover.mentionedTokens.forEach((token, index) => {
      if (scores.tokenRelevance[index] > 0.5) {
        relevant.push(token);
      }
    });

    // Add high-scoring protocols
    carryover.mentionedProtocols.forEach((protocol, index) => {
      if (scores.protocolRelevance[index] > 0.5) {
        relevant.push(protocol);
      }
    });

    return relevant;
  }

  /**
   * Get active parameters
   */
  private getActiveParameters(carryover: ContextCarryover): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract from recent pending actions
    const recentActions = carryover.pendingActions.slice(0, 3);
    recentActions.forEach(action => {
      Object.assign(parameters, action.parameters);
    });

    return parameters;
  }

  /**
   * Get financial snapshot
   */
  private getFinancialSnapshot(financial: any): any {
    return {
      totalValue: financial.portfolioValue,
      activeProtocols: financial.activeProtocols,
      riskLevel: financial.riskTolerance,
      hasPositions: financial.positions.length > 0
    };
  }

  /**
   * Get active pending actions
   */
  private getActivePendingActions(
    actions: ReadonlyArray<PendingAction>
  ): ReadonlyArray<PendingAction> {
    const now = Date.now();
    return actions.filter(action => 
      !action.expiresAt || action.expiresAt > now
    );
  }
}

/**
 * Extracted Turn Information
 */
interface ExtractedTurnInfo {
  readonly intent?: DefiIntent;
  readonly entities: ReadonlyArray<FinancialEntity>;
  readonly parameters: Record<string, any>;
  readonly mentions: {
    readonly tokens: ReadonlyArray<string>;
    readonly protocols: ReadonlyArray<string>;
    readonly amounts: ReadonlyArray<string>;
  };
  readonly errors: ReadonlyArray<string>;
  readonly success: boolean;
}

/**
 * Relevant Context
 */
interface RelevantContext {
  readonly recentTurns: ReadonlyArray<ConversationTurn>;
  readonly relevantEntities: ReadonlyArray<string>;
  readonly activeParameters: Record<string, any>;
  readonly userPreferences: any;
  readonly financialSnapshot: any;
  readonly pendingActions: ReadonlyArray<PendingAction>;
}

/**
 * Relevance Scores
 */
interface RelevanceScores {
  readonly tokenRelevance: ReadonlyArray<number>;
  readonly protocolRelevance: ReadonlyArray<number>;
  readonly parameterRelevance: ReadonlyArray<number>;
  readonly actionRelevance: ReadonlyArray<number>;
}

/**
 * Context Compression Engine
 */
class ContextCompressionEngine {
  constructor(private readonly config: ContextPreservationConfig) {}

  async compressContext(context: ConversationSessionContext): Promise<ConversationSessionContext> {
    // Compress history by keeping only most important elements
    const compressedHistory = {
      ...context.history,
      recentIntents: context.history.recentIntents.slice(0, 5),
      successfulCommands: context.history.successfulCommands.slice(0, 10),
      failedCommands: context.history.failedCommands.slice(0, 10)
    };

    // Compress carryover by removing old items
    const compressedCarryover = {
      ...context.carryover,
      mentionedTokens: context.carryover.mentionedTokens.slice(0, 5),
      mentionedProtocols: context.carryover.mentionedProtocols.slice(0, 3),
      mentionedAmounts: context.carryover.mentionedAmounts.slice(0, 5),
      pendingActions: context.carryover.pendingActions.slice(0, 3),
      unresolved: context.carryover.unresolved.slice(0, 3)
    };

    return {
      ...context,
      history: compressedHistory,
      carryover: compressedCarryover
    };
  }

  async compressForStorage(context: ConversationSessionContext): Promise<ConversationSessionContext> {
    // More aggressive compression for storage
    return this.compressContext(context);
  }

  async decompressContext(context: ConversationSessionContext): Promise<ConversationSessionContext> {
    // Currently just returns the context as-is
    // In a real implementation, this might expand compressed data
    return context;
  }
}

/**
 * Relevance Scorer
 */
class RelevanceScorer {
  async scoreContext(
    context: ConversationSessionContext,
    currentInput: string,
    intent?: DefiIntent
  ): Promise<RelevanceScores> {
    const inputLower = currentInput.toLowerCase();

    // Score token relevance
    const tokenRelevance = context.carryover.mentionedTokens.map(token => {
      let score = 0.3; // Base score for mentioned tokens
      
      if (inputLower.includes(token.toLowerCase())) {
        score += 0.5; // Boost if mentioned in current input
      }
      
      if (intent && this.isTokenRelevantToIntent(token, intent)) {
        score += 0.3; // Boost if relevant to current intent
      }
      
      return Math.min(score, 1.0);
    });

    // Score protocol relevance
    const protocolRelevance = context.carryover.mentionedProtocols.map(protocol => {
      let score = 0.3; // Base score
      
      if (inputLower.includes(protocol.toLowerCase())) {
        score += 0.5;
      }
      
      if (intent && this.isProtocolRelevantToIntent(protocol, intent)) {
        score += 0.3;
      }
      
      return Math.min(score, 1.0);
    });

    return {
      tokenRelevance,
      protocolRelevance,
      parameterRelevance: [], // Would be implemented
      actionRelevance: [] // Would be implemented
    };
  }

  private isTokenRelevantToIntent(token: string, intent: DefiIntent): boolean {
    // All tokens are relevant to most financial intents
    return [
      DefiIntent.LEND,
      DefiIntent.BORROW,
      DefiIntent.SWAP,
      DefiIntent.ADD_LIQUIDITY,
      DefiIntent.REMOVE_LIQUIDITY
    ].includes(intent);
  }

  private isProtocolRelevantToIntent(protocol: string, intent: DefiIntent): boolean {
    const protocolIntents: Record<string, DefiIntent[]> = {
      'silo': [DefiIntent.LEND, DefiIntent.BORROW],
      'takara': [DefiIntent.LEND, DefiIntent.BORROW],
      'dragonswap': [DefiIntent.SWAP, DefiIntent.ADD_LIQUIDITY],
      'symphony': [DefiIntent.SWAP, DefiIntent.ADD_LIQUIDITY],
      'citrex': [DefiIntent.OPEN_POSITION, DefiIntent.CLOSE_POSITION]
    };

    return protocolIntents[protocol]?.includes(intent) || false;
  }
}