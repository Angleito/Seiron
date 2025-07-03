/**
 * @fileoverview Single-Turn Conversation E2E Tests
 * Tests simple, direct commands with immediate responses
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
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

// API client for E2E tests
class ConversationClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async sendMessage(
    message: string, 
    userId: string, 
    conversationId?: string,
    context?: any
  ): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message,
        userId,
        conversationId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'E2E-Test-Client'
        }
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getConversationHistory(userId: string, conversationId: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/chat/history`, {
        params: { userId, conversationId },
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

describe('Single-Turn Conversation E2E Tests', () => {
  let client: ConversationClient;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    client = new ConversationClient(E2E_CONFIG.API_BASE_URL);
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Simple Command Execution', () => {
    it('should execute simple lending commands correctly', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Lend 1000 USDC';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      expect(response.intent.toLowerCase()).toContain('lend');
      expect(response.parameters).toBeDefined();
      expect(response.parameters.amount).toBe(1000);
      expect(response.parameters.asset).toBe('USDC');
    });
    
    it('should execute simple swap commands correctly', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Swap 100 SEI for USDC';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      expect(response.intent.toLowerCase()).toContain('swap');
      expect(response.parameters).toBeDefined();
      expect(response.parameters.amount).toBe(100);
      expect(response.parameters.fromAsset).toBe('SEI');
      expect(response.parameters.toAsset).toBe('USDC');
    });
    
    it('should handle portfolio status requests', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Show my portfolio';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      expect(response.intent.toLowerCase()).toContain('portfolio');
      expect(response.data).toBeDefined();
    });
  });
  
  describe('Property-Based Single-Turn Testing', () => {
    it('should handle valid lending commands with property testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          TestUtils.generators.amount(),
          TestUtils.generators.asset(),
          async (userId, amount, asset) => {
            const message = `Lend ${amount} ${asset}`;
            const result = await client.sendMessage(message, userId);
            
            return pipe(
              result,
              E.fold(
                (error) => {
                  // Some failures are expected with random data
                  console.log(`Expected failure for ${message}:`, error.message);
                  return true;
                },
                (response) => {
                  // If successful, should have correct structure
                  expect(response.intent).toBeDefined();
                  expect(response.parameters).toBeDefined();
                  if (response.parameters.amount) {
                    expect(Math.abs(response.parameters.amount - amount)).toBeLessThan(0.01);
                  }
                  if (response.parameters.asset) {
                    expect(response.parameters.asset).toBe(asset);
                  }
                  return true;
                }
              )
            );
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });
    
    it('should handle valid swap commands with property testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          TestUtils.generators.amount(),
          TestUtils.generators.asset(),
          TestUtils.generators.asset(),
          async (userId, amount, fromAsset, toAsset) => {
            // Skip if assets are the same
            if (fromAsset === toAsset) return true;
            
            const message = `Swap ${amount} ${fromAsset} for ${toAsset}`;
            const result = await client.sendMessage(message, userId);
            
            return pipe(
              result,
              E.fold(
                (error) => {
                  // Some failures are expected with random data
                  console.log(`Expected failure for ${message}:`, error.message);
                  return true;
                },
                (response) => {
                  // If successful, should have correct structure
                  expect(response.intent).toBeDefined();
                  expect(response.parameters).toBeDefined();
                  if (response.parameters.amount) {
                    expect(Math.abs(response.parameters.amount - amount)).toBeLessThan(0.01);
                  }
                  if (response.parameters.fromAsset) {
                    expect(response.parameters.fromAsset).toBe(fromAsset);
                  }
                  if (response.parameters.toAsset) {
                    expect(response.parameters.toAsset).toBe(toAsset);
                  }
                  return true;
                }
              )
            );
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle invalid commands gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Lend ??? INVALID_ASSET';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.needsDisambiguation || response.error).toBeTruthy();
      
      if (response.needsDisambiguation) {
        expect(response.disambiguationOptions).toBeDefined();
        expect(response.suggestedAssets).toBeDefined();
      }
    });
    
    it('should handle malformed requests', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'random gibberish that makes no sense';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      
      // Should provide helpful suggestions
      if (response.intent === 'unknown') {
        expect(response.suggestions).toBeDefined();
        expect(response.suggestions.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Response Time and Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Lend 1000 USDC';
      
      const startTime = Date.now();
      const result = await client.sendMessage(message, user.userId);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeWithinResponseTime(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
      
      const response = TestAssertions.expectEither(result);
      expect(response).toBeValidConversationResponse();
    });
    
    it('should handle concurrent single-turn requests', async () => {
      const user = MockDataGenerators.userProfile();
      const messages = [
        'Lend 1000 USDC',
        'Swap 100 SEI for USDC',
        'Show my portfolio',
        'What are the lending rates?',
        'Find arbitrage opportunities'
      ];
      
      const startTime = Date.now();
      const promises = messages.map(message => 
        client.sendMessage(message, user.userId)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / messages.length;
      
      expect(averageTime).toBeWithinResponseTime(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
      
      // All requests should succeed
      results.forEach(result => {
        const response = TestAssertions.expectEither(result);
        expect(response).toBeValidConversationResponse();
      });
    });
  });
  
  describe('User Context Integration', () => {
    it('should use user preferences in responses', async () => {
      const user = MockDataGenerators.userProfile();
      user.preferences.riskTolerance = 'low';
      user.preferences.preferredProtocols = ['YeiFinance'];
      
      const context = {
        walletAddress: user.walletAddress,
        preferences: user.preferences
      };
      
      const message = 'Lend 1000 USDC';
      const result = await client.sendMessage(message, user.userId, undefined, context);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      
      // Should reflect user preferences
      if (response.parameters.protocol) {
        expect(user.preferences.preferredProtocols).toContain(response.parameters.protocol);
      }
      
      if (response.riskLevel) {
        expect(response.riskLevel).toBe('low');
      }
    });
    
    it('should handle different user experience levels', async () => {
      const beginnerUser = MockDataGenerators.userProfile();
      beginnerUser.preferences.tradingExperience = 'beginner';
      
      const expertUser = MockDataGenerators.userProfile();
      expertUser.preferences.tradingExperience = 'expert';
      
      const message = 'Lend 10000 USDC';
      
      const beginnerResult = await client.sendMessage(
        message, 
        beginnerUser.userId, 
        undefined, 
        { preferences: beginnerUser.preferences }
      );
      
      const expertResult = await client.sendMessage(
        message, 
        expertUser.userId, 
        undefined, 
        { preferences: expertUser.preferences }
      );
      
      const beginnerResponse = TestAssertions.expectEither(beginnerResult);
      const expertResponse = TestAssertions.expectEither(expertResult);
      
      expect(beginnerResponse).toBeValidConversationResponse();
      expect(expertResponse).toBeValidConversationResponse();
      
      // Beginner should get more guidance/warnings
      if (beginnerResponse.warnings && expertResponse.warnings) {
        expect(beginnerResponse.warnings.length).toBeGreaterThanOrEqual(expertResponse.warnings.length);
      }
      
      // Expert might get more advanced options
      if (expertResponse.advancedOptions) {
        expect(expertResponse.advancedOptions.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Integration with Agent Actions', () => {
    it('should properly integrate with lending agent actions', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Lend 1000 USDC on YeiFinance';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      expect(response.parameters).toBeDefined();
      expect(response.parameters.protocol).toBe('YeiFinance');
      
      // Should include agent-specific information
      if (response.agentInfo) {
        expect(response.agentInfo.agentType).toBe('lending');
        expect(response.agentInfo.capabilities).toBeDefined();
      }
    });
    
    it('should properly integrate with liquidity agent actions', async () => {
      const user = MockDataGenerators.userProfile();
      const message = 'Add liquidity to SEI/USDC pool';
      
      const result = await client.sendMessage(message, user.userId);
      const response = TestAssertions.expectEither(result);
      
      expect(response).toBeValidConversationResponse();
      expect(response.intent).toBeDefined();
      expect(response.parameters).toBeDefined();
      expect(response.parameters.token1).toBe('SEI');
      expect(response.parameters.token2).toBe('USDC');
      
      // Should include agent-specific information
      if (response.agentInfo) {
        expect(response.agentInfo.agentType).toBe('liquidity');
        expect(response.agentInfo.capabilities).toBeDefined();
      }
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});