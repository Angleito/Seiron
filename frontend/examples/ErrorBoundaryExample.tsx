import { useState } from 'react'
import { 
  ErrorBoundary, 
  withErrorBoundary, 
  useErrorHandler,
  PageErrorBoundary,
  ChatErrorBoundary,
  VoiceErrorBoundary,
  DragonErrorBoundary
} from '@components/error-boundaries'
import { useAsyncError } from '@hooks/useAsyncError'

// Example component that throws an error
function BuggyComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('This is a test error from BuggyComponent!')
  }
  
  return <div className="p-4 bg-green-100 rounded">Component is working fine!</div>
}

// Example component with async error
function AsyncBuggyComponent() {
  const throwError = useAsyncError()
  const [loading, setLoading] = useState(false)
  
  const handleAsyncError = async () => {
    setLoading(true)
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Simulate error
      throw new Error('Async operation failed!')
    } catch (error) {
      throwError(error)
    }
  }
  
  return (
    <div className="p-4 bg-blue-100 rounded">
      <button
        onClick={handleAsyncError}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Trigger Async Error'}
      </button>
    </div>
  )
}

// Example with custom error handling
function CustomErrorComponent() {
  const handleError = useErrorHandler()
  
  const triggerCustomError = () => {
    try {
      // Some operation that might fail
      const result = Math.random()
      if (result > 0.5) {
        throw new Error('Random error occurred!')
      }
      alert('Operation succeeded!')
    } catch (error) {
      handleError(error as Error)
    }
  }
  
  return (
    <div className="p-4 bg-purple-100 rounded">
      <button
        onClick={triggerCustomError}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        50% Chance of Error
      </button>
    </div>
  )
}

// Component wrapped with HOC
const SafeComponent = withErrorBoundary(
  function RiskyComponent() {
    const [count, setCount] = useState(0)
    
    // Throw error when count reaches 5
    if (count >= 5) {
      throw new Error('Count is too high!')
    }
    
    return (
      <div className="p-4 bg-yellow-100 rounded">
        <p className="mb-2">Count: {count}</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Increment (crashes at 5)
        </button>
      </div>
    )
  },
  { name: 'SafeComponent' }
)

// Main example component
export function ErrorBoundaryExample() {
  const [showBuggy, setShowBuggy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  
  return (
    <PageErrorBoundary pageName="Error Boundary Example">
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-red-100 mb-8">
          Error Boundary Examples
        </h1>
        
        {/* Basic Error Boundary */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-red-200">
            Basic Error Boundary
          </h2>
          <ErrorBoundary 
            name="Basic Example"
            onError={(error, errorInfo) => {
              console.log('Error caught:', error.message)
              console.log('Error info:', errorInfo)
            }}
          >
            <div className="space-y-4">
              <button
                onClick={() => setShowBuggy(!showBuggy)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {showBuggy ? 'Hide' : 'Show'} Buggy Component
              </button>
              {showBuggy && <BuggyComponent shouldCrash={true} />}
            </div>
          </ErrorBoundary>
        </section>
        
        {/* Async Error Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-red-200">
            Async Error Handling
          </h2>
          <ErrorBoundary name="Async Example">
            <AsyncBuggyComponent />
          </ErrorBoundary>
        </section>
        
        {/* Custom Error Handler */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-red-200">
            Custom Error Handler
          </h2>
          <ErrorBoundary name="Custom Handler">
            <CustomErrorComponent />
          </ErrorBoundary>
        </section>
        
        {/* HOC Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-red-200">
            HOC Error Boundary
          </h2>
          <div key={resetKey}>
            <SafeComponent />
          </div>
          <button
            onClick={() => setResetKey(k => k + 1)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset Component
          </button>
        </section>
        
        {/* Specialized Error Boundaries */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-red-200">
            Specialized Error Boundaries
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chat Error Boundary */}
            <ChatErrorBoundary>
              <div className="p-4 bg-gray-800 rounded">
                <h3 className="font-semibold mb-2">Chat Component</h3>
                <p className="text-sm text-gray-400">
                  This would be wrapped in a ChatErrorBoundary
                </p>
              </div>
            </ChatErrorBoundary>
            
            {/* Voice Error Boundary */}
            <VoiceErrorBoundary>
              <div className="p-4 bg-gray-800 rounded">
                <h3 className="font-semibold mb-2">Voice Component</h3>
                <p className="text-sm text-gray-400">
                  This would be wrapped in a VoiceErrorBoundary
                </p>
              </div>
            </VoiceErrorBoundary>
            
            {/* Dragon Error Boundary */}
            <DragonErrorBoundary>
              <div className="p-4 bg-gray-800 rounded">
                <h3 className="font-semibold mb-2">Dragon Component</h3>
                <p className="text-sm text-gray-400">
                  This would be wrapped in a DragonErrorBoundary
                </p>
              </div>
            </DragonErrorBoundary>
          </div>
        </section>
        
        {/* Instructions */}
        <section className="mt-8 p-4 bg-gray-900 rounded border border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">
            Implementation Notes
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
            <li>Error boundaries catch errors in child components</li>
            <li>They provide fallback UI when errors occur</li>
            <li>Errors are logged for debugging</li>
            <li>Users can recover without losing the entire app</li>
            <li>Specialized boundaries provide context-specific error handling</li>
          </ul>
        </section>
      </div>
    </PageErrorBoundary>
  )
}