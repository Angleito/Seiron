// Voice component exports
export { default as VoiceInterface } from './VoiceInterface'
export type { VoiceInterfaceProps, VoiceInterfaceState } from './VoiceInterface'
export { useVoiceInterfaceAudio } from './VoiceInterface'

// Debug components
export { default as VoiceConfigDebugger } from './VoiceConfigDebugger'

// Voice-Dragon integration components
export { default as VoiceDragonDemo } from './VoiceDragonDemo'
export type { VoiceDragonDemoProps } from './VoiceDragonDemo'

export { default as VoiceDragonIntegrationExample } from './VoiceDragonIntegrationExample'
export type { VoiceDragonIntegrationExampleProps } from './VoiceDragonIntegrationExample'

// Voice-Dragon mapping utilities re-export
export * from '../../utils/voice-dragon-mapping';

// Voice-Dragon mapping types
export type {
  VoiceAnimationState
} from '../dragon/DragonRenderer';

// Lazy loading utilities
export * from './lazy';