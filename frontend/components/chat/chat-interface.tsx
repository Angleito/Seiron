'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, Loader2 } from 'lucide-react'
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
      content: 'Hello! I\'m your AI portfolio manager. I can help you manage your crypto portfolio, execute trades, provide market insights, and more. How can I assist you today?',
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
          addSystemMessage(`${event.agentType}: ${statusData.message}`)
        }
        if (statusData.status === 'connected') {
          setConnectedAgents(prev => new Set(prev).add(event.agentId))
        }
      }
    })

    const unsubscribeProgress = orchestrator.on('progress', (event: AgentStreamEvent) => {
      if (event.type === 'progress' && event.data) {
        const progressData = event.data as { message: string }
        addSystemMessage(`${event.agentType} is working: ${progressData.message}`)
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
          content: data.message || 'I encountered an error. Please try again.',
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
        content: 'Failed to connect to the AI service. Please check your connection and try again.',
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
        return '💰'
      case 'liquidity_agent':
        return '💧'
      case 'portfolio_agent':
        return '📊'
      case 'risk_agent':
        return '🛡️'
      case 'analysis_agent':
        return '📈'
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connected Agents Indicator */}
      {connectedAgents.size > 0 && (
        <div className="px-4 py-2 bg-green-50 border-b">
          <p className="text-sm text-green-700">
            Connected agents: {Array.from(connectedAgents).join(', ')}
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
                'max-w-[70%] rounded-lg px-4 py-2',
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'system'
                  ? 'bg-gray-50 text-gray-600 italic'
                  : message.metadata?.error
                  ? 'bg-red-50 text-red-900'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              {message.type === 'agent' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getAgentIcon(message.agentType)}</span>
                  <span className="text-xs font-medium text-gray-600">
                    {message.agentType?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div className="flex items-center gap-4 mt-1">
                <p
                  className={cn(
                    'text-xs',
                    message.type === 'user'
                      ? 'text-blue-200'
                      : 'text-gray-500'
                  )}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
                {message.metadata?.executionTime && (
                  <p className="text-xs text-gray-500">
                    {(message.metadata.executionTime / 1000).toFixed(2)}s
                  </p>
                )}
                {message.metadata?.confidence && (
                  <p className="text-xs text-gray-500">
                    {Math.round(message.metadata.confidence * 100)}% confident
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Try: 'Show my portfolio', 'Swap 100 USDC for ETH', 'Add liquidity to USDC/ETH pool'..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Powered by multiple specialized AI agents for lending, liquidity, portfolio management, and more.
        </p>
      </div>
    </div>
  )
}