/**
 * Secure storage abstraction for localStorage and sessionStorage
 * Automatically encrypts sensitive data before storage
 */

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { 
  encrypt, 
  decrypt, 
  encryptWithPassword, 
  decryptWithPassword,
  encryptWithSessionKey,
  validateEncryptedData,
  isEncryptedDataExpired,
  generateSecurePassword,
  isWebCryptoAvailable,
  EncryptedData
} from './encryption'

// ============================================================================
// Types
// ============================================================================

export interface SecureStorageConfig {
  keyPrefix: string
  maxAge: number // in milliseconds
  useEncryption: boolean
  fallbackToPlaintext: boolean
  autoCleanup: boolean
}

export interface StoredData {
  encrypted: boolean
  data: EncryptedData | any
  timestamp: number
  version: string
}

export type StorageType = 'localStorage' | 'sessionStorage'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: SecureStorageConfig = {
  keyPrefix: 'seiron_secure_',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  useEncryption: true,
  fallbackToPlaintext: false,
  autoCleanup: true
}

const STORAGE_VERSION = '1.0'
const MASTER_KEY_STORAGE_KEY = 'seiron_master_key'

// ============================================================================
// Key Management
// ============================================================================

/**
 * Get or generate master encryption key for the session
 */
const getMasterKey = (): string => {
  if (typeof window === 'undefined') return ''
  
  let masterKey = sessionStorage.getItem(MASTER_KEY_STORAGE_KEY)
  
  if (!masterKey) {
    masterKey = generateSecurePassword(32)
    sessionStorage.setItem(MASTER_KEY_STORAGE_KEY, masterKey)
  }
  
  return masterKey
}

/**
 * Clear master key (for session cleanup)
 */
const clearMasterKey = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(MASTER_KEY_STORAGE_KEY)
  }
}

// ============================================================================
// Storage Interface
// ============================================================================

export class SecureStorage {
  private config: SecureStorageConfig
  private storageType: StorageType
  private storage: Storage | null

