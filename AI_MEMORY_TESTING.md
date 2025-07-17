# AI Memory System Testing & Monitoring Guide

This guide provides comprehensive instructions for testing, deploying, and monitoring the AI memory system with localStorage fallback functionality.

## 1. Local Testing Steps

### Running the Development Server

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# The app will be available at http://localhost:3000
```

### Simulating 404 Errors

To test the localStorage fallback mechanism:

1. **Temporary API Route Modification**
   ```typescript
   // In app/api/ai-memory/route.ts, temporarily add:
   export async function GET() {
     return new Response('Not Found', { status: 404 });
   }
   ```

2. **Network Tab Simulation**
   - Open Chrome DevTools → Network tab
   - Right-click on the AI memory request
   - Select "Block request URL"
   - Refresh the page to trigger fallback

3. **Backend Service Simulation**
   ```bash
   # Stop the backend service if running separately
   # Or modify the NEXT_PUBLIC_BACKEND_URL to point to non-existent server
   NEXT_PUBLIC_BACKEND_URL=http://localhost:9999 npm run dev
   ```

### Verifying localStorage Fallback

1. **DevTools Console Checks**
   ```javascript
   // Check if data is stored in localStorage
   localStorage.getItem('ai_memory_backup')
   
   // Verify the structure
   JSON.parse(localStorage.getItem('ai_memory_backup'))
   ```

2. **Application Tab Inspection**
   - Open DevTools → Application → Local Storage
   - Look for `ai_memory_backup` key
   - Verify timestamp and data structure

3. **Network Failure Test**
   ```javascript
   // In browser console, before making requests:
   window.fetch = () => Promise.reject(new Error('Network failed'));
   // Reload the page and verify fallback works
   ```

### Browser DevTools Checks

1. **Console Monitoring**
   - Look for: `[AI Memory] Using localStorage fallback`
   - Check for any error messages
   - Verify successful save messages

2. **Network Tab**
   - Monitor `/api/ai-memory` requests
   - Check response status codes
   - Verify retry attempts (if implemented)

3. **Performance Tab**
   - Check for memory leaks during repeated saves
   - Monitor localStorage write performance
   - Verify no blocking operations

## 2. Vercel Deployment Testing

### Pre-deployment Checklist

- [ ] All environment variables are set in Vercel dashboard
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `NEXT_PUBLIC_BACKEND_URL` (if using external backend)
  
- [ ] Build passes locally: `npm run build`
- [ ] Type checking passes: `npm run type-check`
- [ ] No console errors in development mode
- [ ] localStorage fallback tested thoroughly
- [ ] API routes return proper status codes

### Verifying Route Deployment

1. **Check Build Output**
   ```bash
   # During deployment, verify in Vercel logs:
   # ✓ app/api/ai-memory/route.ts
   ```

2. **Direct API Testing**
   ```bash
   # Test the API endpoint directly
   curl https://your-app.vercel.app/api/ai-memory
   
   # Test POST endpoint
   curl -X POST https://your-app.vercel.app/api/ai-memory \
     -H "Content-Type: application/json" \
     -d '{"messages":[],"timestamp":"2025-01-17T12:00:00Z"}'
   ```

3. **Function Verification**
   - Go to Vercel Dashboard → Functions tab
   - Look for `api/ai-memory` function
   - Check if it's listed and active

### Vercel Function Logs

1. **Access Logs**
   - Vercel Dashboard → Functions → `api/ai-memory`
   - Click "View Function Logs"
   - Or use Vercel CLI: `vercel logs`

2. **Key Log Patterns**
   ```
   # Success patterns
   [GET] /api/ai-memory - 200
   [POST] /api/ai-memory - 200
   
   # Error patterns to watch
   [ERROR] KV connection failed
   [ERROR] Invalid request body
   ```

### Browser Console Checks After Deployment

```javascript
// Test API connectivity
fetch('/api/ai-memory')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Failed:', e));

// Verify localStorage backup
const backup = localStorage.getItem('ai_memory_backup');
console.log('Backup exists:', !!backup);
console.log('Backup age:', backup ? new Date() - new Date(JSON.parse(backup).timestamp) : 'N/A');
```

## 3. Monitoring Setup

### Vercel Function Logs

1. **Real-time Monitoring**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Stream logs
   vercel logs --follow
   
   # Filter for AI memory logs
   vercel logs --follow | grep "ai-memory"
   ```

2. **Dashboard Monitoring**
   - Set up Vercel Analytics
   - Monitor function invocations
   - Track error rates and response times

### Key Error Patterns to Watch

1. **KV Store Errors**
   ```
   ECONNREFUSED - KV store unreachable
   401 Unauthorized - Invalid KV credentials
   503 Service Unavailable - KV store down
   ```

2. **API Route Errors**
   ```
   404 Not Found - Route not deployed
   500 Internal Server Error - Code error
   413 Payload Too Large - Message history too big
   ```

