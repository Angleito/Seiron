# Request/Response Logging Implementation Guide

This document describes the comprehensive request/response logging system implemented for the Seiron backend.

## 🎯 Overview

The logging system provides:
- **Request ID generation** for tracing requests across services
- **Comprehensive HTTP request/response logging** with morgan integration
- **Sensitive data filtering** to protect passwords, API keys, etc.
- **Performance timing** for request duration tracking
- **Error request logging** with full context
- **Integration with existing winston logger**

## 📦 Components

### 1. Dependencies Added

- `morgan`: HTTP request logger middleware
- `@types/morgan`: TypeScript definitions for morgan

### 2. Files Created/Modified

```
backend/
├── src/
│   ├── middleware/
│   │   ├── requestLogger.ts              # 🆕 Main logging middleware
│   │   └── __tests__/
│   │       ├── requestLogger.test.ts      # 🆕 Unit tests
│   │       └── requestLogger.integration.test.ts # 🆕 Integration tests
│   ├── utils/
│   │   └── logger.ts                     # ✅ Enhanced with request ID support
│   ├── types/
│   │   └── express.d.ts                  # ✅ Added request logging types
│   ├── services/
│   │   └── LoggingService.ts             # ✅ Enhanced LogContext for flexibility
│   └── server.ts                         # ✅ Integrated logging middleware
└── package.json                          # ✅ Added morgan dependencies
```

## 🔧 Implementation Details

### Middleware Stack Order

The middleware is applied in the correct order in `server.ts`:

```typescript
// Request ID and logging middleware (before everything else)
app.use(requestIdMiddleware);
app.use(requestCompletionLogger);

// HTTP request logging
app.use(createMorganMiddleware());

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded());

// Request/Response body logging (after body parsing)
app.use(requestBodyLogger);

// Routes...

// Error handling
app.use(errorRequestLogger);
app.use(errorHandler);
```

### Features

#### 1. Request ID Tracing
- Unique UUID generated for each request
- Added to `X-Request-ID` response header
- Available in `req.requestId` throughout the request lifecycle

#### 2. Sensitive Data Filtering
Automatically filters sensitive fields from request/response bodies:
```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'apiKey', 'privateKey', 'secret',
  'authorization', 'cookie', 'session', 'mnemonic', 'seed'
];
```

#### 3. Performance Timing
- Tracks request start time
- Logs total request duration
- Available in request completion logs

#### 4. Environment-Specific Behavior
- **Development**: Colorized console output with readable format
- **Production**: Structured JSON logging for log aggregation

### Log Outputs

#### Request Log
```json
{
  "timestamp": "2025-01-05 10:30:45.123",
  "level": "info",
  "message": "HTTP Request",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "url": "/api/chat",
  "path": "/api/chat",
  "query": {},
  "headers": { "user-agent": "..." },
  "body": { "message": "...", "password": "[FILTERED]" },
  "ip": "127.0.0.1",
  "walletAddress": "sei1..."
}
```

#### Response Log
```json
{
  "timestamp": "2025-01-05 10:30:45.789",
  "level": "info",
  "message": "HTTP Request Completed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "url": "/api/chat",
  "statusCode": 200,
  "performance": { "duration": 234 },
  "contentLength": "1024",
  "walletAddress": "sei1..."
}
```

#### Error Log
```json
{
  "timestamp": "2025-01-05 10:30:45.456",
  "level": "error",
  "message": "HTTP Request Error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "name": "ValidationError",
    "message": "Invalid wallet address",
    "stack": "..."
  },
  "request": {
    "method": "POST",
    "url": "/api/portfolio",
    "headers": { ... },
    "body": { ... },
    "ip": "127.0.0.1"
  },
  "performance": { "duration": 123 }
}
```

## 📁 Log File Organization

Logs are written to the `/logs` directory:

```
logs/
├── combined.log      # All logs (rotated, 10MB max, 10 files)
├── error.log         # Error logs only (rotated, 10MB max, 10 files)
└── requests.log      # HTTP request logs (rotated, 10MB max, 10 files)
```

## 🧪 Testing

The implementation includes comprehensive tests:

### Unit Tests (`requestLogger.test.ts`)
- Request ID generation
- Sensitive data filtering
- Request/response logging
- Error logging

### Integration Tests (`requestLogger.integration.test.ts`)
- End-to-end request flow
- Morgan middleware integration
- Performance timing
- Error handling

Run tests:
```bash
npm test -- middleware.*requestLogger
```

## 🔍 Debugging Benefits

### Request Tracing
- Each request has a unique ID that can be traced through logs
- Easy to correlate frontend requests with backend processing
- Request ID is returned in response headers for client-side correlation

### Performance Monitoring
- Request duration tracking helps identify slow endpoints
- Performance data included in completion logs

### Error Context
- Full request context captured when errors occur
- Stack traces and request details for debugging
- Sensitive data automatically filtered from error logs

### Log Aggregation Ready
- Structured JSON format in production
- Compatible with log aggregation tools like ELK stack, Datadog, etc.
- Consistent field naming for easy querying

## 🚀 Usage Examples

### Accessing Request ID in Route Handlers
```typescript
app.get('/api/test', (req, res) => {
  const requestId = req.requestId; // Available in all requests
  
  // Use in service calls for correlation
  await someService.process({ requestId, ...data });
  
  res.json({ requestId, result: 'success' });
});
```

### Custom Logging with Request Context
```typescript
import logger from '../utils/logger';

app.post('/api/process', (req, res) => {
  const { requestId } = req;
  
  logger.info('Processing started', { 
    requestId, 
    userId: req.body.userId 
  });
  
  // ... processing
  
  logger.info('Processing completed', { 
    requestId, 
    duration: Date.now() - req.startTime 
  });
});
```

## 🔒 Security Features

- **Automatic sensitive data filtering** prevents accidental logging of passwords, API keys, etc.
- **Request size limits** prevent logging of extremely large payloads
- **Health check filtering** option to reduce log noise in production
- **IP address logging** for security auditing

## ⚡ Performance Considerations

- **Minimal overhead**: Simple UUID generation and timestamp recording
- **Lazy logging**: Response body logging only for API routes
- **Log rotation**: Automatic file rotation prevents disk space issues
- **Async logging**: Winston handles log writing asynchronously

The logging system is now fully integrated and ready for production use!