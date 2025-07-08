import { Observable, Subject, BehaviorSubject, merge, of, timer, EMPTY } from 'rxjs'
import { 
  map, 
  catchError, 
  retry, 
  distinctUntilChanged, 
  mergeMap,
  concatMap,
  scan,
  shareReplay,
  startWith,
  takeUntil,
  delay,
  timeout,
  bufferTime
} from 'rxjs/operators'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import * as Ord from 'fp-ts/Ord'
import * as N from 'fp-ts/number'
import { pipe } from 'fp-ts/function'
import { AgentMessage, AgentStreamEvent, AgentType } from '../../types/agent'
import { getOrchestrator, AdapterAction } from '@lib/orchestrator-client'
import { logger, safeDebug, safeInfo, time, logRequest, logResponse, timeEnd } from '@lib/logger'

// Enhanced message types for streaming
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

export interface MessageQueueItem {
  message: StreamMessage
  priority: 'high' | 'normal' | 'low'
  timestamp: number
}

export interface ConnectionStatus {
  isConnected: boolean
  lastHeartbeat: number
  reconnectAttempts: number
  error?: string
}

export interface ChatStreamConfig {
  apiEndpoint: string
  wsEndpoint: string
  sessionId: string
  maxRetries?: number
  retryDelay?: number
  heartbeatInterval?: number
  messageTimeout?: number
  bufferSize?: number
  throttleTime?: number
}

export class ChatStreamService {
  private config: Required<ChatStreamConfig>
  private ws: WebSocket | null = null
  private serviceId: string = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  private messageCounter: number = 0
  
