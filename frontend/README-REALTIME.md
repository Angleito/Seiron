# Real-time Chat Implementation with Supabase

This document outlines the comprehensive real-time subscription system implemented for live chat updates using Supabase real-time features.

## 🚀 Overview

The real-time system provides live synchronization of:
- Chat messages across multiple clients
- User presence and typing indicators
- Session status management
- Crypto price updates
- Connection state monitoring

## 📁 File Structure

```
frontend/
├── types/
│   └── realtime.ts                    # Real-time type definitions
├── hooks/
│   └── realtime/
│       ├── index.ts                   # Main exports
│       ├── useSupabaseRealtime.ts     # Core realtime connection
│       ├── useRealtimeMessages.ts     # Message subscriptions
│       ├── useRealtimeSession.ts      # Session management
│       ├── useRealtimePresence.ts     # Presence & typing
│       ├── useRealtimePrices.ts       # Price subscriptions
│       ├── useRealtimeConnection.ts   # Connection management
│       └── useRealtimeChat.ts         # Combined chat hook
└── components/
    └── chat/
        ├── RealtimeChat.tsx           # Main chat component
        ├── parts/
        │   ├── RealtimeConnectionStatus.tsx
        │   ├── RealtimePresenceIndicator.tsx
        │   └── RealtimePriceDisplay.tsx
        └── examples/
            └── RealtimeChatExample.tsx
```

## 🔧 Core Hooks

### useSupabaseRealtime
Base hook for managing Supabase real-time connections.

```typescript
const realtime = useSupabaseRealtime({
  channelName: 'my-channel',
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onError: (error) => console.error(error),
})

realtime.subscribe({
  table: 'messages',
  onInsert: (payload) => handleNewMessage(payload.new),
  onUpdate: (payload) => handleUpdatedMessage(payload.new),
  onDelete: (payload) => handleDeletedMessage(payload.old),
})
```

### useRealtimeMessages
Manages real-time message synchronization with optimistic updates.

```typescript
const messages = useRealtimeMessages({
  sessionId: 'session-123',
  userId: 'user-456',
  onMessage: (message) => console.log('New message:', message),
})

// Send message with automatic real-time sync
await messages.sendMessage('Hello world!', { type: 'text' })

// Update or delete messages
await messages.updateMessage('msg-id', { status: 'read' })
await messages.deleteMessage('msg-id')
```

### useRealtimeSession
Handles chat session management and activity tracking.

```typescript
const session = useRealtimeSession({
  sessionId: 'session-123',
  userId: 'user-456',
  autoUpdateActivity: true,
  onSessionUpdate: (session) => console.log('Session updated:', session),
})

// Update session metadata
await session.updateSession({ title: 'My Chat Session' })

// Archive session
await session.archiveSession()
```

### useRealtimePresence
Provides presence indicators and typing status.

```typescript
const presence = useRealtimePresence({
  sessionId: 'session-123',
  userId: 'user-456',
  userName: 'John Doe',
  onPresenceChange: (users) => console.log('Online users:', users),
  onTypingChange: (indicators) => console.log('Typing:', indicators),
})

// Set typing status
presence.setTyping(true)

// Change presence status
presence.setStatus('away')

// Update presence metadata
presence.updatePresence({ lastAction: 'reading' })
```

### useRealtimePrices
Subscribes to real-time cryptocurrency price updates.

```typescript
const prices = useRealtimePrices({
  symbols: ['BTC', 'ETH', 'SEI'],
  onPriceUpdate: (payload) => console.log('Price update:', payload.new),
  priceAlerts: {
    BTC: { above: 50000, below: 40000 },
  },
})

// Subscribe to additional symbols
prices.subscribe(['USDC', 'USDT'])

// Get current price
const btcPrice = prices.getPrice('BTC')
```

### useRealtimeConnection
Monitors overall connection health and manages reconnection.

```typescript
const connection = useRealtimeConnection({
  onConnect: () => console.log('All systems online'),
  onDisconnect: () => console.log('Connection lost'),
  onReconnect: () => console.log('Reconnected'),
})

// Manual reconnection
connection.reconnect()

// Check channel status
const status = connection.getChannelStatus('messages_session-123')
```

### useRealtimeChat
Combined hook that integrates all real-time features.

```typescript
const chat = useRealtimeChat({
  sessionId: 'session-123',
  userId: 'user-456',
  userName: 'John Doe',
  enablePresence: true,
  enablePrices: true,
  priceSymbols: ['BTC', 'ETH', 'SEI'],
  onMessage: (message) => console.log('New message:', message),
  onPresenceChange: (presence) => console.log('Presence:', presence),
  onPriceUpdate: (symbol, price) => console.log(`${symbol}: $${price.price}`),
})

// All features available through single interface
await chat.sendMessage('Hello!')
chat.setTyping(true)
chat.setStatus('online')
const btcPrice = chat.getPrice('BTC')
```

