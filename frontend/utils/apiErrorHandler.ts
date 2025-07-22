/**
 * Comprehensive API Error Handler
 * Provides unified error handling, retry logic, and fallback mechanisms
 */

import { logger } from '@/lib/logger'

export interface ApiError extends Error {
  status?: number
  statusText?: string
  endpoint?: string
  method?: string
  retryable?: boolean
  fallbackAvailable?: boolean
  timestamp?: string
  requestId?: string
}

export class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private errorCount: Map<string, number> = new Map()
  private lastErrors: ApiError[] = []
  private maxErrorHistory = 50

  private constructor() {}

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * Handle API errors with context and retry logic
   */
  handleError(
    error: unknown,
    context: {
      endpoint: string
      method?: string
      requestId?: string
      retryAttempt?: number
      maxRetries?: number
    }
  ): ApiError {
    const apiError = this.normalizeError(error, context)
    
    // Log error
    logger.error('API Error', {
      endpoint: context.endpoint,
      method: context.method,
      status: apiError.status,
      message: apiError.message,
      requestId: context.requestId,
      retryAttempt: context.retryAttempt
    })
    
    // Track error frequency
    this.trackError(apiError)
    
    // Determine if error is retryable
    apiError.retryable = this.isRetryable(apiError, context)
    
    // Check if fallback is available
    apiError.fallbackAvailable = this.hasFallback(context.endpoint)
    
    return apiError
  }

  /**
   * Normalize various error types into ApiError
   */
  private normalizeError(error: unknown, context: any): ApiError {
    if (error instanceof Response) {
      const apiError = new Error(`HTTP ${error.status}: ${error.statusText}`) as ApiError
      apiError.status = error.status
      apiError.statusText = error.statusText
      apiError.endpoint = context.endpoint
      apiError.method = context.method
      apiError.timestamp = new Date().toISOString()
      apiError.requestId = context.requestId
      return apiError
    }
    
    if (error instanceof Error) {
      const apiError = error as ApiError
      apiError.endpoint = context.endpoint
      apiError.method = context.method
      apiError.timestamp = new Date().toISOString()
      apiError.requestId = context.requestId
      
      // Detect network errors
      if (error.message.includes('fetch')) {
        apiError.status = 0
        apiError.statusText = 'Network Error'
      }
      
      return apiError
    }
    
    // Unknown error type
    const apiError = new Error(String(error)) as ApiError
    apiError.endpoint = context.endpoint
    apiError.method = context.method
    apiError.timestamp = new Date().toISOString()
    apiError.requestId = context.requestId
    return apiError
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryable(error: ApiError, context: any): boolean {
    // Don't retry if max retries reached
    if (context.retryAttempt >= (context.maxRetries || 3)) {
      return false
    }
    
    // Network errors are retryable
    if (error.status === 0) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (error.status && error.status >= 500) {
      return true
    }
    
    // Rate limit errors are retryable
    if (error.status === 429) {
      return true
    }
    
    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true
    }
    
    return false
  }

  /**
   * Check if endpoint has fallback options
   */
  private hasFallback(endpoint: string): boolean {
    const fallbackEndpoints = [
      '/api/chat',
      '/api/chat/orchestrate',
      '/api/chat/stream'
    ]
    
    return fallbackEndpoints.some(ep => endpoint.includes(ep))
  }

  /**
   * Track error for monitoring
   */
  private trackError(error: ApiError): void {
    // Track error count by endpoint
    const key = `${error.method || 'GET'}:${error.endpoint}`
    const count = this.errorCount.get(key) || 0
    this.errorCount.set(key, count + 1)
    
    // Store in error history
    this.lastErrors.push(error)
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors.shift()
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByEndpoint: Map<string, number>
    recentErrors: ApiError[]
    mostFailedEndpoint: string | null
  } {
    let mostFailedEndpoint: string | null = null
    let maxErrors = 0
    
    this.errorCount.forEach((count, endpoint) => {
      if (count > maxErrors) {
        maxErrors = count
        mostFailedEndpoint = endpoint
      }
    })
    
    return {
      totalErrors: this.lastErrors.length,
      errorsByEndpoint: new Map(this.errorCount),
      recentErrors: [...this.lastErrors].slice(-10),
      mostFailedEndpoint
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(retryAttempt: number, error: ApiError): number {
    // Base delay
    let delay = 1000 * Math.pow(2, retryAttempt)
    
    // Cap at 30 seconds
    delay = Math.min(delay, 30000)
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000
    
    // Respect rate limit headers if present
    if (error.status === 429) {
      // Could parse Retry-After header here if available
      delay = Math.max(delay, 5000)
    }
    
    return delay
  }

  /**
   * Format error for user display
   */
  getUserMessage(error: ApiError): string {
    // Network errors
    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    
    // Authentication errors
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    
    // Permission errors
    if (error.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    
    // Not found errors
    if (error.status === 404) {
      return 'The requested resource was not found.'
    }
    
    // Rate limit errors
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    
    // Server errors
    if (error.status && error.status >= 500) {
      return 'The server encountered an error. Please try again later.'
    }
    
    // Timeout errors
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.'
    }
    
    // Default message
    return 'An unexpected error occurred. Please try again.'
  }

  /**
   * Reset error tracking (useful for testing)
   */
  reset(): void {
    this.errorCount.clear()
    this.lastErrors = []
  }
}

// Export singleton instance
export const apiErrorHandler = ApiErrorHandler.getInstance()

// Export convenience functions
export function handleApiError(
  error: unknown,
  endpoint: string,
  options?: {
    method?: string
    requestId?: string
    retryAttempt?: number
    maxRetries?: number
  }
): ApiError {
  return apiErrorHandler.handleError(error, {
    endpoint,
    ...options
  })
}

export function getErrorMessage(error: ApiError): string {
  return apiErrorHandler.getUserMessage(error)
}

export function shouldRetry(error: ApiError, retryAttempt: number): boolean {
  return error.retryable || false
}

export function getRetryDelay(error: ApiError, retryAttempt: number): number {
  return apiErrorHandler.getRetryDelay(retryAttempt, error)
}