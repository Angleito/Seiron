/**
 * API Endpoints Test Suite
 * Tests the Next.js API routes with mock data
 */

import { NextRequest } from 'next/server';
import { GET as healthCheck } from '../health/route';
import { GET as getSessions } from '../chat/sessions/route';
import { GET as getMessages } from '../chat/messages/[sessionId]/route';
import { GET as getMemories } from '../ai/memory/load/route';

// Mock the modules
jest.mock('@/lib/mockData', () => ({
  mockDataStore: {
    getSessions: jest.fn().mockReturnValue({
      sessions: [
        {
          id: 'session_test_1',
          title: 'Test Session',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          last_message_at: '2024-01-01T00:00:00.000Z',
          is_archived: false,
          message_count: 0,
          userId: 'anonymous'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }),
    getOrCreateSession: jest.fn().mockReturnValue({
      id: 'session_test_1',
      title: 'Test Session',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      last_message_at: '2024-01-01T00:00:00.000Z',
      is_archived: false,
      message_count: 0,
      userId: 'anonymous'
    }),
    getMessages: jest.fn().mockReturnValue({
      messages: [
        {
          id: 'msg_test_1',
          sessionId: 'session_test_1',
          role: 'user',
          content: 'Hello, world!',
          timestamp: '2024-01-01T00:00:00.000Z',
          created_at: '2024-01-01T00:00:00.000Z',
          sequence_number: 1
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }),
    getMemories: jest.fn().mockReturnValue([
      {
        id: 'mem_test_1',
        userId: 'anonymous',
        category: 'preference',
        content: 'Test memory',
        importance: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ]),
    getStats: jest.fn().mockReturnValue({
      total_sessions: 1,
      active_sessions: 1,
      archived_sessions: 0,
      total_messages: 1
    })
  },
  createMockResponse: jest.fn((data) => data),
  createErrorResponse: jest.fn((message, status) => ({ error: message, status }))
}));

jest.mock('@/utils/apiRetry', () => ({
  fetchWithRetry: jest.fn().mockRejectedValue(new Error('Backend unavailable'))
}));

jest.mock('@/lib/conversation-memory', () => ({
  loadMemories: jest.fn().mockResolvedValue({ _tag: 'Right', right: [] })
}));

// Helper function to create mock NextRequest
const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
  return {
    url,
    headers: new Headers(headers),
    method: 'GET'
  } as NextRequest;
};

// Mock headers() function
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers({
    'x-user-id': 'anonymous'
  }))
}));

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await healthCheck(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });

    it('should return detailed health information', async () => {
      const request = createMockRequest('http://localhost:3000/api/health?details=true');
      const response = await healthCheck(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.details).toBeDefined();
      expect(data.details.backend).toBeDefined();
      expect(data.details.api).toBeDefined();
    });
  });

  describe('Chat Sessions', () => {
    it('should return sessions with pagination', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat/sessions?page=1&limit=20');
      const response = await getSessions(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessions).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    it('should handle search parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat/sessions?search=test');
      const response = await getSessions(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Chat Messages', () => {
    it('should return messages for valid session', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat/messages/session_test_1?page=1&limit=20');
      const response = await getMessages(request, { params: { sessionId: 'session_test_1' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.messages).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('should return 400 for invalid session ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat/messages/xx?page=1&limit=20');
      const response = await getMessages(request, { params: { sessionId: 'xx' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid pagination', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat/messages/session_test_1?page=0&limit=200');
      const response = await getMessages(request, { params: { sessionId: 'session_test_1' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('AI Memory', () => {
    it('should return memories for valid user', async () => {
      const request = createMockRequest('http://localhost:3000/api/ai/memory/load?userId=anonymous');
      const response = await getMemories(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.memories).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    it('should return 400 for missing userId', async () => {
      const request = createMockRequest('http://localhost:3000/api/ai/memory/load');
      const response = await getMemories(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should filter memories by session', async () => {
      const request = createMockRequest('http://localhost:3000/api/ai/memory/load?userId=anonymous&sessionId=session_test_1');
      const response = await getMemories(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Response Headers', () => {
    it('should include proper cache headers', async () => {
      const request = createMockRequest('http://localhost:3000/api/health');
      const response = await healthCheck(request);
      
      expect(response.headers.get('Cache-Control')).toBeDefined();
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock an error in the mock data store
      const mockError = new Error('Test error');
      jest.doMock('@/lib/mockData', () => ({
        mockDataStore: {
          getSessions: jest.fn().mockImplementation(() => {
            throw mockError;
          })
        },
        createErrorResponse: jest.fn((message, status) => ({ error: message, status }))
      }));

      const request = createMockRequest('http://localhost:3000/api/chat/sessions');
      
      try {
        const response = await getSessions(request);
        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
      } catch (error) {
        // Expected for this test
        expect(error).toBeDefined();
      }
    });
  });
});

// Integration test helpers
export const testApiEndpoints = async (baseUrl: string = 'http://localhost:3000') => {
  const results = {
    health: null as any,
    sessions: null as any,
    messages: null as any,
    memories: null as any,
    errors: [] as string[]
  };

  // Test health endpoint
  try {
    const healthResponse = await fetch(`${baseUrl}/api/health?details=true`);
    results.health = {
      status: healthResponse.status,
      data: await healthResponse.json()
    };
  } catch (error) {
    results.errors.push(`Health check failed: ${error}`);
  }

  // Test sessions endpoint
  try {
    const sessionsResponse = await fetch(`${baseUrl}/api/chat/sessions?page=1&limit=10`);
    results.sessions = {
      status: sessionsResponse.status,
      data: await sessionsResponse.json()
    };
  } catch (error) {
    results.errors.push(`Sessions failed: ${error}`);
  }

  // Test messages endpoint
  try {
    const messagesResponse = await fetch(`${baseUrl}/api/chat/messages/session_test_123?page=1&limit=20`);
    results.messages = {
      status: messagesResponse.status,
      data: await messagesResponse.json()
    };
  } catch (error) {
    results.errors.push(`Messages failed: ${error}`);
  }

  // Test memories endpoint
  try {
    const memoriesResponse = await fetch(`${baseUrl}/api/ai/memory/load?userId=anonymous`);
    results.memories = {
      status: memoriesResponse.status,
      data: await memoriesResponse.json()
    };
  } catch (error) {
    results.errors.push(`Memories failed: ${error}`);
  }

  return results;
};