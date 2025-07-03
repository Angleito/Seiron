/**
 * SeiAgentKitAdapter - Complete Integration System
 * 
 * This module provides comprehensive integration between Sei Agent Kit (SAK)
 * and the existing BaseAgent architecture, maintaining fp-ts patterns while
 * adding powerful blockchain and DeFi capabilities.
 */

// ============================================================================
// Core Adapter Exports
// ============================================================================

export {
  SeiAgentKitAdapter,
  SAKTool,
  SAKOperationResult,
  SAKContext,
  SAKIntegrationConfig,
  ToolRegistrationBridge,
  OperationBridge,
  ContextBridge,
  ErrorBridge,
  RetryStrategy
} from './SeiAgentKitAdapter';

// ============================================================================
// Type System Exports
// ============================================================================

export type {
  // Protocol Types
  SeiProtocolConfig,
  DeFiProtocolAdapter,
  DeFiCapability,
  LangChainIntegration,
  
  // Schema and Validation Types
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
  DeepPartial,
  RequiredBy,
  OptionalBy,
  
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
} from './types';

// ============================================================================
// Tool Integration System Exports
// ============================================================================

export {
  ToolIntegrationEngine,
  ToolIntegrationConfig,
  ToolSearchCriteria,
  ToolMetrics,
  ToolMetricData
} from './ToolIntegrationSystem';

// ============================================================================
// Error Handling System Exports
// ============================================================================

export {
  ErrorHandlingEngine,
  ErrorCategory,
  ErrorSeverity,
  ErrorClassification,
  RetryStrategy as ErrorRetryStrategy,
  RetryContext,
  RecoveryStrategy,
  RecoveryResult,
  ErrorMapping,
  ErrorHandlingConfig,
  ErrorStatistics,
  CircuitBreaker
} from './ErrorHandlingStrategy';

// ============================================================================
// Utility Functions and Factories
// ============================================================================

/**
 * Create a default SAK integration configuration
 */
