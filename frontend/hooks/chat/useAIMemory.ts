import { useState, useEffect, useCallback, useRef } from 'react'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { logger } from '@lib/logger'

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

// Memory API endpoints (using Vercel API routes)
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
    lastSync: null
  })

  const cacheRef = useRef<AIMemoryCache>({
    entries: new Map(),
    lastUpdated: new Date()
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout>()

  // Load memories from Supabase via API
  const loadMemories = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    return pipe(
      TE.tryCatch(
        async () => {
          const params = new URLSearchParams({ userId })
          if (sessionId) params.append('sessionId', sessionId)

          const response = await fetch(`${MEMORY_API.load}?${params}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          if (!response.ok) {
            throw new Error(`Failed to load memories: ${response.statusText}`)
          }

          return response.json()
        },
        (error) => error as Error
      ),
      TE.map((data: { memories: AIMemoryEntry[] }) => {
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

        setState({
          entries,
          isLoading: false,
          error: null,
          lastSync: new Date()
        })

        return entries
      }),
      TE.mapLeft((error) => {
        setState(prev => ({ ...prev, isLoading: false, error }))
        logger.error('Failed to load AI memories:', error)
        onSyncError?.(error)
        return error
      })
    )()
  }, [userId, sessionId, cacheEnabled, onSyncError])

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

          return response.json()
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

          return response.json()
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

          return response.json()
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

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync) return

    // Initial load
    loadMemories()

    // Set up periodic sync
    syncTimeoutRef.current = setInterval(() => {
      loadMemories()
      clearExpiredMemories()
    }, syncInterval)

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current)
      }
    }
  }, [autoSync, syncInterval, loadMemories, clearExpiredMemories])

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