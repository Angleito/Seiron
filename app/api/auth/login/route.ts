import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  setSessionCookie,
  withRateLimit,
  sanitizeJson,
  sanitizeEmail,
  storeSession
} from '@/app/lib/security';
import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Input validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  privyToken: z.string().optional(),
  walletAddress: z.string().optional(),
});

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Sanitize and validate input
    const validation = sanitizeJson(body, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    const { email, password, privyToken, walletAddress } = validation.data;
    const sanitizedEmail = sanitizeEmail(email);
    
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    let userId: string;
    let privyUserId: string | undefined;
    
    // If Privy token is provided, verify it
    if (privyToken) {
      try {
        const verifiedClaims = await privy.verifyAuthToken(privyToken);
        userId = verifiedClaims.userId;
        privyUserId = userId;
        
        // Optional: Get user details from Privy
        const user = await privy.getUserById(userId);
        
        // Store user info if needed
        console.log('Privy user authenticated:', user.id);
      } catch (error) {
        console.error('Privy verification failed:', error);
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    } else {
      // Fallback to traditional authentication
      // In production, verify password against hashed password in database
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }
      
      // TODO: Replace with actual database lookup and password verification
      // For now, generate a user ID based on email
      userId = Buffer.from(sanitizedEmail).toString('base64');
    }
    
    // Create session
    await setSessionCookie({
      userId,
      email: sanitizedEmail,
      walletAddress,
    });
    
    // Store session data in Redis
    await storeSession(userId, {
      email: sanitizedEmail,
      walletAddress,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      privyUserId,
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: sanitizedEmail,
        walletAddress,
      },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}, 'auth');

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}