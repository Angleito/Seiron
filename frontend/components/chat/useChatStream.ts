import { useEffect, useState, useCallback, useRef } from 'react'
import { Subscription } from 'rxjs'
import * as E from 'fp-ts/Either'
import { ChatStreamService, StreamMessage, TypingIndicator, ConnectionStatus } from './ChatStreamService'
import { AdapterAction } from '@lib/orchestrator-client'
import { logger, safeDebug, safeInfo, safeWarn, safeError } from '@lib/logger'

export interface UseChatStreamOptions {
  apiEndpoint?: string
  wsEndpoint?: string
  sessionId: string
  maxRetries?: number
  retryDelay?: number
  heartbeatInterval?: number
  messageTimeout?: number
  bufferSize?: number
  throttleTime?: number
  onMessage?: (message: StreamMessage) => void
  onTypingChange?: (indicators: TypingIndicator[]) => void
  onConnectionChange?: (status: ConnectionStatus) => void
}

export interface UseChatStreamResult {
  messages: StreamMessage[]
  typingIndicators: TypingIndicator[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  sendMessage: (content: string, metadata?: Record<string, any>) => void
  sendAdapterAction: (action: AdapterAction) => void
  sendVoiceMessage: (transcript: string, metadata?: Record<string, any>) => void
  clearMessages: () => void
  retryFailedMessage: (messageId: string) => void
}

export function useChatStream(options: UseChatStreamOptions): UseChatStreamResult {
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const chatServiceRef = useRef<ChatStreamService | null>(null)
  const subscriptionsRef = useRef<Subscription[]>([])
  const mountTimeRef = useRef<number>(Date.now())
  const [performanceMetrics, setPerformanceMetrics] = useState({
    messagesSent: 0,
    messagesReceived: 0,
    adapterActionsSent: 0,
    connectionErrors: 0,
    averageResponseTime: 0,
    totalResponseTime: 0
  })
  
  // Log hook initialization
  useEffect(() => {
    mountTimeRef.current = Date.now()
    safeInfo('useChatStream hook initialized', {
      sessionId: options.sessionId,
      apiEndpoint: options.apiEndpoint,
      wsEndpoint: options.wsEndpoint,
      mountTime: mountTimeRef.current
    })
    
    return () => {
      const sessionDuration = Date.now() - mountTimeRef.current
      safeInfo('useChatStream hook cleanup', {
        sessionId: options.sessionId,
        sessionDuration,
        performanceMetrics
      })
    }
  }, [])

  // Initialize chat service
  useEffect(() => {
    const service = new ChatStreamService({
      apiEndpoint: options.apiEndpoint || import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: options.wsEndpoint || import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:3001',
      sessionId: options.sessionId,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageTimeout: options.messageTimeout || 30000,
      bufferSize: options.bufferSize || 100,
      throttleTime: options.throttleTime || 100
    })
    
    chatServiceRef.current = service
    
    // Subscribe to streams
    const subs: Subscription[] = []
    
    // Message stream
    subs.push(
      service.messages$.subscribe(message => {
        setMessages(prev => {
          const existing = prev.findIndex(m => m.id === message.id)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = message
            return updated
          }
          return [...prev, message]
        })
        
        // Call optional callback
        options.onMessage?.(message)
        
        // Update loading state based on message status
        if (message.type === 'user') {
          if (message.status === 'sending') {
            setIsLoading(true)
          } else if (message.status === 'delivered' || message.status === 'failed') {
            setIsLoading(false)
          }
        }
      })
    )
    
    // Typing indicators
    subs.push(
      service.typingIndicators$.subscribe(indicators => {
        setTypingIndicators(indicators)
        options.onTypingChange?.(indicators)
      })
    )
    
    // Connection status
    subs.push(
      service.connectionStatus.subscribe(status => {
        setConnectionStatus(status)
        options.onConnectionChange?.(status)
      })
    )
    
    // Message history
    subs.push(
      service.messageHistory$.subscribe(history => {
        setMessages(history)
      })
    )
    
    subscriptionsRef.current = subs
    
    return () => {
      // Cleanup subscriptions
      subs.forEach(sub => sub.unsubscribe())
      
      // Destroy service
      service.destroy()
    }
  }, [options.sessionId]) // Only reinitialize if session changes
  
