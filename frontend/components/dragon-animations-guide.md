# Seiron Dragon Animation Guide

## Overview
This guide provides comprehensive documentation for implementing sophisticated dragon animations across multiple rendering modes: 2D sprites, ASCII art, and 3D models. The system uses CSS, Framer Motion, and Three.js for creating immersive dragon experiences with voice integration.

## Dragon Rendering Modes

### 1. **2D Sprite Dragon** (`SimpleDragonSprite`)
- Traditional sprite-based animations
- High compatibility across all devices
- Lightweight performance footprint
- Ideal for mobile and low-power devices

### 2. **ASCII Dragon** (`ASCIIDragon`)
- Terminal-style ASCII art representation
- Typewriter effects and breathing animations
- Voice-reactive character intensity
- Retro aesthetic with modern animations

### 3. **3D Dragon** (`Dragon3D`)
- Full 3D model with realistic animations
- Advanced particle systems and lighting
- WebGL-powered with Three.js
- Performance monitoring and auto-optimization

### 4. **Unified Dragon Renderer** (`DragonRenderer`)
- Seamless switching between all dragon types
- Automatic fallback support
- Performance-based type selection
- Unified voice integration API

## Animation States

All dragon types support the following unified animation states:

### 1. **Idle State**
- **2D**: Subtle breathing animation (chest rise/fall), gentle floating
- **ASCII**: Breathing character intensity, slow typewriter effects
- **3D**: Minimal movement with soft breathing and floating
- **Voice**: Calm state with low power level (30%)

### 2. **Attention State** 
- **2D**: Eyes follow cursor, increased glow intensity
- **ASCII**: Enhanced character variations, increased breathing
- **3D**: Head tracking, moderate aura intensity
- **Voice**: Alert mode when proximity detected

### 3. **Listening State** (Voice Integration)
- **2D**: Focused pose with blue-tinted glow
- **ASCII**: Alert pose (`flying`) with blue pulse effects
- **3D**: Attentive posture with green aura, moderate particles
- **Voice**: Active listening with real-time feedback

### 4. **Speaking State** (Voice Integration)
- **2D**: Dynamic breathing with orange glow
- **ASCII**: Attacking pose with energy effects and rapid breathing
- **3D**: Animated jaw movement, yellow aura, enhanced particles
- **Voice**: High intensity with fire breathing effects

### 5. **Processing State** (Voice Integration)
- **2D**: Thoughtful pose with gentle pulsing
- **ASCII**: Coiled pose with processing indicator
- **3D**: Contemplative state with purple aura and orbital particles
- **Voice**: Medium intensity with mystical effects

### 6. **Active State**
- **2D**: Full power aura, dramatic scale and rotation effects
- **ASCII**: Maximum character intensity with energy waves
- **3D**: High energy state with intense particles and aura
- **Voice**: Peak power level (90%+) with all effects enabled

## CSS Animation Classes

### Basic Animations
```css
.dragon-breathe          /* Breathing animation */
.dragon-float-enhanced   /* Complex floating pattern */
.dragon-idle            /* Combined idle animations */
.dragon-wing            /* Wing twitch animation */
```

### State Animations
```css
.dragon-anticipate      /* Anticipation animation */
.dragon-attention       /* Attention tracking */
.dragon-ready          /* Ready state pulse */
.dragon-active         /* Active power state */
```

### Effect Animations
```css
.dragon-aura           /* Glowing aura effect */
.dragon-magic-particles /* Magical particle system */
.dragon-transform      /* Performance-optimized transforms */
.dragon-3d-container   /* 3D perspective container */
```

## Dragon Components

### DragonRenderer (Unified Component)
Main dragon component supporting all rendering modes with seamless switching.

