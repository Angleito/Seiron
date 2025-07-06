// Simple Dragon Components
export { default as SeiroonLogo } from './SeiroonLogo';
export { default as MysticalBackground } from './MysticalBackground';
export { default as SeiroonDemo } from './SeiroonDemo';
export { default as EnhancedDragonCharacter } from './EnhancedDragonCharacter';
export { default as SimpleDragonSprite } from './SimpleDragonSprite';

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

// Dragon Components - Complete dragon component suite
export { 
  Dragon3D, 
  Dragon3DExample, 
  Dragon3DIntegrationGuide,
  ASCIIDragon, 
  ASCIIDragonExample,
  DragonRenderer, 
  DragonRendererExample,
  dragonUtils,
  useDragonRenderer
} from './dragon';

// Dragon Component Types
export type { 
  Dragon3DProps, 
  ASCIIDragonProps, 
  DragonRendererProps, 
  DragonType, 
  VoiceAnimationState, 
  DragonPerformanceMetrics 
} from './dragon';

// Dragon Types - simplified
export type { SimpleDragonSpriteProps } from './SimpleDragonSprite';

// Voice Integration Components - Complete voice and dragon integration suite
export * from './voice';

// Voice Component Types
export type {
  VoiceInterfaceProps,
  VoiceInterfaceState,
  VoiceDragonDemoProps,
  VoiceDragonIntegrationExampleProps
} from './voice';

// Utility functions and helpers
export * from '../utils';

// Existing Components
export { WalletConnect } from './wallet/wallet-connect';
export { Providers } from './providers';