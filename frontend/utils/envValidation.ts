/**
 * Environment Variable Validation Utilities
 * 
 * Provides validation and fallback handling for environment variables
 * to ensure graceful degradation when optional variables are missing
 */

import { logger } from '@lib/logger'

// ============================================================================
// Environment Variable Validation
// ============================================================================

/**
 * Validate required environment variables
 */
export function validateRequiredEnvVars(): void {
  const requiredVars = [
    'VITE_PRIVY_APP_ID',
  ]
  
  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName]
    return !value || value.trim() === '' || value === 'your_privy_app_id_here'
  })
  
  if (missingVars.length > 0) {
    logger.warn('Missing required environment variables:', missingVars)
    if (import.meta.env.PROD) {
      logger.error('Production deployment missing required environment variables')
    }
  }
}

/**
 * Validate optional environment variables and provide fallback messaging
 */
export function validateOptionalEnvVars(): void {
  const optionalVars = [
    {
      name: 'VITE_WALLETCONNECT_PROJECT_ID',
      description: 'WalletConnect functionality',
      fallback: 'WalletConnect will not be available'
    },
    {
      name: 'VITE_ELEVENLABS_API_KEY',
      description: 'Voice features',
      fallback: 'Voice features will be disabled'
    },
    {
      name: 'VITE_ELEVENLABS_VOICE_ID',
      description: 'Custom voice model',
      fallback: 'Default voice will be used'
    }
  ]
  
  optionalVars.forEach(({ name, description, fallback }) => {
    const value = import.meta.env[name]
    if (!value || value.trim() === '' || value.includes('your_') || value.includes('_here')) {
      logger.info(`ℹ️ ${name} not configured - ${fallback}`)
    } else {
      logger.debug(`✅ ${name} configured for ${description}`)
    }
  })
}

/**
 * Check if WalletConnect is properly configured
 */
export function isWalletConnectConfigured(): boolean {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  return !!(projectId && projectId.trim() !== '' && !projectId.includes('your_'))
}

/**
 * Check if voice features are properly configured
 */
export function isVoiceConfigured(): boolean {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID
  const enabled = import.meta.env.VITE_VOICE_ENABLED
  
  return !!(
    enabled === 'true' &&
    apiKey && apiKey.trim() !== '' && !apiKey.includes('your_') &&
    voiceId && voiceId.trim() !== '' && !voiceId.includes('your_')
  )
}

/**
 * Check if Privy authentication is properly configured
 */
export function isPrivyConfigured(): boolean {
  const appId = import.meta.env.VITE_PRIVY_APP_ID
  return !!(appId && appId.trim() !== '' && !appId.includes('your_'))
}

/**
 * Get environment configuration status
 */
export function getEnvironmentStatus() {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    privy: isPrivyConfigured(),
    walletConnect: isWalletConnectConfigured(),
    voice: isVoiceConfigured(),
  }
}

/**
 * Initialize environment validation
 */
export function initializeEnvironmentValidation(): void {
  logger.debug('🔍 Environment Validation Starting...')
  
  const status = getEnvironmentStatus()
  
  logger.debug('Environment Status:', status)
  
  validateRequiredEnvVars()
  validateOptionalEnvVars()
  
  // Log configuration warnings for production
  if (import.meta.env.PROD) {
    if (!status.privy) {
      logger.error('❌ Privy authentication not configured in production')
    }
    if (!status.walletConnect) {
      logger.info('ℹ️ WalletConnect not configured in production (this is optional)')
    }
    if (!status.voice) {
      logger.info('ℹ️ Voice features not configured in production (this is optional)')
    }
  } else {
    // Development environment - show info messages
    if (!status.privy) {
      logger.warn('⚠️ Privy authentication not configured in development')
    }
    if (!status.walletConnect) {
      logger.info('ℹ️ WalletConnect not configured (optional feature)')
    }
    if (!status.voice) {
      logger.info('ℹ️ Voice features not configured (optional feature)')
    }
  }
  
  logger.debug('✅ Environment Validation Complete')
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely get environment variable with fallback
 */
export function safeGetEnv(key: string, fallback: string = ''): string {
  const value = import.meta.env[key]
  if (!value || value.trim() === '' || value.includes('your_') || value.includes('_here')) {
    return fallback
  }
  return value
}

/**
 * Get boolean environment variable
 */
export function getBooleanEnv(key: string, fallback: boolean = false): boolean {
  const value = safeGetEnv(key)
  return value === 'true' || value === '1' || value === 'yes' || fallback
}

/**
 * Get numeric environment variable
 */
export function getNumericEnv(key: string, fallback: number = 0): number {
  const value = safeGetEnv(key)
  const parsed = parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

// ============================================================================
// Export Environment Configuration
// ============================================================================

export const envConfig = {
  // Authentication
  privyAppId: safeGetEnv('VITE_PRIVY_APP_ID'),
  privyClientId: safeGetEnv('VITE_PRIVY_CLIENT_ID'),
  
  // WalletConnect
  walletConnectProjectId: safeGetEnv('VITE_WALLETCONNECT_PROJECT_ID'),
  
  // Voice
  elevenLabsApiKey: safeGetEnv('VITE_ELEVENLABS_API_KEY'),
  elevenLabsVoiceId: safeGetEnv('VITE_ELEVENLABS_VOICE_ID'),
  voiceEnabled: getBooleanEnv('VITE_VOICE_ENABLED', false),
  voiceStability: getNumericEnv('VITE_VOICE_STABILITY', 0.75),
  voiceSimilarityBoost: getNumericEnv('VITE_VOICE_SIMILARITY_BOOST', 0.75),
  voiceStyle: getNumericEnv('VITE_VOICE_STYLE', 0.5),
  voiceUseSpeakerBoost: getBooleanEnv('VITE_VOICE_USE_SPEAKER_BOOST', true),
  
  // API
  apiUrl: safeGetEnv('VITE_API_URL'),
  wsUrl: safeGetEnv('VITE_WS_URL'),
  
  // Network
  seiRpcUrl: safeGetEnv('VITE_SEI_RPC_URL', 'https://evm-rpc.sei-apis.com'),
  
  // Status
  status: getEnvironmentStatus(),
  
  // Validation helpers
  isValid: {
    privy: isPrivyConfigured(),
    walletConnect: isWalletConnectConfigured(),
    voice: isVoiceConfigured(),
  }
} as const

export type EnvConfig = typeof envConfig