import { useState, useEffect, useCallback, useRef } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { logger } from '@lib/logger'
import { apiClient } from '../../utils/apiClient'

export interface AIMemoryEntry {
  id: string
  userId: string
  sessionId: string
  key: string
  value: any
  category: 'preference' | 'context' | 'fact' | 'interaction'
  confidence: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

export interface AIMemoryState {
  entries: AIMemoryEntry[]
  isLoading: boolean
  error: Error | null
  lastSync: Date | null
  backendAvailable: boolean
  failedAttempts: number
}

export interface UseAIMemoryOptions {
  userId: string
  sessionId?: string
  autoSync?: boolean
  syncInterval?: number // milliseconds
  cacheEnabled?: boolean
  onSyncError?: (error: Error) => void
}

interface AIMemoryCache {
  entries: Map<string, AIMemoryEntry>
  lastUpdated: Date
}

// Memory API endpoints (using unified API client)
const MEMORY_API = {
  load: '/api/ai/memory/load',
  save: '/api/ai/memory/save',
  update: '/api/ai/memory/update',
  delete: '/api/ai/memory/delete',
  search: '/api/ai/memory/search'
}

export function useAIMemory({
  userId,
  sessionId,
  autoSync = true,
  syncInterval = 30000, // 30 seconds
  cacheEnabled = true,
  onSyncError
}: UseAIMemoryOptions) {
  const [state, setState] = useState<AIMemoryState>({
    entries: [],
    isLoading: false,
    error: null,
    lastSync: null,
    backendAvailable: true,
    failedAttempts: 0
  })

  const cacheRef = useRef<AIMemoryCache>({
    entries: new Map(),
    lastUpdated: new Date()
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout>()

  // Load memories from backend via API with exponential backoff
  const loadMemories = useCallback(() => {
    // Skip if too many failed attempts (exponential backoff)
    if (state.failedAttempts >= 3) {
      const backoffTime = Math.pow(2, state.failedAttempts) * 1000 // 8s, 16s, 32s, etc.
      const timeSinceLastSync = state.lastSync ? Date.now() - state.lastSync.getTime() : Infinity
      
      if (timeSinceLastSync < backoffTime) {
        logger.warn(`Skipping AI memory sync due to exponential backoff (${state.failedAttempts} failed attempts)`)
        return Promise.resolve(E.right(state.entries))
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    return pipe(
      TE.tryCatch(
        async () => {
          const params = new URLSearchParams({ userId })
          if (sessionId) params.append('sessionId', sessionId)

          const result = await apiClient.get<AIMemoryEntry[]>(`${MEMORY_API.load}?${params}`)
          return result
        },
        (error) => error as Error
      ),
      TE.map((result: any) => {
        const data = result as { memories: AIMemoryEntry[], success?: boolean }
        const entries = data.memories.map(m => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
          expiresAt: m.expiresAt ? new Date(m.expiresAt) : undefined
        }))

        // Update cache
        if (cacheEnabled) {
          cacheRef.current.entries.clear()
          entries.forEach(entry => {
            cacheRef.current.entries.set(entry.key, entry)
          })
          cacheRef.current.lastUpdated = new Date()
        }

        // Reset failed attempts on success
        setState({
          entries,
          isLoading: false,
          error: null,
          lastSync: new Date(),
          backendAvailable: true,
          failedAttempts: 0
        })

        return entries
      }),
      TE.mapLeft((error) => {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error,
          backendAvailable: false,
          failedAttempts: prev.failedAttempts + 1
        }))
        logger.error(`Failed to load AI memories (attempt ${state.failedAttempts + 1}):`, error)
        onSyncError?.(error)
        return error
      })
    )()
  }, [userId, sessionId, cacheEnabled, onSyncError, state.failedAttempts, state.lastSync, state.entries])

