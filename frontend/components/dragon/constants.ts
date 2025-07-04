import type { DragonAnimationConfig, DragonBallConfig, ResponsiveBreakpoint, PerformanceMode } from './types';

// Dragon Size Configuration
export const DRAGON_SIZE_CONFIG = {
  sm: { 
    width: 120, 
    height: 120, 
    containerSize: 'w-32 h-32',
    dragonBallSize: 20,
    orbitRadius: 80
  },
  md: { 
    width: 200, 
    height: 200, 
    containerSize: 'w-52 h-52',
    dragonBallSize: 28,
    orbitRadius: 120
  },
  lg: { 
    width: 300, 
    height: 300, 
    containerSize: 'w-80 h-80',
    dragonBallSize: 32,
    orbitRadius: 160
  },
  xl: { 
    width: 400, 
    height: 400, 
    containerSize: 'w-96 h-96',
    dragonBallSize: 36,
    orbitRadius: 200
  },
  xxl: { 
    width: 500, 
    height: 500, 
    containerSize: 'w-[500px] h-[500px]',
    dragonBallSize: 40,
    orbitRadius: 250
  }
} as const;

// Animation Presets by Performance Mode
export const DRAGON_ANIMATION_PRESETS: Record<PerformanceMode, DragonAnimationConfig> = {
  quality: {
    enableParticles: true,
    enableAura: true,
    enableDragonBalls: true,
    enableBreathing: true,
    enableMicroMovements: true,
    particleCount: 20,
    transitionDuration: 600,
    performanceMode: 'quality',
    reducedMotion: false,
    autoQualityAdjustment: true
  },
  balanced: {
    enableParticles: true,
    enableAura: true,
    enableDragonBalls: true,
    enableBreathing: true,
    enableMicroMovements: false,
    particleCount: 12,
    transitionDuration: 400,
    performanceMode: 'balanced',
    reducedMotion: false,
    autoQualityAdjustment: true
  },
  performance: {
    enableParticles: false,
    enableAura: true,
    enableDragonBalls: true,
    enableBreathing: false,
    enableMicroMovements: false,
    particleCount: 6,
    transitionDuration: 300,
    performanceMode: 'performance',
    reducedMotion: false,
    autoQualityAdjustment: true
  }
} as const;

// Dragon Ball Configuration Presets
export const DRAGON_BALL_PRESETS: Record<string, DragonBallConfig> = {
  classic: {
    count: 7,
    orbitPattern: 'circular',
    orbitSpeed: 1.0,
    orbitRadius: 150,
    individualAnimation: true,
    interactionEnabled: true
  },
  simple: {
    count: 4,
    orbitPattern: 'circular',
    orbitSpeed: 0.8,
    orbitRadius: 120,
    individualAnimation: false,
    interactionEnabled: false
  },
  chaotic: {
    count: 7,
    orbitPattern: 'chaotic',
    orbitSpeed: 1.5,
    orbitRadius: 180,
    individualAnimation: true,
    interactionEnabled: true
  },
  minimal: {
    count: 3,
    orbitPattern: 'circular',
    orbitSpeed: 0.5,
    orbitRadius: 100,
    individualAnimation: false,
    interactionEnabled: false
  }
} as const;

// Responsive Breakpoints
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    name: 'xs',
    minWidth: 0,
    maxWidth: 479,
    dragonSize: 'sm',
    particleCount: 4,
    animationQuality: 'performance'
  },
  {
    name: 'sm',
    minWidth: 480,
    maxWidth: 767,
    dragonSize: 'md',
    particleCount: 6,
    animationQuality: 'performance'
  },
  {
    name: 'md',
    minWidth: 768,
    maxWidth: 1023,
    dragonSize: 'lg',
    particleCount: 8,
    animationQuality: 'balanced'
  },
  {
    name: 'lg',
    minWidth: 1024,
    maxWidth: 1279,
    dragonSize: 'xl',
    particleCount: 12,
    animationQuality: 'balanced'
  },
  {
    name: 'xl',
    minWidth: 1280,
    maxWidth: 1535,
    dragonSize: 'xl',
    particleCount: 16,
    animationQuality: 'quality'
  },
  {
    name: '2xl',
    minWidth: 1536,
    dragonSize: 'xxl',
    particleCount: 20,
    animationQuality: 'quality'
  }
];

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  fps: {
    excellent: 58,
    good: 45,
    poor: 30,
    critical: 20
  },
  memory: {
    low: 0.3,      // 30% of available memory
    medium: 0.6,   // 60% of available memory
    high: 0.8,     // 80% of available memory
    critical: 0.9  // 90% of available memory
  },
  frameDrops: {
    acceptable: 5,
    concerning: 15,
    critical: 30
  }
} as const;

