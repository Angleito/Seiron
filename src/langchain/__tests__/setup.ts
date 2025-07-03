/**
 * @fileoverview Test Setup and Utilities
 * Common setup and utility functions for NLP tests
 */

import { jest } from '@jest/globals';
import { createTestNLPEngine } from '../factory.js';
import { NLPEngine } from '../NLPEngine.js';
import { 
  ConversationSession, 
  ConversationState, 
  ConversationTurn 
} from '../conversation/types.js';
import { DefiIntent } from '../nlp/types.js';

/**
 * Test Configuration
 */
export const TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  mockDelay: 100
};

/**
 * Create test NLP engine instance
 */
export const createTestEngine = (): NLPEngine => {
  return createTestNLPEngine();
};

/**
 * Create mock conversation session
 */
export const createMockSession = (overrides: Partial<ConversationSession> = {}): ConversationSession => {
  return {
    id: 'test-session-' + Date.now(),
    userId: 'test-user',
    state: ConversationState.ACTIVE,
    startTime: Date.now(),
    context: {
      user: {
        id: 'test-user',
        walletAddress: '0x1234567890123456789012345678901234567890',
        preferences: {
          riskTolerance: 'medium',
          preferredProtocols: ['dragonswap', 'silo']
        }
      },
      financial: {
        portfolioValue: 50000,
        activeProtocols: ['dragonswap'],
        riskTolerance: 'medium',
        positions: []
      },
      history: {
        recentIntents: [],
        conversationSummary: 'User is exploring DeFi options',
        lastActivity: Date.now()
      }
    },
    turns: [],
    metadata: {
      platform: 'test',
      version: '1.0.0',
      features: ['nlp', 'risk-assessment']
    },
    ...overrides
  };
};

/**
 * Create mock conversation turn
 */
export const createMockTurn = (overrides: Partial<ConversationTurn> = {}): ConversationTurn => {
  return {
    id: 'turn-' + Date.now(),
    sessionId: 'test-session',
    type: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    metadata: {
      processingTime: 100
    },
    ...overrides
  };
};

/**
 * Test data generators
 */
export const TestData = {
  // Sample user inputs for different intents
  lendingInputs: [
    'lend 1000 USDC at best rate',
    'I want to lend 500 SEI',
    'supply 2000 USDC to earn yield',
    'deposit my USDC for lending'
  ],
  
  borrowingInputs: [
    'borrow 500 USDC against my SEI',
    'I need to borrow some stablecoins',
    'take a loan of 1000 USDC',
    'borrow against my collateral'
  ],
  
  swapInputs: [
    'swap 100 SEI for USDC',
    'exchange my SEI to USDC',
    'convert 500 SEI to stablecoins',
    'trade SEI for USDC'
  ],
  
  liquidityInputs: [
    'add liquidity to SEI/USDC pool',
    'provide liquidity for SEI-USDC pair',
    'add to LP pool',
    'become a liquidity provider'
  ],
  
  portfolioInputs: [
    'show my portfolio',
    'check my positions',
    'what are my holdings',
    'portfolio status'
  ],
  
  riskInputs: [
    'assess risk of lending SEI',
    'check risk level',
    'is this safe to do?',
    'what are the risks?'
  ],
  
  yieldInputs: [
    'optimize my yield',
    'find best yield strategy',
    'maximize my returns',
    'best APY available'
  ],
  
  unknownInputs: [
    'hello',
    'what is DeFi?',
    'help me understand',
    'random text here'
  ]
};

/**
 * Mock external dependencies
 */
