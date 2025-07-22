// Export all stores from a single entry point
export { useAuthStore } from './authStore';
export { usePortfolioStore } from './portfolioStore';
export { useChatStore } from './chatStore';
export { useUIStore, useModal, useNotifications, useLoadingState } from './uiStore';
export { useRootStore, resetAllStores, hydrateStores } from './rootStore';

// Export all types
export type { User, AuthState } from './authStore';
export type { 
  Position, 
  Transaction, 
  MarketData, 
  PortfolioStats, 
  PortfolioState 
} from './portfolioStore';
export type { 
  Message, 
  ChatSession, 
  VoiceState, 
  AIState, 
  ChatState 
} from './chatStore';
export type { 
  ModalType, 
  Modal, 
  NotificationType, 
  Notification, 
  LoadingState, 
  UIState 
} from './uiStore';
export type { RootStore } from './rootStore';