import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { secureLocalStorage, secureSessionStorage } from '../security/secureStorage'
import { logger } from '../logger'

// ============================================================================
// Types
// ============================================================================

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: number
}

export interface TokenPayload {
  userId: string
  email: string
  walletAddress?: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

export interface TokenManagerConfig {
  tokenKey: string
  refreshTokenKey: string
  userKey: string
  persistTokens: boolean
  autoRefresh: boolean
  refreshBuffer: number // seconds before expiry to refresh
}

export class TokenError extends Error {
  constructor(
    message: string,
    public code: 'TOKEN_MISSING' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'REFRESH_FAILED'
  ) {
    super(message)
    this.name = 'TokenError'
  }
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: TokenManagerConfig = {
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token',
  userKey: 'auth_user',
  persistTokens: true,
  autoRefresh: true,
  refreshBuffer: 300, // 5 minutes
}

// ============================================================================
// Token Manager
// ============================================================================

export class TokenManager {
  private config: TokenManagerConfig
  private storage
  private refreshTimer?: NodeJS.Timeout
  private refreshPromise?: Promise<E.Either<TokenError, AuthTokens>>

  constructor(config: Partial<TokenManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.storage = this.config.persistTokens ? secureLocalStorage : secureSessionStorage
  }

  /**
   * Store tokens securely
   */
  async setTokens(tokens: AuthTokens): Promise<E.Either<Error, void>> {
    try {
      // Calculate expiration time
      const expiresAt = Date.now() + (tokens.expiresIn * 1000)
      const tokensWithExpiry = { ...tokens, expiresAt }

      // Store tokens
      const results = await Promise.all([
        this.storage.setItem(this.config.tokenKey, tokensWithExpiry.accessToken),
        this.storage.setItem(this.config.refreshTokenKey, tokensWithExpiry.refreshToken),
        this.storage.setItem(`${this.config.tokenKey}_data`, tokensWithExpiry)
      ])

      const errors = results.filter(E.isLeft)
      if (errors.length > 0) {
        return E.left(new Error('Failed to store tokens'))
      }

      // Setup auto-refresh if enabled
      if (this.config.autoRefresh) {
        this.setupAutoRefresh(tokensWithExpiry)
      }

      logger.info('Tokens stored successfully')
      return E.right(void 0)
    } catch (error) {
      logger.error('Failed to store tokens', { error })
      return E.left(new Error('Failed to store tokens'))
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<O.Option<string>> {
    const token = await this.storage.getItem<string>(this.config.tokenKey)
    
    if (O.isNone(token)) {
      return O.none
    }

    // Check if token is expired
    const tokenData = await this.storage.getItem<AuthTokens>(`${this.config.tokenKey}_data`)
    if (O.isSome(tokenData) && tokenData.value.expiresAt) {
      if (Date.now() >= tokenData.value.expiresAt) {
        logger.warn('Access token expired')
        
        // Try to refresh if we have a refresh token
        if (this.config.autoRefresh) {
          const refreshResult = await this.refreshToken()
          if (E.isRight(refreshResult)) {
            return O.some(refreshResult.right.accessToken)
          }
        }
        
        return O.none
      }
    }

    return token
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<O.Option<string>> {
    return this.storage.getItem<string>(this.config.refreshTokenKey)
  }

  /**
   * Get token data
   */
  async getTokenData(): Promise<O.Option<AuthTokens>> {
    return this.storage.getItem<AuthTokens>(`${this.config.tokenKey}_data`)
  }

  /**
   * Decode token payload (without verification)
   */
  decodeToken(token: string): O.Option<TokenPayload> {
    try {
      const parts = token.split('.')
      if (parts.length !== 3 || !parts[1]) {
        return O.none
      }

      // Use safe base64 decoding that works in both browser and Node.js
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const decoded = typeof window !== 'undefined' && typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8')
      
      const payload = JSON.parse(decoded)
      return O.some(payload)
    } catch (error) {
      logger.error('Failed to decode token', { error })
      return O.none
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (O.isNone(payload)) {
      return true
    }

    const exp = payload.value.exp
    if (!exp) {
      return false
    }

    return Date.now() >= exp * 1000
  }

  /**
   * Get time until token expiry (in seconds)
   */
  getTimeUntilExpiry(token: string): number {
    const payload = this.decodeToken(token)
    if (O.isNone(payload) || !payload.value.exp) {
      return 0
    }

    const now = Date.now() / 1000
    return Math.max(0, payload.value.exp - now)
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    this.clearAutoRefresh()
    
    await Promise.all([
      this.storage.removeItem(this.config.tokenKey),
      this.storage.removeItem(this.config.refreshTokenKey),
      this.storage.removeItem(`${this.config.tokenKey}_data`),
      this.storage.removeItem(this.config.userKey)
    ])

    logger.info('Tokens cleared')
  }

  /**
   * Store user data
   */
  async setUser(user: any): Promise<E.Either<Error, void>> {
    return this.storage.setItem(this.config.userKey, user)
  }

  /**
   * Get user data
   */
  async getUser<T = any>(): Promise<O.Option<T>> {
    return this.storage.getItem<T>(this.config.userKey)
  }

  /**
   * Setup auto-refresh
   */
  private setupAutoRefresh(tokens: AuthTokens): void {
    this.clearAutoRefresh()

    if (!tokens.expiresAt) {
      return
    }

    const timeUntilRefresh = Math.max(
      0,
      tokens.expiresAt - Date.now() - (this.config.refreshBuffer * 1000)
    )

    logger.info('Setting up auto-refresh', { 
      timeUntilRefresh: timeUntilRefresh / 1000,
      expiresAt: new Date(tokens.expiresAt).toISOString()
    })

    this.refreshTimer = setTimeout(() => {
      logger.info('Auto-refreshing token')
      this.refreshToken()
    }, timeUntilRefresh)
  }

  /**
   * Clear auto-refresh timer
   */
  private clearAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<E.Either<TokenError, AuthTokens>> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.doRefreshToken()
    const result = await this.refreshPromise
    this.refreshPromise = undefined

    return result
  }

  /**
   * Perform token refresh
   */
  private async doRefreshToken(): Promise<E.Either<TokenError, AuthTokens>> {
    try {
      const refreshToken = await this.getRefreshToken()
      
      if (O.isNone(refreshToken)) {
        return E.left(new TokenError('No refresh token available', 'TOKEN_MISSING'))
      }

      // Call refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      })

      if (!response.ok) {
        const error = await response.json()
        logger.error('Token refresh failed', { error })
        return E.left(new TokenError(error.message || 'Refresh failed', 'REFRESH_FAILED'))
      }

      const data = await response.json()
      const tokens = data.tokens as AuthTokens

      // Store new tokens
      const storeResult = await this.setTokens(tokens)
      if (E.isLeft(storeResult)) {
        return E.left(new TokenError('Failed to store refreshed tokens', 'REFRESH_FAILED'))
      }

      logger.info('Token refreshed successfully')
      return E.right(tokens)
    } catch (error) {
      logger.error('Token refresh error', { error })
      return E.left(new TokenError('Token refresh failed', 'REFRESH_FAILED'))
    }
  }

  /**
   * Add auth header to request options
   */
  async addAuthHeader(options: RequestInit = {}): Promise<RequestInit> {
    const token = await this.getAccessToken()
    
    if (O.isNone(token)) {
      return options
    }

    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token.value}`,
      },
    }
  }

  /**
   * Create authenticated fetch function
   */
  createAuthenticatedFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const options = await this.addAuthHeader(init)
      return fetch(input, options)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tokenManagerInstance: TokenManager | null = null

export function getTokenManager(config?: Partial<TokenManagerConfig>): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager(config)
  }
  return tokenManagerInstance
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokenManager = getTokenManager()
  const token = await tokenManager.getAccessToken()
  return O.isSome(token)
}

/**
 * Get current user
 */
export async function getCurrentUser<T = any>(): Promise<O.Option<T>> {
  const tokenManager = getTokenManager()
  return tokenManager.getUser<T>()
}

/**
 * Login user and store tokens
 */
export async function login(tokens: AuthTokens, user?: any): Promise<E.Either<Error, void>> {
  const tokenManager = getTokenManager()
  
  const tokenResult = await tokenManager.setTokens(tokens)
  if (E.isLeft(tokenResult)) {
    return tokenResult
  }

  if (user) {
    const userResult = await tokenManager.setUser(user)
    if (E.isLeft(userResult)) {
      return userResult
    }
  }

  return E.right(void 0)
}

/**
 * Logout user and clear tokens
 */
export async function logout(): Promise<void> {
  const tokenManager = getTokenManager()
  await tokenManager.clearTokens()
}