export const setupMocks = () => {
  // Mock console methods for cleaner test output
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock Date for consistent timestamps
  const mockDate = new Date('2024-01-01T00:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  
  // Mock setTimeout for faster tests
  jest.spyOn(global, 'setTimeout').mockImplementation((fn: Function) => {
    fn();
    return 1 as any;
  });
};

/**
 * Clean up mocks
 */
export const cleanupMocks = () => {
  jest.restoreAllMocks();
};

/**
 * Test assertions helpers
 */
export const TestAssertions = {
  /**
   * Assert that a result is successful
   */
  expectSuccess: <T>(result: { _tag: string; right?: T; left?: any }): T => {
    expect(result._tag).toBe('Right');
    expect(result.right).toBeDefined();
    return result.right!;
  },

  /**
   * Assert that a result is an error
   */
  expectError: <T>(result: { _tag: string; right?: T; left?: any }): any => {
    expect(result._tag).toBe('Left');
    expect(result.left).toBeDefined();
    return result.left!;
  },

  /**
   * Assert intent classification
   */
  expectIntent: (result: any, expectedIntent: DefiIntent) => {
    expect(result.intent.intent).toBe(expectedIntent);
    expect(result.intent.confidence).toBeGreaterThan(0);
  },

  /**
   * Assert entity extraction
   */
  expectEntities: (result: any, expectedTypes: string[]) => {
    const entityTypes = result.intent.entities.map((e: any) => e.type);
    expectedTypes.forEach(type => {
      expect(entityTypes).toContain(type);
    });
  },

  /**
   * Assert command generation
   */
  expectCommand: (result: any, expectedAction: string) => {
    expect(result.command).toBeDefined();
    expect(result.command.action).toBe(expectedAction);
  },

  /**
   * Assert risk assessment
   */
  expectRiskLevel: (result: any, expectedLevel: string) => {
    expect(result.command?.riskLevel).toBe(expectedLevel);
  },

  /**
   * Assert validation
   */
  expectValidation: (result: any, shouldBeValid: boolean) => {
    if (shouldBeValid) {
      expect(result.command?.validationErrors).toHaveLength(0);
    } else {
      expect(result.command?.validationErrors).not.toHaveLength(0);
    }
  }
};

/**
 * Performance testing utilities
 */
export const PerformanceUtils = {
  /**
   * Measure execution time
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Run performance benchmark
   */
  benchmark: async <T>(
    fn: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    results: T[];
  }> => {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await PerformanceUtils.measureTime(fn);
      times.push(duration);
      results.push(result);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      results
    };
  }
};

/**
 * Error testing utilities
 */
export const ErrorUtils = {
  /**
   * Create test error
   */
  createTestError: (message: string, code?: string) => {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  },

  /**
   * Test error handling
   */
  expectErrorHandling: async (fn: () => Promise<any>, expectedErrorType?: string) => {
    try {
      await fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedErrorType) {
        expect(error.constructor.name).toBe(expectedErrorType);
      }
      return error;
    }
  }
};

/**
 * Mock data generators
 */
export const MockData = {
  /**
   * Generate random amount
   */
  randomAmount: (min: number = 1, max: number = 10000): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random asset
   */
  randomAsset: (): string => {
    const assets = ['SEI', 'USDC', 'USDT', 'ETH', 'BTC'];
    return assets[Math.floor(Math.random() * assets.length)];
  },

  /**
   * Generate random protocol
   */
  randomProtocol: (): string => {
    const protocols = ['dragonswap', 'silo', 'takara', 'symphony'];
    return protocols[Math.floor(Math.random() * protocols.length)];
  },

  /**
   * Generate random user input
   */
  randomUserInput: (intent: DefiIntent): string => {
    const templates = TestData[intent as keyof typeof TestData] || TestData.unknownInputs;
    return templates[Math.floor(Math.random() * templates.length)];
  }
};

/**
 * Integration test helpers
 */
export const IntegrationUtils = {
  /**
   * Wait for async operation
   */
  waitFor: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry operation
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await IntegrationUtils.waitFor(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }
};

/**
 * Test lifecycle hooks
 */
export const setupTestEnvironment = () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });
};

/**
 * Export all utilities
 */
export {
  setupMocks,
  cleanupMocks,
  createTestEngine,
  createMockSession,
  createMockTurn,
  TestData,
  TestAssertions,
  PerformanceUtils,
  ErrorUtils,
  MockData,
  IntegrationUtils
};