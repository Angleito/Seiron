// Component types - centralized exports

// Dragon component types
export * from './dragon'

// Voice component types
export * from './voice'

// Transaction component types
export * from './transactions'

// Chat component types
export * from './chat'

// Re-export commonly used types for convenience
export type {
  DragonState,
  DragonMood,
  DragonPose,
  DragonProps,
  DragonInteractionEvent,
  PerformanceMetrics,
  TouchGesture
} from './dragon'

export type {
  VoiceInterfaceProps,
  VoiceState,
  VoiceConfig,
  VoiceSettings,
  VoiceCommand,
  VoiceStatus
} from './voice'

export type {
  TransactionData,
  TransactionProps,
  TransactionPreviewProps,
  TransactionConfirmationProps,
  TransactionType,
  TransactionStatus,
  TokenInfo
} from './transactions'

export type {
  ChatMessage,
  ChatProps,
  ChatInterfaceProps,
  ChatSession,
  ChatSettings,
  AgentStatus
} from './chat'