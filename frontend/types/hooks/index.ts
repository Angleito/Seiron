// Hook types - centralized exports

// Voice hook types
export * from './voice'

// Dragon hook types
export * from './dragon'

// Chat hook types
export * from './chat'

// Re-export commonly used types for convenience
export type {
  SpeechRecognitionHookReturn,
  TTSHookReturn,
  VoiceHookReturn,
  VoiceCommandsHookReturn,
  VoiceActivityHookReturn
} from './voice'

export type {
  DragonAnimationHookReturn,
  DragonInteractionHookReturn,
  MouseTrackingHookReturn,
  TouchGesturesHookReturn,
  DragonPerformanceHookReturn,
  DragonHookReturn
} from './dragon'

export type {
  ChatHookReturn,
  ChatStreamHookReturn,
  VoiceChatHookReturn,
  ChatHistoryHookReturn,
  ChatAnalyticsHookReturn
} from './chat'