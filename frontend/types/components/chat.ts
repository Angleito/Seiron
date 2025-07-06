// Chat component types

import { ReactNode } from 'react'
import { AgentType } from '../agent'
import { 
  ChatSession as PersistentChatSession,
  ChatMessage as PersistentChatMessage,
  ChatPersistenceError,
  PaginationInfo,
  SessionsQueryParams,
  MessagesQueryParams 
} from '../../services/chat-persistence.service'

export interface ChatProps {
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}

export interface ChatInterfaceProps extends ChatProps {
  messages: ChatMessage[]
  isLoading?: boolean
  error?: string
  onSendMessage: (message: string) => void
  onClearMessages?: () => void
  onRetry?: () => void
  showTypingIndicator?: boolean
  placeholder?: string
  maxHeight?: number
  autoScroll?: boolean
  enableVoice?: boolean
  enableMarkdown?: boolean
}

export interface ChatMessageProps {
  message: ChatMessage
  showAvatar?: boolean
  showTimestamp?: boolean
  showActions?: boolean
  enableMarkdown?: boolean
  className?: string
  style?: React.CSSProperties
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
  onReact?: (messageId: string, reaction: string) => void
}

export interface ChatInputProps {
  value?: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  multiline?: boolean
  maxLength?: number
  enableVoice?: boolean
  enableAttachments?: boolean
  enableEmoji?: boolean
  className?: string
  style?: React.CSSProperties
  onChange?: (value: string) => void
  onSubmit?: (message: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onVoiceToggle?: (enabled: boolean) => void
  onAttachment?: (file: File) => void
}

export interface ChatMessagesAreaProps {
  messages: ChatMessage[]
  loading?: boolean
  error?: string
  showTypingIndicator?: boolean
  autoScroll?: boolean
  maxHeight?: number
  enableMarkdown?: boolean
  className?: string
  style?: React.CSSProperties
  onMessageEdit?: (messageId: string, content: string) => void
  onMessageDelete?: (messageId: string) => void
  onMessageCopy?: (content: string) => void
  onMessageReact?: (messageId: string, reaction: string) => void
  onRetry?: () => void
}

export interface ChatStatusBarProps {
  isConnected: boolean
  isTyping?: boolean
  participantCount?: number
  agentStatus?: AgentStatus
  className?: string
  style?: React.CSSProperties
}

export interface TypingIndicatorProps {
  visible: boolean
  users?: string[]
  className?: string
  style?: React.CSSProperties
}

export interface VoiceTranscriptPreviewProps {
  transcript: string
  interimTranscript?: string
  isListening: boolean
  confidence?: number
  className?: string
  style?: React.CSSProperties
  onClear?: () => void
  onSend?: () => void
}

export interface VoiceSectionProps {
  enabled: boolean
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  interimTranscript?: string
  error?: string
  onToggleListening: () => void
  onClearTranscript: () => void
  onSendTranscript: () => void
  onToggleVoice: (enabled: boolean) => void
  className?: string
  style?: React.CSSProperties
}

export interface VoiceEnabledChatProps extends ChatInterfaceProps {
  voiceEnabled?: boolean
  autoPlayResponses?: boolean
  voiceSettings?: VoiceSettings
  onVoiceToggle?: (enabled: boolean) => void
  onVoiceSettingsChange?: (settings: VoiceSettings) => void
}

// Chat Data Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  // Additional properties for compatibility with StreamMessage
  type?: 'user' | 'agent' | 'system'
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed'
  created_at?: string // For persistence compatibility
  agentType?: AgentType
  metadata?: ChatMessageMetadata
  attachments?: ChatAttachment[]
  reactions?: ChatReaction[]
  editHistory?: Array<{
    content: string
    timestamp: Date
    reason?: string
  }>
}

// Type guard to check if a message has timestamp or created_at
export function getMessageTimestamp(message: ChatMessage): Date {
  if (message.timestamp) return message.timestamp
  if (message.created_at) return new Date(message.created_at)
  return new Date()
}

