import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ModalType = 
  | 'wallet-connect'
  | 'transaction-confirm'
  | 'portfolio-details'
  | 'settings'
  | 'error'
  | null;

export interface Modal {
  type: ModalType;
  data?: any;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds
  timestamp: Date;
}

export interface LoadingState {
  global: boolean;
  portfolio: boolean;
  chat: boolean;
  transactions: boolean;
  [key: string]: boolean; // Allow dynamic loading states
}

export interface UIState {
  // State
  modal: Modal;
  notifications: Notification[];
  loading: LoadingState;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Modal Actions
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading Actions
  setLoading: (key: keyof LoadingState | string, value: boolean) => void;
  setMultipleLoading: (updates: Partial<LoadingState>) => void;
  
  // UI Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Utility Actions
  reset: () => void;
}

const initialState = {
  modal: { type: null as ModalType, data: undefined },
  notifications: [] as Notification[],
  loading: {
    global: false,
    portfolio: false,
    chat: false,
    transactions: false,
  },
  sidebarOpen: true,
  theme: 'system' as const,
};

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useUIStore = create<UIState>()(
  immer((set) => ({
    ...initialState,
    
    openModal: (type, data) => set((state) => {
      state.modal = { type, data };
    }),
    
    closeModal: () => set((state) => {
      state.modal = { type: null, data: undefined };
    }),
    
    addNotification: (notification) => set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date(),
      };
      
      state.notifications.push(newNotification);
      
      // Auto-remove notification after duration
      if (notification.duration) {
        setTimeout(() => {
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== newNotification.id);
          });
        }, notification.duration);
      }
    }),
    
    removeNotification: (id) => set((state) => {
      state.notifications = state.notifications.filter(n => n.id !== id);
    }),
    
    clearNotifications: () => set((state) => {
      state.notifications = [];
    }),
    
    setLoading: (key, value) => set((state) => {
      state.loading[key] = value;
    }),
    
    setMultipleLoading: (updates) => set((state) => {
      Object.assign(state.loading, updates);
    }),
    
    toggleSidebar: () => set((state) => {
      state.sidebarOpen = !state.sidebarOpen;
    }),
    
    setSidebarOpen: (open) => set((state) => {
      state.sidebarOpen = open;
    }),
    
    setTheme: (theme) => set((state) => {
      state.theme = theme;
      
      // Apply theme to document
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      }
    }),
    
    reset: () => set(() => initialState),
  }))
);

// Helper hooks for common UI patterns
export const useModal = (modalType: ModalType) => {
  const { modal, openModal, closeModal } = useUIStore();
  const isOpen = modal.type === modalType;
  
  return {
    isOpen,
    data: isOpen ? modal.data : undefined,
    open: (data?: any) => openModal(modalType, data),
    close: closeModal,
  };
};

export const useNotifications = () => {
  const { addNotification, removeNotification, clearNotifications } = useUIStore();
  
  return {
    success: (title: string, message?: string, duration = 5000) => 
      addNotification({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration = 7000) => 
      addNotification({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration = 6000) => 
      addNotification({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration = 5000) => 
      addNotification({ type: 'info', title, message, duration }),
    remove: removeNotification,
    clear: clearNotifications,
  };
};

export const useLoadingState = (key: keyof LoadingState | string) => {
  const loading = useUIStore((state) => state.loading[key] || false);
  const setLoading = useUIStore((state) => state.setLoading);
  
  return [loading, (value: boolean) => setLoading(key, value)] as const;
};