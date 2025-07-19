/**
 * WalletConnect Manager
 * 
 * Singleton manager to prevent duplicate WalletConnect initialization
 * and handle the "WalletConnect Core is already initialized" warning
 */

// Global flag to track initialization state
let isWalletConnectInitialized = false
let initializationPromise: Promise<void> | null = null
let consoleFiltersSetup = false

// Store original console methods
const originalWarn = console.warn
const originalError = console.error

/**
 * Filter out WalletConnect duplicate initialization warnings
 */
function setupConsoleFilters() {
  // Guard against multiple setups
  if (consoleFiltersSetup) {
    return
  }
  
  consoleFiltersSetup = true
  
  // Override console.warn to filter WalletConnect warnings
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // Filter out WalletConnect duplicate initialization warnings
    if (
      message.includes('WalletConnect Core is already initialized') ||
      message.includes('Init() was called') ||
      message.includes('WalletConnect')
    ) {
      // Log to debug instead of warn in development
      if (import.meta.env.DEV) {
        console.debug('[WalletConnect] Suppressed warning:', message)
      }
      return
    }
    
    // Pass through other warnings
    originalWarn.apply(console, args)
  }
  
  // Also filter errors related to WalletConnect initialization
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // Only suppress very specific WalletConnect initialization errors
    if (
      message.includes('WalletConnect') && 
      message.includes('already initialized') &&
      !message.includes('generic_error') // Don't suppress generic errors
    ) {
      if (import.meta.env.DEV) {
        console.debug('[WalletConnect] Suppressed error:', message)
      }
      return
    }
    
    // Pass through ALL other errors
    originalError.apply(console, args)
  }
}

/**
 * Cleanup console filters
 */
function cleanupConsoleFilters() {
  console.warn = originalWarn
  console.error = originalError
  consoleFiltersSetup = false
}

/**
 * WalletConnect Manager class
 */
export class WalletConnectManager {
  private static instance: WalletConnectManager | null = null
  private initialized = false
  
  private constructor() {
    // Setup console filters immediately
    setupConsoleFilters()
  }
  
  static getInstance(): WalletConnectManager {
    if (!WalletConnectManager.instance) {
      WalletConnectManager.instance = new WalletConnectManager()
    }
    return WalletConnectManager.instance
  }
  
  /**
   * Initialize WalletConnect (if needed)
   * This is a no-op since Privy handles WalletConnect internally
   */
  async initialize(): Promise<void> {
    // Prevent duplicate initialization
    if (this.initialized || isWalletConnectInitialized) {
      console.debug('[WalletConnect] Already initialized, skipping')
      return
    }
    
    // If initialization is already in progress, wait for it
    if (initializationPromise) {
      return initializationPromise
    }
    
    // Create initialization promise
    initializationPromise = new Promise<void>((resolve) => {
      console.debug('[WalletConnect] Initializing manager...')
      
      // Mark as initialized
      this.initialized = true
      isWalletConnectInitialized = true
      
      // Setup filters are already in place from constructor
      console.debug('[WalletConnect] Console filters active')
      
      resolve()
    })
    
    return initializationPromise
  }
  
  /**
   * Cleanup method for hot module replacement
   */
  cleanup(): void {
    console.debug('[WalletConnect] Cleaning up manager...')
    cleanupConsoleFilters()
    this.initialized = false
    WalletConnectManager.instance = null
  }
  
  /**
   * Check if WalletConnect is initialized
   */
  isInitialized(): boolean {
    return this.initialized && isWalletConnectInitialized
  }
}

// Export singleton instance getter
export const getWalletConnectManager = () => WalletConnectManager.getInstance()

// Setup HMR cleanup if available
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const manager = WalletConnectManager.getInstance()
    manager.cleanup()
    isWalletConnectInitialized = false
    initializationPromise = null
    consoleFiltersSetup = false
  })
}

// Auto-initialize the filters when module loads
// This ensures warnings are caught even before explicit initialization
// DISABLED: This was causing console.error to be overridden globally and suppressing all errors
// if (typeof window !== 'undefined') {
//   setupConsoleFilters()
// }