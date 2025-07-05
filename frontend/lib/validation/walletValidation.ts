/**
 * Wallet Address Validation Utilities
 * Provides comprehensive validation for different blockchain address formats
 * Follows functional programming patterns with fp-ts
 */

import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { 
  ValidationError, 
  ValidationResult, 
  VALIDATION_CODES 
} from '../../types/utils/validation'

// ============================================================================
// Types
// ============================================================================

export type AddressFormat = 'sei' | 'ethereum' | 'bitcoin' | 'cosmos' | 'unknown'

export interface AddressValidationResult {
  isValid: boolean
  format: AddressFormat
  address: string
  checksum?: boolean
  errors: ValidationError[]
  metadata?: {
    prefix?: string
    length: number
    encoding?: string
    network?: string
  }
}

export interface WalletAddress {
  address: string
  format: AddressFormat
  isValid: boolean
  metadata: {
    prefix?: string
    length: number
    encoding?: string
    network?: string
    hasChecksum?: boolean
  }
}

// ============================================================================
// Constants
// ============================================================================

// Sei blockchain addresses use bech32 encoding with 'sei1' prefix
const SEI_ADDRESS_PREFIX = 'sei1'
const SEI_ADDRESS_LENGTH = 42 // sei1 + 38 characters (total 42)
const SEI_BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// Ethereum addresses are 20 bytes (40 hex characters) with 0x prefix
const ETHEREUM_ADDRESS_LENGTH = 42 // 0x + 40 hex characters
const ETHEREUM_HEX_REGEX = /^0x[a-fA-F0-9]{40}$/

// Bitcoin addresses (for reference, less common in Sei ecosystem)
const BITCOIN_LEGACY_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const BITCOIN_SEGWIT_REGEX = /^bc1[a-z0-9]{39,59}$/

// Cosmos ecosystem addresses
const COSMOS_BECH32_REGEX = /^[a-z]+1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,58}$/

// ============================================================================
// Helper Functions
// ============================================================================

const createValidationError = (
  field: string,
  code: string,
  message: string,
  value?: unknown
): ValidationError => ({
  field,
  code,
  message,
  value,
  context: { timestamp: Date.now() }
})

/**
 * Validate bech32 checksum (simplified implementation)
 * Note: This is a basic implementation. For production, use a proper bech32 library
 */
const validateBech32Checksum = (address: string): boolean => {
  if (!address || address.length < 8) return false
  
  try {
    const prefixIndex = address.lastIndexOf('1')
    if (prefixIndex === -1 || prefixIndex === address.length - 1) return false
    
    const data = address.slice(prefixIndex + 1)
    
    // Check if all characters are valid bech32 characters
    for (const char of data) {
      if (!SEI_BECH32_CHARSET.includes(char.toLowerCase())) {
        return false
      }
    }
    
    // Simplified checksum validation
    // In production, implement full bech32 checksum algorithm
    return data.length >= 6 // Minimum data length for valid address
  } catch {
    return false
  }
}

/**
 * Validate Ethereum address checksum (EIP-55)
 */
const validateEthereumChecksum = (address: string): boolean => {
  if (!ETHEREUM_HEX_REGEX.test(address)) return false
  
  // If all lowercase or all uppercase, checksum is not applied
  const addr = address.slice(2) // Remove 0x prefix
  if (addr === addr.toLowerCase() || addr === addr.toUpperCase()) {
    return true
  }
  
  // For production, implement proper EIP-55 checksum validation
  // This would require keccak256 hashing
  return true // Simplified for now
}

/**
 * Detect address format based on pattern
 */
const detectAddressFormat = (address: string): AddressFormat => {
  if (!address || typeof address !== 'string') return 'unknown'
  
  const trimmed = address.trim()
  
  if (trimmed.startsWith(SEI_ADDRESS_PREFIX)) return 'sei'
  if (ETHEREUM_HEX_REGEX.test(trimmed)) return 'ethereum'
  if (BITCOIN_LEGACY_REGEX.test(trimmed) || BITCOIN_SEGWIT_REGEX.test(trimmed)) return 'bitcoin'
  if (COSMOS_BECH32_REGEX.test(trimmed)) return 'cosmos'
  
  return 'unknown'
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Sei blockchain address
 */
export const validateSeiAddress = (address: string): E.Either<ValidationError, string> => {
  if (!address || typeof address !== 'string') {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.REQUIRED,
      'Address is required',
      address
    ))
  }
  
  const trimmed = address.trim()
  
  if (!trimmed.startsWith(SEI_ADDRESS_PREFIX)) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      `Sei address must start with '${SEI_ADDRESS_PREFIX}'`,
      trimmed
    ))
  }
  
  if (trimmed.length !== SEI_ADDRESS_LENGTH) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      `Sei address must be exactly ${SEI_ADDRESS_LENGTH} characters long`,
      trimmed
    ))
  }
  
  if (!validateBech32Checksum(trimmed)) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      'Invalid Sei address checksum',
      trimmed
    ))
  }
  
  return E.right(trimmed)
}

/**
 * Validate Ethereum address
 */
