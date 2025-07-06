import React, { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRealtimeChat } from '@/hooks/realtime'
import { ChatMessage, PresenceState, TypingIndicator, CryptoPrice } from '@/types/realtime'
import { ChatInput } from './parts/ChatInput'
import { ChatMessage as ChatMessageComponent } from './parts/ChatMessage'
import { TypingIndicator as TypingIndicatorComponent } from './parts/TypingIndicator'
import { MessagesArea } from './sections/MessagesArea'
import { RealtimeConnectionStatus } from './parts/RealtimeConnectionStatus'
import { RealtimePresenceIndicator } from './parts/RealtimePresenceIndicator'
import { RealtimePriceDisplay } from './parts/RealtimePriceDisplay'
import { ChatStatusBar } from './parts/ChatStatusBar'

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
  const inputRef = useRef<HTMLInputElement>(null)
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
      
      // Focus input for next message
      inputRef.current?.focus()
      
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
          messages={realtimeChat.messages}
          loading={realtimeChat.loading.messages}
          error={realtimeChat.error}
          onRetryMessage={handleRetryMessage}
          onDeleteMessage={handleDeleteMessage}
          className="h-full"
        />
        
        {/* Typing Indicators */}
        {enablePresence && realtimeChat.typingIndicators.length > 0 && (
          <div className="px-4 py-2">
            <TypingIndicatorComponent
              indicators={realtimeChat.typingIndicators}
              className="text-sm text-gray-500"
            />
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Status Bar */}
      <ChatStatusBar
        session={realtimeChat.session}
        loading={realtimeChat.loading}
        messageCount={realtimeChat.messages.length}
        presenceCount={realtimeChat.presence.length}
        isTyping={isTyping}
        onClearMessages={handleClearMessages}
        onTogglePresence={() => setShowPresence(!showPresence)}
        onTogglePrices={() => setShowPrices(!showPrices)}
        className="shrink-0"
      />
      
      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
        <ChatInput
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          placeholder="Type a message..."
          disabled={!realtimeChat.isConnected || realtimeChat.loading.messages}
          enableVoice={enableVoice}
          className="w-full"
        />
      </div>
    </div>
  )
}