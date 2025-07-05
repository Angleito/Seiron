'use client'

import React, { useCallback } from 'react'
import { Mic, AlertCircle } from 'lucide-react'
import { cn } from '@lib/utils'
import { StreamMessage } from '../ChatStreamService'
import { useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'
import { logger } from '@lib/logger'

interface ChatMessageProps {
  message: StreamMessage
  onRetry: (messageId: string) => void
}

// Safe message content renderer - memoized
const SafeMessageContent = React.memo(function SafeMessageContent({ 
  content, 
  type 
}: { 
  content: string
  type: 'user' | 'agent' | 'system' 
}) {
  const { sanitized, isValid, warnings } = useSanitizedContent(
    content, 
    type === 'user' ? SANITIZE_CONFIGS.CHAT_MESSAGE : SANITIZE_CONFIGS.TEXT_ONLY
  )
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    logger.warn('Message sanitization warnings:', warnings)
  }
  
  // If content is potentially unsafe, show a warning
  if (!isValid) {
    return (
      <div className="text-yellow-400 text-sm">
        ⚠️ Message content filtered for security
      </div>
    )
  }
  
  return <span className="whitespace-pre-wrap">{sanitized}</span>
})

export const ChatMessage = React.memo(function ChatMessage({
  message,
  onRetry
}: ChatMessageProps) {
  // Message status icon - memoized
  const getStatusIcon = useCallback((status?: StreamMessage['status']): string | null => {
    if (!status) return null
    
    switch (status) {
      case 'pending': return '○'
      case 'sending': return '◐'
      case 'sent': return '◑'
      case 'delivered': return '●'
      case 'failed': return '✗'
      default: return null
    }
  }, [])

  return (
    <div
      className={cn(
        'flex',
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          message.type === 'user'
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
            : message.type === 'system'
            ? 'bg-gray-800 text-gray-300 italic'
            : message.metadata?.error
            ? 'bg-red-100 text-red-900'
            : 'bg-gray-900 text-red-100'
        )}
      >
        {/* Voice indicator for voice messages */}
        {message.metadata?.source === 'voice' && (
          <div className="flex items-center gap-1 mb-1">
            <Mic className="h-3 w-3" />
            <span className="text-xs opacity-75">Voice message</span>
          </div>
        )}
        
        <SafeMessageContent content={message.content} type={message.type} />
        
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs opacity-75">
            {message.timestamp.toLocaleTimeString()}
          </span>
          
          {/* Status indicator */}
          {message.status && message.type === 'user' && (
            <span className={cn(
              'text-xs',
              message.status === 'failed' ? 'text-red-400' : 'opacity-75'
            )}>
              {getStatusIcon(message.status)}
            </span>
          )}
          
          {/* Retry button for failed messages */}
          {message.status === 'failed' && (
            <button
              onClick={() => onRetry(message.id)}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
})