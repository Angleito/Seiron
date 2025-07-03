import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import { AgentError } from '../base/BaseAgent';

/**
 * SAK Adapter Types and Interfaces
 * 
 * Comprehensive type definitions for the SeiAgentKitAdapter system,
 * including protocol-specific types, validation schemas, and integration patterns.
 */

// ============================================================================
// Protocol-Specific Types
// ============================================================================

/**
 * Sei Network Protocol Types
 */
export interface SeiProtocolConfig {
  rpcEndpoint: string;
  restEndpoint: string;
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  gasPrice: {
    low: string;
    medium: string;
    high: string;
  };
}

/**
 * DeFi Protocol Integration Types
 */
export interface DeFiProtocolAdapter {
  protocolId: string;
  name: string;
  version: string;
  category: 'dex' | 'lending' | 'staking' | 'yield' | 'derivatives';
  contractAddresses: Record<string, string>;
  supportedTokens: string[];
  fees: {
    deposit: number;
    withdrawal: number;
    trading: number;
  };
  limits: {
    minDeposit: number;
    maxDeposit: number;
    dailyLimit: number;
  };
  capabilities: DeFiCapability[];
}

export interface DeFiCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  gasEstimate: number;
  executionTime: number;
}

/**
 * LangChain Integration Types
 */
export interface LangChainIntegration {
  enabled: boolean;
  toolsConfig: {
    autoRegister: boolean;
    categoryMapping: Record<string, string>;
    permissionMapping: Record<string, string[]>;
  };
  agentConfig: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  memoryConfig: {
    type: 'buffer' | 'summary' | 'vector';
    maxSize: number;
    persistPath?: string;
  };
}

// ============================================================================
// Validation and Schema Types
// ============================================================================

/**
 * Parameter Schema Definition
 */
export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
    properties?: Record<string, ParameterSchema>;
    items?: ParameterSchema;
  };
  defaultValue?: any;
}

/**
 * Tool Schema Definition
 */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, ParameterSchema>;
  returns: ParameterSchema;
  examples: ToolExample[];
  tags: string[];
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface ToolExample {
  description: string;
  parameters: Record<string, any>;
  expectedResult: any;
}

/**
 * Validation Result Types
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// ============================================================================
// Configuration Management Types
// ============================================================================

/**
 * SAK Adapter Configuration
 */
export interface SAKAdapterConfig {
  core: {
    adapterId: string;
    name: string;
    version: string;
    description: string;
  };
  network: SeiProtocolConfig;
  integration: {
    sakEndpoint: string;
    apiKey?: string;
    timeout: number;
    retries: number;
    backoffMultiplier: number;
  };
  security: {
    permissions: PermissionConfig;
    rateLimiting: RateLimitConfig;
    authentication: AuthenticationConfig;
  };
  performance: {
    caching: CacheConfig;
    batching: BatchConfig;
    monitoring: MonitoringConfig;
  };
  defi: {
    protocols: DeFiProtocolAdapter[];
    defaultSettings: DeFiDefaultSettings;
  };
  langchain?: LangChainIntegration;
}

export interface PermissionConfig {
  defaultPermissions: string[];
  roleBasedPermissions: Record<string, string[]>;
  toolPermissions: Record<string, string[]>;
  contextPermissions: Record<string, string[]>;
}

export interface RateLimitConfig {
  global: {
    maxRequests: number;
    windowMs: number;
  };
  perTool: Record<string, {
    maxRequests: number;
    windowMs: number;
  }>;
  perUser: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface AuthenticationConfig {
  method: 'apiKey' | 'jwt' | 'wallet' | 'none';
  options: Record<string, any>;
}

export interface CacheConfig {
  enabled: boolean;
  provider: 'memory' | 'redis' | 'file';
  ttl: number;
  maxSize: number;
  compression: boolean;
  keyPrefix: string;
}

export interface BatchConfig {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeout: number;
  parallelExecution: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    execution: boolean;
    performance: boolean;
    errors: boolean;
    usage: boolean;
  };
  alerts: {
    errorRate: number;
    responseTime: number;
    resourceUsage: number;
  };
}

export interface DeFiDefaultSettings {
  slippageTolerance: number;
  gasMultiplier: number;
  deadlineMinutes: number;
  maxGasPrice: string;
  confirmations: number;
}

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * Execution Context
 */
