/**
 * Encryption utility for secure localStorage storage
 * Uses Web Crypto API for cryptographic operations
 */

import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

// ============================================================================
// Types
// ============================================================================

export interface EncryptionConfig {
  algorithm: 'AES-GCM'
  keyLength: 256
  ivLength: 12
  tagLength: 16
}

export interface EncryptedData {
  ciphertext: string
  iv: string
  tag: string
  timestamp: number
}

export interface DerivedKey {
  key: CryptoKey
  salt: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 16
}

const SALT_LENGTH = 16
const ITERATIONS = 100000 // PBKDF2 iterations
const KEY_DERIVATION_SALT_KEY = 'seiron_key_salt'

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
const generateRandomBytes = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Convert ArrayBuffer to base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert string to ArrayBuffer
 */
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  return new TextEncoder().encode(str)
}

/**
 * Convert ArrayBuffer to string
 */
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  return new TextDecoder().decode(buffer)
}

// ============================================================================
// Key Management
// ============================================================================

/**
 * Generate or retrieve master key salt
 */
const getMasterKeySalt = (): Uint8Array => {
  try {
    const stored = localStorage.getItem(KEY_DERIVATION_SALT_KEY)
    if (stored) {
      return new Uint8Array(base64ToArrayBuffer(stored))
    }
  } catch (error) {
    // If we can't retrieve, generate new
  }
  
  // Generate new salt
  const salt = generateRandomBytes(SALT_LENGTH)
  try {
    localStorage.setItem(KEY_DERIVATION_SALT_KEY, arrayBufferToBase64(salt))
  } catch (error) {
    // Handle localStorage errors gracefully
  }
  
  return salt
}

/**
 * Derive encryption key from password using PBKDF2
 */
const deriveKey = (password: string, salt?: Uint8Array): TE.TaskEither<Error, DerivedKey> => {
  return TE.tryCatch(
    async () => {
      const keySalt = salt || getMasterKeySalt()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        stringToArrayBuffer(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: keySalt,
          iterations: ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: DEFAULT_CONFIG.keyLength },
        false,
        ['encrypt', 'decrypt']
      )

      return {
        key,
        salt: arrayBufferToBase64(keySalt)
      }
    },
    (error) => new Error(`Key derivation failed: ${error}`)
  )
}

/**
 * Generate session-based encryption key
 */
const generateSessionKey = (): TE.TaskEither<Error, CryptoKey> => {
  return TE.tryCatch(
    async () => {
      return await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: DEFAULT_CONFIG.keyLength },
        false,
        ['encrypt', 'decrypt']
      )
    },
    (error) => new Error(`Session key generation failed: ${error}`)
  )
}

// ============================================================================
// Encryption/Decryption
// ============================================================================

/**
 * Encrypt data using AES-GCM
 */
export const encrypt = (
  data: string,
  key: CryptoKey,
  config: EncryptionConfig = DEFAULT_CONFIG
): TE.TaskEither<Error, EncryptedData> => {
  return TE.tryCatch(
    async () => {
      const plaintext = stringToArrayBuffer(data)
      const iv = generateRandomBytes(config.ivLength)

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: config.algorithm,
          iv: iv,
          tagLength: config.tagLength * 8 // Convert to bits
        },
        key,
        plaintext
      )

      // Extract the tag from the end of the ciphertext
      const ciphertextBytes = new Uint8Array(ciphertext)
      const tagStart = ciphertextBytes.length - config.tagLength
      const actualCiphertext = ciphertextBytes.slice(0, tagStart)
      const tag = ciphertextBytes.slice(tagStart)

      return {
        ciphertext: arrayBufferToBase64(actualCiphertext),
        iv: arrayBufferToBase64(iv),
        tag: arrayBufferToBase64(tag),
        timestamp: Date.now()
      }
    },
    (error) => new Error(`Encryption failed: ${error}`)
  )
}

/**
 * Decrypt data using AES-GCM
 */