export function createDefaultSAKConfig(
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
  overrides: Partial<SAKIntegrationConfig> = {}
): SAKIntegrationConfig {
  const defaultConfig: SAKIntegrationConfig = {
    sakEndpoint: network === 'mainnet' 
      ? 'https://api.seiagentkit.com'
      : `https://api-${network}.seiagentkit.com`,
    network,
    defaultPermissions: ['read'],
    rateLimitConfig: {
      defaultMaxCalls: 100,
      defaultWindowMs: 60000
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 300000, // 5 minutes
      maxSize: 1000
    },
    retryConfig: {
      maxRetries: 3,
      backoffMs: 1000
    }
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * Create a tool integration engine with default configuration
 */
export function createToolIntegrationEngine(
  overrides: Partial<ToolIntegrationConfig> = {}
): ToolIntegrationEngine {
  const defaultConfig: ToolIntegrationConfig = {
    execution: {
      defaultTimeout: 30000,
      defaultRetries: 3,
      maxConcurrentExecutions: 10
    },
    cache: {
      enabled: true,
      ttl: 300000,
      maxSize: 1000,
      keyPrefix: 'sak_tool'
    },
    validation: {
      strict: true,
      sanitizeInput: true,
      validateOutput: false
    },
    monitoring: {
      enabled: true,
      metricsRetention: 3600000, // 1 hour
      alertThresholds: {
        errorRate: 0.1, // 10%
        responseTime: 5000 // 5 seconds
      }
    }
  };

  const config = { ...defaultConfig, ...overrides };
  return new ToolIntegrationEngine(config);
}

/**
 * Create an error handling engine with default configuration
 */
export function createErrorHandlingEngine(
  overrides: Partial<ErrorHandlingConfig> = {}
): ErrorHandlingEngine {
  const defaultConfig: ErrorHandlingConfig = {
    circuitBreaker: {
      failureThreshold: 5,
      timeoutMs: 60000,
      monitoringPeriodMs: 300000
    },
    errorHistory: {
      maxEntries: 1000,
      retentionMs: 3600000 // 1 hour
    },
    recovery: {
      enabled: true,
      maxAttempts: 3,
      strategies: ['parameterSanitization', 'fallbackEndpoint', 'gracefulDegradation']
    },
    escalation: {
      enabled: true,
      thresholds: {
        errorRate: 0.2, // 20%
        severity: ErrorSeverity.HIGH
      }
    }
  };

  const config = { ...defaultConfig, ...overrides };
  return new ErrorHandlingEngine(config);
}

/**
 * Create a complete SAK adapter with default configuration
 */
export function createSAKAdapter(
  agentConfig: import('../base/BaseAgent').AgentConfig,
  sakConfigOverrides: Partial<SAKIntegrationConfig> = {},
  toolConfigOverrides: Partial<ToolIntegrationConfig> = {},
  errorConfigOverrides: Partial<ErrorHandlingConfig> = {}
): SeiAgentKitAdapter {
  const sakConfig = createDefaultSAKConfig('mainnet', sakConfigOverrides);
  return new SeiAgentKitAdapter(agentConfig, sakConfig);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate SAK tool structure
 */
export function validateSAKTool(tool: any): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!tool || typeof tool !== 'object') {
    errors.push({ field: 'tool', message: 'Tool must be an object', code: 'INVALID_TYPE' });
    return { isValid: false, errors, warnings };
  }

  if (!tool.name || typeof tool.name !== 'string') {
    errors.push({ field: 'name', message: 'Tool name is required and must be a string', code: 'REQUIRED' });
  }

  if (!tool.description || typeof tool.description !== 'string') {
    errors.push({ field: 'description', message: 'Tool description is required and must be a string', code: 'REQUIRED' });
  }

  if (!tool.execute || typeof tool.execute !== 'function') {
    errors.push({ field: 'execute', message: 'Tool execute function is required', code: 'REQUIRED' });
  }

  if (!tool.category || !['blockchain', 'defi', 'trading', 'analysis', 'utility'].includes(tool.category)) {
    errors.push({ field: 'category', message: 'Valid tool category is required', code: 'INVALID_VALUE' });
  }

  if (tool.rateLimit) {
    if (typeof tool.rateLimit !== 'object') {
      errors.push({ field: 'rateLimit', message: 'Rate limit must be an object', code: 'INVALID_TYPE' });
    } else {
      if (typeof tool.rateLimit.maxCalls !== 'number' || tool.rateLimit.maxCalls <= 0) {
        errors.push({ field: 'rateLimit.maxCalls', message: 'Max calls must be a positive number', code: 'INVALID_VALUE' });
      }
      if (typeof tool.rateLimit.windowMs !== 'number' || tool.rateLimit.windowMs <= 0) {
        errors.push({ field: 'rateLimit.windowMs', message: 'Window duration must be a positive number', code: 'INVALID_VALUE' });
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate tool schema
 */
export function validateToolSchema(schema: any): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push({ field: 'schema', message: 'Schema must be an object', code: 'INVALID_TYPE' });
    return { isValid: false, errors, warnings };
  }

  if (!schema.name || typeof schema.name !== 'string') {
    errors.push({ field: 'name', message: 'Schema name is required and must be a string', code: 'REQUIRED' });
  }

  if (!schema.description || typeof schema.description !== 'string') {
    errors.push({ field: 'description', message: 'Schema description is required and must be a string', code: 'REQUIRED' });
  }

  if (!schema.parameters || typeof schema.parameters !== 'object') {
    errors.push({ field: 'parameters', message: 'Schema parameters are required and must be an object', code: 'REQUIRED' });
  } else {
    // Validate parameter schemas
    for (const [paramName, paramSchema] of Object.entries(schema.parameters)) {
      const paramErrors = validateParameterSchema(paramSchema as any, `parameters.${paramName}`);
      errors.push(...paramErrors);
    }
  }

  if (schema.examples && !Array.isArray(schema.examples)) {
    errors.push({ field: 'examples', message: 'Examples must be an array', code: 'INVALID_TYPE' });
  }

  if (schema.tags && !Array.isArray(schema.tags)) {
    errors.push({ field: 'tags', message: 'Tags must be an array', code: 'INVALID_TYPE' });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate parameter schema
 */
function validateParameterSchema(schema: any, path: string): any[] {
  const errors: any[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push({ field: path, message: 'Parameter schema must be an object', code: 'INVALID_TYPE' });
    return errors;
  }

  if (!schema.type || !['string', 'number', 'boolean', 'object', 'array'].includes(schema.type)) {
    errors.push({ field: `${path}.type`, message: 'Valid parameter type is required', code: 'INVALID_VALUE' });
  }

  if (typeof schema.required !== 'boolean') {
    errors.push({ field: `${path}.required`, message: 'Required field must be a boolean', code: 'INVALID_TYPE' });
  }

  if (!schema.description || typeof schema.description !== 'string') {
    errors.push({ field: `${path}.description`, message: 'Parameter description is required', code: 'REQUIRED' });
  }

  return errors;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for SAKTool
 */
export function isSAKTool(obj: any): obj is SAKTool {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.execute === 'function' &&
    typeof obj.category === 'string' &&
    ['blockchain', 'defi', 'trading', 'analysis', 'utility'].includes(obj.category);
}

/**
 * Type guard for SAKOperationResult
 */
export function isSAKOperationResult(obj: any): obj is SAKOperationResult {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    (obj.data !== undefined || obj.error !== undefined);
}

/**
 * Type guard for ExecutionContext
 */
export function isExecutionContext(obj: any): obj is ExecutionContext {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.toolName === 'string' &&
    typeof obj.parameters === 'object' &&
    typeof obj.startTime === 'number';
}

/**
 * Type guard for SAKError
 */
export function isSAKError(obj: any): obj is SAKError {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.retryable === 'boolean';
}

// ============================================================================
// Constants and Enums
// ============================================================================

/**
 * Default tool categories
 */
export const TOOL_CATEGORIES = {
  BLOCKCHAIN: 'blockchain',
  DEFI: 'defi',
  TRADING: 'trading',
  ANALYSIS: 'analysis',
  UTILITY: 'utility'
} as const;

/**
 * Default permissions
 */
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
} as const;

/**
 * Network configurations
 */
export const NETWORK_CONFIGS = {
  MAINNET: {
    chainId: 'pacific-1',
    rpcEndpoint: 'https://rpc.sei-apis.com',
    restEndpoint: 'https://rest.sei-apis.com'
  },
  TESTNET: {
    chainId: 'atlantic-2',
    rpcEndpoint: 'https://rpc-testnet.sei-apis.com',
    restEndpoint: 'https://rest-testnet.sei-apis.com'
  },
  DEVNET: {
    chainId: 'arctic-1',
    rpcEndpoint: 'https://rpc-devnet.sei-apis.com',
    restEndpoint: 'https://rest-devnet.sei-apis.com'
  }
} as const;

/**
 * Default rate limits
 */
export const DEFAULT_RATE_LIMITS = {
  GLOBAL: { maxRequests: 1000, windowMs: 3600000 }, // 1000 requests per hour
  PER_USER: { maxRequests: 100, windowMs: 3600000 }, // 100 requests per hour per user
  PER_TOOL: { maxRequests: 50, windowMs: 60000 }     // 50 requests per minute per tool
} as const;

/**
 * Default cache settings
 */
export const DEFAULT_CACHE_SETTINGS = {
  TTL: 300000,      // 5 minutes
  MAX_SIZE: 1000,   // 1000 entries
  KEY_PREFIX: 'sak'
} as const;

// ============================================================================
// Re-export types from dependencies for convenience
// ============================================================================

export type { Either } from 'fp-ts/Either';
export type { TaskEither } from 'fp-ts/TaskEither';
export type { AgentConfig, AgentError, ActionContext, ActionResult } from '../base/BaseAgent';