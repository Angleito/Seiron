import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { useRealtimeMessages } from './useRealtimeMessages'
import { useRealtimeSession } from './useRealtimeSession'
import { useRealtimePresence } from './useRealtimePresence'
import { useRealtimePrices } from './useRealtimePrices'
import { useRealtimeConnection } from './useRealtimeConnection'
import { 
  ChatMessage, 
  ChatSession, 
  PresenceState, 
  TypingIndicator, 
  CryptoPrice,
  RealtimeConfig 
} from '@/types/realtime'

export interface UseRealtimeChatOptions {
  sessionId: string
  userId?: string
  userName?: string
  enablePresence?: boolean
  enablePrices?: boolean
  priceSymbols?: string[]
  config?: Partial<RealtimeConfig>
  onMessage?: (message: ChatMessage) => void
  onPresenceChange?: (presence: PresenceState[]) => void
  onTypingChange?: (indicators: TypingIndicator[]) => void
  onPriceUpdate?: (symbol: string, price: CryptoPrice) => void
  onConnectionChange?: (isConnected: boolean) => void
}

export interface UseRealtimeChatResult {
  // Messages
  messages: ChatMessage[]
  sendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>
  updateMessage: (id: string, updates: Partial<ChatMessage>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  clearMessages: () => void
  
  // Session
  session: ChatSession | null
  updateSession: (updates: Partial<ChatSession>) => Promise<void>
  archiveSession: () => Promise<void>
  
  // Presence
  presence: PresenceState[]
  typingIndicators: TypingIndicator[]
  myPresence: PresenceState | null
  setTyping: (isTyping: boolean) => void
  setStatus: (status: 'online' | 'away' | 'offline') => void
  
  // Prices
  prices: Record<string, CryptoPrice>
  getPrice: (symbol: string) => CryptoPrice | null
  subscribeToPrices: (symbols: string[]) => void
  unsubscribeFromPrices: (symbols: string[]) => void
  
  // Connection
  isConnected: boolean
  reconnect: () => void
  disconnect: () => void
  
  // Loading states
  loading: {
    messages: boolean
    session: boolean
    prices: boolean
  }
  
  // Errors
  error: Error | null
}

export function useRealtimeChat(options: UseRealtimeChatOptions): UseRealtimeChatResult {
  const {
    sessionId,
    userId,
    userName,
    enablePresence = true,
    enablePrices = true,
    priceSymbols = ['BTC', 'ETH', 'SEI'],
    config = {},
    onMessage,
    onPresenceChange,
    onTypingChange,
    onPriceUpdate,
    onConnectionChange,
  } = options
  
  const [error, setError] = useState<Error | null>(null)
  
  // Connection management
  const connection = useRealtimeConnection({
    config,
    onConnect: () => {
      logger.info('Real-time chat connected', { sessionId })
      setError(null)
      onConnectionChange?.(true)
    },
    onDisconnect: () => {
      logger.warn('Real-time chat disconnected', { sessionId })
      onConnectionChange?.(false)
    },
    onError: (error) => {
      logger.error('Real-time chat error', { sessionId, error })
      setError(error)
    },
  })
  
  // Messages
  const messages = useRealtimeMessages({
    sessionId,
    userId,
    onMessage: (payload) => {
      const message = payload.new
      onMessage?.(message)
      logger.debug('Chat message received', { 
        sessionId, 
        messageId: message.id,
        role: message.role 
      })
    },
    onMessageUpdate: (payload) => {
      logger.debug('Chat message updated', { 
        sessionId, 
        messageId: payload.new.id,
        status: payload.new.status 
      })
    },
    onMessageDelete: (payload) => {
      logger.debug('Chat message deleted', { 
        sessionId, 
        messageId: payload.old.id 
      })
    },
  })
  
  // Session
  const session = useRealtimeSession({
    sessionId,
    userId,
    onSessionUpdate: (payload) => {
      logger.debug('Chat session updated', { 
        sessionId, 
        status: payload.new.status 
      })
    },
  })
  
  // Presence (optional)
  const presence = useRealtimePresence({
    sessionId,
    userId,
    userName,
    onPresenceChange: (presenceList) => {
      logger.debug('Presence changed', { 
        sessionId, 
        count: presenceList.length 
      })
      onPresenceChange?.(presenceList)
    },
    onTypingChange: (indicators) => {
      logger.debug('Typing indicators changed', { 
        sessionId, 
        count: indicators.length 
      })
      onTypingChange?.(indicators)
    },
  })
  
  // Prices (optional)
  const prices = useRealtimePrices({
    symbols: enablePrices ? priceSymbols : [],
    onPriceUpdate: (payload) => {
      const price = payload.new
      logger.debug('Price updated', { 
        symbol: price.symbol, 
        price: price.price 
      })
      onPriceUpdate?.(price.symbol, price)
    },
  })
  
  // Enhanced send message with context
  const sendMessage = useCallback(async (content: string, metadata: Record<string, any> = {}) => {
    // Add chat context to metadata
    const enhancedMetadata = {
      ...metadata,
      session_id: sessionId,
      user_id: userId,
      timestamp: Date.now(),
      presence_count: presence.presence.length,
      // Add price context if enabled
      ...(enablePrices && Object.keys(prices.prices).length > 0 && {
        price_context: Object.entries(prices.prices).reduce((acc, [symbol, price]) => {
          acc[symbol] = {
            price: price.price,
            change_24h: price.change_24h,
            timestamp: price.last_updated,
          }
          return acc
        }, {} as Record<string, any>)
      }),
    }
    
    try {
      await messages.sendMessage(content, enhancedMetadata)
      
      // Set typing to false after sending
      if (enablePresence) {
        presence.setTyping(false)
      }
      
      logger.info('Message sent via real-time chat', { 
        sessionId, 
        contentLength: content.length 
      })
      
    } catch (error) {
      logger.error('Error sending message via real-time chat', { 
        sessionId, 
        error 
      })
      throw error
    }
  }, [sessionId, userId, messages.sendMessage, presence.presence.length, enablePrices, prices.prices, enablePresence, presence.setTyping])
  
  // Enhanced typing handler
  const setTyping = useCallback((isTyping: boolean) => {
    if (!enablePresence) {
      return
    }
    
    presence.setTyping(isTyping)
    
    logger.debug('Typing status changed', { 
      sessionId, 
      userId, 
      isTyping 
    })
  }, [enablePresence, presence.setTyping, sessionId, userId])
  
  // Handle errors from all hooks
  useEffect(() => {
    const errors = [
      messages.error,
      session.error,
      prices.error,
    ].filter(Boolean)
    
    if (errors.length > 0) {
      const combinedError = new Error(`Real-time chat errors: ${errors.map(e => e?.message).join(', ')}`)
      setError(combinedError)
    }
  }, [messages.error, session.error, prices.error])
  
  // Log real-time chat initialization
  useEffect(() => {
    logger.info('Real-time chat initialized', {
      sessionId,
      userId,
      userName,
      enablePresence,
      enablePrices,
      priceSymbols,
      config,
    })
    
    return () => {
      logger.info('Real-time chat cleanup', { sessionId })
    }
  }, [sessionId, userId, userName, enablePresence, enablePrices, priceSymbols, config])
  
  return {
    // Messages
    messages: messages.messages,
    sendMessage,
    updateMessage: messages.updateMessage,
    deleteMessage: messages.deleteMessage,
    clearMessages: messages.clearMessages,
    
    // Session
    session: session.session,
    updateSession: session.updateSession,
    archiveSession: session.archiveSession,
    
    // Presence
    presence: enablePresence ? presence.presence : [],
    typingIndicators: enablePresence ? presence.typingIndicators : [],
    myPresence: enablePresence ? presence.myPresence : null,
    setTyping,
    setStatus: enablePresence ? presence.setStatus : () => {},
    
    // Prices
    prices: enablePrices ? prices.prices : {},
    getPrice: enablePrices ? prices.getPrice : () => null,
    subscribeToPrices: enablePrices ? prices.subscribe : () => {},
    unsubscribeFromPrices: enablePrices ? prices.unsubscribe : () => {},
    
    // Connection
    isConnected: connection.isConnected,
    reconnect: connection.reconnect,
    disconnect: connection.disconnect,
    
    // Loading states
    loading: {
      messages: messages.loading,
      session: session.loading,
      prices: enablePrices ? prices.loading : false,
    },
    
    // Errors
    error,
  }
}