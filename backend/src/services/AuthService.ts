import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/types';
import logger from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  walletAddress?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  walletAddress?: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email?: string;
  walletAddress?: string;
  password?: string;
  signature?: string;
}

export interface RegisterData {
  email?: string;
  walletAddress?: string;
  password?: string;
  role?: 'user' | 'admin';
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'USER_NOT_FOUND' | 'USER_EXISTS' | 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================================================
// Auth Service
// ============================================================================

export class AuthService {
  private supabase;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string = '7d';

  constructor(private config: AppConfig) {
    this.supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceRoleKey || config.database.supabase.anonKey
    );
    this.jwtSecret = config.security.jwt.secret;
    this.jwtExpiresIn = config.security.jwt.expiresIn;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: User): AuthTokens {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as jwt.SignOptions);

    // Parse expiration time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TE.TaskEither<AuthError, AuthTokenPayload> {
    return TE.tryCatch(
      async () => {
        const payload = jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
        return payload;
      },
      (error) => {
        if (error instanceof jwt.TokenExpiredError) {
          return new AuthError('Token has expired', 'TOKEN_EXPIRED');
        }
        if (error instanceof jwt.JsonWebTokenError) {
          return new AuthError('Invalid token', 'TOKEN_INVALID');
        }
        return new AuthError('Token verification failed', 'TOKEN_INVALID');
      }
    );
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): TE.TaskEither<AuthError, AuthTokens> {
    return pipe(
      this.verifyToken(refreshToken),
      TE.chain((payload) =>
        TE.tryCatch(
          async () => {
            // Get fresh user data
            const { data: user, error } = await this.supabase
              .from('users')
              .select('*')
              .eq('id', payload.userId)
              .single();

            if (error || !user) {
              throw new AuthError('User not found', 'USER_NOT_FOUND');
            }

            return this.generateTokens(user);
          },
          (error) => error as AuthError
        )
      )
    );
  }

  /**
   * Register new user
   */
  register(data: RegisterData): TE.TaskEither<AuthError, { user: User; tokens: AuthTokens }> {
    return TE.tryCatch(
      async () => {
        // Check if user exists
        if (data.email) {
          const { data: existingUser } = await this.supabase
            .from('users')
            .select('id')
            .eq('email', data.email)
            .single();

          if (existingUser) {
            throw new AuthError('User with this email already exists', 'USER_EXISTS');
          }
        }

        if (data.walletAddress) {
          const { data: existingUser } = await this.supabase
            .from('users')
            .select('id')
            .eq('wallet_address', data.walletAddress)
            .single();

          if (existingUser) {
            throw new AuthError('User with this wallet already exists', 'USER_EXISTS');
          }
        }

        // Hash password if provided (using crypto for now)
        let hashedPassword: string | undefined;
        if (data.password) {
          hashedPassword = crypto
            .createHash('sha256')
            .update(data.password + this.jwtSecret)
            .digest('hex');
        }

        // Create user
        const userData = {
          email: data.email,
          wallet_address: data.walletAddress,
          password_hash: hashedPassword,
          role: data.role || 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newUser, error } = await this.supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (error || !newUser) {
          throw new AuthError('Failed to create user', 'USER_EXISTS');
        }

        const user: User = {
          id: newUser.id,
          email: newUser.email,
          walletAddress: newUser.wallet_address,
          role: newUser.role,
          createdAt: new Date(newUser.created_at),
          updatedAt: new Date(newUser.updated_at),
        };

        const tokens = this.generateTokens(user);

        logger.info('User registered successfully', { userId: user.id, email: user.email });

        return { user, tokens };
      },
      (error) => {
        logger.error('Registration failed', { error });
        return error instanceof AuthError ? error : new AuthError('Registration failed', 'USER_EXISTS');
      }
    );
  }

  /**
   * Login user
   */
  login(credentials: LoginCredentials): TE.TaskEither<AuthError, { user: User; tokens: AuthTokens }> {
    return TE.tryCatch(
      async () => {
        let query = this.supabase.from('users').select('*');

        // Build query based on credentials
        if (credentials.email) {
          query = query.eq('email', credentials.email);
        } else if (credentials.walletAddress) {
          query = query.eq('wallet_address', credentials.walletAddress);
        } else {
          throw new AuthError('Email or wallet address required', 'INVALID_CREDENTIALS');
        }

        const { data: userData, error } = await query.single();

        if (error || !userData) {
          throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
        }

        // Verify password if email login
        if (credentials.email && credentials.password) {
          if (!userData.password_hash) {
            throw new AuthError('Password not set for this account', 'INVALID_CREDENTIALS');
          }

          const hashedInput = crypto
            .createHash('sha256')
            .update(credentials.password + this.jwtSecret)
            .digest('hex');
          
          if (hashedInput !== userData.password_hash) {
            throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
          }
        }

        // TODO: Verify wallet signature if wallet login
        if (credentials.walletAddress && credentials.signature) {
          // Implement wallet signature verification
          // This would verify that the signature matches the wallet address
        }

        const user: User = {
          id: userData.id,
          email: userData.email,
          walletAddress: userData.wallet_address,
          role: userData.role,
          createdAt: new Date(userData.created_at),
          updatedAt: new Date(userData.updated_at),
        };

        const tokens = this.generateTokens(user);

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        return { user, tokens };
      },
      (error) => {
        logger.error('Login failed', { error });
        return error instanceof AuthError ? error : new AuthError('Login failed', 'INVALID_CREDENTIALS');
      }
    );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): TE.TaskEither<AuthError, User> {
    return TE.tryCatch(
      async () => {
        const { data: userData, error } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !userData) {
          throw new AuthError('User not found', 'USER_NOT_FOUND');
        }

        const user: User = {
          id: userData.id,
          email: userData.email,
          walletAddress: userData.wallet_address,
          role: userData.role,
          createdAt: new Date(userData.created_at),
          updatedAt: new Date(userData.updated_at),
        };

        return user;
      },
      (error) => {
        logger.error('Failed to get user', { userId, error });
        return error instanceof AuthError ? error : new AuthError('Failed to get user', 'USER_NOT_FOUND');
      }
    );
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<User>): TE.TaskEither<AuthError, User> {
    return TE.tryCatch(
      async () => {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.walletAddress !== undefined) updateData.wallet_address = updates.walletAddress;
        if (updates.role !== undefined) updateData.role = updates.role;

        const { data: userData, error } = await this.supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (error || !userData) {
          throw new AuthError('Failed to update user', 'USER_NOT_FOUND');
        }

        const user: User = {
          id: userData.id,
          email: userData.email,
          walletAddress: userData.wallet_address,
          role: userData.role,
          createdAt: new Date(userData.created_at),
          updatedAt: new Date(userData.updated_at),
        };

        logger.info('User updated successfully', { userId: user.id });

        return user;
      },
      (error) => {
        logger.error('Failed to update user', { userId, error });
        return error instanceof AuthError ? error : new AuthError('Failed to update user', 'USER_NOT_FOUND');
      }
    );
  }
}

// ============================================================================
// Factory
// ============================================================================

let authServiceInstance: AuthService | null = null;

export function getAuthService(config: AppConfig): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(config);
  }
  return authServiceInstance;
}