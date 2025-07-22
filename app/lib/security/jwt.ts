import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-change-in-production'
);

const SESSION_COOKIE_NAME = '__session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  userId: string;
  email: string;
  walletAddress?: string;
  expiresAt: number;
}

/**
 * Create a JWT token with the given payload
 */
export async function createToken(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION;
  
  return await new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    
    return payload as SessionPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Set session cookie with HttpOnly and Secure flags
 */
export async function setSessionCookie(payload: Omit<SessionPayload, 'expiresAt'>): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get session from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyToken(token);
  
  // Check if session is expired
  if (payload && payload.expiresAt < Date.now()) {
    await clearSession();
    return null;
  }
  
  return payload;
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Refresh session expiration
 */
export async function refreshSession(): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    return false;
  }
  
  // Create new session with updated expiration
  await setSessionCookie({
    userId: session.userId,
    email: session.email,
    walletAddress: session.walletAddress,
  });
  
  return true;
}

/**
 * Middleware helper to verify authentication
 */
export async function withAuth(
  handler: (req: NextRequest, session: SessionPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await verifyToken(token);
    
    if (!session || session.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    
    return handler(req, session);
  };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const tokenFromHeader = request.headers.get('x-csrf-token');
  const tokenFromCookie = request.cookies.get('csrf-token')?.value;
  
  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }
  
  return tokenFromHeader === tokenFromCookie;
}