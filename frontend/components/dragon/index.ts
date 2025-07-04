// Dragon Animation Components
export { FloatingDragonLogo } from '../FloatingDragonLogo'
export { CirclingDragonBalls } from '../CirclingDragonBalls'
export { default as DragonLoader } from '../DragonLoader'
export { DragonBallProgress } from '../DragonBallProgress'

// Responsive Components
export { ResponsiveDragonAnimation } from '../ResponsiveDragonAnimation'
export { AccessibleDragonAnimation } from '../AccessibleDragonAnimation'
export { DragonAnimationDemo } from '../DragonAnimationDemo'

// Hooks
export { useResponsive, getResponsiveValue, BREAKPOINTS } from '@/hooks/useResponsive'
export type { Breakpoint } from '@/hooks/useResponsive'

export { useDragonGestures } from '@/hooks/useDragonGestures'
export type { GestureState } from '@/hooks/useDragonGestures'

export { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'

// Types
export interface DragonAnimationConfig {
  responsive: {
    breakpoints?: Record<string, number>
    scalingFactor?: number
    autoScale?: boolean
  }
  performance: {
    targetFPS?: number
    autoQuality?: boolean
    maxParticles?: number
    enableMonitoring?: boolean
  }
  accessibility: {
    announceAll?: boolean
    reducedMotionFallback?: 'static' | 'simple' | 'none'
    highContrastMode?: 'auto' | 'always' | 'never'
  }
  touch: {
    minSwipeDistance?: number
    longPressDelay?: number
    enableMultiTouch?: boolean
  }
}

// Default configuration
export const defaultDragonConfig: DragonAnimationConfig = {
  responsive: {
    scalingFactor: 1.0,
    autoScale: true
  },
  performance: {
    targetFPS: 60,
    autoQuality: true,
    maxParticles: 10,
    enableMonitoring: false
  },
  accessibility: {
    announceAll: true,
    reducedMotionFallback: 'simple',
    highContrastMode: 'auto'
  },
  touch: {
    minSwipeDistance: 50,
    longPressDelay: 500,
    enableMultiTouch: true
  }
}