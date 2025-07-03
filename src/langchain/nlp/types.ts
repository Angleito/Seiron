/**
 * @fileoverview NLP Types and Interfaces
 * Core types for the Natural Language Processing system
 */

import { z } from 'zod';
import type { Option, Result, Either, ReadonlyRecord } from '../../types/index.js';

/**
 * DeFi Operation Intents
 */
export enum DefiIntent {
  // Lending Operations
  LEND = 'lend',
  BORROW = 'borrow',
  REPAY = 'repay',
  WITHDRAW = 'withdraw',
  
  // Liquidity Operations
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
  
  // Trading Operations
  OPEN_POSITION = 'open_position',
  CLOSE_POSITION = 'close_position',
  ADJUST_POSITION = 'adjust_position',
  
  // Arbitrage Operations
  ARBITRAGE = 'arbitrage',
  CROSS_PROTOCOL_ARBITRAGE = 'cross_protocol_arbitrage',
  
  // Portfolio Operations
  PORTFOLIO_STATUS = 'portfolio_status',
  RISK_ASSESSMENT = 'risk_assessment',
  YIELD_OPTIMIZATION = 'yield_optimization',
  REBALANCE = 'rebalance',
  
  // Information Operations
  SHOW_RATES = 'show_rates',
  SHOW_POSITIONS = 'show_positions',
  COMPARE_PROTOCOLS = 'compare_protocols',
  MARKET_ANALYSIS = 'market_analysis',
  
  // Meta Operations
  HELP = 'help',
  EXPLAIN = 'explain',
  UNKNOWN = 'unknown'
}

/**
 * Financial Entity Types
 */
export enum EntityType {
  AMOUNT = 'amount',
  TOKEN = 'token',
  PROTOCOL = 'protocol',
  TIMEFRAME = 'timeframe',
  PERCENTAGE = 'percentage',
  PRICE = 'price',
  LEVERAGE = 'leverage',
  SLIPPAGE = 'slippage',
  RISK_LEVEL = 'risk_level',
  STRATEGY = 'strategy'
}

/**
 * Intent Classification Result
 */
export interface IntentClassification {
  readonly intent: DefiIntent;
  readonly confidence: number;
  readonly subIntent?: string;
  readonly entities: ReadonlyArray<FinancialEntity>;
  readonly context?: ReadonlyRecord<string, any>;
}

/**
 * Financial Entity
 */
export interface FinancialEntity {
  readonly type: EntityType;
  readonly value: string;
  readonly normalized: string;
  readonly confidence: number;
  readonly position: readonly [number, number];
  readonly metadata?: ReadonlyRecord<string, any>;
}

/**
 * Context Information
 */
export interface ConversationContext {
  readonly userId?: string;
  readonly walletAddress?: string;
  readonly preferredProtocols: ReadonlyArray<string>;
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly portfolioValue?: number;
  readonly activePositions: ReadonlyArray<PositionInfo>;
  readonly conversationHistory: ReadonlyArray<ConversationTurn>;
}

/**
 * Position Information
 */
export interface PositionInfo {
  readonly protocol: string;
  readonly type: 'lending' | 'borrowing' | 'liquidity' | 'trading';
  readonly token: string;
  readonly amount: number;
  readonly value: number;
  readonly apy?: number;
  readonly healthFactor?: number;
}

/**
 * Conversation Turn
 */
export interface ConversationTurn {
  readonly id: string;
  readonly userMessage: string;
  readonly assistantResponse: string;
  readonly intent: DefiIntent;
  readonly timestamp: number;
  readonly successful: boolean;
}

/**
 * Disambiguation Options
 */
export interface DisambiguationOptions {
  readonly options: ReadonlyArray<DisambiguationOption>;
  readonly question: string;
  readonly timeout: number;
}

/**
 * Disambiguation Option
 */
export interface DisambiguationOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly intent: DefiIntent;
  readonly parameters: ReadonlyRecord<string, any>;
}

/**
 * NLP Processing Result
 */
