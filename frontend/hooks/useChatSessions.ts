import { useState, useEffect, useCallback, useMemo } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { 
  ChatPersistenceService,
  ChatSession,
  SessionsResponse,
  ChatPersistenceError,
  SessionsQueryParams,
  chatPersistenceService 
} from '../services/chat-persistence.service'
import { logger } from '@/lib/logger'

export interface UseChatSessionsOptions {
  userId?: string
  persistenceService?: ChatPersistenceService
  initialParams?: SessionsQueryParams
  autoLoad?: boolean
}

export interface UseChatSessionsReturn {
  // Data
  sessions: ChatSession[]
  stats: SessionsResponse['stats'] | null
  pagination: SessionsResponse['pagination'] | null
  
  // State
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: ChatPersistenceError | null
  
  // Actions
  loadSessions: (params?: SessionsQueryParams) => Promise<void>
  createSession: (title: string, description?: string, metadata?: Record<string, unknown>) => Promise<ChatSession | null>
  updateSession: (sessionId: string, updates: Partial<Pick<ChatSession, 'title' | 'description' | 'metadata' | 'is_archived'>>) => Promise<ChatSession | null>
  deleteSession: (sessionId: string) => Promise<boolean>
  archiveSession: (sessionId: string, archived: boolean) => Promise<ChatSession | null>
  searchSessions: (query: string, params?: Omit<SessionsQueryParams, 'search'>) => Promise<void>
  getRecentSessions: (limit?: number) => Promise<void>
  refreshSessions: () => Promise<void>
  clearError: () => void
  
  // Computed
  activeSessions: ChatSession[]
  archivedSessions: ChatSession[]
  totalSessions: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  
  // Pagination
  goToPage: (page: number) => Promise<void>
  goToNextPage: () => Promise<void>
  goToPreviousPage: () => Promise<void>
  
  // Filters
  currentParams: SessionsQueryParams
  setParams: (params: SessionsQueryParams) => void
}