export const decrypt = (
  encryptedData: EncryptedData,
  key: CryptoKey,
  config: EncryptionConfig = DEFAULT_CONFIG
): TE.TaskEither<Error, string> => {
  return TE.tryCatch(
    async () => {
      const ciphertext = new Uint8Array(base64ToArrayBuffer(encryptedData.ciphertext))
      const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv))
      const tag = new Uint8Array(base64ToArrayBuffer(encryptedData.tag))

      // Combine ciphertext and tag
      const combined = new Uint8Array(ciphertext.length + tag.length)
      combined.set(ciphertext)
      combined.set(tag, ciphertext.length)

      const plaintext = await crypto.subtle.decrypt(
        {
          name: config.algorithm,
          iv: iv,
          tagLength: config.tagLength * 8 // Convert to bits
        },
        key,
        combined
      )

      return arrayBufferToString(plaintext)
    },
    (error) => new Error(`Decryption failed: ${error}`)
  )
}

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Encrypt data with password-derived key
 */
export const encryptWithPassword = (
  data: string,
  password: string
): TE.TaskEither<Error, EncryptedData> => {
  return pipe(
    deriveKey(password),
    TE.chain(({ key }) => encrypt(data, key))
  )
}

/**
 * Decrypt data with password-derived key
 */
export const decryptWithPassword = (
  encryptedData: EncryptedData,
  password: string
): TE.TaskEither<Error, string> => {
  return pipe(
    deriveKey(password),
    TE.chain(({ key }) => decrypt(encryptedData, key))
  )
}

/**
 * Encrypt data with session key (for temporary storage)
 */
export const encryptWithSessionKey = (
  data: string
): TE.TaskEither<Error, { encryptedData: EncryptedData; sessionKey: CryptoKey }> => {
  return pipe(
    generateSessionKey(),
    TE.chain(sessionKey => 
      pipe(
        encrypt(data, sessionKey),
        TE.map(encryptedData => ({ encryptedData, sessionKey }))
      )
    )
  )
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate encrypted data structure
 */
export const validateEncryptedData = (data: unknown): E.Either<Error, EncryptedData> => {
  if (!data || typeof data !== 'object') {
    return E.left(new Error('Invalid encrypted data: not an object'))
  }

  const { ciphertext, iv, tag, timestamp } = data as any

  if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
    return E.left(new Error('Invalid encrypted data: missing or invalid ciphertext'))
  }

  if (typeof iv !== 'string' || iv.length === 0) {
    return E.left(new Error('Invalid encrypted data: missing or invalid IV'))
  }

  if (typeof tag !== 'string' || tag.length === 0) {
    return E.left(new Error('Invalid encrypted data: missing or invalid tag'))
  }

  if (typeof timestamp !== 'number' || timestamp <= 0) {
    return E.left(new Error('Invalid encrypted data: missing or invalid timestamp'))
  }

  return E.right({ ciphertext, iv, tag, timestamp })
}

/**
 * Check if encrypted data is expired
 */
export const isEncryptedDataExpired = (
  encryptedData: EncryptedData,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): boolean => {
  const now = Date.now()
  return (now - encryptedData.timestamp) > maxAgeMs
}

// ============================================================================
// Key Rotation
// ============================================================================

/**
 * Rotate encryption key (for security best practices)
 */
export const rotateEncryptionKey = (_password: string): TE.TaskEither<Error, void> => {
  return TE.tryCatch(
    async () => {
      // Generate new salt
      const newSalt = generateRandomBytes(SALT_LENGTH)
      
      // Store new salt
      localStorage.setItem(KEY_DERIVATION_SALT_KEY, arrayBufferToBase64(newSalt))
      
      // Clear any cached keys (implementation depends on your key caching strategy)
      // This would typically involve re-encrypting all stored data with the new key
      
      return void 0
    },
    (error) => new Error(`Key rotation failed: ${error}`)
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a secure random password for automatic key derivation
 */
export const generateSecurePassword = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const randomBytes = generateRandomBytes(length)
  return Array.from(randomBytes, byte => charset[byte % charset.length]).join('')
}

/**
 * Check if Web Crypto API is available
 */
export const isWebCryptoAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.crypto !== 'undefined' && 
         typeof window.crypto.subtle !== 'undefined'
}

/**
 * Get encryption info for debugging (safe to log)
 */
export const getEncryptionInfo = (): Record<string, any> => {
  return {
    webCryptoAvailable: isWebCryptoAvailable(),
    algorithm: DEFAULT_CONFIG.algorithm,
    keyLength: DEFAULT_CONFIG.keyLength,
    ivLength: DEFAULT_CONFIG.ivLength,
    tagLength: DEFAULT_CONFIG.tagLength,
    iterations: ITERATIONS,
    saltLength: SALT_LENGTH
  }
}