/**
 * Security module tests
 * Tests encryption, secure storage, and data filtering functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  generateSecurePassword,
  isWebCryptoAvailable,
  validateEncryptedData
} from '../encryption'
import {
  SecureStorage,
  secureLocalStorage,
  secureSessionStorage,
  initializeSecureSession,
  clearSecureSession,
  getSecurityStatus
} from '../secureStorage'
import {
  filterSensitiveData,
  prepareForLogging,
  containsSensitiveData,
  getSensitiveDataStats,
  DEVELOPMENT_FILTER_CONFIG,
  PRODUCTION_FILTER_CONFIG
} from '../dataFilter'
import {
  initializeSecurity,
  getSecurityDiagnostics,
  isSecurityInitialized
} from '../securityManager'

// Mock localStorage and sessionStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null
  }
})()

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null
  }
})()

// Mock window object
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })
Object.defineProperty(window, 'isSecureContext', { value: true })

describe('Security Module Tests', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
  })

  afterEach(async () => {
    await clearSecureSession()
  })

  describe('Encryption', () => {
    it('should check Web Crypto API availability', () => {
      expect(typeof isWebCryptoAvailable()).toBe('boolean')
    })

    it('should generate secure passwords', () => {
      const password = generateSecurePassword(32)
      expect(password).toHaveLength(32)
      expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/)
    })

    it('should validate encrypted data structure', () => {
      const validData = {
        ciphertext: 'test',
        iv: 'test',
        tag: 'test',
        timestamp: Date.now()
      }
      
      const result = validateEncryptedData(validData)
      expect(result._tag).toBe('Right')
    })

    it('should reject invalid encrypted data', () => {
      const invalidData = {
        ciphertext: 'test',
        // missing iv, tag, timestamp
      }
      
      const result = validateEncryptedData(invalidData)
      expect(result._tag).toBe('Left')
    })

    // Note: Actual encryption tests would require Web Crypto API mocking
    // which is complex and browser-specific. In a real test environment,
    // you'd want to use a test framework that supports Web Crypto API.
  })

  describe('Data Filtering', () => {
    it('should detect sensitive data in objects', () => {
      const sensitiveData = {
        walletAddress: '0x1234567890abcdef',
        privateKey: 'secret-key-123',
        normalData: 'public-info'
      }
      
      const result = filterSensitiveData(sensitiveData, PRODUCTION_FILTER_CONFIG)
      expect(result.sensitiveFieldsDetected.length).toBeGreaterThan(0)
      expect(result.redactedCount).toBeGreaterThan(0)
    })

    it('should mask sensitive values in development mode', () => {
      const sensitiveData = {
        address: '0x1234567890abcdef1234567890abcdef12345678'
      }
      
      const result = filterSensitiveData(sensitiveData, DEVELOPMENT_FILTER_CONFIG)
      expect(result.filtered.address).toContain('***')
      expect(result.filtered.address).not.toBe(sensitiveData.address)
    })

    it('should completely redact sensitive data in production mode', () => {
      const sensitiveData = {
        walletAddress: '0x1234567890abcdef',
        amount: 1000
      }
      
      const result = filterSensitiveData(sensitiveData, PRODUCTION_FILTER_CONFIG)
      expect(result.filtered.walletAddress).toBe('[REDACTED]')
    })

    it('should handle nested objects', () => {
      const nestedData = {
        user: {
          wallet: {
            address: '0x1234567890abcdef',
            balance: 1000
          },
          profile: {
            name: 'Test User'
          }
        }
      }
      
      const result = filterSensitiveData(nestedData, PRODUCTION_FILTER_CONFIG)
      expect(result.sensitiveFieldsDetected.some(field => field.includes('address'))).toBe(true)
      expect(result.filtered.user.profile.name).toBe('Test User') // Non-sensitive preserved
    })

    it('should handle arrays', () => {
      const arrayData = {
        transactions: [
          { hash: '0xabcdef', amount: 100 },
          { hash: '0x123456', amount: 200 }
        ]
      }
      
      const result = filterSensitiveData(arrayData, PRODUCTION_FILTER_CONFIG)
      expect(result.sensitiveFieldsDetected.length).toBeGreaterThan(0)
    })

    it('should detect sensitive patterns in values', () => {
      const data = {
        id: '0x1234567890abcdef1234567890abcdef12345678', // Ethereum address pattern
        email: 'test@example.com',
        regularString: 'normal-value'
      }
      
      const result = filterSensitiveData(data, PRODUCTION_FILTER_CONFIG)
      expect(result.sensitiveFieldsDetected.length).toBeGreaterThan(0)
    })

    it('should provide utility functions', () => {
      const sensitiveData = { privateKey: 'secret' }
      
      expect(containsSensitiveData(sensitiveData)).toBe(true)
      
      const stats = getSensitiveDataStats(sensitiveData)
      expect(stats.hasSensitiveData).toBe(true)
      expect(stats.sensitiveFieldsCount).toBeGreaterThan(0)
      
      const prepared = prepareForLogging(sensitiveData)
      expect(prepared.privateKey).toBe('[REDACTED]')
    })
  })

  describe('Secure Storage', () => {
    it('should create secure storage instances', () => {
      const storage = new SecureStorage('localStorage')
      expect(storage).toBeDefined()
    })

    it('should provide storage statistics', () => {
      const stats = secureLocalStorage.getStats()
      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('encryptedItems')
      expect(stats).toHaveProperty('plaintextItems')
      expect(stats).toHaveProperty('expiredItems')
    })

    it('should initialize secure session', () => {
      initializeSecureSession()
      const status = getSecurityStatus()
      expect(status).toHaveProperty('webCryptoAvailable')
      expect(status).toHaveProperty('masterKeyPresent')
    })

    // Note: Actual storage tests would require proper encryption mocking
    // which depends on Web Crypto API availability
  })

  describe('Security Manager', () => {
    it('should provide security diagnostics', () => {
      const diagnostics = getSecurityDiagnostics()
      expect(diagnostics).toHaveProperty('webCryptoAvailable')
      expect(diagnostics).toHaveProperty('encryptionInfo')
      expect(diagnostics).toHaveProperty('securityStatus')
      expect(diagnostics).toHaveProperty('timestamp')
      expect(diagnostics).toHaveProperty('errors')
      expect(diagnostics).toHaveProperty('warnings')
      expect(diagnostics).toHaveProperty('recommendations')
    })

    it('should track initialization status', () => {
      expect(typeof isSecurityInitialized()).toBe('boolean')
    })

    // Note: Full initialization tests would require proper environment setup
    // including Web Crypto API and storage availability
  })

  describe('Integration Tests', () => {
    it('should filter sensitive data before logging', () => {
      const logData = {
        action: 'wallet_connect',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 1,
        timestamp: Date.now()
      }
      
      const filtered = prepareForLogging(logData, PRODUCTION_FILTER_CONFIG)
      expect(filtered.action).toBe('wallet_connect')
      expect(filtered.chainId).toBe(1)
      expect(filtered.address).toBe('[REDACTED]')
    })

    it('should handle error data filtering', () => {
      const errorData = {
        message: 'Transaction failed',
        error: 'Invalid signature',
        userData: {
          address: '0x1234567890abcdef',
          balance: 1000
        }
      }
      
      const filtered = prepareForLogging(errorData, PRODUCTION_FILTER_CONFIG)
      expect(filtered.message).toBe('Transaction failed')
      expect(filtered.error).toBe('Invalid signature')
      expect(filtered.userData.address).toBe('[REDACTED]')
    })

    it('should preserve non-sensitive analytics data', () => {
      const analyticsData = {
        event: 'page_view',
        page: '/dashboard',
        timestamp: Date.now(),
        userAgent: 'Test Browser',
        chainId: 1
      }
      
      const filtered = prepareForLogging(analyticsData, PRODUCTION_FILTER_CONFIG)
      expect(filtered).toEqual(analyticsData) // Should be unchanged
    })
  })
})

// Example of how to test with actual Web Crypto API in a browser environment
describe('Browser Integration Tests', () => {
  // These tests would run in a browser environment with actual Web Crypto API
  it.skip('should encrypt and decrypt data with password', async () => {
    if (!isWebCryptoAvailable()) {
      console.log('Skipping Web Crypto tests - API not available')
      return
    }

    const testData = 'sensitive wallet address: 0x1234567890abcdef'
    const password = 'test-password-123'

    try {
      const encryptResult = await encryptWithPassword(testData, password)()
      if (encryptResult._tag === 'Right') {
        const decryptResult = await decryptWithPassword(encryptResult.right, password)()
        if (decryptResult._tag === 'Right') {
          expect(decryptResult.right).toBe(testData)
        } else {
          throw new Error('Decryption failed')
        }
      } else {
        throw new Error('Encryption failed')
      }
    } catch (error) {
      console.error('Web Crypto test failed:', error)
      throw error
    }
  })

  it.skip('should store and retrieve encrypted data', async () => {
    if (!isWebCryptoAvailable()) {
      console.log('Skipping secure storage tests - Web Crypto API not available')
      return
    }

    const testData = {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1
    }

    try {
      const storage = new SecureStorage('localStorage')
      await storage.setItem('test-wallet', testData)
      
      const retrieved = await storage.getItem('test-wallet')
      if (retrieved._tag === 'Some') {
        expect(retrieved.value).toEqual(testData)
      } else {
        throw new Error('Failed to retrieve stored data')
      }
    } catch (error) {
      console.error('Secure storage test failed:', error)
      throw error
    }
  })
})