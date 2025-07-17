'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Bot, Mic, Volume2, Copy, Download, Trash2 } from 'lucide-react'
import { cn } from '@lib/utils'

export interface TranscriptMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  confidence?: number
  isInterim?: boolean
  metadata?: {
    audioLevel?: number
    duration?: number
    wordCount?: number
  }
}

export interface TranscriptDisplayProps {
  /** Array of transcript messages */
  messages: TranscriptMessage[]
  /** Current interim (live) transcript */
  interimTranscript?: string
  /** Whether to auto-scroll to bottom */
  autoScroll?: boolean
  /** Maximum number of messages to display */
  maxMessages?: number
  /** Show timestamps */
  showTimestamps?: boolean
  /** Show confidence levels */
  showConfidence?: boolean
  /** Show word count */
  showWordCount?: boolean
  /** Enable markdown rendering */
  enableMarkdown?: boolean
  /** Additional CSS classes */
  className?: string
  /** Callback when a message is selected */
  onMessageSelect?: (message: TranscriptMessage) => void
  /** Callback when transcript is cleared */
  onClear?: () => void
  /** Whether actions (copy, download, clear) are enabled */
  enableActions?: boolean
}

// Simple markdown renderer for basic formatting
const renderMarkdown = (text: string): React.ReactNode => {
  // Basic markdown patterns
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
    { regex: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
    { regex: /`(.*?)`/g, replacement: '<code class="bg-gray-800 px-1 rounded text-sm">$1</code>' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>' }
  ]

  let processed = text
  patterns.forEach(({ regex, replacement }) => {
    processed = processed.replace(regex, replacement)
  })

  return <span dangerouslySetInnerHTML={{ __html: processed }} />
}

export const TranscriptDisplay = React.memo(function TranscriptDisplay({
  messages,
  interimTranscript = '',
  autoScroll = true,
  maxMessages = 100,
  showTimestamps = true,
  showConfidence = false,
  showWordCount = false,
  enableMarkdown = true,
  className = '',
  onMessageSelect,
  onClear,
  enableActions = true
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  // Display only the most recent messages
  const displayMessages = useMemo(() => {
    return messages.slice(-maxMessages)
  }, [messages, maxMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && !isUserScrolling && scrollRef.current) {
      const scrollContainer = scrollRef.current
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [displayMessages, interimTranscript, autoScroll, isUserScrolling])

  // Handle scroll detection
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setIsUserScrolling(!isAtBottom)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // Copy transcript to clipboard
  const handleCopy = async () => {
    const text = displayMessages
      .map(msg => `[${msg.type.toUpperCase()}] ${msg.content}`)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy transcript:', error)
    }
  }

  // Download transcript as text file
  const handleDownload = () => {
    const text = displayMessages
      .map(msg => {
        const timestamp = msg.timestamp.toLocaleString()
        const confidence = msg.confidence ? ` (${Math.round(msg.confidence * 100)}%)` : ''
        return `[${timestamp}] ${msg.type.toUpperCase()}${confidence}: ${msg.content}`
      })
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleMessageClick = (message: TranscriptMessage) => {
    setSelectedMessage(selectedMessage === message.id ? null : message.id)
    onMessageSelect?.(message)
  }

  const getMessageIcon = (type: TranscriptMessage['type']) => {
    switch (type) {
      case 'user':
        return <Mic className="w-4 h-4" />
      case 'ai':
        return <Bot className="w-4 h-4" />
      default:
        return <Volume2 className="w-4 h-4" />
    }
  }

  const getMessageStyle = (type: TranscriptMessage['type']) => {
    switch (type) {
      case 'user':
        return {
          container: 'bg-blue-900/30 border-blue-500/30',
          icon: 'text-blue-400 bg-blue-500/20',
          text: 'text-blue-100'
        }
      case 'ai':
        return {
          container: 'bg-green-900/30 border-green-500/30',
          icon: 'text-green-400 bg-green-500/20',
          text: 'text-green-100'
        }
      default:
        return {
          container: 'bg-gray-900/30 border-gray-500/30',
          icon: 'text-gray-400 bg-gray-500/20',
          text: 'text-gray-100'
        }
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with actions */}
      {enableActions && (
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">
              Transcript ({displayMessages.length})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              disabled={displayMessages.length === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy transcript"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={displayMessages.length === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download transcript"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClear}
              disabled={displayMessages.length === 0}
              className="p-1.5 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear transcript"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Messages container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        <AnimatePresence initial={false}>
          {displayMessages.map((message, index) => {
            const style = getMessageStyle(message.type)
            const isSelected = selectedMessage === message.id
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => handleMessageClick(message)}
                className={cn(
                  'relative p-3 rounded-lg border cursor-pointer transition-all duration-200',
                  style.container,
                  isSelected && 'ring-2 ring-blue-500/50',
                  'hover:scale-[1.02] hover:shadow-lg'
                )}
              >
                {/* Message header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full',
                    style.icon
                  )}>
                    {getMessageIcon(message.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', style.text)}>
                        {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI' : 'System'}
                      </span>
                      
                      {showTimestamps && (
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                      
                      {showConfidence && message.confidence && (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          message.confidence > 0.8 ? 'bg-green-900/50 text-green-300' :
                          message.confidence > 0.6 ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        )}>
                          {Math.round(message.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    
                    {showWordCount && message.metadata?.wordCount && (
                      <div className="text-xs text-gray-500">
                        {message.metadata.wordCount} words
                      </div>
                    )}
                  </div>
                </div>

                {/* Message content */}
                <div className={cn('text-sm leading-relaxed', style.text)}>
                  {enableMarkdown ? renderMarkdown(message.content) : message.content}
                </div>

                {/* Interim indicator */}
                {message.isInterim && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full"
                  />
                )}
              </motion.div>
            )
          })}

          {/* Interim transcript */}
          {interimTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-3 rounded-lg border border-yellow-500/30 bg-yellow-900/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400">
                  <Mic className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-yellow-300">
                  Listening...
                </span>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-yellow-500 rounded-full"
                />
              </div>
              
              <div className="text-sm text-yellow-100 italic">
                {interimTranscript}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {displayMessages.length === 0 && !interimTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Volume2 className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">
              No transcript available yet
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Start a voice conversation to see the transcript here
            </p>
          </motion.div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {isUserScrolling && displayMessages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              setIsUserScrolling(false)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            className="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
})

export default TranscriptDisplay