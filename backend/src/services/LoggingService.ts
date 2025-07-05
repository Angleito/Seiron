import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * LoggingService - Centralized Logging and Error Handling
 * 
 * This service provides comprehensive logging, error tracking, and monitoring
 * capabilities for all backend services. It maintains fp-ts patterns throughout
 * and includes Dragon Ball Z themed logging for consistency.
 */

// ============================================================================
// Logging Types and Interfaces
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  walletAddress?: string;
  sessionId?: string;
  requestId?: string;
  service?: string;
  method?: string;
  adapter?: string;
  dragonPowerLevel?: number;
  metadata?: Record<string, any>;
  // Additional fields for flexibility
  [key: string]: any;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
  performance?: {
    duration: number;
    memory: number;
    cpu?: number;
  };
  stack?: string;
  tags?: string[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<LogLevel, number>;
  errorsByService: Record<string, number>;
  errorsByAdapter: Record<string, number>;
  recentErrors: LogEntry[];
  errorRate: number;
  avgResponseTime: number;
}

export interface ServiceHealthMetrics {
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

// ============================================================================
// Logging Service Implementation
// ============================================================================

export class LoggingService extends EventEmitter {
  private logs: LogEntry[] = [];
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
    errorsByService: {},
    errorsByAdapter: {},
    recentErrors: [],
    errorRate: 0,
    avgResponseTime: 0
  };
  private healthMetrics: Map<string, ServiceHealthMetrics> = new Map();
  private performanceTimers: Map<string, number> = new Map();
  private config: {
    maxLogEntries: number;
    enableConsoleOutput: boolean;
    enableMetrics: boolean;
    enableDragonTheming: boolean;
    logLevels: LogLevel[];
  };

  constructor(config: Partial<LoggingService['config']> = {}) {
    super();
    
    this.config = {
      maxLogEntries: 10000,
      enableConsoleOutput: true,
      enableMetrics: true,
      enableDragonTheming: true,
      logLevels: ['debug', 'info', 'warn', 'error', 'fatal'], // TODO: REMOVE_MOCK - Hard-coded array literals
      ...config
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Clean up every minute
  }

  // ============================================================================
  // Core Logging Methods
  // ============================================================================

  /**
   * Log a debug message
   */
  public debug = (message: string, context: LogContext = {}): void => {
    this.log('debug', message, context);
  };

  /**
   * Log an info message
   */
  public info = (message: string, context: LogContext = {}): void => {
    this.log('info', message, context);
  };

  /**
   * Log a warning message
   */
  public warn = (message: string, context: LogContext = {}, error?: Error): void => {
    this.log('warn', message, context, error);
  };

  /**
   * Log an error message
   */
  public error = (message: string, context: LogContext = {}, error?: Error): void => {
    this.log('error', message, context, error);
  };

  /**
   * Log a fatal error message
   */
  public fatal = (message: string, context: LogContext = {}, error?: Error): void => {
    this.log('fatal', message, context, error);
  };

  /**
   * Core logging method
   */
  private log = (
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: Error
  ): void => {
    if (!this.config.logLevels.includes(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: this.config.enableDragonTheming ? this.addDragonTheme(message, level) : message,
      context,
      error,
      stack: error?.stack,
      tags: this.extractTags(message, context)
    };

    // Add performance metrics if available
    const performanceKey = `${context.service}_${context.method}`;
    if (this.performanceTimers.has(performanceKey)) {
      const startTime = this.performanceTimers.get(performanceKey)!;
      entry.performance = {
        duration: performance.now() - startTime,
        memory: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      };
      this.performanceTimers.delete(performanceKey);
    }

    // Store log entry
    this.logs.push(entry);

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(entry);
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Emit event for external handlers
    this.emit('log', entry);

    // Emit specific level events
    this.emit(level, entry);
  };

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  /**
   * Start performance timer
   */
  public startTimer = (service: string, method: string): void => {
    const key = `${service}_${method}`;
    this.performanceTimers.set(key, performance.now());
  };

  /**
   * End performance timer and log result
   */
  public endTimer = (
    service: string,
    method: string,
    context: LogContext = {}
  ): number => {
    const key = `${service}_${method}`;
    const startTime = this.performanceTimers.get(key);
    
    if (!startTime) {
      this.warn(`Performance timer not found for ${key}`, context);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceTimers.delete(key);

    this.info(`${service}.${method} completed`, {
      ...context,
      service,
      method,
      metadata: { duration: `${duration.toFixed(2)}ms` }
    });

    return duration;
  };

  /**
   * Measure async operation performance
   */
  public measureAsync = <T>(
    operation: () => Promise<T>,
    service: string,
    method: string,
    context: LogContext = {}
  ): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      this.startTimer(service, method);
      
      try {
        const result = await operation();
        this.endTimer(service, method, context);
        resolve(result);
      } catch (error) {
        this.endTimer(service, method, context);
        this.error(`${service}.${method} failed`, context, error as Error);
        reject(error);
      }
    });
  };

