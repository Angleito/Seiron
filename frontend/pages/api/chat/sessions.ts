import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  
  if (method === 'GET') {
    // Return mock sessions for now
    return res.status(200).json({
      success: true,
      data: {
        sessions: [],
        total: 0,
        page: 1,
        limit: 20
      }
    })
  }
  
  if (method === 'POST') {
    // Create mock session
    return res.status(201).json({
      success: true,
      data: {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: req.body.title || 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        metadata: req.body.metadata || {},
        is_archived: false,
        message_count: 0
      }
    })
  }
  
  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${method} Not Allowed`)
}