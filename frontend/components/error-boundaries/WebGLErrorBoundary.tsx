import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, Monitor, RefreshCw, Zap } from 'lucide-react'
import { logger } from '@lib/logger'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { webglDiagnostics } from '../../utils/webglDiagnostics'
import { webGLRecoveryManager } from '../../utils/webglRecovery'

interface WebGLErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableAutoRecovery?: boolean
  maxRetries?: number
  enableContextLossRecovery?: boolean
  fallbackComponent?: React.ComponentType<any>
  onRecoverySuccess?: () => void
  onRecoveryFailure?: () => void
  onFallbackRequested?: () => void
}

interface WebGLErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  contextLost: boolean
  webglSupported: boolean
  hardwareAccelerated: boolean
  lastErrorTime: number
  recoveryAttempts: number
  diagnostics: ReturnType<typeof webglDiagnostics.getContextLossStats> | null
}

// WebGL capability detection
const detectWebGLCapabilities = () => {
  if (typeof window === 'undefined') return { supported: false, hardwareAccelerated: false }
  
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  
  if (!gl) {
    return { supported: false, hardwareAccelerated: false }
  }
  
  const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
  const renderer = debugInfo ? (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
  const vendor = debugInfo ? (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
  
  // Check if hardware accelerated
  const isHardwareAccelerated = !renderer.includes('SwiftShader') && 
                               !renderer.includes('Software') &&
                               !vendor.includes('Google Inc.')
  
  return { supported: true, hardwareAccelerated: isHardwareAccelerated }
}

// WebGL error types
enum WebGLErrorType {
  CONTEXT_LOST = 'context_lost',
  MEMORY_ERROR = 'memory_error',
  SHADER_ERROR = 'shader_error',
  TEXTURE_ERROR = 'texture_error',
  GENERIC_ERROR = 'generic_error'
}

// Classify WebGL errors
const classifyWebGLError = (error: Error): WebGLErrorType => {
  const message = error.message.toLowerCase()
  
  if (message.includes('context lost') || message.includes('webglcontextlost')) {
    return WebGLErrorType.CONTEXT_LOST
  }
  if (message.includes('memory') || message.includes('out of memory')) {
    return WebGLErrorType.MEMORY_ERROR
  }
  if (message.includes('shader') || message.includes('program')) {
    return WebGLErrorType.SHADER_ERROR
  }
  if (message.includes('texture') || message.includes('framebuffer')) {
    return WebGLErrorType.TEXTURE_ERROR
  }
  
  return WebGLErrorType.GENERIC_ERROR
}

export class WebGLErrorBoundary extends Component<WebGLErrorBoundaryProps, WebGLErrorBoundaryState> {
  private contextLostListener: ((event: Event) => void) | null = null
  private contextRestoredListener: ((event: Event) => void) | null = null
  private recoveryTimer: NodeJS.Timeout | null = null
  private canvasRef: HTMLCanvasElement | null = null

  constructor(props: WebGLErrorBoundaryProps) {
    super(props)
    
    const capabilities = detectWebGLCapabilities()
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      contextLost: false,
      webglSupported: capabilities.supported,
      hardwareAccelerated: capabilities.hardwareAccelerated,
      lastErrorTime: 0,
      recoveryAttempts: 0,
      diagnostics: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<WebGLErrorBoundaryState> {
    const errorType = classifyWebGLError(error)
    
    return {
      hasError: true,
      error,
      contextLost: errorType === WebGLErrorType.CONTEXT_LOST,
      lastErrorTime: Date.now()
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRetries = 3, enableAutoRecovery = true } = this.props
    const { retryCount } = this.state
    
    const errorType = classifyWebGLError(error)
    
    // Log detailed WebGL error information
    logger.error('WebGL Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      webglSupported: this.state.webglSupported,
      hardwareAccelerated: this.state.hardwareAccelerated
    })

    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1
    }))

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Auto-recovery for certain error types
    if (enableAutoRecovery && retryCount < maxRetries) {
      this.scheduleRecovery(errorType)
    }
  }

  override componentDidMount() {
    // Set up WebGL context loss listeners
    if (this.props.enableContextLossRecovery && typeof window !== 'undefined') {
      this.setupContextLossListeners()
    }
    
    // Set up WebGL recovery manager listeners
    this.setupRecoveryListeners()
    
    // Update diagnostics
    this.updateDiagnostics()
  }

  override componentWillUnmount() {
    this.cleanup()
  }

  private setupContextLossListeners = () => {
    if (typeof window === 'undefined') return

    // Find any canvas elements that might be used by Three.js
    const canvases = document.querySelectorAll('canvas')
    
    this.contextLostListener = (event: Event) => {
      event.preventDefault()
      logger.warn('WebGL context lost detected')
      this.setState({ contextLost: true })
    }

    this.contextRestoredListener = (event: Event) => {
      logger.info('WebGL context restored')
      this.setState({ contextLost: false })
      this.handleContextRestored()
    }

    canvases.forEach(canvas => {
      canvas.addEventListener('webglcontextlost', this.contextLostListener!, false)
      canvas.addEventListener('webglcontextrestored', this.contextRestoredListener!, false)
    })
  }

  private setupRecoveryListeners = () => {
    // Listen to recovery manager events
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
        errorInfo: null
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
  }
  
  private updateDiagnostics = () => {
    try {
      const diagnostics = webglDiagnostics.getContextLossStats()
      this.setState({ diagnostics })
    } catch (error) {
      console.warn('Failed to update WebGL diagnostics:', error)
    }
  }

  private cleanup = () => {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }

    if (this.contextLostListener && this.contextRestoredListener) {
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        canvas.removeEventListener('webglcontextlost', this.contextLostListener!)
        canvas.removeEventListener('webglcontextrestored', this.contextRestoredListener!)
      })
    }
    
    // Remove recovery manager listeners
    webGLRecoveryManager.removeAllListeners()
  }

  private scheduleRecovery = (errorType: WebGLErrorType) => {
    this.setState({ isRecovering: true })
    
    // Different recovery strategies based on error type
    const recoveryDelay = this.getRecoveryDelay(errorType)
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType)
    }, recoveryDelay)
  }

  private getRecoveryDelay = (errorType: WebGLErrorType): number => {
    switch (errorType) {
      case WebGLErrorType.CONTEXT_LOST:
        return 2000 // Wait 2 seconds for context restoration
      case WebGLErrorType.MEMORY_ERROR:
        return 5000 // Wait 5 seconds for memory cleanup
      case WebGLErrorType.SHADER_ERROR:
        return 1000 // Quick retry for shader errors
      case WebGLErrorType.TEXTURE_ERROR:
        return 3000 // Medium wait for texture issues
      default:
        return 2000
    }
  }

  private attemptRecovery = (errorType: WebGLErrorType) => {
    logger.info(`Attempting recovery for ${errorType}`)
    
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

  private handleContextRestored = () => {
    // Reset error state when context is restored
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      contextLost: false,
      isRecovering: false
    })
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    })
    
    // Notify success callback
    if (this.props.onRecoverySuccess) {
      this.props.onRecoverySuccess()
    }
  }

  private handleFallbackMode = () => {
    // Force fallback to 2D mode
    window.dispatchEvent(new CustomEvent('webgl-fallback-requested'))
    
    // Notify fallback callback
    if (this.props.onFallbackRequested) {
      this.props.onFallbackRequested()
    }
  }

  private renderErrorUI = () => {
    const { error, contextLost, webglSupported, hardwareAccelerated, retryCount, isRecovering, diagnostics } = this.state
    const { maxRetries = 3 } = this.props

    if (isRecovering) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-blue-300 mb-2">Restoring Dragon Power...</h3>
            <p className="text-gray-400">WebGL context is being restored</p>
            {diagnostics && (
              <div className="mt-4 text-sm text-gray-500">
                <p>Recovery Rate: {(diagnostics.recoveryRate * 100).toFixed(1)}%</p>
                <p>Avg Recovery Time: {diagnostics.averageRecoveryTime.toFixed(0)}ms</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (contextLost) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-blue-800 p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-900/20 p-3 rounded-full">
                <Monitor className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-blue-100 text-center mb-2">
              WebGL Context Lost
            </h2>
            
            <p className="text-gray-400 text-center mb-4">
              The 3D graphics context has been lost. This usually happens when the GPU driver resets.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleManualRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry 3D Dragon
              </button>
              
              <button
                onClick={this.handleFallbackMode}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
              >
                <Zap className="h-4 w-4" />
                Use 2D Dragon
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (!webglSupported) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-red-800 p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-900/20 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-red-100 text-center mb-2">
              WebGL Not Supported
            </h2>
            
            <p className="text-gray-400 text-center mb-4">
              Your browser or device doesn't support WebGL. The Dragon will use 2D mode instead.
            </p>

            <button
              onClick={this.handleFallbackMode}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
            >
              <Zap className="h-4 w-4" />
              Continue with 2D Dragon
            </button>
          </div>
        </div>
      )
    }

    const errorType = error ? classifyWebGLError(error) : WebGLErrorType.GENERIC_ERROR
    const canRetry = retryCount < maxRetries

    return (
      <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-orange-800 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-orange-900/20 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-orange-100 text-center mb-2">
            3D Dragon Power Disrupted
          </h2>
          
          <p className="text-gray-400 text-center mb-4">
            {this.getErrorMessage(errorType)}
          </p>

          {!hardwareAccelerated && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
              <p className="text-sm text-yellow-400">
                ⚠️ Hardware acceleration is not available. This may cause performance issues.
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm font-mono text-orange-400 break-words">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {canRetry && (
              <button
                onClick={this.handleManualRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={this.handleFallbackMode}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
            >
              <Zap className="h-4 w-4" />
              Use 2D Dragon Instead
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Error Type: {errorType} | Retry: {retryCount}/{maxRetries}
          </p>
          
          {diagnostics && diagnostics.totalLosses > 0 && (
            <div className="mt-2 text-xs text-gray-600 text-center">
              <p>Context Losses: {diagnostics.totalLosses} | Recovery Rate: {(diagnostics.recoveryRate * 100).toFixed(1)}%</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  private getErrorMessage = (errorType: WebGLErrorType): string => {
    switch (errorType) {
      case WebGLErrorType.CONTEXT_LOST:
        return "The 3D graphics context was lost. This usually happens when the GPU driver resets."
      case WebGLErrorType.MEMORY_ERROR:
        return "Not enough GPU memory available for the 3D dragon. Try closing other applications."
      case WebGLErrorType.SHADER_ERROR:
        return "A shader compilation error occurred. The dragon's visual effects may not work properly."
      case WebGLErrorType.TEXTURE_ERROR:
        return "Failed to load dragon textures. The dragon may appear without proper colors."
      default:
        return "An unexpected 3D graphics error occurred. The dragon's power is temporarily disrupted."
    }
  }

  override render() {
    const { children, fallback } = this.props
    const { hasError } = this.state

    if (hasError) {
      return fallback || this.renderErrorUI()
    }

    return children
  }
}

// Higher-order component for wrapping dragon components
export function withWebGLErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<WebGLErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <WebGLErrorBoundary {...options}>
      <Component {...props} />
    </WebGLErrorBoundary>
  )
  
  WrappedComponent.displayName = `withWebGLErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized Dragon WebGL Error Boundary with Dragon Ball theme
export const DragonWebGLErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary
    name="3D Dragon System"
    level="component"
    enableDragonAnimation={true}
    onError={(error, errorInfo) => {
      // Custom handling for WebGL errors
      const errorType = classifyWebGLError(error)
      logger.error('Dragon WebGL Error:', { error, errorInfo, errorType })
    }}
  >
    <WebGLErrorBoundary
      enableAutoRecovery={true}
      enableContextLossRecovery={true}
      maxRetries={2}
    >
      {children}
    </WebGLErrorBoundary>
  </DragonBallErrorBoundary>
)

export default WebGLErrorBoundary