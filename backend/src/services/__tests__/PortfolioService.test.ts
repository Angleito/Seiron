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
  createMockLendingPosition, // TODO: REMOVE_MOCK - Mock-related keywords
  createMockLiquidityPosition, // TODO: REMOVE_MOCK - Mock-related keywords
  createMockTokenBalance, // TODO: REMOVE_MOCK - Mock-related keywords
  createMockYeiFinanceAdapter, // TODO: REMOVE_MOCK - Mock-related keywords
  createMockDragonSwapAdapter, // TODO: REMOVE_MOCK - Mock-related keywords
  setupBlockchainMocks, // TODO: REMOVE_MOCK - Mock-related keywords
  resetBlockchainMocks, // TODO: REMOVE_MOCK - Mock-related keywords
  simulateBlockchainError
} from '../../../tests/mocks/blockchain'; // TODO: REMOVE_MOCK - Mock-related keywords
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Mock dependencies // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../state/PortfolioState'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../tracking/PositionTracker'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../analytics/PortfolioAnalytics'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../caching/PortfolioCacheManager'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../SocketService'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../adapters/YeiFinanceAdapter'); // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../../adapters/DragonSwapAdapter'); // TODO: REMOVE_MOCK - Mock-related keywords

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  let mockPortfolioState: jest.Mocked<PortfolioState>; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  let mockPositionTracker: jest.Mocked<PositionTracker>; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  let mockAnalytics: jest.Mocked<PortfolioAnalytics>; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  let mockCacheManager: jest.Mocked<PortfolioCacheManager>; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  let mockSocketService: jest.Mocked<SocketService>; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  let mockYeiAdapter: any; // TODO: REMOVE_MOCK - Mock-related keywords
  let mockDragonAdapter: any; // TODO: REMOVE_MOCK - Mock-related keywords

  const MOCK_WALLET = '0x1234567890123456789012345678901234567890'; // TODO: REMOVE_MOCK - Mock-related keywords

  beforeEach(() => {
    // Reset all mocks // TODO: REMOVE_MOCK - Mock-related keywords
    jest.clearAllMocks(); // TODO: REMOVE_MOCK - Mock-related keywords
    resetBlockchainMocks(); // TODO: REMOVE_MOCK - Mock-related keywords

    // Create mock instances // TODO: REMOVE_MOCK - Mock-related keywords
    mockPortfolioState = { // TODO: REMOVE_MOCK - Mock-related keywords
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

    mockPositionTracker = { // TODO: REMOVE_MOCK - Mock-related keywords
      trackPosition: jest.fn(),
      removePosition: jest.fn(),
      updatePosition: jest.fn(),
      getPositions: jest.fn(),
      getPositionHistory: jest.fn(),
      calculatePnL: jest.fn(),
      getPerformanceMetrics: jest.fn()
    } as any;

    mockAnalytics = { // TODO: REMOVE_MOCK - Mock-related keywords
      calculateMetrics: jest.fn(),
      calculatePerformance: jest.fn(),
      calculateRiskMetrics: jest.fn(),
      generateInsights: jest.fn(),
      comparePositions: jest.fn(),
      analyzePortfolioHealth: jest.fn()
    } as any;

    mockCacheManager = { // TODO: REMOVE_MOCK - Mock-related keywords
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
      flushAll: jest.fn()
    } as any;

    mockSocketService = { // TODO: REMOVE_MOCK - Mock-related keywords
      emitPortfolioUpdate: jest.fn(),
      emitPositionUpdate: jest.fn(),
      emitHealthUpdate: jest.fn(),
      emitError: jest.fn()
    } as any;

    // Create mock adapters // TODO: REMOVE_MOCK - Mock-related keywords
    mockYeiAdapter = createMockYeiFinanceAdapter(); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    mockDragonAdapter = createMockDragonSwapAdapter(); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

    // Mock adapter creation functions // TODO: REMOVE_MOCK - Mock-related keywords
    jest.doMock('../../adapters/YeiFinanceAdapter', () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
      createYeiFinanceAdapter: jest.fn().mockReturnValue(TE.right(mockYeiAdapter)) // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    }));

    jest.doMock('../../adapters/DragonSwapAdapter', () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
      createDragonSwapAdapter: jest.fn().mockReturnValue(TE.right(mockDragonAdapter)) // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    }));

    // Create PortfolioService instance
    portfolioService = new PortfolioService();
    
    // Inject mocks (using reflection for private properties) // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).portfolioState = mockPortfolioState; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).positionTracker = mockPositionTracker; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).analytics = mockAnalytics; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).cacheManager = mockCacheManager; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).socketService = mockSocketService; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).yeiAdapter = mockYeiAdapter; // TODO: REMOVE_MOCK - Mock-related keywords
    (portfolioService as any).dragonAdapter = mockDragonAdapter; // TODO: REMOVE_MOCK - Mock-related keywords
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
      expect(mockYeiAdapter.initialize).toHaveBeenCalled(); // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockDragonAdapter.initialize).toHaveBeenCalled(); // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should handle adapter initialization failure', async () => {
      mockYeiAdapter.initialize.mockReturnValue(TE.left(new Error('YeiFinance init failed'))); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      
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
    const mockSnapshot = { // TODO: REMOVE_MOCK - Mock-related keywords
      walletAddress: MOCK_WALLET, // TODO: REMOVE_MOCK - Mock-related keywords
      timestamp: '2024-01-01T00:00:00Z',
      totalValueUSD: 10000,
      totalSuppliedUSD: 8000,
      totalBorrowedUSD: 2000,
      totalLiquidityUSD: 4000,
      netWorth: 8000,
      healthFactor: 2.5,
      lendingPositions: [createMockLendingPosition()], // TODO: REMOVE_MOCK - Mock-related keywords
      liquidityPositions: [createMockLiquidityPosition()], // TODO: REMOVE_MOCK - Mock-related keywords
      tokenBalances: [createMockTokenBalance()] // TODO: REMOVE_MOCK - Mock-related keywords
    };

    beforeEach(() => {
      mockPortfolioState.getSnapshot.mockReturnValue(mockSnapshot); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.right([createMockLendingPosition()])); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      mockDragonAdapter.getPositions.mockReturnValue(TE.right([createMockLiquidityPosition()])); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      mockYeiAdapter.getHealthFactor.mockReturnValue(TE.right(2.5)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should get portfolio data successfully', async () => {
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSnapshot); // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockPortfolioState.getSnapshot).toHaveBeenCalledWith(MOCK_WALLET); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should refresh portfolio data when forceRefresh is true', async () => {
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockYeiAdapter.getUserPositions).toHaveBeenCalledWith(MOCK_WALLET); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockDragonAdapter.getPositions).toHaveBeenCalledWith(MOCK_WALLET); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockPortfolioState.updateSnapshot).toHaveBeenCalled(); // TODO: REMOVE_MOCK - Mock-related keywords
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
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.left(new Error('Network error'))); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      
      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true), // TODO: REMOVE_MOCK - Mock-related keywords
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
    const mockSummary = { // TODO: REMOVE_MOCK - Mock-related keywords
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
      mockAnalytics.calculateMetrics.mockReturnValue(TE.right({ // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
        totalValueUSD: mockSummary.totalValue, // TODO: REMOVE_MOCK - Mock-related keywords
        totalSuppliedUSD: mockSummary.totalSupplied, // TODO: REMOVE_MOCK - Mock-related keywords
        totalBorrowedUSD: mockSummary.totalBorrowed, // TODO: REMOVE_MOCK - Mock-related keywords
        totalLiquidityUSD: mockSummary.totalLiquidity, // TODO: REMOVE_MOCK - Mock-related keywords
        healthFactor: mockSummary.healthFactor, // TODO: REMOVE_MOCK - Mock-related keywords
        averageAPY: mockSummary.apy.weighted, // TODO: REMOVE_MOCK - Mock-related keywords
        positionCount: mockSummary.positions.total // TODO: REMOVE_MOCK - Mock-related keywords
      } as any));
    });

    it('should calculate portfolio summary correctly', async () => {
      const result = await pipe(
        portfolioService.getPortfolioSummary(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (summary) => Promise.resolve({ success: true, summary })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.summary).toMatchObject({
        totalValue: mockSummary.totalValue, // TODO: REMOVE_MOCK - Mock-related keywords
        totalSupplied: mockSummary.totalSupplied, // TODO: REMOVE_MOCK - Mock-related keywords
        totalBorrowed: mockSummary.totalBorrowed, // TODO: REMOVE_MOCK - Mock-related keywords
        healthFactor: mockSummary.healthFactor // TODO: REMOVE_MOCK - Mock-related keywords
      });
    });

    it('should handle empty portfolio', async () => {
      mockAnalytics.calculateMetrics.mockReturnValue(TE.right({ // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
        totalValueUSD: 0,
        totalSuppliedUSD: 0,
        totalBorrowedUSD: 0,
        totalLiquidityUSD: 0,
        healthFactor: 0,
        averageAPY: 0,
        positionCount: 0
      } as any));

      const result = await pipe(
        portfolioService.getPortfolioSummary(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
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
      const position = createMockLendingPosition(); // TODO: REMOVE_MOCK - Mock-related keywords
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.addPosition(MOCK_WALLET, position), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.addPosition).toHaveBeenCalledWith(MOCK_WALLET, position); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockPositionTracker.trackPosition).toHaveBeenCalledWith(position); // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockSocketService.emitPositionUpdate).toHaveBeenCalled(); // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should update position successfully', async () => {
      const position = createMockLendingPosition(); // TODO: REMOVE_MOCK - Mock-related keywords
      mockPositionTracker.updatePosition.mockReturnValue(TE.right(undefined)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.updatePosition(MOCK_WALLET, position), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.updatePosition).toHaveBeenCalledWith(MOCK_WALLET, position); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockPositionTracker.updatePosition).toHaveBeenCalledWith(position); // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should remove position successfully', async () => {
      const positionId = 'test-position-id';
      mockPositionTracker.removePosition.mockReturnValue(TE.right(undefined)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.removePosition(MOCK_WALLET, positionId), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          () => Promise.resolve({ success: true })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockPortfolioState.removePosition).toHaveBeenCalledWith(MOCK_WALLET, positionId); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockPositionTracker.removePosition).toHaveBeenCalledWith(positionId); // TODO: REMOVE_MOCK - Mock-related keywords
    });
  });

  describe('Analytics and Performance', () => {
    const mockPerformance = { // TODO: REMOVE_MOCK - Mock-related keywords
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
      mockAnalytics.calculatePerformance.mockReturnValue(TE.right(mockPerformance as any)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should calculate performance metrics', async () => {
      const result = await pipe(
        portfolioService.getPerformance(MOCK_WALLET, '30d'), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (performance) => Promise.resolve({ success: true, performance })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.performance).toEqual(mockPerformance); // TODO: REMOVE_MOCK - Mock-related keywords
      expect(mockAnalytics.calculatePerformance).toHaveBeenCalledWith(MOCK_WALLET, '30d'); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should handle different time periods', async () => {
      const periods = ['1d', '7d', '30d', '90d', '1y']; // TODO: REMOVE_MOCK - Hard-coded array literals
      
      for (const period of periods) {
        await pipe(
          portfolioService.getPerformance(MOCK_WALLET, period), // TODO: REMOVE_MOCK - Mock-related keywords
          TE.fold(
            () => Promise.resolve(),
            () => Promise.resolve()
          )
        )();

        expect(mockAnalytics.calculatePerformance).toHaveBeenCalledWith(MOCK_WALLET, period); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      }
    });
  });

  describe('Risk Management', () => {
    const mockRiskMetrics = { // TODO: REMOVE_MOCK - Mock-related keywords
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
      mockAnalytics.calculateRiskMetrics.mockReturnValue(TE.right(mockRiskMetrics as any)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should calculate risk metrics correctly', async () => {
      const result = await pipe(
        portfolioService.getRiskMetrics(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (metrics) => Promise.resolve({ success: true, metrics })
        )
      )();

      expect(result.success).toBe(true);
      expect(result.metrics).toEqual(mockRiskMetrics); // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should identify high-risk scenarios', async () => {
      const highRiskMetrics = {
        ...mockRiskMetrics, // TODO: REMOVE_MOCK - Mock-related keywords
        healthFactor: 1.1,
        liquidationRisk: 'high',
        utilizationRatio: 0.9
      };

      mockAnalytics.calculateRiskMetrics.mockReturnValue(TE.right(highRiskMetrics as any)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.getRiskMetrics(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
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
        walletAddress: MOCK_WALLET, // TODO: REMOVE_MOCK - Mock-related keywords
        timestamp: new Date().toISOString(),
        totalValueUSD: 10000
      };
      
      mockCacheManager.get.mockReturnValue(TE.right(cachedData)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          (error) => Promise.resolve({ success: false, error }),
          (data) => Promise.resolve({ success: true, data })
        )
      )();

      expect(result.success).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`portfolio:${MOCK_WALLET}`); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should invalidate cache on position changes', async () => {
      const position = createMockLendingPosition(); // TODO: REMOVE_MOCK - Mock-related keywords
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      await pipe(
        portfolioService.addPosition(MOCK_WALLET, position), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockCacheManager.invalidate).toHaveBeenCalledWith(`portfolio:${MOCK_WALLET}`); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });
  });

  describe('WebSocket Events', () => {
    it('should emit portfolio updates', async () => {
      const position = createMockLendingPosition(); // TODO: REMOVE_MOCK - Mock-related keywords
      mockPositionTracker.trackPosition.mockReturnValue(TE.right(undefined)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      await pipe(
        portfolioService.addPosition(MOCK_WALLET, position), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockSocketService.emitPositionUpdate).toHaveBeenCalledWith(MOCK_WALLET, position); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });

    it('should emit health factor warnings', async () => {
      const lowHealthFactor = 1.1;
      mockYeiAdapter.getHealthFactor.mockReturnValue(TE.right(lowHealthFactor)); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.fold(
          () => Promise.resolve(),
          () => Promise.resolve()
        )
      )();

      expect(mockSocketService.emitHealthUpdate).toHaveBeenCalledWith(MOCK_WALLET, lowHealthFactor); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      simulateBlockchainError('getBalance', new Error('Network timeout'));
      mockYeiAdapter.getUserPositions.mockReturnValue(TE.left(new Error('Network timeout'))); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords

      const result = await pipe(
        portfolioService.getPortfolioData(MOCK_WALLET, true), // TODO: REMOVE_MOCK - Mock-related keywords
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
        uninitializedService.getPortfolioData(MOCK_WALLET), // TODO: REMOVE_MOCK - Mock-related keywords
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
      
      expect(mockCacheManager.flushAll).toHaveBeenCalled(); // TODO: REMOVE_MOCK - Mock-related keywords
      // Add more cleanup assertions as needed
    });
  });
});