export const validateEthereumAddress = (address: string): E.Either<ValidationError, string> => {
  if (!address || typeof address !== 'string') {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.REQUIRED,
      'Address is required',
      address
    ))
  }
  
  const trimmed = address.trim()
  
  if (!ETHEREUM_HEX_REGEX.test(trimmed)) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      'Invalid Ethereum address format',
      trimmed
    ))
  }
  
  if (!validateEthereumChecksum(trimmed)) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      'Invalid Ethereum address checksum',
      trimmed
    ))
  }
  
  return E.right(trimmed)
}

/**
 * Validate any supported address format
 */
export const validateAddress = (address: string, expectedFormat?: AddressFormat): E.Either<ValidationError, WalletAddress> => {
  if (!address || typeof address !== 'string') {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.REQUIRED,
      'Address is required',
      address
    ))
  }
  
  const trimmed = address.trim()
  const detectedFormat = detectAddressFormat(trimmed)
  
  if (expectedFormat && detectedFormat !== expectedFormat) {
    return E.left(createValidationError(
      'address',
      VALIDATION_CODES.CUSTOM,
      `Expected ${expectedFormat} address but detected ${detectedFormat}`,
      trimmed
    ))
  }
  
  switch (detectedFormat) {
    case 'sei':
      return pipe(
        validateSeiAddress(trimmed),
        E.map(addr => ({
          address: addr,
          format: 'sei' as AddressFormat,
          isValid: true,
          metadata: {
            prefix: SEI_ADDRESS_PREFIX,
            length: addr.length,
            encoding: 'bech32',
            network: 'sei'
          }
        }))
      )
      
    case 'ethereum':
      return pipe(
        validateEthereumAddress(trimmed),
        E.map(addr => ({
          address: addr,
          format: 'ethereum' as AddressFormat,
          isValid: true,
          metadata: {
            length: addr.length,
            encoding: 'hex',
            network: 'ethereum',
            hasChecksum: validateEthereumChecksum(addr)
          }
        }))
      )
      
    default:
      return E.left(createValidationError(
        'address',
        VALIDATION_CODES.CUSTOM,
        `Unsupported address format: ${detectedFormat}`,
        trimmed
      ))
  }
}

/**
 * Comprehensive address validation with detailed results
 */
export const validateAddressComprehensive = (address: string, expectedFormat?: AddressFormat): AddressValidationResult => {
  const errors: ValidationError[] = []
  
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      format: 'unknown',
      address: address || '',
      errors: [createValidationError('address', VALIDATION_CODES.REQUIRED, 'Address is required', address)],
      metadata: {
        length: 0,
        encoding: 'unknown'
      }
    }
  }
  
  const trimmed = address.trim()
  const detectedFormat = detectAddressFormat(trimmed)
  
  const result = validateAddress(trimmed, expectedFormat)
  
  if (E.isLeft(result)) {
    errors.push(result.left)
  }
  
  return {
    isValid: E.isRight(result),
    format: detectedFormat,
    address: trimmed,
    errors,
    metadata: E.isRight(result) ? result.right.metadata : {
      length: trimmed.length,
      encoding: 'unknown'
    }
  }
}

// ============================================================================
// Validation Result Helpers
// ============================================================================

/**
 * Check if address is valid for a specific format
 */
export const isValidAddress = (address: string, format?: AddressFormat): boolean => {
  const result = validateAddress(address, format)
  return E.isRight(result)
}

/**
 * Get address format without validation
 */
export const getAddressFormat = (address: string): AddressFormat => {
  return detectAddressFormat(address)
}

/**
 * Normalize address (trim and convert to proper case)
 */
export const normalizeAddress = (address: string, format?: AddressFormat): E.Either<ValidationError, string> => {
  return pipe(
    validateAddress(address, format),
    E.map(walletAddr => {
      switch (walletAddr.format) {
        case 'sei':
          return walletAddr.address.toLowerCase()
        case 'ethereum':
          return walletAddr.address.toLowerCase()
        default:
          return walletAddr.address
      }
    })
  )
}

/**
 * Batch validate multiple addresses
 */
export const validateAddresses = (addresses: string[], expectedFormat?: AddressFormat): ValidationResult<WalletAddress[]> => {
  const validAddresses: WalletAddress[] = []
  const errors: ValidationError[] = []
  
  addresses.forEach((address, index) => {
    const result = validateAddress(address, expectedFormat)
    if (E.isLeft(result)) {
      errors.push({
        ...result.left,
        field: `addresses[${index}]`
      })
    } else {
      validAddresses.push(result.right)
    }
  })
  
  return {
    isValid: errors.length === 0,
    data: validAddresses,
    errors,
    warnings: []
  }
}

// ============================================================================
// Export all validation functions
// ============================================================================

export const walletValidation = {
  validateSeiAddress,
  validateEthereumAddress,
  validateAddress,
  validateAddressComprehensive,
  isValidAddress,
  getAddressFormat,
  normalizeAddress,
  validateAddresses,
  detectAddressFormat
} as const

export type WalletValidationType = keyof typeof walletValidation