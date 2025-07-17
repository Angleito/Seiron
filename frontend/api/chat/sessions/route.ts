import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { fetchWithRetry } from '@/utils/apiRetry';
import { mockDataStore, createMockResponse, createErrorResponse } from '@/lib/mockData';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

// GET /api/chat/sessions - Get all chat sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    const response = await fetchWithRetry(
      `${BACKEND_URL}/api/chat/sessions${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'authorization': authHeader }),
          ...(userIdHeader && { 'x-user-id': userIdHeader }),
        },
      },
      {
        maxRetries: 2,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          console.warn(`Retrying chat sessions request (attempt ${attempt}):`, error.message);
        }
      }
    );
    
    if (!response.ok) {
      console.error('Backend sessions request failed:', response.status, response.statusText);
      
      // Return graceful fallback for anonymous users when backend is unavailable
      if (response.status === 404 || response.status === 503 || response.status === 502) {
        console.log(`[API] Backend unavailable (${response.status}), using mock data for sessions`);
        
        const userId = searchParams.get('userId') || userIdHeader || 'anonymous';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const archived = searchParams.get('archived') === 'true';
        const search = searchParams.get('search') || undefined;
        const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
        
        const result = mockDataStore.getSessions(userId, {
          page,
          limit,
          archived,
          search,
          order
        });
        
        const stats = mockDataStore.getStats(userId);
        
        const response = createMockResponse({
          success: true,
          sessions: result.sessions,
          pagination: result.pagination,
          stats,
          filters: {
            search,
            archived
          }
        });
        
        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
            'Content-Type': 'application/json',
            'X-Data-Source': 'mock'
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chat/sessions - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    const response = await fetchWithRetry(
      `${BACKEND_URL}/api/chat/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'authorization': authHeader }),
          ...(userIdHeader && { 'x-user-id': userIdHeader }),
        },
        body: JSON.stringify(body),
      },
      {
        maxRetries: 2,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          console.warn(`Retrying create session request (attempt ${attempt}):`, error.message);
        }
      }
    );
    
    if (!response.ok) {
      console.error('Backend session creation failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
