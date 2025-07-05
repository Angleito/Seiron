/**
 * Security Verification Script
 * Verify that sensitive data is properly encrypted and filtered
 */

import { 
  filterSensitiveData, 
  prepareForLogging, 
  containsSensitiveData,
  PRODUCTION_FILTER_CONFIG,
  DEVELOPMENT_FILTER_CONFIG 
} from './dataFilter'
import { 
  secureLocalStorage, 
  getSecurityStatus 
} from './secureStorage'
import { 
  isWebCryptoAvailable, 
  getEncryptionInfo 
} from './encryption'
import { 
  getSecurityDiagnostics 
} from './securityManager'

// ============================================================================
// Test Data
// ============================================================================

const testSensitiveData = {
  // Wallet data
  walletAddress: '0x742d35cc6db5a53a9b33bcadf5c98c5b3a0dfb8f',
  privateKey: 'ab12cd34ef56gh78ij90kl12mn34op56qr78st90uv12wx34yz56',
  mnemonic: 'abandon ability able about above absent absorb abstract absurd abuse access',
  
  // User data
  email: 'user@example.com',
  phone: '+1-555-123-4567',
  userId: 'user_123456789',
  
  // Transaction data
  transactionHash: '0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d5232a5ce5a15de9c0',
  amount: 1000.50,
  balance: 5000.25,
  
  // API keys
  apiKey: 'sk_live_abcdef123456789',
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  
  // Non-sensitive data
  chainId: 1,
  network: 'ethereum',
  timestamp: Date.now(),
  status: 'completed',
  type: 'transfer'
}

