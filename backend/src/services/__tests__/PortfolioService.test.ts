/**
 * Comprehensive unit tests for PortfolioService
 * Testing all core functionality with >85% coverage
 */

import { PortfolioService } from '../PortfolioService';
import { PortfolioState } from '../../state/PortfolioState';
import { PositionTracker } from '../../tracking/PositionTracker';
import { PortfolioAnalytics } from '../../analytics/PortfolioAnalytics';
import { PortfolioCacheManager } from '../../caching/PortfolioCacheManager';
import { SocketService } from '../SocketService';
import { 
  createMockLendingPosition,
  createMockLiquidityPosition,
  createMockTokenBalance,
  createMockYeiFinanceAdapter,
  createMockDragonSwapAdapter,
  setupBlockchainMocks,
  resetBlockchainMocks,
  simulateBlockchainError
} from '../../../tests/mocks/blockchain';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Mock dependencies
jest.mock('../../state/PortfolioState');
jest.mock('../../tracking/PositionTracker');
jest.mock('../../analytics/PortfolioAnalytics');
jest.mock('../../caching/PortfolioCacheManager');
jest.mock('../SocketService');
jest.mock('../../adapters/YeiFinanceAdapter');
jest.mock('../../adapters/DragonSwapAdapter');

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  let mockPortfolioState: jest.Mocked<PortfolioState>;
  let mockPositionTracker: jest.Mocked<PositionTracker>;
  let mockAnalytics: jest.Mocked<PortfolioAnalytics>;
  let mockCacheManager: jest.Mocked<PortfolioCacheManager>;
  let mockSocketService: jest.Mocked<SocketService>;
  let mockYeiAdapter: any;
  let mockDragonAdapter: any;

  const MOCK_WALLET = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetBlockchainMocks();

    // Create mock instances
    mockPortfolioState = {
      getSnapshot: jest.fn(),
      updateSnapshot: jest.fn(),
      getMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      getPerformance: jest.fn(),
      addPosition: jest.fn(),
      removePosition: jest.fn(),
      updatePosition: jest.fn(),
      setHealthFactor: jest.fn(),
      getHealthFactor: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    } as any;

    mockPositionTracker = {
      trackPosition: jest.fn(),
      removePosition: jest.fn(),
      updatePosition: jest.fn(),
      getPositions: jest.fn(),
      getPositionHistory: jest.fn(),
      calculatePnL: jest.fn(),
      getPerformanceMetrics: jest.fn()
    } as any;

    mockAnalytics = {
      calculateMetrics: jest.fn(),
      calculatePerformance: jest.fn(),
      calculateRiskMetrics: jest.fn(),
      generateInsights: jest.fn(),
      comparePositions: jest.fn(),
      analyzePortfolioHealth: jest.fn()
    } as any;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
      flushAll: jest.fn()
    } as any;

    mockSocketService = {
      emitPortfolioUpdate: jest.fn(),
      emitPositionUpdate: jest.fn(),
      emitHealthUpdate: jest.fn(),
      emitError: jest.fn()
    } as any;

    // Create mock adapters
    mockYeiAdapter = createMockYeiFinanceAdapter();
    mockDragonAdapter = createMockDragonSwapAdapter();

    // Mock adapter creation functions
    jest.doMock('../../adapters/YeiFinanceAdapter', () => ({
      createYeiFinanceAdapter: jest.fn().mockReturnValue(TE.right(mockYeiAdapter))
    }));

    jest.doMock('../../adapters/DragonSwapAdapter', () => ({
      createDragonSwapAdapter: jest.fn().mockReturnValue(TE.right(mockDragonAdapter))
    }));

    // Create PortfolioService instance
    portfolioService = new PortfolioService();
    
    // Inject mocks (using reflection for private properties)
    (portfolioService as any).portfolioState = mockPortfolioState;
    (portfolioService as any).positionTracker = mockPositionTracker;
    (portfolioService as any).analytics = mockAnalytics;
    (portfolioService as any).cacheManager = mockCacheManager;
    (portfolioService as any).socketService = mockSocketService;
    (portfolioService as any).yeiAdapter = mockYeiAdapter;
    (portfolioService as any).dragonAdapter = mockDragonAdapter;
    (portfolioService as any).isInitialized = true;
  });

  describe('Initialization', () => {
    it('should initialize successfully with all adapters', async () => {
      const freshService = new PortfolioService();
      
      const result = await pipe(
        freshService.initialize(),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockYeiAdapter.initialize).toHaveBeenCalled();
      expect(mockDragonAdapter.initialize).toHaveBeenCalled();
    });

    it('should handle adapter initialization failure', async () => {
      mockYeiAdapter.initialize.mockReturnValue(TE.left(new Error('YeiFinance init failed')));
      
      const freshService = new PortfolioService();
      const result = await pipe(
        freshService.initialize(),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('YeiFinance init failed');
    });
  });

  describe('Portfolio Data Retrieval', () => {
    const mockSnapshot = {
      walletAddress: MOCK_WALLET,
      timestamp: '2024-01-01T00:00:00Z',
      totalValueUSD: 10000,
      totalSuppliedUSD: 8000,
      totalBorrowedUSD: 2000,
      totalLiquidityUSD: 4000,
      netWorth: 8000,
      healthFactor: 2.5,
      lendingPositions: [createMockLendingPosition()],
      liquidityPositions: [createMockLiquidityPosition()],
      tokenBalances: [createMockTokenBalance()]
    };

    beforeEach(() => {
      mockPortfolioState.getSnapshot.mockReturnValue(mockSnapshot);
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.right([createMockLendingPosition()]));
      mockDragonAdapter.getPositions.mockReturnValue(TE.right([createMockLiquidityPosition()]));
      mockYeiAdapter.getHealthFactor.mockReturnValue(TE.right(2.5));
    });

    it('should get portfolio data successfully', async () => {
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSnapshot);
      expect(mockPortfolioState.getSnapshot).toHaveBeenCalledWith(MOCK_WALLET);
    });

    it('should refresh portfolio data when forceRefresh is true', async () => {
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockYeiAdapter.getUserPositions).toHaveBeenCalledWith(MOCK_WALLET);
      expect(mockDragonAdapter.getPositions).toHaveBeenCalledWith(MOCK_WALLET);
      expect(mockPortfolioState.updateSnapshot).toHaveBeenCalled();
    });

    it('should handle wallet validation errors', async () => {
      const invalidWallet = 'invalid-wallet-address';
      
      const result = await pipe(
        portfolioService.getPortfolioData(invalidWallet),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid wallet address');
    });

    it('should handle adapter errors gracefully', async () => {
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.left(new Error('Network error')));
      
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Portfolio Summary', () => {
    const mockSummary = {
      totalValue: 10000,
      totalSupplied: 8000,
      totalBorrowed: 2000,
      totalLiquidity: 4000,
      healthFactor: 2.5,
      apy: {
        lending: 5.5,
        liquidity: 12.5,
        weighted: 8.2
      },
      positions: {
        lending: 2,
        liquidity: 1,
        total: 3
      }
    };

    beforeEach(() => {
      mockAnalytics.calculateMetrics.mockReturnValue(TE.right({
        totalValueUSD: mockSummary.totalValue,
        totalSuppliedUSD: mockSummary.totalSupplied,
        totalBorrowedUSD: mockSummary.totalBorrowed,
        totalLiquidityUSD: mockSummary.totalLiquidity,
        healthFactor: mockSummary.healthFactor,
        averageAPY: mockSummary.apy.weighted,
        positionCount: mockSummary.positions.total
      } as any));
    });

    it('should calculate portfolio summary correctly', async () => {
      const result = await pipe(
        portfolioService.getPortfolioSummary(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (summary) => Promise.resolve({ success: true, summary })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.summary).toMatchObject({
        totalValue: mockSummary.totalValue,
        totalSupplied: mockSummary.totalSupplied,
        totalBorrowed: mockSummary.totalBorrowed,
        healthFactor: mockSummary.healthFactor
      });
    });

    it('should handle empty portfolio', async () => {
      mockAnalytics.calculateMetrics.mockReturnValue(TE.right({
        totalValueUSD: 0,
        totalSuppliedUSD: 0,
        totalBorrowedUSD: 0,
        totalLiquidityUSD: 0,
        healthFactor: 0,
        averageAPY: 0,
        positionCount: 0
      } as any));

      const result = await pipe(
        portfolioService.getPortfolioSummary(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (summary) => Promise.resolve({ success: true, summary })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.summary.totalValue).toBe(0);
      expect(result.summary.positions.total).toBe(0);
    });
  });

  describe('Position Management', () => {
    it('should add lending position successfully', async () => {
      const position = createMockLendingPosition();
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined));

      const result = await pipe(
        portfolioService.addPosition(MOCK_WALLET, position),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.addPosition).toHaveBeenCalledWith(MOCK_WALLET, position);
      expect(mockPositionTracker.trackPosition).toHaveBeenCalledWith(position);
      expect(mockSocketService.emitPositionUpdate).toHaveBeenCalled();
    });

    it('should update position successfully', async () => {
      const position = createMockLendingPosition();
      mockPositionTracker.updatePosition.mockReturnValue(TE.right(undefined));

      const result = await pipe(
        portfolioService.updatePosition(MOCK_WALLET, position),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.updatePosition).toHaveBeenCalledWith(MOCK_WALLET, position);
      expect(mockPositionTracker.updatePosition).toHaveBeenCalledWith(position);
    });

    it('should remove position successfully', async () => {
      const positionId = 'test-position-id';
      mockPositionTracker.removePosition.mockReturnValue(TE.right(undefined));

      const result = await pipe(
        portfolioService.removePosition(MOCK_WALLET, positionId),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.removePosition).toHaveBeenCalledWith(MOCK_WALLET, positionId);
      expect(mockPositionTracker.removePosition).toHaveBeenCalledWith(positionId);
    });
  });

  describe('Analytics and Performance', () => {
    const mockPerformance = {
      totalReturn: 1500,
      totalReturnPercent: 15.0,
      unrealizedPnL: 1200,
      realizedPnL: 300,
      period: '30d',
      benchmark: {
        totalReturn: 800,
        totalReturnPercent: 8.0
      }
    };

    beforeEach(() => {
      mockAnalytics.calculatePerformance.mockReturnValue(TE.right(mockPerformance as any));
    });

    it('should calculate performance metrics', async () => {
      const result = await pipe(
        portfolioService.getPerformance(MOCK_WALLET, '30d'),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (performance) => Promise.resolve({ success: true, performance })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.performance).toEqual(mockPerformance);
      expect(mockAnalytics.calculatePerformance).toHaveBeenCalledWith(MOCK_WALLET, '30d');
    });

    it('should handle different time periods', async () => {
      const periods = ['1d', '7d', '30d', '90d', '1y'];
      
      for (const period of periods) {
        await pipe(
          portfolioService.getPerformance(MOCK_WALLET, period),
          TE.fold(
            () => Promise.resolve(),
            () => Promise.resolve()
          )
        )();

        expect(mockAnalytics.calculatePerformance).toHaveBeenCalledWith(MOCK_WALLET, period);
      }
    });
  });

  describe('Risk Management', () => {
    const mockRiskMetrics = {
      healthFactor: 2.5,
      liquidationRisk: 'low',
      utilizationRatio: 0.25,
      debtRatio: 0.2,
      concentrationRisk: 'medium',
      positionSizes: {
        largest: 0.4,
        average: 0.15
      }
    };

    beforeEach(() => {
      mockAnalytics.calculateRiskMetrics.mockReturnValue(TE.right(mockRiskMetrics as any));
    });

    it('should calculate risk metrics correctly', async () => {
      const result = await pipe(
        portfolioService.getRiskMetrics(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (metrics) => Promise.resolve({ success: true, metrics })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.metrics).toEqual(mockRiskMetrics);
    });

    it('should identify high-risk scenarios', async () => {
      const highRiskMetrics = {
        ...mockRiskMetrics,
        healthFactor: 1.1,
        liquidationRisk: 'high',
        utilizationRatio: 0.9
      };

      mockAnalytics.calculateRiskMetrics.mockReturnValue(TE.right(highRiskMetrics as any));

      const result = await pipe(
        portfolioService.getRiskMetrics(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (metrics) => Promise.resolve({ success: true, metrics })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.metrics.liquidationRisk).toBe('high');
      expect(result.metrics.healthFactor).toBe(1.1);
    });
  });

  describe('Caching', () => {
    it('should use cached data when available', async () => {
      const cachedData = { 
        walletAddress: MOCK_WALLET,
        timestamp: new Date().toISOString(),
        totalValueUSD: 10000
      };
      
      mockCacheManager.get.mockReturnValue(TE.right(cachedData));

      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`portfolio:${MOCK_WALLET}`);
    });

    it('should invalidate cache on position changes', async () => {
      const position = createMockLendingPosition();
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined));

      await pipe(
        portfolioService.addPosition(MOCK_WALLET, position),
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockCacheManager.invalidate).toHaveBeenCalledWith(`portfolio:${MOCK_WALLET}`);
    });
  });

  describe('WebSocket Events', () => {
    it('should emit portfolio updates', async () => {
      const position = createMockLendingPosition();
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined));

      await pipe(
        portfolioService.addPosition(MOCK_WALLET, position),
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockSocketService.emitPositionUpdate).toHaveBeenCalledWith(MOCK_WALLET, position);
    });

    it('should emit health factor warnings', async () => {
      const lowHealthFactor = 1.1;
      mockYeiAdapter.getHealthFactor.mockReturnValue(TE.right(lowHealthFactor));

      await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true),
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockSocketService.emitHealthUpdate).toHaveBeenCalledWith(MOCK_WALLET, lowHealthFactor);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      simulateBlockchainError('getBalance', new Error('Network timeout'));
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.left(new Error('Network timeout')));

      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle invalid input parameters', async () => {
      const result = await pipe(
        portfolioService.getPortfolioData(''),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid wallet address');
    });

    it('should handle service initialization errors', async () => {
      const uninitializedService = new PortfolioService();
      
      const result = await pipe(
        uninitializedService.getPortfolioData(MOCK_WALLET),
        TE.fold(
          (error) => Promise.resolve({ success: false, error: error.message }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await portfolioService.cleanup();
      
      expect(mockCacheManager.flushAll).toHaveBeenCalled();
      // Add more cleanup assertions as needed
    });
  });
});