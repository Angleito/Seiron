import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

// MCP Server Integration
const MCP_SERVERS = {
  'hive-intelligence': process.env.NEXT_PUBLIC_HIVE_MCP_URL || 'http://localhost:4000',
  'sei-blockchain': process.env.NEXT_PUBLIC_SEI_MCP_URL || 'http://localhost:4001',
  'portfolio-manager': process.env.NEXT_PUBLIC_PORTFOLIO_MCP_URL || 'http://localhost:4002'
}

interface ChatRequest {
  message: string
  sessionId: string
  walletAddress?: string
  metadata?: Record<string, any>
  stream?: boolean
}

interface ChatResponse {
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
    mcpData?: any
  }
}

// Main chat endpoint handler
export async function POST(request: NextRequest) {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  try {
    logger.info('Chat API request received', { requestId })
    
    const body: ChatRequest = await request.json()
    const { message, sessionId, walletAddress, metadata, stream } = body
    
    // Validate required fields
    if (!message || !sessionId) {
      logger.warn('Missing required fields', { requestId, message: !!message, sessionId: !!sessionId })
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      )
    }
    
    logger.debug('Processing chat request', { 
      requestId, 
      sessionId, 
      messageLength: message.length,
      hasWallet: !!walletAddress,
      stream
    })
    
    // Handle streaming response
    if (stream) {
      return handleStreamingChat(requestId, body)
    }
    
    // Try primary backend endpoint first
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (backendUrl) {
      try {
        logger.debug('Attempting backend orchestration', { requestId, backendUrl })
        
        const response = await fetch(`${backendUrl}/api/chat/orchestrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            message,
            sessionId,
            walletAddress,
            metadata
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          logger.info('Backend orchestration successful', { requestId, agentType: data.agentType })
          
          // Enhance with MCP data if available
          const enhancedData = await enhanceWithMCPData(data, message)
          
          return NextResponse.json(enhancedData)
        }
        
        logger.warn('Backend orchestration failed', { 
          requestId, 
          status: response.status,
          statusText: response.statusText 
        })
      } catch (error) {
        logger.error('Backend orchestration error', { 
          requestId, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Fallback to direct MCP integration
    logger.info('Using fallback MCP integration', { requestId })
    const fallbackResponse = await handleFallbackChat(requestId, body)
    
    return NextResponse.json(fallbackResponse)
    
  } catch (error) {
    logger.error('Chat API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      { status: 500 }
    )
  }
}

// Handle streaming chat responses
async function handleStreamingChat(requestId: string, body: ChatRequest): Promise<Response> {
  logger.info('Setting up streaming response', { requestId })
  
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          timestamp: new Date().toISOString()
        })}\n\n`))
        
        // Process with backend or fallback
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (backendUrl) {
          // Stream from backend
          await streamFromBackend(controller, encoder, requestId, body, backendUrl)
        } else {
          // Stream from fallback
          await streamFromFallback(controller, encoder, requestId, body)
        }
        
        controller.close()
      } catch (error) {
        logger.error('Streaming error', { requestId, error })
        controller.error(error)
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': requestId
    }
  })
}

// Stream from backend service
async function streamFromBackend(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  requestId: string,
  body: ChatRequest,
  backendUrl: string
) {
  try {
    const response = await fetch(`${backendUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error(`Backend stream failed: ${response.status}`)
    }
    
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      controller.enqueue(value)
    }
  } catch (error) {
    logger.error('Backend streaming failed, using fallback', { requestId, error })
    await streamFromFallback(controller, encoder, requestId, body)
  }
}

// Stream from fallback MCP
async function streamFromFallback(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  requestId: string,
  body: ChatRequest
) {
  // Simulate streaming with MCP data
  const steps = [
    { type: 'thinking', message: 'Analyzing your request...' },
    { type: 'processing', message: 'Querying MCP servers...' },
    { type: 'response', message: await generateFallbackResponse(body) }
  ]
  
  for (const step of steps) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: step.type,
      content: step.message,
      timestamp: new Date().toISOString()
    })}\n\n`))
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// Fallback chat handler using MCP servers
async function handleFallbackChat(requestId: string, body: ChatRequest): Promise<ChatResponse> {
  logger.info('Processing fallback chat', { requestId })
  
  const { message, sessionId, walletAddress } = body
  const startTime = Date.now()
  
  try {
    // Determine intent from message
    const intent = analyzeIntent(message)
    logger.debug('Intent analysis', { requestId, intent })
    
    // Query relevant MCP servers based on intent
    const mcpData = await queryMCPServers(intent, message, walletAddress)
    
    // Generate response based on MCP data
    const response = await generateResponseFromMCP(intent, mcpData, message)
    
    return {
      message: response,
      timestamp: new Date().toISOString(),
      agentType: intent.agentType,
      intentId: `${requestId}_${intent.type}`,
      executionTime: Date.now() - startTime,
      metadata: {
        intent: intent.type,
        action: intent.action,
        confidence: intent.confidence,
        mcpData: mcpData
      }
    }
  } catch (error) {
    logger.error('Fallback chat error', { requestId, error })
    
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      timestamp: new Date().toISOString(),
      agentType: 'error',
      error: true,
      executionTime: Date.now() - startTime,
      metadata: {
        intent: 'error',
        action: 'failed',
        confidence: 0
      }
    }
  }
}

