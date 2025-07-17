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

    // Use unified API client to call backend
    const data = await apiClient.post<ChatResponse>('/api/chat/orchestrate', {
      message,
      sessionId,
      walletAddress,
    })

    return data

  } catch (error) {
    console.error('Chat API error:', error)
    throw new Error('Failed to process chat message. Please try again.')
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