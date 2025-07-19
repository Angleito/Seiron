// Simple logger utility for frontend
// Performance timing storage
const performanceTimers = new Map<string, number>();

// Ensure performance API is available
const getPerformanceNow = (): number => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  // Fallback to Date.now() if performance is not available
  return Date.now();
};

interface LogRequest {
  requestId: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  startTime: number;
}

interface LogResponse {
  status?: number;
  statusText?: string;
  response?: any;
  error?: Error;
}

export const logger = {
  safe: (level: string, message: string, context?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, context);
    } else if (level === 'warn') {
      console.warn(logMessage, context);
    } else {
      console.log(logMessage, context);
    }
  },
  
  info: (message: string, context?: any) => {
    logger.safe('info', message, context);
  },
  
  error: (message: string, context?: any) => {
    logger.safe('error', message, context);
  },
  
  warn: (message: string, context?: any) => {
    logger.safe('warn', message, context);
  },
  
  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.safe('debug', message, context);
    }
  },
  
  time: (label: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      performanceTimers.set(label, getPerformanceNow());
      logger.safe('debug', `Timer started: ${label}`, context);
    }
  },
  
  timeEnd: (label: string, context?: any): { duration: number } | undefined => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performanceTimers.get(label);
      if (startTime !== undefined) {
        const duration = getPerformanceNow() - startTime;
        performanceTimers.delete(label);
        logger.safe('debug', `Timer ended: ${label} - ${duration.toFixed(2)}ms`, context);
        return { duration };
      }
    }
    return undefined;
  },
  
  logRequest: (request: LogRequest) => {
    logger.debug(`HTTP Request [${request.requestId}] ${request.method} ${request.url}`, {
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      startTime: request.startTime
    });
  },
  
  logResponse: (requestId: string, response: LogResponse) => {
    if (response.error) {
      logger.error(`HTTP Response Error [${requestId}]`, {
        requestId,
        error: response.error.message,
        stack: response.error.stack
      });
    } else {
      logger.debug(`HTTP Response [${requestId}] ${response.status} ${response.statusText}`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        response: response.response
      });
    }
  }
};

// Export safe logging functions for various log levels
export const safeError = (message: string, context?: any) => {
  logger.safe('error', message, context);
};

export const safeWarn = (message: string, context?: any) => {
  logger.safe('warn', message, context);
};

export const safeInfo = (message: string, context?: any) => {
  logger.safe('info', message, context);
};

export const safeDebug = (message: string, context?: any) => {
  logger.safe('debug', message, context);
};

// Export individual functions for compatibility
export const logRequest = logger.logRequest;
export const logResponse = logger.logResponse;
export const time = logger.time;
export const timeEnd = logger.timeEnd;

// Add logWebSocket function
export const logWebSocket = (event: string, data?: any) => {
  logger.debug(`WebSocket ${event}`, data);
};