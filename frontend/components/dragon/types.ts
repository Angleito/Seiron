// Enhanced Dragon Animation Types

export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'powering-up' | 'arms-crossed' | 'sleeping' | 'awakening';

export type DragonMood = 'neutral' | 'happy' | 'excited' | 'powerful' | 'mystical' | 'focused' | 'aggressive' | 'confident';

export type AnimationIntensity = 'low' | 'medium' | 'high' | 'extreme';

export type PerformanceMode = 'quality' | 'balanced' | 'performance';

export type OrbitPattern = 'circular' | 'elliptical' | 'complex' | 'chaotic';

export type DragonPart = 'head' | 'left-eye' | 'right-eye' | 'body' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg' | 'tail' | 'wings' | 'dragon-ball';

export type InteractionType = 'click' | 'hover' | 'touch' | 'keyboard';

export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ResponsiveBreakpointConfig {
  name: ResponsiveBreakpoint;
  minWidth: number;
  maxWidth?: number;
  dragonSize: string;
  particleCount: number;
  animationQuality: string;
}

export interface DragonPose {
  state: DragonState;
  mood: DragonMood;
  powerLevel: number; // 0-9000+
  animationIntensity: AnimationIntensity;
  breathingRate: number; // 0.5-2.0 multiplier
  attentionTarget?: { x: number; y: number };
}

export interface DragonAnimationConfig {
  enableParticles: boolean;
  enableAura: boolean;
  enableDragonBalls: boolean;
  enableBreathing: boolean;
  enableMicroMovements: boolean;
  particleCount: number;
  transitionDuration: number;
  performanceMode: PerformanceMode;
  reducedMotion: boolean;
  autoQualityAdjustment: boolean;
}

export interface DragonBallConfig {
  count: number; // 1-7 dragon balls
  orbitPattern: OrbitPattern;
  orbitSpeed: number; // 0.1-2.0 multiplier
  orbitRadius: number; // radius in pixels
  individualAnimation: boolean;
  interactionEnabled: boolean;
}

export interface EnhancedDragonCharacterProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  initialState?: DragonState;
  initialMood?: DragonMood;
  interactive?: boolean;
  showDragonBalls?: boolean;
  animationConfig?: Partial<DragonAnimationConfig>;
  dragonBallConfig?: Partial<DragonBallConfig>;
  onStateChange?: (state: DragonState) => void;
  onMoodChange?: (mood: DragonMood) => void;
  onInteraction?: (event: DragonInteractionEvent) => void;
  className?: string;
  enableCursorTracking?: boolean;
  autoStates?: boolean;
  onPowerLevelChange?: (level: number) => void;
}

export interface DragonInteractionEvent {
  type: InteractionType;
  part: DragonPart;
  position: { x: number; y: number };
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface OrbitPhysics {
  radius: number;
  speed: number;
  angle: number;
  centerX: number;
  centerY: number;
  pattern: OrbitPattern;
}

export interface DragonBallState {
  id: number;
  position: { x: number; y: number };
  orbit: OrbitPhysics;
  collected: boolean;
  glowIntensity: number;
  powerLevel: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  cpuUsage: number;
  memoryUsage: number;
  batterySaving: boolean;
  qualityLevel: number;
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'rotate' | 'long-press';
  startTime: number;
  duration: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  distance: number;
  velocity: { x: number; y: number };
  scale?: number;
  rotation?: number;
}

export interface AccessibilityConfig {
  enableKeyboardNav: boolean;
  enableScreenReader: boolean;
  enableMotionReduction: boolean;
  enableHighContrast: boolean;
  focusIndicatorStyle: React.CSSProperties;
  announcements: Record<DragonPart, string>;
}

export interface KeyboardNavigationConfig {
  focusableElements: DragonPart[];
  focusIndicatorStyle: React.CSSProperties;
  announcements: Record<DragonPart, string>;
  keyBindings: Record<string, (part: DragonPart) => void>;
}

export interface SVGInteractionZones {
  [key: string]: {
    bounds: DOMRect;
    part: DragonPart;
    interactive: boolean;
    accessibilityLabel: string;
  };
}

export interface SVGInteractionState {
  hoveredPart: DragonPart | null;
  activePart: DragonPart | null;
  touchTargets: Map<DragonPart, DOMRect>;
  interactionHistory: DragonInteractionEvent[];
}

export interface SVGAccessibilityProps {
  role: string;
  'aria-label': string;
  'aria-describedby': string;
  'aria-live': 'polite' | 'assertive' | 'off';
  tabIndex: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Hook Return Types
export interface DragonAnimationHookReturn {
  pose: DragonPose;
  setPose: (pose: Partial<DragonPose>) => void;
  transitionTo: (state: DragonState, mood?: DragonMood) => void;
  powerUp: () => void;
  isAnimating: boolean;
  performanceMetrics: PerformanceMetrics;
  actions: {
    setPowerLevel: (level: number) => void;
    triggerPowerUp: () => void;
    resetAnimation: () => void;
  };
}

export interface MouseTrackingHookReturn {
  mousePosition: { x: number; y: number };
  isHovering: boolean;
  hoveredPart: DragonPart | null;
  eyePosition: { x: number; y: number };
  proximityLevel: number;
  cursorInside: boolean;
  isMouseActive: boolean;
  distanceFromDragon: number;
  angleFromDragon: number;
  targetDirection: { x: number; y: number };
  isInProximity: boolean;
}

export interface TouchGestureHookReturn {
  gestureHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  currentGesture: TouchGesture | null;
  gestureHistory: TouchGesture[];
  isGestureActive: boolean;
}

export interface PerformanceHookReturn {
  metrics: PerformanceMetrics;
  qualityLevel: number;
  setQualityLevel: (level: number) => void;
  enableBatterySaving: () => void;
  disableBatterySaving: () => void;
  resetMetrics: () => void;
}

// Enhanced Interaction Types
export interface EyeTrackingState {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  tracking: boolean;
  blinkState: 'open' | 'closing' | 'closed' | 'opening';
  attentionLevel: number;
}

export interface CursorEffect {
  id: string;
  type: 'trail' | 'glow' | 'ripple' | 'magnetic';
  position: { x: number; y: number };
  intensity: number;
  color: string;
  timestamp: number;
}

export interface MagneticCursorState {
  isActive: boolean;
  targetElement: Element | null;
  magneticStrength: number;
  snapDistance: number;
  currentOffset: { x: number; y: number };
}

export interface EnhancedMouseTrackingReturn extends MouseTrackingHookReturn {
  eyeTracking: EyeTrackingState;
  cursorEffects: CursorEffect[];
  magneticCursor: MagneticCursorState;
  proximityZone: 'none' | 'outer' | 'inner';
  performanceMetrics: PerformanceMetrics;
  svgState?: SVGInteractionState;
}

export interface EnhancedTouchGestureReturn extends TouchGestureHookReturn {
  gestureTrails: TouchGesture[];
  multiTouchState: Record<string, unknown>;
  specialGestures: Record<string, unknown>;
  performanceMetrics: PerformanceMetrics;
  svgTouchTargets?: Map<DragonPart, DOMRect>;
}