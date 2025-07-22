// JWT and Session Management
export * from './jwt';
export * from './session';

// Rate Limiting
export * from './rateLimiting';

// Input Sanitization
export * from './sanitization';

// Re-export commonly used types and functions
export type { SessionPayload } from './jwt';
export type { SessionData } from './session';
export type { RateLimitType } from './rateLimiting';

// Helper function to get user info from request
import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('__session')?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifyToken(token);
}