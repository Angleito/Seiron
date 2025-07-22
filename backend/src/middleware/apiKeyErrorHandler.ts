import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Either, left, right } from 'fp-ts/Either';
import logger from '../utils/logger';
import { securityAuditService } from '../services/SecurityAuditService';
import { apiKeyValidationService } from '../services/ApiKeyValidationService';

/**
 * API Key Error Types
 */
export type ApiKeyErrorType =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'EXPIRED_API_KEY'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'KEY_VALIDATION_ERROR'
  | 'MALFORMED_KEY'
  | 'SUSPICIOUS_ACTIVITY'
  | 'INTERNAL_ERROR';

/**
 * API Key Error Details
 */
export interface ApiKeyError extends Error {
  type: ApiKeyErrorType;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
  retryAfter?: number;
  correlationId?: string;
}

/**
 * Error Response Format
 */
interface ApiKeyErrorResponse {
  error: string;
  message: string;
  code: string;
  type: ApiKeyErrorType;
  statusCode: number;
  timestamp: string;
  correlationId: string;
  details?: Record<string, unknown>;
  retryAfter?: number;
  documentation?: string;
}

/**
 * API Key Error Factory
 */
export class ApiKeyErrorFactory {
  private static correlationCounter = 0;

  /**
   * Generate correlation ID for error tracking
   */
  private static generateCorrelationId(): string {
    this.correlationCounter = (this.correlationCounter + 1) % 1000000;
    return `apierr_${Date.now()}_${this.correlationCounter.toString().padStart(6, '0')}`;
  }

