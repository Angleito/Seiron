/** @type {import('jest').Config} */
module.exports = {
  // Basic setup - optimized for TypeScript + fp-ts
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Test file patterns - organized by type
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts'
  ],
  
  // Module resolution with cleaner paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@/routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/risk/(.*)$': '<rootDir>/src/risk/$1',
    '^@/mocks/(.*)$': '<rootDir>/src/__mocks__/$1',
    '^@/test-utils/(.*)$': '<rootDir>/src/__tests__/utils/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/src/__tests__/utils/setup.ts'
  ],
  
  // Coverage configuration - focused on functional code
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/server.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/risk/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Transform configuration - optimized for fp-ts
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Performance optimizations
  testTimeout: 15000,
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  
  // Mock management
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Environment setup
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    REDIS_URL: 'redis://localhost:6379/1'
  },
  
  // Output configuration
  verbose: false,
  silent: false,
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  
  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  bail: 0,
  
  // Module resolution
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // ES modules configuration
  extensionsToTreatAsEsm: [],
  
  // Transform ignore patterns for external modules
  transformIgnorePatterns: [
    'node_modules/(?!(viem|@noble|@scure|fp-ts)/)'
  ],

  // Test sequencing for reliable execution
  forceExit: true,
  detectOpenHandles: true,
  
  // Reporter configuration  
  reporters: ['default'],
  
  // Cache configuration for faster runs
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Test organization
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ]
};