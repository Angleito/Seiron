import { UserIntent, TaskResult, AgentStreamEvent, Either } from '@/types/agent'

export interface OrchestratorConfig {
  apiEndpoint: string
  wsEndpoint: string
  timeout?: number
}

export class Orchestrator {
  private config: OrchestratorConfig
  private ws: WebSocket | null = null
  private eventHandlers: Map<string, Set<(event: AgentStreamEvent) => void>> = new Map()

  constructor(config: OrchestratorConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    }
  }

  async processIntent(intent: UserIntent): Promise<Either<string, TaskResult>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/process-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to process intent' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  connectWebSocket(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(`${this.config.wsEndpoint}/chat/${sessionId}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected to orchestrator')
    }

    this.ws.onmessage = (event) => {
      try {
        const streamEvent: AgentStreamEvent = JSON.parse(event.data)
        this.emitEvent(streamEvent.type, streamEvent)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (sessionId) {
          this.connectWebSocket(sessionId)
        }
      }, 5000)
    }
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on(eventType: string, handler: (event: AgentStreamEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    
    this.eventHandlers.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler)
    }
  }

  private emitEvent(eventType: string, event: AgentStreamEvent): void {
    const handlers = this.eventHandlers.get(eventType) || new Set()
    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        console.error('Event handler error:', error)
      }
    })
  }
}

// Singleton instance
let orchestratorInstance: Orchestrator | null = null

export function getOrchestrator(config?: OrchestratorConfig): Orchestrator {
  if (!orchestratorInstance && config) {
    orchestratorInstance = new Orchestrator(config)
  }
  
  if (!orchestratorInstance) {
    throw new Error('Orchestrator not initialized. Please provide config on first call.')
  }
  
  return orchestratorInstance
}