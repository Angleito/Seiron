import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { fetchWithRetry } from '@/utils/apiRetry';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

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
        const userId = searchParams.get('userId') || userIdHeader || 'anonymous';
        return NextResponse.json({
          success: true,
          sessions: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          stats: {
            total_sessions: 0,
            active_sessions: 0,
            archived_sessions: 0,
            total_messages: 0
          },
          filters: {
            search: searchParams.get('search') || undefined,
            archived: searchParams.get('archived') === 'true'
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
