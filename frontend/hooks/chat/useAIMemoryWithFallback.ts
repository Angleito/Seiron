import { useState, useEffect, useCallback, useRef } from 'react';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { logger } from '@lib/logger';

export interface AIMemoryEntry {
  id: string;
  userId: string;
  sessionId: string;
  key: string;
  value: any;
  category: 'preference' | 'context' | 'fact' | 'interaction';
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface AIMemoryState {
  entries: AIMemoryEntry[];
  isLoading: boolean;
  error: Error | null;
  lastSync: Date | null;
  isUsingFallback: boolean;
  backendAvailable: boolean;
}

export interface UseAIMemoryOptions {
  userId: string;
  sessionId?: string;
  autoSync?: boolean;
  syncInterval?: number;
  cacheEnabled?: boolean;
  fallbackToLocalStorage?: boolean;
  onSyncError?: (error: Error) => void;
  onFallbackActivated?: (reason: string) => void;
}

interface AIMemoryCache {
  entries: Map<string, AIMemoryEntry>;
  lastUpdated: Date;
}

interface LocalStorageMemory {
  [key: string]: {
    value: any;
    category: AIMemoryEntry['category'];
    confidence: number;
    timestamp: number;
    expiresAt?: number;
  };
}

// Memory API endpoints
const MEMORY_API = {
  load: '/api/ai/memory/load',
  save: '/api/ai/memory/save',
  update: '/api/ai/memory/update',
  delete: '/api/ai/memory/delete',
  search: '/api/ai/memory/search'
};

// LocalStorage keys
const STORAGE_KEY_PREFIX = 'ai_memory_';
const BACKEND_STATUS_KEY = 'ai_memory_backend_status';

/**
 * Enhanced useAIMemory hook with comprehensive fallback support
 * Falls back to localStorage when backend is unavailable
 */
export function useAIMemoryWithFallback({
  userId,
  sessionId,
  autoSync = true,
  syncInterval = 30000,
  cacheEnabled = true,
  fallbackToLocalStorage = true,
  onSyncError,
  onFallbackActivated
}: UseAIMemoryOptions) {
  // Store callbacks in refs to prevent re-renders
  const onSyncErrorRef = useRef(onSyncError);
  const onFallbackActivatedRef = useRef(onFallbackActivated);
  
  useEffect(() => {
    onSyncErrorRef.current = onSyncError;
    onFallbackActivatedRef.current = onFallbackActivated;
  }, [onSyncError, onFallbackActivated]);
  const [state, setState] = useState<AIMemoryState>({
    entries: [],
    isLoading: false,
    error: null,
    lastSync: null,
    isUsingFallback: false,
    backendAvailable: true
  });

  const cacheRef = useRef<AIMemoryCache>({
    entries: new Map(),
    lastUpdated: new Date()
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastBackendCheckRef = useRef<number>(0);
  const backendCheckIntervalRef = useRef<number>(60000); // Check every minute

  // Get localStorage key for user
  const getStorageKey = useCallback((key: string) => {
    return `${STORAGE_KEY_PREFIX}${userId}_${sessionId || 'global'}_${key}`;
  }, [userId, sessionId]);

  // Check backend availability
  const checkBackendAvailability = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastBackendCheckRef.current < backendCheckIntervalRef.current) {
      return state.backendAvailable;
    }

    try {
      const response = await fetch(MEMORY_API.load + `?userId=${userId}&test=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const available = response.ok;
      lastBackendCheckRef.current = now;
      
      // Store backend status
      localStorage.setItem(BACKEND_STATUS_KEY, JSON.stringify({
        available,
        lastCheck: now
      }));

      setState(prev => ({ ...prev, backendAvailable: available }));
      return available;
    } catch (error) {
      logger.warn('Backend availability check failed:', error);
      lastBackendCheckRef.current = now;
      setState(prev => ({ ...prev, backendAvailable: false }));
      return false;
    }
  }, [userId]);

  // Load from localStorage (fallback)
  const loadFromLocalStorage = useCallback((): AIMemoryEntry[] => {
    try {
      const entries: AIMemoryEntry[] = [];
      const keys = Object.keys(localStorage);
      const userPrefix = `${STORAGE_KEY_PREFIX}${userId}_${sessionId || 'global'}_`;

      keys.forEach(key => {
        if (key.startsWith(userPrefix)) {
          try {
            const data: LocalStorageMemory[string] = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Check if entry has expired
            if (data.expiresAt && Date.now() > data.expiresAt) {
              localStorage.removeItem(key);
              return;
            }

            const memoryKey = key.replace(userPrefix, '');
            entries.push({
              id: `local_${memoryKey}`,
              userId,
              sessionId: sessionId || 'global',
              key: memoryKey,
              value: data.value,
              category: data.category,
              confidence: data.confidence,
              createdAt: new Date(data.timestamp),
              updatedAt: new Date(data.timestamp),
              expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
            });
          } catch (error) {
            logger.warn(`Failed to parse localStorage entry: ${key}`, error);
            localStorage.removeItem(key);
          }
        }
      });

      logger.debug('Loaded memories from localStorage', { count: entries.length });
      return entries;
    } catch (error) {
      logger.error('Failed to load from localStorage:', error);
      return [];
    }
  }, [userId, sessionId]);

  // Save to localStorage (fallback)
  const saveToLocalStorage = useCallback((key: string, entry: Omit<AIMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const storageKey = getStorageKey(key);
      const data: LocalStorageMemory[string] = {
        value: entry.value,
        category: entry.category,
        confidence: entry.confidence,
        timestamp: Date.now(),
        expiresAt: entry.expiresAt?.getTime()
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      logger.debug('Saved memory to localStorage', { key, category: entry.category });
      return true;
    } catch (error) {
      logger.error('Failed to save to localStorage:', error);
      return false;
    }
  }, [getStorageKey]);

  // Delete from localStorage (fallback)
  const deleteFromLocalStorage = useCallback((key: string) => {
    try {
      const storageKey = getStorageKey(key);
      localStorage.removeItem(storageKey);
      logger.debug('Deleted memory from localStorage', { key });
      return true;
    } catch (error) {
      logger.error('Failed to delete from localStorage:', error);
      return false;
    }
  }, [getStorageKey]);

  // Load memories with fallback
  const loadMemories = useCallback(async (): Promise<AIMemoryEntry[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Check if backend is available
    const backendAvailable = await checkBackendAvailability();

    if (backendAvailable) {
      // Try to load from backend
      const backendResult = await pipe(
        TE.tryCatch(
          async () => {
            const params = new URLSearchParams({ userId });
            if (sessionId) params.append('sessionId', sessionId);

            const response = await fetch(`${MEMORY_API.load}?${params}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
              throw new Error(`Backend error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.memories || [];
          },
          (error) => error as Error
        ),
        TE.map((memories: any[]) => {
          const entries = memories.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
            expiresAt: m.expiresAt ? new Date(m.expiresAt) : undefined
          }));

          // Update cache
          if (cacheEnabled) {
            cacheRef.current.entries.clear();
            entries.forEach(entry => {
              cacheRef.current.entries.set(entry.key, entry);
            });
            cacheRef.current.lastUpdated = new Date();
          }

          setState({
            entries,
            isLoading: false,
            error: null,
            lastSync: new Date(),
            isUsingFallback: false,
            backendAvailable: true
          });

          logger.info('Loaded memories from backend', { count: entries.length });
          return entries;
        }),
        TE.mapLeft((error) => {
          logger.warn('Backend memory load failed, falling back to localStorage:', error);
          return error;
        })
      )();

      if (E.isRight(backendResult)) {
        return backendResult.right;
      } else {
        // Fall back to localStorage
        logger.info('Falling back to localStorage due to backend error');
        onFallbackActivatedRef.current?.('Backend load failed');
        return loadFromLocalStorage();
      }
    } else {
      // Backend not available, use localStorage
      logger.info('Backend not available, using localStorage');
      onFallbackActivatedRef.current?.('Backend not available');
      return loadFromLocalStorage();
    }
  }, [userId, sessionId, cacheEnabled, fallbackToLocalStorage, checkBackendAvailability, loadFromLocalStorage]);


  // Save memory with fallback
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
    };

    if (state.backendAvailable && !state.isUsingFallback) {
      // Try backend first
      const result = await pipe(
        TE.tryCatch(
          async () => {
            const response = await fetch(MEMORY_API.save, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
              signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
              throw new Error(`Backend save failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.memory;
          },
          (error) => error as Error
        ),
        TE.map((saved: any) => {
          const newEntry: AIMemoryEntry = {
            ...saved,
            createdAt: new Date(saved.createdAt),
            updatedAt: new Date(saved.updatedAt),
            expiresAt: saved.expiresAt ? new Date(saved.expiresAt) : undefined
          };

          // Update cache
          if (cacheEnabled) {
            cacheRef.current.entries.set(newEntry.key, newEntry);
          }

          // Update state
          setState(prev => ({
            ...prev,
            entries: [...prev.entries.filter(e => e.key !== key), newEntry]
          }));

          logger.debug('Saved memory to backend', { key, category });
          return newEntry;
        }),
        TE.mapLeft((error) => {
          logger.warn('Backend save failed, falling back to localStorage:', error);
          return error;
        })
      )();

      if (E.isRight(result)) {
        return result;
      } else {
        // Fallback to localStorage
        if (fallbackToLocalStorage) {
          const success = saveToLocalStorage(key, entry);
          if (success) {
            const newEntry: AIMemoryEntry = {
              id: `local_${key}`,
              ...entry,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            setState(prev => ({
              ...prev,
              entries: [...prev.entries.filter(e => e.key !== key), newEntry],
              isUsingFallback: true
            }));
            
            return E.right(newEntry);
          }
        }
        
        return E.left(result.left);
      }
    } else {
      // Use localStorage directly
      if (fallbackToLocalStorage) {
        const success = saveToLocalStorage(key, entry);
        if (success) {
          const newEntry: AIMemoryEntry = {
            id: `local_${key}`,
            ...entry,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          setState(prev => ({
            ...prev,
            entries: [...prev.entries.filter(e => e.key !== key), newEntry]
          }));
          
          return Promise.resolve(E.right(newEntry));
        }
      }
      
      return Promise.resolve(E.left(new Error('Failed to save memory')));
    }
  }, [userId, sessionId, cacheEnabled, fallbackToLocalStorage, state.backendAvailable, state.isUsingFallback, saveToLocalStorage]);

  // Delete memory with fallback
  const deleteMemory = useCallback(async (key: string): Promise<E.Either<Error, boolean>> => {
    if (state.backendAvailable && !state.isUsingFallback) {
      // Try backend first
      const result = await pipe(
        TE.tryCatch(
          async () => {
            const response = await fetch(`${MEMORY_API.delete}?id=${key}&userId=${userId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
              throw new Error(`Backend delete failed: ${response.status} ${response.statusText}`);
            }

            return true;
          },
          (error) => error as Error
        ),
        TE.map((success: boolean) => {
          // Update cache
          if (cacheEnabled) {
            cacheRef.current.entries.delete(key);
          }

          // Update state
          setState(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.key !== key)
          }));

          logger.debug('Deleted memory from backend', { key });
          return success;
        }),
        TE.mapLeft((error) => {
          logger.warn('Backend delete failed, falling back to localStorage:', error);
          return error;
        })
      )();

      if (E.isRight(result)) {
        return result;
      } else {
        // Fallback to localStorage
        if (fallbackToLocalStorage) {
          const success = deleteFromLocalStorage(key);
          if (success) {
            setState(prev => ({
              ...prev,
              entries: prev.entries.filter(e => e.key !== key),
              isUsingFallback: true
            }));
            
            return E.right(true);
          }
        }
        
        return E.left(result.left);
      }
    } else {
      // Use localStorage directly
      if (fallbackToLocalStorage) {
        const success = deleteFromLocalStorage(key);
        if (success) {
          setState(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.key !== key)
          }));
          
          return Promise.resolve(E.right(true));
        }
      }
      
      return Promise.resolve(E.left(new Error('Failed to delete memory')));
    }
  }, [userId, cacheEnabled, fallbackToLocalStorage, state.backendAvailable, state.isUsingFallback, deleteFromLocalStorage]);

  // Initial load effect
  useEffect(() => {
    if (autoSync) {
      loadMemories();
    }
  }, []); // Run only on mount

  // Auto-sync interval effect
  useEffect(() => {
    if (autoSync && syncInterval > 0) {
      // Set up interval for periodic sync
      const interval = setInterval(() => {
        loadMemories();
      }, syncInterval);
      
      syncTimeoutRef.current = interval;
      return () => clearInterval(interval);
    }
    // Return undefined explicitly for the else case
    return undefined;
  }, [autoSync, syncInterval]); // Dependencies don't include loadMemories to prevent infinite loop

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, []);

  // Get memory by key
  const getMemory = useCallback((key: string): O.Option<AIMemoryEntry> => {
    const entry = state.entries.find(e => e.key === key);
    return entry ? O.some(entry) : O.none;
  }, [state.entries]);

  // Search memories
  const searchMemories = useCallback((
    query: string,
    category?: AIMemoryEntry['category']
  ): AIMemoryEntry[] => {
    return state.entries.filter(entry => {
      const matchesQuery = entry.key.toLowerCase().includes(query.toLowerCase()) ||
                          JSON.stringify(entry.value).toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || entry.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [state.entries]);

  // Clear all memories
  const clearMemories = useCallback(async (): Promise<boolean> => {
    try {
      // Clear localStorage
      if (fallbackToLocalStorage) {
        const keys = Object.keys(localStorage);
        const userPrefix = `${STORAGE_KEY_PREFIX}${userId}_${sessionId || 'global'}_`;
        keys.forEach(key => {
          if (key.startsWith(userPrefix)) {
            localStorage.removeItem(key);
          }
        });
      }

      // Clear cache
      if (cacheEnabled) {
        cacheRef.current.entries.clear();
      }

      // Clear state
      setState(prev => ({ ...prev, entries: [] }));
      
      logger.info('Cleared all memories');
      return true;
    } catch (error) {
      logger.error('Failed to clear memories:', error);
      return false;
    }
  }, [userId, sessionId, fallbackToLocalStorage, cacheEnabled]);

  return {
    state,
    loadMemories,
    saveMemory,
    deleteMemory,
    getMemory,
    searchMemories,
    clearMemories,
    checkBackendAvailability,
    // Convenience methods
    entries: state.entries,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    isUsingFallback: state.isUsingFallback,
    backendAvailable: state.backendAvailable
  };
}
