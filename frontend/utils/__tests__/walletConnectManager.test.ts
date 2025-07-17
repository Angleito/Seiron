import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WalletConnectManager, getWalletConnectManager } from '../walletConnectManager'

describe('WalletConnectManager', () => {
  let originalWarn: typeof console.warn
  let originalError: typeof console.error
  
  beforeEach(() => {
    // Store original console methods
    originalWarn = console.warn
    originalError = console.error
    
    // Reset manager state
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    // Restore console methods
    console.warn = originalWarn
    console.error = originalError
  })
  
  it('should create a singleton instance', () => {
    const manager1 = getWalletConnectManager()
    const manager2 = getWalletConnectManager()
    
    expect(manager1).toBe(manager2)
  })
  
  it('should initialize only once', async () => {
    const manager = getWalletConnectManager()
    
    // First initialization
    await manager.initialize()
    expect(manager.isInitialized()).toBe(true)
    
    // Second initialization should be a no-op
    const consoleSpy = vi.spyOn(console, 'debug')
    await manager.initialize()
    
    expect(consoleSpy).toHaveBeenCalledWith('[WalletConnect] Already initialized, skipping')
  })
  
  it('should filter WalletConnect duplicate initialization warnings', () => {
    const warnSpy = vi.fn()
    console.warn = warnSpy
    
    // Create manager (filters are set up in constructor)
    getWalletConnectManager()
    
    // Test warning that should be filtered
    console.warn('WalletConnect Core is already initialized')
    expect(warnSpy).not.toHaveBeenCalled()
    
    // Test warning that should pass through
    console.warn('Some other warning')
    expect(warnSpy).toHaveBeenCalledWith('Some other warning')
  })
  
  it('should filter WalletConnect initialization errors', () => {
    const errorSpy = vi.fn()
    console.error = errorSpy
    
    // Create manager (filters are set up in constructor)
    getWalletConnectManager()
    
    // Test error that should be filtered
    console.error('WalletConnect already initialized error')
    expect(errorSpy).not.toHaveBeenCalled()
    
    // Test error that should pass through
    console.error('Some other error')
    expect(errorSpy).toHaveBeenCalledWith('Some other error')
  })
  
  it('should handle cleanup properly', () => {
    const manager = getWalletConnectManager()
    manager.cleanup()
    
    expect(manager.isInitialized()).toBe(false)
    
    // Console methods should be restored
    expect(console.warn).toBe(originalWarn)
    expect(console.error).toBe(originalError)
  })
})