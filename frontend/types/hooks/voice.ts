// Voice hook types

import { Observable } from 'rxjs'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { TTSError, TTSState, ElevenLabsConfig } from '../api/elevenlabs'
import { SpeechRecognitionState, SpeechRecognitionConfig, VoiceCommand, VoiceCommandResult } from '../api/speech'

// Speech Recognition Hook Types
export interface SpeechRecognitionHookConfig extends SpeechRecognitionConfig {
  onTranscriptChange?: (transcript: string) => void
  onFinalTranscript?: (transcript: string) => void
  onError?: (error: SpeechRecognitionError) => void
  onStart?: () => void
  onEnd?: () => void
  autoStart?: boolean
  clearTranscriptOnListen?: boolean
  debounceTime?: number
  maxRetries?: number
  retryDelay?: number
}

export interface SpeechRecognitionHookReturn {
  transcript: string
  interimTranscript: string
  finalTranscript: string
  isListening: boolean
  isSupported: boolean
  confidence: number
  error: SpeechRecognitionError | null
  startListening: (options?: Partial<SpeechRecognitionConfig>) => TE.TaskEither<SpeechRecognitionError, void>
  stopListening: () => void
  abortListening: () => void
  resetTranscript: () => void
  clearError: () => void
  retryLastRecognition: () => TE.TaskEither<SpeechRecognitionError, void>
}

export interface SpeechRecognitionError {
  type: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'ABORTED' | 'NO_SPEECH' | 'AUDIO_CAPTURE' | 'SERVICE_NOT_ALLOWED' | 'BAD_GRAMMAR' | 'LANGUAGE_NOT_SUPPORTED' | 'UNKNOWN_ERROR'
  message: string
  originalError?: unknown
  timestamp: number
  context?: Record<string, unknown>
}

// Text-to-Speech Hook Types
export interface TTSHookConfig {
  apiKey: string
  voiceId: string
  config?: Partial<ElevenLabsConfig>
  cacheEnabled?: boolean
  cacheMaxSize?: number
  cacheTTL?: number
  autoPlay?: boolean
  queueMode?: 'replace' | 'append' | 'interrupt'
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: TTSError) => void
}

export interface TTSHookReturn {
  state: TTSState
  speak: (text: string) => TE.TaskEither<TTSError, void>
  pause: () => void
  resume: () => void
  stop: () => void
  clearQueue: () => void
  setVolume: (volume: number) => void
  setRate: (rate: number) => void
  clearCache: () => void
  getCacheSize: () => number
  getQueueLength: () => number
  isSupported: boolean
}

export interface TTSQueueItem {
  id: string
  text: string
  priority: 'low' | 'medium' | 'high'
  timestamp: number
  metadata?: Record<string, unknown>
}

// Combined Voice Hook Types
export interface VoiceHookConfig {
  speechRecognition?: SpeechRecognitionHookConfig
  tts?: TTSHookConfig
  enabled?: boolean
  autoConnect?: boolean
  globalErrorHandler?: (error: VoiceError) => void
}

export interface VoiceHookReturn {
  recognition: SpeechRecognitionHookReturn
  tts: TTSHookReturn
  isEnabled: boolean
  isSupported: boolean
  enable: () => TE.TaskEither<VoiceError, void>
  disable: () => void
  toggle: () => TE.TaskEither<VoiceError, void>
  speakTranscript: () => TE.TaskEither<VoiceError, void>
  reset: () => void
}

export type VoiceError = SpeechRecognitionError | TTSError

// Voice Commands Hook Types
export interface VoiceCommandsHookConfig {
  commands: VoiceCommand[]
  enabled?: boolean
  matchThreshold?: number
  caseSensitive?: boolean
  fuzzyMatching?: boolean
  onCommandMatch?: (result: VoiceCommandResult) => void
  onNoMatch?: (transcript: string) => void
}

export interface VoiceCommandsHookReturn {
  commands: VoiceCommand[]
  addCommand: (command: VoiceCommand) => void
  removeCommand: (id: string) => void
  updateCommand: (id: string, updates: Partial<VoiceCommand>) => void
  enableCommand: (id: string) => void
  disableCommand: (id: string) => void
  clearCommands: () => void
  processTranscript: (transcript: string) => O.Option<VoiceCommandResult>
  lastMatch: O.Option<VoiceCommandResult>
  matchHistory: VoiceCommandResult[]
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
}

// Voice Activity Hook Types
export interface VoiceActivityConfig {
  threshold?: number
  debounceTime?: number
  smoothingFactor?: number
  updateInterval?: number
  onActivityStart?: () => void
  onActivityEnd?: () => void
  onLevelChange?: (level: number) => void
}

export interface VoiceActivityHookReturn {
  isActive: boolean
  level: number
  smoothedLevel: number
  isMonitoring: boolean
  startMonitoring: () => TE.TaskEither<Error, void>
  stopMonitoring: () => void
  setThreshold: (threshold: number) => void
  reset: () => void
}

// Voice Visualizer Hook Types
export interface VoiceVisualizerConfig {
  fftSize?: number
  smoothingTimeConstant?: number
  minDecibels?: number
  maxDecibels?: number
  updateInterval?: number
  type?: 'frequency' | 'waveform' | 'both'
}

export interface VoiceVisualizerHookReturn {
  isActive: boolean
  frequencyData: Uint8Array
  waveformData: Uint8Array
  volume: number
  pitch: number
  startVisualization: (stream: MediaStream) => TE.TaskEither<Error, void>
  stopVisualization: () => void
  updateConfig: (config: Partial<VoiceVisualizerConfig>) => void
}

