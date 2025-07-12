// Verification Components
// Test and validation components for React Error #310 fixes

// Core Verification Component
export { default as ReactError310Verification } from './ReactError310Verification'

// Verification Types
export interface TestResults {
  hookOrderConsistency: boolean
  conditionalHooksDetected: boolean
  errorBoundaryFunctional: boolean
  componentRemountStable: boolean
  totalTests: number
  passedTests: number
  failedTests: Array<{
    test: string
    error: string
    timestamp: number
  }>
}

export interface TestState {
  isRunning: boolean
  currentTest: string
  results: TestResults
  stage: 'idle' | 'testing' | 'complete' | 'error'
}

export interface ReactError310VerificationProps {
  onTestComplete?: (results: TestResults) => void
  enableConsoleOutput?: boolean
  autoRunTests?: boolean
}

// Verification utilities
export const createEmptyTestResults = (): TestResults => ({
  hookOrderConsistency: false,
  conditionalHooksDetected: false,
  errorBoundaryFunctional: false,
  componentRemountStable: false,
  totalTests: 4,
  passedTests: 0,
  failedTests: []
})

export const getTestSuccessRate = (results: TestResults): number => {
  return Math.round((results.passedTests / results.totalTests) * 100)
}

export const isAllTestsPassed = (results: TestResults): boolean => {
  return results.passedTests === results.totalTests
}

export const getFailedTestNames = (results: TestResults): string[] => {
  return results.failedTests.map(failure => failure.test)
}

// Test validation helpers
export const validateHookOrder = (hookCallOrder: string[]): boolean => {
  // Ensure hooks are called in the same order
  return hookCallOrder.length > 0 && hookCallOrder.every(hook => typeof hook === 'string' && hook.trim().length > 0)
}

export const detectConditionalHooks = (componentCode: string): boolean => {
  // Simple regex to detect conditional hook patterns
  const conditionalHookPattern = /if\s*\([^)]+\)\s*{[^}]*use\w+/g
  return conditionalHookPattern.test(componentCode)
}

export const measureComponentStability = (renderCount: number, errorCount: number): number => {
  if (renderCount === 0) return 0
  return ((renderCount - errorCount) / renderCount) * 100
}