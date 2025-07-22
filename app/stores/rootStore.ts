import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { usePortfolioStore } from './portfolioStore';
import { useChatStore } from './chatStore';
import { useUIStore } from './uiStore';

// Root store that combines all stores for easy access
export interface RootStore {
  auth: ReturnType<typeof useAuthStore.getState>;
  portfolio: ReturnType<typeof usePortfolioStore.getState>;
  chat: ReturnType<typeof useChatStore.getState>;
  ui: ReturnType<typeof useUIStore.getState>;
}

// Create a combined store for debugging and DevTools
export const useRootStore = create<RootStore>()(
  devtools(
    () => ({
      auth: useAuthStore.getState(),
      portfolio: usePortfolioStore.getState(),
      chat: useChatStore.getState(),
      ui: useUIStore.getState(),
    }),
    {
      name: 'seiron-store',
    }
  )
);

// Subscribe to all stores and update root store
if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state) => {
    useRootStore.setState((prev) => ({ ...prev, auth: state }));
  });
  
  usePortfolioStore.subscribe((state) => {
    useRootStore.setState((prev) => ({ ...prev, portfolio: state }));
  });
  
  useChatStore.subscribe((state) => {
    useRootStore.setState((prev) => ({ ...prev, chat: state }));
  });
  
  useUIStore.subscribe((state) => {
    useRootStore.setState((prev) => ({ ...prev, ui: state }));
  });
}

// Global reset function
export const resetAllStores = () => {
  useAuthStore.getState().reset();
  usePortfolioStore.getState().reset();
  useChatStore.getState().reset();
  useUIStore.getState().reset();
};

// Hydration helper for SSR
export const hydrateStores = () => {
  if (typeof window === 'undefined') return;
  
  // Auth store will auto-hydrate from localStorage
  // Other stores can be hydrated from API calls or initial data
  
  // Example: Hydrate theme preference
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
  if (savedTheme) {
    useUIStore.getState().setTheme(savedTheme);
  }
};