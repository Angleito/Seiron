# WebSocket Comprehensive Logging Implementation

This document describes the comprehensive WebSocket logging system implemented for the Seiron backend, designed to help debug real-time communication issues between frontend and backend.

## 🚀 Overview

The WebSocket logging system provides detailed insights into:
- Connection and disconnection events
- Message routing and delivery
- Performance metrics
- Error tracking and debugging
- Rate limiting and security events
- Health monitoring

## 🏗️ Architecture

### Core Components

1. **Enhanced SocketService** (`/src/services/SocketService.ts`)
   - Comprehensive connection tracking
   - Performance monitoring
   - Message delivery logging
   - Health status reporting

2. **WebSocket Middleware** (`/src/middleware/websocketMiddleware.ts`)
   - Authentication logging
   - Rate limiting with detailed logs
   - Error handling and recovery
   - Security event tracking

3. **Monitoring API** (`/src/routes/websocket.ts`)
   - Real-time metrics endpoints
   - Connection debugging tools
   - Health status monitoring
   - Administrative controls

## 📊 Logging Features

### Connection Logging

Every WebSocket connection is comprehensively logged with:

```typescript
interface SocketConnectionInfo {
  id: string;                    // Unique socket ID
  walletAddress?: string;        // Associated wallet
  connectedAt: Date;            // Connection timestamp
  lastActivity: Date;           // Last message/activity
  messageCount: number;         // Total messages sent/received
  errorCount: number;           // Total errors encountered
  userAgent?: string;           // Client browser/app info
  ipAddress?: string;           // Client IP (sanitized in logs)
  rooms: string[];              // Socket.io rooms joined
}
```

### Message Tracking

All WebSocket messages are tracked with:
- Event name and payload size
- Delivery success/failure status
- Performance metrics (response time)
- Client context (wallet address, socket ID)
- Timestamp and request correlation

### Performance Metrics

Real-time performance monitoring includes:

```typescript
interface WebSocketMetrics {
  totalConnections: number;           // Lifetime connection count
  activeConnections: number;          // Current active connections
  totalMessages: number;              // Total messages processed
  messagesByType: Record<string, number>; // Message counts by type
  errorCount: number;                 // Total error count
  avgResponseTime: number;            // Average response time
  connectionsPerUser: Record<string, number>; // Connections per wallet
  roomStats: Record<string, number>;  // Members per room
  reconnectionAttempts: number;       // Failed reconnection count
  lastActivity: Date;                 // Last system activity
}
```

## 🔧 Configuration

### Rate Limiting Configuration

```typescript
const wsMiddleware = createWebSocketMiddleware({
  rateLimitConfig: {
    maxMessages: 100,           // Max messages per window
    windowMs: 60000,           // Rate limit window (1 minute)
    maxConnections: 10,        // Max connections per IP
    connectionWindowMs: 60000  // Connection window (1 minute)
  },
  enableAuthLogging: true,      // Log authentication events
  enableRateLimitLogging: true, // Log rate limit violations
  enableErrorLogging: true,     // Log all errors
  enablePerformanceLogging: true // Log performance metrics
});
```

### Dragon Ball Z Themed Logging

All logs follow the project's Dragon Ball Z theme with appropriate emoji and terminology:

- 🐉 Connection events: "Dragon warrior connected"
- ⚡ Message routing: "Power level update transmitted"
- 💥 Errors: "Critical hit detected"
- 🔥 Performance issues: "Energy levels critical"

## 📈 Monitoring Endpoints