```tsx
import { DragonRenderer, VoiceAnimationState } from '@/components/dragon'

// Basic usage with type switching
<DragonRenderer 
  dragonType="3d"              // '2d' | '3d' | 'ascii'
  size="lg"                    // 'sm' | 'md' | 'lg' | 'xl'
  enableFallback={true}        // Auto-fallback on errors
  fallbackType="2d"            // Fallback dragon type
  performanceMode="auto"       // 'auto' | 'high' | 'low'
  className=""                 // Additional CSS classes
/>

// Advanced usage with voice integration
const voiceState: VoiceAnimationState = {
  isListening: false,
  isSpeaking: true,
  isProcessing: false,
  isIdle: false,
  volume: 0.8,
  emotion: 'excited'
}

<DragonRenderer 
  dragonType="ascii"
  voiceState={voiceState}
  onError={(error, type) => console.error(`Dragon ${type} error:`, error)}
  onFallback={(from, to) => console.log(`Fallback from ${from} to ${to}`)}
  onPerformanceMetrics={(metrics) => console.log('Performance:', metrics)}
/>
```

### ASCIIDragon Component
Terminal-style ASCII art dragon with typewriter effects.

```tsx
import { ASCIIDragon } from '@/components/dragon'

<ASCIIDragon
  size="lg"                    // 'sm' | 'md' | 'lg' | 'xl'
  pose="coiled"                // 'coiled' | 'flying' | 'attacking' | 'sleeping'
  speed="normal"               // 'slow' | 'normal' | 'fast'
  enableTypewriter={true}      // Typewriter reveal effect
  enableBreathing={true}       // Character intensity breathing
  enableFloating={true}        // Gentle floating animation
  voiceState={voiceState}      // Voice integration
/>
```

### Dragon3D Component (Lazy Loaded)
Advanced 3D dragon with WebGL rendering and particle effects.

```tsx
import { Dragon3D } from '@/components/dragon'

<Dragon3D
  size="lg"                    // 'sm' | 'md' | 'lg' | 'xl'
  quality="high"               // 'low' | 'medium' | 'high'
  enableInteraction={true}     // Mouse interaction
  showParticles={true}         // Particle effects
  autoRotate={false}           // Auto rotation
  animationSpeed={1.5}         // Animation speed multiplier
/>
```

### Dragon Animation Hooks

#### useDragon3D Hook
Advanced 3D dragon control with functional programming patterns.

```tsx
import { useDragon3D } from '@/hooks/voice/useDragon3D'

const {
  // State
  state,                       // Current dragon state
  mood,                        // Current dragon mood
  powerLevel,                  // Power level (0-100)
  isCharging,                  // Charging state
  isAnimating,                 // Animation active
  animationConfig,             // Current animation config
  voiceIntegration,            // Voice integration state
  performance,                 // Performance metrics
  
  // Actions
  setState,                    // TaskEither<Error, void>
  setMood,                     // TaskEither<Error, void>
  setPowerLevel,               // TaskEither<Error, void>
  triggerSpecialAnimation,     // TaskEither<Error, void>
  clearSpecialAnimation,       // Dispatch action
  
  // Voice Integration
  onVoiceListeningStart,
  onVoiceListeningEnd,
  onVoiceSpeakingStart,
  onVoiceSpeakingEnd,
  onVoiceProcessingStart,
  onVoiceProcessingEnd,
  onTranscriptUpdate,
  
  // Functional Getters
  getSpecialAnimation,         // () => Option<SpecialAnimation>
  hasSpecialAnimation,         // () => boolean
  isVoiceActive,              // () => boolean
  isPowerful,                 // () => boolean
  isCalm,                     // () => boolean
  
  // Performance Utilities
  shouldReduceQuality,         // () => boolean
  shouldDisableAnimations,     // () => boolean
  performanceScore,            // number (0-100)
  
  // Reactive Streams (RxJS)
  dragonState$,               // Observable<DragonState>
  powerLevel$,                // Observable<number>
  voiceEvents$                // Observable<VoiceEvent>
} = useDragon3D({
  enableVoiceIntegration: true,
  enablePerformanceMonitoring: true,
  enableAutoStateTransitions: true,
  enableProximityDetection: false,
  proximityThreshold: 300,
  autoOptimize: true,
  initialState: 'idle',
  initialMood: 'calm',
  initialPowerLevel: 30
})
```

