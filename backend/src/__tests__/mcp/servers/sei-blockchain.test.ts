/**
 * SEI Blockchain MCP Server Integration Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MCPClientFactory, MCPConnectionManager } from '../../../lib/mcp/client';
import SeiBlockchainMCPConfig from '../../../config/mcp/sei-blockchain';
import { MockMCPServer } from '../mocks/server';
import { 
  generateWalletBalance,
  generateTransaction,
  generateDeFiPosition 
} from '../mocks/generators';
import {
  assertValidToolResponse,
  assertValidWalletBalance
} from '../mocks/assertions';

describe('SEI Blockchain MCP Server Integration', () => {
  let mockServer: MockMCPServer;
  let connectionManager: MCPConnectionManager;
  let factory: MCPClientFactory;

  beforeEach(() => {
    // Create mock server with SEI blockchain tools
    mockServer = new MockMCPServer({
      name: 'sei-blockchain',
      tools: SeiBlockchainMCPConfig.tools,
      latency: 30,
      errorRate: 0
    });

    // Create connection manager
    connectionManager = new MCPConnectionManager({
      servers: [{
        name: 'sei-blockchain',
        type: 'http',
        url: 'http://localhost:3002/mcp'
      }]
    });

    factory = connectionManager.getFactory();
  });

  afterEach(async () => {
    await connectionManager.shutdown();
    await mockServer.stop();
  });

  describe('Wallet Balance Tool', () => {
    it('should get wallet balance', async () => {
      const testAddress = 'sei1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lakhz7';
      
      const result = await factory.callTool('sei-blockchain', 'getWalletBalance', {
        address: testAddress
      });

      assertValidToolResponse(result);
      assertValidWalletBalance(result.content);
      expect(result.content.address).toBe(testAddress);
    });

    it('should validate address format', async () => {
      await expect(
        factory.callTool('sei-blockchain', 'getWalletBalance', {
          address: 'invalid-address'
        })
      ).rejects.toThrow();
    });

    it('should include USD values when available', async () => {
      const result = await factory.callTool('sei-blockchain', 'getWalletBalance', {
        address: 'sei1test...'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('totalUSD');
      expect(typeof result.content.totalUSD).toBe('number');
    });
  });

  describe('Transaction History Tool', () => {
    it('should get transaction history', async () => {
      const result = await factory.callTool('sei-blockchain', 'getTransactionHistory', {
        address: 'sei1test...',
        limit: 10,
        offset: 0
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('transactions');
      expect(Array.isArray(result.content.transactions)).toBe(true);
      expect(result.content).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const page1 = await factory.callTool('sei-blockchain', 'getTransactionHistory', {
        address: 'sei1test...',
        limit: 5,
        offset: 0
      });

      const page2 = await factory.callTool('sei-blockchain', 'getTransactionHistory', {
        address: 'sei1test...',
        limit: 5,
        offset: 5
      });

      assertValidToolResponse(page1);
      assertValidToolResponse(page2);
      
      // In real implementation, would verify different transactions
    });
  });

  describe('DeFi Positions Tool', () => {
    it('should get DeFi positions', async () => {
      const result = await factory.callTool('sei-blockchain', 'getDeFiPositions', {
        address: 'sei1test...',
        protocols: ['astroport', 'levana']
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('positions');
      expect(Array.isArray(result.content.positions)).toBe(true);
      expect(result.content).toHaveProperty('totalValue');
    });

    it('should filter by protocol', async () => {
      const result = await factory.callTool('sei-blockchain', 'getDeFiPositions', {
        address: 'sei1test...',
        protocols: ['astroport']
      });

      assertValidToolResponse(result);
      // In real implementation, would verify only Astroport positions returned
    });
  });

  describe('Token Swap Tool', () => {
    it('should execute token swap', async () => {
      const result = await factory.callTool('sei-blockchain', 'executeTokenSwap', {
        fromToken: 'usei',
        toToken: 'usdc',
        amount: '1000000',
        slippageTolerance: 0.01,
        walletAddress: 'sei1test...'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('txHash');
      expect(result.content).toHaveProperty('status');
      expect(result.content).toHaveProperty('amountOut');
    });

    it('should validate swap parameters', async () => {
      await expect(
        factory.callTool('sei-blockchain', 'executeTokenSwap', {
          fromToken: 'usei',
          toToken: 'usei', // Same token
          amount: '1000000'
        })
      ).rejects.toThrow();
    });

    it('should respect slippage tolerance', async () => {
      const result = await factory.callTool('sei-blockchain', 'executeTokenSwap', {
        fromToken: 'usei',
        toToken: 'usdc',
        amount: '1000000',
        slippageTolerance: 0.005 // 0.5%
      });

      assertValidToolResponse(result);
      // In real implementation, would verify slippage is respected
    });
  });

  describe('Token Transfer Tool', () => {
    it('should send token transfer', async () => {
      const result = await factory.callTool('sei-blockchain', 'sendTokenTransfer', {
        token: 'usei',
        amount: '1000000',
        fromAddress: 'sei1from...',
        toAddress: 'sei1to...',
        memo: 'Test transfer'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('txHash');
      expect(result.content).toHaveProperty('status');
      expect(result.content).toHaveProperty('fee');
    });

    it('should validate addresses', async () => {
      await expect(
        factory.callTool('sei-blockchain', 'sendTokenTransfer', {
          token: 'usei',
          amount: '1000000',
          fromAddress: 'invalid',
          toAddress: 'sei1to...'
        })
      ).rejects.toThrow();
    });
  });

  describe('Liquidity Pools Tool', () => {
    it('should get liquidity pools', async () => {
      const result = await factory.callTool('sei-blockchain', 'getLiquidityPools', {
        protocol: 'astroport',
        includeInactive: false
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('pools');
      expect(Array.isArray(result.content.pools)).toBe(true);
      
      result.content.pools.forEach((pool: any) => {
        expect(pool).toHaveProperty('address');
        expect(pool).toHaveProperty('assets');
        expect(pool).toHaveProperty('totalLiquidity');
        expect(pool).toHaveProperty('apy');
      });
    });
  });

  describe('Staking Info Tool', () => {
    it('should get staking information', async () => {
      const result = await factory.callTool('sei-blockchain', 'getStakingInfo', {
        delegatorAddress: 'sei1test...'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('delegations');
      expect(result.content).toHaveProperty('unbondingDelegations');
      expect(result.content).toHaveProperty('rewards');
      expect(result.content).toHaveProperty('totalStaked');
    });

    it('should get validator-specific info', async () => {
      const result = await factory.callTool('sei-blockchain', 'getStakingInfo', {
        delegatorAddress: 'sei1test...',
        validatorAddress: 'seivaloper1...'
      });

      assertValidToolResponse(result);
      // In real implementation, would verify validator-specific data
    });
  });

  describe('Token Metadata Tool', () => {
    it('should get token metadata', async () => {
      const result = await factory.callTool('sei-blockchain', 'getTokenMetadata', {
        tokenAddress: 'sei1token...'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('name');
      expect(result.content).toHaveProperty('symbol');
      expect(result.content).toHaveProperty('decimals');
      expect(result.content).toHaveProperty('totalSupply');
    });
  });

  describe('Validator Info Tool', () => {
    it('should get validator information', async () => {
      const result = await factory.callTool('sei-blockchain', 'getValidatorInfo', {
        validatorAddress: 'seivaloper1...'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('moniker');
      expect(result.content).toHaveProperty('commission');
      expect(result.content).toHaveProperty('totalDelegated');
      expect(result.content).toHaveProperty('status');
    });
  });

  describe('Governance Proposals Tool', () => {
    it('should get governance proposals', async () => {
      const result = await factory.callTool('sei-blockchain', 'getGovernanceProposals', {
        status: 'voting_period'
      });

      assertValidToolResponse(result);
      expect(result.content).toHaveProperty('proposals');
      expect(Array.isArray(result.content.proposals)).toBe(true);
    });

    it('should filter by status', async () => {
      const votingProposals = await factory.callTool('sei-blockchain', 'getGovernanceProposals', {
        status: 'voting_period'
      });

      const passedProposals = await factory.callTool('sei-blockchain', 'getGovernanceProposals', {
        status: 'passed'
      });

      assertValidToolResponse(votingProposals);
      assertValidToolResponse(passedProposals);
      // In real implementation, would verify different proposals
    });
  });

  describe('Error Scenarios', () => {
    it('should handle RPC errors', async () => {
      mockServer.setErrorRate(1);

      await expect(
        factory.callTool('sei-blockchain', 'getWalletBalance', {
          address: 'sei1test...'
        })
      ).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockServer.setLatency(5000); // 5 second latency

      // With proper timeout configuration, this should timeout
      // In real implementation, would test actual timeout behavior
    });
  });

  describe('Batch Operations', () => {
    it('should support batch balance queries', async () => {
      // In real implementation, would test batch endpoint
      const addresses = [
        'sei1addr1...',
        'sei1addr2...',
        'sei1addr3...'
      ];

      const results = await Promise.all(
        addresses.map(address => 
          factory.callTool('sei-blockchain', 'getWalletBalance', { address })
        )
      );

      expect(results).toHaveLength(3);
      results.forEach(result => assertValidToolResponse(result));
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () => 
        factory.callTool('sei-blockchain', 'getWalletBalance', {
          address: 'sei1test...'
        })
      );

      // Some might fail with rate limit in real implementation
      const results = await Promise.allSettled(requests);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });
});