### GET /api/websocket/metrics
Returns comprehensive WebSocket metrics and health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "activeConnections": 42,
      "totalMessages": 1337,
      "errorCount": 3,
      "avgResponseTime": 15.6,
      "messagesByType": {
        "chat_message": 856,
        "portfolio_update": 481
      }
    },
    "health": {
      "status": "healthy",
      "issues": []
    }
  }
}
```

### GET /api/websocket/connections
Lists all active WebSocket connections with sanitized information.

### GET /api/websocket/connection/:socketId
Detailed information about a specific connection.

### GET /api/websocket/user/:walletAddress/stats
Connection statistics for a specific user.

### POST /api/websocket/user/:walletAddress/disconnect
Force disconnect all sockets for a user (debugging tool).

### GET /api/websocket/health
Health check endpoint with HTTP status codes:
- 200: Healthy
- 206: Degraded performance
- 503: Unhealthy

## 🐛 Debugging Features

### Real-time Connection Health

The system automatically monitors connection health:
- Sends ping every 5 minutes of inactivity
- Tracks response times and error rates
- Identifies stale or problematic connections

### Message Delivery Tracking

Every message emission is tracked:
- Success/failure status
- Delivery confirmation
- Error details and context
- Performance impact

### Room Management Logging

Socket.io room operations are comprehensively logged:
- Room joins/leaves with member counts
- Room-specific message routing
- Room health and activity tracking

## 🧪 Testing

### Running the Test Suite

```bash
# Run WebSocket logging tests
npm run ts-node src/scripts/testWebSocketLogging.ts
```

The test script validates:
- Authentication middleware
- Rate limiting functionality
- Message routing and delivery
- Performance monitoring
- Error handling
- Metrics collection

### Test Scenarios

1. **Valid Authentication**: Tests successful wallet-based auth
2. **Invalid Authentication**: Tests rejection of invalid wallets
3. **Rate Limiting**: Tests message throttling
4. **Room Management**: Tests portfolio room joins
5. **Performance Monitoring**: Tests metrics collection
6. **Error Handling**: Tests error tracking and recovery

## 📋 Common Debugging Scenarios

### Scenario 1: Messages Not Reaching Client

**Debugging Steps:**
1. Check `/api/websocket/metrics` for delivery failures
2. Review connection status in `/api/websocket/connections`
3. Verify room membership in connection details
4. Check rate limiting violations

**Log Patterns to Look For:**
```
[SocketService] Failed to emit portfolio update to socket
[WebSocketMiddleware] Message rate limit exceeded
[SocketService] No active sockets for portfolio update
```

### Scenario 2: High Error Rates

**Debugging Steps:**
1. Check `/api/websocket/health` for system status
2. Review error counts in metrics
3. Identify problematic connections
4. Check for authentication failures

**Log Patterns to Look For:**
```
[WebSocketMiddleware] Authentication failed - invalid wallet format
[SocketService] Message delivery failed
[WebSocketMiddleware] Connection rate limit exceeded
```

### Scenario 3: Performance Issues

**Debugging Steps:**
1. Monitor `avgResponseTime` in metrics
2. Check active connection counts
3. Review message volumes by type
4. Identify slow or unresponsive connections

**Log Patterns to Look For:**
```
[SocketService] Slow response times detected
[WebSocketMiddleware] High message volume detected
[SocketService] Cleaned up stale performance timer
```

## 🔐 Security Considerations

### Data Sanitization

All monitoring endpoints sanitize sensitive information:
- Wallet addresses are truncated: `0x1234...7890`
- IP addresses are partially masked: `192.168.x.x`
- User agents are logged for debugging but not exposed in APIs

### Rate Limiting

Multiple layers of rate limiting protect against abuse:
- Connection limits per IP address
- Message limits per socket
- Automatic disconnection of abusive connections

### Authentication

All WebSocket connections require valid wallet authentication:
- Wallet address format validation
- Session tracking and management
- Automatic cleanup of invalid sessions

## 📚 Best Practices

### For Developers

1. **Always check connection status** before emitting messages
2. **Use the rate-limited handlers** for all message processing
3. **Log context information** with wallet addresses and socket IDs
4. **Monitor performance metrics** regularly
5. **Handle errors gracefully** with proper client feedback

### For Operations

1. **Monitor the health endpoint** for system status
2. **Set up alerts** for high error rates or connection counts
3. **Review metrics regularly** to identify trends
4. **Use debugging endpoints** to troubleshoot user issues
5. **Keep logs for analysis** but respect privacy requirements

## 🔮 Future Enhancements

Planned improvements include:
- Real-time dashboard for WebSocket monitoring
- Advanced analytics and trend analysis
- Integration with external monitoring systems
- Automated alerting for critical issues
- Enhanced performance profiling

## 📞 Support

For questions or issues with WebSocket logging:
1. Check the monitoring endpoints for real-time status
2. Review logs for specific error patterns
3. Use the test script to validate functionality
4. Consult this documentation for debugging guidance

Remember: The dragon sees all connections and messages! 🐉⚡