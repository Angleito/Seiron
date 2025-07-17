import { useState, useCallback, useRef, useEffect } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { logger } from '@lib/logger'

// Types and interfaces
export interface BlockchainQueryParams {
  query: string
  userId?: string
  sessionId?: string
  temperature?: number
  includeDataSources?: boolean
  maxTokens?: number
  contextAware?: boolean
}

export interface BlockchainQueryResponse {
  query: string
  response: string
  sources?: string[]
  creditsUsed: number
  timestamp: string
  contextAware?: boolean
  enhancedWithMemory?: boolean
}

export interface BlockchainQueryState {
  data: BlockchainQueryResponse | null
  isLoading: boolean
  error: Error | null
  lastQuery: string | null
  creditsUsed: number
  totalQueries: number
  lastQueryTime: Date | null
  rateLimited: boolean
}

export interface BlockchainQueryOptions {
  autoRetry?: boolean
  retryAttempts?: number
  retryDelay?: number
  onSuccess?: (response: BlockchainQueryResponse) => void
  onError?: (error: Error) => void
  onRateLimit?: () => void
}

export interface BlockchainQueryHistory {
  query: string
  response: string
  timestamp: string
  creditsUsed: number
  success: boolean
  error?: string
}

const BLOCKCHAIN_API_ENDPOINT = '/api/ai/blockchain/query'
const DEFAULT_RETRY_ATTEMPTS = 2
const DEFAULT_RETRY_DELAY = 1000
const MAX_HISTORY_SIZE = 50

// Enhanced error interface
interface BlockchainQueryError extends Error {
  code?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  rateLimited?: boolean
  creditsExhausted?: boolean
}

