// Voice component types

import { ReactNode } from 'react'
import { TTSState, TTSError } from '../api/elevenlabs'
import { SpeechRecognitionState, SpeechRecognitionErrorEvent } from '../api/speech'

export interface VoiceInterfaceProps {
  enabled?: boolean
  autoStart?: boolean
  showVisualizer?: boolean
  showTranscript?: boolean
  language?: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  onTranscript?: (transcript: string) => void
  onFinalTranscript?: (transcript: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onError?: (error: VoiceRecognitionError) => void
  onTTSStart?: () => void
  onTTSEnd?: () => void
  onTTSError?: (error: TTSError) => void
}

export interface VoiceVisualizerProps {
  isActive: boolean
  audioLevel: number
  frequencyData?: number[]
  type?: 'wave' | 'bars' | 'circular' | 'dragon'
  color?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export interface VoiceTranscriptProps {
  transcript: string
  interimTranscript?: string
  showInterim?: boolean
  maxLines?: number
  className?: string
  style?: React.CSSProperties
}

export interface VoiceControlsProps {
  isListening: boolean
  isSupported: boolean
  isSpeaking: boolean
  onStartListening: () => void
  onStopListening: () => void
  onToggleListening: () => void
  onClearTranscript: () => void
  showStartButton?: boolean
  showStopButton?: boolean
  showToggleButton?: boolean
  showClearButton?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface VoiceStatusProps {
  status: VoiceStatus
  error?: VoiceRecognitionError | TTSError
  className?: string
  style?: React.CSSProperties
}

export interface VoiceSettingsProps {
  settings: VoiceSettings
  onSettingsChange: (settings: VoiceSettings) => void
  className?: string
  style?: React.CSSProperties
}

export interface VoiceCommandProps {
  commands: VoiceCommand[]
  onCommandMatch: (command: VoiceCommand, transcript: string) => void
  matchThreshold?: number
  className?: string
  style?: React.CSSProperties
}

export interface VoiceActivityProps {
  isActive: boolean
  level: number
  threshold?: number
  showLevel?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface VoiceFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  showIcon?: boolean
  className?: string
  style?: React.CSSProperties
}

// Voice state types
export interface VoiceState {
  recognition: SpeechRecognitionState
  tts: TTSState
  isEnabled: boolean
  isInitialized: boolean
  error?: VoiceRecognitionError | TTSError
}

export interface VoiceConfig {
  recognition: {
    language: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    autoStart: boolean
    debounceTime: number
  }
  tts: {
    voice?: string
    rate: number
    pitch: number
    volume: number
    autoPlay: boolean
    queueMode: 'replace' | 'append' | 'interrupt'
  }
  audio: {
    enableEchoCancellation: boolean
    enableNoiseSuppression: boolean
    enableAutoGainControl: boolean
    sampleRate: number
    channelCount: number
  }
  visualization: {
    enabled: boolean
    type: 'wave' | 'bars' | 'circular' | 'dragon'
    color: string
    sensitivity: number
    smoothing: number
  }
  commands: {
    enabled: boolean
    matchThreshold: number
    caseSensitive: boolean
    fuzzyMatching: boolean
  }
}

export interface VoiceSettings {
  enabled: boolean
  language: string
  autoStart: boolean
  showVisualizer: boolean
  showTranscript: boolean
  ttsEnabled: boolean
  ttsVoice?: string
  ttsRate: number
  ttsPitch: number
  ttsVolume: number
  commandsEnabled: boolean
  noiseReduction: boolean
  echoCancellation: boolean
  autoGainControl: boolean
}

export interface VoiceCommand {
  id: string
  command: string
  patterns: string[]
  description: string
  category: string
  enabled: boolean
  confidence: number
  callback: (transcript: string, confidence: number) => void
}

export interface VoiceCommandMatch {
  command: VoiceCommand
  transcript: string
  confidence: number
  matches: string[]
  timestamp: number
}

export interface VoiceRecognitionError {
  type: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'ABORTED' | 'NO_SPEECH' | 'AUDIO_CAPTURE' | 'SERVICE_NOT_ALLOWED' | 'BAD_GRAMMAR' | 'LANGUAGE_NOT_SUPPORTED' | 'UNKNOWN_ERROR'
  message: string
  originalError?: SpeechRecognitionErrorEvent | Error
  context?: Record<string, unknown>
}

export interface VoiceActivity {
  isActive: boolean
  level: number
  threshold: number
  duration: number
  lastActivity: number
  silenceDuration: number
}

export interface VoiceMetrics {
  totalTranscripts: number
  successfulTranscripts: number
  failedTranscripts: number
  averageConfidence: number
  totalSpeechTime: number
  totalListeningTime: number
  commandMatches: number
  errorCount: number
  lastActivity: number
}

export interface VoicePerformance {
  latency: number
  processingTime: number
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
  errorRate: number
}

export type VoiceStatus = 
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'disabled'
  | 'permission-denied'
  | 'not-supported'

export interface VoiceSessionData {
  sessionId: string
  startTime: number
  endTime?: number
  transcripts: Array<{
    transcript: string
    confidence: number
    timestamp: number
    isFinal: boolean
  }>
  commands: VoiceCommandMatch[]
  errors: VoiceRecognitionError[]
  metrics: VoiceMetrics
  performance: VoicePerformance
}

// Voice Hook Types
export interface UseVoiceReturn {
  state: VoiceState
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  isSpeaking: boolean
  error?: VoiceRecognitionError | TTSError
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  resetTranscript: () => void
  speak: (text: string) => Promise<void>
  stopSpeaking: () => void
  clearError: () => void
  updateSettings: (settings: Partial<VoiceSettings>) => void
}

export interface UseSpeechRecognitionReturn {
  transcript: string
  interimTranscript: string
  finalTranscript: string
  listening: boolean
  resetTranscript: () => void
  browserSupportsSpeechRecognition: boolean
  startListening: (options?: Record<string, unknown>) => void
  stopListening: () => void
  abortListening: () => void
  error: SpeechRecognitionErrorEvent | null
  confidence: number
}

export interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isPaused: boolean
  isLoading: boolean
  error: TTSError | null
  voices: SpeechSynthesisVoice[]
  selectedVoice?: SpeechSynthesisVoice
  setVoice: (voice: SpeechSynthesisVoice) => void
  rate: number
  setRate: (rate: number) => void
  pitch: number
  setPitch: (pitch: number) => void
  volume: number
  setVolume: (volume: number) => void
}

export interface UseVoiceCommandsReturn {
  commands: VoiceCommand[]
  addCommand: (command: VoiceCommand) => void
  removeCommand: (id: string) => void
  enableCommand: (id: string) => void
  disableCommand: (id: string) => void
  clearCommands: () => void
  lastMatch?: VoiceCommandMatch
  matchCount: number
}

export interface UseVoiceActivityReturn {
  activity: VoiceActivity
  isActive: boolean
  level: number
  startMonitoring: () => void
  stopMonitoring: () => void
  setThreshold: (threshold: number) => void
}

export interface UseVoiceVisualizerReturn {
  audioLevel: number
  frequencyData: number[]
  isActive: boolean
  start: () => void
  stop: () => void
  setType: (type: 'wave' | 'bars' | 'circular' | 'dragon') => void
  setColor: (color: string) => void
  setSensitivity: (sensitivity: number) => void
}

// Voice Context Types
export interface VoiceContextValue {
  state: VoiceState
  config: VoiceConfig
  settings: VoiceSettings
  commands: VoiceCommand[]
  session: VoiceSessionData
  updateConfig: (config: Partial<VoiceConfig>) => void
  updateSettings: (settings: Partial<VoiceSettings>) => void
  addCommand: (command: VoiceCommand) => void
  removeCommand: (id: string) => void
  startSession: () => void
  endSession: () => void
  clearSession: () => void
}

export interface VoiceProviderProps {
  children: ReactNode
  config?: Partial<VoiceConfig>
  settings?: Partial<VoiceSettings>
  commands?: VoiceCommand[]
  onSessionStart?: (session: VoiceSessionData) => void
  onSessionEnd?: (session: VoiceSessionData) => void
  onError?: (error: VoiceRecognitionError | TTSError) => void
}

// Voice Events
export interface VoiceEvent {
  type: 'transcript' | 'command' | 'error' | 'start' | 'end' | 'activity'
  data: unknown
  timestamp: number
  sessionId: string
}

export interface VoiceEventHandler {
  (event: VoiceEvent): void
}

// Voice Accessibility Types
export interface VoiceAccessibilityConfig {
  announceStart: boolean
  announceEnd: boolean
  announceErrors: boolean
  announceTranscripts: boolean
  announceCommands: boolean
  keyboardShortcuts: boolean
  visualIndicators: boolean
  soundIndicators: boolean
  hapticFeedback: boolean
}

export interface VoiceAccessibilityState {
  screenReaderEnabled: boolean
  highContrastEnabled: boolean
  reducedMotionEnabled: boolean
  keyboardNavigationEnabled: boolean
  voiceNavigationEnabled: boolean
}

// Voice Testing Types
export interface VoiceTestConfig {
  transcript: string
  expectedCommands: string[]
  expectedConfidence: number
  timeout: number
  retries: number
}

export interface VoiceTestResult {
  success: boolean
  transcript: string
  confidence: number
  commands: VoiceCommandMatch[]
  errors: VoiceRecognitionError[]
  duration: number
  metadata: Record<string, any>
}

export interface VoiceTestSuite {
  name: string
  description: string
  tests: VoiceTestConfig[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

// Voice Integration Types
export interface VoiceChatIntegration {
  enabled: boolean
  autoSend: boolean
  confirmBeforeSend: boolean
  showTranscript: boolean
  voiceResponse: boolean
  commandPrefix: string
  stopWords: string[]
}

export interface VoiceDragonIntegration {
  enabled: boolean
  reactToVoice: boolean
  animateOnSpeech: boolean
  showVoiceActivity: boolean
  dragonCommands: boolean
  voiceFeedback: boolean
}