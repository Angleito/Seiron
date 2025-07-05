// Enhanced Dragon Animation Types

export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'powering-up' | 'arms-crossed' | 'sleeping' | 'awakening';

export type DragonMood = 'neutral' | 'happy' | 'excited' | 'powerful' | 'mystical' | 'focused' | 'aggressive' | 'confident';

export type AnimationIntensity = 'low' | 'medium' | 'high' | 'extreme';

export type PerformanceMode = 'quality' | 'balanced' | 'performance';

export type OrbitPattern = 'circular' | 'elliptical' | 'complex' | 'chaotic';

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
  onPowerLevelChange?: (level: number) => void;
  onInteraction?: (type: InteractionType) => void;
  className?: string;
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open';
  enableCursorTracking?: boolean;
  autoStates?: boolean; // Auto-transition between states
}

export type InteractionType = 
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
  | 'proximity-leave';

export interface DragonInteractionEvent {
  type: InteractionType;
  target: 'dragon' | 'dragon-ball' | 'aura' | 'particles';
  position?: { x: number; y: number };
  data?: any;
  timestamp: number;
}

export interface OrbitPhysics {
  angle: number;
  radius: number;
  speed: number;
  eccentricity: number; // 0-1 for elliptical orbits
  phase: number; // offset phase
  momentum: { x: number; y: number };
  attractors: Array<{ x: number; y: number; force: number }>;
}

export interface DragonBallState {
  id: number; // 1-7 stars
  physics: OrbitPhysics;
  isHovered: boolean;
  isInteracting: boolean;
  powerLevel: number;
  glowIntensity: number;
  trailLength: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  averageFrameTime: number;
  memoryUsage: number;
  gpuUtilization: number;
  lastUpdated: number;
  // Additional compatibility properties
  cpuUsage?: number;
  networkLatency?: number;
}

export interface ResponsiveBreakpoint {
  name: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  minWidth: number;
  maxWidth?: number;
  dragonSize: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  particleCount: number;
  animationQuality: PerformanceMode;
}

export interface TouchGesture {
  type: 'tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate';
  startTime: number;
  duration: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  distance: number;
  velocity: { x: number; y: number };
  scale?: number; // for pinch
  rotation?: number; // for rotate
}

export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  announceStateChanges: boolean;
  highContrastMode: 'auto' | 'enabled' | 'disabled';
  reducedMotionOverride?: boolean;
  focusIndicators: boolean;
  ariaLabels: {
    dragon: string;
    dragonBalls: string;
    powerLevel: string;
    interactionHint: string;
  };
}

// Animation Hook Types
export interface DragonAnimationHookReturn {
  state: DragonState;
  mood: DragonMood;
  powerLevel: number;
  isTransitioning: boolean;
  performanceMetrics: PerformanceMetrics;
  actions: {
    setState: (state: DragonState) => void;
    setMood: (mood: DragonMood) => void;
    powerUp: () => void;
    powerDown: () => void;
    triggerSpecialAnimation: (type: 'roar' | 'spin' | 'pulse' | 'shake') => void;
    resetToIdle: () => void;
  };
}

export interface MouseTrackingHookReturn {
  mousePosition: { x: number; y: number };
  isMouseActive: boolean;
  distanceFromDragon: number;
  angleFromDragon: number;
  targetDirection: { x: number; y: number };
  isInProximity: boolean;
}

export interface TouchGestureHookReturn {
  gestures: TouchGesture[];
  isGestureActive: boolean;
  currentGesture: TouchGesture | null;
  gestureHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

export interface PerformanceHookReturn {
  performanceMode: PerformanceMode;
  metrics: PerformanceMetrics;
  isOptimizing: boolean;
  qualityLevel: number; // 0-100
  actions: {
    setPerformanceMode: (mode: PerformanceMode) => void;
    enableAutoOptimization: () => void;
    disableAutoOptimization: () => void;
    resetMetrics: () => void;
  };
}

// Dragon part types for interaction
export type DragonPart = 
  | 'head' 
  | 'left-eye' 
  | 'right-eye' 
  | 'body' 
  | 'left-arm' 
  | 'right-arm' 
  | 'left-leg' 
  | 'right-leg' 
  | 'tail' 
  | 'wings' 
  | 'dragon-ball';

export interface EnhancedMouseTrackingReturn extends MouseTrackingHookReturn {
  getElementAtPosition: (x: number, y: number) => DragonPart | null;
  updateEyeTracking: (mousePosition: { x: number; y: number }) => void;
  updateHeadRotation: (mousePosition: { x: number; y: number }) => void;
}

export interface EnhancedTouchGestureReturn extends TouchGestureHookReturn {
  expandTouchTarget: (part: DragonPart, expansion: number) => void;
  handleTouch: (part: DragonPart, event: React.TouchEvent) => void;
}

export interface KeyboardNavigationConfig {
  focusableElements: DragonPart[];
  focusIndicatorStyle: React.CSSProperties;
  announcements: Record<DragonPart, string>;
  keyBindings: Record<string, (part: DragonPart) => void>;
}

