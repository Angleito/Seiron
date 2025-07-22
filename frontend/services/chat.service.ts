import { createAuthenticatedFetch } from '../lib/auth/authInterceptor'
import { apiClient } from '../utils/apiClient'

// Create authenticated fetch instance
const authFetch = createAuthenticatedFetch({
  enableAuth: true,
  enableLogging: true,
  refreshOnUnauthorized: true,
})

export interface ChatResponse {
  message: string
  timestamp: string
  agentType: string
  error?: boolean
  intentId?: string
  taskId?: string
  executionTime?: number
  metadata?: {
    intent: string
    action: string
    confidence?: number
  }
}

export async function processChat(message: string, sessionId: string, walletAddress?: string): Promise<ChatResponse> {
  try {
    if (!message || !sessionId) {
      throw new Error('Message and session ID are required for processing')
    }

    // Use new unified chat endpoint with automatic fallback
    const data = await apiClient.post<ChatResponse>('/api/chat', {
      message,
      sessionId,
      walletAddress,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'web'
      }
    })

    return data

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Provide more detailed error message
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error('Chat service is not available. Please try again later.')
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.')
      }
    }
    
    throw new Error('Failed to process chat message. Please try again.')
  }
}

export async function processChatStream(
  message: string, 
  sessionId: string, 
  walletAddress?: string,
  onMessage?: (event: MessageEvent) => void,
  onError?: (error: Error) => void
): Promise<EventSource> {
  try {
    if (!message || !sessionId) {
      throw new Error('Message and session ID are required for streaming')
    }

    // Use streaming endpoint
    return await apiClient.stream(
      `/api/chat?stream=true`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          sessionId,
          walletAddress,
          stream: true,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'web'
          }
        })
      },
      onMessage,
      onError
    )

  } catch (error) {
    console.error('Chat stream API error:', error)
    throw new Error('Failed to start chat stream. Please try again.')
  }
}

export function getWebSocketEndpoint(sessionId: string) {
  if (!sessionId) {
    throw new Error('Session ID is required for WebSocket connection')
  }

  // Get backend URL from API client
  const clientStatus = apiClient.getStatus()
  const backendUrl = clientStatus.backendUrl
  
  if (backendUrl) {
    // Use backend WebSocket endpoint
    const wsProtocol = backendUrl.startsWith('https:') ? 'wss:' : 'ws:'
    const wsHost = backendUrl.replace(/^https?:\/\//, '')
    
    return {
      wsEndpoint: `${wsProtocol}//${wsHost}/api/chat/ws/${sessionId}`,
      protocol: 'agent-chat-v1',
    }
  } else {
    // Use frontend API WebSocket endpoint
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    
    return {
      wsEndpoint: `${wsProtocol}//${wsHost}/api/chat/ws/${sessionId}`,
      protocol: 'agent-chat-v1',
    }
  }
}