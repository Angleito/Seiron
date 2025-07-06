# 🐉 Dragon System TypeScript Interfaces

This document provides comprehensive documentation for all TypeScript interfaces, types, and enums used in the Seiron dragon animation system. The dragon system is built with strict TypeScript support for maximum type safety and developer experience.

## 📚 Core Interfaces

### VoiceAnimationState

The unified interface for voice integration across all dragon types.

```typescript
interface VoiceAnimationState {
  /** Microphone is actively listening for speech */
  isListening: boolean
  
  /** Text-to-speech is currently playing audio */
  isSpeaking: boolean
  
  /** AI is processing user input or generating response */
  isProcessing: boolean
  
  /** No voice activity is occurring */
  isIdle: boolean
  
  /** Audio volume level from 0.0 (silent) to 1.0 (maximum) */
  volume?: number
  
  /** Current emotional state affecting dragon animations */
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}
```

**Usage Examples:**
```typescript
// Basic voice state
const listeningState: VoiceAnimationState = {
  isListening: true,
  isSpeaking: false,
  isProcessing: false,
  isIdle: false,
  volume: 0.6,
  emotion: 'neutral'
}

// Speaking with emotion
const speakingState: VoiceAnimationState = {
  isListening: false,
  isSpeaking: true,
  isProcessing: false,
  isIdle: false,
  volume: 0.8,
  emotion: 'excited'
}

// Processing state
const processingState: VoiceAnimationState = {
  isListening: false,
  isSpeaking: false,
  isProcessing: true,
  isIdle: false,
  emotion: 'neutral'
}
```

### DragonType

Union type defining available dragon rendering modes.

```typescript
type DragonType = '2d' | '3d' | 'ascii'
```

### DragonSize

Standardized size options across all dragon components.

```typescript
type DragonSize = 'sm' | 'md' | 'lg' | 'xl'
```

**Size Mapping:**
- `sm`: Small (16-32px width), mobile-optimized
- `md`: Medium (24-48px width), default size
- `lg`: Large (32-64px width), desktop primary
- `xl`: Extra Large (48-96px width), feature displays

## 🎭 DragonRenderer Interfaces

### DragonRendererProps

Main props interface for the unified DragonRenderer component.

```typescript
interface DragonRendererProps {
  /** Dragon rendering type - determines which component to render */
  dragonType: DragonType
  
  /** Size of the dragon - affects dimensions and detail level */
  size?: DragonSize
  
  /** Voice state for real-time animation synchronization */
  voiceState?: VoiceAnimationState
  
  /** Enable automatic fallback on errors or performance issues */
  enableFallback?: boolean
  
  /** Fallback dragon type when primary type fails */
  fallbackType?: DragonType
  
  /** Performance optimization mode */
  performanceMode?: PerformanceMode
  
  /** Additional CSS classes for styling */
  className?: string
  
  /** Click event handler */
  onClick?: () => void
  
  /** Enable hover effects and interactions */
  enableHover?: boolean
  
  /** Type-specific props for ASCII dragon */
  asciiProps?: Partial<ASCIIDragonProps>
  
  /** Type-specific props for 3D dragon */
  threeDProps?: Partial<Dragon3DProps>
  
  /** Type-specific props for 2D sprite dragon */
  spriteProps?: Partial<SimpleDragonSpriteProps>
  
  /** Error handler for dragon component failures */
  onError?: (error: Error, dragonType: DragonType) => void
  
  /** Callback when fallback system activates */
  onFallback?: (fromType: DragonType, toType: DragonType) => void
  
  /** Performance metrics callback for monitoring */
  onPerformanceMetrics?: (metrics: DragonPerformanceMetrics) => void
}
```

### PerformanceMode

Performance optimization strategies for dragon rendering.

```typescript
type PerformanceMode = 'auto' | 'high' | 'low'
```

**Mode Details:**
- `auto`: Automatically adjust based on device performance
- `high`: Maximum quality and effects (high-end devices)
- `low`: Minimal effects for better performance (low-end devices)

### DragonPerformanceMetrics

Performance monitoring data structure.

