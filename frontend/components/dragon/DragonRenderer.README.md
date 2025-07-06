# DragonRenderer Component

A unified React component that seamlessly switches between different dragon rendering types: 2D sprites, ASCII art, and 3D models. Built with performance optimization, voice integration, and robust error handling.

## 🐉 Features

- **Multi-Type Support**: Render 2D sprites, ASCII art, or 3D models
- **Seamless Transitions**: Smooth animations when switching between types
- **Voice Integration**: Automatic animation synchronization with voice states
- **Error Boundaries**: Graceful fallback mechanisms for 3D rendering failures
- **Performance Monitoring**: Built-in performance metrics and optimization
- **Lazy Loading**: 3D components are loaded only when needed
- **TypeScript Support**: Full type safety with comprehensive interfaces

## 🚀 Quick Start

```tsx
import { DragonRenderer } from '@/components/dragon'

function MyComponent() {
  return (
    <DragonRenderer
      dragonType="3d"
      size="lg"
      enableFallback={true}
      fallbackType="2d"
    />
  )
}
```

## 📖 Props Reference

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dragonType` | `'2d' \| '3d' \| 'ascii'` | **Required** | Type of dragon to render |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Size of the dragon |
| `className` | `string` | `''` | Additional CSS classes |
| `onClick` | `() => void` | `undefined` | Click handler |
| `enableHover` | `boolean` | `true` | Enable hover animations |

### Voice Integration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `voiceState` | `VoiceAnimationState` | `undefined` | Voice state for animation sync |

```tsx
interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume?: number // 0-1 scale
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}
```

### Performance & Fallback

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableFallback` | `boolean` | `true` | Enable fallback mechanisms |
| `fallbackType` | `DragonType` | `'2d'` | Fallback dragon type |
| `performanceMode` | `'auto' \| 'high' \| 'low'` | `'auto'` | Performance optimization mode |

### Type-Specific Props

#### ASCII Dragon Props (`asciiProps`)
```tsx
{
  enableTypewriter?: boolean
  enableBreathing?: boolean
  enableFloating?: boolean
  pose?: 'coiled' | 'flying' | 'attacking' | 'sleeping'
  speed?: 'slow' | 'normal' | 'fast'
}
```

#### 3D Dragon Props (`threeDProps`)
```tsx
{
  enableInteraction?: boolean
  animationSpeed?: number
  showParticles?: boolean
  autoRotate?: boolean
  quality?: 'low' | 'medium' | 'high'
}
```

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onError` | `(error: Error, dragonType: DragonType) => void` | Error handler |
| `onFallback` | `(from: DragonType, to: DragonType) => void` | Fallback handler |
| `onPerformanceMetrics` | `(metrics: DragonPerformanceMetrics) => void` | Performance metrics handler |

## 🎯 Usage Examples

### Basic Usage

```tsx
// Simple 2D dragon
<DragonRenderer dragonType="2d" size="md" />

// ASCII dragon with custom pose
<DragonRenderer 
  dragonType="ascii" 
  asciiProps={{ pose: 'flying', speed: 'fast' }}
/>

// 3D dragon with particles
<DragonRenderer 
  dragonType="3d" 
  threeDProps={{ showParticles: true, quality: 'high' }}
/>
```

### Voice Integration with Hooks

```tsx
import { DragonRenderer } from '@/components/dragon'
import { useDragon3D, useASCIIDragon, useElevenLabsTTS, useSpeechRecognition } from '@/hooks/voice'

