import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

// MCP server configuration
const MCP_SERVERS = {
  hive: process.env.MCP_HIVE_URL || 'https://hive-intelligence-mcp-production.up.railway.app',
  sei: process.env.MCP_SEI_URL || 'https://sei-blockchain-mcp-production.up.railway.app',
  portfolio: process.env.MCP_PORTFOLIO_URL || 'https://portfolio-manager-mcp-production.up.railway.app'
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeaders(corsHeaders).end()
    return
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).setHeaders(corsHeaders).json({ 
      error: 'Method not allowed' 
    })
    return
  }

  try {
    const { message, sessionId, walletAddress, messages = [] } = req.body

    if (!message) {
      res.status(400).setHeaders(corsHeaders).json({ 
        error: 'Message is required' 
      })
      return
    }

    // Check if user is asking for data that requires MCP tools
    const mcpData = await handleMCPRequests(message, walletAddress)
    
    // Prepare messages for OpenAI with MCP context
    const systemMessage = {
      role: 'system' as const,
      content: `You are Seiron, a powerful dragon AI assistant specializing in DeFi, portfolio management, and blockchain technology on the Sei Network. 
      You speak with wisdom and authority, occasionally making dragon-themed references.
      You are helpful, knowledgeable, and focused on providing valuable insights about cryptocurrency and DeFi.
      ${walletAddress ? `The user's wallet address is: ${walletAddress}` : ''}
      ${mcpData.context ? `\n\nCurrent context: ${mcpData.context}` : ''}`
    }

    const conversationMessages = [
      systemMessage,
      ...messages,
      { role: 'user' as const, content: message }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'

    // Return response in the expected format
    res.status(200).setHeaders(corsHeaders).json({
      success: true,
      data: {
        response,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o-mini',
        usage: completion.usage || {}
      }
    })

  } catch (error) {
    console.error('Chat orchestration error:', error)
    
    res.status(500).setHeaders(corsHeaders).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}

// MCP request handler
async function handleMCPRequests(message: string, walletAddress?: string) {
  const lowerMessage = message.toLowerCase()
  let context = ''
  
  try {
    // Check for market data requests
    if (lowerMessage.includes('price') || lowerMessage.includes('market') || lowerMessage.includes('chart')) {
      const symbols = extractSymbols(message)
      if (symbols.length > 0) {
        const marketData = await callMCPTool('hive', 'getMarketData', { symbols })
        context += `Market Data: ${marketData}\n`
      }
    }
    
    // Check for wallet/portfolio requests
    if (walletAddress && (lowerMessage.includes('balance') || lowerMessage.includes('portfolio') || lowerMessage.includes('holdings'))) {
      const balanceData = await callMCPTool('sei', 'getWalletBalance', { address: walletAddress })
      context += `Wallet Balance: ${balanceData}\n`
      
      const portfolioAnalysis = await callMCPTool('portfolio', 'analyzePortfolioComposition', { walletAddress })
      context += `Portfolio Analysis: ${portfolioAnalysis}\n`
    }
    
    // Check for transaction requests
    if (walletAddress && (lowerMessage.includes('transaction') || lowerMessage.includes('history') || lowerMessage.includes('tx'))) {
      const txHistory = await callMCPTool('sei', 'getTransactionHistory', { address: walletAddress, limit: 5 })
      context += `Recent Transactions: ${txHistory}\n`
    }
    
    // Check for performance/analytics requests
    if (walletAddress && (lowerMessage.includes('performance') || lowerMessage.includes('return') || lowerMessage.includes('profit'))) {
      const performance = await callMCPTool('portfolio', 'getHistoricalPerformance', { walletAddress, timeframe: '30d' })
      context += `Performance Data: ${performance}\n`
    }
    
  } catch (error) {
    console.warn('MCP request failed:', error)
    context += 'Note: Real-time data temporarily unavailable. '
  }
  
  return { context }
}

// Helper function to call MCP tools
async function callMCPTool(server: keyof typeof MCP_SERVERS, tool: string, args: any) {
  try {
    const response = await fetch(`${MCP_SERVERS[server]}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args }),
      timeout: 10000
    })
    
    if (!response.ok) {
      throw new Error(`MCP ${server} error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.result || data.content || 'No data available'
    
  } catch (error) {
    console.warn(`MCP ${server}/${tool} failed:`, error)
    return null
  }
}

// Extract cryptocurrency symbols from user message
function extractSymbols(message: string): string[] {
  const commonSymbols = ['SEI', 'BTC', 'ETH', 'USDC', 'USDT', 'ATOM', 'OSMO']
  const symbols = []
  
  for (const symbol of commonSymbols) {
    if (message.toUpperCase().includes(symbol)) {
      symbols.push(symbol)
    }
  }
  
  // Default to SEI if no symbols found
  return symbols.length > 0 ? symbols : ['SEI']
}