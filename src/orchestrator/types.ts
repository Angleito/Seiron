/**
 * @fileoverview Core orchestrator types and interfaces
 * Defines the communication protocol between agents and orchestrator
 */

import type { Either, Option, ReadonlyRecord } from '../types/index.js';

/**
 * User intent types
 */
export type UserIntentType = 
  | 'lending'
  | 'liquidity'
  | 'portfolio'
  | 'trading'
  | 'analysis'
  | 'info'
  | 'risk';

export interface UserIntent {
  readonly type: UserIntentType;
  readonly action: string;
  readonly parameters: ReadonlyRecord<string, unknown>;
  readonly context: IntentContext;
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly timestamp: number;
}

export interface IntentContext {
  readonly walletAddress?: string;
  readonly sessionId: string;
  readonly previousIntents: ReadonlyArray<UserIntent>;
  readonly portfolioState?: unknown;
  readonly preferences?: UserPreferences;
}

export interface UserPreferences {
  readonly riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  readonly preferredProtocols: ReadonlyArray<string>;
  readonly slippageTolerance: number;
  readonly gasPreference: 'low' | 'medium' | 'high';
  readonly autoApproval?: boolean;
}

/**
 * Agent types and interfaces
 */
export type AgentType = 
  | 'lending_agent'
  | 'liquidity_agent'
  | 'portfolio_agent'
  | 'risk_agent'
  | 'analysis_agent';

export type AgentStatus = 
  | 'idle'
  | 'busy'
  | 'error'
  | 'maintenance'
  | 'offline';

export interface Agent {
  readonly id: string;
  readonly type: AgentType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: ReadonlyArray<AgentCapability>;
  readonly status: AgentStatus;
  readonly metadata: ReadonlyRecord<string, unknown>;
}

export interface AgentCapability {
  readonly action: string;
  readonly description: string;
  readonly parameters: ReadonlyArray<ParameterSchema>;
  readonly requiredPermissions: ReadonlyArray<string>; 
  readonly estimatedExecutionTime: number; // milliseconds
}

export interface ParameterSchema {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: boolean;
  readonly description: string;
  readonly validation?: ValidationRule;
}

export interface ValidationRule {
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
  readonly enum?: ReadonlyArray<string>;
}

/**
 * Task and execution types
 */
export interface Task {
  readonly id: string;
  readonly intentId: string;
  readonly agentId: string;
  readonly action: string;
  readonly parameters: ReadonlyRecord<string, unknown>;
  readonly status: TaskStatus;
  readonly priority: number;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly dependencies: ReadonlyArray<string>; // task IDs
}

export type TaskStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface TaskResult {
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly result?: unknown;
  readonly error?: TaskError;
  readonly executionTime: number;
  readonly metadata: ReadonlyRecord<string, unknown>;
}

export interface TaskError {
  readonly code: string;
  readonly message: string;
  readonly details?: ReadonlyRecord<string, unknown>;
  readonly recoverable: boolean;
  readonly retryAfter?: number;
}

/**
 * Agent communication protocol
 */
export interface AgentMessage {
  readonly id: string;
  readonly type: AgentMessageType;
  readonly senderId: string;
  readonly receiverId: string;
  readonly payload: unknown;
  readonly timestamp: number;
  readonly correlationId?: string;
}

export type AgentMessageType = 
  | 'task_request'
  | 'task_response'
  | 'health_check'
  | 'status_update'
  | 'error_report'
  | 'capability_update';

export interface TaskRequest extends AgentMessage {
  readonly type: 'task_request';
  readonly payload: {
    readonly task: Task;
    readonly context: TaskContext;
  };
}

export interface TaskResponse extends AgentMessage {
  readonly type: 'task_response';
  readonly payload: TaskResult;
}

export interface TaskContext {
  readonly walletAddress?: string;
  readonly portfolioState?: unknown;
  readonly marketData?: ReadonlyRecord<string, unknown>;
  readonly riskLimits?: RiskLimits;
}

export interface RiskLimits {
  readonly maxTransactionValue: number;
  readonly maxSlippage: number;
  readonly maxLeverage: number;
  readonly allowedTokens: ReadonlyArray<string>;
}

