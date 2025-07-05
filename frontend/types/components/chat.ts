// Chat component types

import { ReactNode } from 'react'
import { AgentType } from '../agent'

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
  messages: ChatMessage[]
  participants: ChatParticipant[]
  createdAt: Date
  updatedAt: Date
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