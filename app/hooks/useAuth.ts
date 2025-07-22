import { useCallback, useEffect } from 'react';
import { useAuthStore, type User } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    walletConnected,
    privyUser,
    login,
    logout,
    setWalletConnected,
    setPrivyUser,
    setLoading,
    setError,
  } = useAuthStore();
  
  const { addNotification } = useUIStore();
  
  // Enhanced login with notifications
  const loginWithNotification = useCallback(async (userData: User) => {
    try {
      setLoading(true);
      login(userData);
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Logged in as ${userData.email || userData.walletAddress}`,
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Login failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [login, setLoading, setError, addNotification]);
  
  // Enhanced logout with cleanup
  const logoutWithCleanup = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear auth token cookie if exists
      if (typeof window !== 'undefined') {
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      
      logout();
      
      addNotification({
        type: 'info',
        title: 'Logged out',
        message: 'You have been successfully logged out',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Logout failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [logout, setLoading, setError, addNotification]);
  
  // Connect wallet helper
  const connectWallet = useCallback(async (walletAddress: string) => {
    try {
      setLoading(true);
      setWalletConnected(true);
      
      // If user exists, update wallet address
      if (user) {
        login({ ...user, walletAddress });
      } else {
        // Create new user with wallet
        login({
          id: walletAddress,
          walletAddress,
        });
      }
      
      addNotification({
        type: 'success',
        title: 'Wallet connected',
        message: `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Connection failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [user, login, setWalletConnected, setLoading, setError, addNotification]);
  
  // Disconnect wallet helper
  const disconnectWallet = useCallback(() => {
    setWalletConnected(false);
    if (user?.walletAddress) {
      login({ ...user, walletAddress: undefined });
    }
    
    addNotification({
      type: 'info',
      title: 'Wallet disconnected',
      duration: 3000,
    });
  }, [user, login, setWalletConnected, addNotification]);
  
  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    walletConnected,
    privyUser,
    
    // Actions
    login: loginWithNotification,
    logout: logoutWithCleanup,
    connectWallet,
    disconnectWallet,
    setPrivyUser,
    setLoading,
    setError,
    
    // Computed
    isReady: !isLoading && typeof window !== 'undefined',
    hasWallet: !!user?.walletAddress,
  };
}