/**
 * Orchestrator state and configuration
 */
export interface OrchestratorState {
  readonly agents: ReadonlyRecord<string, Agent>;
  readonly tasks: ReadonlyRecord<string, Task>;
  readonly sessions: ReadonlyRecord<string, Session>;
  readonly messageQueue: ReadonlyArray<AgentMessage>;
}

export interface Session {
  readonly id: string;
  readonly walletAddress?: string;
  readonly startTime: number;
  readonly lastActivity: number;
  readonly intentHistory: ReadonlyArray<UserIntent>;
  readonly context: SessionContext;
}

export interface SessionContext {
  readonly portfolioSnapshot?: unknown;
  readonly preferences: UserPreferences;
  readonly activeAgents: ReadonlyArray<string>;
  readonly pendingTasks: ReadonlyArray<string>;
}

export interface OrchestratorConfig {
  readonly maxConcurrentTasks: number;
  readonly taskTimeout: number;
  readonly agentHealthCheckInterval: number;
  readonly messageRetryPolicy: RetryPolicy;
  readonly loadBalancing: LoadBalancingStrategy;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly backoffMultiplier: number;
  readonly maxBackoffMs: number;
  readonly retryableErrors: ReadonlyArray<string>;
}

export type LoadBalancingStrategy = 
  | 'round_robin'
  | 'least_connections'
  | 'weighted_response_time'
  | 'capability_based';

/**
 * Result types for orchestrator operations
 */
export type IntentAnalysisResult = Either<IntentError, AnalyzedIntent>;
export type AgentSelectionResult = Either<SelectionError, SelectedAgent>;
export type TaskExecutionResult = Either<ExecutionError, TaskResult>;

export interface AnalyzedIntent {
  readonly intent: UserIntent;
  readonly confidence: number;
  readonly requiredActions: ReadonlyArray<string>;
  readonly estimatedComplexity: 'low' | 'medium' | 'high';
  readonly risks: ReadonlyArray<string>;
}

export interface SelectedAgent {
  readonly agent: Agent;
  readonly matchScore: number;
  readonly availableCapabilities: ReadonlyArray<AgentCapability>;
  readonly estimatedExecutionTime: number;
}

export interface IntentError {
  readonly type: 'parse_error' | 'validation_error' | 'unsupported_intent';
  readonly message: string;
  readonly details?: ReadonlyRecord<string, unknown>;
}

export interface SelectionError {
  readonly type: 'no_available_agents' | 'capability_mismatch' | 'agent_overloaded';
  readonly message: string;
  readonly suggestedAlternatives?: ReadonlyArray<string>;
}

export interface ExecutionError {
  readonly type: 'timeout' | 'agent_error' | 'validation_error' | 'permission_denied';
  readonly message: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly recoverable: boolean;
}

/**
 * Event types for orchestrator monitoring
 */
export type OrchestratorEvent = 
  | IntentReceivedEvent
  | TaskStartedEvent
  | TaskCompletedEvent
  | AgentStatusChangedEvent
  | ErrorOccurredEvent;

export interface IntentReceivedEvent {
  readonly type: 'intent_received';
  readonly intent: UserIntent;
  readonly timestamp: number;
}

export interface TaskStartedEvent {
  readonly type: 'task_started';
  readonly task: Task;
  readonly agent: Agent;
  readonly timestamp: number;
}

export interface TaskCompletedEvent {
  readonly type: 'task_completed';
  readonly task: Task;
  readonly result: TaskResult;
  readonly timestamp: number;
}

export interface AgentStatusChangedEvent {
  readonly type: 'agent_status_changed';
  readonly agentId: string;
  readonly oldStatus: AgentStatus;
  readonly newStatus: AgentStatus;
  readonly timestamp: number;
}

export interface ErrorOccurredEvent {
  readonly type: 'error_occurred';
  readonly error: IntentError | SelectionError | ExecutionError;
  readonly context: ReadonlyRecord<string, unknown>;
  readonly timestamp: number;
}