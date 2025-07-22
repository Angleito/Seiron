import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different endpoints
const rateLimiters = {
  // API endpoints - 60 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),
  
  // Auth endpoints - 5 attempts per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),
  
  // AI/Chat endpoints - 30 requests per minute
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:chat',
  }),
  
  // Voice synthesis - 10 requests per minute
  voice: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:voice',
  }),
  
  // File uploads - 5 per hour
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

/**
 * Apply rate limiting to a request
 */
export async function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'api',
  identifier?: string
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = rateLimiters[type];
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const id = identifier || ip;
  
  try {
    const { success, limit, reset, remaining } = await limiter.limit(id);
    
    const headers = new Headers({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
      'X-RateLimit-Type': type,
    });
    
    if (!success) {
      const retryAfter = Math.floor((reset - Date.now()) / 1000);
      headers.set('Retry-After', retryAfter.toString());
      
      // Log rate limit violation
      await logRateLimitViolation({
        type,
        identifier: id,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          }),
          {
            status: 429,
            headers,
          }
        ),
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request if rate limiting fails
    return { success: true };
  }
}

/**
 * Create a rate-limited API route handler
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = 'api'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const { success, response } = await rateLimit(req, type);
    
    if (!success && response) {
      return response;
    }
    
    return handler(req);
  };
}

/**
 * Apply user-specific rate limiting
 */
export async function rateLimitByUser(
  userId: string,
  type: RateLimitType = 'api'
): Promise<{ success: boolean; limit: number; reset: number; remaining: number }> {
  const limiter = rateLimiters[type];
  return await limiter.limit(`user:${userId}`);
}

/**
 * Apply rate limiting with custom limits
 */
export async function customRateLimit(
  identifier: string,
  limit: number,
  window: string
): Promise<{ success: boolean; limit: number; reset: number; remaining: number }> {
  const customLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as any),
    analytics: true,
    prefix: 'ratelimit:custom',
  });
  
  return await customLimiter.limit(identifier);
}

/**
 * Get rate limit status without consuming
 */
export async function getRateLimitStatus(
  identifier: string,
  type: RateLimitType = 'api'
): Promise<{ limit: number; remaining: number; reset: number }> {
  const key = `ratelimit:${type}:${identifier}`;
  const data = await redis.get(key);
  
  if (!data) {
    const limiter = rateLimiters[type];
    return {
      limit: 60, // Default based on type
      remaining: 60,
      reset: Date.now() + 60000,
    };
  }
  
  // Parse the rate limit data from Redis
  return data as any;
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(
  identifier: string,
  type: RateLimitType = 'api'
): Promise<void> {
  const key = `ratelimit:${type}:${identifier}`;
  await redis.del(key);
}

/**
 * Log rate limit violations for monitoring
 */
async function logRateLimitViolation(violation: {
  type: RateLimitType;
  identifier: string;
  path: string;
  timestamp: string;
}): Promise<void> {
  try {
    const key = `security:ratelimit:violation:${violation.timestamp}`;
    await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(violation));
    
    // Increment violation counter
    const counterKey = `security:ratelimit:violations:${violation.type}:daily`;
    await redis.hincrby(counterKey, violation.identifier, 1);
    await redis.expire(counterKey, 24 * 60 * 60);
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * Get rate limit analytics
 */
export async function getRateLimitAnalytics(type: RateLimitType): Promise<{
  violations: Record<string, number>;
  totalViolations: number;
}> {
  try {
    const counterKey = `security:ratelimit:violations:${type}:daily`;
    const violations = await redis.hgetall(counterKey);
    
    const totalViolations = Object.values(violations || {}).reduce(
      (sum, count) => sum + Number(count),
      0
    );
    
    return {
      violations: violations || {},
      totalViolations,
    };
  } catch (error) {
    console.error('Failed to get rate limit analytics:', error);
    return { violations: {}, totalViolations: 0 };
  }
}