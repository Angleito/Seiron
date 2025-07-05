import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

// Sensitive fields to filter from request/response bodies
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'privateKey',
  'secret',
  'authorization',
  'cookie',
  'session',
  'mnemonic',
  'seed',
  'walletPrivateKey'
];

// Request size limit for body logging (100KB)
const MAX_BODY_SIZE = 100 * 1024;

// Filter sensitive data from objects
function filterSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(filterSensitiveData);
  }
  
  const filtered: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => keyLower.includes(field.toLowerCase()))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Check if request should log body
function shouldLogBody(req: Request): boolean {
  // Don't log body for health checks
  if (req.path === '/health') return false;
  
  // Don't log body for large requests
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_BODY_SIZE) return false;
  
  // Log body for API routes
  return req.path.startsWith('/api/');
}

// Check if response should log body
function shouldLogResponseBody(req: Request, res: Response): boolean {
  // Don't log response body for health checks
  if (req.path === '/health') return false;
  
  // Don't log response body for large responses
  const contentLength = parseInt(res.getHeader('content-length') as string || '0');
  if (contentLength > MAX_BODY_SIZE) return false;
  
  // Don't log response body for file downloads
  const contentType = res.getHeader('content-type') as string;
  if (contentType && (contentType.includes('application/octet-stream') || 
                     contentType.includes('application/zip') ||
                     contentType.includes('image/') ||
                     contentType.includes('video/') ||
                     contentType.includes('audio/'))) {
    return false;
  }
  
  // Log response body for API routes
  return req.path.startsWith('/api/');
}

// Request ID middleware
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Start performance timer
  req.startTime = Date.now();
  
  next();
}

// Request/Response body logging middleware
export function requestBodyLogger(req: Request, res: Response, next: NextFunction) {
  if (!req.requestId) {
    return next();
  }
  
  // Log request details
  const requestData: any = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: filterSensitiveData(req.headers),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    walletAddress: req.walletAddress
  };
  
  // Add request body if appropriate
  if (shouldLogBody(req) && req.body) {
    requestData.body = filterSensitiveData(req.body);
  }
  
  logger.info('HTTP Request', requestData);
  
  // Intercept response to log response body
  if (shouldLogResponseBody(req, res)) {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(body: any) {
      const responseData = {
        requestId: req.requestId,
        statusCode: res.statusCode,
        headers: filterSensitiveData(res.getHeaders()),
        body: typeof body === 'string' ? body : filterSensitiveData(body)
      };
      
      logger.info('HTTP Response', responseData);
      return originalSend.call(this, body);
    };
    
    res.json = function(body: any) {
      const responseData = {
        requestId: req.requestId,
        statusCode: res.statusCode,
        headers: filterSensitiveData(res.getHeaders()),
        body: filterSensitiveData(body)
      };
      
      logger.info('HTTP Response', responseData);
      return originalJson.call(this, body);
    };
  }
  
  next();
}

// Enhanced morgan tokens
morgan.token('id', (req: Request) => req.requestId || '');
morgan.token('wallet', (req: Request) => req.walletAddress || '');
morgan.token('duration', (req: Request) => {
  if (req.startTime) {
    return `${Date.now() - req.startTime}ms`;
  }
  return '';
});

// Custom morgan format for development
const developmentFormat = ':id :method :url :status :res[content-length] - :response-time ms - :wallet';

// Custom morgan format for production
const productionFormat = JSON.stringify({
  requestId: ':id',
  method: ':method',
  url: ':url',
  status: ':status',
  contentLength: ':res[content-length]',
  responseTime: ':response-time ms',
  userAgent: ':user-agent',
  remoteAddr: ':remote-addr',
  walletAddress: ':wallet',
  referrer: ':referrer',
  timestamp: ':date[iso]'
});

// Create morgan middleware
export const createMorganMiddleware = () => {
  const format = process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat;
  
  return morgan(format, {
    stream: {
      write: (message: string) => {
        // Parse JSON format in production for structured logging
        if (process.env.NODE_ENV === 'production') {
          try {
            const logData = JSON.parse(message.trim());
            logger.info('HTTP Request Completed', { ...logData, source: 'morgan' });
          } catch (e) {
            logger.info(message.trim(), { source: 'morgan' });
          }
        } else {
          // In development, just log the formatted message
          console.log(message.trim());
        }
      }
    },
    skip: (req: Request) => {
      // Skip logging for health checks in production
      return process.env.NODE_ENV === 'production' && req.path === '/health';
    }
  });
};

// Error request logging middleware
export function errorRequestLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  if (!req.requestId) {
    return next(err);
  }
  
  const errorData = {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: filterSensitiveData(req.headers),
      body: shouldLogBody(req) ? filterSensitiveData(req.body) : undefined,
      query: req.query,
      params: req.params,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      walletAddress: req.walletAddress
    },
    performance: req.startTime ? { duration: Date.now() - req.startTime } : undefined
  };
  
  logger.error('HTTP Request Error', errorData);
  
  next(err);
}

// Final request completion logger
export function requestCompletionLogger(req: Request, res: Response, next: NextFunction) {
  // Log when request completes
  res.on('finish', () => {
    if (req.requestId && req.startTime) {
      const duration = Date.now() - req.startTime;
      logger.info('HTTP Request Completed', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        performance: { duration },
        contentLength: res.getHeader('content-length'),
        walletAddress: req.walletAddress
      });
    }
  });
  
  next();
}