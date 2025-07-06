'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentMessage, AgentStreamEvent } from '@/types/agent'
import { getOrchestrator } from '@/lib/orchestrator-client'

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export function ChatInterface() {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      type: 'agent',
      agentType: 'portfolio_agent',
      content: 'Greetings, mortal! I am Seiron, the Dragon of Financial Wisdom. I possess the power to manage your digital treasures, execute mystical trades, provide ancient market insights, and grant your investing wishes. What fortune do you seek today?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(generateSessionId())
  const [connectedAgents, setConnectedAgents] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const orchestrator = getOrchestrator({
      apiEndpoint: process.env.NEXT_PUBLIC_ORCHESTRATOR_API || '/api',
      wsEndpoint: process.env.NEXT_PUBLIC_ORCHESTRATOR_WS || 'ws://localhost:3001',
    })

    // Connect WebSocket for real-time updates
    orchestrator.connectWebSocket(sessionId)

    // Subscribe to agent events
    const unsubscribeStatus = orchestrator.on('status', (event: AgentStreamEvent) => {
      if (event.type === 'status' && event.data) {
        const statusData = event.data as { status: string; message?: string }
        if (statusData.message) {
          addSystemMessage(`🐉 ${event.agentType?.replace('_', ' ').replace('agent', 'dragon')}: ${statusData.message}`)
        }
        if (statusData.status === 'connected') {
          setConnectedAgents(prev => new Set(prev).add(event.agentId))
        }
      }
    })

    const unsubscribeProgress = orchestrator.on('progress', (event: AgentStreamEvent) => {
      if (event.type === 'progress' && event.data) {
        const progressData = event.data as { message: string }
        addSystemMessage(`🐉 ${event.agentType?.replace('_', ' ').replace('agent', 'dragon')} is conjuring magic: ${progressData.message}`)
      }
    })

    return () => {
      unsubscribeStatus()
      unsubscribeProgress()
      orchestrator.disconnectWebSocket()
    }
  }, [sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addSystemMessage = (content: string) => {
    const systemMessage: AgentMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, systemMessage])
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        const errorMessage: AgentMessage = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          agentType: 'portfolio_agent',
          content: data.message || 'The mystical energies are disrupted. Allow me to recalibrate and try again.',
          timestamp: new Date(),
          metadata: {
            error: true,
          },
        }
        setMessages(prev => [...prev, errorMessage])
      } else {
        const assistantMessage: AgentMessage = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          agentType: data.agentType,
          content: data.message,
          timestamp: new Date(),
          metadata: {
            intent: data.metadata?.intent,
            action: data.metadata?.action,
            confidence: data.metadata?.confidence,
            taskId: data.taskId,
            executionTime: data.executionTime,
          },
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'The connection to the Dragon Realm has been severed. Check your mystical conduits and try summoning again.',
        timestamp: new Date(),
        metadata: {
          error: true,
        },
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'lending_agent':
        return '🐉'
      case 'liquidity_agent':
        return '🐲'
      case 'portfolio_agent':
        return '🔥'
      case 'risk_agent':
        return '🛡️'
      case 'analysis_agent':
        return '🔮'
      default:
        return '🐉'
    }
  }

  const getPowerLevel = (confidence?: number) => {
    if (!confidence) return ''
    const level = Math.floor(confidence * 7) + 1
    return '⭐'.repeat(level)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-950 to-black"
         style={{
           backgroundImage: `
             radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
             radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
             radial-gradient(circle at 40% 40%, rgba(220, 38, 38, 0.05) 0%, transparent 50%)
           `
         }}>
      {/* Connected Dragons Indicator */}
      {connectedAgents.size > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Dragon Legion Active: {Array.from(connectedAgents).map(agent => agent.replace('_', ' ').replace('agent', 'dragon')).join(', ')}
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[70%] rounded-lg px-4 py-2 border',
                message.type === 'user'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-800 shadow-lg'
                  : message.type === 'system'
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 italic border-gray-700 shadow-md'
                  : message.metadata?.error
                  ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 border-red-300 shadow-md'
                  : 'bg-gradient-to-r from-gray-900 to-black text-red-100 border-red-800 shadow-lg relative overflow-hidden'
              )}
              style={message.type === 'agent' && !message.metadata?.error ? {
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 50%, #1a1a1a 100%)',
                boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backgroundImage: `
                  radial-gradient(circle at 10% 20%, rgba(220, 38, 38, 0.1) 0%, transparent 20%),
                  radial-gradient(circle at 80% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 20%)
                `
              } : {}}
            >
              {message.type === 'agent' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl animate-pulse">{getAgentIcon(message.agentType)}</span>
                  <span className="text-xs font-bold text-red-300 tracking-wide">
                    {message.agentType?.replace('_', ' ').replace('AGENT', 'DRAGON').toUpperCase()}
                  </span>
                  {message.metadata?.confidence && (
                    <span className="text-xs text-yellow-400 ml-2">
                      {getPowerLevel(message.metadata.confidence)}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div className="flex items-center gap-4 mt-1">
                <p
                  className={cn(
                    'text-xs',
                    message.type === 'user'
                      ? 'text-red-200'
                      : message.type === 'agent'
                      ? 'text-red-400'
                      : 'text-gray-500'
                  )}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
                {message.metadata?.executionTime && (
                  <p className="text-xs text-red-400">
                    ⚡ {(message.metadata.executionTime / 1000).toFixed(2)}s
                  </p>
                )}
                {message.metadata?.confidence && (
                  <p className="text-xs text-yellow-400 font-bold">
                    🔥 {Math.round(message.metadata.confidence * 100)}% Power Level
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg px-4 py-2 border border-red-800 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="text-2xl animate-bounce">🐉</div>
                <Sparkles className="h-4 w-4 animate-spin text-red-400" />
                <span className="text-sm text-red-300 font-medium">Seiron is conjuring magic...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mystical Input Area */}
      <div className="border-t border-red-800 p-4 bg-gradient-to-r from-gray-900 to-black">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell Seiron your investing wishes... 🐉"
              className="w-full resize-none rounded-lg border border-red-700 bg-gray-900 text-red-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 placeholder-red-400"
              rows={1}
            />
            <div className="absolute right-2 top-2 text-red-600 opacity-50">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg border border-red-800 hover:shadow-red-900/50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <span className="text-red-600">🔥</span>
          Empowered by the Dragon Legion - Financial Dragons of unparalleled wisdom and power
        </p>
      </div>
    </div>
  )
}