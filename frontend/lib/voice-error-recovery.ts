/**
 * Comprehensive Voice Error Recovery System
 * Handles all voice-related errors with intelligent fallbacks and recovery strategies
 */

import { logger } from './logger'
import { errorRecoveryUtils } from '@utils/errorRecovery'

// ============================================================================
// Voice Error Type Definitions
// ============================================================================

export enum VoiceErrorType {
  // Audio Input Errors
  MICROPHONE_PERMISSION_DENIED = 'microphone_permission_denied',
  MICROPHONE_NOT_FOUND = 'microphone_not_found',
  MICROPHONE_HARDWARE_ERROR = 'microphone_hardware_error',
  AUDIO_INPUT_FAILURE = 'audio_input_failure',
  
  // Audio Output Errors
  SPEAKER_NOT_FOUND = 'speaker_not_found',
  AUDIO_OUTPUT_FAILURE = 'audio_output_failure',
  SPEAKER_HARDWARE_ERROR = 'speaker_hardware_error',
  
  // Speech Recognition Errors
  SPEECH_RECOGNITION_NOT_SUPPORTED = 'speech_recognition_not_supported',
  SPEECH_RECOGNITION_NETWORK_ERROR = 'speech_recognition_network_error',
  SPEECH_RECOGNITION_NO_SPEECH = 'speech_recognition_no_speech',
  SPEECH_RECOGNITION_ABORTED = 'speech_recognition_aborted',
  SPEECH_RECOGNITION_AUDIO_CAPTURE = 'speech_recognition_audio_capture',
  
  // Text-to-Speech Errors
  TTS_API_ERROR = 'tts_api_error',
  TTS_NETWORK_ERROR = 'tts_network_error',
  TTS_RATE_LIMIT = 'tts_rate_limit',
  TTS_QUOTA_EXCEEDED = 'tts_quota_exceeded',
  TTS_INVALID_CONFIG = 'tts_invalid_config',
  TTS_SYNTHESIS_FAILED = 'tts_synthesis_failed',
  
  // Network and Connectivity Errors
  NETWORK_OFFLINE = 'network_offline',
  NETWORK_SLOW = 'network_slow',
  NETWORK_TIMEOUT = 'network_timeout',
  API_UNREACHABLE = 'api_unreachable',
  
  // Browser and Environment Errors
  BROWSER_NOT_SUPPORTED = 'browser_not_supported',
  HTTPS_REQUIRED = 'https_required',
  WEB_AUDIO_NOT_SUPPORTED = 'web_audio_not_supported',
  CORS_ERROR = 'cors_error',
  
  // Performance and Resource Errors
  MEMORY_EXHAUSTED = 'memory_exhausted',
  CPU_OVERLOAD = 'cpu_overload',
  AUDIO_CONTEXT_SUSPENDED = 'audio_context_suspended',
  WEBGL_CONTEXT_LOST = 'webgl_context_lost',
  
  // User Experience Errors
  USER_CANCELLED = 'user_cancelled',
  USER_TIMEOUT = 'user_timeout',
  FEATURE_DISABLED = 'feature_disabled',
  
  // Generic Errors
  UNKNOWN_ERROR = 'unknown_error',
  INITIALIZATION_FAILED = 'initialization_failed',
  CONFIGURATION_ERROR = 'configuration_error'
}

export enum VoiceErrorSeverity {
  LOW = 'low',        // Minor issues, fallback available
  MEDIUM = 'medium',  // Significant issues, partial functionality lost
  HIGH = 'high',      // Major issues, voice features unavailable
  CRITICAL = 'critical' // Complete voice system failure
}

export enum VoiceRecoveryStrategy {
  RETRY = 'retry',                    // Retry the operation
  FALLBACK = 'fallback',             // Use alternative approach
  GRACEFUL_DEGRADATION = 'graceful_degradation', // Reduce functionality
  USER_INTERVENTION = 'user_intervention',       // Require user action
  SYSTEM_RESTART = 'system_restart', // Restart voice system
  DISABLE_FEATURE = 'disable_feature' // Disable voice features
}

export interface VoiceErrorDetails {
  type: VoiceErrorType
  severity: VoiceErrorSeverity
  message: string
  userMessage: string
  recoveryStrategy: VoiceRecoveryStrategy
  retryable: boolean
  requiresUserAction: boolean
  troubleshootingSteps: Array<{
    icon: string
    text: string
    action?: () => void
  }>
  metadata?: Record<string, any>
}

// ============================================================================
// Voice Error Classification System
// ============================================================================