// Type to handle both StreamMessage and ChatMessage from persistence
export type UnifiedChatMessage = ChatMessage & {
  // Ensure we have both type and role for compatibility
  type: 'user' | 'agent' | 'system'
  role: 'user' | 'assistant' | 'system'
  // Ensure we have timestamp
  timestamp: Date
}

export interface ChatMessageMetadata {
  intent?: string
  action?: string
  confidence?: number
  taskId?: string
  executionTime?: number
  error?: boolean
  powerLevel?: number
  dragonBallMessage?: string
  adapterType?: string
  agentId?: string
  tokens?: number
  model?: string
  temperature?: number
  [key: string]: unknown
}

export interface ChatAttachment {
  id: string
  type: 'image' | 'file' | 'audio' | 'video' | 'document'
  name: string
  url: string
  size: number
  mimeType: string
  thumbnail?: string
  metadata?: Record<string, unknown>
}

export interface ChatReaction {
  emoji: string
  count: number
  users: string[]
  userReacted: boolean
}

export interface ChatSession {
  id: string
  title?: string
  description?: string // Added for persistence compatibility
  messages: ChatMessage[]
  participants: ChatParticipant[]
  createdAt: Date
  updatedAt: Date
  // Additional properties for persistence compatibility
  created_at?: string
  updated_at?: string
  last_message_at?: string
  is_archived?: boolean
  message_count?: number
  settings: ChatSettings
  metadata?: Record<string, unknown>
}

export interface ChatParticipant {
  id: string
  name: string
  role: 'user' | 'agent' | 'moderator'
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
  permissions: ChatPermissions
}

export interface ChatPermissions {
  canSendMessages: boolean
  canDeleteMessages: boolean
  canEditMessages: boolean
  canManageParticipants: boolean
  canChangeSettings: boolean
}

export interface ChatSettings {
  enableVoice: boolean
  enableMarkdown: boolean
  enableAttachments: boolean
  enableReactions: boolean
  enableHistory: boolean
  autoSave: boolean
  retentionDays: number
  maxMessageLength: number
  allowedFileTypes: string[]
  maxFileSize: number
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  notifications: boolean
}

export interface ChatState {
  session: ChatSession
  isConnected: boolean
  isLoading: boolean
  isTyping: boolean
  isSending: boolean
  error?: string
  unreadCount: number
  lastActivity: Date
}

export interface ChatConfig {
  apiUrl: string
  websocketUrl?: string
  sessionId?: string
  userId?: string
  autoConnect: boolean
  reconnectAttempts: number
  reconnectDelay: number
  messageTimeout: number
  typingTimeout: number
  heartbeatInterval: number
}

export interface VoiceSettings {
  enabled: boolean
  autoPlayResponses: boolean
  language: string
  ttsVoice?: string
  ttsRate: number
  ttsPitch: number
  ttsVolume: number
  speechRecognitionEnabled: boolean
  continuousListening: boolean
  interimResults: boolean
  autoSend: boolean
  confirmBeforeSend: boolean
  noiseReduction: boolean
  echoCancellation: boolean
}

export interface AgentStatus {
  id: string
  type: AgentType
  status: 'idle' | 'busy' | 'error' | 'offline'
  currentTask?: string
  queueLength: number
  averageResponseTime: number
  lastActivity: Date
}

export interface ChatHistory {
  sessions: ChatSession[]
  totalSessions: number
  totalMessages: number
  searchResults?: ChatMessage[]
  filters: ChatHistoryFilters
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

export interface ChatHistoryFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  participants?: string[]
  messageTypes?: Array<'user' | 'assistant' | 'system'>
  agentTypes?: AgentType[]
  hasAttachments?: boolean
  searchQuery?: string
}

export interface ChatStreamOptions {
  onMessage?: (message: ChatMessage) => void
  onTyping?: (isTyping: boolean) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: () => void
}

