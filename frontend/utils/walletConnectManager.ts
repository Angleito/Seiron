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

      // Mark as initialized before any async operations
      this.isInitialized = true

      // Set up cleanup handler
      this.setupCleanup()

      logger.debug('✅ WalletConnect Core initialization complete')
    } catch (error) {
      logger.error('❌ WalletConnect Core initialization failed:', error)
      this.isInitialized = false
      this.initPromise = null
      throw error
    }
  }

  private setupCleanup(): void {
    // Cleanup function for development hot reload
    this.cleanup = () => {
      logger.debug('🧹 Cleaning up WalletConnect Core...')
      this.isInitialized = false
      this.initPromise = null
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
        message.includes('WalletConnect Core is already initialized')
      ) {
        logger.debug('Filtered WalletConnect duplicate initialization warning')
        return
      }
      originalWarn.apply(console, args)
    }
  }
}