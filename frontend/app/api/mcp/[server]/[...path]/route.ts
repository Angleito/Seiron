import { NextRequest, NextResponse } from 'next/server';

// MCP Server configurations
const MCP_SERVERS = {
  hive: {
    url: process.env.MCP_HIVE_URL || 'http://localhost:8765',
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY,
    name: 'Hive Intelligence'
  },
  sei: {
    url: process.env.MCP_SEI_URL || 'http://localhost:8766',
    apiKey: process.env.SEI_API_KEY,
    name: 'SEI Blockchain'
  },
  portfolio: {
    url: process.env.MCP_PORTFOLIO_URL || 'http://localhost:8767',
    apiKey: process.env.PORTFOLIO_API_KEY,
    name: 'Portfolio Manager'
  }
} as const;

type MCPServer = keyof typeof MCP_SERVERS;

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(clientId);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { server: string; path: string[] } }
) {
  try {
    const server = params.server as MCPServer;
    const path = params.path?.join('/') || '';
    
    // Validate server
    if (!MCP_SERVERS[server]) {
      return NextResponse.json(
        { error: 'Invalid MCP server' },
        { status: 400 }
      );
    }
    
    // Get client identifier for rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';
    
    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    const serverConfig = MCP_SERVERS[server];
    
    // Get request body
    const body = await request.json();
    
    // Build target URL
    const targetUrl = `${serverConfig.url}${path ? `/${path}` : ''}`;
    
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if configured
    if (serverConfig.apiKey) {
      headers['Authorization'] = `Bearer ${serverConfig.apiKey}`;
    }
    
    // Forward the request to the MCP server
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    // Get response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'X-MCP-Server': serverConfig.name,
        'X-RateLimit-Remaining': String(RATE_LIMIT - (rateLimitMap.get(clientId)?.count || 0)),
      }
    });
    
  } catch (error) {
    console.error('MCP Proxy Error:', error);
    
    return NextResponse.json(
      { 
        error: 'MCP proxy error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for tool discovery
export async function GET(
  request: NextRequest,
  { params }: { params: { server: string; path: string[] } }
) {
  try {
    const server = params.server as MCPServer;
    const path = params.path?.join('/') || '';
    
    // Validate server
    if (!MCP_SERVERS[server]) {
      return NextResponse.json(
        { error: 'Invalid MCP server' },
        { status: 400 }
      );
    }
    
    const serverConfig = MCP_SERVERS[server];
    
    // Only allow specific GET endpoints
    if (path !== 'tools' && path !== 'health') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }
    
    // Build target URL
    const targetUrl = `${serverConfig.url}/${path}`;
    
    // Prepare headers
    const headers: HeadersInit = {};
    if (serverConfig.apiKey) {
      headers['Authorization'] = `Bearer ${serverConfig.apiKey}`;
    }
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'X-MCP-Server': serverConfig.name,
      }
    });
    
  } catch (error) {
    console.error('MCP Proxy GET Error:', error);
    
    return NextResponse.json(
      { 
        error: 'MCP proxy error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}