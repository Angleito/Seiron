import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Consolidated API endpoint to stay under Vercel's 12 function limit
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    const body = await request.json();

    switch (endpoint) {
      case 'ai-conversation':
        return handleAIConversation(body);
      case 'ai-memory':
        return handleAIMemory(body);
      case 'chat':
        return handleChat(body);
      case 'voice':
        return handleVoice(body);
      default:
        return NextResponse.json(
          { error: 'Unknown endpoint' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Consolidated API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');

  switch (endpoint) {
    case 'health':
      return NextResponse.json({ status: 'healthy', timestamp: Date.now() });
    case 'chat-sessions':
      return handleChatSessions(request);
    default:
      return NextResponse.json(
        { error: 'Unknown endpoint' },
        { status: 404 }
      );
  }
}

// AI Conversation Handler
async function handleAIConversation(body: any) {
  const { action, userId, sessionId, ...params } = body;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  // Basic conversation handling - simplified for deployment
  return NextResponse.json({
    success: true,
    action,
    userId,
    sessionId,
    timestamp: Date.now()
  });
}

// AI Memory Handler
async function handleAIMemory(body: any) {
  const { action, userId, ...params } = body;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  // Basic memory handling - simplified for deployment
  return NextResponse.json({
    success: true,
    action,
    userId,
    timestamp: Date.now()
  });
}

// Chat Handler
async function handleChat(body: any) {
  const { action, message, sessionId, ...params } = body;
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  // Basic chat handling - simplified for deployment
  return NextResponse.json({
    success: true,
    action,
    sessionId,
    message: message ? `Echo: ${message}` : undefined,
    timestamp: Date.now()
  });
}

// Voice Handler
async function handleVoice(body: any) {
  const { text, voiceId, ...params } = body;
  
  if (!text) {
    return NextResponse.json(
      { error: 'text is required' },
      { status: 400 }
    );
  }

  // Basic voice handling - simplified for deployment
  return NextResponse.json({
    success: true,
    text,
    voiceId: voiceId || 'default',
    audioUrl: '/mock-audio.mp3', // Mock response for deployment
    timestamp: Date.now()
  });
}

// Chat Sessions Handler
async function handleChatSessions(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  // Basic sessions response - simplified for deployment
  return NextResponse.json({
    sessions: [
      {
        id: 'session-1',
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: 'Welcome Chat'
      }
    ],
    total: 1
  });
}