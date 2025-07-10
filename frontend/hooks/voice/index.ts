// Voice Integration Hooks - Speech recognition and text-to-speech
export { useElevenLabsTTS } from './useElevenLabsTTS'
export { useSecureElevenLabsTTS } from './useSecureElevenLabsTTS'
export { useSpeechRecognition } from './useSpeechRecognition'

// Dragon Control Hooks - Advanced dragon state management
export { useDragon3D } from './useDragon3D'
export { useASCIIDragon } from './useASCIIDragon'

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

// Dragon Control Hook Types
export type {
  Dragon3DState,
  Dragon3DConfig,
  Dragon3DActions,
  Dragon3DStreams
} from './useDragon3D'

export type {
  ASCIIPose,
  ASCIIDragonConfig,
  ASCIIDragonState
} from './useASCIIDragon'


// Lazy loading utilities
export * from './lazy';

// Hook Documentation:
// - useElevenLabsTTS: ElevenLabs text-to-speech integration with queue management and audio controls (DEPRECATED - use useSecureElevenLabsTTS)
// - useSecureElevenLabsTTS: Secure ElevenLabs text-to-speech integration via server-side API proxy
// - useSpeechRecognition: Web Speech API wrapper with continuous recognition and error handling
// - useDragon3D: Advanced 3D dragon state management with fp-ts and RxJS for functional programming
// - useASCIIDragon: Enhanced ASCII dragon with voice reactivity and character-based animations
// 
// Integration Examples:
// ```typescript
// // Secure voice integration (recommended)
// const tts = useSecureElevenLabsTTS({ voiceId: 'your-voice-id' })
// const speech = useSpeechRecognition({ continuous: true })
// 
// // Dragon 3D integration with voice
// const dragon3d = useDragon3D({ 
//   enableVoiceIntegration: true,
//   enablePerformanceMonitoring: true,
//   autoOptimize: true
// })
// dragon3d.updateVoiceState(voiceState)()
// 
// // ASCII dragon with voice reactivity
// const asciiDragon = useASCIIDragon({
//   enableVoiceReactivity: true,
//   enableBreathing: true,
//   enableEnergyEffects: true
// })
// asciiDragon.updateVoiceState(voiceState)
// 
// // Legacy direct API integration (not recommended for production)
// const tts = useElevenLabsTTS({ apiKey: 'your-api-key', voiceId: 'your-voice-id' })
// ```