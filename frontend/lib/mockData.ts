/**
 * Mock Data System for Development and Fallback
 * Provides in-memory storage for sessions, messages, and AI memory
 */

export interface MockChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  created_at: string;
  sequence_number: number;
  metadata?: {
    audioTranscribed?: boolean;
    confidence?: number;
    voiceId?: string;
    modelUsed?: string;
    processingTime?: number;
    tokenCount?: number;
  };
}

export interface MockChatSession {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  metadata?: Record<string, unknown>;
  is_archived: boolean;
  message_count: number;
  userId: string;
}

export interface MockAIMemoryEntry {
  id: string;
  userId: string;
  sessionId?: string;
  category: 'preference' | 'context' | 'fact' | 'interaction';
  content: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
}

// In-memory storage
class MockDataStore {
  private sessions: Map<string, MockChatSession> = new Map();
  private messages: Map<string, MockChatMessage[]> = new Map();
  private memories: Map<string, MockAIMemoryEntry[]> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample sessions for anonymous user
    const sampleSessions: MockChatSession[] = [
      {
        id: 'session_sample_1',
        title: 'Welcome to Seiron',
        description: 'Introduction to the dragon trading assistant',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updated_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        last_message_at: new Date(Date.now() - 1800000).toISOString(),
        is_archived: false,
        message_count: 4,
        userId: 'anonymous'
      },
      {
        id: 'session_sample_2',
        title: 'SEI Token Analysis',
        description: 'Discussion about SEI token performance',
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        is_archived: false,
        message_count: 6,
        userId: 'anonymous'
      }
    ];

    // Store sample sessions
    sampleSessions.forEach(session => {
      this.sessions.set(session.id, session);
    });

    // Create sample messages
    const sampleMessages: MockChatMessage[] = [
      {
        id: 'msg_1',
        sessionId: 'session_sample_1',
        role: 'system',
        content: 'Welcome to Seiron! I am your AI dragon trading assistant. How can I help you today?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
        sequence_number: 1,
        metadata: { modelUsed: 'claude-3-sonnet' }
      },
      {
        id: 'msg_2',
        sessionId: 'session_sample_1',
        role: 'user',
        content: 'Hello! Can you tell me about the SEI network?',
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        created_at: new Date(Date.now() - 3000000).toISOString(),
        sequence_number: 2
      },
      {
        id: 'msg_3',
        sessionId: 'session_sample_1',
        role: 'assistant',
        content: 'SEI is a high-performance blockchain optimized for trading. It features built-in orderbook functionality and can process thousands of transactions per second.',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        created_at: new Date(Date.now() - 2400000).toISOString(),
        sequence_number: 3,
        metadata: { modelUsed: 'claude-3-sonnet', processingTime: 1200, tokenCount: 45 }
      },
      {
        id: 'msg_4',
        sessionId: 'session_sample_1',
        role: 'user',
        content: 'That sounds interesting! What are the main advantages?',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        created_at: new Date(Date.now() - 1800000).toISOString(),
        sequence_number: 4
      }
    ];

    // Store sample messages
    sampleMessages.forEach(message => {
      const sessionMessages = this.messages.get(message.sessionId) || [];
      sessionMessages.push(message);
      this.messages.set(message.sessionId, sessionMessages);
    });

    // Create sample AI memories
    const sampleMemories: MockAIMemoryEntry[] = [
      {
        id: 'mem_1',
        userId: 'anonymous',
        sessionId: 'session_sample_1',
        category: 'preference',
        content: 'User is interested in SEI network and high-performance trading',
        importance: 8,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'mem_2',
        userId: 'anonymous',
        category: 'fact',
        content: 'User has basic knowledge of blockchain technology',
        importance: 6,
        createdAt: new Date(Date.now() - 3000000).toISOString(),
        updatedAt: new Date(Date.now() - 3000000).toISOString()
      }
    ];

