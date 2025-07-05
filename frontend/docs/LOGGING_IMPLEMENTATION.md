# Frontend API and WebSocket Logging Implementation

This document outlines the comprehensive frontend logging system implemented to help debug frontend-backend communication issues.

## Overview

The logging system provides structured, performance-aware logging for:
- HTTP requests and responses with full details
- WebSocket connections, messages, and events
- Performance timing and metrics
- Error tracking and serialization
- Request/response correlation

## Key Components

### 1. Enhanced Logger (`frontend/lib/logger.ts`)

#### Features Added:
- **Structured Logging**: JSON-formatted logs with consistent fields
- **Performance Timing**: Built-in timing utilities with metadata
- **Error Serialization**: Proper error object serialization for logging
- **Request/Response Tracking**: Full HTTP request lifecycle logging
- **WebSocket Event Logging**: Comprehensive WebSocket activity tracking
- **Browser Console Formatting**: Development-friendly console output

#### New Types:
```typescript
interface PerformanceTimer {
  id: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

interface RequestLogData {
  requestId: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  statusText?: string
  response?: unknown
  error?: Error
  retryCount?: number
}

interface WebSocketLogData {
  connectionId: string
  event: 'connect' | 'disconnect' | 'message' | 'error' | 'reconnect'
  url?: string
  data?: unknown
  error?: Error
  timestamp: number
  sessionId?: string
  attemptNumber?: number
}
```

#### New Methods:
- `logRequest(requestData)` - Log HTTP request initiation
- `logResponse(requestId, responseData)` - Log HTTP response
- `logWebSocket(wsData)` - Log WebSocket events
- `time(label, metadata)` - Start performance timer with metadata
- `timeEnd(label, metadata)` - End timer and return duration
- `getRequestLog(requestId)` - Retrieve specific request log
- `getAllRequestLogs()` - Get all request logs
- `getActiveTimers()` - Get active performance timers

### 2. Enhanced Orchestrator Client (`frontend/lib/orchestrator-client.ts`)

#### Features Added:
- **Request Wrapper**: `makeRequest<T>()` method with automatic logging
- **Request ID Generation**: Unique request IDs for correlation
- **Performance Tracking**: Automatic timing for all requests
- **Error Handling**: Comprehensive error logging and serialization
- **Request Headers**: Automatic addition of tracking headers

#### Example Usage:
```typescript
// All requests now automatically logged
const result = await this.makeRequest<TaskResult>(
  `${this.config.apiEndpoint}/process-intent`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent }),
  },
  'PROCESS_INTENT' // Context for logging
)
```

### 3. Enhanced WebSocket Manager (`frontend/lib/services/WebSocketManager.ts`)

#### Features Added:
- **Connection ID Tracking**: Unique connection IDs for correlation
- **Message Counting**: Track total messages sent/received
- **Connection State Logging**: Detailed connection lifecycle events
- **Error Context**: Rich error information with connection details
- **Heartbeat Logging**: Detailed heartbeat send/receive tracking
- **Reconnection Logging**: Comprehensive reconnection attempt tracking

#### Log Categories:
- Connection establishment/failure
- Message send/receive with sizes and types
- Heartbeat send/failure
- Reconnection attempts with context
- Error events with full details

### 4. Enhanced Chat Stream Service (`frontend/components/chat/ChatStreamService.ts`)

#### Features Added:
- **Service ID Tracking**: Unique service instance IDs
- **Message Counter**: Track message processing counts
- **Request Correlation**: Link chat messages to HTTP requests
- **Event Logging**: Log all WebSocket events received
- **Performance Metrics**: Track message send/receive times
- **Error Context**: Rich error information for failures

#### Key Logging Points:
- Service initialization
- WebSocket connection management
- Message queue processing
- HTTP request/response cycles
- Event subscriptions and handling
- Service destruction

### 5. Request Interceptors (`frontend/lib/interceptors.ts`)

#### Utilities Provided:
- **`fetchWithLogging()`**: Enhanced fetch with automatic logging
- **`WebSocketEventLogger`**: Utility class for WebSocket event logging
- **`PerformanceTracker`**: Performance measurement utilities
- **`LoggedApiClient`**: Full-featured API client with logging

#### Example Usage:
```typescript
// Enhanced fetch with automatic logging
const response = await fetchWithLogging(
  '/api/data',
  { method: 'GET' },
  'DATA_FETCH'
)

// WebSocket event logging
const wsLogger = new WebSocketEventLogger(sessionId)
wsLogger.logConnect(wsUrl, true)
wsLogger.logMessage('incoming', data, 'agent-response')

// Performance tracking
const tracker = new PerformanceTracker('CHAT_SERVICE')
await tracker.measure('send-message', async () => {
  return sendMessageToAPI(message)
})

// API client with built-in logging
const client = new LoggedApiClient('/api')
const result = await client.post('/chat/orchestrate', { message })
```

## Log Structure

