/**
 * Jest configuration specifically for property-based testing
 * Optimized for comprehensive mathematical property validation
 */

module.exports = {
  // Extend base Jest configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns for property-based tests
  testMatch: [
    '**/*.property.test.ts',
    '**/*.enhanced.property.test.ts',
    '**/__tests__/utils/property-*.test.ts'
  ],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@backend/(.*)$': '<rootDir>/backend/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/__tests__/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/utils/property-testing-setup.ts'
  ],
  
  // Test timeout for property-based tests (longer than unit tests)
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/property-tests',
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // Coverage thresholds specific to property tests
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for protocol wrappers
    './src/protocols/sei/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Functional testing utilities should have high coverage
    './src/__tests__/utils/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.ts',
    'backend/src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!backend/src/**/*.test.ts',
    '!backend/src/**/__tests__/**'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Global variables for property testing
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    },
    // Fast-check configuration
    FAST_CHECK_NUM_RUNS: process.env.FAST_CHECK_NUM_RUNS || 1000,
    FAST_CHECK_TIMEOUT: process.env.FAST_CHECK_TIMEOUT || 5000,
    FAST_CHECK_MAX_SHRINKS: process.env.FAST_CHECK_MAX_SHRINKS || 1000,
    FAST_CHECK_SEED: process.env.FAST_CHECK_SEED || undefined,
    // Property test configuration
    PROPERTY_TEST_VERBOSE: process.env.PROPERTY_TEST_VERBOSE === 'true',
    PROPERTY_TEST_EXAMPLES: process.env.PROPERTY_TEST_EXAMPLES === 'true'
  },
  
  // Test reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/property-tests',
        outputName: 'property-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results/property-tests',
        filename: 'property-test-report.html',
        expand: true,
        hideIcon: false
      }
    ]
  ],
  
  // Test sequence configuration for property tests
  testSequencer: '<rootDir>/src/__tests__/utils/property-test-sequencer.js',
  
  // Memory and performance settings
  maxWorkers: process.env.JEST_WORKERS || 2,
  workerIdleMemoryLimit: '1GB',
  
  // Verbose output for property test debugging
  verbose: process.env.PROPERTY_TEST_VERBOSE === 'true',
  
  // Bail configuration - don't stop on first failure for property tests
  bail: 0,
  
  // Error and warning handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '.jest-cache/property-tests',
  
  // Test result processor for property-specific formatting
  testResultsProcessor: '<rootDir>/src/__tests__/utils/property-test-processor.js',
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'jest-property-tests'
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module resolution
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/backend/src'
  ],
  
  // Watch mode configuration (for development)
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],
  
  // Snapshot configuration
  updateSnapshot: process.env.UPDATE_SNAPSHOTS === 'true',
  
  // Property test specific configuration
  testRunner: 'jest-circus/runner',
  
  // Custom matchers for property testing
  setupFiles: [
    '<rootDir>/src/__tests__/utils/property-matchers.ts'
  ],
  
  // Performance monitoring
  logHeapUsage: true,
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Test file execution order
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '\\.integration\\.test\\.ts$', // Exclude integration tests
    '\\.unit\\.test\\.ts$'        // Exclude unit tests
  ]
};
