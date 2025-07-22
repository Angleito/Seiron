import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicApiHandler } from '@/app/lib/security/middleware';

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  walletAddress: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional(),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(4000).optional().default(500),
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
        stream,
        temperature,
        maxTokens,
      } = body!;

      // Forward request to secure backend
      const backendUrl = stream 
        ? `${BACKEND_URL}/api/chat/message` 
        : `${BACKEND_URL}/api/chat/orchestrate-v2`;
      
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
          stream,
          temperature,
          maxTokens,
          requiresBlockchainData: true
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend request failed: ${backendResponse.status}`);
      }

      if (stream) {
        // Handle streaming response by forwarding the stream from backend
        const encoder = new TextEncoder();
        const reader = backendResponse.body?.getReader();
        
        if (!reader) {
          throw new Error('No response stream available');
        }

        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              console.error('Streaming error:', error);
              controller.error(error);
            }
          },
        });

        return new NextResponse(readableStream, {
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Non-streaming response
        const backendData = await backendResponse.json();
        
        if (!backendData.success) {
          throw new Error(backendData.error || 'Backend processing failed');
        }

        return NextResponse.json(
          { 
            message: backendData.data.message || backendData.data.response,
            timestamp: new Date().toISOString(),
            model: 'gpt-4o-mini',
            tokens: backendData.data.usage?.total_tokens || 0,
            sessionId,
            mcpData: backendData.data.metadata || {},
            toolsUsed: backendData.data.actions || [],
            metadata: backendData.data.metadata,
            actions: backendData.data.actions
          },
          { 
            headers: {
              ...corsHeaders,
              ...securityHeaders,
            }
          }
        );
      }
    } catch (error) {
      console.error('Chat API error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = error instanceof Error && error.message.includes('rate limit') ? 429 : 500;
      
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
    schema: chatRequestSchema,
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