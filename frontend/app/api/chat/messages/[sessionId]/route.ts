import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// GET /api/chat/messages/[sessionId] - Get messages for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    const response = await fetch(`${BACKEND_URL}/api/chat/messages/${sessionId}${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'authorization': authHeader }),
        ...(userIdHeader && { 'x-user-id': userIdHeader }),
      },
    });
    
    if (!response.ok) {
      console.error('Backend messages request failed:', response.status, response.statusText);
      
      // Return empty messages array with session info for graceful degradation
      if (response.status === 404 || response.status === 403) {
        return NextResponse.json({
          success: true,
          session: {
            id: sessionId,
            title: 'Chat Session',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString()
          },
          messages: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Messages API error:', error);
    
    // Return empty messages array for graceful degradation
    return NextResponse.json({
      success: true,
      session: {
        id: params.sessionId,
        title: 'Chat Session',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      },
      messages: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    });
  }
}
