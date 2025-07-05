// Hook types - centralized exports

// Voice hook types
export * from './voice'

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
  ChatHookReturn,
  ChatStreamHookReturn,
  VoiceChatHookReturn,
  ChatHistoryHookReturn,
  ChatAnalyticsHookReturn
} from './chat'