export function useChatSessions(options: UseChatSessionsOptions = {}): UseChatSessionsReturn {
  const {
    userId = 'anonymous',
    persistenceService = chatPersistenceService,
    initialParams = { page: 1, limit: 20, archived: false, order: 'desc' },
    autoLoad = true
  } = options

  // State
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<SessionsResponse['stats'] | null>(null)
  const [pagination, setPagination] = useState<SessionsResponse['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<ChatPersistenceError | null>(null)
  const [currentParams, setCurrentParams] = useState<SessionsQueryParams>(initialParams)

  // Computed values
  const activeSessions = useMemo(() => 
    sessions.filter(session => !session.is_archived), 
    [sessions]
  )
  
  const archivedSessions = useMemo(() => 
    sessions.filter(session => session.is_archived), 
    [sessions]
  )
  
  const totalSessions = useMemo(() => 
    pagination?.total || 0, 
    [pagination]
  )
  
  const hasNextPage = useMemo(() => 
    pagination?.hasNext || false, 
    [pagination]
  )
  
  const hasPreviousPage = useMemo(() => 
    pagination?.hasPrev || false, 
    [pagination]
  )

  // Load sessions
  const loadSessions = useCallback(async (params: SessionsQueryParams = currentParams) => {
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)
    
    logger.debug('Loading chat sessions', { userId, params })
    
    const result = await persistenceService.getSessions(userId, params)()
    
    pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to load chat sessions', { error, userId, params })
          setError(error)
          setIsLoading(false)
        },
        (response) => {
          logger.debug('Chat sessions loaded successfully', { 
            sessionCount: response.sessions.length, 
            userId, 
            params 
          })
          setSessions(response.sessions)
          setStats(response.stats)
          setPagination(response.pagination)
          setCurrentParams(params)
          setIsLoading(false)
        }
      )
    )
  }, [userId, persistenceService, currentParams, isLoading])

  // Create session
  const createSession = useCallback(async (
    title: string, 
    description?: string, 
    metadata?: Record<string, unknown>
  ): Promise<ChatSession | null> => {
    if (isCreating) return null
    
    setIsCreating(true)
    setError(null)
    
    logger.debug('Creating chat session', { userId, title })
    
    const result = await persistenceService.createSession(title, description, userId, metadata)()
    
    return pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to create chat session', { error, userId, title })
          setError(error)
          setIsCreating(false)
          return null
        },
        (session) => {
          logger.info('Chat session created successfully', { sessionId: session.id, userId, title })
          setSessions(prev => [session, ...prev])
          if (stats) {
            setStats(prev => prev ? {
              ...prev,
              total_sessions: prev.total_sessions + 1,
              active_sessions: prev.active_sessions + 1
            } : null)
          }
          setIsCreating(false)
          return session
        }
      )
    )
  }, [userId, persistenceService, isCreating, stats])

  // Update session
  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'title' | 'description' | 'metadata' | 'is_archived'>>
  ): Promise<ChatSession | null> => {
    if (isUpdating) return null
    
    setIsUpdating(true)
    setError(null)
    
    logger.debug('Updating chat session', { sessionId, userId, updates })
    
    const result = await persistenceService.updateSession(sessionId, updates, userId)()
    
    return pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to update chat session', { error, sessionId, userId })
          setError(error)
          setIsUpdating(false)
          return null
        },
        (session) => {
          logger.info('Chat session updated successfully', { sessionId, userId })
          setSessions(prev => prev.map(s => s.id === sessionId ? session : s))
          setIsUpdating(false)
          return session
        }
      )
    )
  }, [userId, persistenceService, isUpdating])

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (isDeleting) return false
    
    setIsDeleting(true)
    setError(null)
    
    logger.debug('Deleting chat session', { sessionId, userId })
    
    const result = await persistenceService.deleteSession(sessionId, userId)()
    
    return pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to delete chat session', { error, sessionId, userId })
          setError(error)
          setIsDeleting(false)
          return false
        },
        () => {
          logger.info('Chat session deleted successfully', { sessionId, userId })
          setSessions(prev => prev.filter(s => s.id !== sessionId))
          if (stats) {
            setStats(prev => prev ? {
              ...prev,
              total_sessions: prev.total_sessions - 1,
              active_sessions: prev.active_sessions - 1
            } : null)
          }
          setIsDeleting(false)
          return true
        }
      )
    )
  }, [userId, persistenceService, isDeleting, stats])

  // Archive session
  const archiveSession = useCallback(async (sessionId: string, archived: boolean): Promise<ChatSession | null> => {
    return updateSession(sessionId, { is_archived: archived })
  }, [updateSession])

  // Search sessions
  const searchSessions = useCallback(async (
    query: string, 
    params: Omit<SessionsQueryParams, 'search'> = {}
  ) => {
    await loadSessions({ ...params, search: query })
  }, [loadSessions])

  // Get recent sessions
  const getRecentSessions = useCallback(async (limit: number = 10) => {
    await loadSessions({ limit, order: 'desc' })
  }, [loadSessions])

  // Refresh sessions
  const refreshSessions = useCallback(async () => {
    await loadSessions(currentParams)
  }, [loadSessions, currentParams])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Pagination actions
  const goToPage = useCallback(async (page: number) => {
    if (page < 1) return
    await loadSessions({ ...currentParams, page })
  }, [loadSessions, currentParams])

  const goToNextPage = useCallback(async () => {
    if (!hasNextPage || !pagination) return
    await goToPage(pagination.page + 1)
  }, [goToPage, hasNextPage, pagination])

  const goToPreviousPage = useCallback(async () => {
    if (!hasPreviousPage || !pagination) return
    await goToPage(pagination.page - 1)
  }, [goToPage, hasPreviousPage, pagination])

  // Set params
  const setParams = useCallback((params: SessionsQueryParams) => {
    setCurrentParams(params)
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadSessions(initialParams)
    }
  }, []) // Only run on mount

  return {
    // Data
    sessions,
    stats,
    pagination,
    
    // State
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    
    // Actions
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    archiveSession,
    searchSessions,
    getRecentSessions,
    refreshSessions,
    clearError,
    
    // Computed
    activeSessions,
    archivedSessions,
    totalSessions,
    hasNextPage,
    hasPreviousPage,
    
    // Pagination
    goToPage,
    goToNextPage,
    goToPreviousPage,
    
    // Filters
    currentParams,
    setParams
  }
}