# 🐉 Voice-Dragon Integration Documentation

This document provides comprehensive guidance for integrating voice features with the Seiron dragon animation system. The integration supports real-time voice state synchronization across all dragon types with advanced performance optimization and error handling.

## 🎯 Overview

The voice-dragon integration creates immersive visual feedback by connecting speech recognition, text-to-speech, and AI processing states with dynamic dragon animations. All dragon types (2D, 3D, ASCII) respond to unified voice states through functional programming patterns using fp-ts and RxJS.

### Architecture Highlights

- **Unified Voice State Interface** - Single state object drives all dragon animations
- **Functional Programming** - Error handling with TaskEither, reactive streams with RxJS
- **Performance Optimization** - Automatic quality adjustment and fallback systems
- **Type Safety** - Complete TypeScript coverage with strict mode
- **Real-time Synchronization** - Voice events trigger immediate dragon responses

## 🚀 Features

### ✨ Real-time Voice Feedback
- **Listening State**: Dragons show alert poses with breathing animations
- **Speaking State**: Dragons display energy effects and aggressive poses  
- **Processing State**: Dragons show rotation and processing indicators
- **Idle State**: Dragons perform gentle breathing and floating animations
- **Error State**: Dragons display angry emotions with red visual effects

### 🎨 Visual Effects by Dragon Type

#### 2D Sprite Dragons
- Dynamic scaling and pulsing animations
- Particle energy effects during speaking
- Ripple effects during listening
- Processing spinner overlays
- Voice volume-based glow intensity

#### ASCII Dragons
- Character intensity mapping based on voice state
- Enhanced breathing with voice volume
- Pose changes (coiled → flying → attacking → sleeping)
- Energy character substitution during speech
- Color-coded glow effects

#### 3D Dragons
- Animation speed modulation
- Particle system intensity control
- Auto-rotation during processing
- Breathing intensity adjustments
- Enhanced lighting effects

## 🔧 Implementation

### Core Architecture

#### 1. Voice State Management

The voice-dragon integration uses a functional programming approach with fp-ts for robust state management:

```typescript
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Voice Animation State Interface
interface VoiceAnimationState {
  isListening: boolean      // Microphone is active
  isSpeaking: boolean       // TTS is playing
  isProcessing: boolean     // AI is processing
  isIdle: boolean          // No voice activity
  volume?: number          // Voice intensity (0-1)
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}

// Create voice state with validation
const createVoiceState = (
  isListening: boolean,
  isSpeaking: boolean,
  isProcessing: boolean,
  volume?: number,
  emotion?: string
): TE.TaskEither<Error, VoiceAnimationState> => {
  return TE.of({
    isListening,
    isSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume: volume ? Math.max(0, Math.min(1, volume)) : undefined,
    emotion: emotion as VoiceAnimationState['emotion'] || 'neutral'
  })
}
```

#### 2. DragonRenderer Integration

The unified DragonRenderer component handles all voice integration automatically:

```typescript
import { DragonRenderer, VoiceAnimationState } from '@/components/dragon'
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@/hooks/voice/useElevenLabsTTS'

function VoiceIntegratedDragon() {
  const { isListening, transcript } = useSpeechRecognition()
  const { isSpeaking, volume } = useElevenLabsTTS()
  const [isProcessing, setIsProcessing] = useState(false)

  // Voice state automatically drives dragon animations
  const voiceState: VoiceAnimationState = {
    isListening,
    isSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume,
    emotion: transcript.includes('!') ? 'excited' : 'neutral'
  }

  return (
    <DragonRenderer
      dragonType="ascii"           // '2d' | '3d' | 'ascii'
      size="xl"                    // 'sm' | 'md' | 'lg' | 'xl'
      voiceState={voiceState}      // Unified voice integration
      enableFallback={true}        // Auto-fallback on errors
      fallbackType="2d"            // Fallback dragon type
      performanceMode="auto"       // Performance optimization
      onError={(error, type) => console.error(`${type} error:`, error)}
      onFallback={(from, to) => console.log(`Fallback: ${from} → ${to}`)}
    />
  )
}
```

#### 3. Voice State Mapping Utilities

Advanced utilities for mapping voice states to dragon-specific properties:

