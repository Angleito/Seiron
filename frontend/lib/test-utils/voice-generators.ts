/**
 * Fast-check generators for voice testing
 * Provides property-based test data generators for voice chat functionality
 */

import * as fc from 'fast-check'
import type {
  VoiceRecognitionError,
  VoiceCommand,
  VoiceSettings,
  VoiceActivity,
  VoiceMetrics,
  VoicePerformance,
  VoiceState,
  VoiceCommandMatch,
  VoiceSessionData
} from '../../types/components/voice'
import type { TTSError } from '../../types/api/elevenlabs'
import type { SpeechRecognitionState } from '../../types/api/speech'

// Basic primitives
export const arbitraryVoiceId = fc.string({ minLength: 10, maxLength: 30 })
export const arbitraryModelId = fc.constantFrom(
  'eleven_monolingual_v1',
  'eleven_multilingual_v1',
  'eleven_multilingual_v2',
  'eleven_turbo_v2'
)

export const arbitraryLanguageCode = fc.constantFrom(
  'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'
)

export const arbitraryConfidence = fc.float({ min: 0, max: 1, noNaN: true })
export const arbitraryAudioLevel = fc.float({ min: 0, max: 100, noNaN: true })
export const arbitraryDecibel = fc.float({ min: -100, max: 0, noNaN: true })

// Audio data generators
export const arbitraryWaveformData = fc.array(
  fc.integer({ min: 0, max: 255 }),
  { minLength: 128, maxLength: 2048 }
).map(arr => new Uint8Array(arr))

export const arbitraryFrequencyData = fc.array(
  fc.integer({ min: 0, max: 255 }),
  { minLength: 64, maxLength: 1024 }
).map(arr => new Uint8Array(arr))

export const arbitraryAudioBuffer = fc.integer({ min: 100, max: 100000 })
  .map(size => new ArrayBuffer(size))

export const arbitraryAudioFile = fc.record({
  arrayBuffer: arbitraryAudioBuffer,
  contentType: fc.constantFrom('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'),
  duration: fc.float({ min: 0.1, max: 60.0, noNaN: true }),
  sampleRate: fc.constantFrom(16000, 22050, 44100, 48000),
  channels: fc.constantFrom(1, 2)
})

// Text and transcript generators
export const arbitraryTranscript = fc.string({ minLength: 0, maxLength: 500 })
  .filter(s => s.trim().length === 0 || s.trim().length >= 1)

export const arbitraryInterimTranscript = fc.string({ minLength: 0, maxLength: 100 })

export const arbitraryVoiceText = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 1000 }),
  fc.constantFrom(
    'Hello, world!',
    'This is a test message.',
    'How can I help you today?',
    'Processing your request...',
    'Error occurred while processing.',
    'Welcome to the voice interface!',
    'Please speak clearly into the microphone.',
    'Your message has been received.',
    'Connection established successfully.',
    'System is ready for voice input.'
  )
)

// Voice conversation patterns
export const arbitraryConversationTurn = fc.record({
  speaker: fc.constantFrom('user', 'assistant', 'system'),
  text: arbitraryVoiceText,
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.getTime()),
  confidence: fc.option(arbitraryConfidence),
  audioData: fc.option(arbitraryAudioFile),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
})

export const arbitraryConversation = fc.array(arbitraryConversationTurn, { minLength: 1, maxLength: 20 })

// Error generators
export const arbitrarySpeechRecognitionErrorType = fc.constantFrom(
  'NOT_SUPPORTED',
  'PERMISSION_DENIED', 
  'NETWORK_ERROR',
  'ABORTED',
  'NO_SPEECH',
  'AUDIO_CAPTURE',
  'SERVICE_NOT_ALLOWED',
  'BAD_GRAMMAR',
  'LANGUAGE_NOT_SUPPORTED',
  'UNKNOWN_ERROR'
)

export const arbitraryVoiceRecognitionError: fc.Arbitrary<VoiceRecognitionError> = fc.record({
  type: arbitrarySpeechRecognitionErrorType,
  message: fc.string({ minLength: 5, maxLength: 200 }),
  originalError: fc.option(fc.anything()),
  context: fc.option(fc.dictionary(fc.string(), fc.anything()))
})

