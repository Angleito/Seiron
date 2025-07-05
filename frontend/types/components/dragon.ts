// Dragon component types

import { ReactNode } from 'react'

export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'powering-up' | 'arms-crossed' | 'sleeping' | 'awakening'

export type DragonMood = 'neutral' | 'happy' | 'excited' | 'powerful' | 'mystical' | 'focused' | 'aggressive' | 'confident'

export type AnimationIntensity = 'low' | 'medium' | 'high' | 'extreme'

export type PerformanceMode = 'quality' | 'balanced' | 'performance'

export type OrbitPattern = 'circular' | 'elliptical' | 'complex' | 'chaotic'

export type DragonPart = 'head' | 'left-eye' | 'right-eye' | 'body' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg' | 'tail' | 'wings' | 'dragon-ball'

export type InteractionType = 'click' | 'hover' | 'touch' | 'keyboard'

export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

export interface DragonPose {
  state: DragonState
  mood: DragonMood
  powerLevel: number // 0-9000+
  animationIntensity: AnimationIntensity
  breathingRate: number // 0.5-2.0 multiplier
  attentionTarget?: { x: number; y: number }
}

export interface DragonAnimationConfig {
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

export interface DragonBallConfig {
  count: number // 1-7 dragon balls
  orbitPattern: OrbitPattern
  orbitSpeed: number // 0.1-2.0 multiplier
  orbitRadius: number // radius in pixels
  individualAnimation: boolean
  interactionEnabled: boolean
}

export interface DragonInteractionEvent {
  type: InteractionType
  part: DragonPart
  position: { x: number; y: number }
  timestamp: number
  context?: Record<string, unknown>
}

export interface OrbitPhysics {
  radius: number
  speed: number
  angle: number
  centerX: number
  centerY: number
  pattern: OrbitPattern
}

export interface DragonBallState {
  id: number
  position: { x: number; y: number }
  orbit: OrbitPhysics
  collected: boolean
  glowIntensity: number
  powerLevel: number
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  renderTime: number
  cpuUsage: number
  memoryUsage: number
  batterySaving: boolean
  qualityLevel: number
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'rotate' | 'long-press'
  startTime: number
  duration: number
  startPosition: { x: number; y: number }
  endPosition: { x: number; y: number }
  distance: number
  velocity: { x: number; y: number }
}

export interface AccessibilityConfig {
  enableKeyboardNav: boolean
  enableScreenReader: boolean
  enableMotionReduction: boolean
  enableHighContrast: boolean
  focusIndicatorStyle: React.CSSProperties
  announcements: Record<DragonPart, string>
}

export interface KeyboardNavigationConfig {
  focusableElements: DragonPart[]
  focusIndicatorStyle: React.CSSProperties
  announcements: Record<DragonPart, string>
  keyBindings: Record<string, (part: DragonPart) => void>
}

export interface SVGInteractionZones {
  [key: string]: {
    bounds: DOMRect
    part: DragonPart
    interactive: boolean
    accessibilityLabel: string
  }
}

export interface SVGInteractionState {
  hoveredPart: DragonPart | null
  activePart: DragonPart | null
  touchTargets: Map<DragonPart, DOMRect>
  interactionHistory: DragonInteractionEvent[]
}

export interface SVGAccessibilityProps {
  role: string
  'aria-label': string
  'aria-describedby': string
  'aria-live': 'polite' | 'assertive' | 'off'
  tabIndex: number
  onKeyDown?: (event: React.KeyboardEvent) => void
  onFocus?: () => void
  onBlur?: () => void
}

export interface EyeTrackingState {
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  tracking: boolean
  blinkState: 'open' | 'closing' | 'closed' | 'opening'
  attentionLevel: number
}

export interface CursorEffect {
  id: string
  type: 'trail' | 'glow' | 'ripple' | 'magnetic'
  position: { x: number; y: number }
  intensity: number
  color: string
  timestamp: number
}

export interface MagneticCursorState {
  isActive: boolean
  targetElement: Element | null
  magneticStrength: number
  snapDistance: number
  currentOffset: { x: number; y: number }
}

// Component Props
export interface DragonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  initialState?: DragonState
  initialMood?: DragonMood
  interactive?: boolean
  showDragonBalls?: boolean
  animationConfig?: Partial<DragonAnimationConfig>
  dragonBallConfig?: Partial<DragonBallConfig>
  accessibilityConfig?: Partial<AccessibilityConfig>
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  onStateChange?: (state: DragonState) => void
  onMoodChange?: (mood: DragonMood) => void
  onInteraction?: (event: DragonInteractionEvent) => void
  onPerformanceChange?: (metrics: PerformanceMetrics) => void
}

