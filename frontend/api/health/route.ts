import { NextRequest, NextResponse } from 'next/server';

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    
    if (includeDetails) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
      
      return NextResponse.json({
        ...health,
        details: {
          backend: {
            configured: !!backendUrl,
            url: backendUrl || 'not configured',
          },
          api: {
            routes: [
              '/api/health',
              '/api/chat/sessions',
              '/api/chat/messages/{sessionId}',
              '/api/ai/memory/load',
            ]
          },
          features: {
            mockData: true,
            backendFallback: true,
            caching: true,
          }
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
          'Content-Type': 'application/json'
        }
      });
    }
    
    return NextResponse.json(health, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
  }
}