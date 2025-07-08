import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

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

// Helper function to set CORS headers
function setCorsHeaders(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
    res.status(200).end()
    return
  }

  // Only allow POST
  if (req.method !== 'POST') {
    setCorsHeaders(res)
    res.status(405).json({ 
      error: 'Method not allowed' 
    })
    return
  }

  try {
    const { message, sessionId, walletAddress, messages = [] } = req.body

    if (!message) {
      setCorsHeaders(res)
      res.status(400).json({ 
        error: 'Message is required' 
      })
      return
    }

    // Prepare messages for OpenAI
    const systemMessage = {
      role: 'system' as const,
      content: `You are Seiron, a powerful dragon AI assistant specializing in DeFi, portfolio management, and blockchain technology on the Sei Network. 
      You speak with wisdom and authority, occasionally making dragon-themed references.
      You are helpful, knowledgeable, and focused on providing valuable insights about cryptocurrency and DeFi.
      ${walletAddress ? `The user's wallet address is: ${walletAddress}` : ''}`
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
    setCorsHeaders(res)
    res.status(200).json({
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
    
    setCorsHeaders(res)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}