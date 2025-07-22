import { getCookie } from './cookies';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  skipCSRF?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get CSRF token from cookie or fetch from server
   */
  private async getCSRFToken(): Promise<string> {
    // Try to get from cookie first
    const tokenFromCookie = getCookie('csrf-token');
    if (tokenFromCookie) {
      this.csrfToken = tokenFromCookie;
      return tokenFromCookie;
    }

    // If not in cookie, make a request to get one
    try {
      await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      // Token should now be in cookie
      const newToken = getCookie('csrf-token');
      if (newToken) {
        this.csrfToken = newToken;
        return newToken;
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }

    throw new Error('Unable to get CSRF token');
  }

  /**
   * Make an API request with automatic auth and CSRF handling
   */
  async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      skipCSRF = false,
      headers = {},
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const method = fetchOptions.method || 'GET';
    
    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add CSRF token for state-changing requests
    if (!skipCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      try {
        const csrfToken = await this.getCSRFToken();
        requestHeaders['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.error('CSRF token error:', error);
        // Continue without CSRF token in development
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }
    }

    // Make the request
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: 'include', // Include cookies
    });

    // Handle response
    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    // Parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    // Return response for non-JSON responses (like audio files)
    return response as any;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<Error> {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData: any = {};

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.data = errorData;

    // Handle specific error cases
    if (response.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    } else if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get('Retry-After');
      error.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
    }

    return error;
  }

  // Convenience methods
  get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  patch<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Cookie helper function
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}

// Export singleton instance
export const api = new ApiClient('/api');

// Backend API client for direct backend communication
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
export const backendApi = new ApiClient(BACKEND_URL);

// Export class for custom instances
export { ApiClient };

// Type-safe API methods
export const authApi = {
  login: (credentials: { email: string; password?: string; privyToken?: string }) =>
    api.post<{ success: boolean; user: any }>('/auth/login', credentials),
    
  logout: () =>
    api.post<{ success: boolean }>('/auth/logout'),
    
  getSession: () =>
    api.get<{ authenticated: boolean; user?: any }>('/auth/session'),
};

export const portfolioApi = {
  get: (params?: { walletAddress?: string; includeHistory?: boolean; timeframe?: string }) =>
    api.get('/portfolio' + (params ? '?' + new URLSearchParams(params as any) : '')),
    
  update: (action: any) =>
    api.post('/portfolio', action),
};

export const aiApi = {
  chat: (messages: any[], options?: any) =>
    api.post('/ai/chat', { messages, ...options }),
    
  orchestrate: (params: {
    message: string;
    sessionId?: string;
    walletAddress?: string;
    messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  }) =>
    api.post('/chat/orchestrate', params, { skipCSRF: true }),
};

export const voiceApi = {
  synthesize: async (text: string, options?: any) => {
    const response = await api.post('/voice/synthesize', { text, ...options }, {
      headers: {
        'Accept': 'audio/mpeg',
      },
    });
    
    // Convert response to blob for audio playback
    if (response instanceof Response) {
      return response.blob();
    }
    return response;
  },
  
  getVoices: () =>
    api.get<{ voices: any[] }>('/voice/synthesize'),
};

// Secure backend API methods - bypassing frontend API routes
export const secureBackendApi = {
  chat: {
    orchestrate: (params: {
      message: string;
      sessionId: string;
      walletAddress?: string;
      messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: string }>;
      requiresBlockchainData?: boolean;
    }) =>
      backendApi.post<{
        success: boolean;
        data: {
          message: string;
          actions: any[];
          metadata: any;
          persistence?: any;
        };
      }>('/api/chat/orchestrate-v2', params, { skipCSRF: true }),
    
    message: (params: {
      message: string;
      walletAddress: string;
    }) =>
      backendApi.post<{
        success: boolean;
        data: any;
      }>('/api/chat/message', params, { skipCSRF: true }),
    
    history: (walletAddress: string, page = 1, pageSize = 50) =>
      backendApi.get<{
        success: boolean;
        data: any[];
        pagination: any;
      }>(`/api/chat/history?walletAddress=${encodeURIComponent(walletAddress)}&page=${page}&pageSize=${pageSize}`, { skipCSRF: true }),
  },
  
  portfolio: {
    get: (walletAddress: string) =>
      backendApi.get<{
        success: boolean;
        data: any;
      }>(`/api/portfolio?walletAddress=${encodeURIComponent(walletAddress)}`, { skipCSRF: true }),
  },
  
  health: () =>
    backendApi.get<{
      status: string;
      timestamp: string;
    }>('/health', { skipCSRF: true }),
};