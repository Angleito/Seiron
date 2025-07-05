import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import { createServiceLogger, type LogContext } from './LoggingService';

/**
 * ErrorHandlingService - Enhanced Error Handling and Recovery
 * 
 * This service provides comprehensive error handling patterns, circuit breaker
 * functionality, retry mechanisms, and error recovery strategies. It integrates
 * with the logging service and maintains fp-ts patterns throughout.
 */

// ============================================================================
// Error Types and Interfaces
// ============================================================================

export interface SeironError {
  type: ErrorType;
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
  service?: string;
  method?: string;
  adapter?: string;
  recoverable: boolean;
  retryCount?: number;
  originalError?: Error;
  context?: LogContext;
  dragonPowerLevel?: number;
}

export type ErrorType = 
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'network_error'
  | 'timeout_error'
  | 'rate_limit_error'
  | 'resource_not_found'
  | 'resource_conflict'
  | 'internal_server_error'
  | 'external_service_error'
  | 'blockchain_error'
  | 'adapter_error'
  | 'configuration_error'
  | 'data_integrity_error'
  | 'circuit_breaker_open'
  | 'unknown_error';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors: ErrorType[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutDuration: number;
  resetTimeout: number;
  monitoringPeriod: number;
  name: string;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  totalRequests: number;
  successfulRequests: number;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'circuit_breaker' | 'none';
  config?: RetryConfig | CircuitBreakerConfig;
  fallbackHandler?: () => Promise<any>;
}

// ============================================================================
// Error Handling Service Implementation
// ============================================================================

export class ErrorHandlingService extends EventEmitter {
  private logger = createServiceLogger('ErrorHandlingService');
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorHistory: SeironError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();

  constructor() {
    super();
    this.setupDefaultStrategies();
  }

  // ============================================================================
  // Error Creation and Classification
  // ============================================================================

  /**
   * Create a standardized Seiron error
   */
  public createError = (
    type: ErrorType,
    message: string,
    details?: Record<string, any>,
    originalError?: Error,
    context?: LogContext
  ): SeironError => {
    const error: SeironError = {
      type,
      message,
      code: this.generateErrorCode(type),
      details,
      timestamp: new Date(),
      service: context?.service,
      method: context?.method,
      adapter: context?.adapter,
      recoverable: this.isRecoverable(type),
      originalError,
      context,
      dragonPowerLevel: context?.dragonPowerLevel || 0
    };

    // Log the error
    this.logger.error(message, context || {}, originalError);

    // Store in history
    this.errorHistory.push(error);
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }

    // Emit error event
    this.emit('error', error);

