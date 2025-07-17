import { useState, useEffect, useCallback, useRef } from 'react';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { ConversationMemory, ConversationTurn, AIMemoryEntry } from '@/lib/conversation-memory';
import { logger } from '@/lib/logger';

export interface ConversationContextState {
  conversation: ConversationMemory | null;
  memories: AIMemoryEntry[];
  isLoading: boolean;
  error: Error | null;
  lastSyncedAt: Date | null;
}

export interface UseConversationContextOptions {
  userId: string;
  sessionId: string;
  autoSync?: boolean;
  syncInterval?: number;
  enableMemoryCapture?: boolean;
  portfolioContext?: any;
  onContextUpdate?: (context: { conversation: ConversationMemory; memories: AIMemoryEntry[] }) => void;
  onError?: (error: Error) => void;
}

interface ConversationContextCache {
  conversation: ConversationMemory | null;
  memories: Map<string, AIMemoryEntry>;
  lastUpdated: Date;
}

// Voice-specific conversation management
export function useConversationContext({
  userId,
  sessionId,
  autoSync = true,
  syncInterval = 5000, // 5 seconds for voice interactions
  enableMemoryCapture = true,
  portfolioContext,
  onContextUpdate,
  onError
}: UseConversationContextOptions) {
  const [state, setState] = useState<ConversationContextState>({
    conversation: null,
    memories: [],
    isLoading: false,
    error: null,
    lastSyncedAt: null,
  });

  const cacheRef = useRef<ConversationContextCache>({
    conversation: null,
    memories: new Map(),
    lastUpdated: new Date(),
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef<boolean>(false);

  // Initialize conversation if it doesn't exist
  const initializeConversation = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First try to get existing conversation
      const getResponse = await fetch(`/api/ai/conversation?userId=${userId}&sessionId=${sessionId}`);
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        if (data.success && data.conversation) {
          // Update state with existing conversation
          setState(prev => ({
            ...prev,
            conversation: data.conversation,
            isLoading: false,
            lastSyncedAt: new Date(),
          }));
          
          cacheRef.current.conversation = data.conversation;
          return;
        }
      }

      // Create new conversation if none exists
      const createResponse = await fetch('/api/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId,
          sessionId,
          initialContext: {
            portfolio: portfolioContext,
            voiceEnabled: true,
            createdAt: new Date().toISOString(),
          }
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create conversation: ${createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      if (!createData.success) {
        throw new Error('Failed to create conversation');
      }

      setState(prev => ({
        ...prev,
        conversation: createData.conversation,
        isLoading: false,
        lastSyncedAt: new Date(),
      }));

      cacheRef.current.conversation = createData.conversation;
      logger.info(`Initialized conversation ${createData.conversation.id} for session ${sessionId}`);
      
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize conversation:', err);
      setState(prev => ({
        ...prev,
        error: err,
        isLoading: false,
      }));
      onError?.(err);
    }
  }, [userId, sessionId, portfolioContext, onError]);

  // Load conversation context (conversation + relevant memories)
  const loadContext = useCallback(async () => {
    if (!userId || !sessionId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch('/api/ai/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getContext',
              userId,
              sessionId,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to load context: ${response.statusText}`);
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error('Failed to load conversation context');
          }

          return data.context;
        },
        (error) => error as Error
      ),
      TE.map((context: { conversation: ConversationMemory | null; memories: AIMemoryEntry[] }) => {
        // Update cache
        cacheRef.current.conversation = context.conversation;
        cacheRef.current.memories.clear();
        context.memories.forEach(memory => {
          cacheRef.current.memories.set(memory.key, memory);
        });
        cacheRef.current.lastUpdated = new Date();

        // Update state
        setState(prev => ({
          ...prev,
          conversation: context.conversation,
          memories: context.memories,
          isLoading: false,
          lastSyncedAt: new Date(),
        }));

        onContextUpdate?.(context as { conversation: ConversationMemory; memories: AIMemoryEntry[] });
        return context;
      }),
      TE.mapLeft((error) => {
        setState(prev => ({
          ...prev,
          error,
          isLoading: false,
        }));
        logger.error('Failed to load conversation context:', error);
        onError?.(error);
        return error;
      })
    )();
  }, [userId, sessionId, onContextUpdate, onError]);

  // Add a turn to the conversation (voice message)
  const addTurn = useCallback(async (
    role: ConversationTurn['role'],
    content: string,
    metadata?: ConversationTurn['metadata']
  ): Promise<E.Either<Error, ConversationTurn>> => {
    if (!userId || !sessionId) {
      return E.left(new Error('userId and sessionId are required'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch('/api/ai/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'addTurn',
              userId,
              sessionId,
              role,
              content,
              metadata: {
                ...metadata,
                timestamp: Date.now(),
                voiceEnabled: true,
              }
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to add turn: ${response.statusText}`);
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error('Failed to add conversation turn');
          }

          // Update local conversation state
          if (state.conversation) {
            const updatedConversation = {
              ...state.conversation,
              turns: [...state.conversation.turns, data.turn],
              updatedAt: Date.now(),
              context: {
                ...state.conversation.context,
                totalTurns: state.conversation.turns.length + 1,
                lastActiveAt: Date.now(),
              }
            };
            
            setState(prev => ({
              ...prev,
              conversation: updatedConversation,
            }));
            
            cacheRef.current.conversation = updatedConversation;
          }

          return data.turn;
        },
        (error) => error as Error
      )
    )();
  }, [userId, sessionId, state.conversation]);

  // Capture important information as memory (for voice interactions)
  const captureMemory = useCallback(async (
    key: string,
    value: any,
    category: AIMemoryEntry['category'] = 'interaction',
    confidence = 0.8
  ): Promise<E.Either<Error, AIMemoryEntry>> => {
    if (!enableMemoryCapture) {
      return E.left(new Error('Memory capture is disabled'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch('/api/ai/memory/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              sessionId,
              key,
              value,
              category,
              confidence,
              conversationId: state.conversation?.id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to capture memory: ${response.statusText}`);
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error('Failed to save memory');
          }

          // Update local memories
          const updatedMemories = [...state.memories.filter(m => m.key !== key), data.memory];
          setState(prev => ({
            ...prev,
            memories: updatedMemories,
          }));

          cacheRef.current.memories.set(key, data.memory);
          return data.memory;
        },
        (error) => error as Error
      )
    )();
  }, [userId, sessionId, enableMemoryCapture, state.conversation?.id, state.memories]);

  // Save user preferences from voice interactions
  const savePreferences = useCallback(async (preferences: Record<string, any>): Promise<E.Either<Error, void>> => {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await fetch('/api/ai/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'savePreferences',
              userId,
              preferences,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save preferences: ${response.statusText}`);
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error('Failed to save user preferences');
          }

          logger.info('User preferences saved successfully');
        },
        (error) => error as Error
      )
    )();
  }, [userId]);

  // Get recent conversation context for AI processing
  const getRecentContext = useCallback((maxTurns = 10) => {
    if (!state.conversation) return null;

    const recentTurns = state.conversation.turns.slice(-maxTurns);
    const relevantMemories = state.memories.slice(0, 5); // Top 5 most relevant

    return {
      turns: recentTurns,
      memories: relevantMemories,
      portfolio: portfolioContext,
      preferences: state.conversation.context.preferences || {},
    };
  }, [state.conversation, state.memories, portfolioContext]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync || !userId || !sessionId) return;

    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(() => {
        loadContext();
        scheduleSync();
      }, syncInterval);
    };

    // Initial load
    initializeConversation().then(() => {
      loadContext();
      scheduleSync();
    });

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [autoSync, userId, sessionId, syncInterval, initializeConversation, loadContext]);

  // Reset initialization flag when userId or sessionId changes
  useEffect(() => {
    initializationRef.current = false;
  }, [userId, sessionId]);

  return {
    // State
    conversation: state.conversation,
    memories: state.memories,
    isLoading: state.isLoading,
    error: state.error,
    lastSyncedAt: state.lastSyncedAt,

    // Actions
    addTurn,
    captureMemory,
    savePreferences,
    loadContext,
    initializeConversation,

    // Utilities
    getRecentContext,
    hasConversation: !!state.conversation,
    turnCount: state.conversation?.turns.length || 0,
    isInitialized: initializationRef.current,

    // Advanced features
    getMemoryByKey: useCallback((key: string) => 
      state.memories.find(m => m.key === key),
      [state.memories]
    ),
    getMemoriesByCategory: useCallback((category: AIMemoryEntry['category']) => 
      state.memories.filter(m => m.category === category),
      [state.memories]
    ),
    getConversationSummary: useCallback(() => {
      if (!state.conversation) return null;
      return {
        id: state.conversation.id,
        totalTurns: state.conversation.turns.length,
        lastActive: new Date(state.conversation.context.lastActiveAt),
        summary: state.conversation.summary,
      };
    }, [state.conversation]),
  };
}