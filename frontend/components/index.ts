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

// Dragon Component Parts
export { DragonCore } from './dragon/parts/DragonCore';
export { DragonEyes } from './dragon/parts/DragonEyes';
export { DragonBall } from './dragon/parts/DragonBall';
export { DragonBallOrbit } from './dragon/parts/DragonBallOrbit';

// Dragon Effects
export { DragonAura } from './dragon/effects/DragonAura';
export { DragonBreath } from './dragon/effects/DragonBreath';
export { ParticleSystem } from './dragon/effects/ParticleSystem';
export { PowerRings } from './dragon/effects/PowerRings';
export { InteractionFeedback } from './dragon/effects/InteractionFeedback';

// Dragon Containers & Presentations
export { InteractiveDragonContainer } from './containers/InteractiveDragonContainer';
export { InteractiveDragonPresentation } from './dragon/InteractiveDragonPresentation';

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

// Chat Components
export { VoiceEnabledChat } from './chat/VoiceEnabledChat';

// Chat Component Parts
export { ChatStatusBar } from './chat/parts/ChatStatusBar';
export { ChatMessage } from './chat/parts/ChatMessage';
export { TypingIndicator } from './chat/parts/TypingIndicator';
export { VoiceTranscriptPreview } from './chat/parts/VoiceTranscriptPreview';
export { ChatInput } from './chat/parts/ChatInput';

// Chat Sections
export { MessagesArea } from './chat/sections/MessagesArea';
export { VoiceSection } from './chat/sections/VoiceSection';

// Chat Containers & Presentations
export { VoiceEnabledChatContainer } from './containers/VoiceEnabledChatContainer';
export { VoiceEnabledChatPresentation } from './chat/VoiceEnabledChatPresentation';

// Transaction Components
export { TransactionPreview } from './transactions/TransactionPreview';

// Transaction Component Parts
export { TransactionHeader } from './transactions/parts/TransactionHeader';
export { TokenFlow } from './transactions/parts/TokenFlow';
export { KeyMetrics } from './transactions/parts/KeyMetrics';

// Transaction Sections
export { TransactionDetails } from './transactions/sections/TransactionDetails';

// Transaction Types
export type { TransactionPreviewData, TokenAmount, ProtocolInfo } from './transactions/TransactionPreview';

// Shared UI Components
export * from './ui';

// Dragon Types
export type {
  DragonState,
  DragonMood,
  EnhancedDragonCharacterProps,
  DragonAnimationConfig,
  PerformanceMode
} from './dragon';

export type { InteractiveDragonProps } from './dragon/InteractiveDragon';

// Existing Components
export { WalletConnect } from './wallet/wallet-connect';
export { Providers } from './providers';