import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  const { sessionId } = query
  
  if (method === 'GET') {
    return res.status(200).json({
      success: true,
      data: {
        messages: [],
        total: 0,
        page: 1,
        limit: 20,
        sessionId
      }
    })
  }
  
  res.setHeader('Allow', ['GET'])
  res.status(405).end(`Method ${method} Not Allowed`)
}