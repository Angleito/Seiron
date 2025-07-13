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
        <div className="absolute top-20 left-20">
          <pre className="text-green-400 text-sm font-mono leading-tight">
{`     /\\   /\\   
    (  o.o  )  
     > ^ <     
ASCII DRAGON`}
          </pre>
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
            <div className="flex flex-col gap-4">
              <div className="space-y-4">
                <button
                  onClick={() => handleNavigation('/chat')}
                  className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-950 font-black rounded-xl text-xl hover:scale-105 transform transition-all duration-300 block"
                >
                  GO TO CHAT
                </button>
              
              {/* Dragon Demo Navigation */}
              <div className="pt-8">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">🐉 Dragon Demonstrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  <button
                    onClick={() => handleNavigation('/dragons/ascii-complex')}
                    className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:scale-105 transform transition-all duration-300 text-left"
                  >
                    <div className="text-lg font-bold">Complex ASCII Dragons</div>
                    <div className="text-sm opacity-80">Various ASCII dragon styles with theming</div>
                  </button>
                  
                  <button
                    onClick={() => handleNavigation('/dragons/ascii-animated')}
                    className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:scale-105 transform transition-all duration-300 text-left"
                  >
                    <div className="text-lg font-bold">Animated ASCII Dragons</div>
                    <div className="text-sm opacity-80">Frame-based animations with voice reactivity</div>
                  </button>
                  
                  <button
                    onClick={() => handleNavigation('/dragons/sprite-2d')}
                    className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-lg hover:scale-105 transform transition-all duration-300 text-left"
                  >
                    <div className="text-lg font-bold">2D Sprite Dragons</div>
                    <div className="text-sm opacity-80">CSS and Unicode sprite animations</div>
                  </button>
                  
                  <button
                    onClick={() => handleNavigation('/dragons/webgl-3d')}
                    className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:scale-105 transform transition-all duration-300 text-left"
                  >
                    <div className="text-lg font-bold">3D WebGL Dragons</div>
                    <div className="text-sm opacity-80">Hardware-accelerated 3D rendering</div>
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="fixed bottom-4 left-4 text-white text-sm bg-black/50 p-4 rounded z-50">
          <p>Debug Info:</p>
          <p>Loaded: {isLoaded ? 'Yes' : 'No'}</p>
          <p>Navigate Ready: Yes</p>
          <p>Dragon: ASCII (Simple)</p>
          <p>Dragon Demos: 4 Available</p>
        </div>
      </div>
    </SimpleErrorBoundary>
  )
}