// Voice Performance Hook Types
export interface VoicePerformanceMetrics {
  speechRecognition: {
    accuracyRate: number
    averageConfidence: number
    responseTime: number
    errorRate: number
    totalSessions: number
    successfulSessions: number
  }
  textToSpeech: {
    synthesisTime: number
    cacheHitRate: number
    audioQuality: number
    totalRequests: number
    successfulRequests: number
  }
  overall: {
    memoryUsage: number
    cpuUsage: number
    batteryImpact: number
    networkUsage: number
  }
}

export interface VoicePerformanceHookReturn {
  metrics: VoicePerformanceMetrics
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  resetMetrics: () => void
  getReport: () => string
}

// Voice Integration Hook Types
export interface VoiceIntegrationConfig {
  chatIntegration?: {
    enabled: boolean
    autoSend: boolean
    confirmBeforeSend: boolean
    voiceResponse: boolean
  }
  dragonIntegration?: {
    enabled: boolean
    reactToVoice: boolean
    animateOnSpeech: boolean
    voiceFeedback: boolean
  }
  keyboardShortcuts?: Record<string, () => void>
  gestureControls?: boolean
}

export interface VoiceIntegrationHookReturn {
  config: VoiceIntegrationConfig
  updateConfig: (updates: Partial<VoiceIntegrationConfig>) => void
  enableChatIntegration: () => void
  disableChatIntegration: () => void
  enableDragonIntegration: () => void
  disableDragonIntegration: () => void
  isIntegrated: (service: 'chat' | 'dragon') => boolean
}

// Functional Types for fp-ts Integration
export type VoiceTask<T> = TE.TaskEither<VoiceError, T>
export type VoiceReader<T> = (config: VoiceHookConfig) => T
export type VoiceValidator<T> = (input: unknown) => E.Either<Error, T>
export type VoiceTransformer<A, B> = (input: A) => B

// Observable Types for RxJS Integration
export interface VoiceStreams {
  transcript$: Observable<string>
  interimTranscript$: Observable<string>
  finalTranscript$: Observable<string>
  confidence$: Observable<number>
  isListening$: Observable<boolean>
  isSpeaking$: Observable<boolean>
  error$: Observable<VoiceError | null>
  voiceActivity$: Observable<{ isActive: boolean; level: number }>
  commandMatch$: Observable<VoiceCommandResult>
}

export interface VoiceStreamHookReturn {
  streams: VoiceStreams
  subscribe: <T>(stream: keyof VoiceStreams, callback: (value: T) => void) => () => void
  getLatestValue: <T>(stream: keyof VoiceStreams) => O.Option<T>
  combineStreams: <T>(streamNames: Array<keyof VoiceStreams>, combiner: (...values: unknown[]) => T) => Observable<T>
}

// Advanced Hook Types
export interface VoiceAnalyticsHookReturn {
  analytics: {
    sessionDuration: number
    wordsSpoken: number
    averageConfidence: number
    commandsExecuted: number
    errorsEncountered: number
    mostUsedCommands: Array<{ command: string; count: number }>
    speechPatterns: Record<string, number>
  }
  startTracking: () => void
  stopTracking: () => void
  resetAnalytics: () => void
  exportData: () => string
}

export interface VoiceAccessibilityHookReturn {
  isHighContrastEnabled: boolean
  isReducedMotionEnabled: boolean
  isScreenReaderEnabled: boolean
  announcements: string[]
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  enableKeyboardNavigation: () => void
  disableKeyboardNavigation: () => void
  setFocusManagement: (enabled: boolean) => void
}

export interface VoiceStateManagerHookReturn {
  state: VoiceState
  dispatch: (action: VoiceAction) => void
  subscribe: (listener: (state: VoiceState) => void) => () => void
  persist: () => void
  restore: () => void
  reset: () => void
}

export interface VoiceState {
  recognition: SpeechRecognitionState
  tts: TTSState
  commands: VoiceCommand[]
  activity: { isActive: boolean; level: number }
  performance: VoicePerformanceMetrics
  settings: VoiceSettings
  errors: VoiceError[]
}

export interface VoiceAction {
  type: 'START_RECOGNITION' | 'STOP_RECOGNITION' | 'START_TTS' | 'STOP_TTS' | 'ADD_COMMAND' | 'REMOVE_COMMAND' | 'UPDATE_SETTINGS' | 'CLEAR_ERRORS' | 'RESET_STATE'
  payload?: unknown
}

export interface VoiceSettings {
  language: string
  autoStart: boolean
  continuousListening: boolean
  interimResults: boolean
  ttsEnabled: boolean
  ttsVoice?: string
  ttsRate: number
  ttsPitch: number
  ttsVolume: number
  commandsEnabled: boolean
  activityThreshold: number
  noiseReduction: boolean
  echoCancellation: boolean
  cacheEnabled: boolean
  debugMode: boolean
}

// Utility Hook Types
export interface VoiceUtilsHookReturn {
  formatTranscript: (transcript: string) => string
  sanitizeInput: (input: string) => string
  validateCommand: (command: VoiceCommand) => E.Either<Error, VoiceCommand>
  generateCommandId: () => string
  parseConfidence: (confidence: number) => 'low' | 'medium' | 'high'
  isCommandMatch: (transcript: string, command: VoiceCommand) => boolean
  normalizeText: (text: string) => string
  extractKeywords: (text: string) => string[]
  calculateSimilarity: (text1: string, text2: string) => number
}

// Testing Hook Types
export interface VoiceTestingHookReturn {
  mockRecognition: (transcript: string, confidence?: number) => void
  mockTTS: (text: string) => Promise<void>
  mockError: (error: VoiceError) => void
  simulateVoiceActivity: (level: number, duration: number) => void
  triggerCommand: (commandId: string, transcript: string) => void
  getTestMetrics: () => Record<string, any>
  resetTestState: () => void
}