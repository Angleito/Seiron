import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

import { AgentError } from '../base/BaseAgent';
import {
  SAKError,
  ValidationError,
  PermissionError,
  RateLimitError,
  NetworkError,
  ExecutionError,
  ConfigurationError,
  ExecutionContext,
  ExecutionResult
} from './types';

/**
 * Comprehensive Error Handling Strategy for SAK Integration
 * 
 * This system provides robust error handling, recovery mechanisms, and
 * error mapping between the SAK system and the existing fp-ts patterns.
 */

// ============================================================================
// Error Categories and Classification
// ============================================================================

export enum ErrorCategory {
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rateLimit',
  NETWORK = 'network',
  EXECUTION = 'execution',
  CONFIGURATION = 'configuration',
  TIMEOUT = 'timeout',
  RESOURCE = 'resource',
  BUSINESS_LOGIC = 'businessLogic',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  recoverable: boolean;
  requiresUserAction: boolean;
  escalate: boolean;
}

// ============================================================================
// Retry Strategy System
// ============================================================================

export interface RetryStrategy {
  name: string;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryCondition: (error: SAKError, attempt: number) => boolean;
  onRetry?: (error: SAKError, attempt: number) => void;
  onFailure?: (error: SAKError, totalAttempts: number) => void;
}

export interface RetryContext {
  executionId: string;
  toolName: string;
  attempt: number;
  totalAttempts: number;
  lastError: SAKError;
  startTime: number;
  retryDelays: number[];
}

// ============================================================================
// Recovery Strategy System
// ============================================================================

export interface RecoveryStrategy {
  name: string;
  applicableErrors: string[];
  priority: number;
  execute: (error: SAKError, context: ExecutionContext) => TaskEither<SAKError, ExecutionResult>;
  validate: (error: SAKError, context: ExecutionContext) => boolean;
}

export interface RecoveryResult {
  strategy: string;
  success: boolean;
  newResult?: ExecutionResult;
  newError?: SAKError;
  metadata: {
    recoveryTime: number;
    originalError: SAKError;
    recoveryAttempts: number;
  };
}

// ============================================================================
// Error Mapping System
// ============================================================================

export interface ErrorMapping {
  sourceType: string;
  targetType: 'AgentError' | 'SAKError';
  mapper: (error: any) => AgentError | SAKError;
  validator: (error: any) => boolean;
}

// ============================================================================
// Main Error Handling Engine
// ============================================================================

export class ErrorHandlingEngine extends EventEmitter {
  private readonly retryStrategies = new Map<string, RetryStrategy>();
  private readonly recoveryStrategies = new Map<string, RecoveryStrategy>();
  private readonly errorMappings = new Map<string, ErrorMapping>();
  private readonly errorHistory = new Map<string, ErrorHistoryEntry[]>();
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  
  constructor(
    private readonly config: ErrorHandlingConfig
  ) {
    super();
    this.setupDefaultStrategies();
    this.setupDefaultMappings();
    this.setupDefaultRecoveryStrategies();
    this.setupCleanupTimers();
  }

  // ============================================================================
  // Error Classification and Handling
  // ============================================================================

