import { AgentStreamEvent } from '../../types/agent'
import { logger } from '../logger'

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

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000, // 5 seconds
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000, // 30 seconds
      ...config,
    }
  }

  async connect(sessionId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      return // Already connected to the same session
    }

    // Disconnect existing connection if any
    if (this.ws) {
      await this.disconnect()
    }

    this.currentSessionId = sessionId
    this.connectionState.sessionId = sessionId
    this.connectionState.status = 'connecting'

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.wsEndpoint}/chat/${sessionId}`
        logger.info(`Connecting to WebSocket: ${wsUrl}`)
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          logger.info('WebSocket connected successfully')
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
          try {
            const streamEvent: AgentStreamEvent = JSON.parse(event.data)
            this.emitEvent(streamEvent.type, streamEvent)
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error)
          this.connectionState.status = 'error'
          
          if (this.connectionState.reconnectAttempts === 0) {
            // Only reject on the first error during initial connection
            reject(new Error('WebSocket connection failed'))
          }
        }

        this.ws.onclose = (event) => {
          logger.info('WebSocket disconnected', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean
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
        logger.error('Failed to create WebSocket connection:', error)
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
      throw new Error('WebSocket is not connected')
    }
    
    try {
      this.ws!.send(JSON.stringify(message))
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error)
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
      logger.error('Max reconnect attempts reached')
      this.connectionState.status = 'error'
      return
    }

    this.connectionState.status = 'reconnecting'
    this.connectionState.reconnectAttempts++

    logger.info(`Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.config.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      if (this.currentSessionId) {
        this.connect(this.currentSessionId).catch(error => {
          logger.error('Reconnect failed:', error)
          this.attemptReconnect()
        })
      }
    }, this.config.reconnectInterval!)
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval! > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected()) {
          this.sendMessage({ type: 'heartbeat', timestamp: Date.now() })
            .catch(error => logger.error('Heartbeat failed:', error))
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