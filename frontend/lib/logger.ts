/**
 * Logger utility for Seiron frontend
 * Provides environment-aware logging with different log levels
 */

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

  private formatMessage(level: string, message: string, ...args: any[]): string {
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

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('DEBUG', message, ...args)
      
      if (this.config.isDevelopment) {
        console.log(formattedMessage, ...args)
        
        if (this.config.enableStackTrace) {
          console.log(this.getStackTrace())
        }
      }
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('INFO', message, ...args)
      
      if (this.config.isDevelopment) {
        console.info(formattedMessage, ...args)
      } else {
        // In production, you might want to send to a logging service
        this.sendToLoggingService('info', formattedMessage, args)
      }
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('WARN', message, ...args)
      console.warn(formattedMessage, ...args)
      
      if (!this.config.isDevelopment) {
        this.sendToLoggingService('warn', formattedMessage, args)
      }
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage('ERROR', message, ...args)
      
      if (error instanceof Error) {
        console.error(formattedMessage, error.message, error.stack, ...args)
        
        if (!this.config.isDevelopment) {
          this.sendToLoggingService('error', formattedMessage, {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            args
          })
        }
      } else {
        console.error(formattedMessage, error, ...args)
        
        if (!this.config.isDevelopment) {
          this.sendToLoggingService('error', formattedMessage, { error, args })
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
  table(data: any[], columns?: string[]): void {
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
  assert(condition: boolean, message: string, ...args: any[]): void {
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
   * Placeholder for sending logs to external service
   * Replace with actual implementation (e.g., Sentry, LogRocket, etc.)
   */
  private sendToLoggingService(level: string, message: string, data: any): void {
    // TODO: Implement actual logging service integration
    // Example: Sentry, LogRocket, custom backend, etc.
    
    // For now, store in localStorage as a fallback (limited to last 100 entries)
    try {
      const logs = JSON.parse(localStorage.getItem('seiron_logs') || '[]')
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      
      // Keep only last 100 entries
      const recentLogs = logs.slice(-100)
      localStorage.setItem('seiron_logs', JSON.stringify(recentLogs))
    } catch (e) {
      // Fail silently if localStorage is not available
    }
  }

  /**
   * Get stored logs (useful for debugging in production)
   */
  getStoredLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('seiron_logs') || '[]')
    } catch {
      return []
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export for testing and special cases
export { Logger }

// Convenience exports for direct usage
export const { debug, info, warn, error, group, groupEnd, table, time, timeEnd, assert, clear } = logger