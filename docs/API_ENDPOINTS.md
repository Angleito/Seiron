# Chat API Endpoints Documentation

This document describes the new chat API endpoints for managing chat sessions and message history.

## Setup

### Environment Variables

Add these environment variables to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For enhanced security
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Schema

The API uses the following tables in your Supabase database:

```sql
-- Execute this in your Supabase SQL editor
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
```

## API Endpoints

### 1. Get Chat Messages

Retrieve chat history for a specific session with pagination support.

**Endpoint:** `GET /api/messages/[sessionId]`

**Headers:**
- `x-user-id` or `user-id`: User identifier (required)
- `Content-Type`: `application/json`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Number of messages per page (default: 20, max: 100)
- `cursor`: Cursor for cursor-based pagination (optional)
- `order`: Sort order - 'asc' or 'desc' (default: 'desc')

**Example Request:**
```bash
curl -X GET "https://yourdomain.com/api/messages/123e4567-e89b-12d3-a456-426614174000?page=1&limit=20&order=desc" \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "session": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My Chat Session",
    "created_at": "2023-12-01T10:00:00Z",
    "updated_at": "2023-12-01T10:30:00Z",
    "last_message_at": "2023-12-01T10:30:00Z"
  },
  "messages": [
    {
      "id": "msg-123",
      "role": "user",
      "content": "Hello, how are you?",
      "metadata": {},
      "created_at": "2023-12-01T10:00:00Z",
      "sequence_number": 1
    },
    {
      "id": "msg-124",
      "role": "assistant",
      "content": "I'm doing well, thank you!",
      "metadata": {},
      "created_at": "2023-12-01T10:00:30Z",
      "sequence_number": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false,
    "nextCursor": null
  }
}
```

### 2. List Chat Sessions

Get all chat sessions for a user with filtering and pagination.

**Endpoint:** `GET /api/sessions`

**Headers:**
- `x-user-id` or `user-id`: User identifier (required)
- `Content-Type`: `application/json`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Number of sessions per page (default: 20, max: 50)
- `search`: Search term for title/description (optional)
- `archived`: Show archived sessions - 'true' or 'false' (default: 'false')
- `order`: Sort order - 'asc' or 'desc' (default: 'desc')

**Example Request:**
```bash
curl -X GET "https://yourdomain.com/api/sessions?page=1&limit=10&search=ai&archived=false" \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "AI Discussion",
      "description": "Chat about AI capabilities",
      "created_at": "2023-12-01T10:00:00Z",
      "updated_at": "2023-12-01T10:30:00Z",
      "last_message_at": "2023-12-01T10:30:00Z",
      "metadata": {},
      "is_archived": false,
      "message_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "stats": {
    "total_sessions": 10,
    "active_sessions": 8,
    "archived_sessions": 2,
    "total_messages": 150
  },
  "filters": {
    "search": "ai",
    "archived": false
  }
}
```

### 3. Manage Chat Session

Create, update, get, or delete a chat session.

**Endpoint:** `GET|POST|DELETE /api/sessions/[sessionId]`

**Headers:**
- `x-user-id` or `user-id`: User identifier (required)
- `Content-Type`: `application/json`

#### Create New Session
**Method:** `POST`
**Endpoint:** `/api/sessions/new`

**Request Body:**
```json
{
  "title": "New Chat Session",
  "description": "Description of the chat session",
  "metadata": {
    "tags": ["ai", "productivity"],
    "priority": "high"
  }
}
```

**Example Request:**
```bash
curl -X POST "https://yourdomain.com/api/sessions/new" \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New AI Chat",
    "description": "Discussion about AI capabilities",
    "metadata": {"tags": ["ai", "technology"]}
  }'
```

#### Update Existing Session
**Method:** `POST`
**Endpoint:** `/api/sessions/[sessionId]`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "is_archived": false,
  "metadata": {
    "tags": ["updated", "tag"]
  }
}
```

#### Get Session Details
**Method:** `GET`
**Endpoint:** `/api/sessions/[sessionId]`

**Example Response:**
```json
{
  "success": true,
  "session": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI Discussion",
    "description": "Chat about AI capabilities",
    "created_at": "2023-12-01T10:00:00Z",
    "updated_at": "2023-12-01T10:30:00Z",
    "last_message_at": "2023-12-01T10:30:00Z",
    "metadata": {},
    "is_archived": false,
    "message_count": 5
  }
}
```

#### Delete Session
**Method:** `DELETE`
**Endpoint:** `/api/sessions/[sessionId]`

**Example Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional error details if applicable"]
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created (for new sessions)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid user ID)
- `404`: Not Found (session not found)
- `405`: Method Not Allowed
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error

## Rate Limiting

Each endpoint has specific rate limits:
- `/api/messages/[sessionId]`: 50 requests per minute
- `/api/sessions`: 30 requests per minute
- `/api/sessions/[sessionId]`: 20 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Security Features

1. **Row Level Security (RLS)**: Users can only access their own data
2. **Input Sanitization**: All text inputs are sanitized
3. **Rate Limiting**: Prevents abuse
4. **Security Headers**: CSRF, XSS, and other attack prevention
5. **Validation**: Comprehensive input validation

## Frontend Integration

### React Hook Example

```typescript
// hooks/useChat.ts
import { useState, useEffect } from 'react';

export const useChat = (userId: string) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions?page=${page}&limit=${limit}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData) => {
    try {
      const response = await fetch('/api/sessions/new', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchSessions(); // Refresh sessions
        return data.session;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getMessages = async (sessionId, page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/messages/${sessionId}?page=${page}&limit=${limit}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    getMessages
  };
};
```

### Usage Example

```typescript
// components/ChatHistory.tsx
import React, { useEffect } from 'react';
import { useChat } from '../hooks/useChat';

const ChatHistory = ({ userId }: { userId: string }) => {
  const { sessions, loading, error, fetchSessions, getMessages } = useChat(userId);

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Chat History</h2>
      {sessions.map(session => (
        <div key={session.id} className="session-item">
          <h3>{session.title}</h3>
          <p>{session.description}</p>
          <small>Messages: {session.message_count}</small>
          <button onClick={() => getMessages(session.id)}>
            Load Messages
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;
```

## Testing

You can test the endpoints using the provided example requests or create automated tests:

```javascript
// test/api.test.js
describe('Chat API', () => {
  const userId = 'test-user-123';
  const baseUrl = 'http://localhost:3000';

  test('should create a new session', async () => {
    const response = await fetch(`${baseUrl}/api/sessions/new`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Session',
        description: 'Test description'
      })
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.session.title).toBe('Test Session');
  });

  test('should list sessions', async () => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      headers: {
        'x-user-id': userId,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.sessions)).toBe(true);
  });
});
```

## Monitoring and Logging

The API includes comprehensive logging:

- Request/response logging
- Error tracking
- Performance metrics
- Rate limiting statistics

Monitor the logs in your deployment environment for API usage patterns and potential issues.

## Production Considerations

1. **Database Performance**: Ensure proper indexing for large datasets
2. **Caching**: Implement Redis caching for frequently accessed data
3. **Monitoring**: Set up alerts for error rates and performance metrics
4. **Backup**: Regular database backups
5. **Security**: Regular security audits and updates

## Troubleshooting

### Common Issues

1. **"Missing user ID"**: Ensure the `x-user-id` header is set
2. **"Session not found"**: Check that the session ID exists and belongs to the user
3. **"Rate limit exceeded"**: Reduce request frequency or implement exponential backoff
4. **"Database connection failed"**: Check Supabase configuration and connection

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and logging.