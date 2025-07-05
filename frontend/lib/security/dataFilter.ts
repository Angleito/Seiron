/**
 * Data filtering utility for sensitive information
 * Removes or masks sensitive data before logging or storage
 */

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// ============================================================================
// Types
// ============================================================================

export interface FilterConfig {
  maskSensitiveData: boolean
  allowedFields: string[]
  sensitivePatterns: RegExp[]
  customFilters: Array<(data: unknown) => unknown>
}

export interface FilterResult {
  filtered: unknown
  sensitiveFieldsDetected: string[]
  redactedCount: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SENSITIVE_PATTERNS = [
  /address/i,
  /wallet/i,
  /private/i,
  /secret/i,
  /key/i,
  /password/i,
  /token/i,
  /auth/i,
  /session/i,
  /mnemonic/i,
  /seed/i,
  /signature/i,
  /hash/i,
  /balance/i,
  /amount/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /credit/i,
  /debit/i,
  /card/i,
  /account/i,
  /transaction/i,
  /tx/i,
  /receipt/i,
  /invoice/i,
  /payment/i,
  /user_id/i,
  /user_data/i,
  /personal/i,
  /identity/i,
  /kyc/i,
  /aml/i
]

const DEFAULT_CONFIG: FilterConfig = {
  maskSensitiveData: true,
  allowedFields: ['timestamp', 'type', 'status', 'network', 'chainId', 'version'],
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
  customFilters: []
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a field name matches sensitive patterns
 */
const isSensitiveField = (fieldName: string, patterns: RegExp[]): boolean => {
  if (typeof fieldName !== 'string') return false
  return patterns.some(pattern => pattern.test(fieldName))
}

/**
 * Mask sensitive string values
 */
const maskValue = (value: unknown): string => {
  if (typeof value === 'string') {
    if (value.length <= 4) return '***'
    if (value.length <= 8) return `${value.slice(0, 2)}***`
    return `${value.slice(0, 4)}***${value.slice(-4)}`
  }
  return '[REDACTED]'
}

/**
 * Check if value appears to be sensitive data
 */
const isValueSensitive = (value: unknown): boolean => {
  if (typeof value === 'string') {
    // Check for common sensitive data patterns
    const sensitiveValuePatterns = [
      /^0x[a-fA-F0-9]{40}$/, // Ethereum address
      /^0x[a-fA-F0-9]{64}$/, // Hash/signature
      /^[a-zA-Z0-9+/]{40,}={0,2}$/, // Base64 encoded data
      /^[a-zA-Z0-9]{32,}$/, // Long alphanumeric strings (likely keys)
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email
      /^\+?[\d\s\-\(\)]{10,}$/, // Phone number
      /^[a-zA-Z0-9]{6,}-[a-zA-Z0-9]{6,}$/, // API keys with dashes
      /^sk_[a-zA-Z0-9]{32,}$/, // Stripe secret keys
      /^pk_[a-zA-Z0-9]{32,}$/, // Stripe public keys
      /^[a-zA-Z0-9_]{32,}$/, // Long underscore-separated strings
    ]
    
    return sensitiveValuePatterns.some(pattern => pattern.test(value))
  }
  return false
}

// ============================================================================
// Core Filtering Functions
// ============================================================================

/**
 * Filter a single object recursively
 */
const filterObject = (
  obj: Record<string, any>,
  config: FilterConfig,
  path: string[] = []
): FilterResult => {
  const filtered: Record<string, any> = {}
  let sensitiveFieldsDetected: string[] = []
  let redactedCount = 0

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key]
    const fieldPath = currentPath.join('.')
    
    // Check if field is sensitive
    const isFieldSensitive = isSensitiveField(key, config.sensitivePatterns)
    const isValueSensitiveData = isValueSensitive(value)
    
    if (isFieldSensitive || isValueSensitiveData) {
      sensitiveFieldsDetected.push(fieldPath)
      
      if (config.maskSensitiveData) {
        // Mask the sensitive data
        filtered[key] = maskValue(value)
        redactedCount++
      } else {
        // Include allowed fields even if they match patterns
        if (config.allowedFields.includes(key)) {
          filtered[key] = value
        } else {
          filtered[key] = '[REDACTED]'
          redactedCount++
        }
      }
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively filter nested objects
      const nestedResult = filterObject(value, config, currentPath)
      filtered[key] = nestedResult.filtered
      sensitiveFieldsDetected.push(...nestedResult.sensitiveFieldsDetected)
      redactedCount += nestedResult.redactedCount
    } else if (Array.isArray(value)) {
      // Filter arrays
      const arrayResult = filterArray(value, config, currentPath)
      filtered[key] = arrayResult.filtered
      sensitiveFieldsDetected.push(...arrayResult.sensitiveFieldsDetected)
      redactedCount += arrayResult.redactedCount
    } else {
      // Keep non-sensitive primitive values
      filtered[key] = value
    }
  }

  return {
    filtered,
    sensitiveFieldsDetected,
    redactedCount
  }
}

/**
 * Filter an array recursively
 */
