import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@lib/logger'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorType = 'network' | 'validation' | 'permission' | 'server' | 'timeout' | 'unknown'

export interface EnhancedError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  details?: any
  timestamp: number
  retryCount: number
  maxRetries: number
  canRetry: boolean
  powerLevel?: number // Dragon Ball Z theme
}

export interface ErrorHandlerOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  onError?: (error: EnhancedError) => void
  onRetry?: (error: EnhancedError, attempt: number) => void
  onMaxRetriesReached?: (error: EnhancedError) => void
}

// Dragon Ball Z themed error messages
const DBZ_ERROR_MESSAGES: Record<ErrorType, string[]> = {
  network: [
    "Lost connection to the Hyperbolic Time Chamber!",
    "The scouter's signal is being jammed!",
    "Can't reach King Kai's planet!"
  ],
  validation: [
    "That's not a valid technique!",
    "Your form is incorrect, warrior!",
    "This attack pattern is forbidden!"
  ],
  permission: [
    "You need to train more to access this power!",
    "Only Super Saiyans can use this feature!",
    "Access denied by the Grand Elder!"
  ],
  server: [
    "The Dragon Balls are temporarily inactive!",
    "Capsule Corp servers are under maintenance!",
    "The World Martial Arts Tournament system is down!"
  ],
  timeout: [
    "The Spirit Bomb is taking too long to charge!",
    "Fusion dance timer expired!",
    "Ki blast charge timeout!"
  ],
  unknown: [
    "An unknown force disrupts the battlefield!",
    "Mysterious energy detected!",
    "Anomaly in the space-time continuum!"
  ]
}

