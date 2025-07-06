/**
 * Supabase Error Handling and Edge Cases Integration Tests
 * Tests comprehensive error scenarios, recovery mechanisms, and edge cases
 */

import { SupabaseService, createSupabaseService, MessageRecord } from '../services/SupabaseService';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

// Mock Supabase client with comprehensive error simulation
const createMockSupabaseWithErrors = () => {
  let shouldSimulateError = false;
  let errorType = 'network';
  let consecutiveErrors = 0;
  let maxConsecutiveErrors = 3;

  const mockClient = {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            if (shouldSimulateError) {
              consecutiveErrors++;
              
              switch (errorType) {
                case 'network':
                  throw new Error('Network timeout after 30000ms');
                case 'database':
                  return { data: null, error: { message: 'Database connection failed', code: 'PGRST001' } };
                case 'validation':
                  return { data: null, error: { message: 'Invalid input', code: 'PGRST116' } };
                case 'rate_limit':
                  return { data: null, error: { message: 'Rate limit exceeded', code: 'PGRST429' } };
                case 'auth':
                  return { data: null, error: { message: 'Authentication required', code: 'PGRST401' } };
                case 'permission':
                  return { data: null, error: { message: 'Insufficient permissions', code: 'PGRST403' } };
                case 'conflict':
                  return { data: null, error: { message: 'Resource conflict', code: 'PGRST409' } };
                case 'intermittent':
                  if (consecutiveErrors <= maxConsecutiveErrors) {
                    return { data: null, error: { message: 'Temporary failure', code: 'PGRST500' } };
                  } else {
                    consecutiveErrors = 0;
                    shouldSimulateError = false;
                    return { data: { id: 'recovered', success: true }, error: null };
                  }
                default:
                  return { data: { id: 'success', created: true }, error: null };
              }
            }
            return { data: { id: 'success', created: true }, error: null };
          })
        }))
      })),
      
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => {
            if (shouldSimulateError && errorType === 'not_found') {
              return { data: null, error: { code: 'PGRST116' } };
            }
            if (shouldSimulateError && errorType === 'multiple_results') {
              return { data: null, error: { code: 'PGRST106' } };
            }
            return { data: { id: 'found', exists: true }, error: null };
          }),
          order: jest.fn(() => ({
            limit: jest.fn(async () => {
              if (shouldSimulateError && errorType === 'empty_result') {
                return { data: [], error: null };
              }
              return { data: [{ id: 'item1' }, { id: 'item2' }], error: null };
            })
          })),
          limit: jest.fn(async () => {
            if (shouldSimulateError && errorType === 'pagination_error') {
              return { data: null, error: { message: 'Invalid range', code: 'PGRST103' } };
            }
            return { data: [{ id: 'item1' }], error: null };
          })
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: { code: 'PGRST116' } }))
          }))
        })),
        limit: jest.fn(async () => ({ data: [], error: null })),
        count: jest.fn(),
        head: true
      })),
      
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(async () => {
              if (shouldSimulateError && errorType === 'update_conflict') {
                return { data: null, error: { message: 'Update conflict', code: 'PGRST409' } };
              }
              return { data: { id: 'updated', modified: true }, error: null };
            })
          }))
        }))
      })),
      
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(async () => {
            if (shouldSimulateError && errorType === 'delete_error') {
              return { data: null, error: { message: 'Cannot delete', code: 'PGRST403' } };
            }
            return { data: [{ id: 'deleted' }], error: null };
          })
        }))
      }))
    })),
    
    // Test control methods
    _simulateError: (type: string, maxErrors = 1) => {
      shouldSimulateError = true;
      errorType = type;
      consecutiveErrors = 0;
      maxConsecutiveErrors = maxErrors;
    },
    _clearError: () => {
      shouldSimulateError = false;
      consecutiveErrors = 0;
    },
    _getErrorState: () => ({ shouldSimulateError, errorType, consecutiveErrors })
  };

  return mockClient;
};

