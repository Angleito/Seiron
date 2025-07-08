import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// Types for memory persistence
export interface UserProfile {
  id: string
  user_id: string
  preferences: UserPreferences
  behavior_patterns: BehaviorPattern[]
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  voice_enabled?: boolean
  voice_settings?: {
    voice_id?: string
    speed?: number
    pitch?: number
  }
  language?: string
  notification_preferences?: {
    email?: boolean
    push?: boolean
    in_app?: boolean
  }
  ai_preferences?: {
    response_style?: 'concise' | 'detailed' | 'balanced'
    personality?: 'professional' | 'friendly' | 'casual'
    creativity_level?: number // 0-1
  }
}

export interface BehaviorPattern {
  pattern_type: 'interaction' | 'topic' | 'time' | 'feature_usage'
  pattern_data: Record<string, unknown>
  frequency: number
  last_observed: string
  confidence: number // 0-1
}

export interface ConversationMemory {
  id: string
  session_id: string
  user_id: string
  context: ConversationContext
  messages: MemoryMessage[]
  summary?: string
  created_at: string
  updated_at: string
}

export interface ConversationContext {
  topic?: string
  mood?: string
  entities: string[]
  intents: string[]
  key_points: string[]
  metadata?: Record<string, unknown>
}

export interface MemoryMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  embedding?: number[]
  metadata?: {
    tokens?: number
    model?: string
    confidence?: number
  }
}

export interface MemorySnapshot {
  id: string
  user_id: string
  snapshot_type: 'daily' | 'weekly' | 'monthly' | 'milestone'
  summary: string
  key_insights: string[]
  topics: string[]
  sentiment_analysis?: {
    overall: number // -1 to 1
    topics: Record<string, number>
  }
  created_at: string
}

export interface MemorySearchQuery {
  query: string
  user_id: string
  filters?: {
    date_range?: {
      start: string
      end: string
    }
    topics?: string[]
    memory_types?: ('conversation' | 'snapshot' | 'profile')[]
    min_relevance?: number // 0-1
  }
  limit?: number
  offset?: number
}

export interface MemorySearchResult {
  id: string
  type: 'conversation' | 'snapshot' | 'profile'
  content: string
  relevance_score: number
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface MemoryPersistenceError {
  type: 'network' | 'validation' | 'permission' | 'database' | 'unknown'
  message: string
  details?: Record<string, unknown>
}

/**
 * Service for persisting Langchain memory to Supabase
 * Uses functional programming patterns with fp-ts
 */
export class MemoryPersistenceService {
  private readonly userProfileTable = 'user_profiles'
  private readonly conversationMemoryTable = 'conversation_memories'
  private readonly memorySnapshotTable = 'memory_snapshots'
  private readonly memorySearchFunction = 'search_memories'

  /**
   * Sync user profile with preferences and behavior patterns
   */
  syncUserProfile = (
    userId: string,
    preferences: UserPreferences,
    behaviorPatterns: BehaviorPattern[] = []
  ): TE.TaskEither<MemoryPersistenceError, UserProfile> =>
    pipe(
      TE.tryCatch(
        async () => {
          // First try to get existing profile
          const { data: existingProfile, error: fetchError } = await supabase
            .from(this.userProfileTable)
            .select('*')
            .eq('user_id', userId)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 is "not found" which is okay for first sync
            throw fetchError
          }

          const now = new Date().toISOString()

          if (existingProfile) {
            // Update existing profile
            const { data, error } = await supabase
              .from(this.userProfileTable)
              .update({
                preferences,
                behavior_patterns: behaviorPatterns,
                updated_at: now
              })
              .eq('user_id', userId)
              .select()
              .single()

            if (error) throw error
            return data as UserProfile
          } else {
            // Create new profile
            const { data, error } = await supabase
              .from(this.userProfileTable)
              .insert({
                user_id: userId,
                preferences,
                behavior_patterns: behaviorPatterns,
                created_at: now,
                updated_at: now
              })
              .select()
              .single()

            if (error) throw error
            return data as UserProfile
          }
        },
        (error) => this.handleError(error, 'Failed to sync user profile')
      ),
      TE.map((profile) => {
        logger.info('User profile synced successfully', {
          userId,
          profileId: profile.id,
          preferencesUpdated: Object.keys(preferences).length,
          behaviorPatternsCount: behaviorPatterns.length
        })
        return profile
      })
    )

