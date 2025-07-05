/**
 * Blockchain Service Mocks // TODO: REMOVE_MOCK - Mock-related keywords
 * Functional mock implementations using Either/Option patterns // TODO: REMOVE_MOCK - Mock-related keywords
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { PortfolioSnapshot, LendingPosition, LiquidityPosition, TokenBalance } from '@/types/portfolio';
import { generatePortfolioSnapshot, generateTokenBalance, generateLendingPosition, generateLiquidityPosition } from '@/test-utils';

// ===================== Error Types =====================

export type BlockchainError = 
  | { type: 'NetworkError'; message: string }
  | { type: 'InvalidAddress'; address: string }
  | { type: 'ContractError'; contractAddress: string; reason: string }
  | { type: 'RateLimitError'; retryAfter: number }
  | { type: 'InsufficientData'; requested: string }
  | { type: 'TimeoutError'; operation: string };

export const createNetworkError = (message: string): BlockchainError => ({
  type: 'NetworkError',
  message
});

export const createInvalidAddressError = (address: string): BlockchainError => ({
  type: 'InvalidAddress',
  address
});

export const createContractError = (contractAddress: string, reason: string): BlockchainError => ({
  type: 'ContractError',
  contractAddress,
  reason
});

export const createRateLimitError = (retryAfter: number): BlockchainError => ({
  type: 'RateLimitError',
  retryAfter
});

export const createInsufficientDataError = (requested: string): BlockchainError => ({
  type: 'InsufficientData',
  requested
});

export const createTimeoutError = (operation: string): BlockchainError => ({
  type: 'TimeoutError',
  operation
});

// ===================== Mock State Management ===================== // TODO: REMOVE_MOCK - Mock-related keywords

interface MockBlockchainState { // TODO: REMOVE_MOCK - Mock-related keywords
  readonly portfolios: ReadonlyMap<string, PortfolioSnapshot>;
  readonly tokenBalances: ReadonlyMap<string, ReadonlyArray<TokenBalance>>;
  readonly lendingPositions: ReadonlyMap<string, ReadonlyArray<LendingPosition>>;
  readonly liquidityPositions: ReadonlyMap<string, ReadonlyArray<LiquidityPosition>>;
  readonly networkDelay: number;
  readonly failureRate: number;
  readonly shouldSimulateRateLimit: boolean;
  readonly shouldSimulateTimeout: boolean;
}

let mockState: MockBlockchainState = { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  portfolios: new Map(),
  tokenBalances: new Map(),
  lendingPositions: new Map(),
  liquidityPositions: new Map(),
  networkDelay: 100,
  failureRate: 0,
  shouldSimulateRateLimit: false,
  shouldSimulateTimeout: false
};

// ===================== State Management Functions =====================

export const setMockPortfolio = (walletAddress: string, portfolio: PortfolioSnapshot): void => { // TODO: REMOVE_MOCK - Mock-related keywords
  mockState = { // TODO: REMOVE_MOCK - Mock-related keywords
    ...mockState, // TODO: REMOVE_MOCK - Mock-related keywords
    portfolios: new Map(mockState.portfolios).set(walletAddress, portfolio), // TODO: REMOVE_MOCK - Mock-related keywords
    tokenBalances: new Map(mockState.tokenBalances).set(walletAddress, portfolio.tokenBalances), // TODO: REMOVE_MOCK - Mock-related keywords
    lendingPositions: new Map(mockState.lendingPositions).set(walletAddress, portfolio.lendingPositions), // TODO: REMOVE_MOCK - Mock-related keywords
    liquidityPositions: new Map(mockState.liquidityPositions).set(walletAddress, portfolio.liquidityPositions) // TODO: REMOVE_MOCK - Mock-related keywords
  };
};

export const setNetworkDelay = (delay: number): void => {
  mockState = { ...mockState, networkDelay: delay }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const setFailureRate = (rate: number): void => {
  mockState = { ...mockState, failureRate: Math.max(0, Math.min(1, rate)) }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const simulateRateLimit = (enable: boolean): void => {
  mockState = { ...mockState, shouldSimulateRateLimit: enable }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const simulateTimeout = (enable: boolean): void => {
  mockState = { ...mockState, shouldSimulateTimeout: enable }; // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
};

export const resetMockState = (): void => { // TODO: REMOVE_MOCK - Mock-related keywords
  mockState = { // TODO: REMOVE_MOCK - Mock-related keywords
    portfolios: new Map(),
    tokenBalances: new Map(),
    lendingPositions: new Map(),
    liquidityPositions: new Map(),
    networkDelay: 100,
    failureRate: 0,
    shouldSimulateRateLimit: false,
    shouldSimulateTimeout: false
  };
};

// ===================== Validation Functions =====================

const isValidAddress = (address: string): boolean => 
  /^0x[a-fA-F0-9]{40}$/.test(address);

const validateAddress = (address: string): E.Either<BlockchainError, string> =>
  isValidAddress(address) 
    ? E.right(address)
    : E.left(createInvalidAddressError(address));

// ===================== Network Simulation =====================

const simulateNetworkCall = <T>(operation: () => T): TE.TaskEither<BlockchainError, T> =>
  TE.tryCatch(
    async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, mockState.networkDelay)); // TODO: REMOVE_MOCK - Mock-related keywords
      
      // Simulate timeout
      if (mockState.shouldSimulateTimeout) { // TODO: REMOVE_MOCK - Mock-related keywords
        throw new Error('Request timeout');
      }
      
      // Simulate rate limiting
      if (mockState.shouldSimulateRateLimit) { // TODO: REMOVE_MOCK - Mock-related keywords
        throw new Error('Rate limit exceeded');
      }
      
      // Simulate random failures
      if (Math.random() < mockState.failureRate) { // TODO: REMOVE_MOCK - Random value generation // TODO: REMOVE_MOCK - Mock-related keywords
        throw new Error('Random network failure');
      }
      
      return operation();
    },
    (error): BlockchainError => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('timeout')) {
        return createTimeoutError('blockchain operation');
      }
      
      if (errorMessage.includes('rate limit')) {
        return createRateLimitError(60000); // 1 minute retry
      }
      
      return createNetworkError(errorMessage);
    }
  );

// ===================== Mock Blockchain Service ===================== // TODO: REMOVE_MOCK - Mock-related keywords

export const mockGetTokenBalances = (walletAddress: string): TE.TaskEither<BlockchainError, ReadonlyArray<TokenBalance>> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateAddress(walletAddress),
    E.fold(
      error => TE.left(error),
      address => simulateNetworkCall(() => {
        const balances = mockState.tokenBalances.get(address); // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (!balances) {
          // Generate default balances if none set
          return [
            generateTokenBalance({ symbol: 'ETH', valueUSD: 5000 }),
            generateTokenBalance({ symbol: 'USDC', valueUSD: 3000 }),
            generateTokenBalance({ symbol: 'USDT', valueUSD: 2000 })
          ];
        }
        
        return balances;
      })
    )
  );

export const mockGetLendingPositions = (walletAddress: string): TE.TaskEither<BlockchainError, ReadonlyArray<LendingPosition>> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateAddress(walletAddress),
    E.fold(
      error => TE.left(error),
      address => simulateNetworkCall(() => {
        const positions = mockState.lendingPositions.get(address); // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (!positions) {
          // Generate default positions if none set
          return [
            generateLendingPosition({ 
              platform: 'Aave',
              tokenSymbol: 'ETH', 
              suppliedUSD: 4000,
              borrowedUSD: 1000,
              healthFactor: 4.0
            }),
            generateLendingPosition({ 
              platform: 'Compound',
              tokenSymbol: 'USDC', 
              suppliedUSD: 2000,
              borrowedUSD: 0,
              healthFactor: Number.MAX_SAFE_INTEGER
            })
          ];
        }
        
        return positions;
      })
    )
  );

export const mockGetLiquidityPositions = (walletAddress: string): TE.TaskEither<BlockchainError, ReadonlyArray<LiquidityPosition>> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateAddress(walletAddress),
    E.fold(
      error => TE.left(error),
      address => simulateNetworkCall(() => {
        const positions = mockState.liquidityPositions.get(address); // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (!positions) {
          // Generate default positions if none set
          return [
            generateLiquidityPosition({
              platform: 'Uniswap',
              token0Symbol: 'ETH',
              token1Symbol: 'USDC',
              valueUSD: 3000,
              apy: 15.5
            }),
            generateLiquidityPosition({
              platform: 'SushiSwap',
              token0Symbol: 'USDC',
              token1Symbol: 'USDT',
              valueUSD: 1500,
              apy: 8.2
            })
          ];
        }
        
        return positions;
      })
    )
  );

export const mockGetPortfolioSnapshot = (walletAddress: string): TE.TaskEither<BlockchainError, PortfolioSnapshot> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateAddress(walletAddress),
    E.fold(
      error => TE.left(error),
      address => simulateNetworkCall(() => {
        const portfolio = mockState.portfolios.get(address); // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (portfolio) {
          return portfolio;
        }
        
        // Generate portfolio from individual components if available
        const tokenBalances = mockState.tokenBalances.get(address) || []; // TODO: REMOVE_MOCK - Mock-related keywords
        const lendingPositions = mockState.lendingPositions.get(address) || []; // TODO: REMOVE_MOCK - Mock-related keywords
        const liquidityPositions = mockState.liquidityPositions.get(address) || []; // TODO: REMOVE_MOCK - Mock-related keywords
        
        if (tokenBalances.length === 0 && lendingPositions.length === 0 && liquidityPositions.length === 0) {
          return generatePortfolioSnapshot({ walletAddress: address });
        }
        
        // Calculate totals from positions
        const totalSuppliedUSD = lendingPositions.reduce((sum, pos) => sum + pos.suppliedUSD, 0);
        const totalBorrowedUSD = lendingPositions.reduce((sum, pos) => sum + pos.borrowedUSD, 0);
        const totalLiquidityUSD = liquidityPositions.reduce((sum, pos) => sum + pos.valueUSD, 0);
        const totalValueUSD = totalSuppliedUSD + totalLiquidityUSD;
        const netWorth = totalValueUSD - totalBorrowedUSD;
        const healthFactor = totalBorrowedUSD > 0 ? totalSuppliedUSD / totalBorrowedUSD : Number.MAX_SAFE_INTEGER;
        
        return {
          walletAddress: address,
          totalValueUSD,
          totalSuppliedUSD,
          totalBorrowedUSD,
          totalLiquidityUSD,
          netWorth,
          healthFactor,
          lendingPositions,
          liquidityPositions,
          tokenBalances,
          timestamp: new Date().toISOString()
        };
      })
    )
  );

export const mockGetTokenPrice = (tokenAddress: string): TE.TaskEither<BlockchainError, number> => // TODO: REMOVE_MOCK - Mock-related keywords
  pipe(
    validateAddress(tokenAddress),
    E.fold(
      error => TE.left(error),
      address => simulateNetworkCall(() => {
        // Mock token prices // TODO: REMOVE_MOCK - Mock-related keywords
        const mockPrices: Record<string, number> = { // TODO: REMOVE_MOCK - Mock-related keywords
          '0x0000000000000000000000000000000000000000': 2500, // ETH
          '0xa0b86991c31e31c31e31c31e31c31e31c31e31c31': 1.0,  // USDC
          '0xdac17f958d2ee523a2206206994597c13d831ec7': 1.0,  // USDT
          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 45000 // WBTC
        };
        
        return mockPrices[address] || 100; // Default price // TODO: REMOVE_MOCK - Mock-related keywords
      })
    )
  );

export const mockGetBlockNumber = (): TE.TaskEither<BlockchainError, number> => // TODO: REMOVE_MOCK - Mock-related keywords
  simulateNetworkCall(() => Math.floor(Date.now() / 1000) + 18000000);

export const mockGetGasPrice = (): TE.TaskEither<BlockchainError, bigint> => // TODO: REMOVE_MOCK - Mock-related keywords
  simulateNetworkCall(() => BigInt(Math.floor(Math.random() * 50 + 10) * 1e9)); // 10-60 gwei // TODO: REMOVE_MOCK - Random value generation

// ===================== Batch Operations =====================

export const mockBatchGetTokenBalances = ( // TODO: REMOVE_MOCK - Mock-related keywords
  walletAddresses: ReadonlyArray<string>
): TE.TaskEither<BlockchainError, ReadonlyMap<string, ReadonlyArray<TokenBalance>>> =>
  pipe(
    walletAddresses,
    TE.traverseArray(address => 
      pipe(
        mockGetTokenBalances(address), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.map(balances => [address, balances] as const)
      )
    ),
    TE.map(entries => new Map(entries))
  );

export const mockBatchGetPortfolioSnapshots = ( // TODO: REMOVE_MOCK - Mock-related keywords
  walletAddresses: ReadonlyArray<string>
): TE.TaskEither<BlockchainError, ReadonlyMap<string, PortfolioSnapshot>> =>
  pipe(
    walletAddresses,
    TE.traverseArray(address => 
      pipe(
        mockGetPortfolioSnapshot(address), // TODO: REMOVE_MOCK - Mock-related keywords
        TE.map(snapshot => [address, snapshot] as const)
      )
    ),
    TE.map(entries => new Map(entries))
  );

// ===================== Test Scenarios =====================

export const createHighRiskScenario = (walletAddress: string): void => {
  const highRiskPortfolio = generatePortfolioSnapshot({
    walletAddress,
    totalSuppliedUSD: 10000,
    totalBorrowedUSD: 9000,
    healthFactor: 1.11, // Just above liquidation threshold
    lendingPositions: [
      generateLendingPosition({
        tokenSymbol: 'ETH',
        suppliedUSD: 10000,
        borrowedUSD: 9000,
        healthFactor: 1.11
      })
    ]
  });
  
  setMockPortfolio(walletAddress, highRiskPortfolio); // TODO: REMOVE_MOCK - Mock-related keywords
};

export const createConcentratedPortfolioScenario = (walletAddress: string): void => {
  const concentratedPortfolio = generatePortfolioSnapshot({
    walletAddress,
    lendingPositions: [
      generateLendingPosition({
        tokenSymbol: 'RISKY_TOKEN',
        suppliedUSD: 18000, // 90% concentration
        valueUSD: 18000
      }),
      generateLendingPosition({
        tokenSymbol: 'SAFE_TOKEN',
        suppliedUSD: 2000,
        valueUSD: 2000
      })
    ]
  });
  
  setMockPortfolio(walletAddress, concentratedPortfolio); // TODO: REMOVE_MOCK - Mock-related keywords
};

export const createEmptyPortfolioScenario = (walletAddress: string): void => {
  const emptyPortfolio = generatePortfolioSnapshot({
    walletAddress,
    totalValueUSD: 0,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    totalLiquidityUSD: 0,
    netWorth: 0,
    lendingPositions: [],
    liquidityPositions: [],
    tokenBalances: []
  });
  
  setMockPortfolio(walletAddress, emptyPortfolio); // TODO: REMOVE_MOCK - Mock-related keywords
};

// ===================== Export Mock Service ===================== // TODO: REMOVE_MOCK - Mock-related keywords

export const mockBlockchainService = { // TODO: REMOVE_MOCK - Mock-related keywords
  getTokenBalances: mockGetTokenBalances, // TODO: REMOVE_MOCK - Mock-related keywords
  getLendingPositions: mockGetLendingPositions, // TODO: REMOVE_MOCK - Mock-related keywords
  getLiquidityPositions: mockGetLiquidityPositions, // TODO: REMOVE_MOCK - Mock-related keywords
  getPortfolioSnapshot: mockGetPortfolioSnapshot, // TODO: REMOVE_MOCK - Mock-related keywords
  getTokenPrice: mockGetTokenPrice, // TODO: REMOVE_MOCK - Mock-related keywords
  getBlockNumber: mockGetBlockNumber, // TODO: REMOVE_MOCK - Mock-related keywords
  getGasPrice: mockGetGasPrice, // TODO: REMOVE_MOCK - Mock-related keywords
  batchGetTokenBalances: mockBatchGetTokenBalances, // TODO: REMOVE_MOCK - Mock-related keywords
  batchGetPortfolioSnapshots: mockBatchGetPortfolioSnapshots // TODO: REMOVE_MOCK - Mock-related keywords
};