3. **Client-Side Errors**
   ```
   Failed to fetch - Network issues
   localStorage quota exceeded - Storage full
   JSON parse error - Corrupted data
   ```

### Performance Metrics to Track

1. **API Performance**
   - Response time p50, p95, p99
   - Success rate percentage
   - Error rate by type
   - Request volume

2. **localStorage Performance**
   - Read/write speeds
   - Storage usage percentage
   - Fallback activation frequency
   - Data sync success rate

3. **User Experience Metrics**
   - Time to first memory load
   - Save operation latency
   - Fallback user percentage
   - Error recovery time

### Alerts to Set Up

1. **Vercel Alerts**
   ```javascript
   // vercel.json
   {
     "functions": {
       "app/api/ai-memory/route.ts": {
         "maxDuration": 10
       }
     }
   }
   ```

2. **Custom Monitoring Script**
   ```javascript
   // monitoring/check-ai-memory.js
   const checkEndpoint = async () => {
     try {
       const response = await fetch('https://your-app.vercel.app/api/ai-memory');
       if (!response.ok) {
         // Send alert (email, Slack, etc.)
         console.error('AI Memory endpoint down:', response.status);
       }
     } catch (error) {
       // Send critical alert
       console.error('AI Memory endpoint unreachable:', error);
     }
   };
   
   // Run every 5 minutes
   setInterval(checkEndpoint, 5 * 60 * 1000);
   ```

## 4. Troubleshooting Guide

### Common Issues and Solutions

1. **404 Errors on `/api/ai-memory`**
   - **Check**: Route file exists at `app/api/ai-memory/route.ts`
   - **Check**: Exports are named correctly (GET, POST)
   - **Fix**: Redeploy with `vercel --prod`
   - **Verify**: Check Functions tab in Vercel dashboard

2. **KV Store Connection Failures**
   - **Check**: Environment variables in Vercel
   - **Test**: Use KV CLI to verify credentials
   - **Fix**: Regenerate KV tokens if needed
   - **Fallback**: Ensure localStorage backup works

3. **localStorage Quota Exceeded**
   - **Check**: Current usage with `navigator.storage.estimate()`
   - **Fix**: Implement data cleanup for old memories
   - **Solution**: Compress data before storing
   - **Alternative**: Use IndexedDB for larger storage

### Debugging 404 Errors

1. **Local Development**
   ```bash
   # Check if route file exists
   ls -la app/api/ai-memory/
   
   # Verify Next.js recognizes the route
   npm run build
   # Look for: ✓ app/api/ai-memory/route
   ```

2. **Production Debugging**
   ```javascript
   // Check if route is accessible
   fetch('/api/ai-memory')
     .then(r => console.log('Status:', r.status, 'Headers:', r.headers))
     .catch(e => console.error('Error:', e));
   
   // Check Vercel function logs
   // Dashboard → Functions → Logs
   ```

### Verifying KV Store Connection

1. **Test Connection**
   ```bash
   # Using Vercel CLI
   vercel env pull
   
   # Test with curl
   curl -H "Authorization: Bearer $KV_REST_API_TOKEN" \
     $KV_REST_API_URL/get/ai_memory
   ```

2. **Debug in Code**
   ```typescript
   // Add temporary debug logging
   console.log('KV URL:', process.env.KV_REST_API_URL);
   console.log('KV Token exists:', !!process.env.KV_REST_API_TOKEN);
   ```

### Rollback Procedures

1. **Immediate Rollback**
   ```bash
   # List deployments
   vercel list
   
   # Rollback to previous deployment
   vercel rollback [deployment-url]
   ```

2. **Feature Flag Rollback**
   ```typescript
   // Add feature flag for quick disable
   const USE_AI_MEMORY = process.env.NEXT_PUBLIC_USE_AI_MEMORY !== 'false';
   
   if (!USE_AI_MEMORY) {
     return { messages: [] };
   }
   ```

3. **Data Recovery**
   ```javascript
   // Client-side recovery script
   const recoverFromLocalStorage = () => {
     const backup = localStorage.getItem('ai_memory_backup');
     if (backup) {
       const data = JSON.parse(backup);
       // Send to alternative endpoint or email
       console.log('Recovered data:', data);
       return data;
     }
   };
   ```

## Quick Reference Commands

```bash
# Local testing
npm run dev
npm run build
npm run type-check

# Vercel deployment
vercel
vercel --prod
vercel logs --follow

# Debugging
curl http://localhost:3000/api/ai-memory
curl https://your-app.vercel.app/api/ai-memory

# KV Store testing
curl -H "Authorization: Bearer $KV_REST_API_TOKEN" $KV_REST_API_URL/keys

# Monitor function
vercel logs --follow | grep -E "(ERROR|WARN|ai-memory)"
```

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Next.js Discord**: https://nextjs.org/discord
- **Internal Team**: [Your team contact info]

Remember: The localStorage fallback ensures users never lose their AI conversation history, even during service disruptions. Always test both happy path and failure scenarios before deploying to production.