#### useASCIIDragon Hook
ASCII dragon control with voice-reactive effects.

```tsx
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'

const {
  currentPose,                 // Current ASCII pose
  animationSpeed,              // Current animation speed
  isTypewriting,               // Typewriter effect active
  breathingIntensity,          // Breathing intensity (0-1)
  shouldShowEffects,           // Voice effects enabled
  
  // Actions
  setPose,                     // (pose: ASCIIPose) => void
  setSpeed,                    // (speed: AnimationSpeed) => void
  triggerTypewriter,           // () => void
  
  // Voice Integration
  updateVoiceState,            // (state: VoiceAnimationState) => void
  getVoiceBasedPose,          // () => ASCIIPose
  getVoiceBasedSpeed,         // () => AnimationSpeed
  
  // Effect Controls
  enableBreathingEffect,       // () => void
  disableBreathingEffect,      // () => void
  enableFloatingEffect,        // () => void
  disableFloatingEffect        // () => void
} = useASCIIDragon({
  initialPose: 'coiled',
  initialSpeed: 'normal',
  enableVoiceReactivity: true,
  enableBreathing: true,
  enableFloating: true
})
```

## Animation Timing & Easing

### Breathing
- Duration: 4s
- Easing: ease-in-out
- Scale: 1 → 1.02 → 1

### Floating
- Duration: 8s
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Complex Y/X/Rotate transforms

### Wind Drift
- Duration: 15s
- Easing: ease-in-out
- X translation with skew

### State Transitions
- Duration: 0.3-3s (varies by state)
- Spring physics for responsive feel
- Stiffness: 200-300
- Damping: 20-25

## Voice Integration

### Voice State Interface
All dragon components support unified voice integration through the `VoiceAnimationState` interface:

```typescript
interface VoiceAnimationState {
  isListening: boolean      // Microphone is active
  isSpeaking: boolean       // TTS is playing
  isProcessing: boolean     // AI is processing
  isIdle: boolean          // No voice activity
  volume?: number          // Voice intensity (0-1)
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}
```

### Voice-to-Animation Mapping

#### ASCII Dragon Voice Mapping
```typescript
// Voice state determines ASCII pose
isListening → 'flying' pose with blue effects
isSpeaking → 'attacking' pose with fire effects  
isProcessing → 'coiled' pose with purple indicator
isIdle → 'coiled' pose with gentle breathing

// Volume affects character intensity
volume: 0.0-0.3 → Basic characters (·, ~, |)
volume: 0.3-0.7 → Enhanced characters (≈, ∼, ‖)
volume: 0.7-1.0 → Energy characters (≋, ◉, █)
```

#### 3D Dragon Voice Mapping
```typescript
// Voice state affects 3D animations
isListening → Green aura, attentive pose, moderate particles
isSpeaking → Yellow/orange aura, animated breathing, high particles
isProcessing → Purple aura, contemplative state, orbital motion
isIdle → Red aura, gentle breathing, minimal particles

// Volume affects animation intensity
animationSpeed = baseSpeed * (1 + volume)
particleCount = baseCount * (1 + volume * 0.5)
auraIntensity = baseIntensity * (0.5 + volume * 0.5)
```

### Real-time Voice Integration Example
```tsx
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@/hooks/voice/useElevenLabsTTS'
import { DragonRenderer } from '@/components/dragon'

function VoiceDragonDemo() {
  const { isListening, transcript } = useSpeechRecognition()
  const { isSpeaking, volume } = useElevenLabsTTS()
  
  const voiceState: VoiceAnimationState = {
    isListening,
    isSpeaking,
    isProcessing: false,
    isIdle: !isListening && !isSpeaking,
    volume: volume,
    emotion: transcript.includes('!') ? 'excited' : 'neutral'
  }
  
  return (
    <DragonRenderer
      dragonType="ascii"
      voiceState={voiceState}
      enableFallback={true}
    />
  )
}
```

