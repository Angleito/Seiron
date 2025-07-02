/**
 * Jest test setup file
 * Configures test environment and global mocks
 */

import { jest } from '@jest/globals';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use test database
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.PORT = '0'; // Let system assign port for tests

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock Winston logger
jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  }
}));

// Mock Redis/IORedis
jest.mock('ioredis', () => {
  const mockRedis = {
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
  
  return jest.fn(() => mockRedis);
});

// Mock Viem blockchain client
jest.mock('viem', () => ({
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

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock Socket.IO
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    sockets: {
      emit: jest.fn()
    }
  }))
}));

// Global test utilities
global.testUtils = {
  // Create mock wallet address
  createMockWallet: () => '0x1234567890123456789012345678901234567890',
  
  // Create mock token address
  createMockToken: () => '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  
  // Create mock timestamp
  createMockTimestamp: () => new Date().toISOString(),
  
  // Wait for promises to resolve
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
  
  // Mock BigInt values
  mockBigInt: (value: string) => BigInt(value),
  
  // Generate test portfolio data
  generateMockPortfolioData: () => ({
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
  jest.clearAllMocks();
});

// Type augmentation for global test utilities
declare global {
  var testUtils: {
    createMockWallet(): string;
    createMockToken(): string;
    createMockTimestamp(): string;
    flushPromises(): Promise<void>;
    mockBigInt(value: string): bigint;
    generateMockPortfolioData(): any;
  };
}