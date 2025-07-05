/**
 * Request and Response Interceptors for API and WebSocket Logging
 * Provides utilities for automatic request/response logging and performance tracking
 */

import { logger, logRequest, logResponse, time, timeEnd, logWebSocket } from './logger'

export interface InterceptorConfig {
  enableLogging?: boolean
  enablePerformanceTracking?: boolean
  logRequestBodies?: boolean
  logResponseBodies?: boolean
  logHeaders?: boolean
  maxBodySize?: number
}

const defaultConfig: Required<InterceptorConfig> = {
  enableLogging: true,
  enablePerformanceTracking: true,
  logRequestBodies: true,
  logResponseBodies: true,
  logHeaders: true,
  maxBodySize: 1000 // Max characters to log for request/response bodies
}

/**
 * Enhanced fetch wrapper with automatic logging and performance tracking
 */
export async function fetchWithLogging(
  url: string,
  options: RequestInit = {},
  context?: string,
  config: InterceptorConfig = {}
): Promise<Response> {
  const finalConfig = { ...defaultConfig, ...config }
  
  if (!finalConfig.enableLogging) {
    return fetch(url, options)
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const performanceLabel = `HTTP_${options.method || 'GET'}_${context || url.split('/').pop()}`
  
  // Start performance timing
  if (finalConfig.enablePerformanceTracking) {
    time(performanceLabel, { 
      requestId, 
      context,
      url,
      method: options.method || 'GET'
    })
  }
  
  // Parse request body for logging
  let requestBody
  if (finalConfig.logRequestBodies && options.body) {
    try {
      requestBody = typeof options.body === 'string' 
        ? JSON.parse(options.body) 
        : options.body
    } catch {
      requestBody = String(options.body).substring(0, finalConfig.maxBodySize)
    }
  }
  
  // Log request initiation
  logRequest({
    requestId,
    method: options.method || 'GET',
    url,
    headers: finalConfig.logHeaders ? options.headers as Record<string, string> : undefined,
    body: requestBody,
    startTime: Date.now()
  })
  
  try {
    // Add request ID to headers
    const enhancedOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'X-Request-ID': requestId,
        'X-Client-Version': '1.0.0',
        'X-Client-Type': 'frontend'
      }
    }
    
    logger.debug('Making HTTP request', {
      requestId,
      method: options.method || 'GET',
      url,
      context,
      hasBody: !!options.body
    })
    
    const response = await fetch(url, enhancedOptions)
    
    // Clone response to read body for logging without consuming it
    const responseClone = response.clone()
    let responseData
    
    if (finalConfig.logResponseBodies) {
      try {
        const responseText = await responseClone.text()
        responseData = responseText ? JSON.parse(responseText) : null
      } catch {
        // If parsing fails, log truncated text
        const responseText = await responseClone.text()
        responseData = responseText.substring(0, finalConfig.maxBodySize)
      }
    }
    
    // Log response
    logResponse(requestId, {
      status: response.status,
      statusText: response.statusText,
      response: responseData
    })
    
    // End performance timing
    if (finalConfig.enablePerformanceTracking) {
      const timer = timeEnd(performanceLabel, {
        status: response.status,
        success: response.ok
      })
      
      logger.info(`HTTP ${options.method || 'GET'} ${url} - ${response.status} (${timer?.duration || 0}ms)`, {
        requestId,
        status: response.status,
        duration: timer?.duration,
        context
      })
    }
    
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Log error response
    logResponse(requestId, {
      error: error instanceof Error ? error : new Error(errorMessage)
    })
    
    // End performance timing with error
    if (finalConfig.enablePerformanceTracking) {
      const timer = timeEnd(performanceLabel, {
        error: true,
        errorType: error instanceof Error ? error.name : 'Unknown'
      })
      
      logger.error(`HTTP ${options.method || 'GET'} ${url} - ERROR (${timer?.duration || 0}ms)`, {
        requestId,
        error: errorMessage,
        duration: timer?.duration,
        context
      })
    }
    
    throw error
  }
}

/**
 * WebSocket event logger utility
 */
export class WebSocketEventLogger {
  private connectionId: string
  private sessionId?: string
  private messageCount: number = 0
  
  constructor(sessionId?: string) {
    this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    this.sessionId = sessionId
    
    logger.debug('WebSocket event logger initialized', {
      connectionId: this.connectionId,
      sessionId: this.sessionId
    })
  }
  
