/**
 * Error Handler for LangChain Tool Integration
 * 
 * This module provides comprehensive error handling for LangChain tools,
 * including user-friendly error messages, recovery suggestions, and
 * error analytics for continuous improvement.
 */

import { EventEmitter } from 'events';
import { DeFiToolError } from '../tools/BaseTool';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'validation'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'rate_limit'
  | 'insufficient_funds'
  | 'slippage'
  | 'liquidation_risk'
  | 'protocol_error'
  | 'parsing_error'
  | 'timeout'
  | 'unknown';

/**
 * Enhanced error information
 */
export interface EnhancedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  details: Record<string, any>;
  timestamp: Date;
  toolId?: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  suggestions: string[];
  retryable: boolean;
  retryCount?: number;
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  id: string;
  description: string;
  automated: boolean;
  execute: (error: EnhancedError) => Promise<boolean>;
}

/**
 * Error analytics data
 */
export interface ErrorAnalytics {
  errorId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  toolId?: string;
  userId?: string;
  resolved: boolean;
  resolutionTime?: number;
  recoveryStrategy?: string;
  userFeedback?: 'helpful' | 'not_helpful';
}

/**
 * Error Handler configuration
 */
export interface ErrorHandlerConfig {
  enableAnalytics?: boolean;
  enableAutoRecovery?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  logErrors?: boolean;
  userFriendlyMessages?: boolean;
}

/**
 * Error Handler Events
 */
export interface ErrorHandlerEvents {
  'error:handled': { error: EnhancedError };
  'error:retry': { error: EnhancedError; attempt: number };
  'error:recovery:success': { error: EnhancedError; strategy: string };
  'error:recovery:failed': { error: EnhancedError; strategy: string };
  'analytics:recorded': { analytics: ErrorAnalytics };
}

/**
 * Main Error Handler class
 */
export class ErrorHandler extends EventEmitter {
  private config: ErrorHandlerConfig;
  private errorHistory: Map<string, EnhancedError> = new Map();
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy[]> = new Map();
  private errorAnalytics: ErrorAnalytics[] = [];
  private errorCounter: number = 0;

  constructor(config: ErrorHandlerConfig = {}) {
    super();
    this.config = {
      enableAnalytics: true,
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      logErrors: true,
      userFriendlyMessages: true,
      ...config
    };

    this.initializeRecoveryStrategies();
  }

