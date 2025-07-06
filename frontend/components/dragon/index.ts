// Dragon Components - Core components for 3D and ASCII dragon rendering
export { default as Dragon3D } from './Dragon3D'
export { default as Dragon3DExample } from './Dragon3DExample'
export { default as Dragon3DIntegrationGuide } from './Dragon3DIntegrationGuide'
export { default as ASCIIDragon } from './ASCIIDragon'
export { default as ASCIIDragonExample } from './ASCIIDragonExample'
export { default as DragonRenderer } from './DragonRenderer'
export { default as DragonRendererExample } from './DragonRendererExample'

// Dragon Component Types
export type { Dragon3DProps } from './Dragon3D'
export type { ASCIIDragonProps } from './ASCIIDragon'
export type { 
  DragonRendererProps, 
  DragonType, 
  VoiceAnimationState, 
  DragonPerformanceMetrics 
} from './DragonRenderer'

// Dragon Utilities and Hooks
export { dragonUtils, useDragonRenderer } from './DragonRenderer'

// Lazy loading utilities
export * from './lazy'

// Component Documentation:
// - Dragon3D: WebGL-based 3D dragon with particle effects and voice integration
// - ASCIIDragon: ASCII art dragon with typewriter effects, breathing animations, and floating motion
// - DragonRenderer: Unified renderer component that supports both 3D and ASCII modes
// - See component-specific README files for detailed documentation and examples