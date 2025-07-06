// Re-export StreamMessage and related types from ChatStreamService
export type { 
  StreamMessage, 
  TypingIndicator, 
  ConnectionStatus,
  MessageQueueItem,
  ChatStreamConfig 
} from '../components/chat/ChatStreamService'

// Re-export from vercel-chat-service as well with prefix to avoid conflicts
export type {
  StreamMessage as VercelStreamMessage,
  TypingIndicator as VercelTypingIndicator,
  ConnectionStatus as VercelConnectionStatus,
  VercelChatConfig,
  OrchestrationResponse
} from '../lib/vercel-chat-service'