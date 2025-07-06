import { supabase, validateUserId, sanitizeInput } from './supabase.js';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Apply security headers to response
export const applySecurityHeaders = (res) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

// Rate limiting middleware
export const checkRateLimit = (req, config = { requests: 60, window: 60000 }) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             'unknown';
  
  const now = Date.now();
  const windowStart = now - config.window;
  const key = `${ip}:${req.url}`;
  
  // Clean old entries
  for (const [storeKey, data] of rateLimitStore.entries()) {
    const filtered = data.requests.filter(timestamp => timestamp > windowStart);
    if (filtered.length === 0) {
      rateLimitStore.delete(storeKey);
    } else {
      rateLimitStore.set(storeKey, { ...data, requests: filtered });
    }
  }
  
  // Check current rate
  const current = rateLimitStore.get(key) || { requests: [] };
  const recentRequests = current.requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= config.requests) {
    return {
      allowed: false,
      resetTime: Math.ceil((Math.min(...recentRequests) + config.window) / 1000),
      retryAfter: Math.ceil(config.window / 1000)
    };
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(key, { requests: recentRequests });
  
  return {
    allowed: true,
    remaining: config.requests - recentRequests.length,
    resetTime: Math.ceil((now + config.window) / 1000)
  };
};

// Standard API error responses
export const API_ERRORS = {
  INVALID_METHOD: (allowedMethods = ['GET', 'POST']) => ({
    success: false,
    error: 'Method not allowed',
    message: `Only ${allowedMethods.join(', ')} requests are supported`,
    code: 405
  }),
  
  RATE_LIMIT_EXCEEDED: (retryAfter = 60) => ({
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please wait before trying again.',
    retryAfter,
    code: 429
  }),
  
  MISSING_USER_ID: {
    success: false,
    error: 'Missing or invalid user ID',
    message: 'User ID is required in headers (x-user-id or user-id)',
    code: 400
  },
  
  INVALID_SESSION_ID: {
    success: false,
    error: 'Missing or invalid session ID',
    code: 400
  },
  
  SESSION_NOT_FOUND: {
    success: false,
    error: 'Session not found or access denied',
    code: 404
  },
  
  INVALID_PAGINATION: {
    success: false,
    error: 'Invalid pagination parameters',
    code: 400
  },
  
  INVALID_REQUEST_BODY: {
    success: false,
    error: 'Invalid request body',
    code: 400
  },
  
  INTERNAL_SERVER_ERROR: {
    success: false,
    error: 'Internal server error',
    code: 500
  }
};

// Validate user authentication
export const validateUserAuth = (req) => {
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  
  if (!userId || !validateUserId(userId)) {
    return { valid: false, error: API_ERRORS.MISSING_USER_ID };
  }
  
  return { valid: true, userId };
};

// Validate session ID
export const validateSessionId = (sessionId, allowNew = false) => {
  if (allowNew && sessionId === 'new') {
    return { valid: true, sessionId: null, isNew: true };
  }
  
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: API_ERRORS.INVALID_SESSION_ID };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return { valid: false, error: API_ERRORS.INVALID_SESSION_ID };
  }
  
  return { valid: true, sessionId, isNew: false };
};

// Validate pagination parameters
export const validatePagination = (query) => {
  const {
    page = '1',
    limit = '20',
    cursor = null,
    order = 'desc'
  } = query;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return { valid: false, error: API_ERRORS.INVALID_PAGINATION };
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { valid: false, error: API_ERRORS.INVALID_PAGINATION };
  }
  
  if (order !== 'asc' && order !== 'desc') {
    return { valid: false, error: API_ERRORS.INVALID_PAGINATION };
  }
  
  const offset = (pageNum - 1) * limitNum;
  
  return {
    valid: true,
    pagination: {
      page: pageNum,
      limit: limitNum,
      offset,
      cursor: cursor ? sanitizeInput(cursor) : null,
      order
    }
  };
};

// Validate request body
export const validateRequestBody = (body, requiredFields = [], maxSize = 1000) => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: API_ERRORS.INVALID_REQUEST_BODY };
  }
  
  // Check required fields
  const missingFields = requiredFields.filter(field => !(field in body));
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: {
        ...API_ERRORS.INVALID_REQUEST_BODY,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }
    };
  }
  
  // Check body size (rough estimate)
  const bodySize = JSON.stringify(body).length;
  if (bodySize > maxSize * 1024) { // maxSize in KB
    return {
      valid: false,
      error: {
        ...API_ERRORS.INVALID_REQUEST_BODY,
        message: `Request body too large. Max size: ${maxSize}KB`
      }
    };
  }
  
  return { valid: true };
};

// Log API requests
export const logApiRequest = (req, res, startTime) => {
  const duration = Date.now() - startTime;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             'unknown';
  
  const logData = {
    method: req.method,
    url: req.url,
    ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    statusCode: res.statusCode,
    duration,
    timestamp: new Date().toISOString()
  };
  
  // Log to console (in production, use proper logging service)
  console.log(`[API] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, logData);
};

// Wrapper for API handlers with common middleware
export const withApiMiddleware = (handler, config = {}) => {
  const {
    methods = ['GET', 'POST'],
    rateLimit = { requests: 60, window: 60000 },
    requireAuth = true
  } = config;
  
  return async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Apply security headers
      applySecurityHeaders(res);
      
      // Check HTTP method
      if (!methods.includes(req.method)) {
        const error = API_ERRORS.INVALID_METHOD(methods);
        return res.status(error.code).json(error);
      }
      
      // Rate limiting
      const rateLimitResult = checkRateLimit(req, rateLimit);
      if (!rateLimitResult.allowed) {
        const error = API_ERRORS.RATE_LIMIT_EXCEEDED(rateLimitResult.retryAfter);
        res.setHeader('Retry-After', rateLimitResult.retryAfter);
        return res.status(error.code).json(error);
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimit.requests);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
      
      // Authentication check
      if (requireAuth) {
        const authResult = validateUserAuth(req);
        if (!authResult.valid) {
          return res.status(authResult.error.code).json(authResult.error);
        }
        req.userId = authResult.userId;
      }
      
      // Call the actual handler
      await handler(req, res);
      
    } catch (error) {
      console.error('API Middleware Error:', error);
      return res.status(500).json(API_ERRORS.INTERNAL_SERVER_ERROR);
    } finally {
      // Log the request
      logApiRequest(req, res, startTime);
    }
  };
};

// Helper to create consistent API responses
export const createApiResponse = (success, data = null, error = null, code = 200) => {
  const response = { success };
  
  if (success && data) {
    Object.assign(response, data);
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  return { response, code };
};

// Helper to handle database errors
export const handleDatabaseError = (error, context = 'Database operation') => {
  console.error(`${context} failed:`, error);
  
  // Map common database errors to user-friendly messages
  const errorMappings = {
    '23505': 'Duplicate entry',
    '23503': 'Referenced record not found',
    '23514': 'Invalid data format',
    '42P01': 'Table not found',
    '28000': 'Authentication failed'
  };
  
  const userMessage = errorMappings[error.code] || 'Database error occurred';
  
  return {
    success: false,
    error: userMessage,
    code: 500
  };
};

export default {
  applySecurityHeaders,
  checkRateLimit,
  API_ERRORS,
  validateUserAuth,
  validateSessionId,
  validatePagination,
  validateRequestBody,
  withApiMiddleware,
  createApiResponse,
  handleDatabaseError
};