  // ============================================================================
  // Error Handling with fp-ts Integration
  // ============================================================================

  /**
   * Create a TaskEither that logs success/failure
   */
  public logTaskEither = <E, A>(
    task: TE.TaskEither<E, A>,
    service: string,
    method: string,
    context: LogContext = {}
  ): TE.TaskEither<E, A> =>
    pipe(
      task,
      TE.tapTask(result => 
        TE.rightTask(async () => {
          this.info(`${service}.${method} succeeded`, {
            ...context,
            service,
            method
          });
        })
      ),
      TE.tapError(error => 
        TE.rightTask(async () => {
          this.error(`${service}.${method} failed`, {
            ...context,
            service,
            method
          }, error as Error);
        })
      )
    );

  /**
   * Wrap a function with error logging
   */
  public wrapWithLogging = <T extends any[], R>(
    fn: (...args: T) => R,
    service: string,
    method: string,
    context: LogContext = {}
  ): ((...args: T) => R) => {
    return (...args: T): R => {
      try {
        this.startTimer(service, method);
        const result = fn(...args);
        this.endTimer(service, method, context);
        return result;
      } catch (error) {
        this.error(`${service}.${method} threw error`, {
          ...context,
          service,
          method
        }, error as Error);
        throw error;
      }
    };
  };

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  /**
   * Update service health metrics
   */
  public updateServiceHealth = (
    serviceName: string,
    metrics: Partial<ServiceHealthMetrics>
  ): void => {
    const existing = this.healthMetrics.get(serviceName) || {
      uptime: 0,
      errorRate: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastHealthCheck: new Date(),
      status: 'healthy' as const
    };

    const updated: ServiceHealthMetrics = {
      ...existing,
      ...metrics,
      lastHealthCheck: new Date()
    };

    // Determine health status
    if (updated.errorRate > 0.1 || updated.avgResponseTime > 5000) {
      updated.status = 'unhealthy';
    } else if (updated.errorRate > 0.05 || updated.avgResponseTime > 2000) {
      updated.status = 'degraded';
    } else {
      updated.status = 'healthy';
    }

    this.healthMetrics.set(serviceName, updated);

    // Log health status changes
    if (existing.status !== updated.status) {
      this.info(`Service ${serviceName} health status changed`, {
        service: serviceName,
        metadata: {
          oldStatus: existing.status,
          newStatus: updated.status,
          errorRate: updated.errorRate,
          avgResponseTime: updated.avgResponseTime
        }
      });
    }
  };

  /**
   * Get service health metrics
   */
  public getServiceHealth = (serviceName: string): O.Option<ServiceHealthMetrics> =>
    O.fromNullable(this.healthMetrics.get(serviceName));

  /**
   * Get all service health metrics
   */
  public getAllServiceHealth = (): Record<string, ServiceHealthMetrics> => {
    const result: Record<string, ServiceHealthMetrics> = {};
    this.healthMetrics.forEach((metrics, service) => {
      result[service] = metrics;
    });
    return result;
  };


