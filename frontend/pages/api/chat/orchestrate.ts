import { NextApiRequest, NextApiResponse } from 'next'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  message: string
  sessionId?: string
  messages?: ChatMessage[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const { message, sessionId, messages = [] }: ChatRequest = req.body

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    // Build conversation history
    const conversationMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are Seiron, a powerful AI assistant with Dragon Ball Z personality. You are knowledgeable about cryptocurrency, DeFi, and portfolio management on the Sei blockchain. Respond with enthusiasm and power like a Dragon Ball Z character, but provide helpful and accurate information.

Key traits:
- Use Dragon Ball Z themed language occasionally (power levels, training, etc.)
- Be confident and energetic in your responses
- Provide practical crypto/DeFi advice
- Reference Sei blockchain when relevant
- End important responses with "🐉" emoji`
      },
      ...messages,
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return res.status(openaiResponse.status).json({ 
        error: 'Failed to generate response',
        details: errorData 
      })
    }

    const openaiData = await openaiResponse.json()
    const assistantMessage = openaiData.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return res.status(500).json({ error: 'No response generated' })
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      data: {
        response: assistantMessage,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o',
        usage: openaiData.usage
      }
    })

  } catch (error) {
    console.error('Chat orchestration error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}