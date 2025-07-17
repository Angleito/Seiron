import { createAuthenticatedFetch } from '../lib/auth/authInterceptor'

// API endpoint configuration - using environment variable or relative paths for Vercel deployment
const API_BASE_URL = import.meta.env.NEXT_PUBLIC_BACKEND_URL || ''

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

    // Call backend API chat orchestrate endpoint
    const response = await authFetch(`${API_BASE_URL}/api/chat/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        walletAddress,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to process chat message')
    }

    const data = await response.json()
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

  // Use backend WebSocket endpoint if configured, otherwise use frontend API
  const backendUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL
  
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