  // ============================================================================
  // Query and Analytics
  // ============================================================================

  /**
   * Get recent logs
   */
  public getRecentLogs = (
    limit: number = 100,
    level?: LogLevel,
    service?: string
  ): LogEntry[] => {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (service) {
      filtered = filtered.filter(log => log.context.service === service);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  };

  /**
   * Get error metrics
   */
  public getErrorMetrics = (): ErrorMetrics => {
    return { ...this.metrics };
  };

  /**
   * Get logs by time range
   */
  public getLogsByTimeRange = (
    startTime: Date,
    endTime: Date,
    level?: LogLevel
  ): LogEntry[] => {
    return this.logs.filter(log => {
      const inRange = log.timestamp >= startTime && log.timestamp <= endTime;
      const levelMatch = !level || log.level === level;
      return inRange && levelMatch;
    });
  };

  /**
   * Search logs by message or context
   */
  public searchLogs = (
    query: string,
    context?: Partial<LogContext>
  ): LogEntry[] => {
    return this.logs.filter(log => {
      const messageMatch = log.message.toLowerCase().includes(query.toLowerCase());
      const contextMatch = !context || this.matchesContext(log.context, context);
      return messageMatch && contextMatch;
    });
  };

  // ============================================================================
  // Dragon Ball Z Themed Logging
  // ============================================================================

  private addDragonTheme = (message: string, level: LogLevel): string => {
    const dragonPrefixes = {
      debug: '🐉 [Scouter Reading]',
      info: '⚡ [Power Level Update]',
      warn: '⚠️ [Energy Fluctuation]',
      error: '💥 [Critical Hit]',
      fatal: '🔥 [Final Flash]'
    };

    return `${dragonPrefixes[level]} ${message}`;
  };

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private updateMetrics = (entry: LogEntry): void => {
    // Update total errors
    if (['warn', 'error', 'fatal'].includes(entry.level)) { // TODO: REMOVE_MOCK - Hard-coded array literals
      this.metrics.totalErrors++;
    }

    // Update error counts by level
    this.metrics.errorsByLevel[entry.level]++;

    // Update error counts by service
    if (entry.context.service) {
      this.metrics.errorsByService[entry.context.service] = 
        (this.metrics.errorsByService[entry.context.service] || 0) + 1;
    }

    // Update error counts by adapter
    if (entry.context.adapter) {
      this.metrics.errorsByAdapter[entry.context.adapter] = 
        (this.metrics.errorsByAdapter[entry.context.adapter] || 0) + 1;
    }

    // Update recent errors
    if (['error', 'fatal'].includes(entry.level)) {
      this.metrics.recentErrors.push(entry);
      if (this.metrics.recentErrors.length > 50) {
        this.metrics.recentErrors.shift();
      }
    }

    // Calculate error rate (errors per minute)
    const recentTime = new Date(Date.now() - 60000); // Last minute
    const recentErrors = this.logs.filter(log => 
      log.timestamp >= recentTime && ['error', 'fatal'].includes(log.level)
    );
    this.metrics.errorRate = recentErrors.length;

    // Calculate average response time
    const recentPerformanceLogs = this.logs.filter(log => 
      log.performance && log.timestamp >= recentTime
    );
    if (recentPerformanceLogs.length > 0) {
      const totalDuration = recentPerformanceLogs.reduce((sum, log) => 
        sum + (log.performance?.duration || 0), 0
      );
      this.metrics.avgResponseTime = totalDuration / recentPerformanceLogs.length;
    }
  };

  private outputToConsole = (entry: LogEntry): void => {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context.service ? `[${entry.context.service}]` : '';
    const performance = entry.performance ? ` (${entry.performance.duration.toFixed(2)}ms)` : '';
    
    const logMessage = `${timestamp} ${context} ${entry.message}${performance}`;

    switch (entry.level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
      case 'fatal':
        console.error(logMessage);
        if (entry.error) {
          console.error(entry.error);
        }
        break;
    }
  };

  private extractTags = (message: string, context: LogContext): string[] => {
    const tags: string[] = [];
    
    if (context.service) tags.push(`service:${context.service}`);
    if (context.adapter) tags.push(`adapter:${context.adapter}`);
    if (context.method) tags.push(`method:${context.method}`);
    if (context.userId) tags.push('user-action');
    if (context.walletAddress) tags.push('wallet-operation');
    
    // Extract tags from message
    const tagPattern = /#(\w+)/g;
    let match;
    while ((match = tagPattern.exec(message)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  };

  private matchesContext = (
    logContext: LogContext,
    searchContext: Partial<LogContext>
  ): boolean => {
    return Object.entries(searchContext).every(([key, value]) => {
      const logValue = logContext[key as keyof LogContext];
      return logValue === value;
    });
  };

  private cleanup = (): void => {
    // Remove old logs to prevent memory leaks
    if (this.logs.length > this.config.maxLogEntries) {
      const toRemove = this.logs.length - this.config.maxLogEntries;
      this.logs.splice(0, toRemove);
    }

    // Remove old performance timers
    const now = performance.now();
    this.performanceTimers.forEach((startTime, key) => {
      if (now - startTime > 300000) { // 5 minutes
        this.performanceTimers.delete(key);
      }
    });
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const logger = new LoggingService({
  enableDragonTheming: true,
  enableMetrics: true,
  enableConsoleOutput: process.env.NODE_ENV !== 'test'
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a logger instance for a specific service
 */
export const createServiceLogger = (serviceName: string) => ({
  debug: (message: string, context: Omit<LogContext, 'service'> = {}) =>
    logger.debug(message, { ...context, service: serviceName }),
  
  info: (message: string, context: Omit<LogContext, 'service'> = {}) =>
    logger.info(message, { ...context, service: serviceName }),
  
  warn: (message: string, context: Omit<LogContext, 'service'> = {}, error?: Error) =>
    logger.warn(message, { ...context, service: serviceName }, error),
  
  error: (message: string, context: Omit<LogContext, 'service'> = {}, error?: Error) =>
    logger.error(message, { ...context, service: serviceName }, error),
  
  fatal: (message: string, context: Omit<LogContext, 'service'> = {}, error?: Error) =>
    logger.fatal(message, { ...context, service: serviceName }, error),
  
  startTimer: (method: string) => logger.startTimer(serviceName, method),
  endTimer: (method: string, context: Omit<LogContext, 'service'> = {}) =>
    logger.endTimer(serviceName, method, { ...context, service: serviceName }),
  
  measureAsync: <T>(operation: () => Promise<T>, method: string, context: Omit<LogContext, 'service'> = {}) =>
    logger.measureAsync(operation, serviceName, method, { ...context, service: serviceName }),
  
  logTaskEither: <E, A>(
    task: TE.TaskEither<E, A>,
    method: string,
    context: Omit<LogContext, 'service'> = {}
  ) => logger.logTaskEither(task, serviceName, method, { ...context, service: serviceName }),
  
  wrapWithLogging: <T extends any[], R>(
    fn: (...args: T) => R,
    method: string,
    context: Omit<LogContext, 'service'> = {}
  ) => logger.wrapWithLogging(fn, serviceName, method, { ...context, service: serviceName })
});

/**
 * Error handling decorator for service methods
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  serviceName: string,
  methodName: string
): ((...args: T) => R) => {
  const serviceLogger = createServiceLogger(serviceName);
  
  return (...args: T): R => {
    try {
      serviceLogger.startTimer(methodName);
      const result = fn(...args);
      serviceLogger.endTimer(methodName);
      return result;
    } catch (error) {
      serviceLogger.error(`${methodName} failed`, { method: methodName }, error as Error);
      throw error;
    }
  };
};