  // Save a new memory entry
  const saveMemory = useCallback(async (
    key: string,
    value: any,
    category: AIMemoryEntry['category'] = 'context',
    confidence: number = 1.0
  ): Promise<E.Either<Error, AIMemoryEntry>> => {
    const entry: Omit<AIMemoryEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      sessionId: sessionId || 'global',
      key,
      value,
      category,
      confidence
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(MEMORY_API.save, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          })

          if (!response.ok) {
            throw new Error(`Failed to save memory: ${response.statusText}`)
          }

          // Validate content-type before parsing JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Expected JSON response but got ${contentType}. Response preview: ${preview}...`)
            throw new Error(`Invalid response type: Expected JSON but received ${contentType || 'unknown'}. This may indicate an HTML error page.`)
          }

          try {
            return await response.json()
          } catch (parseError) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Failed to parse JSON response. Response preview: ${preview}...`)
            throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
          }
        },
        (error) => error as Error
      ),
      TE.map((saved: AIMemoryEntry) => {
        const newEntry = {
          ...saved,
          createdAt: new Date(saved.createdAt),
          updatedAt: new Date(saved.updatedAt),
          expiresAt: saved.expiresAt ? new Date(saved.expiresAt) : undefined
        }

        // Update cache
        if (cacheEnabled) {
          cacheRef.current.entries.set(newEntry.key, newEntry)
        }

        // Update state
        setState(prev => ({
          ...prev,
          entries: [...prev.entries.filter(e => e.key !== key), newEntry]
        }))

        return newEntry
      })
    )()
  }, [userId, sessionId, cacheEnabled])

  // Update an existing memory
  const updateMemory = useCallback(async (
    key: string,
    updates: Partial<Pick<AIMemoryEntry, 'value' | 'confidence' | 'category'>>
  ): Promise<E.Either<Error, AIMemoryEntry>> => {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(MEMORY_API.update, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              sessionId: sessionId || 'global',
              key,
              ...updates
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to update memory: ${response.statusText}`)
          }

          // Validate content-type before parsing JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Expected JSON response but got ${contentType}. Response preview: ${preview}...`)
            throw new Error(`Invalid response type: Expected JSON but received ${contentType || 'unknown'}. This may indicate an HTML error page.`)
          }

          try {
            return await response.json()
          } catch (parseError) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Failed to parse JSON response. Response preview: ${preview}...`)
            throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
          }
        },
        (error) => error as Error
      ),
      TE.map((updated: AIMemoryEntry) => {
        const updatedEntry = {
          ...updated,
          createdAt: new Date(updated.createdAt),
          updatedAt: new Date(updated.updatedAt),
          expiresAt: updated.expiresAt ? new Date(updated.expiresAt) : undefined
        }

        // Update cache
        if (cacheEnabled) {
          cacheRef.current.entries.set(updatedEntry.key, updatedEntry)
        }

        // Update state
        setState(prev => ({
          ...prev,
          entries: prev.entries.map(e => e.key === key ? updatedEntry : e)
        }))

        return updatedEntry
      })
    )()
  }, [userId, sessionId, cacheEnabled])

  // Delete a memory
  const deleteMemory = useCallback(async (key: string): Promise<E.Either<Error, void>> => {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch(MEMORY_API.delete, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              sessionId: sessionId || 'global',
              key
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to delete memory: ${response.statusText}`)
          }
        },
        (error) => error as Error
      ),
      TE.map(() => {
        // Update cache
        if (cacheEnabled) {
          cacheRef.current.entries.delete(key)
        }

        // Update state
        setState(prev => ({
          ...prev,
          entries: prev.entries.filter(e => e.key !== key)
        }))
      })
    )()
  }, [userId, sessionId, cacheEnabled])

  // Get memory by key (from cache or state)
  const getMemory = useCallback((key: string): O.Option<AIMemoryEntry> => {
    if (cacheEnabled && cacheRef.current.entries.has(key)) {
      return O.some(cacheRef.current.entries.get(key)!)
    }
    
    const entry = state.entries.find(e => e.key === key)
    return entry ? O.some(entry) : O.none
  }, [state.entries, cacheEnabled])

  // Search memories
  const searchMemories = useCallback(async (
    query: string,
    options?: {
      category?: AIMemoryEntry['category']
      minConfidence?: number
      limit?: number
    }
  ): Promise<E.Either<Error, AIMemoryEntry[]>> => {
    return pipe(
      TE.tryCatch(
        async () => {
          const params = new URLSearchParams({
            userId,
            query,
            ...(sessionId && { sessionId }),
            ...(options?.category && { category: options.category }),
            ...(options?.minConfidence && { minConfidence: options.minConfidence.toString() }),
            ...(options?.limit && { limit: options.limit.toString() })
          })

          const response = await fetch(`${MEMORY_API.search}?${params}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          if (!response.ok) {
            throw new Error(`Failed to search memories: ${response.statusText}`)
          }

          // Validate content-type before parsing JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Expected JSON response but got ${contentType}. Response preview: ${preview}...`)
            throw new Error(`Invalid response type: Expected JSON but received ${contentType || 'unknown'}. This may indicate an HTML error page.`)
          }

          try {
            return await response.json()
          } catch (parseError) {
            const text = await response.text()
            const preview = text.substring(0, 100)
            logger.error(`Failed to parse JSON response. Response preview: ${preview}...`)
            throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
          }
        },
        (error) => error as Error
      ),
      TE.map((data: { memories: AIMemoryEntry[] }) => {
        return data.memories.map(m => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
          expiresAt: m.expiresAt ? new Date(m.expiresAt) : undefined
        }))
      })
    )()
  }, [userId, sessionId])

  // Clear expired memories
  const clearExpiredMemories = useCallback(() => {
    const now = new Date()
    const activeEntries = state.entries.filter(entry => 
      !entry.expiresAt || entry.expiresAt > now
    )

    if (activeEntries.length !== state.entries.length) {
      setState(prev => ({ ...prev, entries: activeEntries }))

      // Clear from cache
      if (cacheEnabled) {
        Array.from(cacheRef.current.entries.entries()).forEach(([key, entry]) => {
          if (entry.expiresAt && entry.expiresAt <= now) {
            cacheRef.current.entries.delete(key)
          }
        })
      }
    }
  }, [state.entries, cacheEnabled])

  // Auto-sync effect with intelligent backoff
  useEffect(() => {
    if (!autoSync) return

    // Initial load
    loadMemories()

    // Set up periodic sync with adaptive interval
    const adaptiveInterval = () => {
      const baseInterval = syncInterval
      const backoffMultiplier = Math.min(Math.pow(2, state.failedAttempts), 8) // Max 8x backoff
      return baseInterval * backoffMultiplier
    }

    const scheduleNextSync = () => {
      const interval = adaptiveInterval()
      syncTimeoutRef.current = setTimeout(() => {
        // Only sync if backend is available or enough time has passed
        if (state.backendAvailable || state.failedAttempts < 5) {
          loadMemories()
          clearExpiredMemories()
        }
        scheduleNextSync()
      }, interval)
    }

    scheduleNextSync()

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [autoSync, syncInterval, loadMemories, clearExpiredMemories, state.failedAttempts, state.backendAvailable])

  // Clean up expired memories periodically
  useEffect(() => {
    const cleanupInterval = setInterval(clearExpiredMemories, 60000) // Every minute
    return () => clearInterval(cleanupInterval)
  }, [clearExpiredMemories])

  return {
    // State
    memories: state.entries,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    backendAvailable: state.backendAvailable,
    failedAttempts: state.failedAttempts,

    // Actions
    loadMemories,
    saveMemory,
    updateMemory,
    deleteMemory,
    getMemory,
    searchMemories,
    clearExpiredMemories,

    // Utilities
    getMemoriesByCategory: useCallback((category: AIMemoryEntry['category']) => 
      state.entries.filter(e => e.category === category),
      [state.entries]
    ),
    getHighConfidenceMemories: useCallback((threshold = 0.8) => 
      state.entries.filter(e => e.confidence >= threshold),
      [state.entries]
    ),
    hasMemory: useCallback((key: string) => 
      state.entries.some(e => e.key === key),
      [state.entries]
    )
  }
}