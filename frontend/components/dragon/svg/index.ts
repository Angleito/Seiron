// Export all SVG dragon components
export { DragonSVG } from './DragonSVG';
export { DragonHead } from './components/DragonHead';
export { DragonBody } from './components/DragonBody';
export { DragonLimbs } from './components/DragonLimbs';
export { DragonTail } from './components/DragonTail';
export { DragonEyes } from './components/DragonEyes';
export { SVGGradients } from './components/SVGGradients';

// Enhanced SVG Dragon Ball Systems
export { EnhancedSVGDragonBalls } from './EnhancedSVGDragonBalls';
export { PerformanceSVGDragonBalls } from './PerformanceSVGDragonBalls';
export { DragonBalls } from './DragonBalls';

// Re-export types from parent types file
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
  PerformanceHookReturn
} from '../types';

// Export constants
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
} from '../constants';

// Utility functions for optimal component selection
export function selectOptimalDragonBallComponent(
  performanceMode: 'quality' | 'balanced' | 'performance' = 'balanced',
  deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
) {
  if (performanceMode === 'performance' || deviceType === 'mobile') {
    return DragonBalls;
  } else if (performanceMode === 'balanced') {
    return PerformanceSVGDragonBalls;
  } else {
    return EnhancedSVGDragonBalls;
  }
}