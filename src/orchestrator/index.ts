/**
 * @fileoverview Orchestrator module exports
 * Main entry point for the ElizaOS agent orchestrator
 */

// Core orchestrator exports
export { Orchestrator, analyzeIntent, scoreAgentMatch, orchestrate } from './core.js';

// Agent registry exports
export { AgentRegistry } from './registry.js';
export type { AgentRegistryConfig } from './registry.js';

// Message router exports
export { MessageRouter } from './router.js';
export type { MessageRouterConfig } from './router.js';

// Type exports
export type {
  // User intent types
  UserIntent,
  UserIntentType,
  IntentContext,
  UserPreferences,
  
  // Agent types
  Agent,
  AgentType,
  AgentStatus,
  AgentCapability,
  ParameterSchema,
  ValidationRule,
  
  // Task types
  Task,
  TaskStatus,
  TaskResult,
  TaskError,
  
  // Message types
  AgentMessage,
  AgentMessageType,
  TaskRequest,
  TaskResponse,
  TaskContext,
  RiskLimits,
  
  // Orchestrator types
  OrchestratorState,
  OrchestratorConfig,
  Session,
  SessionContext,
  RetryPolicy,
  LoadBalancingStrategy,
  
  // Result types
  IntentAnalysisResult,
  AgentSelectionResult,
  TaskExecutionResult,
  AnalyzedIntent,
  SelectedAgent,
  IntentError,
  SelectionError,
  ExecutionError,
  
  // Event types
  OrchestratorEvent,
  IntentReceivedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  AgentStatusChangedEvent,
  ErrorOccurredEvent
} from './types.js';

/**
 * Factory function to create orchestrator with default configuration
 */
export const createOrchestrator = (
  overrides?: {
    orchestrator?: Partial<OrchestratorConfig>;
    registry?: Partial<AgentRegistryConfig>;
    router?: Partial<MessageRouterConfig>;
  }
): Orchestrator => {
  const defaultOrchestratorConfig: OrchestratorConfig = {
    maxConcurrentTasks: 10,
    taskTimeout: 30000,
    agentHealthCheckInterval: 60000,
    messageRetryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffMs: 10000,
      retryableErrors: ['timeout', 'network_error', 'temporary_unavailable']
    },
    loadBalancing: 'least_connections'
  };

  const defaultRegistryConfig: AgentRegistryConfig = {
    healthCheckInterval: 30000,
    maxConsecutiveFailures: 3,
    responseTimeoutMs: 5000,
    loadBalancingWeights: {}
  };

  const defaultRouterConfig: MessageRouterConfig = {
    maxConcurrentMessages: 50,
    messageTimeout: 10000,
    retryAttempts: 2,
    backoffMultiplier: 1.5,
    enableParallelExecution: true
  };

  const orchestratorConfig = { ...defaultOrchestratorConfig, ...overrides?.orchestrator };
  const registryConfig = { ...defaultRegistryConfig, ...overrides?.registry };
  const routerConfig = { ...defaultRouterConfig, ...overrides?.router };

  return new Orchestrator(orchestratorConfig, registryConfig, routerConfig);
};

/**
 * Utility functions for working with intents
 */