## 🎨 Components

### RealtimeChat
Main chat component with integrated real-time features.

```tsx
<RealtimeChat
  sessionId="session-123"
  userId="user-456"
  userName="John Doe"
  enablePresence={true}
  enablePrices={true}
  enableVoice={false}
  priceSymbols={['BTC', 'ETH', 'SEI']}
  onMessage={(message) => console.log('New message:', message)}
  onPresenceChange={(presence) => console.log('Presence:', presence)}
  onPriceUpdate={(symbol, price) => console.log(`${symbol}: $${price.price}`)}
  onConnectionChange={(connected) => console.log('Connected:', connected)}
/>
```

### Connection Status Component
Displays real-time connection status with reconnection controls.

```tsx
<RealtimeConnectionStatus
  isConnected={true}
  error={null}
  onReconnect={() => connection.reconnect()}
  onDisconnect={() => connection.disconnect()}
/>
```

### Presence Indicator Component
Shows online users and typing indicators.

```tsx
<RealtimePresenceIndicator
  presence={presence}
  myPresence={myPresence}
  onStatusChange={(status) => setStatus(status)}
/>
```

### Price Display Component
Real-time cryptocurrency price ticker with animations.

```tsx
<RealtimePriceDisplay
  prices={prices}
  symbols={['BTC', 'ETH', 'SEI']}
  onSubscriptionChange={(symbols, subscribe) => 
    subscribe ? subscribeTo(symbols) : unsubscribeFrom(symbols)
  }
/>
```

## 🗄️ Database Schema

The implementation expects the following Supabase tables:

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'delivered' CHECK (status IN ('sending', 'delivered', 'failed', 'error')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'adapter_action'))
);

-- Indexes
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
```

### user_presence
```sql
CREATE TABLE user_presence (
  user_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  typing_in_session TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_user_presence_session_id ON user_presence(session_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);

-- RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
```

### crypto_prices
```sql
CREATE TABLE crypto_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price DECIMAL NOT NULL,
  change_24h DECIMAL DEFAULT 0,
  change_percentage_24h DECIMAL DEFAULT 0,
  market_cap BIGINT DEFAULT 0,
  volume_24h BIGINT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX idx_crypto_prices_last_updated ON crypto_prices(last_updated);

-- RLS
ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;
```

## ⚡ Real-time Subscriptions

### Message Subscription
```typescript
// Subscribe to new messages in a session
realtime.subscribe({
  table: 'chat_messages',
  filter: `session_id=eq.${sessionId}`,
  onInsert: (payload) => addMessage(payload.new),
  onUpdate: (payload) => updateMessage(payload.new),
  onDelete: (payload) => removeMessage(payload.old.id),
})
```

### Presence Subscription
```typescript
// Track presence using channel presence
channel.track({
  user_id: userId,
  session_id: sessionId,
  status: 'online',
  last_seen: new Date().toISOString(),
  metadata: { user_name: userName },
})

// Listen for presence changes
channel.on('presence', { event: 'sync' }, () => {
  const presenceState = channel.presenceState()
  updatePresenceList(presenceState)
})
```

### Typing Indicators
```typescript
// Send typing indicator via broadcast
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: {
    user_id: userId,
    session_id: sessionId,
    is_typing: true,
    expires_at: new Date(Date.now() + 3000).toISOString(),
  },
})

// Listen for typing broadcasts
channel.on('broadcast', { event: 'typing' }, (payload) => {
  updateTypingIndicators(payload.payload)
})
```

### Price Subscriptions
```typescript
// Subscribe to price updates
realtime.subscribe({
  table: 'crypto_prices',
  onInsert: (payload) => updatePrice(payload.new),
  onUpdate: (payload) => updatePrice(payload.new),
})
```

## 🔒 Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled. Example policies:

```sql
-- Messages: Users can only see messages in their sessions
CREATE POLICY "Users can view session messages" ON chat_messages
  FOR SELECT USING (
    user_id = auth.uid() OR 
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Presence: Users can see presence in sessions they participate in
CREATE POLICY "Users can view session presence" ON user_presence
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );
```

### Authentication
```typescript
// Ensure user is authenticated before subscribing
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  throw new Error('User must be authenticated for real-time features')
}
```

## 🚨 Error Handling

### Connection Errors
```typescript
const handleError = (error: Error) => {
  logger.error('Real-time error:', error)
  
  // Show user-friendly error message
  setError(error)
  
  // Attempt automatic reconnection
  if (shouldReconnect(error)) {
    setTimeout(() => reconnect(), 5000)
  }
}
```

### Message Failures
```typescript
// Optimistic updates with rollback
const sendMessage = async (content: string) => {
  const tempMessage = createOptimisticMessage(content)
  addMessage(tempMessage)
  
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
    
    if (error) throw error
    
    // Replace optimistic message with real one
    replaceMessage(tempMessage.id, data)
  } catch (error) {
    // Mark message as failed
    markMessageFailed(tempMessage.id)
    throw error
  }
}
```

## 📊 Performance Optimization

### Connection Pooling
```typescript
// Reuse connections across components
const realtimePool = new Map<string, RealtimeChannel>()

