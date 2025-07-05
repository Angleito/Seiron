import { logger } from './logger'

export interface VoiceLogContext {
  sessionId?: string
  userId?: string
  operation?: string
  timestamp?: Date
  [key: string]: any
}

class VoiceLogger {
  private sessionId: string
  private logLevel: 'debug' | 'info' | 'warn' | 'error'

  constructor() {
    this.sessionId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    
    logger.debug('🎤 VoiceLogger initialized', {
      sessionId: this.sessionId,
      logLevel: this.logLevel,
      timestamp: new Date().toISOString()
    })
  }

  private formatMessage(message: string, context?: VoiceLogContext): string {
    const prefix = `[VOICE-${this.sessionId.slice(-6)}]`
    return `${prefix} ${message}`
  }

  private enrichContext(context?: VoiceLogContext): VoiceLogContext {
    return {
      sessionId: this.sessionId,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ...context
    }
  }

  // ElevenLabs TTS Logging
  ttsConfigValidation(config: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS config validation'), this.enrichContext({
      ...context,
      operation: 'tts_config_validation',
      hasApiKey: !!config.apiKey,
      apiKeyLength: config.apiKey?.length || 0,
      voiceId: config.voiceId,
      modelId: config.modelId,
      hasVoiceSettings: !!config.voiceSettings
    }))
  }

  ttsApiRequest(text: string, config: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS API request initiated'), this.enrichContext({
      ...context,
      operation: 'tts_api_request',
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      voiceId: config.voiceId,
      modelId: config.modelId || 'eleven_monolingual_v1'
    }))
  }

  ttsApiResponse(response: Response, bufferSize?: number, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS API response received'), this.enrichContext({
      ...context,
      operation: 'tts_api_response',
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bufferSize: bufferSize || 0
    }))
  }

  ttsApiError(error: any, context?: VoiceLogContext) {
    logger.error(this.formatMessage('TTS API error'), this.enrichContext({
      ...context,
      operation: 'tts_api_error',
      errorType: error.type || 'unknown',
      errorMessage: error.message || String(error),
      statusCode: error.statusCode,
      originalError: error
    }))
  }

  ttsCacheOperation(operation: 'hit' | 'miss' | 'set' | 'evict', key: string, context?: VoiceLogContext) {
    logger.debug(this.formatMessage(`TTS cache ${operation}`), this.enrichContext({
      ...context,
      operation: `tts_cache_${operation}`,
      cacheKey: key,
      keyLength: key.length
    }))
  }

  ttsAudioDecode(bufferSize: number, audioBuffer?: AudioBuffer, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS audio decode'), this.enrichContext({
      ...context,
      operation: 'tts_audio_decode',
      inputBufferSize: bufferSize,
      outputDuration: audioBuffer?.duration,
      outputChannels: audioBuffer?.numberOfChannels,
      outputSampleRate: audioBuffer?.sampleRate
    }))
  }

  ttsAudioPlay(audioBuffer: AudioBuffer, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS audio playback started'), this.enrichContext({
      ...context,
      operation: 'tts_audio_play',
      duration: audioBuffer.duration,
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate
    }))
  }

  ttsAudioEnd(context?: VoiceLogContext) {
    logger.debug(this.formatMessage('TTS audio playback ended'), this.enrichContext({
      ...context,
      operation: 'tts_audio_end'
    }))
  }

  // Speech Recognition Logging
  speechRecognitionInit(isSupported: boolean, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition initialization'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_init',
      isSupported,
      hasSpeechRecognition: !!(window as any).SpeechRecognition,
      hasWebkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    }))
  }

  speechRecognitionConfig(config: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition configured'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_config',
      continuous: config.continuous,
      interimResults: config.interimResults,
      lang: config.lang,
      maxAlternatives: config.maxAlternatives
    }))
  }

  speechRecognitionStart(context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition started'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_start'
    }))
  }

  speechRecognitionStop(context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition stopped'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_stop'
    }))
  }

  speechRecognitionResult(transcript: string, interimTranscript: string, confidence?: number, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition result'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_result',
      transcriptLength: transcript.length,
      interimTranscriptLength: interimTranscript.length,
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      interimTranscript: interimTranscript.substring(0, 50) + (interimTranscript.length > 50 ? '...' : ''),
      confidence: confidence || 0
    }))
  }

  speechRecognitionError(error: any, context?: VoiceLogContext) {
    logger.error(this.formatMessage('Speech recognition error'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_error',
      errorType: error.type || 'unknown',
      errorMessage: error.message || String(error),
      errorCode: error.error,
      originalError: error
    }))
  }

  speechRecognitionPermission(status: string, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Speech recognition permission'), this.enrichContext({
      ...context,
      operation: 'speech_recognition_permission',
      permissionStatus: status
    }))
  }

  // Voice Interface Logging
  voiceInterfaceInit(config: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Voice interface initialized'), this.enrichContext({
      ...context,
      operation: 'voice_interface_init',
      hasElevenLabsConfig: !!config,
      autoReadResponses: config?.autoReadResponses,
      configValid: !!(config?.apiKey && config?.voiceId)
    }))
  }

  voiceInterfaceStateChange(state: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Voice interface state change'), this.enrichContext({
      ...context,
      operation: 'voice_interface_state_change',
      isListening: state.isListening,
      isSpeaking: state.isSpeaking,
      isLoading: state.isLoading,
      isSpeakerEnabled: state.isSpeakerEnabled,
      hasTranscript: !!state.currentTranscript,
      hasError: !!state.lastError
    }))
  }

  voiceInterfaceUserAction(action: string, context?: VoiceLogContext) {
    logger.debug(this.formatMessage(`Voice interface user action: ${action}`), this.enrichContext({
      ...context,
      operation: 'voice_interface_user_action',
      action
    }))
  }

  // Environment and Configuration Logging
  environmentCheck(env: Record<string, any>, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Environment variables check'), this.enrichContext({
      ...context,
      operation: 'environment_check',
      hasElevenLabsKey: env.hasElevenLabsKey,
      elevenLabsKeyLength: env.elevenLabsKeyLength,
      hasVoiceId: env.hasVoiceId,
      voiceIdValue: env.voiceIdValue,
      voiceEnabled: env.voiceEnabled,
      nodeEnv: env.nodeEnv
    }))
  }

  browserCapabilities(capabilities: Record<string, boolean>, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Browser capabilities check'), this.enrichContext({
      ...context,
      operation: 'browser_capabilities',
      ...capabilities
    }))
  }

  // Performance Logging
  performanceMetric(metric: string, value: number, unit: string = 'ms', context?: VoiceLogContext) {
    logger.debug(this.formatMessage(`Performance: ${metric}`), this.enrichContext({
      ...context,
      operation: 'performance_metric',
      metric,
      value,
      unit
    }))
  }

  // General Voice Operation Logging
  voiceOperation(operation: string, data?: any, context?: VoiceLogContext) {
    logger.debug(this.formatMessage(`Voice operation: ${operation}`), this.enrichContext({
      ...context,
      operation: `voice_${operation}`,
      ...data
    }))
  }

  voiceError(operation: string, error: any, context?: VoiceLogContext) {
    logger.error(this.formatMessage(`Voice error in ${operation}`), this.enrichContext({
      ...context,
      operation: `voice_error_${operation}`,
      errorType: error.type || typeof error,
      errorMessage: error.message || String(error),
      errorStack: error.stack,
      originalError: error
    }))
  }

  // Network and Connectivity
  networkStatus(isOnline: boolean, connectionType?: string, context?: VoiceLogContext) {
    logger.debug(this.formatMessage('Network status'), this.enrichContext({
      ...context,
      operation: 'network_status',
      isOnline,
      connectionType,
      timestamp: new Date()
    }))
  }

  // Session Management
  startSession(context?: VoiceLogContext) {
    logger.info(this.formatMessage('Voice session started'), this.enrichContext({
      ...context,
      operation: 'session_start'
    }))
  }

  endSession(context?: VoiceLogContext) {
    logger.info(this.formatMessage('Voice session ended'), this.enrichContext({
      ...context,
      operation: 'session_end'
    }))
  }

  // Get session info for debugging
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      logLevel: this.logLevel,
      timestamp: new Date().toISOString()
    }
  }
}

