/**
 * Comprehensive Error Handler for Sei Protocol Operations
 * Handles errors from both Silo and Citrex protocols with detailed mapping
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { SiloProtocolError, CitrexProtocolError } from '../types';
import logger from '../../../utils/logger';

// ===================== Error Categories =====================

export enum SeiProtocolErrorType {
  // Network & Connection Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  INVALID_NETWORK = 'INVALID_NETWORK',
  RPC_ERROR = 'RPC_ERROR',

  // Contract & Protocol Errors
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',
  INVALID_CONTRACT = 'INVALID_CONTRACT',
  PROTOCOL_PAUSED = 'PROTOCOL_PAUSED',

  // Wallet & Transaction Errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',

  // Silo Protocol Specific Errors
  SILO_INSUFFICIENT_STAKE = 'SILO_INSUFFICIENT_STAKE',
  SILO_POSITION_NOT_FOUND = 'SILO_POSITION_NOT_FOUND',
  SILO_EARLY_UNSTAKE_PENALTY = 'SILO_EARLY_UNSTAKE_PENALTY',
  SILO_STAKING_PERIOD_ACTIVE = 'SILO_STAKING_PERIOD_ACTIVE',
  SILO_SLASHING_RISK = 'SILO_SLASHING_RISK',
  SILO_REWARD_CLAIM_FAILED = 'SILO_REWARD_CLAIM_FAILED',

  // Citrex Protocol Specific Errors
  CITREX_INSUFFICIENT_COLLATERAL = 'CITREX_INSUFFICIENT_COLLATERAL',
  CITREX_POSITION_NOT_FOUND = 'CITREX_POSITION_NOT_FOUND',
  CITREX_LIQUIDATION_RISK = 'CITREX_LIQUIDATION_RISK',
  CITREX_MARKET_CLOSED = 'CITREX_MARKET_CLOSED',
  CITREX_LEVERAGE_TOO_HIGH = 'CITREX_LEVERAGE_TOO_HIGH',
  CITREX_POSITION_SIZE_EXCEEDED = 'CITREX_POSITION_SIZE_EXCEEDED',
  CITREX_MARGIN_CALL = 'CITREX_MARGIN_CALL',

  // Validation Errors
  INVALID_PARAMS = 'INVALID_PARAMS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_MARKET = 'INVALID_MARKET',

  // General Errors
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// ===================== Error Severity Levels =====================

export enum SeiProtocolErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// ===================== Enhanced Error Interface =====================

export interface SeiProtocolErrorDetails {
  type: SeiProtocolErrorType;
  severity: SeiProtocolErrorSeverity;
  message: string;
  code: string;
  protocol: 'silo' | 'citrex' | 'general';
  operation?: string;
  params?: any;
  suggestions?: string[];
  retryable: boolean;
  timestamp: string;
  userMessage: string;
}

// ===================== Error Handler Class =====================

export class SeiProtocolErrorHandler {
  private static readonly ERROR_MAPPINGS: Record<string, {
    type: SeiProtocolErrorType;
    severity: SeiProtocolErrorSeverity;
    retryable: boolean;
    suggestions: string[];
  }> = {
    // Network Errors
    'NETWORK_ERROR': {
      type: SeiProtocolErrorType.NETWORK_ERROR,
      severity: SeiProtocolErrorSeverity.HIGH,
      retryable: true,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Switch to a different RPC endpoint'
      ]
    },
    'CONNECTION_TIMEOUT': {
      type: SeiProtocolErrorType.CONNECTION_TIMEOUT,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: true,
      suggestions: [
        'Check network connectivity',
        'Increase timeout settings',
        'Retry the operation'
      ]
    },
    'INVALID_NETWORK': {
      type: SeiProtocolErrorType.INVALID_NETWORK,
      severity: SeiProtocolErrorSeverity.CRITICAL,
      retryable: false,
      suggestions: [
        'Switch to Sei Network',
        'Check your wallet network settings',
        'Verify chain ID is correct'
      ]
    },

    // Contract Errors
    'CONTRACT_NOT_FOUND': {
      type: SeiProtocolErrorType.CONTRACT_NOT_FOUND,
      severity: SeiProtocolErrorSeverity.CRITICAL,
      retryable: false,
      suggestions: [
        'Verify contract address',
        'Check if contract is deployed',
        'Update contract addresses'
      ]
    },
    'CONTRACT_CALL_FAILED': {
      type: SeiProtocolErrorType.CONTRACT_CALL_FAILED,
      severity: SeiProtocolErrorSeverity.HIGH,
      retryable: true,
      suggestions: [
        'Check contract parameters',
        'Verify wallet permissions',
        'Try again with different gas settings'
      ]
    },

    // Silo Protocol Errors
    'INSUFFICIENT_STAKE': {
      type: SeiProtocolErrorType.SILO_INSUFFICIENT_STAKE,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: [
        'Increase stake amount',
        'Check minimum staking requirements',
        'Add more tokens to wallet'
      ]
    },
    'POSITION_NOT_FOUND': {
      type: SeiProtocolErrorType.SILO_POSITION_NOT_FOUND,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: [
        'Verify position ID',
        'Check if position exists',
        'Refresh position data'
      ]
    },
    'EARLY_UNSTAKE_PENALTY': {
      type: SeiProtocolErrorType.SILO_EARLY_UNSTAKE_PENALTY,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: [
        'Wait for staking period to end',
        'Accept penalty and proceed',
        'Consider partial unstaking'
      ]
    },

    // Citrex Protocol Errors
    'INSUFFICIENT_COLLATERAL': {
      type: SeiProtocolErrorType.CITREX_INSUFFICIENT_COLLATERAL,
      severity: SeiProtocolErrorSeverity.HIGH,
      retryable: false,
      suggestions: [
        'Add more collateral',
        'Reduce position size',
        'Lower leverage'
      ]
    },
    'LIQUIDATION_RISK': {
      type: SeiProtocolErrorType.CITREX_LIQUIDATION_RISK,
      severity: SeiProtocolErrorSeverity.CRITICAL,
      retryable: false,
      suggestions: [
        'Add margin immediately',
        'Close position partially',
        'Reduce leverage'
      ]
    },
    'LEVERAGE_TOO_HIGH': {
      type: SeiProtocolErrorType.CITREX_LEVERAGE_TOO_HIGH,
      severity: SeiProtocolErrorSeverity.HIGH,
      retryable: false,
      suggestions: [
        'Reduce leverage to maximum allowed',
        'Check market leverage limits',
        'Add more collateral'
      ]
    }
  };

  /**
   * Handle and map protocol errors to standardized format
   */
  static handleProtocolError = (
    error: unknown,
    operation?: string,
    params?: any
  ): SeiProtocolErrorDetails => {
    const timestamp = new Date().toISOString();
    
    // Handle known protocol errors
    if (error instanceof SiloProtocolError) {
      return this.handleSiloError(error, operation, params, timestamp);
    }
    
    if (error instanceof CitrexProtocolError) {
      return this.handleCitrexError(error, operation, params, timestamp);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return this.handleGenericError(error, operation, params, timestamp);
    }

    // Handle unknown errors
    return this.handleUnknownError(error, operation, params, timestamp);
  };

  /**
   * Create a TaskEither that handles errors gracefully
   */
  static wrapOperation = <T>(
    operation: () => Promise<T>,
    operationName: string,
    params?: any
  ): TE.TaskEither<SeiProtocolErrorDetails, T> =>
    pipe(
      TE.tryCatch(
        operation,
        (error) => this.handleProtocolError(error, operationName, params)
      ),
      TE.mapLeft((errorDetails) => {
        // Log error for monitoring
        logger.error(`Sei Protocol Error: ${operationName}`, {
          ...errorDetails,
          params
        });
        
        return errorDetails;
      })
    );

  /**
   * Retry operation with exponential backoff
   */
  static retryOperation = <T>(
    operation: () => TE.TaskEither<SeiProtocolErrorDetails, T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): TE.TaskEither<SeiProtocolErrorDetails, T> => {
    const retry = (attempt: number): TE.TaskEither<SeiProtocolErrorDetails, T> =>
      pipe(
        operation(),
        TE.orElse((error) => {
          if (attempt >= maxRetries || !error.retryable) {
            return TE.left(error);
          }
          
          const delay = baseDelay * Math.pow(2, attempt);
          logger.info(`Retrying operation (attempt ${attempt + 1}/${maxRetries})`, {
            operation: error.operation,
            delay,
            error: error.message
          });
          
          return pipe(
            TE.fromIO(() => new Promise(resolve => setTimeout(resolve, delay))),
            TE.chain(() => retry(attempt + 1))
          );
        })
      );
    
    return retry(0);
  };

  /**
   * Get user-friendly error message
   */
  static getUserMessage = (errorDetails: SeiProtocolErrorDetails): string => {
    switch (errorDetails.type) {
      case SeiProtocolErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your internet connection and try again.';
      
      case SeiProtocolErrorType.INVALID_NETWORK:
        return 'Please switch to Sei Network in your wallet to continue.';
      
      case SeiProtocolErrorType.INSUFFICIENT_BALANCE:
        return 'Insufficient balance to complete this transaction. Please add more funds.';
      
      case SeiProtocolErrorType.SILO_EARLY_UNSTAKE_PENALTY:
        return 'Early unstaking will incur a penalty. Consider waiting for the staking period to end.';
      
      case SeiProtocolErrorType.CITREX_LIQUIDATION_RISK:
        return 'Your position is at risk of liquidation. Please add margin or reduce position size.';
      
      case SeiProtocolErrorType.CITREX_LEVERAGE_TOO_HIGH:
        return 'Leverage exceeds maximum allowed for this market. Please reduce leverage.';
      
      default:
        return errorDetails.userMessage || 'An unexpected error occurred. Please try again.';
    }
  };

  // ===================== Private Helper Methods =====================

  private static handleSiloError = (
    error: SiloProtocolError,
    operation?: string,
    params?: any,
    timestamp?: string
  ): SeiProtocolErrorDetails => {
    const mapping = this.ERROR_MAPPINGS[error.code] || {
      type: SeiProtocolErrorType.OPERATION_FAILED,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: ['Try again later']
    };

    return {
      type: mapping.type,
      severity: mapping.severity,
      message: error.message,
      code: error.code,
      protocol: 'silo',
      operation,
      params,
      suggestions: mapping.suggestions,
      retryable: mapping.retryable,
      timestamp: timestamp || new Date().toISOString(),
      userMessage: this.generateUserMessage(error.message, 'silo')
    };
  };

  private static handleCitrexError = (
    error: CitrexProtocolError,
    operation?: string,
    params?: any,
    timestamp?: string
  ): SeiProtocolErrorDetails => {
    const mapping = this.ERROR_MAPPINGS[error.code] || {
      type: SeiProtocolErrorType.OPERATION_FAILED,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: ['Try again later']
    };

    return {
      type: mapping.type,
      severity: mapping.severity,
      message: error.message,
      code: error.code,
      protocol: 'citrex',
      operation,
      params,
      suggestions: mapping.suggestions,
      retryable: mapping.retryable,
      timestamp: timestamp || new Date().toISOString(),
      userMessage: this.generateUserMessage(error.message, 'citrex')
    };
  };

  private static handleGenericError = (
    error: Error,
    operation?: string,
    params?: any,
    timestamp?: string
  ): SeiProtocolErrorDetails => {
    const errorType = this.classifyGenericError(error.message);
    const mapping = this.ERROR_MAPPINGS[errorType] || {
      type: SeiProtocolErrorType.UNKNOWN_ERROR,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: ['Try again later']
    };

    return {
      type: mapping.type,
      severity: mapping.severity,
      message: error.message,
      code: errorType,
      protocol: 'general',
      operation,
      params,
      suggestions: mapping.suggestions,
      retryable: mapping.retryable,
      timestamp: timestamp || new Date().toISOString(),
      userMessage: this.generateUserMessage(error.message, 'general')
    };
  };

  private static handleUnknownError = (
    error: unknown,
    operation?: string,
    params?: any,
    timestamp?: string
  ): SeiProtocolErrorDetails => {
    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    
    return {
      type: SeiProtocolErrorType.UNKNOWN_ERROR,
      severity: SeiProtocolErrorSeverity.MEDIUM,
      message,
      code: 'UNKNOWN_ERROR',
      protocol: 'general',
      operation,
      params,
      suggestions: ['Try again later', 'Contact support if problem persists'],
      retryable: false,
      timestamp: timestamp || new Date().toISOString(),
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  };

  private static classifyGenericError = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    if (lowerMessage.includes('timeout')) {
      return 'CONNECTION_TIMEOUT';
    }
    
    if (lowerMessage.includes('insufficient') && lowerMessage.includes('balance')) {
      return 'INSUFFICIENT_BALANCE';
    }
    
    if (lowerMessage.includes('transaction') && lowerMessage.includes('failed')) {
      return 'TRANSACTION_FAILED';
    }
    
    if (lowerMessage.includes('contract') && lowerMessage.includes('not found')) {
      return 'CONTRACT_NOT_FOUND';
    }
    
    return 'UNKNOWN_ERROR';
  };

  private static generateUserMessage = (message: string, protocol: string): string => {
    // Generate user-friendly messages based on protocol and error
    const protocolName = protocol === 'silo' ? 'Silo Staking' : 
                        protocol === 'citrex' ? 'Citrex Trading' : 
                        'Protocol';
    
    return `${protocolName} operation failed: ${message}`;
  };
}

