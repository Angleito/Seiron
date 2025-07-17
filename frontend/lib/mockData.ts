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

// New AI Memory interfaces matching the requested format
export interface AIMemory {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  timestamp: string;
  type: 'preference' | 'conversation' | 'context';
}

export interface AIPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  voiceEnabled?: boolean;
}

export interface AIMemoryMetadata {
  source: 'mock' | 'kv' | 'localStorage';
  timestamp: string;
}

export interface AIMemoryResponse {
  memories: AIMemory[];
  preferences: AIPreferences;
  metadata: AIMemoryMetadata;
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

// AI Memory Mock Data Generation Functions
export const generateMockAIMemory = (
  userId: string = 'anonymous',
  sessionId: string = 'session_default',
  type: AIMemory['type'] = 'context'
): AIMemory => {
  const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const contents = {
    preference: [
      'User prefers dark theme for trading interfaces',
      'User likes concise responses with technical details',
      'User is interested in DeFi and automated trading strategies',
      'User prefers voice commands for quick trades',
      'User wants real-time price alerts for SEI token'
    ],
    conversation: [
      'Discussed SEI network performance optimization',
      'Explained orderbook functionality in detail',
      'User asked about staking rewards on SEI',
      'Conversation about MEV protection strategies',
      'Discussion on cross-chain bridging with SEI'
    ],
    context: [
      'User has intermediate knowledge of blockchain technology',
      'User is actively trading on SEI network',
      'User manages a portfolio worth >$10k',
      'User frequently uses automated trading bots',
      'User is based in PST timezone'
    ]
  };

  const contentArray = contents[type];
  const content = contentArray[Math.floor(Math.random() * contentArray.length)];

  return {
    id,
    userId,
    sessionId,
    content,
    timestamp: new Date().toISOString(),
    type
  };
};

export const generateMockPreferences = (userId: string = 'anonymous'): AIPreferences => {
  return {
    theme: Math.random() > 0.5 ? 'dark' : 'light',
    language: 'en',
    voiceEnabled: Math.random() > 0.3
  };
};

export const generateMockAIMemoryResponse = (
  userId: string = 'anonymous',
  sessionId?: string,
  memoriesCount: number = 5
): AIMemoryResponse => {
  const memories: AIMemory[] = [];
  const types: AIMemory['type'][] = ['preference', 'conversation', 'context'];
  
  // Generate diverse memories
  for (let i = 0; i < memoriesCount; i++) {
    const type = types[i % types.length];
    memories.push(generateMockAIMemory(
      userId,
      sessionId || `session_${Date.now() - i * 3600000}`,
      type
    ));
  }

  return {
    memories,
    preferences: generateMockPreferences(userId),
    metadata: {
      source: 'mock',
      timestamp: new Date().toISOString()
    }
  };
};

// Generate test scenarios
export const generateTestScenarios = () => {
  return {
    // New user with no memories
    newUser: generateMockAIMemoryResponse('user_new', undefined, 0),
    
    // Active trader with rich history
    activeTrader: generateMockAIMemoryResponse('user_active', 'session_trading', 10),
    
    // Anonymous user with basic preferences
    anonymousUser: generateMockAIMemoryResponse('anonymous', undefined, 3),
    
    // Power user with many sessions
    powerUser: (() => {
      const response = generateMockAIMemoryResponse('user_power', undefined, 20);
      response.preferences.theme = 'dark';
      response.preferences.voiceEnabled = true;
      return response;
    })(),
    
    // User with specific preferences
    customUser: (() => {
      const response = generateMockAIMemoryResponse('user_custom', 'session_custom', 7);
      response.memories.push({
        id: 'memory_custom_1',
        userId: 'user_custom',
        sessionId: 'session_custom',
        content: 'User exclusively trades SEI/USDC pairs',
        timestamp: new Date().toISOString(),
        type: 'preference'
      });
      response.preferences = {
        theme: 'dark',
        language: 'en',
        voiceEnabled: false
      };
      return response;
    })()
  };
};

// Utility to get mock memory by different sources
export const getMockMemoryBySource = (source: AIMemoryMetadata['source']): AIMemoryResponse => {
  const response = generateMockAIMemoryResponse();
  response.metadata.source = source;
  
  // Add source-specific characteristics
  switch (source) {
    case 'kv':
      // KV store typically has more persistent, structured data
      response.memories.push({
        id: 'memory_kv_persistent',
        userId: 'anonymous',
        sessionId: 'session_kv',
        content: 'Long-term preference: Always show USD values alongside SEI',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days old
        type: 'preference'
      });
      break;
    case 'localStorage':
      // Local storage might have more recent, browser-specific data
      response.memories = response.memories.slice(0, 3); // Fewer memories
      response.preferences.theme = 'light'; // Browser-specific preference
      break;
    case 'mock':
      // Mock data is already the default
      break;
  }
  
  return response;
};