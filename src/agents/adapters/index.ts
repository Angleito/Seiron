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
// Hive Intelligence Adapter Exports
// ============================================================================

export {
  HiveIntelligenceAdapter,
  HiveIntelligenceConfig,
  HiveQuery,
  HiveQueryMetadata,
  HiveResponse,
  HiveSearchResult,
  HiveAnalyticsResult,
  HiveInsight,
  HiveRecommendation,
  CreditUsage,
  CreditQuery
} from './HiveIntelligenceAdapter';

// ============================================================================
// MCP Adapter Exports
// ============================================================================

export {
  SeiMCPAdapter,
  MCPConnectionManager,
  DragonBallThemeManager
} from './SeiMCPAdapter';

export type {
  MCPServerConfig,
  MCPMessage,
  MCPError,
  MCPTool,
  MCPParameterSchema,
  MCPToolExample,
  BlockchainState,
  ValidatorInfo,
  WalletBalance,
  TokenBalance,
  TransactionRequest,
  TransactionResponse,
  TransactionEvent,
  ContractInteraction,
  ContractQuery,
  ContractState,
  MCPContext,
  MCPResult
} from './SeiMCPAdapter';

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

/**
 * Create a default MCP server configuration
 */
export function createDefaultMCPConfig(
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
  overrides: Partial<MCPServerConfig> = {}
): MCPServerConfig {
  const defaultConfig: MCPServerConfig = {
    endpoint: network === 'mainnet' 
      ? 'mcp.sei-apis.com'
      : `mcp-${network}.sei-apis.com`,
    port: network === 'mainnet' ? 443 : 8443,
    secure: true,
    network,
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * Create a complete MCP adapter with default configuration
 */
export function createMCPAdapter(
  agentConfig: import('../base/BaseAgent').AgentConfig,
  mcpConfigOverrides: Partial<MCPServerConfig> = {}
): SeiMCPAdapter {
  const mcpConfig = createDefaultMCPConfig('mainnet', mcpConfigOverrides);
  return new SeiMCPAdapter(agentConfig, mcpConfig);
}

/**
 * Create a default Hive Intelligence configuration
 */
export function createDefaultHiveConfig(
  overrides: Partial<HiveIntelligenceConfig> = {}
): HiveIntelligenceConfig {
  const defaultConfig: HiveIntelligenceConfig = {
    baseUrl: 'https://api.hiveintelligence.xyz/v1',
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY || '',
    version: '1.0.0',
    rateLimitConfig: {
      maxRequests: 20,
      windowMs: 60000 // 1 minute
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 300000, // 5 minutes
      maxSize: 1000
    },
    retryConfig: {
      maxRetries: 3,
      backoffMs: 1000
    },
    creditConfig: {
      trackUsage: true,
      maxCreditsPerQuery: 10,
      alertThreshold: 100
    }
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * Create a complete Hive Intelligence adapter with default configuration
 */
export function createHiveAdapter(
  agentConfig: import('../base/BaseAgent').AgentConfig,
  hiveConfigOverrides: Partial<HiveIntelligenceConfig> = {}
): HiveIntelligenceAdapter {
  const hiveConfig = createDefaultHiveConfig(hiveConfigOverrides);
  return new HiveIntelligenceAdapter(agentConfig, hiveConfig);
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
 * Validate MCP tool structure
 */
export function validateMCPTool(tool: any): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!tool || typeof tool !== 'object') {
    errors.push({ field: 'tool', message: 'MCP tool must be an object', code: 'INVALID_TYPE' });
    return { isValid: false, errors, warnings };
  }

  if (!tool.name || typeof tool.name !== 'string') {
    errors.push({ field: 'name', message: 'MCP tool name is required and must be a string', code: 'REQUIRED' });
  }

  if (!tool.description || typeof tool.description !== 'string') {
    errors.push({ field: 'description', message: 'MCP tool description is required and must be a string', code: 'REQUIRED' });
  }

  if (!tool.category || !['blockchain', 'defi', 'wallet', 'contract', 'query'].includes(tool.category)) {
    errors.push({ field: 'category', message: 'Valid MCP tool category is required', code: 'INVALID_VALUE' });
  }

  if (!tool.parameters || typeof tool.parameters !== 'object') {
    errors.push({ field: 'parameters', message: 'MCP tool parameters are required and must be an object', code: 'REQUIRED' });
  } else {
    // Validate MCP parameter schemas
    for (const [paramName, paramSchema] of Object.entries(tool.parameters)) {
      const paramErrors = validateMCPParameterSchema(paramSchema as any, `parameters.${paramName}`);
      errors.push(...paramErrors);
    }
  }

  if (tool.powerLevel && (typeof tool.powerLevel !== 'number' || tool.powerLevel < 0)) {
    warnings.push({ field: 'powerLevel', message: 'Power level should be a non-negative number', code: 'INVALID_VALUE' });
  }

  if (tool.dragonBallTheme && typeof tool.dragonBallTheme !== 'string') {
    warnings.push({ field: 'dragonBallTheme', message: 'Dragon Ball theme should be a string', code: 'INVALID_TYPE' });
  }

  if (tool.examples && !Array.isArray(tool.examples)) {
    errors.push({ field: 'examples', message: 'Examples must be an array', code: 'INVALID_TYPE' });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate MCP server configuration
 */
export function validateMCPConfig(config: any): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ field: 'config', message: 'MCP config must be an object', code: 'INVALID_TYPE' });
    return { isValid: false, errors, warnings };
  }

  if (!config.endpoint || typeof config.endpoint !== 'string') {
    errors.push({ field: 'endpoint', message: 'MCP endpoint is required and must be a string', code: 'REQUIRED' });
  }

  if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
    errors.push({ field: 'port', message: 'Port must be a valid number between 1 and 65535', code: 'INVALID_VALUE' });
  }

  if (typeof config.secure !== 'boolean') {
    errors.push({ field: 'secure', message: 'Secure flag must be a boolean', code: 'INVALID_TYPE' });
  }

  if (!config.network || !['mainnet', 'testnet', 'devnet'].includes(config.network)) {
    errors.push({ field: 'network', message: 'Network must be one of: mainnet, testnet, devnet', code: 'INVALID_VALUE' });
  }

  if (typeof config.connectionTimeout !== 'number' || config.connectionTimeout <= 0) {
    errors.push({ field: 'connectionTimeout', message: 'Connection timeout must be a positive number', code: 'INVALID_VALUE' });
  }

  if (typeof config.heartbeatInterval !== 'number' || config.heartbeatInterval <= 0) {
    errors.push({ field: 'heartbeatInterval', message: 'Heartbeat interval must be a positive number', code: 'INVALID_VALUE' });
  }

  if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0) {
    errors.push({ field: 'retryAttempts', message: 'Retry attempts must be a non-negative number', code: 'INVALID_VALUE' });
  }

  if (typeof config.retryDelay !== 'number' || config.retryDelay < 0) {
    errors.push({ field: 'retryDelay', message: 'Retry delay must be a non-negative number', code: 'INVALID_VALUE' });
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

/**
 * Validate MCP parameter schema
 */
function validateMCPParameterSchema(schema: any, path: string): any[] {
  const errors: any[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push({ field: path, message: 'MCP parameter schema must be an object', code: 'INVALID_TYPE' });
    return errors;
  }

  if (!schema.type || !['string', 'number', 'boolean', 'object', 'array'].includes(schema.type)) {
    errors.push({ field: `${path}.type`, message: 'Valid MCP parameter type is required', code: 'INVALID_VALUE' });
  }

  if (!schema.description || typeof schema.description !== 'string') {
    errors.push({ field: `${path}.description`, message: 'MCP parameter description is required', code: 'REQUIRED' });
  }

  if (schema.required !== undefined && typeof schema.required !== 'boolean') {
    errors.push({ field: `${path}.required`, message: 'Required field must be a boolean', code: 'INVALID_TYPE' });
  }

  if (schema.format && typeof schema.format !== 'string') {
    errors.push({ field: `${path}.format`, message: 'Format must be a string', code: 'INVALID_TYPE' });
  }

  if (schema.pattern && typeof schema.pattern !== 'string') {
    errors.push({ field: `${path}.pattern`, message: 'Pattern must be a string', code: 'INVALID_TYPE' });
  }

  if (schema.enum && !Array.isArray(schema.enum)) {
    errors.push({ field: `${path}.enum`, message: 'Enum must be an array', code: 'INVALID_TYPE' });
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

/**
 * Type guard for MCPTool
 */
export function isMCPTool(obj: any): obj is MCPTool {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.category === 'string' &&
    ['blockchain', 'defi', 'wallet', 'contract', 'query'].includes(obj.category) &&
    obj.parameters &&
    typeof obj.parameters === 'object' &&
    obj.returns &&
    typeof obj.returns === 'object';
}

/**
 * Type guard for MCPMessage
 */
export function isMCPMessage(obj: any): obj is MCPMessage {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    ['request', 'response', 'notification', 'event'].includes(obj.type) &&
    typeof obj.method === 'string' &&
    typeof obj.timestamp === 'number';
}

/**
 * Type guard for MCPContext
 */
export function isMCPContext(obj: any): obj is MCPContext {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.chainId === 'string' &&
    typeof obj.network === 'string' &&
    ['mainnet', 'testnet', 'devnet'].includes(obj.network) &&
    Array.isArray(obj.permissions) &&
    typeof obj.sessionId === 'string';
}

/**
 * Type guard for WalletBalance
 */
export function isWalletBalance(obj: any): obj is WalletBalance {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.address === 'string' &&
    Array.isArray(obj.balances) &&
    typeof obj.totalValueUSD === 'number' &&
    typeof obj.lastUpdated === 'number';
}

/**
 * Type guard for TransactionResponse
 */
export function isTransactionResponse(obj: any): obj is TransactionResponse {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.txHash === 'string' &&
    typeof obj.height === 'number' &&
    typeof obj.code === 'number' &&
    typeof obj.gasUsed === 'number' &&
    typeof obj.gasWanted === 'number' &&
    typeof obj.timestamp === 'number' &&
    Array.isArray(obj.events);
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

/**
 * MCP tool categories
 */
export const MCP_TOOL_CATEGORIES = {
  BLOCKCHAIN: 'blockchain',
  DEFI: 'defi',
  WALLET: 'wallet',
  CONTRACT: 'contract',
  QUERY: 'query'
} as const;

/**
 * Dragon Ball Z power level tiers
 */
export const POWER_LEVEL_TIERS = {
  EARTHLING: { min: 0, max: 1000, title: 'Earthling Warrior' },
  ELITE: { min: 1000, max: 10000, title: 'Elite Fighter' },
  SUPER_SAIYAN: { min: 10000, max: 100000, title: 'Super Saiyan' },
  LEGENDARY: { min: 100000, max: 1000000, title: 'Legendary Super Saiyan' },
  ULTRA_INSTINCT: { min: 1000000, max: Infinity, title: 'Ultra Instinct Master' }
} as const;

/**
 * Default MCP connection settings
 */
export const DEFAULT_MCP_SETTINGS = {
  CONNECTION_TIMEOUT: 30000,    // 30 seconds
  HEARTBEAT_INTERVAL: 30000,    // 30 seconds
  RETRY_ATTEMPTS: 3,            // 3 retry attempts
  RETRY_DELAY: 1000,            // 1 second base delay
  MESSAGE_TIMEOUT: 30000        // 30 seconds for message responses
} as const;

// ============================================================================
// Re-export types from dependencies for convenience
// ============================================================================

export type { Either } from 'fp-ts/Either';
export type { TaskEither } from 'fp-ts/TaskEither';
export type { AgentConfig, AgentError, ActionContext, ActionResult } from '../base/BaseAgent';