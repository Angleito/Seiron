import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  withAuth,
  withRateLimit,
  sanitizeJson,
  validateCSRFToken,
  RateLimitType
} from './index';
import { Redis } from '@upstash/redis';

// Initialize Redis for logging
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: RateLimitType | false;
  validateCSRF?: boolean;
  schema?: z.ZodSchema;
}

/**
 * Create a protected API route handler with common security features
 */
export function createApiHandler<T = any>(
  handler: (
    req: NextRequest, 
    context: {
      session?: any;
      body?: T;
      params?: Record<string, string>;
    }
  ) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
) {
  const {
    requireAuth = true,
    rateLimit = 'api',
    validateCSRF = true,
    schema,
  } = options;
  
  return async (
    req: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ): Promise<NextResponse> => {
    try {
      let wrappedHandler = handler;
      let context: any = { params };
      
      // Apply rate limiting
      if (rateLimit !== false) {
        wrappedHandler = withRateLimit(wrappedHandler, rateLimit);
      }
      
      // Apply authentication if required
      if (requireAuth) {
        const authHandler = withAuth(async (req, session) => {
          context.session = session;
          return wrappedHandler(req, context);
        });
        wrappedHandler = authHandler;
      }
      
      // Validate CSRF token for state-changing methods
      if (validateCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!validateCSRFToken(req)) {
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }
      }
      
      // Parse and validate body if schema is provided
      if (schema && req.body) {
        const body = await req.json();
        const validation = sanitizeJson(body, schema);
        
        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid request body', details: validation.error },
            { status: 400 }
          );
        }
        
        context.body = validation.data;
      }
      
      // Log the request
      await logApiRequest({
        path: req.url,
        method: req.method,
        authenticated: !!context.session,
        timestamp: new Date().toISOString(),
      });
      
      // Execute the handler
      const response = await wrappedHandler(req, context);
      
      // Log the response status
      await logApiResponse({
        path: req.url,
        method: req.method,
        status: response.status,
        timestamp: new Date().toISOString(),
      });
      
      return response;
      
    } catch (error) {
      console.error('API handler error:', error);
      
      // Log the error
      await logApiError({
        path: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Don't expose internal errors in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error instanceof Error ? error.message : 'Unknown error';
        
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to create public API handlers (no auth required)
 */
export function createPublicApiHandler<T = any>(
  handler: (
    req: NextRequest,
    context: {
      body?: T;
      params?: Record<string, string>;
    }
  ) => Promise<NextResponse>,
  options: Omit<ApiHandlerOptions, 'requireAuth'> = {}
) {
  return createApiHandler(handler, {
    ...options,
    requireAuth: false,
  });
}

/**
 * Helper for creating webhook handlers with signature verification
 */
export function createWebhookHandler(
  handler: (req: NextRequest, body: any) => Promise<NextResponse>,
  options: {
    secret: string;
    headerName?: string;
  }
) {
  const { secret, headerName = 'x-webhook-signature' } = options;
  
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.text();
      const signature = req.headers.get(headerName);
      
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        );
      }
      
      // Verify webhook signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        Buffer.from(signature, 'hex'),
        encoder.encode(body)
      );
      
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
      
      const parsedBody = JSON.parse(body);
      return await handler(req, parsedBody);
      
    } catch (error) {
      console.error('Webhook handler error:', error);
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      );
    }
  };
}

// Logging functions
async function logApiRequest(data: {
  path: string;
  method: string;
  authenticated: boolean;
  timestamp: string;
}) {
  try {
    const key = `api:request:${data.timestamp}:${Math.random()}`;
    await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

async function logApiResponse(data: {
  path: string;
  method: string;
  status: number;
  timestamp: string;
}) {
  try {
    const key = `api:response:${data.timestamp}:${Math.random()}`;
    await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(data));
    
    // Track response status metrics
    const metricsKey = `api:metrics:status:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrby(metricsKey, data.status.toString(), 1);
    await redis.expire(metricsKey, 30 * 24 * 60 * 60);
  } catch (error) {
    console.error('Failed to log API response:', error);
  }
}

async function logApiError(data: {
  path: string;
  method: string;
  error: string;
  timestamp: string;
}) {
  try {
    const key = `api:error:${data.timestamp}:${Math.random()}`;
    await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(data));
    
    // Track error metrics
    const metricsKey = `api:metrics:errors:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrby(metricsKey, data.path, 1);
    await redis.expire(metricsKey, 30 * 24 * 60 * 60);
  } catch (error) {
    console.error('Failed to log API error:', error);
  }
}