function VoiceEnabledDragon() {
  const dragon3D = useDragon3D({ 
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true
  })
  
  const tts = useElevenLabsTTS({
    onSpeakingStart: dragon3D.onVoiceSpeakingStart,
    onSpeakingEnd: dragon3D.onVoiceSpeakingEnd
  })
  
  const speech = useSpeechRecognition({
    onListeningStart: dragon3D.onVoiceListeningStart,
    onListeningEnd: dragon3D.onVoiceListeningEnd,
    onTranscript: dragon3D.onTranscriptUpdate
  })

  return (
    <DragonRenderer
      dragonType="3d"
      size="lg"
      voiceState={{
        isListening: dragon3D.voiceIntegration.isListening,
        isSpeaking: dragon3D.voiceIntegration.isSpeaking,
        isProcessing: dragon3D.voiceIntegration.isProcessing,
        isIdle: dragon3D.isCalm()
      }}
      threeDProps={{
        showParticles: dragon3D.powerLevel > 50,
        animationSpeed: dragon3D.powerLevel / 50,
        quality: dragon3D.shouldReduceQuality() ? 'low' : 'high'
      }}
    />
  )
}
```

### Legacy Voice Integration (Simple)

```tsx
function VoiceEnabledDragon() {
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    emotion: 'neutral'
  })

  return (
    <DragonRenderer
      dragonType="ascii"
      voiceState={voiceState}
      size="lg"
    />
  )
}
```

### Advanced Configuration

```tsx
function AdvancedDragon() {
  const [performanceMetrics, setPerformanceMetrics] = useState(null)

  return (
    <DragonRenderer
      dragonType="3d"
      size="xl"
      enableFallback={true}
      fallbackType="2d"
      performanceMode="high"
      onError={(error, type) => {
        console.error(`Dragon ${type} error:`, error)
      }}
      onFallback={(from, to) => {
        console.log(`Fallback: ${from} -> ${to}`)
      }}
      onPerformanceMetrics={setPerformanceMetrics}
      threeDProps={{
        enableInteraction: true,
        showParticles: true,
        quality: 'high',
        autoRotate: false
      }}
    />
  )
}
```

### Dynamic Type Switching with Voice

```tsx
import { DragonRenderer } from '@/components/dragon'
import { useDragon3D, useASCIIDragon } from '@/hooks/voice'

function DynamicDragon() {
  const [dragonType, setDragonType] = useState<DragonType>('2d')
  
  const dragon3D = useDragon3D({ enableVoiceIntegration: true })
  const asciiDragon = useASCIIDragon({ enableVoiceIntegration: true })

  const getDragonProps = () => {
    switch (dragonType) {
      case '3d':
        return {
          voiceState: {
            isListening: dragon3D.voiceIntegration.isListening,
            isSpeaking: dragon3D.voiceIntegration.isSpeaking,
            isProcessing: dragon3D.voiceIntegration.isProcessing,
            isIdle: dragon3D.isCalm()
          },
          threeDProps: {
            showParticles: dragon3D.powerLevel > 50,
            animationSpeed: dragon3D.powerLevel / 50
          }
        }
      case 'ascii':
        return {
          asciiProps: {
            pose: asciiDragon.pose,
            speed: asciiDragon.speed,
            enableTypewriter: asciiDragon.isTypewriterActive()
          }
        }
      default:
        return {}
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setDragonType('2d')}>2D</button>
        <button onClick={() => setDragonType('ascii')}>ASCII</button>
        <button onClick={() => setDragonType('3d')}>3D</button>
      </div>
      
      <DragonRenderer
        dragonType={dragonType}
        size="lg"
        enableFallback={true}
        {...getDragonProps()}
      />
    </div>
  )
}
```

### Simple Dynamic Type Switching

```tsx
function DynamicDragon() {
  const [dragonType, setDragonType] = useState<DragonType>('2d')

  return (
    <div>
      <div>
        <button onClick={() => setDragonType('2d')}>2D</button>
        <button onClick={() => setDragonType('ascii')}>ASCII</button>
        <button onClick={() => setDragonType('3d')}>3D</button>
      </div>
      
      <DragonRenderer
        dragonType={dragonType}
        size="lg"
        enableFallback={true}
      />
    </div>
  )
}
```

## 🔧 Voice State Mapping

The component automatically maps voice states to appropriate dragon behaviors:

### ASCII Dragon Voice Mapping
- `isSpeaking` → `attacking` pose, `fast` speed
- `isListening` → `flying` pose, `normal` speed
- `isProcessing` → `coiled` pose, `normal` speed
- `isIdle` → `coiled` pose, `slow` speed
- `emotion: 'sleeping'` → `sleeping` pose

### 3D Dragon Voice Mapping
- `isSpeaking` → `animationSpeed: 2`, particles enabled
- `isListening` → `animationSpeed: 1.5`, particles enabled
- `isProcessing` → `animationSpeed: 1`, auto-rotate enabled
- `isIdle` → `animationSpeed: 1`, minimal effects

## 🛡️ Error Handling

The component includes comprehensive error handling:

### 3D Rendering Errors
- Automatic WebGL support detection
- Graceful fallback to 2D sprite when 3D fails
- Error boundary wrapper for 3D components

### Fallback Mechanisms
- Configurable fallback types
- Automatic fallback triggering
- Fallback event notifications

### Error Callbacks
```tsx
<DragonRenderer
  dragonType="3d"
  onError={(error, dragonType) => {
    // Handle dragon-specific errors
    console.error(`${dragonType} dragon error:`, error)
  }}
  onFallback={(from, to) => {
    // Handle fallback events
    console.log(`Fallback triggered: ${from} -> ${to}`)
  }}
