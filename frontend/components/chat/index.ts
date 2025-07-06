// Main chat components
export { ChatInterface } from './chat-interface'
export { VoiceEnabledChat } from './VoiceEnabledChat'
export { VoiceEnabledChatPresentation } from './VoiceEnabledChatPresentation'
export { EnhancedVoiceEnabledChatPresentation } from './EnhancedVoiceEnabledChatPresentation'
export { RealtimeChat } from './RealtimeChat'

// Stream service and types
export { ChatStreamService, createChatStreamService } from './ChatStreamService'
export type { 
  StreamMessage, 
  TypingIndicator, 
  MessageQueueItem, 
  ConnectionStatus, 
  ChatStreamConfig 
} from './ChatStreamService'

// React hook
export { useChatStream } from './useChatStream'
export type { UseChatStreamOptions, UseChatStreamResult } from './useChatStream'

// Real-time components
export { RealtimeConnectionStatus } from './parts/RealtimeConnectionStatus'
export { RealtimePresenceIndicator } from './parts/RealtimePresenceIndicator'
export { RealtimePriceDisplay } from './parts/RealtimePriceDisplay'

// Examples
export { StreamProcessingExample } from './examples/StreamProcessingExample'
export { RealtimeChatExample } from './examples/RealtimeChatExample'