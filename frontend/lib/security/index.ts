/**
 * Security module exports
 * Provides a unified interface for all security-related functionality
 */

// Core encryption utilities
export {
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  encryptWithSessionKey,
  validateEncryptedData,
  isEncryptedDataExpired,
  rotateEncryptionKey,
  generateSecurePassword,
  isWebCryptoAvailable,
  getEncryptionInfo
} from './encryption'

// Secure storage
export {
  SecureStorage,
  secureLocalStorage,
  secureSessionStorage,
  initializeSecureSession,
  clearSecureSession,
  getSecurityStatus
} from './secureStorage'

// Data filtering
export {
  filterSensitiveData,
  safeLog,
  createCustomFilter,
  prepareForLogging,
  containsSensitiveData,
  getSensitiveDataStats,
  validateSafeForLogging,
  validateAndPrepareForLogging,
  STRICT_FILTER_CONFIG,
  DEVELOPMENT_FILTER_CONFIG,
  PRODUCTION_FILTER_CONFIG
} from './dataFilter'

// Security initialization and management
export { initializeSecurity, getSecurityDiagnostics } from './securityManager'