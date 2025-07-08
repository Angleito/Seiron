import { Observable, Subject, BehaviorSubject, of, timer } from 'rxjs'
import { 
  map, 
  catchError, 
  retry, 
  mergeMap,
  shareReplay,
  takeUntil,
  timeout,
  scan
} from 'rxjs/operators'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { AgentMessage, AgentType, UserIntentType } from '../types/agent'
import { logger, safeDebug, safeInfo, safeWarn, safeError } from '@lib/logger'

// Enhanced message types for Vercel streaming
export interface StreamMessage extends AgentMessage {
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed'
  retryCount?: number
}

export interface TypingIndicator {
  agentId: string
  agentType: AgentType
  isTyping: boolean
  timestamp: number
}

export interface ConnectionStatus {
  isConnected: boolean
  lastHeartbeat: number
  reconnectAttempts: number
  error?: string
}

export interface VercelChatConfig {
  apiEndpoint: string
  sessionId: string
  maxRetries?: number
  retryDelay?: number
  messageTimeout?: number
}

export interface OrchestrationResponse {
  success: boolean
  data: {
    response: string
    sessionId: string
    timestamp: string
    model: string
    usage: object
  }
  error?: string
}

// Legacy format for backward compatibility
export interface LegacyOrchestrationResponse {
  message: string
  timestamp: string
  agentType: string
  intentId: string
  executionTime: number
  metadata: {
    intent: string
    action: string
    confidence?: number
    riskLevel?: string
    actionRequired?: boolean
    suggestions?: string[]
  }
}

export class VercelChatService {
  private config: Required<VercelChatConfig>
  private serviceId: string = `vercel_chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  private messageCounter: number = 0
  
  // Stream subjects
  private messageSubject$ = new Subject<StreamMessage>()
  private typingSubject$ = new BehaviorSubject<Map<string, TypingIndicator>>(new Map())
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    isConnected: true, // HTTP is always "connected"
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0
  })
  private destroy$ = new Subject<void>()
  
  // Public observables
  public messages$: Observable<StreamMessage>
  public typingIndicators$: Observable<TypingIndicator[]>
  public connectionStatus: Observable<ConnectionStatus>
  public messageHistory$: Observable<StreamMessage[]>
  
  constructor(config: VercelChatConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      messageTimeout: 30000,
      ...config
    }
    
    // Initialize observables
    this.messages$ = this.messageSubject$.pipe(
      shareReplay(1),
      takeUntil(this.destroy$)
    )
    
    this.typingIndicators$ = this.typingSubject$.pipe(
      map(indicators => Array.from(indicators.values())),
      shareReplay(1),
      takeUntil(this.destroy$)
    )
    
    this.connectionStatus = this.connectionStatus$.pipe(
      shareReplay(1),
      takeUntil(this.destroy$)
    )
    
    // Message history stream - accumulate messages into an array
    this.messageHistory$ = this.messages$.pipe(
      scan((history: StreamMessage[], message: StreamMessage) => {
        // Check if message already exists (update) or is new
        const existingIndex = history.findIndex(m => m.id === message.id)
        if (existingIndex >= 0) {
          // Update existing message
          const updated = [...history]
          updated[existingIndex] = message
          return updated
        } else {
          // Add new message, keep last 100
          return [...history, message].slice(-100)
        }
      }, []),
      shareReplay(1),
      takeUntil(this.destroy$)
    )
    
    safeInfo('VercelChatService initialized', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId,
      apiEndpoint: this.config.apiEndpoint
    })
  }
  
  /**
   * Send message using Vercel orchestrate endpoint
   */
  sendMessage(content: string, metadata?: Record<string, any>): Observable<E.Either<Error, StreamMessage>> {
    const messageId = `msg_${Date.now()}_${++this.messageCounter}`
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // Create user message
    const userMessage: StreamMessage = {
      id: messageId,
      type: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
      metadata: {
        ...metadata,
        requestId,
        source: metadata?.source || 'text'
      }
    }
    
    // Emit user message immediately
    this.messageSubject$.next(userMessage)
    
    safeInfo('Sending message to Vercel API', {
      serviceId: this.serviceId,
      messageId,
      requestId,
      contentLength: content.length,
      sessionId: this.config.sessionId,
      hasMetadata: !!metadata
    })
    
    // Prepare request payload in OpenAI orchestrate format
    const payload = {
      message: content,
      sessionId: this.config.sessionId,
      messages: metadata?.messages || [],
      // Include additional metadata for backward compatibility
      walletAddress: metadata?.walletAddress,
      metadata
    }
    
    return this.makeAPIRequest('/api/chat/orchestrate', payload, requestId).pipe(
      timeout(this.config.messageTimeout),
      retry(this.config.maxRetries),
      map((response: OrchestrationResponse) => {
        // Check if response is successful
        if (!response.success) {
          throw new Error(response.error || 'Orchestration failed')
        }
        
        // Update user message status
        const updatedUserMessage: StreamMessage = {
          ...userMessage,
          status: 'delivered'
        }
        this.messageSubject$.next(updatedUserMessage)
        
        // Create agent response message using OpenAI format
        const agentMessage: StreamMessage = {
          id: `agent_${Date.now()}_${++this.messageCounter}`,
          type: 'agent',
          agentType: 'assistant' as AgentType, // Default to assistant for OpenAI format
          content: response.data.response,
          timestamp: new Date(response.data.timestamp),
          status: 'delivered',
          metadata: {
            model: response.data.model,
            usage: response.data.usage,
            sessionId: response.data.sessionId,
            requestId,
            // Set default values for backward compatibility
            intent: metadata?.intent || 'general' as UserIntentType,
            action: 'chat_response'
          }
        }
        
        // Emit agent response
        this.messageSubject$.next(agentMessage)
        
        safeInfo('Message processed successfully', {
          serviceId: this.serviceId,
          messageId,
          requestId,
          model: response.data.model,
          sessionId: response.data.sessionId,
          usage: response.data.usage
        })
        
        return E.right(agentMessage)
      }),
      catchError((error: Error) => {
        // Update user message with failed status
        const failedUserMessage: StreamMessage = {
          ...userMessage,
          status: 'failed'
        }
        this.messageSubject$.next(failedUserMessage)
        
        safeError('Failed to send message', {
          serviceId: this.serviceId,
          messageId,
          requestId,
          error: error.message,
          sessionId: this.config.sessionId
        })
        
        return of(E.left(error))
      }),
      takeUntil(this.destroy$)
    )
  }
  
  /**
   * Send streaming message using Vercel chat endpoint
   */
  sendStreamingMessage(content: string, metadata?: Record<string, any>): Observable<E.Either<Error, string>> {
    const messageId = `stream_${Date.now()}_${++this.messageCounter}`
    const requestId = `stream_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    safeInfo('Starting streaming message', {
      serviceId: this.serviceId,
      messageId,
      requestId,
      contentLength: content.length
    })
    
