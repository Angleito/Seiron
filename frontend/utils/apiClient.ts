/**
 * Unified API Client for Frontend-Backend Communication
 * Handles both direct backend calls and Vercel API route proxies
 */

import { envConfig } from './envValidation';
import { handleApiError, shouldRetry, getRetryDelay } from './apiErrorHandler';

// API Client Configuration
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  fallbackToProxy?: boolean;
  enableStreaming?: boolean;
  preferNextAPI?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ApiClientConfig = {
  timeout: 10000,
  retries: 2,
  fallbackToProxy: true,
  enableStreaming: true,
  preferNextAPI: true,
};

// API Client Class
export class ApiClient {
  private config: ApiClientConfig;
  private backendUrl: string | null;
  private proxyUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Get backend URL from environment variable (client-side)
    this.backendUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL || null;
    
    // Proxy URL uses current domain (for Vercel API routes)
    this.proxyUrl = '';
    
    console.log('🔗 API Client initialized:', {
      backendUrl: this.backendUrl,
      proxyUrl: this.proxyUrl,
      fallbackEnabled: this.config.fallbackToProxy
    });
  }

  /**
   * Get the appropriate base URL for API calls
   */
  private getBaseUrl(): string {
    return this.backendUrl || this.proxyUrl;
  }

  /**
   * Make a request with automatic fallback
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if we should prefer Next.js API routes
    if (this.config.preferNextAPI && endpoint.startsWith('/api/')) {
      // Use Next.js API routes directly (no base URL needed)
      return this.requestWithFallback<T>(endpoint, options, '');
    }
    
    const baseUrl = this.getBaseUrl();
    return this.requestWithFallback<T>(endpoint, options, baseUrl);
  }

  /**
   * Make a request with fallback support
   */
  private async requestWithFallback<T>(
    endpoint: string,
    options: RequestInit = {},
    primaryBaseUrl: string
  ): Promise<T> {
    const url = `${primaryBaseUrl}${endpoint}`;

    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${url}`, error);
      
      // Use error handler
      const apiError = handleApiError(error, endpoint, {
        method: options.method,
        retryAttempt: 0,
        maxRetries: this.config.retries
      });
      
      // Implement fallback chain
      const fallbackUrl = this.determineFallbackUrl(endpoint, primaryBaseUrl);
      
      if (fallbackUrl && fallbackUrl !== url && apiError.fallbackAvailable) {
        console.log(`🔄 Falling back to: ${fallbackUrl}`);
        
        try {
          const fallbackResponse = await fetch(fallbackUrl, requestOptions);
          
          if (!fallbackResponse.ok) {
            throw fallbackResponse;
          }

          const fallbackData = await fallbackResponse.json();
          console.log(`✅ Fallback API Response: ${options.method || 'GET'} ${fallbackUrl}`, fallbackData);
          
          return fallbackData;
        } catch (fallbackError) {
          console.error(`❌ Fallback API Error: ${options.method || 'GET'} ${fallbackUrl}`, fallbackError);
          
          // Handle fallback error
          const fallbackApiError = handleApiError(fallbackError, fallbackUrl, {
            method: options.method,
            retryAttempt: 1,
            maxRetries: this.config.retries
          });
          
          throw fallbackApiError;
        }
      }
      
      throw apiError;
    }
  }

  /**
   * Determine fallback URL based on endpoint and current attempt
   */
  private determineFallbackUrl(endpoint: string, currentBaseUrl: string): string | null {
    // For chat endpoints, implement specific fallback logic
    if (endpoint.includes('/chat')) {
      // If trying backend, fallback to Next.js API
      if (currentBaseUrl === this.backendUrl) {
        return `${this.proxyUrl}/api/chat`;
      }
      // If trying Next.js API, fallback to orchestrate endpoint
      if (endpoint === '/api/chat') {
        return `${this.proxyUrl}/api/chat/orchestrate`;
      }
    }
    
    // General fallback logic
    if (this.config.fallbackToProxy && currentBaseUrl !== this.proxyUrl) {
      return `${this.proxyUrl}${endpoint}`;
    }
    
    return null;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      if (!this.backendUrl) return false;
      
      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Stream request for Server-Sent Events (SSE)
   */
  async stream(
    endpoint: string,
    options: RequestInit = {},
    onMessage?: (event: MessageEvent) => void,
    onError?: (error: Error) => void
  ): Promise<EventSource> {
    // Determine URL based on endpoint
    const url = this.config.preferNextAPI && endpoint.startsWith('/api/')
      ? endpoint
      : `${this.getBaseUrl()}${endpoint}`;
    
    console.log(`🌊 Stream Request: ${url}`);
    
    const eventSource = new EventSource(url);
    
    if (onMessage) {
      eventSource.onmessage = (event) => {
        console.log(`📨 Stream Message:`, event.data);
        onMessage(event);
      };
    }
    
    if (onError) {
      eventSource.onerror = (error) => {
        console.error(`❌ Stream Error:`, error);
        onError(new Error('Stream connection failed'));
        
        // Attempt fallback for streaming
        if (this.config.fallbackToProxy) {
          const fallbackUrl = this.determineFallbackUrl(endpoint, url);
          if (fallbackUrl && fallbackUrl !== url) {
            console.log(`🔄 Stream falling back to: ${fallbackUrl}`);
            eventSource.close();
            return this.stream(fallbackUrl, options, onMessage, onError);
          }
        }
      };
    }
    
    return eventSource;
  }

  /**
   * Fetch with streaming support (for fetch-based streaming)
   */
  async fetchStream(
    endpoint: string,
    options: RequestInit = {},
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    const url = this.config.preferNextAPI && endpoint.startsWith('/api/')
      ? endpoint
      : `${this.getBaseUrl()}${endpoint}`;
    
    console.log(`🌊 Fetch Stream Request: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log(`📦 Stream Chunk:`, chunk);
        
        if (onChunk) {
          onChunk(chunk);
        }
      }
    } catch (error) {
      console.error(`❌ Fetch Stream Error:`, error);
      
      // Attempt fallback
      if (this.config.fallbackToProxy) {
        const fallbackUrl = this.determineFallbackUrl(endpoint, url);
        if (fallbackUrl && fallbackUrl !== url) {
          console.log(`🔄 Fetch stream falling back to: ${fallbackUrl}`);
          return this.fetchStream(fallbackUrl, options, onChunk);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get backend status info
   */
  getStatus() {
    return {
      hasBackendUrl: !!this.backendUrl,
      backendUrl: this.backendUrl,
      proxyUrl: this.proxyUrl,
      fallbackEnabled: this.config.fallbackToProxy,
      streamingEnabled: this.config.enableStreaming,
      preferNextAPI: this.config.preferNextAPI,
    };
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Export convenience methods
export const { get, post, put, delete: deleteRequest, checkBackendHealth } = apiClient;

// Export types
export type { ApiClientConfig };