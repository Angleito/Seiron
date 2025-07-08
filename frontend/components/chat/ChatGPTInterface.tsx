'use client'

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Send, Loader2, Sparkles, User } from 'lucide-react'
import { cn } from '@lib/utils'
import { SeironImage } from '@components/SeironImage'
import '@/styles/chatgpt-anime.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface ChatGPTInterfaceProps {
  onNewMessage?: (message: Message) => void
  onUserMessage?: (message: Message) => void
  className?: string
  initialMessages?: Message[]
}

export interface ChatGPTInterfaceRef {
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: Message) => void
}

export const ChatGPTInterface = forwardRef<ChatGPTInterfaceRef, ChatGPTInterfaceProps>(
  ({ onNewMessage, onUserMessage, className, initialMessages }, ref) => {
    const [messages, setMessages] = useState<Message[]>(
      initialMessages || [
        {
          id: '1',
          role: 'assistant',
          content: "Greetings! I am Seiron, the legendary Dragon of Financial Wisdom. My power level is over 9000! What investment strategies shall we explore today?",
          timestamp: new Date()
        }
      ]
    )
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showTypingIndicator, setShowTypingIndicator] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [input])

    const generateMessageId = () => {
      return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    const addMessage = useCallback((message: Message) => {
      setMessages(prev => [...prev, message])
      onNewMessage?.(message)
    }, [onNewMessage])

    const handleSendMessage = useCallback(async () => {
      if (!input.trim() || isLoading) return

      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: input.trim(),
        timestamp: new Date()
      }

      // Add user message
      addMessage(userMessage)
      onUserMessage?.(userMessage)
      
      // Clear input
      setInput('')
      
      // Show loading state
      setIsLoading(true)
      setShowTypingIndicator(true)

      try {
        // Make actual API call to orchestrate endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/orchestrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: `session_${Date.now()}`,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        })

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.success || !data.data?.response) {
          throw new Error('Invalid response format')
        }

        const aiMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date()
        }
        
        setShowTypingIndicator(false)
        addMessage(aiMessage)
      } catch (error) {
        console.error('Error sending message:', error)
        setShowTypingIndicator(false)
        
        // Add error message
        const errorMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "My apologies, young warrior! There seems to be a disturbance in the digital realm. Please try again in a moment. 🐉",
          timestamp: new Date()
        }
        addMessage(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }, [input, isLoading, addMessage, onUserMessage, messages])


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    // Send message directly without using input state
    const sendMessageDirect = useCallback(async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date()
      }

      // Add user message
      addMessage(userMessage)
      onUserMessage?.(userMessage)
      
      // Show loading state
      setIsLoading(true)
      setShowTypingIndicator(true)

      try {
        // Make actual API call to orchestrate endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/orchestrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: `session_${Date.now()}`,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        })

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.success || !data.data?.response) {
          throw new Error('Invalid response format')
        }

        const aiMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date()
        }
        
        setShowTypingIndicator(false)
        addMessage(aiMessage)
      } catch (error) {
        console.error('Error sending message:', error)
        setShowTypingIndicator(false)
        
        // Add error message
        const errorMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "My apologies, young warrior! There seems to be a disturbance in the digital realm. Please try again in a moment. 🐉",
          timestamp: new Date()
        }
        addMessage(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }, [isLoading, addMessage, onUserMessage, messages])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      sendMessage: sendMessageDirect,
      addMessage
    }), [sendMessageDirect, addMessage])

    return (
      <div className={cn('chatgpt-anime-container', className)}>
        {/* Messages Area */}
        <div className="chatgpt-messages-container" ref={messagesContainerRef}>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn('chatgpt-message', message.role, {
                'new-message': index === messages.length - 1
              })}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Avatar */}
              <div className={cn('chatgpt-avatar', message.role)}>
                {message.role === 'user' ? (
                  <User className="w-6 h-6 text-white m-auto mt-2" />
                ) : (
                  <SeironImage 
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div className={cn('chatgpt-bubble', message.role)}>
                <p>{message.content}</p>
                {message.role === 'assistant' && (
                  <span className="chatgpt-power-level">
                    Power: {9000 + Math.floor(Math.random() * 1000)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {showTypingIndicator && (
            <div className="chatgpt-message ai">
              <div className="chatgpt-avatar ai">
                <SeironImage 
                  variant="icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="chatgpt-typing-indicator">
                <div className="dragon-ball"></div>
                <div className="dragon-ball"></div>
                <div className="dragon-ball"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chatgpt-input-area">
          <div className="chatgpt-input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Channel your ki and ask Seiron..."
              className="chatgpt-input"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="chatgpt-send-button"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }
)

ChatGPTInterface.displayName = 'ChatGPTInterface'