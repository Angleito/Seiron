// Chat hook types

import { Observable } from 'rxjs'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { ChatMessage, ChatSession, ChatSettings, ChatError, VoiceSettings, AgentStatus } from '../components/chat'
import { ChatRequest } from '../api/orchestrator'

// Chat Hook Types
export interface ChatHookConfig {
  apiUrl: string
  sessionId?: string
  userId?: string
  initialMessages?: ChatMessage[]
  settings?: Partial<ChatSettings>
  voiceSettings?: Partial<VoiceSettings>
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  messageTimeout?: number
  onMessage?: (message: ChatMessage) => void
  onError?: (error: ChatError) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface ChatHookReturn {
  messages: ChatMessage[]
  isConnected: boolean
  isLoading: boolean
  isTyping: boolean
  isSending: boolean
  error: ChatError | null
  unreadCount: number
  lastActivity: Date | null
  sendMessage: (content: string, metadata?: Record<string, any>) => TE.TaskEither<ChatError, ChatMessage>
  editMessage: (messageId: string, content: string) => TE.TaskEither<ChatError, ChatMessage>
  deleteMessage: (messageId: string) => TE.TaskEither<ChatError, void>
  reactToMessage: (messageId: string, emoji: string) => TE.TaskEither<ChatError, void>
  clearMessages: () => void
  retry: () => TE.TaskEither<ChatError, void>
  connect: () => TE.TaskEither<ChatError, void>
  disconnect: () => void
  updateSettings: (settings: Partial<ChatSettings>) => void
  markAsRead: () => void
  exportChat: (format: 'json' | 'txt' | 'csv') => string
}

// Chat Stream Hook Types
export interface ChatStreamHookConfig extends ChatHookConfig {
  enableStreaming?: boolean
  bufferSize?: number
  streamingTimeout?: number
  onStreamStart?: () => void
  onStreamChunk?: (chunk: string) => void
  onStreamEnd?: () => void
  onStreamError?: (error: ChatError) => void
}

export interface ChatStreamHookReturn extends ChatHookReturn {
  isStreaming: boolean
  streamingMessage: string
  startStream: (request: ChatRequest) => TE.TaskEither<ChatError, void>
  stopStream: () => void
  pauseStream: () => void
  resumeStream: () => void
  getStreamProgress: () => number
}

// Voice-Enabled Chat Hook Types
export interface VoiceChatHookConfig extends ChatStreamHookConfig {
  voiceEnabled?: boolean
  autoPlayResponses?: boolean
  speechRecognitionConfig?: {
    language?: string
    continuous?: boolean
    interimResults?: boolean
    autoSend?: boolean
    confirmBeforeSend?: boolean
  }
  textToSpeechConfig?: {
    voice?: string
    rate?: number
    pitch?: number
    volume?: number
    autoPlay?: boolean
  }
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onVoiceError?: (error: Error) => void
  onTranscript?: (transcript: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
}

export interface VoiceChatHookReturn extends ChatStreamHookReturn {
  voiceEnabled: boolean
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  interimTranscript: string
  voiceError: Error | null
  toggleVoice: () => void
  startListening: () => TE.TaskEither<Error, void>
  stopListening: () => void
  speakMessage: (message: string) => TE.TaskEither<Error, void>
  stopSpeaking: () => void
  sendVoiceMessage: () => TE.TaskEither<ChatError, ChatMessage>
  clearTranscript: () => void
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void
}

// Chat History Hook Types
export interface ChatHistoryHookConfig {
  apiUrl: string
  userId?: string
  maxSessions?: number
  autoSave?: boolean
  retentionDays?: number
  onSessionLoad?: (session: ChatSession) => void
  onSessionSave?: (session: ChatSession) => void
  onSessionDelete?: (sessionId: string) => void
}

export interface ChatHistoryFilter {
  dateRange?: {
    from: Date
    to: Date
  }
  searchQuery?: string
  messageTypes?: Array<'user' | 'assistant' | 'system'>
  hasAttachments?: boolean
  minMessageCount?: number
  maxMessageCount?: number
}

export interface ChatHistoryHookReturn {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  isLoading: boolean
  error: ChatError | null
  totalSessions: number
  totalMessages: number
  loadSessions: (filter?: ChatHistoryFilter) => TE.TaskEither<ChatError, ChatSession[]>
  loadSession: (sessionId: string) => TE.TaskEither<ChatError, ChatSession>
  saveSession: (session: ChatSession) => TE.TaskEither<ChatError, void>
  deleteSession: (sessionId: string) => TE.TaskEither<ChatError, void>
  searchMessages: (query: string) => TE.TaskEither<ChatError, ChatMessage[]>
  exportSessions: (format: 'json' | 'csv') => string
  clearHistory: () => TE.TaskEither<ChatError, void>
  createNewSession: (title?: string) => ChatSession
  duplicateSession: (sessionId: string) => TE.TaskEither<ChatError, ChatSession>
}

// Chat Analytics Hook Types
export interface ChatAnalyticsHookConfig {
  trackingEnabled?: boolean
  sessionId?: string
  userId?: string
  onAnalyticsUpdate?: (analytics: ChatAnalytics) => void
}

export interface ChatAnalytics {
  messageCount: number
  averageResponseTime: number
  sessionDuration: number
  voiceUsage: {
    totalTime: number
    messagesSpoken: number
    transcriptionAccuracy: number
  }
  agentInteractions: Record<string, number>
  topTopics: Array<{
    topic: string
    count: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  userSatisfaction?: {
    rating: number
    feedback: string[]
  }
  performance: {
    averageLoadTime: number
    errorRate: number
    successRate: number
  }
  engagement: {
    messageLength: number
    conversationDepth: number
    returnVisits: number
  }
}

export interface ChatAnalyticsHookReturn {
  analytics: ChatAnalytics
  isTracking: boolean
  startTracking: () => void
  stopTracking: () => void
  trackMessage: (message: ChatMessage) => void
  trackInteraction: (type: string, data: Record<string, any>) => void
  trackError: (error: ChatError) => void
  trackVoiceUsage: (duration: number, accuracy: number) => void
  generateReport: () => string
  resetAnalytics: () => void
  exportAnalytics: () => string
}

// Chat WebSocket Hook Types
export interface ChatWebSocketHookConfig {
  url: string
  protocols?: string[]
  sessionId?: string
  userId?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  messageTimeout?: number
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: any) => void
  onReconnect?: () => void
}

export interface ChatWebSocketHookReturn {
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  error: Event | null
  lastPing: number
  messageQueue: any[]
  connect: () => TE.TaskEither<Error, void>
  disconnect: () => void
  send: (message: any) => TE.TaskEither<Error, void>
  subscribe: (type: string, callback: (data: any) => void) => () => void
  unsubscribe: (type: string) => void
  ping: () => TE.TaskEither<Error, number>
  getConnectionState: () => WebSocket['readyState']
  clearQueue: () => void
}

// Chat Agents Hook Types
export interface ChatAgentsHookConfig {
  apiUrl: string
  availableAgents?: string[]
  defaultAgent?: string
  onAgentChange?: (agentId: string) => void
  onAgentStatus?: (status: AgentStatus) => void
  onAgentError?: (agentId: string, error: Error) => void
}

export interface ChatAgentsHookReturn {
  availableAgents: AgentStatus[]
  currentAgent: AgentStatus | null
  isLoadingAgents: boolean
  agentError: Error | null
  selectAgent: (agentId: string) => void
  getAgentStatus: (agentId: string) => O.Option<AgentStatus>
  refreshAgentStatus: () => TE.TaskEither<Error, void>
  sendToAgent: (agentId: string, message: string) => TE.TaskEither<ChatError, ChatMessage>
  broadcastToAgents: (message: string) => TE.TaskEither<ChatError, ChatMessage[]>
  getAgentCapabilities: (agentId: string) => TE.TaskEither<Error, string[]>
}

// Chat Attachments Hook Types
export interface ChatAttachmentsHookConfig {
  apiUrl: string
  maxFileSize?: number
  allowedTypes?: string[]
  enableImagePreview?: boolean
  enableAudioPlayback?: boolean
  onUploadStart?: (file: File) => void
  onUploadProgress?: (progress: number) => void
  onUploadComplete?: (attachment: ChatAttachment) => void
  onUploadError?: (error: Error) => void
}

export interface ChatAttachment {
  id: string
  type: 'image' | 'file' | 'audio' | 'video' | 'document'
  name: string
  url: string
  size: number
  mimeType: string
  thumbnail?: string
  metadata?: Record<string, any>
}

export interface ChatAttachmentsHookReturn {
  attachments: ChatAttachment[]
  isUploading: boolean
  uploadProgress: number
  uploadError: Error | null
  uploadFile: (file: File) => TE.TaskEither<Error, ChatAttachment>
  deleteAttachment: (attachmentId: string) => TE.TaskEither<Error, void>
  downloadAttachment: (attachmentId: string) => TE.TaskEither<Error, Blob>
  previewAttachment: (attachmentId: string) => O.Option<string>
  validateFile: (file: File) => E.Either<Error, File>
  clearAttachments: () => void
}

// Chat Commands Hook Types
export interface ChatCommand {
  id: string
  name: string
  description: string
  pattern: RegExp
  category: string
  parameters?: Array<{
    name: string
    type: 'string' | 'number' | 'boolean'
    required: boolean
    description: string
  }>
  handler: (params: Record<string, any>) => TE.TaskEither<Error, string>
}

export interface ChatCommandsHookConfig {
  commands?: ChatCommand[]
  commandPrefix?: string
  enableAutoComplete?: boolean
  onCommandExecute?: (command: ChatCommand, params: Record<string, any>) => void
  onCommandError?: (command: ChatCommand, error: Error) => void
}

export interface ChatCommandsHookReturn {
  commands: ChatCommand[]
  commandPrefix: string
  addCommand: (command: ChatCommand) => void
  removeCommand: (commandId: string) => void
  executeCommand: (input: string) => TE.TaskEither<Error, string>
  parseCommand: (input: string) => O.Option<{ command: ChatCommand; params: Record<string, any> }>
  getCommandSuggestions: (input: string) => ChatCommand[]
  isCommand: (input: string) => boolean
  formatCommandHelp: (commandId?: string) => string
}

// Chat Notifications Hook Types
export interface ChatNotificationConfig {
  enabled: boolean
  showDesktop: boolean
  showInApp: boolean
  soundEnabled: boolean
  soundFile?: string
  vibrationEnabled: boolean
  vibrationPattern?: number[]
}

export interface ChatNotificationsHookReturn {
  config: ChatNotificationConfig
  permission: NotificationPermission
  isSupported: boolean
  updateConfig: (config: Partial<ChatNotificationConfig>) => void
  requestPermission: () => TE.TaskEither<Error, NotificationPermission>
  showNotification: (message: ChatMessage) => TE.TaskEither<Error, void>
  playSound: () => void
  vibrate: () => void
  clearNotifications: () => void
}

// Functional Types for fp-ts Integration
export type ChatTask<T> = TE.TaskEither<ChatError, T>
export type ChatReader<T> = (config: ChatHookConfig) => T
export type ChatValidator<T> = (input: unknown) => E.Either<ChatError, T>
export type ChatTransformer<A, B> = (input: A) => B

// Observable Types for RxJS Integration
export interface ChatStreams {
  messages$: Observable<ChatMessage[]>
  newMessage$: Observable<ChatMessage>
  isConnected$: Observable<boolean>
  isTyping$: Observable<boolean>
  isSending$: Observable<boolean>
  error$: Observable<ChatError | null>
  voiceActivity$: Observable<{ isListening: boolean; isSpeaking: boolean }>
  agentStatus$: Observable<AgentStatus[]>
  notifications$: Observable<ChatMessage>
}

export interface ChatStreamObservableHookReturn {
  streams: ChatStreams
  subscribe: <T>(stream: keyof ChatStreams, callback: (value: T) => void) => () => void
  getLatestValue: <T>(stream: keyof ChatStreams) => O.Option<T>
  combineStreams: <T>(streamNames: Array<keyof ChatStreams>, combiner: (...values: any[]) => T) => Observable<T>
}

// Utility Hook Types
export interface ChatUtilsHookReturn {
  formatMessage: (message: ChatMessage) => string
  parseMarkdown: (content: string) => string
  sanitizeInput: (input: string) => string
  generateMessageId: () => string
  calculateReadTime: (content: string) => number
  extractMentions: (content: string) => string[]
  extractHashtags: (content: string) => string[]
  extractUrls: (content: string) => string[]
  highlightText: (text: string, query: string) => string
  truncateMessage: (content: string, maxLength: number) => string
  validateMessage: (message: ChatMessage) => E.Either<Error, ChatMessage>
}

// Testing Hook Types
export interface ChatTestingHookReturn {
  mockMessage: (content: string, role?: 'user' | 'assistant' | 'system') => ChatMessage
  mockTyping: (duration: number) => void
  mockError: (error: ChatError) => void
  mockDisconnect: () => void
  mockReconnect: () => void
  simulateDelay: (ms: number) => Promise<void>
  getTestMetrics: () => Record<string, any>
  resetTestState: () => void
}