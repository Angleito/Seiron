/**
 * Supabase Integration Test Setup
 * Global setup for Supabase testing environment
 */

// Mock Supabase before any imports
jest.mock('@supabase/supabase-js', () => {
  const { createMockSupabaseClient } = require('../__mocks__/supabase');
  return {
    createClient: jest.fn(() => createMockSupabaseClient())
  };
});

// Mock Socket.IO for real-time tests
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn()
    })),
    use: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  // Helper to create test wallet addresses
  createTestWallet: (suffix = '') => 
    `0x${Math.random().toString(16).substr(2, 40)}${suffix}`,
  
  // Helper to create test user data
  createTestUser: (walletAddress) => ({
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    wallet_address: walletAddress || global.testUtils.createTestWallet(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  // Helper to create test session data
  createTestSession: (userId) => ({
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    session_name: `Test Session ${Date.now()}`,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  // Helper to create test message data
  createTestMessage: (sessionId, userId, role = 'user') => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    session_id: sessionId,
    user_id: userId,
    role,
    content: `Test message content ${Date.now()}`,
    crypto_context: {
      portfolio_data: { totalValue: Math.random() * 10000 },
      wallet_info: { network: 'sei' }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      test: true
    },
    token_usage: {
      prompt_tokens: Math.floor(Math.random() * 100),
      completion_tokens: Math.floor(Math.random() * 100),
      total_tokens: Math.floor(Math.random() * 200)
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock portfolio data
  createMockPortfolio: (walletAddress) => ({
    totalValueUSD: Math.random() * 100000,
    walletAddress,
    lendingPositions: [
      {
        protocol: 'TestLending',
        asset: 'USDC',
        value: Math.random() * 50000,
        apy: Math.random() * 20
      }
    ],
    liquidityPositions: [
      {
        protocol: 'TestDEX',
        pool: 'ETH/USDC',
        value: Math.random() * 30000,
        apr: Math.random() * 15
      }
    ],
    tokenBalances: [
      {
        token: 'SEI',
        balance: Math.random() * 10000,
        valueUSD: Math.random() * 20000
      }
    ],
    timestamp: new Date().toISOString()
  })
};

// Console formatting for better test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleLog('[TEST LOG]', ...args);
  }
};

console.error = (...args) => {
  originalConsoleError('[TEST ERROR]', ...args);
};

console.warn = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleWarn('[TEST WARN]', ...args);
  }
};

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Extend Jest matchers
expect.extend({
  toBeValidSupabaseResponse(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 received.hasOwnProperty('_tag') &&
                 (received._tag === 'Left' || received._tag === 'Right');
    
    return {
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid TaskEither response`
          : `Expected ${JSON.stringify(received)} to be a valid TaskEither response with _tag property`,
      pass
    };
  },
  
  toBeSuccessfulSupabaseResponse(received) {
    const pass = received && 
                 received._tag === 'Right' && 
                 received.right !== undefined;
    
    return {
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a successful TaskEither response`
          : `Expected ${JSON.stringify(received)} to be a successful TaskEither response (Right)`,
      pass
    };
  },
  
  toBeFailedSupabaseResponse(received) {
    const pass = received && 
                 received._tag === 'Left' && 
                 received.left instanceof Error;
    
    return {
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a failed TaskEither response`
          : `Expected ${JSON.stringify(received)} to be a failed TaskEither response (Left) with Error`,
      pass
    };
  },
  
  toHaveValidMessageStructure(received) {
    const requiredFields = ['id', 'session_id', 'user_id', 'role', 'content', 'created_at', 'updated_at'];
    const pass = requiredFields.every(field => received.hasOwnProperty(field)) &&
                 ['user', 'assistant', 'system'].includes(received.role);
    
    return {
      message: () => 
        pass 
          ? `Expected message not to have valid structure`
          : `Expected message to have valid structure with fields: ${requiredFields.join(', ')}`,
      pass
    };
  }
});

// Test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers();
});

// Global teardown
afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;  
  console.warn = originalConsoleWarn;
});