```typescript
interface DragonPerformanceMetrics {
  /** Component render time in milliseconds */
  renderTime: number
  
  /** Dragon initialization time in milliseconds */
  initTime: number
  
  /** Currently active dragon type */
  dragonType: DragonType
  
  /** Whether fallback system was triggered */
  fallbackUsed: boolean
  
  /** Count of errors encountered during rendering */
  errorCount: number
  
  /** Average frames per second */
  fps?: number
  
  /** Memory usage in megabytes */
  memoryUsage?: number
  
  /** Performance score from 0-100 */
  performanceScore?: number
}
```

## 🔤 ASCII Dragon Interfaces

### ASCIIDragonProps

Props interface for the ASCII dragon component.

```typescript
interface ASCIIDragonProps {
  /** Dragon pose affecting the ASCII art pattern */
  pose?: ASCIIDragonPose
  
  /** Size affecting character count and detail */
  size?: ASCIIDragonSize
  
  /** Animation speed for typewriter and breathing effects */
  speed?: ASCIIDragonSpeed
  
  /** Voice state for reactive animations */
  voiceState?: VoiceAnimationState
  
  /** Enable typewriter reveal effect */
  enableTypewriter?: boolean
  
  /** Enable breathing animation */
  enableBreathing?: boolean
  
  /** Enable floating movement */
  enableFloating?: boolean
  
  /** Enable voice-reactive character variations */
  enableVoiceReactivity?: boolean
  
  /** Additional CSS classes */
  className?: string
  
  /** Performance optimization mode */
  performanceMode?: PerformanceMode
  
  /** Animation configuration overrides */
  animationConfig?: Partial<ASCIIAnimationConfig>
  
  /** Custom dragon art patterns */
  customPatterns?: Partial<ASCIIDragonPatterns>
  
  /** Error boundary callback */
  onError?: (error: Error) => void
}
```

### ASCIIDragonPose

Available poses for ASCII dragon art.

```typescript
type ASCIIDragonPose = 'coiled' | 'flying' | 'attacking' | 'sleeping'
```

**Pose Descriptions:**
- `coiled`: Default relaxed state with gentle curves
- `flying`: Alert pose with spread wings, used for listening
- `attacking`: Aggressive pose with energy effects, used for speaking
- `sleeping`: Peaceful pose with closed eyes, used for idle

### ASCIIDragonSize

Size variants for ASCII dragon with different character counts.

```typescript
type ASCIIDragonSize = 'sm' | 'md' | 'lg' | 'xl'
```

### ASCIIDragonSpeed

Animation speed options for ASCII effects.

```typescript
type ASCIIDragonSpeed = 'slow' | 'normal' | 'fast'
```

### ASCIIAnimationConfig

Configuration for ASCII dragon animations.

```typescript
interface ASCIIAnimationConfig {
  /** Typewriter effect configuration */
  typewriter: {
    enabled: boolean
    speed: number // Characters per second
    cursor: boolean // Show blinking cursor
  }
  
  /** Breathing animation configuration */
  breathing: {
    enabled: boolean
    speed: number // Duration in milliseconds
    intensity: number // 0.0 to 1.0
    characterMapping: boolean // Use intensity-based character variations
  }
  
  /** Floating movement configuration */
  floating: {
    enabled: boolean
    speed: number // Duration in milliseconds
    amplitude: number // Movement distance in pixels
    rotationEnabled: boolean // Enable slight rotation
  }
  
  /** Transition animations between poses */
  transitions: {
    enabled: boolean
    duration: number // Transition time in milliseconds
    easing: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear'
  }
  
  /** Performance optimization settings */
  performance: {
    enabled: boolean
    throttleMs: number // Throttle animation updates
    maxFPS: number // Maximum frames per second
  }
}
```

### ASCIIDragonState

Internal state management for ASCII dragon.

