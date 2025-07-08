import { NextApiRequest, NextApiResponse } from 'next'

// TypeScript interfaces for message handling
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

interface MessagesResponse {
  success: boolean
  data?: {
    messages: ChatMessage[]
    sessionId: string
    total: number
    page: number
    limit: number
  }
  error?: string
}

interface AddMessageRequest {
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
}

interface AddMessageResponse {
  success: boolean
  data?: {
    message: ChatMessage
    sessionId: string
  }
  error?: string
}

// Mock in-memory storage for messages (in production, use a real database)
const mockMessages: Record<string, ChatMessage[]> = {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessagesResponse | AddMessageResponse>
) {
  const { method } = req
  const { sessionId } = req.query

  // Validate sessionId
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid session ID'
    })
  }

  // GET: Retrieve messages for a session
  if (method === 'GET') {
    try {
      const { page = '1', limit = '50' } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = parseInt(limit as string, 10)

      // Validate pagination parameters
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid page number'
        })
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit (must be between 1 and 100)'
        })
      }

      // Get messages for this session (or empty array if none exist)
      const sessionMessages = mockMessages[sessionId] || []
      const total = sessionMessages.length
      
      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum
      const endIndex = startIndex + limitNum
      const paginatedMessages = sessionMessages.slice(startIndex, endIndex)

      return res.status(200).json({
        success: true,
        data: {
          messages: paginatedMessages,
          sessionId,
          total,
          page: pageNum,
          limit: limitNum
        }
      })

    } catch (error) {
      console.error('Error retrieving messages:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST: Add a message to a session
  if (method === 'POST') {
    try {
      const { role, content, metadata = {} }: AddMessageRequest = req.body

      // Validate required fields
      if (!role || !content) {
        return res.status(400).json({
          success: false,
          error: 'Role and content are required'
        })
      }

      // Validate role
      if (!['user', 'assistant', 'system'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Role must be user, assistant, or system'
        })
      }

      // Validate content
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Content must be a non-empty string'
        })
      }

      // Create new message
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        metadata
      }

      // Initialize session messages array if it doesn't exist
      if (!mockMessages[sessionId]) {
        mockMessages[sessionId] = []
      }

      // Add message to session
      mockMessages[sessionId].push(newMessage)

      return res.status(201).json({
        success: true,
        data: {
          message: newMessage,
          sessionId
        }
      })

    } catch (error) {
      console.error('Error adding message:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({
    success: false,
    error: `Method ${method} Not Allowed`
  })
}