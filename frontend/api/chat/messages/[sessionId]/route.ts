import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { fetchWithRetry } from '@/utils/apiRetry';
import { mockDataStore, createMockResponse, createErrorResponse } from '@/lib/mockData';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

// GET /api/chat/messages/[sessionId] - Get messages for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    
    // Validate session ID
    if (!sessionId || sessionId.length < 3) {
      return NextResponse.json(
        createErrorResponse('Invalid session ID', 400),
        { status: 400 }
      );
    }
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const cursor = searchParams.get('cursor') || undefined;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        createErrorResponse('Invalid pagination parameters', 400),
        { status: 400 }
      );
    }
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    const userId = userIdHeader || 'anonymous';
    
    // Try backend first with timeout
    let backendData = null;
    const backendAvailable = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    
    if (backendAvailable) {
      try {
        console.log(`[API] Attempting backend request for session ${sessionId}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
        
        const response = await fetchWithRetry(
          `${BACKEND_URL}/api/chat/sessions/messages/${sessionId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader && { 'authorization': authHeader }),
              ...(userIdHeader && { 'x-user-id': userIdHeader }),
            },
            signal: controller.signal,
          },
          {
            maxRetries: 1,
            initialDelay: 500,
            onRetry: (attempt, error) => {
              console.warn(`[API] Retrying backend messages request (attempt ${attempt}):`, error.message);
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          backendData = await response.json();
          console.log(`[API] Backend response received for session ${sessionId}`);
        } else {
          console.warn(`[API] Backend request failed with status ${response.status}`);
        }
      } catch (error) {
        console.warn(`[API] Backend request failed, falling back to mock data:`, error instanceof Error ? error.message : error);
      }
    }
    
    // Use backend data if available, otherwise use mock data
    if (backendData) {
      return NextResponse.json(backendData, {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'Content-Type': 'application/json',
        }
      });
    }
    
    // Fall back to mock data
    console.log(`[API] Using mock data for session ${sessionId}`);
    
    // Ensure session exists or create it
    const session = mockDataStore.getOrCreateSession(sessionId, userId);
    
    // Get messages with pagination
    const result = mockDataStore.getMessages(sessionId, {
      page,
      limit,
      order,
      cursor
    });
    
    const response = createMockResponse({
      success: true,
      session,
      messages: result.messages,
      pagination: result.pagination
    });
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'Content-Type': 'application/json',
        'X-Data-Source': 'mock'
      }
    });
    
  } catch (error) {
    console.error('[API] Messages API error:', error);
    
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}
