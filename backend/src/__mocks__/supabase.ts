/**
 * Comprehensive Supabase Mock for Testing
 * Provides realistic mock implementations for all Supabase operations
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { DatabaseMessage, MessageRecord } from '../services/SupabaseService';

export interface MockSupabaseState {
  users: Map<string, any>;
  sessions: Map<string, any>;
  messages: Map<string, DatabaseMessage>;
  currentUser: any | null;
  errorMode: boolean;
  errorType: string;
  latency: number;
  subscriptions: Map<string, any>;
}

export class MockSupabaseClient {
  private state: MockSupabaseState;
  private eventEmitter: any;

  constructor() {
    this.state = {
      users: new Map(),
      sessions: new Map(),
      messages: new Map(),
      currentUser: null,
      errorMode: false,
      errorType: 'network',
      latency: 0,
      subscriptions: new Map()
    };
    
    // Simple event emitter for real-time functionality
    this.eventEmitter = {
      listeners: new Map(),
      emit: (event: string, data: any) => {
        const handlers = this.eventEmitter.listeners.get(event) || [];
        handlers.forEach((handler: Function) => handler(data));
      },
      on: (event: string, handler: Function) => {
        const handlers = this.eventEmitter.listeners.get(event) || [];
        handlers.push(handler);
        this.eventEmitter.listeners.set(event, handlers);
      },
      off: (event: string, handler: Function) => {
        const handlers = this.eventEmitter.listeners.get(event) || [];
        const filtered = handlers.filter((h: Function) => h !== handler);
        this.eventEmitter.listeners.set(event, filtered);
      }
    };
  }

  // Authentication methods
  auth = {
    user: () => this.state.currentUser,
    
    signInWithPassword: jest.fn(async (credentials: any) => {
      await this.simulateLatency();
      
      if (this.state.errorMode && this.state.errorType === 'auth') {
        return { data: null, error: { message: 'Invalid credentials' } };
      }
      
      if (credentials.email === 'test@example.com' && credentials.password === 'correct') {
        this.state.currentUser = { 
          id: 'auth-user-123', 
          email: 'test@example.com',
          created_at: new Date().toISOString()
        };
        return { data: { user: this.state.currentUser }, error: null };
      }
      
      return { data: null, error: { message: 'Invalid credentials' } };
    }),
    
    signOut: jest.fn(async () => {
      await this.simulateLatency();
      this.state.currentUser = null;
      return { error: null };
    }),
    
    getUser: jest.fn(async () => {
      await this.simulateLatency();
      return { data: { user: this.state.currentUser }, error: null };
    })
  };

  // Database table operations
  from = jest.fn((table: string) => {
    return this.createTableOperations(table);
  });

  private createTableOperations(table: string) {
    switch (table) {
      case 'users':
        return this.createUsersOperations();
      case 'chat_sessions':
        return this.createSessionsOperations();
      case 'messages':
        return this.createMessagesOperations();
      default:
        return this.createGenericOperations();
    }
  }

  private createUsersOperations() {
    return {
      select: jest.fn((columns = '*') => ({
        eq: jest.fn((column: string, value: any) => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            if (column === 'wallet_address') {
              const user = Array.from(this.state.users.values()).find((u: any) => 
                u.wallet_address === value
              );
              return user 
                ? { data: user, error: null }
                : { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
            }
            
            const user = this.state.users.get(value);
            return user 
              ? { data: user, error: null }
              : { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
          })
        }))
      })),
      
      insert: jest.fn((data: any[]) => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const newUser = {
              id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...data[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.state.users.set(newUser.id, newUser);
            this.emitRealTimeEvent('users', 'INSERT', { new: newUser, old: null });
            
            return { data: newUser, error: null };
          })
        }))
      })),
      
      update: jest.fn((updateData: any) => ({
        eq: jest.fn((column: string, value: any) => ({
          select: jest.fn(() => ({
            single: jest.fn(async () => {
              await this.simulateLatency();
              
              if (this.shouldSimulateError()) {
                return this.generateError();
              }
              
              const user = this.state.users.get(value);
              if (!user) {
                return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
              }
              
              const updatedUser = { 
                ...user, 
                ...updateData, 
                updated_at: new Date().toISOString() 
              };
              this.state.users.set(user.id, updatedUser);
              this.emitRealTimeEvent('users', 'UPDATE', { new: updatedUser, old: user });
              
              return { data: updatedUser, error: null };
            })
          }))
        }))
      }))
    };
  }

  private createSessionsOperations() {
    return {
      select: jest.fn(() => ({
        eq: jest.fn((column: string, value: any) => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const session = Array.from(this.state.sessions.values()).find((s: any) => 
              s[column] === value
            );
            
            return session 
              ? { data: session, error: null }
              : { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
          }),
          
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(async () => {
                await this.simulateLatency();
                
                if (this.shouldSimulateError()) {
                  return this.generateError();
                }
                
                const sessions = Array.from(this.state.sessions.values())
                  .filter((s: any) => s[column] === value)
                  .sort((a: any, b: any) => 
                    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                  );
                
                return sessions.length > 0 
                  ? { data: sessions[0], error: null }
                  : { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
              })
            }))
          }))
        }))
      })),
      
      insert: jest.fn((data: any[]) => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const newSession = {
              id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...data[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.state.sessions.set(newSession.id, newSession);
            this.emitRealTimeEvent('chat_sessions', 'INSERT', { new: newSession, old: null });
            
            return { data: newSession, error: null };
          })
        }))
      }))
    };
  }

  private createMessagesOperations() {
    return {
      select: jest.fn((columns = '*') => ({
        eq: jest.fn((column: string, value: any) => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const message = Array.from(this.state.messages.values()).find((m: any) => 
              m[column] === value
            );
            
            return message 
              ? { data: message, error: null }
              : { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
          }),
          
          order: jest.fn(() => ({
            limit: jest.fn(async (limitValue: number) => {
              await this.simulateLatency();
              
              if (this.shouldSimulateError()) {
                return this.generateError();
              }
              
              const messages = Array.from(this.state.messages.values())
                .filter((m: any) => m[column] === value)
                .sort((a: any, b: any) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
                .slice(0, limitValue);
              
              return { data: messages, error: null };
            })
          }))
        })),
        
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(async () => {
              return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
            })
          }))
        })),
        
        limit: jest.fn(async (limitValue: number) => {
          await this.simulateLatency();
          
          if (this.shouldSimulateError()) {
            return this.generateError();
          }
          
          const messages = Array.from(this.state.messages.values()).slice(0, limitValue);
          return { data: messages, error: null };
        }),
        
        count: jest.fn(),
        head: true
      })),
      
      insert: jest.fn((data: any[]) => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const newMessage: DatabaseMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...data[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.state.messages.set(newMessage.id, newMessage);
            this.emitRealTimeEvent('messages', 'INSERT', { new: newMessage, old: null });
            
            return { data: newMessage, error: null };
          })
        }))
      })),
      
      update: jest.fn((updateData: any) => ({
        eq: jest.fn((column: string, value: any) => ({
          select: jest.fn(() => ({
            single: jest.fn(async () => {
              await this.simulateLatency();
              
              if (this.shouldSimulateError()) {
                return this.generateError();
              }
              
              const message = this.state.messages.get(value);
              if (!message) {
                return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
              }
              
              const updatedMessage = { 
                ...message, 
                ...updateData, 
                updated_at: new Date().toISOString() 
              };
              this.state.messages.set(message.id, updatedMessage);
              this.emitRealTimeEvent('messages', 'UPDATE', { new: updatedMessage, old: message });
              
              return { data: updatedMessage, error: null };
            })
          }))
        }))
      })),
      
      delete: jest.fn(() => ({
        eq: jest.fn((column: string, value: any) => ({
          select: jest.fn(async () => {
            await this.simulateLatency();
            
            if (this.shouldSimulateError()) {
              return this.generateError();
            }
            
            const messagesToDelete = Array.from(this.state.messages.values())
              .filter((m: any) => m[column] === value);
            
            messagesToDelete.forEach(message => {
              this.state.messages.delete(message.id);
              this.emitRealTimeEvent('messages', 'DELETE', { new: null, old: message });
            });
            
            return { data: messagesToDelete.map(m => ({ id: m.id })), error: null };
          })
        }))
      })),
      
      // Real-time subscription
      on: jest.fn((event: string, callback: Function) => {
        const subId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.state.subscriptions.set(subId, {
          table: 'messages',
          event,
          callback
        });
        
        this.eventEmitter.on(`messages:${event}`, callback);
        
        return {
          subscribe: jest.fn(async () => {
            await this.simulateLatency();
            return { data: null, error: null };
          }),
          unsubscribe: jest.fn(async () => {
            this.state.subscriptions.delete(subId);
            this.eventEmitter.off(`messages:${event}`, callback);
            return { error: null };
          })
        };
      })
    };
  }

  private createGenericOperations() {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            return this.shouldSimulateError() 
              ? this.generateError()
              : { data: { id: 'generic', data: 'mock' }, error: null };
          })
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            await this.simulateLatency();
            return this.shouldSimulateError() 
              ? this.generateError()
              : { data: { id: 'created', success: true }, error: null };
          })
        }))
      }))
    };
  }

  // Real-time functionality
  private emitRealTimeEvent(table: string, eventType: string, payload: any) {
    this.eventEmitter.emit(`${table}:${eventType}`, payload);
  }

  // Error simulation
  private shouldSimulateError(): boolean {
    return this.state.errorMode;
  }

  private generateError() {
    const errorTypes = {
      network: { data: null, error: new Error('Network timeout') },
      database: { data: null, error: { message: 'Database connection failed', code: 'PGRST001' } },
      validation: { data: null, error: { message: 'Invalid input', code: 'PGRST116' } },
      auth: { data: null, error: { message: 'Authentication required', code: 'PGRST401' } },
      permission: { data: null, error: { message: 'Insufficient permissions', code: 'PGRST403' } },
      rate_limit: { data: null, error: { message: 'Rate limit exceeded', code: 'PGRST429' } }
    };
    
    return errorTypes[this.state.errorType as keyof typeof errorTypes] || 
           { data: null, error: { message: 'Unknown error', code: 'PGRST500' } };
  }

  private async simulateLatency() {
    if (this.state.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.state.latency));
    }
  }

  // Test utility methods
  setCurrentUser(user: any) {
    this.state.currentUser = user;
  }

  setErrorMode(enabled: boolean, errorType = 'network') {
    this.state.errorMode = enabled;
    this.state.errorType = errorType;
  }

  setLatency(ms: number) {
    this.state.latency = ms;
  }

  addUser(user: any) {
    this.state.users.set(user.id, user);
  }

  addSession(session: any) {
    this.state.sessions.set(session.id, session);
  }

  addMessage(message: DatabaseMessage) {
    this.state.messages.set(message.id, message);
  }

  clearAll() {
    this.state.users.clear();
    this.state.sessions.clear();
    this.state.messages.clear();
    this.state.subscriptions.clear();
    this.state.currentUser = null;
    this.state.errorMode = false;
    this.eventEmitter.listeners.clear();
  }

  getState() {
    return { ...this.state };
  }

  triggerRealTimeEvent(table: string, event: string, payload: any) {
    this.emitRealTimeEvent(table, event, payload);
  }
}

// Factory function for creating mock Supabase client
export const createMockSupabaseClient = () => new MockSupabaseClient();

// Mock the createClient function from @supabase/supabase-js
export const mockCreateClient = jest.fn(() => createMockSupabaseClient());

// Default export for easy mocking
export default {
  createClient: mockCreateClient,
  MockSupabaseClient,
  createMockSupabaseClient
};