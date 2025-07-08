import { Router } from 'express';
import * as E from 'fp-ts/Either';
import { getAuthService } from '../services/AuthService';
import { getConfig } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import { optionalAuth, requireAuth } from '../middleware/authenticate';
import logger from '../utils/logger';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    password: z.string().min(8).optional(),
    signature: z.string().optional(),
  }).refine(
    (data) => (data.email && data.password) || (data.walletAddress && data.signature),
    'Either email/password or walletAddress/signature must be provided'
  ),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['user', 'admin']).optional(),
  }).refine(
    (data) => data.email || data.walletAddress,
    'Either email or walletAddress must be provided'
  ),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  }),
});

// ============================================================================
// Route Handlers
// ============================================================================

const router = Router();
const authService = getAuthService(getConfig());

/**
 * Register new user
 * POST /auth/register
 */
router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body)();

    if (E.isLeft(result)) {
      const error = result.left;
      const statusCode = error.code === 'USER_EXISTS' ? 409 : 400;
      
      logger.warn('Registration failed', { 
        error: error.message,
        code: error.code,
        email: req.body.email,
        walletAddress: req.body.walletAddress 
      });

      return res.status(statusCode).json({
        error: 'Registration failed',
        message: error.message,
        code: error.code,
      });
    }

    const { user, tokens } = result.right;

    logger.info('User registered', { 
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress 
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      tokens,
    });
  })
);

/**
 * Login user
 * POST /auth/login
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body)();

    if (E.isLeft(result)) {
      const error = result.left;
      
      logger.warn('Login failed', { 
        error: error.message,
        code: error.code,
        email: req.body.email,
        walletAddress: req.body.walletAddress 
      });

      return res.status(401).json({
        error: 'Login failed',
        message: error.message,
        code: error.code,
      });
    }

    const { user, tokens } = result.right;

    logger.info('User logged in', { 
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress 
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      tokens,
    });
  })
);

/**
 * Refresh access token
 * POST /auth/refresh
 */
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshAccessToken(req.body.refreshToken)();

    if (E.isLeft(result)) {
      const error = result.left;
      
      logger.warn('Token refresh failed', { 
        error: error.message,
        code: error.code 
      });

      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message,
        code: error.code,
      });
    }

    const tokens = result.right;

    logger.info('Token refreshed successfully');

    res.json({ tokens });
  })
);

/**
 * Get current user
 * GET /auth/me
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const user = req.user;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  })
);

/**
 * Update current user
 * PUT /auth/me
 */
router.put(
  '/me',
  requireAuth,
  validateRequest(updateUserSchema),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const result = await authService.updateUser(userId, req.body)();

    if (E.isLeft(result)) {
      const error = result.left;
      
      logger.warn('User update failed', { 
        error: error.message,
        code: error.code,
        userId 
      });

      return res.status(400).json({
        error: 'Update failed',
        message: error.message,
        code: error.code,
      });
    }

    const user = result.right;

    logger.info('User updated', { 
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress 
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  })
);

/**
 * Logout user (client-side token removal)
 * POST /auth/logout
 */
router.post(
  '/logout',
  optionalAuth,
  asyncHandler(async (req: any, res) => {
    if (req.user) {
      logger.info('User logged out', { 
        userId: req.user.id,
        email: req.user.email 
      });
    }

    // In a stateless JWT system, logout is handled client-side
    // This endpoint is mainly for logging and future session management
    res.json({
      message: 'Logged out successfully',
    });
  })
);

export default router;