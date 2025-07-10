'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Zap, Monitor, Settings } from 'lucide-react'
import { webGLRecoveryManager } from '../../utils/webglRecovery'

interface ProductionWebGLErrorBoundaryProps {
  children: ReactNode
  fallbackComponent?: React.ComponentType<any>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRecoverySuccess?: () => void
  onRecoveryFailure?: () => void
  onFallbackRequested?: () => void
  enableAutoRecovery?: boolean
  maxRetries?: number
  enableQualityReduction?: boolean
  showDiagnostics?: boolean
}

interface ProductionWebGLErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  contextLost: boolean
  qualityLevel: number
  diagnostics: any
  showDiagnostics: boolean
  recoveryStrategy: 'standard' | 'aggressive' | 'fallback'
}

export class ProductionWebGLErrorBoundary extends Component<
  ProductionWebGLErrorBoundaryProps,
  ProductionWebGLErrorBoundaryState
> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private diagnosticsUpdateInterval: NodeJS.Timeout | null = null

  constructor(props: ProductionWebGLErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      contextLost: false,
      qualityLevel: 4,
      diagnostics: null,
      showDiagnostics: false,
      recoveryStrategy: 'standard'
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ProductionWebGLErrorBoundaryState> {
    return {
      hasError: true,
      error,
      contextLost: error.message.includes('context') || error.message.includes('WebGL')
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableAutoRecovery = true, maxRetries = 3 } = this.props
    const { retryCount } = this.state

    console.error('ProductionWebGLErrorBoundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount
    })

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      retryCount: prevState.retryCount + 1
    }))

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Determine recovery strategy based on error type and count
    let strategy: 'standard' | 'aggressive' | 'fallback' = 'standard'
    if (retryCount >= 2) {
      strategy = 'aggressive'
    }
    if (retryCount >= maxRetries) {
      strategy = 'fallback'
    }

    this.setState({ recoveryStrategy: strategy })

    // Auto-recovery for WebGL errors
    if (enableAutoRecovery && retryCount < maxRetries) {
      this.scheduleRecovery(strategy)
    }
  }

  override componentDidMount() {
    // Set up WebGL recovery manager listeners
    this.setupRecoveryListeners()
    
    // Update diagnostics periodically
    this.diagnosticsUpdateInterval = setInterval(() => {
      this.updateDiagnostics()
    }, 5000)
  }

  override componentWillUnmount() {
    this.cleanup()
  }

  private setupRecoveryListeners = () => {
    webGLRecoveryManager.on('contextLost', () => {
      this.setState({ contextLost: true, isRecovering: true })
      this.updateDiagnostics()
    })
    
    webGLRecoveryManager.on('contextRestored', () => {
      this.setState({ 
        contextLost: false, 
        isRecovering: false,
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0
      })
      this.updateDiagnostics()
      
      if (this.props.onRecoverySuccess) {
        this.props.onRecoverySuccess()
      }
    })
    
    webGLRecoveryManager.on('recoveryFailed', () => {
      this.setState({ isRecovering: false })
      this.updateDiagnostics()
      
      if (this.props.onRecoveryFailure) {
        this.props.onRecoveryFailure()
      }
    })
    
    webGLRecoveryManager.on('fallback', () => {
      this.handleFallbackMode()
    })

    webGLRecoveryManager.on('qualityChanged', (settings) => {
      this.setState({ qualityLevel: settings.level })
    })
  }
  
  private updateDiagnostics = () => {
    try {
      const diagnostics = webGLRecoveryManager.getDiagnostics()
      this.setState({ 
        diagnostics,
        qualityLevel: diagnostics.qualityLevel
      })
    } catch (error) {
      console.warn('Failed to update WebGL diagnostics:', error)
    }
  }

  private cleanup = () => {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }

    if (this.diagnosticsUpdateInterval) {
      clearInterval(this.diagnosticsUpdateInterval)
      this.diagnosticsUpdateInterval = null
    }
    
    // Remove recovery manager listeners
    webGLRecoveryManager.removeAllListeners()
  }

  private scheduleRecovery = (strategy: 'standard' | 'aggressive' | 'fallback') => {
    this.setState({ isRecovering: true, recoveryStrategy: strategy })
    
    // Different recovery strategies with different delays
    const recoveryDelay = strategy === 'aggressive' ? 500 : 2000
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(strategy)
    }, recoveryDelay)
  }

  private attemptRecovery = (strategy: 'standard' | 'aggressive' | 'fallback') => {
    console.log(`[ProductionWebGLErrorBoundary] Attempting ${strategy} recovery`)
    
    if (strategy === 'fallback') {
      this.handleFallbackMode()
      return
    }

    // Aggressive recovery: reduce quality before attempting
    if (strategy === 'aggressive' && this.props.enableQualityReduction) {
      const currentQuality = this.state.qualityLevel
      if (currentQuality > 0) {
        const newQuality = Math.max(0, currentQuality - 2)
        webGLRecoveryManager.setQualityLevel(newQuality)
        console.log(`[ProductionWebGLErrorBoundary] Reduced quality to ${newQuality} for aggressive recovery`)
      }
    }

    // Force garbage collection if possible
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        ;(window as any).gc()
      } catch (e) {
        // Ignore if GC is not available
      }
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    })
  }

  private handleFallbackMode = () => {
    console.log('[ProductionWebGLErrorBoundary] Triggering fallback mode')
    
    // Emit fallback event
    window.dispatchEvent(new CustomEvent('webgl-fallback-requested'))
    
    // Notify fallback callback
    if (this.props.onFallbackRequested) {
      this.props.onFallbackRequested()
    }
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      retryCount: 0
    })
    
    if (this.props.onRecoverySuccess) {
      this.props.onRecoverySuccess()
    }
  }

  private renderErrorUI = () => {
    const { error, contextLost, isRecovering, retryCount, recoveryStrategy, diagnostics } = this.state
    const { maxRetries = 3 } = this.props

    if (isRecovering) {
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-gray-950 to-black">
          <div className="text-center max-w-md">
            <div className="animate-spin text-6xl mb-6">⚡</div>
            <h2 className="text-2xl font-bold text-blue-300 mb-4">
              Dragon Power Restoration
            </h2>
            <p className="text-gray-400 mb-4">
              {recoveryStrategy === 'aggressive' ? 
                'Applying aggressive recovery measures...' : 
                'Restoring 3D dragon capabilities...'
              }
            </p>
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-300">
                <Monitor className="h-5 w-5" />
                <span className="text-sm font-medium">Recovery Strategy: {recoveryStrategy}</span>
              </div>
              {diagnostics && (
                <div className="mt-2 text-sm text-blue-400">
                  <p>Quality Level: {diagnostics.qualityLevel}/4</p>
                  <p>Context Loss Risk: {diagnostics.contextLossRisk}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (contextLost) {
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-lg w-full bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-blue-800 p-8">
            <div className="text-center">
              <div className="bg-blue-900/20 p-4 rounded-full w-20 h-20 mx-auto mb-6">
                <AlertTriangle className="h-12 w-12 text-blue-400" />
              </div>
              
              <h2 className="text-3xl font-bold text-blue-100 mb-4">
                Dragon Vision Disrupted
              </h2>
              
              <p className="text-gray-400 mb-8 leading-relaxed">
                The 3D dragon's power has been temporarily disrupted. This usually happens when 
                the graphics system needs to reset or when running low on resources.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <button
                  onClick={this.handleManualRetry}
                  className="flex items-center justify-center gap-3 px-6 py-3 
                    bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 
                    text-white rounded-lg font-medium transition-all duration-200 shadow-lg
                    hover:shadow-blue-500/25 hover:scale-[1.02]"
                >
                  <RefreshCw className="h-5 w-5" />
                  Restore Dragon Power
                </button>
                
                <button
                  onClick={this.handleFallbackMode}
                  className="flex items-center justify-center gap-3 px-6 py-3 
                    bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 
                    text-gray-100 rounded-lg font-medium transition-all duration-200 shadow-lg
                    hover:shadow-gray-500/25 hover:scale-[1.02]"
                >
                  <Zap className="h-5 w-5" />
                  Switch to 2D Dragon
                </button>
              </div>

              {/* Diagnostics Panel */}
              {this.props.showDiagnostics && diagnostics && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">System Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Context Losses:</span>
                      <span className="ml-2 text-white font-mono">{diagnostics.contextLossCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Quality Level:</span>
                      <span className="ml-2 text-white font-mono">{diagnostics.qualityLevel}/4</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Recovery Rate:</span>
                      <span className="ml-2 text-white font-mono">
                        {diagnostics.recoveryAttempts > 0 
                          ? `${((diagnostics.successfulRecoveries / diagnostics.recoveryAttempts) * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Risk Level:</span>
                      <span className={`ml-2 font-mono ${
                        diagnostics.contextLossRisk === 'high' ? 'text-red-400' :
                        diagnostics.contextLossRisk === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {diagnostics.contextLossRisk.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Generic WebGL error
    const canRetry = retryCount < maxRetries
    
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-lg w-full bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-orange-800 p-8">
          <div className="text-center">
            <div className="bg-orange-900/20 p-4 rounded-full w-20 h-20 mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-orange-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-orange-100 mb-4">
              Dragon System Error
            </h2>
            
            <p className="text-gray-400 mb-8 leading-relaxed">
              The 3D dragon encountered an unexpected error. This might be due to graphics 
              driver issues, browser limitations, or system resource constraints.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-left">
                <p className="text-sm font-mono text-orange-400 break-words">
                  {error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-8">
              {canRetry && (
                <button
                  onClick={this.handleManualRetry}
                  className="flex items-center justify-center gap-3 px-6 py-3 
                    bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 
                    text-white rounded-lg font-medium transition-all duration-200 shadow-lg
                    hover:shadow-orange-500/25 hover:scale-[1.02]"
                >
                  <RefreshCw className="h-5 w-5" />
                  Retry Dragon ({maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button
                onClick={this.handleFallbackMode}
                className="flex items-center justify-center gap-3 px-6 py-3 
                  bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 
                  text-gray-100 rounded-lg font-medium transition-all duration-200 shadow-lg
                  hover:shadow-gray-500/25 hover:scale-[1.02]"
              >
                <Zap className="h-5 w-5" />
                Use 2D Dragon Instead
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Recovery Strategy: {recoveryStrategy}</p>
              <p>Attempts: {retryCount}/{maxRetries}</p>
              {diagnostics && (
                <p>Quality Level: {diagnostics.qualityLevel}/4</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  override render() {
    const { children, fallbackComponent: FallbackComponent } = this.props
    const { hasError } = this.state

    if (hasError) {
      return FallbackComponent ? <FallbackComponent /> : this.renderErrorUI()
    }

    return children
  }
}

export default ProductionWebGLErrorBoundary