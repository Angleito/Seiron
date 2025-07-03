# SeiAgentKitAdapter Integration Patterns

## Overview

The SeiAgentKitAdapter provides a comprehensive bridge between the Sei Agent Kit (SAK) and the existing BaseAgent architecture, maintaining fp-ts patterns while adding powerful blockchain and DeFi capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Integration Patterns](#integration-patterns)
4. [Usage Examples](#usage-examples)
5. [Error Handling](#error-handling)
6. [Configuration](#configuration)
7. [Best Practices](#best-practices)
8. [Advanced Features](#advanced-features)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BaseAgent Framework                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  LendingAgent   │  │ LiquidityAgent  │  │ MarketAgent  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                SeiAgentKitAdapter                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ OperationBridge │  │  ContextBridge  │  │ ErrorBridge  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ToolRegistration │  │ RateLimit Mgmt  │  │ Cache System │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Tool Integration System                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Validation    │  │   Middleware    │  │   Metrics    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│               Sei Agent Kit (SAK)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Blockchain APIs │  │   DeFi Tools    │  │ Trading APIs │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. SeiAgentKitAdapter

The main adapter class that extends BaseAgent and provides SAK integration:

```typescript
class SeiAgentKitAdapter extends BaseAgent {
  // Core bridges
  private readonly operationBridge: OperationBridge;
  private readonly contextBridge: ContextBridge;
  private readonly errorBridge: ErrorBridge;
  
  // Integration systems
  private readonly toolIntegrationEngine: ToolIntegrationEngine;
  private readonly errorHandlingEngine: ErrorHandlingEngine;
}
```

### 2. Bridge Pattern Implementation

#### Operation Bridge
Handles execution of SAK tools with fp-ts patterns:

```typescript
interface OperationBridge {
  execute<T>(
    toolName: string,
    params: Record<string, any>,
    context: SAKContext
  ): TaskEither<AgentError, SAKOperationResult<T>>;
  
  executeBatch<T>(
    operations: Operation[],
    context: SAKContext
  ): TaskEither<AgentError, Array<SAKOperationResult<T>>>;
}
```

#### Context Bridge
Maps between BaseAgent ActionContext and SAK Context:

```typescript
interface ContextBridge {
  mapActionContextToSAK(actionContext: ActionContext): Either<AgentError, SAKContext>;
  mapSAKResultToActionResult<T>(sakResult: SAKOperationResult<T>): Either<AgentError, ActionResult>;
}
```

#### Error Bridge
Handles error mapping and recovery:

```typescript
interface ErrorBridge {
  mapSAKError(error: any): AgentError;
  mapAgentError(error: AgentError): any;
  createRetryStrategy(error: any): Either<AgentError, RetryStrategy>;
}
```

### 3. Tool Integration System

Comprehensive tool management with:
- Registration and discovery
- Validation and middleware
- Caching and rate limiting
- Metrics and monitoring

### 4. Error Handling Strategy

Advanced error handling with:
- Error classification and mapping
- Retry strategies with exponential backoff
- Recovery mechanisms
- Circuit breaker pattern

## Integration Patterns

### 1. Tool Registration Pattern

```typescript
// Register a SAK tool
const sakTool: SAKTool = {
  name: 'get_balance',
  description: 'Get wallet balance for specified token',
  parameters: { address: 'string', token: 'string' },
  execute: async (params) => ({ balance: '1000', token: params.token }),
  category: 'blockchain'
};

const schema: ToolSchema = {
  name: 'get_balance',
  description: 'Get wallet balance for specified token',
  parameters: {
    address: { type: 'string', required: true, description: 'Wallet address' },
    token: { type: 'string', required: true, description: 'Token symbol' }
  },
  returns: { type: 'object', required: true, description: 'Balance information' },
  examples: [],
  tags: ['blockchain', 'balance']
};

// Register with adapter
const result = adapter.registerSAKTool(sakTool, schema);
```

### 2. Execution Pattern with fp-ts

```typescript
// Execute a SAK tool with full fp-ts integration
const executeBalance = (address: string, token: string): TaskEither<AgentError, BalanceResult> =>
  pipe(
    adapter.executeSAKTool<BalanceResult>('get_balance', { address, token }),
    TE.chain(sakResult => 
      sakResult.success 
        ? TE.right(sakResult.data!)
        : TE.left(adapter.createError('BALANCE_FETCH_FAILED', sakResult.error?.message || 'Unknown error'))
    )
  );

// Usage with error handling
const balanceResult = await executeBalance('sei1address...', 'SEI')();
if (balanceResult._tag === 'Right') {
  console.log('Balance:', balanceResult.right.balance);
} else {
  console.error('Error:', balanceResult.left.message);
}
```

### 3. Batch Operations Pattern

```typescript
// Execute multiple operations in batch
const batchOperations = [
  { toolName: 'get_balance', parameters: { address: 'sei1...', token: 'SEI' } },
  { toolName: 'get_balance', parameters: { address: 'sei1...', token: 'USDC' } },
  { toolName: 'get_transaction_history', parameters: { address: 'sei1...', limit: 10 } }
];

const batchResult = await adapter.executeSAKBatch(batchOperations)();
```

### 4. Agent Integration Pattern

```typescript
class EnhancedLendingAgent extends SeiAgentKitAdapter {
  constructor(config: AgentConfig, sakConfig: SAKIntegrationConfig) {
    super(config, sakConfig);
    this.registerLendingActions();
  }

  private registerLendingActions(): void {
    // Register SAK-enhanced lending actions
    this.registerAction({
      id: 'sak_deposit',
      name: 'SAK Enhanced Deposit',
      description: 'Deposit to lending protocol using SAK',
      handler: this.handleSAKDeposit.bind(this),
      validation: [
        { field: 'protocol', required: true, type: 'string' },
        { field: 'amount', required: true, type: 'number' },
        { field: 'asset', required: true, type: 'string' }
      ]
    });
  }

  private handleSAKDeposit(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { protocol, amount, asset } = context.parameters;

    return pipe(
      // Use SAK tool for actual blockchain interaction
      this.executeSAKTool('lending_deposit', { protocol, amount, asset }),
      TE.chain(sakResult => 
        pipe(
          this.contextBridge.mapSAKResultToActionResult(sakResult),
          TE.fromEither
        )
      ),
      // Update local state
      TE.chain(result => this.updateLendingState(result.data))
    );
  }
}
```

### 5. Middleware Pattern

```typescript
// Custom validation middleware
const validationMiddleware: ToolMiddleware = {
  name: 'customValidation',
  priority: 500,
  handler: (context, next) => {
    // Custom validation logic
    const validationResult = validateBusinessRules(context.parameters);
    
    if (!validationResult.isValid) {
      return TE.left(createValidationError(validationResult.errors));
    }
    
    return next();
  }
};

// Register middleware
adapter.getToolIntegrationEngine().registerMiddleware(validationMiddleware);
```

## Usage Examples

### Basic Tool Execution

```typescript
import { SeiAgentKitAdapter } from './adapters/SeiAgentKitAdapter';

// Initialize adapter
const adapter = new SeiAgentKitAdapter(agentConfig, sakConfig);

// Install SAK plugin
await adapter.installSAKPlugin()();

// Execute a tool
const result = await adapter.executeSAKTool('get_balance', {
  address: 'sei1address...',
  token: 'SEI'
})();

if (result._tag === 'Right') {
  console.log('Balance:', result.right.data);
}
```

### Error Handling with Recovery

```typescript
const executeWithRecovery = (toolName: string, params: any) =>
  pipe(
    adapter.executeSAKTool(toolName, params),
    TE.orElse(error => {
      // Attempt recovery based on error type
      if (error.code === 'NETWORK_ERROR') {
        console.log('Network error, retrying with backup endpoint...');
        return adapter.executeSAKTool(toolName, { ...params, useBackup: true });
      }
      return TE.left(error);
    })
  );
```

### Caching Pattern

```typescript
// Execute with caching
const cachedBalance = await adapter.executeWithCache('get_balance', {
  address: 'sei1address...',
  token: 'SEI'
})();

// Cache is automatically managed based on configuration
```

### Monitoring and Metrics

```typescript
// Get tool metrics
const metrics = adapter.getToolIntegrationEngine().getMetrics('get_balance');
console.log(`Tool executed ${metrics?.totalExecutions} times`);

// Listen to events
adapter.on('sak:adapter:event', (event) => {
  console.log('SAK Event:', event);
});
```

## Error Handling

The adapter provides comprehensive error handling with multiple strategies:

### Error Classification

Errors are automatically classified into categories:
- `VALIDATION`: Parameter validation errors
- `PERMISSION`: Authorization errors
- `RATE_LIMIT`: Rate limiting errors
- `NETWORK`: Network connectivity errors
- `EXECUTION`: Tool execution errors
- `CONFIGURATION`: Configuration errors

### Retry Strategies

Multiple built-in retry strategies:

```typescript
// Default exponential backoff
await adapter.executeRetry(() => 
  adapter.executeSAKTool('problematic_tool', params), 
  context, 
  'default'
)();

// Network-specific retry
await adapter.executeRetry(() => 
  adapter.executeSAKTool('network_tool', params), 
  context, 
  'network'
)();
```

### Recovery Mechanisms

Automatic recovery for common scenarios:
- Permission elevation
- Fallback endpoints
- Parameter sanitization
- Graceful degradation

### Circuit Breaker

Automatic circuit breaking for failing tools:

```typescript
// Circuit breaker opens after 5 failures
// Provides fast-fail behavior to prevent cascading failures
```

## Configuration

### Basic Configuration

```typescript
const sakConfig: SAKIntegrationConfig = {
  sakEndpoint: 'https://api.seiagentkit.com',
  apiKey: 'your-api-key',
  network: 'mainnet',
  defaultPermissions: ['read', 'write'],
  rateLimitConfig: {
    defaultMaxCalls: 100,
    defaultWindowMs: 60000
  },
  cacheConfig: {
    enabled: true,
    ttlMs: 300000,
    maxSize: 1000
  },
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000
  }
};
```

### Advanced Configuration

```typescript
const advancedConfig: SAKAdapterConfig = {
  core: {
    adapterId: 'lending-sak-adapter',
    name: 'Enhanced Lending Agent with SAK',
    version: '1.0.0',
    description: 'Lending agent with SAK integration'
  },
  network: {
    rpcEndpoint: 'https://rpc.sei-apis.com',
    restEndpoint: 'https://rest.sei-apis.com',
    chainId: 'pacific-1',
    chainName: 'Sei',
    nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 6 },
    blockExplorer: 'https://seistream.app',
    gasPrice: { low: '0.1', medium: '0.2', high: '0.3' }
  },
  security: {
    permissions: {
      defaultPermissions: ['read'],
      roleBasedPermissions: {
        admin: ['read', 'write', 'admin'],
        user: ['read', 'write']
      }
    },
    rateLimiting: {
      global: { maxRequests: 1000, windowMs: 3600000 },
      perUser: { maxRequests: 100, windowMs: 3600000 }
    }
  }
};
```

## Best Practices

### 1. Error Handling

```typescript
// Always use fp-ts patterns for error handling
const safeExecution = (toolName: string, params: any) =>
  pipe(
    adapter.executeSAKTool(toolName, params),
    TE.mapLeft(error => {
      // Log error
      console.error(`Tool ${toolName} failed:`, error);
      return error;
    }),
    TE.map(result => {
      // Log success
      console.log(`Tool ${toolName} succeeded`);
      return result;
    })
  );
```

### 2. Resource Management

```typescript
// Use batch operations for multiple related calls
const batchOperations = groupRelatedOperations(operations);
const results = await adapter.executeSAKBatch(batchOperations)();
```

### 3. Caching Strategy

```typescript
// Cache expensive operations
const expensiveOperation = (params: any) =>
  pipe(
    adapter.getFromCache(generateCacheKey(params)),
    TE.orElse(() => 
      pipe(
        adapter.executeSAKTool('expensive_tool', params),
        TE.map(result => {
          adapter.setInCache(generateCacheKey(params), result);
          return result;
        })
      )
    )
  );
```

### 4. Type Safety

```typescript
// Use strongly typed interfaces
interface BalanceResult {
  balance: string;
  token: string;
  decimals: number;
}

const getBalance = (address: string, token: string): TaskEither<AgentError, BalanceResult> =>
  adapter.executeSAKTool<BalanceResult>('get_balance', { address, token });
```

### 5. Monitoring

```typescript
// Set up comprehensive monitoring
adapter.on('sak:adapter:event', (event) => {
  switch (event.type) {
    case 'tool:executed':
      metrics.incrementCounter('sak_tool_executions', { tool: event.toolName });
      break;
    case 'tool:failed':
      metrics.incrementCounter('sak_tool_failures', { tool: event.toolName, error: event.error });
      break;
    case 'rateLimit:exceeded':
      alerts.send('Rate limit exceeded', event);
      break;
  }
});
```

## Advanced Features

### 1. Custom Tool Registration

```typescript
// Register custom SAK tool with advanced configuration
const customTool: SAKTool = {
  name: 'custom_defi_operation',
  description: 'Custom DeFi operation with specific business logic',
  parameters: { /* ... */ },
  execute: async (params) => {
    // Custom implementation
    return await performCustomOperation(params);
  },
  category: 'defi',
  permission: 'write',
  rateLimit: { maxCalls: 10, windowMs: 60000 }
};

const schema: ToolSchema = {
  /* ... */
};

const config: Partial<ToolConfig> = {
  timeout: 30000,
  retries: 5,
  cache: { enabled: true, ttl: 60000, key: 'custom_op' }
};

adapter.registerSAKTool(customTool, schema, config);
```

### 2. Middleware Composition

```typescript
// Compose multiple middleware for complex workflows
const authMiddleware = createAuthMiddleware();
const validationMiddleware = createValidationMiddleware();
const auditMiddleware = createAuditMiddleware();

// Register middleware in order of execution
[authMiddleware, validationMiddleware, auditMiddleware].forEach(mw => 
  adapter.getToolIntegrationEngine().registerMiddleware(mw)
);
```

### 3. Custom Recovery Strategies

```typescript
// Implement custom recovery strategy
const customRecovery: RecoveryStrategy = {
  name: 'customBusinessLogicRecovery',
  applicableErrors: ['BUSINESS_RULE_VIOLATION'],
  priority: 100,
  validate: (error, context) => {
    return error.code === 'BUSINESS_RULE_VIOLATION' && 
           context.metadata.recoverable === true;
  },
  execute: (error, context) => {
    return pipe(
      // Attempt to resolve business rule violation
      resolveBusinessRuleViolation(error, context),
      TE.chain(() => 
        // Retry original operation
        adapter.executeSAKTool(context.toolName, context.parameters)
      ),
      TE.map(result => result as ExecutionResult)
    );
  }
};

adapter.getErrorHandlingEngine().registerRecoveryStrategy(customRecovery);
```

### 4. Performance Optimization

```typescript
// Use performance optimizations
const optimizedExecution = (operations: Operation[]) =>
  pipe(
    // Group operations by priority
    groupOperationsByPriority(operations),
    // Execute high priority operations first
    ([highPriority, normalPriority]) =>
      pipe(
        adapter.executeSAKBatch(highPriority),
        TE.chain(highPriorityResults =>
          pipe(
            adapter.executeSAKBatch(normalPriority),
            TE.map(normalResults => [...highPriorityResults, ...normalResults])
          )
        )
      )
  );
```

This comprehensive documentation provides a complete guide to using the SeiAgentKitAdapter system, from basic usage to advanced patterns and optimizations.