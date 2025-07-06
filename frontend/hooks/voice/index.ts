// Voice Integration Hooks - Speech recognition and text-to-speech
export { useElevenLabsTTS } from './useElevenLabsTTS'
export { useSpeechRecognition } from './useSpeechRecognition'

// Voice Hook Types - ElevenLabs TTS
export type { 
  ElevenLabsConfig, 
  TTSState, 
  TTSError
} from './useElevenLabsTTS'

// Voice Hook Types - Speech Recognition
export type { 
  SpeechError, 
  SpeechRecognitionState, 
  SpeechRecognitionAction
} from './useSpeechRecognition'


// Lazy loading utilities
export * from './lazy';

// Hook Documentation:
// - useElevenLabsTTS: ElevenLabs text-to-speech integration with queue management and audio controls
// - useSpeechRecognition: Web Speech API wrapper with continuous recognition and error handling
// 
// Integration Examples:
// ```typescript
// // Basic voice integration
// const tts = useElevenLabsTTS({ voiceId: 'your-voice-id' })
// const speech = useSpeechRecognition({ continuous: true })
// ```