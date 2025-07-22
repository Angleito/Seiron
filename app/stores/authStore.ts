import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  name?: string;
  avatar?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  walletConnected: boolean;
  privyUser: any | null; // Privy user object
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  setWalletConnected: (connected: boolean) => void;
  setPrivyUser: (privyUser: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  walletConnected: false,
  privyUser: null,
};

// Create store without persistence first (for SSR safety)
const useAuthStoreBase = create<AuthState>()(
  immer((set) => ({
    ...initialState,
    
    login: (user) => set((state) => {
      state.user = user;
      state.isAuthenticated = true;
      state.error = null;
    }),
    
    logout: () => set((state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.walletConnected = false;
      state.privyUser = null;
      state.error = null;
    }),
    
    setWalletConnected: (connected) => set((state) => {
      state.walletConnected = connected;
    }),
    
    setPrivyUser: (privyUser) => set((state) => {
      state.privyUser = privyUser;
    }),
    
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
    }),
    
    reset: () => set(() => initialState),
  }))
);

// Create persisted version for client-side only
export const useAuthStore = typeof window !== 'undefined'
  ? create<AuthState>()(
      persist(
        immer((set) => ({
          ...initialState,
          
          login: (user) => set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.error = null;
          }),
          
          logout: () => set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.walletConnected = false;
            state.privyUser = null;
            state.error = null;
          }),
          
          setWalletConnected: (connected) => set((state) => {
            state.walletConnected = connected;
          }),
          
          setPrivyUser: (privyUser) => set((state) => {
            state.privyUser = privyUser;
          }),
          
          setLoading: (loading) => set((state) => {
            state.isLoading = loading;
          }),
          
          setError: (error) => set((state) => {
            state.error = error;
          }),
          
          reset: () => set(() => initialState),
        })),
        {
          name: 'auth-storage',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
            walletConnected: state.walletConnected,
          }),
        }
      )
    )
  : useAuthStoreBase;