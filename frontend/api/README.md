# Seiron Vercel API Functions

This directory contains secure server-side API functions for the Seiron project, deployed as Vercel serverless functions.

## Available APIs

### Chat Orchestration (`/api/chat/orchestrate`)
- **Purpose**: Secure OpenAI chat completion proxy
- **Method**: POST
- **Features**: CORS support, error handling, conversation management

### Voice Synthesis (`/api/voice/synthesize`)
- **Purpose**: Secure ElevenLabs text-to-speech proxy
- **Method**: POST
- **Features**: Rate limiting, input validation, error handling, CORS support

## Environment Variables

Ensure these environment variables are configured in your Vercel deployment:

```env
# Required for chat functionality
OPENAI_API_KEY=sk-your-openai-api-key

# Required for voice synthesis
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

## Voice Synthesis API

### Endpoint
```
POST /api/voice/synthesize
```

### Request Body
```typescript
{
  text: string              // Text to synthesize (1-1000 characters)
  voiceId: string          // ElevenLabs voice ID
  modelId?: string         // Model ID (default: 'eleven_monolingual_v1')
  voiceSettings?: {
    stability?: number           // 0.0-1.0
    similarity_boost?: number    // 0.0-1.0
    style?: number              // 0.0-1.0
    use_speaker_boost?: boolean
  }
}
```

### Response
```typescript
// Success
{
  success: true
  data: {
    audioBuffer: string    // base64 encoded audio
    contentType: string    // MIME type (e.g., 'audio/mpeg')
    characterCount: number // Number of characters synthesized
  }
}

// Error
{
  success: false
  error: string           // Error message
  code?: string          // Error code (e.g., 'RATE_LIMIT_EXCEEDED')
}
```

### Rate Limits
- **10 requests per minute** per IP address
- **1000 character limit** per request

### Error Codes
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_TEXT`: Text validation failed
- `MISSING_TEXT`: No text provided
- `MISSING_VOICE_ID`: No voice ID provided
- `API_KEY_ERROR`: ElevenLabs API key issue
- `NETWORK_ERROR`: Network connectivity problem
- `INTERNAL_ERROR`: Server error

## Security Features

### Voice Synthesis Security
1. **Server-side API key management** - API keys never exposed to client
2. **Rate limiting** - Prevents abuse and quota exhaustion
3. **Input validation** - Sanitizes text input and prevents malicious content
4. **CORS protection** - Properly configured cross-origin requests
5. **Error handling** - Detailed error responses without exposing sensitive information

### Chat Security
1. **API key protection** - OpenAI API key stored server-side
2. **Request validation** - Validates message structure and content
3. **Error handling** - Secure error responses
4. **CORS support** - Cross-origin request handling

## Development

### Local Testing
```bash
# Install dependencies
cd api
npm install

# Set environment variables
cp ../.env.example .env
# Edit .env with your API keys

# Test with Vercel CLI
npx vercel dev
```

### Deployment
This directory is automatically deployed as Vercel serverless functions when the project is deployed to Vercel.

### TypeScript Support
TypeScript configuration is included for type checking and development.

## Usage Examples

### Voice Synthesis
```typescript
// Frontend usage with secure client
import { VoiceApiClient } from '../lib/voice-api-client'

const client = new VoiceApiClient({
  apiBaseUrl: 'https://your-domain.com'
})

const result = await client.synthesizeSpeech({
  text: 'Hello, world!',
  voiceId: 'your-voice-id'
})()
```

### Direct API Call
```bash
curl -X POST https://your-domain.com/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, world!",
    "voiceId": "your-voice-id",
    "voiceSettings": {
      "stability": 0.5,
      "similarity_boost": 0.8
    }
  }'
```

## Monitoring

Monitor API usage through:
- Vercel function logs
- Error tracking in application logs
- Rate limit headers in responses

## Support

For issues or questions:
1. Check Vercel function logs for errors
2. Verify environment variables are set correctly
3. Ensure API keys have sufficient quota
4. Review network connectivity for external API calls