// Analyze user intent from message
function analyzeIntent(message: string): {
  type: string
  action: string
  agentType: string
  confidence: number
} {
  const lowerMessage = message.toLowerCase()
  
  // Market/trading related
  if (lowerMessage.includes('price') || lowerMessage.includes('market') || 
      lowerMessage.includes('trade') || lowerMessage.includes('buy') || 
      lowerMessage.includes('sell')) {
    return {
      type: 'market',
      action: 'query',
      agentType: 'market_agent',
      confidence: 0.9
    }
  }
  
  // Portfolio related
  if (lowerMessage.includes('portfolio') || lowerMessage.includes('balance') ||
      lowerMessage.includes('holdings') || lowerMessage.includes('assets')) {
    return {
      type: 'portfolio',
      action: 'query',
      agentType: 'portfolio_agent',
      confidence: 0.9
    }
  }
  
  // Blockchain/transaction related
  if (lowerMessage.includes('transaction') || lowerMessage.includes('send') ||
      lowerMessage.includes('transfer') || lowerMessage.includes('swap')) {
    return {
      type: 'blockchain',
      action: 'execute',
      agentType: 'blockchain_agent',
      confidence: 0.85
    }
  }
  
  // Default to general query
  return {
    type: 'general',
    action: 'chat',
    agentType: 'assistant_agent',
    confidence: 0.7
  }
}

// Query MCP servers based on intent
async function queryMCPServers(
  intent: any,
  message: string,
  walletAddress?: string
): Promise<Record<string, any>> {
  const results: Record<string, any> = {}
  
  try {
    // Query based on intent type
    switch (intent.type) {
      case 'market':
        // Query Hive Intelligence for market data
        try {
          const hiveResponse = await fetch(`${MCP_SERVERS['hive-intelligence']}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message, type: 'market' })
          })
          if (hiveResponse.ok) {
            results.hive = await hiveResponse.json()
          }
        } catch (error) {
          logger.warn('Hive MCP query failed', { error })
        }
        break
        
      case 'portfolio':
        // Query Portfolio Manager
        if (walletAddress) {
          try {
            const portfolioResponse = await fetch(`${MCP_SERVERS['portfolio-manager']}/portfolio/${walletAddress}`)
            if (portfolioResponse.ok) {
              results.portfolio = await portfolioResponse.json()
            }
          } catch (error) {
            logger.warn('Portfolio MCP query failed', { error })
          }
        }
        break
        
      case 'blockchain':
        // Query SEI Blockchain
        try {
          const seiResponse = await fetch(`${MCP_SERVERS['sei-blockchain']}/network/status`)
          if (seiResponse.ok) {
            results.blockchain = await seiResponse.json()
          }
        } catch (error) {
          logger.warn('SEI MCP query failed', { error })
        }
        break
    }
  } catch (error) {
    logger.error('MCP server query error', { error })
  }
  
  return results
}

// Generate response from MCP data
async function generateResponseFromMCP(
  intent: any,
  mcpData: Record<string, any>,
  originalMessage: string
): Promise<string> {
  // Generate contextual response based on intent and MCP data
  switch (intent.type) {
    case 'market':
      if (mcpData.hive?.results?.length > 0) {
        const topResult = mcpData.hive.results[0]
        return `Based on current market data: ${topResult.summary || 'Market information available.'}`
      }
      return 'I can help you with market information. Currently fetching the latest data...'
      
    case 'portfolio':
      if (mcpData.portfolio?.totalValue) {
        return `Your portfolio total value is ${mcpData.portfolio.totalValue}. You have ${mcpData.portfolio.assets?.length || 0} assets.`
      }
      return 'Please connect your wallet to view portfolio information.'
      
    case 'blockchain':
      if (mcpData.blockchain?.chainId) {
        return `SEI Network Status: Chain ID ${mcpData.blockchain.chainId}, Block Height: ${mcpData.blockchain.blockHeight || 'Unknown'}`
      }
      return 'Checking blockchain status...'
      
    default:
      return 'I can help you with market data, portfolio management, and blockchain transactions. What would you like to know?'
  }
}

// Enhance response with MCP data
async function enhanceWithMCPData(response: ChatResponse, message: string): Promise<ChatResponse> {
  try {
    // Only enhance if not already enhanced
    if (response.metadata?.mcpData) {
      return response
    }
    
    // Quick intent check
    const intent = analyzeIntent(message)
    
    // Query relevant MCP servers
    const mcpData = await queryMCPServers(intent, message)
    
    // Add MCP data to response
    return {
      ...response,
      metadata: {
        ...response.metadata,
        mcpData: Object.keys(mcpData).length > 0 ? mcpData : undefined
      }
    }
  } catch (error) {
    logger.warn('Failed to enhance with MCP data', { error })
    return response
  }
}

// Generate fallback response for streaming
async function generateFallbackResponse(body: ChatRequest): Promise<string> {
  const intent = analyzeIntent(body.message)
  const mcpData = await queryMCPServers(intent, body.message, body.walletAddress)
  return generateResponseFromMCP(intent, mcpData, body.message)
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      chat: '/api/chat',
      streaming: '/api/chat?stream=true'
    },
    mcp_servers: Object.keys(MCP_SERVERS).reduce((acc, key) => ({
      ...acc,
      [key]: 'configured'
    }), {})
  })
}