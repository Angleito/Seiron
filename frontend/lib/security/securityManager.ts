/**
 * Security Manager
 * Centralized security initialization and monitoring
 */

import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { logger, safeInfo, safeWarn, safeError } from '../logger'
import { 
  isWebCryptoAvailable, 
  getEncryptionInfo,
  generateSecurePassword 
} from './encryption'
import { 
  initializeSecureSession,
  getSecurityStatus,
  secureLocalStorage,
  secureSessionStorage 
} from './secureStorage'
import { getSensitiveDataStats } from './dataFilter'

// ============================================================================
// Types
// ============================================================================

export interface SecurityDiagnostics {
  webCryptoAvailable: boolean
  encryptionInfo: Record<string, any>
  securityStatus: ReturnType<typeof getSecurityStatus>
  timestamp: string
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface SecurityConfig {
  enableEncryption: boolean
  rotateKeysOnStart: boolean
  cleanupOnStart: boolean
  validateStoredData: boolean
  logSecurityEvents: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableEncryption: true,
  rotateKeysOnStart: false,
  cleanupOnStart: true,
  validateStoredData: true,
  logSecurityEvents: true
}

const SECURITY_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour
const MAX_STORED_LOGS = 100
const MAX_ENCRYPTION_FAILURES = 5

// ============================================================================
// State Management
// ============================================================================

let securityConfig: SecurityConfig = DEFAULT_SECURITY_CONFIG
let isInitialized = false
let securityCheckInterval: NodeJS.Timeout | null = null
let encryptionFailureCount = 0

// ============================================================================
// Security Validation Functions
// ============================================================================

/**
 * Validate current security environment
 */
const validateSecurityEnvironment = (): TE.TaskEither<Error, void> => {
  return TE.tryCatch(
    async () => {
      const diagnostics: string[] = []
      
      // Check Web Crypto API availability
      if (!isWebCryptoAvailable()) {
        throw new Error('Web Crypto API is not available')
      }
      
      // Check if we're in secure context (HTTPS or localhost)
      if (typeof window !== 'undefined') {
        const isSecureContext = window.isSecureContext || 
                               window.location.protocol === 'https:' ||
                               window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1'
        
        if (!isSecureContext) {
          diagnostics.push('Application is not running in a secure context (HTTPS)')
        }
      }
      
      // Check localStorage availability
      try {
        const testKey = '__seiron_security_test__'
        localStorage.setItem(testKey, 'test')
        localStorage.removeItem(testKey)
      } catch (error) {
        diagnostics.push('localStorage is not available')
      }
      
      // Check sessionStorage availability
      try {
        const testKey = '__seiron_security_test__'
        sessionStorage.setItem(testKey, 'test')
        sessionStorage.removeItem(testKey)
      } catch (error) {
        diagnostics.push('sessionStorage is not available')
      }
      
      if (diagnostics.length > 0) {
        throw new Error(`Security environment validation failed: ${diagnostics.join(', ')}`)
      }
      
      return void 0
    },
    (error) => new Error(`Security environment validation failed: ${error}`)
  )
}

/**
 * Validate stored encrypted data
 */
const validateStoredData = async (): Promise<void> => {
  if (!securityConfig.validateStoredData) return
  
  try {
    const localStats = secureLocalStorage.getStats()
    const sessionStats = secureSessionStorage.getStats()
    
    safeInfo('Storage validation completed', {
      localStorage: localStats,
      sessionStorage: sessionStats
    })
    
    if (localStats.expiredItems > 0 || sessionStats.expiredItems > 0) {
      safeWarn('Found expired items in storage', {
        localStorage: localStats.expiredItems,
        sessionStorage: sessionStats.expiredItems
      })
    }
  } catch (error) {
    safeError('Storage validation failed', error)
  }
}

/**
 * Cleanup expired and invalid data
 */
const performSecurityCleanup = async (): Promise<void> => {
  if (!securityConfig.cleanupOnStart) return
  
  try {
    // The SecureStorage classes have auto-cleanup, so this is mainly for logging
    const beforeStats = {
      localStorage: secureLocalStorage.getStats(),
      sessionStorage: secureSessionStorage.getStats()
    }
    
    // Force cleanup by accessing storage (triggers internal cleanup)
    await secureLocalStorage.getItem('__cleanup_trigger__')
    await secureSessionStorage.getItem('__cleanup_trigger__')
    
    const afterStats = {
      localStorage: secureLocalStorage.getStats(),
      sessionStorage: secureSessionStorage.getStats()
    }
    
    const cleaned = {
      localStorage: beforeStats.localStorage.totalItems - afterStats.localStorage.totalItems,
      sessionStorage: beforeStats.sessionStorage.totalItems - afterStats.sessionStorage.totalItems
    }
    
    if (cleaned.localStorage > 0 || cleaned.sessionStorage > 0) {
      safeInfo('Security cleanup completed', cleaned)
    }
  } catch (error) {
    safeError('Security cleanup failed', error)
  }
}

/**
 * Monitor security metrics
 */
const monitorSecurityMetrics = (): void => {
  if (!securityConfig.logSecurityEvents) return
  
  try {
    const diagnostics = getSecurityDiagnostics()
    
    if (diagnostics.errors.length > 0) {
      safeError('Security monitoring detected errors', diagnostics.errors)
    }
    
    if (diagnostics.warnings.length > 0) {
      safeWarn('Security monitoring detected warnings', diagnostics.warnings)
    }
    
    // Check for excessive encryption failures
    if (encryptionFailureCount > MAX_ENCRYPTION_FAILURES) {
      safeError('Excessive encryption failures detected', {
        count: encryptionFailureCount,
        threshold: MAX_ENCRYPTION_FAILURES
      })
    }
  } catch (error) {
    safeError('Security monitoring failed', error)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize security subsystem
 */
export const initializeSecurity = async (
  config: Partial<SecurityConfig> = {}
): Promise<E.Either<Error, void>> => {
  if (isInitialized) {
    return E.right(void 0)
  }
  
  try {
    // Merge configuration
    securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config }
    
    // Validate security environment
    const validationResult = await validateSecurityEnvironment()()
    if (E.isLeft(validationResult)) {
      return E.left(validationResult.left)
    }
    
    // Initialize secure session
    initializeSecureSession()
    
    // Perform cleanup if enabled
    await performSecurityCleanup()
    
    // Validate stored data if enabled
    await validateStoredData()
    
    // Setup periodic security monitoring
    if (securityConfig.logSecurityEvents) {
      securityCheckInterval = setInterval(() => {
        monitorSecurityMetrics()
      }, SECURITY_CHECK_INTERVAL)
    }
    
    // Setup cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (securityCheckInterval) {
          clearInterval(securityCheckInterval)
        }
      })
    }
    
    isInitialized = true
    
    safeInfo('Security subsystem initialized successfully', {
      config: securityConfig,
      webCryptoAvailable: isWebCryptoAvailable(),
      timestamp: new Date().toISOString()
    })
    
    return E.right(void 0)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    safeError('Security initialization failed', error)
    return E.left(new Error(`Security initialization failed: ${errorMessage}`))
  }
}

