/**
 * Comprehensive Security Middleware for Railway Deployment
 * Implements industry-standard security practices for production environments
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '../utils/logger';
import { securityAuditService } from '../services/SecurityAuditService';
import { apiKeyValidationService } from '../services/ApiKeyValidationService';
import { rateLimitMiddleware } from './apiKeyRateLimit';
import { apiKeyMiddleware } from './apiKeyErrorHandler';
import { createMcpAuthMiddleware, mcpHealthCheck } from './mcpAuthentication';

// Security configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = !!process.env.RAILWAY_ENVIRONMENT_ID;

/**
 * Enhanced Helmet configuration for Railway deployment
 */
export const createHelmetMiddleware = (): RequestHandler => {
  const helmetConfig = {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          // Add your frontend domains
          process.env.FRONTEND_URL || "http://localhost:3000",
          // Sei Network endpoints
          "https://rpc.sei-apis.com",
          "https://rest.sei-apis.com",
          "https://evm-rpc.sei-apis.com",
          // WebSocket connections
          "wss:",
          "ws:",
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : undefined,
      },
      reportOnly: !isProduction, // Report only in development
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny',
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: false,

    // Hide X-Powered-By header
    hidePoweredBy: true,
  };

  return helmet(helmetConfig);
};

/**
 * Enhanced rate limiting for Railway deployment
 */
export const createRateLimitMiddleware = () => {
  const baseConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready' || req.path === '/alive';
    },
    keyGenerator: (req: Request) => {
      // Use Railway's real IP if available, otherwise fallback to connection IP
      return req.headers['x-forwarded-for'] as string || 
             req.headers['x-real-ip'] as string ||
             req.connection.remoteAddress ||
             req.ip;
    },
    onLimitReached: (req: Request, res: Response) => {
      logger.warn('Rate limit reached', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
    },
  };

  return {
    // General API rate limiting
    general: rateLimit({
      ...baseConfig,
      max: isProduction ? 100 : 1000, // Stricter in production
    }),

    // Stricter rate limiting for authentication endpoints
    auth: rateLimit({
      ...baseConfig,
      max: 10, // Very strict for auth
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes',
      },
    }),

    // Moderate rate limiting for chat/AI endpoints
    ai: rateLimit({
      ...baseConfig,
      max: 30, // Moderate for AI endpoints
      windowMs: 10 * 60 * 1000, // 10 minutes
    }),

    // Lenient rate limiting for portfolio data
    portfolio: rateLimit({
      ...baseConfig,
      max: 200, // More lenient for data fetching
      windowMs: 15 * 60 * 1000, // 15 minutes
    }),
  };
};

/**
 * CORS configuration for Railway deployment
 */
export const createCorsOptions = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    // Add Railway frontend URL if available
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    // Add other trusted origins
  ].filter(Boolean);

  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin && !isProduction) {
        return callback(null, true);
      }

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add custom security headers
  res.setHeader('X-API-Version', process.env.SERVICE_VERSION || '1.0.0');
  res.setHeader('X-Service-Name', process.env.SERVICE_NAME || 'seiron-backend');
  
  // Railway-specific headers
  if (isRailway) {
    res.setHeader('X-Deployment-ID', process.env.RAILWAY_DEPLOYMENT_ID || 'unknown');
    res.setHeader('X-Environment', process.env.RAILWAY_ENVIRONMENT_NAME || 'unknown');
  }

  next();
};

/**
 * Input validation and sanitization middleware
 */
export const inputSanitization: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Basic XSS protection
        obj[key] = obj[key]
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>?/gm, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Request size limiting middleware
 */
export const createRequestSizeLimit = () => {
  return {
    json: {
      limit: '10mb', // Adjust based on your needs
      type: 'application/json',
    },
    urlencoded: {
      limit: '10mb',
      extended: true,
    },
    raw: {
      limit: '50mb', // For file uploads if needed
    },
  };
};

/**
 * IP allowlist/blocklist middleware
 */