export const useBlockchainQuery = (options: BlockchainQueryOptions = {}) => {
  const {
    autoRetry = true,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    onSuccess,
    onError,
    onRateLimit
  } = options

  // State management
  const [state, setState] = useState<BlockchainQueryState>({
    data: null,
    isLoading: false,
    error: null,
    lastQuery: null,
    creditsUsed: 0,
    totalQueries: 0,
    lastQueryTime: null,
    rateLimited: false
  })

  // Refs for performance and cleanup
  const historyRef = useRef<BlockchainQueryHistory[]>([])
  const abortControllerRef = useRef<AbortController>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  // Create enhanced error
  const createError = useCallback((
    message: string,
    code?: string,
    severity: BlockchainQueryError['severity'] = 'medium',
    recoverable = true
  ): BlockchainQueryError => {
    const error = new Error(message) as BlockchainQueryError
    error.code = code
    error.severity = severity
    error.recoverable = recoverable
    error.rateLimited = code === 'RATE_LIMITED'
    error.creditsExhausted = code === 'CREDITS_EXHAUSTED'
    return error
  }, [])

  // Update query history
  const updateHistory = useCallback((
    query: string,
    response: string,
    timestamp: string,
    creditsUsed: number,
    success: boolean,
    error?: string
  ) => {
    const historyEntry: BlockchainQueryHistory = {
      query,
      response,
      timestamp,
      creditsUsed,
      success,
      error
    }

    historyRef.current = [historyEntry, ...historyRef.current].slice(0, MAX_HISTORY_SIZE)
    
    logger.safe('info', 'Blockchain query history updated', {
      query: query.substring(0, 100),
      success,
      creditsUsed,
      totalHistorySize: historyRef.current.length
    })
  }, [])

  // Perform blockchain query
  const performQuery = useCallback(async (
    params: BlockchainQueryParams,
    attempt = 1
  ): Promise<BlockchainQueryResponse> => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    return pipe(
      TE.tryCatch(
        async () => {
          logger.safe('info', 'Starting blockchain query', {
            query: params.query.substring(0, 100),
            userId: params.userId || 'anonymous',
            attempt,
            contextAware: params.contextAware
          })

          const response = await fetch(BLOCKCHAIN_API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
            signal: abortControllerRef.current?.signal
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            
            // Handle rate limiting
            if (response.status === 429) {
              const error = createError(
                'Rate limit exceeded. Please wait before making another request.',
                'RATE_LIMITED',
                'medium',
                true
              )
              throw error
            }

            // Handle credits exhausted
            if (errorData.code === 'CREDITS_EXHAUSTED') {
              const error = createError(
                'API credits exhausted. Please wait for reset or upgrade plan.',
                'CREDITS_EXHAUSTED',
                'high',
                false
              )
              throw error
            }

            throw createError(
              errorData.details || `Request failed with status ${response.status}`,
              `HTTP_${response.status}`,
              response.status >= 500 ? 'high' : 'medium',
              response.status < 500
            )
          }

          const contentType = response.headers.get('content-type')
          if (!contentType?.includes('application/json')) {
            throw createError(
              'Invalid response format from server',
              'INVALID_RESPONSE',
              'medium',
              true
            )
          }

          const data = await response.json()

          if (!data.success) {
            throw createError(
              data.details || data.error || 'Query failed',
              'QUERY_FAILED',
              'medium',
              true
            )
          }

          return data.data as BlockchainQueryResponse
        },
        (error) => {
          if (error instanceof Error) {
            // Handle AbortError
            if (error.name === 'AbortError') {
              return createError(
                'Request was cancelled',
                'CANCELLED',
                'low',
                true
              )
            }

            // Handle network errors
            if (error.message.includes('fetch')) {
              return createError(
                'Network error. Please check your connection.',
                'NETWORK_ERROR',
                'medium',
                true
              )
            }

            // Return as enhanced error if already enhanced
            if ('severity' in error) {
              return error as BlockchainQueryError
            }

            // Create enhanced error from regular error
            return createError(
              error.message,
              'UNKNOWN_ERROR',
              'medium',
              true
            )
          }

          return createError(
            'An unexpected error occurred',
            'UNEXPECTED_ERROR',
            'high',
            false
          )
        }
      ),
      TE.orElse((error: BlockchainQueryError) => {
        // Retry logic
        if (autoRetry && attempt <= retryAttempts && error.recoverable && !error.rateLimited) {
          logger.safe('warn', 'Retrying blockchain query', {
            query: params.query.substring(0, 50),
            attempt,
            maxAttempts: retryAttempts,
            error: error.message
          })

          return TE.fromTask(
            () => new Promise<BlockchainQueryResponse>((resolve) => {
              retryTimeoutRef.current = setTimeout(() => {
                performQuery(params, attempt + 1).then(resolve).catch(() => {
                  resolve(Promise.reject(error))
                })
              }, retryDelay * attempt)
            })
          )
        }

        return TE.left(error)
      })
    )()
  }, [autoRetry, retryAttempts, retryDelay, createError])

  // Main query function
  const query = useCallback(async (params: BlockchainQueryParams): Promise<BlockchainQueryResponse | null> => {
    // Validate input
    if (!params.query || params.query.trim().length === 0) {
      const error = createError(
        'Query cannot be empty',
        'INVALID_INPUT',
        'low',
        true
      )
      setState(prev => ({ ...prev, error }))
      onError?.(error)
      return null
    }

    // Check if rate limited
    if (state.rateLimited) {
      const error = createError(
        'Rate limited. Please wait before making another request.',
        'RATE_LIMITED',
        'medium',
        true
      )
      onRateLimit?.()
      return null
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      lastQuery: params.query
    }))

    try {
      const result = await performQuery(params)

      if (E.isRight(result)) {
        const response = result.right
        
        // Update state with successful response
        setState(prev => ({
          ...prev,
          data: response,
          isLoading: false,
          error: null,
          creditsUsed: prev.creditsUsed + response.creditsUsed,
          totalQueries: prev.totalQueries + 1,
          lastQueryTime: new Date(),
          rateLimited: false
        }))

        // Update history
        updateHistory(
          params.query,
          response.response,
          response.timestamp,
          response.creditsUsed,
          true
        )

        // Call success callback
        onSuccess?.(response)

        logger.safe('info', 'Blockchain query successful', {
          query: params.query.substring(0, 100),
          creditsUsed: response.creditsUsed,
          totalCredits: state.creditsUsed + response.creditsUsed,
          sources: response.sources?.length || 0
        })

        return response
      } else {
        const error = result.left
        
        // Update state with error
        setState(prev => ({
          ...prev,
          data: null,
          isLoading: false,
          error,
          rateLimited: error.rateLimited || false
        }))

        // Update history
        updateHistory(
          params.query,
          '',
          new Date().toISOString(),
          0,
          false,
          error.message
        )

        // Call error callback
        onError?.(error)

        // Call rate limit callback if applicable
        if (error.rateLimited) {
          onRateLimit?.()
        }

        logger.safe('error', 'Blockchain query failed', {
          query: params.query.substring(0, 100),
          error: error.message,
          code: error.code,
          severity: error.severity,
          recoverable: error.recoverable
        })

        return null
      }
    } catch (error) {
      const enhancedError = createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNEXPECTED_ERROR',
        'high',
        false
      )

      setState(prev => ({
        ...prev,
        data: null,
        isLoading: false,
        error: enhancedError
      }))

      onError?.(enhancedError)
      return null
    }
  }, [performQuery, state.rateLimited, state.creditsUsed, onSuccess, onError, onRateLimit, updateHistory, createError])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, rateLimited: false }))
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = []
    setState(prev => ({
      ...prev,
      creditsUsed: 0,
      totalQueries: 0
    }))
    
    logger.safe('info', 'Blockchain query history cleared')
  }, [])

  // Get query history
  const getHistory = useCallback(() => {
    return [...historyRef.current]
  }, [])

  // Get usage statistics
  const getUsageStats = useCallback(() => {
    const history = historyRef.current
    const successfulQueries = history.filter(h => h.success).length
    const totalCredits = history.reduce((sum, h) => sum + h.creditsUsed, 0)
    
    return {
      totalQueries: history.length,
      successfulQueries,
      failedQueries: history.length - successfulQueries,
      totalCreditsUsed: totalCredits,
      averageCreditsPerQuery: history.length > 0 ? totalCredits / history.length : 0,
      successRate: history.length > 0 ? successfulQueries / history.length : 0
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    query,
    clearError,
    clearHistory,
    
    // Utilities
    getHistory,
    getUsageStats,
    
    // Computed values
    hasHistory: historyRef.current.length > 0,
    canQuery: !state.isLoading && !state.rateLimited,
    usageStats: getUsageStats()
  }
}

export default useBlockchainQuery