export class VoiceErrorClassifier {
  private static readonly ERROR_PATTERNS: Record<string, VoiceErrorType> = {
    // Permission errors
    'permission denied': VoiceErrorType.MICROPHONE_PERMISSION_DENIED,
    'notallowederror': VoiceErrorType.MICROPHONE_PERMISSION_DENIED,
    'permission dismissed': VoiceErrorType.MICROPHONE_PERMISSION_DENIED,
    
    // Hardware errors
    'device not found': VoiceErrorType.MICROPHONE_NOT_FOUND,
    'no microphone': VoiceErrorType.MICROPHONE_NOT_FOUND,
    'audio device': VoiceErrorType.MICROPHONE_HARDWARE_ERROR,
    'speaker not found': VoiceErrorType.SPEAKER_NOT_FOUND,
    
    // Speech Recognition errors
    'speech recognition': VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED,
    'webkitspeechrecognition': VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED,
    'no-speech': VoiceErrorType.SPEECH_RECOGNITION_NO_SPEECH,
    'audio-capture': VoiceErrorType.SPEECH_RECOGNITION_AUDIO_CAPTURE,
    'aborted': VoiceErrorType.SPEECH_RECOGNITION_ABORTED,
    
    // TTS API errors
    'elevenlabs': VoiceErrorType.TTS_API_ERROR,
    'text-to-speech': VoiceErrorType.TTS_API_ERROR,
    'rate limit': VoiceErrorType.TTS_RATE_LIMIT,
    'quota exceeded': VoiceErrorType.TTS_QUOTA_EXCEEDED,
    'synthesis failed': VoiceErrorType.TTS_SYNTHESIS_FAILED,
    
    // Network errors
    'network error': VoiceErrorType.TTS_NETWORK_ERROR,
    'fetch failed': VoiceErrorType.NETWORK_TIMEOUT,
    'timeout': VoiceErrorType.NETWORK_TIMEOUT,
    'offline': VoiceErrorType.NETWORK_OFFLINE,
    'cors': VoiceErrorType.CORS_ERROR,
    
    // Browser support
    'not supported': VoiceErrorType.BROWSER_NOT_SUPPORTED,
    'https required': VoiceErrorType.HTTPS_REQUIRED,
    'secure context': VoiceErrorType.HTTPS_REQUIRED,
    'web audio': VoiceErrorType.WEB_AUDIO_NOT_SUPPORTED,
    
    // Performance errors
    'memory': VoiceErrorType.MEMORY_EXHAUSTED,
    'cpu': VoiceErrorType.CPU_OVERLOAD,
    'audio context': VoiceErrorType.AUDIO_CONTEXT_SUSPENDED,
    'webgl context lost': VoiceErrorType.WEBGL_CONTEXT_LOST,
    
    // User actions
    'user cancelled': VoiceErrorType.USER_CANCELLED,
    'user denied': VoiceErrorType.USER_CANCELLED,
    'user timeout': VoiceErrorType.USER_TIMEOUT
  }

  static classify(error: Error | string): VoiceErrorType {
    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()
    
    for (const [pattern, errorType] of Object.entries(this.ERROR_PATTERNS)) {
      if (lowerMessage.includes(pattern)) {
        return errorType
      }
    }
    
    return VoiceErrorType.UNKNOWN_ERROR
  }

  static getErrorDetails(error: Error | string): VoiceErrorDetails {
    const errorType = this.classify(error)
    return this.getDetailsForType(errorType, error)
  }

