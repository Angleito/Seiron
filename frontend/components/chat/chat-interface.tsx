'use client'

// Export the minimal version as default for cleaner UI
export { MinimalChatInterface as ChatInterface } from './MinimalChatInterface'

// Export the voice-enabled chat
export { VoiceEnabledChat } from './VoiceEnabledChat'

// Keep the original complex version available as ComplexChatInterface
import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, Sparkles, Search, TrendingUp, Activity, Zap } from 'lucide-react'
import { cn } from '@lib/utils'
import { AgentStreamEvent } from '../../types/agent'
import { getOrchestrator } from '@lib/orchestrator-client'
import { ChatStreamService, StreamMessage, TypingIndicator, ConnectionStatus } from './ChatStreamService'
import { Subscription } from 'rxjs'
import * as E from 'fp-ts/Either'
import { logger, safeDebug, safeInfo, safeWarn, safeError } from '@lib/logger'
import { sanitizeChatMessage, useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'
import { SeironImage } from '@components/SeironImage'

// New adapter-related types
interface HiveInsight {
  id: string
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'correlation'
  title: string
  description: string
  confidence: number
  data: Record<string, any>
}

interface SeiNetworkStatus {
  blockNumber: number
  networkStatus: 'healthy' | 'congested' | 'offline'
  gasPrice: string
  validators: number
  totalSupply: string
}

interface AdapterAction {
  type: 'sak' | 'hive' | 'mcp'
  action: string
  params: Record<string, any>
  description: string
}

// Generate unique session ID
const generateSessionId = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  safeDebug('Generated new chat session ID', { sessionId })
  return sessionId
}

// Safe message content renderer
function SafeMessageContent({ content, type }: { content: string; type: 'user' | 'agent' | 'system' }) {
  const { sanitized, isValid, warnings } = useSanitizedContent(
    content, 
    type === 'user' ? SANITIZE_CONFIGS.CHAT_MESSAGE : SANITIZE_CONFIGS.TEXT_ONLY
  )
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    logger.warn('Message sanitization warnings:', warnings)
  }
  
  // If content is potentially unsafe, show a warning
  if (!isValid) {
    return (
      <div className="text-yellow-400 text-size-3">
        ⚠️ Message content filtered for security
      </div>
    )
  }
  
  return <span className="whitespace-pre-wrap">{sanitized}</span>
}