    // Create user message
    const userMessage: StreamMessage = {
      id: messageId,
      type: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
      metadata: { ...metadata, requestId }
    }
    
    this.messageSubject$.next(userMessage)
    
    // Prepare request payload in OpenAI orchestrate format
    const payload = {
      message: content,
      sessionId: this.config.sessionId,
      messages: metadata?.messages || [],
      // Include additional metadata for backward compatibility
      walletAddress: metadata?.walletAddress,
      metadata
    }
    
    return this.makeStreamingRequest('/api/chat', payload, requestId).pipe(
      map((chunk: string) => {
        // Handle streaming chunk
        return E.right(chunk)
      }),
      catchError((error: Error) => {
        // Update user message with failed status
        const failedUserMessage: StreamMessage = {
          ...userMessage,
          status: 'failed'
        }
        this.messageSubject$.next(failedUserMessage)
        
        return of(E.left(error))
      }),
      takeUntil(this.destroy$)
    )
  }
  
  /**
   * Make API request to Vercel function
   */
  private makeAPIRequest(endpoint: string, payload: any, requestId: string): Observable<OrchestrationResponse> {
    return new Observable(subscriber => {
      const url = `${this.config.apiEndpoint}${endpoint}`
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Session-ID': this.config.sessionId,
          'X-Service-ID': this.serviceId
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data: OrchestrationResponse) => {
        subscriber.next(data)
        subscriber.complete()
      })
      .catch(error => {
        subscriber.error(error)
      })
    })
  }
  
  /**
   * Make streaming request to Vercel function
   */
  private makeStreamingRequest(endpoint: string, payload: any, requestId: string): Observable<string> {
    return new Observable(subscriber => {
      const url = `${this.config.apiEndpoint}${endpoint}`
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Session-ID': this.config.sessionId,
          'X-Service-ID': this.serviceId
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('Response body is not readable')
        }
        
        const readChunk = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              subscriber.complete()
              return
            }
            
            const chunk = decoder.decode(value, { stream: true })
            subscriber.next(chunk)
            readChunk()
          }).catch(error => {
            subscriber.error(error)
          })
        }
        
        readChunk()
      })
      .catch(error => {
        subscriber.error(error)
      })
    })
  }
  
  /**
   * Simulate typing indicator (since we don't have WebSocket)
   */
  setTypingIndicator(agentType: AgentType, isTyping: boolean): void {
    const indicators = this.typingSubject$.value
    const agentId = `agent_${agentType}`
    
    if (isTyping) {
      indicators.set(agentId, {
        agentId,
        agentType,
        isTyping: true,
        timestamp: Date.now()
      })
    } else {
      indicators.delete(agentId)
    }
    
    this.typingSubject$.next(new Map(indicators))
    
    // Auto-clear typing indicator after 5 seconds
    if (isTyping) {
      timer(5000).subscribe(() => {
        const currentIndicators = this.typingSubject$.value
        currentIndicators.delete(agentId)
        this.typingSubject$.next(new Map(currentIndicators))
      })
    }
  }
  
  /**
   * Clear all messages
   */
  clearMessages(): void {
    safeInfo('Clearing all messages', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId
    })
    
    // Note: In a real implementation, you might want to call a clear endpoint
    // For now, we just clear the local state
  }
  
  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    safeInfo('Destroying VercelChatService', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId
    })
    
    this.destroy$.next()
    this.destroy$.complete()
    this.messageSubject$.complete()
    this.typingSubject$.complete()
    this.connectionStatus$.complete()
  }
  
  /**
   * Get service health status
   */
  getHealthStatus(): Observable<{ healthy: boolean; details: any }> {
    return of({
      healthy: true,
      details: {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        messageCount: this.messageCounter,
        connected: true // HTTP is always "connected"
      }
    })
  }
}