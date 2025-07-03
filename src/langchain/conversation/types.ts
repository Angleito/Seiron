/**
 * @fileoverview Conversation Management Types
 * Types for multi-turn conversation handling and flow management
 */

import { z } from 'zod';
import type { Option, Result, ReadonlyRecord } from '../../types/index.js';
import { DefiIntent, ConversationContext } from '../nlp/types.js';
import { ExecutableCommand } from '../processing/types.js';

/**
 * Conversation Flow State
 */
export enum ConversationState {
  INITIAL = 'initial',
  EXPLORING = 'exploring',
  CLARIFYING = 'clarifying',
  CONFIRMING = 'confirming',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING_INPUT = 'waiting_input'
}

/**
 * Flow Stage
 */
export enum FlowStage {
  DISCOVERY = 'discovery',
  PARAMETER_GATHERING = 'parameter_gathering',
  VALIDATION = 'validation',
  RISK_ASSESSMENT = 'risk_assessment',
  CONFIRMATION = 'confirmation',
  EXECUTION = 'execution',
  FOLLOW_UP = 'follow_up'
}

/**
 * Conversation Session
 */
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

/**
 * Conversation Turn
 */
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

/**
 * Conversation Session Context
 */
export interface ConversationSessionContext {
  readonly user: UserContext;
  readonly financial: FinancialContext;
  readonly preferences: UserPreferences;
  readonly history: ConversationHistory;
  readonly carryover: ContextCarryover;
}

/**
 * User Context
 */
export interface UserContext {
  readonly id?: string;
  readonly walletAddress?: string;
  readonly experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  readonly preferredLanguage: string;
  readonly timezone: string;
}

/**
 * Financial Context
 */
export interface FinancialContext {
  readonly balances: ReadonlyRecord<string, string>;
  readonly positions: ReadonlyArray<PositionInfo>;
  readonly allowances: ReadonlyRecord<string, ReadonlyRecord<string, string>>;
  readonly portfolioValue: number;
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly activeProtocols: ReadonlyArray<string>;
}

/**
 * Position Info
 */
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

/**
 * User Preferences
 */
export interface UserPreferences {
  readonly defaultProtocol?: string;
  readonly preferredSlippage: number;
  readonly gasPreference: 'slow' | 'standard' | 'fast';
  readonly confirmationRequired: boolean;
  readonly riskWarnings: boolean;
  readonly autoOptimize: boolean;
}

/**
 * Conversation History
 */
export interface ConversationHistory {
  readonly recentIntents: ReadonlyArray<DefiIntent>;
  readonly successfulCommands: ReadonlyArray<string>;
  readonly failedCommands: ReadonlyArray<string>;
  readonly commonPatterns: ReadonlyArray<string>;
  readonly lastInteraction: number;
}

/**
 * Context Carryover
 */
export interface ContextCarryover {
  readonly mentionedTokens: ReadonlyArray<string>;
  readonly mentionedProtocols: ReadonlyArray<string>;
  readonly mentionedAmounts: ReadonlyArray<string>;
  readonly pendingActions: ReadonlyArray<PendingAction>;
  readonly unresolved: ReadonlyArray<UnresolvedItem>;
}

/**
 * Pending Action
 */
export interface PendingAction {
  readonly id: string;
  readonly intent: DefiIntent;
  readonly parameters: ReadonlyRecord<string, any>;
  readonly reason: string;
  readonly priority: 'low' | 'medium' | 'high';
  readonly timestamp: number;
  readonly expiresAt?: number;
}

/**
 * Unresolved Item
 */
export interface UnresolvedItem {
  readonly id: string;
  readonly type: 'parameter' | 'clarification' | 'confirmation';
  readonly description: string;
  readonly context: ReadonlyRecord<string, any>;
  readonly timestamp: number;
}

/**
 * Session Metadata
 */
export interface SessionMetadata {
  readonly version: string;
  readonly source: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly tags: ReadonlyArray<string>;
  readonly metrics: SessionMetrics;
}

/**
 * Turn Metadata
 */
export interface TurnMetadata {
  readonly processingTime: number;
  readonly confidence?: number;
  readonly source: 'direct' | 'suggestion' | 'clarification';
  readonly errors?: ReadonlyArray<string>;
  readonly warnings?: ReadonlyArray<string>;
}

/**
 * Session Metrics
 */
export interface SessionMetrics {
  readonly totalTurns: number;
  readonly successfulCommands: number;
  readonly failedCommands: number;
  readonly averageResponseTime: number;
  readonly userSatisfaction?: number;
}

/**
 * Conversation Flow
 */
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

/**
 * Flow Type
 */
export enum FlowType {
  COMMAND_EXECUTION = 'command_execution',
  PARAMETER_COLLECTION = 'parameter_collection',
  DISAMBIGUATION = 'disambiguation',
  RISK_ASSESSMENT = 'risk_assessment',
  ONBOARDING = 'onboarding',
  PORTFOLIO_REVIEW = 'portfolio_review',
  YIELD_OPTIMIZATION = 'yield_optimization'
}

/**
 * Flow Stage Definition
 */
