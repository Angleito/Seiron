/**
 * Chat API Integration Tests with Supabase
 * Tests message persistence, session management, and crypto context storage
 */

import request from 'supertest';
import express from 'express';
import { chatRouter } from '../chat';
import { SupabaseService, MessageRecord, DatabaseMessage } from '../../services/SupabaseService';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Mock Supabase Service
const createMockSupabaseService = () => {
  const mockMessages: DatabaseMessage[] = [];
  let messageIdCounter = 1;
  let userIdCounter = 1;
  let sessionIdCounter = 1;

  return {
    // User management
    getOrCreateUser: jest.fn((walletAddress: string) => 
      TE.right({
        id: `user-${userIdCounter++}`,
        wallet_address: walletAddress
      })
    ),

    // Session management  
    getOrCreateSession: jest.fn((userId: string, sessionName?: string) =>
      TE.right({
        id: `session-${sessionIdCounter++}`,
        user_id: userId,
        session_name: sessionName || `Default Session ${Date.now()}`
      })
    ),

    // Message operations
    createMessage: jest.fn((messageData: Omit<MessageRecord, 'id' | 'created_at'>) => {
      const message: DatabaseMessage = {
        id: `msg-${messageIdCounter++}`,
        ...messageData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockMessages.push(message);
      return TE.right(message);
    }),

    getMessagesBySession: jest.fn((sessionId: string, limit = 50) => 
      TE.right(mockMessages.filter(msg => msg.session_id === sessionId).slice(-limit))
    ),

    getMessagesByWallet: jest.fn((walletAddress: string, limit = 100) => 
      TE.right(mockMessages.slice(-limit))
    ),

    getConversationHistory: jest.fn((walletAddress: string, page = 1, pageSize = 20) => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const messages = mockMessages.slice(startIndex, endIndex);
      
      return TE.right({
        messages,
        totalCount: mockMessages.length,
        hasMore: endIndex < mockMessages.length
      });
    }),

    updateMessageCryptoContext: jest.fn((messageId: string, cryptoContext: any) => {
      const message = mockMessages.find(msg => msg.id === messageId);
      if (message) {
        message.crypto_context = cryptoContext;
        return TE.right(message);
      }
      return TE.left(new Error('Message not found'));
    }),

    deleteMessagesBySession: jest.fn((sessionId: string) => {
      const deletedCount = mockMessages.filter(msg => msg.session_id === sessionId).length;
      mockMessages.splice(0, mockMessages.length, ...mockMessages.filter(msg => msg.session_id !== sessionId));
      return TE.right(deletedCount);
    }),

    healthCheck: jest.fn(() => TE.right(true)),

    // Helper to access mock data
    _getMockMessages: () => mockMessages,
    _clearMockMessages: () => mockMessages.splice(0, mockMessages.length)
  };
};

