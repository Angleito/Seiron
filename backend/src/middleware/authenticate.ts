import { Request, Response, NextFunction } from 'express';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { getAuthService, AuthTokenPayload, User } from '../services/AuthService';
import { getConfig } from '../config';
import logger from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: User;
  auth?: AuthTokenPayload;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: ('user' | 'admin')[];
  allowExpired?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader: string | undefined): E.Either<string, string> => {
  if (!authHeader) {
    return E.left('Authorization header missing');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return E.left('Invalid authorization header format');
  }

  return E.right(parts[1]);
};

/**
 * Validate user role
 */
const validateRole = (userRole: string, allowedRoles: string[]): boolean => {
  return allowedRoles.includes(userRole);
};

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create authentication middleware with options
 */
export const authenticate = (options: AuthMiddlewareOptions = {}) => {
  const { required = true, roles = [], allowExpired = false } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authService = getAuthService(getConfig());

    // Extract token from header
    const tokenResult = extractToken(req.headers.authorization);

    if (E.isLeft(tokenResult)) {
      if (required) {
        logger.warn('Authentication failed: No token provided', { 
          path: req.path,
          method: req.method,
          ip: req.ip 
        });
        
        return res.status(401).json({
          error: 'Authentication required',
          message: tokenResult.left,
        });
      }
      // If auth not required, continue without user
      return next();
    }

    // Verify token
    const verifyResult = await authService.verifyToken(tokenResult.right)();

    if (E.isLeft(verifyResult)) {
      if (!required && verifyResult.left.code === 'TOKEN_EXPIRED' && !allowExpired) {
        // If auth not required, continue without user
        return next();
      }

      if (allowExpired && verifyResult.left.code === 'TOKEN_EXPIRED') {
        // Decode token without verification for expired tokens (if allowed)
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(tokenResult.right) as AuthTokenPayload;
          req.auth = decoded;
          
          logger.info('Expired token allowed', { userId: decoded.userId });
          return next();
        } catch (error) {
          logger.error('Failed to decode expired token', { error });
        }
      }

      logger.warn('Authentication failed: Invalid token', { 
        path: req.path,
        method: req.method,
        error: verifyResult.left.message,
        code: verifyResult.left.code 
      });

      return res.status(401).json({
        error: 'Authentication failed',
        message: verifyResult.left.message,
        code: verifyResult.left.code,
      });
    }

    const payload = verifyResult.right;

    // Check role requirements
    if (roles.length > 0 && !validateRole(payload.role, roles)) {
      logger.warn('Authorization failed: Insufficient role', { 
        userId: payload.userId,
        userRole: payload.role,
        requiredRoles: roles,
        path: req.path 
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have the required role to access this resource',
      });
    }

    // Get full user data
    const userResult = await authService.getUserById(payload.userId)();

    if (E.isLeft(userResult)) {
      logger.error('Failed to get user data', { 
        userId: payload.userId,
        error: userResult.left 
      });

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found',
      });
    }

    // Attach user and auth payload to request
    req.user = userResult.right;
    req.auth = payload;

    logger.info('Request authenticated', { 
      userId: payload.userId,
      email: payload.email,
      path: req.path,
      method: req.method 
    });

    next();
  };
};

// ============================================================================
// Convenience Middleware
// ============================================================================

/**
 * Require authentication
 */
export const requireAuth = authenticate({ required: true });

/**
 * Optional authentication
 */
export const optionalAuth = authenticate({ required: false });

/**
 * Require admin role
 */
export const requireAdmin = authenticate({ required: true, roles: ['admin'] });

/**
 * Require user or admin role
 */
export const requireUser = authenticate({ required: true, roles: ['user', 'admin'] });

// ============================================================================
// WebSocket Authentication
// ============================================================================

/**
 * Authenticate WebSocket connection
 */
export const authenticateWebSocket = async (
  token: string
): Promise<E.Either<string, AuthTokenPayload>> => {
  const authService = getAuthService(getConfig());
  
  const result = await authService.verifyToken(token)();
  
  if (E.isLeft(result)) {
    logger.warn('WebSocket authentication failed', { 
      error: result.left.message,
      code: result.left.code 
    });
    return E.left(result.left.message);
  }

  logger.info('WebSocket authenticated', { 
    userId: result.right.userId,
    email: result.right.email 
  });

  return E.right(result.right);
};

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Get authenticated user from request
 */
export const getAuthUser = (req: AuthenticatedRequest): User | undefined => {
  return req.user;
};

/**
 * Get auth payload from request
 */
export const getAuthPayload = (req: AuthenticatedRequest): AuthTokenPayload | undefined => {
  return req.auth;
};

/**
 * Check if request is authenticated
 */
export const isAuthenticated = (req: AuthenticatedRequest): boolean => {
  return !!req.user && !!req.auth;
};

/**
 * Check if user has role
 */
export const hasRole = (req: AuthenticatedRequest, role: string): boolean => {
  return req.auth?.role === role;
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: AuthenticatedRequest): boolean => {
  return hasRole(req, 'admin');
};