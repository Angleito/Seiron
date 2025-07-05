import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface LazyLoadingBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  featureName?: string
  showProgress?: boolean
  preloader?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface LazyLoadingBoundaryState {
  hasError: boolean
  error: Error | null
  progress: number
}

/**
 * Enhanced loading boundary for lazy-loaded components
 * Provides error handling, progress tracking, and retry functionality
 */
export class LazyLoadingBoundary extends Component<LazyLoadingBoundaryProps, LazyLoadingBoundaryState> {
  private progressInterval: NodeJS.Timeout | null = null

  constructor(props: LazyLoadingBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      progress: 0
    }
  }

  static getDerivedStateFromError(error: Error): LazyLoadingBoundaryState {
    return {
      hasError: true,
      error,
      progress: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LazyLoadingBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  componentDidMount() {
    if (this.props.showProgress) {
      this.startProgressTracking()
    }
  }

  componentWillUnmount() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
    }
  }

  private startProgressTracking = () => {
    this.progressInterval = setInterval(() => {
      this.setState(prevState => ({
        progress: Math.min(prevState.progress + 10, 90)
      }))
    }, 200)
  }

  private stopProgressTracking = () => {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }
    this.setState({ progress: 100 })
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      progress: 0
    })
    
    if (this.props.preloader) {
      this.props.preloader()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Failed to load {this.props.featureName || 'component'}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    const defaultFallback = (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-2 text-sm text-gray-600">
            Loading {this.props.featureName || 'component'}...
          </p>
          {this.props.showProgress && (
            <div className="mt-2 w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${this.state.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    )

    return (
      <Suspense fallback={this.props.fallback || defaultFallback}>
        {this.props.children}
      </Suspense>
    )
  }
}

/**
 * Hook version of LazyLoadingBoundary for functional components
 */
export const useLazyLoadingBoundary = (featureName?: string) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [progress, setProgress] = React.useState(0)

  const reset = () => {
    setError(null)
    setProgress(0)
  }

  const startLoading = () => {
    setIsLoading(true)
    setProgress(0)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setProgress(100)
  }

  const setLoadingError = (error: Error) => {
    setError(error)
    setIsLoading(false)
  }

  return {
    isLoading,
    error,
    progress,
    reset,
    startLoading,
    stopLoading,
    setLoadingError
  }
}

/**
 * Wrapper component for specific feature lazy loading
 */
export const FeatureLazyBoundary: React.FC<{
  children: ReactNode
  featureName: string
  icon?: ReactNode
  description?: string
}> = ({ children, featureName, icon, description }) => {
  const fallback = (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
      <div className="text-center">
        {icon && <div className="mb-2">{icon}</div>}
        <LoadingSpinner />
        <p className="mt-2 font-medium text-gray-900">Loading {featureName}</p>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
    </div>
  )

  return (
    <LazyLoadingBoundary
      fallback={fallback}
      featureName={featureName}
      showProgress={true}
    >
      {children}
    </LazyLoadingBoundary>
  )
}