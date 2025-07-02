/**
 * @fileoverview Chat interface type definitions
 * Defines types for chat messages, commands, and responses
 */

import type { 
  Option, 
  Result, 
  Timestamp,
  TokenInfo,
  ReadonlyRecord,
  Either
} from '../types/index.js';

/**
 * Chat message types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp: Timestamp;
  readonly metadata?: ReadonlyRecord<string, unknown>;
};

/**
 * Command types
 */
export type CommandType = 
  | 'supply'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'adjust_range'
  | 'show_positions'
  | 'check_rates'
  | 'portfolio_status'
  | 'help'
  | 'unknown';

export type CommandCategory = 'lending' | 'liquidity' | 'info' | 'system';

/**
 * Base command structure
 */
export interface BaseCommand {
  readonly type: CommandType;
  readonly category: CommandCategory;
  readonly raw: string;
  readonly confidence: number; // 0-1 confidence score
}

/**
 * Lending command parameters
 */
export interface LendingCommandParams {
  readonly amount: string;
  readonly token: string;
  readonly protocol?: string;
}

export interface LendingCommand extends BaseCommand {
  readonly category: 'lending';
  readonly type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  readonly params: LendingCommandParams;
}

/**
 * Liquidity command parameters
 */
export interface LiquidityCommandParams {
  readonly token0?: string;
  readonly token1?: string;
  readonly amount0?: string;
  readonly amount1?: string;
  readonly poolId?: string;
  readonly rangeMin?: number;
  readonly rangeMax?: number;
  readonly protocol?: string;
}

export interface LiquidityCommand extends BaseCommand {
  readonly category: 'liquidity';
  readonly type: 'add_liquidity' | 'remove_liquidity' | 'adjust_range';
  readonly params: LiquidityCommandParams;
}

/**
 * Info command parameters
 */
export interface InfoCommandParams {
  readonly filter?: string;
  readonly protocol?: string;
  readonly token?: string;
  readonly timeframe?: '24h' | '7d' | '30d' | 'all';
}

export interface InfoCommand extends BaseCommand {
  readonly category: 'info';
  readonly type: 'show_positions' | 'check_rates' | 'portfolio_status';
  readonly params: InfoCommandParams;
}

/**
 * Union type for all commands
 */
export type Command = LendingCommand | LiquidityCommand | InfoCommand;

/**
 * Command parsing result
 */
export type ParsedCommand = Result<Command, ParseError>;

export type ParseError = {
  readonly code: 'INVALID_AMOUNT' | 'UNKNOWN_TOKEN' | 'MISSING_PARAMS' | 'PARSE_ERROR';
  readonly message: string;
  readonly details?: ReadonlyRecord<string, unknown>;
};

/**
 * Command execution result
 */
export type ExecutionResult = {
  readonly success: boolean;
  readonly message: string;
  readonly data?: ReadonlyRecord<string, unknown>;
  readonly txHash?: string;
  readonly error?: Error;
};

/**
 * Chat response types
 */
export type ResponseType = 'text' | 'transaction' | 'data' | 'error' | 'help';

export interface ChatResponse {
  readonly type: ResponseType;
  readonly content: string;
  readonly data?: ResponseData;
  readonly suggestions?: ReadonlyArray<string>;
}

export type ResponseData = 
  | PositionData
  | RateData
  | TransactionData
  | PortfolioData;

/**
 * Position data for responses
 */
export interface PositionData {
  readonly type: 'position';
  readonly positions: ReadonlyArray<{
    readonly protocol: string;
    readonly type: 'lending' | 'liquidity';
    readonly token: string;
    readonly amount: string;
    readonly value: string;
    readonly apy?: number;
    readonly health?: number;
  }>;
}

/**
 * Rate data for responses
 */
export interface RateData {
  readonly type: 'rates';
  readonly rates: ReadonlyArray<{
    readonly protocol: string;
    readonly token: string;
    readonly supplyAPY: number;
    readonly borrowAPY: number;
    readonly utilization: number;
    readonly totalSupply: string;
    readonly totalBorrow: string;
  }>;
}

/**
 * Transaction data for responses
 */
export interface TransactionData {
  readonly type: 'transaction';
  readonly txHash: string;
  readonly status: 'pending' | 'success' | 'failed';
  readonly action: string;
  readonly details: ReadonlyRecord<string, unknown>;
}

/**
 * Portfolio data for responses
 */
export interface PortfolioData {
  readonly type: 'portfolio';
  readonly totalValue: string;
  readonly suppliedValue: string;
  readonly borrowedValue: string;
  readonly liquidityValue: string;
  readonly healthFactor?: number;
  readonly netAPY: number;
}

/**
 * Intent detection types
 */
export interface UserIntent {
  readonly primary: CommandType;
  readonly confidence: number;
  readonly entities: ReadonlyArray<Entity>;
  readonly context?: IntentContext;
}

export interface Entity {
  readonly type: 'amount' | 'token' | 'protocol' | 'percentage' | 'time';
  readonly value: string;
  readonly normalized: string;
  readonly position: [number, number]; // start, end indices
}

export interface IntentContext {
  readonly previousCommand?: Command;
  readonly activePositions?: ReadonlyArray<string>;
  readonly userPreferences?: ReadonlyRecord<string, unknown>;
}

/**
 * Natural language patterns
 */
export interface NLPPattern {
  readonly pattern: RegExp;
  readonly intent: CommandType;
  readonly extractor: (match: RegExpMatchArray) => Option<ReadonlyRecord<string, string>>;
}

/**
 * Chat session state
 */
export interface ChatSession {
  readonly id: string;
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly context: SessionContext;
  readonly startTime: Timestamp;
  readonly lastActivity: Timestamp;
}

export interface SessionContext {
  readonly walletAddress?: string;
  readonly activeProtocols: ReadonlyArray<string>;
  readonly lastCommand?: Command;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly defaultProtocol?: string;
  readonly slippageTolerance?: number;
  readonly gasPreference?: 'low' | 'medium' | 'high';
  readonly confirmTransactions?: boolean;
}

/**
 * Type guards
 */
export const isLendingCommand = (cmd: Command): cmd is LendingCommand =>
  cmd.category === 'lending';

export const isLiquidityCommand = (cmd: Command): cmd is LiquidityCommand =>
  cmd.category === 'liquidity';

export const isInfoCommand = (cmd: Command): cmd is InfoCommand =>
  cmd.category === 'info';

export const hasPositionData = (data: ResponseData): data is PositionData =>
  data.type === 'position';

export const hasRateData = (data: ResponseData): data is RateData =>
  data.type === 'rates';

export const hasTransactionData = (data: ResponseData): data is TransactionData =>
  data.type === 'transaction';

export const hasPortfolioData = (data: ResponseData): data is PortfolioData =>
  data.type === 'portfolio';