## Performance Optimization

### Performance Monitoring
The dragon system includes built-in performance monitoring:

```typescript
// Automatic performance detection
const performanceMetrics = {
  renderTime: number,        // Component render time
  initTime: number,          // Initialization time
  dragonType: DragonType,    // Current active type
  fallbackUsed: boolean,     // Fallback was triggered
  errorCount: number         // Error count
}

// Performance-based optimizations
if (performanceScore < 50) {
  // Disable particles and complex effects
  // Switch to lower quality rendering
  // Reduce animation complexity
}

if (performanceScore < 30) {
  // Auto-fallback to 2D mode
  // Disable all advanced effects
  // Minimal animation mode
}
```

### CSS Optimizations
```css
.dragon-transform {
  will-change: transform, filter;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

.dragon-3d-container {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.dragon-ascii {
  font-feature-settings: "liga" off;
  text-rendering: optimizeSpeed;
  white-space: pre;
}
```

### Component-Specific Optimizations

#### 3D Dragon Optimization
```typescript
// Quality levels affect rendering complexity
quality: 'low' → {
  particles: disabled,
  shadows: disabled,
  postProcessing: disabled,
  geometry: low-poly
}

quality: 'medium' → {
  particles: reduced,
  shadows: simple,
  postProcessing: basic,
  geometry: medium-poly
}

quality: 'high' → {
  particles: full,
  shadows: complex,
  postProcessing: full,
  geometry: high-poly
}
```

#### ASCII Dragon Optimization
```typescript
// Performance modes for ASCII rendering
typewriterSpeed: {
  slow: 150ms,    // Better for low-end devices
  normal: 100ms,  // Balanced performance
  fast: 50ms      // High-performance devices
}

characterIntensity: {
  low: 3 variations,     // Basic ASCII characters
  medium: 5 variations,  // Enhanced characters
  high: 7 variations     // Full Unicode effects
}
```

### Framer Motion Best Practices
1. Use `AnimatePresence` for exit animations
2. Batch animations with `useAnimation` hook
3. Minimize re-renders with proper state management
4. Use CSS for continuous animations, Framer for interactions
5. Implement lazy loading for complex components
6. Use `will-change` CSS property strategically

## Special Effects

The dragon system supports multiple special animation types across all rendering modes:

### 3D Dragon Special Animations
```tsx
import { useDragon3D } from '@/hooks/voice/useDragon3D'

const { triggerSpecialAnimation } = useDragon3D()

// Available special animations
triggerSpecialAnimation('roar')        // 3s duration - Dramatic roar with particle burst
triggerSpecialAnimation('powerUp')     // 2s duration - Energy charging with aura expansion
triggerSpecialAnimation('spin')        // 1.5s duration - 360° rotation with trail effects
triggerSpecialAnimation('pulse')       // 1s duration - Rhythmic scale pulsing
triggerSpecialAnimation('shake')       // 0.8s duration - Intimidation shake
triggerSpecialAnimation('breatheFire') // 2.5s duration - Fire breathing animation
triggerSpecialAnimation('orbit')       // 4s duration - Orbital camera movement
triggerSpecialAnimation('charge')      // 3.5s duration - Power charging sequence
```

### ASCII Dragon Special Effects
```tsx
// ASCII dragons use character-based effects
voiceState.isSpeaking → Energy wave effects with enhanced characters
voiceState.isListening → Pulsing border effects
voiceState.emotion === 'excited' → Rapid character cycling
voiceState.emotion === 'angry' → Red border with shake effect
voiceState.volume > 0.8 → Maximum character intensity with energy aura
```

