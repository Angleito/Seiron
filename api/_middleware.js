// Vercel Edge Runtime middleware for enhanced security
import { NextResponse } from 'next/server';

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https: http:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https: wss: blob:;
    media-src 'self' blob: data:;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s+/g, ' ').trim()
};

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map();

// Advanced rate limiting configuration
const RATE_LIMITS = {
  '/api/chat': { requests: 20, window: 60000 }, // 20 requests per minute
  '/api/orchestrate': { requests: 15, window: 60000 }, // 15 requests per minute
  default: { requests: 100, window: 60000 } // 100 requests per minute for other endpoints
};

// IP-based rate limiting
function checkRateLimit(ip, endpoint) {
  const now = Date.now();
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const windowStart = now - config.window;
  
  // Clean old entries
  for (const [key, data] of rateLimitStore.entries()) {
    const filtered = data.requests.filter(timestamp => timestamp > windowStart);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, { ...data, requests: filtered });
    }
  }
  
  // Check current rate for this IP and endpoint
  const key = `${ip}:${endpoint}`;
  const current = rateLimitStore.get(key) || { requests: [], blocked: false };
  const recentRequests = current.requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= config.requests) {
    // Block and mark as blocked
    rateLimitStore.set(key, { ...current, blocked: true, blockedUntil: now + config.window });
    return false;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(key, { requests: recentRequests, blocked: false });
  return true;
}

// Bot detection (basic patterns)
function detectBot(userAgent, ip) {
  if (!userAgent) return true;
  
  // Common bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /automated/i, /test/i, /monitor/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

// Request validation
function validateRequest(request) {
  const { method, headers } = request;
  
  // Check required headers for API calls
  if (method === 'POST') {
    const contentType = headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: false, error: 'Invalid content type' };
    }
  }
  
  // Check for suspicious patterns
  const userAgent = headers.get('user-agent') || '';
  const referer = headers.get('referer') || '';
  
  // Block requests with no user agent (likely bots)
  if (!userAgent.trim()) {
    return { valid: false, error: 'Missing user agent' };
  }
  
  // Additional validation can be added here
  return { valid: true };
}

export default function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Log request for monitoring
  console.log(`[Middleware] ${request.method} ${pathname}`, {
    ip: ip.split(',')[0], // Take first IP if multiple
    userAgent: userAgent.substring(0, 100), // Truncate for logging
    timestamp: new Date().toISOString()
  });
  
  // Skip middleware for certain paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Bot detection
  if (detectBot(userAgent, ip)) {
    console.log(`[Middleware] Bot detected: ${ip}`, { userAgent });
    return new Response('Access denied', { status: 403 });
  }
  
  // Request validation
  const validation = validateRequest(request);
  if (!validation.valid) {
    console.log(`[Middleware] Invalid request: ${validation.error}`, { ip, pathname });
    return new Response(JSON.stringify({ 
      error: 'Invalid request', 
      message: validation.error 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Rate limiting for API endpoints
  if (pathname.startsWith('/api/')) {
    const allowed = checkRateLimit(ip.split(',')[0], pathname);
    if (!allowed) {
      console.log(`[Middleware] Rate limit exceeded: ${ip}`, { pathname });
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait before trying again.',
        retryAfter: 60
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }
  }
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add rate limit headers for API endpoints
  if (pathname.startsWith('/api/')) {
    const config = RATE_LIMITS[pathname] || RATE_LIMITS.default;
    response.headers.set('X-RateLimit-Limit', config.requests.toString());
    response.headers.set('X-RateLimit-Window', (config.window / 1000).toString());
  }
  
  // Add request ID for tracing
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  response.headers.set('X-Request-ID', requestId);
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}