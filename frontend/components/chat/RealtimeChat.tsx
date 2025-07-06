import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { logger } from '@/lib/logger'
import { useRealtimeChat } from '@/hooks/realtime'
import { ChatMessage, PresenceState, TypingIndicator, CryptoPrice } from '@/types/realtime'
import { StreamMessage } from './ChatStreamService'
import { AgentType } from '@/types/agent'
import { ChatInput } from './parts/ChatInput'
import { ChatMessage as ChatMessageComponent } from './parts/ChatMessage'
import { TypingIndicator as TypingIndicatorComponent } from './parts/TypingIndicator'
import { MessagesArea } from './sections/MessagesArea'
import { RealtimeConnectionStatus } from './parts/RealtimeConnectionStatus'
import { RealtimePresenceIndicator } from './parts/RealtimePresenceIndicator'
import { RealtimePriceDisplay } from './parts/RealtimePriceDisplay'
import { ChatStatusBar } from './parts/ChatStatusBar'

// Convert realtime ChatMessage to StreamMessage
function realtimeChatMessageToStreamMessage(msg: ChatMessage): StreamMessage {
  return {
    id: msg.id,
    type: msg.role === 'assistant' ? 'agent' : msg.role as 'user' | 'system',
    content: msg.content,
    timestamp: new Date(msg.created_at),
    status: msg.status === 'error' ? 'failed' : msg.status,
    agentType: msg.role === 'assistant' ? (msg.metadata?.agentType as AgentType || 'planning_agent') : undefined,
    metadata: msg.metadata
  }
}

export interface RealtimeChatProps {
  sessionId: string
  userId?: string
  userName?: string
  enableVoice?: boolean
  enablePresence?: boolean
  enablePrices?: boolean
  priceSymbols?: string[]
  className?: string
  onMessage?: (message: ChatMessage) => void
  onPresenceChange?: (presence: PresenceState[]) => void
  onTypingChange?: (indicators: TypingIndicator[]) => void
  onPriceUpdate?: (symbol: string, price: CryptoPrice) => void
  onConnectionChange?: (isConnected: boolean) => void
}