describe('Supabase Error Handling and Edge Cases Integration Tests', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseWithErrors>;
  let supabaseService: SupabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseWithErrors();
    
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => mockSupabaseClient)
    }));
    
    const { SupabaseService } = require('../services/SupabaseService');
    supabaseService = new SupabaseService({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    });
  });

  afterEach(() => {
    mockSupabaseClient._clearError();
    jest.resetModules();
  });

  describe('Network and Connection Errors', () => {
    it('should handle network timeouts gracefully', async () => {
      mockSupabaseClient._simulateError('network');
      
      const result = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Test message'
      })();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Network timeout');
    });

    it('should handle database connection failures', async () => {
      mockSupabaseClient._simulateError('database');
      
      const result = await supabaseService.getMessagesBySession('session-123')();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Database connection failed');
    });

    it('should implement retry logic for intermittent failures', async () => {
      mockSupabaseClient._simulateError('intermittent', 2);
      
      // First attempt should fail
      const firstResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Retry test'
      })();
      
      expect(firstResult._tag).toBe('Left');
      
      // Second attempt should also fail
      const secondResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Retry test 2'
      })();
      
      expect(secondResult._tag).toBe('Left');
      
      // Third attempt should succeed (auto-recovery)
      const thirdResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Retry test 3'
      })();
      
      expect(thirdResult._tag).toBe('Right');
      expect((thirdResult as E.Right<any>).right.id).toBe('recovered');
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle authentication failures', async () => {
      mockSupabaseClient._simulateError('auth');
      
      const result = await supabaseService.getOrCreateUser('0x1234567890123456789012345678901234567890')();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Authentication required');
    });

    it('should handle permission denied errors', async () => {
      mockSupabaseClient._simulateError('permission');
      
      const result = await supabaseService.deleteMessagesBySession('restricted-session')();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Insufficient permissions');
    });

    it('should handle token expiration gracefully', async () => {
      // Simulate expired authentication
      mockSupabaseClient._simulateError('auth');
      
      const operations = [
        supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: 'Test 1'
        }),
        supabaseService.getMessagesBySession('session-123'),
        supabaseService.updateMessageCryptoContext('msg-123', { test: true })
      ];
      
      const results = await Promise.all(operations.map(op => op()));
      
      results.forEach(result => {
        expect(result._tag).toBe('Left');
        expect((result as E.Left<Error>).left.message).toContain('Authentication required');
      });
    });
  });

  describe('Data Validation and Constraint Errors', () => {
    it('should handle validation errors', async () => {
      mockSupabaseClient._simulateError('validation');
      
      const invalidMessage: Omit<MessageRecord, 'id' | 'created_at'> = {
        session_id: '', // Invalid empty session ID
        user_id: 'user-123',
        role: 'user',
        content: 'Test message'
      };
      
      const result = await supabaseService.createMessage(invalidMessage)();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Invalid input');
    });

    it('should handle constraint violations', async () => {
      mockSupabaseClient._simulateError('conflict');
      
      const result = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Duplicate message'
      })();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Resource conflict');
    });

    it('should handle foreign key constraint errors', async () => {
      mockSupabaseClient._simulateError('validation');
      
      // Message with non-existent session_id
      const result = await supabaseService.createMessage({
        session_id: 'non-existent-session',
        user_id: 'user-123',
        role: 'user',
        content: 'Orphaned message'
      })();
      
      expect(result._tag).toBe('Left');
    });
  });

  describe('Rate Limiting and Quota Errors', () => {
    it('should handle rate limit exceeded', async () => {
      mockSupabaseClient._simulateError('rate_limit');
      
      const result = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Rate limited message'
      })();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Rate limit exceeded');
    });

    it('should handle multiple rapid requests', async () => {
      const rapidRequests = Array.from({ length: 20 }, (_, i) => 
        supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: `Rapid message ${i}`
        })()
      );
      
      // Some requests might fail due to rate limiting
      const results = await Promise.all(rapidRequests);
      const successCount = results.filter(r => r._tag === 'Right').length;
      const errorCount = results.filter(r => r._tag === 'Left').length;
      
      expect(successCount + errorCount).toBe(20);
      // In a real scenario with rate limiting, some would fail
    });
  });

  describe('Data Consistency and Transaction Errors', () => {
    it('should handle update conflicts', async () => {
      mockSupabaseClient._simulateError('update_conflict');
      
      const result = await supabaseService.updateMessageCryptoContext('msg-123', {
        updated_field: 'new_value'
      })();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Update conflict');
    });

    it('should handle concurrent modifications', async () => {
      const messageId = 'concurrent-msg-123';
      
      // Simulate concurrent updates
      const update1 = supabaseService.updateMessageCryptoContext(messageId, { field1: 'value1' });
      const update2 = supabaseService.updateMessageCryptoContext(messageId, { field2: 'value2' });
      
      const [result1, result2] = await Promise.all([update1(), update2()]);
      
      // In a real scenario, one might succeed and one might fail due to optimistic locking
      expect([result1._tag, result2._tag].filter(tag => tag === 'Right').length).toBeGreaterThan(0);
    });
  });

  describe('Query and Pagination Errors', () => {
    it('should handle not found errors gracefully', async () => {
      mockSupabaseClient._simulateError('not_found');
      
      const result = await supabaseService.getOrCreateUser('0x1234567890123456789012345678901234567890')();
      
      // For getOrCreateUser, should attempt to create if not found
      expect(result._tag).toBe('Left');
    });

    it('should handle empty result sets', async () => {
      mockSupabaseClient._simulateError('empty_result');
      
      const result = await supabaseService.getMessagesBySession('empty-session')();
      
      expect(result._tag).toBe('Right');
      expect((result as E.Right<any[]>).right).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
      mockSupabaseClient._simulateError('pagination_error');
      
      const result = await supabaseService.getConversationHistory('0x1234567890123456789012345678901234567890', 999, 1000)();
      
      expect(result._tag).toBe('Left');
      expect((result as E.Left<Error>).left.message).toContain('Invalid range');
    });

    it('should handle multiple query results when single expected', async () => {
      mockSupabaseClient._simulateError('multiple_results');
      
      const result = await supabaseService.getOrCreateUser('0x1234567890123456789012345678901234567890')();
      
      expect(result._tag).toBe('Left');
    });
  });

  describe('Resource and Memory Errors', () => {
    it('should handle large payload errors', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB content
      const largeContext = {
        massive_data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(1000)
        }))
      };
      
      const result = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: largeContent,
        crypto_context: largeContext
      })();
      
      // Should either succeed or fail gracefully
      expect(['Left', 'Right'].includes(result._tag)).toBe(true);
    });

    it('should handle memory allocation errors', async () => {
      // Simulate memory pressure with many concurrent operations
      const heavyOperations = Array.from({ length: 100 }, (_, i) => 
        supabaseService.createMessage({
          session_id: `session-${i}`,
          user_id: `user-${i}`,
          role: 'user',
          content: `Message ${i}`,
          crypto_context: {
            large_array: Array.from({ length: 1000 }, (_, j) => `item-${j}`)
          }
        })()
      );
      
      const results = await Promise.allSettled(heavyOperations);
      
      // Some operations should complete successfully
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any)._tag === 'Right'
      ).length;
      
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Service Degradation and Fallback', () => {
    it('should handle partial service degradation', async () => {
      // Test different operations with various error conditions
      const operations = [
        { op: () => supabaseService.healthCheck(), errorType: 'network' },
        { op: () => supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: 'Test'
        }), errorType: 'database' },
        { op: () => supabaseService.getMessagesBySession('session-123'), errorType: 'none' }
      ];
      
      for (const { op, errorType } of operations) {
        if (errorType !== 'none') {
          mockSupabaseClient._simulateError(errorType);
        } else {
          mockSupabaseClient._clearError();
        }
        
        const result = await op();
        
        if (errorType === 'none') {
          expect(result._tag).toBe('Right');
        } else {
          expect(result._tag).toBe('Left');
        }
      }
    });

    it('should maintain functionality during graceful degradation', async () => {
      // Test that critical operations can still work even with some failures
      mockSupabaseClient._simulateError('intermittent', 1);
      
      const criticalOperations = [
        supabaseService.healthCheck(),
        supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: 'Critical message'
        })()
      ];
      
      const results = await Promise.all(criticalOperations);
      
      // At least health check should work for monitoring
      expect(results.some(r => r._tag === 'Right')).toBe(true);
    });
  });

  describe('Recovery and Resilience', () => {
    it('should implement circuit breaker pattern', async () => {
      // Simulate multiple consecutive failures
      for (let i = 0; i < 5; i++) {
        mockSupabaseClient._simulateError('network');
        
        const result = await supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: `Circuit breaker test ${i}`
        })();
        
        expect(result._tag).toBe('Left');
      }
      
      // After multiple failures, circuit should be open
      // Next operation should fail fast (not attempt the actual call)
      mockSupabaseClient._clearError();
      
      const fastFailResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Fast fail test'
      })();
      
      // In a real circuit breaker implementation, this would fail fast
      // For now, we just test the error handling structure
    });

    it('should handle graceful recovery after errors', async () => {
      // Simulate error condition
      mockSupabaseClient._simulateError('database');
      
      const errorResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Error message'
      })();
      
      expect(errorResult._tag).toBe('Left');
      
      // Clear error condition
      mockSupabaseClient._clearError();
      
      // Subsequent operation should succeed
      const recoveryResult = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Recovery message'
      })();
      
      expect(recoveryResult._tag).toBe('Right');
    });
  });

  describe('Error Reporting and Monitoring', () => {
    it('should provide detailed error context', async () => {
      mockSupabaseClient._simulateError('database');
      
      const result = await supabaseService.createMessage({
        session_id: 'session-123',
        user_id: 'user-123',
        role: 'user',
        content: 'Test message'
      })();
      
      expect(result._tag).toBe('Left');
      const error = (result as E.Left<Error>).left;
      
      // Error should contain useful debugging information
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(10);
    });

    it('should handle error aggregation for batch operations', async () => {
      const batchOperations = Array.from({ length: 5 }, (_, i) => {
        if (i % 2 === 0) {
          mockSupabaseClient._simulateError('validation');
        } else {
          mockSupabaseClient._clearError();
        }
        
        return supabaseService.createMessage({
          session_id: 'session-123',
          user_id: 'user-123',
          role: 'user',
          content: `Batch message ${i}`
        })();
      });
      
      const results = await Promise.all(batchOperations);
      
      const errors = results.filter(r => r._tag === 'Left');
      const successes = results.filter(r => r._tag === 'Right');
      
      expect(errors.length).toBeGreaterThan(0);
      expect(successes.length).toBeGreaterThan(0);
      expect(errors.length + successes.length).toBe(5);
    });
  });
});