export interface ExecutionContext {
  id: string;
  userId?: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, any>;
  metadata: ExecutionMetadata;
  permissions: string[];
  startTime: number;
  timeout: number;
}

export interface ExecutionMetadata {
  source: 'api' | 'chat' | 'batch' | 'schedule';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  requestId?: string;
  parentExecutionId?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Execution Result
 */
export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    stackTrace?: string;
  };
  metadata: ResultMetadata;
}

export interface ResultMetadata {
  executionId: string;
  toolName: string;
  duration: number;
  gasUsed?: number;
  txHash?: string;
  blockNumber?: number;
  timestamp: number;
  cacheHit?: boolean;
  retryCount: number;
}

/**
 * Tool Registration Info
 */
export interface ToolRegistration {
  toolName: string;
  schema: ToolSchema;
  handler: ToolHandler;
  middleware: ToolMiddleware[];
  config: ToolConfig;
  status: 'active' | 'inactive' | 'deprecated';
  registeredAt: number;
  lastUsed?: number;
  usageCount: number;
}

export interface ToolHandler {
  (context: ExecutionContext): TaskEither<AgentError, ExecutionResult>;
}

export interface ToolMiddleware {
  name: string;
  priority: number;
  handler: (context: ExecutionContext, next: () => TaskEither<AgentError, ExecutionResult>) => TaskEither<AgentError, ExecutionResult>;
}