```typescript
// Voice state to ASCII pose mapping
export const voiceStateToASCIIPose = (voiceState: VoiceAnimationState): ASCIIPose => {
  if (voiceState.isSpeaking) return 'attacking'
  if (voiceState.isListening) return 'flying'
  if (voiceState.isProcessing) return 'coiled'
  if (voiceState.emotion === 'sleeping') return 'sleeping'
  return 'coiled'
}

// Voice state to animation speed mapping
export const voiceStateToAnimationSpeed = (voiceState: VoiceAnimationState): AnimationSpeed => {
  if (voiceState.isSpeaking) return 'fast'
  if (voiceState.isListening) return 'normal'
  if (voiceState.isProcessing) return 'normal'
  return 'slow'
}

// Voice state to 3D dragon properties
export const voiceStateTo3DProps = (voiceState: VoiceAnimationState) => ({
  animationSpeed: voiceState.isSpeaking ? 2 : voiceState.isListening ? 1.5 : 1,
  showParticles: voiceState.isSpeaking || voiceState.isListening,
  autoRotate: voiceState.isProcessing,
  auraColor: voiceState.isSpeaking ? '#f59e0b' : voiceState.isListening ? '#10b981' : '#ef4444'
})

// Dynamic character intensity for ASCII dragons
export const getCharacterIntensity = (voiceState: VoiceAnimationState): number => {
  const baseIntensity = 0.5
  const volumeBoost = (voiceState.volume || 0) * 0.4
  const stateBoost = voiceState.isSpeaking ? 0.3 : voiceState.isListening ? 0.2 : 0
  return Math.min(1, baseIntensity + volumeBoost + stateBoost)
}
```

#### 4. Advanced Voice Integration with Hooks

For advanced control, use the dragon hooks directly:

```typescript
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'

function AdvancedVoiceDragon() {
  // 3D Dragon with voice integration
  const dragon3D = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })

  // ASCII Dragon with voice reactivity
  const asciiDragon = useASCIIDragon({
    enableVoiceReactivity: true,
    enableBreathing: true,
    enableFloating: true
  })

  // Voice integration callbacks
  const handleVoiceEvents = {
    onListeningStart: () => {
      dragon3D.onVoiceListeningStart()
      asciiDragon.setPose('flying')
    },
    onSpeakingStart: () => {
      dragon3D.onVoiceSpeakingStart()
      asciiDragon.setPose('attacking')
    },
    onProcessingStart: () => {
      dragon3D.onVoiceProcessingStart()
      asciiDragon.setPose('coiled')
    },
    onTranscriptUpdate: (transcript: string) => {
      dragon3D.onTranscriptUpdate(transcript)
      if (transcript.length > 50) {
        dragon3D.triggerSpecialAnimation('pulse')()
      }
    }
  }

  return (
    <div className="advanced-voice-dragon">
      {/* Use either 3D or ASCII dragon based on preference */}
      <Dragon3D
        size="xl"
        quality={dragon3D.shouldReduceQuality() ? 'low' : 'high'}
        enableInteraction={true}
        showParticles={!dragon3D.shouldDisableAnimations()}
      />
      
      <ASCIIDragon
        size="xl"
        pose={asciiDragon.currentPose}
        speed={asciiDragon.animationSpeed}
        enableBreathing={asciiDragon.enableBreathing}
      />
    </div>
  )
}
```

## 📚 Usage Examples

### Basic Voice-Dragon Integration

```typescript
import React, { useState, useEffect } from 'react'
import { DragonRenderer, VoiceAnimationState } from '@/components/dragon'
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@/hooks/voice/useElevenLabsTTS'

function BasicVoiceDragon() {
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Voice recognition hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true
  })
  
  // Text-to-speech hook
  const {
    isSpeaking,
    volume,
    speak
  } = useElevenLabsTTS({
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID!,
    stability: 0.5,
    similarityBoost: 0.5
  })
  
  // Create voice animation state
  const voiceState: VoiceAnimationState = {
    isListening,
    isSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume,
    emotion: transcript.includes('!') ? 'excited' : 'neutral'
  }
  
  // Handle voice interaction
  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }
  
  // Process transcript when listening ends
  useEffect(() => {
    if (transcript && !isListening) {
      setIsProcessing(true)
      
      // Simulate AI processing
      setTimeout(() => {
        setIsProcessing(false)
        speak(`You said: ${transcript}`)
      }, 1500)
    }
  }, [transcript, isListening, speak])
  
  return (
    <div className="voice-dragon-demo">
      <DragonRenderer
        dragonType="ascii"
        size="xl"
        voiceState={voiceState}
        enableFallback={true}
        fallbackType="2d"
        onError={(error, type) => console.error(`Dragon error:`, error)}
      />
      
      <div className="controls mt-6">
        <button
          onClick={handleVoiceToggle}
          disabled={isSpeaking || isProcessing}
          className={`px-6 py-3 rounded-lg font-medium ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } disabled:opacity-50`}
        >
          {isListening ? 'Stop Listening' : 'Start Voice'}
        </button>
        
        <div className="voice-status mt-4">
          {isListening && <span className="text-blue-600">🎤 Listening...</span>}
          {isSpeaking && <span className="text-orange-600">🗣️ Speaking...</span>}
          {isProcessing && <span className="text-purple-600">🧠 Processing...</span>}
        </div>
        
        {transcript && (
          <div className="transcript mt-4 p-3 bg-gray-100 rounded">
            <strong>Transcript:</strong> {transcript}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Advanced Multi-Dragon Setup

```typescript
import React, { useState } from 'react'
import { DragonRenderer, VoiceAnimationState, DragonType } from '@/components/dragon'
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'

