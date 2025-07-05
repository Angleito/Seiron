/**
 * Jest test setup file
 * Configures test environment and global mocks // TODO: REMOVE_MOCK - Mock-related keywords
 */

import { jest } from '@jest/globals';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use test database
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.PORT = '0'; // Let system assign port for tests

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests // TODO: REMOVE_MOCK - Mock-related keywords
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock Winston logger // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('../src/utils/logger', () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  }
}));

// Mock Redis/IORedis // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('ioredis', () => { // TODO: REMOVE_MOCK - Mock-related keywords
  const mockRedis = { // TODO: REMOVE_MOCK - Mock-related keywords
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
  };
  
  return jest.fn(() => mockRedis); // TODO: REMOVE_MOCK - Mock-related keywords
});

// Mock Viem blockchain client // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('viem', () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  createPublicClient: jest.fn(() => ({
    getBalance: jest.fn(),
    getBlockNumber: jest.fn(),
    readContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
    getTransactionReceipt: jest.fn()
  })),
  http: jest.fn(),
  parseEther: jest.fn(),
  formatEther: jest.fn(),
  isAddress: jest.fn()
}));

// Mock OpenAI // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('openai', () => { // TODO: REMOVE_MOCK - Mock-related keywords
  return {
    default: jest.fn().mockImplementation(() => ({ // TODO: REMOVE_MOCK - Mock-related keywords
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock Socket.IO // TODO: REMOVE_MOCK - Mock-related keywords
jest.mock('socket.io', () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  Server: jest.fn().mockImplementation(() => ({ // TODO: REMOVE_MOCK - Mock-related keywords
    on: jest.fn(),
    emit: jest.fn(),
    sockets: {
      emit: jest.fn()
    }
  }))
}));

// Global test utilities
global.testUtils = {
  // Create mock wallet address // TODO: REMOVE_MOCK - Mock-related keywords
  createMockWallet: () => '0x1234567890123456789012345678901234567890', // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Create mock token address // TODO: REMOVE_MOCK - Mock-related keywords
  createMockToken: () => '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Create mock timestamp // TODO: REMOVE_MOCK - Mock-related keywords
  createMockTimestamp: () => new Date().toISOString(), // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Wait for promises to resolve
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
  
  // Mock BigInt values // TODO: REMOVE_MOCK - Mock-related keywords
  mockBigInt: (value: string) => BigInt(value), // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Generate test portfolio data
  generateMockPortfolioData: () => ({ // TODO: REMOVE_MOCK - Mock-related keywords
    walletAddress: '0x1234567890123456789012345678901234567890',
    totalValueUSD: 10000,
    totalSuppliedUSD: 8000,
    totalBorrowedUSD: 2000,
    totalLiquidityUSD: 4000,
    netWorth: 8000,
    healthFactor: 2.5,
    lendingPositions: [],
    liquidityPositions: [],
    tokenBalances: [],
    timestamp: new Date().toISOString()
  })
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks(); // TODO: REMOVE_MOCK - Mock-related keywords
});

// Type augmentation for global test utilities
declare global {
  var testUtils: {
    createMockWallet(): string; // TODO: REMOVE_MOCK - Mock-related keywords
    createMockToken(): string; // TODO: REMOVE_MOCK - Mock-related keywords
    createMockTimestamp(): string; // TODO: REMOVE_MOCK - Mock-related keywords
    flushPromises(): Promise<void>;
    mockBigInt(value: string): bigint; // TODO: REMOVE_MOCK - Mock-related keywords
    generateMockPortfolioData(): any; // TODO: REMOVE_MOCK - Mock-related keywords
  };
}