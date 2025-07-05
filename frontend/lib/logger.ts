/**
 * Logger utility for Seiron frontend
 * Provides environment-aware logging with different log levels
 * Includes automatic filtering of sensitive data
 */

import { 
  prepareForLogging, 
  containsSensitiveData,
  DEVELOPMENT_FILTER_CONFIG,
  PRODUCTION_FILTER_CONFIG
} from './security/dataFilter'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel
  isDevelopment: boolean
  prefix?: string
  enableTimestamp?: boolean
  enableStackTrace?: boolean
  enableStructuredLogging?: boolean
  enablePerformanceTracking?: boolean
  enableRequestLogging?: boolean
  enableWebSocketLogging?: boolean
}

export interface PerformanceTimer {
  id: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

export interface RequestLogData {
  requestId: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  statusText?: string
  response?: unknown
  error?: Error
  retryCount?: number
}

export interface WebSocketLogData {
  connectionId: string
  event: 'connect' | 'disconnect' | 'message' | 'error' | 'reconnect'
  url?: string
  data?: unknown
  error?: Error
  timestamp: number
  sessionId?: string
  attemptNumber?: number
}

class Logger {
  private config: LoggerConfig
  private static instance: Logger
  private performanceTimers: Map<string, PerformanceTimer> = new Map()
  private requestLogs: Map<string, RequestLogData> = new Map()

