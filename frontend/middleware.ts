import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Force no-cache headers for error pages and special routes
  if (
    request.nextUrl.pathname.includes('/_error') ||
    request.nextUrl.pathname.includes('/404') ||
    request.nextUrl.pathname.includes('/500') ||
    request.nextUrl.pathname.includes('/_not-found') ||
    request.nextUrl.pathname === '/not-found' ||
    request.nextUrl.pathname === '/error' ||
    request.nextUrl.pathname === '/global-error'
  ) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};