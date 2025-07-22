# API Routing Configuration

This document explains the API routing structure and configuration for the Seiron project.

## API Structure

The project has two API structures:

### 1. Legacy API Routes (`/api/`)
Located in the `/api/` directory at the root level. These are standalone Vercel Functions:
- `/api/chat/orchestrate` - Main chat orchestration endpoint with MCP integration
- `/api/chat/send-message` - Direct message sending endpoint
- `/api/chat/memory` - Chat memory management
- `/api/chat/preferences` - User preferences management
- `/api/voice/synthesize` - Voice synthesis using ElevenLabs

### 2. App Router APIs (`/app/api/`)
Located in the `/app/api/` directory using Next.js App Router:
- `/app/api/ai/chat` - Modern chat endpoint
- `/app/api/auth/*` - Authentication endpoints
- `/app/api/portfolio` - Portfolio management
- `/app/api/voice/synthesize` - Voice synthesis (App Router version)

## Vercel Configuration

The `vercel.json` file is configured to handle both API structures:

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x",
      "memory": 1024,
      "maxDuration": 30,
      "includeFiles": "api/**"
    },
    "app/api/**/*.ts": {
      "runtime": "nodejs20.x",
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/chat/:path*",
      "destination": "/api/chat/:path*"
    },
    {
      "source": "/api/voice/:path*",
      "destination": "/api/voice/:path*"
    }
  ]
}
```

## Environment Variables

### Required Server-Side Variables
- `OPENAI_API_KEY` - OpenAI API key for chat completions
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice synthesis
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `UPSTASH_REDIS_REST_URL` - Redis URL for caching and rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token

### MCP Server Configuration
- `MCP_HIVE_URL` - Hive Intelligence MCP server endpoint
- `MCP_SEI_URL` - SEI Blockchain MCP server endpoint
- `MCP_PORTFOLIO_URL` - Portfolio Manager MCP server endpoint
- `MCP_ENABLED` - Enable/disable MCP integration (default: true)

### Frontend Variables (VITE_ prefix)
All frontend environment variables must be prefixed with `VITE_` to be accessible in the browser:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_ELEVENLABS_VOICE_ID` - Default voice ID for TTS

## CORS Configuration

CORS headers are configured in `vercel.json` for all API routes:
- Allows all origins (`*`) in development
- Supports credentials
- Handles preflight requests automatically

For production, update the `Access-Control-Allow-Origin` header to specific domains.

## Migration Path

The project is transitioning from legacy API routes to App Router APIs. During this transition:
1. Both API structures are supported
2. Legacy routes remain functional
3. New features should use App Router APIs
4. Gradual migration of existing endpoints

## Testing API Routes

### Local Development
```bash
# Test legacy API
curl http://localhost:3000/api/chat/orchestrate -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Test App Router API
curl http://localhost:3000/api/ai/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### Production
Replace `localhost:3000` with your Vercel deployment URL.

## Troubleshooting

### Common Issues

1. **404 Errors on API Routes**
   - Ensure the route exists in the correct directory
   - Check `vercel.json` rewrites configuration
   - Verify function runtime settings

2. **CORS Errors**
   - Check CORS headers in `vercel.json`
   - Ensure preflight OPTIONS requests are handled
   - Verify allowed headers include necessary auth headers

3. **Environment Variable Issues**
   - Server-side variables don't need VITE_ prefix
   - Frontend variables must have VITE_ prefix
   - Check Vercel dashboard for production variables

4. **MCP Server Connection Errors**
   - Verify MCP server URLs are accessible
   - Check network connectivity from Vercel
   - Ensure API keys are set if required