### HTTP Request Logs
```json
{
  "level": "info",
  "message": "HTTP POST /api/chat/orchestrate - 200 OK (245ms)",
  "requestId": "req_1234567890_abc123",
  "method": "POST",
  "url": "/api/chat/orchestrate",
  "status": 200,
  "duration": 245,
  "responseSize": 1024,
  "context": "CHAT_MESSAGE"
}
```

### WebSocket Event Logs
```json
{
  "level": "debug",
  "message": "WebSocket message received - ws_1234567890_def456",
  "connectionId": "ws_1234567890_def456",
  "event": "message",
  "sessionId": "session_123",
  "data": {
    "direction": "incoming",
    "messageType": "agent-response",
    "messageSize": 512,
    "messageCount": 15
  }
}
```

### Performance Timer Logs
```json
{
  "level": "debug",
  "message": "Performance timer completed",
  "timerId": "CHAT_MESSAGE_5",
  "duration": 245.67,
  "metadata": {
    "serviceId": "chat_1234567890_xyz789",
    "sessionId": "session_123",
    "success": true
  }
}
```

## Configuration

### Logger Configuration
```typescript
const logger = Logger.getInstance({
  level: LogLevel.DEBUG,
  enableStructuredLogging: true,
  enablePerformanceTracking: true,
  enableRequestLogging: true,
  enableWebSocketLogging: true
})
```

### Interceptor Configuration
```typescript
const config: InterceptorConfig = {
  enableLogging: true,
  enablePerformanceTracking: true,
  logRequestBodies: true,
  logResponseBodies: true,
  logHeaders: true,
  maxBodySize: 1000
}
```

## Benefits

### Debugging Capabilities
1. **Request Correlation**: Link related requests/responses/events
2. **Performance Analysis**: Identify slow operations and bottlenecks
3. **Error Tracking**: Comprehensive error context and stack traces
4. **WebSocket Monitoring**: Track connection health and message flow
5. **Request Tracing**: Follow request lifecycle from initiation to completion

### Production Monitoring
1. **Performance Metrics**: Real-time performance data
2. **Error Rates**: Track API and WebSocket error frequencies
3. **Connection Health**: Monitor WebSocket connection stability
4. **User Experience**: Understand frontend-backend interaction patterns

### Development Workflow
1. **Console Debugging**: Rich development console output
2. **Log Filtering**: Filter logs by request ID, context, or component
3. **Performance Profiling**: Built-in timing for optimization
4. **Error Investigation**: Detailed error context for debugging

## Usage Examples

### Basic Request Logging
```typescript
// Automatic logging for all orchestrator requests
const result = await orchestrator.processIntent(intent)
// Logs: request initiation, response, performance timing

// Manual logging for custom requests
const requestId = logRequest({
  method: 'GET',
  url: '/api/custom',
  startTime: Date.now()
})

const response = await fetch('/api/custom')
logResponse(requestId, {
  status: response.status,
  response: await response.json()
})
```

### WebSocket Monitoring
```typescript
// Chat service automatically logs all WebSocket events
const chatService = new ChatStreamService(config)
// Logs: connection, messages, errors, reconnections

// Manual WebSocket logging
logWebSocket({
  connectionId: 'ws_123',
  event: 'connect',
  url: 'wss://api.example.com/chat',
  sessionId: 'session_456',
  timestamp: Date.now()
})
```

### Performance Tracking
```typescript
// Automatic performance tracking
time('API_CALL', { endpoint: '/chat/orchestrate' })
const result = await apiCall()
const duration = timeEnd('API_CALL', { success: true })

// Using performance tracker utility
const tracker = new PerformanceTracker('USER_ACTION')
await tracker.measure('process-intent', async () => {
  return processUserIntent(intent)
})
```

## Browser Console Output

The enhanced logger provides development-friendly console output:

```
[2024-01-15T10:30:45.123Z] [Seiron] [DEBUG] HTTP Request initiated
  {
    requestId: "req_1705312245123_abc123",
    method: "POST",
    url: "/api/chat/orchestrate",
    context: "CHAT_MESSAGE"
  }

[2024-01-15T10:30:45.368Z] [Seiron] [INFO] HTTP POST /api/chat/orchestrate - 200 OK (245ms)
  {
    requestId: "req_1705312245123_abc123",
    status: 200,
    duration: 245,
    responseSize: 1024
  }
```

## Log Storage and Retrieval

### Browser Storage
- Logs stored in localStorage (last 100 entries)
- Automatic cleanup of old entries
- Safe serialization with sensitive data filtering

### Retrieval Methods
```typescript
// Get specific request log
const requestLog = getRequestLog('req_1234567890_abc123')

// Get all request logs
const allLogs = getAllRequestLogs()

// Get stored logs from localStorage
const storedLogs = logger.getStoredLogs()
```

This comprehensive logging implementation provides full visibility into frontend-backend communication, enabling effective debugging and monitoring of the Seiron application.