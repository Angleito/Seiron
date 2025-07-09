import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Wallet, WifiOff, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react'
import { logger } from '@lib/logger'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'

interface WalletErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableAutoRecovery?: boolean
  maxRetries?: number
  onWalletReconnect?: () => void
}

interface WalletErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  lastErrorTime: number
  walletAvailable: boolean
}

// Wallet error types
enum WalletErrorType {
  CONNECTION_FAILED = 'connection_failed',
  NETWORK_ERROR = 'network_error',
  USER_REJECTED = 'user_rejected',
  WALLET_NOT_INSTALLED = 'wallet_not_installed',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  TRANSACTION_FAILED = 'transaction_failed',
  PERMISSION_DENIED = 'permission_denied',
  GENERIC_ERROR = 'generic_error'
}

// Classify wallet errors
const classifyWalletError = (error: Error): WalletErrorType => {
  const message = error.message.toLowerCase()
  
  if (message.includes('user rejected') || message.includes('user denied')) {
    return WalletErrorType.USER_REJECTED
  }
  if (message.includes('not installed') || message.includes('no provider')) {
    return WalletErrorType.WALLET_NOT_INSTALLED
  }
  if (message.includes('insufficient funds') || message.includes('not enough')) {
    return WalletErrorType.INSUFFICIENT_FUNDS
  }
  if (message.includes('transaction failed') || message.includes('tx failed')) {
    return WalletErrorType.TRANSACTION_FAILED
  }
  if (message.includes('permission denied') || message.includes('unauthorized')) {
    return WalletErrorType.PERMISSION_DENIED
  }
  if (message.includes('network') || message.includes('connection')) {
    return WalletErrorType.NETWORK_ERROR
  }
  if (message.includes('connection failed') || message.includes('connect')) {
    return WalletErrorType.CONNECTION_FAILED
  }
  
  return WalletErrorType.GENERIC_ERROR
}

// Check if wallet is available
const checkWalletAvailability = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // Check for common wallet providers
  const providers = [
    'ethereum',
    'keplr',
    'leap',
    'fin',
    'compass'
  ]
  
  return providers.some(provider => (window as any)[provider])
}