const getOrCreateChannel = (channelName: string) => {
  if (!realtimePool.has(channelName)) {
    const channel = supabase.channel(channelName)
    realtimePool.set(channelName, channel)
  }
  return realtimePool.get(channelName)!
}
```

### Subscription Batching
```typescript
// Batch multiple subscriptions into single channel
const channel = supabase.channel(`session_${sessionId}`)

// Messages
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'chat_messages',
  filter: `session_id=eq.${sessionId}`,
}, handleMessageChange)

// Presence
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'user_presence',
  filter: `session_id=eq.${sessionId}`,
}, handlePresenceChange)
```

### Memory Management
```typescript
// Cleanup subscriptions on unmount
useEffect(() => {
  return () => {
    // Remove all listeners
    channel.off('postgres_changes')
    channel.off('presence')
    channel.off('broadcast')
    
    // Unsubscribe channel
    channel.unsubscribe()
  }
}, [])
```

## 🧪 Testing

### Mock Setup
```typescript
// Mock Supabase for testing
const mockSupabase = {
  channel: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    track: jest.fn(),
    untrack: jest.fn(),
    send: jest.fn(),
  })),
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}
```

### Integration Tests
```typescript
describe('Real-time Chat Integration', () => {
  it('synchronizes messages across clients', async () => {
    const client1 = renderChat({ sessionId: 'test-session' })
    const client2 = renderChat({ sessionId: 'test-session' })
    
    // Send message from client1
    await client1.sendMessage('Hello from client1')
    
    // Verify client2 receives message
    await waitFor(() => {
      expect(client2.getMessages()).toContain('Hello from client1')
    })
  })
})
```

## 📚 Usage Examples

### Basic Chat
```tsx
import { RealtimeChat } from '@/components/chat'

function ChatPage() {
  return (
    <RealtimeChat
      sessionId="my-session"
      userId="user-123"
      userName="John Doe"
    />
  )
}
```

### Advanced Configuration
```tsx
import { useRealtimeChat } from '@/hooks/realtime'

function AdvancedChat() {
  const chat = useRealtimeChat({
    sessionId: 'advanced-session',
    userId: 'user-123',
    userName: 'John Doe',
    enablePresence: true,
    enablePrices: true,
    priceSymbols: ['BTC', 'ETH', 'SEI'],
    config: {
      reconnectInterval: 5000,
      presenceTimeout: 30000,
      typingTimeout: 3000,
    },
    onMessage: (message) => {
      // Custom message handling
      analytics.track('message_received', { 
        messageId: message.id,
        role: message.role 
      })
    },
    onPriceUpdate: (symbol, price) => {
      // Custom price update handling
      if (price.change_percentage_24h > 10) {
        notifications.show(`${symbol} is up ${price.change_percentage_24h}%!`)
      }
    },
  })

  return (
    <div className="chat-container">
      {/* Custom UI using chat state */}
      <div className="messages">
        {chat.messages.map(message => (
          <MessageComponent key={message.id} message={message} />
        ))}
      </div>
      
      <div className="presence">
        {chat.presence.map(user => (
          <UserPresence key={user.user_id} user={user} />
        ))}
      </div>
      
      <div className="prices">
        {Object.entries(chat.prices).map(([symbol, price]) => (
          <PriceCard key={symbol} symbol={symbol} price={price} />
        ))}
      </div>
      
      <ChatInput onSend={chat.sendMessage} />
    </div>
  )
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required for real-time features
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Enable debugging
VITE_REALTIME_DEBUG=true
```

### Supabase Configuration
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting
    },
  },
  db: {
    schema: 'public',
  },
})
```

This real-time implementation provides a robust, scalable solution for live chat updates with comprehensive error handling, performance optimization, and extensive customization options.