/**
 * Get comprehensive security diagnostics
 */
export const getSecurityDiagnostics = (): SecurityDiagnostics => {
  const errors: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  
  try {
    // Check Web Crypto availability
    if (!isWebCryptoAvailable()) {
      errors.push('Web Crypto API is not available')
      recommendations.push('Ensure browser supports Web Crypto API and app runs in secure context')
    }
    
    // Check secure context
    if (typeof window !== 'undefined') {
      const isSecureContext = window.isSecureContext || 
                             window.location.protocol === 'https:' ||
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1'
      
      if (!isSecureContext) {
        warnings.push('Not running in secure context (HTTPS)')
        recommendations.push('Deploy application over HTTPS in production')
      }
    }
    
    // Check storage availability
    try {
      localStorage.setItem('__test__', 'test')
      localStorage.removeItem('__test__')
    } catch (error) {
      errors.push('localStorage is not available')
    }
    
    try {
      sessionStorage.setItem('__test__', 'test')
      sessionStorage.removeItem('__test__')
    } catch (error) {
      warnings.push('sessionStorage is not available')
    }
    
    // Check storage stats
    const securityStatus = getSecurityStatus()
    
    if (securityStatus.localStorageStats.expiredItems > 0) {
      warnings.push(`${securityStatus.localStorageStats.expiredItems} expired items in localStorage`)
      recommendations.push('Consider increasing cleanup frequency')
    }
    
    if (securityStatus.sessionStorageStats.expiredItems > 0) {
      warnings.push(`${securityStatus.sessionStorageStats.expiredItems} expired items in sessionStorage`)
    }
    
    // Check initialization status
    if (!isInitialized) {
      warnings.push('Security subsystem not initialized')
      recommendations.push('Call initializeSecurity() during app startup')
    }
    
    // Check encryption failure count
    if (encryptionFailureCount > 0) {
      warnings.push(`${encryptionFailureCount} encryption failures occurred`)
      if (encryptionFailureCount > MAX_ENCRYPTION_FAILURES) {
        errors.push('Excessive encryption failures detected')
        recommendations.push('Check Web Crypto API compatibility and error logs')
      }
    }
    
    return {
      webCryptoAvailable: isWebCryptoAvailable(),
      encryptionInfo: getEncryptionInfo(),
      securityStatus: getSecurityStatus(),
      timestamp: new Date().toISOString(),
      errors,
      warnings,
      recommendations
    }
  } catch (error) {
    errors.push(`Failed to generate diagnostics: ${error}`)
    
    return {
      webCryptoAvailable: false,
      encryptionInfo: {},
      securityStatus: {
        webCryptoAvailable: false,
        masterKeyPresent: false,
        localStorageStats: { totalItems: 0, encryptedItems: 0, plaintextItems: 0, expiredItems: 0 },
        sessionStorageStats: { totalItems: 0, encryptedItems: 0, plaintextItems: 0, expiredItems: 0 }
      },
      timestamp: new Date().toISOString(),
      errors,
      warnings,
      recommendations
    }
  }
}