    return error;
  };

  /**
   * Classify an unknown error
   */
  public classifyError = (error: Error | unknown): ErrorType => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || '';

      if (message.includes('timeout') || message.includes('timed out')) {
        return 'timeout_error';
      }
      if (message.includes('network') || message.includes('connection')) {
        return 'network_error';
      }
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return 'rate_limit_error';
      }
      if (message.includes('not found') || message.includes('404')) {
        return 'resource_not_found';
      }
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'authentication_error';
      }
      if (message.includes('forbidden') || message.includes('403')) {
        return 'authorization_error';
      }
      if (message.includes('validation') || message.includes('invalid')) {
        return 'validation_error';
      }
      if (message.includes('blockchain') || message.includes('transaction')) {
        return 'blockchain_error';
      }
      if (message.includes('adapter') || message.includes('integration')) {
        return 'adapter_error';
      }
    }

    return 'unknown_error';
  };

  // ============================================================================
  // Retry Mechanisms
  // ============================================================================

  /**
   * Execute operation with retry logic
   */
  public withRetry = <T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: LogContext = {}
  ): TE.TaskEither<SeironError, T> => {
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      jitter: true,
      retryableErrors: [
        'network_error',
        'timeout_error',
        'rate_limit_error',
        'external_service_error'
      ],
      ...config
    };

    return TE.tryCatch(
      async () => this.executeWithRetry(operation, retryConfig, context),
      (error) => this.createError(
        this.classifyError(error),
        'Operation failed after retries',
        { retryConfig },
        error as Error,
        context
      )
    );
  };

  private executeWithRetry = async <T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: LogContext,
    attempt: number = 0
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const errorType = this.classifyError(error);
      
      if (attempt >= config.maxRetries || !config.retryableErrors.includes(errorType)) {
        throw error;
      }

      const delay = this.calculateDelay(attempt, config);
      
      this.logger.warn(
        `Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`,
        {
          ...context,
          metadata: { attempt, delay, errorType }
        }
      );

      await this.sleep(delay);
      return this.executeWithRetry(operation, config, context, attempt + 1);
    }
  };

  private calculateDelay = (attempt: number, config: RetryConfig): number => {
    let delay = config.baseDelay;
    
    if (config.exponentialBackoff) {
      delay = Math.min(delay * Math.pow(2, attempt), config.maxDelay);
    }
    
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // TODO: REMOVE_MOCK - Random value generation
    }
    
    return Math.floor(delay);
  };

  private sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

  // ============================================================================
  // Circuit Breaker Pattern
  // ============================================================================

  /**
   * Execute operation with circuit breaker
   */
  public withCircuitBreaker = <T>(
    operation: () => Promise<T>,
    config: CircuitBreakerConfig,
    context: LogContext = {}
  ): TE.TaskEither<SeironError, T> => {
    const breakerState = this.getCircuitBreakerState(config.name);
    
    return pipe(
      this.checkCircuitBreaker(breakerState, config),
      TE.chain(() => 
        TE.tryCatch(
          async () => {
            try {
              const result = await operation();
              this.recordSuccess(config.name);
              return result;
            } catch (error) {
              this.recordFailure(config.name);
              throw error;
            }
          },
          (error) => this.createError(
            this.classifyError(error),
            'Circuit breaker operation failed',
            { circuitBreaker: config.name },
            error as Error,
            context
          )
        )
      )
    );
  };

  private getCircuitBreakerState = (name: string): CircuitBreakerState => {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        totalRequests: 0,
        successfulRequests: 0
      });
    }
    return this.circuitBreakers.get(name)!;
  };

  private checkCircuitBreaker = (
    state: CircuitBreakerState,
    config: CircuitBreakerConfig
  ): TE.TaskEither<SeironError, void> => {
    const now = new Date();
    
    if (state.state === 'open') {
      if (state.nextAttemptTime && now < state.nextAttemptTime) {
        return TE.left(this.createError(
          'circuit_breaker_open',
          `Circuit breaker ${config.name} is open`,
          { nextAttemptTime: state.nextAttemptTime }
        ));
      } else {
        state.state = 'half-open';
        this.logger.info(`Circuit breaker ${config.name} transitioning to half-open`);
      }
    }
    
    return TE.right(undefined);
  };

  private recordSuccess = (name: string): void => {
    const state = this.getCircuitBreakerState(name);
    state.successfulRequests++;
    state.totalRequests++;
    
    if (state.state === 'half-open') {
      state.state = 'closed';
      state.failureCount = 0;
      this.logger.info(`Circuit breaker ${name} closed after successful request`);
    }
  };

  private recordFailure = (name: string): void => {
    const state = this.getCircuitBreakerState(name);
    state.failureCount++;
    state.totalRequests++;
    state.lastFailureTime = new Date();
    
    if (state.failureCount >= 5) { // Default threshold
      state.state = 'open';
      state.nextAttemptTime = new Date(Date.now() + 60000); // 1 minute
      this.logger.warn(`Circuit breaker ${name} opened due to failures`);
    }
  };

  // ============================================================================
  // Error Recovery Strategies
  // ============================================================================

  /**
   * Register an error recovery strategy
   */
  public registerRecoveryStrategy = (
    key: string,
    strategy: ErrorRecoveryStrategy
  ): void => {
    this.recoveryStrategies.set(key, strategy);
    this.logger.info(`Registered recovery strategy for ${key}`, {
      metadata: { strategyType: strategy.type }
    });
  };

  /**
   * Execute operation with automatic recovery
   */
  public withRecovery = <T>(
    operation: () => Promise<T>,
    strategyKey: string,
    context: LogContext = {}
  ): TE.TaskEither<SeironError, T> => {
    const strategy = this.recoveryStrategies.get(strategyKey);
    
    if (!strategy) {
      return TE.left(this.createError(
        'configuration_error',
        `No recovery strategy found for ${strategyKey}`,
        { strategyKey }
      ));
    }

    switch (strategy.type) {
      case 'retry':
        return this.withRetry(operation, strategy.config as RetryConfig, context);
      
      case 'circuit_breaker':
        return this.withCircuitBreaker(operation, strategy.config as CircuitBreakerConfig, context);
      
      case 'fallback':
        return this.withFallback(operation, strategy.fallbackHandler!, context);
      
      default:
        return TE.tryCatch(
          operation,
          (error) => this.createError(
            this.classifyError(error),
            'Operation failed without recovery',
            { strategyKey },
            error as Error,
            context
          )
        );
    }
  };

  /**
   * Execute operation with fallback
   */
  public withFallback = <T>(
    operation: () => Promise<T>,
    fallbackHandler: () => Promise<T>,
    context: LogContext = {}
  ): TE.TaskEither<SeironError, T> => {
    return pipe(
      TE.tryCatch(
        operation,
        (error) => this.createError(
          this.classifyError(error),
          'Primary operation failed',
          {},
          error as Error,
          context
        )
      ),
      TE.orElse(() => {
        this.logger.warn('Executing fallback handler', context);
        return TE.tryCatch(
          fallbackHandler,
          (error) => this.createError(
            this.classifyError(error),
            'Fallback operation failed',
            {},
            error as Error,
            context
          )
        );
      })
    );
  };

  // ============================================================================
  // Error Analytics and Monitoring
  // ============================================================================

  /**
   * Get error statistics
   */
  public getErrorStatistics = (): {
    total: number;
    byType: Record<ErrorType, number>;
    byService: Record<string, number>;
    recentErrors: SeironError[];
    errorRate: number;
  } => {
    const total = this.errorHistory.length;
    const byType: Record<ErrorType, number> = {} as any;
    const byService: Record<string, number> = {};
    
    this.errorHistory.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      if (error.service) {
        byService[error.service] = (byService[error.service] || 0) + 1;
      }
    });

    const lastHour = new Date(Date.now() - 3600000);
    const recentErrors = this.errorHistory.filter(e => e.timestamp >= lastHour);
    const errorRate = recentErrors.length / 60; // Errors per minute

    return {
      total,
      byType,
      byService,
      recentErrors: recentErrors.slice(-10),
      errorRate
    };
  };

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus = (): Record<string, CircuitBreakerState> => {
    const status: Record<string, CircuitBreakerState> = {};
    for (const [name, state] of this.circuitBreakers.entries()) {
      status[name] = { ...state };
    }
    return status;
  };

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateErrorCode = (type: ErrorType): string => {
    const prefix = 'SEIRON';
    const typeMap: Record<ErrorType, string> = {
      validation_error: 'VAL',
      authentication_error: 'AUTH',
      authorization_error: 'AUTHZ',
      network_error: 'NET',
      timeout_error: 'TIMEOUT',
      rate_limit_error: 'RATE',
      resource_not_found: 'NOT_FOUND',
      resource_conflict: 'CONFLICT',
      internal_server_error: 'INTERNAL',
      external_service_error: 'EXTERNAL',
      blockchain_error: 'BLOCKCHAIN',
      adapter_error: 'ADAPTER',
      configuration_error: 'CONFIG',
      data_integrity_error: 'DATA',
      circuit_breaker_open: 'CIRCUIT',
      unknown_error: 'UNKNOWN'
    };

    const typeCode = typeMap[type] || 'UNKNOWN';
    const timestamp = Date.now().toString(36).toUpperCase();
    
    return `${prefix}_${typeCode}_${timestamp}`;
  };

  private isRecoverable = (type: ErrorType): boolean => {
    const recoverableTypes: ErrorType[] = [
      'network_error',
      'timeout_error',
      'rate_limit_error',
      'external_service_error',
      'circuit_breaker_open'
    ];
    
    return recoverableTypes.includes(type);
  };

  private setupDefaultStrategies = (): void => {
    // Default retry strategy for network operations
    this.registerRecoveryStrategy('network_operations', {
      type: 'retry',
      config: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        exponentialBackoff: true,
        jitter: true,
        retryableErrors: ['network_error', 'timeout_error']
      }
    });

    // Default circuit breaker for external services
    this.registerRecoveryStrategy('external_services', {
      type: 'circuit_breaker',
      config: {
        failureThreshold: 5,
        timeoutDuration: 30000,
        resetTimeout: 60000,
        monitoringPeriod: 300000,
        name: 'external_services'
      }
    });

    // Default retry strategy for blockchain operations
    this.registerRecoveryStrategy('blockchain_operations', {
      type: 'retry',
      config: {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 10000,
        exponentialBackoff: true,
        jitter: true,
        retryableErrors: ['blockchain_error', 'network_error', 'timeout_error'] // TODO: REMOVE_MOCK - Hard-coded array literals
      }
    });
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const errorHandler = new ErrorHandlingService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a service-specific error handler
 */
