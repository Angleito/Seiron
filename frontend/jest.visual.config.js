const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/components/**/__tests__/**/*.visual.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.visual.test.{js,jsx,ts,tsx}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.visual.setup.js'
  ],
  testTimeout: 60000, // Longer timeout for visual tests
  collectCoverage: false, // Disable coverage for visual tests
}