    // Store sample memories
    const userMemories = this.memories.get('anonymous') || [];
    userMemories.push(...sampleMemories);
    this.memories.set('anonymous', userMemories);
  }

  // Session management
  getSessions(userId: string = 'anonymous', options: {
    page?: number;
    limit?: number;
    archived?: boolean;
    search?: string;
    order?: 'asc' | 'desc';
  } = {}): { sessions: MockChatSession[]; pagination: PaginationInfo } {
    const { page = 1, limit = 20, archived = false, search, order = 'desc' } = options;
    
    let userSessions = Array.from(this.sessions.values()).filter(s => 
      s.userId === userId && s.is_archived === archived
    );

    // Apply search filter
    if (search) {
      userSessions = userSessions.filter(s => 
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sorting
    userSessions.sort((a, b) => {
      const aTime = new Date(a.last_message_at).getTime();
      const bTime = new Date(b.last_message_at).getTime();
      return order === 'desc' ? bTime - aTime : aTime - bTime;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = userSessions.slice(startIndex, endIndex);

    const totalPages = Math.ceil(userSessions.length / limit);

    return {
      sessions: paginatedSessions,
      pagination: {
        page,
        limit,
        total: userSessions.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  getSession(sessionId: string): MockChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  createSession(userId: string, title: string, description?: string): MockChatSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const session: MockChatSession = {
      id: sessionId,
      title,
      description,
      created_at: now,
      updated_at: now,
      last_message_at: now,
      is_archived: false,
      message_count: 0,
      userId
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return session;
  }

  // Message management
  getMessages(sessionId: string, options: {
    page?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    cursor?: string;
  } = {}): { messages: MockChatMessage[]; pagination: PaginationInfo } {
    const { page = 1, limit = 20, order = 'desc' } = options;
    
    let sessionMessages = this.messages.get(sessionId) || [];

    // Apply sorting
    sessionMessages.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return order === 'desc' ? bTime - aTime : aTime - bTime;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = sessionMessages.slice(startIndex, endIndex);

    const totalPages = Math.ceil(sessionMessages.length / limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: sessionMessages.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any): MockChatMessage {
    const messages = this.messages.get(sessionId) || [];
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const message: MockChatMessage = {
      id: messageId,
      sessionId,
      role,
      content,
      timestamp: now,
      created_at: now,
      sequence_number: messages.length + 1,
      metadata
    };

    messages.push(message);
    this.messages.set(sessionId, messages);

    // Update session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.last_message_at = now;
      session.updated_at = now;
      session.message_count = messages.length;
      this.sessions.set(sessionId, session);
    }

    return message;
  }

  // AI Memory management
  getMemories(userId: string, sessionId?: string): MockAIMemoryEntry[] {
    const userMemories = this.memories.get(userId) || [];
    
    if (sessionId) {
      return userMemories.filter(m => m.sessionId === sessionId);
    }
    
    return userMemories;
  }

  addMemory(userId: string, category: MockAIMemoryEntry['category'], content: string, sessionId?: string, importance: number = 5): MockAIMemoryEntry {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const memory: MockAIMemoryEntry = {
      id: memoryId,
      userId,
      sessionId,
      category,
      content,
      importance,
      createdAt: now,
      updatedAt: now
    };

    const userMemories = this.memories.get(userId) || [];
    userMemories.push(memory);
    this.memories.set(userId, userMemories);

    return memory;
  }

  // Utility methods
  getStats(userId: string) {
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId);
    const totalMessages = userSessions.reduce((sum, s) => sum + s.message_count, 0);

    return {
      total_sessions: userSessions.length,
      active_sessions: userSessions.filter(s => !s.is_archived).length,
      archived_sessions: userSessions.filter(s => s.is_archived).length,
      total_messages: totalMessages
    };
  }

  // Generate dynamic session if not exists
  getOrCreateSession(sessionId: string, userId: string = 'anonymous'): MockChatSession {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    // Create new session with extracted info from sessionId
    const timestamp = this.extractTimestampFromSessionId(sessionId);
    const title = `Chat Session ${new Date(timestamp).toLocaleDateString()}`;
    
    const now = new Date().toISOString();
    const session: MockChatSession = {
      id: sessionId,
      title,
      created_at: new Date(timestamp).toISOString(),
      updated_at: now,
      last_message_at: now,
      is_archived: false,
      message_count: 0,
      userId
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return session;
  }

  private extractTimestampFromSessionId(sessionId: string): number {
    // Extract timestamp from session ID format: session_timestamp_randomstring
    const match = sessionId.match(/session_(\d+)_/);
    return match ? parseInt(match[1]) : Date.now();
  }
}

// Export singleton instance
export const mockDataStore = new MockDataStore();

// Export utility functions
export const createMockResponse = (data: any, headers: Record<string, string> = {}) => ({
  ...data,
  headers: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    'Content-Type': 'application/json',
    ...headers
  }
});

export const createErrorResponse = (message: string, status: number = 400) => ({
  error: message,
  status,
  timestamp: new Date().toISOString()
});