```typescript
interface ASCIIDragonState {
  /** Current pose */
  pose: ASCIIDragonPose
  
  /** Current size */
  size: ASCIIDragonSize
  
  /** Animation speed */
  speed: ASCIIDragonSpeed
  
  /** Current animation state */
  state: 'idle' | 'typing' | 'breathing' | 'floating' | 'reacting' | 'transitioning'
  
  /** Animation configuration */
  animationConfig: ASCIIAnimationConfig
  
  /** Typewriter state */
  typewriter: {
    displayedLines: string[]
    currentLineIndex: number
    currentCharIndex: number
    isComplete: boolean
    isActive: boolean
  }
  
  /** Breathing animation state */
  breathing: {
    intensity: number
    phase: number // 0 to 2π for sine wave
    lastUpdate: number
  }
  
  /** Floating animation state */
  floating: {
    offsetY: number
    offsetX: number
    rotation: number
    lastUpdate: number
  }
  
  /** Transition state */
  transitions: {
    isTransitioning: boolean
    fromPose: Option<ASCIIDragonPose>
    toPose: Option<ASCIIDragonPose>
    progress: number // 0 to 1
    startTime: number
  }
  
  /** Voice integration state */
  voiceIntegration: {
    reactToVoice: boolean
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    transcriptLength: number
    currentMessage: string
  }
  
  /** Performance monitoring */
  performance: {
    fps: number
    shouldOptimize: boolean
    animationFrameId: number | null
    lastFrameTime: number
  }
  
  /** Keyboard interaction state */
  keyboard: {
    enableShortcuts: boolean
    shortcuts: Record<string, ASCIIDragonPose>
  }
}
```

### ASCIIDragonPatterns

ASCII art patterns for different poses and sizes.

```typescript
interface ASCIIDragonPatterns {
  coiled: Record<ASCIIDragonSize, string[]>
  flying: Record<ASCIIDragonSize, string[]>
  attacking: Record<ASCIIDragonSize, string[]>
  sleeping: Record<ASCIIDragonSize, string[]>
}
```

## 🎮 3D Dragon Interfaces

### Dragon3DProps

Props interface for the 3D WebGL dragon component.

```typescript
interface Dragon3DProps {
  /** Dragon size affecting mesh complexity */
  size?: DragonSize
  
  /** Rendering quality level */
  quality?: '3d-low' | '3d-medium' | '3d-high'
  
  /** Enable particle effects */
  showParticles?: boolean
  
  /** Enable user interaction (orbit controls) */
  enableInteraction?: boolean
  
  /** Animation speed multiplier */
  animationSpeed?: number
  
  /** Enable auto-rotation */
  autoRotate?: boolean
  
  /** Voice state for reactive animations */
  voiceState?: VoiceAnimationState
  
  /** Dragon aura color */
  auraColor?: string
  
  /** Additional CSS classes */
  className?: string
  
  /** Performance optimization mode */
  performanceMode?: PerformanceMode
  
  /** 3D configuration overrides */
  config?: Partial<Dragon3DConfig>
  
  /** Error boundary callback */
  onError?: (error: Error) => void
  
  /** Animation event callbacks */
  onAnimationComplete?: (animationType: SpecialAnimation) => void
}
```

### Dragon3DConfig

Configuration options for 3D dragon rendering.

```typescript
interface Dragon3DConfig {
  /** Camera settings */
  camera: {
    position: [number, number, number]
    fov: number
    near: number
    far: number
  }
  
  /** Lighting configuration */
  lighting: {
    ambient: {
      color: string
      intensity: number
    }
    directional: {
      color: string
      intensity: number
      position: [number, number, number]
    }
    point: {
      color: string
      intensity: number
      distance: number
    }
  }
  
  /** Materials configuration */
  materials: {
    dragonBody: {
      color: string
      shininess: number
      transparent: boolean
      opacity: number
    }
    dragonWings: {
      color: string
      transparent: boolean
      opacity: number
    }
    aura: {
      color: string
      intensity: number
      size: number
    }
  }
  
  /** Particle system settings */
  particles: {
    fire: {
      count: number
      size: number
      speed: number
      color: string
    }
    energy: {
      count: number
      size: number
      speed: number
      color: string
    }
    ambient: {
      count: number
      size: number
      speed: number
      color: string
    }
  }
  
  /** Animation settings */
  animations: {
    breathing: {
      speed: number
      intensity: number
    }
    floating: {
      speed: number
      amplitude: number
    }
    wingFlapping: {
      speed: number
      intensity: number
    }
  }
  
  /** Performance settings */
  performance: {
    targetFPS: number
    autoOptimize: boolean
    qualityThresholds: {
      high: number
      medium: number
      low: number
    }
  }
}
```

### DragonState

State enum for 3D dragon behavior.