// Create singleton instance
export const voiceLogger = new VoiceLogger()

// Export convenience functions
export const logTTS = {
  configValidation: (config: any, context?: VoiceLogContext) => voiceLogger.ttsConfigValidation(config, context),
  apiRequest: (text: string, config: any, context?: VoiceLogContext) => voiceLogger.ttsApiRequest(text, config, context),
  apiResponse: (response: Response, bufferSize?: number, context?: VoiceLogContext) => voiceLogger.ttsApiResponse(response, bufferSize, context),
  apiError: (error: any, context?: VoiceLogContext) => voiceLogger.ttsApiError(error, context),
  cacheOperation: (operation: 'hit' | 'miss' | 'set' | 'evict', key: string, context?: VoiceLogContext) => voiceLogger.ttsCacheOperation(operation, key, context),
  audioDecode: (bufferSize: number, audioBuffer?: AudioBuffer, context?: VoiceLogContext) => voiceLogger.ttsAudioDecode(bufferSize, audioBuffer, context),
  audioPlay: (audioBuffer: AudioBuffer, context?: VoiceLogContext) => voiceLogger.ttsAudioPlay(audioBuffer, context),
  audioEnd: (context?: VoiceLogContext) => voiceLogger.ttsAudioEnd(context)
}

export const logSpeech = {
  init: (isSupported: boolean, context?: VoiceLogContext) => voiceLogger.speechRecognitionInit(isSupported, context),
  config: (config: any, context?: VoiceLogContext) => voiceLogger.speechRecognitionConfig(config, context),
  start: (context?: VoiceLogContext) => voiceLogger.speechRecognitionStart(context),
  stop: (context?: VoiceLogContext) => voiceLogger.speechRecognitionStop(context),
  result: (transcript: string, interimTranscript: string, confidence?: number, context?: VoiceLogContext) => voiceLogger.speechRecognitionResult(transcript, interimTranscript, confidence, context),
  error: (error: any, context?: VoiceLogContext) => voiceLogger.speechRecognitionError(error, context),
  permission: (status: string, context?: VoiceLogContext) => voiceLogger.speechRecognitionPermission(status, context)
}

export const logVoiceInterface = {
  init: (config: any, context?: VoiceLogContext) => voiceLogger.voiceInterfaceInit(config, context),
  stateChange: (state: any, context?: VoiceLogContext) => voiceLogger.voiceInterfaceStateChange(state, context),
  userAction: (action: string, context?: VoiceLogContext) => voiceLogger.voiceInterfaceUserAction(action, context)
}

export const logEnvironment = {
  check: (env: Record<string, any>, context?: VoiceLogContext) => voiceLogger.environmentCheck(env, context),
  browserCapabilities: (capabilities: Record<string, boolean>, context?: VoiceLogContext) => voiceLogger.browserCapabilities(capabilities, context)
}

export const logPerformance = {
  metric: (metric: string, value: number, unit?: string, context?: VoiceLogContext) => voiceLogger.performanceMetric(metric, value, unit, context)
}

export default voiceLogger