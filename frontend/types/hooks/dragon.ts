// Dragon hook types

import { Observable } from 'rxjs'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import {
  DragonState,
  DragonMood,
  DragonPose,
  DragonAnimationConfig,
  DragonBallConfig,
  DragonInteractionEvent,
  PerformanceMetrics,
  TouchGesture,
  DragonPart,
  InteractionType,
  AnimationIntensity,
  PerformanceMode
} from '../components/dragon'

// Dragon Animation Hook Types
export interface DragonAnimationHookConfig {
  initialState?: DragonState
  initialMood?: DragonMood
  initialPowerLevel?: number
  animationConfig?: Partial<DragonAnimationConfig>
  performanceMode?: PerformanceMode
  onStateChange?: (state: DragonState) => void
  onMoodChange?: (mood: DragonMood) => void
  onPowerLevelChange?: (powerLevel: number) => void
  autoTransitions?: boolean
  transitionDuration?: number
}

export interface DragonAnimationHookReturn {
  pose: DragonPose
  isAnimating: boolean
  performanceMetrics: PerformanceMetrics
  animationConfig: DragonAnimationConfig
  setPose: (pose: Partial<DragonPose>) => void
  transitionTo: (state: DragonState, mood?: DragonMood) => TE.TaskEither<Error, void>
  powerUp: (targetLevel?: number) => TE.TaskEither<Error, void>
  powerDown: (targetLevel?: number) => TE.TaskEither<Error, void>
  setMood: (mood: DragonMood) => void
  setState: (state: DragonState) => void
  setPowerLevel: (level: number) => void
  setAnimationIntensity: (intensity: AnimationIntensity) => void
  updateConfig: (config: Partial<DragonAnimationConfig>) => void
  resetToDefault: () => void
  pauseAnimation: () => void
  resumeAnimation: () => void
  getAnimationProgress: () => number
}

// Dragon Interaction Hook Types
export interface DragonInteractionHookConfig {
  enableMouse?: boolean
  enableTouch?: boolean
  enableKeyboard?: boolean
  interactionRadius?: number
  proximityThreshold?: number
  onInteraction?: (event: DragonInteractionEvent) => void
  onProximityChange?: (level: number) => void
  onAttentionChange?: (target: { x: number; y: number } | null) => void
  debugMode?: boolean
}

export interface DragonInteractionHookReturn {
  mousePosition: { x: number; y: number }
  touchPositions: Map<number, { x: number; y: number }>
  hoveredPart: DragonPart | null
  activePart: DragonPart | null
  proximityLevel: number
  attentionTarget: { x: number; y: number } | null
  interactionHistory: DragonInteractionEvent[]
  isInteracting: boolean
  cursorInside: boolean
  addInteractionZone: (part: DragonPart, bounds: DOMRect) => void
  removeInteractionZone: (part: DragonPart) => void
  setProximityThreshold: (threshold: number) => void
  clearInteractionHistory: () => void
  getInteractionZones: () => Map<DragonPart, DOMRect>
  enableInteractions: () => void
  disableInteractions: () => void
}

// Mouse Tracking Hook Types
export interface MouseTrackingHookConfig {
  trackingBounds?: DOMRect
  smoothingFactor?: number
  updateInterval?: number
  magneticRadius?: number
  magneticStrength?: number
  enableMagnetic?: boolean
  onPositionChange?: (position: { x: number; y: number }) => void
  onProximityChange?: (level: number) => void
  onEnter?: () => void
  onLeave?: () => void
}

export interface MouseTrackingHookReturn {
  mousePosition: { x: number; y: number }
  smoothedPosition: { x: number; y: number }
  velocity: { x: number; y: number }
  proximityLevel: number
  isTracking: boolean
  cursorInside: boolean
  magneticOffset: { x: number; y: number }
  startTracking: (element?: HTMLElement) => void
  stopTracking: () => void
  setTrackingBounds: (bounds: DOMRect) => void
  enableMagnetic: () => void
  disableMagnetic: () => void
  resetPosition: () => void
}

// Touch Gestures Hook Types
export interface TouchGesturesHookConfig {
  enableSwipe?: boolean
  enablePinch?: boolean
  enableRotate?: boolean
  enableLongPress?: boolean
  swipeThreshold?: number
  pinchThreshold?: number
  rotateThreshold?: number
  longPressDelay?: number
  onGesture?: (gesture: TouchGesture) => void
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void
  onPinch?: (scale: number, velocity: number) => void
  onRotate?: (angle: number, velocity: number) => void
  onLongPress?: (position: { x: number; y: number }) => void
  onTap?: (position: { x: number; y: number }) => void
}

export interface TouchGesturesHookReturn {
  gestureHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
  currentGesture: TouchGesture | null
  gestureHistory: TouchGesture[]
  isGestureActive: boolean
  activeTouches: Map<number, Touch>
  clearHistory: () => void
  enableGesture: (type: TouchGesture['type']) => void
  disableGesture: (type: TouchGesture['type']) => void
  setThreshold: (type: TouchGesture['type'], threshold: number) => void
}

