/**
 * Mock blockchain interactions for testing // TODO: REMOVE_MOCK - Mock-related keywords
 */

import * as TE from 'fp-ts/TaskEither';
import { LendingPosition, LiquidityPosition, TokenBalance } from '../../src/types/portfolio';

// Mock blockchain client // TODO: REMOVE_MOCK - Mock-related keywords
export const mockBlockchainClient = { // TODO: REMOVE_MOCK - Mock-related keywords
  getBalance: jest.fn(),
  getBlockNumber: jest.fn(),
  readContract: jest.fn(),
  waitForTransactionReceipt: jest.fn(),
  getTransactionReceipt: jest.fn(),
  simulateContract: jest.fn(),
  writeContract: jest.fn()
};

// Mock wallet client // TODO: REMOVE_MOCK - Mock-related keywords
export const mockWalletClient = { // TODO: REMOVE_MOCK - Mock-related keywords
  account: {
    address: '0x1234567890123456789012345678901234567890'
  },
  writeContract: jest.fn(),
  signMessage: jest.fn(),
  sendTransaction: jest.fn()
};

// Mock transaction hash // TODO: REMOVE_MOCK - Mock-related keywords
export const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'; // TODO: REMOVE_MOCK - Mock-related keywords

// Mock contract addresses // TODO: REMOVE_MOCK - Mock-related keywords
export const MOCK_CONTRACTS = { // TODO: REMOVE_MOCK - Mock-related keywords
  YEI_POOL: '0x1111111111111111111111111111111111111111',
  DRAGON_SWAP_ROUTER: '0x2222222222222222222222222222222222222222',
  DRAGON_SWAP_FACTORY: '0x3333333333333333333333333333333333333333',
  USDC: '0x4444444444444444444444444444444444444444',
  SEI: '0x0000000000000000000000000000000000000000'
};

// Mock lending positions data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockLendingPosition = (overrides?: Partial<LendingPosition>): LendingPosition => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  id: 'lending-pos-1',
  walletAddress: '0x1234567890123456789012345678901234567890',
  platform: 'YeiFinance',
  createdAt: '2024-01-01T00:00:00Z',
  lastUpdated: '2024-01-01T00:00:00Z',
  type: 'supply',
  token: MOCK_CONTRACTS.USDC, // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock liquidity positions data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockLiquidityPosition = (overrides?: Partial<LiquidityPosition>): LiquidityPosition => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  id: 'liquidity-pos-1',
  walletAddress: '0x1234567890123456789012345678901234567890',
  platform: 'DragonSwap',
  createdAt: '2024-01-01T00:00:00Z',
  lastUpdated: '2024-01-01T00:00:00Z',
  poolId: 'SEI-USDC-3000',
  token0: MOCK_CONTRACTS.SEI, // TODO: REMOVE_MOCK - Mock-related keywords
  token1: MOCK_CONTRACTS.USDC, // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock token balance data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockTokenBalance = (overrides?: Partial<TokenBalance>): TokenBalance => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  token: MOCK_CONTRACTS.SEI, // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock YeiFinance adapter // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockYeiFinanceAdapter = () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  name: 'YeiFinance',
  version: '1.0.0',
  isInitialized: true,
  initialize: jest.fn().mockReturnValue(TE.right(undefined)), // TODO: REMOVE_MOCK - Mock-related keywords
  getUserPositions: jest.fn().mockReturnValue( // TODO: REMOVE_MOCK - Mock-related keywords
    TE.right([
      createMockLendingPosition(), // TODO: REMOVE_MOCK - Mock-related keywords
      createMockLendingPosition({ type: 'borrow', apy: 8.5, valueUSD: 500 }) // TODO: REMOVE_MOCK - Mock-related keywords
    ])
  ),
  supply: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  withdraw: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  borrow: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  repay: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  getHealthFactor: jest.fn().mockReturnValue(TE.right(2.5)) // TODO: REMOVE_MOCK - Mock-related keywords
});

