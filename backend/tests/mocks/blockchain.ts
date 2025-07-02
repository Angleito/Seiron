/**
 * Mock blockchain interactions for testing
 */

import * as TE from 'fp-ts/TaskEither';
import { LendingPosition, LiquidityPosition, TokenBalance } from '../../src/types/portfolio';

// Mock blockchain client
export const mockBlockchainClient = {
  getBalance: jest.fn(),
  getBlockNumber: jest.fn(),
  readContract: jest.fn(),
  waitForTransactionReceipt: jest.fn(),
  getTransactionReceipt: jest.fn(),
  simulateContract: jest.fn(),
  writeContract: jest.fn()
};

// Mock wallet client
export const mockWalletClient = {
  account: {
    address: '0x1234567890123456789012345678901234567890'
  },
  writeContract: jest.fn(),
  signMessage: jest.fn(),
  sendTransaction: jest.fn()
};

// Mock transaction hash
export const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

// Mock contract addresses
export const MOCK_CONTRACTS = {
  YEI_POOL: '0x1111111111111111111111111111111111111111',
  DRAGON_SWAP_ROUTER: '0x2222222222222222222222222222222222222222',
  DRAGON_SWAP_FACTORY: '0x3333333333333333333333333333333333333333',
  USDC: '0x4444444444444444444444444444444444444444',
  SEI: '0x0000000000000000000000000000000000000000'
};

// Mock lending positions data
export const createMockLendingPosition = (overrides?: Partial<LendingPosition>): LendingPosition => ({
  id: 'lending-pos-1',
  walletAddress: '0x1234567890123456789012345678901234567890',
  platform: 'YeiFinance',
  createdAt: '2024-01-01T00:00:00Z',
  lastUpdated: '2024-01-01T00:00:00Z',
  type: 'supply',
  token: MOCK_CONTRACTS.USDC,
  tokenSymbol: 'USDC',
  amount: '1000000000000000000000',
  amountFormatted: '1000.0000',
  valueUSD: 1000,
  apy: 5.5,
  collateralFactor: 0.8,
  liquidationThreshold: 0.85,
  healthContribution: 800,
  ...overrides
});

// Mock liquidity positions data
export const createMockLiquidityPosition = (overrides?: Partial<LiquidityPosition>): LiquidityPosition => ({
  id: 'liquidity-pos-1',
  walletAddress: '0x1234567890123456789012345678901234567890',
  platform: 'DragonSwap',
  createdAt: '2024-01-01T00:00:00Z',
  lastUpdated: '2024-01-01T00:00:00Z',
  poolId: 'SEI-USDC-3000',
  token0: MOCK_CONTRACTS.SEI,
  token1: MOCK_CONTRACTS.USDC,
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
});

// Mock token balance data
export const createMockTokenBalance = (overrides?: Partial<TokenBalance>): TokenBalance => ({
  token: MOCK_CONTRACTS.SEI,
  symbol: 'SEI',
  name: 'Sei',
  decimals: 18,
  balance: BigInt('5000000000000000000000'),
  balanceFormatted: '5000.0000',
  valueUSD: 2500,
  priceUSD: 0.5,
  change24h: 5.2,
  ...overrides
});

// Mock YeiFinance adapter
export const createMockYeiFinanceAdapter = () => ({
  name: 'YeiFinance',
  version: '1.0.0',
  isInitialized: true,
  initialize: jest.fn().mockReturnValue(TE.right(undefined)),
  getUserPositions: jest.fn().mockReturnValue(
    TE.right([
      createMockLendingPosition(),
      createMockLendingPosition({ type: 'borrow', apy: 8.5, valueUSD: 500 })
    ])
  ),
  supply: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  withdraw: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  borrow: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  repay: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  getHealthFactor: jest.fn().mockReturnValue(TE.right(2.5))
});

