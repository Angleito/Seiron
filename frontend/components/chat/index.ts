// Main chat components
export { ChatInterface } from './chat-interface'
export { VoiceEnabledChat } from './VoiceEnabledChat'

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

// Examples
export { StreamProcessingExample } from './examples/StreamProcessingExample'