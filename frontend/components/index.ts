// Mystical Seiron Dragon Components
export { default as DragonLoader } from './DragonLoader';
export { default as SeiroonLogo } from './SeiroonLogo';
export { default as MysticalBackground } from './MysticalBackground';
export { default as DragonBallProgress } from './DragonBallProgress';
export { default as SeiroonDemo } from './SeiroonDemo';
export { FloatingDragonLogo } from './FloatingDragonLogo';
export { CirclingDragonBalls } from './CirclingDragonBalls';

// Interactive Dragon Components
export { InteractiveDragon } from './dragon/InteractiveDragon';
export { DragonInteractionProvider, useDragonInteraction } from './dragon/DragonInteractionController';

// Enhanced Dragon Animation System
export {
  EnhancedDragonCharacter,
  DragonPresets,
  createDragonConfig,
  getOptimalDragonConfig,
  detectDeviceType,
  useDragonStateMachine,
  useMouseTracking,
  useTouchGestures,
  useAnimationPerformance,
  performanceUtils
} from './dragon';

export { DragonShowcase } from './dragon/DragonShowcase';

// Dragon Types
export type {
  DragonState,
  DragonMood,
  EnhancedDragonCharacterProps,
  DragonAnimationConfig,
  PerformanceMode
} from './dragon';

// Seiron Sprite System (removed - files deleted)

// Existing Components
export { WalletConnect } from './wallet/wallet-connect';
export { Providers } from './providers';