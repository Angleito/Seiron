/**
 * Token symbol validation utilities with normalization and comprehensive validation
 * Uses functional programming patterns with fp-ts and property-based testing patterns
 */

import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { ValidationError, VALIDATION_CODES } from '../../types/utils/validation'

// ============================================================================
// Token Symbol Validation Types
// ============================================================================

export interface TokenSymbolValidationConfig {
  minLength: number
  maxLength: number
  allowedSpecialChars: string[]
  allowNumbers: boolean
  allowLowercase: boolean
  requireUppercase: boolean
  customPatterns?: RegExp[]
  blacklistedSymbols?: string[]
}

export interface NormalizedTokenSymbol {
  original: string
  normalized: string
  isValid: boolean
  transformations: string[]
}

export interface TokenSymbolValidationResult {
  isValid: boolean
  normalizedSymbol: string
  errors: ValidationError[]
  warnings: string[]
  metadata: {
    originalLength: number
    normalizedLength: number
    hasSpecialChars: boolean
    hasNumbers: boolean
    hasLowercase: boolean
    transformationsApplied: string[]
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TOKEN_SYMBOL_CONFIG: TokenSymbolValidationConfig = {
  minLength: 1,
  maxLength: 20,
  allowedSpecialChars: ['-', '_', '.'],
  allowNumbers: true,
  allowLowercase: true,
  requireUppercase: false,
  blacklistedSymbols: [
    'NULL', 'UNDEFINED', 'VOID', 'EMPTY', 'SPAM', 'SCAM', 'FAKE',
    'TEST', 'DEMO', 'SAMPLE', 'MOCK', 'TEMP', 'TMP'
  ]
}

export const STRICT_TOKEN_SYMBOL_CONFIG: TokenSymbolValidationConfig = {
  minLength: 2,
  maxLength: 10,
  allowedSpecialChars: [],
  allowNumbers: false,
  allowLowercase: false,
  requireUppercase: true,
  blacklistedSymbols: DEFAULT_TOKEN_SYMBOL_CONFIG.blacklistedSymbols
}

export const PERMISSIVE_TOKEN_SYMBOL_CONFIG: TokenSymbolValidationConfig = {
  minLength: 1,
  maxLength: 50,
  allowedSpecialChars: ['-', '_', '.', '/', ':', '#', '@', '&', '+', '='],
  allowNumbers: true,
  allowLowercase: true,
  requireUppercase: false
}

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

const isUpperCase = (char: string): boolean => char === char.toUpperCase() && char !== char.toLowerCase()
const isLowerCase = (char: string): boolean => char === char.toLowerCase() && char !== char.toUpperCase()
const isDigit = (char: string): boolean => /\d/.test(char)
const isSpecialChar = (char: string): boolean => /[^a-zA-Z0-9]/.test(char)
const isWhitespace = (char: string): boolean => /\s/.test(char)

// ============================================================================
// Token Symbol Normalization
// ============================================================================

/**
 * Normalize a token symbol by applying standardization rules
 */
export const normalizeTokenSymbol = (
  symbol: string,
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): NormalizedTokenSymbol => {
  const transformations: string[] = []
  let normalized = symbol

  // Track original
  const original = symbol

  // Remove leading/trailing whitespace
  if (normalized !== normalized.trim()) {
    normalized = normalized.trim()
    transformations.push('trim_whitespace')
  }

  // Remove internal whitespace
  if (normalized.includes(' ') || normalized.includes('\t') || normalized.includes('\n')) {
    normalized = normalized.replace(/\s+/g, '')
    transformations.push('remove_internal_whitespace')
  }

  // Convert to uppercase if required
  if (config.requireUppercase && normalized !== normalized.toUpperCase()) {
    normalized = normalized.toUpperCase()
    transformations.push('convert_to_uppercase')
  }

  // Remove disallowed special characters
  const allowedSpecialChars = new Set(config.allowedSpecialChars)
  let hasRemovedSpecialChars = false
  const chars = normalized.split('')
  const filteredChars = chars.filter(char => {
    if (isSpecialChar(char) && !allowedSpecialChars.has(char)) {
      hasRemovedSpecialChars = true
      return false
    }
    return true
  })
  
  if (hasRemovedSpecialChars) {
    normalized = filteredChars.join('')
    transformations.push('remove_disallowed_special_chars')
  }

  // Remove numbers if not allowed
  if (!config.allowNumbers && /\d/.test(normalized)) {
    normalized = normalized.replace(/\d/g, '')
    transformations.push('remove_numbers')
  }

  // Convert lowercase to uppercase if not allowed
  if (!config.allowLowercase && /[a-z]/.test(normalized)) {
    normalized = normalized.replace(/[a-z]/g, char => char.toUpperCase())
    transformations.push('convert_lowercase_to_uppercase')
  }

  // Remove consecutive duplicate characters
  const beforeDuplicateRemoval = normalized
  normalized = normalized.replace(/(.)\1+/g, '$1')
  if (beforeDuplicateRemoval !== normalized) {
    transformations.push('remove_consecutive_duplicates')
  }

  return {
    original,
    normalized,
    isValid: true, // Will be validated separately
    transformations
  }
}

// ============================================================================
// Token Symbol Validation
// ============================================================================

/**
 * Validate a token symbol against configuration rules
 */
export const validateTokenSymbol = (
  symbol: string,
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): E.Either<ValidationError[], TokenSymbolValidationResult> => {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Handle null/undefined
  if (symbol === null || symbol === undefined) {
    return E.left([createValidationError('symbol', VALIDATION_CODES.REQUIRED, 'Token symbol is required')])
  }

  // Must be string
  if (typeof symbol !== 'string') {
    return E.left([createValidationError('symbol', VALIDATION_CODES.TYPE_ERROR, 'Token symbol must be a string', symbol)])
  }

  const originalLength = symbol.length
  const normalized = normalizeTokenSymbol(symbol, config)
  const normalizedLength = normalized.normalized.length

  // Check original length constraints first (before normalization)
  if (originalLength > config.maxLength) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.MAX_LENGTH,
      `Token symbol must be at most ${config.maxLength} characters`,
      symbol
    ))
  }

  // Check normalized length constraints
  if (normalizedLength < config.minLength) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.MIN_LENGTH,
      `Token symbol must be at least ${config.minLength} characters after normalization`,
      symbol
    ))
  }

  // Additional check for normalized length exceeding max (edge case)
  if (normalizedLength > config.maxLength) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.MAX_LENGTH,
      `Token symbol must be at most ${config.maxLength} characters after normalization`,
      symbol
    ))
  }

  // Check for empty after normalization
  if (normalizedLength === 0) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.CUSTOM,
      'Token symbol cannot be empty after normalization',
      symbol
    ))
  }

  // Check character composition
  const chars = normalized.normalized.split('')
  const hasNumbers = chars.some(isDigit)
  const hasLowercase = chars.some(isLowerCase)
  const hasUppercase = chars.some(isUpperCase)
  const hasSpecialChars = chars.some(char => isSpecialChar(char))

  if (hasNumbers && !config.allowNumbers) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.CUSTOM,
      'Token symbol cannot contain numbers',
      symbol
    ))
  }

  if (hasLowercase && !config.allowLowercase) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.CUSTOM,
      'Token symbol cannot contain lowercase letters',
      symbol
    ))
  }

  if (config.requireUppercase && !hasUppercase) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.CUSTOM,
      'Token symbol must contain at least one uppercase letter',
      symbol
    ))
  }

  // Check for disallowed special characters
  if (hasSpecialChars) {
    const allowedSpecialChars = new Set(config.allowedSpecialChars)
    const disallowedChars = chars.filter(char => 
      isSpecialChar(char) && !allowedSpecialChars.has(char)
    )
    
    if (disallowedChars.length > 0) {
      errors.push(createValidationError(
        'symbol',
        VALIDATION_CODES.CUSTOM,
        `Token symbol contains disallowed special characters: ${disallowedChars.join(', ')}`,
        symbol
      ))
    }
  }

  // Check blacklisted symbols
  if (config.blacklistedSymbols && config.blacklistedSymbols.includes(normalized.normalized.toUpperCase())) {
    errors.push(createValidationError(
      'symbol',
      VALIDATION_CODES.CUSTOM,
      `Token symbol '${normalized.normalized}' is blacklisted`,
      symbol
    ))
  }

  // Check custom patterns
  if (config.customPatterns) {
    for (const pattern of config.customPatterns) {
      if (!pattern.test(normalized.normalized)) {
        errors.push(createValidationError(
          'symbol',
          VALIDATION_CODES.CUSTOM,
          `Token symbol does not match required pattern: ${pattern.source}`,
          symbol
        ))
      }
    }
  }

  // Generate warnings
  if (normalized.transformations.length > 0) {
    warnings.push(`Symbol was normalized: ${normalized.transformations.join(', ')}`)
  }

  if (originalLength !== normalizedLength) {
    warnings.push(`Symbol length changed from ${originalLength} to ${normalizedLength} after normalization`)
  }

  if (hasSpecialChars && config.allowedSpecialChars.length === 0) {
    warnings.push('Consider avoiding special characters in token symbols for better compatibility')
  }

  if (normalizedLength > 10) {
    warnings.push('Long token symbols may have display issues in some interfaces')
  }

  const result: TokenSymbolValidationResult = {
    isValid: errors.length === 0,
    normalizedSymbol: normalized.normalized,
    errors,
    warnings,
    metadata: {
      originalLength,
      normalizedLength,
      hasSpecialChars,
      hasNumbers,
      hasLowercase,
      transformationsApplied: normalized.transformations
    }
  }

  return errors.length === 0 ? E.right(result) : E.left(errors)
}

