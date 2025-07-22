import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'

// Browser-specific MSW setup for E2E tests
const handlers = [
  // Same handlers as server but configured for browser environment
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
        name: 'Test User'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }),

  http.get('/api/portfolio', () => {
    return HttpResponse.json({
      totalValue: 10000,
      totalValueUsd: 10000,
      positions: [
        {
          token: 'SEI',
          symbol: 'SEI',
          amount: '1000',
          value: 5000,
          valueUsd: 5000,
          price: 5.0,
          change24h: 0.05
        },
        {
          token: 'USDC',
          symbol: 'USDC',
          amount: '5000',
          value: 5000,
          valueUsd: 5000,
          price: 1.0,
          change24h: 0.0
        }
      ],
      change24h: 0.025,
      lastUpdated: new Date().toISOString()
    })
  }),

  http.post('/api/chat/send-message', async ({ request }) => {
    const { message, sessionId } = await request.json()
    
    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return HttpResponse.json({
      id: 'msg-' + Date.now(),
      content: `I received your message: "${message}". This is a test response for session ${sessionId}.`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sessionId
    })
  }),

  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        blockchain: 'healthy',
        ai: 'healthy'
      }
    })
  })
]

export const worker = setupWorker(...handlers)

// Function to start MSW in browser environment
export const startMSW = async () => {
  if (typeof window !== 'undefined') {
    await worker.start({
      onUnhandledRequest: 'bypass'
    })
  }
}

// Function to stop MSW
export const stopMSW = () => {
  if (typeof window !== 'undefined') {
    worker.stop()
  }
}