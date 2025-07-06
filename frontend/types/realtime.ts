import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Database Table Types
export interface ChatMessage {
  id: string
  session_id: string
  user_id: string | null
  content: string
  role: 'user' | 'assistant' | 'system'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  status: 'sending' | 'delivered' | 'failed' | 'error'
  message_type: 'text' | 'voice' | 'adapter_action'
}

export interface ChatSession {
  id: string
  user_id: string | null
  title: string | null
  status: 'active' | 'inactive' | 'archived'
  last_activity: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface UserPresence {
  user_id: string
  session_id: string
  status: 'online' | 'away' | 'offline'
  last_seen: string
  is_typing: boolean
  typing_in_session: string | null
  metadata: Record<string, any>
}

export interface CryptoPrice {
  id: string
  symbol: string
  price: number
  change_24h: number
  change_percentage_24h: number
  market_cap: number
  volume_24h: number
  last_updated: string
}

// Real-time Event Types
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimePayload<T = any> {
  new: T
  old: T
  eventType: RealtimeEvent
  schema: string
  table: string
  commit_timestamp: string
  // Include common fields from RealtimePostgresChangesPayload
  errors: string[] | null
  columns?: Record<string, string>
}

// Subscription Options
export interface RealtimeSubscriptionOptions {
  table: string
  schema?: string
  filter?: string
  event?: RealtimeEvent | RealtimeEvent[]
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  onInsert?: (payload: RealtimePayload) => void
  onUpdate?: (payload: RealtimePayload) => void
  onDelete?: (payload: RealtimePayload) => void
  onChange?: (payload: RealtimePayload) => void
}

// Connection Status
export interface RealtimeConnectionStatus {
  isConnected: boolean
  connectionState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'
  lastHeartbeat: number
  reconnectAttempts: number
  subscriptions: string[]
  error: Error | null
}

// Typing Indicator
export interface TypingIndicator {
  user_id: string
  session_id: string
  is_typing: boolean
  started_at: string
  expires_at: string
}

// Presence State
export interface PresenceState {
  user_id: string
  session_id: string
  status: 'online' | 'away' | 'offline'
  last_seen: string
  metadata: Record<string, any>
}

// Price Update
export interface PriceUpdate extends CryptoPrice {
  timestamp: string
  source: string
}

// Hook Return Types
export interface UseRealtimeMessagesResult {
  messages: ChatMessage[]
  loading: boolean
  error: Error | null
  sendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>
  updateMessage: (id: string, updates: Partial<ChatMessage>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  clearMessages: () => void
}

export interface UseRealtimeSessionResult {
  session: ChatSession | null
  loading: boolean
  error: Error | null
  updateSession: (updates: Partial<ChatSession>) => Promise<void>
  archiveSession: () => Promise<void>
  createSession: (title?: string) => Promise<ChatSession>
}

export interface UseRealtimePresenceResult {
  presence: PresenceState[]
  typingIndicators: TypingIndicator[]
  myPresence: PresenceState | null
  isOnline: boolean
  setTyping: (isTyping: boolean) => void
  setStatus: (status: 'online' | 'away' | 'offline') => void
  updatePresence: (metadata: Record<string, any>) => void
}

export interface UseRealtimePricesResult {
  prices: Record<string, CryptoPrice>
  loading: boolean
  error: Error | null
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
  getPrice: (symbol: string) => CryptoPrice | null
}

export interface UseRealtimeConnectionResult {
  connectionStatus: RealtimeConnectionStatus
  isConnected: boolean
  reconnect: () => void
  disconnect: () => void
  getChannelStatus: (channelName: string) => string | null
}

// Event Handler Types
export type MessageEventHandler = (payload: RealtimePayload<ChatMessage>) => void
export type SessionEventHandler = (payload: RealtimePayload<ChatSession>) => void
export type PresenceEventHandler = (payload: RealtimePayload<UserPresence>) => void
export type PriceEventHandler = (payload: RealtimePayload<CryptoPrice>) => void

// Configuration
export interface RealtimeConfig {
  enableMessages: boolean
  enableSessions: boolean
  enablePresence: boolean
  enablePrices: boolean
  reconnectInterval: number
  presenceTimeout: number
  typingTimeout: number
  heartbeatInterval: number
}

export const defaultRealtimeConfig: RealtimeConfig = {
  enableMessages: true,
  enableSessions: true,
  enablePresence: true,
  enablePrices: true,
  reconnectInterval: 5000,
  presenceTimeout: 30000,
  typingTimeout: 3000,
  heartbeatInterval: 30000,
}

// Type aliases for consistency with component usage
export type RealtimeMessage = ChatMessage
export type RealtimePresence = PresenceState
export type RealtimePrice = CryptoPrice
export type ConnectionStatus = RealtimeConnectionStatus
export type RealtimeChannelStatus = 'subscribing' | 'subscribed' | 'unsubscribing' | 'unsubscribed' | 'error'
export type RealtimeChannelState = {
  status: RealtimeChannelStatus
  error?: Error | null
}