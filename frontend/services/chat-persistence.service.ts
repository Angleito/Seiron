import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { logger } from '@lib/logger'
import { apiClient } from '../utils/apiClient'

// API Types based on the backend endpoints
export interface ChatSession {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  last_message_at: string
  metadata?: Record<string, unknown>
  is_archived: boolean
  message_count: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
  sequence_number: number
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextCursor?: string
}

export interface SessionsResponse {
  sessions: ChatSession[]
  pagination: PaginationInfo
  stats: {
    total_sessions: number
    active_sessions: number
    archived_sessions: number
    total_messages: number
  }
  filters: {
    search?: string
    archived: boolean
  }
}

export interface MessagesResponse {
  session: {
    id: string
    title: string
    created_at: string
    updated_at: string
    last_message_at: string
  }
  messages: ChatMessage[]
  pagination: PaginationInfo
}

export interface ChatPersistenceError {
  type: 'network' | 'validation' | 'permission' | 'server' | 'unknown' | 'warning'
  message: string
  details?: Record<string, unknown>
}

export interface SessionsQueryParams {
  page?: number
  limit?: number
  search?: string
  archived?: boolean
  order?: 'asc' | 'desc'
}

export interface MessagesQueryParams {
  page?: number
  limit?: number
  cursor?: string
  order?: 'asc' | 'desc'
}

/**
 * Service for managing chat persistence with Supabase backend
 * Uses functional programming patterns with fp-ts
 */
export class ChatPersistenceService {
  private readonly apiBaseUrl: string
  private readonly defaultUserId: string

  constructor(apiBaseUrl: string = '/api/chat', defaultUserId: string = 'anonymous') {
    this.apiBaseUrl = apiBaseUrl
    this.defaultUserId = defaultUserId
  }

  /**
   * Get all chat sessions for a user
   */
  getSessions = (
    userId: string = this.defaultUserId,
    params: SessionsQueryParams = {}
  ): TE.TaskEither<ChatPersistenceError, SessionsResponse> =>
    pipe(
      TE.tryCatch(
        async () => {
          const searchParams = new URLSearchParams({
            page: String(params.page || 1),
            limit: String(params.limit || 20),
            archived: String(params.archived || false),
            order: params.order || 'desc',
            ...(params.search && { search: params.search })
          })

          const data = await apiClient.get<SessionsResponse>(
            `${this.apiBaseUrl}/sessions?${searchParams}`
          )

          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch sessions')
          }

          return data
        },
        (error) => this.handleError(error, 'Failed to fetch sessions')
      ),
      TE.map((response) => {
        logger.debug('Chat sessions fetched successfully', {
          userId,
          sessionCount: response.sessions.length,
          params
        })
        return response
      })
    )

  /**
   * Get messages for a specific session
   */
  getMessages = (
    sessionId: string,
    userId: string = this.defaultUserId,
    params: MessagesQueryParams = {}
  ): TE.TaskEither<ChatPersistenceError, MessagesResponse> =>
    pipe(
      TE.tryCatch(
        async () => {
          const searchParams = new URLSearchParams({
            page: String(params.page || 1),
            limit: String(params.limit || 20),
            order: params.order || 'desc',
            ...(params.cursor && { cursor: params.cursor })
          })

          const data = await apiClient.get<MessagesResponse>(
            `${this.apiBaseUrl}/messages/${sessionId}?${searchParams}`
          )

          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch messages')
          }

          return data
        },
        (error) => this.handleError(error, 'Failed to fetch messages')
      ),
      TE.map((response) => {
        logger.debug('Chat messages fetched successfully', {
          sessionId,
          userId,
          messageCount: response.messages.length,
          params
        })
        return response
      })
    )

  /**
   * Create a new chat session
   */
  createSession = (
    title: string,
    description?: string,
    userId: string = this.defaultUserId,
    metadata?: Record<string, unknown>
  ): TE.TaskEither<ChatPersistenceError, ChatSession> =>
    pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(`${this.apiBaseUrl}/sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify({
              title,
              description,
              metadata
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to create session')
          }

          return data.session as ChatSession
        },
        (error) => this.handleError(error, 'Failed to create session')
      ),
      TE.map((session) => {
        logger.info('Chat session created successfully', {
          sessionId: session.id,
          userId,
          title
        })
        return session
      })
    )

  /**
   * Update a chat session
   */
  updateSession = (
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'title' | 'description' | 'metadata' | 'is_archived'>>,
    userId: string = this.defaultUserId
  ): TE.TaskEither<ChatPersistenceError, ChatSession> =>
    pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify(updates)
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to update session')
          }

          return data.session as ChatSession
        },
        (error) => this.handleError(error, 'Failed to update session')
      ),
      TE.map((session) => {
        logger.info('Chat session updated successfully', {
          sessionId,
          userId,
          updates
        })
        return session
      })
    )

  /**
   * Delete a chat session
   */
  deleteSession = (
    sessionId: string,
    userId: string = this.defaultUserId
  ): TE.TaskEither<ChatPersistenceError, void> =>
    pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to delete session')
          }
        },
        (error) => this.handleError(error, 'Failed to delete session')
      ),
      TE.map(() => {
        logger.info('Chat session deleted successfully', {
          sessionId,
          userId
        })
      })
    )

  /**
   * Archive/unarchive a session
   */
  archiveSession = (
    sessionId: string,
    archived: boolean,
    userId: string = this.defaultUserId
  ): TE.TaskEither<ChatPersistenceError, ChatSession> =>
    this.updateSession(sessionId, { is_archived: archived }, userId)

  /**
   * Get session statistics
   */
  getSessionStats = (
    userId: string = this.defaultUserId
  ): TE.TaskEither<ChatPersistenceError, SessionsResponse['stats']> =>
    pipe(
      this.getSessions(userId, { limit: 1 }),
      TE.map(response => response.stats)
    )

  /**
   * Search sessions by title or content
   */
  searchSessions = (
    query: string,
    userId: string = this.defaultUserId,
    params: Omit<SessionsQueryParams, 'search'> = {}
  ): TE.TaskEither<ChatPersistenceError, SessionsResponse> =>
    this.getSessions(userId, { ...params, search: query })

  /**
   * Get recent sessions (last 10)
   */
  getRecentSessions = (
    userId: string = this.defaultUserId,
    limit: number = 10
  ): TE.TaskEither<ChatPersistenceError, ChatSession[]> =>
    pipe(
      this.getSessions(userId, { limit, order: 'desc' }),
      TE.map(response => response.sessions)
    )

  /**
   * Handle and categorize errors
   */
  private handleError = (error: unknown, context: string): ChatPersistenceError => {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          type: 'network',
          message: 'Network connection failed',
          details: { originalError: error.message, context }
        }
      }
      
      // HTTP errors
      if (error.message.includes('HTTP 400') || error.message.includes('HTTP 422')) {
        return {
          type: 'validation',
          message: 'Invalid request data',
          details: { originalError: error.message, context }
        }
      }
      
      if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
        return {
          type: 'permission',
          message: 'Access denied',
          details: { originalError: error.message, context }
        }
      }
      
      if (error.message.includes('HTTP 5')) {
        return {
          type: 'server',
          message: 'Server error',
          details: { originalError: error.message, context }
        }
      }
      
      return {
        type: 'unknown',
        message: error.message,
        details: { context }
      }
    }
    
    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      details: { error: String(error), context }
    }
  }
}

// Default service instance
export const chatPersistenceService = new ChatPersistenceService()