function MultiDragonVoiceDemo() {
  const [activeDragonType, setActiveDragonType] = useState<DragonType>('ascii')
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5,
    emotion: 'neutral'
  })
  
  // Advanced 3D dragon control
  const dragon3D = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true,
    enableAutoStateTransitions: true,
    autoOptimize: true
  })
  
  // Advanced ASCII dragon control
  const asciiDragon = useASCIIDragon({
    enableVoiceReactivity: true,
    enableBreathing: true,
    enableFloating: true,
    performanceMode: 'medium'
  })
  
  // Sync voice state with dragon hooks
  useEffect(() => {
    if (activeDragonType === '3d') {
      if (voiceState.isListening) dragon3D.onVoiceListeningStart()
      if (voiceState.isSpeaking) dragon3D.onVoiceSpeakingStart()
      if (voiceState.isProcessing) dragon3D.onVoiceProcessingStart()
    } else if (activeDragonType === 'ascii') {
      asciiDragon.updateVoiceState(voiceState)
    }
  }, [voiceState, activeDragonType])
  
  // Voice state simulation functions
  const simulateVoiceState = (newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({
      ...prev,
      ...newState,
      isIdle: !newState.isListening && !newState.isSpeaking && !newState.isProcessing
    }))
  }
  
  return (
    <div className="multi-dragon-demo max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Multi-Dragon Voice Integration</h2>
      
      {/* Dragon Type Selector */}
      <div className="dragon-selector mb-6">
        <h3 className="text-lg font-semibold mb-3">Dragon Type</h3>
        <div className="flex gap-2">
          {(['2d', '3d', 'ascii'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveDragonType(type)}
              className={`px-4 py-2 rounded ${
                activeDragonType === type 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {type.toUpperCase()} Dragon
            </button>
          ))}
        </div>
      </div>
      
      {/* Dragon Display */}
      <div className="dragon-display mb-6">
        <div className="flex justify-center items-center min-h-[400px] bg-gray-900 rounded-lg">
          <DragonRenderer
            dragonType={activeDragonType}
            size="xl"
            voiceState={voiceState}
            enableFallback={true}
            fallbackType="ascii"
            performanceMode="auto"
            onError={(error, type) => console.error(`${type} error:`, error)}
            onFallback={(from, to) => console.log(`Fallback: ${from} → ${to}`)}
          />
        </div>
      </div>
      
      {/* Voice Controls */}
      <div className="voice-controls mb-6">
        <h3 className="text-lg font-semibold mb-3">Voice State Controls</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => simulateVoiceState({ isListening: true })}
            className={`p-3 rounded text-center ${
              voiceState.isListening 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🎤 Listening
          </button>
          
          <button
            onClick={() => simulateVoiceState({ isSpeaking: true })}
            className={`p-3 rounded text-center ${
              voiceState.isSpeaking 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🗣️ Speaking
          </button>
          
          <button
            onClick={() => simulateVoiceState({ isProcessing: true })}
            className={`p-3 rounded text-center ${
              voiceState.isProcessing 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            🧠 Processing
          </button>
          
          <button
            onClick={() => simulateVoiceState({ 
              isListening: false, 
              isSpeaking: false, 
              isProcessing: false 
            })}
            className={`p-3 rounded text-center ${
              voiceState.isIdle 
                ? 'bg-gray-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            😴 Idle
          </button>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            Volume: {Math.round((voiceState.volume || 0) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={voiceState.volume || 0}
            onChange={(e) => setVoiceState(prev => ({
              ...prev,
              volume: parseFloat(e.target.value)
            }))}
            className="w-full"
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Emotion:</label>
          <select
            value={voiceState.emotion}
            onChange={(e) => setVoiceState(prev => ({
              ...prev,
              emotion: e.target.value as VoiceAnimationState['emotion']
            }))}
            className="px-3 py-1 border rounded"
          >
            <option value="neutral">Neutral</option>
            <option value="happy">Happy</option>
            <option value="excited">Excited</option>
            <option value="angry">Angry</option>
            <option value="sleeping">Sleeping</option>
          </select>
        </div>
      </div>
      
      {/* Status Display */}
      <div className="status-display">
        <h3 className="text-lg font-semibold mb-3">Dragon Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded">
            <h4 className="font-medium">Current Dragon: {activeDragonType.toUpperCase()}</h4>
            {activeDragonType === '3d' && (
              <div className="text-sm space-y-1 mt-2">
                <div>State: {dragon3D.state}</div>
                <div>Mood: {dragon3D.mood}</div>
                <div>Power: {dragon3D.powerLevel}%</div>
                <div>Performance: {dragon3D.performanceScore}%</div>
                <div>Voice Active: {dragon3D.isVoiceActive() ? 'Yes' : 'No'}</div>
              </div>
            )}
            {activeDragonType === 'ascii' && (
              <div className="text-sm space-y-1 mt-2">
                <div>Pose: {asciiDragon.currentPose}</div>
                <div>Speed: {asciiDragon.animationSpeed}</div>
                <div>Breathing: {Math.round(asciiDragon.breathingIntensity * 100)}%</div>
                <div>Effects: {asciiDragon.shouldShowEffects ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h4 className="font-medium">Voice State</h4>
            <div className="text-sm space-y-1 mt-2">
              <div>Listening: {voiceState.isListening ? '🎤' : '❌'}</div>
              <div>Speaking: {voiceState.isSpeaking ? '🗣️' : '❌'}</div>
              <div>Processing: {voiceState.isProcessing ? '🧠' : '❌'}</div>
              <div>Volume: {Math.round((voiceState.volume || 0) * 100)}%</div>
              <div>Emotion: {voiceState.emotion}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Custom Voice Events Integration

```typescript
import React, { useCallback } from 'react'
import { DragonRenderer } from '@/components/dragon'
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

function CustomVoiceEvents() {
  const dragon = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true
  })
  
  // Custom voice event handlers with error handling
  const handleCustomVoiceEvent = useCallback((eventType: string, data?: any) => {
    const handleEvent = (): TE.TaskEither<Error, void> => {
      switch (eventType) {
        case 'excited_speech':
          return pipe(
            dragon.setMood('excited'),
            TE.chain(() => dragon.setPowerLevel(90)),
            TE.chain(() => dragon.triggerSpecialAnimation('roar'))
          )
          
        case 'quiet_listening':
          return pipe(
            dragon.setState('listening'),
            TE.chain(() => dragon.setMood('focused')),
            TE.chain(() => dragon.setPowerLevel(40))
          )
          
        case 'long_processing':
          return pipe(
            dragon.setState('processing'),
            TE.chain(() => dragon.setMood('mystical')),
            TE.chain(() => dragon.triggerSpecialAnimation('orbit'))
          )
          
        default:
          return TE.left(new Error(`Unknown event type: ${eventType}`))
      }
    }
    
    // Execute with error handling
    handleEvent()().then(
      (result) => {
        if (result._tag === 'Left') {
          console.error('Voice event failed:', result.left)
        } else {
          console.log('Voice event completed:', eventType)
        }
      }
    )
  }, [dragon])
  
  return (
    <div className="custom-voice-events">
      <DragonRenderer
        dragonType="3d"
        size="xl"
        enableFallback={true}
        performanceMode="auto"
      />
      
      <div className="event-triggers mt-6">
        <h3 className="text-lg font-semibold mb-3">Custom Voice Events</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleCustomVoiceEvent('excited_speech')}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Excited Speech
          </button>
          
          <button
            onClick={() => handleCustomVoiceEvent('quiet_listening')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Quiet Listening
          </button>
          
          <button
            onClick={() => handleCustomVoiceEvent('long_processing')}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Long Processing
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 🛠️ Configuration

### Environment Variables
```bash
# Required for TTS functionality
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_api_key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your_voice_id
NEXT_PUBLIC_VOICE_ENABLED=true
```

### Dragon Type Selection
- **`2d`**: Best for general use, fast performance
- **`3d`**: Immersive experience, requires WebGL support
- **`ascii`**: Lightweight, retro aesthetic, great for low-power devices

### Performance Modes
- **`auto`**: Automatically selects optimal settings
- **`high`**: Maximum quality and effects
- **`low`**: Minimal effects for better performance

## 🎪 Demo Components

### VoiceDragonDemo
Comprehensive demo showcasing all integration features:
- Real-time voice state simulation
- Dragon type switching
- Animation toggles
- Performance monitoring
- Error handling examples

### VoiceDragonIntegrationExample  
Simple example for getting started:
- Basic voice-dragon setup
- Dragon type selection
- Live transcript display
- Error handling

## 🚀 Performance Features

### Automatic Fallbacks
- 3D → 2D → ASCII fallback chain
- WebGL support detection
- Error boundary protection
- Graceful degradation

### Optimization
- Lazy loading of 3D components
- Debounced voice state updates
- Memoized animation calculations
- Efficient character mapping

### Monitoring
```typescript
const performanceMetrics = {
  renderTime: number,
  initTime: number, 
  dragonType: DragonType,
  fallbackUsed: boolean,
  errorCount: number
}
```

## 🔍 Technical Details

### Voice State Transitions
Voice states are smoothly interpolated to prevent jarring animation changes:

```typescript
const smoothTransition = voiceStateTransitions.interpolate(
  fromState,
  toState, 
  progress
)
```

### Character Intensity Mapping (ASCII)
ASCII characters are dynamically replaced based on voice intensity:

```typescript
// Base intensity: '~' → '≈' → '∼' → '≋'
// Voice enhanced: '~' → '≈' → '〜' → '⌇'
```

### Animation Synchronization
All dragon types synchronize with voice events:
- **Microphone start** → Listening pose
- **TTS start** → Speaking pose  
- **Audio processing** → Processing indicators
- **Idle detection** → Relaxed breathing

## 🧪 Testing

### Unit Tests
```bash
npm test -- voice-dragon
```

### Integration Tests  
```bash
npm test -- VoiceInterface.test
```

### E2E Voice Flow Tests
```bash
npm run e2e:test -- voice-dragon-flow.cy.ts
```

### Manual Testing
1. Open VoiceDragonDemo component
2. Test each dragon type with voice interactions
3. Verify fallback behavior
4. Check performance with different configurations

## 🐛 Troubleshooting

### Common Issues

#### No Dragon Animation
- Check `enableDragonAnimations` prop
- Verify `voiceState` is provided
- Ensure browser supports required features

#### 3D Dragon Not Loading
- Verify WebGL support: `detect3DSupport()`
- Check console for Three.js errors
- Ensure fallback is enabled

#### Voice Not Working
- Verify ElevenLabs API key and voice ID
- Check browser permissions for microphone
- Test with HTTPS (required for Web Speech API)

#### Poor Performance
- Switch to ASCII dragon type
- Set `performanceMode="low"`
- Disable complex animations

### Debug Mode
Enable development logging:
```typescript
logger.setLevel('debug')
voiceLogger.enableDebugMode()
```

## 🎯 Future Enhancements

### Planned Features
- [ ] Voice emotion detection
- [ ] Custom dragon reactions
- [ ] Multi-language TTS support
- [ ] Advanced particle systems
- [ ] Voice-controlled dragon movements
- [ ] Custom ASCII art patterns
- [ ] Real-time voice training
- [ ] Dragon personality modes

### Performance Improvements
- [ ] WebGL2 renderer for 3D dragons
- [ ] Worker thread for voice processing
- [ ] Precomputed animation curves
- [ ] Advanced caching strategies

## 📖 API Reference

### Voice Components
- `VoiceInterface` - Main voice interaction component
- `VoiceDragonDemo` - Full-featured demo component  
- `VoiceDragonIntegrationExample` - Simple usage example

### Dragon Components
- `DragonRenderer` - Universal dragon component
- `SimpleDragonSprite` - 2D dragon with voice integration
- `ASCIIDragon` - Terminal-style dragon with voice effects
- `Dragon3D` - Full 3D dragon with physics

### Utilities
- `voice-dragon-mapping` - State mapping utilities
- `createVoiceAnimationState` - Voice state factory
- `getOptimalDragonType` - Performance-based type selection
- `voiceStateTransitions` - Smooth state interpolation

## 📄 License

This integration is part of the Seiron project and follows the same licensing terms.

---

**Dragon speaks with wisdom and power!** 🐉🔥

*Built with fp-ts, RxJS, Framer Motion, and Three.js*