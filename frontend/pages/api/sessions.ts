import type { NextApiRequest, NextApiResponse } from 'next'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface SessionsQueryParams {
  page?: string
  limit?: string
  search?: string
  archived?: string
  order?: string
}

interface ErrorResponse {
  success: false
  error: string
}

interface SuccessResponse {
  success: true
  sessions?: any[]
  session?: any
  pagination?: any
  stats?: any
  filters?: any
}

type ApiResponse = SuccessResponse | ErrorResponse

/**
 * Proxy requests to the backend Supabase service
 */
async function proxyToBackend(
  method: string,
  path: string,
  userId: string,
  body?: any,
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
    ...(body && { body: JSON.stringify(body) }),
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

  try {
    switch (req.method) {
      case 'GET': {
        // Get sessions with pagination and filters
        const params = req.query as SessionsQueryParams
        const searchParams = new URLSearchParams({
          page: params.page || '1',
          limit: params.limit || '20',
          archived: params.archived || 'false',
          order: params.order || 'desc',
          ...(params.search && { search: params.search }),
        })

        const data = await proxyToBackend(
          'GET',
          '/api/chat/sessions/',
          userId,
          null,
          searchParams
        )

        res.status(200).json({
          success: true,
          ...data,
        })
        break
      }

      case 'POST': {
        // Create new session
        const { title, description, metadata } = req.body

        if (!title) {
          res.status(400).json({
            success: false,
            error: 'Title is required',
          })
          return
        }

        const data = await proxyToBackend(
          'POST',
          '/api/chat/sessions',
          userId,
          { title, description, metadata }
        )

        res.status(201).json({
          success: true,
          session: data.session,
        })
        break
      }

      case 'PATCH': {
        // Update session (requires sessionId in body or query)
        const sessionId = req.query.sessionId as string || req.body.sessionId

        if (!sessionId) {
          res.status(400).json({
            success: false,
            error: 'Session ID is required',
          })
          return
        }

        const { title, description, metadata, is_archived } = req.body

        const data = await proxyToBackend(
          'PATCH',
          `/api/chat/sessions/${sessionId}`,
          userId,
          { title, description, metadata, is_archived }
        )

        res.status(200).json({
          success: true,
          session: data.session,
        })
        break
      }

      case 'DELETE': {
        // Delete session
        const sessionId = req.query.sessionId as string

        if (!sessionId) {
          res.status(400).json({
            success: false,
            error: 'Session ID is required',
          })
          return
        }

        await proxyToBackend(
          'DELETE',
          `/api/chat/sessions/${sessionId}`,
          userId
        )

        res.status(200).json({
          success: true,
        })
        break
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
        res.status(405).json({
          success: false,
          error: 'Method not allowed',
        })
    }
  } catch (error) {
    console.error('Sessions API error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}