  /**
   * Create missing API key error
   */
  static createMissingApiKeyError(
    message: string = 'API key is required',
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(message) as ApiKeyError;
    error.type = 'MISSING_API_KEY';
    error.code = 'API_KEY_MISSING';
    error.statusCode = 401;
    error.details = details;
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create invalid API key error
   */
  static createInvalidApiKeyError(
    message: string = 'Invalid API key',
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(message) as ApiKeyError;
    error.type = 'INVALID_API_KEY';
    error.code = 'API_KEY_INVALID';
    error.statusCode = 401;
    error.details = details;
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create expired API key error
   */
  static createExpiredApiKeyError(
    expirationDate?: Date,
    details?: Record<string, unknown>
  ): ApiKeyError {
    const message = expirationDate 
      ? `API key expired on ${expirationDate.toISOString()}`
      : 'API key has expired';
    
    const error = new Error(message) as ApiKeyError;
    error.type = 'EXPIRED_API_KEY';
    error.code = 'API_KEY_EXPIRED';
    error.statusCode = 401;
    error.details = { ...details, expirationDate };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create insufficient permissions error
   */
  static createInsufficientPermissionsError(
    requiredScopes: string[],
    availableScopes: string[],
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error('Insufficient permissions for this operation') as ApiKeyError;
    error.type = 'INSUFFICIENT_PERMISSIONS';
    error.code = 'API_KEY_INSUFFICIENT_PERMISSIONS';
    error.statusCode = 403;
    error.details = {
      ...details,
      requiredScopes,
      availableScopes,
      missingScopes: requiredScopes.filter(scope => !availableScopes.includes(scope))
    };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create rate limit exceeded error
   */
  static createRateLimitExceededError(
    retryAfter: number,
    limit: number,
    current: number,
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(`API key rate limit exceeded: ${current}/${limit} requests`) as ApiKeyError;
    error.type = 'RATE_LIMIT_EXCEEDED';
    error.code = 'API_KEY_RATE_LIMIT_EXCEEDED';
    error.statusCode = 429;
    error.retryAfter = retryAfter;
    error.details = {
      ...details,
      limit,
      current,
      retryAfterSeconds: retryAfter
    };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create malformed key error
   */
  static createMalformedKeyError(
    reason: string,
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(`Malformed API key: ${reason}`) as ApiKeyError;
    error.type = 'MALFORMED_KEY';
    error.code = 'API_KEY_MALFORMED';
    error.statusCode = 400;
    error.details = { ...details, reason };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create suspicious activity error
   */
  static createSuspiciousActivityError(
    description: string,
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(`Suspicious activity detected: ${description}`) as ApiKeyError;
    error.type = 'SUSPICIOUS_ACTIVITY';
    error.code = 'API_KEY_SUSPICIOUS_ACTIVITY';
    error.statusCode = 403;
    error.details = { ...details, description };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create validation error
   */
  static createValidationError(
    validationReason: string,
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(`API key validation failed: ${validationReason}`) as ApiKeyError;
    error.type = 'KEY_VALIDATION_ERROR';
    error.code = 'API_KEY_VALIDATION_ERROR';
    error.statusCode = 401;
    error.details = { ...details, validationReason };
    error.correlationId = this.generateCorrelationId();
    return error;
  }

  /**
   * Create internal error
   */
  static createInternalError(
    message: string = 'Internal error during API key processing',
    details?: Record<string, unknown>
  ): ApiKeyError {
    const error = new Error(message) as ApiKeyError;
    error.type = 'INTERNAL_ERROR';
    error.code = 'API_KEY_INTERNAL_ERROR';
    error.statusCode = 500;
    error.details = details;
    error.correlationId = this.generateCorrelationId();
    return error;
  }
}

/**
 * API Key Error Handler Middleware
 */
export class ApiKeyErrorHandler {
  private readonly documentationBaseUrl: string;

  constructor(documentationBaseUrl: string = '/docs/api-keys') {
    this.documentationBaseUrl = documentationBaseUrl;
  }

  /**
   * Create error handling middleware
   */
  public createErrorHandler(): ErrorRequestHandler {
    return (error: Error | ApiKeyError, req: Request, res: Response, next: NextFunction): void => {
      // Skip if response already sent
      if (res.headersSent) {
        return next(error);
      }

      // Check if it's an API key error
      if (!this.isApiKeyError(error)) {
        return next(error);
      }

      const apiKeyError = error as ApiKeyError;
      
      // Log the error for monitoring
      this.logError(apiKeyError, req);

      // Create error response
      const errorResponse = this.createErrorResponse(apiKeyError, req);

      // Set appropriate headers
      this.setErrorHeaders(res, apiKeyError);

      // Send error response
      res.status(apiKeyError.statusCode).json(errorResponse);
    };
  }

  /**
   * Create API key validation middleware with error handling
   */
  public createValidationMiddleware(
    requiredScopes: string[] = [],
    options: {
      optional?: boolean;
      skipForDevelopment?: boolean;
      customValidator?: (apiKey: string, req: Request) => Promise<Either<ApiKeyError, any>>;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const apiKey = this.extractApiKey(req);

        // Handle missing API key
        if (!apiKey) {
          if (options.optional) {
            return next();
          }

          if (options.skipForDevelopment && process.env.NODE_ENV === 'development') {
            return next();
          }

          const error = ApiKeyErrorFactory.createMissingApiKeyError(
            'API key is required for this endpoint',
            {
              endpoint: req.path,
              method: req.method,
              requiredScopes
            }
          );
          return next(error);
        }

        // Validate API key format
        const formatValidation = this.validateApiKeyFormat(apiKey);
        if (formatValidation._tag === 'Left') {
          return next(formatValidation.left);
        }

        // Use custom validator if provided
        if (options.customValidator) {
          const customResult = await options.customValidator(apiKey, req);
          if (customResult._tag === 'Left') {
            return next(customResult.left);
          }
        } else {
          // Use default API key validation service
          const validationResult = await apiKeyValidationService.validateKey(
            apiKey,
            requiredScopes,
            {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              endpoint: req.path
            }
          );

          if (!validationResult.isValid) {
            const error = this.createValidationError(validationResult, req);
            return next(error);
          }

          // Add key config to request for downstream use
          if (validationResult.keyConfig) {
            (req as any).apiKeyConfig = validationResult.keyConfig;
          }
        }

        // Audit successful validation
        securityAuditService.logApiKeyEvent(
          true,
          (req as any).apiKeyConfig?.name,
          req.ip,
          req.get('User-Agent'),
          'Validation successful'
        );

        next();
      } catch (error) {
        logger.error('API key validation middleware error', {
          error: error instanceof Error ? error.message : String(error),
          endpoint: req.path,
          ip: req.ip
        });

        const internalError = ApiKeyErrorFactory.createInternalError(
          'Internal error during API key validation',
          {
            originalError: error instanceof Error ? error.message : String(error),
            endpoint: req.path
          }
        );
        
        next(internalError);
      }
    };
  }

  /**
   * Check if error is an API key error
   */
  private isApiKeyError(error: Error): boolean {
    return 'type' in error && 'code' in error && 'statusCode' in error;
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(req: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (not recommended for production)
    const queryApiKey = req.query.api_key as string;
    if (queryApiKey && process.env.NODE_ENV !== 'production') {
      return queryApiKey;
    }

    return null;
  }

  /**
   * Validate API key format
   */
  private validateApiKeyFormat(apiKey: string): Either<ApiKeyError, string> {
    if (!apiKey || typeof apiKey !== 'string') {
      return left(ApiKeyErrorFactory.createMalformedKeyError('API key must be a non-empty string'));
    }

    if (apiKey.length < 16) {
      return left(ApiKeyErrorFactory.createMalformedKeyError('API key too short'));
    }

    if (apiKey.length > 512) {
      return left(ApiKeyErrorFactory.createMalformedKeyError('API key too long'));
    }

    // Check for suspicious patterns
    if (/^(test|dev|demo|sample|fake)/i.test(apiKey)) {
      return left(ApiKeyErrorFactory.createSuspiciousActivityError(
        'Detected test/development key in production environment'
      ));
    }

    // Check for common weak patterns
    if (/^(.)\1{15,}$/.test(apiKey)) {
      return left(ApiKeyErrorFactory.createMalformedKeyError('API key has insufficient entropy'));
    }

    return right(apiKey);
  }

  /**
   * Create validation error from validation result
   */
  private createValidationError(
    validationResult: any,
    req: Request
  ): ApiKeyError {
    if (validationResult.rateLimitExceeded) {
      return ApiKeyErrorFactory.createRateLimitExceededError(
        60, // Default retry after 1 minute
        0,  // We don't have the exact limit here
        0,  // We don't have the exact current count
        {
          endpoint: req.path,
          reason: validationResult.reason
        }
      );
    }

    if (validationResult.reason?.includes('expired')) {
      return ApiKeyErrorFactory.createExpiredApiKeyError(
        undefined,
        {
          endpoint: req.path,
          reason: validationResult.reason
        }
      );
    }

    if (validationResult.reason?.includes('permission')) {
      return ApiKeyErrorFactory.createInsufficientPermissionsError(
        [], // We don't have the exact scopes here
        [],
        {
          endpoint: req.path,
          reason: validationResult.reason
        }
      );
    }

    return ApiKeyErrorFactory.createInvalidApiKeyError(
      validationResult.reason || 'API key validation failed',
      {
        endpoint: req.path
      }
    );
  }

  /**
   * Log error for monitoring and audit
   */
  private logError(error: ApiKeyError, req: Request): void {
    const logData = {
      errorType: error.type,
      errorCode: error.code,
      correlationId: error.correlationId,
      statusCode: error.statusCode,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: error.details
    };

    // Log to Winston based on severity
    switch (error.type) {
      case 'SUSPICIOUS_ACTIVITY':
      case 'RATE_LIMIT_EXCEEDED':
        logger.warn(`API Key Error: ${error.message}`, logData);
        break;
      case 'INTERNAL_ERROR':
        logger.error(`API Key Error: ${error.message}`, logData);
        break;
      default:
        logger.info(`API Key Error: ${error.message}`, logData);
    }

    // Log to security audit service
    securityAuditService.logApiKeyEvent(
      false,
      undefined,
      req.ip,
      req.get('User-Agent'),
      error.message,
      {
        errorType: error.type,
        errorCode: error.code,
        correlationId: error.correlationId,
        details: error.details
      }
    );
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(error: ApiKeyError, req: Request): ApiKeyErrorResponse {
    return {
      error: 'API Key Error',
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      correlationId: error.correlationId || 'unknown',
      details: error.details,
      retryAfter: error.retryAfter,
      documentation: `${this.documentationBaseUrl}#${error.code.toLowerCase()}`
    };
  }

  /**
   * Set appropriate error headers
   */
  private setErrorHeaders(res: Response, error: ApiKeyError): void {
    res.setHeader('X-Error-Type', error.type);
    res.setHeader('X-Error-Code', error.code);
    res.setHeader('X-Correlation-ID', error.correlationId || '');

    if (error.retryAfter) {
      res.setHeader('Retry-After', error.retryAfter.toString());
    }

    if (error.statusCode === 401) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="API", charset="UTF-8"');
    }
  }
}

/**
 * Default API key error handler instance
 */
export const apiKeyErrorHandler = new ApiKeyErrorHandler();

/**
 * Pre-configured middleware exports
 */
export const apiKeyMiddleware = {
  /**
   * Standard API key validation
   */
  validate: (requiredScopes: string[] = []) => 
    apiKeyErrorHandler.createValidationMiddleware(requiredScopes),

  /**
   * Optional API key validation
   */
  validateOptional: (requiredScopes: string[] = []) =>
    apiKeyErrorHandler.createValidationMiddleware(requiredScopes, { optional: true }),

  /**
   * Validation with development skip
   */
  validateWithDevSkip: (requiredScopes: string[] = []) =>
    apiKeyErrorHandler.createValidationMiddleware(requiredScopes, { 
      skipForDevelopment: true 
    }),

  /**
   * Error handler middleware
   */
  errorHandler: apiKeyErrorHandler.createErrorHandler()
};