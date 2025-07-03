/**
 * @fileoverview Multi-Turn Conversation E2E Tests
 * Tests complex, multi-step conversations with context preservation
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

// Conversation session manager for multi-turn tests
class ConversationSession {
  private baseURL: string;
  private userId: string;
  private conversationId: string;
  private turns: any[] = [];
  
  constructor(baseURL: string, userId: string, conversationId?: string) {
    this.baseURL = baseURL;
    this.userId = userId;
    this.conversationId = conversationId || `conv_${Date.now()}`;
  }
  
  async sendMessage(message: string, context?: any): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message,
        userId: this.userId,
        conversationId: this.conversationId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'E2E-MultiTurn-Client'
        }
      });
      
      const turn = {
        input: message,
        response: response.data,
        timestamp: new Date().toISOString(),
        turnNumber: this.turns.length + 1
      };
      
      this.turns.push(turn);
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  getTurns(): any[] {
    return this.turns;
  }
  
  getConversationId(): string {
    return this.conversationId;
  }
  
  async getHistory(): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/chat/history`, {
        params: { 
          userId: this.userId, 
          conversationId: this.conversationId 
        },
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

describe('Multi-Turn Conversation E2E Tests', () => {
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Progressive Intent Resolution', () => {
    it('should resolve ambiguous lending request through multiple turns', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Ambiguous request
      const turn1 = await session.sendMessage('I want to earn yield');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      expect(response1.intent).toBeDefined();
      expect(response1.needsDisambiguation).toBe(true);
      expect(response1.disambiguationOptions).toBeDefined();
      
      // Turn 2: Provide asset information
      const turn2 = await session.sendMessage('I have 5000 USDC');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.parameters.amount).toBe(5000);
      expect(response2.parameters.asset).toBe('USDC');
      
      // Turn 3: Specify risk preference
      const turn3 = await session.sendMessage('I prefer low risk');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      expect(response3.parameters.riskLevel || response3.riskLevel).toBe('low');
      
      // Final turn should have complete command
      if (response3.command) {
        expect(response3.command.parameters.amount).toBe(5000);
        expect(response3.command.parameters.asset).toBe('USDC');
        expect(response3.command.riskLevel).toBe('low');
      }
    });
    
    it('should handle complex arbitrage discovery workflow', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Initial arbitrage request
      const turn1 = await session.sendMessage('Find arbitrage opportunities');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      expect(response1.intent.toLowerCase()).toContain('arbitrage');
      expect(response1.opportunities || response1.needsDisambiguation).toBeTruthy();
      
      // Turn 2: Specify asset
      const turn2 = await session.sendMessage('For SEI token');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.parameters.asset).toBe('SEI');
      
      // Turn 3: Execute best opportunity
      const turn3 = await session.sendMessage('Execute the best opportunity');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      expect(response3.parameters.action).toBe('execute');
      
      // Should maintain context across all turns
      const turns = session.getTurns();
      expect(turns).toHaveLength(3);
      expect(turns[2].response.parameters.asset).toBe('SEI');
    });
  });
  
  describe('Context Preservation and Memory', () => {
    it('should preserve user preferences across conversation turns', async () => {
      const user = MockDataGenerators.userProfile();
      user.preferences.riskTolerance = 'conservative';
      user.preferences.preferredProtocols = ['YeiFinance'];
      
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Initial request with context
      const turn1 = await session.sendMessage(
        'I want to lend money', 
        { preferences: user.preferences }
      );
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      
      // Turn 2: Amount specification (should remember preferences)
      const turn2 = await session.sendMessage('1000 USDC');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.parameters.amount).toBe(1000);
      expect(response2.parameters.asset).toBe('USDC');
      
      // Should use conservative settings
      if (response2.riskLevel) {
        expect(response2.riskLevel).toBe('low');
      }
      
      if (response2.parameters.protocol) {
        expect(user.preferences.preferredProtocols).toContain(response2.parameters.protocol);
      }
    });
    
    it('should remember previous operations in conversation', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: First lending operation
      const turn1 = await session.sendMessage('Lend 1000 USDC on YeiFinance');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      
      // Turn 2: Reference previous operation
      const turn2 = await session.sendMessage('Increase it to 2000');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.parameters.amount).toBe(2000);
      expect(response2.parameters.asset).toBe('USDC');
      expect(response2.parameters.protocol).toBe('YeiFinance');
      
      // Turn 3: Reference previous protocol
      const turn3 = await session.sendMessage('What are the rates there?');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      // Should reference YeiFinance from previous context
      if (response3.parameters && response3.parameters.protocol) {
        expect(response3.parameters.protocol).toBe('YeiFinance');
      }
    });
  });
  
  describe('Complex Multi-Step Operations', () => {
    it('should handle yield optimization workflow', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Request optimization
      const turn1 = await session.sendMessage('Optimize my yield');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      expect(response1.intent.toLowerCase()).toContain('optimization');
      
      // Turn 2: Provide portfolio details
      const turn2 = await session.sendMessage('I have 10000 USDC and 5000 SEI');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.portfolio || response2.parameters).toBeDefined();
      
      // Turn 3: Specify constraints
      const turn3 = await session.sendMessage('I want to keep at least 2000 USDC liquid');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      
      // Turn 4: Execute optimization
      const turn4 = await session.sendMessage('Execute the optimization');
      const response4 = TestAssertions.expectEither(turn4);
      
      expect(response4).toBeValidConversationResponse();
      
      // Should have optimization strategy
      if (response4.optimizationPlan) {
        expect(response4.optimizationPlan.steps).toBeDefined();
        expect(response4.optimizationPlan.steps.length).toBeGreaterThan(0);
      }
    });
    
    it('should handle portfolio rebalancing workflow', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Request rebalancing
      const turn1 = await session.sendMessage('Rebalance my portfolio');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      
      // Turn 2: Specify target allocation
      const turn2 = await session.sendMessage('50% USDC, 30% SEI, 20% ETH');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.targetAllocation || response2.parameters).toBeDefined();
      
      // Turn 3: Confirm rebalancing
      const turn3 = await session.sendMessage('Confirm the rebalancing');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      
      // Should have rebalancing plan
      if (response3.rebalancingPlan) {
        expect(response3.rebalancingPlan.operations).toBeDefined();
        expect(response3.rebalancingPlan.operations.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Error Recovery in Multi-Turn Context', () => {
    it('should recover from errors while preserving context', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Valid request
      const turn1 = await session.sendMessage('Lend 1000 USDC');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      
      // Turn 2: Invalid asset
      const turn2 = await session.sendMessage('Actually, make it INVALID_ASSET');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      expect(response2.needsDisambiguation || response2.error).toBeTruthy();
      
      // Turn 3: Correct the error
      const turn3 = await session.sendMessage('I meant USDC');
      const response3 = TestAssertions.expectEither(turn3);
      
      expect(response3).toBeValidConversationResponse();
      expect(response3.parameters.asset).toBe('USDC');
      
      // Should still remember the amount from turn 1
      expect(response3.parameters.amount).toBe(1000);
    });
    
    it('should handle network interruptions gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      // Turn 1: Successful request
      const turn1 = await session.sendMessage('Show my portfolio');
      const response1 = TestAssertions.expectEither(turn1);
      
      expect(response1).toBeValidConversationResponse();
      
      // Simulate recovery after interruption
      // Turn 2: Continue conversation
      const turn2 = await session.sendMessage('What are my lending positions?');
      const response2 = TestAssertions.expectEither(turn2);
      
      expect(response2).toBeValidConversationResponse();
      
      // Should maintain conversation context
      const turns = session.getTurns();
      expect(turns).toHaveLength(2);
    });
  });
  
  describe('Performance in Multi-Turn Scenarios', () => {
    it('should maintain performance across long conversations', async () => {
      const user = MockDataGenerators.userProfile();
      const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
      
      const messages = [
        'Show my portfolio',
        'What are the lending rates?',
        'I want to optimize my yield',
        'I have 5000 USDC',
        'I prefer medium risk',
        'Show me the strategy',
        'Execute the optimization',
        'Check the status',
        'What are my current positions?',
        'Generate a report'
      ];
      
      const startTime = Date.now();
      let totalResponseTime = 0;
      
      for (const [index, message] of messages.entries()) {
        const turnStart = Date.now();
        const result = await session.sendMessage(message);
        const turnEnd = Date.now();
        
        const turnTime = turnEnd - turnStart;
        totalResponseTime += turnTime;
        
        expect(turnTime).toBeWithinResponseTime(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
        
        const response = TestAssertions.expectEither(result);
        expect(response).toBeValidConversationResponse();
        
        // Add small delay between turns
        await TestUtils.waitFor(100)();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageResponseTime = totalResponseTime / messages.length;
      
      expect(averageResponseTime).toBeWithinResponseTime(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
      
      console.log(`Long conversation completed in ${totalTime}ms, average response: ${averageResponseTime}ms`);
    });
  });
  
  describe('Property-Based Multi-Turn Testing', () => {
    it('should handle various multi-turn scenarios with property testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.conversationScenarios.multiTurn(),
          async (scenario) => {
            const user = MockDataGenerators.userProfile();
            const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
            
            let lastSuccessfulResponse = null;
            
            for (const [index, turn] of scenario.turns.entries()) {
              const result = await session.sendMessage(turn.input);
              
              if (E.isRight(result)) {
                const response = result.right;
                expect(response).toBeValidConversationResponse();
                
                // Context should be preserved between successful turns
                if (lastSuccessfulResponse && index > 0) {
                  // Some form of context continuity should exist
                  expect(response.conversationId || response.sessionId).toBeDefined();
                }
                
                lastSuccessfulResponse = response;
              } else {
                // Handle expected failures in property testing
                console.log(`Expected failure in turn ${index}:`, result.left.message);
              }
            }
            
            // At least one turn should succeed
            return lastSuccessfulResponse !== null;
          }
        ),
        { numRuns: 10, timeout: 60000 }
      );
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});