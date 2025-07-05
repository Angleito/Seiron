# Voice Interface Component

A functional Dragon Ball-themed voice interface component that integrates speech recognition and text-to-speech capabilities using the Web Speech API and ElevenLabs TTS.

## Features

- 🎤 **Speech Recognition**: Real-time voice transcription with interim results
- 🔊 **Text-to-Speech**: High-quality voice synthesis using ElevenLabs API
- 🐉 **Dragon Animation**: Visual feedback with dragon emoji breathing fire during audio playback
- 🔴 **Visual Indicators**: Pulsing red microphone when recording, orange speaker when auto-speak is enabled
- ♿ **Accessibility**: Full ARIA labels and keyboard navigation support
- 🧪 **Property-Based Testing**: Comprehensive test coverage using fast-check

## Installation

```bash
# The component uses existing hooks from the project
# Ensure you have the required dependencies:
npm install fp-ts rxjs
```

## Usage

### Basic Example

```tsx
import { VoiceInterface } from '@/components/voice'

function App() {
  const elevenLabsConfig = {
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    voiceId: 'your-voice-id'
  }

  return (
    <VoiceInterface
      elevenLabsConfig={elevenLabsConfig}
      onTranscriptChange={(transcript) => console.log(transcript)}
      onError={(error) => console.error(error)}
      autoReadResponses={true}
    />
  )
}
```

### Advanced Integration

```tsx
import { VoiceInterface, useVoiceInterfaceAudio } from '@/components/voice'

function ChatApp() {
  const { playResponse, stopAudio, isPlaying } = useVoiceInterfaceAudio(elevenLabsConfig)

  const handleAIResponse = async (response: string) => {
    // Play AI response through speakers
    await playResponse(response)
  }

  return (
    <div>
      <VoiceInterface
        elevenLabsConfig={elevenLabsConfig}
        onTranscriptChange={handleUserInput}
        autoReadResponses={true}
      />
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevenLabsConfig` | `ElevenLabsConfig` | Required | Configuration for ElevenLabs TTS |
| `onTranscriptChange` | `(transcript: string) => void` | - | Callback when transcript updates |
| `onError` | `(error: Error) => void` | - | Error handler callback |
| `autoReadResponses` | `boolean` | `false` | Auto-play TTS responses |
| `className` | `string` | `''` | Additional CSS classes |

## ElevenLabs Configuration

```typescript
interface ElevenLabsConfig {
  apiKey: string
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number        // 0-1
    similarityBoost?: number  // 0-1
    style?: number           // 0-1
    useSpeakerBoost?: boolean
  }
}
```

## Component States

The component manages several visual states:

1. **Microphone States**:
   - Inactive: Gray background
   - Active: Pulsing red with shadow

2. **Speaker States**:
   - Disabled: Gray background
   - Enabled: Orange with indicator dot

3. **Dragon States**:
   - Idle: Static dragon emoji 🐉
   - Playing Audio: Bouncing dragon with fire 🐉🔥

## Functional Programming Approach

The component follows functional programming principles:

- **Pure Functions**: All state transformations are pure
- **Immutable State**: State updates use spread operators
- **Effect Management**: Side effects handled through fp-ts TaskEither
- **Composition**: Hooks compose functionality cleanly

## Testing

The component includes comprehensive property-based tests:

```typescript
// Property: Component handles any valid configuration
fc.property(arbitraryElevenLabsConfig, (config) => {
  // Test implementation
})

// Property: Displays any transcript correctly
fc.property(arbitraryTranscript, (transcript) => {
  // Test implementation
})
```

Run tests:
```bash
npm test -- VoiceInterface.test.tsx
```

## Accessibility

- Full ARIA label support
- Keyboard navigation
- Screen reader friendly
- Visual and audio feedback
- Error state announcements

## Performance Considerations

- Audio caching with IndexedDB
- Debounced transcript updates
- Lazy loading of audio context
- Cleanup on unmount

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires webkit prefix for Speech API
- Mobile: Varies by browser

## Environment Variables

```env
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
```

## Error Handling

The component handles various error types:

- `NO_SUPPORT`: Browser doesn't support Speech API
- `PERMISSION_DENIED`: Microphone permission denied
- `NETWORK_ERROR`: Network issues with TTS
- `QUOTA_EXCEEDED`: ElevenLabs API quota exceeded

## Styling

The component uses Tailwind CSS with Dragon Ball-inspired theme:

- Orange accents for Seiron branding
- Red for active recording
- Smooth transitions and animations
- Dark theme optimized