  /**
   * Sync conversation memory to persist context
   */
  syncConversationMemory = (
    sessionId: string,
    userId: string,
    context: ConversationContext,
    messages: MemoryMessage[],
    summary?: string
  ): TE.TaskEither<MemoryPersistenceError, ConversationMemory> =>
    pipe(
      TE.tryCatch(
        async () => {
          const now = new Date().toISOString()

          // Check if conversation memory exists
          const { data: existing, error: fetchError } = await supabase
            .from(this.conversationMemoryTable)
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError
          }

          if (existing) {
            // Update existing memory
            const { data, error } = await supabase
              .from(this.conversationMemoryTable)
              .update({
                context,
                messages,
                summary,
                updated_at: now
              })
              .eq('id', existing.id)
              .select()
              .single()

            if (error) throw error
            return data as ConversationMemory
          } else {
            // Create new memory
            const { data, error } = await supabase
              .from(this.conversationMemoryTable)
              .insert({
                session_id: sessionId,
                user_id: userId,
                context,
                messages,
                summary,
                created_at: now,
                updated_at: now
              })
              .select()
              .single()

            if (error) throw error
            return data as ConversationMemory
          }
        },
        (error) => this.handleError(error, 'Failed to sync conversation memory')
      ),
      TE.map((memory) => {
        logger.info('Conversation memory synced successfully', {
          sessionId,
          userId,
          memoryId: memory.id,
          messageCount: messages.length,
          contextEntities: context.entities.length
        })
        return memory
      })
    )

  /**
   * Load user profile from database
   */
  loadUserProfile = (
    userId: string
  ): TE.TaskEither<MemoryPersistenceError, O.Option<UserProfile>> =>
    pipe(
      TE.tryCatch(
        async () => {
          const { data, error } = await supabase
            .from(this.userProfileTable)
            .select('*')
            .eq('user_id', userId)
            .single()

          if (error) {
            if (error.code === 'PGRST116') {
              // Not found
              return O.none
            }
            throw error
          }

          return O.some(data as UserProfile)
        },
        (error) => this.handleError(error, 'Failed to load user profile')
      ),
      TE.map((profile) => {
        logger.debug('User profile loaded', {
          userId,
          found: O.isSome(profile)
        })
        return profile
      })
    )

  /**
   * Load conversation memory from database
   */
  loadConversationMemory = (
    sessionId: string,
    userId: string
  ): TE.TaskEither<MemoryPersistenceError, O.Option<ConversationMemory>> =>
    pipe(
      TE.tryCatch(
        async () => {
          const { data, error } = await supabase
            .from(this.conversationMemoryTable)
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single()

          if (error) {
            if (error.code === 'PGRST116') {
              // Not found
              return O.none
            }
            throw error
          }

          return O.some(data as ConversationMemory)
        },
        (error) => this.handleError(error, 'Failed to load conversation memory')
      ),
      TE.map((memory) => {
        logger.debug('Conversation memory loaded', {
          sessionId,
          userId,
          found: O.isSome(memory)
        })
        return memory
      })
    )

  /**
   * Create a long-term memory snapshot
   */
  createMemorySnapshot = (
    userId: string,
    snapshotType: MemorySnapshot['snapshot_type'],
    summary: string,
    keyInsights: string[],
    topics: string[],
    sentimentAnalysis?: MemorySnapshot['sentiment_analysis']
  ): TE.TaskEither<MemoryPersistenceError, MemorySnapshot> =>
    pipe(
      TE.tryCatch(
        async () => {
          const { data, error } = await supabase
            .from(this.memorySnapshotTable)
            .insert({
              user_id: userId,
              snapshot_type: snapshotType,
              summary,
              key_insights: keyInsights,
              topics,
              sentiment_analysis: sentimentAnalysis,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (error) throw error
          return data as MemorySnapshot
        },
        (error) => this.handleError(error, 'Failed to create memory snapshot')
      ),
      TE.map((snapshot) => {
        logger.info('Memory snapshot created successfully', {
          userId,
          snapshotId: snapshot.id,
          type: snapshotType,
          topicsCount: topics.length,
          insightsCount: keyInsights.length
        })
        return snapshot
      })
    )

  /**
   * Search through memories using semantic search
   */
  searchMemories = (
    searchQuery: MemorySearchQuery
  ): TE.TaskEither<MemoryPersistenceError, MemorySearchResult[]> =>
    pipe(
      TE.tryCatch(
        async () => {
          // Call Supabase RPC function for semantic search
          const { data, error } = await supabase.rpc(this.memorySearchFunction, {
            search_query: searchQuery.query,
            user_id: searchQuery.user_id,
            date_start: searchQuery.filters?.date_range?.start,
            date_end: searchQuery.filters?.date_range?.end,
            topics: searchQuery.filters?.topics,
            memory_types: searchQuery.filters?.memory_types,
            min_relevance: searchQuery.filters?.min_relevance || 0.5,
            result_limit: searchQuery.limit || 10,
            result_offset: searchQuery.offset || 0
          })

          if (error) throw error
          return (data || []) as MemorySearchResult[]
        },
        (error) => this.handleError(error, 'Failed to search memories')
      ),
      TE.map((results) => {
        logger.debug('Memory search completed', {
          query: searchQuery.query,
          userId: searchQuery.user_id,
          resultsCount: results.length,
          filters: searchQuery.filters
        })
        return results
      })
    )

  /**
   * Get recent conversation memories for a user
   */
  getRecentConversations = (
    userId: string,
    limit: number = 10
  ): TE.TaskEither<MemoryPersistenceError, ConversationMemory[]> =>
    pipe(
      TE.tryCatch(
        async () => {
          const { data, error } = await supabase
            .from(this.conversationMemoryTable)
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(limit)

          if (error) throw error
          return (data || []) as ConversationMemory[]
        },
        (error) => this.handleError(error, 'Failed to get recent conversations')
      ),
      TE.map((conversations) => {
        logger.debug('Recent conversations retrieved', {
          userId,
          count: conversations.length,
          limit
        })
        return conversations
      })
    )

  /**
   * Get memory snapshots within a date range
   */
  getMemorySnapshots = (
    userId: string,
    startDate?: string,
    endDate?: string,
    snapshotTypes?: MemorySnapshot['snapshot_type'][]
  ): TE.TaskEither<MemoryPersistenceError, MemorySnapshot[]> =>
    pipe(
      TE.tryCatch(
        async () => {
          let query = supabase
            .from(this.memorySnapshotTable)
            .select('*')
            .eq('user_id', userId)

          if (startDate) {
            query = query.gte('created_at', startDate)
          }

          if (endDate) {
            query = query.lte('created_at', endDate)
          }

          if (snapshotTypes && snapshotTypes.length > 0) {
            query = query.in('snapshot_type', snapshotTypes)
          }

          const { data, error } = await query
            .order('created_at', { ascending: false })

          if (error) throw error
          return (data || []) as MemorySnapshot[]
        },
        (error) => this.handleError(error, 'Failed to get memory snapshots')
      ),
      TE.map((snapshots) => {
        logger.debug('Memory snapshots retrieved', {
          userId,
          count: snapshots.length,
          dateRange: { startDate, endDate },
          types: snapshotTypes
        })
        return snapshots
      })
    )

  /**
   * Update behavior patterns for a user
   */
  updateBehaviorPatterns = (
    userId: string,
    newPatterns: BehaviorPattern[]
  ): TE.TaskEither<MemoryPersistenceError, UserProfile> =>
    pipe(
      this.loadUserProfile(userId),
      TE.chain((profileOption) =>
        pipe(
          profileOption,
          O.fold(
            () => TE.left<MemoryPersistenceError, UserProfile>({
              type: 'validation' as const,
              message: 'User profile not found',
              details: { userId }
            }),
            (profile) => TE.right<MemoryPersistenceError, UserProfile>(profile)
          )
        )
      ),
      TE.chain((profile) => {
        // Merge new patterns with existing ones
        const existingPatterns = profile.behavior_patterns || []
        const mergedPatterns = this.mergeBehaviorPatterns(existingPatterns, newPatterns)
        
        return this.syncUserProfile(userId, profile.preferences, mergedPatterns)
      })
    )

  /**
   * Merge behavior patterns, updating existing ones and adding new ones
   */
  private mergeBehaviorPatterns = (
    existing: BehaviorPattern[],
    newPatterns: BehaviorPattern[]
  ): BehaviorPattern[] => {
    const patternMap = new Map<string, BehaviorPattern>()

    // Add existing patterns
    existing.forEach(pattern => {
      const key = `${pattern.pattern_type}-${JSON.stringify(pattern.pattern_data)}`
      patternMap.set(key, pattern)
    })

    // Update or add new patterns
    newPatterns.forEach(pattern => {
      const key = `${pattern.pattern_type}-${JSON.stringify(pattern.pattern_data)}`
      const existingPattern = patternMap.get(key)

      if (existingPattern) {
        // Update existing pattern
        patternMap.set(key, {
          ...existingPattern,
          frequency: existingPattern.frequency + pattern.frequency,
          last_observed: pattern.last_observed,
          confidence: Math.max(existingPattern.confidence, pattern.confidence)
        })
      } else {
        // Add new pattern
        patternMap.set(key, pattern)
      }
    })

    return Array.from(patternMap.values())
  }

  /**
   * Handle and categorize errors
   */
  private handleError = (error: unknown, context: string): MemoryPersistenceError => {
    logger.error(`MemoryPersistenceService: ${context}`, error)

    if (error instanceof Error) {
      // Database errors
      if (error.message.includes('PGRST') || error.message.includes('postgres')) {
        return {
          type: 'database',
          message: 'Database operation failed',
          details: { originalError: error.message, context }
        }
      }

      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          type: 'network',
          message: 'Network connection failed',
          details: { originalError: error.message, context }
        }
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return {
          type: 'permission',
          message: 'Permission denied',
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

// Export singleton instance
export const memoryPersistenceService = new MemoryPersistenceService()