### Voice-Triggered Effects
```tsx
// Automatic effects based on voice events
onTranscriptUpdate(transcript) → {
  if (transcript.length > 50 && transcript.length % 25 === 0) {
    triggerSpecialAnimation('pulse')
  }
}

onVoiceSpeakingStart() → {
  // Automatically trigger speaking animation
  setState('speaking')
  setMood('focused')
}

onVoiceListeningStart() → {
  // Automatically enter listening mode
  setState('listening')  
  setMood('alert')
}
```

### Effect Composition
```tsx
// Chain multiple effects for complex sequences
import { createSpecialAnimationSequence } from '@/hooks/voice/useDragon3D'

const powerUpSequence = createSpecialAnimationSequence([
  'charge',    // 3.5s - Build up energy
  'pulse',     // 1s - Quick pulse
  'powerUp',   // 2s - Release energy
  'roar'       // 3s - Victory roar
], 500) // 500ms between animations

// Execute the sequence
powerUpSequence()
```

## Mobile Optimization

- Gesture controls adapt to touch
- Reduced particle count on mobile
- Simplified shadows for performance
- Touch-friendly interaction zones

## Integration Examples

### Basic Dragon Integration
```tsx
import { DragonRenderer } from '@/components/dragon'
import { useState } from 'react'

function BasicDragonDemo() {
  const [dragonType, setDragonType] = useState<'2d' | '3d' | 'ascii'>('ascii')
  
  return (
    <div className="dragon-container">
      {/* Dragon Type Selector */}
      <div className="dragon-controls">
        <button onClick={() => setDragonType('2d')}>2D Dragon</button>
        <button onClick={() => setDragonType('ascii')}>ASCII Dragon</button>
        <button onClick={() => setDragonType('3d')}>3D Dragon</button>
      </div>
      
      {/* Dragon Renderer */}
      <DragonRenderer
        dragonType={dragonType}
        size="lg"
        enableFallback={true}
        fallbackType="2d"
        className="my-dragon"
      />
    </div>
  )
}
```

### Advanced Voice-Integrated Dragon
```tsx
import { DragonRenderer, VoiceAnimationState } from '@/components/dragon'
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@/hooks/voice/useElevenLabsTTS'
import { useState, useEffect } from 'react'

function VoiceIntegratedDragon() {
  const [isProcessing, setIsProcessing] = useState(false)
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition()
  const { isSpeaking, volume, speak } = useElevenLabsTTS()

  // Handle AI processing simulation
  useEffect(() => {
    if (transcript && !isListening) {
      setIsProcessing(true)
      // Simulate AI processing
      setTimeout(() => {
        setIsProcessing(false)
        speak(`You said: ${transcript}`)
      }, 2000)
    }
  }, [transcript, isListening, speak])

  const voiceState: VoiceAnimationState = {
    isListening,
    isSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume,
    emotion: transcript.includes('!') ? 'excited' : 'neutral'
  }

  return (
    <div className="voice-dragon-demo">
      <DragonRenderer
        dragonType="ascii"
        voiceState={voiceState}
        size="xl"
        enableFallback={true}
        onError={(error, type) => console.error(`Dragon error:`, error)}
      />
      
      <div className="voice-controls">
        <button 
          onClick={isListening ? stopListening : startListening}
          disabled={isSpeaking || isProcessing}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        
        <div className="voice-status">
          {isListening && <span>🎤 Listening...</span>}
          {isSpeaking && <span>🗣️ Speaking...</span>}
          {isProcessing && <span>🧠 Processing...</span>}
        </div>
      </div>
    </div>
  )
}
```

