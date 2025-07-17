import { kv } from '@vercel/kv';
import { createHash } from 'crypto';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { logger } from '@lib/logger';

// Types for conversation memory
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    audioTranscribed?: boolean;
    confidence?: number;
    voiceId?: string;
    modelUsed?: string;
    processingTime?: number;
    tokenCount?: number;
  };
}

export interface ConversationMemory {
  id: string;
  userId: string;
  sessionId: string;
  turns: ConversationTurn[];
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  summary?: string;
  context: {
    portfolio?: any;
    preferences?: Record<string, any>;
    totalTurns: number;
    avgResponseTime?: number;
    lastActiveAt: number;
  };
  metadata: {
    version: string;
    compressed: boolean;
    encrypted: boolean;
    searchable: boolean;
  };
}

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
  conversationId?: string;
  turnId?: string;
}

export interface MemorySearchResult {
  entries: AIMemoryEntry[];
  conversations: ConversationMemory[];
  totalFound: number;
  searchTime: number;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  summary: string;
  keyTopics: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  complexity?: 'low' | 'medium' | 'high';
  actionItems?: string[];
  createdAt: number;
}

// Configuration constants
const MEMORY_CONFIG = {
  maxTurnsPerConversation: 100,
  maxConversationAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  summarizationThreshold: 20, // turns
  compressionThreshold: 50, // turns
  contextWindowSize: 10, // recent turns to include
  searchResultLimit: 50,
  memoryCleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// KV key patterns
const KV_KEYS = {
  conversation: (userId: string, sessionId: string) => `conv:${userId}:${sessionId}`,
  conversationIndex: (userId: string) => `conv_idx:${userId}`,
  memory: (userId: string, key: string) => `mem:${userId}:${key}`,
  memoryIndex: (userId: string) => `mem_idx:${userId}`,
  summary: (conversationId: string) => `sum:${conversationId}`,
  userPreferences: (userId: string) => `pref:${userId}`,
  searchIndex: (userId: string) => `search:${userId}`,
  lastCleanup: () => 'cleanup:last',
} as const;

// Utility functions
function generateTurnId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateConversationId(userId: string, sessionId: string): string {
  return createHash('sha256')
    .update(`${userId}:${sessionId}:${Date.now()}`)
    .digest('hex')
    .substring(0, 16);
}

function compressContent(content: string): string {
  // Simple compression for long content
  if (content.length > 1000) {
    return content.substring(0, 950) + '...[truncated]';
  }
  return content;
}

function createSearchableText(conversation: ConversationMemory): string {
  return conversation.turns
    .map(turn => turn.content)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Core conversation memory operations
export class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  
  static getInstance(): ConversationMemoryService {
    if (!ConversationMemoryService.instance) {
      ConversationMemoryService.instance = new ConversationMemoryService();
    }
    return ConversationMemoryService.instance;
  }

  // Create or get conversation
  async createConversation(
    userId: string,
    sessionId: string,
    initialContext?: any
  ): Promise<E.Either<Error, ConversationMemory>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const conversationId = generateConversationId(userId, sessionId);
          const now = Date.now();
          
          const conversation: ConversationMemory = {
            id: conversationId,
            userId,
            sessionId,
            turns: [],
            createdAt: now,
            updatedAt: now,
            context: {
              portfolio: initialContext?.portfolio,
              preferences: initialContext?.preferences || {},
              totalTurns: 0,
              lastActiveAt: now,
            },
            metadata: {
              version: '1.0',
              compressed: false,
              encrypted: false,
              searchable: true,
            },
          };

          // Store conversation
          await kv.set(KV_KEYS.conversation(userId, sessionId), conversation);
          
          // Update conversation index
          const indexKey = KV_KEYS.conversationIndex(userId);
          const existingIndex = await kv.get<string[]>(indexKey) || [];
          if (!existingIndex.includes(conversationId)) {
            await kv.set(indexKey, [...existingIndex, conversationId]);
          }

          logger.info(`Created conversation ${conversationId} for user ${userId}`);
          return conversation;
        },
        (error) => error as Error
      )
    )();
  }

  // Add turn to conversation
  async addTurn(
    userId: string,
    sessionId: string,
    role: ConversationTurn['role'],
    content: string,
    metadata?: ConversationTurn['metadata']
  ): Promise<E.Either<Error, ConversationTurn>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const conversationKey = KV_KEYS.conversation(userId, sessionId);
          const conversation = await kv.get<ConversationMemory>(conversationKey);
          
          if (!conversation) {
            throw new Error(`Conversation not found for user ${userId}, session ${sessionId}`);
          }

          const turnId = generateTurnId();
          const now = Date.now();
          
          const turn: ConversationTurn = {
            id: turnId,
            role,
            content: compressContent(content),
            timestamp: now,
            metadata,
          };

          // Add turn to conversation
          conversation.turns.push(turn);
          conversation.updatedAt = now;
          conversation.context.totalTurns = conversation.turns.length;
          conversation.context.lastActiveAt = now;

          // Check if we need to compress or summarize
          if (conversation.turns.length > MEMORY_CONFIG.compressionThreshold) {
            await this.compressConversation(conversation);
          } else if (conversation.turns.length >= MEMORY_CONFIG.summarizationThreshold) {
            await this.generateSummary(conversation);
          }

          // Store updated conversation
          await kv.set(conversationKey, conversation);
          
          // Update search index
          if (conversation.metadata.searchable) {
            await this.updateSearchIndex(userId, conversation);
          }

          logger.debug(`Added turn ${turnId} to conversation ${conversation.id}`);
          return turn;
        },
        (error) => error as Error
      )
    )();
  }

  // Get conversation with context window
  async getConversation(
    userId: string,
    sessionId: string,
    includeFullHistory = false
  ): Promise<E.Either<Error, ConversationMemory | null>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const conversation = await kv.get<ConversationMemory>(
            KV_KEYS.conversation(userId, sessionId)
          );
          
          if (!conversation) {
            return null;
          }

          // Return recent turns only unless full history requested
          if (!includeFullHistory && conversation.turns.length > MEMORY_CONFIG.contextWindowSize) {
            const recentTurns = conversation.turns.slice(-MEMORY_CONFIG.contextWindowSize);
            return {
              ...conversation,
              turns: recentTurns,
            };
          }

          return conversation;
        },
        (error) => error as Error
      )
    )();
  }

  // Get conversation context for AI
  async getContextForAI(
    userId: string,
    sessionId: string
  ): Promise<E.Either<Error, { conversation: ConversationMemory | null; memories: AIMemoryEntry[] }>> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Get recent conversation
          const conversationResult = await this.getConversation(userId, sessionId);
          if (E.isLeft(conversationResult)) {
            throw conversationResult.left;
          }
          
          const conversation = conversationResult.right;
          
          // Get relevant memories
          const memories = await this.getRelevantMemories(userId, sessionId);
          
          return {
            conversation,
            memories: E.isRight(memories) ? memories.right : [],
          };
        },
        (error) => error as Error
      )
    )();
  }

  // Memory operations
  async saveMemory(entry: Omit<AIMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<E.Either<Error, AIMemoryEntry>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const now = new Date();
          
          const memoryEntry: AIMemoryEntry = {
            ...entry,
            id,
            createdAt: now,
            updatedAt: now,
          };

          // Store memory
          const memoryKey = KV_KEYS.memory(entry.userId, entry.key);
          await kv.set(memoryKey, memoryEntry);
          
          // Update memory index
          const indexKey = KV_KEYS.memoryIndex(entry.userId);
          const existingIndex = await kv.get<string[]>(indexKey) || [];
          if (!existingIndex.includes(entry.key)) {
            await kv.set(indexKey, [...existingIndex, entry.key]);
          }

          logger.debug(`Saved memory ${id} for user ${entry.userId}`);
          return memoryEntry;
        },
        (error) => error as Error
      )
    )();
  }

  async getMemory(userId: string, key: string): Promise<E.Either<Error, AIMemoryEntry | null>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const memory = await kv.get<AIMemoryEntry>(KV_KEYS.memory(userId, key));
          return memory || null;
        },
        (error) => error as Error
      )
    )();
  }

  async getRelevantMemories(
    userId: string,
    sessionId?: string,
    category?: AIMemoryEntry['category'],
    limit = 20
  ): Promise<E.Either<Error, AIMemoryEntry[]>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const indexKey = KV_KEYS.memoryIndex(userId);
          const memoryKeys = await kv.get<string[]>(indexKey) || [];
          
          const memories: AIMemoryEntry[] = [];
          
          for (const key of memoryKeys.slice(0, limit * 2)) { // Get more to filter
            const memory = await kv.get<AIMemoryEntry>(KV_KEYS.memory(userId, key));
            if (memory) {
              // Filter by session and category if specified
              if (sessionId && memory.sessionId !== sessionId && memory.sessionId !== 'global') {
                continue;
              }
              if (category && memory.category !== category) {
                continue;
              }
              
              // Check expiration
              if (memory.expiresAt && new Date(memory.expiresAt) < new Date()) {
                continue;
              }
              
              memories.push(memory);
              if (memories.length >= limit) break;
            }
          }
          
          return memories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        },
        (error) => error as Error
      )
    )();
  }

  // Search functionality
  async searchMemories(
    userId: string,
    query: string,
    options?: {
      category?: AIMemoryEntry['category'];
      minConfidence?: number;
      limit?: number;
      includeConversations?: boolean;
    }
  ): Promise<E.Either<Error, MemorySearchResult>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const startTime = Date.now();
          const { category, minConfidence = 0, limit = 20, includeConversations = false } = options || {};
          
          const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
          
          // Search memories
          const memories = await this.getRelevantMemories(userId, undefined, category, limit * 2);
          const matchingMemories = E.isRight(memories) 
            ? memories.right.filter(memory => {
                if (memory.confidence < minConfidence) return false;
                
                const searchableContent = `${memory.key} ${JSON.stringify(memory.value)}`.toLowerCase();
                return searchTerms.some(term => searchableContent.includes(term));
              }).slice(0, limit)
            : [];
          
          // Search conversations if requested
          let matchingConversations: ConversationMemory[] = [];
          if (includeConversations) {
            const conversationIndex = await kv.get<string[]>(KV_KEYS.conversationIndex(userId)) || [];
            
            for (const convId of conversationIndex.slice(0, 10)) { // Limit conversation search
              const conversation = await kv.get<ConversationMemory>(`conv:${userId}:${convId}`);
              if (conversation) {
                const searchableText = createSearchableText(conversation);
                if (searchTerms.some(term => searchableText.includes(term))) {
                  matchingConversations.push(conversation);
                }
              }
            }
          }
          
          const searchTime = Date.now() - startTime;
          
          return {
            entries: matchingMemories,
            conversations: matchingConversations,
            totalFound: matchingMemories.length + matchingConversations.length,
            searchTime,
          };
        },
        (error) => error as Error
      )
    )();
  }

  // Private helper methods
  private async updateSearchIndex(userId: string, conversation: ConversationMemory): Promise<void> {
    const searchKey = KV_KEYS.searchIndex(userId);
    const searchableText = createSearchableText(conversation);
    
    // Store searchable content with conversation ID
    await kv.set(`${searchKey}:${conversation.id}`, {
      conversationId: conversation.id,
      searchableText,
      lastUpdated: conversation.updatedAt,
    });
  }

  private async compressConversation(conversation: ConversationMemory): Promise<void> {
    // Keep only recent turns and summary
    const recentTurns = conversation.turns.slice(-MEMORY_CONFIG.contextWindowSize);
    const olderTurns = conversation.turns.slice(0, -MEMORY_CONFIG.contextWindowSize);
    
    // Create summary of older turns if not already compressed
    if (!conversation.metadata.compressed && olderTurns.length > 0) {
      const summary = this.createSimpleSummary(olderTurns);
      conversation.summary = summary;
      conversation.turns = recentTurns;
      conversation.metadata.compressed = true;
      
      logger.info(`Compressed conversation ${conversation.id}, kept ${recentTurns.length} recent turns`);
    }
  }

  private async generateSummary(conversation: ConversationMemory): Promise<void> {
    // Simple summary generation
    const summary = this.createSimpleSummary(conversation.turns);
    
    const summaryData: ConversationSummary = {
      id: conversation.id,
      sessionId: conversation.sessionId,
      summary,
      keyTopics: this.extractKeyTopics(conversation.turns),
      createdAt: Date.now(),
    };
    
    await kv.set(KV_KEYS.summary(conversation.id), summaryData);
    conversation.summary = summary;
  }

  private createSimpleSummary(turns: ConversationTurn[]): string {
    const userMessages = turns.filter(turn => turn.role === 'user').map(turn => turn.content);
    const assistantMessages = turns.filter(turn => turn.role === 'assistant').map(turn => turn.content);
    
    return `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. ` +
           `Topics discussed: ${this.extractKeyTopics(turns).join(', ')}.`;
  }

  private extractKeyTopics(turns: ConversationTurn[]): string[] {
    // Simple keyword extraction
    const text = turns.map(turn => turn.content).join(' ').toLowerCase();
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    
    const words = text.split(/\s+/).filter(word => 
      word.length > 3 && 
      !commonWords.includes(word) &&
      /^[a-zA-Z]+$/.test(word)
    );
    
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Cleanup operations
  async cleanupExpiredMemories(userId?: string): Promise<E.Either<Error, { cleaned: number; errors: number }>> {
    return pipe(
      TE.tryCatch(
        async () => {
          let cleaned = 0;
          let errors = 0;
          const now = Date.now();
          
          // Check if cleanup is needed (daily)
          const lastCleanup = await kv.get<number>(KV_KEYS.lastCleanup()) || 0;
          if (now - lastCleanup < MEMORY_CONFIG.memoryCleanupInterval) {
            return { cleaned: 0, errors: 0 };
          }
          
          // Clean up conversations
          if (userId) {
            const conversationIndex = await kv.get<string[]>(KV_KEYS.conversationIndex(userId)) || [];
            
            for (const sessionId of conversationIndex) {
              try {
                const conversation = await kv.get<ConversationMemory>(KV_KEYS.conversation(userId, sessionId));
                if (conversation) {
                  const age = now - conversation.createdAt;
                  if (conversation.expiresAt && now > conversation.expiresAt || 
                      age > MEMORY_CONFIG.maxConversationAge) {
                    await kv.del(KV_KEYS.conversation(userId, sessionId));
                    cleaned++;
                  }
                }
              } catch (error) {
                errors++;
                logger.error(`Error cleaning conversation ${sessionId}:`, error);
              }
            }
            
            // Clean up memories
            const memoryIndex = await kv.get<string[]>(KV_KEYS.memoryIndex(userId)) || [];
            
            for (const key of memoryIndex) {
              try {
                const memory = await kv.get<AIMemoryEntry>(KV_KEYS.memory(userId, key));
                if (memory && memory.expiresAt && new Date(memory.expiresAt) < new Date()) {
                  await kv.del(KV_KEYS.memory(userId, key));
                  cleaned++;
                }
              } catch (error) {
                errors++;
                logger.error(`Error cleaning memory ${key}:`, error);
              }
            }
          }
          
          // Update last cleanup time
          await kv.set(KV_KEYS.lastCleanup(), now);
          
          logger.info(`Memory cleanup completed: ${cleaned} items cleaned, ${errors} errors`);
          return { cleaned, errors };
        },
        (error) => error as Error
      )
    )();
  }

  // User preferences management
  async saveUserPreferences(userId: string, preferences: Record<string, any>): Promise<E.Either<Error, void>> {
    return pipe(
      TE.tryCatch(
        async () => {
          await kv.set(KV_KEYS.userPreferences(userId), {
            preferences,
            updatedAt: Date.now(),
          });
        },
        (error) => error as Error
      )
    )();
  }

  async getUserPreferences(userId: string): Promise<E.Either<Error, Record<string, any>>> {
    return pipe(
      TE.tryCatch(
        async () => {
          const data = await kv.get<{ preferences: Record<string, any> }>(KV_KEYS.userPreferences(userId));
          return data?.preferences || {};
        },
        (error) => error as Error
      )
    )();
  }
}

