'use client'

import React, { useState } from 'react'
import ReactError310Verification from '../../components/verification/ReactError310Verification'
import { CompositeErrorBoundary } from '@components/error-boundaries'

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

/**
 * Verification page demonstrating React Error #310 fixes
 * Shows comprehensive testing and error boundary integration
 */
const ReactError310VerificationPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleTestComplete = (results: TestResults) => {
    setTestResults(results)
    console.log('React Error #310 Verification Complete:', results)
  }

  const getOverallStatus = () => {
    if (!testResults) return 'pending'
    return testResults.passedTests === testResults.totalTests ? 'success' : 'failure'
  }

  const getStatusBadge = () => {
    const status = getOverallStatus()
    switch (status) {
      case 'success':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200 border border-green-700">
            ✅ All Tests Passed
          </div>
        )
      case 'failure':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-900 text-red-200 border border-red-700">
            ❌ Some Tests Failed
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-900 text-gray-200 border border-gray-700">
            ⏳ Tests Pending
          </div>
        )
    }
  }

  return (
    <CompositeErrorBoundary
      enableAutoRecovery={true}
      enablePerformanceMonitoring={true}
      maxRetries={3}
      onError={(error, errorInfo, errorSource) => {
        console.error('ReactError310VerificationPage Error:', { error, errorInfo, errorSource })
      }}
      onRecovery={(recoveryType) => {
        console.info('ReactError310VerificationPage Recovery:', recoveryType)
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              React Error #310 Fix Verification
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Comprehensive testing suite demonstrating the resolution of React hook rendering errors
            </p>
            {getStatusBadge()}
          </div>

          {/* Main verification component */}
          <div className="mb-12">
            <ReactError310Verification
              onTestComplete={handleTestComplete}
              enableConsoleOutput={true}
              autoRunTests={false}
            />
          </div>

          {/* Detailed results */}
          {testResults && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Detailed Test Results
                </h2>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-lg font-semibold text-white">Test Summary</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Tests:</span>
                      <span className="text-white">{testResults.totalTests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Passed:</span>
                      <span className="text-green-400">{testResults.passedTests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Failed:</span>
                      <span className="text-red-400">{testResults.failedTests.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Success Rate:</span>
                      <span className="text-white">
                        {Math.round((testResults.passedTests / testResults.totalTests) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-lg font-semibold text-white">Individual Tests</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Hook Order Consistency:</span>
                      <span className={testResults.hookOrderConsistency ? 'text-green-400' : 'text-red-400'}>
                        {testResults.hookOrderConsistency ? '✅ Pass' : '❌ Fail'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Conditional Hooks:</span>
                      <span className={testResults.conditionalHooksDetected ? 'text-green-400' : 'text-red-400'}>
                        {testResults.conditionalHooksDetected ? '✅ Pass' : '❌ Fail'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Error Boundary:</span>
                      <span className={testResults.errorBoundaryFunctional ? 'text-green-400' : 'text-red-400'}>
                        {testResults.errorBoundaryFunctional ? '✅ Pass' : '❌ Fail'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Remount Stability:</span>
                      <span className={testResults.componentRemountStable ? 'text-green-400' : 'text-red-400'}>
                        {testResults.componentRemountStable ? '✅ Pass' : '❌ Fail'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {showDetails && testResults.failedTests.length > 0 && (
                <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded">
                  <h3 className="text-lg font-semibold text-red-400 mb-3">Failed Test Details</h3>
                  <div className="space-y-3">
                    {testResults.failedTests.map((failure, index) => (
                      <div key={index} className="p-3 bg-black/20 rounded">
                        <div className="font-medium text-red-300">{failure.test}</div>
                        <div className="text-sm text-red-200 mt-1">{failure.error}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(failure.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error #310 Information */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              About React Error #310
            </h2>
            <div className="space-y-4 text-gray-300">
              <p>
                React Error #310 occurs when components render different numbers of hooks between renders,
                typically caused by conditional hook calls or dynamic component structures.
              </p>
              <p>
                Our implementation includes several fixes to prevent and handle this error:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">ReactError310Handler:</strong> Specialized error boundary
                  that detects and recovers from hook-related errors
                </li>
                <li>
                  <strong className="text-white">CompositeErrorBoundary:</strong> Comprehensive error handling
                  with automatic recovery strategies
                </li>
                <li>
                  <strong className="text-white">Hook order validation:</strong> Runtime checks to ensure
                  consistent hook usage patterns
                </li>
                <li>
                  <strong className="text-white">Component remount stability:</strong> Safe remounting
                  mechanisms that preserve hook order
                </li>
              </ul>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Implementation Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">✅ Completed</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• ReactError310Handler implementation</li>
                  <li>• CompositeErrorBoundary integration</li>
                  <li>• Router error boundary updates</li>
                  <li>• Comprehensive verification testing</li>
                  <li>• WebGL3D route protection</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">🔄 In Progress</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• TypeScript compilation verification</li>
                  <li>• Export file updates</li>
                  <li>• Integration test creation</li>
                  <li>• Performance monitoring integration</li>
                  <li>• Error recovery optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CompositeErrorBoundary>
  )
}

export default ReactError310VerificationPage