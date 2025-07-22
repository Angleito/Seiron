# Frontend Security Migration Guide

## Overview

This document outlines the security migration that removes direct OpenAI API calls from the frontend and routes them through the secure backend service instead.

## What Changed

### Before (Security Issues)
- Frontend API routes (`/app/api/chat/orchestrate/route.ts`, `/app/api/chat/route.ts`, `/app/api/ai/chat/route.ts`) made direct OpenAI API calls
- OpenAI API keys were required in frontend environment variables
- API keys were exposed in the client-side Next.js environment
- Direct AI model access from frontend code

### After (Secure Implementation)
- All AI operations are proxied through the backend service
- Frontend routes forward requests to secure backend endpoints
- No API keys in frontend environment
- Backend service handles all OpenAI/AI provider interactions
- Enhanced security with proper API key isolation

## Technical Changes

### 1. API Route Updates

#### `/app/api/chat/orchestrate/route.ts`
- **Before**: Direct OpenAI client initialization and API calls
- **After**: Forwards requests to `${BACKEND_URL}/api/chat/orchestrate-v2`
- Maintains compatibility with existing frontend components

#### `/app/api/chat/route.ts`
- **Before**: Direct OpenAI streaming and non-streaming responses
- **After**: Proxies requests to backend with stream forwarding support
- Handles both streaming and non-streaming responses

#### `/app/api/ai/chat/route.ts`
- **Before**: Direct OpenAI and Anthropic model access
- **After**: Routes all AI requests through backend service
- Note: Streaming temporarily disabled for backend proxy (returns 501)

### 2. Client Library Updates

#### New Backend API Client (`/app/lib/api/client.ts`)
```typescript
// New secure backend API client
export const secureBackendApi = {
  chat: {
    orchestrate: (params) => backendApi.post('/api/chat/orchestrate-v2', params),
    message: (params) => backendApi.post('/api/chat/message', params),
    history: (walletAddress, page, pageSize) => backendApi.get(`/api/chat/history?...`),
  },
  // ... other methods
};
```

### 3. Environment Variable Changes

#### Frontend Environment (`.env.local`)
```bash
# Required
NEXT_PUBLIC_BACKEND_URL=https://your-backend-service.railway.app

# Remove these (now handled by backend):
# OPENAI_API_KEY=...  # REMOVED
# ANTHROPIC_API_KEY=... # REMOVED
```

#### Backend Environment (unchanged)
```bash
# Backend continues to handle these securely
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
# ... other backend vars
```

### 4. MCP Integration Updates

The MCP (Model Context Protocol) integration has been updated to use the backend service:
- MCP orchestrate wrapper now forwards to backend
- Context gathering handled by backend MCP servers
- Frontend no longer has direct MCP client dependencies

## Migration Steps

### For Development

1. **Update Environment Variables**:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
   
   # Remove from frontend .env.local
   # OPENAI_API_KEY=...
   # ANTHROPIC_API_KEY=...
   ```

2. **Ensure Backend is Running**:
   ```bash
   cd backend
   npm run dev
   # Backend should be running on localhost:3001
   ```

3. **Start Frontend**:
   ```bash
   npm run dev
   # Frontend will proxy AI requests to backend
   ```

### For Production

1. **Deploy Backend Service First**:
   - Backend service must be deployed and accessible
   - Note the backend service URL (e.g., Railway deployment URL)

2. **Configure Frontend Environment**:
   ```bash
   # Set in Vercel/deployment platform
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-service.railway.app
   ```

3. **Deploy Frontend**:
   - Remove OpenAI API keys from frontend environment
   - All AI operations will route through secure backend

## Benefits

### Security
- ✅ API keys no longer exposed in frontend
- ✅ Server-side only AI provider access
- ✅ Proper API key isolation
- ✅ Enhanced request validation

### Architecture
- ✅ Clear separation of concerns
- ✅ Centralized AI operations in backend
- ✅ Consistent error handling
- ✅ Better monitoring and logging

### Scalability
- ✅ Backend can handle rate limiting
- ✅ Centralized caching
- ✅ Better resource management
- ✅ Load balancing capabilities

## Testing

### 1. Health Check
```bash
curl http://localhost:3000/api/health
# Should not show OPENAI_API_KEY in required environment variables
```

### 2. Chat Functionality
```javascript
// Test orchestrate endpoint
fetch('/api/chat/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello Seiron',
    sessionId: 'test-session'
  })
});
```

### 3. Backend Connectivity
```javascript
// Direct backend API test
import { secureBackendApi } from '@/app/lib/api/client';

const response = await secureBackendApi.health();
// Should return backend health status
```

## Troubleshooting

### Common Issues

1. **Backend URL Not Set**:
   ```
   Error: Backend request failed: fetch failed
   ```
   **Solution**: Set `NEXT_PUBLIC_BACKEND_URL` in environment

2. **Backend Service Down**:
   ```
   Error: ECONNREFUSED
   ```
   **Solution**: Ensure backend service is running and accessible

3. **API Key Errors**:
   ```
   Error: Missing OpenAI API key
   ```
   **Solution**: Verify backend has proper API keys configured

### Debug Mode

Set `NODE_ENV=development` to see additional error details in API responses.

## Security Verification

✅ **No API keys in frontend bundle**
✅ **No direct AI provider calls from browser**
✅ **All sensitive operations server-side**
✅ **Proper error message sanitization**

## Rollback Plan

If issues occur, you can temporarily restore direct OpenAI usage by:
1. Adding `OPENAI_API_KEY` back to frontend environment
2. Reverting the API route changes
3. However, this is NOT recommended for security reasons

## Future Enhancements

- [ ] Streaming support through backend proxy
- [ ] WebSocket-based real-time AI interactions
- [ ] Enhanced error recovery
- [ ] Request/response caching
- [ ] Analytics and monitoring integration