  constructor(
    storageType: StorageType = 'localStorage',
    config: Partial<SecureStorageConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.storageType = storageType
    this.storage = this.getStorage()
    
    // Setup auto cleanup if enabled
    if (this.config.autoCleanup && this.storage) {
      this.setupAutoCleanup()
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null
    
    switch (this.storageType) {
      case 'localStorage':
        return window.localStorage
      case 'sessionStorage':
        return window.sessionStorage
      default:
        return null
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`
  }

  private shouldEncrypt(key: string): boolean {
    if (!this.config.useEncryption) return false
    if (!isWebCryptoAvailable()) return false
    
    // Define sensitive data patterns
    const sensitivePatterns = [
      'wallet',
      'address',
      'private',
      'seed',
      'mnemonic',
      'key',
      'token',
      'auth',
      'session',
      'user',
      'balance',
      'transaction'
    ]
    
    const keyLower = key.toLowerCase()
    return sensitivePatterns.some(pattern => keyLower.includes(pattern))
  }

  /**
   * Store data securely
   */
  async setItem(key: string, value: unknown): Promise<E.Either<Error, void>> {
    if (!this.storage) {
      return E.left(new Error('Storage not available'))
    }

    try {
      const serialized = JSON.stringify(value)
      const shouldEncrypt = this.shouldEncrypt(key)
      
      let storedData: StoredData

      if (shouldEncrypt) {
        // Encrypt sensitive data
        const encryptResult = await encryptWithPassword(serialized, getMasterKey())()
        
        if (E.isLeft(encryptResult)) {
          if (this.config.fallbackToPlaintext) {
            // Fallback to plaintext if encryption fails
            storedData = {
              encrypted: false,
              data: value,
              timestamp: Date.now(),
              version: STORAGE_VERSION
            }
          } else {
            return E.left(encryptResult.left)
          }
        } else {
          storedData = {
            encrypted: true,
            data: encryptResult.right,
            timestamp: Date.now(),
            version: STORAGE_VERSION
          }
        }
      } else {
        // Store non-sensitive data without encryption
        storedData = {
          encrypted: false,
          data: value,
          timestamp: Date.now(),
          version: STORAGE_VERSION
        }
      }

      this.storage.setItem(this.getKey(key), JSON.stringify(storedData))
      return E.right(void 0)
    } catch (error) {
      return E.left(new Error(`Failed to store item: ${error}`))
    }
  }

  /**
   * Retrieve data securely
   */
  async getItem<T>(key: string): Promise<O.Option<T>> {
    if (!this.storage) {
      return O.none
    }

    try {
      const stored = this.storage.getItem(this.getKey(key))
      if (!stored) {
        return O.none
      }

      const storedData: StoredData = JSON.parse(stored)
      
      // Check if data is expired
      if (this.isExpired(storedData)) {
        await this.removeItem(key)
        return O.none
      }

      if (storedData.encrypted) {
        // Decrypt the data
        const encryptedData = validateEncryptedData(storedData.data)
        if (E.isLeft(encryptedData)) {
          return O.none
        }

        const decryptResult = await decryptWithPassword(encryptedData.right, getMasterKey())()
        if (E.isLeft(decryptResult)) {
          return O.none
        }

        return O.some(JSON.parse(decryptResult.right))
      } else {
        // Return plaintext data
        return O.some(storedData.data)
      }
    } catch (error) {
      return O.none
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<E.Either<Error, void>> {
    if (!this.storage) {
      return E.left(new Error('Storage not available'))
    }

    try {
      this.storage.removeItem(this.getKey(key))
      return E.right(void 0)
    } catch (error) {
      return E.left(new Error(`Failed to remove item: ${error}`))
    }
  }

  /**
   * Clear all items with the configured prefix
   */
  async clear(): Promise<E.Either<Error, void>> {
    if (!this.storage) {
      return E.left(new Error('Storage not available'))
    }

    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key && key.startsWith(this.config.keyPrefix)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => {
        this.storage!.removeItem(key)
      })

      return E.right(void 0)
    } catch (error) {
      return E.left(new Error(`Failed to clear storage: ${error}`))
    }
  }

  /**
   * Check if stored data is expired
   */
  private isExpired(storedData: StoredData): boolean {
    const now = Date.now()
    return (now - storedData.timestamp) > this.config.maxAge
  }

  /**
   * Setup automatic cleanup of expired items
   */
  private setupAutoCleanup(): void {
    if (typeof window === 'undefined') return

    // Run cleanup every hour
    setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)

    // Run cleanup when the page is about to unload
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    if (!this.storage) return

    const keysToRemove: string[] = []
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key && key.startsWith(this.config.keyPrefix)) {
        try {
          const stored = this.storage.getItem(key)
          if (stored) {
            const storedData: StoredData = JSON.parse(stored)
            if (this.isExpired(storedData)) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          // Remove corrupted data
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => {
      this.storage!.removeItem(key)
    })
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalItems: number
    encryptedItems: number
    plaintextItems: number
    expiredItems: number
  } {
    if (!this.storage) {
      return { totalItems: 0, encryptedItems: 0, plaintextItems: 0, expiredItems: 0 }
    }

    let totalItems = 0
    let encryptedItems = 0
    let plaintextItems = 0
    let expiredItems = 0

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key && key.startsWith(this.config.keyPrefix)) {
        try {
          const stored = this.storage.getItem(key)
          if (stored) {
            const storedData: StoredData = JSON.parse(stored)
            totalItems++
            
            if (storedData.encrypted) {
              encryptedItems++
            } else {
              plaintextItems++
            }
            
            if (this.isExpired(storedData)) {
              expiredItems++
            }
          }
        } catch (error) {
          // Count corrupted items as expired
          expiredItems++
        }
      }
    }

    return { totalItems, encryptedItems, plaintextItems, expiredItems }
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

// Default secure localStorage instance
export const secureLocalStorage = new SecureStorage('localStorage', {
  keyPrefix: 'seiron_secure_',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  useEncryption: true,
  fallbackToPlaintext: false,
  autoCleanup: true
})

// Session storage for temporary data
export const secureSessionStorage = new SecureStorage('sessionStorage', {
  keyPrefix: 'seiron_session_',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  useEncryption: true,
  fallbackToPlaintext: false,
  autoCleanup: true
})

// ============================================================================
// Session Management
// ============================================================================

/**
 * Initialize secure storage session
 */
export const initializeSecureSession = (): void => {
  // Generate new master key for this session
  getMasterKey()
  
  // Setup session cleanup
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearMasterKey()
    })
  }
}

/**
 * Clear all secure storage data and session
 */
export const clearSecureSession = async (): Promise<void> => {
  await secureLocalStorage.clear()
  await secureSessionStorage.clear()
  clearMasterKey()
}

/**
 * Get security status
 */
export const getSecurityStatus = (): {
  webCryptoAvailable: boolean
  masterKeyPresent: boolean
  localStorageStats: ReturnType<SecureStorage['getStats']>
  sessionStorageStats: ReturnType<SecureStorage['getStats']>
} => {
  return {
    webCryptoAvailable: isWebCryptoAvailable(),
    masterKeyPresent: !!getMasterKey(),
    localStorageStats: secureLocalStorage.getStats(),
    sessionStorageStats: secureSessionStorage.getStats()
  }
}