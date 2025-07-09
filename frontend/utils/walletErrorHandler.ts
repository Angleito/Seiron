/**
 * Wallet Error Handler
 * 
 * Centralized error handling for wallet-related issues
 * including connection failures, compatibility problems, and initialization errors
 */

import { logger } from '@lib/logger'
import { 
  getCompatibilityErrorMessage, 
  type WalletType 
} from './walletCompatibility'

// ============================================================================
// Error Types
// ============================================================================

export interface WalletError {
  type: 'connection' | 'compatibility' | 'initialization' | 'network' | 'unknown'
  code?: string
  message: string
  originalError?: Error
  walletType?: WalletType
  chainId?: number
  timestamp: Date
  userMessage: string
  recoveryAction?: string
}

export interface WalletErrorHandlerOptions {
  suppressConsoleErrors?: boolean
  showUserNotifications?: boolean
  enableRetry?: boolean
  maxRetries?: number
}

// ============================================================================
// Error Classifications
// ============================================================================

const ERROR_PATTERNS = {
  connection: [
    'User rejected the request',
    'User denied account authorization',
    'Connection request rejected',
    'Modal closed by user',
    'Wallet connection failed',
    'No accounts found',
    'Wallet not connected'
  ],
  compatibility: [
    'not supported',
    'Chain not supported',
    'Unsupported network',
    'The configured chains are not supported',
    'Chain ID mismatch',
    'Invalid chain'
  ],
  initialization: [
    'WalletConnect Core is already initialized',
    'Failed to initialize',
    'Provider not found',
    'Wallet not installed',
    'No injected provider',
    'Provider initialization failed'
  ],
  network: [
    'Network error',
    'RPC error',
    'Request failed',
    'Timeout',
    'Connection lost',
    'Network request failed'
  ]
}

// ============================================================================
// Error Handler Class
// ============================================================================

class WalletErrorHandler {
  private options: WalletErrorHandlerOptions
  private retryCount = new Map<string, number>()

  constructor(options: WalletErrorHandlerOptions = {}) {
    this.options = {
      suppressConsoleErrors: false,
      showUserNotifications: true,
      enableRetry: true,
      maxRetries: 3,
      ...options
    }
  }

  /**
   * Handle wallet-related errors with proper classification and user messaging
   */
  handleError(
    error: Error | string,
    context: {
      walletType?: WalletType
      chainId?: number
      operation?: string
      component?: string
    } = {}
  ): WalletError {
    const errorMessage = typeof error === 'string' ? error : error.message
    const originalError = typeof error === 'string' ? undefined : error

    // Classify error type
    const errorType = this.classifyError(errorMessage)
    
    // Generate user-friendly message
    const userMessage = this.generateUserMessage(errorType, errorMessage, context)
    
    // Generate recovery action
    const recoveryAction = this.generateRecoveryAction(errorType, context)

    const walletError: WalletError = {
      type: errorType,
      message: errorMessage,
      originalError,
      walletType: context.walletType,
      chainId: context.chainId,
      timestamp: new Date(),
      userMessage,
      recoveryAction
    }

    // Log error appropriately
    this.logError(walletError, context)

    // Handle retry logic if enabled
    if (this.options.enableRetry && this.shouldRetry(walletError)) {
      this.handleRetry(walletError, context)
    }

    return walletError
  }