export const createServiceErrorHandler = (serviceName: string) => ({
  createError: (
    type: ErrorType,
    message: string,
    details?: Record<string, any>,
    originalError?: Error,
    context?: Omit<LogContext, 'service'>
  ) => errorHandler.createError(type, message, details, originalError, {
    ...context,
    service: serviceName
  }),

  withRetry: <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: Omit<LogContext, 'service'>
  ) => errorHandler.withRetry(operation, config, { ...context, service: serviceName }),

  withCircuitBreaker: <T>(
    operation: () => Promise<T>,
    config: CircuitBreakerConfig,
    context?: Omit<LogContext, 'service'>
  ) => errorHandler.withCircuitBreaker(operation, config, { ...context, service: serviceName }),

  withRecovery: <T>(
    operation: () => Promise<T>,
    strategyKey: string,
    context?: Omit<LogContext, 'service'>
  ) => errorHandler.withRecovery(operation, strategyKey, { ...context, service: serviceName })
});

/**
 * Decorator for automatic error handling
 */
export const withErrorRecovery = (
  strategyKey: string,
  serviceName?: string
) => {
  return function <T extends any[], R>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: T): Promise<R> {
      const context: LogContext = {
        service: serviceName || target.constructor.name,
        method: propertyKey
      };

      return errorHandler.withRecovery(
        () => originalMethod.apply(this, args),
        strategyKey,
        context
      )();
    };

    return descriptor;
  };
};