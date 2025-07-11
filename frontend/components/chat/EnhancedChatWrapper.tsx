'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { DragonBallErrorBoundary, ChatFeatureErrorBoundary } from '@components/error-boundaries/DragonBallErrorBoundary'
import { useEnhancedErrorHandler } from '@hooks/useEnhancedErrorHandler'
import { DragonBallLoadingStates } from './parts/DragonBallLoadingStates'
import { ChatErrorRecoveryManager, ChatErrorIndicator } from './parts/ChatErrorRecovery'
import { logger } from '@lib/logger'

interface EnhancedChatWrapperProps {
  children: React.ReactNode
  userId?: string
  sessionId?: string
  onError?: (error: Error) => void
  showErrorRecovery?: boolean
  enableAutoRecovery?: boolean
  className?: string
}

// Connection status hook
function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('good')

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      logger.info('Connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality('offline')
      logger.warn('Connection lost')
    }

    // Monitor connection quality
    const checkConnectionQuality = async () => {
      if (!isOnline) {
        setConnectionQuality('offline')
        return
      }

      try {
        const start = Date.now()
        await fetch('/api/health', { method: 'HEAD' })
        const latency = Date.now() - start

        if (latency < 100) {
          setConnectionQuality('excellent')
        } else if (latency < 300) {
          setConnectionQuality('good')
        } else {
          setConnectionQuality('poor')
        }
      } catch {
        setConnectionQuality('poor')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(checkConnectionQuality, 30000) // Check every 30s

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isOnline])

  return { isOnline, connectionQuality }
}

// Status bar component
const ChatStatusBar = React.memo(function ChatStatusBar({
  connectionQuality,
  errorCount,
  isRecovering
}: {
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
  errorCount: number
  isRecovering: boolean
}) {
  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return '🟢'
      case 'good': return '🟡'
      case 'poor': return '🟠'
      case 'offline': return '🔴'
    }
  }

  const getConnectionText = () => {
    switch (connectionQuality) {
      case 'excellent': return 'Ki flow excellent'
      case 'good': return 'Ki flow stable'
      case 'poor': return 'Ki flow weak'
      case 'offline': return 'Ki flow disrupted'
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span>{getConnectionIcon()}</span>
          <span className="text-gray-400">{getConnectionText()}</span>
        </div>
        
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-orange-400">⚠️</span>
            <span className="text-gray-400">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
          </div>
        )}
        
        {isRecovering && (
          <div className="flex items-center gap-2">
            <DragonBallLoadingStates.KiCharging size="sm" color="yellow" />
            <span className="text-gray-400">Recovering...</span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        Seiron Chat System v2.0
      </div>
    </div>
  )
})

export const EnhancedChatWrapper = React.memo(function EnhancedChatWrapper({
  children,
  userId,
  sessionId,
  onError,
  showErrorRecovery = true,
  enableAutoRecovery = true,
  className = ''
}: EnhancedChatWrapperProps) {
  const { isOnline, connectionQuality } = useConnectionStatus()
  const [isInitializing, setIsInitializing] = useState(true)
  const [, setHasInitError] = useState(false)

  const errorHandler = useEnhancedErrorHandler({
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
    onError: (error) => {
      logger.error('Chat error:', error)
      if (onError && error.details) {
        onError(error.details)
      }
    },
    onMaxRetriesReached: (error) => {
      logger.error('Max retries reached for error:', error)
    }
  })

  // Initialize chat system
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsInitializing(true)
        
        // Simulate initialization checks
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we're online
        if (!isOnline) {
          throw new Error('No internet connection')
        }
        
        logger.info('Chat system initialized', { userId, sessionId })
        setHasInitError(false)
      } catch (error) {
        logger.error('Failed to initialize chat:', error)
        errorHandler.handleError(error)
        setHasInitError(true)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeChat()
  }, [userId, sessionId, isOnline])

  // Auto-recovery for network errors
  useEffect(() => {
    if (!enableAutoRecovery) return

    const networkErrors = errorHandler.errors.filter(e => e.type === 'network')
    networkErrors.forEach(error => {
      if (error.canRetry && isOnline) {
        errorHandler.scheduleAutoRetry(error.id, async () => {
          // Attempt to recover network connection
          await fetch('/api/health')
        })
      }
    })
  }, [errorHandler.errors, isOnline, enableAutoRecovery])

  // Loading state
  if (isInitializing) {
    return (
      <div className={`h-full flex flex-col bg-gradient-to-b from-gray-950 to-black ${className}`}>
        <DragonBallLoadingStates.Session />
      </div>
    )
  }

  // Offline state
  if (!isOnline) {
    return (
      <div className={`h-full flex flex-col bg-gradient-to-b from-gray-950 to-black ${className}`}>
        <ChatStatusBar 
          connectionQuality="offline" 
          errorCount={0} 
          isRecovering={false} 
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🌐💥</div>
            <h2 className="text-2xl font-bold text-gray-200 mb-2">
              Connection to Other World Lost
            </h2>
            <p className="text-gray-400 mb-6">
              Check your internet connection to restore communication with King Kai
            </p>
            <DragonBallLoadingStates.Reconnecting />
          </div>
        </div>
      </div>
    )
  }

  // Error boundary wrapper
  return (
    <DragonBallErrorBoundary 
      name="Chat System" 
      level="feature"
      onError={(error) => {
        errorHandler.handleError(error)
      }}
    >
      <div className={`h-full flex flex-col bg-gradient-to-b from-gray-950 to-black ${className}`}>
        {/* Status Bar */}
        <ChatStatusBar 
          connectionQuality={connectionQuality}
          errorCount={errorHandler.errors.length}
          isRecovering={errorHandler.isRecovering}
        />

        {/* Error Recovery Manager */}
        {showErrorRecovery && errorHandler.errors.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-800">
            <ChatErrorRecoveryManager
              errors={errorHandler.errors}
              onRetry={async (errorId) => {
                // Implement retry logic based on error type
                const error = errorHandler.errorMap.get(errorId)
                if (!error) return

                await errorHandler.retryOperation(async () => {
                  // Retry the failed operation
                  switch (error.type) {
                    case 'network':
                      await fetch('/api/health')
                      break
                    case 'server':
                      // Retry server operation
                      break
                    default:
                      throw new Error('Retry not implemented for this error type')
                  }
                }, errorId)
              }}
              onDismiss={errorHandler.dismissError}
              onClearAll={errorHandler.clearAllErrors}
            />
          </div>
        )}

        {/* Main Chat Content */}
        <div className="flex-1 overflow-hidden">
          <ChatFeatureErrorBoundary>
            <Suspense fallback={<DragonBallLoadingStates.History />}>
              {children}
            </Suspense>
          </ChatFeatureErrorBoundary>
        </div>

        {/* Floating Error Indicators */}
        {errorHandler.errors.length > 0 && !showErrorRecovery && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {errorHandler.errors.slice(0, 3).map(error => (
              <ChatErrorIndicator
                key={error.id}
                error={error}
                onRetry={error.canRetry ? () => {
                  errorHandler.retryOperation(async () => {
                    // Implement retry
                  }, error.id)
                } : undefined}
                onDismiss={() => errorHandler.dismissError(error.id)}
              />
            ))}
            {errorHandler.errors.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{errorHandler.errors.length - 3} more errors
              </div>
            )}
          </div>
        )}
      </div>
    </DragonBallErrorBoundary>
  )
})

// Export enhanced chat with all error handling
export function EnhancedChat({ children, ...props }: EnhancedChatWrapperProps) {
  return (
    <EnhancedChatWrapper {...props}>
      {children}
    </EnhancedChatWrapper>
  )
}