### 3D Dragon with Custom Controls
```tsx
import { Dragon3D } from '@/components/dragon'
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useCallback } from 'react'

function Advanced3DDragon() {
  const dragon3D = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true,
    enableProximityDetection: true,
    proximityThreshold: 250,
    autoOptimize: true
  })

  const handleSpecialEffect = useCallback((effect: string) => {
    dragon3D.triggerSpecialAnimation(effect as any)()
  }, [dragon3D])

  return (
    <div className="advanced-dragon-demo">
      <Dragon3D
        size="xl"
        quality={dragon3D.shouldReduceQuality() ? 'low' : 'high'}
        enableInteraction={true}
        showParticles={!dragon3D.shouldDisableAnimations()}
        animationSpeed={dragon3D.powerLevel / 100 + 0.5}
      />
      
      <div className="dragon-dashboard">
        <div className="status-panel">
          <p>State: {dragon3D.state}</p>
          <p>Mood: {dragon3D.mood}</p>
          <p>Power: {dragon3D.powerLevel}%</p>
          <p>Performance: {dragon3D.performanceScore}%</p>
        </div>
        
        <div className="control-panel">
          <button onClick={() => dragon3D.setState('active')()}>
            Activate Dragon
          </button>
          <button onClick={() => dragon3D.setMood('excited')()}>
            Excite Dragon
          </button>
          <button onClick={() => handleSpecialEffect('roar')}>
            Dragon Roar
          </button>
          <button onClick={() => handleSpecialEffect('breatheFire')}>
            Breathe Fire
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Performance Monitoring Example
```tsx
import { DragonRenderer, DragonPerformanceMetrics } from '@/components/dragon'
import { useState } from 'react'

function PerformanceMonitoredDragon() {
  const [metrics, setMetrics] = useState<DragonPerformanceMetrics | null>(null)
  const [optimizeMode, setOptimizeMode] = useState<'auto' | 'high' | 'low'>('auto')

  const handlePerformanceMetrics = (newMetrics: DragonPerformanceMetrics) => {
    setMetrics(newMetrics)
    
    // Auto-adjust performance mode based on metrics
    if (newMetrics.renderTime > 100) {
      setOptimizeMode('low')
    } else if (newMetrics.renderTime > 50) {
      setOptimizeMode('auto')
    } else {
      setOptimizeMode('high')
    }
  }

  return (
    <div className="performance-dragon">
      <DragonRenderer
        dragonType="3d"
        performanceMode={optimizeMode}
        onPerformanceMetrics={handlePerformanceMetrics}
        enableFallback={true}
        fallbackType="2d"
      />
      
      {metrics && (
        <div className="performance-metrics">
          <h3>Performance Metrics</h3>
          <p>Render Time: {metrics.renderTime}ms</p>
          <p>Init Time: {metrics.initTime}ms</p>
          <p>Dragon Type: {metrics.dragonType}</p>
          <p>Fallback Used: {metrics.fallbackUsed ? 'Yes' : 'No'}</p>
          <p>Errors: {metrics.errorCount}</p>
          <p>Performance Mode: {optimizeMode}</p>
        </div>
      )}
    </div>
  )
}
```

## Customization

### Custom Dragon States
Extend the `DragonState` type and add new animation variants:

```typescript
// Extend the base DragonState type
type CustomDragonState = DragonState | 'meditating' | 'dancing' | 'flying'

// Create custom state configurations
const customStateConfigs = {
  meditating: {
    breathing: { enabled: true, speed: 0.5, intensity: 0.2 },
    floating: { enabled: true, speed: 0.3, amplitude: 0.1 },
    aura: { enabled: true, intensity: 0.8, color: '#6b46c1' }
  },
  dancing: {
    breathing: { enabled: true, speed: 2, intensity: 0.8 },
    floating: { enabled: true, speed: 2, amplitude: 0.6 },
    wingFlapping: { enabled: true, speed: 2.5, intensity: 1 }
  }
}
```

### Custom ASCII Patterns
Add new ASCII art patterns for custom poses:

```typescript
// Custom ASCII dragon patterns
const customDragonPatterns = {
  meditating: {
    lg: [
      "      /\\_/\\",
      "     ( -.-)  ॐ",
      "      > ∿ <",
      "     /~~~~~\\",
      "    (  ~~~  )",
      "     \\~~~~~/"
    ]
  },
  dancing: {
    lg: [
      "      /\\_/\\",
      "     ( ^.^)♪",
      "      \\o o/",
      "     /|   |\\",
      "    / |~~~| \\",
      "   ♪  \\___/  ♪"
    ]
  }
}
```

### Theme Integration
Use CSS variables for comprehensive color customization:

```css
:root {
  /* Primary dragon colors */
  --dragon-primary: #ef4444;
  --dragon-secondary: #fb923c;
  --dragon-tertiary: #fcd34d;
  
  /* Voice state colors */
  --dragon-listening: #10b981;
  --dragon-speaking: #f59e0b;
  --dragon-processing: #8b5cf6;
  --dragon-idle: #6b7280;
  
  /* Animation timings */
  --dragon-breathe-duration: 4s;
  --dragon-float-duration: 8s;
  --dragon-transition-duration: 0.3s;
  
  /* 3D specific */
  --dragon-particle-color: rgba(239, 68, 68, 0.6);
  --dragon-aura-glow: 0 0 20px var(--dragon-primary);
}

