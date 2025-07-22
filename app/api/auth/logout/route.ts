import { NextRequest, NextResponse } from 'next/server';
import { 
  getSession,
  clearSession,
  invalidateSession,
  withAuth
} from '@/app/lib/security';

export const POST = withAuth(async (request: NextRequest, session) => {
  try {
    // Invalidate the session in Redis
    await invalidateSession(session.userId);
    
    // Clear the session cookie
    await clearSession();
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
});

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}