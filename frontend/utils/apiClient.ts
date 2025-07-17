/**
 * Unified API Client for Frontend-Backend Communication
 * Handles both direct backend calls and Vercel API route proxies
 */

import { envConfig } from './envValidation';

// API Client Configuration
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  fallbackToProxy?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ApiClientConfig = {
  timeout: 10000,
  retries: 2,
  fallbackToProxy: true,
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
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

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
      
      // If we have a backend URL and fallback is enabled, try proxy
      if (this.backendUrl && this.config.fallbackToProxy && baseUrl !== this.proxyUrl) {
        console.log('🔄 Falling back to proxy API...');
        const proxyUrl = `${this.proxyUrl}${endpoint}`;
        
        try {
          const proxyResponse = await fetch(proxyUrl, requestOptions);
          
          if (!proxyResponse.ok) {
            throw new Error(`Proxy API request failed: ${proxyResponse.status} ${proxyResponse.statusText}`);
          }

          const proxyData = await proxyResponse.json();
          console.log(`✅ Proxy API Response: ${options.method || 'GET'} ${proxyUrl}`, proxyData);
          
          return proxyData;
        } catch (proxyError) {
          console.error(`❌ Proxy API Error: ${options.method || 'GET'} ${proxyUrl}`, proxyError);
          throw proxyError;
        }
      }
      
      throw error;
    }
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
   * Get backend status info
   */
  getStatus() {
    return {
      hasBackendUrl: !!this.backendUrl,
      backendUrl: this.backendUrl,
      proxyUrl: this.proxyUrl,
      fallbackEnabled: this.config.fallbackToProxy,
    };
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Export convenience methods
export const { get, post, put, delete: deleteRequest, checkBackendHealth } = apiClient;

// Export types
export type { ApiClientConfig };