/* Dark theme overrides */
[data-theme="dark"] {
  --dragon-primary: #f87171;
  --dragon-secondary: #fbbf24;
  --dragon-tertiary: #fde047;
}
```

### Custom Hook Integration
Create specialized hooks for specific use cases:

```typescript
// Custom hook for game-specific dragon behavior
export const useGameDragon = (gameState: GameState) => {
  const dragon3D = useDragon3D({
    enableVoiceIntegration: false,
    enablePerformanceMonitoring: true
  })
  
  useEffect(() => {
    // React to game events
    switch (gameState.phase) {
      case 'combat':
        dragon3D.setState('active')()
        dragon3D.setMood('powerful')()
        break
      case 'exploration':
        dragon3D.setState('attention')()
        dragon3D.setMood('curious')()
        break
      case 'rest':
        dragon3D.setState('idle')()
        dragon3D.setMood('calm')()
        break
    }
  }, [gameState.phase])
  
  return {
    ...dragon3D,
    // Custom game-specific methods
    reactToHit: () => dragon3D.triggerSpecialAnimation('shake')(),
    celebrateVictory: () => dragon3D.triggerSpecialAnimation('roar')(),
    powerUp: () => {
      dragon3D.setPowerLevel(100)()
      dragon3D.triggerSpecialAnimation('powerUp')()
    }
  }
}
```

## Architecture Overview

### Component Hierarchy
```
DragonRenderer (Unified Interface)
├── SimpleDragonSprite (2D Mode)
├── ASCIIDragon (ASCII Mode)
└── Dragon3D (3D Mode)
    ├── Three.js Scene
    ├── Particle System
    ├── Animation Controller
    └── Performance Monitor
```

### State Management Flow
```
Voice Input → VoiceAnimationState → Dragon Components → Visual Feedback
     ↓                                        ↓
Performance Monitor → Auto-optimization → Quality Adjustment
     ↓                                        ↓
Error Boundary → Fallback System → Alternative Rendering
```

### Data Flow Patterns
```typescript
// Functional programming with fp-ts
Voice Event → TaskEither<Error, DragonState> → State Update → UI Render

// Reactive streams with RxJS  
User Interaction → Subject → Observable Pipeline → State Changes → Animation Triggers

// Performance monitoring
Component Render → Metrics Collection → Performance Analysis → Optimization Decisions
```

## Troubleshooting

### Common Issues

#### 1. 3D Dragon Not Rendering
**Symptoms**: White screen or fallback to 2D despite 3D capability
**Causes**: 
- WebGL context lost
- Insufficient GPU memory
- Three.js initialization failure

**Solutions**:
```typescript
// Enable debug mode to see detailed errors
<DragonRenderer 
  dragonType="3d"
  enableFallback={true}
  onError={(error, type) => {
    console.error('Dragon Error:', error)
    // Check WebGL support
    if (error.message.includes('WebGL')) {
      console.log('WebGL Support:', detect3DSupport())
    }
  }}
/>