export interface DragonBallProps {
  id: number
  position: { x: number; y: number }
  orbit: OrbitPhysics
  collected: boolean
  glowIntensity: number
  powerLevel: number
  size?: number
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: (id: number) => void
  onHover?: (id: number, hovered: boolean) => void
}

export interface DragonBallOrbitalProps {
  count: number
  config: DragonBallConfig
  center: { x: number; y: number }
  size?: number
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  onBallClick?: (id: number) => void
  onBallHover?: (id: number, hovered: boolean) => void
  onCollected?: (id: number) => void
}

export interface DragonEffectsProps {
  type: 'aura' | 'breath' | 'particles' | 'power-rings'
  intensity: AnimationIntensity
  color?: string
  size?: number
  duration?: number
  loop?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface DragonAnimationProps {
  dragon: DragonProps
  effects?: DragonEffectsProps[]
  performance?: PerformanceMode
  className?: string
  style?: React.CSSProperties
}

export interface DragonContainerProps {
  children: ReactNode
  responsive?: boolean
  breakpoints?: Record<ResponsiveBreakpoint, Partial<DragonProps>>
  className?: string
  style?: React.CSSProperties
}

export interface DragonShowcaseProps {
  demos: Array<{
    name: string
    description: string
    config: DragonProps
  }>
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface DragonDebugProps {
  dragon: DragonProps
  showMetrics?: boolean
  showInteractions?: boolean
  showPerformance?: boolean
  className?: string
  style?: React.CSSProperties
}

// Animation presets
export interface DragonAnimationPreset {
  name: string
  description: string
  config: DragonAnimationConfig
  pose: DragonPose
}

export const DRAGON_ANIMATION_PRESETS: Record<string, DragonAnimationPreset> = {
  idle: {
    name: 'Idle',
    description: 'Calm and peaceful state',
    config: {
      enableParticles: false,
      enableAura: false,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: true,
      particleCount: 0,
      transitionDuration: 2000,
      performanceMode: 'balanced',
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    pose: {
      state: 'idle',
      mood: 'neutral',
      powerLevel: 100,
      animationIntensity: 'low',
      breathingRate: 1.0
    }
  },
  attention: {
    name: 'Attention',
    description: 'Alert and focused state',
    config: {
      enableParticles: true,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: true,
      particleCount: 20,
      transitionDuration: 1000,
      performanceMode: 'balanced',
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    pose: {
      state: 'attention',
      mood: 'focused',
      powerLevel: 500,
      animationIntensity: 'medium',
      breathingRate: 1.2
    }
  },
  powerful: {
    name: 'Powerful',
    description: 'High energy and power state',
    config: {
      enableParticles: true,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: true,
      particleCount: 50,
      transitionDuration: 500,
      performanceMode: 'quality',
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    pose: {
      state: 'powering-up',
      mood: 'powerful',
      powerLevel: 9000,
      animationIntensity: 'extreme',
      breathingRate: 2.0
    }
  }
}

// Dragon size configurations
export const DRAGON_SIZES: Record<string, { width: number; height: number; scale: number }> = {
  sm: { width: 100, height: 100, scale: 0.5 },
  md: { width: 200, height: 200, scale: 1.0 },
  lg: { width: 300, height: 300, scale: 1.5 },
  xl: { width: 400, height: 400, scale: 2.0 },
  xxl: { width: 500, height: 500, scale: 2.5 }
}

// Dragon color themes
export const DRAGON_THEMES: Record<string, Record<string, string>> = {
  default: {
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffcc02',
    background: '#1a1a1a',
    glow: '#ff6b35'
  },
  blue: {
    primary: '#0066cc',
    secondary: '#0080ff',
    accent: '#00ccff',
    background: '#001a33',
    glow: '#0066cc'
  },
  green: {
    primary: '#00cc66',
    secondary: '#00ff80',
    accent: '#66ff99',
    background: '#001a0d',
    glow: '#00cc66'
  },
  purple: {
    primary: '#8000ff',
    secondary: '#9933ff',
    accent: '#b366ff',
    background: '#1a0033',
    glow: '#8000ff'
  },
  gold: {
    primary: '#ffcc00',
    secondary: '#ffdd33',
    accent: '#ffee66',
    background: '#332600',
    glow: '#ffcc00'
  }
}