const testNonSensitiveData = {
  chainId: 1,
  network: 'ethereum',
  timestamp: Date.now(),
  status: 'completed',
  type: 'transfer',
  version: '1.0.0'
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify data filtering functionality
 */
export const verifyDataFiltering = (): {
  passed: boolean
  results: Record<string, any>
  errors: string[]
} => {
  const results: Record<string, any> = {}
  const errors: string[] = []
  let passed = true

  try {
    // Test sensitive data detection
    const hasSensitive = containsSensitiveData(testSensitiveData)
    results.sensitiveDataDetected = hasSensitive
    
    if (!hasSensitive) {
      errors.push('Failed to detect sensitive data in test object')
      passed = false
    }

    // Test non-sensitive data
    const hasNonSensitive = containsSensitiveData(testNonSensitiveData)
    results.nonSensitiveDataClean = !hasNonSensitive
    
    if (hasNonSensitive) {
      errors.push('Incorrectly flagged non-sensitive data as sensitive')
      passed = false
    }

    // Test production filtering
    const prodFiltered = filterSensitiveData(testSensitiveData, PRODUCTION_FILTER_CONFIG)
    results.productionFiltering = {
      fieldsDetected: prodFiltered.sensitiveFieldsDetected.length,
      redactedCount: prodFiltered.redactedCount,
      sample: prodFiltered.filtered
    }

    // Verify sensitive fields are redacted in production
    const sensitiveFields = ['walletAddress', 'privateKey', 'email', 'transactionHash']
    for (const field of sensitiveFields) {
      if (prodFiltered.filtered[field] && prodFiltered.filtered[field] !== '[REDACTED]') {
        errors.push(`Sensitive field '${field}' not properly redacted in production mode`)
        passed = false
      }
    }

    // Test development filtering
    const devFiltered = filterSensitiveData(testSensitiveData, DEVELOPMENT_FILTER_CONFIG)
    results.developmentFiltering = {
      fieldsDetected: devFiltered.sensitiveFieldsDetected.length,
      redactedCount: devFiltered.redactedCount,
      sample: devFiltered.filtered
    }

    // Verify sensitive fields are masked (not completely redacted) in development
    for (const field of sensitiveFields) {
      if (devFiltered.filtered[field] && 
          devFiltered.filtered[field] !== '[REDACTED]' && 
          !devFiltered.filtered[field].includes('***')) {
        errors.push(`Sensitive field '${field}' not properly masked in development mode`)
        passed = false
      }
    }

    // Test nested object filtering
    const nestedData = {
      user: testSensitiveData,
      metadata: testNonSensitiveData
    }
    
    const nestedFiltered = filterSensitiveData(nestedData, PRODUCTION_FILTER_CONFIG)
    results.nestedFiltering = {
      fieldsDetected: nestedFiltered.sensitiveFieldsDetected.length,
      redactedCount: nestedFiltered.redactedCount
    }

    if (nestedFiltered.sensitiveFieldsDetected.length === 0) {
      errors.push('Failed to detect sensitive data in nested objects')
      passed = false
    }

    // Test array filtering
    const arrayData = {
      transactions: [
        { hash: '0x123...', amount: 100 },
        { hash: '0x456...', amount: 200 }
      ]
    }
    
    const arrayFiltered = filterSensitiveData(arrayData, PRODUCTION_FILTER_CONFIG)
    results.arrayFiltering = {
      fieldsDetected: arrayFiltered.sensitiveFieldsDetected.length,
      redactedCount: arrayFiltered.redactedCount
    }

  } catch (error) {
    errors.push(`Data filtering verification failed: ${error}`)
    passed = false
  }

  return { passed, results, errors }
}

/**
 * Verify secure storage functionality
 */
export const verifySecureStorage = async (): Promise<{
  passed: boolean
  results: Record<string, any>
  errors: string[]
}> => {
  const results: Record<string, any> = {}
  const errors: string[] = []
  let passed = true

  try {
    // Test storage statistics
    const stats = secureLocalStorage.getStats()
    results.storageStats = stats

    // Test security status
    const securityStatus = getSecurityStatus()
    results.securityStatus = securityStatus

    if (!securityStatus.webCryptoAvailable) {
      errors.push('Web Crypto API not available')
      passed = false
    }

    // Test storage with sensitive data (would be encrypted)
    const testKey = 'test_wallet_data'
    const setResult = await secureLocalStorage.setItem(testKey, testSensitiveData)
    
    if (setResult._tag === 'Left') {
      errors.push(`Failed to store sensitive data: ${setResult.left.message}`)
      passed = false
    } else {
      results.storageWrite = 'success'
    }

    // Test retrieval
    const retrieved = await secureLocalStorage.getItem(testKey)
    if (retrieved._tag === 'None') {
      errors.push('Failed to retrieve stored sensitive data')
      passed = false
    } else {
      results.storageRead = 'success'
      
      // Verify data integrity
      const retrievedData = retrieved.value
      if (retrievedData.walletAddress !== testSensitiveData.walletAddress) {
        errors.push('Retrieved data does not match stored data')
        passed = false
      }
    }

    // Test removal
    const removeResult = await secureLocalStorage.removeItem(testKey)
    if (removeResult._tag === 'Left') {
      errors.push(`Failed to remove stored data: ${removeResult.left.message}`)
      passed = false
    } else {
      results.storageRemoval = 'success'
    }

    // Verify removal
    const afterRemoval = await secureLocalStorage.getItem(testKey)
    if (afterRemoval._tag !== 'None') {
      errors.push('Data still exists after removal')
      passed = false
    }

  } catch (error) {
    errors.push(`Secure storage verification failed: ${error}`)
    passed = false
  }

  return { passed, results, errors }
}

/**
 * Verify encryption functionality
 */
export const verifyEncryption = (): {
  passed: boolean
  results: Record<string, any>
  errors: string[]
} => {
  const results: Record<string, any> = {}
  const errors: string[] = []
  let passed = true

  try {
    // Check Web Crypto availability
    const webCryptoAvailable = isWebCryptoAvailable()
    results.webCryptoAvailable = webCryptoAvailable

    if (!webCryptoAvailable) {
      errors.push('Web Crypto API not available')
      passed = false
    }

    // Get encryption info
    const encryptionInfo = getEncryptionInfo()
    results.encryptionInfo = encryptionInfo

    // Verify encryption configuration
    if (encryptionInfo.algorithm !== 'AES-GCM') {
      errors.push('Unexpected encryption algorithm')
      passed = false
    }

    if (encryptionInfo.keyLength !== 256) {
      errors.push('Unexpected key length')
      passed = false
    }

  } catch (error) {
    errors.push(`Encryption verification failed: ${error}`)
    passed = false
  }

  return { passed, results, errors }
}

/**
 * Verify security diagnostics
 */
export const verifySecurityDiagnostics = (): {
  passed: boolean
  results: Record<string, any>
  errors: string[]
} => {
  const results: Record<string, any> = {}
  const errors: string[] = []
  let passed = true

  try {
    const diagnostics = getSecurityDiagnostics()
    results.diagnostics = diagnostics

    // Check required properties
    const requiredProps = ['webCryptoAvailable', 'encryptionInfo', 'securityStatus', 'timestamp', 'errors', 'warnings', 'recommendations']
    for (const prop of requiredProps) {
      if (!diagnostics.hasOwnProperty(prop)) {
        errors.push(`Missing diagnostic property: ${prop}`)
        passed = false
      }
    }

    // Check for critical errors
    if (diagnostics.errors.length > 0) {
      errors.push(`Security diagnostics reported errors: ${diagnostics.errors.join(', ')}`)
      passed = false
    }

  } catch (error) {
    errors.push(`Security diagnostics verification failed: ${error}`)
    passed = false
  }

  return { passed, results, errors }
}

/**
 * Run comprehensive security verification
 */
export const runSecurityVerification = async (): Promise<{
  overallPassed: boolean
  summary: Record<string, boolean>
  details: Record<string, any>
  allErrors: string[]
}> => {
  console.group('🔒 Security Verification')

  const summary: Record<string, boolean> = {}
  const details: Record<string, any> = {}
  const allErrors: string[] = []

  // Test data filtering
  console.log('Testing data filtering...')
  const filteringResult = verifyDataFiltering()
  summary.dataFiltering = filteringResult.passed
  details.dataFiltering = filteringResult.results
  allErrors.push(...filteringResult.errors)

  // Test secure storage
  console.log('Testing secure storage...')
  const storageResult = await verifySecureStorage()
  summary.secureStorage = storageResult.passed
  details.secureStorage = storageResult.results
  allErrors.push(...storageResult.errors)

  // Test encryption
  console.log('Testing encryption...')
  const encryptionResult = verifyEncryption()
  summary.encryption = encryptionResult.passed
  details.encryption = encryptionResult.results
  allErrors.push(...encryptionResult.errors)

  // Test security diagnostics
  console.log('Testing security diagnostics...')
  const diagnosticsResult = verifySecurityDiagnostics()
  summary.diagnostics = diagnosticsResult.passed
  details.diagnostics = diagnosticsResult.results
  allErrors.push(...diagnosticsResult.errors)

  const overallPassed = Object.values(summary).every(Boolean)

  console.log('Summary:', summary)
  
  if (allErrors.length > 0) {
    console.error('Errors:', allErrors)
  }
  
  if (overallPassed) {
    console.log('✅ All security verification tests passed!')
  } else {
    console.error('❌ Some security verification tests failed!')
  }

  console.groupEnd()

  return {
    overallPassed,
    summary,
    details,
    allErrors
  }
}

// ============================================================================
// Export for development use
// ============================================================================

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Make verification function available in development console
  (window as any).runSecurityVerification = runSecurityVerification
  console.log('Security verification available: window.runSecurityVerification()')
}