  private constructor(config?: Partial<LoggerConfig>) {
    // Environment detection that's compatible with Jest and Vite
    const isDev = process.env.NODE_ENV === 'development' || 
                  process.env.NODE_ENV === 'test' ||
                  !process.env.NODE_ENV
    
    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.WARN,
      isDevelopment: isDev,
      prefix: '[Seiron]',
      enableTimestamp: true,
      enableStackTrace: false,
      enableStructuredLogging: true,
      enablePerformanceTracking: true,
      enableRequestLogging: true,
      enableWebSocketLogging: true,
      ...config
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config)
    }
    return Logger.instance
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level
  }

  private formatMessage(level: string, message: string, ..._args: unknown[]): string {
    const parts: string[] = []
    
    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }
    
    if (this.config.prefix) {
      parts.push(this.config.prefix)
    }
    
    parts.push(`[${level}]`)
    parts.push(message)
    
    return parts.join(' ')
  }

  private getStackTrace(): string {
    const stack = new Error().stack
    if (!stack) return ''
    
    // Remove the first 3 lines (Error message and internal logger calls)
    const lines = stack.split('\n').slice(3)
    return lines.join('\n')
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('DEBUG', message, ...args)
      
      if (this.config.isDevelopment) {
        // Filter sensitive data from debug logs
        const filteredArgs = args.map(arg => 
          prepareForLogging(arg, DEVELOPMENT_FILTER_CONFIG)
        )
        console.log(formattedMessage, ...filteredArgs)
        
        if (this.config.enableStackTrace) {
          console.log(this.getStackTrace())
        }
      }
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('INFO', message, ...args)
      
      if (this.config.isDevelopment) {
        // Filter sensitive data from info logs
        const filteredArgs = args.map(arg => 
          prepareForLogging(arg, DEVELOPMENT_FILTER_CONFIG)
        )
        console.info(formattedMessage, ...filteredArgs)
      } else {
        // In production, filter and send to logging service
        const filteredArgs = args.map(arg => 
          prepareForLogging(arg, PRODUCTION_FILTER_CONFIG)
        )
        this.sendToLoggingService('info', formattedMessage, filteredArgs)
      }
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('WARN', message, ...args)
      
      // Filter sensitive data from warning logs
      const filterConfig = this.config.isDevelopment ? DEVELOPMENT_FILTER_CONFIG : PRODUCTION_FILTER_CONFIG
      const filteredArgs = args.map(arg => prepareForLogging(arg, filterConfig))
      
      console.warn(formattedMessage, ...filteredArgs)
      
      if (!this.config.isDevelopment) {
        this.sendToLoggingService('warn', formattedMessage, filteredArgs)
      }
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage('ERROR', message, ...args)
      const filterConfig = this.config.isDevelopment ? DEVELOPMENT_FILTER_CONFIG : PRODUCTION_FILTER_CONFIG
      
      if (error instanceof Error) {
        // Filter sensitive data from error args
        const filteredArgs = args.map(arg => prepareForLogging(arg, filterConfig))
        
        console.error(formattedMessage, error.message, error.stack, ...filteredArgs)
        
        if (!this.config.isDevelopment) {
          this.sendToLoggingService('error', formattedMessage, {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            args: filteredArgs
          })
        }
      } else {
        // Filter sensitive data from error object and args
        const filteredError = prepareForLogging(error, filterConfig)
        const filteredArgs = args.map(arg => prepareForLogging(arg, filterConfig))
        
        console.error(formattedMessage, filteredError, ...filteredArgs)
        
        if (!this.config.isDevelopment) {
          this.sendToLoggingService('error', formattedMessage, { 
            error: filteredError, 
            args: filteredArgs 
          })
        }
      }
    }
  }

  /**
   * Group related log messages together
   */
  group(label: string): void {
    if (this.config.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.group(this.formatMessage('GROUP', label))
    }
  }

  groupEnd(): void {
    if (this.config.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd()
    }
  }

  /**
   * Log tabular data
   */
  table(data: unknown[], columns?: string[]): void {
    if (this.config.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.table(data, columns)
    }
  }

  /**
   * Performance timing with structured logging
   */
  time(label: string, metadata?: Record<string, unknown>): void {
    if (this.config.enablePerformanceTracking && this.shouldLog(LogLevel.DEBUG)) {
      const timer: PerformanceTimer = {
        id: label,
        startTime: performance.now(),
        metadata
      }
      
      this.performanceTimers.set(label, timer)
      
      if (this.config.isDevelopment) {
        console.time(`${this.config.prefix} ${label}`)
      }
      
      if (this.config.enableStructuredLogging) {
        this.debug('Performance timer started', {
          timerId: label,
          startTime: timer.startTime,
          metadata
        })
      }
    }
  }

  timeEnd(label: string, metadata?: Record<string, unknown>): PerformanceTimer | undefined {
    if (this.config.enablePerformanceTracking && this.shouldLog(LogLevel.DEBUG)) {
      const timer = this.performanceTimers.get(label)
      
      if (timer) {
        const endTime = performance.now()
        const duration = endTime - timer.startTime
        
        const completedTimer: PerformanceTimer = {
          ...timer,
          endTime,
          duration,
          metadata: { ...timer.metadata, ...metadata }
        }
        
        this.performanceTimers.delete(label)
        
        if (this.config.isDevelopment) {
          console.timeEnd(`${this.config.prefix} ${label}`)
        }
        
        if (this.config.enableStructuredLogging) {
          this.debug('Performance timer completed', {
            timerId: label,
            duration,
            startTime: timer.startTime,
            endTime,
            metadata: completedTimer.metadata
          })
        }
        
        return completedTimer
      } else {
        this.warn(`Performance timer '${label}' not found`)
      }
    }
    
    return undefined
  }

  /**
   * Assert a condition and log if it fails
   */
  assert(condition: boolean, message: string, ...args: unknown[]): void {
    if (!condition && this.shouldLog(LogLevel.ERROR)) {
      this.error(`Assertion failed: ${message}`, ...args)
    }
  }

  /**
   * Clear the console (development only)
   */
  clear(): void {
    if (this.config.isDevelopment) {
      console.clear()
    }
  }

  /**
   * Send logs to external service with sensitive data filtering
   * Replace with actual implementation (e.g., Sentry, LogRocket, etc.)
   */
  private sendToLoggingService(level: string, message: string, data: unknown): void {
    // TODO: Implement actual logging service integration
    // Example: Sentry, LogRocket, custom backend, etc.
    
    try {
      // Double-filter data before storing (extra security)
      const safeData = prepareForLogging(data, PRODUCTION_FILTER_CONFIG)
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: safeData,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
      
      // Check if the entire log entry is safe
      if (!containsSensitiveData(logEntry)) {
        // For now, store in localStorage as a fallback (limited to last 100 entries)
        const logs = JSON.parse(localStorage.getItem('seiron_logs') || '[]')
        logs.push(logEntry)
        
        // Keep only last 100 entries
        const recentLogs = logs.slice(-100)
        localStorage.setItem('seiron_logs', JSON.stringify(recentLogs))
      } else {
        // Log that we skipped logging due to sensitive data
        console.warn('[SECURITY] Skipped logging due to sensitive data detection')
      }
    } catch (e) {
      // Fail silently if localStorage is not available
    }
  }

  /**
   * Get stored logs (useful for debugging in production)
   * Returns filtered logs to ensure no sensitive data exposure
   */
  getStoredLogs(): unknown[] {
    try {
      const logs = JSON.parse(localStorage.getItem('seiron_logs') || '[]')
      // Double-filter stored logs when retrieving them
      return logs.map((log: unknown) => prepareForLogging(log, PRODUCTION_FILTER_CONFIG))
    } catch {
      return []
    }
  }

  /**
   * Safe logging method that automatically filters sensitive data
   */
  safe(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const filterConfig = this.config.isDevelopment ? DEVELOPMENT_FILTER_CONFIG : PRODUCTION_FILTER_CONFIG
    const safeData = data ? prepareForLogging(data, filterConfig) : undefined
    
    switch (level) {
      case 'debug':
        this.debug(message, safeData)
        break
      case 'info':
        this.info(message, safeData)
        break
      case 'warn':
        this.warn(message, safeData)
        break
      case 'error':
        this.error(message, safeData)
        break
    }
  }

  /**
   * Check if data contains sensitive information before logging
   */
  isSafeToLog(data: unknown): boolean {
    return !containsSensitiveData(data)
  }

  /**
   * Structured logging for HTTP requests
   */
  logRequest(requestData: Partial<RequestLogData>): void {
    if (!this.config.enableRequestLogging) return
    
    const requestId = requestData.requestId || this.generateRequestId()
    const logData: RequestLogData = {
      requestId,
      method: 'GET',
      url: '',
      startTime: Date.now(),
      ...requestData
    }
    
    this.requestLogs.set(requestId, logData)
    
    if (this.config.enableStructuredLogging) {
      this.debug('HTTP Request initiated', {
        requestId,
        method: logData.method,
        url: logData.url,
        headers: this.isSafeToLog(logData.headers) ? logData.headers : '[FILTERED]',
        body: this.isSafeToLog(logData.body) ? logData.body : '[FILTERED]',
        startTime: logData.startTime
      })
    }
  }

  logResponse(requestId: string, responseData: Partial<Pick<RequestLogData, 'status' | 'statusText' | 'response' | 'error'>>): void {
    if (!this.config.enableRequestLogging) return
    
    const requestLog = this.requestLogs.get(requestId)
    if (!requestLog) {
      this.warn(`Request log not found for ID: ${requestId}`)
      return
    }
    
    const endTime = Date.now()
    const duration = endTime - requestLog.startTime
    
    const completedLog: RequestLogData = {
      ...requestLog,
      ...responseData,
      endTime,
      duration
    }
    
    this.requestLogs.set(requestId, completedLog)
    
    if (this.config.enableStructuredLogging) {
      const logLevel = completedLog.error ? 'error' : completedLog.status && completedLog.status >= 400 ? 'warn' : 'info'
      const logMessage = `HTTP ${completedLog.method} ${completedLog.url} - ${completedLog.status} ${completedLog.statusText} (${duration}ms)`
      
      const logData = {
        requestId,
        method: completedLog.method,
        url: completedLog.url,
        status: completedLog.status,
        statusText: completedLog.statusText,
        duration,
        response: this.isSafeToLog(completedLog.response) ? completedLog.response : '[FILTERED]',
        error: completedLog.error ? this.serializeError(completedLog.error) : undefined,
        retryCount: completedLog.retryCount
      }
      
      switch (logLevel) {
        case 'error':
          this.error(logMessage, logData)
          break
        case 'warn':
          this.warn(logMessage, logData)
          break
        default:
          this.info(logMessage, logData)
      }
    }
    
    // Clean up old logs (keep last 100)
    if (this.requestLogs.size > 100) {
      const oldestKey = this.requestLogs.keys().next().value
      if (oldestKey !== undefined) {
        this.requestLogs.delete(oldestKey)
      }
    }
  }

  /**
   * Structured logging for WebSocket events
   */
  logWebSocket(wsData: WebSocketLogData): void {
    if (!this.config.enableWebSocketLogging) return
    
    if (this.config.enableStructuredLogging) {
      const logMessage = `WebSocket ${wsData.event} - ${wsData.connectionId}`
      
      const logData = {
        connectionId: wsData.connectionId,
        event: wsData.event,
        url: wsData.url,
        data: this.isSafeToLog(wsData.data) ? wsData.data : '[FILTERED]',
        error: wsData.error ? this.serializeError(wsData.error) : undefined,
        timestamp: wsData.timestamp,
        sessionId: wsData.sessionId,
        attemptNumber: wsData.attemptNumber
      }
      
      switch (wsData.event) {
        case 'error':
          this.error(logMessage, logData)
          break
        case 'disconnect':
          this.warn(logMessage, logData)
          break
        case 'reconnect':
          this.info(logMessage, logData)
          break
        default:
          this.debug(logMessage, logData)
      }
    }
  }

  /**
   * Serialize error objects for logging
   */
  private serializeError(error: Error | unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
      
      // Add cause if it exists (ES2022 feature)
      if ('cause' in error && error.cause !== undefined) {
        serialized.cause = error.cause
      }
      
      return serialized
    }
    
    return {
      error: String(error),
      type: typeof error
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get request log by ID
   */
  getRequestLog(requestId: string): RequestLogData | undefined {
    return this.requestLogs.get(requestId)
  }

  /**
   * Get all request logs
   */
  getAllRequestLogs(): RequestLogData[] {
    return Array.from(this.requestLogs.values())
  }

  /**
   * Get active performance timers
   */
  getActiveTimers(): PerformanceTimer[] {
    return Array.from(this.performanceTimers.values())
  }

  /**
   * Clear all performance timers
   */
  clearTimers(): void {
    this.performanceTimers.clear()
  }

  /**
   * Clear all request logs
   */
  clearRequestLogs(): void {
    this.requestLogs.clear()
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export for testing and special cases
export { Logger }

// Export types (avoid conflicts with interface declarations)
export type { PerformanceTimer as PerformanceTimerType, RequestLogData as RequestLogDataType, WebSocketLogData as WebSocketLogDataType }

// Convenience exports for direct usage
export const { debug, info, warn, error, group, groupEnd, table, time, timeEnd, assert, clear, safe, isSafeToLog, logRequest, logResponse, logWebSocket, getRequestLog, getAllRequestLogs, getActiveTimers, clearTimers, clearRequestLogs } = logger

// Export safe logging functions
export const safeDebug = (message: string, data?: unknown) => logger.safe('debug', message, data)
export const safeInfo = (message: string, data?: unknown) => logger.safe('info', message, data)
export const safeWarn = (message: string, data?: unknown) => logger.safe('warn', message, data)
export const safeError = (message: string, data?: unknown) => logger.safe('error', message, data)