  private static getDetailsForType(type: VoiceErrorType, originalError: Error | string): VoiceErrorDetails {
    const errorMessage = typeof originalError === 'string' ? originalError : originalError.message
    
    const details: Record<VoiceErrorType, Omit<VoiceErrorDetails, 'type'>> = {
      [VoiceErrorType.MICROPHONE_PERMISSION_DENIED]: {
        severity: VoiceErrorSeverity.HIGH,
        message: 'Microphone permission denied',
        userMessage: 'Microphone access is required for voice chat. Please grant permission and try again.',
        recoveryStrategy: VoiceRecoveryStrategy.USER_INTERVENTION,
        retryable: true,
        requiresUserAction: true,
        troubleshootingSteps: [
          { icon: '🔒', text: 'Click the microphone icon in your browser\'s address bar' },
          { icon: '✅', text: 'Select "Allow" for microphone access' },
          { icon: '🔄', text: 'Refresh the page and try again' }
        ]
      },
      
      [VoiceErrorType.MICROPHONE_NOT_FOUND]: {
        severity: VoiceErrorSeverity.HIGH,
        message: 'No microphone device found',
        userMessage: 'No microphone was detected. Please connect a microphone and try again.',
        recoveryStrategy: VoiceRecoveryStrategy.USER_INTERVENTION,
        retryable: true,
        requiresUserAction: true,
        troubleshootingSteps: [
          { icon: '🎤', text: 'Connect a microphone to your device' },
          { icon: '🔧', text: 'Check your audio device settings' },
          { icon: '🔄', text: 'Restart your browser' }
        ]
      },
      
      [VoiceErrorType.TTS_API_ERROR]: {
        severity: VoiceErrorSeverity.MEDIUM,
        message: 'Text-to-speech service error',
        userMessage: 'Voice synthesis is temporarily unavailable. You can continue using text chat.',
        recoveryStrategy: VoiceRecoveryStrategy.GRACEFUL_DEGRADATION,
        retryable: true,
        requiresUserAction: false,
        troubleshootingSteps: [
          { icon: '⏰', text: 'Wait a few moments and try again' },
          { icon: '💬', text: 'Continue using text chat' },
          { icon: '🔄', text: 'Refresh if the problem persists' }
        ]
      },
      
      [VoiceErrorType.TTS_RATE_LIMIT]: {
        severity: VoiceErrorSeverity.MEDIUM,
        message: 'Voice service rate limit exceeded',
        userMessage: 'Voice synthesis is temporarily limited. Please wait before trying again.',
        recoveryStrategy: VoiceRecoveryStrategy.RETRY,
        retryable: true,
        requiresUserAction: false,
        troubleshootingSteps: [
          { icon: '⏱️', text: 'Wait 30 seconds before retrying' },
          { icon: '💬', text: 'Use text chat in the meantime' },
          { icon: '🔄', text: 'Voice will automatically resume' }
        ]
      },
      
      [VoiceErrorType.NETWORK_OFFLINE]: {
        severity: VoiceErrorSeverity.HIGH,
        message: 'Network connection lost',
        userMessage: 'Voice features require an internet connection. Please check your connection.',
        recoveryStrategy: VoiceRecoveryStrategy.RETRY,
        retryable: true,
        requiresUserAction: true,
        troubleshootingSteps: [
          { icon: '🌐', text: 'Check your internet connection' },
          { icon: '📡', text: 'Try switching networks if available' },
          { icon: '🔄', text: 'Refresh once connected' }
        ]
      },
      
      [VoiceErrorType.BROWSER_NOT_SUPPORTED]: {
        severity: VoiceErrorSeverity.HIGH,
        message: 'Browser not supported',
        userMessage: 'Voice features are not supported in this browser. Please use Chrome, Edge, or Safari.',
        recoveryStrategy: VoiceRecoveryStrategy.DISABLE_FEATURE,
        retryable: false,
        requiresUserAction: true,
        troubleshootingSteps: [
          { icon: '🌐', text: 'Use Chrome, Edge, or Safari browser' },
          { icon: '🔄', text: 'Update your browser to the latest version' },
          { icon: '💬', text: 'Continue with text chat' }
        ]
      },
      
      [VoiceErrorType.HTTPS_REQUIRED]: {
        severity: VoiceErrorSeverity.HIGH,
        message: 'HTTPS required for voice features',
        userMessage: 'Voice features require a secure connection. Please use HTTPS.',
        recoveryStrategy: VoiceRecoveryStrategy.USER_INTERVENTION,
        retryable: false,
        requiresUserAction: true,
        troubleshootingSteps: [
          { icon: '🔒', text: 'Access the site via HTTPS (https://)' },
          { icon: '🏠', text: 'Use localhost for development' },
          { icon: '💬', text: 'Text chat is still available' }
        ]
      },
      
      [VoiceErrorType.WEBGL_CONTEXT_LOST]: {
        severity: VoiceErrorSeverity.MEDIUM,
        message: 'Graphics context lost',
        userMessage: 'Dragon animations are temporarily unavailable. Voice features continue to work.',
        recoveryStrategy: VoiceRecoveryStrategy.FALLBACK,
        retryable: true,
        requiresUserAction: false,
        troubleshootingSteps: [
          { icon: '🐉', text: 'Dragon will switch to 2D mode' },
          { icon: '🔄', text: 'Refresh to restore 3D graphics' },
          { icon: '⚡', text: 'Voice features remain active' }
        ]
      },
      
      [VoiceErrorType.UNKNOWN_ERROR]: {
        severity: VoiceErrorSeverity.MEDIUM,
        message: errorMessage || 'Unknown voice system error',
        userMessage: 'An unexpected error occurred with voice features. Please try again.',
        recoveryStrategy: VoiceRecoveryStrategy.RETRY,
        retryable: true,
        requiresUserAction: false,
        troubleshootingSteps: [
          { icon: '🔄', text: 'Try the operation again' },
          { icon: '🔧', text: 'Check browser console for details' },
          { icon: '💬', text: 'Continue with text chat' }
        ]
      }
    }
    
    // Add default cases for missing error types
    const defaultDetails = details[VoiceErrorType.UNKNOWN_ERROR]
    
    return {
      type,
      ...(details[type] || defaultDetails)
    }
  }
}

