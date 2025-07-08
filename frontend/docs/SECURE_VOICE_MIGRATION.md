# Secure Voice Synthesis Migration Guide

This guide helps you migrate from the direct ElevenLabs API integration to the secure server-side proxy implementation.

## Overview

The new secure voice synthesis system provides:
- **Server-side API key management** - No more exposed API keys in client-side code
- **Built-in rate limiting** - Prevents abuse and quota exhaustion
- **Input validation** - Sanitizes text input and prevents malicious content
- **Improved error handling** - Better error messages and recovery
- **Caching** - Reduces API calls and improves performance
- **CORS support** - Properly configured for cross-origin requests

## Migration Steps

### 1. Update Environment Variables

**Old (Client-side):**
```env
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
```

**New (Server-side):**
```env
ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
```

### 2. Update Hook Usage

**Old Implementation:**
```typescript
import { useElevenLabsTTS } from '../hooks/voice'

const MyComponent = () => {
  const tts = useElevenLabsTTS({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID!,
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.8
    }
  })
  
  // Usage remains the same
  const handleSpeak = () => {
    tts.speak('Hello, world!')()
  }
  
  return (
    <button onClick={handleSpeak} disabled={tts.isLoading}>
      {tts.isSpeaking ? 'Speaking...' : 'Speak'}
    </button>
  )
}
```

**New Implementation:**
```typescript
import { useSecureElevenLabsTTS } from '../hooks/voice'

const MyComponent = () => {
  const tts = useSecureElevenLabsTTS({
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID!,
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.8  // Note: property name changed to match API
    }
  })
  
  // Usage remains the same
  const handleSpeak = () => {
    tts.speak('Hello, world!')()
  }
  
  return (
    <button onClick={handleSpeak} disabled={tts.isLoading}>
      {tts.isSpeaking ? 'Speaking...' : 'Speak'}
    </button>
  )
}
```

### 3. Property Name Changes

The voice settings property names have been updated to match the ElevenLabs API:

| Old Property | New Property | Description |
|-------------|-------------|-------------|
| `similarityBoost` | `similarity_boost` | Voice similarity boost setting |
| `useSpeakerBoost` | `use_speaker_boost` | Speaker boost setting |

### 4. API Endpoint Configuration

The secure hook automatically detects the API endpoint based on the current environment:

- **Development**: `http://localhost:3000/api/voice/synthesize`
- **Production**: Uses `window.location.origin` + `/api/voice/synthesize`

You can override this with a custom configuration:

```typescript
import { useSecureElevenLabsTTS, VoiceApiClient } from '../hooks/voice'

const customApiClient = new VoiceApiClient({
  apiBaseUrl: 'https://your-custom-api.com',
  timeout: 30000
})

const tts = useSecureElevenLabsTTS({
  voiceId: 'your-voice-id',
  apiConfig: customApiClient
})
```

## Error Handling

The secure implementation provides better error handling with specific error codes:

```typescript
import { useSecureElevenLabsTTS } from '../hooks/voice'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

const MyComponent = () => {
  const tts = useSecureElevenLabsTTS({ voiceId: 'your-voice-id' })
  
  const handleSpeak = async (text: string) => {
    const result = await tts.speak(text)()
    
    pipe(
      result,
      TE.fold(
        (error) => {
          switch (error.type) {
            case 'QUOTA_EXCEEDED':
              console.error('Rate limit exceeded, please try again later')
              break
            case 'API_ERROR':
              console.error('API configuration error:', error.message)
              break
            case 'NETWORK_ERROR':
              console.error('Network error, check your connection')
              break
            case 'AUDIO_ERROR':
              console.error('Audio playback error:', error.message)
              break
            default:
              console.error('Unknown error:', error.message)
          }
        },
        () => {
          console.log('Speech synthesis completed successfully')
        }
      )
    )
  }
  
  return (
    <button onClick={() => handleSpeak('Hello, world!')}>
      Speak
    </button>
  )
}
```

## Rate Limiting

The secure API includes built-in rate limiting:

- **10 requests per minute** per IP address
- **1000 character limit** per request
- **Automatic retry** suggestions in error responses

## Caching

The secure implementation includes improved caching:

- **Client-side cache** for frequently used text
- **Server-side optimization** for identical requests
- **Cache statistics** available via `getCacheStats()`

```typescript
const tts = useSecureElevenLabsTTS({ voiceId: 'your-voice-id' })

// Get cache statistics
const stats = tts.getCacheStats()
console.log(`Cache size: ${stats.size}/${stats.maxSize}`)

// Clear cache if needed
tts.clearCache()
```

## Security Benefits

### Before (Insecure)
- ❌ API key exposed in client-side code
- ❌ No rate limiting
- ❌ No input validation
- ❌ Vulnerable to API key theft
- ❌ No CORS protection

### After (Secure)
- ✅ API key stored server-side only
- ✅ Built-in rate limiting
- ✅ Input validation and sanitization
- ✅ Protected against API key theft
- ✅ Proper CORS configuration
- ✅ Error handling and logging

## Testing

Test your migration with the voice test page:

```bash
# Start development server
npm run dev

# Navigate to voice test page
# http://localhost:3000/voice-test
```

## Deployment

Ensure your deployment platform (Vercel, Netlify, etc.) has the server-side environment variables configured:

```env
ELEVENLABS_API_KEY=your-actual-api-key
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `ELEVENLABS_API_KEY` is set in your deployment environment
   - Check that the API key is valid and has sufficient quota

2. **Rate Limit Exceeded**
   - Implement exponential backoff in your client code
   - Consider implementing user-side rate limiting

3. **Network Errors**
   - Check your network connection
   - Verify the API endpoint is accessible

4. **Audio Playback Issues**
   - Ensure user interaction before playing audio (browser requirement)
   - Check browser compatibility for Web Audio API

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// In your browser console
localStorage.setItem('debug', 'seiron:voice:*')
```

## Performance Considerations

1. **Preloading**: Use `preloadAudio()` for frequently used phrases
2. **Caching**: The secure implementation includes automatic caching
3. **Debouncing**: Implement debouncing for user input to reduce API calls

## Support

For additional support:
- Check the console for detailed error messages
- Review the network tab for API request/response details
- Consult the ElevenLabs API documentation for voice settings

## Migration Checklist

- [ ] Move API key from client-side to server-side environment
- [ ] Update hook import from `useElevenLabsTTS` to `useSecureElevenLabsTTS`
- [ ] Remove `apiKey` from hook configuration
- [ ] Update voice settings property names if needed
- [ ] Test voice synthesis functionality
- [ ] Update error handling for new error types
- [ ] Deploy with server-side environment variables
- [ ] Verify functionality in production environment

This migration improves security while maintaining the same functional interface for your voice synthesis features.