/>
```

## 📊 Performance Monitoring

Built-in performance monitoring provides detailed metrics:

```tsx
interface DragonPerformanceMetrics {
  renderTime: number      // Total render time in ms
  initTime: number        // Initialization time in ms
  dragonType: DragonType  // Current dragon type
  fallbackUsed: boolean   // Whether fallback was used
  errorCount: number      // Number of errors encountered
}
```

### Performance Optimization
- Lazy loading of 3D components
- Automatic quality adjustment based on performance mode
- Memory-efficient component switching
- Debounced state updates

## 🎨 Styling

The component uses Tailwind CSS classes and can be styled through:

### CSS Classes
```tsx
<DragonRenderer
  dragonType="ascii"
  className="custom-dragon-style"
/>
```

### Size Variants
- `sm`: 64x64px (w-16 h-16)
- `md`: 96x96px (w-24 h-24)
- `lg`: 128x128px (w-32 h-32)
- `xl`: 192x192px (w-48 h-48)

### Custom Styling
```css
.dragon-renderer {
  /* Custom container styles */
}

.dragon-container {
  /* Custom dragon wrapper styles */
}

.dragon-debug-info {
  /* Debug info styles (development only) */
}
```

## 🔌 Utility Functions

The component exports utility functions for external use:

```tsx
import { dragonUtils } from '@/components/dragon'

// Detect 3D support
const has3DSupport = dragonUtils.detect3DSupport()

// Map voice state to dragon pose
const pose = dragonUtils.voiceStateToPose(voiceState)

// Map voice state to animation speed
const speed = dragonUtils.voiceStateToSpeed(voiceState)

// Map voice state to 3D props
const props3D = dragonUtils.voiceStateTo3DProps(voiceState)
```

## 🧪 Testing

The component includes comprehensive test coverage:

```bash
# Run dragon renderer tests
npm test -- DragonRenderer.test.tsx

# Run all dragon component tests
npm test -- components/dragon
```

### Test Categories
- Basic rendering for all dragon types
- Voice integration and state mapping
- Error handling and fallback mechanisms
- Performance monitoring
- Type switching and transitions
- Props passing and customization

## 🐛 Debugging

### Development Mode
In development mode, the component shows debug information:

```tsx
// Debug info automatically appears in development
<DragonRenderer dragonType="3d" />
// Shows: Type: 3d | 3D Support: Yes | Error: No
```

### Logging
The component uses the project's logging system:

```tsx
import { logger } from '@/lib/logger'

// All dragon operations are logged
logger.debug('Dragon type switching', { from: '2d', to: '3d' })
logger.error('Dragon rendering error', { error, dragonType })
```

## 📈 Performance Tips

1. **Use Appropriate Types**: Choose the right dragon type for your use case
2. **Enable Fallbacks**: Always enable fallbacks for 3D dragons
3. **Monitor Performance**: Use performance metrics to optimize
4. **Lazy Load**: 3D components are automatically lazy-loaded
5. **Quality Settings**: Adjust 3D quality based on device capabilities

## 🔄 Migration Guide

### From Individual Components
```tsx
// Before
<SimpleDragonSprite size="lg" />
<ASCIIDragon pose="flying" />
<Dragon3D showParticles={true} />

// After
<DragonRenderer dragonType="2d" size="lg" />
<DragonRenderer dragonType="ascii" asciiProps={{ pose: 'flying' }} />
<DragonRenderer dragonType="3d" threeDProps={{ showParticles: true }} />
```

### Voice Integration
```tsx
// Before (manual voice handling)
const getDragonPose = (voiceState) => {
  if (voiceState.isSpeaking) return 'attacking'
  // ... manual mapping
}

// After (automatic voice handling)
<DragonRenderer
  dragonType="ascii"
  voiceState={voiceState}
  // Automatic pose mapping
/>
```

## 📚 Related Components

- [`SimpleDragonSprite`](../SimpleDragonSprite.tsx) - 2D sprite implementation
- [`ASCIIDragon`](./ASCIIDragon.tsx) - ASCII art implementation
- [`Dragon3D`](./Dragon3D.tsx) - 3D model implementation
- [`VoiceInterface`](../voice/VoiceInterface.tsx) - Voice integration
- [`ErrorBoundary`](../ErrorBoundary.tsx) - Error handling

## 🤝 Contributing

When contributing to DragonRenderer:

1. Maintain backward compatibility
2. Add tests for new features
3. Update this README for new props
4. Follow the existing error handling patterns
5. Consider performance implications

## 📄 License

Part of the Seiron project. See project license for details.