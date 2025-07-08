# ElevenLabs Secure Integration

## Overview

The ElevenLabs Text-to-Speech integration has been updated to use a secure server-side proxy pattern, ensuring API keys are never exposed to the client.

## Architecture

### Frontend
- Uses `useSecureElevenLabsTTS` hook instead of direct API calls
- No API keys in frontend environment variables
- Calls `/api/voice/synthesize` Vercel function

### Backend (Vercel Functions)
- `/api/voice/synthesize.ts` - Proxy endpoint for ElevenLabs API
- Handles authentication, rate limiting, and error handling
- Uses `ELEVENLABS_API_KEY` environment variable (server-side only)

## Configuration

### Environment Variables

#### Frontend (.env)
```bash
# Only voice ID needed client-side
VITE_ELEVENLABS_VOICE_ID=your_voice_id_here
VITE_VOICE_ENABLED=true
```

#### Vercel Dashboard
Set these in Project Settings > Environment Variables:
```bash
# Server-side only
ELEVENLABS_API_KEY=your_api_key_here
```

## Components Updated

1. **VoiceInterface.tsx**
   - Now uses `useSecureElevenLabsTTS` hook
   - Removed direct API key usage

2. **voice-api-client.ts**
   - Uses relative URLs for Vercel functions
   - No hardcoded backend URLs

3. **EnhancedVoiceEnabledChatContainer.tsx**
   - Removed API key from config
   - Uses Vite environment variables

## Security Benefits

- API keys are never exposed in client bundle
- Rate limiting prevents abuse
- Proper error handling without exposing internals
- CORS configured for production use

## Testing

The voice features should work seamlessly with:
1. Local development (using mock responses)
2. Vercel preview deployments
3. Production deployment

No changes needed to the user experience - the dragon still speaks with the same powerful voice! 🐉