// Enhanced Dragon Animation System
// Main exports for the Seiron dragon components

// Core component
export { EnhancedDragonCharacter } from './EnhancedDragonCharacter'

// Enhanced Dragon Interaction System
export { EnhancedDragonInteractionSystem } from './EnhancedDragonInteractionSystem'

// Seiron Image Component
export { SeironImage } from './SeironImage'

// Types
export type {
  DragonState,
  DragonMood,
  AnimationIntensity,
  PerformanceMode,
  OrbitPattern,
  DragonPose,
  DragonAnimationConfig,
  DragonBallConfig,
  EnhancedDragonCharacterProps,
  InteractionType,
  DragonInteractionEvent,
  OrbitPhysics,
  DragonBallState,
  PerformanceMetrics,
  ResponsiveBreakpoint,
  TouchGesture,
  AccessibilityConfig,
  DragonAnimationHookReturn,
  MouseTrackingHookReturn,
  TouchGestureHookReturn,
  PerformanceHookReturn,
  // Enhanced Interaction Types
  DragonPart,
  EnhancedMouseTrackingReturn,
  EnhancedTouchGestureReturn,
  KeyboardNavigationConfig,
  // SVG Interaction Types
  SVGInteractionZones,
  SVGInteractionState,
  SVGAccessibilityProps
} from './types'

// Hooks
export { useDragonStateMachine, useAdvancedDragonStateMachine } from './hooks/useDragonStateMachine'
export { useMouseTracking, useEyeTracking, useProximityDetection } from './hooks/useMouseTracking'
export { useTouchGestures, useSwipeDirection, useDragonGesturePower } from './hooks/useTouchGestures'
export { useAnimationPerformance, useReducedMotion, performanceUtils } from './hooks/useAnimationPerformance'

// Enhanced Interaction Hooks
export { useEnhancedMouseTracking } from './hooks/useEnhancedMouseTracking'
export { useEnhancedTouchGestures } from './hooks/useEnhancedTouchGestures'
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

// Constants and configuration
export {
  DRAGON_SIZE_CONFIG,
  DRAGON_ANIMATION_PRESETS,
  DRAGON_BALL_PRESETS,
  RESPONSIVE_BREAKPOINTS,
  PERFORMANCE_THRESHOLDS,
  ANIMATION_TIMING,
  POWER_LEVELS,
  INTERACTION_ZONES,
  DRAGON_COLORS,
  DRAGON_BALL_STARS,
  ORBITAL_PHYSICS,
  DEFAULT_DRAGON_CONFIG,
  DEFAULT_DRAGON_BALL_CONFIG
} from './constants'

// Utility functions
// Note: performanceUtils already exported above with useAnimationPerformance

// Presets for easy usage
export const DragonPresets = {
  // Performance presets
  HighPerformance: {
    animationConfig: {
      enableParticles: true,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: true,
      particleCount: 20,
      transitionDuration: 600,
      performanceMode: 'quality' as const,
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    dragonBallConfig: {
      count: 7,
      orbitPattern: 'circular' as const,
      orbitSpeed: 1.0,
      orbitRadius: 150,
      individualAnimation: true,
      interactionEnabled: true
    },
    interactive: true,
    enableCursorTracking: true,
    autoStates: true
  },
  
  Balanced: {
    animationConfig: {
      enableParticles: true,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: false,
      particleCount: 12,
      transitionDuration: 400,
      performanceMode: 'balanced' as const,
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    dragonBallConfig: {
      count: 7,
      orbitPattern: 'circular' as const,
      orbitSpeed: 1.0,
      orbitRadius: 150,
      individualAnimation: true,
      interactionEnabled: true
    },
    interactive: true,
    enableCursorTracking: true,
    autoStates: true
  },
  
  Mobile: {
    animationConfig: {
      enableParticles: false,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: false,
      enableMicroMovements: false,
      particleCount: 6,
      transitionDuration: 300,
      performanceMode: 'performance' as const,
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    dragonBallConfig: {
      count: 4,
      orbitPattern: 'circular' as const,
      orbitSpeed: 0.8,
      orbitRadius: 120,
      individualAnimation: false,
      interactionEnabled: false
    },
    interactive: true,
    enableCursorTracking: false,
    autoStates: false
  },
  
  Minimal: {
    animationConfig: {
      enableParticles: false,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: false,
      enableMicroMovements: false,
      particleCount: 6,
      transitionDuration: 300,
      performanceMode: 'performance' as const,
      reducedMotion: false,
      autoQualityAdjustment: true
    },
    dragonBallConfig: {
      count: 3,
      orbitPattern: 'circular' as const,
      orbitSpeed: 0.5,
      orbitRadius: 100,
      individualAnimation: false,
      interactionEnabled: false
    },
    interactive: false,
    enableCursorTracking: false,
    autoStates: false
  },
  
  // State presets
  PowerfulDragon: {
    initialState: 'powering-up' as const,
    initialMood: 'powerful' as const,
    animationConfig: {
      enableParticles: true,
      enableAura: true,
      enableDragonBalls: true,
      enableBreathing: true,
      enableMicroMovements: true,
      particleCount: 20,
      transitionDuration: 600,
      performanceMode: 'quality' as const,
      reducedMotion: false,
      autoQualityAdjustment: true
    }
  },
  
  AttentiveDragon: {
    initialState: 'attention' as const,
    initialMood: 'focused' as const,
    enableCursorTracking: true,
    autoStates: true
  },
  
  IdleDragon: {
    initialState: 'idle' as const,
    initialMood: 'neutral' as const,
    autoStates: true
  },
  
  ConfidentDragon: {
    initialState: 'arms-crossed' as const,
    initialMood: 'confident' as const,
    armsVariant: 'crossed' as const
  }
} as const

// Quick setup functions
export const createDragonConfig = (
  preset: keyof typeof DragonPresets = 'Balanced',
  overrides: Partial<EnhancedDragonCharacterProps> = {}
): EnhancedDragonCharacterProps => ({
  ...DragonPresets[preset],
  ...overrides
})

// Performance helper
export const getOptimalDragonConfig = (deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
  switch (deviceType) {
    case 'mobile':
      return DragonPresets.Mobile
    case 'tablet':
      return DragonPresets.Balanced
    case 'desktop':
    default:
      return DragonPresets.HighPerformance
  }
}

// Device detection utility
export const detectDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}