export interface ChatAction {
  type: 'send' | 'edit' | 'delete' | 'react' | 'clear' | 'retry'
  messageId?: string
  content?: string
  reaction?: string
  metadata?: Record<string, unknown>
}

export interface ChatEvent {
  type: 'message' | 'typing' | 'reaction' | 'participant_join' | 'participant_leave' | 'settings_change'
  data: unknown
  timestamp: Date
  sessionId: string
  userId?: string
}

// Hook Types
export interface UseChatReturn {
  state: ChatState
  messages: ChatMessage[]
  sendMessage: (content: string, metadata?: ChatMessageMetadata) => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  reactToMessage: (messageId: string, emoji: string) => Promise<void>
  clearMessages: () => void
  retry: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
  updateSettings: (settings: Partial<ChatSettings>) => void
}

export interface UseChatStreamReturn extends UseChatReturn {
  isStreaming: boolean
  startStream: (options?: ChatStreamOptions) => void
  stopStream: () => void
  pauseStream: () => void
  resumeStream: () => void
}

export interface UseChatHistoryReturn {
  history: ChatHistory
  loading: boolean
  error?: string
  loadSessions: (filters?: ChatHistoryFilters) => Promise<void>
  searchMessages: (query: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  exportSession: (sessionId: string, format: 'json' | 'txt' | 'csv') => Promise<string>
  clearHistory: () => Promise<void>
}

// Context Types
export interface ChatContextValue {
  state: ChatState
  config: ChatConfig
  settings: ChatSettings
  voiceSettings: VoiceSettings
  actions: {
    sendMessage: (content: string, metadata?: ChatMessageMetadata) => Promise<void>
    editMessage: (messageId: string, content: string) => Promise<void>
    deleteMessage: (messageId: string) => Promise<void>
    reactToMessage: (messageId: string, emoji: string) => Promise<void>
    clearMessages: () => void
    updateSettings: (settings: Partial<ChatSettings>) => void
    updateVoiceSettings: (settings: Partial<VoiceSettings>) => void
  }
}

export interface ChatProviderProps {
  children: ReactNode
  config?: Partial<ChatConfig>
  settings?: Partial<ChatSettings>
  voiceSettings?: Partial<VoiceSettings>
  onMessage?: (message: ChatMessage) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

// Error Types
export interface ChatError {
  type: 'connection' | 'message' | 'voice' | 'validation' | 'permission' | 'unknown'
  message: string
  details?: Record<string, unknown>
  timestamp: Date
  recoverable: boolean
}

// Analytics Types
export interface ChatAnalytics {
  messageCount: number
  averageResponseTime: number
  sessionDuration: number
  voiceUsage: number
  agentInteractions: Record<AgentType, number>
  errorRate: number
  userSatisfaction?: number
  topTopics: Array<{
    topic: string
    count: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
}

// Persistence Types (extending service types for UI components)
export interface ChatSessionManagerProps {
  userId?: string
  currentSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onSessionCreate?: (session: PersistentChatSession) => void
  onSessionUpdate?: (session: PersistentChatSession) => void
  onSessionDelete?: (sessionId: string) => void
  showCreateForm?: boolean
  enableSearch?: boolean
  enableArchiving?: boolean
  className?: string
}

export interface MessageHistoryProps {
  sessionId: string
  userId?: string
  onMessagesLoaded?: (messages: PersistentChatMessage[]) => void
  onMessageSelect?: (message: PersistentChatMessage) => void
  enablePagination?: boolean
  enableInfiniteScroll?: boolean
  messagesPerPage?: number
  className?: string
}

export interface MessagePaginationProps {
  pagination: PaginationInfo
  isLoading: boolean
  isLoadingMore: boolean
  onGoToPage: (page: number) => void
  onGoToNextPage: () => void
  onGoToPreviousPage: () => void
  onLoadMoreMessages: () => void
  showLoadMore?: boolean
  showPageNumbers?: boolean
  showMessageCount?: boolean
  enableInfiniteScroll?: boolean
  className?: string
}

export interface ChatPersistenceState {
  // Session management
  sessions: PersistentChatSession[]
  currentSession: PersistentChatSession | null
  sessionStats: {
    total_sessions: number
    active_sessions: number
    archived_sessions: number
    total_messages: number
  } | null
  
