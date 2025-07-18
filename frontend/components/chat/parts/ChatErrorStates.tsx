'use client'

import React from 'react'
import { Button } from '../../ui/forms/Button'
import { Card } from '../../ui/display/Card'
import { Badge } from '../../ui/display/Badge'
import { ChatPersistenceError } from '../../../services/chat-persistence.service'

interface ErrorStateProps {
  error: ChatPersistenceError
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

// Generic error display component
export const ChatErrorDisplay = React.memo(function ChatErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorStateProps) {
  const getErrorIcon = (type: ChatPersistenceError['type']) => {
    switch (type) {
      case 'network': return '🌐'
      case 'validation': return '⚠️'
      case 'permission': return '🔒'
      case 'server': return '🖥️'
      case 'warning': return '⚡'
      default: return '❌'
    }
  }

  const getErrorTitle = (type: ChatPersistenceError['type']) => {
    switch (type) {
      case 'network': return 'Connection Error'
      case 'validation': return 'Invalid Data'
      case 'permission': return 'Access Denied'
      case 'server': return 'Server Error'
      case 'warning': return 'Notice'
      default: return 'Unknown Error'
    }
  }

  const getErrorSuggestion = (type: ChatPersistenceError['type']) => {
    switch (type) {
      case 'network': 
        return 'Check your internet connection and try again.'
      case 'validation': 
        return 'Please check your input and try again.'
      case 'permission': 
        return 'You may need to log in or check your permissions.'
      case 'server': 
        return 'Our servers are experiencing issues. Please try again later.'
      case 'warning':
        return 'This is informational and may not require immediate action.'
      default: 
        return 'An unexpected error occurred. Please try again.'
    }
  }

  return (
    <Card className={`p-4 bg-gray-900/50 border-gray-700 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-size-1 flex-shrink-0">{getErrorIcon(error.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-200">{getErrorTitle(error.type)}</h3>
            <Badge variant={error.type === 'warning' ? 'warning' : 'danger'} size="sm">{error.type}</Badge>
          </div>
          <p className="text-gray-300 text-size-3 mb-2">{error.message}</p>
          <p className="text-gray-400 text-size-4 mb-3">{getErrorSuggestion(error.type)}</p>
          
          {error.details && (
            <details className="text-size-4 text-gray-500 mb-3">
              <summary className="cursor-pointer hover:text-gray-400">Show details</summary>
              <pre className="mt-1 p-2 bg-black/30 rounded text-size-4 overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
})

// Error state for failed session loading
export const SessionLoadingError = React.memo(function SessionLoadingError({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`p-6 text-center ${className}`}>
      <div className="text-size-1 mb-4">🐉💥</div>
      <h2 className="text-size-1 font-semibold text-gray-200 mb-2">Failed to Load Sessions</h2>
      <p className="text-gray-300 mb-4">
        The Dragon Balls are scattered! We couldn't load your chat sessions.
      </p>
      <ChatErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </div>
  )
})

// Error state for failed message loading
export const MessageLoadingError = React.memo(function MessageLoadingError({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`p-6 text-center ${className}`}>
      <div className="text-size-1 mb-4">💬❌</div>
      <h2 className="text-size-1 font-semibold text-gray-200 mb-2">Failed to Load Messages</h2>
      <p className="text-gray-300 mb-4">
        The conversation history is lost in the void. Let's try to recover it!
      </p>
      <ChatErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </div>
  )
})

// Error state for failed session creation
export const SessionCreationError = React.memo(function SessionCreationError({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-size-1">🆕❌</span>
        <h3 className="text-size-2 font-semibold text-gray-200">Failed to Create Session</h3>
      </div>
      <p className="text-gray-300 text-size-3 mb-3">
        Couldn't create a new chat session. The Dragon may be busy!
      </p>
      <ChatErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </div>
  )
})

// Error state for failed message sending
export const MessageSendingError = React.memo(function MessageSendingError({
  error,
  onRetry,
  onDismiss,
  messageContent,
  className = ''
}: ErrorStateProps & { messageContent?: string }) {
  return (
    <div className={`p-3 bg-gray-900/50 border border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-size-2">📤❌</span>
        <div className="flex-1 min-w-0">
          <div className="text-size-3 font-normal text-gray-200 mb-1">Message Failed to Send</div>
          {messageContent && (
            <div className="text-size-4 text-gray-400 mb-2 p-2 bg-black/20 rounded">
              "{messageContent.slice(0, 100)}{messageContent.length > 100 ? '...' : ''}"
            </div>
          )}
          <div className="text-size-4 text-gray-400 mb-2">{error.message}</div>
          <div className="flex gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1"
              >
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// Error state for voice operations
export const VoiceError = React.memo(function VoiceError({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`p-3 bg-gray-900/50 border border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">🎤❌</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-normal text-gray-200">Voice Error</div>
          <div className="text-xs text-gray-400">{error.message}</div>
        </div>
        <div className="flex gap-1">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-300 text-xs"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-300 text-xs"
            >
              ×
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

// Error state for network connectivity
export const NetworkError = React.memo(function NetworkError({
  onRetry,
  className = ''
}: {
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`p-6 text-center ${className}`}>
      <div className="text-6xl mb-4">🌐💥</div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">Connection Lost</h2>
      <p className="text-gray-300 mb-4">
        The Dragon Radar can't connect to the network. Check your connection!
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          🔄 Reconnect
        </Button>
      )}
    </div>
  )
})

// Error boundary fallback for chat components
export const ChatErrorFallback = React.memo(function ChatErrorFallback({
  error,
  resetError,
  className = ''
}: {
  error: Error
  resetError: () => void
  className?: string
}) {
  return (
    <div className={`p-8 text-center bg-gradient-to-b from-gray-950/50 to-black ${className}`}>
      <div className="text-8xl mb-6">🐉💥</div>
      <h1 className="text-size-1 font-semibold text-gray-200 mb-4">
        The Dragon Has Encountered an Error!
      </h1>
      <p className="text-gray-300 mb-6 max-w-md mx-auto">
        Something went wrong with the chat system. The Dragon Balls need to be recalibrated!
      </p>
      
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6 max-w-lg mx-auto">
        <div className="text-sm font-normal text-gray-200 mb-2">Error Details:</div>
        <div className="text-xs text-gray-300 font-mono bg-black/30 p-2 rounded">
          {error.message}
        </div>
      </div>
      
      <div className="space-y-3">
        <Button
          onClick={resetError}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          🔄 Reset Dragon System
        </Button>
        <div>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-gray-400 hover:text-gray-300"
          >
            🔃 Reload Page
          </Button>
        </div>
      </div>
    </div>
  )
})

// Error toast notification
export const ChatErrorToast = React.memo(function ChatErrorToast({
  error,
  onDismiss,
  className = ''
}: {
  error: ChatPersistenceError
  onDismiss: () => void
  className?: string
}) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 bg-gray-900/90 border border-gray-700 rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{error.type === 'warning' ? '⚡' : '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="font-normal text-gray-200 text-sm mb-1">
            {error.type === 'network' ? 'Connection Error' : error.type === 'warning' ? 'Notice' : 'Error'}
          </div>
          <div className="text-gray-400 text-xs">{error.message}</div>
        </div>
        <Button
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-300 flex-shrink-0"
        >
          ×
        </Button>
      </div>
    </div>
  )
})

// Combined error states export
export const ChatErrorStates = {
  Display: ChatErrorDisplay,
  SessionLoading: SessionLoadingError,
  MessageLoading: MessageLoadingError,
  SessionCreation: SessionCreationError,
  MessageSending: MessageSendingError,
  Voice: VoiceError,
  Network: NetworkError,
  Fallback: ChatErrorFallback,
  Toast: ChatErrorToast
}