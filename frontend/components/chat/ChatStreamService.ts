import { Observable, Subject, BehaviorSubject, ReplaySubject, merge, of, throwError, timer, EMPTY } from 'rxjs'
import { 
  map, 
  filter, 
  catchError, 
  retry, 
  tap, 
  distinctUntilChanged, 
  debounceTime,
  switchMap,
  mergeMap,
  concatMap,
  scan,
  shareReplay,
  startWith,
  takeUntil,
  delay,
  timeout,
  bufferTime,
  throttleTime
} from 'rxjs/operators'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'
import { AgentMessage, AgentStreamEvent, AgentType } from '@/types/agent'
import { getOrchestrator, AdapterAction } from '@/lib/orchestrator-client'

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
    
    // Initialize observables
    this.messages$ = this.setupMessageStream()
    this.typingIndicators$ = this.setupTypingStream()
    this.connectionStatus = this.connectionStatus$.asObservable()
    this.messageHistory$ = this.setupMessageHistory()
    
    // Start services
    this.initializeWebSocket()
    this.startHeartbeat()
    this.processMessageQueue()
  }
  
  // ============================================================================
  // Stream Setup Methods
  // ============================================================================
  
  private setupMessageStream(): Observable<StreamMessage> {
    return this.messageSubject$.pipe(
      // Add timestamp if not present
      map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date()
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
        const updatedHistory = [...history]
        const existingIndex = updatedHistory.findIndex(m => m.id === msg.id)
        
        if (existingIndex >= 0) {
          updatedHistory[existingIndex] = msg
        } else {
          updatedHistory.push(msg)
        }
        
        // Keep only last N messages
        if (updatedHistory.length > this.config.bufferSize) {
          updatedHistory.shift()
        }
        
        return updatedHistory
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
    const orchestrator = getOrchestrator({
      apiEndpoint: this.config.apiEndpoint,
      wsEndpoint: this.config.wsEndpoint
    })
    
    // Connect WebSocket
    orchestrator.connectWebSocket(this.config.sessionId)
    
    // Subscribe to orchestrator events
    this.subscribeToOrchestratorEvents(orchestrator)
  }
  
  private subscribeToOrchestratorEvents(orchestrator: any): void {
    // Subscribe to status events
    orchestrator.on('status', (event: AgentStreamEvent) => {
      this.handleAgentEvent(event)
    })
    
    // Subscribe to progress events
    orchestrator.on('progress', (event: AgentStreamEvent) => {
      this.handleProgressEvent(event)
    })
    
    // Subscribe to typing events
    orchestrator.on('typing', (event: AgentStreamEvent) => {
      this.handleTypingEvent(event)
    })
    
    // Subscribe to message events
    orchestrator.on('message', (event: AgentStreamEvent) => {
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
      
      if (statusData.message) {
        this.addSystemMessage(
          `${event.agentType?.replace('_', ' ').replace('agent', 'dragon')}: ${statusData.message}`,
          event.agentId
        )
      }
    }
  }
  
  private handleProgressEvent(event: AgentStreamEvent): void {
    if (event.type === 'progress' && event.data) {
      const progressData = event.data as { message: string; progress?: number }
      
      // Update typing indicator
      this.updateTypingIndicator(event.agentId, event.agentType, true)
      
      // Add progress message
      if (progressData.message) {
        this.addSystemMessage(
          `${event.agentType?.replace('_', ' ').replace('agent', 'dragon')} is working: ${progressData.message}`,
          event.agentId
        )
      }
    }
  }
  
  private handleTypingEvent(event: AgentStreamEvent): void {
    if ((event.type as any) === 'typing' && event.data) {
      const typingData = event.data as { isTyping: boolean }
      this.updateTypingIndicator(event.agentId, event.agentType, typingData.isTyping)
    }
  }
  
  private handleMessageEvent(event: AgentStreamEvent): void {
    if (event.type === 'message' && event.data) {
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
            (a: MessageQueueItem, b: MessageQueueItem) => {
              const priorityOrder = { high: 0, normal: 1, low: 2 }
              return priorityOrder[a.priority] - priorityOrder[b.priority]
            },
            (a: MessageQueueItem, b: MessageQueueItem) => 
              a.timestamp - b.timestamp
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
    return new Observable(observer => {
      const sendTask = TE.tryCatch(
        async () => {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message.content,
              sessionId: this.config.sessionId,
              metadata: message.metadata
            })
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          return response.json()
        },
        (error) => error as Error
      )
      
      pipe(
        sendTask,
        TE.fold(
          (error) => {
            // Update message status to failed
            this.messageSubject$.next({
              ...message,
              status: 'failed',
              metadata: { ...message.metadata, error: error.message }
            })
            observer.error(error)
            return TE.of(void 0)
          },
          (data) => {
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
                metadata: data.metadata
              }
              
              this.messageSubject$.next(responseMessage)
            }
            
            observer.next()
            observer.complete()
            return TE.of(void 0)
          }
        )
      )()
    }).pipe(
      timeout(this.config.messageTimeout),
      retry({
        count: this.config.maxRetries,
        delay: (error, retryCount) => {
          console.error(`Message send attempt ${retryCount} failed:`, error)
          return timer(this.config.retryDelay * Math.pow(2, retryCount))
        }
      }),
      catchError(error => {
        console.error('Failed to send message after retries:', error)
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
      metadata: { agentId }
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
    this.destroy$.next()
    this.destroy$.complete()
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    // Disconnect orchestrator
    const orchestrator = getOrchestrator()
    orchestrator.disconnectWebSocket()
  }
}

// Factory function for creating chat stream service
export function createChatStreamService(config: ChatStreamConfig): ChatStreamService {
  return new ChatStreamService(config)
}