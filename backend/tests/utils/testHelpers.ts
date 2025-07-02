/**
 * Test utilities and helper functions
 */

import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { PortfolioSnapshot, LendingPosition, LiquidityPosition, TokenBalance } from '../../src/types/portfolio';

// Test data generators
export class TestDataGenerator {
  private static counter = 0;
  
  static getUniqueId(): string {
    return `test-${Date.now()}-${++this.counter}`;
  }
  
  static createWalletAddress(): string {
    return `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`;
  }
  
  static createTokenAddress(): string {
    return `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`;
  }
  
  static createPortfolioSnapshot(walletAddress?: string): PortfolioSnapshot {
    const wallet = walletAddress || this.createWalletAddress();
    const lendingPositions = [
      this.createLendingPosition({ walletAddress: wallet, type: 'supply' }),
      this.createLendingPosition({ walletAddress: wallet, type: 'borrow' })
    ];
    const liquidityPositions = [
      this.createLiquidityPosition({ walletAddress: wallet })
    ];
    const tokenBalances = [
      this.createTokenBalance({ symbol: 'SEI' }),
      this.createTokenBalance({ symbol: 'USDC' })
    ];
    
    const totalSuppliedUSD = lendingPositions
      .filter(p => p.type === 'supply')
      .reduce((sum, p) => sum + p.valueUSD, 0);
    
    const totalBorrowedUSD = lendingPositions
      .filter(p => p.type === 'borrow')
      .reduce((sum, p) => sum + p.valueUSD, 0);
    
    const totalLiquidityUSD = liquidityPositions
      .reduce((sum, p) => sum + p.valueUSD, 0);
    
    const totalValueUSD = totalSuppliedUSD + totalLiquidityUSD + 
      tokenBalances.reduce((sum, b) => sum + b.valueUSD, 0);
    
    return {
      walletAddress: wallet,
      totalValueUSD,
      totalSuppliedUSD,
      totalBorrowedUSD,
      totalLiquidityUSD,
      netWorth: totalValueUSD - totalBorrowedUSD,
      healthFactor: totalBorrowedUSD > 0 ? totalSuppliedUSD / totalBorrowedUSD : Infinity,
      lendingPositions,
      liquidityPositions,
      tokenBalances,
      timestamp: new Date().toISOString()
    };
  }
  
  static createLendingPosition(overrides?: Partial<LendingPosition>): LendingPosition {
    return {
      id: this.getUniqueId(),
      walletAddress: this.createWalletAddress(),
      platform: 'YeiFinance',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      type: 'supply',
      token: this.createTokenAddress(),
      tokenSymbol: 'USDC',
      amount: '1000000000000000000000',
      amountFormatted: '1000.0000',
      valueUSD: 1000,
      apy: 5.5,
      collateralFactor: 0.8,
      liquidationThreshold: 0.85,
      healthContribution: 800,
      ...overrides
    };
  }
  
  static createLiquidityPosition(overrides?: Partial<LiquidityPosition>): LiquidityPosition {
    return {
      id: this.getUniqueId(),
      walletAddress: this.createWalletAddress(),
      platform: 'DragonSwap',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      poolId: 'SEI-USDC-3000',
      token0: this.createTokenAddress(),
      token1: this.createTokenAddress(),
      token0Symbol: 'SEI',
      token1Symbol: 'USDC',
      liquidity: '1000000000000000000',
      token0Amount: '2000000000000000000000',
      token1Amount: '1000000000000000000000',
      valueUSD: 2000,
      feeApr: 12.5,
      totalApr: 15.2,
      uncollectedFees: {
        token0: '10000000000000000',
        token1: '5000000000000000',
        valueUSD: 7.5
      },
      priceRange: {
        lower: 0.4,
        upper: 0.6,
        current: 0.5
      },
      isInRange: true,
      ...overrides
    };
  }
  
  static createTokenBalance(overrides?: Partial<TokenBalance>): TokenBalance {
    return {
      token: this.createTokenAddress(),
      symbol: 'SEI',
      name: 'Sei',
      decimals: 18,
      balance: BigInt('5000000000000000000000'),
      balanceFormatted: '5000.0000',
      valueUSD: 2500,
      priceUSD: 0.5,
      change24h: 5.2,
      ...overrides
    };
  }
}

// TaskEither test utilities
export class TaskEitherTestUtils {
  /**
   * Execute a TaskEither and return the result
   */
  static async executeTE<E, A>(te: TE.TaskEither<E, A>): Promise<A> {
    const result = await te();
    if (result._tag === 'Left') {
      throw result.left;
    }
    return result.right;
  }
  
  /**
   * Execute a TaskEither and expect it to fail
   */
  static async expectTEToFail<E, A>(te: TE.TaskEither<E, A>): Promise<E> {
    const result = await te();
    if (result._tag === 'Right') {
      throw new Error('Expected TaskEither to fail but it succeeded');
    }
    return result.left;
  }
  
