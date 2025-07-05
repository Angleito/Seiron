import { AgentStreamEvent } from '../../types/agent'
import { logger, logWebSocket } from '../logger'

export interface WebSocketConfig {
  wsEndpoint: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface WebSocketManager {
  connect(sessionId: string): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  sendMessage(message: unknown): Promise<void>
  on(eventType: string, handler: (event: AgentStreamEvent) => void): () => void
  off(eventType: string, handler: (event: AgentStreamEvent) => void): void
  getConnectionState(): WebSocketConnectionState
}

export interface WebSocketConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  lastConnected?: number
  lastDisconnected?: number
  reconnectAttempts: number
  sessionId?: string
}

export class WebSocketManagerImpl implements WebSocketManager {
  private config: WebSocketConfig
  private ws: WebSocket | null = null
  private eventHandlers: Map<string, Set<(event: AgentStreamEvent) => void>> = new Map()
  private connectionState: WebSocketConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0,
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private currentSessionId?: string
  private connectionId: string = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  private messageCount: number = 0

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000, // 5 seconds
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000, // 30 seconds
      ...config,
    }
    
    logger.debug('WebSocket manager initialized', {
      connectionId: this.connectionId,
      config: this.config
    })
  }

  async connect(sessionId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      logger.debug('WebSocket already connected to session', {
        connectionId: this.connectionId,
        sessionId,
        readyState: this.ws.readyState
      })
      return // Already connected to the same session
    }

    // Disconnect existing connection if any
    if (this.ws) {
      logger.debug('Disconnecting existing WebSocket connection', {
        connectionId: this.connectionId,
        currentSessionId: this.currentSessionId,
        newSessionId: sessionId
      })
      await this.disconnect()
    }

    this.currentSessionId = sessionId
    this.connectionState.sessionId = sessionId
    this.connectionState.status = 'connecting'
    this.messageCount = 0

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.wsEndpoint}/chat/${sessionId}`
        
        // Log connection attempt
        logWebSocket({
          connectionId: this.connectionId,
          event: 'connect',
          url: wsUrl,
          sessionId,
          timestamp: Date.now()
        })
        
        logger.info(`Connecting to WebSocket: ${wsUrl}`, {
          connectionId: this.connectionId,
          sessionId,
          config: this.config
        })
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          logger.info('WebSocket connected successfully', {
            connectionId: this.connectionId,
            sessionId,
            url: wsUrl
          })
          
          logWebSocket({
            connectionId: this.connectionId,
            event: 'connect',
            url: wsUrl,
            sessionId,
            timestamp: Date.now(),
            data: { success: true }
          })
          
          this.connectionState = {
            ...this.connectionState,
            status: 'connected',
            lastConnected: Date.now(),
            reconnectAttempts: 0,
          }
          
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.messageCount++
          
          try {
            const streamEvent: AgentStreamEvent = JSON.parse(event.data)
            
            // Log message received
            logWebSocket({
              connectionId: this.connectionId,
              event: 'message',
              sessionId,
              timestamp: Date.now(),
              data: {
                type: streamEvent.type,
                agentId: streamEvent.agentId,
                agentType: streamEvent.agentType,
                messageSize: event.data.length,
                messageCount: this.messageCount
              }
            })
            
            logger.debug('WebSocket message received', {
              connectionId: this.connectionId,
              sessionId,
              eventType: streamEvent.type,
              agentId: streamEvent.agentId,
              agentType: streamEvent.agentType,
              messageSize: event.data.length,
              messageCount: this.messageCount
            })
            
            this.emitEvent(streamEvent.type, streamEvent)
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', {
              connectionId: this.connectionId,
              sessionId,
              error,
              rawMessage: event.data.substring(0, 500),
              messageCount: this.messageCount
            })
            
            logWebSocket({
              connectionId: this.connectionId,
              event: 'error',
              sessionId,
              timestamp: Date.now(),
              error: error instanceof Error ? error : new Error('Message parse error'),
              data: { messageParseError: true, rawMessage: event.data.substring(0, 500) }
            })
          }
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', {
            connectionId: this.connectionId,
            sessionId,
            error,
            readyState: this.ws?.readyState,
            url: wsUrl
          })
          
          logWebSocket({
            connectionId: this.connectionId,
            event: 'error',
            url: wsUrl,
            sessionId,
            timestamp: Date.now(),
            error: error instanceof Error ? error : new Error('WebSocket error'),
            data: { readyState: this.ws?.readyState }
          })
          
          this.connectionState.status = 'error'
          
          if (this.connectionState.reconnectAttempts === 0) {
            // Only reject on the first error during initial connection
            reject(new Error('WebSocket connection failed'))
          }
        }

        this.ws.onclose = (event) => {
          logger.info('WebSocket disconnected', { 
            connectionId: this.connectionId,
            sessionId,
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean,
            messageCount: this.messageCount
          })
          
          logWebSocket({
            connectionId: this.connectionId,
            event: 'disconnect',
            url: wsUrl,
            sessionId,
            timestamp: Date.now(),
            data: {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              messageCount: this.messageCount
            }
          })
          
          this.connectionState = {
            ...this.connectionState,
            status: 'disconnected',
            lastDisconnected: Date.now(),
          }
          
          this.stopHeartbeat()
          
          // Attempt to reconnect if not a clean disconnect
          if (!event.wasClean && this.currentSessionId) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        logger.error('Failed to create WebSocket connection:', {
          connectionId: this.connectionId,
          sessionId,
          error,
          config: this.config
        })
        
        logWebSocket({
          connectionId: this.connectionId,
          event: 'error',
          sessionId,
          timestamp: Date.now(),
          error: error instanceof Error ? error : new Error('Connection creation failed')
        })
        
        this.connectionState.status = 'error'
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      this.stopHeartbeat()
      this.currentSessionId = undefined
      
      if (this.ws) {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, 'Intentional disconnect')
        }
        
        // Wait for close event or timeout
        const timeout = setTimeout(() => {
          this.ws = null
          this.connectionState.status = 'disconnected'
          resolve()
        }, 1000)
        
        this.ws.onclose = () => {
          clearTimeout(timeout)
          this.ws = null
          this.connectionState.status = 'disconnected'
          resolve()
        }
      } else {
        this.connectionState.status = 'disconnected'
        resolve()
      }
    })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async sendMessage(message: unknown): Promise<void> {
    if (!this.isConnected()) {
      const error = new Error('WebSocket is not connected')
      logger.error('Cannot send message - WebSocket not connected', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        connectionState: this.connectionState.status,
        message: typeof message === 'string' ? message.substring(0, 100) : JSON.stringify(message).substring(0, 100)
      })
      throw error
    }
    
    try {
      const messageStr = JSON.stringify(message)
      
      // Log message being sent
      logger.debug('Sending WebSocket message', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        messageSize: messageStr.length,
        messageType: typeof message === 'object' && message !== null ? (message as any).type : 'unknown'
      })
      
      logWebSocket({
        connectionId: this.connectionId,
        event: 'message',
        sessionId: this.currentSessionId,
        timestamp: Date.now(),
        data: {
          direction: 'outgoing',
          messageSize: messageStr.length,
          messageType: typeof message === 'object' && message !== null ? (message as any).type : 'unknown'
        }
      })
      
      this.ws!.send(messageStr)
      
      logger.debug('WebSocket message sent successfully', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        messageSize: messageStr.length
      })
    } catch (error) {
      logger.error('Failed to send WebSocket message:', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        error,
        message: typeof message === 'string' ? message.substring(0, 100) : JSON.stringify(message).substring(0, 100)
      })
      
      logWebSocket({
        connectionId: this.connectionId,
        event: 'error',
        sessionId: this.currentSessionId,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Send message failed'),
        data: { operation: 'sendMessage' }
      })
      
      throw error
    }
  }

  on(eventType: string, handler: (event: AgentStreamEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    
    this.eventHandlers.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler)
    }
  }

  off(eventType: string, handler: (event: AgentStreamEvent) => void): void {
    this.eventHandlers.get(eventType)?.delete(handler)
  }

  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState }
  }

  private emitEvent(eventType: string, event: AgentStreamEvent): void {
    const handlers = this.eventHandlers.get(eventType) || new Set()
    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        logger.error('Event handler error:', error)
      }
    })
  }

  private attemptReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      logger.error('Max reconnect attempts reached', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        maxAttempts: this.config.maxReconnectAttempts,
        totalAttempts: this.connectionState.reconnectAttempts
      })
      
      logWebSocket({
        connectionId: this.connectionId,
        event: 'error',
        sessionId: this.currentSessionId,
        timestamp: Date.now(),
        error: new Error('Max reconnect attempts reached'),
        data: {
          maxAttempts: this.config.maxReconnectAttempts,
          totalAttempts: this.connectionState.reconnectAttempts
        }
      })
      
      this.connectionState.status = 'error'
      return
    }

    this.connectionState.status = 'reconnecting'
    this.connectionState.reconnectAttempts++

    logger.info(`Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.config.maxReconnectAttempts})`, {
      connectionId: this.connectionId,
      sessionId: this.currentSessionId,
      attemptNumber: this.connectionState.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      reconnectInterval: this.config.reconnectInterval
    })

    logWebSocket({
      connectionId: this.connectionId,
      event: 'reconnect',
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      attemptNumber: this.connectionState.reconnectAttempts,
      data: {
        attemptNumber: this.connectionState.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts,
        reconnectInterval: this.config.reconnectInterval
      }
    })

    this.reconnectTimer = setTimeout(() => {
      if (this.currentSessionId) {
        this.connect(this.currentSessionId).catch(error => {
          logger.error('Reconnect failed:', {
            connectionId: this.connectionId,
            sessionId: this.currentSessionId,
            attemptNumber: this.connectionState.reconnectAttempts,
            error
          })
          
          logWebSocket({
            connectionId: this.connectionId,
            event: 'error',
            sessionId: this.currentSessionId,
            timestamp: Date.now(),
            error: error instanceof Error ? error : new Error('Reconnect failed'),
            attemptNumber: this.connectionState.reconnectAttempts,
            data: { operation: 'reconnect' }
          })
          
          this.attemptReconnect()
        })
      }
    }, this.config.reconnectInterval!)
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval! > 0) {
      logger.debug('Starting heartbeat', {
        connectionId: this.connectionId,
        sessionId: this.currentSessionId,
        heartbeatInterval: this.config.heartbeatInterval
      })
      
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected()) {
          const heartbeatMessage = { type: 'heartbeat', timestamp: Date.now(), connectionId: this.connectionId }
          
          logger.debug('Sending heartbeat', {
            connectionId: this.connectionId,
            sessionId: this.currentSessionId,
            timestamp: heartbeatMessage.timestamp
          })
          
          this.sendMessage(heartbeatMessage)
            .catch(error => {
              logger.error('Heartbeat failed:', {
                connectionId: this.connectionId,
                sessionId: this.currentSessionId,
                error
              })
              
              logWebSocket({
                connectionId: this.connectionId,
                event: 'error',
                sessionId: this.currentSessionId,
                timestamp: Date.now(),
                error: error instanceof Error ? error : new Error('Heartbeat failed'),
                data: { operation: 'heartbeat' }
              })
            })
        } else {
          logger.warn('Heartbeat skipped - WebSocket not connected', {
            connectionId: this.connectionId,
            sessionId: this.currentSessionId,
            connectionState: this.connectionState.status
          })
        }
      }, this.config.heartbeatInterval!)
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}