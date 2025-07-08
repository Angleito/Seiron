import { getTokenManager } from './tokenManager'
import { fetchWithLogging } from '../interceptors'
import { logger } from '../logger'
import * as O from 'fp-ts/Option'

// ============================================================================
// Types
// ============================================================================

export interface AuthInterceptorConfig {
  enableAuth?: boolean
  enableLogging?: boolean
  excludePaths?: string[]
  refreshOnUnauthorized?: boolean
  onUnauthorized?: () => void
}

const DEFAULT_CONFIG: Required<AuthInterceptorConfig> = {
  enableAuth: true,
  enableLogging: true,
  excludePaths: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
  refreshOnUnauthorized: true,
  onUnauthorized: () => {},
}

// ============================================================================
// Auth Interceptor
// ============================================================================

/**
 * Create fetch function with automatic JWT authentication
 */
export function createAuthenticatedFetch(config: AuthInterceptorConfig = {}): typeof fetch {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const tokenManager = getTokenManager()

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    
    // Check if URL should be excluded from auth
    const shouldExclude = finalConfig.excludePaths.some(path => url.includes(path))
    
    let options = init || {}

    // Add auth header if not excluded
    if (finalConfig.enableAuth && !shouldExclude) {
      const token = await tokenManager.getAccessToken()
      
      if (O.isSome(token)) {
        options = {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token.value}`,
          },
        }
        
        logger.debug('Added auth header to request', { url })
      } else {
        logger.warn('No auth token available for request', { url })
      }
    }

    // Use logging interceptor if enabled
    const fetchFn = finalConfig.enableLogging ? fetchWithLogging : fetch
    
    try {
      const response = await fetchFn(url, options, 'AUTH_REQUEST')
      
      // Handle 401 Unauthorized
      if (response.status === 401 && finalConfig.refreshOnUnauthorized && !shouldExclude) {
        logger.info('Received 401, attempting token refresh', { url })
        
        // Try to refresh token
        const refreshResult = await tokenManager.refreshToken()
        
        if (refreshResult._tag === 'Right') {
          // Retry request with new token
          const newToken = await tokenManager.getAccessToken()
          
          if (O.isSome(newToken)) {
            options = {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${newToken.value}`,
              },
            }
            
            logger.info('Retrying request with refreshed token', { url })
            return fetchFn(url, options, 'AUTH_REQUEST_RETRY')
          }
        } else {
          logger.error('Token refresh failed', { error: refreshResult.left })
          finalConfig.onUnauthorized()
        }
      }
      
      return response
    } catch (error) {
      logger.error('Authenticated request failed', { url, error })
      throw error
    }
  }
}

// ============================================================================
// Global Fetch Override
// ============================================================================

let originalFetch: typeof fetch | null = null

/**
 * Install global fetch interceptor with authentication
 */
export function installAuthInterceptor(config: AuthInterceptorConfig = {}): void {
  if (originalFetch) {
    logger.warn('Auth interceptor already installed')
    return
  }

  if (typeof window === 'undefined') {
    logger.warn('Auth interceptor can only be installed in browser environment')
    return
  }

  originalFetch = window.fetch
  window.fetch = createAuthenticatedFetch(config)
  
  logger.info('Auth interceptor installed globally')
}

/**
 * Uninstall global fetch interceptor
 */
export function uninstallAuthInterceptor(): void {
  if (!originalFetch) {
    logger.warn('Auth interceptor not installed')
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  window.fetch = originalFetch
  originalFetch = null
  
  logger.info('Auth interceptor uninstalled')
}

// ============================================================================
// API Client Factory
// ============================================================================

/**
 * Create an API client with built-in authentication
 */
export class AuthenticatedApiClient {
  private fetch: typeof fetch
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    config: AuthInterceptorConfig = {}
  ) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    }
    this.fetch = createAuthenticatedFetch(config)
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await this.fetch(url, {
      method,
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `${method} ${endpoint} failed`)
    }

    // Handle empty responses
    const text = await response.text()
    return text ? JSON.parse(text) : null as T
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, { headers })
  }

  async post<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('POST', endpoint, {
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, {
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', endpoint, { headers })
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create default authenticated API client
 */
export function createApiClient(
  baseUrl: string = '/api',
  config?: AuthInterceptorConfig
): AuthenticatedApiClient {
  return new AuthenticatedApiClient(baseUrl, {}, config)
}

/**
 * Default authenticated fetch instance
 */
export const authFetch = createAuthenticatedFetch()