const filterArray = (
  arr: unknown[],
  config: FilterConfig,
  path: string[] = []
): FilterResult => {
  const filtered: unknown[] = []
  let sensitiveFieldsDetected: string[] = []
  let redactedCount = 0

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    const currentPath = [...path, i.toString()]
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedResult = filterObject(value, config, currentPath)
      filtered.push(nestedResult.filtered)
      sensitiveFieldsDetected.push(...nestedResult.sensitiveFieldsDetected)
      redactedCount += nestedResult.redactedCount
    } else if (Array.isArray(value)) {
      const arrayResult = filterArray(value, config, currentPath)
      filtered.push(arrayResult.filtered)
      sensitiveFieldsDetected.push(...arrayResult.sensitiveFieldsDetected)
      redactedCount += arrayResult.redactedCount
    } else {
      // Check if the value itself is sensitive
      if (isValueSensitive(value)) {
        filtered.push(config.maskSensitiveData ? maskValue(value) : '[REDACTED]')
        sensitiveFieldsDetected.push(currentPath.join('.'))
        redactedCount++
      } else {
        filtered.push(value)
      }
    }
  }

  return {
    filtered,
    sensitiveFieldsDetected,
    redactedCount
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Filter sensitive data from any input
 */
export const filterSensitiveData = (
  data: unknown,
  config: Partial<FilterConfig> = {}
): FilterResult => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  try {
    if (data === null || data === undefined) {
      return { filtered: data, sensitiveFieldsDetected: [], redactedCount: 0 }
    }
    
    if (typeof data === 'string') {
      if (isValueSensitive(data)) {
        return {
          filtered: finalConfig.maskSensitiveData ? maskValue(data) : '[REDACTED]',
          sensitiveFieldsDetected: ['root'],
          redactedCount: 1
        }
      }
      return { filtered: data, sensitiveFieldsDetected: [], redactedCount: 0 }
    }
    
    if (Array.isArray(data)) {
      return filterArray(data, finalConfig)
    }
    
    if (typeof data === 'object') {
      return filterObject(data, finalConfig)
    }
    
    // For primitives (numbers, booleans, etc.)
    return { filtered: data, sensitiveFieldsDetected: [], redactedCount: 0 }
  } catch (error) {
    // If filtering fails, return a safe fallback
    return {
      filtered: '[FILTERING_ERROR]',
      sensitiveFieldsDetected: [],
      redactedCount: 0
    }
  }
}

/**
 * Safe console.log that filters sensitive data
 */
export const safeLog = (message: string, data?: unknown, config?: Partial<FilterConfig>): void => {
  if (data === undefined) {
    console.log(message)
    return
  }
  
  const filtered = filterSensitiveData(data, config)
  console.log(message, filtered.filtered)
  
  if (filtered.sensitiveFieldsDetected.length > 0) {
    console.log(`[SECURITY] ${filtered.redactedCount} sensitive fields redacted:`, filtered.sensitiveFieldsDetected)
  }
}

/**
 * Create a custom filter function
 */
export const createCustomFilter = (config: Partial<FilterConfig> = {}) => {
  return (data: unknown) => filterSensitiveData(data, config)
}

/**
 * Prepare data for safe logging (returns just the filtered data)
 */
export const prepareForLogging = (data: unknown, config?: Partial<FilterConfig>): unknown => {
  return filterSensitiveData(data, config).filtered
}

/**
 * Check if data contains sensitive information
 */
export const containsSensitiveData = (data: unknown, config?: Partial<FilterConfig>): boolean => {
  const result = filterSensitiveData(data, config)
  return result.sensitiveFieldsDetected.length > 0
}

/**
 * Get statistics about sensitive data detection
 */
export const getSensitiveDataStats = (data: unknown, config?: Partial<FilterConfig>): {
  hasSensitiveData: boolean
  sensitiveFieldsCount: number
  sensitiveFields: string[]
  redactedCount: number
} => {
  const result = filterSensitiveData(data, config)
  return {
    hasSensitiveData: result.sensitiveFieldsDetected.length > 0,
    sensitiveFieldsCount: result.sensitiveFieldsDetected.length,
    sensitiveFields: result.sensitiveFieldsDetected,
    redactedCount: result.redactedCount
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that data is safe for logging
 */
export const validateSafeForLogging = (data: unknown): E.Either<string, unknown> => {
  if (containsSensitiveData(data)) {
    return E.left('Data contains sensitive information and should not be logged')
  }
  return E.right(data)
}

/**
 * Validate and prepare data for logging
 */
export const validateAndPrepareForLogging = (data: unknown, config?: Partial<FilterConfig>): E.Either<string, unknown> => {
  try {
    const filtered = prepareForLogging(data, config)
    return E.right(filtered)
  } catch (error) {
    return E.left(`Failed to prepare data for logging: ${error}`)
  }
}

// ============================================================================
// Export configurations for common use cases
// ============================================================================

export const STRICT_FILTER_CONFIG: FilterConfig = {
  maskSensitiveData: false, // Completely remove sensitive data
  allowedFields: ['timestamp', 'type', 'status', 'network'],
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
  customFilters: []
}

export const DEVELOPMENT_FILTER_CONFIG: FilterConfig = {
  maskSensitiveData: true, // Mask but don't completely remove
  allowedFields: ['timestamp', 'type', 'status', 'network', 'chainId', 'version', 'error'],
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
  customFilters: []
}

export const PRODUCTION_FILTER_CONFIG: FilterConfig = {
  maskSensitiveData: false, // Completely remove sensitive data in production
  allowedFields: ['timestamp', 'type', 'status', 'network'],
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
  customFilters: []
}