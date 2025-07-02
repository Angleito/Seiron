/**
 * Portfolio Routes Integration Tests
 * Tests API endpoints with functional patterns and mock services
 */

import request from 'supertest';
import express from 'express';
import { portfolioRouter } from '../portfolio';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  generatePortfolioSnapshot,
  generateWalletAddress,
  expectTaskRight,
  expectTaskLeft,
  mockBlockchainService,
  setMockPortfolio,
  createHighRiskScenario,
  createEmptyPortfolioScenario,
  resetMockState
} from '@/test-utils';

// Mock services type
interface MockServices {
  portfolio: {
    getPortfolioData: (walletAddress: string) => TE.TaskEither<Error, any>;
    getPortfolioSummary: (walletAddress: string) => TE.TaskEither<Error, any>;
    executeLendingOperation: (operation: string, params: any) => TE.TaskEither<Error, any>;
    executeLiquidityOperation: (operation: string, params: any) => TE.TaskEither<Error, any>;
  };
  socket: {
    sendTransactionUpdate: (walletAddress: string, txHash: string, status: string) => void;
  };
}

// Create test app with mocked services
const createTestApp = (mockServices: MockServices) => {
  const app = express();
  app.use(express.json());
  
  // Inject mock services into request
  app.use((req, _res, next) => {
    (req as any).services = mockServices;
    next();
  });
  
  app.use('/api/portfolio', portfolioRouter);
  
  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ success: false, error: err.message });
  });
  
  return app;
};