  /**
   * Classify error type based on message patterns
   */
  private classifyError(message: string): WalletError['type'] {
    const lowerMessage = message.toLowerCase()

    for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))) {
        return type as WalletError['type']
      }
    }

    return 'unknown'
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(
    errorType: WalletError['type'],
    message: string,
    context: { walletType?: WalletType; chainId?: number; operation?: string }
  ): string {
    const walletName = context.walletType || 'your wallet'
    const operation = context.operation || 'wallet operation'

    switch (errorType) {
      case 'connection':
        if (message.includes('rejected') || message.includes('denied')) {
          return `Connection request was cancelled. Please try connecting ${walletName} again.`
        }
        return `Unable to connect to ${walletName}. Please check that your wallet is unlocked and try again.`

      case 'compatibility':
        if (context.walletType && context.chainId) {
          const compatibilityMessage = getCompatibilityErrorMessage(context.walletType, context.chainId)
          if (compatibilityMessage) {
            return compatibilityMessage
          }
        }
        return `${walletName} is not compatible with this network. Please try a different wallet.`

      case 'initialization':
        if (message.includes('already initialized')) {
          return 'Wallet system is already running. This should not affect functionality.'
        }
        return `Failed to initialize ${walletName}. Please refresh the page and try again.`

      case 'network':
        return `Network connection issue. Please check your internet connection and try again.`

      default:
        return `An unexpected error occurred during ${operation}. Please try again.`
    }
  }

  /**
   * Generate recovery action suggestion
   */
  private generateRecoveryAction(
    errorType: WalletError['type'],
    context: { walletType?: WalletType; chainId?: number }
  ): string {
    switch (errorType) {
      case 'connection':
        return 'Try connecting your wallet again, or use a different wallet'

      case 'compatibility':
        return 'Switch to a compatible wallet like MetaMask or use WalletConnect'

      case 'initialization':
        return 'Refresh the page and try again'

      case 'network':
        return 'Check your internet connection and try again'

      default:
        return 'Refresh the page or try a different wallet'
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(
    walletError: WalletError,
    context: { component?: string; operation?: string }
  ): void {
    if (this.options.suppressConsoleErrors) {
      return
    }

    const logContext = {
      type: walletError.type,
      walletType: walletError.walletType,
      chainId: walletError.chainId,
      component: context.component,
      operation: context.operation,
      originalError: walletError.originalError
    }

    switch (walletError.type) {
      case 'connection':
        if (walletError.message.includes('rejected') || walletError.message.includes('denied')) {
          logger.debug('User cancelled wallet connection', logContext)
        } else {
          logger.warn('Wallet connection failed', logContext)
        }
        break

      case 'compatibility':
        logger.warn('Wallet compatibility issue', logContext)
        break

      case 'initialization':
        if (walletError.message.includes('already initialized')) {
          logger.debug('Wallet already initialized (filtered)', logContext)
        } else {
          logger.error('Wallet initialization failed', logContext)
        }
        break

      case 'network':
        logger.warn('Network error during wallet operation', logContext)
        break

      default:
        logger.error('Unknown wallet error', logContext)
    }
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(walletError: WalletError): boolean {
    if (!this.options.enableRetry) {
      return false
    }

    // Don't retry user-cancelled operations
    if (walletError.type === 'connection' && 
        (walletError.message.includes('rejected') || walletError.message.includes('denied'))) {
      return false
    }

    // Don't retry compatibility issues
    if (walletError.type === 'compatibility') {
      return false
    }

    // Don't retry duplicate initialization
    if (walletError.type === 'initialization' && 
        walletError.message.includes('already initialized')) {
      return false
    }

    return true
  }

  /**
   * Handle retry logic
   */
  private handleRetry(
    walletError: WalletError,
    context: { operation?: string }
  ): void {
    const retryKey = `${walletError.type}-${context.operation || 'unknown'}`
    const currentRetries = this.retryCount.get(retryKey) || 0

    if (currentRetries >= (this.options.maxRetries || 3)) {
      logger.warn(`Max retries exceeded for ${retryKey}`)
      return
    }

    this.retryCount.set(retryKey, currentRetries + 1)
    logger.debug(`Retry ${currentRetries + 1} for ${retryKey}`)
  }

  /**
   * Reset retry count for specific operation
   */
  resetRetryCount(operation: string): void {
    Array.from(this.retryCount.keys())
      .filter(key => key.includes(operation))
      .forEach(key => this.retryCount.delete(key))
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    this.retryCount.forEach((count, key) => {
      stats[key] = count
    })
    return stats
  }
}

// ============================================================================
// Global Error Handler Instance
// ============================================================================

export const walletErrorHandler = new WalletErrorHandler({
  suppressConsoleErrors: false,
  showUserNotifications: true,
  enableRetry: true,
  maxRetries: 3
})

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick error handling for wallet operations
 */
export function handleWalletError(
  error: Error | string,
  walletType?: WalletType,
  chainId?: number,
  operation?: string
): WalletError {
  return walletErrorHandler.handleError(error, {
    walletType,
    chainId,
    operation
  })
}

/**
 * Check if error should be shown to user
 */
export function shouldShowErrorToUser(error: WalletError): boolean {
  // Don't show initialization warnings
  if (error.type === 'initialization' && error.message.includes('already initialized')) {
    return false
  }

  // Don't show user cancellation as error
  if (error.type === 'connection' && 
      (error.message.includes('rejected') || error.message.includes('denied'))) {
    return false
  }

  return true
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: WalletError): string {
  let message = error.userMessage

  if (error.recoveryAction) {
    message += ` ${error.recoveryAction}`
  }

  return message
}

export type { WalletError as WalletErrorType, WalletErrorHandlerOptions as WalletErrorHandlerOptionsType }