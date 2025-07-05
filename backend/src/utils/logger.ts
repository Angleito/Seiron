import { createLogger, format, transports } from 'winston';
import path from 'path';
import { randomUUID } from 'crypto';

const { combine, timestamp, errors, json, printf, colorize } = format;

// Custom format for console output with request ID
const consoleFormat = printf(({ level, message, timestamp, stack, requestId, service, performance }) => {
  const reqId = requestId ? `[${requestId}]` : '';
  const perf = performance && typeof performance === 'object' && 'duration' in performance ? ` (${performance.duration}ms)` : '';
  return `${timestamp} [${level}]${reqId}: ${stack || message}${perf}`;
});

// Custom format for file output with structured metadata
const fileFormat = printf(({ level, message, timestamp, stack, requestId, service, performance, ...meta }) => {
  const logEntry = {
    timestamp,
    level,
    service,
    requestId,
    message: stack || message,
    performance,
    ...meta
  };
  return JSON.stringify(logEntry);
});

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Logger configuration
const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'sei-portfolio-backend' },
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        consoleFormat
      )
    }),
    
    // File transport for errors
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: fileFormat
    }),
    
    // File transport for all logs
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: fileFormat
    }),

    // File transport for HTTP requests
    new transports.File({
      filename: path.join(logDir, 'requests.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: fileFormat
    })
  ],
});

// Performance timing utility
export class PerformanceTimer {
  private startTime: number;
  private requestId: string;
  
  constructor(requestId: string) {
    this.startTime = Date.now();
    this.requestId = requestId;
  }
  
  end(): number {
    return Date.now() - this.startTime;
  }
  
  log(operation: string, additionalData?: Record<string, any>) {
    const duration = this.end();
    logger.info(`Operation completed: ${operation}`, {
      requestId: this.requestId,
      performance: { duration, operation },
      ...additionalData
    });
    return duration;
  }
}


// Generate unique request ID
export const generateRequestId = (): string => {
  return randomUUID();
};

// Stream for HTTP request logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim(), { source: 'http-request' });
  }
};

export default logger;