// Export singleton instance
export const conversationMemory = ConversationMemoryService.getInstance();

// Convenience functions that match the existing useAIMemory interface
export async function loadMemories(userId: string, sessionId?: string): Promise<E.Either<Error, AIMemoryEntry[]>> {
  return conversationMemory.getRelevantMemories(userId, sessionId);
}

export async function saveMemory(
  userId: string,
  sessionId: string,
  key: string,
  value: any,
  category: AIMemoryEntry['category'] = 'context',
  confidence = 1.0
): Promise<E.Either<Error, AIMemoryEntry>> {
  return conversationMemory.saveMemory({
    userId,
    sessionId,
    key,
    value,
    category,
    confidence,
  });
}

export async function searchMemories(
  userId: string,
  query: string,
  options?: {
    category?: AIMemoryEntry['category'];
    minConfidence?: number;
    limit?: number;
  }
): Promise<E.Either<Error, AIMemoryEntry[]>> {
  const result = await conversationMemory.searchMemories(userId, query, options);
  return pipe(
    result,
    E.map(searchResult => searchResult.entries)
  );
}

export async function deleteMemory(userId: string, key: string): Promise<E.Either<Error, void>> {
  return pipe(
    TE.tryCatch(
      async () => {
        await kv.del(KV_KEYS.memory(userId, key));
        
        // Remove from index
        const indexKey = KV_KEYS.memoryIndex(userId);
        const existingIndex = await kv.get<string[]>(indexKey) || [];
        const updatedIndex = existingIndex.filter(k => k !== key);
        await kv.set(indexKey, updatedIndex);
      },
      (error) => error as Error
    )
  )();
}

export async function updateMemory(
  userId: string,
  key: string,
  updates: Partial<Pick<AIMemoryEntry, 'value' | 'confidence' | 'category'>>
): Promise<E.Either<Error, AIMemoryEntry>> {
  return pipe(
    TE.tryCatch(
      async () => {
        const existing = await kv.get<AIMemoryEntry>(KV_KEYS.memory(userId, key));
        if (!existing) {
          throw new Error(`Memory with key ${key} not found`);
        }
        
        const updated: AIMemoryEntry = {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        };
        
        await kv.set(KV_KEYS.memory(userId, key), updated);
        return updated;
      },
      (error) => error as Error
    )
  )();
}