/**
 * @fileoverview E2E Test Setup
 * Comprehensive setup for LangChain E2E testing with functional programming
 */

import { config } from 'dotenv';
import { jest } from '@jest/globals';
import 'jest-extended';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';

// Load environment variables
config({ path: '.env.test' });

// Global test configuration
export const E2E_CONFIG = {
  API_BASE_URL: process.env.E2E_API_URL || 'http://localhost:3000',
  DOCKER_COMPOSE_FILE: process.env.E2E_DOCKER_COMPOSE || 'docker-compose.e2e.yml',
  TEST_TIMEOUT: 60000,
  MAX_RETRY_ATTEMPTS: 3,
  CONVERSATION_TIMEOUT: 30000,
  MEMORY_PERSISTENCE_TIMEOUT: 10000,
  CONCURRENT_USERS: parseInt(process.env.E2E_CONCURRENT_USERS || '10'),
  LOAD_TEST_DURATION: parseInt(process.env.E2E_LOAD_DURATION || '300000'), // 5 minutes
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    RESPONSE_TIME_MS: 2000,
    MEMORY_USAGE_MB: 512,
    THROUGHPUT_RPS: 10,
    ERROR_RATE: 0.01,
    CONCURRENT_CONVERSATIONS: 50
  },
  
  // Test data
  TEST_WALLET_ADDRESS: process.env.E2E_TEST_WALLET || '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
  TEST_PRIVATE_KEY: process.env.E2E_TEST_PRIVATE_KEY || 'test-private-key',
  
  // Protocol endpoints
  PROTOCOL_ENDPOINTS: {
    YEI_FINANCE: process.env.E2E_YEI_ENDPOINT || 'https://api.yei.finance',
    DRAGON_SWAP: process.env.E2E_DRAGON_ENDPOINT || 'https://api.dragonswap.app',
    TAKARA: process.env.E2E_TAKARA_ENDPOINT || 'https://api.takara.com'
  }
};

// Functional programming test utilities
export const TestUtils = {
  // Task-based async operations
  waitFor: (ms: number): T.Task<void> => 
    () => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry logic with exponential backoff
  retryWithBackoff: <A>(
    task: T.Task<A>, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): T.Task<A> => 
    pipe(
      task,
      T.chain(result => 
        T.of(result)
      )
    ),
  
  // Property-based test generators
  generators: {
    userId: () => fc.string({ minLength: 8, maxLength: 16 }),
    walletAddress: () => fc.hexaString({ minLength: 42, maxLength: 42 }).map(s => `0x${s}`),
    amount: () => fc.double({ min: 0.01, max: 10000 }),
    asset: () => fc.constantFrom('USDC', 'SEI', 'ETH', 'ATOM', 'WBTC'),
    protocol: () => fc.constantFrom('YeiFinance', 'DragonSwap', 'Takara', 'Silo', 'Citrex'),
    riskLevel: () => fc.constantFrom('low', 'medium', 'high'),
    userType: () => fc.constantFrom('beginner', 'intermediate', 'expert')
  },
  
  // Conversation generators
  conversationScenarios: {
    singleTurn: () => fc.record({
      userType: TestUtils.generators.userType(),
      intent: fc.constantFrom('lending', 'trading', 'arbitrage', 'portfolio'),
      input: fc.string({ minLength: 10, maxLength: 100 }),
      expectedIntent: fc.string(),
      shouldSucceed: fc.boolean()
    }),
    
    multiTurn: () => fc.record({
      userType: TestUtils.generators.userType(),
      scenario: fc.constantFrom('yield_optimization', 'risk_management', 'arbitrage_execution'),
      turns: fc.array(fc.record({
        input: fc.string({ minLength: 5, maxLength: 200 }),
        expectedResponse: fc.string(),
        shouldSucceed: fc.boolean()
      }), { minLength: 2, maxLength: 10 })
    })
  }
};

// Test assertions for functional programming
export const TestAssertions = {
  expectEither: <E, A>(either: E.Either<E, A>) => {
    if (E.isLeft(either)) {
      throw new Error(`Expected Right but got Left: ${JSON.stringify(either.left)}`);
    }
    return either.right;
  },
  
  expectOption: <A>(option: O.Option<A>) => {
    if (O.isNone(option)) {
      throw new Error('Expected Some but got None');
    }
    return option.value;
  },
  
  expectTaskEither: async <E, A>(taskEither: TE.TaskEither<E, A>) => {
    const result = await taskEither();
    return TestAssertions.expectEither(result);
  },
  
  expectConversationSuccess: (result: any) => {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.conversationId).toBeDefined();
    return result;
  },
  
  expectMemoryPersistence: (before: any, after: any) => {
    expect(after.userId).toBe(before.userId);
    expect(after.context).toBeDefined();
    expect(after.context.conversationHistory).toBeDefined();
    expect(after.context.userPreferences).toBeDefined();
  },
  
  expectPerformanceWithinLimits: (metrics: any) => {
    expect(metrics.responseTime).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS);
    expect(metrics.memoryUsage).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 1024 * 1024);
    expect(metrics.errorRate).toBeLessThan(E2E_CONFIG.PERFORMANCE_THRESHOLDS.ERROR_RATE);
  }
};