// Dragon Performance Hook Types
export interface DragonPerformanceHookConfig {
  monitorFPS?: boolean
  monitorMemory?: boolean
  monitorCPU?: boolean
  monitorBattery?: boolean
  updateInterval?: number
  qualityThresholds?: {
    fps: { min: number; target: number }
    memory: { max: number; warning: number }
    cpu: { max: number; warning: number }
  }
  autoQualityAdjustment?: boolean
  onPerformanceChange?: (metrics: PerformanceMetrics) => void
  onQualityAdjustment?: (level: number) => void
}

export interface DragonPerformanceHookReturn {
  metrics: PerformanceMetrics
  qualityLevel: number
  isMonitoring: boolean
  recommendations: string[]
  startMonitoring: () => void
  stopMonitoring: () => void
  setQualityLevel: (level: number) => void
  enableBatterySaving: () => void
  disableBatterySaving: () => void
  optimizeForDevice: () => void
  resetMetrics: () => void
  getPerformanceReport: () => string
}

// Dragon State Machine Hook Types
export interface DragonStateMachineConfig {
  initialState?: DragonState
  transitions?: Record<DragonState, DragonState[]>
  autoTransitions?: boolean
  transitionDelay?: number
  onStateChange?: (from: DragonState, to: DragonState) => void
  onTransitionStart?: (to: DragonState) => void
  onTransitionEnd?: (state: DragonState) => void
  onTransitionError?: (error: Error) => void
}

export interface DragonStateMachineHookReturn {
  currentState: DragonState
  previousState: DragonState | null
  isTransitioning: boolean
  availableTransitions: DragonState[]
  stateHistory: Array<{ state: DragonState; timestamp: number }>
  canTransitionTo: (state: DragonState) => boolean
  transitionTo: (state: DragonState) => TE.TaskEither<Error, void>
  addTransition: (from: DragonState, to: DragonState) => void
  removeTransition: (from: DragonState, to: DragonState) => void
  resetToInitial: () => void
  getStateDuration: () => number
  isValidTransition: (from: DragonState, to: DragonState) => boolean
}

// Dragon Effects Hook Types
export interface DragonEffectsHookConfig {
  enableParticles?: boolean
  enableAura?: boolean
  enableBreath?: boolean
  enablePowerRings?: boolean
  particleCount?: number
  auraIntensity?: number
  breathDuration?: number
  powerRingCount?: number
  onEffectStart?: (effect: string) => void
  onEffectEnd?: (effect: string) => void
}

export interface DragonEffectsHookReturn {
  activeEffects: Set<string>
  particleSystem: {
    isActive: boolean
    particleCount: number
    startParticles: () => void
    stopParticles: () => void
    setParticleCount: (count: number) => void
  }
  aura: {
    isActive: boolean
    intensity: number
    startAura: () => void
    stopAura: () => void
    setIntensity: (intensity: number) => void
  }
  breath: {
    isActive: boolean
    duration: number
    startBreath: () => void
    stopBreath: () => void
    setDuration: (duration: number) => void
  }
  powerRings: {
    isActive: boolean
    ringCount: number
    startPowerRings: () => void
    stopPowerRings: () => void
    setRingCount: (count: number) => void
  }
  startAllEffects: () => void
  stopAllEffects: () => void
  toggleEffect: (effect: string) => void
  isEffectActive: (effect: string) => boolean
}

// Dragon Audio Hook Types
export interface DragonAudioHookConfig {
  enableSoundEffects?: boolean
  enableMusic?: boolean
  volume?: number
  soundEffects?: Record<DragonState | DragonMood | InteractionType, string>
  backgroundMusic?: Record<DragonMood, string>
  onAudioStart?: (type: string) => void
  onAudioEnd?: (type: string) => void
  onAudioError?: (error: Error) => void
}

export interface DragonAudioHookReturn {
  isPlaying: boolean
  currentTrack: string | null
  volume: number
  isMuted: boolean
  playStateSound: (state: DragonState) => TE.TaskEither<Error, void>
  playMoodMusic: (mood: DragonMood) => TE.TaskEither<Error, void>
  playInteractionSound: (type: InteractionType) => TE.TaskEither<Error, void>
  stopAll: () => void
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  preloadSounds: () => TE.TaskEither<Error, void>
}

// Dragon Orbital Hook Types (for Dragon Balls)
export interface DragonOrbitalHookConfig {
  orbitCount?: number
  orbitRadius?: number
  orbitSpeed?: number
  orbitPattern?: 'circular' | 'elliptical' | 'complex' | 'chaotic'
  enablePhysics?: boolean
  enableCollisions?: boolean
  onOrbitComplete?: (orbitId: number) => void
  onCollision?: (orbit1: number, orbit2: number) => void
}

