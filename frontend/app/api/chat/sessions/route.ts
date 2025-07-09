import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// GET /api/chat/sessions - Get all chat sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    const response = await fetch(`${BACKEND_URL}/api/chat/sessions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'authorization': authHeader }),
        ...(userIdHeader && { 'x-user-id': userIdHeader }),
      },
    });
    
    if (!response.ok) {
      console.error('Backend sessions request failed:', response.status, response.statusText);
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
    
    const response = await fetch(`${BACKEND_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'authorization': authHeader }),
        ...(userIdHeader && { 'x-user-id': userIdHeader }),
      },
      body: JSON.stringify(body),
    });
    
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
