// API endpoint configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
      throw new Error('The dragon requires both your wish and a summoning circle (sessionId)')
    }

    // Call backend chat orchestrate endpoint
    const response = await fetch(`${API_BASE_URL}/chat/orchestrate`, {
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
    throw new Error('The dragon encountered mystical interference. Please try summoning again.')
  }
}

export function getWebSocketEndpoint(sessionId: string) {
  if (!sessionId) {
    throw new Error('A summoning circle (sessionId) is required for the dragon connection')
  }

  return {
    wsEndpoint: `${import.meta.env.VITE_ORCHESTRATOR_WS_ENDPOINT}/chat/${sessionId}`,
    protocol: 'agent-chat-v1',
  }
}