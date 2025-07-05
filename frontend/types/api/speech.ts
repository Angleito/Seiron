// Web Speech API type declarations

export interface SpeechRecognitionErrorEvent {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported'
  message: string
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  readonly isFinal: boolean
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  serviceURI: string
  grammars: SpeechGrammarList
  start(): void
  stop(): void
  abort(): void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onresult: (event: SpeechRecognitionEvent) => void
  onstart: () => void
  onend: () => void
  onaudiostart: () => void
  onaudioend: () => void
  onsoundstart: () => void
  onsoundend: () => void
  onspeechstart: () => void
  onspeechend: () => void
  onnomatch: () => void
}

export interface SpeechGrammarList {
  readonly length: number
  item(index: number): SpeechGrammar
  [index: number]: SpeechGrammar
  addFromURI(src: string, weight?: number): void
  addFromString(string: string, weight?: number): void
}

export interface SpeechGrammar {
  src: string
  weight: number
}

// Browser compatibility declarations
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
    SpeechGrammarList: {
      new (): SpeechGrammarList
    }
    webkitSpeechGrammarList: {
      new (): SpeechGrammarList
    }
  }
}

// Enhanced Speech Recognition Types
export interface SpeechRecognitionConfig {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  maxAlternatives?: number
  grammars?: SpeechGrammarList
}

export interface SpeechRecognitionState {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  finalTranscript: string
  error: SpeechRecognitionErrorEvent | null
  confidence: number
}

export interface SpeechRecognitionHookConfig extends SpeechRecognitionConfig {
  onTranscriptChange?: (transcript: string) => void
  onFinalTranscript?: (transcript: string) => void
  onError?: (error: SpeechRecognitionErrorEvent) => void
  onStart?: () => void
  onEnd?: () => void
  autoStart?: boolean
  clearTranscriptOnListen?: boolean
}

export interface SpeechRecognitionHookReturn {
  transcript: string
  interimTranscript: string
  finalTranscript: string
  listening: boolean
  resetTranscript: () => void
  browserSupportsSpeechRecognition: boolean
  startListening: (options?: SpeechRecognitionConfig) => void
  stopListening: () => void
  abortListening: () => void
  error: SpeechRecognitionErrorEvent | null
  confidence: number
}

// Voice Command Types
export interface VoiceCommand {
  command: string
  patterns: string[]
  callback: (transcript: string) => void
  confidence?: number
}

export interface VoiceCommandConfig {
  commands: VoiceCommand[]
  matchThreshold?: number
  caseSensitive?: boolean
  fuzzyMatching?: boolean
}

export interface VoiceCommandResult {
  command: VoiceCommand
  transcript: string
  confidence: number
  matches: string[]
}

// Voice Activity Detection Types
export interface VoiceActivityConfig {
  threshold?: number
  debounceTime?: number
  minSilenceDuration?: number
  maxSilenceDuration?: number
}

export interface VoiceActivityState {
  isActive: boolean
  silenceDuration: number
  activityLevel: number
  lastActivity: number
}

// Audio Context Types
export interface AudioAnalyser {
  analyser: AnalyserNode
  dataArray: Uint8Array
  bufferLength: number
}

export interface AudioStreamConfig {
  sampleRate?: number
  channelCount?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

export interface AudioLevel {
  volume: number
  frequency: number
  peak: number
  rms: number
}

// Real-time Audio Processing Types
export interface AudioProcessor {
  context: AudioContext
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  processor: AudioWorkletNode
  destination: AudioDestinationNode
}

export interface AudioProcessorConfig {
  fftSize?: number
  smoothingTimeConstant?: number
  minDecibels?: number
  maxDecibels?: number
  workletUrl?: string
}

export interface AudioFeatures {
  spectralCentroid: number
  spectralRolloff: number
  zeroCrossingRate: number
  mfcc: number[]
  chroma: number[]
  tonnetz: number[]
}

// Voice Recognition Error Types
export type VoiceRecognitionErrorType = 
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'NO_SPEECH'
  | 'AUDIO_CAPTURE'
  | 'SERVICE_NOT_ALLOWED'
  | 'BAD_GRAMMAR'
  | 'LANGUAGE_NOT_SUPPORTED'
  | 'UNKNOWN_ERROR'

export interface VoiceRecognitionError {
  type: VoiceRecognitionErrorType
  message: string
  originalError?: SpeechRecognitionErrorEvent
  context?: Record<string, unknown>
}

// Voice Synthesis Types (for completeness)
export interface VoiceSynthesisConfig {
  voice?: SpeechSynthesisVoice
  volume?: number
  rate?: number
  pitch?: number
  lang?: string
}

export interface VoiceSynthesisState {
  speaking: boolean
  paused: boolean
  pending: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice?: SpeechSynthesisVoice
}

// Utility Types
export type RecognitionLanguage = 
  | 'en-US' 
  | 'en-GB' 
  | 'es-ES' 
  | 'fr-FR' 
  | 'de-DE' 
  | 'it-IT' 
  | 'pt-BR' 
  | 'ru-RU' 
  | 'ja-JP' 
  | 'ko-KR' 
  | 'zh-CN'

export interface LanguageConfig {
  code: RecognitionLanguage
  name: string
  region: string
  rtl: boolean
}

export const SUPPORTED_LANGUAGES: Record<RecognitionLanguage, LanguageConfig> = {
  'en-US': { code: 'en-US', name: 'English', region: 'United States', rtl: false },
  'en-GB': { code: 'en-GB', name: 'English', region: 'United Kingdom', rtl: false },
  'es-ES': { code: 'es-ES', name: 'Spanish', region: 'Spain', rtl: false },
  'fr-FR': { code: 'fr-FR', name: 'French', region: 'France', rtl: false },
  'de-DE': { code: 'de-DE', name: 'German', region: 'Germany', rtl: false },
  'it-IT': { code: 'it-IT', name: 'Italian', region: 'Italy', rtl: false },
  'pt-BR': { code: 'pt-BR', name: 'Portuguese', region: 'Brazil', rtl: false },
  'ru-RU': { code: 'ru-RU', name: 'Russian', region: 'Russia', rtl: false },
  'ja-JP': { code: 'ja-JP', name: 'Japanese', region: 'Japan', rtl: false },
  'ko-KR': { code: 'ko-KR', name: 'Korean', region: 'South Korea', rtl: false },
  'zh-CN': { code: 'zh-CN', name: 'Chinese', region: 'China', rtl: false },
}