describe('Chat API Supabase Integration Tests', () => {
  let app: express.Application;
  let mockSupabase: ReturnType<typeof createMockSupabaseService>;
  let mockServices: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseService();
    
    mockServices = {
      supabase: mockSupabase,
      portfolio: {
        getPortfolioData: jest.fn(() => TE.right({
          totalValueUSD: 10000,
          lendingPositions: [
            { asset: 'USDC', value: 5000, apy: 12.5 }
          ],
          liquidityPositions: [
            { pool: 'ETH/USDC', value: 3000, apr: 15.2 }
          ],
          tokenBalances: [
            { token: 'SEI', balance: 1000, valueUSD: 2000 }
          ]
        }))
      },
      ai: {
        processMessageEnhanced: jest.fn(() => TE.right({
          message: 'Seiron has processed your request successfully!',
          confidence: 0.95,
          command: null,
          metadata: { processing_time: 150 }
        })),
        clearConversationHistory: jest.fn(() => TE.right(undefined)),
        getConversationHistory: jest.fn(() => []),
        generatePortfolioAnalysis: jest.fn(() => TE.right('Portfolio analysis complete'))
      },
      socket: {
        sendChatResponse: jest.fn(() => TE.right(undefined))
      },
      orchestrator: {
        processIntent: jest.fn(() => TE.right({
          intentId: 'test-intent-123',
          data: { action: 'completed', result: 'success' },
          metadata: {
            executionTime: 200,
            adaptersUsed: ['hive'],
            tasksExecuted: 1,
            confidence: 0.9
          }
        }))
      },
      seiIntegration: {
        performHiveSearch: jest.fn(() => TE.right({ results: [] })),
        getHiveAnalytics: jest.fn(() => TE.right({ insights: [] })),
        executeSAKTool: jest.fn(() => TE.right({ success: true })),
        executeSAKBatch: jest.fn(() => TE.right({ results: [] })),
        getSAKTools: jest.fn(() => TE.right({ tools: [] })),
        getMCPBlockchainState: jest.fn(() => TE.right({ state: 'active' })),
        getMCPWalletBalance: jest.fn(() => TE.right({ balance: '1000' })),
        subscribeMCPEvents: jest.fn(() => TE.right({ subscribed: true }))
      },
      portfolioAnalytics: {
        generateEnhancedAnalysis: jest.fn(() => TE.right({ analysis: 'complete' }))
      },
      realTimeData: {
        getConnectionStatus: jest.fn(() => TE.right({ connected: true }))
      }
    };

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).services = mockServices;
      (req as any).ip = '127.0.0.1';
      next();
    });
    app.use('/api/chat', chatRouter);
  });

  describe('POST /api/chat/message', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testMessage = 'Show me my portfolio balance';

    it('should save user message and AI response to Supabase', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: testMessage,
          walletAddress: testWallet
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Seiron has processed your request successfully!');
      
      // Verify persistence status
      expect(response.body.data.persistence.user_message_saved).toBe(true);
      expect(response.body.data.persistence.ai_response_saved).toBe(true);
      expect(response.body.data.persistence.user_message_id).toBeTruthy();
      expect(response.body.data.persistence.ai_response_id).toBeTruthy();

      // Verify messages were saved
      const savedMessages = mockSupabase._getMockMessages();
      expect(savedMessages).toHaveLength(2);
      
      // Check user message
      const userMessage = savedMessages.find(msg => msg.role === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage!.content).toBe(testMessage);
      expect(userMessage!.metadata.wallet_address).toBe(testWallet);
      
      // Check AI response
      const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
      expect(aiMessage).toBeDefined();
      expect(aiMessage!.content).toBe('Seiron has processed your request successfully!');
      expect(aiMessage!.crypto_context.portfolio_data).toBeDefined();
      expect(aiMessage!.crypto_context.wallet_info.address).toBe(testWallet);
    });

    it('should include crypto context in AI response', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is my current position?',
          walletAddress: testWallet
        })
        .expect(200);

      const savedMessages = mockSupabase._getMockMessages();
      const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
      
      expect(aiMessage!.crypto_context).toEqual({
        portfolio_data: {
          totalValueUSD: 10000,
          lendingPositions: [{ asset: 'USDC', value: 5000, apy: 12.5 }],
          liquidityPositions: [{ pool: 'ETH/USDC', value: 3000, apr: 15.2 }],
          tokenBalances: [{ token: 'SEI', balance: 1000, valueUSD: 2000 }]
        },
        wallet_info: {
          address: testWallet,
          network: 'sei',
          timestamp: expect.any(String)
        },
        request_context: {
          request_id: expect.any(String),
          user_agent: expect.any(String),
          ip_address: '127.0.0.1'
        }
      });
    });

    it('should continue processing even if message saving fails', async () => {
      // Mock Supabase failure
      mockSupabase.createMessage.mockImplementationOnce(() => 
        TE.left(new Error('Database connection failed'))
      );

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: testMessage,
          walletAddress: testWallet
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.persistence.user_message_saved).toBe(false);
      expect(response.body.data.persistence.ai_response_saved).toBe(true); // AI response should still save
    });

    it('should validate wallet address format', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: testMessage,
          walletAddress: 'invalid-wallet'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Valid wallet address required');
    });

    it('should require message content', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: '',
          walletAddress: testWallet
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Message is required');
    });
  });

  describe('POST /api/chat/orchestrate', () => {
    const testSessionId = 'test-session-123';
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testMessage = 'I want to supply 1000 USDC to lending protocol';

    it('should save orchestrated chat messages with intent context', async () => {
      const response = await request(app)
        .post('/api/chat/orchestrate')
        .send({
          message: testMessage,
          sessionId: testSessionId,
          walletAddress: testWallet
        })
        .expect(200);

      expect(response.body.message).toBeTruthy();
      expect(response.body.agentType).toBeDefined();
      expect(response.body.persistence.user_message_saved).toBe(true);
      expect(response.body.persistence.ai_response_saved).toBe(true);

      const savedMessages = mockSupabase._getMockMessages();
      expect(savedMessages).toHaveLength(2);

      // Check user message with orchestrator context
      const userMessage = savedMessages.find(msg => msg.role === 'user');
      expect(userMessage!.crypto_context.session_id).toBe(testSessionId);
      expect(userMessage!.crypto_context.intent_parsing).toBe(true);
      expect(userMessage!.crypto_context.orchestrator_flow).toBe(true);

      // Check AI response with orchestration result
      const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
      expect(aiMessage!.crypto_context.orchestration_result).toBeDefined();
      expect(aiMessage!.crypto_context.intent_data).toEqual({
        id: expect.any(String),
        type: 'lending',
        action: 'supply',
        parameters: expect.objectContaining({
          amount: 1000,
          asset: 'USDC'
        })
      });
      expect(aiMessage!.crypto_context.execution_metadata.agent_type).toBe('orchestrator');
    });

    it('should work without wallet address (pre-connection)', async () => {
      const response = await request(app)
        .post('/api/chat/orchestrate')
        .send({
          message: 'What can you help me with?',
          sessionId: testSessionId
          // No walletAddress
        })
        .expect(200);

      expect(response.body.message).toBeTruthy();
      expect(response.body.persistence).toBeUndefined(); // No persistence without wallet

      // No messages should be saved
      const savedMessages = mockSupabase._getMockMessages();
      expect(savedMessages).toHaveLength(0);
    });

    it('should parse different intent types correctly', async () => {
      const testCases = [
        {
          message: 'I want to borrow 500 ETH',
          expectedType: 'lending',
          expectedAction: 'borrow'
        },
        {
          message: 'Add liquidity to ETH/USDC pool',
          expectedType: 'liquidity',
          expectedAction: 'add_liquidity'
        },
        {
          message: 'Show my portfolio positions',
          expectedType: 'portfolio',
          expectedAction: 'show_positions'
        },
        {
          message: 'Buy 100 SEI tokens',
          expectedType: 'trading',
          expectedAction: 'buy'
        },
        {
          message: 'Analyze market conditions',
          expectedType: 'analysis',
          expectedAction: 'analyze_market'
        }
      ];

      for (const testCase of testCases) {
        mockSupabase._clearMockMessages();
        
        await request(app)
          .post('/api/chat/orchestrate')
          .send({
            message: testCase.message,
            sessionId: testSessionId,
            walletAddress: testWallet
          })
          .expect(200);

        const savedMessages = mockSupabase._getMockMessages();
        const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
        
        expect(aiMessage!.crypto_context.intent_data.type).toBe(testCase.expectedType);
        expect(aiMessage!.crypto_context.intent_data.action).toBe(testCase.expectedAction);
      }
    });
  });

  describe('GET /api/chat/history', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      // Populate some test messages
      const testMessages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T10:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T10:00:01Z' },
        { role: 'user', content: 'Show portfolio', timestamp: '2024-01-01T10:01:00Z' },
        { role: 'assistant', content: 'Here is your portfolio', timestamp: '2024-01-01T10:01:01Z' }
      ];

      testMessages.forEach(msg => {
        mockSupabase._getMockMessages().push({
          id: `msg-${Date.now()}-${Math.random()}`,
          session_id: 'session-1',
          user_id: 'user-1',
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          created_at: msg.timestamp,
          updated_at: msg.timestamp,
          crypto_context: {},
          metadata: {}
        });
      });
    });

    it('should retrieve conversation history from Supabase', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .query({ walletAddress: testWallet })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.source).toBe('supabase');
      expect(response.body.data).toHaveLength(4);
      expect(response.body.pagination.totalCount).toBe(4);
      expect(response.body.pagination.hasMore).toBe(false);

      // Verify message structure
      const firstMessage = response.body.data[0];
      expect(firstMessage).toHaveProperty('id');
      expect(firstMessage).toHaveProperty('role');
      expect(firstMessage).toHaveProperty('content');
      expect(firstMessage).toHaveProperty('timestamp');
      expect(firstMessage).toHaveProperty('crypto_context');
      expect(firstMessage).toHaveProperty('metadata');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .query({ 
          walletAddress: testWallet,
          page: 1,
          pageSize: 2
        })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(2);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should fallback to AI service on Supabase failure', async () => {
      // Mock Supabase failure
      mockSupabase.getConversationHistory.mockImplementationOnce(() =>
        TE.left(new Error('Database connection failed'))
      );

      const response = await request(app)
        .get('/api/chat/history')
        .query({ walletAddress: testWallet })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.source).toBe('fallback');
      expect(mockServices.ai.getConversationHistory).toHaveBeenCalledWith(testWallet);
    });

    it('should require wallet address', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .expect(400);

      expect(response.body.error).toContain('Wallet address is required');
    });
  });

  describe('DELETE /api/chat/history', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      // Add some test messages
      Array.from({ length: 5 }, (_, i) => {
        mockSupabase._getMockMessages().push({
          id: `msg-${i}`,
          session_id: `session-${i % 2}`, // Two different sessions
          user_id: 'user-1',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          crypto_context: {},
          metadata: {}
        });
      });
    });

    it('should clear conversation history from both AI service and Supabase', async () => {
      const response = await request(app)
        .delete('/api/chat/history')
        .send({ walletAddress: testWallet })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.details.ai_service_cleared).toBe(true);
      expect(response.body.details.supabase_cleared).toBe(true);
      expect(response.body.details.messages_deleted).toBeGreaterThan(0);

      // Verify messages were deleted
      expect(mockSupabase.deleteMessagesBySession).toHaveBeenCalled();
      expect(mockServices.ai.clearConversationHistory).toHaveBeenCalledWith(testWallet);
    });

    it('should handle partial failures gracefully', async () => {
      // Mock AI service failure
      mockServices.ai.clearConversationHistory.mockImplementationOnce(() =>
        TE.left(new Error('AI service unavailable'))
      );

      const response = await request(app)
        .delete('/api/chat/history')
        .send({ walletAddress: testWallet })
        .expect(200);

      expect(response.body.success).toBe(true); // Still successful due to Supabase clearing
      expect(response.body.details.ai_service_cleared).toBe(false);
      expect(response.body.details.supabase_cleared).toBe(true);
    });

    it('should validate wallet address', async () => {
      const response = await request(app)
        .delete('/api/chat/history')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Real-time Functionality', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    it('should send socket updates on message processing', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message for socket',
          walletAddress: testWallet
        })
        .expect(200);

      expect(mockServices.socket.sendChatResponse).toHaveBeenCalledWith(
        testWallet,
        expect.objectContaining({
          message: 'Seiron has processed your request successfully!',
          confidence: 0.95
        })
      );
    });

    it('should handle socket failures gracefully', async () => {
      // Mock socket failure
      mockServices.socket.sendChatResponse.mockImplementationOnce(() =>
        Promise.reject(new Error('Socket connection failed'))
      );

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message',
          walletAddress: testWallet
        })
        .expect(200);

      // Request should still succeed
      expect(response.body.success).toBe(true);
    });
  });

  describe('Token Usage Tracking', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    it('should track token usage in messages', async () => {
      // Mock AI service to return token usage
      mockServices.ai.processMessageEnhanced.mockImplementationOnce(() =>
        TE.right({
          message: 'Response with token tracking',
          confidence: 0.95,
          command: null,
          token_usage: {
            prompt_tokens: 50,
            completion_tokens: 30,
            total_tokens: 80
          }
        })
      );

      await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message with token tracking',
          walletAddress: testWallet
        })
        .expect(200);

      const savedMessages = mockSupabase._getMockMessages();
      const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
      
      expect(aiMessage!.token_usage).toEqual({
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      });
    });
  });

  describe('Error Recovery', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    it('should handle AI service failures', async () => {
      mockServices.ai.processMessageEnhanced.mockImplementationOnce(() =>
        TE.left(new Error('AI service timeout'))
      );

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message',
          walletAddress: testWallet
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI service timeout');
    });

    it('should handle portfolio service failures', async () => {
      mockServices.portfolio.getPortfolioData.mockImplementationOnce(() =>
        TE.left(new Error('Portfolio service unavailable'))
      );

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message',
          walletAddress: testWallet
        })
        .expect(200);

      // Should still process without portfolio data
      expect(response.body.success).toBe(true);
      
      const savedMessages = mockSupabase._getMockMessages();
      const aiMessage = savedMessages.find(msg => msg.role === 'assistant');
      expect(aiMessage!.crypto_context.portfolio_data).toBeUndefined();
    });
  });
});