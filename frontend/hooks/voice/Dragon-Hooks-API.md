# Dragon Hooks API Documentation

## Overview

This document provides comprehensive API documentation for the dragon animation hooks in Seiron. These hooks follow functional programming patterns using fp-ts and RxJS for robust state management and reactive programming.

## Table of Contents

1. [useDragon3D Hook](#usedragon3d-hook)
2. [useASCIIDragon Hook](#useasciidragon-hook)
3. [Common Types](#common-types)
4. [Utility Functions](#utility-functions)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

## useDragon3D Hook

### Import

```typescript
import { useDragon3D, UseDragon3DOptions, Dragon3DState } from '@/hooks/voice/useDragon3D'
```

### Hook Signature

```typescript
const useDragon3D = (options?: UseDragon3DOptions) => UseDragon3DReturn
```

### Options Interface

```typescript
interface UseDragon3DOptions {
  enableVoiceIntegration?: boolean      // Default: true
  enablePerformanceMonitoring?: boolean // Default: true
  enableAutoStateTransitions?: boolean  // Default: true
  enableProximityDetection?: boolean    // Default: false
  proximityThreshold?: number           // Default: 300 (pixels)
  autoOptimize?: boolean                // Default: true
  initialState?: DragonState            // Default: 'idle'
  initialMood?: DragonMood              // Default: 'calm'
  initialPowerLevel?: number            // Default: 30 (0-100)
  animationConfig?: Partial<DragonAnimationConfig> // Default: initialAnimationConfig
}
```

### Return Value

```typescript
interface UseDragon3DReturn {
  // State Properties
  state: DragonState                    // Current dragon state
  mood: DragonMood                      // Current dragon mood
  powerLevel: number                    // Power level (0-100)
  isCharging: boolean                   // Charging state
  isAnimating: boolean                  // Animation active
  animationConfig: DragonAnimationConfig // Current animation configuration
  voiceIntegration: VoiceIntegrationState // Voice integration state
  performance: PerformanceState         // Performance metrics

  // State Actions (TaskEither<Dragon3DError, void>)
  setState: (state: DragonState) => TaskEither<Dragon3DError, void>
  setMood: (mood: DragonMood) => TaskEither<Dragon3DError, void>
  setPowerLevel: (level: number) => TaskEither<Dragon3DError, void>
  triggerSpecialAnimation: (animation: SpecialAnimation) => TaskEither<Dragon3DError, void>
  
  // Simple Actions (void)
  setCharging: (charging: boolean) => void
  clearSpecialAnimation: () => void
  updateAnimationConfig: (config: Partial<DragonAnimationConfig>) => void

  // Voice Integration
  onVoiceListeningStart: () => void
  onVoiceListeningEnd: () => void
  onVoiceSpeakingStart: () => void
  onVoiceSpeakingEnd: () => void
  onVoiceProcessingStart: () => void
  onVoiceProcessingEnd: () => void
  onTranscriptUpdate: (transcript: string) => void

  // Functional Getters
  getSpecialAnimation: () => Option<SpecialAnimation>
  hasSpecialAnimation: () => boolean
  getAnimationName: () => SpecialAnimation | 'none'
  isVoiceActive: () => boolean
  isPowerful: () => boolean          // powerLevel > 70
  isCalm: () => boolean             // mood === 'calm' && state === 'idle'

  // Performance Utilities
  shouldReduceQuality: () => boolean
  shouldDisableAnimations: () => boolean
  performanceScore: number          // 0-100
  isHighPerformance: boolean

  // Reactive Streams (RxJS Observables)
  dragonState$: Observable<DragonState>
  powerLevel$: Observable<number>
  voiceEvents$: Observable<VoiceEvent>

  // Configuration
  enableVoiceIntegration: boolean
  enablePerformanceMonitoring: boolean
  enableAutoStateTransitions: boolean
  enableProximityDetection: boolean
}
```

### Types

```typescript
// Dragon States
type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'speaking' | 'listening' | 'processing'

// Dragon Moods
type DragonMood = 'calm' | 'excited' | 'focused' | 'playful' | 'powerful' | 'mystical' | 'alert'

// Special Animations
type SpecialAnimation = 'roar' | 'powerUp' | 'spin' | 'pulse' | 'shake' | 'breatheFire' | 'orbit' | 'charge'

// Animation Configuration
interface DragonAnimationConfig {
  breathing: {
    enabled: boolean
    speed: number      // Animation speed multiplier
    intensity: number  // Effect intensity (0-1)
  }
  floating: {
    enabled: boolean
    speed: number
    amplitude: number  // Movement amplitude (0-1)
  }
  wingFlapping: {
    enabled: boolean
    speed: number
    intensity: number
  }
  particles: {
    enabled: boolean
    count: number      // Particle count
    intensity: number  // Particle intensity (0-1)
  }
  aura: {
    enabled: boolean
    intensity: number  // Aura intensity (0-1)
    color: string      // CSS color value
  }
}

// Voice Integration State
interface VoiceIntegrationState {
  reactToVoice: boolean
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  transcriptLength: number
}

// Performance State
interface PerformanceState {
  enabled: boolean
  quality: 'low' | 'medium' | 'high'
  fps: number
  shouldOptimize: boolean
}

// Error Type
interface Dragon3DError {
  type: 'ANIMATION_ERROR' | 'STATE_ERROR' | 'PERFORMANCE_ERROR'
  message: string
  originalError?: unknown
}
```

### Examples

#### Basic Usage

```typescript
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

function Dragon3DComponent() {
  const dragon = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })

  // Basic state management
  const handleActivate = () => {
    pipe(
      dragon.setState('active'),
      TE.chain(() => dragon.setMood('powerful')),
      TE.chain(() => dragon.setPowerLevel(90)),
    )()
  }

  // Special animation with error handling
  const handleRoar = () => {
    pipe(
      dragon.triggerSpecialAnimation('roar'),
      TE.mapLeft(error => {
        console.error('Roar animation failed:', error)
        // Fallback behavior
        dragon.setMood('angry')()
      })
    )()
  }

  return (
    <div>
      <div>State: {dragon.state}</div>
      <div>Mood: {dragon.mood}</div>
      <div>Power: {dragon.powerLevel}%</div>
      <div>Is Powerful: {dragon.isPowerful() ? 'Yes' : 'No'}</div>
      
      <button onClick={handleActivate}>Activate Dragon</button>
      <button onClick={handleRoar}>Make Dragon Roar</button>
    </div>
  )
}
```

#### Voice Integration

```typescript
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useEffect } from 'react'

function VoiceIntegratedDragon({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  transcript 
}) {
  const dragon = useDragon3D({
    enableVoiceIntegration: true,
    enableAutoStateTransitions: true
  })

  // React to voice state changes
  useEffect(() => {
    if (isListening) dragon.onVoiceListeningStart()
    else dragon.onVoiceListeningEnd()
  }, [isListening])

  useEffect(() => {
    if (isSpeaking) dragon.onVoiceSpeakingStart()
    else dragon.onVoiceSpeakingEnd()
  }, [isSpeaking])

  useEffect(() => {
    if (isProcessing) dragon.onVoiceProcessingStart()
    else dragon.onVoiceProcessingEnd()
  }, [isProcessing])

  useEffect(() => {
    if (transcript) {
      dragon.onTranscriptUpdate(transcript)
    }
  }, [transcript])

  return (
    <div>
      <div>Voice Active: {dragon.isVoiceActive() ? 'Yes' : 'No'}</div>
      <div>Dragon State: {dragon.state}</div>
    </div>
  )
}
```

#### Performance Monitoring

```typescript
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useEffect } from 'react'

function PerformanceAwareDragon() {
  const dragon = useDragon3D({
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })

  // Monitor performance and adjust quality
  useEffect(() => {
    if (dragon.shouldReduceQuality()) {
      dragon.updateAnimationConfig({
        particles: { enabled: false },
        aura: { intensity: 0.3 }
      })
    }
  }, [dragon.performanceScore])

  return (
    <div>
      <div>Performance Score: {dragon.performanceScore}%</div>
      <div>High Performance: {dragon.isHighPerformance ? 'Yes' : 'No'}</div>
      <div>Should Reduce Quality: {dragon.shouldReduceQuality() ? 'Yes' : 'No'}</div>
    </div>
  )
}
```

#### Reactive Streams

```typescript
import { useDragon3D } from '@/hooks/voice/useDragon3D'
import { useEffect } from 'react'
import { map, filter, debounceTime } from 'rxjs/operators'

function ReactiveDragon() {
  const dragon = useDragon3D()

  useEffect(() => {
    // Subscribe to state changes
    const stateSubscription = dragon.dragonState$.subscribe(state => {
      console.log('Dragon state changed:', state)
    })

    // Subscribe to power level changes
    const powerSubscription = dragon.powerLevel$.pipe(
      filter(level => level > 80),
      debounceTime(1000)
    ).subscribe(level => {
      console.log('Dragon is powerful:', level)
      // Trigger special effects for high power
      dragon.triggerSpecialAnimation('pulse')()
    })

    // Subscribe to voice events
    const voiceSubscription = dragon.voiceEvents$.pipe(
      map(event => ({ ...event, timestamp: Date.now() }))
    ).subscribe(event => {
      console.log('Voice event:', event)
    })

    return () => {
      stateSubscription.unsubscribe()
      powerSubscription.unsubscribe()
      voiceSubscription.unsubscribe()
    }
  }, [])

  return <div>Reactive Dragon Component</div>
}
```

## useASCIIDragon Hook

### Import

```typescript
import { useASCIIDragon, UseASCIIDragonOptions } from '@/hooks/voice/useASCIIDragon'
```

### Hook Signature

```typescript
const useASCIIDragon = (options?: UseASCIIDragonOptions) => UseASCIIDragonReturn
```

### Options Interface

```typescript
interface UseASCIIDragonOptions {
  initialPose?: ASCIIPose                // Default: 'coiled'
  initialSpeed?: AnimationSpeed          // Default: 'normal'
  enableVoiceReactivity?: boolean        // Default: true
  enableBreathing?: boolean              // Default: true
  enableFloating?: boolean               // Default: true
  enableTypewriter?: boolean             // Default: true
  maxIntensity?: number                  // Default: 1.0 (0-1)
  performanceMode?: 'low' | 'medium' | 'high' // Default: 'medium'
}
```

### Return Value

```typescript
interface UseASCIIDragonReturn {
  // State Properties
  currentPose: ASCIIPose                 // Current ASCII pose
  animationSpeed: AnimationSpeed         // Current animation speed
  isTypewriting: boolean                 // Typewriter effect active
  breathingIntensity: number             // Breathing intensity (0-1)
  shouldShowEffects: boolean             // Voice effects enabled
  characterIntensity: number             // Character intensity (0-1)
  
  // Pose Actions
  setPose: (pose: ASCIIPose) => void
  setSpeed: (speed: AnimationSpeed) => void
  triggerTypewriter: () => void
  resetToInitialPose: () => void
  
  // Voice Integration
  updateVoiceState: (state: VoiceAnimationState) => void
  getVoiceBasedPose: () => ASCIIPose
  getVoiceBasedSpeed: () => AnimationSpeed
  getVoiceBasedIntensity: () => number
  
  // Effect Controls
  enableBreathingEffect: () => void
  disableBreathingEffect: () => void
  enableFloatingEffect: () => void
  disableFloatingEffect: () => void
  enableTypewriterEffect: () => void
  disableTypewriterEffect: () => void
  
  // Character Mapping
  mapCharacterIntensity: (char: string, intensity: number) => string
  getIntensityVariations: (char: string) => string[]
  
  // Performance
  optimizeForDevice: () => void
  getPerformanceRecommendation: () => 'low' | 'medium' | 'high'
  
  // Configuration
  enableVoiceReactivity: boolean
  enableBreathing: boolean
  enableFloating: boolean
  enableTypewriter: boolean
}
```

### Types

```typescript
// ASCII Poses
type ASCIIPose = 'coiled' | 'flying' | 'attacking' | 'sleeping'

// Animation Speeds
type AnimationSpeed = 'slow' | 'normal' | 'fast'

// Voice Animation State (shared)
interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume?: number
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}
```

### Examples

#### Basic ASCII Dragon Control

```typescript
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'

function ASCIIDragonComponent() {
  const ascii = useASCIIDragon({
    initialPose: 'coiled',
    enableVoiceReactivity: true,
    enableBreathing: true
  })

  const handlePoseChange = (pose: ASCIIPose) => {
    ascii.setPose(pose)
  }

  const handleSpeedChange = (speed: AnimationSpeed) => {
    ascii.setSpeed(speed)
  }

  return (
    <div>
      <div>Current Pose: {ascii.currentPose}</div>
      <div>Animation Speed: {ascii.animationSpeed}</div>
      <div>Breathing Intensity: {Math.round(ascii.breathingIntensity * 100)}%</div>
      
      <div>
        <h3>Pose Controls</h3>
        {(['coiled', 'flying', 'attacking', 'sleeping'] as const).map(pose => (
          <button 
            key={pose}
            onClick={() => handlePoseChange(pose)}
            disabled={ascii.currentPose === pose}
          >
            {pose}
          </button>
        ))}
      </div>
      
      <div>
        <h3>Speed Controls</h3>
        {(['slow', 'normal', 'fast'] as const).map(speed => (
          <button 
            key={speed}
            onClick={() => handleSpeedChange(speed)}
            disabled={ascii.animationSpeed === speed}
          >
            {speed}
          </button>
        ))}
      </div>
      
      <div>
        <h3>Effect Controls</h3>
        <button onClick={ascii.triggerTypewriter}>Trigger Typewriter</button>
        <button onClick={ascii.resetToInitialPose}>Reset to Initial</button>
      </div>
    </div>
  )
}
```

#### Voice-Reactive ASCII Dragon

```typescript
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'
import { useEffect } from 'react'

function VoiceReactiveASCIIDragon({ voiceState }: { 
  voiceState: VoiceAnimationState 
}) {
  const ascii = useASCIIDragon({
    enableVoiceReactivity: true,
    enableBreathing: true,
    enableFloating: true
  })

  // Update ASCII dragon based on voice state
  useEffect(() => {
    ascii.updateVoiceState(voiceState)
  }, [voiceState])

  // Get voice-optimized settings
  const recommendedPose = ascii.getVoiceBasedPose()
  const recommendedSpeed = ascii.getVoiceBasedSpeed()
  const recommendedIntensity = ascii.getVoiceBasedIntensity()

  return (
    <div>
      <div>Voice State Effects Active: {ascii.shouldShowEffects ? 'Yes' : 'No'}</div>
      <div>Recommended Pose: {recommendedPose}</div>
      <div>Recommended Speed: {recommendedSpeed}</div>
      <div>Voice Intensity: {Math.round(recommendedIntensity * 100)}%</div>
      
      <div>
        <h3>Voice State</h3>
        <div>Listening: {voiceState.isListening ? '🎤' : '❌'}</div>
        <div>Speaking: {voiceState.isSpeaking ? '🗣️' : '❌'}</div>
        <div>Processing: {voiceState.isProcessing ? '🧠' : '❌'}</div>
        <div>Volume: {Math.round((voiceState.volume || 0) * 100)}%</div>
        <div>Emotion: {voiceState.emotion || 'neutral'}</div>
      </div>
    </div>
  )
}
```

#### Performance-Optimized ASCII Dragon

```typescript
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'
import { useEffect } from 'react'

function PerformanceOptimizedASCIIDragon() {
  const ascii = useASCIIDragon({
    performanceMode: 'medium',
    enableVoiceReactivity: true
  })

  // Auto-optimize based on device performance
  useEffect(() => {
    const recommendation = ascii.getPerformanceRecommendation()
    
    if (recommendation === 'low') {
      ascii.disableFloatingEffect()
      ascii.disableTypewriterEffect()
    } else if (recommendation === 'high') {
      ascii.enableFloatingEffect()
      ascii.enableTypewriterEffect()
    }
  }, [])

  // Manual optimization trigger
  const handleOptimize = () => {
    ascii.optimizeForDevice()
  }

  return (
    <div>
      <div>Performance Recommendation: {ascii.getPerformanceRecommendation()}</div>
      <div>Effects Enabled: {ascii.shouldShowEffects ? 'Yes' : 'No'}</div>
      
      <button onClick={handleOptimize}>Optimize for Device</button>
      
      <div>
        <h3>Effect Status</h3>
        <div>Breathing: {ascii.enableBreathing ? 'On' : 'Off'}</div>
        <div>Floating: {ascii.enableFloating ? 'On' : 'Off'}</div>
        <div>Typewriter: {ascii.enableTypewriter ? 'On' : 'Off'}</div>
      </div>
    </div>
  )
}
```

#### Character Intensity Mapping

```typescript
import { useASCIIDragon } from '@/hooks/voice/useASCIIDragon'

function CharacterIntensityDemo() {
  const ascii = useASCIIDragon({
    enableVoiceReactivity: true,
    maxIntensity: 1.0
  })

  // Demonstrate character intensity mapping
  const demoCharacters = ['~', '|', '^', 'o', '.']
  const intensityLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <div>
      <h3>Character Intensity Mapping</h3>
      <div>Current Intensity: {Math.round(ascii.characterIntensity * 100)}%</div>
      
      <table>
        <thead>
          <tr>
            <th>Character</th>
            {intensityLevels.map(level => (
              <th key={level}>Intensity {Math.round(level * 100)}%</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {demoCharacters.map(char => (
            <tr key={char}>
              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{char}</td>
              {intensityLevels.map(level => (
                <td key={level} style={{ fontFamily: 'monospace' }}>
                  {ascii.mapCharacterIntensity(char, level)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div>
        <h4>Available Variations</h4>
        {demoCharacters.map(char => (
          <div key={char}>
            <strong>{char}:</strong> {ascii.getIntensityVariations(char).join(', ')}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Common Types

### Shared Interfaces

```typescript
// Voice Animation State (used by all dragon types)
interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume?: number       // 0-1 scale
  emotion?: 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
}

// Dragon Type Union
type DragonType = '2d' | '3d' | 'ascii'

// Size Options
type DragonSize = 'sm' | 'md' | 'lg' | 'xl'

// Performance Metrics
interface DragonPerformanceMetrics {
  renderTime: number
  initTime: number
  dragonType: DragonType
  fallbackUsed: boolean
  errorCount: number
}
```

## Utility Functions

### Exported Utility Functions

```typescript
// Dragon state mapping utilities
export const voiceStateToASCIIPose = (voiceState: VoiceAnimationState): ASCIIPose
export const voiceStateToAnimationSpeed = (voiceState: VoiceAnimationState): AnimationSpeed
export const shouldShowBreathing = (voiceState: VoiceAnimationState): boolean
export const shouldShowFloating = (voiceState: VoiceAnimationState): boolean
export const shouldShowEnergyEffects = (voiceState: VoiceAnimationState): boolean

// 3D dragon utilities
export const detect3DSupport = (): boolean
export const voiceStateToPose = (voiceState: VoiceAnimationState): string
export const voiceStateToSpeed = (voiceState: VoiceAnimationState): string
export const voiceStateTo3DProps = (voiceState: VoiceAnimationState): object

// Animation sequence utilities
export const createSpecialAnimationSequence = (
  animations: SpecialAnimation[],
  interval?: number
) => TaskEither<Dragon3DError, void>

export const createDragonStateTransition = (
  from: DragonState,
  to: DragonState,
  duration?: number
) => object

// Performance utilities
export const getDragonStateRecommendation = (
  voiceActive: boolean,
  transcriptLength: number,
  powerLevel: number
): DragonState
```

### Usage Examples

```typescript
import { 
  voiceStateToASCIIPose, 
  detect3DSupport, 
  createSpecialAnimationSequence 
} from '@/hooks/voice/dragon-utils'

// Check device capabilities
const canUse3D = detect3DSupport()
console.log('3D Support:', canUse3D)

// Map voice state to ASCII pose
const voiceState = { isListening: true, isSpeaking: false, isProcessing: false, isIdle: false }
const pose = voiceStateToASCIIPose(voiceState)
console.log('Recommended pose:', pose) // 'flying'

// Create animation sequence
const powerUpSequence = createSpecialAnimationSequence([
  'charge',
  'pulse', 
  'powerUp',
  'roar'
], 500)

// Execute with error handling
powerUpSequence().then(
  () => console.log('Sequence completed'),
  error => console.error('Sequence failed:', error)
)
```

## Error Handling

### Error Types

```typescript
// Dragon 3D Error
interface Dragon3DError {
  type: 'ANIMATION_ERROR' | 'STATE_ERROR' | 'PERFORMANCE_ERROR'
  message: string
  originalError?: unknown
}

// ASCII Dragon Error
interface ASCIIDragonError {
  type: 'RENDER_ERROR' | 'VOICE_ERROR' | 'ANIMATION_ERROR'
  message: string
  context?: object
}
```

### Error Handling Patterns

```typescript
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'

// TaskEither error handling
const handleDragonAction = (dragon: UseDragon3DReturn) => {
  pipe(
    dragon.setState('active'),
    TE.chain(() => dragon.triggerSpecialAnimation('roar')),
    TE.fold(
      // Error case
      (error) => async () => {
        console.error('Dragon action failed:', error)
        // Fallback behavior
        dragon.setMood('calm')
        return false
      },
      // Success case  
      () => async () => {
        console.log('Dragon action completed successfully')
        return true
      }
    )
  )()
}

// Option handling for nullable values
import * as O from 'fp-ts/Option'

const getAnimationName = (dragon: UseDragon3DReturn): string => {
  return pipe(
    dragon.getSpecialAnimation(),
    O.fold(
      () => 'No animation', // None case
      (animation) => `Playing: ${animation}` // Some case
    )
  )
}
```

### Comprehensive Error Boundary

```typescript
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function DragonErrorFallback({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="dragon-error-fallback">
      <h2>Dragon Animation Error</h2>
      <p>Something went wrong with the dragon animation:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  )
}

function DragonWithErrorBoundary() {
  return (
    <ErrorBoundary
      FallbackComponent={DragonErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Dragon error:', error, errorInfo)
        // Send to error reporting service
      }}
    >
      <YourDragonComponent />
    </ErrorBoundary>
  )
}
```

## Examples

### Complete Integration Example

```typescript
import React, { useState, useEffect } from 'react'
import { useDragon3D, useASCIIDragon } from '@/hooks/voice'
import { DragonRenderer, VoiceAnimationState } from '@/components/dragon'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

function CompleteDragonDemo() {
  const [dragonType, setDragonType] = useState<'3d' | 'ascii'>('ascii')
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5,
    emotion: 'neutral'
  })

  // Initialize both dragon hooks
  const dragon3D = useDragon3D({
    enableVoiceIntegration: true,
    enablePerformanceMonitoring: true,
    autoOptimize: true
  })

  const asciiDragon = useASCIIDragon({
    enableVoiceReactivity: true,
    enableBreathing: true,
    enableFloating: true
  })

  // Sync voice state with active dragon
  useEffect(() => {
    if (dragonType === '3d') {
      // Update 3D dragon with voice state
      if (voiceState.isListening) dragon3D.onVoiceListeningStart()
      if (voiceState.isSpeaking) dragon3D.onVoiceSpeakingStart()
      if (voiceState.isProcessing) dragon3D.onVoiceProcessingStart()
    } else {
      // Update ASCII dragon with voice state
      asciiDragon.updateVoiceState(voiceState)
    }
  }, [voiceState, dragonType])

  // Handle special effects
  const triggerSpecialEffect = (effect: string) => {
    if (dragonType === '3d') {
      pipe(
        dragon3D.triggerSpecialAnimation(effect as any),
        TE.fold(
          (error) => async () => console.error('Effect failed:', error),
          () => async () => console.log('Effect triggered:', effect)
        )
      )()
    } else {
      // ASCII dragons have different special effects
      asciiDragon.triggerTypewriter()
    }
  }

  // Voice state simulation
  const simulateVoiceState = (newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({
      ...prev,
      ...newState,
      isIdle: !newState.isListening && !newState.isSpeaking && !newState.isProcessing
    }))
  }

  return (
    <div className="complete-dragon-demo">
      <div className="controls">
        <h3>Dragon Type</h3>
        <button 
          onClick={() => setDragonType('ascii')}
          disabled={dragonType === 'ascii'}
        >
          ASCII Dragon
        </button>
        <button 
          onClick={() => setDragonType('3d')}
          disabled={dragonType === '3d'}
        >
          3D Dragon
        </button>
        
        <h3>Voice State</h3>
        <button onClick={() => simulateVoiceState({ isListening: true })}>
          Start Listening
        </button>
        <button onClick={() => simulateVoiceState({ isSpeaking: true })}>
          Start Speaking  
        </button>
        <button onClick={() => simulateVoiceState({ isProcessing: true })}>
          Start Processing
        </button>
        <button onClick={() => simulateVoiceState({ 
          isListening: false, 
          isSpeaking: false, 
          isProcessing: false 
        })}>
          Go Idle
        </button>
        
        <h3>Special Effects</h3>
        {dragonType === '3d' ? (
          <>
            <button onClick={() => triggerSpecialEffect('roar')}>Roar</button>
            <button onClick={() => triggerSpecialEffect('powerUp')}>Power Up</button>
            <button onClick={() => triggerSpecialEffect('breatheFire')}>Breathe Fire</button>
          </>
        ) : (
          <button onClick={() => triggerSpecialEffect('typewriter')}>Typewriter</button>
        )}
      </div>
      
      <div className="dragon-display">
        <DragonRenderer
          dragonType={dragonType}
          size="xl"
          voiceState={voiceState}
          enableFallback={true}
          fallbackType="ascii"
        />
      </div>
      
      <div className="status">
        <h3>Status</h3>
        {dragonType === '3d' ? (
          <div>
            <div>State: {dragon3D.state}</div>
            <div>Mood: {dragon3D.mood}</div>
            <div>Power: {dragon3D.powerLevel}%</div>
            <div>Performance: {dragon3D.performanceScore}%</div>
            <div>Voice Active: {dragon3D.isVoiceActive() ? 'Yes' : 'No'}</div>
          </div>
        ) : (
          <div>
            <div>Pose: {asciiDragon.currentPose}</div>
            <div>Speed: {asciiDragon.animationSpeed}</div>
            <div>Breathing: {Math.round(asciiDragon.breathingIntensity * 100)}%</div>
            <div>Effects: {asciiDragon.shouldShowEffects ? 'Yes' : 'No'}</div>
          </div>
        )}
        
        <h4>Voice State</h4>
        <div>Listening: {voiceState.isListening ? '🎤' : '❌'}</div>
        <div>Speaking: {voiceState.isSpeaking ? '🗣️' : '❌'}</div>
        <div>Processing: {voiceState.isProcessing ? '🧠' : '❌'}</div>
        <div>Volume: {Math.round((voiceState.volume || 0) * 100)}%</div>
        <div>Emotion: {voiceState.emotion}</div>
      </div>
    </div>
  )
}

export default CompleteDragonDemo
```

This comprehensive API documentation provides everything needed to effectively use the dragon hooks in Seiron, with complete type safety, error handling, and real-world examples.