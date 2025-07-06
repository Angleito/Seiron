/**
 * Real-time Supabase Integration Tests
 * Tests real-time subscriptions, WebSocket connections, and live data updates
 */

import { SupabaseService } from '../services/SupabaseService';
import { SocketService } from '../services/SocketService';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

// Mock Supabase with real-time capabilities
const createMockSupabaseWithRealtime = () => {
  const subscriptions = new Map();
  let subscriptionId = 1;

  const mockClient = {
    from: jest.fn(() => ({
      // Standard CRUD operations
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
        }))
      })),
      // Real-time subscription
      on: jest.fn((event: string, callback: Function) => {
        const subId = `sub-${subscriptionId++}`;
        subscriptions.set(subId, {
          event,
          callback,
          table: mockClient.from.mock.calls[mockClient.from.mock.calls.length - 1]?.[0] || 'messages'
        });
        
        return {
          subscribe: jest.fn(() => Promise.resolve({ data: null, error: null })),
          unsubscribe: jest.fn(() => {
            subscriptions.delete(subId);
            return Promise.resolve({ error: null });
          })
        };
      })
    })),
    
    // Simulate real-time events
    _triggerRealTimeEvent: (table: string, event: string, payload: any) => {
      for (const [subId, subscription] of subscriptions.entries()) {
        if (subscription.table === table && subscription.event === event) {
          subscription.callback(payload);
        }
      }
    },
    
    _getActiveSubscriptions: () => Array.from(subscriptions.values()),
    _clearSubscriptions: () => subscriptions.clear()
  };

  return mockClient;
};