// ===================== Utility Functions =====================

/**
 * Create a safe operation wrapper with error handling
 */
export const createSafeOperation = <T>(
  operation: () => Promise<T>,
  operationName: string,
  params?: any
): TE.TaskEither<SeiProtocolErrorDetails, T> =>
  SeiProtocolErrorHandler.wrapOperation(operation, operationName, params);

/**
 * Create a retryable operation with error handling
 */
export const createRetryableOperation = <T>(
  operation: () => Promise<T>,
  operationName: string,
  params?: any,
  maxRetries: number = 3
): TE.TaskEither<SeiProtocolErrorDetails, T> =>
  SeiProtocolErrorHandler.retryOperation(
    () => SeiProtocolErrorHandler.wrapOperation(operation, operationName, params),
    maxRetries
  );

/**
 * Handle error and return user-friendly message
 */
export const handleProtocolError = (error: unknown, operation?: string, params?: any): {
  error: SeiProtocolErrorDetails;
  userMessage: string;
} => {
  const errorDetails = SeiProtocolErrorHandler.handleProtocolError(error, operation, params);
  const userMessage = SeiProtocolErrorHandler.getUserMessage(errorDetails);
  
  return {
    error: errorDetails,
    userMessage
  };
};

// SeiProtocolErrorHandler is already exported above