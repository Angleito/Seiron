/** @type {import('jest').Config} */
module.exports = {
  // Extend the base Jest configuration
  ...require('./jest.config.js'),
  
  // Override display name for this test suite
  displayName: {
    name: 'Supabase Integration Tests',
    color: 'blue'
  },
  
  // Specific test patterns for Supabase integration tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.supabase.integration.test.ts',
    '<rootDir>/src/**/*.supabase.integration.test.ts',
    '<rootDir>/src/__tests__/*supabase*.test.ts',
    '<rootDir>/src/services/__tests__/SupabaseService.integration.test.ts',
    '<rootDir>/src/routes/__tests__/chat.supabase.integration.test.ts'
  ],
  
  // Specific setup for Supabase tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/src/__tests__/utils/setup.ts',
    '<rootDir>/src/__tests__/supabase.test.setup.js'
  ],
  
  // Extended timeout for integration tests
  testTimeout: 30000,
  
  // Environment variables for Supabase testing
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-jwt-secret',
    REDIS_URL: 'redis://localhost:6379/1'
  },
  
  // Mock configuration specific to Supabase tests
  moduleNameMapping: {
    ...require('./jest.config.js').moduleNameMapper,
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'
  },
  
  // Coverage configuration for Supabase integration
  collectCoverageFrom: [
    'src/services/SupabaseService.ts',
    'src/routes/chat.ts',
    'src/services/SocketService.ts',
    'src/middleware/requestLogger.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  // Coverage thresholds specific to Supabase functionality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/SupabaseService.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/routes/chat.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Reporters for detailed output
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results/supabase-integration',
        filename: 'jest-report.html',
        pageTitle: 'Supabase Integration Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        customInfos: [
          {
            title: 'Test Suite',
            value: 'Supabase Integration Tests'
          },
          {
            title: 'Environment',
            value: 'Test'
          },
          {
            title: 'Database',
            value: 'Supabase (Mocked)'
          }
        ]
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/supabase-integration',
        outputName: 'junit.xml',
        suiteName: 'Supabase Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Transform configuration optimized for integration tests
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
      useESM: false
    }]
  },
  
  // Ignore patterns specific to integration tests
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/src/**/*.unit.test.ts',
    '<rootDir>/src/**/*.property.test.ts'
  ],
  
  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/',
    '<rootDir>/test-results/'
  ],
  
  // Error handling
  bail: 1, // Stop on first test failure for faster feedback
  errorOnDeprecated: true,
  
  // Memory and performance settings
  maxWorkers: '25%', // Reduced workers for integration tests
  workerIdleMemoryLimit: '1GB',
  
  // Test sequencing
  testSequencer: '@jest/test-sequencer',
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global setup and teardown for integration tests
  globalSetup: '<rootDir>/src/__tests__/supabase.global.setup.js',
  globalTeardown: '<rootDir>/src/__tests__/supabase.global.teardown.js',
  
  // Test result processor
  testResultsProcessor: '<rootDir>/src/__tests__/supabase.results.processor.js',
  
  // Clear mocks automatically
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Verbose output for debugging
  verbose: true,
  silent: false,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-supabase',
  
  // Enable detecting open handles for proper cleanup
  detectOpenHandles: true,
  forceExit: true,
  
  // Test timeout for slower integration tests
  slowTestThreshold: 10
};