  /**
   * Classify an error and determine handling strategy
   */
  public classifyError(error: any): ErrorClassification {
    if (this.isValidationError(error)) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        recoverable: true,
        requiresUserAction: true,
        escalate: false
      };
    }

    if (this.isPermissionError(error)) {
      return {
        category: ErrorCategory.PERMISSION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        recoverable: false,
        requiresUserAction: true,
        escalate: true
      };
    }

    if (this.isRateLimitError(error)) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.LOW,
        retryable: true,
        recoverable: true,
        requiresUserAction: false,
        escalate: false
      };
    }

    if (this.isNetworkError(error)) {
      return {
        category: ErrorCategory.NETWORK,
        severity: this.getNetworkErrorSeverity(error),
        retryable: true,
        recoverable: true,
        requiresUserAction: false,
        escalate: this.shouldEscalateNetworkError(error)
      };
    }

    if (this.isTimeoutError(error)) {
      return {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoverable: true,
        requiresUserAction: false,
        escalate: false
      };
    }

    if (this.isResourceError(error)) {
      return {
        category: ErrorCategory.RESOURCE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        recoverable: true,
        requiresUserAction: false,
        escalate: true
      };
    }

    // Default classification for unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: false,
      requiresUserAction: true,
      escalate: true
    };
  }

  /**
   * Handle an error with comprehensive strategy
   */
  public handleError(
    error: any,
    context: ExecutionContext
  ): TaskEither<SAKError, ExecutionResult> {
    const sakError = this.mapToSAKError(error, context);
    const classification = this.classifyError(sakError);
    
    // Record error in history
    this.recordError(context.toolName, sakError, context);
    
    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(context.toolName);
    if (circuitBreaker.isOpen()) {
      return TE.left(this.createCircuitBreakerError(context.toolName));
    }
    
    // Record failure in circuit breaker
    circuitBreaker.recordFailure();
    
    // Emit error event
    this.emitErrorEvent(sakError, classification, context);
    
    // Apply handling strategy based on classification
    return pipe(
      this.attemptRecovery(sakError, context, classification),
      TE.orElse(() => this.attemptRetry(sakError, context, classification)),
      TE.orElse(() => TE.left(this.enrichError(sakError, classification, context)))
    );
  }

  /**
   * Execute operation with error handling
   */
  public executeWithErrorHandling<T>(
    operation: () => TaskEither<any, T>,
    context: ExecutionContext
  ): TaskEither<SAKError, T> {
    return pipe(
      operation(),
      TE.mapLeft(error => this.mapToSAKError(error, context)),
      TE.orElse(error => this.handleError(error, context) as TaskEither<SAKError, T>)
    );
  }

  // ============================================================================
  // Retry Strategy Management
  // ============================================================================

  /**
   * Register a retry strategy
   */
  public registerRetryStrategy(strategy: RetryStrategy): Either<SAKError, void> {
    if (this.retryStrategies.has(strategy.name)) {
      return left(this.createError('STRATEGY_EXISTS', `Retry strategy ${strategy.name} already exists`));
    }
    
    this.retryStrategies.set(strategy.name, strategy);
    return right(undefined);
  }

  /**
   * Execute retry strategy
   */
  public executeRetry<T>(
    operation: () => TaskEither<SAKError, T>,
    context: ExecutionContext,
    strategyName: string = 'default'
  ): TaskEither<SAKError, T> {
    const strategy = this.retryStrategies.get(strategyName);
    if (!strategy) {
      return TE.left(this.createError('STRATEGY_NOT_FOUND', `Retry strategy ${strategyName} not found`));
    }

    return this.executeRetryWithStrategy(operation, context, strategy);
  }

  /**
   * Execute operation with specific retry strategy
   */
  private executeRetryWithStrategy<T>(
    operation: () => TaskEither<SAKError, T>,
    context: ExecutionContext,
    strategy: RetryStrategy
  ): TaskEither<SAKError, T> {
    const retryContext: RetryContext = {
      executionId: context.id,
      toolName: context.toolName,
      attempt: 0,
      totalAttempts: strategy.maxAttempts,
      lastError: this.createError('INITIAL', 'Initial execution'),
      startTime: Date.now(),
      retryDelays: []
    };

    return this.performRetryAttempt(operation, context, strategy, retryContext);
  }

  /**
   * Perform individual retry attempt
   */
  private performRetryAttempt<T>(
    operation: () => TaskEither<SAKError, T>,
    context: ExecutionContext,
    strategy: RetryStrategy,
    retryContext: RetryContext
  ): TaskEither<SAKError, T> {
    retryContext.attempt++;

    return pipe(
      operation(),
      TE.orElse(error => {
        retryContext.lastError = error;
        
        // Check if we should retry
        if (retryContext.attempt >= strategy.maxAttempts || 
            !strategy.retryCondition(error, retryContext.attempt)) {
          
          // Call failure callback
          if (strategy.onFailure) {
            strategy.onFailure(error, retryContext.attempt);
          }
          
          return TE.left(this.enrichRetryError(error, retryContext));
        }

        // Calculate delay
        const delay = this.calculateRetryDelay(strategy, retryContext.attempt);
        retryContext.retryDelays.push(delay);

        // Call retry callback
        if (strategy.onRetry) {
          strategy.onRetry(error, retryContext.attempt);
        }

        // Emit retry event
        this.emitRetryEvent(error, retryContext, delay);

        // Wait and retry
        return pipe(
          TE.fromTask(() => new Promise(resolve => setTimeout(resolve, delay))),
          TE.chain(() => this.performRetryAttempt(operation, context, strategy, retryContext))
        );
      })
    );
  }

  /**
   * Calculate retry delay with jitter
   */
  private calculateRetryDelay(strategy: RetryStrategy, attempt: number): number {
    const exponentialDelay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, strategy.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * strategy.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  // ============================================================================
  // Recovery Strategy Management
  // ============================================================================

  /**
   * Register a recovery strategy
   */
  public registerRecoveryStrategy(strategy: RecoveryStrategy): Either<SAKError, void> {
    if (this.recoveryStrategies.has(strategy.name)) {
      return left(this.createError('STRATEGY_EXISTS', `Recovery strategy ${strategy.name} already exists`));
    }
    
    this.recoveryStrategies.set(strategy.name, strategy);
    return right(undefined);
  }

  /**
   * Attempt error recovery
   */
  private attemptRecovery(
    error: SAKError,
    context: ExecutionContext,
    classification: ErrorClassification
  ): TaskEither<SAKError, ExecutionResult> {
    if (!classification.recoverable) {
      return TE.left(error);
    }

    // Get applicable recovery strategies
    const strategies = this.getApplicableRecoveryStrategies(error, context);
    
    if (strategies.length === 0) {
      return TE.left(error);
    }

    // Sort by priority and try each strategy
    const sortedStrategies = strategies.sort((a, b) => b.priority - a.priority);
    
    return this.tryRecoveryStrategies(error, context, sortedStrategies, 0);
  }

  /**
   * Try recovery strategies in sequence
   */
  private tryRecoveryStrategies(
    error: SAKError,
    context: ExecutionContext,
    strategies: RecoveryStrategy[],
    index: number
  ): TaskEither<SAKError, ExecutionResult> {
    if (index >= strategies.length) {
      return TE.left(error);
    }

    const strategy = strategies[index];
    const startTime = Date.now();

    return pipe(
      strategy.execute(error, context),
      TE.map(result => {
        // Emit recovery success event
        this.emitRecoveryEvent(strategy.name, error, context, true, Date.now() - startTime);
        return result;
      }),
      TE.orElse(recoveryError => {
        // Emit recovery failure event
        this.emitRecoveryEvent(strategy.name, error, context, false, Date.now() - startTime);
        
        // Try next strategy
        return this.tryRecoveryStrategies(error, context, strategies, index + 1);
      })
    );
  }

  /**
   * Get applicable recovery strategies for error
   */
  private getApplicableRecoveryStrategies(
    error: SAKError,
    context: ExecutionContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    for (const strategy of this.recoveryStrategies.values()) {
      // Check if strategy applies to this error type
      if (strategy.applicableErrors.includes('*') || 
          strategy.applicableErrors.includes(error.code) ||
          strategy.applicableErrors.includes(error.category)) {
        
        // Validate strategy can handle this specific case
        if (strategy.validate(error, context)) {
          strategies.push(strategy);
        }
      }
    }

    return strategies;
  }

  // ============================================================================
  // Error Mapping System
  // ============================================================================

  /**
   * Map any error to SAKError
   */
  public mapToSAKError(error: any, context?: ExecutionContext): SAKError {
    // If already a SAKError, return as-is
    if (this.isSAKError(error)) {
      return error;
    }

    // If it's an AgentError, map to SAKError
    if (this.isAgentError(error)) {
      return this.mapAgentErrorToSAK(error, context);
    }

    // Try registered mappers
    for (const mapping of this.errorMappings.values()) {
      if (mapping.validator(error)) {
        const mapped = mapping.mapper(error);
        return this.isSAKError(mapped) ? mapped : this.mapAgentErrorToSAK(mapped as AgentError, context);
      }
    }

    // Default mapping for unknown errors
    return this.createUnknownError(error, context);
  }

  /**
   * Map AgentError to SAKError
   */
  private mapAgentErrorToSAK(error: AgentError, context?: ExecutionContext): SAKError {
    return {
      ...error,
      category: this.mapErrorCodeToCategory(error.code),
      severity: this.mapErrorCodeToSeverity(error.code),
      retryable: this.isRetryableErrorCode(error.code),
      context
    };
  }

  /**
   * Map SAKError to AgentError
   */
  public mapSAKErrorToAgent(error: SAKError): AgentError {
    return {
      code: error.code,
      message: error.message,
      details: {
        ...error.details,
        category: error.category,
        severity: error.severity,
        retryable: error.retryable
      },
      timestamp: error.timestamp,
      agentId: error.agentId
    };
  }

  // ============================================================================
  // Circuit Breaker System
  // ============================================================================

  /**
   * Get or create circuit breaker for tool
   */
  private getCircuitBreaker(toolName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(toolName)) {
      this.circuitBreakers.set(toolName, new CircuitBreaker({
        failureThreshold: this.config.circuitBreaker.failureThreshold,
        timeoutMs: this.config.circuitBreaker.timeoutMs,
        monitoringPeriodMs: this.config.circuitBreaker.monitoringPeriodMs
      }));
    }
    return this.circuitBreakers.get(toolName)!;
  }

  /**
   * Create circuit breaker error
   */
  private createCircuitBreakerError(toolName: string): SAKError {
    return {
      code: 'CIRCUIT_BREAKER_OPEN',
      message: `Circuit breaker is open for tool: ${toolName}`,
      details: { toolName },
      timestamp: new Date(),
      agentId: 'error-handling-engine',
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.HIGH,
      retryable: true
    };
  }

  // ============================================================================
  // Error History and Analytics
  // ============================================================================

  /**
   * Record error in history
   */
  private recordError(toolName: string, error: SAKError, context: ExecutionContext): void {
    const entry: ErrorHistoryEntry = {
      timestamp: Date.now(),
      error,
      context: {
        executionId: context.id,
        userId: context.userId,
        sessionId: context.sessionId,
        metadata: context.metadata
      },
      resolved: false
    };

    const history = this.errorHistory.get(toolName) || [];
    history.push(entry);
    
    // Keep only recent entries
    if (history.length > this.config.errorHistory.maxEntries) {
      history.splice(0, history.length - this.config.errorHistory.maxEntries);
    }
    
    this.errorHistory.set(toolName, history);
  }

  /**
   * Get error statistics for tool
   */
  public getErrorStatistics(toolName: string, timeRangeMs: number = 3600000): ErrorStatistics {
    const history = this.errorHistory.get(toolName) || [];
    const cutoff = Date.now() - timeRangeMs;
    const recentErrors = history.filter(entry => entry.timestamp > cutoff);

    const stats: ErrorStatistics = {
      totalErrors: recentErrors.length,
      errorsByCategory: new Map(),
      errorsBySeverity: new Map(),
      retryableErrors: 0,
      resolvedErrors: 0,
      averageResolutionTime: 0,
      errorRate: 0,
      topErrors: []
    };

    // Calculate statistics
    recentErrors.forEach(entry => {
      // Count by category
      const categoryCount = stats.errorsByCategory.get(entry.error.category) || 0;
      stats.errorsByCategory.set(entry.error.category, categoryCount + 1);

      // Count by severity
      const severityCount = stats.errorsBySeverity.get(entry.error.severity) || 0;
      stats.errorsBySeverity.set(entry.error.severity, severityCount + 1);

      // Count retryable and resolved
      if (entry.error.retryable) stats.retryableErrors++;
      if (entry.resolved) stats.resolvedErrors++;
    });

    // Calculate error rate (errors per hour)
    stats.errorRate = (recentErrors.length / timeRangeMs) * 3600000;

    // Get top error codes
    const errorCounts = new Map<string, number>();
    recentErrors.forEach(entry => {
      const count = errorCounts.get(entry.error.code) || 0;
      errorCounts.set(entry.error.code, count + 1);
    });

    stats.topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return stats;
  }

  // ============================================================================
  // Setup and Initialization
  // ============================================================================

  /**
   * Setup default retry strategies
   */
  private setupDefaultStrategies(): void {
    // Default exponential backoff strategy
    this.registerRetryStrategy({
      name: 'default',
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryCondition: (error, attempt) => {
        return error.retryable && attempt <= 3;
      }
    });

    // Network error strategy
    this.registerRetryStrategy({
      name: 'network',
      maxAttempts: 5,
      baseDelayMs: 500,
      maxDelayMs: 10000,
      backoffMultiplier: 1.5,
      jitterFactor: 0.2,
      retryCondition: (error, attempt) => {
        return error.category === ErrorCategory.NETWORK && attempt <= 5;
      }
    });

    // Rate limit strategy
    this.registerRetryStrategy({
      name: 'rateLimit',
      maxAttempts: 10,
      baseDelayMs: 2000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      jitterFactor: 0.3,
      retryCondition: (error, attempt) => {
        return error.category === ErrorCategory.RATE_LIMIT && attempt <= 10;
      }
    });

    // Critical operation strategy (more aggressive)
    this.registerRetryStrategy({
      name: 'critical',
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 1.2,
      jitterFactor: 0.05,
      retryCondition: (error, attempt) => {
        return error.retryable && error.severity !== ErrorSeverity.CRITICAL;
      }
    });
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // Permission elevation recovery
    this.registerRecoveryStrategy({
      name: 'permissionElevation',
      applicableErrors: ['PERMISSION_DENIED'],
      priority: 100,
      validate: (error, context) => {
        return error.category === ErrorCategory.PERMISSION && 
               context.metadata.source === 'api';
      },
      execute: (error, context) => {
        // Attempt to elevate permissions or use fallback method
        return TE.left(error); // Placeholder - would implement actual elevation logic
      }
    });

    // Fallback endpoint recovery
    this.registerRecoveryStrategy({
      name: 'fallbackEndpoint',
      applicableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR'],
      priority: 90,
      validate: (error, context) => {
        return error.category === ErrorCategory.NETWORK;
      },
      execute: (error, context) => {
        // Try alternative endpoint or cached result
        return TE.left(error); // Placeholder - would implement fallback logic
      }
    });

    // Parameter sanitization recovery
    this.registerRecoveryStrategy({
      name: 'parameterSanitization',
      applicableErrors: ['PARAMETER_VALIDATION_FAILED'],
      priority: 80,
      validate: (error, context) => {
        return error.category === ErrorCategory.VALIDATION;
      },
      execute: (error, context) => {
        // Attempt to sanitize and retry with cleaned parameters
        return TE.left(error); // Placeholder - would implement sanitization logic
      }
    });

    // Graceful degradation recovery
    this.registerRecoveryStrategy({
      name: 'gracefulDegradation',
      applicableErrors: ['*'],
      priority: 10,
      validate: (error, context) => {
        return context.metadata.priority !== 'high';
      },
      execute: (error, context) => {
        // Return partial or cached result
        return TE.right({
          success: false,
          error: {
            code: 'GRACEFUL_DEGRADATION',
            message: 'Operation failed, returning degraded result',
            details: error
          },
          metadata: {
            executionId: context.id,
            toolName: context.toolName,
            duration: 0,
            timestamp: Date.now(),
            degraded: true
          }
        } as ExecutionResult);
      }
    });
  }

  /**
   * Setup default error mappings
   */
  private setupDefaultMappings(): void {
    // JavaScript Error mapping
    this.errorMappings.set('Error', {
      sourceType: 'Error',
      targetType: 'SAKError',
      validator: (error) => error instanceof Error,
      mapper: (error: Error) => this.createUnknownError(error)
    });

    // Network/HTTP error mapping
    this.errorMappings.set('NetworkError', {
      sourceType: 'NetworkError',
      targetType: 'SAKError',
      validator: (error) => error.name === 'NetworkError' || error.code?.startsWith('NETWORK'),
      mapper: (error) => ({
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Network operation failed',
        details: error,
        timestamp: new Date(),
        agentId: 'error-handling-engine',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      })
    });

    // Timeout error mapping
    this.errorMappings.set('TimeoutError', {
      sourceType: 'TimeoutError',
      targetType: 'SAKError',
      validator: (error) => error.name === 'TimeoutError' || error.message?.includes('timeout'),
      mapper: (error) => ({
        code: 'TIMEOUT_ERROR',
        message: error.message || 'Operation timed out',
        details: error,
        timestamp: new Date(),
        agentId: 'error-handling-engine',
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      })
    });
  }

  /**
   * Setup cleanup timers
   */
  private setupCleanupTimers(): void {
    // Error history cleanup
    setInterval(() => {
      this.cleanupErrorHistory();
    }, this.config.errorHistory.cleanupInterval || 3600000); // 1 hour

    // Circuit breaker cleanup
    setInterval(() => {
      this.cleanupCircuitBreakers();
    }, 300000); // 5 minutes
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private isValidationError(error: any): boolean {
    return error.category === ErrorCategory.VALIDATION ||
           error.code?.includes('VALIDATION') ||
           error.code?.includes('PARAMETER');
  }

  private isPermissionError(error: any): boolean {
    return error.category === ErrorCategory.PERMISSION ||
           error.code?.includes('PERMISSION') ||
           error.code?.includes('UNAUTHORIZED');
  }

  private isRateLimitError(error: any): boolean {
    return error.category === ErrorCategory.RATE_LIMIT ||
           error.code?.includes('RATE_LIMIT') ||
           error.code?.includes('TOO_MANY_REQUESTS');
  }

  private isNetworkError(error: any): boolean {
    return error.category === ErrorCategory.NETWORK ||
           error.code?.includes('NETWORK') ||
           error.code?.includes('CONNECTION') ||
           error.name === 'NetworkError';
  }

  private isTimeoutError(error: any): boolean {
    return error.category === ErrorCategory.TIMEOUT ||
           error.code?.includes('TIMEOUT') ||
           error.message?.includes('timeout');
  }

  private isResourceError(error: any): boolean {
    return error.category === ErrorCategory.RESOURCE ||
           error.code?.includes('RESOURCE') ||
           error.code?.includes('MEMORY') ||
           error.code?.includes('DISK');
  }

  private isSAKError(error: any): error is SAKError {
    return error && typeof error === 'object' && 
           'category' in error && 'severity' in error && 'retryable' in error;
  }

  private isAgentError(error: any): error is AgentError {
    return error && typeof error === 'object' && 
           'code' in error && 'message' in error && 'agentId' in error;
  }

  private getNetworkErrorSeverity(error: any): ErrorSeverity {
    if (error.code?.includes('DNS') || error.code?.includes('TIMEOUT')) {
      return ErrorSeverity.HIGH;
    }
    return ErrorSeverity.MEDIUM;
  }

  private shouldEscalateNetworkError(error: any): boolean {
    return error.code?.includes('DNS') || 
           error.code?.includes('SSL') ||
           error.attempts > 3;
  }

  private mapErrorCodeToCategory(code: string): ErrorCategory {
    if (code.includes('VALIDATION') || code.includes('PARAMETER')) return ErrorCategory.VALIDATION;
    if (code.includes('PERMISSION') || code.includes('UNAUTHORIZED')) return ErrorCategory.PERMISSION;
    if (code.includes('RATE_LIMIT')) return ErrorCategory.RATE_LIMIT;
    if (code.includes('NETWORK') || code.includes('CONNECTION')) return ErrorCategory.NETWORK;
    if (code.includes('TIMEOUT')) return ErrorCategory.TIMEOUT;
    if (code.includes('RESOURCE') || code.includes('MEMORY')) return ErrorCategory.RESOURCE;
    if (code.includes('CONFIG')) return ErrorCategory.CONFIGURATION;
    return ErrorCategory.UNKNOWN;
  }

  private mapErrorCodeToSeverity(code: string): ErrorSeverity {
    if (code.includes('CRITICAL') || code.includes('FATAL')) return ErrorSeverity.CRITICAL;
    if (code.includes('SECURITY') || code.includes('PERMISSION')) return ErrorSeverity.HIGH;
    if (code.includes('TIMEOUT') || code.includes('NETWORK')) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private isRetryableErrorCode(code: string): boolean {
    const nonRetryableCodes = ['VALIDATION', 'PERMISSION', 'UNAUTHORIZED', 'FORBIDDEN'];
    return !nonRetryableCodes.some(nonRetryable => code.includes(nonRetryable));
  }

  private createError(code: string, message: string, details?: any): SAKError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      agentId: 'error-handling-engine',
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false
    };
  }

  private createUnknownError(error: any, context?: ExecutionContext): SAKError {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error,
      timestamp: new Date(),
      agentId: 'error-handling-engine',
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      context
    };
  }

  private enrichError(error: SAKError, classification: ErrorClassification, context: ExecutionContext): SAKError {
    return {
      ...error,
      category: classification.category,
      severity: classification.severity,
      retryable: classification.retryable,
      context,
      details: {
        ...error.details,
        classification,
        enrichedAt: Date.now()
      }
    };
  }

  private enrichRetryError(error: SAKError, retryContext: RetryContext): SAKError {
    return {
      ...error,
      details: {
        ...error.details,
        retryContext,
        finalAttempt: true
      }
    };
  }

  private attemptRetry(
    error: SAKError,
    context: ExecutionContext,
    classification: ErrorClassification
  ): TaskEither<SAKError, ExecutionResult> {
    if (!classification.retryable) {
      return TE.left(error);
    }

    // This would integrate with the retry mechanism
    // For now, just return the error
    return TE.left(error);
  }

  private emitErrorEvent(error: SAKError, classification: ErrorClassification, context: ExecutionContext): void {
    this.emit('error:classified', {
      error,
      classification,
      context,
      timestamp: Date.now()
    });
  }

  private emitRetryEvent(error: SAKError, retryContext: RetryContext, delay: number): void {
    this.emit('error:retry', {
      error,
      retryContext,
      delay,
      timestamp: Date.now()
    });
  }

  private emitRecoveryEvent(
    strategyName: string, 
    error: SAKError, 
    context: ExecutionContext, 
    success: boolean, 
    duration: number
  ): void {
    this.emit('error:recovery', {
      strategyName,
      error,
      context,
      success,
      duration,
      timestamp: Date.now()
    });
  }

  private cleanupErrorHistory(): void {
    const cutoff = Date.now() - this.config.errorHistory.retentionMs;
    
    for (const [toolName, history] of this.errorHistory.entries()) {
      const filtered = history.filter(entry => entry.timestamp > cutoff);
      if (filtered.length === 0) {
        this.errorHistory.delete(toolName);
      } else {
        this.errorHistory.set(toolName, filtered);
      }
    }
  }

  private cleanupCircuitBreakers(): void {
    for (const [toolName, breaker] of this.circuitBreakers.entries()) {
      if (breaker.canReset()) {
        breaker.reset();
      }
    }
  }
}

