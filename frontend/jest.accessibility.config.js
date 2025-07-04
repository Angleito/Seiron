const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/components/**/__tests__/**/*.accessibility.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.accessibility.test.{js,jsx,ts,tsx}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.accessibility.setup.js'
  ],
  testTimeout: 30000,
}