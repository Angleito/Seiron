/**
 * @fileoverview Jest configuration for E2E tests
 * Configures comprehensive end-to-end testing for LangChain integration
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.json');

module.exports = {
  displayName: 'E2E Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: [
    '<rootDir>/test/e2e/**/*.test.ts',
    '<rootDir>/test/e2e/**/*.spec.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/e2e/setup.ts'
  ],
  moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/'
  }),
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000, // 1 minute timeout for E2E tests
  maxWorkers: 4,
  bail: false,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  
  // E2E specific configuration
  globalSetup: '<rootDir>/test/e2e/globalSetup.ts',
  globalTeardown: '<rootDir>/test/e2e/globalTeardown.ts',
  
  // Environment variables for E2E tests
  setupFiles: [
    '<rootDir>/test/e2e/env.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Test organization
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/test/e2e/fixtures/'
  ],
  
  // Performance monitoring
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/e2e',
      outputName: 'junit.xml'
    }],
    ['<rootDir>/test/e2e/reporters/performance-reporter.js', {
      outputFile: '<rootDir>/test-results/e2e/performance.json'
    }]
  ],
  
  // Functional programming support
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true
        }
      }
    }
  }
};