export const arbitraryTTSErrorType = fc.constantFrom(
  'API_ERROR',
  'NETWORK_ERROR',
  'AUDIO_ERROR',
  'QUOTA_EXCEEDED',
  'CONFIGURATION_ERROR',
  'RATE_LIMITED',
  'AUTHENTICATION_ERROR'
)

export const arbitraryTTSError: fc.Arbitrary<TTSError> = fc.record({
  type: arbitraryTTSErrorType,
  message: fc.string({ minLength: 5, maxLength: 200 }),
  statusCode: fc.option(fc.integer({ min: 400, max: 599 })),
  originalError: fc.option(fc.anything()),
  retryAfter: fc.option(fc.integer({ min: 1, max: 3600 }))
})

export const arbitraryVoiceError = fc.oneof(
  arbitraryVoiceRecognitionError,
  arbitraryTTSError
)

// Voice settings and configuration
export const arbitraryVoiceSettings: fc.Arbitrary<VoiceSettings> = fc.record({
  enabled: fc.boolean(),
  language: arbitraryLanguageCode,
  autoStart: fc.boolean(),
  showVisualizer: fc.boolean(),
  showTranscript: fc.boolean(),
  ttsEnabled: fc.boolean(),
  ttsVoice: fc.option(arbitraryVoiceId),
  ttsRate: fc.float({ min: 0.25, max: 4.0, noNaN: true }),
  ttsPitch: fc.float({ min: 0.0, max: 2.0, noNaN: true }),
  ttsVolume: fc.float({ min: 0.0, max: 1.0, noNaN: true }),
  commandsEnabled: fc.boolean(),
  noiseReduction: fc.boolean(),
  echoCancellation: fc.boolean(),
  autoGainControl: fc.boolean()
})

// Voice commands
export const arbitraryVoiceCommand: fc.Arbitrary<VoiceCommand> = fc.record({
  id: fc.uuidV(4),
  command: fc.string({ minLength: 2, maxLength: 50 }),
  patterns: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
  description: fc.string({ minLength: 5, maxLength: 200 }),
  category: fc.constantFrom('navigation', 'control', 'utility', 'chat', 'system'),
  enabled: fc.boolean(),
  confidence: arbitraryConfidence,
  callback: fc.constant(() => {}) // Mock callback
})

export const arbitraryVoiceCommandMatch: fc.Arbitrary<VoiceCommandMatch> = fc.record({
  command: arbitraryVoiceCommand,
  transcript: arbitraryTranscript,
  confidence: arbitraryConfidence,
  matches: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  timestamp: fc.date().map(d => d.getTime())
})

// Voice activity and metrics
export const arbitraryVoiceActivity: fc.Arbitrary<VoiceActivity> = fc.record({
  isActive: fc.boolean(),
  level: arbitraryAudioLevel,
  threshold: arbitraryAudioLevel,
  duration: fc.float({ min: 0, max: 3600000, noNaN: true }), // milliseconds
  lastActivity: fc.date().map(d => d.getTime()),
  silenceDuration: fc.float({ min: 0, max: 60000, noNaN: true })
})

export const arbitraryVoiceMetrics: fc.Arbitrary<VoiceMetrics> = fc.record({
  totalTranscripts: fc.nat({ max: 10000 }),
  successfulTranscripts: fc.nat({ max: 10000 }),
  failedTranscripts: fc.nat({ max: 1000 }),
  averageConfidence: arbitraryConfidence,
  totalSpeechTime: fc.float({ min: 0, max: 86400000, noNaN: true }),
  totalListeningTime: fc.float({ min: 0, max: 86400000, noNaN: true }),
  commandMatches: fc.nat({ max: 1000 }),
  errorCount: fc.nat({ max: 100 }),
  lastActivity: fc.date().map(d => d.getTime())
})

export const arbitraryVoicePerformance: fc.Arbitrary<VoicePerformance> = fc.record({
  latency: fc.float({ min: 0, max: 10000, noNaN: true }),
  processingTime: fc.float({ min: 0, max: 5000, noNaN: true }),
  memoryUsage: fc.float({ min: 0, max: 1000, noNaN: true }), // MB
  cpuUsage: fc.float({ min: 0, max: 100, noNaN: true }), // percentage
  networkLatency: fc.float({ min: 0, max: 2000, noNaN: true }),
  errorRate: fc.float({ min: 0, max: 1, noNaN: true })
})

