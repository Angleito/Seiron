'use client'

import React, { useState } from 'react'
import { EnhancedError, ErrorType } from '@hooks/useEnhancedErrorHandler'
import { DragonBallLoadingStates } from './DragonBallLoadingStates'
import { Button } from '@components/ui/forms/Button'
import { Card } from '@components/ui/display/Card'
import { Badge } from '@components/ui/display/Badge'

interface ChatErrorRecoveryProps {
  error: EnhancedError
  onRetry: () => Promise<void>
  onDismiss: () => void
  showDetails?: boolean
  className?: string
}

// Dragon Ball Z themed recovery suggestions
const getRecoverySuggestion = (error: EnhancedError): string => {
  const suggestions: Record<ErrorType, string[]> = {
    network: [
      "Check your ki connection and try again",
      "The Dragon Radar needs a stronger signal",
      "Move to a location with better energy flow"
    ],
    validation: [
      "Review your technique and try again",
      "Your form needs adjustment, warrior",
      "Master Roshi says: check your input!"
    ],
    permission: [
      "You need more training to access this",
      "Seek permission from King Kai",
      "Your power level is insufficient"
    ],
    server: [
      "The Dragon Balls are recharging",
      "Capsule Corp is working on it",
      "Shenron is temporarily unavailable"
    ],
    timeout: [
      "The technique took too long to execute",
      "Try a faster attack combo",
      "Your ki charge exceeded the time limit"
    ],
    unknown: [
      "An mysterious force is at work",
      "Consult the Elder Namekian",
      "The cause is beyond our scouters"
    ]
  }
  
  const typeSuggestions = suggestions[error.type] || suggestions.unknown
  return typeSuggestions[Math.floor(Math.random() * typeSuggestions.length)] || 'An unknown error occurred'
}

