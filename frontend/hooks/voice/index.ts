// Voice Integration Hooks - Speech recognition and text-to-speech
export { useElevenLabsTTS } from './useElevenLabsTTS'
export { useSecureElevenLabsTTS } from './useSecureElevenLabsTTS'
export { useSpeechRecognition } from './useSpeechRecognition'

// Voice Hook Types - ElevenLabs TTS
export type { 
  ElevenLabsConfig, 
  TTSState, 
  TTSError
} from './useElevenLabsTTS'

// Secure Voice Hook Types
export type { 
  SecureElevenLabsConfig
} from './useSecureElevenLabsTTS'

// Voice Hook Types - Speech Recognition
export type { 
  SpeechError, 
  SpeechRecognitionState, 
  SpeechRecognitionAction
} from './useSpeechRecognition'


// Lazy loading utilities
export * from './lazy';

// Hook Documentation:
// - useElevenLabsTTS: ElevenLabs text-to-speech integration with queue management and audio controls (DEPRECATED - use useSecureElevenLabsTTS)
// - useSecureElevenLabsTTS: Secure ElevenLabs text-to-speech integration via server-side API proxy
// - useSpeechRecognition: Web Speech API wrapper with continuous recognition and error handling
// 
// Integration Examples:
// ```typescript
// // Secure voice integration (recommended)
// const tts = useSecureElevenLabsTTS({ voiceId: 'your-voice-id' })
// const speech = useSpeechRecognition({ continuous: true })
// 
// // Legacy direct API integration (not recommended for production)
// const tts = useElevenLabsTTS({ apiKey: 'your-api-key', voiceId: 'your-voice-id' })
// ```