import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Define handlers for API mocking
const handlers = [
  // Authentication endpoints
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

  http.post('/api/auth/signin', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })
  }),

  http.post('/api/auth/signout', () => {
    return HttpResponse.json({ success: true })
  }),

  // Portfolio endpoints
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

  http.get('/api/portfolio/history', () => {
    const now = Date.now()
    const history = []
    for (let i = 30; i >= 0; i--) {
      history.push({
        timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
        totalValue: 10000 + Math.random() * 2000 - 1000,
        change: (Math.random() - 0.5) * 0.1
      })
    }
    return HttpResponse.json(history)
  }),

  // Chat endpoints
  http.get('/api/chat/sessions', () => {
    return HttpResponse.json([
      {
        id: 'session-1',
        title: 'Portfolio Review',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 5
      },
      {
        id: 'session-2',
        title: 'Investment Strategy',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        messageCount: 8
      }
    ])
  }),

  http.post('/api/chat/send-message', async ({ request }) => {
    const { message, sessionId } = await request.json()
    
    return HttpResponse.json({
      id: 'msg-' + Date.now(),
      content: `I received your message: "${message}". This is a test response for session ${sessionId}.`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sessionId
    })
  }),

  http.get('/api/chat/memory/:sessionId', ({ params }) => {
    return HttpResponse.json({
      sessionId: params.sessionId,
      context: {
        userPreferences: {
          riskTolerance: 'moderate',
          investmentGoals: ['long-term-growth', 'diversification']
        },
        portfolioSummary: {
          totalValue: 10000,
          primaryTokens: ['SEI', 'USDC']
        }
      },
      conversationSummary: 'User is interested in portfolio optimization and risk management.'
    })
  }),

  // Voice endpoints
  http.post('/api/voice/synthesize', async ({ request }) => {
    const { text } = await request.json()
    
    // Return mock audio data
    return HttpResponse.arrayBuffer(
      new ArrayBuffer(1024), // Mock audio buffer
      {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': '1024'
        }
      }
    )
  }),

  // Blockchain/DeFi endpoints
  http.get('/api/sei/balance/:address', ({ params }) => {
    return HttpResponse.json({
      address: params.address,
      balance: '1000000000000000000000', // 1000 SEI in wei
      balanceFormatted: '1000',
      symbol: 'SEI'
    })
  }),

  // Health check
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
  }),

  // Default fallback for unknown routes
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} ${request.url}`)
    return new HttpResponse(null, { status: 404 })
  })
]

// Create and configure the server
export const server = setupServer(...handlers)

// Setup MSW
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})