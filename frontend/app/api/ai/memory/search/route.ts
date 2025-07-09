import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// POST /api/ai/memory/search - Search AI memories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId || !body.query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      );
    }
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    // Try to search in backend first
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'authorization': authHeader }),
          ...(userIdHeader && { 'x-user-id': userIdHeader }),
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('Backend AI memory search endpoint unavailable:', backendError);
    }
    
    // Fallback: Return empty search results for graceful degradation
    return NextResponse.json({
      success: true,
      memories: [],
      query: body.query,
      total: 0,
      searchTime: 0,
      filters: body.filters || {}
    });
  } catch (error) {
    console.error('AI memory search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}