// Animation Timing Constants
export const ANIMATION_TIMING = {
  dragonFloat: 8000,        // 8 seconds
  dragonBreathe: 4000,      // 4 seconds
  windDrift: 15000,         // 15 seconds
  attentionCycle: 2000,     // 2 seconds
  readyCycle: 1500,         // 1.5 seconds
  activeCycle: 1000,        // 1 second
  idleTwitch: 8000,         // 8 seconds
  wingTwitch: 12000,        // 12 seconds
  dragonBallOrbit: 15000,   // 15 seconds
  dragonBallFast: 5000,     // 5 seconds (when powered up)
  stateTransition: 600,     // 600ms
  powerUpDuration: 2000,    // 2 seconds
  idleTimeout: 5000         // 5 seconds to return to idle
} as const;

// Power Level Constants
export const POWER_LEVELS = {
  minimum: 1000,
  maximum: 9001,
  thresholds: {
    low: 1000,      // 1,000 - Base power
    medium: 3000,   // 3,000 - Getting stronger
    high: 5000,     // 5,000 - Significant power
    extreme: 8000,  // 8,000 - Very powerful
    legendary: 9000 // 9,000+ - Over 9000!
  },
  increments: {
    slow: 100,
    normal: 250,
    fast: 500,
    instant: 1000
  }
} as const;

// Interaction Constants
export const INTERACTION_ZONES = {
  proximity: {
    inner: 100,     // Immediate attention
    outer: 200,     // Awareness zone
    max: 300        // Detection limit
  },
  touch: {
    minArea: 44,    // Minimum touch target (44px)
    comfort: 56     // Comfortable touch target
  },
  gesture: {
    minDistance: 20,     // Minimum swipe distance
    maxDuration: 1000,   // Maximum gesture duration (1s)
    longPressDuration: 500 // Long press threshold
  }
} as const;

// Color Schemes for Dragon States
export const DRAGON_COLORS = {
  idle: {
    primary: 'rgba(239, 68, 68, 0.3)',   // Dragon red
    secondary: 'rgba(251, 146, 60, 0.2)', // Orange
    accent: 'rgba(252, 211, 77, 0.1)'     // Gold
  },
  attention: {
    primary: 'rgba(239, 68, 68, 0.4)',
    secondary: 'rgba(251, 146, 60, 0.3)',
    accent: 'rgba(252, 211, 77, 0.2)'
  },
  ready: {
    primary: 'rgba(239, 68, 68, 0.6)',
    secondary: 'rgba(251, 146, 60, 0.4)',
    accent: 'rgba(252, 211, 77, 0.3)'
  },
  active: {
    primary: 'rgba(239, 68, 68, 0.8)',
    secondary: 'rgba(251, 146, 60, 0.6)',
    accent: 'rgba(252, 211, 77, 0.4)'
  },
  'powering-up': {
    primary: 'rgba(239, 68, 68, 1.0)',
    secondary: 'rgba(251, 146, 60, 0.8)',
    accent: 'rgba(252, 211, 77, 0.6)'
  }
} as const;

// Dragon Ball Star Patterns
export const DRAGON_BALL_STARS = [
  { stars: 1, color: 'from-yellow-400 to-orange-400' },
  { stars: 2, color: 'from-orange-400 to-red-400' },
  { stars: 3, color: 'from-yellow-300 to-yellow-500' },
  { stars: 4, color: 'from-orange-300 to-orange-500' },
  { stars: 5, color: 'from-yellow-400 to-orange-400' },
  { stars: 6, color: 'from-orange-400 to-red-400' },
  { stars: 7, color: 'from-yellow-300 to-yellow-500' }
] as const;

// Orbital Physics Constants
export const ORBITAL_PHYSICS = {
  gravitationalConstant: 0.1,
  dampingFactor: 0.98,
  springConstant: 0.02,
  maxVelocity: 5.0,
  collisionRadius: 16,
  attractionRadius: 50,
  repulsionForce: 2.0
} as const;

// Default Animation Configuration
export const DEFAULT_DRAGON_CONFIG: DragonAnimationConfig = DRAGON_ANIMATION_PRESETS.balanced;

export const DEFAULT_DRAGON_BALL_CONFIG: DragonBallConfig = DRAGON_BALL_PRESETS.classic;