/**
 * Report encryption failure (for internal use)
 */
export const reportEncryptionFailure = (): void => {
  encryptionFailureCount++
  
  if (encryptionFailureCount > MAX_ENCRYPTION_FAILURES) {
    safeError('Excessive encryption failures detected', {
      count: encryptionFailureCount,
      threshold: MAX_ENCRYPTION_FAILURES
    })
  }
}

/**
 * Reset encryption failure counter
 */
export const resetEncryptionFailures = (): void => {
  encryptionFailureCount = 0
}

/**
 * Check if security subsystem is initialized
 */
export const isSecurityInitialized = (): boolean => {
  return isInitialized
}

/**
 * Shutdown security subsystem
 */
export const shutdownSecurity = (): void => {
  if (securityCheckInterval) {
    clearInterval(securityCheckInterval)
    securityCheckInterval = null
  }
  
  isInitialized = false
  encryptionFailureCount = 0
  
  safeInfo('Security subsystem shutdown completed')
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Run security diagnostics and log results (development only)
 */
export const runSecurityDiagnostics = (): void => {
  if (process.env.NODE_ENV !== 'development') return
  
  const diagnostics = getSecurityDiagnostics()
  
  console.group('🔒 Security Diagnostics')
  console.log('Web Crypto Available:', diagnostics.webCryptoAvailable)
  console.log('Encryption Info:', diagnostics.encryptionInfo)
  console.log('Security Status:', diagnostics.securityStatus)
  
  if (diagnostics.errors.length > 0) {
    console.error('Errors:', diagnostics.errors)
  }
  
  if (diagnostics.warnings.length > 0) {
    console.warn('Warnings:', diagnostics.warnings)
  }
  
  if (diagnostics.recommendations.length > 0) {
    console.info('Recommendations:', diagnostics.recommendations)
  }
  
  console.groupEnd()
}