// Manual WebGL context check
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
if (!gl) {
  console.error('WebGL not supported')
}
```

#### 2. ASCII Dragon Performance Issues
**Symptoms**: Laggy typewriter effects, dropped frames
**Causes**:
- Too many character updates
- Inefficient re-renders
- Complex Unicode characters

**Solutions**:
```typescript
// Reduce animation complexity
<ASCIIDragon
  speed="slow"           // Slower typewriter
  enableFloating={false} // Disable floating on mobile
  enableBreathing={false} // Disable breathing for performance
/>

// Use performance mode
const useOptimizedASCII = () => {
  const [performanceMode, setPerformanceMode] = useState('auto')
  
  useEffect(() => {
    const isLowEnd = navigator.hardwareConcurrency < 4
    if (isLowEnd) setPerformanceMode('low')
  }, [])
  
  return performanceMode
}
```

#### 3. Voice Integration Not Working
**Symptoms**: Dragon doesn't respond to voice events
**Causes**:
- Voice hooks not connected
- Incorrect voice state structure
- Missing voice permissions

**Solutions**:
```typescript
// Check voice state structure
const voiceState = {
  isListening: boolean,    // Required
  isSpeaking: boolean,     // Required  
  isProcessing: boolean,   // Required
  isIdle: boolean,         // Required
  volume: number,          // Optional but recommended
  emotion: string          // Optional
}

// Debug voice integration
useEffect(() => {
  console.log('Voice State Update:', voiceState)
}, [voiceState])

// Check microphone permissions
const checkPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    console.log('Microphone permission granted')
  } catch (error) {
    console.error('Microphone permission denied:', error)
  }
}
```

#### 4. Memory Leaks in Long Sessions
**Symptoms**: Gradually increasing memory usage, eventual crashes
**Causes**:
- Uncleared intervals/timeouts
- Event listeners not removed
- RxJS subscriptions not unsubscribed

**Solutions**:
```typescript
// Proper cleanup in hooks
useEffect(() => {
  const subscription = dragonState$.subscribe(handleStateChange)
  const interval = setInterval(updateAnimation, 16)
  
  return () => {
    subscription.unsubscribe()
    clearInterval(interval)
  }
}, [])

// Use cleanup subject pattern
const cleanupSubject = useRef(new Subject<void>())

useEffect(() => {
  return () => {
    cleanupSubject.current.next()
    cleanupSubject.current.complete()
  }
}, [])
```

### Performance Debugging

#### Monitor Dragon Performance
```typescript
const DragonPerformanceDebugger = () => {
  const [metrics, setMetrics] = useState<DragonPerformanceMetrics[]>([])
  
  const handleMetrics = (newMetrics: DragonPerformanceMetrics) => {
    setMetrics(prev => [...prev.slice(-50), newMetrics]) // Keep last 50 measurements
  }
  
  return (
    <div>
      <DragonRenderer onPerformanceMetrics={handleMetrics} />
      <div className="performance-graph">
        {metrics.map((metric, i) => (
          <div key={i} style={{ 
            height: `${metric.renderTime}px`,
            backgroundColor: metric.renderTime > 16 ? 'red' : 'green'
          }} />
        ))}
      </div>
    </div>
  )
}
```

#### Memory Usage Monitoring
```typescript
const useMemoryMonitor = () => {
  useEffect(() => {
    const monitor = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        console.log('Memory Usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576),
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576)
        })
      }
    }, 5000)
    
    return () => clearInterval(monitor)
  }, [])
}
```

### Best Practices Summary

1. **Always enable fallback** for production deployments
2. **Monitor performance** in real-time for 3D dragons
3. **Use voice state properly** with all required fields
4. **Implement proper cleanup** for all subscriptions and intervals
5. **Test on low-end devices** to ensure broad compatibility
6. **Use TypeScript strictly** to catch type-related issues early
7. **Profile memory usage** during development and testing
8. **Implement error boundaries** around dragon components
9. **Use lazy loading** for 3D components to improve initial load times
10. **Configure CSP headers** properly for WebGL and audio contexts