'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * React Error Boundary specifically designed to catch and handle React Error #310
 * "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined/function"
 */
class ReactError310Handler extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is React Error #310 or similar
    const isReactError310 = 
      error.message.includes('Element type is invalid') ||
      error.message.includes('got: undefined') ||
      error.message.includes('got: function') ||
      error.message.includes('Objects are not valid as a React child') ||
      error.message.includes('Minified React error #310') ||
      error.message.includes('more hooks than during the previous render')

    // Check if this is a cleanup-related error
    const isCleanupError = 
      error.stack?.includes('useEffect') ||
      error.stack?.includes('cleanup') ||
      error.stack?.includes('unmount') ||
      error.message.includes('disposed') ||
      error.message.includes('cleanup')

    if (isReactError310) {
      console.error('🚨 React Error #310 detected:', error.message)
      console.error('🔍 Common causes:')
      console.error('  1. Rendering a function instead of JSX element')
      console.error('  2. Incorrect component import/export')
      console.error('  3. Three.js objects used incorrectly in JSX')
      console.error('  4. useEffect returning invalid values')
      console.error('  5. Hooks called conditionally or in cleanup')
      
      if (isCleanupError) {
        console.error('🧹 Cleanup-related error detected:')
        console.error('  - Check useEffect cleanup functions')
        console.error('  - Ensure cleanup doesn\'t call hooks')
        console.error('  - Verify resource disposal order')
        console.error('  - Add error handling to cleanup operations')
      }
    }

    return {
      hasError: true,
      error
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ReactError310Handler caught error:', error)
    console.error('📍 Error location:', errorInfo.componentStack)
    
    // Check for cleanup-related errors
    const isCleanupError = 
      error.stack?.includes('useEffect') ||
      error.stack?.includes('cleanup') ||
      error.stack?.includes('unmount') ||
      error.message.includes('disposed') ||
      error.message.includes('cleanup')
    
    // Provide detailed debugging information
    if (error.message.includes('Element type is invalid') || error.message.includes('Minified React error #310')) {
      console.error('🔧 React Error #310 Debug Information:')
      console.error('  - Check if all components are properly imported')
      console.error('  - Verify that useEffect hooks don\'t return JSX')
      console.error('  - Ensure Three.js objects are not rendered as React children')
      console.error('  - Check that functions are called, not rendered directly')
      console.error('  - Verify hooks are not called conditionally')
      
      if (isCleanupError) {
        console.error('🧹 Cleanup-specific debugging:')
        console.error('  - Check useEffect cleanup functions for errors')
        console.error('  - Ensure cleanup doesn\'t call hooks')
        console.error('  - Verify resource disposal doesn\'t throw')
        console.error('  - Add try/catch blocks around cleanup operations')
        console.error('  - Check component unmounting order')
      }
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isReactError310 = this.state.error?.message.includes('Element type is invalid') || 
                                this.state.error?.message.includes('Minified React error #310')
      
      const isCleanupError = 
        this.state.error?.stack?.includes('useEffect') ||
        this.state.error?.stack?.includes('cleanup') ||
        this.state.error?.stack?.includes('unmount') ||
        this.state.error?.message.includes('disposed') ||
        this.state.error?.message.includes('cleanup')

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-8">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 max-w-lg text-center text-white">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">
              {isReactError310 ? 'React Error #310 Detected' : 'Component Error'}
            </h2>
            <p className="text-red-200 mb-6">
              {isReactError310 
                ? isCleanupError 
                  ? 'A cleanup function is causing a React rendering error. This often happens during component unmounting.'
                  : 'A function is being rendered as a React child instead of a valid JSX element.'
                : 'An error occurred while rendering this component.'
              }
            </p>
            
            {isReactError310 && (
              <div className="text-left bg-black/20 p-4 rounded mb-4">
                <h3 className="font-semibold mb-2">
                  {isCleanupError ? 'Cleanup Error Fixes:' : 'Common Fixes:'}
                </h3>
                <ul className="text-sm space-y-1">
                  {isCleanupError ? (
                    <>
                      <li>• Add try/catch blocks around cleanup operations</li>
                      <li>• Check useEffect cleanup functions for errors</li>
                      <li>• Ensure cleanup doesn't call hooks</li>
                      <li>• Verify resource disposal order</li>
                    </>
                  ) : (
                    <>
                      <li>• Check useEffect hooks don't return JSX</li>
                      <li>• Verify component imports are correct</li>
                      <li>• Ensure functions are called with ()</li>
                      <li>• Check Three.js objects aren't rendered as children</li>
                    </>
                  )}
                </ul>
              </div>
            )}
            
            {process.env.NODE_ENV === 'development' && (
              <div className="text-left bg-black/20 p-4 rounded mb-4">
                <h3 className="font-semibold mb-2">Error Details:</h3>
                <pre className="text-xs text-red-300 overflow-auto">
                  {this.state.error?.message}
                </pre>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ReactError310Handler