export function ComplexChatInterface() {
  const [input, setInput] = useState('')
  const [sessionId] = useState(generateSessionId())
  
  // Logging component mount
  useEffect(() => {
    logger.time('ChatInterface-Mount')
    safeInfo('ChatInterface component mounted', {
      sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    })
    
    return () => {
      logger.timeEnd('ChatInterface-Mount')
      safeInfo('ChatInterface component unmounted', { sessionId })
    }
  }, [])
  const [hiveInsights, setHiveInsights] = useState<HiveInsight[]>([])
  const [networkStatus, setNetworkStatus] = useState<SeiNetworkStatus | null>(null)
  const [powerLevel, setPowerLevel] = useState<number>(9000)
  const [adapterActions, setAdapterActions] = useState<AdapterAction[]>([])
  const [showAdapterActions, setShowAdapterActions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Stream-based state
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Initialize chat stream service
  const chatService = useMemo(() => {
    return new ChatStreamService({
      apiEndpoint: import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:3001',
      sessionId,
      maxRetries: 3,
      retryDelay: 1000,
      heartbeatInterval: 30000,
      messageTimeout: 30000,
      bufferSize: 100,
      throttleTime: 100
    })
  }, [sessionId])
  
  // Add initial welcome message
  useEffect(() => {
    logger.time('ChatInterface-WelcomeMessage')
    safeDebug('Creating welcome message', { sessionId })
    
    const welcomeMessage: StreamMessage = {
      id: '1',
      type: 'agent',
      agentType: 'portfolio_agent',
      content: 'Greetings, mortal! I am Seiron, the Dragon of Financial Wisdom. Enhanced with the power of Sei Agent Kit, Hive Intelligence, and real-time MCP protocols, I now possess legendary abilities to manage your digital treasures, execute mystical trades, provide ancient market insights, and grant your investing wishes with Saiyan-level precision. What fortune do you seek today?',
      timestamp: new Date(),
      status: 'delivered'
    }
    setMessages([welcomeMessage])
    
    safeInfo('Welcome message added to chat', {
      sessionId,
      messageId: welcomeMessage.id,
      agentType: welcomeMessage.agentType,
      timestamp: welcomeMessage.timestamp
    })
    
    logger.timeEnd('ChatInterface-WelcomeMessage')
  }, [])

  // Subscribe to chat streams
  useEffect(() => {
    logger.time('ChatInterface-StreamSubscriptions')
    safeDebug('Setting up chat stream subscriptions', { sessionId })
    
    const subscriptions: Subscription[] = []
    
    // Subscribe to message stream
    subscriptions.push(
      chatService.messages$.subscribe(message => {
        safeDebug('Received message from stream', {
          sessionId,
          messageId: message.id,
          messageType: message.type,
          agentType: message.agentType,
          status: message.status,
          timestamp: message.timestamp
        })
        
        setMessages(prev => {
          const existing = prev.findIndex(m => m.id === message.id)
          if (existing >= 0 && prev[existing]) {
            // Update existing message
            safeDebug('Updating existing message', {
              sessionId,
              messageId: message.id,
              previousStatus: prev[existing].status,
              newStatus: message.status
            })
            const updated = [...prev]
            updated[existing] = message
            return updated
          }
          
          safeDebug('Adding new message to chat', {
            sessionId,
            messageId: message.id,
            messageType: message.type,
            contentLength: message.content.length
          })
          
          return [...prev, message]
        })
      })
    )
    
    // Subscribe to typing indicators
    subscriptions.push(
      chatService.typingIndicators$.subscribe(indicators => {
        safeDebug('Typing indicators updated', {
          sessionId,
          activeIndicators: indicators.length,
          agentTypes: indicators.map(i => i.agentType)
        })
        setTypingIndicators(indicators)
      })
    )
    
    // Subscribe to connection status
    subscriptions.push(
      chatService.connectionStatus.subscribe(status => {
        const logLevel = status.isConnected ? 'info' : 'warn'
        const logMessage = `Connection status changed: ${status.isConnected ? 'connected' : 'disconnected'}`
        
        if (logLevel === 'info') {
          safeInfo(logMessage, {
            sessionId,
            isConnected: status.isConnected,
            lastHeartbeat: status.lastHeartbeat,
            reconnectAttempts: status.reconnectAttempts,
            error: status.error
          })
        } else {
          safeWarn(logMessage, {
            sessionId,
            isConnected: status.isConnected,
            lastHeartbeat: status.lastHeartbeat,
            reconnectAttempts: status.reconnectAttempts,
            error: status.error
          })
        }
        
        setConnectionStatus(status)
      })
    )
    
    // Initialize adapter actions
    const adapterActionsList: AdapterAction[] = [
      { type: 'hive', action: 'search', params: {}, description: 'Search blockchain data with AI' },
      { type: 'hive', action: 'analytics', params: {}, description: 'Get AI-powered market insights' },
      { type: 'sak', action: 'get_token_balance', params: {}, description: 'Check token balances' },
      { type: 'sak', action: 'takara_supply', params: {}, description: 'Supply to Takara protocol' },
      { type: 'mcp', action: 'get_blockchain_state', params: {}, description: 'Get real-time network status' },
      { type: 'mcp', action: 'get_wallet_balance', params: {}, description: 'Get live wallet balance' },
      { type: 'sak', action: 'sei_network_status', params: {}, description: 'Get SEI network information' },
      { type: 'sak', action: 'sei_token_info', params: {}, description: 'Get SEI token data' },
      { type: 'hive', action: 'crypto_market_data', params: {}, description: 'Get crypto market information' },
      { type: 'sak', action: 'sei_defi_data', params: {}, description: 'Get SEI DeFi protocols' },
      { type: 'sak', action: 'sei_wallet_analysis', params: {}, description: 'Analyze SEI wallet' },
    ]
    
    setAdapterActions(adapterActionsList)
    
    safeInfo('Adapter actions initialized', {
      sessionId,
      totalActions: adapterActionsList.length,
      actionTypes: adapterActionsList.reduce((acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
    
    // Legacy orchestrator events (will be migrated to streams)
    const orchestrator = getOrchestrator({
      apiEndpoint: import.meta.env.VITE_ORCHESTRATOR_API || '/api',
      wsEndpoint: import.meta.env.VITE_ORCHESTRATOR_WS || 'ws://localhost:3001',
    })
    
    // Subscribe to Hive Intelligence events
    const unsubscribeHive = orchestrator.on('hive:insights', (event: AgentStreamEvent) => {
      safeDebug('Received Hive Intelligence event', {
        sessionId,
        eventType: event.type,
        agentId: event.agentId,
        timestamp: event.timestamp
      })
      
      if (event.data && typeof event.data === 'object' && 'insights' in event.data) {
        const data = event.data as { insights: unknown }
        if (Array.isArray(data.insights)) {
          safeInfo('Hive insights updated', {
            sessionId,
            insightsCount: data.insights.length,
            insightTypes: data.insights.map(i => i.type)
          })
          setHiveInsights(data.insights)
        }
      }
    })

    // Subscribe to MCP network status events
    const unsubscribeMCP = orchestrator.on('mcp:network_status', (event: AgentStreamEvent) => {
      safeDebug('Received MCP network status event', {
        sessionId,
        eventType: event.type,
        agentId: event.agentId,
        timestamp: event.timestamp
      })
      
      if (event.data) {
        const networkData = event.data as SeiNetworkStatus
        safeInfo('Network status updated', {
          sessionId,
          blockNumber: networkData.blockNumber,
          networkStatus: networkData.networkStatus,
          validatorCount: networkData.validators
        })
        setNetworkStatus(networkData)
      }
    })

    // Subscribe to power level updates
    const unsubscribePowerLevel = orchestrator.on('portfolio:power_level', (event: AgentStreamEvent) => {
      safeDebug('Received power level update', {
        sessionId,
        eventType: event.type,
        agentId: event.agentId,
        timestamp: event.timestamp
      })
      
      if (event.data && typeof (event.data as any).powerLevel === 'number') {
        const newPowerLevel = (event.data as any).powerLevel
        safeInfo('Power level updated', {
          sessionId,
          previousPowerLevel: powerLevel,
          newPowerLevel,
          change: newPowerLevel - powerLevel
        })
        setPowerLevel(newPowerLevel)
      }
    })
    
    logger.timeEnd('ChatInterface-StreamSubscriptions')
    
    return () => {
      logger.time('ChatInterface-StreamCleanup')
      safeDebug('Cleaning up chat stream subscriptions', { sessionId })
      
      // Unsubscribe from all streams
      subscriptions.forEach(sub => sub.unsubscribe())
      
      // Clean up legacy subscriptions
      unsubscribeHive()
      unsubscribeMCP()
      unsubscribePowerLevel()
      
      // Destroy chat service
      chatService.destroy()
      
      safeInfo('Chat stream subscriptions cleaned up', { sessionId })
      logger.timeEnd('ChatInterface-StreamCleanup')
    }
  }, [chatService])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      logger.time('ChatInterface-AutoScroll')
      safeDebug('Auto-scrolling to bottom', {
        sessionId,
        messageCount: messages.length,
        lastMessageId: messages[messages.length - 1]?.id
      })
      
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      
      logger.timeEnd('ChatInterface-AutoScroll')
    }
  }, [messages])

  const executeAdapterAction = async (action: AdapterAction) => {
    if (isLoading) {
      safeWarn('Adapter action blocked - already loading', {
        sessionId,
        blockedAction: action.action,
        actionType: action.type
      })
      return
    }
    
    logger.time(`AdapterAction-${action.type}-${action.action}`)
    safeInfo('Executing adapter action', {
      sessionId,
      actionType: action.type,
      action: action.action,
      description: action.description,
      timestamp: Date.now()
    })
    
    setIsLoading(true)

    chatService.sendAdapterAction(action).subscribe({
      next: (result) => {
        if (E.isLeft(result)) {
          safeError('Failed to send adapter action', {
            sessionId,
            actionType: action.type,
            action: action.action,
            error: result.left
          })
        } else {
          safeInfo('Adapter action sent successfully', {
            sessionId,
            actionType: action.type,
            action: action.action
          })
        }
      },
      error: (error) => {
        safeError('Error executing adapter action', {
          sessionId,
          actionType: action.type,
          action: action.action,
          error
        })
        setIsLoading(false)
        logger.timeEnd(`AdapterAction-${action.type}-${action.action}`)
      },
      complete: () => {
        safeDebug('Adapter action completed', {
          sessionId,
          actionType: action.type,
          action: action.action
        })
        setIsLoading(false)
        logger.timeEnd(`AdapterAction-${action.type}-${action.action}`)
      }
    })
  }

  const handleSend = () => {
    if (!input.trim()) {
      safeWarn('Message send blocked - empty input', { sessionId })
      return
    }
    
    if (isLoading) {
      safeWarn('Message send blocked - already loading', { sessionId })
      return
    }

    logger.time('ChatInterface-SendMessage')
    
    // Sanitize user input to prevent XSS
    const sanitizedInput = sanitizeChatMessage(input.trim())
    const metadata = {
      powerLevel,
      hiveInsights,
      networkStatus,
    }
    
    safeInfo('User sending message', {
      sessionId,
      messageLength: sanitizedInput.length,
      hasMetadata: !!metadata,
      powerLevel,
      hiveInsightsCount: hiveInsights.length,
      networkStatus: networkStatus?.networkStatus,
      timestamp: Date.now()
    })
    
    setInput('')
    setIsLoading(true)

    chatService.sendMessage(sanitizedInput, metadata).subscribe({
      next: (result) => {
        if (E.isLeft(result)) {
          safeError('Failed to send message', {
            sessionId,
            messageLength: sanitizedInput.length,
            error: result.left
          })
        } else {
          safeInfo('Message sent successfully', {
            sessionId,
            messageId: result.right.id,
            messageLength: sanitizedInput.length
          })
        }
      },
      error: (error) => {
        safeError('Error sending message', {
          sessionId,
          messageLength: sanitizedInput.length,
          error
        })
        setIsLoading(false)
        logger.timeEnd('ChatInterface-SendMessage')
      },
      complete: () => {
        safeDebug('Message send completed', { sessionId })
        setIsLoading(false)
        logger.timeEnd('ChatInterface-SendMessage')
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      safeDebug('User pressed Enter to send message', {
        sessionId,
        inputLength: input.length,
        hasShift: e.shiftKey
      })
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
      case 'sak_agent':
        return '⚡'
      case 'hive_agent':
        return '🔮'
      case 'mcp_agent':
        return '🌐'
      default:
        return '🐉'
    }
  }

  const getAdapterIcon = (type: string) => {
    switch (type) {
      case 'sak':
        return <Zap className="h-3 w-3" />
      case 'hive':
        return <Search className="h-3 w-3" />
      case 'mcp':
        return <Activity className="h-3 w-3" />
      default:
        return <Sparkles className="h-3 w-3" />
    }
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
      {/* Enhanced Status Bar */}
      <div className="px-2 py-1 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-1">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1">
            <div className={cn(
              "h-2 w-2 rounded-full",
              connectionStatus.isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-size-4 text-gray-300">
              {connectionStatus.isConnected ? 'Connected to Dragon Realm' : 'Connecting...'}
            </span>
            {connectionStatus.error && (
              <span className="text-size-4 text-gray-400">({connectionStatus.error})</span>
            )}
          </div>
          
          {/* Power Level Display */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-red-600" />
              <span className="text-size-4 text-red-700 font-semibold">
                Power Level: {powerLevel.toLocaleString()}
              </span>
            </div>
            
            {/* Network Status */}
            {networkStatus && (
              <div className="flex items-center gap-1">
                <Activity className={cn(
                  "h-3 w-3",
                  networkStatus.networkStatus === 'healthy' ? 'text-green-600' : 
                  networkStatus.networkStatus === 'congested' ? 'text-yellow-600' : 'text-red-600'
                )} />
                <span className="text-size-4 text-red-700">
                  Block {networkStatus.blockNumber}
                </span>
              </div>
            )}
            
            {/* Adapter Actions Toggle */}
            <button
              onClick={() => {
                const newState = !showAdapterActions
                safeDebug('Adapter actions panel toggled', {
                  sessionId,
                  showAdapterActions: newState
                })
                setShowAdapterActions(newState)
              }}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-size-4 hover:bg-red-700 transition-colors"
            >
              <Zap className="h-3 w-3" />
              Adapters
            </button>
          </div>
        </div>
        
        {/* Hive Insights Preview */}
        {hiveInsights.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Search className="h-3 w-3 text-red-600" />
            <span className="text-size-4 text-red-600">
              {hiveInsights.length} AI insights available
            </span>
            {hiveInsights.slice(0, 2).map((insight) => (
              <span key={insight.id} className="text-size-4 bg-red-100 text-red-700 px-2 py-1 rounded">
                {insight.type}: {insight.confidence}% confidence
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Adapter Actions Panel */}
      {showAdapterActions && (
        <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-size-4 font-semibold text-gray-700 mb-1">Dragon Power Adapters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {adapterActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  safeDebug('Adapter action button clicked', {
                    sessionId,
                    actionType: action.type,
                    action: action.action,
                    isLoading
                  })
                  executeAdapterAction(action)
                }}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-1 p-1 rounded border text-size-4 transition-colors",
                  "hover:bg-white hover:shadow-sm",
                  action.type === 'sak' && "border-yellow-300 bg-yellow-50 text-yellow-700",
                  action.type === 'hive' && "border-blue-300 bg-blue-50 text-blue-700",
                  action.type === 'mcp' && "border-green-300 bg-green-50 text-green-700",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {getAdapterIcon(action.type)}
                <span className="truncate">{action.action}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 relative">
        {/* Seiron Watermark with Mystical Effects */}
        <SeironImage 
          variant="watermark"
          className="absolute bottom-8 right-8 z-0"
          enableMysticalEffects={true}
        />
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex relative z-10',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-1 border text-size-3',
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
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-base">{getAgentIcon(message.agentType)}</span>
                  <span className="text-size-4 font-normal text-red-300">
                    {message.agentType?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
              <SafeMessageContent content={message.content} type={message.type} />
              <div className="flex items-center gap-2 mt-1">
                <p
                  className={cn(
                    'text-size-4',
                    message.type === 'user'
                      ? 'text-red-200'
                      : message.type === 'agent'
                      ? 'text-red-400'
                      : 'text-gray-500'
                  )}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
                {/* Message status indicator */}
                {message.status && message.type === 'user' && (
                  <span className={cn(
                    'text-size-4',
                    message.status === 'pending' && 'text-gray-400',
                    message.status === 'sending' && 'text-yellow-400',
                    message.status === 'sent' && 'text-blue-400',
                    message.status === 'delivered' && 'text-green-400',
                    message.status === 'failed' && 'text-red-400'
                  )}>
                    {message.status === 'pending' && '○'}
                    {message.status === 'sending' && '◐'}
                    {message.status === 'sent' && '◑'}
                    {message.status === 'delivered' && '●'}
                    {message.status === 'failed' && '✗'}
                  </span>
                )}
                {message.metadata?.executionTime && (
                  <p className="text-size-4 text-red-400">
                    ⚡ {((message.metadata.executionTime as number) / 1000).toFixed(2)}s
                  </p>
                )}
                {message.metadata?.confidence && (
                  <span className="text-size-4 text-yellow-400">
                    {Math.round((message.metadata.confidence as number) * 100)}%
                  </span>
                )}
                {message.metadata?.powerLevel && (
                  <span className="text-size-4 text-orange-400">
                    ⚡{(message.metadata.powerLevel as number).toLocaleString()}
                  </span>
                )}
                {message.metadata?.dragonBallMessage && (
                  <span className="text-size-4 text-orange-300 italic pl-1">
                    🐲 {String(message.metadata.dragonBallMessage)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Typing Indicators */}
        {typingIndicators.length > 0 && (
          <div className="space-y-1 relative z-10">
            {typingIndicators.map((indicator) => (
              <div key={indicator.agentId} className="flex justify-start">
                <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg px-2 py-1 border border-red-800 text-size-3">
                  <div className="flex items-center gap-1">
                    <div className="text-size-3 animate-pulse">{getAgentIcon(indicator.agentType)}</div>
                    <Sparkles className="h-3 w-3 animate-spin text-red-400" />
                    <span className="text-size-4 text-red-300">
                      typing...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Legacy loading indicator */}
        {isLoading && typingIndicators.length === 0 && (
          <div className="flex justify-start relative z-10">
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg px-2 py-1 border border-red-800">
              <div className="flex items-center gap-1">
                <div className="text-size-3 animate-pulse">🐉</div>
                <Sparkles className="h-3 w-3 animate-spin text-red-400" />
                <span className="text-size-4 text-red-300">typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mystical Input Area */}
      <div className="border-t border-red-800 p-2 bg-gradient-to-r from-gray-900 to-black">
        <div className="flex space-x-1">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                safeDebug('User input changed', {
                  sessionId,
                  inputLength: e.target.value.length,
                  timestamp: Date.now()
                })
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => safeDebug('Input focused', { sessionId })}
              onBlur={() => safeDebug('Input blurred', { sessionId })}
              placeholder="Tell Seiron your investing wishes... 🐉"
              className="w-full resize-none rounded-lg border border-red-700 bg-gray-900 text-red-100 px-2 py-1 text-size-3 focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-500 placeholder-red-400"
              rows={1}
            />
            <div className="absolute right-1 top-1 text-red-600 opacity-50">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
          <button
            onClick={() => {
              safeDebug('Send button clicked', {
                sessionId,
                inputLength: input.length,
                isLoading
              })
              handleSend()
            }}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-3 py-1 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg border border-red-800 hover:shadow-red-900/50"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-size-4 text-red-400">
            🔥 Powered by SAK + Hive + MCP
          </p>
          <div className="flex items-center gap-1 text-size-4">
            <span className="text-orange-400">⚡ Power: {powerLevel.toLocaleString()}</span>
            {networkStatus && (
              <span className={cn(
                "px-2 py-1 rounded text-size-4",
                networkStatus.networkStatus === 'healthy' ? 'bg-green-100 text-green-700' :
                networkStatus.networkStatus === 'congested' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                {networkStatus.networkStatus.toUpperCase()}
              </span>
            )}
            {hiveInsights.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-size-4">
                {hiveInsights.length} AI Insights
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}