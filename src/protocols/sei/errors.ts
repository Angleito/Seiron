import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';

import { SymphonyError, SymphonyResult } from './types';
import { SYMPHONY_ERROR_MESSAGES } from './constants';

/**
 * Symphony Protocol Error Handling Module
 * 
 * Provides comprehensive error handling, recovery strategies,
 * and error transformation utilities for Symphony protocol operations.
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  readonly operation: string;
  readonly timestamp: number;
  readonly userAddress?: string;
  readonly tokenIn?: string;
  readonly tokenOut?: string;
  readonly amountIn?: string;
  readonly metadata?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  readonly canRecover: boolean;
  readonly recoveryAction: 'retry' | 'fallback' | 'manual' | 'abort';
  readonly suggestedDelay?: number;
  readonly maxRetries?: number;
  readonly fallbackOptions?: string[];
}

export interface EnhancedSymphonyError extends SymphonyError {
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly recoveryStrategy: ErrorRecoveryStrategy;
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly helpUrl?: string;
  readonly errorCode: string;
}

/**
 * Symphony Error Handler Class
 * 
 * Centralized error handling for Symphony protocol operations
 */
export class SymphonyErrorHandler {
  private errorHistory: Map<string, EnhancedSymphonyError[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Enhance a Symphony error with additional context and recovery information
   */
  public enhanceError = (
    error: SymphonyError,
    context: ErrorContext
  ): EnhancedSymphonyError => {
    const severity = this.determineSeverity(error);
    const recoveryStrategy = this.determineRecoveryStrategy(error, context);
    const userMessage = this.generateUserMessage(error);
    const technicalMessage = this.generateTechnicalMessage(error);
    const errorCode = this.generateErrorCode(error);
    const helpUrl = this.generateHelpUrl(error);

    const enhancedError: EnhancedSymphonyError = {
      ...error,
      severity,
      context,
      recoveryStrategy,
      userMessage,
      technicalMessage,
      helpUrl,
      errorCode,
    };

    this.logError(enhancedError);
    return enhancedError;
  };

  /**
   * Attempt to recover from an error
   */
  public attemptRecovery = <T>(
    error: EnhancedSymphonyError,
    operation: () => TE.TaskEither<SymphonyError, T>
  ): TE.TaskEither<SymphonyError, T> => {
    const { recoveryStrategy, context } = error;
    const operationKey = `${context.operation}_${context.userAddress || 'unknown'}`;

    switch (recoveryStrategy.recoveryAction) {
      case 'retry':
        return this.retryOperation(operationKey, operation, recoveryStrategy);
      case 'fallback':
        return this.fallbackOperation(error, operation);
      case 'manual':
        return TE.left(error);
      case 'abort':
        return TE.left(error);
      default:
        return TE.left(error);
    }
  };

  /**
   * Check if an error is recoverable
   */
  public isRecoverable = (error: SymphonyError): boolean => {
    switch (error.type) {
      case 'network_error':
      case 'timeout':
      case 'rate_limit_exceeded':
      case 'quote_expired':
      case 'protocol_unavailable':
        return true;
      case 'invalid_token':
      case 'validation_failed':
      case 'execution_failed':
        return false;
      case 'insufficient_liquidity':
      case 'slippage_exceeded':
      case 'route_not_found':
      case 'gas_estimation_failed':
        return true;
      default:
        return false;
    }
  };

  /**
   * Get error statistics for monitoring
   */
  public getErrorStats = (): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoverySuccessRate: number;
  } => {
    const allErrors = Array.from(this.errorHistory.values()).flat();
    const totalErrors = allErrors.length;

    const errorsByType = allErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = allErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recoverableErrors = allErrors.filter(error => this.isRecoverable(error));
    const recoverySuccessRate = recoverableErrors.length > 0 
      ? (recoverableErrors.filter(error => error.recoveryStrategy.canRecover).length / recoverableErrors.length) * 100
      : 0;

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recoverySuccessRate,
    };
  };

  /**
   * Clear error history (for testing or maintenance)
   */
  public clearErrorHistory = (): void => {
    this.errorHistory.clear();
    this.retryAttempts.clear();
  };

  // Private helper methods

  private determineSeverity = (error: SymphonyError): ErrorSeverity => {
    switch (error.type) {
      case 'network_error':
      case 'timeout':
        return 'medium';
      case 'invalid_token':
      case 'validation_failed':
        return 'high';
      case 'insufficient_liquidity':
      case 'slippage_exceeded':
        return 'medium';
      case 'route_not_found':
      case 'quote_expired':
        return 'low';
      case 'gas_estimation_failed':
        return 'medium';
      case 'execution_failed':
        return 'high';
      case 'rate_limit_exceeded':
        return 'low';
      case 'protocol_unavailable':
        return 'critical';
      default:
        return 'medium';
    }
  };

  private determineRecoveryStrategy = (
    error: SymphonyError,
    context: ErrorContext
  ): ErrorRecoveryStrategy => {
    const canRecover = this.isRecoverable(error);

    if (!canRecover) {
      return {
        canRecover: false,
        recoveryAction: 'abort',
      };
    }

    switch (error.type) {
      case 'network_error':
      case 'timeout':
        return {
          canRecover: true,
          recoveryAction: 'retry',
          suggestedDelay: 2000,
          maxRetries: 3,
        };
      case 'rate_limit_exceeded':
        return {
          canRecover: true,
          recoveryAction: 'retry',
          suggestedDelay: error.resetTime - Date.now(),
          maxRetries: 1,
        };
      case 'quote_expired':
        return {
          canRecover: true,
          recoveryAction: 'retry',
          suggestedDelay: 1000,
          maxRetries: 2,
        };
      case 'insufficient_liquidity':
        return {
          canRecover: true,
          recoveryAction: 'fallback',
          fallbackOptions: ['reduce_amount', 'increase_slippage', 'alternative_route'],
        };
      case 'slippage_exceeded':
        return {
          canRecover: true,
          recoveryAction: 'fallback',
          fallbackOptions: ['increase_slippage', 'alternative_route'],
        };
      case 'route_not_found':
        return {
          canRecover: true,
          recoveryAction: 'fallback',
          fallbackOptions: ['alternative_tokens', 'multi_hop_route'],
        };
      case 'gas_estimation_failed':
        return {
          canRecover: true,
          recoveryAction: 'retry',
          suggestedDelay: 1000,
          maxRetries: 2,
        };
      case 'protocol_unavailable':
        return {
          canRecover: true,
          recoveryAction: 'fallback',
          fallbackOptions: ['alternative_protocol'],
        };
      default:
        return {
          canRecover: false,
          recoveryAction: 'manual',
        };
    }
  };

  private generateUserMessage = (error: SymphonyError): string => {
    switch (error.type) {
      case 'network_error':
        return 'Network connection issue. Please check your internet connection and try again.';
      case 'invalid_token':
        return `Invalid token address: ${error.token}. Please verify the token address.`;
      case 'insufficient_liquidity':
        return `Insufficient liquidity for ${error.pair}. Try reducing the amount or increasing slippage tolerance.`;
      case 'slippage_exceeded':
        return 'Transaction would exceed slippage tolerance. Try increasing slippage or reducing amount.';
      case 'route_not_found':
        return `No swap route found for ${error.tokenIn} to ${error.tokenOut}. Try a different token pair.`;
      case 'quote_expired':
        return 'Price quote has expired. Fetching new quote...';
      case 'gas_estimation_failed':
        return 'Unable to estimate gas cost. Please try again.';
      case 'validation_failed':
        return `Validation failed: ${error.errors.join(', ')}`;
      case 'execution_failed':
        return 'Transaction execution failed. Please try again.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      case 'rate_limit_exceeded':
        return 'Too many requests. Please wait a moment and try again.';
      case 'protocol_unavailable':
        return `${error.protocol} protocol is temporarily unavailable. Trying alternative routes.`;
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  private generateTechnicalMessage = (error: SymphonyError): string => {
    switch (error.type) {
      case 'network_error':
        return `Network error: ${error.message}${error.code ? ` (HTTP ${error.code})` : ''}`;
      case 'invalid_token':
        return `Invalid token ${error.token}: ${error.reason}`;
      case 'insufficient_liquidity':
        return `Insufficient liquidity for ${error.pair}. Requested: ${error.requested}, Available: ${error.available}`;
      case 'slippage_exceeded':
        return `Slippage exceeded. Expected: ${error.expected}, Actual: ${error.actual}, Limit: ${error.limit}`;
      case 'route_not_found':
        return `No route found for ${error.tokenIn} → ${error.tokenOut} (${error.amount})`;
      case 'quote_expired':
        return `Quote ${error.quoteId} expired at ${new Date(error.expiredAt).toISOString()}`;
      case 'gas_estimation_failed':
        return `Gas estimation failed: ${error.reason}`;
      case 'validation_failed':
        return `Validation failed: ${error.errors.join(', ')}`;
      case 'execution_failed':
        return `Execution failed: ${error.reason}${error.txHash ? ` (TX: ${error.txHash})` : ''}`;
      case 'timeout':
        return `Operation ${error.operation} timed out after ${error.duration}ms`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded. Reset time: ${new Date(error.resetTime).toISOString()}`;
      case 'protocol_unavailable':
        return `Protocol ${error.protocol} unavailable: ${error.reason}`;
      default:
        return 'Unknown Symphony error';
    }
  };

  private generateErrorCode = (error: SymphonyError): string => {
    const typeCode = error.type.toUpperCase().replace('_', '');
    const timestamp = Date.now().toString().slice(-6);
    return `SYM_${typeCode}_${timestamp}`;
  };

  private generateHelpUrl = (error: SymphonyError): string => {
    const baseUrl = 'https://docs.symphony.sei.io/troubleshooting';
    const errorType = error.type.replace('_', '-');
    return `${baseUrl}/${errorType}`;
  };

  private logError = (error: EnhancedSymphonyError): void => {
    const userKey = error.context.userAddress || 'unknown';
    const userErrors = this.errorHistory.get(userKey) || [];
    userErrors.push(error);
    this.errorHistory.set(userKey, userErrors);

    // Log to console for debugging
    console.error('Symphony Error:', {
      code: error.errorCode,
      type: error.type,
      severity: error.severity,
      context: error.context,
      message: error.technicalMessage,
    });
  };

  private retryOperation = <T>(
    operationKey: string,
    operation: () => TE.TaskEither<SymphonyError, T>,
    strategy: ErrorRecoveryStrategy
  ): TE.TaskEither<SymphonyError, T> => {
    const currentAttempts = this.retryAttempts.get(operationKey) || 0;
    const maxRetries = strategy.maxRetries || 3;

    if (currentAttempts >= maxRetries) {
      return TE.left({
        type: 'execution_failed',
        reason: `Max retries (${maxRetries}) exceeded for operation ${operationKey}`,
      });
    }

    this.retryAttempts.set(operationKey, currentAttempts + 1);

    const delay = strategy.suggestedDelay || 1000;
    
    return pipe(
      TE.fromTask(() => new Promise(resolve => setTimeout(resolve, delay))),
      TE.chain(() => operation()),
      TE.orElse(error => {
        if (this.isRecoverable(error) && currentAttempts < maxRetries - 1) {
          return this.retryOperation(operationKey, operation, strategy);
        }
        return TE.left(error);
      })
    );
  };

  private fallbackOperation = <T>(
    error: EnhancedSymphonyError,
    operation: () => TE.TaskEither<SymphonyError, T>
  ): TE.TaskEither<SymphonyError, T> => {
    // This would implement fallback strategies based on the error type
    // For now, we'll just return the original error
    return TE.left(error);
  };
}

/**
 * Global Symphony error handler instance
 */
export const symphonyErrorHandler = new SymphonyErrorHandler();

/**
 * Error handling utility functions
 */

/**
 * Wrap a Symphony operation with error handling
 */
export const withErrorHandling = <T>(
  operation: () => TE.TaskEither<SymphonyError, T>,
  context: ErrorContext
): TE.TaskEither<EnhancedSymphonyError, T> =>
  pipe(
    operation(),
    TE.mapLeft(error => symphonyErrorHandler.enhanceError(error, context))
  );

/**
 * Wrap a Symphony operation with error handling and automatic recovery
 */
export const withErrorRecovery = <T>(
  operation: () => TE.TaskEither<SymphonyError, T>,
  context: ErrorContext
): TE.TaskEither<EnhancedSymphonyError, T> =>
  pipe(
    operation(),
    TE.orElse(error => {
      const enhancedError = symphonyErrorHandler.enhanceError(error, context);
      return pipe(
        symphonyErrorHandler.attemptRecovery(enhancedError, operation),
        TE.mapLeft(recoveryError => symphonyErrorHandler.enhanceError(recoveryError, context))
      );
    })
  );

/**
 * Create an error context for Symphony operations
 */
export const createErrorContext = (
  operation: string,
  userAddress?: string,
  metadata?: Record<string, any>
): ErrorContext => ({
  operation,
  timestamp: Date.now(),
  userAddress,
  metadata,
});

/**
 * Check if an error is a Symphony error
 */
export const isSymphonyError = (error: any): error is SymphonyError => {
  return error && typeof error === 'object' && 'type' in error && typeof error.type === 'string';
};

/**
 * Check if an error is an enhanced Symphony error
 */
export const isEnhancedSymphonyError = (error: any): error is EnhancedSymphonyError => {
  return isSymphonyError(error) && 'severity' in error && 'context' in error;
};

/**
 * Format error for user display
 */
export const formatErrorForUser = (error: SymphonyError | EnhancedSymphonyError): string => {
  if (isEnhancedSymphonyError(error)) {
    return error.userMessage;
  }
  return symphonyErrorHandler.enhanceError(error, createErrorContext('unknown')).userMessage;
};

/**
 * Format error for logging
 */
export const formatErrorForLogging = (error: SymphonyError | EnhancedSymphonyError): string => {
  if (isEnhancedSymphonyError(error)) {
    return `[${error.errorCode}] ${error.technicalMessage}`;
  }
  return symphonyErrorHandler.enhanceError(error, createErrorContext('unknown')).technicalMessage;
};