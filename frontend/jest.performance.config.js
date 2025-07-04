const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/components/**/__tests__/**/*.performance.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.performance.test.{js,jsx,ts,tsx}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.performance.setup.js'
  ],
  testTimeout: 30000, // Longer timeout for performance tests
  // Disable coverage for performance tests to avoid interference
  collectCoverage: false,
  // Custom test environment for performance testing
  testEnvironment: '<rootDir>/jest.performance.environment.js',
}