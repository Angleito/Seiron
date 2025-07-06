# Chat API Setup Instructions

This document provides step-by-step instructions for setting up the new chat API endpoints for message history and session management.

## Prerequisites

1. A Supabase project (free tier is sufficient)
2. Node.js and npm installed
3. Access to your project's environment variables

## Step 1: Install Dependencies

Add the Supabase client to your project:

```bash
npm install @supabase/supabase-js
```

If you're using TypeScript, you may also want:

```bash
npm install --save-dev @types/uuid
```

## Step 2: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project or use an existing one
3. Note down your project URL and anon key from the project settings

## Step 3: Set Up Database Schema

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL script to create the required tables:

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sequence_number INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_sequence ON chat_messages(session_id, sequence_number);

-- Create RLS policies
CREATE POLICY "Users can only access their own chat sessions"
  ON chat_sessions FOR ALL
  USING (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY "Users can only access their own chat messages"
  ON chat_messages FOR ALL
  USING (user_id = current_setting('app.current_user_id')::text);

-- Create function to update session timestamp when messages are added
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session timestamps
CREATE TRIGGER update_session_timestamp_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Create function to automatically set sequence numbers
CREATE OR REPLACE FUNCTION set_message_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Set sequence number based on existing messages in the session
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO NEW.sequence_number
  FROM chat_messages 
  WHERE session_id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set sequence numbers
CREATE TRIGGER set_message_sequence_trigger
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_sequence();

-- Create RPC function for setting user context
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text, is_local boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
END;
$$;
```

## Step 4: Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Replace the values with your actual Supabase project details.

## Step 5: Test the API Endpoints

Start your development server and test the endpoints:

```bash
# Start your server (adjust command as needed)
npm run dev

# Test creating a new session
curl -X POST "http://localhost:3000/api/sessions/new" \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Session", "description": "My first chat session"}'

# Test listing sessions
curl -X GET "http://localhost:3000/api/sessions" \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json"

# Test getting messages (replace session-id with actual ID from create response)
curl -X GET "http://localhost:3000/api/messages/[session-id]" \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json"
```

## Step 6: Integration with Frontend

Update your frontend chat components to use the new API endpoints. Here's an example React hook:

```typescript
// hooks/useChat.ts
import { useState, useEffect } from 'react';

interface ChatSession {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  metadata: any;
  is_archived: boolean;
  message_count?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: any;
  created_at: string;
  sequence_number: number;
}

export const useChat = (userId: string) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data;
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/sessions');
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: Partial<ChatSession>) => {
    try {
      const data = await apiCall('/api/sessions/new', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });
      
      await fetchSessions(); // Refresh sessions list
      return data.session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<ChatSession>) => {
    try {
      const data = await apiCall(`/api/sessions/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify(updates),
      });
      
      await fetchSessions(); // Refresh sessions list
      return data.session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
      throw err;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await apiCall(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      await fetchSessions(); // Refresh sessions list
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      throw err;
    }
  };

  const fetchMessages = async (sessionId: string, page = 1, limit = 20) => {
    setLoading(true);
    try {
      const data = await apiCall(`/api/messages/${sessionId}?page=${page}&limit=${limit}`);
      setMessages(data.messages);
      setCurrentSession(data.session);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    currentSession,
    messages,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    fetchMessages,
  };
};
```

## Step 7: Update Existing Chat Components

Modify your existing chat components to use the new session management:

```typescript
// components/ChatInterface.tsx
import React, { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';

interface ChatInterfaceProps {
  userId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId }) => {
  const {
    sessions,
    currentSession,
    messages,
    loading,
    error,
    fetchSessions,
    createSession,
    fetchMessages,
  } = useChat(userId);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleCreateNewSession = async () => {
    try {
      const newSession = await createSession({
        title: 'New Chat',
        description: 'A new conversation',
      });
      setSelectedSessionId(newSession.id);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="chat-interface">
      <div className="session-sidebar">
        <button onClick={handleCreateNewSession}>New Chat</button>
        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${selectedSessionId === session.id ? 'active' : ''}`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <h4>{session.title}</h4>
              <p>{session.description}</p>
              <small>{new Date(session.last_message_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-area">
        {currentSession && (
          <>
            <div className="session-header">
              <h3>{currentSession.title}</h3>
              <p>{currentSession.description}</p>
            </div>
            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="content">{message.content}</div>
                  <div className="timestamp">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

## Step 8: Run Tests

Run the provided test suite to ensure everything is working:

```bash
# Install test dependencies if not already installed
npm install --save-dev jest supertest

# Run the API tests
npm test test/api-endpoints.test.js
```

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in your `.env` file
   - Restart your development server after adding environment variables

2. **"Table does not exist"**
   - Make sure you've run the SQL schema creation script in your Supabase SQL editor
   - Check that the tables were created successfully in the Supabase dashboard

3. **"RLS policy violation"**
   - Ensure you're passing a valid `x-user-id` header with all requests
   - Check that the user ID format matches your validation requirements

4. **"Rate limit exceeded"**
   - The API includes rate limiting. If you hit limits during testing, wait a minute or adjust the rate limit configuration

### Debug Mode:

Set `NODE_ENV=development` to get detailed error messages and logging.

### Monitoring:

- Check your Supabase dashboard for database activity
- Monitor API logs for error patterns
- Use the provided test endpoints to verify functionality

## Security Considerations

1. **User Authentication**: Ensure proper user authentication before setting the `x-user-id` header
2. **Input Validation**: All endpoints include input validation and sanitization
3. **Rate Limiting**: Built-in rate limiting prevents abuse
4. **Row Level Security**: Database-level security ensures users only access their own data

## Production Deployment

1. **Environment Variables**: Set all required environment variables in your production environment
2. **Database Backup**: Set up regular backups for your Supabase database
3. **Monitoring**: Implement logging and monitoring for the API endpoints
4. **Caching**: Consider implementing Redis caching for frequently accessed data

## Next Steps

1. Integrate the session management with your existing chat flow
2. Add real-time updates using Supabase real-time subscriptions
3. Implement message search functionality
4. Add support for file attachments and rich media
5. Create admin endpoints for session management

For detailed API documentation, see [API_ENDPOINTS.md](./API_ENDPOINTS.md).