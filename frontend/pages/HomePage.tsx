import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import React from 'react'

// Simple Error Boundary Component
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error #310 caught:', error, errorInfo)
    this.props.onError?.(error)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold mb-4">React Error #310 Detected</h1>
            <p className="text-red-400 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <pre className="text-sm bg-black/50 p-4 rounded mb-4 overflow-auto max-w-2xl">
              {this.state.error?.stack}
            </pre>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-600 mr-4"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600"
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

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      // Trigger loading animations
      const timer = setTimeout(() => {
        setIsLoaded(true)
      }, 200)

      return () => clearTimeout(timer)
    } catch (err) {
      console.error('HomePage mount error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return undefined
    }
  }, [])

  const handleNavigation = (path: string): void => {
    try {
      navigate(path)
    } catch (error) {
      console.error(`Navigation error:`, error)
    }
  }

  // Display error if any
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Error Loading Home Page</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <SimpleErrorBoundary onError={(error) => console.error('HomePage error:', error)}>
      <div className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Add simple ASCII dragon first */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-green-400 text-xs font-mono leading-none">
            {`     /\\   /\\   
    (  o.o  )  
     > ^ <     
ASCII DRAGON  `}
          </div>
        </div>
        
        {/* Basic Content */}
        <div className="relative z-50 min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-6xl font-black text-yellow-400 mb-8">
              HOME PAGE LOADED
            </h1>
            <p className="text-2xl text-yellow-400/80 mb-8">
              {isLoaded ? 'Page is ready!' : 'Loading...'}
            </p>
            <button
              onClick={() => handleNavigation('/chat')}
              className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-950 font-black rounded-xl text-xl hover:scale-105 transform transition-all duration-300"
            >
              GO TO CHAT
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="fixed bottom-4 left-4 text-white text-sm bg-black/50 p-4 rounded z-50">
          <p>Debug Info:</p>
          <p>Loaded: {isLoaded ? 'Yes' : 'No'}</p>
          <p>Navigate Ready: Yes</p>
          <p>Dragon: ASCII (Simple)</p>
        </div>
      </div>
    </SimpleErrorBoundary>
  )
}