'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { safeDebug, safeInfo, safeWarn } from '@lib/logger'

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
  sessionId?: string
}

export const ChatInput = React.memo(function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  disabled = false,
  placeholder = "Type your message...",
  sessionId
}: ChatInputProps) {
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null)
  const [inputStartTime, setInputStartTime] = useState<number | null>(null)
  const [keystrokeCount, setKeystrokeCount] = useState(0)
  const [lastInputLength, setLastInputLength] = useState(0)
  
  // Log component mount
  useEffect(() => {
    safeDebug('ChatInput component mounted', {
      sessionId,
      placeholder,
      isDisabled: disabled,
      isLoading
    })
    
    return () => {
      safeDebug('ChatInput component unmounted', { sessionId })
    }
  }, [])
  
  // Track input changes for analytics
  useEffect(() => {
    const currentLength = input.length
    const lengthDifference = currentLength - lastInputLength
    
    if (lengthDifference !== 0) {
      setKeystrokeCount(prev => prev + Math.abs(lengthDifference))
      
      if (currentLength === 0 && lastInputLength > 0) {
        safeDebug('Input cleared', {
          sessionId,
          previousLength: lastInputLength,
          keystrokeCount
        })
      }
    }
    
    setLastInputLength(currentLength)
  }, [input, lastInputLength, keystrokeCount, sessionId])
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    safeDebug('Key pressed in input', {
      sessionId,
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      inputLength: input.length,
      keystrokeCount
    })
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      const timeSinceInputStart = inputStartTime ? Date.now() - inputStartTime : null
      
      safeInfo('User triggered send via Enter key', {
        sessionId,
        inputLength: input.length,
        keystrokeCount,
        timeSinceInputStart,
        isLoading,
        disabled
      })
      
      if (!disabled && !isLoading && input.trim()) {
        onSend()
        // Reset input tracking
        setKeystrokeCount(0)
        setInputStartTime(null)
      } else {
        safeWarn('Send blocked via Enter key', {
          sessionId,
          reason: disabled ? 'disabled' : isLoading ? 'loading' : 'empty input',
          inputLength: input.length
        })
      }
    }
  }, [onSend, sessionId, input, keystrokeCount, inputStartTime, isLoading, disabled])
  
  const handleInputChange = useCallback((value: string) => {
    // Start timing if this is the first input
    if (!inputStartTime && value.length > 0) {
      setInputStartTime(Date.now())
      safeDebug('Input session started', {
        sessionId,
        firstCharacter: value[0]
      })
    }
    
    // Track significant input changes
    const lengthDifference = value.length - input.length
    if (Math.abs(lengthDifference) > 5) {
      safeDebug('Significant input change detected', {
        sessionId,
        previousLength: input.length,
        newLength: value.length,
        difference: lengthDifference,
        isPaste: lengthDifference > 10
      })
    }
    
    onInputChange(value)
  }, [onInputChange, sessionId, input.length, inputStartTime])
  
  const handleSendClick = useCallback(() => {
    const timeSinceInputStart = inputStartTime ? Date.now() - inputStartTime : null
    const timeSinceFocus = focusStartTime ? Date.now() - focusStartTime : null
    
    safeInfo('User clicked send button', {
      sessionId,
      inputLength: input.length,
      keystrokeCount,
      timeSinceInputStart,
      timeSinceFocus,
      isLoading,
      disabled
    })
    
    if (!disabled && !isLoading && input.trim()) {
      onSend()
      // Reset input tracking
      setKeystrokeCount(0)
      setInputStartTime(null)
    } else {
      safeWarn('Send blocked via button click', {
        sessionId,
        reason: disabled ? 'disabled' : isLoading ? 'loading' : 'empty input',
        inputLength: input.length
      })
    }
  }, [onSend, sessionId, input, keystrokeCount, inputStartTime, focusStartTime, isLoading, disabled])
  
  const handleFocus = useCallback(() => {
    setFocusStartTime(Date.now())
    safeDebug('Input focused', {
      sessionId,
      inputLength: input.length,
      keystrokeCount
    })
  }, [sessionId, input.length, keystrokeCount])
  
  const handleBlur = useCallback(() => {
    const focusTime = focusStartTime ? Date.now() - focusStartTime : null
    
    safeDebug('Input blurred', {
      sessionId,
      inputLength: input.length,
      keystrokeCount,
      focusTime,
      hasContent: input.trim().length > 0
    })
    
    setFocusStartTime(null)
  }, [sessionId, input.length, keystrokeCount, focusStartTime])

  return (
    <div className="border-t border-red-800 p-4 bg-gradient-to-r from-gray-900 to-black">
      <div className="flex space-x-2">
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={(e) => {
            safeDebug('Content pasted into input', {
              sessionId,
              pasteLength: e.clipboardData.getData('text').length,
              currentInputLength: input.length
            })
          }}
          onCut={(_e) => {
            safeDebug('Content cut from input', {
              sessionId,
              currentInputLength: input.length
            })
          }}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-red-700 bg-gray-900 text-red-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={handleSendClick}
          disabled={!input.trim() || isLoading || disabled}
          onMouseEnter={() => {
            safeDebug('Send button hovered', {
              sessionId,
              inputLength: input.length,
              canSend: !disabled && !isLoading && input.trim().length > 0
            })
          }}
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
      
      {/* Input analytics for development */}
      {process.env.NODE_ENV === 'development' && keystrokeCount > 0 && (
        <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
          <span>Keystrokes: {keystrokeCount}</span>
          {inputStartTime && (
            <span>Time: {((Date.now() - inputStartTime) / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}
    </div>
  )
})