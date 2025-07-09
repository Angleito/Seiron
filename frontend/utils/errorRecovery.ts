import { logger } from '@lib/logger'

// Common error recovery utilities
export interface ErrorRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  onRetry?: (attempt: number, error: Error) => void
  onGiveUp?: (error: Error) => void
}

export interface RetryableOperation<T> {
  operation: () => Promise<T>
  name: string
  options?: ErrorRecoveryOptions
}

// Generic retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onGiveUp
  } = options

  let lastError: Error = new Error('Unknown error')
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        if (onGiveUp) {
          onGiveUp(lastError)
        }
        throw lastError
      }
      
      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }
      
      // Calculate delay with exponential backoff
      const delay = exponentialBackoff 
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay
      
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// WebGL-specific error recovery
export class WebGLErrorRecovery {
  private static instance: WebGLErrorRecovery
  private contextLossListeners: Map<HTMLCanvasElement, (event: Event) => void> = new Map()
  private contextRestoreListeners: Map<HTMLCanvasElement, (event: Event) => void> = new Map()

  static getInstance(): WebGLErrorRecovery {
    if (!this.instance) {
      this.instance = new WebGLErrorRecovery()
    }
    return this.instance
  }

  // Check if WebGL is supported
  static isWebGLSupported(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      return !!gl
    } catch (error) {
      return false
    }
  }

  // Check if hardware acceleration is available
  static isHardwareAccelerated(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      
      if (!gl) return false
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (!debugInfo) return true // Assume hardware accelerated if we can't detect
      
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      return !renderer.includes('SwiftShader') && !renderer.includes('Software')
    } catch (error) {
      return false
    }
  }

  // Register context loss recovery for a canvas
  registerContextLossRecovery(
    canvas: HTMLCanvasElement,
    onContextLoss: () => void,
    onContextRestore: () => void
  ) {
    const lossHandler = (event: Event) => {
      event.preventDefault()
      logger.warn('WebGL context lost')
      onContextLoss()
    }

    const restoreHandler = (event: Event) => {
      logger.info('WebGL context restored')
      onContextRestore()
    }

    canvas.addEventListener('webglcontextlost', lossHandler, false)
    canvas.addEventListener('webglcontextrestored', restoreHandler, false)

    this.contextLossListeners.set(canvas, lossHandler)
    this.contextRestoreListeners.set(canvas, restoreHandler)
  }

  // Unregister context loss recovery
  unregisterContextLossRecovery(canvas: HTMLCanvasElement) {
    const lossHandler = this.contextLossListeners.get(canvas)
    const restoreHandler = this.contextRestoreListeners.get(canvas)

    if (lossHandler) {
      canvas.removeEventListener('webglcontextlost', lossHandler)
      this.contextLossListeners.delete(canvas)
    }

    if (restoreHandler) {
      canvas.removeEventListener('webglcontextrestored', restoreHandler)
      this.contextRestoreListeners.delete(canvas)
    }
  }

  // Force WebGL context recreation
  static async recreateWebGLContext(canvas: HTMLCanvasElement): Promise<WebGLRenderingContext | null> {
    try {
      // Get the lost context extension
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return null

      const loseContext = gl.getExtension('WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
        await new Promise(resolve => setTimeout(resolve, 100))
        loseContext.restoreContext()
      }

      return gl
    } catch (error) {
      logger.error('Failed to recreate WebGL context:', error)
      return null
    }
  }

  // Clean up all listeners
  cleanup() {
    this.contextLossListeners.clear()
    this.contextRestoreListeners.clear()
  }
}

// Wallet-specific error recovery
export class WalletErrorRecovery {
  private static instance: WalletErrorRecovery
  private walletProviders: string[] = ['ethereum', 'keplr', 'leap', 'fin', 'compass']

  static getInstance(): WalletErrorRecovery {
    if (!this.instance) {
      this.instance = new WalletErrorRecovery()
    }
    return this.instance
  }

  // Check if any wallet is available
  isWalletAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    return this.walletProviders.some(provider => (window as any)[provider])
  }

  // Get available wallet providers
  getAvailableWallets(): string[] {
    if (typeof window === 'undefined') return []
    
    return this.walletProviders.filter(provider => (window as any)[provider])
  }

  // Attempt to reconnect to wallet
  async attemptReconnection(
    connectFunction: () => Promise<void>,
    options: ErrorRecoveryOptions = {}
  ): Promise<void> {
    return retryOperation(connectFunction, {
      maxRetries: 2,
      retryDelay: 2000,
      exponentialBackoff: true,
      ...options
    })
  }

  // Check network connectivity
  async checkNetworkConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    
    try {
      const response = await fetch('https://api.github.com/zen', {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  // Switch to a different network
  async switchNetwork(chainId: string): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Ethereum provider available')
    }

    const ethereum = (window as any).ethereum

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      })
    } catch (error: any) {
      // If the chain hasn't been added to MetaMask, add it
      if (error.code === 4902) {
        throw new Error('Network not added to wallet')
      }
      throw error
    }
  }
}

// Progressive fallback system for dragon components
export class DragonFallbackSystem {
  private static instance: DragonFallbackSystem
  private fallbackOrder: Array<'glb' | '2d' | 'ascii'> = ['glb', '2d', 'ascii']
  private currentFallbackIndex: number = 0
  private fallbackReasons: Map<string, string> = new Map()

  static getInstance(): DragonFallbackSystem {
    if (!this.instance) {
      this.instance = new DragonFallbackSystem()
    }
    return this.instance
  }

