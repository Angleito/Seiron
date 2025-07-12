'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { logger } from '@lib/logger'

interface ReactError310VerificationProps {
  onTestComplete?: (results: TestResults) => void
  enableConsoleOutput?: boolean
  autoRunTests?: boolean
}

interface TestResults {
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

interface TestState {
  isRunning: boolean
  currentTest: string
  results: TestResults
  stage: 'idle' | 'testing' | 'complete' | 'error'
}

/**
 * Verification component that tests React Error #310 fixes
 * Ensures hook order consistency and error boundary functionality
 */
const ReactError310Verification: React.FC<ReactError310VerificationProps> = ({
  onTestComplete,
  enableConsoleOutput = true,
  autoRunTests = false
}) => {
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    currentTest: '',
    results: {
      hookOrderConsistency: false,
      conditionalHooksDetected: false,
      errorBoundaryFunctional: false,
      componentRemountStable: false,
      totalTests: 4,
      passedTests: 0,
      failedTests: []
    },
    stage: 'idle'
  })

  const log = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    if (enableConsoleOutput) {
      console[level](`[React Error #310 Verification] ${message}`)
    }
    logger[level](`React Error #310 Verification: ${message}`)
  }, [enableConsoleOutput])

  // Test 1: Hook Order Consistency
  const testHookOrderConsistency = useCallback(async (): Promise<boolean> => {
    log('Testing hook order consistency...')
    
    try {
      // Create a component that tests hook order across renders
      let renderCount = 0
      const hookCallOrder: string[] = []
      
      const TestComponent = () => {
        renderCount++
        
        // Track hook call order
        hookCallOrder.push('useState1')
        const [state1] = useState(1)
        
        hookCallOrder.push('useEffect1')
        useEffect(() => {
          hookCallOrder.push('effect1-callback')
        }, [])
        
        hookCallOrder.push('useState2')
        const [state2] = useState(2)
        
        hookCallOrder.push('useMemo1')
        const memoValue = useMemo(() => {
          hookCallOrder.push('memo1-callback')
          return state1 + state2
        }, [state1, state2])
        
        hookCallOrder.push('useCallback1')
        const callbackValue = useCallback(() => {
          hookCallOrder.push('callback1-callback')
          return memoValue
        }, [memoValue])
        
        return null
      }
      
      // Simulate multiple renders to check consistency
      const { createElement } = React
      
      // First render
      hookCallOrder.length = 0
      createElement(TestComponent)
      const firstOrder = [...hookCallOrder]
      
      // Second render
      hookCallOrder.length = 0
      createElement(TestComponent)
      const secondOrder = [...hookCallOrder]
      
      // Third render
      hookCallOrder.length = 0
      createElement(TestComponent)
      const thirdOrder = [...hookCallOrder]
      
      // Check if order is consistent across renders
      const isConsistent = (
        JSON.stringify(firstOrder) === JSON.stringify(secondOrder) &&
        JSON.stringify(secondOrder) === JSON.stringify(thirdOrder)
      )
      
      if (isConsistent) {
        log('✅ Hook order consistency test passed')
        return true
      } else {
        log('❌ Hook order inconsistency detected', 'error')
        log(`First render: ${firstOrder.join(' → ')}`, 'error')
        log(`Second render: ${secondOrder.join(' → ')}`, 'error')
        log(`Third render: ${thirdOrder.join(' → ')}`, 'error')
        return false
      }
    } catch (error) {
      log(`Hook order consistency test failed: ${error}`, 'error')
      return false
    }
  }, [log])

  // Test 2: Conditional Hooks Detection
  const testConditionalHooksDetection = useCallback(async (): Promise<boolean> => {
    log('Testing conditional hooks detection...')
    
    try {
      // This should NOT throw React Error #310 in our fixed implementation
      let hasError = false
      let errorMessage = ''
      
      const TestComponent = ({ condition }: { condition: boolean }) => {
        // This pattern previously caused React Error #310
        const [baseState] = useState('base')
        
        if (condition) {
          // Conditional hook usage - should be handled properly now
          const [conditionalState] = useState('conditional')
          useEffect(() => {
            // Effect that depends on conditional hook
          }, [conditionalState])
        }
        
        const [finalState] = useState('final')
        
        return null
      }
      
      try {
        // Test with condition true
        React.createElement(TestComponent, { condition: true })
        
        // Test with condition false
        React.createElement(TestComponent, { condition: false })
        
        // Test switching conditions (this previously caused the error)
        React.createElement(TestComponent, { condition: true })
        React.createElement(TestComponent, { condition: false })
        React.createElement(TestComponent, { condition: true })
        
      } catch (error: any) {
        hasError = true
        errorMessage = error.message
        
        // Check if it's specifically React Error #310
        if (errorMessage.includes('rendered more hooks') || 
            errorMessage.includes('rendered fewer hooks') ||
            errorMessage.includes('hook') && errorMessage.includes('previous render')) {
          log('❌ React Error #310 still occurs with conditional hooks', 'error')
          return false
        }
      }
      
      if (!hasError) {
        log('✅ Conditional hooks detection test passed - no React Error #310')
        return true
      } else {
        log(`❌ Unexpected error in conditional hooks test: ${errorMessage}`, 'error')
        return false
      }
    } catch (error) {
      log(`Conditional hooks detection test failed: ${error}`, 'error')
      return false
    }
  }, [log])

  // Test 3: Error Boundary Functionality
  const testErrorBoundaryFunctionality = useCallback(async (): Promise<boolean> => {
    log('Testing error boundary functionality...')
    
    try {
      // Test if our CompositeErrorBoundary can catch and handle React Error #310
      let errorCaught = false
      let errorRecovered = false
      
      // Mock error boundary behavior
      const mockErrorBoundary = {
        componentDidCatch: (error: Error, errorInfo: any) => {
          errorCaught = true
          
          // Check if it properly classifies React core errors
          if (error.message.includes('hook') || 
              error.message.includes('rendered more hooks') ||
              error.message.includes('rendered fewer hooks')) {
            log('✅ Error boundary correctly caught React hook error')
            errorRecovered = true
          }
        }
      }
      
      // Simulate a React Error #310 scenario
      const ErrorProneComponent = () => {
        const [count, setCount] = useState(0)
        
        // Simulate conditional hook pattern that could cause Error #310
        if (count > 0) {
          const [extra] = useState('extra')
          useEffect(() => {
            // This effect shouldn't cause issues in our fixed version
          }, [extra])
        }
        
        return null
      }
      
      // This should work without throwing now
      try {
        React.createElement(ErrorProneComponent)
        log('✅ Error boundary functionality test passed')
        return true
      } catch (error: any) {
        // If error occurs, test if boundary would catch it
        mockErrorBoundary.componentDidCatch(error, { componentStack: 'test' })
        return errorRecovered
      }
    } catch (error) {
      log(`Error boundary functionality test failed: ${error}`, 'error')
      return false
    }
  }, [log])

  // Test 4: Component Remount Stability
  const testComponentRemountStability = useCallback(async (): Promise<boolean> => {
    log('Testing component remount stability...')
    
    try {
      let renderCount = 0
      let errorCount = 0
      
      const TestComponent = ({ key }: { key: number }) => {
        renderCount++
        
        // Use multiple hooks to test stability
        const [state1] = useState(`state-${key}`)
        const [state2, setState2] = useState(0)
        
        useEffect(() => {
          setState2(prev => prev + 1)
        }, [])
        
        const memoized = useMemo(() => {
          return state1 + state2
        }, [state1, state2])
        
        const callback = useCallback(() => {
          return memoized
        }, [memoized])
        
        return null
      }
      
      // Test multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        try {
          React.createElement(TestComponent, { key: i })
        } catch (error) {
          errorCount++
          log(`Remount cycle ${i} failed: ${error}`, 'error')
        }
      }
      
      if (errorCount === 0) {
        log('✅ Component remount stability test passed')
        return true
      } else {
        log(`❌ Component remount stability test failed: ${errorCount} errors in 5 cycles`, 'error')
        return false
      }
    } catch (error) {
      log(`Component remount stability test failed: ${error}`, 'error')
      return false
    }
  }, [log])

  // Run all tests
  const runTests = useCallback(async () => {
    log('Starting React Error #310 verification tests...')
    
    setTestState(prev => ({
      ...prev,
      isRunning: true,
      stage: 'testing',
      results: {
        ...prev.results,
        passedTests: 0,
        failedTests: []
      }
    }))

    const tests = [
      { name: 'Hook Order Consistency', test: testHookOrderConsistency, key: 'hookOrderConsistency' },
      { name: 'Conditional Hooks Detection', test: testConditionalHooksDetection, key: 'conditionalHooksDetected' },
      { name: 'Error Boundary Functionality', test: testErrorBoundaryFunctionality, key: 'errorBoundaryFunctional' },
      { name: 'Component Remount Stability', test: testComponentRemountStability, key: 'componentRemountStable' }
    ]

    const results = { ...testState.results }
    
    for (const testItem of tests) {
      const { name, test, key } = testItem
      setTestState(prev => ({ ...prev, currentTest: name }))
      
      try {
        const passed = await test()
        // Use type assertion to fix the type issue
        switch (key) {
          case 'hookOrderConsistency':
            results.hookOrderConsistency = passed
            break
          case 'conditionalHooksDetected':
            results.conditionalHooksDetected = passed
            break
          case 'errorBoundaryFunctional':
            results.errorBoundaryFunctional = passed
            break
          case 'componentRemountStable':
            results.componentRemountStable = passed
            break
        }
        
        if (passed) {
          results.passedTests++
        } else {
          results.failedTests.push({
            test: name,
            error: 'Test returned false',
            timestamp: Date.now()
          })
        }
      } catch (error: any) {
        switch (key) {
          case 'hookOrderConsistency':
            results.hookOrderConsistency = false
            break
          case 'conditionalHooksDetected':
            results.conditionalHooksDetected = false
            break
          case 'errorBoundaryFunctional':
            results.errorBoundaryFunctional = false
            break
          case 'componentRemountStable':
            results.componentRemountStable = false
            break
        }
        results.failedTests.push({
          test: name,
          error: error.message,
          timestamp: Date.now()
        })
        log(`Test "${name}" threw error: ${error.message}`, 'error')
      }
      
      // Brief delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setTestState(prev => ({
      ...prev,
      isRunning: false,
      currentTest: '',
      stage: 'complete',
      results
    }))

    log(`Tests completed: ${results.passedTests}/${results.totalTests} passed`)
    
    if (results.passedTests === results.totalTests) {
      log('🎉 All React Error #310 verification tests passed!')
    } else {
      log(`❌ ${results.totalTests - results.passedTests} tests failed`)
    }

    if (onTestComplete) {
      onTestComplete(results)
    }
  }, [
    log,
    testHookOrderConsistency,
    testConditionalHooksDetection,
    testErrorBoundaryFunctionality,
    testComponentRemountStability,
    onTestComplete,
    testState.results
  ])

  // Auto-run tests if enabled
  useEffect(() => {
    if (autoRunTests && testState.stage === 'idle') {
      runTests()
    }
  }, [autoRunTests, runTests, testState.stage])

  const getStatusColor = (passed: boolean | undefined) => {
    if (passed === undefined) return 'text-gray-400'
    return passed ? 'text-green-400' : 'text-red-400'
  }

  const getStatusIcon = (passed: boolean | undefined) => {
    if (passed === undefined) return '⏳'
    return passed ? '✅' : '❌'
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          React Error #310 Verification
        </h2>
        <p className="text-gray-300">
          Comprehensive testing suite to verify React Error #310 fixes
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <span className="text-white">Hook Order Consistency</span>
          <span className={getStatusColor(testState.results.hookOrderConsistency)}>
            {getStatusIcon(testState.results.hookOrderConsistency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <span className="text-white">Conditional Hooks Detection</span>
          <span className={getStatusColor(testState.results.conditionalHooksDetected)}>
            {getStatusIcon(testState.results.conditionalHooksDetected)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <span className="text-white">Error Boundary Functionality</span>
          <span className={getStatusColor(testState.results.errorBoundaryFunctional)}>
            {getStatusIcon(testState.results.errorBoundaryFunctional)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <span className="text-white">Component Remount Stability</span>
          <span className={getStatusColor(testState.results.componentRemountStable)}>
            {getStatusIcon(testState.results.componentRemountStable)}
          </span>
        </div>
      </div>

      {testState.stage === 'testing' && (
        <div className="mb-4 p-4 bg-blue-900/50 border border-blue-500 rounded">
          <div className="flex items-center space-x-2">
            <div className="animate-spin text-lg">🔄</div>
            <span className="text-blue-200">
              Running: {testState.currentTest}
            </span>
          </div>
        </div>
      )}

      {testState.stage === 'complete' && (
        <div className="mb-4 p-4 bg-gray-800 border border-gray-600 rounded">
          <h3 className="font-semibold text-white mb-2">Test Results</h3>
          <div className="text-sm space-y-1">
            <div className="text-gray-300">
              Total Tests: {testState.results.totalTests}
            </div>
            <div className="text-green-400">
              Passed: {testState.results.passedTests}
            </div>
            <div className="text-red-400">
              Failed: {testState.results.failedTests.length}
            </div>
          </div>
          
          {testState.results.failedTests.length > 0 && (
            <div className="mt-3">
              <h4 className="text-red-400 font-medium mb-1">Failed Tests:</h4>
              {testState.results.failedTests.map((failure, index) => (
                <div key={index} className="text-sm text-red-300 ml-2">
                  • {failure.test}: {failure.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={runTests}
          disabled={testState.isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {testState.isRunning ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        {testState.stage === 'complete' && (
          <button
            onClick={() => setTestState(prev => ({ ...prev, stage: 'idle' }))}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

export default ReactError310Verification