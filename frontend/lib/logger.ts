/**
 * Logger utility for Seiron frontend
 * Provides environment-aware logging with different log levels
 * Includes automatic filtering of sensitive data
 */

import { 
  filterSensitiveData, 
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
}

class Logger {
  private config: LoggerConfig
  private static instance: Logger

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
      isDevelopment: import.meta.env.DEV,
      prefix: '[Seiron]',
      enableTimestamp: true,
      enableStackTrace: false,
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
   * Performance timing
   */
  time(label: string): void {
    if (this.config.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.time(`${this.config.prefix} ${label}`)
    }
  }

  timeEnd(label: string): void {
    if (this.config.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`${this.config.prefix} ${label}`)
    }
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
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export for testing and special cases
export { Logger }

// Convenience exports for direct usage
export const { debug, info, warn, error, group, groupEnd, table, time, timeEnd, assert, clear, safe, isSafeToLog } = logger

// Export safe logging functions
export const safeDebug = (message: string, data?: unknown) => logger.safe('debug', message, data)
export const safeInfo = (message: string, data?: unknown) => logger.safe('info', message, data)
export const safeWarn = (message: string, data?: unknown) => logger.safe('warn', message, data)
export const safeError = (message: string, data?: unknown) => logger.safe('error', message, data)