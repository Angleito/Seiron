import { useState, useEffect, useCallback, useMemo } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { 
  ChatPersistenceService,
  ChatMessage,
  MessagesResponse,
  ChatPersistenceError,
  MessagesQueryParams,
  chatPersistenceService 
} from '../services/chat-persistence.service'
import { logger } from '@lib/logger'

export interface UseChatHistoryOptions {
  sessionId: string
  userId?: string
  persistenceService?: ChatPersistenceService
  initialParams?: MessagesQueryParams
  autoLoad?: boolean
  onMessagesLoaded?: (messages: ChatMessage[]) => void
}

export interface UseChatHistoryReturn {
  // Data
  messages: ChatMessage[]
  sessionInfo: MessagesResponse['session'] | null
  pagination: MessagesResponse['pagination'] | null
  
  // State
  isLoading: boolean
  isLoadingMore: boolean
  error: ChatPersistenceError | null
  
  // Actions
  loadMessages: (params?: MessagesQueryParams) => Promise<void>
  loadMoreMessages: () => Promise<void>
  refreshMessages: () => Promise<void>
  clearError: () => void
  
  // Computed
  totalMessages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  oldestMessage: ChatMessage | null
  newestMessage: ChatMessage | null
  
  // Pagination
  goToPage: (page: number) => Promise<void>
  goToNextPage: () => Promise<void>
  goToPreviousPage: () => Promise<void>
  
  // Filters
  currentParams: MessagesQueryParams
  setParams: (params: MessagesQueryParams) => void
}

export function useChatHistory(options: UseChatHistoryOptions): UseChatHistoryReturn {
  const {
    sessionId,
    userId = 'anonymous',
    persistenceService = chatPersistenceService,
    initialParams = { page: 1, limit: 20, order: 'desc' },
    autoLoad = true,
    onMessagesLoaded
  } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionInfo, setSessionInfo] = useState<MessagesResponse['session'] | null>(null)
  const [pagination, setPagination] = useState<MessagesResponse['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<ChatPersistenceError | null>(null)
  const [currentParams, setCurrentParams] = useState<MessagesQueryParams>(initialParams)

  // Computed values
  const totalMessages = useMemo(() => 
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

  const oldestMessage = useMemo(() => {
    if (messages.length === 0) return null
    return messages.reduce((oldest, message) => 
      new Date(message.created_at) < new Date(oldest.created_at) ? message : oldest
    )
  }, [messages])

  const newestMessage = useMemo(() => {
    if (messages.length === 0) return null
    return messages.reduce((newest, message) => 
      new Date(message.created_at) > new Date(newest.created_at) ? message : newest
    )
  }, [messages])

  // Load messages
  const loadMessages = useCallback(async (params: MessagesQueryParams = currentParams) => {
    if (isLoading || !sessionId) return
    
    setIsLoading(true)
    setError(null)
    
    logger.debug('Loading chat messages', { sessionId, userId, params })
    
    const result = await persistenceService.getMessages(sessionId, userId, params)()
    
    pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to load chat messages', { error, sessionId, userId, params })
          setError(error)
          setIsLoading(false)
        },
        (response) => {
          logger.debug('Chat messages loaded successfully', { 
            messageCount: response.messages.length, 
            sessionId, 
            userId, 
            params 
          })
          setMessages(response.messages)
          setSessionInfo(response.session)
          setPagination(response.pagination)
          setCurrentParams(params)
          setIsLoading(false)
          
          // Call callback if provided
          onMessagesLoaded?.(response.messages)
        }
      )
    )
  }, [sessionId, userId, persistenceService, currentParams, isLoading, onMessagesLoaded])

  // Load more messages (for infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasNextPage || !pagination) return
    
    setIsLoadingMore(true)
    setError(null)
    
    const nextParams = {
      ...currentParams,
      page: pagination.page + 1
    }
    
    logger.debug('Loading more chat messages', { sessionId, userId, nextParams })
    
    const result = await persistenceService.getMessages(sessionId, userId, nextParams)()
    
    pipe(
      result,
      E.fold(
        (error) => {
          logger.error('Failed to load more chat messages', { error, sessionId, userId, nextParams })
          setError(error)
          setIsLoadingMore(false)
        },
        (response) => {
          logger.debug('More chat messages loaded successfully', { 
            messageCount: response.messages.length, 
            sessionId, 
            userId 
          })
          
          // Append new messages to existing ones
          setMessages(prev => [...prev, ...response.messages])
          setPagination(response.pagination)
          setCurrentParams(nextParams)
          setIsLoadingMore(false)
          
          // Call callback if provided
          onMessagesLoaded?.(response.messages)
        }
      )
    )
  }, [sessionId, userId, persistenceService, currentParams, isLoadingMore, hasNextPage, pagination, onMessagesLoaded])

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await loadMessages(currentParams)
  }, [loadMessages, currentParams])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Pagination actions
  const goToPage = useCallback(async (page: number) => {
    if (page < 1) return
    await loadMessages({ ...currentParams, page })
  }, [loadMessages, currentParams])

  const goToNextPage = useCallback(async () => {
    if (!hasNextPage || !pagination) return
    await goToPage(pagination.page + 1)
  }, [goToPage, hasNextPage, pagination])

  const goToPreviousPage = useCallback(async () => {
    if (!hasPreviousPage || !pagination) return
    await goToPage(pagination.page - 1)
  }, [goToPage, hasPreviousPage, pagination])

  // Set params
  const setParams = useCallback((params: MessagesQueryParams) => {
    setCurrentParams(params)
  }, [])

  // Auto-load on mount or when sessionId changes
  useEffect(() => {
    if (autoLoad && sessionId) {
      loadMessages(initialParams)
    }
  }, [sessionId]) // Only run when sessionId changes

  // Clear messages when sessionId changes
  useEffect(() => {
    if (sessionId) {
      setMessages([])
      setSessionInfo(null)
      setPagination(null)
      setError(null)
    }
  }, [sessionId])

  return {
    // Data
    messages,
    sessionInfo,
    pagination,
    
    // State
    isLoading,
    isLoadingMore,
    error,
    
    // Actions
    loadMessages,
    loadMoreMessages,
    refreshMessages,
    clearError,
    
    // Computed
    totalMessages,
    hasNextPage,
    hasPreviousPage,
    oldestMessage,
    newestMessage,
    
    // Pagination
    goToPage,
    goToNextPage,
    goToPreviousPage,
    
    // Filters
    currentParams,
    setParams
  }
}