  // Send message
  const sendMessage = useCallback((content: string, metadata?: Record<string, any>) => {
    if (!chatServiceRef.current || !content.trim()) {
      safeWarn('Send message blocked', {
        sessionId: options.sessionId,
        reason: !chatServiceRef.current ? 'no service' : 'empty content',
        contentLength: content.length
      })
      return
    }
    
    const sendStartTime = Date.now()
    
    safeInfo('Sending message via hook', {
      sessionId: options.sessionId,
      contentLength: content.length,
      hasMetadata: !!metadata,
      performanceMetrics
    })
    
    setIsLoading(true)
    
    // Update performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + 1
    }))
    
    chatServiceRef.current.sendMessage(content, metadata).subscribe({
      next: (result) => {
        const sendDuration = Date.now() - sendStartTime
        
        if (E.isLeft(result)) {
          safeError('Failed to send message via hook', {
            sessionId: options.sessionId,
            error: result.left,
            sendDuration,
            contentLength: content.length
          })
          setIsLoading(false)
          
          setPerformanceMetrics(prev => ({
            ...prev,
            connectionErrors: prev.connectionErrors + 1
          }))
        } else {
          safeDebug('Message sent successfully via hook', {
            sessionId: options.sessionId,
            messageId: result.right.id,
            sendDuration,
            contentLength: content.length
          })
        }
      },
      error: (error) => {
        const sendDuration = Date.now() - sendStartTime
        
        safeError('Error sending message via hook', {
          sessionId: options.sessionId,
          error,
          sendDuration,
          contentLength: content.length
        })
        
        setIsLoading(false)
        
        setPerformanceMetrics(prev => ({
          ...prev,
          connectionErrors: prev.connectionErrors + 1
        }))
      }
    })
  }, [options.sessionId, performanceMetrics])
  
  // Send adapter action
  const sendAdapterAction = useCallback((action: AdapterAction) => {
    if (!chatServiceRef.current) return
    
    setIsLoading(true)
    
    chatServiceRef.current.sendAdapterAction(action).subscribe({
      next: (result) => {
        if (E.isLeft(result)) {
          logger.error('Failed to send adapter action:', result.left)
          setIsLoading(false)
        }
      },
      error: (error) => {
        logger.error('Error sending adapter action:', error)
        setIsLoading(false)
      }
    })
  }, [])
  
  // Send voice message with special metadata
  const sendVoiceMessage = useCallback((transcript: string, metadata?: Record<string, any>) => {
    if (!chatServiceRef.current || !transcript.trim()) return
    
    const voiceMetadata = {
      ...metadata,
      source: 'voice',
      timestamp: Date.now()
    }
    
    sendMessage(transcript, voiceMetadata)
  }, [sendMessage])
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])
  
  // Retry failed message
  const retryFailedMessage = useCallback((messageId: string) => {
    const failedMessage = messages.find(m => m.id === messageId && m.status === 'failed')
    if (!failedMessage || !chatServiceRef.current) return
    
    // Resend the message
    sendMessage(failedMessage.content, failedMessage.metadata)
  }, [messages, sendMessage])
  
  return {
    messages,
    typingIndicators,
    connectionStatus,
    isLoading,
    sendMessage,
    sendAdapterAction,
    sendVoiceMessage,
    clearMessages,
    retryFailedMessage,
    // Performance metrics for debugging
    ...(process.env.NODE_ENV === 'development' && {
      performanceMetrics,
      sessionDuration: Date.now() - mountTimeRef.current
    })
  }
}