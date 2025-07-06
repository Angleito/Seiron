'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { cn } from '@lib/utils'
import { StreamMessage } from './ChatStreamService'
import { useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'
import { safeDebug } from '@lib/logger'
import { Sparkles, Zap, CircleDot } from 'lucide-react'

interface StreamingMessageProps {
  message: StreamMessage
  isStreaming?: boolean
  streamSpeed?: number // Characters per second
  onStreamComplete?: () => void
  sessionId?: string
  showCursor?: boolean
  cursorStyle?: 'kamehameha' | 'ki' | 'pulse' | 'simple'
}

// Cursor component with Dragon Ball inspired animations
const StreamingCursor: React.FC<{ style: string; isActive: boolean }> = ({ style, isActive }) => {
  if (!isActive) return null

  const getCursorContent = () => {
    switch (style) {
      case 'kamehameha':
        return (
          <span className="inline-flex items-center ml-0.5">
            <span className="relative">
              <CircleDot className="h-4 w-4 text-blue-400 animate-pulse" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-2 w-2 bg-blue-500 rounded-full animate-ping" />
              </span>
            </span>
            <span className="absolute -right-4 top-0 text-xs text-blue-400 animate-pulse">気</span>
          </span>
        )
      case 'ki':
        return (
          <span className="inline-flex items-center ml-0.5">
            <Sparkles className="h-3 w-3 text-yellow-400 animate-spin" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-400 rounded-full animate-ping" />
          </span>
        )
      case 'pulse':
        return (
          <span className="inline-flex items-center ml-0.5">
            <Zap className="h-3 w-3 text-red-500 animate-pulse" />
          </span>
        )
      case 'simple':
      default:
        return <span className="inline-block w-0.5 h-4 bg-current animate-blink ml-0.5" />
    }
  }

  return (
    <span className="relative inline-flex items-center">
      {getCursorContent()}
    </span>
  )
}

// Loading state with energy charging effect
const EnergyChargingLoader: React.FC = () => {
  const [chargeLevel, setChargeLevel] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setChargeLevel(prev => (prev + 10) % 100)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="relative h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-full transition-all duration-100"
          style={{ width: `${chargeLevel}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
      <span className="text-xs text-gray-400">充電中... {chargeLevel}%</span>
    </div>
  )
}

export const StreamingMessage = React.memo(function StreamingMessage({
  message,
  isStreaming = false,
  streamSpeed = 30,
  onStreamComplete,
  sessionId,
  showCursor = true,
  cursorStyle = 'kamehameha'
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isStreamingActive, setIsStreamingActive] = useState(false)
  const streamingRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>('')
  
  // Sanitize the full content
  const { sanitized: fullContent } = useSanitizedContent(
    message.content,
    message.type === 'user' ? SANITIZE_CONFIGS.CHAT_MESSAGE : SANITIZE_CONFIGS.TEXT_ONLY
  )

  // Calculate the characters per interval for smooth streaming
  const streamInterval = useMemo(() => {
    return Math.max(16, 1000 / streamSpeed) // Minimum 16ms for 60fps
  }, [streamSpeed])

  const charsPerInterval = useMemo(() => {
    return Math.max(1, Math.floor(streamSpeed * streamInterval / 1000))
  }, [streamSpeed, streamInterval])

  // Handle streaming effect
  useEffect(() => {
    if (!isStreaming || message.type === 'user') {
      // If not streaming or user message, show full content immediately
      setDisplayedContent(fullContent)
      setIsStreamingActive(false)
      return
    }

    // Start streaming if content changed
    if (fullContent !== lastContentRef.current) {
      lastContentRef.current = fullContent
      setIsStreamingActive(true)
      setDisplayedContent('')
      
      let currentIndex = 0

      const streamContent = () => {
        if (currentIndex < fullContent.length) {
          const nextIndex = Math.min(currentIndex + charsPerInterval, fullContent.length)
          setDisplayedContent(fullContent.slice(0, nextIndex))
          currentIndex = nextIndex
          
          streamingRef.current = setTimeout(streamContent, streamInterval)
        } else {
          // Streaming complete
          setIsStreamingActive(false)
          onStreamComplete?.()
          
          safeDebug('Message streaming completed', {
            sessionId,
            messageId: message.id,
            contentLength: fullContent.length,
            streamDuration: (fullContent.length / streamSpeed) * 1000
          })
        }
      }

      // Start streaming
      streamContent()
    }

    return () => {
      if (streamingRef.current) {
        clearTimeout(streamingRef.current)
      }
    }
  }, [fullContent, isStreaming, message.type, message.id, streamSpeed, charsPerInterval, streamInterval, onStreamComplete, sessionId])

  // Handle status indicator
  const getStatusIndicator = useCallback(() => {
    if (message.type !== 'agent' || !message.status) return null

    switch (message.status) {
      case 'pending':
        return <EnergyChargingLoader />
      case 'sending':
        return (
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <CircleDot className="h-3 w-3 animate-pulse" />
            <span>送信中...</span>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <span>✗</span>
            <span>エラー</span>
          </div>
        )
      default:
        return null
    }
  }, [message.type, message.status])

  return (
    <div
      className={cn(
        'flex',
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2 relative group transition-all duration-200',
          message.type === 'user'
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
            : message.type === 'system'
            ? 'bg-gray-800 text-gray-300 italic'
            : 'bg-gray-900 text-red-100',
          isStreamingActive && 'shadow-lg shadow-blue-500/20'
        )}
      >
        {/* Status indicator for loading states */}
        {message.status === 'pending' && message.type === 'agent' && !displayedContent && (
          <div className="mb-2">
            {getStatusIndicator()}
          </div>
        )}

        {/* Message content with streaming effect */}
        <div className="relative">
          <span className="whitespace-pre-wrap">
            {displayedContent}
            {isStreamingActive && showCursor && (
              <StreamingCursor style={cursorStyle} isActive={true} />
            )}
          </span>
          
          {/* Energy aura effect during streaming */}
          {isStreamingActive && (
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-yellow-500/10 rounded-lg blur-sm animate-pulse -z-10" />
          )}
        </div>

        {/* Metadata footer */}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs opacity-75">
            {message.timestamp.toLocaleTimeString()}
          </span>
          
          {/* Voice indicator */}
          {message.metadata?.source === 'voice' && (
            <span className="text-xs opacity-75 flex items-center gap-1">
              <span>🎤</span>
              <span>音声</span>
            </span>
          )}
          
          {/* Agent type indicator with power level */}
          {message.type === 'agent' && message.agentType && (
            <span className="text-xs opacity-75 flex items-center gap-1">
              <span className="text-yellow-400">⚡</span>
              <span>{message.agentType}</span>
              {message.metadata?.confidence && (
                <span className="text-yellow-400">
                  {Math.round(message.metadata.confidence * 9000)}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

// CSS for cursor blink animation
const cursorStyles = `
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.animate-blink {
  animation: blink 1s infinite;
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = cursorStyles
  document.head.appendChild(styleSheet)
}