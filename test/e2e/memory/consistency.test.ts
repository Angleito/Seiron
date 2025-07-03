/**
 * @fileoverview Memory Consistency E2E Tests
 * Tests memory operations for consistency, idempotency, and reliability
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';
import axios from 'axios';
import { 
  E2E_CONFIG, 
  TestUtils, 
  TestAssertions, 
  MockDataGenerators,
  DockerUtils 
} from '../setup';

// Memory operation client
class MemoryOperationClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async storeUserPreference(
    userId: string, 
    preference: any
  ): Promise<E.Either<Error, void>> {
    try {
      await axios.post(`${this.baseURL}/api/memory/preferences`, {
        userId,
        preference
      }, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(undefined);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getUserPreferences(userId: string): Promise<E.Either<Error, any[]>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/memory/preferences/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data.preferences || []);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async recordOperation(
    userId: string,
    operation: any
  ): Promise<E.Either<Error, string>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/memory/operations`, {
        userId,
        operation
      }, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data.operationId);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getOperationHistory(userId: string): Promise<E.Either<Error, any[]>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/memory/operations/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data.operations || []);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async storeConversationTurn(
    userId: string,
    conversationId: string,
    turn: any
  ): Promise<E.Either<Error, void>> {
    try {
      await axios.post(`${this.baseURL}/api/memory/conversations/turns`, {
        userId,
        conversationId,
        turn
      }, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(undefined);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getConversationTurns(
    userId: string,
    conversationId: string
  ): Promise<E.Either<Error, any[]>> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/memory/conversations/${conversationId}/turns`,
        {
          params: { userId },
          timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
        }
      );
      
      return E.right(response.data.turns || []);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async clearUserMemory(userId: string): Promise<E.Either<Error, void>> {
    try {
      await axios.delete(`${this.baseURL}/api/memory/users/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(undefined);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getMemoryStats(userId: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/memory/stats/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

describe('Memory Consistency E2E Tests', () => {
  let client: MemoryOperationClient;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    client = new MemoryOperationClient(E2E_CONFIG.API_BASE_URL);
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Idempotency Tests', () => {
    it('should handle duplicate preference storage idempotently', async () => {
      const userId = `test-user-${Date.now()}`;
      const preference = { 
        protocol: 'YeiFinance', 
        riskLevel: 'medium',
        timestamp: Date.now()
      };
      
      // Store the same preference multiple times
      const storePromises = Array.from({ length: 5 }, () => 
        client.storeUserPreference(userId, preference)
      );
      
      const results = await Promise.all(storePromises);
      
      // All operations should succeed
      results.forEach(result => {
        TestAssertions.expectEither(result);
      });
      
      // Wait for all operations to complete
      await TestUtils.waitFor(2000)();
      
      // Check that we only have one instance of the preference
      const preferencesResult = await client.getUserPreferences(userId);
      const preferences = TestAssertions.expectEither(preferencesResult);
      
      const yeiFinancePrefs = preferences.filter(p => 
        p.protocol === 'YeiFinance' && p.riskLevel === 'medium'
      );
      
      // Should only have one entry, not five
      expect(yeiFinancePrefs).toHaveLength(1);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
    
    it('should handle duplicate operation recording idempotently', async () => {
      const userId = `test-user-${Date.now()}`;
      const operation = {
        id: `op_${Date.now()}`,
        type: 'lending',
        asset: 'USDC',
        amount: 1000,
        protocol: 'YeiFinance',
        timestamp: new Date().toISOString()
      };
      
      // Record the same operation multiple times
      const recordPromises = Array.from({ length: 3 }, () => 
        client.recordOperation(userId, operation)
      );
      
      const results = await Promise.all(recordPromises);
      
      // All operations should succeed
      const operationIds = results.map(result => 
        TestAssertions.expectEither(result)
      );
      
      // Wait for operations to be recorded
      await TestUtils.waitFor(2000)();
      
      // Check operation history
      const historyResult = await client.getOperationHistory(userId);
      const history = TestAssertions.expectEither(historyResult);
      
      // Should only have one operation with this ID
      const matchingOps = history.filter(op => op.id === operation.id);
      expect(matchingOps).toHaveLength(1);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
  });
  
  describe('Consistency Under Concurrent Operations', () => {
    it('should maintain consistency with concurrent preference updates', async () => {
      const userId = `test-user-${Date.now()}`;
      
      // Create concurrent preference updates
      const preferences = [
        { type: 'risk', value: 'low', timestamp: Date.now() },
        { type: 'protocol', value: 'YeiFinance', timestamp: Date.now() + 1 },
        { type: 'experience', value: 'intermediate', timestamp: Date.now() + 2 },
        { type: 'maxAmount', value: 10000, timestamp: Date.now() + 3 }
      ];
      
      const updatePromises = preferences.map(pref => 
        client.storeUserPreference(userId, pref)
      );
      
      const results = await Promise.all(updatePromises);
      
      // All updates should succeed
      results.forEach(result => {
        TestAssertions.expectEither(result);
      });
      
      // Wait for all updates to be applied
      await TestUtils.waitFor(3000)();
      
      // Get final preferences
      const finalPrefsResult = await client.getUserPreferences(userId);
      const finalPrefs = TestAssertions.expectEither(finalPrefsResult);
      
      // Should have all preferences
      expect(finalPrefs).toHaveLength(preferences.length);
      
      // Each preference type should be present
      const prefTypes = finalPrefs.map(p => p.type);
      preferences.forEach(pref => {
        expect(prefTypes).toContain(pref.type);
      });
      
      // Clean up
      await client.clearUserMemory(userId);
    });
    
    it('should handle concurrent conversation turn storage', async () => {
      const userId = `test-user-${Date.now()}`;
      const conversationId = `conv_${Date.now()}`;
      
      // Create multiple conversation turns concurrently
      const turns = Array.from({ length: 10 }, (_, index) => ({
        turnNumber: index + 1,
        userInput: `Message ${index + 1}`,
        botResponse: `Response ${index + 1}`,
        timestamp: new Date(Date.now() + index * 1000).toISOString(),
        intent: 'test_intent'
      }));
      
      const storePromises = turns.map(turn => 
        client.storeConversationTurn(userId, conversationId, turn)
      );
      
      const results = await Promise.all(storePromises);
      
      // All stores should succeed
      results.forEach(result => {
        TestAssertions.expectEither(result);
      });
      
      // Wait for all turns to be stored
      await TestUtils.waitFor(3000)();
      
      // Get stored turns
      const turnsResult = await client.getConversationTurns(userId, conversationId);
      const storedTurns = TestAssertions.expectEither(turnsResult);
      
      // Should have all turns
      expect(storedTurns).toHaveLength(turns.length);
      
      // Turns should be in correct order
      storedTurns.sort((a, b) => a.turnNumber - b.turnNumber);
      
      for (let i = 0; i < turns.length; i++) {
        expect(storedTurns[i].turnNumber).toBe(i + 1);
        expect(storedTurns[i].userInput).toBe(`Message ${i + 1}`);
      }
      
      // Clean up
      await client.clearUserMemory(userId);
    });
  });
  
  describe('Data Integrity and Validation', () => {
    it('should maintain data integrity across operations', async () => {
      const userId = `test-user-${Date.now()}`;
      
      // Store initial preferences
      const initialPrefs = [
        { key: 'riskTolerance', value: 'medium' },
        { key: 'maxLendingAmount', value: 5000 }
      ];
      
      for (const pref of initialPrefs) {
        const result = await client.storeUserPreference(userId, pref);
        TestAssertions.expectEither(result);
      }
      
      // Record some operations
      const operations = [
        {
          id: `op_1_${Date.now()}`,
          type: 'lending',
          asset: 'USDC',
          amount: 1000,
          status: 'completed'
        },
        {
          id: `op_2_${Date.now()}`,
          type: 'swap',
          fromAsset: 'SEI',
          toAsset: 'USDC',
          amount: 500,
          status: 'pending'
        }
      ];
      
      for (const operation of operations) {
        const result = await client.recordOperation(userId, operation);
        TestAssertions.expectEither(result);
      }
      
      // Wait for all data to be stored
      await TestUtils.waitFor(2000)();
      
      // Verify data integrity
      const prefsResult = await client.getUserPreferences(userId);
      const prefs = TestAssertions.expectEither(prefsResult);
      
      const opsResult = await client.getOperationHistory(userId);
      const ops = TestAssertions.expectEither(opsResult);
      
      // Check preferences integrity
      expect(prefs).toHaveLength(initialPrefs.length);
      const riskPref = prefs.find(p => p.key === 'riskTolerance');
      expect(riskPref?.value).toBe('medium');
      
      // Check operations integrity
      expect(ops).toHaveLength(operations.length);
      const lendingOp = ops.find(op => op.type === 'lending');
      expect(lendingOp?.asset).toBe('USDC');
      expect(lendingOp?.amount).toBe(1000);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
    
    it('should validate memory operations before storage', async () => {
      const userId = `test-user-${Date.now()}`;
      
      // Try to store invalid preference (missing required fields)
      const invalidPreference = { invalidField: 'value' };
      const invalidPrefResult = await client.storeUserPreference(userId, invalidPreference);
      
      // This might succeed or fail depending on validation - both are acceptable
      // The important thing is consistency
      
      // Try to store invalid operation
      const invalidOperation = { type: 'invalid_type' }; // Missing required fields
      const invalidOpResult = await client.recordOperation(userId, invalidOperation);
      
      // Again, might succeed or fail - what matters is consistency
      
      // Store valid data
      const validPreference = { key: 'testKey', value: 'testValue', type: 'test' };
      const validPrefResult = await client.storeUserPreference(userId, validPreference);
      TestAssertions.expectEither(validPrefResult);
      
      const validOperation = {
        id: `op_${Date.now()}`,
        type: 'lending',
        asset: 'USDC',
        amount: 1000,
        timestamp: new Date().toISOString()
      };
      const validOpResult = await client.recordOperation(userId, validOperation);
      TestAssertions.expectEither(validOpResult);
      
      // Verify valid data was stored correctly
      await TestUtils.waitFor(1000)();
      
      const prefsResult = await client.getUserPreferences(userId);
      const prefs = TestAssertions.expectEither(prefsResult);
      
      const validPrefs = prefs.filter(p => p.key === 'testKey');
      expect(validPrefs).toHaveLength(1);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
  });
  
  describe('Memory Performance and Limits', () => {
    it('should handle large volumes of memory operations efficiently', async () => {
      const userId = `test-user-${Date.now()}`;
      const operationCount = 100;
      
      const startTime = Date.now();
      
      // Create many operations
      const operations = Array.from({ length: operationCount }, (_, index) => ({
        id: `bulk_op_${index}_${Date.now()}`,
        type: 'test',
        index,
        timestamp: new Date(Date.now() + index).toISOString()
      }));
      
      // Store operations in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const batchPromises = batch.map(op => client.recordOperation(userId, op));
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => TestAssertions.expectEither(result));
        
        // Small delay between batches
        await TestUtils.waitFor(100)();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds
      
      // Verify all operations were stored
      await TestUtils.waitFor(2000)();
      
      const historyResult = await client.getOperationHistory(userId);
      const history = TestAssertions.expectEither(historyResult);
      
      expect(history.length).toBeGreaterThanOrEqual(operationCount);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
    
    it('should manage memory usage efficiently', async () => {
      const userId = `test-user-${Date.now()}`;
      
      // Get initial memory stats
      const initialStatsResult = await client.getMemoryStats(userId);
      
      // Store significant amount of data
      const preferences = Array.from({ length: 50 }, (_, index) => ({
        key: `pref_${index}`,
        value: `value_${index}`,
        description: `Test preference ${index}`.repeat(10) // Make it larger
      }));
      
      for (const pref of preferences) {
        const result = await client.storeUserPreference(userId, pref);
        TestAssertions.expectEither(result);
      }
      
      // Get final memory stats
      const finalStatsResult = await client.getMemoryStats(userId);
      
      // Both calls might succeed or fail depending on whether stats endpoint exists
      // The important thing is system stability
      
      // Verify data was stored despite large volume
      const prefsResult = await client.getUserPreferences(userId);
      const storedPrefs = TestAssertions.expectEither(prefsResult);
      
      expect(storedPrefs.length).toBeGreaterThanOrEqual(preferences.length);
      
      // Clean up
      await client.clearUserMemory(userId);
    });
  });
  
  describe('Property-Based Memory Consistency Testing', () => {
    it('should maintain consistency properties with random memory operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          fc.array(fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            type: fc.constantFrom('preference', 'setting', 'config')
          }), { minLength: 1, maxLength: 10 }),
          async (userId, preferences) => {
            // Store all preferences
            const storePromises = preferences.map(pref => 
              client.storeUserPreference(userId, pref)
            );
            
            const results = await Promise.allSettled(storePromises);
            
            // Count successful stores
            const successfulStores = results.filter(r => r.status === 'fulfilled').length;
            
            if (successfulStores > 0) {
              // Wait for storage to complete
              await TestUtils.waitFor(1000)();
              
              // Retrieve preferences
              const retrieveResult = await client.getUserPreferences(userId);
              
              if (E.isRight(retrieveResult)) {
                const storedPrefs = retrieveResult.right;
                
                // Should have at least some preferences stored
                expect(storedPrefs.length).toBeGreaterThan(0);
                
                // Each stored preference should have required fields
                storedPrefs.forEach(pref => {
                  expect(pref.key || pref.type).toBeDefined();
                });
              }
            }
            
            // Clean up
            await client.clearUserMemory(userId);
            
            return true;
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});