  logConnect(url: string, success: boolean = true, error?: Error) {
    logWebSocket({
      connectionId: this.connectionId,
      event: 'connect',
      url,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      error,
      data: { success }
    })
  }
  
  logDisconnect(code?: number, reason?: string, wasClean?: boolean) {
    logWebSocket({
      connectionId: this.connectionId,
      event: 'disconnect',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: {
        code,
        reason,
        wasClean,
        messageCount: this.messageCount
      }
    })
  }
  
  logMessage(direction: 'incoming' | 'outgoing', data: unknown, messageType?: string) {
    this.messageCount++
    
    logWebSocket({
      connectionId: this.connectionId,
      event: 'message',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: {
        direction,
        messageType,
        messageSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        messageCount: this.messageCount
      }
    })
  }
  
  logError(error: Error, operation?: string) {
    logWebSocket({
      connectionId: this.connectionId,
      event: 'error',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      error,
      data: { operation }
    })
  }
  
  logReconnect(attemptNumber: number, maxAttempts: number) {
    logWebSocket({
      connectionId: this.connectionId,
      event: 'reconnect',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      attemptNumber,
      data: {
        attemptNumber,
        maxAttempts
      }
    })
  }
  
  getConnectionId(): string {
    return this.connectionId
  }
  
  getMessageCount(): number {
    return this.messageCount
  }
}

/**
 * Performance tracker utility for function execution
 */
export class PerformanceTracker {
  private timers: Map<string, number> = new Map()
  private context: string
  
  constructor(context: string) {
    this.context = context
  }
  
  start(label: string, metadata?: Record<string, unknown>): void {
    const fullLabel = `${this.context}_${label}`
    this.timers.set(label, Date.now())
    time(fullLabel, { context: this.context, ...metadata })
  }
  
  end(label: string, metadata?: Record<string, unknown>): number | undefined {
    const fullLabel = `${this.context}_${label}`
    const startTime = this.timers.get(label)
    
    if (startTime) {
      const duration = Date.now() - startTime
      this.timers.delete(label)
      
      const timer = timeEnd(fullLabel, { context: this.context, duration, ...metadata })
      return timer?.duration
    }
    
    logger.warn(`Performance timer '${label}' not found in context '${this.context}'`)
    return undefined
  }
  
  measure(label: string, fn: () => Promise<unknown>, metadata?: Record<string, unknown>): Promise<unknown> {
    this.start(label, metadata)
    
    return fn()
      .then(result => {
        this.end(label, { success: true, ...metadata })
        return result
      })
      .catch(error => {
        this.end(label, { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata 
        })
        throw error
      })
  }
  
  measureSync<T>(label: string, fn: () => T, metadata?: Record<string, unknown>): T {
    this.start(label, metadata)
    
    try {
      const result = fn()
      this.end(label, { success: true, ...metadata })
      return result
    } catch (error) {
      this.end(label, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata 
      })
      throw error
    }
  }
}

/**
 * API client with built-in logging and error handling
 */
export class LoggedApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private config: Required<InterceptorConfig>
  
  constructor(
    baseUrl: string, 
    defaultHeaders: Record<string, string> = {},
    config: InterceptorConfig = {}
  ) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
    this.config = { ...defaultConfig, ...config }
  }
  
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetchWithLogging(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'GET',
        headers: { ...this.defaultHeaders, ...headers }
      },
      `API_GET_${endpoint.split('/').pop()}`,
      this.config
    )
    
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async post<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await fetchWithLogging(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: { ...this.defaultHeaders, ...headers },
        body: data ? JSON.stringify(data) : undefined
      },
      `API_POST_${endpoint.split('/').pop()}`,
      this.config
    )
    
    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async put<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await fetchWithLogging(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'PUT',
        headers: { ...this.defaultHeaders, ...headers },
        body: data ? JSON.stringify(data) : undefined
      },
      `API_PUT_${endpoint.split('/').pop()}`,
      this.config
    )
    
    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetchWithLogging(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'DELETE',
        headers: { ...this.defaultHeaders, ...headers }
      },
      `API_DELETE_${endpoint.split('/').pop()}`,
      this.config
    )
    
    if (!response.ok) {
      throw new Error(`DELETE ${endpoint} failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }
}

export default {
  fetchWithLogging,
  WebSocketEventLogger,
  PerformanceTracker,
  LoggedApiClient
}