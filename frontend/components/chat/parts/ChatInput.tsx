'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Send, Sparkles, Zap, CircleDot } from 'lucide-react'
import { safeDebug, safeInfo, safeWarn } from '@lib/logger'
import { cn } from '@lib/utils'

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
  sessionId?: string
  maxRows?: number
  showPowerLevel?: boolean
}

// Kamehameha charging effect component
const KamehamehaCharge: React.FC<{ isCharging: boolean; chargeLevel: number }> = ({ isCharging, chargeLevel }) => {
  if (!isCharging) return null

  return (
    <div className="absolute -top-12 right-0 flex items-center gap-2">
      <div className="relative">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                i < Math.floor(chargeLevel / 20)
                  ? "bg-blue-400 shadow-lg shadow-blue-400/50"
                  : "bg-gray-700"
              )}
            />
          ))}
        </div>
        {chargeLevel > 80 && (
          <div className="absolute -inset-2 bg-blue-400/20 blur-xl animate-pulse rounded-full" />
        )}
      </div>
      <span className="text-xs text-blue-400 font-mono">
        {chargeLevel}% {chargeLevel > 80 && "かめはめ波!"}
      </span>
    </div>
  )
}

export const ChatInput = React.memo(function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  disabled = false,
  placeholder = "Type your message... (Enter to send, Shift+Enter for new line)",
  sessionId,
  maxRows = 5,
  showPowerLevel = true
}: ChatInputProps) {
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null)
  const [inputStartTime, setInputStartTime] = useState<number | null>(null)
  const [keystrokeCount, setKeystrokeCount] = useState(0)
  const [lastInputLength, setLastInputLength] = useState(0)
  const [isCharging, setIsCharging] = useState(false)
  const [chargeLevel, setChargeLevel] = useState(0)
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chargeTimerRef = useRef<NodeJS.Timeout | null>(null)
  
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
      if (chargeTimerRef.current) {
        clearInterval(chargeTimerRef.current)
      }
    }
  }, [])

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight)
      const newRows = Math.min(Math.ceil(scrollHeight / lineHeight), maxRows)
      setRows(newRows)
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }, [input, maxRows])

  // Kamehameha charging effect when holding send button
  const startCharging = useCallback(() => {
    setIsCharging(true)
    setChargeLevel(0)
    
    chargeTimerRef.current = setInterval(() => {
      setChargeLevel(prev => {
        if (prev >= 100) {
          return 100
        }
        return prev + 5
      })
    }, 50)
  }, [])

  const stopCharging = useCallback(() => {
    setIsCharging(false)
    if (chargeTimerRef.current) {
      clearInterval(chargeTimerRef.current)
    }
    
    // If fully charged, add special effect to message
    if (chargeLevel >= 100) {
      safeInfo('Kamehameha fully charged!', {
        sessionId,
        chargeLevel
      })
    }
    
    setChargeLevel(0)
  }, [chargeLevel, sessionId])
  
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
    <div className="relative border-t border-gray-800 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-sm">
      {/* Anime-style energy field effect when focused */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300 pointer-events-none",
        focusStartTime ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      </div>

      <div className="relative p-4">
        {/* Kamehameha charge indicator */}
        <KamehamehaCharge isCharging={isCharging} chargeLevel={chargeLevel} />
        
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
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
              className={cn(
                "w-full resize-none rounded-xl border bg-gray-900/80 backdrop-blur-sm px-4 py-3",
                "text-gray-100 placeholder-gray-500",
                "transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
                "hover:border-gray-600",
                focusStartTime ? "border-gray-700 shadow-lg shadow-blue-500/10" : "border-gray-800",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={rows}
              disabled={disabled}
              style={{
                minHeight: '52px',
                maxHeight: `${maxRows * 24 + 28}px`,
                overflowY: rows >= maxRows ? 'auto' : 'hidden'
              }}
            />
            
            {/* Power level indicator */}
            {showPowerLevel && input.length > 0 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 pointer-events-none">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {Math.min(100, Math.round((input.length / 500) * 100))}%
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSendClick}
            onMouseDown={startCharging}
            onMouseUp={stopCharging}
            onMouseLeave={stopCharging}
            disabled={!input.trim() || isLoading || disabled}
            onMouseEnter={() => {
              safeDebug('Send button hovered', {
                sessionId,
                inputLength: input.length,
                canSend: !disabled && !isLoading && input.trim().length > 0
              })
            }}
            className={cn(
              "relative group rounded-xl px-5 py-3 font-medium transition-all duration-300",
              "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
              "text-white shadow-lg hover:shadow-blue-500/25",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
              "active:scale-95 transform-gpu",
              isCharging && "animate-pulse"
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span className="text-sm">送信中...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">送信</span>
                </>
              )}
            </span>
            
            {/* Kamehameha energy effect */}
            {isCharging && (
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
              </div>
            )}
            
            {/* Hover effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 to-cyan-400/0 group-hover:from-blue-400/10 group-hover:to-cyan-400/10 transition-all duration-300" />
          </button>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>Enter 送信</span>
            <span>Shift+Enter 改行</span>
            {showPowerLevel && (
              <span className="flex items-center gap-1">
                <CircleDot className="h-3 w-3" />
                長押しでパワーチャージ
              </span>
            )}
          </div>
          
          {/* Input analytics for development */}
          {process.env.NODE_ENV === 'development' && keystrokeCount > 0 && (
            <div className="flex items-center gap-2">
              <span>Keystrokes: {keystrokeCount}</span>
              {inputStartTime && (
                <span>Time: {((Date.now() - inputStartTime) / 1000).toFixed(1)}s</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})