```typescript
type DragonState = 
  | 'idle'        // Relaxed breathing and gentle movement
  | 'attention'   // Alert pose, looking around
  | 'ready'       // Prepared for interaction
  | 'active'      // Engaged in activity
  | 'speaking'    // Animated breathing and energy effects
  | 'listening'   // Focused pose with enhanced alertness
  | 'processing'  // Contemplative state with subtle animations
```

### DragonMood

Mood enum affecting dragon animations and colors.

```typescript
type DragonMood = 
  | 'calm'        // Gentle animations, blue/green aura
  | 'excited'     // Fast animations, bright yellow/orange aura
  | 'focused'     // Steady animations, blue aura
  | 'playful'     // Bouncy animations, rainbow aura
  | 'powerful'    // Strong animations, red/orange aura
  | 'mystical'    // Ethereal animations, purple aura
  | 'alert'       // Sharp animations, green aura
```

### SpecialAnimation

Special animation types for 3D dragon.

```typescript
type SpecialAnimation = 
  | 'roar'        // Dramatic roaring animation with fire effects
  | 'powerUp'     // Energy building animation with particle buildup
  | 'spin'        // Spinning movement with trail effects
  | 'pulse'       // Pulsing glow animation
  | 'shake'       // Shaking movement for emphasis
  | 'breatheFire' // Fire breathing animation
  | 'orbit'       // Circular orbiting movement
  | 'charge'      // Energy charging animation
```

### Dragon3DState

Complete state management for 3D dragon.

```typescript
interface Dragon3DState {
  /** Current behavioral state */
  state: DragonState
  
  /** Current emotional mood */
  mood: DragonMood
  
  /** Power level from 0-100 affecting animation intensity */
  powerLevel: number
  
  /** Whether dragon is currently charging power */
  isCharging: boolean
  
  /** Whether any animation is currently playing */
  isAnimating: boolean
  
  /** Currently playing special animation */
  specialAnimation: Option<SpecialAnimation>
  
  /** Animation configuration */
  animationConfig: {
    breathing: {
      enabled: boolean
      speed: number
      intensity: number
    }
    floating: {
      enabled: boolean
      speed: number
      amplitude: number
    }
    wingFlapping: {
      enabled: boolean
      speed: number
      intensity: number
    }
    particles: {
      enabled: boolean
      count: number
      intensity: number
    }
    aura: {
      enabled: boolean
      intensity: number
      color: string
    }
  }
  
  /** Voice integration state */
  voiceIntegration: {
    reactToVoice: boolean
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    transcriptLength: number
  }
  
  /** Performance monitoring */
  performance: {
    enabled: boolean
    quality: '3d-low' | '3d-medium' | '3d-high'
    fps: number
    shouldOptimize: boolean
  }
}
```

## 🖼️ 2D Sprite Dragon Interfaces

### SimpleDragonSpriteProps

Props interface for the 2D sprite dragon component.

```typescript
interface SimpleDragonSpriteProps {
  /** Dragon size */
  size?: DragonSize
  
  /** Voice state for CSS-based animations */
  voiceState?: VoiceAnimationState
  
  /** Enable hover effects */
  enableHover?: boolean
  
  /** Enable click interactions */
  enableClick?: boolean
  
  /** Additional CSS classes */
  className?: string
  
  /** Click event handler */
  onClick?: () => void
  
  /** Sprite configuration */
  spriteConfig?: Partial<SpriteConfig>
  
  /** Error boundary callback */
  onError?: (error: Error) => void
}
```

### SpriteConfig

Configuration for 2D sprite animations.

```typescript
interface SpriteConfig {
  /** Sprite image source */
  src: string
  
  /** Sprite sheet configuration */
  spriteSheet: {
    frameWidth: number
    frameHeight: number
    frameCount: number
    framesPerRow: number
  }
  
  /** Animation settings */
  animations: {
    idle: {
      frames: number[]
      duration: number
      loop: boolean
    }
    hover: {
      frames: number[]
      duration: number
      loop: boolean
    }
    speaking: {
      frames: number[]
      duration: number
      loop: boolean
    }
    listening: {
      frames: number[]
      duration: number
      loop: boolean
    }
  }
  
  /** CSS animation settings */
  css: {
    enableTransitions: boolean
    transitionDuration: string
    enableTransforms: boolean
    enableFilters: boolean
  }
}
```

## 🎯 Hook Interfaces

