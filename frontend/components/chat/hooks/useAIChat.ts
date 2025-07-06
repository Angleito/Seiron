import { useChat, type UseChatOptions, type Message } from 'ai/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { BehaviorSubject, Subject, Subscription } from 'rxjs'
import { map, distinctUntilChanged, takeUntil, debounceTime } from 'rxjs/operators'
import { openai } from '@ai-sdk/openai'
import { StreamMessage, TypingIndicator } from '@lib/vercel-chat-service'
import { safeDebug, safeInfo, safeWarn, safeError } from '@lib/logger'
import { AgentType, UserIntentType } from '@/types/agent'

// Error types for fp-ts error handling
export interface AIError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMIT' | 'UNKNOWN'
  message: string
  originalError?: unknown
  code?: string
}

// Enhanced message type that extends AI SDK message with our metadata
export interface EnhancedMessage extends Message {
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed'
  agentType?: AgentType
  metadata?: {
    intent?: UserIntentType
    confidence?: number
    source?: string
    requestId?: string
    executionTime?: number
    [key: string]: any
  }
}

// Hook options extending Vercel's options
export interface UseAIChatOptions extends Omit<UseChatOptions, 'api'> {
  sessionId: string
  apiEndpoint?: string
  enableStreaming?: boolean
  maxRetries?: number
  onTypingChange?: (isTyping: boolean) => void
  onStreamingToken?: (token: string) => void
  voiceEnabled?: boolean
}

// Hook result interface
export interface UseAIChatResult {
  messages: EnhancedMessage[]
  input: string
  isLoading: boolean
  error: O.Option<AIError>
  
  // Core functions
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void
  sendMessage: (content: string, metadata?: Record<string, any>) => TE.TaskEither<AIError, void>
  sendVoiceMessage: (transcript: string, metadata?: Record<string, any>) => TE.TaskEither<AIError, void>
  
  // Utility functions
  reload: () => void
  stop: () => void
  clear: () => void
  setInput: (input: string) => void
  
  // Stream helpers
  isStreaming: boolean
  streamingMessage: O.Option<string>
  
  // Performance metrics
  metrics: {
    messagesSent: number
    messagesReceived: number
    averageResponseTime: number
    errors: number
  }
}

/**
 * Custom hook that wraps Vercel's useChat with fp-ts error handling,
 * RxJS observables, and integration with existing VercelChatService patterns
 */