  // Get the next fallback option
  getNextFallback(): 'glb' | '2d' | 'ascii' | null {
    if (this.currentFallbackIndex >= this.fallbackOrder.length - 1) {
      return null // No more fallback options
    }
    
    this.currentFallbackIndex++
    return this.fallbackOrder[this.currentFallbackIndex] ?? null
  }

  // Get current fallback level
  getCurrentFallback(): 'glb' | '2d' | 'ascii' {
    return this.fallbackOrder[this.currentFallbackIndex] ?? 'ascii'
  }

  // Record fallback reason
  recordFallbackReason(from: string, to: string, reason: string) {
    this.fallbackReasons.set(`${from}_to_${to}`, reason)
    logger.info(`Dragon fallback: ${from} → ${to}`, { reason })
  }

  // Get fallback reasons
  getFallbackReasons(): Map<string, string> {
    return new Map(this.fallbackReasons)
  }

  // Reset fallback state
  reset() {
    this.currentFallbackIndex = 0
    this.fallbackReasons.clear()
  }

  // Check if fallback is needed based on capabilities
  shouldFallback(targetType: 'glb' | '2d' | 'ascii'): boolean {
    switch (targetType) {
      case 'glb':
        return !WebGLErrorRecovery.isWebGLSupported() || !WebGLErrorRecovery.isHardwareAccelerated()
      case '2d':
        return false // 2D should always work
      case 'ascii':
        return false // ASCII should always work
      default:
        return true
    }
  }

  // Get optimal dragon type based on current capabilities
  getOptimalDragonType(): 'glb' | '2d' | 'ascii' {
    if (WebGLErrorRecovery.isWebGLSupported() && WebGLErrorRecovery.isHardwareAccelerated()) {
      return 'glb'
    }
    
    // Check if we're on a mobile device (prefer 2D)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return '2d'
    }
    
    return '2d'
  }
}

// Error monitoring and reporting
export class ErrorMonitor {
  private static instance: ErrorMonitor
  private errorCounts: Map<string, number> = new Map()
  private errorHistory: Array<{
    timestamp: number
    error: Error
    context: string
    recovered: boolean
  }> = []
  private maxHistorySize = 100

  static getInstance(): ErrorMonitor {
    if (!this.instance) {
      this.instance = new ErrorMonitor()
    }
    return this.instance
  }

  // Record an error
  recordError(error: Error, context: string, recovered: boolean = false) {
    const errorKey = `${context}:${error.message}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    // Add to history
    this.errorHistory.push({
      timestamp: Date.now(),
      error,
      context,
      recovered
    })

    // Trim history if needed
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }

    // Log error with context
    logger.error(`[${context}] Error recorded:`, {
      error: error.message,
      count: currentCount + 1,
      recovered
    })
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number
    uniqueErrors: number
    recoveredErrors: number
    topErrors: Array<{ error: string; count: number }>
  } {
    const totalErrors = this.errorHistory.length
    const uniqueErrors = this.errorCounts.size
    const recoveredErrors = this.errorHistory.filter(entry => entry.recovered).length
    
    const topErrors = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }))

    return {
      totalErrors,
      uniqueErrors,
      recoveredErrors,
      topErrors
    }
  }

  // Get recent errors
  getRecentErrors(limit: number = 10): Array<{
    timestamp: number
    error: Error
    context: string
    recovered: boolean
  }> {
    return this.errorHistory.slice(-limit).reverse()
  }

  // Clear error history
  clearHistory() {
    this.errorHistory = []
    this.errorCounts.clear()
  }
}

// Utility functions for common error scenarios
export const errorRecoveryUtils = {
  // Retry async operation with exponential backoff
  retryAsync: retryOperation,

  // WebGL recovery instance
  webgl: WebGLErrorRecovery.getInstance(),

  // Wallet recovery instance
  wallet: WalletErrorRecovery.getInstance(),

  // Dragon fallback system
  dragonFallback: DragonFallbackSystem.getInstance(),

  // Error monitoring
  monitor: ErrorMonitor.getInstance(),

  // Check if error is recoverable
  isRecoverable: (error: Error): boolean => {
    if (!error || !error.message) return false
    
    const message = error.message.toLowerCase()
    const unrecoverableKeywords = [
      'not supported',
      'permission denied',
      'user rejected',
      'user denied',
      'aborted',
      'cancelled',
      'invalid typed array length',
      'corrupted',
      'malformed'
    ]
    
    return !unrecoverableKeywords.some(keyword => message.includes(keyword))
  },

  // Safe error message extraction
  getErrorMessage: (error: any): string => {
    if (!error) return 'Unknown error'
    if (typeof error === 'string') return error
    if (error.message) return error.message
    if (error.toString) return error.toString()
    return 'Unknown error'
  },

  // Check if error is model-related
  isModelError: (error: Error): boolean => {
    if (!error || !error.message) return false
    
    const message = error.message.toLowerCase()
    const modelErrorKeywords = [
      'invalid typed array length',
      'failed to load',
      'gltf',
      'glb',
      'model',
      'texture',
      'material',
      'geometry',
      'buffer'
    ]
    
    return modelErrorKeywords.some(keyword => message.includes(keyword))
  },

  // Delay utility
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  // Safe JSON parse with fallback
  safeJsonParse: <T>(json: string, fallback: T): T => {
    try {
      return JSON.parse(json)
    } catch (error) {
      return fallback
    }
  },

  // Force garbage collection if available
  forceGC: (): void => {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        ;(window as any).gc()
      } catch (error) {
        // Ignore if GC is not available
      }
    }
  }
}

export default errorRecoveryUtils