  /**
   * Handle an error with comprehensive processing
   */
  public async handleError(
    error: Error | DeFiToolError,
    context?: {
      toolId?: string;
      userId?: string;
      sessionId?: string;
      input?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<EnhancedError> {
    const enhancedError = this.enhanceError(error, context);
    
    // Log error if enabled
    if (this.config.logErrors) {
      this.logError(enhancedError);
    }

    // Store in history
    this.errorHistory.set(enhancedError.id, enhancedError);

    // Record analytics
    if (this.config.enableAnalytics) {
      this.recordErrorAnalytics(enhancedError);
    }

    // Attempt auto-recovery if enabled
    if (this.config.enableAutoRecovery && enhancedError.retryable) {
      await this.attemptAutoRecovery(enhancedError);
    }

    this.emit('error:handled', { error: enhancedError });
    return enhancedError;
  }

  /**
   * Enhance basic error with additional context and user-friendly information
   */
  private enhanceError(
    error: Error | DeFiToolError,
    context?: {
      toolId?: string;
      userId?: string;
      sessionId?: string;
      input?: string;
      additionalContext?: Record<string, any>;
    }
  ): EnhancedError {
    const errorId = `err_${Date.now()}_${++this.errorCounter}`;
    
    // Determine error category and severity
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(category, error);
    
    // Generate user-friendly message
    const userMessage = this.generateUserFriendlyMessage(error, category);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(error, category, context);
    
    // Determine if retryable
    const retryable = this.isRetryableError(category, error);

    return {
      id: errorId,
      category,
      severity,
      message: error.message,
      userMessage,
      details: this.extractErrorDetails(error),
      timestamp: new Date(),
      toolId: context?.toolId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      context: context?.additionalContext,
      suggestions,
      retryable
    };
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(error: Error | DeFiToolError): ErrorCategory {
    const message = error.message.toLowerCase();
    
    // Check for DeFi-specific error types
    if (typeof error === 'object' && 'type' in error) {
      switch (error.type) {
        case 'VALIDATION_ERROR': return 'validation';
        case 'RATE_LIMIT_ERROR': return 'rate_limit';
        case 'PERMISSION_ERROR': return 'authorization';
        case 'NETWORK_ERROR': return 'network';
        case 'INSUFFICIENT_BALANCE': return 'insufficient_funds';
        case 'SLIPPAGE_ERROR': return 'slippage';
        case 'LIQUIDATION_RISK': return 'liquidation_risk';
      }
    }

    // Pattern matching for common errors
    if (message.includes('network') || message.includes('connection')) return 'network';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('unauthorized') || message.includes('forbidden')) return 'authorization';
    if (message.includes('rate limit') || message.includes('too many requests')) return 'rate_limit';
    if (message.includes('insufficient') || message.includes('balance')) return 'insufficient_funds';
    if (message.includes('slippage')) return 'slippage';
    if (message.includes('liquidation')) return 'liquidation_risk';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('parse') || message.includes('syntax')) return 'parsing_error';
    if (message.includes('protocol') || message.includes('contract')) return 'protocol_error';

    return 'unknown';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(category: ErrorCategory, error: Error | DeFiToolError): ErrorSeverity {
    switch (category) {
      case 'liquidation_risk':
        return 'critical';
      case 'insufficient_funds':
      case 'protocol_error':
        return 'high';
      case 'slippage':
      case 'network':
      case 'timeout':
        return 'medium';
      case 'validation':
      case 'parsing_error':
      case 'rate_limit':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserFriendlyMessage(error: Error | DeFiToolError, category: ErrorCategory): string {
    switch (category) {
      case 'validation':
        return '⚠️ Please check your input parameters. Some required information may be missing or invalid.';
      
      case 'network':
        return '🌐 Network connection issue. Please check your internet connection and try again.';
      
      case 'rate_limit':
        return '⏰ You\'re making requests too quickly. Please wait a moment before trying again.';
      
      case 'insufficient_funds':
        return '💰 Insufficient balance for this operation. Please check your wallet balance.';
      
      case 'slippage':
        return '📈 Price moved unfavorably during the transaction. Consider increasing slippage tolerance.';
      
      case 'liquidation_risk':
        return '🚨 CRITICAL: Your position is at risk of liquidation! Consider adding collateral or repaying debt immediately.';
      
      case 'authorization':
        return '🔒 Access denied. Please check your permissions or wallet connection.';
      
      case 'protocol_error':
        return '🔧 Protocol error occurred. This might be a temporary issue with the DeFi protocol.';
      
      case 'timeout':
        return '⏱️ Operation timed out. The network might be congested. Please try again.';
      
      case 'parsing_error':
        return '📝 Could not understand your request. Please rephrase your command or check the format.';
      
      default:
        return '❓ An unexpected error occurred. Please try again or contact support if the issue persists.';
    }
  }

  /**
   * Generate helpful suggestions based on error type
   */
  private generateSuggestions(
    error: Error | DeFiToolError, 
    category: ErrorCategory,
    context?: any
  ): string[] {
    const suggestions: string[] = [];

    switch (category) {
      case 'validation':
        suggestions.push('Double-check all input parameters');
        suggestions.push('Ensure wallet address is valid');
        suggestions.push('Verify asset symbols are correct');
        break;

      case 'network':
        suggestions.push('Check your internet connection');
        suggestions.push('Try again in a few moments');
        suggestions.push('Consider switching to a different RPC endpoint');
        break;

      case 'rate_limit':
        suggestions.push('Wait 30-60 seconds before retrying');
        suggestions.push('Reduce the frequency of your requests');
        break;

      case 'insufficient_funds':
        suggestions.push('Check your wallet balance');
        suggestions.push('Ensure you have enough gas fees');
        suggestions.push('Consider reducing the transaction amount');
        break;

      case 'slippage':
        suggestions.push('Increase slippage tolerance (e.g., 2-5%)');
        suggestions.push('Try smaller transaction amounts');
        suggestions.push('Wait for less volatile market conditions');
        break;

      case 'liquidation_risk':
        suggestions.push('Add more collateral immediately');
        suggestions.push('Repay part of your debt');
        suggestions.push('Monitor your health factor closely');
        suggestions.push('Consider closing risky positions');
        break;

      case 'timeout':
        suggestions.push('Increase gas price for faster confirmation');
        suggestions.push('Try during less congested network times');
        suggestions.push('Break large operations into smaller parts');
        break;

      case 'protocol_error':
        suggestions.push('Check protocol status and announcements');
        suggestions.push('Try using a different protocol');
        suggestions.push('Wait and retry as this may be temporary');
        break;
    }

    return suggestions;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(category: ErrorCategory, error: Error | DeFiToolError): boolean {
    const retryableCategories: ErrorCategory[] = [
      'network',
      'timeout',
      'rate_limit',
      'slippage'
    ];

    return retryableCategories.includes(category);
  }

  /**
   * Extract detailed error information
   */
  private extractErrorDetails(error: Error | DeFiToolError): Record<string, any> {
    const details: Record<string, any> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if (typeof error === 'object' && 'details' in error) {
      details.deFiDetails = error.details;
    }

    return details;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRecovery(error: EnhancedError): Promise<void> {
    const strategies = this.recoveryStrategies.get(error.category) || [];
    
    for (const strategy of strategies) {
      if (!strategy.automated) continue;
      
      try {
        this.emit('error:retry', { error, attempt: (error.retryCount || 0) + 1 });
        
        const success = await strategy.execute(error);
        
        if (success) {
          this.emit('error:recovery:success', { error, strategy: strategy.id });
          return;
        }
        
      } catch (recoveryError) {
        this.emit('error:recovery:failed', { error, strategy: strategy.id });
      }
    }
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set('network', [
      {
        id: 'network_retry',
        description: 'Retry network request with exponential backoff',
        automated: true,
        execute: async (error) => {
          const delay = (error.retryCount || 0) * (this.config.retryDelay || 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return true; // Indicates retry should be attempted
        }
      }
    ]);

    // Rate limit recovery
    this.recoveryStrategies.set('rate_limit', [
      {
        id: 'rate_limit_wait',
        description: 'Wait for rate limit window to reset',
        automated: true,
        execute: async (error) => {
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          return true;
        }
      }
    ]);

    // Slippage recovery
    this.recoveryStrategies.set('slippage', [
      {
        id: 'increase_slippage',
        description: 'Automatically increase slippage tolerance',
        automated: true,
        execute: async (error) => {
          // This would increase slippage in the next retry
          return true;
        }
      }
    ]);
  }

  /**
   * Log error for debugging and monitoring
   */
  private logError(error: EnhancedError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${logLevel.toUpperCase()}] ${error.category}: ${error.message}`;
    
    console.log(`${new Date().toISOString()} - ${logMessage}`);
    
    if (error.severity === 'critical') {
      console.error('CRITICAL ERROR DETAILS:', {
        id: error.id,
        toolId: error.toolId,
        userId: error.userId,
        details: error.details,
        suggestions: error.suggestions
      });
    }
  }

  /**
   * Get log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  /**
   * Record error analytics
   */
  private recordErrorAnalytics(error: EnhancedError): void {
    const analytics: ErrorAnalytics = {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      toolId: error.toolId,
      userId: error.userId,
      resolved: false
    };

    this.errorAnalytics.push(analytics);
    this.emit('analytics:recorded', { analytics });
  }

  /**
   * Get error by ID
   */
  public getError(errorId: string): EnhancedError | null {
    return this.errorHistory.get(errorId) || null;
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): EnhancedError[] {
    return Array.from(this.errorHistory.values())
      .filter(error => error.category === category);
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 10): EnhancedError[] {
    return Array.from(this.errorHistory.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error analytics
   */
  public getErrorAnalytics(): ErrorAnalytics[] {
    return [...this.errorAnalytics];
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory.clear();
    this.errorAnalytics = [];
  }

  /**
   * Generate error report
   */
  public generateErrorReport(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    mostCommonErrors: { category: ErrorCategory; count: number }[];
  } {
    const errors = Array.from(this.errorHistory.values());
    
    const errorsByCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const mostCommonErrors = Object.entries(errorsByCategory)
      .map(([category, count]) => ({ category: category as ErrorCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      mostCommonErrors
    };
  }
}

/**
 * Helper function to create error handler
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}): ErrorHandler {
  return new ErrorHandler(config);
}

/**
 * Helper function to handle error with default handler
 */
export async function handleError(
  error: Error | DeFiToolError,
  context?: {
    toolId?: string;
    userId?: string;
    sessionId?: string;
    input?: string;
    additionalContext?: Record<string, any>;
  }
): Promise<EnhancedError> {
  return defaultErrorHandler.handleError(error, context);
}

/**
 * Export default error handler instance
 */
export const defaultErrorHandler = createErrorHandler({
  enableAnalytics: true,
  enableAutoRecovery: true,
  userFriendlyMessages: true
});