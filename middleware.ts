import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

// Initialize Redis and rate limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter: 60 requests per minute per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

// Define protected routes
const protectedRoutes = ['/dashboard', '/portfolio', '/settings', '/api/portfolio'];
const authRoutes = ['/login', '/signup'];
const publicApiRoutes = ['/api/health', '/api/auth/session'];

// CSRF token name
const CSRF_TOKEN_NAME = 'csrf-token';

// Security headers
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  
  // Initialize response
  let response = NextResponse.next();
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(
        `api_${ip}`
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
      
      if (!success) {
        // Log rate limit violation
        await logSecurityEvent({
          type: 'rate_limit_exceeded',
          ip,
          path: pathname,
          timestamp: new Date().toISOString(),
        });
        
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': Math.floor((reset - Date.now()) / 1000).toString(),
            ...response.headers,
          },
        });
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis is unavailable
    }
  }
  
  // Get auth token from cookies
  const authToken = request.cookies.get('__session');
  const isAuthenticated = !!authToken;
  
  // CSRF Protection for state-changing requests
  if (pathname.startsWith('/api/') && !publicApiRoutes.includes(pathname)) {
    const method = request.method;
    
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfTokenFromHeader = request.headers.get('x-csrf-token');
      const csrfTokenFromCookie = request.cookies.get(CSRF_TOKEN_NAME)?.value;
      
      // Generate CSRF token if not exists
      if (!csrfTokenFromCookie) {
        const newCsrfToken = nanoid();
        response.cookies.set(CSRF_TOKEN_NAME, newCsrfToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
      
      // Validate CSRF token
      if (csrfTokenFromHeader !== csrfTokenFromCookie && csrfTokenFromCookie) {
        await logSecurityEvent({
          type: 'csrf_validation_failed',
          ip,
          path: pathname,
          method,
          timestamp: new Date().toISOString(),
        });
        
        return new NextResponse('Invalid CSRF Token', { 
          status: 403,
          headers: response.headers,
        });
      }
    }
  }
  
  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    await logSecurityEvent({
      type: 'unauthorized_access_attempt',
      ip,
      path: pathname,
      timestamp: new Date().toISOString(),
    });
    
    // Redirect to login if trying to access protected route without auth
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  if (isAuthRoute && isAuthenticated) {
    // Redirect to dashboard if trying to access auth routes while logged in
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Log all API requests for monitoring
  if (pathname.startsWith('/api/')) {
    await logApiRequest({
      ip,
      path: pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      timestamp: new Date().toISOString(),
      authenticated: isAuthenticated,
    });
  }
  
  // Add CORS headers for API routes (only for allowed origins in production)
  if (pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [origin];
    const requestOrigin = request.headers.get('origin');
    
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }
  
  return response;
}

// Security event logging
async function logSecurityEvent(event: {
  type: string;
  ip: string;
  path: string;
  method?: string;
  timestamp: string;
}) {
  try {
    // Store security events in Redis with TTL of 30 days
    const key = `security:${event.type}:${event.timestamp}`;
    await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(event));
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Security Event]', event);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// API request logging
async function logApiRequest(request: {
  ip: string;
  path: string;
  method: string;
  userAgent: string;
  timestamp: string;
  authenticated: boolean;
}) {
  try {
    // Store API logs in Redis with TTL of 7 days
    const key = `api:request:${request.timestamp}`;
    await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(request));
    
    // Track API usage metrics
    const metricsKey = `api:metrics:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrby(metricsKey, request.path, 1);
    await redis.expire(metricsKey, 30 * 24 * 60 * 60); // 30 days TTL
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - Specific file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};