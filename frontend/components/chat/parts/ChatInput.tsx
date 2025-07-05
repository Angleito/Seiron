'use client'

import React, { useCallback } from 'react'
import { Send, Sparkles } from 'lucide-react'

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
}

export const ChatInput = React.memo(function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  disabled = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }, [onSend])

  return (
    <div className="border-t border-red-800 p-4 bg-gradient-to-r from-gray-900 to-black">
      <div className="flex space-x-2">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-red-700 bg-gray-900 text-red-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isLoading || disabled}
          className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 animate-spin" />
          Processing...
        </div>
      )}
    </div>
  )
})