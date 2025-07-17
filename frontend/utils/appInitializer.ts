/**
 * Application Initializer
 * Handles app startup, configuration validation, and backend connectivity
 */

import { logger } from '@lib/logger'
import { envConfig, initializeEnvironmentValidation } from './envValidation'
import { apiClient } from './apiClient'

export interface InitializationResult {
  success: boolean
  backendConnected: boolean
  configurationValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Initialize the application
 */
export async function initializeApp(): Promise<InitializationResult> {
  logger.info('🚀 Initializing Seiron application...')
  
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    // Step 1: Environment validation
    logger.info('📋 Validating environment configuration...')
    initializeEnvironmentValidation()
    
    // Step 2: Check required configuration
    if (!envConfig.isValid.privy) {
      errors.push('Privy authentication is not configured')
    }
    
    if (!envConfig.isValid.walletConnect) {
      warnings.push('WalletConnect is not configured (optional)')
    }
    
    if (!envConfig.isValid.voice) {
      warnings.push('Voice features are not configured (optional)')
    }
    
    // Step 3: Backend connectivity check
    logger.info('🔗 Checking backend connectivity...')
    const backendConnected = await apiClient.checkBackendHealth()
    
    if (!backendConnected) {
      const clientStatus = apiClient.getStatus()
      if (clientStatus.hasBackendUrl) {
        warnings.push(`Backend at ${clientStatus.backendUrl} is not responding - falling back to Vercel API routes`)
      } else {
        logger.info('ℹ️ No backend URL configured - using Vercel API routes')
      }
    }
    
    // Step 4: Log configuration status
    const clientStatus = apiClient.getStatus()
    logger.info('📊 Configuration Status:', {
      environment: envConfig.status.prod ? 'production' : 'development',
      backendUrl: clientStatus.backendUrl,
      backendConnected,
      fallbackEnabled: clientStatus.fallbackEnabled,
      privyConfigured: envConfig.isValid.privy,
      walletConnectConfigured: envConfig.isValid.walletConnect,
      voiceConfigured: envConfig.isValid.voice
    })
    
    const configurationValid = errors.length === 0
    const success = configurationValid && (backendConnected || clientStatus.fallbackEnabled)
    
    if (success) {
      logger.info('✅ Application initialized successfully')
    } else {
      logger.error('❌ Application initialization failed', { errors, warnings })
    }
    
    return {
      success,
      backendConnected,
      configurationValid,
      errors,
      warnings
    }
    
  } catch (error) {
    logger.error('💥 Application initialization error:', error)
    return {
      success: false,
      backendConnected: false,
      configurationValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown initialization error'],
      warnings
    }
  }
}

/**
 * Get current application status
 */
export function getAppStatus() {
  const clientStatus = apiClient.getStatus()
  
  return {
    isConfigured: envConfig.isValid.privy && clientStatus.hasBackendUrl,
    backendUrl: clientStatus.backendUrl,
    fallbackEnabled: clientStatus.fallbackEnabled,
    environment: envConfig.status.prod ? 'production' : 'development',
    features: {
      privy: envConfig.isValid.privy,
      walletConnect: envConfig.isValid.walletConnect,
      voice: envConfig.isValid.voice
    }
  }
}

/**
 * Health check for monitoring
 */
export async function healthCheck() {
  try {
    const backendHealthy = await apiClient.checkBackendHealth()
    const clientStatus = apiClient.getStatus()
    
    return {
      status: 'healthy',
      backend: backendHealthy,
      configuration: {
        backendUrl: clientStatus.backendUrl,
        fallbackEnabled: clientStatus.fallbackEnabled,
        environment: envConfig.status.prod ? 'production' : 'development'
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

export default initializeApp