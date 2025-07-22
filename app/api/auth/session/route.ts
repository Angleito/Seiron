import { NextRequest, NextResponse } from 'next/server';
import { 
  getSession,
  validateSession,
  refreshSession,
  getSessionData
} from '@/app/lib/security';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    // Validate session with additional checks
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const validation = await validateSession(
      session.userId,
      ipAddress,
      userAgent
    );
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          authenticated: false,
          reason: validation.reason 
        },
        { status: 401 }
      );
    }
    
    // Get full session data
    const sessionData = await getSessionData(session.userId);
    
    // Refresh session to extend expiration
    await refreshSession();
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        walletAddress: session.walletAddress,
      },
      session: {
        expiresAt: session.expiresAt,
        lastActivity: sessionData?.lastActivity,
      },
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}