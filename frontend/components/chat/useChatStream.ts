import { useEffect, useState, useCallback, useRef } from 'react'
import { Subscription } from 'rxjs'
import * as E from 'fp-ts/Either'
import { ChatStreamService, StreamMessage, TypingIndicator, ConnectionStatus } from './ChatStreamService'
import { AdapterAction } from '@/lib/orchestrator-client'
import { logger } from '@/lib/logger'

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
    if (!chatServiceRef.current || !content.trim()) return
    
    setIsLoading(true)
    
    chatServiceRef.current.sendMessage(content, metadata).subscribe({
      next: (result) => {
        if (E.isLeft(result)) {
          logger.error('Failed to send message:', result.left)
          setIsLoading(false)
        }
      },
      error: (error) => {
        logger.error('Error sending message:', error)
        setIsLoading(false)
      }
    })
  }, [])
  
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
    retryFailedMessage
  }
}