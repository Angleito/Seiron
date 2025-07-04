# SVG Dragon System API Reference

Complete TypeScript interface documentation for the SVG Dragon system.

## Table of Contents

1. [Core Components](#core-components)
2. [Type Definitions](#type-definitions)
3. [Hooks](#hooks)
4. [Utility Functions](#utility-functions)
5. [Configuration Objects](#configuration-objects)
6. [Event Handlers](#event-handlers)

## Core Components

### EnhancedDragonCharacter

The main dragon component that provides the complete dragon experience with SVG rendering, interactions, and performance optimization.

```tsx
interface EnhancedDragonCharacterProps {
  // Basic Props
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  initialState?: DragonState
  initialMood?: DragonMood
  interactive?: boolean
  showDragonBalls?: boolean
  className?: string
  
  // NEW: SVG-specific props
  renderMode?: 'svg' | 'png' | 'auto'
  svgQuality?: 'minimal' | 'standard' | 'enhanced'
  enableSVGAnimations?: boolean
  
  // Advanced Configuration
  animationConfig?: Partial<DragonAnimationConfig>
  dragonBallConfig?: Partial<DragonBallConfig>
  accessibilityConfig?: Partial<AccessibilityConfig>
  
  // Interaction Props
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open'
  enableCursorTracking?: boolean
  autoStates?: boolean
  
  // Event Handlers
  onStateChange?: (state: DragonState) => void
  onMoodChange?: (mood: DragonMood) => void
  onPowerLevelChange?: (level: number) => void
  onInteraction?: (type: InteractionType) => void
}
```

**Usage Example:**

```tsx
<EnhancedDragonCharacter
  size="lg"
  renderMode="svg"
  svgQuality="enhanced"
  enableSVGAnimations={true}
  interactive={true}
  showDragonBalls={true}
  onStateChange={(state) => console.log('State:', state)}
  onPowerLevelChange={(level) => console.log('Power:', level)}
/>
```

### DragonSVG

The core SVG dragon component with modular architecture.

```tsx
interface DragonSVGProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  state?: DragonState
  mood?: DragonMood
  powerLevel?: number
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open'
  className?: string
  enableAnimations?: boolean
  attentionTarget?: { x: number; y: number }
  onInteraction?: (type: string) => void
}
```

**Usage Example:**

```tsx
<DragonSVG
  size="lg"
  state="powering-up"
  mood="powerful"
  powerLevel={8500}
  armsVariant="crossed"
  enableAnimations={true}
  attentionTarget={{ x: 200, y: 150 }}
  onInteraction={(type) => console.log('Interaction:', type)}
/>
```

### SVGDragonBalls

The orbital dragon ball system with physics-based animations.

```tsx
interface SVGDragonBallsProps {
  radius?: number
  ballSize?: number
  orbitalMode?: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  interactive?: boolean
  dragonState?: DragonState
  count?: number
  onWishGranted?: () => void
  onBallClick?: (ballId: number) => void
  className?: string
}
```

**Usage Example:**

```tsx
<SVGDragonBalls
  radius={150}
  ballSize={32}
  orbitalMode="elliptical"
  interactive={true}
  dragonState="active"
  count={7}
  onWishGranted={() => console.log('Wish granted!')}
  onBallClick={(id) => console.log('Ball clicked:', id)}
/>
```

### EnhancedSVGDragonBalls

Enhanced dragon balls with premium features and native SVG animations.

```tsx
interface EnhancedSVGDragonBallsProps extends SVGDragonBallsProps {
  useNativeAnimations?: boolean
  enableGPUAcceleration?: boolean
  forceQualityLevel?: 'minimal' | 'reduced' | 'full'
  enableSVGFilters?: boolean
  enableComplexPaths?: boolean
  maxConcurrentAnimations?: number
  dynamicQualityAdjustment?: boolean
}
```

**Usage Example:**

```tsx
<EnhancedSVGDragonBalls
  radius={150}
  ballSize={32}
  orbitalMode="chaotic"
  useNativeAnimations={true}
  enableGPUAcceleration={true}
  enableSVGFilters={true}
  dynamicQualityAdjustment={true}
/>
```

### Modular SVG Components

#### DragonHead

```tsx
interface DragonHeadProps {
  state: DragonState
  mood: DragonMood
  powerIntensity: number
  gradientId: string
  attentionTarget?: { x: number; y: number }
  className?: string
}
```

#### DragonBody

```tsx
interface DragonBodyProps {
  state: DragonState
  mood: DragonMood
  powerIntensity: number
  gradientId: string
  className?: string
}
```

#### DragonEyes

```tsx
interface DragonEyesProps {
  state: DragonState
  mood: DragonMood
  powerIntensity: number
  gradientId: string
  attentionTarget?: { x: number; y: number }
  className?: string
}
```

#### DragonLimbs

```tsx
interface DragonLimbsProps {
  state: DragonState
  mood: DragonMood
  powerIntensity: number
  gradientId: string
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open'
  className?: string
}
```

#### DragonTail

```tsx
interface DragonTailProps {
  state: DragonState
  mood: DragonMood
  powerIntensity: number
  gradientId: string
  className?: string
}
```

#### SVGGradients

```tsx
interface SVGGradientsProps {
  gradientId: string
  state: DragonState
  mood: DragonMood
  powerIntensity: number
}
```

## Type Definitions

### Basic Types

```tsx
type DragonState = 
  | 'idle' 
  | 'attention' 
  | 'ready' 
  | 'active' 
  | 'powering-up' 
  | 'arms-crossed' 
  | 'sleeping' 
  | 'awakening'

type DragonMood = 
  | 'neutral' 
  | 'happy' 
  | 'excited' 
  | 'powerful' 
  | 'mystical' 
  | 'focused' 
  | 'aggressive' 
  | 'confident'

type PerformanceMode = 'quality' | 'balanced' | 'performance'

type OrbitPattern = 'circular' | 'elliptical' | 'complex' | 'chaotic'

type InteractionType = 
  | 'hover' 
  | 'leave' 
  | 'click' 
  | 'double-click'
  | 'long-press'
  | 'drag-start'
  | 'drag-end'
  | 'gesture-swipe'
  | 'gesture-pinch'
  | 'keyboard-focus'
  | 'proximity-enter'
  | 'proximity-leave'
```

### SVG-Specific Types

```tsx
type RenderMode = 'svg' | 'png' | 'auto'

type SVGQuality = 'minimal' | 'standard' | 'enhanced'

interface SVGPoint {
  x: number
  y: number
  radius?: number
}

interface SVGRect {
  x: number
  y: number
  width: number
  height: number
}

interface SVGCircle {
  cx: number
  cy: number
  r: number
}

interface SVGPath {
  d: string
  bounds: SVGRect
}
```

### Complex Types

```tsx
interface DragonPose {
  state: DragonState
  mood: DragonMood
  powerLevel: number
  animationIntensity: AnimationIntensity
  breathingRate: number
  attentionTarget?: { x: number; y: number }
}

interface OrbitPhysics {
  angle: number
  radius: number
  speed: number
  eccentricity: number
  phase: number
  momentum: { x: number; y: number }
  attractors: Array<{ x: number; y: number; force: number }>
}

interface DragonBallState {
  id: number
  physics: OrbitPhysics
  isHovered: boolean
  isInteracting: boolean
  powerLevel: number
  glowIntensity: number
  trailLength: number
}

interface PerformanceMetrics {
  fps: number
  frameDrops: number
  averageFrameTime: number
  memoryUsage: number
  gpuUtilization: number
  lastUpdated: number
}

interface TouchGesture {
  type: 'tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate'
  startTime: number
  duration: number
  startPosition: { x: number; y: number }
  endPosition: { x: number; y: number }
  distance: number
  velocity: { x: number; y: number }
  scale?: number
  rotation?: number
}
```

## Hooks

### useDragonStateMachine

Manages dragon state with automatic transitions and actions.

```tsx
interface UseDragonStateMachineReturn {
  state: DragonState
  mood: DragonMood
  powerLevel: number
  isTransitioning: boolean
  actions: {
    setState: (state: DragonState) => void
    setMood: (mood: DragonMood) => void
    powerUp: (amount?: number) => void
    powerDown: (amount?: number) => void
    triggerSpecialAnimation: (type: 'roar' | 'spin' | 'pulse' | 'shake') => void
    resetToIdle: () => void
  }
}

function useDragonStateMachine(initialState?: DragonState): UseDragonStateMachineReturn
```

**Usage Example:**

```tsx
const dragon = useDragonStateMachine('idle')

// Use dragon state and actions
console.log(dragon.state) // 'idle'
dragon.actions.setState('active')
dragon.actions.powerUp(1000)
dragon.actions.triggerSpecialAnimation('roar')
```

### useMouseTracking

Tracks mouse movement for cursor following and proximity detection.

```tsx
interface UseMouseTrackingOptions {
  elementRef: React.RefObject<HTMLElement>
  enabled?: boolean
  smoothing?: number
  proximityThreshold?: number
}

interface UseMouseTrackingReturn {
  mousePosition: { x: number; y: number }
  isMouseActive: boolean
  distanceFromDragon: number
  angleFromDragon: number
  targetDirection: { x: number; y: number }
  isInProximity: boolean
}

function useMouseTracking(options: UseMouseTrackingOptions): UseMouseTrackingReturn
```

**Usage Example:**

```tsx
const dragonRef = useRef<HTMLDivElement>(null)
const mouseTracking = useMouseTracking({
  elementRef: dragonRef,
  enabled: true,
  proximityThreshold: 200
})

console.log(mouseTracking.isInProximity) // boolean
console.log(mouseTracking.distanceFromDragon) // number
```

### useTouchGestures

Handles touch gestures for mobile interaction.

```tsx
interface UseTouchGesturesOptions {
  enabled?: boolean
  onTap?: (gesture: TouchGesture) => void
  onLongPress?: (gesture: TouchGesture) => void
  onSwipe?: (gesture: TouchGesture) => void
  onPinch?: (gesture: TouchGesture) => void
  onRotate?: (gesture: TouchGesture) => void
}

interface UseTouchGesturesReturn {
  gestures: TouchGesture[]
  isGestureActive: boolean
  currentGesture: TouchGesture | null
  gestureHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

function useTouchGestures(options: UseTouchGesturesOptions): UseTouchGesturesReturn
```

**Usage Example:**

```tsx
const touchGestures = useTouchGestures({
  enabled: true,
  onSwipe: (gesture) => {
    if (gesture.endPosition.y < gesture.startPosition.y) {
      // Swipe up - increase power
      dragon.actions.powerUp()
    }
  },
  onPinch: (gesture) => {
    if (gesture.scale && gesture.scale > 1.2) {
      dragon.actions.setState('powering-up')
    }
  }
})
```

### useAnimationPerformance

Monitors and optimizes animation performance.

```tsx
interface UseAnimationPerformanceReturn {
  performanceMode: PerformanceMode
  metrics: PerformanceMetrics
  isOptimizing: boolean
  qualityLevel: number
  actions: {
    setPerformanceMode: (mode: PerformanceMode) => void
    enableAutoOptimization: () => void
    disableAutoOptimization: () => void
    resetMetrics: () => void
  }
}

function useAnimationPerformance(autoOptimize?: boolean): UseAnimationPerformanceReturn
```

**Usage Example:**

```tsx
const performance = useAnimationPerformance(true)

console.log(performance.metrics.fps) // Current FPS
console.log(performance.qualityLevel) // 0-100 quality level

// Manually adjust performance
performance.actions.setPerformanceMode('performance')
```

### useKeyboardNavigation

Provides keyboard navigation support for accessibility.

```tsx
interface UseKeyboardNavigationOptions {
  focusableElements: DragonPart[]
  onActivate?: (element: DragonPart) => void
  onFocusChange?: (element: DragonPart | null) => void
}

interface UseKeyboardNavigationReturn {
  focusedElement: DragonPart | null
  handleKeyDown: (event: React.KeyboardEvent) => void
  setFocus: (element: DragonPart) => void
}

function useKeyboardNavigation(options: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn
```

**Usage Example:**

```tsx
const keyboardNav = useKeyboardNavigation({
  focusableElements: ['dragon', 'dragon-ball-1', 'dragon-ball-2'],
  onActivate: (element) => {
    console.log('Activated:', element)
  }
})

// Use in component
<div onKeyDown={keyboardNav.handleKeyDown}>
  {/* Dragon component */}
</div>
```

## Utility Functions

### createDragonConfig

Creates a dragon configuration from presets and custom options.

```tsx
function createDragonConfig(
  preset: keyof typeof DragonPresets,
  customConfig?: Partial<EnhancedDragonCharacterProps>
): EnhancedDragonCharacterProps
```

**Usage Example:**

```tsx
const config = createDragonConfig('Balanced', {
  size: 'xl',
  renderMode: 'svg',
  svgQuality: 'enhanced',
  animationConfig: {
    performanceMode: 'quality'
  }
})
```

### detectDeviceType

Detects the current device type for optimization.

```tsx
type DeviceType = 'mobile' | 'tablet' | 'desktop'

function detectDeviceType(): DeviceType
```

**Usage Example:**

```tsx
const deviceType = detectDeviceType()
const svgQuality = deviceType === 'mobile' ? 'minimal' : 'standard'
```

### getOptimalDragonConfig

Returns optimal configuration for the detected device.

```tsx
function getOptimalDragonConfig(
  deviceType?: DeviceType
): Partial<EnhancedDragonCharacterProps>
```

**Usage Example:**

```tsx
const optimalConfig = getOptimalDragonConfig()
```

### calculateDragonSize

Calculates appropriate dragon size based on container and device.

```tsx
interface SizeCalculationOptions {
  containerWidth: number
  containerHeight: number
  deviceType: DeviceType
  maxSize?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

function calculateDragonSize(options: SizeCalculationOptions): 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
```

## Configuration Objects

### DragonAnimationConfig

```tsx
interface DragonAnimationConfig {
  enableParticles: boolean
  enableAura: boolean
  enableDragonBalls: boolean
  enableBreathing: boolean
  enableMicroMovements: boolean
  particleCount: number
  transitionDuration: number
  performanceMode: PerformanceMode
  reducedMotion: boolean
  autoQualityAdjustment: boolean
}
```

**Default Values:**

```tsx
const DEFAULT_ANIMATION_CONFIG: DragonAnimationConfig = {
  enableParticles: true,
  enableAura: false,
  enableDragonBalls: true,
  enableBreathing: true,
  enableMicroMovements: true,
  particleCount: 15,
  transitionDuration: 800,
  performanceMode: 'balanced',
  reducedMotion: false,
  autoQualityAdjustment: true
}
```

### DragonBallConfig

```tsx
interface DragonBallConfig {
  count: number
  orbitPattern: OrbitPattern
  orbitSpeed: number
  orbitRadius: number
  individualAnimation: boolean
  interactionEnabled: boolean
}
```

**Default Values:**

```tsx
const DEFAULT_DRAGON_BALL_CONFIG: DragonBallConfig = {
  count: 7,
  orbitPattern: 'elliptical',
  orbitSpeed: 1.0,
  orbitRadius: 150,
  individualAnimation: true,
  interactionEnabled: true
}
```

### AccessibilityConfig

```tsx
interface AccessibilityConfig {
  enableScreenReader: boolean
  enableKeyboardNavigation: boolean
  announceStateChanges: boolean
  highContrastMode: 'auto' | 'enabled' | 'disabled'
  reducedMotionOverride?: boolean
  focusIndicators: boolean
  ariaLabels: {
    dragon: string
    dragonBalls: string
    powerLevel: string
    interactionHint: string
  }
}
```

**Default Values:**

```tsx
const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  enableScreenReader: true,
  enableKeyboardNavigation: true,
  announceStateChanges: true,
  highContrastMode: 'auto',
  focusIndicators: true,
  ariaLabels: {
    dragon: 'Interactive Shenron Dragon Character',
    dragonBalls: 'Seven Dragon Balls in orbital pattern',
    powerLevel: 'Current dragon power level indicator',
    interactionHint: 'Click, tap, or use keyboard to interact with the dragon'
  }
}
```

## Event Handlers

### State Change Events

```tsx
type StateChangeHandler = (state: DragonState) => void
type MoodChangeHandler = (mood: DragonMood) => void
type PowerLevelChangeHandler = (level: number) => void
```

### Interaction Events

```tsx
type InteractionHandler = (type: InteractionType) => void

interface DragonInteractionEvent {
  type: InteractionType
  target: 'dragon' | 'dragon-ball' | 'aura' | 'particles'
  position?: { x: number; y: number }
  data?: any
  timestamp: number
}

type DragonInteractionHandler = (event: DragonInteractionEvent) => void
```

### Touch Events

```tsx
type TouchEventHandler = (gesture: TouchGesture) => void

interface TouchEventHandlers {
  onTap?: TouchEventHandler
  onLongPress?: TouchEventHandler
  onSwipe?: TouchEventHandler
  onPinch?: TouchEventHandler
  onRotate?: TouchEventHandler
}
```

### Performance Events

```tsx
type PerformanceEventHandler = (metrics: PerformanceMetrics) => void
type QualityChangeHandler = (qualityLevel: number) => void
```

## Constants

### Dragon Presets

```tsx
const DragonPresets = {
  HighPerformance: {
    renderMode: 'svg' as const,
    svgQuality: 'enhanced' as const,
    animationConfig: {
      performanceMode: 'quality' as const,
      enableParticles: true,
      enableAura: true
    }
  },
  Balanced: {
    renderMode: 'svg' as const,
    svgQuality: 'standard' as const,
    animationConfig: {
      performanceMode: 'balanced' as const,
      enableParticles: true,
      enableAura: false
    }
  },
  Mobile: {
    renderMode: 'svg' as const,
    svgQuality: 'minimal' as const,
    enableSVGAnimations: false,
    animationConfig: {
      performanceMode: 'performance' as const,
      enableParticles: false,
      enableAura: false
    }
  },
  Minimal: {
    renderMode: 'svg' as const,
    svgQuality: 'minimal' as const,
    enableSVGAnimations: false,
    showDragonBalls: false,
    animationConfig: {
      performanceMode: 'performance' as const,
      enableParticles: false,
      enableAura: false,
      enableBreathing: false
    }
  }
} as const
```

### Size Configurations

```tsx
const DRAGON_SIZE_CONFIG = {
  sm: { 
    containerSize: 'w-24 h-24',
    width: 96,
    height: 96,
    dragonBallSize: 16,
    orbitRadius: 60
  },
  md: { 
    containerSize: 'w-32 h-32',
    width: 128,
    height: 128,
    dragonBallSize: 20,
    orbitRadius: 80
  },
  lg: { 
    containerSize: 'w-48 h-48',
    width: 192,
    height: 192,
    dragonBallSize: 24,
    orbitRadius: 120
  },
  xl: { 
    containerSize: 'w-64 h-64',
    width: 256,
    height: 256,
    dragonBallSize: 28,
    orbitRadius: 160
  },
  xxl: { 
    containerSize: 'w-80 h-80',
    width: 320,
    height: 320,
    dragonBallSize: 32,
    orbitRadius: 200
  }
} as const
```

---

This API reference provides complete documentation for all types, interfaces, and functions in the SVG Dragon system. Use this as a reference while developing with the dragon components.