// Mock DragonSwap adapter // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockDragonSwapAdapter = () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  name: 'DragonSwap',
  version: '2.0.0',
  isInitialized: true,
  initialize: jest.fn().mockReturnValue(TE.right(undefined)), // TODO: REMOVE_MOCK - Mock-related keywords
  getPositions: jest.fn().mockReturnValue( // TODO: REMOVE_MOCK - Mock-related keywords
    TE.right([createMockLiquidityPosition()]) // TODO: REMOVE_MOCK - Mock-related keywords
  ),
  addLiquidity: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  removeLiquidity: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  collectFees: jest.fn().mockReturnValue(TE.right(MOCK_TX_HASH)), // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  getPoolInfo: jest.fn().mockReturnValue( // TODO: REMOVE_MOCK - Mock-related keywords
    TE.right({
      poolId: 'SEI-USDC-3000',
      token0: MOCK_CONTRACTS.SEI, // TODO: REMOVE_MOCK - Mock-related keywords
      token1: MOCK_CONTRACTS.USDC, // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock Redis cache // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockRedisClient = () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock blockchain responses // TODO: REMOVE_MOCK - Mock-related keywords
export const mockBlockchainResponses = { // TODO: REMOVE_MOCK - Mock-related keywords
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
    success: MOCK_TX_HASH, // TODO: REMOVE_MOCK - Mock-related keywords
    failure: new Error('Transaction failed')
  },
  
  // Transaction receipt
  getTransactionReceipt: {
    success: {
      transactionHash: MOCK_TX_HASH, // TODO: REMOVE_MOCK - Mock-related keywords
      status: 'success',
      blockNumber: 12345,
      gasUsed: BigInt('21000'),
      effectiveGasPrice: BigInt('20000000000')
    },
    failure: new Error('Transaction receipt not found')
  }
};

// Setup blockchain mocks // TODO: REMOVE_MOCK - Mock-related keywords
export const setupBlockchainMocks = () => { // TODO: REMOVE_MOCK - Mock-related keywords
  // Reset all mocks // TODO: REMOVE_MOCK - Mock-related keywords
  jest.clearAllMocks(); // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Configure default mock behaviors // TODO: REMOVE_MOCK - Mock-related keywords
  mockBlockchainClient.getBalance.mockResolvedValue(mockBlockchainResponses.getBalance.success); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  mockBlockchainClient.getBlockNumber.mockResolvedValue(12345); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  mockBlockchainClient.readContract.mockResolvedValue(mockBlockchainResponses.readContract.userAccountData); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  mockBlockchainClient.getTransactionReceipt.mockResolvedValue(mockBlockchainResponses.getTransactionReceipt.success); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  
  mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  mockWalletClient.sendTransaction.mockResolvedValue(MOCK_TX_HASH); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  
  return {
    blockchainClient: mockBlockchainClient, // TODO: REMOVE_MOCK - Mock-related keywords
    walletClient: mockWalletClient // TODO: REMOVE_MOCK - Mock-related keywords
  };
};

// Utility to simulate blockchain errors
export const simulateBlockchainError = (method: string, error: Error) => {
  switch (method) {
    case 'getBalance':
      mockBlockchainClient.getBalance.mockRejectedValue(error); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      break;
    case 'writeContract':
      mockWalletClient.writeContract.mockRejectedValue(error); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      break;
    case 'readContract':
      mockBlockchainClient.readContract.mockRejectedValue(error); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
};

// Utility to reset blockchain mocks // TODO: REMOVE_MOCK - Mock-related keywords
export const resetBlockchainMocks = () => { // TODO: REMOVE_MOCK - Mock-related keywords
  jest.clearAllMocks(); // TODO: REMOVE_MOCK - Mock-related keywords
  setupBlockchainMocks(); // TODO: REMOVE_MOCK - Mock-related keywords
};