// ============================================================================
// Voice Recovery Manager
// ============================================================================

export class VoiceRecoveryManager {
  private static instance: VoiceRecoveryManager
  private recoveryAttempts: Map<VoiceErrorType, number> = new Map()
  private recoveryCallbacks: Map<VoiceErrorType, Array<() => Promise<void>>> = new Map()
  private maxRecoveryAttempts = 3
  private recoveryTimeout = 30000 // 30 seconds

  static getInstance(): VoiceRecoveryManager {
    if (!this.instance) {
      this.instance = new VoiceRecoveryManager()
    }
    return this.instance
  }

  /**
   * Register a recovery callback for a specific error type
   */
  registerRecoveryCallback(errorType: VoiceErrorType, callback: () => Promise<void>): void {
    if (!this.recoveryCallbacks.has(errorType)) {
      this.recoveryCallbacks.set(errorType, [])
    }
    this.recoveryCallbacks.get(errorType)!.push(callback)
  }

  /**
   * Attempt automatic recovery for an error
   */
  async attemptRecovery(error: VoiceErrorDetails): Promise<boolean> {
    const { type, recoveryStrategy } = error
    
    // Check if we've exceeded max recovery attempts
    const attempts = this.recoveryAttempts.get(type) || 0
    if (attempts >= this.maxRecoveryAttempts) {
      logger.warn(`Max recovery attempts reached for ${type}`)
      return false
    }
    
    // Increment attempt counter
    this.recoveryAttempts.set(type, attempts + 1)
    
    logger.info(`Attempting recovery for ${type} (attempt ${attempts + 1}/${this.maxRecoveryAttempts})`)
    
    try {
      switch (recoveryStrategy) {
        case VoiceRecoveryStrategy.RETRY:
          return await this.performRetryRecovery(type)
          
        case VoiceRecoveryStrategy.FALLBACK:
          return await this.performFallbackRecovery(type)
          
        case VoiceRecoveryStrategy.GRACEFUL_DEGRADATION:
          return await this.performGracefulDegradation(type)
          
        case VoiceRecoveryStrategy.SYSTEM_RESTART:
          return await this.performSystemRestart(type)
          
        default:
          logger.warn(`No automatic recovery available for strategy: ${recoveryStrategy}`)
          return false
      }
    } catch (recoveryError) {
      logger.error(`Recovery failed for ${type}:`, recoveryError)
      return false
    }
  }

  private async performRetryRecovery(errorType: VoiceErrorType): Promise<boolean> {
    const callbacks = this.recoveryCallbacks.get(errorType) || []
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Execute recovery callbacks
    for (const callback of callbacks) {
      try {
        await callback()
      } catch (error) {
        logger.error(`Recovery callback failed for ${errorType}:`, error)
        return false
      }
    }
    
    return true
  }

  private async performFallbackRecovery(errorType: VoiceErrorType): Promise<boolean> {
    switch (errorType) {
      case VoiceErrorType.WEBGL_CONTEXT_LOST:
        // Fallback to 2D dragon rendering
        errorRecoveryUtils.dragonFallback.getNextFallback()
        return true
        
      case VoiceErrorType.TTS_API_ERROR:
        // Fallback to browser TTS if available
        if (typeof speechSynthesis !== 'undefined') {
          logger.info('Falling back to browser TTS')
          return true
        }
        return false
        
      default:
        return false
    }
  }

  private async performGracefulDegradation(errorType: VoiceErrorType): Promise<boolean> {
    switch (errorType) {
      case VoiceErrorType.TTS_API_ERROR:
      case VoiceErrorType.TTS_RATE_LIMIT:
        // Continue with text-only mode
        logger.info('Gracefully degrading to text-only mode')
        return true
        
      case VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED:
        // Disable voice input, keep TTS
        logger.info('Disabling voice input, keeping voice output')
        return true
        
      default:
        return false
    }
  }