  // Message history
  messageHistory: PersistentChatMessage[]
  messagesPagination: PaginationInfo | null
  
  // Loading states
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  isLoadingMore: boolean
  isCreatingSession: boolean
  isUpdatingSession: boolean
  isDeletingSession: boolean
  
  // Error states
  sessionError: ChatPersistenceError | null
  messageError: ChatPersistenceError | null
  persistenceError: ChatPersistenceError | null
}

export interface ChatPersistenceActions {
  // Session actions
  loadSessions: (params?: SessionsQueryParams) => Promise<void>
  createSession: (title: string, description?: string, metadata?: Record<string, unknown>) => Promise<PersistentChatSession | null>
  updateSession: (sessionId: string, updates: Partial<PersistentChatSession>) => Promise<PersistentChatSession | null>
  deleteSession: (sessionId: string) => Promise<boolean>
  archiveSession: (sessionId: string, archived: boolean) => Promise<PersistentChatSession | null>
  selectSession: (sessionId: string) => void
  
  // Message actions
  loadMessages: (sessionId: string, params?: MessagesQueryParams) => Promise<void>
  loadMoreMessages: () => Promise<void>
  refreshMessages: () => Promise<void>
  
  // Search and filter
  searchSessions: (query: string) => Promise<void>
  filterSessions: (params: SessionsQueryParams) => Promise<void>
  
  // Error handling
  clearSessionError: () => void
  clearMessageError: () => void
  clearPersistenceError: () => void
}

export interface ChatWithPersistenceProps extends ChatInterfaceProps {
  // Persistence configuration
  userId?: string
  enableSessionManagement?: boolean
  enableMessageHistory?: boolean
  enableAutoSave?: boolean
  autoLoadHistory?: boolean
  
  // Session management
  currentSessionId?: string
  onSessionChange?: (sessionId: string) => void
  onSessionCreate?: (session: PersistentChatSession) => void
  
  // Message history
  messagesPerPage?: number
  enableInfiniteScroll?: boolean
  
  // Error handling
  onPersistenceError?: (error: ChatPersistenceError) => void
}

export interface ChatLoadingStateProps {
  type: 'sessions' | 'messages' | 'creating' | 'updating' | 'deleting' | 'voice' | 'initial'
  operation?: string
  className?: string
}

export interface ChatErrorStateProps {
  error: ChatPersistenceError
  type?: 'inline' | 'modal' | 'toast' | 'full'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

// Enhanced hook types with persistence
export interface UseChatWithPersistenceOptions {
  userId?: string
  enablePersistence?: boolean
  enableSessionManagement?: boolean
  enableMessageHistory?: boolean
  autoLoadHistory?: boolean
  initialSessionId?: string
  onSessionChange?: (sessionId: string) => void
  onPersistenceError?: (error: ChatPersistenceError) => void
}

export interface UseChatWithPersistenceReturn extends UseChatReturn {
  // Persistence state
  persistenceState: ChatPersistenceState
  persistenceActions: ChatPersistenceActions
  
  // Current session
  currentSession: PersistentChatSession | null
  currentSessionId: string | null
  
  // Message history
  messageHistory: PersistentChatMessage[]
  messagesPagination: PaginationInfo | null
  
  // Combined loading state
  isLoadingAnything: boolean
  
  // Enhanced actions
  sendMessageWithPersistence: (content: string, metadata?: Record<string, unknown>) => Promise<void>
  createNewSession: (title: string, description?: string) => Promise<void>
  switchToSession: (sessionId: string) => Promise<void>
  
  // Utility functions
  exportSession: (format: 'json' | 'txt' | 'csv') => Promise<string>
  importSession: (data: string, format: 'json') => Promise<void>
}