export const IntentUtils = {
  /**
   * Create a user intent
   */
  createIntent: (
    type: UserIntentType,
    action: string,
    parameters: Record<string, unknown> = {},
    context: Partial<IntentContext> = {}
  ): UserIntent => ({
    type,
    action,
    parameters,
    context: {
      sessionId: context.sessionId || `session_${Date.now()}`,
      previousIntents: context.previousIntents || [],
      ...context
    },
    priority: 'medium',
    timestamp: Date.now()
  }),

  /**
   * Validate intent parameters
   */
  validateIntentParameters: (
    intent: UserIntent,
    requiredParams: ReadonlyArray<string>
  ): boolean => {
    return requiredParams.every(param => 
      intent.parameters[param] !== undefined && 
      intent.parameters[param] !== null
    );
  },

  /**
   * Extract intent priority from parameters
   */
  extractPriority: (parameters: Record<string, unknown>): UserIntent['priority'] => {
    const priority = parameters.priority as string;
    if (['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return priority as UserIntent['priority'];
    }
    return 'medium';
  }
};

/**
 * Utility functions for working with agents
 */
export const AgentUtils = {
  /**
   * Create an agent configuration
   */
  createAgent: (
    id: string,
    type: AgentType,
    name: string,
    capabilities: ReadonlyArray<AgentCapability>,
    metadata: Record<string, unknown> = {}
  ): Agent => ({
    id,
    type,
    name,
    version: '1.0.0',
    capabilities,
    status: 'idle',
    metadata
  }),

  /**
   * Create an agent capability
   */
  createCapability: (
    action: string,
    description: string,
    parameters: ReadonlyArray<ParameterSchema> = [],
    requiredPermissions: ReadonlyArray<string> = [],
    estimatedExecutionTime: number = 5000
  ): AgentCapability => ({
    action,
    description,
    parameters,
    requiredPermissions,
    estimatedExecutionTime
  }),

  /**
   * Check if agent has capability
   */
  hasCapability: (agent: Agent, action: string): boolean =>
    agent.capabilities.some(cap => cap.action === action),

  /**
   * Get agent capability
   */
  getCapability: (agent: Agent, action: string): AgentCapability | undefined =>
    agent.capabilities.find(cap => cap.action === action)
};

/**
 * Constants for common agent types and actions
 */
export const AGENT_TYPES = {
  LENDING: 'lending_agent' as const,
  LIQUIDITY: 'liquidity_agent' as const,
  PORTFOLIO: 'portfolio_agent' as const,
  RISK: 'risk_agent' as const,
  ANALYSIS: 'analysis_agent' as const
};

export const INTENT_TYPES = {
  LENDING: 'lending' as const,
  LIQUIDITY: 'liquidity' as const,
  PORTFOLIO: 'portfolio' as const,
  TRADING: 'trading' as const,
  ANALYSIS: 'analysis' as const,
  INFO: 'info' as const,
  RISK: 'risk' as const
};

export const COMMON_ACTIONS = {
  // Lending actions
  SUPPLY: 'supply',
  BORROW: 'borrow',
  WITHDRAW: 'withdraw',
  REPAY: 'repay',
  
  // Liquidity actions
  ADD_LIQUIDITY: 'add_liquidity',
  REMOVE_LIQUIDITY: 'remove_liquidity',
  SWAP: 'swap',
  
  // Portfolio actions
  SHOW_POSITIONS: 'show_positions',
  REBALANCE: 'rebalance',
  ANALYZE: 'analyze',
  
  // Info actions
  GET_RATES: 'get_rates',
  GET_BALANCE: 'get_balance',
  GET_POSITIONS: 'get_positions',
  
  // Risk actions
  ASSESS_RISK: 'assess_risk',
  SET_LIMITS: 'set_limits',
  CHECK_HEALTH: 'check_health'
} as const;

// Re-export types from main types module for convenience
import type {
  UserIntent,
  UserIntentType,
  IntentContext,
  UserPreferences,
  Agent,
  AgentType,
  AgentStatus,
  AgentCapability,
  ParameterSchema,
  ValidationRule,
  Task,
  TaskStatus,
  TaskResult,
  TaskError,
  AgentMessage,
  AgentMessageType,
  TaskRequest,
  TaskResponse,
  TaskContext,
  RiskLimits,
  OrchestratorState,
  OrchestratorConfig,
  Session,
  SessionContext,
  RetryPolicy,
  LoadBalancingStrategy,
  IntentAnalysisResult,
  AgentSelectionResult,
  TaskExecutionResult,
  AnalyzedIntent,
  SelectedAgent,
  IntentError,
  SelectionError,
  ExecutionError,
  OrchestratorEvent,
  IntentReceivedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  AgentStatusChangedEvent,
  ErrorOccurredEvent
} from './types.js';

import type { AgentRegistryConfig } from './registry.js';
import type { MessageRouterConfig } from './router.js';