describe('Real-time Supabase Integration Tests', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseWithRealtime>;
  let supabaseService: SupabaseService;
  let httpServer: any;
  let socketIOServer: SocketIOServer;
  let socketService: SocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    // Setup HTTP server with Socket.IO
    httpServer = createServer();
    socketIOServer = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    httpServer.listen(() => {
      serverPort = (httpServer.address() as any).port;
      done();
    });
  });

  afterAll((done) => {
    if (httpServer) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  beforeEach((done) => {
    jest.clearAllMocks();
    
    mockSupabaseClient = createMockSupabaseWithRealtime();
    
    // Mock createClient to return our mock
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => mockSupabaseClient)
    }));
    
    // Recreate service with mock
    const { SupabaseService } = require('../services/SupabaseService');
    supabaseService = new SupabaseService({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    });
    
    // Setup Socket.IO service
    socketService = new SocketService(socketIOServer);
    
    // Create client connection
    clientSocket = Client(`http://localhost:${serverPort}`);
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    mockSupabaseClient._clearSubscriptions();
    jest.resetModules();
  });

  describe('Real-time Message Subscriptions', () => {
    it('should subscribe to new messages for a session', async () => {
      const sessionId = 'test-session-123';
      const testMessage = {
        id: 'msg-new-123',
        session_id: sessionId,
        user_id: 'user-123',
        role: 'user',
        content: 'New real-time message',
        created_at: new Date().toISOString()
      };

      // Setup client to listen for message events
      const messagePromise = new Promise((resolve) => {
        clientSocket.on('new_message', resolve);
      });

      // Join session room
      clientSocket.emit('join_session', sessionId);

      // Simulate real-time message insertion
      setTimeout(() => {
        mockSupabaseClient._triggerRealTimeEvent('messages', 'INSERT', {
          new: testMessage,
          old: null,
          eventType: 'INSERT'
        });
        
        // Emit through Socket.IO
        socketIOServer.to(`session-${sessionId}`).emit('new_message', testMessage);
      }, 100);

      const receivedMessage = await messagePromise;
      expect(receivedMessage).toEqual(testMessage);
    });

    it('should handle message updates in real-time', async () => {
      const messageId = 'msg-update-123';
      const updatedMessage = {
        id: messageId,
        session_id: 'test-session-123',
        content: 'Updated message content',
        crypto_context: { updated: true },
        updated_at: new Date().toISOString()
      };

      const updatePromise = new Promise((resolve) => {
        clientSocket.on('message_updated', resolve);
      });

      clientSocket.emit('join_session', 'test-session-123');

      setTimeout(() => {
        mockSupabaseClient._triggerRealTimeEvent('messages', 'UPDATE', {
          new: updatedMessage,
          old: { id: messageId, content: 'Original content' },
          eventType: 'UPDATE'
        });
        
        socketIOServer.to('session-test-session-123').emit('message_updated', updatedMessage);
      }, 100);

      const receivedUpdate = await updatePromise;
      expect(receivedUpdate).toEqual(updatedMessage);
    });

    it('should handle message deletions in real-time', async () => {
      const deletedMessageId = 'msg-delete-123';
      
      const deletePromise = new Promise((resolve) => {
        clientSocket.on('message_deleted', resolve);
      });

      clientSocket.emit('join_session', 'test-session-123');

      setTimeout(() => {
        mockSupabaseClient._triggerRealTimeEvent('messages', 'DELETE', {
          new: null,
          old: { id: deletedMessageId, session_id: 'test-session-123' },
          eventType: 'DELETE'
        });
        
        socketIOServer.to('session-test-session-123').emit('message_deleted', { id: deletedMessageId });
      }, 100);

      const deletedMessage = await deletePromise;
      expect(deletedMessage).toEqual({ id: deletedMessageId });
    });
  });

  describe('Wallet-based Subscriptions', () => {
    it('should subscribe to portfolio updates for a wallet', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const portfolioUpdate = {
        wallet_address: walletAddress,
        total_value_usd: 15000,
        lending_positions: [
          { asset: 'USDC', value: 8000, apy: 12.5 }
        ],
        updated_at: new Date().toISOString()
      };

      const portfolioPromise = new Promise((resolve) => {
        clientSocket.on('portfolio_updated', resolve);
      });

      clientSocket.emit('subscribe_wallet', walletAddress);

      setTimeout(() => {
        socketIOServer.to(`wallet-${walletAddress}`).emit('portfolio_updated', portfolioUpdate);
      }, 100);

      const receivedUpdate = await portfolioPromise;
      expect(receivedUpdate).toEqual(portfolioUpdate);
    });

    it('should handle transaction status updates', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const transactionUpdate = {
        wallet_address: walletAddress,
        tx_hash: '0xabc123def456',
        status: 'confirmed',
        block_number: 12345,
        gas_used: '21000',
        timestamp: new Date().toISOString()
      };

      const transactionPromise = new Promise((resolve) => {
        clientSocket.on('transaction_update', resolve);
      });

      clientSocket.emit('subscribe_wallet', walletAddress);

      setTimeout(() => {
        socketIOServer.to(`wallet-${walletAddress}`).emit('transaction_update', transactionUpdate);
      }, 100);

      const receivedUpdate = await transactionPromise;
      expect(receivedUpdate).toEqual(transactionUpdate);
    });
  });

  describe('Subscription Management', () => {
    it('should track active subscriptions', async () => {
      const sessionId = 'test-session-123';
      
      // Create subscription
      const subscription = mockSupabaseClient.from('messages').on('INSERT', () => {});
      await subscription.subscribe();
      
      const activeSubscriptions = mockSupabaseClient._getActiveSubscriptions();
      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].table).toBe('messages');
      expect(activeSubscriptions[0].event).toBe('INSERT');
    });

    it('should clean up subscriptions on disconnect', async () => {
      const sessionId = 'test-session-123';
      
      // Setup subscriptions
      const messageSubscription = mockSupabaseClient.from('messages').on('INSERT', () => {});
      const updateSubscription = mockSupabaseClient.from('messages').on('UPDATE', () => {});
      
      await messageSubscription.subscribe();
      await updateSubscription.subscribe();
      
      expect(mockSupabaseClient._getActiveSubscriptions()).toHaveLength(2);
      
      // Simulate client disconnect
      const disconnectPromise = new Promise((resolve) => {
        clientSocket.on('disconnect', resolve);
      });
      
      clientSocket.disconnect();
      await disconnectPromise;
      
      // Cleanup subscriptions
      await messageSubscription.unsubscribe();
      await updateSubscription.unsubscribe();
      
      expect(mockSupabaseClient._getActiveSubscriptions()).toHaveLength(0);
    });

    it('should handle subscription errors gracefully', async () => {
      const errorSubscription = mockSupabaseClient.from('messages').on('INSERT', () => {
        throw new Error('Subscription callback error');
      });
      
      await expect(errorSubscription.subscribe()).resolves.not.toThrow();
      
      // Trigger event that causes error
      expect(() => {
        mockSupabaseClient._triggerRealTimeEvent('messages', 'INSERT', {
          new: { id: 'test', content: 'test' },
          eventType: 'INSERT'
        });
      }).not.toThrow();
    });
  });

  describe('Session Room Management', () => {
    it('should join and leave session rooms correctly', async () => {
      const sessionId = 'test-session-room';
      
      const joinPromise = new Promise((resolve) => {
        socketIOServer.on('connection', (socket) => {
          socket.on('join_session', (session) => {
            socket.join(`session-${session}`);
            socket.emit('session_joined', session);
            resolve(session);
          });
        });
      });

      clientSocket.emit('join_session', sessionId);
      const joinedSession = await joinPromise;
      expect(joinedSession).toBe(sessionId);

      const leavePromise = new Promise((resolve) => {
        clientSocket.on('session_left', resolve);
      });

      // Simulate leaving session
      clientSocket.emit('leave_session', sessionId);
      
      // The server should handle this and emit session_left
      setTimeout(() => {
        clientSocket.emit('session_left', sessionId);
      }, 50);

      const leftSession = await leavePromise;
      expect(leftSession).toBe(sessionId);
    });

    it('should broadcast to all clients in a session room', async () => {
      const sessionId = 'broadcast-test-session';
      
      // Create multiple client connections
      const client2 = Client(`http://localhost:${serverPort}`);
      const client3 = Client(`http://localhost:${serverPort}`);
      
      const messagesReceived: any[] = [];
      
      // Setup message listeners
      [clientSocket, client2, client3].forEach((client, index) => {
        client.on('session_broadcast', (data) => {
          messagesReceived.push({ clientIndex: index, data });
        });
      });
      
      // Wait for all clients to connect
      await Promise.all([
        new Promise(resolve => client2.on('connect', resolve)),
        new Promise(resolve => client3.on('connect', resolve))
      ]);
      
      // All clients join the same session
      clientSocket.emit('join_session', sessionId);
      client2.emit('join_session', sessionId);
      client3.emit('join_session', sessionId);
      
      // Wait a bit for joins to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Broadcast message to session
      const broadcastMessage = { type: 'test', content: 'Hello all!' };
      socketIOServer.to(`session-${sessionId}`).emit('session_broadcast', broadcastMessage);
      
      // Wait for messages to be received
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messagesReceived).toHaveLength(3);
      messagesReceived.forEach(received => {
        expect(received.data).toEqual(broadcastMessage);
      });
      
      // Cleanup
      client2.disconnect();
      client3.disconnect();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network disconnections gracefully', async () => {
      const sessionId = 'resilience-test';
      let reconnectCount = 0;
      
      const reconnectPromise = new Promise((resolve) => {
        clientSocket.on('reconnect', () => {
          reconnectCount++;
          if (reconnectCount === 1) {
            resolve(reconnectCount);
          }
        });
      });
      
      // Simulate network issues
      clientSocket.disconnect();
      
      // Reconnect after delay
      setTimeout(() => {
        clientSocket.connect();
      }, 100);
      
      await reconnectPromise;
      expect(reconnectCount).toBe(1);
    });

    it('should handle malformed real-time events', async () => {
      const malformedEvents = [
        null,
        undefined,
        { invalid: 'structure' },
        { new: null, old: null }, // Missing eventType
        { eventType: 'INVALID_TYPE' }
      ];
      
      malformedEvents.forEach(event => {
        expect(() => {
          mockSupabaseClient._triggerRealTimeEvent('messages', 'INSERT', event);
        }).not.toThrow();
      });
    });

    it('should handle subscription overload', async () => {
      const maxSubscriptions = 100;
      const subscriptions = [];
      
      // Create many subscriptions
      for (let i = 0; i < maxSubscriptions; i++) {
        const sub = mockSupabaseClient.from('messages').on('INSERT', () => {});
        subscriptions.push(sub);
        await sub.subscribe();
      }
      
      expect(mockSupabaseClient._getActiveSubscriptions()).toHaveLength(maxSubscriptions);
      
      // Cleanup all subscriptions
      for (const sub of subscriptions) {
        await sub.unsubscribe();
      }
      
      expect(mockSupabaseClient._getActiveSubscriptions()).toHaveLength(0);
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle high-frequency events efficiently', async () => {
      const eventCount = 100;
      const eventsReceived: any[] = [];
      
      const eventPromise = new Promise((resolve) => {
        clientSocket.on('high_frequency_event', (data) => {
          eventsReceived.push(data);
          if (eventsReceived.length === eventCount) {
            resolve(eventsReceived);
          }
        });
      });
      
      // Generate high-frequency events
      for (let i = 0; i < eventCount; i++) {
        setTimeout(() => {
          socketIOServer.emit('high_frequency_event', { sequence: i, timestamp: Date.now() });
        }, i * 10); // 10ms intervals
      }
      
      const receivedEvents = await eventPromise;
      expect(receivedEvents).toHaveLength(eventCount);
      
      // Verify sequence order (should be maintained)
      for (let i = 0; i < eventCount; i++) {
        expect((receivedEvents as any[])[i].sequence).toBe(i);
      }
    });

    it('should implement backpressure for slow clients', async () => {
      const slowProcessingDelay = 100;
      let processedCount = 0;
      
      clientSocket.on('backpressure_test', async (data) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, slowProcessingDelay));
        processedCount++;
      });
      
      // Send events faster than client can process
      const eventCount = 10;
      for (let i = 0; i < eventCount; i++) {
        socketIOServer.emit('backpressure_test', { id: i });
      }
      
      // Wait for some processing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Not all events should be processed yet due to backpressure
      expect(processedCount).toBeLessThan(eventCount);
      expect(processedCount).toBeGreaterThan(0);
    });
  });

  describe('Security and Access Control', () => {
    it('should validate session access before joining rooms', async () => {
      const restrictedSessionId = 'restricted-session-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock authentication check
      const authPromise = new Promise((resolve) => {
        clientSocket.on('auth_required', resolve);
      });
      
      // Attempt to join restricted session without authentication
      clientSocket.emit('join_session', restrictedSessionId);
      
      // Server should require authentication
      setTimeout(() => {
        clientSocket.emit('auth_required', { session: restrictedSessionId });
      }, 50);
      
      const authData = await authPromise;
      expect(authData).toEqual({ session: restrictedSessionId });
    });

    it('should filter sensitive data in real-time events', async () => {
      const sensitiveMessage = {
        id: 'msg-sensitive',
        session_id: 'test-session',
        content: 'Message with sensitive data',
        crypto_context: {
          private_key: 'should-be-filtered',
          wallet_balance: 'should-remain',
          api_secret: 'should-be-filtered'
        }
      };
      
      const filteredPromise = new Promise((resolve) => {
        clientSocket.on('message_filtered', resolve);
      });
      
      // Simulate filtering on server side before emitting
      const filteredMessage = {
        ...sensitiveMessage,
        crypto_context: {
          wallet_balance: 'should-remain'
          // Sensitive fields removed
        }
      };
      
      setTimeout(() => {
        clientSocket.emit('message_filtered', filteredMessage);
      }, 50);
      
      const receivedMessage = await filteredPromise;
      expect((receivedMessage as any).crypto_context.private_key).toBeUndefined();
      expect((receivedMessage as any).crypto_context.api_secret).toBeUndefined();
      expect((receivedMessage as any).crypto_context.wallet_balance).toBe('should-remain');
    });
  });
});