export interface NLPProcessingResult {
  readonly classification: IntentClassification;
  readonly structuredCommand?: StructuredCommand;
  readonly needsDisambiguation?: DisambiguationOptions;
  readonly validationErrors?: ReadonlyArray<ValidationError>;
  readonly suggestions?: ReadonlyArray<string>;
}

/**
 * Structured Command
 */
export interface StructuredCommand {
  readonly intent: DefiIntent;
  readonly parameters: ReadonlyRecord<string, any>;
  readonly requiredConfirmation: boolean;
  readonly estimatedGas?: number;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly protocolsInvolved: ReadonlyArray<string>;
}

/**
 * Validation Error
 */
export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
}

/**
 * Intent Pattern
 */
export interface IntentPattern {
  readonly intent: DefiIntent;
  readonly patterns: ReadonlyArray<RegExp>;
  readonly requiredEntities: ReadonlyArray<EntityType>;
  readonly optionalEntities: ReadonlyArray<EntityType>;
  readonly confidence: number;
  readonly examples: ReadonlyArray<string>;
}

/**
 * Entity Extraction Rule
 */
export interface EntityExtractionRule {
  readonly type: EntityType;
  readonly pattern: RegExp;
  readonly normalizer: (value: string) => string;
  readonly validator: (value: string) => boolean;
  readonly confidence: number;
}

/**
 * Natural Language Patterns
 */
export interface NLPatterns {
  readonly lending: ReadonlyArray<IntentPattern>;
  readonly liquidity: ReadonlyArray<IntentPattern>;
  readonly trading: ReadonlyArray<IntentPattern>;
  readonly arbitrage: ReadonlyArray<IntentPattern>;
  readonly portfolio: ReadonlyArray<IntentPattern>;
  readonly information: ReadonlyArray<IntentPattern>;
}

/**
 * Zod Schemas for Validation
 */
export const FinancialEntitySchema = z.object({
  type: z.nativeEnum(EntityType),
  value: z.string(),
  normalized: z.string(),
  confidence: z.number().min(0).max(1),
  position: z.tuple([z.number(), z.number()]),
  metadata: z.record(z.any()).optional()
});

export const IntentClassificationSchema = z.object({
  intent: z.nativeEnum(DefiIntent),
  confidence: z.number().min(0).max(1),
  subIntent: z.string().optional(),
  entities: z.array(FinancialEntitySchema),
  context: z.record(z.any()).optional()
});

export const StructuredCommandSchema = z.object({
  intent: z.nativeEnum(DefiIntent),
  parameters: z.record(z.any()),
  requiredConfirmation: z.boolean(),
  estimatedGas: z.number().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  protocolsInvolved: z.array(z.string())
});

/**
 * Type Guards
 */
export function isFinancialEntity(entity: any): entity is FinancialEntity {
  return FinancialEntitySchema.safeParse(entity).success;
}

export function isIntentClassification(classification: any): classification is IntentClassification {
  return IntentClassificationSchema.safeParse(classification).success;
}

export function isStructuredCommand(command: any): command is StructuredCommand {
  return StructuredCommandSchema.safeParse(command).success;
}

/**
 * Utility Types
 */
export type IntentConfidence = 'high' | 'medium' | 'low';
export type ProcessingMode = 'strict' | 'flexible' | 'experimental';

/**
 * Configuration
 */
export interface NLPConfig {
  readonly mode: ProcessingMode;
  readonly minConfidence: number;
  readonly enableDisambiguation: boolean;
  readonly maxEntities: number;
  readonly timeoutMs: number;
  readonly fallbackToKeywords: boolean;
}

/**
 * Error Types
 */
export class NLPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: ReadonlyRecord<string, any>
  ) {
    super(message);
    this.name = 'NLPError';
  }
}

export class EntityExtractionError extends NLPError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'ENTITY_EXTRACTION_ERROR', details);
    this.name = 'EntityExtractionError';
  }
}

export class IntentClassificationError extends NLPError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'INTENT_CLASSIFICATION_ERROR', details);
    this.name = 'IntentClassificationError';
  }
}

export class ValidationError extends NLPError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}