export class WalletErrorBoundary extends Component<WalletErrorBoundaryProps, WalletErrorBoundaryState> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private walletCheckTimer: NodeJS.Timeout | null = null

  constructor(props: WalletErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      lastErrorTime: 0,
      walletAvailable: checkWalletAvailability()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<WalletErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRetries = 3, enableAutoRecovery = true } = this.props
    const { retryCount } = this.state
    
    const errorType = classifyWalletError(error)
    
    // Log detailed wallet error information
    logger.error('Wallet Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      walletAvailable: this.state.walletAvailable
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
    if (enableAutoRecovery && retryCount < maxRetries && this.shouldAutoRecover(errorType)) {
      this.scheduleRecovery(errorType)
    }
  }

  override componentDidMount() {
    // Start periodic wallet availability checks
    this.startWalletMonitoring()
  }

  override componentWillUnmount() {
    this.cleanup()
  }

  private startWalletMonitoring = () => {
    this.walletCheckTimer = setInterval(() => {
      const walletAvailable = checkWalletAvailability()
      if (walletAvailable !== this.state.walletAvailable) {
        this.setState({ walletAvailable })
        
        // If wallet became available and we have an error, try to recover
        if (walletAvailable && this.state.hasError && this.state.retryCount < (this.props.maxRetries || 3)) {
          this.attemptRecovery(WalletErrorType.CONNECTION_FAILED)
        }
      }
    }, 2000)
  }

  private cleanup = () => {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    
    if (this.walletCheckTimer) {
      clearInterval(this.walletCheckTimer)
      this.walletCheckTimer = null
    }
  }

  private shouldAutoRecover = (errorType: WalletErrorType): boolean => {
    // Don't auto-recover for user rejection or permission errors
    return ![
      WalletErrorType.USER_REJECTED,
      WalletErrorType.PERMISSION_DENIED,
      WalletErrorType.WALLET_NOT_INSTALLED,
      WalletErrorType.INSUFFICIENT_FUNDS
    ].includes(errorType)
  }

  private scheduleRecovery = (errorType: WalletErrorType) => {
    this.setState({ isRecovering: true })
    
    const recoveryDelay = this.getRecoveryDelay(errorType)
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType)
    }, recoveryDelay)
  }

  private getRecoveryDelay = (errorType: WalletErrorType): number => {
    switch (errorType) {
      case WalletErrorType.CONNECTION_FAILED:
        return 3000 // Wait 3 seconds for connection retry
      case WalletErrorType.NETWORK_ERROR:
        return 5000 // Wait 5 seconds for network issues
      case WalletErrorType.TRANSACTION_FAILED:
        return 2000 // Quick retry for failed transactions
      default:
        return 3000
    }
  }

  private attemptRecovery = (errorType: WalletErrorType) => {
    logger.info(`Attempting wallet recovery for ${errorType}`)
    
    // Check if wallet is now available
    const walletAvailable = checkWalletAvailability()
    
    if (!walletAvailable && errorType === WalletErrorType.WALLET_NOT_INSTALLED) {
      this.setState({ isRecovering: false })
      return
    }

    // Call the wallet reconnection handler if provided
    if (this.props.onWalletReconnect) {
      try {
        this.props.onWalletReconnect()
      } catch (error) {
        logger.error('Wallet reconnection failed:', error)
      }
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      walletAvailable
    })
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    })
  }

  private handleInstallWallet = () => {
    // Open wallet installation page
    window.open('https://metamask.io/download/', '_blank')
  }

  private handleNetworkSwitch = () => {
    // Trigger network switch if possible
    window.dispatchEvent(new CustomEvent('wallet-network-switch-requested'))
  }

  private renderErrorUI = () => {
    const { error, walletAvailable, retryCount, isRecovering } = this.state
    const { maxRetries = 3 } = this.props

    if (isRecovering) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-blue-300 mb-2">Reconnecting Wallet...</h3>
            <p className="text-gray-400">Attempting to restore connection</p>
          </div>
        </div>
      )
    }

    if (!walletAvailable) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-purple-800 p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-purple-900/20 p-3 rounded-full">
                <Wallet className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-purple-100 text-center mb-2">
              Wallet Not Found
            </h2>
            
            <p className="text-gray-400 text-center mb-4">
              No compatible wallet was detected. Please install a wallet to continue.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleInstallWallet}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Install MetaMask
              </button>
              
              <button
                onClick={this.handleManualRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Check Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    const errorType = error ? classifyWalletError(error) : WalletErrorType.GENERIC_ERROR
    const canRetry = retryCount < maxRetries

    return (
      <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-red-800 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-900/20 p-3 rounded-full">
              {errorType === WalletErrorType.NETWORK_ERROR ? (
                <WifiOff className="h-8 w-8 text-red-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-red-100 text-center mb-2">
            {this.getErrorTitle(errorType)}
          </h2>
          
          <p className="text-gray-400 text-center mb-4">
            {this.getErrorMessage(errorType)}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm font-mono text-red-400 break-words">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {canRetry && this.shouldShowRetry(errorType) && (
              <button
                onClick={this.handleManualRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            {errorType === WalletErrorType.NETWORK_ERROR && (
              <button
                onClick={this.handleNetworkSwitch}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <WifiOff className="h-4 w-4" />
                Switch Network
              </button>
            )}
            
            {errorType === WalletErrorType.WALLET_NOT_INSTALLED && (
              <button
                onClick={this.handleInstallWallet}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Install Wallet
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Error Type: {errorType} | Retry: {retryCount}/{maxRetries}
          </p>
        </div>
      </div>
    )
  }

  private getErrorTitle = (errorType: WalletErrorType): string => {
    switch (errorType) {
      case WalletErrorType.CONNECTION_FAILED:
        return "Connection Failed"
      case WalletErrorType.NETWORK_ERROR:
        return "Network Error"
      case WalletErrorType.USER_REJECTED:
        return "Connection Rejected"
      case WalletErrorType.WALLET_NOT_INSTALLED:
        return "Wallet Not Installed"
      case WalletErrorType.INSUFFICIENT_FUNDS:
        return "Insufficient Funds"
      case WalletErrorType.TRANSACTION_FAILED:
        return "Transaction Failed"
      case WalletErrorType.PERMISSION_DENIED:
        return "Permission Denied"
      default:
        return "Wallet Error"
    }
  }

  private getErrorMessage = (errorType: WalletErrorType): string => {
    switch (errorType) {
      case WalletErrorType.CONNECTION_FAILED:
        return "Failed to connect to your wallet. Please try again."
      case WalletErrorType.NETWORK_ERROR:
        return "Network connection issues detected. Check your internet connection."
      case WalletErrorType.USER_REJECTED:
        return "You rejected the wallet connection request. Please try again if you want to connect."
      case WalletErrorType.WALLET_NOT_INSTALLED:
        return "No compatible wallet found. Please install MetaMask or another supported wallet."
      case WalletErrorType.INSUFFICIENT_FUNDS:
        return "Insufficient funds to complete the transaction. Please add funds to your wallet."
      case WalletErrorType.TRANSACTION_FAILED:
        return "The transaction failed to process. Please try again."
      case WalletErrorType.PERMISSION_DENIED:
        return "Wallet permission denied. Please check your wallet settings."
      default:
        return "An unexpected wallet error occurred. Please try again."
    }
  }

  private shouldShowRetry = (errorType: WalletErrorType): boolean => {
    // Don't show retry for user rejection or wallet not installed
    return ![
      WalletErrorType.USER_REJECTED,
      WalletErrorType.WALLET_NOT_INSTALLED
    ].includes(errorType)
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

// Higher-order component for wrapping wallet components
export function withWalletErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<WalletErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <WalletErrorBoundary {...options}>
      <Component {...props} />
    </WalletErrorBoundary>
  )
  
  WrappedComponent.displayName = `withWalletErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized Dragon Ball themed wallet error boundary
export const DragonWalletErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary
    name="Wallet System"
    level="component"
    enableDragonAnimation={true}
    onError={(error, errorInfo) => {
      // Custom handling for wallet errors
      const errorType = classifyWalletError(error)
      logger.error('Dragon Wallet Error:', { error, errorInfo, errorType })
    }}
  >
    <WalletErrorBoundary
      enableAutoRecovery={true}
      maxRetries={3}
    >
      {children}
    </WalletErrorBoundary>
  </DragonBallErrorBoundary>
)

export default WalletErrorBoundary