// Mock DragonSwap adapter
export const createMockDragonSwapAdapter = () => ({
  name: 'DragonSwap',
  version: '2.0.0',
  isInitialized: true,
  initialize: jest.fn().mockReturnValue(TE.right(undefined)),
  getPositions: jest.fn().mockReturnValue(
    TE.right([createMockLiquidityPosition()])
  ),
  addLiquidity: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  removeLiquidity: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  collectFees: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)),
  getPoolInfo: jest.fn().mockReturnValue(
    TE.right({
      poolId: 'SEI-USDC-3000',
      token0: MOCK_CONTRACTS.SEI,
      token1: MOCK_CONTRACTS.USDC,
      fee: 3000,
      liquidity: '1000000000000000000000',
      tick: 123456,
      price: 0.5,
      apr: 15.2,
      volume24h: 100000,
      tvl: 500000
    })
  )
});

// Mock Redis cache
export const createMockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  setex: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  flushdb: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  status: 'ready'
});

// Mock blockchain responses
export const mockBlockchainResponses = {
  // Balance responses
  getBalance: {
    success: BigInt('5000000000000000000000'), // 5000 SEI
    failure: new Error('Failed to get balance')
  },
  
  // Contract read responses
  readContract: {
    healthFactor: BigInt('2500000000000000000'), // 2.5
    userAccountData: {
      totalCollateralETH: BigInt('10000000000000000000'), // 10 ETH
      totalDebtETH: BigInt('4000000000000000000'), // 4 ETH
      availableBorrowsETH: BigInt('4000000000000000000'), // 4 ETH
      currentLiquidationThreshold: 8500, // 85%
      ltv: 8000, // 80%
      healthFactor: BigInt('2500000000000000000') // 2.5
    },
    userReserveData: {
      currentATokenBalance: BigInt('1000000000000000000000'), // 1000 tokens
      currentStableDebt: BigInt('0'),
      currentVariableDebt: BigInt('500000000000000000000'), // 500 tokens
      principalStableDebt: BigInt('0'),
      scaledVariableDebt: BigInt('500000000000000000000'),
      stableBorrowRate: BigInt('0'),
      liquidityRate: BigInt('55000000000000000000000000'), // 5.5% APY
      variableBorrowRate: BigInt('85000000000000000000000000'), // 8.5% APY
      stableBorrowLastUpdateTimestamp: 0,
      usageAsCollateralEnabled: true
    }
  },
  
  // Transaction responses
  writeContract: {
    success: MOCK_TX_HASH,
    failure: new Error('Transaction failed')
  },
  
  // Transaction receipt
  getTransactionReceipt: {
    success: {
      transactionHash: MOCK_TX_HASH,
      status: 'success',
      blockNumber: 12345,
      gasUsed: BigInt('21000'),
      effectiveGasPrice: BigInt('20000000000')
    },
    failure: new Error('Transaction receipt not found')
  }
};

// Setup blockchain mocks
export const setupBlockchainMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Configure default mock behaviors
  mockBlockchainClient.getBalance.mockResolvedValue(mockBlockchainResponses.getBalance.success);
  mockBlockchainClient.getBlockNumber.mockResolvedValue(12345);
  mockBlockchainClient.readContract.mockResolvedValue(mockBlockchainResponses.readContract.userAccountData);
  mockBlockchainClient.getTransactionReceipt.mockResolvedValue(mockBlockchainResponses.getTransactionReceipt.success);
  
  mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
  mockWalletClient.sendTransaction.mockResolvedValue(MOCK_TX_HASH);
  
  return {
    blockchainClient: mockBlockchainClient,
    walletClient: mockWalletClient
  };
};

// Utility to simulate blockchain errors
export const simulateBlockchainError = (method: string, error: Error) => {
  switch (method) {
    case 'getBalance':
      mockBlockchainClient.getBalance.mockRejectedValue(error);
      break;
    case 'writeContract':
      mockWalletClient.writeContract.mockRejectedValue(error);
      break;
    case 'readContract':
      mockBlockchainClient.readContract.mockRejectedValue(error);
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
};

// Utility to reset blockchain mocks
export const resetBlockchainMocks = () => {
  jest.clearAllMocks();
  setupBlockchainMocks();
};