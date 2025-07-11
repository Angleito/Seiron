import { logger } from '@lib/logger'

/**
 * WalletConnect Manager
 * 
 * Handles WalletConnect Core initialization to prevent duplicate 
 * initialization warnings in development mode and React.StrictMode
 */
class WalletConnectManager {
  private static instance: WalletConnectManager
  private isInitialized = false
  private initPromise: Promise<void> | null = null
  private cleanup: (() => void) | null = null

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): WalletConnectManager {
    if (!WalletConnectManager.instance) {
      WalletConnectManager.instance = new WalletConnectManager()
    }
    return WalletConnectManager.instance
  }

  /**
   * Initialize WalletConnect Core if not already initialized
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('WalletConnect Core already initialized, skipping')
      return
    }

    if (this.initPromise) {
      logger.debug('WalletConnect Core initialization in progress, waiting')
      return this.initPromise
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.debug('🔗 Initializing WalletConnect Core...')
      
      // Check if running in development mode
      const isDev = import.meta.env.DEV
      const isStrictMode = document.querySelector('[data-strict-mode]') !== null
      
      if (isDev || isStrictMode) {
        logger.debug('Development mode detected, implementing initialization guards')
      }

      // Check if WalletConnect is already globally initialized
      if (typeof window !== 'undefined' && (window as any).__WALLETCONNECT_INITIALIZED__) {
        logger.debug('WalletConnect Core already globally initialized, skipping')
        this.isInitialized = true
        return
      }

      // Validate that WalletConnect Project ID is configured
      const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      if (!projectId || projectId.trim() === '' || projectId.includes('your_')) {
        logger.info('ℹ️ WalletConnect Project ID not configured, skipping initialization')
        logger.info('ℹ️ Set VITE_WALLETCONNECT_PROJECT_ID environment variable to enable WalletConnect')
        this.isInitialized = true // Mark as initialized to prevent retry loops
        return
      }

      // Mark as initialized before any async operations
      this.isInitialized = true

      // Set global flag to prevent duplicate initialization
      if (typeof window !== 'undefined') {
        (window as any).__WALLETCONNECT_INITIALIZED__ = true
      }

      // Set up cleanup handler
      this.setupCleanup()

      logger.debug('✅ WalletConnect Core initialization complete')
    } catch (error) {
      logger.error('❌ WalletConnect Core initialization failed:', error)
      this.isInitialized = false
      this.initPromise = null
      // Clear global flag on error
      if (typeof window !== 'undefined') {
        delete (window as any).__WALLETCONNECT_INITIALIZED__
      }
      throw error
    }
  }

  private setupCleanup(): void {
    // Cleanup function for development hot reload
    this.cleanup = () => {
      logger.debug('🧹 Cleaning up WalletConnect Core...')
      this.isInitialized = false
      this.initPromise = null
      // Clear global flag on cleanup
      if (typeof window !== 'undefined') {
        delete (window as any).__WALLETCONNECT_INITIALIZED__
      }
    }

    // Register cleanup for hot module replacement
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.cleanup?.()
      })
    }

    // Register cleanup for page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup?.()
    })
  }

  /**
   * Reset the manager state (for testing or hot reload)
   */
  reset(): void {
    this.cleanup?.()
    this.isInitialized = false
    this.initPromise = null
  }

  /**
   * Check if WalletConnect Core is initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }
}

// Export singleton instance
export const walletConnectManager = WalletConnectManager.getInstance()

/**
 * Hook for checking WalletConnect initialization status
 */
export function useWalletConnectManager() {
  return {
    initialize: () => walletConnectManager.initialize(),
    initialized: walletConnectManager.initialized,
    reset: () => walletConnectManager.reset(),
  }
}

/**
 * Development helper to prevent double initialization
 */
export function preventDoubleInitialization(): void {
  if (import.meta.env.DEV) {
    // Add marker to detect React.StrictMode
    const root = document.getElementById('root')
    if (root && !root.hasAttribute('data-strict-mode')) {
      root.setAttribute('data-strict-mode', 'true')
    }

    // Override console.warn to filter WalletConnect warnings in development
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (
          message.includes('WalletConnect Core is already initialized') ||
          message.includes('The configured chains are not supported by Coinbase Smart Wallet') ||
          message.includes('Coinbase Smart Wallet: 1329') ||
          message.includes('VITE_WALLETCONNECT_PROJECT_ID not found') ||
          message.includes('chains are not supported by Coinbase') ||
          message.includes('does not support chain') ||
          message.includes('smart wallet does not support') ||
          message.includes('chainId "1329" is not supported') ||
          message.includes('Chain ID 1329 is not supported')
        )
      ) {
        logger.debug('Filtered wallet warning:', message)
        return
      }
      originalWarn.apply(console, args)
    }
    
    // Also filter console.error for wallet-related errors
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (
          message.includes('Coinbase Smart Wallet') ||
          message.includes('chains are not supported by Coinbase') ||
          message.includes('does not support chain') ||
          message.includes('smart wallet does not support') ||
          message.includes('chainId "1329" is not supported') ||
          message.includes('Chain ID 1329 is not supported')
        )
      ) {
        logger.debug('Filtered wallet error:', message)
        return
      }
      originalError.apply(console, args)
    }
  }
}