import { z } from 'zod';
import type { ReadonlyRecord } from '../../types/index.js';
export declare enum DefiIntent {
    LEND = "lend",
    BORROW = "borrow",
    REPAY = "repay",
    WITHDRAW = "withdraw",
    ADD_LIQUIDITY = "add_liquidity",
    REMOVE_LIQUIDITY = "remove_liquidity",
    SWAP = "swap",
    OPEN_POSITION = "open_position",
    CLOSE_POSITION = "close_position",
    ADJUST_POSITION = "adjust_position",
    ARBITRAGE = "arbitrage",
    CROSS_PROTOCOL_ARBITRAGE = "cross_protocol_arbitrage",
    PORTFOLIO_STATUS = "portfolio_status",
    RISK_ASSESSMENT = "risk_assessment",
    YIELD_OPTIMIZATION = "yield_optimization",
    REBALANCE = "rebalance",
    SHOW_RATES = "show_rates",
    SHOW_POSITIONS = "show_positions",
    COMPARE_PROTOCOLS = "compare_protocols",
    MARKET_ANALYSIS = "market_analysis",
    HELP = "help",
    EXPLAIN = "explain",
    UNKNOWN = "unknown"
}
export declare enum EntityType {
    AMOUNT = "amount",
    TOKEN = "token",
    PROTOCOL = "protocol",
    TIMEFRAME = "timeframe",
    PERCENTAGE = "percentage",
    PRICE = "price",
    LEVERAGE = "leverage",
    SLIPPAGE = "slippage",
    RISK_LEVEL = "risk_level",
    STRATEGY = "strategy"
}
export interface IntentClassification {
    readonly intent: DefiIntent;
    readonly confidence: number;
    readonly subIntent?: string;
    readonly entities: ReadonlyArray<FinancialEntity>;
    readonly context?: ReadonlyRecord<string, any>;
}
export interface FinancialEntity {
    readonly type: EntityType;
    readonly value: string;
    readonly normalized: string;
    readonly confidence: number;
    readonly position: readonly [number, number];
    readonly metadata?: ReadonlyRecord<string, any>;
}
export interface ConversationContext {
    readonly userId?: string;
    readonly walletAddress?: string;
    readonly preferredProtocols: ReadonlyArray<string>;
    readonly riskTolerance: 'low' | 'medium' | 'high';
    readonly portfolioValue?: number;
    readonly activePositions: ReadonlyArray<PositionInfo>;
    readonly conversationHistory: ReadonlyArray<ConversationTurn>;
}
export interface PositionInfo {
    readonly protocol: string;
    readonly type: 'lending' | 'borrowing' | 'liquidity' | 'trading';
    readonly token: string;
    readonly amount: number;
    readonly value: number;
    readonly apy?: number;
    readonly healthFactor?: number;
}
export interface ConversationTurn {
    readonly id: string;
    readonly userMessage: string;
    readonly assistantResponse: string;
    readonly intent: DefiIntent;
    readonly timestamp: number;
    readonly successful: boolean;
}
export interface DisambiguationOptions {
    readonly options: ReadonlyArray<DisambiguationOption>;
    readonly question: string;
    readonly timeout: number;
}
export interface DisambiguationOption {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly intent: DefiIntent;
    readonly parameters: ReadonlyRecord<string, any>;
}
export interface NLPProcessingResult {
    readonly classification: IntentClassification;
    readonly structuredCommand?: StructuredCommand;
    readonly needsDisambiguation?: DisambiguationOptions;
    readonly validationErrors?: ReadonlyArray<ValidationError>;
    readonly suggestions?: ReadonlyArray<string>;
}
export interface StructuredCommand {
    readonly intent: DefiIntent;
    readonly parameters: ReadonlyRecord<string, any>;
    readonly requiredConfirmation: boolean;
    readonly estimatedGas?: number;
    readonly riskLevel: 'low' | 'medium' | 'high';
    readonly protocolsInvolved: ReadonlyArray<string>;
}
export interface ValidationError {
    readonly field: string;
    readonly code: string;
    readonly message: string;
    readonly suggestion?: string;
}
export interface IntentPattern {
    readonly intent: DefiIntent;
    readonly patterns: ReadonlyArray<RegExp>;
    readonly requiredEntities: ReadonlyArray<EntityType>;
    readonly optionalEntities: ReadonlyArray<EntityType>;
    readonly confidence: number;
    readonly examples: ReadonlyArray<string>;
}
export interface EntityExtractionRule {
    readonly type: EntityType;
    readonly pattern: RegExp;
    readonly normalizer: (value: string) => string;
    readonly validator: (value: string) => boolean;
    readonly confidence: number;
}
export interface NLPatterns {
    readonly lending: ReadonlyArray<IntentPattern>;
    readonly liquidity: ReadonlyArray<IntentPattern>;
    readonly trading: ReadonlyArray<IntentPattern>;
    readonly arbitrage: ReadonlyArray<IntentPattern>;
    readonly portfolio: ReadonlyArray<IntentPattern>;
    readonly information: ReadonlyArray<IntentPattern>;
}
export declare const FinancialEntitySchema: z.ZodObject<{
    type: z.ZodNativeEnum<typeof EntityType>;
    value: z.ZodString;
    normalized: z.ZodString;
    confidence: z.ZodNumber;
    position: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type?: EntityType;
    value?: string;
    confidence?: number;
    position?: [number, number, ...unknown[]];
    metadata?: Record<string, any>;
    normalized?: string;
}, {
    type?: EntityType;
    value?: string;
    confidence?: number;
    position?: [number, number, ...unknown[]];
    metadata?: Record<string, any>;
    normalized?: string;
}>;
export declare const IntentClassificationSchema: z.ZodObject<{
    intent: z.ZodNativeEnum<typeof DefiIntent>;
    confidence: z.ZodNumber;
    subIntent: z.ZodOptional<z.ZodString>;
    entities: z.ZodArray<z.ZodObject<{
        type: z.ZodNativeEnum<typeof EntityType>;
        value: z.ZodString;
        normalized: z.ZodString;
        confidence: z.ZodNumber;
        position: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type?: EntityType;
        value?: string;
        confidence?: number;
        position?: [number, number, ...unknown[]];
        metadata?: Record<string, any>;
        normalized?: string;
    }, {
        type?: EntityType;
        value?: string;
        confidence?: number;
        position?: [number, number, ...unknown[]];
        metadata?: Record<string, any>;
        normalized?: string;
    }>, "many">;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    context?: Record<string, any>;
    intent?: DefiIntent;
    entities?: {
        type?: EntityType;
        value?: string;
        confidence?: number;
        position?: [number, number, ...unknown[]];
        metadata?: Record<string, any>;
        normalized?: string;
    }[];
    subIntent?: string;
}, {
    confidence?: number;
    context?: Record<string, any>;
    intent?: DefiIntent;
    entities?: {
        type?: EntityType;
        value?: string;
        confidence?: number;
        position?: [number, number, ...unknown[]];
        metadata?: Record<string, any>;
        normalized?: string;
    }[];
    subIntent?: string;
}>;
export declare const StructuredCommandSchema: z.ZodObject<{
    intent: z.ZodNativeEnum<typeof DefiIntent>;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    requiredConfirmation: z.ZodBoolean;
    estimatedGas: z.ZodOptional<z.ZodNumber>;
    riskLevel: z.ZodEnum<["low", "medium", "high"]>;
    protocolsInvolved: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    estimatedGas?: number;
    intent?: DefiIntent;
    parameters?: Record<string, any>;
    riskLevel?: "low" | "medium" | "high";
    requiredConfirmation?: boolean;
    protocolsInvolved?: string[];
}, {
    estimatedGas?: number;
    intent?: DefiIntent;
    parameters?: Record<string, any>;
    riskLevel?: "low" | "medium" | "high";
    requiredConfirmation?: boolean;
    protocolsInvolved?: string[];
}>;
export declare function isFinancialEntity(entity: any): entity is FinancialEntity;
export declare function isIntentClassification(classification: any): classification is IntentClassification;
export declare function isStructuredCommand(command: any): command is StructuredCommand;
export type IntentConfidence = 'high' | 'medium' | 'low';
export type ProcessingMode = 'strict' | 'flexible' | 'experimental';
export interface NLPConfig {
    readonly mode: ProcessingMode;
    readonly minConfidence: number;
    readonly enableDisambiguation: boolean;
    readonly maxEntities: number;
    readonly timeoutMs: number;
    readonly fallbackToKeywords: boolean;
}
export declare class NLPError extends Error {
    readonly code: string;
    readonly details?: ReadonlyRecord<string, any>;
    constructor(message: string, code: string, details?: ReadonlyRecord<string, any>);
}
export declare class EntityExtractionError extends NLPError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export declare class IntentClassificationError extends NLPError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export declare class ValidationError extends NLPError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
//# sourceMappingURL=types.d.ts.map