/**
 * Synchronous version of validateTokenSymbol that returns the result directly
 */
export const validateTokenSymbolSync = (
  symbol: string,
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): TokenSymbolValidationResult => {
  const result = validateTokenSymbol(symbol, config)
  if (E.isLeft(result)) {
    return {
      isValid: false,
      normalizedSymbol: '',
      errors: result.left,
      warnings: [],
      metadata: {
        originalLength: symbol?.length || 0,
        normalizedLength: 0,
        hasSpecialChars: false,
        hasNumbers: false,
        hasLowercase: false,
        transformationsApplied: []
      }
    }
  }
  return result.right
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a token symbol is valid according to configuration
 */
export const isValidTokenSymbol = (
  symbol: string,
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): boolean => {
  return validateTokenSymbolSync(symbol, config).isValid
}

/**
 * Get normalized token symbol
 */
export const getNormalizedTokenSymbol = (
  symbol: string,
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): string => {
  return normalizeTokenSymbol(symbol, config).normalized
}

/**
 * Batch validate multiple token symbols
 */
export const validateTokenSymbols = (
  symbols: string[],
  config: TokenSymbolValidationConfig = DEFAULT_TOKEN_SYMBOL_CONFIG
): { valid: string[]; invalid: Array<{ symbol: string; errors: ValidationError[] }> } => {
  const valid: string[] = []
  const invalid: Array<{ symbol: string; errors: ValidationError[] }> = []

  for (const symbol of symbols) {
    const result = validateTokenSymbol(symbol, config)
    if (E.isRight(result)) {
      valid.push(result.right.normalizedSymbol)
    } else {
      invalid.push({ symbol, errors: result.left })
    }
  }

  return { valid, invalid }
}

/**
 * Create a custom validation config
 */
export const createTokenSymbolConfig = (
  overrides: Partial<TokenSymbolValidationConfig>
): TokenSymbolValidationConfig => ({
  ...DEFAULT_TOKEN_SYMBOL_CONFIG,
  ...overrides
})

// ============================================================================
// Common Validation Presets
// ============================================================================

export const VALIDATION_PRESETS = {
  // Standard cryptocurrency tokens (BTC, ETH, etc.)
  CRYPTO_STANDARD: createTokenSymbolConfig({
    minLength: 2,
    maxLength: 8,
    allowedSpecialChars: [],
    allowNumbers: false,
    allowLowercase: false,
    requireUppercase: true
  }),

  // DeFi tokens with more flexibility
  DEFI_FLEXIBLE: createTokenSymbolConfig({
    minLength: 2,
    maxLength: 15,
    allowedSpecialChars: ['-', '_'],
    allowNumbers: true,
    allowLowercase: true,
    requireUppercase: false
  }),

  // Meme tokens and experimental tokens
  MEME_PERMISSIVE: createTokenSymbolConfig({
    minLength: 1,
    maxLength: 25,
    allowedSpecialChars: ['-', '_', '.', '!', '?', '@', '#', '$', '%'],
    allowNumbers: true,
    allowLowercase: true,
    requireUppercase: false,
    blacklistedSymbols: ['SCAM', 'FAKE', 'SPAM']
  }),

  // Enterprise/institutional tokens
  ENTERPRISE_STRICT: createTokenSymbolConfig({
    minLength: 3,
    maxLength: 6,
    allowedSpecialChars: [],
    allowNumbers: false,
    allowLowercase: false,
    requireUppercase: true,
    customPatterns: [/^[A-Z]{3,6}$/]
  }),

  // NFT collection tokens
  NFT_COLLECTION: createTokenSymbolConfig({
    minLength: 2,
    maxLength: 20,
    allowedSpecialChars: ['-', '_', '.', '#'],
    allowNumbers: true,
    allowLowercase: true,
    requireUppercase: false
  })
} as const

export type ValidationPreset = keyof typeof VALIDATION_PRESETS