export const createIPFilterMiddleware = () => {
  const blockedIPs = (process.env.BLOCKED_IPS || '').split(',').filter(Boolean);
  const allowedIPs = (process.env.ALLOWED_IPS || '').split(',').filter(Boolean);

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string ||
                     req.connection.remoteAddress ||
                     req.ip;

    // Check blocklist
    if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
      logger.warn('Blocked IP attempted access', { ip: clientIP, path: req.path });
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check allowlist (if configured)
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn('Non-whitelisted IP attempted access', { ip: clientIP, path: req.path });
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

/**
 * Enhanced API key validation middleware for internal services
 */
export const validateAPIKey: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      // Log missing API key attempt
      securityAuditService.logApiKeyEvent(
        false,
        undefined,
        req.ip,
        req.get('User-Agent'),
        'Missing API key'
      );
      
      return res.status(401).json({ 
        error: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }

    // Use the comprehensive API key validation service
    const validationResult = await apiKeyValidationService.validateKey(
      apiKey,
      ['internal_operations'],
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      }
    );

    if (!validationResult.isValid) {
      return res.status(401).json({ 
        error: validationResult.reason || 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
    }

    // Add key config to request for downstream middleware
    (req as any).apiKeyConfig = validationResult.keyConfig;
    
    next();
  } catch (error) {
    logger.error('API key validation error', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
      path: req.path
    });
    
    res.status(500).json({ 
      error: 'Internal validation error',
      code: 'API_KEY_VALIDATION_ERROR' 
    });
  }
};

/**
 * Security monitoring middleware
 */
export const securityMonitoring: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Monitor response to track success/failure
  const originalSend = res.send;
  res.send = function(body: any) {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    // Log security-relevant events
    if (isError) {
      securityAuditService.logEvent({
        eventType: 'system_security_event',
        severity: res.statusCode >= 500 ? 'high' : 'medium',
        source: 'security_monitoring',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        success: false,
        message: `HTTP ${res.statusCode} response for ${req.method} ${req.path}`,
        metadata: {
          statusCode: res.statusCode,
          responseTime,
          contentLength: body?.length || 0
        }
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Startup security validation
 */
export const validateSecurityConfiguration = async (): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate API keys
    const keyValidation = apiKeyValidationService.validateRequiredKeys();
    if (keyValidation._tag === 'Left') {
      errors.push(...keyValidation.left.map(e => e.message));
    }

    // Check security audit service
    const auditMetrics = securityAuditService.getMetrics();
    logger.info('Security audit service initialized', {
      alertConfigCount: auditMetrics.alertConfigs.length
    });

    // Validate environment-specific security settings
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.INTERNAL_API_KEY) {
        errors.push('INTERNAL_API_KEY is required in production');
      }
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required in production');
      }
      if (!process.env.REDIS_URL) {
        warnings.push('REDIS_URL not configured - some security features may be limited');
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Security configuration validation failed: ${error}`],
      warnings
    };
  }
};

/**
 * Comprehensive security middleware factory
 */
export const createSecurityMiddleware = () => {
  const helmet = createHelmetMiddleware();
  const rateLimits = createRateLimitMiddleware();
  const requestSizeLimits = createRequestSizeLimit();
  const ipFilter = createIPFilterMiddleware();

  return {
    // Core security
    helmet,
    rateLimits,
    requestSizeLimits,
    securityHeaders,
    inputSanitization,
    ipFilter,
    securityMonitoring,
    
    // API key security
    validateAPIKey,
    apiKeyValidation: apiKeyMiddleware.validate,
    apiKeyValidationOptional: apiKeyMiddleware.validateOptional,
    apiKeyErrorHandler: apiKeyMiddleware.errorHandler,
    
    // Rate limiting
    smartRateLimit: rateLimitMiddleware.smart,
    burstProtection: rateLimitMiddleware.burstProtection,
    
    // MCP security
    mcpAuth: createMcpAuthMiddleware,
    mcpHealthCheck,
    
    // Validation
    validateSecurityConfiguration
  };
};

export default createSecurityMiddleware;