export interface ToolConfig {
  timeout: number;
  retries: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    key: string;
  };
  permissions: string[];
  validation: {
    strict: boolean;
    sanitize: boolean;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * SAK Adapter Events
 */
export type SAKAdapterEvent = 
  | ToolRegisteredEvent
  | ToolUnregisteredEvent
  | ToolExecutedEvent
  | ToolFailedEvent
  | BatchExecutedEvent
  | CacheHitEvent
  | CacheMissEvent
  | RateLimitExceededEvent
  | PermissionDeniedEvent
  | ConfigurationUpdatedEvent
  | HealthCheckEvent;

export interface ToolRegisteredEvent {
  type: 'tool:registered';
  toolName: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ToolUnregisteredEvent {
  type: 'tool:unregistered';
  toolName: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ToolExecutedEvent {
  type: 'tool:executed';
  toolName: string;
  executionId: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ToolFailedEvent {
  type: 'tool:failed';
  toolName: string;
  executionId: string;
  error: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface BatchExecutedEvent {
  type: 'batch:executed';
  batchId: string;
  toolCount: number;
  successCount: number;
  failureCount: number;
  duration: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface CacheHitEvent {
  type: 'cache:hit';
  key: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface CacheMissEvent {
  type: 'cache:miss';
  key: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface RateLimitExceededEvent {
  type: 'rateLimit:exceeded';
  toolName: string;
  userId?: string;
  limit: number;
  windowMs: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface PermissionDeniedEvent {
  type: 'permission:denied';
  toolName: string;
  userId?: string;
  requiredPermissions: string[];
  userPermissions: string[];
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ConfigurationUpdatedEvent {
  type: 'config:updated';
  section: string;
  changes: Record<string, any>;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface HealthCheckEvent {
  type: 'health:check';
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, any>;
  timestamp: number;
  metadata: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type Guards
 */
export type SAKToolType = 'blockchain' | 'defi' | 'trading' | 'analysis' | 'utility';

export interface TypeGuards {
  isSAKTool: (obj: any) => obj is import('./SeiAgentKitAdapter').SAKTool;
  isExecutionContext: (obj: any) => obj is ExecutionContext;
  isExecutionResult: (obj: any) => obj is ExecutionResult;
  isToolRegistration: (obj: any) => obj is ToolRegistration;
  isValidationResult: (obj: any) => obj is ValidationResult;
}

/**
 * Branded Types for Type Safety
 */
export type ToolName = string & { readonly __brand: 'ToolName' };
export type ExecutionId = string & { readonly __brand: 'ExecutionId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type WalletAddress = string & { readonly __brand: 'WalletAddress' };
export type TxHash = string & { readonly __brand: 'TxHash' };
export type BlockNumber = number & { readonly __brand: 'BlockNumber' };

/**
 * Utility Type Helpers
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type OptionalBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Writeable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepWriteable<T[P]> : T[P];
};

// ============================================================================
// Function Types
// ============================================================================

/**
 * Validation Functions
 */
export type ParameterValidator = (value: any, schema: ParameterSchema) => ValidationResult;
export type ToolValidator = (parameters: Record<string, any>, schema: ToolSchema) => ValidationResult;
export type ConfigValidator = (config: SAKAdapterConfig) => ValidationResult;

/**
 * Transformation Functions
 */
export type ParameterTransformer = (value: any, schema: ParameterSchema) => any;
export type ResultTransformer<T, U> = (result: ExecutionResult<T>) => ExecutionResult<U>;
export type ContextTransformer = (context: ExecutionContext) => ExecutionContext;

/**
 * Factory Functions
 */
export type ToolFactory = (config: ToolConfig) => ToolHandler;
export type MiddlewareFactory = (config: Record<string, any>) => ToolMiddleware;
export type ValidatorFactory = (schema: ParameterSchema) => ParameterValidator;

/**
 * Predicate Functions
 */
export type PermissionPredicate = (permissions: string[], required: string[]) => boolean;
export type RateLimitPredicate = (toolName: string, userId?: string) => boolean;
export type CachePredicate = (context: ExecutionContext) => boolean;

// ============================================================================
// Error Types
// ============================================================================

/**
 * SAK-Specific Error Types
 */
export interface SAKError extends AgentError {
  category: 'validation' | 'permission' | 'rateLimit' | 'network' | 'execution' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  context?: ExecutionContext;
}

export interface ValidationError extends SAKError {
  category: 'validation';
  field: string;
  constraint: string;
  actualValue: any;
  expectedValue?: any;
}

export interface PermissionError extends SAKError {
  category: 'permission';
  requiredPermissions: string[];
  userPermissions: string[];
  resource: string;
}

export interface RateLimitError extends SAKError {
  category: 'rateLimit';
  limit: number;
  windowMs: number;
  retryAfter: number;
}

export interface NetworkError extends SAKError {
  category: 'network';
  endpoint: string;
  statusCode?: number;
  responseTime?: number;
}

export interface ExecutionError extends SAKError {
  category: 'execution';
  toolName: string;
  executionId: string;
  phase: 'validation' | 'execution' | 'postProcessing';
  originalError: any;
}

export interface ConfigurationError extends SAKError {
  category: 'configuration';
  section: string;
  field: string;
  reason: string;
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  // Core Types
  SeiProtocolConfig,
  DeFiProtocolAdapter,
  DeFiCapability,
  LangChainIntegration,
  
  // Schema Types
  ParameterSchema,
  ToolSchema,
  ToolExample,
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
  
  // Configuration Types
  SAKAdapterConfig,
  PermissionConfig,
  RateLimitConfig,
  AuthenticationConfig,
  CacheConfig,
  BatchConfig,
  MonitoringConfig,
  DeFiDefaultSettings,
  
  // Runtime Types
  ExecutionContext,
  ExecutionMetadata,
  ExecutionResult,
  ResultMetadata,
  ToolRegistration,
  ToolHandler,
  ToolMiddleware,
  ToolConfig,
  
  // Event Types
  SAKAdapterEvent,
  ToolRegisteredEvent,
  ToolUnregisteredEvent,
  ToolExecutedEvent,
  ToolFailedEvent,
  BatchExecutedEvent,
  CacheHitEvent,
  CacheMissEvent,
  RateLimitExceededEvent,
  PermissionDeniedEvent,
  ConfigurationUpdatedEvent,
  HealthCheckEvent,
  
  // Utility Types
  TypeGuards,
  ToolName,
  ExecutionId,
  SessionId,
  UserId,
  WalletAddress,
  TxHash,
  BlockNumber,
  
  // Function Types
  ParameterValidator,
  ToolValidator,
  ConfigValidator,
  ParameterTransformer,
  ResultTransformer,
  ContextTransformer,
  ToolFactory,
  MiddlewareFactory,
  ValidatorFactory,
  PermissionPredicate,
  RateLimitPredicate,
  CachePredicate,
  
  // Error Types
  SAKError,
  ValidationError,
  PermissionError,
  RateLimitError,
  NetworkError,
  ExecutionError,
  ConfigurationError
};