export const ChatErrorRecovery = React.memo(function ChatErrorRecovery({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}: ChatErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const suggestion = getRecoverySuggestion(error)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const getSeverityColor = (severity: EnhancedError['severity']): string => {
    switch (severity) {
      case 'low': return 'blue'
      case 'medium': return 'yellow'
      case 'high': return 'orange'
      case 'critical': return 'red'
      default: return 'gray'
    }
  }

  const getSeverityBadgeVariant = (severity: EnhancedError['severity']): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (severity) {
      case 'low': return 'info'
      case 'medium': return 'warning'
      case 'high': return 'warning'
      case 'critical': return 'danger'
      default: return 'default'
    }
  }

  const getSeverityIcon = (severity: EnhancedError['severity']) => {
    switch (severity) {
      case 'low': return '⚡'
      case 'medium': return '🔥'
      case 'high': return '💥'
      case 'critical': return '☠️'
    }
  }

  if (isRetrying) {
    return (
      <DragonBallLoadingStates.ErrorRecovery 
        message={`Attempting recovery (${error.retryCount + 1}/${error.maxRetries})...`}
        className={className}
      />
    )
  }

  return (
    <Card className={`p-4 bg-gray-900/50 border-${getSeverityColor(error.severity)}-800/50 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSeverityIcon(error.severity)}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-200">{error.message}</h3>
                <Badge variant={getSeverityBadgeVariant(error.severity)} size="sm">
                  {error.type.toUpperCase()}
                </Badge>
              </div>
              {error.powerLevel && (
                <div className="text-xs text-gray-400 mt-1">
                  Error Power Level: {error.powerLevel.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-300 text-xl"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>

        {/* Suggestion */}
        <div className="bg-black/20 rounded p-3">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-yellow-400">Suggestion:</span> {suggestion}
          </p>
        </div>

        {/* Retry Status */}
        {error.retryCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Recovery attempts: {error.retryCount}/{error.maxRetries}
            </span>
            {error.canRetry && (
              <span className="text-green-400">Can retry</span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {error.retryCount > 0 && (
          <div className="w-full">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r from-${getSeverityColor(error.severity)}-400 to-${getSeverityColor(error.severity)}-600 transition-all`}
                style={{ width: `${(error.retryCount / error.maxRetries) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {error.canRetry && (
            <Button
              onClick={handleRetry}
              size="sm"
              className={`bg-${getSeverityColor(error.severity)}-600 hover:bg-${getSeverityColor(error.severity)}-700 text-white`}
            >
              <span className="mr-1">🔄</span>
              Try Recovery Technique
            </Button>
          )}
          
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="ghost"
            size="sm"
            className="text-gray-400"
          >
            {showAdvanced ? 'Hide' : 'Show'} Scouter Analysis
          </Button>
        </div>

        {/* Advanced Details */}
        {showAdvanced && (
          <div className="bg-black/30 rounded p-3 space-y-2">
            <div className="text-xs font-mono text-gray-400">
              <div>Error ID: {error.id}</div>
              <div>Type: {error.type}</div>
              <div>Severity: {error.severity}</div>
              <div>Timestamp: {new Date(error.timestamp).toLocaleString()}</div>
              {showDetails && error.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer hover:text-gray-300">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-32">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})

// Error recovery manager for multiple errors
export const ChatErrorRecoveryManager = React.memo(function ChatErrorRecoveryManager({
  errors,
  onRetry,
  onDismiss,
  onClearAll,
  className = ''
}: {
  errors: EnhancedError[]
  onRetry: (errorId: string) => Promise<void>
  onDismiss: (errorId: string) => void
  onClearAll: () => void
  className?: string
}) {
  const [, setRetryingErrors] = useState<Set<string>>(new Set())

  const handleRetry = async (errorId: string) => {
    setRetryingErrors(prev => new Set(prev).add(errorId))
    try {
      await onRetry(errorId)
    } finally {
      setRetryingErrors(prev => {
        const next = new Set(prev)
        next.delete(errorId)
        return next
      })
    }
  }

  if (errors.length === 0) return null

  const criticalErrors = errors.filter(e => e.severity === 'critical')
  const otherErrors = errors.filter(e => e.severity !== 'critical')

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">
          System Errors ({errors.length})
        </h3>
        {errors.length > 1 && (
          <Button
            onClick={onClearAll}
            variant="ghost"
            size="sm"
            className="text-gray-400"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Critical Errors First */}
      {criticalErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-400">Critical Errors</h4>
          {criticalErrors.map(error => (
            <ChatErrorRecovery
              key={error.id}
              error={error}
              onRetry={() => handleRetry(error.id)}
              onDismiss={() => onDismiss(error.id)}
              showDetails={true}
            />
          ))}
        </div>
      )}

      {/* Other Errors */}
      {otherErrors.length > 0 && (
        <div className="space-y-2">
          {criticalErrors.length > 0 && (
            <h4 className="text-sm font-semibold text-gray-400">Other Errors</h4>
          )}
          {otherErrors.map(error => (
            <ChatErrorRecovery
              key={error.id}
              error={error}
              onRetry={() => handleRetry(error.id)}
              onDismiss={() => onDismiss(error.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
})

// Inline error indicator
export const ChatErrorIndicator = React.memo(function ChatErrorIndicator({
  error,
  onRetry,
  onDismiss,
  compact = false,
  className = ''
}: {
  error: EnhancedError
  onRetry?: () => void
  onDismiss?: () => void
  compact?: boolean
  className?: string
}) {
  const getSeverityColor = (severity: EnhancedError['severity']) => {
    switch (severity) {
      case 'low': return 'text-blue-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-orange-400'
      case 'critical': return 'text-red-400'
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className={getSeverityColor(error.severity)}>●</span>
        <span className="text-gray-400">{error.type}</span>
        {onRetry && error.canRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-full ${className}`}>
      <span className={`${getSeverityColor(error.severity)} animate-pulse`}>●</span>
      <span className="text-sm text-gray-300">{error.message}</span>
      <div className="flex items-center gap-1">
        {onRetry && error.canRetry && (
          <button
            onClick={onRetry}
            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-300"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
})