export interface DragonOrbitalHookReturn {
  orbitals: Array<{
    id: number
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    angle: number
    radius: number
    speed: number
  }>
  isOrbiting: boolean
  orbitalPhysics: {
    gravity: number
    friction: number
    elasticity: number
  }
  startOrbiting: () => void
  stopOrbiting: () => void
  addOrbital: (config?: Partial<any>) => number
  removeOrbital: (id: number) => void
  updateOrbital: (id: number, updates: Partial<any>) => void
  setOrbitPattern: (pattern: 'circular' | 'elliptical' | 'complex' | 'chaotic') => void
  setPhysics: (physics: Partial<any>) => void
  resetOrbitals: () => void
}

// Combined Dragon Hook Types
export interface DragonHookConfig {
  animation?: DragonAnimationHookConfig
  interaction?: DragonInteractionHookConfig
  performance?: DragonPerformanceHookConfig
  stateMachine?: DragonStateMachineConfig
  effects?: DragonEffectsHookConfig
  audio?: DragonAudioHookConfig
  orbital?: DragonOrbitalHookConfig
  globalErrorHandler?: (error: Error) => void
}

export interface DragonHookReturn {
  animation: DragonAnimationHookReturn
  interaction: DragonInteractionHookReturn
  performance: DragonPerformanceHookReturn
  stateMachine: DragonStateMachineHookReturn
  effects: DragonEffectsHookReturn
  audio: DragonAudioHookReturn
  orbital: DragonOrbitalHookReturn
  isInitialized: boolean
  initialize: () => TE.TaskEither<Error, void>
  destroy: () => void
  reset: () => void
}

// Functional Types for fp-ts Integration
export type DragonTask<T> = TE.TaskEither<Error, T>
export type DragonReader<T> = (config: DragonHookConfig) => T
export type DragonValidator<T> = (input: unknown) => E.Either<Error, T>
export type DragonTransformer<A, B> = (input: A) => B

// Observable Types for RxJS Integration
export interface DragonStreams {
  state$: Observable<DragonState>
  mood$: Observable<DragonMood>
  powerLevel$: Observable<number>
  interactions$: Observable<DragonInteractionEvent>
  performance$: Observable<PerformanceMetrics>
  mousePosition$: Observable<{ x: number; y: number }>
  touchGestures$: Observable<TouchGesture>
  proximityLevel$: Observable<number>
  effects$: Observable<Set<string>>
  audio$: Observable<{ isPlaying: boolean; track: string | null }>
}

export interface DragonStreamHookReturn {
  streams: DragonStreams
  subscribe: <T>(stream: keyof DragonStreams, callback: (value: T) => void) => () => void
  getLatestValue: <T>(stream: keyof DragonStreams) => O.Option<T>
  combineStreams: <T>(streamNames: Array<keyof DragonStreams>, combiner: (...values: unknown[]) => T) => Observable<T>
}

// Advanced Hook Types
export interface DragonAnalyticsHookReturn {
  analytics: {
    totalInteractions: number
    averageSessionDuration: number
    mostUsedStates: Array<{ state: DragonState; count: number }>
    mostUsedMoods: Array<{ mood: DragonMood; count: number }>
    interactionHeatmap: Map<DragonPart, number>
    performanceHistory: PerformanceMetrics[]
    powerLevelHistory: Array<{ level: number; timestamp: number }>
  }
  startTracking: () => void
  stopTracking: () => void
  resetAnalytics: () => void
  exportData: () => string
}

export interface DragonAccessibilityHookReturn {
  isAccessibilityEnabled: boolean
  focusedPart: DragonPart | null
  announcements: string[]
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  setFocus: (part: DragonPart) => void
  clearFocus: () => void
  enableKeyboardNavigation: () => void
  disableKeyboardNavigation: () => void
  enableMotionReduction: () => void
  disableMotionReduction: () => void
  enableHighContrast: () => void
  disableHighContrast: () => void
}

export interface DragonTestingHookReturn {
  mockInteraction: (type: InteractionType, part: DragonPart, position: { x: number; y: number }) => void
  mockStateTransition: (state: DragonState) => void
  mockMoodChange: (mood: DragonMood) => void
  mockPowerUp: (level: number) => void
  simulatePerformanceIssue: (type: 'fps' | 'memory' | 'cpu') => void
  getTestMetrics: () => Record<string, any>
  resetTestState: () => void
}

// Utility Hook Types
export interface DragonUtilsHookReturn {
  calculateDistance: (point1: { x: number; y: number }, point2: { x: number; y: number }) => number
  calculateAngle: (center: { x: number; y: number }, point: { x: number; y: number }) => number
  interpolatePosition: (start: { x: number; y: number }, end: { x: number; y: number }, progress: number) => { x: number; y: number }
  generatePowerLevel: () => number
  formatPowerLevel: (level: number) => string
  isValidState: (state: unknown) => state is DragonState
  isValidMood: (mood: unknown) => mood is DragonMood
  getStateTransitionDuration: (from: DragonState, to: DragonState) => number
  getMoodTransitionDuration: (from: DragonMood, to: DragonMood) => number
  optimizeAnimationConfig: (config: DragonAnimationConfig, performance: PerformanceMetrics) => DragonAnimationConfig
}