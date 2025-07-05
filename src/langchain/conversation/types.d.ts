import { z } from 'zod';
import type { Result, ReadonlyRecord } from '../../types/index.js';
import { DefiIntent } from '../nlp/types.js';
import { ExecutableCommand } from '../processing/types.js';
export declare enum ConversationState {
    INITIAL = "initial",
    EXPLORING = "exploring",
    CLARIFYING = "clarifying",
    CONFIRMING = "confirming",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    WAITING_INPUT = "waiting_input"
}
export declare enum FlowStage {
    DISCOVERY = "discovery",
    PARAMETER_GATHERING = "parameter_gathering",
    VALIDATION = "validation",
    RISK_ASSESSMENT = "risk_assessment",
    CONFIRMATION = "confirmation",
    EXECUTION = "execution",
    FOLLOW_UP = "follow_up"
}
export interface ConversationSession {
    readonly id: string;
    readonly userId?: string;
    readonly state: ConversationState;
    readonly stage: FlowStage;
    readonly turns: ReadonlyArray<ConversationTurn>;
    readonly context: ConversationSessionContext;
    readonly activeFlow?: ConversationFlow;
    readonly metadata: SessionMetadata;
    readonly startTime: number;
    readonly lastActivity: number;
}
export interface ConversationTurn {
    readonly id: string;
    readonly sessionId: string;
    readonly type: 'user' | 'assistant' | 'system';
    readonly content: string;
    readonly timestamp: number;
    readonly intent?: DefiIntent;
    readonly entities?: ReadonlyArray<any>;
    readonly command?: ExecutableCommand;
    readonly metadata: TurnMetadata;
}
export interface ConversationSessionContext {
    readonly user: UserContext;
    readonly financial: FinancialContext;
    readonly preferences: UserPreferences;
    readonly history: ConversationHistory;
    readonly carryover: ContextCarryover;
}
export interface UserContext {
    readonly id?: string;
    readonly walletAddress?: string;
    readonly experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    readonly preferredLanguage: string;
    readonly timezone: string;
}
export interface FinancialContext {
    readonly balances: ReadonlyRecord<string, string>;
    readonly positions: ReadonlyArray<PositionInfo>;
    readonly allowances: ReadonlyRecord<string, ReadonlyRecord<string, string>>;
    readonly portfolioValue: number;
    readonly riskTolerance: 'low' | 'medium' | 'high';
    readonly activeProtocols: ReadonlyArray<string>;
}
export interface PositionInfo {
    readonly protocol: string;
    readonly type: 'lending' | 'borrowing' | 'liquidity' | 'trading';
    readonly token: string;
    readonly amount: number;
    readonly value: number;
    readonly apy?: number;
    readonly healthFactor?: number;
    readonly lastUpdate: number;
}
export interface UserPreferences {
    readonly defaultProtocol?: string;
    readonly preferredSlippage: number;
    readonly gasPreference: 'slow' | 'standard' | 'fast';
    readonly confirmationRequired: boolean;
    readonly riskWarnings: boolean;
    readonly autoOptimize: boolean;
}
export interface ConversationHistory {
    readonly recentIntents: ReadonlyArray<DefiIntent>;
    readonly successfulCommands: ReadonlyArray<string>;
    readonly failedCommands: ReadonlyArray<string>;
    readonly commonPatterns: ReadonlyArray<string>;
    readonly lastInteraction: number;
}
export interface ContextCarryover {
    readonly mentionedTokens: ReadonlyArray<string>;
    readonly mentionedProtocols: ReadonlyArray<string>;
    readonly mentionedAmounts: ReadonlyArray<string>;
    readonly pendingActions: ReadonlyArray<PendingAction>;
    readonly unresolved: ReadonlyArray<UnresolvedItem>;
}
export interface PendingAction {
    readonly id: string;
    readonly intent: DefiIntent;
    readonly parameters: ReadonlyRecord<string, any>;
    readonly reason: string;
    readonly priority: 'low' | 'medium' | 'high';
    readonly timestamp: number;
    readonly expiresAt?: number;
}
export interface UnresolvedItem {
    readonly id: string;
    readonly type: 'parameter' | 'clarification' | 'confirmation';
    readonly description: string;
    readonly context: ReadonlyRecord<string, any>;
    readonly timestamp: number;
}
export interface SessionMetadata {
    readonly version: string;
    readonly source: string;
    readonly ip?: string;
    readonly userAgent?: string;
    readonly tags: ReadonlyArray<string>;
    readonly metrics: SessionMetrics;
}
export interface TurnMetadata {
    readonly processingTime: number;
    readonly confidence?: number;
    readonly source: 'direct' | 'suggestion' | 'clarification';
    readonly errors?: ReadonlyArray<string>;
    readonly warnings?: ReadonlyArray<string>;
}
export interface SessionMetrics {
    readonly totalTurns: number;
    readonly successfulCommands: number;
    readonly failedCommands: number;
    readonly averageResponseTime: number;
    readonly userSatisfaction?: number;
}
export interface ConversationFlow {
    readonly id: string;
    readonly type: FlowType;
    readonly stages: ReadonlyArray<FlowStageDefinition>;
    readonly currentStage: number;
    readonly progress: FlowProgress;
    readonly data: FlowData;
    readonly timeout?: number;
    readonly startTime: number;
}
export declare enum FlowType {
    COMMAND_EXECUTION = "command_execution",
    PARAMETER_COLLECTION = "parameter_collection",
    DISAMBIGUATION = "disambiguation",
    RISK_ASSESSMENT = "risk_assessment",
    ONBOARDING = "onboarding",
    PORTFOLIO_REVIEW = "portfolio_review",
    YIELD_OPTIMIZATION = "yield_optimization"
}
export interface FlowStageDefinition {
    readonly stage: FlowStage;
    readonly name: string;
    readonly description: string;
    readonly required: boolean;
    readonly timeout?: number;
    readonly prerequisites: ReadonlyArray<string>;
    readonly validations: ReadonlyArray<FlowValidation>;
}
export interface FlowProgress {
    readonly completed: ReadonlyArray<FlowStage>;
    readonly current: FlowStage;
    readonly remaining: ReadonlyArray<FlowStage>;
    readonly percentage: number;
    readonly estimatedTimeRemaining?: number;
}
export interface FlowData {
    readonly intent?: DefiIntent;
    readonly command?: ExecutableCommand;
    readonly parameters: ReadonlyRecord<string, any>;
    readonly validationResults?: ReadonlyArray<any>;
    readonly userChoices: ReadonlyRecord<string, any>;
    readonly metadata: ReadonlyRecord<string, any>;
}
export interface FlowValidation {
    readonly type: 'required_field' | 'custom_rule' | 'external_check';
    readonly field?: string;
    readonly rule?: (data: FlowData) => boolean;
    readonly message: string;
    readonly blocking: boolean;
}
export interface FlowTransition {
    readonly from: FlowStage;
    readonly to: FlowStage;
    readonly condition?: (flow: ConversationFlow, input: string) => boolean;
    readonly action?: (flow: ConversationFlow, input: string) => Promise<FlowData>;
}
export interface ProgressTracker {
    readonly operations: ReadonlyArray<TrackedOperation>;
    readonly currentOperation?: TrackedOperation;
    readonly overallProgress: number;
}
export interface TrackedOperation {
    readonly id: string;
    readonly type: 'transaction' | 'approval' | 'verification' | 'analysis';
    readonly description: string;
    readonly status: OperationStatus;
    readonly progress: number;
    readonly startTime: number;
    readonly endTime?: number;
    readonly result?: any;
    readonly error?: string;
    readonly steps: ReadonlyArray<OperationStep>;
}
export declare enum OperationStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface OperationStep {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly status: OperationStatus;
    readonly progress: number;
    readonly timestamp: number;
    readonly metadata?: ReadonlyRecord<string, any>;
}
export interface ConfirmationConfig {
    readonly type: 'simple' | 'detailed' | 'risk_based';
    readonly timeout: number;
    readonly retryCount: number;
    readonly requireExplicitConsent: boolean;
    readonly riskThreshold: 'low' | 'medium' | 'high';
}
export interface ConfirmationRequest {
    readonly id: string;
    readonly type: ConfirmationType;
    readonly command: ExecutableCommand;
    readonly risks: ReadonlyArray<RiskWarning>;
    readonly summary: OperationSummary;
    readonly options: ReadonlyArray<ConfirmationOption>;
    readonly timeout: number;
    readonly createdAt: number;
}
export declare enum ConfirmationType {
    TRANSACTION = "transaction",
    HIGH_RISK = "high_risk",
    LARGE_AMOUNT = "large_amount",
    NEW_PROTOCOL = "new_protocol",
    LEVERAGE = "leverage",
    BATCH_OPERATION = "batch_operation"
}
export interface RiskWarning {
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly type: string;
    readonly message: string;
    readonly impact: string;
    readonly mitigation?: string;
}
export interface OperationSummary {
    readonly action: string;
    readonly amount?: string;
    readonly token?: string;
    readonly protocol: string;
    readonly estimatedGas: number;
    readonly estimatedCost: string;
    readonly expectedOutcome: string;
    readonly risks: ReadonlyArray<string>;
}
export interface ConfirmationOption {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly action: 'confirm' | 'cancel' | 'modify';
    readonly isDefault?: boolean;
}
export interface ContextPreservationConfig {
    readonly maxTurns: number;
    readonly maxAge: number;
    readonly preserveEntities: boolean;
    readonly preserveParameters: boolean;
    readonly preserveRiskAssessments: boolean;
    readonly compressionThreshold: number;
}
export interface ConversationTemplate {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly flowType: FlowType;
    readonly stages: ReadonlyArray<FlowStageDefinition>;
    readonly transitions: ReadonlyArray<FlowTransition>;
    readonly variables: ReadonlyRecord<string, any>;
}
export declare const ConversationSessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    state: z.ZodNativeEnum<typeof ConversationState>;
    stage: z.ZodNativeEnum<typeof FlowStage>;
    turns: z.ZodArray<z.ZodAny, "many">;
    context: z.ZodAny;
    activeFlow: z.ZodOptional<z.ZodAny>;
    metadata: z.ZodAny;
    startTime: z.ZodNumber;
    lastActivity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id?: string;
    context?: any;
    metadata?: any;
    state?: ConversationState;
    userId?: string;
    startTime?: number;
    stage?: FlowStage;
    turns?: any[];
    activeFlow?: any;
    lastActivity?: number;
}, {
    id?: string;
    context?: any;
    metadata?: any;
    state?: ConversationState;
    userId?: string;
    startTime?: number;
    stage?: FlowStage;
    turns?: any[];
    activeFlow?: any;
    lastActivity?: number;
}>;
export declare const ConversationTurnSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    type: z.ZodEnum<["user", "assistant", "system"]>;
    content: z.ZodString;
    timestamp: z.ZodNumber;
    intent: z.ZodOptional<z.ZodNativeEnum<typeof DefiIntent>>;
    entities: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    command: z.ZodOptional<z.ZodAny>;
    metadata: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type?: "system" | "user" | "assistant";
    id?: string;
    timestamp?: number;
    metadata?: any;
    sessionId?: string;
    command?: any;
    content?: string;
    intent?: DefiIntent;
    entities?: any[];
}, {
    type?: "system" | "user" | "assistant";
    id?: string;
    timestamp?: number;
    metadata?: any;
    sessionId?: string;
    command?: any;
    content?: string;
    intent?: DefiIntent;
    entities?: any[];
}>;
export declare function isConversationSession(session: any): session is ConversationSession;
export declare function isConversationTurn(turn: any): turn is ConversationTurn;
export declare class ConversationError extends Error {
    readonly code: string;
    readonly details?: ReadonlyRecord<string, any>;
    constructor(message: string, code: string, details?: ReadonlyRecord<string, any>);
}
export declare class FlowError extends ConversationError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export declare class ContextError extends ConversationError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export type FlowResult = Result<ConversationFlow, FlowError>;
export type ContextResult = Result<ConversationSessionContext, ContextError>;
export type SessionResult = Result<ConversationSession, ConversationError>;
//# sourceMappingURL=types.d.ts.map