  private async performSystemRestart(errorType: VoiceErrorType): Promise<boolean> {
    // Restart voice system components
    logger.info(`Restarting voice system for ${errorType}`)
    
    // Force garbage collection if available
    errorRecoveryUtils.forceGC()
    
    // Reset recovery attempts for this error type
    this.recoveryAttempts.delete(errorType)
    
    return true
  }

  /**
   * Reset recovery attempts for an error type
   */
  resetRecoveryAttempts(errorType: VoiceErrorType): void {
    this.recoveryAttempts.delete(errorType)
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    this.recoveryAttempts.forEach((attempts, errorType) => {
      stats[errorType] = attempts
    })
    return stats
  }
}

// ============================================================================
// Voice Error Recovery Utilities
// ============================================================================

export const voiceErrorRecovery = {
  /**
   * Classify and handle a voice error
   */
  handleError: async (error: Error | string): Promise<VoiceErrorDetails> => {
    const details = VoiceErrorClassifier.getErrorDetails(error)
    
    // Log the error
    logger.error(`Voice error detected: ${details.type}`, {
      severity: details.severity,
      message: details.message,
      retryable: details.retryable,
      requiresUserAction: details.requiresUserAction
    })
    
    // Record error for monitoring
    errorRecoveryUtils.monitor.recordError(
      typeof error === 'string' ? new Error(error) : error,
      `VoiceSystem:${details.type}`,
      false
    )
    
    // Attempt automatic recovery if possible
    if (details.retryable && !details.requiresUserAction) {
      const recoveryManager = VoiceRecoveryManager.getInstance()
      const recovered = await recoveryManager.attemptRecovery(details)
      
      if (recovered) {
        logger.info(`Successfully recovered from ${details.type}`)
        errorRecoveryUtils.monitor.recordError(
          typeof error === 'string' ? new Error(error) : error,
          `VoiceSystem:${details.type}`,
          true
        )
      }
    }
    
    return details
  },

  /**
   * Get recovery manager instance
   */
  getRecoveryManager: (): VoiceRecoveryManager => VoiceRecoveryManager.getInstance(),

  /**
   * Check if voice features should be available
   */
  checkVoiceAvailability: (): {
    available: boolean
    reasons: string[]
    recommendations: string[]
  } => {
    const reasons: string[] = []
    const recommendations: string[] = []
    
    // Check browser support
    if (typeof window === 'undefined') {
      reasons.push('Not running in browser environment')
      return { available: false, reasons, recommendations }
    }
    
    // Check HTTPS requirement
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1'
    
    if (!isSecure) {
      reasons.push('HTTPS required for voice features')
      recommendations.push('Access site via HTTPS')
    }
    
    // Check Speech Recognition support
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    if (!hasSpeechRecognition) {
      reasons.push('Speech Recognition not supported')
      recommendations.push('Use Chrome, Edge, or Safari browser')
    }
    
    // Check Web Audio support
    const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window
    if (!hasWebAudio) {
      reasons.push('Web Audio not supported')
      recommendations.push('Update your browser')
    }
    
    // Check MediaDevices API
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    if (!hasMediaDevices) {
      reasons.push('MediaDevices API not available')
      recommendations.push('Enable camera/microphone permissions')
    }
    
    return {
      available: reasons.length === 0,
      reasons,
      recommendations
    }
  },

  /**
   * Test voice system components
   */
  testVoiceSystem: async (): Promise<{
    microphone: boolean
    speechRecognition: boolean
    textToSpeech: boolean
    errors: VoiceErrorDetails[]
  }> => {
    const results = {
      microphone: false,
      speechRecognition: false,
      textToSpeech: false,
      errors: [] as VoiceErrorDetails[]
    }
    
    // Test microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      results.microphone = true
    } catch (error) {
      const details = VoiceErrorClassifier.getErrorDetails(error as Error)
      results.errors.push(details)
    }
    
    // Test speech recognition
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.start()
        recognition.stop()
        results.speechRecognition = true
      }
    } catch (error) {
      const details = VoiceErrorClassifier.getErrorDetails(error as Error)
      results.errors.push(details)
    }
    
    // Test text-to-speech (browser TTS)
    try {
      if (typeof speechSynthesis !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance('')
        speechSynthesis.speak(utterance)
        speechSynthesis.cancel()
        results.textToSpeech = true
      }
    } catch (error) {
      const details = VoiceErrorClassifier.getErrorDetails(error as Error)
      results.errors.push(details)
    }
    
    return results
  }
}

export default voiceErrorRecovery