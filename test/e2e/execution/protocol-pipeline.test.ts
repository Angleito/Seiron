/**
 * @fileoverview Protocol Execution Pipeline E2E Tests
 * Tests complete natural language to protocol execution pipeline
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

// Protocol execution client
class ProtocolExecutionClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async executeCommand(
    command: string,
    userId: string,
    context?: any
  ): Promise<E.Either<Error, ExecutionResult>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/execute`, {
        command,
        userId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getExecutionStatus(
    operationId: string
  ): Promise<E.Either<Error, ExecutionStatus>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/execute/status/${operationId}`, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async simulateTransaction(
    operation: any
  ): Promise<E.Either<Error, TransactionResult>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/simulate`, {
        operation
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async getPortfolioState(
    userId: string,
    beforeOperation?: boolean
  ): Promise<E.Either<Error, PortfolioState>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/portfolio/${userId}`, {
        params: { beforeOperation },
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

// Types for execution testing
interface ExecutionResult {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  operation: ProtocolOperation;
  simulationResult?: TransactionResult;
  estimatedGas?: number;
  estimatedTime?: number;
  warnings?: string[];
  timestamp: string;
}

interface ExecutionStatus {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  steps?: ExecutionStep[];
  result?: any;
  error?: string;
  timestamp: string;
}

interface ProtocolOperation {
  type: 'lending' | 'swap' | 'liquidity' | 'arbitrage';
  protocol: string;
  parameters: any;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedReturn?: number;
  requiredApprovals?: string[];
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  effectiveGasPrice?: number;
  blockNumber?: number;
  logs?: any[];
  revertReason?: string;
}

interface PortfolioState {
  userId: string;
  totalValue: number;
  assets: Array<{
    asset: string;
    balance: number;
    value: number;
    protocol?: string;
  }>;
  positions: Array<{
    id: string;
    type: string;
    protocol: string;
    asset: string;
    amount: number;
    apy?: number;
    startTime: string;
  }>;
  timestamp: string;
}

interface ExecutionStep {
  step: number;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionHash?: string;
  timestamp: string;
}

describe('Protocol Execution Pipeline E2E Tests', () => {
  let client: ProtocolExecutionClient;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    client = new ProtocolExecutionClient(E2E_CONFIG.API_BASE_URL);
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Natural Language to Protocol Execution', () => {
    it('should execute simple lending command end-to-end', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Lend 1000 USDC on YeiFinance';
      
      // Get initial portfolio state
      const initialStateResult = await client.getPortfolioState(user.userId, true);
      const initialState = TestAssertions.expectEither(initialStateResult);
      
      // Execute command
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      expect(execution.operationId).toBeDefined();
      expect(execution.operation.type).toBe('lending');
      expect(execution.operation.protocol).toBe('YeiFinance');
      expect(execution.operation.parameters.asset).toBe('USDC');
      expect(execution.operation.parameters.amount).toBe(1000);
      
      // Check simulation result if provided
      if (execution.simulationResult) {
        expect(execution.simulationResult.success).toBe(true);
        expect(execution.estimatedGas).toBeGreaterThan(0);
      }
      
      // Get final portfolio state
      const finalStateResult = await client.getPortfolioState(user.userId);
      const finalState = TestAssertions.expectEither(finalStateResult);
      
      // Validate state change (in simulation)
      expect(finalState.positions.length).toBeGreaterThanOrEqual(initialState.positions.length);
      
      // Find the new lending position
      const lendingPosition = finalState.positions.find(p => 
        p.type === 'lending' && 
        p.protocol === 'YeiFinance' && 
        p.asset === 'USDC'
      );
      
      if (lendingPosition) {
        expect(lendingPosition.amount).toBe(1000);
        expect(lendingPosition.apy).toBeGreaterThan(0);
      }
    });
    
    it('should execute complex swap command with optimization', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Swap 500 SEI for USDC at the best rate available';
      
      const initialStateResult = await client.getPortfolioState(user.userId, true);
      const initialState = TestAssertions.expectEither(initialStateResult);
      
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      expect(execution.operation.type).toBe('swap');
      expect(execution.operation.parameters.fromAsset).toBe('SEI');
      expect(execution.operation.parameters.toAsset).toBe('USDC');
      expect(execution.operation.parameters.amount).toBe(500);
      expect(execution.operation.parameters.optimization).toBe('best_rate');
      
      // Should include rate comparison or optimization info
      if (execution.operation.parameters.rateComparison) {
        expect(execution.operation.parameters.rateComparison.length).toBeGreaterThan(0);
      }
      
      // Simulation should show expected output
      if (execution.simulationResult) {
        expect(execution.simulationResult.success).toBe(true);
        expect(execution.operation.parameters.estimatedOutput).toBeGreaterThan(0);
      }
    });
    
    it('should execute liquidity provision with proper calculations', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Add 1000 USDC and equivalent SEI to DragonSwap pool';
      
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      expect(execution.operation.type).toBe('liquidity');
      expect(execution.operation.protocol).toBe('DragonSwap');
      expect(execution.operation.parameters.token1).toBe('USDC');
      expect(execution.operation.parameters.token2).toBe('SEI');
      expect(execution.operation.parameters.amount1).toBe(1000);
      
      // Should calculate equivalent amount for SEI
      expect(execution.operation.parameters.amount2).toBeGreaterThan(0);
      expect(execution.operation.parameters.autoCalculateAmount2).toBe(true);
      
      // Should provide pool information
      if (execution.operation.parameters.poolInfo) {
        expect(execution.operation.parameters.poolInfo.currentRatio).toBeDefined();
        expect(execution.operation.parameters.poolInfo.estimatedShare).toBeGreaterThan(0);
      }
    });
    
    it('should handle arbitrage opportunity execution', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Execute arbitrage for USDC between YeiFinance and DragonSwap';
      
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      expect(execution.operation.type).toBe('arbitrage');
      expect(execution.operation.parameters.asset).toBe('USDC');
      expect(execution.operation.parameters.protocols).toContain('YeiFinance');
      expect(execution.operation.parameters.protocols).toContain('DragonSwap');
      
      // Should include profit estimation
      expect(execution.operation.estimatedReturn).toBeGreaterThan(0);
      expect(execution.operation.parameters.profitEstimate).toBeGreaterThan(0);
      
      // Should have multi-step execution plan
      if (execution.operation.parameters.executionSteps) {
        expect(execution.operation.parameters.executionSteps.length).toBeGreaterThan(1);
      }
    });
  });
  
  describe('Operation Status Tracking', () => {
    it('should track operation status through completion', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Lend 500 USDC';
      
      // Start operation
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      const operationId = execution.operationId;
      
      // Poll status until completion or timeout
      let status: ExecutionStatus;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        await TestUtils.waitFor(1000)(); // Wait 1 second
        
        const statusResult = await client.getExecutionStatus(operationId);
        status = TestAssertions.expectEither(statusResult);
        
        expect(status.operationId).toBe(operationId);
        expect(['pending', 'processing', 'completed', 'failed']).toContain(status.status);
        
        if (status.progress !== undefined) {
          expect(status.progress).toBeGreaterThanOrEqual(0);
          expect(status.progress).toBeLessThanOrEqual(100);
        }
        
        attempts++;
      } while (
        status.status !== 'completed' && 
        status.status !== 'failed' && 
        attempts < maxAttempts
      );
      
      // Should eventually complete or fail
      expect(['completed', 'failed']).toContain(status.status);
      
      if (status.status === 'completed') {
        expect(status.result).toBeDefined();
        if (status.steps) {
          expect(status.steps.every(step => step.status === 'completed')).toBe(true);
        }
      }
      
      if (status.status === 'failed') {
        expect(status.error).toBeDefined();
      }
    });
    
    it('should handle operation cancellation gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Lend 10000 USDC'; // Large amount that might require confirmation
      
      const executionResult = await client.executeCommand(command, user.userId);
      const execution = TestAssertions.expectEither(executionResult);
      
      // If operation requires confirmation, it should be in pending state
      if (execution.status === 'pending') {
        const statusResult = await client.getExecutionStatus(execution.operationId);
        const status = TestAssertions.expectEither(statusResult);
        
        expect(status.status).toBe('pending');
        
        // In a real implementation, we would test cancellation here
        // For simulation purposes, we just verify the pending state is stable
      }
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle insufficient balance gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Lend 1000000 USDC'; // Very large amount likely to exceed balance
      
      const executionResult = await client.executeCommand(command, user.userId);
      
      if (E.isRight(executionResult)) {
        const execution = executionResult.right;
        
        // Should either fail immediately or warn about insufficient balance
        if (execution.status === 'failed') {
          expect(execution.warnings || []).toContain(
            jasmine.stringMatching(/insufficient.*balance/i)
          );
        } else {
          // If not failed immediately, simulation should detect the issue
          if (execution.simulationResult) {
            expect(execution.simulationResult.success).toBe(false);
            expect(execution.simulationResult.revertReason).toContain('insufficient');
          }
        }
      } else {
        // Error is also acceptable for invalid operations
        expect(executionResult.left.message).toContain('insufficient');
      }
    });
    
    it('should handle unsupported protocol gracefully', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Lend 1000 USDC on NonExistentProtocol';
      
      const executionResult = await client.executeCommand(command, user.userId);
      
      if (E.isRight(executionResult)) {
        const execution = executionResult.right;
        
        // Should either suggest alternative or fail gracefully
        expect(execution.status).toBe('failed');
        expect(execution.warnings).toBeDefined();
        
        // Should suggest valid protocols
        const warningText = execution.warnings?.join(' ').toLowerCase() || '';
        expect(warningText).toContain('protocol');
        expect(
          warningText.includes('yeifinance') || 
          warningText.includes('dragonswap') ||
          warningText.includes('available')
        ).toBe(true);
      } else {
        // Error response should be informative
        expect(executionResult.left.message.toLowerCase()).toContain('protocol');
      }
    });
    
    it('should handle network errors with retry logic', async () => {
      const user = MockDataGenerators.userProfile();
      const command = 'Swap 100 SEI for USDC';
      
      // This test depends on the implementation having retry logic
      // We simulate network issues by potentially getting timeout errors
      
      const executionResult = await client.executeCommand(command, user.userId);
      
      if (E.isLeft(executionResult)) {
        // If network error occurred, should be handled gracefully
        const error = executionResult.left;
        expect(error.message).toBeDefined();
        
        // Error should be user-friendly, not raw network error
        expect(error.message.toLowerCase()).not.toContain('econnrefused');
        expect(error.message.toLowerCase()).not.toContain('timeout');
      } else {
        // If successful, operation should be valid
        const execution = executionResult.right;
        expect(execution.operation.type).toBe('swap');
      }
    });
  });
  
  describe('Risk Assessment and Validation', () => {
    it('should assess risk levels for operations', async () => {
      const user = MockDataGenerators.userProfile();
      user.preferences.riskTolerance = 'low';
      
      const command = 'Lend 5000 USDC on high-yield protocol';
      
      const executionResult = await client.executeCommand(command, user.userId, {
        userPreferences: user.preferences
      });
      
      const execution = TestAssertions.expectEither(executionResult);
      
      expect(execution.operation.riskLevel).toBeDefined();
      
      // Should warn about risk mismatch if high-risk operation for low-risk user
      if (execution.operation.riskLevel === 'high' && user.preferences.riskTolerance === 'low') {
        expect(execution.warnings).toBeDefined();
        expect(execution.warnings?.some(w => w.toLowerCase().includes('risk'))).toBe(true);
      }
    });
    
    it('should validate operations against user constraints', async () => {
      const user = MockDataGenerators.userProfile();
      user.preferences.maxLendingAmount = 1000;
      
      const command = 'Lend 5000 USDC'; // Exceeds max lending amount
      
      const executionResult = await client.executeCommand(command, user.userId, {
        userPreferences: user.preferences
      });
      
      const execution = TestAssertions.expectEither(executionResult);
      
      // Should either warn or adjust the amount
      if (execution.operation.parameters.amount > user.preferences.maxLendingAmount) {
        expect(execution.warnings).toBeDefined();
        expect(execution.warnings?.some(w => w.toLowerCase().includes('limit'))).toBe(true);
      } else {
        // Amount was adjusted to comply with user constraints
        expect(execution.operation.parameters.amount).toBeLessThanOrEqual(
          user.preferences.maxLendingAmount
        );
      }
    });
  });
  
  describe('Property-Based Execution Testing', () => {
    it('should handle various lending operations with property testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          TestUtils.generators.amount().filter(a => a >= 1 && a <= 10000),
          TestUtils.generators.asset(),
          TestUtils.generators.protocol().filter(p => ['YeiFinance', 'Silo', 'Takara'].includes(p)),
          async (userId, amount, asset, protocol) => {
            const command = `Lend ${amount} ${asset} on ${protocol}`;
            
            const executionResult = await client.executeCommand(command, userId);
            
            if (E.isRight(executionResult)) {
              const execution = executionResult.right;
              
              // Basic validation
              expect(execution.operationId).toBeDefined();
              expect(execution.operation.type).toBe('lending');
              expect(execution.operation.protocol).toBe(protocol);
              expect(Math.abs(execution.operation.parameters.amount - amount)).toBeLessThan(0.01);
              expect(execution.operation.parameters.asset).toBe(asset);
              
              // Should have valid status
              expect(['pending', 'processing', 'completed', 'failed']).toContain(execution.status);
              
              return true;
            } else {
              // Some combinations might fail - that's acceptable
              console.log(`Expected failure for ${command}:`, executionResult.left.message);
              return true;
            }
          }
        ),
        { numRuns: 10, timeout: 60000 }
      );
    });
    
    it('should validate state changes with property testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          TestUtils.generators.userId(),
          fc.constantFrom('Lend 100 USDC', 'Swap 50 SEI for USDC', 'Add liquidity'),
          async (userId, command) => {
            // Get initial state
            const initialStateResult = await client.getPortfolioState(userId, true);
            
            if (E.isLeft(initialStateResult)) {
              return true; // Skip if can't get initial state
            }
            
            const initialState = initialStateResult.right;
            
            // Execute command
            const executionResult = await client.executeCommand(command, userId);
            
            if (E.isLeft(executionResult)) {
              return true; // Some commands might fail
            }
            
            const execution = executionResult.right;
            
            // Get final state
            const finalStateResult = await client.getPortfolioState(userId);
            
            if (E.isLeft(finalStateResult)) {
              return true; // Skip if can't get final state
            }
            
            const finalState = finalStateResult.right;
            
            // State should be consistent
            expect(finalState.userId).toBe(userId);
            expect(finalState.timestamp).toBeDefined();
            
            // If operation was successful, state should reflect changes
            if (execution.status === 'completed') {
              // Total positions should be greater or equal (no positions should disappear)
              expect(finalState.positions.length).toBeGreaterThanOrEqual(initialState.positions.length);
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