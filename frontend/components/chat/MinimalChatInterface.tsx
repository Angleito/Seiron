'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Plus, Sparkles } from 'lucide-react'
import { cn } from '@lib/utils'
import { SeironImage } from '@components/SeironImage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

export function MinimalChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Greetings, mortal! I am Seiron, the Dragon of Financial Wisdom. I possess legendary powers to grant your wildest investment wishes. What treasures do you seek today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    
    setMessages(prev => [...prev, loadingMessage])

    // Simulate API call
    setTimeout(() => {
      const dragonResponses = [
        "By the power of the eternal dragon, I shall analyze your request with mystical precision...",
        "Your wish resonates with ancient dragon wisdom. Let me consult the sacred scrolls of the market...",
        "The dragon's eyes see great potential in your query. Allow me to channel the power of a thousand suns...",
        "*Dragon fire intensifies* Your financial destiny awaits, mortal!"
      ]
      
      const response = dragonResponses[Math.floor(Math.random() * dragonResponses.length)]
      
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: response, isLoading: false }
          : msg
      ))
      setIsLoading(false)
    }, 1500)
  }, [input, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "mb-6 flex gap-4",
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {message.role === 'assistant' ? (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <span className="text-lg">🐉</span>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-300">You</span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className={cn(
                "flex-1 max-w-[85%]",
                message.role === 'user' ? 'text-right' : ''
              )}>
                <div className={cn(
                  "inline-block px-4 py-3 rounded-2xl",
                  message.role === 'user' 
                    ? 'bg-red-900/30 text-gray-100 border border-red-800/50' 
                    : 'bg-gray-800/50 text-gray-100'
                )}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      <span className="text-gray-400">Channeling dragon wisdom...</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak your wish to the eternal dragon..."
                className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl 
                         text-gray-100 placeholder-gray-500 resize-none focus:outline-none 
                         focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 
                         transition-all duration-200 min-h-[52px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              
              {/* Dragon Power Indicator */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-xs text-orange-400">9000</span>
              </div>
            </div>
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Helper Text */}
          <p className="mt-2 text-xs text-gray-500 text-center">
            The dragon listens to your every wish • Press Enter to send
          </p>
        </form>
      </div>

      {/* Subtle Watermark */}
      <SeironImage 
        variant="watermark"
        className="fixed bottom-20 right-8 pointer-events-none opacity-[0.02]"
        enableMysticalEffects={false}
      />
    </div>
  )
}