export function RealtimeChat({
  sessionId,
  userId,
  userName,
  enableVoice = false,
  enablePresence = true,
  enablePrices = true,
  priceSymbols = ['BTC', 'ETH', 'SEI'],
  className = '',
  onMessage,
  onPresenceChange,
  onTypingChange,
  onPriceUpdate,
  onConnectionChange,
}: RealtimeChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showPrices, setShowPrices] = useState(enablePrices)
  const [showPresence, setShowPresence] = useState(enablePresence)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Real-time chat hook
  const realtimeChat = useRealtimeChat({
    sessionId,
    userId,
    userName,
    enablePresence,
    enablePrices,
    priceSymbols,
    onMessage,
    onPresenceChange,
    onTypingChange,
    onPriceUpdate,
    onConnectionChange,
  })
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])
  
  useEffect(() => {
    scrollToBottom()
  }, [realtimeChat.messages.length, scrollToBottom])
  
  // Handle input change with typing indicators
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    
    // Manage typing indicators
    if (enablePresence) {
      const wasTyping = isTyping
      const nowTyping = value.length > 0
      
      if (nowTyping !== wasTyping) {
        setIsTyping(nowTyping)
        realtimeChat.setTyping(nowTyping)
      }
      
      // Clear typing after a delay
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      if (nowTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
          realtimeChat.setTyping(false)
        }, 3000)
      }
    }
  }, [enablePresence, isTyping, realtimeChat.setTyping])
  
  // Handle message send
  const handleSendMessage = useCallback(async (content: string, metadata?: Record<string, any>) => {
    try {
      await realtimeChat.sendMessage(content, metadata)
      
      // Clear input and typing state
      setInputValue('')
      setIsTyping(false)
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      
      // Clear input is handled above, focus would need a ref if required
      
      logger.info('Message sent via realtime chat', { 
        sessionId, 
        contentLength: content.length 
      })
      
    } catch (error) {
      logger.error('Error sending message via realtime chat', { 
        sessionId, 
        error 
      })
      throw error
    }
  }, [realtimeChat.sendMessage, sessionId])
  
  // Handle retry failed message
  const handleRetryMessage = useCallback(async (messageId: string) => {
    const failedMessage = realtimeChat.messages.find(m => m.id === messageId && m.status === 'failed')
    if (!failedMessage) {
      return
    }
    
    try {
      await realtimeChat.sendMessage(failedMessage.content, failedMessage.metadata)
      logger.info('Message retried successfully', { sessionId, messageId })
    } catch (error) {
      logger.error('Error retrying message', { sessionId, messageId, error })
    }
  }, [realtimeChat.messages, realtimeChat.sendMessage, sessionId])
  
  // Handle delete message
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await realtimeChat.deleteMessage(messageId)
      logger.info('Message deleted successfully', { sessionId, messageId })
    } catch (error) {
      logger.error('Error deleting message', { sessionId, messageId, error })
    }
  }, [realtimeChat.deleteMessage, sessionId])
  
  // Handle clear messages
  const handleClearMessages = useCallback(() => {
    realtimeChat.clearMessages()
    logger.info('Messages cleared', { sessionId })
  }, [realtimeChat.clearMessages, sessionId])
  
  // Handle presence status change
  const handlePresenceStatusChange = useCallback((status: 'online' | 'away' | 'offline') => {
    realtimeChat.setStatus(status)
    logger.debug('Presence status changed', { sessionId, status })
  }, [realtimeChat.setStatus, sessionId])
  
  // Handle price subscription changes
  const handlePriceSubscriptionChange = useCallback((symbols: string[], subscribe: boolean) => {
    if (subscribe) {
      realtimeChat.subscribeToPrices(symbols)
    } else {
      realtimeChat.unsubscribeFromPrices(symbols)
    }
    logger.debug('Price subscription changed', { sessionId, symbols, subscribe })
  }, [realtimeChat.subscribeToPrices, realtimeChat.unsubscribeFromPrices, sessionId])
  
  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])
  
  // Log component initialization
  useEffect(() => {
    logger.info('RealtimeChat component initialized', {
      sessionId,
      userId,
      userName,
      enableVoice,
      enablePresence,
      enablePrices,
      priceSymbols,
    })
  }, [sessionId, userId, userName, enableVoice, enablePresence, enablePrices, priceSymbols])
  
  return (
    <div className={`realtime-chat flex flex-col h-full ${className}`}>
      {/* Connection Status */}
      <RealtimeConnectionStatus
        isConnected={realtimeChat.isConnected}
        error={realtimeChat.error}
        onReconnect={realtimeChat.reconnect}
        onDisconnect={realtimeChat.disconnect}
        className="shrink-0"
      />
      
      {/* Presence Indicator */}
      {enablePresence && showPresence && (
        <RealtimePresenceIndicator
          presence={realtimeChat.presence}
          myPresence={realtimeChat.myPresence}
          onStatusChange={handlePresenceStatusChange}
          className="shrink-0"
        />
      )}
      
      {/* Price Display */}
      {enablePrices && showPrices && (
        <RealtimePriceDisplay
          prices={realtimeChat.prices}
          symbols={priceSymbols}
          onSubscriptionChange={handlePriceSubscriptionChange}
          className="shrink-0"
        />
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessagesArea
          messages={useMemo(() => realtimeChat.messages.map(realtimeChatMessageToStreamMessage), [realtimeChat.messages])}
          typingIndicators={realtimeChat.typingIndicators.map(ind => ({
            agentId: ind.user_id,
            agentType: 'planning_agent',
            timestamp: new Date(ind.started_at)
          }))}
          voiceTranscript=""
          onRetryMessage={handleRetryMessage}
          sessionId={sessionId}
        />
        
        {/* Typing Indicators */}
        {enablePresence && realtimeChat.typingIndicators.length > 0 && (
          <div className="px-4 py-2">
            <TypingIndicatorComponent
              indicators={realtimeChat.typingIndicators.map(ind => ({
                agentId: ind.user_id,
                agentType: 'planning_agent',
                timestamp: new Date(ind.started_at)
              }))}
            />
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Status Bar */}
      <div className="shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{realtimeChat.messages.length} messages</span>
          {enablePresence && <span>{realtimeChat.presence.length} users online</span>}
          {isTyping && <span className="text-yellow-600">Someone is typing...</span>}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearMessages}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
        <ChatInput
          input={inputValue}
          onInputChange={handleInputChange}
          onSend={() => { handleSendMessage(inputValue) }}
          isLoading={realtimeChat.loading.messages}
          disabled={!realtimeChat.isConnected}
          placeholder="Type a message..."
          sessionId={sessionId}
        />
      </div>
    </div>
  )
}