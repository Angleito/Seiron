module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  displayName: 'Integration Tests',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/integration/setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@features/(.*)$': '<rootDir>/features/$1',
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
    // Exclude files that are tested in other test suites
    '!**/*.unit.test.{js,jsx,ts,tsx}',
    '!**/*.component.test.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Specific thresholds for integration test coverage
    './lib/orchestrator-client.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './lib/adapters/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './components/chat/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    }
  },
  testMatch: [
    '**/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests__/unit/',
    '/__tests__/property/',
    '/__tests__/performance/',
  ],
  // Integration test specific settings
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: '50%', // Use half of available cores
  
  // Performance monitoring
  reporters: [
    'default'
  ],
  
  // Memory and performance settings
  maxConcurrency: 5,
  workerIdleMemoryLimit: '1GB',
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/integration/globalTeardown.ts',
  
  // Environment variables for integration tests
  setupFiles: ['<rootDir>/__tests__/integration/env.setup.js'],
  
  // Mock modules that shouldn't be tested in integration
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Clear mocks between tests for isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast on first error in CI
  bail: process.env.CI ? 1 : 0,
  
  // Custom test sequencer for optimal test order
  testSequencer: '<rootDir>/__tests__/integration/testSequencer.js',
}