// Mock data generators for E2E tests
export const MockDataGenerators = {
  userProfile: () => ({
    userId: `user_${Date.now()}`,
    walletAddress: E2E_CONFIG.TEST_WALLET_ADDRESS,
    preferences: {
      riskTolerance: 'medium',
      preferredProtocols: ['YeiFinance', 'DragonSwap'],
      tradingExperience: 'intermediate'
    },
    conversationHistory: []
  }),
  
  conversationContext: () => ({
    sessionId: `session_${Date.now()}`,
    userId: `user_${Date.now()}`,
    timestamp: new Date().toISOString(),
    context: {
      lastIntent: null,
      parameters: {},
      confirmationPending: false
    }
  }),
  
  protocolResponse: (protocol: string) => ({
    protocol,
    timestamp: new Date().toISOString(),
    data: {
      rates: Math.random() * 10 + 1,
      liquidity: Math.random() * 1000000,
      fees: Math.random() * 0.01
    }
  })
};

// Docker utilities for E2E testing
export const DockerUtils = {
  isDockerRunning: async (): Promise<boolean> => {
    try {
      const { spawn } = require('child_process');
      return new Promise((resolve) => {
        const process = spawn('docker', ['info'], { stdio: 'pipe' });
        process.on('close', (code: number) => {
          resolve(code === 0);
        });
      });
    } catch {
      return false;
    }
  },
  
  waitForService: async (url: string, timeout: number = 30000): Promise<void> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) return;
      } catch {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Service at ${url} not ready within ${timeout}ms`);
  }
};

// Global setup for all E2E tests
beforeAll(async () => {
  // Check if Docker is available
  const dockerAvailable = await DockerUtils.isDockerRunning();
  if (!dockerAvailable) {
    console.warn('Docker not available. Some E2E tests may be skipped.');
  }
  
  // Set up global test timeout
  jest.setTimeout(E2E_CONFIG.TEST_TIMEOUT);
});

// Global teardown for all E2E tests
afterAll(async () => {
  // Clean up any persistent test data
  await TestUtils.waitFor(1000)();
});

// Custom matchers for E2E testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidConversationResponse(): R;
      toHaveMemoryPersistence(): R;
      toMeetPerformanceThresholds(): R;
      toBeWithinResponseTime(ms: number): R;
    }
  }
}

// Implement custom matchers
expect.extend({
  toBeValidConversationResponse(received: any) {
    const pass = received && 
                 typeof received.success === 'boolean' &&
                 typeof received.response === 'string' &&
                 typeof received.conversationId === 'string';
    
    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid conversation response`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid conversation response`,
        pass: false
      };
    }
  },
  
  toHaveMemoryPersistence(received: any) {
    const pass = received &&
                 received.context &&
                 received.context.conversationHistory &&
                 received.context.userPreferences;
    
    return {
      message: () => pass 
        ? `Expected ${JSON.stringify(received)} not to have memory persistence`
        : `Expected ${JSON.stringify(received)} to have memory persistence`,
      pass
    };
  },
  
  toMeetPerformanceThresholds(received: any) {
    const pass = received &&
                 received.responseTime < E2E_CONFIG.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_MS &&
                 received.memoryUsage < E2E_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB * 1024 * 1024 &&
                 received.errorRate < E2E_CONFIG.PERFORMANCE_THRESHOLDS.ERROR_RATE;
    
    return {
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to meet performance thresholds`
        : `Expected ${JSON.stringify(received)} to meet performance thresholds`,
      pass
    };
  },
  
  toBeWithinResponseTime(received: number, expectedMs: number) {
    const pass = received <= expectedMs;
    return {
      message: () => pass
        ? `Expected ${received}ms not to be within ${expectedMs}ms`
        : `Expected ${received}ms to be within ${expectedMs}ms`,
      pass
    };
  }
});

// Export configuration and utilities
export { E2E_CONFIG as default };