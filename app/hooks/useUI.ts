import { useCallback, useEffect } from 'react';
import { useUIStore, useModal, useNotifications, useLoadingState } from '../stores/uiStore';

// Re-export store hooks
export { useModal, useNotifications, useLoadingState };

export function useUI() {
  const uiStore = useUIStore();
  
  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    if (savedTheme) {
      uiStore.setTheme(savedTheme);
    } else {
      // Apply system theme by default
      uiStore.setTheme('system');
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (uiStore.theme === 'system') {
        uiStore.setTheme('system'); // Re-apply to update classes
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Enhanced theme setter that persists to localStorage
  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    uiStore.setTheme(theme);
    localStorage.setItem('theme', theme);
  }, [uiStore]);
  
  // Keyboard shortcuts for sidebar
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        uiStore.toggleSidebar();
      }
      
      // Escape to close modal
      if (e.key === 'Escape' && uiStore.modal.type) {
        uiStore.closeModal();
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [uiStore]);
  
  // Global loading helper
  const withLoading = useCallback(async <T,>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    try {
      uiStore.setLoading(key, true);
      return await fn();
    } finally {
      uiStore.setLoading(key, false);
    }
  }, [uiStore]);
  
  // Batch notifications helper
  const showNotifications = useCallback((
    notifications: Array<{
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message?: string;
      duration?: number;
    }>
  ) => {
    notifications.forEach((notification, index) => {
      // Stagger notifications to avoid overlap
      setTimeout(() => {
        uiStore.addNotification(notification);
      }, index * 100);
    });
  }, [uiStore]);
  
  // Check if any loading state is active
  const isAnyLoading = Object.values(uiStore.loading).some(Boolean);
  
  // Get active loading keys
  const activeLoadingKeys = Object.entries(uiStore.loading)
    .filter(([_, isLoading]) => isLoading)
    .map(([key]) => key);
  
  return {
    // State
    ...uiStore,
    
    // Enhanced actions
    setTheme,
    withLoading,
    showNotifications,
    
    // Computed
    isAnyLoading,
    activeLoadingKeys,
    currentTheme: uiStore.theme === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : uiStore.theme,
  };
}

// Convenience hook for responsive design
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);
  
  return matches;
}

// Import useState for useMediaQuery
import { useState } from 'react';