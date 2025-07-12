// Dragon component exports
export { DragonRenderer } from './DragonRenderer'
export type { DragonRendererProps, VoiceAnimationState } from './DragonRenderer'
export { 
  SeironGLBDragon, 
  SeironGLBDragonWithErrorBoundary,
  SeironGLBDragonWithCanvas,
  SeironGLBDragonWithWebGLErrorBoundary,
  SeironGLBDragonWithModelManager
} from './SeironGLBDragon'
export { DragonFallbackTest } from './DragonFallbackTest'

// Enhanced GLTF loading components
export { DragonGLTFLoader } from './DragonGLTFLoader'
export { GLTFErrorBoundary, DragonGLTFErrorBoundary } from './GLTFErrorBoundary'
export { DragonModelManager, DEFAULT_MODELS } from './DragonModelManager'
export type { ModelConfig, ModelSwitchRequest } from './DragonModelManager'

// Re-export for backwards compatibility
export { DragonRenderer as default } from './DragonRenderer'