### UseDragon3DOptions

Options for the useDragon3D hook.

```typescript
interface UseDragon3DOptions {
  /** Enable voice integration features */
  enableVoiceIntegration?: boolean
  
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean
  
  /** Enable automatic state transitions based on voice */
  enableAutoStateTransitions?: boolean
  
  /** Enable automatic performance optimization */
  autoOptimize?: boolean
  
  /** Initial dragon state */
  initialState?: Partial<Dragon3DState>
  
  /** Performance thresholds for optimization */
  performanceThresholds?: {
    targetFPS: number
    minFPS: number
    memoryLimit: number
  }
}
```

### UseASCIIDragonOptions

Options for the useASCIIDragon hook.

```typescript
interface UseASCIIDragonOptions {
  /** Enable voice reactivity features */
  enableVoiceReactivity?: boolean
  
  /** Enable breathing animation */
  enableBreathing?: boolean
  
  /** Enable floating animation */
  enableFloating?: boolean
  
  /** Performance optimization mode */
  performanceMode?: PerformanceMode
  
  /** Initial dragon state */
  initialState?: Partial<ASCIIDragonState>
  
  /** Custom animation configuration */
  animationConfig?: Partial<ASCIIAnimationConfig>
}
```

## 🔧 Utility Types

### Dragon Hook Return Types

Return types for dragon hooks with fp-ts patterns.

```typescript
// useDragon3D return type
interface UseDragon3DReturn {
  // State
  state: DragonState
  mood: DragonMood
  powerLevel: number
  isCharging: boolean
  isAnimating: boolean
  specialAnimation: Option<SpecialAnimation>
  
  // Actions (all return TaskEither for error handling)
  setState: (state: DragonState) => TE.TaskEither<Error, void>
  setMood: (mood: DragonMood) => TE.TaskEither<Error, void>
  setPowerLevel: (level: number) => TE.TaskEither<Error, void>
  triggerSpecialAnimation: (animation: SpecialAnimation) => TE.TaskEither<Error, void>
  
  // Voice integration
  onVoiceListeningStart: () => TE.TaskEither<Error, void>
  onVoiceSpeakingStart: () => TE.TaskEither<Error, void>
  onVoiceProcessingStart: () => TE.TaskEither<Error, void>
  onTranscriptUpdate: (transcript: string) => TE.TaskEither<Error, void>
  
  // Performance
  performanceScore: number
  isHighPerformance: () => boolean
  shouldReduceQuality: () => boolean
  shouldDisableAnimations: () => boolean
  isVoiceActive: () => boolean
}

// useASCIIDragon return type
interface UseASCIIDragonReturn {
  // State
  currentPose: ASCIIDragonPose
  animationSpeed: ASCIIDragonSpeed
  isTypewriterActive: boolean
  breathingIntensity: number
  
  // Actions
  setPose: (pose: ASCIIDragonPose) => TE.TaskEither<Error, void>
  setSpeed: (speed: ASCIIDragonSpeed) => TE.TaskEither<Error, void>
  startTypewriter: () => TE.TaskEither<Error, void>
  stopTypewriter: () => TE.TaskEither<Error, void>
  
  // Voice integration
  onVoiceListeningStart: () => void
  onVoiceSpeakingStart: () => void
  onVoiceProcessingStart: () => void
  updateVoiceState: (state: VoiceAnimationState) => void
  
  // Animation control
  enableBreathing: boolean
  enableFloating: boolean
  shouldShowEffects: boolean
}
```

### Voice Mapping Utility Types

Types for voice state mapping utilities.

```typescript
// Voice state to ASCII pose mapping
type VoiceStateToASCIIPose = (voiceState: VoiceAnimationState) => ASCIIDragonPose

// Voice state to animation speed mapping
type VoiceStateToAnimationSpeed = (voiceState: VoiceAnimationState) => ASCIIDragonSpeed

// Voice state to 2D properties mapping
type VoiceStateTo2DProps = (voiceState: VoiceAnimationState) => {
  scale: number
  shouldPulse: boolean
  shouldGlow: boolean
  glowIntensity: number
  rotationSpeed: 'slow' | 'normal' | 'fast'
}

// Voice state to 3D properties mapping
type VoiceStateTo3DProps = (voiceState: VoiceAnimationState) => {
  animationSpeed: number
  showParticles: boolean
  autoRotate: boolean
  auraColor: string
}
```