describe('Portfolio Routes Integration', () => {
  let mockServices: MockServices;
  let app: express.Application;
  
  beforeEach(() => {
    resetMockState();
    
    mockServices = {
      portfolio: {
        getPortfolioData: jest.fn(),
        getPortfolioSummary: jest.fn(),
        executeLendingOperation: jest.fn(),
        executeLiquidityOperation: jest.fn()
      },
      socket: {
        sendTransactionUpdate: jest.fn()
      }
    };
    
    app = createTestApp(mockServices);
  });

  describe('GET /api/portfolio/data', () => {
    const validWallet = generateWalletAddress();
    const portfolioData = generatePortfolioSnapshot({ walletAddress: validWallet });

    test('should return portfolio data for valid wallet', async () => {
      // Setup mock to return successful result
      (mockServices.portfolio.getPortfolioData as jest.Mock).mockReturnValue(
        TE.right(portfolioData)
      );

      const response = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: portfolioData
      });

      expect(mockServices.portfolio.getPortfolioData).toHaveBeenCalledWith(validWallet);
    });

    test('should handle service errors gracefully', async () => {
      const errorMessage = 'Blockchain connection failed';
      (mockServices.portfolio.getPortfolioData as jest.Mock).mockReturnValue(
        TE.left(new Error(errorMessage))
      );

      const response = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        error: errorMessage
      });
    });

    test('should validate wallet address format', async () => {
      const invalidWallet = 'invalid-address';

      const response = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: invalidWallet })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Valid wallet address required');
    });

    test('should require wallet address parameter', async () => {
      const response = await request(app)
        .get('/api/portfolio/data')
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Valid wallet address required');
    });

    test('should handle empty portfolio data', async () => {
      const emptyPortfolio = generatePortfolioSnapshot({
        walletAddress: validWallet,
        totalValueUSD: 0,
        lendingPositions: [],
        liquidityPositions: [],
        tokenBalances: []
      });

      (mockServices.portfolio.getPortfolioData as jest.Mock).mockReturnValue(
        TE.right(emptyPortfolio)
      );

      const response = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValueUSD).toBe(0);
      expect(response.body.data.lendingPositions).toHaveLength(0);
    });
  });

  describe('GET /api/portfolio/summary', () => {
    const validWallet = generateWalletAddress();
    const summaryData = {
      totalValueUSD: 50000,
      netWorth: 45000,
      healthFactor: 2.5,
      riskLevel: 'low' as const,
      positions: 5
    };

    test('should return portfolio summary for valid wallet', async () => {
      (mockServices.portfolio.getPortfolioSummary as jest.Mock).mockReturnValue(
        TE.right(summaryData)
      );

      const response = await request(app)
        .get('/api/portfolio/summary')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: summaryData
      });
    });

    test('should handle high-risk portfolio summary', async () => {
      const highRiskSummary = {
        ...summaryData,
        healthFactor: 1.1,
        riskLevel: 'critical' as const
      };

      (mockServices.portfolio.getPortfolioSummary as jest.Mock).mockReturnValue(
        TE.right(highRiskSummary)
      );

      const response = await request(app)
        .get('/api/portfolio/summary')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskLevel).toBe('critical');
      expect(response.body.data.healthFactor).toBe(1.1);
    });
  });

  describe('POST /api/portfolio/lending/supply', () => {
    const validWallet = generateWalletAddress();
    const supplyParams = {
      walletAddress: validWallet,
      asset: 'ETH',
      amount: '1.5',
      onBehalfOf: validWallet
    };

    test('should execute supply operation successfully', async () => {
      const txResult = {
        txHash: '0x1234567890abcdef',
        blockNumber: 12345,
        gasUsed: '21000'
      };

      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.right(txResult)
      );

      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send(supplyParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: txResult
      });

      expect(mockServices.portfolio.executeLendingOperation).toHaveBeenCalledWith(
        'supply',
        expect.objectContaining({
          asset: 'ETH',
          amount: BigInt(Math.floor(1.5 * 1e18)),
          onBehalfOf: validWallet
        })
      );

      expect(mockServices.socket.sendTransactionUpdate).toHaveBeenCalledWith(
        validWallet,
        txResult.txHash,
        'pending'
      );
    });

    test('should validate required fields', async () => {
      const invalidParams = {
        walletAddress: 'invalid',
        asset: '',
        amount: 'not-a-number'
      };

      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send(invalidParams)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle lending operation failures', async () => {
      const errorMessage = 'Insufficient balance';
      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.left(new Error(errorMessage))
      );

      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send(supplyParams)
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        error: errorMessage
      });
    });

    test('should default onBehalfOf to walletAddress', async () => {
      const paramsWithoutOnBehalfOf = {
        walletAddress: validWallet,
        asset: 'ETH',
        amount: '1.0'
      };

      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.right({ txHash: '0xabc' })
      );

      await request(app)
        .post('/api/portfolio/lending/supply')
        .send(paramsWithoutOnBehalfOf)
        .expect(200);

      expect(mockServices.portfolio.executeLendingOperation).toHaveBeenCalledWith(
        'supply',
        expect.objectContaining({
          onBehalfOf: validWallet
        })
      );
    });
  });

  describe('POST /api/portfolio/lending/withdraw', () => {
    const validWallet = generateWalletAddress();
    const withdrawParams = {
      walletAddress: validWallet,
      asset: 'USDC',
      amount: '1000',
      to: validWallet
    };

    test('should execute withdraw operation successfully', async () => {
      const txResult = {
        txHash: '0xabcdef1234567890',
        blockNumber: 12346,
        gasUsed: '25000'
      };

      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.right(txResult)
      );

      const response = await request(app)
        .post('/api/portfolio/lending/withdraw')
        .send(withdrawParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: txResult
      });

      expect(mockServices.portfolio.executeLendingOperation).toHaveBeenCalledWith(
        'withdraw',
        expect.objectContaining({
          asset: 'USDC',
          amount: BigInt(Math.floor(1000 * 1e18)),
          to: validWallet
        })
      );
    });

    test('should default to field to walletAddress', async () => {
      const paramsWithoutTo = {
        walletAddress: validWallet,
        asset: 'USDC',
        amount: '1000'
      };

      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.right({ txHash: '0xdef' })
      );

      await request(app)
        .post('/api/portfolio/lending/withdraw')
        .send(paramsWithoutTo)
        .expect(200);

      expect(mockServices.portfolio.executeLendingOperation).toHaveBeenCalledWith(
        'withdraw',
        expect.objectContaining({
          to: validWallet
        })
      );
    });
  });

  describe('POST /api/portfolio/liquidity/add', () => {
    const validWallet = generateWalletAddress();
    const token0 = '0x1234567890123456789012345678901234567890';
    const token1 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    
    const addLiquidityParams = {
      walletAddress: validWallet,
      token0,
      token1,
      fee: '3000',
      amount0Desired: '1.0',
      amount1Desired: '2000',
      tickLower: '-887220',
      tickUpper: '887220'
    };

    test('should execute add liquidity operation successfully', async () => {
      const txResult = {
        txHash: '0xfedcba0987654321',
        tokenId: 123,
        liquidity: '1000000000000000000'
      };

      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.right(txResult)
      );

      const response = await request(app)
        .post('/api/portfolio/liquidity/add')
        .send(addLiquidityParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: txResult
      });

      expect(mockServices.portfolio.executeLiquidityOperation).toHaveBeenCalledWith(
        'addLiquidity',
        expect.objectContaining({
          token0,
          token1,
          fee: 3000,
          tickLower: -887220,
          tickUpper: 887220,
          amount0Desired: BigInt(Math.floor(1.0 * 1e18)),
          amount1Desired: BigInt(Math.floor(2000 * 1e18))
        })
      );
    });

    test('should validate all required fields', async () => {
      const invalidParams = {
        walletAddress: 'invalid',
        token0: 'invalid',
        token1: 'invalid',
        fee: 'invalid',
        amount0Desired: 'invalid',
        amount1Desired: 'invalid',
        tickLower: 'invalid',
        tickUpper: 'invalid'
      };

      const response = await request(app)
        .post('/api/portfolio/liquidity/add')
        .send(invalidParams)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle liquidity operation failures', async () => {
      const errorMessage = 'Pool does not exist';
      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.left(new Error(errorMessage))
      );

      const response = await request(app)
        .post('/api/portfolio/liquidity/add')
        .send(addLiquidityParams)
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        error: errorMessage
      });
    });

    test('should set deadline parameter automatically', async () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      
      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.right({ txHash: '0x123' })
      );

      await request(app)
        .post('/api/portfolio/liquidity/add')
        .send(addLiquidityParams)
        .expect(200);

      const afterTime = Math.floor(Date.now() / 1000);
      const callArgs = (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mock.calls[0];
      const deadline = callArgs[1].deadline;

      expect(deadline).toBeGreaterThan(beforeTime + 200); // At least 200 seconds from now
      expect(deadline).toBeLessThan(afterTime + 400); // At most 400 seconds from now
    });
  });

  describe('POST /api/portfolio/liquidity/remove', () => {
    const validWallet = generateWalletAddress();
    const removeParams = {
      walletAddress: validWallet,
      positionId: '123',
      liquidity: '1000000000000000000'
    };

    test('should execute remove liquidity operation successfully', async () => {
      const txResult = {
        txHash: '0x9876543210fedcba',
        amount0: '500000000000000000',
        amount1: '1000000000000000000000'
      };

      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.right(txResult)
      );

      const response = await request(app)
        .post('/api/portfolio/liquidity/remove')
        .send(removeParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: txResult
      });

      expect(mockServices.portfolio.executeLiquidityOperation).toHaveBeenCalledWith(
        'removeLiquidity',
        expect.objectContaining({
          positionId: '123',
          liquidity: BigInt('1000000000000000000'),
          amount0Min: 0n,
          amount1Min: 0n
        })
      );
    });

    test('should validate required fields', async () => {
      const invalidParams = {
        walletAddress: 'invalid',
        positionId: '',
        liquidity: 'invalid'
      };

      const response = await request(app)
        .post('/api/portfolio/liquidity/remove')
        .send(invalidParams)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/portfolio/liquidity/collect', () => {
    const validWallet = generateWalletAddress();
    const collectParams = {
      walletAddress: validWallet,
      positionId: '456'
    };

    test('should execute collect fees operation successfully', async () => {
      const txResult = {
        txHash: '0x1111222233334444',
        amount0: '50000000000000000',
        amount1: '100000000000000000000'
      };

      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.right(txResult)
      );

      const response = await request(app)
        .post('/api/portfolio/liquidity/collect')
        .send(collectParams)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: txResult
      });

      expect(mockServices.portfolio.executeLiquidityOperation).toHaveBeenCalledWith(
        'collectFees',
        expect.objectContaining({
          positionId: '456',
          amount0Max: 2n ** 128n - 1n,
          amount1Max: 2n ** 128n - 1n
        })
      );
    });

    test('should use maximum uint128 values for collection', async () => {
      (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mockReturnValue(
        TE.right({ txHash: '0x555' })
      );

      await request(app)
        .post('/api/portfolio/liquidity/collect')
        .send(collectParams)
        .expect(200);

      const callArgs = (mockServices.portfolio.executeLiquidityOperation as jest.Mock).mock.calls[0];
      const params = callArgs[1];

      expect(params.amount0Max).toBe(2n ** 128n - 1n);
      expect(params.amount1Max).toBe(2n ** 128n - 1n);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Express should handle this before reaching our route handlers
    });

    test('should handle missing Content-Type', async () => {
      const validWallet = generateWalletAddress();
      
      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send(`walletAddress=${validWallet}&asset=ETH&amount=1.0`)
        .expect(400);

      // Should still validate and return validation errors
      expect(response.body.errors).toBeDefined();
    });

    test('should handle very large numbers', async () => {
      const validWallet = generateWalletAddress();
      const largeParams = {
        walletAddress: validWallet,
        asset: 'ETH',
        amount: '999999999999999999999999999999999999999'
      };

      (mockServices.portfolio.executeLendingOperation as jest.Mock).mockReturnValue(
        TE.left(new Error('Amount too large'))
      );

      const response = await request(app)
        .post('/api/portfolio/lending/supply')
        .send(largeParams)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Amount too large');
    });
  });

  describe('Functional Programming Patterns', () => {
    test('should demonstrate TaskEither chaining', async () => {
      const validWallet = generateWalletAddress();
      let executionOrder: string[] = [];

      // Mock service that logs execution order
      (mockServices.portfolio.getPortfolioData as jest.Mock).mockImplementation(() =>
        pipe(
          TE.of('step1'),
          TE.chainFirst(() => {
            executionOrder.push('data-fetched');
            return TE.of(undefined);
          }),
          TE.map(() => {
            executionOrder.push('data-transformed');
            return generatePortfolioSnapshot({ walletAddress: validWallet });
          })
        )
      );

      await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(executionOrder).toEqual(['data-fetched', 'data-transformed']);
    });

    test('should handle Either error paths correctly', async () => {
      const validWallet = generateWalletAddress();
      
      // Test left path
      (mockServices.portfolio.getPortfolioData as jest.Mock).mockReturnValue(
        TE.left(new Error('Network error'))
      );

      const errorResponse = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(errorResponse.body.success).toBe(false);

      // Test right path
      (mockServices.portfolio.getPortfolioData as jest.Mock).mockReturnValue(
        TE.right(generatePortfolioSnapshot())
      );

      const successResponse = await request(app)
        .get('/api/portfolio/data')
        .query({ walletAddress: validWallet })
        .expect(200);

      expect(successResponse.body.success).toBe(true);
    });
  });
});