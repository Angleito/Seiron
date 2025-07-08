import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { getTokenManager, AuthTokens, login as tokenLogin, logout as tokenLogout, isAuthenticated as checkAuth } from '../lib/auth/tokenManager'
import { createApiClient } from '../lib/auth/authInterceptor'
import { logger } from '../lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string
  email: string
  walletAddress?: string
  role: 'user' | 'admin'
  createdAt?: string
  updatedAt?: string
}

export interface LoginCredentials {
  email?: string
  walletAddress?: string
  password?: string
  signature?: string
}

export interface RegisterData {
  email?: string
  walletAddress?: string
  password?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<E.Either<Error, User>>
  register: (data: RegisterData) => Promise<E.Either<Error, User>>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

// ============================================================================
// Auth Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ============================================================================
// Auth Provider
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  const apiClient = createApiClient('/api')
  const tokenManager = getTokenManager()

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    initializeAuth()
  }, [])

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      const authenticated = await checkAuth()
      
      if (authenticated) {
        // Try to get current user
        const user = await tokenManager.getUser<User>()
        
        if (O.isSome(user)) {
          setState({
            user: user.value,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } else {
          // Fetch user from API
          await refreshAuth()
        }
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      }
    } catch (error) {
      logger.error('Auth initialization failed', { error })
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      })
    }
  }

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<E.Either<Error, User>> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await apiClient.post<{
        user: User
        tokens: AuthTokens
      }>('/auth/login', credentials)

      // Store tokens and user
      const loginResult = await tokenLogin(response.tokens, response.user)
      
      if (E.isLeft(loginResult)) {
        throw new Error('Failed to store authentication data')
      }

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      logger.info('User logged in', { userId: response.user.id, email: response.user.email })

      return E.right(response.user)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      logger.error('Login failed', { error })
      
      return E.left(new Error(errorMessage))
    }
  }, [apiClient])

  /**
   * Register user
   */
  const register = useCallback(async (data: RegisterData): Promise<E.Either<Error, User>> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await apiClient.post<{
        user: User
        tokens: AuthTokens
      }>('/auth/register', data)

      // Store tokens and user
      const loginResult = await tokenLogin(response.tokens, response.user)
      
      if (E.isLeft(loginResult)) {
        throw new Error('Failed to store authentication data')
      }

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      logger.info('User registered', { userId: response.user.id, email: response.user.email })

      return E.right(response.user)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      logger.error('Registration failed', { error })
      
      return E.left(new Error(errorMessage))
    }
  }, [apiClient])

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      // Call logout endpoint (optional, for server-side cleanup)
      try {
        await apiClient.post('/auth/logout')
      } catch (error) {
        // Ignore logout endpoint errors
        logger.warn('Logout endpoint failed', { error })
      }

      // Clear tokens and user data
      await tokenLogout()

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })

      logger.info('User logged out')
    } catch (error) {
      logger.error('Logout failed', { error })
      
      // Force logout even on error
      await tokenLogout()
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Logout failed',
      })
    }
  }, [apiClient])

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me')
      
      // Update user in storage
      await tokenManager.setUser(response.user)

      setState(prev => ({
        ...prev,
        user: response.user,
        isAuthenticated: true,
        error: null,
      }))

      logger.info('Auth refreshed', { userId: response.user.id })
    } catch (error) {
      logger.error('Auth refresh failed', { error })
      
      // If refresh fails, logout
      await logout()
    }
  }, [apiClient, logout, tokenManager])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const contextValue: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// ============================================================================
// Auth Hook
// ============================================================================

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// ============================================================================
// Auth Guards
// ============================================================================

export interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAdmin?: boolean
}

/**
 * Component that only renders children if user is authenticated
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = null,
  requireAdmin = false 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component that only renders children if user is NOT authenticated
 */
export const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if user has a specific role
 */
export const useHasRole = (role: string): boolean => {
  const { user } = useAuth()
  return user?.role === role
}

/**
 * Hook to check if user is admin
 */
export const useIsAdmin = (): boolean => {
  return useHasRole('admin')
}

/**
 * Hook to get current user
 */
export const useCurrentUser = (): User | null => {
  const { user } = useAuth()
  return user
}