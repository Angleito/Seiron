/**
 * Supabase Service Integration Tests
 * Tests database operations, message persistence, and session management
 */

import request from 'supertest';
import express from 'express';
import { chatRouter } from '../../routes/chat';
import { SupabaseService, MessageRecord, DatabaseMessage, createSupabaseService } from '../SupabaseService';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Mock Supabase client to simulate database operations
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn()
        })),
        limit: jest.fn()
      })),
      order: jest.fn(() => ({
        limit: jest.fn()
      })),
      limit: jest.fn(),
      count: jest.fn(),
      head: jest.fn()
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn()
      }))
    }))
  }))
};

// Mock createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Test data generators
const generateTestUser = (walletAddress: string = '0x1234567890123456789012345678901234567890') => ({
  id: `user-${Date.now()}`,
  wallet_address: walletAddress
});

const generateTestSession = (userId: string) => ({
  id: `session-${Date.now()}`,
  user_id: userId,
  session_name: `Test Session ${Date.now()}`,
  is_active: true
});

const generateTestMessage = (sessionId: string, userId: string, role: 'user' | 'assistant' = 'user'): DatabaseMessage => ({
  id: `msg-${Date.now()}`,
  session_id: sessionId,
  user_id: userId,
  role,
  content: 'Test message content',
  crypto_context: {
    portfolio_data: { totalValue: 1000 },
    wallet_info: { network: 'sei' }
  },
  metadata: {
    timestamp: new Date().toISOString()
  },
  token_usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

describe('SupabaseService Integration Tests', () => {
  let supabaseService: SupabaseService;
  let testUser: any;
  let testSession: any;
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create service with test config
    const serviceResult = createSupabaseService({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key'
    });
    
    expect(serviceResult._tag).toBe('Right');
    supabaseService = (serviceResult as E.Right<SupabaseService>).right;
    
    // Generate test data
    testUser = generateTestUser();
    testSession = generateTestSession(testUser.id);
    
    // Setup test app
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).services = {
        supabase: supabaseService,
        portfolio: {
          getPortfolioData: jest.fn(() => TE.right({ totalValueUSD: 5000 }))
        },
        ai: {
          processMessageEnhanced: jest.fn(() => TE.right({
            message: 'Test AI response',
            confidence: 0.95,
            command: null
          })),
          clearConversationHistory: jest.fn(() => TE.right(undefined)),
          getConversationHistory: jest.fn(() => [])
        },
        socket: {
          sendChatResponse: jest.fn(() => TE.right(undefined))
        }
      };
      next();
    });
    app.use('/api/chat', chatRouter);
  });

  describe('Database Operations', () => {
    describe('User Management', () => {
      it('should create a new user successfully', async () => {
        const testWallet = '0xabcdef1234567890abcdef1234567890abcdef12';
        
        // Mock getUserError to simulate user not found
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // Row not found
        });
        
        // Mock successful user creation
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: { id: 'new-user-id', wallet_address: testWallet },
          error: null
        });

        const result = await supabaseService.getOrCreateUser(testWallet)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<any>).right.wallet_address).toBe(testWallet);
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      });

      it('should return existing user if found', async () => {
        const existingUser = { id: 'existing-user', wallet_address: testUser.wallet_address };
        
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: existingUser,
          error: null
        });

        const result = await supabaseService.getOrCreateUser(testUser.wallet_address)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<any>).right.id).toBe('existing-user');
      });

      it('should handle user creation errors', async () => {
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });
        
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error', code: 'PGRST000' }
        });

        const result = await supabaseService.getOrCreateUser(testUser.wallet_address)();
        
        expect(result._tag).toBe('Left');
        expect((result as E.Left<Error>).left.message).toContain('Failed to create user');
      });
    });

    describe('Session Management', () => {
      it('should create a new session with custom name', async () => {
        const sessionName = 'Custom Session Name';
        
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: { id: 'new-session-id', user_id: testUser.id, session_name: sessionName },
          error: null
        });

        const result = await supabaseService.getOrCreateSession(testUser.id, sessionName)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<any>).right.user_id).toBe(testUser.id);
      });

      it('should return active session if no session name provided', async () => {
        const activeSession = { id: 'active-session', user_id: testUser.id };
        
        mockSupabaseClient.from().select().eq().eq().order().limit().single.mockResolvedValueOnce({
          data: activeSession,
          error: null
        });

        const result = await supabaseService.getOrCreateSession(testUser.id)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<any>).right.id).toBe('active-session');
      });

      it('should handle session creation errors', async () => {
        mockSupabaseClient.from().select().eq().eq().order().limit().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });
        
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Session creation failed', code: 'PGRST000' }
        });

        const result = await supabaseService.getOrCreateSession(testUser.id)();
        
        expect(result._tag).toBe('Left');
        expect((result as E.Left<Error>).left.message).toContain('Failed to create session');
      });
    });

    describe('Message Persistence', () => {
      it('should create message with crypto context', async () => {
        const testMessage = generateTestMessage(testSession.id, testUser.id);
        const messageData: Omit<MessageRecord, 'id' | 'created_at'> = {
          session_id: testSession.id,
          user_id: testUser.id,
          role: 'user',
          content: 'Test message with crypto context',
          crypto_context: {
            portfolio_data: { totalValue: 5000 },
            price_data: { ETH: 2000 }
          },
          metadata: { source: 'chat' },
          token_usage: { total_tokens: 25 }
        };
        
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: testMessage,
          error: null
        });

        const result = await supabaseService.createMessage(messageData)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<DatabaseMessage>).right.content).toBe('Test message with crypto context');
        expect((result as E.Right<DatabaseMessage>).right.crypto_context).toEqual({
          portfolio_data: { totalValue: 5000 },
          price_data: { ETH: 2000 }
        });
      });

      it('should handle message creation errors', async () => {
        const messageData: Omit<MessageRecord, 'id' | 'created_at'> = {
          session_id: testSession.id,
          user_id: testUser.id,
          role: 'user',
          content: 'Test message'
        };
        
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Message creation failed', code: 'PGRST000' }
        });

        const result = await supabaseService.createMessage(messageData)();
        
        expect(result._tag).toBe('Left');
        expect((result as E.Left<Error>).left.message).toContain('Failed to create message');
      });

      it('should retrieve messages by session', async () => {
        const testMessages = [
          generateTestMessage(testSession.id, testUser.id, 'user'),
          generateTestMessage(testSession.id, testUser.id, 'assistant')
        ];
        
        mockSupabaseClient.from().select().eq().order().limit.mockResolvedValueOnce({
          data: testMessages,
          error: null
        });

        const result = await supabaseService.getMessagesBySession(testSession.id)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<DatabaseMessage[]>).right).toHaveLength(2);
        expect((result as E.Right<DatabaseMessage[]>).right[0].role).toBe('user');
        expect((result as E.Right<DatabaseMessage[]>).right[1].role).toBe('assistant');
      });

      it('should update message crypto context', async () => {
        const messageId = 'test-message-id';
        const updatedContext = {
          transaction_context: { txHash: '0xabc123', status: 'confirmed' }
        };
        const updatedMessage = { ...generateTestMessage(testSession.id, testUser.id), crypto_context: updatedContext };
        
        mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
          data: updatedMessage,
          error: null
        });

        const result = await supabaseService.updateMessageCryptoContext(messageId, updatedContext)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<DatabaseMessage>).right.crypto_context).toEqual(updatedContext);
      });
    });

    describe('History and Pagination', () => {
      it('should retrieve conversation history with pagination', async () => {
        const testMessages = Array.from({ length: 5 }, (_, i) => 
          generateTestMessage(testSession.id, testUser.id)
        );
        
        // Mock count query
        mockSupabaseClient.from().select.mockImplementationOnce(() => ({
          count: jest.fn().mockResolvedValue({
            count: 15,
            error: null
          }),
          head: true
        }));
        
        // Mock paginated query
        mockSupabaseClient.from().select().eq().order().range = jest.fn().mockResolvedValueOnce({
          data: testMessages,
          error: null
        });

        const result = await supabaseService.getConversationHistory(testUser.wallet_address, 1, 5)();
        
        expect(result._tag).toBe('Right');
        const historyResult = (result as E.Right<any>).right;
        expect(historyResult.messages).toHaveLength(5);
        expect(historyResult.totalCount).toBe(15);
        expect(historyResult.hasMore).toBe(true);
      });

      it('should handle empty conversation history', async () => {
        mockSupabaseClient.from().select.mockImplementationOnce(() => ({
          count: jest.fn().mockResolvedValue({
            count: 0,
            error: null
          }),
          head: true
        }));
        
        mockSupabaseClient.from().select().eq().order().range = jest.fn().mockResolvedValueOnce({
          data: [],
          error: null
        });

        const result = await supabaseService.getConversationHistory(testUser.wallet_address, 1, 10)();
        
        expect(result._tag).toBe('Right');
        const historyResult = (result as E.Right<any>).right;
        expect(historyResult.messages).toHaveLength(0);
        expect(historyResult.totalCount).toBe(0);
        expect(historyResult.hasMore).toBe(false);
      });
    });

    describe('Message Deletion', () => {
      it('should delete messages by session', async () => {
        const deletedMessages = [
          { id: 'msg-1' },
          { id: 'msg-2' },
          { id: 'msg-3' }
        ];
        
        mockSupabaseClient.from().delete().eq().select.mockResolvedValueOnce({
          data: deletedMessages,
          error: null
        });

        const result = await supabaseService.deleteMessagesBySession(testSession.id)();
        
        expect(result._tag).toBe('Right');
        expect((result as E.Right<number>).right).toBe(3);
      });

      it('should handle deletion errors', async () => {
        mockSupabaseClient.from().delete().eq().select.mockResolvedValueOnce({
          data: null,
          error: { message: 'Deletion failed', code: 'PGRST000' }
        });

        const result = await supabaseService.deleteMessagesBySession(testSession.id)();
        
        expect(result._tag).toBe('Left');
        expect((result as E.Left<Error>).left.message).toContain('Failed to delete messages');
      });
    });
  });

  describe('Health Check', () => {
    it('should pass health check with valid connection', async () => {
      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: { count: 0 },
        error: null
      });

      const result = await supabaseService.healthCheck()();
      
      expect(result._tag).toBe('Right');
      expect((result as E.Right<boolean>).right).toBe(true);
    });

    it('should fail health check with database error', async () => {
      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      });

      const result = await supabaseService.healthCheck()();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Health check failed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeout errors', async () => {
      mockSupabaseClient.from().insert().select().single.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const messageData: Omit<MessageRecord, 'id' | 'created_at'> = {
        session_id: testSession.id,
        user_id: testUser.id,
        role: 'user',
        content: 'Test message'
      };

      const result = await supabaseService.createMessage(messageData)();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Network timeout');
    });

    it('should handle malformed data gracefully', async () => {
      const invalidMessageData = {
        session_id: null, // Invalid data
        user_id: testUser.id,
        role: 'user',
        content: 'Test message'
      } as any;

      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid data format', code: 'PGRST000' }
      });

      const result = await supabaseService.createMessage(invalidMessageData)();
      
      expect(result._tag).toBe('Left');
    });

    it('should handle concurrent operations correctly', async () => {
      const concurrentMessages = Array.from({ length: 5 }, (_, i) => ({
        session_id: testSession.id,
        user_id: testUser.id,
        role: 'user' as const,
        content: `Concurrent message ${i}`
      }));

      // Mock successful creation for all messages
      mockSupabaseClient.from().insert().select().single
        .mockResolvedValueOnce({ data: generateTestMessage(testSession.id, testUser.id), error: null })
        .mockResolvedValueOnce({ data: generateTestMessage(testSession.id, testUser.id), error: null })
        .mockResolvedValueOnce({ data: generateTestMessage(testSession.id, testUser.id), error: null })
        .mockResolvedValueOnce({ data: generateTestMessage(testSession.id, testUser.id), error: null })
        .mockResolvedValueOnce({ data: generateTestMessage(testSession.id, testUser.id), error: null });

      const results = await Promise.all(
        concurrentMessages.map(msg => supabaseService.createMessage(msg)())
      );

      results.forEach(result => {
        expect(result._tag).toBe('Right');
      });
    });
  });

  describe('Service Configuration', () => {
    it('should create service with minimal config', () => {
      const result = createSupabaseService({
        url: 'https://test.supabase.co',
        anonKey: 'test-key'
      });

      expect(result._tag).toBe('Right');
    });

    it('should fail with missing URL', () => {
      const result = createSupabaseService({
        url: '',
        anonKey: 'test-key'
      });

      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Supabase URL is required');
    });

    it('should fail with missing anon key', () => {
      const result = createSupabaseService({
        url: 'https://test.supabase.co',
        anonKey: ''
      });

      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Supabase anonymous key is required');
    });
  });
});