export interface FlowStageDefinition {
  readonly stage: FlowStage;
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly timeout?: number;
  readonly prerequisites: ReadonlyArray<string>;
  readonly validations: ReadonlyArray<FlowValidation>;
}

/**
 * Flow Progress
 */
export interface FlowProgress {
  readonly completed: ReadonlyArray<FlowStage>;
  readonly current: FlowStage;
  readonly remaining: ReadonlyArray<FlowStage>;
  readonly percentage: number;
  readonly estimatedTimeRemaining?: number;
}

/**
 * Flow Data
 */
export interface FlowData {
  readonly intent?: DefiIntent;
  readonly command?: ExecutableCommand;
  readonly parameters: ReadonlyRecord<string, any>;
  readonly validationResults?: ReadonlyArray<any>;
  readonly userChoices: ReadonlyRecord<string, any>;
  readonly metadata: ReadonlyRecord<string, any>;
}

/**
 * Flow Validation
 */
export interface FlowValidation {
  readonly type: 'required_field' | 'custom_rule' | 'external_check';
  readonly field?: string;
  readonly rule?: (data: FlowData) => boolean;
  readonly message: string;
  readonly blocking: boolean;
}

/**
 * Flow Transition
 */
export interface FlowTransition {
  readonly from: FlowStage;
  readonly to: FlowStage;
  readonly condition?: (flow: ConversationFlow, input: string) => boolean;
  readonly action?: (flow: ConversationFlow, input: string) => Promise<FlowData>;
}

/**
 * Progress Tracking
 */
export interface ProgressTracker {
  readonly operations: ReadonlyArray<TrackedOperation>;
  readonly currentOperation?: TrackedOperation;
  readonly overallProgress: number;
}

/**
 * Tracked Operation
 */
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

/**
 * Operation Status
 */
export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Operation Step
 */
export interface OperationStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: OperationStatus;
  readonly progress: number;
  readonly timestamp: number;
  readonly metadata?: ReadonlyRecord<string, any>;
}

/**
 * Confirmation Handler Configuration
 */
export interface ConfirmationConfig {
  readonly type: 'simple' | 'detailed' | 'risk_based';
  readonly timeout: number;
  readonly retryCount: number;
  readonly requireExplicitConsent: boolean;
  readonly riskThreshold: 'low' | 'medium' | 'high';
}

/**
 * Confirmation Request
 */
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

/**
 * Confirmation Type
 */
export enum ConfirmationType {
  TRANSACTION = 'transaction',
  HIGH_RISK = 'high_risk',
  LARGE_AMOUNT = 'large_amount',
  NEW_PROTOCOL = 'new_protocol',
  LEVERAGE = 'leverage',
  BATCH_OPERATION = 'batch_operation'
}

/**
 * Risk Warning
 */
export interface RiskWarning {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly type: string;
  readonly message: string;
  readonly impact: string;
  readonly mitigation?: string;
}

/**
 * Operation Summary
 */
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

/**
 * Confirmation Option
 */
export interface ConfirmationOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly action: 'confirm' | 'cancel' | 'modify';
  readonly isDefault?: boolean;
}

/**
 * Context Preservation Settings
 */
export interface ContextPreservationConfig {
  readonly maxTurns: number;
  readonly maxAge: number; // milliseconds
  readonly preserveEntities: boolean;
  readonly preserveParameters: boolean;
  readonly preserveRiskAssessments: boolean;
  readonly compressionThreshold: number;
}

/**
 * Conversation Templates
 */
export interface ConversationTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly flowType: FlowType;
  readonly stages: ReadonlyArray<FlowStageDefinition>;
  readonly transitions: ReadonlyArray<FlowTransition>;
  readonly variables: ReadonlyRecord<string, any>;
}

/**
 * Zod Schemas
 */
export const ConversationSessionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  state: z.nativeEnum(ConversationState),
  stage: z.nativeEnum(FlowStage),
  turns: z.array(z.any()),
  context: z.any(),
  activeFlow: z.any().optional(),
  metadata: z.any(),
  startTime: z.number(),
  lastActivity: z.number()
});

export const ConversationTurnSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
  intent: z.nativeEnum(DefiIntent).optional(),
  entities: z.array(z.any()).optional(),
  command: z.any().optional(),
  metadata: z.any()
});

/**
 * Type Guards
 */
export function isConversationSession(session: any): session is ConversationSession {
  return ConversationSessionSchema.safeParse(session).success;
}

export function isConversationTurn(turn: any): turn is ConversationTurn {
  return ConversationTurnSchema.safeParse(turn).success;
}

/**
 * Error Types
 */
export class ConversationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: ReadonlyRecord<string, any>
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class FlowError extends ConversationError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'FLOW_ERROR', details);
    this.name = 'FlowError';
  }
}

export class ContextError extends ConversationError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'CONTEXT_ERROR', details);
    this.name = 'ContextError';
  }
}

/**
 * Utility Types
 */
export type FlowResult = Result<ConversationFlow, FlowError>;
export type ContextResult = Result<ConversationSessionContext, ContextError>;
export type SessionResult = Result<ConversationSession, ConversationError>;