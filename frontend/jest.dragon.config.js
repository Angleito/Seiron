// Jest configuration specifically for dragon component tests
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/utils/dragon-test-setup.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
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
    'components/dragon/**/*.{js,jsx,ts,tsx}',
    'hooks/voice/**/*.{js,jsx,ts,tsx}',
    'utils/voice-dragon-mapping.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Specific thresholds for dragon components
    'components/dragon/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'hooks/voice/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    }
  },
  testMatch: [
    '**/__tests__/**/dragon*.{js,jsx,ts,tsx}',
    '**/__tests__/**/ascii*.{js,jsx,ts,tsx}',
    '**/__tests__/**/use*Dragon*.{js,jsx,ts,tsx}',
    '**/dragon*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  // Dragon-specific test configuration
  testTimeout: 15000, // Longer timeout for performance tests
  maxConcurrency: 4,  // Limit concurrency for resource-intensive tests
  
  // Performance test configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  
  // Visual regression configuration
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Custom reporters for dragon tests
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/dragon',
      outputName: 'dragon-test-results.xml',
      classNameTemplate: 'Dragon.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Test result processor for dragon-specific metrics
  testResultsProcessor: '<rootDir>/__tests__/utils/dragon-test-processor.js'
}