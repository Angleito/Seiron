# ASCII Dragon Component

A highly customizable ASCII art dragon component for the Seiron project, featuring multiple poses, animations, and sizes.

## Features

- **Multiple Dragon Poses**: 4 different ASCII art patterns (coiled, flying, attacking, sleeping)
- **Size Variants**: 4 sizes (sm, md, lg, xl) following project conventions
- **Typewriter Effect**: Characters appear one by one with customizable speed
- **Breathing Animation**: Character intensity changes to simulate breathing
- **Floating Animation**: Gentle movement and rotation for lifelike effect
- **Performance Optimized**: Uses React.memo and efficient state management
- **TypeScript Support**: Full type safety with comprehensive interfaces

## Usage

```tsx
import { ASCIIDragon } from '@/components/dragon'

// Basic usage
<ASCIIDragon />

// With custom props
<ASCIIDragon
  pose="flying"
  size="lg"
  speed="normal"
  enableTypewriter={true}
  enableBreathing={true}
  enableFloating={true}
  enableHover={true}
  onClick={() => console.log('Dragon clicked!')}
  className="my-custom-class"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Size of the dragon |
| `className` | `string` | `''` | Additional CSS classes |
| `onClick` | `() => void` | `undefined` | Click handler |
| `enableHover` | `boolean` | `true` | Enable hover scale effect |
| `enableTypewriter` | `boolean` | `true` | Enable typewriter appearance effect |
| `enableBreathing` | `boolean` | `true` | Enable breathing animation |
| `enableFloating` | `boolean` | `true` | Enable floating animation |
| `pose` | `'coiled' \| 'flying' \| 'attacking' \| 'sleeping'` | `'coiled'` | Dragon pose |
| `speed` | `'slow' \| 'normal' \| 'fast'` | `'normal'` | Animation speed |

## Dragon Poses

### Coiled
```
            /\_/\
           ( o.o )
          __> ^ <__
         /~~~~~~~~~~~\
        (  ~~~~~~~~~  )
       (  ~~~~~~~~~~~  )
      (  ~~~~~~~~~~~~~  )
     (  ~~~~~~~~~~~~~~~  )
    (  ~~~~~~~~~~~~~~~~~  )
     \~~~~~~~~~~~~~~~~~~/
      \~~~~~~~~~~~~~~~~/
       \~~~~~~~~~~~~~~/
        \~~~~~~~~~~~~/
```

### Flying
```
      /\_/\
     ( o.o )
      > ^ <
     /|   |\
    / |~~~| \
   /  |~~~|  \
  /   |~~~|   \
 /    |~~~|    \
/     |~~~|     \
\     |~~~|     /
 \    |~~~|    /
  \   |~~~|   /
   \  |~~~|  /
    \ |~~~| /
     \|___|/
```

### Attacking
```
      /\_/\
     ( >.< )
      \|^|/
       |||
      /|||\
     /|||||\
    /~~~~~~~\
   (  ~~~~~  )
  (  ~~~~~~~  )
   \~~~~~~~/
```

### Sleeping
```
      /\_/\
     ( -.- )
      > z <
     /~~~~~\
    (  ~~~  )
   (  ~~~~~  )
    \~~~~~/
```

## Animations

### Typewriter Effect
Characters appear one by one from left to right, line by line. Speed can be controlled via the `speed` prop.

### Breathing Animation
Character intensity changes to simulate breathing:
- `~` becomes `·` → `~` → `≈` → `∼`
- `|` becomes `¦` → `|` → `‖` → `║`
- And so on for other characters

### Floating Animation
Gentle movement with:
- Y-axis translation: -10px to 0px
- X-axis translation: 0px to 5px
- Rotation: 0° to 1°

## Performance Features

- **React.memo**: Prevents unnecessary re-renders
- **Efficient State Management**: Minimal state updates
- **Optimized Animations**: Uses transform properties for smooth performance
- **Conditional Rendering**: Only renders active animations

## Integration Examples

### Basic ASCII Dragon
```tsx
import { ASCIIDragon } from '@/components/dragon'

function BasicDragon() {
  return (
    <div className="font-mono text-green-400 bg-black p-4">
      <ASCIIDragon pose="coiled" size="lg" />
    </div>
  )
}
```

### Interactive ASCII Dragon with Hook
```tsx
import { ASCIIDragon, useASCIIDragon } from '@/components/dragon'

