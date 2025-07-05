'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Mic, AlertCircle, Copy, Check } from 'lucide-react'
import { cn } from '@lib/utils'
import { StreamMessage } from '../ChatStreamService'
import { useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'
import { logger, safeDebug, safeInfo, safeWarn } from '@lib/logger'

interface ChatMessageProps {
  message: StreamMessage
  onRetry: (messageId: string) => void
  sessionId?: string
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
  onRetry,
  sessionId
}: ChatMessageProps) {
  const [renderStartTime] = useState(Date.now())
  const [isHovered, setIsHovered] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)
  
  // Log message render
  useEffect(() => {
    const renderTime = Date.now() - renderStartTime
    
    safeDebug('ChatMessage rendered', {
      sessionId,
      messageId: message.id,
      messageType: message.type,
      agentType: message.agentType,
      status: message.status,
      contentLength: message.content.length,
      renderTime,
      hasMetadata: !!message.metadata,
      timestamp: message.timestamp
    })
  }, [sessionId, message, renderStartTime])
  
  // Log status changes
  useEffect(() => {
    if (message.status) {
      safeDebug('Message status changed', {
        sessionId,
        messageId: message.id,
        status: message.status,
        messageType: message.type,
        timestamp: Date.now()
      })
    }
  }, [message.status, sessionId, message.id, message.type])
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
  
  // Handle copy to clipboard
  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setInteractionCount(prev => prev + 1)
      
      safeInfo('Message copied to clipboard', {
        sessionId,
        messageId: message.id,
        messageType: message.type,
        contentLength: message.content.length,
        interactionCount: interactionCount + 1
      })
      
      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      safeWarn('Failed to copy message to clipboard', {
        sessionId,
        messageId: message.id,
        error
      })
    }
  }, [message.content, message.id, message.type, sessionId, interactionCount])
  
  // Handle retry action
  const handleRetry = useCallback(() => {
    setInteractionCount(prev => prev + 1)
    
    safeInfo('User triggered message retry', {
      sessionId,
      messageId: message.id,
      messageType: message.type,
      status: message.status,
      retryCount: message.retryCount || 0,
      interactionCount: interactionCount + 1
    })
    
    onRetry(message.id)
  }, [onRetry, message.id, message.type, message.status, message.retryCount, sessionId, interactionCount])
  
  // Handle message hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    setInteractionCount(prev => prev + 1)
    
    safeDebug('Message hovered', {
      sessionId,
      messageId: message.id,
      messageType: message.type,
      interactionCount: interactionCount + 1
    })
  }, [sessionId, message.id, message.type, interactionCount])
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    
    safeDebug('Message hover ended', {
      sessionId,
      messageId: message.id,
      messageType: message.type
    })
  }, [sessionId, message.id, message.type])
  
  // Handle message click
  const handleMessageClick = useCallback(() => {
    setInteractionCount(prev => prev + 1)
    
    safeDebug('Message clicked', {
      sessionId,
      messageId: message.id,
      messageType: message.type,
      interactionCount: interactionCount + 1
    })
  }, [sessionId, message.id, message.type, interactionCount])

  return (
    <div
      className={cn(
        'flex',
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMessageClick}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2 relative group transition-all duration-200',
          message.type === 'user'
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
            : message.type === 'system'
            ? 'bg-gray-800 text-gray-300 italic'
            : message.metadata?.error
            ? 'bg-red-100 text-red-900'
            : 'bg-gray-900 text-red-100',
          isHovered && 'shadow-lg transform scale-[1.02]'
        )}
      >
        {/* Copy button - appears on hover */}
        {isHovered && message.content.trim() && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopyMessage()
            }}
            className={cn(
              'absolute top-2 right-2 p-1 rounded bg-black/20 hover:bg-black/40 transition-colors',
              message.type === 'user' ? 'text-white' : 'text-gray-300'
            )}
            title="Copy message"
          >
            {isCopied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
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
              onClick={(e) => {
                e.stopPropagation()
                handleRetry()
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              title="Retry sending message"
            >
              <AlertCircle className="h-3 w-3" />
              Retry
            </button>
          )}
          
          {/* Interaction indicator for development */}
          {process.env.NODE_ENV === 'development' && interactionCount > 0 && (
            <span className="text-xs opacity-50">
              Interactions: {interactionCount}
            </span>
          )}
          
          {/* Voice indicator enhancement */}
          {message.metadata?.source === 'voice' && (
            <span className="text-xs opacity-75 flex items-center gap-1" title="Voice message">
              <Mic className="h-3 w-3" />
              Voice
            </span>
          )}
          
          {/* Execution time */}
          {message.metadata?.executionTime && (
            <span className="text-xs opacity-75" title="Execution time">
              ⚡ {(message.metadata.executionTime / 1000).toFixed(2)}s
            </span>
          )}
          
          {/* Agent confidence */}
          {message.metadata?.confidence && (
            <span className="text-xs opacity-75" title="AI confidence">
              🎯 {Math.round(message.metadata.confidence * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
})