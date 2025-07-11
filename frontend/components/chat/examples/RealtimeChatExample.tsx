import { useState, useCallback } from 'react'
import { RealtimeChat } from '../RealtimeChat'
import { ChatMessage, PresenceState, TypingIndicator, CryptoPrice } from '@/types/realtime'
import { Button } from '@/components/ui/forms/Button'
import { Card } from '@/components/ui/display/Card'
import { logger } from '@/lib/logger'

export interface RealtimeChatExampleProps {
  className?: string
}

export function RealtimeChatExample({ className = '' }: RealtimeChatExampleProps) {
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`)
  const [userId, setUserId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`)
  const [userName, setUserName] = useState(`User ${Math.floor(Math.random() * 1000)}`)
  const [enablePresence, setEnablePresence] = useState(true)
  const [enablePrices, setEnablePrices] = useState(true)
  const [enableVoice, setEnableVoice] = useState(false)
  const [priceSymbols, setPriceSymbols] = useState(['BTC', 'ETH', 'SEI'])
  
  const [events, setEvents] = useState<Array<{
    id: string
    type: string
    timestamp: string
    description: string
    data: any
  }>>([])
  
  // Helper function to add events
  const addEvent = (type: string, description: string, data: any) => {
    const event = {
      id: `event_${Date.now()}_${Math.random()}`,
      type,
      timestamp: new Date().toISOString(),
      description,
      data,
    }
    
    setEvents(prev => [event, ...prev].slice(0, 50)) // Keep last 50 events
    logger.debug('Real-time chat event', event)
  }
  
  // Event handlers
  const handleMessage = useCallback((message: ChatMessage) => {
    addEvent('message', `New message from ${message.role}: "${message.content}"`, { message })
  }, [])
  
  const handlePresenceChange = useCallback((presence: PresenceState[]) => {
    addEvent('presence', `Presence updated: ${presence.length} users online`, { presence })
  }, [])
  
  const handleTypingChange = useCallback((indicators: TypingIndicator[]) => {
    const typingUsers = indicators.filter(i => i.is_typing).length
    if (typingUsers > 0) {
      addEvent('typing', `${typingUsers} user(s) typing`, { indicators })
    }
  }, [])
  
  const handlePriceUpdate = useCallback((symbol: string, price: CryptoPrice) => {
    addEvent('price', `${symbol} price updated: $${price.price}`, { symbol, price })
  }, [])
  
  const handleConnectionChange = useCallback((isConnected: boolean) => {
    addEvent('connection', `Connection ${isConnected ? 'established' : 'lost'}`, { isConnected })
  }, [])
  
  // Control functions
  const generateNewSession = () => {
    const newSessionId = `session_${Date.now()}`
    setSessionId(newSessionId)
    addEvent('system', `New session created: ${newSessionId}`, { sessionId: newSessionId })
  }
  
  const generateNewUser = () => {
    const newUserId = `user_${Math.random().toString(36).substr(2, 9)}`
    const newUserName = `User ${Math.floor(Math.random() * 1000)}`
    setUserId(newUserId)
    setUserName(newUserName)
    addEvent('system', `New user identity: ${newUserName} (${newUserId})`, { userId: newUserId, userName: newUserName })
  }
  
  const clearEvents = () => {
    setEvents([])
    addEvent('system', 'Event log cleared', {})
  }
  
  const addPriceSymbol = () => {
    const symbols = ['USDC', 'USDT', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'MATIC']
    const availableSymbols = symbols.filter(s => !priceSymbols.includes(s))
    
    if (availableSymbols.length > 0) {
      const newSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)]
      setPriceSymbols(prev => [...prev, newSymbol!])
      addEvent('system', `Added price subscription: ${newSymbol}`, { symbol: newSymbol })
    }
  }
  
  const removePriceSymbol = () => {
    if (priceSymbols.length > 1) {
      const symbolToRemove = priceSymbols[priceSymbols.length - 1]
      setPriceSymbols(prev => prev.slice(0, -1))
      addEvent('system', `Removed price subscription: ${symbolToRemove}`, { symbol: symbolToRemove })
    }
  }
  
  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }
  
  const getEventColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600 dark:text-blue-400'
      case 'presence': return 'text-green-600 dark:text-green-400'
      case 'typing': return 'text-purple-600 dark:text-purple-400'
      case 'price': return 'text-orange-600 dark:text-orange-400'
      case 'connection': return 'text-red-600 dark:text-red-400'
      case 'system': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-500'
    }
  }
  
  return (
    <div className={`realtime-chat-example grid grid-cols-1 lg:grid-cols-3 gap-6 h-full ${className}`}>
      {/* Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Real-time Chat Demo</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Session: {sessionId} | User: {userName}
            </p>
          </div>
          
          <div className="h-96 lg:h-[600px]">
            <RealtimeChat
              sessionId={sessionId}
              userId={userId}
              userName={userName}
              enableVoice={enableVoice}
              enablePresence={enablePresence}
              enablePrices={enablePrices}
              priceSymbols={priceSymbols}
              onMessage={handleMessage}
              onPresenceChange={handlePresenceChange}
              onTypingChange={handleTypingChange}
              onPriceUpdate={handlePriceUpdate}
              onConnectionChange={handleConnectionChange}
              className="h-full"
            />
          </div>
        </Card>
      </div>
      
      {/* Controls and Events */}
      <div className="space-y-6">
        {/* Controls */}
        <Card>
          <div className="p-4">
            <h3 className="text-md font-semibold mb-4">Demo Controls</h3>
            
            <div className="space-y-3">
              {/* Session Controls */}
              <div>
                <label className="block text-sm font-medium mb-2">Session</label>
                <div className="flex space-x-2">
                  <Button onClick={generateNewSession} size="sm" variant="secondary">
                    🔄 New Session
                  </Button>
                  <Button onClick={generateNewUser} size="sm" variant="secondary">
                    👤 New User
                  </Button>
                </div>
              </div>
              
              {/* Feature Toggles */}
              <div>
                <label className="block text-sm font-medium mb-2">Features</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enablePresence}
                      onChange={(e) => setEnablePresence(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable Presence</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enablePrices}
                      onChange={(e) => setEnablePrices(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable Prices</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enableVoice}
                      onChange={(e) => setEnableVoice(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable Voice</span>
                  </label>
                </div>
              </div>
              
              {/* Price Symbol Controls */}
              {enablePrices && (
                <div>
                  <label className="block text-sm font-medium mb-2">Price Symbols</label>
                  <div className="flex space-x-2 mb-2">
                    <Button onClick={addPriceSymbol} size="sm" variant="secondary">
                      ➕ Add Symbol
                    </Button>
                    <Button onClick={removePriceSymbol} size="sm" variant="secondary">
                      ➖ Remove Symbol
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600">
                    Current: {priceSymbols.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Event Log */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold">Event Log</h3>
              <Button onClick={clearEvents} size="sm" variant="ghost">
                🗑️ Clear
              </Button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No events yet. Start chatting to see real-time updates!
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-2 border border-gray-200 dark:border-gray-700 rounded"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${getEventColor(event.type)}`}>
                        {event.type.toUpperCase()}
                      </span>
                      <span className="text-gray-500">
                        {formatEventTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {event.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}