// ============================================================================
// Supporting Classes and Interfaces
// ============================================================================

interface ErrorHandlingConfig {
  circuitBreaker: {
    failureThreshold: number;
    timeoutMs: number;
    monitoringPeriodMs: number;
  };
  errorHistory: {
    maxEntries: number;
    retentionMs: number;
    cleanupInterval?: number;
  };
  recovery: {
    enabled: boolean;
    maxAttempts: number;
    strategies: string[];
  };
  escalation: {
    enabled: boolean;
    thresholds: {
      errorRate: number;
      severity: ErrorSeverity;
    };
  };
}

interface ErrorHistoryEntry {
  timestamp: number;
  error: SAKError;
  context: {
    executionId: string;
    userId?: string;
    sessionId: string;
    metadata: any;
  };
  resolved: boolean;
  resolutionTime?: number;
}

interface ErrorStatistics {
  totalErrors: number;
  errorsByCategory: Map<ErrorCategory, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  retryableErrors: number;
  resolvedErrors: number;
  averageResolutionTime: number;
  errorRate: number;
  topErrors: Array<{ code: string; count: number }>;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private config: {
    failureThreshold: number;
    timeoutMs: number;
    monitoringPeriodMs: number;
  }) {}

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  isOpen(): boolean {
    if (this.state === 'open' && this.canReset()) {
      this.state = 'half-open';
      return false;
    }
    return this.state === 'open';
  }

  canReset(): boolean {
    return Date.now() - this.lastFailure > this.config.timeoutMs;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}

export {
  ErrorHandlingEngine,
  ErrorCategory,
  ErrorSeverity,
  ErrorClassification,
  RetryStrategy,
  RetryContext,
  RecoveryStrategy,
  RecoveryResult,
  ErrorMapping,
  ErrorHandlingConfig,
  ErrorStatistics,
  CircuitBreaker
};