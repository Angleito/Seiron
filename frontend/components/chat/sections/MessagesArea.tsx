'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { StreamMessage } from '../ChatStreamService'
import { ChatMessage } from '../parts/ChatMessage'
import { TypingIndicator } from '../parts/TypingIndicator'
import { VoiceTranscriptPreview } from '../parts/VoiceTranscriptPreview'
import { safeDebug, safeInfo, logger } from '@lib/logger'

interface TypingIndicatorData {
  agentId: string
  agentType: string
  timestamp: Date
}

interface MessagesAreaProps {
  messages: StreamMessage[]
  typingIndicators: TypingIndicatorData[]
  voiceTranscript: string
  onRetryMessage: (messageId: string) => void
  sessionId?: string
}

export const MessagesArea = React.memo(function MessagesArea({
  messages,
  typingIndicators,
  voiceTranscript,
  onRetryMessage,
  sessionId
}: MessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [renderStartTime] = useState(Date.now())
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [scrollCount, setScrollCount] = useState(0)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  
  // Log component mount and initial state
  useEffect(() => {
    safeDebug('MessagesArea component mounted', {
      sessionId,
      initialMessageCount: messages.length,
      typingIndicatorCount: typingIndicators.length,
      hasVoiceTranscript: !!voiceTranscript
    })
    
    return () => {
      safeDebug('MessagesArea component unmounted', {
        sessionId,
        finalMessageCount: messages.length,
        totalScrollCount: scrollCount
      })
    }
  }, [])
  
  // Track message count changes
  useEffect(() => {
    if (messages.length !== lastMessageCount) {
      const messageAdded = messages.length > lastMessageCount
      const messageRemoved = messages.length < lastMessageCount
      
      safeDebug('Message count changed', {
        sessionId,
        previousCount: lastMessageCount,
        newCount: messages.length,
        messageAdded,
        messageRemoved,
        difference: messages.length - lastMessageCount
      })
      
      setLastMessageCount(messages.length)
    }
  }, [messages.length, lastMessageCount, sessionId])
  
  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const newScrollPosition = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    const distanceFromBottom = scrollHeight - (newScrollPosition + clientHeight)
    const newIsNearBottom = distanceFromBottom < 100 // Within 100px of bottom
    
    setScrollPosition(newScrollPosition)
    setScrollCount(prev => prev + 1)
    
    if (newIsNearBottom !== isNearBottom) {
      setIsNearBottom(newIsNearBottom)
      
      safeDebug('Scroll position changed', {
        sessionId,
        scrollPosition: newScrollPosition,
        scrollHeight,
        clientHeight,
        distanceFromBottom,
        isNearBottom: newIsNearBottom,
        scrollCount: scrollCount + 1
      })
    }
  }, [sessionId, isNearBottom, scrollCount])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isNearBottom) {
      logger.time('MessagesArea-AutoScroll')
      
      safeDebug('Auto-scrolling to bottom', {
        sessionId,
        messageCount: messages.length,
        typingIndicatorCount: typingIndicators.length,
        hasVoiceTranscript: !!voiceTranscript,
        isNearBottom,
        scrollPosition
      })
      
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      
      logger.timeEnd('MessagesArea-AutoScroll')
    } else if (!isNearBottom) {
      safeDebug('Auto-scroll skipped - user not near bottom', {
        sessionId,
        isNearBottom,
        scrollPosition
      })
    }
  }, [messages, typingIndicators, voiceTranscript, isNearBottom, sessionId, scrollPosition])
  
  // Performance monitoring for message rendering
  useEffect(() => {
    if (messages.length > 0) {
      const renderTime = Date.now() - renderStartTime
      
      safeInfo('Messages rendered', {
        sessionId,
        messageCount: messages.length,
        renderTime,
        averageRenderTimePerMessage: renderTime / messages.length,
        typingIndicatorCount: typingIndicators.length
      })
    }
  }, [messages.length, typingIndicators.length, renderStartTime, sessionId])

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {messages.map((message, index) => {
        // Log message render in development
        if (process.env.NODE_ENV === 'development') {
          safeDebug('Rendering message', {
            sessionId,
            messageId: message.id,
            messageIndex: index,
            messageType: message.type,
            status: message.status
          })
        }
        
        return (
          <ChatMessage
            key={message.id}
            message={message}
            onRetry={onRetryMessage}
            sessionId={sessionId}
          />
        )
      })}
      
      {/* Typing Indicators */}
      {typingIndicators.length > 0 && (
        <div>
          {process.env.NODE_ENV === 'development' && (() => {
            safeDebug('Rendering typing indicators', {
              sessionId,
              indicatorCount: typingIndicators.length,
              indicators: typingIndicators.map(i => ({ agentType: i.agentType, timestamp: i.timestamp }))
            })
            return null
          })()}
          <TypingIndicator indicators={typingIndicators} />
        </div>
      )}
      
      {/* Voice transcript preview */}
      {voiceTranscript && (
        <div>
          {process.env.NODE_ENV === 'development' && (() => {
            safeDebug('Rendering voice transcript preview', {
              sessionId,
              transcriptLength: voiceTranscript.length
            })
            return null
          })()}
          <VoiceTranscriptPreview transcript={voiceTranscript} />
        </div>
      )}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
      
      {/* Development scroll indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/50 text-white text-xs p-2 rounded">
          <div>Messages: {messages.length}</div>
          <div>Scroll: {Math.round(scrollPosition)}px</div>
          <div>Near bottom: {isNearBottom ? 'Yes' : 'No'}</div>
          <div>Scroll count: {scrollCount}</div>
        </div>
      )}
    </div>
  )
})