export function useEnhancedErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onError,
    onRetry,
    onMaxRetriesReached
  } = options

  const [errors, setErrors] = useState<Map<string, EnhancedError>>(new Map())
  const [isRecovering, setIsRecovering] = useState(false)
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const errorCounter = useRef(0)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
      retryTimeouts.current.clear()
    }
  }, [])

  const getErrorType = (error: any): ErrorType => {
    if (!error) return 'unknown'
    
    const message = (error.message || '').toLowerCase()
    const code = (error.code || '').toLowerCase()
    
    if (message.includes('network') || message.includes('fetch') || code === 'network_error') {
      return 'network'
    }
    if (message.includes('validation') || message.includes('invalid') || code.includes('validation')) {
      return 'validation'
    }
    if (message.includes('permission') || message.includes('unauthorized') || code === '403') {
      return 'permission'
    }
    if (message.includes('server') || code.startsWith('5')) {
      return 'server'
    }
    if (message.includes('timeout') || code === 'timeout') {
      return 'timeout'
    }
    
    return 'unknown'
  }

  const getErrorSeverity = (type: ErrorType, retryCount: number): ErrorSeverity => {
    if (retryCount >= maxRetries) return 'critical'
    
    switch (type) {
      case 'permission':
        return 'high'
      case 'server':
        return retryCount > 1 ? 'high' : 'medium'
      case 'network':
      case 'timeout':
        return retryCount > 1 ? 'medium' : 'low'
      case 'validation':
        return 'low'
      default:
        return 'medium'
    }
  }

  const calculatePowerLevel = (error: EnhancedError): number => {
    // Calculate error "power level" based on severity and retry count
    const basePower = {
      low: 1000,
      medium: 3000,
      high: 6000,
      critical: 9000
    }
    
    const power = basePower[error.severity]
    const retryMultiplier = 1 + (error.retryCount * 0.5)
    
    return Math.min(Math.floor(power * retryMultiplier), 9999)
  }

  const getRandomDBZMessage = (type: ErrorType): string => {
    const messages = DBZ_ERROR_MESSAGES[type] || DBZ_ERROR_MESSAGES.unknown
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)]
    return selectedMessage || 'An unknown error has occurred!'
  }

  const createEnhancedError = (
    error: any,
    existingError?: EnhancedError
  ): EnhancedError => {
    const type = getErrorType(error)
    const retryCount = existingError?.retryCount || 0
    const severity = getErrorSeverity(type, retryCount)
    
    const enhancedError: EnhancedError = {
      id: existingError?.id || `error-${++errorCounter.current}`,
      type,
      severity,
      message: getRandomDBZMessage(type),
      details: error,
      timestamp: Date.now(),
      retryCount,
      maxRetries,
      canRetry: retryCount < maxRetries && type !== 'validation' && type !== 'permission'
    }
    
    enhancedError.powerLevel = calculatePowerLevel(enhancedError)
    
    return enhancedError
  }

  const handleError = useCallback((error: any, errorId?: string) => {
    const existingError = errorId ? errors.get(errorId) : undefined
    const enhancedError = createEnhancedError(error, existingError)
    
    logger.error('Enhanced error handler:', {
      error: enhancedError,
      originalError: error
    })
    
    setErrors(prev => new Map(prev).set(enhancedError.id, enhancedError))
    
    if (onError) {
      onError(enhancedError)
    }
    
    return enhancedError
  }, [errors, maxRetries, onError])

  const calculateRetryDelay = (retryCount: number): number => {
    if (!exponentialBackoff) return retryDelay
    return Math.min(retryDelay * Math.pow(2, retryCount), 30000) // Max 30 seconds
  }

  const retryOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    errorId: string
  ): Promise<T> => {
    const error = errors.get(errorId)
    if (!error || !error.canRetry) {
      throw new Error('Cannot retry this operation')
    }
    
    setIsRecovering(true)
    
    try {
      // Clear existing timeout
      const existingTimeout = retryTimeouts.current.get(errorId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        retryTimeouts.current.delete(errorId)
      }
      
      // Update retry count
      const updatedError = {
        ...error,
        retryCount: error.retryCount + 1,
        canRetry: error.retryCount + 1 < maxRetries
      }
      
      setErrors(prev => new Map(prev).set(errorId, updatedError))
      
      if (onRetry) {
        onRetry(updatedError, updatedError.retryCount)
      }
      
      // Wait before retrying
      const delay = calculateRetryDelay(updatedError.retryCount)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Attempt operation
      const result = await operation()
      
      // Success - remove error
      setErrors(prev => {
        const next = new Map(prev)
        next.delete(errorId)
        return next
      })
      
      return result
    } catch (retryError) {
      // Retry failed
      const updatedError = handleError(retryError, errorId)
      
      if (!updatedError.canRetry && onMaxRetriesReached) {
        onMaxRetriesReached(updatedError)
      }
      
      throw retryError
    } finally {
      setIsRecovering(false)
    }
  }, [errors, maxRetries, retryDelay, exponentialBackoff, onRetry, onMaxRetriesReached, handleError])

  const dismissError = useCallback((errorId: string) => {
    const timeout = retryTimeouts.current.get(errorId)
    if (timeout) {
      clearTimeout(timeout)
      retryTimeouts.current.delete(errorId)
    }
    
    setErrors(prev => {
      const next = new Map(prev)
      next.delete(errorId)
      return next
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    retryTimeouts.current.clear()
    setErrors(new Map())
  }, [])

  // Auto-retry for certain error types
  const scheduleAutoRetry = useCallback((
    errorId: string,
    operation: () => Promise<any>
  ) => {
    const error = errors.get(errorId)
    if (!error || !error.canRetry) return
    
    const delay = calculateRetryDelay(error.retryCount + 1)
    const timeout = setTimeout(() => {
      retryOperation(operation, errorId).catch(() => {
        // Auto-retry failed, error already handled
      })
    }, delay)
    
    retryTimeouts.current.set(errorId, timeout)
  }, [errors, retryOperation])

  // Functional error handling with fp-ts
  const handleTaskEither = useCallback(<E, A>(
    task: TE.TaskEither<E, A>
  ): TE.TaskEither<EnhancedError, A> => {
    return pipe(
      task,
      TE.mapLeft(error => handleError(error))
    )
  }, [handleError])

  const getErrorByType = useCallback((type: ErrorType): O.Option<EnhancedError> => {
    const errorsArray = Array.from(errors.values())
    const error = errorsArray.find(e => e.type === type)
    return O.fromNullable(error)
  }, [errors])

  const hasErrorOfType = useCallback((type: ErrorType): boolean => {
    return pipe(
      getErrorByType(type),
      O.isSome
    )
  }, [getErrorByType])

  const getActiveErrors = useCallback((): EnhancedError[] => {
    return Array.from(errors.values()).sort((a, b) => b.timestamp - a.timestamp)
  }, [errors])

  const getMostSevereError = useCallback((): O.Option<EnhancedError> => {
    const severityOrder: Record<ErrorSeverity, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    }
    
    const activeErrors = getActiveErrors()
    if (activeErrors.length === 0) return O.none
    
    const mostSevere = activeErrors.reduce((prev, curr) => 
      severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
    )
    
    return O.some(mostSevere)
  }, [getActiveErrors])

  return {
    errors: getActiveErrors(),
    errorMap: errors,
    isRecovering,
    handleError,
    retryOperation,
    dismissError,
    clearAllErrors,
    scheduleAutoRetry,
    handleTaskEither,
    getErrorByType,
    hasErrorOfType,
    getMostSevereError,
    // Utility functions
    getErrorType,
    getErrorSeverity,
    calculatePowerLevel,
    getRandomDBZMessage
  }
}