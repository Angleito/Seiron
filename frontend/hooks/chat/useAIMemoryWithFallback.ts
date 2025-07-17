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
  retryCount: number; // Track retry attempts
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

// Retry configuration
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAYS = [1000, 3000]; // Backoff delays in milliseconds

/**
 * Enhanced useAIMemory hook with comprehensive fallback support
 * Falls back to localStorage when backend is unavailable
 * 
 * Features:
 * - Automatic retry with exponential backoff (max 2 attempts)
 * - Graceful degradation to localStorage
 * - Smart backend availability checking
 * - Minimal console logging to prevent spam
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
    backendAvailable: true,
    retryCount: 0
  });

  const cacheRef = useRef<AIMemoryCache>({
    entries: new Map(),
    lastUpdated: new Date()
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastBackendCheckRef = useRef<number>(0);
  const backendCheckIntervalRef = useRef<number>(60000); // Check every minute
  const lastErrorLogRef = useRef<number>(0); // Track last error log time to prevent spam
  const errorLogThrottleMs = 10000; // Only log same errors every 10 seconds

  // Helper to throttle error logging
  const logThrottledError = useCallback((message: string, error: any) => {
    const now = Date.now();
    if (now - lastErrorLogRef.current > errorLogThrottleMs) {
      logger.error(message, error);
      lastErrorLogRef.current = now;
    }
  }, []);

  // Get localStorage key for user
  const getStorageKey = useCallback((key: string) => {
    return `${STORAGE_KEY_PREFIX}${userId}_${sessionId || 'global'}_${key}`;
  }, [userId, sessionId]);

  // Check backend availability with improved error handling
  const checkBackendAvailability = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Use cached result if recent
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
      
      // Store backend status in localStorage for persistence
      localStorage.setItem(BACKEND_STATUS_KEY, JSON.stringify({
        available,
        lastCheck: now
      }));

      setState(prev => ({ ...prev, backendAvailable: available }));
      
      // Only log state changes
      if (available !== state.backendAvailable) {
        logger.info(`Backend availability changed to: ${available ? 'available' : 'unavailable'}`);
      }
      
      return available;
    } catch (error) {
      lastBackendCheckRef.current = now;
      setState(prev => ({ ...prev, backendAvailable: false }));
      
      // Only log if this is a new error state
      if (state.backendAvailable) {
        logger.warn('Backend became unavailable:', error);
      }
      
      return false;
    }
  }, [userId, state.backendAvailable]);

  // Load from localStorage with improved error handling
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
            // Silently remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      });

      logger.debug('Loaded memories from localStorage', { count: entries.length });
      return entries;
    } catch (error) {
      logThrottledError('Failed to load from localStorage:', error);
      return [];
    }
  }, [userId, sessionId, logThrottledError]);

  // Save to localStorage with validation
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
      return true;
    } catch (error) {
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger.warn('localStorage quota exceeded. Attempting cleanup...');
        // Try to clean up old entries
        const keys = Object.keys(localStorage);
        const userPrefix = `${STORAGE_KEY_PREFIX}${userId}_`;
        const memoryKeys = keys.filter(k => k.startsWith(userPrefix));
        
        // Remove oldest entries (simple FIFO strategy)
        if (memoryKeys.length > 10) {
          memoryKeys.slice(0, 5).forEach(k => localStorage.removeItem(k));
          // Retry save
          try {
            localStorage.setItem(storageKey, JSON.stringify(data));
            return true;
          } catch (retryError) {
            logThrottledError('Failed to save to localStorage after cleanup:', retryError);
            return false;
          }
        }
      }
      logThrottledError('Failed to save to localStorage:', error);
      return false;
    }
  }, [getStorageKey, userId, logThrottledError]);

  // Delete from localStorage
  const deleteFromLocalStorage = useCallback((key: string) => {
    try {
      const storageKey = getStorageKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      logThrottledError('Failed to delete from localStorage:', error);
      return false;
    }
  }, [getStorageKey, logThrottledError]);

  // Load memories with retry logic and fallback
  const loadMemories = useCallback(async (retryAttempt: number = 0): Promise<AIMemoryEntry[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, retryCount: retryAttempt }));

    // Check if backend is available
    const backendAvailable = await checkBackendAvailability();

    if (backendAvailable && retryAttempt < MAX_RETRY_ATTEMPTS) {
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
            backendAvailable: true,
            retryCount: 0
          });

          logger.info('Successfully loaded memories from backend', { count: entries.length });
          return entries;
        }),
        TE.mapLeft((error) => {
          logger.debug(`Backend load attempt ${retryAttempt + 1} failed:`, error.message);
          return error;
        })
      )();

      if (E.isRight(backendResult)) {
        return backendResult.right;
      } else {
        // Implement retry with backoff
        if (retryAttempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = RETRY_DELAYS[retryAttempt];
          logger.info(`Retrying backend load after ${delay}ms (attempt ${retryAttempt + 2}/${MAX_RETRY_ATTEMPTS})`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadMemories(retryAttempt + 1);
        } else {
          // Max retries reached, fall back to localStorage
          logger.info('Max retry attempts reached. Falling back to localStorage');
          onFallbackActivatedRef.current?.(`Backend unavailable after ${MAX_RETRY_ATTEMPTS} attempts`);
          onSyncErrorRef.current?.(backendResult.left);
          
          const localEntries = loadFromLocalStorage();
          setState(prev => ({
            ...prev,
            entries: localEntries,
            isLoading: false,
            error: backendResult.left,
            isUsingFallback: true,
            retryCount: 0
          }));
          return localEntries;
        }
      }
    } else {
      // Backend not available or max retries reached, use localStorage
      if (!backendAvailable) {
        logger.debug('Backend not available, using localStorage fallback');
        onFallbackActivatedRef.current?.('Backend not available');
      }
      
      const localEntries = loadFromLocalStorage();
      setState(prev => ({
        ...prev,
        entries: localEntries,
        isLoading: false,
        isUsingFallback: true,
        retryCount: 0
      }));
      return localEntries;
    }
  }, [userId, sessionId, cacheEnabled, fallbackToLocalStorage, checkBackendAvailability, loadFromLocalStorage]);

  // Save memory with improved error handling
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
      // Try backend first with single attempt (no retry for saves)
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

          return newEntry;
        }),
        TE.mapLeft((error) => {
          logger.debug('Backend save failed, falling back to localStorage:', error.message);
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
      
      return Promise.resolve(E.left(new Error('Failed to save memory: localStorage unavailable')));
    }
  }, [userId, sessionId, cacheEnabled, fallbackToLocalStorage, state.backendAvailable, state.isUsingFallback, saveToLocalStorage]);

  // Delete memory with improved error handling
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

          return success;
        }),
        TE.mapLeft((error) => {
          logger.debug('Backend delete failed, falling back to localStorage:', error.message);
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
      
      return Promise.resolve(E.left(new Error('Failed to delete memory: localStorage unavailable')));
    }
  }, [userId, cacheEnabled, fallbackToLocalStorage, state.backendAvailable, state.isUsingFallback, deleteFromLocalStorage]);

  // Initial load effect
  useEffect(() => {
    if (autoSync) {
      loadMemories(0);
    }
  }, []); // Run only on mount

  // Auto-sync interval effect with retry count reset
  useEffect(() => {
    if (autoSync && syncInterval > 0) {
      // Set up interval for periodic sync
      const interval = setInterval(() => {
        // Only sync if not currently loading and not in a retry sequence
        if (!state.isLoading && state.retryCount === 0) {
          loadMemories(0);
        }
      }, syncInterval);
      
      syncTimeoutRef.current = interval;
      return () => clearInterval(interval);
    }
    // Return undefined explicitly for the else case
    return undefined;
  }, [autoSync, syncInterval, state.isLoading, state.retryCount]); // Include state to prevent concurrent syncs

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
      setState(prev => ({ ...prev, entries: [], retryCount: 0 }));
      
      logger.info('Cleared all memories');
      return true;
    } catch (error) {
      logThrottledError('Failed to clear memories:', error);
      return false;
    }
  }, [userId, sessionId, fallbackToLocalStorage, cacheEnabled, logThrottledError]);

  // Force sync method (resets retry count)
  const forceSync = useCallback(async () => {
    setState(prev => ({ ...prev, retryCount: 0 }));
    return loadMemories(0);
  }, [loadMemories]);

  return {
    state,
    loadMemories: forceSync, // Expose forceSync as loadMemories to maintain API
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
    backendAvailable: state.backendAvailable,
    retryCount: state.retryCount
  };
}