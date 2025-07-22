import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicApiHandler } from '@/app/lib/security/middleware';

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Request validation schema
const orchestrateRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  walletAddress: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional(),
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export const POST = createPublicApiHandler(
  async (req, { body }) => {
    try {
      const {
        message,
        sessionId = `session_${Date.now()}`,
        walletAddress,
        messages = [],
      } = body!;

      // Forward request to secure backend
      const backendUrl = `${BACKEND_URL}/api/chat/orchestrate-v2`;
      
      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward any authentication headers if needed
          ...(req.headers.get('authorization') && {
            'authorization': req.headers.get('authorization')!
          }),
        },
        body: JSON.stringify({
          message,
          sessionId,
          walletAddress,
          messages,
          requiresBlockchainData: true // Enable blockchain data fetching
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend request failed: ${backendResponse.status}`);
      }

      const backendData = await backendResponse.json();
      
      if (!backendData.success) {
        throw new Error(backendData.error || 'Backend processing failed');
      }

      // Transform backend response to match expected frontend format
      return NextResponse.json(
        {
          success: true,
          data: {
            response: backendData.data.message,
            sessionId,
            timestamp: new Date().toISOString(),
            model: 'gpt-4o-mini', // Backend uses this model
            usage: {}, // Usage data handled by backend
            mcpData: backendData.data.metadata || {},
            toolsUsed: backendData.data.actions || [],
            metadata: backendData.data.metadata,
            actions: backendData.data.actions,
            persistence: backendData.data.persistence
          }
        },
        { 
          headers: {
            ...corsHeaders,
            ...securityHeaders,
          }
        }
      );
    } catch (error) {
      console.error('Chat orchestration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      
      // Determine appropriate status code
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          statusCode = 429;
        } else if (error.message.includes('Backend request failed: 4')) {
          statusCode = parseInt(error.message.split('Backend request failed: ')[1]) || 500;
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          message: 'The dragon encountered mystical interference. Please try again.'
        },
        { 
          status: statusCode,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
          }
        }
      );
    }
  },
  {
    requireAuth: false,
    rateLimit: 'api',
    validateCSRF: false,
    schema: orchestrateRequestSchema,
  }
);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      ...securityHeaders,
    },
  });
}