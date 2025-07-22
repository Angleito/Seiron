import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, walletAddress } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if we have backend URL configured
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (backendUrl) {
      // Try to proxy to Railway backend first
      try {
        const backendResponse = await fetch(`${backendUrl}/api/chat/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          return NextResponse.json(data, { headers: corsHeaders });
        }
      } catch (error) {
        console.warn('Backend unavailable, falling back to local processing');
      }
    }

    // Fallback to orchestrate endpoint
    const orchestrateResponse = await fetch(new URL('/api/chat/orchestrate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await orchestrateResponse.json();
    return NextResponse.json(data, { 
      status: orchestrateResponse.status,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}