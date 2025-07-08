import type { NextApiRequest, NextApiResponse } from 'next'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface MessagesQueryParams {
  page?: string
  limit?: string
  cursor?: string
  order?: string
}

interface ErrorResponse {
  success: false
  error: string
}

interface SuccessResponse {
  success: true
  session?: any
  messages?: any[]
  pagination?: any
}

type ApiResponse = SuccessResponse | ErrorResponse

/**
 * Proxy requests to the backend Supabase service
 */
async function proxyToBackend(
  method: string,
  path: string,
  userId: string,
  query?: URLSearchParams
): Promise<any> {
  const url = new URL(`${BACKEND_API_URL}${path}`)
  if (query) {
    url.search = query.toString()
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Backend error: ${response.status} - ${error}`)
  }

  return response.json()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const userId = req.headers['x-user-id'] as string || 'anonymous'
  const sessionId = req.query.sessionId as string

  if (!sessionId) {
    res.status(400).json({
      success: false,
      error: 'Session ID is required',
    })
    return
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get messages for session with pagination
        const params = req.query as MessagesQueryParams
        const searchParams = new URLSearchParams({
          page: params.page || '1',
          limit: params.limit || '20',
          order: params.order || 'desc',
          ...(params.cursor && { cursor: params.cursor }),
        })

        const data = await proxyToBackend(
          'GET',
          `/api/chat/sessions/messages/${sessionId}`,
          userId,
          searchParams
        )

        res.status(200).json({
          success: true,
          ...data,
        })
        break
      }

      default:
        res.setHeader('Allow', ['GET'])
        res.status(405).json({
          success: false,
          error: 'Method not allowed',
        })
    }
  } catch (error) {
    console.error('Messages API error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}