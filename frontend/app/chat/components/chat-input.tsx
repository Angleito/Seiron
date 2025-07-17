/**
 * Chat Input Component for Sei Investment Platform
 * 
 * This component provides a fallback text input for the voice chat interface.
 * It serves as backup when voice features are unavailable and supports
 * keyboard shortcuts and accessibility features.
 * 
 * Features:
 * - Responsive text input with auto-resize
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Character and word count display
 * - Dragon Ball Z themed styling
 * - Accessibility support with ARIA labels
 * - Integration with voice system
 * 
 * @fileoverview Chat text input component with voice integration
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Props interface for the chat input component
 */
interface ChatInputProps {
  readonly onSendMessage: (message: string) => void
  readonly onVoiceToggle?: () => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly isVoiceActive?: boolean
  readonly maxLength?: number
  readonly showWordCount?: boolean
  readonly className?: string
}

/**
 * Chat Input Component
 * 
 * Provides text input functionality for the voice chat interface with
 * Dragon Ball Z theming and accessibility features.
 * 
 * @param onSendMessage - Callback when message is sent
 * @param onVoiceToggle - Optional callback to toggle voice input
 * @param placeholder - Input placeholder text
 * @param disabled - Whether input is disabled
 * @param isVoiceActive - Whether voice input is currently active
 * @param maxLength - Maximum character length (default: 1000)
 * @param showWordCount - Whether to show character/word count
 * @param className - Additional CSS classes
 */
export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  onSendMessage,
  onVoiceToggle,
  placeholder = "Type your message or use voice input...",
  disabled = false,
  isVoiceActive = false,
  maxLength = 1000,
  showWordCount = true,
  className
}) => {
  const [message, setMessage] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  // Character and word counts
  const characterCount = message.length
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0
  const isNearLimit = characterCount > maxLength * 0.8
  const isOverLimit = characterCount > maxLength

  /**
   * Handle message sending
   */
  const handleSendMessage = React.useCallback(() => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !disabled && !isOverLimit) {
      onSendMessage(trimmedMessage)
      setMessage('')
      
      // Refocus textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }, [message, disabled, isOverLimit, onSendMessage])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter for new line - allow default behavior
        return
      } else {
        // Enter to send message
        e.preventDefault()
        handleSendMessage()
      }
    }
  }, [handleSendMessage])

  /**
   * Handle input change
   */
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setMessage(newValue)
    }
  }, [maxLength])

  /**
   * Handle voice toggle
   */
  const handleVoiceToggle = React.useCallback(() => {
    onVoiceToggle?.()
  }, [onVoiceToggle])

  return (
    <div className={cn('relative', className)}>
      {/* Main Input Container */}
      <div className={cn(
        'relative flex items-end space-x-3 p-4 rounded-xl border transition-all duration-200',
        'bg-gray-800/50 backdrop-blur-sm',
        isFocused 
          ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
          : 'border-gray-600 hover:border-gray-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {/* Voice Toggle Button */}
        {onVoiceToggle && (
          <motion.button
            onClick={handleVoiceToggle}
            disabled={disabled}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/30',
              isVoiceActive
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
              disabled && 'cursor-not-allowed'
            )}
            aria-label={isVoiceActive ? 'Disable voice input' : 'Enable voice input'}
          >
            {isVoiceActive ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </motion.button>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none border-0 bg-transparent text-gray-100 placeholder-gray-400',
              'focus:outline-none focus:ring-0',
              'scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent',
              disabled && 'cursor-not-allowed'
            )}
            style={{
              minHeight: '24px',
              maxHeight: '120px'
            }}
            aria-label="Type your message"
            aria-describedby={showWordCount ? 'word-count' : undefined}
          />

          {/* Character Limit Warning */}
          <AnimatePresence>
            {isNearLimit && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'absolute -top-8 right-0 text-xs px-2 py-1 rounded',
                  isOverLimit 
                    ? 'bg-red-600 text-white' 
                    : 'bg-yellow-600 text-white'
                )}
              >
                {maxLength - characterCount} characters remaining
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Send Button */}
        <motion.button
          onClick={handleSendMessage}
          disabled={disabled || !message.trim() || isOverLimit}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/30',
            message.trim() && !isOverLimit && !disabled
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed',
          )}
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Word Count and Shortcuts */}
      {showWordCount && (
        <div className="flex justify-between items-center mt-2 px-4 text-xs text-gray-500">
          <div className="flex space-x-4">
            <span id="word-count">
              {wordCount} {wordCount === 1 ? 'word' : 'words'} • {characterCount}/{maxLength} characters
            </span>
          </div>
          <div className="flex space-x-2">
            <span>Enter to send</span>
            <span>•</span>
            <span>Shift+Enter for new line</span>
          </div>
        </div>
      )}

      {/* Dragon Power Status */}
      <AnimatePresence>
        {message.length > 50 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 left-4 flex items-center space-x-2 px-3 py-1 bg-orange-600/20 border border-orange-500/30 rounded-lg text-orange-300 text-xs"
          >
            <span>🐉</span>
            <span>Dragon Power Activated!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'

export default ChatInput