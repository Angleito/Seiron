import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// GET /api/ai/memory/load - Load AI memories for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    // Try to fetch from backend first
    try {
      const backendParams = new URLSearchParams({ userId });
      if (sessionId) backendParams.append('sessionId', sessionId);
      
      const response = await fetch(`${BACKEND_URL}/api/ai/memory?${backendParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'authorization': authHeader }),
          ...(userIdHeader && { 'x-user-id': userIdHeader }),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('Backend AI memory endpoint unavailable:', backendError);
    }
    
    // Fallback: Return empty memory structure for graceful degradation
    return NextResponse.json({
      success: true,
      memories: [],
      stats: {
        totalEntries: 0,
        categories: {
          preference: 0,
          context: 0,
          fact: 0,
          interaction: 0
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI memory load API error:', error);
    
    // Return empty memory structure for graceful degradation
    return NextResponse.json({
      success: true,
      memories: [],
      stats: {
        totalEntries: 0,
        categories: {
          preference: 0,
          context: 0,
          fact: 0,
          interaction: 0
        },
        lastUpdated: new Date().toISOString()
      }
    });
  }
}