  /**
   * Create a successful TaskEither
   */
  static success<A>(value: A): TE.TaskEither<Error, A> {
    return TE.right(value);
  }
  
  /**
   * Create a failed TaskEither
   */
  static failure<A>(error: Error): TE.TaskEither<Error, A> {
    return TE.left(error);
  }
}

// Mock service factory
export class MockServiceFactory {
  static createMockPortfolioService() {
    return {
      initializeUser: jest.fn().mockReturnValue(TE.right(undefined)),
      getPortfolioData: jest.fn().mockReturnValue(TE.right(TestDataGenerator.createPortfolioSnapshot())),
      getPortfolioSummary: jest.fn().mockReturnValue(TE.right({
        totalValue: 10000,
        totalSupplied: 8000,
        totalBorrowed: 2000,
        totalLiquidity: 4000,
        healthFactor: 2.5,
        apy: { lending: 5.5, liquidity: 12.3, total: 8.5 }
      })),
      refreshPortfolio: jest.fn().mockReturnValue(TE.right(TestDataGenerator.createPortfolioSnapshot())),
      executeLendingOperation: jest.fn().mockReturnValue(TE.right({
        txHash: '0xabc123',
        newSnapshot: TestDataGenerator.createPortfolioSnapshot()
      })),
      executeLiquidityOperation: jest.fn().mockReturnValue(TE.right({
        txHash: '0xdef456',
        newSnapshot: TestDataGenerator.createPortfolioSnapshot()
      })),
      cleanupUser: jest.fn().mockReturnValue(TE.right(undefined))
    };
  }
  
  static createMockAIService() {
    return {
      processMessage: jest.fn().mockReturnValue(TE.right({
        message: 'I can help you with your portfolio.',
        suggestions: ['Show portfolio', 'Check positions'],
        confidence: 0.8
      })),
      generatePortfolioAnalysis: jest.fn().mockReturnValue(TE.right(
        'Your portfolio is well-balanced with good diversification.'
      )),
      getConversationHistory: jest.fn().mockReturnValue([]),
      clearConversationHistory: jest.fn().mockReturnValue(TE.right(undefined))
    };
  }
  
  static createMockSocketService() {
    return {
      addUserSocket: jest.fn(),
      removeUserSocket: jest.fn(),
      sendPortfolioUpdate: jest.fn().mockReturnValue(TE.right(undefined)),
      sendChatResponse: jest.fn().mockReturnValue(TE.right(undefined)),
      sendTransactionUpdate: jest.fn().mockReturnValue(TE.right(undefined)),
      sendError: jest.fn().mockReturnValue(TE.right(undefined)),
      isUserConnected: jest.fn().mockReturnValue(true),
      getUserSocketCount: jest.fn().mockReturnValue(1)
    };
  }
}

// Time utilities for testing
export class TimeUtils {
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static mockDate(dateString: string): jest.SpyInstance {
    const mockDate = new Date(dateString);
    return jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  }
  
  static restoreDate(spy: jest.SpyInstance): void {
    spy.mockRestore();
  }
}

// Error utilities for testing
export class ErrorUtils {
  static createNetworkError(): Error {
    return new Error('Network request failed');
  }
  
  static createValidationError(field: string): Error {
    return new Error(`Validation failed for field: ${field}`);
  }
  
  static createTransactionError(): Error {
    return new Error('Transaction execution failed');
  }
  
  static createTimeoutError(): Error {
    return new Error('Operation timed out');
  }
}

// Test assertion helpers
export class TestAssertions {
  static assertPortfolioSnapshot(snapshot: PortfolioSnapshot): void {
    expect(snapshot).toHaveProperty('walletAddress');
    expect(snapshot).toHaveProperty('totalValueUSD');
    expect(snapshot).toHaveProperty('lendingPositions');
    expect(snapshot).toHaveProperty('liquidityPositions');
    expect(snapshot).toHaveProperty('tokenBalances');
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot.healthFactor).toBeGreaterThan(0);
  }
  
  static assertLendingPosition(position: LendingPosition): void {
    expect(position).toHaveProperty('id');
    expect(position).toHaveProperty('type');
    expect(position).toHaveProperty('token');
    expect(position).toHaveProperty('amount');
    expect(position).toHaveProperty('valueUSD');
    expect(position.valueUSD).toBeGreaterThanOrEqual(0);
  }
  
  static assertTaskEitherSuccess<A>(result: any): result is { _tag: 'Right'; right: A } {
    expect(result._tag).toBe('Right');
    return result._tag === 'Right';
  }
  
  static assertTaskEitherFailure<E>(result: any): result is { _tag: 'Left'; left: E } {
    expect(result._tag).toBe('Left');
    return result._tag === 'Left';
  }
}

// Export all utilities
export {
  TestDataGenerator as DataGen,
  TaskEitherTestUtils as TEUtils,
  MockServiceFactory as MockServices,
  TimeUtils,
  ErrorUtils,
  TestAssertions as Assert
};