export function useAIChat(options: UseAIChatOptions): UseAIChatResult {
  const {
    sessionId,
    apiEndpoint = '/api/chat',
    enableStreaming = true,
    maxRetries = 3,
    onTypingChange,
    onStreamingToken,
    voiceEnabled = false,
    ...vercelOptions
  } = options

  // Initialize Vercel's useChat hook
  const {
    messages: rawMessages,
    input,
    isLoading: vercelIsLoading,
    error: vercelError,
    handleInputChange,
    handleSubmit: vercelHandleSubmit,
    reload,
    stop,
    setMessages,
    setInput,
    append
  } = useChat({
    ...vercelOptions,
    api: apiEndpoint,
    streamProtocol: 'text',
    onResponse: (response) => {
      safeDebug('AI Chat response received', {
        sessionId,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
      vercelOptions.onResponse?.(response)
    },
    onFinish: (message, options) => {
      safeInfo('AI Chat message finished', {
        sessionId,
        messageId: message.id,
        role: message.role,
        contentLength: message.content.length
      })
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        averageResponseTime: calculateAverageResponseTime(prev)
      }))
      
      vercelOptions.onFinish?.(message, options)
    },
    onError: (error) => {
      safeError('AI Chat error', {
        sessionId,
        error: error.message,
        stack: error.stack
      })
      
      setError(O.some({
        type: 'API_ERROR',
        message: error.message,
        originalError: error
      }))
      
      setMetrics(prev => ({
        ...prev,
        errors: prev.errors + 1
      }))
      
      vercelOptions.onError?.(error)
    }
  })

  // Local state management
  const [error, setError] = useState<O.Option<AIError>>(O.none)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<O.Option<string>>(O.none)
  const [metrics, setMetrics] = useState({
    messagesSent: 0,
    messagesReceived: 0,
    averageResponseTime: 0,
    errors: 0
  })

  // RxJS subjects for reactive state management
  const destroy$ = useRef(new Subject<void>())
  const typingState$ = useRef(new BehaviorSubject<boolean>(false))
  const messageStream$ = useRef(new Subject<string>())

  // Response time tracking
  const responseStartTime = useRef<number | null>(null)
  const responseTimes = useRef<number[]>([])

  // Initialize RxJS subscriptions
  useEffect(() => {
    const subscriptions: Subscription[] = []

    // Typing indicator management
    if (onTypingChange) {
      subscriptions.push(
        typingState$.current.pipe(
          distinctUntilChanged(),
          takeUntil(destroy$.current)
        ).subscribe(isTyping => {
          onTypingChange(isTyping)
        })
      )
    }

    // Streaming token handler
    if (onStreamingToken && enableStreaming) {
      subscriptions.push(
        messageStream$.current.pipe(
          debounceTime(50), // Batch tokens for performance
          takeUntil(destroy$.current)
        ).subscribe(token => {
          onStreamingToken(token)
        })
      )
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
      destroy$.current.next()
      destroy$.current.complete()
    }
  }, [onTypingChange, onStreamingToken, enableStreaming])

  // Convert Vercel error to fp-ts Either
  useEffect(() => {
    if (vercelError) {
      setError(O.some({
        type: 'API_ERROR',
        message: vercelError.message,
        originalError: vercelError
      }))
    } else {
      setError(O.none)
    }
  }, [vercelError])

  // Track streaming state
  useEffect(() => {
    setIsStreaming(vercelIsLoading)
    typingState$.current.next(vercelIsLoading)

    if (vercelIsLoading) {
      responseStartTime.current = Date.now()
    } else if (responseStartTime.current) {
      const responseTime = Date.now() - responseStartTime.current
      responseTimes.current.push(responseTime)
      responseStartTime.current = null
    }
  }, [vercelIsLoading])

  // Calculate average response time
  const calculateAverageResponseTime = useCallback((currentMetrics: typeof metrics) => {
    if (responseTimes.current.length === 0) return 0
    const sum = responseTimes.current.reduce((a, b) => a + b, 0)
    return Math.round(sum / responseTimes.current.length)
  }, [])

  // Enhanced message transformation
  const enhancedMessages: EnhancedMessage[] = rawMessages.map(msg => ({
    ...msg,
    status: 'delivered' as const,
    metadata: {
      source: voiceEnabled ? 'voice' : 'text',
      sessionId
    }
  }))

  // Send message with fp-ts error handling
  const sendMessage = useCallback((content: string, metadata?: Record<string, any>): TE.TaskEither<AIError, void> => {
    return pipe(
      TE.tryCatch(
        async () => {
          if (!content.trim()) {
            throw new Error('Message content cannot be empty')
          }

          safeInfo('Sending AI chat message', {
            sessionId,
            contentLength: content.length,
            hasMetadata: !!metadata
          })

          setMetrics(prev => ({
            ...prev,
            messagesSent: prev.messagesSent + 1
          }))

          // Create message with metadata
          const message: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'user',
            content,
            createdAt: new Date()
          }

          // Use Vercel's append function
          await append(message)
        },
        (error): AIError => ({
          type: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          originalError: error
        })
      )
    )
  }, [sessionId, append])

  // Send voice message with special handling
  const sendVoiceMessage = useCallback((transcript: string, metadata?: Record<string, any>): TE.TaskEither<AIError, void> => {
    const voiceMetadata = {
      ...metadata,
      source: 'voice',
      timestamp: Date.now(),
      sessionId
    }

    safeDebug('Sending voice message', {
      sessionId,
      transcriptLength: transcript.length,
      metadata: voiceMetadata
    })

    return sendMessage(transcript, voiceMetadata)
  }, [sessionId, sendMessage])

  // Enhanced submit handler
  const handleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    
    if (!input.trim()) {
      safeWarn('Submit blocked: empty input', { sessionId })
      return
    }

    // Track submission
    const submissionTime = Date.now()
    
    // Use Vercel's submit handler
    vercelHandleSubmit(e)
    
    safeInfo('Form submitted', {
      sessionId,
      inputLength: input.length,
      submissionTime
    })
  }, [input, sessionId, vercelHandleSubmit])

  // Clear messages and reset state
  const clear = useCallback(() => {
    setMessages([])
    setError(O.none)
    setStreamingMessage(O.none)
    responseTimes.current = []
    
    safeInfo('Chat cleared', { sessionId })
  }, [sessionId, setMessages])

  return {
    messages: enhancedMessages,
    input,
    isLoading: vercelIsLoading,
    error,
    
    // Core functions
    handleInputChange,
    handleSubmit,
    sendMessage,
    sendVoiceMessage,
    
    // Utility functions
    reload,
    stop,
    clear,
    setInput,
    
    // Stream helpers
    isStreaming,
    streamingMessage,
    
    // Performance metrics
    metrics
  }
}

// Export helper types
export type { Message, EnhancedMessage, AIError }