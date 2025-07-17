/**
 * Chat Components Index
 * 
 * This file provides clean exports for all chat-related components
 * in the Next.js 15 App Router structure.
 * 
 * @fileoverview Centralized exports for chat components
 */

// Main chat components
export { VoiceChat } from './voice-chat'
export { VoiceButton } from './VoiceButton'
export { ChatInput } from './chat-input'

// Re-export types for external use
export type { VoiceButtonProps, VoiceState } from './VoiceButton'
export type { VoiceChatConfig, ChatMessage, ConnectionStatus } from '../../../hooks/chat/useVoiceChat'

// Default exports
export { default as VoiceChatDefault } from './voice-chat'
export { default as VoiceButtonDefault } from './VoiceButton'
export { default as ChatInputDefault } from './chat-input'