## 🎪 Testing Interfaces

### Dragon Test Utilities

Interfaces for testing dragon components.

```typescript
interface DragonTestDataFactory {
  createDefaultDragon3DState: (overrides?: Partial<Dragon3DState>) => Dragon3DState
  createDefaultASCIIDragonState: (overrides?: Partial<ASCIIDragonState>) => ASCIIDragonState
  createVoiceState: (overrides?: Partial<VoiceAnimationState>) => VoiceAnimationState
  createDragonRendererProps: (overrides?: Partial<DragonRendererProps>) => DragonRendererProps
}

interface DragonPerformanceTester {
  start: () => void
  record: () => void
  finish: () => number
  getAverageTime: () => number
  getMaxTime: () => number
  getMinTime: () => number
  reset: () => void
}

interface DragonAnimationTester {
  advanceAnimations: (ms: number) => void
  waitForAnimationFrame: () => Promise<void>
  waitForAnimationFrames: (count: number) => Promise<void>
  expectAnimationCompleted: (isComplete: boolean, timeElapsed: number, expectedDuration: number) => void
  expectValueInRange: (value: number, min: number, max: number, context?: string) => void
}
```

## 🔍 Error Handling Types

### Dragon Error Types

Specific error types for dragon system debugging.

```typescript
// Base dragon error
interface DragonError extends Error {
  dragonType: DragonType
  timestamp: number
  context?: Record<string, any>
}

// 3D rendering errors
interface Dragon3DError extends DragonError {
  dragonType: '3d'
  webglError?: WebGLRenderingContext | null
  shaderError?: string
  geometryError?: string
}

// ASCII rendering errors
interface ASCIIDragonError extends DragonError {
  dragonType: 'ascii'
  poseError?: ASCIIDragonPose
  animationError?: string
  typewriterError?: string
}

// Voice integration errors
interface VoiceIntegrationError extends DragonError {
  voiceState?: VoiceAnimationState
  integrationStep?: 'state-mapping' | 'animation-trigger' | 'performance-check'
}

// Performance errors
interface PerformanceError extends DragonError {
  performanceMetrics: DragonPerformanceMetrics
  threshold: number
  measurementType: 'fps' | 'memory' | 'render-time'
}
```

## 📝 Usage Examples

### Complete TypeScript Example

Here's a comprehensive example showing proper TypeScript usage:

```typescript
import React, { useState, useEffect } from 'react'
import { DragonRenderer, VoiceAnimationState, DragonType, DragonSize } from '@/components/dragon'
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

interface VoiceDragonProps {
  initialType?: DragonType
  size?: DragonSize
  enableVoice?: boolean
}

const VoiceDragon: React.FC<VoiceDragonProps> = ({ 
  initialType = 'ascii',
  size = 'lg',
  enableVoice = true
}) => {
  const [dragonType, setDragonType] = useState<DragonType>(initialType)
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5,
    emotion: 'neutral'
  })

  // Dragon hooks with proper typing
  const dragon3D = useDragon3D({
    enableVoiceIntegration: enableVoice,
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })

  const asciiDragon = useASCIIDragon({
    enableVoiceReactivity: enableVoice,
    enableBreathing: true,
    performanceMode: 'auto'
  })

  // Type-safe voice state handler
  const handleVoiceStateChange = (newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({
      ...prev,
      ...newState,
      isIdle: !newState.isListening && !newState.isSpeaking && !newState.isProcessing
    }))
  }

  // Type-safe dragon type switching
  const handleDragonTypeChange = (newType: DragonType) => {
    setDragonType(newType)
  }

  // Error handling with proper typing
  const handleDragonError = (error: Error, type: DragonType) => {
    console.error(`Dragon ${type} error:`, error)
    
    // Fallback logic with type safety
    const fallbackType: DragonType = type === '3d' ? 'ascii' : '2d'
    handleDragonTypeChange(fallbackType)
  }

  // Performance metrics handler
  const handlePerformanceMetrics = (metrics: DragonPerformanceMetrics) => {
    if (metrics.performanceScore && metrics.performanceScore < 50) {
      // Auto-fallback for poor performance
      if (dragonType === '3d') {
        handleDragonTypeChange('ascii')
      }
    }
  }

  // Voice integration effect
  useEffect(() => {
    if (!enableVoice) return

    if (dragonType === '3d') {
      // Handle 3D dragon voice integration with error handling
      const handleVoiceUpdate = () => {
        if (voiceState.isListening) {
          dragon3D.onVoiceListeningStart()()
        } else if (voiceState.isSpeaking) {
          dragon3D.onVoiceSpeakingStart()()
        } else if (voiceState.isProcessing) {
          dragon3D.onVoiceProcessingStart()()
        }
      }

      handleVoiceUpdate()
    } else if (dragonType === 'ascii') {
      // Handle ASCII dragon voice integration
      asciiDragon.updateVoiceState(voiceState)
    }
  }, [voiceState, dragonType, enableVoice])

  return (
    <div className="voice-dragon-container">
      <DragonRenderer
        dragonType={dragonType}
        size={size}
        voiceState={enableVoice ? voiceState : undefined}
        enableFallback={true}
        fallbackType="2d"
        performanceMode="auto"
        asciiProps={{
          enableTypewriter: true,
          enableBreathing: true,
          enableVoiceReactivity: enableVoice,
          pose: 'coiled'
        }}
        threeDProps={{
          quality: 'medium',
          showParticles: true,
          enableInteraction: true,
          animationSpeed: 1.0
        }}
        onError={handleDragonError}
        onPerformanceMetrics={handlePerformanceMetrics}
        onFallback={(from, to) => {
          console.log(`Dragon fallback: ${from} → ${to}`)
        }}
      />
      
      <div className="controls">
        <button onClick={() => handleVoiceStateChange({ isListening: true })}>
          Start Listening
        </button>
        <button onClick={() => handleVoiceStateChange({ isSpeaking: true })}>
          Start Speaking
        </button>
        <button onClick={() => handleVoiceStateChange({ isProcessing: true })}>
          Start Processing
        </button>
      </div>
    </div>
  )
}

export default VoiceDragon
```

## 🎛️ Advanced Type Patterns

### Functional Programming Types

The dragon system uses fp-ts patterns extensively:

```typescript
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

// Task-based operations for async actions
type DragonAction<T> = TE.TaskEither<Error, T>

// Optional values for configuration
type DragonConfig<T> = {
  [K in keyof T]: O.Option<T[K]>
}

// Result types for operations
type DragonResult<T> = E.Either<Error, T>

// State validation
type ValidatedDragonState<T> = E.Either<string[], T>
```

### Type Guards

Type guards for runtime type checking:

```typescript
// Voice state validation
function isValidVoiceState(obj: any): obj is VoiceAnimationState {
  return (
    typeof obj === 'object' &&
    typeof obj.isListening === 'boolean' &&
    typeof obj.isSpeaking === 'boolean' &&
    typeof obj.isProcessing === 'boolean' &&
    typeof obj.isIdle === 'boolean' &&
    (obj.volume === undefined || (typeof obj.volume === 'number' && obj.volume >= 0 && obj.volume <= 1)) &&
    (obj.emotion === undefined || ['neutral', 'happy', 'angry', 'sleeping', 'excited'].includes(obj.emotion))
  )
}

// Dragon type validation
function isDragonType(value: string): value is DragonType {
  return ['2d', '3d', 'ascii'].includes(value)
}

// Size validation
function isDragonSize(value: string): value is DragonSize {
  return ['sm', 'md', 'lg', 'xl'].includes(value)
}
```

---

## 📚 Summary

This TypeScript interface documentation provides:

- **Complete Interface Coverage** - All dragon system interfaces documented
- **Usage Examples** - Real-world TypeScript usage patterns
- **Type Safety** - Strict typing for all dragon operations
- **Error Handling** - Proper error types and handling patterns
- **Functional Programming** - fp-ts integration patterns
- **Testing Support** - Interfaces for comprehensive testing

The dragon system's TypeScript implementation ensures type safety, better developer experience, and reduces runtime errors through compile-time checking.

For implementation examples, see [DragonRenderer Examples](./DragonRenderer-Examples.md) and [Dragon Hooks API](../../hooks/voice/Dragon-Hooks-API.md).

**Remember: Strong typing leads to powerful dragons!** 🐉🔥