// Voice state generators
export const arbitrarySpeechRecognitionState: fc.Arbitrary<SpeechRecognitionState> = fc.constantFrom(
  'idle',
  'listening',
  'processing',
  'error',
  'not-supported'
)

export const arbitraryTTSState = fc.constantFrom(
  'idle',
  'loading',
  'speaking',
  'paused',
  'error'
)

export const arbitraryVoiceStatus = fc.constantFrom(
  'idle',
  'initializing',
  'ready',
  'listening',
  'processing',
  'speaking',
  'error',
  'disabled',
  'permission-denied',
  'not-supported'
)

export const arbitraryVoiceState: fc.Arbitrary<VoiceState> = fc.record({
  recognition: fc.record({
    state: arbitrarySpeechRecognitionState,
    isListening: fc.boolean(),
    transcript: arbitraryTranscript,
    interimTranscript: arbitraryInterimTranscript,
    confidence: arbitraryConfidence,
    error: fc.option(arbitraryVoiceRecognitionError)
  }),
  tts: fc.record({
    state: arbitraryTTSState,
    isLoading: fc.boolean(),
    isSpeaking: fc.boolean(),
    isPaused: fc.boolean(),
    currentText: fc.option(arbitraryVoiceText),
    queue: fc.array(arbitraryVoiceText, { maxLength: 10 }),
    error: fc.option(arbitraryTTSError)
  }),
  isEnabled: fc.boolean(),
  isInitialized: fc.boolean(),
  error: fc.option(arbitraryVoiceError)
})

// Voice session data
export const arbitraryVoiceSessionData: fc.Arbitrary<VoiceSessionData> = fc.record({
  sessionId: fc.uuidV(4),
  startTime: fc.date({ min: new Date('2024-01-01') }).map(d => d.getTime()),
  endTime: fc.option(fc.date({ min: new Date('2024-01-01') }).map(d => d.getTime())),
  transcripts: fc.array(fc.record({
    transcript: arbitraryTranscript,
    confidence: arbitraryConfidence,
    timestamp: fc.date().map(d => d.getTime()),
    isFinal: fc.boolean()
  }), { maxLength: 100 }),
  commands: fc.array(arbitraryVoiceCommandMatch, { maxLength: 50 }),
  errors: fc.array(arbitraryVoiceRecognitionError, { maxLength: 10 }),
  metrics: arbitraryVoiceMetrics,
  performance: arbitraryVoicePerformance
})

// User interaction sequences
export const arbitraryUserAction = fc.constantFrom(
  'start_listening',
  'stop_listening',
  'clear_transcript',
  'toggle_auto_speak',
  'adjust_volume',
  'change_language',
  'add_command',
  'remove_command',
  'reset_session'
)

export const arbitraryUserInteractionSequence = fc.array(
  fc.record({
    action: arbitraryUserAction,
    timestamp: fc.date().map(d => d.getTime()),
    parameters: fc.option(fc.dictionary(fc.string(), fc.anything())),
    expectedOutcome: fc.option(fc.string())
  }),
  { minLength: 1, maxLength: 20 }
)

// Audio quality variations
export const arbitraryAudioQuality = fc.record({
  bitrate: fc.constantFrom(64, 128, 192, 256, 320), // kbps
  sampleRate: fc.constantFrom(8000, 16000, 22050, 44100, 48000),
  channels: fc.constantFrom(1, 2),
  codec: fc.constantFrom('mp3', 'wav', 'ogg', 'aac'),
  noiseLevel: fc.float({ min: 0, max: 1, noNaN: true }),
  distortion: fc.float({ min: 0, max: 0.5, noNaN: true }),
  echo: fc.float({ min: 0, max: 1, noNaN: true }),
  compressionRatio: fc.float({ min: 1, max: 10, noNaN: true })
})

// Network condition variations
export const arbitraryNetworkCondition = fc.record({
  latency: fc.float({ min: 10, max: 2000, noNaN: true }), // ms
  bandwidth: fc.float({ min: 56, max: 1000000, noNaN: true }), // kbps
  packetLoss: fc.float({ min: 0, max: 0.1, noNaN: true }), // percentage
  jitter: fc.float({ min: 0, max: 100, noNaN: true }), // ms
  isStable: fc.boolean()
})