function InteractiveDragon() {
  const dragon = useASCIIDragon({
    enableKeyboardShortcuts: true,
    enableAutoTypewriter: true,
    initialPose: 'coiled'
  })
  
  return (
    <div className="font-mono text-green-400 bg-black p-4">
      <ASCIIDragon
        pose={dragon.pose}
        size={dragon.size}
        speed={dragon.speed}
        displayedLines={dragon.displayedLines}
        enableTypewriter={dragon.isTypewriterActive()}
        enableBreathing={dragon.breathing.intensity > 1}
        enableFloating={dragon.floating.offsetY !== 0}
      />
      <div className="mt-4 text-sm">
        <p>Current Pose: {dragon.pose}</p>
        <p>State: {dragon.animationState}</p>
        <p>Press 1-4 to change poses</p>
      </div>
    </div>
  )
}
```

### Voice-Integrated ASCII Dragon
```tsx
import { ASCIIDragon, useASCIIDragon } from '@/components/dragon'
import { useElevenLabsTTS, useSpeechRecognition } from '@/hooks/voice'

function VoiceDragon() {
  const dragon = useASCIIDragon({
    enableVoiceIntegration: true,
    enableAutoTypewriter: true
  })
  
  const tts = useElevenLabsTTS({
    onSpeakingStart: (message) => dragon.onVoiceSpeakingStart(message),
    onSpeakingEnd: dragon.onVoiceSpeakingEnd
  })
  
  const speech = useSpeechRecognition({
    onListeningStart: dragon.onVoiceListeningStart,
    onListeningEnd: dragon.onVoiceListeningEnd,
    onTranscript: dragon.onTranscriptUpdate
  })
  
  return (
    <div className="voice-ascii-dragon">
      <ASCIIDragon
        pose={dragon.pose}
        size={dragon.size}
        displayedLines={dragon.displayedLines}
        enableTypewriter={dragon.isTypewriterActive()}
        enableBreathing={dragon.voiceIntegration.isSpeaking}
        className="font-mono text-green-400 bg-black p-4"
      />
      <div className="controls mt-4">
        <button onClick={() => speech.startListening()}>
          Listen
        </button>
        <button onClick={() => tts.speak("Hello from the dragon!")}>
          Speak
        </button>
        <p className="mt-2">
          Voice Status: {dragon.isVoiceActive() ? 'Active' : 'Idle'}
        </p>
      </div>
    </div>
  )
}
```

### ASCII Dragon with DragonRenderer
```tsx
import { DragonRenderer } from '@/components/dragon'
import { useASCIIDragon } from '@/hooks/voice'

function RenderedDragon() {
  const dragon = useASCIIDragon({
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })
  
  return (
    <DragonRenderer
      type="ascii"
      pose={dragon.pose}
      size={dragon.size}
      displayedLines={dragon.displayedLines}
      animationState={dragon.animationState}
      performanceMetrics={{
        fps: dragon.performance.fps,
        shouldOptimize: dragon.performance.shouldOptimize
      }}
      className="ascii-renderer"
    />
  )
}
```

### Legacy Integration (Simple)
```tsx
import { ASCIIDragon } from '@/components/dragon'
import { useVoiceState } from '@/hooks/voice'

function VoiceDragon() {
  const { isListening, isSpeaking } = useVoiceState()
  
  const getPose = () => {
    if (isListening) return 'flying'
    if (isSpeaking) return 'attacking'
    return 'coiled'
  }
  
  return (
    <ASCIIDragon
      pose={getPose()}
      enableBreathing={isSpeaking}
      speed={isListening ? 'fast' : 'normal'}
    />
  )
}
```

## Customization

### Custom ASCII Art
To add new poses, extend the `dragonPatterns` object in the component:

```tsx
const dragonPatterns = {
  // ... existing patterns
  newPose: {
    sm: ["ASCII art lines..."],
    md: ["ASCII art lines..."],
    lg: ["ASCII art lines..."],
    xl: ["ASCII art lines..."]
  }
}
```

### Custom Breathing Characters
Modify the `adjustCharacterIntensity` function to add new character variations:

```tsx
const intensityMap = {
  // ... existing mappings
  'newChar': ['variation1', 'variation2', 'variation3']
}
```

## Testing

The component includes comprehensive prop types and is designed to be testable:

```tsx
import { render, screen } from '@testing-library/react'
import ASCIIDragon from './ASCIIDragon'

test('renders dragon with correct pose', () => {
  render(<ASCIIDragon pose="flying" />)
  // Test ASCII art rendering
})
```

## Accessibility

- Uses semantic HTML structure
- Provides meaningful alt text equivalent via aria-label
- Respects user motion preferences
- Keyboard accessible when interactive

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Framer Motion compatibility
- Mobile-optimized touch interactions