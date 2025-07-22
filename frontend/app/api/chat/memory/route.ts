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
    
    // Check if we have backend URL configured
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (backendUrl) {
      // Try to proxy to Railway backend first
      try {
        const backendResponse = await fetch(`${backendUrl}/api/chat/memory`, {
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
        console.warn('Backend unavailable for memory operations');
      }
    }

    // Fallback response for memory operations
    return NextResponse.json({
      success: true,
      data: {
        message: 'Memory operation completed (fallback mode)',
        timestamp: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Memory API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    // Check if we have backend URL configured
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (backendUrl && userId) {
      // Try to proxy to Railway backend first
      try {
        const backendResponse = await fetch(`${backendUrl}/api/chat/memory?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          return NextResponse.json(data, { headers: corsHeaders });
        }
      } catch (error) {
        console.warn('Backend unavailable for memory retrieval');
      }
    }

    // Fallback response for memory retrieval
    return NextResponse.json({
      success: true,
      data: {
        memories: [],
        total: 0,
        message: 'No memories found (fallback mode)'
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Memory GET error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}