// Voice Integration Hooks - Comprehensive voice and dragon integration
export { useDragon3D } from './useDragon3D'
export { useASCIIDragon } from './useASCIIDragon'
export { useElevenLabsTTS } from './useElevenLabsTTS'
export { useSpeechRecognition } from './useSpeechRecognition'

// Dragon Hook Types
export type { 
  DragonState, 
  DragonMood, 
  SpecialAnimation, 
  DragonAnimationConfig, 
  Dragon3DState, 
  Dragon3DError, 
  Dragon3DAction, 
  UseDragon3DOptions 
} from './useDragon3D'

export type { 
  ASCIIDragonPose, 
  ASCIIDragonSize, 
  ASCIIDragonSpeed, 
  ASCIIDragonAnimationState, 
  ASCIIDragonState,
  ASCIIDragonAnimationConfig, 
  ASCIIDragonError, 
  ASCIIDragonAction, 
  UseASCIIDragonOptions 
} from './useASCIIDragon'

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

// Utility Functions
export { 
  createDragonStateTransition, 
  createSpecialAnimationSequence, 
  getDragonStateRecommendation 
} from './useDragon3D'

export { 
  createPoseTransition, 
  createTypewriterSequence, 
  getPoseRecommendation, 
  getCharacterVariations 
} from './useASCIIDragon'

// Re-export from voice-dragon mapping utilities for convenience
export * from '../../utils/voice-dragon-mapping'

// Lazy loading utilities
export * from './lazy';

// Hook Documentation:
// - useDragon3D: Advanced 3D dragon state management with voice integration, performance monitoring, and reactive animations
// - useASCIIDragon: ASCII dragon rendering with typewriter effects, breathing animations, and keyboard shortcuts
// - useElevenLabsTTS: ElevenLabs text-to-speech integration with queue management and dragon synchronization
// - useSpeechRecognition: Web Speech API wrapper with continuous recognition and error handling
// 
// Integration Examples:
// ```typescript
// // Basic dragon with voice integration
// const dragon3D = useDragon3D({ enableVoiceIntegration: true })
// const tts = useElevenLabsTTS({ onSpeakingStart: dragon3D.onVoiceSpeakingStart })
// 
// // ASCII dragon with typewriter effects
// const asciiDragon = useASCIIDragon({ enableAutoTypewriter: true })
// const speech = useSpeechRecognition({ onTranscript: asciiDragon.onTranscriptUpdate })
// ```