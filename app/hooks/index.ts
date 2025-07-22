// Export all hooks from a single entry point
export { useAuth } from './useAuth';
export { usePortfolio } from './usePortfolio';
export { useChat } from './useChat';
export { useUI, useModal, useNotifications, useLoadingState, useMediaQuery } from './useUI';

// Export store hooks for direct access if needed
export { useAuthStore } from '../stores/authStore';
export { usePortfolioStore } from '../stores/portfolioStore';
export { useChatStore } from '../stores/chatStore';
export { useUIStore } from '../stores/uiStore';
export { useRootStore, resetAllStores, hydrateStores } from '../stores/rootStore';

// Export types
export type { User, AuthState } from '../stores/authStore';
export type { 
  Position, 
  Transaction, 
  MarketData, 
  PortfolioStats, 
  PortfolioState 
} from '../stores/portfolioStore';
export type { 
  Message, 
  ChatSession, 
  VoiceState, 
  AIState, 
  ChatState 
} from '../stores/chatStore';
export type { 
  ModalType, 
  Modal, 
  NotificationType, 
  Notification, 
  LoadingState, 
  UIState 
} from '../stores/uiStore';
export type { RootStore } from '../stores/rootStore';