  // Stream subjects
  private messageSubject$ = new Subject<StreamMessage>()
  private typingSubject$ = new BehaviorSubject<Map<string, TypingIndicator>>(new Map())
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0
  })
  private messageQueue$ = new Subject<MessageQueueItem>()
  private destroy$ = new Subject<void>()
  
  // Public observables
  public messages$: Observable<StreamMessage>
  public typingIndicators$: Observable<TypingIndicator[]>
  public connectionStatus: Observable<ConnectionStatus>
  public messageHistory$: Observable<StreamMessage[]>
  
  constructor(config: ChatStreamConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      heartbeatInterval: 30000,
      messageTimeout: 30000,
      bufferSize: 100,
      throttleTime: 100,
      ...config
    }
    
    // Log service initialization
    safeInfo('ChatStreamService initialized', {
      sessionId: this.config.sessionId,
      apiEndpoint: this.config.apiEndpoint,
      wsEndpoint: this.config.wsEndpoint,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      heartbeatInterval: this.config.heartbeatInterval,
      messageTimeout: this.config.messageTimeout,
      bufferSize: this.config.bufferSize,
      throttleTime: this.config.throttleTime
    })
    
    logger.info('ChatStreamService initialized', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId,
      config: {
        apiEndpoint: this.config.apiEndpoint,
        wsEndpoint: this.config.wsEndpoint,
        maxRetries: this.config.maxRetries,
        heartbeatInterval: this.config.heartbeatInterval,
        bufferSize: this.config.bufferSize
      }
    })
    
    // Initialize observables
    logger.time('ChatStreamService-Setup')
    safeDebug('Setting up message streams', { sessionId: this.config.sessionId })
    
    this.messages$ = this.setupMessageStream()
    this.typingIndicators$ = this.setupTypingStream()
    this.connectionStatus = this.connectionStatus$.asObservable()
    this.messageHistory$ = this.setupMessageHistory()
    
    // Start services
    this.initializeWebSocket()
    this.startHeartbeat()
    this.processMessageQueue()
    
    logger.timeEnd('ChatStreamService-Setup')
    safeDebug('ChatStreamService setup completed', { sessionId: this.config.sessionId })
  }
  
  // ============================================================================
  // Stream Setup Methods
  // ============================================================================
  
  private setupMessageStream(): Observable<StreamMessage> {
    return this.messageSubject$.pipe(
      // Add timestamp if not present using Option
      map(msg => ({
        ...msg,
        timestamp: pipe(
          O.fromNullable(msg.timestamp),
          O.getOrElse(() => new Date())
        )
      })),
      
      // Add retry logic for failed messages
      mergeMap(msg => 
        msg.status === 'failed' && (msg.retryCount || 0) < this.config.maxRetries
          ? of(msg).pipe(
              delay(this.config.retryDelay * Math.pow(2, msg.retryCount || 0)),
              map(m => ({ ...m, retryCount: (m.retryCount || 0) + 1 }))
            )
          : of(msg)
      ),
      
      // Share the stream
      shareReplay({ bufferSize: this.config.bufferSize, refCount: true }),
      
      // Complete on destroy
      takeUntil(this.destroy$)
    )
  }
  
  private setupTypingStream(): Observable<TypingIndicator[]> {
    return this.typingSubject$.pipe(
      map(typingMap => Array.from(typingMap.values())),
      
      // Remove stale typing indicators
      map(indicators => 
        indicators.filter(ind => 
          ind.isTyping && (Date.now() - ind.timestamp) < 5000
        )
      ),
      
      distinctUntilChanged((a, b) => 
        JSON.stringify(a) === JSON.stringify(b)
      ),
      
      shareReplay(1),
      takeUntil(this.destroy$)
    )
  }
  
  private setupMessageHistory(): Observable<StreamMessage[]> {
    return this.messages$.pipe(
      scan((history, msg) => {
        return pipe(
          history,
          // Find existing message index
          A.findIndex(m => m.id === msg.id),
          O.fold(
            // Message not found, add new message
            () => pipe(
              history,
              A.append(msg),
              // Keep only last N messages
              A.takeRight(this.config.bufferSize)
            ),
            // Message found, update existing
            (index) => pipe(
              history,
              A.updateAt(index, msg),
              O.getOrElse(() => [...history, msg]),
              // Keep only last N messages
              A.takeRight(this.config.bufferSize)
            )
          )
        )
      }, [] as StreamMessage[]),
      
      startWith([]),
      shareReplay(1),
      takeUntil(this.destroy$)
    )
  }
  
  // ============================================================================
  // WebSocket Management
  // ============================================================================
  
  private initializeWebSocket(): void {
    logger.debug('Initializing WebSocket connection', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId,
      wsEndpoint: this.config.wsEndpoint
    })
    
    const orchestrator = getOrchestrator({
      apiEndpoint: this.config.apiEndpoint,
      wsEndpoint: this.config.wsEndpoint
    })
    
    // Connect WebSocket
    orchestrator.connectWebSocket(this.config.sessionId)
      .then(() => {
        logger.info('WebSocket connected successfully through orchestrator', {
          serviceId: this.serviceId,
          sessionId: this.config.sessionId
        })
        
        this.updateConnectionStatus({
          isConnected: true,
          lastHeartbeat: Date.now(),
          reconnectAttempts: 0
        })
      })
      .catch(error => {
        logger.error('Failed to connect WebSocket through orchestrator', {
          serviceId: this.serviceId,
          sessionId: this.config.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        this.updateConnectionStatus({
          isConnected: false,
          error: error instanceof Error ? error.message : 'Connection failed',
          reconnectAttempts: 1
        })
      })
    
    // Subscribe to orchestrator events
    this.subscribeToOrchestratorEvents(orchestrator)
  }
  
  private subscribeToOrchestratorEvents(orchestrator: any): void {
    logger.debug('Subscribing to orchestrator events', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId
    })
    
    // Subscribe to status events
    orchestrator.on('status', (event: AgentStreamEvent) => {
      logger.debug('Received status event', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        eventType: event.type,
        agentId: event.agentId,
        agentType: event.agentType,
        timestamp: event.timestamp
      })
      this.handleAgentEvent(event)
    })
    
    // Subscribe to progress events
    orchestrator.on('progress', (event: AgentStreamEvent) => {
      logger.debug('Received progress event', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        eventType: event.type,
        agentId: event.agentId,
        agentType: event.agentType,
        timestamp: event.timestamp
      })
      this.handleProgressEvent(event)
    })
    
    // Subscribe to typing events
    orchestrator.on('typing', (event: AgentStreamEvent) => {
      logger.debug('Received typing event', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        eventType: event.type,
        agentId: event.agentId,
        agentType: event.agentType,
        isTyping: (event.data as any)?.isTyping,
        timestamp: event.timestamp
      })
      this.handleTypingEvent(event)
    })
    
    // Subscribe to message events
    orchestrator.on('message', (event: AgentStreamEvent) => {
      logger.debug('Received message event', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        eventType: event.type,
        agentId: event.agentId,
        agentType: event.agentType,
        messageLength: (event.data as any)?.content?.length || 0,
        timestamp: event.timestamp
      })
      this.handleMessageEvent(event)
    })
  }
  
  private handleAgentEvent(event: AgentStreamEvent): void {
    if (event.type === 'status' && event.data) {
      const statusData = event.data as { status: string; message?: string }
      
      if (statusData.status === 'connected') {
        this.updateConnectionStatus({
          isConnected: true,
          lastHeartbeat: Date.now(),
          reconnectAttempts: 0
        })
      }
      
      pipe(
        O.fromNullable(statusData.message),
        O.fold(
          () => {},
          (message) => {
            this.addSystemMessage(
              `${event.agentType?.replace('_', ' ').replace('agent', 'dragon')}: ${message}`,
              event.agentId
            )
          }
        )
      )
    }
  }
  
  private handleProgressEvent(event: AgentStreamEvent): void {
    if (event.type === 'progress' && event.data) {
      const progressData = event.data as { message: string; progress?: number }
      
      // Update typing indicator
      this.updateTypingIndicator(event.agentId, event.agentType, true)
      
      // Add progress message using Option
      pipe(
        O.fromNullable(progressData.message),
        O.fold(
          () => {},
          (message) => {
            this.addSystemMessage(
              `${event.agentType?.replace('_', ' ').replace('agent', 'dragon')} is working: ${message}`,
              event.agentId
            )
          }
        )
      )
    }
  }
  
  private handleTypingEvent(event: AgentStreamEvent): void {
    if ((event.type as any) === 'typing' && event.data) {
      const typingData = event.data as { isTyping: boolean }
      this.updateTypingIndicator(event.agentId, event.agentType, typingData.isTyping)
    }
  }
  
  private handleMessageEvent(event: AgentStreamEvent): void {
    if ((event.type as any) === 'message' && event.data) {
      const messageData = event.data as Partial<StreamMessage>
      
      const message: StreamMessage = {
        id: messageData.id || Date.now().toString(),
        type: 'agent',
        agentType: event.agentType,
        content: messageData.content || '',
        timestamp: new Date(event.timestamp),
        status: 'delivered',
        metadata: messageData.metadata
      }
      
      this.messageSubject$.next(message)
      
      // Clear typing indicator
      this.updateTypingIndicator(event.agentId, event.agentType, false)
    }
  }
  
  // ============================================================================
  // Message Queue Processing
  // ============================================================================
  
  private processMessageQueue(): void {
    this.messageQueue$.pipe(
      // Group messages by priority
      bufferTime(this.config.throttleTime),
      
      // Sort by priority and timestamp
      map(items => 
        pipe(
          items,
          A.sortBy([
            // Priority ordering (high = 0, normal = 1, low = 2)
            Ord.fromCompare<MessageQueueItem>((a, b) => {
              const priorityOrder = { high: 0, normal: 1, low: 2 }
              return N.Ord.compare(priorityOrder[a.priority], priorityOrder[b.priority])
            }),
            // Timestamp ordering
            Ord.fromCompare<MessageQueueItem>((a, b) => 
              N.Ord.compare(a.timestamp, b.timestamp)
            )
          ])
        )
      ),
      
      // Process messages sequentially
      concatMap(items => 
        items.length > 0
          ? merge(...items.map(item => this.sendMessageInternal(item.message)))
          : EMPTY
      ),
      
      takeUntil(this.destroy$)
    ).subscribe()
  }
  
  // ============================================================================
  // Public API Methods
  // ============================================================================
  
  public sendMessage(content: string, metadata?: Record<string, any>): Observable<E.Either<Error, StreamMessage>> {
    const message: StreamMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      status: 'pending',
      metadata
    }
    
    // Add to message stream immediately
    this.messageSubject$.next(message)
    
    // Queue for sending
    this.messageQueue$.next({
      message: { ...message, status: 'sending' },
      priority: metadata?.priority || 'normal',
      timestamp: Date.now()
    })
    
    return of(E.right(message))
  }
  
  public sendAdapterAction(action: AdapterAction): Observable<E.Either<Error, StreamMessage>> {
    const metadata = {
      adapterAction: action,
      priority: 'high'
    }
    
    return this.sendMessage(
      `Executing ${action.type.toUpperCase()} action: ${action.description}`,
      metadata
    )
  }
  
  private sendMessageInternal(message: StreamMessage): Observable<void> {
    return new Observable<void>(observer => {
      const sendRequest = async () => {
        this.messageCounter++
        const requestId = `chat_msg_${this.serviceId}_${this.messageCounter}`
        const performanceLabel = `CHAT_MESSAGE_${this.messageCounter}`
        
        // Start performance timing
        logger.time(performanceLabel, {
          serviceId: this.serviceId,
          sessionId: this.config.sessionId,
          messageId: message.id,
          requestId
        })
        
        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const requestBody = {
            message: message.content,
            sessionId: this.config.sessionId,
            walletAddress: message.metadata?.walletAddress,
            metadata: message.metadata
          }
          
          // Log request initiation
          logger.logRequest({
            requestId,
            method: 'POST',
            url: `${apiBaseUrl}/chat/orchestrate`,
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
            startTime: Date.now()
          })
          
          logger.debug('Sending chat message', {
            serviceId: this.serviceId,
            sessionId: this.config.sessionId,
            messageId: message.id,
            requestId,
            messageLength: message.content.length,
            retryCount: message.retryCount || 0,
            messageCounter: this.messageCounter
          })
          
          const response = await fetch(`${apiBaseUrl}/chat/orchestrate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Service-ID': this.serviceId,
              'X-Session-ID': this.config.sessionId
            },
            body: JSON.stringify(requestBody)
          })
          
          const responseText = await response.text()
          let data
          
          try {
            data = responseText ? JSON.parse(responseText) : {}
          } catch (parseError) {
            logger.warn('Failed to parse chat response as JSON', {
              serviceId: this.serviceId,
              requestId,
              responseText: responseText.substring(0, 500),
              parseError
            })
            throw new Error('Invalid response format from server')
          }
          
          // Log response
          logger.logResponse(requestId, {
            status: response.status,
            statusText: response.statusText,
            response: data
          })
          
          // End performance timing
          const timer = logger.timeEnd(performanceLabel, {
            status: response.status,
            success: response.ok,
            responseSize: responseText.length
          })
          
          if (!response.ok) {
            const errorMessage = data?.error || `HTTP ${response.status}: ${response.statusText}`
            
            logger.error('Chat message request failed', {
              serviceId: this.serviceId,
              requestId,
              messageId: message.id,
              status: response.status,
              error: errorMessage,
              duration: timer?.duration
            })
            
            throw new Error(errorMessage)
          }
          
          logger.info('Chat message sent successfully', {
            serviceId: this.serviceId,
            requestId,
            messageId: message.id,
            status: response.status,
            duration: timer?.duration,
            responseSize: responseText.length,
            agentType: data.agentType
          })
          
          // Update message status to sent
          this.messageSubject$.next({
            ...message,
            status: 'sent'
          })
          
          // Process response
          if (data.message) {
            const responseMessage: StreamMessage = {
              id: (Date.now() + 1).toString(),
              type: 'agent',
              agentType: data.agentType,
              content: data.message,
              timestamp: new Date(),
              status: 'delivered',
              metadata: {
                ...data.metadata,
                requestId,
                executionTime: data.executionTime,
                intentId: data.intentId
              }
            }
            
            logger.debug('Received agent response', {
              serviceId: this.serviceId,
              requestId,
              responseMessageId: responseMessage.id,
              agentType: data.agentType,
              responseLength: data.message.length,
              executionTime: data.executionTime
            })
            
            this.messageSubject$.next(responseMessage)
          }
          
          observer.next()
          observer.complete()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          // Log error response
          logger.logResponse(requestId, {
            error: error instanceof Error ? error : new Error(errorMessage)
          })
          
          // End performance timing with error
          const timer = logger.timeEnd(performanceLabel, {
            error: true,
            errorType: error instanceof Error ? error.name : 'Unknown'
          })
          
          logger.error('Chat message request error', {
            serviceId: this.serviceId,
            requestId,
            messageId: message.id,
            error: errorMessage,
            duration: timer?.duration,
            retryCount: message.retryCount || 0
          })
          
          // Update message status to failed
          this.messageSubject$.next({
            ...message,
            status: 'failed',
            metadata: { 
              ...message.metadata, 
              error: true,
              errorMessage,
              requestId,
              lastFailedAt: Date.now()
            }
          })
          
          observer.error(error)
        }
      }
      
      sendRequest()
    }).pipe(
      timeout(this.config.messageTimeout),
      retry(this.config.maxRetries),
      catchError(error => {
        logger.error('Failed to send message after retries:', {
          serviceId: this.serviceId,
          sessionId: this.config.sessionId,
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          maxRetries: this.config.maxRetries,
          timeout: this.config.messageTimeout
        })
        return EMPTY
      })
    )
  }
  
  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  private updateTypingIndicator(agentId: string, agentType: AgentType, isTyping: boolean): void {
    const currentIndicators = this.typingSubject$.value
    
    if (isTyping) {
      currentIndicators.set(agentId, {
        agentId,
        agentType,
        isTyping: true,
        timestamp: Date.now()
      })
    } else {
      currentIndicators.delete(agentId)
    }
    
    this.typingSubject$.next(new Map(currentIndicators))
  }
  
  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus$.next({
      ...this.connectionStatus$.value,
      ...status
    })
  }
  
  private addSystemMessage(content: string, agentId?: string): void {
    const message: StreamMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
      status: 'delivered',
      metadata: pipe(
        O.fromNullable(agentId),
        O.fold(
          () => ({}),
          (id) => ({ agentId: id })
        )
      )
    }
    
    this.messageSubject$.next(message)
  }
  
  private startHeartbeat(): void {
    timer(0, this.config.heartbeatInterval).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.connectionStatus$.value.isConnected) {
        this.updateConnectionStatus({
          lastHeartbeat: Date.now()
        })
      }
    })
  }
  
  // ============================================================================
  // Functional Helpers using fp-ts
  // ============================================================================
  
  public getMessageById(id: string): Observable<O.Option<StreamMessage>> {
    return this.messageHistory$.pipe(
      map(messages => 
        pipe(
          messages,
          A.findFirst(msg => msg.id === id)
        )
      )
    )
  }
  
  public filterMessagesByType(type: 'user' | 'agent' | 'system'): Observable<StreamMessage[]> {
    return this.messageHistory$.pipe(
      map(messages =>
        pipe(
          messages,
          A.filter(msg => msg.type === type)
        )
      )
    )
  }
  
  public getAgentMessages(agentType: AgentType): Observable<StreamMessage[]> {
    return this.messageHistory$.pipe(
      map(messages =>
        pipe(
          messages,
          A.filter(msg => msg.type === 'agent' && msg.agentType === agentType)
        )
      )
    )
  }
  
  // ============================================================================
  // Lifecycle Methods
  // ============================================================================
  
  public destroy(): void {
    logger.info('Destroying ChatStreamService', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId,
      messageCount: this.messageCounter
    })
    
    this.destroy$.next()
    this.destroy$.complete()
    
    // Close WebSocket using Option
    pipe(
      O.fromNullable(this.ws),
      O.fold(
        () => {
          logger.debug('No WebSocket to close', {
            serviceId: this.serviceId,
            sessionId: this.config.sessionId
          })
        },
        (ws) => {
          logger.debug('Closing WebSocket connection', {
            serviceId: this.serviceId,
            sessionId: this.config.sessionId,
            readyState: ws.readyState
          })
          ws.close()
          this.ws = null
        }
      )
    )
    
    // Disconnect orchestrator
    try {
      const orchestrator = getOrchestrator()
      orchestrator.disconnectWebSocket()
      
      logger.debug('Orchestrator WebSocket disconnected', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId
      })
    } catch (error) {
      logger.warn('Error disconnecting orchestrator WebSocket', {
        serviceId: this.serviceId,
        sessionId: this.config.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    logger.info('ChatStreamService destroyed successfully', {
      serviceId: this.serviceId,
      sessionId: this.config.sessionId,
      finalMessageCount: this.messageCounter
    })
  }
}

// Factory function for creating chat stream service
export function createChatStreamService(config: ChatStreamConfig): ChatStreamService {
  return new ChatStreamService(config)
}