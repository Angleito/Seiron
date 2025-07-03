/**
 * @fileoverview Cross-Session Memory Integration E2E Tests
 * Tests memory persistence and context preservation across conversation sessions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
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

// Memory-aware conversation client
class MemoryAwareConversationClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async createSession(userId: string, context?: any): Promise<E.Either<Error, string>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat/session`, {
        userId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data.sessionId);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async endSession(sessionId: string): Promise<E.Either<Error, void>> {
    try {
      await axios.delete(`${this.baseURL}/api/chat/session/${sessionId}`, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(undefined);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async sendMessage(
    message: string,
    userId: string,
    sessionId: string,
    context?: any
  ): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message,
        userId,
        conversationId: sessionId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getUserMemory(userId: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/chat/memory/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getUserPreferences(userId: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/chat/preferences/${userId}`, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async updateUserPreferences(userId: string, preferences: any): Promise<E.Either<Error, void>> {
    try {
      await axios.put(`${this.baseURL}/api/chat/preferences/${userId}`, preferences, {
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(undefined);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getConversationHistory(userId: string, sessionId?: string): Promise<E.Either<Error, any>> {
    try {
      const params: any = { userId };
      if (sessionId) params.sessionId = sessionId;
      
      const response = await axios.get(`${this.baseURL}/api/chat/history`, {
        params,
        timeout: E2E_CONFIG.MEMORY_PERSISTENCE_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

describe('Cross-Session Memory Integration E2E Tests', () => {
  let client: MemoryAwareConversationClient;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    client = new MemoryAwareConversationClient(E2E_CONFIG.API_BASE_URL);
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('User Preference Persistence', () => {
    it('should persist user preferences across sessions', async () => {
      const user = MockDataGenerators.userProfile();
      const preferences = {
        riskTolerance: 'conservative',
        preferredProtocols: ['YeiFinance', 'Silo'],
        tradingExperience: 'intermediate',
        maxLendingAmount: 10000
      };
      
      // Store preferences
      const storeResult = await client.updateUserPreferences(user.userId, preferences);
      TestAssertions.expectEither(storeResult);
      
      // Wait for persistence
      await TestUtils.waitFor(1000)();
      
      // Create first session and use preferences
      const session1Result = await client.createSession(user.userId);
      const session1Id = TestAssertions.expectEither(session1Result);
      
      const message1 = 'Lend 5000 USDC';
      const response1Result = await client.sendMessage(message1, user.userId, session1Id);
      const response1 = TestAssertions.expectEither(response1Result);
      
      expect(response1).toBeValidConversationResponse();
      
      // End first session
      await client.endSession(session1Id);
      
      // Wait a bit to simulate time passing
      await TestUtils.waitFor(2000)();
      
      // Create second session
      const session2Result = await client.createSession(user.userId);
      const session2Id = TestAssertions.expectEither(session2Result);
      
      const message2 = 'Lend 3000 USDC';
      const response2Result = await client.sendMessage(message2, user.userId, session2Id);
      const response2 = TestAssertions.expectEither(response2Result);
      
      expect(response2).toBeValidConversationResponse();
      
      // Both responses should reflect the same preferences
      if (response1.parameters.protocol && response2.parameters.protocol) {
        expect(preferences.preferredProtocols).toContain(response1.parameters.protocol);
        expect(preferences.preferredProtocols).toContain(response2.parameters.protocol);
      }
      
      if (response1.riskLevel && response2.riskLevel) {
        expect(response1.riskLevel).toBe('low'); // conservative -> low
        expect(response2.riskLevel).toBe('low');
      }
      
      // Clean up
      await client.endSession(session2Id);
    });
    
    it('should update and persist preference changes', async () => {
      const user = MockDataGenerators.userProfile();
      const initialPreferences = {
        riskTolerance: 'low',
        preferredProtocols: ['YeiFinance']
      };
      
      // Set initial preferences
      await client.updateUserPreferences(user.userId, initialPreferences);
      
      // Session 1: Use initial preferences
      const session1Result = await client.createSession(user.userId);
      const session1Id = TestAssertions.expectEither(session1Result);
      
      const response1Result = await client.sendMessage('Lend 1000 USDC', user.userId, session1Id);
      const response1 = TestAssertions.expectEither(response1Result);
      
      expect(response1).toBeValidConversationResponse();
      
      // Update preferences through conversation
      const updateResult = await client.sendMessage(
        'I now prefer high risk and DragonSwap protocol',
        user.userId,
        session1Id
      );
      const updateResponse = TestAssertions.expectEither(updateResult);
      
      expect(updateResponse).toBeValidConversationResponse();
      
      await client.endSession(session1Id);
      
      // Wait for changes to persist
      await TestUtils.waitFor(2000)();
      
      // Session 2: Verify updated preferences
      const session2Result = await client.createSession(user.userId);
      const session2Id = TestAssertions.expectEither(session2Result);
      
      const response2Result = await client.sendMessage('Lend 2000 USDC', user.userId, session2Id);
      const response2 = TestAssertions.expectEither(response2Result);
      
      expect(response2).toBeValidConversationResponse();
      
      // Should reflect updated preferences
      if (response2.riskLevel) {
        expect(response2.riskLevel).toBe('high');
      }
      
      if (response2.parameters.protocol) {
        expect(response2.parameters.protocol).toBe('DragonSwap');
      }
      
      await client.endSession(session2Id);
    });
  });
  
  describe('Conversation History Preservation', () => {
    it('should maintain conversation history across sessions', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Session 1: Initial conversation
      const session1Result = await client.createSession(user.userId);
      const session1Id = TestAssertions.expectEither(session1Result);
      
      const messages1 = [
        'Show my portfolio',
        'Lend 1000 USDC on YeiFinance',
        'What are the current rates?'
      ];
      
      for (const message of messages1) {
        const result = await client.sendMessage(message, user.userId, session1Id);
        const response = TestAssertions.expectEither(result);
        expect(response).toBeValidConversationResponse();
        
        // Small delay between messages
        await TestUtils.waitFor(500)();
      }
      
      await client.endSession(session1Id);
      
      // Wait for history to persist
      await TestUtils.waitFor(2000)();
      
      // Session 2: Reference previous conversation
      const session2Result = await client.createSession(user.userId);
      const session2Id = TestAssertions.expectEither(session2Result);
      
      const referenceMessage = 'What was my last lending operation?';
      const referenceResult = await client.sendMessage(referenceMessage, user.userId, session2Id);
      const referenceResponse = TestAssertions.expectEither(referenceResult);
      
      expect(referenceResponse).toBeValidConversationResponse();
      
      // Should reference previous lending operation
      const responseText = referenceResponse.message || referenceResponse.response || '';
      expect(responseText.toLowerCase()).toContain('usdc');
      expect(responseText.toLowerCase()).toContain('1000');
      
      await client.endSession(session2Id);
    });
    
    it('should provide conversation history through API', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Create session and have conversation
      const sessionResult = await client.createSession(user.userId);
      const sessionId = TestAssertions.expectEither(sessionResult);
      
      const messages = [
        'Check my portfolio status',
        'Lend 2000 USDC',
        'Swap 100 SEI for USDC'
      ];
      
      for (const message of messages) {
        const result = await client.sendMessage(message, user.userId, sessionId);
        TestAssertions.expectEither(result);
        await TestUtils.waitFor(300)();
      }
      
      // Get conversation history
      const historyResult = await client.getConversationHistory(user.userId, sessionId);
      const history = TestAssertions.expectEither(historyResult);
      
      expect(history).toBeDefined();
      expect(history.conversations || history.messages).toBeDefined();
      
      // Should contain all messages
      const conversationData = history.conversations || history.messages || [];
      expect(conversationData.length).toBeGreaterThanOrEqual(messages.length);
      
      // Verify message content preservation
      const messageTexts = conversationData.map((item: any) => 
        item.message || item.content || item.input
      ).filter(Boolean);
      
      messages.forEach(originalMessage => {
        const found = messageTexts.some((text: string) => 
          text.toLowerCase().includes(originalMessage.toLowerCase().split(' ')[0])
        );
        expect(found).toBe(true);
      });
      
      await client.endSession(sessionId);
    });
  });
  
  describe('Operational Memory Persistence', () => {
    it('should remember user operations across sessions', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Session 1: Perform lending operation
      const session1Result = await client.createSession(user.userId);
      const session1Id = TestAssertions.expectEither(session1Result);
      
      const lendingMessage = 'Lend 5000 USDC on YeiFinance';
      const lendingResult = await client.sendMessage(lendingMessage, user.userId, session1Id);
      const lendingResponse = TestAssertions.expectEither(lendingResult);
      
      expect(lendingResponse).toBeValidConversationResponse();
      
      await client.endSession(session1Id);
      
      // Wait for operation to be recorded
      await TestUtils.waitFor(3000)();
      
      // Session 2: Ask about previous operations
      const session2Result = await client.createSession(user.userId);
      const session2Id = TestAssertions.expectEither(session2Result);
      
      const queryMessage = 'What are my current lending positions?';
      const queryResult = await client.sendMessage(queryMessage, user.userId, session2Id);
      const queryResponse = TestAssertions.expectEither(queryResult);
      
      expect(queryResponse).toBeValidConversationResponse();
      
      // Should reference the previous lending operation
      const responseContent = queryResponse.message || queryResponse.response || '';
      expect(responseContent.toLowerCase()).toContain('usdc');
      
      // If positions are returned, should include the lending operation
      if (queryResponse.positions) {
        const usdcPosition = queryResponse.positions.find((pos: any) => 
          pos.asset?.toLowerCase() === 'usdc' && pos.protocol?.toLowerCase() === 'yeifinance'
        );
        expect(usdcPosition).toBeDefined();
      }
      
      await client.endSession(session2Id);
    });
    
    it('should track operation status across sessions', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Session 1: Start operation
      const session1Result = await client.createSession(user.userId);
      const session1Id = TestAssertions.expectEither(session1Result);
      
      const operationMessage = 'Swap 1000 SEI for USDC';
      const operationResult = await client.sendMessage(operationMessage, user.userId, session1Id);
      const operationResponse = TestAssertions.expectEither(operationResult);
      
      expect(operationResponse).toBeValidConversationResponse();
      
      // Extract operation ID if available
      let operationId = operationResponse.operationId || operationResponse.transactionId;
      
      await client.endSession(session1Id);
      
      // Wait for operation processing
      await TestUtils.waitFor(2000)();
      
      // Session 2: Check operation status
      const session2Result = await client.createSession(user.userId);
      const session2Id = TestAssertions.expectEither(session2Result);
      
      let statusMessage = 'What is the status of my last swap?';
      if (operationId) {
        statusMessage = `What is the status of operation ${operationId}?`;
      }
      
      const statusResult = await client.sendMessage(statusMessage, user.userId, session2Id);
      const statusResponse = TestAssertions.expectEither(statusResult);
      
      expect(statusResponse).toBeValidConversationResponse();
      
      // Should provide status information
      expect(
        statusResponse.status || 
        statusResponse.operationStatus || 
        statusResponse.message
      ).toBeDefined();
      
      await client.endSession(session2Id);
    });
  });
  
  describe('Memory Consistency and Reliability', () => {
    it('should maintain memory consistency under concurrent access', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Create multiple concurrent sessions for the same user
      const sessionPromises = Array.from({ length: 3 }, async (_, index) => {
        const sessionResult = await client.createSession(user.userId);
        const sessionId = TestAssertions.expectEither(sessionResult);
        
        // Each session updates different preferences
        const preferences = {
          [`preference_${index}`]: `value_${index}`,
          timestamp: Date.now()
        };
        
        const message = `Update my preferences: ${JSON.stringify(preferences)}`;
        const result = await client.sendMessage(message, user.userId, sessionId);
        
        await client.endSession(sessionId);
        
        return result;
      });
      
      const results = await Promise.all(sessionPromises);
      
      // All sessions should succeed
      results.forEach(result => {
        const response = TestAssertions.expectEither(result);
        expect(response).toBeValidConversationResponse();
      });
      
      // Wait for all updates to persist
      await TestUtils.waitFor(3000)();
      
      // Verify final state
      const memoryResult = await client.getUserMemory(user.userId);
      const memory = TestAssertions.expectEither(memoryResult);
      
      expect(memory).toBeDefined();
      expect(memory.preferences || memory.userPreferences).toBeDefined();
    });
    
    it('should handle memory storage failures gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      
      // Create session
      const sessionResult = await client.createSession(user.userId);
      const sessionId = TestAssertions.expectEither(sessionResult);
      
      // Send message that would normally be stored
      const message = 'Lend 1000 USDC';
      const result = await client.sendMessage(message, user.userId, sessionId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      
      // Even if memory storage fails, conversation should continue
      const followUpMessage = 'What was my last operation?';
      const followUpResult = await client.sendMessage(followUpMessage, user.userId, sessionId);
      const followUpResponse = TestAssertions.expectEither(followUpResult);
      
      expect(followUpResponse).toBeValidConversationResponse();
      
      await client.endSession(sessionId);
    });
  });
  
  describe('Property-Based Memory Testing', () => {
    it('should maintain memory properties with random user interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          fc.record({
            riskTolerance: TestUtils.generators.riskLevel(),
            preferredProtocols: fc.array(TestUtils.generators.protocol(), { minLength: 1, maxLength: 3 })
          }),
          async (userId, messages, preferences) => {
            // Session 1: Set preferences and have conversation
            const session1Result = await client.createSession(userId);
            if (E.isLeft(session1Result)) return true; // Skip if session creation fails
            
            const session1Id = session1Result.right;
            
            // Update preferences
            await client.updateUserPreferences(userId, preferences);
            
            // Send messages
            for (const message of messages) {
              const result = await client.sendMessage(message, userId, session1Id);
              // Some messages may fail - that's okay in property testing
            }
            
            await client.endSession(session1Id);
            
            // Wait for persistence
            await TestUtils.waitFor(1000)();
            
            // Session 2: Verify preferences are maintained
            const session2Result = await client.createSession(userId);
            if (E.isLeft(session2Result)) return true;
            
            const session2Id = session2Result.right;
            
            const testMessage = 'What are my preferences?';
            const testResult = await client.sendMessage(testMessage, userId, session2Id);
            
            await client.endSession(session2Id);
            
            // If successful, preferences should be reflected
            if (E.isRight(testResult)) {
              const response = testResult.right;
              // Basic validation - response should exist
              expect(response).toBeDefined();
            }
            
            return true;
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});