// Concurrent user scenarios
export const arbitraryConcurrentUser = fc.record({
  userId: fc.uuidV(4),
  sessionId: fc.uuidV(4),
  isActive: fc.boolean(),
  currentAction: fc.option(arbitraryUserAction),
  voiceState: arbitraryVoiceState,
  lastActivity: fc.date().map(d => d.getTime())
})

export const arbitraryConcurrentUserScenario = fc.record({
  users: fc.array(arbitraryConcurrentUser, { minLength: 1, maxLength: 10 }),
  serverLoad: fc.float({ min: 0, max: 100, noNaN: true }),
  resourceLimits: fc.record({
    maxConcurrentSessions: fc.nat({ min: 1, max: 100 }),
    maxMemoryPerSession: fc.nat({ min: 10, max: 1000 }), // MB
    maxProcessingTime: fc.nat({ min: 100, max: 30000 }) // ms
  })
})

// Complex voice scenarios for integration testing
export const arbitraryVoiceScenario = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  initialState: arbitraryVoiceState,
  userInteractions: arbitraryUserInteractionSequence,
  audioQuality: arbitraryAudioQuality,
  networkCondition: arbitraryNetworkCondition,
  expectedBehavior: fc.record({
    shouldSucceed: fc.boolean(),
    maxLatency: fc.float({ min: 100, max: 5000, noNaN: true }),
    minAccuracy: arbitraryConfidence,
    allowedErrors: fc.array(fc.string(), { maxLength: 5 })
  }),
  metadata: fc.dictionary(fc.string(), fc.anything())
})

// Helper generators for specific test scenarios
export const arbitraryLongConversation = fc.array(arbitraryConversationTurn, { minLength: 50, maxLength: 200 })

export const arbitraryHighLoadScenario = fc.record({
  concurrentUsers: fc.nat({ min: 50, max: 1000 }),
  requestsPerSecond: fc.nat({ min: 100, max: 10000 }),
  duration: fc.nat({ min: 60, max: 3600 }), // seconds
  expectedResponseTime: fc.float({ min: 100, max: 2000, noNaN: true })
})

export const arbitraryErrorRecoveryScenario = fc.record({
  errorType: arbitraryVoiceError,
  recoveryStrategy: fc.constantFrom('retry', 'fallback', 'reset', 'ignore'),
  maxRetries: fc.nat({ min: 1, max: 5 }),
  timeoutDuration: fc.nat({ min: 1000, max: 30000 })
})

// Accessibility testing generators
export const arbitraryAccessibilityRequirement = fc.record({
  screenReaderEnabled: fc.boolean(),
  highContrastEnabled: fc.boolean(),
  reducedMotionEnabled: fc.boolean(),
  keyboardNavigationOnly: fc.boolean(),
  fontSize: fc.constantFrom('small', 'medium', 'large', 'extra-large'),
  colorBlindnessType: fc.option(fc.constantFrom('protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'))
})

// Performance constraint generators
export const arbitraryPerformanceConstraint = fc.record({
  maxMemoryUsage: fc.nat({ min: 50, max: 2000 }), // MB
  maxCpuUsage: fc.float({ min: 10, max: 90, noNaN: true }), // percentage
  maxLatency: fc.nat({ min: 100, max: 5000 }), // ms
  maxFileSize: fc.nat({ min: 1, max: 100 }), // MB
  batteryOptimized: fc.boolean()
})

export const arbitraryDeviceCapability = fc.record({
  hasWebGL: fc.boolean(),
  hasWebAudio: fc.boolean(),
  hasMicrophone: fc.boolean(),
  hasSpeakers: fc.boolean(),
  supportsWebRTC: fc.boolean(),
  isMobile: fc.boolean(),
  osType: fc.constantFrom('Windows', 'macOS', 'Linux', 'iOS', 'Android'),
  browserType: fc.constantFrom('Chrome', 'Firefox', 'Safari', 'Edge'),
  deviceMemory: fc.option(fc.nat({ min: 1, max: 32 })) // GB
})